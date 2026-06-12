/**
 * Redis Cache — v0.99.0
 *
 * Application-level caching for the three designated hot paths:
 *   - POST /api/safety/aggregate-reports  (TTL 3 600 s)
 *   - POST /api/ai/haq-rag               (TTL 1 800 s, similarity-search path only)
 *   - GET  /api/cross-module/pipelines   (TTL    30 s)
 *
 * REDIS_URL is optional. When absent (or when Redis is unreachable) the module
 * falls back to a bounded in-process Map so every downstream path keeps
 * working. The fallback is intentionally fast so benchmark numbers are honest:
 * a cold in-memory lookup adds < 0.05 ms; the savings come from skipping the
 * Anthropic API call / Supabase round-trip on subsequent requests.
 *
 * Connection is lazy: the import('ioredis') only fires once the first cache
 * operation is attempted, so the app starts cleanly even if the package has
 * not yet been installed.
 *
 * Cache-key convention:
 *   ligature:v1:{route-slug}:{deterministic-pipe-delimited-params}
 *
 * Response headers added by callers:
 *   X-Cache: HIT | MISS
 *   X-Cache-Age: <seconds since entry was written>
 */

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

interface MemEntry {
  value: string;
  storedAt: number; // epoch-ms
  expiresAt: number; // epoch-ms
}

const MEM_MAX = 512; // cap to avoid unbounded growth
const memCache = new Map<string, MemEntry>();

function memGet(key: string): { value: string; age: number } | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return { value: entry.value, age: Math.floor((now - entry.storedAt) / 1000) };
}

function memSet(key: string, value: string, ttlSec: number): void {
  // Evict oldest entry when at capacity
  if (memCache.size >= MEM_MAX) {
    const oldest = memCache.keys().next().value;
    if (oldest) memCache.delete(oldest);
  }
  const now = Date.now();
  memCache.set(key, { value, storedAt: now, expiresAt: now + ttlSec * 1000 });
}

function memDel(key: string): void {
  memCache.delete(key);
}

// ---------------------------------------------------------------------------
// Redis client (lazy, optional)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any | null = null;
let redisInitialised = false;

async function getRedis(): Promise<typeof redisClient | null> {
  if (redisInitialised) return redisClient;
  redisInitialised = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('Cache', 'REDIS_URL not set — using in-memory fallback');
    return null;
  }

  try {
    // Dynamic import keeps ioredis optional: app works without it installed.
    const { default: Redis } = await import('ioredis');
    const client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 500,
      // Never block the request longer than 600 ms total for a cache miss
      enableOfflineQueue: false,
    });
    await client.ping();
    redisClient = client;
    logger.info('Cache', `Redis connected: ${url.replace(/:\/\/.*@/, '://*:*@')}`);
    return client;
  } catch (err) {
    logger.warn('Cache', 'Redis unavailable — falling back to in-memory store', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CacheHit {
  value: string;
  /** seconds since the entry was written */
  age: number;
}

/**
 * Retrieve a cached value.
 * Returns null on a miss or when the cache layer itself errors.
 */
export async function cacheGet(key: string): Promise<CacheHit | null> {
  try {
    const redis = await getRedis();
    if (redis) {
      const raw = await redis.get(key);
      if (raw === null) return null;
      // Store age separately using a shadow key written at set-time
      const ageRaw = await redis.get(`${key}:stored`);
      const age = ageRaw ? Math.floor((Date.now() - Number(ageRaw)) / 1000) : 0;
      return { value: raw, age };
    }
  } catch (err) {
    logger.warn('Cache', `Redis GET error on key ${key} — falling through to memory`, err);
  }

  // Memory fallback
  return memGet(key);
}

/**
 * Write a value to the cache with a TTL.
 * Fails silently so it never blocks a response path.
 */
export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) {
      await Promise.all([
        redis.set(key, value, 'EX', ttlSec),
        redis.set(`${key}:stored`, String(Date.now()), 'EX', ttlSec + 60),
      ]);
      return;
    }
  } catch (err) {
    logger.warn('Cache', `Redis SET error on key ${key} — writing to memory instead`, err);
  }

  memSet(key, value, ttlSec);
}

/**
 * Invalidate a specific key.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(key, `${key}:stored`);
      return;
    }
  } catch {
    // best-effort
  }
  memDel(key);
}

// ---------------------------------------------------------------------------
// TTL constants (seconds)
// ---------------------------------------------------------------------------

/** Aggregate-report generation involves an Anthropic API call and heavy
 *  statistics computation. Results for a given product + period are stable. */
export const TTL_AGGREGATE_REPORT = 3600; // 1 hour

/** HAQ similarity search results are deterministic against a static corpus. */
export const TTL_HAQ_RAG_SIMILARITY = 1800; // 30 min

/** Pipeline status changes frequently; short TTL keeps the view fresh while
 *  still absorbing repeated poll-style requests. */
export const TTL_PIPELINES_GET = 30; // 30 s

// ---------------------------------------------------------------------------
// Key builders — one per hot path
// ---------------------------------------------------------------------------

/** POST /api/safety/aggregate-reports */
export function aggregateReportCacheKey(params: {
  reportType: string;
  productId: string;
  periodStart: string;
  periodEnd: string;
  region: string;
  dataLockPoint?: string;
}): string {
  const dlp = params.dataLockPoint || params.periodEnd;
  return `ligature:v1:agg-report:${params.reportType}|${params.productId}|${params.periodStart}|${params.periodEnd}|${params.region}|${dlp}`;
}

/** POST /api/ai/haq-rag (similarity-search path only — streaming is never cached) */
export function haqRagSimilarityCacheKey(params: {
  questionText: string;
  discipline?: string;
  ctdSection?: string;
  source?: string;
  topK?: number;
}): string {
  const norm = params.questionText.toLowerCase().trim().replace(/\s+/g, ' ');
  const disc = params.discipline || '';
  const sec = params.ctdSection || '';
  const src = params.source || '';
  const k = params.topK ?? 5;
  return `ligature:v1:haq-rag-sim:${norm}|${disc}|${sec}|${src}|${k}`;
}

/** GET /api/cross-module/pipelines */
export function pipelinesCacheKey(params: {
  type: string;
  limit: number;
  executionId?: string | null;
}): string {
  const id = params.executionId || '';
  return `ligature:v1:pipelines:${params.type}|${params.limit}|${id}`;
}
