"""Auth routes — port of src/app/api/auth/{login,logout,session}/route.ts.

Demo mode (DEMO_MODE=true or no DATABASE_URL) matches the Next.js behavior:
known demo credentials or any email + password >= 8 chars succeed.
"""
import time
from typing import Optional

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.security import DEMO_TENANT_ID, create_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "ligature-session"

DEMO_LOGIN_USER = {
    "id": "demo-sean",
    "email": "sean@ligaturerd.io",
    "name": "Sean McNiff",
    "role": "REGULATORY_LEAD",
    "department": "Regulatory Affairs",
    "title": "Founder & CEO",
    "mustChangePassword": False,
}

DEMO_SESSION_USER = {
    "id": "demo-sarah",
    "email": "sarah.chen@ligaturerd.io",
    "name": "Sarah Chen",
    "role": "REGULATORY_LEAD",
    "department": "Regulatory Affairs",
    "title": "VP, Regulatory Strategy",
    "mustChangePassword": False,
}

DEMO_CREDENTIALS = [
    {"email": "sarah.chen@ligaturerd.io", "password": "Ligature2026!"},
    {"email": "admin@ligaturerd.io", "password": "Ligature2026!"},
]

DEMO_SESSION_HOURS = 8


def _set_session_cookie(response: Response, token: str, max_age: int) -> None:
    settings = get_settings()
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=not settings.app_url.startswith("http://localhost"),
        samesite="lax",
        path="/",
        max_age=max_age,
    )


def _expires_at(hours: int = DEMO_SESSION_HOURS) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + hours * 3600))


@router.post("/login")
async def login(request: Request):
    settings = get_settings()
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    email: Optional[str] = body.get("email")
    password: Optional[str] = body.get("password")

    if settings.is_demo_mode:
        is_demo_credential = any(
            c["email"] == email and c["password"] == password for c in DEMO_CREDENTIALS
        )
        is_valid = not email or is_demo_credential or (email and password and len(password) >= 8)
        if not is_valid:
            return JSONResponse(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Password must be at least 8 characters.",
                    },
                },
                status_code=401,
            )

        if not email or is_demo_credential:
            login_user = dict(DEMO_LOGIN_USER)
        else:
            name = " ".join(
                part.capitalize()
                for part in email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").split()
            ) or "Demo User"
            login_user = {
                "id": f"user-{int(time.time() * 1000)}",
                "email": email,
                "name": name,
                "role": "reviewer",
                "department": "Regulatory Affairs",
                "title": "",
                "mustChangePassword": False,
            }

        session_id = f"session-{int(time.time() * 1000)}"
        token = create_token(
            user_id=login_user["id"],
            email=login_user["email"],
            role=login_user["role"],
            name=login_user["name"],
            session_id=session_id,
            tenant_id=DEMO_TENANT_ID,
        )
        response = JSONResponse(
            {
                "success": True,
                "user": login_user,
                "session": {"id": session_id, "expiresAt": _expires_at()},
                "_demo": True,
            }
        )
        _set_session_cookie(response, token, DEMO_SESSION_HOURS * 3600)
        return response

    # PRODUCTION: real database auth
    from app.services.auth_db import validate_credentials

    if not email or not password:
        return JSONResponse(
            {
                "success": False,
                "error": {"code": "INVALID_INPUT", "message": "Email and password are required"},
            },
            status_code=400,
        )

    result = validate_credentials(email, password)
    if not result.success or not result.user:
        return JSONResponse(
            {
                "success": False,
                "error": result.error
                or {"code": "INVALID_CREDENTIALS", "message": "Invalid credentials"},
            },
            status_code=401,
        )

    user = result.user
    session_id = f"session-{int(time.time() * 1000)}"
    token = create_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        name=user["name"],
        session_id=session_id,
        tenant_id=user.get("tenantId") or DEMO_TENANT_ID,
    )
    response = JSONResponse(
        {
            "success": True,
            "user": user,
            "session": {"id": session_id, "expiresAt": _expires_at()},
        }
    )
    _set_session_cookie(response, token, DEMO_SESSION_HOURS * 3600)
    return response


@router.post("/logout")
async def logout(request: Request):
    response = JSONResponse({"success": True, "message": "Logged out successfully"})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


@router.get("/session")
async def session(request: Request):
    settings = get_settings()
    token = request.cookies.get(COOKIE_NAME)

    if settings.is_demo_mode:
        if token:
            payload = verify_token(token)
            if payload:
                return JSONResponse(
                    {
                        "authenticated": True,
                        "user": {
                            "id": payload["userId"],
                            "email": payload["email"],
                            "name": payload.get("name", ""),
                            "role": payload["role"],
                            "department": "Regulatory Affairs",
                            "title": "",
                            "mustChangePassword": False,
                        },
                        "session": {
                            "id": payload.get("sessionId"),
                            "expiresAt": time.strftime(
                                "%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(payload["exp"])
                            )
                            if payload.get("exp")
                            else _expires_at(),
                            "refreshed": False,
                        },
                        "_demo": True,
                    }
                )

        # No valid token — create a default demo session
        new_token = create_token(
            user_id=DEMO_SESSION_USER["id"],
            email=DEMO_SESSION_USER["email"],
            role=DEMO_SESSION_USER["role"],
            name=DEMO_SESSION_USER["name"],
            session_id=f"demo-session-{int(time.time() * 1000)}",
        )
        response = JSONResponse(
            {
                "authenticated": True,
                "role": DEMO_SESSION_USER["role"],
                "expiration": _expires_at(),
                "user": DEMO_SESSION_USER,
                "session": {
                    "id": "demo-session",
                    "expiresAt": _expires_at(),
                    "refreshed": False,
                    "timeoutMinutes": 30,
                    "idleTimeoutMinutes": 15,
                    "part11Session": True,
                },
                "rbac": {
                    "role": DEMO_SESSION_USER["role"],
                    "accessControlEnabled": True,
                    "leastPrivilegeEnforced": True,
                },
                "part11": {
                    "auditTrailActive": True,
                    "electronicSignaturesEnabled": True,
                    "sessionLogged": True,
                },
                "_demo": True,
            }
        )
        _set_session_cookie(response, new_token, DEMO_SESSION_HOURS * 3600)
        return response

    # PRODUCTION: validate JWT, fall back to payload if DB unreachable
    if not token:
        return JSONResponse({"authenticated": False, "user": None, "session": None})

    payload = verify_token(token)
    if not payload:
        return JSONResponse(
            {"authenticated": False, "user": None, "session": None, "error": "Invalid session"}
        )

    db_user = None
    try:
        from app.services.auth_db import find_user_by_id

        db_user = find_user_by_id(payload["userId"])
    except Exception:
        pass  # DB unreachable — use JWT payload below

    user = (
        {
            "id": db_user["id"],
            "email": db_user["email"],
            "name": db_user["name"],
            "role": db_user["role"],
            "department": db_user.get("department"),
            "title": db_user.get("title"),
            "mustChangePassword": db_user.get("mustChangePassword", False),
        }
        if db_user and db_user.get("isActive")
        else {
            "id": payload["userId"],
            "email": payload["email"],
            "name": payload.get("name", ""),
            "role": payload["role"],
            "department": None,
            "title": None,
            "mustChangePassword": False,
        }
    )

    return JSONResponse(
        {
            "authenticated": True,
            "user": user,
            "session": {
                "id": payload.get("sessionId"),
                "expiresAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(payload["exp"]))
                if payload.get("exp")
                else _expires_at(),
                "refreshed": False,
            },
        }
    )
