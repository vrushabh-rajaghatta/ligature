

/**
 * Cross-Module Event Notifications Hook
 * 
 * Subscribes to cross-module events and shows toast notifications
 * for important events. Configurable by module and event type.
 * 
 * @module hooks/useCrossModuleEventNotifications
 * @version 0.27.47
 */

import React, { useEffect, useRef } from 'react';
import { useCrossModuleStore } from '@/store/useCrossModuleStore';
import { useToastStore } from '@/components/ui/Toast';
import type { CrossModuleEventType, ModuleType } from '@/domains/cross-module/contracts';

// Event types that should trigger toast notifications
const NOTIFY_EVENT_TYPES = new Set<CrossModuleEventType>([
  'entity-created',
  'entity-status-changed',
  'workflow-completed',
  'workflow-failed',
  'deviation-detected',
  'threshold-exceeded',
  'deadline-missed',
  'approval-granted',
  'signature-applied',
]);

// Map event types to toast types
const EVENT_TO_TOAST: Record<CrossModuleEventType, 'success' | 'error' | 'warning' | 'info'> = {
  'entity-created': 'info',
  'entity-updated': 'info',
  'entity-deleted': 'info',
  'entity-status-changed': 'info',
  'workflow-started': 'info',
  'workflow-step-completed': 'success',
  'workflow-completed': 'success',
  'workflow-failed': 'error',
  'data-available': 'success',
  'data-locked': 'warning',
  'data-released': 'success',
  'signature-applied': 'success',
  'approval-granted': 'success',
  'deviation-detected': 'warning',
  'deadline-approaching': 'warning',
  'deadline-missed': 'error',
  'threshold-exceeded': 'error',
  'document-archived': 'info',
  'review-cycle-initiated': 'info',
  'capa-closed': 'success',
  'deviation-requires-capa': 'warning',
  'critical-deviation': 'error',
  'signal-validated': 'success',
  'tmf-artifact-approved': 'success',
  'tmf-qc-failed': 'error',
  'tmf-artifact-auto-linked': 'info',
  'tmf-gap-status-changed': 'info',
  'tmf-gap-resolved': 'success',
  'tmf-gap-identified': 'warning',
  'inspection-report-generated': 'info',
  'safety-signal-confirmed': 'error',
  'safety-signal-detected': 'warning',
  'icsr-submitted': 'success',
  'aggregate-report-due': 'warning',
  'capa-created': 'info',
  'demo-ai-generate-section': 'info',
  'demo-glp-cascade': 'info',
};

// Human-readable module names
const MODULE_NAMES: Record<ModuleType, string> = {
  'authoring': 'Document Authoring',
  'haq': 'HAQ Intelligence',
  'submissions': 'Submissions Hub',
  'regulatory': 'Regulatory Affairs',
  'labeling': 'Labeling',
  'ctms': 'Clinical Trials',
  'tmf': 'Trial Master File',
  'edc': 'EDC',
  'safety': 'Pharmacovigilance',
  'quality': 'Quality Management',
  'psmf': 'PSMF',
  'eln': 'Electronic Lab Notebook',
  'glp': 'GLP Studies',
  'sample-management': 'Sample Management',
  'idmp': 'IDMP',
  'master-data': 'Master Data',
  'study-intel': 'Study Intelligence',
  'archives': 'Regulatory Archives',
  'document-control': 'Document Control',
  'qms': 'Quality Management',
  'audit': 'Audit Trail',
  'executive': 'Executive Dashboard',
};

interface NotificationOptions {
  /** Only show notifications for these modules (empty = all) */
  modules?: ModuleType[];
  /** Only show notifications for these event types (empty = defaults) */
  eventTypes?: CrossModuleEventType[];
  /** Whether notifications are enabled */
  enabled?: boolean;
}

/**
 * Hook that subscribes to cross-module events and shows toast notifications
 */
export function useCrossModuleEventNotifications(options: NotificationOptions = {}) {
  const { modules = [], eventTypes = [], enabled = true } = options;
  
  const addToast = useToastStore((s) => s.addToast);
  const recentEvents = useCrossModuleStore((s) => s.recentEvents);
  const lastProcessedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!enabled || recentEvents.length === 0) return;
    
    // Get the most recent event
    const latestEvent = recentEvents[0];
    
    // Skip if we've already processed this event
    if (lastProcessedRef.current === latestEvent.id) return;
    lastProcessedRef.current = latestEvent.id;
    
    // Check if we should notify for this event type
    const notifyTypes = eventTypes.length > 0 
      ? new Set(eventTypes) 
      : NOTIFY_EVENT_TYPES;
    
    if (!notifyTypes.has(latestEvent.eventType)) return;
    
    // Check if we should notify for this module
    if (modules.length > 0 && !modules.includes(latestEvent.sourceModule)) return;
    
    // Determine toast type
    const toastType = EVENT_TO_TOAST[latestEvent.eventType] || 'info';
    
    // Build notification message
    const moduleName = MODULE_NAMES[latestEvent.sourceModule] || latestEvent.sourceModule;
    const message = `[${moduleName}] ${latestEvent.description}`;
    
    // Show toast
    addToast({
      type: toastType,
      message,
      duration: toastType === 'error' ? 6000 : toastType === 'warning' ? 5000 : 4000,
    });
  }, [recentEvents, enabled, modules, eventTypes, addToast]);
}

/**
 * Provider component that enables global event notifications
 * Add this to your app layout to enable notifications everywhere
 */
export function CrossModuleEventNotificationProvider({ 
  children,
  options = {},
}: { 
  children: React.ReactNode;
  options?: NotificationOptions;
}) {
  useCrossModuleEventNotifications(options);
  return children;
}
