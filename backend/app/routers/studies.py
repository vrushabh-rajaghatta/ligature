"""Studies API — port of src/app/api/studies/{route.ts,[id]/route.ts}."""
import json
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.security import require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.studies")

router = APIRouter(prefix="/api/studies", tags=["studies"])

VALID_STATUSES = {"PLANNING", "RECRUITING", "ACTIVE", "COMPLETED", "TERMINATED", "SUSPENDED", "WITHDRAWN"}
STATUS_TO_API = {
    "PLANNING": "Planning",
    "RECRUITING": "Recruiting",
    "ACTIVE": "Active",
    "COMPLETED": "Completed",
    "TERMINATED": "Terminated",
    "SUSPENDED": "Suspended",
    "WITHDRAWN": "Withdrawn",
}
STATUS_FROM_API = {v: k for k, v in STATUS_TO_API.items() if k != "WITHDRAWN"}
SORTABLE = {"studyNumber", "title", "phase", "status", "startDate", "createdAt"}

_SELECT = (
    'SELECT s.*, p.name AS product_name, p.code AS product_code FROM studies s '
    'LEFT JOIN products p ON p.id = s."productId" '
)


def _iso(dt) -> Optional[str]:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z") if isinstance(dt, datetime) else None


def _map_study(row: dict) -> dict:
    enrollment_percentage = None
    if row.get("plannedEnrollment"):
        enrollment_percentage = round((row.get("actualEnrollment") or 0) / row["plannedEnrollment"] * 100)

    days_remaining = None
    is_overdue = False
    if row.get("estimatedEndDate"):
        days_remaining = (row["estimatedEndDate"].date() - date.today()).days
        is_overdue = days_remaining < 0 and not row.get("actualEndDate")

    study = {
        "id": str(row["id"]),
        "studyNumber": row["studyNumber"],
        "title": row["title"],
        "phase": row.get("phase") or None,
        "status": STATUS_TO_API.get(row["status"], "Planning"),
        "productId": str(row["productId"]) if row.get("productId") else None,
        "productName": row.get("product_name"),
        "productCode": row.get("product_code"),
        "plannedEnrollment": row.get("plannedEnrollment") or None,
        "actualEnrollment": row.get("actualEnrollment") or None,
        "enrollmentPercentage": enrollment_percentage,
        "startDate": _iso(row.get("startDate")),
        "estimatedEndDate": _iso(row.get("estimatedEndDate")),
        "actualEndDate": _iso(row.get("actualEndDate")),
        "daysRemaining": days_remaining,
        "isOverdue": is_overdue,
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }
    return {k: v for k, v in study.items() if v is not None or k in ("daysRemaining", "isOverdue")}


@router.get("")
@router.get("/")
async def list_studies(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        phase = params.get("phase")
        if phase and phase != "all":
            where.append("s.phase = :phase")
            args["phase"] = phase

        status = params.get("status")
        if status and status != "all":
            mapped_status = STATUS_FROM_API.get(status, "PLANNING")
            if mapped_status in VALID_STATUSES:
                where.append("s.status = :status")
                args["status"] = mapped_status

        product_id = params.get("productId")
        if product_id and product_id != "all":
            where.append('s."productId" = cast(:product_id as uuid)')
            args["product_id"] = product_id

        search = params.get("search")
        if search:
            where.append('(s."studyNumber" ILIKE :search OR s.title ILIKE :search)')
            args["search"] = f"%{search}%"

        sort_by = params.get("sortBy") or "createdAt"
        if sort_by not in SORTABLE:
            sort_by = "createdAt"
        sort_dir = "ASC" if (params.get("sortDir") or "desc").lower() == "asc" else "DESC"

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f'{_SELECT} WHERE {" AND ".join(where)} ORDER BY s."{sort_by}" {sort_dir}'),
                args,
            ).mappings().all()

        mapped = []
        stats = {"total": len(rows), "byPhase": {}, "byStatus": {}, "totalEnrolled": 0, "totalTarget": 0}
        for r in rows:
            row = dict(r)
            mapped.append(_map_study(row))
            if row.get("phase"):
                stats["byPhase"][row["phase"]] = stats["byPhase"].get(row["phase"], 0) + 1
            api_status = STATUS_TO_API.get(row["status"], "Planning")
            stats["byStatus"][api_status] = stats["byStatus"].get(api_status, 0) + 1
            stats["totalEnrolled"] += row.get("actualEnrollment") or 0
            stats["totalTarget"] += row.get("plannedEnrollment") or 0

        return JSONResponse({"data": mapped, "total": len(mapped), "stats": stats})
    except Exception as exc:
        logger.error("Studies API Error: %s", exc)
        return JSONResponse({"error": "Failed to fetch studies"}, status_code=500)


