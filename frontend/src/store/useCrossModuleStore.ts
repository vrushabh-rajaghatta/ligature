


import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// IMPORTS FROM CANONICAL SOURCE
// =============================================================================
// contracts.ts is the SINGLE SOURCE OF TRUTH for cross-module types.
// This store implements the behavior; contracts.ts defines the shapes.

import {
  type ModuleType,
  type ModuleCategory,
  type ModuleInfo,
  type HandoffType,
  type HandoffStatus,
  type HandoffPriority,
  type PendingHandoff,
  type CreateHandoffInput,
  type TypedHandoffInput,
  type HandoffPayload,
  type ModuleNotification,
  type CreateNotificationInput,
  type NotificationType,
  type NavigationContext,
  type CTDSectionInfo,
  // Cross-module events
  type CrossModuleEventType,
  type CrossModuleEvent,
  type EventSubscription,
  // Entity references
  type SharedEntityType,
  type EntityReference,
  type EntityLink,
  // Data flow pipelines
  type DataFlowPipeline,
  type DataFlowStep,
  type DataTransformation,
  type DataFlowCondition,
  type DataFlowTrigger,
  // Constants
  MODULE_LABELS,
  MODULE_SHORT_LABELS,
  MODULE_CATEGORIES,
  CATEGORY_LABELS,
  MODULE_HANDOFF_PATHS,
  CTD_SECTION_MAPPING,
  PREDEFINED_PIPELINES,
  // Functions
  getCTDSection,
  isModuleType,
  isHandoffType,
  isHandoffAllowed,
  getModulesByCategory,
  getInboundModules,
  getOutboundModules,
  isValidEntityReference,
  createEntityReference,
} from '@/domains/cross-module/contracts';

// =============================================================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================
// Consumers currently import types from this file.
// These re-exports allow gradual migration to '@/domains/cross-module'.

export type { 
  // Core module types
  ModuleType, 
  ModuleCategory,
  ModuleInfo,
  // Handoff types
  HandoffType, 
  HandoffStatus,
  HandoffPriority,
  PendingHandoff, 
  CreateHandoffInput,
  TypedHandoffInput,
  HandoffPayload,
  // Notification types
  ModuleNotification,
  CreateNotificationInput,
  NotificationType,
  // Navigation
  NavigationContext,
  CTDSectionInfo,
  // Events
  CrossModuleEventType,
  CrossModuleEvent,
  EventSubscription,
  // Entity references
  SharedEntityType,
  EntityReference,
  EntityLink,
  // Data flow
  DataFlowPipeline,
  DataFlowStep,
  DataTransformation,
  DataFlowCondition,
  DataFlowTrigger,
};

// Re-export constants and functions
export {
  MODULE_LABELS,
  MODULE_SHORT_LABELS,
  MODULE_CATEGORIES,
  CATEGORY_LABELS,
  MODULE_HANDOFF_PATHS,
  CTD_SECTION_MAPPING,
  PREDEFINED_PIPELINES,
  getCTDSection,
  isModuleType,
  isHandoffType,
  isHandoffAllowed,
  getModulesByCategory,
  getInboundModules,
  getOutboundModules,
  isValidEntityReference,
  createEntityReference,
};

/** @deprecated Import from '@/domains/cross-module/contracts' instead */
export const ctdSectionMapping = CTD_SECTION_MAPPING;

// =============================================================================
// STORE STATE INTERFACE
// =============================================================================

interface CrossModuleState {
  // Core State
  pendingHandoffs: PendingHandoff[];
  notifications: ModuleNotification[];
  navigationContext: NavigationContext | null;
  
  // Events State (v0.27.45 - Enhanced cross-module data flow)
  recentEvents: CrossModuleEvent[];
  eventSubscriptions: EventSubscription[];
  
  // Entity Links State
  entityLinks: EntityLink[];
  
  // Data Flow State
  activePipelines: DataFlowPipeline[];
  pipelineHistory: DataFlowPipeline[]; // v0.27.48: Completed pipeline audit trail
  
