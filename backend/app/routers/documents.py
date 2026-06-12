"""Documents API — port of src/app/api/documents/{route.ts,[id]/route.ts}.

Implements the live Prisma/Postgres path (the Supabase-JS branch in the
original only runs when NEXT_PUBLIC_SUPABASE_URL is configured).
"""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.security import require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.documents")

router = APIRouter(prefix="/api/documents", tags=["documents"])

STATUS_TO_API = {
    "DRAFT": "Draft",
    "IN_REVIEW": "In Review",
    "APPROVED": "Approved",
    "EFFECTIVE": "Effective",
    "SUPERSEDED": "Superseded",
    "OBSOLETE": "Obsolete",
}
STATUS_FROM_API = {v: k for k, v in STATUS_TO_API.items()}

TYPE_TO_API = {
    "PROTOCOL": "Protocol",
    "IB": "Investigator Brochure",
    "ICF": "Informed Consent Form",
    "CSR": "Clinical Study Report",
    "MODULE_1": "Module 1",
    "MODULE_2": "Module 2",
    "MODULE_3": "Module 3",
    "MODULE_4": "Module 4",
    "MODULE_5": "Module 5",
    "SOP": "SOP",
    "FORM": "Form",
    "TEMPLATE": "Template",
    "CORRESPONDENCE": "Correspondence",
    "OTHER": "Other",
}
# Accepts both display names and enum values (parity with mapTypeFromApi)
TYPE_FROM_API = {**{v: k for k, v in TYPE_TO_API.items()}, **{k: k for k in TYPE_TO_API}}

SORTABLE = {"documentNumber", "title", "type", "status", "version", "createdAt", "updatedAt"}

_SELECT = (
    'SELECT d.*, p.name AS product_name, p.code AS product_code, u.name AS owner_name '
    'FROM documents d '
    'LEFT JOIN products p ON p.id = d."productId" '
    'LEFT JOIN users u ON u.id = d."ownerId" '
)


def _iso(dt) -> Optional[str]:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z") if isinstance(dt, datetime) else None


def _map_document(row: dict) -> dict:
    metadata = row.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    doc = {
        "id": str(row["id"]),
        "documentNumber": row.get("documentNumber"),
        "title": row["title"],
        "type": TYPE_TO_API.get(row["type"], "Other"),
        "status": STATUS_TO_API.get(row["status"], "Draft"),
        "version": row["version"],
        "productId": str(row["productId"]) if row.get("productId") else None,
        "productName": row.get("product_name") or row.get("product_code"),
        "submissionId": str(row["submissionId"]) if row.get("submissionId") else None,
        "ownerId": str(row["ownerId"]) if row.get("ownerId") else None,
        "ownerName": row.get("owner_name"),
        "ectdModule": row.get("ectdModule"),
        "ectdSection": row.get("ectdSection"),
        "filePath": row.get("filePath"),
        "fileSize": row.get("fileSize"),
        "mimeType": row.get("mimeType"),
        "effectiveDate": _iso(row.get("effectiveDate")),
        "expirationDate": _iso(row.get("expirationDate")),
        "wordCount": metadata.get("wordCount") or None,
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }
    return {k: v for k, v in doc.items() if v is not None}


