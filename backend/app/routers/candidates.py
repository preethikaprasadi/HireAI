from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    require_candidate,
    require_recruiter,
)
from app.models.application import Application
from app.models.candidate import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.job import Job
from app.models.resume import Resume
from app.models.resume_analysis import ResumeAnalysis
from app.models.skill import Skill
from app.models.user import User
from app.schemas.candidate import (
    CandidateProfileCreate,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    RecruiterCandidate,
    RecruiterCandidateApplication,
    RecruiterCandidateResume,
    RecruiterCandidatesResponse,
)


router = APIRouter(
    prefix="/api/v1/candidates",
    tags=["Candidates"],
)


# =========================================================
# Create Candidate Profile
# =========================================================

@router.post(
    "/profile",
    response_model=CandidateProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_candidate_profile(
    request: CandidateProfileCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    existing_profile = db.scalar(
        select(CandidateProfile).where(
            CandidateProfile.user_id == current_user.id
        )
    )

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate profile already exists.",
        )

    candidate_profile = CandidateProfile(
        user_id=current_user.id,
        phone=request.phone,
        location=request.location,
        headline=request.headline,
        bio=request.bio,
        years_of_experience=request.years_of_experience,
        linkedin_url=request.linkedin_url,
        github_url=request.github_url,
    )

    db.add(candidate_profile)
    db.commit()
    db.refresh(candidate_profile)

    return candidate_profile


# =========================================================
# Get Candidate Profile
# =========================================================

@router.get(
    "/profile",
    response_model=CandidateProfileResponse,
)
def get_candidate_profile(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate_profile = db.scalar(
        select(CandidateProfile).where(
            CandidateProfile.user_id == current_user.id
        )
    )

    if not candidate_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    return candidate_profile


# =========================================================
# Update Candidate Profile
# =========================================================

@router.put(
    "/profile",
    response_model=CandidateProfileResponse,
)
def update_candidate_profile(
    request: CandidateProfileUpdate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate_profile = db.scalar(
        select(CandidateProfile).where(
            CandidateProfile.user_id == current_user.id
        )
    )

    if not candidate_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    update_data = request.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(candidate_profile, field, value)

    db.commit()
    db.refresh(candidate_profile)

    return candidate_profile

# =========================================================
# Get Candidates for Recruiter
# =========================================================

@router.get(
    "/recruiter",
    response_model=RecruiterCandidatesResponse,
)
def get_recruiter_candidates(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # 1. Get applications submitted to this recruiter's jobs
    # -----------------------------------------------------

    applications = db.scalars(
        select(Application)
        .join(
            Job,
            Application.job_id == Job.id,
        )
        .where(
            Job.created_by == current_user.id
        )
        .order_by(
            Application.applied_at.desc()
        )
    ).all()

    if not applications:
        return {
            "candidates": [],
            "count": 0,
        }

    # -----------------------------------------------------
    # 2. Collect unique candidate and job IDs
    # -----------------------------------------------------

    candidate_ids = list(
        {
            application.candidate_profile_id
            for application in applications
        }
    )

    job_ids = list(
        {
            application.job_id
            for application in applications
        }
    )

    # -----------------------------------------------------
    # 3. Load candidate profiles
    # -----------------------------------------------------

    candidate_profiles = db.scalars(
        select(CandidateProfile).where(
            CandidateProfile.id.in_(candidate_ids)
        )
    ).all()

    candidate_profile_map = {
        profile.id: profile
        for profile in candidate_profiles
    }

    # -----------------------------------------------------
    # 4. Load candidate users
    # -----------------------------------------------------

    user_ids = [
        profile.user_id
        for profile in candidate_profiles
    ]

    users = db.scalars(
        select(User).where(
            User.id.in_(user_ids)
        )
    ).all()

    user_map = {
        user.id: user
        for user in users
    }

    # -----------------------------------------------------
    # 5. Load jobs
    # -----------------------------------------------------

    jobs = db.scalars(
        select(Job).where(
            Job.id.in_(job_ids)
        )
    ).all()

    job_map = {
        job.id: job
        for job in jobs
    }

    # -----------------------------------------------------
    # 6. Load resumes
    #
    # Prefer the current resume.
    # If current resume is unavailable, use the latest one.
    # -----------------------------------------------------

    resumes = db.scalars(
        select(Resume)
        .where(
            Resume.candidate_profile_id.in_(candidate_ids)
        )
        .order_by(
            Resume.is_current.desc(),
            Resume.uploaded_at.desc(),
        )
    ).all()

    resume_map: dict[object, Resume] = {}

    for resume in resumes:
        if resume.candidate_profile_id not in resume_map:
            resume_map[
                resume.candidate_profile_id
            ] = resume

    # -----------------------------------------------------
    # 7. Load AI resume analyses
    # -----------------------------------------------------

    resume_ids = [
        resume.id
        for resume in resume_map.values()
    ]

    analyses = []

    if resume_ids:
        analyses = db.scalars(
            select(ResumeAnalysis).where(
                ResumeAnalysis.resume_id.in_(resume_ids)
            )
        ).all()

    analysis_map = {
        analysis.resume_id: analysis
        for analysis in analyses
    }

    # -----------------------------------------------------
    # 8. Load candidate skills
    # -----------------------------------------------------

    candidate_skill_rows = db.execute(
        select(
            CandidateSkill.candidate_profile_id,
            Skill.name,
        )
        .join(
            Skill,
            CandidateSkill.skill_id == Skill.id,
        )
        .where(
            CandidateSkill.candidate_profile_id.in_(
                candidate_ids
            )
        )
        .order_by(
            Skill.name.asc()
        )
    ).all()

    skills_map: dict[object, list[str]] = {}

    for candidate_id, skill_name in candidate_skill_rows:
        skills_map.setdefault(
            candidate_id,
            []
        ).append(skill_name)

    # -----------------------------------------------------
    # 9. Build response grouped by candidate
    # -----------------------------------------------------

    candidate_applications: dict[
        object,
        list[RecruiterCandidateApplication]
    ] = {}

    for application in applications:
        job = job_map.get(application.job_id)

        if not job:
            continue

        candidate_applications.setdefault(
            application.candidate_profile_id,
            []
        ).append(
            RecruiterCandidateApplication(
                id=application.id,
                job_id=application.job_id,
                job_title=job.title,
                status=application.status,
                applied_at=application.applied_at,
            )
        )

    # -----------------------------------------------------
    # 10. Create recruiter candidate list
    # -----------------------------------------------------

    candidates: list[RecruiterCandidate] = []

    for candidate_id in candidate_ids:
        profile = candidate_profile_map.get(
            candidate_id
        )

        if not profile:
            continue

        user = user_map.get(profile.user_id)

        resume = resume_map.get(candidate_id)

        analysis = (
            analysis_map.get(resume.id)
            if resume
            else None
        )

        structured_data = (
            analysis.structured_data
            if analysis
            and analysis.status == "COMPLETED"
            and analysis.structured_data
            else {}
        )

        candidate_data = structured_data.get(
            "candidate",
            {}
        )

        extracted_name = candidate_data.get(
            "name"
        )

        candidate_name = (
            extracted_name
            or user.email
            if user
            else None
        )

        extracted_job_titles = (
            structured_data.get(
                "job_titles"
            )
            or []
        )

        candidate_resume = None

        if resume:
            candidate_resume = RecruiterCandidateResume(
                id=resume.id,
                file_name=resume.file_name,
                version=resume.version,
                is_current=resume.is_current,
                uploaded_at=resume.uploaded_at,
            )

        candidate_application_list = (
            candidate_applications.get(
                candidate_id,
                []
            )
        )

        candidates.append(
            RecruiterCandidate(
                id=candidate_id,
                name=candidate_name,
                email=(
                    user.email
                    if user
                    else None
                ),
                phone=profile.phone,
                location=profile.location,
                headline=profile.headline,
                years_of_experience=(
                    float(profile.years_of_experience)
                    if profile.years_of_experience
                    is not None
                    else None
                ),
                resume=candidate_resume,
                skills=skills_map.get(
                    candidate_id,
                    []
                ),
                job_titles=extracted_job_titles,
                applications=candidate_application_list,
                application_count=len(
                    candidate_application_list
                ),
            )
        )

    return {
        "candidates": candidates,
        "count": len(candidates),
    }
