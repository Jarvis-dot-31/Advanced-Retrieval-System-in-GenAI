import json
import re
import openai
from src import config
from sentence_transformers import SentenceTransformer
import asyncio

client = openai.AsyncOpenAI(
    api_key=config.OPENAI_API_KEY,
    base_url=config.OPENAI_BASE_URL
)
model = SentenceTransformer(config.SBERT_MODEL_NAME)

def clean_json_response(text: str) -> str:
    print(f"DEBUG: Raw Ollama response: {text}") # Log raw output for the user
    text = text.strip()
    print(text)
    match = re.search(r'\[.*\]', text, re.DOTALL)
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

if __name__ == "__main__":
    async def run_test():
        test_query = "looking for a Python backend developer with 5 years experience"
        print(f"Testing expand_query with: '{test_query}'\\n")
        res = await expand_query(test_query, "Skill")
        
        print("Expanded Query Output:")
        res["hyde_embedding"] = f"<Vector of length {len(res['hyde_embedding'])}>"
        print(json.dumps(res, indent=2))
        
    asyncio.run(run_test())