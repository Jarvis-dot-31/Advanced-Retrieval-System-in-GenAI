import pandas as pd
import json
import faiss
from src import config
from src.preprocessing import build_document
from src.kg_builder import KnowledgeGraphBuilder
import os

def run_pipeline(csv_path: str):
    df = pd.read_csv(csv_path).fillna("")
    faiss_path = "/home/pranab/dl_hackathon/Vecdb_embeddings/docs.index"
    if not os.path.exists(faiss_path):
        print(f"Error: {faiss_path} not found. Please run vec_db.py first.")
        return
        
    faiss_index = faiss.read_index(faiss_path)
    try:
        kg = KnowledgeGraphBuilder(config.NEO4J_URI, config.NEO4J_USER, config.NEO4J_PASS)
        kg.create_schema()
    except Exception as e:
        print(f"Warning: Failed to connect to Neo4j. Skipping. {e}")
        kg = None

    if kg:
        for i, row in df.iterrows():
            if i % 500 == 0:
                print(f"Ingested {i} documents...")
            doc = build_document(row.to_dict())
            emb = faiss_index.reconstruct(i).tolist()
            kg.ingest_candidate(doc, emb)
                 
        kg.build_skill_similarity_edges()
        kg.build_candidate_similarity_edges()

if __name__ == "__main__":
    run_pipeline("/home/pranab/dl_hackathon/Dataset/profiles.csv")