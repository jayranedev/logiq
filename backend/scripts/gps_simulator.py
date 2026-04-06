"""
GPS Simulator v2 — LOGIQ.AI
===============================
Simulates 6 virtual drivers following optimized Mumbai routes.

Features:
  - Realistic speed model: 20–55 km/h with Gaussian jitter
  - Rush hour traffic slowdowns (8–10am, 6–9pm)
  - Random micro-delay events (signal, congestion, parking)
  - EcoScore™-aware: each driver has vehicle_type for emission tracking
  - Publishes to Redis at 2s intervals (configurable)
  - Optionally fetches actual routes from backend DB after each loop

Run from backend/:
  python scripts/gps_simulator.py
"""
import asyncio
import json
import math
import random
import sys
import time

sys.path.insert(0, "/app")

import httpx
import redis.asyncio as aioredis

from app.config import settings
from app.services.realtime_service import DRIVER_LOCATIONS_CHANNEL, EVENTS_CHANNEL

BACKEND_URL = "http://localhost:8000"
PUBLISH_INTERVAL = 2  # seconds between GPS pings

# ─── Driver definitions ───────────────────────────────────────────────────────
DRIVER_CONFIGS = [
    {
        "driver_id": 1, "name": "Raju Sharma", "vehicle_type": "bike",
        "base_speed_kmh": 30, "capacity_kg": 15,
        "waypoints": [
            (19.0596, 72.8295), (19.0500, 72.8330), (19.0450, 72.8400),
            (19.0390, 72.8450), (19.0330, 72.8460), (19.0178, 72.8478),
            (19.0270, 72.8470), (19.0390, 72.8450), (19.0500, 72.8330),
        ],
    },
    {
        "driver_id": 2, "name": "Amit Patil", "vehicle_type": "bike",
        "base_speed_kmh": 28, "capacity_kg": 15,
        "waypoints": [
            (19.1136, 72.8697), (19.1050, 72.8760), (19.0960, 72.8820),
            (19.0728, 72.8826), (19.0800, 72.8820), (19.0960, 72.8800),
            (19.1080, 72.8750), (19.1136, 72.8697),
        ],
    },
    {
        "driver_id": 3, "name": "Suresh Kumar", "vehicle_type": "scooter",
        "base_speed_kmh": 35, "capacity_kg": 20,
        "waypoints": [
            (19.0948, 72.8258), (19.1000, 72.8300), (19.1100, 72.8500),
            (19.1663, 72.8526), (19.1872, 72.8484), (19.1663, 72.8526),
            (19.1100, 72.8500), (19.0948, 72.8258),
        ],
    },
    {
        "driver_id": 4, "name": "Vikram Singh", "vehicle_type": "van",
        "base_speed_kmh": 22, "capacity_kg": 100,
        "waypoints": [
            (19.1176, 72.9060), (19.1000, 72.8950), (19.0800, 72.8850),
            (19.0522, 72.9005), (19.0600, 72.8950), (19.0800, 72.8850),
            (19.1000, 72.8950), (19.1176, 72.9060),
        ],
    },
    {
        "driver_id": 5, "name": "Deepak Nair", "vehicle_type": "scooter",
        "base_speed_kmh": 33, "capacity_kg": 20,
        "waypoints": [
            (19.1872, 72.8484), (19.2050, 72.8556), (19.2288, 72.8580),
            (19.2100, 72.8560), (19.1872, 72.8484), (19.1700, 72.8520),
            (19.1500, 72.8540), (19.1700, 72.8520), (19.1872, 72.8484),
        ],
    },
    {
        "driver_id": 6, "name": "Rahul Gupta", "vehicle_type": "bike",
        "base_speed_kmh": 32, "capacity_kg": 15,
        "waypoints": [
            (18.9322, 72.8351), (18.9200, 72.8250), (18.9067, 72.8147),
            (18.9200, 72.8250), (18.9432, 72.8231), (19.0130, 72.8153),
            (18.9600, 72.8350), (18.9322, 72.8351),
        ],
    },
]

# ─── Speed model ──────────────────────────────────────────────────────────────

def _current_traffic_multiplier() -> float:
    """Return a speed multiplier based on time of day (Mumbai traffic patterns)."""
    from datetime import datetime
    hour = datetime.now().hour
    if 8 <= hour <= 10:   return 0.45  # Heavy morning rush
    if 17 <= hour <= 20:  return 0.40  # Heavy evening rush
    if 11 <= hour <= 16:  return 0.75  # Moderate daytime
    if 6 <= hour <= 7:    return 0.65  # Early morning
    return 1.0                          # Night — free flow


def _effective_speed(base_kmh: float, vehicle_type: str) -> float:
    """Calculate effective speed with traffic + jitter."""
    traffic_mult = _current_traffic_multiplier()

    # Vehicle-specific modifiers
    vehicle_mod = {"bike": 1.05, "scooter": 1.0, "van": 0.85}.get(vehicle_type, 1.0)

    # Gaussian jitter (±15% of base speed)
    jitter = random.gauss(1.0, 0.12)
    jitter = max(0.5, min(1.4, jitter))

    return base_kmh * traffic_mult * vehicle_mod * jitter


