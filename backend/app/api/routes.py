from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderStatus
from app.models.route import Route
from app.schemas.route import RouteOut
from app.services.route_optimizer import optimize_routes
from app.services.batch_service import batch_and_assign

from pydantic import BaseModel


class OptimizeRequest(BaseModel):
    order_ids: Optional[List[int]] = None  # None = all pending orders
    driver_ids: Optional[List[int]] = None  # None = all available drivers


class OptimizeResponse(BaseModel):
    routes: list
    unassigned: List[int]
    total_distance_km: float


router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("", response_model=List[RouteOut])
async def list_routes(
    driver_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Route).order_by(Route.created_at.desc())
    if driver_id is not None:
        q = q.where(Route.driver_id == driver_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(req: OptimizeRequest, db: AsyncSession = Depends(get_db)):
    """Run OR-Tools CVRP optimization on orders and drivers."""
    # Get orders
    if req.order_ids:
        result = await db.execute(
            select(Order).where(Order.id.in_(req.order_ids))
        )
    else:
        result = await db.execute(
            select(Order).where(Order.status == OrderStatus.pending)
        )
    orders = result.scalars().all()

    # Get drivers
    if req.driver_ids:
        result = await db.execute(
            select(Driver).where(Driver.id.in_(req.driver_ids))
        )
    else:
        result = await db.execute(
            select(Driver).where(
                Driver.status.in_([DriverStatus.available, DriverStatus.busy])
            )
        )
    drivers = result.scalars().all()

    if not orders:
        raise HTTPException(status_code=400, detail="No orders to optimize")
    if not drivers:
        raise HTTPException(status_code=400, detail="No drivers available")

    order_dicts = [
        {
            "id": o.id,
            "pickup_lat": o.pickup_lat,
            "pickup_lng": o.pickup_lng,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "weight": o.weight or 1.0,
            "priority": o.priority.value if o.priority else "medium",
        }
        for o in orders
    ]
    driver_dicts = [
        {
            "id": d.id,
            "name": d.name,
            "capacity": d.capacity or 20.0,
            "current_lat": d.current_lat or 19.076,
            "current_lng": d.current_lng or 72.8777,
        }
        for d in drivers
    ]

    result = optimize_routes(order_dicts, driver_dicts)
    return result


@router.post("/batch")
async def batch_orders(db: AsyncSession = Depends(get_db)):
    """Auto-batch pending orders and assign to available drivers."""
    return await batch_and_assign(db)
