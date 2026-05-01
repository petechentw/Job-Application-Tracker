import uuid
from typing import Optional

from sqlalchemy import Boolean, Integer, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)

    company: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "YYYY-MM" format
    end_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)    # null = current
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="work_experiences")
