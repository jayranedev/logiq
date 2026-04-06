import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"


class OrderPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_lat: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_lng: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.pending
    )
    priority: Mapped[OrderPriority] = mapped_column(
        Enum(OrderPriority), default=OrderPriority.medium
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=True
    )
    route_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("routes.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Parcel / warehouse fields ──────────────────────────────────────────────
    qr_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    warehouse_zone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_sorted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bag_scanned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bag_scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    driver: Mapped["Driver"] = relationship("Driver", back_populates="orders")
    route: Mapped["Route"] = relationship("Route", back_populates="orders")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="order")
