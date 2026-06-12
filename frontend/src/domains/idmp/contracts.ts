
/**
 * IDMP Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Identification of Medicinal Products types.
 * 
 * Implements ISO standards for global regulatory data exchange:
 * - ISO 11615: Medicinal Products - Data elements and structures
 * - ISO 11616: Pharmaceutical Products - Data elements and structures  
 * - ISO 11238: Substances - Data elements and structures
 * - ISO 11239: Pharmaceutical Dose Forms, Routes of Administration
 * - ISO 11240: Units of Measurement
 * 
 * Supports: FDA SPL, EMA SPOR, Accumulus Synergy, FHIR MedicinalProductDefinition
 * 
 * @module domains/idmp/contracts
 * @version 0.27.41
 */

// =============================================================================
// CORE IDMP ENTITIES (ISO 11615)
// =============================================================================

/**
 * Medicinal Product - The highest level entity in IDMP
 * A pharmaceutical product that has been authorized for use in at least one jurisdiction
 */
export interface IDMPMedicinalProduct {
  id: string;
  mpId: string; // Medicinal Product Identifier (MPID)
  
  // Core Identity
  fullName: string; // Full product name including strength/form
  inventedName: string; // Brand/trade name
  scientificName?: string;
  
  // Classification
  combinedPharmaceuticalDoseForm: PharmaceuticalDoseForm;
  legalStatusOfSupply: LegalStatusOfSupply;
  additionalMonitoringIndicator: boolean;
  orphanDrugDesignation: boolean;
  pediatricUseIndicator: boolean;
  
  // Regulatory
  authorizations: MarketingAuthorization[];
  marketingAuthorizationHolder: IDMPOrganization;
  
  // Composition
  pharmaceuticalProducts: IDMPPharmaceuticalProduct[];
  packagedMedicinalProducts: IDMPPackagedMedicinalProduct[];
  
  // Clinical
  therapeuticIndications: TherapeuticIndication[];
  contraindications: Contraindication[];
  
  // Lifecycle
  developmentStatus: DevelopmentStatus;
  firstAuthorizationDate?: string;
  
  // Cross-references
  linkedProductId?: string; // Link to Ligature Product entity
  linkedSubmissionIds: string[];
  linkedDocumentIds: string[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: number;
}

/**
 * Pharmaceutical Product - A product that contains one or more active substances
 * with a specific pharmaceutical dose form (ISO 11616)
 */
export interface IDMPPharmaceuticalProduct {
  id: string;
  phpId: string; // Pharmaceutical Product Identifier (PhPID)
  
  // Identity
  administrableDoseForm: PharmaceuticalDoseForm;
  unitOfPresentation: UnitOfPresentation;
  routeOfAdministration: RouteOfAdministration[];
  
  // Composition
  ingredients: PharmaceuticalIngredient[];
  
  // Reference to Medicinal Product
  medicinalProductId: string;
  
  // Characteristics
  characteristics: ProductCharacteristic[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Ingredient - Active or inactive substance within a pharmaceutical product
 */
export interface PharmaceuticalIngredient {
  id: string;
  
  // Substance reference
  substanceId: string;
  substanceName: string;
  
  // Role
  ingredientRole: IngredientRole;
  
  // Strength
  presentationStrength?: Strength;
  concentrationStrength?: Strength;
  
  // Reference strength (for salt forms)
  referenceSubstanceId?: string;
  referenceStrength?: Strength;
  
  // Basis of strength
  basisOfStrength: 'active-moiety' | 'active-substance' | 'salt-form';
}

/**
 * Substance - A single molecular entity (ISO 11238)
 */
export interface IDMPSubstance {
  id: string;
  substanceId: string; // Global Substance Identifier (GSID concept)
  
  // Identity
  preferredName: string;
  substanceType: SubstanceType;
  
  // Nomenclature
  innName?: string; // International Nonproprietary Name
  usan?: string; // United States Adopted Name
  casNumber?: string;
  unii?: string; // FDA Unique Ingredient Identifier
  inchiKey?: string;
  
  // Classification
  substanceClass: SubstanceClass[];
  pharmacologicClass?: string[];
  
  // Structure (for small molecules)
  molecularFormula?: string;
  molecularWeight?: number;
  smilesNotation?: string;
  
  // For biologics
  proteinSequence?: string;
  glycosylationPattern?: string;
  
  // Relationships
  parentSubstanceId?: string;
  saltForms: string[];
  metabolites: string[];
  
  // Safety
  scheduledSubstance: boolean;
  controlledSubstanceSchedule?: string;
  
  // Cross-references
  linkedSubstanceId?: string; // Link to Master Data Substance
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Packaged Medicinal Product - The physical package that is marketed
 */
export interface IDMPPackagedMedicinalProduct {
  id: string;
  pcId: string; // Package Identifier
  
  // Identity
  packageDescription: string;
  marketingStatus: MarketingStatus;
  
  // Package structure
  packaging: PackageItem[];
  
  // Reference
  medicinalProductId: string;
  
  // Market-specific
  marketingAuthorizationId: string;
  countryCode: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface PackageItem {
  id: string;
  packageItemType: PackageItemType;
  quantity: number;
  material?: string[];
  containedItems?: PackageItem[];
  manufacturedItems?: ManufacturedItem[];
}

export interface ManufacturedItem {
  id: string;
  manufacturedDoseForm: PharmaceuticalDoseForm;
  unitOfPresentation: UnitOfPresentation;
  quantity: number;
  physicalCharacteristics?: string[];
}

// =============================================================================
// ORGANIZATION (ISO 11616)
// =============================================================================

export interface IDMPOrganization {
  id: string;
  orgId: string; // Organization Identifier
  
  // Identity
  name: string;
  legalName: string;
  organizationType: IDMPOrganizationType;
  
  // Identifiers
  dunsNumber?: string;
  feiNumber?: string; // FDA Establishment Identifier
  eudraVigilanceId?: string;
  healthCanadaCompanyId?: string;
  pmdaNumber?: string;
  
  // Address
  address: IDMPAddress;
  
  // Contact
  contactPoint?: IDMPContactPoint;
  
  // Relationships
  parentOrganizationId?: string;
  affiliatedOrganizations: string[];
  
  // Roles
  roles: OrganizationRole[];
  
  // Cross-references
  linkedOrganizationId?: string; // Link to Master Data Organization
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface IDMPAddress {
  streetAddress: string[];
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: string;
  countryName: string;
}

export interface IDMPContactPoint {
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
}

// =============================================================================
// REGULATORY INFORMATION
// =============================================================================

export interface MarketingAuthorization {
  id: string;
  maNumber: string; // Marketing Authorization Number
  
  // Authority
  regulatoryAuthority: string;
  countryCode: string;
  jurisdiction: string;
  
  // Status
  authorizationStatus: AuthorizationStatus;
  authorizationType: AuthorizationType;
  
  // Dates
  authorizationDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  
  // Holder
  marketingAuthorizationHolderId: string;
  
  // Procedure
  procedureType: RegProcedureType;
  procedureNumber?: string;
  
  // References
  linkedSubmissionId?: string;
  linkedRegistrationId?: string;
}

export interface TherapeuticIndication {
  id: string;
  indication: string;
  indicationCode?: string; // MedDRA or ICD code
  codingSystem?: 'meddra' | 'icd-10' | 'icd-11' | 'snomed';
  
  // Population
  targetPopulation?: string;
  minimumAge?: string;
  maximumAge?: string;
  
  // Status
  approvalStatus: 'approved' | 'pending' | 'withdrawn';
  approvalDate?: string;
  countryCode?: string;
}

export interface Contraindication {
  id: string;
  description: string;
  contraindicationCode?: string;
  codingSystem?: string;
  severity: 'absolute' | 'relative';
}

export interface ProductCharacteristic {
  type: 'color' | 'shape' | 'imprint' | 'flavor' | 'size' | 'score' | 'coating' | 'other';
  value: string;
  codedValue?: string;
}

// =============================================================================
// STRENGTH & MEASUREMENT (ISO 11240)
// =============================================================================

export interface Strength {
  value: number;
  unit: string;
  comparator?: '<' | '<=' | '>=' | '>';
}

// =============================================================================
// ENUMS & REFERENCE TYPES (ISO 11239)
// =============================================================================

export type PharmaceuticalDoseForm = 
  | 'tablet' | 'capsule' | 'solution' | 'suspension' | 'powder'
  | 'injection' | 'infusion' | 'cream' | 'ointment' | 'gel'
  | 'patch' | 'inhaler' | 'spray' | 'drops' | 'suppository'
  | 'implant' | 'film' | 'lozenge' | 'granules' | 'other';

export type UnitOfPresentation = 
  | 'tablet' | 'capsule' | 'vial' | 'ampoule' | 'syringe'
  | 'cartridge' | 'pen' | 'bottle' | 'tube' | 'sachet'
  | 'blister' | 'strip' | 'patch' | 'suppository' | 'other';

export type RouteOfAdministration = 
  | 'oral' | 'intravenous' | 'intramuscular' | 'subcutaneous'
  | 'topical' | 'inhalation' | 'nasal' | 'ophthalmic' | 'otic'
  | 'rectal' | 'vaginal' | 'transdermal' | 'sublingual' | 'buccal'
  | 'intrathecal' | 'epidural' | 'intradermal' | 'other';

export type IngredientRole = 
  | 'active' | 'excipient' | 'adjuvant' | 'solvent' | 'diluent'
  | 'preservative' | 'stabilizer' | 'colorant' | 'flavoring' | 'other';

export type SubstanceType = 
  | 'chemical' | 'protein' | 'nucleic-acid' | 'polymer'
  | 'mixture' | 'structurally-diverse' | 'other';

export type SubstanceClass = 
  | 'small-molecule' | 'monoclonal-antibody' | 'bispecific-antibody'
  | 'adc' | 'peptide' | 'oligonucleotide' | 'cell-therapy'
  | 'gene-therapy' | 'mrna' | 'enzyme' | 'vaccine' | 'other';

export type LegalStatusOfSupply = 
  | 'prescription-only' | 'prescription-required-renewable'
  | 'prescription-required-non-renewable' | 'pharmacy-only'
  | 'otc' | 'controlled' | 'restricted' | 'not-applicable';

export type DevelopmentStatus = 
  | 'discovery' | 'preclinical' | 'phase-1' | 'phase-2' | 'phase-3'
  | 'filed' | 'approved' | 'marketed' | 'discontinued' | 'withdrawn';

export type MarketingStatus = 
  | 'marketed' | 'authorized-not-marketed' | 'suspended'
  | 'withdrawn' | 'not-authorized';

export type AuthorizationStatus = 
  | 'pending' | 'valid' | 'suspended' | 'withdrawn' | 'expired' | 'revoked';

export type AuthorizationType = 
  | 'full' | 'conditional' | 'exceptional' | 'accelerated'
  | 'priority' | 'breakthrough' | 'orphan' | 'pediatric';

export type RegProcedureType = 
  | 'centralized' | 'decentralized' | 'mutual-recognition'
  | 'national' | 'nda' | 'bla' | 'anda' | '505b2';

export type IDMPOrganizationType = 
  | 'sponsor' | 'mah' | 'manufacturer' | 'packager'
  | 'distributor' | 'cro' | 'cmo' | 'laboratory'
  | 'regulatory-authority' | 'other';

export type OrganizationRole = 
  | 'marketing-authorization-holder' | 'sponsor'
  | 'drug-substance-manufacturer' | 'drug-product-manufacturer'
  | 'packager' | 'batch-releaser' | 'importer' | 'distributor'
  | 'contract-research' | 'contract-manufacturing'
  | 'testing-laboratory' | 'quality-control';

export type PackageItemType = 
  | 'carton' | 'box' | 'tray' | 'blister' | 'bottle'
  | 'vial' | 'ampoule' | 'tube' | 'sachet' | 'pouch'
  | 'container' | 'bag' | 'wrapper' | 'other';

// =============================================================================
// UI TYPES
// =============================================================================

export type IDMPView = 
  | 'dashboard' 
  | 'medicinal-products' 
  | 'substances' 
  | 'organizations'
  | 'packages'
  | 'validation'
  | 'export';

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export type IDMPEntityType = 
  | 'medicinal-product' 
  | 'pharmaceutical-product' 
  | 'substance' 
  | 'organization' 
  | 'package';

export interface IDMPValidationResult {
  entityId: string;
  entityType: IDMPEntityType;
  isValid: boolean;
  errors: IDMPValidationError[];
  warnings: IDMPValidationWarning[];
  validatedAt: string;
}

export interface IDMPValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

export interface IDMPValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const IDMP_VIEW_LABELS: Record<IDMPView, string> = {
  'dashboard': 'Dashboard',
  'medicinal-products': 'Medicinal Products',
  'substances': 'Substances',
  'organizations': 'Organizations',
  'packages': 'Packaged Products',
  'validation': 'Validation',
  'export': 'Export',
};

export const DEVELOPMENT_STATUS_LABELS: Record<DevelopmentStatus, string> = {
  'discovery': 'Discovery',
  'preclinical': 'Preclinical',
  'phase-1': 'Phase 1',
  'phase-2': 'Phase 2',
  'phase-3': 'Phase 3',
  'filed': 'Filed',
  'approved': 'Approved',
  'marketed': 'Marketed',
  'discontinued': 'Discontinued',
  'withdrawn': 'Withdrawn',
};

export const AUTHORIZATION_STATUS_LABELS: Record<AuthorizationStatus, string> = {
  'pending': 'Pending',
  'valid': 'Valid',
  'suspended': 'Suspended',
  'withdrawn': 'Withdrawn',
  'expired': 'Expired',
  'revoked': 'Revoked',
};

export const MARKETING_STATUS_LABELS: Record<MarketingStatus, string> = {
  'marketed': 'Marketed',
  'authorized-not-marketed': 'Authorized (Not Marketed)',
  'suspended': 'Suspended',
  'withdrawn': 'Withdrawn',
  'not-authorized': 'Not Authorized',
};

export const SUBSTANCE_TYPE_LABELS: Record<SubstanceType, string> = {
  'chemical': 'Chemical',
  'protein': 'Protein',
  'nucleic-acid': 'Nucleic Acid',
  'polymer': 'Polymer',
  'mixture': 'Mixture',
  'structurally-diverse': 'Structurally Diverse',
  'other': 'Other',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isProductApproved(product: IDMPMedicinalProduct): boolean {
  return ['approved', 'marketed'].includes(product.developmentStatus);
}

export function isAuthorizationActive(auth: MarketingAuthorization): boolean {
  return auth.authorizationStatus === 'valid';
}

export function hasActiveAuthorization(product: IDMPMedicinalProduct): boolean {
  return product.authorizations.some(isAuthorizationActive);
}

export function getActiveIngredients(pharmaProduct: IDMPPharmaceuticalProduct): PharmaceuticalIngredient[] {
  return pharmaProduct.ingredients.filter(i => i.ingredientRole === 'active');
}

export function formatMPID(prefix: string, sequence: number): string {
  return `${prefix}-MP-${sequence.toString().padStart(6, '0')}`;
}

export function formatPhPID(prefix: string, sequence: number): string {
  return `${prefix}-PHP-${sequence.toString().padStart(6, '0')}`;
}

export function formatSubstanceId(prefix: string, sequence: number): string {
  return `${prefix}-SUB-${sequence.toString().padStart(6, '0')}`;
}

export function formatPackageId(prefix: string, sequence: number): string {
  return `${prefix}-PKG-${sequence.toString().padStart(6, '0')}`;
}

/**
 * Validate required IDMP fields for medicinal product
 */
export function validateMedicinalProductRequired(product: Partial<IDMPMedicinalProduct>): IDMPValidationError[] {
  const errors: IDMPValidationError[] = [];
  
  if (!product.fullName) {
    errors.push({ field: 'fullName', code: 'REQUIRED', message: 'Full name is required', severity: 'error' });
  }
  if (!product.inventedName) {
    errors.push({ field: 'inventedName', code: 'REQUIRED', message: 'Invented name is required', severity: 'error' });
  }
  if (!product.combinedPharmaceuticalDoseForm) {
    errors.push({ field: 'combinedPharmaceuticalDoseForm', code: 'REQUIRED', message: 'Dose form is required', severity: 'error' });
  }
  if (!product.marketingAuthorizationHolder) {
    errors.push({ field: 'marketingAuthorizationHolder', code: 'REQUIRED', message: 'MAH is required', severity: 'error' });
  }
  
  return errors;
}

/**
 * Validate required IDMP fields for substance
 */
export function validateSubstanceRequired(substance: Partial<IDMPSubstance>): IDMPValidationError[] {
  const errors: IDMPValidationError[] = [];
  
  if (!substance.preferredName) {
    errors.push({ field: 'preferredName', code: 'REQUIRED', message: 'Preferred name is required', severity: 'error' });
  }
  if (!substance.substanceType) {
    errors.push({ field: 'substanceType', code: 'REQUIRED', message: 'Substance type is required', severity: 'error' });
  }
  
  return errors;
}
