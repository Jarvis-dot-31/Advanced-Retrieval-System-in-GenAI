import pandas as pd
from sentence_transformers import SentenceTransformer,CrossEncoder
import numpy as np
import faiss
import pickle

df=pd.read_csv('Dataset/profiles.csv')
for idx, val in df['name'].items():
    if isinstance(val, str) and val.strip() == '':
        df.loc[idx, 'name'] = 'NAN'

docs=[]

for id,row in df.iterrows():
    tp=f"""
    id: {row['id']}
    name: {row['name']}
    core_skills: {row['core_skills']}
    secondary_skills: {row['secondary_skills']}
    soft_skills: {row['soft_skills']}
    years_of_experience: {row['years_of_experience']}
    potential_roles: {row['potential_roles']}
    skill_summary: {row['skill_summary']}
    """
    docs.append(tp)

model=SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
emb=model.encode(docs)

emb=np.array(emb).astype('float32')
index=faiss.IndexFlatL2(emb.shape[1])
index.add(emb)

with open("docs.pickle","wb") as f:
  pickle.dump(docs,f)
faiss.write_index(index,"docs.index")

query="Who are having python as their core skill and having experience of more than 1 year atleast and is a fullstack?"

enc=model.encode([query])
enc=np.array(enc).astype('float32')
dist,ind=index.search(enc,k=50)

for i in range(len(ind[0])):
  print(f'Confidence: {dist[0][i]:.4f}')
  print(f'Doc: {docs[ind[0][i]]}')

# Cross-Encoder
# cand=[docs[i] for i in ind[0]]
# cross_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
# pairs=[[query,doc] for doc in cand]
# scores=cross_model.predict(pairs)

# idx=np.argsort(scores)[::-1]
# top_docs=[cand[i] for i in idx[:5]]

# for i in top_docs:
#   print(i)
