import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), nullable=False, index=True)

    round: Mapped[int] = mapped_column(nullable=False, default=1)
    interview_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    interviewer: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    questions: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    job: Mapped["Job"] = relationship(back_populates="interviews")
