// =============================================================================
// IND → NDA AUTONOMOUS CHAIN — v0.113.0
// =============================================================================
// Gap 6 fix applied: all 4 gate cascades now suspend when a step is escalated
// and resume automatically when the blocking review resolves.
// =============================================================================

import { runAgent } from '@/lib/agent-engine';
import { leadOptimisationAgent }    from '@/services/agents/lead-optimisation-agent';
import { nonclinicalPackageAgent }  from '@/services/agents/nonclinical-package-agent';
import { regStrategyAgent }          from '@/services/agents/reg-strategy-agent';
import { submissionAssemblyAgent }   from '@/services/agents/submission-assembly-agent';
import { siteMonitoringAgent }       from '@/services/agents/site-monitoring-agent';
import { signalIntelligenceAgent }   from '@/services/agents/signal-intelligence-agent';
import { biostatisticianAgent }      from '@/services/agents/biostatistician-agent';
import { studyOperationsAgent }      from '@/services/agents/study-operations-agent';
import { documentResolutionAgent }   from '@/services/agents/document-resolution-agent';
import { qualityIntelligenceAgent }  from '@/services/agents/quality-intelligence-agent';
import {
  createCascadeState,
  updateCascadeState,
  getCascadeState,
  generateCascadeId,
  type CascadeState,
  type CascadeStepState,
} from '@/lib/cascade-state-store';
import { addAuditEntry } from '@/lib/audit-store';
import type { AgentRun, AgentTriggerPayload } from '@/types/agents';
import type { CascadeResult, CascadeStepResult } from '@/lib/cascade-types';

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function toStep(run: AgentRun): CascadeStepResult {
  return { agentId: run.agentId, runId: run.id, status: run.status, riskLevel: run.riskLevel, autopilot: run.autopilot, summary: run.decision?.slice(0, 200) ?? '', draftOutput: run.draftOutput };
}

function toStepState(run: AgentRun, stepIndex: number): CascadeStepState {
  return { stepIndex, agentId: run.agentId, status: run.status, runId: run.id, reviewRequestId: run.reviewRequestId ?? null, autopilot: run.autopilot, summary: run.decision?.slice(0, 200) ?? '', draftOutput: run.draftOutput };
}

function stepsToResults(steps: CascadeStepState[]): CascadeStepResult[] {
  return steps.map(s => ({ agentId: s.agentId, runId: s.runId, status: s.status, riskLevel: null, autopilot: s.autopilot, summary: s.summary, draftOutput: s.draftOutput }));
}

function suspend(state: CascadeState, blockingRun: AgentRun, completedSteps: CascadeStepState[], nextStepIndex: number, start: number): CascadeResult {
  const blockedByReviewIds = blockingRun.reviewRequestId ? [blockingRun.reviewRequestId] : [];
  updateCascadeState(state.cascadeId, { status: 'suspended', steps: completedSteps, nextStepIndex, blockedByReviewIds });
  addAuditEntry({ user: state.initiatedBy, email: 'agent@ligature.ai', action: `Cascade suspended: ${state.cascadeType} step ${nextStepIndex - 1} awaiting review`, module: 'agents', details: `Cascade ID: ${state.cascadeId} | Blocked: ${blockedByReviewIds.join(', ')}`, type: 'system' });
  return { cascadeId: state.cascadeId, cascadeType: state.cascadeType, status: 'suspended', steps: stepsToResults(completedSteps), suspendedAtStep: nextStepIndex - 1, blockedByReviewIds, totalDurationMs: Date.now() - start, startedAt: state.startedAt, completedAt: new Date().toISOString() };
}

