from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CandidateSkillCreate(BaseModel):
    skill_id: UUID
    proficiency: str | None = Field(
        default=None,
        max_length=50,
    )
    years_experience: float | None = Field(
        default=None,
        ge=0,
        le=60,
    )


class CandidateSkillResponse(BaseModel):
    skill_id: UUID
    proficiency: str | None
    years_experience: float | None
    source: str | None

    model_config = ConfigDict(from_attributes=True)

class SkillResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)
