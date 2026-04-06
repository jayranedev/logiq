"""
Parcel Service — LOGIQ.AI
=========================
Handles the full warehouse lifecycle:
  1. Register parcel (QR generation)
  2. Bulk CSV import
  3. Auto-sort into driver zones
  4. Driver bag-scan confirmation
  5. Route assignment + TSP optimization per zone
"""
import csv
import io
import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus, OrderPriority
from app.models.route import Route, RouteStatus
from app.schemas.order import ParcelScanCreate

# ── Zone definitions (mirror ghost_route_service.py) ─────────────────────────
# Maps zone name → primary driver ID
ZONE_DRIVER = {
    "South":         6,   # Rahul Gupta  — Colaba / Churchgate
    "South-Central": 1,   # Raju Sharma  — Dadar / Sion
    "Central-West":  2,   # Amit Patil   — Andheri West / Juhu
    "Central-East":  4,   # Vikram Singh — Ghatkopar / Kurla
    "North Mumbai":  3,   # Suresh Kumar — Borivali / Kandivali
    "Navi Mumbai":   5,   # Deepak Nair  — Vashi / Kharghar
}

# Warehouse depot (Dharavi — central Mumbai)
DEPOT_LAT = 19.0400
DEPOT_LNG = 72.8553


def zone_from_coords(lat: float, lng: float) -> str:
    """Classify a delivery point into one of 6 Mumbai delivery zones."""
    if lng >= 72.97:
        return "Navi Mumbai"
    if lat > 19.18:
        return "North Mumbai"
    if lat > 19.09:
        return "Central-West" if lng < 72.87 else "Central-East"
    if lat > 19.02:
        return "South-Central"
    return "South"


def generate_qr_code() -> str:
    """Generate a short unique QR code string."""
    return "LGQ-" + uuid.uuid4().hex[:10].upper()


# ── 1. Register single parcel ─────────────────────────────────────────────────

