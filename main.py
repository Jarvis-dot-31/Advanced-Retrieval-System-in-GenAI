import faiss
import numpy as np
import pandas as pd
from neo4j import GraphDatabase
import pickle
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

query="Give me list of people with proficiency in cloud"
entities=["cloud","aws","azure","gcp"]
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
    df_index = int(ind[0][i])
    faiss_docs.append({
        "id": int(df.loc[df_index, "id"]) if df_index in df.index else df_index,
        "doc":order[ind[0][i]],
        "distance":dist[0][i],
        "rank":i+1
    })
for i,hit in enumerate(es_res["hits"]["hits"]):
    df_index = int(hit["_id"])
    es_docs.append({
        "id": int(df.loc[df_index, "id"]) if df_index in df.index else df_index,
        "doc":hit["_source"],
        "BM25score":hit["_score"],
        "rank":i+1
    })

cypher = """
UNWIND $skills AS skill_name

// Find matching skill nodes
MATCH (sk:Skill)
WHERE toLower(sk.name) CONTAINS toLower(skill_name)
OPTIONAL MATCH (sk)<-[:HAS_SKILL]-(direct:Candidate)
OPTIONAL MATCH (sk)-[:SIMILAR_TO]->(related_skill:Skill)<-[:HAS_SKILL]-(indirect:Candidate)
WITH collect(DISTINCT {c: direct, matched: sk.name}) + collect(DISTINCT {c: indirect, matched: related_skill.name}) AS matches
UNWIND matches AS m
WITH m.c AS c, collect(DISTINCT m.matched) AS matched_skills
WHERE c IS NOT NULL
MATCH (c)-[:HAS_SKILL]->(all_sk:Skill)
RETURN c.id AS id, matched_skills, collect(DISTINCT all_sk.name) AS all_skills LIMIT $limit
"""
temp=[]
with driver.session() as session:
    result = session.run(cypher, skills=entities, limit=5)
    for idx, record in enumerate(result):
        matching_rows = df.loc[df["id"].astype(str) == str(record["id"])]
        if not matching_rows.empty:
            kg_docs.append({
                "id":record["id"],
                "doc": matching_rows.to_dict("records")[0],
                "rank": idx + 1
            })
        else:
            kg_docs.append({
                "doc": {"error": f"ID {record['id']} not found in dataframe"},
                "rank": idx + 1
            })

rrf_scores = {}
k = 10
weights = {
    "faiss": 0.35,
    "es": 0.4,
    "kg": 0.25
}
for entry in faiss_docs:
    doc_id = str(entry.get("id"))
    rank = entry.get("rank", 100)
    score = weights["faiss"] * (1.0 / (k + rank))
    if doc_id not in rrf_scores:
        rrf_scores[doc_id] = 0.0
    rrf_scores[doc_id] += score

for entry in es_docs:
    doc_id = str(entry.get("id"))
    rank = entry.get("rank", 100)
    score = weights["es"] * (1.0 / (k + rank))
    if doc_id not in rrf_scores:
        rrf_scores[doc_id] = 0.0
    rrf_scores[doc_id] += score

for entry in kg_docs:
    doc_id = str(entry.get("id"))
    rank = entry.get("rank", 100)
    score = weights["kg"] * (1.0 / (k + rank))
    if doc_id not in rrf_scores:
        rrf_scores[doc_id] = 0.0
    rrf_scores[doc_id] += score

rrf_sorted = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
for id,i in enumerate(rrf_sorted[:5]):
    print(f'RRF Score - {rrf_sorted[id][1]}')
    print(df.loc[df["id"]==int(rrf_sorted[id][0])].to_dict())