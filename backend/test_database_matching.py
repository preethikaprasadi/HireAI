from uuid import UUID

from app.core.database import SessionLocal
from app.models.job import Job
from app.models.user import User
from app.services.candidate_matching_service import (
    get_job_candidate_matches,
)


# ---------------------------------------------------------
# Replace these with your real values
# ---------------------------------------------------------

RECRUITER_EMAIL = "user2@hireai.com"

JOB_ID = "e8d2c6a1-ed18-4bd8-a487-b408a44dab13"


# ---------------------------------------------------------
# Database session
# ---------------------------------------------------------

db = SessionLocal()

try:
    recruiter = db.query(User).filter(
        User.email == RECRUITER_EMAIL
    ).first()

    if not recruiter:
        raise Exception(
            "Recruiter user not found."
        )

    matches = get_job_candidate_matches(
        job_id=UUID(JOB_ID),
        current_user=recruiter,
        db=db,
    )

    print("\n" + "=" * 70)
    print("DATABASE CANDIDATE MATCHING")
    print("=" * 70)

    print(f"\nCandidates found: {len(matches)}")

    for index, match in enumerate(
        matches,
        start=1,
    ):
        print("\n" + "-" * 70)
        print(f"Rank #{index}")
        print("-" * 70)

        print(
            f"Candidate: "
            f"{match['candidate_name']}"
        )

        print(
            f"Application ID: "
            f"{match['application_id']}"
        )

        print(
            f"Overall score: "
            f"{match['overall_score']}"
        )

        print(
            f"Status: "
            f"{match['match_status']}"
        )

        print(
            f"Components: "
            f"{match['components']}"
        )

        print(
            f"Details: "
            f"{match['details']}"
        )

finally:
    db.close()
