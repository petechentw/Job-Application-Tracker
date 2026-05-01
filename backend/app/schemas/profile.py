from __future__ import annotations
from datetime import datetime

from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    nationality: str | None = None
    visa_status: str | None = None
    needs_sponsor: bool | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: str | None
    email: str | None
    phone: str | None
    address: str | None
    nationality: str | None
    visa_status: str | None
    needs_sponsor: bool
    linkedin_url: str | None
    github_url: str | None
    portfolio_url: str | None
    skills: list | None
    updated_at: datetime

    model_config = {"from_attributes": True}
