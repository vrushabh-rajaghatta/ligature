
// ============================================================================
// SDTM Types v0.9.10 - Study Data Tabulation Model
// CDISC SDTM Implementation Guide v3.4 Compliant
// ============================================================================

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

/**
 * SDTM Domain Classes per SDTM IG 3.4
 */
export type SDTMDomainClass =
  | 'Special Purpose'      // DM, CO, SE, SV
  | 'Interventions'        // CM, EC, EX, PR, SU
  | 'Events'               // AE, CE, DS, DV, HO, MH
  | 'Findings'             // EG, IE, LB, MB, MS, PC, PE, PP, QS, SC, VS
  | 'Trial Design'         // TA, TD, TE, TI, TS, TV
  | 'Relationship'         // RELREC, SUPPQUAL, SUPP--
  | 'Study Reference'      // SR domains
  | 'Device'               // DI, DU
  | 'Associated Persons';  // AP-- domains

/**
 * Standard SDTM Domain Codes
 */
export type SDTMDomainCode =
  // Special Purpose
  | 'DM'   // Demographics
  | 'CO'   // Comments
  | 'SE'   // Subject Elements
  | 'SV'   // Subject Visits
  // Interventions
  | 'CM'   // Concomitant Medications
  | 'EC'   // Exposure as Collected
  | 'EX'   // Exposure
  | 'PR'   // Procedures
  | 'SU'   // Substance Use
  // Events
  | 'AE'   // Adverse Events
  | 'CE'   // Clinical Events
  | 'DS'   // Disposition
  | 'DV'   // Protocol Deviations
  | 'HO'   // Healthcare Encounters
  | 'MH'   // Medical History
  // Findings
  | 'EG'   // ECG Test Results
  | 'IE'   // Inclusion/Exclusion Criteria Not Met
  | 'LB'   // Laboratory Test Results
  | 'MB'   // Microbiology Specimen
  | 'MS'   // Microbiology Susceptibility
  | 'PC'   // Pharmacokinetics Concentrations
  | 'PE'   // Physical Examination
  | 'PP'   // Pharmacokinetics Parameters
  | 'QS'   // Questionnaires
  | 'SC'   // Subject Characteristics
  | 'VS'   // Vital Signs
  // Trial Design
  | 'TA'   // Trial Arms
  | 'TD'   // Trial Disease Assessments
  | 'TE'   // Trial Elements
  | 'TI'   // Trial Inclusion/Exclusion Criteria
  | 'TS'   // Trial Summary
  | 'TV';  // Trial Visits

// ============================================================================
// VARIABLE DEFINITIONS
// ============================================================================

/**
 * SDTM Variable Role
 */
export type SDTMVariableRole =
  | 'Identifier'    // Variables that identify the study, subject, domain, and sequence
  | 'Topic'         // The focus of the observation (AETERM, CMTRT, etc.)
  | 'Timing'        // Variables describing timing of observations
  | 'Qualifier'     // Variables that provide additional context
  | 'Rule'          // Variables describing rules for data;

/**
 * SDTM Data Type
 */
export type SDTMDataType =
  | 'text'          // Character data
  | 'integer'       // Whole numbers
  | 'float'         // Decimal numbers
  | 'date'          // ISO 8601 date (YYYY-MM-DD)
  | 'datetime'      // ISO 8601 datetime
  | 'time'          // ISO 8601 time
  | 'durationDatetime' // ISO 8601 duration
  | 'partialDate'   // Partial date (YYYY-MM or YYYY)
  | 'partialDatetime'; // Partial datetime

/**
 * SDTM Core Status per SDTM IG
 */
export type SDTMCoreStatus =
  | 'Req'   // Required - must be included
  | 'Exp'   // Expected - should be included if collected
  | 'Perm'; // Permissible - may be included

/**
 * Variable Origin
 */
export type SDTMVariableOrigin =
  | 'CRF'           // Collected on case report form
  | 'Derived'       // Derived from other variables
  | 'Assigned'      // Assigned by sponsor
  | 'Protocol'      // From protocol
  | 'eDT'           // Electronic data transfer
  | 'Predecessor';  // From predecessor variable

/**
 * SDTM Variable Definition
 */
export interface SDTMVariableDefinition {
  id: string;
  
  // Identification
  name: string;
  label: string;
  domainCode: SDTMDomainCode;
  
  // Classification
  role: SDTMVariableRole;
  dataType: SDTMDataType;
  core: SDTMCoreStatus;
  
  // Format
  length?: number;
  significantDigits?: number;
  
  // Controlled Terminology
  codeListOID?: string;
  codeListName?: string;
  
  // Origin
  origin: SDTMVariableOrigin;
  originDescription?: string;
  
  // Derivation
  derivationMethod?: string;
  derivationComment?: string;
  
  // Documentation
  comment?: string;
  
  // Version
  sdtmigVersion: string;
  
  // Standard/Custom
  isStandard: boolean;
  isCustom: boolean;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONTROLLED TERMINOLOGY
// ============================================================================

/**
 * SDTM Code List
 */
export interface SDTMCodeList {
  id: string;
  
  // Identification
  oid: string;
  name: string;
  nciCodeListCode?: string;
  
  // Type
  dataType: 'text' | 'integer' | 'float';
  
  // Version
  version: string;
  effectiveDate: string;
  
  // Extensibility
  isExtensible: boolean;
  
  // Items
  items: SDTMCodeListItem[];
  
  // Usage
  usedByDomains: SDTMDomainCode[];
  usedByVariables: string[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Code List Item
 */
export interface SDTMCodeListItem {
  id: string;
  codeListId: string;
  
  // Values
  codedValue: string;
  decodedValue: string;
  
  // NCI Reference
  nciTermCode?: string;
  nciPreferredTerm?: string;
  
  // Additional Info
  synonyms?: string[];
  definition?: string;
  
  // Status
  isActive: boolean;
  order: number;
  
  // Extension
  isExtension: boolean;
  extensionJustification?: string;
}

// ============================================================================
// DATASET STRUCTURE
// ============================================================================

/**
 * SDTM Dataset
 */
export interface SDTMDataset {
  id: string;
  studyId: string;
  
  // Domain Info
  domainCode: SDTMDomainCode;
  domainName: string;
  domainClass: SDTMDomainClass;
  
  // Structure
  variables: SDTMVariableDefinition[];
  
  // Data
  recordCount: number;
  
  // Version
  version: string;
  sdtmigVersion: string;
  
  // Validation
  validationStatus: 'pending' | 'running' | 'passed' | 'passed-with-warnings' | 'failed';
  lastValidated?: string;
  validationIssues: SDTMValidationIssue[];
  
  // Documentation
  description?: string;
  comments?: string;
  
  // File Info
  fileName?: string;
  fileSize?: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// MAPPING (eCRF to SDTM)
// ============================================================================

/**
 * Mapping Type
 */
export type SDTMMappingType =
  | 'Direct'       // Direct field-to-variable mapping
  | 'Lookup'       // Code list lookup
  | 'Derived'      // Derived from multiple fields
  | 'Conditional'; // Conditional mapping

/**
 * SDTM Mapping Definition
 */
export interface SDTMMapping {
  id: string;
  studyId: string;
  
  // Source (eCRF)
  sourceFormId: string;
  sourceFormName: string;
  sourceFieldId: string;
  sourceFieldName: string;
  
  // Target (SDTM)
  targetDomain: SDTMDomainCode;
  targetVariable: string;
  
  // Mapping Logic
  mappingType: SDTMMappingType;
  mappingExpression?: string;
  lookupCodeListId?: string;
  conditionExpression?: string;
  
  // Status
  status: 'draft' | 'active' | 'deprecated';
  isValidated: boolean;
  lastValidated?: string;
  
  // Documentation
  comments?: string;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation Issue Category
 */
export type SDTMValidationCategory =
  | 'Error'    // Must be fixed
  | 'Warning'  // Should be reviewed
  | 'Note';    // Informational

/**
 * Validation Issue
 */
export interface SDTMValidationIssue {
  id: string;
  datasetId: string;
  
  // Rule Info
  ruleId: string;
  ruleName: string;
  category: SDTMValidationCategory;
  
  // Location
  variableName?: string;
  recordNumber?: number;
  value?: string;
  
  // Issue Details
  message: string;
  
  // Resolution
  status: 'open' | 'resolved' | 'waived' | 'false-positive';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Audit
  createdAt: string;
}

/**
 * Validation Rule
 */
export interface SDTMValidationRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  category: SDTMValidationCategory;
  
  // Scope
  applicableDomains: SDTMDomainCode[] | 'all';
  applicableVariables?: string[];
  
  // Rule Logic
  ruleType: 'presence' | 'format' | 'codelist' | 'cross-variable' | 'cross-domain' | 'custom';
  expression?: string;
  
  // Status
  isActive: boolean;
  version: string;
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

/**
 * SDTM Store State
 */
export interface SDTMState {
  // Datasets
  datasets: Record<string, SDTMDataset>;
  datasetsByStudy: Record<string, string[]>;
  
  // Variables
  variableDefinitions: Record<string, SDTMVariableDefinition>;
  variablesByDomain: Record<string, string[]>;
  
  // Code Lists
  codeLists: Record<string, SDTMCodeList>;
  
  // Mappings
  mappings: Record<string, SDTMMapping>;
  mappingsByStudy: Record<string, string[]>;
  
  // Validation Issues
  validationIssues: Record<string, SDTMValidationIssue>;
  issuesByDataset: Record<string, string[]>;
  
  // UI State
  selectedDatasetId: string | null;
  selectedMappingId: string | null;
  activeView: SDTMView;
  filters: SDTMFilters;
  isLoading: boolean;
  lastError: string | null;
}

export type SDTMView =
  | 'datasets'
  | 'dataset-detail'
  | 'variables'
  | 'codelists'
  | 'mappings'
  | 'mapping-detail'
  | 'validation';

export interface SDTMFilters {
  studyId?: string;
  domainCode?: SDTMDomainCode[];
  domainClass?: SDTMDomainClass[];
  validationStatus?: string[];
}

/**
 * SDTM Store Actions
 */
export interface SDTMActions {
  // Dataset management
  createDataset: (dataset: Partial<SDTMDataset>) => SDTMDataset;
  updateDataset: (datasetId: string, updates: Partial<SDTMDataset>) => void;
  deleteDataset: (datasetId: string) => void;
  getDataset: (datasetId: string) => SDTMDataset | undefined;
  getDatasetsByStudy: (studyId: string) => SDTMDataset[];
  
  // Variable management
  addVariable: (domainCode: SDTMDomainCode, variable: Partial<SDTMVariableDefinition>) => SDTMVariableDefinition;
  updateVariable: (variableId: string, updates: Partial<SDTMVariableDefinition>) => void;
  removeVariable: (variableId: string) => void;
  getVariablesByDomain: (domainCode: SDTMDomainCode) => SDTMVariableDefinition[];
  
  // Code list management
  addCodeList: (codeList: Partial<SDTMCodeList>) => SDTMCodeList;
  updateCodeList: (codeListId: string, updates: Partial<SDTMCodeList>) => void;
  addCodeListItem: (codeListId: string, item: Partial<SDTMCodeListItem>) => SDTMCodeListItem;
  updateCodeListItem: (codeListId: string, itemId: string, updates: Partial<SDTMCodeListItem>) => void;
  removeCodeListItem: (codeListId: string, itemId: string) => void;
  
  // Mapping management
  createMapping: (mapping: Partial<SDTMMapping>) => SDTMMapping;
  updateMapping: (mappingId: string, updates: Partial<SDTMMapping>) => void;
  deleteMapping: (mappingId: string) => void;
  getMappingsByStudy: (studyId: string) => SDTMMapping[];
  getMappingsForVariable: (domainCode: SDTMDomainCode, variableName: string) => SDTMMapping[];
  
  // Validation
  validateDataset: (datasetId: string) => Promise<SDTMValidationIssue[]>;
  addValidationIssue: (issue: Partial<SDTMValidationIssue>) => SDTMValidationIssue;
  resolveValidationIssue: (issueId: string, resolution: string, resolvedBy: string) => void;
  waiveValidationIssue: (issueId: string, justification: string, waivedBy: string) => void;
  
  // UI actions
  setSelectedDataset: (datasetId: string | null) => void;
  setSelectedMapping: (mappingId: string | null) => void;
  setActiveView: (view: SDTMView) => void;
  setFilters: (filters: Partial<SDTMFilters>) => void;
  clearFilters: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique SDTM ID
 */
export const generateSDTMId = (prefix: string = 'sdtm'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get domain definition
 */
export const getDomainDefinition = (domainCode: SDTMDomainCode): { name: string; domainClass: SDTMDomainClass; description: string } | undefined => {
  return SDTM_DOMAIN_DEFINITIONS[domainCode];
};

/**
 * Check if variable is core (required/expected)
 */
export const isVariableCore = (variable: SDTMVariableDefinition): boolean => {
  return variable.core === 'Req' || variable.core === 'Exp';
};

/**
 * Validate variable name format
 */
export const validateVariableName = (name: string, domainCode: SDTMDomainCode): { valid: boolean; message?: string } => {
  if (!name) return { valid: false, message: 'Variable name is required' };
  if (name.length > 8) return { valid: false, message: 'Variable name must be 8 characters or less' };
  if (!/^[A-Z][A-Z0-9]*$/.test(name)) return { valid: false, message: 'Variable name must start with letter and contain only uppercase letters and numbers' };
  return { valid: true };
};

// ============================================================================
// STANDARD DOMAIN DEFINITIONS
// ============================================================================

export const SDTM_DOMAIN_DEFINITIONS: Record<SDTMDomainCode, { name: string; domainClass: SDTMDomainClass; description: string; coreVariables: string[] }> = {
  DM: {
    name: 'Demographics',
    domainClass: 'Special Purpose',
    description: 'Demographics information for each subject in a clinical study',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'SUBJID', 'RFSTDTC', 'RFENDTC', 'SITEID', 'BRTHDTC', 'AGE', 'AGEU', 'SEX', 'RACE', 'ETHNIC', 'ARMCD', 'ARM', 'COUNTRY'],
  },
  AE: {
    name: 'Adverse Events',
    domainClass: 'Events',
    description: 'Adverse events observed during the study',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'AESEQ', 'AETERM', 'AEDECOD', 'AEBODSYS', 'AESEV', 'AESER', 'AEREL', 'AEOUT', 'AESTDTC', 'AEENDTC'],
  },
  CM: {
    name: 'Concomitant Medications',
    domainClass: 'Interventions',
    description: 'Concomitant and prior medications',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'CMSEQ', 'CMTRT', 'CMDECOD', 'CMCLAS', 'CMDOSE', 'CMDOSU', 'CMDOSFRQ', 'CMROUTE', 'CMSTDTC', 'CMENDTC'],
  },
  VS: {
    name: 'Vital Signs',
    domainClass: 'Findings',
    description: 'Vital signs measurements',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'VSSEQ', 'VSTESTCD', 'VSTEST', 'VSPOS', 'VSORRES', 'VSORRESU', 'VSSTRESC', 'VSSTRESN', 'VSSTRESU', 'VSBLFL', 'VSDTC'],
  },
  LB: {
    name: 'Laboratory Test Results',
    domainClass: 'Findings',
    description: 'Laboratory test results',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'LBSEQ', 'LBTESTCD', 'LBTEST', 'LBCAT', 'LBORRES', 'LBORNRLO', 'LBORNRHI', 'LBSTRESC', 'LBSTRESN', 'LBNRIND'],
  },
  EX: {
    name: 'Exposure',
    domainClass: 'Interventions',
    description: 'Study treatment exposure',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'EXSEQ', 'EXTRT', 'EXDOSE', 'EXDOSU', 'EXDOSFRM', 'EXROUTE', 'EXSTDTC', 'EXENDTC'],
  },
  MH: {
    name: 'Medical History',
    domainClass: 'Events',
    description: 'Medical history events',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'MHSEQ', 'MHTERM', 'MHDECOD', 'MHBODSYS', 'MHSTDTC', 'MHENDTC'],
  },
  DS: {
    name: 'Disposition',
    domainClass: 'Events',
    description: 'Subject disposition events',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'DSSEQ', 'DSTERM', 'DSDECOD', 'DSCAT', 'DSSTDTC'],
  },
  IE: {
    name: 'Inclusion/Exclusion Criteria Not Met',
    domainClass: 'Findings',
    description: 'Inclusion/exclusion criteria not met',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'IESEQ', 'IETESTCD', 'IETEST', 'IECAT', 'IEORRES', 'IESTRESC'],
  },
  EG: {
    name: 'ECG Test Results',
    domainClass: 'Findings',
    description: 'ECG test results',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'EGSEQ', 'EGTESTCD', 'EGTEST', 'EGORRES', 'EGSTRESC', 'EGSTRESN', 'EGDTC'],
  },
  CO: {
    name: 'Comments',
    domainClass: 'Special Purpose',
    description: 'Free-text comments',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'COSEQ', 'COREF', 'COVAL'],
  },
  SE: {
    name: 'Subject Elements',
    domainClass: 'Special Purpose',
    description: 'Subject element assignments',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'SESEQ', 'ETCD', 'ELEMENT', 'SESTDTC', 'SEENDTC'],
  },
  SV: {
    name: 'Subject Visits',
    domainClass: 'Special Purpose',
    description: 'Subject visit information',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'VISITNUM', 'VISIT', 'VISITDY', 'SVSTDTC', 'SVENDTC'],
  },
  EC: {
    name: 'Exposure as Collected',
    domainClass: 'Interventions',
    description: 'Exposure as collected on CRF',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'ECSEQ', 'ECTRT', 'ECDOSE', 'ECDOSU', 'ECSTDTC', 'ECENDTC'],
  },
  PR: {
    name: 'Procedures',
    domainClass: 'Interventions',
    description: 'Procedures performed',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'PRSEQ', 'PRTRT', 'PRSTDTC', 'PRENDTC'],
  },
  SU: {
    name: 'Substance Use',
    domainClass: 'Interventions',
    description: 'Substance use information',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'SUSEQ', 'SUTRT', 'SUDOSE', 'SUSTDTC'],
  },
  CE: {
    name: 'Clinical Events',
    domainClass: 'Events',
    description: 'Clinical events',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'CESEQ', 'CETERM', 'CEDECOD', 'CESTDTC'],
  },
  DV: {
    name: 'Protocol Deviations',
    domainClass: 'Events',
    description: 'Protocol deviations',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'DVSEQ', 'DVTERM', 'DVDECOD', 'DVCAT', 'DVSTDTC'],
  },
  HO: {
    name: 'Healthcare Encounters',
    domainClass: 'Events',
    description: 'Healthcare encounters',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'HOSEQ', 'HOTERM', 'HODECOD', 'HOSTDTC', 'HOENDTC'],
  },
  MB: {
    name: 'Microbiology Specimen',
    domainClass: 'Findings',
    description: 'Microbiology specimen findings',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'MBSEQ', 'MBTESTCD', 'MBTEST', 'MBORRES', 'MBSTRESC'],
  },
  MS: {
    name: 'Microbiology Susceptibility',
    domainClass: 'Findings',
    description: 'Microbiology susceptibility results',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'MSSEQ', 'MSTESTCD', 'MSTEST', 'MSORRES', 'MSSTRESC'],
  },
  PC: {
    name: 'Pharmacokinetics Concentrations',
    domainClass: 'Findings',
    description: 'PK concentration results',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'PCSEQ', 'PCTESTCD', 'PCTEST', 'PCORRES', 'PCSTRESC', 'PCDTC'],
  },
  PE: {
    name: 'Physical Examination',
    domainClass: 'Findings',
    description: 'Physical examination findings',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'PESEQ', 'PETESTCD', 'PETEST', 'PEORRES', 'PESTRESC'],
  },
  PP: {
    name: 'Pharmacokinetics Parameters',
    domainClass: 'Findings',
    description: 'PK parameters',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'PPSEQ', 'PPTESTCD', 'PPTEST', 'PPORRES', 'PPSTRESC', 'PPSTRESN'],
  },
  QS: {
    name: 'Questionnaires',
    domainClass: 'Findings',
    description: 'Questionnaire data',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'QSSEQ', 'QSTESTCD', 'QSTEST', 'QSCAT', 'QSORRES', 'QSSTRESC'],
  },
  SC: {
    name: 'Subject Characteristics',
    domainClass: 'Findings',
    description: 'Subject characteristics',
    coreVariables: ['STUDYID', 'DOMAIN', 'USUBJID', 'SCSEQ', 'SCTESTCD', 'SCTEST', 'SCORRES', 'SCSTRESC'],
  },
  TA: {
    name: 'Trial Arms',
    domainClass: 'Trial Design',
    description: 'Trial arm definitions',
    coreVariables: ['STUDYID', 'DOMAIN', 'ARMCD', 'ARM', 'TAESSION', 'ETCD', 'ELEMENT', 'TABESSION', 'EPOCH'],
  },
  TD: {
    name: 'Trial Disease Assessments',
    domainClass: 'Trial Design',
    description: 'Trial disease assessment schedule',
    coreVariables: ['STUDYID', 'DOMAIN', 'TDORDER', 'TDANCVAR', 'TDSTOFF', 'TDTGTPAI'],
  },
  TE: {
    name: 'Trial Elements',
    domainClass: 'Trial Design',
    description: 'Trial element definitions',
    coreVariables: ['STUDYID', 'DOMAIN', 'ETCD', 'ELEMENT', 'TESTRL', 'TEENRL', 'TEDUR'],
  },
  TI: {
    name: 'Trial Inclusion/Exclusion Criteria',
    domainClass: 'Trial Design',
    description: 'Trial I/E criteria',
    coreVariables: ['STUDYID', 'DOMAIN', 'IETESTCD', 'IETEST', 'IECAT', 'IESCAT', 'TIRL'],
  },
  TS: {
    name: 'Trial Summary',
    domainClass: 'Trial Design',
    description: 'Trial summary parameters',
    coreVariables: ['STUDYID', 'DOMAIN', 'TSSEQ', 'TSPARMCD', 'TSPARM', 'TSVAL'],
  },
  TV: {
    name: 'Trial Visits',
    domainClass: 'Trial Design',
    description: 'Trial visit schedule',
    coreVariables: ['STUDYID', 'DOMAIN', 'VISITNUM', 'VISIT', 'VISITDY', 'ARMCD', 'ARM', 'TVSTRL', 'TVENRL'],
  },
};

