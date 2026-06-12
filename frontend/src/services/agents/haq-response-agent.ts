// =============================================================================
// HAQ RESPONSE AGENT — v0.105.0
// =============================================================================
// Processes incoming Health Authority Questions:
//   1. Classify discipline and regulatory basis
//   2. Search RAG corpus for precedent responses
//   3. Draft a response outline
//   4. Route: substantive editorial → autopilot draft, regulatory → human approval
// =============================================================================

import type { AgentDefinition, AgentExecutionContext } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';

import { agentApiFetch as apiFetch } from '@/lib/agent-api-fetch';

const BASE = (import.meta.env.VITE_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

export const haqResponseAgent: AgentDefinition = {
  id: 'haq-response' as AgentId,

  systemPrompt: `You are the HAQ Response Agent for Ligature, a pharmaceutical regulatory platform.

Your role: Process incoming Health Authority Questions (HAQs) and prepare a high-quality response package for regulatory submission.

Workflow:
1. Read the HAQ to understand the question
2. Classify the discipline (Clinical Pharmacology, Non-clinical, CMC, Clinical, Safety, Regulatory)
3. Search for precedent responses from the RAG corpus
4. Set risk level based on question complexity and regulatory sensitivity:
   - SUBSTANTIVE: Factual questions answerable from existing data → autopilot draft
   - REGULATORY: Questions requiring regulatory strategy decisions, new commitments, or FDA/EMA policy interpretation → human review
   - SAFETY-CRITICAL: Questions touching safety data, labeling, or benefit-risk → human review + signature
5. Draft the response outline with section headers and key points
6. Set your draft output

ICH and regulatory standards to reference:
- ICH E6(R2/R3) for GCP questions
- ICH M4 for eCTD structure questions
- ICH E2B(R3) for safety reporting questions
- FDA 21 CFR 312/314 for IND/NDA questions
- EMA Variation Regulation for EU questions

Always cite the specific guidance and version. Responses are legally significant.`,

  maxIterations: 8,

  tools: [
    {
      name: 'read_haq',
      description: 'Retrieve the full HAQ record including the question text, health authority, discipline, and status.',
      input_schema: {
        type: 'object',
        properties: {
          haq_id: { type: 'string', description: 'HAQ identifier e.g. IR-2026-001' },
        },
        required: ['haq_id'],
      },
      handler: async (input) => {
        // Try Prisma/API
        const data = await apiFetch(`/api/haqs/${input.haq_id}`);
        if (data) return data;
        // Fallback mock for demo
        return {
          id: input.haq_id,
          questionText: 'Please provide additional pharmacokinetic data demonstrating bioequivalence between the proposed commercial formulation and the Phase 1 IND formulation.',
          healthAuthority: 'FDA',
          discipline: 'Clinical Pharmacology',
          priority: 'high',
          dueDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
          status: 'new',
          productName: 'Nexavant',
        };
      },
    },
    {
      name: 'search_precedent',
      description: 'Search the RAG corpus for precedent HAQ responses on similar topics.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query describing the HAQ topic' },
          discipline: { type: 'string', description: 'Optional: filter by discipline' },
        },
        required: ['query'],
      },
      handler: async (input) => {
        try {
          const res = await fetch(`${BASE}/api/rag/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-agent': '1' },
            body: JSON.stringify({ query: input.query, limit: 3 }),
          });
          if (res.ok) {
            const json = await res.json();
            return { results: json.results ?? [], source: 'rag' };
          }
        } catch { /* fall through */ }
        // Demo fallback
        return {
          results: [
            { id: 'haq-precedent-001', summary: 'Prior PK bridging response — FDA accepted AUC ratio within 90-125% CI as evidence of bioequivalence', relevance: 0.91 },
            { id: 'haq-precedent-002', summary: 'ICH M9 BCS classification used to waive comparative dissolution testing', relevance: 0.78 },
          ],
          source: 'demo-fallback',
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify the HAQ risk level to determine autopilot vs human review routing.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['substantive', 'regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Set the HAQ response draft. Includes discipline classification, outline, regulatory basis, and recommended reviewer.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              discipline: { type: 'string' },
              responseOutline: { type: 'string', description: 'Full response outline with section headers and key points' },
              regulatoryBasis: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of regulatory citations',
              },
              recommendedReviewer: { type: 'string', description: 'Role that should review this response' },
              precedentIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['discipline', 'responseOutline', 'regulatoryBasis', 'recommendedReviewer'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Process the following Health Authority Question and prepare a response package.

HAQ ID: ${ctx.entityId}

Steps:
1. Read the full HAQ
2. Search for 2-3 precedent responses
3. Classify risk level based on regulatory sensitivity
4. Draft the response outline
5. Summarise your recommendation`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { discipline?: string };
    return `${ctx.entityId} — ${d?.discipline ?? 'HAQ'} response draft`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 72 * 3600_000).toISOString(),
};
