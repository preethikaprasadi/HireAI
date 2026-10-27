from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.dependencies import (
    require_candidate,
    require_recruiter,
)
from app.routers.company_members import require_company_owner


def make_user(role):
    return SimpleNamespace(
        id=uuid4(),
        role=role,
        is_active=True,
    )


def test_candidate_is_allowed_candidate_guard():
    user = make_user("CANDIDATE")

    assert require_candidate(user) is user


def test_recruiter_is_rejected_by_candidate_guard():
    user = make_user("RECRUITER")

    with pytest.raises(HTTPException) as exc:
        require_candidate(user)

    assert exc.value.status_code == 403


def test_recruiter_is_allowed_recruiter_guard():
    user = make_user("RECRUITER")

    assert require_recruiter(user) is user


def test_candidate_is_rejected_by_recruiter_guard():
    user = make_user("CANDIDATE")

    with pytest.raises(HTTPException) as exc:
        require_recruiter(user)

    assert exc.value.status_code == 403


def test_company_owner_can_pass_owner_check(monkeypatch):
    company_id = uuid4()
    user = make_user("RECRUITER")
    membership = SimpleNamespace(role="OWNER")

    monkeypatch.setattr(
        "app.routers.company_members.get_membership",
        lambda company_id, user_id, db: membership,
    )

    result = require_company_owner(
        company_id,
        user,
        db=object(),
    )

    assert result is membership


def test_company_recruiter_cannot_pass_owner_check(monkeypatch):
    company_id = uuid4()
    user = make_user("RECRUITER")
    membership = SimpleNamespace(role="RECRUITER")

    monkeypatch.setattr(
        "app.routers.company_members.get_membership",
        lambda company_id, user_id, db: membership,
    )

    with pytest.raises(HTTPException) as exc:
        require_company_owner(
            company_id,
            user,
            db=object(),
        )

    assert exc.value.status_code == 403


def test_nonmember_cannot_pass_owner_check(monkeypatch):
    company_id = uuid4()
    user = make_user("RECRUITER")

    monkeypatch.setattr(
        "app.routers.company_members.get_membership",
        lambda company_id, user_id, db: None,
    )

    with pytest.raises(HTTPException) as exc:
        require_company_owner(
            company_id,
            user,
            db=object(),
        )

    assert exc.value.status_code == 404
