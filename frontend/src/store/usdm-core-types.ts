
// ============================================================================
// USDM Core Types v0.9.9a - Study Identity & Versioning
// TransCelerate/CDISC DDF Reference v3.0 Compliant
// ============================================================================

import { USDMCode, USDMOrganization } from './usdmTypes';

// ============================================================================
// STUDY TITLE (USDM 3.0 First-Class Entity)
// ============================================================================

/**
 * StudyTitle - A named, typed title for a study
 * USDM 3.0 specifies multiple title types: brief, official, scientific, public, acronym
 */
export interface USDMStudyTitle {
  id: string;
  instanceType: 'StudyTitle';
  
  /** The title text */
  text: string;
  
  /** Title type from controlled terminology */
  type: USDMStudyTitleType;
  
  /** Language code (ISO 639-1) */
  language?: string;
  
  /** Whether this is the primary title of this type */
  isPrimary: boolean;
  
  /** Effective date for this title */
  effectiveDate?: string;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Study Title Types per USDM 3.0 / ICH M11
 */
export type USDMStudyTitleType = 
  | 'Brief'           // Short name for internal use
  | 'Official'        // Full regulatory title
  | 'Scientific'      // Scientific/technical title
  | 'Public'          // Plain language for registries/public
  | 'Acronym';        // Study acronym

/**
 * StudyTitleCode - Controlled terminology for title types
 */
export const STUDY_TITLE_TYPE_CODES: Record<USDMStudyTitleType, USDMCode> = {
  Brief: {
    code: 'C99905x1',
    codeSystem: 'http://www.cdisc.org',
    codeSystemVersion: '2024-03-29',
    decode: 'Brief Title',
  },
  Official: {
    code: 'C99905x2',
    codeSystem: 'http://www.cdisc.org',
    codeSystemVersion: '2024-03-29',
    decode: 'Official Title',
  },
  Scientific: {
    code: 'C99905x3',
    codeSystem: 'http://www.cdisc.org',
    codeSystemVersion: '2024-03-29',
    decode: 'Scientific Title',
  },
  Public: {
    code: 'C99905x4',
    codeSystem: 'http://www.cdisc.org',
    codeSystemVersion: '2024-03-29',
    decode: 'Public Title',
  },
  Acronym: {
    code: 'C99905x5',
    codeSystem: 'http://www.cdisc.org',
    codeSystemVersion: '2024-03-29',
    decode: 'Acronym',
  },
};

// ============================================================================
// STUDY VERSION (Explicit Version Tracking)
// ============================================================================

/**
 * StudyVersion - Tracks versions of the overall study definition
 * Distinct from StudyProtocolVersion which tracks protocol document versions
 * This tracks changes to the structured USDM data model itself
 */
export interface USDMStudyVersion {
  id: string;
  instanceType: 'StudyVersion';
  
  /** Reference to parent study */
  studyId: string;
  
  /** Version identifier (semantic or sequential) */
  versionIdentifier: string;
  
  /** Version status */
  status: USDMStudyVersionStatus;
  
  /** Rationale for this version */
  rationale?: string;
  
  /** Version effective date */
  effectiveDate?: string;
  
  /** Links to protocol document version (if applicable) */
  linkedProtocolVersionId?: string;
  
  /** Amendment number (if this version is an amendment) */
  amendmentNumber?: string;
  
  /** Amendment scope (if applicable) */
  amendmentScope?: USDMAmendmentScope;
  
  /** Summary of changes from previous version */
  changeSummary?: string;
  
  /** Previous version reference */
  previousVersionId?: string;
  
  /** Approval information */
  approvedBy?: string;
  approvedAt?: string;
  
  /** Audit trail */
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Study Version Status
 */
export type USDMStudyVersionStatus = 
  | 'Draft'
  | 'Final'
  | 'Approved'
  | 'Superseded'
  | 'Withdrawn';

/**
 * Amendment Scope per ICH M11
 */
export type USDMAmendmentScope = 
  | 'Global'          // Applies to all regions/sites
  | 'Regional'        // Applies to specific region(s)
  | 'Country'         // Applies to specific country/countries
  | 'Site';           // Applies to specific site(s)

export const STUDY_VERSION_STATUS_CODES: Record<USDMStudyVersionStatus, USDMCode> = {
  Draft: {
    code: 'C48660',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Draft',
  },
  Final: {
    code: 'C25250',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Final',
  },
  Approved: {
    code: 'C51131',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Approved',
  },
  Superseded: {
    code: 'C71485',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Superseded',
  },
  Withdrawn: {
    code: 'C53326',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Withdrawn',
  },
};

export const AMENDMENT_SCOPE_CODES: Record<USDMAmendmentScope, USDMCode> = {
  Global: {
    code: 'C99906x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Global Amendment',
  },
  Regional: {
    code: 'C99906x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Regional Amendment',
  },
  Country: {
    code: 'C99906x3',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Country-Specific Amendment',
  },
  Site: {
    code: 'C99906x4',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Site-Specific Amendment',
  },
};

// ============================================================================
// ENHANCED STUDY IDENTIFIER (USDM 3.0 Complete)
// ============================================================================

/**
 * StudyIdentifier - Complete USDM 3.0 identifier with scope organization
 * Supports: Sponsor ID, Registry ID (NCT, EudraCT), Regulatory ID (IND, CTA)
 */
export interface USDMStudyIdentifierV2 {
  id: string;
  instanceType: 'StudyIdentifier';
  
