from __future__ import annotations
from pydantic import BaseModel


class WorkExperienceCreate(BaseModel):
    company: str
    title: str
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    description: str | None = None
    order: int = 0


class WorkExperienceUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool | None = None
    description: str | None = None
    order: int | None = None


class WorkExperienceResponse(BaseModel):
    id: str
    user_id: str
    company: str
    title: str
    start_date: str | None
    end_date: str | None
    is_current: bool
    description: str | None
    order: int

    model_config = {"from_attributes": True}
