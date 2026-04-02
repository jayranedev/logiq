"""Seed 6 drivers and 20 orders into the database."""
import asyncio
import random
import sys

sys.path.insert(0, "/app")

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderPriority, OrderStatus

MUMBAI_LOCATIONS = [
    {"name": "Bandra West", "lat": 19.0596, "lng": 72.8295},
    {"name": "Andheri East", "lat": 19.1136, "lng": 72.8697},
    {"name": "Juhu", "lat": 19.0948, "lng": 72.8258},
    {"name": "Dadar", "lat": 19.0178, "lng": 72.8478},
    {"name": "Worli", "lat": 19.0130, "lng": 72.8153},
    {"name": "Kurla", "lat": 19.0728, "lng": 72.8826},
    {"name": "Powai", "lat": 19.1176, "lng": 72.9060},
    {"name": "Malad", "lat": 19.1872, "lng": 72.8484},
    {"name": "Borivali", "lat": 19.2288, "lng": 72.8580},
    {"name": "Chembur", "lat": 19.0522, "lng": 72.9005},
    {"name": "Colaba", "lat": 18.9067, "lng": 72.8147},
    {"name": "Fort", "lat": 18.9322, "lng": 72.8351},
    {"name": "Goregaon", "lat": 19.1663, "lng": 72.8526},
    {"name": "Thane", "lat": 19.2183, "lng": 72.9781},
    {"name": "Navi Mumbai", "lat": 19.0330, "lng": 73.0297},
]

DRIVERS = [
    {"name": "Raju Sharma", "phone": "9876543210", "vehicle_type": "bike", "capacity": 15.0},
    {"name": "Amit Patil", "phone": "9876543211", "vehicle_type": "bike", "capacity": 15.0},
    {"name": "Suresh Kumar", "phone": "9876543212", "vehicle_type": "scooter", "capacity": 20.0},
    {"name": "Vikram Singh", "phone": "9876543213", "vehicle_type": "van", "capacity": 100.0},
    {"name": "Deepak Nair", "phone": "9876543214", "vehicle_type": "scooter", "capacity": 20.0},
    {"name": "Rahul Gupta", "phone": "9876543215", "vehicle_type": "bike", "capacity": 15.0},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # Seed drivers
        drivers = []
        for i, d in enumerate(DRIVERS):
            loc = MUMBAI_LOCATIONS[i]
            driver = Driver(
                **d,
                status=DriverStatus.available,
                current_lat=loc["lat"],
                current_lng=loc["lng"],
            )
            session.add(driver)
            drivers.append(driver)

        await session.flush()

        # Seed orders
        for i in range(20):
            pickup = random.choice(MUMBAI_LOCATIONS)
            delivery = random.choice([l for l in MUMBAI_LOCATIONS if l != pickup])
            order = Order(
                customer_name=f"Customer {i + 1}",
                customer_phone=f"98765{43200 + i:05d}",
                pickup_lat=pickup["lat"] + random.uniform(-0.005, 0.005),
                pickup_lng=pickup["lng"] + random.uniform(-0.005, 0.005),
                delivery_lat=delivery["lat"] + random.uniform(-0.005, 0.005),
                delivery_lng=delivery["lng"] + random.uniform(-0.005, 0.005),
                address=f"{delivery['name']}, Mumbai",
                status=OrderStatus.pending,
                priority=random.choice(list(OrderPriority)),
                weight=round(random.uniform(0.5, 10.0), 1),
            )
            session.add(order)

        await session.commit()
        print("Seeded 6 drivers and 20 orders.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
