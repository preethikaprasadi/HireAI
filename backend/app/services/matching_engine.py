import re
from typing import Any


ROLE_WORD_GROUPS = {
    "developer": {"developer", "dev", "programmer"},
    "engineer": {"engineer", "engineering"},
    "software": {"software"},
    "backend": {"backend", "back-end"},
    "frontend": {"frontend", "front-end"},
    "fullstack": {"fullstack", "full-stack"},
    "data": {"data"},
    "scientist": {"scientist", "science"},
    "analyst": {"analyst", "analysis"},
    "machine": {"machine"},
    "learning": {"learning"},
    "ai": {"ai", "artificial", "intelligence"},
    "ml": {"ml", "machine", "learning"},
    "web": {"web"},
    "mobile": {"mobile"},
    "devops": {"devops", "dev-ops"},
}


def normalize_role_title(title: str) -> set[str]:
    """
    Convert a job title into normalized role concepts.
    """

    if not title:
        return set()

    text = title.lower()

    text = re.sub(r"[^a-z0-9\s-]", " ", text)

    words = set(text.split())

    normalized = set()

    for word in words:
        for canonical, variations in ROLE_WORD_GROUPS.items():
            if word in variations:
                normalized.add(canonical)

    return normalized


SKILL_ALIASES = {
    "reactjs": "react",
    "react": "react",
    "mongodb": "mongodb",
    "mongodbdatabase": "mongodb",
    "mongodatabase": "mongodb",
    "html5": "html",
    "gitversioncontrol": "git",
    "javascript": "javascript",
    "typescript": "typescript",
    "gitversioncontrol": "git",
    "gitversioncontrolling": "git",  # Fix for your current resume
    "git": "git",
    "nodejs": "node",
    "node": "node",
}

#51c6b0e1-f28a-4eea-8288-e5814d0e98f2
def normalize_skill_name(skill: str) -> str:
    """Normalize skill names and resolve explicitly defined aliases."""
    skill = skill.strip().lower()

    # Remove descriptive text in parentheses, e.g. Git (Version controlling)
    skill = re.sub(r"\s*\([^)]*\)", "", skill)

    skill = skill.replace(".js", "js")
    normalized = re.sub(r"[^a-z0-9+#]+", "", skill)

    return SKILL_ALIASES.get(normalized, normalized)


