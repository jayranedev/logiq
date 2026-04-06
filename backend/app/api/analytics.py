"""
Analytics API
GET /api/analytics/summary          → KPI summary + trends
GET /api/analytics/deliveries/daily → orders delivered per day (last 7 days)
GET /api/analytics/zones            → order count + delay rate per zone
GET /api/analytics/drivers          → per-driver delivery stats
GET /api/analytics/predictions/live → run live batch predictions on all active orders
"""
import asyncio
import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.driver import Driver
from app.models.order import Order, OrderStatus, OrderPriority
from app.models.route import Route
from app.services.prediction_service import predict_single_live

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Zone classifier (same centroids as batch_service)
ZONE_CENTROIDS = {
    "North":         (19.1941, 72.8530),
    "Central-West":  (19.0893, 72.8413),
    "Central-East":  (19.0809, 72.8964),
    "South-Central": (19.0154, 72.8316),
    "South":         (18.9195, 72.8249),
    "Navi Mumbai":   (19.1257, 73.0039),
}


def _classify_zone(lat: float, lng: float) -> str:
    best_zone = "Central-West"
    best_dist = float("inf")
    for zone, (clat, clng) in ZONE_CENTROIDS.items():
        R = 6371
        dLat = math.radians(clat - lat)
        dLng = math.radians(clng - lng)
        a = math.sin(dLat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(clat)) * math.sin(dLng/2)**2
        dist = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        if dist < best_dist:
            best_dist = dist
            best_zone = zone
    return best_zone


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Top-level KPI summary with 7-day trends."""
    result = await db.execute(select(Order))
    orders = result.scalars().all()

    from datetime import timezone
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total = len(orders)
    delivered = sum(1 for o in orders if o.status == OrderStatus.delivered)
    in_transit = sum(1 for o in orders if o.status == OrderStatus.in_transit)
    pending = sum(1 for o in orders if o.status == OrderStatus.pending)
    high_priority = sum(1 for o in orders if o.priority == OrderPriority.high)

    # Last 7 days delivered (handle tz-naive DB datetimes)
    def _dt(d):
        if d is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

    recent_delivered = sum(
        1 for o in orders
        if o.status == OrderStatus.delivered and _dt(o.updated_at) >= week_ago
    )

    # On-time rate proxy (delivered / total non-pending)
    non_pending = total - pending
    on_time_rate = round(delivered / max(1, non_pending) * 100, 1)

    drivers_result = await db.execute(select(Driver))
    drivers = drivers_result.scalars().all()
    active_drivers = sum(1 for d in drivers if d.status.value == "busy")

    routes_result = await db.execute(select(Route))
    routes = routes_result.scalars().all()
    total_distance = sum(r.total_distance or 0 for r in routes)

    return {
        "total_orders": total,
        "delivered": delivered,
        "in_transit": in_transit,
        "pending": pending,
        "high_priority": high_priority,
        "on_time_rate": on_time_rate,
        "active_drivers": active_drivers,
        "total_drivers": len(drivers),
        "total_routes": len(routes),
        "total_distance_km": round(total_distance, 1),
        "recent_7d_delivered": recent_delivered,
    }


@router.get("/deliveries/daily")
async def daily_deliveries(db: AsyncSession = Depends(get_db)):
    """Delivery counts per day for the last 7 days — feeds Recharts line chart."""
    from datetime import timezone as _tz

    def _utc(d):
        if d is None:
            return datetime.min.replace(tzinfo=_tz.utc)
        return d if d.tzinfo else d.replace(tzinfo=_tz.utc)

    result = await db.execute(select(Order))
    orders = result.scalars().all()

    now = datetime.now(_tz.utc)
    days = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        delivered = sum(
            1 for o in orders
            if o.status == OrderStatus.delivered and day_start <= _utc(o.updated_at) < day_end
        )
        created = sum(
            1 for o in orders
            if day_start <= _utc(o.created_at) < day_end
        )

        days.append({
            "date": day.strftime("%b %d"),
            "delivered": delivered,
            "created": created,
        })

    return days


@router.get("/zones")
async def zone_stats(db: AsyncSession = Depends(get_db)):
    """Order distribution and status breakdown per Mumbai delivery zone."""
    result = await db.execute(select(Order))
    orders = result.scalars().all()

    zone_data = {}
    for zone in ZONE_CENTROIDS:
        zone_data[zone] = {"zone": zone, "total": 0, "delivered": 0, "pending": 0, "in_transit": 0}

    for o in orders:
        zone = _classify_zone(o.delivery_lat, o.delivery_lng)
        zd = zone_data[zone]
        zd["total"] += 1
        if o.status == OrderStatus.delivered:
            zd["delivered"] += 1
        elif o.status == OrderStatus.pending:
            zd["pending"] += 1
        elif o.status == OrderStatus.in_transit:
            zd["in_transit"] += 1

    result_list = sorted(zone_data.values(), key=lambda z: -z["total"])
    for z in result_list:
        z["delivery_rate"] = round(z["delivered"] / max(1, z["total"]) * 100, 1)

    return result_list


@router.get("/drivers")
async def driver_stats(db: AsyncSession = Depends(get_db)):
    """Per-driver delivery count and efficiency stats."""
    orders_result = await db.execute(select(Order))
    orders = orders_result.scalars().all()
    drivers_result = await db.execute(select(Driver))
    drivers = drivers_result.scalars().all()
    routes_result = await db.execute(select(Route))
    routes = routes_result.scalars().all()

    driver_orders = {}
    for o in orders:
        if o.driver_id:
            driver_orders.setdefault(o.driver_id, []).append(o)

    driver_routes = {}
    for r in routes:
        if r.driver_id:
            driver_routes.setdefault(r.driver_id, []).append(r)

    stats = []
    for d in drivers:
        d_orders = driver_orders.get(d.id, [])
        d_routes = driver_routes.get(d.id, [])
        delivered = sum(1 for o in d_orders if o.status == OrderStatus.delivered)
        in_transit = sum(1 for o in d_orders if o.status == OrderStatus.in_transit)
        total_km = sum(r.total_distance or 0 for r in d_routes)

        stats.append({
            "driver_id": d.id,
            "name": d.name,
            "vehicle_type": d.vehicle_type,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "total_assigned": len(d_orders),
            "delivered": delivered,
            "in_transit": in_transit,
            "total_routes": len(d_routes),
            "total_distance_km": round(total_km, 1),
            "delivery_rate": round(delivered / max(1, len(d_orders)) * 100, 1),
        })

    return sorted(stats, key=lambda s: -s["delivered"])


@router.get("/predictions/live")
async def live_predictions(db: AsyncSession = Depends(get_db)):
    """
    Run live XGBoost predictions (with Mapbox traffic) on all active orders.
    Returns risk summary + per-order predictions.
    """
    result = await db.execute(
        select(Order).where(
            Order.status.in_([OrderStatus.assigned, OrderStatus.in_transit, OrderStatus.pending])
        )
    )
    orders = result.scalars().all()

    # Run predictions concurrently
    async def predict_order(o):
        order_dict = {
            "id": o.id,
            "pickup_lat": o.pickup_lat,
            "pickup_lng": o.pickup_lng,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "weight": o.weight or 1.0,
            "priority": o.priority.value if o.priority else "medium",
        }
        pred = await predict_single_live(order_dict)
        return {"order_id": o.id, "customer_name": o.customer_name, **pred}

    predictions = await asyncio.gather(*[predict_order(o) for o in orders])

    high_risk = sum(1 for p in predictions if p["risk_level"] == "HIGH")
    medium_risk = sum(1 for p in predictions if p["risk_level"] == "MEDIUM")
    low_risk = sum(1 for p in predictions if p["risk_level"] == "LOW")

    return {
        "total_analyzed": len(predictions),
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk,
        "risk_summary": f"{high_risk} HIGH · {medium_risk} MED · {low_risk} LOW",
        "predictions": sorted(predictions, key=lambda p: -p["delay_probability"]),
    }
