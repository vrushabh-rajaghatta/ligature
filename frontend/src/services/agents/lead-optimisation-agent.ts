// =============================================================================
// LEAD OPTIMISATION AGENT — v0.108.0
// =============================================================================
// Virtual Medicinal Chemist: mines SAR from ELN data, scores ADMET profiles,
// ranks lead series, supports development candidate nomination.
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

export const leadOptimisationAgent: AgentDefinition = {
  id: 'lead-optimisation' as AgentId,

  systemPrompt: `You are the Lead Optimisation Agent for Ligature — a virtual Medicinal Chemist and Lead Optimisation Scientist.

Your role: Analyse lead series data from the ELN, mine structure-activity relationships,
score ADMET profiles, rank development candidates, and prepare nomination packages.

For each lead optimisation assessment:
1. Read the lead series data (compounds, potency, selectivity, in vitro ADMET)
2. Mine SAR patterns: which structural features drive activity vs selectivity vs liability
3. Score each compound on the development candidate criteria:
   - Potency (IC50/EC50 against primary target)
   - Selectivity (off-target panel)
   - ADMET profile (solubility, permeability, metabolic stability, hERG, plasma protein binding)
   - Developability (synthetic accessibility, solid-state properties)
   - IP position (freedom to operate)
4. Rank compounds against the Target Product Profile
5. Set risk level:
   - EDITORIAL: Routine series update, no candidate changes → autopilot
   - SUBSTANTIVE: New potency/selectivity data changes ranking → autopilot with update
   - REGULATORY: Candidate de-selection or unexpected toxicophore identified → human review
   - SAFETY-CRITICAL: Genotoxic structural alert detected → urgent safety review
6. Generate nomination package outline for development candidate
7. Set draft output

Key frameworks: Lipinski Rule of 5, Pfizer 3/75 rule (cLogP<3, PSA<75 for CNS),
AstraZeneca multiparameter optimisation (MPO). SAR mining: Matched Molecular Pairs analysis.
ADMET alerts: hERG liability (IC50 <1μM), reactive metabolites (Michael acceptors, epoxides),
phospholipidosis risk (cationic amphiphiles), genotoxicity alerts (nitroaromatics, aromatic amines).`,

  maxIterations: 8,

  tools: [
    {
      name: 'read_lead_series',
      description: 'Retrieve lead series data including all compounds, assay results, and series progression history.',
      input_schema: {
        type: 'object',
        properties: { series_id: { type: 'string' } },
        required: ['series_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/research/lead-series/${input.series_id}`);
        if (data) return data;
        return {
          id: input.series_id, seriesName: 'KRAS G12C Series 3 — Non-covalent',
          target: 'KRAS G12C', mechanismClass: 'Switch II Pocket binder',
          status: 'lead-optimisation',
          compounds: [
            {
              id: 'LIG-3041', name: 'LIG-3041',
              enzymaticIC50: 0.008, cellularIC50: 0.045,
              selectivityKRASwt: '>1000x', hERGIC50: 12.4,
              solubility: 85, permeabilityPapp: 18.2,
              microsomalCLint: 12, plasmaPPB: 94,
              cLogP: 3.2, PSA: 72, MW: 487,
              syntheticAccessibility: 3.8, patentFTO: 'clear',
              alerts: [], overallScore: 87,
            },
            {
              id: 'LIG-3058', name: 'LIG-3058',
              enzymaticIC50: 0.004, cellularIC50: 0.028,
              selectivityKRASwt: '>500x', hERGIC50: 3.1,
              solubility: 42, permeabilityPapp: 22.1,
              microsomalCLint: 8, plasmaPPB: 97,
              cLogP: 4.1, PSA: 68, MW: 521,
              syntheticAccessibility: 4.2, patentFTO: 'risk-FTO-review',
              alerts: ['hERG liability (IC50 3.1μM — monitoring threshold)'],
              overallScore: 74,
            },
            {
              id: 'LIG-3072', name: 'LIG-3072',
              enzymaticIC50: 0.012, cellularIC50: 0.067,
              selectivityKRASwt: '>2000x', hERGIC50: 28.6,
              solubility: 112, permeabilityPapp: 15.4,
              microsomalCLint: 22, plasmaPPB: 91,
              cLogP: 2.8, PSA: 78, MW: 463,
              syntheticAccessibility: 2.9, patentFTO: 'clear',
              alerts: ['Moderate metabolic liability — CYP3A4 substrate'], overallScore: 79,
            },
          ],
          tppPotencyTarget: 0.05, tppSelectivityTarget: 100, tppHERGTarget: 10,
        };
      },
    },
    {
      name: 'read_eln_experiments',
      description: 'Retrieve recent ELN experimental data for the lead series.',
      input_schema: {
        type: 'object',
        properties: {
          series_id: { type: 'string' },
          experiment_types: { type: 'array', items: { type: 'string' }, description: 'e.g. ["ADMET", "selectivity", "in-vivo"]' },
        },
        required: ['series_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/eln/experiments?search=${input.series_id}&limit=10`);
        if (data) return data;
        return {
          recentExperiments: [
            { id: 'EXP-2847', type: 'Pharmacokinetics', compound: 'LIG-3041', date: '2026-03-10', result: 'Rat PO F% = 67%, t1/2 = 4.2h, Cmax/IC50 = 8.3 — excellent oral bioavailability' },
            { id: 'EXP-2851', type: 'In vivo efficacy', compound: 'LIG-3041', date: '2026-03-15', result: 'KRAS G12C xenograft: 78% TGI at 30 mg/kg QD. No body weight loss. MTD >300 mg/kg.' },
            { id: 'EXP-2856', type: 'Selectivity panel', compound: 'LIG-3041', date: '2026-03-18', result: '96 kinase panel: >100x selective vs all off-targets. Wild-type KRAS IC50 >10μM.' },
            { id: 'EXP-2862', type: 'Genotoxicity screen', compound: 'LIG-3041', date: '2026-03-20', result: 'In silico DEREK: no structural alerts. Ames test pending.' },
          ],
          total: 47, pendingExperiments: 3,
        };
      },
    },
    {
      name: 'score_against_tpp',
      description: 'Score compounds against Target Product Profile criteria and generate ranking.',
      input_schema: {
        type: 'object',
        properties: {
          compounds: { type: 'array', items: { type: 'object' } },
          tpp_criteria: { type: 'object' },
        },
        required: ['compounds'],
      },
      handler: async (input) => {
        const compounds = input.compounds as Array<Record<string, unknown>>;
        return {
          ranking: compounds
            .sort((a, b) => ((b.overallScore as number) ?? 0) - ((a.overallScore as number) ?? 0))
            .map((c, i) => ({
              rank: i + 1,
              compound: c.id,
              overallScore: c.overallScore,
              tppMet: (c.enzymaticIC50 as number) < 0.010,
              gapsToPTPP: [
                ...((c.hERGIC50 as number) < 10 ? [`hERG IC50 ${c.hERGIC50}μM — below 10μM target`] : []),
                ...((c.microsomalCLint as number) > 15 ? [`Microsomal CLint ${c.microsomalCLint} — above 15 μL/min/mg target`] : []),
              ],
              nominationReady: i === 0 && (c.overallScore as number) > 80,
            })),
          leadCandidateId: compounds.sort((a, b) => ((b.overallScore as number) ?? 0) - ((a.overallScore as number) ?? 0))[0]?.id,
          nominationRecommended: true,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify lead optimisation risk level.',
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
      description: 'Set the lead optimisation assessment and nomination recommendation.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              leadCandidateId: { type: 'string' },
              overallScore: { type: 'number' },
              sarInsights: { type: 'array', items: { type: 'string' } },
              tppGaps: { type: 'array', items: { type: 'string' } },
              safetyAlerts: { type: 'array', items: { type: 'string' } },
              nominationRecommendation: { type: 'string' },
              requiredExperimentsBeforeNomination: { type: 'array', items: { type: 'string' } },
              nextSynthesisPriorities: { type: 'array', items: { type: 'string' } },
            },
            required: ['leadCandidateId', 'nominationRecommendation', 'tppGaps', 'requiredExperimentsBeforeNomination'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a lead optimisation assessment for the following compound series.

Series ID: ${ctx.entityId}
Target: ${ctx.extra?.target ?? 'KRAS G12C'}

Steps:
1. Read the full lead series data
2. Retrieve recent ELN experiments
3. Score all compounds against the Target Product Profile
4. Mine SAR insights and identify structural alerts
5. Generate nomination recommendation with required experiments
6. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { leadCandidateId?: string; overallScore?: number; nominationRecommendation?: string };
    return `${ctx.entityId} — ${d?.leadCandidateId ?? '?'} (score ${d?.overallScore ?? '?'}) · ${d?.nominationRecommendation ?? 'review'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 72 * 3600_000).toISOString(),
};
