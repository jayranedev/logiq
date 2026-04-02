"""
GPS Simulator — moves 6 fake drivers along Mumbai road segments.
Run from backend/: python scripts/gps_simulator.py

Publishes location updates to Redis every 2 seconds.
Each driver loops a route of real Mumbai waypoints.
"""
import asyncio
import json
import sys

sys.path.insert(0, "/app")

import httpx
import redis.asyncio as aioredis

from app.config import settings
from app.services.realtime_service import DRIVER_LOCATIONS_CHANNEL

BACKEND_URL = "http://localhost:8000"

# Real Mumbai road waypoints for 6 driver routes
DRIVER_ROUTES = [
    {
        "driver_id": 1,
        "name": "Raju Sharma",
        "waypoints": [
            (19.0596, 72.8295),  # Bandra West
            (19.0500, 72.8330),
            (19.0450, 72.8400),
            (19.0390, 72.8450),
            (19.0330, 72.8460),
            (19.0270, 72.8470),
            (19.0178, 72.8478),  # Dadar
            (19.0270, 72.8470),
            (19.0330, 72.8460),
            (19.0390, 72.8450),
            (19.0450, 72.8400),
            (19.0500, 72.8330),
        ],
    },
    {
        "driver_id": 2,
        "name": "Amit Patil",
        "waypoints": [
            (19.1136, 72.8697),  # Andheri East
            (19.1080, 72.8750),
            (19.1020, 72.8800),
            (19.0960, 72.8820),
            (19.0900, 72.8826),
            (19.0728, 72.8826),  # Kurla
            (19.0800, 72.8820),
            (19.0900, 72.8820),
            (19.1020, 72.8800),
            (19.1080, 72.8750),
        ],
    },
    {
        "driver_id": 3,
        "name": "Suresh Kumar",
        "waypoints": [
            (19.0948, 72.8258),  # Juhu
            (19.1000, 72.8300),
            (19.1050, 72.8400),
            (19.1100, 72.8500),
            (19.1136, 72.8600),
            (19.1163, 72.8526),  # Goregaon
            (19.1100, 72.8500),
            (19.1050, 72.8400),
            (19.1000, 72.8300),
        ],
    },
    {
        "driver_id": 4,
        "name": "Vikram Singh",
        "waypoints": [
            (19.1176, 72.9060),  # Powai
            (19.1100, 72.9000),
            (19.1000, 72.8950),
            (19.0900, 72.8900),
            (19.0800, 72.8850),
            (19.0728, 72.8826),  # Kurla
            (19.0522, 72.9005),  # Chembur
            (19.0600, 72.8950),
            (19.0728, 72.8826),
            (19.0900, 72.8900),
            (19.1000, 72.8950),
            (19.1100, 72.9000),
        ],
    },
    {
        "driver_id": 5,
        "name": "Deepak Nair",
        "waypoints": [
            (19.1872, 72.8484),  # Malad
            (19.1800, 72.8500),
            (19.1700, 72.8520),
            (19.1600, 72.8530),
            (19.1500, 72.8540),
            (19.2288, 72.8580),  # Borivali
            (19.2100, 72.8560),
            (19.1900, 72.8490),
            (19.1800, 72.8500),
        ],
    },
    {
        "driver_id": 6,
        "name": "Rahul Gupta",
        "waypoints": [
            (18.9322, 72.8351),  # Fort
            (18.9200, 72.8250),
            (18.9100, 72.8200),
            (18.9067, 72.8147),  # Colaba
            (18.9100, 72.8200),
            (18.9200, 72.8250),
            (18.9322, 72.8351),
            (18.9400, 72.8400),
            (18.9500, 72.8420),
            (19.0130, 72.8153),  # Worli
            (18.9800, 72.8300),
            (18.9600, 72.8350),
            (18.9400, 72.8400),
        ],
    },
]


def interpolate(p1, p2, steps=10):
    """Linearly interpolate steps between two GPS points."""
    lat1, lng1 = p1
    lat2, lng2 = p2
    return [
        (lat1 + (lat2 - lat1) * i / steps, lng1 + (lng2 - lng1) * i / steps)
        for i in range(steps)
    ]


def expand_route(waypoints, steps=10):
    """Expand waypoints into smooth interpolated path."""
    path = []
    for i in range(len(waypoints) - 1):
        path.extend(interpolate(waypoints[i], waypoints[i + 1], steps))
    path.append(waypoints[-1])
    return path


async def simulate_driver(redis: aioredis.Redis, route: dict, offset: int):
    """Continuously move a single driver along their route."""
    path = expand_route(route["waypoints"])
    idx = offset % len(path)

    while True:
        lat, lng = path[idx]
        payload = json.dumps(
            {
                "driver_id": route["driver_id"],
                "name": route["name"],
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "status": "busy",
            }
        )
        await redis.publish(DRIVER_LOCATIONS_CHANNEL, payload)
        idx = (idx + 1) % len(path)
        await asyncio.sleep(2)


async def set_drivers_busy():
    """Set all simulated drivers to 'busy' via REST API before simulation starts."""
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=5.0) as client:
        for route in DRIVER_ROUTES:
            try:
                await client.patch(
                    f"/api/drivers/{route['driver_id']}",
                    json={"status": "busy"},
                )
                print(f"  Driver {route['driver_id']} ({route['name']}) → busy")
            except Exception as e:
                print(f"  Warning: could not set driver {route['driver_id']} status: {e}")


async def main():
    print("GPS Simulator starting...")
    print("Setting drivers to busy...")
    await set_drivers_busy()

    print("Publishing location updates to Redis every 2s...")
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    tasks = [
        simulate_driver(r, route, i * 15)
        for i, route in enumerate(DRIVER_ROUTES)
    ]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
