import pandas as pd
from sentence_transformers import SentenceTransformer,CrossEncoder
import numpy as np
import faiss
import pickle
from os import makedirs

df=pd.read_csv('Dataset/profiles.csv')
for idx, val in df['name'].items():
    if isinstance(val, str) and val.strip() == '':
        df.loc[idx, 'name'] = 'NAN'

docs=[]

for id,row in df.iterrows():
    tp=f"""
    skill_summary: {row['skill_summary']}
    """
    docs.append(tp)

model=SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
emb=model.encode(docs)

emb=np.array(emb).astype('float32')
index=faiss.IndexFlatL2(emb.shape[1])
index.add(emb)

makedirs("Vecdb_embeddings", exist_ok=True)
with open("Vecdb_embeddings/docs.pickle","wb") as f:
  pickle.dump(docs,f)
faiss.write_index(index,"Vecdb_embeddings/docs.index")
