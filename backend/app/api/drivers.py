from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.driver import DriverStatus
from app.schemas.driver import DriverCreate, DriverOut, DriverPatch
from app.services import driver_service

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("", response_model=List[DriverOut])
async def list_drivers(
    status: Optional[DriverStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.get_drivers(db, status=status)


@router.get("/{driver_id}", response_model=DriverOut)
async def get_driver(driver_id: int, db: AsyncSession = Depends(get_db)):
    driver = await driver_service.get_driver(db, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.post("", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
async def create_driver(data: DriverCreate, db: AsyncSession = Depends(get_db)):
    return await driver_service.create_driver(db, data)


@router.patch("/{driver_id}", response_model=DriverOut)
async def patch_driver(
    driver_id: int, data: DriverPatch, db: AsyncSession = Depends(get_db)
):
    driver = await driver_service.get_driver(db, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return await driver_service.patch_driver(db, driver, data)
