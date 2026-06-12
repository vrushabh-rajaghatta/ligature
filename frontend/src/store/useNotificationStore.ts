

/**
 * Notification Store - Real-time Platform Notifications
 * 
 * Centralized notification management for:
 * - Review assignments and completions
 * - Comment additions and resolutions
 * - HAQ due date warnings
 * - Document approvals and rejections
 * - AI generation completions
 * - System alerts
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationCategory = 
  | 'review'
  | 'comment'
  | 'haq'
  | 'document'
  | 'ai'
  | 'safety'
  | 'submission'
  | 'system';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface PlatformNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  timestamp: string;
  
  // Source tracking
  sourceModule?: string;
  sourceId?: string;
  sourceType?: string;
  
  // Action support
  actionLabel?: string;
  actionTarget?: string; // module to navigate to
  actionData?: Record<string, unknown>;
  
  // Grouping
  groupKey?: string; // for collapsing similar notifications
  relatedIds?: string[];
  
  // User targeting
  targetUserId?: string;
  targetRole?: string;
  
  // Expiration
  expiresAt?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabledCategories: NotificationCategory[];
  enableSound: boolean;
  enableDesktopNotifications: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  groupSimilar: boolean;
  autoArchiveAfterDays: number;
}

export interface NotificationState {
  notifications: PlatformNotification[];
  preferences: NotificationPreferences;
  isLoading: boolean;
  lastFetchedAt: string | null;
}

export interface NotificationActions {
  // CRUD
  addNotification: (notification: Omit<PlatformNotification, 'id' | 'timestamp' | 'status'>) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  
  // Bulk operations
  markCategoryAsRead: (category: NotificationCategory) => void;
  archiveOlderThan: (days: number) => void;
  
  // Preferences
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  
  // Event handlers - these are called from other stores
  onReviewAssigned: (reviewId: string, reviewName: string, documentTitle: string, assigneeName: string, dueDate: string) => void;
  onReviewCompleted: (reviewId: string, reviewName: string, reviewerName: string, commentsCount: number) => void;
  onCommentAdded: (reviewId: string, documentTitle: string, commenterName: string, commentType: string, sectionTitle: string) => void;
  onCommentResolved: (reviewId: string, documentTitle: string, resolverName: string, commentContent: string) => void;
  onHAQDueSoon: (haqId: string, haqTitle: string, daysUntilDue: number, agency: string) => void;
  onHAQOverdue: (haqId: string, haqTitle: string, daysOverdue: number, agency: string) => void;
  onDocumentApproved: (documentId: string, documentTitle: string, approverName: string, version: string) => void;
  onDocumentRejected: (documentId: string, documentTitle: string, rejectorName: string, reason: string) => void;
  onAIGenerationComplete: (taskId: string, taskType: string, documentTitle: string, success: boolean) => void;
  onSignalDetected: (signalId: string, productName: string, eventType: string, severity: string) => void;
  onSubmissionAcknowledged: (submissionId: string, applicationName: string, agency: string, trackingNumber: string) => void;
  onExternalReviewerAccepted: (reviewId: string, reviewerName: string, documentTitle: string) => void;
  
  // v0.13.54: Escalation notification handlers
  onApprovalEscalationTier1: (approvalRequestId: string, documentTitle: string, stepName: string, assigneeName: string, hoursOverdue: number) => void;
  onApprovalEscalationTier2: (approvalRequestId: string, documentTitle: string, stepName: string, assigneeName: string, hoursOverdue: number, managerName: string) => void;
  onApprovalEscalationTier3: (approvalRequestId: string, documentTitle: string, stepName: string, assigneeName: string, hoursOverdue: number, vpName: string) => void;
  onApprovalEscalationResolved: (approvalRequestId: string, documentTitle: string, resolvedBy: string, tier: number) => void;
  
  // Queries
  getUnreadCount: () => number;
  getUnreadByCategory: (category: NotificationCategory) => number;
  getRecentNotifications: (limit?: number) => PlatformNotification[];
  getNotificationsByCategory: (category: NotificationCategory) => PlatformNotification[];
}

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

const defaultPreferences: NotificationPreferences = {
  enabledCategories: ['review', 'comment', 'haq', 'document', 'ai', 'safety', 'submission', 'system'],
  enableSound: true,
  enableDesktopNotifications: false,
  groupSimilar: true,
  autoArchiveAfterDays: 30,
};

// ============================================================================
// STORE
// ============================================================================

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    persist(
      (set, get) => ({
        notifications: [],
        preferences: defaultPreferences,
        isLoading: false,
        lastFetchedAt: null,

        // ===== CRUD =====
        addNotification: (data) => {
          const id = generateId();
          const notification: PlatformNotification = {
            ...data,
            id,
            timestamp: now(),
            status: 'unread',
          };
          
          // Check if category is enabled
          if (!get().preferences.enabledCategories.includes(data.category)) {
            return id; // Still return ID but don't add
          }
          
          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 500), // Keep last 500
          }), false, 'addNotification');
          
          return id;
        },

        markAsRead: (id) => {
          set((state) => ({
            notifications: state.notifications.map(n => 
              n.id === id ? { ...n, status: 'read' as NotificationStatus } : n
            ),
          }), false, 'markAsRead');
        },

        markAllAsRead: () => {
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, status: 'read' as NotificationStatus })),
          }), false, 'markAllAsRead');
        },

        archiveNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.map(n => 
              n.id === id ? { ...n, status: 'archived' as NotificationStatus } : n
            ),
          }), false, 'archiveNotification');
        },

        deleteNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id),
          }), false, 'deleteNotification');
        },

        clearAll: () => {
          set({ notifications: [] }, false, 'clearAll');
        },

        // ===== BULK OPERATIONS =====
        markCategoryAsRead: (category) => {
          set((state) => ({
            notifications: state.notifications.map(n => 
              n.category === category ? { ...n, status: 'read' as NotificationStatus } : n
            ),
          }), false, 'markCategoryAsRead');
        },

        archiveOlderThan: (days) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const cutoffStr = cutoff.toISOString();
          
          set((state) => ({
            notifications: state.notifications.map(n => 
              n.timestamp < cutoffStr ? { ...n, status: 'archived' as NotificationStatus } : n
            ),
          }), false, 'archiveOlderThan');
        },

        // ===== PREFERENCES =====
        updatePreferences: (prefs) => {
          set((state) => ({
            preferences: { ...state.preferences, ...prefs },
          }), false, 'updatePreferences');
        },

        // ===== EVENT HANDLERS =====
        onReviewAssigned: (reviewId, reviewName, documentTitle, assigneeName, dueDate) => {
          get().addNotification({
            category: 'review',
            priority: 'high',
            title: 'Review Assigned',
            message: `You've been assigned to review "${documentTitle}" - due ${dueDate}`,
            sourceModule: 'authoring',
            sourceId: reviewId,
            sourceType: 'review',
            actionLabel: 'View Review',
            actionTarget: 'authoring',
            actionData: { reviewId, documentTitle },
            metadata: { reviewName, assigneeName, dueDate },
          });
        },

        onReviewCompleted: (reviewId, reviewName, reviewerName, commentsCount) => {
          get().addNotification({
            category: 'review',
            priority: 'normal',
            title: 'Review Completed',
            message: `${reviewerName} completed their review with ${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`,
            sourceModule: 'authoring',
            sourceId: reviewId,
            sourceType: 'review',
            actionLabel: 'View Comments',
            actionTarget: 'authoring',
            actionData: { reviewId },
            metadata: { reviewName, reviewerName, commentsCount },
          });
        },

        onCommentAdded: (reviewId, documentTitle, commenterName, commentType, sectionTitle) => {
          get().addNotification({
            category: 'comment',
            priority: commentType === 'issue' ? 'high' : 'normal',
            title: `New ${commentType.charAt(0).toUpperCase() + commentType.slice(1)}`,
            message: `${commenterName} added a ${commentType} on "${sectionTitle}" in ${documentTitle}`,
            sourceModule: 'authoring',
            sourceId: reviewId,
            sourceType: 'comment',
            actionLabel: 'View Comment',
            actionTarget: 'authoring',
            actionData: { reviewId, sectionTitle },
            groupKey: `comments-${reviewId}`,
            metadata: { commenterName, commentType, sectionTitle, documentTitle },
          });
        },

        onCommentResolved: (reviewId, documentTitle, resolverName, commentContent) => {
          const preview = commentContent.length > 50 ? commentContent.slice(0, 50) + '...' : commentContent;
          get().addNotification({
            category: 'comment',
            priority: 'low',
            title: 'Comment Resolved',
            message: `${resolverName} resolved: "${preview}"`,
            sourceModule: 'authoring',
            sourceId: reviewId,
            sourceType: 'comment',
            actionLabel: 'View Resolution',
            actionTarget: 'authoring',
            actionData: { reviewId },
            groupKey: `resolutions-${reviewId}`,
            metadata: { resolverName, documentTitle },
          });
        },

        onHAQDueSoon: (haqId, haqTitle, daysUntilDue, agency) => {
          get().addNotification({
            category: 'haq',
            priority: daysUntilDue <= 3 ? 'critical' : 'high',
            title: `HAQ Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`,
            message: `${agency} question "${haqTitle}" requires response`,
            sourceModule: 'haq',
            sourceId: haqId,
            sourceType: 'haq',
            actionLabel: 'Respond Now',
            actionTarget: 'haq',
            actionData: { haqId },
            metadata: { daysUntilDue, agency },
          });
        },

        onHAQOverdue: (haqId, haqTitle, daysOverdue, agency) => {
          get().addNotification({
            category: 'haq',
            priority: 'critical',
            title: `HAQ Overdue by ${daysOverdue} Day${daysOverdue !== 1 ? 's' : ''}`,
            message: `URGENT: ${agency} question "${haqTitle}" is past due`,
            sourceModule: 'haq',
            sourceId: haqId,
            sourceType: 'haq',
            actionLabel: 'Respond Now',
            actionTarget: 'haq',
            actionData: { haqId },
            metadata: { daysOverdue, agency },
          });
        },

        onDocumentApproved: (documentId, documentTitle, approverName, version) => {
          get().addNotification({
            category: 'document',
            priority: 'normal',
            title: 'Document Approved',
            message: `${approverName} approved "${documentTitle}" v${version}`,
            sourceModule: 'authoring',
            sourceId: documentId,
            sourceType: 'document',
            actionLabel: 'View Document',
            actionTarget: 'authoring',
            actionData: { documentId },
            metadata: { approverName, version },
          });
        },

        onDocumentRejected: (documentId, documentTitle, rejectorName, reason) => {
          get().addNotification({
            category: 'document',
            priority: 'high',
            title: 'Document Requires Changes',
            message: `${rejectorName} requested changes to "${documentTitle}": ${reason}`,
            sourceModule: 'authoring',
            sourceId: documentId,
            sourceType: 'document',
            actionLabel: 'View Feedback',
            actionTarget: 'authoring',
            actionData: { documentId },
            metadata: { rejectorName, reason },
          });
        },

        onAIGenerationComplete: (taskId, taskType, documentTitle, success) => {
          get().addNotification({
            category: 'ai',
            priority: success ? 'low' : 'high',
            title: success ? 'AI Generation Complete' : 'AI Generation Failed',
            message: success 
              ? `${taskType} for "${documentTitle}" is ready for review`
              : `${taskType} for "${documentTitle}" encountered an error`,
            sourceModule: 'authoring',
            sourceId: taskId,
            sourceType: 'ai-task',
            actionLabel: success ? 'Review Output' : 'View Error',
            actionTarget: 'authoring',
            actionData: { taskId, documentTitle },
            metadata: { taskType, success },
          });
        },

        onSignalDetected: (signalId, productName, eventType, severity) => {
          get().addNotification({
            category: 'safety',
            priority: severity === 'critical' ? 'critical' : 'high',
            title: 'Safety Signal Detected',
            message: `New ${severity} signal for ${productName}: ${eventType}`,
            sourceModule: 'safety',
            sourceId: signalId,
            sourceType: 'signal',
            actionLabel: 'Review Signal',
            actionTarget: 'safety',
            actionData: { signalId, productName },
            metadata: { eventType, severity },
          });
        },

        onSubmissionAcknowledged: (submissionId, applicationName, agency, trackingNumber) => {
          get().addNotification({
            category: 'submission',
            priority: 'normal',
            title: 'Submission Acknowledged',
            message: `${agency} acknowledged ${applicationName} - Tracking: ${trackingNumber}`,
            sourceModule: 'submissions',
            sourceId: submissionId,
            sourceType: 'submission',
            actionLabel: 'View Details',
            actionTarget: 'submissions',
            actionData: { submissionId, trackingNumber },
            metadata: { agency, applicationName },
          });
        },

        onExternalReviewerAccepted: (reviewId, reviewerName, documentTitle) => {
          get().addNotification({
            category: 'review',
            priority: 'normal',
            title: 'External Reviewer Joined',
            message: `${reviewerName} has accepted the invitation to review "${documentTitle}"`,
            sourceModule: 'authoring',
            sourceId: reviewId,
            sourceType: 'review',
            actionLabel: 'View Review',
            actionTarget: 'authoring',
            actionData: { reviewId },
            metadata: { reviewerName, documentTitle },
          });
        },

        // v0.13.54: Escalation notification handlers
        onApprovalEscalationTier1: (approvalRequestId, documentTitle, stepName, assigneeName, hoursOverdue) => {
          get().addNotification({
            category: 'review',
            priority: 'high',
            title: 'Approval Overdue - Action Required',
            message: `"${documentTitle}" approval is ${hoursOverdue}h overdue. ${stepName} step requires attention.`,
            sourceModule: 'document-control',
            sourceId: approvalRequestId,
            sourceType: 'approval-escalation',
            actionLabel: 'Review Now',
            actionTarget: 'document-control',
            actionData: { approvalRequestId, escalationTier: 1 },
            metadata: { tier: 1, hoursOverdue, stepName, assigneeName },
          });
        },

        onApprovalEscalationTier2: (approvalRequestId, documentTitle, stepName, assigneeName, hoursOverdue, managerName) => {
          get().addNotification({
            category: 'review',
            priority: 'critical',
            title: 'Approval Escalated to Manager',
            message: `"${documentTitle}" has been overdue for ${hoursOverdue}h. ${managerName} has been notified.`,
            sourceModule: 'document-control',
            sourceId: approvalRequestId,
            sourceType: 'approval-escalation',
            actionLabel: 'View Approval',
            actionTarget: 'document-control',
            actionData: { approvalRequestId, escalationTier: 2 },
            metadata: { tier: 2, hoursOverdue, stepName, assigneeName, managerName, escalationAction: 'notify-manager' },
          });
        },

        onApprovalEscalationTier3: (approvalRequestId, documentTitle, stepName, assigneeName, hoursOverdue, vpName) => {
          get().addNotification({
            category: 'review',
            priority: 'critical',
            title: '⚠️ Critical Escalation - VP Notified',
            message: `URGENT: "${documentTitle}" has been overdue for ${hoursOverdue}h. ${vpName} has been escalated.`,
            sourceModule: 'document-control',
            sourceId: approvalRequestId,
            sourceType: 'approval-escalation',
            actionLabel: 'Take Action',
            actionTarget: 'document-control',
            actionData: { approvalRequestId, escalationTier: 3 },
            metadata: { tier: 3, hoursOverdue, stepName, assigneeName, vpName, escalationAction: 'notify-vp' },
          });
        },

        onApprovalEscalationResolved: (approvalRequestId, documentTitle, resolvedBy, tier) => {
          get().addNotification({
            category: 'review',
            priority: 'normal',
            title: 'Escalation Resolved',
            message: `"${documentTitle}" Tier ${tier} escalation has been resolved by ${resolvedBy}.`,
            sourceModule: 'document-control',
            sourceId: approvalRequestId,
            sourceType: 'approval-escalation',
            actionLabel: 'View Details',
            actionTarget: 'document-control',
            actionData: { approvalRequestId },
            metadata: { tier, resolvedBy },
          });
        },

        // ===== QUERIES =====
        getUnreadCount: () => {
          return get().notifications.filter(n => n.status === 'unread').length;
        },

        getUnreadByCategory: (category) => {
          return get().notifications.filter(n => n.status === 'unread' && n.category === category).length;
        },

        getRecentNotifications: (limit = 10) => {
          return get().notifications
            .filter(n => n.status !== 'archived')
            .slice(0, limit);
        },

        getNotificationsByCategory: (category) => {
          return get().notifications.filter(n => n.category === category && n.status !== 'archived');
        },
      }),
      {
        name: 'ligature-notifications',
        partialize: (state) => ({
          notifications: state.notifications.slice(0, 100), // Only persist last 100
          preferences: state.preferences,
        }),
      }
    ),
    { name: 'NotificationStore' }
  )
);

// ============================================================================
// SELECTOR HOOKS - v168 Optimized
// ============================================================================
// These hooks follow the pattern established in v167: extract stable references
// from the store and compute derived values outside the selector to prevent
// unnecessary re-renders.

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Returns the count of unread notifications.
 * v168: Optimized to compute outside selector
 * v204d-b27: Added useShallow to prevent hydration loops
 */
