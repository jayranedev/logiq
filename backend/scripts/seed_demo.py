"""
Phase 4 Final Demo Seed Script
================================
Seeds the database with:
  - 6 drivers (3 busy/active, 3 available)
  - 50 orders across Mumbai zones:
      ~15 delivered, ~10 in_transit, ~10 assigned, ~15 pending
  - 3 active routes with waypoints

Run with:
  docker-compose exec backend python scripts/seed_demo.py
"""
import asyncio
import random
import sys

sys.path.insert(0, "/app")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.models.driver import Driver, DriverStatus
from app.models.order import Order, OrderPriority, OrderStatus
from app.models.route import Route, RouteStatus

# ─── Locations ───────────────────────────────────────────────────────────────

ZONES = {
    "North": [
        ("Borivali Market", 19.2288, 72.8580),
        ("Malad West", 19.1872, 72.8484),
        ("Kandivali East", 19.2050, 72.8556),
        ("Goregaon East", 19.1663, 72.8526),
        ("Dahisar", 19.2520, 72.8566),
    ],
    "Central-West": [
        ("Andheri East", 19.1136, 72.8697),
        ("Juhu Beach", 19.0948, 72.8258),
        ("Bandra West", 19.0596, 72.8295),
        ("Santacruz East", 19.0822, 72.8441),
        ("Vile Parle", 19.0990, 72.8390),
    ],
    "Central-East": [
        ("Kurla Station", 19.0728, 72.8826),
        ("Powai Lake", 19.1176, 72.9060),
        ("Chembur", 19.0522, 72.9005),
        ("Ghatkopar", 19.0860, 72.9081),
        ("Vikhroli", 19.1042, 72.9238),
    ],
    "South-Central": [
        ("Dadar TT", 19.0178, 72.8478),
        ("Worli Sea Face", 19.0130, 72.8153),
        ("Prabhadevi", 19.0125, 72.8297),
        ("Lower Parel", 18.9960, 72.8330),
    ],
    "South": [
        ("Fort", 18.9322, 72.8351),
        ("Colaba", 18.9067, 72.8147),
        ("Marine Lines", 18.9432, 72.8231),
        ("Churchgate", 18.9355, 72.8274),
    ],
    "Navi Mumbai": [
        ("Vashi", 19.0771, 73.0063),
        ("Thane West", 19.2183, 72.9781),
        ("Belapur", 19.0234, 73.0394),
        ("Airoli", 19.1548, 72.9991),
    ],
}

WAREHOUSE = (19.1136, 72.8697)  # Andheri Hub

CUSTOMER_NAMES = [
    "Priya Sharma", "Rohan Mehta", "Ananya Patel", "Vivek Desai",
    "Sneha Iyer", "Arjun Nair", "Kavita Singh", "Manish Joshi",
    "Pooja Kulkarni", "Sachin Verma", "Neha Gupta", "Aditya Rao",
    "Sunita Pillai", "Rajesh Bhatt", "Divya Chatterjee", "Nikhil Malhotra",
    "Smita Reddy", "Kiran Bose", "Amit Tiwari", "Reshma Ali",
    "Deepa Mukherjee", "Sunil Kaur", "Meena Fernandez", "Prakash Shah",
    "Varsha Nambiar", "Gaurav Hegde", "Anita Chaudhary", "Ravi Kumar",
    "Shalini Ahuja", "Mohan Jain", "Lalita Menon", "Vinod Saxena",
    "Nandita Roy", "Kunal Pandey", "Preeti Bansal", "Sanjay Das",
    "Usha Bhattacharya", "Chetan Dubey", "Asha Shetty", "Tarun Mishra",
    "Geeta Mathur", "Rakesh Tripathi", "Leela Iyengar", "Suresh Malviya",
    "Hemlata Dixit", "Ajay Murthy", "Rekha Srinivasan", "Vijay Thakkar",
    "Madhuri Deshpande", "Naresh Choudhary",
]

DRIVERS_DATA = [
    ("Raju Sharma",   "9876543210", "bike",   15.0, "Central-West", 19.0596, 72.8295, "busy"),
    ("Amit Patil",    "9876543211", "bike",   15.0, "Central-East", 19.0728, 72.8826, "busy"),
    ("Suresh Kumar",  "9876543212", "scooter",20.0, "North",        19.2288, 72.8580, "busy"),
    ("Vikram Singh",  "9876543213", "van",   100.0, "South",        18.9322, 72.8351, "available"),
    ("Deepak Nair",   "9876543214", "scooter",20.0, "South-Central",19.0178, 72.8478, "available"),
    ("Rahul Gupta",   "9876543215", "bike",   15.0, "Navi Mumbai",  19.0771, 73.0063, "available"),
]


