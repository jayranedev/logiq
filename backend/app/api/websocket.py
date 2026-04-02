"""WebSocket endpoint + Redis subscriber background task."""
import asyncio
import json

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.driver import Driver, DriverStatus
from app.services.realtime_service import (
    DRIVER_LOCATIONS_CHANNEL,
    EVENTS_CHANNEL,
    manager,
)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/tracking")
async def tracking_ws(websocket: WebSocket):
    await websocket.accept()
    manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; data flows via the Redis subscriber task
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


async def _update_driver_in_db(driver_id: int, lat: float, lng: float, status: str):
    """Persist latest driver position and status to PostgreSQL."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Driver).where(Driver.id == driver_id))
        driver = result.scalar_one_or_none()
        if driver:
            driver.current_lat = lat
            driver.current_lng = lng
            try:
                driver.status = DriverStatus(status)
            except ValueError:
                pass
            await session.commit()


async def redis_subscriber():
    """Background task: subscribe to Redis channels and broadcast to WS clients."""
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(DRIVER_LOCATIONS_CHANNEL, EVENTS_CHANNEL)

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        channel = message["channel"]
        data = message["data"]

        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            continue

        if channel == DRIVER_LOCATIONS_CHANNEL:
            parsed["type"] = "location"
            # Persist position + status to DB (fire-and-forget)
            asyncio.create_task(
                _update_driver_in_db(
                    parsed["driver_id"],
                    parsed["lat"],
                    parsed["lng"],
                    parsed.get("status", "busy"),
                )
            )
        elif channel == EVENTS_CHANNEL:
            pass  # already has "type"

        await manager.broadcast(json.dumps(parsed))