function complete(state: CascadeState, completedSteps: CascadeStepState[], start: number): CascadeResult {
  updateCascadeState(state.cascadeId, { status: 'completed', steps: completedSteps });
  addAuditEntry({ user: state.initiatedBy, email: 'agent@ligature.ai', action: `Cascade completed: ${state.cascadeType} (${completedSteps.length} steps, ${completedSteps.filter(s => s.autopilot).length} autopiloted)`, module: 'agents', details: `Cascade ID: ${state.cascadeId}`, type: 'system' });
  return { cascadeId: state.cascadeId, cascadeType: state.cascadeType, status: 'completed', steps: stepsToResults(completedSteps), totalDurationMs: Date.now() - start, startedAt: state.startedAt, completedAt: new Date().toISOString() };
}

function fail(state: CascadeState, completedSteps: CascadeStepState[], start: number, err: unknown): CascadeResult {
  const msg = err instanceof Error ? err.message : String(err);
  updateCascadeState(state.cascadeId, { status: 'failed', error: msg });
  return { cascadeId: state.cascadeId, cascadeType: state.cascadeType, status: 'failed', steps: stepsToResults(completedSteps), totalDurationMs: Date.now() - start, startedAt: state.startedAt, completedAt: new Date().toISOString(), error: msg };
}

function initState(cascadeId: string, cascadeType: string, opts: Record<string, unknown>, tenantId: string, initiatedBy: string, existingState: CascadeState | null): CascadeState {
  const startedAt = new Date().toISOString();
  if (!existingState) {
    return createCascadeState({ cascadeId, cascadeType, status: 'running', steps: [], nextStepIndex: 0, blockedByReviewIds: [], resumePayload: { cascadeType, opts }, tenantId, initiatedBy, startedAt, updatedAt: startedAt });
  }
  updateCascadeState(cascadeId, { status: 'running' });
  return getCascadeState(cascadeId)!;
}

// ── GATE 1: Candidate Nomination ──────────────────────────────────────────────

export async function runCandidateNominationGate(opts: {
  seriesId: string; productId: string; initiatedBy: string; tenantId: string;
  resumeFromStep?: number; existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('gate1');
  const start = Date.now();
  const existing = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const state = initState(cascadeId, 'ind-nda-gate1-nomination', { seriesId: opts.seriesId, productId: opts.productId }, opts.tenantId, opts.initiatedBy, existing);
  const completedSteps: CascadeStepState[] = existing?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  addAuditEntry({ user: opts.initiatedBy, email: 'agent@ligature.ai', action: fromStep === 0 ? `IND-NDA Gate 1: Candidate Nomination for series ${opts.seriesId}` : `IND-NDA Gate 1 resumed at step ${fromStep}`, module: 'agents', details: `Cascade: ${cascadeId}`, type: 'system' });

  try {
    let leadOutput: Record<string, unknown> | null = existing?.steps[0]?.draftOutput as Record<string, unknown> | null ?? null;

    if (fromStep <= 0) {
      const run = await runAgent(leadOptimisationAgent, makePayload('lead-optimisation', 'series', opts.seriesId, opts.initiatedBy, opts.tenantId, { productId: opts.productId, cascadeId, gate: '1' }));
      completedSteps.push(toStepState(run, 0));
      leadOutput = run.draftOutput as Record<string, unknown> | null;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 1, start);
    }

    const nominated = (leadOutput?.nominationRecommendation as string) ?? '';
    if (fromStep <= 1 && nominated && !nominated.toLowerCase().includes('not ready')) {
      const run = await runAgent(regStrategyAgent, makePayload('reg-strategy', 'product', opts.productId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '1', candidateId: leadOutput?.leadCandidateId, trigger: 'nomination' }));
      completedSteps.push(toStepState(run, 1));
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 2, start);
    }

    return complete(state, completedSteps, start);
  } catch (err) { return fail(state, completedSteps, start, err); }
}

// ── GATE 2: IND Readiness ─────────────────────────────────────────────────────

