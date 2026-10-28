import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CandidateMatch(Base):
    __tablename__ = "candidate_matches"
    __table_args__ = (
        CheckConstraint(
            "overall_score >= 0 AND overall_score <= 100",
            name="chk_overall_score",
        ),
        CheckConstraint(
            "skill_score IS NULL OR "
            "(skill_score >= 0 AND skill_score <= 100)",
            name="chk_skill_score",
        ),
        CheckConstraint(
            "experience_score IS NULL OR "
            "(experience_score >= 0 AND experience_score <= 100)",
            name="chk_experience_score",
        ),
        CheckConstraint(
            "semantic_score IS NULL OR "
            "(semantic_score >= 0 AND semantic_score <= 100)",
            name="chk_semantic_score",
        ),
        CheckConstraint(
            "education_score IS NULL OR "
            "(education_score >= 0 AND education_score <= 100)",
            name="chk_education_score",
        ),
        CheckConstraint(
            "project_score IS NULL OR "
            "(project_score >= 0 AND project_score <= 100)",
            name="chk_project_score",
        ),

        Index(
            "idx_matches_score",
            text("overall_score DESC"),
        )
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "applications.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
    )

    overall_score: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    skill_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    experience_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    semantic_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    education_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    project_score: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )

    explanation: Mapped[dict | None] = mapped_column(
        JSONB
    )

    matching_version: Mapped[str | None] = mapped_column(
        String(50)
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