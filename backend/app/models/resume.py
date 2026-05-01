import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Active / History
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # AI parsed fields
    parsed_skills: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    parsed_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    parse_status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    # parse_status: pending | processing | done | failed

    user: Mapped["User"] = relationship(back_populates="resumes")
    jobs: Mapped[List["Job"]] = relationship(back_populates="resume")
