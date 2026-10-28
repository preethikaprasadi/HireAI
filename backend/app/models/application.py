import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.resume import Resume


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        Index("idx_applications_candidate", "candidate_profile_id"),
        Index("idx_applications_job", "job_id"),
        Index("idx_applications_status", "status"),
        UniqueConstraint(
            "job_id",
            "candidate_profile_id",
            name="uq_application_job_candidate",
        ),
        UniqueConstraint(
            "job_id",
            "candidate_profile_id",
            name="uq_candidate_job_application",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )

    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "candidate_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "resumes.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
   )

    status: Mapped[str] = mapped_column(
        Enum(
            "APPLIED",
            "PENDING",
            "REVIEWED",
            "SHORTLISTED",
            "REJECTED",
            "HIRED",
            name="application_status",
            create_type=False,
        ),
        nullable=False,
    )

    applied_at: Mapped[datetime] = mapped_column(
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