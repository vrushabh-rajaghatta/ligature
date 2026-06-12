// =============================================================================
// CASCADE RESUME ROUTER — v0.113.0
// =============================================================================
// Central resume handler. Called from review/[id] when a blocking review
// resolves. Routes to the correct cascade function with resumeFromStep set.
//
// Lives here (not in cascade-orchestrator) to avoid circular dependencies:
//   cascade-orchestrator ← imports agents
//   ind-nda-chain        ← imports agents + cascade-types
//   cascade-resume       ← imports from both without creating a cycle
// =============================================================================

import {
  findCascadeSuspendedByReview,
  markReviewResolved,
} from '@/lib/cascade-state-store';
import { addAuditEntry } from '@/lib/audit-store';
import type { CascadeResult } from '@/lib/cascade-types';
import type { ResumePayload } from '@/lib/cascade-state-store';

import {
  runSignalToLabelCascade,
  runDbLockToSubmissionCascade,
  runHaqCrossFunctionalCascade,
} from '@/services/agents/cascade-orchestrator';

import {
  runCandidateNominationGate,
  runIndReadinessGate,
  runPhase3SiteReadinessGate,
  runNdaAssemblyGate,
} from '@/services/agents/ind-nda-chain';

// ── Resume dispatcher ─────────────────────────────────────────────────────────

async function dispatchResume(
  payload: ResumePayload,
  cascadeId: string,
  fromStep: number,
  tenantId: string,
  initiatedBy: string
): Promise<CascadeResult | null> {
  const o = payload.opts as Record<string, string>;

  switch (payload.cascadeType) {
    case 'signal-to-label':
      return runSignalToLabelCascade({ signalId: o.signalId, productId: o.productId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'db-lock-to-submission':
      return runDbLockToSubmissionCascade({ studyId: o.studyId, submissionId: o.submissionId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'haq-cross-functional':
      return runHaqCrossFunctionalCascade({ haqId: o.haqId, submissionId: o.submissionId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'ind-nda-gate1-nomination':
      return runCandidateNominationGate({ seriesId: o.seriesId, productId: o.productId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'ind-nda-gate2-ind-readiness':
      return runIndReadinessGate({ studyId: o.studyId, productId: o.productId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'ind-nda-gate3-ph3-site-readiness':
      return runPhase3SiteReadinessGate({ studyId: o.studyId, siteId: o.siteId, productId: o.productId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    case 'ind-nda-gate4-nda-assembly':
      return runNdaAssemblyGate({ studyId: o.studyId, submissionId: o.submissionId, productId: o.productId, initiatedBy, tenantId, resumeFromStep: fromStep, existingCascadeId: cascadeId });
    default:
      console.warn(`[cascade-resume] Unknown cascadeType: "${payload.cascadeType}"`);
      return null;
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function resumeCascadeAfterReview(
  reviewRequestId: string,
  tenantId: string,
  resolvedBy: string
): Promise<CascadeResult | null> {
  const state = findCascadeSuspendedByReview(reviewRequestId);
  if (!state) return null;

  const allUnblocked = markReviewResolved(state.cascadeId, reviewRequestId);
  if (!allUnblocked) {
    // This cascade is waiting on multiple reviews — still blocked
    return null;
  }

  addAuditEntry({
    user: resolvedBy,
    email: 'agent@ligature.ai',
    action: `Cascade resuming: ${state.cascadeType} (ID: ${state.cascadeId}) — all blocking reviews resolved`,
    module: 'agents',
    details: `Next step: ${state.nextStepIndex} | Resolved by: ${resolvedBy}`,
    type: 'system',
  });

  return dispatchResume(state.resumePayload, state.cascadeId, state.nextStepIndex, tenantId, resolvedBy);
}
