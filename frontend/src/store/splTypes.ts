
// ============================================================================
// SPL Types - FDA Structured Product Labeling (v197)
// HL7 CDA-based XML format for pharmaceutical labeling content
// Enables machine-readable labeling for DailyMed and regulatory exchange
// ============================================================================

// ============================================================================
// SPL DOCUMENT STRUCTURE
// ============================================================================

/**
 * SPL Document - The root container for a Structured Product Labeling document
 * Based on HL7 CDA R2 standard
 */
export interface SPLDocument {
  id: string;
  setId: string; // Consistent across versions
  versionNumber: number;
  
  // Document identity
  documentType: SPLDocumentType;
  title: string;
  effectiveTime: string;
  
  // Regulatory context
  applicationNumber?: string; // NDA/BLA/ANDA number
  ndaSubmissionType?: string;
  
  // Author/Registrant
  author: SPLAuthor;
  
  // Product information
  subjects: SPLSubject[];
  
  // Content sections
  components: SPLComponent[];
  
  // Metadata
  languageCode: string;
  realmCode: 'US' | 'CA' | 'EU';
  
  // Lifecycle
  status: SPLDocumentStatus;
  submittedDate?: string;
  publishedDate?: string;
  
  // Cross-references
  linkedLabelingId?: string; // Link to Ligature Labeling module
  linkedSubmissionId?: string;
  linkedMedicinalProductId?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type SPLDocumentType = 
  | 'prescription-drug-label'
  | 'otc-drug-label'
  | 'generic-drug-label'
  | 'biological-product-label'
  | 'vaccine-label'
  | 'medical-device-label'
  | 'animal-drug-label'
  | 'bulk-ingredient'
  | 'establishment-registration'
  | 'drug-listing'
  | 'indexing';

export type SPLDocumentStatus = 
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'submitted'
  | 'published'
  | 'superseded'
  | 'obsolete';

// ============================================================================
// SPL AUTHOR (Organization)
// ============================================================================

export interface SPLAuthor {
  id: string;
  
  // Organization identity
  name: string;
  dunsNumber: string;
  
  // Address
  addr: SPLAddress;
  
  // Contact
  telecom?: SPLTelecom[];
  
  // Regulatory
  assignedOrganization?: SPLOrganization;
}

export interface SPLOrganization {
  id: string;
  name: string;
  dunsNumber?: string;
  feiNumber?: string;
  registrationNumber?: string;
}

export interface SPLAddress {
  streetAddressLine: string[];
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface SPLTelecom {
  use: 'WP' | 'HP' | 'MC';
  value: string;
  type: 'tel' | 'fax' | 'mailto' | 'http';
}

// ============================================================================
// SPL SUBJECT (Product)
// ============================================================================

export interface SPLSubject {
  id: string;
  
  // Product identity
  manufacturedProduct: SPLManufacturedProduct;
  
  // Marketing information
  approval?: SPLApproval;
  marketingAct?: SPLMarketingAct;
  
  // Ingredients
  ingredients: SPLIngredient[];
  
  // Packaging
  containerPackagedProduct?: SPLContainerPackagedProduct;
}

export interface SPLManufacturedProduct {
  id: string;
  
  // Product info
  manufacturedProductCode: SPLCode;
  name: string;
  
  // Labeler
  labelerName: string;
  labelerDunsNumber: string;
  
  // Form
  formCode: SPLCode;
  
  // Route
  routeCode: SPLCode[];
  
  // DEA Schedule
  deaSchedule?: SPLCode;
  
  // Physical characteristics
  characteristics?: SPLCharacteristic[];
  
  // NDC info
  ndc11?: string;
  ndc10?: string;
}

export interface SPLCode {
  code: string;
  displayName: string;
  codeSystem: string;
  codeSystemName: string;
}

export interface SPLCharacteristic {
  type: 'color' | 'shape' | 'size' | 'imprint' | 'score' | 'coating' | 'flavor' | 'image';
  value: string;
  valueCode?: SPLCode;
  imageData?: string; // Base64 for images
}

export interface SPLIngredient {
  id: string;
  
  // Substance
  substanceName: string;
  substanceCode: SPLCode; // UNII
  
