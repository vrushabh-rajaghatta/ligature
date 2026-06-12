/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use class-based dark mode driven by our .theme-dark CSS class
  // This lets Tailwind's `dark:` variant work alongside our custom theme system
  darkMode: ['class', '.theme-dark'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Design-system color tokens ────────────────────────────────────────
      // Mirror every CSS variable in :root{} so Tailwind generates the utility
      // classes (bg-surface-elevated, text-text-primary, border-border, etc.)
      // that are used throughout the codebase.
      colors: {
        // Surface stack
        'surface':          'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-card':     'var(--surface-card)',
        'surface-hover':    'var(--surface-hover)',
        // Border
        'border':           'var(--border)',
        // Text
        'text-primary':     'var(--text-primary)',
        'text-secondary':   'var(--text-secondary)',
        'text-muted':       'var(--text-muted)',
        // Accents
        'accent-blue':      'var(--accent-blue)',
        'accent-teal':      'var(--accent-teal)',
        'accent-green':     'var(--accent-green)',
        'accent-amber':     'var(--accent-amber)',
        'accent-purple':    'var(--accent-purple)',
        'accent-red':       'var(--accent-red)',
        // Semantic status
        'status-success':   'var(--status-success)',
        'status-warning':   'var(--status-warning)',
        'status-error':     'var(--status-error)',
        'status-info':      'var(--status-info)',
        'status-pending':   'var(--status-pending)',
        'status-neutral':   'var(--status-neutral)',
      },

      // ─── Shadow scale ───────────────────────────────────────────────────────
      // shadow-modal / shadow-elevated / shadow-card are used in
      // Modal.tsx, Card.tsx, Select.tsx — previously unresolved.
      boxShadow: {
        'card':     '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.10)',
        'elevated': '0 10px 25px -3px rgba(0,0,0,0.30), 0 4px 6px -2px rgba(0,0,0,0.20)',
        'modal':    '0 25px 50px -12px rgba(0,0,0,0.50), 0 0 0 1px rgba(51,65,85,0.30)',
      },

      // ─── Z-index token scale ────────────────────────────────────────────────
      // Named tokens clarify intent; raw numbers still work for legacy code.
      // Hierarchy: sticky < dropdown < drawer < modal < demo < toast < pwa
      zIndex: {
        'sticky':        '10',
        'dropdown':      '20',
        'drawer':        '30',
        'modal-overlay': '40',
        'modal':         '50',
        'demo-tooltip':  '55',
        'demo-overlay':  '60',
        'demo-modal':    '70',
        'toast':        '100',
        'pwa':          '200',
      },
    },
  },
  plugins: [
    // Provides animate-in / fade-in / zoom-in-95 / slide-in-from-* utilities
    // used in Modal.tsx, PWARegistration, SafetySignalCascadeOverlay, etc.
    require('tailwindcss-animate'),
  ],
}
