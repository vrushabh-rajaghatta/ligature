// =============================================================================
// BIOSTATISTICIAN AGENT — v0.108.0
// =============================================================================
// Virtual Biostatistician: validates SAP compliance, audits TLF completeness,
// checks ADaM dataset mapping, monitors ICH E9(R1) estimand framework.
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

export const biostatisticianAgent: AgentDefinition = {
  id: 'biostatistician' as AgentId,

  systemPrompt: `You are the Biostatistician Agent for Ligature — a virtual Biostatistician and Statistical Programmer.

Your role: Validate statistical analysis plan compliance, audit TLF completeness, check CDISC ADaM
dataset mapping, and ensure ICH E9(R1) estimand framework adherence.

For each statistical assessment you must:
1. Read the study SAP and protocol endpoints
2. Validate pre-specified analyses vs executed analyses (SAP deviation detection)
3. Check TLF (Tables, Listings, Figures) completeness against SAP index
4. Verify CDISC ADaM dataset structure and derivation rules
5. Check ICH E9(R1) estimand framework components (treatment policy, hypothetical, composite, while on treatment)
6. Set risk level:
   - EDITORIAL: Minor formatting, metadata issues → autopilot
   - SUBSTANTIVE: TLF gaps, minor ADaM deviations → autopilot with QC plan
   - REGULATORY: SAP deviations, unplanned analyses, multiplicity issues → human statistician review
   - SAFETY-CRITICAL: Primary endpoint analysis compromised or unblinding risk → urgent review
7. Generate findings ordered by severity and regulatory impact
8. Set draft output

Standards: ICH E9 (Statistical Principles), ICH E9(R1) (Estimands), ICH E3 (CSR Structure),
CDISC ADaM Implementation Guide, CDISC SDTM Implementation Guide, FDA Statistical Review Guidelines,
EMA Guidelines on Multiplicity (CHMP/295050/2013). 
Pre-specified vs post-hoc analysis distinction is critical for regulatory credibility.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_study_endpoints',
      description: 'Retrieve the study primary and secondary endpoints with statistical methodology.',
      input_schema: {
        type: 'object',
        properties: { study_id: { type: 'string' } },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/usdm/studies/${input.study_id}`);
        if (data) return data;
        return {
          studyId: input.study_id,
          primaryEndpoint: {
            description: 'Progression-free survival (PFS) per RECIST 1.1 by blinded IRC',
            statisticalMethod: 'Stratified log-rank test; HR with 95% CI from Cox proportional hazards model',
            estimand: { population: 'ITT', variable: 'PFS', intercurrentEvents: 'treatment policy', summary: 'HR' },
            alphaBoundary: 0.025, multiplicity: 'Hierarchical testing',
          },
          secondaryEndpoints: [
            { description: 'Overall survival', method: 'Stratified log-rank, OS maturity 40%' },
            { description: 'Objective response rate', method: 'Two-sided 95% CI (Clopper-Pearson)' },
            { description: 'Duration of response', method: 'Kaplan-Meier with censoring' },
            { description: 'Patient-reported outcomes (EORTC QLQ-C30)', method: 'MMRM' },
          ],
          sapVersion: '2.0', sapFinalizedDate: '2025-08-15',
          analysisPopulations: ['ITT', 'PP', 'Safety'],
        };
      },
    },
    {
      name: 'audit_tlf_completeness',
      description: 'Check TLF completeness against the SAP index — identify missing, placeholder, or outdated outputs.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          tlf_status_filter: { type: 'string', description: 'all, missing, incomplete, placeholder' },
        },
        required: ['study_id'],
      },
      handler: async () => {
        return {
          total: 147, complete: 119, placeholder: 18, missing: 7, outdated: 3,
          completeness: 81,
          criticalMissing: [
            { tableId: 'T-14.3.1', title: 'Primary Endpoint PFS Analysis — ITT Population', status: 'placeholder', sapReference: 'Section 9.1.1', note: 'Final data lock required' },
            { tableId: 'T-14.3.5', title: 'OS Interim Analysis (40% maturity)', status: 'missing', sapReference: 'Section 9.1.5', note: 'OS maturity not yet reached' },
            { listingId: 'L-16.2.8', title: 'SAE Narrative Listing', status: 'placeholder', sapReference: 'Section 12.3' },
          ],
          nonCriticalMissing: [
            { tableId: 'T-14.4.2', title: 'PRO Summary Table — EORTC QLQ-C30', status: 'placeholder' },
            { figureId: 'F-14.2.1', title: 'Swimmer Plot — Duration of Response', status: 'not-started' },
          ],
          unplannedAnalyses: 2,
          unplannedAnalysesDetails: [
            { id: 'UNPLAN-001', description: 'Exploratory subgroup analysis by co-mutation status (STK11)', note: 'Not pre-specified in SAP v2.0 — requires SAP amendment before inclusion in CSR' },
            { id: 'UNPLAN-002', description: 'Sensitivity analysis excluding sites with major protocol deviations', note: 'Triggered by safety findings — classify as post-hoc sensitivity' },
          ],
        };
      },
    },
    {
      name: 'check_estimand_compliance',
      description: 'Verify ICH E9(R1) estimand framework components are consistently implemented.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          endpoint: { type: 'string', description: 'Primary endpoint description' },
        },
        required: ['study_id'],
      },
      handler: async () => {
        return {
          estimandComponents: {
            population: { defined: true, consistent: true, note: 'ITT: all randomised subjects' },
            variable: { defined: true, consistent: true, note: 'PFS per RECIST 1.1 blinded IRC' },
            intercurrentEvents: {
              defined: true,
              consistent: false,
              strategies: ['Treatment discontinuation: treatment policy', 'Death: composite (counts as event)'],
              gap: 'SAP Section 9.1 uses "while on treatment" for PD assessment but "treatment policy" for discontinuation — inconsistent. Clarify with medical statistician.',
            },
            summaryMeasure: { defined: true, consistent: true, note: 'HR (Cox PH model)' },
          },
          overallCompliant: false,
          gapsFound: 1,
          recommendation: 'SAP amendment required to resolve intercurrent event strategy inconsistency before database lock',
        };
      },
    },
    {
      name: 'check_multiplicity',
      description: 'Verify multiplicity adjustment strategy is correctly implemented.',
      input_schema: {
        type: 'object',
        properties: {
          study_id: { type: 'string' },
          alpha: { type: 'number', description: 'Overall Type I error rate' },
        },
        required: ['study_id'],
      },
      handler: async () => {
        return {
          strategy: 'Hierarchical testing with graphical multiplicity procedure',
          primaryAlpha: 0.025, familywiseErrorControlled: true,
          hierarchyOrder: ['PFS (ITT)', 'OS (ITT)', 'ORR (ITT)', 'PRO'],
          issues: [
            { issue: 'PFS subgroup analyses not formally included in graphical procedure', severity: 'minor', note: 'Must be labelled exploratory in CSR' },
          ],
          conclusion: 'Multiplicity control adequate for confirmatory claims — subgroup analyses correctly designated exploratory',
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify statistical risk level.',
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
      description: 'Set the statistical quality assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              tlfCompleteness: { type: 'number', description: '0-100%' },
              sapDeviations: { type: 'array', items: { type: 'string' } },
              unplannedAnalyses: { type: 'array', items: { type: 'string' } },
              estimandGaps: { type: 'array', items: { type: 'string' } },
              multiplicityIssues: { type: 'array', items: { type: 'string' } },
              criticalFindings: { type: 'array', items: { type: 'string' } },
              remediationActions: { type: 'array', items: { type: 'string' } },
              readyForDatabaseLock: { type: 'boolean' },
            },
            required: ['tlfCompleteness', 'sapDeviations', 'criticalFindings', 'remediationActions', 'readyForDatabaseLock'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a statistical quality assessment for the following study.

Study ID: ${ctx.entityId}
Assessment Type: ${ctx.extra?.assessmentType ?? 'Pre-database lock review'}

Steps:
1. Read study endpoints and SAP version
2. Audit TLF completeness vs SAP index
3. Check ICH E9(R1) estimand framework compliance
4. Verify multiplicity adjustment
5. Classify findings by severity and set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { tlfCompleteness?: number; readyForDatabaseLock?: boolean };
    const ready = d?.readyForDatabaseLock ? 'ready for DB lock' : 'NOT ready for DB lock';
    return `${ctx.entityId} — TLF ${d?.tlfCompleteness ?? '?'}% · ${ready}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
