from elasticsearch import Elasticsearch
import pandas as pd

es=Elasticsearch("http://localhost:9200")
mapping={
    "mappings":{
        "properties":{
            "name":{"type":"text"},
            "core_skills":{"type":"text"},
            "secondary_skills": {"type": "text"},
            "years_of_experience": {"type": "float"},
            "soft_skills": {"type":"text"},
            "potential_roles": {"type": "text"},
            "skill_summary": {"type": "text"}
        }
    }
}

es.options(ignore_status=400).indices.create(index="res_docs", body=mapping)
df=pd.read_csv("/home/pranab/dl_hackathon/Dataset/profiles.csv")
df = df.where(pd.notnull(df), None)

for i,row in df.iterrows():
    text={
        "name": row["name"],
        "core_skills": row["core_skills"],
        "secondary_skills": row["secondary_skills"],
        "years_of_experience": row["years_of_experience"],
        "soft_skills":row["soft_skills"],
        "potential_roles": row["potential_roles"],
        "skill_summary": row["skill_summary"]
    }
    es.index(index="res_docs",id=i,document=text)

query="Python backend developer"
res = es.search(
    index="res_docs",
    body={
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": query,
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
                            "years_of_experience": {"gte": 5}
                        }
                    }
                ],
                "should": [{"match":{"core_skills":i}} for i in query.split()]
            }
        }
    }
)

for hit in res["hits"]["hits"][:5]:
    print("Score:", hit["_score"])
    print(hit["_source"])