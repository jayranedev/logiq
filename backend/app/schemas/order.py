from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.order import OrderPriority, OrderStatus


class OrderBase(BaseModel):
    customer_name: str
    customer_phone: str
    pickup_lat: float
    pickup_lng: float
    delivery_lat: float
    delivery_lng: float
    address: Optional[str] = None
    priority: OrderPriority = OrderPriority.medium
    weight: float = 1.0


class OrderCreate(OrderBase):
    barcode: Optional[str] = None


class OrderPatch(BaseModel):
    status: Optional[OrderStatus] = None
    priority: Optional[OrderPriority] = None
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    address: Optional[str] = None


class OrderOut(OrderBase):
    id: int
    status: OrderStatus
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    qr_code: Optional[str] = None
    barcode: Optional[str] = None
    warehouse_zone: Optional[str] = None
    is_sorted: bool = False
    bag_scanned: bool = False
    bag_scanned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Parcel-specific schemas ────────────────────────────────────────────────────

class ParcelScanCreate(BaseModel):
    """Register a new parcel via QR/barcode scan at warehouse intake."""
    customer_name: str
    customer_phone: str
    address: str
    delivery_lat: float
    delivery_lng: float
    weight: float = 1.0
    priority: OrderPriority = OrderPriority.medium
    barcode: Optional[str] = None
    # Warehouse pickup coords (defaults to main Mumbai depot)
    pickup_lat: float = 19.0760
    pickup_lng: float = 72.8777


class CsvRowIn(BaseModel):
    customer_name: str
    customer_phone: str
    address: str
    delivery_lat: float
    delivery_lng: float
    weight: float = 1.0
    priority: str = "medium"
    barcode: Optional[str] = None
