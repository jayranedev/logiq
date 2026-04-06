import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import demo, drivers, orders, predictions, routes
from app.api.websocket import redis_subscriber, router as ws_router
from app.api import ecoscore, ghost_route, analytics, parcels, warehouse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Load ML models ────────────────────────────────────────────────────
    from app.services.prediction_service import load_models
    load_models()

    # ── Start Redis subscriber ────────────────────────────────────────────
    redis_task = asyncio.create_task(redis_subscriber())

    # ── Start GhostRoute™ background worker ───────────────────────────────
    from app.services.ghost_route_service import ghost_route_worker
    ghost_task = asyncio.create_task(ghost_route_worker())

    # ── Start Delay Monitor ────────────────────────────────────────────────
    from app.services.delay_monitor import delay_monitor_worker
    delay_task = asyncio.create_task(delay_monitor_worker())

    print("[LOGIQ.AI] All background services started ✓")
    yield

    # Cleanup
    for task in (redis_task, ghost_task, delay_task):
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="LOGIQ.AI Backend",
    description="Smart Logistics Optimization Platform — GhostRoute™ · SwarmBatch™ · EcoScore™",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core routers ──────────────────────────────────────────────────────────────
app.include_router(drivers.router)
app.include_router(orders.router)
app.include_router(routes.router)
app.include_router(predictions.router)
app.include_router(demo.router)

# ── Unique feature routers ────────────────────────────────────────────────────
app.include_router(ecoscore.router)
app.include_router(ghost_route.router)
app.include_router(analytics.router)
app.include_router(parcels.router)
app.include_router(warehouse.router)

# ── WebSocket ─────────────────────────────────────────────────────────────────
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "features": ["GhostRoute™", "SwarmBatch™", "EcoScore™"],
        "ml": "XGBoost loaded",
    }
