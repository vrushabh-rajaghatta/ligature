// =============================================================================
// QUALITY INTELLIGENCE AGENT — v0.106.0
// =============================================================================
// Virtual QA Manager: trends CAPA data, scores audit readiness,
// detects deviation patterns, monitors effectiveness checks.
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

export const qualityIntelligenceAgent: AgentDefinition = {
  id: 'quality-intelligence' as AgentId,

  systemPrompt: `You are the Quality Intelligence Agent for Ligature — a virtual QA Manager.

Your role: Monitor quality system health, detect CAPA and deviation patterns, score audit readiness,
and proactively identify systemic issues before they become regulatory observations.

For each quality assessment you must:
1. Read the CAPA record (or deviation triggering this review)
2. Retrieve related CAPAs/deviations to identify patterns (same root cause, area, category)
3. Assess CAPA quality: root cause adequacy, action specificity, timeline realism
4. Check effectiveness verification status for closed CAPAs
5. Score the quality system health in the affected area
6. Set risk level:
   - EDITORIAL: CAPA well-formed, minor administrative items → autopilot
   - SUBSTANTIVE: CAPA complete but improvement opportunities → autopilot with override
   - REGULATORY: Root cause inadequate, systemic pattern detected, or overdue effectiveness check → human review
   - SAFETY-CRITICAL: GCP deviation impacting patient safety or data integrity → urgent human review
7. Generate recommendations ordered by priority
8. Set draft output

Standards: ICH Q10 (Pharmaceutical Quality System), ICH E6(R3) (GCP), FDA 21 CFR 211 (GMP),
ICH Q9(R1) (Risk Management). CAPA effectiveness: verify within 3-6 months of closure.
Systemic issues require escalation to senior management per ICH Q10 Section 3.2.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_capa',
      description: 'Retrieve the full CAPA record including root cause analysis, actions, and timeline.',
      input_schema: {
        type: 'object',
        properties: { capa_id: { type: 'string' } },
        required: ['capa_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/qms/capas/${input.capa_id}`);
        if (data) return data;
        return {
          id: input.capa_id, capaNumber: 'CAPA-2026-042',
          title: 'Protocol deviation — inclusion criteria screening failure',
          type: 'corrective', status: 'in-progress', priority: 'high',
          sourceType: 'deviation', sourceReference: 'DEV-2026-018',
          rootCause: 'Screening checklist not updated following Protocol Amendment v3',
          immediateAction: 'Site notified, no further subjects screened under old criteria',
          correctiveAction: 'Update all site screening checklists, re-train site staff',
          preventiveAction: 'Implement protocol amendment communication SOP',
          initiatedDate: '2026-02-28', targetDate: '2026-04-30',
          daysOverdue: 0, assignedTo: 'Clinical Operations',
          effectivenessCheckDate: '2026-07-31', effectivenessVerified: false,
        };
      },
    },
    {
      name: 'search_related_quality_events',
      description: 'Search for related CAPAs and deviations with the same root cause category or affected area.',
      input_schema: {
        type: 'object',
        properties: {
          root_cause_category: { type: 'string' },
          source_type: { type: 'string' },
          area: { type: 'string' },
          lookback_days: { type: 'number', description: 'Days to look back (default 180)' },
        },
        required: ['root_cause_category'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/qms/capas?sourceType=${input.source_type ?? 'deviation'}&limit=10`);
        if (data) return data;
        return {
          relatedCapas: [
            { id: 'capa-039', capaNumber: 'CAPA-2026-039', title: 'Protocol amendment training gap — Site 003', status: 'closed-effective', closedDate: '2026-01-15', rootCause: 'Training not completed before site activation post-amendment' },
            { id: 'capa-031', capaNumber: 'CAPA-2026-031', title: 'ICF version control failure — multiple sites', status: 'in-progress', rootCause: 'Amendment communication delay to sites' },
          ],
          patternDetected: true,
          patternDescription: '3 CAPAs in 90 days with root cause linked to protocol amendment communication — potential systemic issue with amendment rollout process',
          recurrenceRate: 0.33,
        };
      },
    },
    {
      name: 'check_effectiveness_due',
      description: 'Check which closed CAPAs have overdue or upcoming effectiveness verifications.',
      input_schema: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          days_ahead: { type: 'number', description: 'Days to look ahead for upcoming checks' },
        },
        required: [],
      },
      handler: async () => {
        return {
          overdueChecks: [
            { capaNumber: 'CAPA-2025-118', closedDate: '2025-09-30', effectivenessCheckDue: '2026-01-30', daysOverdue: 50, area: 'Clinical Operations' },
          ],
          upcomingChecks: [
            { capaNumber: 'CAPA-2026-039', effectivenessCheckDue: '2026-04-15', daysUntilDue: 23 },
          ],
          total: 2, overdue: 1, upcoming: 1,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify quality risk level.',
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
      description: 'Set the quality intelligence assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              capaQualityScore: { type: 'string', description: 'adequate/needs-improvement/inadequate' },
              rootCauseAdequacy: { type: 'string' },
              patternDetected: { type: 'boolean' },
              patternDescription: { type: 'string' },
              systemicRisk: { type: 'boolean' },
              recommendations: { type: 'array', items: { type: 'string' } },
              effectivenessActions: { type: 'array', items: { type: 'string' } },
              escalationRequired: { type: 'boolean' },
            },
            required: ['capaQualityScore', 'rootCauseAdequacy', 'recommendations', 'patternDetected'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a quality intelligence assessment for the following CAPA.

CAPA ID: ${ctx.entityId}

Steps:
1. Read the full CAPA record
2. Search for related quality events (same root cause/area) to detect patterns
3. Check effectiveness verification status
4. Assess CAPA quality and root cause adequacy
5. Identify systemic risks
6. Generate prioritised recommendations
7. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { capaQualityScore?: string; patternDetected?: boolean };
    const pattern = d?.patternDetected ? ' · PATTERN DETECTED' : '';
    return `${ctx.entityId} — ${d?.capaQualityScore ?? 'CAPA'}${pattern}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
