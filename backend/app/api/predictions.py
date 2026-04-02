from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.order import Order
from app.schemas.prediction import (
    BatchPredictionOut,
    BatchPredictionRequest,
    PredictionOut,
)
from app.services.prediction_service import load_models, predict_single, predict_batch

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/{order_id}", response_model=PredictionOut)
async def get_prediction(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get delay risk prediction for a single order."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_dict = {
        "id": order.id,
        "pickup_lat": order.pickup_lat,
        "pickup_lng": order.pickup_lng,
        "delivery_lat": order.delivery_lat,
        "delivery_lng": order.delivery_lng,
        "weight": order.weight,
        "priority": order.priority.value if order.priority else "medium",
    }
    prediction = predict_single(order_dict)
    prediction["order_id"] = order.id
    return prediction


@router.post("/batch", response_model=BatchPredictionOut)
async def batch_predict(
    req: BatchPredictionRequest, db: AsyncSession = Depends(get_db)
):
    """Get delay risk predictions for multiple orders."""
    result = await db.execute(
        select(Order).where(Order.id.in_(req.order_ids))
    )
    orders = result.scalars().all()

    if not orders:
        raise HTTPException(status_code=404, detail="No orders found")

    order_dicts = [
        {
            "id": o.id,
            "pickup_lat": o.pickup_lat,
            "pickup_lng": o.pickup_lng,
            "delivery_lat": o.delivery_lat,
            "delivery_lng": o.delivery_lng,
            "weight": o.weight,
            "priority": o.priority.value if o.priority else "medium",
        }
        for o in orders
    ]

    predictions = predict_batch(order_dicts)
    for pred, order in zip(predictions, orders):
        pred["order_id"] = order.id

    return {"predictions": predictions}
