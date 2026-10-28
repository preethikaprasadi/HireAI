import json
import os
import re
from typing import Any

BASE_MODEL_NAME = "Qwen/Qwen3-0.6B"

# Configure the adapter path through an environment variable if needed.
#
# Example:
# HIREAI_LORA_ADAPTER_PATH=C:\Users\user\...\hireai_qwen3_0.6b_lora_adapter_v1

ADAPTER_PATH = os.getenv(
    "HIREAI_LORA_ADAPTER_PATH",
    "models/hireai_qwen3_0.6b_lora_adapter_v1",
)

MODEL_NAME = "HireAI-Qwen3-0.6B-LoRA-v1"
PROMPT_VERSION = "v1"

# 1024 was slightly too close to the required output length.
# 1536 gives the model enough room for the complete JSON.
MAX_NEW_TOKENS = 2048


SYSTEM_PROMPT = """Extract structured information from the resume for the HireAI recruitment system.

Return ONLY valid JSON using exactly this structure:

{
  "candidate": {
    "name": null,
    "email": null,
    "phone": null
  },
  "summary": null,
  "skills": [],
  "job_titles": [],
  "experience": [],
  "education": [],
  "projects": [],
  "certifications": []
}

Rules:

1. Extract only information supported by the resume.
2. Do not invent missing information.
3. Use null for missing scalar values.
4. Use [] for missing list values.
5. job_titles must contain only actual job titles explicitly stated in the resume, not inferred titles and not company names.
6. Each experience item must contain company, job_title, start_date, end_date, and description.
7. Each education item must contain degree, institution, and year.
8. Each project must contain name and description.
9. Preserve the meaning of the original resume.
10. Return JSON only.
11. experience must contain ONLY actual employment or work experience explicitly stated in the resume.
12. Never convert projects, education, achievements, extracurricular activities, or references into experience.
13. If the resume does not contain a clearly stated employment/work experience section, return "experience": [].
14. Never invent a company, job title, date, responsibility, or work description.
15. job_titles must contain only job titles explicitly stated in the resume. Do not infer or replace them with a different title.
16. Before finishing, make sure every JSON array is closed with ] and every JSON object is closed with }.
17. Make sure the final character of the response is the closing } of the JSON object.
EDUCATION:
- Preserve the complete date range exactly as stated in the resume.
- If education says "2022 – present", do not reduce it to "2022".
- Do not assume that an education start year is a graduation year.
- Use the existing "year" field for the full date range when applicable.

CERTIFICATIONS:
- Treat each complete certification as one entry.
- A line such as "Certified - Ongoing" may belong to the preceding certification.
- Do not create a separate certification from a status or issuer fragment.
- Do not invent missing certification names or issuers.

SKILLS:
- Extract all explicit skills listed under TECHNICAL SKILLS.
- Do not omit skills simply because there are many.
- Do not add skills that are not supported by the resume.

JOB TITLES:
- Do not treat a desired role mentioned in a career objective as previous employment.
- Keep desired job titles separate from actual employment history.

IMPORTANT JSON RULES:
- Return exactly the eight top-level keys in the required schema.
- Never create additional top-level keys or category keys.
- The "skills" field must contain all technical and soft skills as strings.
- The "certifications" field must contain certification names only.
- Never place a JSON object key such as "SOFT-SKILLS": inside an array.
- Every array must contain valid values separated by commas.
- Close every array, object, and string before finishing.
- Return one complete JSON object, with no markdown or explanatory text.

"""


TARGET_KEYS = {
    "candidate",
    "summary",
    "skills",
    "job_titles",
    "experience",
    "education",
    "projects",
    "certifications",
}


EXPERIENCE_SECTION_PATTERNS = [
    r"\bwork experience\b",
    r"\bprofessional experience\b",
    r"\bemployment history\b",
    r"\bemployment experience\b",
    r"\bcareer history\b",
    r"\bwork history\b",
    r"\bprofessional background\b",
]


