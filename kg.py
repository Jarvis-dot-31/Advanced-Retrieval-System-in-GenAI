from neo4j import GraphDatabase
import pandas as pd

URL="bolt://localhost:7474"
AUTH=("neo4j","password123")

driver=GraphDatabase.driver(URL,auth=AUTH)
df=pd.read_csv("Dataset/profiles.csv")

with driver.session() as session:
    pass