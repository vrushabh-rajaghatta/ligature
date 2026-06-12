
import { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import {
  Bot, Zap, Clock, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, ChevronDown, ChevronUp, ThumbsUp,
  ThumbsDown, Shield, FileText, HelpCircle, Activity,
  Loader2, ArrowRight, Database, Eye, Search, Pencil, Circle,
  PauseCircle, PlayCircle, ExternalLink,
  ShieldAlert, ClipboardCheck, Target, FlaskConical, Sparkles,
} from 'lucide-react';
import type { AgentRun, AgentReviewRequest, AgentId, AgentRiskLevel, AgentToolCall } from '@/types/agents';
import { AGENT_DISPLAY } from '@/types/agents';
import { HAAgentPanel } from '@/components/agents/HAAgentPanel'; // v0.125.78
import { CandidateTargetingPanel } from '@/components/agents/CandidateTargetingPanel'; // v0.125.79
import { ExperimentDesignPanel }   from '@/components/agents/ExperimentDesignPanel';   // v0.125.80
import { PMDAAgentPanel }          from '@/components/agents/PMDAAgentPanel';          // v0.125.83
import { useAppStore } from '@/store/useAppStore';
import { useProductFilter } from '@/hooks/useProductFilter';

// ── Colour helpers ────────────────────────────────────────────────────────────

const RISK_COLORS: Record<AgentRiskLevel, string> = {
  'editorial':       'bg-green-500/15 text-green-400 border-green-500/30',
  'substantive':     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'regulatory':      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'safety-critical': 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_ICON: Record<AgentRun['status'], ReactNode> = {
  running:   <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  escalated: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  approved:  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />,
  rejected:  <XCircle className="w-3.5 h-3.5 text-red-400" />,
  failed:    <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

const TOOL_ICON: Record<string, ReactNode> = {
  read_comment:            <Database className="w-3 h-3 text-blue-400" />,
  read_haq:                <Database className="w-3 h-3 text-blue-400" />,
  read_icsr_case:          <Database className="w-3 h-3 text-blue-400" />,
  read_document_section:   <FileText className="w-3 h-3 text-blue-400" />,
  search_precedent:        <Search className="w-3 h-3 text-purple-400" />,
  suggest_meddra_coding:   <Search className="w-3 h-3 text-purple-400" />,
  draft_narrative:         <Pencil className="w-3 h-3 text-teal-400" />,
  set_regulatory_deadline: <Clock className="w-3 h-3 text-amber-400" />,
  set_risk_level:          <Shield className="w-3 h-3 text-amber-400" />,
  set_draft_output:        <Eye className="w-3 h-3 text-teal-400" />,
};

const AGENT_ICON: Record<string, ReactNode> = {
  'document-resolution':  <FileText className="w-4 h-4" />,
  'haq-response':         <HelpCircle className="w-4 h-4" />,
  'icsr-processing':      <Shield className="w-4 h-4" />,
  'site-monitoring':      <Activity className="w-4 h-4" />,
  'submission-assembly':  <FileText className="w-4 h-4" />,
  'signal-intelligence':  <AlertTriangle className="w-4 h-4" />,
  'ha-inspection':        <ShieldAlert className="w-4 h-4" />,
  'ha-dossier':           <ClipboardCheck className="w-4 h-4" />,
  'ha-predictive-haq':    <Sparkles className="w-4 h-4" />,
  'candidate-targeting':  <Target className="w-4 h-4" />,
  'experiment-design':    <FlaskConical className="w-4 h-4" />,
  'pmda-inspection':      <ShieldAlert className="w-4 h-4" />,
  'pmda-dossier':         <ClipboardCheck className="w-4 h-4" />,
  'pmda-advisory':        <Sparkles className="w-4 h-4" />,
  'quality-intelligence': <CheckCircle2 className="w-4 h-4" />,
  'reg-strategy':         <Eye className="w-4 h-4" />,
  'nonclinical-package':  <Database className="w-4 h-4" />,
  'research-intelligence':<Search className="w-4 h-4" />,
  'study-operations':     <Activity className="w-4 h-4" />,
  'labeling-management':  <FileText className="w-4 h-4" />,
  'cmc-lifecycle':        <Database className="w-4 h-4" />,
  'medical-monitor':      <Shield className="w-4 h-4" />,
  'biostatistician':      <Activity className="w-4 h-4" />,
  'medical-affairs':      <Eye className="w-4 h-4" />,
  'lead-optimisation':    <Search className="w-4 h-4" />,
};

// ── Draft output renderer ─────────────────────────────────────────────────────

function DraftOutputBlock({ draftOutput }: { draftOutput: unknown }) {
  const [open, setOpen] = useState(false);
  if (!draftOutput) return null;

  // Pretty-render structured draft outputs
  const d = draftOutput as Record<string, unknown>;

  // Collect renderable fields in display priority order
  const sections: { label: string; value: string }[] = [];

  // HAQ response outline
  if (typeof d.responseOutline === 'string') sections.push({ label: 'Response outline', value: d.responseOutline });
  // Doc resolution proposed text
  if (typeof d.proposedResolution === 'string') sections.push({ label: 'Proposed resolution', value: d.proposedResolution });
  // ICSR narrative
  if (typeof d.narrativeDraft === 'string') sections.push({ label: 'Narrative draft', value: d.narrativeDraft });
  // Generic text fields
  for (const key of ['summary', 'assessment', 'recommendation', 'findings', 'strategyOutline', 'executiveSummary']) {
    if (typeof d[key] === 'string' && !sections.find(s => s.value === d[key])) {
      sections.push({ label: key.replace(/([A-Z])/g, ' $1').toLowerCase(), value: d[key] as string });
    }
  }
  // HAQ draft sections
  if (Array.isArray(d.draftSections)) {
    (d.draftSections as { title: string; content: string }[]).forEach(s => {
      sections.push({ label: s.title, value: s.content });
    });
  }
  // Fallback: raw JSON
  const hasContent = sections.length > 0;
  const fallback = hasContent ? null : JSON.stringify(draftOutput, null, 2);

  const preview = hasContent
    ? sections[0].value.slice(0, 120)
    : (fallback ?? '').slice(0, 120);

  return (
    <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-teal-500/8 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider flex-1">Agent's proposed output</span>
        {open ? <ChevronUp className="w-3 h-3 text-teal-400/60" /> : <ChevronDown className="w-3 h-3 text-teal-400/60" />}
      </button>
      {!open && (
        <div className="px-3 pb-2 text-[11px] text-text-muted italic truncate">{preview}…</div>
      )}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {hasContent ? sections.map((s, i) => (
            <div key={i}>
              <div className="text-[10px] font-semibold text-teal-400/70 uppercase tracking-wider mb-0.5">{s.label}</div>
              <div className="text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap">{s.value}</div>
            </div>
          )) : (
            <pre className="text-[10px] text-text-muted font-mono whitespace-pre-wrap break-all">{fallback}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reviewer verdict block ────────────────────────────────────────────────────

function ReviewerVerdictBlock({ run }: { run: AgentRun }) {
  if (run.status !== 'approved' && run.status !== 'rejected') return null;
  const isApproved = run.status === 'approved';
  return (
    <div className={`rounded-lg border px-3 py-2 text-[11px] flex items-start gap-2 ${
      isApproved ? 'bg-teal-500/8 border-teal-500/25 text-teal-300' : 'bg-red-500/8 border-red-500/25 text-red-300'
    }`}>
      {isApproved
        ? <ThumbsUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        : <ThumbsDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      <div>
        <span className="font-semibold">{isApproved ? 'Approved' : 'Rejected'} by reviewer</span>
        {/* reviewerNote would come from the linked review request — shown when present on the run */}
        {(run as AgentRun & { reviewerNote?: string }).reviewerNote && (
          <div className="mt-0.5 text-text-secondary">"{(run as AgentRun & { reviewerNote?: string }).reviewerNote}"</div>
        )}
      </div>
    </div>
  );
}

// Tools whose output IS the evidence (what the agent read)
const READ_TOOLS  = new Set(['read_comment','read_haq','read_icsr_case','read_document_section']);
const SEARCH_TOOLS = new Set(['search_precedent','suggest_meddra_coding']);

// ── Tool output formatter ─────────────────────────────────────────────────────

function formatToolOutput(toolName: string, output: unknown): { label: string; value: string; isEvidence: boolean } {
  const out = output as Record<string, unknown> | null;
  if (!out) return { label: 'output', value: '—', isEvidence: false };

  if (toolName === 'read_comment') {
    const content = String(out.content ?? '').slice(0, 200);
    const author = out.authorName ? ` — ${out.authorName}` : '';
    const priority = out.priority ? ` [${out.priority}]` : '';
    return { label: 'comment read', value: `"${content}"${author}${priority}`, isEvidence: true };
  }
  if (toolName === 'read_haq') {
    const q = String(out.questionText ?? out.question ?? '').slice(0, 200);
    const ha = out.healthAuthority ? ` (${out.healthAuthority})` : '';
    return { label: 'question read', value: `"${q}"${ha}`, isEvidence: true };
  }
  if (toolName === 'read_icsr_case') {
    const desc = String(out.eventDescription ?? '').slice(0, 200);
    const pt = out.patientAge ? ` | ${out.patientAge}y ${out.patientSex ?? ''}` : '';
    const drug = out.suspectDrug ? ` | ${out.suspectDrug}` : '';
    return { label: 'case read', value: `${desc}${pt}${drug}`, isEvidence: true };
  }
  if (toolName === 'read_document_section') {
    const content = String(out.content ?? '').slice(0, 200);
    return { label: 'section read', value: `"${content}"`, isEvidence: true };
  }
  if (toolName === 'search_precedent') {
    const results = Array.isArray(out.results) ? out.results : [];
    const top = results[0] as Record<string, unknown> | undefined;
    const summary = top
      ? `${results.length} results — top: "${String(top.summary ?? '').slice(0, 120)}" (${top.relevance})`
      : 'No results';
    return { label: 'search results', value: summary, isEvidence: true };
  }
  if (toolName === 'suggest_meddra_coding') {
    return {
      label: 'MedDRA suggestion',
      value: `PT: ${out.pt} | HLT: ${out.hlt} | SOC: ${out.soc} | confidence: ${out.confidence}`,
      isEvidence: true,
    };
  }
  if (toolName === 'set_risk_level') {
    return { label: 'risk classified', value: String(out.riskLevel ?? ''), isEvidence: false };
  }
  if (toolName === 'set_regulatory_deadline') {
    const d = out.deadline ? new Date(out.deadline as string).toLocaleDateString() : '';
    const clock = out.clockDays ? `${out.clockDays}-day clock` : '';
    const exp = out.requiresExpedited ? ' — EXPEDITED' : '';
    return { label: 'deadline set', value: `${clock} → ${d}${exp}`, isEvidence: false };
  }
  if (toolName === 'set_draft_output') {
    return { label: 'output set', value: '(see proposed action)', isEvidence: false };
  }
  return { label: 'output', value: JSON.stringify(out).slice(0, 150), isEvidence: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function durationLabel(ms: number): string {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

interface AgentStats {
  totalRuns: number;
  autopilotRate: number;
  pendingReviews: number;
  avgDurationMs: number;
}

// ── Tool call trace ───────────────────────────────────────────────────────────

function ToolCallTrace({ toolCalls, evidenceOnly = false }: { toolCalls: AgentToolCall[]; evidenceOnly?: boolean }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const calls = evidenceOnly
    ? toolCalls.filter(tc => READ_TOOLS.has(tc.toolName) || SEARCH_TOOLS.has(tc.toolName))
    : toolCalls;
  if (calls.length === 0) return <div className="text-xs text-text-muted italic">No data reads recorded</div>;

  return (
    <div className="space-y-1">
      {calls.map((tc, i) => {
        const { label, value, isEvidence } = formatToolOutput(tc.toolName, tc.output);
        const isExpanded = expandedIdx === i;
        const icon = TOOL_ICON[tc.toolName] ?? <Database className="w-3 h-3 text-text-muted" />;

        return (
          <div key={i} className={`rounded-lg border overflow-hidden ${
            isEvidence
              ? 'border-blue-500/20 bg-blue-500/5'
              : SEARCH_TOOLS.has(tc.toolName)
              ? 'border-purple-500/20 bg-purple-500/5'
              : 'border-border bg-surface-card'
          }`}>
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-card/50 transition-colors"
            >
              <span className="flex-shrink-0">{icon}</span>
              <span className="font-mono text-xs font-medium text-text-primary flex-shrink-0">{tc.toolName}</span>
              <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
              <span className={`text-xs flex-1 truncate ${isEvidence ? 'text-text-primary' : 'text-text-muted'}`}>
                {value}
              </span>
              <span className="text-[10px] text-text-muted flex-shrink-0 mr-1">{tc.durationMs}ms</span>
              {isExpanded
                ? <ChevronUp className="w-3 h-3 text-text-muted flex-shrink-0" />
                : <ChevronDown className="w-3 h-3 text-text-muted flex-shrink-0" />}
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border/50">
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Input</div>
                  <pre className="text-xs text-text-secondary bg-surface rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(tc.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Full output</div>
                  <pre className="text-xs text-text-primary bg-surface rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(tc.output, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'teal' }: {
  icon: ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  const c: Record<string, string> = {
    teal:   'bg-teal-500/10 border-teal-500/20 text-teal-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${c[color]}`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs font-medium">{label}</div>
        {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const display = AGENT_DISPLAY[run.agentId] ?? { name: run.agentId, persona: '', color: 'gray' };
  const evidenceCall = run.toolCalls.find(tc => READ_TOOLS.has(tc.toolName));
  const evidenceSummary = evidenceCall
    ? formatToolOutput(evidenceCall.toolName, evidenceCall.output).value.slice(0, 90)
    : null;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-card text-left transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-surface-card flex items-center justify-center text-text-muted flex-shrink-0">
          {AGENT_ICON[run.agentId] ?? <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{display.name}</span>
            <button
              onClick={e => { e.stopPropagation(); const mod = ENTITY_MODULE_MAP[run.triggerEntityType]; if (mod) useAppStore.getState().setActiveModule(mod as any); }}
              className="text-xs text-accent-blue font-mono hover:underline inline-flex items-center gap-0.5"
              title={`Open ${run.triggerEntityType} in source module`}
            >
              {run.triggerEntityType}/{run.triggerEntityId} <ExternalLink className="w-2.5 h-2.5" />
            </button>
            {run.riskLevel && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${RISK_COLORS[run.riskLevel]}`}>
                {run.riskLevel}
              </span>
            )}
            {run.autopilot && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-teal-500/10 text-teal-400 border-teal-500/30 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> autopilot
              </span>
            )}
          </div>
          {evidenceSummary ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Database className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-text-muted truncate italic">"{evidenceSummary}"</span>
            </div>
          ) : run.decision ? (
            <div className="text-xs text-text-muted mt-0.5 truncate">{run.decision.slice(0, 100)}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {STATUS_ICON[run.status]}
          <span className="text-xs text-text-muted">{durationLabel(run.durationMs)}</span>
          <span className="text-xs text-text-muted">{timeAgo(run.createdAt)}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          {run.riskRationale && (
            <div className={`rounded-lg px-3 py-2 border text-xs ${run.riskLevel ? RISK_COLORS[run.riskLevel] : 'border-border'}`}>
              <span className="font-semibold">Risk rationale: </span>{run.riskRationale}
            </div>
          )}
          {run.toolCalls.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">What the agent read and did</div>
              <ToolCallTrace toolCalls={run.toolCalls} />
            </div>
          )}
          {run.decision && (
            <div className="bg-surface-card rounded-lg px-3 py-2">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Decision</div>
              <div className="text-xs text-text-primary">{run.decision}</div>
            </div>
          )}
          {run.draftOutput && <DraftOutputBlock draftOutput={run.draftOutput} />}
          <ReviewerVerdictBlock run={run} />
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { label: 'Tokens',   value: run.tokensUsed.toLocaleString() },
              { label: 'Duration', value: durationLabel(run.durationMs) },
              { label: 'Model',    value: run.model.replace('claude-', '') },
              { label: 'Trigger',  value: run.triggeredBy },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-card rounded px-2 py-1.5">
                <div className="text-text-muted">{label}</div>
                <div className="font-medium text-text-primary truncate">{value}</div>
              </div>
            ))}
          </div>
          {run.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-xs text-red-400">{run.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  proposedResolution:  'Proposed resolution',
  proposedStatus:      'Status to apply',
  regulatoryBasis:     'Regulatory basis',
  discipline:          'Discipline',
  responseOutline:     'Response outline',
  recommendedReviewer: 'Recommended reviewer',
  precedentIds:        'Precedent references',
  seriousnessAssessment: 'Seriousness assessment',
  suggestedMeddraPT:   'MedDRA preferred term',
  suggestedMeddraHLT:  'High level term',
  suggestedSOC:        'System organ class',
  narrativeDraft:      'Draft narrative',
  regulatoryDeadline:  'Regulatory deadline',
  requiresExpedited:   'Expedited report',
};

function ReviewCard({ req, onDecision }: { req: AgentReviewRequest; onDecision: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [sourceRun, setSourceRun] = useState<AgentRun | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);

  const display = AGENT_DISPLAY[req.agentId] ?? { name: req.agentId, persona: '', color: 'gray' };
  const hoursLeft = Math.max(0, Math.floor((new Date(req.dueAt).getTime() - Date.now()) / 3600_000));
  const isUrgent = hoursLeft < 12;

  useEffect(() => {
    if (!expanded || sourceRun || loadingRun) return;
    setLoadingRun(true);
    fetch(`/api/agents/runs/${req.agentRunId}`)
      .then(r => r.json())
      .then(j => setSourceRun(j.data ?? null))
      .catch(() => {})
      .finally(() => setLoadingRun(false));
  }, [expanded, req.agentRunId, sourceRun, loadingRun]);

  async function decide(outcome: 'approved' | 'rejected') {
    setSubmitting(true);
    try {
      await fetch(`/api/agents/review/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, reviewerNote: note || undefined }),
      });
      // Fire-and-forget feedback to learning layer
      fetch('/api/agents/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: req.id,
          agentId: req.agentId,
          entityType: req.entityType,
          originalRiskLevel: req.riskLevel,
          outcome,
          humanAgreedRisk: outcome !== 'rejected',
          improvementNote: note || null,
        }),
      }).catch(() => {});
      onDecision();
    } finally {
      setSubmitting(false);
    }
  }

  const draft = req.draftOutput as Record<string, unknown>;

  return (
    <div className={`rounded-xl border overflow-hidden ${isUrgent ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-surface-elevated'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-card text-left transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-surface-card flex items-center justify-center text-text-muted flex-shrink-0">
          {AGENT_ICON[req.agentId] ?? <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{req.entityLabel}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${RISK_COLORS[req.riskLevel]}`}>
              {req.riskLevel}
            </span>
            {isUrgent && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-400 border-amber-500/40 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {hoursLeft}h left
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate">{req.summary}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-muted">{display.name}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">

          {/* 1. What the agent read */}
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-blue-400" /> Source data — what the agent read
            </div>
            {loadingRun ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading...
              </div>
            ) : sourceRun ? (
              <ToolCallTrace toolCalls={sourceRun.toolCalls} evidenceOnly={true} />
            ) : (
              <div className="text-xs text-text-muted italic">No source data available</div>
            )}
          </div>

          {/* Why human review is needed */}
          {sourceRun?.riskRationale && (
            <div className={`rounded-lg px-3 py-2 border text-xs ${RISK_COLORS[req.riskLevel]}`}>
              <span className="font-semibold">Why your review is needed: </span>
              {sourceRun.riskRationale}
            </div>
          )}

          {/* 2. What the agent wants to do */}
          {draft && (
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-teal-400" /> Proposed action
              </div>
              <div className="bg-surface-card rounded-lg p-3 space-y-3">
                {Object.entries(draft).map(([k, v]) => {
                  if (v === undefined || v === null) return null;
                  const label = FIELD_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').toLowerCase();
                  const displayVal = Array.isArray(v)
                    ? v.join(', ')
                    : typeof v === 'boolean'
                    ? (v ? 'Yes' : 'No')
                    : String(v);
                  return (
                    <div key={k}>
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</div>
                      <div className="text-xs text-text-primary mt-0.5 whitespace-pre-wrap">{displayVal}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Decision */}
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Your decision</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note — recorded in the audit trail..."
              className="w-full bg-surface rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/50 mb-2"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => decide('approved')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 text-sm font-medium hover:bg-teal-500/25 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                Approve & apply
              </button>
              <button
                onClick={() => decide('rejected')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cascade panel ─────────────────────────────────────────────────────────────

const CASCADE_CONFIGS = [
  {
    type: 'signal-to-label',
    label: 'Signal → Label → CAPA',
    description: 'Signal Intelligence validates signal → Labeling drafts SmPC change → Quality initiates CAPA',
    color: 'coral',
    steps: ['Signal Intelligence', 'Labeling Management', 'Quality Intelligence'],
    params: [
      { key: 'signalId', label: 'Signal ID', default: 'SIG-2026-001' },
      { key: 'productId', label: 'Product ID', default: 'prod-001' },
    ],
  },
  {
    type: 'db-lock-to-submission',
    label: 'DB Lock → CSR → Submission',
    description: 'Study Operations confirms lock → Document Resolution processes CSR comments → Submission Assembly rescores',
    color: 'teal',
    steps: ['Study Operations', 'Document Resolution', 'Submission Assembly'],
    params: [
      { key: 'studyId', label: 'Study ID', default: 'LIG-2847-301' },
      { key: 'submissionId', label: 'Submission ID', default: 'SUB-001' },
    ],
  },
  {
    type: 'haq-cross-functional',
    label: 'HAQ → Cross-functional → Package',
    description: 'HAQ Response classifies → Signal Intelligence provides safety context → Submission Assembly flags slot',
    color: 'purple',
    steps: ['HAQ Response', 'Signal Intelligence (if safety)', 'Submission Assembly'],
    params: [
      { key: 'haqId', label: 'HAQ ID', default: 'IR-2026-001' },
      { key: 'submissionId', label: 'Submission ID', default: 'SUB-001' },
    ],
  },
  {
    type: 'ind-nda-gate1-nomination',
    label: 'IND/NDA Gate 1 — Candidate nomination',
    description: 'Lead Optimisation scores series → Reg Strategy maps IND pathway (Phase 4)',
    color: 'green',
    steps: ['Lead Optimisation', 'Reg Strategy'],
    params: [
      { key: 'seriesId', label: 'Series ID', default: 'series-kras-g12c-3' },
      { key: 'productId', label: 'Product ID', default: 'prod-001' },
    ],
  },
  {
    type: 'ind-nda-gate2-ind-readiness',
    label: 'IND/NDA Gate 2 — IND readiness',
    description: 'Nonclinical Package checks ICH M3(R2) → Reg Strategy confirms IND filing plan (Phase 4)',
    color: 'amber',
    steps: ['Nonclinical Package', 'Reg Strategy'],
    params: [
      { key: 'studyId', label: 'Study ID', default: 'GLP-2025-047' },
      { key: 'productId', label: 'Product ID', default: 'prod-001' },
    ],
  },
  {
    type: 'ind-nda-gate3-site-readiness',
    label: 'IND/NDA Gate 3 — Phase 3 site readiness',
    description: 'Site Monitoring scores sites → Signal Intelligence checks safety → Study Operations go/no-go (Phase 4)',
    color: 'teal',
    steps: ['Site Monitoring', 'Signal Intelligence', 'Study Operations'],
    params: [
      { key: 'studyId', label: 'Study ID', default: 'LIG-2847-301' },
      { key: 'siteId', label: 'Site ID', default: 'SITE-001' },
      { key: 'productId', label: 'Product ID', default: 'prod-001' },
    ],
  },
  {
    type: 'ind-nda-gate4-nda-assembly',
    label: 'IND/NDA Gate 4 — NDA assembly',
    description: 'Biostats → Study Ops → Doc Resolution → Signal Intel → QA → Submission Assembly (Phase 4)',
    color: 'purple',
    steps: ['Biostatistician', 'Study Operations', 'Document Resolution', 'Signal Intelligence', 'Quality Intelligence', 'Submission Assembly'],
    params: [
      { key: 'studyId', label: 'Study ID', default: 'LIG-2847-301' },
      { key: 'submissionId', label: 'Submission ID', default: 'SUB-001' },
      { key: 'productId', label: 'Product ID', default: 'prod-001' },
    ],
  },
];

// ── Types for cascade state display ──────────────────────────────────────────

interface CascadeStateItem {
  cascadeId: string;
  cascadeType: string;
  status: 'running' | 'suspended' | 'completed' | 'failed';
  steps: Array<{ stepIndex: number; agentId: string; status: string; summary: string }>;
  nextStepIndex: number;
  blockedByReviewIds: string[];
  startedAt: string;
  updatedAt: string;
  error?: string;
}

function CascadePanel({ onTriggered }: { onTriggered: () => void }) {
  const { selectedProductId } = useProductFilter();
  const activeProductId = selectedProductId ?? 'lig-2847';
  const resolvedCascadeConfigs = useMemo(
    () => CASCADE_CONFIGS.map(cfg => ({
      ...cfg,
      params: cfg.params.map(p =>
        p.key === 'productId' ? { ...p, default: activeProductId } : p
      ),
    })),
    [activeProductId]
  );
  const [activeCascade, setActiveCascade] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ steps: Array<{ agentId: string; status: string; summary: string }>; status?: string; suspendedAtStep?: number; blockedByReviewIds?: string[]; error?: string; demoMode?: boolean } | null>(null);
  const [liveStates, setLiveStates] = useState<CascadeStateItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  const fetchLiveStates = useCallback(async () => {
    setLoadingStates(true);
    try {
      const res = await fetch('/api/agents/cascade');
      if (res.ok) {
        const json = await res.json();
        setLiveStates(json.data ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoadingStates(false);
    }
  }, []);

  useEffect(() => { fetchLiveStates(); }, [fetchLiveStates]);

  function selectCascade(type: string) {
    setActiveCascade(type);
    const config = resolvedCascadeConfigs.find(c => c.type === type);
    if (config) {
      const defaults: Record<string, string> = {};
      config.params.forEach(p => { defaults[p.key] = p.default; });
      setParams(defaults);
    }
    setResult(null);
  }

  async function runCascade() {
    if (!activeCascade) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/agents/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cascadeType: activeCascade, ...params }),
      });
      const json = await res.json();
      if (json.demoMode) {
        setResult({ steps: json.steps ?? [], demoMode: true });
      } else if (json.data?.steps) {
        setResult({ steps: json.data.steps, status: json.data.status, suspendedAtStep: json.data.suspendedAtStep, blockedByReviewIds: json.data.blockedByReviewIds });
      } else {
        setResult({ steps: [], error: JSON.stringify(json.error ?? json).slice(0, 200) });
      }
      onTriggered();
      fetchLiveStates();
    } catch (e) {
      setResult({ steps: [], error: String(e) });
    } finally {
      setRunning(false);
    }
  }

  const config = resolvedCascadeConfigs.find(c => c.type === activeCascade);
  const colorMap: Record<string, string> = {
    coral:  'border-red-500/30 bg-red-500/5',
    teal:   'border-teal-500/30 bg-teal-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    green:  'border-green-500/30 bg-green-500/5',
    amber:  'border-amber-500/30 bg-amber-500/5',
  };
  const labelColorMap: Record<string, string> = {
    coral:  'bg-red-500/15 text-red-400 border-red-500/30',
    teal:   'bg-teal-500/15 text-teal-400 border-teal-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    green:  'bg-green-500/15 text-green-400 border-green-500/30',
    amber:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  const suspended = liveStates.filter(s => s.status === 'suspended');

  return (
    <div className="space-y-4">
      {/* ── Suspended cascades banner ── */}
      {suspended.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">{suspended.length} cascade{suspended.length > 1 ? 's' : ''} suspended — awaiting human review</span>
            <button onClick={fetchLiveStates} className="ml-auto text-text-muted hover:text-text-secondary">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStates ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {suspended.map(cs => (
            <div key={cs.cascadeId} className="bg-surface-card rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary">{cs.cascadeType}</span>
                <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">suspended at step {cs.nextStepIndex}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {cs.steps.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${
                      s.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      s.status === 'escalated' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-surface text-text-muted'
                    }`}>{s.agentId}</span>
                    {i < cs.steps.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-text-muted" />}
                  </span>
                ))}
              </div>
              {cs.blockedByReviewIds.length > 0 && (
                <div className="text-[11px] text-text-muted">
                  Blocked by: {cs.blockedByReviewIds.map(id => (
                    <span key={id} className="font-mono text-amber-400">{id}</span>
                  ))}
                  <span className="ml-1">— approve in Review Queue to resume</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-text-muted">
        Cross-domain cascades fire multiple agents in sequence — each agent&apos;s output feeds the next. Cascades pause automatically when a step requires human review and resume once approved.
      </div>

      {resolvedCascadeConfigs.map(c => (
        <div
          key={c.type}
          onClick={() => selectCascade(c.type)}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            activeCascade === c.type
              ? colorMap[c.color]
              : 'border-border bg-surface-elevated hover:border-border-secondary'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-text-primary">{c.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${labelColorMap[c.color]}`}>P3</span>
              </div>
              <p className="text-xs text-text-muted mb-2">{c.description}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {c.steps.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-[11px] bg-surface-card text-text-secondary px-2 py-0.5 rounded">{s}</span>
                    {i < c.steps.length - 1 && <ArrowRight className="w-3 h-3 text-text-muted" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {activeCascade && config && (
        <div className={`rounded-xl border p-4 space-y-3 ${colorMap[config.color]}`}>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Parameters</div>
          <div className="grid grid-cols-2 gap-2">
            {config.params.map(p => (
              <div key={p.key}>
                <label className="text-xs text-text-muted mb-1 block">{p.label}</label>
                <input
                  value={params[p.key] ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
            ))}
          </div>
          <button
            onClick={runCascade}
            disabled={running}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 border ${labelColorMap[config.color]}`}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? 'Cascade running...' : `Fire ${config?.label ?? ''}`}
          </button>

          {result && (
            <div className="space-y-2">
              {result.demoMode && (
                <div className="text-xs text-text-muted italic">Demo mode — no ANTHROPIC_API_KEY</div>
              )}
              {result.status === 'suspended' && (
                <div className="flex items-center gap-2 bg-amber-500/10 rounded px-3 py-2">
                  <PauseCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300">Suspended at step {result.suspendedAtStep} — awaiting review approval to continue</span>
                </div>
              )}
              {result.status === 'completed' && (
                <div className="flex items-center gap-2 bg-green-500/10 rounded px-3 py-2">
                  <PlayCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="text-xs text-green-300">Cascade completed — all steps finished</span>
                </div>
              )}
              {result.error && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{result.error}</div>
              )}
              {result.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-card rounded px-3 py-2">
                  <span className="text-[10px] font-mono text-text-muted w-4">{i + 1}</span>
                  <span className="text-xs font-medium text-text-primary flex-1">{s.agentId}</span>
                  {STATUS_ICON[s.status as AgentRun['status']] ?? <Circle className="w-3.5 h-3.5 text-text-muted" />}
                  <span className="text-xs text-text-muted truncate max-w-48">{s.summary}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Trigger panel ─────────────────────────────────────────────────────────────

function PlayIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
}

// What each agent does — shown in the trigger panel description card
const AGENT_DESCRIPTIONS: Record<AgentId, { what: string; when: string; routing: string }> = {
  'ha-inspection': {
    what: 'Simulates a GMP/GCP/GLP inspector from a specific Health Authority. Reviews SOPs, batch records, audit trails, deviation logs, and CAPA closure rates against that agency\'s known inspection focus areas and current guidance.',
    when: 'Before a regulatory inspection, for routine readiness checks, or after a quality event that could attract agency attention.',
    routing: 'All inspection simulation reports require human review before being shared outside Ligature.',
  },
  'ha-predictive-haq': {
    what: 'The highest-value HA mode. Combines internal HAQ precedent from prior Ligature submissions with external precedent (EPARs, PDUFA letters, PMDA reviews) and current dossier content to produce a ranked list of predicted HA questions before filing.',
    when: 'Pre-submission — ideally 8–12 weeks before a planned filing to allow time for proactive dossier strengthening.',
    routing: 'All predicted HAQ lists require senior regulatory review before use in submission strategy.',
  },
  'candidate-targeting': {
    what: 'Searches the disease landscape for drug targets matching a defined mechanistic and commercial profile. Scores candidates against internal capability (chemistry, biology, manufacturing) and external competitive positioning.',
    when: 'Early discovery — when the portfolio team is defining the next therapeutic area or compound class to pursue.',
    routing: 'Top-ranked candidates auto-added to research pipeline watchlist. Novel mechanism candidates escalate to CSO.',
  },
  'pmda-inspection': {
    what: 'Simulates a PMDA GMP/GCP inspector persona. Reviews CMC, QMS, and batch records against Japanese GMP Ordinance, Japanese Pharmacopoeia, and PMDA inspection precedent. Generates Japan-specific findings: Critical / Major / Minor / Observation.',
    when: 'Before PMDA pre-approval inspection or when preparing J-NDA CMC dossier. Identifies JP-specific gaps not flagged by FDA/EMA agents.',
    output: 'Classified findings with regulatory basis, Ligature record deep-links, and remediation guidance.',
    ligatureAdvantage: 'Cross-references live CMC, QMS, Stability, and Batch Record data against PMDA-specific requirements.',
  },
  'pmda-dossier': {
    what: 'Adopts PMDA scientific reviewer perspective to critique the J-NDA dossier. Applies ICH E5(R1) bridging requirements, MHLW notification requirements, and PMDA dossier review precedent.',
    when: 'When preparing for J-NDA submission. Identifies deficiencies, information requests, and Japan-specific data gaps before formal filing.',
    output: 'Dossier findings classified as Deficiency / Information Request / Clarification / Observation with PMDA precedent references.',
    ligatureAdvantage: 'Reads live Regulatory, Clinical, and CMC modules to identify J-NDA gaps against current dossier content.',
  },
  'pmda-advisory': {
    what: 'Strategic J-NDA advisory covering regulatory pathway selection (Standard / Sakigake / Conditional), ICH E5 bridging exemption assessment, J-NDA format requirements, and PMDA pre-submission consultation strategy.',
    when: 'Early in Japan development planning — before committing to bridging study or J-NDA timeline. Also useful when considering Sakigake designation.',
    output: 'Prioritised advisory items (Required / Recommended / Japan-Specific / Optional) with timelines, PMDA precedent, and action plans.',
    ligatureAdvantage: 'Applies compound-specific data from Ligature Research and Clinical modules to personalise bridging eligibility assessment.',
  },
  'experiment-design': {
    what: `Proposes IND-enabling experiment sequences for a nominated candidate. Recommends species selection, dose range, route, and study type based on ICH M3(R2) requirements and the compound's pharmacological profile.`,
    when: 'When a candidate has been nominated for IND-enabling studies and the preclinical package needs to be scoped.',
    routing: 'Standard IND packages autopilot. Novel mechanisms or high-risk compounds escalate to nonclinical team.',
  },
  'ha-dossier': {
    what: 'Adopts the perspective of a specific HA scientific reviewer and critiques a submission dossier — Module 2 summaries, nonclinical/clinical overviews, CMC sections — against that agency\'s known review standards, current guidance, and historical decision precedent.',
    when: 'Pre-submission dossier review, gap analysis before filing, or when preparing responses to anticipated questions.',
    routing: 'Deficiency findings and potential commitments escalate to review queue. Informational gaps autopilot.',
  },
  'document-resolution':   { what: 'Resolves authoring comments — classifies, drafts responses, and routes to the right reviewer.', when: 'A document has open comments needing action.', routing: 'Minor edits autopilot. Substantive changes go to review queue.' },
  'haq-response':          { what: 'Reads a Health Authority Question, searches precedent responses, and drafts a regulatory response outline.', when: 'An HA question arrives that needs a structured response.', routing: 'Factual answers autopilot. Regulatory commitments go to review queue.' },
  'icsr-processing':       { what: 'Processes an adverse event case — codes MedDRA terms, assesses seriousness, and prepares an E2B(R3) narrative.', when: 'A new ICSR case is received and needs processing.', routing: 'Low-urgency cases autopilot. Serious/unexpected events go to review queue.' },
  'site-monitoring':       { what: 'Reviews site performance data, flags protocol deviations, and drafts follow-up action plans.', when: 'A clinical site has monitoring data that needs review.', routing: 'Minor findings autopilot. Major deviations go to review queue.' },
  'submission-assembly':   { what: 'Checks a submission package for completeness — validates required sections, checks document status, flags gaps.', when: 'A submission is being assembled for an upcoming filing.', routing: 'Formatting issues autopilot. Missing data gaps go to review queue.' },
  'signal-intelligence':   { what: 'Evaluates a pharmacovigilance signal — reviews disproportionality stats, case evidence, and recommends label action.', when: 'A safety signal has been validated and needs assessment.', routing: 'Low-strength signals autopilot. Label change recommendations go to review queue.' },
  'quality-intelligence':  { what: 'Assesses a CAPA — evaluates root cause adequacy, checks effectiveness criteria, and drafts closure recommendation.', when: 'A CAPA is ready for effectiveness review.', routing: 'Administrative CAPAs autopilot. Regulatory-impact CAPAs go to review queue.' },
  'reg-strategy':          { what: 'Reviews a product\'s regulatory position — maps gaps against agency requirements and recommends submission strategy.', when: 'A product needs regulatory strategy input or gap assessment.', routing: 'Standard pathways autopilot. Novel designations/strategy go to review queue.' },
  'nonclinical-package':   { what: 'Reviews a GLP study report — checks ICH M3/S guidelines compliance and prepares Module 4 summary.', when: 'A nonclinical study has completed and needs regulatory packaging.', routing: 'Formatting autopilots. Data adequacy issues go to review queue.' },
  'research-intelligence': { what: 'Analyses a research target or lead series — summarises patent landscape, competitive intelligence, and go/no-go signals.', when: 'A discovery target or lead series needs intelligence review.', routing: 'Background research autopilots. Go/no-go recommendations go to review queue.' },
  'study-operations':      { what: 'Reviews clinical study operational metrics — enrollment, protocol deviations, and timeline risk.', when: 'A study needs operational health check or DSMB prep.', routing: 'Admin updates autopilot. Protocol amendments go to review queue.' },
  'labeling-management':   { what: 'Assesses impact of a safety signal on product labeling — maps to label sections and drafts proposed text changes.', when: 'A signal has been confirmed and label review is triggered.', routing: 'Minor clarifications autopilot. New warnings/contraindications go to review queue.' },
  'cmc-lifecycle':         { what: 'Reviews manufacturing changes — classifies variation type (Type IA/IB/II) and prepares variation submission checklist.', when: 'A CMC change has been initiated and needs regulatory classification.', routing: 'Type IA variations autopilot. Type II variations go to review queue.' },
  'medical-monitor':       { what: 'Reviews study safety data — evaluates AE patterns, assesses unblinding triggers, and prepares DSMB briefing.', when: 'A study reaches a safety review milestone.', routing: 'Routine reviews autopilot. Stopping rule triggers go to review queue.' },
  'biostatistician':       { what: 'Performs statistical QC — checks analysis plan adherence, validates table shells, and flags inconsistencies.', when: 'Statistical deliverables are ready for QC review.', routing: 'Formatting issues autopilot. Analysis deviations go to review queue.' },
  'medical-affairs':       { what: 'Reviews medical/promotional materials — checks promotional compliance, off-label risk, and drafts MLR comments.', when: 'A material is submitted for MLR review.', routing: 'Minor copy edits autopilot. Compliance issues go to review queue.' },
  'lead-optimisation':     { what: 'Analyses a lead series — summarises SAR trends, ADMET liabilities, and recommends next synthesis priorities.', when: 'A lead series needs chemistry intelligence review.', routing: 'Trend summaries autopilot. Go/no-go on series go to review queue.' },
  'portfolio-intelligence': { what: 'Reviews the full R&D portfolio — maps pipeline health, regulatory risk, and resource allocation gaps across all programmes.', when: 'Executive or board-level portfolio review is needed.', routing: 'Status summaries autopilot. Strategic recommendations go to review queue.' },
};


// v0.124.2: Entity type → module navigation — entity IDs in run cards become clickable
const ENTITY_MODULE_MAP: Record<string, string> = {
  'haq':        'haq',
  'icsr-case':  'safety',
  'signal':     'signal-detection',
  'comment':    'authoring',
  'submission': 'submissions-hub',
  'site':       'ctms',
  'capa':       'qms',
  'product':    'portfolio',
  'study':      'ctms',
  'target':     'research',
  'material':   'adpromo',
};
const AGENT_DEFAULTS: Record<AgentId, { entityType: string; entityId: string; examples: string[] }> = {
  'ha-inspection':       { entityType: 'facility',   entityId: 'FAC-001',         examples: ['FAC-001', 'FAC-002'] },
  'ha-dossier':          { entityType: 'submission',  entityId: 'NDA-215847',      examples: ['NDA-215847', 'IND-123456'] },
  'ha-predictive-haq':   { entityType: 'submission',  entityId: 'NDA-215847',      examples: ['NDA-215847', 'MAA-EU-2026'] },
  'candidate-targeting': { entityType: 'program',     entityId: 'oncology-kras',   examples: ['oncology-kras', 'immunology-il17'] },
  'experiment-design':   { entityType: 'candidate',   entityId: 'LIG-2847',        examples: ['LIG-2847', 'LIG-5521'] },
  'pmda-inspection':     { entityType: 'facility',   entityId: 'FAC-001-JP',      examples: ['FAC-001-JP', 'CMO-Lonza'] },
  'pmda-dossier':        { entityType: 'submission',  entityId: 'J-NDA-LIG2847',   examples: ['J-NDA-LIG2847', 'J-MAA-2026'] },
  'pmda-advisory':       { entityType: 'program',    entityId: 'LIG-2847-Japan',  examples: ['LIG-2847-Japan', 'LIG-5521-Japan'] },
  'document-resolution':   { entityType: 'comment',    entityId: 'cmt-001',            examples: ['cmt-001', 'cmt-002', 'cmt-003'] },
  'haq-response':          { entityType: 'haq',        entityId: 'IR-2026-001',        examples: ['IR-2026-001', 'IR-2026-002'] },
  'icsr-processing':       { entityType: 'icsr-case',  entityId: 'CASE-2026-0089',     examples: ['CASE-2026-0089', 'CASE-2026-0090'] },
  'site-monitoring':       { entityType: 'site',       entityId: 'SITE-001',           examples: ['SITE-001', 'SITE-002', 'SITE-003'] },
  'submission-assembly':   { entityType: 'submission', entityId: 'SUB-001',            examples: ['SUB-001', 'SUB-002'] },
  'signal-intelligence':   { entityType: 'signal',     entityId: 'SIG-2026-001',       examples: ['SIG-2026-001', 'SIG-2026-002'] },
  'quality-intelligence':  { entityType: 'capa',       entityId: 'CAPA-2026-042',      examples: ['CAPA-2026-042', 'CAPA-2026-043'] },
  'reg-strategy':          { entityType: 'product',    entityId: 'prod-001',           examples: ['prod-001', 'prod-002'] },
  'nonclinical-package':   { entityType: 'study',      entityId: 'GLP-2025-047',       examples: ['GLP-2025-047', 'GLP-2025-048'] },
  'research-intelligence': { entityType: 'target',     entityId: 'target-kras-g12c',   examples: ['target-kras-g12c', 'series-kras-g12c-3'] },
  'study-operations':      { entityType: 'study',      entityId: 'LIG-2847-301',       examples: ['LIG-2847-301', 'LIG-2847-302'] },
  'labeling-management':   { entityType: 'signal',     entityId: 'SIG-2026-001',       examples: ['SIG-2026-001', 'SIG-2026-002'] },
  'cmc-lifecycle':         { entityType: 'product',    entityId: 'prod-001',           examples: ['prod-001', 'prod-002'] },
  'medical-monitor':       { entityType: 'study',      entityId: 'LIG-2847-301',       examples: ['LIG-2847-301'] },
  'biostatistician':       { entityType: 'study',      entityId: 'LIG-2847-301',       examples: ['LIG-2847-301'] },
  'medical-affairs':       { entityType: 'material',   entityId: 'MLR-2026-044',       examples: ['MLR-2026-044', 'MLR-2026-045'] },
  'lead-optimisation':     { entityType: 'series',     entityId: 'series-kras-g12c-3', examples: ['series-kras-g12c-3'] },
  'portfolio-intelligence':{ entityType: 'portfolio',  entityId: 'all',                examples: ['all'] },
};

function TriggerPanel({ onTriggered }: { onTriggered: () => void }) {
  const [agentId, setAgentId] = useState<AgentId>('signal-intelligence');
  const [entityId, setEntityId] = useState(AGENT_DEFAULTS['signal-intelligence'].entityId);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ type: 'autopilot' | 'escalated' | 'error'; message: string; detail?: string } | null>(null);

  const desc = AGENT_DESCRIPTIONS[agentId];
  const defaults = AGENT_DEFAULTS[agentId];
  const display = AGENT_DISPLAY[agentId];

  function handleAgentChange(id: AgentId) {
    setAgentId(id);
    setEntityId(AGENT_DEFAULTS[id].entityId);
    setResult(null);
  }

  async function trigger() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, entityType: defaults.entityType, entityId }),
      });
      const json = await res.json();
      if (json.demoMode) {
        setResult({ type: 'autopilot', message: 'Running in demo mode — seed data returned.', detail: 'Add ANTHROPIC_API_KEY to enable live Claude runs.' });
      } else if (json.data?.status) {
        const run = json.data;
        if (run.status === 'failed') {
          setResult({ type: 'error', message: 'Agent run failed', detail: run.error ?? 'Unknown error' });
        } else if (run.autopilot) {
          setResult({ type: 'autopilot', message: `Applied automatically — ${run.riskLevel} risk, no review needed.`, detail: `${run.tokensUsed ?? 0} tokens · ${run.durationMs ? (run.durationMs / 1000).toFixed(1) + 's' : ''}` });
        } else {
          setResult({ type: 'escalated', message: 'Sent to review queue for your approval.', detail: `${run.riskLevel} risk · check the Review tab` });
        }
      } else {
        setResult({ type: 'error', message: JSON.stringify(json.error ?? json).slice(0, 200), detail: undefined });
      }
      onTriggered();
    } catch (e) {
      setResult({ type: 'error', message: String(e), detail: undefined });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Agent selector grid */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Select an agent</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(AGENT_DISPLAY) as AgentId[]).map(id => {
            const d = AGENT_DISPLAY[id];
            const isActive = agentId === id;
            return (
              <button
                key={id}
                onClick={() => handleAgentChange(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                  isActive
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-border bg-surface-card text-text-secondary hover:border-border hover:bg-surface-elevated'
                }`}
              >
                <span className="flex-shrink-0">{AGENT_ICON[id] ?? <Bot className="w-3.5 h-3.5" />}</span>
                <span className="truncate font-medium">{d.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* v0.125.80: dedicated panels for HA / Originate agents */}
      {(agentId === 'ha-inspection' || agentId === 'ha-dossier' || agentId === 'ha-predictive-haq' || agentId === 'candidate-targeting' || agentId === 'experiment-design' || agentId === 'pmda-inspection' || agentId === 'pmda-dossier' || agentId === 'pmda-advisory') ? (
        <div className="rounded-xl border border-border overflow-hidden" style={{height: '640px', display: 'flex', flexDirection: 'column'}}>
          {agentId === 'candidate-targeting' ? (
            <CandidateTargetingPanel />
          ) : agentId === 'experiment-design' ? (
            <ExperimentDesignPanel />
          ) : agentId === 'pmda-inspection' || agentId === 'pmda-dossier' || agentId === 'pmda-advisory' ? (
            <PMDAAgentPanel />
          ) : (
            <HAAgentPanel mode={agentId === 'ha-inspection' ? 'inspection' : agentId === 'ha-dossier' ? 'dossier' : 'predictive'} />
          )}
        </div>
      ) : (<>

      {/* Selected agent description card */}
      <div className="rounded-xl border border-purple-500/25 bg-purple-500/8 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
            {AGENT_ICON[agentId] ?? <Bot className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-text-primary">{display?.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10">{display?.persona}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{desc?.what}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-surface-card rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Triggers when</div>
            <p className="text-xs text-text-secondary">{desc?.when}</p>
          </div>
          <div className="bg-surface-card rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Routing</div>
            <p className="text-xs text-text-secondary">{desc?.routing}</p>
          </div>
        </div>
      </div>

      {/* Entity ID */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
          {defaults.entityType} to process
        </label>
        <div className="flex gap-2">
          <input
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            placeholder={defaults.entityId}
          />
          <div className="flex gap-1">
            {defaults.examples.slice(0, 3).map(ex => (
              <button
                key={ex}
                onClick={() => setEntityId(ex)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  entityId === ex
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-border bg-surface-card text-text-muted hover:text-text-secondary'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={trigger}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-50"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
        {running ? `Running ${display?.name}…` : `Run ${display?.name}`}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          result.type === 'autopilot' ? 'bg-green-500/10 border-green-500/30' :
          result.type === 'escalated' ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            {result.type === 'autopilot' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
             result.type === 'escalated' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
             <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          <div>
            <div className={`text-sm font-medium ${
              result.type === 'autopilot' ? 'text-green-300' :
              result.type === 'escalated' ? 'text-amber-300' :
              'text-red-300'
            }`}>{result.message}</div>
            {result.detail && <div className="text-xs text-text-muted mt-0.5">{result.detail}</div>}
          </div>
        </div>
      )}
    </>
  )}
    </div>
  );
}

function ProactivePanel() {
  const [monitors, setMonitors] = useState<ProactiveMonitorData[]>([]);
  const [scans, setScans] = useState<ProactiveScanData[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ firedCount: number; results: { name: string; outcome: string; reason: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ active: number; triggered: number; paused: number } | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/agents/proactive?include_scans=true');
      const json = await res.json();
      setMonitors(json.data ?? []);
      setScans(json.scans ?? []);
      setMeta(json.meta ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/agents/proactive/scan', { method: 'POST' });
      const json = await res.json();
      setScanResult(json.data);
      await load();
    } finally {
      setScanning(false);
    }
  }

  async function toggleMonitor(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    await fetch(`/api/agents/proactive/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }

  useEffect(() => { load(); }, []);

  const MONITOR_TYPE_ICON: Record<string, ReactNode> = {
    threshold: <Activity className="w-3.5 h-3.5" />,
    scheduled: <Clock className="w-3.5 h-3.5" />,
  };

  const STATUS_COLORS: Record<string, string> = {
    active:    'bg-green-500/15 text-green-400 border-green-500/30',
    triggered: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    paused:    'bg-surface-card text-text-muted border-border',
    error:     'bg-red-500/15 text-red-400 border-red-500/30',
  };

  const OUTCOME_COLORS: Record<string, string> = {
    'agent-fired':       'text-green-400',
    'threshold-not-met': 'text-text-muted',
    'error':             'text-red-400',
  };

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="bg-surface-elevated border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <span className="text-sm font-semibold text-text-primary">Proactive Mode</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-violet-500/20 text-violet-300 border-violet-500/40">Phase 5</span>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-xs text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {scanning ? 'Scanning…' : 'Run scan now'}
          </button>
        </div>
        <p className="text-xs text-text-muted mb-3">
          Agents shift from reactive to proactive — monitors surface risks without being asked using threshold checks and scheduled scans.
        </p>
        {meta && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
              <div className="text-sm font-bold text-green-400">{meta.active}</div>
              <div className="text-[10px] text-text-muted">Active</div>
            </div>
            <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
              <div className="text-sm font-bold text-amber-400">{meta.triggered}</div>
              <div className="text-[10px] text-text-muted">Triggered</div>
            </div>
            <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
              <div className="text-sm font-bold text-text-muted">{meta.paused}</div>
              <div className="text-[10px] text-text-muted">Paused</div>
            </div>
          </div>
        )}
      </div>

      {/* Scan result */}
      {scanResult && (
        <div className="bg-surface-elevated border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            Scan complete — {scanResult.firedCount} agent{scanResult.firedCount !== 1 ? 's' : ''} fired
          </div>
          {scanResult.results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-surface-card rounded px-3 py-2">
              <span className={`mt-0.5 ${OUTCOME_COLORS[r.outcome] ?? 'text-text-muted'}`}>
                {r.outcome === 'agent-fired' ? '⚡' : '·'}
              </span>
              <span className="font-medium text-text-secondary flex-1">{r.name}</span>
              <span className="text-text-muted truncate max-w-52">{r.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Monitor list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading monitors…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Monitors ({monitors.length})</div>
          {monitors.map(m => (
            <div key={m.id} className="bg-surface-elevated border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    m.monitorType === 'threshold' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                  }`}>
                    {MONITOR_TYPE_ICON[m.monitorType]}
                  </div>
                  <span className="text-sm font-medium text-text-primary truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_COLORS[m.status] ?? STATUS_COLORS.active}`}>
                    {m.status}
                  </span>
                  <button
                    onClick={() => toggleMonitor(m.id, m.status)}
                    className="text-[10px] px-2 py-0.5 rounded bg-surface-card border border-border text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {m.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-text-muted mb-3">{m.description}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                {m.monitorType === 'threshold' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Metric</span>
                      <span className="font-mono text-text-secondary">{m.metricKey}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Current / threshold</span>
                      <span className={`font-mono font-semibold ${
                        m.status === 'triggered' ? 'text-amber-400' : 'text-text-secondary'
                      }`}>
                        {m.currentValue ?? '—'} {m.comparator} {m.threshold}
                      </span>
                    </div>
                  </>
                )}
                {m.monitorType === 'scheduled' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Schedule</span>
                      <span className="text-text-secondary capitalize">{m.schedule}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Next run</span>
                      <span className="text-text-secondary">{m.nextRunAt ? timeAgo(m.nextRunAt) : '—'}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Target agent</span>
                  <span className="text-text-secondary">{AGENT_DISPLAY[m.targetAgentId as AgentId]?.name ?? m.targetAgentId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Fired</span>
                  <span className="text-text-secondary">{m.triggerCount}× {m.lastTriggeredAt ? `· last ${timeAgo(m.lastTriggeredAt)}` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent scans */}
      {scans.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent scans</div>
          <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
            {scans.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className={`flex-shrink-0 ${OUTCOME_COLORS[s.outcome] ?? 'text-text-muted'}`}>
                  {s.outcome === 'agent-fired' ? <Zap className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                </span>
                <span className="font-medium text-text-secondary flex-1 truncate">{s.monitorName}</span>
                <span className="text-text-muted truncate max-w-60">{s.triggerReason}</span>
                <span className="text-text-muted flex-shrink-0">{timeAgo(s.triggeredAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// type aliases to avoid importing from lib (client component)
type ProactiveMonitorData = {
  id: string; name: string; description: string; monitorType: string;
  metricKey?: string; threshold?: number; comparator?: string; currentValue?: number;
  schedule?: string; nextRunAt?: string;
  targetAgentId: string; targetEntityType: string; targetEntityId: string;
  status: string; lastTriggeredAt: string | null; triggerCount: number;
};
type ProactiveScanData = {
  id: string; monitorId: string; monitorName: string; triggeredAt: string;
  triggerReason: string; agentId: string; outcome: string;
};

// =============================================================================
// LEARNING PANEL — Phase 5
// =============================================================================

function LearningPanel() {
  const [metrics, setMetrics] = useState<LearningMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/agents/learning');
      const json = await res.json();
      setMetrics(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const CALIBRATION_COLORS: Record<string, string> = {
    'well-calibrated':           'bg-green-500/15 text-green-400 border-green-500/30',
    'needs-review':              'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'recalibration-required':    'bg-red-500/15 text-red-400 border-red-500/30',
  };

  const TREND_ICON: Record<string, string> = {
    improving: '↑',
    stable:    '→',
    degrading: '↓',
  };
  const TREND_COLOR: Record<string, string> = {
    improving: 'text-green-400',
    stable:    'text-text-muted',
    degrading: 'text-red-400',
  };

  function qualityBar(score: number, max = 5) {
    const pct = (score / max) * 100;
    const color = score >= 4 ? 'bg-green-400' : score >= 3 ? 'bg-amber-400' : 'bg-red-400';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-card rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-mono text-text-secondary w-6 text-right">{score > 0 ? score.toFixed(1) : '—'}</span>
      </div>
    );
  }

  function approvalBar(rate: number) {
    const pct = rate * 100;
    const color = pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-card rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-mono text-text-secondary w-8 text-right">{pct.toFixed(0)}%</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading learning metrics…
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-center py-12 text-sm text-text-muted">No learning data yet</div>;
  }

  const activeCalibrations = metrics.agentCalibrations.filter(c => c.totalDecisions > 0);
  const recalQueue = metrics.recalibrationQueue;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-surface-elevated border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-violet-300" />
          </div>
          <span className="text-sm font-semibold text-text-primary">Agent Learning Layer</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-violet-500/20 text-violet-300 border-violet-500/40">Phase 5</span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Accept / reject / modify decisions from the review queue feed back to improve future runs.
          Risk classifier recalibrates. Draft quality improves with feedback.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold text-text-primary">{metrics.totalFeedbackItems}</div>
            <div className="text-[10px] text-text-muted">Feedback items</div>
          </div>
          <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold text-green-400">{(metrics.overallApprovalRate * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-text-muted">Approval rate</div>
          </div>
          <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold text-blue-400">{metrics.overallDraftQuality > 0 ? metrics.overallDraftQuality.toFixed(1) : '—'}</div>
            <div className="text-[10px] text-text-muted">Avg draft quality</div>
          </div>
          <div className="bg-surface-card rounded-lg px-3 py-2 text-center">
            <div className={`text-lg font-bold ${recalQueue.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{recalQueue.length}</div>
            <div className="text-[10px] text-text-muted">Need recalibration</div>
          </div>
        </div>
      </div>

      {/* Recalibration queue */}
      {recalQueue.length > 0 && (
        <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Recalibration required ({recalQueue.length} agent{recalQueue.length !== 1 ? 's' : ''})
          </div>
          {recalQueue.map(id => (
            <div key={id} className="flex items-center gap-2 bg-surface-card rounded px-3 py-2 text-xs">
              <span className="text-text-secondary flex-1">{AGENT_DISPLAY[id as AgentId]?.name ?? id}</span>
              <span className="text-text-muted">{AGENT_DISPLAY[id as AgentId]?.persona}</span>
              <span className="text-red-400 font-medium">Review scoring criteria</span>
            </div>
          ))}
        </div>
      )}

      {/* Per-agent calibrations */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Agent calibrations ({activeCalibrations.length} with data)
        </div>
        {activeCalibrations.map(cal => {
          const isExpanded = expandedAgent === cal.agentId;
          const display = AGENT_DISPLAY[cal.agentId as AgentId];
          return (
            <div key={cal.agentId} className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-card/50 transition-colors"
                onClick={() => setExpandedAgent(isExpanded ? null : cal.agentId)}
              >
                <div className="w-5 h-5 rounded bg-surface-card flex items-center justify-center flex-shrink-0">
                  {AGENT_ICON[cal.agentId] ?? <Bot className="w-3 h-3 text-text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{display?.name ?? cal.agentId}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CALIBRATION_COLORS[cal.calibrationStatus] ?? ''}`}>
                      {cal.calibrationStatus.replace(/-/g, ' ')}
                    </span>
                    <span className={`text-[11px] font-bold ${TREND_COLOR[cal.trend] ?? ''}`}>
                      {TREND_ICON[cal.trend] ?? ''}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {cal.totalDecisions} decision{cal.totalDecisions !== 1 ? 's' : ''} · {display?.persona}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-text-muted">Approval</div>
                    <div className={`text-xs font-bold ${cal.approvalRate >= 0.8 ? 'text-green-400' : cal.approvalRate >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(cal.approvalRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-text-muted">Quality</div>
                    <div className={`text-xs font-bold ${cal.avgDraftQuality >= 4 ? 'text-green-400' : cal.avgDraftQuality >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {cal.avgDraftQuality > 0 ? cal.avgDraftQuality.toFixed(1) : '—'}/5
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-surface-card/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Approval rate</div>
                      {approvalBar(cal.approvalRate)}
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-2">Draft quality (1–5)</div>
                      {qualityBar(cal.avgDraftQuality)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-surface-card rounded-lg px-2 py-2 text-center">
                          <div className="text-sm font-bold text-green-400">{(cal.approvalRate * 100).toFixed(0)}%</div>
                          <div className="text-[9px] text-text-muted">Approved</div>
                        </div>
                        <div className="bg-surface-card rounded-lg px-2 py-2 text-center">
                          <div className="text-sm font-bold text-blue-400">{(cal.modificationRate * 100).toFixed(0)}%</div>
                          <div className="text-[9px] text-text-muted">Modified</div>
                        </div>
                        <div className="bg-surface-card rounded-lg px-2 py-2 text-center">
                          <div className="text-sm font-bold text-red-400">{(cal.rejectionRate * 100).toFixed(0)}%</div>
                          <div className="text-[9px] text-text-muted">Rejected</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-text-muted pt-1">
                        Risk agreement: <span className={`font-semibold ${cal.riskAgreementRate >= 0.75 ? 'text-green-400' : 'text-amber-400'}`}>
                          {(cal.riskAgreementRate * 100).toFixed(0)}%
                        </span>
                        {' '}· Trend: <span className={`font-semibold ${TREND_COLOR[cal.trend]}`}>{cal.trend}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {activeCalibrations.length === 0 && (
          <div className="text-center py-8 bg-surface-elevated border border-border rounded-xl text-sm text-text-muted">
            No calibration data yet — review queue decisions will appear here.
          </div>
        )}
      </div>

      {/* Recent feedback */}
      {metrics.recentFeedback.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent feedback</div>
          <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
            {metrics.recentFeedback.slice(0, 8).map((fb, i) => (
              <div key={fb.id} className={`flex items-start gap-3 px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className={`mt-0.5 font-semibold flex-shrink-0 ${
                  fb.outcome === 'approved' ? 'text-green-400' :
                  fb.outcome === 'modified' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {fb.outcome === 'approved' ? '✓' : fb.outcome === 'modified' ? '✎' : '✗'}
                </span>
                <span className="font-medium text-text-secondary flex-shrink-0 w-36 truncate">
                  {AGENT_DISPLAY[fb.agentId as AgentId]?.name ?? fb.agentId}
                </span>
                <span className="text-text-muted flex-1 truncate">
                  {fb.improvementNote ?? fb.modificationSummary ?? (fb.outcome === 'approved' ? 'Approved as submitted' : fb.rejectionCategory ?? '')}
                </span>
                {fb.draftQualityScore && (
                  <span className={`flex-shrink-0 font-mono text-[11px] ${
                    fb.draftQualityScore >= 4 ? 'text-green-400' : fb.draftQualityScore >= 3 ? 'text-amber-400' : 'text-red-400'
                  }`}>{fb.draftQualityScore}/5</span>
                )}
                <span className="text-text-muted flex-shrink-0">{timeAgo(fb.recordedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type LearningCalibrationData = {
  agentId: string; totalDecisions: number; approvalRate: number;
  modificationRate: number; rejectionRate: number; riskAgreementRate: number;
  avgDraftQuality: number; calibrationStatus: string; trend: string;
};
type LearningFeedbackData = {
  id: string; agentId: string; outcome: string; originalRiskLevel: string;
  humanAgreedRisk: boolean; draftQualityScore: number | null;
  rejectionCategory: string | null; improvementNote: string | null;
  modificationSummary: string | null; recordedAt: string;
};
type LearningMetricsData = {
  totalFeedbackItems: number; overallApprovalRate: number; overallDraftQuality: number;
  agentCalibrations: LearningCalibrationData[];
  recentFeedback: LearningFeedbackData[];
  recalibrationQueue: string[];
  learningCurvePoints: { date: string; avgQuality: number; approvalRate: number }[];
};

// ── Heartbeat strip ───────────────────────────────────────────────────────────

const HEARTBEAT_AGENTS: { id: AgentId; short: string }[] = [
  { id: 'haq-response',         short: 'HAQ' },
  { id: 'signal-intelligence',  short: 'Signal' },
  { id: 'ha-inspection',        short: 'HA Inspect' },
  { id: 'ha-dossier',           short: 'HA Dossier' },
  { id: 'ha-predictive-haq',    short: 'Predict HAQ' },
  { id: 'candidate-targeting',  short: 'Candidate' },
  { id: 'experiment-design',    short: 'Exp Design' },
  { id: 'pmda-inspection',      short: 'PMDA Insp' },
  { id: 'pmda-dossier',         short: 'PMDA J-NDA' },
  { id: 'pmda-advisory',        short: 'PMDA Adv' },
  { id: 'icsr-processing',      short: 'ICSR' },
  { id: 'submission-assembly',  short: 'Submit' },
  { id: 'quality-intelligence', short: 'QMS' },
  { id: 'site-monitoring',      short: 'Sites' },
  { id: 'reg-strategy',         short: 'Reg' },
  { id: 'portfolio-intelligence', short: 'Portfolio' },
];

function HeartbeatStrip({ runs, pendingCount }: { runs: AgentRun[]; pendingCount: number }) {
  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-surface-card border-b border-border overflow-x-auto">
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest flex-shrink-0">Agents</span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {HEARTBEAT_AGENTS.map(({ id, short }) => {
          const recentRun = runs.find(r => r.agentId === id);
          const isRunning = recentRun?.status === 'running';
          const isEscalated = recentRun?.status === 'escalated';
          const isComplete = recentRun?.status === 'completed' || recentRun?.status === 'approved';
          const dotColor = isRunning ? 'bg-accent-teal animate-pulse' :
                           isEscalated ? 'bg-accent-amber' :
                           isComplete ? 'bg-accent-green/60' :
                           'bg-border';
          return (
            <div key={id} className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className={`text-[10px] font-mono ${recentRun ? 'text-text-secondary' : 'text-text-muted'}`}>
                {short}
              </span>
            </div>
          );
        })}
      </div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded bg-accent-amber/15 border border-accent-amber/30">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
          <span className="text-[10px] font-semibold text-accent-amber">{pendingCount} pending</span>
        </div>
      )}
    </div>
  );
}

// ── Quick review interrupt ────────────────────────────────────────────────────

function QuickReview({ req, onDecision }: { req: AgentReviewRequest; onDecision: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const hoursLeft = Math.max(0, Math.floor((new Date(req.dueAt).getTime() - Date.now()) / 3600_000));
  const isUrgent = hoursLeft < 12;

  async function decide(outcome: 'approved' | 'rejected') {
    setSubmitting(true);
    try {
      await fetch(`/api/agents/review/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      fetch('/api/agents/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: req.id, agentId: req.agentId, entityType: req.entityType, originalRiskLevel: req.riskLevel, outcome, humanAgreedRisk: outcome !== 'rejected', improvementNote: null }),
      }).catch(() => {});
      setDone(true);
      onDecision();
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return null;

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-amber-500/20 last:border-0">
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
        {AGENT_ICON[req.agentId] ?? <Bot className="w-3.5 h-3.5 text-accent-amber" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary truncate">{req.entityLabel}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${RISK_COLORS[req.riskLevel]}`}>
            {req.riskLevel}
          </span>
          {isUrgent && (
            <span className="text-[10px] text-accent-amber font-semibold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{hoursLeft}h
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-muted truncate mt-0.5">{req.summary}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => decide('approved')}
          disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent-teal/15 border border-accent-teal/30 text-accent-teal text-[11px] font-semibold hover:bg-accent-teal/25 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
          Approve
        </button>
        <button
          onClick={() => decide('rejected')}
          disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-3 h-3" />
          Reject
        </button>
      </div>
    </div>
  );
}

function ReviewInterruptBanner({ reviews, onDecision }: { reviews: AgentReviewRequest[]; onDecision: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const urgent = reviews.filter(r => Math.max(0, Math.floor((new Date(r.dueAt).getTime() - Date.now()) / 3600_000)) < 12);
  const shown = reviews.slice(0, 3);

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/5">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-500/8 transition-colors text-left"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
        <span className="text-xs font-semibold text-accent-amber flex-1">
          {reviews.length} decision{reviews.length > 1 ? 's' : ''} needed
          {urgent.length > 0 && ` · ${urgent.length} urgent`}
        </span>
        <span className="text-[10px] text-text-muted">
          {expanded ? 'collapse' : 'expand'}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>
      {expanded && (
        <div>
          {shown.map(req => (
            <QuickReview key={req.id} req={req} onDecision={onDecision} />
          ))}
          {reviews.length > 3 && (
            <div className="px-4 py-2 text-[11px] text-text-muted">
              +{reviews.length - 3} more — see full review queue in Advanced
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Agent history modal ───────────────────────────────────────────────────────

function AgentHistoryModal({ agentId, runs, onClose }: {
  agentId: AgentId;
  runs: AgentRun[];
  onClose: () => void;
}) {
  const display = AGENT_DISPLAY[agentId];
  const agentRuns = runs.filter(r => r.agentId === agentId);

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface-elevated rounded-t-2xl sm:rounded-2xl border border-border w-full sm:max-w-2xl max-h-[75vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {AGENT_ICON[agentId] ?? <Bot className="w-4 h-4 text-text-muted" />}
            <span className="text-sm font-semibold text-text-primary">{display?.name ?? agentId}</span>
            <span className="text-xs text-text-muted">· {agentRuns.length} run{agentRuns.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary p-1">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {agentRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Activity className="w-7 h-7 text-text-muted opacity-30 mb-2" />
              <p className="text-sm text-text-muted">No runs yet for this agent</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {agentRuns.map(run => <RunRow key={run.id} run={run} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent card with inline trigger ───────────────────────────────────────────

function AgentCard({ agentDef, runs, onTriggered }: {
  agentDef: { id: AgentId; desc: string; phase: string };
  runs: AgentRun[];
  onTriggered: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [entityId, setEntityId] = useState(AGENT_DEFAULTS[agentDef.id]?.entityId ?? '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ type: 'autopilot' | 'escalated' | 'error'; message: string } | null>(null);

  const display = AGENT_DISPLAY[agentDef.id];
  const agentRuns = runs.filter(r => r.agentId === agentDef.id);
  const lastRun = agentRuns[0];
  const defaults = AGENT_DEFAULTS[agentDef.id];

  const phaseColors: Record<string, { border: string; icon: string; badge: string; glow: string }> = {
    P1: { border: 'border-purple-500/20', icon: 'bg-purple-500/15 text-purple-400', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', glow: 'ring-purple-500/30' },
    P2: { border: 'border-blue-500/20',   icon: 'bg-blue-500/15 text-blue-400',     badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   glow: 'ring-blue-500/30' },
    P3: { border: 'border-teal-500/20',   icon: 'bg-teal-500/15 text-teal-400',     badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30',   glow: 'ring-teal-500/30' },
    P4: { border: 'border-amber-500/20',  icon: 'bg-amber-500/15 text-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', glow: 'ring-amber-500/30' },
    P5: { border: 'border-violet-500/30', icon: 'bg-violet-500/20 text-violet-300', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40', glow: 'ring-violet-500/30' },
  };
  const pc = phaseColors[agentDef.phase] ?? phaseColors.P1;

  async function fire() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agentDef.id, entityType: defaults?.entityType ?? 'entity', entityId }),
      });
      const json = await res.json();
      if (json.demoMode) {
        setResult({ type: 'autopilot', message: 'Demo mode — seed result returned.' });
      } else if (json.data?.status) {
        const run = json.data;
        if (run.status === 'failed') {
          setResult({ type: 'error', message: run.error ?? 'Run failed' });
        } else if (run.autopilot) {
          setResult({ type: 'autopilot', message: `Applied automatically · ${run.riskLevel} risk` });
        } else {
          setResult({ type: 'escalated', message: `Sent to review · ${run.riskLevel} risk` });
        }
      } else {
        setResult({ type: 'error', message: JSON.stringify(json.error ?? json).slice(0, 120) });
      }
      onTriggered();
    } catch (e) {
      setResult({ type: 'error', message: String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
    <div className={`rounded-xl border bg-surface-elevated transition-all ${pc?.border ?? ''} ${open ? `ring-1 ${pc.glow}` : ''}`}>
      {/* Card header */}
      <div
        className="flex items-start gap-2.5 p-3 cursor-pointer hover:bg-surface-card/50 transition-colors rounded-xl"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${pc?.icon ?? ''}`}>
          {AGENT_ICON[agentDef.id] ?? <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-text-primary truncate">{display?.name ?? agentDef.id}</span>
            <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${pc.badge}`}>{agentDef.phase}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-snug mt-0.5 line-clamp-2">{agentDef.desc}</p>
          {lastRun && (
            <div className="flex items-center gap-1 mt-1">
              {STATUS_ICON[lastRun.status]}
              <span className="text-[10px] text-text-muted">{timeAgo(lastRun.createdAt)}</span>
              {lastRun.autopilot && <span className="text-[10px] text-accent-teal">· autopilot</span>}
              {lastRun.status === 'escalated' && <span className="text-[10px] text-accent-amber">· review pending</span>}
              <button
                onClick={e => { e.stopPropagation(); setHistoryOpen(true); }}
                className="ml-auto text-[10px] text-text-muted hover:text-text-secondary underline underline-offset-2"
              >
                history ({runs.filter(r => r.agentId === agentDef.id).length})
              </button>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${open ? `${pc?.icon ?? ''}` : 'text-text-muted hover:text-text-secondary'}`}>
          <PlayCircle className="w-4 h-4" />
        </div>
      </div>

      {/* Inline trigger form */}
      {open && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/60">
          <div className="flex items-center gap-2 pt-2">
            <span className="text-[10px] text-text-muted font-mono flex-shrink-0">
              {defaults?.entityType ?? 'entity'}
            </span>
            <input
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
          {defaults?.examples && defaults.examples.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {defaults.examples.slice(0, 3).map(ex => (
                <button
                  key={ex}
                  onClick={() => setEntityId(ex)}
                  className={`px-2 py-0.5 text-[10px] rounded border font-mono transition-colors ${
                    entityId === ex
                      ? `${pc.badge}`
                      : 'border-border text-text-muted hover:text-text-secondary bg-surface-card'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={fire}
            disabled={running}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border ${pc.badge} hover:opacity-90`}
          >
            {running
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
              : <><Zap className="w-3.5 h-3.5" /> Run {display?.name}</>
            }
          </button>
          {result && (
            <div className={`flex items-start gap-2 px-2.5 py-2 rounded-md text-[11px] border ${
              result.type === 'autopilot' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
              result.type === 'escalated' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
              'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {result.type === 'autopilot' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
               result.type === 'escalated' ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
               <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
    {historyOpen && (
      <AgentHistoryModal agentId={agentDef.id} runs={runs} onClose={() => setHistoryOpen(false)} />
    )}
    </>
  );
}

// ── Compact run item for live feed ────────────────────────────────────────────

function FeedItem({ run, onAction }: { run: AgentRun; onAction?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewReq, setReviewReq] = useState<AgentReviewRequest | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [decided, setDecided] = useState(false);

  const display = AGENT_DISPLAY[run.agentId];
  const isEscalated = run.status === 'escalated';
  const isRunning   = run.status === 'running';
  const isFailed    = run.status === 'failed';
  const hasDecision = run.status === 'completed' || run.status === 'approved' || run.status === 'rejected';

  // Eagerly fetch the review request for escalated items so actions are ready
  useEffect(() => {
    if (!isEscalated || !run.reviewRequestId || reviewReq || loadingReview) return;
    setLoadingReview(true);
    fetch(`/api/agents/review/${run.reviewRequestId}`)
      .then(r => r.json())
      .then(j => setReviewReq(j.data ?? null))
      .catch(() => {})
      .finally(() => setLoadingReview(false));
  }, [isEscalated, run.reviewRequestId, reviewReq, loadingReview]);

  async function decide(outcome: 'approved' | 'rejected') {
    if (!reviewReq) return;
    setDeciding(true);
    try {
      await fetch(`/api/agents/review/${reviewReq.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      fetch('/api/agents/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: reviewReq.id, agentId: run.agentId,
          entityType: run.triggerEntityType, originalRiskLevel: run.riskLevel,
          outcome, humanAgreedRisk: outcome !== 'rejected', improvementNote: null,
        }),
      }).catch(() => {});
      setDecided(true);
      onAction?.();
    } finally {
      setDeciding(false);
    }
  }

  const hoursLeft = reviewReq
    ? Math.max(0, Math.floor((new Date(reviewReq.dueAt).getTime() - Date.now()) / 3_600_000))
    : null;

  return (
    <div className={`border-b border-border last:border-0 ${isEscalated && !decided ? 'bg-accent-amber/[0.03]' : ''}`}>

      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-card text-left transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          {isRunning
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-blue" />
            : STATUS_ICON[run.status]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-text-primary">{display?.name ?? run.agentId}</span>
            {run.autopilot && <Zap className="w-2.5 h-2.5 text-accent-teal" />}
            {isEscalated && !decided && (
              <span className="text-[10px] font-semibold text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded border border-accent-amber/30">
                needs review
              </span>
            )}
            {decided && <span className="text-[10px] text-accent-green font-medium">✓ decided</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-muted font-mono">{run.triggerEntityId}</span>
            {hoursLeft !== null && hoursLeft < 24 && !decided && (
              <span className="text-[10px] text-accent-amber font-medium flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{hoursLeft}h
              </span>
            )}
          </div>
          {isRunning && (
            <p className="text-[10px] text-accent-blue mt-0.5">Running…</p>
          )}
          {hasDecision && run.decision && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate">{run.decision.slice(0, 80)}</p>
          )}
        </div>
        <span className="text-[10px] text-text-muted flex-shrink-0 mt-0.5">{timeAgo(run.createdAt)}</span>
      </button>

      {/* Inline approve/reject for escalated items */}
      {isEscalated && !decided && (
        <div className="px-3 pb-2.5">
          {loadingReview ? (
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : reviewReq ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-text-secondary leading-relaxed">{reviewReq.summary}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => decide('approved')}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-accent-teal/15 border border-accent-teal/30 text-accent-teal text-[11px] font-semibold hover:bg-accent-teal/25 transition-colors disabled:opacity-50"
                >
                  {deciding ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                  Approve
                </button>
                <button
                  onClick={() => decide('rejected')}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown className="w-3 h-3" /> Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-text-muted italic">Review request unavailable</p>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/60 pt-2">
          {run.riskRationale && (
            <div className={`rounded px-2.5 py-1.5 border text-[11px] ${run.riskLevel ? RISK_COLORS[run.riskLevel] : 'border-border'}`}>
              <span className="font-semibold">Risk: </span>{run.riskRationale}
            </div>
          )}
          {hasDecision && run.decision && (
            <div className="rounded px-2.5 py-1.5 bg-surface-card border border-border text-[11px]">
              <span className="font-semibold text-text-muted">Applied: </span>
              <span className="text-text-primary">{run.decision}</span>
            </div>
          )}
          {run.toolCalls.length > 0 && <ToolCallTrace toolCalls={run.toolCalls} />}
          {run.draftOutput && <DraftOutputBlock draftOutput={run.draftOutput} />}
          <ReviewerVerdictBlock run={run} />
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span>{run.tokensUsed.toLocaleString()} tokens</span>
            <span>{durationLabel(run.durationMs)}</span>
            <span className="font-mono">{run.model.replace('claude-', '')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Advanced drawer (cascades, proactive, learning, full review queue) ────────

function AdvancedDrawer({ open, onClose, runs, reviews, onTriggered }: {
  open: boolean;
  onClose: () => void;
  runs: AgentRun[];
  reviews: AgentReviewRequest[];
  onTriggered: () => void;
}) {
  const [tab, setTab] = useState<'review' | 'history' | 'cascades' | 'proactive' | 'learning' | 'trigger'>('review');
  const [historyAgent, setHistoryAgent] = useState<AgentId | 'all'>('all');
  const [historyStatus, setHistoryStatus] = useState<AgentRun['status'] | 'all'>('all');

  if (!open) return null;

  const TABS = [
    { id: 'review',    label: `Review queue${reviews.length > 0 ? ` (${reviews.length})` : ''}` },
    { id: 'history',   label: `Run history (${runs.length})` },
    { id: 'cascades',  label: 'Cascades' },
    { id: 'proactive', label: 'Proactive' },
    { id: 'learning',  label: 'Learning' },
    { id: 'trigger',   label: 'Advanced trigger' },
  ] as const;

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface-elevated rounded-t-2xl sm:rounded-2xl border border-border w-full sm:max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  tab === t.id ? 'bg-surface-card text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary p-1">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'review' && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-8 h-8 text-accent-teal/50 mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No pending reviews</p>
                </div>
              ) : (
                reviews.map(req => <ReviewCard key={req.id} req={req} onDecision={onTriggered} />)
              )}
            </div>
          )}
          {tab === 'history' && (() => {
            const agentIds = Array.from(new Set(runs.map(r => r.agentId))) as AgentId[];
            const filtered = runs.filter(r =>
              (historyAgent === 'all' || r.agentId === historyAgent) &&
              (historyStatus === 'all' || r.status === historyStatus)
            );
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={historyAgent}
                    onChange={e => setHistoryAgent(e.target.value as AgentId | 'all')}
                    className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  >
                    <option value="all">All agents</option>
                    {agentIds.map(id => (
                      <option key={id} value={id}>{AGENT_DISPLAY[id]?.name ?? id}</option>
                    ))}
                  </select>
                  <select
                    value={historyStatus}
                    onChange={e => setHistoryStatus(e.target.value as AgentRun['status'] | 'all')}
                    className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  >
                    <option value="all">All statuses</option>
                    {(['running','completed','escalated','approved','rejected','failed'] as AgentRun['status'][]).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span className="text-xs text-text-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-sm text-text-muted">No runs match this filter</div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    {filtered.map(run => <RunRow key={run.id} run={run} />)}
                  </div>
                )}
              </div>
            );
          })()}
          {tab === 'cascades'  && <CascadePanel onTriggered={onTriggered} />}
          {tab === 'proactive' && <ProactivePanel />}
          {tab === 'learning'  && <LearningPanel />}
          {tab === 'trigger'   && <TriggerPanel onTriggered={onTriggered} />}
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const AGENT_DEFS: { id: AgentId; desc: string; phase: string }[] = [
  { id: 'document-resolution',   desc: 'Comment classification → autopilot / escalation',               phase: 'P1' },
  { id: 'haq-response',          desc: 'HAQ triage, precedent, response drafting',                       phase: 'P1' },
  { id: 'icsr-processing',       desc: 'MedDRA coding, E2B narrative, regulatory clock',                 phase: 'P1' },
  { id: 'site-monitoring',       desc: 'Site risk, TMF gaps, visit recommendations',                     phase: 'P2' },
  { id: 'submission-assembly',   desc: 'eCTD validation, readiness scoring',                             phase: 'P2' },
  { id: 'signal-intelligence',   desc: 'PRR/ROR, benefit-risk, label impact',                            phase: 'P2' },
  { id: 'quality-intelligence',  desc: 'CAPA trending, pattern detection, audit readiness',               phase: 'P2' },
  { id: 'reg-strategy',          desc: 'Commitments, intelligence, pathway assessment',                   phase: 'P2' },
  { id: 'nonclinical-package',   desc: 'ICH M3(R2) coverage, ALCOA+, GLP',                              phase: 'P3' },
  { id: 'research-intelligence', desc: 'Literature triage, competitive threat, target validation',        phase: 'P3' },
  { id: 'study-operations',      desc: 'CTMS health, site activation, enrollment forecast',              phase: 'P3' },
  { id: 'labeling-management',   desc: 'Signal→label impact, SmPC drafting, variation type',             phase: 'P3' },
  { id: 'cmc-lifecycle',         desc: 'Stability trending, shelf life, Module 3 updates',               phase: 'P3' },
  { id: 'medical-monitor',       desc: 'DSMB brief, stopping rules, SAE aggregation',                    phase: 'P4' },
  { id: 'biostatistician',       desc: 'SAP compliance, TLF audit, estimand framework',                  phase: 'P4' },
  { id: 'medical-affairs',       desc: 'AdPromo compliance, med-info response, KOL tracking',            phase: 'P4' },
  { id: 'lead-optimisation',     desc: 'SAR mining, ADMET scoring, candidate nomination',                phase: 'P4' },
  { id: 'portfolio-intelligence',desc: 'Cross-programme go/no-go · board reporting · cascade arbitration', phase: 'P5' },
];

interface AgentHubScreenProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function AgentHubScreen({ filters: _filters }: AgentHubScreenProps) {
  const { selectedProductId } = useProductFilter();
  const activeProductId = selectedProductId ?? 'lig-2847';

  // Derive cascade configs with the currently-selected product substituted in
  const resolvedCascadeConfigs = useMemo(
    () => CASCADE_CONFIGS.map(cfg => ({
      ...cfg,
      params: cfg.params.map(p =>
        p.key === 'productId' ? { ...p, default: activeProductId } : p
      ),
    })),
    [activeProductId]
  );

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [reviews, setReviews] = useState<AgentReviewRequest[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [runsRes, reviewRes] = await Promise.all([
        fetch('/api/agents/runs'),
        fetch('/api/agents/review?status=pending'),
      ]);
      const runsJson = await runsRes.json();
      const reviewJson = await reviewRes.json();
      setRuns(runsJson.data ?? []);
      setStats(runsJson.stats ?? null);
      setReviews(reviewJson.data ?? []);
    } catch {
      // keep stale state on network error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    // Adaptive polling: 3 s while any agent is running, 15 s when idle
    const hasRunning = runs.some(r => r.status === 'running');
    const interval = hasRunning ? 3_000 : 15_000;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, runs]);

  const refresh = () => load(true);

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-none">Agent Hub</h1>
            <p className="text-[10px] text-text-muted mt-0.5">Multi-agent R&D operations · Phase 5</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted mr-2">
              <span><span className="text-text-primary font-medium">{stats.totalRuns}</span> runs</span>
              <span><span className="text-text-primary font-medium">{Math.round(stats.autopilotRate * 100)}%</span> autopilot</span>
              <span><span className="text-text-primary font-medium">{durationLabel(stats.avgDurationMs)}</span> avg</span>
            </div>
          )}
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setAdvancedOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              reviews.length > 0
                ? 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber hover:bg-accent-amber/20'
                : 'bg-surface-card border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">
              {reviews.length > 0 ? `${reviews.length} to review` : 'Advanced'}
            </span>
            {reviews.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent-amber text-[9px] font-bold text-white flex items-center justify-center">
                {reviews.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Heartbeat strip */}
      <HeartbeatStrip runs={runs} pendingCount={reviews.length} />

      {/* Review interrupt */}
      {reviews.length > 0 && (
        <ReviewInterruptBanner reviews={reviews} onDecision={refresh} />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Agent grid */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading agents…</span>
            </div>
          ) : (
            <>
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                18 agents — click any card to run
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {AGENT_DEFS.map(a => (
                  <AgentCard key={a.id} agentDef={a} runs={runs} onTriggered={refresh} />
                ))}
              </div>

              {/* Empty state */}
              {runs.length === 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
                  <Bot className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-text-muted mb-1">No runs yet</p><p className="text-xs text-text-muted">Click any agent card above — each one runs in seconds and either autopilots or appears here for your review.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Live feed */}
        <div className="w-80 flex-shrink-0 border-l border-border flex flex-col overflow-hidden hidden md:flex">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Live activity</span>
            {runs.length > 0 && (
              <span className="text-[10px] text-text-muted tabular-nums">{runs.length} runs</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-1.5 text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Activity className="w-6 h-6 text-text-muted opacity-40 mb-2" />
                <p className="text-xs text-text-muted">Activity will appear here as agents run</p>
              </div>
            ) : (
              runs.map(run => <FeedItem key={run.id} run={run} onAction={refresh} />)
            )}
          </div>
        </div>
      </div>

      {/* Advanced drawer */}
      <AdvancedDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        runs={runs}
        reviews={reviews}
        onTriggered={refresh}
      />
    </div>
  );
}

// =============================================================================
// END AgentHubScreen
// =============================================================================
