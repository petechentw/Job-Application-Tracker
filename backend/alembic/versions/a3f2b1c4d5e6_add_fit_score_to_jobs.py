"""add fit_score to jobs

Revision ID: a3f2b1c4d5e6
Revises: 0de51cc7e83c
Create Date: 2026-01-15 00:00:00.000000

Adds an integer fit_score column (0-100) to the jobs table.
The score is computed by the worker after JD analysis by comparing
required skills against the resume's parsed_skills. Null means
no resume was attached or analysis has not completed yet.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a3f2b1c4d5e6'
down_revision = '0de51cc7e83c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'jobs',
        sa.Column('fit_score', sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('jobs', 'fit_score')
