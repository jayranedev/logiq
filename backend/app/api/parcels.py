"""
Parcels API — LOGIQ.AI
======================
Endpoints for the full warehouse-to-door parcel lifecycle.
"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.order import OrderOut, ParcelScanCreate
from app.services import parcel_service

router = APIRouter(prefix="/api/parcels", tags=["parcels"])


# ── 1. Register one parcel (warehouse intake QR scan) ─────────────────────────
@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def register_parcel(data: ParcelScanCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new parcel in the system.
    Auto-generates QR code and assigns warehouse zone.
    """
    return await parcel_service.register_parcel(db, data)


# ── 2. Look up parcel by QR code ──────────────────────────────────────────────
@router.get("/scan/{qr_code}", response_model=OrderOut)
async def lookup_by_qr(qr_code: str, db: AsyncSession = Depends(get_db)):
    """Driver scans QR to see parcel info before bag-loading."""
    order = await parcel_service.get_order_by_qr(db, qr_code)
    if not order:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return order


# ── 3. Confirm bag scan (driver loads parcel into bag/truck) ──────────────────
@router.post("/scan/{qr_code}/confirm")
async def confirm_bag_scan(
    qr_code: str,
    driver_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a parcel as loaded into driver's bag.
    Updates status pending→picked_up and records timestamp.
    """
    order = await parcel_service.confirm_bag_scan(db, qr_code, driver_id)
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Parcel not found or assigned to a different driver",
        )
    return {"ok": True, "order_id": order.id, "status": order.status, "zone": order.warehouse_zone}


# ── 4. Bulk CSV/Excel import ──────────────────────────────────────────────────
@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a CSV file with parcel details.
    Required columns: customer_name, customer_phone, address, delivery_lat, delivery_lng
    Optional: weight, priority (low/medium/high), barcode
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        csv_text = content.decode("utf-8-sig")  # handles Excel BOM
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")

    created = await parcel_service.bulk_import_csv(db, csv_text)

    return {
        "imported": len(created),
        "orders": [{"id": o.id, "qr_code": o.qr_code, "zone": o.warehouse_zone} for o in created],
    }


# ── 5. Auto-sort all unsorted parcels into zones ──────────────────────────────
@router.post("/sort")
async def auto_sort(db: AsyncSession = Depends(get_db)):
    """
    One-click: assign warehouse zones and drivers to all pending unsorted parcels.
    Returns breakdown of parcels per zone.
    """
    summary = await parcel_service.auto_sort_parcels(db)
    total = sum(summary.values())
    return {
        "sorted": total,
        "zones": [{"zone": k, "count": v} for k, v in sorted(summary.items())],
    }


# ── 6. Assign + optimize routes after bags are loaded ─────────────────────────
@router.post("/assign-routes/{driver_id}")
async def assign_driver_route(driver_id: int, db: AsyncSession = Depends(get_db)):
    """
    After a driver finishes scanning their bag, call this to:
      1. Run TSP on all scanned orders
      2. Create/replace active route in DB
      3. Set all orders to in_transit
    """
    route = await parcel_service.assign_routes_for_driver(db, driver_id)
    if not route:
        raise HTTPException(
            status_code=400,
            detail="No scanned parcels found for this driver",
        )

    # Broadcast route_optimized event
    from app.services.realtime_service import publish_event
    import asyncio
    asyncio.create_task(publish_event("route_optimized", {
        "driver_id": driver_id,
        "route_id": route.id,
        "stops": len(route.waypoints or []),
        "distance_km": route.total_distance,
        "message": f"Route optimized — {len(route.waypoints or [])} stops, {route.total_distance} km",
    }))

    return {
        "route_id": route.id,
        "driver_id": driver_id,
        "stops": len(route.waypoints or []),
        "total_distance_km": route.total_distance,
        "estimated_time_min": route.estimated_time,
        "waypoints": route.waypoints,
    }


# ── 7. Unsorted count (for dashboard badge) ───────────────────────────────────
@router.get("/unsorted-count")
async def unsorted_count(db: AsyncSession = Depends(get_db)):
    count = await parcel_service.get_unsorted_count(db)
    return {"count": count}