@router.get("")
@router.get("/")
async def list_documents(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        doc_type = params.get("type")
        if doc_type and doc_type != "all":
            where.append("d.type = :type")
            args["type"] = TYPE_FROM_API.get(doc_type, "OTHER")

        status = params.get("status")
        if status and status != "all":
            where.append("d.status = :status")
            args["status"] = STATUS_FROM_API.get(status, status if status in STATUS_TO_API else "DRAFT")

        product_id = params.get("productId")
        if product_id and product_id != "all":
            where.append('d."productId" = cast(:product_id as uuid)')
            args["product_id"] = product_id

        ectd_module = params.get("ectdModule")
        if ectd_module and ectd_module != "all":
            where.append('d."ectdModule" = :ectd_module')
            args["ectd_module"] = ectd_module

        search = params.get("search")
        if search:
            where.append('(d."documentNumber" ILIKE :search OR d.title ILIKE :search)')
            args["search"] = f"%{search}%"

        sort_by = params.get("sortBy") or "createdAt"
        if sort_by not in SORTABLE:
            sort_by = "createdAt"
        sort_dir = "ASC" if (params.get("sortDir") or "desc").lower() == "asc" else "DESC"

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f'{_SELECT} WHERE {" AND ".join(where)} ORDER BY d."{sort_by}" {sort_dir}'),
                args,
            ).mappings().all()

        mapped = [_map_document(dict(r)) for r in rows]
        stats = {"total": len(mapped), "byType": {}, "byStatus": {}}
        for d in mapped:
            stats["byType"][d["type"]] = stats["byType"].get(d["type"], 0) + 1
            stats["byStatus"][d["status"]] = stats["byStatus"].get(d["status"], 0) + 1

        return JSONResponse({"data": mapped, "total": len(mapped), "stats": stats, "source": "prisma"})
    except Exception as exc:
        logger.error("Documents API error: %s", exc)
        return JSONResponse({"error": "Failed to fetch documents"}, status_code=500)


@router.post("")
@router.post("/")
async def create_document(request: Request):
    require_auth(request)
    try:
        body = await request.json()

        title = body.get("title")
        if not title or not isinstance(title, str) or not (1 <= len(title) <= 1000):
            return JSONResponse({"error": "title is required (1-1000 chars)"}, status_code=400)

        metadata = {
            "wordCount": body.get("wordCount") or 0,
            "content": body.get("content") or "",
            **(body.get("metadata") or {}),
        }

        with get_engine().begin() as conn:
            row = conn.execute(
                text(
                    'INSERT INTO documents (id, "documentNumber", title, type, status, version, '
                    '"productId", "submissionId", "ownerId", "ectdModule", "ectdSection", '
                    '"filePath", "fileSize", "mimeType", "effectiveDate", "expirationDate", '
                    'metadata, "createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :document_number, :title, :type, :status, :version, "
                    "cast(:product_id as uuid), cast(:submission_id as uuid), cast(:owner_id as uuid), "
                    ":ectd_module, :ectd_section, :file_path, :file_size, :mime_type, "
                    "cast(:effective as timestamptz), cast(:expiration as timestamptz), "
                    "cast(:metadata as jsonb), now(), now()) RETURNING id"
                ),
                {
                    "document_number": body.get("documentNumber"),
                    "title": title,
                    "type": TYPE_FROM_API.get(body.get("type"), "OTHER") if body.get("type") else "OTHER",
                    "status": STATUS_FROM_API.get(body.get("status"), "DRAFT") if body.get("status") else "DRAFT",
                    "version": body.get("version") or "1.0",
                    "product_id": body.get("productId") or None,
                    "submission_id": body.get("submissionId") or None,
                    "owner_id": body.get("ownerId") or None,
                    "ectd_module": body.get("ectdModule"),
                    "ectd_section": body.get("ectdSection"),
                    "file_path": body.get("filePath"),
                    "file_size": body.get("fileSize"),
                    "mime_type": body.get("mimeType"),
                    "effective": body.get("effectiveDate"),
                    "expiration": body.get("expirationDate"),
                    "metadata": json.dumps(metadata),
                },
            ).first()
            created = conn.execute(
                text(f"{_SELECT} WHERE d.id = :id"), {"id": str(row[0])}
            ).mappings().first()

        return JSONResponse({"data": _map_document(dict(created)), "source": "prisma"}, status_code=201)
    except Exception as exc:
        logger.error("Documents create error: %s", exc)
        message = str(exc)
        if any(t in message for t in ("connect", "ECONNREFUSED", "timeout", "pool")):
            return JSONResponse(
                {"error": "Database unavailable", "code": "DB_CONNECTION_ERROR"},
                status_code=503,
                headers={"Retry-After": "5"},
            )
        if any(t in message.lower() for t in ("constraint", "unique", "violat")):
            return JSONResponse(
                {
                    "error": "Data validation error",
                    "code": "CONSTRAINT_ERROR",
                    "message": "The provided data violates database constraints",
                },
                status_code=422,
            )
        return JSONResponse({"error": "Failed to create document", "code": "CREATE_ERROR"}, status_code=500)


