"""Users API — port of src/app/api/users/route.ts (DB first, seed fallback)."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

logger = logging.getLogger("ligature.users")

router = APIRouter(prefix="/api/users", tags=["users"])

SEED_USERS = [
    {"id": "u1", "name": "Sarah Chen", "email": "sarah.chen@ligaturerd.io", "role": "VP Regulatory Strategy", "department": "Regulatory", "status": "active", "lastLogin": "2 hours ago", "initials": "SC", "createdAt": "2025-01-01T00:00:00.000Z"},
    {"id": "u2", "name": "Marcus Johnson", "email": "m.johnson@ligaturerd.io", "role": "Clinical Operations Lead", "department": "Clinical", "status": "active", "lastLogin": "1 day ago", "initials": "MJ", "createdAt": "2025-01-15T00:00:00.000Z"},
    {"id": "u3", "name": "Dr. Elena Vasquez", "email": "e.vasquez@ligaturerd.io", "role": "Chief Medical Officer", "department": "Medical Affairs", "status": "active", "lastLogin": "3 hours ago", "initials": "EV", "createdAt": "2025-02-01T00:00:00.000Z"},
    {"id": "u4", "name": "James Liu", "email": "j.liu@ligaturerd.io", "role": "Safety Officer", "department": "Pharmacovigilance", "status": "active", "lastLogin": "Just now", "initials": "JL", "createdAt": "2025-02-10T00:00:00.000Z"},
    {"id": "u5", "name": "Lisa Park", "email": "l.park@ligaturerd.io", "role": "Quality Reviewer", "department": "Quality", "status": "invited", "lastLogin": "Never", "initials": "LP", "createdAt": "2026-01-20T00:00:00.000Z"},
]


def _format_last_login(dt) -> str:
    if not dt:
        return "Never"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    minutes = int((datetime.now(timezone.utc) - dt).total_seconds() // 60)
    if minutes < 2:
        return "Just now"
    if minutes < 60:
        return f"{minutes} minutes ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = hours // 24
    return f"{days} day{'s' if days > 1 else ''} ago"


@router.get("")
@router.get("/")
async def list_users():
    try:
        from app.db import get_engine

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(
                    'SELECT id, name, email, role, department, status, "lastLogin", '
                    '"createdAt" FROM users ORDER BY "createdAt" ASC'
                )
            ).mappings().all()
        if rows:
            users = [
                {
                    "id": str(u["id"]),
                    "name": u["name"] or u["email"].split("@")[0],
                    "email": u["email"],
                    "role": (u["role"] or "Reviewer").replace("_", " ").title(),
                    "department": u["department"] or "Pending",
                    "status": (u["status"] or "invited").lower(),
                    "lastLogin": _format_last_login(u["lastLogin"]),
                    "initials": (u["name"] or u["email"])[:2].upper(),
                    "createdAt": u["createdAt"].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                }
                for u in rows
            ]
            return JSONResponse(
                {
                    "total": 8,
                    "active": 7,
                    "inactive": 1,
                    "roles": ["admin", "ra_lead", "safety_lead", "quality", "ctms_user", "viewer"],
                    "users": users,
                    "source": "database",
                }
            )
    except Exception as exc:
        logger.debug("Users DB error, using seed: %s", exc)

    return JSONResponse({"users": SEED_USERS, "source": "seed"})
