# skill_similarity.py
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")  # fast, good quality

def compute_skill_similarity_pairs(all_skills: list[str], threshold: float = 0.75) -> list[dict]:
    """
    Takes a list of unique skill names, returns pairs with cosine similarity above threshold.
    """
    if len(all_skills) < 2:
        return []

    embeddings = model.encode(all_skills, batch_size=64, show_progress_bar=True)
    sim_matrix = cosine_similarity(embeddings)  # shape: (N, N)

    pairs = []
    for i in range(len(all_skills)):
        for j in range(i + 1, len(all_skills)):
            score = float(sim_matrix[i][j])
            if score >= threshold:
                pairs.append({
                    "s1": all_skills[i],
                    "s2": all_skills[j],
                    "score": round(score, 4)
                })

    return pairs