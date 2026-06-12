

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-accent-blue text-white 
    hover:bg-accent-blue/90 
    active:bg-accent-blue/80
    focus:ring-accent-blue/50
  `,
  secondary: `
    bg-surface-card text-text-primary border border-border
    hover:bg-surface-hover hover:border-border
    active:bg-surface-card
    focus:ring-border
  `,
  outline: `
    bg-transparent text-text-primary border border-border
    hover:bg-surface-card hover:border-text-muted
    active:bg-surface-hover
    focus:ring-border
  `,
  ghost: `
    bg-transparent text-text-secondary
    hover:bg-surface-card hover:text-text-primary
    active:bg-surface-hover
    focus:ring-border
  `,
  link: `
    bg-transparent text-accent-blue
    hover:text-accent-blue/80 hover:underline
    active:text-accent-blue/70
    focus:ring-accent-blue/50
    p-0
  `,
  danger: `
    bg-accent-red text-white
    hover:bg-accent-red/90
    active:bg-accent-red/80
    focus:ring-accent-red/50
  `,
  success: `
    bg-accent-green text-white
    hover:bg-accent-green/90
    active:bg-accent-green/80
    focus:ring-accent-green/50
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
};

const iconSizes: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// Spinner component for loading state
function Spinner({ size }: { size: ButtonSize }) {
  const sizeClass = iconSizes[size];
  return (
    <svg 
      className={`${sizeClass} animate-spin`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;
  
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const isDisabled = disabled || loading;

  // Render icon with proper sizing
  const renderIcon = (iconElement: ReactNode) => {
    if (!iconElement) return null;
    return (
      <span className={`flex-shrink-0 ${iconSizes[size]}`}>
        {iconElement}
      </span>
    );
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${widthStyle} ${className}`}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {!loading && icon && iconPosition === 'left' && renderIcon(icon)}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && renderIcon(icon)}
    </button>
  );
});

Button.displayName = 'Button';

// Icon-only button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string; // Required for accessibility
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  loading = false,
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center
    rounded-lg
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;
  
  const variantStyle = variantStyles[variant];
  
  // Square sizing for icon buttons
  const squareSizes: Record<ButtonSize, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };
  
  const sizeStyle = squareSizes[size];
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-label={label}
      title={label}
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <span className={iconSizes[size]}>{icon}</span>
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';

// Button Group for related actions
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}
