"""Token-bucket AI rate limiter — port of src/lib/ai-rate-limiter.ts.

Per-identity (JWT userId, else client IP) token bucket. In-memory, with
idle-bucket eviction. Used at the top of every AI route handler.
"""
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import Request

from app.core.security import verify_token

COOKIE_NAME = "ligature-session"


@dataclass
class RateLimitConfig:
    requests_per_minute: int
    burst_limit: Optional[int] = None


AI_RATE_LIMITS = {
    "standard": RateLimitConfig(requests_per_minute=20, burst_limit=5),
    "batch": RateLimitConfig(requests_per_minute=5, burst_limit=2),
    "health": RateLimitConfig(requests_per_minute=60, burst_limit=20),
}


@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: Optional[int] = None


# bucket key -> {"tokens": float, "last_refill": ms}
_buckets: dict[str, dict] = {}
_last_cleanup = time.time() * 1000


def _now_ms() -> float:
    return time.time() * 1000


def _maybe_cleanup() -> None:
    global _last_cleanup
    now = _now_ms()
    if now - _last_cleanup < 60_000:
        return
    _last_cleanup = now
    for key, bucket in list(_buckets.items()):
        if now - bucket["last_refill"] > 300_000:
            del _buckets[key]


def _bucket_key(request: Request) -> str:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        payload = verify_token(token)
        if payload:
            identity = payload.get("userId") or payload.get("sub")
            if isinstance(identity, str) and identity:
                return f"user:{identity}"
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    return f"ip:{ip}"


def check_rate_limit(request: Request, config: RateLimitConfig) -> RateLimitResult:
    _maybe_cleanup()
    key = _bucket_key(request)
    now = _now_ms()
    refill_rate_per_ms = config.requests_per_minute / 60_000
    max_tokens = config.burst_limit if config.burst_limit is not None else config.requests_per_minute

    bucket = _buckets.get(key)
    if not bucket:
        bucket = {"tokens": float(max_tokens), "last_refill": now}
        _buckets[key] = bucket

    elapsed = now - bucket["last_refill"]
    bucket["tokens"] = min(max_tokens, bucket["tokens"] + elapsed * refill_rate_per_ms)
    bucket["last_refill"] = now

    if bucket["tokens"] >= 1:
        bucket["tokens"] -= 1
        return RateLimitResult(allowed=True, remaining=int(bucket["tokens"]))

    retry_after = int((1 - bucket["tokens"]) / refill_rate_per_ms / 1000) + 1
    return RateLimitResult(allowed=False, remaining=0, retry_after=retry_after)


def rate_limit_headers(result: RateLimitResult, config: RateLimitConfig) -> dict:
    retry_after = result.retry_after or 5
    return {
        "Retry-After": str(retry_after),
        "X-RateLimit-Limit": str(config.requests_per_minute),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": str(int((_now_ms() + retry_after * 1000) / 1000)),
    }


def rate_limit_body(result: RateLimitResult) -> dict:
    retry_after = result.retry_after or 5
    return {
        "error": "Rate limit exceeded",
        "message": f"AI request limit reached. Please wait {retry_after}s before retrying.",
        "retryAfter": retry_after,
    }
