import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
)
from app.models.base import Base


class JobRequirement(Base):
    __tablename__ = "job_requirements"
    __table_args__ = (
        CheckConstraint(
            "importance >= 1 AND importance <= 10",
            name="chk_requirement_importance",
        ),
        Index("idx_job_requirements_job", "job_id"),
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

    requirement_type: Mapped[str] = mapped_column(
        Enum(
            "SKILL",
            "EXPERIENCE",
            "EDUCATION",
            "OTHER",
            name="requirement_type",
            create_type=False,
        ),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_required: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    importance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )