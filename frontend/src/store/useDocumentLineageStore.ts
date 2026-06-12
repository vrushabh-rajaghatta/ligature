

/**
 * Document Lineage Store
 * ======================
 * Zustand store for tracking document references across modules.
 * Enables the "R&D Connected" vision with full provenance and version awareness.
 * 
 * @version 0.14.2
 * @since 2026-01-08
 */

import { create } from 'zustand';
import type {
  DocumentReference,
  DocumentReferenceType,
  ProvenanceMetadata,
  ReferenceContext,
  DocumentVersionInfo,
  CustodyEvent,
  VersionComparisonResult,
  StalenessConfig,
  DocumentReferenceFilter,
  DocumentReferenceSortOptions,
  LineageEvent,
  LineageEventType,
  LineageModule,
  LineageDocumentType,
  CreateDocumentReference,
  UpdateDocumentReference,
  ModuleReferenceSummary,
  DocumentReferenceSummary,
} from '@/types/document-lineage';

// =============================================================================
// STORE STATE INTERFACE
// =============================================================================

interface DocumentLineageState {
  // Data
  references: DocumentReference[];
  versionRegistry: Map<string, DocumentVersionInfo[]>; // sourceDocumentId -> versions
  custodyChains: Map<string, CustodyEvent[]>; // sourceDocumentId -> custody events
  events: LineageEvent[];
  
  // Configuration
  stalenessConfig: StalenessConfig;
  
  // UI State
  selectedDocumentId: string | null;
  expandedModules: LineageModule[];
  filters: DocumentReferenceFilter;
  sortOptions: DocumentReferenceSortOptions;
  isLoading: boolean;
  error: string | null;
  
  // CRUD Actions
  addReference: (ref: CreateDocumentReference) => DocumentReference;
  updateReference: (update: UpdateDocumentReference) => void;
  removeReference: (id: string) => void;
  
  // Version Management
  registerVersion: (sourceDocumentId: string, version: DocumentVersionInfo) => void;
  getCurrentVersion: (sourceDocumentId: string) => string | null;
  getVersionHistory: (sourceDocumentId: string) => DocumentVersionInfo[];
  
  // Custody Chain
  addCustodyEvent: (sourceDocumentId: string, event: Omit<CustodyEvent, 'id'>) => void;
  getCustodyChain: (sourceDocumentId: string) => CustodyEvent[];
  
  // Comparison & Staleness
  compareVersions: (referenceId: string) => VersionComparisonResult | null;
  getStaleReferences: () => DocumentReference[];
  updateStalenessConfig: (config: Partial<StalenessConfig>) => void;
  
  // Query & Filter
  getReferencesForDocument: (sourceDocumentId: string) => DocumentReference[];
  getReferencesInModule: (module: LineageModule) => DocumentReference[];
  getReferencesForRecord: (module: LineageModule, recordId: string) => DocumentReference[];
  getCrossModulePresence: (sourceDocumentId: string) => ReferenceContext[];
  getFilteredReferences: () => DocumentReference[];
  
  // Summaries
  getModuleSummary: (module: LineageModule) => ModuleReferenceSummary;
  getDocumentSummary: (sourceDocumentId: string) => DocumentReferenceSummary | null;
  
  // UI Actions
  setSelectedDocument: (id: string | null) => void;
  toggleModuleExpanded: (module: LineageModule) => void;
  setFilters: (filters: DocumentReferenceFilter) => void;
  setSortOptions: (options: DocumentReferenceSortOptions) => void;
  clearFilters: () => void;
  
  // Freeze/Hold Management
  freezeReference: (id: string, reason: string) => void;
  unfreezeReference: (id: string) => void;
  applyRegulatoryHold: (id: string) => void;
  releaseRegulatoryHold: (id: string) => void;
  
  // Event Log
  getEvents: (filter?: { referenceId?: string; type?: LineageEventType }) => LineageEvent[];
  
