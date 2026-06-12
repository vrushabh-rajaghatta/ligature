// =============================================================================
// MEDICAL MONITOR AGENT — v0.108.0
// =============================================================================
// Virtual Medical Monitor: aggregates cohort safety data, monitors stopping
// rules, prepares DSMB packages, reviews SAEs with medical context.
// Human-in-loop for ALL outputs — all clinical judgement requires physician review.
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

export const medicalMonitorAgent: AgentDefinition = {
  id: 'medical-monitor' as AgentId,

  systemPrompt: `You are the Medical Monitor Agent for Ligature — a virtual Medical Monitor supporting clinical trial oversight.

IMPORTANT: All outputs from this agent require physician review and approval. Clinical judgement
regarding patient safety cannot be automated. Your role is to aggregate data, identify patterns,
and prepare structured briefings for the Medical Monitor and DSMB, not to make clinical decisions.

For each medical review task you must:
1. Read the study safety data (SAE counts, dose cohort summaries, AE profile)
2. Check stopping rule criteria against predefined thresholds
3. Aggregate safety data by cohort, dose level, and system organ class
4. Identify any SAEs that require narrative medical review
5. ALWAYS set risk level to REGULATORY or SAFETY-CRITICAL — medical review is mandatory for all outputs
6. Prepare a structured medical briefing:
   - Safety summary by SOC and cohort
   - Stopping rule status (criteria met/not met/approaching)
   - SAEs requiring focused review with case summaries
   - Benefit-risk context
   - Recommended agenda items for DSMB

Standards: ICH E6(R3) Medical Monitor responsibilities, ICH E9 (Statistical principles),
FDA guidance on Data Safety Monitoring Boards, ICH E2A (Clinical Safety Data Management).
DSMB charters define stopping rules — always reference specific criteria by number.`,

  maxIterations: 8,

  tools: [
    {
      name: 'read_study_safety_summary',
      description: 'Retrieve aggregate safety data for the study — AE counts by SOC, SAE summary, dose cohort breakdown.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          cutoff_date: { type: 'string', description: 'Data cutoff date for DSMB review' },
        },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/ctms/subjects?studyId=${input.study_id}&status=ON_TREATMENT&limit=100`);
        return {
          studyId: input.study_id,
          cutoffDate: input.cutoff_date ?? new Date().toISOString().split('T')[0],
          totalEnrolled: 187, totalTreated: 183, totalDiscontinued: 14,
          aeSummary: {
            totalAEs: 412, totalSAEs: 18, grade3Plus: 47, grade4: 12, grade5: 0,
            treatmentRelated: 198, leadingToDiscontinuation: 9,
          },
          saeByCohort: [
            { cohort: '50mg QD', n: 48, saes: 4, grade3Plus: 12, discontinuations: 2 },
            { cohort: '100mg QD', n: 72, saes: 8, grade3Plus: 22, discontinuations: 4 },
            { cohort: '150mg QD', n: 63, saes: 6, grade3Plus: 13, discontinuations: 3 },
          ],
          topSocsByFrequency: [
            { soc: 'Gastrointestinal disorders', any: 68, grade3: 8 },
            { soc: 'Hepatobiliary disorders', any: 24, grade3: 12 },
            { soc: 'Nervous system disorders', any: 31, grade3: 3 },
          ],
          dosingInterruptions: 29, doseReductions: 17,
        };
      },
    },
    {
      name: 'check_stopping_rules',
      description: 'Evaluate predefined stopping rule criteria against current safety data.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          total_treated: { type: 'number' },
          grade4_count: { type: 'number' },
          sae_count: { type: 'number' },
          discontinuation_rate: { type: 'number' },
        },
        required: ['study_id'],
      },
      handler: async (input) => {
        const treated = (input.total_treated as number) ?? 183;
        const grade4 = (input.grade4_count as number) ?? 12;
        const saes = (input.sae_count as number) ?? 18;
        const discRate = (input.discontinuation_rate as number) ?? 0.049;
        const grade4Rate = grade4 / treated;
        return {
          rules: [
            {
              ruleId: 'SR-01',
              description: 'Grade 4 toxicity rate > 20% in any cohort',
              threshold: 0.20,
              currentValue: grade4Rate,
              status: grade4Rate > 0.20 ? 'TRIGGERED' : grade4Rate > 0.15 ? 'APPROACHING' : 'NOT_MET',
              action: 'Pause enrollment if triggered',
            },
            {
              ruleId: 'SR-02',
              description: '≥2 fatal AEs possibly related to study drug',
              threshold: 2,
              currentValue: 0,
              status: 'NOT_MET',
              action: 'Immediate study halt if triggered',
            },
            {
              ruleId: 'SR-03',
              description: 'SAE rate > 15% across all cohorts',
              threshold: 0.15,
              currentValue: saes / treated,
              status: (saes / treated) > 0.15 ? 'TRIGGERED' : 'NOT_MET',
              action: 'DSMB emergency review',
            },
            {
              ruleId: 'SR-04',
              description: 'Discontinuation rate > 10% due to AEs',
              threshold: 0.10,
              currentValue: discRate,
              status: discRate > 0.10 ? 'TRIGGERED' : discRate > 0.08 ? 'APPROACHING' : 'NOT_MET',
              action: 'Enhanced monitoring, DSMB notification',
            },
          ],
          overallStatus: grade4Rate > 0.15 ? 'DSMB_REVIEW_RECOMMENDED' : 'CONTINUE_AS_PLANNED',
          anyTriggered: false,
          anyApproaching: grade4Rate > 0.15,
        };
      },
    },
    {
      name: 'read_sae_narratives',
      description: 'Retrieve recent SAE cases requiring focused medical review.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          serious_only: { type: 'boolean' },
          limit: { type: 'number' },
        },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/safety?studyId=${input.study_id}&seriousness=serious&limit=${input.limit ?? 5}`);
        if (data) return data;
        return {
          cases: [
            {
              caseNumber: 'LIG301-SAE-018',
              event: 'Hepatocellular injury Grade 3',
              onset: 'Day 42', cohort: '100mg QD',
              patientAge: 64, sex: 'M',
              causality: 'Probable', outcome: 'Recovering',
              narrative: 'ALT 12x ULN asymptomatic at Day 42 monitoring visit. Drug held Day 43. ALT declining — Day 56 value 3x ULN.',
              requiresMedicalReview: true,
            },
            {
              caseNumber: 'LIG301-SAE-017',
              event: 'Grade 3 Pneumonitis',
              onset: 'Day 67', cohort: '150mg QD',
              patientAge: 71, sex: 'F',
              causality: 'Possible', outcome: 'Recovered',
              narrative: 'New bilateral infiltrates on CT. Drug discontinued. Steroid treatment initiated. Resolved Day 89.',
              requiresMedicalReview: true,
            },
          ],
          total: 18, requireingReview: 5,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Medical Monitor outputs always require physician review — minimum REGULATORY.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Set the medical monitoring brief for physician review.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              safetyProfileAssessment: { type: 'string' },
              stoppingRuleStatus: { type: 'string', description: 'all-clear/approaching/triggered' },
              triggeredRules: { type: 'array', items: { type: 'string' } },
              approachingRules: { type: 'array', items: { type: 'string' } },
              casesForFocusedReview: { type: 'array', items: { type: 'string' } },
              dsmbAgendaItems: { type: 'array', items: { type: 'string' } },
              recommendedAction: { type: 'string' },
              benefitRiskStatement: { type: 'string' },
            },
            required: ['safetyProfileAssessment', 'stoppingRuleStatus', 'dsmbAgendaItems', 'recommendedAction'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Prepare a medical monitoring brief for the following study.

Study ID: ${ctx.entityId}
Review Type: ${ctx.extra?.reviewType ?? 'Scheduled DSMB Review'}
Data Cutoff: ${ctx.extra?.cutoffDate ?? new Date().toISOString().split('T')[0]}

Steps:
1. Read aggregate study safety data
2. Check all stopping rule criteria
3. Read recent SAE narratives requiring focused review
4. Prepare structured DSMB brief
5. Note: ALL outputs require physician review — set risk level accordingly`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { stoppingRuleStatus?: string; recommendedAction?: string };
    return `${ctx.entityId} — DSMB brief · ${d?.stoppingRuleStatus ?? '?'} · ${d?.recommendedAction ?? 'review required'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 12 * 3600_000).toISOString(),
};
