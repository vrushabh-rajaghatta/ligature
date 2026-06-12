# Next.js → React SPA + FastAPI Migration Status

Source: `../ligature-v0_126_17` (Next.js 15 monolith, v0.126.17)

## Done

- **Frontend** (`frontend/`): Vite 6 + React 18 + React Router 7 SPA.
  Entire `src/` tree migrated; `next/dynamic|image|navigation|link` served by
  compat shims in `src/next-compat/` (Vite aliases); `'use client'` stripped;
  `NEXT_PUBLIC_*` → `VITE_*`; node `crypto` polyfilled; styled-jsx via babel
  plugin; CommonJS `require()` calls converted; PWA assets carried over.
  Production build passes. Login → main app verified in browser.
- **Backend core** (`backend/`): FastAPI + SQLAlchemy (Python 3.12,
  `backend/.venv`). Faithful ports of `rbac.ts`, `middleware.ts`, `jwt.ts`,
  `api-auth.ts`, `auth-db.ts` (bcrypt + lockout + fallback users), hash-chained
  audit store. Same `ligature-session` HS256 cookie contract.
- **Database**: Prisma schema pushed + seeded into local `pharma_dev`.
  Prisma (in the old repo) remains schema owner for now.
- **Ported API domains** (URL contract preserved): auth (login/logout/session),
  health (+/db,/live,/ready), version, products, haqs, documents, submissions,
  safety, studies, users, audit.

## Remaining route groups (port into `backend/app/routers/`, register in `__init__.py`)

ai (haq-rag, section-generate, batch-section, generate, safety-intelligence),
agents, tmf, qms, ctms, eln, glp, authoring, document-control, cross-module,
collaboration, publishing, spl, stability, gateways, signatures, citations,
usdm, idmp, adam, define-xml, cdisc-terminology, smart-submissions, biostats,
cmc, bd, research, originate, portfolio, applications, favorites, metrics,
demo, docs, admin, upload, webhooks, cron, errors, pmda, haq (analytics etc.),
plus deeper sub-routes of already-ported domains (submissions/lifecycle,
submissions/compile, safety/signals, audit/export, haqs drafts, ...).

Porting pattern (see `products.py` / `haqs.py`):
1. Read the Next route; identify the live path (Prisma vs dead Supabase branch).
2. Translate Prisma queries to SQLAlchemy `text()` against camelCase columns.
3. Preserve response JSON shape exactly (status/priority display mappings).
4. Mock-only routes: dump data via `npx tsx scripts/dump-mock.mts <module> <out.json>`
   into `backend/app/data/` and serve with `app.core.mockdata.load_mock`.

## Run

See README.md. Backend: uvicorn on :8000. Frontend: Vite on :5173 with /api proxy.
Demo logins: sarah.chen@ligaturerd.io / admin@ligaturerd.io — Ligature2026!
