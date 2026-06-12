
// =============================================================================
// LIX STATUS — v0.116.0
// =============================================================================
// Status chip with animated pulse dot for Lix agent presence.
//
// Usage (inline header chip):
//   <LixStatus moduleScope="Signal" status="review_required" />
//
// Usage (with timestamp):
//   <LixStatus moduleScope="HAQ" status="processing" timestamp="11:02 UTC" />
//
// Usage (mark only — just LIX + scope, no status chip):
//   <LixMark moduleScope="Submit" />
// =============================================================================

import { type LixModuleScope, type LixStatus, LIX_STATUS_LABEL, LIX_STATUS_STYLE, LIX_MODULE_DOT_COLOR, AGENT_DISPLAY_NAME } from '@/types/lix';
import { AgentBoltIcon } from '@/components/lix/LixPanel';

// ── Pulse dot ────────────────────────────────────────────────────────────────

interface LixPulseProps {
  color: string;
  animate?: boolean;
}

function LixPulse({ color, animate = false }: LixPulseProps) {
  return (
    <span className="relative flex items-center justify-center w-2 h-2 flex-shrink-0">
      <span
        className="w-2 h-2 rounded-full block"
        style={{ background: color }}
      />
      {animate && (
        <span
          className="absolute inset-0 rounded-full border animate-ping opacity-60"
          style={{ borderColor: color }}
        />
      )}
    </span>
  );
}

// ── LixMark (wordmark only — used in message headers, panels) ───────────────

interface LixMarkProps {
  moduleScope: LixModuleScope;
  /** If true, shows pulse dot (default true) */
  showDot?: boolean;
  /** Override pulse dot animation */
  pulsing?: boolean;
  className?: string;
}

export function LixMark({ moduleScope, showDot = true, pulsing = true, className = '' }: LixMarkProps) {
  const dotColor = LIX_MODULE_DOT_COLOR[moduleScope];
  const agentName = AGENT_DISPLAY_NAME[moduleScope];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <AgentBoltIcon size={16} />
      <span className="text-xs font-semibold text-text-primary">
        {agentName}
      </span>
      {showDot && <LixPulse color={dotColor} animate={pulsing} />}
    </span>
  );
}

// ── LixStatus chip ───────────────────────────────────────────────────────────

interface LixStatusProps {
  moduleScope: LixModuleScope;
  status: LixStatus;
  /** Optional timestamp shown at right of chip */
  timestamp?: string;
  /** Hide the module scope label (compact mode) */
  compact?: boolean;
  className?: string;
}

/** Pulse dot animation rules per status */
const STATUS_PULSE: Record<LixStatus, boolean> = {
  monitoring:      false,
  processing:      true,
  acting:          true,
  review_required: true,
  complete:        false,
};

/** Per-status dot color override (falls back to module color for monitoring/complete) */
const STATUS_DOT_COLOR: Partial<Record<LixStatus, string>> = {
  processing:      'var(--accent-teal)',
  acting:          'var(--accent-amber)',
  review_required: 'var(--accent-red)',
  complete:        'var(--accent-green)',
};

export function LixStatus({ moduleScope, status, timestamp, compact = false, className = '' }: LixStatusProps) {
  const dotColor = STATUS_DOT_COLOR[status] ?? LIX_MODULE_DOT_COLOR[moduleScope];
  const chipStyle = LIX_STATUS_STYLE[status];
  const label = LIX_STATUS_LABEL[status];
  const pulsing = STATUS_PULSE[status];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* LIX wordmark */}
      {!compact && (
        <LixMark moduleScope={moduleScope} showDot={false} />
      )}

      {/* Status chip */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${chipStyle}`}>
        <LixPulse color={dotColor} animate={pulsing} />
        {label}
      </span>

      {/* Optional timestamp */}
      {timestamp && (
        <span className="text-xs text-text-muted font-mono tabular-nums">
          {timestamp}
        </span>
      )}
    </span>
  );
}

// ── LixStatusBar (full-width bar for panel headers) ──────────────────────────

interface LixStatusBarProps {
  moduleScope: LixModuleScope;
  status: LixStatus;
  /** Short context line (e.g. "3 cases pending medical review") */
  context?: string;
  timestamp?: string;
  className?: string;
}

export function LixStatusBar({ moduleScope, status, context, timestamp, className = '' }: LixStatusBarProps) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-card border-b border-border ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <LixStatus moduleScope={moduleScope} status={status} />
        {context && (
          <span className="text-xs text-text-secondary truncate">{context}</span>
        )}
      </div>
      {timestamp && (
        <span className="text-xs text-text-muted font-mono tabular-nums flex-shrink-0">{timestamp}</span>
      )}
    </div>
  );
}
