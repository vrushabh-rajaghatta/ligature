
import { ReactNode } from 'react';

// Badge variants
export type BadgeVariant = 'default' | 'outline' | 'soft';
export type BadgeColor = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink' | 'cyan' | 'emerald' | 'orange' | 'violet' | 'slate';
export type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
}

const colorStyles: Record<BadgeColor, Record<BadgeVariant, string>> = {
  gray: {
    default: 'bg-slate-500 text-white',
    outline: 'border border-slate-500 text-slate-400',
    soft: 'bg-slate-500/20 text-slate-400',
  },
  slate: {
    default: 'bg-slate-600 text-white',
    outline: 'border border-slate-600 text-slate-500',
    soft: 'bg-slate-600/20 text-slate-500',
  },
  blue: {
    default: 'bg-accent-blue text-white',
    outline: 'border border-accent-blue text-accent-blue',
    soft: 'bg-accent-blue/20 text-accent-blue',
  },
  cyan: {
    default: 'bg-cyan-500 text-white',
    outline: 'border border-cyan-500 text-cyan-400',
    soft: 'bg-cyan-500/20 text-cyan-400',
  },
  green: {
    default: 'bg-accent-green text-white',
    outline: 'border border-accent-green text-accent-green',
    soft: 'bg-accent-green/20 text-accent-green',
  },
  emerald: {
    default: 'bg-emerald-500 text-white',
    outline: 'border border-emerald-500 text-emerald-400',
    soft: 'bg-emerald-500/20 text-emerald-400',
  },
  amber: {
    default: 'bg-accent-amber text-white',
    outline: 'border border-accent-amber text-accent-amber',
    soft: 'bg-accent-amber/20 text-accent-amber',
  },
  orange: {
    default: 'bg-orange-500 text-white',
    outline: 'border border-orange-500 text-orange-400',
    soft: 'bg-orange-500/20 text-orange-400',
  },
  red: {
    default: 'bg-accent-red text-white',
    outline: 'border border-accent-red text-accent-red',
    soft: 'bg-accent-red/20 text-accent-red',
  },
  purple: {
    default: 'bg-accent-purple text-white',
    outline: 'border border-accent-purple text-accent-purple',
    soft: 'bg-accent-purple/20 text-accent-purple',
  },
  violet: {
    default: 'bg-violet-500 text-white',
    outline: 'border border-violet-500 text-violet-400',
    soft: 'bg-violet-500/20 text-violet-400',
  },
  teal: {
    default: 'bg-accent-teal text-white',
    outline: 'border border-accent-teal text-accent-teal',
    soft: 'bg-accent-teal/20 text-accent-teal',
  },
  pink: {
    default: 'bg-accent-pink text-white',
    outline: 'border border-accent-pink text-accent-pink',
    soft: 'bg-accent-pink/20 text-accent-pink',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

const iconSizes: Record<BadgeSize, string> = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

const dotSizes: Record<BadgeSize, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2 h-2',
};

export function Badge({
  children,
  variant = 'soft',
  color = 'gray',
  size = 'sm',
  icon,
  dot = false,
  className = '',
}: BadgeProps) {
  const colorStyle = colorStyles[color][variant];
  const sizeStyle = sizeStyles[size];
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 
        font-medium rounded-full
        ${colorStyle} ${sizeStyle} ${className}
      `}
    >
      {dot && (
        <span className={`${dotSizes[size]} rounded-full bg-current`} />
      )}
      {icon && (
        <span className={iconSizes[size]}>{icon}</span>
      )}
      {children}
    </span>
  );
}

// Status Badge - pre-configured for common statuses
type StatusType = 
  | 'success' | 'warning' | 'error' | 'info' 
  | 'active' | 'inactive' | 'pending' | 'draft'
  | 'complete' | 'in-progress' | 'blocked' | 'at-risk'
  | 'open' | 'closed' | 'new' | 'overdue';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { color: BadgeColor; label: string }> = {
  success: { color: 'green', label: 'Success' },
  warning: { color: 'amber', label: 'Warning' },
  error: { color: 'red', label: 'Error' },
  info: { color: 'blue', label: 'Info' },
  active: { color: 'green', label: 'Active' },
  inactive: { color: 'gray', label: 'Inactive' },
  pending: { color: 'amber', label: 'Pending' },
  draft: { color: 'gray', label: 'Draft' },
  complete: { color: 'green', label: 'Complete' },
  'in-progress': { color: 'blue', label: 'In Progress' },
  blocked: { color: 'red', label: 'Blocked' },
  'at-risk': { color: 'amber', label: 'At Risk' },
  open: { color: 'blue', label: 'Open' },
  closed: { color: 'gray', label: 'Closed' },
  new: { color: 'purple', label: 'New' },
  overdue: { color: 'red', label: 'Overdue' },
};

export function StatusBadge({ 
  status, 
  label, 
  size = 'sm', 
  showDot = false,
  className = '' 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      color={config.color} 
      size={size} 
      dot={showDot}
      className={className}
    >
      {label || config.label}
    </Badge>
  );
}

// Count Badge - for notification counts, etc.
interface CountBadgeProps {
  count: number;
  max?: number;
  color?: BadgeColor;
  size?: 'xs' | 'sm';
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99, 
  color = 'red', 
  size = 'xs',
  className = '' 
}: CountBadgeProps) {
  if (count === 0) return null;
  
  const displayCount = count > max ? `${max}+` : count.toString();
  
  return (
    <Badge color={color} variant="default" size={size} className={`min-w-[18px] justify-center ${className}`}>
      {displayCount}
    </Badge>
  );
}

// Tag - removable badge for filters, selections
interface TagProps {
  children: ReactNode;
  onRemove?: () => void;
  color?: BadgeColor;
  className?: string;
}

export function Tag({ children, onRemove, color = 'blue', className = '' }: TagProps) {
  return (
    <span 
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1 text-xs font-medium rounded
        ${colorStyles[color]?.soft}
        ${className}
      `}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-white/10 rounded p-0.5 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
