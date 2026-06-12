


import { create } from 'zustand';

// ============================================================================
// CROSS-MODULE EVENT STORE - v158
// Enables real-time data flow between platform modules
// Preclinical → Safety, Labeling → Submissions, Clinical → Regulatory
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type CrossModuleEventType =
  // Preclinical → Safety flow
  | 'preclinical-study-completed'
  | 'preclinical-finding-reported'
  | 'glp-study-finalized'
  
  // Clinical → Safety flow
  | 'clinical-ae-reported'
  | 'clinical-sae-escalated'
  | 'dsmb-safety-alert'
  
  // Safety → Regulatory flow
  | 'safety-signal-confirmed'
  | 'safety-update-required'
  | 'label-change-recommended'
  
  // Labeling → Submissions flow
  | 'labeling-approved'
  | 'labeling-update-finalized'
  | 'packaging-artwork-approved'
  
  // Authoring → Submissions flow
  | 'document-finalized'
  | 'csr-completed'
  | 'ctd-section-ready'
  
  // QMS → Multiple flows
  | 'deviation-reported'
  | 'capa-initiated'
  | 'change-control-approved'
  
  // Supply Chain flows (v0.4.0)
  | 'supply-risk-detected'
  | 'supply-decision-required'
  | 'suppliability-status-changed'
  
  // Publishing/eCTD flows (v0.33)
  | 'ectd-validation-complete'
  | 'evidence-package-generated'
  
  // QMS/CAPA flows (v0.33)
  | 'capa-created'
  
  // Demo/Guided Scenario flows (v0.42.50)
  | 'demo-ai-generate-section'
  // GLP study finalization cascade (v0.57.0)
  | 'demo-glp-cascade';

export type ModuleId = 
  | 'research' 
  | 'clinical' 
  | 'safety'
  | 'psmf'
  | 'glp'
  | 'regulatory' 
  | 'submissions' 
  | 'labeling' 
  | 'authoring'
  | 'qms'
  | 'cmc'
  | 'haq'           // v0.15.33: Added for HAQ workflow scenarios
  | 'tmf'           // v0.15.33: Added for document scenarios
  | 'supply-chain'
  | 'nonclinical'
  | 'ctms'
  | 'archives'
  | 'stability'
  | 'biostats';

export interface CrossModuleEvent {
  id: string;
  type: CrossModuleEventType;
  sourceModule: ModuleId;
  targetModules: ModuleId[];
  payload: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy: ModuleId[];
  cascadeActions: CascadeAction[];
  metadata?: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    automated: boolean;
    requiresReview: boolean;
    dueDate?: string;
    correlationId?: string;
  };
}

export interface CascadeAction {
  id: string;
  eventId: string;
  targetModule: ModuleId;
  actionType: 'create' | 'update' | 'notify' | 'link';
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  entityType: string;
  entityId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PendingAction {
  moduleId: ModuleId;
  eventId: string;
  cascadeAction: CascadeAction;
}

// ============================================================================
// EVENT TEMPLATES - Define what happens when events fire
// ============================================================================

export const EVENT_CASCADE_TEMPLATES: Record<CrossModuleEventType, {
  targetModules: ModuleId[];
  cascadeActions: Array<{
    targetModule: ModuleId;
    actionType: CascadeAction['actionType'];
    entityType: string;
    description: string;
    automated: boolean;
  }>;
}> = {
  // Preclinical study completion → Safety case shell + Submission update
  'preclinical-study-completed': {
    targetModules: ['safety', 'submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'safety-case-shell',
        description: 'Create safety surveillance case shell for preclinical findings',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'notify',
        entityType: 'module-4-update',
        description: 'Notify Module 4 section requires update with final study report',
        automated: false,
      },
      {
        targetModule: 'regulatory',
        actionType: 'update',
        entityType: 'ind-status',
        description: 'Update IND section status with completed study',
        automated: true,
      },
    ],
  },
  
