
// =============================================================================
// LIX AUDIT ROW — v0.116.0
// =============================================================================
// Single row for Lix agent audit trail display.
// All Lix actions and human overrides are timestamped and tagged.
// This is a compliance artifact — not just UX.
//
// Usage (single row):
//   <LixAuditRow entry={entry} />
//
// Usage (full list):
//   <LixAuditList entries={entries} title="Signal SIG-2024-0041" />
//
// Tag semantics:
//   automated      — Lix acted on its own (within risk level)
//   human decision — Explicit human approval, rejection, or assessment
//   override       — Human reversed or modified an automated Lix action
// =============================================================================

import { Bot, User, ChevronRight } from 'lucide-react';
import { type LixAuditEntry } from '@/types/lix';

// ── Tag styles ───────────────────────────────────────────────────────────────

const TAG_STYLES: Record<LixAuditEntry['tag'], string> = {
  'automated':       'bg-surface-card   text-text-muted   border-border',
  'human decision':  'bg-accent-blue/10  text-accent-blue  border-accent-blue/30',
  'override':        'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
};

// ── Timestamp formatter ───────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ── LixAuditRow ──────────────────────────────────────────────────────────────

interface LixAuditRowProps {
  entry: LixAuditEntry;
  /** Show full date in timestamp (for cross-day lists) */
  showDate?: boolean;
  /** Callback when row is clicked */
  onClick?: (entry: LixAuditEntry) => void;
  className?: string;
}

export function LixAuditRow({ entry, showDate = false, onClick, className = '' }: LixAuditRowProps) {
  const isLix = entry.actor === 'lix';
  const tagStyle = TAG_STYLES[entry.tag];

  const ts = showDate
    ? new Date(entry.timestamp).toLocaleString('en-GB', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      })
    : formatTimestamp(entry.timestamp);

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={`
        flex items-start gap-3 py-2.5 px-3 w-full text-left
        border-b border-border last:border-0
        ${onClick ? 'hover:bg-surface-hover transition-colors cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick ? () => onClick(entry) : undefined}
    >
      {/* Actor icon */}
      <div className={`
        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5
        ${isLix
          ? 'bg-accent-teal/15 text-accent-teal'
          : 'bg-accent-blue/15 text-accent-blue'
        }
      `}>
        {isLix
          ? <Bot className="w-3 h-3" />
          : <User className="w-3 h-3" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-text-primary font-mono">{entry.actorLabel}</span>
          <span className="text-xs text-text-secondary leading-relaxed">{entry.description}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-text-muted font-mono tabular-nums">{ts}</span>
          {entry.entityId && (
            <>
              <span className="text-[10px] text-text-muted">·</span>
              <span className="text-[10px] text-text-muted font-mono">{entry.entityId}</span>
            </>
          )}
          <span className={`
            inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium
            ${tagStyle}
          `}>
            {entry.tag}
          </span>
        </div>
      </div>

      {/* Click affordance */}
      {onClick && (
        <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-1" />
      )}
    </Wrapper>
  );
}

// ── LixAuditList ─────────────────────────────────────────────────────────────

interface LixAuditListProps {
  entries: LixAuditEntry[];
  title?: string;
  /** Max rows before truncating with "show more" */
  maxRows?: number;
  onEntryClick?: (entry: LixAuditEntry) => void;
  className?: string;
}

export function LixAuditList({ entries, title, maxRows, onEntryClick, className = '' }: LixAuditListProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const visible = maxRows ? sorted.slice(0, maxRows) : sorted;
  const truncated = maxRows ? sorted.length - maxRows : 0;

  return (
    <div className={`rounded-lg border border-border bg-surface-card overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            {title}
          </span>
          <span className="text-[10px] text-text-muted tabular-nums">{entries.length} entries</span>
        </div>
      )}

      <div>
        {visible.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No audit entries</p>
        ) : (
          visible.map(entry => (
            <LixAuditRow
              key={entry.id}
              entry={entry}
              showDate
              onClick={onEntryClick}
            />
          ))
        )}
      </div>

      {truncated > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <span className="text-xs text-text-muted">+{truncated} earlier entries</span>
        </div>
      )}
    </div>
  );
}
