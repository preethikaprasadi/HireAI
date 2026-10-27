
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_recruiter
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.company_join_request import CompanyJoinRequest
from app.models.user import User
from app.schemas.company_join_request import (
    CompanyJoinRequestDecision,
    CompanyJoinRequestResponse,
    MyCompanyJoinRequestResponse,
)

router = APIRouter(prefix="/api/v1/companies", tags=["Company Join Requests"])


def require_company_owner(
    company_id: UUID,
    user_id: UUID,
    db: Session,
) -> None:
    membership = db.scalar(
        select(CompanyMember).where(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == user_id,
        )
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this company.",
        )

    if membership.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the company owner can manage join requests.",
        )


@router.get(
    "/join-requests/me",
    response_model=list[MyCompanyJoinRequestResponse],
)
def get_my_join_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "RECRUITER":
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can view their join requests.",
        )

    rows = db.execute(
        select(CompanyJoinRequest, Company.name)
        .join(Company, Company.id == CompanyJoinRequest.company_id)
        .where(CompanyJoinRequest.user_id == current_user.id)
        .order_by(CompanyJoinRequest.created_at.desc())
    ).all()

    return [
        {
            "id": request.id,
            "company_id": request.company_id,
            "company_name": company_name,
            "status": request.status,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
        }
        for request, company_name in rows
    ]


@router.post(
    "/{company_id}/join-requests",
    response_model=MyCompanyJoinRequestResponse,
    status_code=201,
)
def request_to_join_company(
    company_id: UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    if current_user.role != "RECRUITER":
        raise HTTPException(status_code=403, detail="Recruiters only.")

    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    membership = db.scalar(
        select(CompanyMember).where(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == current_user.id,
        )
    )

    if membership:
        raise HTTPException(
            status_code=409,
            detail="You are already a member of this company.",
        )

    existing = db.scalar(
        select(CompanyJoinRequest).where(
            CompanyJoinRequest.company_id == company_id,
            CompanyJoinRequest.user_id == current_user.id,
        )
    )

    if existing:
        if existing.status == "PENDING":
            raise HTTPException(
                status_code=409,
                detail="Your request is already pending.",
            )

        if existing.status == "APPROVED":
            raise HTTPException(
                status_code=409,
                detail="This request has already been approved.",
            )

        # Allow a recruiter to submit again after rejection.
        existing.status = "PENDING"
        existing.updated_at = datetime.now(timezone.utc)
        request = existing
    else:
        request = CompanyJoinRequest(
            company_id=company_id,
            user_id=current_user.id,
            status="PENDING",
        )
        db.add(request)

    db.commit()
    db.refresh(request)

    return {
        "id": request.id,
        "company_id": request.company_id,
        "company_name": company.name,
        "status": request.status,
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }


@router.get(
    "/{company_id}/join-requests",
    response_model=list[CompanyJoinRequestResponse],
)
def get_company_join_requests(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user.id, db)

    rows = db.execute(
        select(CompanyJoinRequest, User.email, User.first_name, User.last_name)
        .join(User, User.id == CompanyJoinRequest.user_id)
        .where(
            CompanyJoinRequest.company_id == company_id,
            CompanyJoinRequest.status == "PENDING",
        )
        .order_by(CompanyJoinRequest.created_at.asc())
    ).all()

    return [
        {
            "id": request.id,
            "company_id": request.company_id,
            "user_id": request.user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "status": request.status,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
        }
        for request, email, first_name, last_name in rows
    ]


@router.patch(
    "/{company_id}/join-requests/{request_id}",
    response_model=CompanyJoinRequestResponse,
)
def decide_join_request(
    company_id: UUID,
    request_id: UUID,
    decision: CompanyJoinRequestDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user.id, db)

    request = db.scalar(
        select(CompanyJoinRequest).where(
            CompanyJoinRequest.id == request_id,
            CompanyJoinRequest.company_id == company_id,
        )
    )

    if not request:
        raise HTTPException(status_code=404, detail="Join request not found.")

    if request.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This request has already been processed.",
        )

    applicant = db.get(User, request.user_id)
    if not applicant or applicant.role != "RECRUITER":
        raise HTTPException(
            status_code=409,
            detail="The requesting user is no longer an eligible recruiter.",
        )

    if decision.status == "APPROVED":
        existing_membership = db.scalar(
            select(CompanyMember).where(
                CompanyMember.company_id == company_id,
                CompanyMember.user_id == request.user_id,
            )
        )

        if existing_membership:
            raise HTTPException(
                status_code=409,
                detail="This recruiter is already a company member.",
            )

        db.add(
            CompanyMember(
                company_id=company_id,
                user_id=request.user_id,
                role="RECRUITER",
            )
        )

    request.status = decision.status
    request.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(request)

    return {
        "id": request.id,
        "company_id": request.company_id,
        "user_id": request.user_id,
        "email": applicant.email,
        "first_name": applicant.first_name,
        "last_name": applicant.last_name,
        "status": request.status,
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }
