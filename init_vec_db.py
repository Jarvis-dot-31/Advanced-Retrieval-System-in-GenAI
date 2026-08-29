import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
from os import makedirs

df=pd.read_csv('Dataset/profiles.csv')
for idx, val in df['name'].items():
    if isinstance(val, str) and val.strip() == '':
        df.loc[idx, 'name'] = 'NAN'

docs = [f"skill_summary: {row['skill_summary']}" for _, row in df.iterrows()]

model=SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
emb=model.encode(docs)

emb=np.array(emb).astype('float32')
index=faiss.IndexFlatL2(emb.shape[1])
index.add(emb)

makedirs("Vecdb_embeddings", exist_ok=True)
faiss.write_index(index, "Vecdb_embeddings/docs.index")
