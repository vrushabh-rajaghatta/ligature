"""AI API — port of src/app/api/ai/* routes.

generate: live Anthropic call (503 demo error when no key, matching the Next
route). The remaining GET routes return the same static GxP/validation
manifests the Next routes did. Heavy generators (haq-rag, section-generate,
batch-section, document-qc, safety-intelligence) live in ai_generators.py.
"""
import logging
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.rate_limiter import (
    AI_RATE_LIMITS,
    check_rate_limit,
    rate_limit_body,
    rate_limit_headers,
)
from app.core.security import require_auth
from app.services import ai_service

logger = logging.getLogger("ligature.ai")

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())


# ── /api/ai/generate ─────────────────────────────────────────────────────────


@router.post("/generate")
async def generate(request: Request):
    require_auth(request)
    rl = check_rate_limit(request, AI_RATE_LIMITS["standard"])
    if not rl.allowed:
        return JSONResponse(
            rate_limit_body(rl), status_code=429, headers=rate_limit_headers(rl, AI_RATE_LIMITS["standard"])
        )

    if not ai_service.get_api_key():
        return JSONResponse(
            {
                "error": "API key not configured",
                "message": "Please add ANTHROPIC_API_KEY to your environment variables",
                "demo": True,
            },
            status_code=503,
        )

    body = await request.json()
    prompt = body.get("prompt")
    if not prompt:
        return JSONResponse({"error": "Prompt is required"}, status_code=400)

    gen_type = body.get("type", "general")
    context = body.get("context", "")
    max_tokens = body.get("maxTokens", 2000)
    temperature = body.get("temperature", 0.7)
    do_stream = body.get("stream", False)

    system_prompt = ai_service.SYSTEM_PROMPTS.get(gen_type, ai_service.SYSTEM_PROMPTS["general"])
    full_prompt = f"{prompt}\n\nContext:\n{context}" if context else prompt

    try:
        if do_stream:
            return StreamingResponse(
                ai_service.stream(prompt=full_prompt, system=system_prompt, max_tokens=max_tokens),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
            )
        data = await ai_service.generate(
            prompt=full_prompt, system=system_prompt, max_tokens=max_tokens, temperature=temperature
        )
        content = ""
        if data.get("content"):
            content = data["content"][0].get("text", "")
        return JSONResponse(
            {
                "content": content,
                "usage": data.get("usage"),
                "model": data.get("model"),
                "stopReason": data.get("stop_reason"),
            }
        )
    except Exception as exc:
        logger.error("AI generation error: %s", exc)
        return JSONResponse(
            {"error": "AI generation failed", "details": str(exc)}, status_code=502
        )


@router.get("/generate")
async def generate_status():
    configured = bool(ai_service.get_api_key())
    return {
        "status": "configured" if configured else "not_configured",
        "message": "AI service ready - ANTHROPIC_API_KEY is configured"
        if configured
        else "AI service offline - Add ANTHROPIC_API_KEY to enable live generation",
        "model": "claude-sonnet-4-6",
        "capabilities": [
            "haq-response", "safety-narrative", "document-section", "signal-summary",
            "document-qc", "labeling", "protocol-authoring",
        ],
    }


# ── /api/ai/health ───────────────────────────────────────────────────────────


@router.get("/health")
async def health():
    configured = bool(ai_service.get_api_key())
    services = {
        "rag": {"available": True},
        "pdf": {"available": True},
        "trackChanges": {"available": True},
        "structuredContent": {"available": True},
    }
    return {
        "status": "ok" if configured else "degraded",
        "timestamp": _now_iso(),
        "provider": "anthropic" if configured else "demo",
        "modelsAvailable": [
            {"modelId": "claude-sonnet-4-20250514", "provider": "Anthropic", "status": "AVAILABLE", "purpose": "Primary regulatory drafting & HAQ response"},
            {"modelId": "claude-opus-4-6", "provider": "Anthropic", "status": "AVAILABLE", "purpose": "Complex multi-section synthesis"},
            {"modelId": "claude-haiku-4-5-20251001", "provider": "Anthropic", "status": "AVAILABLE", "purpose": "Fast classification & compliance filter"},
        ],
        "inferenceLatencyMs": {
            "p50": 820, "p95": 2100, "p99": 4800,
            "lastMeasured": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() - 60)),
            "slaTargetMs": 5000, "slaStatus": "WITHIN_SLA",
        },
        "services": services,
    }


# ── /api/ai/usage ────────────────────────────────────────────────────────────


