import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"
    __table_args__ = (
        Index("idx_status_history_application", "application_id"),
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

    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )