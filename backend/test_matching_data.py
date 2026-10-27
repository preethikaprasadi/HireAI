from app.services.matching_data import (
    extract_candidate_matching_data,
)


sample_resume = {
    "candidate": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+94771234567",
    },
    "summary": (
        "Backend developer with experience building "
        "Python applications and REST APIs."
    ),
    "skills": [
        "Python",
        "FastAPI",
        "PostgreSQL",
        "Machine Learning",
    ],
    "job_titles": [
        "Backend Developer",
        "Software Engineer",
    ],
    "experience": [
        {
            "company": "ABC Technologies",
            "job_title": "Backend Developer",
            "start_date": "2022-01",
            "end_date": "2024-06",
            "description": (
                "Developed REST APIs using Python and FastAPI."
            ),
        },
        {
            "company": "XYZ Solutions",
            "job_title": "Software Engineer",
            "start_date": "2024-07",
            "end_date": "2026-01",
            "description": (
                "Built backend services and databases."
            ),
        },
    ],
    "education": [],
    "projects": [],
    "certifications": [],
}


result = extract_candidate_matching_data(
    sample_resume
)

print("\nExtracted matching data:")
print(result)