  // Reset
  reset: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseVersion(version: string): number[] {
  return version.split('.').map(v => parseInt(v, 10) || 0);
}

function compareVersionStrings(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function countVersionsBehind(current: string, referenced: string): number {
  // Simple heuristic: compare major.minor
  const currentParts = parseVersion(current);
  const referencedParts = parseVersion(referenced);
  
  const majorDiff = (currentParts[0] || 0) - (referencedParts[0] || 0);
  const minorDiff = (currentParts[1] || 0) - (referencedParts[1] || 0);
  
  return Math.max(0, majorDiff * 10 + minorDiff);
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultStalenessConfig: StalenessConfig = {
  minorUpdateThresholdDays: 30,
  criticalThresholdDays: 90,
  alwaysWarnTypes: ['protocol', 'investigator-brochure', 'informed-consent', 'sop'],
};

const defaultFilters: DocumentReferenceFilter = {};

const defaultSortOptions: DocumentReferenceSortOptions = {
  field: 'referencedAt',
  direction: 'desc',
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockVersionRegistry = new Map<string, DocumentVersionInfo[]>([
  ['doc-prot-xyz-001', [
    { version: '1.0', createdAt: '2025-01-15T10:00:00Z', createdBy: 'john.doe@company.com', status: 'superseded' },
    { version: '2.0', createdAt: '2025-04-01T10:00:00Z', createdBy: 'john.doe@company.com', status: 'superseded' },
    { version: '2.3', createdAt: '2025-06-15T10:00:00Z', createdBy: 'jane.smith@company.com', status: 'superseded' },
    { version: '2.5', createdAt: '2025-09-01T10:00:00Z', createdBy: 'jane.smith@company.com', status: 'effective', effectiveDate: '2025-09-15' },
  ]],
  ['doc-ib-xyz-001', [
    { version: '1.0', createdAt: '2025-02-01T10:00:00Z', createdBy: 'medical.writer@company.com', status: 'superseded' },
    { version: '2.0', createdAt: '2025-08-01T10:00:00Z', createdBy: 'medical.writer@company.com', status: 'effective', effectiveDate: '2025-08-15' },
  ]],
  ['doc-sop-001', [
    { version: '1.0', createdAt: '2024-01-01T10:00:00Z', createdBy: 'qa.manager@company.com', status: 'superseded' },
    { version: '1.1', createdAt: '2024-06-01T10:00:00Z', createdBy: 'qa.manager@company.com', status: 'superseded' },
    { version: '2.0', createdAt: '2025-01-01T10:00:00Z', createdBy: 'qa.manager@company.com', status: 'effective', effectiveDate: '2025-01-15', expiryDate: '2027-01-15' },
  ]],
  ['doc-csr-xyz-001', [
    { version: '1.0', createdAt: '2025-11-01T10:00:00Z', createdBy: 'medical.writer@company.com', status: 'draft' },
  ]],
]);

const mockReferences: DocumentReference[] = [
  // Protocol references
  {
    id: 'ref-001',
    sourceDocumentId: 'doc-prot-xyz-001',
    documentTitle: 'Protocol XYZ-001',
    documentType: 'protocol',
    documentNumber: 'PROT-XYZ-001',
    sourceVersion: '2.3',
    currentVersion: '2.5',
    referenceType: 'live',
    context: {
      module: 'tmf',
      recordId: 'study-xyz-001',
      recordName: 'Study XYZ-001',
      purpose: 'study-reference',
      location: 'Zone 01.01',
    },
    referencedAt: '2025-06-20T10:00:00Z',
    referencedBy: 'doc.controller@company.com',
  },
  {
    id: 'ref-002',
    sourceDocumentId: 'doc-prot-xyz-001',
    documentTitle: 'Protocol XYZ-001',
    documentType: 'protocol',
    documentNumber: 'PROT-XYZ-001',
    sourceVersion: '2.0',
    currentVersion: '2.5',
    referenceType: 'frozen',
    context: {
      module: 'submissions',
      recordId: 'ind-2025-001',
      recordName: 'IND-2025-001 Sequence 0003',
      purpose: 'submission-artifact',
      location: 'Module 5.3.5.1',
    },
    referencedAt: '2025-04-15T10:00:00Z',
    referencedBy: 'reg.affairs@company.com',
    freezeReason: 'Frozen at submission',
    regulatoryHold: true,
  },
  {
    id: 'ref-003',
    sourceDocumentId: 'doc-prot-xyz-001',
    documentTitle: 'Protocol XYZ-001',
    documentType: 'protocol',
    documentNumber: 'PROT-XYZ-001',
    sourceVersion: '2.5',
    currentVersion: '2.5',
    referenceType: 'live',
    context: {
      module: 'ctms',
      recordId: 'study-xyz-001',
      recordName: 'Study XYZ-001',
      purpose: 'study-reference',
    },
    referencedAt: '2025-09-05T10:00:00Z',
    referencedBy: 'clinical.ops@company.com',
  },
  // IB references
  {
    id: 'ref-004',
    sourceDocumentId: 'doc-ib-xyz-001',
    documentTitle: 'Investigator Brochure XYZ-001',
    documentType: 'investigator-brochure',
    documentNumber: 'IB-XYZ-001',
    sourceVersion: '2.0',
    currentVersion: '2.0',
    referenceType: 'live',
    context: {
      module: 'tmf',
      recordId: 'study-xyz-001',
      recordName: 'Study XYZ-001',
      purpose: 'study-reference',
      location: 'Zone 01.02',
    },
    referencedAt: '2025-08-20T10:00:00Z',
    referencedBy: 'doc.controller@company.com',
  },
  // SOP references
  {
    id: 'ref-005',
    sourceDocumentId: 'doc-sop-001',
    documentTitle: 'SOP: Adverse Event Reporting',
    documentType: 'sop',
    documentNumber: 'SOP-PV-001',
    sourceVersion: '2.0',
    currentVersion: '2.0',
    referenceType: 'live',
    context: {
      module: 'psmf',
      recordId: 'psmf-main',
      recordName: 'PSMF v1.0',
      purpose: 'compliance-index',
      location: 'Annex C - SOP Index',
    },
    referencedAt: '2025-02-01T10:00:00Z',
    referencedBy: 'pv.manager@company.com',
  },
  {
    id: 'ref-006',
    sourceDocumentId: 'doc-sop-001',
    documentTitle: 'SOP: Adverse Event Reporting',
    documentType: 'sop',
    documentNumber: 'SOP-PV-001',
    sourceVersion: '2.0',
    currentVersion: '2.0',
    referenceType: 'live',
    context: {
      module: 'qms',
      recordId: 'qms-sop-index',
      recordName: 'QMS SOP Registry',
      purpose: 'source-of-truth',
    },
    referencedAt: '2025-01-20T10:00:00Z',
    referencedBy: 'qa.manager@company.com',
  },
  // CSR reference
  {
    id: 'ref-007',
    sourceDocumentId: 'doc-csr-xyz-001',
    documentTitle: 'Clinical Study Report XYZ-001',
    documentType: 'clinical-study-report',
    documentNumber: 'CSR-XYZ-001',
    sourceVersion: '1.0',
    currentVersion: '1.0',
    referenceType: 'live',
    context: {
      module: 'authoring',
      recordId: 'auth-csr-xyz-001',
      recordName: 'CSR Authoring Workspace',
      purpose: 'source-of-truth',
    },
    referencedAt: '2025-11-05T10:00:00Z',
    referencedBy: 'medical.writer@company.com',
  },
];

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useDocumentLineageStore = create<DocumentLineageState>((set, get) => ({
  // Initial State
  references: mockReferences,
  versionRegistry: mockVersionRegistry,
  custodyChains: new Map(),
  events: [],
  stalenessConfig: defaultStalenessConfig,
  selectedDocumentId: null,
  expandedModules: [],
  filters: defaultFilters,
  sortOptions: defaultSortOptions,
  isLoading: false,
  error: null,
  
  // ==========================================================================
  // CRUD Actions
  // ==========================================================================
  
  addReference: (refData: CreateDocumentReference): DocumentReference => {
    const id = generateId('ref');
    const currentVersion = get().getCurrentVersion(refData.sourceDocumentId) || refData.sourceVersion;
    
    const newRef: DocumentReference = {
      ...refData,
      id,
      currentVersion,
      referencedAt: refData.referencedAt || new Date().toISOString(),
    };
    
    set(state => ({
      references: [...state.references, newRef],
      events: [...state.events, {
        id: generateId('evt'),
        type: 'reference-created',
        referenceId: id,
        sourceDocumentId: refData.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: refData.referencedBy,
        module: refData.context.module,
        details: { context: refData.context },
      }],
    }));
    
    return newRef;
  },
  
  updateReference: (update: UpdateDocumentReference): void => {
    set(state => ({
      references: state.references.map(ref =>
        ref.id === update.id ? { ...ref, ...update } : ref
      ),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'reference-updated',
        referenceId: update.id,
        sourceDocumentId: state.references.find(r => r.id === update.id)?.sourceDocumentId || '',
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: state.references.find(r => r.id === update.id)?.context.module || 'document-control',
        details: { update },
      }],
    }));
  },
  
  removeReference: (id: string): void => {
    const ref = get().references.find(r => r.id === id);
    if (!ref) return;
    
    set(state => ({
      references: state.references.filter(r => r.id !== id),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'reference-removed',
        referenceId: id,
        sourceDocumentId: ref.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: ref.context.module,
        details: {},
      }],
    }));
  },
  
  // ==========================================================================
  // Version Management
  // ==========================================================================
  
  registerVersion: (sourceDocumentId: string, version: DocumentVersionInfo): void => {
    set(state => {
      const newRegistry = new Map(state.versionRegistry);
      const versions = newRegistry.get(sourceDocumentId) || [];
      newRegistry.set(sourceDocumentId, [...versions, version]);
      
      // Update currentVersion on all live references
      const newReferences = state.references.map(ref => {
        if (ref.sourceDocumentId === sourceDocumentId && ref.referenceType === 'live') {
          return { ...ref, currentVersion: version.version };
        }
        return ref;
      });
      
      return { versionRegistry: newRegistry, references: newReferences };
    });
  },
  
  getCurrentVersion: (sourceDocumentId: string): string | null => {
    const versions = get().versionRegistry.get(sourceDocumentId);
    if (!versions || versions.length === 0) return null;
    
    // Find the effective version, or the latest by date
    const effective = versions.find(v => v.status === 'effective');
    if (effective) return effective.version;
    
    // Sort by version and return latest
    const sorted = [...versions].sort((a, b) => compareVersionStrings(b.version, a.version));
    return sorted[0]?.version || null;
  },
  
  getVersionHistory: (sourceDocumentId: string): DocumentVersionInfo[] => {
    return get().versionRegistry.get(sourceDocumentId) || [];
  },
  
  // ==========================================================================
  // Custody Chain
  // ==========================================================================
  
  addCustodyEvent: (sourceDocumentId: string, event: Omit<CustodyEvent, 'id'>): void => {
    set(state => {
      const newChains = new Map(state.custodyChains);
      const chain = newChains.get(sourceDocumentId) || [];
      const newEvent: CustodyEvent = { ...event, id: generateId('custody') };
      newChains.set(sourceDocumentId, [...chain, newEvent]);
      return { custodyChains: newChains };
    });
  },
  
  getCustodyChain: (sourceDocumentId: string): CustodyEvent[] => {
    return get().custodyChains.get(sourceDocumentId) || [];
  },
  
  // ==========================================================================
  // Comparison & Staleness
  // ==========================================================================
  
  compareVersions: (referenceId: string): VersionComparisonResult | null => {
    const ref = get().references.find(r => r.id === referenceId);
    if (!ref) return null;
    
    const isCurrent = ref.sourceVersion === ref.currentVersion;
    const versionsBehind = countVersionsBehind(ref.currentVersion, ref.sourceVersion);
    
    let staleness: VersionComparisonResult['staleness'] = 'current';
    let statusMessage = 'Current version';
    
    if (!isCurrent) {
      if (versionsBehind >= 10) {
        staleness = 'critical-update';
        statusMessage = `Critical: ${versionsBehind} versions behind (${ref.sourceVersion} → ${ref.currentVersion})`;
      } else if (versionsBehind >= 3) {
        staleness = 'major-update';
        statusMessage = `Major update available (${ref.sourceVersion} → ${ref.currentVersion})`;
      } else {
        staleness = 'minor-update';
        statusMessage = `Minor update available (${ref.sourceVersion} → ${ref.currentVersion})`;
      }
    }
    
    return {
      isCurrent,
      versionsBehind,
      referencedVersion: ref.sourceVersion,
      currentVersion: ref.currentVersion,
      staleness,
      statusMessage,
    };
  },
  
  getStaleReferences: (): DocumentReference[] => {
    const { references } = get();
    return references.filter(ref => {
      if (ref.referenceType === 'frozen') return false; // Frozen refs are intentionally stale
      return ref.sourceVersion !== ref.currentVersion;
    });
  },
  
  updateStalenessConfig: (config: Partial<StalenessConfig>): void => {
    set(state => ({
      stalenessConfig: { ...state.stalenessConfig, ...config },
    }));
  },
  
  // ==========================================================================
  // Query & Filter
  // ==========================================================================
  
  getReferencesForDocument: (sourceDocumentId: string): DocumentReference[] => {
    return get().references.filter(ref => ref.sourceDocumentId === sourceDocumentId);
  },
  
  getReferencesInModule: (module: LineageModule): DocumentReference[] => {
    return get().references.filter(ref => ref.context.module === module);
  },
  
  getReferencesForRecord: (module: LineageModule, recordId: string): DocumentReference[] => {
    return get().references.filter(
      ref => ref.context.module === module && ref.context.recordId === recordId
    );
  },
  
  getCrossModulePresence: (sourceDocumentId: string): ReferenceContext[] => {
    return get().references
      .filter(ref => ref.sourceDocumentId === sourceDocumentId)
      .map(ref => ref.context);
  },
  
  getFilteredReferences: (): DocumentReference[] => {
    const { references, filters, sortOptions } = get();
    
    let filtered = [...references];
    
    // Apply filters
    if (filters.sourceDocumentId) {
      filtered = filtered.filter(r => r.sourceDocumentId === filters.sourceDocumentId);
    }
    
    if (filters.documentType) {
      const types = Array.isArray(filters.documentType) ? filters.documentType : [filters.documentType];
      filtered = filtered.filter(r => types.includes(r.documentType));
    }
    
    if (filters.module) {
      const modules = Array.isArray(filters.module) ? filters.module : [filters.module];
      filtered = filtered.filter(r => modules.includes(r.context.module));
    }
    
    if (filters.referenceType) {
      const types = Array.isArray(filters.referenceType) ? filters.referenceType : [filters.referenceType];
      filtered = filtered.filter(r => types.includes(r.referenceType));
    }
    
    if (filters.purpose) {
      const purposes = Array.isArray(filters.purpose) ? filters.purpose : [filters.purpose];
      filtered = filtered.filter(r => purposes.includes(r.context.purpose));
    }
    
    if (filters.staleOnly) {
      filtered = filtered.filter(r => r.sourceVersion !== r.currentVersion && r.referenceType !== 'frozen');
    }
    
    if (filters.regulatoryHoldOnly) {
      filtered = filtered.filter(r => r.regulatoryHold);
    }
    
    if (filters.recordId) {
      filtered = filtered.filter(r => r.context.recordId === filters.recordId);
    }
    
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filtered = filtered.filter(r =>
        r.documentTitle.toLowerCase().includes(search) ||
        r.documentNumber.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOptions.field) {
        case 'documentTitle':
          comparison = a.documentTitle.localeCompare(b.documentTitle);
          break;
        case 'documentNumber':
          comparison = a.documentNumber.localeCompare(b.documentNumber);
          break;
        case 'referencedAt':
          comparison = new Date(a.referencedAt).getTime() - new Date(b.referencedAt).getTime();
          break;
        case 'sourceVersion':
          comparison = compareVersionStrings(a.sourceVersion, b.sourceVersion);
          break;
        case 'staleness':
          const aStale = a.sourceVersion !== a.currentVersion ? 1 : 0;
          const bStale = b.sourceVersion !== b.currentVersion ? 1 : 0;
          comparison = aStale - bStale;
          break;
      }
      
      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  },
  
  // ==========================================================================
  // Summaries
  // ==========================================================================
  
  getModuleSummary: (module: LineageModule): ModuleReferenceSummary => {
    const refs = get().getReferencesInModule(module);
    
    return {
      module,
      totalReferences: refs.length,
      liveReferences: refs.filter(r => r.referenceType === 'live').length,
      frozenReferences: refs.filter(r => r.referenceType === 'frozen').length,
      staleReferences: refs.filter(r => r.sourceVersion !== r.currentVersion && r.referenceType !== 'frozen').length,
      documentsWithHold: refs.filter(r => r.regulatoryHold).length,
    };
  },
  
  getDocumentSummary: (sourceDocumentId: string): DocumentReferenceSummary | null => {
    const refs = get().getReferencesForDocument(sourceDocumentId);
    if (refs.length === 0) return null;
    
    const firstRef = refs[0];
    const currentVersion = get().getCurrentVersion(sourceDocumentId) || firstRef.currentVersion;
    
    const modules: LineageModule[] = ['document-control', 'tmf', 'submissions', 'psmf', 'ctms', 'safety', 'qms', 'eln', 'authoring', 'publishing'];
    const byModule = modules.map(module => get().getModuleSummary(module)).filter(s => s.totalReferences > 0);
    
    const dates = refs.map(r => new Date(r.referencedAt).getTime());
    
    return {
      sourceDocumentId,
      documentTitle: firstRef.documentTitle,
      documentNumber: firstRef.documentNumber,
      currentVersion,
      totalReferences: refs.length,
      byModule,
      oldestReference: new Date(Math.min(...dates)).toISOString(),
      newestReference: new Date(Math.max(...dates)).toISOString(),
      hasStaleReferences: refs.some(r => r.sourceVersion !== r.currentVersion && r.referenceType !== 'frozen'),
      hasRegulatoryHolds: refs.some(r => r.regulatoryHold),
    };
  },
  
  // ==========================================================================
  // UI Actions
  // ==========================================================================
  
  setSelectedDocument: (id: string | null): void => {
    set({ selectedDocumentId: id });
  },
  
  toggleModuleExpanded: (module: LineageModule): void => {
    set(state => ({
      expandedModules: state.expandedModules.includes(module)
        ? state.expandedModules.filter(m => m !== module)
        : [...state.expandedModules, module],
    }));
  },
  
  setFilters: (filters: DocumentReferenceFilter): void => {
    set({ filters });
  },
  
  setSortOptions: (options: DocumentReferenceSortOptions): void => {
    set({ sortOptions: options });
  },
  
  clearFilters: (): void => {
    set({ filters: defaultFilters });
  },
  
  // ==========================================================================
  // Freeze/Hold Management
  // ==========================================================================
  
  freezeReference: (id: string, reason: string): void => {
    const ref = get().references.find(r => r.id === id);
    if (!ref) return;
    
    set(state => ({
      references: state.references.map(r =>
        r.id === id ? { ...r, referenceType: 'frozen' as DocumentReferenceType, freezeReason: reason } : r
      ),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'freeze-applied',
        referenceId: id,
        sourceDocumentId: ref.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: ref.context.module,
        details: { reason },
      }],
    }));
  },
  
