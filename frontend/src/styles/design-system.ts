/**
 * Ligature Design System - v0.48.0
 * Single source of truth for spacing, typography, and layout constants
 * 
 * v0.27.0 — Initial design system
 * v0.48.0 — UI Consistency: status colors, screen header presets, card hover
 * 
 * USAGE:
 * import { spacing, typography, layout, colors } from '@/styles/design-system';
 */

// ============================================================================
// COLOR TOKENS (v0.48.0)
// ============================================================================
// Maps to CSS variables in globals.css. Use these for TypeScript type safety.

export const colors = {
  // Accent colors
  accent: {
    blue: 'var(--accent-blue)',       // #1E90FF — primary actions, links
    teal: 'var(--accent-teal)',       // #14B8A6 — secondary accent
    green: 'var(--accent-green)',     // #10B981 — success, positive
    amber: 'var(--accent-amber)',     // #F59E0B — warnings, attention
    purple: 'var(--accent-purple)',   // #7C3AED — premium, special
    red: 'var(--accent-red)',         // #EF4444 — errors, critical
  },
  // Semantic status (v0.48.0)
  status: {
    success: 'var(--status-success)',   // green — completed, approved, active
    warning: 'var(--status-warning)',   // amber — needs attention, pending review
    error: 'var(--status-error)',       // red — failed, rejected, overdue
    info: 'var(--status-info)',         // blue — informational, in progress
    pending: 'var(--status-pending)',   // purple — awaiting, queued
    neutral: 'var(--status-neutral)',   // gray — draft, inactive, archived
  },
  // Status mapping guide: which status to use for common pharma states
  // approved/effective/complete → success
  // in-review/pending-approval → warning
  // rejected/failed/overdue → error
  // in-progress/submitted → info
  // queued/pending/awaiting → pending
  // draft/inactive/archived → neutral
} as const;

// ============================================================================
// SPACING SCALE
// ============================================================================
// Based on 4px base unit for consistent rhythm

