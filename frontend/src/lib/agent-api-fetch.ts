// =============================================================================
// AGENT API FETCH — v0.111.0
// =============================================================================
// Shared internal fetch helper used by all agent tool handlers.
//
// Behaviour:
//   - In all environments: attempts GET to the internal API endpoint.
//   - In production  (ANTHROPIC_API_KEY set, NODE_ENV=production):
//       returns null on 404 (entity doesn't exist — agent should handle gracefully)
//       throws    on 5xx or network failure (agent run → 'failed' status)
//   - In demo/dev   (no ANTHROPIC_API_KEY or NODE_ENV≠production):
//       returns null on any failure — callers may use their mock fallback.
//
// This ensures agents in autonomous (production) mode NEVER make decisions
// based on fabricated mock data while preserving the demo experience.
// =============================================================================

// Base URL resolution — priority order:
// 1. NEXT_PUBLIC_APP_URL (explicit override, e.g. https://app.ligature.ai)
// 2. VERCEL_URL (auto-set by Vercel on every deployment, no https:// prefix)
// 3. localhost:3000 (local dev fallback)
function resolveBase(): string {
  const raw = import.meta.env.VITE_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return raw.replace(/\/$/, ''); // strip trailing slash
}

const BASE = resolveBase();
const IS_PROD = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.NODE_ENV === 'production';

export async function agentApiFetch(path: string): Promise<unknown> {
  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        'x-internal-agent': '1',
        'x-agent-read': '1',
      },
    });
  } catch (networkErr) {
    if (IS_PROD) {
      throw new Error(
        `[agent-api-fetch] Network failure fetching ${path}: ${String(networkErr)}. ` +
        `Cannot proceed with mock data in production — agent run aborted.`
      );
    }
    return null;
  }

  if (res.ok) {
    const json = await res.json().catch(() => null);
    return json?.data ?? json ?? null;
  }

  // 404 — entity genuinely not found; agent should handle gracefully
  if (res.status === 404) return null;

  // Any other non-OK status in production is fatal
  if (IS_PROD) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `[agent-api-fetch] ${path} returned ${res.status}: ${body.slice(0, 200)}. ` +
      `Cannot proceed with mock data in production — agent run aborted.`
    );
  }

  return null;
}
