
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.department import Department
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)


router = APIRouter(
    prefix="/api/v1/companies/{company_id}/departments",
    tags=["Departments"],
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


def require_company_member(
    company_id: uuid.UUID,
    user: User,
    db: Session,
) -> CompanyMember:
    membership = get_membership(
        company_id=company_id,
        user_id=user.id,
        db=db,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    return membership


def require_company_owner(
    company_id: uuid.UUID,
    user: User,
    db: Session,
) -> CompanyMember:
    membership = require_company_member(
        company_id=company_id,
        user=user,
        db=db,
    )

    if membership.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can manage departments.",
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

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    return department


# =========================================================
# Company Owner — Create Department
# =========================================================

@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    company_id: uuid.UUID,
    data: DepartmentCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    company = db.get(Company, company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    department = Department(
        company_id=company_id,
        name=data.name.strip(),
        description=data.description,
        created_by=current_user.id,
    )

    if not department.name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Department name cannot be empty.",
        )

    db.add(department)

    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this name already exists.",
        )

    return department


# =========================================================
# Company Member — List Departments
# =========================================================

@router.get(
    "",
    response_model=list[DepartmentResponse],
)
def list_departments(
    company_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_member(company_id, current_user, db)

    return db.scalars(
        select(Department)
        .where(Department.company_id == company_id)
        .order_by(Department.name.asc())
    ).all()


# =========================================================
# Company Member — Get Department
# =========================================================

@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def read_department(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_member(company_id, current_user, db)

    return get_department(company_id, department_id, db)


# =========================================================
# Company Owner — Update Department
# =========================================================

@router.put(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def update_department(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    department = get_department(company_id, department_id, db)
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        new_name = update_data["name"]

        if new_name is None or not new_name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Department name cannot be empty.",
            )

        update_data["name"] = new_name.strip()

    for field, value in update_data.items():
        setattr(department, field, value)

    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this name already exists.",
        )

    return department


# =========================================================
# Company Owner — Delete Department
# =========================================================

@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_department(
    company_id: uuid.UUID,
    department_id: uuid.UUID,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    require_company_owner(company_id, current_user, db)

    department = get_department(company_id, department_id, db)

    db.delete(department)
    db.commit()

    return None
