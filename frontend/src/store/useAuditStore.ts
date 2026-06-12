

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useMemo } from 'react';
import { DocumentType } from '@/types/authoring';
import { Citation } from '@/store/useAuthoringStore';
import { 
  auditService, 
  AuditEntry as ServiceAuditEntry, 
  AuditCategory,
  AuditActionType,
  AuditFilter as ServiceAuditFilter,
  AuditStatistics,
  AuditExportFormat,
  ChangeReasonCode,
  AuditSeverity,
} from '@/services/audit-service';

// ============================================================================
// RE-EXPORT SERVICE TYPES
// ============================================================================

export type { 
  ServiceAuditEntry as PlatformAuditEntry,
  AuditCategory,
  AuditActionType,
  ServiceAuditFilter as PlatformAuditFilter,
  AuditStatistics,
  AuditExportFormat,
  ChangeReasonCode,
  AuditSeverity,
};

// ============================================================================
// LEGACY AUDIT TRAIL TYPES (for authoring compatibility)
// ============================================================================

export type AuditAction = 
  | 'ai-generation'
  | 'ai-regeneration'
  | 'draft-accepted'
  | 'draft-discarded'
  | 'content-edited'
  | 'source-linked'
  | 'source-unlinked'
  | 'status-changed'
  | 'review-submitted'
  | 'review-completed'
  | 'comment-added'
  | 'comment-resolved';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  
  // What happened
  action: AuditAction;
  description: string;
  
  // Context
  documentId: string;
  documentType: DocumentType;
  documentTitle: string;
  sectionId?: string;
  sectionNumber?: string;
  sectionTitle?: string;
  
  // Who
  userId: string;
  userName: string;
  
  // AI-specific details
  aiDetails?: {
    modelUsed: string;
    promptSummary?: string;
    sourceDocuments: string[];
    citations: Citation[];
    tokensUsed?: number;
    generationTimeMs?: number;
    wordCount: number;
  };
  
  // Change tracking
  previousValue?: string;
  newValue?: string;
  changeType?: 'create' | 'update' | 'delete';
  
  // Metadata
  metadata?: Record<string, unknown>;
}

export interface AuditFilter {
  documentId?: string;
  sectionId?: string;
  userId?: string;
  actions?: AuditAction[];
  dateFrom?: Date;
  dateTo?: Date;
  aiOnly?: boolean;
}

// ============================================================================
// AUDIT STORE
// ============================================================================

interface AuditState {
  // Legacy authoring entries (backward compatibility)
  entries: AuditEntry[];
  
  // Platform-wide audit trail (via service)
  platformEntries: ServiceAuditEntry[];
  
  // UI State
  selectedEntryId: string | null;
  filterState: ServiceAuditFilter;
  
  // Legacy Actions (authoring)
  addEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => string;
  
  // AI-specific logging
  logAIGeneration: (params: {
    documentId: string;
    documentType: DocumentType;
    documentTitle: string;
    sectionId: string;
    sectionNumber: string;
    sectionTitle: string;
    userId: string;
    userName: string;
    modelUsed: string;
    sourceDocuments: string[];
    citations: Citation[];
    tokensUsed?: number;
    generationTimeMs?: number;
    wordCount: number;
    isRegeneration?: boolean;
  }) => string;
  
  logDraftAccepted: (params: {
    documentId: string;
    documentType: DocumentType;
    documentTitle: string;
    sectionId: string;
    sectionNumber: string;
    sectionTitle: string;
    userId: string;
    userName: string;
    wordCount: number;
    citationCount: number;
  }) => string;
  
  logDraftDiscarded: (params: {
    documentId: string;
    documentType: DocumentType;
    documentTitle: string;
    sectionId: string;
    sectionNumber: string;
    sectionTitle: string;
    userId: string;
    userName: string;
  }) => string;
  
