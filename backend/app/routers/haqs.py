"""HAQs API — port of src/app/api/haqs/{route.ts,[id]/route.ts}.

The Supabase-JS path in the original is dead when DATABASE_URL is set
(v0.104.0 changelog); this port implements the live Prisma/Postgres path.
"""
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.security import get_request_user, require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.haqs")

router = APIRouter(prefix="/api/haqs", tags=["haqs"])

STATUS_FROM_PRISMA = {
    "RECEIVED": "new",
    "IN_PROGRESS": "in-progress",
    "DRAFT_COMPLETE": "draft-ready",
    "IN_REVIEW": "under-review",
    "APPROVED": "submitted",
    "SUBMITTED": "submitted",
    "CLOSED": "closed",
}
STATUS_TO_PRISMA = {
    "new": "RECEIVED",
    "open": "RECEIVED",
    "in-progress": "IN_PROGRESS",
    "draft-ready": "DRAFT_COMPLETE",
    "under-review": "IN_REVIEW",
    "partially-responded": "IN_PROGRESS",
    "submitted": "SUBMITTED",
    "closed": "CLOSED",
}
PRIORITY_FROM_PRISMA = {"CRITICAL": "critical", "HIGH": "major", "MEDIUM": "minor", "LOW": "minor"}
PRIORITY_TO_PRISMA = {"critical": "CRITICAL", "major": "HIGH", "minor": "MEDIUM"}

SORTABLE = {"dueDate", "priority", "status", "receivedDate"}

_SELECT = (
    'SELECT h.*, p.name AS product_name, a."applicationNumber" AS application_number, '
    'u.name AS assignee_name FROM haqs h '
    'LEFT JOIN products p ON p.id = h."productId" '
    'LEFT JOIN applications a ON a.id = h."applicationId" '
    'LEFT JOIN users u ON u.id = h."assigneeId" '
)


def _date(dt) -> Optional[str]:
    return dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else None


def _iso(dt) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z") if isinstance(dt, datetime) else str(dt)


def _map_haq(row: dict) -> dict:
    metadata = row.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return {
        "id": str(row["id"]),
        "applicationId": str(row["applicationId"]) if row.get("applicationId") else "",
        "applicationNumber": row.get("application_number") or "",
        "productId": str(row["productId"]) if row.get("productId") else "",
        "productName": row.get("product_name") or "",
        "questionNumber": row["haqNumber"],
        "questionText": row.get("question") or row.get("subject"),
        "discipline": metadata.get("category") or "Clinical",
        "subdiscipline": metadata.get("subdiscipline"),
        "ctdSection": metadata.get("ctdSection"),
        "type": metadata.get("type") or "IR",
        "source": row.get("sourceType") or "FDA",
        "priority": PRIORITY_FROM_PRISMA.get(row["priority"], "minor"),
        "receivedDate": _date(row["receivedDate"]),
        "dueDate": _date(row["dueDate"]),
        "submittedDate": _date(row.get("submittedDate")),
        "status": STATUS_FROM_PRISMA.get(row["status"], "new"),
        "assignedTo": str(row["assigneeId"]) if row.get("assigneeId") else None,
        "assignedToName": row.get("assignee_name"),
        "responseText": row.get("responseText"),
        "tags": metadata.get("tags") or [],
        "notes": metadata.get("notes"),
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }


def _db_error_response(exc: Exception) -> JSONResponse:
    message = str(exc)
    is_connection = any(token in message for token in ("connect", "ECONNREFUSED", "timeout"))
    return JSONResponse(
        {
            "error": "Database unavailable",
            "code": "DB_CONNECTION_ERROR" if is_connection else "DB_ERROR",
            "message": message,
        },
        status_code=503,
        headers={"Retry-After": "30"},
    )


