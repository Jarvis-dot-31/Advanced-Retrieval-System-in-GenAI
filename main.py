import faiss
import numpy as np
import pandas as pd
from neo4j import GraphDatabase
from src import config
import json
import re
import openai
from resume_parser import parse_resume
import pickle
from opensearchpy import OpenSearch
from sentence_transformers import SentenceTransformer, CrossEncoder
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import asyncio
from typing import List
from collections import defaultdict
import math
import csv
import pdfplumber
import uuid
from io import BytesIO
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchAPI(BaseModel):
    query: str
    k: int

class CandidateModel(BaseModel):
    id: str
    name: str
    core_skills: str
    secondary_skills: str = ""
    soft_skills: str = ""
    years_of_experience: float
    potential_roles: str
    skill_summary: str
    location: str = "Unknown"
    projects: str = ""

def clean_json_response(text: str) -> str:
    text = text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def extract_skill_tokens(query: str) -> list:
    stopwords = {"looking", "for", "expert", "seeking", "need", "hire", "with", "want", "experience", "years", "proficient", "skill", "skilled"}
    tokens = [word.lower() for word in re.findall(r'\w+', query)]
    return [t for t in tokens if len(t) > 2 and t not in stopwords]

def classify_intent(query: str) -> str:
    if "years" in query or "fresher" in query or "junior" in query:
        return "Experience"
    elif "role" in query or "hire a" in query:
        return "Role"
    return "Skill"

def skill_overlap_score(doc, query_entities: list) -> float:
    """Compute fraction of query entities found in candidate's core+secondary skills."""
    if not query_entities:
        return 1.0
    text = (str(doc.get("core_skills", "")) + " " + str(doc.get("secondary_skills", ""))).lower()
    hits = sum(1 for e in query_entities if e.lower() in text)
    return max(hits / len(query_entities), 0.1)  

def parse_skills(skills_str):
    if not skills_str:
        return []
    parts = [s.strip() for s in skills_str.split(",") if s.strip()]
    result = []
    for p in parts:
        match = re.match(r'^(.+?)\s*\((\w[\w\s]*)\)\s*$', p)
        if match:
            result.append({"skill": match.group(1).strip(), "level": match.group(2).strip()})
        else:
            result.append({"skill": p.strip(), "level": "Competent"})
    return result

