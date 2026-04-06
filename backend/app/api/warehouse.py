"""
Warehouse + Driver Auth API — LOGIQ.AI
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.driver import DriverOut
from app.services import warehouse_service

router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DriverRegisterIn(BaseModel):
    name: str
    phone: str
    vehicle_type: str = "bike"
    lat: Optional[float] = None
    lng: Optional[float] = None
    warehouse_name: Optional[str] = None


class DriverLoginIn(BaseModel):
    phone: str
    pin: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/list")
async def list_warehouses():
    """All available warehouses with coordinates."""
    return warehouse_service.list_warehouses()


@router.post("/nearest")
async def nearest_warehouse(lat: float, lng: float):
    """Find the nearest warehouse to given GPS coordinates."""
    name, info = warehouse_service.nearest_warehouse(lat, lng)
    return {"name": name, **info}


@router.post("/drivers/register", status_code=201)
async def register_driver(data: DriverRegisterIn, db: AsyncSession = Depends(get_db)):
    """
    Register a new driver.
    Auto-assigns nearest warehouse from lat/lng.
    Returns driver info + a 6-digit PIN for future logins.
    """
    # Check if phone already registered
    existing = await warehouse_service.driver_by_phone(db, data.phone)
    if existing:
        raise HTTPException(status_code=409, detail="Phone already registered")

    driver, pin = await warehouse_service.register_driver(
        db,
        name=data.name,
        phone=data.phone,
        vehicle_type=data.vehicle_type,
        lat=data.lat,
        lng=data.lng,
        warehouse_name=data.warehouse_name,
    )
    return {
        "driver_id": driver.id,
        "name": driver.name,
        "phone": driver.phone,
        "vehicle_type": driver.vehicle_type,
        "home_warehouse": driver.home_warehouse,
        "pin": pin,          # driver saves this for login
        "message": f"Welcome {driver.name}! Your PIN is {pin} — save it to log in.",
    }


@router.post("/drivers/login")
async def driver_login(data: DriverLoginIn, db: AsyncSession = Depends(get_db)):
    """Driver login with phone + PIN."""
    driver = await warehouse_service.driver_login(db, data.phone, data.pin)
    if not driver:
        raise HTTPException(status_code=401, detail="Invalid phone or PIN")
    return {
        "driver_id": driver.id,
        "name": driver.name,
        "phone": driver.phone,
        "vehicle_type": driver.vehicle_type,
        "home_warehouse": driver.home_warehouse,
        "home_lat": driver.home_lat,
        "home_lng": driver.home_lng,
        "status": driver.status,
    }
