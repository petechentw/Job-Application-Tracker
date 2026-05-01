import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)

    # Basic info
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Immigration
    nationality: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    visa_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    needs_sponsor: Mapped[bool] = mapped_column(Boolean, default=False)

    # Links
    linkedin_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # AI extracted from resumes
    skills: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
