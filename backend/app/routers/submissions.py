"""Submissions API — port of src/app/api/submissions/{route.ts,[id]/route.ts}."""
import json
import logging
import time
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.security import require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.submissions")

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

TYPE_FROM_PRISMA = {
    "ORIGINAL": "NDA",
    "AMENDMENT": "sNDA",
    "SUPPLEMENT": "sBLA",
    "ANNUAL_REPORT": "NDA",
    "SAFETY_REPORT": "NDA",
    "RESPONSE": "NDA",
}
TYPE_TO_PRISMA = {
    "NDA": "ORIGINAL",
    "BLA": "ORIGINAL",
    "MAA": "ORIGINAL",
    "J-NDA": "ORIGINAL",
    "IND": "ORIGINAL",
    "CTA": "ORIGINAL",
    "sNDA": "AMENDMENT",
    "sBLA": "SUPPLEMENT",
    "Type II Variation": "AMENDMENT",
}
STATUS_FROM_PRISMA = {
    "PLANNING": "Draft",
    "AUTHORING": "In Progress",
    "QC": "QC Review",
    "PUBLISHING": "Ready",
    "SUBMITTED": "Submitted",
    "ACKNOWLEDGED": "Under Review",
}
STATUS_TO_PRISMA = {
    "Draft": "PLANNING",
    "In Progress": "AUTHORING",
    "QC Review": "QC",
    "Ready": "PUBLISHING",
    "Submitted": "SUBMITTED",
    "Under Review": "ACKNOWLEDGED",
    "Approved": "ACKNOWLEDGED",
    "CRL": "ACKNOWLEDGED",
}
APPLICATION_TYPE = {
    "NDA": "NDA",
    "BLA": "BLA",
    "MAA": "MAA",
    "J-NDA": "J_NDA",
    "IND": "IND",
    "CTA": "CTA",
    "sNDA": "NDA",
    "sBLA": "BLA",
    "Type II Variation": "MAA",
}
SORTABLE = {"createdAt", "status", "type", "sequenceNumber"}

_SELECT = (
    'SELECT s.*, a."applicationNumber" AS application_number, a."productId" AS app_product_id, '
    'p.name AS product_name FROM submissions s '
    'LEFT JOIN applications a ON a.id = s."applicationId" '
    'LEFT JOIN products p ON p.id = a."productId" '
)


def _map_submission(row: dict) -> dict:
    metadata = row.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    module_progress = row.get("moduleProgress") or {}
    if isinstance(module_progress, str):
        module_progress = json.loads(module_progress)
    if not module_progress:
        module_progress = {"m1": 0, "m2": 0, "m3": 0, "m4": 0, "m5": 0}

    values = list(module_progress.values())
    modules_total = len(values) or 5
    modules_complete = len([v for v in values if v >= 100])

    planned = row.get("plannedDate")
    target_date = (
        metadata.get("targetDate")
        or (planned.strftime("%Y-%m-%d") if isinstance(planned, datetime) else None)
        or date.today().isoformat()
    )
    days_until_target = (date.fromisoformat(target_date[:10]) - date.today()).days

    return {
        "id": str(row["id"]),
        "productId": metadata.get("productId") or (str(row["app_product_id"]) if row.get("app_product_id") else ""),
        "productName": row.get("product_name"),
        "applicationId": str(row["applicationId"]) if row.get("applicationId") else None,
        "applicationNumber": row.get("application_number"),
        "sequenceNumber": row["sequenceNumber"],
        "type": metadata.get("submissionType") or TYPE_FROM_PRISMA.get(row["type"], "NDA"),
        "region": metadata.get("region") or "US",
        "agency": metadata.get("agency") or "FDA",
        "status": STATUS_FROM_PRISMA.get(row["status"], "Draft"),
        "targetDate": target_date,
        "daysUntilTarget": days_until_target,
        "modulesComplete": modules_complete,
        "modulesTotal": modules_total,
        "moduleProgress": module_progress,
        "qcStatus": row.get("qcStatus") or "Not Started",
        "ectdStatus": metadata.get("ectdStatus") or "Pending",
        "description": metadata.get("description"),
        "createdAt": row["createdAt"].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "updatedAt": row["updatedAt"].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }


@router.get("")
@router.get("/")
async def list_submissions(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        status = params.get("status")
        if status and status != "all":
            where.append("s.status = :status")
            args["status"] = STATUS_TO_PRISMA.get(status, "PLANNING")

        sub_type = params.get("type")
        if sub_type and sub_type != "all":
            where.append("s.type = :type")
            args["type"] = TYPE_TO_PRISMA.get(sub_type, "ORIGINAL")

        application_id = params.get("applicationId")
        if application_id:
            where.append('s."applicationId" = cast(:application_id as uuid)')
            args["application_id"] = application_id

        search = params.get("search")
        if search:
            where.append(
                '(s."sequenceNumber" ILIKE :search OR s.description ILIKE :search '
                'OR a."applicationNumber" ILIKE :search)'
            )
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

        mapped = [_map_submission(dict(r)) for r in rows]
        active = [s for s in mapped if s["status"] not in ("Submitted", "Approved")]
        stats = {
            "total": len(mapped),
            "byStatus": {
                "draft": len([s for s in mapped if s["status"] == "Draft"]),
                "inProgress": len([s for s in mapped if s["status"] == "In Progress"]),
                "qcReview": len([s for s in mapped if s["status"] == "QC Review"]),
                "ready": len([s for s in mapped if s["status"] == "Ready"]),
                "submitted": len([s for s in mapped if s["status"] == "Submitted"]),
            },
            "upcomingDeadlines": len([s for s in active if 0 < s["daysUntilTarget"] <= 30]),
            "overdue": len([s for s in active if s["daysUntilTarget"] < 0]),
        }
        return JSONResponse({"data": mapped, "total": len(mapped), "stats": stats})
    except Exception as exc:
        logger.error("Submissions API Error: %s", exc)
        return JSONResponse({"error": "Failed to fetch submissions"}, status_code=500)


@router.post("")
@router.post("/")
async def create_submission(request: Request):
    require_auth(request)
    try:
        body = await request.json()
        if not body.get("productId"):
            return JSONResponse({"error": "productId is required"}, status_code=400)

        submission_type = body.get("type") or "IND"

        with get_engine().begin() as conn:
            application_id = body.get("applicationId")
            if not application_id:
                existing_app = conn.execute(
                    text(
                        'SELECT id FROM applications WHERE "productId" = cast(:pid as uuid) '
                        'ORDER BY "createdAt" DESC LIMIT 1'
                    ),
                    {"pid": body["productId"]},
                ).first()
                if existing_app:
                    application_id = str(existing_app[0])
                else:
                    app_row = conn.execute(
                        text(
                            'INSERT INTO applications (id, "applicationNumber", type, status, region, '
                            'agency, "productId", "createdAt", "updatedAt") '
                            "VALUES (gen_random_uuid(), :number, :type, 'PLANNING', :region, :agency, "
                            "cast(:pid as uuid), now(), now()) RETURNING id"
                        ),
                        {
                            "number": f"APP-{str(int(time.time() * 1000))[-8:]}",
                            "type": APPLICATION_TYPE.get(submission_type, "IND"),
                            "region": body.get("region") or "US",
                            "agency": body.get("agency") or "FDA",
                            "pid": body["productId"],
                        },
                    ).first()
                    application_id = str(app_row[0])

            sequence_count = conn.execute(
                text('SELECT COUNT(*) FROM submissions WHERE "applicationId" = cast(:aid as uuid)'),
                {"aid": application_id},
            ).scalar()
            next_sequence = str(sequence_count).zfill(4)

            metadata = {
                "productId": body["productId"],
                "region": body.get("region") or "US",
                "agency": body.get("agency") or "FDA",
                "submissionType": submission_type,
                "targetDate": body.get("targetDate") or date.today().isoformat(),
                "modulesTotal": body.get("modulesTotal") or 5,
                "ectdStatus": "Pending",
                "description": body.get("description") or f"{submission_type} Submission",
            }

            row = conn.execute(
                text(
                    'INSERT INTO submissions (id, "sequenceNumber", type, status, "applicationId", '
                    '"plannedDate", "moduleProgress", "qcStatus", metadata, "createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :sequence, :type, 'PLANNING', cast(:aid as uuid), "
                    "cast(:planned as timestamptz), cast(:progress as jsonb), 'Not Started', "
                    "cast(:metadata as jsonb), now(), now()) RETURNING id"
                ),
                {
                    "sequence": next_sequence,
                    "type": TYPE_TO_PRISMA.get(submission_type, "ORIGINAL"),
                    "aid": application_id,
                    "planned": body.get("targetDate"),
                    "progress": json.dumps({"m1": 0, "m2": 0, "m3": 0, "m4": 0, "m5": 0}),
                    "metadata": json.dumps(metadata),
                },
            ).first()
            created = conn.execute(
                text(f"{_SELECT} WHERE s.id = :id"), {"id": str(row[0])}
            ).mappings().first()

        return JSONResponse({"data": _map_submission(dict(created))}, status_code=201)
    except Exception as exc:
        logger.error("Submissions Create Error: %s", exc)
        return JSONResponse({"error": "Failed to create submission"}, status_code=500)


@router.get("/{submission_id}")
async def get_submission(submission_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"{_SELECT} WHERE s.id = cast(:id as uuid)"), {"id": submission_id}
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "Submission not found"}, status_code=404)
        return JSONResponse({"data": _map_submission(dict(row))})
    except Exception as exc:
        logger.error("Submission get error: %s", exc)
        return JSONResponse({"error": "Failed to fetch submission"}, status_code=500)