  /** The identifier value */
  studyIdentifier: string;
  
  /** Organization that assigned/owns this identifier */
  studyIdentifierScope: USDMOrganization;
  
  /** Type of identifier */
  identifierType: USDMStudyIdentifierType;
  
  /** Whether this is the primary identifier of this type */
  isPrimary: boolean;
  
  /** Link/URL if this is a registry identifier */
  registryLink?: string;
  
  /** Effective date */
  effectiveDate?: string;
  
  /** Expiration date (if applicable) */
  expirationDate?: string;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Study Identifier Types
 */
export type USDMStudyIdentifierType = 
  | 'SponsorId'           // Sponsor's internal identifier
  | 'RegistryId'          // Clinical trial registry (NCT, EudraCT, etc.)
  | 'RegulatoryId'        // Regulatory submission ID (IND, CTA, etc.)
  | 'SecondaryId'         // Secondary/alternate identifier
  | 'OtherGrantId';       // Grant or funding identifier

export const STUDY_IDENTIFIER_TYPE_CODES: Record<USDMStudyIdentifierType, USDMCode> = {
  SponsorId: {
    code: 'C70793',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Sponsor Protocol Identifier',
  },
  RegistryId: {
    code: 'C98782',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Registry Identifier',
  },
  RegulatoryId: {
    code: 'C98783',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Regulatory Authority Identifier',
  },
  SecondaryId: {
    code: 'C98784',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Secondary Identifier',
  },
  OtherGrantId: {
    code: 'C98785',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Grant Identifier',
  },
};

// ============================================================================
// STUDY REGISTRY ORGANIZATIONS (Common)
// ============================================================================

export const REGISTRY_ORGANIZATIONS: Record<string, Partial<USDMOrganization>> = {
  ClinicalTrialsGov: {
    id: 'org-ctgov',
    instanceType: 'Organization',
    organizationName: 'ClinicalTrials.gov',
    organizationIdentifier: 'https://clinicaltrials.gov',
    organizationType: {
      code: 'C93453',
      codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      decode: 'Study Registry',
    },
  },
  EudraCT: {
    id: 'org-eudract',
    instanceType: 'Organization',
    organizationName: 'EU Clinical Trials Register',
    organizationIdentifier: 'https://www.clinicaltrialsregister.eu',
    organizationType: {
      code: 'C93453',
      codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      decode: 'Study Registry',
    },
  },
  FDA: {
    id: 'org-fda',
    instanceType: 'Organization',
    organizationName: 'US Food and Drug Administration',
    organizationIdentifier: 'https://www.fda.gov',
    organizationType: {
      code: 'C93454',
      codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      decode: 'Regulatory Authority',
    },
  },
  EMA: {
    id: 'org-ema',
    instanceType: 'Organization',
    organizationName: 'European Medicines Agency',
    organizationIdentifier: 'https://www.ema.europa.eu',
    organizationType: {
      code: 'C93454',
      codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      decode: 'Regulatory Authority',
    },
  },
  PMDA: {
    id: 'org-pmda',
    instanceType: 'Organization',
    organizationName: 'Pharmaceuticals and Medical Devices Agency',
    organizationIdentifier: 'https://www.pmda.go.jp',
    organizationType: {
      code: 'C93454',
      codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
      decode: 'Regulatory Authority',
    },
  },
};

// ============================================================================
// CORE TYPES STATE EXTENSION
// ============================================================================

/**
 * Extension to USDM State for core types
 */
export interface USDMCoreState {
  /** Study titles indexed by study ID */
  studyTitles: Record<string, USDMStudyTitle[]>;
  
  /** Study versions indexed by study ID */
  studyVersions: Record<string, USDMStudyVersion[]>;
  
  /** Enhanced identifiers indexed by study ID */
  studyIdentifiersV2: Record<string, USDMStudyIdentifierV2[]>;
  
  /** Current version per study */
  currentVersionByStudyId: Record<string, string>;
}

/**
 * Extension to USDM Actions for core types
 */
export interface USDMCoreActions {
  // Study Titles
  addStudyTitle: (studyId: string, title: Partial<USDMStudyTitle>) => USDMStudyTitle;
  updateStudyTitle: (titleId: string, updates: Partial<USDMStudyTitle>) => void;
  removeStudyTitle: (titleId: string) => void;
  getStudyTitles: (studyId: string) => USDMStudyTitle[];
  getPrimaryTitle: (studyId: string, type: USDMStudyTitleType) => USDMStudyTitle | undefined;
  
