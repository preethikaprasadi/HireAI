import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from app.models.base import Base


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    __table_args__ = (
        CheckConstraint(
            "years_experience IS NULL OR years_experience >= 0",
            name="chk_skill_years",
        ),
    )

    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "candidate_profiles.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    proficiency: Mapped[str | None] = mapped_column(
        String(50)
    )

    years_experience: Mapped[float | None] = mapped_column(
        Numeric(4, 1)
    )

    source: Mapped[str | None] = mapped_column(
        String(50)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )