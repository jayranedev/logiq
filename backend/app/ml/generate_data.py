"""
Synthetic delivery history data generator.

Generates 15,000 realistic delivery records with features
suitable for training a delay prediction model.
"""
import csv
import math
import os
import random
from datetime import datetime, timedelta

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


def haversine_km(lat1, lng1, lat2, lng2):
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


def generate_dataset(n_records: int = 15000, output_path: str = None):
    """Generate synthetic delivery history dataset."""
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "delivery_history.csv")

    records = []
    base_date = datetime(2024, 1, 1)

    for i in range(n_records):
        # Random pickup / delivery
        pickup = random.choice(MUMBAI_LOCATIONS)
        delivery = random.choice([l for l in MUMBAI_LOCATIONS if l != pickup])

        distance = haversine_km(pickup["lat"], pickup["lng"], delivery["lat"], delivery["lng"])

        # Time features
        day_offset = random.randint(0, 180)
        hour = random.choices(
            range(24),
            weights=[1, 1, 1, 1, 1, 2, 3, 5, 8, 7, 6, 5, 5, 5, 5, 5, 6, 7, 8, 7, 5, 3, 2, 1],
            k=1,
        )[0]
        order_dt = base_date + timedelta(days=day_offset, hours=hour, minutes=random.randint(0, 59))
        day_of_week = order_dt.weekday()
        is_rush_hour = 1 if hour in range(8, 11) or hour in range(17, 21) else 0
        is_weekend = 1 if day_of_week >= 5 else 0

        # Order features
        priority = random.choices(["low", "medium", "high"], weights=[3, 5, 2], k=1)[0]
        priority_encoded = {"low": 0, "medium": 1, "high": 2}[priority]
        weight = round(random.uniform(0.5, 15.0), 1)

        # Environmental features
        weather_score = round(random.uniform(0, 1), 2)  # 0=clear, 1=heavy rain
        traffic_factor = round(
            random.gauss(1.5 if is_rush_hour else 0.8, 0.3 if is_rush_hour else 0.15),
            2,
        )
        traffic_factor = max(0.3, min(3.0, traffic_factor))
        zone_density = round(random.uniform(0.1, 1.0), 2)

        # Driver features
        driver_experience_days = random.choices(
            [30, 90, 180, 365, 730],
            weights=[2, 3, 3, 4, 2],
            k=1,
        )[0] + random.randint(-10, 10)

        # TARGET: delay logic (realistic rules)
        delay_score = (
            distance * 0.025
            + traffic_factor * 0.15
            + weather_score * 0.10
            + (0.12 if is_rush_hour else 0)
            + weight * 0.003
            - min(driver_experience_days / 600, 0.40)
            + zone_density * 0.06
            + (0.02 if is_weekend else 0)
            + random.gauss(0, 0.15)
        )

        is_delayed = 1 if delay_score > 0.35 else 0
        delay_minutes = round(max(0, delay_score * 50 + random.gauss(0, 10)), 1) if is_delayed else 0

        records.append({
            "distance_km": round(distance, 2),
            "weight_kg": weight,
            "priority_encoded": priority_encoded,
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "traffic_factor": traffic_factor,
            "weather_score": weather_score,
            "driver_experience_days": driver_experience_days,
            "is_rush_hour": is_rush_hour,
            "zone_density": zone_density,
            "is_delayed": is_delayed,
            "delay_minutes": delay_minutes,
        })

    # Write CSV
    fieldnames = list(records[0].keys())
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    delayed_count = sum(1 for r in records if r["is_delayed"] == 1)
    print(f"Generated {n_records} records → {output_path}")
    print(f"  Delayed: {delayed_count} ({delayed_count / n_records * 100:.1f}%)")
    print(f"  On-time: {n_records - delayed_count} ({(n_records - delayed_count) / n_records * 100:.1f}%)")

    return output_path


if __name__ == "__main__":
    generate_dataset()
