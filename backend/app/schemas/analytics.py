from datetime import date
from uuid import UUID

from pydantic import BaseModel


class RecruiterAnalyticsOverview(BaseModel):
    total_jobs: int
    active_jobs: int
    closed_jobs: int
    draft_jobs: int

    total_candidates: int
    total_applications: int

    applied: int
    pending: int
    reviewed: int
    shortlisted: int
    rejected: int
    hired: int


class RecruiterApplicationPipeline(BaseModel):
    applied: int
    pending: int
    reviewed: int
    shortlisted: int
    rejected: int
    hired: int


class RecruiterApplicationActivity(BaseModel):
    date: date
    applications: int


class RecruiterJobPerformance(BaseModel):
    job_id: UUID
    job_title: str
    status: str

    application_count: int
    shortlisted_count: int
    hired_count: int
    rejected_count: int


class RecruiterAnalyticsResponse(BaseModel):
    overview: RecruiterAnalyticsOverview
    application_pipeline: RecruiterApplicationPipeline
    application_activity: list[RecruiterApplicationActivity]
    job_performance: list[RecruiterJobPerformance]
