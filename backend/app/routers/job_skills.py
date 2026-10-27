from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.job_skill import JobSkillCreate, JobSkillResponse


router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Job Skills"],
)


@router.post(
    "/{job_id}/skills",
    response_model=JobSkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_job_skill(
    job_id: UUID,
    data: JobSkillCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(Job).where(
            Job.id == job_id,
            Job.created_by == current_user.id,
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    skill = db.scalar(
        select(Skill).where(Skill.id == data.skill_id)
    )

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )

    existing = db.scalar(
        select(JobSkill).where(
            JobSkill.job_id == job_id,
            JobSkill.skill_id == data.skill_id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This skill is already assigned to the job.",
        )

    job_skill = JobSkill(
        job_id=job_id,
        skill_id=data.skill_id,
        requirement_type=data.requirement_type,
        importance=data.importance,
    )

    db.add(job_skill)

    try:
        db.commit()
        db.refresh(job_skill)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This skill is already assigned to the job.",
        )

    return job_skill


@router.get(
    "/{job_id}/skills",
)
def get_job_skills(
    job_id: UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(Job).where(
            Job.id == job_id,
            Job.created_by == current_user.id,
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    results = db.execute(
        select(JobSkill, Skill.name)
        .join(
            Skill,
            Skill.id == JobSkill.skill_id,
        )
        .where(JobSkill.job_id == job_id)
        .order_by(JobSkill.importance.desc())
    ).all()

    return [
        {
            "job_id": job_skill.job_id,
            "skill_id": job_skill.skill_id,
            "skill_name": skill_name,
            "requirement_type": job_skill.requirement_type,
            "importance": job_skill.importance,
            "created_at": job_skill.created_at,
        }
        for job_skill, skill_name in results
    ]


@router.delete(
    "/{job_id}/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_job_skill(
    job_id: UUID,
    skill_id: UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(Job).where(
            Job.id == job_id,
            Job.created_by == current_user.id,
        )
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    job_skill = db.scalar(
        select(JobSkill).where(
            JobSkill.job_id == job_id,
            JobSkill.skill_id == skill_id,
        )
    )

    if not job_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job skill not found.",
        )

    db.delete(job_skill)
    db.commit()
