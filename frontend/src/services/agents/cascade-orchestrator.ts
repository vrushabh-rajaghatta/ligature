// =============================================================================
// CASCADE ORCHESTRATOR — v0.112.0
// =============================================================================
// Multi-agent cross-domain workflows.
//
// Gap 6 fix: cascades now SUSPEND when a step is escalated for human review
// rather than silently continuing. When the blocking review resolves, the
// cascade resumes from the next pending step via resumeCascade().
//
// Three cascades:
//   1. signal-to-label:       Signal Intelligence → Labeling → CAPA
//   2. db-lock-to-submission: Study Operations → Doc Resolution → Submission Assembly
//   3. haq-cross-functional:  HAQ Response → Signal Intelligence? → Submission Assembly
// =============================================================================

import { runAgent } from '@/lib/agent-engine';
import { signalIntelligenceAgent } from '@/services/agents/signal-intelligence-agent';
import { labelingManagementAgent } from '@/services/agents/labeling-management-agent';
import { qualityIntelligenceAgent } from '@/services/agents/quality-intelligence-agent';
import { studyOperationsAgent } from '@/services/agents/study-operations-agent';
import { submissionAssemblyAgent } from '@/services/agents/submission-assembly-agent';
import { haqResponseAgent } from '@/services/agents/haq-response-agent';
import { documentResolutionAgent } from '@/services/agents/document-resolution-agent';
import {
  createCascadeState,
  updateCascadeState,
  getCascadeState,
  generateCascadeId,
  markReviewResolved,
  findCascadeSuspendedByReview,
  type CascadeState,
  type CascadeStepState,
  type ResumePayload,
} from '@/lib/cascade-state-store';
import { addAuditEntry } from '@/lib/audit-store';
import type { AgentRun, AgentTriggerPayload } from '@/types/agents';
export type { CascadeStepResult, CascadeResult } from '@/lib/cascade-types';
import type { CascadeResult, CascadeStepResult } from '@/lib/cascade-types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(
  agentId: AgentRun['agentId'],
  entityType: string,
  entityId: string,
  initiatedBy: string,
  tenantId: string,
  context?: Record<string, unknown>
): AgentTriggerPayload {
  return { agentId, entityType, entityId, triggeredBy: 'cross-agent', initiatedBy, tenantId, context };
}

function toStepResult(run: AgentRun): CascadeStepResult {
  return {
    agentId: run.agentId,
    runId: run.id,
    status: run.status,
    riskLevel: run.riskLevel,
    autopilot: run.autopilot,
    summary: run.decision?.slice(0, 200) ?? '',
    draftOutput: run.draftOutput,
  };
}

function toStepState(run: AgentRun, stepIndex: number): CascadeStepState {
  return {
    stepIndex,
    agentId: run.agentId,
    status: run.status,
    runId: run.id,
    reviewRequestId: run.reviewRequestId ?? null,
    autopilot: run.autopilot,
    summary: run.decision?.slice(0, 200) ?? '',
    draftOutput: run.draftOutput,
  };
}

// ── Step runner — suspends cascade if a step is escalated ────────────────────

interface StepRunResult {
  run: AgentRun;
  suspended: boolean;
}

async function runStep(
  payload: AgentTriggerPayload,
  agent: Parameters<typeof runAgent>[0]
): Promise<StepRunResult> {
  const run = await runAgent(agent, payload);
  return { run, suspended: run.status === 'escalated' };
}

// ── Suspend helper ────────────────────────────────────────────────────────────