@router.get("/usage")
async def usage(request: Request):
    require_auth(request)
    return {
        "period": "Q1 2026 (2026-01-01 to 2026-03-31)",
        "totalTokens": 48_750_000,
        "estimatedCost": 1462.50,
        "currency": "USD",
        "byModel": [
            {"modelId": "MDL-001", "model": "claude-sonnet-4-20250514", "tokens": 42_000_000, "cost": 1260.00, "pct": 0.86},
            {"modelId": "MDL-002", "model": "text-embedding-3-large", "tokens": 6_750_000, "cost": 202.50, "pct": 0.14},
        ],
        "byUser": [
            {"userId": "user-001", "email": "ra.lead@ligaturerd.io", "tokens": 18_200_000, "pct": 0.37},
            {"userId": "user-002", "email": "safety.lead@ligaturerd.io", "tokens": 12_400_000, "pct": 0.25},
        ],
        "byModule": [
            {"module": "HAQ", "tokens": 15_000_000, "pct": 0.31},
            {"module": "AUTHORING", "tokens": 12_500_000, "pct": 0.26},
            {"module": "SAFETY", "tokens": 11_000_000, "pct": 0.23},
        ],
        "timestamp": _now_iso(),
    }


# ── /api/ai/models ───────────────────────────────────────────────────────────


@router.get("/models")
async def models(request: Request):
    require_auth(request)
    return {
        "models": [
            {"modelId": "MDL-001", "name": "claude-sonnet-4-20250514", "vendor": "Anthropic", "version": "claude-sonnet-4-20250514", "purpose": "Document drafting, HAQ response, regulatory intelligence", "validationStatus": "VALIDATED", "validationDate": "2026-01-15", "gxpCategory": "GAMP 5 Cat 4", "intendedUse": "Non-autonomous drafting assistance with human review", "humanReviewRequired": True},
            {"modelId": "MDL-002", "name": "text-embedding-3-large", "vendor": "OpenAI", "version": "text-embedding-3-large", "purpose": "RAG knowledge base embeddings — semantic retrieval", "validationStatus": "VALIDATED", "validationDate": "2026-01-15", "gxpCategory": "GAMP 5 Cat 3", "intendedUse": "Document chunk embedding for retrieval pipeline", "humanReviewRequired": False},
            {"modelId": "MDL-003", "name": "Signal Detection Algorithm v3.2", "vendor": "Ligature Internal", "version": "3.2.1", "purpose": "Pharmacovigilance signal detection — PRR/ROR/EBGM", "validationStatus": "VALIDATED", "validationDate": "2025-11-01", "gxpCategory": "GAMP 5 Cat 5", "intendedUse": "Safety signal generation with SME review gate", "humanReviewRequired": True},
        ],
        "total": 3,
        "modelId": "MDL-001",
        "version": "claude-sonnet-4-20250514",
        "purpose": "Regulatory AI assistance platform",
        "validationStatus": ["VALIDATED", "IN_VALIDATION", "RETIRED"],
        "validationDate": "2026-01-15",
        "timestamp": _now_iso(),
    }


# ── /api/ai/prompts ──────────────────────────────────────────────────────────


@router.get("/prompts")
async def prompts(request: Request):
    require_auth(request)
    return {
        "templates": [
            {"id": "TMPL-001", "name": "HAQ Response Drafting", "purpose": "Draft regulatory authority question responses per ICH M4/Q12", "version": "2.1", "approvalStatus": "APPROVED", "validatedBy": "RA Lead", "validationDate": "2026-01-20", "gxpRisk": "HIGH", "humanReviewRequired": True, "outputType": "Draft document — human review mandatory"},
            {"id": "TMPL-002", "name": "Safety Narrative Generation", "purpose": "Generate CIOMS I narrative for ICSR per ICH E2B(R3)", "version": "1.3", "approvalStatus": "APPROVED", "validatedBy": "Safety Lead", "validationDate": "2026-02-01", "gxpRisk": "HIGH", "humanReviewRequired": True, "outputType": "Safety narrative — medically qualified review mandatory"},
            {"id": "TMPL-003", "name": "Clinical Overview Drafting", "purpose": "Section drafting for CTD Module 2.5 clinical overview", "version": "1.0", "approvalStatus": "IN_REVIEW", "validatedBy": None, "validationDate": None, "gxpRisk": "MEDIUM", "humanReviewRequired": True, "outputType": "CTD section draft — author review and sign-off required"},
        ],
        "total": 3,
        "name": "HAQ Response Drafting",
        "purpose": "GxP-validated prompt templates for regulatory AI assistance",
        "version": "2.1",
        "approvalStatus": ["APPROVED", "IN_REVIEW", "REJECTED"],
        "validatedBy": "RA Lead",
        "timestamp": _now_iso(),
    }


# ── /api/ai/inference ────────────────────────────────────────────────────────


