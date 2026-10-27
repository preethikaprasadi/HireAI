from app.services.matching_engine import (
    calculate_skill_match,
    calculate_experience_match,
    calculate_role_match,
)

from app.services.semantic_matcher import (
    calculate_semantic_match,
)

from app.services.candidate_matcher import (
    calculate_overall_match,
)


# ---------------------------------------------------------
# Candidate data
# ---------------------------------------------------------

candidate_skills = [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Machine Learning",
]

candidate_years = 3.0

candidate_job_titles = [
    "Backend Developer",
    "Software Engineer",
]

candidate_resume_text = """
Software Engineer with 3 years of experience developing
backend applications using Python and FastAPI.

Experienced in building REST APIs, PostgreSQL databases,
and scalable backend services.

Worked on machine learning projects using Python and
data processing techniques.
"""


# ---------------------------------------------------------
# Job data
# ---------------------------------------------------------

job_title = "Python Backend Developer"

job_description = """
We are looking for a Python Backend Developer to build
scalable REST APIs and backend services.

The candidate should have experience with Python,
FastAPI and PostgreSQL.

Experience with React and machine learning is preferred.
"""

job_skills = [
    {
        "skill_name": "Python",
        "requirement_type": "REQUIRED",
        "importance": 10,
    },
    {
        "skill_name": "FastAPI",
        "requirement_type": "REQUIRED",
        "importance": 10,
    },
    {
        "skill_name": "PostgreSQL",
        "requirement_type": "REQUIRED",
        "importance": 8,
    },
    {
        "skill_name": "React",
        "requirement_type": "PREFERRED",
        "importance": 4,
    },
]

experience_min = 2.0
experience_max = 4.0


# ---------------------------------------------------------
# Individual matching components
# ---------------------------------------------------------

skill_match = calculate_skill_match(
    candidate_skills=candidate_skills,
    job_skills=job_skills,
)

experience_match = calculate_experience_match(
    candidate_years=candidate_years,
    experience_min=experience_min,
    experience_max=experience_max,
)

role_match = calculate_role_match(
    job_title=job_title,
    candidate_job_titles=candidate_job_titles,
)

semantic_match = calculate_semantic_match(
    job_text=f"""
    {job_title}

    {job_description}
    """,
    candidate_text=candidate_resume_text,
)


# ---------------------------------------------------------
# Overall match
# ---------------------------------------------------------

overall_match = calculate_overall_match(
    skill_match=skill_match,
    experience_match=experience_match,
    role_match=role_match,
    semantic_match=semantic_match,
)


# ---------------------------------------------------------
# Display results
# ---------------------------------------------------------

print("\n" + "=" * 60)
print("SKILL MATCH")
print("=" * 60)
print(skill_match)


print("\n" + "=" * 60)
print("EXPERIENCE MATCH")
print("=" * 60)
print(experience_match)


print("\n" + "=" * 60)
print("ROLE MATCH")
print("=" * 60)
print(role_match)


print("\n" + "=" * 60)
print("SEMANTIC MATCH")
print("=" * 60)
print(semantic_match)


print("\n" + "=" * 60)
print("OVERALL MATCH")
print("=" * 60)
print(overall_match)
