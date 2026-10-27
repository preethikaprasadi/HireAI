from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_recruiter
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.analytics import (
    RecruiterAnalyticsOverview,
    RecruiterApplicationPipeline,
    RecruiterApplicationActivity,
    RecruiterJobPerformance,
    RecruiterAnalyticsResponse,
)

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


# =========================================================
# Recruiter Analytics
# =========================================================

@router.get(
    "/recruiter",
    response_model=RecruiterAnalyticsResponse,
)
def get_recruiter_analytics(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # 1. Job overview
    # -----------------------------------------------------

    job_counts = db.execute(
        select(
            func.count(Job.id).label("total_jobs"),
            func.count(
                Job.id
            ).filter(
                Job.status == "ACTIVE"
            ).label("active_jobs"),
            func.count(
                Job.id
            ).filter(
                Job.status == "CLOSED"
            ).label("closed_jobs"),
            func.count(
                Job.id
            ).filter(
                Job.status == "DRAFT"
            ).label("draft_jobs"),
        ).where(
            Job.created_by == current_user.id
        )
    ).one()

    # -----------------------------------------------------
    # 2. Application pipeline
    #
    # Only applications belonging to this recruiter's jobs.
    # -----------------------------------------------------

    application_counts = db.execute(
        select(
            func.count(Application.id).label(
                "total_applications"
            ),

            func.count(
                Application.id
            ).filter(
                Application.status == "APPLIED"
            ).label("applied"),

            func.count(
                Application.id
            ).filter(
                Application.status == "PENDING"
            ).label("pending"),

            func.count(
                Application.id
            ).filter(
                Application.status == "REVIEWED"
            ).label("reviewed"),

            func.count(
                Application.id
            ).filter(
                Application.status == "SHORTLISTED"
            ).label("shortlisted"),

            func.count(
                Application.id
            ).filter(
                Application.status == "REJECTED"
            ).label("rejected"),

            func.count(
                Application.id
            ).filter(
                Application.status == "HIRED"
            ).label("hired"),
        )
        .join(
            Job,
            Application.job_id == Job.id,
        )
        .where(
            Job.created_by == current_user.id
        )
    ).one()

    # -----------------------------------------------------
    # 3. Unique candidates
    # -----------------------------------------------------

    total_candidates = db.scalar(
        select(
            func.count(
                func.distinct(
                    Application.candidate_profile_id
                )
            )
        )
        .join(
            Job,
            Application.job_id == Job.id,
        )
        .where(
            Job.created_by == current_user.id
        )
    ) or 0

    # -----------------------------------------------------
    # 4. Application activity
    #
    # Last 30 days.
    # -----------------------------------------------------

    today = date.today()
    start_date = today - timedelta(days=29)

    activity_rows = db.execute(
        select(
            cast(
                Application.applied_at,
                Date,
            ).label("application_date"),
            func.count(Application.id).label(
                "applications"
            ),
        )
        .join(
            Job,
            Application.job_id == Job.id,
        )
        .where(
            Job.created_by == current_user.id,
            Application.applied_at >= start_date,
        )
        .group_by(
            cast(
                Application.applied_at,
                Date,
            )
        )
        .order_by(
            cast(
                Application.applied_at,
                Date,
            )
        )
    ).all()

    activity_map = {
        row.application_date: row.applications
        for row in activity_rows
    }

    application_activity = [
        RecruiterApplicationActivity(
            date=start_date
            + timedelta(days=index),
            applications=activity_map.get(
                start_date
                + timedelta(days=index),
                0,
            ),
        )
        for index in range(30)
    ]

    # -----------------------------------------------------
    # 5. Job performance
    # -----------------------------------------------------

    job_performance_rows = db.execute(
        select(
            Job.id,
            Job.title,
            Job.status,

            func.count(
                Application.id
            ).label(
                "application_count"
            ),

            func.count(
                Application.id
            ).filter(
                Application.status == "SHORTLISTED"
            ).label(
                "shortlisted_count"
            ),

            func.count(
                Application.id
            ).filter(
                Application.status == "HIRED"
            ).label(
                "hired_count"
            ),

            func.count(
                Application.id
            ).filter(
                Application.status == "REJECTED"
            ).label(
                "rejected_count"
            ),
        )
        .outerjoin(
            Application,
            Application.job_id == Job.id,
        )
        .where(
            Job.created_by == current_user.id
        )
        .group_by(
            Job.id,
            Job.title,
            Job.status,
        )
        .order_by(
            func.count(
                Application.id
            ).desc(),
            Job.created_at.desc(),
        )
    ).all()

    job_performance = [
        RecruiterJobPerformance(
            job_id=row.id,
            job_title=row.title,
            status=row.status,
            application_count=row.application_count,
            shortlisted_count=row.shortlisted_count,
            hired_count=row.hired_count,
            rejected_count=row.rejected_count,
        )
        for row in job_performance_rows
    ]

    # -----------------------------------------------------
    # 6. Build overview
    # -----------------------------------------------------

    overview = RecruiterAnalyticsOverview(
        total_jobs=job_counts.total_jobs,
        active_jobs=job_counts.active_jobs,
        closed_jobs=job_counts.closed_jobs,
        draft_jobs=job_counts.draft_jobs,

        total_candidates=total_candidates,
        total_applications=(
            application_counts.total_applications
        ),

        applied=application_counts.applied,
        pending=application_counts.pending,
        reviewed=application_counts.reviewed,
        shortlisted=application_counts.shortlisted,
        rejected=application_counts.rejected,
        hired=application_counts.hired,
    )

    # -----------------------------------------------------
    # 7. Build pipeline
    # -----------------------------------------------------

    pipeline = RecruiterApplicationPipeline(
        applied=application_counts.applied,
        pending=application_counts.pending,
        reviewed=application_counts.reviewed,
        shortlisted=application_counts.shortlisted,
        rejected=application_counts.rejected,
        hired=application_counts.hired,
    )

    # -----------------------------------------------------
    # 8. Final response
    # -----------------------------------------------------

    return RecruiterAnalyticsResponse(
        overview=overview,
        application_pipeline=pipeline,
        application_activity=application_activity,
        job_performance=job_performance,
    )
