# #preprocess.py

import pandas as pd

PROPERTY_COLUMNS = {"id", "name", "years_of_experience", "skill_summary"}

SKILL_COLUMNS = {
    "core_skills":      "HAS_CORE_SKILL",
    "secondary_skills": "HAS_SECONDARY_SKILL",
    "soft_skills":      "HAS_SOFT_SKILL",
}

SKILL_NORMALIZATION = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "py": "python"
}


def parse_skills(skill_str):
    if pd.isna(skill_str):
        return []
    skills = []
    for s in str(skill_str).split(","):
        s = s.strip().lower()
        if "(" in s:
            s = s.split("(")[0].strip()
        if s and len(s) < 40:
            skills.append(s)
    return skills


def parse_roles(role_str):
    if pd.isna(role_str):
        return []
    return [r.strip().lower() for r in str(role_str).split(",") if r.strip() and len(r.strip()) < 60]


def normalize_skill(skill):
    return SKILL_NORMALIZATION.get(skill, skill)


def extract_skills_for_cooccurrence(row):
    """Extract only core + secondary skills for co-occurrence (not soft skills)."""
    skills = []
    for col in ["core_skills", "secondary_skills"]:
        if col in row and not pd.isna(row[col]):
            skills += parse_skills(row[col])
    skills = [normalize_skill(s) for s in skills]
    return list(set(skills))


def extract_all_skills_by_type(row):
    """Return dict of {rel_type: [skills]} for all skill columns."""
    result = {}
    for col, rel_type in SKILL_COLUMNS.items():
        if col in row and not pd.isna(row[col]):
            skills = [normalize_skill(s) for s in parse_skills(row[col])]
            if skills:
                result[rel_type] = skills
    return result


def load_data(path):
    return pd.read_csv(path)