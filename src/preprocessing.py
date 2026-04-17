import re

PROFICIENCY_MAP = {
    "Beginner": 1,
    "Advanced Beginner": 2,
    "Competent": 3,
    "Proficient": 4,
    "Expert": 5,
}

def parse_skill_field(raw: str) -> list[dict]:
    """
    Parse "Python (Advanced Beginner), SQL (Competent)"
    into [{"skill": "Python", "level": 2}, {"skill": "SQL", "level": 3}]
    """
    results = []
    if not isinstance(raw, str):
        return results
        
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        m = re.match(r"^(.+?)\s*\((.+?)\)\s*$", token)
        if m:
            skill = m.group(1).strip()
            level = PROFICIENCY_MAP.get(m.group(2).strip(), 1)
        else:
            skill, level = token, 1
        results.append({"skill": skill, "level": level})
    return results

def build_document(row: dict) -> dict:
    """Convert a raw CSV row into a structured indexing document."""
    core = parse_skill_field(row.get("core_skills", ""))
    sec = parse_skill_field(row.get("secondary_skills", ""))
    soft = parse_skill_field(row.get("soft_skills", ""))
    
    roles_str = str(row.get("potential_roles", ""))
    roles = [r.strip() for r in roles_str.split(",") if r.strip()]
    
    try:
        yoe = float(row.get("years_of_experience", 0) or 0)
    except ValueError:
        yoe = 0.0

    # Flat skill name strings for BM25 fields
    core_text = " ".join(s["skill"] for s in core)
    sec_text = " ".join(s["skill"] for s in sec)

    return {
        "id": str(row.get("id")),
        "name": str(row.get("name", "")),
        "core_skills": core_text, # BM25 text
        "core_skills_parsed": core, # Nested for proficiency filter
        "secondary_skills": sec_text,
        "secondary_skills_parsed": sec,
        "soft_skills": " ".join(s["skill"] for s in soft),
        "soft_skills_parsed": soft,
        "years_of_experience": yoe,
        "potential_roles": " ".join(roles),
        "potential_roles_list": roles,
        "skill_summary": str(row.get("skill_summary", "")),
        "skill_summary_vec": None, # Populated later
        "potential_roles_vec": None # Populated later
    }
