
// =============================================================================
// LIX MESSAGE — v0.116.0
// =============================================================================
// Structured output card for Lix agent messages.
//
// Usage (simple status update):
//   <LixMessage
//     moduleScope="Signal"
//     status="monitoring"
//     body="Watching 3 active studies. 0 signals above threshold."
//     timestamp="04:17:02 UTC"
//   />
//
// Usage (review required with findings and CTAs):
//   <LixMessage
//     moduleScope="Signal"
//     status="review_required"
//     body="3 cases require medical assessment before 15-day clock expires."
//     findings={[
//       { severity: 'flag', message: 'CASE-2024-0117 — unexpected fatal SAE', source: 'E2B R3' },
//       { severity: 'warn', message: 'CASE-2024-0119 — possible DILI, PRR above threshold' },
//     ]}
//     actions={[
//       { label: 'Open medical review queue', primary: true, onClick: () => {} },
//     ]}
//   />
// =============================================================================

import { type LixMessageProps, type LixFindingSeverity, LIX_STATUS_LABEL } from '@/types/lix';
import { LixMark, LixStatus } from '@/components/lix/LixStatus';

// ── Finding severity styles ──────────────────────────────────────────────────

const FINDING_STYLES: Record<LixFindingSeverity, string> = {
  flag: 'bg-accent-red/10   border-l-2 border-accent-red   text-text-primary',
  warn: 'bg-accent-amber/10 border-l-2 border-accent-amber text-text-primary',
  info: 'bg-accent-blue/10  border-l-2 border-accent-blue  text-text-primary',
  ok:   'bg-accent-green/10 border-l-2 border-accent-green text-text-primary',
};

const FINDING_ICON: Record<LixFindingSeverity, string> = {
  flag: '●',
  warn: '◆',
  info: '▸',
  ok:   '✓',
};

const FINDING_ICON_COLOR: Record<LixFindingSeverity, string> = {
  flag: 'text-accent-red',
  warn: 'text-accent-amber',
  info: 'text-accent-blue',
  ok:   'text-accent-green',
};

// ── LixMessage ───────────────────────────────────────────────────────────────

export function LixMessage({
  moduleScope,
  status,
  timestamp,
  body,
  findings = [],
  actions = [],
  className = '',
}: LixMessageProps) {
  const hasFindings = findings.length > 0;
  const hasActions  = actions.length > 0;

  return (
    <div className={`rounded-lg border border-border bg-surface-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <LixMark moduleScope={moduleScope} pulsing={status === 'processing' || status === 'acting' || status === 'review_required'} />
        <div className="flex items-center gap-3">
          <LixStatus moduleScope={moduleScope} status={status} compact />
          {timestamp && (
            <span className="text-xs text-text-muted font-mono tabular-nums">{timestamp}</span>
          )}
        </div>
      </div>

      {/* Body */}
      {(body || hasFindings) && (
        <div className="px-4 py-3 space-y-3">
          {/* Prose body */}
          {body && (
            <p className={`text-sm font-mono leading-relaxed ${status === 'monitoring' ? 'text-text-muted' : 'text-text-primary'}`}>
              {body}
            </p>
          )}

          {/* Findings */}
          {hasFindings && (
            <div className="space-y-1.5">
              {findings.map((finding, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-r ${FINDING_STYLES[finding.severity]}`}
                >
                  <span className={`text-[10px] mt-0.5 flex-shrink-0 ${FINDING_ICON_COLOR[finding.severity]}`}>
                    {FINDING_ICON[finding.severity]}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-mono leading-relaxed">{finding.message}</span>
                    {finding.source && (
                      <span className="ml-1.5 text-[10px] text-text-muted font-mono opacity-70">
                        [{finding.source}]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {hasActions && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-wrap">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`
                inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors
                ${action.primary
                  ? 'bg-accent-teal text-white hover:bg-accent-teal/90'
                  : 'bg-transparent border border-border text-text-secondary hover:bg-surface-hover'
                }
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LixMessageSkeleton (loading state) ───────────────────────────────────────

export function LixMessageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="h-4 w-24 bg-surface-hover rounded animate-pulse" />
        <div className="h-4 w-20 bg-surface-hover rounded animate-pulse" />
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 w-full bg-surface-hover rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-surface-hover rounded animate-pulse" />
      </div>
    </div>
  );
}

// ── LixMessageEmpty ───────────────────────────────────────────────────────────

export function LixMessageEmpty({
  moduleScope,
  label = 'No recent activity',
  className = '',
}: {
  moduleScope: LixMessageProps['moduleScope'];
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-border bg-surface-card text-center ${className}`}>
      <LixMark moduleScope={moduleScope} pulsing={false} />
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
