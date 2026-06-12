
/**
 * Master Data Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Master Data Management types in Ligature.
 * 
 * Covers: Organizations, contacts, sites, products, substances, reference data,
 * data governance, quality management, matching/deduplication, and cross-module
 * entity resolution.
 * 
 * Aligned with: IDMP standards, FDA/EMA identifiers, data governance best practices.
 * 
 * @module domains/master-data/contracts
 * @version 0.27.44
 */

// ============================================================================
// COMMON ENUMS & BASE TYPES
// ============================================================================

export type MasterDataDomain = 
  | 'organization' | 'product' | 'substance' | 'indication' | 'study'
  | 'site' | 'person' | 'geography' | 'regulatory' | 'terminology';

export type EntityStatus = 
  | 'draft' | 'pending-review' | 'active' | 'inactive' | 'deprecated' | 'merged' | 'archived';

export type DataQualityLevel = 
  | 'gold' | 'silver' | 'bronze' | 'unverified';

export type GovernanceRole = 
  | 'data-steward' | 'data-owner' | 'data-custodian' | 'domain-expert' | 'approver';

export type MatchConfidence = 
  | 'exact' | 'high' | 'medium' | 'low' | 'possible' | 'no-match';

export type ChangeRequestStatus = 
  | 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'implemented' | 'cancelled';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ReferenceDataType = 
  | 'code-list' | 'controlled-vocabulary' | 'terminology' | 'classification' | 'mapping';

// ============================================================================
// ORGANIZATION MASTER DATA
// ============================================================================

export interface Organization {
  id: string;
  organizationId: string; // Business ID (e.g., ORG-000001)
  
  // Identity
  name: string;
  legalName: string;
  tradingNames: string[];
  abbreviations: string[];
  
  // Classification
  organizationType: OrganizationType;
  industryClassification: IndustryClassification;
  companySize: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  isPublicCompany: boolean;
  stockSymbol?: string;
  stockExchange?: string;
  
  // Regulatory Identifiers
  dunsNumber?: string;
  taxId?: string;
  vatNumber?: string;
  leiNumber?: string; // Legal Entity Identifier
  fdaEstablishmentId?: string;
  eudraVigilanceId?: string;
  healthCanadaCompanyId?: string;
  
  // Hierarchy
  parentOrganizationId?: string;
  ultimateParentId?: string;
  childOrganizationIds: string[];
  affiliateIds: string[];
  
  // Contact Information
  headquarters: Address;
  mailingAddress?: Address;
  billingAddress?: Address;
  primaryContactId?: string;
  
  // Communication
  primaryPhone?: string;
  primaryEmail?: string;
  website?: string;
  
  // Relationships
  relationships: OrganizationRelationship[];
  
  // Business Context
  therapeuticAreas: string[];
  specializations: string[];
  certifications: Certification[];
  licenses: License[];
  
  // Status
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  verificationDate?: string;
  verifiedBy?: string;
  
  // Module Links
  linkedEntities: MasterDataLink[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type OrganizationType = 
  | 'sponsor' | 'cro' | 'vendor' | 'regulatory-authority' | 'health-authority'
  | 'ethics-committee' | 'irb' | 'laboratory' | 'manufacturing-site'
  | 'distribution-center' | 'hospital' | 'clinic' | 'pharmacy'
  | 'academic-institution' | 'research-institution' | 'consulting-firm'
  | 'software-vendor' | 'equipment-supplier' | 'logistics-provider' | 'other';

export type IndustryClassification = 
  | 'pharmaceutical' | 'biotechnology' | 'medical-device' | 'diagnostics'
  | 'consumer-health' | 'generics' | 'biosimilars' | 'cell-gene-therapy'
  | 'digital-health' | 'healthcare-provider' | 'other';

export interface OrganizationRelationship {
  id: string;
  relatedOrganizationId: string;
  relatedOrganizationName: string;
  relationshipType: OrganizationRelationshipType;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  contractId?: string;
  notes?: string;
}

export type OrganizationRelationshipType = 
  | 'parent' | 'subsidiary' | 'affiliate' | 'joint-venture' | 'partner'
  | 'vendor' | 'customer' | 'competitor' | 'licensor' | 'licensee'
  | 'contractor' | 'collaborator' | 'acquirer' | 'target';

export interface Address {
  id: string;
  addressType: 'headquarters' | 'mailing' | 'billing' | 'site' | 'other';
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode: string;
  countryName: string;
  isVerified: boolean;
  verificationDate?: string;
  latitude?: number;
  longitude?: number;
}

export interface Certification {
  id: string;
  certificationType: string;
  certificationName: string;
  issuingBody: string;
  certificateNumber?: string;
  issueDate: string;
  expirationDate?: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  scope?: string;
}

export interface License {
  id: string;
  licenseType: string;
  licenseName: string;
  issuingAuthority: string;
  licenseNumber: string;
  issueDate: string;
  expirationDate?: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  jurisdiction: string;
  scope?: string;
}

// ============================================================================
// CONTACT / PERSON MASTER DATA
// ============================================================================

export interface Contact {
  id: string;
  contactId: string; // Business ID (e.g., CON-000001)
  
  // Identity
  salutation?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  displayName: string;
  
  // Professional
  title?: string;
  jobTitle?: string;
  department?: string;
  organizationId?: string;
  organizationName?: string;
  
  // Contact Information
  primaryEmail?: string;
  secondaryEmail?: string;
  workPhone?: string;
  mobilePhone?: string;
  faxNumber?: string;
  
  // Address
  workAddress?: Address;
  
  // Professional IDs
  orcidId?: string;
  npiNumber?: string;
  medicalLicenseNumber?: string;
  
  // Roles & Expertise
  roles: ContactRole[];
  expertiseAreas: string[];
  languages: string[];
  
  // Communication Preferences
  preferredContactMethod: 'email' | 'phone' | 'mail';
  preferredLanguage: string;
  timezone: string;
  doNotContact: boolean;
  doNotContactReason?: string;
  
  // Relationships
  relationships: ContactRelationship[];
  
  // Status
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  
  // Module Links
  linkedEntities: MasterDataLink[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export interface ContactRole {
  id: string;
  roleType: ContactRoleType;
  organizationId?: string;
  projectId?: string;
  studyId?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isPrimary: boolean;
}

export type ContactRoleType = 
  | 'investigator' | 'sub-investigator' | 'study-coordinator' | 'cra'
  | 'medical-monitor' | 'sponsor-contact' | 'regulatory-contact'
  | 'safety-contact' | 'data-manager' | 'biostatistician'
  | 'medical-writer' | 'project-manager' | 'executive-sponsor'
  | 'key-opinion-leader' | 'consultant' | 'auditor' | 'other';

export interface ContactRelationship {
  id: string;
  relatedContactId: string;
  relatedContactName: string;
  relationshipType: 'supervisor' | 'direct-report' | 'colleague' | 'delegate' | 'backup';
  isActive: boolean;
}

// ============================================================================
// SITE MASTER DATA
// ============================================================================

export interface Site {
  id: string;
  siteId: string; // Business ID (e.g., SITE-000001)
  
  // Identity
  name: string;
  siteNumber?: string;
  siteCode?: string;
  
  // Classification
  siteType: SiteType;
  siteCategory: SiteCategory;
  
  // Organization
  organizationId: string;
  organizationName: string;
  
  // Location
  address: Address;
  timezone: string;
  
  // Contact
  primaryContactId?: string;
  primaryContactName?: string;
  contacts: SiteContact[];
  
  // Regulatory
  regulatoryIdentifiers: SiteRegulatoryIdentifier[];
  certifications: Certification[];
  licenses: License[];
  
  // Capabilities
  capabilities: SiteCapability[];
  equipment: SiteEquipment[];
  specializations: string[];
  
  // Capacity
  patientCapacity?: number;
  bedCount?: number;
  staffCount?: number;
  
  // Study Participation
  studyParticipation: SiteStudyParticipation[];
  
  // Performance Metrics
  performanceMetrics?: SitePerformanceMetrics;
  
  // Status
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  qualificationStatus: 'not-qualified' | 'pending' | 'qualified' | 'conditionally-qualified' | 'disqualified';
  qualificationDate?: string;
  
  // Module Links
  linkedEntities: MasterDataLink[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type SiteType = 
  | 'clinical-site' | 'manufacturing' | 'laboratory' | 'distribution'
  | 'warehouse' | 'headquarters' | 'r-and-d' | 'administrative' | 'other';

export type SiteCategory = 
  | 'hospital' | 'academic-medical-center' | 'private-practice' | 'clinic'
  | 'research-center' | 'pharmacy' | 'nursing-home' | 'home-health' | 'other';

export interface SiteContact {
  id: string;
  contactId: string;
  contactName: string;
  role: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface SiteRegulatoryIdentifier {
  id: string;
  identifierType: string;
  identifierValue: string;
  issuingAuthority: string;
  issueDate?: string;
  expirationDate?: string;
}

export interface SiteCapability {
  id: string;
  capabilityType: string;
  capabilityName: string;
  description?: string;
  isAvailable: boolean;
  capacity?: string;
}

export interface SiteEquipment {
  id: string;
  equipmentType: string;
  equipmentName: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  calibrationDate?: string;
  calibrationDueDate?: string;
}

export interface SiteStudyParticipation {
  id: string;
  studyId: string;
  studyName: string;
  studyPhase: string;
  role: 'investigational' | 'central-lab' | 'imaging-center' | 'pharmacy' | 'other';
  activationDate?: string;
  closeoutDate?: string;
  status: 'pending' | 'active' | 'closed' | 'terminated';
  enrollmentTarget?: number;
  actualEnrollment?: number;
}

export interface SitePerformanceMetrics {
  totalStudies: number;
  activeStudies: number;
  completedStudies: number;
  averageEnrollmentRate: number;
  screenFailureRate: number;
  dropoutRate: number;
  queryResolutionDays: number;
  protocolDeviationRate: number;
  lastUpdated: string;
}

// ============================================================================
// PRODUCT MASTER DATA
// ============================================================================

export interface Product {
  id: string;
  productId: string; // Business ID (e.g., PROD-000001)
  
  // Identity
  productName: string;
  genericName?: string;
  proprietaryName?: string;
  brandNames: BrandName[];
  synonyms: string[];
  
  // Classification
  productType: ProductType;
  productCategory: ProductCategory;
  therapeuticClass: string[];
  pharmacologicClass: string[];
  
  // Chemical/Biological
  activeSubstances: ProductSubstance[];
  formulation?: string;
  dosageForm?: string;
  routeOfAdministration: string[];
  strength?: string;
  
  // Regulatory
  regulatoryStatus: ProductRegulatoryStatus[];
  ndc?: string[];
  atcCodes: string[];
  
  // Organization
  manufacturerIds: string[];
  marketingAuthorizationHolderIds: string[];
  
  // Lifecycle
  developmentPhase: DevelopmentPhase;
  firstApprovalDate?: string;
  launchDate?: string;
  
  // Indications
  approvedIndications: ProductIndication[];
  investigationalIndications: ProductIndication[];
  
  // Related Products
  parentProductId?: string;
  childProductIds: string[];
  relatedProducts: ProductRelationship[];
  
  // Status
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  
  // Module Links
  linkedEntities: MasterDataLink[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type ProductType = 
  | 'drug' | 'biologic' | 'medical-device' | 'combination-product'
  | 'diagnostic' | 'vaccine' | 'gene-therapy' | 'cell-therapy' | 'other';

export type ProductCategory = 
  | 'innovative' | 'generic' | 'biosimilar' | 'otc' | 'prescription' | 'orphan';

export type DevelopmentPhase = 
  | 'discovery' | 'preclinical' | 'phase-1' | 'phase-2' | 'phase-3'
  | 'registration' | 'approved' | 'post-marketing' | 'discontinued';

export interface BrandName {
  id: string;
  name: string;
  region: string;
  isPrimary: boolean;
  registrationDate?: string;
  expirationDate?: string;
}

export interface ProductSubstance {
  id: string;
  substanceId: string;
  substanceName: string;
  substanceType: 'active' | 'excipient' | 'adjuvant' | 'preservative';
  strength?: string;
  strengthUnit?: string;
  role?: string;
}

export interface ProductRegulatoryStatus {
  id: string;
  region: string;
  authority: string;
  status: 'not-submitted' | 'under-review' | 'approved' | 'rejected' | 'withdrawn' | 'suspended';
  approvalDate?: string;
  approvalNumber?: string;
  expirationDate?: string;
  conditions?: string[];
}

export interface ProductIndication {
  id: string;
  indicationId: string;
  indicationName: string;
  icdCodes: string[];
  populationType: string;
  ageRange?: { min?: number; max?: number };
  isApproved: boolean;
  approvalDate?: string;
  regions: string[];
}

export interface ProductRelationship {
  id: string;
  relatedProductId: string;
  relatedProductName: string;
  relationshipType: 'generic-of' | 'biosimilar-of' | 'reformulation' | 'combination' | 'competitor';
}

// ============================================================================
// SUBSTANCE MASTER DATA
// ============================================================================

export interface Substance {
  id: string;
  substanceId: string; // Business ID (e.g., SUB-000001)
  
  // Identity
  preferredName: string;
  systematicName?: string;
  synonyms: string[];
  
  // Classification
  substanceClass: SubstanceClass;
  origin: 'synthetic' | 'natural' | 'semi-synthetic' | 'biological' | 'recombinant';
  
  // Chemical/Biological Info
  molecularFormula?: string;
  molecularWeight?: number;
  casNumber?: string;
  inchiKey?: string;
  smiles?: string;
  uniprotId?: string;
  
  // Regulatory Identifiers
  uniiCode?: string;
  innName?: string;
  usanName?: string;
  banName?: string;
  janName?: string;
  
  // Classification Codes
  atcCodes: string[];
  meshTerms: string[];
  
  // Properties
  physicalProperties: SubstanceProperty[];
  
  // Safety
  safetyClassification?: string;
  controlledSubstanceSchedule?: string;
  
  // Related
  parentSubstanceId?: string;
  relatedSubstances: SubstanceRelationship[];
  
  // Status
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  
  // Module Links
  linkedEntities: MasterDataLink[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type SubstanceClass = 
  | 'small-molecule' | 'protein' | 'peptide' | 'nucleic-acid' | 'antibody'
  | 'enzyme' | 'hormone' | 'vaccine-antigen' | 'cell-based' | 'gene-based' | 'other';

export interface SubstanceProperty {
  id: string;
  propertyName: string;
  propertyValue: string;
  unit?: string;
  method?: string;
  conditions?: string;
}

export interface SubstanceRelationship {
  id: string;
  relatedSubstanceId: string;
  relatedSubstanceName: string;
  relationshipType: 'salt-form' | 'metabolite' | 'prodrug' | 'isomer' | 'derivative' | 'analog';
}

// ============================================================================
// REFERENCE DATA MANAGEMENT
// ============================================================================

export interface ReferenceDataSet {
  id: string;
  dataSetId: string; // Business ID (e.g., REF-000001)
  
  // Identity
  name: string;
  description: string;
  dataType: ReferenceDataType;
  domain: MasterDataDomain;
  
  // Source
  sourceSystem: string;
  sourceVersion: string;
  standardBody?: string;
  
  // Version Control
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  
  // Content
  values: ReferenceDataValue[];
  totalValues: number;
  
  // Hierarchy
  isHierarchical: boolean;
  maxDepth?: number;
  
  // Mapping
  mappings: ReferenceDataMapping[];
  
  // Governance
  dataOwnerId: string;
  dataStewardId: string;
  
  // Status
  status: EntityStatus;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export interface ReferenceDataValue {
  id: string;
  code: string;
  displayValue: string;
  description?: string;
  
  // Hierarchy
  parentCode?: string;
  level?: number;
  sortOrder: number;
  
  // Status
  isActive: boolean;
  effectiveDate: string;
  expirationDate?: string;
  
  // Metadata
  attributes: Record<string, string | number | boolean>;
  
  // Mapping
  externalMappings: ExternalMapping[];
}

export interface ExternalMapping {
  id: string;
  sourceSystem: string;
  sourceCode: string;
  sourceDisplay?: string;
  mappingType: 'exact' | 'broader' | 'narrower' | 'related' | 'approximate';
  confidence: MatchConfidence;
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: string;
}

export interface ReferenceDataMapping {
  id: string;
  sourceDataSetId: string;
  targetDataSetId: string;
  mappingName: string;
  mappingRules: MappingRule[];
  totalMappings: number;
  unmappedSourceCount: number;
  unmappedTargetCount: number;
  lastSyncAt: string;
  status: 'draft' | 'active' | 'deprecated';
}

export interface MappingRule {
  id: string;
  sourceCode: string;
  targetCode: string;
  mappingType: 'exact' | 'broader' | 'narrower' | 'related' | 'approximate';
  confidence: MatchConfidence;
  notes?: string;
}

// ============================================================================
// DATA GOVERNANCE
// ============================================================================

export interface DataGovernancePolicy {
  id: string;
  policyId: string;
  
  // Identity
  name: string;
  description: string;
  policyType: PolicyType;
  domain: MasterDataDomain;
  
  // Rules
  rules: GovernanceRule[];
  
  // Scope
  applicableEntityTypes: string[];
  applicableRegions: string[];
  
  // Ownership
  dataOwnerId: string;
  dataOwnerName: string;
  approvedBy: string;
  approvalDate: string;
  
  // Version
  version: string;
  effectiveDate: string;
  reviewDate: string;
  
  // Status
  status: 'draft' | 'active' | 'under-review' | 'retired';
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type PolicyType = 
  | 'data-quality' | 'data-retention' | 'data-access' | 'data-classification'
  | 'data-lifecycle' | 'naming-convention' | 'duplicate-management';

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'validation' | 'transformation' | 'enrichment' | 'deduplication';
  condition: string;
  action: string;
  severity: ValidationSeverity;
  isActive: boolean;
}

export interface DataStewardAssignment {
  id: string;
  
  // Steward
  userId: string;
  userName: string;
  role: GovernanceRole;
  
  // Scope
  domain: MasterDataDomain;
  entityTypes: string[];
  regions: string[];
  
  // Assignment
  assignedDate: string;
  assignedBy: string;
  expirationDate?: string;
  
  // Status
  isActive: boolean;
  
  // Metrics
  entitiesManaged: number;
  pendingReviews: number;
  lastActivityDate: string;
}

// ============================================================================
// DATA QUALITY MANAGEMENT
// ============================================================================

export interface DataQualityRule {
  id: string;
  ruleId: string;
  
  // Identity
  name: string;
  description: string;
  ruleType: QualityRuleType;
  
  // Target
  domain: MasterDataDomain;
  entityType: string;
  fieldPath?: string;
  
  // Rule Definition
  expression: string;
  parameters: Record<string, string | number | boolean>;
  
  // Severity
  severity: ValidationSeverity;
  autoCorrect: boolean;
  correctionAction?: string;
  
  // Status
  isActive: boolean;
  
  // Audit
  createdAt: string;
  createdBy: string;
}

export type QualityRuleType = 
  | 'completeness' | 'accuracy' | 'consistency' | 'uniqueness'
  | 'timeliness' | 'validity' | 'format' | 'reference-integrity';

export interface DataQualityResult {
  id: string;
  
  // Execution
  ruleId: string;
  ruleName: string;
  executionDate: string;
  
  // Target
  domain: MasterDataDomain;
  entityType: string;
  entityId?: string;
  fieldPath?: string;
  
  // Result
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  actualValue?: string;
  expectedValue?: string;
  message: string;
  
  // Resolution
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface DataQualityScore {
  id: string;
  
  // Scope
  domain: MasterDataDomain;
  entityType?: string;
  entityId?: string;
  
  // Scores (0-100)
  overallScore: number;
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  uniquenessScore: number;
  timelinessScore: number;
  
  // Trend
  previousScore: number;
  scoreTrend: 'improving' | 'stable' | 'declining';
  
  // Details
  totalRecords: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  
  // Audit
  calculatedAt: string;
}

// ============================================================================
// CHANGE MANAGEMENT
// ============================================================================

export interface MasterDataChangeRequest {
  id: string;
  changeRequestId: string; // Business ID (e.g., CR-000001)
  
  // Request Info
  title: string;
  description: string;
  changeType: ChangeType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Target
  domain: MasterDataDomain;
  entityType: string;
  entityId?: string;
  entityName?: string;
  
  // Changes
  proposedChanges: ProposedChange[];
  
  // Impact
  impactAssessment?: ChangeImpactAssessment;
  affectedModules: string[];
  affectedRecords: number;
  
  // Workflow
  status: ChangeRequestStatus;
  requesterId: string;
  requesterName: string;
  assigneeId?: string;
  assigneeName?: string;
  
  // Approval
  approvers: ChangeApprover[];
  approvalHistory: ApprovalHistoryEntry[];
  
  // Timeline
  requestedDate: string;
  targetDate?: string;
  implementedDate?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastModifiedBy: string;
}

export type ChangeType = 
  | 'create' | 'update' | 'merge' | 'split' | 'archive' | 'delete' | 'bulk-update';

export interface ProposedChange {
  id: string;
  fieldPath: string;
  fieldName: string;
  currentValue?: string | number | boolean | null;
  proposedValue: string | number | boolean | null;
  changeReason?: string;
}

export interface ChangeImpactAssessment {
  id: string;
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
  affectedProcesses: string[];
  riskAssessment: string;
  mitigationPlan?: string;
  assessedBy: string;
  assessedAt: string;
}

export interface ChangeApprover {
  id: string;
  approverId: string;
  approverName: string;
  role: GovernanceRole;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  decision?: string;
  comments?: string;
  decisionDate?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'delegated' | 'escalated';
  actionBy: string;
  actionByName: string;
  actionDate: string;
  comments?: string;
}

// ============================================================================
// ENTITY RESOLUTION & MATCHING
// ============================================================================

export interface MatchingProfile {
  id: string;
  profileId: string;
  
  // Identity
  name: string;
  description: string;
  entityType: string;
  
  // Rules
  matchRules: MatchRule[];
  blockingRules: BlockingRule[];
  
  // Thresholds
  autoMergeThreshold: number; // Score above which to auto-merge
  reviewThreshold: number; // Score above which to flag for review
  
  // Status
  isActive: boolean;
  
  // Audit
  createdAt: string;
  createdBy: string;
}

export interface MatchRule {
  id: string;
  fieldPath: string;
  fieldName: string;
  matchType: MatchType;
  weight: number;
  isRequired: boolean;
  parameters?: Record<string, string | number>;
}

export type MatchType = 
  | 'exact' | 'fuzzy' | 'phonetic' | 'token' | 'numeric' | 'date' | 'address';

export interface BlockingRule {
  id: string;
  fieldPath: string;
  blockingType: 'exact' | 'prefix' | 'soundex' | 'metaphone';
}

export interface MatchCandidate {
  id: string;
  
  // Source Entity
  sourceEntityId: string;
  sourceEntityType: string;
  sourceEntityName: string;
  
  // Target Entity
  targetEntityId: string;
  targetEntityType: string;
  targetEntityName: string;
  
  // Match Details
  overallScore: number;
  confidence: MatchConfidence;
  matchedFields: FieldMatch[];
  
  // Status
  status: 'pending-review' | 'confirmed-match' | 'rejected' | 'auto-merged';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Audit
  createdAt: string;
  profileId: string;
}

export interface FieldMatch {
  fieldPath: string;
  fieldName: string;
  sourceValue: string;
  targetValue: string;
  matchScore: number;
  matchType: MatchType;
}

export interface MergeRecord {
  id: string;
  
  // Merge Details
  mergeType: 'automatic' | 'manual';
  survivorEntityId: string;
  mergedEntityIds: string[];
  
  // Pre-Merge State
  preMergeSnapshot: Record<string, unknown>;
  
  // Resolution
  fieldResolutions: FieldResolution[];
  
  // Status
  status: 'pending' | 'completed' | 'undone';
  
  // Audit
  mergedAt: string;
  mergedBy: string;
  undoneAt?: string;
  undoneBy?: string;
}

export interface FieldResolution {
  fieldPath: string;
  resolutionType: 'use-survivor' | 'use-merged' | 'concatenate' | 'custom';
  survivorValue?: string | number | boolean | null;
  mergedValue?: string | number | boolean | null;
  resolvedValue: string | number | boolean | null;
}

// ============================================================================
// CROSS-MODULE INTEGRATION
// ============================================================================

export interface MasterDataLink {
  id: string;
  
  // Master Entity
  masterDomain: MasterDataDomain;
  masterEntityId: string;
  masterEntityType: string;
  masterEntityName: string;
  
  // Linked Module
  moduleType: 'portfolio' | 'authoring' | 'submissions' | 'haq' | 'ctms' | 'tmf' | 'edc' | 'safety' | 'qms' | 'document-control';
  moduleEntityId: string;
  moduleEntityType: string;
  moduleEntityName: string;
  
  // Link Info
  linkType: 'primary' | 'reference' | 'derived';
  isAutoSync: boolean;
  lastSyncAt?: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  
  // Audit
  createdAt: string;
  createdBy: string;
}

export interface SyncConflict {
  id: string;
  linkId: string;
  
  // Conflict Details
  fieldPath: string;
  fieldName: string;
  masterValue: string | number | boolean | null;
  moduleValue: string | number | boolean | null;
  
  // Resolution
  status: 'unresolved' | 'resolved-use-master' | 'resolved-use-module' | 'resolved-custom';
  resolvedValue?: string | number | boolean | null;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Audit
  detectedAt: string;
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export interface MasterDataAnalytics {
  // Overview
  totalEntities: number;
  entitiesByDomain: Record<MasterDataDomain, number>;
  entitiesByStatus: Record<EntityStatus, number>;
  
  // Quality
  overallQualityScore: number;
  qualityByDomain: Record<MasterDataDomain, number>;
  qualityTrend: QualityTrendPoint[];
  
  // Governance
  pendingChangeRequests: number;
  pendingReviews: number;
  overdueReviews: number;
  
  // Matching
  potentialDuplicates: number;
  pendingMerges: number;
  recentMerges: number;
  
  // Activity
  recentCreates: number;
  recentUpdates: number;
  recentArchives: number;
  
  // Cross-Module
  totalLinks: number;
  syncConflicts: number;
  
  // Generated
  generatedAt: string;
}

export interface QualityTrendPoint {
  date: string;
  overallScore: number;
  completeness: number;
  accuracy: number;
  consistency: number;
}

// ============================================================================
// UI & STATE
// ============================================================================

export type MasterDataView = 
  | 'dashboard' | 'organizations' | 'contacts' | 'sites' | 'products' | 'substances'
  | 'reference-data' | 'governance' | 'quality' | 'matching' | 'change-requests' | 'analytics';

export interface MasterDataFilters {
  domains: MasterDataDomain[];
  statuses: EntityStatus[];
  qualityLevels: DataQualityLevel[];
  regions: string[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
  tags?: string[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getQualityLevelFromScore(score: number): DataQualityLevel {
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  return 'unverified';
}

export function getConfidenceFromScore(score: number): MatchConfidence {
  if (score >= 95) return 'exact';
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  if (score >= 50) return 'low';
  if (score >= 30) return 'possible';
  return 'no-match';
}

export function isEntityActive(status: EntityStatus): boolean {
  return status === 'active';
}

export function canEditEntity(status: EntityStatus): boolean {
  return ['draft', 'pending-review', 'active'].includes(status);
}

export function formatEntityId(domain: MasterDataDomain, sequence: number): string {
  const prefixMap: Record<MasterDataDomain, string> = {
    organization: 'ORG',
    product: 'PROD',
    substance: 'SUB',
    indication: 'IND',
    study: 'STU',
    site: 'SITE',
    person: 'PER',
    geography: 'GEO',
    regulatory: 'REG',
    terminology: 'TERM',
  };
  return `${prefixMap[domain]}-${sequence.toString().padStart(6, '0')}`;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

export interface SearchResult {
  entityId: string;
  entityType: string;
  domain: MasterDataDomain;
  name: string;
  description?: string;
  status: EntityStatus;
  qualityLevel: DataQualityLevel;
  matchScore: number;
  matchedFields: string[];
}
