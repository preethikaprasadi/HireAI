
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.company_member import CompanyMember
from app.models.department import Department
from app.models.department_member import DepartmentMember
from app.models.user import User
from app.schemas.department_member import (
    DepartmentMemberCreate,
    DepartmentMemberResponse,
)

router = APIRouter(
    prefix="/api/v1/companies/{company_id}/departments/{department_id}/members",
    tags=["Department Members"],
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


def require_company_owner(
    company_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> CompanyMember:
    membership = get_company_membership(
        company_id, current_user.id, db
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    if membership.role != "OWNER":
        raise HTTPException(
            status_code=403,
            detail="Only company owners can manage department assignments.",
        )

    return membership


def get_department(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    db: Session,
) -> Department:
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == company_id,
        )
    )

    if department is None:
        raise HTTPException(
            status_code=404,
            detail="Department not found.",
        )

    return department


@router.get("", response_model=list[DepartmentMemberResponse])
def list_department_members(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    # Any authorized company member can view department assignments.
    membership = get_company_membership(
        company_id, current_user.id, db
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    get_department(company_id, department_id, db)

    rows = db.execute(
        select(DepartmentMember, User.email)
        .join(User, User.id == DepartmentMember.user_id)
        .where(
            DepartmentMember.department_id == department_id
        )
        .order_by(DepartmentMember.created_at.asc())
    ).all()

    return [
        {
            "id": assignment.id,
            "department_id": assignment.department_id,
            "user_id": assignment.user_id,
            "email": email,
            "assigned_by": assignment.assigned_by,
            "created_at": assignment.created_at,
        }
        for assignment, email in rows
    ]


@router.post(
    "",
    response_model=DepartmentMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_department_member(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    data: DepartmentMemberCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    get_department(company_id, department_id, db)

    recruiter = db.scalar(
        select(User).where(
            func.lower(User.email) == str(data.email).lower()
        )
    )

    if recruiter is None:
        raise HTTPException(
            status_code=404,
            detail="No user account found with that email.",
        )

    if recruiter.role != "RECRUITER":
        raise HTTPException(
            status_code=422,
            detail="Only recruiter accounts can be assigned to departments.",
        )

    if not recruiter.is_active:
        raise HTTPException(
            status_code=403,
            detail="This recruiter account is inactive.",
        )

    # Recruiter must already be an authorized member of this company.
    recruiter_membership = get_company_membership(
        company_id, recruiter.id, db
    )

    if (
        recruiter_membership is None
        or recruiter_membership.role != "RECRUITER"
    ):
        raise HTTPException(
            status_code=403,
            detail="Authorize this recruiter as a company member first.",
        )

    existing_assignment = db.scalar(
        select(DepartmentMember).where(
            DepartmentMember.department_id == department_id,
            DepartmentMember.user_id == recruiter.id,
        )
    )

    if existing_assignment is not None:
        raise HTTPException(
            status_code=409,
            detail="This recruiter is already assigned to the department.",
        )

    assigned_count = db.scalar(
        select(func.count())
        .select_from(DepartmentMember)
        .where(
            DepartmentMember.department_id == department_id
        )
    ) or 0

    if assigned_count >= 2:
        raise HTTPException(
            status_code=409,
            detail="This department already has two recruiters assigned.",
        )

    assignment = DepartmentMember(
        department_id=department_id,
        user_id=recruiter.id,
        assigned_by=current_user.id,
    )

    db.add(assignment)

    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This recruiter is already assigned to the department.",
        )

    return {
        "id": assignment.id,
        "department_id": assignment.department_id,
        "user_id": assignment.user_id,
        "email": recruiter.email,
        "assigned_by": assignment.assigned_by,
        "created_at": assignment.created_at,
    }


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_department_member(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    assignment_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    get_department(company_id, department_id, db)

    assignment = db.scalar(
        select(DepartmentMember).where(
            DepartmentMember.id == assignment_id,
            DepartmentMember.department_id == department_id,
        )
    )

    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="Department assignment not found.",
        )

    db.delete(assignment)
    db.commit()

    return None
