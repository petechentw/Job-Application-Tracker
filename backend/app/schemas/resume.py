from datetime import datetime

from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    name: str
    s3_key: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class ResumeURLResponse(BaseModel):
    url: str
