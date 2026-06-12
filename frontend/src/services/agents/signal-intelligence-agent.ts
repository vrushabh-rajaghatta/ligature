// =============================================================================
// SIGNAL INTELLIGENCE AGENT — v0.106.0
// =============================================================================
// Virtual Safety Physician: evaluates disproportionality signals, aggregates
// case evidence, assesses benefit-risk impact, recommends labeling actions.
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

export const signalIntelligenceAgent: AgentDefinition = {
  id: 'signal-intelligence' as AgentId,

  systemPrompt: `You are the Signal Intelligence Agent for Ligature — a virtual Safety Physician / Medical Officer.

Your role: Evaluate pharmacovigilance signals, assess disproportionality statistics, aggregate case evidence,
and recommend benefit-risk management actions.

For each signal evaluation you must:
1. Read the signal record (PT, SOC, PRR, ROR, EBGM statistics)
2. Retrieve supporting ICSR cases (especially serious cases)
3. Assess signal strength using ICH E2E signal detection criteria:
   - Statistical threshold: PRR ≥ 2 with χ² ≥ 4, or ROR lower 95% CI > 1
   - Clinical importance: Severity, reversibility, mechanism plausibility
   - Case quality: Reporter type, completeness, causality assessment
4. Classify signal validity: potential/validated/refuted
5. Set risk level:
   - EDITORIAL: Signal below threshold, routine monitoring continues → autopilot
   - SUBSTANTIVE: Signal meets threshold, additional monitoring required → autopilot with override
   - REGULATORY: Validated signal requiring label review or PSUR update → human medical review
   - SAFETY-CRITICAL: Serious signal (fatal, life-threatening, new serious ADR) → urgent human review + signature
6. Generate benefit-risk assessment summary
7. Recommend specific actions (label section, PSUR flag, DHPC, urgent safety measure)
8. Set draft output

Standards: ICH E2E (Pharmacovigilance Planning), ICH E2C(R2) (PSUR), CIOMS VIII (Signal Detection),
EMA GVP Module IX (Signal Management). MedDRA coding per current version.`,

  maxIterations: 8,

  tools: [
    {
      name: 'read_signal',
      description: 'Retrieve the safety signal record including disproportionality statistics.',
      input_schema: {
        type: 'object',
        properties: { signal_id: { type: 'string' } },
        required: ['signal_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/safety/signals/${input.signal_id}`);
        if (data) return data;
        return {
          id: input.signal_id, signalNumber: 'SIG-2026-001',
          title: 'Hepatotoxicity — Nexavant',
          meddraPreferredTerm: 'Hepatocellular injury', soc: 'Hepatobiliary disorders',
          status: 'under-evaluation', priority: 'high',
          detectionMethod: 'prr',
          statistics: {
            prr: 3.42, prrLower95: 1.89, prrUpper95: 6.18,
            ror: 3.51, rorLower95: 1.94, rorUpper95: 6.34,
            observed: 12, expected: 3.51,
            chiSquare: 18.4, pValue: 0.000018, meetsThreshold: true,
          },
          caseCount: 12, seriousCases: 4, fatalCases: 0,
          firstCaseDate: '2025-11-15', latestCaseDate: '2026-03-10',
          productId: 'prod-001', productName: 'Nexavant',
          currentLabelSection: null, labeledReaction: false,
        };
      },
    },
    {
      name: 'read_supporting_cases',
      description: 'Retrieve ICSR cases supporting this signal for medical assessment.',
      input_schema: {
        type: 'object',
        properties: {
          signal_id: { type: 'string' },
          limit: { type: 'number', description: 'Max cases to retrieve (default 10)' },
          serious_only: { type: 'boolean' },
        },
        required: ['signal_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/safety?signalId=${input.signal_id}&limit=${input.limit ?? 10}`);
        if (data) return data;
        return {
          cases: [
            { id: 'case-001', caseNumber: 'CASE-2025-0341', seriousness: 'serious', outcome: 'recovered', patientAge: 58, patientSex: 'M', onsetDays: 42, causality: 'probable', narrativeSummary: 'ALT 12x ULN at Day 42. Drug discontinued. Recovered at Day 63.' },
            { id: 'case-002', caseNumber: 'CASE-2026-0089', seriousness: 'serious', outcome: 'recovering', patientAge: 67, patientSex: 'F', onsetDays: 28, causality: 'possible', narrativeSummary: 'Asymptomatic ALT elevation 8x ULN. Dose reduction. Improving.' },
            { id: 'case-003', caseNumber: 'CASE-2026-0124', seriousness: 'non-serious', outcome: 'resolved', patientAge: 44, patientSex: 'F', onsetDays: 14, causality: 'possible', narrativeSummary: 'Mild transaminase elevation 3x ULN. Resolved without intervention.' },
          ],
          total: 12, serious: 4, nonSerious: 8, fatal: 0,
          avgOnsetDays: 31, rechallenge: 2, rechallengePositive: 1,
        };
      },
    },
    {
      name: 'assess_benefit_risk',
      description: 'Perform a structured benefit-risk assessment using EMA PrOACT-URL framework.',
      input_schema: {
        type: 'object',
        properties: {
          signal_pt: { type: 'string' },
          case_count: { type: 'number' },
          serious_cases: { type: 'number' },
          prr: { type: 'number' },
          indication: { type: 'string' },
          alternative_therapies: { type: 'string' },
        },
        required: ['signal_pt', 'case_count', 'serious_cases', 'prr'],
      },
      handler: async (input) => {
        const prr = input.prr as number;
        const serious = input.serious_cases as number;
        const urgency = prr > 5 || serious > 5 ? 'urgent' : prr > 2 || serious > 2 ? 'high' : 'routine';
        return {
          benefitRiskImpact: prr > 3 ? 'unfavourable-shift' : 'monitor',
          urgency,
          recommendedLabelSection: '4.4 Special Warnings and Precautions for Use',
          recommendedAction: prr > 5 ? 'label-update-required' : 'enhanced-monitoring',
          psurFlag: true,
          dhpcRequired: prr > 8,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify signal risk level for routing.',
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
      description: 'Set the signal evaluation output and action recommendations.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              signalValidity: { type: 'string', description: 'potential/validated/refuted' },
              clinicalImportance: { type: 'string', description: 'low/medium/high/critical' },
              statisticalStrength: { type: 'string' },
              caseQualityAssessment: { type: 'string' },
              benefitRiskAssessment: { type: 'string' },
              recommendedActions: { type: 'array', items: { type: 'string' } },
              labelingImpact: { type: 'string' },
              psurFlag: { type: 'boolean' },
              urgency: { type: 'string' },
            },
            required: ['signalValidity', 'clinicalImportance', 'recommendedActions', 'benefitRiskAssessment'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Evaluate the following pharmacovigilance signal and determine clinical significance and required actions.

Signal ID: ${ctx.entityId}
Product: ${ctx.extra?.productName ?? 'Nexavant'}

Steps:
1. Read the full signal record with disproportionality statistics
2. Review supporting ICSR cases (prioritise serious cases)
3. Perform benefit-risk assessment
4. Classify signal validity and clinical importance
5. Determine routing (autopilot monitoring vs human medical review)
6. Generate specific recommended actions
7. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { signalValidity?: string; clinicalImportance?: string };
    return `${ctx.entityId} — ${d?.signalValidity ?? 'signal'} · ${d?.clinicalImportance ?? '?'} importance`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 24 * 3600_000).toISOString(),
};
