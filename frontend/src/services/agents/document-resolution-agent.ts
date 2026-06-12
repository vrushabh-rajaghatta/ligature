// =============================================================================
// DOCUMENT RESOLUTION AGENT — v0.105.0
// =============================================================================
// Classifies document comments by risk and either:
//   - Autopilots the resolution (editorial / substantive)
//   - Escalates to human review (regulatory / safety-critical)
// =============================================================================

import type { AgentDefinition, AgentExecutionContext } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';
import { agentApiFetch } from '@/lib/agent-api-fetch';

async function fetchComment(commentId: string): Promise<Record<string, unknown> | null> {
  return agentApiFetch(`/api/authoring/comments/${commentId}`) as Promise<Record<string, unknown> | null>;
}

async function fetchDocumentSection(documentId: string, sectionId: string | null): Promise<string> {
  const path = sectionId
    ? `/api/authoring/sections/${sectionId}`
    : `/api/authoring/documents/${documentId}`;
  const data = await agentApiFetch(path) as Record<string, unknown> | null;
  return (data?.content ?? data?.title ?? '[no content]') as string;
}

export const documentResolutionAgent: AgentDefinition = {
  id: 'document-resolution' as AgentId,

  systemPrompt: `You are the Document Resolution Agent for Ligature, a pharmaceutical regulatory platform.

Your role: Review document comments and either resolve them autonomously (low-risk) or draft a proposed resolution and escalate for human review (high-risk).

Risk classification rules:
- EDITORIAL: Typos, punctuation, formatting, grammar with no content change → autopilot
- SUBSTANTIVE: Content modifications, added/removed data, restructuring → autopilot with 24h override
- REGULATORY: References to FDA/ICH/EMA guidance, compliance requirements, regulatory commitments → human review required
- SAFETY-CRITICAL: Any comment touching safety data, adverse events, contraindications, risk management → human review + signature

For each comment you must:
1. Call read_comment to retrieve the comment
2. Call read_document_section to understand context
3. Call set_risk_level with your classification and rationale
4. Call set_draft_output with your proposed resolution
5. Summarise your decision in plain text

Always ground regulatory comments in specific guidance (e.g. "FDA 21 CFR 312.23", "ICH E6(R2) Section 5.1").
Be precise and professional — your resolutions will be applied to regulated documents.`,

  maxIterations: 6,

  tools: [
    {
      name: 'read_comment',
      description: 'Retrieve a document comment by ID, including its content, type, priority, and thread context.',
      input_schema: {
        type: 'object',
        properties: {
          comment_id: { type: 'string', description: 'The comment ID to retrieve' },
        },
        required: ['comment_id'],
      },
      handler: async (input) => {
        const comment = await fetchComment(input.comment_id as string);
        if (!comment) return { error: 'Comment not found', commentId: input.comment_id };
        return {
          id: comment.id,
          content: comment.content,
          commentType: comment.commentType,
          priority: comment.priority,
          status: comment.status,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
          documentId: comment.documentId,
          sectionId: comment.sectionId,
        };
      },
    },
    {
      name: 'read_document_section',
      description: 'Retrieve the content of the document section the comment refers to, for context.',
      input_schema: {
        type: 'object',
        properties: {
          document_id: { type: 'string' },
          section_id: { type: 'string', description: 'Optional — if null, returns document metadata' },
        },
        required: ['document_id'],
      },
      handler: async (input) => {
        const content = await fetchDocumentSection(
          input.document_id as string,
          (input.section_id as string) ?? null
        );
        return { content };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify the comment risk level. Call this before set_draft_output.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: {
            type: 'string',
            enum: ['editorial', 'substantive', 'regulatory', 'safety-critical'],
            description: 'Risk classification',
          },
          rationale: {
            type: 'string',
            description: 'Brief explanation of why this risk level was chosen',
          },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => {
        // Side effect handled in engine via tool name detection
        return { acknowledged: true, riskLevel: input.risk_level };
      },
    },
    {
      name: 'set_draft_output',
      description: 'Set the proposed resolution. This is what will be applied (autopilot) or shown for review (escalated).',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            description: 'Resolution object with proposedResolution, proposedStatus, and optional regulatoryBasis',
            properties: {
              proposedResolution: { type: 'string', description: 'The resolution text to apply to the comment' },
              proposedStatus: { type: 'string', enum: ['resolved', 'rejected'] },
              regulatoryBasis: { type: 'string', description: 'Regulatory citation if applicable' },
            },
            required: ['proposedResolution', 'proposedStatus'],
          },
        },
        required: ['output'],
      },
      handler: async (input) => {
        // Side effect handled in engine via tool name detection
        return { acknowledged: true };
      },
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Process the following document comment and determine the appropriate resolution.

Comment ID: ${ctx.entityId}
Document ID: ${ctx.extra?.documentId ?? 'unknown'}

Steps:
1. Read the comment
2. Read the document section for context
3. Classify the risk level
4. Propose a resolution
5. Summarise your decision`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { proposedResolution?: string };
    return `${ctx.entityId} — ${(d?.proposedResolution ?? '').slice(0, 60)}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