class ResumeAnalyzer:

    def __init__(self) -> None:
        # Load heavy AI dependencies only when analysis is requested.
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.torch = torch

        self.device = (
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

        print(f"Loading HireAI AI model on {self.device}...")

        self.tokenizer = AutoTokenizer.from_pretrained(
            BASE_MODEL_NAME
        )

        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            dtype=(
                torch.float16
                if self.device == "cuda"
                else torch.float32
            ),
        )

        self.model = PeftModel.from_pretrained(
            base_model,
            ADAPTER_PATH,
        )

        self.model.to(self.device)
        self.model.eval()

        print("HireAI AI model loaded successfully.")

    def _build_prompt(
        self,
        resume_text: str,
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": resume_text,
            },
        ]

        return self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )

    @staticmethod
    def _repair_json_structure(
        json_text: str,
    ) -> str:
        """
        Repair missing closing JSON brackets/braces.

        Example:

        {
            "skills": ["Python", "SQL"
        }

        becomes:

        {
            "skills": ["Python", "SQL"]
        }

        This is only used after normal json.loads() fails.
        """

        stack: list[str] = []
        in_string = False
        escaped = False

        for char in json_text:
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False

                continue

            if char == '"':
                in_string = True

            elif char == "{":
                stack.append("}")

            elif char == "[":
                stack.append("]")

            elif char in ("}", "]"):
                if stack and stack[-1] == char:
                    stack.pop()

        # If we are still inside a JSON string, close it.
        if in_string:
            json_text += '"'

        # Close any remaining arrays/objects.
        while stack:
            json_text += stack.pop()

        return json_text

    @staticmethod
    def _extract_json(
        text: str,
    ) -> dict[str, Any]:

        print("\n" + "=" * 70)
        print("RAW AI OUTPUT")
        print("=" * 70)
        print(text)
        print("=" * 70 + "\n")

        text = text.strip()

        # ---------------------------------------------------------
        # First attempt:
        # Model returned valid complete JSON.
        # ---------------------------------------------------------
        try:
            result = json.loads(text)

            if isinstance(result, dict):
                return result

        except json.JSONDecodeError:
            pass

        # ---------------------------------------------------------
        # Find the outermost JSON object.
        # ---------------------------------------------------------
        start = text.find("{")
        end = text.rfind("}")

        if start == -1:
            raise ValueError(
                "AI model did not return valid JSON."
            )

        # If the final } is missing, use the entire remaining text.
        if end == -1 or end <= start:
            json_text = text[start:]
        else:
            json_text = text[start:end + 1]

        # ---------------------------------------------------------
        # Repair phone numbers that the model returns as bare
        # numbers instead of JSON strings.
        #
        # Example:
        #
        # "phone":0741070784
        #
        # becomes:
        #
        # "phone":"0741070784"
        # ---------------------------------------------------------
        json_text = re.sub(
            r'("phone"\s*:\s*)(\+?\d+)(?=\s*[,}])',
            r'\1"\2"',
            json_text,
        )

        # ---------------------------------------------------------
        # Second attempt after phone repair.
        # ---------------------------------------------------------
        try:
            result = json.loads(json_text)

            if isinstance(result, dict):
                return result

        except json.JSONDecodeError:
            pass


        # Repair a resume section heading accidentally emitted as a
        # key-value pair inside the certifications array.
        json_text = re.sub(
            r',\s*"SOFT-SKILLS"\s*:\s*\[([^\]]*)\]',
            lambda match: (
                ',"' + 'SOFT-SKILLS' + '": [' + match.group(1) + ']'
            ),
            json_text,
        )

        # ---------------------------------------------------------
        # Third attempt:
        # Repair missing brackets/braces and trailing commas.
        # ---------------------------------------------------------
        json_text = ResumeAnalyzer._repair_json_structure(
            json_text
        )

        # Remove trailing commas before closing arrays/objects.
        # Example: {"skills": ["Python",]}
        # becomes: {"skills": ["Python"]}
        json_text = re.sub(
            r",\s*([}\]])",
            r"\1",
            json_text,
        )

        # Fix a category key accidentally inserted into the certifications array.
        json_text = re.sub(
            r'"certifications"\s*:\s*\[(.*?)"SOFT-SKILLS"\s*:\s*\[(.*?)\]\s*\]',
            lambda match: (
                '"certifications": [' + match.group(1).rstrip().rstrip(',')
                + '],"skills": [' + match.group(2) + ']'
            ),
            json_text,
            flags=re.DOTALL,
        )

        try:
            result = json.loads(json_text)

        except json.JSONDecodeError as exc:
            print("\nJSON REPAIR FAILED.")
            print(f"JSON error: {exc.msg}")
            print(f"Error position: line {exc.lineno}, column {exc.colno}")

            # Print only the area around the parsing failure.
            error_position = exc.pos
            start = max(0, error_position - 300)
            end = min(len(json_text), error_position + 300)

            print(f"JSON length: {len(json_text)}")
            print(f"Error position: {error_position}")
            print("JSON AROUND ERROR:")
            print(repr(json_text[start:end]))
            print()

            raise ValueError(
                f"AI model returned malformed JSON: "
                f"{exc.msg} at line {exc.lineno}, "
                f"column {exc.colno}."
            ) from exc

        if not isinstance(result, dict):
            raise ValueError(
                "AI model JSON response must be an object."
            )

        return result


        if not isinstance(result, dict):
            raise ValueError(
                "AI model JSON response must be an object."
            )

        return result

    @staticmethod
    def _validate_structure(
        data: dict[str, Any],
    ) -> dict[str, Any]:

        # ---------------------------------------------------------
        # Ensure all expected top-level fields exist.
        # ---------------------------------------------------------
        result = {
            "candidate": {
                "name": None,
                "email": None,
                "phone": None,
            },
            "summary": None,
            "skills": [],
            "job_titles": [],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
        }

        for key in TARGET_KEYS:
            if key in data:
                result[key] = data[key]

        # ---------------------------------------------------------
        # Candidate must always be an object.
        # ---------------------------------------------------------
        if not isinstance(
            result["candidate"],
            dict,
        ):
            result["candidate"] = {
                "name": None,
                "email": None,
                "phone": None,
            }

        candidate = result["candidate"]

        result["candidate"] = {
            "name": candidate.get("name"),
            "email": candidate.get("email"),
            "phone": candidate.get("phone"),
        }

        # ---------------------------------------------------------
        # Lists must actually be lists.
        # ---------------------------------------------------------
        list_fields = [
            "skills",
            "job_titles",
            "experience",
            "education",
            "projects",
            "certifications",
        ]

        for field in list_fields:
            if not isinstance(
                result[field],
                list,
            ):
                result[field] = []

        return result

    @staticmethod
    def _has_experience_section(
        resume_text: str,
    ) -> bool:

        text = resume_text.lower()

        return any(
            re.search(
                pattern,
                text,
            )
            for pattern in EXPERIENCE_SECTION_PATTERNS
        )

    @staticmethod
    def _validate_experience(
        experience: list[Any],
        resume_text: str,
    ) -> list[dict[str, Any]]:
        """Keep only experience entries supported by resume text."""
        if not ResumeAnalyzer._has_experience_section(resume_text):
            return []

        resume_lower = resume_text.lower()
        validated = []

        for item in experience:
            if not isinstance(item, dict):
                continue

            company = item.get("company")
            job_title = item.get("job_title")

            if not isinstance(company, str) or not company.strip():
                continue

            if not isinstance(job_title, str) or not job_title.strip():
                continue

            if company.strip().lower() not in resume_lower:
                continue

            if job_title.strip().lower() not in resume_lower:
                continue

            validated.append(item)

        return validated

    @staticmethod
    def _fix_education_dates(
        education: list[Any],
        resume_text: str,
    ) -> list[dict[str, Any]]:
        """Preserve education date ranges stated in the resume."""
        normalized = re.sub(r"\s+", " ", resume_text)
        normalized_lower = normalized.lower()

        for item in education:
            if not isinstance(item, dict):
                continue

            degree = item.get("degree")
            institution = item.get("institution")

            if not isinstance(degree, str) or not isinstance(institution, str):
                continue

            degree_pos = normalized_lower.find(degree.lower())
            if degree_pos == -1:
                continue

            institution_pos = normalized_lower.find(
                institution.lower(),
                degree_pos + len(degree),
            )
            if institution_pos == -1:
                continue

            start = institution_pos + len(institution)
            nearby_text = normalized[start:start + 200]

            date_match = re.search(
                r"\b((?:19|20)\d{2})\s*[–—-]\s*"
                r"(present|current|(?:19|20)\d{2})\b",
                nearby_text,
                re.IGNORECASE,
            )

            if date_match:
                item["year"] = (
                    f"{date_match.group(1)} – "
                    f"{date_match.group(2).lower()}"
                )

        return education

    @staticmethod
    def _fix_certifications(
        certifications: list[Any],
    ) -> list[str]:
        """Join certification fragments separated by the model."""
        cleaned: list[str] = []

        for item in certifications:
            if not isinstance(item, str):
                continue

            item = item.strip()
            if not item:
                continue

            if (
                item.lower().rstrip(".") == "certified - ongoing"
                and cleaned
            ):
                cleaned[-1] = f"{cleaned[-1]} Certified - Ongoing"
            else:
                cleaned.append(item)

        return cleaned


    @staticmethod
    def _merge_explicit_skills(
        skills: list[Any],
        resume_text: str,
    ) -> list[str]:
        """
        Merge AI-extracted skills with skills explicitly listed
        in the resume's technical skills section.

        Supports bullet lists, comma-separated skills,
        semicolon-separated skills, and pipe-separated skills.
        Does not infer skills from job requirements.
        """

        combined: list[str] = []
        seen: set[str] = set()

        def add_skill(value: Any) -> None:
            if not isinstance(value, str):
                return

            value = re.sub(r"\s+", " ", value).strip()
            value = value.strip(" \t,;|•·▪*-")

            if not value:
                return

            key = value.casefold()

            if key not in seen:
                seen.add(key)
                combined.append(value)

        # Preserve skills already extracted by the AI.
        for skill in skills:
            if isinstance(skill, str):
                add_skill(skill)
            elif isinstance(skill, dict):
                for key in ("name", "skill", "skill_name", "title"):
                    if isinstance(skill.get(key), str):
                        add_skill(skill[key])
                        break

        # Find the technical skills section.
        section_match = re.search(
            r"(?im)^[ \t]*(?:"
            r"TECHNICAL[ \t]+SKILLS|"
            r"TECHNICAL[ \t]+PROFICIENCIES|"
            r"TECHNICAL[ \t]+COMPETENCIES"
            r")[ \t]*:?[ \t]*$"
            r"([\s\S]*?)"
            r"(?=^[ \t]*(?:"
            r"SOFT[ \t]+SKILLS|"
            r"EDUCATION|"
            r"WORK[ \t]+EXPERIENCE|"
            r"PROFESSIONAL[ \t]+EXPERIENCE|"
            r"EMPLOYMENT[ \t]+HISTORY|"
            r"PROJECTS|"
            r"ACADEMIC[ \t]+PROJECTS|"
            r"CERTIFICATIONS?|"
            r"ACHIEVEMENTS?|"
            r"ACHIVEMENTS?|"
            r"EXTRA[ \t]+CURRICULAR(?:[ \t]+ACTIVITIES)?|"
            r"REFERENCES|"
            r"LANGUAGES|"
            r"INTERESTS"
            r")[ \t]*:?[ \t]*$|\\Z)",
            resume_text,
        )

        if not section_match:
            return combined

        section_text = section_match.group(1)

        # Labels that categorize a list rather than name a skill.
        category_labels = {
            "programming languages",
            "languages",
            "frontend",
            "front end",
            "backend",
            "back end",
            "frameworks",
            "libraries",
            "databases",
            "database",
            "developer tools",
            "tools",
            "technologies",
            "web technologies",
            "operating systems",
            "other tools",
        }

        for line in section_text.splitlines():
            line = line.strip()

            if not line:
                continue

            # Remove common bullet prefixes.
            line = re.sub(r"^[•·▪*-]+\s*", "", line).strip()

            # Split category labels such as:
            # "Programming Languages: Python, Java"
            if ":" in line:
                label, remainder = line.split(":", 1)

                if label.strip().casefold() in category_labels:
                    line = remainder.strip()

            # Split explicit list delimiters.
            # Do not split on "/" because names such as CI/CD
            # and problem-solving may contain it.
            for item in re.split(r"[,;|•·]+", line):
                add_skill(item)

        return combined

    def analyze(
        self,
        resume_text: str,
    ) -> dict[str, Any]:

        with self.torch.inference_mode():
            return self._analyze_resume(resume_text)

    def _analyze_resume(
        self,
        resume_text: str,
    ) -> dict[str, Any]:

        # ---------------------------------------------------------
        # Build prompt.
        # ---------------------------------------------------------
        prompt = self._build_prompt(
            resume_text
        )

        # ---------------------------------------------------------
        # Tokenize resume.
        # ---------------------------------------------------------
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=4096,
        )

        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
        }

        # ---------------------------------------------------------
        # Generate AI response.
        # ---------------------------------------------------------
        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            pad_token_id=(
                self.tokenizer.eos_token_id
            ),
        )

        # ---------------------------------------------------------
        # Remove input tokens.
        # ---------------------------------------------------------
        input_length = (
            inputs["input_ids"].shape[1]
        )

        generated_ids = output_ids[
            0,
            input_length:,
        ]

        generated_text = self.tokenizer.decode(
            generated_ids,
            skip_special_tokens=True,
        )

        print("\nGENERATED TEXT:")
        print(generated_text)
        print("\nEND GENERATED TEXT\n")

        # ---------------------------------------------------------
        # Extract JSON.
        # ---------------------------------------------------------
        data = self._extract_json(
            generated_text
        )

        # ---------------------------------------------------------
        # Validate structure.
        # ---------------------------------------------------------
        result = self._validate_structure(
            data
        )

        # ---------------------------------------------------------
        # Deterministic protection against hallucinated
        # employment experience.
        # ---------------------------------------------------------
        result["experience"] = self._validate_experience(
            result["experience"],
            resume_text,
        )
        result["education"] = self._fix_education_dates(
            result["education"],
            resume_text,
        )

        result["certifications"] = self._fix_certifications(
            result["certifications"],
        )

        result["skills"] = self._merge_explicit_skills(
            result["skills"],
            resume_text,
        )
        return result
