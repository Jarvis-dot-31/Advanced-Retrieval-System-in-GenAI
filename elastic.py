from opensearchpy import OpenSearch
import pandas as pd
from src import config

host = config.OPENSEARCH_HOST
port = config.OPENSEARCH_PORT
auth = (config.OPENSEARCH_USER, config.OPENSEARCH_PASS)

es = OpenSearch(
    hosts = [{'host': host, 'port': port}],
    http_compress = True,
    http_auth = auth,
    use_ssl = False,
    verify_certs = False,
    ssl_assert_hostname = False,
    ssl_show_warn = False,
)
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

try:
    es.indices.create(index=config.OPENSEARCH_INDEX, body=mapping)
except Exception as e:
    pass
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
    es.index(index=config.OPENSEARCH_INDEX, id=i, body=text)

query="Python backend developer"
res = es.search(
    index=config.OPENSEARCH_INDEX,
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