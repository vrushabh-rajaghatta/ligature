
// CommentsPanel Component - Phase 2.3e.3b
// Slide-out panel for approval comments with live counts and filtering
// Integrates with DocumentViewer and ApprovalRequestPanel


import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, MessageSquare, AlertCircle, Check, CheckCheck,
  ChevronRight, Maximize2, Minimize2, RefreshCw,
  Bell, BellOff
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReviewCommentsThread } from './ReviewCommentsThread';
import type { ApprovalComment } from '@/types/approval';
import {
  countCommentsByStatus,
  getCommentsForApproval,
  mockApprovalComments,
} from '@/data/mockApprovalComments';

// ============================================================================
// TYPES
// ============================================================================

export interface CommentsPanelProps {
  /** Approval request ID to load comments for */
  approvalRequestId: string;
  /** Current user ID for filtering "mine" and "mentions me" */
  currentUserId?: string;
  /** Document title for display */
  documentTitle?: string;
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Callback when a comment is added */
  onAddComment?: (content: string, parentId?: string, commentType?: ApprovalComment['commentType']) => void;
  /** Callback when a comment is resolved */
  onResolveComment?: (commentId: string) => void;
  /** Callback when a comment is addressed */
  onAddressComment?: (commentId: string, response: string) => void;
  /** Callback when a comment is closed */
  onCloseComment?: (commentId: string) => void;
  /** Whether to show in read-only mode */
  readOnly?: boolean;
  /** Panel position */
  position?: 'right' | 'bottom';
  /** Panel size */
  size?: 'sm' | 'md' | 'lg';
  /** External comments to use (instead of mock data) */
  comments?: ApprovalComment[];
}

export interface CommentCountBadgeProps {
  /** Total comment count */
  total: number;
  /** Open (unresolved) count */
  open: number;
  /** Whether to show detailed breakdown */
  showBreakdown?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// COMMENT COUNT BADGE - Reusable badge showing comment counts
// ============================================================================

export function CommentCountBadge({
  total,
  open,
  showBreakdown = false,
  size = 'sm',
  onClick
}: CommentCountBadgeProps) {
  if (total === 0) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
      >
        <MessageSquare className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>No comments</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${onClick ? 'hover:opacity-80 transition-opacity cursor-pointer' : ''}`}
    >
      <MessageSquare className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-text-muted`} />
      <span className="text-text-secondary">{total}</span>
      {open > 0 && (
        <Badge color="red" size="xs" className="ml-0.5">
          {open} open
        </Badge>
      )}
      {showBreakdown && open === 0 && total > 0 && (
        <Badge color="green" size="xs" className="ml-0.5">
          All resolved
        </Badge>
      )}
    </button>
  );
}

// ============================================================================
// LIVE COMMENT COUNT HOOK - Simulates real-time updates
// ============================================================================

interface CommentCounts {
  total: number;
  open: number;
  addressed: number;
  closed: number;
}

export function useCommentCounts(
  approvalRequestId: string,
  externalComments?: ApprovalComment[]
): CommentCounts {
  const [counts, setCounts] = useState<CommentCounts>({
    total: 0,
    open: 0,
    addressed: 0,
    closed: 0,
  });

  useEffect(() => {
    // Use external comments if provided, otherwise use mock data
    const comments = externalComments || getCommentsForApproval(approvalRequestId);
    
    // Calculate counts including replies
    let total = 0;
    let open = 0;
    let addressed = 0;
    let closed = 0;

    const countComment = (comment: ApprovalComment) => {
      total++;
      switch (comment.status) {
        case 'open':
          open++;
          break;
        case 'addressed':
          addressed++;
          break;
        case 'closed':
          closed++;
          break;
      }
      // Count replies recursively
      if (comment.replies) {
        comment.replies.forEach(countComment);
      }
    };

    comments.forEach(countComment);

    setCounts({ total, open, addressed, closed });
  }, [approvalRequestId, externalComments]);

  return counts;
}

// ============================================================================
// PANEL SIZE CLASSES
// ============================================================================

const sizeClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommentsPanel({
  approvalRequestId,
  currentUserId = 'user-sarah-chen',
  documentTitle,
  isOpen,
  onClose,
  onAddComment,
  onResolveComment,
  onAddressComment,
  onCloseComment,
  readOnly = false,
  position = 'right',
  size = 'md',
  comments: externalComments,
}: CommentsPanelProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Get comments (external or mock)
  const comments = useMemo(() => {
    return externalComments || getCommentsForApproval(approvalRequestId);
  }, [approvalRequestId, externalComments, lastRefresh]);

  // Get counts
  const counts = useCommentCounts(approvalRequestId, comments);

  // Handlers
  const handleRefresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  // Position-based classes
  const positionClasses = position === 'right'
    ? 'right-0 top-0 bottom-0 border-l'
    : 'bottom-0 left-0 right-0 border-t h-96';

  const panelWidth = isExpanded ? 'w-[640px]' : sizeClasses[size];

  return (
    <div
      className={`
        absolute ${positionClasses} bg-surface-elevated z-30
        flex flex-col shadow-lg
        ${position === 'right' ? panelWidth : ''}
        transition-all duration-200
      `}
      role="complementary"
      aria-label="Comments panel"
    >
      {/* Header */}
      <div className="flex-none border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-accent-blue/20 rounded-lg">
              <MessageSquare className="w-4 h-4 text-accent-blue" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Comments
              </h3>
              {documentTitle && (
                <p className="text-xs text-text-muted truncate" title={documentTitle}>
                  {documentTitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Count summary */}
            <div className="flex items-center gap-2 mr-2 text-xs">
              <span className="text-text-muted">{counts.total}</span>
              {counts.open > 0 && (
                <span className="flex items-center gap-0.5 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  {counts.open}
                </span>
              )}
              {counts.addressed > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Check className="w-3 h-3" />
                  {counts.addressed}
                </span>
              )}
              {counts.closed > 0 && (
                <span className="flex items-center gap-0.5 text-green-600">
                  <CheckCheck className="w-3 h-3" />
                  {counts.closed}
                </span>
              )}
            </div>

            {/* Actions */}
            <Button
              variant="ghost"
              size="xs"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleRefresh}
              title="Refresh comments"
            />
            <Button
              variant="ghost"
              size="xs"
              icon={notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              onClick={handleToggleNotifications}
              title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
            />
            <Button
              variant="ghost"
              size="xs"
              icon={isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              onClick={handleToggleExpand}
              title={isExpanded ? 'Collapse panel' : 'Expand panel'}
            />
            <Button
              variant="ghost"
              size="xs"
              icon={<X className="w-3.5 h-3.5" />}
              onClick={onClose}
              title="Close comments"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ReviewCommentsThread
          comments={comments}
          approvalRequestId={approvalRequestId}
          currentUserId={currentUserId}
          onAddComment={onAddComment}
          onResolveComment={onResolveComment}
          onAddressComment={onAddressComment}
          onCloseComment={onCloseComment}
          readOnly={readOnly}
          compact={size === 'sm'}
        />
      </div>

      {/* Footer with quick stats */}
      <div className="flex-none border-t border-border bg-surface px-4 py-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {counts.total} comment{counts.total !== 1 ? 's' : ''}
            {counts.open > 0 && ` â€¢ ${counts.open} open`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live updates {notificationsEnabled ? 'on' : 'off'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMMENTS TRIGGER BUTTON - For use in DocumentViewer toolbar
// ============================================================================

export interface CommentsTriggerButtonProps {
  approvalRequestId: string;
  onClick: () => void;
  isActive?: boolean;
  comments?: ApprovalComment[];
}

export function CommentsTriggerButton({
  approvalRequestId,
  onClick,
  isActive = false,
  comments: externalComments,
}: CommentsTriggerButtonProps) {
  const counts = useCommentCounts(approvalRequestId, externalComments);

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex-shrink-0 ${
        isActive 
          ? 'bg-accent-blue text-white border-accent-blue' 
          : 'bg-surface border-border text-text-primary hover:bg-surface-elevated hover:border-border-focus'
      }`}
    >
      <MessageSquare className="w-4 h-4" />
      <span className="hidden sm:inline">Comments</span>
      {counts.total > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium rounded ${
          counts.open > 0 
            ? 'bg-red-100 text-red-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {counts.total}
        </span>
      )}
      {counts.open > 0 && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface-elevated" />
      )}
    </button>
  );
}

// ============================================================================
// INLINE COMMENT COUNT - Compact display for lists/tables
// ============================================================================

export interface InlineCommentCountProps {
  approvalRequestId: string;
  onClick?: () => void;
  comments?: ApprovalComment[];
}

export function InlineCommentCount({
  approvalRequestId,
  onClick,
  comments: externalComments,
}: InlineCommentCountProps) {
  const counts = useCommentCounts(approvalRequestId, externalComments);

  if (counts.total === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      title={`${counts.total} comment${counts.total !== 1 ? 's' : ''} (${counts.open} open)`}
    >
      <MessageSquare className="w-3 h-3" />
      <span>{counts.total}</span>
      {counts.open > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      )}
    </button>
  );
}

export default CommentsPanel;
