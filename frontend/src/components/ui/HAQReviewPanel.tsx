
/**
 * HAQReviewPanel — v0.87.0
 *
 * 3-stage sequential review workflow: SME → Regulatory Lead → QA/Compliance
 *
 * Wired to real API via useHAQReviews hook.
 * Falls back to Zustand in-memory state when no Supabase is configured.
 * Fires audit events on every state transition.
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, User, Clock,
  ChevronDown, ChevronRight, AlertCircle, Check, Send,
  Loader2, RefreshCw, ShieldCheck, FileCheck, BadgeCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  useHAQReviews,
  ROLE_ORDER,
  ROLE_LABELS,
  ROLE_SHORT,
  AVAILABLE_REVIEWERS,
} from '@/hooks/useHAQReviews';
import type { ReviewRole, ReviewStatus } from '@/hooks/useHAQReviews';
import { useHAQStore } from '@/store/useHAQStore';
import type { HAQuestion, ResponseDraft } from '@/types/haq';

// ============================================================================
// PROPS
// ============================================================================

interface HAQReviewPanelProps {
  haq: HAQuestion;
  currentVersion?: ResponseDraft;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<ReviewStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'text-text-muted',
    bg: 'bg-surface-elevated',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Pending',
  },
  'in-review': {
    color: 'text-status-warning',
    bg: 'bg-status-warning/10',
    icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
    label: 'In Review',
  },
  approved: {
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: 'Approved',
  },
  'changes-requested': {
    color: 'text-status-error',
    bg: 'bg-status-error/10',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Changes Requested',
  },
};

// ============================================================================
// SUB-COMPONENT: REVIEW STAGE CARD
// ============================================================================

interface StageCardProps {
  role: ReviewRole;
  index: number;
  review: any;
  status: ReviewStatus;
  canAct: boolean;
  isExpanded: boolean;
  isSubmitting: boolean;
  onToggle: () => void;
  onAssign: (role: ReviewRole, id: string, name: string) => void;
  onComplete: (role: ReviewRole, status: 'approved' | 'changes-requested', feedback?: string) => void;
}

function StageCard({
  role, index, review, status, canAct,
  isExpanded, isSubmitting, onToggle, onAssign, onComplete,
}: StageCardProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const hasPendingAssignment = !!review && (status === 'pending' || status === 'in-review');

  const handleRequestChanges = () => {
    if (showFeedbackInput && feedbackText.trim()) {
      onComplete(role, 'changes-requested', feedbackText.trim());
      setFeedbackText('');
      setShowFeedbackInput(false);
    } else {
      setShowFeedbackInput(true);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      status === 'approved' ? 'border-status-success/30' :
      status === 'changes-requested' ? 'border-status-error/30' :
      isExpanded ? 'border-accent-blue/30' : 'border-border'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-card/60 transition-colors text-left"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
          status === 'approved' ? 'bg-status-success text-white' :
          status === 'changes-requested' ? 'bg-status-error text-white' :
          canAct ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-muted'
        }`}>
          {status === 'approved' ? <Check className="w-3.5 h-3.5" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{ROLE_LABELS[role]}</span>
            <span className="text-xs text-text-muted">({ROLE_SHORT[role]})</span>
          </div>
          {review && (
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {review.reviewerName}
              {review.assignedAt && (
                <span className="ml-1">· {new Date(review.assignedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>

        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${cfg?.bg ?? ''} ${cfg?.color ?? ''}`}>
          {cfg.icon}
          {cfg.label}
        </span>

        {isExpanded
          ? <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-surface px-4 py-4 space-y-3">
          {!canAct && (
            <div className="flex items-center gap-2 text-xs text-status-warning bg-status-warning/10 border border-status-warning/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Complete the previous review stage first.
            </div>
          )}

          {!review && canAct && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Select a reviewer</p>
              {AVAILABLE_REVIEWERS[role].map(r => (
                <button
                  key={r.id}
                  onClick={() => onAssign(role, r.id, r.name)}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-surface-card hover:border-accent-blue/30 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{r.name}</div>
                    <div className="text-xs text-text-muted">{r.title}</div>
                  </div>
                  {isSubmitting && <Loader2 className="w-4 h-4 text-text-muted animate-spin" />}
                </button>
              ))}
            </div>
          )}

          {hasPendingAssignment && canAct && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <User className="w-4 h-4 text-text-muted" />
                <span>Awaiting review from <strong className="text-text-primary">{review.reviewerName}</strong></span>
              </div>

              {showFeedbackInput && (
                <div className="space-y-2">
                  <label className="text-xs text-text-muted font-medium">Feedback for author</label>
                  <textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Describe the changes needed..."
                    rows={3}
                    className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowFeedbackInput(false); setFeedbackText(''); }}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onComplete(role, 'approved')}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-status-success text-white rounded-lg text-sm font-medium hover:bg-status-success/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-status-error text-white rounded-lg text-sm font-medium hover:bg-status-error/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {showFeedbackInput ? 'Send Feedback' : 'Request Changes'}
                </button>
              </div>
            </div>
          )}

          {(status === 'approved' || status === 'changes-requested') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status === 'approved'
                  ? <Badge color="green" size="sm">Approved</Badge>
                  : <Badge color="red" size="sm">Changes Requested</Badge>}
                {review?.completedAt && (
                  <span className="text-xs text-text-muted">
                    {new Date(review.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              {review?.feedback && (
                <div className="text-sm text-text-secondary bg-surface-card border border-border rounded-lg p-3 italic">
                  "{review.feedback}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HAQReviewPanel({ haq, currentVersion }: HAQReviewPanelProps) {
  const toast = useToast();

  const {
    reviewByRole, statusByRole, approvedCount, isAllApproved,
    isLoading, isSubmitting, canReview,
    assignReviewer, completeReview, refresh,
  } = useHAQReviews(haq.id);

  const [expandedRole, setExpandedRole] = useState<ReviewRole | null>('sme');

  const addComment = useHAQStore(s => s.addComment);
  const resolveComment = useHAQStore(s => s.resolveComment);
  const versionsMap = useHAQStore(s => s.versions);
  const [newComment, setNewComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const comments = (() => {
    if (!currentVersion) return [];
    const versions = versionsMap[haq.id] || [];
    const v = versions.find(v => v.id === currentVersion.id);
    return v?.comments || [];
  })();
  const unresolvedComments = comments.filter(c => !c.resolved);

  const handleAssign = useCallback(async (role, id, name) => {
    try {
      await assignReviewer(role, id, name);
      toast.success(`${name} assigned as ${ROLE_LABELS[role]}`);
    } catch {
      toast.error('Failed to assign reviewer');
    }
  }, [assignReviewer, toast]);

  const handleComplete = useCallback(async (role, status, feedback) => {
    try {
      await completeReview(role, status, feedback);
      if (status === 'approved') {
        const nextRole = ROLE_ORDER[ROLE_ORDER.indexOf(role) + 1];
        const nowAllApproved = ROLE_ORDER.filter(r => r === role ? true : statusByRole[r] === 'approved').length === ROLE_ORDER.length;
        if (nowAllApproved) {
          toast.success('All stages approved — HAQ advanced to Submitted', { duration: 4000 });
        } else {
          toast.success(`${ROLE_SHORT[role]} approved${nextRole ? ` — ${ROLE_LABELS[nextRole]} unlocked` : ''}`);
          if (nextRole) setExpandedRole(nextRole);
        }
      } else {
        toast.info('Changes requested — HAQ returned to In Progress');
      }
    } catch {
      toast.error('Failed to complete review');
    }
  }, [completeReview, statusByRole, toast]);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !currentVersion) return;
    addComment(haq.id, currentVersion.id, { author: 'current-user', authorName: 'Current User', content: newComment.trim() });
    setNewComment('');
    setShowCommentInput(false);
    toast.success('Comment added');
  }, [haq.id, currentVersion, newComment, addComment, toast]);

  const handleResolveComment = useCallback((commentId) => {
    if (!currentVersion) return;
    resolveComment(haq.id, currentVersion.id, commentId);
    toast.info('Comment resolved');
  }, [haq.id, currentVersion, resolveComment, toast]);

  const progressPercent = (approvedCount / ROLE_ORDER.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading review state…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="bg-surface-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Review Workflow</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{approvedCount}/{ROLE_ORDER.length} stages complete</span>
            <button onClick={refresh} className="text-text-muted hover:text-text-primary transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAllApproved ? 'bg-status-success' : 'bg-accent-blue'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex gap-2">
          {ROLE_ORDER.map(role => {
            const cfg = STATUS_CONFIG[statusByRole[role]];
            return (
              <div key={role} className={`flex-1 rounded-lg px-2 py-1.5 text-center ${cfg?.bg ?? ''}`}>
                <div className={`text-xs font-semibold ${cfg?.color ?? ''}`}>{ROLE_SHORT[role]}</div>
                <div className={`text-xs mt-0.5 flex items-center justify-center gap-0.5 ${cfg?.color ?? ''} opacity-80`}>
                  {cfg.icon}
                </div>
              </div>
            );
          })}
        </div>
        {isAllApproved && (
          <div className="mt-3 flex items-center gap-2 text-sm text-status-success bg-status-success/10 border border-status-success/20 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            All stages approved — HAQ response submitted.
          </div>
        )}
      </div>

      {/* Stage cards */}
      <div className="space-y-2">
        {ROLE_ORDER.map((role, i) => (
          <StageCard
            key={role}
            role={role}
            index={i}
            review={reviewByRole(role)}
            status={statusByRole[role]}
            canAct={canReview(role)}
            isExpanded={expandedRole === role}
            isSubmitting={isSubmitting}
            onToggle={() => setExpandedRole(expandedRole === role ? null : role)}
            onAssign={handleAssign}
            onComplete={handleComplete}
          />
        ))}
      </div>

      {/* Workflow rules */}
      <div className="bg-surface-card border border-border rounded-xl p-4">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Workflow Rules</h4>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Stages are sequential — each gate unlocks only after the previous approval</li>
          <li>• Changes requested at any stage returns HAQ to In Progress</li>
          <li>• Full QA approval advances HAQ to Submitted</li>
          <li>• All transitions recorded in the audit trail (21 CFR Part 11)</li>
        </ul>
      </div>

      {/* Comments */}
      <div className="bg-surface-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Review Comments
            {unresolvedComments.length > 0 && <Badge color="amber" size="xs">{unresolvedComments.length} open</Badge>}
          </h3>
          <button onClick={() => setShowCommentInput(!showCommentInput)} className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors">+ Add</button>
        </div>
        {showCommentInput && (
          <div className="mb-4 p-3 bg-surface rounded-lg border border-border">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a review comment..." className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none" rows={3} autoFocus />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => { setNewComment(''); setShowCommentInput(false); }} className="px-3 py-1 text-xs text-text-muted hover:text-text-primary">Cancel</button>
              <button onClick={handleAddComment} disabled={!newComment.trim()} className="px-3 py-1 text-xs bg-accent-blue text-white rounded-lg flex items-center gap-1 disabled:opacity-50"><Send className="w-3 h-3" /> Post</button>
            </div>
          </div>
        )}
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className={`p-3 rounded-lg border ${comment.resolved ? 'bg-surface border-border opacity-60' : 'bg-status-warning/5 border-status-warning/20'}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center"><User className="w-3 h-3 text-accent-blue" /></div>
                    <span className="text-sm font-medium text-text-primary">{comment.authorName}</span>
                    <span className="text-xs text-text-muted">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!comment.resolved && (
                    <button onClick={() => handleResolveComment(comment.id)} className="text-xs text-status-success hover:underline flex items-center gap-1"><Check className="w-3 h-3" /> Resolve</button>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{comment.content}</p>
                {comment.resolved && <div className="mt-1.5 text-xs text-status-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-muted">No review comments yet</div>
        )}
      </div>
    </div>
  );
}
