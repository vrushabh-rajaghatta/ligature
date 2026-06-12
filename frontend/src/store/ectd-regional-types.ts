
// =============================================================================
// eCTD REGIONAL CONFIGURATION TYPES - v0.9.11
// =============================================================================
// Regional-specific configurations for eCTD submissions to regulatory agencies.
// Covers Module 1 variations, submission types, gateway specs, and validation
// rules for FDA, EMA, PMDA, Health Canada, TGA, and Swissmedic.
// =============================================================================

import type {
  ECTDSpecVersion,
  CTDModule,
  RegionalSubmissionType,
  ValidationRule,
  ValidationSeverity,
  ValidationCategory,
} from './ectd-publishing-types';

// -----------------------------------------------------------------------------
// REGION IDENTIFIERS
// -----------------------------------------------------------------------------

/** Supported regulatory regions */
export type RegulatoryRegion = 'US' | 'EU' | 'JP' | 'CA' | 'AU' | 'CH';

/** Region display names */
export const REGION_NAMES: Record<RegulatoryRegion, string> = {
  US: 'United States (FDA)',
  EU: 'European Union (EMA)',
  JP: 'Japan (PMDA)',
  CA: 'Canada (Health Canada)',
  AU: 'Australia (TGA)',
  CH: 'Switzerland (Swissmedic)',
};

/** Region ISO codes */
export const REGION_ISO_CODES: Record<RegulatoryRegion, string> = {
  US: 'us',
  EU: 'eu',
  JP: 'jp',
  CA: 'ca',
  AU: 'au',
  CH: 'ch',
};

// -----------------------------------------------------------------------------
// REGIONAL CONFIGURATION BASE
// -----------------------------------------------------------------------------

/** Base regional configuration */
export interface RegionalConfiguration {
  region: RegulatoryRegion;
  regionCode: string;
  agencyName: string;
  agencyAbbreviation: string;
  supportedECTDVersions: ECTDSpecVersion[];
  preferredECTDVersion: ECTDSpecVersion;
  
  // Module 1 structure
  module1Sections: Module1SectionConfig[];
  
  // Submission types
  submissionTypes: SubmissionTypeConfig[];
  
  // Gateway configuration
  gateway: GatewayConfig;
  
  // Validation rules
  validationRules: RegionalValidationRule[];
  
  // Document requirements
  documentRequirements: DocumentRequirements;
  
  // Formatting standards
  formattingStandards: FormattingStandards;
  
  // Contact information
  contact: AgencyContact;
}

// -----------------------------------------------------------------------------
// MODULE 1 CONFIGURATION
// -----------------------------------------------------------------------------

/** Module 1 section configuration */
export interface Module1SectionConfig {
  sectionNumber: string;            // e.g., '1.1', '1.2'
  sectionTitle: string;
  parentSection?: string;
  isRequired: boolean;
  applicableSubmissionTypes?: string[];
  documentTypes: Module1DocumentType[];
  notes?: string;
}

/** Document type within Module 1 */
export interface Module1DocumentType {
  id: string;
  name: string;
  description?: string;
  fileType: 'pdf' | 'xml' | 'form';
  isRequired: boolean;
  templatePath?: string;
  formId?: string;                  // For XML forms (e.g., FDA Forms)
  maxFileSizeMB?: number;
}

// -----------------------------------------------------------------------------
// SUBMISSION TYPE CONFIGURATION
// -----------------------------------------------------------------------------

/** Submission type configuration */
export interface SubmissionTypeConfig {
  id: string;
  code: RegionalSubmissionType;
  name: string;
  description: string;
  category: SubmissionCategory;
  
  // Required modules
  requiredModules: CTDModule[];
  optionalModules: CTDModule[];
  
  // Sequence rules
  allowsOriginalSubmission: boolean;
  allowsAmendments: boolean;
  allowsSupplements: boolean;
  
  // Timelines
  targetReviewDays?: number;
  standardReviewDays?: number;
  priorityReviewDays?: number;
  
  // Fees
  hasApplicationFee: boolean;
  feeAmount?: number;
  feeCurrency?: string;
  
  // Special requirements
  requiresPriorMeeting: boolean;
  requiresPresubmissionMeeting?: boolean;
  specialInstructions?: string;
}

export type SubmissionCategory =
  | 'new-application'
  | 'supplement'
  | 'amendment'
  | 'variation'
  | 'renewal'
  | 'report'
  | 'notification';

// -----------------------------------------------------------------------------
// GATEWAY CONFIGURATION
// -----------------------------------------------------------------------------

/** Electronic submission gateway configuration */
export interface GatewayConfig {
  name: string;
  type: GatewayType;
  url: string;
  testUrl?: string;
  
  // Authentication
  authMethod: 'certificate' | 'username-password' | 'token' | 'federated';
  requiresRegistration: boolean;
  registrationUrl?: string;
  
  // Transmission
  protocol: 'AS2' | 'HTTPS' | 'SFTP' | 'ESG';
  maxFileSizeMB: number;
  supportsBulkSubmission: boolean;
  supportsPartialSubmission: boolean;
  