@router.get("/{document_id}")
async def get_document(document_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"{_SELECT} WHERE d.id = cast(:id as uuid)"), {"id": document_id}
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "Document not found"}, status_code=404)
        doc = _map_document(dict(row))
        metadata = dict(row).get("metadata") or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        doc["content"] = metadata.get("content") or ""
        return JSONResponse({"data": doc, "source": "prisma"})
    except Exception as exc:
        logger.error("Document get error: %s", exc)
        return JSONResponse({"error": "Failed to fetch document"}, status_code=500)


@router.patch("/{document_id}")
@router.put("/{document_id}")
async def update_document(document_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            existing = conn.execute(
                text("SELECT metadata FROM documents WHERE id = cast(:id as uuid)"), {"id": document_id}
            ).mappings().first()
            if not existing:
                return JSONResponse({"error": "Document not found"}, status_code=404)

            sets = ['"updatedAt" = now()']
            args: dict = {"id": document_id}
            simple = {
                "title": "title",
                "documentNumber": '"documentNumber"',
                "version": "version",
                "ectdModule": '"ectdModule"',
                "ectdSection": '"ectdSection"',
                "filePath": '"filePath"',
                "fileSize": '"fileSize"',
                "mimeType": '"mimeType"',
            }
            for body_key, column in simple.items():
                if body_key in body:
                    sets.append(f"{column} = :{body_key}")
                    args[body_key] = body[body_key]
            if "type" in body:
                sets.append("type = :type")
                args["type"] = TYPE_FROM_API.get(body["type"], "OTHER")
            if "status" in body:
                sets.append("status = :status")
                args["status"] = STATUS_FROM_API.get(body["status"], body["status"] if body["status"] in STATUS_TO_API else "DRAFT")
            if "productId" in body:
                sets.append('"productId" = cast(:productId as uuid)')
                args["productId"] = body["productId"] or None
            if "effectiveDate" in body:
                sets.append('"effectiveDate" = cast(:effectiveDate as timestamptz)')
                args["effectiveDate"] = body["effectiveDate"]
            if "expirationDate" in body:
                sets.append('"expirationDate" = cast(:expirationDate as timestamptz)')
                args["expirationDate"] = body["expirationDate"]

            metadata = existing["metadata"] or {}
            if isinstance(metadata, str):
                metadata = json.loads(metadata)
            metadata_changed = False
            for key in ("content", "wordCount", "summary"):
                if key in body:
                    metadata[key] = body[key]
                    metadata_changed = True
            if metadata_changed:
                sets.append("metadata = cast(:metadata as jsonb)")
                args["metadata"] = json.dumps(metadata)

            conn.execute(
                text(f'UPDATE documents SET {", ".join(sets)} WHERE id = cast(:id as uuid)'), args
            )
            updated = conn.execute(
                text(f"{_SELECT} WHERE d.id = cast(:id as uuid)"), {"id": document_id}
            ).mappings().first()

        return JSONResponse({"data": _map_document(dict(updated)), "source": "prisma"})
    except Exception as exc:
        logger.error("Document update error: %s", exc)
        return JSONResponse({"error": "Failed to update document"}, status_code=500)


@router.delete("/{document_id}")
async def delete_document(document_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM documents WHERE id = cast(:id as uuid) RETURNING id"),
                {"id": document_id},
            ).first()
        if not row:
            return JSONResponse({"error": "Document not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("Document delete error: %s", exc)
        return JSONResponse({"error": "Failed to delete document"}, status_code=500)
