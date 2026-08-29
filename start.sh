#!/bin/bash

# Exit on unexpected critical setup errors
set -e

# Store repository root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🚀 Starting Advanced Retrieval System..."

echo "📦 Starting Docker containers (OpenSearch & Neo4j)..."
docker-compose up -d

echo "⏳ Waiting for OpenSearch to be ready (port 9200)..."
while ! curl -s http://localhost:9200 >/dev/null 2>&1; do
    sleep 1
done
echo "✅ OpenSearch is ready."

echo "⏳ Waiting for Neo4j to be ready (port 7474)..."
while ! curl -s http://localhost:7474 >/dev/null 2>&1; do
    sleep 1
done
echo "✅ Neo4j is ready."

echo "🐍 Setting up Python Virtual Environment..."
if [ ! -d ".venv" ]; then
    echo "Creating .venv..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

# 1. Vector Database / FAISS Embeddings Check
if [ ! -f "Vecdb_embeddings/docs.index" ] || [ ! -f "Vecdb_embeddings/docs.pickle" ]; then
    echo "🧠 Initializing Vector Database embeddings (Vecdb_embeddings)..."
    python3 init_vec_db.py
    echo "✅ Vector embeddings initialized."
else
    echo "✅ Vector embeddings already initialized."
fi

# 2. OpenSearch Ingestion
echo "📥 Populating OpenSearch candidates index..."
python3 init_opensearch.py
echo "✅ OpenSearch indexed."

# 3. Neo4j Knowledge Graph Check & Ingestion
echo "🕸️ Checking Neo4j Knowledge Graph..."
NEO4J_NEEDS_INIT=$(python3 -c "
from neo4j import GraphDatabase
from src import config
try:
    driver = GraphDatabase.driver(config.NEO4J_URI, auth=(config.NEO4J_USER, config.NEO4J_PASS))
    with driver.session() as s:
        res = s.run('MATCH (c:Candidate) RETURN count(c) as count').single()
        if res and res['count'] > 0:
            print('NO')
        else:
            print('YES')
except Exception:
    print('YES')
" 2>/dev/null || echo "YES")

if [ "$NEO4J_NEEDS_INIT" = "YES" ]; then
    echo "🏗️ Initializing Neo4j Knowledge Graph schema and data..."
    python3 init_graph_db.py
    echo "✅ Knowledge Graph initialized."
else
    echo "✅ Knowledge Graph is already initialized."
fi

# 4. Frontend dependencies check
echo "Installing frontend dependencies in UI/SearchUI (npm install)..."
(cd UI/SearchUI && npm install)
echo "✅ Frontend dependencies installed."

# Disable exit on error for long running processes
set +e

echo "🐍 Starting FastAPI backend..."
python3 main.py &
BACKEND_PID=$!

echo "⚛️  Starting Next.js frontend..."
(cd UI/SearchUI && npm run dev) &
FRONTEND_PID=$!

# Function to gracefully stop the background processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        pkill -P "$FRONTEND_PID" 2>/dev/null || true
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "✅ Frontend and Backend stopped."
    echo "🛑 Stopping Docker containers..."
    (cd "$ROOT_DIR" && docker-compose stop)
    echo "✅ Docker containers stopped."
    exit 0
}

# Trap Ctrl+C (SIGINT) and kill the spawned background processes
trap cleanup SIGINT SIGTERM

echo "======================================================"
echo "✨ All components are running!"
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔌 Backend will be available at:  http://localhost:8001"
echo "======================================================"
echo "Hit Ctrl+C to stop all services."

# Wait for background processes to keep the script running
wait $BACKEND_PID $FRONTEND_PID

