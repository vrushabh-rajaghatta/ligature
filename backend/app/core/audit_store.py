"""In-memory hash-chained audit store — port of src/lib/audit-store.ts.

SHA-256 chain (prevHash + canonical payload) with the same four seed entries.
"""
import hashlib
import json
import random
import string
import time
from datetime import datetime, timedelta, timezone

GENESIS_HASH = "0" * 64
MAX_ENTRIES = 500

_store: list[dict] = []
_head_hash = GENESIS_HASH
_chain_counter = 0


def _now_iso(offset_hours: float = 0) -> str:
    dt = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _compute_chain_hash(prev_hash: str, entry: dict) -> str:
    canonical = json.dumps(
        {
            "id": entry["id"],
            "timestamp": entry["timestamp"],
            "user": entry["user"],
            "email": entry["email"],
            "action": entry["action"],
            "module": entry["module"],
            "details": entry["details"],
            "type": entry["type"],
        },
        separators=(",", ":"),
    )
    return hashlib.sha256((prev_hash + canonical).encode()).hexdigest()


def add_audit_entry(*, user: str, email: str, action: str, module: str, details: str, type: str) -> dict:
    global _head_hash, _chain_counter
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    entry = {
        "id": f"evt-{int(time.time() * 1000)}-{suffix}",
        "timestamp": _now_iso(),
        "user": user,
        "email": email,
        "action": action,
        "module": module,
        "details": details,
        "type": type,
    }
    entry["prevHash"] = _head_hash
    entry["chainHash"] = _compute_chain_hash(_head_hash, entry)
    entry["chainIndex"] = _chain_counter
    _head_hash = entry["chainHash"]
    _chain_counter += 1
    _store.insert(0, entry)  # newest first for display
    del _store[MAX_ENTRIES:]
    return entry


def get_audit_entries(limit: int = 50) -> list[dict]:
    return _store[:limit]


def get_audit_count() -> int:
    return len(_store)


def verify_audit_chain() -> dict:
    ordered = sorted(_store, key=lambda e: e["chainIndex"])
    running = GENESIS_HASH
    for entry in ordered:
        if entry["prevHash"] != running or entry["chainHash"] != _compute_chain_hash(running, entry):
            return {
                "valid": False,
                "totalEntries": len(_store),
                "verifiedAt": _now_iso(),
                "breakAt": entry["id"],
                "breakIndex": entry["chainIndex"],
            }
        running = entry["chainHash"]
    return {"valid": True, "totalEntries": len(_store), "verifiedAt": _now_iso()}


def _seed() -> None:
    seeds = [
        ("Marcus Webb", "m.webb@ligaturerd.io", "User Login", "Auth",
         "Authenticated via SSO — session opened", "login", -8),
        ("Sarah Chen", "sarah.chen@ligaturerd.io", "Document Approved", "Submissions",
         "Approved CSR for LIG-2847 — three-stage review complete", "document", -6),
        ("James Liu", "j.liu@ligaturerd.io", "Status Changed", "Safety",
         "ICSR-2025-0088 status → Submitted (transmitted to EMA gateway)", "document", -4),
        ("Priya Anand", "p.anand@ligaturerd.io", "CAPA Created", "QMS",
         "CAPA-2026-0042 opened — deviation source: batch documentation gap", "document", -2),
    ]
    global _head_hash, _chain_counter
    for index, (user, email, action, module, details, type_, hours) in enumerate(seeds):
        entry = {
            "id": f"seed-{index + 1}",
            "timestamp": _now_iso(hours),
            "user": user,
            "email": email,
            "action": action,
            "module": module,
            "details": details,
            "type": type_,
        }
        entry["prevHash"] = _head_hash
        entry["chainHash"] = _compute_chain_hash(_head_hash, entry)
        entry["chainIndex"] = index
        _head_hash = entry["chainHash"]
        _chain_counter = index + 1
        _store.insert(0, entry)


_seed()
