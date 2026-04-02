"""Redis pub/sub hub for broadcasting driver location updates."""
import json
from typing import Set

import redis.asyncio as aioredis

from app.config import settings

DRIVER_LOCATIONS_CHANNEL = "driver_locations"
EVENTS_CHANNEL = "logiq_events"

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def publish_location(driver_id: int, lat: float, lng: float, extra: dict = None):
    r = await get_redis()
    payload = {"driver_id": driver_id, "lat": lat, "lng": lng, **(extra or {})}
    await r.publish(DRIVER_LOCATIONS_CHANNEL, json.dumps(payload))


async def publish_event(event_type: str, data: dict):
    r = await get_redis()
    payload = {"type": event_type, **data}
    await r.publish(EVENTS_CHANNEL, json.dumps(payload))


class ConnectionManager:
    """Tracks active WebSocket connections and fans out messages."""

    def __init__(self):
        self.active: Set = set()

    def connect(self, ws):
        self.active.add(ws)

    def disconnect(self, ws):
        self.active.discard(ws)

    async def broadcast(self, message: str):
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self.active -= dead


manager = ConnectionManager()
