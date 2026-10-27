from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ApplicationCreate(BaseModel):
    job_id: UUID
    resume_id: UUID


class ApplicationStatusUpdate(BaseModel):
    status: str


class ApplicationResponse(BaseModel):
    id: UUID
    job_id: UUID
    candidate_profile_id: UUID
    resume_id: UUID
    status: str
    applied_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