function suspendCascade(
  state: CascadeState,
  blockingRuns: AgentRun[],
  completedSteps: CascadeStepState[],
  nextStepIndex: number
): CascadeResult {
  const blockedByReviewIds = blockingRuns
    .map(r => r.reviewRequestId)
    .filter((id): id is string => Boolean(id));

  updateCascadeState(state.cascadeId, {
    status: 'suspended',
    steps: completedSteps,
    nextStepIndex,
    blockedByReviewIds,
  });

  addAuditEntry({
    user: state.initiatedBy,
    email: 'agent@ligature.ai',
    action: `Cascade suspended: ${state.cascadeType} — awaiting ${blockedByReviewIds.length} review(s)`,
    module: 'agents',
    details: `Cascade ID: ${state.cascadeId} | Blocked by: ${blockedByReviewIds.join(', ')}`,
    type: 'system',
  });

  return {
    cascadeId: state.cascadeId,
    cascadeType: state.cascadeType,
    status: 'suspended',
    steps: completedSteps.map(s => ({
      agentId: s.agentId, runId: s.runId, status: s.status,
      riskLevel: null, autopilot: s.autopilot,
      summary: s.summary, draftOutput: s.draftOutput,
    })),
    suspendedAtStep: nextStepIndex - 1,
    blockedByReviewIds,
    totalDurationMs: Date.now() - new Date(state.startedAt).getTime(),
    startedAt: state.startedAt,
    completedAt: new Date().toISOString(),
  };
}

// ── CASCADE 1: Signal → Label → CAPA ─────────────────────────────────────────

