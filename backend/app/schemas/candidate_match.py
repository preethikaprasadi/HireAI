from uuid import UUID

from pydantic import BaseModel


class CandidateMatchComponents(BaseModel):
    skill: float
    experience: float
    role: float
    semantic: float


class CandidateMatchDetails(BaseModel):
    matched_required: list[str]
    matched_preferred: list[str]
    missing_required: list[str]
    missing_preferred: list[str]
    experience_status: str | None
    role_status: str | None
    matched_title: str | None
    semantic_status: str | None


class CandidateMatchResponse(BaseModel):
    application_id: UUID
    candidate_profile_id: UUID
    resume_id: UUID
    candidate_name: str | None
    application_status: str
    overall_score: float
    match_status: str
    components: CandidateMatchComponents
    details: CandidateMatchDetails
