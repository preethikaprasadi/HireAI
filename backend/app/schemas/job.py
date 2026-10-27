from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

class JobSkillSelection(BaseModel):
    skill_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    requirement_type: str = Field(
        default="REQUIRED",
        pattern="^(REQUIRED|PREFERRED)$",
    )
    importance: int = Field(default=5, ge=1, le=10)

class JobCreate(BaseModel):
    company_id: UUID
    title: str = Field(min_length=2, max_length=255)
    department: str | None = Field(default=None, max_length=150)
    department_id: UUID | None = None
    description: str = Field(min_length=10)
    skills: list[JobSkillSelection] = Field(default_factory=list)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str
    experience_min: float | None = Field(default=None, ge=0)
    experience_max: float | None = Field(default=None, ge=0)
    salary_min: Decimal | None = Field(default=None, ge=0)
    salary_max: Decimal | None = Field(default=None, ge=0)
    closing_date: datetime | None = None



class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    department: str | None = Field(default=None, max_length=150)
    department_id: UUID | None = None
    description: str | None = Field(default=None, min_length=10)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str | None = None
    experience_min: float | None = Field(default=None, ge=0)
    experience_max: float | None = Field(default=None, ge=0)
    salary_min: Decimal | None = Field(default=None, ge=0)
    salary_max: Decimal | None = Field(default=None, ge=0)
    closing_date: datetime | None = None


class JobResponse(BaseModel):
    id: UUID
    company_id: UUID
    created_by: UUID
    title: str
    department: str | None
    department_id: UUID | None
    description: str
    location: str | None
    employment_type: str
    experience_min: float | None
    experience_max: float | None
    salary_min: Decimal | None
    salary_max: Decimal | None
    status: str
    published_at: datetime | None
    closing_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
