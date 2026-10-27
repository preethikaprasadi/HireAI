from typing import Any


def calculate_overall_match(
    skill_match: dict[str, Any],
    experience_match: dict[str, Any],
    role_match: dict[str, Any],
    semantic_match: dict[str, Any],
) -> dict[str, Any]:
    """
    Combine the individual matching signals into one
    explainable candidate-job match score.
    """

    skill_score = skill_match.get("score", 0.0)
    experience_score = experience_match.get("score", 0.0)
    role_score = role_match.get("score", 0.0)
    semantic_score = semantic_match.get("score", 0.0)

    # Weighted scoring.
    #
    # Skills are the strongest signal because they represent
    # concrete technical/job requirements.
    #
    # Semantic similarity provides broader contextual matching.
    #
    # Experience and role provide additional supporting signals.

    overall_score = (
        skill_score * 0.35
        + experience_score * 0.20
        + role_score * 0.20
        + semantic_score * 0.25
    )

    overall_score = round(overall_score, 2)

    if overall_score >= 80:
        status = "STRONG_MATCH"
    elif overall_score >= 60:
        status = "GOOD_MATCH"
    elif overall_score >= 40:
        status = "POTENTIAL_MATCH"
    else:
        status = "LOW_MATCH"

    return {
        "score": overall_score,
        "status": status,
        "components": {
            "skill": round(skill_score, 2),
            "experience": round(experience_score, 2),
            "role": round(role_score, 2),
            "semantic": round(semantic_score, 2),
        },
        "details": {
            "matched_required": skill_match.get(
                "matched_required",
                [],
            ),
            "matched_preferred": skill_match.get(
                "matched_preferred",
                [],
            ),
            "missing_required": skill_match.get(
                "missing_required",
                [],
            ),
            "missing_preferred": skill_match.get(
                "missing_preferred",
                [],
            ),
            "experience_status": experience_match.get(
                "status",
            ),
            "role_status": role_match.get(
                "status",
            ),
            "matched_title": role_match.get(
                "matched_title",
            ),
            "semantic_status": semantic_match.get(
                "status",
            ),
        },
    }