  // Role
  classCode: 'ACTIB' | 'ACTIM' | 'ACTIR' | 'IACT'; // Active base, moiety, ref, inactive
  
  // Strength
  quantity?: SPLQuantity;
  
  // Active moiety
  activeMoiety?: SPLActiveMoiety;
}

export interface SPLQuantity {
  numerator: SPLValue;
  denominator: SPLValue;
}

export interface SPLValue {
  value: number;
  unit: string;
}

export interface SPLActiveMoiety {
  name: string;
  code: SPLCode;
}

export interface SPLApproval {
  code: SPLCode;
  id: string;
}

export interface SPLMarketingAct {
  code: SPLCode;
  effectiveTime: {
    low: string;
    high?: string;
  };
}

export interface SPLContainerPackagedProduct {
  id: string;
  code: SPLCode; // NDC package code
  quantity: SPLQuantity;
  packaging?: SPLPackaging;
  subjectOf?: SPLMarketingAct;
  containedPackagedProduct?: SPLContainerPackagedProduct[];
}

export interface SPLPackaging {
  code: SPLCode;
  quantity?: SPLQuantity;
}

// ============================================================================
// SPL CONTENT SECTIONS
// ============================================================================

export interface SPLComponent {
  id: string;
  
  // Section identity
  sectionCode: SPLSectionCode;
  title: string;
  
  // Content
  text: SPLText;
  
  // Nested sections
  components?: SPLComponent[];
  
  // Effective date range
  effectiveTime?: {
    low?: string;
    high?: string;
  };
  
  // Rendering
  displayOrder: number;
}

export type SPLSectionCode = 
  // Prescription Drug Sections (PLR)
  | 'HIGHLIGHTS' | 'RECENT_MAJOR_CHANGES'
  | 'INDICATIONS_USAGE' | 'DOSAGE_ADMINISTRATION'
  | 'DOSAGE_FORMS_STRENGTHS' | 'CONTRAINDICATIONS'
  | 'WARNINGS_PRECAUTIONS' | 'ADVERSE_REACTIONS'
  | 'DRUG_INTERACTIONS' | 'USE_SPECIFIC_POPULATIONS'
  | 'OVERDOSAGE' | 'DESCRIPTION'
  | 'CLINICAL_PHARMACOLOGY' | 'NONCLINICAL_TOXICOLOGY'
  | 'CLINICAL_STUDIES' | 'REFERENCES'
  | 'HOW_SUPPLIED' | 'STORAGE_HANDLING'
  | 'PATIENT_COUNSELING' | 'MEDICATION_GUIDE'
  // Boxed Warning
  | 'BOXED_WARNING'
  // OTC Sections
  | 'ACTIVE_INGREDIENT' | 'PURPOSE'
  | 'USE' | 'WARNINGS' | 'DO_NOT_USE'
  | 'ASK_DOCTOR' | 'ASK_PHARMACIST'
  | 'STOP_USE' | 'PREGNANCY_BREASTFEEDING'
  | 'KEEP_OUT_OF_REACH' | 'DIRECTIONS'
  | 'OTHER_INFORMATION' | 'INACTIVE_INGREDIENT'
  | 'QUESTIONS' | 'PACKAGE_LABEL'
  // Other
  | 'SPL_UNCLASSIFIED';

export interface SPLText {
  // Narrative content (XHTML)
  content: string;
  
  // Tables
  tables?: SPLTable[];
  
  // Figures
  figures?: SPLFigure[];
  
  // Lists
  lists?: SPLList[];
  
  // Rendering
  renderStyle?: string;
}

export interface SPLTable {
  id: string;
  caption?: string;
  headers: string[];
  rows: string[][];
  footnotes?: string[];
}

export interface SPLFigure {
  id: string;
  caption?: string;
  mediaType: string;
  data: string; // Base64
  altText: string;
}

export interface SPLList {
  id: string;
  listType: 'ordered' | 'unordered';
  items: string[];
}

// ============================================================================
// SPL RENDERING & OUTPUT
// ============================================================================

export interface SPLRenderOptions {
  format: 'xml' | 'html' | 'pdf';
  includeImages: boolean;
  includeTables: boolean;
  includePackageInsert: boolean;
  includePatientLabeling: boolean;
  stylesheet?: string;
  outputPath?: string;
}

export interface SPLValidationResult {
  documentId: string;
  isValid: boolean;
  schemaErrors: SPLValidationError[];
  businessRuleErrors: SPLValidationError[];
  warnings: SPLValidationWarning[];
  validatedAt: string;
}

export interface SPLValidationError {
  severity: 'error';
  path: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface SPLValidationWarning {
  severity: 'warning';
  path: string;
  code: string;
  message: string;
}

// ============================================================================
// SPL STATE & ACTIONS
// ============================================================================

export interface SPLState {
  // Documents
  documents: Record<string, SPLDocument>;
  documentsBySetId: Record<string, string[]>;
  
