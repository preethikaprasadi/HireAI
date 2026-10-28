import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from app.models.base import Base


class Resume(Base):
    __tablename__ = "resumes"
    __table_args__ = (
        CheckConstraint(
            "version > 0",
            name="chk_resume_version",
        ),
        Index("idx_resumes_candidate", "candidate_profile_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    candidate_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "candidate_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    file_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    file_size: Mapped[int | None] = mapped_column(
        BigInteger
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(100)
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )