from typing import Any, List, Optional

from pydantic import BaseModel


class PredictionFactor(BaseModel):
    feature: str
    impact: float
    direction: str  # "increases_risk" or "decreases_risk"


class PredictionOut(BaseModel):
    order_id: Optional[int] = None
    risk_level: str  # "HIGH", "MEDIUM", "LOW"
    delay_probability: float
    estimated_delay_minutes: float
    factors: List[PredictionFactor]


class BatchPredictionRequest(BaseModel):
    order_ids: List[int]


class BatchPredictionOut(BaseModel):
    predictions: List[PredictionOut]
