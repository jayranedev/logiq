"""add parcel warehouse fields to orders

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("qr_code", sa.String(64), nullable=True))
    op.add_column("orders", sa.Column("barcode", sa.String(128), nullable=True))
    op.add_column("orders", sa.Column("warehouse_zone", sa.String(64), nullable=True))
    op.add_column("orders", sa.Column("is_sorted", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("orders", sa.Column("bag_scanned", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("orders", sa.Column("bag_scanned_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_orders_qr_code", "orders", ["qr_code"])
    op.create_index("ix_orders_qr_code", "orders", ["qr_code"])


def downgrade() -> None:
    op.drop_index("ix_orders_qr_code", "orders")
    op.drop_constraint("uq_orders_qr_code", "orders")
    op.drop_column("orders", "bag_scanned_at")
    op.drop_column("orders", "bag_scanned")
    op.drop_column("orders", "is_sorted")
    op.drop_column("orders", "warehouse_zone")
    op.drop_column("orders", "barcode")
    op.drop_column("orders", "qr_code")