@router.get("")
@router.get("/")
async def list_haqs(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        status = params.get("status")
        if status and status != "all":
            where.append("h.status = :status")
            args["status"] = STATUS_TO_PRISMA.get(status, "RECEIVED")

        priority = params.get("priority")
        if priority and priority != "all":
            where.append("h.priority = :priority")
            args["priority"] = PRIORITY_TO_PRISMA.get(priority, "MEDIUM")

        product_id = params.get("productId")
        if product_id and product_id != "all":
            where.append('h."productId" = :product_id')
            args["product_id"] = product_id

        application_id = params.get("applicationId")
        if application_id:
            where.append('h."applicationId" = :application_id')
            args["application_id"] = application_id

        search = params.get("search")
        if search:
            where.append(
                '(h."haqNumber" ILIKE :search OR h.subject ILIKE :search OR h.question ILIKE :search)'
            )
            args["search"] = f"%{search}%"

        sort_by = params.get("sortBy") or "dueDate"
        if sort_by not in SORTABLE:
            sort_by = "dueDate"
        sort_dir = "DESC" if (params.get("sortDir") or "asc").lower() == "desc" else "ASC"

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f'{_SELECT} WHERE {" AND ".join(where)} ORDER BY h."{sort_by}" {sort_dir}'),
                args,
            ).mappings().all()

        mapped = [_map_haq(dict(r)) for r in rows]
        return JSONResponse({"data": mapped, "total": len(mapped), "source": "database"})
    except Exception as exc:
        logger.error("HAQ API database error: %s", exc)
        return _db_error_response(exc)


@router.post("")
@router.post("/")
async def create_haq(request: Request):
    require_auth(request)
    user = get_request_user(request)
    try:
        body = await request.json()

        # validateRequest parity: length limits on free-text fields
        limits = {"questionText": 10000, "subject": 500, "discipline": 100, "priority": 20, "source": 50}
        for field_name, max_length in limits.items():
            value = body.get(field_name)
            if value is not None and isinstance(value, str) and len(value) > max_length:
                return JSONResponse(
                    {"error": f"{field_name} exceeds maximum length of {max_length}"},
                    status_code=400,
                )

        haq_number = f"HAQ-{datetime.now().year}-{str(int(time.time() * 1000))[-6:]}"
        now = datetime.now(timezone.utc)
        received = body.get("receivedDate") or now.isoformat()
        due = body.get("dueDate") or (now + timedelta(days=30)).isoformat()

        metadata = {
            "category": body.get("discipline") or "Clinical",
            "type": body.get("type") or "IR",
            "tags": body.get("tags") or [],
            "createdBy": (user.email if user else None) or "system",
        }

        with get_engine().begin() as conn:
            row = conn.execute(
                text(
                    'INSERT INTO haqs (id, "haqNumber", subject, question, status, priority, '
                    '"sourceType", "receivedDate", "dueDate", "productId", "applicationId", '
                    '"assigneeId", metadata, "createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :haq_number, :subject, :question, :status, "
                    ":priority, :source, cast(:received as timestamptz), cast(:due as timestamptz), "
                    "cast(:product_id as uuid), cast(:application_id as uuid), cast(:assignee_id as uuid), "
                    "cast(:metadata as jsonb), now(), now()) RETURNING id"
                ),
                {
                    "haq_number": haq_number,
                    "subject": body.get("subject") or "New Question",
                    "question": body.get("questionText") or "",
                    "status": STATUS_TO_PRISMA.get(body.get("status") or "new", "RECEIVED"),
                    "priority": PRIORITY_TO_PRISMA.get(body.get("priority") or "minor", "MEDIUM"),
                    "source": body.get("source") or "FDA",
                    "received": received,
                    "due": due,
                    "product_id": body.get("productId") or None,
                    "application_id": body.get("applicationId") or None,
                    "assignee_id": body.get("assignedTo") or None,
                    "metadata": json.dumps(metadata),
                },
            ).first()
            created = conn.execute(
                text(f"{_SELECT} WHERE h.id = :id"), {"id": str(row[0])}
            ).mappings().first()

        logger.debug("Created %s by %s", haq_number, user.email if user else "unknown")
        return JSONResponse({"data": _map_haq(dict(created)), "source": "prisma"}, status_code=201)
    except Exception as exc:
        logger.error("HAQ create error: %s", exc)
        message = str(exc)
        if any(t in message for t in ("connect", "ECONNREFUSED", "timeout")):
            return JSONResponse(
                {"error": "Database unavailable", "code": "DB_CONNECTION_ERROR", "message": message},
                status_code=503,
            )
        return JSONResponse(
            {"error": "Failed to create HAQ", "code": "CREATE_ERROR", "message": message},
            status_code=500,
        )