export async function runIndReadinessGate(opts: {
  studyId: string; productId: string; initiatedBy: string; tenantId: string;
  resumeFromStep?: number; existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('gate2');
  const start = Date.now();
  const existing = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const state = initState(cascadeId, 'ind-nda-gate2-ind-readiness', { studyId: opts.studyId, productId: opts.productId }, opts.tenantId, opts.initiatedBy, existing);
  const completedSteps: CascadeStepState[] = existing?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  addAuditEntry({ user: opts.initiatedBy, email: 'agent@ligature.ai', action: fromStep === 0 ? `IND-NDA Gate 2: IND Readiness for study ${opts.studyId}` : `IND-NDA Gate 2 resumed at step ${fromStep}`, module: 'agents', details: `Cascade: ${cascadeId}`, type: 'system' });

  try {
    let nonclinRunId: string | undefined;

    if (fromStep <= 0) {
      const run = await runAgent(nonclinicalPackageAgent, makePayload('nonclinical-package', 'study', opts.studyId, opts.initiatedBy, opts.tenantId, { productId: opts.productId, cascadeId, gate: '2', developmentPhase: 'IND' }));
      completedSteps.push(toStepState(run, 0));
      nonclinRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 1, start);
    }

    if (fromStep <= 1) {
      const run = await runAgent(regStrategyAgent, makePayload('reg-strategy', 'product', opts.productId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '2', trigger: 'ind-readiness', fromNonclinRunId: nonclinRunId }));
      completedSteps.push(toStepState(run, 1));
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 2, start);
    }

    return complete(state, completedSteps, start);
  } catch (err) { return fail(state, completedSteps, start, err); }
}

// ── GATE 3: Phase 3 Site Readiness ───────────────────────────────────────────

export async function runPhase3SiteReadinessGate(opts: {
  studyId: string; siteId: string; productId: string; initiatedBy: string; tenantId: string;
  resumeFromStep?: number; existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('gate3');
  const start = Date.now();
  const existing = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const state = initState(cascadeId, 'ind-nda-gate3-ph3-site-readiness', { studyId: opts.studyId, siteId: opts.siteId, productId: opts.productId }, opts.tenantId, opts.initiatedBy, existing);
  const completedSteps: CascadeStepState[] = existing?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  addAuditEntry({ user: opts.initiatedBy, email: 'agent@ligature.ai', action: fromStep === 0 ? `IND-NDA Gate 3: Phase 3 Site Readiness for study ${opts.studyId}` : `IND-NDA Gate 3 resumed at step ${fromStep}`, module: 'agents', details: `Cascade: ${cascadeId}`, type: 'system' });

  try {
    let siteRunId: string | undefined;

    if (fromStep <= 0) {
      const run = await runAgent(siteMonitoringAgent, makePayload('site-monitoring', 'site', opts.siteId, opts.initiatedBy, opts.tenantId, { studyId: opts.studyId, cascadeId, gate: '3' }));
      completedSteps.push(toStepState(run, 0));
      siteRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 1, start);
    }

    let sigRunId: string | undefined;
    if (fromStep <= 1) {
      const run = await runAgent(signalIntelligenceAgent, makePayload('signal-intelligence', 'study-safety', opts.studyId, opts.initiatedBy, opts.tenantId, { productId: opts.productId, cascadeId, gate: '3', trigger: 'phase3-go', fromSiteRunId: siteRunId }));
      completedSteps.push(toStepState(run, 1));
      sigRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 2, start);
    }

    if (fromStep <= 2) {
      const run = await runAgent(studyOperationsAgent, makePayload('study-operations', 'study', opts.studyId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '3', trigger: 'readiness-check', fromSiteRunId: siteRunId, fromSigRunId: sigRunId }));
      completedSteps.push(toStepState(run, 2));
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 3, start);
    }

    return complete(state, completedSteps, start);
  } catch (err) { return fail(state, completedSteps, start, err); }
}

// ── GATE 4: NDA Assembly ──────────────────────────────────────────────────────

