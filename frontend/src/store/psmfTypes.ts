
/**
 * PSMF Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/psmf/contracts
 * Pharmacovigilance System Master File - GVP Module II compliance.
 * 
 * @version 0.27.43
 */

// Re-export all types from PSMF domain contracts
export {
  // QPPV types
  type QPPVStatus,
  type QPPVType,
  type QPPV,
  type DelegatedActivity,
  
  // Organization types
  type OrganizationalUnit,
  
  // System types
  type SystemCategory,
  type SystemStatus,
  type ValidationStatus,
  type HostingType,
  type ComputerizedSystem,
  type SystemInterface,
  
  // Process & SOP types
  type SOPCategory,
  type SOPStatus,
  type PVProcess,
  type ProcessKPI,
  type SOP,
  
  // Audit types
  type AuditType,
  type AuditStatus,
  type FindingSeverity,
  type FindingStatus,
  type PVAudit,
  type AuditFinding,
  
  // Service provider types
  type ServiceProviderType,
  type ContractStatus,
  type ServiceProvider,
  
  // Product types
  type AuthorizedProduct,
  
  // Document types
  type PSMFSection,
  type PSMFDocumentStatus,
  type PSMFDocument,
  type PSMFSectionContent,
  
  // Metrics types
  type PSMFComplianceMetrics,
  
  // UI types
  type PSMFView,
  type PSMFFilters,
  
  // Constants
  PSMF_VIEW_LABELS,
  PSMF_SECTION_LABELS,
  QPPV_STATUS_LABELS,
  SYSTEM_CATEGORY_LABELS,
  SOP_CATEGORY_LABELS,
  FINDING_SEVERITY_LABELS,
  
  // Utilities
  isQPPVActive,
  isPrimaryQPPV,
  isSystemValidated,
  isSystemOperational,
  isSOPEffective,
  isSOPOverdueForReview,
  isFindingOpen,
  isFindingCritical,
  isFindingOverdue,
  isProviderQualified,
  isProviderContractActive,
  calculateComplianceScore,
} from '@/domains/psmf/contracts';

// Re-import types needed for store-specific types
import type {
  QPPV,
  OrganizationalUnit,
  ComputerizedSystem,
  SystemInterface,
  PVProcess,
  SOP,
  PVAudit,
  AuditFinding,
  ServiceProvider,
  AuthorizedProduct,
  PSMFDocument,
  PSMFSectionContent,
  PSMFSection,
  PSMFComplianceMetrics,
  PSMFView,
  PSMFFilters,
  SOPStatus,
  SOPCategory,
  SystemStatus,
  SystemCategory,
  AuditStatus,
  FindingStatus,
  FindingSeverity,
  ServiceProviderType,
} from '@/domains/psmf/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (not in domain contracts)
// =============================================================================

export interface PSMFState {
  // QPPV
  qppvs: Record<string, QPPV>;
  selectedQppvId: string | null;
  
  // Organization
  organizationalUnits: Record<string, OrganizationalUnit>;
  selectedOrgUnitId: string | null;
  
  // Systems
  computerizedSystems: Record<string, ComputerizedSystem>;
  systemInterfaces: Record<string, SystemInterface>;
  selectedSystemId: string | null;
  
  // Processes & SOPs
  pvProcesses: Record<string, PVProcess>;
  sops: Record<string, SOP>;
  selectedProcessId: string | null;
  selectedSopId: string | null;
  
  // Audits
  audits: Record<string, PVAudit>;
  selectedAuditId: string | null;
  
  // Service providers
  serviceProviders: Record<string, ServiceProvider>;
  selectedProviderId: string | null;
  
  // Products
  authorizedProducts: Record<string, AuthorizedProduct>;
  selectedProductId: string | null;
  
  // PSMF Document
  psmfDocuments: Record<string, PSMFDocument>;
  activePsmfId: string | null;
  
  // Metrics
  complianceMetrics: PSMFComplianceMetrics | null;
  
  // UI
  view: PSMFView;
  filters: PSMFFilters;
  isLoading: boolean;
  error: string | null;
}

