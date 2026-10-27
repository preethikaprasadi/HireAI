from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ResumeResponse(BaseModel):
    id: UUID
    candidate_profile_id: UUID
    file_name: str
    file_url: str
    file_size: int | None
    mime_type: str | None
    version: int
    is_current: bool

    model_config = ConfigDict(from_attributes=True)