def calculate_skill_match(
    candidate_skills: list[str],
    job_skills: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Compare candidate skills against the skills required by a job.
    """

    candidate_normalized = {
        normalize_skill_name(skill)
        for skill in candidate_skills
        if isinstance(skill, str) and skill.strip()
    }

    matched_required = []
    matched_preferred = []
    missing_required = []
    missing_preferred = []

    total_weight = 0
    matched_weight = 0

    for job_skill in job_skills:
        skill_name = job_skill["skill_name"].strip()
        normalized_name = normalize_skill_name(skill_name)

        requirement_type = job_skill["requirement_type"]
        importance = job_skill["importance"]

        total_weight += importance

        print("DEBUG job skill:", repr(skill_name))
        print("DEBUG normalized job skill:", repr(normalized_name))
        print("DEBUG candidate skills:", sorted(candidate_normalized))

        if normalized_name in candidate_normalized:
            matched_weight += importance

            if requirement_type == "REQUIRED":
                matched_required.append(skill_name)
            else:
                matched_preferred.append(skill_name)

        else:
            if requirement_type == "REQUIRED":
                missing_required.append(skill_name)
            else:
                missing_preferred.append(skill_name)

    if total_weight == 0:
        score = 0.0
    else:
        score = (matched_weight / total_weight) * 100

    return {
        "score": round(score, 2),
        "matched_required": matched_required,
        "matched_preferred": matched_preferred,
        "missing_required": missing_required,
        "missing_preferred": missing_preferred,
    }

def calculate_experience_match(
    candidate_years: float | None,
    experience_min: float | None,
    experience_max: float | None,
) -> dict:
    """
    Compare candidate experience against the job's experience range.
    """

    # Job does not specify an experience requirement.
    if experience_min is None and experience_max is None:
        return {
            "score": 100.0,
            "candidate_years": candidate_years,
            "required_min": None,
            "required_max": None,
            "status": "NO_REQUIREMENT",
        }

    # Candidate has no experience information.
    if candidate_years is None:
        return {
            "score": 0.0,
            "candidate_years": None,
            "required_min": experience_min,
            "required_max": experience_max,
            "status": "UNKNOWN",
        }

    # Minimum experience requirement.
    if (
        experience_min is not None
        and candidate_years < experience_min
    ):
        if experience_min == 0:
            score = 100.0
        else:
            score = min(
                100.0,
                (candidate_years / experience_min) * 100,
            )

        return {
            "score": round(score, 2),
            "candidate_years": candidate_years,
            "required_min": experience_min,
            "required_max": experience_max,
            "status": "BELOW_REQUIREMENT",
        }

    # Candidate is within the requested range.
    if (
        experience_min is not None
        and (
            experience_max is None
            or candidate_years <= experience_max
        )
    ):
        return {
            "score": 100.0,
            "candidate_years": candidate_years,
            "required_min": experience_min,
            "required_max": experience_max,
            "status": "MEETS_REQUIREMENT",
        }

    # Candidate exceeds the maximum.
    if (
        experience_max is not None
        and candidate_years > experience_max
    ):
        return {
            "score": 100.0,
            "candidate_years": candidate_years,
            "required_min": experience_min,
            "required_max": experience_max,
            "status": "ABOVE_RANGE",
        }

    return {
        "score": 0.0,
        "candidate_years": candidate_years,
        "required_min": experience_min,
        "required_max": experience_max,
        "status": "UNKNOWN",
    }

def calculate_role_match(
    job_title: str,
    candidate_job_titles: list[str],
) -> dict:
    """
    Compare the job title with titles extracted from the candidate resume.

    The matcher distinguishes between:
    - core role/domain concepts
    - generic title words

    This prevents titles such as Backend Developer and
    Frontend Developer from receiving a strong match merely
    because both contain "Developer".
    """

    job_concepts = normalize_role_title(job_title)

    if not job_concepts:
        return {
            "score": 0.0,
            "job_title": job_title,
            "matched_title": None,
            "status": "UNKNOWN",
        }

    generic_concepts = {
        "developer",
        "engineer",
        "scientist",
        "analyst",
    }

    job_core = job_concepts - generic_concepts

    best_score = 0.0
    best_title = None
    best_status = "NO_MATCH"

    for candidate_title in candidate_job_titles:
        candidate_concepts = normalize_role_title(candidate_title)

        if not candidate_concepts:
            continue

        candidate_core = candidate_concepts - generic_concepts

        conflicting_domains = {
            ("backend", "frontend"),
            ("frontend", "backend"),
            ("backend", "mobile"),
            ("mobile", "backend"),
        }

        has_conflict = any(
            (job_concept, candidate_concept) in conflicting_domains
            for job_concept in job_core
            for candidate_concept in candidate_core
        )

        if has_conflict:
            score = 0.0
            status = "NO_MATCH"

        else:
            core_intersection = job_core & candidate_core

            if not core_intersection:
                score = 0.0
                status = "NO_MATCH"

            else:
                core_score = (
                    len(core_intersection)
                    / len(job_core)
                ) * 100

                generic_intersection = (
                    job_concepts
                    & candidate_concepts
                    & generic_concepts
                )

                if generic_intersection:
                    score = core_score
                else:
                    score = core_score * 0.9

                if score >= 90:
                    status = "STRONG_MATCH"
                elif score >= 50:
                    status = "RELATED"
                else:
                    status = "PARTIAL"

        if score > best_score:
            best_score = score
            best_title = candidate_title
            best_status = status

    return {
        "score": round(best_score, 2),
        "job_title": job_title,
        "matched_title": best_title,
        "status": best_status,
    }
