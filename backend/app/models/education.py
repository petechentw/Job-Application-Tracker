import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Education(Base):
    __tablename__ = "educations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)

    school: Mapped[str] = mapped_column(String, nullable=False)
    degree: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    field_of_study: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    start_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "YYYY-MM" format
    end_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    gpa: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="educations")
