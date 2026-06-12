

import { useState } from 'react';
import { ChevronDown, Check, Clock, FileText, Eye, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useHAQStore } from '@/store/useHAQStore';
import { useToast } from '@/components/ui/Toast';
import type { HAQStatus } from '@/types/haq';

const statusConfig: Record<HAQStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'new': { label: 'New', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  'open': { label: 'Open', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  'in-progress': { label: 'In Progress', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <Clock className="w-3.5 h-3.5" /> },
  'draft-ready': { label: 'Draft Ready', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20', icon: <FileText className="w-3.5 h-3.5" /> },
  'under-review': { label: 'Under Review', color: 'text-accent-teal', bgColor: 'bg-accent-teal/20', icon: <Eye className="w-3.5 h-3.5" /> },
  'partially-responded': { label: 'Partial', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <Clock className="w-3.5 h-3.5" /> },
  'submitted': { label: 'Submitted', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <Send className="w-3.5 h-3.5" /> },
  'closed': { label: 'Closed', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

// Allowed status transitions
const statusTransitions: Record<HAQStatus, HAQStatus[]> = {
  'new': ['in-progress'],
  'open': ['in-progress'],
  'in-progress': ['draft-ready', 'new'],
  'draft-ready': ['under-review', 'in-progress'],
  'under-review': ['submitted', 'draft-ready'],
  'partially-responded': ['in-progress', 'submitted'],
  'submitted': ['closed', 'in-progress'], // Allow reopening
  'closed': ['in-progress'], // Allow reopening
};

interface HAQStatusSelectorProps {
  haqId: string;
  currentStatus: HAQStatus;
  onStatusChange?: (newStatus: HAQStatus) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export function HAQStatusSelector({ 
  haqId, 
  currentStatus, 
  onStatusChange,
  disabled = false,
  showLabel = true,
}: HAQStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateHAQStatus = useHAQStore((state) => state.updateHAQStatus);
  const toast = useToast();
  
  const config = statusConfig[currentStatus] || statusConfig['new'];
  const allowedTransitions = statusTransitions[currentStatus] || [];

  const handleStatusChange = (newStatus: HAQStatus) => {
    const newConfig = statusConfig[newStatus];
    updateHAQStatus(haqId, newStatus);
    onStatusChange?.(newStatus);
    setIsOpen(false);
    toast.success(`Status changed to ${newConfig?.label ?? ''}`);
  };

  if (disabled || allowedTransitions.length === 0) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bgColor} ${config?.color ?? ''}`}
        data-testid="haq-status-badge"
      >
        {config.icon}
        {showLabel && <span className="text-sm font-medium">{config.label}</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bgColor} ${config?.color ?? ''} hover:opacity-80 transition-opacity`}
        data-testid="haq-status-selector"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {config.icon}
        {showLabel && <span className="text-sm font-medium">{config.label}</span>}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            data-testid="haq-status-backdrop"
          />
          
          {/* Dropdown */}
          <div 
            className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg py-1 z-20 min-w-[160px]"
            role="listbox"
            data-testid="haq-status-dropdown"
          >
            <div className="px-3 py-1.5 text-xs text-text-muted border-b border-border mb-1">
              Change status to:
            </div>
            {allowedTransitions.map((status) => {
              const statusCfg = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-surface-card transition-colors text-left"
                  role="option"
                  data-testid={`haq-status-option-${status}`}
                >
                  <span className={`${statusCfg.bgColor} ${statusCfg?.color ?? ''} p-1 rounded`}>
                    {statusCfg.icon}
                  </span>
                  <span className="text-sm text-text-primary">{statusCfg.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Simple badge version (non-interactive)
export function HAQStatusBadge({ status }: { status: HAQStatus }) {
  const config = statusConfig[status] || statusConfig['new'];
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config?.color ?? ''}`}
      data-testid="haq-status-badge"
    >
      {config.icon}
      {config.label}
    </span>
  );
}
