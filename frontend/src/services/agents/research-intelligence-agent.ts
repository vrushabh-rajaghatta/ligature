// =============================================================================
// RESEARCH INTELLIGENCE AGENT — v0.107.0
// =============================================================================
// Virtual Discovery Scientist: triages literature alerts, validates targets,
// ranks lead series, detects competitive threats, bridges to IND readiness.
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

export const researchIntelligenceAgent: AgentDefinition = {
  id: 'research-intelligence' as AgentId,

  systemPrompt: `You are the Research Intelligence Agent for Ligature — a virtual Discovery Scientist and Research Lead.

Your role: Monitor the competitive landscape, triage literature, rank lead series candidates,
and surface actionable intelligence to accelerate early R&D programmes.

For each intelligence assessment you must:
1. Read the research target or lead series record
2. Retrieve recent literature alerts for the target/indication
3. Score competitive threat: who is ahead, what are their assets, timelines
4. Assess target validation strength: genetic evidence, human biology, mechanism clarity
5. For lead series: score ADMET profile, potency, selectivity, developability
6. Set risk level:
   - EDITORIAL: Well-characterised target, routine monitoring → autopilot summary
   - SUBSTANTIVE: New competitive data or mechanism insights → autopilot with override
   - REGULATORY: Competitor approval in indication, or unexpected safety biology → human strategy review
   - SAFETY-CRITICAL: New clinical safety signal in related mechanism → urgent medical review
7. Generate intelligence brief with recommended actions
8. Set draft output

Key frameworks: Target Product Profile alignment, TPP gap analysis, competitive positioning.
Evidence assessment: genetic evidence (GWAS, rare variant), biological rationale, clinical proof.
Lead series: Lipinski Ro5, ADMET prediction, selectivity profile, IP freedom-to-operate.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_research_target',
      description: 'Retrieve target or lead series record including validation status and programme context.',
      input_schema: {
        type: 'object',
        properties: { target_id: { type: 'string' } },
        required: ['target_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/research/targets/${input.target_id}`);
        if (data) return data;
        return {
          id: input.target_id, name: 'KRAS G12C', gene: 'KRAS',
          indication: 'Non-small cell lung cancer', stage: 'clinical',
          validationScore: 92, geneticEvidence: 'strong',
          mechanismClarity: 'well-characterised',
          approvedDrugs: ['Sotorasib (Lumakras)', 'Adagrasib (Krazati)'],
          clinicalTrials: 14, activeCompetitors: 6,
          tppAlignment: 'high', patentLandscape: 'crowded',
        };
      },
    },
    {
      name: 'read_literature_alerts',
      description: 'Retrieve recent literature and competitive intelligence alerts for the target area.',
      input_schema: {
        type: 'object',
        properties: {
          target_id: { type: 'string' },
          days_back: { type: 'number', description: 'Default 30' },
          relevance_threshold: { type: 'number', description: '0-100, default 60' },
        },
        required: ['target_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/research/literature?type=alert&limit=10`);
        if (data) return data;
        return {
          alerts: [
            { id: 'lit-001', title: 'Phase 3 data: KRAS G12C inhibitor combination with SHP2 inhibitor', source: 'NEJM', date: '2026-03-01', relevance: 91, type: 'clinical-data', competitiveThreat: 'high', summary: 'Combination shows 52% ORR vs 37% monotherapy in second-line NSCLC. Could redefine standard of care.' },
            { id: 'lit-002', title: 'Resistance mechanisms to covalent KRAS G12C inhibitors', source: 'Cancer Cell', date: '2026-02-15', relevance: 88, type: 'mechanism', competitiveThreat: 'medium', summary: 'Three resistance mechanisms identified: KRAS amplification, Y96D mutation, bypass via EGFR. Non-covalent approach may overcome.' },
            { id: 'lit-003', title: 'KRAS G12C prevalence in colorectal cancer: 4-year real-world data', source: 'JCO', date: '2026-02-28', relevance: 74, type: 'epidemiology', competitiveThreat: 'low', summary: 'Expanding addressable market into CRC (3.7% KRAS G12C prevalence). Sotorasib already approved in CRC.' },
          ],
          total: 12, highRelevance: 4, mediumRelevance: 5,
        };
      },
    },
    {
      name: 'assess_competitive_position',
      description: 'Synthesise competitive landscape and assess programme differentiation.',
      input_schema: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          indication: { type: 'string' },
          asset_stage: { type: 'string' },
          key_differentiators: { type: 'array', items: { type: 'string' } },
        },
        required: ['target', 'indication'],
      },
      handler: async (input) => {
        return {
          competitivePosition: 'challenger',
          timeToMarket: 'late — 2 approved agents, 6 in clinical',
          differentiationOpportunity: [
            'Non-covalent binding to overcome Y96D resistance mechanism',
            'CNS penetration for brain metastases (unmet need)',
            'Combination-ready profile (minimal PK interactions)',
          ],
          partnershipOpportunities: ['SHP2 inhibitor combination', 'PD-1 backbone'],
          ipRisk: 'high — crowded patent landscape, FTO analysis required',
          recommendation: 'Focus differentiation on resistance-overcoming mechanism + CNS activity',
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify research intelligence risk level.',
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
      description: 'Set the research intelligence brief.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              targetValidationScore: { type: 'number' },
              competitiveThreatLevel: { type: 'string', description: 'low/medium/high/critical' },
              keyIntelligenceFindings: { type: 'array', items: { type: 'string' } },
              recommendedActions: { type: 'array', items: { type: 'string' } },
              programmeViability: { type: 'string', description: 'strong/viable/at-risk/pivot-needed' },
              nextReviewTrigger: { type: 'string' },
            },
            required: ['competitiveThreatLevel', 'keyIntelligenceFindings', 'recommendedActions', 'programmeViability'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Generate a research intelligence brief for the following target/programme.

Target/Lead ID: ${ctx.entityId}
Indication: ${ctx.extra?.indication ?? 'NSCLC'}

Steps:
1. Read the target or lead series record
2. Retrieve recent literature and competitive alerts
3. Assess competitive position and differentiation
4. Classify risk and generate intelligence brief
5. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { competitiveThreatLevel?: string; programmeViability?: string };
    return `${ctx.entityId} — ${d?.competitiveThreatLevel ?? '?'} competitive threat · ${d?.programmeViability ?? 'unknown'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 72 * 3600_000).toISOString(),
};
