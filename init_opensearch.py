from opensearchpy import OpenSearch
import pandas as pd
from src import config

host = config.OPENSEARCH_HOST
port = config.OPENSEARCH_PORT
auth = (config.OPENSEARCH_USER, config.OPENSEARCH_PASS)

open_search = OpenSearch(
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
    open_search.indices.create(index=config.OPENSEARCH_INDEX, body=mapping)
except Exception as e:
    pass
df=pd.read_csv("Dataset/profiles.csv")
df = df.where(pd.notnull(df), None)

for i,row in df.iterrows():
    try:
        yoe = float(row["years_of_experience"]) if pd.notnull(row["years_of_experience"]) else 0.0
    except:
        yoe = 0.0
        
    text={
        "name": str(row["name"]) if row["name"] else "",
        "core_skills": str(row["core_skills"]) if row["core_skills"] else "",
        "secondary_skills": str(row["secondary_skills"]) if row["secondary_skills"] else "",
        "years_of_experience": yoe,
        "soft_skills": str(row["soft_skills"]) if row["soft_skills"] else "",
        "potential_roles": str(row["potential_roles"]) if row["potential_roles"] else "",
        "skill_summary": str(row["skill_summary"]) if row["skill_summary"] else ""
    }
    open_search.index(index=config.OPENSEARCH_INDEX, id=i, body=text)

query="Python backend developer"
res = open_search.search(
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