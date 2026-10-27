
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.user import User
from app.schemas.company import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
)
from app.schemas.company_member import CompanyMembershipResponse

router = APIRouter(
    prefix="/api/v1/companies",
    tags=["Companies"],
)


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


# =========================================================
# Recruiter — Create Company
# =========================================================

@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    company = Company(
        name=data.name,
        description=data.description,
        industry=data.industry,
        website=data.website,
        location=data.location,
        logo_url=data.logo_url,
        created_by=current_user.id,
    )

    try:
        db.add(company)
        db.flush()

        membership = CompanyMember(
            company_id=company.id,
            user_id=current_user.id,
            role="OWNER",
        )

        db.add(membership)
        db.commit()
        db.refresh(company)

    except Exception:
        db.rollback()
        raise

    return company


# =========================================================
# Recruiter — View Companies They Belong To
# =========================================================

@router.get(
    "/recruiter",
    response_model=list[CompanyResponse],
)
def get_recruiter_companies(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    companies = db.scalars(
        select(Company)
        .join(
            CompanyMember,
            CompanyMember.company_id == Company.id,
        )
        .where(
            CompanyMember.user_id == current_user.id,
        )
        .order_by(Company.created_at.desc())
    ).all()

    return companies

@router.get(
    "/memberships/me",
    response_model=list[CompanyMembershipResponse],
)
def get_my_company_memberships(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    memberships = db.scalars(
        select(CompanyMember)
        .where(CompanyMember.user_id == current_user.id)
        .order_by(CompanyMember.company_id)
    ).all()

    return memberships

# =========================================================
# Public — Company Directory for Registration
# =========================================================

@router.get("/directory")
def get_company_directory(
    db: Session = Depends(get_db),
):
    companies = db.execute(
        select(
            Company.id,
            Company.name,
            Company.industry,
            Company.location,
        )
        .order_by(Company.name.asc())
    ).all()

    return [
        {
            "id": str(company.id),
            "name": company.name,
            "industry": company.industry,
            "location": company.location,
        }
        for company in companies
    ]

# =========================================================
# Recruiter — Get Company
# =========================================================

@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
def get_company(
    company_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    membership = get_company_membership(
        company_id=company_id,
        user_id=current_user.id,
        db=db,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    company = db.get(Company, company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    return company


# =========================================================
# Company Owner — Update Company
# =========================================================

@router.put(
    "/{company_id}",
    response_model=CompanyResponse,
)
def update_company(
    company_id: uuid.UUID,
    data: CompanyUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    membership = get_company_membership(
        company_id=company_id,
        user_id=current_user.id,
        db=db,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    if membership.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can update company details.",
        )

    company = db.get(Company, company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)

    return company
