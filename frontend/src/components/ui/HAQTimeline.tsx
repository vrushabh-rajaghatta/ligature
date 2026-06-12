

import React, { useMemo } from 'react';
import {
  MessageSquare, FileText, Send, CheckCircle, Clock,
  Wand2, UserPlus, AlertCircle, Edit3, Upload, Eye,
  XCircle, RotateCcw, Loader2, ShieldCheck,
} from 'lucide-react';
import { useHAQStore, HAQHistoryEvent } from '@/store/useHAQStore';
import { useHAQAuditTrail } from '@/hooks/useHAQAuditTrail';
import type { HAQuestion } from '@/types/haq';

interface HAQTimelineProps {
  haq: HAQuestion;
  compact?: boolean;
  maxItems?: number;
}

const eventConfig: Record<HAQHistoryEvent['type'], { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  getDescription: (details?: Record<string, unknown>) => string;
}> = {
  'created': {
    icon: <Upload className="w-4 h-4" />,
    color: 'bg-accent-blue',
    label: 'Question Imported',
    getDescription: () => 'Question was imported into the system',
  },
  'draft-saved': {
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-slate-500',
    label: 'Draft Saved',
    getDescription: () => 'Draft was auto-saved',
  },
  'version-created': {
    icon: <Edit3 className="w-4 h-4" />,
    color: 'bg-accent-purple',
    label: 'Version Created',
    getDescription: (details) => {
      if (details?.restoredFrom) {
        return `Restored to version ${details.version}`;
      }
      return `Version ${details?.version || '?'} was saved`;
    },
  },
  'status-changed': {
    icon: <RotateCcw className="w-4 h-4" />,
    color: 'bg-accent-amber',
    label: 'Status Changed',
    getDescription: (details) => {
      const statusLabels: Record<string, string> = {
        'new': 'New',
        'open': 'Open',
        'in-progress': 'In Progress',
        'draft-ready': 'Draft Ready',
        'under-review': 'Under Review',
        'submitted': 'Submitted',
        'closed': 'Closed',
      };
      return `Status changed to ${statusLabels[details?.newStatus as string] || details?.newStatus}`;
    },
  },
  'reviewer-assigned': {
    icon: <UserPlus className="w-4 h-4" />,
    color: 'bg-accent-teal',
    label: 'Reviewer Assigned',
    getDescription: (details) => {
      const roleLabels: Record<string, string> = {
        'sme': 'SME',
        'lead': 'Lead',
        'qa': 'QA',
      };
      return `${details?.reviewerName} assigned as ${roleLabels[details?.role as string] || details?.role} reviewer`;
    },
  },
  'review-completed': {
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-accent-green',
    label: 'Review Completed',
    getDescription: (details) => {
      if (details?.status === 'approved') {
        return 'Review approved';
      }
      return 'Changes requested';
    },
  },
  'comment-added': {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-accent-blue',
    label: 'Comment Added',
    getDescription: () => 'New comment was added',
  },
  'comment-resolved': {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-accent-green',
    label: 'Comment Resolved',
    getDescription: () => 'Comment was resolved',
  },
  'ai-generated': {
    icon: <Wand2 className="w-4 h-4" />,
    color: 'bg-accent-purple',
    label: 'AI Draft Generated',
    getDescription: () => 'AI-generated draft was created',
  },
  'submitted': {
    icon: <Send className="w-4 h-4" />,
    color: 'bg-accent-green',
    label: 'Response Submitted',
    getDescription: () => 'Response was submitted to Health Authority',
  },
};

// Format timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function HAQTimeline({ haq, compact = false, maxItems = 10 }: HAQTimelineProps) {
  // v0.87.0: real audit trail from API, merged with local store events
  const { events: auditEvents, isLoading, hasApiData } = useHAQAuditTrail(haq.id, maxItems + 5);

  // Local store history (always available as fallback)
  const historyMap = useHAQStore(s => s.history);
  const localHistory = useMemo(() => historyMap[haq.id] || [], [historyMap, haq.id]);

  // Build unified display list: API events take priority, local fills gaps
  const displayEvents = useMemo(() => {
    if (auditEvents.length > 0) {
      // Map API event types to eventConfig keys (they share the same AuditEventType)
      return auditEvents.map(e => ({
        id: e.id,
        haqId: haq.id,
        type: e.eventType as HAQHistoryEvent['type'],
        actor: e.actorId,
        actorName: e.actorName,
        timestamp: e.createdAt,
        details: e.details,
        source: e.source,
      }));
    }
    // Pure local fallback
    return [...localHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [auditEvents, localHistory, haq.id]);

  const sliced = maxItems ? displayEvents.slice(0, maxItems) : displayEvents;
  const hasMore = displayEvents.length > sliced.length;

  // Ensure a "created" event is always present
  const hasCreatedEvent = sliced.some(e => e.type === 'created');
  if (!hasCreatedEvent && haq.createdAt) {
    sliced.push({
      id: 'initial-created',
      haqId: haq.id,
      type: 'created',
      actor: 'system',
      actorName: 'System',
      timestamp: haq.createdAt,
      details: {},
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading audit trail…
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {sliced.map((event) => {
          const config = eventConfig[event.type] || eventConfig['created'];
          return (
            <div key={event.id} className="flex items-center gap-2 text-xs">
              <div className={`w-5 h-5 rounded-full ${config?.color ?? ''} flex items-center justify-center text-white`}>
                {config.icon}
              </div>
              <span className="text-text-secondary flex-1">
                {config.getDescription(event.details)}
              </span>
              <span className="text-text-muted">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
          );
        })}
        {hasMore && (
          <div className="text-xs text-text-muted text-center py-1">
            +{displayEvents.length - sliced.length} more events
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* API source indicator */}
      {hasApiData && (
        <div className="flex items-center gap-1.5 text-xs text-status-success mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          Live audit trail (21 CFR Part 11 compliant)
        </div>
      )}

      {/* Timeline line */}
      <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {sliced.map((event) => {
          const config = eventConfig[event.type] || eventConfig['created'];
          const isReviewEvent = event.type === 'review-completed';
          const isRejected = isReviewEvent && event.details?.status === 'changes-requested';

          return (
            <div key={event.id} className="relative flex gap-4">
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                  isRejected ? 'bg-accent-red' : config.color
                }`}
              >
                {isRejected ? <XCircle className="w-4 h-4" /> : config.icon}
              </div>

              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {config.label}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {config.getDescription(event.details)}
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      {event.actorName} · {formatTimestamp(event.timestamp)}
                      {event.source === 'api' && (
                        <span className="text-status-success opacity-60">· verified</span>
                      )}
                    </div>
                  </div>
                </div>

                {event.type === 'review-completed' && event.details?.feedback ? (
                  <div className="mt-2 p-2 bg-surface-card rounded text-sm text-text-secondary border-l-2 border-accent-amber">
                    "{String(event.details.feedback)}"
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="relative flex gap-4">
            <div className="relative z-10 w-8 h-8 rounded-full bg-surface-card border border-border flex items-center justify-center">
              <Clock className="w-4 h-4 text-text-muted" />
            </div>
            <div className="flex-1 py-2">
              <span className="text-sm text-text-muted">
                +{displayEvents.length - sliced.length} more events in audit trail
              </span>
            </div>
          </div>
        )}

        {sliced.length === 0 && (
          <div className="text-sm text-text-muted pl-12 py-4">
            No activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for sidebar
export function HAQTimelineCompact({ haq }: { haq: HAQuestion }) {
  return <HAQTimeline haq={haq} compact maxItems={5} />;
}
