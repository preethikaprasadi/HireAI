import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.responses import FileResponse

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_candidate,
    require_recruiter,
)

from app.models.application import Application
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.models.company_member import CompanyMember
from app.models.department_member import DepartmentMember
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
)

from app.schemas.application_review import (
    CandidateReviewResponse,
)

from app.services.application_review_service import (
    get_application_review,
)


router = APIRouter(
    prefix="/api/v1/applications",
    tags=["Applications"],
)


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


def get_application_with_company_access(
    application_id: uuid.UUID,
    current_user: User,
    db: Session,
    *,
    require_job_management: bool = False,
):
    """
    Get an application and verify company access.

    Company members can view applications.
    Owners can manage every job in their company.
    Recruiters can manage only jobs they created.
    """

    application = db.scalar(
        select(Application).where(
            Application.id == application_id
        )
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    job = db.scalar(
        select(Job).where(
            Job.id == application.job_id
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

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
    if not can_access_job(job, current_user, membership, db):
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Application not found.",
    )


    if require_job_management and not can_access_job(
        job, current_user, membership, db
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have permission "
                "to manage this application's job."
            ),
        )

    return application, job, membership

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Get candidate profile
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Get active job
    # ---------------------------------------------------------

    job = db.scalar(
        select(Job).where(
            Job.id == data.job_id,
            Job.status == "ACTIVE",
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active job not found.",
        )

    # ---------------------------------------------------------
    # Verify resume belongs to this candidate
    # ---------------------------------------------------------

    resume = db.scalar(
        select(Resume).where(
            Resume.id == data.resume_id,
            Resume.candidate_profile_id == candidate_profile.id,
        )
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # ---------------------------------------------------------
    # Prevent duplicate application
    # ---------------------------------------------------------

    existing_application = db.scalar(
        select(Application).where(
            Application.job_id == data.job_id,
            Application.candidate_profile_id
            == candidate_profile.id,
        )
    )

    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied for this job.",
        )

    application = Application(
        job_id=data.job_id,
        candidate_profile_id=candidate_profile.id,
        resume_id=resume.id,
        status="APPLIED",
    )

    db.add(application)

    try:
        db.commit()
        db.refresh(application)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied for this job.",
        )

    return application


@router.get(
    "/candidate",
    response_model=list[ApplicationResponse],
)
def get_candidate_applications(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Get candidate profile
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Get candidate applications
    # ---------------------------------------------------------

    applications = db.scalars(
        select(Application)
        .where(
            Application.candidate_profile_id
            == candidate_profile.id
        )
        .order_by(Application.applied_at.desc())
    ).all()

    return applications



@router.get(
    "/recruiter",
    response_model=list[ApplicationResponse],
)
def get_recruiter_applications(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    applications = db.execute(
        select(Application, Job, CompanyMember)
        .join(Job, Application.job_id == Job.id)
        .join(
            CompanyMember,
            CompanyMember.company_id == Job.company_id,
        )
        .where(CompanyMember.user_id == current_user.id)
        .order_by(Application.applied_at.desc())
    ).all()

    return [
        application
        for application, job, membership in applications
        if can_access_job(job, current_user, membership, db)
    ]



@router.get(
    "/job/{job_id}",
    response_model=list[ApplicationResponse],
)
def get_job_applications(
    job_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(Job).where(
            Job.id == job_id,
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

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

    if not can_access_job(job, current_user, membership, db):
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Job not found.",
    )

    return db.scalars(
        select(Application)
        .where(
            Application.job_id == job_id,
        )
        .order_by(Application.applied_at.desc())
    ).all()


@router.get(
    "/{application_id}/review",
    response_model=CandidateReviewResponse,
)
def review_application(
    application_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    return get_application_review(
        application_id=application_id,
        current_user=current_user,
        db=db,
    )


@router.get(
    "/{application_id}/resume",
)
def download_application_resume(
    application_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """
    Return the resume attached to an application.

    Authorized company members can access company applications'
    resumes.
    """

    application, job, membership = get_application_with_company_access(
        application_id=application_id,
        current_user=current_user,
        db=db,
    )

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

    backend_root = Path(__file__).resolve().parents[2]

    uploads_root = (
        backend_root / "uploads" / "resumes"
    ).resolve()

    resume_filename = Path(resume.file_url).name

    resume_path = (
        uploads_root / resume_filename
    ).resolve()

    try:
        resume_path.relative_to(uploads_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid resume file location.",
        )

    if not resume_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found.",
        )

    suffix = resume_path.suffix.lower()

    media_types = {
        ".pdf": "application/pdf",
        ".docx": (
            "application/vnd.openxmlformats-"
            "officedocument.wordprocessingml.document"
        ),
    }

    media_type = media_types.get(
        suffix,
        "application/octet-stream",
    )

    return FileResponse(
        path=resume_path,
        media_type=media_type,
        filename=resume.file_name,
    )


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def get_application(
    application_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Get application
    # ---------------------------------------------------------

    application = db.scalar(
        select(Application).where(
            Application.id == application_id
        )
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    # ---------------------------------------------------------
    # Candidate can only see their own application
    # ---------------------------------------------------------

    if current_user.role == "CANDIDATE":

        candidate_profile = db.scalar(
            select(CandidateProfile).where(
                CandidateProfile.user_id
                == current_user.id
            )
        )

        if (
            not candidate_profile
            or application.candidate_profile_id
            != candidate_profile.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have access "
                    "to this application."
                ),
            )

        return application


    # ---------------------------------------------------------
    # Recruiter can view applications across their company
    # ---------------------------------------------------------

    if current_user.role == "RECRUITER":
        application, job, membership = (
            get_application_with_company_access(
                application_id=application_id,
                current_user=current_user,
                db=db,
            )
        )

        return application


    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied.",
    )


@router.put(
    "/{application_id}/status",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: uuid.UUID,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    allowed_statuses = {
        "APPLIED",
        "PENDING",
        "REVIEWED",
        "SHORTLISTED",
        "REJECTED",
        "HIRED",
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application status.",
        )

    application, job, membership = (
        get_application_with_company_access(
            application_id=application_id,
            current_user=current_user,
            db=db,
            require_job_management=True,
        )
    )

    application.status = data.status

    db.commit()
    db.refresh(application)

    return application
