// =============================================================================
// LIX TYPES — v0.116.0
// =============================================================================
// Shared types for the Lix agent identity system.
// Lix (Ligature Intelligence eXecutive) is the platform agent — a named,
// consistent presence with a defined status lifecycle and auditable output.
//
// All Lix components use these types to ensure a consistent contract across
// the platform. Module-scoped variants (LIX/HAQ, LIX/Signal, etc.) share
// the same type surface with different moduleScope values.
// =============================================================================

// ── Module scopes ─────────────────────────────────────────────────────────────

export type LixModuleScope =
  | 'HAQ'
  | 'Signal'
  | 'Submit'
  | 'QMS'
  | 'TMF'
  | 'CTMS'
  | 'Safety'
  | 'Portfolio'
  | 'Authoring'
  | 'CMC'
  | 'Research';

/** Human-readable agent name shown in UI — "[Module] Agent" convention */
export const AGENT_DISPLAY_NAME: Record<LixModuleScope, string> = {
  HAQ:       'HAQ Agent',
  Signal:    'Signal Agent',
  Submit:    'Submissions Agent',
  QMS:       'Quality Agent',
  TMF:       'TMF Agent',
  CTMS:      'CTMS Agent',
  Safety:    'Safety Agent',
  Portfolio: 'Portfolio Agent',
  Authoring: 'Authoring Agent',
  CMC:       'CMC Agent',
  Research:  'Research Agent',
};

export const LIX_MODULE_COLOR: Record<LixModuleScope, string> = {
  HAQ:       'text-accent-teal   border-accent-teal/40   bg-accent-teal/10',
  Signal:    'text-accent-amber  border-accent-amber/40  bg-accent-amber/10',
  Submit:    'text-accent-blue   border-accent-blue/40   bg-accent-blue/10',
  QMS:       'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  TMF:       'text-accent-blue   border-accent-blue/40   bg-accent-blue/10',
  CTMS:      'text-accent-teal   border-accent-teal/40   bg-accent-teal/10',
  Safety:    'text-accent-red    border-accent-red/40    bg-accent-red/10',
  Portfolio: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  Authoring: 'text-accent-blue   border-accent-blue/40   bg-accent-blue/10',
  CMC:       'text-accent-teal   border-accent-teal/40   bg-accent-teal/10',
  Research:  'text-accent-teal   border-accent-teal/40   bg-accent-teal/10',
};

/** Hex dot color for the pulse indicator per module scope */
export const LIX_MODULE_DOT_COLOR: Record<LixModuleScope, string> = {
  HAQ:       'var(--accent-teal)',
  Signal:    'var(--accent-amber)',
  Submit:    'var(--accent-blue)',
  QMS:       'var(--accent-purple)',
  TMF:       'var(--accent-blue)',
  CTMS:      'var(--accent-teal)',
  Safety:    'var(--accent-red)',
  Portfolio: 'var(--accent-purple)',
  Authoring: 'var(--accent-blue)',
  CMC:       'var(--accent-teal)',
  Research:  'var(--accent-teal)',
};

// ── Status lifecycle ─────────────────────────────────────────────────────────

export type LixStatus =
  | 'monitoring'      // Idle — watching for threshold events
  | 'processing'      // Running — reading data, reasoning
  | 'acting'          // Executing — writing back, building artefacts
  | 'review_required' // Blocked — needs human judgment before proceeding
  | 'complete';       // Done — action applied, audit entry written

export const LIX_STATUS_LABEL: Record<LixStatus, string> = {
  monitoring:      'Monitoring',
  processing:      'Processing',
  acting:          'Acting',
  review_required: 'Review required',
  complete:        'Complete',
};

export const LIX_STATUS_STYLE: Record<LixStatus, string> = {
  monitoring:      'bg-surface-card   text-text-muted    border-border',
  processing:      'bg-accent-teal/10  text-accent-teal   border-accent-teal/40',
  acting:          'bg-accent-amber/10 text-accent-amber  border-accent-amber/40',
  review_required: 'bg-accent-red/10   text-accent-red    border-accent-red/40',
  complete:        'bg-accent-green/10 text-accent-green  border-accent-green/40',
};

// ── Finding severity ──────────────────────────────────────────────────────────

export type LixFindingSeverity = 'info' | 'warn' | 'flag' | 'ok';

export interface LixFinding {
  severity: LixFindingSeverity;
  message: string;
  /** Optional cite — source document/field/case ID */
  source?: string;
}

// ── Message card ──────────────────────────────────────────────────────────────

export interface LixAction {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export interface LixMessageProps {
  moduleScope: LixModuleScope;
  status: LixStatus;
  /** ISO timestamp string shown in header */
  timestamp?: string;
  /** Free-text body (plain prose) */
  body?: string;
  /** Structured findings rendered below body */
  findings?: LixFinding[];
  /** CTA buttons rendered at the bottom */
  actions?: LixAction[];
  className?: string;
}

// ── Audit row ─────────────────────────────────────────────────────────────────

export type LixAuditActor = 'lix' | 'human';

export interface LixAuditEntry {
  id: string;
  /** ISO timestamp */
  timestamp: string;
  actor: LixAuditActor;
  /** Display name — 'LIX/Signal' or a person's name */
  actorLabel: string;
  description: string;
  /** automated | human decision | override */
  tag: 'automated' | 'human decision' | 'override';
  /** Optional link target — run ID, case ID, etc. */
  entityId?: string;
}
