"""
OR-Tools CVRP route optimizer.

Takes pending orders + available drivers, returns optimized route assignments
with capacity constraints and priority weighting.
"""
import math
from typing import List, Optional

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in km."""
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_distance_matrix(locations: list[tuple[float, float]]) -> list[list[int]]:
    """Build a distance matrix (in meters) from lat/lng pairs."""
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = int(
                    haversine_km(
                        locations[i][0], locations[i][1],
                        locations[j][0], locations[j][1],
                    )
                    * 1000  # convert to meters
                )
    return matrix


def optimize_routes(
    orders: list[dict],
    drivers: list[dict],
    depot: tuple[float, float] = (19.076, 72.8777),  # Mumbai center
    max_time_seconds: int = 5,
) -> dict:
    """
    Run CVRP optimization.

    Args:
        orders: list of dicts with keys: id, pickup_lat, pickup_lng,
                delivery_lat, delivery_lng, weight, priority
        drivers: list of dicts with keys: id, name, capacity,
                 current_lat, current_lng
        depot: default depot (lat, lng)
        max_time_seconds: solver time limit

    Returns:
        dict with 'routes' (list of route assignments) and 'unassigned' order IDs
    """
    if not orders or not drivers:
        return {"routes": [], "unassigned": [o["id"] for o in orders], "total_distance": 0}

    # Build locations: depot + delivery locations for each order
    locations = [depot]
    for order in orders:
        locations.append((order["delivery_lat"], order["delivery_lng"]))

    num_locations = len(locations)
    num_vehicles = len(drivers)

    # Build distance matrix
    distance_matrix = _build_distance_matrix(locations)

    # OR-Tools data model
    manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    # Distance callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Capacity constraint
    demands = [0]  # depot has 0 demand
    for order in orders:
        demands.append(int(order.get("weight", 1) * 10))  # scale to int

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    vehicle_capacities = [int(d.get("capacity", 20) * 10) for d in drivers]
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        vehicle_capacities,
        True,  # start cumul to zero
        "Capacity",
    )

    # Priority: penalize dropping high-priority orders more
    priority_penalty = {"high": 100000, "medium": 50000, "low": 20000}
    for i, order in enumerate(orders):
        node_index = manager.NodeToIndex(i + 1)
        p = order.get("priority", "medium")
        routing.AddDisjunction([node_index], priority_penalty.get(p, 50000))

    # Search parameters
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = max_time_seconds

    # Solve
    solution = routing.SolveWithParameters(search_params)

    if not solution:
        return {
            "routes": [],
            "unassigned": [o["id"] for o in orders],
            "total_distance": 0,
        }

    # Extract solution
    routes = []
    total_distance = 0
    assigned_order_ids = set()

    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route_orders = []
        route_waypoints = []
        route_distance = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node > 0:  # skip depot
                order = orders[node - 1]
                route_orders.append(order["id"])
                assigned_order_ids.add(order["id"])
                route_waypoints.append({
                    "lat": order["delivery_lat"],
                    "lng": order["delivery_lng"],
                    "order_id": order["id"],
                })

            prev_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(prev_index, index, vehicle_id)

        if route_orders:
            driver = drivers[vehicle_id]
            route_distance_km = round(route_distance / 1000, 2)
            total_distance += route_distance_km
            # Estimated time: avg 25 km/h in Mumbai traffic
            estimated_time_min = round(route_distance_km / 25 * 60, 1)

            routes.append({
                "driver_id": driver["id"],
                "driver_name": driver.get("name", ""),
                "order_ids": route_orders,
                "waypoints": route_waypoints,
                "total_distance_km": route_distance_km,
                "estimated_time_min": estimated_time_min,
            })

    unassigned = [o["id"] for o in orders if o["id"] not in assigned_order_ids]

    return {
        "routes": routes,
        "unassigned": unassigned,
        "total_distance_km": round(total_distance, 2),
    }
