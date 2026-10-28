import os
import logging

logger = logging.getLogger(__name__)
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.auth import router as auth_router
from app.routers.candidates import router as candidates_router
from app.routers.candidate_skills import router as candidate_skills_router
from app.routers.resumes import router as resumes_router
from app.routers.jobs import router as jobs_router
from app.routers.companies import router as companies_router
from app.routers.applications import router as applications_router
from app.routers.job_skills import router as job_skills_router
from app.routers.analytics import router as analytics_router
from app.routers.departments import router as departments_router
from app.routers.company_members import router as company_members_router
from app.routers.department_members import (
    router as department_members_router,
)
from app.routers import skills
app = FastAPI(
    title="HireAI API",
    description="AI-powered recruitment platform",
    version="1.0.0",
)
from app.routers.company_join_requests import router as company_join_requests_router


# Configure allowed frontend origins using a comma-separated
# ALLOWED_ORIGINS environment variable.
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(candidates_router)
app.include_router(candidate_skills_router)
app.include_router(companies_router)
app.include_router(departments_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(job_skills_router)
app.include_router(analytics_router)
app.include_router(company_members_router)
app.include_router(department_members_router)
app.include_router(skills.router)
app.include_router(company_join_requests_router)

@app.get("/")
def root():
    return {
        "message": "HireAI API is running",
        "version": "1.0.0",
    }

#job id e8d2c6a1-ed18-4bd8-a487-b408a44dab13
#skill id 97b46d30-846f-47a9-9329-e43a8ef425ac
#
