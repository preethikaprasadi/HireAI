from typing import Any


def extract_candidate_matching_data(
    structured_data: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Extract matching-related information from ResumeAnalysis.structured_data.
    """

    if not structured_data:
        return {
            "candidate_name": None,
            "skills": [],
            "job_titles": [],
            "experience": [],
            "candidate_years": None,
            "summary": None,
        }

    candidate = structured_data.get("candidate") or {}

    raw_skills = structured_data.get("skills") or []

    skills = []

    for item in raw_skills:
        if isinstance(item, str):
            name = item
        elif isinstance(item, dict):
            name = (
                item.get("name")
                or item.get("skill")
                or item.get("skill_name")
                or item.get("title")
            )
        else:
            continue

        if isinstance(name, str) and name.strip():
            skills.append(name.strip())

    job_titles = structured_data.get("job_titles") or []
    experience = structured_data.get("experience") or []
    summary = structured_data.get("summary")

    candidate_years = None

    if experience:
        candidate_years = _calculate_experience_years(
            experience
        )

    return {
        "candidate_name": candidate.get("name"),
        "skills": skills,
        "job_titles": job_titles,
        "experience": experience,
        "candidate_years": candidate_years,
        "summary": summary,
    }


def _calculate_experience_years(
    experience: list[dict[str, Any]],
) -> float | None:
    """
    Calculate approximate total years of experience from
    structured resume experience entries.

    This is intentionally conservative. If dates cannot
    be interpreted reliably, return None.
    """

    if not experience:
        return None

    total_months = 0

    for item in experience:
        if not isinstance(item, dict):
            continue

        start_date = item.get("start_date")
        end_date = item.get("end_date")

        if not start_date:
            continue

        start = _parse_year_month(start_date)

        if start is None:
            continue

        if end_date:
            end = _parse_year_month(end_date)
        else:
            end = None

        if end is None:
            continue

        months = (
            (end[0] - start[0]) * 12
            + (end[1] - start[1])
        )

        if months > 0:
            total_months += months

    if total_months == 0:
        return None

    return round(total_months / 12, 1)


def _parse_year_month(
    value: str,
) -> tuple[int, int] | None:
    """
    Convert common date formats into (year, month).
    """

    if not value:
        return None

    value = str(value).strip().lower()

    # YYYY
    if len(value) == 4 and value.isdigit():
        return int(value), 1

    # YYYY-MM
    parts = value.split("-")

    if len(parts) == 2:
        try:
            year = int(parts[0])
            month = int(parts[1])

            if 1 <= month <= 12:
                return year, month
        except ValueError:
            pass

    # YYYY-MM-DD
    if len(parts) == 3:
        try:
            year = int(parts[0])
            month = int(parts[1])

            if 1 <= month <= 12:
                return year, month
        except ValueError:
            pass

    return None
