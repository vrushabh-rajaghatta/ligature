"""Anthropic API client — shared by the ai/* routes.

Mirrors the direct fetch the Next.js routes made to the Anthropic Messages
API. When ANTHROPIC_API_KEY is unset, callers fall back to mock generators
(parity with the original demo behavior).
"""
import json
from typing import AsyncIterator, Optional

import httpx

from app.config import get_settings

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_MODEL = "claude-sonnet-4-6"

# System prompts — verbatim from src/app/api/ai/generate/route.ts
SYSTEM_PROMPTS = {
    "haq-response": (
        "You are an expert regulatory affairs professional specializing in Health "
        "Authority Question (HAQ) responses for pharmaceutical submissions. Your "
        "responses should be:\n- Scientifically accurate and well-referenced\n"
        "- Concise yet comprehensive\n- Written in formal regulatory language\n"
        "- Structured with clear headings where appropriate\n- Include citations to "
        "relevant submission modules (e.g., Module 3.2.S.2.4)\n\nFocus on addressing "
        "the specific question asked while demonstrating deep knowledge of ICH "
        "guidelines, FDA regulations, and pharmaceutical development."
    ),
    "safety-narrative": (
        "You are an expert pharmacovigilance medical writer specializing in "
        "Individual Case Safety Report (ICSR) narratives. Your narratives should:\n"
        "- Follow CIOMS and E2B(R3) standards\n- Be factual and chronological\n"
        "- Include relevant medical history\n- Describe the adverse event timeline "
        "precisely\n- Note any rechallenge/dechallenge information\n- Assess causality "
        "appropriately\n- Use MedDRA preferred terms accurately"
    ),
    "document-section": (
        "You are an expert regulatory medical writer for pharmaceutical documents. "
        "Write content that:\n- Follows ICH guidelines (E3, E6, M4, etc.)\n- Uses "
        "precise scientific language\n- Includes appropriate cross-references\n"
        "- Maintains consistency with regulatory standards\n- Is suitable for "
        "regulatory submission"
    ),
    "signal-summary": (
        "You are an expert safety scientist specializing in signal detection and "
        "evaluation. Your summaries should:\n- Present the signal clearly and "
        "objectively\n- Include relevant epidemiological data\n- Reference published "
        "literature\n- Assess strength of evidence\n- Recommend appropriate next "
        "steps\n- Follow CIOMS VIII signal detection guidelines"
    ),
    "general": (
        "You are an expert assistant for pharmaceutical regulatory affairs and medical "
        "writing. Provide accurate, professional responses suitable for life sciences "
        "R&D contexts."
    ),
}


def get_api_key() -> Optional[str]:
    return get_settings().anthropic_api_key or None


def _headers(api_key: str) -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
    }


async def generate(
    *,
    prompt: str,
    system: str,
    max_tokens: int = 2000,
    temperature: float = 0.7,
    model: str = DEFAULT_MODEL,
) -> dict:
    """Single-shot completion. Returns the parsed Anthropic response JSON."""
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            ANTHROPIC_API_URL,
            headers=_headers(api_key),
            json={
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        return resp.json()


async def stream(
    *,
    prompt: str,
    system: str,
    max_tokens: int = 2000,
    model: str = DEFAULT_MODEL,
) -> AsyncIterator[bytes]:
    """Proxy the Anthropic SSE stream straight through to the client."""
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            ANTHROPIC_API_URL,
            headers=_headers(api_key),
            json={
                "model": model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
            },
        ) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes():
                yield chunk


def sse_text_stream(text: str, chunk_delay: float = 0.0):
    """Build an SSE byte stream that emits `text` word-by-word as Anthropic-style
    content_block_delta events — used by mock fallbacks. Synchronous generator."""
    import re

    words = re.split(r"(\s+)", text)
    for word in words:
        if not word:
            continue
        event = {"type": "content_block_delta", "delta": {"type": "text_delta", "text": word}}
        yield f"data: {json.dumps(event)}\n\n".encode()
    yield b"data: {\"type\": \"message_stop\"}\n\n"
