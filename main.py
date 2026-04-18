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

faiss_index=faiss.read_index("/home/pranab/dl_hackathon/Vecdb_embeddings/docs.index")
with open("/home/pranab/dl_hackathon/Vecdb_embeddings/docs.pickle", "rb") as f:
    order=pickle.load(f)

es=Elasticsearch("http://localhost:9200")
df=pd.read_csv("/home/pranab/dl_hackathon/Dataset/profiles.csv")

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
MATCH (sk:Skill)<-[:HAS_SKILL]-(c:Candidate)
WHERE toLower(sk.name) CONTAINS toLower(skill_name)
RETURN DISTINCT c.id AS id LIMIT $limit
"""
with driver.session() as session:
    result = session.run(cypher, skills=entities, limit=5)
    for record in result:
        kg_docs.append(record["id"])

print(f"Graph Candidates found: {len(kg_docs)}")
for candidate_id in kg_docs:
    print(f"Candidate ID: {candidate_id}")