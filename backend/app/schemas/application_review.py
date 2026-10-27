from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CandidateReviewProfile(BaseModel):
    name: str | None
    email: str | None
    phone: str | None
    location: str | None
    headline: str | None
    years_of_experience: float | None


class CandidateReviewResume(BaseModel):
    id: UUID
    file_name: str
    version: int
    is_current: bool
    uploaded_at: datetime


class CandidateReviewAnalysis(BaseModel):
    summary: str | None
    skills: list
    job_titles: list
    experience: list
    education: list
    projects: list
    certifications: list


class CandidateReviewApplication(BaseModel):
    id: UUID
    job_id: UUID
    status: str
    applied_at: datetime
    updated_at: datetime


class CandidateReviewMatchComponents(BaseModel):
    skill: float
    experience: float
    role: float
    semantic: float


class CandidateReviewMatchDetails(BaseModel):
    matched_required: list[str]
    matched_preferred: list[str]
    missing_required: list[str]
    missing_preferred: list[str]
    experience_status: str | None
    role_status: str | None
    matched_title: str | None
    semantic_status: str | None


class CandidateReviewMatch(BaseModel):
    overall_score: float
    match_status: str
    components: CandidateReviewMatchComponents
    details: CandidateReviewMatchDetails



class CandidateReviewResponse(BaseModel):
    candidate: CandidateReviewProfile
    application: CandidateReviewApplication
    resume: CandidateReviewResume
    resume_analysis: CandidateReviewAnalysis | None
    match: CandidateReviewMatch | None = None

    company_role: str
    job_created_by: UUID