  // Response handling
  acknowledgementType: 'immediate' | 'async';
  acknowledgementTimeoutMinutes: number;
  
  // Supported formats
  supportedFormats: ('ectd' | 'nees' | 'paper')[];
  
  // Testing
  testEnvironmentAvailable: boolean;
  testEnvironmentUrl?: string;
}

export type GatewayType =
  | 'FDA-ESG'       // FDA Electronic Submissions Gateway
  | 'EMA-CESP'      // EMA Common European Submission Portal
  | 'PMDA-Gateway'  // PMDA Gateway System
  | 'HC-CTA'        // Health Canada Common Tool for Applications
  | 'TGA-Portal'    // TGA Business Services Portal
  | 'SM-Portal';    // Swissmedic Portal

// -----------------------------------------------------------------------------
// VALIDATION RULES
// -----------------------------------------------------------------------------

/** Regional-specific validation rule */
export interface RegionalValidationRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  
  // Applicability
  applicableSubmissionTypes?: string[];
  applicableModules?: CTDModule[];
  applicableSections?: string[];
  
  // Rule details
  ruleType: 'xpath' | 'schematron' | 'custom';
  expression?: string;
  parameters?: Record<string, unknown>;
  
  // Metadata
  source: string;
  effectiveDate?: string;
  expirationDate?: string;
  isActive: boolean;
}

// -----------------------------------------------------------------------------
// DOCUMENT REQUIREMENTS
// -----------------------------------------------------------------------------

/** Document requirements for region */
export interface DocumentRequirements {
  // PDF specifications
  pdfVersion: string[];             // Allowed PDF versions
  pdfMaxSizeMB: number;
  requireBookmarks: boolean;
  requireHyperlinks: boolean;
  requireFontsEmbedded: boolean;
  requireTaggedPDF: boolean;
  requireSearchable: boolean;
  
  // Page specifications
  allowedPageSizes: PageSize[];
  marginRequirements?: MarginRequirements;
  
  // Font requirements
  minimumFontSize: number;
  allowedFontFamilies?: string[];
  
  // Granularity requirements
  maxPagesPerDocument?: number;
  requireGranularity: boolean;
  granularityGuidance?: string;
  
  // Naming conventions
  fileNamingConvention: string;
  maxFileNameLength: number;
  allowedCharacters: string;
  
  // Language requirements
  primaryLanguage: string;
  allowedLanguages: string[];
  requireTranslation: boolean;
}

export interface PageSize {
  name: string;
  widthMM: number;
  heightMM: number;
}

export interface MarginRequirements {
  topMM: number;
  bottomMM: number;
  leftMM: number;
  rightMM: number;
}

// -----------------------------------------------------------------------------
// FORMATTING STANDARDS
// -----------------------------------------------------------------------------

/** Formatting standards for region */
export interface FormattingStandards {
  // Date formats
  dateFormat: string;               // e.g., 'YYYY-MM-DD', 'DD-Mon-YYYY'
  dateTimeFormat: string;
  
  // Number formats
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ';
  
  // Units
  preferredUnits: 'metric' | 'imperial';
  
  // Currency
  defaultCurrency: string;
  
  // Study numbering
  studyNumberFormat?: string;
  
  // Document version format
  versionFormat: string;
}

// -----------------------------------------------------------------------------
// AGENCY CONTACT
// -----------------------------------------------------------------------------

/** Agency contact information */
export interface AgencyContact {
  name: string;
  department?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website: string;
  helpDeskUrl?: string;
}

// =============================================================================
// REGION-SPECIFIC CONFIGURATIONS
// =============================================================================

// -----------------------------------------------------------------------------
// US FDA CONFIGURATION
// -----------------------------------------------------------------------------