  // Lookup indices
  documentsByProductId: Record<string, string[]>;
  documentsByLabeler: Record<string, string[]>;
  
  // Validation results
  validationResults: Record<string, SPLValidationResult>;
  
  // Render outputs
  renderedOutputs: Record<string, SPLRenderedOutput>;
  
  // UI State
  selectedDocumentId: string | null;
  activeView: SPLView;
  isLoading: boolean;
  error: string | null;
  
  // Sync status
  lastDailyMedSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export type SPLView = 
  | 'documents'
  | 'editor'
  | 'preview'
  | 'validation'
  | 'history'
  | 'dailymed';

export interface SPLRenderedOutput {
  documentId: string;
  format: 'xml' | 'html' | 'pdf';
  content: string;
  generatedAt: string;
  fileSize: number;
}

export interface SPLActions {
  // Document CRUD
  createDocument: (data: Partial<SPLDocument>) => SPLDocument;
  updateDocument: (id: string, updates: Partial<SPLDocument>) => void;
  deleteDocument: (id: string) => void;
  
  // Version management
  createNewVersion: (setId: string) => SPLDocument;
  getVersionHistory: (setId: string) => SPLDocument[];
  
  // Section management
  addSection: (documentId: string, section: Partial<SPLComponent>) => SPLComponent;
  updateSection: (documentId: string, sectionId: string, updates: Partial<SPLComponent>) => void;
  removeSection: (documentId: string, sectionId: string) => void;
  reorderSections: (documentId: string, sectionIds: string[]) => void;
  
  // Subject/Product management
  addSubject: (documentId: string, subject: Partial<SPLSubject>) => SPLSubject;
  updateSubject: (documentId: string, subjectId: string, updates: Partial<SPLSubject>) => void;
  removeSubject: (documentId: string, subjectId: string) => void;
  
  // Ingredient management
  addIngredient: (documentId: string, subjectId: string, ingredient: Partial<SPLIngredient>) => SPLIngredient;
  updateIngredient: (documentId: string, subjectId: string, ingredientId: string, updates: Partial<SPLIngredient>) => void;
  removeIngredient: (documentId: string, subjectId: string, ingredientId: string) => void;
  
  // Validation
  validateDocument: (documentId: string) => SPLValidationResult;
  validateAgainstDailyMed: (documentId: string) => Promise<SPLValidationResult>;
  
  // Rendering
  renderDocument: (documentId: string, options: SPLRenderOptions) => Promise<SPLRenderedOutput>;
  exportToXML: (documentId: string) => string;
  generatePreview: (documentId: string) => string;
  
  // Import
  importFromXML: (xml: string) => SPLDocument;
  importFromDailyMed: (setId: string) => Promise<SPLDocument>;
  
  // Cross-module integration
  linkToLabeling: (splDocumentId: string, labelingId: string) => void;
  linkToMedicinalProduct: (splDocumentId: string, mpId: string) => void;
  syncFromLabeling: (labelingId: string) => SPLDocument;
  getLinkedLabelingSummary: (splDocumentId: string) => { splDocumentId: string; linkedLabelingId: string; linkedAt: string; splSectionCount: number } | null;
  
  // DailyMed integration
  searchDailyMed: (query: string) => Promise<DailyMedSearchResult[]>;
  fetchFromDailyMed: (setId: string) => Promise<SPLDocument>;
  
