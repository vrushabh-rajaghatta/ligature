
/**
 * Escalation Notification Service - v0.13.54
 * 
 * Handles escalation event processing and notification triggering
 * for approval workflow SLA breaches. Integrates with:
 * - NotificationStore for platform notifications
 * - Mock approval data for demo scenarios
 * - Escalation tiers (T1=24h, T2=48h, T3=72h)
 */

import { 
  ApprovalRequest, 
  ApprovalStep, 
  EscalationEvent, 
  EscalationTier,
  EscalationConfig,
  DEFAULT_ESCALATION_TIERS,
  getEscalationTier,
} from '@/types/approval';
import { useNotificationStore } from '@/store/useNotificationStore';

// ============================================================================
// TYPES
// ============================================================================

export interface EscalationNotificationPayload {
  approvalRequestId: string;
  approvalRequestTitle: string;
  documentTitle: string;
  stepName: string;
  assigneeName: string;
  assigneeId?: string;
  tier: 1 | 2 | 3;
  hoursOverdue: number;
  dueDate: string;
  escalationEvent: EscalationEvent;
}

export interface EscalationCheckResult {
  needsEscalation: boolean;
  currentTier: EscalationTier | null;
  hoursOverdue: number;
  shouldNotify: boolean;
  notificationsSent: string[];
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

/**
 * Trigger Tier 1 escalation notification (reminder to assignee)
 * Fires at 24 hours overdue
 */
export function triggerTier1EscalationNotification(payload: EscalationNotificationPayload): string {
  const { addNotification } = useNotificationStore.getState();
  
  return addNotification({
    category: 'review',
    priority: 'high',
    title: 'Approval Overdue - Action Required',
    message: `"${payload.documentTitle}" approval is ${Math.round(payload.hoursOverdue)}h overdue. ${payload.stepName} step requires your attention.`,
    sourceModule: 'document-control',
    sourceId: payload.approvalRequestId,
    sourceType: 'approval-escalation',
    actionLabel: 'Review Now',
    actionTarget: 'document-control',
    actionData: { 
      approvalRequestId: payload.approvalRequestId,
      escalationTier: 1,
    },
    metadata: {
      tier: 1,
      hoursOverdue: payload.hoursOverdue,
      stepName: payload.stepName,
      assigneeName: payload.assigneeName,
    },
  });
}

/**
 * Trigger Tier 2 escalation notification (manager notification)
 * Fires at 48 hours overdue
 */
export function triggerTier2EscalationNotification(payload: EscalationNotificationPayload): string {
  const { addNotification } = useNotificationStore.getState();
  
  return addNotification({
    category: 'review',
    priority: 'critical',
    title: 'Approval Escalated to Manager',
    message: `"${payload.documentTitle}" has been overdue for ${Math.round(payload.hoursOverdue)}h. ${payload.assigneeName}'s manager has been notified.`,
    sourceModule: 'document-control',
    sourceId: payload.approvalRequestId,
    sourceType: 'approval-escalation',
    actionLabel: 'View Approval',
    actionTarget: 'document-control',
    actionData: { 
      approvalRequestId: payload.approvalRequestId,
      escalationTier: 2,
    },
    metadata: {
      tier: 2,
      hoursOverdue: payload.hoursOverdue,
      stepName: payload.stepName,
      assigneeName: payload.assigneeName,
      escalationAction: 'notify-manager',
    },
  });
}

/**
 * Trigger Tier 3 escalation notification (VP/executive notification)
 * Fires at 72 hours overdue
 */
export function triggerTier3EscalationNotification(payload: EscalationNotificationPayload): string {
  const { addNotification } = useNotificationStore.getState();
  
  return addNotification({
    category: 'review',
    priority: 'critical',
    title: '⚠️ Critical Escalation - VP Notified',
    message: `URGENT: "${payload.documentTitle}" has been overdue for ${Math.round(payload.hoursOverdue)}h. VP has been escalated for immediate action.`,
    sourceModule: 'document-control',
    sourceId: payload.approvalRequestId,
    sourceType: 'approval-escalation',
    actionLabel: 'Take Action',
    actionTarget: 'document-control',
    actionData: { 
      approvalRequestId: payload.approvalRequestId,
      escalationTier: 3,
    },
    metadata: {
      tier: 3,
      hoursOverdue: payload.hoursOverdue,
      stepName: payload.stepName,
      assigneeName: payload.assigneeName,
      escalationAction: 'notify-vp',
    },
  });
}

/**
 * Trigger notification for new escalation event (generic handler)
 */
export function triggerEscalationNotification(payload: EscalationNotificationPayload): string {
  switch (payload.tier) {
    case 1:
      return triggerTier1EscalationNotification(payload);
    case 2:
      return triggerTier2EscalationNotification(payload);
    case 3:
      return triggerTier3EscalationNotification(payload);
    default:
      return triggerTier1EscalationNotification(payload);
  }
}

// ============================================================================
// ESCALATION CHECK & PROCESSING
// ============================================================================

/**
 * Calculate hours overdue from due date
 */
export function calculateHoursOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Check if an approval step needs escalation
 */
export function checkStepEscalation(
  step: ApprovalStep,
  config: EscalationConfig = { enabled: true, tiers: DEFAULT_ESCALATION_TIERS, workingHoursOnly: false, timezone: 'UTC', excludeWeekends: false }
): { needsEscalation: boolean; tier: EscalationTier | null; hoursOverdue: number } {
  // Only check steps that are in progress and have a due date
  if (step.status !== 'in-progress' || !step.dueDate) {
    return { needsEscalation: false, tier: null, hoursOverdue: 0 };
  }
  
  const hoursOverdue = calculateHoursOverdue(step.dueDate);
  
  if (hoursOverdue <= 0) {
    return { needsEscalation: false, tier: null, hoursOverdue: 0 };
  }
  
  const tier = getEscalationTier(hoursOverdue, config);
  
  return {
    needsEscalation: tier !== null,
    tier,
    hoursOverdue,
  };
}

/**
 * Process an approval request and check for escalation needs
 * Returns escalation check results and triggers notifications if needed
 */
export function processApprovalEscalation(
  request: ApprovalRequest,
  existingEvents: EscalationEvent[] = []
): EscalationCheckResult {
  const config = request.escalationConfig || { 
    enabled: true, 
    tiers: DEFAULT_ESCALATION_TIERS, 
    workingHoursOnly: false, 
    timezone: 'UTC', 
    excludeWeekends: false 
  };
  
  if (!config.enabled) {
    return {
      needsEscalation: false,
      currentTier: null,
      hoursOverdue: 0,
      shouldNotify: false,
      notificationsSent: [],
    };
  }
  
  // Find the current in-progress step
  const currentStep = request.approvalSteps[request.currentStepIndex];
  
  if (!currentStep || currentStep.status !== 'in-progress') {
    return {
      needsEscalation: false,
      currentTier: null,
      hoursOverdue: 0,
      shouldNotify: false,
      notificationsSent: [],
    };
  }
  
  const { needsEscalation, tier, hoursOverdue } = checkStepEscalation(currentStep, config);
  
  if (!needsEscalation || !tier) {
    return {
      needsEscalation: false,
      currentTier: null,
      hoursOverdue,
      shouldNotify: false,
      notificationsSent: [],
    };
  }
  
  // Check if we've already sent a notification for this tier
  const existingTierEvents = existingEvents.filter(e => 
    e.stepId === currentStep.id && e.tier === tier.tier
  );
  
  if (existingTierEvents.length > 0) {
    // Already notified for this tier
    return {
      needsEscalation: true,
      currentTier: tier,
      hoursOverdue,
      shouldNotify: false,
      notificationsSent: [],
    };
  }
  
  // Trigger notification for this tier
  const payload: EscalationNotificationPayload = {
    approvalRequestId: request.id,
    approvalRequestTitle: request.title,
    documentTitle: request.documentTitle,
    stepName: currentStep.name,
    assigneeName: currentStep.assignedUserName || 'Unassigned',
    assigneeId: currentStep.assignedUserId,
    tier: tier.tier,
    hoursOverdue,
    dueDate: currentStep.dueDate || request.dueDate,
    escalationEvent: {
      id: `esc-${Date.now()}`,
      approvalRequestId: request.id,
      stepId: currentStep.id,
      tier: tier.tier,
      triggeredAt: new Date().toISOString(),
      triggerReason: `Step overdue by ${Math.round(hoursOverdue)} hours`,
      action: tier.action,
      notifiedUsers: [],
    },
  };
  
  const notificationId = triggerEscalationNotification(payload);
  
  return {
    needsEscalation: true,
    currentTier: tier,
    hoursOverdue,
    shouldNotify: true,
    notificationsSent: [notificationId],
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple approval requests for escalation
 * Useful for periodic batch checks
 */
export function processAllApprovalEscalations(
  requests: ApprovalRequest[]
): Map<string, EscalationCheckResult> {
  const results = new Map<string, EscalationCheckResult>();
  
  for (const request of requests) {
    // Only process in-progress requests
    if (request.status === 'in-progress') {
      const result = processApprovalEscalation(
        request, 
        request.escalationEvents || []
      );
      results.set(request.id, result);
    }
  }
  
  return results;
}

// ============================================================================
// DEMO MODE HELPERS
// ============================================================================

/**
 * Simulate escalation notifications for demo purposes
 * Uses mock data with frozen timestamps
 */
export function triggerDemoEscalationNotifications(): string[] {
  const notificationIds: string[] = [];
  
  // Simulate Tier 1 notification
  notificationIds.push(triggerTier1EscalationNotification({
    approvalRequestId: 'apr-demo-001',
    approvalRequestTitle: 'IB Annual Update Review',
    documentTitle: "Investigator's Brochure v4.0",
    stepName: 'Medical Review',
    assigneeName: 'Dr. Robert Kim',
    tier: 1,
    hoursOverdue: 28,
    dueDate: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    escalationEvent: {
      id: 'esc-demo-001',
      approvalRequestId: 'apr-demo-001',
      stepId: 'step-demo-1',
      tier: 1,
      triggeredAt: new Date().toISOString(),
      triggerReason: 'Step overdue by 28 hours',
      action: 'reminder',
      notifiedUsers: [],
    },
  }));
  
  // Simulate Tier 2 notification
  notificationIds.push(triggerTier2EscalationNotification({
    approvalRequestId: 'apr-demo-002',
    approvalRequestTitle: 'CSR Final Review',
    documentTitle: 'Clinical Study Report - Phase III Trial',
    stepName: 'Regulatory Review',
    assigneeName: 'Michael Torres',
    tier: 2,
    hoursOverdue: 52,
    dueDate: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    escalationEvent: {
      id: 'esc-demo-002',
      approvalRequestId: 'apr-demo-002',
      stepId: 'step-demo-2',
      tier: 2,
      triggeredAt: new Date().toISOString(),
      triggerReason: 'Step overdue by 52 hours - Manager notification triggered',
      action: 'notify-manager',
      notifiedUsers: [],
    },
  }));
  
  // Simulate Tier 3 notification
  notificationIds.push(triggerTier3EscalationNotification({
    approvalRequestId: 'apr-demo-003',
    approvalRequestTitle: 'Protocol Amendment Approval',
    documentTitle: 'Protocol Amendment 2 - Study XYZ-456',
    stepName: 'Executive Sign-off',
    assigneeName: 'Dr. Patricia Hayes',
    tier: 3,
    hoursOverdue: 76,
    dueDate: new Date(Date.now() - 76 * 60 * 60 * 1000).toISOString(),
    escalationEvent: {
      id: 'esc-demo-003',
      approvalRequestId: 'apr-demo-003',
      stepId: 'step-demo-3',
      tier: 3,
      triggeredAt: new Date().toISOString(),
      triggerReason: 'Step overdue by 76 hours - VP escalation triggered',
      action: 'notify-vp',
      notifiedUsers: [],
    },
  }));
  
  return notificationIds;
}

/**
 * Clear demo escalation notifications
 */
export function clearDemoEscalationNotifications(notificationIds: string[]): void {
  const { deleteNotification } = useNotificationStore.getState();
  
  for (const id of notificationIds) {
    deleteNotification(id);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const EscalationNotificationService = {
  // Notification triggers
  triggerTier1EscalationNotification,
  triggerTier2EscalationNotification,
  triggerTier3EscalationNotification,
  triggerEscalationNotification,
  
  // Processing
  checkStepEscalation,
  processApprovalEscalation,
  processAllApprovalEscalations,
  calculateHoursOverdue,
  
  // Demo helpers
  triggerDemoEscalationNotifications,
  clearDemoEscalationNotifications,
};

export default EscalationNotificationService;
