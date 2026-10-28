from sqlalchemy.dialects import postgresql
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.company_member import CompanyMember
from app.models.department import Department
from app.models.department_member import DepartmentMember
from app.routers import company_members, jobs


class FakeDB:
    def __init__(self, scalar_results=None, assignments=None):
        self.scalar_results = list(scalar_results or [])
        self.assignments = list(assignments or [])
        self.deleted = []
        self.committed = False
        self.refreshed = []

    def scalar(self, statement):
        if self.scalar_results:
            return self.scalar_results.pop(0)
        return None

    def scalars(self, statement):
        return SimpleNamespace(all=lambda: self.assignments)

    def delete(self, obj):
        self.deleted.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed.append(obj)


def test_update_job_department_id_synchronizes_name(monkeypatch):
    department_id = uuid4()
    company_id = uuid4()

    department = SimpleNamespace(
        id=department_id,
        company_id=company_id,
        name="Engineering",
    )
    job = SimpleNamespace(
        id=uuid4(),
        company_id=company_id,
        status="DRAFT",
        department_id=None,
        department=None,
    )
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        jobs,
        "get_managed_job",
        lambda job_id, current_user, db: job,
    )
    monkeypatch.setattr(
        jobs,
        "validate_department",
        lambda department_id, company_id, db: department,
    )

    db = FakeDB()

    result = jobs.update_job(
        job.id,
        jobs.JobUpdate(department_id=department_id),
        user,
        db,
    )

    assert result.department_id == department_id
    assert result.department == "Engineering"
    assert db.committed is True


def test_update_job_clears_department_fields(monkeypatch):
    company_id = uuid4()
    job = SimpleNamespace(
        id=uuid4(),
        company_id=company_id,
        status="DRAFT",
        department_id=uuid4(),
        department="Engineering",
    )
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        jobs,
        "get_managed_job",
        lambda job_id, current_user, db: job,
    )
    monkeypatch.setattr(
        jobs,
        "validate_department",
        lambda department_id, company_id, db: None,
    )

    db = FakeDB()

    result = jobs.update_job(
        job.id,
        jobs.JobUpdate(department_id=None),
        user,
        db,
    )

    assert result.department_id is None
    assert result.department is None
    assert db.committed is True


def test_update_job_rejects_department_name_only_change(monkeypatch):
    job = SimpleNamespace(
        id=uuid4(),
        company_id=uuid4(),
        status="DRAFT",
        department_id=uuid4(),
        department="Engineering",
    )
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        jobs,
        "get_managed_job",
        lambda job_id, current_user, db: job,
    )

    with pytest.raises(HTTPException) as exc:
        jobs.update_job(
            job.id,
            jobs.JobUpdate(department="Marketing"),
            user,
            FakeDB(),
        )

    assert exc.value.status_code == 422
    assert job.department == "Engineering"


def test_update_job_rejects_department_from_another_company(monkeypatch):
    job = SimpleNamespace(
        id=uuid4(),
        company_id=uuid4(),
        status="DRAFT",
        department_id=None,
        department=None,
    )
    user = SimpleNamespace(id=uuid4())
    foreign_department_id = uuid4()

    monkeypatch.setattr(
        jobs,
        "get_managed_job",
        lambda job_id, current_user, db: job,
    )

    def reject_foreign_department(department_id, company_id, db):
        raise HTTPException(
            status_code=422,
            detail="The selected department does not belong to this company.",
        )

    monkeypatch.setattr(
        jobs,
        "validate_department",
        reject_foreign_department,
    )

    with pytest.raises(HTTPException) as exc:
        jobs.update_job(
            job.id,
            jobs.JobUpdate(department_id=foreign_department_id),
            user,
            FakeDB(),
        )

    assert exc.value.status_code == 422


def test_remove_recruiter_deletes_membership_and_assignments(monkeypatch):
    company_id = uuid4()
    recruiter_id = uuid4()
    member_id = uuid4()

    owner = SimpleNamespace(id=uuid4())
    membership = SimpleNamespace(role="OWNER")
    recruiter_membership = SimpleNamespace(
        id=member_id,
        user_id=recruiter_id,
        role="RECRUITER",
    )
    assignment = SimpleNamespace(
        department_id=uuid4(),
        user_id=recruiter_id,
    )

    monkeypatch.setattr(
        company_members,
        "require_company_owner",
        lambda company_id, current_user, db: membership,
    )

    db = FakeDB(
        scalar_results=[recruiter_membership],
        assignments=[assignment],
    )

    result = company_members.remove_company_member(
        company_id,
        member_id,
        owner,
        db,
    )

    assert result is None
    assert assignment in db.deleted
    assert recruiter_membership in db.deleted
    assert db.committed is True


def test_remove_company_member_cannot_remove_owner(monkeypatch):
    company_id = uuid4()
    member_id = uuid4()
    owner = SimpleNamespace(id=uuid4())

    owner_membership = SimpleNamespace(
        id=member_id,
        user_id=owner.id,
        role="OWNER",
    )

    monkeypatch.setattr(
        company_members,
        "require_company_owner",
        lambda company_id, current_user, db: owner_membership,
    )

    db = FakeDB(scalar_results=[owner_membership])

    with pytest.raises(HTTPException) as exc:
        company_members.remove_company_member(
            company_id,
            member_id,
            owner,
            db,
        )

    assert exc.value.status_code == 400
    assert db.deleted == []
    assert db.committed is False

def test_validate_department_scopes_query_to_company():
    company_id = uuid4()
    department_id = uuid4()

    class QueryCheckingDB:
        def scalar(self, statement):
            params = statement.compile(
                dialect=postgresql.dialect()
            ).params

            assert department_id in params.values()
            assert company_id in params.values()

            # Simulate the department not being found
            # within the requested company.
            return None

    with pytest.raises(HTTPException) as exc:
        jobs.validate_department(
            department_id=department_id,
            company_id=company_id,
            db=QueryCheckingDB(),
        )

    assert exc.value.status_code == 422

def test_remove_recruiter_cleanup_query_is_company_scoped(monkeypatch):
    company_id = uuid4()
    recruiter_id = uuid4()
    member_id = uuid4()

    owner = SimpleNamespace(id=uuid4())
    owner_membership = SimpleNamespace(role="OWNER")
    recruiter_membership = SimpleNamespace(
        id=member_id,
        user_id=recruiter_id,
        role="RECRUITER",
    )
    assignment = SimpleNamespace(
        department_id=uuid4(),
        user_id=recruiter_id,
    )

    class QueryCheckingDB:
        def __init__(self):
            self.deleted = []
            self.committed = False
            self.cleanup_query_checked = False

        def scalar(self, statement):
            return recruiter_membership

        def scalars(self, statement):
            params = statement.compile(
                dialect=postgresql.dialect()
            ).params

            assert company_id in params.values()
            assert recruiter_id in params.values()

            self.cleanup_query_checked = True

            return SimpleNamespace(all=lambda: [assignment])

        def delete(self, obj):
            self.deleted.append(obj)

        def commit(self):
            self.committed = True

    monkeypatch.setattr(
        company_members,
        "require_company_owner",
        lambda company_id, current_user, db: owner_membership,
    )

    db = QueryCheckingDB()

    company_members.remove_company_member(
        company_id,
        member_id,
        owner,
        db,
    )

    assert db.cleanup_query_checked is True
    assert assignment in db.deleted
    assert recruiter_membership in db.deleted
    assert db.committed is True