import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )

    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
            name="processing_status",
            create_type=False,
        ),
        nullable=False,
    )

    raw_text: Mapped[str | None] = mapped_column(
        Text
    )

    structured_data: Mapped[dict | None] = mapped_column(
        JSONB
    )

    model_name: Mapped[str | None] = mapped_column(
        String(150)
    )

    prompt_version: Mapped[str | None] = mapped_column(
        String(50)
    )

    error_message: Mapped[str | None] = mapped_column(
        Text
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )