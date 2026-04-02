import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import drivers, orders, predictions, routes
from app.api.websocket import redis_subscriber, router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Redis subscriber in the background
    task = asyncio.create_task(redis_subscriber())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="LOGIQ.AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router)
app.include_router(orders.router)
app.include_router(routes.router)
app.include_router(predictions.router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
