#!/bin/bash

echo "🚀 Starting Advanced Retrieval System..."

echo "📦 Starting Docker containers (OpenSearch & Neo4j)..."
docker-compose up -d

echo "🐍 Setting up Python Virtual Environment..."
if [ ! -d ".venv" ]; then
    echo "Creating .venv..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "🐍 Starting FastAPI backend..."
python3 main.py &
BACKEND_PID=$!

echo "⚛️  Starting Next.js frontend..."
cd UI/SearchUI
npm run dev &
FRONTEND_PID=$!

# Function to gracefully stop the background processes
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Services stopped. (Note: Docker containers remain running in the background. Use 'docker-compose stop' if you want to stop them as well)."
    docker-compose stop
    echo "Docker containers stopped."
    exit 0
}

# Trap Ctrl+C (SIGINT) and kill the spawned background processes
trap cleanup SIGINT SIGTERM

echo "======================================================"
echo "✨ All components are starting!"
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔌 Backend will be available at:  http://localhost:8001"
echo "======================================================"
echo "Hit Ctrl+C to stop the frontend and backend servers."

# Wait for both background processes to keep the script running
wait $BACKEND_PID
wait $FRONTEND_PID