  'preclinical-finding-reported': {
    targetModules: ['safety'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'signal-evaluation',
        description: 'Initiate signal evaluation for preclinical finding',
        automated: true,
      },
    ],
  },
  
  'glp-study-finalized': {
    targetModules: ['submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'ectd-document',
        description: 'Link GLP study report to eCTD Module 4',
        automated: false,
      },
      {
        targetModule: 'regulatory',
        actionType: 'update',
        entityType: 'ind-readiness',
        description: 'Update IND readiness tracker with GLP study completion',
        automated: true,
      },
    ],
  },
  
  // Clinical → Safety
  'clinical-ae-reported': {
    targetModules: ['safety'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'icsr-case',
        description: 'Create ICSR case from clinical AE report',
        automated: true,
      },
    ],
  },
  
  'clinical-sae-escalated': {
    targetModules: ['safety', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'expedited-report',
        description: 'Create expedited safety report (15-day)',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'safety-notification',
        description: 'Notify regulatory of potential expedited reporting',
        automated: true,
      },
    ],
  },
  
  'dsmb-safety-alert': {
    targetModules: ['safety', 'clinical', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'urgent-signal',
        description: 'Create urgent safety signal from DSMB alert',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'dsmb-communication',
        description: 'Prepare DSMB communication for health authorities',
        automated: false,
      },
    ],
  },
  
  // Safety → Regulatory
  'safety-signal-confirmed': {
    targetModules: ['regulatory', 'labeling', 'submissions'],
    cascadeActions: [
      {
        targetModule: 'regulatory',
        actionType: 'create',
        entityType: 'safety-update',
        description: 'Create safety update submission package',
        automated: false,
      },
      {
        targetModule: 'labeling',
        actionType: 'notify',
        entityType: 'label-review',
        description: 'Initiate label review for confirmed signal',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'update',
        entityType: 'module-2.7.4',
        description: 'Flag Summary of Clinical Safety for update',
        automated: true,
      },
    ],
  },
  
  'safety-update-required': {
    targetModules: ['submissions', 'authoring'],
    cascadeActions: [
      {
        targetModule: 'authoring',
        actionType: 'create',
        entityType: 'safety-section-draft',
        description: 'Create draft safety section update',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'notify',
        entityType: 'sequence-planning',
        description: 'Add safety update to submission planning queue',
        automated: true,
      },
    ],
  },
  
  'label-change-recommended': {
    targetModules: ['labeling', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'labeling',
        actionType: 'create',
        entityType: 'label-revision',
        description: 'Create label revision draft from safety recommendation',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'label-supplement',
        description: 'Plan CBE-0 or CBE-30 supplement submission',
        automated: false,
      },
    ],
  },
  
  // Labeling → Submissions
  'labeling-approved': {
    targetModules: ['submissions'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'update',
        entityType: 'module-1.14',
        description: 'Update Module 1.14 with approved labeling',
        automated: true,
      },
    ],
  },
  
  'labeling-update-finalized': {
    targetModules: ['submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'ectd-document',
        description: 'Link finalized label to eCTD Module 1',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'submission-ready',
        description: 'Label ready for regulatory submission',
        automated: true,
      },
    ],
  },
  
  'packaging-artwork-approved': {
    targetModules: ['submissions', 'cmc'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'packaging-document',
        description: 'Link approved artwork to Module 3.2.P.7',
        automated: true,
      },
      {
        targetModule: 'cmc',
        actionType: 'update',
        entityType: 'packaging-spec',
        description: 'Update packaging specification with approved artwork',
        automated: true,
      },
    ],
  },
  
  // Authoring → Submissions
  'document-finalized': {
    targetModules: ['submissions'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'ectd-document',
        description: 'Document ready for eCTD assignment',
        automated: false,
      },
    ],
  },
  
  'csr-completed': {
    targetModules: ['submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'module-5-document',
        description: 'Link CSR to Module 5 study reports',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'update',
        entityType: 'submission-readiness',
        description: 'Update submission readiness with completed CSR',
        automated: true,
      },
    ],
  },
  
  'ctd-section-ready': {
    targetModules: ['submissions'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'notify',
        entityType: 'document-ready',
        description: 'CTD section ready for eCTD build',
        automated: true,
      },
    ],
  },
  
  // QMS → Multiple
  'deviation-reported': {
    targetModules: ['cmc', 'regulatory', 'supply-chain'],
    cascadeActions: [
      {
        targetModule: 'cmc',
        actionType: 'notify',
        entityType: 'quality-alert',
        description: 'Evaluate deviation impact on batch release',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'field-alert-assessment',
        description: 'Assess need for field alert notification',
        automated: false,
      },
      {
        targetModule: 'supply-chain',
        actionType: 'notify',
        entityType: 'supply-risk-assessment',
        description: 'Evaluate supply chain impact of quality deviation',
        automated: true,
      },
    ],
  },
  
  'capa-initiated': {
    targetModules: ['cmc', 'qms'],
    cascadeActions: [
      {
        targetModule: 'cmc',
        actionType: 'link',
        entityType: 'change-control',
        description: 'Link CAPA to affected manufacturing processes',
        automated: true,
      },
    ],
  },
  
  'change-control-approved': {
    targetModules: ['submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'notify',
        entityType: 'supplement-planning',
        description: 'Evaluate need for prior approval supplement',
        automated: false,
      },
      {
        targetModule: 'regulatory',
        actionType: 'update',
        entityType: 'change-registry',
        description: 'Update regulatory change registry',
        automated: true,
      },
    ],
  },
  
  // Supply Chain events (v0.4.0)
  'supply-risk-detected': {
    targetModules: ['regulatory', 'cmc'],
    cascadeActions: [
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'shortage-assessment',
        description: 'Assess potential drug shortage notification requirements',
        automated: true,
      },
      {
        targetModule: 'cmc',
        actionType: 'notify',
        entityType: 'production-priority',
        description: 'Flag for expedited manufacturing consideration',
        automated: false,
      },
    ],
  },
  
  'supply-decision-required': {
    targetModules: ['qms', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'qms',
        actionType: 'link',
        entityType: 'supply-decision',
        description: 'Link supply decision to quality disposition workflow',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'decision-awareness',
        description: 'Regulatory awareness of pending supply decision',
        automated: true,
      },
    ],
  },
  
  'suppliability-status-changed': {
    targetModules: ['regulatory', 'clinical'],
    cascadeActions: [
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'suppliability-update',
        description: 'Update regulatory team on supply status change',
        automated: true,
      },
      {
        targetModule: 'clinical',
        actionType: 'notify',
        entityType: 'trial-supply-alert',
        description: 'Alert clinical operations of potential trial supply impact',
        automated: true,
      },
    ],
  },
  
  // Publishing/eCTD flows (v0.33)
  'ectd-validation-complete': {
    targetModules: ['submissions', 'regulatory'],
    cascadeActions: [
      {
        targetModule: 'submissions',
        actionType: 'update',
        entityType: 'submission-status',
        description: 'Update submission readiness status based on validation results',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'validation-status',
        description: 'Notify regulatory team of eCTD validation completion',
        automated: true,
      },
    ],
  },
  
  'evidence-package-generated': {
    targetModules: ['regulatory', 'submissions'],
    cascadeActions: [
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'evidence-package',
        description: 'Evidence package ready for inspector readiness review',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'evidence-documentation',
        description: 'Link evidence package to relevant submission dossier',
        automated: false,
      },
    ],
  },
  
  // QMS/CAPA flows (v0.33)
  'capa-created': {
    targetModules: ['regulatory', 'submissions'],
    cascadeActions: [
      {
        targetModule: 'regulatory',
        actionType: 'notify',
        entityType: 'capa-awareness',
        description: 'Notify regulatory team of new CAPA requiring potential submission updates',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'notify',
        entityType: 'capa-impact-assessment',
        description: 'Assess CAPA impact on pending submissions',
        automated: false,
      },
    ],
  },
  
  // Demo/Guided Scenario flows (v0.42.50)
  'demo-ai-generate-section': {
    targetModules: ['authoring'],
    cascadeActions: [
      {
        targetModule: 'authoring',
        actionType: 'notify',
        entityType: 'ai-section-generation',
        description: 'Trigger AI section generation with streaming display in authoring module',
        automated: true,
      },
    ],
  },
  // v0.57.0: GLP cascade — 6 modules, fires from demo scenario frc-4
  'demo-glp-cascade': {
    targetModules: ['safety', 'regulatory', 'authoring', 'haq', 'ctms', 'submissions'],
    cascadeActions: [
      {
        targetModule: 'safety',
        actionType: 'create',
        entityType: 'safety-case-shell',
        description: 'Safety surveillance case SC-2847-001 created — hepatotoxicity findings pre-populated from GLP study GLP-2847-13WK',
        automated: true,
      },
      {
        targetModule: 'regulatory',
        actionType: 'update',
        entityType: 'ind-nonclinical-flag',
        description: 'IND nonclinical section flagged for update — amendment request pre-drafted with GLP study references',
        automated: true,
      },
      {
        targetModule: 'authoring',
        actionType: 'create',
        entityType: 'csr-section-task',
        description: 'CSR Section 12.2 Nonclinical Summary queued for AI-assisted drafting — structured GLP data imported',
        automated: true,
      },
      {
        targetModule: 'haq',
        actionType: 'create',
        entityType: 'predicted-haq',
        description: 'Predicted FDA question drafted: hepatotoxicity monitoring commitment — 94% confidence from 847 prior interactions',
        automated: true,
      },
      {
        targetModule: 'ctms',
        actionType: 'create',
        entityType: 'protocol-amendment-shell',
        description: 'Protocol amendment LIG2847-P2-AMD-003 created — enhanced hepatic monitoring schedule pre-populated',
        automated: true,
      },
      {
        targetModule: 'submissions',
        actionType: 'link',
        entityType: 'ectd-module4-update',
        description: 'GLP study report linked to NDA Module 4 — nonclinical package readiness milestone advanced',
        automated: true,
      },
    ],
  },
};