export async function runNdaAssemblyGate(opts: {
  studyId: string; submissionId: string; productId: string; initiatedBy: string; tenantId: string;
  resumeFromStep?: number; existingCascadeId?: string;
}): Promise<CascadeResult> {
  const fromStep = opts.resumeFromStep ?? 0;
  const cascadeId = opts.existingCascadeId ?? generateCascadeId('gate4');
  const start = Date.now();
  const existing = opts.existingCascadeId ? getCascadeState(cascadeId) : null;
  const state = initState(cascadeId, 'ind-nda-gate4-nda-assembly', { studyId: opts.studyId, submissionId: opts.submissionId, productId: opts.productId }, opts.tenantId, opts.initiatedBy, existing);
  const completedSteps: CascadeStepState[] = existing?.steps.filter(s => s.stepIndex < fromStep) ?? [];

  addAuditEntry({ user: opts.initiatedBy, email: 'agent@ligature.ai', action: fromStep === 0 ? `IND-NDA Gate 4: NDA Assembly for study ${opts.studyId}` : `IND-NDA Gate 4 resumed at step ${fromStep}`, module: 'agents', details: `Cascade: ${cascadeId}`, type: 'system' });

  try {
    let biostatsRunId: string | undefined;
    let biostatsOutput: Record<string, unknown> | null = existing?.steps[0]?.draftOutput as Record<string, unknown> | null ?? null;

    if (fromStep <= 0) {
      const run = await runAgent(biostatisticianAgent, makePayload('biostatistician', 'study', opts.studyId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '4', assessmentType: 'Pre-database lock review' }));
      completedSteps.push(toStepState(run, 0));
      biostatsRunId = run.id;
      biostatsOutput = run.draftOutput as Record<string, unknown> | null;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 1, start);
    }

    let studyRunId: string | undefined;
    if (fromStep <= 1) {
      const run = await runAgent(studyOperationsAgent, makePayload('study-operations', 'study', opts.studyId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '4', trigger: 'db-lock-confirmed', fromBiostatsRunId: biostatsRunId, dbLockReady: biostatsOutput?.readyForDatabaseLock }));
      completedSteps.push(toStepState(run, 1));
      studyRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 2, start);
    }

    if (fromStep <= 2) {
      const run = await runAgent(documentResolutionAgent, makePayload('document-resolution', 'document', `csr-${opts.studyId}`, opts.initiatedBy, opts.tenantId, { cascadeId, documentType: 'CSR', studyId: opts.studyId, fromStudyRunId: studyRunId }));
      completedSteps.push(toStepState(run, 2));
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 3, start);
    }

    let sigRunId: string | undefined;
    if (fromStep <= 3) {
      const run = await runAgent(signalIntelligenceAgent, makePayload('signal-intelligence', 'study-final-safety', opts.studyId, opts.initiatedBy, opts.tenantId, { productId: opts.productId, cascadeId, gate: '4', trigger: 'final-safety-review' }));
      completedSteps.push(toStepState(run, 3));
      sigRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 4, start);
    }

    let qaRunId: string | undefined;
    if (fromStep <= 4) {
      const run = await runAgent(qualityIntelligenceAgent, makePayload('quality-intelligence', 'submission-qc', opts.submissionId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '4', trigger: 'pre-submission-qc' }));
      completedSteps.push(toStepState(run, 4));
      qaRunId = run.id;
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 5, start);
    }

    if (fromStep <= 5) {
      const run = await runAgent(submissionAssemblyAgent, makePayload('submission-assembly', 'submission', opts.submissionId, opts.initiatedBy, opts.tenantId, { cascadeId, gate: '4', trigger: 'final-assembly', fromAllRunIds: [biostatsRunId, studyRunId, sigRunId, qaRunId].filter(Boolean) }));
      completedSteps.push(toStepState(run, 5));
      if (run.status === 'escalated') return suspend(state, run, completedSteps, 6, start);
    }

    return complete(state, completedSteps, start);
  } catch (err) { return fail(state, completedSteps, start, err); }
}
