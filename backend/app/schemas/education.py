from __future__ import annotations
from pydantic import BaseModel


class EducationCreate(BaseModel):
    school: str
    degree: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    gpa: str | None = None
    order: int = 0


class EducationUpdate(BaseModel):
    school: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    gpa: str | None = None
    order: int | None = None


class EducationResponse(BaseModel):
    id: str
    user_id: str
    school: str
    degree: str | None
    field_of_study: str | None
    start_date: str | None
    end_date: str | None
    gpa: str | None
    order: int

    model_config = {"from_attributes": True}