  // UI Actions
  setSelectedDocument: (id: string | null) => void;
  setActiveView: (view: SPLView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}

export interface DailyMedSearchResult {
  setId: string;
  title: string;
  labelerName: string;
  productNames: string[];
  ndc: string[];
  publishedDate: string;
}

// ============================================================================
// SPL SECTION TEMPLATES
// ============================================================================

export const SPL_SECTION_TEMPLATES: Record<SPLSectionCode, { title: string; order: number; required: boolean }> = {
  // PLR Sections
  'BOXED_WARNING': { title: 'BOXED WARNING', order: 1, required: false },
  'HIGHLIGHTS': { title: 'HIGHLIGHTS OF PRESCRIBING INFORMATION', order: 2, required: true },
  'RECENT_MAJOR_CHANGES': { title: 'Recent Major Changes', order: 3, required: false },
  'INDICATIONS_USAGE': { title: 'INDICATIONS AND USAGE', order: 4, required: true },
  'DOSAGE_ADMINISTRATION': { title: 'DOSAGE AND ADMINISTRATION', order: 5, required: true },
  'DOSAGE_FORMS_STRENGTHS': { title: 'DOSAGE FORMS AND STRENGTHS', order: 6, required: true },
  'CONTRAINDICATIONS': { title: 'CONTRAINDICATIONS', order: 7, required: true },
  'WARNINGS_PRECAUTIONS': { title: 'WARNINGS AND PRECAUTIONS', order: 8, required: true },
  'ADVERSE_REACTIONS': { title: 'ADVERSE REACTIONS', order: 9, required: true },
  'DRUG_INTERACTIONS': { title: 'DRUG INTERACTIONS', order: 10, required: true },
  'USE_SPECIFIC_POPULATIONS': { title: 'USE IN SPECIFIC POPULATIONS', order: 11, required: true },
  'OVERDOSAGE': { title: 'OVERDOSAGE', order: 12, required: true },
  'DESCRIPTION': { title: 'DESCRIPTION', order: 13, required: true },
  'CLINICAL_PHARMACOLOGY': { title: 'CLINICAL PHARMACOLOGY', order: 14, required: true },
  'NONCLINICAL_TOXICOLOGY': { title: 'NONCLINICAL TOXICOLOGY', order: 15, required: false },
  'CLINICAL_STUDIES': { title: 'CLINICAL STUDIES', order: 16, required: false },
  'REFERENCES': { title: 'REFERENCES', order: 17, required: false },
  'HOW_SUPPLIED': { title: 'HOW SUPPLIED/STORAGE AND HANDLING', order: 18, required: true },
  'STORAGE_HANDLING': { title: 'Storage and Handling', order: 19, required: false },
  'PATIENT_COUNSELING': { title: 'PATIENT COUNSELING INFORMATION', order: 20, required: true },
  'MEDICATION_GUIDE': { title: 'Medication Guide', order: 21, required: false },
  
  // OTC Sections
  'ACTIVE_INGREDIENT': { title: 'Active ingredient', order: 1, required: true },
  'PURPOSE': { title: 'Purpose', order: 2, required: true },
  'USE': { title: 'Uses', order: 3, required: true },
  'WARNINGS': { title: 'Warnings', order: 4, required: true },
  'DO_NOT_USE': { title: 'Do not use', order: 5, required: false },
  'ASK_DOCTOR': { title: 'Ask a doctor before use', order: 6, required: false },
  'ASK_PHARMACIST': { title: 'Ask a doctor or pharmacist', order: 7, required: false },
  'STOP_USE': { title: 'Stop use and ask a doctor', order: 8, required: false },
  'PREGNANCY_BREASTFEEDING': { title: 'Pregnancy/Breastfeeding', order: 9, required: false },
  'KEEP_OUT_OF_REACH': { title: 'Keep out of reach of children', order: 10, required: true },
  'DIRECTIONS': { title: 'Directions', order: 11, required: true },
  'OTHER_INFORMATION': { title: 'Other information', order: 12, required: false },
  'INACTIVE_INGREDIENT': { title: 'Inactive ingredients', order: 13, required: true },
  'QUESTIONS': { title: 'Questions?', order: 14, required: false },
  'PACKAGE_LABEL': { title: 'Package Label', order: 15, required: true },
  
  // Generic
  'SPL_UNCLASSIFIED': { title: 'Other', order: 99, required: false },
};
