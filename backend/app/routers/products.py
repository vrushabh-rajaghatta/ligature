"""Products API — port of src/app/api/products/{route.ts,[id]/route.ts}."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.mockdata import load_mock
from app.core.security import require_auth
from app.db import get_engine

logger = logging.getLogger("ligature.products")

router = APIRouter(prefix="/api/products", tags=["products"])

STATUS_TO_API = {
    "ACTIVE": "Active",
    "ON_HOLD": "On Hold",
    "DISCONTINUED": "Discontinued",
    "APPROVED": "Approved",
}
STATUS_FROM_API = {v: k for k, v in STATUS_TO_API.items()}

TA_TO_API = {
    "ONCOLOGY": "Oncology",
    "IMMUNOLOGY": "Immunology",
    "NEUROLOGY": "Neurology",
    "CARDIOLOGY": "Cardiology",
    "RARE_DISEASES": "Rare Disease",
    "INFECTIOUS_DISEASES": "Infectious Disease",
    "METABOLIC": "Metabolic",
    "RESPIRATORY": "Respiratory",
    "DERMATOLOGY": "Dermatology",
    "OPHTHALMOLOGY": "Ophthalmology",
    "OTHER": "Other",
}
TA_FROM_API = {v: k for k, v in TA_TO_API.items()}

SORTABLE = {"name", "code", "therapeuticArea", "phase", "status", "createdAt"}


def _iso(dt) -> str:
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    return str(dt)


def _map_product(row: dict, counts: Optional[dict] = None) -> dict:
    product = {
        "id": str(row["id"]),
        "name": row["name"],
        "code": row["code"],
        "genericName": row.get("genericName") or None,
        "brandName": row.get("brandName") or None,
        "therapeuticArea": TA_TO_API.get(row["therapeuticArea"], "Other")
        if row.get("therapeuticArea")
        else None,
        "indication": row.get("targetIndication") or None,
        "phase": row.get("phase") or None,
        "status": STATUS_TO_API.get(row["status"], "Active"),
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }
    # Drop None optionals to match `|| undefined` JSON omission semantics
    product = {k: v for k, v in product.items() if v is not None}
    if counts:
        product.update(counts)
    return product


def _mock_products_response() -> JSONResponse:
    """v0.33.18 parity: fall back to mock data when database is unavailable."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    mock = [
        {
            "id": p["id"],
            "name": p["name"],
            "code": p["name"],
            "genericName": p.get("genericName"),
            "brandName": p.get("brandName"),
            "therapeuticArea": p.get("therapeuticArea"),
            "indication": p.get("indication"),
            "phase": p.get("stage"),
            "status": "Active",
            "createdAt": now,
            "updatedAt": now,
        }
        for p in load_mock("mock")["products"]
    ]
    return JSONResponse({"data": mock, "total": len(mock), "source": "mock"})


@router.get("")
@router.get("/")
async def list_products(request: Request):
    params = request.query_params
    try:
        where = ["1=1"]
        args: dict = {}

        ta = params.get("therapeuticArea")
        if ta and ta != "all":
            where.append('"therapeuticArea" = :ta')
            args["ta"] = ta

        phase = params.get("phase")
        if phase and phase != "all":
            where.append("phase = :phase")
            args["phase"] = phase

        status = params.get("status")
        if status and status != "all":
            where.append("status = :status")
            args["status"] = STATUS_FROM_API.get(status, "ACTIVE")

        search = params.get("search")
        if search:
            where.append(
                '(name ILIKE :search OR code ILIKE :search OR '
                '"genericName" ILIKE :search OR "brandName" ILIKE :search)'
            )
            args["search"] = f"%{search}%"

        sort_by = params.get("sortBy") or "createdAt"
        if sort_by not in SORTABLE:
            sort_by = "createdAt"
        sort_dir = "ASC" if (params.get("sortDir") or "desc").lower() == "asc" else "DESC"

        include_counts = params.get("includeCounts") == "true"

        count_select = (
            ', (SELECT COUNT(*) FROM studies s WHERE s."productId" = p.id) AS study_count'
            ', (SELECT COUNT(*) FROM applications a WHERE a."productId" = p.id) AS application_count'
            ', (SELECT COUNT(*) FROM documents d WHERE d."productId" = p.id) AS document_count'
            ', (SELECT COUNT(*) FROM haqs h WHERE h."productId" = p.id) AS haq_count'
            if include_counts
            else ""
        )

        with get_engine().connect() as conn:
            rows = conn.execute(
                text(
                    f'SELECT p.*{count_select} FROM products p '
                    f'WHERE {" AND ".join(where)} ORDER BY "{sort_by}" {sort_dir}'
                ),
                args,
            ).mappings().all()

        mapped = []
        stats = {"total": len(rows), "byTherapeuticArea": {}, "byPhase": {}, "byStatus": {}}
        for r in rows:
            row = dict(r)
            counts = (
                {
                    "studyCount": row.pop("study_count", 0),
                    "applicationCount": row.pop("application_count", 0),
                    "documentCount": row.pop("document_count", 0),
                    "haqCount": row.pop("haq_count", 0),
                }
                if include_counts
                else None
            )
            mapped.append(_map_product(row, counts))
            if row.get("therapeuticArea"):
                stats["byTherapeuticArea"][row["therapeuticArea"]] = (
                    stats["byTherapeuticArea"].get(row["therapeuticArea"], 0) + 1
                )
            if row.get("phase"):
                stats["byPhase"][row["phase"]] = stats["byPhase"].get(row["phase"], 0) + 1
            api_status = STATUS_TO_API.get(row["status"], "Active")
            stats["byStatus"][api_status] = stats["byStatus"].get(api_status, 0) + 1

        return JSONResponse({"data": mapped, "total": len(mapped), "stats": stats})
    except Exception as exc:
        logger.error("Products API Error: %s", exc)
        try:
            return _mock_products_response()
        except Exception as mock_exc:
            logger.error("Mock data fallback failed: %s", mock_exc)
            return JSONResponse({"error": "Failed to fetch products"}, status_code=500)


