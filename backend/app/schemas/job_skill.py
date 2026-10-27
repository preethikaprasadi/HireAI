from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JobSkillCreate(BaseModel):
    skill_id: UUID
    requirement_type: str = Field(
        default="REQUIRED",
        pattern="^(REQUIRED|PREFERRED)$",
    )
    importance: int = Field(
        default=5,
        ge=1,
        le=10,
    )


class JobSkillResponse(BaseModel):
    job_id: UUID
    skill_id: UUID
    skill_name: str
    requirement_type: str
    importance: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
