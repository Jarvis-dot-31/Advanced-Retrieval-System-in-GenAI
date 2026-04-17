# # neo4j_loader.py

from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


class Neo4jLoader:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    # ── Candidate nodes (safe property columns only) ──────────────────────────

    def batch_create_candidates(self, tx, candidates):
        tx.run("""
        UNWIND $candidates AS c
        MERGE (n:Candidate {id: c.id})
        SET n.name                = c.name,
            n.years_of_experience = c.years_of_experience,
            n.skill_summary       = c.skill_summary
        """, candidates=candidates)

    # ── Typed skill relationships ─────────────────────────────────────────────

    def batch_add_skills(self, tx, data, rel_type):
        query = f"""
        UNWIND $data AS row
        MERGE (s:Skill {{name: row.skill}})
        WITH s, row
        MATCH (c:Candidate {{id: row.candidate_id}})
        MERGE (c)-[:{rel_type}]->(s)
        """
        tx.run(query, data=data)

    # ── Role nodes ────────────────────────────────────────────────────────────

    def batch_add_roles(self, tx, data):
        tx.run("""
        UNWIND $data AS row
        MERGE (r:Role {name: row.role})
        WITH r, row
        MATCH (c:Candidate {id: row.candidate_id})
        MERGE (c)-[:SUITABLE_FOR]->(r)
        """, data=data)

    # ── Skill co-occurrence edges ─────────────────────────────────────────────

    def batch_add_relations(self, tx, rels):
        tx.run("""
        UNWIND $rels AS r
        MERGE (a:Skill {name: r.a1})
        MERGE (b:Skill {name: r.a2})
        MERGE (a)-[:CO_OCCURS_WITH {weight: r.w}]->(b)
        """, rels=rels)

    # ── Master loader ─────────────────────────────────────────────────────────

    def load_all(self, df, relations, sim_pairs=None):
        from preprocess import (
            parse_roles, extract_all_skills_by_type, SKILL_COLUMNS
        )

        with self.driver.session() as session:

            # 1. Candidate nodes
            candidates = []
            for _, row in df.iterrows():
                candidates.append({
                    "id":                   int(row["id"]),
                    "name":                 str(row.get("name", "") or ""),
                    "years_of_experience":  float(row.get("years_of_experience", 0) or 0),
                    "skill_summary":        str(row.get("skill_summary", "") or "")
                })
            session.execute_write(self.batch_create_candidates, candidates)
            print(f"✅ Created {len(candidates)} Candidate nodes")

            # 2. Typed skill nodes + relationships
            for col, rel_type in SKILL_COLUMNS.items():
                if col not in df.columns:
                    continue
                data = []
                for _, row in df.iterrows():
                    skills_by_type = extract_all_skills_by_type(row)
                    for skill in skills_by_type.get(rel_type, []):
                        data.append({
                            "candidate_id": int(row["id"]),
                            "skill": skill
                        })
                if data:
                    session.execute_write(self.batch_add_skills, data, rel_type)
                    print(f"✅ Added {len(data)} {rel_type} edges")

            # 3. Role nodes + relationships
            role_data = []
            if "potential_roles" in df.columns:
                for _, row in df.iterrows():
                    for role in parse_roles(row.get("potential_roles", "")):
                        role_data.append({
                            "candidate_id": int(row["id"]),
                            "role": role
                        })
                if role_data:
                    session.execute_write(self.batch_add_roles, role_data)
                    print(f"✅ Added {len(role_data)} SUITABLE_FOR edges")

            # 4. Skill co-occurrence edges
            rel_data = [{"a1": a1, "a2": a2, "w": w} for a1, a2, w in relations]
            if rel_data:
                session.execute_write(self.batch_add_relations, rel_data)
                print(f"✅ Added {len(rel_data)} CO_OCCURS_WITH edges")
            if sim_pairs:
                session.execute_write(self.batch_add_skill_similarity, sim_pairs)
                print(f"✅ Added {len(sim_pairs)} SIMILAR_TO edges")

    
    def batch_add_skill_similarity(self, tx, pairs):
        tx.run("""
        UNWIND $pairs AS p
        MATCH (a:Skill {name: p.s1}), (b:Skill {name: p.s2})
        MERGE (a)-[:SIMILAR_TO {score: p.score}]->(b)
        """, pairs=pairs)