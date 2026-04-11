# AgroSphere AI 🌱

Intelligent Agriculture Operating System

## Team
- Member 1 → Backend + APIs + Data
- Member 2 → Dashboard + Market + Charts
- Member 3 → Disease + Drone + Maps
- Member 4 → Storage + Schemes + Chatbot

## Setup

### Backend
cd backend
npm install
cp .env.example .env   ← fill in your API keys
npm run dev            ← runs on localhost:5000

### Frontend
cd frontend
npm install
npm run dev            ← runs on localhost:5173

## API Keys needed
- OPENWEATHER_API_KEY → openweathermap.org (free)
- PLANT_ID_API_KEY    → plant.id (free tier)
- MAPBOX_TOKEN        → mapbox.com (free)
- OPENAI_API_KEY      → optional, for chatbot

## Branch Strategy
- main        → stable, demo-ready code only
- dev         → merge all features here first
- feat/your-name → each member works on their own branch