
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class DepartmentMemberCreate(BaseModel):
    email: EmailStr


class DepartmentMemberResponse(BaseModel):
    id: UUID
    department_id: UUID
    user_id: UUID
    email: EmailStr
    assigned_by: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
