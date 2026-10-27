
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.user import User
from app.schemas.company_member import (
    CompanyMemberCreate,
    CompanyMemberResponse,
)

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/members",
    tags=["Company Members"],
)


def get_membership(
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


def require_company_owner(
    company_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> CompanyMember:
    membership = get_membership(company_id, current_user.id, db)

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    if membership.role != "OWNER":
        raise HTTPException(
            status_code=403,
            detail="Only company owners can manage recruiter membership.",
        )

    return membership


@router.get("", response_model=list[CompanyMemberResponse])
def list_company_members(
    company_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    # Any authorized company member can view the member list.
    membership = get_membership(company_id, current_user.id, db)

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    rows = db.execute(
        select(CompanyMember, User.email)
        .join(User, User.id == CompanyMember.user_id)
        .where(CompanyMember.company_id == company_id)
        .order_by(CompanyMember.created_at.asc())
    ).all()

    return [
        {
            "id": member.id,
            "company_id": member.company_id,
            "user_id": member.user_id,
            "email": email,
            "role": member.role,
            "created_at": member.created_at,
        }
        for member, email in rows
    ]


@router.post(
    "",
    response_model=CompanyMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def authorize_recruiter(
    company_id: uuid.UUID,
    data: CompanyMemberCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    recruiter = db.scalar(
        select(User).where(User.email == str(data.email).lower())
    )

    if recruiter is None:
        raise HTTPException(
            status_code=404,
            detail="No user account found with that email.",
        )

    if recruiter.role != "RECRUITER":
        raise HTTPException(
            status_code=422,
            detail="The specified account is not a recruiter.",
        )

    existing_membership = get_membership(
        company_id,
        recruiter.id,
        db,
    )

    if existing_membership is not None:
        raise HTTPException(
            status_code=409,
            detail="This user is already a member of the company.",
        )

    membership = CompanyMember(
        company_id=company_id,
        user_id=recruiter.id,
        role="RECRUITER",
    )

    db.add(membership)

    try:
        db.commit()
        db.refresh(membership)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The recruiter is already a member of this company.",
        )

    return {
        "id": membership.id,
        "company_id": membership.company_id,
        "user_id": membership.user_id,
        "email": recruiter.email,
        "role": membership.role,
        "created_at": membership.created_at,
    }


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_company_member(
    company_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    member = db.scalar(
        select(CompanyMember).where(
            CompanyMember.id == member_id,
            CompanyMember.company_id == company_id,
        )
    )

    if member is None:
        raise HTTPException(
            status_code=404,
            detail="Company member not found.",
        )

    if member.role == "OWNER":
        raise HTTPException(
            status_code=400,
            detail="The company owner cannot be removed from the company.",
        )

    db.delete(member)
    db.commit()

    return None
