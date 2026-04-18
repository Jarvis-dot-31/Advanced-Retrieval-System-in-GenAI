import faiss
import numpy as np
import pandas as pd
from neo4j import GraphDatabase
import pickle
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

query="Give me list of people with proficiency in data science and know little bit of C++."
entities=["data science","C++","developer"]
min_yoe=5
URL = "bolt://localhost:7687"
AUTH = ("neo4j", "password123")
driver = GraphDatabase.driver(URL, auth=AUTH)

faiss_index=faiss.read_index("Vecdb_embeddings/docs.index")
with open("Vecdb_embeddings/docs.pickle", "rb") as f:
    order=pickle.load(f)

es=Elasticsearch("http://localhost:9200")
df=pd.read_csv("Dataset/profiles.csv")

es_df=df.where(pd.notnull(df), None)

es_res=es.search(
    index="res_docs",
    body={
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": " ".join(entities),
                            "fields": [
                                "core_skills^4",
                                "potential_roles^3",
                                "secondary_skills^2",
                                "soft_skills^2",
                                "skill_summary"
                            ],
                            "operator": "or"
                        }
                    }
                ],
                "filter": [
                    {
                        "range": {
                            "years_of_experience": {"gte": min_yoe}
                        }
                    }
                ],
                "should": [{"match":{"core_skills":i}} for i in entities]
            }
        }
    }
)

encoder=SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
query_vec=encoder.encode(query)
query_vec=np.array([query_vec]).astype('float32')
dist,ind=faiss_index.search(query_vec,k=5)
faiss_docs=[]
es_docs=[]
kg_docs = []
for i in range(len(ind[0])):
    faiss_docs.append({
        "doc":order[ind[0][i]],
        "distance":dist[0][i]
    })
for hit in es_res["hits"]["hits"]:
    es_docs.append({
        "doc":hit["_source"],
        "BM25score":hit["_score"]
    })

cypher = """
UNWIND $skills AS skill_name

// Find matching skill nodes
MATCH (sk:Skill)
WHERE toLower(sk.name) CONTAINS toLower(skill_name)

// 1-hop: Direct skill → candidate
OPTIONAL MATCH (sk)<-[:HAS_SKILL]-(direct:Candidate)

// 2-hop: Similar skills → their candidates
OPTIONAL MATCH (sk)-[:SIMILAR_TO]->(related_skill:Skill)<-[:HAS_SKILL]-(indirect:Candidate)

// Collect all unique candidates and their matched skills
WITH collect(DISTINCT {c: direct, matched: sk.name}) + collect(DISTINCT {c: indirect, matched: related_skill.name}) AS matches
UNWIND matches AS m
WITH m.c AS c, collect(DISTINCT m.matched) AS matched_skills
WHERE c IS NOT NULL

// Fetch all skills for the candidate to return full skill set
MATCH (c)-[:HAS_SKILL]->(all_sk:Skill)
RETURN c.id AS id, matched_skills, collect(DISTINCT all_sk.name) AS all_skills LIMIT $limit
"""
with driver.session() as session:
    result = session.run(cypher, skills=entities, limit=5)
    for record in result:
        kg_docs.append({
            "id": record["id"],
            "matched_skills": record["matched_skills"],
            "all_skills": record["all_skills"]
        })

print(f"Graph Candidates found: {len(kg_docs)}")
for entry in kg_docs:
    print(f"Candidate ID: {entry['id']}")
    print(f"  - Matched via: {', '.join(entry['matched_skills'])}")
    print(f"  - Full Skill Set: {', '.join(entry['all_skills'])}")
