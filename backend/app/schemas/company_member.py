
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class CompanyMemberCreate(BaseModel):
    email: EmailStr


class CompanyMemberResponse(BaseModel):
    id: UUID
    company_id: UUID
    user_id: UUID
    email: EmailStr
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CompanyMembershipResponse(BaseModel):
    company_id: UUID
    user_id: UUID
    role: str

    model_config = ConfigDict(from_attributes=True)
