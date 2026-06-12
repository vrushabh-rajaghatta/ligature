// =============================================================================
// AGENT ENGINE — v0.105.0
// =============================================================================
// Uses fetch to call the Anthropic API directly (matching existing AI routes).
// No @anthropic-ai/sdk dependency.
// =============================================================================

import type {
  AgentRun,
  AgentId,
  AgentRiskLevel,
  AgentToolCall,
  AgentTriggerPayload,
} from '@/types/agents';
import { RISK_AUTOPILOT as AUTOPILOT_MAP } from '@/types/agents';
import {
  generateRunId,
  createAgentRun,
  updateAgentRun,
  createReviewRequest,
  generateReviewId,
} from '@/lib/agent-store';
import { addAuditEntry } from '@/lib/audit-store';
import { applyAgentOutput } from '@/lib/agent-write-back';
import { buildCalibratedSystemPrompt } from '@/lib/learning-prompt-injector';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// ── Inline Anthropic types (no SDK) ──────────────────────────────────────────

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

interface ContentBlock {
  type: 'text' | 'tool_use';
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

type MessageContent = ContentBlock[] | ToolResultBlock[];

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: MessageContent;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  usage?: { input_tokens: number; output_tokens: number };
}

// ── Tool definition types ─────────────────────────────────────────────────────

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  handler: (input: Record<string, unknown>, context: AgentExecutionContext) => Promise<unknown>;
}

export interface AgentExecutionContext {
  runId: string;
  agentId: AgentId;
  tenantId: string;
  initiatedBy: string;
  entityType: string;
  entityId: string;
  extra?: Record<string, unknown>;
}

export interface AgentDefinition {
  id: AgentId;
  systemPrompt: string;
  tools: AgentToolDefinition[];
  maxIterations?: number;
  buildUserMessage: (context: AgentExecutionContext) => string;
  buildReviewLabel: (context: AgentExecutionContext, draftOutput: unknown) => string;
  buildReviewDueAt: () => string;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[],
  tools: AnthropicTool[]
): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, tools, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<AnthropicResponse>;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export async function runAgent(
  definition: AgentDefinition,
  payload: AgentTriggerPayload
): Promise<AgentRun> {
  const runId = generateRunId();
  const startTime = Date.now();

  const context: AgentExecutionContext = {
    runId,
    agentId: payload.agentId,
    tenantId: payload.tenantId,
    initiatedBy: payload.initiatedBy,
    entityType: payload.entityType,
    entityId: payload.entityId,
    extra: payload.context,
  };

  await createAgentRun({
    id: runId,
    agentId: payload.agentId,
    status: 'running',
    triggeredBy: payload.triggeredBy,
    triggerEntityType: payload.entityType,
    triggerEntityId: payload.entityId,
    riskLevel: null,
    riskRationale: null,
    decision: null,
    draftOutput: null,
    autopilot: false,
    reviewRequestId: null,
    toolCalls: [],
    tokensUsed: 0,
    durationMs: 0,
    model: MODEL,
    tenantId: payload.tenantId,
    initiatedBy: payload.initiatedBy,
    createdAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';

  try {
    const maxIterations = definition.maxIterations ?? 5;
    const anthropicTools: AnthropicTool[] = definition.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    // Inject learning calibration notes into the system prompt
    const systemPrompt = buildCalibratedSystemPrompt(
      payload.agentId,
      definition.systemPrompt,
      payload.tenantId
    );

    const messages: AnthropicMessage[] = [
      { role: 'user', content: [{ type: 'text', text: definition.buildUserMessage(context) }] },
    ];

    let totalTokens = 0;
    const toolCallLog: AgentToolCall[] = [];
    let finalText = '';
    let draftOutput: unknown = null;
    let riskLevel: AgentRiskLevel | null = null;
    let riskRationale: string | null = null;

    for (let i = 0; i < maxIterations; i++) {
      const response = await callAnthropic(apiKey, systemPrompt, messages, anthropicTools);
      totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      if (response.stop_reason === 'end_turn') {
        finalText = response.content.find(b => b.type === 'text')?.text ?? '';
        break;
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: ToolResultBlock[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use' || !block.id || !block.name) continue;

          const toolDef = definition.tools.find(t => t.name === block.name);
          const toolStart = Date.now();
          let toolOutput: unknown;

          try {
            toolOutput = toolDef
              ? await toolDef.handler(block.input ?? {}, context)
              : { error: `Unknown tool: ${block.name}` };
          } catch (e) {
            toolOutput = { error: String(e) };
          }

          toolCallLog.push({
            toolName: block.name,
            input: block.input ?? {},
            output: toolOutput,
            durationMs: Date.now() - toolStart,
          });

          if (block.name === 'set_risk_level' && block.input) {
            riskLevel = block.input.risk_level as AgentRiskLevel;
            riskRationale = block.input.rationale as string;
          }
          if (block.name === 'set_draft_output' && block.input) {
            draftOutput = (block.input as { output: unknown }).output;
          }

          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolOutput) });
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }

    const isAutopilot = riskLevel ? AUTOPILOT_MAP[riskLevel] : false;
    const durationMs = Date.now() - startTime;
    const finalStatus: AgentRun['status'] = isAutopilot ? 'completed' : 'escalated';
    let reviewRequestId: string | null = null;

    if (!isAutopilot && draftOutput !== null) {
      const reviewId = generateReviewId();
      await createReviewRequest({
        id: reviewId,
        agentRunId: runId,
        agentId: payload.agentId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        entityLabel: definition.buildReviewLabel(context, draftOutput),
        riskLevel: riskLevel ?? 'regulatory',
        summary: finalText.slice(0, 200) || 'Agent action requires review',
        draftOutput,
        dueAt: definition.buildReviewDueAt(),
        priority: riskLevel === 'safety-critical' ? 'urgent' : 'high',
        status: 'pending',
        outcome: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewerNote: null,
        modifiedOutput: null,
        tenantId: payload.tenantId,
        createdAt: new Date().toISOString(),
      });
      reviewRequestId = reviewId;
    }

    // Autopilot: apply draftOutput directly to the source entity
    if (isAutopilot && draftOutput !== null) {
      applyAgentOutput({
        agentId: payload.agentId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        draftOutput,
        tenantId: payload.tenantId,
        initiatedBy: payload.initiatedBy,
      }).catch(e => console.error('[agent-engine] autopilot write-back failed', e));
    }

    const completedRun = await updateAgentRun(runId, {
      status: finalStatus,
      riskLevel,
      riskRationale,
      decision: finalText.slice(0, 500) || null,
      draftOutput,
      autopilot: isAutopilot,
      reviewRequestId,
      toolCalls: toolCallLog,
      tokensUsed: totalTokens,
      durationMs,
      completedAt: new Date().toISOString(),
    });

    addAuditEntry({
      user: payload.initiatedBy,
      email: 'agent@ligature.ai',
      action: isAutopilot
        ? `Agent autopilot: ${payload.agentId} completed on ${payload.entityType} ${payload.entityId}`
        : `Agent escalated: ${payload.agentId} sent ${payload.entityType} ${payload.entityId} for human review`,
      module: 'agents',
      details: `Risk: ${riskLevel ?? 'unknown'} | Tokens: ${totalTokens} | Duration: ${durationMs}ms`,
      type: 'system',
    });

    return completedRun!;

  } catch (err) {
    const failedRun = await updateAgentRun(runId, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
      completedAt: new Date().toISOString(),
    });
    return failedRun!;
  }
}
