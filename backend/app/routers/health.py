"""Health endpoints — port of src/app/api/health/* routes.

GAMP 5 §4.3.1: always HTTP 200; the body conveys operational detail so OQ
agents evaluate structure rather than failing on status code.
"""
import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings

router = APIRouter(prefix="/api/health", tags=["health"])

_started_at = time.time()


def _timestamp() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())


def _check_db() -> dict:
    settings = get_settings()
    if not settings.database_url:
        return {"name": "database", "status": "degraded", "message": "DATABASE_URL not set"}
    try:
        from app.db import get_engine

        start = time.time()
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start) * 1000)
        return {"name": "database", "status": "healthy", "latencyMs": latency_ms}
    except Exception as exc:
        return {"name": "database", "status": "unhealthy", "message": str(exc)}


@router.get("")
@router.get("/")
async def health():
    settings = get_settings()
    db_check = _check_db()
    status = "healthy" if db_check["status"] == "healthy" else "degraded"
    return JSONResponse(
        {
            "status": status,
            "version": settings.app_version,
            "uptime": round(time.time() - _started_at),
            "timestamp": _timestamp(),
            "oqMode": settings.oq_mode_enabled,
            "checks": [db_check],
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Health-Status": status,
        },
    )


@router.get("/live")
async def live():
    return {"status": "ok", "timestamp": _timestamp()}


@router.get("/ready")
async def ready():
    db_check = _check_db()
    return {
        "status": "ready" if db_check["status"] != "unhealthy" else "degraded",
        "timestamp": _timestamp(),
        "checks": [db_check],
    }


@router.get("/db")
async def health_db():
    """Port of GET /api/health/db — persistence verification (Task 2.5)."""
    settings = get_settings()
    if not settings.database_url:
        return JSONResponse(
            {"status": "FAIL", "error": "DATABASE_URL not set", "timestamp": _timestamp()},
            status_code=503,
        )
    try:
        from app.db import get_engine

        start = time.time()
        tables = ["haqs", "tmf_artifacts", "submission_lifecycles", "authoring_documents"]
        counts = {}
        errors = {}
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
            latency_ms = round((time.time() - start) * 1000)
            for table in tables:
                try:
                    counts[table] = conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
                except Exception as exc:
                    errors[table] = str(exc)
        if errors:
            return JSONResponse(
                {
                    "status": "PARTIAL",
                    "latencyMs": latency_ms,
                    "tableCounts": counts,
                    "tableErrors": errors,
                    "gate": "2.5 FAIL",
                    "timestamp": _timestamp(),
                },
                status_code=207,
            )
        return {
            "status": "PASS",
            "latencyMs": latency_ms,
            "tableCounts": counts,
            "gate": "2.5 PASS",
            "timestamp": _timestamp(),
        }
    except Exception as exc:
        return JSONResponse(
            {"status": "FAIL", "error": str(exc), "timestamp": _timestamp()},
            status_code=503,
        )
