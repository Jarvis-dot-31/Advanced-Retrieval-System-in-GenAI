from neo4j import GraphDatabase

URL = "bolt://localhost:7687"
AUTH = ("neo4j", "password123")
driver = GraphDatabase.driver(URL, auth=AUTH)

cypher = """
UNWIND $skills AS skill_name
MATCH (sk:Skill)
WHERE toLower(sk.name) CONTAINS toLower(skill_name)
OPTIONAL MATCH (sk)<-[:HAS_SKILL]-(direct:Candidate)
OPTIONAL MATCH (sk)-[:SIMILAR_TO]->(related_skill:Skill)<-[:HAS_SKILL]-(indirect:Candidate)
WITH collect(DISTINCT {c: direct, matched: sk.name}) + collect(DISTINCT {c: indirect, matched: related_skill.name}) AS matches
UNWIND matches AS m
WITH m.c AS c, collect(DISTINCT m.matched) AS matched_skills
WHERE c IS NOT NULL
MATCH (c)-[:HAS_SKILL]->(all_sk:Skill)
RETURN c.id AS id, matched_skills, collect(DISTINCT all_sk.name) AS all_skills LIMIT 5
"""

def main():
    with driver.session() as session:
        result = session.run(cypher, skills=["python", "data science"])
        for record in result:
            print(f"ID: {record['id']}")
            print(f"  Matched: {record['matched_skills']}")
            print(f"  All: {record['all_skills']}")

if __name__ == "__main__":
    main()
