
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompanyJoinRequestDecision(BaseModel):
    status: Literal["APPROVED", "REJECTED"]


class CompanyJoinRequestResponse(BaseModel):
    id: UUID
    company_id: UUID
    user_id: UUID
    email: str
    first_name: str
    last_name: str
    status: str
    created_at: datetime
    updated_at: datetime


class MyCompanyJoinRequestResponse(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str
    status: str
    created_at: datetime
    updated_at: datetime
