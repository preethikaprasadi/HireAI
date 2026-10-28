import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from app.models.base import Base


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint(
            "experience_min IS NULL OR experience_max IS NULL "
            "OR experience_max >= experience_min",
            name="chk_experience_range",
        ),
        CheckConstraint(
            "salary_min IS NULL OR salary_max IS NULL "
            "OR salary_max >= salary_min",
            name="chk_salary_range",
        ),
        Index("idx_jobs_company", "company_id"),
        Index("idx_jobs_created_by", "created_by"),
        Index("idx_jobs_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    department: Mapped[str | None] = mapped_column(
        String(150)
    )

    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    location: Mapped[str | None] = mapped_column(
        String(255)
    )

    employment_type: Mapped[str] = mapped_column(
        Enum(
            "FULL_TIME",
            "PART_TIME",
            "CONTRACT",
            "INTERNSHIP",
            "REMOTE",
            name="employment_type",
            create_type=False,
        ),
        nullable=False,
    )

    experience_min: Mapped[float | None] = mapped_column(
        Numeric(4, 1)
    )

    experience_max: Mapped[float | None] = mapped_column(
        Numeric(4, 1)
    )

    salary_min: Mapped[float | None] = mapped_column(
        Numeric(12, 2)
    )

    salary_max: Mapped[float | None] = mapped_column(
        Numeric(12, 2)
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "DRAFT",
            "ACTIVE",
            "CLOSED",
            name="job_status",
            create_type=False,
        ),
        nullable=False,
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    closing_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )