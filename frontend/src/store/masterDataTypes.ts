
/**
 * Master Data Types - Store Layer
 * 
 * RE-EXPORTS from @/domains/master-data (single source of truth)
 * Store-specific types (State, Actions) defined locally.
 * 
 * @module store/masterDataTypes
 * @version 0.27.44
 */

// =============================================================================
// RE-EXPORTS FROM DOMAIN (Single Source of Truth)
// =============================================================================

export {
  // Common types
  type MasterDataDomain,
  type EntityStatus,
  type DataQualityLevel,
  type GovernanceRole,
  type MatchConfidence,
  type ChangeRequestStatus,
  type ValidationSeverity,
  type ReferenceDataType,
  
  // Organization types
  type Organization,
  type OrganizationType,
  type IndustryClassification,
  type OrganizationRelationship,
  type OrganizationRelationshipType,
  type Address,
  type Certification,
  type License,
  
  // Contact types
  type Contact,
  type ContactRole,
  type ContactRoleType,
  type ContactRelationship,
  
  // Site types
  type Site,
  type SiteType,
  type SiteCategory,
  type SiteContact,
  type SiteRegulatoryIdentifier,
  type SiteCapability,
  type SiteEquipment,
  type SiteStudyParticipation,
  type SitePerformanceMetrics,
  
  // Product types
  type Product,
  type ProductType,
  type ProductCategory,
  type DevelopmentPhase,
  type BrandName,
  type ProductSubstance,
  type ProductRegulatoryStatus,
  type ProductIndication,
  type ProductRelationship,
  
  // Substance types
  type Substance,
  type SubstanceClass,
  type SubstanceProperty,
  type SubstanceRelationship,
  
  // Reference data types
  type ReferenceDataSet,
  type ReferenceDataValue,
  type ExternalMapping,
  type ReferenceDataMapping,
  type MappingRule,
  
  // Governance types
  type DataGovernancePolicy,
  type PolicyType,
  type GovernanceRule,
  type DataStewardAssignment,
  
  // Quality types
  type DataQualityRule,
  type QualityRuleType,
  type DataQualityResult,
  type DataQualityScore,
  
  // Change management types
  type MasterDataChangeRequest,
  type ChangeType,
  type ProposedChange,
  type ChangeImpactAssessment,
  type ChangeApprover,
  type ApprovalHistoryEntry,
  
  // Matching types
  type MatchingProfile,
  type MatchRule,
  type MatchType,
  type BlockingRule,
  type MatchCandidate,
  type FieldMatch,
  type MergeRecord,
  type FieldResolution,
  
  // Integration types
  type MasterDataLink,
  type SyncConflict,
  
  // Analytics types
  type MasterDataAnalytics,
  type QualityTrendPoint,
  
  // UI types
  type MasterDataView,
  type MasterDataFilters,
  type SearchResult,
  
  // Utility functions
  getQualityLevelFromScore,
  getConfidenceFromScore,
  isEntityActive,
  canEditEntity,
  formatEntityId,
} from '@/domains/master-data/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (Local Definitions)
// =============================================================================

import type {
  Organization,
  OrganizationRelationship,
  Contact,
  ContactRole,
  Site,
  Product,
  ProductIndication,
  ProductRegulatoryStatus,
  Substance,
  ReferenceDataSet,
  ReferenceDataValue,
  ReferenceDataMapping,
  DataGovernancePolicy,
  DataStewardAssignment,
  DataQualityRule,
  DataQualityResult,
  DataQualityScore,
  MasterDataChangeRequest,
  MatchingProfile,
  MatchCandidate,
  MergeRecord,
  MasterDataLink,
  SyncConflict,
  MasterDataAnalytics,
  MasterDataView,
  MasterDataFilters,
  MasterDataDomain,
  FieldResolution,
  SearchResult,
} from '@/domains/master-data/contracts';

export interface MasterDataState {
  // Core Entities
  organizations: Record<string, Organization>;
  organizationsByOrgId: Record<string, string>;
  contacts: Record<string, Contact>;
  contactsByContactId: Record<string, string>;
  sites: Record<string, Site>;
  sitesBySiteId: Record<string, string>;
  products: Record<string, Product>;
  productsByProductId: Record<string, string>;
  substances: Record<string, Substance>;
  substancesBySubstanceId: Record<string, string>;
  
  // Reference Data
  referenceSets: Record<string, ReferenceDataSet>;
  referenceValues: Record<string, ReferenceDataValue[]>;
  
  // Governance
  policies: Record<string, DataGovernancePolicy>;
  stewardAssignments: Record<string, DataStewardAssignment>;
  
  // Quality
  qualityRules: Record<string, DataQualityRule>;
  qualityResults: Record<string, DataQualityResult[]>;
  qualityScores: Record<string, DataQualityScore>;
  
  // Change Management
  changeRequests: Record<string, MasterDataChangeRequest>;
  changeRequestsByEntity: Record<string, string[]>;
  
  // Matching
  matchingProfiles: Record<string, MatchingProfile>;
  matchCandidates: Record<string, MatchCandidate>;
  mergeRecords: Record<string, MergeRecord>;
  
  // Cross-Module
  masterDataLinks: Record<string, MasterDataLink>;
  linksByEntity: Record<string, string[]>;
  syncConflicts: Record<string, SyncConflict>;
  
  // Analytics
  analytics: MasterDataAnalytics | null;
  
