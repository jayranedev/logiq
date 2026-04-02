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
    pass


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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