export async function runSignalToLabelCascade(opts: {
  signalId: string;
  productId: string;
  initiatedBy: string;
  tenantId: string;
  resumeFromStep?: number;
  existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('sig');
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const existingState = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const completedSteps: CascadeStepState[] = existingState?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  if (!existingState) {
    createCascadeState({
      cascadeId, cascadeType: 'signal-to-label', status: 'running',
      steps: [], nextStepIndex: 0, blockedByReviewIds: [],
      resumePayload: { cascadeType: 'signal-to-label', opts: { signalId: opts.signalId, productId: opts.productId } },
      tenantId: opts.tenantId, initiatedBy: opts.initiatedBy, startedAt, updatedAt: startedAt,
    });
  } else {
    updateCascadeState(cascadeId, { status: 'running' });
  }

  addAuditEntry({
    user: opts.initiatedBy, email: 'agent@ligature.ai',
    action: fromStep === 0
      ? `Cascade started: signal-to-label for signal ${opts.signalId}`
      : `Cascade resumed: signal-to-label at step ${fromStep}`,
    module: 'agents',
    details: `Cascade ID: ${cascadeId}`, type: 'system',
  });

  try {
    // ── Step 0: Signal Intelligence ───────────────────────────────────────
    let sigRun: AgentRun | null = existingState?.steps.find(s => s.stepIndex === 0)
      ? null  // already completed
      : null;

    if (fromStep <= 0) {
      const result = await runStep(
        makePayload('signal-intelligence', 'signal', opts.signalId, opts.initiatedBy, opts.tenantId, { productId: opts.productId }),
        signalIntelligenceAgent
      );
      completedSteps.push(toStepState(result.run, 0));
      sigRun = result.run;

      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 1);
      }
    }

    const sigOutput = (sigRun?.draftOutput ?? existingState?.steps[0]?.draftOutput) as Record<string, unknown> | null;
    const signalPT = (sigOutput?.signalPT as string) ?? 'Hepatocellular injury';
    const labelingNeeded = sigOutput?.recommendedActions &&
      (sigOutput.recommendedActions as string[]).some(a => a.toLowerCase().includes('label'));

    // ── Step 1: Labeling Management ───────────────────────────────────────
    if (fromStep <= 1 && labelingNeeded !== false) {
      const result = await runStep(
        makePayload('labeling-management', 'signal', opts.signalId, opts.initiatedBy, opts.tenantId,
          { productId: opts.productId, signalPT, cascadeId, fromSignalRunId: sigRun?.id }),
        labelingManagementAgent
      );
      completedSteps.push(toStepState(result.run, 1));

      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 2);
      }
    }

    // ── Step 2: Quality Intelligence ──────────────────────────────────────
    if (fromStep <= 2 && (sigOutput?.clinicalImportance === 'high' || sigOutput?.clinicalImportance === 'critical')) {
      const result = await runStep(
        makePayload('quality-intelligence', 'capa', `cascade-capa-${opts.signalId}`, opts.initiatedBy, opts.tenantId,
          { cascadeId, signalId: opts.signalId, productId: opts.productId }),
        qualityIntelligenceAgent
      );
      completedSteps.push(toStepState(result.run, 2));

      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 3);
      }
    }

    updateCascadeState(cascadeId, { status: 'completed', steps: completedSteps });
    const totalDurationMs = Date.now() - start;

    addAuditEntry({
      user: opts.initiatedBy, email: 'agent@ligature.ai',
      action: `Cascade completed: signal-to-label (${completedSteps.length} steps, ${completedSteps.filter(s => s.autopilot).length} autopiloted)`,
      module: 'agents', details: `Cascade ID: ${cascadeId} | Duration: ${totalDurationMs}ms`, type: 'system',
    });

    return {
      cascadeId, cascadeType: 'signal-to-label', status: 'completed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs, startedAt, completedAt: new Date().toISOString(),
    };

  } catch (err) {
    updateCascadeState(cascadeId, { status: 'failed', error: String(err) });
    return {
      cascadeId, cascadeType: 'signal-to-label', status: 'failed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs: Date.now() - start, startedAt, completedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── CASCADE 2: DB Lock → CSR Comments → Submission ───────────────────────────

export async function runDbLockToSubmissionCascade(opts: {
  studyId: string;
  submissionId: string;
  initiatedBy: string;
  tenantId: string;
  resumeFromStep?: number;
  existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('dbl');
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const existingState = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const completedSteps: CascadeStepState[] = existingState?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  if (!existingState) {
    createCascadeState({
      cascadeId, cascadeType: 'db-lock-to-submission', status: 'running',
      steps: [], nextStepIndex: 0, blockedByReviewIds: [],
      resumePayload: { cascadeType: 'db-lock-to-submission', opts: { studyId: opts.studyId, submissionId: opts.submissionId } },
      tenantId: opts.tenantId, initiatedBy: opts.initiatedBy, startedAt, updatedAt: startedAt,
    });
  } else {
    updateCascadeState(cascadeId, { status: 'running' });
  }

  addAuditEntry({
    user: opts.initiatedBy, email: 'agent@ligature.ai',
    action: fromStep === 0
      ? `Cascade started: db-lock-to-submission for study ${opts.studyId}`
      : `Cascade resumed: db-lock-to-submission at step ${fromStep}`,
    module: 'agents', details: `Cascade ID: ${cascadeId}`, type: 'system',
  });

  try {
    // ── Step 0: Study Operations ──────────────────────────────────────────
    if (fromStep <= 0) {
      const result = await runStep(
        makePayload('study-operations', 'study', opts.studyId, opts.initiatedBy, opts.tenantId, { cascadeId, trigger: 'db-lock' }),
        studyOperationsAgent
      );
      completedSteps.push(toStepState(result.run, 0));
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 1);
      }
    }

    // ── Step 1: Document Resolution ───────────────────────────────────────
    if (fromStep <= 1) {
      const result = await runStep(
        makePayload('document-resolution', 'document', `csr-${opts.studyId}-comments`, opts.initiatedBy, opts.tenantId,
          { cascadeId, studyId: opts.studyId, documentType: 'CSR' }),
        documentResolutionAgent
      );
      completedSteps.push(toStepState(result.run, 1));
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 2);
      }
    }

    // ── Step 2: Submission Assembly ───────────────────────────────────────
    if (fromStep <= 2) {
      const result = await runStep(
        makePayload('submission-assembly', 'submission', opts.submissionId, opts.initiatedBy, opts.tenantId,
          { cascadeId, studyId: opts.studyId, trigger: 'csr-complete' }),
        submissionAssemblyAgent
      );
      completedSteps.push(toStepState(result.run, 2));
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 3);
      }
    }

    updateCascadeState(cascadeId, { status: 'completed', steps: completedSteps });
    const totalDurationMs = Date.now() - start;

    addAuditEntry({
      user: opts.initiatedBy, email: 'agent@ligature.ai',
      action: `Cascade completed: db-lock-to-submission (${completedSteps.length} steps)`,
      module: 'agents', details: `Cascade ID: ${cascadeId} | Duration: ${totalDurationMs}ms`, type: 'system',
    });

    return {
      cascadeId, cascadeType: 'db-lock-to-submission', status: 'completed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs, startedAt, completedAt: new Date().toISOString(),
    };

  } catch (err) {
    updateCascadeState(cascadeId, { status: 'failed', error: String(err) });
    return {
      cascadeId, cascadeType: 'db-lock-to-submission', status: 'failed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs: Date.now() - start, startedAt, completedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── CASCADE 3: HAQ → Cross-functional → Submission ───────────────────────────

export async function runHaqCrossFunctionalCascade(opts: {
  haqId: string;
  submissionId: string;
  initiatedBy: string;
  tenantId: string;
  resumeFromStep?: number;
  existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('haq');
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const existingState = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const completedSteps: CascadeStepState[] = existingState?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  if (!existingState) {
    createCascadeState({
      cascadeId, cascadeType: 'haq-cross-functional', status: 'running',
      steps: [], nextStepIndex: 0, blockedByReviewIds: [],
      resumePayload: { cascadeType: 'haq-cross-functional', opts: { haqId: opts.haqId, submissionId: opts.submissionId } },
      tenantId: opts.tenantId, initiatedBy: opts.initiatedBy, startedAt, updatedAt: startedAt,
    });
  } else {
    updateCascadeState(cascadeId, { status: 'running' });
  }

  addAuditEntry({
    user: opts.initiatedBy, email: 'agent@ligature.ai',
    action: fromStep === 0
      ? `Cascade started: haq-cross-functional for HAQ ${opts.haqId}`
      : `Cascade resumed: haq-cross-functional at step ${fromStep}`,
    module: 'agents', details: `Cascade ID: ${cascadeId}`, type: 'system',
  });

  try {
    // ── Step 0: HAQ Response ──────────────────────────────────────────────
    let haqRun: AgentRun | null = null;
    if (fromStep <= 0) {
      const result = await runStep(
        makePayload('haq-response', 'haq', opts.haqId, opts.initiatedBy, opts.tenantId, { cascadeId, submissionId: opts.submissionId }),
        haqResponseAgent
      );
      completedSteps.push(toStepState(result.run, 0));
      haqRun = result.run;
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 1);
      }
    }

    const haqOutput = (haqRun?.draftOutput ?? existingState?.steps[0]?.draftOutput) as Record<string, unknown> | null;
    const discipline = (haqOutput?.discipline as string) ?? '';
    const isSafetyRelated = ['safety', 'pharmacovigil', 'clinical'].some(k => discipline.toLowerCase().includes(k));

    // ── Step 1: Signal Intelligence (conditional) ─────────────────────────
    if (fromStep <= 1 && isSafetyRelated) {
      const result = await runStep(
        makePayload('signal-intelligence', 'haq-safety-context', opts.haqId, opts.initiatedBy, opts.tenantId,
          { cascadeId, haqId: opts.haqId, trigger: 'haq-safety-query' }),
        signalIntelligenceAgent
      );
      completedSteps.push(toStepState(result.run, 1));
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 2);
      }
    }

    // ── Step 2: Submission Assembly ───────────────────────────────────────
    if (fromStep <= 2) {
      const result = await runStep(
        makePayload('submission-assembly', 'submission', opts.submissionId, opts.initiatedBy, opts.tenantId,
          { cascadeId, haqId: opts.haqId, trigger: 'haq-response-ready' }),
        submissionAssemblyAgent
      );
      completedSteps.push(toStepState(result.run, 2));
      if (result.suspended) {
        updateCascadeState(cascadeId, { steps: completedSteps });
        return suspendCascade(getCascadeState(cascadeId)!, [result.run], completedSteps, 3);
      }
    }

    updateCascadeState(cascadeId, { status: 'completed', steps: completedSteps });
    const totalDurationMs = Date.now() - start;

    addAuditEntry({
      user: opts.initiatedBy, email: 'agent@ligature.ai',
      action: `Cascade completed: haq-cross-functional (${completedSteps.length} steps)`,
      module: 'agents', details: `Cascade ID: ${cascadeId}`, type: 'system',
    });

    return {
      cascadeId, cascadeType: 'haq-cross-functional', status: 'completed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs, startedAt, completedAt: new Date().toISOString(),
    };

  } catch (err) {
    updateCascadeState(cascadeId, { status: 'failed', error: String(err) });
    return {
      cascadeId, cascadeType: 'haq-cross-functional', status: 'failed',
      steps: completedSteps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput })),
      totalDurationMs: Date.now() - start, startedAt, completedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
