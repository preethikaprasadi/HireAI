from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ResumeAnalysisResponse(BaseModel):
    id: UUID
    resume_id: UUID
    status: str
    raw_text: str | None
    structured_data: dict | None
    model_name: str | None
    prompt_version: str | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
