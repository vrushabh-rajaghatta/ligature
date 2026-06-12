
// =============================================================================
// useLixAgent — v0.117.0
// =============================================================================
// Fetches the most recent agent run for a given module scope and returns a
// ready-to-render LixStatus + message for LixInlineAlert / LixPanel.
//
// Maps agent IDs to Lix module scopes so screens don't need to know
// about the agent system internals.
//
// Usage:
//   const lix = useLixAgent('Signal');
//   if (lix.status !== 'monitoring') {
//     return <LixInlineAlert moduleScope="Signal" message={lix.message} ... />
//   }
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import type { LixModuleScope, LixStatus } from '@/types/lix';
import type { AgentRun, AgentId } from '@/types/agents';

// ── Module → agent ID mapping ─────────────────────────────────────────────────

const MODULE_AGENTS: Record<LixModuleScope, AgentId[]> = {
  HAQ:       ['haq-response'],
  Signal:    ['signal-intelligence', 'icsr-processing'],
  Submit:    ['submission-assembly'],
  QMS:       ['quality-intelligence'],
  TMF:       ['document-resolution'],
  CTMS:      ['site-monitoring', 'study-operations'],
  Safety:    ['signal-intelligence', 'icsr-processing', 'medical-monitor'],
  Portfolio: ['portfolio-intelligence'],
  Authoring: ['document-resolution'],
  CMC:       ['cmc-lifecycle'],
  Research:  ['research-intelligence', 'lead-optimisation'],
};

// ── Run → Lix status mapping ─────────────────────────────────────────────────

function runToLixStatus(run: AgentRun): LixStatus {
  switch (run.status) {
    case 'running':   return 'processing';
    case 'escalated': return 'review_required';
    case 'completed':
    case 'approved':
    case 'rejected':  return 'complete';
    case 'failed':    return 'monitoring'; // degrade gracefully
    default:          return 'monitoring';
  }
}

function runToMessage(run: AgentRun): string {
  if (run.status === 'running') {
    return `Processing ${run.triggerEntityId}…`;
  }
  if (run.status === 'escalated') {
    return `${run.triggerEntityId} requires your review before proceeding.`;
  }
  if (run.status === 'completed' || run.status === 'approved') {
    return run.decision?.slice(0, 120) ?? `${run.triggerEntityId} processed — action applied automatically.`;
  }
  if (run.status === 'rejected') {
    return `${run.triggerEntityId} — action rejected. No changes applied.`;
  }
  return '';
}

function runToSeverity(run: AgentRun): 'info' | 'warn' | 'flag' {
  if (run.status === 'escalated') return 'flag';
  if (run.riskLevel === 'regulatory' || run.riskLevel === 'safety-critical') return 'warn';
  return 'info';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'just now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface LixAgentState {
  status: LixStatus;
  message: string;
  severity: 'info' | 'warn' | 'flag';
  timestamp: string | null;
  run: AgentRun | null;
  loading: boolean;
  /** Action label for the inline alert CTA */
  actionLabel: string | null;
  /** Navigate to Agent Hub review queue */
  reviewUrl: string;
}

const EMPTY: LixAgentState = {
  status: 'monitoring',
  message: '',
  severity: 'info',
  timestamp: null,
  run: null,
  loading: true,
  actionLabel: null,
  reviewUrl: '/agent-hub',
};

export function useLixAgent(moduleScope: LixModuleScope, pollMs = 30_000): LixAgentState {
  const [state, setState] = useState<LixAgentState>(EMPTY);

  const agentIds = MODULE_AGENTS[moduleScope] ?? [];

  const fetch_ = useCallback(async () => {
    if (agentIds.length === 0) {
      setState(s => ({ ...s, loading: false, status: 'monitoring' }));
      return;
    }
    try {
      const res = await fetch('/api/agents/runs');
      const json = await res.json();
      const runs: AgentRun[] = json.data ?? [];

      // Find most recent run for this module's agents
      const relevant = runs
        .filter(r => agentIds.includes(r.agentId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Prioritise: escalated > running > completed (last 5 min) > monitoring
      const escalated = relevant.find(r => r.status === 'escalated');
      const running   = relevant.find(r => r.status === 'running');
      const recent    = relevant.find(r => {
        const age = Date.now() - new Date(r.createdAt).getTime();
        return (r.status === 'completed' || r.status === 'approved') && age < 300_000;
      });

      const active = escalated ?? running ?? recent ?? null;

      if (!active) {
        setState(s => ({ ...s, loading: false, status: 'monitoring', run: null, message: '', timestamp: null, actionLabel: null }));
        return;
      }

      setState({
        status:      runToLixStatus(active),
        message:     runToMessage(active),
        severity:    runToSeverity(active),
        timestamp:   timeAgo(active.createdAt),
        run:         active,
        loading:     false,
        actionLabel: active.status === 'escalated' ? 'Review now' : active.status === 'running' ? null : 'View run',
        reviewUrl:   '/agent-hub',
      });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, [agentIds.join(',')]); // eslint-disable-line

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, pollMs);
    return () => clearInterval(t);
  }, [fetch_, pollMs]);

  return state;
}
