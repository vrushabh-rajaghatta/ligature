"""Ligature FastAPI backend.

Preserves the /api/... URL contract of the original Next.js app so the
migrated SPA frontend works unchanged.
"""
import logging

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.middleware import RBACMiddleware
from app.routers import register_routers

settings = get_settings()

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))

if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

if settings.oq_mode_enabled:
    logging.getLogger("ligature").warning(
        "OQ_MODE_ENABLED=true — OQ validation bypass is ACTIVE. "
        "This MUST NOT be set in production."
    )

app = FastAPI(title="Ligature API", version=settings.app_version, docs_url="/api/openapi-docs")

# CORS for the Vite dev server (cookies require explicit origins, not "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RBACMiddleware)

register_routers(app)