  // Handoff actions
  createHandoff: (handoff: CreateHandoffInput) => string;
  acceptHandoff: (handoffId: string, completedBy?: string) => void;
  rejectHandoff: (handoffId: string, reason?: string) => void;
  completeHandoff: (handoffId: string, completedBy: string) => void;
  getHandoffsForModule: (module: ModuleType) => PendingHandoff[];
  getHandoffsByStatus: (status: HandoffStatus) => PendingHandoff[];
  getPendingHandoffCount: (module: ModuleType) => number;
  
  // Notification actions
  addNotification: (notification: CreateNotificationInput) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (module: ModuleType) => void;
  getUnreadCount: (module: ModuleType) => number;
  
  // Navigation actions
  setNavigationContext: (context: NavigationContext | null) => void;
  clearNavigationContext: () => void;
  
  // Event actions (v0.27.45)
  emitEvent: (event: Omit<CrossModuleEvent, 'id' | 'timestamp'>) => void;
  subscribeToEvents: (subscription: Omit<EventSubscription, 'id' | 'createdAt'>) => string;
  unsubscribeFromEvents: (subscriptionId: string) => void;
  getEventsForModule: (module: ModuleType, limit?: number) => CrossModuleEvent[];
  
  // Entity link actions (v0.27.45)
  createEntityLink: (link: Omit<EntityLink, 'id' | 'createdAt'>) => string;
  removeEntityLink: (linkId: string) => void;
  getLinksForEntity: (entityType: SharedEntityType, entityId: string) => EntityLink[];
  
  // Data flow actions (v0.27.45, v0.27.48)
  startPipeline: (pipelineId: string) => void;
  stopPipeline: (pipelineId: string) => void;
  completePipeline: (pipelineId: string, durationMs?: number) => void; // v0.27.48
  getActivePipelines: () => DataFlowPipeline[];
  getPipelineHistory: (limit?: number) => DataFlowPipeline[]; // v0.27.48
  
