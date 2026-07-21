"""add indexes to analysis jobs

Revision ID: add_indexes
Revises: 27d246916587
Create Date: 2026-07-20 17:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_indexes'
down_revision: Union[str, None] = '27d246916587'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add composite indexes for better query performance
    op.create_index(
        'ix_analysis_jobs_user_status_created',
        'analysis_jobs',
        ['user_id', 'status', 'created_at']
    )
    op.create_index(
        'ix_analysis_jobs_status_created',
        'analysis_jobs',
        ['status', 'created_at']
    )
    # Add index on status column
    op.create_index('ix_analysis_jobs_status', 'analysis_jobs', ['status'])


def downgrade() -> None:
    op.drop_index('ix_analysis_jobs_status', table_name='analysis_jobs')
    op.drop_index('ix_analysis_jobs_status_created', table_name='analysis_jobs')
    op.drop_index('ix_analysis_jobs_user_status_created', table_name='analysis_jobs')
