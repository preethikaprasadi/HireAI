from io import BytesIO

from docx import Document
from pypdf import PdfReader


def extract_text_from_pdf(file_content: bytes) -> str:
    reader = PdfReader(BytesIO(file_content))

    pages = []

    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)

    return "\n".join(pages).strip()


def extract_text_from_docx(file_content: bytes) -> str:
    document = Document(BytesIO(file_content))

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    return "\n".join(paragraphs).strip()


def extract_resume_text(
    file_content: bytes,
    mime_type: str | None,
) -> str:
    if mime_type == "application/pdf":
        return extract_text_from_pdf(file_content)

    if mime_type == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        return extract_text_from_docx(file_content)

    raise ValueError("Unsupported resume file type.")
