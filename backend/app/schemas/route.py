from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.models.route import RouteStatus


class RouteBase(BaseModel):
    driver_id: Optional[int] = None
    total_distance: float = 0.0
    estimated_time: float = 0.0
    waypoints: Any = []


class RouteCreate(RouteBase):
    pass


class RoutePatch(BaseModel):
    status: Optional[RouteStatus] = None
    driver_id: Optional[int] = None
    total_distance: Optional[float] = None
    estimated_time: Optional[float] = None
    waypoints: Optional[Any] = None


class RouteOut(RouteBase):
    id: int
    status: RouteStatus
    created_at: datetime

    model_config = {"from_attributes": True}
