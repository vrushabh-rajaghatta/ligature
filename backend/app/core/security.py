"""JWT creation/verification and request-user extraction.

Port of src/lib/jwt.ts + src/lib/api-auth.ts. Same HS256 tokens, same claims
(userId, email, role, name, sessionId, tenantId, appVersion), same
`ligature-session` cookie — existing sessions keep working.
"""
import time
import uuid
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Request
from jose import JWTError, jwt

from app.config import get_settings
from app.core.rbac import has_permission

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"

OQ_USER_HEADERS = {
    "id": "oq-validation-agent-v5",
    "email": "oq@ligaturerd.io",
    "role": "admin",
    "session_id": "oq-bypass-session-v5",
}


@dataclass
class RequestUser:
    id: str
    email: str
    role: str
    session_id: str
    tenant_id: str
    name: str = ""


def create_token(
    *,
    user_id: str,
    email: str,
    role: str,
    name: str,
    session_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    app_version: Optional[str] = None,
) -> str:
    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET required")
    now = int(time.time())
    payload = {
        "userId": user_id,
        "email": email,
        "role": role,
        "name": name,
        "sessionId": session_id or f"session-{uuid.uuid4().hex[:12]}",
        "tenantId": tenant_id or DEMO_TENANT_ID,
        "appVersion": app_version or settings.app_version,
        "iat": now,
        "exp": now + settings.session_max_age_seconds,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> Optional[dict]:
    """Returns the decoded payload, or None if invalid/expired."""
    settings = get_settings()
    if not settings.jwt_secret:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except JWTError:
        return None
    if not payload.get("userId") or not payload.get("email") or not payload.get("role"):
        return None
    return payload


def get_oq_user(request: Request) -> Optional[RequestUser]:
    """OQ validation bypass (GAMP 5 §4.3) — port of getOqUser()."""
    settings = get_settings()
    if not (settings.oq_mode_enabled and settings.oq_bypass_token):
        return None
    if request.headers.get("x-oq-token") != settings.oq_bypass_token:
        return None
    return RequestUser(
        id=OQ_USER_HEADERS["id"],
        email=OQ_USER_HEADERS["email"],
        role="admin",
        session_id=OQ_USER_HEADERS["session_id"],
        tenant_id=DEMO_TENANT_ID,
    )


def get_request_user(request: Request) -> Optional[RequestUser]:
    """User context placed on request.state by the RBAC middleware."""
    oq_user = get_oq_user(request)
    if oq_user:
        return oq_user
    return getattr(request.state, "user", None)


def require_auth(request: Request) -> RequestUser:
    user = get_request_user(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"error": "Authentication required", "code": "UNAUTHORIZED"},
        )
    return user


def require_permission(request: Request, resource: str, permission: str) -> RequestUser:
    user = require_auth(request)
    if not has_permission(user.role, resource, permission):
        raise HTTPException(
            status_code=403,
            detail={
                "error": f"Permission denied: {user.role} cannot {permission} {resource}",
                "code": "FORBIDDEN",
            },
        )
    return user


def require_role(request: Request, *roles: str) -> RequestUser:
    user = require_auth(request)
    if user.role not in roles:
        raise HTTPException(
            status_code=403,
            detail={
                "error": f"Role not authorized: {user.role} is not in [{', '.join(roles)}]",
                "code": "FORBIDDEN",
            },
        )
    return user
