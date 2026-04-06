"""
Delay Monitor — Background Task
=================================
Runs every 30 seconds. Checks all in-transit/assigned orders,
runs XGBoost inference on each, and emits delay_alert WebSocket events
when risk threshold is crossed.

Prevents alert spam by tracking which orders have already been alerted.
"""
import asyncio

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.order import Order, OrderStatus
from app.services.prediction_service import predict_single
from app.services.realtime_service import publish_event

from sqlalchemy import select

ALERT_THRESHOLD = 0.70       # Only alert on HIGH risk (≥70% delay probability)
MONITOR_INTERVAL = 30        # Seconds between checks
_alerted: set[int] = set()   # Order IDs already alerted this session


async def _check_active_orders():
    """Fetch active orders, run predictions, emit alerts for high-risk ones."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Order).where(
                Order.status.in_([OrderStatus.assigned, OrderStatus.in_transit])
            )
        )
        orders = result.scalars().all()

    if not orders:
        return

    new_alerts = 0
    for order in orders:
        # Skip already-alerted orders
        if order.id in _alerted:
            continue

        order_dict = {
            "id": order.id,
            "pickup_lat": order.pickup_lat,
            "pickup_lng": order.pickup_lng,
            "delivery_lat": order.delivery_lat,
            "delivery_lng": order.delivery_lng,
            "weight": order.weight or 1.0,
            "priority": order.priority.value if order.priority else "medium",
        }

        try:
            prediction = predict_single(order_dict)
        except Exception:
            continue

        if prediction["delay_probability"] >= ALERT_THRESHOLD:
            _alerted.add(order.id)
            new_alerts += 1

            # Get top factor
            factors = prediction.get("factors", [])
            top_factor = factors[0]["feature"].replace("_", " ") if factors else "traffic"

            await publish_event("delay_alert", {
                "order_id": order.id,
                "driver_id": order.driver_id,
                "customer_name": order.customer_name,
                "risk_level": prediction["risk_level"],
                "delay_probability": prediction["delay_probability"],
                "estimated_delay_minutes": prediction["estimated_delay_minutes"],
                "message": f"High delay risk: {top_factor} is the primary factor",
            })

    if new_alerts:
        print(f"[DelayMonitor] Emitted {new_alerts} delay alert(s)")


async def delay_monitor_worker():
    """Background loop: check active orders every 30 seconds."""
    print("[DelayMonitor] Background worker started")
    await asyncio.sleep(10)  # Initial delay to let app finish startup

    while True:
        try:
            await _check_active_orders()
        except Exception as e:
            print(f"[DelayMonitor] Error: {e}")

        await asyncio.sleep(MONITOR_INTERVAL)


def reset_alerts():
    """Clear the alerted set (call on demo reset)."""
    _alerted.clear()
