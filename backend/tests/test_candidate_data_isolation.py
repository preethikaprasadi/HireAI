
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.sql import visitors

from app.routers import resumes
from app.models.candidate import CandidateProfile
from app.models.resume import Resume


class OwnershipTestDB:
    """Fake DB for testing candidate ownership filters."""

    def __init__(self, profile, owned_resume):
        self.profile = profile
        self.owned_resume = owned_resume
        self.last_statement = None

    def scalar(self, statement):
        self.last_statement = statement

        # Return the logged-in candidate's profile.
        if CandidateProfile in self._entities(statement):
            return self.profile

        # Return a resume only if the query matches the owned resume
        # and includes the correct candidate_profile_id condition.
        if Resume in self._entities(statement):
            if self.owned_resume is None:
                return None

            predicates = self._predicate_text(statement)
            if (
                str(self.owned_resume.id) in predicates
                and str(self.profile.id) in predicates
            ):
                return self.owned_resume

            return None

        return None

    def scalars(self, statement):
        self.last_statement = statement
        return SimpleNamespace(all=lambda: [])

    @staticmethod
    def _entities(statement):
        description = getattr(statement, "column_descriptions", [])
        return {
            item.get("entity")
            for item in description
            if item.get("entity") is not None
        }

    @staticmethod
    def _predicate_text(statement):
        return str(statement.compile(compile_kwargs={"literal_binds": True}))


def make_profile(user_id):
    return SimpleNamespace(id=uuid4(), user_id=user_id)


def make_resume(profile_id):
    return SimpleNamespace(
        id=uuid4(),
        candidate_profile_id=profile_id,
    )


def test_resume_query_requires_candidate_profile_ownership():
    candidate_a_user_id = uuid4()
    candidate_a_profile = make_profile(candidate_a_user_id)

    candidate_b_profile = make_profile(uuid4())
    candidate_b_resume = make_resume(candidate_b_profile.id)

    db = OwnershipTestDB(
        profile=candidate_a_profile,
        owned_resume=candidate_b_resume,
    )

    # Candidate A requests Candidate B's resume.
    result = db.scalar(
        __import__("sqlalchemy").select(Resume).where(
            Resume.id == candidate_b_resume.id,
            Resume.candidate_profile_id == candidate_a_profile.id,
        )
    )

    assert result is None


def test_resume_listing_query_filters_by_candidate_profile():
    candidate_a_user_id = uuid4()
    candidate_a_profile = make_profile(candidate_a_user_id)

    db = OwnershipTestDB(
        profile=candidate_a_profile,
        owned_resume=None,
    )

    statement = (
        __import__("sqlalchemy")
        .select(Resume)
        .where(Resume.candidate_profile_id == candidate_a_profile.id)
    )

    db.scalars(statement)

    sql = str(statement.compile(compile_kwargs={"literal_binds": True}))
    assert "candidate_profile_id" in sql
    assert candidate_a_profile.id.hex in sql


from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.core.database import get_db
from app.core.dependencies import get_current_user


class CandidateIsolationDB:
    def __init__(self, profile):
        self.profile = profile
        self.resume_queries = []

    def scalar(self, statement):
        entities = {
            item.get("entity")
            for item in getattr(statement, "column_descriptions", [])
        }

        if CandidateProfile in entities:
            return self.profile

        if Resume in entities:
            sql = str(
                statement.compile(
                    compile_kwargs={"literal_binds": True}
                )
            )
            self.resume_queries.append(sql)
            # No resume matches the logged-in candidate's ownership query.
            return None

        return None


@pytest.mark.parametrize(
    ("method", "path_suffix"),
    [
        ("get", "/analysis"),
        ("post", "/reanalyze"),
        ("delete", ""),
    ],
)
def test_resume_endpoints_reject_unowned_resume(
    method, path_suffix
):
    candidate_user_id = uuid4()
    candidate_profile = make_profile(candidate_user_id)
    db = CandidateIsolationDB(candidate_profile)

    current_user = SimpleNamespace(
        id=candidate_user_id,
        role="CANDIDATE",
        is_active=True,
    )

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: current_user

    try:
        with TestClient(app) as client:
            foreign_resume_id = uuid4()
            path = (
                f"/api/v1/candidates/resumes/"
                f"{foreign_resume_id}{path_suffix}"
            )

            response = getattr(client, method)(path)

        assert response.status_code == 404, response.text
        assert db.resume_queries, "Expected a resume ownership query"

        # The query must constrain the requested resume to this profile.
        assert any(
            "candidate_profile_id" in sql
            and candidate_profile.id.hex in sql.replace("-", "")
            for sql in db.resume_queries
        ), "Resume query did not enforce candidate ownership"

    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
