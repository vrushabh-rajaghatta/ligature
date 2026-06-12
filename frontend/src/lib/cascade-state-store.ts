// =============================================================================
// CASCADE STATE STORE — v0.112.0
// =============================================================================
// Tracks multi-step cascade executions so they can be suspended when a step
// is escalated for human review and resumed once the review resolves.
//
// A cascade is suspended when any step produces status='escalated'.
// The cascade registers the blocking reviewRequestId(s) here.
// When review/[id] resolves (approved/modified), it calls resumeCascadeIfReady().
// If all blocking reviews are resolved the cascade engine re-fires from the
// step after the last completed one.
//
// In-memory only for now (same trade-off as before); cascade state is
// short-lived (hours) so the serverless risk is acceptable until a full
// DB migration is warranted.
// =============================================================================

export type CascadeStatus =
  | 'running'
  | 'suspended'    // one or more steps are waiting for human review
  | 'completed'
  | 'failed';

export interface CascadeStepState {
  stepIndex: number;
  agentId: string;
  status: string;           // AgentRunStatus
  runId: string;
  reviewRequestId: string | null;
  autopilot: boolean;
  summary: string;
  draftOutput: unknown;
}

export interface CascadeState {
  cascadeId: string;
  cascadeType: string;
  status: CascadeStatus;
  steps: CascadeStepState[];
  nextStepIndex: number;      // which step to run next when resumed
  blockedByReviewIds: string[]; // review IDs that must resolve before resume
  resumePayload: ResumePayload; // all context needed to continue the cascade
  tenantId: string;
  initiatedBy: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

// Everything the cascade needs to pick up where it left off
export interface ResumePayload {
  cascadeType: string;
  opts: Record<string, unknown>;
}

// ── In-memory store ───────────────────────────────────────────────────────────

const cascadeStates = new Map<string, CascadeState>();

export function generateCascadeId(type: string): string {
  return `cascade-${type}-${Date.now()}`;
}

export function createCascadeState(state: CascadeState): CascadeState {
  cascadeStates.set(state.cascadeId, state);
  return state;
}

export function updateCascadeState(cascadeId: string, patch: Partial<CascadeState>): CascadeState | null {
  const existing = cascadeStates.get(cascadeId);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  cascadeStates.set(cascadeId, updated);
  return updated;
}

export function getCascadeState(cascadeId: string): CascadeState | null {
  return cascadeStates.get(cascadeId) ?? null;
}

export function listCascadeStates(opts: { tenantId?: string; status?: CascadeStatus } = {}): CascadeState[] {
  let states = Array.from(cascadeStates.values());
  if (opts.tenantId) states = states.filter(s => s.tenantId === opts.tenantId);
  if (opts.status)   states = states.filter(s => s.status === opts.status);
  return states.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

// ── Review-to-cascade linkage ─────────────────────────────────────────────────
// When a review is resolved, find any suspended cascade waiting on it.

export function findCascadeSuspendedByReview(reviewRequestId: string): CascadeState | null {
  for (const state of Array.from(cascadeStates.values())) {
    if (state.status === 'suspended' && state.blockedByReviewIds.includes(reviewRequestId)) {
      return state;
    }
  }
  return null;
}

// Mark a blocking review as resolved. Returns true if the cascade is now fully unblocked.
export function markReviewResolved(cascadeId: string, reviewRequestId: string): boolean {
  const state = cascadeStates.get(cascadeId);
  if (!state) return false;

  const remaining = state.blockedByReviewIds.filter(id => id !== reviewRequestId);
  updateCascadeState(cascadeId, { blockedByReviewIds: remaining });
  return remaining.length === 0;
}
