from app.services.matching_engine import calculate_experience_match


test_cases = [
    {
        "candidate_years": 3,
        "experience_min": 2,
        "experience_max": 4,
    },
    {
        "candidate_years": 1,
        "experience_min": 2,
        "experience_max": 4,
    },
    {
        "candidate_years": 5,
        "experience_min": 2,
        "experience_max": 4,
    },
    {
        "candidate_years": None,
        "experience_min": 2,
        "experience_max": 4,
    },
    {
        "candidate_years": 3,
        "experience_min": None,
        "experience_max": None,
    },
]


for case in test_cases:
    result = calculate_experience_match(**case)

    print(
        f"Candidate: {case['candidate_years']} years | "
        f"Required: {case['experience_min']}–"
        f"{case['experience_max']} | "
        f"Result: {result}"
    )
