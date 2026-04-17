from __future__ import annotations
from collections import defaultdict
from sentence_transformers import CrossEncoder
from typing import Dict, List, Optional
import numpy as np
from src.config import CROSS_ENCODER_MODEL_NAME

try:
    cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL_NAME)
except Exception:
    cross_encoder = None
    print("Warning: Failed to load cross_encoder. Reranking will use RRF only.")

def reciprocal_rank_fusion(ranked_lists: dict, k: int = 60, channel_weights: Optional[Dict] = None) -> list:
    """Combines multiple ranked lists using the RRF algorithm."""
    weights = channel_weights or {ch: 1.0 for ch in ranked_lists}
    rrf_scores = defaultdict(float)
    candidate_data = {}

    for channel, hits in ranked_lists.items():
        w = weights.get(channel, 1.0)
        # hits could be a map or a list depending on context
        if isinstance(hits, dict):
            hits_list = [{"id": cid} for cid in hits]
        else:
            hits_list = hits
            
        for rank, hit in enumerate(hits_list, start=1):
            if "id" not in hit: continue
            cid = hit["id"]
            rrf_scores[cid] += w * (1.0 / (k + rank))
            
            if cid not in candidate_data:
                candidate_data[cid] = dict(hit)
            if "_channels" not in candidate_data[cid]:
                candidate_data[cid]["_channels"] = []
            if channel not in candidate_data[cid]["_channels"]:
                candidate_data[cid]["_channels"].append(channel)

    # Sort by descending RRF score
    sorted_ids = sorted(rrf_scores, key=rrf_scores.__getitem__, reverse=True)
    results = []
    for cid in sorted_ids:
        entry = candidate_data[cid].copy()
        entry["_rrf_score"] = round(rrf_scores[cid], 6)
        results.append(entry)
    return results

def cross_encoder_rerank(query: str, candidates: list, top_n: int = 50) -> list:
    """Apply cross-encoder to top_n candidates, return re-ranked list."""
    if not cross_encoder:
        return candidates
        
    pool = candidates[:top_n]
    if not pool:
        return candidates
        
    pairs = [(query, str(c.get("skill_summary", ""))) for c in pool]
    scores = cross_encoder.predict(pairs, batch_size=32, show_progress_bar=False)
    
    for cand, score in zip(pool, scores):
        cand["_xenc_score"] = float(score)
        
    # Combine: RRF score (normalised) + cross-encoder score
    # Increased weight for Cross-Encoder (0.8) to boost semantic relevancy
    max_rrf = max(c.get("_rrf_score", 0) for c in pool) or 1.0
    for c in pool:
        c["_combined"] = (0.2 * c.get("_rrf_score", 0) / max_rrf + 0.8 * c.get("_xenc_score", 0))
        
    pool.sort(key=lambda c: c.get("_combined", 0), reverse=True)
    return pool + candidates[top_n:]

def mmr_rerank(candidates: list, query_vec: list, lam: float = 0.7, final_k: int = 20) -> list:
    """Maximal Marginal Relevance reordering."""
    if not candidates:
        return []
        
    # Filter candidates that actually have a skill summary vector
    valid_cands = [c for c in candidates if c.get("skill_summary_vec") is not None]
    if not valid_cands:
        return candidates[:final_k] # fallback

    q = np.array(query_vec, dtype=np.float32)
    vecs = np.array([c["skill_summary_vec"] for c in valid_cands], dtype=np.float32)

    # Ensure query matches size
    if len(q) != vecs.shape[1]:
        return candidates[:final_k]

    # Cosine similarity to query
    rel_scores = vecs @ q

    selected_idx = []
    remaining = list(range(len(valid_cands)))

    while remaining and len(selected_idx) < final_k:
        if not selected_idx:
            # First pick: highest relevance
            best = max(remaining, key=lambda i: rel_scores[i])
        else:
            sel_vecs = vecs[selected_idx]
            best, best_score = None, -1e9
            for i in remaining:
                max_sim = float(np.max(vecs[i] @ sel_vecs.T))
                mmr_val = lam * rel_scores[i] - (1 - lam) * max_sim
                if mmr_val > best_score:
                    best_score, best = mmr_val, i
        selected_idx.append(best)
        remaining.remove(best)

    return [valid_cands[i] for i in selected_idx]

def proficiency_boost(candidate: dict, query_level: int, skill_names_matched: List[str]) -> float:
    """Adjust combined score based on alignment between queried proficiency and actual proficiency.
    
    Searches across ALL profile fields: core_skills, secondary_skills, soft_skills, 
    skill_summary, and potential_roles to determine if a candidate is relevant.
    """
    if not skill_names_matched:
        return candidate.get("_combined", 1.0)
    
    # --- Phase 1: Check structured parsed skill fields ---
    matched_parsed = []
    for field in ["core_skills_parsed", "secondary_skills_parsed", "soft_skills_parsed"]:
        for s in candidate.get(field, []):
            if not isinstance(s, dict):
                continue
            cand_skill = s.get("skill", "").lower()
            if any(sn.lower() in cand_skill or cand_skill in sn.lower() for sn in skill_names_matched):
                matched_parsed.append(s)
    
    # --- Phase 2: Fallback to raw text fields ---
    has_raw_match = False
    if not matched_parsed:
        # Build a combined text blob from ALL text fields
        text_blob = " ".join([
            str(candidate.get("core_skills", "")),
            str(candidate.get("secondary_skills", "")),
            str(candidate.get("soft_skills", "")),
            str(candidate.get("skill_summary", "")),
            str(candidate.get("potential_roles", "")),
        ]).lower()
        
        if any(sn.lower() in text_blob for sn in skill_names_matched):
            has_raw_match = True
    
    # --- Phase 3: Scoring ---
    base_score = candidate.get("_combined", 1.0)
    
    # HARD PENALTY: No match in ANY field — truly irrelevant candidate
    if not matched_parsed and not has_raw_match:
        return base_score - 20.0
    
    # RAW MATCH: Found in text but not in structured data — mild boost
    if has_raw_match and not matched_parsed:
        return base_score + 2.0
    
    # STRUCTURED MATCH: Best case — apply proficiency alignment boost
    avg_level = sum(s.get("level", 1) for s in matched_parsed) / len(matched_parsed)
    alignment = 1.0 - abs(avg_level - query_level) / 4.0  # [0, 1]
    boost = 5.0 + 2.0 * alignment  # +5 to +7 points for matching candidates
    return base_score + boost
