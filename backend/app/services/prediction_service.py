"""
Prediction service — loads trained XGBoost models and provides
delay risk predictions with SHAP explainability.
"""
import os
import pickle
import math
import random
from typing import Optional

import numpy as np

# Feature names must match training order
FEATURE_NAMES = [
    "distance_km",
    "weight_kg",
    "priority_encoded",
    "hour_of_day",
    "day_of_week",
    "traffic_factor",
    "weather_score",
    "driver_experience_days",
    "is_rush_hour",
    "zone_density",
]

PRIORITY_MAP = {"low": 0, "medium": 1, "high": 2}
RISK_THRESHOLDS = {"HIGH": 0.7, "MEDIUM": 0.4}

_classifier = None
_regressor = None
_explainer = None


def _get_model_path(filename: str) -> str:
    return os.path.join(os.path.dirname(__file__), "..", "ml", filename)


def load_models():
    """Load trained models from disk."""
    global _classifier, _regressor, _explainer

    clf_path = _get_model_path("model_classifier.pkl")
    reg_path = _get_model_path("model_regressor.pkl")

    if os.path.exists(clf_path):
        with open(clf_path, "rb") as f:
            _classifier = pickle.load(f)

    if os.path.exists(reg_path):
        with open(reg_path, "rb") as f:
            _regressor = pickle.load(f)

    # Try loading SHAP explainer
    try:
        import shap
        if _classifier is not None:
            _explainer = shap.TreeExplainer(_classifier)
    except Exception:
        _explainer = None


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _extract_features(order: dict, traffic_factor: float = None) -> np.ndarray:
    """
    Extract ML features from order data.
    If traffic_factor is provided (from Mapbox live data), use it directly.
    Otherwise fall back to time-based estimate.
    """
    from datetime import datetime

    now = datetime.now()

    distance = _haversine_km(
        order.get("pickup_lat", 19.076),
        order.get("pickup_lng", 72.8777),
        order.get("delivery_lat", 19.05),
        order.get("delivery_lng", 72.85),
    )

    hour = now.hour
    is_rush = 1 if hour in range(8, 11) or hour in range(17, 21) else 0

    # Use real Mapbox traffic factor if provided, else time-based fallback
    if traffic_factor is not None:
        tf = traffic_factor
    elif is_rush:
        tf = random.uniform(1.2, 2.0)
    else:
        tf = random.uniform(0.3, 1.0)

    features = [
        distance,                                          # distance_km
        order.get("weight", 1.0),                         # weight_kg
        PRIORITY_MAP.get(order.get("priority", "medium"), 1),  # priority_encoded
        hour,                                              # hour_of_day
        now.weekday(),                                     # day_of_week
        tf,                                                # traffic_factor (live or estimated)
        order.get("weather_score", random.uniform(0.0, 0.4)),  # weather_score
        order.get("driver_experience_days", 180),          # driver_experience_days
        is_rush,                                           # is_rush_hour
        random.uniform(0.2, 1.0),                         # zone_density
    ]

    return np.array([features])


async def predict_single_live(order: dict) -> dict:
    """
    Predict delay risk using live Mapbox traffic data for the feature vector.
    Falls back to predict_single() if Mapbox unavailable.
    """
    try:
        from app.services.mapbox_service import get_traffic_factor
        tf = await get_traffic_factor(
            order.get("delivery_lat", 19.076),
            order.get("delivery_lng", 72.8777),
        )
        return predict_single(order, traffic_factor=tf)
    except Exception:
        return predict_single(order)


def predict_single(order: dict, traffic_factor: float = None) -> dict:
    """
    Predict delay risk for a single order.

    Returns:
        dict with risk_level, delay_probability, estimated_delay_minutes, factors
    """
    if _classifier is None or _regressor is None:
        # Fallback: generate synthetic prediction if models not trained yet
        return _synthetic_prediction(order)

    features = _extract_features(order, traffic_factor=traffic_factor)

    # Classifier: probability of delay
    delay_proba = float(_classifier.predict_proba(features)[0][1])

    # Regressor: estimated delay in minutes
    delay_minutes = max(0, float(_regressor.predict(features)[0]))

    # Risk level
    if delay_proba >= RISK_THRESHOLDS["HIGH"]:
        risk_level = "HIGH"
    elif delay_proba >= RISK_THRESHOLDS["MEDIUM"]:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # SHAP explainability
    factors = []
    if _explainer is not None:
        try:
            shap_values = _explainer.shap_values(features)
            if isinstance(shap_values, list):
                sv = shap_values[1][0]  # class 1 (delay)
            else:
                sv = shap_values[0]

            factor_pairs = list(zip(FEATURE_NAMES, sv))
            factor_pairs.sort(key=lambda x: abs(x[1]), reverse=True)

            for name, value in factor_pairs[:5]:
                factors.append({
                    "feature": name,
                    "impact": round(float(value), 4),
                    "direction": "increases_risk" if value > 0 else "decreases_risk",
                })
        except Exception:
            factors = _default_factors(order)
    else:
        factors = _default_factors(order)

    return {
        "risk_level": risk_level,
        "delay_probability": round(delay_proba, 3),
        "estimated_delay_minutes": round(delay_minutes, 1),
        "factors": factors,
    }


def predict_batch(orders: list[dict]) -> list[dict]:
    """Predict delay risk for multiple orders."""
    return [predict_single(o) for o in orders]


def _synthetic_prediction(order: dict) -> dict:
    """Generate a plausible synthetic prediction when models aren't trained."""
    distance = _haversine_km(
        order.get("pickup_lat", 19.076),
        order.get("pickup_lng", 72.8777),
        order.get("delivery_lat", 19.05),
        order.get("delivery_lng", 72.85),
    )
    from datetime import datetime
    hour = datetime.now().hour
    is_rush = hour in range(8, 11) or hour in range(17, 21)

    # Heuristic based on distance + rush hour + priority
    base_risk = min(0.9, 0.15 + distance * 0.03 + (0.25 if is_rush else 0))
    priority = order.get("priority", "medium")
    if priority == "high":
        base_risk += 0.1
    elif priority == "low":
        base_risk -= 0.05

    delay_proba = round(min(0.95, max(0.05, base_risk + random.uniform(-0.1, 0.1))), 3)
    delay_min = round(max(0, distance * 2.5 + (15 if is_rush else 3) + random.uniform(-5, 10)), 1)

    if delay_proba >= RISK_THRESHOLDS["HIGH"]:
        risk_level = "HIGH"
    elif delay_proba >= RISK_THRESHOLDS["MEDIUM"]:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "delay_probability": delay_proba,
        "estimated_delay_minutes": delay_min,
        "factors": _default_factors(order),
    }


def _default_factors(order: dict) -> list[dict]:
    """Generate plausible factor explanations."""
    from datetime import datetime
    hour = datetime.now().hour
    is_rush = hour in range(8, 11) or hour in range(17, 21)

    factors = [
        {"feature": "traffic_factor", "impact": 0.35 if is_rush else 0.08, "direction": "increases_risk"},
        {"feature": "distance_km", "impact": 0.22, "direction": "increases_risk"},
        {"feature": "hour_of_day", "impact": 0.18 if is_rush else -0.05, "direction": "increases_risk" if is_rush else "decreases_risk"},
        {"feature": "zone_density", "impact": 0.12, "direction": "increases_risk"},
        {"feature": "driver_experience_days", "impact": -0.15, "direction": "decreases_risk"},
    ]
    return factors
