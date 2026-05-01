from __future__ import annotations
from datetime import datetime

from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    name: str
    s3_key: str
    uploaded_at: datetime
    is_active: bool
    parsed_skills: list | None
    parsed_summary: str | None
    tags: list | None
    parse_status: str

    model_config = {"from_attributes": True}


class ResumeURLResponse(BaseModel):
    url: str