@router.post("")
@router.post("/")
async def create_product(request: Request):
    require_auth(request)  # v0.99.1 parity
    try:
        body = await request.json()
        with get_engine().begin() as conn:
            row = conn.execute(
                text(
                    'INSERT INTO products (id, code, name, "genericName", "brandName", '
                    '"therapeuticArea", "targetIndication", phase, status, metadata, '
                    '"createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid(), :code, :name, :generic, :brand, :ta, "
                    ":indication, :phase, :status, cast(:metadata as jsonb), now(), now()) "
                    "RETURNING *"
                ),
                {
                    "code": body.get("code"),
                    "name": body.get("name"),
                    "generic": body.get("genericName"),
                    "brand": body.get("brandName"),
                    "ta": TA_FROM_API.get(body.get("therapeuticArea"), "OTHER")
                    if body.get("therapeuticArea")
                    else "OTHER",
                    "indication": body.get("indication"),
                    "phase": body.get("phase"),
                    "status": STATUS_FROM_API.get(body.get("status"), "ACTIVE")
                    if body.get("status")
                    else "ACTIVE",
                    "metadata": __import__("json").dumps(body.get("metadata") or {}),
                },
            ).mappings().first()
        return JSONResponse({"data": _map_product(dict(row))}, status_code=201)
    except Exception as exc:
        logger.error("Product Create Error: %s", exc)
        return JSONResponse({"error": "Failed to create product"}, status_code=500)


@router.get("/{product_id}")
async def get_product(product_id: str):
    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text("SELECT * FROM products WHERE id = :id"), {"id": product_id}
            ).mappings().first()
            if not row:
                return JSONResponse({"error": "Product not found"}, status_code=404)

            counts = {
                "studyCount": conn.execute(
                    text('SELECT COUNT(*) FROM studies WHERE "productId" = :id'), {"id": product_id}
                ).scalar(),
                "applicationCount": conn.execute(
                    text('SELECT COUNT(*) FROM applications WHERE "productId" = :id'),
                    {"id": product_id},
                ).scalar(),
                "documentCount": conn.execute(
                    text('SELECT COUNT(*) FROM documents WHERE "productId" = :id'),
                    {"id": product_id},
                ).scalar(),
                "haqCount": conn.execute(
                    text('SELECT COUNT(*) FROM haqs WHERE "productId" = :id'), {"id": product_id}
                ).scalar(),
            }
            studies = conn.execute(
                text(
                    'SELECT id, "studyNumber", title, status FROM studies '
                    'WHERE "productId" = :id ORDER BY "createdAt" DESC LIMIT 5'
                ),
                {"id": product_id},
            ).mappings().all()
            applications = conn.execute(
                text(
                    'SELECT id, "applicationNumber", type, status FROM applications '
                    'WHERE "productId" = :id ORDER BY "createdAt" DESC LIMIT 5'
                ),
                {"id": product_id},
            ).mappings().all()

        product = _map_product(dict(row), counts)
        product["recentStudies"] = [
            {"id": str(s["id"]), "studyNumber": s["studyNumber"], "title": s["title"], "status": s["status"]}
            for s in studies
        ]
        product["recentApplications"] = [
            {"id": str(a["id"]), "applicationNumber": a["applicationNumber"], "type": a["type"], "status": a["status"]}
            for a in applications
        ]
        return JSONResponse({"data": product})
    except Exception as exc:
        logger.error("Product Get Error: %s", exc)
        return JSONResponse({"error": "Failed to fetch product"}, status_code=500)


@router.put("/{product_id}")
async def update_product(product_id: str, request: Request):
    require_auth(request)
    try:
        body = await request.json()
        sets = ['"updatedAt" = now()']
        args: dict = {"id": product_id}
        field_map = {
            "name": "name",
            "code": "code",
            "genericName": '"genericName"',
            "brandName": '"brandName"',
            "indication": '"targetIndication"',
            "phase": "phase",
        }
        for body_key, column in field_map.items():
            if body_key in body:
                sets.append(f"{column} = :{body_key}")
                args[body_key] = body[body_key]
        if "therapeuticArea" in body:
            sets.append('"therapeuticArea" = :ta')
            args["ta"] = TA_FROM_API.get(body["therapeuticArea"], "OTHER")
        if "status" in body:
            sets.append("status = :status")
            args["status"] = STATUS_FROM_API.get(body["status"], "ACTIVE")

        with get_engine().begin() as conn:
            row = conn.execute(
                text(f'UPDATE products SET {", ".join(sets)} WHERE id = :id RETURNING *'),
                args,
            ).mappings().first()
        if not row:
            return JSONResponse({"error": "Product not found"}, status_code=404)
        return JSONResponse({"data": _map_product(dict(row))})
    except Exception as exc:
        logger.error("Product Update Error: %s", exc)
        return JSONResponse({"error": "Failed to update product"}, status_code=500)


@router.delete("/{product_id}")
async def delete_product(product_id: str, request: Request):
    require_auth(request)
    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text("DELETE FROM products WHERE id = :id RETURNING id"), {"id": product_id}
            ).first()
        if not row:
            return JSONResponse({"error": "Product not found"}, status_code=404)
        return JSONResponse({"success": True})
    except Exception as exc:
        logger.error("Product Delete Error: %s", exc)
        return JSONResponse({"error": "Failed to delete product"}, status_code=500)
