from app.services.matching_engine import calculate_skill_match


candidate_skills = [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "JavaScript",
    "Machine Learning",
]


job_skills = [
    {
        "skill_name": "Python",
        "requirement_type": "REQUIRED",
        "importance": 10,
    },
    {
        "skill_name": "FastAPI",
        "requirement_type": "REQUIRED",
        "importance": 9,
    },
    {
        "skill_name": "PostgreSQL",
        "requirement_type": "REQUIRED",
        "importance": 8,
    },
    {
        "skill_name": "React",
        "requirement_type": "PREFERRED",
        "importance": 5,
    },
]


result = calculate_skill_match(
    candidate_skills=candidate_skills,
    job_skills=job_skills,
)

print(result)
