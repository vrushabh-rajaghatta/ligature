
/**
 * Notification Service
 * Handles email and in-app notifications for approval workflow
 * 
 * v0.41.9 - Approval Notifications
 */

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType = 
  | 'approval-submitted'
  | 'approval-assigned'
  | 'approval-approved'
  | 'approval-rejected'
  | 'approval-changes-requested'
  | 'approval-reminder'
  | 'approval-overdue'
  | 'mention'
  | 'comment'
  | 'collaboration-invite';

export type NotificationChannel = 'in-app' | 'email' | 'both';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  
  // Target
  recipientId: string;
  recipientEmail?: string;
  
  // Source
  senderId?: string;
  senderName?: string;
  
  // Context
  entityType: 'template' | 'version' | 'approval' | 'document' | 'comment';
  entityId: string;
  entityTitle?: string;
  actionUrl?: string;
  
  // State
  isRead: boolean;
  isEmailSent: boolean;
  readAt?: number;
  
  // Timestamps
  createdAt: number;
  expiresAt?: number;

  // Extended fields
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface NotificationPreferences {
  userId: string;
  
  // Channel preferences by type
  approvalSubmitted: NotificationChannel;
  approvalAssigned: NotificationChannel;
  approvalDecision: NotificationChannel;
  approvalReminder: NotificationChannel;
  mentions: NotificationChannel;
  comments: NotificationChannel;
  
  // Email settings
  emailEnabled: boolean;
  emailDigest: 'immediate' | 'daily' | 'weekly' | 'none';
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
}

export interface CreateNotificationParams {
  type: NotificationType;
  recipientId: string;
  recipientEmail?: string;
  senderId?: string;
  senderName?: string;
  entityType: Notification['entityType'];
  entityId: string;
  entityTitle?: string;
  actionUrl?: string;
  customTitle?: string;
  customMessage?: string;
  priority?: NotificationPriority;
}

// v0.42.28: Context type for notification templates
interface NotificationContext {
  entityTitle?: string;
  senderName?: string;
  reviewerName?: string;
  version?: string;
  comments?: string;
  daysWaiting?: number;
  userName?: string;
  previousRole?: string;
  newRole?: string;
  roleName?: string;
  [key: string]: unknown;
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

const NOTIFICATION_TEMPLATES: Record<NotificationType, {
  title: (ctx: NotificationContext) => string;
  message: (ctx: NotificationContext) => string;
  defaultPriority: NotificationPriority;
}> = {
  'approval-submitted': {
    title: (ctx) => `New approval request: ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.senderName} submitted version ${ctx.version} for approval.`,
    defaultPriority: 'normal',
  },
  'approval-assigned': {
    title: (ctx) => `Review requested: ${ctx.entityTitle}`,
    message: (ctx) => `You've been assigned to review ${ctx.entityTitle} version ${ctx.version}.`,
    defaultPriority: 'high',
  },
  'approval-approved': {
    title: (ctx) => `Approved: ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.reviewerName} approved version ${ctx.version}. It is now active.`,
    defaultPriority: 'normal',
  },
  'approval-rejected': {
    title: (ctx) => `Rejected: ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.reviewerName} rejected version ${ctx.version}. ${ctx.comments || ''}`,
    defaultPriority: 'high',
  },
  'approval-changes-requested': {
    title: (ctx) => `Changes requested: ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.reviewerName} requested changes to version ${ctx.version}. ${ctx.comments || ''}`,
    defaultPriority: 'high',
  },
  'approval-reminder': {
    title: (ctx) => `Reminder: Review pending for ${ctx.entityTitle}`,
    message: (ctx) => `Version ${ctx.version} has been waiting for review for ${ctx.daysWaiting} days.`,
    defaultPriority: 'normal',
  },
  'approval-overdue': {
    title: (ctx) => `Overdue: ${ctx.entityTitle} review`,
    message: (ctx) => `The review for version ${ctx.version} is ${ctx.daysOverdue} days overdue.`,
    defaultPriority: 'urgent',
  },
  'mention': {
    title: (ctx) => `${ctx.senderName} mentioned you`,
    message: (ctx) => `You were mentioned in ${ctx.entityTitle}.`,
    defaultPriority: 'normal',
  },
  'comment': {
    title: (ctx) => `New comment on ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.senderName}: "${ctx.commentPreview}"`,
    defaultPriority: 'low',
  },
  'collaboration-invite': {
    title: (ctx) => `Collaboration invite: ${ctx.entityTitle}`,
    message: (ctx) => `${ctx.senderName} invited you to collaborate on ${ctx.entityTitle}.`,
    defaultPriority: 'high',
  },
};

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private listeners: Set<(notification: Notification) => void> = new Set();
  private idCounter = 0;

  // ---------------------------------------------------------------------------
  // Create Notification
  // ---------------------------------------------------------------------------

  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const template = NOTIFICATION_TEMPLATES[params.type];
    
    // Build context for template
    const context = {
      entityTitle: params.entityTitle || 'Document',
      senderName: params.senderName || 'Someone',
      ...params,
    };

    // Get user preferences
    const prefs = this.getPreferences(params.recipientId);
    const channel = this.getChannelForType(params.type, prefs);

    const notification: Notification = {
      id: this.generateId(),
      type: params.type,
      title: params.customTitle || template.title(context),
      message: params.customMessage || template.message(context),
      priority: params.priority || template.defaultPriority,
      channel,
      recipientId: params.recipientId,
      recipientEmail: params.recipientEmail,
      senderId: params.senderId,
      senderName: params.senderName,
      entityType: params.entityType,
      entityId: params.entityId,
      entityTitle: params.entityTitle,
      actionUrl: params.actionUrl,
      isRead: false,
      isEmailSent: false,
      createdAt: Date.now(),
    };

