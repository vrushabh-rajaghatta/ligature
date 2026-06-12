
/**
 * IDMP Store Types - Re-exports from Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH: @/domains/idmp/contracts
 * ISO 11615/11616/11238 compliant IDMP data model.
 * 
 * @version 0.27.43
 */

// Re-export all types from IDMP domain contracts
export {
  // Core entities (ISO 11615)
  type IDMPMedicinalProduct,
  type IDMPPharmaceuticalProduct,
  type PharmaceuticalIngredient,
  type IDMPSubstance,
  type IDMPPackagedMedicinalProduct,
  type PackageItem,
  type ManufacturedItem,
  type IDMPOrganization,
  type IDMPAddress,
  type IDMPContactPoint,
  type MarketingAuthorization,
  type TherapeuticIndication,
  type Contraindication,
  type ProductCharacteristic,
  type Strength,
  
  // Enums
  type PharmaceuticalDoseForm,
  type UnitOfPresentation,
  type RouteOfAdministration,
  type IngredientRole,
  type SubstanceType,
  type SubstanceClass,
  type LegalStatusOfSupply,
  type DevelopmentStatus,
  type MarketingStatus,
  type AuthorizationStatus,
  type AuthorizationType,
  type RegProcedureType,
  type IDMPOrganizationType,
  type OrganizationRole,
  type PackageItemType,
  
  // UI types
  type IDMPView,
  type IDMPEntityType,
  
  // Validation types
  type IDMPValidationResult,
  type IDMPValidationError,
  type IDMPValidationWarning,
  
  // Constants
  IDMP_VIEW_LABELS,
  DEVELOPMENT_STATUS_LABELS,
  AUTHORIZATION_STATUS_LABELS,
  MARKETING_STATUS_LABELS,
  SUBSTANCE_TYPE_LABELS,
  
  // Utilities
  isProductApproved,
  isAuthorizationActive,
  hasActiveAuthorization,
  getActiveIngredients,
  formatMPID,
  formatPhPID,
  formatSubstanceId,
  formatPackageId,
  validateMedicinalProductRequired,
  validateSubstanceRequired,
} from '@/domains/idmp/contracts';

// Re-import types needed for store-specific types
import type {
  IDMPMedicinalProduct,
  IDMPPharmaceuticalProduct,
  IDMPSubstance,
  IDMPPackagedMedicinalProduct,
  IDMPOrganization,
  IDMPView,
  IDMPValidationResult,
} from '@/domains/idmp/contracts';

// =============================================================================
// STORE-SPECIFIC TYPES (not in domain contracts)
// =============================================================================

export interface IDMPState {
  // Core entities
  medicinalProducts: Record<string, IDMPMedicinalProduct>;
  pharmaceuticalProducts: Record<string, IDMPPharmaceuticalProduct>;
  substances: Record<string, IDMPSubstance>;
  packagedProducts: Record<string, IDMPPackagedMedicinalProduct>;
  organizations: Record<string, IDMPOrganization>;
  
  // Lookup indices
  mpByMpId: Record<string, string>;
  phpByPhpId: Record<string, string>;
  substanceByGsid: Record<string, string>;
  orgByOrgId: Record<string, string>;
  
  // Cross-references to Ligature entities
  mpByProductId: Record<string, string[]>;
  substanceByMasterDataId: Record<string, string>;
  orgByMasterDataId: Record<string, string>;
  
  // UI State
  selectedMedicinalProductId: string | null;
  selectedSubstanceId: string | null;
  selectedOrganizationId: string | null;
  activeView: IDMPView;
  isLoading: boolean;
  error: string | null;
  
  // Validation state
  validationResults: Record<string, IDMPValidationResult>;
  
  // Sync status
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export interface IDMPActions {
  // Medicinal Product CRUD
  createMedicinalProduct: (data: Partial<IDMPMedicinalProduct>) => IDMPMedicinalProduct;
  updateMedicinalProduct: (id: string, updates: Partial<IDMPMedicinalProduct>) => void;
  deleteMedicinalProduct: (id: string) => void;
  
  // Pharmaceutical Product CRUD
  createPharmaceuticalProduct: (data: Partial<IDMPPharmaceuticalProduct>) => IDMPPharmaceuticalProduct;
  updatePharmaceuticalProduct: (id: string, updates: Partial<IDMPPharmaceuticalProduct>) => void;
  deletePharmaceuticalProduct: (id: string) => void;
  
  // Substance CRUD
  createSubstance: (data: Partial<IDMPSubstance>) => IDMPSubstance;
  updateSubstance: (id: string, updates: Partial<IDMPSubstance>) => void;
  deleteSubstance: (id: string) => void;
  
  // Organization CRUD
  createOrganization: (data: Partial<IDMPOrganization>) => IDMPOrganization;
  updateOrganization: (id: string, updates: Partial<IDMPOrganization>) => void;
  deleteOrganization: (id: string) => void;
  
  // Package CRUD
  createPackagedProduct: (data: Partial<IDMPPackagedMedicinalProduct>) => IDMPPackagedMedicinalProduct;
  updatePackagedProduct: (id: string, updates: Partial<IDMPPackagedMedicinalProduct>) => void;
  deletePackagedProduct: (id: string) => void;
  
  // Cross-referencing
  linkToLigatureProduct: (mpId: string, productId: string) => void;
  linkToMasterDataSubstance: (idmpSubstanceId: string, masterDataSubstanceId: string) => void;
  linkToMasterDataOrganization: (idmpOrgId: string, masterDataOrgId: string) => void;
  
  // Validation
  validateEntity: (entityId: string, entityType: IDMPValidationResult['entityType']) => IDMPValidationResult;
  validateAll: () => Map<string, IDMPValidationResult>;
  
  // Sync
  syncWithMasterData: () => Promise<void>;
  
  // Export
  exportToSPL: (mpId: string) => string; // Returns XML
  exportToFHIR: (mpId: string) => object; // Returns FHIR MedicinalProductDefinition
  
  // UI Actions
  setSelectedMedicinalProduct: (id: string | null) => void;
  setSelectedSubstance: (id: string | null) => void;
  setSelectedOrganization: (id: string | null) => void;
  setActiveView: (view: IDMPView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}
