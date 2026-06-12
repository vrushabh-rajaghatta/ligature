"""Role-Based Access Control — faithful port of src/lib/rbac.ts (v0.13.21).

Part 11 compliant access control for Ligature.
"""
from dataclasses import dataclass
from typing import Optional

UserRole = str  # ADMIN | REGULATORY_AFFAIRS | MEDICAL_WRITER | QA | CLINICAL | CMC | SAFETY | USER
Permission = str  # READ | WRITE | DELETE | APPROVE | ADMIN
Resource = str

ROLE_HIERARCHY: dict[str, int] = {
    "ADMIN": 100,
    "REGULATORY_AFFAIRS": 80,
    "QA": 70,
    "SAFETY": 60,
    "CLINICAL": 60,
    "CMC": 60,
    "MEDICAL_WRITER": 50,
    "USER": 10,
}

PERMISSION_MATRIX: dict[str, dict[str, list[str]]] = {
    "ADMIN": {
        "products": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "applications": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "submissions": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "haqs": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "documents": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "studies": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "safety": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "users": ["READ", "WRITE", "DELETE", "APPROVE", "ADMIN"],
        "audit": ["READ", "ADMIN"],
        "system": ["READ", "WRITE", "ADMIN"],
    },
    "REGULATORY_AFFAIRS": {
        "products": ["READ", "WRITE"],
        "applications": ["READ", "WRITE", "DELETE", "APPROVE"],
        "submissions": ["READ", "WRITE", "DELETE", "APPROVE"],
        "haqs": ["READ", "WRITE", "DELETE", "APPROVE"],
        "documents": ["READ", "WRITE", "APPROVE"],
        "studies": ["READ"],
        "safety": ["READ"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "QA": {
        "products": ["READ"],
        "applications": ["READ"],
        "submissions": ["READ", "APPROVE"],  # QA can approve but not modify
        "haqs": ["READ"],
        "documents": ["READ", "WRITE", "APPROVE"],
        "studies": ["READ"],
        "safety": ["READ"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "SAFETY": {
        "products": ["READ"],
        "applications": ["READ"],
        "submissions": ["READ"],
        "haqs": ["READ"],
        "documents": ["READ", "WRITE"],
        "studies": ["READ"],
        "safety": ["READ", "WRITE", "DELETE", "APPROVE"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "CLINICAL": {
        "products": ["READ"],
        "applications": ["READ"],
        "submissions": ["READ"],
        "haqs": ["READ"],
        "documents": ["READ", "WRITE"],
        "studies": ["READ", "WRITE", "DELETE"],
        "safety": ["READ", "WRITE"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "CMC": {
        "products": ["READ", "WRITE"],
        "applications": ["READ"],
        "submissions": ["READ"],
        "haqs": ["READ", "WRITE"],
        "documents": ["READ", "WRITE"],
        "studies": ["READ"],
        "safety": ["READ"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "MEDICAL_WRITER": {
        "products": ["READ"],
        "applications": ["READ"],
        "submissions": ["READ"],
        "haqs": ["READ", "WRITE"],
        "documents": ["READ", "WRITE"],
        "studies": ["READ"],
        "safety": ["READ"],
        "users": ["READ"],
        "audit": ["READ"],
        "system": ["READ"],
    },
    "USER": {
        "products": ["READ"],
        "applications": ["READ"],
        "submissions": ["READ"],
        "haqs": ["READ"],
        "documents": ["READ"],
        "studies": ["READ"],
        "safety": ["READ"],
        "users": [],
        "audit": [],
        "system": ["READ"],
    },
}

ROUTE_RESOURCE_MAP: dict[str, str] = {
    "/api/products": "products",
    "/api/applications": "applications",
    "/api/submissions": "submissions",
    "/api/haqs": "haqs",
    "/api/haq": "haqs",
    "/api/documents": "documents",
    "/api/studies": "studies",
    "/api/safety": "safety",
    "/api/users": "users",
    "/api/auth/permissions": "users",
    "/api/auth/entitlements": "users",
    "/api/auth/esig-config": "users",
    "/api/auth/part11": "users",
    "/api/auth/mfa": "users",
    "/api/auth/mfa-config": "users",
    "/api/auth/mfa-status": "users",
    "/api/auth/audit-events": "audit",
    "/api/auth/audit-log": "audit",
    "/api/auth/login-audit": "audit",
    "/api/auth/session-policy": "users",
    "/api/audit": "audit",
    "/api/upload": "documents",
    "/api/system": "system",
    "/api/admin": "system",
    "/api/agents": "documents",
    "/api/ai": "documents",
    "/api/rag": "documents",
    "/api/authoring": "documents",
    "/api/document-control": "documents",
    "/api/tmf": "documents",
    "/api/ctms": "studies",
    "/api/qms": "documents",
    "/api/eln": "documents",
    "/api/glp": "documents",
    "/api/research": "documents",
    "/api/usdm": "studies",
    "/api/idmp": "products",
    "/api/spl": "documents",
    "/api/stability": "documents",
    "/api/signatures": "audit",
    "/api/gateways": "submissions",
    "/api/cross-module": "documents",
    "/api/collaboration": "documents",
    "/api/smart-submissions": "submissions",
    "/api/adam": "documents",
    "/api/define-xml": "documents",
    "/api/cdisc-terminology": "documents",
}

METHOD_PERMISSION_MAP: dict[str, str] = {
    "GET": "READ",
    "POST": "WRITE",
    "PUT": "WRITE",
    "PATCH": "WRITE",
    "DELETE": "DELETE",
}

ROLE_NORMALIZE_MAP: dict[str, str] = {
    "admin": "ADMIN",
    "regulatory-affairs": "REGULATORY_AFFAIRS",
    "regulatory_affairs": "REGULATORY_AFFAIRS",
    "regulatory_lead": "REGULATORY_AFFAIRS",
    "regulatory-lead": "REGULATORY_AFFAIRS",
    "medical-writer": "MEDICAL_WRITER",
    "medical_writer": "MEDICAL_WRITER",
    "reviewer": "USER",
    "safety-officer": "SAFETY",
    "safety_officer": "SAFETY",
    "clinical-ops": "CLINICAL",
    "clinical_ops": "CLINICAL",
    "qa": "QA",
    "cmc": "CMC",
    "user": "USER",
}


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    if role in ROLE_HIERARCHY:
        return role
    return ROLE_NORMALIZE_MAP.get(role.lower())


def has_permission(role: str, resource: str, permission: str) -> bool:
    return permission in PERMISSION_MATRIX.get(role, {}).get(resource, [])


def get_resource_from_route(route_path: str) -> Optional[str]:
    normalized = route_path.split("?")[0].rstrip("/") or route_path
    if normalized in ROUTE_RESOURCE_MAP:
        return ROUTE_RESOURCE_MAP[normalized]
    for route, resource in ROUTE_RESOURCE_MAP.items():
        if normalized.startswith(route):
            return resource
    return None


def is_role_at_least(role: str, minimum_role: str) -> bool:
    return ROLE_HIERARCHY.get(role, 0) >= ROLE_HIERARCHY.get(minimum_role, 0)


@dataclass
class RBACCheckResult:
    allowed: bool
    reason: Optional[str] = None
    role: Optional[str] = None
    resource: Optional[str] = None
    permission: Optional[str] = None


def check_access(role: Optional[str], route_path: str, method: str) -> RBACCheckResult:
    """Complete RBAC check — port of checkAccess() in rbac.ts."""
    if not role:
        return RBACCheckResult(allowed=False, reason="Authentication required")

    effective_role = normalize_role(role)
    if not effective_role:
        return RBACCheckResult(allowed=False, reason=f"Invalid role: {role}", role=role)

    resource = get_resource_from_route(route_path)
    if not resource:
        return RBACCheckResult(
            allowed=False,
            reason=f"Route not mapped to resource: {route_path}",
            role=effective_role,
        )

    permission = METHOD_PERMISSION_MAP.get(method.upper())
    if not permission:
        return RBACCheckResult(
            allowed=False,
            reason=f"Unknown HTTP method: {method}",
            role=effective_role,
            resource=resource,
        )

    allowed = has_permission(effective_role, resource, permission)
    return RBACCheckResult(
        allowed=allowed,
        reason=None if allowed else f"Role {effective_role} does not have {permission} permission on {resource}",
        role=effective_role,
        resource=resource,
        permission=permission,
    )
