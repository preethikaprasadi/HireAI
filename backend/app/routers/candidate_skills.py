from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_candidate
from app.models.candidate import CandidateProfile
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.candidate_skill import (
    CandidateSkillCreate,
    CandidateSkillResponse,
    SkillResponse,
)


router = APIRouter(
    prefix="/api/v1/candidates/skills",
    tags=["Candidate Skills"],
)


# =========================================================
# Add Candidate Skill
# =========================================================

@router.post(
    "",
    response_model=CandidateSkillResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_candidate_skill(
    request: CandidateSkillCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    # Find candidate profile
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

    # Check that skill exists
    skill = db.scalar(
        select(Skill).where(
            Skill.id == request.skill_id
        )
    )

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )

    # Check duplicate
    existing_skill = db.scalar(
        select(CandidateSkill).where(
            CandidateSkill.candidate_profile_id
            == candidate_profile.id,
            CandidateSkill.skill_id
            == request.skill_id,
        )
    )

    if existing_skill:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate already has this skill.",
        )

    candidate_skill = CandidateSkill(
        candidate_profile_id=candidate_profile.id,
        skill_id=request.skill_id,
        proficiency=request.proficiency,
        years_experience=request.years_experience,
        source="MANUAL",
    )

    db.add(candidate_skill)
    db.commit()
    db.refresh(candidate_skill)

    return candidate_skill

# =========================================================
# Get Available Skills
# =========================================================

@router.get(
    "/catalog",
    response_model=list[SkillResponse],
)
def get_skill_catalog(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    skills = db.scalars(
        select(Skill).order_by(Skill.name.asc())
    ).all()

    return skills

# =========================================================
# Get Candidate Skills
# =========================================================

@router.get(
    "",
    response_model=list[CandidateSkillResponse],
)
def get_candidate_skills(
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

    skills = db.scalars(
        select(CandidateSkill).where(
            CandidateSkill.candidate_profile_id
            == candidate_profile.id
        )
    ).all()

    return skills


# =========================================================
# Remove Candidate Skill
# =========================================================

@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_candidate_skill(
    skill_id: str,
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

    candidate_skill = db.scalar(
        select(CandidateSkill).where(
            CandidateSkill.candidate_profile_id
            == candidate_profile.id,
            CandidateSkill.skill_id
            == skill_id,
        )
    )

    if not candidate_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate skill not found.",
        )

    db.delete(candidate_skill)
    db.commit()

    return None
