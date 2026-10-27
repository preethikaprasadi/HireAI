from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.skill import Skill
from app.models.user import User


router = APIRouter(
    prefix="/api/v1/skills",
    tags=["Skills"],
)


class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)


class SkillResponse(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


@router.get("/catalog", response_model=list[SkillResponse])
def get_skill_catalog(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Skill).order_by(Skill.name.asc())
    ).all()


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_skill(
    request: SkillCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    name = " ".join(request.name.split())

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Skill name cannot be empty.",
        )

    normalized_name = name.casefold()

    existing = db.scalar(
        select(Skill).where(
            Skill.normalized_name == normalized_name
        )
    )

    if existing:
        return existing

    skill = Skill(
        name=name,
        normalized_name=normalized_name,
    )

    db.add(skill)

    try:
        db.commit()
        db.refresh(skill)
    except IntegrityError:
        db.rollback()

        # Another request may have created the same skill concurrently.
        existing = db.scalar(
            select(Skill).where(
                Skill.normalized_name == normalized_name
            )
        )

        if existing:
            return existing

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create this skill. Please try again.",
        )

    return skill
