// =============================================================================
// AGENT WRITE-BACK — v0.111.0
// =============================================================================
// Applies an agent's approved/autopilot draftOutput to the source entity.
// Called from:
//   - agent-engine.ts  (autopilot path — editorial/substantive risk)
//   - /api/agents/review/[id] (human approval path — regulatory/safety-critical)
//
// Each agentId has a dedicated handler that knows which API endpoint to PATCH
// and how to map the draftOutput shape to the request body.
//
// Agents without a handler yet log a warning but do not throw — the run still
// succeeds. Add handlers as each agent matures.
// =============================================================================

import type { AgentId } from '@/types/agents';

const BASE = import.meta.env.VITE_APP_URL ?? 'http://localhost:3000';

export interface WriteBackPayload {
  agentId: AgentId;
  entityType: string;
  entityId: string;
  draftOutput: unknown;
  tenantId: string;
  initiatedBy: string;
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function internalPatch(path: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-agent': '1',
        'x-agent-write-back': '1',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[write-back] PATCH ${path} → ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[write-back] PATCH ${path} threw:`, e);
    return false;
  }
}

async function internalPut(path: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-agent': '1',
        'x-agent-write-back': '1',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[write-back] PUT ${path} → ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[write-back] PUT ${path} threw:`, e);
    return false;
  }
}

// ── HAQ Response — writes draft response text back to the HAQ record ──────────

async function applyHAQResponse(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as {
    haqId?: string;
    responseOutline?: string;
    draftSections?: { title: string; content: string }[];
    discipline?: string;
    regulatoryBasis?: string[];
    autopilotApplied?: boolean;
  };

  const haqId = draft.haqId ?? payload.entityId;

  // Build response text from outline + sections
  const sectionText = (draft.draftSections ?? [])
    .map(s => `## ${s.title}\n\n${s.content}`)
    .join('\n\n');

  const responseText = [
    draft.responseOutline ? `**Response Outline**\n\n${draft.responseOutline}` : null,
    sectionText || null,
    draft.regulatoryBasis?.length
      ? `**Regulatory Basis**\n${draft.regulatoryBasis.join('\n')}`
      : null,
  ].filter(Boolean).join('\n\n---\n\n') || draft.responseOutline || '';

  await internalPatch(`/api/haqs/${encodeURIComponent(haqId)}`, {
    responseText,
    status: draft.autopilotApplied ? 'draft-ready' : 'in-progress',
  });
}

// ── ICSR Processing — writes narrative + MedDRA coding back to the case ───────

async function applyICSRProcessing(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as {
    caseId?: string;
    narrativeDraft?: string;
    suggestedMeddraPT?: string;
    suggestedMeddraHLT?: string;
    suggestedSOC?: string;
    seriousnessAssessment?: string;
    regulatoryDeadline?: string;
    requiresExpedited?: boolean;
    autopilotApplied?: boolean;
  };

  const caseId = draft.caseId ?? payload.entityId;

  await internalPatch(`/api/safety/${encodeURIComponent(caseId)}`, {
    eventDescription: draft.narrativeDraft ?? undefined,
    seriousness: draft.seriousnessAssessment === 'Non-serious' ? 'non-serious' : 'serious',
    metadata: {
      eventTermPreferred: draft.suggestedMeddraPT ?? undefined,
      suggestedHLT: draft.suggestedMeddraHLT ?? undefined,
      suggestedSOC: draft.suggestedSOC ?? undefined,
      regulatoryDeadline: draft.regulatoryDeadline ?? undefined,
      expeditedReport: draft.requiresExpedited ?? false,
      agentNarrativeDraft: draft.narrativeDraft ?? undefined,
      agentWriteBackAt: new Date().toISOString(),
    },
  });
}

// ── Document Resolution — resolves the comment in the authoring module ────────

async function applyDocumentResolution(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as {
    commentId?: string;
    proposedResolution?: string;
    proposedStatus?: 'resolved' | 'rejected';
    regulatoryBasis?: string;
    autopilotApplied?: boolean;
  };

  const commentId = draft.commentId ?? payload.entityId;

  await internalPut(`/api/authoring/comments/${encodeURIComponent(commentId)}`, {
    status: draft.proposedStatus ?? 'resolved',
    resolutionNote: draft.proposedResolution ?? undefined,
    resolvedBy: `agent:${payload.initiatedBy}`,
  });
}

// ── Signal Intelligence — updates safety signal with agent assessment ─────────

async function applySignalIntelligence(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as Record<string, unknown>;
  const signalId = draft['signalId'] as string ?? payload.entityId;
  // Safety signals currently use a metadata-based update
  await internalPatch(`/api/safety/signals/${encodeURIComponent(signalId)}`, {
    agentAssessment: draft,
    agentAssessedAt: new Date().toISOString(),
    agentId: payload.agentId,
  });
}

// ── Submission Assembly — updates submission readiness fields ─────────────────

async function applySubmissionAssembly(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as Record<string, unknown>;
  const submissionId = draft['submissionId'] as string ?? payload.entityId;
  await internalPatch(`/api/submissions/${encodeURIComponent(submissionId)}`, {
    qcStatus: 'Agent Review Complete',
    metadata: {
      agentReadinessAssessment: draft,
      agentAssessedAt: new Date().toISOString(),
    },
  });
}

// ── Quality Intelligence — updates CAPA or deviation record ──────────────────

async function applyQualityIntelligence(payload: WriteBackPayload): Promise<void> {
  const draft = payload.draftOutput as Record<string, unknown>;
  const entityId = payload.entityId;
  // Route to CAPA or deviation based on entityType
  const path = payload.entityType === 'capa'
    ? `/api/quality/capas/${encodeURIComponent(entityId)}`
    : `/api/quality/deviations/${encodeURIComponent(entityId)}`;
  await internalPatch(path, {
    agentAssessment: draft,
    agentAssessedAt: new Date().toISOString(),
  });
}

// ── Registry ──────────────────────────────────────────────────────────────────

const WRITE_BACK_HANDLERS: Partial<Record<AgentId, (p: WriteBackPayload) => Promise<void>>> = {
  'haq-response':        applyHAQResponse,
  'icsr-processing':     applyICSRProcessing,
  'document-resolution': applyDocumentResolution,
  'signal-intelligence': applySignalIntelligence,
  'submission-assembly': applySubmissionAssembly,
  'quality-intelligence': applyQualityIntelligence,
};

// ── Public entry point ────────────────────────────────────────────────────────

export async function applyAgentOutput(payload: WriteBackPayload): Promise<void> {
  const handler = WRITE_BACK_HANDLERS[payload.agentId];

  if (!handler) {
    // Agents without a handler yet — log and continue gracefully
    console.info(
      `[write-back] No handler for agent "${payload.agentId}" — ` +
      `output not written back to ${payload.entityType}:${payload.entityId}. ` +
      `Add a handler in agent-write-back.ts when this agent is production-ready.`
    );
    return;
  }

  try {
    await handler(payload);
    console.info(
      `[write-back] ${payload.agentId} wrote back to ` +
      `${payload.entityType}:${payload.entityId} (tenant: ${payload.tenantId})`
    );
  } catch (e) {
    // Write-back failures must not crash the agent run — log and continue
    console.error(`[write-back] handler for "${payload.agentId}" threw:`, e);
  }
}
