"""GET /api/version — software version manifest (public, needed for IQ)."""
import platform
import time

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api/version", tags=["version"])


@router.get("")
@router.get("/")
async def version():
    settings = get_settings()
    return {
        "application": "Ligature IDOP",
        "version": settings.app_version,
        "buildId": "fastapi-migration",
        "buildDate": "2026-06-12",
        "environment": "development" if settings.is_demo_mode else "production",
        "pythonVersion": platform.python_version(),
        "framework": "FastAPI",
        "gxpValidated": True,
        "part11Enabled": True,
        "regulatoryFrameworks": ["21 CFR Part 11", "EU Annex 11", "GAMP 5", "ICH Q10"],
        "softwareCategory": "GAMP 5 Category 4",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    }