// ============================================================================
// STORE
// ============================================================================

interface CrossModuleEventState {
  // Event history
  events: CrossModuleEvent[];
  
  // Pending actions by module
  pendingActions: Partial<Record<ModuleId, PendingAction[]>>;
  
  // Event feed (for activity display)
  eventFeed: CrossModuleEvent[];
  
  // Sync state
  isLoading: boolean;
  lastSynced: string | null;
  syncError: string | null;
  
  // Async API actions
  fetchEvents: (moduleId?: ModuleId, limit?: number) => Promise<void>;
  emitEventAsync: (
    type: CrossModuleEventType,
    sourceModule: ModuleId,
    payload: Record<string, any>,
    metadata?: CrossModuleEvent['metadata']
  ) => Promise<string>;
  acknowledgeEventAsync: (eventId: string, moduleId: ModuleId) => Promise<void>;
  
  // Local actions (for immediate UI updates)
  emitEvent: (
    type: CrossModuleEventType,
    sourceModule: ModuleId,
    payload: Record<string, any>,
    metadata?: CrossModuleEvent['metadata']
  ) => string;
  
  acknowledgeEvent: (eventId: string, moduleId: ModuleId) => void;
  
  completeCascadeAction: (eventId: string, actionId: string, entityId?: string) => void;
  
