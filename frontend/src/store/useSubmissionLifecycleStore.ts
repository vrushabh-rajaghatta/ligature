
// ============================================================================
// useSubmissionLifecycleStore - v0.38.9
// Automated Lifecycle Management for Regulatory Submissions
// ============================================================================
// Handles:
// - Submission lifecycle states (active → submitted → approved → archived)
// - Auto-archival workflows triggered by approval
// - Document version retirement
// - Audit trail for lifecycle events
// - Retention policy enforcement
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type LifecycleState = 
  | 'draft'           // Initial creation
  | 'in-preparation'  // Content being assembled
  | 'under-review'    // Internal QC/approval
  | 'ready-to-submit' // Approved for submission
  | 'submitted'       // Sent to health authority
  | 'under-ha-review' // Health authority reviewing
  | 'approved'        // Health authority approved
  | 'rejected'        // Health authority rejected (CRL)
  | 'withdrawn'       // Sponsor withdrew
  | 'archived'        // Moved to archive
  | 'retired';        // Superseded by new version

export type LifecycleEventType =
  | 'created'
  | 'state-change'
  | 'content-updated'
  | 'submitted-to-ha'
  | 'ha-response-received'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'archived'
  | 'retired'
  | 'restored'
  | 'retention-warning'
  | 'retention-expired';

export type ArchivalReason =
  | 'approved-superseded'    // New version approved
  | 'withdrawn-by-sponsor'   // Sponsor withdrew application
  | 'rejected-final'         // Final rejection (no appeal)
  | 'retention-expired'      // Retention period ended
  | 'manual-archive'         // User initiated
  | 'regulatory-requirement'; // Required by regulation

export interface LifecycleEvent {
  id: string;
  submissionId: string;
  eventType: LifecycleEventType;
  fromState?: LifecycleState;
  toState?: LifecycleState;
  timestamp: string;
  userId: string;
  userName: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  submissionTypes: string[];
  regions: string[];
  retentionPeriodYears: number;
  archiveAfterApproval: boolean;
  archiveDelayDays: number; // Days after approval before auto-archive
  requiresManualReview: boolean;
}

export interface SubmissionLifecycle {
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productId: string;
  productName: string;
  region: string;
  submissionType: string;
  
  // Current state
  currentState: LifecycleState;
  previousState?: LifecycleState;
  
  // Key dates
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  archivedAt?: string;
  retiredAt?: string;
  
  // Retention
  retentionPolicyId?: string;
  retentionExpiresAt?: string;
  
  // Versioning
  version: number;
  supersededBy?: string; // ID of newer submission
  supersedes?: string;   // ID of older submission
  
  // Archival
  archivalReason?: ArchivalReason;
  archivalNotes?: string;
  archivedBy?: string;
  
  // Documents to retire
  documentsToRetire: string[];
  documentsRetired: string[];
  
  // Flags
  isArchivalPending: boolean;
  archivalScheduledFor?: string;
}

export interface ArchivalTask {
  id: string;
  submissionId: string;
  applicationNumber: string;
  productName: string;
  taskType: 'archive' | 'retire-documents' | 'retention-review' | 'restore';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  scheduledFor: string;
  reason: ArchivalReason;
  assignedTo?: string;
  completedAt?: string;
  error?: string;
  documentCount?: number;
}

