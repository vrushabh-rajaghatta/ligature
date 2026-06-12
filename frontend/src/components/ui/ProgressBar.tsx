interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = 'bg-accent-blue', 
  showLabel = false,
  label,
  size = 'md' 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      <div className={`bg-surface-card rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${color} ${heights[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-text-muted mt-1">{label || `${Math.round(percentage)}%`}</div>
      )}
    </div>
  );
}
