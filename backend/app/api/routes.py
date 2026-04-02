from fastapi import APIRouter

router = APIRouter(prefix="/api/routes", tags=["routes"])

# Phase 2: OR-Tools CVRP optimizer will be implemented here
# POST /api/routes/optimize
# POST /api/orders/batch
