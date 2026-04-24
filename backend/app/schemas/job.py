from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

JobStatus = Literal["applied", "interview", "offer", "rejected"]
AnalysisStatus = Literal["pending", "processing", "done", "failed"]


class JobCreate(BaseModel):
    company: str
    role: str
    platform: str | None = None
    resume_id: str | None = None
    jd_text: str | None = None


class JobUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    platform: str | None = None
    status: JobStatus | None = None
    resume_id: str | None = None
    jd_text: str | None = None


class JobResponse(BaseModel):
    id: str
    user_id: str
    company: str
    role: str
    platform: str | None
    status: str
    applied_at: datetime
    resume_id: str | None
    jd_text: str | None
    jd_analysis: dict[str, Any] | None
    analysis_status: str

    model_config = {"from_attributes": True}
