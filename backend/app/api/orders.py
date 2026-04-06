from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderOut, OrderPatch
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderOut])
async def list_orders(
    status: Optional[OrderStatus] = None,
    driver_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    return await order_service.get_orders(db, status=status, driver_id=driver_id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    return await order_service.create_order(db, data)


@router.patch("/{order_id}", response_model=OrderOut)
async def patch_order(
    order_id: int, data: OrderPatch, db: AsyncSession = Depends(get_db)
):
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return await order_service.patch_order(db, order, data)
