"""
Mapbox Real-Time Data Service
==============================
Fetches live traffic, routing, and ETA data from Mapbox APIs to feed
into the XGBoost delay prediction model.

APIs used:
  - Mapbox Directions API: real road routing + traffic-aware ETA
  - Mapbox Traffic Tileset: congestion levels (via Matrix API)
  - Mapbox Optimization API: multi-stop routing

All calls are async + cached in Redis (TTL: 2 minutes for traffic, 5 min for routes).
"""
import asyncio
import json
import os
import time
from typing import Optional

import httpx
import redis.asyncio as aioredis

from app.config import settings

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")
DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic"
MATRIX_BASE     = "https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic"
OPTIMIZATION_BASE = "https://api.mapbox.com/optimized-trips/v1/mapbox/driving-traffic"

TRAFFIC_CACHE_TTL = 120   # 2 minutes
ROUTE_CACHE_TTL   = 300   # 5 minutes

_redis: Optional[aioredis.Redis] = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


# ─── Directions API ─────────────────────────────────────────────────────────

async def get_route_with_traffic(
    origin_lng: float, origin_lat: float,
    dest_lng: float, dest_lat: float,
) -> dict:
    """
    Get real road route + traffic-aware ETA from Mapbox Directions API.
    Returns: distance_km, duration_min, congestion_level, geometry
    """
    if not MAPBOX_TOKEN:
        return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    cache_key = f"mb:route:{round(origin_lat,3)}:{round(origin_lng,3)}:{round(dest_lat,3)}:{round(dest_lng,3)}"
    r = await _get_redis()
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)

    coords = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    url = f"{DIRECTIONS_BASE}/{coords}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "annotations": "congestion,duration",
        "overview": "simplified",
        "geometries": "geojson",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if not data.get("routes"):
            return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

        route = data["routes"][0]
        leg = route["legs"][0]

        # Parse congestion from annotations
        congestion_levels = leg.get("annotation", {}).get("congestion", [])
        congestion_score = _congestion_to_score(congestion_levels)

        result = {
            "distance_km": round(route["distance"] / 1000, 2),
            "duration_min": round(route["duration"] / 60, 1),
            "duration_typical_min": round(leg.get("duration_typical", route["duration"]) / 60, 1),
            "congestion_score": congestion_score,  # 0.0 (free) – 1.0 (heavy)
            "congestion_level": _score_to_label(congestion_score),
            "geometry": route.get("geometry"),
            "source": "mapbox_live",
        }

        await r.setex(cache_key, ROUTE_CACHE_TTL, json.dumps(result))
        return result

    except Exception as e:
        print(f"[Mapbox] Directions API error: {e}")
        return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)


async def get_traffic_factor(lat: float, lng: float) -> float:
    """
    Get a traffic factor (0.3=free flow → 2.0=heavy jam) for a location.
    Used as a feature in the XGBoost delay prediction model.
    """
    if not MAPBOX_TOKEN:
        return _time_based_traffic_factor()

    # Use a short route from the point to itself to get local congestion
    result = await get_route_with_traffic(lng, lat, lng + 0.002, lat + 0.002)
    score = result.get("congestion_score", 0.5)
    # Map 0-1 congestion score to 0.3-2.0 traffic factor
    return round(0.3 + score * 1.7, 2)


async def get_optimized_route_waypoints(
    origin_lng: float, origin_lat: float,
    destinations: list[tuple[float, float]],
) -> list[dict]:
    """
    Use Mapbox Optimization API for multi-stop routing with traffic.
    Returns ordered list of waypoints with ETAs.
    Falls back to OR-Tools order if API unavailable.
    """
    if not MAPBOX_TOKEN or len(destinations) < 2:
        return [{"lat": lat, "lng": lng} for lng, lat in [(origin_lng, origin_lat)] + list(destinations)]

    coords_str = f"{origin_lng},{origin_lat};" + ";".join(f"{lng},{lat}" for lat, lng in destinations)
    url = f"{OPTIMIZATION_BASE}/{coords_str}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "roundtrip": "false",
        "source": "first",
        "destination": "last",
        "overview": "simplified",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                trips = data.get("trips", [])
                if trips:
                    waypoints = data.get("waypoints", [])
                    ordered = sorted(waypoints, key=lambda w: w.get("waypoint_index", 0))
                    return [{"lat": w["location"][1], "lng": w["location"][0], "eta_min": round(w.get("trips_index", 0) * 5, 1)} for w in ordered]
    except Exception as e:
        print(f"[Mapbox] Optimization API error: {e}")

    return [{"lat": lat, "lng": lng} for lat, lng in [(origin_lat, origin_lng)] + list(destinations)]


# ─── Helper functions ────────────────────────────────────────────────────────

def _congestion_to_score(levels: list[str]) -> float:
    """Convert Mapbox congestion labels to a 0–1 score."""
    mapping = {"unknown": 0.3, "low": 0.2, "moderate": 0.5, "heavy": 0.8, "severe": 1.0}
    if not levels:
        return 0.4
    scores = [mapping.get(l, 0.3) for l in levels]
    return round(sum(scores) / len(scores), 2)


def _score_to_label(score: float) -> str:
    if score < 0.3: return "free"
    if score < 0.5: return "low"
    if score < 0.7: return "moderate"
    if score < 0.9: return "heavy"
    return "severe"


def _time_based_traffic_factor() -> float:
    """Fallback: estimate traffic factor based on time of day."""
    from datetime import datetime
    hour = datetime.now().hour
    # Mumbai rush hours: 8-11am and 6-9pm
    if 8 <= hour <= 10:   return 1.8
    if 17 <= hour <= 20:  return 1.9
    if 11 <= hour <= 16:  return 1.1
    if 6 <= hour <= 7:    return 1.3
    return 0.6


def _fallback_route(lat1, lng1, lat2, lng2) -> dict:
    """Haversine-based fallback when Mapbox API is unavailable."""
    import math
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng/2)**2
    dist = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    tf = _time_based_traffic_factor()
    return {
        "distance_km": round(dist, 2),
        "duration_min": round(dist / 25 * 60 * tf, 1),  # 25 km/h avg * traffic
        "duration_typical_min": round(dist / 25 * 60, 1),
        "congestion_score": (tf - 0.3) / 1.7,
        "congestion_level": _score_to_label((tf - 0.3) / 1.7),
        "geometry": None,
        "source": "fallback_haversine",
    }
