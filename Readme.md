# 🏗️ INSIGHT — System Architecture Deep Dive

> **Hybrid Retrieval System for Talent Discovery**
> A production-grade FastAPI application that combines BM25 lexical search (OpenSearch), dense vector ANN search (FAISS HNSW), and multi-hop graph traversal (Neo4j) into a single unified pipeline with LLM-powered explainability and RAGAS-based evaluation.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Infrastructure Layer](#4-infrastructure-layer)
5. [Data Ingestion Pipeline](#5-data-ingestion-pipeline)
6. [Query Processing Flow (End-to-End)](#6-query-processing-flow-end-to-end)
7. [Intent Classification & Query Expansion](#7-intent-classification--query-expansion)
8. [Hybrid Retrieval Engine](#8-hybrid-retrieval-engine)
9. [Multi-Stage Ranking Pipeline](#9-multi-stage-ranking-pipeline)
10. [LLM Explainability Layer](#10-llm-explainability-layer)
11. [Knowledge Graph Architecture](#11-knowledge-graph-architecture)
12. [Dynamic Schema Extension System](#12-dynamic-schema-extension-system)
13. [Resume Upload & Parsing Pipeline](#13-resume-upload--parsing-pipeline)
14. [RAGAS Evaluation Suite](#14-ragas-evaluation-suite)
15. [API Endpoints Reference](#15-api-endpoints-reference)
16. [Data Models & Document Schema](#16-data-models--document-schema)
17. [Scoring Mathematics](#17-scoring-mathematics)
18. [SSE Streaming Architecture](#18-sse-streaming-architecture)
19. [Configuration & Environment](#19-configuration--environment)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React UI / cURL)                      │
│                   POST /search  |  POST /upload-resume               │
└──────────────────┬───────────────────────────────────────────────────┘
                   │  SSE Stream (text/event-stream)
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     FastAPI Application (main.py)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Intent    │→│  Multi-Query  │→│   Parallel    │→│  Ranking   │  │
│  │ Classifier  │  │  Expansion   │  │  Retrieval   │  │  Pipeline  │  │
│  └────────────┘  └──────────────┘  └──────┬───────┘  └─────┬─────┘  │
│                                    ┌──────┼───────┐        │        │
│                                    ▼      ▼       ▼        ▼        │
│                              ┌─────┐ ┌─────┐ ┌─────┐  ┌────────┐   │
│                              │BM25 │ │FAISS│ │Neo4j│  │Explain │   │
│                              │     │ │HNSW │ │Graph│  │ (LLM)  │   │
│                              └──┬──┘ └──┬──┘ └──┬──┘  └────────┘   │
└─────────────────────────────────┼───────┼───────┼───────────────────┘
                                  ▼       ▼       ▼
                       ┌──────────────────────────────────────┐
                       │        Storage / Index Layer          │
                       │  OpenSearch │ FAISS File │ Neo4j Bolt │
                       │  :9200      │ .faiss     │ :7687      │
                       └──────────────────────────────────────┘
                                       │
                                  ┌────┴────┐
                                  │  Ollama │  (llama3, local LLM)
                                  │ :11434  │
                                  └─────────┘
```

---

## 2. Technology Stack

| Layer                | Technology                                       | Purpose                                             |
| :------------------- | :----------------------------------------------- | :-------------------------------------------------- |
| **Web Framework**    | FastAPI + Uvicorn                                | Async HTTP server with SSE streaming                |
| **Lexical Search**   | OpenSearch 2.x                                   | BM25 full-text search with custom analyzers         |
| **Vector Search**    | FAISS (IndexHNSWFlat)                            | Approximate Nearest Neighbor (384-dim)              |
| **Graph DB**         | Neo4j (Bolt protocol)                            | Multi-hop skill/candidate relationship queries      |
| **Embedding**        | `sentence-transformers/all-MiniLM-L6-v2` (SBERT) | 384-dimensional normalized embeddings               |
| **Cross-Encoder**    | `cross-encoder/ms-marco-MiniLM-L-6-v2`           | Pairwise relevance scoring for reranking            |
| **LLM**              | Ollama (llama3) via OpenAI-compat API            | Query expansion, HyDE, resume parsing, explanations |
| **Evaluation**       | RAGAS + LangChain                                | Faithfulness, relevancy, context precision/recall   |
| **Frontend**         | React / Next.js (TypeScript)                     | Search UI with SSE consumption                      |
| **Containerization** | Docker Compose                                   | OpenSearch + Neo4j orchestration                    |

---

## 3. Project Structure

```
hackathon/
├── main.py                    # FastAPI app — all endpoints, SSE streaming, orchestration
├── ingest_pipeline.py         # Batch ingestion: CSV → OpenSearch + FAISS + Neo4j
├── cleanup_dbs.py             # DB cleanup utility
├── docker-compose.yml         # OpenSearch + Neo4j containers
├── data.csv                   # Source dataset (~1700 candidates)
├── candidates_index.faiss     # Pre-built FAISS HNSW index (3.2 MB)
├── id_map.json                # FAISS position → candidate ID mapping
├── email_map.json             # Email → candidate ID mapping (resume uploads)
├── schema_extensions.json     # Dynamic column definitions (location, projects)
├── serve.html                 # Legacy static HTML search page
├── requirements.txt           # Python dependencies
│
├── src/
│   ├── __init__.py
│   ├── config.py              # All configuration constants (env-var backed)
│   ├── intent.py              # Intent classification + LLM query expansion + HyDE
│   ├── retrieval.py           # Parallel retrieval (BM25 + FAISS + Neo4j) + RRF fusion
│   ├── ranking.py             # RRF, Cross-Encoder reranking, MMR, proficiency boost
│   ├── explainability.py      # LLM-powered explanation generation
│   ├── preprocessing.py       # CSV row → structured document + skill proficiency parsing
│   ├── indexing.py            # SBERT embedding + bulk/single indexing into OS & FAISS
│   ├── kg_builder.py          # Neo4j graph construction + similarity edge building
│   ├── schema_manager.py      # Dynamic column management (runtime monkey-patching)
│   ├── resume_parser.py       # PDF → Ollama → structured candidate data
│   └── evaluation.py          # RAGAS evaluation suite (NDCG, MRR, faithfulness)
│
├── scripts/
│   └── test_pipeline.py       # Evaluation runner script
│
├── UI/SearchUI/src/           # React frontend
│   ├── components/            # Navbar, search cards, etc.
│   ├── views/                 # SearchPage, etc.
│   ├── services/              # API client layer
│   ├── contexts/              # React context providers
│   └── models/                # TypeScript type definitions
│
└── traces/                    # Auto-generated per-query trace JSONs
```

---

## 4. Infrastructure Layer

### Docker Compose Services

Defined in `docker-compose.yml`:

```yaml
opensearch:
  image: opensearchproject/opensearch:latest
  ports: 9200:9200
  env: discovery.type=single-node, DISABLE_SECURITY_PLUGIN=true

neo4j:
  image: neo4j:latest
  ports: 7474 (HTTP), 7687 (Bolt)
  auth: neo4j/password123
```

### Additional Services (External)

| Service     | Port    | Role                                  |
| ----------- | ------- | ------------------------------------- |
| **Ollama**  | `11434` | Local LLM server for llama3 inference |
| **FastAPI** | `8000`  | Application server (uvicorn)          |

---

## 5. Data Ingestion Pipeline

**File: `ingest_pipeline.py`**

This is the batch data loading path — run once to initialize all three backends from `data.csv`.

```
┌─────────┐     ┌──────────────┐     ┌───────────────┐
│ data.csv │────▶│ build_document│────▶│  embed_document│
│ (~1700)  │     │ (preprocess) │     │  (SBERT 384d) │
└─────────┘     └──────┬───────┘     └───────┬───────┘
                       │                     │
              ┌────────┼─────────────────────┼────────────┐
              ▼        ▼                     ▼            ▼
        ┌──────────┐ ┌────────────┐   ┌──────────┐  ┌─────────┐
        │OpenSearch │ │ FAISS HNSW │   │  Neo4j   │  │id_map   │
        │bulk_index│ │  .add()    │   │ ingest + │  │ .json   │
        │(200/batch)│ │            │   │ edges    │  │         │
        └──────────┘ └────────────┘   └──────────┘  └─────────┘
```

### Step-by-Step:

1. **Load CSV** — `pd.read_csv("data.csv").fillna("")`
2. **Preprocess** — For each row, `build_document(row)` in `preprocessing.py`:
   - Parses skill strings: `"Python (Expert), SQL (Competent)"` → `[{"skill":"Python","level":5}, {"skill":"SQL","level":3}]`
   - Extracts flat BM25 text fields + nested parsed structures
   - Maps proficiency: `Beginner=1, Advanced Beginner=2, Competent=3, Proficient=4, Expert=5`
3. **OpenSearch** — Recreates index with custom mapping, bulk indexes via `helpers.bulk()` (200 docs/batch)
4. **FAISS** — Creates `IndexHNSWFlat(384, 32)` with `efConstruction=128, efSearch=128`, adds all vectors
5. **Neo4j** — Calls `kg_builder.ingest_candidate()` per doc (Cypher MERGE), then:
   - `build_skill_similarity_edges()` — pairwise SBERT cosine ≥ 0.75 → `SIMILAR_TO` edges between Skills
   - `build_candidate_similarity_edges()` — cosine ≥ 0.85 → `SIMILAR_TO` edges between Candidates
6. **Persist** — Writes `candidates_index.faiss` + `id_map.json` to disk

---

## 6. Query Processing Flow (End-to-End)

This is the full pipeline triggered by `POST /search`:

```
User Query: "Looking for a Python developer with 5+ years and AWS experience"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: INTENT CLASSIFICATION  (intent.py → classify_intent)    │
│                                                                 │
│  Rule-based classifier:                                         │
│  • "years" / "fresher" / "junior" → "Experience"                │
│  • "role" / "hire a" → "Role"                                   │
│  • default → "Skill"                                            │
│  Result: intent = "Experience"                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: QUERY EXPANSION  (intent.py → expand_query)             │
│                                                                 │
│  A. LLM Multi-Query Rephrasing (Ollama llama3):                 │
│     → 3 rephrased queries (up to 2 attempts, temp 0.3 → 0.1)   │
│     → Extracted entities: ["Python", "AWS"]                     │
│     → Detected min_yoe: 5                                       │
│                                                                 │
│  B. HyDE (Hypothetical Document Embedding):                     │
│     → LLM generates a synthetic ideal candidate profile         │
│     → SBERT encodes it → 384-dim hyde_vec                       │
│                                                                 │
│  C. Skill Token Extraction (rule-based):                        │
│     → Stopword removal + SKILL_EXPANSIONS map                   │
│     → "cloud" → ["AWS","Azure","GCP","Docker","Kubernetes"]     │
│     → Union with LLM entities → skill_synonyms                  │
│                                                                 │
│  Output: {                                                      │
│    expanded_queries: [original + 3 rephrased],                  │
│    hyde_embedding: [384 floats],                                │
│    skill_synonyms: ["python","aws",...],                        │
│    detected_min_yoe: 5                                          │
│  }                                                              │
└───────────────────────┬─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: PARALLEL RETRIEVAL  (retrieval.py)                      │
│                                                                 │
│  For EACH expanded query (4 total):                             │
│    ┌───────────────────────────────────────────┐                │
│    │ ╔═══════════╗  ╔═══════╗  ╔═══════════╗  │                │
│    │ ║  BM25     ║  ║ FAISS ║  ║  Neo4j    ║  │  ← PARALLEL   │
│    │ ║ OpenSearch║  ║ HNSW  ║  ║  Cypher   ║  │    asyncio     │
│    │ ╚═══════════╝  ╚═══════╝  ╚═══════════╝  │                │
│    └───────────────────────────────────────────┘                │
│    → Fuse via Reciprocal Rank Fusion (RRF)                      │
│                                                                 │
│  PLUS standalone HyDE dense retrieval:                          │
│    → FAISS-only search with synthetic doc embedding             │
│                                                                 │
│  Final: Merge ALL 5 fused lists via RRF again                   │
└───────────────────────┬─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: MULTI-STAGE RERANKING  (ranking.py + main.py)           │
│                                                                 │
│  A. Cross-Encoder Reranking (top 50):                           │
│     → (query, skill_summary) pairs scored by ms-marco model     │
│     → Combined = 0.2 × normalized_RRF + 0.8 × xenc_score       │
│                                                                 │
│  B. Hydration from OpenSearch:                                  │
│     → mget() to fetch full candidate documents                  │
│     → Merges ranking scores with full profile fields            │
│                                                                 │
│  C. Proficiency Boost/Penalty:                                  │
│     → Checks parsed skill fields for level ≥ 2 matches         │
│     → +20 × coverage + avg_proficiency bonus                    │
│     → No match anywhere → -25 penalty                           │
│                                                                 │
│  D. YOE Penalty:                                                │
│     → Candidates below min_yoe lose -3 points per year gap      │
│                                                                 │
│  E. Final sort by _combined score, take top_k                   │
└───────────────────────┬─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: EXPLANATION GENERATION  (explainability.py)              │
│                                                                 │
│  For top 5 candidates (parallelized via asyncio.create_task):   │
│    → LLM prompt with grounding rules                            │
│    → Uses candidate skills, YOE, roles as context               │
│    → Generates ≤60 word professional explanation                 │
│    → Mentions strengths + gaps                                  │
│                                                                 │
│  Remaining candidates get placeholder text                      │
└───────────────────────┬─────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: STREAMING RESPONSE  (SSE via StreamingResponse)         │
│                                                                 │
│  Events emitted (in order):                                     │
│    1. intent   → {intent, expanded_queries}                     │
│    2. retrieval → {count of raw results}                        │
│    3. candidate → {full profile + explanation} × top_k          │
│    4. done     → {latency_ms}                                   │
│                                                                 │
│  Trace JSON saved to traces/trace_YYYYMMDD_HHMMSS.json          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Intent Classification & Query Expansion

**File: `src/intent.py`**

### Intent Classification (`classify_intent`)

Simple rule-based classifier (no ML model):

```python
"years" / "fresher" / "junior"  →  "Experience"
"role"  / "hire a"              →  "Role"
default                         →  "Skill"
```

### Query Expansion (`expand_query`)

This is the most complex preprocessing step. It returns a dict with 4 keys:

#### A. Multi-Query Rephrasing (LLM)

- Sends the user query to Ollama with a structured prompt
- Requests 3 rephrased professional talent search queries
- Extracts technical entities (skills) and min YOE
- Retries with lower temperature on failure: `temp=0.3 → 0.1`
- `clean_json_response()` handles markdown fences, brace-counting, and array extraction

#### B. HyDE (Hypothetical Document Embedding)

- LLM generates a 3-sentence synthetic ideal candidate profile
- SBERT encodes the synthetic document into a 384-dim vector
- This vector represents "what a perfect match looks like" in embedding space
- Fallback: encode the raw query if LLM fails

#### C. Skill Token Extraction (Local)

- Removes stopwords from query
- Expands vague terms via mappings:
  ```
  "cloud"    → ["AWS", "Azure", "GCP", "Docker", "Kubernetes"]
  "frontend" → ["HTML", "CSS", "JavaScript", "React", "Angular", "Vue"]
  "devops"   → ["Docker", "Kubernetes", "Jenkins", "Terraform", "CI/CD"]
  ```
- Merged with LLM-extracted entities → `skill_synonyms`

#### D. YOE Extraction

- Regex fallback: `(\d+)\+?\s*(?:years?|yrs?|yoe)` if LLM missed it

---

## 8. Hybrid Retrieval Engine

**File: `src/retrieval.py`**

The retrieval layer runs three independent channels in parallel using `asyncio.gather()`:

### Channel 1: BM25 (OpenSearch)

```python
async def opensearch_bm25(query_text, k=100, min_yoe=0):
    # Multi-match across: skill_summary, core_skills (×2 boost), potential_roles (×1.5 boost)
    # Optional filter: years_of_experience >= min_yoe
```

- Uses a custom `skill_analyzer` with: `standard tokenizer → lowercase → stop → snowball`
- Returns raw `_source` dicts from hit results
- Good for exact keyword matches: "Python", "Kubernetes", "DevOps"

### Channel 2: Dense ANN (FAISS HNSW)

```python
async def faiss_ann_search(query_vec, k=100):
    # FAISS IndexHNSWFlat search
    # Reverses id_map.json to get candidate IDs from FAISS positions
```

- Index config: `HNSW(dim=384, M=32), efConstruction=128, efSearch=128`
- Returns `[{"id": "12345"}, ...]` (minimal — IDs only, hydrated later)
- Good for semantic similarity: "machine learning engineer" matches "ML specialist"

### Channel 3: Graph Traversal (Neo4j)

```python
async def neo4j_graph_retrieve(kg_entities, k=100):
    # Multi-hop Cypher query:
    # 1-hop: Skill → Candidate (direct HAS_SKILL match)
    # 2-hop: Skill → SIMILAR_TO → Skill → Candidate (transitive skill match)
```

- Uses `skill_synonyms` from query expansion as input entities
- Case-insensitive CONTAINS matching on skill names
- Returns candidate IDs discovered through graph relationships
- Good for: "I need someone who knows React" → finds candidates with "React.js", "React Native" via SIMILAR_TO edges

### Parallel Execution + Error Isolation

```python
async def safe_retrieve(coro, source_name) -> RetrievalResult:
    # Wraps any retrieval coroutine
    # Returns RetrievalResult(source, hits, error) — never throws
```

Each channel is wrapped in `safe_retrieve()` so a single backend failure doesn't crash the entire search.

### Multi-Query Retrieve & Fuse

```python
async def multi_query_retrieve_and_fuse(expanded, top_k=100):
    # For EACH of the 4 expanded queries:
    #   → Run all 3 channels in parallel
    #   → Fuse results with RRF
    # PLUS: standalone HyDE dense-only retrieval
    # Final: merge all 5 fused lists via RRF again
```

This creates a **2-level RRF cascade**:

1. **Inner level**: 3 channels fused per query → 1 ranked list per query
2. **Outer level**: 4 query results + 1 HyDE result → final fused ranking

---

## 9. Multi-Stage Ranking Pipeline

**File: `src/ranking.py` + scoring logic in `main.py`**

### Stage 1: Reciprocal Rank Fusion (RRF)

```
RRF_score(d) = Σ  w_channel × 1/(k + rank_channel(d))
               channel
```

- Default `k=60` (standard RRF constant)
- Default weights: `1.0` per channel (configurable)
- Tracks which channels matched each candidate (`_channels` list)

### Stage 2: Cross-Encoder Reranking

Applied to top 50 candidates:

```python
pairs = [(query, candidate.skill_summary) for each top-50 candidate]
scores = cross_encoder.predict(pairs)  # ms-marco-MiniLM-L-6-v2

combined = 0.2 × (rrf_score / max_rrf) + 0.8 × xenc_score
```

The 80/20 weighting **heavily favors semantic relevance** from the cross-encoder over statistical fusion.

### Stage 3: Hydration

After reranking, candidates are just IDs + scores. OpenSearch `mget()` fetches full documents:

```python
mget_resp = await os_client.mget(body={"ids": final_ids}, index="candidates")
# Merges: {full_profile_fields} + {_rrf_score, _xenc_score, _combined, _channels}
```

### Stage 4: Proficiency Boost

**The most sophisticated scoring logic.** Applied after hydration:

```
Input: candidate, query_level (1-5), skill_names_matched (from skill_synonyms)

Phase 1 — Structured Match Check:
  For each parsed skill field (core_skills_parsed, secondary_skills_parsed, soft_skills_parsed):
    If skill.name matches any queried skill:
      level >= 2 → "real match" (added to matched_parsed)
      level == 1 → "beginner match" (added to beginner_only)

Phase 2 — Raw Text Fallback:
  If no structured match: search raw string fields for any queried skill

Phase 3 — Score Adjustment:
  ┌────────────────────────────────────────────────────────┐
  │ Condition                        │ Score Change        │
  ├────────────────────────────────────────────────────────┤
  │ No match anywhere                │ base - 25.0         │
  │ Beginner-only match (level 1)    │ base + 1.0          │
  │ Raw text match only              │ base + 2.0          │
  │ Structured match (level ≥ 2)     │ base + 20×coverage  │
  │                                  │      + min(avg×0.6,3)│
  └────────────────────────────────────────────────────────┘

  coverage = |matched_entities| / |queried_skills|
  → 100% skill coverage = +20 boost, 50% = +10
```

### Stage 5: YOE Penalty

```python
if candidate.years_of_experience < detected_min_yoe:
    gap = min_yoe - cand_yoe
    score -= gap × 3.0  # -3 points per year short
```

### Stage 6: Final Sort

All candidates sorted by `_combined` (descending), sliced to `top_k`.

---

## 10. LLM Explainability Layer

**File: `src/explainability.py`**

### Explanation Generation

For each of the top 5 results, an LLM call generates a human-readable explanation:

```python
prompt = f"""
GROUNDING RULES:
1. ONLY use information in 'Core Skills' and 'Potential Roles'.
2. If a skill is NOT present, do NOT assume they have it.
3. If info missing → "Information not available for this requirement"
4. Start with matching STRENGTHS.
5. Mention specific matching skills, experience level, and relevant roles.
6. Briefly mention gaps at the end.
7. Be balanced and professional.
8. Keep it under 60 words.

Search Query: {query}
Candidate: {name}
Years of Experience: {yoe}
Core Skills: {core}
Potential Roles: {roles}
Matched Skills from Retrieval: {matched_skills}
Score: {combined_score}
"""
```

Config: `temperature=0.1, max_tokens=250, timeout=30s`

### Explanation Context Builder (`build_explain_data`)

```python
{
    "score_breakdown": {rrf_score, xenc_score, combined_score, channels_matched},
    "matched_skills": [top 5 core + top 3 secondary skills],
    "graph_paths": ["Found direct connections in neo4j" if "graph" in channels]
}
```

---

## 11. Knowledge Graph Architecture

**File: `src/kg_builder.py`**

### Node Types

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  :Candidate  │     │    :Skill     │     │    :Role     │     │  :SoftSkill  │
│  ─────────── │     │  ──────────  │     │  ──────────  │     │  ──────────  │
│  id (UNIQUE) │     │  name (UNIQUE)│     │ title (UNIQUE)│     │ name (UNIQUE)│
│  name        │     │              │     │              │     │              │
│  yoe         │     │              │     │              │     │              │
│  embedding[] │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Relationship Types

```
(Candidate)-[:HAS_SKILL {level: int, category: 'core'}]->(Skill)
(Candidate)-[:SUITS_ROLE]->(Role)
(Candidate)-[:HAS_SOFT_SKILL]->(SoftSkill)
(Skill)-[:SIMILAR_TO {weight: float}]->(Skill)         ← SBERT cosine ≥ 0.75
(Candidate)-[:SIMILAR_TO {sim: float}]->(Candidate)    ← embedding cosine ≥ 0.85
```

### Similarity Edge Construction

**Skill Similarity** (`build_skill_similarity_edges`):

1. Fetch all Skill node names from Neo4j
2. Batch encode with SBERT (batch_size=512)
3. Compute pairwise cosine similarity matrix
4. Create `SIMILAR_TO` edges for all pairs with sim ≥ 0.75

**Candidate Similarity** (`build_candidate_similarity_edges`):

1. Fetch all Candidate embeddings from Neo4j
2. L2 normalize
3. Compute pairwise cosine similarity
4. Create `SIMILAR_TO` edges for pairs with sim ≥ 0.85

### Graph Query (During Search)

```cypher
UNWIND $skills AS skill_name
MATCH (sk:Skill) WHERE toLower(sk.name) CONTAINS toLower(skill_name)

// 1-hop: Direct skill → candidate
OPTIONAL MATCH (sk)<-[:HAS_SKILL]-(direct:Candidate)

// 2-hop: Similar skills → their candidates
OPTIONAL MATCH (sk)-[:SIMILAR_TO]->(related_skill:Skill)<-[:HAS_SKILL]-(indirect:Candidate)

WITH collect(DISTINCT direct.id) + collect(DISTINCT indirect.id) AS all_ids
UNWIND all_ids AS cid
WITH DISTINCT cid WHERE cid IS NOT NULL
RETURN cid AS id LIMIT $limit
```

---

## 12. Dynamic Schema Extension System

**File: `src/schema_manager.py`**

The schema manager allows adding new fields at runtime without code changes.

### Architecture

```
schema_extensions.json
    │
    ▼
┌──────────────────┐
│  SchemaManager    │
│  ──────────────── │
│  • add_column()   │──→ Registers field in JSON
│  • apply_opensearch()│──→ PUT /_mapping on OpenSearch
│  • patch_build_document() │──→ Monkey-patches preprocessing.py
│  • bulk_backfill() │──→ update_by_query (OS) + SET (Neo4j)
│  • single_candidate_backfill() │──→ Partial update for one candidate
└──────────────────┘
```

### Column Config Format

```json
[
  {
    "name": "location",
    "csv_column": "location",
    "os_type": "keyword",
    "default": "Unknown",
    "semantic": false // NOT appended to FAISS embedding
  },
  {
    "name": "projects",
    "csv_column": "projects",
    "os_type": "text",
    "default": "",
    "semantic": true // APPENDED to skill_summary for FAISS
  }
]
```

### Runtime Monkey-Patching

At startup, `main.py` patches `build_document`:

```python
schema_manager = SchemaManager()
preprocessing.build_document = schema_manager.patch_build_document(preprocessing.build_document)
```

The patched function:

1. Calls original `build_document(row)` → gets base doc
2. Injects each extension field from the row
3. If `semantic=True`, appends field value to `skill_summary` (affects FAISS embedding)

### API Endpoints

| Endpoint                        | Method | Action                                          |
| ------------------------------- | ------ | ----------------------------------------------- |
| `/schema/add-column`            | POST   | Register new field + live OS mapping update     |
| `/schema/list`                  | GET    | List base + extension columns                   |
| `/schema/backfill`              | POST   | Set defaults for all existing candidates        |
| `/schema/candidate/{id}/update` | PATCH  | Partial update one candidate's extension fields |

---

## 13. Resume Upload & Parsing Pipeline

**File: `src/resume_parser.py` + `main.py`**

### Full Pipeline

```
┌──────────┐      ┌───────────┐      ┌─────────────┐      ┌──────────┐
│  Upload  │─────▶│  PyMuPDF  │─────▶│   Ollama    │─────▶│  Clean   │
│  PDF     │      │  Extract  │      │  llama3     │      │  & Norm  │
└──────────┘      └───────────┘      └─────────────┘      └────┬─────┘
                                                                │
                     ┌──────────────────────────────────────────┘
                     ▼
    ┌────────────────────────────────────────────────────────────┐
    │  SSE Streaming Events:                                     │
    │                                                            │
    │  1. upload     → "Received file: resume.pdf (X bytes)"     │
    │  2. extract    → "Extracted N characters from PDF"         │
    │  3. ollama     → "Ollama extracted: John | Skills: ..."    │
    │  4. parsed     → {full candidate object}                   │
    │  5. embed      → "SBERT embedding generated (384d)"        │
    │  6. opensearch → "Document indexed with ID R-XXXXXXXX"     │
    │  7. faiss      → "Vector added (index size: N)"            │
    │  8. neo4j      → "Created Candidate + N HAS_SKILL edges"  │
    │  9. csv        → "Row appended for John Doe"               │
    │  10. done      → {success: true, candidate_id}             │
    └────────────────────────────────────────────────────────────┘
```

### LLM Extraction Prompt

```
Extract structured JSON with these keys:
- name, core_skills (with proficiency levels), secondary_skills, soft_skills
- years_of_experience (float), potential_roles, skill_summary
- location, projects

Proficiency levels: Beginner, Advanced Beginner, Competent, Proficient, Expert
```

### Data Cleaning (`clean_candidate_data`)

- Generates UUID-based ID: `"R-{uuid[:8].upper()}"`
- Safe type coercion for all fields
- Default location: `"Unknown"`

---

## 14. RAGAS Evaluation Suite

**File: `src/evaluation.py`**

### Architecture

```
eval_dataset.json (ground truth queries + expected candidate IDs)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  RAGASEvaluator                                       │
│  ─────────────                                        │
│  • LLM: ChatOpenAI (Ollama-backed)                    │
│  • Embeddings: HuggingFaceEmbeddings (SBERT)          │
│  • run_single_eval(query, ground_truth_ids)           │
│  • run_full_suite(generate_md=True)                   │
└───────────────────────────────────────────────────────┘
```

### Metrics Computed

| Metric                | Type    | Description                                        |
| --------------------- | ------- | -------------------------------------------------- | -------------- | --- | --- | --- |
| **Retrieval Recall**  | Ranking | `                                                  | GT ∩ Retrieved | /   | GT  | `   |
| **NDCG@10**           | Ranking | Normalized Discounted Cumulative Gain at K=10      |
| **MRR**               | Ranking | Mean Reciprocal Rank — rank of first relevant hit  |
| **Faithfulness**      | RAGAS   | Does the answer stay grounded in provided context? |
| **Answer Relevancy**  | RAGAS   | Is the generated answer relevant to the question?  |
| **Context Precision** | RAGAS   | Are retrieved contexts focused (not noisy)?        |
| **Context Recall**    | RAGAS   | Do retrieved contexts cover all ground truth info? |

### Evaluation Pipeline

```
Query → classify_intent → expand_query → multi_query_retrieve_and_fuse (top 20)
  │                                                                ↓
  │                                              Slice to top 8 for RAGAS
  │                                                                ↓
  │                              ┌─────────────────────────────────────────┐
  ├─ Ranking Metrics:            │  Compare retrieved IDs vs GT IDs       │
  │  NDCG@10, MRR, Recall       │  position-aware ranking comparisons    │
  │                              └─────────────────────────────────────────┘
  │                              ┌─────────────────────────────────────────┐
  ├─ RAGAS Metrics:              │  Build Dataset(question, answer,       │
  │  Faithfulness, Relevancy,    │  contexts, ground_truth) → evaluate()  │
  │  Context Precision/Recall    │  Uses local Ollama + SBERT             │
  │                              └─────────────────────────────────────────┘
  │
  └─ Generate eval_report.md (if --report flag)
```

---

## 15. API Endpoints Reference

### Search & Discovery

| Method | Path        | Description                             |
| ------ | ----------- | --------------------------------------- |
| `POST` | `/search`   | SSE-streaming search with full pipeline |
| `POST` | `/evaluate` | Run search + RAGAS evaluation metrics   |

### Candidate CRUD

| Method   | Path                                 | Description                          |
| -------- | ------------------------------------ | ------------------------------------ |
| `POST`   | `/add-candidate`                     | Add to OpenSearch + FAISS + Neo4j    |
| `PUT`    | `/update-candidate/{id}`             | Update across all 3 backends + CSV   |
| `GET`    | `/candidate/{id}`                    | Lookup from OpenSearch               |
| `DELETE` | `/delete-candidate/{id}`             | Delete from all backends + email_map |
| `GET`    | `/candidate/{id}/graph`              | Fetch Neo4j subgraph for a candidate |
| `GET`    | `/candidate-by-email/{email}`        | Lookup via email_map.json            |
| `GET`    | `/list-candidates?offset=0&limit=20` | Paginated listing                    |
| `GET`    | `/random-candidates?count=6`         | Random candidates (function_score)   |

### Resume Upload

| Method | Path             | Description                                  |
| ------ | ---------------- | -------------------------------------------- |
| `POST` | `/upload-resume` | PDF upload → SSE-streamed ingestion pipeline |

### Schema Management

| Method  | Path                            | Description                               |
| ------- | ------------------------------- | ----------------------------------------- |
| `POST`  | `/schema/add-column`            | Register new dynamic column               |
| `GET`   | `/schema/list`                  | List all base + extension columns         |
| `POST`  | `/schema/backfill`              | Backfill defaults to all candidates       |
| `PATCH` | `/schema/candidate/{id}/update` | Partial update one candidate's extensions |

---

## 16. Data Models & Document Schema

### Raw CSV Row

```csv
id, name, core_skills, secondary_skills, soft_skills, years_of_experience, potential_roles, skill_summary
```

### Processed Document (after `build_document`)

```python
{
    "id": "12345",
    "name": "Jane Smith",
    "core_skills": "Python SQL AWS",                          # Flat BM25 text
    "core_skills_parsed": [                                   # Structured with proficiency
        {"skill": "Python", "level": 5},                     # Expert = 5
        {"skill": "SQL", "level": 3},                        # Competent = 3
        {"skill": "AWS", "level": 4}                         # Proficient = 4
    ],
    "secondary_skills": "Docker Kubernetes",
    "secondary_skills_parsed": [...],
    "soft_skills": "Leadership Communication",
    "soft_skills_parsed": [...],
    "years_of_experience": 7.0,
    "potential_roles": "Data Engineer ML Engineer",
    "potential_roles_list": ["Data Engineer", "ML Engineer"],
    "skill_summary": "Experienced data engineer with...",
    "skill_summary_vec": [0.032, -0.118, ...],               # 384-dim SBERT
    "potential_roles_vec": [0.045, 0.071, ...],              # 384-dim SBERT
    # Extension fields (if schema_extensions.json has entries):
    "location": "Bangalore",
    "projects": "Built ETL pipeline for..."
}
```

### OpenSearch Mapping Highlights

```json
{
  "skill_summary": { "type": "text", "analyzer": "skill_analyzer" },
  "skill_summary_vec": {
    "type": "knn_vector",
    "dimension": 384,
    "method": "hnsw"
  },
  "core_skills": { "type": "text", "analyzer": "skill_analyzer", "boost": 2.0 },
  "core_skills_parsed": {
    "type": "nested",
    "properties": { "skill": "keyword", "level": "integer" }
  },
  "potential_roles": {
    "type": "text",
    "analyzer": "skill_analyzer",
    "boost": 1.5
  },
  "potential_roles_vec": {
    "type": "knn_vector",
    "dimension": 384,
    "method": "hnsw"
  },
  "years_of_experience": { "type": "float" }
}
```

### Proficiency Level Mapping

| CSV Value         | Integer Level |
| ----------------- | :-----------: |
| Beginner          |       1       |
| Advanced Beginner |       2       |
| Competent         |       3       |
| Proficient        |       4       |
| Expert            |       5       |

---

## 17. Scoring Mathematics

### Reciprocal Rank Fusion (RRF)

```
RRF(d) = Σ  w_i / (k + rank_i(d))
         i∈channels

k = 60 (standard constant)
w_i = 1.0 (default equal weights)
```

### Cross-Encoder Combination

```
combined(d) = 0.2 × (RRF(d) / max_RRF) + 0.8 × xenc(d)
```

### Proficiency Boost

```
coverage = |matched_parsed_skills ∩ queried_skills| / |queried_skills|

If structured match (level ≥ 2):
    boost = 20 × coverage + min(avg_proficiency × 0.6, 3.0)

If no structured match but raw text match:
    boost = +2.0

If beginner-only match (level = 1):
    boost = +1.0

If NO match anywhere:
    penalty = -25.0
```

### YOE Penalty

```
If cand_yoe < detected_min_yoe:
    penalty = (min_yoe - cand_yoe) × 3.0
```

### NDCG@K Calculation

```
DCG@K  = Σ(i=1..K) rel_i / log₂(i + 1)
IDCG@K = best possible DCG (all relevant docs at top)
NDCG@K = DCG@K / IDCG@K
```

---

## 18. SSE Streaming Architecture

Both `/search` and `/upload-resume` use **Server-Sent Events (SSE)** via `StreamingResponse`:

```python
@app.post("/search")
async def search(req: SearchRequest):
    return StreamingResponse(search_generator(req), media_type="text/event-stream")
```

Each event is:

```
data: {"event": "<type>", ...fields...}\n\n
```

### Search SSE Events

| Event       | Payload                        | Timing                            |
| ----------- | ------------------------------ | --------------------------------- |
| `intent`    | `{intent, queries}`            | Immediately after classification  |
| `retrieval` | `{count}`                      | After parallel retrieval complete |
| `candidate` | `{full profile + explanation}` | Per candidate, in rank order      |
| `done`      | `{latency}`                    | Final event                       |

### Resume Upload SSE Events

| Event    | Payload                   | Timing                                                                      |
| -------- | ------------------------- | --------------------------------------------------------------------------- |
| `step`   | `{step, message, status}` | Per pipeline stage (upload/extract/ollama/embed/opensearch/faiss/neo4j/csv) |
| `parsed` | `{candidate}`             | After Ollama extraction                                                     |
| `done`   | `{success, candidate_id}` | Final event                                                                 |

---

## 19. Configuration & Environment

**File: `src/config.py`**

All values are env-var backed with sensible defaults:

```python
# OpenSearch
OPENSEARCH_HOST  = "localhost"     # env: OPENSEARCH_HOST
OPENSEARCH_PORT  = 9200            # env: OPENSEARCH_PORT
OPENSEARCH_INDEX = "candidates"

# FAISS
FAISS_INDEX_PATH = "candidates_index.faiss"  # env: FAISS_INDEX_PATH
FAISS_DIMENSION  = 384

# Neo4j
NEO4J_URI  = "bolt://localhost:7687"  # env: NEO4J_URI
NEO4J_USER = "neo4j"                  # env: NEO4J_USER
NEO4J_PASS = "password123"            # env: NEO4J_PASS

# ML Models
SBERT_MODEL_NAME         = "sentence-transformers/all-MiniLM-L6-v2"    # 384-dim
CROSS_ENCODER_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# LLM (Ollama)
OPENAI_API_KEY   = "ollama"                           # env: OPENAI_API_KEY
OPENAI_BASE_URL  = "http://localhost:11434/v1"         # env: OPENAI_BASE_URL
LLM_MODEL_NAME   = "llama3:latest"                     # env: LLM_MODEL_NAME
```

### Trace Files

Every search generates a trace JSON at `traces/trace_YYYYMMDD_HHMMSS.json`:

```json
{
    "query": "...",
    "timestamp": "...",
    "intent": "Skill",
    "expanded": { "expanded_queries": [...], "skill_synonyms": [...] },
    "raw_results_count": 150,
    "detected_min_yoe": 0,
    "final_results": [...],
    "latency_ms": 2345.67
}
```

---

## Appendix: System Flow Summary Diagram

```
           ┌──────────────────────────────────────────────────────┐
           │                     USER QUERY                       │
           └──────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    Intent Classification    │  ← Rule-based
                    └─────────────┬──────────────┘
                                  │
           ┌──────────────────────▼───────────────────────────────┐
           │            LLM Query Expansion (Ollama)              │
           │   • 3 rephrased queries    • Entity extraction       │
           │   • HyDE synthetic doc     • YOE detection           │
           │   • Skill token expansion  • Skill synonyms          │
           └──────────────────────┬───────────────────────────────┘
                                  │
              ┌───────────────────▼────────────────────┐
              │     For Each Query (4) + HyDE (1):     │
              │                                        │
              │   ┌─────┐  ┌───────┐  ┌────────┐     │
              │   │BM25 │  │ FAISS │  │ Neo4j  │     │  ← asyncio.gather
              │   │     │  │ HNSW  │  │ Graph  │     │
              │   └──┬──┘  └───┬───┘  └───┬────┘     │
              │      └─────────┼──────────┘           │
              │                ▼                       │
              │       RRF Fusion (per query)           │
              └───────────────┬────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  RRF Fusion (all)  │  ← 2-level cascade
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Cross-Encoder     │  ← top 50, ms-marco model
                    │  Reranking         │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  OpenSearch        │  ← mget() hydration
                    │  Hydration         │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Proficiency Boost │  ← skill coverage + level scoring
                    │  + YOE Penalty     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Final Sort &      │  ← top_k slice
                    │  top_k Selection   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  LLM Explanation   │  ← top 5 in parallel
                    │  Generation        │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  SSE Stream to     │  ← intent → retrieval → candidates → done
                    │  Client            │
                    └───────────────────┘
```

---

_Generated on: 2026-04-19 | Covers all 12 source modules across `src/`, `main.py`, and `ingest_pipeline.py`_
