from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.candidate import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.resume import Resume
from app.models.resume_analysis import ResumeAnalysis
from app.models.skill import Skill
from app.models.user import User
from app.models.company_member import CompanyMember

from app.services.matching_data import (
    extract_candidate_matching_data,
)

from app.services.matching_engine import (
    calculate_experience_match,
    calculate_role_match,
    calculate_skill_match,
)

from app.services.semantic_matcher import (
    calculate_semantic_match,
)

from app.services.candidate_matcher import (
    calculate_overall_match,
)


def calculate_application_match(
    application: Application,
    job: Job,
    current_user: User,
    db: Session,
    job_skills: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """
    Calculate the complete match result for one application.

    This function is shared by:

    1. GET /jobs/{job_id}/matches
    2. GET /applications/{application_id}/review

    It calculates:

    - Skill match
    - Experience match
    - Role match
    - Semantic match
    - Overall match

    Returns None when the candidate/resume/analysis cannot
    be used for matching.
    """

    # ---------------------------------------------------------
    # 1. Candidate profile
    # ---------------------------------------------------------

    candidate_profile = db.scalar(
        select(CandidateProfile).where(
            CandidateProfile.id
            == application.candidate_profile_id,
        )
    )

    if not candidate_profile:
        return None

    # ---------------------------------------------------------
    # 2. Candidate profile skills
    # ---------------------------------------------------------

    candidate_skill_rows = db.execute(
        select(Skill.name)
        .join(
            CandidateSkill,
            CandidateSkill.skill_id == Skill.id,
        )
        .where(
            CandidateSkill.candidate_profile_id
            == candidate_profile.id,
        )
    ).all()

    profile_skills = [
        skill_name
        for (skill_name,) in candidate_skill_rows
    ]

    # ---------------------------------------------------------
    # 3. Resume
    # ---------------------------------------------------------

    resume = db.scalar(
        select(Resume).where(
            Resume.id == application.resume_id,
        )
    )

    if not resume:
        return None

    # ---------------------------------------------------------
    # 4. Resume analysis
    # ---------------------------------------------------------

    resume_analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.resume_id == resume.id,
        )
    )

    if not resume_analysis:
        return None

    if resume_analysis.status != "COMPLETED":
        return None

    # ---------------------------------------------------------
    # 5. Extract structured resume information
    # ---------------------------------------------------------

    matching_data = extract_candidate_matching_data(
        resume_analysis.structured_data
    )

    resume_skills = matching_data["skills"]

    # Combine profile skills + resume skills.
    # dict.fromkeys() removes duplicates while preserving order.
    candidate_skills = list(
        dict.fromkeys(
            profile_skills + resume_skills
        )
    )

    candidate_job_titles = matching_data["job_titles"]

    # ---------------------------------------------------------
    # 6. Candidate experience
    # ---------------------------------------------------------

    # CandidateProfile value takes priority.
    # Resume experience is the fallback.

    if candidate_profile.years_of_experience is not None:
        candidate_years = float(
            candidate_profile.years_of_experience
        )
    else:
        candidate_years = matching_data["candidate_years"]

    print("\n========== SKILL MATCH DEBUG ==========")
    print("Candidate skills:", repr(candidate_skills))
    print("Job skills:", repr(job_skills))
    print("Candidate skill count:", len(candidate_skills))
    print("Job skill count:", len(job_skills))
    print("=======================================\n")

    # ---------------------------------------------------------
    # 7. Skill matching
    # ---------------------------------------------------------

    skill_match = calculate_skill_match(
        candidate_skills=candidate_skills,
        job_skills=job_skills or [],
    )

    # ---------------------------------------------------------
    # 8. Experience matching
    # ---------------------------------------------------------

    experience_match = calculate_experience_match(
        candidate_years=candidate_years,
        experience_min=(
            float(job.experience_min)
            if job.experience_min is not None
            else None
        ),
        experience_max=(
            float(job.experience_max)
            if job.experience_max is not None
            else None
        ),
    )

    # ---------------------------------------------------------
    # 9. Role matching
    # ---------------------------------------------------------

    role_match = calculate_role_match(
        job_title=job.title,
        candidate_job_titles=candidate_job_titles,
    )


    # ---------------------------------------------------------
    # 10. Semantic matching
    # ---------------------------------------------------------

    structured_data = resume_analysis.structured_data or {}

    candidate_text_parts = []

    # Professional summary
    summary = structured_data.get("summary")
    if summary:
        candidate_text_parts.append(
            f"Professional Summary: {summary}"
        )

    # Skills
    if candidate_skills:
        candidate_text_parts.append(
            "Technical Skills: " + ", ".join(candidate_skills)
        )

    # Relevant job titles
    if candidate_job_titles:
        candidate_text_parts.append(
            "Job Titles: " + ", ".join(candidate_job_titles)
        )

    # Project names and descriptions
    projects = structured_data.get("projects") or []

    for project in projects:
        if isinstance(project, dict):
            project_name = project.get("name", "")
            project_description = project.get("description", "")

            project_text = " - ".join(
                str(value).strip()
                for value in [project_name, project_description]
                if value and str(value).strip()
            )

            if project_text:
                candidate_text_parts.append(
                    f"Project: {project_text}"
                )

    # Relevant work experience
    experiences = structured_data.get("experience") or []

    for experience in experiences:
        if isinstance(experience, dict):
            experience_text = " ".join(
                str(experience.get(key, "")).strip()
                for key in [
                    "job_title",
                    "title",
                    "position",
                    "company",
                    "description",
                    "responsibilities",
                ]
                if experience.get(key)
            )

            if experience_text.strip():
                candidate_text_parts.append(
                    f"Work Experience: {experience_text}"
                )

    candidate_text = "\n".join(candidate_text_parts)

    # Include required job skills in the job-side comparison.
    required_job_skills = [
        item["skill_name"]
        for item in (job_skills or [])
        if item.get("skill_name")
    ]

    job_text_parts = [
        f"Job Title: {job.title or ''}",
        f"Job Description: {job.description or ''}",
    ]

    if required_job_skills:
        job_text_parts.append(
            "Required Skills: "
            + ", ".join(required_job_skills)
        )

    job_text = "\n".join(job_text_parts)

    semantic_match = calculate_semantic_match(
        job_text=job_text,
        candidate_text=candidate_text,
    )


    # ---------------------------------------------------------
    # 11. Overall matching
    # ---------------------------------------------------------

    overall_match = calculate_overall_match(
        skill_match=skill_match,
        experience_match=experience_match,
        role_match=role_match,
        semantic_match=semantic_match,
    )

    # ---------------------------------------------------------
    # 12. Return match result
    # ---------------------------------------------------------

    return {
        "application_id": application.id,
        "candidate_profile_id": candidate_profile.id,
        "resume_id": resume.id,
        "candidate_name": matching_data["candidate_name"],
        "application_status": application.status,
        "overall_score": overall_match["score"],
        "match_status": overall_match["status"],
        "components": overall_match["components"],
        "details": overall_match["details"],
    }


