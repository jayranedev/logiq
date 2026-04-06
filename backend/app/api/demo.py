"""
Demo endpoint — one-click "wow moment" for the hackathon presentation.

POST /api/demo/trigger
  - Marks 2 random in-transit orders as high-risk delayed
  - Broadcasts delay_alert events via WebSocket
  - Returns affected order IDs so frontend can flash alerts

GET /api/stats
  - Returns summary KPIs for the stats bar
"""
import random

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderStatus
from app.models.route import Route
from app.services.realtime_service import publish_event

router = APIRouter(prefix="/api", tags=["demo"])


@router.post("/demo/trigger")
async def trigger_demo(db: AsyncSession = Depends(get_db)):
    """
    Inject a Mumbai traffic spike scenario:
    1. Pick 2-3 random assigned/in-transit orders
    2. Broadcast delay_alert events for each
    3. Returns the affected orders for frontend to highlight
    """
    result = await db.execute(
        select(Order).where(Order.status.in_([OrderStatus.assigned, OrderStatus.in_transit]))
    )
    orders = result.scalars().all()

    if not orders:
        return {"message": "No active orders to trigger alerts for", "affected": []}

    # Pick up to 3 random orders
    affected = random.sample(orders, min(3, len(orders)))
    affected_ids = []

    traffic_messages = [
        "Heavy congestion on Western Express Highway",
        "Accident near Bandra-Kurla Complex",
        "Waterlogging on LBS Road — detour required",
        "Signal failure at Andheri junction",
        "Large vehicle breakdown on Sion-Panvel Highway",
    ]

    for order in affected:
        msg = random.choice(traffic_messages)
        delay_minutes = random.randint(15, 45)
        await publish_event("delay_alert", {
            "order_id": order.id,
            "driver_id": order.driver_id,
            "customer_name": order.customer_name,
            "message": msg,
            "delay_minutes": delay_minutes,
            "risk_level": "HIGH",
        })
        affected_ids.append({
            "order_id": order.id,
            "customer_name": order.customer_name,
            "message": msg,
            "delay_minutes": delay_minutes,
        })

    # Also broadcast a route_optimized suggestion event
    await publish_event("route_optimized", {
        "message": f"AI re-routing {len(affected)} orders to avoid traffic",
        "orders_affected": len(affected),
    })

    return {
        "message": f"Traffic spike triggered — {len(affected)} orders flagged",
        "affected": affected_ids,
    }


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Summary KPI stats for the dashboard."""
    # Driver counts
    driver_result = await db.execute(select(Driver))
    drivers = driver_result.scalars().all()

    active_drivers = sum(1 for d in drivers if d.status == DriverStatus.busy)
    available_drivers = sum(1 for d in drivers if d.status == DriverStatus.available)

    # Order counts
    order_result = await db.execute(select(Order))
    orders = order_result.scalars().all()

    status_counts = {}
    for o in orders:
        key = o.status.value if hasattr(o.status, "value") else str(o.status)
        status_counts[key] = status_counts.get(key, 0) + 1

    total_orders = len(orders)
    delivered = status_counts.get("delivered", 0)
    in_transit = status_counts.get("in_transit", 0)
    pending = status_counts.get("pending", 0)
    assigned = status_counts.get("assigned", 0)

    # Route stats
    route_result = await db.execute(select(Route))
    routes = route_result.scalars().all()
    total_distance = sum(r.total_distance or 0 for r in routes)
    active_routes = sum(1 for r in routes if str(r.status) in ("active", "RouteStatus.active"))

    on_time_rate = round((delivered / max(1, total_orders)) * 100, 1)

    return {
        "drivers": {
            "total": len(drivers),
            "active": active_drivers,
            "available": available_drivers,
        },
        "orders": {
            "total": total_orders,
            "pending": pending,
            "assigned": assigned,
            "in_transit": in_transit,
            "delivered": delivered,
        },
        "routes": {
            "total": len(routes),
            "active": active_routes,
            "total_distance_km": round(total_distance, 1),
        },
        "on_time_rate": on_time_rate,
    }