async def generate_reason(candidate: dict, query: str) -> str:
    profile_summary = (
        f"Name: {candidate.get('name', 'N/A')}, "
        f"Skills: {candidate.get('core_skills', 'N/A')}, "
        f"Roles: {candidate.get('potential_roles', 'N/A')}, "
        f"Experience: {candidate.get('years_of_experience', 'N/A')} years, "
        f"Soft Skills: {candidate.get('soft_skills', 'N/A')}"
    )
    reason_prompt = (
        f"You are a talent search assistant. A recruiter searched for: \"{query}\"\n"
        f"This candidate was returned:\n{profile_summary}\n\n"
        f"In 2-3 concise sentences, explain why this candidate is a good match for the query. "
        f"Focus on specific skill overlaps, relevant experience, and role fit. "
        f"Do NOT use any markdown formatting. Return ONLY the plain-text explanation."
    )
    try:
        resp = await client.chat.completions.create(
            model=config.LLM_MODEL_NAME,
            messages=[{"role": "user", "content": reason_prompt}],
            temperature=0.3
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Reason generation failed: {e}")
        skills = str(candidate.get("core_skills", ""))
        return f"This candidate's skills ({skills}) align with the search query."

async def expand_query(query: str, intent: str) -> dict:
    rephrase_prompt = f"""
    You are a talent search assistant. Analyze this query: "{query}"
    1. Rephrase it in 3 different ways with different vocabulary.
    2. Extract only the CORE technical skills/entities (e.g., "Python", "AWS").
    3. If the user mentions years of experience, extract it as a number (e.g., "more than 5 years" -> 5). If not, return 0.
    
    Return ONLY a JSON object: 
    {{
      "queries": ["q1", "q2", "q3"],
      "entities": ["skill1", "skill2"],
      "min_yoe": 5
    }}
    """
    try:
        resp = await client.chat.completions.create(
            model=config.LLM_MODEL_NAME,
            messages=[{"role": "user", "content": rephrase_prompt}],
            temperature=0.4
        )
        content = clean_json_response(resp.choices[0].message.content)
        data = json.loads(content)
        rephrased = data.get("queries", [])
        llm_entities = data.get("entities", [])
        min_yoe = data.get("min_yoe", 0)
    except Exception as e:
        print(f"Failed to generate rephrased queries via Ollama: {e}")
        rephrased = []
        llm_entities = []
        min_yoe = 0

    hyde_prompt = f"""
    Write a 3-sentence candidate profile summary for someone who perfectly matches:
    "{query}"
    Write as if it is a real profile.
    """
    try:
        hyde_resp = await client.chat.completions.create(
            model=config.LLM_MODEL_NAME,
            messages=[{"role": "user", "content": hyde_prompt}],
            temperature=0.3
        )
        synthetic_doc = hyde_resp.choices[0].message.content
        hyde_vec = model.encode(synthetic_doc, normalize_embeddings=True).tolist()
    except Exception as e:
        print(f"HyDE generation failed via Ollama: {e}")
        hyde_vec = model.encode(query, normalize_embeddings=True).tolist()

    return {
        "original": query,
        "expanded_queries": [query] + rephrased,
        "hyde_embedding": hyde_vec,
        "skill_synonyms": list(set(extract_skill_tokens(query) + llm_entities)),
        "detected_min_yoe": min_yoe
    }

client = openai.AsyncOpenAI(
    api_key=config.OPENAI_API_KEY,
    base_url=config.OPENAI_BASE_URL
)
model = SentenceTransformer(config.SBERT_MODEL_NAME)
cross_encoder = CrossEncoder(config.CROSS_ENCODER_MODEL_NAME)

URL = "bolt://localhost:7687"
AUTH = ("neo4j", "password123")
driver = GraphDatabase.driver(URL, auth=AUTH)

faiss_index=faiss.read_index("Vecdb_embeddings/docs.index")
with open("Vecdb_embeddings/docs.pickle", "rb") as f:
    order=pickle.load(f)

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
df=pd.read_csv("Dataset/profiles.csv")
df = df.replace({np.nan: None})

# mappings= {
#         "cloud": ["AWS", "Azure", "GCP", "Deocker", "Kubernetes"],
#         "infrastructure": ["Terraform", "Ansible", "AWS", "Azure", "Docker"],
#         "web": ["HTML", "CSS", "JavaScript", "React", "Angular"],
#         "frontend": ["HTML", "CSS", "JavaScript", "React", "Angular", "Vue"],
#         "backend": ["Node.js", "Django", "Spring", "FastAPI", "Express"],
#         "fullstack": ["React", "Node.js", "JavaScript", "MongoDB"],
#         "devops": ["Docker", "Kubernetes", "Jenkins", "Terraform", "CI/CD"],
#         "data": ["Python", "SQL", "Pandas", "Spark", "ETL"],
#         "mobile": ["React Native", "Flutter", "Swift", "Kotlin", "Android"],
#         "security": ["Cybersecurity", "Pentesting", "SIEM", "Firewall"],
#         "database": ["SQL", "MySQL", "PostgreSQL", "MongoDB", "Oracle"],
#         "automation": ["Selenium", "Python", "Ansible", "Terraform"],
#         "testing": ["Selenium", "JUnit", "Pytest", "Cypress", "QA"],
#         "ci/cd": ["Jenkins", "GitLab", "GitHub Actions", "CircleCI", "Travis CI"],
#     }

qu="CI/CD pipeline engineer"
entities=["CI/CD","engineer","Jenkins"]
min_yoe=0
hyde_emb=[]
rephrased_qu=[]

@app.post("/query")
async def search(req:SearchAPI):
    query=req.query
    k=req.k
    intent=classify_intent(query)    
    res = await expand_query(query,intent)

    qu=res["original"]
    entities=res["skill_synonyms"]
    min_yoe=res["detected_min_yoe"]
    hyde_emb=res["hyde_embedding"]
    rephrased_qu=list(set(res["expanded_queries"]))
    es_docs=[]
    faiss_docs=[]
    kg_docs = []
    entity_boosts = [{"match": {"core_skills": {"query": ent, "boost": 3}}} for ent in entities]
    entity_boosts += [{"match": {"secondary_skills": {"query": ent, "boost": 1.5}}} for ent in entities]

    seen_es_ids = set()
    for prompt in rephrased_qu:
        es_res = es.search(
            index=config.OPENSEARCH_INDEX,
            body={
                "query": {
                    "bool": {
                        "must": [
                            {
                                "multi_match": {
                                    "query": prompt,
                                    "fields": [
                                        "core_skills^4",
                                        "potential_roles^3",
                                        "secondary_skills^2",
                                        "soft_skills^1",
                                        "skill_summary"
                                    ],
                                    "minimum_should_match": "60%"
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
                        "should": entity_boosts
                    }
                }
            }
        )
        for i, hit in enumerate(es_res["hits"]["hits"]):
            df_index = int(hit["_id"])
            doc_id = int(df.loc[df_index, "id"]) if df_index in df.index else df_index
            if doc_id not in seen_es_ids:
                seen_es_ids.add(doc_id)
                es_docs.append({
                    "id": doc_id,
                    "doc": hit["_source"],
                    "BM25score": hit["_score"],
                    "rank": len(es_docs) + 1  
                })
    
    hyde_np = np.array([hyde_emb]).astype('float32')
    faiss_fetch = max(50, k * 5)  
    dist, ind = faiss_index.search(hyde_np, k=faiss_fetch)
    faiss_rank = 1
    for i in range(len(ind[0])):
        df_index = int(ind[0][i])
        doc_id = int(df.loc[df_index, "id"]) if df_index in df.index else df_index
        row = df.loc[df["id"] == doc_id]
        if not row.empty and min_yoe > 0:
            yoe = row.iloc[0].get("years_of_experience", 0) or 0
            if yoe < min_yoe:
                continue
        faiss_docs.append({
            "id": doc_id,
            "doc": order[ind[0][i]],
            "distance": dist[0][i],
            "rank": faiss_rank
        })
        faiss_rank += 1

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
        result = session.run(cypher, skills=entities, limit=30)
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

    weights = {
        "faiss": 0.35,
        "es": 0.4,
        "kg": 0.25
    }
    rrf_k = 60  

    def best_rank_map(docs):
        best = {}
        for d in docs:
            doc_id = str(d.get("id"))
            rank = d.get("rank", 100)
            if doc_id not in best or rank < best[doc_id]:
                best[doc_id] = rank
        return best

    faiss_best = best_rank_map(faiss_docs)
    es_best    = best_rank_map(es_docs)
    kg_best    = best_rank_map(kg_docs)

    rrf_scores = defaultdict(float)
    all_ids = set(faiss_best) | set(es_best) | set(kg_best)
    for doc_id in all_ids:
        if doc_id in faiss_best:
            rrf_scores[doc_id] += weights["faiss"] * (1.0 / (rrf_k + faiss_best[doc_id]))
        if doc_id in es_best:
            matching = df.loc[df["id"] == int(doc_id)]
            if not matching.empty:
                overlap = skill_overlap_score(matching.iloc[0], entities)
            else:
                overlap = 1.0  
            rrf_scores[doc_id] += weights["es"] * (1.0 / (rrf_k + es_best[doc_id])) * overlap
        if doc_id in kg_best:
            rrf_scores[doc_id] += weights["kg"] * (1.0 / (rrf_k + kg_best[doc_id]))

    rrf_sorted = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    rerank_pool_size = min(k * 3, len(rrf_sorted))
    rerank_candidates = []
    for doc_id, rrf_score in rrf_sorted[:rerank_pool_size]:
        matching_rows = df.loc[df["id"] == int(doc_id)]
        doc_data = matching_rows.to_dict("records")[0] if not matching_rows.empty else {}
        rerank_candidates.append({"doc_id": doc_id, "rrf_score": rrf_score, "candidate": doc_data})

    if rerank_candidates:
        ce_pairs = [
            (qu, str(c["candidate"].get("skill_summary", "") or ""))
            for c in rerank_candidates
        ]
        ce_scores = cross_encoder.predict(ce_pairs)
        for i, score in enumerate(ce_scores):
            rerank_candidates[i]["ce_score"] = float(score)
        max_rrf = max(c["rrf_score"] for c in rerank_candidates) or 1
        max_ce = max(c["ce_score"] for c in rerank_candidates) or 1
        min_ce = min(c["ce_score"] for c in rerank_candidates)
        ce_range = (max_ce - min_ce) or 1
        for c in rerank_candidates:
            norm_rrf = c["rrf_score"] / max_rrf
            norm_ce = (c["ce_score"] - min_ce) / ce_range
            c["final_score"] = 0.4 * norm_rrf + 0.6 * norm_ce
        rerank_candidates.sort(key=lambda x: x["final_score"], reverse=True)

    final_results = []
    top_k = min(k, len(rerank_candidates))
    for entry in rerank_candidates[:top_k]:
        final_results.append({
            "rank_score": entry["final_score"],
            "candidate": entry["candidate"]
        })
        print(f'Final Score - {entry["final_score"]:.4f}  (RRF={entry["rrf_score"]:.4f}, CE={entry["ce_score"]:.4f})')
        print(entry["candidate"])

    reason_tasks = [generate_reason(r["candidate"], qu) for r in final_results]
    reasons = await asyncio.gather(*reason_tasks)
    for i, reason in enumerate(reasons):
        final_results[i]["reason"] = reason

    return {"results": final_results, "rephrased_queries": rephrased_qu}

@app.post("/add-candidate")
async def add_candidate(resume: UploadFile = File(...)):
    global df, faiss_index, order
    
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        pdf_content = await resume.read()
        text = ""
        with pdfplumber.open(BytesIO(pdf_content)) as pdf_file:
            for page in pdf_file.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        next_id = int(df["id"].max()) + 1
        new_row = parse_resume(text, next_id=next_id)
        print(f"[AddCandidate] Parsed: {new_row['name']} (ID: {new_row['id']})")

        csv_path = "Dataset/profiles.csv"
        pdf_row = pd.DataFrame([new_row])
        pdf_row.to_csv(csv_path, mode='a', header=False, index=False, quoting=csv.QUOTE_ALL)

        df = pd.concat([df, pdf_row], ignore_index=True)
        new_idx = len(df) - 1
        es.index(index=config.OPENSEARCH_INDEX, id=new_idx, body=new_row)
        text_for_emb = new_row["skill_summary"] or f"{new_row['name']} {new_row['core_skills']}"
        new_emb = model.encode([text_for_emb], normalize_embeddings=True).astype('float32')
        faiss_index.add(new_emb)      
        order.append(new_row)
        with open("Vecdb_embeddings/docs.pickle", "wb") as f:
            pickle.dump(order, f)
        faiss.write_index(faiss_index, "Vecdb_embeddings/docs.index")

        core_skills_parsed = parse_skills(new_row.get("core_skills", ""))
        soft_skills_parsed = parse_skills(new_row.get("soft_skills", ""))
        roles_list = [r.strip() for r in (new_row.get("potential_roles", "") or "").split(",") if r.strip()]

        kg_cypher = """
        MERGE (c:Candidate {id: $id})
        SET c.name = $name, c.yoe = $yoe, c.embedding = $embedding
        WITH c
        UNWIND $core_skills AS skill_entry
        MERGE (sk:Skill {name: skill_entry.skill})
        MERGE (c)-[r:HAS_SKILL]->(sk)
        SET r.level = skill_entry.level, r.category = 'core'
        WITH c
        UNWIND $roles AS role_title
        MERGE (ro:Role {title: role_title})
        MERGE (c)-[:SUITS_ROLE]->(ro)
        WITH c
        UNWIND $soft_skills AS soft_skill
        MERGE (ss:SoftSkill {name: soft_skill.skill})
        MERGE (c)-[:HAS_SOFT_SKILL]->(ss)
        """
        with driver.session() as session:
            session.run(kg_cypher,
                id=new_row["id"],
                name=new_row.get("name", ""),
                yoe=new_row.get("years_of_experience", 0),
                embedding=new_emb[0].tolist(),
                core_skills=core_skills_parsed,
                roles=roles_list,
                soft_skills=soft_skills_parsed)
        print(f"[AddCandidate] Indexed into Neo4j graph")

        return {"status": "success", "candidate_id": new_row["id"], "data": new_row}
    except Exception as e:
        print(f"Error adding candidate: {e}")
        return {"status": "failure", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)