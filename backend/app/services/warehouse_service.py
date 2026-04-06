"""
Warehouse Service — LOGIQ.AI
============================
Multi-warehouse support. Warehouses are named depots across cities.
Drivers register from their nearest warehouse and get auto-assigned to it.
"""
import math
import random
import string
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverStatus

# ── Warehouse registry ────────────────────────────────────────────────────────
# Each warehouse has: name, lat, lng, zones it serves
WAREHOUSES = {
    "Mumbai Central":  {"lat": 19.0400, "lng": 72.8553, "city": "Mumbai",  "zones": ["South-Central", "South"]},
    "Andheri Hub":     {"lat": 19.1136, "lng": 72.8697, "city": "Mumbai",  "zones": ["Central-West", "Central-East"]},
    "Borivali Depot":  {"lat": 19.2288, "lng": 72.8580, "city": "Mumbai",  "zones": ["North Mumbai"]},
    "Navi Mumbai HQ":  {"lat": 19.0522, "lng": 73.0005, "city": "Mumbai",  "zones": ["Navi Mumbai"]},
    # Goa warehouses (for the Margao/Aquem use-case)
    "Aquem Depot":     {"lat": 15.2832, "lng": 73.9862, "city": "Margao",  "zones": ["South Goa"]},
    "Panaji Hub":      {"lat": 15.4989, "lng": 73.8278, "city": "Panaji",  "zones": ["North Goa"]},
    # Generic — nearest warehouse auto-assigned
    "City Center":     {"lat": 19.0760, "lng": 72.8777, "city": "Default", "zones": ["Central-West"]},
}


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_warehouse(lat: float, lng: float) -> tuple[str, dict]:
    """Return (name, info) of the closest warehouse to given coords."""
    best_name = "City Center"
    best_dist = float("inf")
    for name, info in WAREHOUSES.items():
        d = _haversine(lat, lng, info["lat"], info["lng"])
        if d < best_dist:
            best_dist = d
            best_name = name
    return best_name, WAREHOUSES[best_name]


def list_warehouses() -> list[dict]:
    return [{"name": k, **v} for k, v in WAREHOUSES.items()]


def _gen_pin() -> str:
    return "".join(random.choices(string.digits, k=6))


# ── Driver registration ───────────────────────────────────────────────────────

async def register_driver(
    db: AsyncSession,
    name: str,
    phone: str,
    vehicle_type: str = "bike",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    warehouse_name: Optional[str] = None,
) -> tuple[Driver, str]:
    """
    Register a new driver. Auto-assigns nearest warehouse if lat/lng provided.
    Returns (driver, pin) — driver receives their 6-digit PIN for future logins.
    """
    pin = _gen_pin()

    # Determine home warehouse
    if warehouse_name and warehouse_name in WAREHOUSES:
        wh_name = warehouse_name
        wh = WAREHOUSES[wh_name]
    elif lat is not None and lng is not None:
        wh_name, wh = nearest_warehouse(lat, lng)
    else:
        wh_name = "City Center"
        wh = WAREHOUSES[wh_name]

    capacity_map = {"bike": 15.0, "scooter": 20.0, "van": 100.0, "truck": 500.0}

    driver = Driver(
        name=name,
        phone=phone,
        vehicle_type=vehicle_type,
        capacity=capacity_map.get(vehicle_type, 20.0),
        status=DriverStatus.available,
        current_lat=lat or wh["lat"],
        current_lng=lng or wh["lng"],
        home_warehouse=wh_name,
        home_lat=wh["lat"],
        home_lng=wh["lng"],
        pin_code=pin,
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver, pin


async def driver_login(db: AsyncSession, phone: str, pin: str) -> Optional[Driver]:
    """Authenticate driver by phone + PIN."""
    result = await db.execute(
        select(Driver).where(Driver.phone == phone, Driver.pin_code == pin)
    )
    return result.scalar_one_or_none()


async def driver_by_phone(db: AsyncSession, phone: str) -> Optional[Driver]:
    result = await db.execute(select(Driver).where(Driver.phone == phone))
    return result.scalar_one_or_none()
