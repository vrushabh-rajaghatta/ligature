"""Audit API — port of src/app/api/audit/route.ts (hash-chained in-memory log)."""
import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.audit_store import get_audit_count, get_audit_entries, verify_audit_chain

logger = logging.getLogger("ligature.audit")

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
@router.get("/")
async def list_audit():
    try:
        return JSONResponse({"entries": get_audit_entries(100), "total": get_audit_count()})
    except Exception as exc:
        logger.error("[Audit] GET error: %s", exc)
        return JSONResponse({"entries": [], "total": 0})


@router.get("/verify")
async def verify():
    return JSONResponse(verify_audit_chain())