def rand_near(lat, lng, delta=0.005):
    return lat + random.uniform(-delta, delta), lng + random.uniform(-delta, delta)


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # ── Wipe & restart ──────────────────────────────────────────────────
        await session.execute(text(
            "TRUNCATE TABLE events, orders, routes, drivers RESTART IDENTITY CASCADE"
        ))
        await session.commit()
        print("  Cleared existing data.")

        # ── Seed drivers ────────────────────────────────────────────────────
        driver_ids = []
        for (name, phone, vehicle, cap, zone, lat, lng, status) in DRIVERS_DATA:
            d = Driver(
                name=name, phone=phone, vehicle_type=vehicle, capacity=cap,
                status=DriverStatus(status), current_lat=lat, current_lng=lng,
            )
            session.add(d)
            await session.flush()
            driver_ids.append(d.id)
            print(f"  Driver: {name} ({status})")

        # ── Build 50 orders ─────────────────────────────────────────────────
        all_locations = [(name, lat, lng) for locs in ZONES.values() for (name, lat, lng) in locs]

        status_mix = (
            [OrderStatus.delivered] * 15 +
            [OrderStatus.in_transit] * 10 +
            [OrderStatus.assigned] * 10 +
            [OrderStatus.pending] * 15
        )
        random.shuffle(status_mix)

        priority_mix = (
            [OrderPriority.high] * 12 +
            [OrderPriority.medium] * 22 +
            [OrderPriority.low] * 16
        )
        random.shuffle(priority_mix)

        orders = []
        for i in range(50):
            loc_name, dlat, dlng = random.choice(all_locations)
            dlat, dlng = rand_near(dlat, dlng, 0.004)
            plat, plng = rand_near(*WAREHOUSE, 0.003)

            st = status_mix[i]
            pr = priority_mix[i]

            # Assign drivers to non-pending orders
            d_id = None
            if st in (OrderStatus.assigned, OrderStatus.in_transit, OrderStatus.delivered):
                d_id = random.choice(driver_ids[:3])  # busy drivers get the active orders

            o = Order(
                customer_name=CUSTOMER_NAMES[i],
                customer_phone=f"98765{43200 + i:05d}",
                pickup_lat=plat, pickup_lng=plng,
                delivery_lat=dlat, delivery_lng=dlng,
                address=f"{loc_name}, Mumbai",
                status=st,
                priority=pr,
                weight=round(random.uniform(0.3, 12.0), 1),
                driver_id=d_id,
            )
            session.add(o)
            orders.append(o)

        await session.flush()
        print(f"  Seeded 50 orders.")

        # ── Seed 3 active routes (for busy drivers) ─────────────────────────
        for idx, d_id in enumerate(driver_ids[:3]):
            # Pick 4-6 in_transit or assigned orders for this driver
            driver_orders = [
                o for o in orders
                if o.driver_id == d_id and o.status in (OrderStatus.in_transit, OrderStatus.assigned)
            ][:6]

            if len(driver_orders) < 2:
                continue

            waypoints = [
                {"lat": o.delivery_lat, "lng": o.delivery_lng, "order_id": o.id}
                for o in driver_orders
            ]

            # Rough distance: sum of haversine between consecutive points
            import math
            def hav(lat1, lng1, lat2, lng2):
                R = 6371
                dLat = math.radians(lat2 - lat1)
                dLng = math.radians(lng2 - lng1)
                a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng/2)**2
                return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            total_km = 0.0
            prev = (WAREHOUSE[0], WAREHOUSE[1])
            for wp in waypoints:
                total_km += hav(prev[0], prev[1], wp["lat"], wp["lng"])
                prev = (wp["lat"], wp["lng"])

            route = Route(
                driver_id=d_id,
                status=RouteStatus.active,
                total_distance=round(total_km, 2),
                estimated_time=round(total_km / 25 * 60, 1),
                waypoints=waypoints,
            )
            session.add(route)
            await session.flush()

            # Link orders to this route
            for o in driver_orders:
                o.route_id = route.id

            print(f"  Route for driver #{d_id}: {len(driver_orders)} stops, {total_km:.1f} km")

        await session.commit()
        print("\nPhase 4 demo seed complete!")
        print("  6 drivers | 50 orders (15 delivered, 10 in-transit, 10 assigned, 15 pending) | 3 routes")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