  // Helpers
  suggestCTDSection: (contentType: string) => CTDSectionInfo | null;
  canHandoff: (source: ModuleType, target: ModuleType) => boolean;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useCrossModuleStore = create<CrossModuleState>((set, get) => ({
  // Core State
  pendingHandoffs: [],
  notifications: [],
  navigationContext: null,
  
  // Events State (v0.27.45)
  recentEvents: [],
  eventSubscriptions: [],
  
  // Entity Links State
  entityLinks: [],
  
  // Data Flow State
  activePipelines: [],
  pipelineHistory: [], // v0.27.48: Completed pipeline audit trail
  
  // =========================================================================
  // HANDOFF ACTIONS
  // =========================================================================
  
  createHandoff: (handoff) => {
    const id = `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newHandoff: PendingHandoff = {
      ...handoff,
      id,
      priority: handoff.priority ?? 'normal', // Default priority
      createdAt: new Date().toISOString(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
    
    set(state => ({
      pendingHandoffs: [...state.pendingHandoffs, newHandoff],
    }));
    
    // Emit event for cross-module tracking
    get().emitEvent({
      eventType: 'workflow-started',
      sourceModule: handoff.sourceModule,
      targetModules: [handoff.targetModule],
      entityType: 'handoff',
      entityId: id,
      description: `Handoff created: ${handoff.sourceTitle}`,
      payload: { handoffType: handoff.type, priority: newHandoff.priority },
    });
    
    // Add notification to target module
    get().addNotification({
      module: handoff.targetModule,
      type: 'handoff',
      title: `New ${handoff.type.replace(/-/g, ' ')}`,
      message: `"${handoff.sourceTitle}" is ready for ${MODULE_LABELS[handoff.targetModule]}`,
      sourceModule: handoff.sourceModule,
    });
    
    return id;
  },
  
  acceptHandoff: (handoffId, completedBy) => {
    set(state => ({
      pendingHandoffs: state.pendingHandoffs.map(h =>
        h.id === handoffId ? { 
          ...h, 
          status: 'accepted' as const,
          completedBy,
          completedAt: new Date().toISOString(),
        } : h
      ),
    }));
  },
  
  rejectHandoff: (handoffId, reason) => {
    set(state => ({
      pendingHandoffs: state.pendingHandoffs.map(h =>
        h.id === handoffId ? { 
          ...h, 
          status: 'rejected' as const,
          rejectionReason: reason,
        } : h
      ),
    }));
  },
  
  completeHandoff: (handoffId, completedBy) => {
    const handoff = get().pendingHandoffs.find(h => h.id === handoffId);
    
    set(state => ({
      pendingHandoffs: state.pendingHandoffs.map(h =>
        h.id === handoffId ? { 
          ...h, 
          status: 'completed' as const,
          completedBy,
          completedAt: new Date().toISOString(),
        } : h
      ),
    }));
    
    // Emit completion event
    if (handoff) {
      get().emitEvent({
        eventType: 'workflow-completed',
        sourceModule: handoff.targetModule,
        targetModules: [handoff.sourceModule],
        entityType: 'handoff',
        entityId: handoffId,
        description: `Handoff completed: ${handoff.sourceTitle}`,
        payload: { handoffType: handoff.type, completedBy },
      });
    }
  },
  
  getHandoffsForModule: (module) => {
    return get().pendingHandoffs.filter(
      h => h.targetModule === module && h.status === 'pending'
    );
  },
  
  getHandoffsByStatus: (status) => {
    return get().pendingHandoffs.filter(h => h.status === status);
  },
  
  getPendingHandoffCount: (module) => {
    return get().getHandoffsForModule(module).length;
  },
  
  // =========================================================================
  // NOTIFICATION ACTIONS
  // =========================================================================
  
  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set(state => ({
      notifications: [
        {
          ...notification,
          id,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ].slice(0, 100), // Keep last 100 notifications
    }));
  },
  
  markNotificationRead: (notificationId) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  },
  
  markAllNotificationsRead: (module) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.module === module ? { ...n, read: true } : n
      ),
    }));
  },
  
  getUnreadCount: (module) => {
    return get().notifications.filter(n => n.module === module && !n.read).length;
  },
  
  // =========================================================================
  // NAVIGATION ACTIONS
  // =========================================================================
  
  setNavigationContext: (context) => {
    set({ navigationContext: context });
  },
  
  clearNavigationContext: () => {
    set({ navigationContext: null });
  },
  
  // =========================================================================
  // EVENT ACTIONS (v0.27.45)
  // =========================================================================
  
  emitEvent: (eventData) => {
    const event: CrossModuleEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    set(state => ({
      recentEvents: [event, ...state.recentEvents].slice(0, 500), // Keep last 500 events
    }));
  },
  
  subscribeToEvents: (subscription) => {
    const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSubscription: EventSubscription = {
      ...subscription,
      id,
      createdAt: new Date().toISOString(),
    };
    
    set(state => ({
      eventSubscriptions: [...state.eventSubscriptions, newSubscription],
    }));
    
    return id;
  },
  
  unsubscribeFromEvents: (subscriptionId) => {
    set(state => ({
      eventSubscriptions: state.eventSubscriptions.filter(s => s.id !== subscriptionId),
    }));
  },
  
  getEventsForModule: (module, limit = 50) => {
    return get().recentEvents
      .filter(e => 
        e.sourceModule === module || 
        e.targetModules.length === 0 || 
        e.targetModules.includes(module)
      )
      .slice(0, limit);
  },
  
  // =========================================================================
  // ENTITY LINK ACTIONS (v0.27.45)
  // =========================================================================
  
  createEntityLink: (linkData) => {
    const id = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const link: EntityLink = {
      ...linkData,
      id,
      createdAt: new Date().toISOString(),
    };
    
    set(state => ({
      entityLinks: [...state.entityLinks, link],
    }));
    
    // Emit link creation event
    get().emitEvent({
      eventType: 'entity-created',
      sourceModule: linkData.sourceRef.sourceModule,
      targetModules: [linkData.targetRef.sourceModule],
      entityType: 'entity-link',
      entityId: id,
      description: `Link created: ${linkData.sourceRef.displayName} → ${linkData.targetRef.displayName}`,
      payload: { linkType: linkData.linkType },
    });
    
    return id;
  },
  
  removeEntityLink: (linkId) => {
    set(state => ({
      entityLinks: state.entityLinks.filter(l => l.id !== linkId),
    }));
  },
  
  getLinksForEntity: (entityType, entityId) => {
    return get().entityLinks.filter(l =>
      (l.sourceRef.entityType === entityType && l.sourceRef.entityId === entityId) ||
      (l.targetRef.entityType === entityType && l.targetRef.entityId === entityId)
    );
  },
  
  // =========================================================================
  // DATA FLOW PIPELINE ACTIONS (v0.27.45)
  // =========================================================================
  
  startPipeline: (pipelineId) => {
    const predefined = PREDEFINED_PIPELINES[pipelineId];
    if (!predefined) return;
    
    const pipeline: DataFlowPipeline = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: predefined.name || pipelineId,
      description: predefined.description || '',
      steps: predefined.steps || [],
      trigger: { type: 'manual' },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      activePipelines: [...state.activePipelines, pipeline],
    }));
    
    // Emit pipeline start event
    get().emitEvent({
      eventType: 'workflow-started',
      sourceModule: predefined.steps?.[0]?.sourceModule || 'authoring',
      targetModules: [],
      entityType: 'pipeline',
      entityId: pipeline.id,
      description: `Pipeline started: ${pipeline.name}`,
      payload: { pipelineId, stepCount: pipeline.steps.length },
    });
  },
  
  stopPipeline: (pipelineId) => {
    set(state => ({
      activePipelines: state.activePipelines.map(p =>
        p.id === pipelineId ? { ...p, active: false, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },
  
  // v0.27.48: Move completed pipeline to history with audit info
  completePipeline: (pipelineId, durationMs) => {
    const pipeline = get().activePipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    const completedPipeline: DataFlowPipeline = {
      ...pipeline,
      active: false,
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      // Remove from active
      activePipelines: state.activePipelines.filter(p => p.id !== pipelineId),
      // Add to history (keep max 50 entries)
      pipelineHistory: [completedPipeline, ...state.pipelineHistory].slice(0, 50),
    }));
    
    // Emit completion event
    get().emitEvent({
      eventType: 'workflow-completed',
      sourceModule: pipeline.steps[0]?.sourceModule || 'regulatory',
      targetModules: ['regulatory'],
      entityType: 'pipeline',
      entityId: pipelineId,
      description: `Pipeline "${pipeline.name}" completed${durationMs ? ` in ${(durationMs / 1000).toFixed(1)}s` : ''}`,
      payload: { 
        pipelineName: pipeline.name, 
        stepCount: pipeline.steps.length,
        durationMs,
      },
    });
  },
  
  getActivePipelines: () => {
    return get().activePipelines.filter(p => p.active);
  },
  
  // v0.27.48: Get pipeline execution history
  getPipelineHistory: (limit = 20) => {
    return get().pipelineHistory.slice(0, limit);
  },
  
  // =========================================================================
  // HELPERS
  // =========================================================================
  
  suggestCTDSection: (contentType) => {
    return getCTDSection(contentType);
  },
  
  canHandoff: (source, target) => {
    return isHandoffAllowed(source, target);
  },
}));

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/** Get pending handoffs for a specific module */
export const usePendingHandoffs = (module: ModuleType) => {
  return useCrossModuleStore(useShallow(state => state.getHandoffsForModule(module)));
};

/** Get notifications for a specific module */
export const useModuleNotifications = (module: ModuleType) => {
  return useCrossModuleStore(useShallow(state => 
    state.notifications.filter(n => n.module === module)
  ));
};

/** Get unread notification count for a module */
export const useUnreadNotificationCount = (module: ModuleType) => {
  return useCrossModuleStore(state => state.getUnreadCount(module));
};

/** Get recent events for a module (v0.27.45) */
export const useModuleEvents = (module: ModuleType, limit = 20) => {
  return useCrossModuleStore(useShallow(state => state.getEventsForModule(module, limit)));
};

/** Get entity links for a specific entity (v0.27.45) */
export const useEntityLinks = (entityType: SharedEntityType, entityId: string) => {
  return useCrossModuleStore(useShallow(state => state.getLinksForEntity(entityType, entityId)));
};

/** Get active pipelines (v0.27.45) */
export const useActivePipelines = () => {
  return useCrossModuleStore(useShallow(state => state.getActivePipelines()));
};

/** Check if handoff is allowed between modules */
export const useCanHandoff = (source: ModuleType, target: ModuleType) => {
  return useCrossModuleStore(state => state.canHandoff(source, target));
};

/** Get handoffs by status */
export const useHandoffsByStatus = (status: HandoffStatus) => {
  return useCrossModuleStore(useShallow(state => state.getHandoffsByStatus(status)));
};