@router.post("/inference")
async def inference(request: Request):
    require_auth(request)
    return {
        "response": "ICH E6(R2) (Good Clinical Practice) establishes the international standard for clinical trial conduct, data integrity, and subject protection to ensure that the rights, safety, and well-being of trial subjects are protected and that clinical trial data are credible.",
        "model": "claude-sonnet-4-20250514",
        "tokens": {"input": 18, "output": 52, "total": 70},
        "latencyMs": 847,
        "requestId": f"INF-{int(time.time() * 1000)}",
        "complianceChecks": {"piiDetected": False, "toxicityScore": 0.00, "regulatoryContent": True, "auditLogged": True},
        "timestamp": _now_iso(),
    }


# ── /api/ai/compliance-filter ────────────────────────────────────────────────


@router.get("/compliance-filter")
async def compliance_filter(request: Request):
    require_auth(request)
    return {
        "enabled": True,
        "filterRules": [
            {"ruleId": "FILT-001", "name": "PII Detection", "description": "Detect and redact personally identifiable information per GDPR/HIPAA", "enabled": True, "action": "REDACT"},
            {"ruleId": "FILT-002", "name": "Patient Data Filter", "description": "Prevent patient-level data from being included in AI prompts", "enabled": True, "action": "BLOCK"},
            {"ruleId": "FILT-003", "name": "Competitive Intelligence Filter", "description": "Flag competitor product mentions in regulatory documents", "enabled": True, "action": "FLAG_FOR_REVIEW"},
            {"ruleId": "FILT-004", "name": "Hallucination Detection", "description": "Cross-reference citations against RAG knowledge base", "enabled": True, "action": "FLAG_FOR_REVIEW"},
        ],
        "piiDetection": {"enabled": True, "provider": "Internal NER Model", "sensitivity": "HIGH", "redactionStrategy": "TOKEN_REPLACEMENT"},
        "toxicityThreshold": 0.05,
        "auditLogged": True,
        "lastUpdated": "2026-01-15",
        "timestamp": _now_iso(),
    }


# ── /api/ai/validation-docs ──────────────────────────────────────────────────


@router.get("/validation-docs")
async def validation_docs(request: Request):
    require_auth(request)
    return {
        "validationPlan": "VPL-AI-001 — AI/ML Validation Plan v1.0 — APPROVED",
        "validationPlanDetail": {"id": "VPL-AI-001", "title": "Ligature IDOP AI/ML System Validation Plan", "version": "1.0", "status": "APPROVED", "approvedBy": "Head of Quality", "approvedDate": "2025-12-01"},
        "testResults": "VTR-AI-001 — 48 tests — 47 PASS — APPROVED",
        "testResultsDetail": {"id": "VTR-AI-001", "title": "AI/ML System Validation Test Results", "version": "1.0", "status": "APPROVED", "testsExecuted": 48, "testsPassed": 47, "testsFailed": 1, "failureResolved": True},
        "riskAssessment": "VRA-AI-001 — GAMP 5 Cat 4/5 — residual risk LOW",
        "riskAssessmentDetail": {"id": "VRA-AI-001", "title": "AI/ML System Risk Assessment per ICH Q9", "version": "1.0", "status": "APPROVED", "gxpCategory": "GAMP 5 Category 4/5", "overallRisk": "MEDIUM", "residualRisk": "LOW"},
        "approvedBy": "Head of Quality",
        "approvalDate": "2026-01-15",
        "nextReviewDate": "2027-01-15",
        "gamp5Category": "Category 4/5 — Configured and Bespoke Software",
        "timestamp": _now_iso(),
    }


# ── /api/ai/rag/retrieve ─────────────────────────────────────────────────────


@router.post("/rag/retrieve")
async def rag_retrieve(request: Request):
    require_auth(request)
    return {
        "results": [
            {"chunkId": "CHK-001-P4", "source": "21 CFR Part 11 — Electronic Records and Electronic Signatures", "score": 0.94, "relevantText": "21 CFR Part 11 specifies that electronic records and electronic signatures must meet the same standards as handwritten signatures on paper records...", "citation": "21 CFR §11.3(b)(7) — Definition of electronic signature", "pageNumber": 4, "documentId": "DOC-21CFR11"},
            {"chunkId": "CHK-002-P12", "source": "FDA Guidance — Part 11 Electronic Records Scope and Application (2003)", "score": 0.89, "relevantText": "The agency considers Part 11 to apply to records in electronic form that are created, modified, maintained, archived, retrieved, or transmitted under any records requirements set forth in agency regulations...", "citation": "FDA Guidance Aug 2003 §IV.A", "pageNumber": 12, "documentId": "DOC-FDA-PART11-GUIDANCE"},
        ],
        "total": 2,
        "score": 0.94,
        "source": "21 CFR Part 11",
        "chunkId": "CHK-001-P4",
        "citation": "21 CFR §11.3(b)(7)",
        "timestamp": _now_iso(),
    }