// ============================================================================
// DEFAULT RETENTION POLICIES
// ============================================================================

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'policy-fda-nda',
    name: 'FDA NDA/BLA Retention',
    submissionTypes: ['NDA', 'BLA', 'sNDA', 'sBLA'],
    regions: ['US'],
    retentionPeriodYears: 15,
    archiveAfterApproval: true,
    archiveDelayDays: 30,
    requiresManualReview: false,
  },
  {
    id: 'policy-fda-ind',
    name: 'FDA IND Retention',
    submissionTypes: ['IND'],
    regions: ['US'],
    retentionPeriodYears: 10,
    archiveAfterApproval: false,
    archiveDelayDays: 0,
    requiresManualReview: true,
  },
  {
    id: 'policy-ema-maa',
    name: 'EMA MAA Retention',
    submissionTypes: ['MAA', 'Type II Variation'],
    regions: ['EU'],
    retentionPeriodYears: 15,
    archiveAfterApproval: true,
    archiveDelayDays: 45,
    requiresManualReview: false,
  },
  {
    id: 'policy-pmda-jnda',
    name: 'PMDA JNDA Retention',
    submissionTypes: ['JNDA', 'CTA'],
    regions: ['JP'],
    retentionPeriodYears: 15,
    archiveAfterApproval: true,
    archiveDelayDays: 60,
    requiresManualReview: true,
  },
];

// ============================================================================
// MOCK DATA
// ============================================================================

const mockLifecycles: SubmissionLifecycle[] = [
  {
    submissionId: 'sub-001',
    applicationNumber: 'NDA-214500',
    sequenceNumber: '0025',
    productId: 'lig-2847',
    productName: 'Ligrastinib',
    region: 'US',
    submissionType: 'sNDA',
    currentState: 'approved',
    previousState: 'under-ha-review',
    createdAt: '2025-06-15',
    submittedAt: '2025-09-01',
    approvedAt: '2026-01-15',
    retentionPolicyId: 'policy-fda-nda',
    retentionExpiresAt: '2041-01-15',
    version: 1,
    documentsToRetire: ['doc-001', 'doc-002', 'doc-003'],
    documentsRetired: [],
    isArchivalPending: true,
    archivalScheduledFor: '2026-02-14',
  },
  {
    submissionId: 'sub-002',
    applicationNumber: 'BLA-761234',
    sequenceNumber: '0012',
    productId: 'nex-4200',
    productName: 'Nexovir',
    region: 'US',
    submissionType: 'BLA',
    currentState: 'under-ha-review',
    previousState: 'submitted',
    createdAt: '2025-03-01',
    submittedAt: '2025-08-15',
    retentionPolicyId: 'policy-fda-nda',
    version: 1,
    documentsToRetire: [],
    documentsRetired: [],
    isArchivalPending: false,
  },
  {
    submissionId: 'sub-003',
    applicationNumber: 'MAA-EU-2024-001',
    sequenceNumber: '0008',
    productId: 'crz-1100',
    productName: 'Cardiozen',
    region: 'EU',
    submissionType: 'MAA',
    currentState: 'archived',
    previousState: 'approved',
    createdAt: '2024-01-15',
    submittedAt: '2024-06-01',
    approvedAt: '2025-04-15',
    archivedAt: '2025-06-01',
    retentionPolicyId: 'policy-ema-maa',
    retentionExpiresAt: '2040-04-15',
    version: 1,
    archivalReason: 'approved-superseded',
    archivalNotes: 'Superseded by Type II variation MAA-EU-2024-002',
    archivedBy: 'Sarah Chen',
    documentsToRetire: ['doc-010', 'doc-011'],
    documentsRetired: ['doc-010', 'doc-011'],
    isArchivalPending: false,
  },
];

const mockArchivalTasks: ArchivalTask[] = [
  {
    id: 'task-001',
    submissionId: 'sub-001',
    applicationNumber: 'NDA-214500',
    productName: 'Ligrastinib',
    taskType: 'archive',
    status: 'pending',
    scheduledFor: '2026-02-14',
    reason: 'approved-superseded',
    documentCount: 3,
  },
  {
    id: 'task-002',
    submissionId: 'sub-001',
    applicationNumber: 'NDA-214500',
    productName: 'Ligrastinib',
    taskType: 'retire-documents',
    status: 'pending',
    scheduledFor: '2026-02-14',
    reason: 'approved-superseded',
    documentCount: 3,
  },
];

