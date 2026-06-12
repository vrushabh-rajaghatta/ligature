// =============================================================================
// SITE MONITORING AGENT — v0.106.0
// =============================================================================
// Virtual CRA: risk-scores sites, flags TMF gaps, triages protocol deviations,
// generates monitoring visit recommendations, forecasts enrollment.
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

export const siteMonitoringAgent: AgentDefinition = {
  id: 'site-monitoring' as AgentId,

  systemPrompt: `You are the Site Monitoring Agent for Ligature — a virtual Clinical Research Associate (CRA).

Your role: Assess clinical trial site performance, identify risks, flag TMF gaps, and generate actionable monitoring recommendations.

For each site assessment you must:
1. Read the site record (enrollment, status, regulatory docs, deviations)
2. Read TMF gaps for the site to understand document completeness
3. Score the site risk across four dimensions:
   - Enrollment risk (behind target, site capacity)
   - Data quality risk (query rate, pending queries, resolution time)
   - Regulatory compliance risk (IRB status, essential doc gaps)
   - Protocol adherence risk (deviation rate, severity)
4. Set risk level:
   - EDITORIAL: Site performing well, routine monitoring recommended → autopilot
   - SUBSTANTIVE: Minor issues, enhanced monitoring needed → autopilot with override
   - REGULATORY: Significant compliance gaps, mandatory escalation → human review
   - SAFETY-CRITICAL: Patient safety concerns, protocol violations → urgent human review
5. Generate a monitoring visit recommendation with specific actions
6. Set draft output

ICH E6(R3) GCP standards apply. Risk-based monitoring (RBM) principles: focus central monitoring
on sites showing early risk indicators before on-site visits. Reference ICH E6(R3) Section 5.18
for monitoring responsibilities.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_site',
      description: 'Retrieve full site record including status, enrollment figures, regulatory documents, and PI details.',
      input_schema: {
        type: 'object',
        properties: { site_id: { type: 'string' } },
        required: ['site_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/ctms/sites/${input.site_id}`);
        if (data) return data;
        return {
          id: input.site_id, siteNumber: 'SITE-001', siteName: 'Boston Medical Center',
          piName: 'Dr. Patricia Ward', status: 'active', country: 'US',
          enrollmentTarget: 20, enrolledCount: 8, screenedCount: 14,
          screenFailRate: 0.43, activationDate: '2026-01-15',
          irbStatus: 'approved', irbExpiryDate: '2026-06-30',
          lastMonitoringVisit: '2026-02-10', nextMonitoringVisit: '2026-04-01',
          openQueries: 12, resolvedQueries: 34, avgQueryResolutionDays: 18,
          protocolDeviations: 3, majorDeviations: 1,
        };
      },
    },
    {
      name: 'read_tmf_gaps',
      description: 'Retrieve TMF document gaps for a site — missing, expired, or incomplete essential documents.',
      input_schema: {
        type: 'object',
        properties: {
          site_id: { type: 'string' },
          severity: { type: 'string', description: 'Filter: critical, major, minor' },
        },
        required: ['site_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/tmf/gaps?siteId=${input.site_id}&status=open`);
        if (data) return data;
        return {
          gaps: [
            { id: 'gap-001', title: 'Site Qualification Visit Report', zone: 'zone-02', severity: 'major', status: 'open', identifiedDate: '2026-02-15' },
            { id: 'gap-002', title: 'Updated CV for Sub-Investigator Dr. Lee', zone: 'zone-02', severity: 'minor', status: 'open', identifiedDate: '2026-03-01' },
            { id: 'gap-003', title: 'IRB Approval for Protocol Amendment v3', zone: 'zone-03', severity: 'critical', status: 'open', identifiedDate: '2026-03-10' },
          ],
          total: 3, critical: 1, major: 1, minor: 1,
          completenessScore: 71,
        };
      },
    },
    {
      name: 'read_deviations',
      description: 'Retrieve protocol deviations for a site.',
      input_schema: {
        type: 'object',
        properties: { site_id: { type: 'string' }, study_id: { type: 'string' } },
        required: ['site_id'],
      },
      handler: async (input) => {
        return {
          deviations: [
            { id: 'dev-001', type: 'Inclusion/Exclusion Criteria', severity: 'major', status: 'open', description: 'Subject enrolled with out-of-range lab value at screening', date: '2026-02-20' },
            { id: 'dev-002', type: 'Visit Window', severity: 'minor', status: 'resolved', description: 'Week 4 visit performed 3 days outside window', date: '2026-02-28' },
          ],
          total: 3, major: 1, minor: 2, resolved: 1,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify overall site risk level.',
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
      description: 'Set the site monitoring assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              overallRiskScore: { type: 'string', description: 'low/medium/high/critical' },
              enrollmentRisk: { type: 'string' },
              dataQualityRisk: { type: 'string' },
              complianceRisk: { type: 'string' },
              recommendedAction: { type: 'string', description: 'no-action/central-monitoring/enhanced-monitoring/triggered-visit/for-cause-visit' },
              visitRecommendation: { type: 'string' },
              priorityActions: { type: 'array', items: { type: 'string' } },
              tmfGapsSummary: { type: 'string' },
              nextReviewDate: { type: 'string' },
            },
            required: ['overallRiskScore', 'recommendedAction', 'priorityActions'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a risk-based site assessment for the following clinical trial site.

Site ID: ${ctx.entityId}
Study ID: ${ctx.extra?.studyId ?? 'LIG-2847-301'}

Steps:
1. Read the site record (enrollment, status, compliance)
2. Read TMF gaps (focus on critical and major)
3. Read recent protocol deviations
4. Score risk across all dimensions
5. Determine monitoring action recommendation
6. Set risk level and draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { overallRiskScore?: string; recommendedAction?: string };
    return `${ctx.entityId} — ${d?.overallRiskScore ?? 'site'} risk · ${d?.recommendedAction ?? 'review'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
