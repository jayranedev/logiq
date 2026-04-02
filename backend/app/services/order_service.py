from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderPatch


async def get_orders(
    db: AsyncSession, status: Optional[OrderStatus] = None
) -> List[Order]:
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
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
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(order, field, value)
    await db.commit()
    await db.refresh(order)
    return order
