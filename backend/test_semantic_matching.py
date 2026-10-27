from app.services.semantic_matcher import calculate_semantic_match


test_cases = [
    {
        "job_text": """
        Python Backend Developer.
        Build REST APIs using FastAPI.
        Work with PostgreSQL databases.
        Develop scalable backend services.
        """,
        "candidate_text": """
        Developed backend applications using Python and FastAPI.
        Created REST APIs and worked with PostgreSQL databases.
        Built scalable server-side services.
        """,
    },
    {
        "job_text": """
        Frontend Developer.
        Build responsive interfaces using React and JavaScript.
        """,
        "candidate_text": """
        Worked as a backend developer using Python, FastAPI,
        PostgreSQL, and REST APIs.
        """,
    },
    {
        "job_text": """
        Machine Learning Engineer.
        Develop machine learning models and data processing pipelines.
        """,
        "candidate_text": """
        Built machine learning models using Python.
        Worked on data preprocessing and model evaluation.
        """,
    },
]


for index, test_case in enumerate(test_cases, start=1):
    result = calculate_semantic_match(
        job_text=test_case["job_text"],
        candidate_text=test_case["candidate_text"],
    )

    print(f"\nTest case {index}")
    print(result)