  logContentEdit: (params: {
    documentId: string;
    documentType: DocumentType;
    documentTitle: string;
    sectionId: string;
    sectionNumber: string;
    sectionTitle: string;
    userId: string;
    userName: string;
    previousWordCount: number;
    newWordCount: number;
    editSummary?: string;
  }) => string;
  
  // Legacy Queries
  getEntriesForDocument: (documentId: string) => AuditEntry[];
  getEntriesForSection: (sectionId: string) => AuditEntry[];
  getAIGenerations: (documentId?: string) => AuditEntry[];
  filterEntries: (filter: AuditFilter) => AuditEntry[];
  
  // Legacy Export
  exportAuditTrail: (documentId: string) => string;
  
  // Platform-wide audit actions (new)
  refreshPlatformEntries: () => void;
  getPlatformEntries: (filter?: ServiceAuditFilter) => ServiceAuditEntry[];
  getPlatformStatistics: (filter?: ServiceAuditFilter) => AuditStatistics;
  exportPlatformAudit: (filter?: ServiceAuditFilter, format?: AuditExportFormat) => string;
  getEntriesForTarget: (targetType: string, targetId: string) => ServiceAuditEntry[];
  getEntriesForCorrelation: (correlationId: string) => ServiceAuditEntry[];
  
  // UI Actions
  setSelectedEntry: (entryId: string | null) => void;
  setFilter: (filter: Partial<ServiceAuditFilter>) => void;
  clearFilter: () => void;
  
  // Clear (for testing)
  clearEntries: () => void;
}

