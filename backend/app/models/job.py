import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    resume_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("resumes.id"), nullable=True)

    company: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="applied")
    # status: applied | interview | offer | rejected

    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    jd_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jd_analysis: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    analysis_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    # analysis_status: pending | processing | done | failed

    user: Mapped["User"] = relationship(back_populates="jobs")
    resume: Mapped[Optional["Resume"]] = relationship(back_populates="jobs")
    interviews: Mapped[List["Interview"]] = relationship(back_populates="job", cascade="all, delete-orphan")
