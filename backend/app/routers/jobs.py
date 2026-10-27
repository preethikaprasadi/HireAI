import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_candidate,
    require_recruiter,
)
from app.models.company_member import CompanyMember
from app.models.job import Job
from app.models.user import User
from app.models.application import Application
from app.models.candidate import CandidateProfile
from app.models.department import Department
from app.models.department_member import DepartmentMember
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.schemas.candidate_match import CandidateMatchResponse
from app.services.candidate_matching_service import (
    get_job_candidate_matches,
)
from app.models.skill import Skill
from app.models.job_skill import JobSkill

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Jobs"],
)


# =========================================================
# Company membership and job permission helpers
# =========================================================

def get_company_membership(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session,
) -> CompanyMember | None:
    return db.scalar(
        select(CompanyMember).where(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == user_id,
        )
    )


def require_company_membership(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session,
) -> CompanyMember:
    membership = get_company_membership(
        company_id=company_id,
        user_id=user_id,
        db=db,
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this company's jobs.",
        )

    return membership


def can_access_job(
    job: Job,
    current_user: User,
    membership: CompanyMember,
    db: Session,
) -> bool:
    """Check whether a recruiter can access this job."""

    if membership.role == "OWNER":
        return True

    if job.created_by == current_user.id:
        return True

    if job.department_id is None:
        return False

    assignment = db.scalar(
        select(DepartmentMember.id).where(
            DepartmentMember.department_id == job.department_id,
            DepartmentMember.user_id == current_user.id,
        )
    )

    return assignment is not None


def validate_department(
    department_id: uuid.UUID | None,
    company_id: uuid.UUID,
    db: Session,
) -> Department | None:
    """Ensure the selected department belongs to the specified company."""

    if department_id is None:
        return None

    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == company_id,
        )
    )

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected department does not belong to this company.",
        )

    return department


def get_managed_job(
    job_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> Job:
    """Return a job only if the user has permission to manage it."""

    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    membership = get_company_membership(
        company_id=job.company_id,
        user_id=current_user.id,
        db=db,
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    # Company owners can manage every job.
    if membership.role == "OWNER":
        return job

    # Recruiters can always manage jobs they created.
    if job.created_by == current_user.id:
        return job

    # Recruiters assigned to the job's department can manage it.
    if job.department_id is not None:
        assignment = db.scalar(
            select(DepartmentMember.id).where(
                DepartmentMember.department_id
                == job.department_id,
                DepartmentMember.user_id
                == current_user.id,
            )
        )

        if assignment is not None:
            return job

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "You can manage only jobs you created "
            "or jobs in your assigned departments."
        ),
    )


# =========================================================
# Recruiter — Create Job
# =========================================================

@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    data: JobCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    membership = get_company_membership(
        company_id=data.company_id,
        user_id=current_user.id,
        db=db,
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the company to create jobs.",
        )

    department = validate_department(
        department_id=data.department_id,
        company_id=data.company_id,
        db=db,
    )


    # Recruiters can create jobs only in their assigned departments.
    if membership.role != "OWNER":
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You must select a department assigned "
                    "to you to create a job."
                ),
            )

        assignment = db.scalar(
            select(DepartmentMember.id).where(
                DepartmentMember.department_id == department.id,
                DepartmentMember.user_id == current_user.id,
            )
        )

        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You can create jobs only in your "
                    "assigned department."
                ),
            )


    job = Job(
        company_id=data.company_id,
        created_by=current_user.id,
        title=data.title,
        department=department.name if department else None,
        department_id=department.id if department else None,
        description=data.description,
        location=data.location,
        employment_type=data.employment_type,
        experience_min=data.experience_min,
        experience_max=data.experience_max,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        status="DRAFT",
        closing_date=data.closing_date,
    )

    # Save the job first so its ID is available for JobSkill records.
    db.add(job)
    db.flush()


    seen_skill_ids = set()
    pending_assignments = []

    for selected in data.skills:
        if selected.skill_id is not None:
            skill = db.scalar(
                select(Skill).where(Skill.id == selected.skill_id)
            )

            if not skill:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One of the selected skills was not found.",
                )
        elif selected.name:
            name = " ".join(selected.name.split())

            if not name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Skill name cannot be empty.",
                )

            normalized_name = name.casefold()

            skill = db.scalar(
                select(Skill).where(
                    Skill.normalized_name == normalized_name
                )
            )

            if not skill:
                skill = Skill(
                    name=name,
                    normalized_name=normalized_name,
                )
                db.add(skill)
                db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Each skill must have a skill_id or a name.",
            )

        if skill.id in seen_skill_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A skill cannot be selected more than once.",
            )

        seen_skill_ids.add(skill.id)

        pending_assignments.append(
            JobSkill(
                job_id=job.id,
                skill_id=skill.id,
                requirement_type=selected.requirement_type,
                importance=selected.importance,
            )
        )

    try:
        db.add_all(pending_assignments)
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        raise

    return job


