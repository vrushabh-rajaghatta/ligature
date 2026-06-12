// =============================================================================
// REGULATORY STRATEGY AGENT — v0.106.0
// =============================================================================
// Virtual Regulatory Affairs Director: monitors commitments, tracks regulatory
// intelligence, assesses pathway options, prepares pre-submission briefings.
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

export const regStrategyAgent: AgentDefinition = {
  id: 'reg-strategy' as AgentId,

  systemPrompt: `You are the Regulatory Strategy Agent for Ligature — a virtual Regulatory Affairs Director.

Your role: Monitor regulatory commitments, track intelligence alerts, assess regulatory pathway options,
and prepare pre-submission strategy briefings.

For strategy assessments you must:
1. Read the product/programme regulatory context
2. Check commitment register for overdue or at-risk items
3. Review recent regulatory intelligence alerts relevant to this programme
4. Assess regulatory pathway options and their implications
5. Set risk level:
   - EDITORIAL: Routine monitoring, all commitments on track → autopilot status update
   - SUBSTANTIVE: Minor commitment slippage, new guidance to assess → autopilot with override
   - REGULATORY: Commitment overdue, HA feedback received, or major guidance change → human review
   - SAFETY-CRITICAL: Urgent safety commitment, HA request for immediate response → urgent human review
6. Generate strategic recommendations
7. Set draft output

Regulatory frameworks: FDA PDUFA commitments, FDA Complete Response Letter actions, EMA Day 120/180
questions, PMDA Primary Assessment, Health Canada Notice of Deficiency. ICH M4 CTD for submission
strategy. FDA Prescription Drug User Fee Act for commitment tracking.

Always consider: submission timing strategy, agency interaction opportunities (Type B meetings,
scientific advice), priority review designation maintenance, breakthrough therapy obligations.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_product_regulatory_status',
      description: 'Retrieve the regulatory status of a product including active applications and submission history.',
      input_schema: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/products/${input.product_id}`);
        if (data) return data;
        return {
          id: input.product_id, name: 'Nexavant', inn: 'nexavantib',
          therapeuticArea: 'Oncology', indication: 'KRAS G12C mutant NSCLC',
          developmentPhase: 'NDA Filed',
          activeApplications: [
            { region: 'US', type: 'NDA', number: 'NDA-215847', status: 'Under Review', filedDate: '2025-11-01', pdufaDate: '2026-09-01' },
            { region: 'EU', type: 'MAA', number: 'MAA-2025/01847', status: 'In Preparation', targetDate: '2026-Q3' },
          ],
          designations: ['Breakthrough Therapy (FDA)', 'PRIME (EMA)'],
          breakoutTherapyObligation: true,
        };
      },
    },
    {
      name: 'check_commitments',
      description: 'Retrieve regulatory commitments for a product, filtering by status and due date.',
      input_schema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          status_filter: { type: 'string', description: 'all, overdue, at-risk, on-track' },
          days_horizon: { type: 'number', description: 'Days to look ahead (default 90)' },
        },
        required: ['product_id'],
      },
      handler: async (input) => {
        return {
          commitments: [
            { id: 'cmt-001', title: 'Pediatric Investigation Plan submission (EMA)', dueDate: '2026-06-30', status: 'on-track', owner: 'Regulatory Affairs', daysUntilDue: 99, priority: 'high' },
            { id: 'cmt-002', title: 'Post-approval safety study protocol (FDA PMR)', dueDate: '2026-04-15', status: 'at-risk', owner: 'Medical Affairs', daysUntilDue: 23, priority: 'critical', notes: 'Protocol draft pending IRB input' },
            { id: 'cmt-003', title: 'Carcinogenicity study final report (FDA PMC)', dueDate: '2026-03-31', status: 'overdue', owner: 'Nonclinical', daysOverdue: 8, priority: 'critical' },
          ],
          summary: { total: 8, overdue: 1, atRisk: 1, onTrack: 6 },
        };
      },
    },
    {
      name: 'review_intelligence_alerts',
      description: 'Retrieve recent regulatory intelligence alerts relevant to this programme.',
      input_schema: {
        type: 'object',
        properties: {
          therapeutic_area: { type: 'string' },
          agencies: { type: 'array', items: { type: 'string' } },
          days_back: { type: 'number', description: 'Days to look back (default 30)' },
        },
        required: ['therapeutic_area'],
      },
      handler: async (input) => {
        return {
          alerts: [
            { id: 'alert-001', source: 'FDA', title: 'Draft guidance: Clinical Pharmacology Studies for KRAS Inhibitors', date: '2026-03-05', relevance: 'high', summary: 'FDA released draft guidance on PK/PD requirements for KRAS inhibitor programs. Comments due May 5, 2026.' },
            { id: 'alert-002', source: 'EMA', title: 'CHMP Opinion: Competitor KRAS G12C inhibitor approved', date: '2026-02-28', relevance: 'high', summary: 'Second KRAS G12C inhibitor received positive CHMP opinion. SmPC sections 4.4 and 4.8 establish class-level safety language.' },
            { id: 'alert-003', source: 'ICH', title: 'ICH S1C(R3) step 2 consultation — carcinogenicity dose selection', date: '2026-02-15', relevance: 'medium', summary: 'Revised dose selection criteria may impact PMC carcinogenicity study design.' },
          ],
          total: 3, highRelevance: 2, mediumRelevance: 1,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify regulatory strategy risk level.',
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
      description: 'Set the regulatory strategy assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              programmeHealthScore: { type: 'string', description: 'green/amber/red' },
              criticalCommitments: { type: 'array', items: { type: 'string' } },
              intelligenceImpact: { type: 'string' },
              strategicRecommendations: { type: 'array', items: { type: 'string' } },
              immediateActions: { type: 'array', items: { type: 'string' } },
              agencyInteractionOpportunities: { type: 'array', items: { type: 'string' } },
              nextReviewDate: { type: 'string' },
            },
            required: ['programmeHealthScore', 'strategicRecommendations', 'immediateActions'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Perform a regulatory strategy assessment for the following product programme.

Product ID: ${ctx.entityId}

Steps:
1. Read the product regulatory status and active applications
2. Check the commitment register for overdue and at-risk items
3. Review recent intelligence alerts for this therapeutic area
4. Synthesise strategic risks and opportunities
5. Generate immediate actions and strategic recommendations
6. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { programmeHealthScore?: string; immediateActions?: string[] };
    const actions = d?.immediateActions?.length ?? 0;
    return `${ctx.entityId} — programme ${d?.programmeHealthScore ?? '?'} · ${actions} immediate action${actions !== 1 ? 's' : ''}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 72 * 3600_000).toISOString(),
};