async def register_parcel(db: AsyncSession, data: ParcelScanCreate) -> Order:
    qr = generate_qr_code()
    zone = zone_from_coords(data.delivery_lat, data.delivery_lng)
    order = Order(
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        address=data.address,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        delivery_lat=data.delivery_lat,
        delivery_lng=data.delivery_lng,
        weight=data.weight,
        priority=data.priority,
        barcode=data.barcode,
        qr_code=qr,
        warehouse_zone=zone,
        status=OrderStatus.pending,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


# ── 2. Bulk CSV import ────────────────────────────────────────────────────────

async def bulk_import_csv(db: AsyncSession, csv_text: str) -> List[Order]:
    """
    Parse CSV with columns:
      customer_name, customer_phone, address, delivery_lat, delivery_lng,
      weight (optional), priority (optional), barcode (optional)
    Returns list of created orders.
    """
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    created = []

    for row in reader:
        try:
            dlat = float(row["delivery_lat"])
            dlng = float(row["delivery_lng"])
        except (KeyError, ValueError):
            continue  # skip malformed rows

        priority_str = (row.get("priority") or "medium").lower()
        if priority_str not in ("low", "medium", "high"):
            priority_str = "medium"

        order = Order(
            customer_name=row.get("customer_name", "Unknown"),
            customer_phone=row.get("customer_phone", "0000000000"),
            address=row.get("address", ""),
            pickup_lat=DEPOT_LAT,
            pickup_lng=DEPOT_LNG,
            delivery_lat=dlat,
            delivery_lng=dlng,
            weight=float(row.get("weight") or 1.0),
            priority=OrderPriority(priority_str),
            barcode=row.get("barcode") or None,
            qr_code=generate_qr_code(),
            warehouse_zone=zone_from_coords(dlat, dlng),
            status=OrderStatus.pending,
        )
        db.add(order)
        created.append(order)

    if created:
        await db.commit()
        for o in created:
            await db.refresh(o)

    return created


# ── 3. Auto-sort: assign zones + drivers to all unsorted pending orders ────────

async def auto_sort_parcels(db: AsyncSession) -> dict:
    """
    Assign warehouse_zone, driver_id, and status=assigned to every
    pending order that hasn't been sorted yet.
    Returns summary: { zone_name: count }
    """
    result = await db.execute(
        select(Order).where(
            and_(Order.status == OrderStatus.pending, Order.is_sorted == False)
        )
    )
    orders = result.scalars().all()

    zone_counts: dict[str, int] = {}
    for order in orders:
        zone = order.warehouse_zone or zone_from_coords(order.delivery_lat, order.delivery_lng)
        driver_id = ZONE_DRIVER.get(zone, 1)

        order.warehouse_zone = zone
        order.driver_id = driver_id
        order.is_sorted = True
        order.status = OrderStatus.assigned

        zone_counts[zone] = zone_counts.get(zone, 0) + 1

    await db.commit()
    return zone_counts


# ── 4. Driver bag-scan confirmation ──────────────────────────────────────────

async def confirm_bag_scan(db: AsyncSession, qr_code: str, driver_id: int) -> Optional[Order]:
    """
    Mark an order as scanned into driver's bag.
    Returns None if QR not found or belongs to different driver.
    """
    result = await db.execute(select(Order).where(Order.qr_code == qr_code))
    order = result.scalar_one_or_none()

    if not order:
        return None
    if order.driver_id and order.driver_id != driver_id:
        return None  # parcel belongs to a different driver

    order.bag_scanned = True
    order.bag_scanned_at = datetime.now(timezone.utc)
    if order.status == OrderStatus.assigned:
        order.status = OrderStatus.picked_up

    await db.commit()
    await db.refresh(order)
    return order


# ── 5. Route assignment + TSP optimization ────────────────────────────────────

def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (math.sin(dLat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearest_neighbor_tsp(depot: tuple, stops: list[tuple]) -> list[int]:
    """
    Greedy nearest-neighbor TSP starting from depot.
    stops: list of (order_id, lat, lng)
    Returns: ordered list of order_ids
    """
    if not stops:
        return []
    unvisited = list(range(len(stops)))
    route = []
    cur_lat, cur_lng = depot

    while unvisited:
        nearest = min(
            unvisited,
            key=lambda i: _haversine(cur_lat, cur_lng, stops[i][1], stops[i][2])
        )
        route.append(stops[nearest][0])
        cur_lat, cur_lng = stops[nearest][1], stops[nearest][2]
        unvisited.remove(nearest)

    return route


async def assign_routes_for_driver(db: AsyncSession, driver_id: int) -> Optional[Route]:
    """
    1. Fetch all scanned (picked_up) orders for this driver
    2. Run nearest-neighbor TSP from depot
    3. Create/replace active route with ordered waypoints
    4. Update all orders with route_id, set to in_transit
    """
    result = await db.execute(
        select(Order).where(
            and_(
                Order.driver_id == driver_id,
                Order.bag_scanned == True,
                Order.status.in_([OrderStatus.picked_up, OrderStatus.assigned]),
            )
        )
    )
    orders = result.scalars().all()

    if not orders:
        return None

    stops = [(o.id, o.delivery_lat, o.delivery_lng) for o in orders]
    ordered_ids = _nearest_neighbor_tsp((DEPOT_LAT, DEPOT_LNG), stops)

    # Build waypoints list for storage
    id_to_order = {o.id: o for o in orders}
    waypoints = [{"order_id": oid, "lat": id_to_order[oid].delivery_lat, "lng": id_to_order[oid].delivery_lng,
                  "address": id_to_order[oid].address or ""}
                 for oid in ordered_ids]

    # Calculate total distance
    total_dist = 0.0
    prev = (DEPOT_LAT, DEPOT_LNG)
    for wp in waypoints:
        total_dist += _haversine(prev[0], prev[1], wp["lat"], wp["lng"])
        prev = (wp["lat"], wp["lng"])

    # Create the route
    route = Route(
        driver_id=driver_id,
        status=RouteStatus.active,
        total_distance=round(total_dist, 2),
        estimated_time=round((total_dist / 25) * 60, 0),  # 25 km/h avg
        waypoints=waypoints,
    )
    db.add(route)
    await db.flush()  # get route.id

    # Update all orders
    for order in orders:
        order.route_id = route.id
        order.status = OrderStatus.in_transit

    await db.commit()
    await db.refresh(route)
    return route


# ── 6. Lookup by QR for scan validation ──────────────────────────────────────

async def get_order_by_qr(db: AsyncSession, qr_code: str) -> Optional[Order]:
    result = await db.execute(select(Order).where(Order.qr_code == qr_code))
    return result.scalar_one_or_none()


async def get_unsorted_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(Order).where(
            and_(Order.status == OrderStatus.pending, Order.is_sorted == False)
        )
    )
    return len(result.scalars().all())
