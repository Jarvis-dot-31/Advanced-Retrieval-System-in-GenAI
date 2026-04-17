from preprocess import load_data, extract_skills_for_cooccurrence
from cooccurrence import build_cooccurrence, get_relations
from neo4j_loader import Neo4jLoader
from config import COOCCURRENCE_THRESHOLD
from skill_similarity import compute_skill_similarity_pairs


def main():
    df = load_data("../Dataset/profiles.csv")
    print(f"Loaded {len(df)} rows")

    # 🔹 Extract skills
    all_skills = [
        extract_skills_for_cooccurrence(row)
        for _, row in df.iterrows()
    ]

    # 🔹 Co-occurrence
    pair_count, skill_freq = build_cooccurrence(all_skills)
    relations = get_relations(pair_count, skill_freq, COOCCURRENCE_THRESHOLD)

    print(f"Co-occurrence relations found: {len(relations)}")
    print("Sample relations:", relations[:5])

    # 🔹 Unique skills
    all_unique_skills = list({
        skill
        for skills in all_skills
        for skill in skills
    })

    # 🔹 Semantic similarity (SBERT)
    sim_pairs = compute_skill_similarity_pairs(all_unique_skills, threshold=0.75)
    print(f"Semantic similarity pairs found: {len(sim_pairs)}")

    # 🔥 CREATE LOADER FIRST
    loader = Neo4jLoader()

    # 🔥 SINGLE CALL
    loader.load_all(df, relations, sim_pairs)

    loader.close()

    print("✅ Knowledge graph built successfully")


if __name__ == "__main__":
    main()