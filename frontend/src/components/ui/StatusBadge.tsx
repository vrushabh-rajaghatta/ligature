interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-surface-card text-text-secondary border-border',
  success: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  warning: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  error: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  info: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function StatusBadge({ status, variant = 'default', size = 'sm' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded border ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {status}
    </span>
  );
}

// Helper to determine variant from common status strings
export function getStatusVariant(status: string): StatusBadgeProps['variant'] {
  const lower = status.toLowerCase();
  
  if (['approved', 'complete', 'completed', 'passed', 'valid', 'active', 'on track'].includes(lower)) {
    return 'success';
  }
  if (['warning', 'at risk', 'in progress', 'pending', 'draft'].includes(lower)) {
    return 'warning';
  }
  if (['error', 'failed', 'invalid', 'overdue', 'critical', 'crl'].includes(lower)) {
    return 'error';
  }
  if (['info', 'enrolling', 'submitted', 'under review'].includes(lower)) {
    return 'info';
  }
  
  return 'default';
}