@router.post("")
@router.post("/")
async def create_study(request: Request):
    require_auth(request)
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            row = conn.execute(
                text(
                    'INSERT INTO studies (id, "studyNumber", title, phase, status, "productId", '
                    '"plannedEnrollment", "actualEnrollment", "startDate", "estimatedEndDate", '
                    '"actualEndDate", metadata, "createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :number, :title, :phase, :status, "
                    "cast(:product_id as uuid), :planned, :actual, cast(:start as timestamptz), "
                    "cast(:est_end as timestamptz), cast(:actual_end as timestamptz), "
                    "cast(:metadata as jsonb), now(), now()) RETURNING id"
                ),
                {
                    "number": body.get("studyNumber"),
                    "title": body.get("title"),
                    "phase": body.get("phase"),
                    "status": STATUS_FROM_API.get(body.get("status"), "PLANNING") if body.get("status") else "PLANNING",
                    "product_id": body.get("productId") or None,
                    "planned": body.get("plannedEnrollment"),
                    "actual": body.get("actualEnrollment"),
                    "start": body.get("startDate"),
                    "est_end": body.get("estimatedEndDate"),
                    "actual_end": body.get("actualEndDate"),
                    "metadata": json.dumps(body.get("metadata") or {}),
                },
            ).first()
            created = conn.execute(
                text(f"{_SELECT} WHERE s.id = :id"), {"id": str(row[0])}
            ).mappings().first()
        return JSONResponse({"data": _map_study(dict(created))}, status_code=201)
    except Exception as exc:
        logger.error("Study Create Error: %s", exc)
        return JSONResponse({"error": "Failed to create study"}, status_code=500)


@router.get("/{study_id}")
async def get_study(study_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"{_SELECT} WHERE s.id = cast(:id as uuid)"), {"id": study_id}
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "Study not found"}, status_code=404)
        return JSONResponse({"data": _map_study(dict(row))})
    except Exception as exc:
        logger.error("Study get error: %s", exc)
        return JSONResponse({"error": "Failed to fetch study"}, status_code=500)


@router.patch("/{study_id}")
@router.put("/{study_id}")
async def update_study(study_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        sets = ['"updatedAt" = now()']
        args: dict = {"id": study_id}
        simple = {
            "studyNumber": '"studyNumber"',
            "title": "title",
            "phase": "phase",
            "plannedEnrollment": '"plannedEnrollment"',
            "actualEnrollment": '"actualEnrollment"',
        }
        for body_key, column in simple.items():
            if body_key in body:
                sets.append(f"{column} = :{body_key}")
                args[body_key] = body[body_key]
        if "status" in body:
            sets.append("status = :status")
            args["status"] = STATUS_FROM_API.get(body["status"], "PLANNING")
        for body_key, column in (
            ("startDate", '"startDate"'),
            ("estimatedEndDate", '"estimatedEndDate"'),
            ("actualEndDate", '"actualEndDate"'),
        ):
            if body_key in body:
                sets.append(f"{column} = cast(:{body_key} as timestamptz)")
                args[body_key] = body[body_key]
        if "productId" in body:
            sets.append('"productId" = cast(:productId as uuid)')
            args["productId"] = body["productId"] or None

        with get_engine().begin() as conn:
            result = conn.execute(
                text(f'UPDATE studies SET {", ".join(sets)} WHERE id = cast(:id as uuid) RETURNING id'),
                args,
            ).first()
            if not result:
                return JSONResponse({"error": "Study not found"}, status_code=404)
            updated = conn.execute(
                text(f"{_SELECT} WHERE s.id = cast(:id as uuid)"), {"id": study_id}
            ).mappings().first()
        return JSONResponse({"data": _map_study(dict(updated))})
    except Exception as exc:
        logger.error("Study update error: %s", exc)
        return JSONResponse({"error": "Failed to update study"}, status_code=500)


@router.delete("/{study_id}")
async def delete_study(study_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM studies WHERE id = cast(:id as uuid) RETURNING id"),
                {"id": study_id},
            ).first()
        if not row:
            return JSONResponse({"error": "Study not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("Study delete error: %s", exc)
        return JSONResponse({"error": "Failed to delete study"}, status_code=500)
