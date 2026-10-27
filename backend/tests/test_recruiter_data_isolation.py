
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.models.application import Application
from app.models.job import Job
from app.models.company_member import CompanyMember
from app.models.department_member import DepartmentMember
from app.routers.applications import (
    can_access_job,
    get_application_with_company_access,
)


class RecruiterAccessDB:
    def __init__(
        self,
        application=None,
        job=None,
        membership=None,
        department_assignment=None,
    ):
        self.application = application
        self.job = job
        self.membership = membership
        self.department_assignment = department_assignment

    def scalar(self, statement):
        entities = {
            item.get("entity")
            for item in getattr(statement, "column_descriptions", [])
        }

        if Application in entities:
            return self.application
        if Job in entities:
            return self.job
        if CompanyMember in entities:
            return self.membership
        if DepartmentMember in entities:
            return self.department_assignment

        return None


def make_job(created_by, department_id=None):
    return SimpleNamespace(
        id=uuid4(),
        company_id=uuid4(),
        created_by=created_by,
        department_id=department_id,
    )


def test_recruiter_cannot_access_job_from_another_company():
    recruiter_id = uuid4()
    job = make_job(created_by=uuid4())
    application = SimpleNamespace(
        id=uuid4(),
        job_id=job.id,
    )
    db = RecruiterAccessDB(
        application=application,
        job=job,
        membership=None,
    )
    recruiter = SimpleNamespace(id=recruiter_id, role="RECRUITER")

    with pytest.raises(HTTPException) as exc:
        get_application_with_company_access(
            application.id,
            recruiter,
            db,
        )

    assert exc.value.status_code == 404


def test_recruiter_cannot_access_unassigned_job():
    recruiter_id = uuid4()
    job = make_job(
        created_by=uuid4(),
        department_id=uuid4(),
    )
    membership = SimpleNamespace(
        company_id=job.company_id,
        user_id=recruiter_id,
        role="RECRUITER",
    )
    recruiter = SimpleNamespace(id=recruiter_id, role="RECRUITER")
    db = RecruiterAccessDB(department_assignment=None)

    assert can_access_job(job, recruiter, membership, db) is False


def test_job_creator_can_access_own_job():
    recruiter_id = uuid4()
    job = make_job(created_by=recruiter_id)
    membership = SimpleNamespace(role="RECRUITER")
    recruiter = SimpleNamespace(id=recruiter_id, role="RECRUITER")
    db = RecruiterAccessDB()

    assert can_access_job(job, recruiter, membership, db) is True


def test_company_owner_can_access_company_job():
    recruiter_id = uuid4()
    job = make_job(created_by=uuid4())
    membership = SimpleNamespace(role="OWNER")
    recruiter = SimpleNamespace(id=recruiter_id, role="RECRUITER")
    db = RecruiterAccessDB()

    assert can_access_job(job, recruiter, membership, db) is True
