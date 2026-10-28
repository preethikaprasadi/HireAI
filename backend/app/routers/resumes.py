import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_candidate
from app.models.candidate import CandidateProfile
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.schemas.resume_analysis import ResumeAnalysisResponse
from app.models.resume_analysis import ResumeAnalysis
from app.services.resume_parser import extract_resume_text
from app.services.resume_analyzer import (
    ResumeAnalyzer,
    MODEL_NAME,
    PROMPT_VERSION,
)
#resume_analyzer = ResumeAnalyzer()
_resume_analyzer: ResumeAnalyzer | None = None


def get_resume_analyzer() -> ResumeAnalyzer:
    global _resume_analyzer

    if _resume_analyzer is None:
        _resume_analyzer = ResumeAnalyzer()

    return _resume_analyzer

router = APIRouter(
    prefix="/api/v1/candidates/resumes",
    tags=["Candidate Resumes"],
)


BACKEND_ROOT = Path(__file__).resolve().parents[2]

UPLOAD_DIR = BACKEND_ROOT / "uploads" / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post(
    "",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume(
    file: UploadFile = File(...),
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

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are allowed.",
        )

    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file size must not exceed 5 MB.",
        )

    extension = Path(file.filename or "").suffix.lower()

    if extension not in {".pdf", ".docx"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must have a .pdf or .docx extension.",
        )

    # Get the next resume version
    latest_resume = db.scalar(
        select(Resume)
        .where(
            Resume.candidate_profile_id == candidate_profile.id
        )
        .order_by(Resume.version.desc())
    )

    next_version = (
        latest_resume.version + 1
        if latest_resume
        else 1
    )

    # Make previous resume versions non-current
    existing_resumes = db.scalars(
        select(Resume).where(
            Resume.candidate_profile_id == candidate_profile.id,
            Resume.is_current.is_(True),
        )
    ).all()

    for resume in existing_resumes:
        resume.is_current = False

    # Generate a unique filename
    stored_filename = f"{uuid.uuid4()}{extension}"
    file_path = UPLOAD_DIR / stored_filename

    file_path.write_bytes(file_content)

    resume = Resume(
        candidate_profile_id=candidate_profile.id,
        file_name=file.filename,
        file_url=f"/uploads/resumes/{stored_filename}",
        file_size=len(file_content),
        mime_type=file.content_type,
        version=next_version,
        is_current=True,
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    analysis = ResumeAnalysis(
        resume_id=resume.id,
        status="PROCESSING",
    )

    db.add(analysis)
    db.commit()

    try:
        # ---------------------------------------------------------
        # Step 1: Extract raw text from PDF/DOCX
        # ---------------------------------------------------------
        extracted_text = extract_resume_text(
            file_content,
            file.content_type,
        )

        if not extracted_text:
            raise ValueError(
                "No readable text could be extracted from the resume."
            )

        analysis.raw_text = extracted_text

        # ---------------------------------------------------------
        # Step 2: AI resume analysis
        # ---------------------------------------------------------
       # structured_data = resume_analyzer.analyze(
        #    extracted_text
    #)

        analyzer = get_resume_analyzer()

        structured_data = analyzer.analyze(
            extracted_text
        )

        # ---------------------------------------------------------
        # Step 3: Store structured AI output
        # ---------------------------------------------------------
        analysis.structured_data = structured_data
        analysis.model_name = MODEL_NAME
        analysis.prompt_version = PROMPT_VERSION
        analysis.status = "COMPLETED"

        analysis.completed_at = datetime.now(timezone.utc)

    except Exception:
        analysis.status = "FAILED"
        analysis.error_message = "Resume analysis failed. Please try again."
    db.commit()

    return resume

@router.get(
    "",
    response_model=list[ResumeResponse],
)
def get_candidate_resumes(
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

    resumes = db.scalars(
        select(Resume)
        .where(
            Resume.candidate_profile_id == candidate_profile.id
        )
        .order_by(Resume.version.desc())
    ).all()

    return resumes


@router.post(
    "/{resume_id}/reanalyze",
    response_model=ResumeAnalysisResponse,
)
def reanalyze_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    # 1. Verify the candidate profile.
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

    # 2. Ensure this resume belongs to the logged-in candidate.
    resume = db.scalar(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.candidate_profile_id == candidate_profile.id,
        )
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # 3. Find the existing analysis record.
    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.resume_id == resume.id
        )
    )

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume analysis not found.",
        )

    if analysis.status == "PROCESSING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resume analysis is already processing.",
        )

    # 4. Safely locate the existing uploaded file.
    uploads_root = UPLOAD_DIR.resolve()
    file_path = (
        uploads_root / Path(resume.file_url).name
    ).resolve()

    try:
        file_path.relative_to(uploads_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid resume file location.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded resume file not found.",
        )

    # 5. Mark the existing analysis as processing.
    analysis.status = "PROCESSING"
    analysis.error_message = None
    analysis.completed_at = None
    analysis.structured_data = None

    db.commit()

    try:
        # 6. Extract text from the existing file.
        file_content = file_path.read_bytes()

        extracted_text = extract_resume_text(
            file_content,
            resume.mime_type,
        )

        if not extracted_text or not extracted_text.strip():
            raise ValueError(
                "No readable text could be extracted from the resume."
            )

        analysis.raw_text = extracted_text

        # 7. Run the existing local AI analyzer.
        analyzer = get_resume_analyzer()

        structured_data = analyzer.analyze(
            extracted_text
        )

        # 8. Save the successful analysis.
        analysis.structured_data = structured_data
        analysis.model_name = MODEL_NAME
        analysis.prompt_version = PROMPT_VERSION
        analysis.status = "COMPLETED"
        analysis.error_message = None
        analysis.completed_at = datetime.now(timezone.utc)

    except Exception:
        db.rollback()

        # Reload the existing record after rollback.
        analysis = db.scalar(
            select(ResumeAnalysis).where(
                ResumeAnalysis.resume_id == resume.id
            )
        )

        if analysis:
            analysis.status = "FAILED"
            analysis.error_message = "Resume analysis failed. Please try again."
            analysis.completed_at = None

    db.commit()
    db.refresh(analysis)

    return analysis


@router.get(
    "/{resume_id}/analysis",
    response_model=ResumeAnalysisResponse,
)
def get_resume_analysis(
    resume_id: uuid.UUID,
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

    resume = db.scalar(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.candidate_profile_id == candidate_profile.id,
        )
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.resume_id == resume.id
        )
    )

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume analysis not found.",
        )

    return analysis

@router.delete(
    "/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_resume(
    resume_id: uuid.UUID,
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

    resume = db.scalar(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.candidate_profile_id == candidate_profile.id,
        )
    )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # Resolve the physical file path safely.
    uploads_root = UPLOAD_DIR.resolve()
    resume_filename = Path(resume.file_url).name
    file_path = (uploads_root / resume_filename).resolve()

    try:
        file_path.relative_to(uploads_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid resume file location.",
        )

    # Delete the database record first.
    # If the transaction fails, preserve the physical file.
    try:
        db.delete(resume)
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Remove the file after the database transaction succeeds.
    if file_path.is_file():
        try:
            file_path.unlink()
        except OSError:
            # The database record is already deleted.
            # Log this condition in production so the orphaned
            # file can be cleaned up later.
            pass

    return None