  // Study Versions
  createStudyVersion: (studyId: string, version: Partial<USDMStudyVersion>) => USDMStudyVersion;
  updateStudyVersion: (versionId: string, updates: Partial<USDMStudyVersion>) => void;
  approveStudyVersion: (versionId: string, approvedBy: string) => void;
  supersededStudyVersion: (versionId: string) => void;
  getStudyVersions: (studyId: string) => USDMStudyVersion[];
  getCurrentVersion: (studyId: string) => USDMStudyVersion | undefined;
  getVersionHistory: (studyId: string) => USDMStudyVersion[];
  
  // Enhanced Identifiers
  addStudyIdentifierV2: (studyId: string, identifier: Partial<USDMStudyIdentifierV2>) => USDMStudyIdentifierV2;
  updateStudyIdentifierV2: (identifierId: string, updates: Partial<USDMStudyIdentifierV2>) => void;
  removeStudyIdentifierV2: (identifierId: string) => void;
  getStudyIdentifiersV2: (studyId: string) => USDMStudyIdentifierV2[];
  getIdentifierByType: (studyId: string, type: USDMStudyIdentifierType) => USDMStudyIdentifierV2 | undefined;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for USDM entities
 */
export const generateUSDMId = (prefix: string = 'usdm'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Create a StudyTitle with defaults
 */
export const createStudyTitle = (
  text: string,
  type: USDMStudyTitleType,
  options: Partial<USDMStudyTitle> = {}
): USDMStudyTitle => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('title'),
    instanceType: 'StudyTitle',
    text,
    type,
    language: options.language || 'en',
    isPrimary: options.isPrimary ?? true,
    effectiveDate: options.effectiveDate || now,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a StudyVersion with defaults
 */
export const createStudyVersion = (
  studyId: string,
  versionIdentifier: string,
  options: Partial<USDMStudyVersion> = {}
): USDMStudyVersion => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('version'),
    instanceType: 'StudyVersion',
    studyId,
    versionIdentifier,
    status: options.status || 'Draft',
    rationale: options.rationale,
    effectiveDate: options.effectiveDate,
    linkedProtocolVersionId: options.linkedProtocolVersionId,
    amendmentNumber: options.amendmentNumber,
    amendmentScope: options.amendmentScope,
    changeSummary: options.changeSummary,
    previousVersionId: options.previousVersionId,
    approvedBy: options.approvedBy,
    approvedAt: options.approvedAt,
    createdAt: now,
    createdBy: options.createdBy || 'system',
    updatedAt: now,
  };
};

/**
 * Create a StudyIdentifierV2 with defaults
 */
export const createStudyIdentifierV2 = (
  studyIdentifier: string,
  identifierType: USDMStudyIdentifierType,
  scope: USDMOrganization,
  options: Partial<USDMStudyIdentifierV2> = {}
): USDMStudyIdentifierV2 => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('ident'),
    instanceType: 'StudyIdentifier',
    studyIdentifier,
    studyIdentifierScope: scope,
    identifierType,
    isPrimary: options.isPrimary ?? true,
    registryLink: options.registryLink,
    effectiveDate: options.effectiveDate || now,
    expirationDate: options.expirationDate,
    createdAt: now,
    updatedAt: now,
  };
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a StudyTitle
 */
export const validateStudyTitle = (title: USDMStudyTitle): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!title.text || title.text.trim().length === 0) {
    errors.push('Title text is required');
  }
  if (!title.type) {
    errors.push('Title type is required');
  }
  if (title.text && title.text.length > 500) {
    warnings.push('Title exceeds recommended length of 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a StudyVersion
 */
export const validateStudyVersion = (version: USDMStudyVersion): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!version.studyId) {
    errors.push('Study ID is required');
  }
  if (!version.versionIdentifier || version.versionIdentifier.trim().length === 0) {
    errors.push('Version identifier is required');
  }
  if (!version.status) {
    errors.push('Version status is required');
  }
  if (version.status === 'Approved' && !version.approvedBy) {
    warnings.push('Approved version should have approver information');
  }
  if (version.amendmentNumber && !version.changeSummary) {
    warnings.push('Amendment should include change summary');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a StudyIdentifierV2
 */
export const validateStudyIdentifierV2 = (identifier: USDMStudyIdentifierV2): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!identifier.studyIdentifier || identifier.studyIdentifier.trim().length === 0) {
    errors.push('Identifier value is required');
  }
  if (!identifier.studyIdentifierScope) {
    errors.push('Identifier scope organization is required');
  }
  if (!identifier.identifierType) {
    errors.push('Identifier type is required');
  }
  
  // Type-specific validations
  if (identifier.identifierType === 'RegistryId') {
    if (!identifier.registryLink) {
      warnings.push('Registry identifier should include a registry link');
    }
    // NCT number format check
    if (identifier.studyIdentifierScope?.organizationName === 'ClinicalTrials.gov') {
      if (!/^NCT\d{8}$/.test(identifier.studyIdentifier)) {
        warnings.push('NCT number should be in format NCT########');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
