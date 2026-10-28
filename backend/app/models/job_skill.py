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
    Integer,
    func,
)
from app.models.base import Base


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (
        CheckConstraint(
            "importance >= 1 AND importance <= 10",
            name="chk_job_skill_importance",
        ),
        Index("idx_job_skills_skill", "skill_id"),
    )

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        primary_key=True,
    )

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    )

    requirement_type: Mapped[str] = mapped_column(
        Enum(
            "REQUIRED",
            "PREFERRED",
            name="skill_requirement_type",
            create_type=False,
        ),
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