import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Alert } from '@/types/core';

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
}

const alertStyles = {
  Critical: {
    bg: 'bg-accent-red/10',
    border: 'border-accent-red',
    icon: <AlertTriangle className="w-4 h-4 text-accent-red" />,
  },
  Warning: {
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber',
    icon: <AlertCircle className="w-4 h-4 text-accent-amber" />,
  },
  Info: {
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue',
    icon: <Info className="w-4 h-4 text-accent-blue" />,
  },
};

export function AlertCard({ alert, onClick }: AlertCardProps) {
  const style = alertStyles[alert.type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left ${style?.bg ?? ''} border-l-2 ${style?.border ?? ''} p-3 rounded-r-lg hover:bg-opacity-20 transition-colors`}
    >
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">{alert.title}</div>
          <div className="text-xs text-text-secondary mt-0.5 truncate">{alert.description}</div>
        </div>
      </div>
    </button>
  );
}
