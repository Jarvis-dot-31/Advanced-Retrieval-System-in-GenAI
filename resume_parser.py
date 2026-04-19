import json
import re
import sys

EXTRACTION_PROMPT = """You are an expert HR data extraction assistant.
Extract the following structured information from the resume text below.

Return ONLY a valid JSON object with these exact keys:
{{
  "name": "Full name of the candidate",
  "core_skills": "Comma-separated skills with proficiency like: Python (Expert), AWS (Competent)",
  "secondary_skills": "Comma-separated secondary skills with proficiency",
  "soft_skills": "Comma-separated soft skills with proficiency",
  "years_of_experience": 5.0,
  "potential_roles": "Comma-separated potential job roles",
  "skill_summary": "A 3-5 sentence summary of the candidate's profile and strengths"
}}

Proficiency levels MUST be one of: Beginner, Advanced Beginner, Competent, Proficient, Expert.
If a skill proficiency is not mentioned, use: Competent.
If information is not available, use an empty string "".
Do NOT add any text outside the JSON object.

Resume Text:
---
{resume_text}
---

JSON Output:"""


def query_ollama(resume_text: str, model: str = "llama3", host: str = "http://localhost:11434") -> dict:
    try:
        import requests
    except ImportError:
        print("Error: requests not installed. Run: pip install requests")
        sys.exit(1)

    prompt = EXTRACTION_PROMPT.format(resume_text=resume_text[:6000])

    print(f"[ResumeParser] Querying Ollama ({model})...")
    try:
        resp = requests.post(
            f"{host}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=120
        )
        resp.raise_for_status()
        raw_response = resp.json().get("response", "")
    except requests.exceptions.ConnectionError:
        print(f"Error: Cannot connect to Ollama at {host}.")
        print("Make sure Ollama is running: ollama serve")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("Error: Ollama request timed out. Try a smaller model or increase timeout.")
        sys.exit(1)

    return parse_llm_response(raw_response)


def parse_llm_response(raw: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        raise ValueError(f"No JSON found in Ollama response:\n{raw[:500]}")

    json_str = json_match.group(0)
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from Ollama: {e}\nRaw: {json_str[:300]}")

    return data

def clean_candidate_data(raw: dict, next_id: int) -> dict:
    def safe_str(val, default=""):
        return str(val).strip() if val is not None else default

    def safe_float(val, default=0.0):
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    cleaned = {
        "id": next_id,
        "name": safe_str(raw.get("name"), "Unknown Candidate"),
        "core_skills": safe_str(raw.get("core_skills")),
        "secondary_skills": safe_str(raw.get("secondary_skills")),
        "soft_skills": safe_str(raw.get("soft_skills")),
        "years_of_experience": safe_float(raw.get("years_of_experience"), 0.0),
        "potential_roles": safe_str(raw.get("potential_roles")),
        "skill_summary": safe_str(raw.get("skill_summary")),
    }

    return cleaned

def parse_resume(text: str, next_id: int, model: str = "llama3", ollama_host: str = "http://localhost:11434") -> dict:
    raw_data = query_ollama(text, model=model, host=ollama_host)
    candidate = clean_candidate_data(raw_data, next_id=next_id)
    return candidate