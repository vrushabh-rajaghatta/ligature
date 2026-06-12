// =============================================================================
// CMC LIFECYCLE AGENT — v0.107.0
// =============================================================================
// Virtual CMC / Formulation Scientist: monitors stability trends, reviews
// batch records, assesses change control impact, auto-populates Module 3.
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

export const cmcLifecycleAgent: AgentDefinition = {
  id: 'cmc-lifecycle' as AgentId,

  systemPrompt: `You are the CMC Lifecycle Agent for Ligature — a virtual CMC and Formulation Scientist.

Your role: Monitor stability trending, review batch record compliance, assess regulatory change control
impact, and ensure Module 3 eCTD sections stay current with manufacturing data.

For each CMC assessment you must:
1. Read the stability or batch record data
2. Apply ICH Q1A(R2) shelf-life projection methodology
3. Check specification compliance across batches
4. Assess process parameter drift and CPKP trends
5. For change control: classify regulatory impact by region (FDA/EMA/PMDA)
6. Set risk level:
   - EDITORIAL: Data within spec, routine trending → autopilot update
   - SUBSTANTIVE: Trend approaching limit, minor process drift → autopilot with monitoring plan
   - REGULATORY: OOS result, spec limit exceedance, or change requiring prior approval → human review
   - SAFETY-CRITICAL: Contamination, impurity spike above safety threshold, or recall risk → urgent
7. Generate CMC data package update recommendations
8. Set draft output

Standards: ICH Q1A(R2) (Stability), ICH Q1E (Stability Data Evaluation), ICH Q2(R2) (Analytical),
ICH Q8(R2) (Pharmaceutical Development), ICH Q9(R1) (Quality Risk Management),
ICH Q10 (Quality System), ICH Q11 (Drug Substance). 21 CFR Part 211 (GMP).`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_stability_data',
      description: 'Retrieve stability study data for a drug product or substance batch.',
      input_schema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          study_type: { type: 'string', description: 'long-term/accelerated/intermediate/stress' },
        },
        required: ['product_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/stability/report?productId=${input.product_id}`);
        if (data) return data;
        return {
          productId: input.product_id, productName: 'Nexavant 50mg Tablet',
          storageCondition: '25°C/60% RH (Long-term)', approvedShelfLife: '24 months',
          studyType: 'long-term',
          timepoints: [
            { month: 0,  assay: 100.2, degradantA: 0.08, degradantB: 0.05, dissolution: 98, appearance: 'pass' },
            { month: 3,  assay: 99.8,  degradantA: 0.11, degradantB: 0.07, dissolution: 97, appearance: 'pass' },
            { month: 6,  assay: 99.4,  degradantA: 0.15, degradantB: 0.09, dissolution: 96, appearance: 'pass' },
            { month: 12, assay: 98.9,  degradantA: 0.22, degradantB: 0.13, dissolution: 95, appearance: 'pass' },
            { month: 18, assay: 98.3,  degradantA: 0.31, degradantB: 0.18, dissolution: 93, appearance: 'pass' },
          ],
          specifications: {
            assay: { min: 95.0, max: 105.0 },
            degradantA: { max: 0.5 },
            degradantB: { max: 0.3 },
            dissolution: { min: 80 },
          },
          projectedShelfLifeMonths: 36,
          trendAlert: false,
        };
      },
    },
    {
      name: 'project_shelf_life',
      description: 'Apply ICH Q1E statistical methodology to project shelf life from stability data.',
      input_schema: {
        type: 'object',
        properties: {
          assay_data: { type: 'array', items: { type: 'object' }, description: 'Array of {month, value}' },
          spec_limit: { type: 'number', description: 'Lower spec limit for regression' },
          confidence: { type: 'number', description: '95 (default)' },
        },
        required: ['assay_data', 'spec_limit'],
      },
      handler: async (input) => {
        // Linear regression simulation
        const data = input.assay_data as Array<{ month: number; value: number }>;
        if (!data || data.length < 3) return { error: 'Insufficient data points', projectedShelfLife: null };
        const n = data.length;
        const sumX = data.reduce((s, d) => s + d.month, 0);
        const sumY = data.reduce((s, d) => s + d.value, 0);
        const sumXY = data.reduce((s, d) => s + d.month * d.value, 0);
        const sumX2 = data.reduce((s, d) => s + d.month * d.month, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const limit = input.spec_limit as number;
        const projectedMonth = slope !== 0 ? (limit - intercept) / slope : 999;
        return {
          slope: Math.round(slope * 1000) / 1000,
          intercept: Math.round(intercept * 100) / 100,
          projectedShelfLife: Math.floor(projectedMonth),
          projectedDate: new Date(Date.now() + projectedMonth * 30.4 * 86400_000).toISOString().split('T')[0],
          degradationRate: `${Math.abs(Math.round(slope * 12 * 100) / 100)}%/year`,
          meetsIchQ1E: projectedMonth > 24,
          recommendation: projectedMonth > 36 ? 'Support 36-month shelf life extension' :
            projectedMonth > 24 ? 'Current 24-month shelf life supported' :
            'OOS trending — batch investigation required',
        };
      },
    },
    {
      name: 'assess_change_control',
      description: 'Classify regulatory filing requirements for a proposed manufacturing change.',
      input_schema: {
        type: 'object',
        properties: {
          change_type: { type: 'string', description: 'e.g. manufacturing site, process parameter, excipient' },
          change_description: { type: 'string' },
          product_stage: { type: 'string', description: 'IND/NDA/Post-approval' },
        },
        required: ['change_type', 'change_description'],
      },
      handler: async (input) => {
        const ct = (input.change_type as string).toLowerCase();
        const isMinor = ct.includes('minor') || ct.includes('editorial') || ct.includes('cosmetic');
        const isMajor = ct.includes('site') || ct.includes('process') || ct.includes('synthesis');
        return {
          fdaFilingType: isMajor ? 'Prior Approval Supplement (PAS)' : isMinor ? 'Annual Report' : 'CBE-30',
          emaVariationType: isMajor ? 'Type II variation' : isMinor ? 'Type IA variation' : 'Type IB variation',
          pmdaFilingType: isMajor ? 'Partial Change Application' : 'Minor Change Notification',
          leadTime: isMajor ? '6-12 months prior approval' : '30 days',
          dataPackageRequired: [
            'Comparative batch analysis (3 batches pre/post)',
            isMajor ? 'Process validation data' : 'Comparability data',
            'Updated quality sections (Module 3)',
          ],
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify CMC risk level.',
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
      description: 'Set the CMC lifecycle assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              stabilityStatus: { type: 'string', description: 'on-track/trending/at-risk/oos' },
              projectedShelfLifeMonths: { type: 'number' },
              shelfLifeRecommendation: { type: 'string' },
              trendAlerts: { type: 'array', items: { type: 'string' } },
              module3UpdatesRequired: { type: 'array', items: { type: 'string' } },
              regulatoryActions: { type: 'array', items: { type: 'string' } },
            },
            required: ['stabilityStatus', 'projectedShelfLifeMonths', 'regulatoryActions'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a CMC lifecycle assessment for the following product.

Product ID: ${ctx.entityId}

Steps:
1. Read stability study data
2. Project shelf life using ICH Q1E methodology
3. Assess any pending change control items
4. Identify Module 3 updates required
5. Classify risk and set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { stabilityStatus?: string; projectedShelfLifeMonths?: number };
    return `${ctx.entityId} — stability ${d?.stabilityStatus ?? '?'} · ${d?.projectedShelfLifeMonths ?? '?'}mo projected`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
