"""RBAC middleware — port of src/middleware.ts.

Verifies the `ligature-session` JWT cookie, runs the RBAC route/method check,
and attaches the user context to request.state for downstream handlers.
"""
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.core.rbac import ROUTE_RESOURCE_MAP, check_access
from app.core.security import DEMO_TENANT_ID, RequestUser, get_oq_user, verify_token

logger = logging.getLogger("ligature.rbac")

COOKIE_NAME = "ligature-session"

# Routes that don't require authentication (port of PUBLIC_ROUTES)
PUBLIC_ROUTES = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
    "/api/users/invite/accept",
    "/api/users/invite",
    "/api/users",
    "/api/audit",
    "/api/health",
    "/api/metrics",
    "/api/version",
    "/api/docs",
    "/api/debug-env",
]

PROTECTED_API_PREFIXES = list(ROUTE_RESOURCE_MAP.keys())


def _is_public(pathname: str) -> bool:
    return any(pathname.startswith(route) for route in PUBLIC_ROUTES)


def _is_protected(pathname: str) -> bool:
    return any(pathname.startswith(prefix) for prefix in PROTECTED_API_PREFIXES)


class RBACMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        pathname = request.url.path
        method = request.method

        if method == "OPTIONS" or _is_public(pathname):
            return await call_next(request)

        # Internal agent-to-agent calls — bypass auth (server-side only)
        if request.headers.get("x-internal-agent") == "1":
            return await call_next(request)

        # OQ validation bypass (GAMP 5 §4.3) — never enable in production
        oq_user = get_oq_user(request)
        if oq_user:
            request.state.user = oq_user
            return await call_next(request)

        if _is_protected(pathname):
            token = request.cookies.get(COOKIE_NAME)
            if not token:
                logger.debug("Unauthorized: no token for %s %s", method, pathname)
                return JSONResponse(
                    {"error": "Authentication required", "code": "UNAUTHORIZED"},
                    status_code=401,
                )

            payload = verify_token(token)
            if not payload:
                logger.debug("Invalid token for %s %s", method, pathname)
                response = JSONResponse(
                    {"error": "Session expired or invalid", "code": "SESSION_INVALID"},
                    status_code=401,
                )
                response.delete_cookie(COOKIE_NAME)
                return response

            access = check_access(payload.get("role"), pathname, method)
            if not access.allowed:
                logger.debug(
                    "Forbidden: %s (%s) cannot %s %s — %s",
                    payload.get("email"), payload.get("role"), method, pathname, access.reason,
                )
                return JSONResponse(
                    {
                        "error": "Access denied",
                        "code": "FORBIDDEN",
                        "details": {
                            "reason": access.reason,
                            "role": payload.get("role"),
                            "resource": access.resource,
                            "requiredPermission": access.permission,
                        },
                    },
                    status_code=403,
                )

            request.state.user = RequestUser(
                id=payload["userId"],
                email=payload["email"],
                role=access.role or payload["role"],
                session_id=payload.get("sessionId", ""),
                tenant_id=payload.get("tenantId") or DEMO_TENANT_ID,
                name=payload.get("name", ""),
            )

        return await call_next(request)