// Generate unique ID
const generateId = () => `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAuditStore = create<AuditState>()(
  devtools(
    persist(
      (set, get) => ({
        entries: [],
        platformEntries: [],
        selectedEntryId: null,
        filterState: {},
        
        addEntry: (entry) => {
          const id = generateId();
          const fullEntry: AuditEntry = {
            ...entry,
            id,
            timestamp: new Date(),
          };
          
          set((state) => ({
            entries: [fullEntry, ...state.entries].slice(0, 10000), // Keep last 10k entries
          }), false, 'addEntry');
          
          // Also log to platform audit service
          auditService.log({
            category: 'authoring',
            action: mapLegacyAction(entry.action),
            summary: entry.description,
            target: {
              type: 'document',
              id: entry.documentId,
              name: entry.documentTitle,
            },
            metadata: entry.metadata,
            actor: {
              userId: entry.userId,
              userName: entry.userName,
            },
          });
          
          return id;
        },
        
        logAIGeneration: (params) => {
          const entry: Omit<AuditEntry, 'id' | 'timestamp'> = {
            action: params.isRegeneration ? 'ai-regeneration' : 'ai-generation',
            description: params.isRegeneration 
              ? `Regenerated AI content for section ${params.sectionNumber} (${params.wordCount} words, ${params.citations.length} citations)`
              : `Generated AI content for section ${params.sectionNumber} (${params.wordCount} words, ${params.citations.length} citations)`,
            documentId: params.documentId,
            documentType: params.documentType,
            documentTitle: params.documentTitle,
            sectionId: params.sectionId,
            sectionNumber: params.sectionNumber,
            sectionTitle: params.sectionTitle,
            userId: params.userId,
            userName: params.userName,
            aiDetails: {
              modelUsed: params.modelUsed,
              sourceDocuments: params.sourceDocuments,
              citations: params.citations,
              tokensUsed: params.tokensUsed,
              generationTimeMs: params.generationTimeMs,
              wordCount: params.wordCount,
            },
            changeType: 'create',
          };
          
          return get().addEntry(entry);
        },
        
        logDraftAccepted: (params) => {
          const entry: Omit<AuditEntry, 'id' | 'timestamp'> = {
            action: 'draft-accepted',
            description: `Accepted AI-generated draft for section ${params.sectionNumber} (${params.wordCount} words, ${params.citationCount} citations)`,
            documentId: params.documentId,
            documentType: params.documentType,
            documentTitle: params.documentTitle,
            sectionId: params.sectionId,
            sectionNumber: params.sectionNumber,
            sectionTitle: params.sectionTitle,
            userId: params.userId,
            userName: params.userName,
            changeType: 'update',
            metadata: {
              wordCount: params.wordCount,
              citationCount: params.citationCount,
            },
          };
          
          return get().addEntry(entry);
        },
        
        logDraftDiscarded: (params) => {
          const entry: Omit<AuditEntry, 'id' | 'timestamp'> = {
            action: 'draft-discarded',
            description: `Discarded AI-generated draft for section ${params.sectionNumber}`,
            documentId: params.documentId,
            documentType: params.documentType,
            documentTitle: params.documentTitle,
            sectionId: params.sectionId,
            sectionNumber: params.sectionNumber,
            sectionTitle: params.sectionTitle,
            userId: params.userId,
            userName: params.userName,
            changeType: 'delete',
          };
          
          return get().addEntry(entry);
        },
        
        logContentEdit: (params) => {
          const entry: Omit<AuditEntry, 'id' | 'timestamp'> = {
            action: 'content-edited',
            description: params.editSummary 
              ? `Edited section ${params.sectionNumber}: ${params.editSummary}`
              : `Edited section ${params.sectionNumber} (${params.previousWordCount} → ${params.newWordCount} words)`,
            documentId: params.documentId,
            documentType: params.documentType,
            documentTitle: params.documentTitle,
            sectionId: params.sectionId,
            sectionNumber: params.sectionNumber,
            sectionTitle: params.sectionTitle,
            userId: params.userId,
            userName: params.userName,
            changeType: 'update',
            metadata: {
              previousWordCount: params.previousWordCount,
              newWordCount: params.newWordCount,
              editSummary: params.editSummary,
            },
          };
          
          return get().addEntry(entry);
        },
        
        getEntriesForDocument: (documentId) => {
          return get().entries.filter(e => e.documentId === documentId);
        },
        
        getEntriesForSection: (sectionId) => {
          return get().entries.filter(e => e.sectionId === sectionId);
        },
        
        getAIGenerations: (documentId) => {
          return get().entries.filter(e => 
            (e.action === 'ai-generation' || e.action === 'ai-regeneration') &&
            (!documentId || e.documentId === documentId)
          );
        },
        
        filterEntries: (filter) => {
          return get().entries.filter(e => {
            if (filter.documentId && e.documentId !== filter.documentId) return false;
            if (filter.sectionId && e.sectionId !== filter.sectionId) return false;
            if (filter.userId && e.userId !== filter.userId) return false;
            if (filter.actions && !filter.actions.includes(e.action)) return false;
            if (filter.dateFrom && e.timestamp < filter.dateFrom) return false;
            if (filter.dateTo && e.timestamp > filter.dateTo) return false;
            if (filter.aiOnly && !e.aiDetails) return false;
            return true;
          });
        },
        
        exportAuditTrail: (documentId) => {
          const entries = get().getEntriesForDocument(documentId);
          
          const exportData = {
            exportedAt: new Date().toISOString(),
            documentId,
            entryCount: entries.length,
            entries: entries.map(e => ({
              ...e,
              timestamp: e.timestamp.toISOString(),
            })),
          };
          
          return JSON.stringify(exportData, null, 2);
        },
        
        // Platform-wide audit methods
        refreshPlatformEntries: () => {
          const entries = auditService.getAll();
          set({ platformEntries: entries }, false, 'refreshPlatformEntries');
        },
        
        getPlatformEntries: (filter) => {
          return filter ? auditService.filter(filter) : auditService.getAll();
        },
        
        getPlatformStatistics: (filter) => {
          return auditService.getStatistics(filter);
        },
        
        exportPlatformAudit: (filter, format = 'json') => {
          return auditService.export(filter, format);
        },
        
        getEntriesForTarget: (targetType, targetId) => {
          return auditService.getForTarget(targetType, targetId);
        },
        
        getEntriesForCorrelation: (correlationId) => {
          return auditService.getByCorrelationId(correlationId);
        },
        
        // UI Actions
        setSelectedEntry: (entryId) => {
          set({ selectedEntryId: entryId }, false, 'setSelectedEntry');
        },
        
        setFilter: (filter) => {
          set((state) => ({
            filterState: { ...state.filterState, ...filter },
          }), false, 'setFilter');
        },
        
        clearFilter: () => {
          set({ filterState: {} }, false, 'clearFilter');
        },
        
        clearEntries: () => {
          set({ entries: [], platformEntries: [] }, false, 'clearEntries');
          auditService.clear();
        },
      }),
      {
        name: 'ligature-audit-trail',
        partialize: (state) => ({ entries: state.entries.slice(0, 1000) }), // Persist only last 1000
      }
    ),
    { name: 'AuditStore' }
  )
);

// Helper to map legacy actions to platform actions
function mapLegacyAction(action: AuditAction): AuditActionType {
  const mapping: Record<AuditAction, AuditActionType> = {
    'ai-generation': 'ai.generated',
    'ai-regeneration': 'ai.regenerated',
    'draft-accepted': 'ai.draft.accepted',
    'draft-discarded': 'ai.draft.discarded',
    'content-edited': 'section.updated',
    'source-linked': 'document.updated',
    'source-unlinked': 'document.updated',
    'status-changed': 'document.updated',
    'review-submitted': 'document.updated',
    'review-completed': 'document.approved',
    'comment-added': 'document.updated',
    'comment-resolved': 'document.updated',
  };
  return mapping[action] || 'document.updated';
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

export function useDocumentAuditTrail(documentId: string) {
  const entries = useAuditStore((state) => state.entries);
  return useMemo(() => entries.filter(e => e.documentId === documentId), [entries, documentId]);
}

export function useSectionAuditTrail(sectionId: string) {
  const entries = useAuditStore((state) => state.entries);
  return useMemo(() => entries.filter(e => e.sectionId === sectionId), [entries, sectionId]);
}

export function useAIGenerationHistory(documentId?: string) {
  const entries = useAuditStore((state) => state.entries);
  return useMemo(() => entries.filter(e => 
    (e.action === 'ai-generation' || e.action === 'ai-regeneration') &&
    (!documentId || e.documentId === documentId)
  ), [entries, documentId]);
}

// Platform-wide audit hooks
export function usePlatformAudit(filter?: ServiceAuditFilter) {
  const getPlatformEntries = useAuditStore((state) => state.getPlatformEntries);
  return useMemo(() => getPlatformEntries(filter), [getPlatformEntries, filter]);
}

export function usePlatformAuditStatistics(filter?: ServiceAuditFilter) {
  const getPlatformStatistics = useAuditStore((state) => state.getPlatformStatistics);
  return useMemo(() => getPlatformStatistics(filter), [getPlatformStatistics, filter]);
}

export function useTargetAuditTrail(targetType: string, targetId: string) {
  const getEntriesForTarget = useAuditStore((state) => state.getEntriesForTarget);
  return useMemo(() => getEntriesForTarget(targetType, targetId), [getEntriesForTarget, targetType, targetId]);
}

export function useCorrelatedAuditEntries(correlationId: string) {
  const getEntriesForCorrelation = useAuditStore((state) => state.getEntriesForCorrelation);
  return useMemo(() => getEntriesForCorrelation(correlationId), [getEntriesForCorrelation, correlationId]);
}

export function useAuditFilter() {
  const filterState = useAuditStore((state) => state.filterState);
  const setFilter = useAuditStore((state) => state.setFilter);
  const clearFilter = useAuditStore((state) => state.clearFilter);
  return useMemo(() => ({ filterState, setFilter, clearFilter }), [filterState, setFilter, clearFilter]);
}

// Re-export the audit service for direct access when needed
export { auditService } from '@/services/audit-service';
