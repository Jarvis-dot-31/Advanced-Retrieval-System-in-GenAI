from __future__ import annotations
import asyncio
import logging
import json
from dataclasses import dataclass, field
from typing import Optional, List, Dict
import numpy as np
import faiss
from opensearchpy import AsyncOpenSearch
from neo4j import AsyncGraphDatabase

from src.config import OPENSEARCH_HOST, OPENSEARCH_PORT, OPENSEARCH_INDEX, FAISS_INDEX_PATH, NEO4J_URI, NEO4J_USER, NEO4J_PASS

logger = logging.getLogger(__name__)

# Basic connections
try:
    os_client = AsyncOpenSearch(hosts=[{'host': OPENSEARCH_HOST, 'port': OPENSEARCH_PORT}], http_compress=True)
except Exception: os_client = None

try:
    faiss_index = faiss.read_index(FAISS_INDEX_PATH)
except Exception: faiss_index = None

try:
    neo4j_driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
except Exception: neo4j_driver = None


@dataclass
class RetrievalResult:
    source: str
    hits: list = field(default_factory=list)
    error: Optional[str] = None

async def safe_retrieve(coro, source_name: str) -> RetrievalResult:
    """Wraps any retrieval coroutine; captures exceptions gracefully."""
    try:
        hits = await coro
        return RetrievalResult(source=source_name, hits=hits)
    except Exception as exc:
        logger.warning(f"Retrieval channel {source_name} failed: {exc}")
        return RetrievalResult(source=source_name, hits=[], error=str(exc))

async def opensearch_bm25(query_text: str, k: int = 100, min_yoe: float = 0) -> list:
    if not os_client: return []
    query = {
        "bool": {
            "must": [
                {
                    "multi_match": {
                        "query": query_text,
                        "fields": ["skill_summary", "core_skills^2.0", "potential_roles^1.5"]
                    }
                }
            ]
        }
    }
    
    if min_yoe > 0:
        query["bool"]["filter"] = [{"range": {"years_of_experience": {"gte": min_yoe}}}]

    body = {
        "size": k,
        "query": query
    }
    resp = await os_client.search(index=OPENSEARCH_INDEX, body=body)
    hits = [hit["_source"] for hit in resp["hits"]["hits"]]
    print(f"  [BM25] Found {len(hits)} candidates (min_yoe={min_yoe}).")
    return hits

async def faiss_ann_search(query_vec: list, k: int = 100) -> list:
    if not faiss_index: return []
    q = np.array([query_vec], dtype=np.float32)
    D, I = faiss_index.search(q, k)
    
    try:
        with open("id_map.json", "r") as f:
            id_map = json.load(f)
            rev_map = {v: k_id for k_id, v in id_map.items()}
    except Exception: return []
    
    hits = []
    for pos in I[0]:
        if pos == -1: break
        if pos in rev_map:
            hits.append({"id": rev_map[pos]})
    print(f"  [Dense] Found {len(hits)} semantic matches via FAISS.")
    return hits

async def neo4j_graph_retrieve(kg_entities: list, k: int = 100) -> list:
    if not neo4j_driver: return []
    print(f"  [Graph] Searching for entities (multi-hop): {kg_entities}")
    
    # Multi-hop query:
    # 1. Direct: Skill → Candidate (1-hop)
    # 2. Similar skills: Skill → SIMILAR_TO → Skill → Candidate (2-hop)
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
    async with neo4j_driver.session() as session:
        result = await session.run(cypher, skills=kg_entities, limit=k)
        records = await result.data()
        print(f"  [Graph] Found {len(records)} candidates via multi-hop skill relationships.")
        return records

async def parallel_retrieve(query_text: str, query_vec: list, kg_entities: list, top_k: int = 100, channels: list=None, min_yoe: float = 0) -> dict:
    tasks = {}
    if not channels or "bm25" in channels:
        tasks["bm25"] = safe_retrieve(opensearch_bm25(query_text, k=top_k, min_yoe=min_yoe), "bm25")
    if not channels or "dense" in channels:
        tasks["dense"] = safe_retrieve(faiss_ann_search(query_vec, k=top_k), "dense")
    if not channels or "graph" in channels:
        tasks["graph"] = safe_retrieve(neo4j_graph_retrieve(kg_entities, k=top_k), "graph")

    results_list = await asyncio.gather(*tasks.values())
    return {r.source: r.hits for r in results_list}

async def multi_query_retrieve_and_fuse(expanded: dict, top_k: int = 100) -> list:
    from src.ranking import reciprocal_rank_fusion
    from src.intent import model
    
    per_query_results = []
    min_yoe = expanded.get("detected_min_yoe", 0)
    for q in expanded.get("expanded_queries", []):
        q_vec = model.encode(q, normalize_embeddings=True).tolist()
        raw = await parallel_retrieve(q, q_vec, expanded.get("skill_synonyms", []), top_k, min_yoe=min_yoe)
        fused = reciprocal_rank_fusion(raw)
        per_query_results.append({hit["id"]: i for i, hit in enumerate(fused)})
    
    # HyDE standalone dense retrieval
    hyde_raw = await parallel_retrieve("", expanded.get("hyde_embedding", []), [], top_k, channels=["dense"])
    per_query_results.append({hit["id"]: i for i, hit in enumerate(hyde_raw.get("dense", []))})
    
    # Merge lists via mapping
    all_lists = {f"q{i}": [{"id": cid} for cid in sorted(d, key=d.__getitem__)] for i, d in enumerate(per_query_results)}
    return reciprocal_rank_fusion(all_lists, k=60)[:top_k]
