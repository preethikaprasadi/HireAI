from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db
from app.core.dependencies import get_current_user


class FakeQueryResult:
    def all(self):
        return []


class FakeDB:
    def scalar(self, statement):
        return None

    def scalars(self, statement):
        return FakeQueryResult()


def override_get_db():
    yield FakeDB()


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def fake_user(role):
    return SimpleNamespace(
        id=uuid4(),
        role=role,
        is_active=True,
    )


def authenticate_as(role):
    user = fake_user(role)
    app.dependency_overrides[get_current_user] = lambda: user
    return user


def test_login_rejects_unknown_email(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401


def test_me_rejects_missing_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


def test_me_rejects_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


def test_recruiter_cannot_access_candidate_profile(client):
    authenticate_as("RECRUITER")

    response = client.get("/api/v1/candidates/profile")

    assert response.status_code == 403


def test_candidate_can_reach_own_profile_endpoint(client):
    authenticate_as("CANDIDATE")

    response = client.get("/api/v1/candidates/profile")

    # Fake DB has no profile, so the endpoint should return 404,
    # rather than rejecting the candidate's role.
    assert response.status_code == 404


def test_candidate_cannot_access_recruiter_candidates(client):
    authenticate_as("CANDIDATE")

    response = client.get("/api/v1/candidates/recruiter")

    assert response.status_code == 403


def test_recruiter_can_reach_recruiter_candidates_endpoint(client):
    authenticate_as("RECRUITER")

    response = client.get("/api/v1/candidates/recruiter")

    assert response.status_code == 200
    assert response.json() == {"candidates": [], "count": 0}
