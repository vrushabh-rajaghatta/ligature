
// =============================================================================
// LIX PANEL — v0.116.0
// =============================================================================
// Composing sidebar panel that shows Lix status, latest message, and recent
// audit entries. Drop this into any module screen to surface agent presence
// in a consistent way.
//
// Usage (minimal — status + message):
//   <LixPanel
//     moduleScope="Signal"
//     status="review_required"
//     message={{
//       body: '3 cases require medical assessment before 15-day clock expires.',
//       findings: [
//         { severity: 'flag', message: 'CASE-2024-0117 — fatal SAE, expires in 31 hrs' },
//       ],
//       actions: [{ label: 'Open review queue', primary: true, onClick: () => {} }],
//     }}
//   />
//
// Usage (with audit trail):
//   <LixPanel ... auditEntries={entries} showAudit />
// =============================================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type LixModuleScope, type LixStatus, type LixFinding, type LixAction, type LixAuditEntry, AGENT_DISPLAY_NAME } from '@/types/lix';
import { LixStatusBar } from '@/components/lix/LixStatus';
import { LixMessage, LixMessageEmpty } from '@/components/lix/LixMessage';
import { LixAuditList } from '@/components/lix/LixAuditRow';

// ── Props ────────────────────────────────────────────────────────────────────

interface LixPanelMessageConfig {
  timestamp?: string;
  body?: string;
  findings?: LixFinding[];
  actions?: LixAction[];
}

interface LixPanelProps {
  moduleScope: LixModuleScope;
  status: LixStatus;
  /** Short context line shown in the status bar (e.g. "12 cases monitored") */
  context?: string;
  /** Current message/output from the agent */
  message?: LixPanelMessageConfig;
  /** Audit entries — shown in collapsible section when provided */
  auditEntries?: LixAuditEntry[];
  /** Show audit section by default (default false) */
  showAudit?: boolean;
  /** Timestamp shown in status bar */
  timestamp?: string;
  onAuditEntryClick?: (entry: LixAuditEntry) => void;
  className?: string;
}

// ── LixPanel ─────────────────────────────────────────────────────────────────

export function LixPanel({
  moduleScope,
  status,
  context,
  message,
  auditEntries = [],
  showAudit = false,
  timestamp,
  onAuditEntryClick,
  className = '',
}: LixPanelProps) {
  const [auditOpen, setAuditOpen] = useState(showAudit);

  return (
    <div className={`flex flex-col gap-0 rounded-lg border border-border overflow-hidden bg-surface ${className}`}>
      {/* Status bar */}
      <LixStatusBar
        moduleScope={moduleScope}
        status={status}
        context={context}
        timestamp={timestamp}
        className="rounded-none border-0"
      />

      {/* Message */}
      <div className="p-3">
        {message ? (
          <LixMessage
            moduleScope={moduleScope}
            status={status}
            timestamp={message.timestamp}
            body={message.body}
            findings={message.findings}
            actions={message.actions}
          />
        ) : (
          <LixMessageEmpty moduleScope={moduleScope} />
        )}
      </div>

      {/* Audit section (collapsible) */}
      {auditEntries.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setAuditOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover transition-colors text-left"
          >
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Audit trail
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted tabular-nums">{auditEntries.length}</span>
              {auditOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              }
            </div>
          </button>

          {auditOpen && (
            <LixAuditList
              entries={auditEntries}
              maxRows={5}
              onEntryClick={onAuditEntryClick}
              className="rounded-none border-0 border-t border-border"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── AgentBoltIcon — shared bolt identity icon ─────────────────────────────────

interface AgentBoltIconProps {
  size?: number;
}

export function AgentBoltIcon({ size = 24 }: AgentBoltIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <rect x="1" y="1" width="14" height="14" rx="3" fill="white" stroke="#D3D1C7" strokeWidth="0.5" />
      <path d="M9.5 2.5L5.5 8.5H8L6.5 13.5L11 7H8.5L9.5 2.5Z" fill="#EF9F27" />
    </svg>
  );
}

// ── LixInlineAlert (compact single-line alert for use in screen headers) ─────

interface LixInlineAlertProps {
  moduleScope: LixModuleScope;
  /** Short message (max ~80 chars) */
  message: string;
  /** CTA label */
  actionLabel?: string;
  onAction?: () => void;
  /** Urgency level — flag shows red pulse, warn shows amber, info shows teal */
  severity?: 'info' | 'warn' | 'flag';
  className?: string;
}

const PULSE_DOT: Record<NonNullable<LixInlineAlertProps['severity']>, string> = {
  info: 'bg-accent-teal',
  warn: 'bg-accent-amber',
  flag: 'bg-accent-red',
};

const ACTION_COLOR: Record<NonNullable<LixInlineAlertProps['severity']>, string> = {
  info: 'text-accent-teal hover:text-accent-teal/80',
  warn: 'text-accent-amber hover:text-accent-amber/80',
  flag: 'text-accent-red hover:text-accent-red/80',
};

export function LixInlineAlert({
  moduleScope,
  message,
  actionLabel,
  onAction,
  severity = 'info',
  className = '',
}: LixInlineAlertProps) {
  const dot = PULSE_DOT[severity];
  const actionColor = ACTION_COLOR[severity];
  const agentName = AGENT_DISPLAY_NAME[moduleScope];

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-accent-purple/30 text-xs ${className}`}
      style={{ background: 'linear-gradient(90deg, #EEEDFE 0%, var(--surface-card, var(--surface-primary)) 72%)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AgentBoltIcon size={24} />
        <span className="font-semibold flex-shrink-0 text-text-primary">{agentName}</span>
        <span className="text-text-muted opacity-50 flex-shrink-0">·</span>
        <span className="truncate text-text-secondary font-normal">{message}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Active pulse dot */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${dot}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
        </span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`font-semibold underline underline-offset-2 hover:no-underline transition-all ${actionColor}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
