
import React from 'react';

// v0.12.3: StatCard action types for contextual actions
export interface StatCardAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  context?: Record<string, unknown>; // Passed to click handler
  disabled?: boolean;
}

interface StatCardProps {
  value: string | number;
  label?: string;
  title?: string; // Alias for label
  color?: string;
  variant?: string; // Alias for color (e.g., 'purple' -> 'text-accent-purple')
  accentColor?: string; // Alternative accent color prop
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  onClick?: () => void;
  clickHint?: string; // Tooltip hint for clickable cards
  showClickIndicator?: boolean;
  className?: string;
  children?: React.ReactNode;
  // v0.12.3: Action buttons
  actions?: StatCardAction[];
  onActionClick?: (actionId: string, context?: Record<string, unknown>) => void;
}

const variantToColor: Record<string, string> = {
  purple: 'text-accent-purple',
  blue: 'text-accent-blue',
  green: 'text-accent-green',
  amber: 'text-accent-amber',
  teal: 'text-accent-teal',
  red: 'text-accent-red',
  orange: 'text-accent-orange',
};

const actionVariantStyles: Record<string, string> = {
  primary: 'bg-accent-blue text-white hover:bg-accent-blue/90',
  secondary: 'bg-surface-card text-text-primary hover:bg-surface-elevated border border-border',
  danger: 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20',
};

export function StatCard({ 
  value, 
  label, 
  title, 
  color, 
  variant, 
  accentColor,
  icon, 
  trend, 
  onClick,
  clickHint,
  showClickIndicator = true,
  className = '',
  children,
  actions,
  onActionClick
}: StatCardProps) {
  const displayLabel = label || title || '';
  const displayColor = color || 
    (accentColor ? variantToColor[accentColor] || `text-accent-${accentColor}` : null) ||
    (variant ? variantToColor[variant] || 'text-accent-blue' : 'text-accent-blue');
  
  // When actions are present, we use a div wrapper with separate click handling
  const hasActions = actions && actions.length > 0;
  const Wrapper = onClick && !hasActions ? 'button' : 'div';
  
  const handleActionClick = (e: React.MouseEvent, action: StatCardAction) => {
    e.stopPropagation();
    if (!action.disabled && onActionClick) {
      onActionClick(action.id, action.context);
    }
  };

  const handleMainClick = () => {
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <Wrapper 
      className={`bg-surface-elevated rounded-lg p-4 text-center w-full ${
        onClick ? 'cursor-pointer hover:bg-surface-card transition-colors hover:ring-1 hover:ring-accent-blue/30' : ''
      } ${className}`}
      onClick={!hasActions ? onClick : undefined}
      title={clickHint}
    >
      {/* Main stat content - clickable when actions exist */}
      <div 
        className={hasActions && onClick ? 'cursor-pointer' : ''}
        onClick={hasActions ? handleMainClick : undefined}
      >
        {icon && <div className={`flex justify-center mb-2 ${displayColor}`}>{icon}</div>}
        <div className={`text-3xl font-bold ${displayColor}`}>{value}</div>
        <div className="text-sm text-text-secondary mt-1">{displayLabel}</div>
        {trend && (
          <div className={`text-xs mt-2 ${trend.direction === 'up' ? 'text-accent-green' : 'text-accent-red'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label && <span className="text-text-muted">{trend.label}</span>}
          </div>
        )}
        {children}
      </div>
      
      {/* v0.12.3: Action buttons row */}
      {hasActions && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 justify-center">
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
  );
}
