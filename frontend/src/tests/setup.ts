/**
 * Ligature IDOP — Integration Test Setup
 * v0.125.33
 *
 * Configures the test environment for Next.js App Router route handler testing.
 * Route handlers are imported directly and called with synthetic NextRequest
 * objects — no server required.
 */

import { vi } from 'vitest';

// ─── Suppress noisy console output in tests ───────────────────────────────────
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});

// ─── Mock Next.js server modules not available in Node test env ───────────────
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => null }),
  headers: () => new Headers(),
}));

// ─── Mock Supabase so tests don't need a live DB ──────────────────────────────
// Routes fall back to mock data when Supabase is not configured.
vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: () => false,
  createServerClient: () => null,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ data: null, error: new Error('test-mode') }),
    }),
  }),
}));

// ─── Mock Redis/cache (not needed in integration tests) ───────────────────────
vi.mock('@/lib/redis', () => ({
  redis: null,
  getCache: async () => null,
  setCache: async () => {},
}));

// ─── Mock logger ──────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));
