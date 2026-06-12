# Ligature

Multi-tenant SaaS platform for pharmaceutical regulatory affairs and clinical operations.

Migrated from a Next.js monolith (v0.126.17) to:

- **frontend/** — Vite + React 18 + TypeScript SPA (React Router, Tailwind, Zustand)
- **backend/** — FastAPI + SQLAlchemy (PostgreSQL), preserving the original `/api/...` URL contract

## Development

```bash
# Backend (Python 3.14)
cd backend
python3.14 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:5173, proxies /api -> :8000
```
