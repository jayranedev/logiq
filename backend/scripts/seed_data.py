"""Seed 6 drivers and 20 orders into the database.

Idempotent: clears existing data before seeding to avoid duplicates.
"""
import asyncio
import random
import sys

sys.path.insert(0, "/app")

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderPriority, OrderStatus

# Mumbai delivery zones — each zone is a cluster of nearby locations
ZONES = {
    "North": [
        {"name": "Borivali", "lat": 19.2288, "lng": 72.8580},
        {"name": "Malad", "lat": 19.1872, "lng": 72.8484},
        {"name": "Goregaon", "lat": 19.1663, "lng": 72.8526},
    ],
    "Central-West": [
        {"name": "Andheri East", "lat": 19.1136, "lng": 72.8697},
        {"name": "Juhu", "lat": 19.0948, "lng": 72.8258},
        {"name": "Bandra West", "lat": 19.0596, "lng": 72.8295},
    ],
    "Central-East": [
        {"name": "Kurla", "lat": 19.0728, "lng": 72.8826},
        {"name": "Powai", "lat": 19.1176, "lng": 72.9060},
        {"name": "Chembur", "lat": 19.0522, "lng": 72.9005},
    ],
    "South-Central": [
        {"name": "Dadar", "lat": 19.0178, "lng": 72.8478},
        {"name": "Worli", "lat": 19.0130, "lng": 72.8153},
    ],
    "South": [
        {"name": "Fort", "lat": 18.9322, "lng": 72.8351},
        {"name": "Colaba", "lat": 18.9067, "lng": 72.8147},
    ],
    "Navi Mumbai": [
        {"name": "Thane", "lat": 19.2183, "lng": 72.9781},
        {"name": "Navi Mumbai", "lat": 19.0330, "lng": 73.0297},
    ],
}

ALL_LOCATIONS = [loc for locs in ZONES.values() for loc in locs]

# Warehouse (depot) location — central Mumbai
WAREHOUSE = {"name": "Warehouse (Andheri)", "lat": 19.1136, "lng": 72.8697}

DRIVERS = [
    {"name": "Raju Sharma", "phone": "9876543210", "vehicle_type": "bike", "capacity": 15.0, "zone": "Central-West"},
    {"name": "Amit Patil", "phone": "9876543211", "vehicle_type": "bike", "capacity": 15.0, "zone": "Central-East"},
    {"name": "Suresh Kumar", "phone": "9876543212", "vehicle_type": "scooter", "capacity": 20.0, "zone": "North"},
    {"name": "Vikram Singh", "phone": "9876543213", "vehicle_type": "van", "capacity": 100.0, "zone": "South"},
    {"name": "Deepak Nair", "phone": "9876543214", "vehicle_type": "scooter", "capacity": 20.0, "zone": "South-Central"},
    {"name": "Rahul Gupta", "phone": "9876543215", "vehicle_type": "bike", "capacity": 15.0, "zone": "Navi Mumbai"},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # Clear existing data (idempotent seeding) — CASCADE handles FK deps
        await session.execute(text("TRUNCATE TABLE orders, routes, drivers RESTART IDENTITY CASCADE"))
        await session.commit()
        print("  Cleared existing data.")

        # Seed drivers at their zone start locations
        for i, d in enumerate(DRIVERS):
            zone_locs = ZONES[d["zone"]]
            start_loc = zone_locs[0]  # Driver starts at first location in their zone
            driver = Driver(
                name=d["name"],
                phone=d["phone"],
                vehicle_type=d["vehicle_type"],
                capacity=d["capacity"],
                status=DriverStatus.available,
                current_lat=start_loc["lat"],
                current_lng=start_loc["lng"],
            )
            session.add(driver)

        await session.flush()

        # Seed 150 orders distributed across zones
        # Each order picks up from warehouse and delivers to a zone location
        zone_names = list(ZONES.keys())
        for i in range(150):
            # Distribute orders roughly evenly across zones
            zone = zone_names[i % len(zone_names)]
            delivery = random.choice(ZONES[zone])

            # Add slight randomness to exact delivery location
            dlat = delivery["lat"] + random.uniform(-0.003, 0.003)
            dlng = delivery["lng"] + random.uniform(-0.003, 0.003)

            order = Order(
                customer_name=f"Customer {i + 1}",
                customer_phone=f"98765{43200 + i:05d}",
                pickup_lat=WAREHOUSE["lat"] + random.uniform(-0.002, 0.002),
                pickup_lng=WAREHOUSE["lng"] + random.uniform(-0.002, 0.002),
                delivery_lat=dlat,
                delivery_lng=dlng,
                address=f"{delivery['name']}, Mumbai",
                status=OrderStatus.pending,
                priority=random.choice(list(OrderPriority)),
                weight=round(random.uniform(0.5, 10.0), 1),
            )
            session.add(order)

        await session.commit()
        print("Seeded 6 drivers and 20 orders (clean DB).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