const mockEvents: LifecycleEvent[] = [
  {
    id: 'evt-001',
    submissionId: 'sub-001',
    eventType: 'approved',
    fromState: 'under-ha-review',
    toState: 'approved',
    timestamp: '2026-01-15T10:30:00Z',
    userId: 'user-001',
    userName: 'FDA Gateway',
    reason: 'FDA approval letter received',
  },
  {
    id: 'evt-002',
    submissionId: 'sub-003',
    eventType: 'archived',
    fromState: 'approved',
    toState: 'archived',
    timestamp: '2025-06-01T14:00:00Z',
    userId: 'user-002',
    userName: 'Sarah Chen',
    reason: 'Auto-archived per retention policy after approval',
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const addYears = (date: string, years: number): string => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
};

// ============================================================================
// STORE
// ============================================================================

interface SubmissionLifecycleState {
  // Data
  lifecycles: Record<string, SubmissionLifecycle>;
  lifecycleIndex: string[];
  events: LifecycleEvent[];
  archivalTasks: ArchivalTask[];
  retentionPolicies: RetentionPolicy[];
  
  // State
  isProcessing: boolean;
  
  // Lifecycle Management
  transitionState: (submissionId: string, toState: LifecycleState, userId: string, userName: string, reason?: string) => void;
  
  // Approval → Archive Flow
  handleApproval: (submissionId: string, approvalDate: string, userId: string, userName: string) => void;
  scheduleArchival: (submissionId: string, reason: ArchivalReason, delayDays?: number) => void;
  executeArchival: (submissionId: string, userId: string, userName: string, notes?: string) => Promise<void>;
  cancelArchival: (submissionId: string, userId: string, userName: string, reason: string) => void;
  
  // Document Retirement
  retireDocuments: (submissionId: string, documentIds: string[], userId: string, userName: string) => void;
  
  // Restoration
  restoreFromArchive: (submissionId: string, userId: string, userName: string, reason: string) => void;
  
  // Versioning
  createNewVersion: (submissionId: string, userId: string, userName: string) => string;
  
  // Queries
  getLifecycle: (submissionId: string) => SubmissionLifecycle | undefined;
  getEventHistory: (submissionId: string) => LifecycleEvent[];
  getPendingArchivalTasks: () => ArchivalTask[];
  getArchivedSubmissions: () => SubmissionLifecycle[];
  getSubmissionsDueForArchival: () => SubmissionLifecycle[];
  getRetentionWarnings: () => SubmissionLifecycle[];
  
  // Bulk Operations
  processScheduledArchivals: (userId: string, userName: string) => Promise<number>;
}

export const useSubmissionLifecycleStore = create<SubmissionLifecycleState>()(
  devtools(
    (set, get) => ({
      // Initial data
      lifecycles: Object.fromEntries(mockLifecycles.map(l => [l.submissionId, l])),
      lifecycleIndex: mockLifecycles.map(l => l.submissionId),
      events: mockEvents,
      archivalTasks: mockArchivalTasks,
      retentionPolicies: DEFAULT_RETENTION_POLICIES,
      isProcessing: false,
      
      // ====================================================================
      // Lifecycle Transitions
      // ====================================================================
      
      transitionState: (submissionId, toState, userId, userName, reason) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        const event: LifecycleEvent = {
          id: generateId('evt'),
          submissionId,
          eventType: 'state-change',
          fromState: lifecycle.currentState,
          toState,
          timestamp: timestamp(),
          userId,
          userName,
          reason,
        };
        
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              previousState: lifecycle.currentState,
              currentState: toState,
            },
          },
          events: [...state.events, event],
        }));
        
        // v0.40.9: Auto-link to TMF when submission is sent to HA
        if (toState === 'submitted' && typeof window !== 'undefined') {
          import('@/services/tmf-auto-link-service').then(({ tmfAutoLinkService }) => {
            // Map submission types to TMF auto-link types
            const typeMap: Record<string, 'ind' | 'cta' | 'nda' | 'bla' | 'maa' | 'amendment'> = {
              'ind-initial': 'ind',
              'ind-amendment': 'amendment',
              'cta': 'cta',
              'nda': 'nda',
              'bla': 'bla',
              'maa': 'maa',
              'variation': 'amendment',
            };
            
            tmfAutoLinkService.onSubmissionPublished({
              submissionId,
              studyId: (lifecycle as any).studyId || 'study-001',
              submissionType: typeMap[lifecycle.submissionType] || 'ind',
              country: lifecycle.region,
              sequenceNumber: lifecycle.sequenceNumber,
            }).then(result => {
              if (result.success && result.artifact) {
                logger.debug('TMF Auto-Link', ` Submission ${lifecycle.applicationNumber} linked to TMF artifact ${result.artifact.artifactNumber}`);
              }
            }).catch(err => {
              logger.warn('TMF Auto-Link', 'Failed to auto-link submission', err);
            });
          }).catch(() => {
            // Service not available (SSR or build time)
          });
        }
      },
      
      // ====================================================================
      // Approval → Archive Flow
      // ====================================================================
      
      handleApproval: (submissionId, approvalDate, userId, userName) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        // Find applicable retention policy
        const policy = get().retentionPolicies.find(p =>
          p.submissionTypes.includes(lifecycle.submissionType) &&
          p.regions.includes(lifecycle.region)
        );
        
        // Calculate retention expiry
        const retentionExpiresAt = policy
          ? addYears(approvalDate, policy.retentionPeriodYears)
          : addYears(approvalDate, 15); // Default 15 years
        
        // Create approval event
        const event: LifecycleEvent = {
          id: generateId('evt'),
          submissionId,
          eventType: 'approved',
          fromState: lifecycle.currentState,
          toState: 'approved',
          timestamp: timestamp(),
          userId,
          userName,
          reason: 'Health authority approval received',
        };
        
        // Update lifecycle
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              previousState: lifecycle.currentState,
              currentState: 'approved',
              approvedAt: approvalDate,
              retentionPolicyId: policy?.id,
              retentionExpiresAt,
            },
          },
          events: [...state.events, event],
        }));
        
        // Schedule archival if policy requires
        if (policy?.archiveAfterApproval) {
          get().scheduleArchival(submissionId, 'approved-superseded', policy.archiveDelayDays);
        }
        
        // v0.40.9: Auto-link HA approval letter to TMF
        if (typeof window !== 'undefined') {
          import('@/services/tmf-auto-link-service').then(({ tmfAutoLinkService }) => {
            // Determine agency name from region
            const agencyMap: Record<string, string> = {
              'US': 'FDA',
              'EU': 'EMA',
              'UK': 'MHRA',
              'JP': 'PMDA',
              'CN': 'NMPA',
              'CA': 'Health Canada',
            };
            
            tmfAutoLinkService.onHAResponseReceived({
              responseId: `approval-${submissionId}`,
              studyId: (lifecycle as any).studyId || 'study-001',
              responseType: 'approval',
              country: lifecycle.region,
              agencyName: agencyMap[lifecycle.region] || lifecycle.region,
            }).then(result => {
              if (result.success && result.artifact) {
                logger.debug('TMF Auto-Link', ` HA approval for ${lifecycle.applicationNumber} linked to TMF artifact ${result.artifact.artifactNumber}`);
              }
            }).catch(err => {
              logger.warn('TMF Auto-Link', 'Failed to auto-link HA approval', err);
            });
          }).catch(() => {
            // Service not available (SSR or build time)
          });
        }
      },
      
      scheduleArchival: (submissionId, reason, delayDays = 30) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        const scheduledFor = addDays(timestamp().split('T')[0], delayDays);
        
        // Create archival task
        const archiveTask: ArchivalTask = {
          id: generateId('task'),
          submissionId,
          applicationNumber: lifecycle.applicationNumber,
          productName: lifecycle.productName,
          taskType: 'archive',
          status: 'pending',
          scheduledFor,
          reason,
        };
        
        // Create document retirement task if there are documents
        const tasks: ArchivalTask[] = [archiveTask];
        if (lifecycle.documentsToRetire.length > 0) {
          tasks.push({
            id: generateId('task'),
            submissionId,
            applicationNumber: lifecycle.applicationNumber,
            productName: lifecycle.productName,
            taskType: 'retire-documents',
            status: 'pending',
            scheduledFor,
            reason,
            documentCount: lifecycle.documentsToRetire.length,
          });
        }
        
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              isArchivalPending: true,
              archivalScheduledFor: scheduledFor,
            },
          },
          archivalTasks: [...state.archivalTasks, ...tasks],
        }));
      },
      
      executeArchival: async (submissionId, userId, userName, notes) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        set({ isProcessing: true });
        
        try {
          // Simulate archival process
          await new Promise(r => setTimeout(r, 1000));
          
          // Create event
          const event: LifecycleEvent = {
            id: generateId('evt'),
            submissionId,
            eventType: 'archived',
            fromState: lifecycle.currentState,
            toState: 'archived',
            timestamp: timestamp(),
            userId,
            userName,
            reason: notes || 'Archived per retention policy',
          };
          
          // Update lifecycle
          set(state => ({
            lifecycles: {
              ...state.lifecycles,
              [submissionId]: {
                ...lifecycle,
                previousState: lifecycle.currentState,
                currentState: 'archived',
                archivedAt: timestamp().split('T')[0],
                archivedBy: userName,
                archivalNotes: notes,
                archivalReason: lifecycle.isArchivalPending ? 'approved-superseded' : 'manual-archive',
                isArchivalPending: false,
                archivalScheduledFor: undefined,
              },
            },
            events: [...state.events, event],
            archivalTasks: state.archivalTasks.map(t =>
              t.submissionId === submissionId && t.taskType === 'archive'
                ? { ...t, status: 'completed', completedAt: timestamp() }
                : t
            ),
            isProcessing: false,
          }));
          
        } catch (error) {
          set(state => ({
            archivalTasks: state.archivalTasks.map(t =>
              t.submissionId === submissionId && t.taskType === 'archive'
                ? { ...t, status: 'failed', error: String(error) }
                : t
            ),
            isProcessing: false,
          }));
        }
      },
      
      cancelArchival: (submissionId, userId, userName, reason) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              isArchivalPending: false,
              archivalScheduledFor: undefined,
            },
          },
          archivalTasks: state.archivalTasks.map(t =>
            t.submissionId === submissionId && t.status === 'pending'
              ? { ...t, status: 'cancelled' }
              : t
          ),
          events: [...state.events, {
            id: generateId('evt'),
            submissionId,
            eventType: 'state-change',
            timestamp: timestamp(),
            userId,
            userName,
            reason: `Archival cancelled: ${reason}`,
          }],
        }));
      },
      
      // ====================================================================
      // Document Retirement
      // ====================================================================
      
      retireDocuments: (submissionId, documentIds, userId, userName) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return;
        
        const event: LifecycleEvent = {
          id: generateId('evt'),
          submissionId,
          eventType: 'retired',
          timestamp: timestamp(),
          userId,
          userName,
          reason: `Retired ${documentIds.length} documents`,
          metadata: { documentIds },
        };
        
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              documentsRetired: Array.from(new Set(lifecycle.documentsRetired.concat(documentIds))),
            },
          },
          events: [...state.events, event],
          archivalTasks: state.archivalTasks.map(t =>
            t.submissionId === submissionId && t.taskType === 'retire-documents'
              ? { ...t, status: 'completed', completedAt: timestamp() }
              : t
          ),
        }));
      },
      
      // ====================================================================
      // Restoration
      // ====================================================================
      
      restoreFromArchive: (submissionId, userId, userName, reason) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle || lifecycle.currentState !== 'archived') return;
        
        const event: LifecycleEvent = {
          id: generateId('evt'),
          submissionId,
          eventType: 'restored',
          fromState: 'archived',
          toState: lifecycle.previousState || 'approved',
          timestamp: timestamp(),
          userId,
          userName,
          reason,
        };
        
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              currentState: lifecycle.previousState || 'approved',
              previousState: 'archived',
              archivedAt: undefined,
              archivalReason: undefined,
              archivalNotes: undefined,
              archivedBy: undefined,
            },
          },
          events: [...state.events, event],
        }));
      },
      
      // ====================================================================
      // Versioning
      // ====================================================================
      
      createNewVersion: (submissionId, userId, userName) => {
        const lifecycle = get().lifecycles[submissionId];
        if (!lifecycle) return '';
        
        const newId = generateId('sub');
        const newSequence = String(parseInt(lifecycle.sequenceNumber) + 1).padStart(4, '0');
        
        const newLifecycle: SubmissionLifecycle = {
          ...lifecycle,
          submissionId: newId,
          sequenceNumber: newSequence,
          currentState: 'draft',
          previousState: undefined,
          createdAt: timestamp().split('T')[0],
          submittedAt: undefined,
          approvedAt: undefined,
          archivedAt: undefined,
          version: lifecycle.version + 1,
          supersedes: submissionId,
          documentsToRetire: [],
          documentsRetired: [],
          isArchivalPending: false,
          archivalScheduledFor: undefined,
        };
        
        // Mark old version as superseded
        set(state => ({
          lifecycles: {
            ...state.lifecycles,
            [submissionId]: {
              ...lifecycle,
              supersededBy: newId,
            },
            [newId]: newLifecycle,
          },
          lifecycleIndex: [...state.lifecycleIndex, newId],
          events: [...state.events, {
            id: generateId('evt'),
            submissionId: newId,
            eventType: 'created',
            toState: 'draft',
            timestamp: timestamp(),
            userId,
            userName,
            reason: `New version created from ${lifecycle.applicationNumber} ${lifecycle.sequenceNumber}`,
          }],
        }));
        
        return newId;
      },
      
      // ====================================================================
      // Queries
      // ====================================================================
      
      getLifecycle: (submissionId) => get().lifecycles[submissionId],
      
      getEventHistory: (submissionId) => 
        get().events
          .filter(e => e.submissionId === submissionId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      
      getPendingArchivalTasks: () =>
        get().archivalTasks.filter(t => t.status === 'pending'),
      
      getArchivedSubmissions: () =>
        get().lifecycleIndex
          .map(id => get().lifecycles[id])
          .filter(l => l && l.currentState === 'archived'),
      
      getSubmissionsDueForArchival: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().lifecycleIndex
          .map(id => get().lifecycles[id])
          .filter(l => l && l.isArchivalPending && l.archivalScheduledFor && l.archivalScheduledFor <= today);
      },
      
      getRetentionWarnings: () => {
        const warningThreshold = addDays(new Date().toISOString().split('T')[0], 90);
        return get().lifecycleIndex
          .map(id => get().lifecycles[id])
          .filter(l => l && l.retentionExpiresAt && l.retentionExpiresAt <= warningThreshold);
      },
      
      // ====================================================================
      // Bulk Operations
      // ====================================================================
      
      processScheduledArchivals: async (userId, userName) => {
        const dueForArchival = get().getSubmissionsDueForArchival();
        let processed = 0;
        
        for (const lifecycle of dueForArchival) {
          await get().executeArchival(lifecycle.submissionId, userId, userName, 'Auto-archived per schedule');
          processed++;
        }
        
        return processed;
      },
    }),
    { name: 'submission-lifecycle-store' }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

export function useSubmissionLifecycle(submissionId: string) {
  return useSubmissionLifecycleStore(state => state.lifecycles[submissionId]);
}

export function usePendingArchivalTasks() {
  return useSubmissionLifecycleStore(state => state.getPendingArchivalTasks());
}

export function useArchivedSubmissions() {
  return useSubmissionLifecycleStore(state => state.getArchivedSubmissions());
}

export default useSubmissionLifecycleStore;