def interpolate_segment(p1, p2, n_steps: int) -> list[tuple[float, float]]:
    """Linear interpolation between two GPS points."""
    lat1, lng1 = p1
    lat2, lng2 = p2
    return [
        (lat1 + (lat2 - lat1) * i / n_steps,
         lng1 + (lng2 - lng1) * i / n_steps)
        for i in range(n_steps)
    ]


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def build_path(waypoints: list, target_steps_per_segment: int = 12) -> list[tuple[float, float]]:
    """Expand waypoints into a dense smooth path."""
    path = []
    for i in range(len(waypoints) - 1):
        path.extend(interpolate_segment(waypoints[i], waypoints[i + 1], target_steps_per_segment))
    path.append(waypoints[-1])
    return path


# ─── Live route fetch ─────────────────────────────────────────────────────────

async def fetch_active_route(driver_id: int) -> list[tuple[float, float]] | None:
    """
    Fetch the driver's current active route waypoints from the backend.
    Returns list of (lat, lng) tuples, or None if no active route.
    """
    try:
        async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=5.0) as client:
            resp = await client.get(f"/api/routes", params={"driver_id": driver_id})
            if resp.status_code == 200:
                routes = resp.json()
                # Find the most recent active/planned route for this driver
                active = [r for r in routes if r.get("driver_id") == driver_id
                          and r.get("status") in ("active", "planned")
                          and r.get("waypoints")]
                if active:
                    # Sort by id desc (latest route)
                    active.sort(key=lambda r: r["id"], reverse=True)
                    wps = active[0]["waypoints"]
                    return [(w["lat"], w["lng"]) for w in wps if "lat" in w and "lng" in w]
    except Exception:
        pass
    return None


# ─── Simulator core ───────────────────────────────────────────────────────────

async def simulate_driver(redis: aioredis.Redis, config: dict, start_offset: int):
    """Continuously move a single driver along their route with realistic physics."""
    # Try to load actual assigned route from DB; fallback to config waypoints
    db_waypoints = await fetch_active_route(config["driver_id"])
    if db_waypoints and len(db_waypoints) >= 2:
        path = build_path(db_waypoints)
    else:
        path = build_path(config["waypoints"])

    idx = start_offset % len(path)
    delay_event_counter = 0
    steps_since_delay = 0
    route_refresh_counter = 0  # check for new routes every ~60 steps

    while True:
        lat, lng = path[idx]

        # Every 60 steps, check if driver has a new optimized route
        route_refresh_counter += 1
        if route_refresh_counter >= 60:
            route_refresh_counter = 0
            new_wps = await fetch_active_route(config["driver_id"])
            if new_wps and len(new_wps) >= 2:
                new_path = build_path(new_wps)
                if new_path != path:
                    path = new_path
                    idx = 0  # restart from beginning of new route

        # Occasional micro-delays (signal, parking, customer interaction)
        if steps_since_delay > random.randint(15, 40) and random.random() < 0.08:
            delay_secs = random.randint(4, 12)
            steps_since_delay = 0
            delay_event_counter += 1

            # Emit a micro-delay event every 5th micro-delay
            if delay_event_counter % 5 == 0:
                await redis.publish(EVENTS_CHANNEL, json.dumps({
                    "type": "micro_delay",
                    "driver_id": config["driver_id"],
                    "name": config["name"],
                    "message": f"{config['name']} delayed ({random.choice(['traffic signal', 'congestion', 'parking'])})",
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                }))
            await asyncio.sleep(delay_secs)
        else:
            steps_since_delay += 1

        # Publish GPS position
        await redis.publish(DRIVER_LOCATIONS_CHANNEL, json.dumps({
            "driver_id": config["driver_id"],
            "name": config["name"],
            "lat": round(lat + random.gauss(0, 0.00003), 6),  # tiny GPS noise
            "lng": round(lng + random.gauss(0, 0.00003), 6),
            "status": "busy",
            "vehicle_type": config["vehicle_type"],
            "speed_kmh": round(_effective_speed(config["base_speed_kmh"], config["vehicle_type"]), 1),
        }))

        idx = (idx + 1) % len(path)

        # Dynamic sleep based on current speed (faster driver = shorter pause between points)
        effective_speed = _effective_speed(config["base_speed_kmh"], config["vehicle_type"])
        segment_dist_km = haversine_km(lat, lng, *path[(idx) % len(path)])
        if segment_dist_km > 0 and effective_speed > 0:
            travel_time_s = (segment_dist_km / effective_speed) * 3600
            sleep_time = min(max(travel_time_s, 0.5), PUBLISH_INTERVAL * 2)
        else:
            sleep_time = PUBLISH_INTERVAL

        await asyncio.sleep(sleep_time)


async def set_drivers_busy():
    """Set all simulated drivers to 'busy' status via REST."""
    try:
        async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=5.0) as client:
            for cfg in DRIVER_CONFIGS:
                try:
                    await client.patch(
                        f"/api/drivers/{cfg['driver_id']}",
                        json={"status": "busy"},
                    )
                except Exception:
                    pass
    except Exception as e:
        print(f"  Warning: could not connect to backend: {e}")


async def main():
    print("=" * 50)
    print(" LOGIQ.AI GPS Simulator v2")
    print("=" * 50)
    print(f"  {len(DRIVER_CONFIGS)} drivers | Speed jitter | Traffic model | Micro-delays")
    print()

    print("Setting drivers to busy...")
    await set_drivers_busy()
    print("Done.\n")

    print("Publishing GPS to Redis...")
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    # Stagger driver start positions so they aren't bunched
    tasks = [
        simulate_driver(r, cfg, i * (12 // len(DRIVER_CONFIGS)))
        for i, cfg in enumerate(DRIVER_CONFIGS)
    ]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
