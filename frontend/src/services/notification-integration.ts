
/**
 * Notification Integration Service
 * 
 * Provides helper functions to trigger notifications from various stores
 * and components across the platform. This acts as a bridge between
 * business logic and the notification system.
 */

import { useNotificationStore } from '@/store/useNotificationStore';

// ============================================================================
// REVIEW NOTIFICATIONS
// ============================================================================

export function notifyReviewAssigned(
  reviewId: string,
  reviewName: string,
  documentTitle: string,
  assigneeName: string,
  dueDate: string
) {
  useNotificationStore.getState().onReviewAssigned(
    reviewId,
    reviewName,
    documentTitle,
    assigneeName,
    dueDate
  );
}

export function notifyReviewCompleted(
  reviewId: string,
  reviewName: string,
  reviewerName: string,
  commentsCount: number
) {
  useNotificationStore.getState().onReviewCompleted(
    reviewId,
    reviewName,
    reviewerName,
    commentsCount
  );
}

export function notifyExternalReviewerAccepted(
  reviewId: string,
  reviewerName: string,
  documentTitle: string
) {
  useNotificationStore.getState().onExternalReviewerAccepted(
    reviewId,
    reviewerName,
    documentTitle
  );
}

// ============================================================================
// COMMENT NOTIFICATIONS
// ============================================================================

export function notifyCommentAdded(
  reviewId: string,
  documentTitle: string,
  commenterName: string,
  commentType: string,
  sectionTitle: string
) {
  useNotificationStore.getState().onCommentAdded(
    reviewId,
    documentTitle,
    commenterName,
    commentType,
    sectionTitle
  );
}

export function notifyCommentResolved(
  reviewId: string,
  documentTitle: string,
  resolverName: string,
  commentContent: string
) {
  useNotificationStore.getState().onCommentResolved(
    reviewId,
    documentTitle,
    resolverName,
    commentContent
  );
}

// ============================================================================
// HAQ NOTIFICATIONS
// ============================================================================

export function notifyHAQDueSoon(
  haqId: string,
  haqTitle: string,
  daysUntilDue: number,
  agency: string
) {
  useNotificationStore.getState().onHAQDueSoon(
    haqId,
    haqTitle,
    daysUntilDue,
    agency
  );
}

export function notifyHAQOverdue(
  haqId: string,
  haqTitle: string,
  daysOverdue: number,
  agency: string
) {
  useNotificationStore.getState().onHAQOverdue(
    haqId,
    haqTitle,
    daysOverdue,
    agency
  );
}

// ============================================================================
// DOCUMENT NOTIFICATIONS
// ============================================================================

export function notifyDocumentApproved(
  documentId: string,
  documentTitle: string,
  approverName: string,
  version: string
) {
  useNotificationStore.getState().onDocumentApproved(
    documentId,
    documentTitle,
    approverName,
    version
  );
}

export function notifyDocumentRejected(
  documentId: string,
  documentTitle: string,
  rejectorName: string,
  reason: string
) {
  useNotificationStore.getState().onDocumentRejected(
    documentId,
    documentTitle,
    rejectorName,
    reason
  );
}

// ============================================================================
// AI NOTIFICATIONS
// ============================================================================

export function notifyAIGenerationComplete(
  taskId: string,
  taskType: string,
  documentTitle: string,
  success: boolean
) {
  useNotificationStore.getState().onAIGenerationComplete(
    taskId,
    taskType,
    documentTitle,
    success
  );
}

// ============================================================================
// SAFETY NOTIFICATIONS
// ============================================================================

export function notifySignalDetected(
  signalId: string,
  productName: string,
  eventType: string,
  severity: string
) {
  useNotificationStore.getState().onSignalDetected(
    signalId,
    productName,
    eventType,
    severity
  );
}

// ============================================================================
// SUBMISSION NOTIFICATIONS
// ============================================================================

export function notifySubmissionAcknowledged(
  submissionId: string,
  applicationName: string,
  agency: string,
  trackingNumber: string
) {
  useNotificationStore.getState().onSubmissionAcknowledged(
    submissionId,
    applicationName,
    agency,
    trackingNumber
  );
}

// ============================================================================
// GENERIC NOTIFICATION
// ============================================================================

export function addCustomNotification(
  category: 'review' | 'comment' | 'haq' | 'document' | 'ai' | 'safety' | 'submission' | 'system',
  priority: 'critical' | 'high' | 'normal' | 'low',
  title: string,
  message: string,
  options?: {
    sourceModule?: string;
    sourceId?: string;
    actionLabel?: string;
    actionTarget?: string;
    actionData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  useNotificationStore.getState().addNotification({
    category,
    priority,
    title,
    message,
    ...options,
  });
}

// ============================================================================
// DEMO NOTIFICATIONS (for populating the notification bell during demos)
// ============================================================================

export function populateDemoNotifications() {
  const store = useNotificationStore.getState();
  
  // Clear existing
  store.clearAll();
  
  // Add realistic demo notifications
  store.addNotification({
    category: 'haq',
    priority: 'critical',
    title: 'HAQ Overdue by 3 Days',
    message: 'URGENT: FDA question regarding pharmacokinetic data interpretation is past due',
    sourceModule: 'haq',
    sourceId: 'haq-001',
    actionLabel: 'Respond Now',
    actionTarget: 'haq',
  });
  
  store.addNotification({
    category: 'review',
    priority: 'high',
    title: 'Review Assigned',
    message: 'You\'ve been assigned to review "Clinical Overview 2.5" - due in 3 days',
    sourceModule: 'authoring',
    sourceId: 'rev-001',
    actionLabel: 'Start Review',
    actionTarget: 'authoring',
  });
  
  store.addNotification({
    category: 'document',
    priority: 'normal',
    title: 'Document Approved',
    message: 'Dr. Sarah Chen approved "Module 2.7 Clinical Summary" v3.2',
    sourceModule: 'authoring',
    sourceId: 'doc-001',
    actionLabel: 'View Document',
    actionTarget: 'authoring',
  });
  
  store.addNotification({
    category: 'comment',
    priority: 'normal',
    title: 'New Issue Reported',
    message: 'Maria Santos added an issue on "Efficacy Results" in Clinical Study Report',
    sourceModule: 'authoring',
    sourceId: 'rev-002',
    actionLabel: 'View Comment',
    actionTarget: 'authoring',
  });
  
  store.addNotification({
    category: 'ai',
    priority: 'low',
    title: 'AI Generation Complete',
    message: 'Draft response for "Clarification on primary endpoint analysis" is ready for review',
    sourceModule: 'haq',
    sourceId: 'ai-001',
    actionLabel: 'Review Draft',
    actionTarget: 'haq',
  });
  
  store.addNotification({
    category: 'submission',
    priority: 'normal',
    title: 'Submission Acknowledged',
    message: 'FDA acknowledged LIG-2847 NDA - Tracking: FDA-2024-N-1234',
    sourceModule: 'submissions',
    sourceId: 'sub-001',
    actionLabel: 'View Details',
    actionTarget: 'submissions',
  });
  
  store.addNotification({
    category: 'safety',
    priority: 'high',
    title: 'Safety Signal Detected',
    message: 'New potential signal for LIG-2847: hepatic enzyme elevation (PRR: 2.4)',
    sourceModule: 'safety',
    sourceId: 'sig-001',
    actionLabel: 'Review Signal',
    actionTarget: 'safety',
  });
}