  failCascadeAction: (eventId: string, actionId: string, reason?: string) => void;
  
  getPendingActionsForModule: (moduleId: ModuleId) => PendingAction[];
  
  getRecentEvents: (limit?: number) => CrossModuleEvent[];
  
  getEventsByType: (type: CrossModuleEventType) => CrossModuleEvent[];
  
  getEventsByModule: (moduleId: ModuleId) => CrossModuleEvent[];
  clearEvents: () => void;
  
  clearEventFeed: () => void;
}

export const useCrossModuleEventStore = create<CrossModuleEventState>((set, get) => ({
  events: [],
  pendingActions: {
    research: [],
    clinical: [],
    safety: [],
    psmf: [],
    glp: [],
    regulatory: [],
    submissions: [],
    labeling: [],
    authoring: [],
    qms: [],
    cmc: [],
    'supply-chain': [],
  },
  isLoading: false,
  lastSynced: null,
  syncError: null,
  eventFeed: [],
  
  // =========================================================================
  // ASYNC API ACTIONS
  // =========================================================================
  
  fetchEvents: async (moduleId, limit = 50) => {
    set({ isLoading: true, syncError: null });
    try {
      const params = new URLSearchParams();
      if (moduleId) params.set('module', moduleId);
      params.set('limit', String(limit));
      
      const response = await fetch(`/api/cross-module?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        set({
          events: result.data,
          eventFeed: result.data.slice(0, 50),
          lastSynced: new Date().toISOString(),
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('[CrossModuleEventStore] Fetch error:', error);
      set({ syncError: (error as Error).message, isLoading: false });
    }
  },
  
  emitEventAsync: async (type, sourceModule, payload, metadata) => {
    // Emit locally first (optimistic update)
    const localId = get().emitEvent(type, sourceModule, payload, metadata);
    
    try {
      const template = EVENT_CASCADE_TEMPLATES[type];
      
      const response = await fetch('/api/cross-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: type,
          sourceModule,
          targetModules: template.targetModules,
          entityType: payload.entityType || 'unknown',
          entityId: payload.entityId || localId,
          description: template.cascadeActions[0]?.description || `${type} event`,
          payload,
          priority: metadata?.priority || 'medium',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to emit event');
      
      const result = await response.json();
      
      // Update with server ID if different
      if (result.data?.id && result.data.id !== localId) {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === localId ? { ...e, id: result.data.id } : e
          ),
          eventFeed: state.eventFeed.map((e) =>
            e.id === localId ? { ...e, id: result.data.id } : e
          ),
        }));
        return result.data.id;
      }
      
      set({ lastSynced: new Date().toISOString() });
      return localId;
    } catch (error) {
      console.error('[CrossModuleEventStore] Emit error:', error);
      set({ syncError: (error as Error).message });
      return localId;
    }
  },
  
  acknowledgeEventAsync: async (eventId, moduleId) => {
    // Update locally first
    get().acknowledgeEvent(eventId, moduleId);
    
    try {
      const response = await fetch('/api/cross-module', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          eventId,
          module: moduleId,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to acknowledge event');
      set({ lastSynced: new Date().toISOString() });
    } catch (error) {
      console.error('[CrossModuleEventStore] Acknowledge error:', error);
      set({ syncError: (error as Error).message });
    }
  },

  // =========================================================================
  // LOCAL ACTIONS
  // =========================================================================
  
  emitEvent: (type, sourceModule, payload, metadata) => {
    const template = EVENT_CASCADE_TEMPLATES[type];
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Create cascade actions from template
    const cascadeActions: CascadeAction[] = template.cascadeActions.map((action, index) => ({
      id: `action-${eventId}-${index}`,
      eventId,
      targetModule: action.targetModule,
      actionType: action.actionType,
      description: action.description,
      status: action.automated ? 'in-progress' : 'pending',
      entityType: action.entityType,
      createdAt: timestamp,
    }));
    
    const event: CrossModuleEvent = {
      id: eventId,
      type,
      sourceModule,
      targetModules: template.targetModules,
      payload,
      timestamp,
      acknowledged: false,
      acknowledgedBy: [],
      cascadeActions,
      metadata: metadata || {
        priority: 'medium',
        automated: false,
        requiresReview: true,
      },
    };
    
    // Update pending actions for each target module
    const newPendingActions = { ...get().pendingActions };
    cascadeActions.forEach(action => {
      const pendingAction: PendingAction = {
        moduleId: action.targetModule,
        eventId,
        cascadeAction: action,
      };
      newPendingActions[action.targetModule] = [
        ...(newPendingActions[action.targetModule] || []),
        pendingAction,
      ];
    });
    
    set(state => ({
      events: [event, ...state.events].slice(0, 500), // Keep last 500 events
      eventFeed: [event, ...state.eventFeed].slice(0, 50), // Keep last 50 for feed
      pendingActions: newPendingActions,
    }));
    
    return eventId;
  },
  
  acknowledgeEvent: (eventId, moduleId) => {
    set(state => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              acknowledgedBy: [...event.acknowledgedBy, moduleId],
              acknowledged: event.targetModules.every(
                m => [...event.acknowledgedBy, moduleId].includes(m)
              ),
            }
          : event
      ),
    }));
  },
  
  completeCascadeAction: (eventId, actionId, entityId) => {
    set(state => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              cascadeActions: event.cascadeActions.map(action =>
                action.id === actionId
                  ? {
                      ...action,
                      status: 'completed' as const,
                      entityId,
                      completedAt: new Date().toISOString(),
                    }
                  : action
              ),
            }
          : event
      ),
      pendingActions: Object.fromEntries(
        Object.entries(state.pendingActions).map(([moduleId, actions]) => [
          moduleId,
          actions.filter(a => a.cascadeAction.id !== actionId),
        ])
      ) as Partial<Record<ModuleId, PendingAction[]>>,
    }));
  },
  
  failCascadeAction: (eventId, actionId, reason) => {
    set(state => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              cascadeActions: event.cascadeActions.map(action =>
                action.id === actionId
                  ? { ...action, status: 'failed' as const }
                  : action
              ),
            }
          : event
      ),
      pendingActions: Object.fromEntries(
        Object.entries(state.pendingActions).map(([moduleId, actions]) => [
          moduleId,
          actions.filter(a => a.cascadeAction.id !== actionId),
        ])
      ) as Partial<Record<ModuleId, PendingAction[]>>,
    }));
  },
  
  getPendingActionsForModule: (moduleId) => {
    return get().pendingActions[moduleId] || [];
  },
  
  getRecentEvents: (limit = 20) => {
    return get().eventFeed.slice(0, limit);
  },
  
  getEventsByType: (type) => {
    return get().events.filter(e => e.type === type);
  },
  
  getEventsByModule: (moduleId) => {
    return get().events.filter(
      e => e.sourceModule === moduleId || e.targetModules.includes(moduleId)
    );
  },

  clearEvents: () => {
    set({ events: [] });
  },
  
  clearEventFeed: () => {
    set({ eventFeed: [] });
  },
}));

// ============================================================================
// SELECTOR HOOKS
// v204d-b4 fix: Use stable selectors with useMemo to prevent infinite loops
// ============================================================================

import { useMemo } from 'react';

// Empty array constant to prevent new reference creation
const EMPTY_PENDING_ACTIONS: PendingAction[] = [];

export const usePendingActions = (moduleId: ModuleId) => {
  const pendingActions = useCrossModuleEventStore(state => state.pendingActions);
  return useMemo(() => pendingActions[moduleId] || EMPTY_PENDING_ACTIONS, [pendingActions, moduleId]);
};

export const useRecentCrossModuleEvents = (limit = 20) => {
  const eventFeed = useCrossModuleEventStore(state => state.eventFeed);
  return useMemo(() => eventFeed.slice(0, limit), [eventFeed, limit]);
};

export const useCrossModuleEventFeed = () =>
  useCrossModuleEventStore(state => state.eventFeed);
