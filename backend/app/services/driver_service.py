from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverStatus
from app.schemas.driver import DriverCreate, DriverPatch


async def get_drivers(
    db: AsyncSession, status: Optional[DriverStatus] = None
) -> List[Driver]:
    q = select(Driver)
    if status:
        q = q.where(Driver.status == status)
    result = await db.execute(q)
    return result.scalars().all()


async def get_driver(db: AsyncSession, driver_id: int) -> Optional[Driver]:
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    return result.scalar_one_or_none()


async def create_driver(db: AsyncSession, data: DriverCreate) -> Driver:
    driver = Driver(**data.model_dump())
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver


async def patch_driver(
    db: AsyncSession, driver: Driver, data: DriverPatch
) -> Driver:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(driver, field, value)
    await db.commit()
    await db.refresh(driver)
    return driver
