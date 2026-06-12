"""Safety API — port of src/app/api/safety/{route.ts,[id]/route.ts} (Prisma path)."""
import json
import logging
import time
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.security import require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.safety")

router = APIRouter(prefix="/api/safety", tags=["safety"])

STATUS_FROM_PRISMA = {
    "DRAFT": "initial",
    "DATA_ENTRY": "initial",
    "MEDICAL_REVIEW": "in-progress",
    "QC_REVIEW": "in-progress",
    "READY": "in-progress",
    "INITIAL": "initial",
    "IN_PROGRESS": "in-progress",
    "SUBMITTED": "submitted",
    "CLOSED": "closed",
}
STATUS_TO_PRISMA = {
    "initial": "INITIAL",
    "in-progress": "IN_PROGRESS",
    "submitted": "SUBMITTED",
    "closed": "CLOSED",
}
REPORTER_TYPES = {
    "hcp": "HCP",
    "consumer": "Consumer",
    "study": "Study",
    "literature": "Literature",
    "authority": "Authority",
}
SORTABLE = {"reportDate", "caseNumber", "status", "createdAt"}

_SELECT = (
    'SELECT sr.*, p.name AS product_name FROM safety_reports sr '
    'LEFT JOIN products p ON p.id = sr."productId" '
)


def _date(dt) -> Optional[str]:
    return dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else None


def _parse_seriousness(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return "non-serious" if value.lower() in ("non-serious", "nonserious") else "serious"


def _map_report(row: dict) -> dict:
    metadata = row.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    reporter = row.get("reporterType")
    return {
        "id": str(row["id"]),
        "caseNumber": row["caseNumber"],
        "reportType": row["reportType"],
        "seriousness": _parse_seriousness(row.get("seriousness")),
        "patientInitials": row.get("patientInitials"),
        "patientAge": row.get("patientAge"),
        "patientSex": row.get("patientSex"),
        "eventDescription": row.get("eventDescription"),
        "eventTermPreferred": metadata.get("eventTermPreferred"),
        "eventSOC": metadata.get("eventSOC"),
        "onsetDate": _date(row.get("onsetDate")),
        "reporterType": (REPORTER_TYPES.get(reporter.lower(), "Other") if reporter else None),
        "reporterCountry": row.get("reporterCountry"),
        "reportDate": _date(row["reportDate"]),
        "regulatoryDeadline": metadata.get("regulatoryDeadline"),
        "status": STATUS_FROM_PRISMA.get(row["status"], "initial"),
        "priority": metadata.get("priority") or "routine",
        "expeditedReport": metadata.get("expeditedReport") or False,
        "e2bSubmitted": metadata.get("e2bSubmitted") or False,
        "productId": str(row["productId"]) if row.get("productId") else None,
        "productName": row.get("product_name"),
        "studyId": metadata.get("studyId"),
        "narrativeSummary": metadata.get("narrativeSummary"),
        "createdAt": row["createdAt"].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "updatedAt": row["updatedAt"].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }


def _stats(mapped: list[dict]) -> dict:
    return {
        "total": len(mapped),
        "serious": len([r for r in mapped if r["seriousness"] == "serious"]),
        "expedited": len([r for r in mapped if r["expeditedReport"]]),
        "pending": len([r for r in mapped if r["status"] not in ("submitted", "closed")]),
    }


@router.get("")
@router.get("/")
async def list_safety_reports(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        status = params.get("status")
        if status and status != "all":
            where.append("sr.status = :status")
            args["status"] = STATUS_TO_PRISMA.get(status, "INITIAL")

        report_type = params.get("reportType")
        if report_type and report_type != "all":
            where.append('sr."reportType" = :report_type')
            args["report_type"] = report_type

        product_id = params.get("productId")
        if product_id and product_id != "all":
            where.append('sr."productId" = cast(:product_id as uuid)')
            args["product_id"] = product_id

        seriousness = params.get("seriousness")
        if seriousness == "serious":
            where.append("sr.seriousness NOT ILIKE 'non%serious'")
        elif seriousness == "non-serious":
            where.append("sr.seriousness ILIKE 'non%serious'")

        search = params.get("search")
        if search:
            where.append('(sr."caseNumber" ILIKE :search OR sr."eventDescription" ILIKE :search)')
            args["search"] = f"%{search}%"

        sort_by = params.get("sortBy") or "reportDate"
        if sort_by not in SORTABLE:
            sort_by = "reportDate"
        sort_dir = "ASC" if (params.get("sortDir") or "desc").lower() == "asc" else "DESC"

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f'{_SELECT} WHERE {" AND ".join(where)} ORDER BY sr."{sort_by}" {sort_dir}'),
                args,
            ).mappings().all()

        mapped = [_map_report(dict(r)) for r in rows]
        return JSONResponse(
            {"data": mapped, "total": len(mapped), "stats": _stats(mapped), "source": "prisma"}
        )
    except Exception as exc:
        logger.error("Safety API error: %s", exc)
        return JSONResponse({"error": "Failed to fetch safety reports"}, status_code=500)


