import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
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


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    __table_args__ = (
        CheckConstraint(
            "years_of_experience >= 0",
            name="chk_years_experience",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30)
    )

    location: Mapped[str | None] = mapped_column(
        String(255)
    )

    headline: Mapped[str | None] = mapped_column(
        String(255)
    )

    bio: Mapped[str | None] = mapped_column(
        Text
    )

    years_of_experience: Mapped[float | None] = mapped_column(
        Numeric(4, 1)
    )

    linkedin_url: Mapped[str | None] = mapped_column(
        String(500)
    )

    github_url: Mapped[str | None] = mapped_column(
        String(500)
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