export const spacing = {
  // Base units
  px: '1px',
  0: '0',
  0.5: '2px',   // 0.5 * 4
  1: '4px',     // 1 * 4
  1.5: '6px',   // 1.5 * 4
  2: '8px',     // 2 * 4
  2.5: '10px',  // 2.5 * 4
  3: '12px',    // 3 * 4
  3.5: '14px',  // 3.5 * 4
  4: '16px',    // 4 * 4
  5: '20px',    // 5 * 4
  6: '24px',    // 6 * 4
  7: '28px',    // 7 * 4
  8: '32px',    // 8 * 4
  9: '36px',    // 9 * 4
  10: '40px',   // 10 * 4
  11: '44px',   // 11 * 4
  12: '48px',   // 12 * 4
  14: '56px',   // 14 * 4
  16: '64px',   // 16 * 4
  20: '80px',   // 20 * 4
  24: '96px',   // 24 * 4
  28: '112px',  // 28 * 4
  32: '128px',  // 32 * 4
  36: '144px',  // 36 * 4
  40: '160px',  // 40 * 4
  44: '176px',  // 44 * 4
  48: '192px',  // 48 * 4
  52: '208px',  // 52 * 4
  56: '224px',  // 56 * 4
  60: '240px',  // 60 * 4
  64: '256px',  // 64 * 4
  72: '288px',  // 72 * 4
  80: '320px',  // 80 * 4
  96: '384px',  // 96 * 4
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const typography = {
  // Font sizes
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  
  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const layout = {
  // Panel sizes
  panel: {
    sidebar: {
      collapsed: 48,
      default: 240,
      expanded: 280,
      min: 200,
      max: 400,
    },
    detail: {
      default: 400,
      min: 320,
      max: 600,
    },
    main: {
      minWidth: 600,
    },
  },
  
  // Container max widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },
  
  // Card sizes
  card: {
    stat: {
      minWidth: 140,
      maxWidth: 200,
    },
    default: {
      minWidth: 280,
      maxWidth: 400,
    },
  },
  
  // Grid gaps
  gap: {
    xs: spacing[1],   // 4px
    sm: spacing[2],   // 8px
    md: spacing[4],   // 16px
    lg: spacing[6],   // 24px
    xl: spacing[8],   // 32px
  },
  
  // Border radius
  radius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },
  
  // Z-index scale
  zIndex: {
    dropdown: 50,
    sticky: 40,
    fixed: 30,
    modalBackdrop: 60,
    modal: 70,
    popover: 80,
    tooltip: 90,
    toast: 100,
  },
  
  // Split view defaults
  splitView: {
    leftPanel: {
      default: 320,
      min: 240,
      max: 480,
    },
    rightPanel: {
      default: 400,
      min: 320,
      max: 600,
    },
    resizeHandle: 4,
  },
} as const;

// ============================================================================
// COMPONENT-SPECIFIC PRESETS
// ============================================================================

export const componentPresets = {
  // Standard screen layout with stats at top
  screenLayout: {
    padding: spacing[6],      // 24px
    headerGap: spacing[4],    // 16px
    sectionGap: spacing[6],   // 24px
    cardGap: spacing[4],      // 16px
  },
  
  // Stat card grid
  statGrid: {
    columns: {
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    },
    gap: spacing[4],          // 16px
    minCardWidth: 140,
  },
  
  // Data table
  table: {
    rowHeight: 48,
    headerHeight: 44,
    cellPadding: spacing[3],  // 12px
  },
  
  // Panel layouts
  splitView: {
    leftPanel: {
      default: 320,
      min: 240,
      max: 480,
    },
    rightPanel: {
      default: 400,
      min: 320,
      max: 600,
    },
    resizeHandle: 4,
  },
} as const;

// ============================================================================
// TAILWIND CLASS PRESETS
// ============================================================================
// Pre-composed class strings for common patterns

export const tw = {
  // Screen container
  screenContainer: 'flex-1 flex flex-col overflow-hidden bg-surface',
  
  // Content area with standard padding
  contentArea: 'flex-1 overflow-auto p-6',
  
  // Stats grid - responsive
  statsGrid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
  
  // Card grid - responsive
  cardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  
  // Section spacing
  section: 'space-y-4',
  sectionHeader: 'flex items-center justify-between mb-4',
  sectionTitle: 'text-lg font-semibold text-text-primary',
  
  // Panel layouts
  splitContainer: 'flex-1 flex overflow-hidden',
  mainPanel: 'flex-1 min-w-0 overflow-hidden flex flex-col',
  sidePanel: 'flex-shrink-0 overflow-hidden flex flex-col border-l border-border',
  
  // Table container
  tableContainer: 'flex-1 overflow-auto',
  tableHeader: 'sticky top-0 bg-surface-elevated z-10',
  
  // Interactive elements
  clickableCard: 'cursor-pointer hover:bg-surface-card transition-colors hover:ring-1 hover:ring-accent-blue/30',
  clickableRow: 'cursor-pointer hover:bg-surface-elevated transition-colors',
  
  // Empty states
  emptyState: 'flex-1 flex items-center justify-center p-8 text-center',

  // v0.48.0: Screen header presets
  screenTitle: 'text-xl sm:text-2xl font-semibold text-text-primary',
  screenSubtitle: 'text-sm text-text-muted mt-0.5',
  screenHeaderRow: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3',
  screenPadding: 'px-4 md:px-6',
  screenContentPadding: 'px-4 md:px-6 pb-6',

  // v0.48.0: Status badge presets
  statusSuccess: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  statusWarning: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  statusError: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  statusInfo: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  statusPending: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  statusNeutral: 'bg-surface-card text-text-muted border-border',

  // v0.48.0: Card hover preset
  cardHover: 'transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg',
} as const;

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  colors,
  spacing,
  typography,
  layout,
  componentPresets,
  tw,
  animation,
};
