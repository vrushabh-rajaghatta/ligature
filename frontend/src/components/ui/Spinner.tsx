
import { ReactNode } from 'react';

// Spinner sizes
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: 'current' | 'blue' | 'white';
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorStyles: Record<string, string> = {
  current: 'text-current',
  blue: 'text-accent-blue',
  white: 'text-white',
};

export function Spinner({ size = 'md', color = 'current', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
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

// Loading dots animation
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'current' | 'blue' | 'muted';
  className?: string;
}

const dotSizes: Record<string, string> = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
};

const dotColors: Record<string, string> = {
  current: 'bg-current',
  blue: 'bg-accent-blue',
  muted: 'bg-text-muted',
};

export function LoadingDots({ size = 'md', color = 'muted', className = '' }: LoadingDotsProps) {
  const dotClass = `${dotSizes[size]} ${dotColors[color]} rounded-full`;
  
  return (
    <div className={`flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '0ms' }} />
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '150ms' }} />
      <div className={`${dotClass} animate-bounce`} style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// Skeleton loader for content placeholders
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height,
  className = '' 
}: SkeletonProps) {
  const baseStyles = 'bg-surface-hover animate-pulse';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  // Default sizes for variants
  if (!height && variant === 'circular') style.height = style.width || '40px';
  if (!width && variant === 'circular') style.width = style.height || '40px';
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Skeleton text block
interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          width={i === lines - 1 ? '60%' : '100%'} 
        />
      ))}
    </div>
  );
}

// Skeleton card
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-elevated border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="50%" className="mb-2" />
          <Skeleton variant="text" width="30%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = 'Loading...', className = '' }: LoadingOverlayProps) {
  return (
    <div className={`absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="text-center">
        <Spinner size="lg" color="blue" className="mx-auto mb-3" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

// Inline loading state
interface LoadingInlineProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingInline({ message, size = 'md', className = '' }: LoadingInlineProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Spinner size={size === 'sm' ? 'sm' : 'md'} color="blue" />
      {message && <span className={`text-text-secondary ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{message}</span>}
    </div>
  );
}

// Loading state wrapper
interface LoadingWrapperProps {
  loading: boolean;
  children: ReactNode;
  skeleton?: ReactNode;
  overlay?: boolean;
  message?: string;
}

export function LoadingWrapper({ 
  loading, 
  children, 
  skeleton,
  overlay = false,
  message 
}: LoadingWrapperProps) {
  if (loading && skeleton) {
    return <>{skeleton}</>;
  }
  
  if (loading && overlay) {
    return (
      <div className="relative">
        {children}
        <LoadingOverlay message={message} />
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingInline message={message} />
      </div>
    );
  }
  
  return <>{children}</>;
}
