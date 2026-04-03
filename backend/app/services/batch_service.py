"""
Smart order batching service.

Groups pending orders by geographic zone/cluster and assigns
them to the nearest available driver, minimizing total travel distance.
This simulates warehouse sorting — parcels for the same area go to the same driver.
"""
import math
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderStatus
from app.models.route import Route, RouteStatus
from app.services.route_optimizer import haversine_km, optimize_routes


# Mumbai delivery zones with centroids for clustering
ZONE_CENTROIDS = {
    "North":         (19.1941, 72.8530),
    "Central-West":  (19.0893, 72.8413),
    "Central-East":  (19.0809, 72.8964),
    "South-Central": (19.0154, 72.8316),
    "South":         (18.9195, 72.8249),
    "Navi Mumbai":   (19.1257, 73.0039),
}


def _classify_zone(lat: float, lng: float) -> str:
    """Assign a delivery location to the nearest zone centroid."""
    best_zone = "Central-West"
    best_dist = float("inf")
    for zone, (clat, clng) in ZONE_CENTROIDS.items():
        dist = haversine_km(lat, lng, clat, clng)
        if dist < best_dist:
            best_dist = dist
            best_zone = zone
    return best_zone


def _find_nearest_driver(zone_centroid: tuple, drivers: list[dict], used: set) -> dict | None:
    """Find the nearest available driver to a zone centroid."""
    best = None
    best_dist = float("inf")
    for d in drivers:
        if d["id"] in used:
            continue
        dist = haversine_km(
            d["current_lat"], d["current_lng"],
            zone_centroid[0], zone_centroid[1],
        )
        if dist < best_dist:
            best_dist = dist
            best = d
    return best


async def batch_and_assign(db: AsyncSession) -> dict:
    """
    Zone-based smart batching:

    1. Fetch all pending orders
    2. Classify each order into a delivery zone
    3. For each zone, find the nearest available driver
    4. Run OR-Tools within each zone for stop ordering
    5. Create Route records and assign orders

    This simulates warehouse sorting: parcels for the same area
    are loaded onto the same truck/bike, minimizing travel distance.
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

    # Step 1: Classify orders into zones
    zone_orders = defaultdict(list)
    for o in pending_orders:
        zone = _classify_zone(o.delivery_lat, o.delivery_lng)
        zone_orders[zone].append(o)

    # Prepare driver dicts
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

    # Step 2: For each zone, assign nearest driver and optimize route
    routes_created = 0
    orders_assigned = 0
    all_routes = []
    used_drivers = set()

    for zone, orders in sorted(zone_orders.items(), key=lambda x: -len(x[1])):
        # Find nearest driver to this zone
        centroid = ZONE_CENTROIDS.get(zone, (19.076, 72.8777))
        driver = _find_nearest_driver(centroid, driver_dicts, used_drivers)

        if driver is None:
            continue  # No drivers left

        used_drivers.add(driver["id"])

        # Prepare order dicts for this zone
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
            for o in orders
        ]

        # Check capacity — if zone has too much weight, split
        total_weight = sum(o.weight for o in orders)
        if total_weight <= driver["capacity"]:
            # All orders fit — optimize stop order
            opt = optimize_routes(order_dicts, [driver])
            for route_data in opt["routes"]:
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

                all_routes.append(route_data)
        else:
            # Over capacity — assign what fits (highest priority first)
            orders.sort(key=lambda o: {"high": 0, "medium": 1, "low": 2}.get(
                o.priority.value if o.priority else "medium", 1
            ))
            fitting = []
            cumweight = 0
            for o in orders:
                if cumweight + o.weight <= driver["capacity"]:
                    fitting.append(o)
                    cumweight += o.weight

            if fitting:
                fit_dicts = [
                    {
                        "id": o.id,
                        "pickup_lat": o.pickup_lat,
                        "pickup_lng": o.pickup_lng,
                        "delivery_lat": o.delivery_lat,
                        "delivery_lng": o.delivery_lng,
                        "weight": o.weight,
                        "priority": o.priority.value if o.priority else "medium",
                    }
                    for o in fitting
                ]
                opt = optimize_routes(fit_dicts, [driver])
                for route_data in opt["routes"]:
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

                    all_routes.append(route_data)

    await db.commit()

    unassigned_count = len(pending_orders) - orders_assigned
    total_dist = sum(r.get("total_distance_km", 0) for r in all_routes)

    return {
        "message": f"Sorted {orders_assigned} parcels into {routes_created} zone-based routes",
        "routes_created": routes_created,
        "orders_assigned": orders_assigned,
        "orders_unassigned": unassigned_count,
        "total_distance_km": round(total_dist, 2),
        "routes": all_routes,
    }