@router.patch("/{submission_id}")
@router.put("/{submission_id}")
async def update_submission(submission_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            existing = conn.execute(
                text('SELECT metadata, "moduleProgress" FROM submissions WHERE id = cast(:id as uuid)'),
                {"id": submission_id},
            ).mappings().first()
            if not existing:
                return JSONResponse({"error": "Submission not found"}, status_code=404)

            metadata = existing["metadata"] or {}
            if isinstance(metadata, str):
                metadata = json.loads(metadata)

            sets = ['"updatedAt" = now()']
            args: dict = {"id": submission_id}

            if "status" in body:
                sets.append("status = :status")
                args["status"] = STATUS_TO_PRISMA.get(body["status"], "PLANNING")
                if body["status"] == "Submitted":
                    sets.append('"submittedDate" = now()')
            if "qcStatus" in body:
                sets.append('"qcStatus" = :qc')
                args["qc"] = body["qcStatus"]
            if "moduleProgress" in body:
                sets.append('"moduleProgress" = cast(:progress as jsonb)')
                args["progress"] = json.dumps(body["moduleProgress"])
            if "targetDate" in body:
                sets.append('"plannedDate" = cast(:planned as timestamptz)')
                args["planned"] = body["targetDate"]
                metadata["targetDate"] = body["targetDate"]

            metadata_changed = "targetDate" in body
            for key in ("region", "agency", "description", "ectdStatus", "submissionType"):
                if key in body:
                    metadata[key] = body[key]
                    metadata_changed = True
            if metadata_changed:
                sets.append("metadata = cast(:metadata as jsonb)")
                args["metadata"] = json.dumps(metadata)

            conn.execute(
                text(f'UPDATE submissions SET {", ".join(sets)} WHERE id = cast(:id as uuid)'), args
            )
            updated = conn.execute(
                text(f"{_SELECT} WHERE s.id = cast(:id as uuid)"), {"id": submission_id}
            ).mappings().first()

        return JSONResponse({"data": _map_submission(dict(updated))})
    except Exception as exc:
        logger.error("Submission update error: %s", exc)
        return JSONResponse({"error": "Failed to update submission"}, status_code=500)


@router.delete("/{submission_id}")
async def delete_submission(submission_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM submissions WHERE id = cast(:id as uuid) RETURNING id"),
                {"id": submission_id},
            ).first()
        if not row:
            return JSONResponse({"error": "Submission not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("Submission delete error: %s", exc)
        return JSONResponse({"error": "Failed to delete submission"}, status_code=500)
