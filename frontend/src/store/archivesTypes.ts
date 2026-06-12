
/**
 * R&D Archives Repository - Store Types
 * 
 * RE-EXPORTS from @/domains/archives (single source of truth)
 * Store-specific types (State, Actions) defined locally.
 * 
 * @module store/archivesTypes
 * @version 0.27.44
 */

// =============================================================================
// RE-EXPORTS FROM DOMAIN (Single Source of Truth)
// =============================================================================

export {
  // Document types
  type ArchiveDocumentType,
  type ArchiveDocumentStatus,
  
  // Study types
  type ArchiveStudyType,
  type ArchiveStudyStatus,
  
  // Specimen types
  type SpecimenType,
  type SpecimenStatus,
  type StorageCondition,
  
  // Retention types
  type RetentionBasis,
  type RetentionRecordType,
  
  // Audit types
  type ArchiveAuditEventType,
  
  // Core entities
  type ArchivedDocument,
  type ArchivedStudy,
  type Specimen,
  type CustodyEvent,
  type RetentionSchedule,
  type ArchiveAuditEntry,
  
  // Dashboard types
  type ArchiveDashboardMetrics,
  type ArchiveTypeBreakdown,
  type RecentArchiveActivity,
  type ArchiveHealthMetrics,
  type ArchiveActionItem,
  
  // Filter types
  type ArchiveFilters,
  
  // UI types
  type ArchiveTab,
  
  // Constants
  ARCHIVE_DOCUMENT_TYPE_LABELS,
  ARCHIVE_DOCUMENT_STATUS_LABELS,
  ARCHIVE_STUDY_TYPE_LABELS,
  SPECIMEN_TYPE_LABELS,
  STORAGE_CONDITION_LABELS,
  RETENTION_BASIS_LABELS,
  
  // Utility functions
  isDocumentAccessible,
  isDocumentOnHold,
  isRetentionExpiring,
  isRetentionExpired,
  isSpecimenUsable,
  calculateStorageUtilization,
  formatRetentionPeriod,
  getRetentionExpiryDate,
} from '@/domains/archives/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (Local Definitions)
// =============================================================================

import type {
  ArchivedDocument,
  ArchivedStudy,
  Specimen,
  RetentionSchedule,
  ArchiveAuditEntry,
  ArchiveDashboardMetrics,
  ArchiveActionItem,
  ArchiveHealthMetrics,
  ArchiveFilters,
  ArchiveTab,
} from '@/domains/archives/contracts';

export interface ArchivesState {
  // UI State
  activeTab: ArchiveTab;
  filters: ArchiveFilters;
  isLoading: boolean;
  error: string | null;
  
  // Data
  documents: ArchivedDocument[];
  studies: ArchivedStudy[];
  specimens: Specimen[];
  schedules: RetentionSchedule[];
  auditEntries: ArchiveAuditEntry[];
  
  // Dashboard
  metrics: ArchiveDashboardMetrics;
  actionItems: ArchiveActionItem[];
  healthMetrics: ArchiveHealthMetrics;
  
  // Selection
  selectedDocumentId: string | null;
  selectedStudyId: string | null;
  selectedSpecimenId: string | null;
}

export interface ArchivesActions {
  // Tab navigation
  setActiveTab: (tab: ArchiveTab) => void;
  
  // Filters
  setFilters: (filters: Partial<ArchiveFilters>) => void;
  clearFilters: () => void;
  
  // Selection
  selectDocument: (id: string | null) => void;
  selectStudy: (id: string | null) => void;
  selectSpecimen: (id: string | null) => void;
  
  // Data operations
  refreshData: () => Promise<void>;
}
