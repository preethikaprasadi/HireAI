from app.services.matching_engine import calculate_role_match


test_cases = [
    {
        "job_title": "Python Backend Developer",
        "candidate_job_titles": [
            "Backend Developer",
            "Software Engineer",
        ],
    },
    {
        "job_title": "Data Scientist",
        "candidate_job_titles": [
            "Data Science Intern",
        ],
    },
    {
        "job_title": "Frontend Developer",
        "candidate_job_titles": [
            "Backend Developer",
        ],
    },
    {
        "job_title": "Machine Learning Engineer",
        "candidate_job_titles": [
            "Machine Learning Engineer",
        ],
    },
]


for case in test_cases:
    result = calculate_role_match(**case)

    print(
        f"\nJob: {case['job_title']}"
    )
    print(
        f"Candidate titles: {case['candidate_job_titles']}"
    )
    print(f"Result: {result}")
