"""add warehouse fields to drivers

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("drivers", sa.Column("home_warehouse", sa.String(64), nullable=True))
    op.add_column("drivers", sa.Column("home_lat", sa.Float(), nullable=True))
    op.add_column("drivers", sa.Column("home_lng", sa.Float(), nullable=True))
    op.add_column("drivers", sa.Column("pin_code", sa.String(6), nullable=True))


def downgrade() -> None:
    op.drop_column("drivers", "pin_code")
    op.drop_column("drivers", "home_lng")
    op.drop_column("drivers", "home_lat")
    op.drop_column("drivers", "home_warehouse")