def get_job_candidate_matches(
    job_id: UUID,
    current_user: User,
    db: Session,
) -> list[dict[str, Any]]:
    """
    Calculate and return candidate matches for a job.

    Access rules:
    - Company owners can access matches for jobs in their company.
    - Recruiters can access matches for jobs in their company.
    - Nonmembers cannot access company job matches.

    Matching is calculated individually through
    calculate_application_match().
    """

    # 1. Get the job
    job = db.scalar(
        select(Job).where(Job.id == job_id)
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    # 2. Allow AI Matches only to members of this company
    membership = db.scalar(
        select(CompanyMember).where(
            CompanyMember.company_id == job.company_id,
            CompanyMember.user_id == current_user.id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )




    # ---------------------------------------------------------
    # 4. Get job skills once
    # ---------------------------------------------------------

    print("\n========== JOB SKILLS QUERY DEBUG ==========")
    print("Requested job ID:", repr(job_id))
    print("Requested job ID type:", type(job_id).__name__)

    # Check job skills without joining the skills table.
    raw_job_skill_rows = db.scalars(
        select(JobSkill).where(
            JobSkill.job_id == job_id,
        )
    ).all()

    print("Raw job skill rows:", len(raw_job_skill_rows))

    for row in raw_job_skill_rows:
        print(
            "JobSkill row:",
            "job_id =", repr(row.job_id),
            "skill_id =", repr(row.skill_id),
            "requirement_type =", repr(row.requirement_type),
            "importance =", repr(row.importance),
        )

    # Fetch the skill names for this job.
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
            JobSkill.job_id == job_id,
        )
    ).all()

    print("Joined job skill rows:", len(job_skill_rows))

    job_skills = [
        {
            "skill_name": skill_name,
            "requirement_type": job_skill.requirement_type,
            "importance": job_skill.importance,
        }
        for job_skill, skill_name in job_skill_rows
    ]

    print("Final job skills:", repr(job_skills))
    print("============================================\n")

    # ---------------------------------------------------------
    # 5. Get applications for this job
    # ---------------------------------------------------------

    applications = db.scalars(
        select(Application)
        .where(
            Application.job_id == job_id,
        )
        .order_by(Application.applied_at.asc())
    ).all()

    results: list[dict[str, Any]] = []

    # ---------------------------------------------------------
    # 6. Calculate each application match
    # ---------------------------------------------------------

    for application in applications:
        match_result = calculate_application_match(
            application=application,
            job=job,
            current_user=current_user,
            db=db,
            job_skills=job_skills,
        )

        if match_result is not None:
            results.append(match_result)

    # ---------------------------------------------------------
    # 7. Rank candidates by overall score
    # ---------------------------------------------------------

    results.sort(
        key=lambda item: item["overall_score"],
        reverse=True,
    )

    return results