# =========================================================
# Recruiter — View All Jobs in Their Companies
# =========================================================


@router.get(
    "/recruiter",
    response_model=list[JobResponse],
)
def get_recruiter_jobs(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job)
        .join(
            CompanyMember,
            CompanyMember.company_id == Job.company_id,
        )
        .where(
            CompanyMember.user_id == current_user.id,
        )
        .order_by(Job.created_at.desc())
    ).unique().all()

    return [
        job
        for job in jobs
        if (
            membership := get_company_membership(
                job.company_id,
                current_user.id,
                db,
            )
        ) is not None
        and can_access_job(job, current_user, membership, db)
    ]



# =========================================================
# Candidate — Browse Active Jobs
# =========================================================

@router.get(
    "",
    response_model=list[JobResponse],
)
def get_active_jobs(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job)
        .where(Job.status == "ACTIVE")
        .order_by(Job.published_at.desc())
    ).all()

    return jobs


# =========================================================
# Get Job Details
# =========================================================

@router.get(
    "/{job_id}",
    response_model=JobResponse,
)
def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    # Company recruiters and owners can view every job
    # belonging to their company.
    if current_user.role == "RECRUITER":
        membership = get_company_membership(
            company_id=job.company_id,
            user_id=current_user.id,
            db=db,
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found.",
            )

        if not can_access_job(job, current_user, membership, db):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found.",
            )

        return job


        # Candidates can view active jobs or jobs they have applied for.
    if current_user.role == "CANDIDATE":
        if job.status == "ACTIVE":
            return job

        candidate_profile = db.scalar(
            select(CandidateProfile).where(
                CandidateProfile.user_id == current_user.id,
            )
        )

        if candidate_profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found.",
            )

        existing_application = db.scalar(
            select(Application.id).where(
                Application.job_id == job.id,
                Application.candidate_profile_id == candidate_profile.id,
            )
        )

        if existing_application is not None:
            return job

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied.",
    )


# =========================================================
# Recruiter / Owner — Update Job
# =========================================================

@router.put(
    "/{job_id}",
    response_model=JobResponse,
)
def update_job(
    job_id: uuid.UUID,
    data: JobUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = get_managed_job(
        job_id=job_id,
        current_user=current_user,
        db=db,
    )

    if job.status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed jobs cannot be updated.",
        )

    update_data = data.model_dump(exclude_unset=True)

    if "department_id" in update_data:
        department = validate_department(
            department_id=update_data["department_id"],
            company_id=job.company_id,
            db=db,
        )
        job.department_id = department.id if department else None
        job.department = department.name if department else None
        update_data.pop("department_id")
        update_data.pop("department", None)

    # Company ownership and creator identity are immutable
    # through this endpoint.
    protected_fields = {
        "id",
        "company_id",
        "created_by",
        "created_at",
        "updated_at",
        "published_at",
    }

    for field, value in update_data.items():
        if field not in protected_fields:
            setattr(job, field, value)

    db.commit()
    db.refresh(job)

    return job


# =========================================================
# Recruiter / Owner — Publish Job
# =========================================================

@router.post(
    "/{job_id}/publish",
    response_model=JobResponse,
)
def publish_job(
    job_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = get_managed_job(
        job_id=job_id,
        current_user=current_user,
        db=db,
    )

    if job.status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed jobs cannot be published.",
        )

    if job.status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already active.",
        )

    job.status = "ACTIVE"
    job.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(job)

    return job


# =========================================================
# Recruiter / Owner — Close Job
# =========================================================

@router.post(
    "/{job_id}/close",
    response_model=JobResponse,
)
def close_job(
    job_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = get_managed_job(
        job_id=job_id,
        current_user=current_user,
        db=db,
    )

    if job.status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already closed.",
        )

    job.status = "CLOSED"

    db.commit()
    db.refresh(job)

    return job


# =========================================================
# Recruiter / Owner — Candidate Matches
# =========================================================

@router.get(
    "/{job_id}/matches",
    response_model=list[CandidateMatchResponse],
)
def get_job_matches(
    job_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    # Allow company owners and all company recruiters to view matches.
    membership = get_company_membership(
        company_id=job.company_id,
        user_id=current_user.id,
        db=db,
    )

    if membership is None or not can_access_job(
        job, current_user, membership, db
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    return get_job_candidate_matches(
        job_id=job_id,
        current_user=current_user,
        db=db,
    )
