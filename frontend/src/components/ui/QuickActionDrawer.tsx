
import { useEffect, useCallback, useRef, ReactNode } from 'react';
import { X, Wand2, Eye, FileText, AlertTriangle, CheckCircle, Clock, ExternalLink, Send } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import type { AggregatedTask } from '@/store/useTaskAggregationStore';

/**
 * v0.12.3: QuickActionDrawer
 * 
 * Slide-out panel for taking quick actions without full module navigation.
 * Supports different content types based on task/action context:
 * - HAQ: show question preview, AI draft button, quick approve
 * - Document: show preview, signature button
 * - Safety Signal: show summary, assessment form
 * - Submission Milestone: show milestone details, mark complete
 */

export interface QuickActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  task?: AggregatedTask;
  children?: ReactNode;
  // Primary and secondary actions
  primaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryActions?: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
  // Navigate to full module
  onNavigateToModule?: () => void;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthClasses: Record<string, string> = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
  xl: 'w-[560px]',
};

export function QuickActionDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  task,
  children,
  primaryAction,
  secondaryActions,
  onNavigateToModule,
  width = 'md',
}: QuickActionDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Close on click outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  // Trap focus within drawer when open
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);
  
  // Derive display title from task if not provided
  const displayTitle = title || task?.title || 'Quick Action';
  const displaySubtitle = subtitle || (task?.type ? formatTaskType(task.type) : undefined);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`
          fixed right-0 top-0 h-full ${widthClasses[width]} bg-surface-elevated
          border-l border-border shadow-xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 id="drawer-title" className="text-lg font-semibold text-text-primary truncate">
              {displayTitle}
            </h2>
            {displaySubtitle && (
              <p className="text-sm text-text-muted mt-0.5">{displaySubtitle}</p>
            )}
            {task && (
              <div className="flex items-center gap-2 mt-2">
                <TaskPriorityBadge priority={task.priority} />
                {task.dueDate && <TaskDueBadge dueDate={task.dueDate} />}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Task-specific content */}
          {task && !children && <TaskContent task={task} />}
          
          {/* Custom content */}
          {children}
        </div>
        
        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-surface-card">
          <div className="flex flex-col gap-3">
            {/* Primary action */}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'primary'}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="w-full justify-center"
                icon={primaryAction.icon}
              >
                {primaryAction.loading ? 'Processing...' : primaryAction.label}
              </Button>
            )}
            
            {/* Secondary actions */}
            {secondaryActions && secondaryActions.length > 0 && (
              <div className="flex gap-2">
                {secondaryActions.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant || 'secondary'}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="flex-1 justify-center"
                    icon={action.icon}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Navigate to full module */}
            {onNavigateToModule && (
              <button
                onClick={onNavigateToModule}
                className="flex items-center justify-center gap-2 text-sm text-accent-blue hover:text-accent-blue/80 transition-colors py-2"
              >
                <span>Open in full view</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper to format task type for display
function formatTaskType(type: string): string {
  const typeLabels: Record<string, string> = {
    'haq-response': 'HAQ Response',
    'document-review': 'Document Review',
    'document-signature': 'Document Signature',
    'safety-signal': 'Safety Signal',
    'deviation-response': 'Deviation Response',
    'capa-action': 'CAPA Action',
    'submission-milestone': 'Submission Milestone',
    'workflow-approval': 'Workflow Approval',
  };
  return typeLabels[type] || type;
}

// Priority badge component
function TaskPriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
    critical: 'red',
    high: 'amber',
    medium: 'blue',
    low: 'gray',
  };
  return (
    <Badge color={colorMap[priority] || 'gray'} size="sm">
      {priority}
    </Badge>
  );
}

// Due date badge component
function TaskDueBadge({ dueDate }: { dueDate: Date | string }) {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let color: 'red' | 'amber' | 'blue' | 'gray' = 'gray';
  let label = '';
  
  if (diffDays < 0) {
    color = 'red';
    label = `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    color = 'red';
    label = 'Due today';
  } else if (diffDays <= 3) {
    color = 'amber';
    label = `Due in ${diffDays} days`;
  } else if (diffDays <= 7) {
    color = 'blue';
    label = `Due in ${diffDays} days`;
  } else {
    label = `Due ${due.toLocaleDateString()}`;
  }
  
  return (
    <div className={`flex items-center gap-1 text-xs ${
      color === 'red' ? 'text-accent-red' : 
      color === 'amber' ? 'text-accent-amber' : 
      color === 'blue' ? 'text-accent-blue' : 'text-text-muted'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

// Task-specific content renderer
function TaskContent({ task }: { task: AggregatedTask }) {
  switch (task.type) {
    case 'haq-response':
      return <HAQTaskContent task={task} />;
    case 'document-review':
      return <DocumentReviewContent task={task} />;
    case 'safety-signal':
      return <SafetySignalContent task={task} />;
    case 'submission-milestone':
      return <SubmissionMilestoneContent task={task} />;
    case 'deviation-response':
      return <DeviationContent task={task} />;
    default:
      return <GenericTaskContent task={task} />;
  }
}

// HAQ Response content
function HAQTaskContent({ task }: { task: AggregatedTask }) {
  const metadata = task.metadata || {};
  const authority = typeof metadata.authority === 'string' ? metadata.authority : null;
  const discipline = typeof metadata.discipline === 'string' ? metadata.discipline : null;
  
  return (
    <div className="space-y-4">
      {/* Question preview */}
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Question</label>
        <p className="text-sm text-text-primary mt-1 bg-surface-card p-3 rounded-lg border border-border">
          {task.description || 'No question preview available'}
        </p>
      </div>
      
      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        {authority && (
          <div>
            <label className="text-xs text-text-muted">Authority</label>
            <p className="text-sm font-medium text-text-primary">{authority}</p>
          </div>
        )}
        {discipline && (
          <div>
            <label className="text-xs text-text-muted">Discipline</label>
            <p className="text-sm font-medium text-text-primary">{discipline}</p>
          </div>
        )}
      </div>
      
      {/* AI Draft suggestion */}
      <div className="p-3 bg-accent-purple/10 border border-accent-purple/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-accent-purple">AI Assistance Available</span>
        </div>
        <p className="text-xs text-text-muted">
          Click "Draft with AI" to generate an initial response based on similar HAQs and regulatory precedents.
        </p>
      </div>
    </div>
  );
}

// Document Review content
function DocumentReviewContent({ task }: { task: AggregatedTask }) {
  const metadata = task.metadata || {};
  const stageName = typeof metadata.stageName === 'string' ? metadata.stageName : null;
  const sectionsToReview = Array.isArray(metadata.sectionsToReview) ? metadata.sectionsToReview as string[] : [];
  const commentCount = typeof metadata.commentCount === 'number' ? metadata.commentCount : 0;
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Document</label>
        <p className="text-sm font-medium text-text-primary mt-1">{task.title}</p>
      </div>
      
      {stageName && (
        <div>
          <label className="text-xs text-text-muted">Review Stage</label>
          <p className="text-sm font-medium text-text-primary">{stageName}</p>
        </div>
      )}
      
      {sectionsToReview.length > 0 && (
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
            Sections to Review
          </label>
          <ul className="space-y-1">
            {sectionsToReview.map((section, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                <FileText className="w-3.5 h-3.5 text-text-muted" />
                {section}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {commentCount > 0 && (
        <div className="text-sm text-text-muted">
          {commentCount} existing comment{commentCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// Safety Signal content
function SafetySignalContent({ task }: { task: AggregatedTask }) {
  const metadata = task.metadata || {};
  const signalType = typeof metadata.signalType === 'string' ? metadata.signalType : null;
  const caseCount = typeof metadata.caseCount === 'number' ? metadata.caseCount : null;
  
  return (
    <div className="space-y-4">
      <div className="p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-amber" />
          <span className="text-sm font-medium text-accent-amber">Safety Signal Detected</span>
        </div>
      </div>
      
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Signal Summary</label>
        <p className="text-sm text-text-primary mt-1">{task.description}</p>
      </div>
      
      {signalType && (
        <div>
          <label className="text-xs text-text-muted">Signal Type</label>
          <p className="text-sm font-medium text-text-primary">{signalType}</p>
        </div>
      )}
      
      {caseCount !== null && (
        <div>
          <label className="text-xs text-text-muted">Related Cases</label>
          <p className="text-sm font-medium text-text-primary">{caseCount} cases</p>
        </div>
      )}
    </div>
  );
}

// Submission Milestone content
function SubmissionMilestoneContent({ task }: { task: AggregatedTask }) {
  const metadata = task.metadata || {};
  const milestoneDescription = typeof metadata.milestoneDescription === 'string' ? metadata.milestoneDescription : null;
  const submissionType = typeof metadata.submissionType === 'string' ? metadata.submissionType : null;
  const region = typeof metadata.region === 'string' ? metadata.region : null;
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Milestone</label>
        <p className="text-sm font-medium text-text-primary mt-1">{task.title}</p>
      </div>
      
      {milestoneDescription && (
        <div>
          <label className="text-xs text-text-muted">Description</label>
          <p className="text-sm text-text-secondary mt-1">{milestoneDescription}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {submissionType && (
          <div>
            <label className="text-xs text-text-muted">Submission Type</label>
            <p className="text-sm font-medium text-text-primary">{submissionType}</p>
          </div>
        )}
        {region && (
          <div>
            <label className="text-xs text-text-muted">Region</label>
            <p className="text-sm font-medium text-text-primary">{region}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Deviation content
function DeviationContent({ task }: { task: AggregatedTask }) {
  const metadata = task.metadata || {};
  const deviationType = typeof metadata.deviationType === 'string' ? metadata.deviationType : null;
  
  return (
    <div className="space-y-4">
      <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-red" />
          <span className="text-sm font-medium text-accent-red">Quality Deviation</span>
        </div>
      </div>
      
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Deviation</label>
        <p className="text-sm text-text-primary mt-1">{task.title}</p>
      </div>
      
      <div>
        <label className="text-xs text-text-muted">Description</label>
        <p className="text-sm text-text-secondary mt-1">{task.description}</p>
      </div>
      
      {deviationType && (
        <div>
          <label className="text-xs text-text-muted">Type</label>
          <p className="text-sm font-medium text-text-primary">{deviationType}</p>
        </div>
      )}
    </div>
  );
}

// Generic task content
function GenericTaskContent({ task }: { task: AggregatedTask }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Task</label>
        <p className="text-sm font-medium text-text-primary mt-1">{task.title}</p>
      </div>
      
      {task.description && (
        <div>
          <label className="text-xs text-text-muted">Description</label>
          <p className="text-sm text-text-secondary mt-1">{task.description}</p>
        </div>
      )}
      
      {task.assignedTo && (
        <div>
          <label className="text-xs text-text-muted">Assigned To</label>
          <p className="text-sm font-medium text-text-primary">{task.assignedTo}</p>
        </div>
      )}
    </div>
  );
}

export default QuickActionDrawer;
