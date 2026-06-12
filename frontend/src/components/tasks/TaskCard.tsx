
/**
 * TaskCard - v0.12.1
 * 
 * Reusable task card component for the Action Center and anywhere tasks are displayed.
 * Features:
 * - Priority-based styling (critical/high/medium/low)
 * - Due date badges with overdue highlighting
 * - Source module icon and label
 * - Primary action button + secondary navigation
 * - Compact variant for dense lists
 */

import React from 'react';
import { 
  Clock, ExternalLink, ChevronRight,
  MessageSquare, FileText, ShieldAlert, AlertCircle, AlertTriangle,
  CheckSquare, Target, Tag, FolderOpen, ThumbsUp, PenTool, CheckCircle2
} from 'lucide-react';
import { 
  TASK_TYPE_CONFIG,
  type AggregatedTask,
  type TaskType,
  type TaskPriority 
} from '@/store/useTaskAggregationStore';

// Icon mapping for task types
export const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  'haq-response': <MessageSquare className="w-4 h-4" />,
  'haq-review': <CheckCircle2 className="w-4 h-4" />,
  'document-review': <FileText className="w-4 h-4" />,
  'document-signature': <PenTool className="w-4 h-4" />,
  'safety-signal': <AlertTriangle className="w-4 h-4" />,
  'safety-case': <ShieldAlert className="w-4 h-4" />,
  'deviation-response': <AlertCircle className="w-4 h-4" />,
  'capa-action': <CheckSquare className="w-4 h-4" />,
  'submission-milestone': <Target className="w-4 h-4" />,
  'workflow-approval': <ThumbsUp className="w-4 h-4" />,
  'tmf-artifact': <FolderOpen className="w-4 h-4" />,
  'labeling-review': <Tag className="w-4 h-4" />,
};

// Priority styling
export const PRIORITY_STYLES: Record<TaskPriority, { 
  bg: string; 
  text: string; 
  border: string;
  ringColor: string;
}> = {
  critical: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-500', 
    border: 'border-red-500/30',
    ringColor: 'ring-red-500/30'
  },
  high: { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-500', 
    border: 'border-orange-500/30',
    ringColor: 'ring-orange-500/30'
  },
  medium: { 
    bg: 'bg-yellow-500/10', 
    text: 'text-yellow-500', 
    border: 'border-yellow-500/30',
    ringColor: 'ring-yellow-500/30'
  },
  low: { 
    bg: 'bg-slate-500/10', 
    text: 'text-slate-400', 
    border: 'border-slate-500/30',
    ringColor: 'ring-slate-500/30'
  },
};

export interface TaskCardProps {
  task: AggregatedTask;
  /** Primary action handler (e.g., "Draft Response") */
  onAction?: (task: AggregatedTask) => void;
  /** Navigate to source item */
  onNavigate?: (task: AggregatedTask) => void;
  /** Mark task as complete */
  onComplete?: (task: AggregatedTask) => void;
  /** Compact display for dense lists */
  compact?: boolean;
  /** Show the primary action button */
  showAction?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Format due date for display
 */
function getDueDateDisplay(daysUntilDue: number | null): string | null {
  if (daysUntilDue === null) return null;
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

/**
 * TaskCard Component
 */
export function TaskCard({ 
  task, 
  onAction, 
  onNavigate,
  onComplete,
  compact = false,
  showAction = true,
  className = '',
}: TaskCardProps) {
  const config = TASK_TYPE_CONFIG[task.type];
  const priorityStyle = PRIORITY_STYLES[task.priority];
  const isOverdue = task.daysUntilDue !== null && task.daysUntilDue < 0;
  const isDueToday = task.daysUntilDue === 0;
  const dueDateDisplay = getDueDateDisplay(task.daysUntilDue);

  // Compact variant
  if (compact) {
    return (
      <button
        onClick={() => onNavigate?.(task)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-accent-blue/50 ${
          isOverdue ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-surface-card'
        } ${className}`}
      >
        {/* Icon */}
        <div 
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${config?.color ?? ''}20` }}
        >
          <span style={{ color: config.color }}>{TASK_ICONS[task.type]}</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <div className="font-medium text-sm text-text-primary truncate">
            {task.title}
          </div>
          <div className="text-xs text-text-muted truncate">
            {task.sourceLabel} • {config.label}
          </div>
        </div>
        
        {/* Due indicator */}
        {dueDateDisplay && (
          <div className={`text-xs px-2 py-1 rounded shrink-0 ${
            isOverdue 
              ? 'bg-red-500/10 text-red-500' 
              : isDueToday 
                ? 'bg-orange-500/10 text-orange-500'
                : 'text-text-muted'
          }`}>
            {isOverdue ? `${Math.abs(task.daysUntilDue!)}d` : isDueToday ? 'Today' : `${task.daysUntilDue}d`}
          </div>
        )}
        
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
      </button>
    );
  }

  // Full variant
  return (
    <div 
      className={`bg-surface-card border rounded-xl p-4 hover:border-accent-blue/50 transition-all group ${
        isOverdue ? 'border-red-500/50' : 'border-border'
      } ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div 
          className="p-2.5 rounded-lg shrink-0"
          style={{ backgroundColor: `${config?.color ?? ''}20` }}
        >
          <span style={{ color: config.color }}>{TASK_ICONS[task.type]}</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-text-primary truncate">
                  {task.title}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyle?.bg ?? ''} ${priorityStyle?.text ?? ''} border ${priorityStyle?.border ?? ''}`}>
                  {task.priority}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-1 line-clamp-2">
                {task.description}
              </p>
            </div>
            
            {/* Due Date */}
            {dueDateDisplay && (
              <div className={`text-xs px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${
                isOverdue 
                  ? 'bg-red-500/10 text-red-500' 
                  : isDueToday 
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'bg-surface-elevated text-text-muted'
              }`}>
                <Clock className="w-3 h-3" />
                {dueDateDisplay}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="px-2 py-0.5 bg-surface-elevated rounded">
                {task.sourceLabel}
              </span>
              <span>{config.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate(task)}
                  className="text-xs text-text-muted hover:text-accent-blue flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View Details
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {showAction && onAction && (
                <button
                  onClick={() => onAction(task)}
                  className="px-3 py-1.5 text-xs font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                >
                  {config.actionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
