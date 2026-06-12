// =============================================================================
// SUBMISSION ASSEMBLY AGENT — v0.106.0
// =============================================================================
// Virtual Submission Manager: validates eCTD structure, scores readiness,
// manages publishing queue, flags blocking issues before gateway submission.
// =============================================================================

import type { AgentDefinition, AgentExecutionContext } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';

const BASE = (import.meta.env.VITE_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

async function apiFetch(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'x-internal-agent': '1' } });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data ?? j ?? null;
  } catch { return null; }
}

export const submissionAssemblyAgent: AgentDefinition = {
  id: 'submission-assembly' as AgentId,

  systemPrompt: `You are the Submission Assembly Agent for Ligature — a virtual Submission Manager.

Your role: Validate regulatory submission readiness, identify blocking issues, and manage the publishing workflow.

For each submission you must:
1. Read the submission record (type, region, status, target date)
2. Read the submission lifecycle for current state and milestone history
3. Check document completeness — are all required CTD slots filled?
4. Identify blocking issues (missing approvals, placeholder documents, failed QC)
5. Compute a readiness score (0-100)
6. Set risk level:
   - EDITORIAL: All documents present, minor formatting/metadata issues → autopilot
   - SUBSTANTIVE: Some gaps but non-critical, 80-95% ready → autopilot with override
   - REGULATORY: Critical documents missing, <80% ready, or target date <14 days away → human review
   - SAFETY-CRITICAL: Safety data gaps or post-market safety update → human review + signature
7. Generate actionable remediation steps ordered by impact
8. Set draft output

eCTD structure reference: ICH M4 (CTD), ICH M4E (Efficacy), ICH M4Q (Quality), ICH M4S (Safety).
Regional requirements: FDA 21 CFR 314/601, EMA Regulation 726/2004, PMDA CTD guidelines.
Always check: Module 1 (regional/admin), Module 2 (summaries), Module 3 (quality), 
Module 4 (nonclinical), Module 5 (clinical).`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_submission',
      description: 'Retrieve the submission record including type, region, status, target date, and document stats.',
      input_schema: {
        type: 'object',
        properties: { submission_id: { type: 'string' } },
        required: ['submission_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/submissions/${input.submission_id}`);
        if (data) return data;
        return {
          id: input.submission_id, type: 'NDA', region: 'US', agency: 'FDA',
          productName: 'Nexavant', status: 'In Progress',
          sequenceNumber: '0001', applicationNumber: 'NDA-215847',
          targetDate: new Date(Date.now() + 45 * 86400_000).toISOString(),
          daysUntilTarget: 45, qcStatus: 'In Progress', ectdStatus: 'Pending',
          documentsTotal: 147, documentsReady: 124, documentsPlaceholder: 8,
          documentsMissing: 15, documentsFailed: 4,
        };
      },
    },
    {
      name: 'read_lifecycle',
      description: 'Retrieve submission lifecycle state and milestone history.',
      input_schema: {
        type: 'object',
        properties: { submission_id: { type: 'string' } },
        required: ['submission_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/submissions/lifecycle?submissionId=${input.submission_id}`);
        if (data) return data;
        return {
          currentState: 'in-preparation',
          milestones: [
            { name: 'Content Collection', status: 'completed', completedAt: '2026-02-01' },
            { name: 'QC Review', status: 'in-progress', targetDate: '2026-04-01' },
            { name: 'Publishing', status: 'not-started', targetDate: '2026-04-15' },
            { name: 'Gateway Submission', status: 'not-started', targetDate: '2026-05-01' },
          ],
          openTasks: 12, blockedTasks: 3,
        };
      },
    },
    {
      name: 'check_document_slots',
      description: 'Check which CTD module slots have issues — missing, placeholder, or failed QC.',
      input_schema: {
        type: 'object',
        properties: {
          submission_id: { type: 'string' },
          severity_filter: { type: 'string', description: 'all, critical, blocking' },
        },
        required: ['submission_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/submissions/${input.submission_id}/documents?status=incomplete`);
        if (data) return data;
        return {
          blocking: [
            { slot: 'Module 2.7.3', title: 'Summary of Clinical Efficacy', status: 'placeholder', approvedBy: null, daysOld: 12 },
            { slot: 'Module 5.3.5.1', title: 'Study LIG-2847-301 CSR', status: 'draft', approvedBy: null, pendingSince: '2026-03-01' },
            { slot: 'Module 1.3.1', title: 'Proposed US Package Insert', status: 'missing', note: 'Labeling team review pending' },
          ],
          nonBlocking: [
            { slot: 'Module 3.2.P.5', title: 'Drug Product Specifications', status: 'minor-qc-fail', issue: 'Table 6 formatting' },
            { slot: 'Module 1.2', title: 'Cover Letter', status: 'placeholder', note: 'Final version post-submission date' },
          ],
          totalSlots: 147, filled: 124, placeholder: 8, missing: 15, failed: 4,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify submission readiness risk.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['editorial', 'substantive', 'regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Set the submission readiness assessment.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              readinessScore: { type: 'number', description: '0-100' },
              readinessLabel: { type: 'string', description: 'not-ready/at-risk/on-track/ready' },
              blockingIssues: { type: 'array', items: { type: 'string' } },
              remediationSteps: { type: 'array', items: { type: 'string' } },
              estimatedReadyDate: { type: 'string' },
              keyRisks: { type: 'string' },
            },
            required: ['readinessScore', 'readinessLabel', 'blockingIssues', 'remediationSteps'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Assess submission readiness for the following regulatory submission.

Submission ID: ${ctx.entityId}

Steps:
1. Read the submission record
2. Read the lifecycle state and milestones
3. Check document slots for blocking/missing items
4. Compute readiness score and classify risk
5. Generate ordered remediation steps
6. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { readinessScore?: number; readinessLabel?: string };
    return `${ctx.entityId} — ${d?.readinessScore ?? '?'}% ready (${d?.readinessLabel ?? 'unknown'})`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 24 * 3600_000).toISOString(),
};
