from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderPatch


async def get_orders(
    db: AsyncSession,
    status: Optional[OrderStatus] = None,
    driver_id: Optional[int] = None,
) -> List[Order]:
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
    if driver_id is not None:
        q = q.where(Order.driver_id == driver_id)
    result = await db.execute(q.order_by(Order.created_at.desc()))
    return result.scalars().all()


async def get_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    result = await db.execute(select(Order).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def create_order(db: AsyncSession, data: OrderCreate) -> Order:
    order = Order(**data.model_dump())
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def patch_order(db: AsyncSession, order: Order, data: OrderPatch) -> Order:
    old_status = order.status
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(order, field, value)
    await db.commit()
    await db.refresh(order)

    # Broadcast status-change events to all WS clients
    if data.status and data.status != old_status:
        from app.services.realtime_service import publish_event
        event_type_map = {
            "assigned": "order_assigned",
            "picked_up": "order_picked_up",
            "in_transit": "order_in_transit",
            "delivered": "order_delivered",
        }
        etype = event_type_map.get(str(data.status.value if hasattr(data.status, 'value') else data.status), "order_updated")
        import asyncio
        asyncio.create_task(publish_event(etype, {
            "order_id": order.id,
            "driver_id": order.driver_id,
            "status": str(order.status.value if hasattr(order.status, 'value') else order.status),
            "customer_name": order.customer_name,
        }))

    return order
