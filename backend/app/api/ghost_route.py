"""
GhostRoute™ API endpoints
GET  /api/ghostroute/status          → cache status (which zones are pre-computed, latency)
GET  /api/ghostroute/zones           → all cached zone solutions
POST /api/ghostroute/match           → match a set of orders to nearest cached route
"""
import time

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.services.ghost_route_service import (
    get_all_ghost_routes,
    get_ghost_route,
    match_orders_to_ghost_route,
)

router = APIRouter(prefix="/api/ghostroute", tags=["ghostroute"])


class OrderPoint(BaseModel):
    delivery_lat: float
    delivery_lng: float


class MatchRequest(BaseModel):
    orders: List[OrderPoint]


@router.get("/status")
async def ghost_route_status():
    """Returns which zones are pre-cached and their computation latency."""
    cached = await get_all_ghost_routes()
    status = []
    for zone, data in cached.items():
        age_s = round(time.time() - data.get("computed_at", 0), 0)
        status.append({
            "zone": zone,
            "latency_ms": data.get("latency_ms", "?"),
            "cached_age_seconds": age_s,
            "stops": len(data.get("waypoints", [])),
            "total_distance_km": data.get("total_distance_km", 0),
        })

    return {
        "zones_cached": len(cached),
        "zones": status,
        "feature": "GhostRoute™",
        "description": "Routes pre-computed before orders arrive. Finalization <100ms.",
    }


@router.get("/zones")
async def get_zones():
    """All cached GhostRoute™ zone solutions."""
    return await get_all_ghost_routes()


@router.post("/match")
async def match_to_ghost_route(req: MatchRequest):
    """
    Given incoming orders, returns the nearest pre-computed GhostRoute™.
    This is the <100ms finalization endpoint — cache lookup only, no computation.
    """
    start = time.time() * 1000

    order_dicts = [{"delivery_lat": o.delivery_lat, "delivery_lng": o.delivery_lng} for o in req.orders]
    matched_zone = match_orders_to_ghost_route(order_dicts)

    if not matched_zone:
        return {"matched": False, "message": "No orders provided"}

    cached = await get_ghost_route(matched_zone)
    elapsed = round(time.time() * 1000 - start, 1)

    if not cached:
        return {
            "matched": False,
            "zone": matched_zone,
            "message": "Zone not yet pre-computed — run standard optimization",
            "finalization_ms": elapsed,
        }

    return {
        "matched": True,
        "zone": matched_zone,
        "finalization_ms": elapsed,
        "cached_latency_ms": cached.get("latency_ms"),
        "total_distance_km": cached.get("total_distance_km"),
        "waypoints": cached.get("waypoints", []),
        "routes": cached.get("routes", []),
        "feature": "GhostRoute™ — pre-cached route retrieved",
    }
