

import { forwardRef, HTMLAttributes, ReactNode } from 'react';

// Card variants for different use cases
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'ghost';
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  accentPosition?: 'top' | 'left' | 'none';
  hoverable?: boolean;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface-elevated border border-border',
  elevated: 'bg-surface-elevated border border-border shadow-card',
  outlined: 'bg-transparent border border-border',
  interactive: 'bg-surface-elevated border border-border cursor-pointer transition-all duration-150 hover:border-accent-blue/50 hover:shadow-card',
  ghost: 'bg-surface-card/50',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-6',
};

const radiusStyles: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

const accentColors: Record<string, string> = {
  blue: 'border-t-accent-blue',
  green: 'border-t-accent-green',
  amber: 'border-t-accent-amber',
  red: 'border-t-accent-red',
  purple: 'border-t-accent-purple',
  teal: 'border-t-accent-teal',
};

const accentColorsLeft: Record<string, string> = {
  blue: 'border-l-accent-blue',
  green: 'border-l-accent-green',
  amber: 'border-l-accent-amber',
  red: 'border-l-accent-red',
  purple: 'border-l-accent-purple',
  teal: 'border-l-accent-teal',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  accentColor,
  accentPosition = 'none',
  hoverable = false,
  className = '',
  children,
  ...props
}, ref) => {
  const baseStyles = variantStyles[variant];
  const padStyles = paddingStyles[padding];
  const radStyles = radiusStyles[radius];
  
  // Accent border styling
  let accentStyles = '';
  if (accentColor && accentPosition === 'top') {
    accentStyles = `border-t-2 ${accentColors[accentColor]}`;
  } else if (accentColor && accentPosition === 'left') {
    accentStyles = `border-l-2 ${accentColorsLeft[accentColor]}`;
  }
  
  // Hoverable enhancement (for non-interactive cards that still need hover)
  const hoverStyles = hoverable && variant !== 'interactive' 
    ? 'transition-all duration-150 hover:bg-surface-hover' 
    : '';

  return (
    <div
      ref={ref}
      className={`${baseStyles} ${padStyles} ${radStyles} ${accentStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Card Header subcomponent
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({ title, subtitle, action, icon, children, className = '', ...props }: CardHeaderProps) {
  // If children are provided, render them directly instead of the standard layout
  if (children) {
    return (
      <div className={`mb-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Card Content subcomponent (for consistent spacing)
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}

// Card Footer subcomponent
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({ children, align = 'right', className = '', ...props }: CardFooterProps) {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };
  
  return (
    <div className={`flex items-center gap-3 mt-4 pt-4 border-t border-border/50 ${alignStyles[align]} ${className}`} {...props}>
      {children}
    </div>
  );
}

// Stat Card - specialized card for metrics display
// v111: Enhanced with clickable states and navigation support
// v0.12.3: StatCard action types for contextual actions
export interface StatCardAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  context?: Record<string, unknown>; // Passed to click handler
  disabled?: boolean;
}

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  onClick?: () => void;
  /** Tooltip shown on hover for clickable cards */
  clickHint?: string;
  /** Show arrow indicator for clickable cards */
  showClickIndicator?: boolean;
  children?: ReactNode;
  // v0.12.3: Action buttons
  actions?: StatCardAction[];
  onActionClick?: (actionId: string, context?: Record<string, unknown>) => void;
}

const actionVariantStyles: Record<string, string> = {
  primary: 'bg-accent-blue text-white hover:bg-accent-blue/90',
  secondary: 'bg-surface-card text-text-primary hover:bg-surface-elevated border border-border',
  danger: 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20',
};

export function StatCard({ 
  value, 
  label,
  title,
  subtitle,
  icon,
  trend, 
  accentColor = 'blue',
  onClick,
  clickHint,
  showClickIndicator = true,
  className = '',
  children,
  actions,
  onActionClick,
  ...props 
}: StatCardProps) {
  const displayLabel = title || label || '';
  const colorMap: Record<string, string> = {
    blue: 'text-accent-blue',
    green: 'text-accent-green',
    amber: 'text-accent-amber',
    red: 'text-accent-red',
    purple: 'text-accent-purple',
    teal: 'text-accent-teal',
  };
  
  const isClickable = !!onClick;
  const hasActions = actions && actions.length > 0;
  const Wrapper = isClickable && !hasActions ? 'button' : 'div';
  
  const handleActionClick = (e: React.MouseEvent, action: StatCardAction) => {
    e.stopPropagation();
    if (!action.disabled && onActionClick) {
      onActionClick(action.id, action.context);
    }
  };
  
  return (
    <Card
      variant={isClickable ? 'interactive' : 'default'}
      padding="md"
      accentColor={accentColor}
      accentPosition="top"
      className={`${className} ${isClickable ? 'group' : ''}`}
      {...props}
    >
      <Wrapper 
        className={`w-full text-left ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={!hasActions ? onClick : undefined}
        title={clickHint}
      >
        {/* Main stat content */}
        <div 
          className={hasActions && isClickable ? 'cursor-pointer' : ''}
          onClick={hasActions && isClickable ? onClick : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">{displayLabel}</span>
            <div className="flex items-center gap-1.5">
              {icon && <span className="text-text-muted">{icon}</span>}
              {/* v111: Click indicator arrow */}
              {isClickable && showClickIndicator && (
                <span className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </div>
          </div>
          <div className={`text-3xl font-bold ${colorMap[accentColor] || 'text-text-primary'} ${
            isClickable ? 'group-hover:scale-[1.02] transition-transform origin-left' : ''
          }`}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-text-muted mt-1">{subtitle}</div>
          )}
          {trend && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-accent-green' : 'text-accent-red'
            }`}>
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-text-muted">{trend.label}</span>}
            </div>
          )}
          {/* v111: Click hint on hover */}
          {isClickable && clickHint && !hasActions && (
            <div className="text-[10px] text-text-muted mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {clickHint}
            </div>
          )}
          {children}
        </div>
        
        {/* v0.12.3: Action buttons row */}
        {hasActions && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={(e) => handleActionClick(e, action)}
                disabled={action.disabled}
                className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${actionVariantStyles[action.variant || 'secondary']}
                `}
              >
                {action.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </Wrapper>
    </Card>
  );
}