export const useUnreadCount = () => {
  const notifications = useNotificationStore(useShallow((s) => s.notifications));
  return useMemo(
    () => notifications.filter(n => n.status === 'unread').length,
    [notifications]
  );
};

/**
 * Returns recent non-archived notifications up to the specified limit.
 * v168: Optimized with useMemo to prevent array recreation
 * v204d-b27: Added useShallow to prevent hydration loops
 */
export const useRecentNotifications = (limit = 10) => {
  const notifications = useNotificationStore(useShallow((s) => s.notifications));
  return useMemo(
    () => notifications.filter(n => n.status !== 'archived').slice(0, limit),
    [notifications, limit]
  );
};

/**
 * Returns non-archived notifications for a specific category.
 * v168: Optimized with useMemo to prevent array recreation
 * v204d-b27: Added useShallow to prevent hydration loops
 */
export const useNotificationsByCategory = (category: NotificationCategory) => {
  const notifications = useNotificationStore(useShallow((s) => s.notifications));
  return useMemo(
    () => notifications.filter(n => n.category === category && n.status !== 'archived'),
    [notifications, category]
  );
};

/**
 * Returns counts by category for dashboard display.
 * v168: New hook for efficient category counts
 * v204d-b27: Added useShallow to prevent hydration loops
 */
export const useNotificationCategoryCounts = () => {
  const notifications = useNotificationStore(useShallow((s) => s.notifications));
  return useMemo(() => {
    const counts: Record<NotificationCategory, { total: number; unread: number }> = {
      review: { total: 0, unread: 0 },
      comment: { total: 0, unread: 0 },
      haq: { total: 0, unread: 0 },
      document: { total: 0, unread: 0 },
      ai: { total: 0, unread: 0 },
      safety: { total: 0, unread: 0 },
      submission: { total: 0, unread: 0 },
      system: { total: 0, unread: 0 },
    };
    notifications.forEach(n => {
      if (n.status !== 'archived') {
        counts[n.category].total++;
        if (n.status === 'unread') {
          counts[n.category].unread++;
        }
      }
    });
    return counts;
  }, [notifications]);
};
