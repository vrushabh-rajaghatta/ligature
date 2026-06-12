// =============================================================================
// AGENT STORE — v0.114.8
// =============================================================================
// Persists agent runs and review requests to Supabase.
// Falls back to in-memory when env vars are absent (local dev / tests).
// =============================================================================

import type { AgentRun, AgentReviewRequest, AgentId } from '@/types/agents';

// ── In-memory fallback ────────────────────────────────────────────────────────
const memRuns    = new Map<string, AgentRun>();
const memReviews = new Map<string, AgentReviewRequest>();

// ── Supabase client (lazy) ────────────────────────────────────────────────────
function getSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  // Server-side: prefer service role key (bypasses RLS) over publishable key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    return createClient(url, key);
  } catch {
    return null;
  }
}

// ── ID generators ─────────────────────────────────────────────────────────────
export function generateRunId():    string { return `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
export function generateReviewId(): string { return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ── Agent run CRUD ─────────────────────────────────────────────────────────────
export async function createAgentRun(run: AgentRun): Promise<AgentRun> {
  memRuns.set(run.id, run);
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('agent_runs').upsert(toDbRun(run));
    if (error) console.error('[agent-store] createAgentRun', error.message);
  }
  return run;
}

export async function updateAgentRun(id: string, patch: Partial<AgentRun>): Promise<AgentRun | null> {
  const existing = memRuns.get(id) ?? ({ id } as AgentRun);
  const updated  = { ...existing, ...patch };
  memRuns.set(id, updated);

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('agent_runs').upsert(toDbRun(updated));
    if (error) console.error('[agent-store] updateAgentRun', error.message);
  }
  return updated;
}

export async function getAgentRun(id: string): Promise<AgentRun | null> {
  if (memRuns.has(id)) return memRuns.get(id)!;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('agent_runs').select('*').eq('id', id).single();
  if (!data) return null;
  const run = fromDbRun(data);
  memRuns.set(id, run);
  return run;
}

export async function listAgentRuns(opts: {
  agentId?: AgentId;
  tenantId?: string;
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<{ runs: AgentRun[]; total: number }> {
  const sb = getSupabase();
  if (!sb) {
    const runs = Array.from(memRuns.values())
      .filter(r => !opts.agentId || r.agentId === opts.agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 50);
    return { runs, total: runs.length };
  }
  let q = sb.from('agent_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (opts.agentId)  q = q.eq('agent_id', opts.agentId);
  if (opts.tenantId) q = q.eq('tenant_id', opts.tenantId);
  if (opts.limit)    q = q.limit(opts.limit);
  const { data, count, error } = await q;
  if (error) { console.error('[agent-store] listAgentRuns', error.message); return { runs: [], total: 0 }; }
  return { runs: (data ?? []).map(fromDbRun), total: count ?? 0 };
}

// ── Review request CRUD ────────────────────────────────────────────────────────
export async function createReviewRequest(req: AgentReviewRequest): Promise<AgentReviewRequest> {
  memReviews.set(req.id, req);
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('agent_review_requests').upsert(toDbReview(req));
    if (error) console.error('[agent-store] createReviewRequest', error.message);
  }
  return req;
}

export async function updateReviewRequest(id: string, patch: Partial<AgentReviewRequest>): Promise<AgentReviewRequest | null> {
  const existing = memReviews.get(id) ?? ({ id } as AgentReviewRequest);
  const updated  = { ...existing, ...patch };
  memReviews.set(id, updated);
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('agent_review_requests').upsert(toDbReview(updated));
    if (error) console.error('[agent-store] updateReviewRequest', error.message);
  }
  return updated;
}

export async function listReviewRequests(opts: {
  tenantId?: string;
  status?: string;
  agentId?: AgentId;
  limit?: number;
}): Promise<{ requests: AgentReviewRequest[]; total: number }> {
  const sb = getSupabase();
  if (!sb) {
    const requests = Array.from(memReviews.values())
      .filter(r => (!opts.status  || r.status  === opts.status)
                && (!opts.agentId || r.agentId === opts.agentId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 50);
    return { requests, total: requests.length };
  }
  let q = sb.from('agent_review_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (opts.status)   q = q.eq('status',    opts.status);
  if (opts.agentId)  q = q.eq('agent_id',  opts.agentId);
  if (opts.tenantId) q = q.eq('tenant_id', opts.tenantId);
  if (opts.limit)    q = q.limit(opts.limit);
  const { data, count, error } = await q;
  if (error) { console.error('[agent-store] listReviewRequests', error.message); return { requests: [], total: 0 }; }
  return { requests: (data ?? []).map(fromDbReview), total: count ?? 0 };
}

export async function getReviewRequest(id: string): Promise<AgentReviewRequest | null> {
  if (memReviews.has(id)) return memReviews.get(id)!;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('agent_review_requests').select('*').eq('id', id).single();
  if (!data) return null;
  const req = fromDbReview(data);
  memReviews.set(id, req);
  return req;
}

// ── Shape converters ───────────────────────────────────────────────────────────
function toDbRun(r: AgentRun): Record<string, unknown> {
  return {
    id:                  r.id,
    agent_id:            r.agentId,
    status:              r.status,
    triggered_by:        r.triggeredBy,
    trigger_entity_type: r.triggerEntityType,
    trigger_entity_id:   r.triggerEntityId,
    risk_level:          r.riskLevel,
    risk_rationale:      r.riskRationale,
    decision:            r.decision,
    draft_output:        r.draftOutput,
    autopilot:           r.autopilot,
    review_request_id:   r.reviewRequestId,
    tool_calls:          r.toolCalls,
    tokens_used:         r.tokensUsed,
    duration_ms:         r.durationMs,
    model:               r.model,
    tenant_id:           r.tenantId,
    initiated_by:        r.initiatedBy,
    created_at:          r.createdAt,
    completed_at:        r.completedAt,
    error:               r.error,
  };
}

function fromDbRun(d: Record<string, unknown>): AgentRun {
  return {
    id:                  d.id as string,
    agentId:             d.agent_id as AgentId,
    status:              d.status as AgentRun['status'],
    triggeredBy:         d.triggered_by as AgentRun['triggeredBy'],
    triggerEntityType:   d.trigger_entity_type as string,
    triggerEntityId:     d.trigger_entity_id as string,
    riskLevel:           d.risk_level as AgentRun['riskLevel'],
    riskRationale:       d.risk_rationale as string | null,
    decision:            d.decision as string | null,
    draftOutput:         d.draft_output as unknown,
    autopilot:           d.autopilot as boolean,
    reviewRequestId:     d.review_request_id as string | null,
    toolCalls:           (d.tool_calls as AgentRun['toolCalls']) ?? [],
    tokensUsed:          d.tokens_used as number,
    durationMs:          d.duration_ms as number,
    model:               d.model as string,
    tenantId:            d.tenant_id as string,
    initiatedBy:         d.initiated_by as string,
    createdAt:           d.created_at as string,
    completedAt:         d.completed_at as string | null,
    error:               d.error as string | null,
  };
}

function toDbReview(r: AgentReviewRequest): Record<string, unknown> {
  return {
    id:              r.id,
    agent_run_id:    r.agentRunId,
    agent_id:        r.agentId,
    entity_type:     r.entityType,
    entity_id:       r.entityId,
    entity_label:    r.entityLabel,
    risk_level:      r.riskLevel,
    summary:         r.summary,
    draft_output:    r.draftOutput,
    due_at:          r.dueAt,
    priority:        r.priority,
    status:          r.status,
    outcome:         r.outcome,
    reviewed_by:     r.reviewedBy,
    reviewed_at:     r.reviewedAt,
    reviewer_note:   r.reviewerNote,
    modified_output: r.modifiedOutput,
    tenant_id:       r.tenantId,
    created_at:      r.createdAt,
  };
}

function fromDbReview(d: Record<string, unknown>): AgentReviewRequest {
  return {
    id:            d.id as string,
    agentRunId:    d.agent_run_id as string,
    agentId:       d.agent_id as AgentId,
    entityType:    d.entity_type as string,
    entityId:      d.entity_id as string,
    entityLabel:   d.entity_label as string,
    riskLevel:     d.risk_level as AgentReviewRequest['riskLevel'],
    summary:       d.summary as string,
    draftOutput:   d.draft_output as unknown,
    dueAt:         d.due_at as string,
    priority:      d.priority as AgentReviewRequest['priority'],
    status:        d.status as AgentReviewRequest['status'],
    outcome:       d.outcome as AgentReviewRequest['outcome'],
    reviewedBy:    d.reviewed_by as string | null,
    reviewedAt:    d.reviewed_at as string | null,
    reviewerNote:  d.reviewer_note as string | null,
    modifiedOutput: d.modified_output as unknown,
    tenantId:      d.tenant_id as string,
    createdAt:     d.created_at as string,
  };
}

// ── Demo seed (no-op with Supabase) ──────────────────────────────────────────
export function seedDemoData(): void { /* no-op — real data in Supabase */ }

// ── Stats helper ───────────────────────────────────────────────────────────────
export async function getAgentStats(tenantId?: string): Promise<{
  totalRuns: number;
  autopilotRate: number;
  pendingReviews: number;
  avgDurationMs: number;
}> {
  const { runs } = await listAgentRuns({ tenantId, limit: 500 });
  const reviews = await listReviewRequests({ tenantId, limit: 500 });
  const autopilot = runs.filter(r => (r as any).outcome === 'autopilot').length;
  const durations = runs.filter(r => r.durationMs).map(r => r.durationMs!);
  return {
    totalRuns: runs.length,
    autopilotRate: runs.length ? Math.round((autopilot / runs.length) * 100) : 0,
    pendingReviews: reviews.requests.filter(r => r.status === 'pending').length,
    avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
  };
}
