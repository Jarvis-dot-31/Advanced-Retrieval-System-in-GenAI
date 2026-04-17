#utils.py
def debug_print_relations(relations):
    for r in relations[:10]:
        print(r)


def debug_print_graph_summary(df):
    from preprocess import parse_skills, parse_roles, SKILL_COLUMNS

    total_skills = set()
    total_roles = set()

    for _, row in df.iterrows():
        for col in SKILL_COLUMNS:
            if col in row:
                for s in parse_skills(row[col]):
                    total_skills.add(s)
        if "potential_roles" in row:
            for r in parse_roles(row.get("potential_roles", "")):
                total_roles.add(r)

    print(f"Unique skills across all columns: {len(total_skills)}")
    print(f"Unique roles: {len(total_roles)}")
    print(f"Sample skills: {list(total_skills)[:10]}")
    print(f"Sample roles: {list(total_roles)[:10]}")