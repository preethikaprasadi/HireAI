from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CandidateProfileCreate(BaseModel):
    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    location: str | None = Field(
        default=None,
        max_length=255,
    )

    headline: str | None = Field(
        default=None,
        max_length=255,
    )

    bio: str | None = Field(
        default=None,
        max_length=5000,
    )

    years_of_experience: float | None = Field(
        default=None,
        ge=0,
        le=60,
    )

    linkedin_url: str | None = Field(
        default=None,
        max_length=500,
    )

    github_url: str | None = Field(
        default=None,
        max_length=500,
    )


class CandidateProfileUpdate(BaseModel):
    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    location: str | None = Field(
        default=None,
        max_length=255,
    )

    headline: str | None = Field(
        default=None,
        max_length=255,
    )

    bio: str | None = Field(
        default=None,
        max_length=5000,
    )

    years_of_experience: float | None = Field(
        default=None,
        ge=0,
        le=60,
    )

    linkedin_url: str | None = Field(
        default=None,
        max_length=500,
    )

    github_url: str | None = Field(
        default=None,
        max_length=500,
    )


class CandidateProfileResponse(BaseModel):
    id: UUID
    user_id: UUID

    phone: str | None
    location: str | None
    headline: str | None
    bio: str | None
    years_of_experience: float | None
    linkedin_url: str | None
    github_url: str | None

    model_config = ConfigDict(
        from_attributes=True
    )

class RecruiterCandidateApplication(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    status: str
    applied_at: datetime


class RecruiterCandidateResume(BaseModel):
    id: UUID
    file_name: str
    version: int
    is_current: bool
    uploaded_at: datetime


class RecruiterCandidate(BaseModel):
    id: UUID
    name: str | None
    email: str | None
    phone: str | None
    location: str | None
    headline: str | None
    years_of_experience: float | None

    resume: RecruiterCandidateResume | None

    skills: list[str]
    job_titles: list[str]

    applications: list[RecruiterCandidateApplication]
    application_count: int


class RecruiterCandidatesResponse(BaseModel):
    candidates: list[RecruiterCandidate]
    count: int
