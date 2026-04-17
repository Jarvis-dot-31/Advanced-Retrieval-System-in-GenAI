from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
import numpy as np
from itertools import combinations
from src.config import SBERT_MODEL_NAME

model = SentenceTransformer(SBERT_MODEL_NAME)

class KnowledgeGraphBuilder:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def create_schema(self):
        with self.driver.session() as s:
            s.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Candidate) REQUIRE c.id IS UNIQUE")
            s.run("CREATE CONSTRAINT IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.name IS UNIQUE")
            s.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:Role) REQUIRE r.title IS UNIQUE")
            s.run("CREATE INDEX IF NOT EXISTS FOR (sk:Skill) ON (sk.name)")
            s.run("CREATE INDEX IF NOT EXISTS FOR (c:Candidate) ON (c.yoe)")
            print("Neo4j Schema ready.")

    def ingest_candidate(self, doc: dict, embedding: list):
        cypher = """
        MERGE (c:Candidate {id: $id})
        SET c.name = $name,
            c.yoe = $yoe,
            c.embedding = $embedding

        // --- Core skills ---
        WITH c
        UNWIND $core_skills AS skill_entry
        MERGE (sk:Skill {name: skill_entry.skill})
        MERGE (c)-[r:HAS_SKILL]->(sk)
        SET r.level = skill_entry.level,
            r.category = 'core'

        // --- Potential roles ---
        WITH c
        UNWIND $roles AS role_title
        MERGE (ro:Role {title: role_title})
        MERGE (c)-[:SUITS_ROLE]->(ro)
        
        // --- Soft skills ---
        WITH c
        UNWIND $soft_skills AS soft_skill
        MERGE (ss:SoftSkill {name: soft_skill.skill})
        MERGE (c)-[:HAS_SOFT_SKILL]->(ss)
        """
        
        # Make sure soft_skills exists safely or fallback to empty
        soft_skills_parsed = doc.get("soft_skills_parsed", [])
        
        with self.driver.session() as s:
            s.run(cypher,
                  id=doc["id"], 
                  name=doc.get("name", ""),
                  yoe=doc["years_of_experience"],
                  embedding=embedding,
                  core_skills=doc.get("core_skills_parsed", []),
                  roles=doc.get("potential_roles_list", []),
                  soft_skills=soft_skills_parsed)

    def build_skill_similarity_edges(self, similarity_threshold: float = 0.75):
        """Retrieve all Skill nodes, compute pairwise SBERT cosine similarity,
        and create SIMILAR_TO edges for pairs above the threshold."""
        with self.driver.session() as s:
            skill_names = [r["name"] for r in s.run("MATCH (sk:Skill) RETURN sk.name AS name")]
            
        if not skill_names:
            return

        embeddings = model.encode(skill_names, normalize_embeddings=True, batch_size=512)
        sim_matrix = np.dot(embeddings, embeddings.T)

        edge_batch = []
        for i, j in combinations(range(len(skill_names)), 2):
            sim = float(sim_matrix[i, j])
            if sim >= similarity_threshold:
                edge_batch.append({
                    "a": skill_names[i],
                    "b": skill_names[j],
                    "weight": round(sim, 4)
                })

        cypher = """
        UNWIND $edges AS e
        MATCH (a:Skill {name: e.a})
        MATCH (b:Skill {name: e.b})
        MERGE (a)-[r:SIMILAR_TO]->(b)
        SET r.weight = e.weight
        MERGE (b)-[r2:SIMILAR_TO]->(a)
        SET r2.weight = e.weight
        """
        with self.driver.session() as s:
            if edge_batch:
                s.run(cypher, edges=edge_batch)
                print(f"Created {len(edge_batch)} SIMILAR_TO edges (threshold={similarity_threshold})")

    def build_candidate_similarity_edges(self, threshold: float = 0.85):
        """Create SIMILAR_TO edges between candidates with sim >= threshold."""
        with self.driver.session() as s:
            rows = s.run("MATCH (c:Candidate) RETURN c.id AS id, c.embedding AS emb").data()
            
        if not rows:
            return

        ids = [r["id"] for r in rows]
        embs = np.array([r["emb"] for r in rows if r["emb"] is not None], dtype=np.float32)
        
        if len(embs) != len(ids):
            print("Skipping candidate similarity edges because some embeddings were missing")
            return

        norms = np.linalg.norm(embs, axis=1, keepdims=True)
        embs = embs / np.maximum(norms, 1e-9)
        sim = np.dot(embs, embs.T)

        edges = []
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                if sim[i, j] >= threshold:
                    edges.append({"a": ids[i], "b": ids[j], "sim": round(float(sim[i, j]), 4)})

        cypher = """
        UNWIND $edges AS e
        MATCH (a:Candidate {id: e.a})
        MATCH (b:Candidate {id: e.b})
        MERGE (a)-[r:SIMILAR_TO]->(b)
        SET r.sim = e.sim
        """
        with self.driver.session() as s:
            if edges:
                s.run(cypher, edges=edges)
                print(f"Created {len(edges)} candidate SIMILAR_TO edges.")
