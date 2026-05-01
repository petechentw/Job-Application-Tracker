from __future__ import annotations
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class InterviewCreate(BaseModel):
    job_id: str
    round: int = 1
    interview_date: date | None = None
    interviewer: str | None = None
    questions: list[Any] | None = None
    notes: str | None = None


class InterviewUpdate(BaseModel):
    round: int | None = None
    interview_date: date | None = None
    interviewer: str | None = None
    questions: list[Any] | None = None
    notes: str | None = None


class InterviewResponse(BaseModel):
    id: str
    job_id: str
    round: int
    interview_date: date | None
    interviewer: str | None
    questions: list[Any] | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