/** FDA-specific Module 1 sections */
export const FDA_MODULE1_SECTIONS: Module1SectionConfig[] = [
  {
    sectionNumber: '1.1',
    sectionTitle: 'Forms',
    isRequired: true,
    documentTypes: [
      { id: 'fda-356h', name: 'FDA Form 356h', fileType: 'xml', isRequired: true, formId: '356h' },
      { id: 'fda-1571', name: 'FDA Form 1571', fileType: 'xml', isRequired: false, formId: '1571' },
      { id: 'fda-1572', name: 'FDA Form 1572', fileType: 'xml', isRequired: false, formId: '1572' },
      { id: 'fda-3674', name: 'FDA Form 3674 (Certification)', fileType: 'xml', isRequired: false, formId: '3674' },
    ],
  },
  {
    sectionNumber: '1.2',
    sectionTitle: 'Cover Letter',
    isRequired: true,
    documentTypes: [
      { id: 'cover-letter', name: 'Cover Letter', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.3',
    sectionTitle: 'Administrative Information',
    isRequired: false,
    documentTypes: [
      { id: 'administrative', name: 'Administrative Information', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.4',
    sectionTitle: 'References',
    isRequired: false,
    documentTypes: [
      { id: 'lot-references', name: 'Letters of Authorization', fileType: 'pdf', isRequired: false },
      { id: 'sow', name: 'Statement of Work', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.5',
    sectionTitle: 'Application Integrity Policy',
    isRequired: false,
    documentTypes: [
      { id: 'aip', name: 'Application Integrity Statement', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.6',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.7',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.8',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.9',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.10',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.11',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.12',
    sectionTitle: 'Labeling',
    isRequired: true,
    applicableSubmissionTypes: ['nda', 'bla', 'nda-supplement', 'bla-supplement'],
    documentTypes: [
      { id: 'spl', name: 'Structured Product Labeling (SPL)', fileType: 'xml', isRequired: true },
      { id: 'pi', name: 'Prescribing Information', fileType: 'pdf', isRequired: true },
      { id: 'ppi', name: 'Patient Package Insert', fileType: 'pdf', isRequired: false },
      { id: 'mg', name: 'Medication Guide', fileType: 'pdf', isRequired: false },
      { id: 'container-labels', name: 'Container Labels', fileType: 'pdf', isRequired: false },
      { id: 'carton-labels', name: 'Carton Labels', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.13',
    sectionTitle: 'Reserved',
    isRequired: false,
    documentTypes: [],
  },
  {
    sectionNumber: '1.14',
    sectionTitle: 'Environmental Assessment/Categorical Exclusion',
    isRequired: false,
    documentTypes: [
      { id: 'ea', name: 'Environmental Assessment', fileType: 'pdf', isRequired: false },
      { id: 'ce', name: 'Categorical Exclusion', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.15',
    sectionTitle: 'Pediatric Administrative Information',
    isRequired: false,
    documentTypes: [
      { id: 'pediatric', name: 'Pediatric Study Plan', fileType: 'pdf', isRequired: false },
      { id: 'prea', name: 'PREA Information', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.16',
    sectionTitle: 'Risk Management',
    isRequired: false,
    documentTypes: [
      { id: 'rems', name: 'REMS Documentation', fileType: 'pdf', isRequired: false },
    ],
  },
];

/** FDA submission types */
export const FDA_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'fda-nda',
    code: 'nda',
    name: 'New Drug Application (NDA)',
    description: 'Application for approval of a new drug product',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 180,
    standardReviewDays: 300,
    priorityReviewDays: 180,
    hasApplicationFee: true,
    feeAmount: 3678994,
    feeCurrency: 'USD',
    requiresPriorMeeting: false,
    requiresPresubmissionMeeting: true,
  },
  {
    id: 'fda-anda',
    code: 'anda',
    name: 'Abbreviated New Drug Application (ANDA)',
    description: 'Application for approval of a generic drug product',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3'],
    optionalModules: ['m4', 'm5'],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 180,
    standardReviewDays: 300,
    hasApplicationFee: true,
    feeAmount: 259320,
    feeCurrency: 'USD',
    requiresPriorMeeting: false,
  },
  {
    id: 'fda-bla',
    code: 'bla',
    name: 'Biologics License Application (BLA)',
    description: 'Application for approval of a biological product',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 180,
    standardReviewDays: 300,
    priorityReviewDays: 180,
    hasApplicationFee: true,
    feeAmount: 3678994,
    feeCurrency: 'USD',
    requiresPriorMeeting: false,
    requiresPresubmissionMeeting: true,
  },
  {
    id: 'fda-ind',
    code: 'ind',
    name: 'Investigational New Drug (IND)',
    description: 'Application to conduct clinical trials',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4'],
    optionalModules: ['m5'],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 30,
    hasApplicationFee: false,
    requiresPriorMeeting: false,
  },
  {
    id: 'fda-nda-supplement',
    code: 'nda-supplement',
    name: 'NDA Supplement (sNDA)',
    description: 'Supplement to an approved NDA',
    category: 'supplement',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: true,
    allowsSupplements: true,
    targetReviewDays: 180,
    standardReviewDays: 300,
    hasApplicationFee: true,
    requiresPriorMeeting: false,
  },
  {
    id: 'fda-annual-report',
    code: 'annual-report',
    name: 'Annual Report',
    description: 'Annual status report for approved application',
    category: 'report',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: false,
    allowsSupplements: false,
    hasApplicationFee: false,
    requiresPriorMeeting: false,
  },
];

/** FDA ESG gateway configuration */
export const FDA_GATEWAY: GatewayConfig = {
  name: 'FDA Electronic Submissions Gateway (ESG)',
  type: 'FDA-ESG',
  url: 'https://esg.fda.gov',
  testUrl: 'https://esgtest.fda.gov',
  authMethod: 'certificate',
  requiresRegistration: true,
  registrationUrl: 'https://www.fda.gov/industry/electronic-submissions-gateway',
  protocol: 'AS2',
  maxFileSizeMB: 100,
  supportsBulkSubmission: true,
  supportsPartialSubmission: false,
  acknowledgementType: 'async',
  acknowledgementTimeoutMinutes: 60,
  supportedFormats: ['ectd'],
  testEnvironmentAvailable: true,
  testEnvironmentUrl: 'https://esgtest.fda.gov',
};

/** FDA document requirements */
export const FDA_DOCUMENT_REQUIREMENTS: DocumentRequirements = {
  pdfVersion: ['1.4', '1.5', '1.6', '1.7'],
  pdfMaxSizeMB: 100,
  requireBookmarks: true,
  requireHyperlinks: true,
  requireFontsEmbedded: true,
  requireTaggedPDF: false,
  requireSearchable: true,
  allowedPageSizes: [
    { name: 'Letter', widthMM: 215.9, heightMM: 279.4 },
    { name: 'A4', widthMM: 210, heightMM: 297 },
  ],
  marginRequirements: {
    topMM: 25.4,
    bottomMM: 25.4,
    leftMM: 25.4,
    rightMM: 25.4,
  },
  minimumFontSize: 9,
  maxFileNameLength: 64,
  allowedCharacters: 'a-z0-9-_',
  fileNamingConvention: 'lowercase-hyphenated',
  primaryLanguage: 'en',
  allowedLanguages: ['en'],
  requireTranslation: false,
  requireGranularity: true,
  granularityGuidance: 'Documents should be split at logical section breaks per FDA Guidance',
};

// -----------------------------------------------------------------------------
// EU EMA CONFIGURATION
// -----------------------------------------------------------------------------

/** EMA-specific Module 1 sections */
export const EMA_MODULE1_SECTIONS: Module1SectionConfig[] = [
  {
    sectionNumber: '1.0',
    sectionTitle: 'Cover Letter',
    isRequired: true,
    documentTypes: [
      { id: 'cover-letter', name: 'Cover Letter', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.1',
    sectionTitle: 'Table of Contents',
    isRequired: true,
    documentTypes: [
      { id: 'toc', name: 'Comprehensive Table of Contents', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.2',
    sectionTitle: 'Application Form',
    isRequired: true,
    documentTypes: [
      { id: 'form-a', name: 'Form A - Application for Marketing Authorisation', fileType: 'pdf', isRequired: true },
      { id: 'form-b', name: 'Form B - Application Form Annex', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.3',
    sectionTitle: 'Product Information',
    isRequired: true,
    documentTypes: [
      { id: 'smpc', name: 'Summary of Product Characteristics (SmPC)', fileType: 'pdf', isRequired: true },
      { id: 'labelling', name: 'Labelling', fileType: 'pdf', isRequired: true },
      { id: 'pil', name: 'Package Leaflet', fileType: 'pdf', isRequired: true },
      { id: 'mock-up', name: 'Mock-ups', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.4',
    sectionTitle: 'Information About the Experts',
    isRequired: true,
    documentTypes: [
      { id: 'expert-quality', name: 'Quality Expert Statement', fileType: 'pdf', isRequired: true },
      { id: 'expert-nonclinical', name: 'Non-clinical Expert Statement', fileType: 'pdf', isRequired: true },
      { id: 'expert-clinical', name: 'Clinical Expert Statement', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.5',
    sectionTitle: 'Specific Requirements for Different Types of Applications',
    isRequired: false,
    documentTypes: [
      { id: 'orphan', name: 'Orphan Drug Designation', fileType: 'pdf', isRequired: false },
      { id: 'conditional', name: 'Conditional Approval Information', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.6',
    sectionTitle: 'Environmental Risk Assessment',
    isRequired: true,
    documentTypes: [
      { id: 'era', name: 'Environmental Risk Assessment', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.7',
    sectionTitle: 'Information Relating to Orphan Market Exclusivity',
    isRequired: false,
    documentTypes: [
      { id: 'orphan-exclusivity', name: 'Orphan Exclusivity Information', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.8',
    sectionTitle: 'Information Relating to Pharmacovigilance',
    isRequired: true,
    documentTypes: [
      { id: 'psmf', name: 'Pharmacovigilance System Master File', fileType: 'pdf', isRequired: true },
      { id: 'rmp', name: 'Risk Management Plan', fileType: 'pdf', isRequired: true },
    ],
  },
  {
    sectionNumber: '1.9',
    sectionTitle: 'Information Relating to Clinical Trials',
    isRequired: false,
    documentTypes: [
      { id: 'cta', name: 'Clinical Trial Information', fileType: 'pdf', isRequired: false },
    ],
  },
  {
    sectionNumber: '1.10',
    sectionTitle: 'Information Relating to Paediatrics',
    isRequired: false,
    documentTypes: [
      { id: 'pip', name: 'Paediatric Investigation Plan', fileType: 'pdf', isRequired: false },
      { id: 'pip-compliance', name: 'PIP Compliance Statement', fileType: 'pdf', isRequired: false },
    ],
  },
];

/** EMA submission types */
export const EMA_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'ema-maa',
    code: 'maa',
    name: 'Marketing Authorisation Application (MAA)',
    description: 'Initial application for marketing authorisation in EU',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 210,
    standardReviewDays: 210,
    hasApplicationFee: true,
    feeAmount: 299000,
    feeCurrency: 'EUR',
    requiresPriorMeeting: false,
    requiresPresubmissionMeeting: true,
    specialInstructions: 'Scientific Advice recommended before submission',
  },
  {
    id: 'ema-type-ia',
    code: 'type-ia',
    name: 'Type IA Variation',
    description: 'Minor variation - notification',
    category: 'variation',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: false,
    allowsSupplements: true,
    hasApplicationFee: true,
    feeAmount: 3500,
    feeCurrency: 'EUR',
    requiresPriorMeeting: false,
  },
  {
    id: 'ema-type-ib',
    code: 'type-ib',
    name: 'Type IB Variation',
    description: 'Minor variation requiring approval',
    category: 'variation',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: false,
    allowsSupplements: true,
    targetReviewDays: 30,
    hasApplicationFee: true,
    feeAmount: 3500,
    feeCurrency: 'EUR',
    requiresPriorMeeting: false,
  },
  {
    id: 'ema-type-ii',
    code: 'type-ii',
    name: 'Type II Variation',
    description: 'Major variation requiring assessment',
    category: 'variation',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: true,
    allowsSupplements: true,
    targetReviewDays: 60,
    standardReviewDays: 90,
    hasApplicationFee: true,
    feeAmount: 49300,
    feeCurrency: 'EUR',
    requiresPriorMeeting: false,
  },
  {
    id: 'ema-renewal',
    code: 'maa-renewal',
    name: 'Marketing Authorisation Renewal',
    description: 'Renewal of marketing authorisation',
    category: 'renewal',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: false,
    allowsSupplements: false,
    targetReviewDays: 90,
    hasApplicationFee: true,
    feeAmount: 14900,
    feeCurrency: 'EUR',
    requiresPriorMeeting: false,
  },
  {
    id: 'ema-psur',
    code: 'maa-psur',
    name: 'Periodic Safety Update Report (PSUR)',
    description: 'Periodic safety update report submission',
    category: 'report',
    requiredModules: ['m1'],
    optionalModules: ['m5'],
    allowsOriginalSubmission: false,
    allowsAmendments: false,
    allowsSupplements: false,
    hasApplicationFee: false,
    requiresPriorMeeting: false,
  },
];

/** EMA CESP gateway configuration */
export const EMA_GATEWAY: GatewayConfig = {
  name: 'Common European Submission Portal (CESP)',
  type: 'EMA-CESP',
  url: 'https://cesp.ema.europa.eu',
  testUrl: 'https://cesp-test.ema.europa.eu',
  authMethod: 'federated',
  requiresRegistration: true,
  registrationUrl: 'https://register.ema.europa.eu',
  protocol: 'HTTPS',
  maxFileSizeMB: 500,
  supportsBulkSubmission: true,
  supportsPartialSubmission: true,
  acknowledgementType: 'immediate',
  acknowledgementTimeoutMinutes: 15,
  supportedFormats: ['ectd', 'nees'],
  testEnvironmentAvailable: true,
  testEnvironmentUrl: 'https://cesp-test.ema.europa.eu',
};

/** EMA document requirements */
export const EMA_DOCUMENT_REQUIREMENTS: DocumentRequirements = {
  pdfVersion: ['1.4', '1.5', '1.6', '1.7'],
  pdfMaxSizeMB: 100,
  requireBookmarks: true,
  requireHyperlinks: true,
  requireFontsEmbedded: true,
  requireTaggedPDF: false,
  requireSearchable: true,
  allowedPageSizes: [
    { name: 'A4', widthMM: 210, heightMM: 297 },
  ],
  marginRequirements: {
    topMM: 25,
    bottomMM: 25,
    leftMM: 25,
    rightMM: 25,
  },
  minimumFontSize: 9,
  maxFileNameLength: 64,
  allowedCharacters: 'a-z0-9-_',
  fileNamingConvention: 'lowercase-hyphenated',
  primaryLanguage: 'en',
  allowedLanguages: ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'cs', 'hu', 'ro', 'bg', 'el', 'sv', 'da', 'fi', 'sk', 'sl', 'lt', 'lv', 'et', 'mt', 'ga', 'hr'],
  requireTranslation: true,
  requireGranularity: true,
  granularityGuidance: 'Follow EMA eCTD Granularity Guidance',
};

// -----------------------------------------------------------------------------
// JAPAN PMDA CONFIGURATION
// -----------------------------------------------------------------------------

/** PMDA submission types */
export const PMDA_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'pmda-jnda',
    code: 'j-nda',
    name: 'J-NDA (新医薬品申請)',
    description: 'New Drug Application (Japan)',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 360,
    standardReviewDays: 360,
    priorityReviewDays: 180,
    hasApplicationFee: true,
    requiresPriorMeeting: false,
    requiresPresubmissionMeeting: true,
  },
  {
    id: 'pmda-jnda-partial',
    code: 'j-nda-partial',
    name: 'Partial Change Application',
    description: 'Application for partial change to approved product',
    category: 'supplement',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: true,
    allowsSupplements: true,
    hasApplicationFee: true,
    requiresPriorMeeting: false,
  },
];

/** PMDA gateway configuration */
export const PMDA_GATEWAY: GatewayConfig = {
  name: 'PMDA Gateway System',
  type: 'PMDA-Gateway',
  url: 'https://gateway.pmda.go.jp',
  authMethod: 'certificate',
  requiresRegistration: true,
  registrationUrl: 'https://www.pmda.go.jp/english/review-services/electronic-data/',
  protocol: 'HTTPS',
  maxFileSizeMB: 100,
  supportsBulkSubmission: false,
  supportsPartialSubmission: false,
  acknowledgementType: 'async',
  acknowledgementTimeoutMinutes: 120,
  supportedFormats: ['ectd'],
  testEnvironmentAvailable: true,
};

// -----------------------------------------------------------------------------
// CANADA HEALTH CANADA CONFIGURATION
// -----------------------------------------------------------------------------

/** Health Canada submission types */
export const HC_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'hc-nds',
    code: 'nds',
    name: 'New Drug Submission (NDS)',
    description: 'Application for new drug approval in Canada',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 300,
    standardReviewDays: 300,
    priorityReviewDays: 180,
    hasApplicationFee: true,
    feeAmount: 490000,
    feeCurrency: 'CAD',
    requiresPriorMeeting: false,
  },
  {
    id: 'hc-ands',
    code: 'ands',
    name: 'Abbreviated New Drug Submission (ANDS)',
    description: 'Generic drug application',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3'],
    optionalModules: ['m4', 'm5'],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 180,
    hasApplicationFee: true,
    feeAmount: 84500,
    feeCurrency: 'CAD',
    requiresPriorMeeting: false,
  },
  {
    id: 'hc-snds',
    code: 'snds',
    name: 'Supplemental New Drug Submission (SNDS)',
    description: 'Supplement to approved drug submission',
    category: 'supplement',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: true,
    allowsSupplements: true,
    hasApplicationFee: true,
    requiresPriorMeeting: false,
  },
];

/** Health Canada CTA gateway configuration */
export const HC_GATEWAY: GatewayConfig = {
  name: 'Health Canada Common Tool for Applications (CTA)',
  type: 'HC-CTA',
  url: 'https://health-products.canada.ca',
  authMethod: 'federated',
  requiresRegistration: true,
  registrationUrl: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/applications-submissions/guidance-documents/common-electronic-submissions-gateway.html',
  protocol: 'HTTPS',
  maxFileSizeMB: 250,
  supportsBulkSubmission: true,
  supportsPartialSubmission: true,
  acknowledgementType: 'immediate',
  acknowledgementTimeoutMinutes: 30,
  supportedFormats: ['ectd', 'nees'],
  testEnvironmentAvailable: true,
};

// -----------------------------------------------------------------------------
// AUSTRALIA TGA CONFIGURATION
// -----------------------------------------------------------------------------

/** TGA submission types */
export const TGA_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'tga-prescription',
    code: 'prescription',
    name: 'Prescription Medicine',
    description: 'Application for prescription medicine registration',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 255,
    hasApplicationFee: true,
    feeAmount: 310000,
    feeCurrency: 'AUD',
    requiresPriorMeeting: false,
  },
  {
    id: 'tga-biological',
    code: 'biological',
    name: 'Biological Medicine',
    description: 'Application for biological medicine registration',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 255,
    hasApplicationFee: true,
    feeAmount: 310000,
    feeCurrency: 'AUD',
    requiresPriorMeeting: false,
  },
];

/** TGA gateway configuration */
export const TGA_GATEWAY: GatewayConfig = {
  name: 'TGA Business Services Portal',
  type: 'TGA-Portal',
  url: 'https://portal.tga.gov.au',
  authMethod: 'federated',
  requiresRegistration: true,
  registrationUrl: 'https://www.tga.gov.au/electronic-lodgement',
  protocol: 'HTTPS',
  maxFileSizeMB: 100,
  supportsBulkSubmission: true,
  supportsPartialSubmission: false,
  acknowledgementType: 'immediate',
  acknowledgementTimeoutMinutes: 15,
  supportedFormats: ['ectd'],
  testEnvironmentAvailable: true,
};

// -----------------------------------------------------------------------------
// SWITZERLAND SWISSMEDIC CONFIGURATION
// -----------------------------------------------------------------------------

/** Swissmedic submission types */
export const SM_SUBMISSION_TYPES: SubmissionTypeConfig[] = [
  {
    id: 'sm-new',
    code: 'swiss-new',
    name: 'New Marketing Authorisation',
    description: 'Application for new marketing authorisation in Switzerland',
    category: 'new-application',
    requiredModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
    optionalModules: [],
    allowsOriginalSubmission: true,
    allowsAmendments: true,
    allowsSupplements: false,
    targetReviewDays: 330,
    hasApplicationFee: true,
    feeAmount: 95000,
    feeCurrency: 'CHF',
    requiresPriorMeeting: false,
  },
  {
    id: 'sm-variation',
    code: 'swiss-variation',
    name: 'Variation',
    description: 'Variation to approved authorisation',
    category: 'variation',
    requiredModules: ['m1'],
    optionalModules: ['m2', 'm3', 'm4', 'm5'],
    allowsOriginalSubmission: false,
    allowsAmendments: true,
    allowsSupplements: true,
    hasApplicationFee: true,
    requiresPriorMeeting: false,
  },
];

/** Swissmedic gateway configuration */
export const SM_GATEWAY: GatewayConfig = {
  name: 'Swissmedic Portal',
  type: 'SM-Portal',
  url: 'https://portal.swissmedic.ch',
  authMethod: 'certificate',
  requiresRegistration: true,
  registrationUrl: 'https://www.swissmedic.ch/swissmedic/en/home/services/esubmission.html',
  protocol: 'HTTPS',
  maxFileSizeMB: 100,
  supportsBulkSubmission: false,
  supportsPartialSubmission: false,
  acknowledgementType: 'async',
  acknowledgementTimeoutMinutes: 60,
  supportedFormats: ['ectd'],
  testEnvironmentAvailable: true,
};

// =============================================================================
// COMPLETE REGIONAL CONFIGURATIONS
// =============================================================================

/** Complete FDA configuration */
export const FDA_CONFIGURATION: RegionalConfiguration = {
  region: 'US',
  regionCode: 'us',
  agencyName: 'Food and Drug Administration',
  agencyAbbreviation: 'FDA',
  supportedECTDVersions: ['3.2.2', '4.0'],
  preferredECTDVersion: '4.0',
  module1Sections: FDA_MODULE1_SECTIONS,
  submissionTypes: FDA_SUBMISSION_TYPES,
  gateway: FDA_GATEWAY,
  validationRules: [], // Loaded separately
  documentRequirements: FDA_DOCUMENT_REQUIREMENTS,
  formattingStandards: {
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    preferredUnits: 'metric',
    defaultCurrency: 'USD',
    versionFormat: 'X.X',
  },
  contact: {
    name: 'CDER Office of Regulatory Operations',
    department: 'Center for Drug Evaluation and Research',
    address: {
      street: '10903 New Hampshire Avenue',
      city: 'Silver Spring',
      postalCode: '20993',
      country: 'United States',
    },
    phone: '+1-301-796-3400',
    website: 'https://www.fda.gov/drugs',
    helpDeskUrl: 'https://www.fda.gov/industry/electronic-submissions-gateway',
  },
};

/** Complete EMA configuration */
export const EMA_CONFIGURATION: RegionalConfiguration = {
  region: 'EU',
  regionCode: 'eu',
  agencyName: 'European Medicines Agency',
  agencyAbbreviation: 'EMA',
  supportedECTDVersions: ['3.2.2', '4.0'],
  preferredECTDVersion: '4.0',
  module1Sections: EMA_MODULE1_SECTIONS,
  submissionTypes: EMA_SUBMISSION_TYPES,
  gateway: EMA_GATEWAY,
  validationRules: [], // Loaded separately
  documentRequirements: EMA_DOCUMENT_REQUIREMENTS,
  formattingStandards: {
    dateFormat: 'DD-Mon-YYYY',
    dateTimeFormat: 'DD-Mon-YYYY HH:mm',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    preferredUnits: 'metric',
    defaultCurrency: 'EUR',
    versionFormat: 'X.X',
  },
  contact: {
    name: 'EMA Submission Support',
    address: {
      street: 'Domenico Scarlattilaan 6',
      city: 'Amsterdam',
      postalCode: '1083 HS',
      country: 'Netherlands',
    },
    phone: '+31-88-781-6000',
    email: 'submissions@ema.europa.eu',
    website: 'https://www.ema.europa.eu',
    helpDeskUrl: 'https://servicedesk.ema.europa.eu',
  },
};

/** All regional configurations */
export const REGIONAL_CONFIGURATIONS: Record<RegulatoryRegion, RegionalConfiguration> = {
  US: FDA_CONFIGURATION,
  EU: EMA_CONFIGURATION,
  JP: {
    region: 'JP',
    regionCode: 'jp',
    agencyName: 'Pharmaceuticals and Medical Devices Agency',
    agencyAbbreviation: 'PMDA',
    supportedECTDVersions: ['3.2.2', '4.0'],
    preferredECTDVersion: '4.0',
    module1Sections: [], // Japanese M1 sections
    submissionTypes: PMDA_SUBMISSION_TYPES,
    gateway: PMDA_GATEWAY,
    validationRules: [],
    documentRequirements: {
      ...FDA_DOCUMENT_REQUIREMENTS,
      primaryLanguage: 'ja',
      allowedLanguages: ['ja', 'en'],
      requireTranslation: true,
    },
    formattingStandards: {
      dateFormat: 'YYYY年MM月DD日',
      dateTimeFormat: 'YYYY年MM月DD日 HH:mm',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      preferredUnits: 'metric',
      defaultCurrency: 'JPY',
      versionFormat: 'X.X',
    },
    contact: {
      name: 'PMDA Regulatory Science Division',
      address: {
        street: 'Shin-Kasumigaseki Building',
        city: 'Tokyo',
        postalCode: '100-0013',
        country: 'Japan',
      },
      website: 'https://www.pmda.go.jp',
    },
  },
  CA: {
    region: 'CA',
    regionCode: 'ca',
    agencyName: 'Health Canada',
    agencyAbbreviation: 'HC',
    supportedECTDVersions: ['3.2.2', '4.0'],
    preferredECTDVersion: '4.0',
    module1Sections: [], // Canadian M1 sections
    submissionTypes: HC_SUBMISSION_TYPES,
    gateway: HC_GATEWAY,
    validationRules: [],
    documentRequirements: {
      ...FDA_DOCUMENT_REQUIREMENTS,
      primaryLanguage: 'en',
      allowedLanguages: ['en', 'fr'],
      requireTranslation: true,
    },
    formattingStandards: {
      dateFormat: 'YYYY-MM-DD',
      dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      preferredUnits: 'metric',
      defaultCurrency: 'CAD',
      versionFormat: 'X.X',
    },
    contact: {
      name: 'Health Products and Food Branch',
      address: {
        street: '101 Tunney\'s Pasture Driveway',
        city: 'Ottawa',
        postalCode: 'K1A 0K9',
        country: 'Canada',
      },
      website: 'https://www.canada.ca/en/health-canada.html',
    },
  },
  AU: {
    region: 'AU',
    regionCode: 'au',
    agencyName: 'Therapeutic Goods Administration',
    agencyAbbreviation: 'TGA',
    supportedECTDVersions: ['3.2.2', '4.0'],
    preferredECTDVersion: '4.0',
    module1Sections: [], // Australian M1 sections
    submissionTypes: TGA_SUBMISSION_TYPES,
    gateway: TGA_GATEWAY,
    validationRules: [],
    documentRequirements: FDA_DOCUMENT_REQUIREMENTS,
    formattingStandards: {
      dateFormat: 'DD-Mon-YYYY',
      dateTimeFormat: 'DD-Mon-YYYY HH:mm',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      preferredUnits: 'metric',
      defaultCurrency: 'AUD',
      versionFormat: 'X.X',
    },
    contact: {
      name: 'TGA Business Services',
      address: {
        street: 'Symonston',
        city: 'Canberra',
        postalCode: 'ACT 2609',
        country: 'Australia',
      },
      website: 'https://www.tga.gov.au',
    },
  },
  CH: {
    region: 'CH',
    regionCode: 'ch',
    agencyName: 'Swissmedic',
    agencyAbbreviation: 'SM',
    supportedECTDVersions: ['3.2.2', '4.0'],
    preferredECTDVersion: '4.0',
    module1Sections: [], // Swiss M1 sections
    submissionTypes: SM_SUBMISSION_TYPES,
    gateway: SM_GATEWAY,
    validationRules: [],
    documentRequirements: {
      ...EMA_DOCUMENT_REQUIREMENTS,
      primaryLanguage: 'de',
      allowedLanguages: ['de', 'fr', 'it', 'en'],
    },
    formattingStandards: {
      dateFormat: 'DD.MM.YYYY',
      dateTimeFormat: 'DD.MM.YYYY HH:mm',
      decimalSeparator: '.',
      thousandsSeparator: ' ',  // Swiss uses thin space for thousands (apostrophe not in union type)
      preferredUnits: 'metric',
      defaultCurrency: 'CHF',
      versionFormat: 'X.X',
    },
    contact: {
      name: 'Swissmedic Authorisation Division',
      address: {
        street: 'Hallerstrasse 7',
        city: 'Bern',
        postalCode: '3012',
        country: 'Switzerland',
      },
      website: 'https://www.swissmedic.ch',
    },
  },
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/** Get configuration for a specific region */
export const getRegionalConfiguration = (region: RegulatoryRegion): RegionalConfiguration => {
  return REGIONAL_CONFIGURATIONS[region];
};

/** Get submission types for a region */
export const getSubmissionTypes = (region: RegulatoryRegion): SubmissionTypeConfig[] => {
  return REGIONAL_CONFIGURATIONS[region].submissionTypes;
};

/** Get Module 1 sections for a region */
export const getModule1Sections = (region: RegulatoryRegion): Module1SectionConfig[] => {
  return REGIONAL_CONFIGURATIONS[region].module1Sections;
};

/** Get gateway configuration for a region */
export const getGatewayConfig = (region: RegulatoryRegion): GatewayConfig => {
  return REGIONAL_CONFIGURATIONS[region].gateway;
};

/** Get document requirements for a region */
export const getDocumentRequirements = (region: RegulatoryRegion): DocumentRequirements => {
  return REGIONAL_CONFIGURATIONS[region].documentRequirements;
};

/** Check if a submission type is valid for a region */
export const isValidSubmissionType = (
  region: RegulatoryRegion,
  submissionTypeCode: string
): boolean => {
  const config = REGIONAL_CONFIGURATIONS[region];
  return config.submissionTypes.some(st => st.code === submissionTypeCode);
};

/** Get required modules for a submission type */
export const getRequiredModules = (
  region: RegulatoryRegion,
  submissionTypeCode: string
): CTDModule[] => {
  const config = REGIONAL_CONFIGURATIONS[region];
  const submissionType = config.submissionTypes.find(st => st.code === submissionTypeCode);
  return submissionType?.requiredModules || [];
};

/** Check if eCTD version is supported for region */
export const isECTDVersionSupported = (
  region: RegulatoryRegion,
  version: ECTDSpecVersion
): boolean => {
  const config = REGIONAL_CONFIGURATIONS[region];
  return config.supportedECTDVersions.includes(version);
};
