"""
EcoScore™ API endpoints
GET  /api/ecoscore/route/{route_id}   → single route carbon score
POST /api/ecoscore/calculate          → score any route on the fly
GET  /api/ecoscore/fleet/summary      → monthly fleet CO2 summary
GET  /api/ecoscore/live               → live carbon meter (all active routes)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.driver import Driver
from app.models.route import Route, RouteStatus
from app.services.ecoscore_service import co2_for_route, eco_score, fleet_monthly_summary

router = APIRouter(prefix="/api/ecoscore", tags=["ecoscore"])


class EcoCalculateRequest(BaseModel):
    distance_km: float
    vehicle_type: str = "bike"
    total_weight_kg: float = 5.0
    vehicle_capacity_kg: float = 20.0


@router.get("/route/{route_id}")
async def get_route_ecoscore(route_id: int, db: AsyncSession = Depends(get_db)):
    """Carbon score for a stored route."""
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    # Get driver vehicle type
    vehicle_type = "scooter"
    if route.driver_id:
        dr = await db.execute(select(Driver).where(Driver.id == route.driver_id))
        driver = dr.scalar_one_or_none()
        if driver:
            vehicle_type = driver.vehicle_type or "scooter"

    dist = route.total_distance or 0
    score = eco_score(dist, vehicle_type)
    return {
        "route_id": route_id,
        "driver_id": route.driver_id,
        "distance_km": dist,
        "vehicle_type": vehicle_type,
        **score,
    }


@router.post("/calculate")
async def calculate_ecoscore(req: EcoCalculateRequest):
    """Calculate EcoScore™ for any route without storing it."""
    score = eco_score(req.distance_km, req.vehicle_type, req.total_weight_kg, req.vehicle_capacity_kg)
    return {"distance_km": req.distance_km, "vehicle_type": req.vehicle_type, **score}


@router.get("/fleet/summary")
async def fleet_summary(db: AsyncSession = Depends(get_db)):
    """Monthly fleet CO2 aggregation across all completed routes."""
    routes_result = await db.execute(select(Route))
    routes = routes_result.scalars().all()
    drivers_result = await db.execute(select(Driver))
    drivers = drivers_result.scalars().all()

    route_dicts = [{"id": r.id, "driver_id": r.driver_id, "total_distance": r.total_distance or 0} for r in routes]
    driver_dicts = [{"id": d.id, "vehicle_type": d.vehicle_type or "scooter", "capacity": d.capacity or 20.0} for d in drivers]

    summary = fleet_monthly_summary(route_dicts, driver_dicts)
    return summary


@router.get("/live")
async def live_carbon_meter(db: AsyncSession = Depends(get_db)):
    """Real-time carbon meter for all active routes on the dashboard."""
    result = await db.execute(
        select(Route).where(Route.status == RouteStatus.active)
    )
    active_routes = result.scalars().all()
    drivers_result = await db.execute(select(Driver))
    drivers = drivers_result.scalars().all()
    driver_map = {d.id: d for d in drivers}

    live_data = []
    total_co2 = 0.0

    for route in active_routes:
        driver = driver_map.get(route.driver_id)
        vtype = driver.vehicle_type if driver else "scooter"
        dist = route.total_distance or 0
        score = eco_score(dist, vtype)
        total_co2 += score["co2_kg"]

        live_data.append({
            "route_id": route.id,
            "driver_id": route.driver_id,
            "driver_name": driver.name if driver else "Unknown",
            "vehicle_type": vtype,
            "distance_km": dist,
            "co2_kg": score["co2_kg"],
            "eco_grade": score["eco_grade"],
        })

    return {
        "active_routes": len(active_routes),
        "total_co2_kg": round(total_co2, 3),
        "routes": live_data,
    }