  // UI State
  selectedOrganizationId: string | null;
  selectedContactId: string | null;
  selectedSiteId: string | null;
  selectedProductId: string | null;
  selectedSubstanceId: string | null;
  selectedChangeRequestId: string | null;
  activeView: MasterDataView;
  filters: MasterDataFilters;
  isLoading: boolean;
  error: string | null;
}

export interface MasterDataActions {
  // Organization CRUD
  createOrganization: (data: Partial<Organization>) => Organization;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  archiveOrganization: (id: string, reason: string) => void;
  addOrganizationRelationship: (orgId: string, relationship: Partial<OrganizationRelationship>) => OrganizationRelationship;
  removeOrganizationRelationship: (orgId: string, relationshipId: string) => void;
  
  // Contact CRUD
  createContact: (data: Partial<Contact>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  archiveContact: (id: string, reason: string) => void;
  addContactRole: (contactId: string, role: Partial<ContactRole>) => ContactRole;
  removeContactRole: (contactId: string, roleId: string) => void;
  
  // Site CRUD
  createSite: (data: Partial<Site>) => Site;
  updateSite: (id: string, updates: Partial<Site>) => void;
  archiveSite: (id: string, reason: string) => void;
  qualifySite: (siteId: string, qualifiedBy: string) => void;
  disqualifySite: (siteId: string, reason: string, disqualifiedBy: string) => void;
  
  // Product CRUD
  createProduct: (data: Partial<Product>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  archiveProduct: (id: string, reason: string) => void;
  addProductIndication: (productId: string, indication: Partial<ProductIndication>) => ProductIndication;
  updateRegulatoryStatus: (productId: string, status: Partial<ProductRegulatoryStatus>) => void;
  
  // Substance CRUD
  createSubstance: (data: Partial<Substance>) => Substance;
  updateSubstance: (id: string, updates: Partial<Substance>) => void;
  archiveSubstance: (id: string, reason: string) => void;
  
  // Reference Data
  createReferenceDataSet: (data: Partial<ReferenceDataSet>) => ReferenceDataSet;
  updateReferenceDataSet: (id: string, updates: Partial<ReferenceDataSet>) => void;
  addReferenceValue: (dataSetId: string, value: Partial<ReferenceDataValue>) => ReferenceDataValue;
  updateReferenceValue: (dataSetId: string, valueId: string, updates: Partial<ReferenceDataValue>) => void;
  deprecateReferenceValue: (dataSetId: string, valueId: string) => void;
  createReferenceMapping: (sourceId: string, targetId: string) => ReferenceDataMapping;
  
  // Governance
  createPolicy: (data: Partial<DataGovernancePolicy>) => DataGovernancePolicy;
  updatePolicy: (id: string, updates: Partial<DataGovernancePolicy>) => void;
  assignSteward: (assignment: Partial<DataStewardAssignment>) => DataStewardAssignment;
  removeStewardAssignment: (id: string) => void;
  
  // Quality
  createQualityRule: (data: Partial<DataQualityRule>) => DataQualityRule;
  updateQualityRule: (id: string, updates: Partial<DataQualityRule>) => void;
  executeQualityRules: (domain: MasterDataDomain, entityId?: string) => DataQualityResult[];
  resolveQualityIssue: (resultId: string, resolvedBy: string, notes?: string) => void;
  calculateQualityScore: (domain: MasterDataDomain, entityId?: string) => DataQualityScore;
  
  // Change Requests
  createChangeRequest: (data: Partial<MasterDataChangeRequest>) => MasterDataChangeRequest;
  updateChangeRequest: (id: string, updates: Partial<MasterDataChangeRequest>) => void;
  submitChangeRequest: (id: string) => void;
  approveChangeRequest: (id: string, approverId: string, comments?: string) => void;
  rejectChangeRequest: (id: string, approverId: string, reason: string) => void;
  implementChangeRequest: (id: string, implementedBy: string) => void;
  
  // Matching
  createMatchingProfile: (data: Partial<MatchingProfile>) => MatchingProfile;
  findMatches: (entityType: string, entityId: string) => MatchCandidate[];
  reviewMatchCandidate: (candidateId: string, decision: 'confirmed-match' | 'rejected', reviewedBy: string, notes?: string) => void;
  mergeEntities: (survivorId: string, mergedIds: string[], resolutions: FieldResolution[], mergedBy: string) => MergeRecord;
  undoMerge: (mergeRecordId: string, undoneBy: string) => void;
  
  // Cross-Module Integration
  linkToModule: (masterEntityId: string, moduleType: MasterDataLink['moduleType'], moduleEntityId: string) => MasterDataLink;
  unlinkFromModule: (linkId: string) => void;
  syncWithModule: (linkId: string) => void;
  resolveConflict: (conflictId: string, resolution: 'use-master' | 'use-module' | 'custom', customValue?: unknown, resolvedBy?: string) => void;
  
  // Analytics
  calculateAnalytics: () => MasterDataAnalytics;
  
  // Search
  searchEntities: (query: string, domains?: MasterDataDomain[]) => SearchResult[];
  
  // UI Actions
  setSelectedOrganizationId: (id: string | null) => void;
  setSelectedContactId: (id: string | null) => void;
  setSelectedSiteId: (id: string | null) => void;
  setSelectedProductId: (id: string | null) => void;
  setSelectedSubstanceId: (id: string | null) => void;
  setSelectedChangeRequestId: (id: string | null) => void;
  setActiveView: (view: MasterDataView) => void;
  setFilters: (filters: Partial<MasterDataFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}
