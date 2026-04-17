import json
import re
import openai
from src import config
from sentence_transformers import SentenceTransformer

# Setup OpenAI client for expansion (configured for Ollama)
client = openai.AsyncOpenAI(
    api_key=config.OPENAI_API_KEY,
    base_url=config.OPENAI_BASE_URL
)
model = SentenceTransformer(config.SBERT_MODEL_NAME)

def clean_json_response(text: str) -> str:
    """Extracts JSON from markdown or rambling LLM output using regex."""
    text = text.strip()
    # Priority 1: Find a full JSON object {...} (greedy)
    match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    # Priority 2: Find a JSON array [...]
    match = re.search(r'\[.*?\]', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def extract_skill_tokens(query: str) -> list:
    stopwords = {
        "looking", "for", "expert", "seeking", "need", "hire", "with", "want", "experience", "years", 
        "proficient", "skill", "skilled", "person", "good", "candidate", "individual", "know", 
        "knowledge", "strong", "best", "top", "highly", "qualified", "who", "have", "background",
        "professional", "developer", "engineer", "specialist",
        "guy", "can", "make", "which", "the", "and", "that", "this", "from", "are", "was",
        "not", "but", "all", "were", "been", "has", "had", "will", "would", "could", "should",
        "find", "search", "get", "any", "some", "one", "like", "just", "about", "also",
        "very", "really", "able", "minimum", "maximum", "plus", "atleast", "least"
    }
    tokens = [word.lower() for word in re.findall(r'\w+', query)]
    return [t for t in tokens if len(t) > 2 and t not in stopwords]

def classify_intent(query: str) -> str:
    # Basic intent fallback
    if "years" in query or "fresher" in query or "junior" in query:
        return "Experience"
    elif "role" in query or "hire a" in query:
        return "Role"
    return "Skill"

async def expand_query(query: str, intent: str) -> dict:
    """
    Returns:
    expanded_queries : list of rephrased query strings
    hyde_embedding : SBERT embedding of synthetic document
    skill_synonyms : list[str] extra BM25 tokens
    """
    # 1. Multi-query rephrasing
    rephrase_prompt = f"""
You are a Technical Talent Scout. Analyze this query: "{query}"

CRITICAL CONSTRAINTS:
1. REPHRASE the query into 3 DIFFERENT professional talent search prompts. Write FULL SENTENCES, NOT variable names.
2. EXTRACT only CORE technical skills, programming languages, or specific tools as entities.
   - For web development queries, include: HTML, CSS, JavaScript, React, Angular, etc.
   - For database queries, include: SQL, MySQL, PostgreSQL, MongoDB, etc.
3. DO NOT include generic words like "person", "developer", "expert", "guy", "websites" in entities.
4. If years of experience are mentioned, extract as a number. Otherwise 0.

Return ONLY valid JSON, nothing else:
{{"queries": ["full sentence 1", "full sentence 2", "full sentence 3"], "entities": ["HTML", "CSS", "JavaScript"], "min_yoe": 0}}
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
        
    # 2. HyDE - generate synthetic ideal candidate profile
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
