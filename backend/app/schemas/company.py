from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    industry: str | None = Field(default=None, max_length=150)
    website: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=255)
    logo_url: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )
    description: str | None = None
    industry: str | None = Field(default=None, max_length=150)
    website: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=255)
    logo_url: str | None = None


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    industry: str | None
    website: str | None
    location: str | None
    logo_url: str | None
    created_at: datetime
    updated_at: datetime
    created_by: UUID

    model_config = ConfigDict(from_attributes=True)