  unfreezeReference: (id: string): void => {
    const ref = get().references.find(r => r.id === id);
    if (!ref) return;
    
    const currentVersion = get().getCurrentVersion(ref.sourceDocumentId) || ref.currentVersion;
    
    set(state => ({
      references: state.references.map(r =>
        r.id === id ? { ...r, referenceType: 'live' as DocumentReferenceType, freezeReason: undefined, currentVersion } : r
      ),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'freeze-released',
        referenceId: id,
        sourceDocumentId: ref.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: ref.context.module,
        details: {},
      }],
    }));
  },
  
  applyRegulatoryHold: (id: string): void => {
    const ref = get().references.find(r => r.id === id);
    if (!ref) return;
    
    set(state => ({
      references: state.references.map(r =>
        r.id === id ? { ...r, regulatoryHold: true } : r
      ),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'regulatory-hold-applied',
        referenceId: id,
        sourceDocumentId: ref.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: ref.context.module,
        details: {},
      }],
    }));
  },
  
  releaseRegulatoryHold: (id: string): void => {
    const ref = get().references.find(r => r.id === id);
    if (!ref) return;
    
    set(state => ({
      references: state.references.map(r =>
        r.id === id ? { ...r, regulatoryHold: false } : r
      ),
      events: [...state.events, {
        id: generateId('evt'),
        type: 'regulatory-hold-released',
        referenceId: id,
        sourceDocumentId: ref.sourceDocumentId,
        timestamp: new Date().toISOString(),
        actor: 'system',
        module: ref.context.module,
        details: {},
      }],
    }));
  },
  
  // ==========================================================================
  // Event Log
  // ==========================================================================
  
  getEvents: (filter?: { referenceId?: string; type?: LineageEventType }): LineageEvent[] => {
    let events = get().events;
    
    if (filter?.referenceId) {
      events = events.filter(e => e.referenceId === filter.referenceId);
    }
    
    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }
    
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  
  // ==========================================================================
  // Reset
  // ==========================================================================
  
  reset: (): void => {
    set({
      references: mockReferences,
      versionRegistry: mockVersionRegistry,
      custodyChains: new Map(),
      events: [],
      stalenessConfig: defaultStalenessConfig,
      selectedDocumentId: null,
      expandedModules: [],
      filters: defaultFilters,
      sortOptions: defaultSortOptions,
      isLoading: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export const useDocumentReferences = () => useDocumentLineageStore(state => state.references);
export const useSelectedDocument = () => useDocumentLineageStore(state => state.selectedDocumentId);
export const useLineageFilters = () => useDocumentLineageStore(state => state.filters);
export const useStaleReferences = () => useDocumentLineageStore(state => state.getStaleReferences());
