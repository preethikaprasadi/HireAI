from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.resume import Resume
from app.models.resume_analysis import ResumeAnalysis
from app.models.skill import Skill
from app.models.user import User
from app.models.company_member import CompanyMember
from app.models.department_member import DepartmentMember

from app.services.candidate_matching_service import (
    calculate_application_match,
)


def get_application_review(
    application_id: UUID,
    current_user: User,
    db: Session,
) -> dict[str, Any]:
    """
    Get complete recruiter review information for one application.

    Includes:

    - Candidate profile
    - Candidate contact information
    - Application information
    - Resume information
    - AI resume analysis
    - AI matching result

    Authorized members can review applications belonging to
    their company, including applications for jobs created by
    other recruiters.
    """

    # ---------------------------------------------------------
    # 1. Get application and verify recruiter owns the job
    # ---------------------------------------------------------

    application = db.scalar(
        select(Application).where(
            Application.id == application_id,
        )
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )
    # ---------------------------------------------------------
    # 2. Get job
    # ---------------------------------------------------------

    job = db.scalar(
        select(Job).where(
            Job.id == application.job_id,
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )


    # ---------------------------------------------------------
    # 3. Verify company membership
    # ---------------------------------------------------------

    membership = db.scalar(
        select(CompanyMember).where(
            CompanyMember.company_id == job.company_id,
            CompanyMember.user_id == current_user.id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )


    # Verify the recruiter can access this job.
    is_owner = membership.role == "OWNER"
    is_job_creator = job.created_by == current_user.id

    is_department_assignee = False

    if job.department_id is not None:
        assignment = db.scalar(
            select(DepartmentMember.id).where(
                DepartmentMember.department_id == job.department_id,
                DepartmentMember.user_id == current_user.id,
            )
        )
        is_department_assignee = assignment is not None

    if not (
        is_owner
        or is_job_creator
        or is_department_assignee
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )


    # Continue with your existing candidate profile,
    # candidate user, resume, analysis, and matching logic.

    # ---------------------------------------------------------
    # 3. Candidate profile
    # ---------------------------------------------------------

    candidate_profile = db.scalar(
        select(CandidateProfile).where(
            CandidateProfile.id
            == application.candidate_profile_id,
        )
    )

    if not candidate_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    # ---------------------------------------------------------
    # 4. Candidate user
    # ---------------------------------------------------------

    candidate_user = db.scalar(
        select(User).where(
            User.id == candidate_profile.user_id,
        )
    )

    if not candidate_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate user not found.",
        )

    # ---------------------------------------------------------
    # 5. Resume
    # ---------------------------------------------------------

    resume = db.scalar(
        select(Resume).where(
            Resume.id == application.resume_id,
            Resume.candidate_profile_id
            == application.candidate_profile_id,
        )
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # ---------------------------------------------------------
    # 6. Resume analysis
    # ---------------------------------------------------------

    resume_analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.resume_id == resume.id,
        )
    )

    # ---------------------------------------------------------
    # 7. Get job skills
    # ---------------------------------------------------------

    job_skill_rows = db.execute(
        select(
            JobSkill,
            Skill.name,
        )
        .join(
            Skill,
            Skill.id == JobSkill.skill_id,
        )
        .where(
            JobSkill.job_id == job.id,
        )
    ).all()

    job_skills = [
        {
            "skill_name": skill_name,
            "requirement_type": job_skill.requirement_type,
            "importance": job_skill.importance,
        }
        for job_skill, skill_name in job_skill_rows
    ]

    # ---------------------------------------------------------
    # 8. Calculate AI matching result
    #
    # Only this application is calculated.
    # We do NOT calculate all applications for the job.
    # ---------------------------------------------------------

    match_result = calculate_application_match(
        application=application,
        job=job,
        current_user=current_user,
        db=db,
        job_skills=job_skills,
    )

    # ---------------------------------------------------------
    # 9. Prepare match data when available
    # ---------------------------------------------------------

    match_data = None

    if match_result is not None:
        match_data = {
            "overall_score": match_result["overall_score"],
            "match_status": match_result["match_status"],
            "components": match_result["components"],
            "details": match_result["details"],
        }
    # ---------------------------------------------------------
    # 10. Candidate information
    # ---------------------------------------------------------

    candidate_name = None

    if (
        resume_analysis
        and resume_analysis.structured_data
    ):
        candidate_data = (
            resume_analysis.structured_data.get("candidate")
            or {}
        )

        candidate_name = candidate_data.get("name")

    if not candidate_name:
        candidate_name = candidate_user.email

    # ---------------------------------------------------------
    # 11. AI analysis data
    # ---------------------------------------------------------

    analysis_data = None

    if (
        resume_analysis
        and resume_analysis.status == "COMPLETED"
        and resume_analysis.structured_data
    ):
        structured_data = resume_analysis.structured_data

        analysis_data = {
            "summary": structured_data.get("summary"),
            "skills": (
                structured_data.get("skills")
                or []
            ),
            "job_titles": (
                structured_data.get("job_titles")
                or []
            ),
            "experience": (
                structured_data.get("experience")
                or []
            ),
            "education": (
                structured_data.get("education")
                or []
            ),
            "projects": (
                structured_data.get("projects")
                or []
            ),
            "certifications": (
                structured_data.get("certifications")
                or []
            ),
        }

    # ---------------------------------------------------------
    # 12. Final response
    # ---------------------------------------------------------

    return {
        "candidate": {
            "name": candidate_name,
            "email": candidate_user.email,
            "phone": candidate_profile.phone,
            "location": candidate_profile.location,
            "headline": candidate_profile.headline,
            "years_of_experience": (
                float(
                    candidate_profile.years_of_experience
                )
                if candidate_profile.years_of_experience
                is not None
                else None
            ),
        },

        "application": {
            "id": application.id,
            "job_id": application.job_id,
            "status": application.status,
            "applied_at": application.applied_at,
            "updated_at": application.updated_at,
        },

        "resume": {
            "id": resume.id,
            "file_name": resume.file_name,
            "version": resume.version,
            "is_current": resume.is_current,
            "uploaded_at": resume.uploaded_at,
        },

        "resume_analysis": analysis_data,

        "match": match_data,

        "company_role": membership.role,
        "job_created_by": job.created_by,

    }
