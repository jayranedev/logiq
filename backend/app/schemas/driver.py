from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.driver import DriverStatus


class DriverBase(BaseModel):
    name: str
    phone: str
    vehicle_type: str = "bike"
    capacity: float = 20.0


class DriverCreate(DriverBase):
    pass


class DriverPatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    status: Optional[DriverStatus] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class DriverOut(DriverBase):
    id: int
    status: DriverStatus
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