@router.post("")
@router.post("/")
async def create_safety_report(request: Request):
    require_auth(request)
    try:
        body = await request.json()
        case_number = body.get("caseNumber") or f"ICSR-{datetime.now().year}-{str(int(time.time() * 1000))[-5:]}"

        seriousness_db = None
        if body.get("seriousness"):
            seriousness_db = "Hospitalization" if body["seriousness"] == "serious" else "Non-serious"

        regulatory_deadline = None
        if body.get("expeditedReport"):
            report_date = date.fromisoformat((body.get("reportDate") or date.today().isoformat())[:10])
            days = 7 if "7-day" in (body.get("priority") or "") else 15
            regulatory_deadline = (report_date + timedelta(days=days)).isoformat()

        metadata = {
            "eventTermPreferred": body.get("eventTermPreferred"),
            "eventSOC": body.get("eventSOC"),
            "priority": body.get("priority") or "routine",
            "expeditedReport": body.get("expeditedReport") or False,
            "regulatoryDeadline": regulatory_deadline,
            "initialReceiptDate": date.today().isoformat(),
            "studyId": body.get("studyId"),
        }

        with get_engine().begin() as conn:
            row = conn.execute(
                text(
                    'INSERT INTO safety_reports (id, "caseNumber", "reportType", seriousness, '
                    '"patientInitials", "patientAge", "patientSex", "eventDescription", "onsetDate", '
                    '"reportDate", "reporterType", "reporterCountry", status, "productId", metadata, '
                    '"createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :case_number, :report_type, :seriousness, :initials, "
                    ":age, :sex, :description, cast(:onset as timestamptz), "
                    "cast(:report_date as timestamptz), :reporter_type, :reporter_country, 'INITIAL', "
                    "cast(:product_id as uuid), cast(:metadata as jsonb), now(), now()) RETURNING id"
                ),
                {
                    "case_number": case_number,
                    "report_type": body.get("reportType") or "ICSR",
                    "seriousness": seriousness_db,
                    "initials": body.get("patientInitials"),
                    "age": body.get("patientAge"),
                    "sex": body.get("patientSex"),
                    "description": body.get("eventDescription"),
                    "onset": body.get("onsetDate"),
                    "report_date": body.get("reportDate") or datetime.now().isoformat(),
                    "reporter_type": body.get("reporterType"),
                    "reporter_country": body.get("reporterCountry"),
                    "product_id": body.get("productId") or None,
                    "metadata": json.dumps(metadata),
                },
            ).first()
            created = conn.execute(
                text(f"{_SELECT} WHERE sr.id = :id"), {"id": str(row[0])}
            ).mappings().first()

        logger.debug("Created %s in Prisma", case_number)
        return JSONResponse({"data": _map_report(dict(created)), "source": "prisma"}, status_code=201)
    except Exception as exc:
        logger.error("Safety create error: %s", exc)
        return JSONResponse({"error": "Failed to create safety report"}, status_code=500)


@router.get("/{report_id}")
async def get_safety_report(report_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"{_SELECT} WHERE sr.id = cast(:id as uuid)"), {"id": report_id}
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "Safety report not found"}, status_code=404)
        return JSONResponse({"data": _map_report(dict(row)), "source": "prisma"})
    except Exception as exc:
        logger.error("Safety get error: %s", exc)
        return JSONResponse({"error": "Failed to fetch safety report"}, status_code=500)


@router.patch("/{report_id}")
@router.put("/{report_id}")
async def update_safety_report(report_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            existing = conn.execute(
                text("SELECT metadata FROM safety_reports WHERE id = cast(:id as uuid)"),
                {"id": report_id},
            ).mappings().first()
            if not existing:
                return JSONResponse({"error": "Safety report not found"}, status_code=404)

            metadata = existing["metadata"] or {}
            if isinstance(metadata, str):
                metadata = json.loads(metadata)

            sets = ['"updatedAt" = now()']
            args: dict = {"id": report_id}

            if "status" in body:
                sets.append("status = :status")
                args["status"] = STATUS_TO_PRISMA.get(body["status"], "INITIAL")
            if "seriousness" in body:
                sets.append("seriousness = :seriousness")
                args["seriousness"] = (
                    "Hospitalization" if body["seriousness"] == "serious" else "Non-serious"
                )
            simple = {
                "patientInitials": '"patientInitials"',
                "patientAge": '"patientAge"',
                "patientSex": '"patientSex"',
                "eventDescription": '"eventDescription"',
                "reporterType": '"reporterType"',
                "reporterCountry": '"reporterCountry"',
            }
            for body_key, column in simple.items():
                if body_key in body:
                    sets.append(f"{column} = :{body_key}")
                    args[body_key] = body[body_key]
            if "onsetDate" in body:
                sets.append('"onsetDate" = cast(:onset as timestamptz)')
                args["onset"] = body["onsetDate"]
            if "productId" in body:
                sets.append('"productId" = cast(:pid as uuid)')
                args["pid"] = body["productId"] or None

            metadata_changed = False
            for key in (
                "eventTermPreferred", "eventSOC", "priority", "expeditedReport",
                "regulatoryDeadline", "e2bSubmitted", "narrativeSummary", "studyId",
            ):
                if key in body:
                    metadata[key] = body[key]
                    metadata_changed = True
            if metadata_changed:
                sets.append("metadata = cast(:metadata as jsonb)")
                args["metadata"] = json.dumps(metadata)

            conn.execute(
                text(f'UPDATE safety_reports SET {", ".join(sets)} WHERE id = cast(:id as uuid)'),
                args,
            )
            updated = conn.execute(
                text(f"{_SELECT} WHERE sr.id = cast(:id as uuid)"), {"id": report_id}
            ).mappings().first()

        return JSONResponse({"data": _map_report(dict(updated)), "source": "prisma"})
    except Exception as exc:
        logger.error("Safety update error: %s", exc)
        return JSONResponse({"error": "Failed to update safety report"}, status_code=500)


@router.delete("/{report_id}")
async def delete_safety_report(report_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM safety_reports WHERE id = cast(:id as uuid) RETURNING id"),
                {"id": report_id},
            ).first()
        if not row:
            return JSONResponse({"error": "Safety report not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("Safety delete error: %s", exc)
        return JSONResponse({"error": "Failed to delete safety report"}, status_code=500)
