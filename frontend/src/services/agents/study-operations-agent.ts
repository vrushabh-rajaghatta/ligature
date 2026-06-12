// =============================================================================
// STUDY OPERATIONS AGENT — v0.107.0
// =============================================================================
// Virtual Study/CRO Manager: orchestrates startup milestones, tracks vendor
// deliverables, monitors enrollment, flags operational risks.
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

export const studyOperationsAgent: AgentDefinition = {
  id: 'study-operations' as AgentId,

  systemPrompt: `You are the Study Operations Agent for Ligature — a virtual Study Manager and CRO Oversight Lead.

Your role: Monitor clinical study operational health, track startup milestones, oversee CRO deliverables,
forecast enrollment, and flag risks before they impact the critical path.

For each study assessment you must:
1. Read the CTMS study record (status, sites, enrollment, key dates)
2. Review site activation progress against startup plan
3. Assess enrollment rate vs target (forecast completion date)
4. Check CRO deliverable status (data management, bioanalysis, central lab)
5. Identify critical path risks
6. Set risk level:
   - EDITORIAL: Study on track, routine monitoring → autopilot status update
   - SUBSTANTIVE: Minor delays, enrollment below target → autopilot with recovery plan
   - REGULATORY: Significant delay affecting regulatory timelines or protocol breach → human review
   - SAFETY-CRITICAL: Patient safety event or sponsor oversight failure → urgent escalation
7. Generate recovery actions ordered by critical path impact
8. Set draft output

ICH E6(R3) sponsor oversight responsibilities apply. Key metrics: site activation rate,
screen-to-enroll ratio, enrollment velocity, data lock timeline, visit compliance.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_study',
      description: 'Retrieve CTMS study record including enrollment figures, site count, and key dates.',
      input_schema: {
        type: 'object',
        properties: { study_id: { type: 'string' } },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/ctms/studies/${input.study_id}`);
        if (data) return data;
        return {
          id: input.study_id, protocolNumber: 'LIG-2847-301',
          title: 'Phase 3 KRAS G12C NSCLC — NEXAVANT vs SOC',
          phase: '3', status: 'enrolling', indication: 'NSCLC',
          targetEnrollment: 480, enrolledCount: 187, screenedCount: 312,
          activeSites: 24, plannedSites: 36,
          enrollmentStartDate: '2025-09-01',
          projectedEnrollmentCompleteDate: '2027-02-01',
          primaryEndpointReadoutDate: '2027-08-01',
          dataLockTargetDate: '2027-10-01',
          currentEnrollmentVelocity: 8.4, // subjects/month
          requiredVelocityToMeetTarget: 11.2,
        };
      },
    },
    {
      name: 'check_site_activation',
      description: 'Review site activation milestones and identify activation bottlenecks.',
      input_schema: {
        type: 'object',
        properties: { study_id: { type: 'string' } },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/ctms/sites?studyId=${input.study_id}&status=in-startup`);
        if (data) return data;
        return {
          totalPlanned: 36, activated: 24, inStartup: 8, notStarted: 4,
          activationRate: 0.67,
          bottlenecks: [
            { site: 'SITE-012 Seoul National University', blocker: 'MFDS approval pending', daysDelayed: 45 },
            { site: 'SITE-019 Hospital Clínic Barcelona', blocker: 'Contract negotiation', daysDelayed: 22 },
            { site: 'SITE-031 Toronto General', blocker: 'IRB amendment review', daysDelayed: 18 },
          ],
          avgActivationDays: 94, targetActivationDays: 75,
          projectedAllSitesActive: '2026-07-15',
        };
      },
    },
    {
      name: 'forecast_enrollment',
      description: 'Project enrollment completion date based on current velocity and activated sites.',
      input_schema: {
        type: 'object',
        properties: {
          current_enrolled: { type: 'number' },
          target_enrollment: { type: 'number' },
          current_velocity: { type: 'number', description: 'subjects/month' },
          sites_to_activate: { type: 'number' },
          avg_new_site_contribution: { type: 'number', description: 'subjects/month per new site' },
        },
        required: ['current_enrolled', 'target_enrollment', 'current_velocity'],
      },
      handler: async (input) => {
        const remaining = (input.target_enrollment as number) - (input.current_enrolled as number);
        const newSiteBoost = ((input.sites_to_activate as number) ?? 0) * ((input.avg_new_site_contribution as number) ?? 0.3);
        const projectedVelocity = (input.current_velocity as number) + newSiteBoost;
        const monthsNeeded = remaining / projectedVelocity;
        const completionDate = new Date(Date.now() + monthsNeeded * 30.4 * 86400_000);
        const slipMonths = Math.max(0, (completionDate.getTime() - new Date('2027-02-01').getTime()) / (30.4 * 86400_000));
        return {
          projectedCompletionDate: completionDate.toISOString().split('T')[0],
          projectedVelocity: Math.round(projectedVelocity * 10) / 10,
          monthsToComplete: Math.round(monthsNeeded * 10) / 10,
          slipVsTarget: Math.round(slipMonths * 10) / 10,
          onTrack: slipMonths < 1,
          recoveryActionsNeeded: slipMonths >= 1,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify study operational risk.',
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
      description: 'Set the study operations assessment.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              studyHealthScore: { type: 'string', description: 'green/amber/red' },
              enrollmentStatus: { type: 'string', description: 'on-track/at-risk/behind' },
              projectedCompletionDate: { type: 'string' },
              slipMonths: { type: 'number' },
              criticalPathRisks: { type: 'array', items: { type: 'string' } },
              recoveryActions: { type: 'array', items: { type: 'string' } },
              escalationRequired: { type: 'boolean' },
            },
            required: ['studyHealthScore', 'enrollmentStatus', 'criticalPathRisks', 'recoveryActions'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a study operations health check for the following clinical study.

Study ID: ${ctx.entityId}

Steps:
1. Read the full CTMS study record
2. Review site activation progress
3. Forecast enrollment completion
4. Identify critical path risks
5. Classify risk and generate recovery actions
6. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { studyHealthScore?: string; enrollmentStatus?: string; slipMonths?: number };
    const slip = d?.slipMonths ? ` · ${d.slipMonths}mo slip` : '';
    return `${ctx.entityId} — ${d?.studyHealthScore ?? '?'} health · ${d?.enrollmentStatus ?? 'unknown'}${slip}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