@router.get("/{haq_id}")
async def get_haq(haq_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"{_SELECT} WHERE h.id = cast(:id as uuid)"), {"id": haq_id}
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "HAQ not found"}, status_code=404)
        return JSONResponse({"data": _map_haq(dict(row)), "source": "database"})
    except Exception as exc:
        logger.error("HAQ get error: %s", exc)
        return JSONResponse({"error": "Failed to fetch HAQ"}, status_code=500)


@router.patch("/{haq_id}")
@router.put("/{haq_id}")
async def update_haq(haq_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            existing = conn.execute(
                text("SELECT * FROM haqs WHERE id = cast(:id as uuid)"), {"id": haq_id}
            ).mappings().first()
            if not existing:
                return JSONResponse({"error": "HAQ not found"}, status_code=404)

            metadata = existing["metadata"] or {}
            if isinstance(metadata, str):
                metadata = json.loads(metadata)

            sets = ['"updatedAt" = now()']
            args: dict = {"id": haq_id}

            if "status" in body:
                sets.append("status = :status")
                args["status"] = STATUS_TO_PRISMA.get(body["status"], "RECEIVED")
                if body["status"] == "submitted":
                    sets.append('"submittedDate" = now()')
            if "priority" in body:
                sets.append("priority = :priority")
                args["priority"] = PRIORITY_TO_PRISMA.get(body["priority"], "MEDIUM")
            if "assignedTo" in body:
                sets.append('"assigneeId" = cast(:assignee as uuid)')
                args["assignee"] = body["assignedTo"] or None
            if "dueDate" in body:
                sets.append('"dueDate" = cast(:due as timestamptz)')
                args["due"] = body["dueDate"]
            if "responseText" in body:
                sets.append('"responseText" = :response_text')
                args["response_text"] = body["responseText"]
            if "questionText" in body:
                sets.append("question = :question")
                args["question"] = body["questionText"]
            if "subject" in body:
                sets.append("subject = :subject")
                args["subject"] = body["subject"]

            metadata_changed = False
            for key in ("discipline", "ctdSection", "notes", "tags", "type"):
                if key in body:
                    metadata_key = "category" if key == "discipline" else key
                    metadata[metadata_key] = body[key]
                    metadata_changed = True
            if metadata_changed:
                sets.append("metadata = cast(:metadata as jsonb)")
                args["metadata"] = json.dumps(metadata)

            conn.execute(text(f'UPDATE haqs SET {", ".join(sets)} WHERE id = cast(:id as uuid)'), args)
            updated = conn.execute(
                text(f"{_SELECT} WHERE h.id = cast(:id as uuid)"), {"id": haq_id}
            ).mappings().first()

        return JSONResponse({"data": _map_haq(dict(updated)), "source": "database"})
    except Exception as exc:
        logger.error("HAQ update error: %s", exc)
        return JSONResponse({"error": "Failed to update HAQ"}, status_code=500)


@router.delete("/{haq_id}")
async def delete_haq(haq_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM haqs WHERE id = cast(:id as uuid) RETURNING id"), {"id": haq_id}
            ).first()
        if not row:
            return JSONResponse({"error": "HAQ not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("HAQ delete error: %s", exc)
        return JSONResponse({"error": "Failed to delete HAQ"}, status_code=500)
