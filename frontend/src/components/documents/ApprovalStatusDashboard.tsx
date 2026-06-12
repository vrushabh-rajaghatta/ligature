
// ApprovalStatusDashboard Component - Phase 2.3e.5
// Status tracking, progress visualization, and audit trail for approval workflows


import { useState, useMemo } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle,
  User, ChevronDown, ChevronRight, Calendar, ArrowRight,
  MessageSquare, PenTool, Shield, FileText, Eye, Play,
  Pause, SkipForward, RefreshCw, Send, Award, Users,
  Timer, TrendingUp, History, ExternalLink
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  ApprovalRequest,
  ApprovalStep,
  ApprovalRequestStatus,
  ApprovalUrgency,
} from '@/types/approval';

// ============================================================================
// PROPS & TYPES
// ============================================================================

export interface ApprovalStatusDashboardProps {
  /** The approval request to display */
  request: ApprovalRequest | null;
  /** Show compact view */
  compact?: boolean;
  /** Show timeline */
  showTimeline?: boolean;
  /** Show comments summary */
  showComments?: boolean;
  /** Callbacks */
  onViewDocument?: () => void;
  onAddComment?: () => void;
  onViewFullAudit?: () => void;
  onEscalate?: () => void;
  onCancel?: () => void;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'request' | 'step-start' | 'step-complete' | 'comment' | 'signature' | 'escalation' | 'system';
  title: string;
  description: string;
  actor: string;
  actorRole?: string;
  stepNumber?: number;
  status?: 'success' | 'warning' | 'error' | 'info';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<ApprovalRequestStatus, {
  label: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple';
  icon: React.ReactNode;
  description: string;
}> = {
  'draft': {
    label: 'Draft',
    color: 'gray',
    icon: <FileText className="w-4 h-4" />,
    description: 'Not yet submitted for approval',
  },
  'pending': {
    label: 'Pending',
    color: 'blue',
    icon: <Clock className="w-4 h-4" />,
    description: 'Awaiting first approver action',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'purple',
    icon: <Play className="w-4 h-4" />,
    description: 'Approval workflow in progress',
  },
  'revision-needed': {
    label: 'Revision Needed',
    color: 'amber',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Returned for revision by approver',
  },
  'approved': {
    label: 'Approved',
    color: 'green',
    icon: <CheckCircle className="w-4 h-4" />,
    description: 'All approvals complete',
  },
  'rejected': {
    label: 'Rejected',
    color: 'red',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Rejected by approver',
  },
  'cancelled': {
    label: 'Cancelled',
    color: 'gray',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Cancelled by requester',
  },
  'expired': {
    label: 'Expired',
    color: 'red',
    icon: <Timer className="w-4 h-4" />,
    description: 'Past due date without completion',
  },
};

const URGENCY_CONFIG: Record<ApprovalUrgency, {
  label: string;
  color: 'green' | 'amber' | 'red' | 'purple';
}> = {
  'standard': { label: 'Standard', color: 'green' },
  'expedited': { label: 'Expedited', color: 'amber' },
  'urgent': { label: 'Urgent', color: 'red' },
  'critical': { label: 'Critical', color: 'purple' },
};

const STEP_STATUS_CONFIG: Record<ApprovalStep['status'], {
  icon: React.ReactNode;
  color: string;
  bg: string;
}> = {
  'pending': {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-text-muted',
    bg: 'bg-surface-card',
  },
  'in-progress': {
    icon: <Play className="w-4 h-4" />,
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/20',
  },
  'completed': {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-accent-green',
    bg: 'bg-accent-green/20',
  },
  'skipped': {
    icon: <SkipForward className="w-4 h-4" />,
    color: 'text-text-muted',
    bg: 'bg-surface-card',
  },
  'rejected': {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-accent-red',
    bg: 'bg-accent-red/20',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function getTimeRemaining(dueDate: string): { text: string; isOverdue: boolean; isUrgent: boolean } {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    return { 
      text: overdueDays === 0 ? 'Overdue today' : `${overdueDays}d overdue`, 
      isOverdue: true, 
      isUrgent: true 
    };
  }

  if (diffHours < 4) {
    return { text: `${diffHours}h remaining`, isOverdue: false, isUrgent: true };
  }

  if (diffDays === 0) {
    return { text: `${diffHours}h remaining`, isOverdue: false, isUrgent: diffHours < 8 };
  }

  return { text: `${diffDays}d remaining`, isOverdue: false, isUrgent: diffDays < 1 };
}

function calculateProgress(steps: ApprovalStep[]): number {
  if (steps.length === 0) return 0;
  const completedSteps = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  return Math.round((completedSteps / steps.length) * 100);
}

function generateTimeline(request: ApprovalRequest): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Request created
  events.push({
    id: `req-${request.id}`,
    timestamp: request.requestedAt,
    type: 'request',
    title: 'Approval Requested',
    description: request.title,
    actor: request.requesterName,
    actorRole: request.requesterDepartment,
    status: 'info',
  });

  // Step events
  request.approvalSteps.forEach(step => {
    if (step.startedAt) {
      events.push({
        id: `step-start-${step.id}`,
        timestamp: step.startedAt,
        type: 'step-start',
        title: `${step.name} Started`,
        description: step.assignedUserName 
          ? `Assigned to ${step.assignedUserName}`
          : `Assigned to ${step.assignedRole || 'Approver'}`,
        actor: 'System',
        stepNumber: step.stepNumber,
        status: 'info',
      });
    }

    if (step.completedAt && step.decision) {
      const decisionLabels = {
        'approved': 'Approved',
        'rejected': 'Rejected',
        'revision-requested': 'Revision Requested',
      };
      events.push({
        id: `step-complete-${step.id}`,
        timestamp: step.completedAt,
        type: 'step-complete',
        title: `${step.name}: ${decisionLabels[step.decision]}`,
        description: step.decisionComments || 'No comments provided',
        actor: step.decisionByName || 'Unknown',
        stepNumber: step.stepNumber,
        status: step.decision === 'approved' ? 'success' : step.decision === 'rejected' ? 'error' : 'warning',
      });
    }

    if (step.signatureTimestamp) {
      events.push({
        id: `sig-${step.id}`,
        timestamp: step.signatureTimestamp,
        type: 'signature',
        title: 'Electronic Signature Applied',
        description: `21 CFR Part 11 compliant signature for ${step.name}`,
        actor: step.decisionByName || 'Unknown',
        stepNumber: step.stepNumber,
        status: 'success',
      });
    }
  });

  // Comments (simplified - just count)
  if (request.comments.length > 0) {
    const latestComment = request.comments[request.comments.length - 1];
    events.push({
      id: `comment-latest`,
      timestamp: latestComment.createdAt,
      type: 'comment',
      title: `${request.comments.length} Comment${request.comments.length > 1 ? 's' : ''} Added`,
      description: latestComment.content.substring(0, 100) + (latestComment.content.length > 100 ? '...' : ''),
      actor: latestComment.authorName,
      actorRole: latestComment.authorRole,
      status: 'info',
    });
  }

  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ProgressTrackerProps {
  steps: ApprovalStep[];
  currentStepIndex: number;
}

function ProgressTracker({ steps, currentStepIndex }: ProgressTrackerProps) {
  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
      
      {/* Progress bar fill */}
      <div 
        className="absolute top-5 left-0 h-0.5 bg-accent-green transition-all duration-500"
        style={{ width: `${calculateProgress(steps)}%` }}
      />
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const config = STEP_STATUS_CONFIG[step.status];
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              {/* Step indicator */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                border-2 transition-all
                ${isCurrent ? 'border-accent-blue ring-4 ring-accent-blue/20' : 'border-transparent'}
                ${config?.bg ?? ''} ${config?.color ?? ''}
              `}>
                {config.icon}
              </div>
              
              {/* Step label */}
              <div className="mt-2 text-center max-w-[100px]">
                <p className={`text-xs font-medium truncate ${isCurrent ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {step.name}
                </p>
                {step.assignedUserName && (
                  <p className="text-[10px] text-text-muted truncate">
                    {step.assignedUserName}
                  </p>
                )}
                {step.isOverdue && step.status !== 'completed' && (
                  <Badge color="red" size="xs" className="mt-1">Overdue</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StepDetailCardProps {
  step: ApprovalStep;
  isExpanded: boolean;
  onToggle: () => void;
}

function StepDetailCard({ step, isExpanded, onToggle }: StepDetailCardProps) {
  const config = STEP_STATUS_CONFIG[step.status];
  const timeInfo = step.dueDate ? getTimeRemaining(step.dueDate) : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-surface-elevated transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config?.bg ?? ''} ${config?.color ?? ''}`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{step.name}</span>
            {step.signatureRequired && (
              <span title="Signature Required">
                <PenTool className="w-3 h-3 text-accent-purple" />
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {step.assignedUserName || step.assignedRole || 'Unassigned'}
          </p>
        </div>

        {timeInfo && step.status !== 'completed' && step.status !== 'skipped' && (
          <Badge 
            color={timeInfo.isOverdue ? 'red' : timeInfo.isUrgent ? 'amber' : 'gray'} 
            size="xs"
          >
            {timeInfo.text}
          </Badge>
        )}

        {step.status === 'completed' && step.decision && (
          <Badge 
            color={step.decision === 'approved' ? 'green' : step.decision === 'rejected' ? 'red' : 'amber'} 
            size="xs"
          >
            {step.decision === 'approved' ? 'Approved' : step.decision === 'rejected' ? 'Rejected' : 'Revision'}
          </Badge>
        )}

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border bg-surface-card">
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            {step.startedAt && (
              <div>
                <p className="text-text-muted">Started</p>
                <p className="text-text-secondary">{formatDateTime(step.startedAt)}</p>
              </div>
            )}
            {step.completedAt && (
              <div>
                <p className="text-text-muted">Completed</p>
                <p className="text-text-secondary">{formatDateTime(step.completedAt)}</p>
              </div>
            )}
            {step.dueDate && (
              <div>
                <p className="text-text-muted">Due Date</p>
                <p className="text-text-secondary">{formatDateTime(step.dueDate)}</p>
              </div>
            )}
            {step.slaHours && (
              <div>
                <p className="text-text-muted">SLA</p>
                <p className="text-text-secondary">{step.slaHours} hours</p>
              </div>
            )}
          </div>
          
          {step.decisionComments && (
            <div className="mt-3 p-2 bg-surface-elevated rounded text-xs">
              <p className="text-text-muted mb-1">Decision Comments:</p>
              <p className="text-text-secondary">{step.decisionComments}</p>
            </div>
          )}

          {step.delegatedTo && (
            <div className="mt-3 flex items-center gap-2 text-xs text-accent-amber">
              <Users className="w-3 h-3" />
              <span>Delegated to {step.delegatedToName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TimelineViewProps {
  events: TimelineEvent[];
  maxEvents?: number;
}

function TimelineView({ events, maxEvents = 5 }: TimelineViewProps) {
  const displayEvents = events.slice(0, maxEvents);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'request': return <Send className="w-3.5 h-3.5" />;
      case 'step-start': return <Play className="w-3.5 h-3.5" />;
      case 'step-complete': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'comment': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'signature': return <PenTool className="w-3.5 h-3.5" />;
      case 'escalation': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return <RefreshCw className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status?: TimelineEvent['status']) => {
    switch (status) {
      case 'success': return 'text-accent-green bg-accent-green/20';
      case 'warning': return 'text-accent-amber bg-accent-amber/20';
      case 'error': return 'text-accent-red bg-accent-red/20';
      default: return 'text-accent-blue bg-accent-blue/20';
    }
  };

  return (
    <div className="space-y-3">
      {displayEvents.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getStatusColor(event.status)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < displayEvents.length - 1 && (
              <div className="w-0.5 flex-1 bg-border min-h-[20px]" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{event.title}</p>
                <p className="text-xs text-text-muted">{event.actor}</p>
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
            {event.description && (
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">{event.description}</p>
            )}
          </div>
        </div>
      ))}

      {events.length > maxEvents && (
        <p className="text-xs text-text-muted text-center">
          +{events.length - maxEvents} more events
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalStatusDashboard({
  request,
  compact = false,
  showTimeline = true,
  showComments = true,
  onViewDocument,
  onAddComment,
  onViewFullAudit,
  onEscalate,
  onCancel,
}: ApprovalStatusDashboardProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Generate timeline events
  const timelineEvents = useMemo(() => {
    if (!request) return [];
    return generateTimeline(request);
  }, [request]);

  // Check for escalation conditions
  const hasOverdueSteps = useMemo(() => {
    if (!request) return false;
    return request.approvalSteps.some(s => s.isOverdue && s.status !== 'completed');
  }, [request]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Empty state
  if (!request) {
    return (
      <Card variant="elevated" padding="lg" radius="lg">
        <EmptyState
          type="no-data"
          size="sm"
          title="No Approval Request"
          description="Select a document with an active approval request to view its status."
          icon={<Shield className="w-8 h-8" />}
        />
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status];
  const urgencyConfig = URGENCY_CONFIG[request.urgency];
  const progress = calculateProgress(request.approvalSteps);
  const timeRemaining = getTimeRemaining(request.dueDate);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card variant="elevated" padding="lg" radius="lg">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge color={statusConfig.color} size="sm">
                <span className="flex items-center gap-1">
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </Badge>
              <Badge color={urgencyConfig.color} size="sm">
                {urgencyConfig.label}
              </Badge>
              {hasOverdueSteps && (
                <Badge color="red" size="sm">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Escalation Needed
                  </span>
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-text-primary truncate">{request.title}</h3>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{request.description}</p>
          </div>
          
          {onViewDocument && (
            <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />} onClick={onViewDocument}>
              View Doc
            </Button>
          )}
        </div>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted border-t border-border pt-4">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{request.requesterName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Requested {formatRelativeTime(request.requestedAt)}</span>
          </div>
          <div className={`flex items-center gap-1 ${timeRemaining.isOverdue ? 'text-accent-red' : timeRemaining.isUrgent ? 'text-accent-amber' : ''}`}>
            <Timer className="w-3.5 h-3.5" />
            <span>{timeRemaining.text}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{request.documentTitle} v{request.documentVersion}</span>
          </div>
        </div>
      </Card>

      {/* Progress Tracker */}
      {!compact && request.approvalSteps.length > 0 && (
        <Card variant="elevated" padding="lg" radius="lg">
          <CardHeader
            title="Approval Progress"
            icon={<TrendingUp className="w-5 h-5 text-accent-blue" />}
            action={
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{progress}%</span>
                <div className="w-24 h-2 bg-surface-card rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-green transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            }
          />
          <div className="mt-4">
            <ProgressTracker steps={request.approvalSteps} currentStepIndex={request.currentStepIndex} />
          </div>
        </Card>
      )}

      {/* Step Details */}
      {!compact && (
        <Card variant="elevated" padding="lg" radius="lg">
          <CardHeader
            title="Approval Steps"
            icon={<Shield className="w-5 h-5 text-accent-purple" />}
            action={
              <Badge color="gray" size="sm">
                {request.approvalSteps.filter(s => s.status === 'completed').length} / {request.approvalSteps.length}
              </Badge>
            }
          />
          <div className="space-y-2 mt-4">
            {request.approvalSteps.map(step => (
              <StepDetailCard
                key={step.id}
                step={step}
                isExpanded={expandedSteps.has(step.id)}
                onToggle={() => toggleStep(step.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Timeline */}
      {showTimeline && timelineEvents.length > 0 && (
        <Card variant="elevated" padding="lg" radius="lg">
          <CardHeader
            title="Activity Timeline"
            icon={<History className="w-5 h-5 text-accent-teal" />}
            action={
              onViewFullAudit && (
                <Button variant="ghost" size="sm" onClick={onViewFullAudit}>
                  View Full Audit
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              )
            }
          />
          <div className="mt-4">
            <TimelineView events={timelineEvents} maxEvents={compact ? 3 : 5} />
          </div>
        </Card>
      )}

      {/* Actions */}
      {!compact && (
        <div className="flex flex-wrap gap-2">
          {onAddComment && (
            <Button variant="secondary" size="sm" icon={<MessageSquare className="w-4 h-4" />} onClick={onAddComment}>
              Add Comment
            </Button>
          )}
          {onEscalate && hasOverdueSteps && (
            <Button variant="secondary" size="sm" icon={<AlertTriangle className="w-4 h-4" />} onClick={onEscalate}>
              Escalate
            </Button>
          )}
          {onCancel && request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled' && (
            <Button variant="ghost" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={onCancel}>
              Cancel Request
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ApprovalStatusDashboard;
