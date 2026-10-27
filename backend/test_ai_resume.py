from pathlib import Path

from app.services.resume_parser import extract_resume_text
from app.services.resume_analyzer import ResumeAnalyzer


FILE_PATH = Path("test_resume.pdf")


def main():
    file_content = FILE_PATH.read_bytes()

    extracted_text = extract_resume_text(
        file_content,
        "application/pdf",
    )

    print("\n" + "=" * 70)
    print("EXTRACTED RESUME TEXT")
    print("=" * 70)
    print(extracted_text)

    print("\n" + "=" * 70)
    print("RUNNING HIREAI AI ANALYSIS")
    print("=" * 70)

    analyzer = ResumeAnalyzer()

    result = analyzer.analyze(extracted_text)

    print("\n" + "=" * 70)
    print("STRUCTURED RESULT")
    print("=" * 70)

    import json

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