export interface PSMFActions {
  // QPPV management
  createQPPV: (qppv: Omit<QPPV, 'id' | 'createdAt' | 'updatedAt'>) => QPPV;
  updateQPPV: (id: string, updates: Partial<QPPV>) => void;
  deleteQPPV: (id: string) => void;
  selectQPPV: (id: string | null) => void;
  
  // Organization
  createOrgUnit: (unit: Omit<OrganizationalUnit, 'id' | 'createdAt' | 'updatedAt'>) => OrganizationalUnit;
  updateOrgUnit: (id: string, updates: Partial<OrganizationalUnit>) => void;
  deleteOrgUnit: (id: string) => void;
  selectOrgUnit: (id: string | null) => void;
  
  // Systems
  createSystem: (system: Omit<ComputerizedSystem, 'id' | 'createdAt' | 'updatedAt'>) => ComputerizedSystem;
  updateSystem: (id: string, updates: Partial<ComputerizedSystem>) => void;
  deleteSystem: (id: string) => void;
  selectSystem: (id: string | null) => void;
  createInterface: (iface: Omit<SystemInterface, 'id' | 'createdAt' | 'updatedAt'>) => SystemInterface;
  
  // Processes & SOPs
  createProcess: (process: Omit<PVProcess, 'id' | 'createdAt' | 'updatedAt'>) => PVProcess;
  updateProcess: (id: string, updates: Partial<PVProcess>) => void;
  deleteProcess: (id: string) => void;
  selectProcess: (id: string | null) => void;
  createSOP: (sop: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>) => SOP;
  updateSOP: (id: string, updates: Partial<SOP>) => void;
  deleteSOP: (id: string) => void;
  selectSOP: (id: string | null) => void;
  
  // Audits
  createAudit: (audit: Omit<PVAudit, 'id' | 'createdAt' | 'updatedAt'>) => PVAudit;
  updateAudit: (id: string, updates: Partial<PVAudit>) => void;
  deleteAudit: (id: string) => void;
  selectAudit: (id: string | null) => void;
  addFinding: (auditId: string, finding: Omit<AuditFinding, 'id' | 'auditId' | 'createdAt' | 'updatedAt'>) => AuditFinding;
  updateFinding: (auditId: string, findingId: string, updates: Partial<AuditFinding>) => void;
  closeFinding: (auditId: string, findingId: string, verificationNotes: string) => void;
  
  // Service providers
  createProvider: (provider: Omit<ServiceProvider, 'id' | 'createdAt' | 'updatedAt'>) => ServiceProvider;
  updateProvider: (id: string, updates: Partial<ServiceProvider>) => void;
  deleteProvider: (id: string) => void;
  selectProvider: (id: string | null) => void;
  
  // Products
  linkProduct: (product: Omit<AuthorizedProduct, 'id' | 'createdAt' | 'updatedAt'>) => AuthorizedProduct;
  updateProduct: (id: string, updates: Partial<AuthorizedProduct>) => void;
  unlinkProduct: (id: string) => void;
  selectProduct: (id: string | null) => void;
  
  // PSMF Document
  createPSMFDocument: (version: string, authorId: string, authorName: string) => PSMFDocument;
  updatePSMFSection: (psmfId: string, section: PSMFSection, updates: Partial<PSMFSectionContent>) => void;
  approvePSMF: (psmfId: string, approverId: string, approverName: string) => void;
  qppvSignoff: (psmfId: string) => void;
  archivePSMF: (psmfId: string) => void;
  
  // Metrics
  calculateComplianceMetrics: () => PSMFComplianceMetrics;
  
  // UI
  setView: (view: PSMFView) => void;
  setFilters: (filters: Partial<PSMFFilters>) => void;
  clearFilters: () => void;
  
  // Queries
  getQPPVs: () => QPPV[];
  getPrimaryQPPV: () => QPPV | null;
  getSystemsByCategory: (category: SystemCategory) => ComputerizedSystem[];
  getSOPsByCategory: (category: SOPCategory) => SOP[];
  getSOPsNeedingReview: () => SOP[];
  getOpenFindings: () => AuditFinding[];
  getCriticalFindings: () => AuditFinding[];
  getActiveProviders: () => ServiceProvider[];
  getProductsInPSMF: () => AuthorizedProduct[];
}
