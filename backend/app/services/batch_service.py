"""
Order batching service.

Groups pending orders by geographic proximity and assigns
them to available drivers based on capacity.
"""
import math
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderStatus
from app.models.route import Route, RouteStatus
from app.services.route_optimizer import haversine_km, optimize_routes


async def batch_and_assign(db: AsyncSession) -> dict:
    """
    Auto-batch pending orders and assign to available drivers.

    1. Fetch all pending orders
    2. Fetch all available drivers
    3. Run OR-Tools optimizer
    4. Create Route records and update orders with driver_id + route_id
    """
    # Fetch pending orders
    result = await db.execute(
        select(Order).where(Order.status == OrderStatus.pending)
    )
    pending_orders = result.scalars().all()

    # Fetch available drivers
    result = await db.execute(
        select(Driver).where(Driver.status.in_([DriverStatus.available, DriverStatus.busy]))
    )
    available_drivers = result.scalars().all()

    if not pending_orders or not available_drivers:
        return {
            "message": "No pending orders or no available drivers",
            "routes_created": 0,
            "orders_assigned": 0,
            "orders_unassigned": len(pending_orders) if pending_orders else 0,
        }

    # Prepare data for optimizer
    order_dicts = [
        {
            "id": o.id,
            "pickup_lat": o.pickup_lat,
            "pickup_lng": o.pickup_lng,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "weight": o.weight,
            "priority": o.priority.value if o.priority else "medium",
        }
        for o in pending_orders
    ]

    driver_dicts = [
        {
            "id": d.id,
            "name": d.name,
            "capacity": d.capacity,
            "current_lat": d.current_lat or 19.076,
            "current_lng": d.current_lng or 72.8777,
        }
        for d in available_drivers
    ]

    # Run optimizer
    result = optimize_routes(order_dicts, driver_dicts)

    # Create route records and assign orders
    routes_created = 0
    orders_assigned = 0

    for route_data in result["routes"]:
        # Create Route in DB
        route = Route(
            driver_id=route_data["driver_id"],
            status=RouteStatus.planned,
            total_distance=route_data["total_distance_km"],
            estimated_time=route_data["estimated_time_min"],
            waypoints=route_data["waypoints"],
        )
        db.add(route)
        await db.flush()
        routes_created += 1

        # Update orders
        for order_id in route_data["order_ids"]:
            order_result = await db.execute(
                select(Order).where(Order.id == order_id)
            )
            order = order_result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.assigned
                order.driver_id = route_data["driver_id"]
                order.route_id = route.id
                orders_assigned += 1

    await db.commit()

    return {
        "message": f"Batched {orders_assigned} orders into {routes_created} routes",
        "routes_created": routes_created,
        "orders_assigned": orders_assigned,
        "orders_unassigned": len(result.get("unassigned", [])),
        "total_distance_km": result.get("total_distance_km", 0),
        "routes": result["routes"],
    }
