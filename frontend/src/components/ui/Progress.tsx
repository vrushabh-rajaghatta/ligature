
import { ReactNode } from 'react';

// Progress bar sizes
export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';
export type ProgressColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'gradient' | 'cyan' | 'emerald' | 'orange' | 'slate';

interface ProgressBarProps {
  value?: number;
  progress?: number; // Alias for value (backwards compatibility)
  max?: number;
  size?: ProgressSize;
  color?: ProgressColor;
  showLabel?: boolean;
  label?: string; // Custom label text
  labelPosition?: 'inside' | 'outside' | 'none';
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const sizeStyles: Record<ProgressSize, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const colorStyles: Record<ProgressColor, string> = {
  blue: 'bg-accent-blue',
  green: 'bg-accent-green',
  amber: 'bg-accent-amber',
  red: 'bg-accent-red',
  purple: 'bg-accent-purple',
  teal: 'bg-accent-teal',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  slate: 'bg-slate-500',
  gradient: 'bg-gradient-to-r from-accent-blue to-accent-green',
};

export function ProgressBar({
  value,
  progress,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  label,
  labelPosition = 'outside',
  animated = false,
  striped = false,
  className = '',
}: ProgressBarProps) {
  const effectiveValue = value ?? progress ?? 0;
  const percentage = Math.min(100, Math.max(0, (effectiveValue / max) * 100));
  const displayLabel = label || `${Math.round(percentage)}%`;
  const sizeStyle = sizeStyles[size];
  const colorStyle = colorStyles[color];
  
  const stripedStyle = striped ? `
    bg-[length:1rem_1rem]
    bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]
  ` : '';
  
  const animatedStyle = animated ? 'animate-[progress-stripes_1s_linear_infinite]' : '';
  
  const bar = (
    <div className={`w-full bg-surface-card rounded-full overflow-hidden ${sizeStyle} ${className}`}>
      <div 
        className={`${sizeStyle} rounded-full transition-all duration-300 ease-out ${colorStyle} ${stripedStyle} ${animatedStyle}`}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={effectiveValue}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
  
  if (!showLabel) return bar;
  
  if (labelPosition === 'inside' && size === 'lg') {
    return (
      <div className={`w-full bg-surface-card rounded-full overflow-hidden ${sizeStyle} relative ${className}`}>
        <div 
          className={`${sizeStyle} rounded-full transition-all duration-300 ease-out ${colorStyle} ${stripedStyle} ${animatedStyle}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-text-primary">
          {displayLabel}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      {bar}
      <span className="text-xs text-text-muted tabular-nums min-w-[3ch]">{displayLabel}</span>
    </div>
  );
}

// Progress with label above
interface LabeledProgressProps extends ProgressBarProps {
  label: string;
  sublabel?: string;
}

export function LabeledProgress({ label, sublabel, ...props }: LabeledProgressProps) {
  const percentage = Math.min(100, Math.max(0, ((props.value || 0) / (props.max || 100)) * 100));
  
  return (
    <div className={props.className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm font-medium text-text-primary tabular-nums">{Math.round(percentage)}%</span>
      </div>
      {sublabel && <p className="text-xs text-text-muted mb-2">{sublabel}</p>}
      <ProgressBar {...props} showLabel={false} className="" />
    </div>
  );
}

// Circular progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: ProgressColor;
  showLabel?: boolean;
  thickness?: number;
  className?: string;
}

const circularSizes: Record<string, { size: number; fontSize: string }> = {
  sm: { size: 32, fontSize: 'text-[10px]' },
  md: { size: 48, fontSize: 'text-xs' },
  lg: { size: 64, fontSize: 'text-sm' },
  xl: { size: 96, fontSize: 'text-lg' },
};

const circularColors: Record<ProgressColor, string> = {
  blue: 'stroke-accent-blue',
  green: 'stroke-accent-green',
  amber: 'stroke-accent-amber',
  red: 'stroke-accent-red',
  purple: 'stroke-accent-purple',
  teal: 'stroke-accent-teal',
  cyan: 'stroke-cyan-500',
  emerald: 'stroke-emerald-500',
  orange: 'stroke-orange-500',
  slate: 'stroke-slate-500',
  gradient: 'stroke-accent-blue', // Gradient doesn't work well with SVG stroke
};

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = true,
  thickness = 4,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const { size: svgSize, fontSize } = circularSizes[size];
  const radius = (svgSize - thickness) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-surface-card"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          className={`${circularColors[color]} transition-all duration-300 ease-out`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showLabel && (
        <span className={`absolute ${fontSize} font-medium text-text-primary tabular-nums`}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Step Progress
interface Step {
  label: string;
  description?: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface StepProgressProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  className?: string;
}

export function StepProgress({ 
  steps, 
  orientation = 'horizontal', 
  size = 'md',
  className = '' 
}: StepProgressProps) {
  const isVertical = orientation === 'vertical';
  const dotSize = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  const lineThickness = size === 'sm' ? 'h-0.5 w-0.5' : 'h-0.5 w-0.5';
  
  return (
    <div className={`${isVertical ? 'flex flex-col' : 'flex items-start'} ${className}`}>
      {steps.map((step, index) => (
        <div 
          key={index}
          className={`
            flex items-center
            ${isVertical ? 'flex-row' : 'flex-col flex-1'}
            ${index < steps.length - 1 ? '' : ''}
          `}
        >
          {/* Step indicator */}
          <div className="flex items-center">
            <div 
              className={`
                ${dotSize} rounded-full flex items-center justify-center font-medium
                ${step.status === 'complete' 
                  ? 'bg-accent-green text-white' 
                  : step.status === 'current'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card border-2 border-border text-text-muted'
                }
              `}
            >
              {step.status === 'complete' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
          </div>
          
          {/* Labels */}
          <div className={`${isVertical ? 'ml-3 pb-8' : 'mt-2 text-center px-2'}`}>
            <div className={`text-sm font-medium ${
              step.status === 'upcoming' ? 'text-text-muted' : 'text-text-primary'
            }`}>
              {step.label}
            </div>
            {step.description && (
              <div className="text-xs text-text-muted mt-0.5">{step.description}</div>
            )}
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className={`
              ${isVertical 
                ? 'absolute left-4 top-8 bottom-0 w-0.5' 
                : 'flex-1 h-0.5 mx-2 mt-4'
              }
              ${step.status === 'complete' ? 'bg-accent-green' : 'bg-border'}
            `} />
          )}
        </div>
      ))}
    </div>
  );
}
