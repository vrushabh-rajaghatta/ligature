


/**
 * Activity Store - v127
 * 
 * Cross-module event cascading and activity feed system.
 * Tracks platform-wide activity with:
 * - Event propagation across modules
 * - Audit trail with causality chains
 * - User-specific and global activity feeds
 * - Event triggering and cascading
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityModule = 
  | 'portfolio' | 'authoring' | 'submissions' | 'haq' | 'safety' 
  | 'clinical' | 'quality' | 'cmc' | 'labeling' | 'regulatory' 
  | 'tmf' | 'publishing' | 'admin' | 'system';

export type ActivityEventType = 
  // Safety Events
  | 'safety:signal_detected'
  | 'safety:icsr_received'
  | 'safety:aggregate_report_due'
  | 'safety:signal_escalated'
  // Clinical Events  
  | 'clinical:milestone_reached'
  | 'clinical:enrollment_update'
  | 'clinical:study_completed'
  | 'clinical:protocol_amended'
  // Regulatory Events
  | 'regulatory:submission_filed'
  | 'regulatory:acknowledgment_received'
  | 'regulatory:approval_granted'
  | 'regulatory:variation_submitted'
  // HAQ Events
  | 'haq:question_received'
  | 'haq:response_submitted'
  | 'haq:response_overdue'
  | 'haq:deadline_approaching'
  // Document Events
  | 'document:created'
  | 'document:approved'
  | 'document:rejected'
  | 'document:version_published'
  // Quality Events
  | 'quality:deviation_opened'
  | 'quality:capa_initiated'
  | 'quality:change_control_approved'
  | 'quality:batch_released'
  // CMC Events
  | 'cmc:specification_changed'
  | 'cmc:stability_alert'
  | 'cmc:manufacturing_issue'
  // System Events
  | 'system:user_login'
  | 'system:workflow_completed'
  | 'system:integration_sync';

export type ActivitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  module: ActivityModule;
  severity: ActivitySeverity;
  timestamp: string;
  
  // Event details
  title: string;
  description: string;
  
  // Source reference
  sourceId: string;
  sourceType: string;
  sourceLabel?: string;
  
  // Causality chain
  triggeredBy?: string;  // ID of event that caused this
  triggers?: string[];   // IDs of events this caused
  
  // User context
  userId?: string;
  userName?: string;
  
  // Program/Application context
  programId?: string;
  programName?: string;
  applicationId?: string;
  applicationName?: string;
  
  // Navigation
  actionUrl?: string;
  actionModule?: ActivityModule;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // State
  acknowledged: boolean;
}

// Event cascade rules - when event X occurs, trigger event Y
export interface CascadeRule {
  id: string;
  triggerType: ActivityEventType;
  resultType: ActivityEventType;
  resultModule: ActivityModule;
  condition?: (event: ActivityEvent) => boolean;
  transform?: (event: ActivityEvent) => Partial<ActivityEvent>;
}

// Predefined cascade rules
const DEFAULT_CASCADE_RULES: CascadeRule[] = [
  // Safety signal → Regulatory alert
  {
    id: 'safety-to-regulatory',
    triggerType: 'safety:signal_detected',
    resultType: 'regulatory:variation_submitted',
    resultModule: 'regulatory',
    condition: (e) => e.severity === 'critical' || e.severity === 'high',
    transform: (e) => ({
      title: `Safety signal requires regulatory assessment`,
      description: `Signal "${e.sourceLabel || e.sourceId}" may require labeling update or safety variation`,
      severity: 'high' as ActivitySeverity,
    }),
  },
  // Clinical milestone → Portfolio update
  {
    id: 'clinical-to-portfolio',
    triggerType: 'clinical:milestone_reached',
    resultType: 'system:workflow_completed',
    resultModule: 'portfolio',
    transform: (e) => ({
      title: `Portfolio milestone: ${e.title}`,
      description: `Clinical milestone achieved - portfolio status updated`,
      severity: 'info' as ActivitySeverity,
    }),
  },
  // Study completion → Document authoring trigger
  {
    id: 'clinical-to-authoring',
    triggerType: 'clinical:study_completed',
    resultType: 'document:created',
    resultModule: 'authoring',
    transform: (e) => ({
      title: `CSR authoring initiated`,
      description: `Study ${e.sourceLabel || e.sourceId} completed - Clinical Study Report ready for authoring`,
      severity: 'medium' as ActivitySeverity,
    }),
  },
  // HAQ overdue → Portfolio alert
  {
    id: 'haq-to-portfolio',
    triggerType: 'haq:response_overdue',
    resultType: 'system:workflow_completed',
    resultModule: 'portfolio',
    transform: (e) => ({
      title: `Critical: HAQ response overdue`,
      description: `HAQ "${e.sourceLabel || e.sourceId}" is overdue - executive attention required`,
      severity: 'critical' as ActivitySeverity,
    }),
  },
  // Quality deviation → CMC alert
  {
    id: 'quality-to-cmc',
    triggerType: 'quality:deviation_opened',
    resultType: 'cmc:manufacturing_issue',
    resultModule: 'cmc',
    condition: (e) => e.metadata?.deviationType === 'manufacturing' || e.metadata?.deviationType === 'stability',
    transform: (e) => ({
      title: `Manufacturing deviation requires CMC assessment`,
      description: `Deviation "${e.sourceLabel || e.sourceId}" may impact CMC documentation`,
      severity: 'medium' as ActivitySeverity,
    }),
  },
  // Document approval → Submission readiness
  {
    id: 'document-to-submissions',
    triggerType: 'document:approved',
    resultType: 'regulatory:submission_filed',
    resultModule: 'submissions',
    condition: (e) => e.metadata?.documentType === 'ctd-section',
    transform: (e) => ({
      title: `Document ready for eCTD`,
      description: `"${e.sourceLabel || e.sourceId}" approved - available for sequence building`,
      severity: 'info' as ActivitySeverity,
    }),
  },
  // Submission acknowledgment → HAQ monitoring
  {
    id: 'submission-to-haq',
    triggerType: 'regulatory:acknowledgment_received',
    resultType: 'haq:question_received',
    resultModule: 'haq',
    transform: (e) => ({
      title: `Submission acknowledged - HAQ monitoring active`,
      description: `${e.applicationName || e.sourceId} acknowledged - monitoring for health authority questions`,
      severity: 'info' as ActivitySeverity,
    }),
  },
];

// ============================================================================
// STORE
// ============================================================================

interface ActivityState {
  events: ActivityEvent[];
  cascadeRules: CascadeRule[];
  isProcessing: boolean;
}

interface ActivityActions {
  // Event management
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'acknowledged' | 'triggers'>) => string;
  addEventWithCascade: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'acknowledged' | 'triggers'>) => string[];
  acknowledgeEvent: (eventId: string) => void;
  acknowledgeAll: () => void;
  
  // Queries
  getRecentEvents: (limit?: number) => ActivityEvent[];
  getEventsByModule: (module: ActivityModule, limit?: number) => ActivityEvent[];
  getEventsByProgram: (programId: string, limit?: number) => ActivityEvent[];
  getEventsByUser: (userId: string, limit?: number) => ActivityEvent[];
  getUnacknowledgedCount: () => number;
  getUnacknowledgedByModule: (module: ActivityModule) => number;
  getCriticalEvents: () => ActivityEvent[];
  getEventChain: (eventId: string) => ActivityEvent[];
  
  // Cascade rules
  addCascadeRule: (rule: CascadeRule) => void;
  removeCascadeRule: (ruleId: string) => void;
  processCascades: (event: ActivityEvent) => ActivityEvent[];
  
  // Bulk operations
  clearOldEvents: (daysOld: number) => void;
  clearAll: () => void;
  
  // Event generators for common scenarios
  onSafetySignal: (signalId: string, productName: string, signalType: string, severity: ActivitySeverity, programId?: string) => string[];
  onClinicalMilestone: (studyId: string, studyName: string, milestone: string, programId: string, programName: string) => string[];
  onHAQReceived: (haqId: string, haqTitle: string, agency: string, applicationId: string, applicationName: string, dueDate: string) => string[];
  onDocumentApproved: (docId: string, docTitle: string, version: string, programId?: string) => string[];
  onSubmissionFiled: (submissionId: string, applicationType: string, agency: string, applicationId: string, applicationName: string) => string[];
  onQualityDeviation: (deviationId: string, deviationType: string, description: string, severity: ActivitySeverity, programId?: string) => string[];
}

const generateId = () => `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

export const useActivityStore = create<ActivityState & ActivityActions>()(
  devtools(
    persist(
      (set, get) => ({
        events: [],
        cascadeRules: DEFAULT_CASCADE_RULES,
        isProcessing: false,

        // ===== EVENT MANAGEMENT =====
        addEvent: (eventData) => {
          const id = generateId();
          const event: ActivityEvent = {
            ...eventData,
            id,
            timestamp: now(),
            acknowledged: false,
            triggers: [],
          };
          
          set((state) => ({
            events: [event, ...state.events].slice(0, 1000), // Keep last 1000 events
          }), false, 'addEvent');
          
          return id;
        },

        addEventWithCascade: (eventData) => {
          const id = get().addEvent(eventData);
          const event = get().events.find(e => e.id === id);
          if (!event) return [id];
          
          const cascadedEvents = get().processCascades(event);
          return [id, ...cascadedEvents.map(e => e.id)];
        },

        acknowledgeEvent: (eventId) => {
          set((state) => ({
            events: state.events.map(e => 
              e.id === eventId ? { ...e, acknowledged: true } : e
            ),
          }), false, 'acknowledgeEvent');
        },

        acknowledgeAll: () => {
          set((state) => ({
            events: state.events.map(e => ({ ...e, acknowledged: true })),
          }), false, 'acknowledgeAll');
        },

        // ===== QUERIES =====
        getRecentEvents: (limit = 20) => {
          return get().events.slice(0, limit);
        },

        getEventsByModule: (module, limit = 50) => {
          return get().events
            .filter(e => e.module === module)
            .slice(0, limit);
        },

        getEventsByProgram: (programId, limit = 50) => {
          return get().events
            .filter(e => e.programId === programId)
            .slice(0, limit);
        },

        getEventsByUser: (userId, limit = 50) => {
          return get().events
            .filter(e => e.userId === userId)
            .slice(0, limit);
        },

        getUnacknowledgedCount: () => {
          return get().events.filter(e => !e.acknowledged).length;
        },

        getUnacknowledgedByModule: (module) => {
          return get().events.filter(e => e.module === module && !e.acknowledged).length;
        },

        getCriticalEvents: () => {
          return get().events.filter(e => e.severity === 'critical' && !e.acknowledged);
        },

        getEventChain: (eventId) => {
          const events = get().events;
          const chain: ActivityEvent[] = [];
          const visited = new Set<string>();
          
          const findChain = (id: string) => {
            if (visited.has(id)) return;
            visited.add(id);
            
            const event = events.find(e => e.id === id);
            if (!event) return;
            
            chain.push(event);
            
            // Find parent
            if (event.triggeredBy) {
              findChain(event.triggeredBy);
            }
            
            // Find children
            event.triggers?.forEach(triggerId => findChain(triggerId));
          };
          
          findChain(eventId);
          return chain.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        },

        // ===== CASCADE RULES =====
        addCascadeRule: (rule) => {
          set((state) => ({
            cascadeRules: [...state.cascadeRules, rule],
          }), false, 'addCascadeRule');
        },

        removeCascadeRule: (ruleId) => {
          set((state) => ({
            cascadeRules: state.cascadeRules.filter(r => r.id !== ruleId),
          }), false, 'removeCascadeRule');
        },

        processCascades: (event) => {
          const cascadedEvents: ActivityEvent[] = [];
          const rules = get().cascadeRules;
          
          for (const rule of rules) {
            if (rule.triggerType !== event.type) continue;
            if (rule.condition && !rule.condition(event)) continue;
            
            const transform = rule.transform?.(event) || {};
            
            const cascadedId = get().addEvent({
              type: rule.resultType,
              module: rule.resultModule,
              severity: transform.severity || 'info',
              title: transform.title || `Cascade from ${event.type}`,
              description: transform.description || `Triggered by ${event.title}`,
              sourceId: event.sourceId,
              sourceType: event.sourceType,
              sourceLabel: event.sourceLabel,
              triggeredBy: event.id,
              programId: event.programId,
              programName: event.programName,
              applicationId: event.applicationId,
              applicationName: event.applicationName,
              actionModule: rule.resultModule,
              metadata: { ...event.metadata, cascadeRuleId: rule.id },
            });
            
            // Update parent event with trigger reference
            set((state) => ({
              events: state.events.map(e => 
                e.id === event.id 
                  ? { ...e, triggers: [...(e.triggers || []), cascadedId] }
                  : e
              ),
            }));
            
            const cascaded = get().events.find(e => e.id === cascadedId);
            if (cascaded) cascadedEvents.push(cascaded);
          }
          
          return cascadedEvents;
        },

        // ===== BULK OPERATIONS =====
        clearOldEvents: (daysOld) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - daysOld);
          
          set((state) => ({
            events: state.events.filter(e => 
              new Date(e.timestamp) > cutoff
            ),
          }), false, 'clearOldEvents');
        },

        clearAll: () => {
          set({ events: [] }, false, 'clearAll');
        },

        // ===== EVENT GENERATORS =====
        onSafetySignal: (signalId, productName, signalType, severity, programId) => {
          return get().addEventWithCascade({
            type: 'safety:signal_detected',
            module: 'safety',
            severity,
            title: `Safety signal detected: ${signalType}`,
            description: `New ${severity} safety signal identified for ${productName}`,
            sourceId: signalId,
            sourceType: 'signal',
            sourceLabel: signalType,
            programId,
            actionModule: 'safety',
            actionUrl: `/safety/signals/${signalId}`,
            metadata: { signalType, productName },
          });
        },

        onClinicalMilestone: (studyId, studyName, milestone, programId, programName) => {
          return get().addEventWithCascade({
            type: 'clinical:milestone_reached',
            module: 'clinical',
            severity: 'medium',
            title: `Clinical milestone: ${milestone}`,
            description: `${studyName} reached milestone: ${milestone}`,
            sourceId: studyId,
            sourceType: 'study',
            sourceLabel: studyName,
            programId,
            programName,
            actionModule: 'clinical',
            actionUrl: `/clinical/studies/${studyId}`,
            metadata: { milestone, studyName },
          });
        },

        onHAQReceived: (haqId, haqTitle, agency, applicationId, applicationName, dueDate) => {
          return get().addEventWithCascade({
            type: 'haq:question_received',
            module: 'haq',
            severity: 'high',
            title: `New HAQ from ${agency}`,
            description: `${haqTitle} - Response due ${dueDate}`,
            sourceId: haqId,
            sourceType: 'haq',
            sourceLabel: haqTitle,
            applicationId,
            applicationName,
            actionModule: 'haq',
            actionUrl: `/haq/${haqId}`,
            metadata: { agency, dueDate },
          });
        },

        onDocumentApproved: (docId, docTitle, version, programId) => {
          return get().addEventWithCascade({
            type: 'document:approved',
            module: 'authoring',
            severity: 'info',
            title: `Document approved: ${docTitle}`,
            description: `Version ${version} approved and ready for use`,
            sourceId: docId,
            sourceType: 'document',
            sourceLabel: docTitle,
            programId,
            actionModule: 'authoring',
            actionUrl: `/authoring/documents/${docId}`,
            metadata: { version, documentType: 'ctd-section' },
          });
        },

        onSubmissionFiled: (submissionId, applicationType, agency, applicationId, applicationName) => {
          return get().addEventWithCascade({
            type: 'regulatory:submission_filed',
            module: 'submissions',
            severity: 'high',
            title: `${applicationType} submitted to ${agency}`,
            description: `${applicationName} filed with ${agency}`,
            sourceId: submissionId,
            sourceType: 'submission',
            sourceLabel: applicationName,
            applicationId,
            applicationName,
            actionModule: 'submissions',
            actionUrl: `/submissions/${submissionId}`,
            metadata: { applicationType, agency },
          });
        },

        onQualityDeviation: (deviationId, deviationType, description, severity, programId) => {
          return get().addEventWithCascade({
            type: 'quality:deviation_opened',
            module: 'quality',
            severity,
            title: `Quality deviation: ${deviationType}`,
            description,
            sourceId: deviationId,
            sourceType: 'deviation',
            sourceLabel: deviationType,
            programId,
            actionModule: 'quality',
            actionUrl: `/quality/deviations/${deviationId}`,
            metadata: { deviationType },
          });
        },
      }),
      {
        name: 'ligature-activity',
        partialize: (state) => ({
          events: state.events.slice(0, 200), // Persist last 200 events
          // Don't persist rules - use defaults
        }),
      }
    ),
    { name: 'ActivityStore' }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

// v204d-b4 fix: Use stable selectors that return primitives + useMemo for derived arrays
// This prevents infinite loops caused by new array references on each render

import { useMemo } from 'react';

export const useRecentActivity = (limit = 10) => {
  const events = useActivityStore((s) => s.events);
  return useMemo(() => events.slice(0, limit), [events, limit]);
};

export const useModuleActivity = (module: ActivityModule, limit = 20) => {
  const events = useActivityStore((s) => s.events);
  return useMemo(() => events.filter(e => e.module === module).slice(0, limit), [events, module, limit]);
};

export const useProgramActivity = (programId: string, limit = 20) => {
  const events = useActivityStore((s) => s.events);
  return useMemo(() => events.filter(e => e.programId === programId).slice(0, limit), [events, programId, limit]);
};

export const useCriticalActivity = () => {
  const events = useActivityStore((s) => s.events);
  return useMemo(() => events.filter(e => e.severity === 'critical' && !e.acknowledged), [events]);
};

// These return primitives (numbers), so they're safe as-is
export const useActivityCount = () =>
  useActivityStore((s) => s.events.filter(e => !e.acknowledged).length);

export const useActivityCountByModule = (module: ActivityModule) =>
  useActivityStore((s) => s.events.filter(e => e.module === module && !e.acknowledged).length);
