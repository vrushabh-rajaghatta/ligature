"""User authentication against the Prisma-managed `users` table.

Port of src/lib/auth-db.ts: bcrypt verification, account lockout after 5
failed attempts (30 min), and the dev fallback users when the DB is down.
Column names are camelCase because Prisma maps fields verbatim.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from sqlalchemy import text

from app.db import get_engine

logger = logging.getLogger("ligature.authdb")

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

# Ligature2026! — same hash as src/lib/auth-db.ts FALLBACK_USERS
_FALLBACK_HASH = "$2b$12$5GPvYPDC3G2nko.wMUHdt.U6gV1bRb2iz5TcZrMd9uUOkdXgRBDju"

FALLBACK_USERS = [
    {
        "id": "fallback-sarah",
        "email": "sarah.chen@ligaturerd.io",
        "name": "Sarah Chen",
        "passwordHash": _FALLBACK_HASH,
        "role": "REGULATORY_LEAD",
        "department": "Regulatory Affairs",
        "title": "VP, Regulatory Strategy",
        "isActive": True,
        "mustChangePassword": False,
    },
    {
        "id": "fallback-admin",
        "email": "admin@ligaturerd.io",
        "name": "Admin User",
        "passwordHash": _FALLBACK_HASH,
        "role": "ADMIN",
        "department": "IT",
        "title": "System Administrator",
        "isActive": True,
        "mustChangePassword": False,
    },
]

_USER_COLUMNS = (
    'id, email, name, role, department, title, "isActive", '
    '"mustChangePassword", "tenantId"'
)


@dataclass
class ValidateResult:
    success: bool
    user: Optional[dict] = None
    error: Optional[dict] = field(default=None)


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def _public_user(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "department": row.get("department"),
        "title": row.get("title"),
        "isActive": row["isActive"],
        "mustChangePassword": row["mustChangePassword"],
        "tenantId": str(row["tenantId"]) if row.get("tenantId") else None,
    }


def _try_fallback_auth(email: str, password: str) -> ValidateResult:
    user = next((u for u in FALLBACK_USERS if u["email"].lower() == email.lower()), None)
    if not user or not _verify_password(password, user["passwordHash"]):
        return ValidateResult(
            success=False,
            error={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"},
        )
    public = {k: v for k, v in user.items() if k != "passwordHash"}
    return ValidateResult(success=True, user=public)


def find_user_by_id(user_id: str) -> Optional[dict]:
    if user_id.startswith("fallback-"):
        user = next((u for u in FALLBACK_USERS if u["id"] == user_id), None)
        return {k: v for k, v in user.items() if k != "passwordHash"} if user else None

    try:
        with get_engine().connect() as conn:
            row = conn.execute(
                text(f"SELECT {_USER_COLUMNS} FROM users WHERE id = :id"),
                {"id": user_id},
            ).mappings().first()
        return _public_user(dict(row)) if row else None
    except Exception as exc:
        logger.error("Database error finding user by ID, trying fallback: %s", exc)
        user = next((u for u in FALLBACK_USERS if u["id"] == user_id), None)
        return {k: v for k, v in user.items() if k != "passwordHash"} if user else None


def validate_credentials(email: str, password: str) -> ValidateResult:
    try:
        engine = get_engine()
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    f'SELECT {_USER_COLUMNS}, "passwordHash", "failedLoginAttempts", '
                    f'"lockedUntil" FROM users WHERE lower(email) = lower(:email) LIMIT 1'
                ),
                {"email": email},
            ).mappings().first()
    except Exception as exc:
        logger.error("Database error during login, trying fallback: %s", exc)
        return _try_fallback_auth(email, password)

    if not row:
        logger.debug("User not found in DB, trying fallback")
        return _try_fallback_auth(email, password)

    user = dict(row)
    now = datetime.now(timezone.utc)

    if not user["isActive"]:
        return ValidateResult(
            success=False,
            error={"code": "ACCOUNT_INACTIVE", "message": "This account has been deactivated"},
        )

    locked_until = user.get("lockedUntil")
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and now < locked_until:
        return ValidateResult(
            success=False,
            error={
                "code": "ACCOUNT_LOCKED",
                "message": f"Account is temporarily locked. Try again at {locked_until.strftime('%H:%M:%S')}",
                "lockedUntil": locked_until.isoformat(),
            },
        )

    with get_engine().begin() as conn:
        if locked_until and now >= locked_until:
            conn.execute(
                text('UPDATE users SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 WHERE id = :id'),
                {"id": user["id"]},
            )

        if not user.get("passwordHash"):
            return ValidateResult(
                success=False,
                error={
                    "code": "INVALID_CREDENTIALS",
                    "message": "Password not set. Please contact administrator.",
                },
            )

        if not _verify_password(password, user["passwordHash"]):
            attempts = user["failedLoginAttempts"] + 1
            if attempts >= MAX_FAILED_ATTEMPTS:
                lockout_end = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                conn.execute(
                    text(
                        'UPDATE users SET "failedLoginAttempts" = :attempts, '
                        '"lockedUntil" = :locked WHERE id = :id'
                    ),
                    {"attempts": attempts, "locked": lockout_end, "id": user["id"]},
                )
            else:
                conn.execute(
                    text('UPDATE users SET "failedLoginAttempts" = :attempts WHERE id = :id'),
                    {"attempts": attempts, "id": user["id"]},
                )
            remaining = MAX_FAILED_ATTEMPTS - attempts
            return ValidateResult(
                success=False,
                error={
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password",
                    "attemptsRemaining": max(remaining, 0),
                },
            )

        # Success — reset counters, stamp last login
        conn.execute(
            text(
                'UPDATE users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL, '
                '"lastLogin" = :now WHERE id = :id'
            ),
            {"now": now, "id": user["id"]},
        )

    return ValidateResult(success=True, user=_public_user(user))