    // Store notification
    this.notifications.set(notification.id, notification);

    // Send email if needed
    if (channel === 'email' || channel === 'both') {
      await this.sendEmail(notification);
    }

    // Notify listeners (for real-time in-app)
    this.notifyListeners(notification);

    return notification;
  }

  // ---------------------------------------------------------------------------
  // Batch Notifications (for approval workflow)
  // ---------------------------------------------------------------------------

  async notifyApprovalSubmitted(params: {
    templateId: string;
    templateName: string;
    versionId: string;
    version: string;
    submitterId: string;
    submitterName: string;
    reviewerIds: string[];
    reviewerEmails?: Record<string, string>;
  }): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const reviewerId of Array.from(params.reviewerIds)) {
      const notif = await this.createNotification({
        type: 'approval-submitted',
        recipientId: reviewerId,
        recipientEmail: params.reviewerEmails?.[reviewerId],
        senderId: params.submitterId,
        senderName: params.submitterName,
        entityType: 'approval',
        entityId: params.versionId,
        entityTitle: params.templateName,
        actionUrl: `/templates/${params.templateId}/versions/${params.versionId}/review`,
      });
      notifications.push(notif);
    }

    return notifications;
  }

  async notifyApprovalDecision(params: {
    decision: 'approved' | 'rejected' | 'changes-requested';
    templateId: string;
    templateName: string;
    versionId: string;
    version: string;
    reviewerId: string;
    reviewerName: string;
    submitterId: string;
    submitterEmail?: string;
    comments?: string;
  }): Promise<Notification> {
    const typeMap = {
      'approved': 'approval-approved' as const,
      'rejected': 'approval-rejected' as const,
      'changes-requested': 'approval-changes-requested' as const,
    };

    return this.createNotification({
      type: typeMap[params.decision],
      recipientId: params.submitterId,
      recipientEmail: params.submitterEmail,
      senderId: params.reviewerId,
      senderName: params.reviewerName,
      entityType: 'approval',
      entityId: params.versionId,
      entityTitle: params.templateName,
      actionUrl: `/templates/${params.templateId}/versions/${params.versionId}`,
      customMessage: params.comments 
        ? `${params.reviewerName} ${params.decision} version ${params.version}. Comments: "${params.comments}"`
        : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Query Notifications
  // ---------------------------------------------------------------------------

  getNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    types?: NotificationType[];
  }): Notification[] {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId);

    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    if (options?.types) {
      notifications = notifications.filter(n => options.types!.includes(n.type));
    }

    // Sort by creation time, newest first
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId && !n.isRead)
      .length;
  }

  // ---------------------------------------------------------------------------
  // Update Notifications
  // ---------------------------------------------------------------------------

  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      notification.readAt = Date.now();
      return true;
    }
    return false;
  }

  markAllAsRead(userId: string): number {
    let count = 0;
    for (const notification of Array.from(Array.from(Array.from(Array.from(this.notifications.values()))))) {
      if (notification.recipientId === userId && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = Date.now();
        count++;
      }
    }
    return count;
  }

  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || {
      userId,
      approvalSubmitted: 'both',
      approvalAssigned: 'both',
      approvalDecision: 'both',
      approvalReminder: 'email',
      mentions: 'both',
      comments: 'in-app',
      emailEnabled: true,
      emailDigest: 'immediate',
    };
  }

  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): NotificationPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...prefs, userId };
    this.preferences.set(userId, updated);
    return updated;
  }

  private getChannelForType(type: NotificationType, prefs: NotificationPreferences): NotificationChannel {
    if (!prefs.emailEnabled) return 'in-app';

    switch (type) {
      case 'approval-submitted':
        return prefs.approvalSubmitted;
      case 'approval-assigned':
        return prefs.approvalAssigned;
      case 'approval-approved':
      case 'approval-rejected':
      case 'approval-changes-requested':
        return prefs.approvalDecision;
      case 'approval-reminder':
      case 'approval-overdue':
        return prefs.approvalReminder;
      case 'mention':
        return prefs.mentions;
      case 'comment':
        return prefs.comments;
      default:
        return 'in-app';
    }
  }

  // ---------------------------------------------------------------------------
  // Email Integration
  // ---------------------------------------------------------------------------

  private async sendEmail(notification: Notification): Promise<boolean> {
    if (!notification.recipientEmail) {
      /* No email for recipient */
      return false;
    }

    // In production, integrate with email service (SendGrid, SES, etc.)
    // For now, just simulate email send
    /* Email simulated: to=${notification.recipientEmail}, subject=${notification.title} */

    notification.isEmailSent = true;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Real-time Listeners
  // ---------------------------------------------------------------------------

  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(notification: Notification): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(notification);
      } catch (e) {
        /* Notification listener error */
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `notif-${Date.now()}-${++this.idCounter}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const service = getNotificationService();

  // Load initial notifications
  useEffect(() => {
    setNotifications(service.getNotifications(userId));
    setUnreadCount(service.getUnreadCount(userId));
  }, [userId, service]);

  // Subscribe to new notifications
  useEffect(() => {
    const unsubscribe = service.subscribe((notification) => {
      if (notification.recipientId === userId) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });
    return unsubscribe;
  }, [userId, service]);

  const markAsRead = useCallback((notificationId: string) => {
    if (service.markAsRead(notificationId)) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [service]);

  const markAllAsRead = useCallback(() => {
    const count = service.markAllAsRead(userId);
    if (count > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  }, [userId, service]);

  const deleteNotification = useCallback((notificationId: string) => {
    if (service.deleteNotification(notificationId)) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  }, [service]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export default NotificationService;
