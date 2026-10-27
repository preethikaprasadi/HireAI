from app.services.matching_engine import (
    normalize_skill_name,
    normalize_role_title,
    calculate_skill_match,
    calculate_experience_match,
    calculate_role_match,
)
from app.services.candidate_matcher import calculate_overall_match


def test_skill_match_scores_required_and_preferred_skills():
    result = calculate_skill_match(
        candidate_skills=["Python", "React"],
        job_skills=[
            {
                "skill_name": "Python",
                "requirement_type": "REQUIRED",
                "importance": 10,
            },
            {
                "skill_name": "FastAPI",
                "requirement_type": "REQUIRED",
                "importance": 5,
            },
            {
                "skill_name": "React",
                "requirement_type": "PREFERRED",
                "importance": 5,
            },
        ],
    )

    assert result["score"] == 75.0
    assert result["matched_required"] == ["Python"]
    assert result["matched_preferred"] == ["React"]
    assert result["missing_required"] == ["FastAPI"]
    assert result["missing_preferred"] == []


def test_skill_aliases_are_normalized():
    assert normalize_skill_name("React.js") == "react"
    assert normalize_skill_name("HTML5") == "html"
    assert normalize_skill_name("Node.js") == "node"
    assert normalize_skill_name("Git (Version controlling)") == "git"


def test_skill_match_with_no_job_skills_returns_zero():
    result = calculate_skill_match(
        candidate_skills=["Python"],
        job_skills=[],
    )

    assert result["score"] == 0.0
    assert result["matched_required"] == []
    assert result["missing_required"] == []


def test_experience_within_range_meets_requirement():
    result = calculate_experience_match(
        candidate_years=3.0,
        experience_min=2.0,
        experience_max=4.0,
    )

    assert result["score"] == 100.0
    assert result["status"] == "MEETS_REQUIREMENT"


def test_missing_candidate_experience_is_unknown():
    result = calculate_experience_match(
        candidate_years=None,
        experience_min=2.0,
        experience_max=4.0,
    )

    assert result["score"] == 0.0
    assert result["status"] == "UNKNOWN"


def test_experience_without_job_requirement_is_full_score():
    result = calculate_experience_match(
        candidate_years=None,
        experience_min=None,
        experience_max=None,
    )

    assert result["score"] == 100.0
    assert result["status"] == "NO_REQUIREMENT"


def test_backend_and_frontend_titles_do_not_match():
    result = calculate_role_match(
        job_title="Backend Developer",
        candidate_job_titles=["Frontend Developer"],
    )

    assert result["score"] == 0.0
    assert result["status"] == "NO_MATCH"


def test_matching_backend_developer_titles_are_a_strong_match():
    result = calculate_role_match(
        job_title="Backend Developer",
        candidate_job_titles=["Backend Developer"],
    )

    assert result["score"] == 100.0
    assert result["status"] == "STRONG_MATCH"
    assert result["matched_title"] == "Backend Developer"


def test_empty_role_title_returns_unknown():
    result = calculate_role_match(
        job_title="",
        candidate_job_titles=["Backend Developer"],
    )

    assert result["score"] == 0.0
    assert result["status"] == "UNKNOWN"


def test_overall_match_combines_component_scores():
    result = calculate_overall_match(
        skill_match={
            "score": 100.0,
            "matched_required": ["Python"],
            "matched_preferred": [],
            "missing_required": [],
            "missing_preferred": [],
        },
        experience_match={
            "score": 100.0,
            "status": "MEETS_REQUIREMENT",
        },
        role_match={
            "score": 100.0,
            "status": "STRONG_MATCH",
            "matched_title": "Backend Developer",
        },
        semantic_match={
            "score": 80.0,
            "status": "STRONG_MATCH",
        },
    )

    assert result["score"] == 95.0
    assert result["status"] == "STRONG_MATCH"
    assert result["components"]["semantic"] == 80.0
    assert result["details"]["matched_required"] == ["Python"]
def test_skill_match_with_zero_total_weight_returns_zero():
    result = calculate_skill_match(
        candidate_skills=["Python"],
        job_skills=[
            {
                "skill_name": "Python",
                "requirement_type": "REQUIRED",
                "importance": 0,
            }
        ],
    )

    assert result["score"] == 0.0


def test_experience_below_minimum_returns_partial_score():
    result = calculate_experience_match(
        candidate_years=1.0,
        experience_min=2.0,
        experience_max=5.0,
    )

    assert result["score"] == 50.0
    assert result["status"] == "BELOW_REQUIREMENT"


def test_zero_minimum_experience_does_not_divide_by_zero():
    result = calculate_experience_match(
        candidate_years=0.0,
        experience_min=0.0,
        experience_max=3.0,
    )

    assert result["score"] == 100.0
    assert result["status"] == "MEETS_REQUIREMENT"


def test_experience_above_maximum_returns_full_score():
    result = calculate_experience_match(
        candidate_years=6.0,
        experience_min=2.0,
        experience_max=5.0,
    )

    assert result["score"] == 100.0
    assert result["status"] == "ABOVE_RANGE"


def test_role_match_with_no_candidate_titles_returns_no_match():
    result = calculate_role_match(
        job_title="Backend Developer",
        candidate_job_titles=[],
    )

    assert result["score"] == 0.0
    assert result["status"] == "NO_MATCH"