// ============================================================================
// STANDARD CODE LISTS
// ============================================================================

export const SDTM_STANDARD_CODELISTS: Record<string, Partial<SDTMCodeList>> = {
  SEX: {
    nciCodeListCode: 'C66731',
    isExtensible: false,
    items: [
      { id: 'sex-m', codeListId: '', codedValue: 'M', decodedValue: 'Male', nciTermCode: 'C20197', isActive: true, order: 1, isExtension: false },
      { id: 'sex-f', codeListId: '', codedValue: 'F', decodedValue: 'Female', nciTermCode: 'C16576', isActive: true, order: 2, isExtension: false },
      { id: 'sex-u', codeListId: '', codedValue: 'U', decodedValue: 'Unknown', nciTermCode: 'C17998', isActive: true, order: 3, isExtension: false },
    ],
  },
  RACE: {
    nciCodeListCode: 'C74457',
    isExtensible: true,
    items: [
      { id: 'race-asian', codeListId: '', codedValue: 'ASIAN', decodedValue: 'Asian', nciTermCode: 'C41260', isActive: true, order: 1, isExtension: false },
      { id: 'race-black', codeListId: '', codedValue: 'BLACK OR AFRICAN AMERICAN', decodedValue: 'Black or African American', nciTermCode: 'C16352', isActive: true, order: 2, isExtension: false },
      { id: 'race-white', codeListId: '', codedValue: 'WHITE', decodedValue: 'White', nciTermCode: 'C41261', isActive: true, order: 3, isExtension: false },
      { id: 'race-ai', codeListId: '', codedValue: 'AMERICAN INDIAN OR ALASKA NATIVE', decodedValue: 'American Indian or Alaska Native', nciTermCode: 'C41259', isActive: true, order: 4, isExtension: false },
      { id: 'race-nhpi', codeListId: '', codedValue: 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER', decodedValue: 'Native Hawaiian or Other Pacific Islander', nciTermCode: 'C41219', isActive: true, order: 5, isExtension: false },
      { id: 'race-mult', codeListId: '', codedValue: 'MULTIPLE', decodedValue: 'Multiple', nciTermCode: 'C67109', isActive: true, order: 6, isExtension: false },
    ],
  },
  ETHNIC: {
    nciCodeListCode: 'C66790',
    isExtensible: false,
    items: [
      { id: 'eth-hl', codeListId: '', codedValue: 'HISPANIC OR LATINO', decodedValue: 'Hispanic or Latino', nciTermCode: 'C17459', isActive: true, order: 1, isExtension: false },
      { id: 'eth-nhl', codeListId: '', codedValue: 'NOT HISPANIC OR LATINO', decodedValue: 'Not Hispanic or Latino', nciTermCode: 'C41222', isActive: true, order: 2, isExtension: false },
      { id: 'eth-nr', codeListId: '', codedValue: 'NOT REPORTED', decodedValue: 'Not Reported', nciTermCode: 'C43234', isActive: true, order: 3, isExtension: false },
      { id: 'eth-unk', codeListId: '', codedValue: 'UNKNOWN', decodedValue: 'Unknown', nciTermCode: 'C17998', isActive: true, order: 4, isExtension: false },
    ],
  },
  AESEV: {
    nciCodeListCode: 'C66769',
    isExtensible: false,
    items: [
      { id: 'sev-mild', codeListId: '', codedValue: 'MILD', decodedValue: 'Mild', nciTermCode: 'C41338', isActive: true, order: 1, isExtension: false },
      { id: 'sev-mod', codeListId: '', codedValue: 'MODERATE', decodedValue: 'Moderate', nciTermCode: 'C41339', isActive: true, order: 2, isExtension: false },
      { id: 'sev-sev', codeListId: '', codedValue: 'SEVERE', decodedValue: 'Severe', nciTermCode: 'C41340', isActive: true, order: 3, isExtension: false },
    ],
  },
  ACN: {
    nciCodeListCode: 'C66767',
    isExtensible: true,
    items: [
      { id: 'acn-none', codeListId: '', codedValue: 'DRUG WITHDRAWN', decodedValue: 'Drug Withdrawn', nciTermCode: 'C49503', isActive: true, order: 1, isExtension: false },
      { id: 'acn-red', codeListId: '', codedValue: 'DOSE REDUCED', decodedValue: 'Dose Reduced', nciTermCode: 'C49500', isActive: true, order: 2, isExtension: false },
      { id: 'acn-int', codeListId: '', codedValue: 'DRUG INTERRUPTED', decodedValue: 'Drug Interrupted', nciTermCode: 'C49502', isActive: true, order: 3, isExtension: false },
      { id: 'acn-unc', codeListId: '', codedValue: 'DOSE NOT CHANGED', decodedValue: 'Dose Not Changed', nciTermCode: 'C49504', isActive: true, order: 4, isExtension: false },
    ],
  },
  OUT: {
    nciCodeListCode: 'C66768',
    isExtensible: false,
    items: [
      { id: 'out-rec', codeListId: '', codedValue: 'RECOVERED/RESOLVED', decodedValue: 'Recovered/Resolved', nciTermCode: 'C49494', isActive: true, order: 1, isExtension: false },
      { id: 'out-recseq', codeListId: '', codedValue: 'RECOVERED/RESOLVED WITH SEQUELAE', decodedValue: 'Recovered/Resolved with Sequelae', nciTermCode: 'C49495', isActive: true, order: 2, isExtension: false },
      { id: 'out-rec2', codeListId: '', codedValue: 'RECOVERING/RESOLVING', decodedValue: 'Recovering/Resolving', nciTermCode: 'C49496', isActive: true, order: 3, isExtension: false },
      { id: 'out-nrec', codeListId: '', codedValue: 'NOT RECOVERED/NOT RESOLVED', decodedValue: 'Not Recovered/Not Resolved', nciTermCode: 'C49493', isActive: true, order: 4, isExtension: false },
      { id: 'out-fat', codeListId: '', codedValue: 'FATAL', decodedValue: 'Fatal', nciTermCode: 'C48275', isActive: true, order: 5, isExtension: false },
      { id: 'out-unk', codeListId: '', codedValue: 'UNKNOWN', decodedValue: 'Unknown', nciTermCode: 'C17998', isActive: true, order: 6, isExtension: false },
    ],
  },
  VSTESTCD: {
    nciCodeListCode: 'C66741',
    isExtensible: true,
    items: [
      { id: 'vs-sysbp', codeListId: '', codedValue: 'SYSBP', decodedValue: 'Systolic Blood Pressure', nciTermCode: 'C25298', isActive: true, order: 1, isExtension: false },
      { id: 'vs-diabp', codeListId: '', codedValue: 'DIABP', decodedValue: 'Diastolic Blood Pressure', nciTermCode: 'C25299', isActive: true, order: 2, isExtension: false },
      { id: 'vs-pulse', codeListId: '', codedValue: 'PULSE', decodedValue: 'Pulse Rate', nciTermCode: 'C49676', isActive: true, order: 3, isExtension: false },
      { id: 'vs-temp', codeListId: '', codedValue: 'TEMP', decodedValue: 'Temperature', nciTermCode: 'C25206', isActive: true, order: 4, isExtension: false },
      { id: 'vs-resp', codeListId: '', codedValue: 'RESP', decodedValue: 'Respiratory Rate', nciTermCode: 'C49678', isActive: true, order: 5, isExtension: false },
      { id: 'vs-height', codeListId: '', codedValue: 'HEIGHT', decodedValue: 'Height', nciTermCode: 'C25347', isActive: true, order: 6, isExtension: false },
      { id: 'vs-weight', codeListId: '', codedValue: 'WEIGHT', decodedValue: 'Weight', nciTermCode: 'C25208', isActive: true, order: 7, isExtension: false },
      { id: 'vs-bmi', codeListId: '', codedValue: 'BMI', decodedValue: 'Body Mass Index', nciTermCode: 'C16358', isActive: true, order: 8, isExtension: false },
    ],
  },
  UNIT: {
    nciCodeListCode: 'C71620',
    isExtensible: true,
    items: [
      { id: 'unit-mmhg', codeListId: '', codedValue: 'mmHg', decodedValue: 'Millimeter of Mercury', nciTermCode: 'C49670', isActive: true, order: 1, isExtension: false },
      { id: 'unit-bpm', codeListId: '', codedValue: '/min', decodedValue: 'Beats per Minute', nciTermCode: 'C49673', isActive: true, order: 2, isExtension: false },
      { id: 'unit-c', codeListId: '', codedValue: 'C', decodedValue: 'Degree Celsius', nciTermCode: 'C42559', isActive: true, order: 3, isExtension: false },
      { id: 'unit-kg', codeListId: '', codedValue: 'kg', decodedValue: 'Kilogram', nciTermCode: 'C28252', isActive: true, order: 4, isExtension: false },
      { id: 'unit-cm', codeListId: '', codedValue: 'cm', decodedValue: 'Centimeter', nciTermCode: 'C49668', isActive: true, order: 5, isExtension: false },
      { id: 'unit-m2', codeListId: '', codedValue: 'kg/m2', decodedValue: 'Kilogram per Square Meter', nciTermCode: 'C49671', isActive: true, order: 6, isExtension: false },
    ],
  },
  POSITION: {
    nciCodeListCode: 'C71148',
    isExtensible: false,
    items: [
      { id: 'pos-sit', codeListId: '', codedValue: 'SITTING', decodedValue: 'Sitting', nciTermCode: 'C62122', isActive: true, order: 1, isExtension: false },
      { id: 'pos-stand', codeListId: '', codedValue: 'STANDING', decodedValue: 'Standing', nciTermCode: 'C62166', isActive: true, order: 2, isExtension: false },
      { id: 'pos-sup', codeListId: '', codedValue: 'SUPINE', decodedValue: 'Supine', nciTermCode: 'C62167', isActive: true, order: 3, isExtension: false },
    ],
  },
};

// ============================================================================
// STANDARD VALIDATION RULES
// ============================================================================

export const SDTM_VALIDATION_RULES: SDTMValidationRule[] = [
  {
    id: 'rule-sd0001',
    ruleId: 'SD0001',
    name: 'STUDYID Present',
    description: 'STUDYID must be present in all records',
    category: 'Error',
    applicableDomains: 'all',
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd0002',
    ruleId: 'SD0002',
    name: 'USUBJID Present',
    description: 'USUBJID must be present in all subject-level domains',
    category: 'Error',
    applicableDomains: 'all',
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd0003',
    ruleId: 'SD0003',
    name: 'Required Variables',
    description: 'All Required (Req) variables must be present',
    category: 'Error',
    applicableDomains: 'all',
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd0004',
    ruleId: 'SD0004',
    name: 'Date Format',
    description: 'Date variables must be in ISO 8601 format',
    category: 'Error',
    applicableDomains: 'all',
    ruleType: 'format',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd0005',
    ruleId: 'SD0005',
    name: 'Controlled Terminology',
    description: 'Coded values must match controlled terminology',
    category: 'Error',
    applicableDomains: 'all',
    ruleType: 'codelist',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd1001',
    ruleId: 'SD1001',
    name: 'DM Required Variables',
    description: 'Demographics domain must have all required variables',
    category: 'Error',
    applicableDomains: ['DM'],
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd1002',
    ruleId: 'SD1002',
    name: 'AE Start Date',
    description: 'Adverse event start date must be populated',
    category: 'Warning',
    applicableDomains: ['AE'],
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd1003',
    ruleId: 'SD1003',
    name: 'AE Severity',
    description: 'Adverse event severity must use controlled terminology',
    category: 'Error',
    applicableDomains: ['AE'],
    ruleType: 'codelist',
    isActive: true,
    version: '1.0',
  },
  {
    id: 'rule-sd1004',
    ruleId: 'SD1004',
    name: 'VS Units',
    description: 'Vital signs must have units specified',
    category: 'Warning',
    applicableDomains: ['VS'],
    ruleType: 'presence',
    isActive: true,
    version: '1.0',
  },
];
