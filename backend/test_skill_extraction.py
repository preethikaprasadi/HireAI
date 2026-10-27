from app.services.resume_analyzer import ResumeAnalyzer

sample_resume = """
TECHNICAL SKILLS
Programming Languages: Python, Java, TypeScript
Frontend: React, HTML, CSS
Databases: MongoDB, MySQL
Developer Tools: Git, Postman

EDUCATION
Bachelor's Degree
"""

result = ResumeAnalyzer._merge_explicit_skills([], sample_resume)

print("Extracted skills:", result)

expected = {
    "Python", "Java", "TypeScript",
    "React", "HTML", "CSS",
    "MongoDB", "MySQL", "Git", "Postman",
}

assert expected.issubset(set(result)), (
    f"Missing skills: {expected - set(result)}"
)

print("PASS: All expected technical skills were extracted.")
