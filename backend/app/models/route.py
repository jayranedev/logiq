import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RouteStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=True
    )
    status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus), default=RouteStatus.planned
    )
    total_distance: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_time: Mapped[float] = mapped_column(Float, default=0.0)
    waypoints: Mapped[dict] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    driver: Mapped["Driver"] = relationship("Driver", back_populates="routes")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="route")
