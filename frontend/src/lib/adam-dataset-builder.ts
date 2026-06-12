
/**
 * ADaM Dataset Builder - Analysis Data Model
 * CDISC ADaM Implementation Guide v1.3 compliant dataset builder
 * Supports: ADSL, BDS, ADTTE, ADAE, ADLB, ADVS and custom analysis datasets
 * @version 0.42.37
 */

// =============================================================================
// ADaM TYPES
// =============================================================================

export type ADAMDatasetClass = 'ADSL' | 'BDS' | 'OCCDS' | 'ADTTE' | 'CUSTOM';
export type ADAMVariableRole = 'Identifier' | 'Treatment' | 'Population' | 'Timing' | 'Criterion' | 'Grouping' | 'Analysis' | 'Supportive' | 'Other';
export type ADAMDataType = 'text' | 'integer' | 'float' | 'date' | 'datetime' | 'time';
export type ADAMOrigin = 'Assigned' | 'Derived' | 'Predecessor' | 'Protocol';
export type ADAMCore = 'Required' | 'Conditionally Required' | 'Permissible';

export interface ADAMVariable {
  name: string;
  label: string;
  dataType: ADAMDataType;
  length?: number;
  significantDigits?: number;
  role: ADAMVariableRole;
  core: ADAMCore;
  origin: ADAMOrigin;
  originDescription?: string;
  codeListName?: string;
  derivationMethod?: string;
  comment?: string;
  displayFormat?: string;
}

export interface ADAMDatasetDefinition {
  name: string;
  label: string;
  datasetClass: ADAMDatasetClass;
  structure: string;
  keyVariables: string[];
  variables: ADAMVariable[];
  purpose: 'Analysis';
  isReferenceData: boolean;
  comment?: string;
  sourceDatasets?: string[];
  analysisObjectives?: string[];
}

export interface ADAMBuildRequest {
  study: {
    studyOID: string;
    studyName: string;
    protocolName: string;
    sponsorName: string;
    standardVersion: string;
  };
  datasets: ADAMDatasetDefinition[];
  includeDefineXML?: boolean;
}

export interface ADAMBuildResult {
  datasets: ADAMDatasetDefinition[];
  metadata: {
    totalDatasets: number;
    totalVariables: number;
    datasetClasses: Record<ADAMDatasetClass, number>;
    standard: string;
    version: string;
    generatedAt: string;
  };
  warnings: string[];
}

// =============================================================================
// STANDARD CDISC TERMINOLOGY FOR ADaM
// =============================================================================

const ADAM_ANALYSIS_PARAMETERS: Record<string, { code: string; label: string }> = {
  'SYSBP': { code: 'SYSBP', label: 'Systolic Blood Pressure (mmHg)' },
  'DIABP': { code: 'DIABP', label: 'Diastolic Blood Pressure (mmHg)' },
  'PULSE': { code: 'PULSE', label: 'Pulse Rate (beats/min)' },
  'TEMP': { code: 'TEMP', label: 'Temperature (C)' },
  'WEIGHT': { code: 'WEIGHT', label: 'Weight (kg)' },
  'HEIGHT': { code: 'HEIGHT', label: 'Height (cm)' },
  'BMI': { code: 'BMI', label: 'Body Mass Index (kg/m2)' },
  'ALT': { code: 'ALT', label: 'Alanine Aminotransferase (U/L)' },
  'AST': { code: 'AST', label: 'Aspartate Aminotransferase (U/L)' },
  'BILI': { code: 'BILI', label: 'Bilirubin (umol/L)' },
  'CREAT': { code: 'CREAT', label: 'Creatinine (umol/L)' },
  'HGB': { code: 'HGB', label: 'Hemoglobin (g/L)' },
  'WBC': { code: 'WBC', label: 'White Blood Cells (10^9/L)' },
  'PLAT': { code: 'PLAT', label: 'Platelets (10^9/L)' },
};

const ADAM_POPULATION_FLAGS = [
  { name: 'SAFFL', label: 'Safety Population Flag', derivation: 'Y if subject received at least one dose of study drug' },
  { name: 'ITTFL', label: 'Intent-to-Treat Population Flag', derivation: 'Y if subject was randomized' },
  { name: 'PPROTFL', label: 'Per-Protocol Population Flag', derivation: 'Y if subject completed protocol without major deviations' },
  { name: 'FASFL', label: 'Full Analysis Set Population Flag', derivation: 'Y if subject was randomized and received at least one dose' },
  { name: 'PKFL', label: 'PK Population Flag', derivation: 'Y if subject has evaluable PK data' },
];

const ADAM_CRITERION_FLAGS: Record<string, { label: string; derivation: string }> = {
  'CRIT1': { label: 'Analysis Criterion 1', derivation: 'Derived from analysis specification' },
  'CRIT1FL': { label: 'Criterion 1 Evaluation Result Flag', derivation: 'Y if criterion 1 met' },
  'CRIT1FN': { label: 'Criterion 1 Evaluation Result Flag (N)', derivation: '1 if criterion 1 met, 0 otherwise' },
};

// =============================================================================
// STANDARD ADSL VARIABLES
// =============================================================================

const ADSL_STANDARD_VARIABLES: ADAMVariable[] = [
  // Identifiers
  { name: 'STUDYID', label: 'Study Identifier', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor', originDescription: 'DM.STUDYID' },
  { name: 'USUBJID', label: 'Unique Subject Identifier', dataType: 'text', length: 200, role: 'Identifier', core: 'Required', origin: 'Predecessor', originDescription: 'DM.USUBJID' },
  { name: 'SUBJID', label: 'Subject Identifier for the Study', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor', originDescription: 'DM.SUBJID' },
  { name: 'SITEID', label: 'Study Site Identifier', dataType: 'text', length: 20, role: 'Identifier', core: 'Required', origin: 'Predecessor', originDescription: 'DM.SITEID' },

  // Treatment
  { name: 'TRT01P', label: 'Planned Treatment for Period 01', dataType: 'text', length: 200, role: 'Treatment', core: 'Required', origin: 'Assigned', derivationMethod: 'Derived from randomization data. Maps ARM to TRT01P.' },
  { name: 'TRT01PN', label: 'Planned Treatment for Period 01 (N)', dataType: 'integer', role: 'Treatment', core: 'Required', origin: 'Derived', derivationMethod: 'Numeric code for TRT01P' },
  { name: 'TRT01A', label: 'Actual Treatment for Period 01', dataType: 'text', length: 200, role: 'Treatment', core: 'Required', origin: 'Derived', derivationMethod: 'Derived from exposure data. Usually equals TRT01P unless treatment switch.' },
  { name: 'TRT01AN', label: 'Actual Treatment for Period 01 (N)', dataType: 'integer', role: 'Treatment', core: 'Required', origin: 'Derived', derivationMethod: 'Numeric code for TRT01A' },

  // Population flags
  { name: 'SAFFL', label: 'Safety Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Y if subject received at least one dose of study drug', codeListName: 'NY' },
  { name: 'ITTFL', label: 'Intent-to-Treat Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Y if subject was randomized', codeListName: 'NY' },
  { name: 'PPROTFL', label: 'Per-Protocol Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Y if subject completed protocol without major deviations', codeListName: 'NY' },
  { name: 'FASFL', label: 'Full Analysis Set Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Permissible', origin: 'Derived', derivationMethod: 'Y if subject randomized and received at least one dose', codeListName: 'NY' },

  // Timing
  { name: 'TRTSDT', label: 'Date of First Exposure to Treatment', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Minimum EXSTDTC from EX domain' },
  { name: 'TRTEDT', label: 'Date of Last Exposure to Treatment', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Maximum EXENDTC from EX domain' },
  { name: 'TRTDURD', label: 'Total Treatment Duration (Days)', dataType: 'integer', role: 'Timing', core: 'Permissible', origin: 'Derived', derivationMethod: 'TRTEDT - TRTSDT + 1' },

  // Demographics (from SDTM)
  { name: 'AGE', label: 'Age', dataType: 'integer', role: 'Supportive', core: 'Required', origin: 'Predecessor', originDescription: 'DM.AGE' },
  { name: 'AGEU', label: 'Age Units', dataType: 'text', length: 10, role: 'Supportive', core: 'Required', origin: 'Predecessor', originDescription: 'DM.AGEU', codeListName: 'AGEU' },
  { name: 'AGEGR1', label: 'Pooled Age Group 1', dataType: 'text', length: 20, role: 'Grouping', core: 'Conditionally Required', origin: 'Derived', derivationMethod: '<18=Pediatric, 18-64=Adult, >=65=Elderly' },
  { name: 'AGEGR1N', label: 'Pooled Age Group 1 (N)', dataType: 'integer', role: 'Grouping', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Numeric code for AGEGR1' },
  { name: 'SEX', label: 'Sex', dataType: 'text', length: 1, role: 'Supportive', core: 'Required', origin: 'Predecessor', originDescription: 'DM.SEX', codeListName: 'SEX' },
  { name: 'RACE', label: 'Race', dataType: 'text', length: 60, role: 'Supportive', core: 'Required', origin: 'Predecessor', originDescription: 'DM.RACE', codeListName: 'RACE' },
  { name: 'ETHNIC', label: 'Ethnicity', dataType: 'text', length: 40, role: 'Supportive', core: 'Permissible', origin: 'Predecessor', originDescription: 'DM.ETHNIC', codeListName: 'ETHNIC' },
  { name: 'COUNTRY', label: 'Country', dataType: 'text', length: 3, role: 'Supportive', core: 'Permissible', origin: 'Predecessor', originDescription: 'DM.COUNTRY', codeListName: 'COUNTRY' },

  // Disposition
  { name: 'EOSSTT', label: 'End of Study Status', dataType: 'text', length: 40, role: 'Supportive', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Derived from DS domain. Values: COMPLETED, DISCONTINUED, ONGOING' },
  { name: 'DCSREAS', label: 'Reason for Discontinuation from Study', dataType: 'text', length: 200, role: 'Supportive', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'DS.DSTERM where DS.DSCAT = DISPOSITION EVENT and DS.DSDECOD != COMPLETED' },
  { name: 'RANDDT', label: 'Date of Randomization', dataType: 'date', role: 'Timing', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'DS.DSSTDTC where DS.DSTERM = RANDOMIZED' },
];

// =============================================================================
// BDS (BASIC DATA STRUCTURE) TEMPLATE VARIABLES
// =============================================================================

const BDS_STANDARD_VARIABLES: ADAMVariable[] = [
  // Identifiers
  { name: 'STUDYID', label: 'Study Identifier', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor' },
  { name: 'USUBJID', label: 'Unique Subject Identifier', dataType: 'text', length: 200, role: 'Identifier', core: 'Required', origin: 'Predecessor' },
  { name: 'SUBJID', label: 'Subject Identifier for the Study', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor' },

  // Treatment
  { name: 'TRTP', label: 'Planned Treatment', dataType: 'text', length: 200, role: 'Treatment', core: 'Required', origin: 'Derived', derivationMethod: 'From ADSL.TRT01P' },
  { name: 'TRTPN', label: 'Planned Treatment (N)', dataType: 'integer', role: 'Treatment', core: 'Required', origin: 'Derived', derivationMethod: 'Numeric code for TRTP' },
  { name: 'TRTA', label: 'Actual Treatment', dataType: 'text', length: 200, role: 'Treatment', core: 'Permissible', origin: 'Derived', derivationMethod: 'From ADSL.TRT01A' },

  // Analysis parameter
  { name: 'PARAMCD', label: 'Parameter Code', dataType: 'text', length: 8, role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: 'Mapped from SDTM test code' },
  { name: 'PARAM', label: 'Parameter', dataType: 'text', length: 200, role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: 'Descriptive parameter label including units' },
  { name: 'PARAMN', label: 'Parameter (N)', dataType: 'integer', role: 'Analysis', core: 'Permissible', origin: 'Derived', derivationMethod: 'Numeric code for PARAM' },
  { name: 'PARCAT1', label: 'Parameter Category 1', dataType: 'text', length: 60, role: 'Grouping', core: 'Permissible', origin: 'Derived' },

  // Analysis values
  { name: 'AVAL', label: 'Analysis Value', dataType: 'float', role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: 'Numeric result value, derived from SDTM --STRESN or --ORRES' },
  { name: 'AVALC', label: 'Analysis Value (C)', dataType: 'text', length: 200, role: 'Analysis', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Character result value when AVAL is not applicable' },
  { name: 'BASE', label: 'Baseline Value', dataType: 'float', role: 'Analysis', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Last non-missing value prior to or on first treatment date' },
  { name: 'BASEC', label: 'Baseline Value (C)', dataType: 'text', length: 200, role: 'Analysis', core: 'Permissible', origin: 'Derived' },
  { name: 'CHG', label: 'Change from Baseline', dataType: 'float', role: 'Analysis', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'AVAL - BASE' },
  { name: 'PCHG', label: 'Percent Change from Baseline', dataType: 'float', role: 'Analysis', core: 'Permissible', origin: 'Derived', derivationMethod: '((AVAL - BASE) / BASE) * 100' },

  // Timing
  { name: 'ADT', label: 'Analysis Date', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Derived from SDTM --DTC variable' },
  { name: 'ADY', label: 'Analysis Relative Day', dataType: 'integer', role: 'Timing', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'ADT - TRTSDT + 1 if ADT >= TRTSDT, else ADT - TRTSDT' },
  { name: 'AVISIT', label: 'Analysis Visit', dataType: 'text', length: 60, role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Analysis visit window assignment' },
  { name: 'AVISITN', label: 'Analysis Visit (N)', dataType: 'integer', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Numeric code for AVISIT' },
  { name: 'ATPT', label: 'Analysis Timepoint', dataType: 'text', length: 40, role: 'Timing', core: 'Permissible', origin: 'Derived' },
  { name: 'ATPTN', label: 'Analysis Timepoint (N)', dataType: 'integer', role: 'Timing', core: 'Permissible', origin: 'Derived' },

  // Flags
  { name: 'ABLFL', label: 'Baseline Record Flag', dataType: 'text', length: 1, role: 'Criterion', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Y for record used as baseline', codeListName: 'NY' },
  { name: 'ANL01FL', label: 'Analysis Record Flag 01', dataType: 'text', length: 1, role: 'Criterion', core: 'Permissible', origin: 'Derived', derivationMethod: 'Y for records included in primary analysis', codeListName: 'NY' },
];

// =============================================================================
// ADTTE (TIME-TO-EVENT) TEMPLATE VARIABLES
// =============================================================================

const ADTTE_STANDARD_VARIABLES: ADAMVariable[] = [
  // Identifiers
  { name: 'STUDYID', label: 'Study Identifier', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor' },
  { name: 'USUBJID', label: 'Unique Subject Identifier', dataType: 'text', length: 200, role: 'Identifier', core: 'Required', origin: 'Predecessor' },

  // Treatment
  { name: 'TRTP', label: 'Planned Treatment', dataType: 'text', length: 200, role: 'Treatment', core: 'Required', origin: 'Derived' },
  { name: 'TRTPN', label: 'Planned Treatment (N)', dataType: 'integer', role: 'Treatment', core: 'Required', origin: 'Derived' },

  // Analysis parameter (event)
  { name: 'PARAMCD', label: 'Parameter Code', dataType: 'text', length: 8, role: 'Analysis', core: 'Required', origin: 'Assigned', derivationMethod: 'Assigned per analysis plan' },
  { name: 'PARAM', label: 'Parameter', dataType: 'text', length: 200, role: 'Analysis', core: 'Required', origin: 'Assigned' },

  // Time-to-event specifics
  { name: 'AVAL', label: 'Analysis Value', dataType: 'float', role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: 'Time to event or censoring in units specified by AVALU' },
  { name: 'AVALU', label: 'Analysis Value Unit', dataType: 'text', length: 20, role: 'Analysis', core: 'Required', origin: 'Assigned', derivationMethod: 'Unit of time (e.g., DAYS, MONTHS)' },
  { name: 'CNSR', label: 'Censor', dataType: 'integer', role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: '0 = event observed, 1 = censored' },
  { name: 'EVNTDESC', label: 'Event or Censoring Description', dataType: 'text', length: 200, role: 'Analysis', core: 'Required', origin: 'Derived', derivationMethod: 'Description of event type or reason for censoring' },
  { name: 'CNSDTDSC', label: 'Censor Date Description', dataType: 'text', length: 200, role: 'Supportive', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'Description of censoring date source' },

  // Timing
  { name: 'STARTDT', label: 'Time-to-Event Origin Date for Subject', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Randomization date or first dose date' },
  { name: 'ADT', label: 'Analysis Date', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Date of event or censoring' },

  // Flags
  { name: 'SAFFL', label: 'Safety Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Conditionally Required', origin: 'Predecessor', originDescription: 'ADSL.SAFFL', codeListName: 'NY' },
  { name: 'ITTFL', label: 'Intent-to-Treat Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Conditionally Required', origin: 'Predecessor', originDescription: 'ADSL.ITTFL', codeListName: 'NY' },
];

// =============================================================================
// ADAE (ADVERSE EVENTS) TEMPLATE VARIABLES
// =============================================================================

const ADAE_STANDARD_VARIABLES: ADAMVariable[] = [
  // Identifiers
  { name: 'STUDYID', label: 'Study Identifier', dataType: 'text', length: 40, role: 'Identifier', core: 'Required', origin: 'Predecessor' },
  { name: 'USUBJID', label: 'Unique Subject Identifier', dataType: 'text', length: 200, role: 'Identifier', core: 'Required', origin: 'Predecessor' },
  { name: 'AESEQ', label: 'Sequence Number', dataType: 'integer', role: 'Identifier', core: 'Required', origin: 'Predecessor', originDescription: 'AE.AESEQ' },

  // Treatment
  { name: 'TRTP', label: 'Planned Treatment', dataType: 'text', length: 200, role: 'Treatment', core: 'Required', origin: 'Derived' },
  { name: 'TRTA', label: 'Actual Treatment', dataType: 'text', length: 200, role: 'Treatment', core: 'Permissible', origin: 'Derived' },

  // AE terms
  { name: 'AEDECOD', label: 'Dictionary-Derived Term', dataType: 'text', length: 200, role: 'Analysis', core: 'Required', origin: 'Predecessor', originDescription: 'AE.AEDECOD' },
  { name: 'AEBODSYS', label: 'Body System or Organ Class', dataType: 'text', length: 200, role: 'Analysis', core: 'Required', origin: 'Predecessor', originDescription: 'AE.AEBODSYS' },
  { name: 'AEHLT', label: 'High Level Term', dataType: 'text', length: 200, role: 'Analysis', core: 'Permissible', origin: 'Predecessor' },
  { name: 'AEHLGT', label: 'High Level Group Term', dataType: 'text', length: 200, role: 'Analysis', core: 'Permissible', origin: 'Predecessor' },

  // Severity/Seriousness
  { name: 'AESEV', label: 'Severity/Intensity', dataType: 'text', length: 20, role: 'Analysis', core: 'Required', origin: 'Predecessor', codeListName: 'AESEV' },
  { name: 'AESER', label: 'Serious Event', dataType: 'text', length: 1, role: 'Analysis', core: 'Required', origin: 'Predecessor', codeListName: 'NY' },
  { name: 'AEREL', label: 'Causality', dataType: 'text', length: 40, role: 'Analysis', core: 'Required', origin: 'Predecessor' },
  { name: 'AEACN', label: 'Action Taken with Study Treatment', dataType: 'text', length: 40, role: 'Analysis', core: 'Required', origin: 'Predecessor', codeListName: 'ACN' },
  { name: 'AEOUT', label: 'Outcome of Adverse Event', dataType: 'text', length: 60, role: 'Analysis', core: 'Required', origin: 'Predecessor', codeListName: 'OUT' },

  // Timing
  { name: 'ASTDT', label: 'Analysis Start Date', dataType: 'date', role: 'Timing', core: 'Required', origin: 'Derived', derivationMethod: 'Imputed from AE.AESTDTC' },
  { name: 'AENDT', label: 'Analysis End Date', dataType: 'date', role: 'Timing', core: 'Permissible', origin: 'Derived', derivationMethod: 'Imputed from AE.AEENDTC' },
  { name: 'ASTDY', label: 'Analysis Start Relative Day', dataType: 'integer', role: 'Timing', core: 'Conditionally Required', origin: 'Derived', derivationMethod: 'ASTDT - TRTSDT + 1' },
  { name: 'AENDY', label: 'Analysis End Relative Day', dataType: 'integer', role: 'Timing', core: 'Permissible', origin: 'Derived', derivationMethod: 'AENDT - TRTSDT + 1' },
  { name: 'ADURN', label: 'AE Duration (N)', dataType: 'integer', role: 'Timing', core: 'Permissible', origin: 'Derived', derivationMethod: 'AENDT - ASTDT + 1' },
  { name: 'ADURU', label: 'AE Duration Units', dataType: 'text', length: 10, role: 'Timing', core: 'Permissible', origin: 'Assigned' },

  // Flags
  { name: 'TRTEMFL', label: 'Treatment Emergent Flag', dataType: 'text', length: 1, role: 'Criterion', core: 'Required', origin: 'Derived', derivationMethod: 'Y if AE onset on or after first dose date and within risk window', codeListName: 'NY' },
  { name: 'AETRTEM', label: 'Treatment Emergent Analysis Flag', dataType: 'text', length: 1, role: 'Criterion', core: 'Permissible', origin: 'Derived', codeListName: 'NY' },
  { name: 'PREFL', label: 'Pre-treatment Flag', dataType: 'text', length: 1, role: 'Criterion', core: 'Permissible', origin: 'Derived', derivationMethod: 'Y if AE onset before first dose date', codeListName: 'NY' },
  { name: 'SAFFL', label: 'Safety Population Flag', dataType: 'text', length: 1, role: 'Population', core: 'Required', origin: 'Predecessor', originDescription: 'ADSL.SAFFL', codeListName: 'NY' },
];

// =============================================================================
// BUILDER FUNCTIONS
// =============================================================================

/**
 * Build ADSL (Subject-Level Analysis Dataset)
 * One record per subject. Foundation for all other ADaM datasets.
 */
export function buildADSL(
  studyId: string,
  additionalVars?: ADAMVariable[],
  customPopulations?: Array<{ name: string; label: string; derivation: string }>
): ADAMDatasetDefinition {
  const variables = [...ADSL_STANDARD_VARIABLES];

  // Add custom population flags
  if (customPopulations) {
    for (const pop of customPopulations) {
      variables.push({
        name: pop.name,
        label: pop.label,
        dataType: 'text',
        length: 1,
        role: 'Population',
        core: 'Permissible',
        origin: 'Derived',
        derivationMethod: pop.derivation,
        codeListName: 'NY',
      });
    }
  }

  // Add additional variables
  if (additionalVars) {
    variables.push(...additionalVars);
  }

  return {
    name: 'ADSL',
    label: 'Subject-Level Analysis Dataset',
    datasetClass: 'ADSL',
    structure: 'One record per subject',
    keyVariables: ['STUDYID', 'USUBJID'],
    variables,
    purpose: 'Analysis',
    isReferenceData: false,
    sourceDatasets: ['DM', 'EX', 'DS', 'SV'],
    comment: `ADSL for study ${studyId}. Subject-level data derived from SDTM DM, EX, DS domains.`,
  };
}

/**
 * Build BDS (Basic Data Structure) dataset
 * One record per subject per analysis parameter per analysis timepoint.
 */
export function buildBDS(
  datasetName: string,
  label: string,
  sourceDomain: string,
  parameters: string[],
  additionalVars?: ADAMVariable[]
): ADAMDatasetDefinition {
  const variables = [...BDS_STANDARD_VARIABLES];

  if (additionalVars) {
    variables.push(...additionalVars);
  }

  const paramLabels = parameters.map(p => {
    const known = ADAM_ANALYSIS_PARAMETERS[p];
    return known ? known.label : p;
  });

  return {
    name: datasetName.toUpperCase(),
    label,
    datasetClass: 'BDS',
    structure: 'One record per subject per parameter per analysis timepoint',
    keyVariables: ['STUDYID', 'USUBJID', 'PARAMCD', 'AVISITN', 'ATPTN'],
    variables,
    purpose: 'Analysis',
    isReferenceData: false,
    sourceDatasets: ['ADSL', sourceDomain],
    analysisObjectives: [`Analysis of ${paramLabels.join(', ')}`],
    comment: `${datasetName} derived from SDTM ${sourceDomain} domain. Parameters: ${parameters.join(', ')}.`,
  };
}

/**
 * Build ADTTE (Time-to-Event) dataset
 * One record per subject per analysis parameter.
 */
export function buildADTTE(
  events: Array<{ paramcd: string; param: string; eventDescription: string }>,
  additionalVars?: ADAMVariable[]
): ADAMDatasetDefinition {
  const variables = [...ADTTE_STANDARD_VARIABLES];

  if (additionalVars) {
    variables.push(...additionalVars);
  }

  return {
    name: 'ADTTE',
    label: 'Time-to-Event Analysis Dataset',
    datasetClass: 'ADTTE',
    structure: 'One record per subject per parameter',
    keyVariables: ['STUDYID', 'USUBJID', 'PARAMCD'],
    variables,
    purpose: 'Analysis',
    isReferenceData: false,
    sourceDatasets: ['ADSL', 'AE', 'DS', 'EX'],
    analysisObjectives: events.map(e => `Time to ${e.eventDescription}`),
    comment: `ADTTE with ${events.length} endpoints: ${events.map(e => e.paramcd).join(', ')}.`,
  };
}

/**
 * Build ADAE (Adverse Events Analysis Dataset)
 * One record per subject per adverse event.
 */
export function buildADAE(additionalVars?: ADAMVariable[]): ADAMDatasetDefinition {
  const variables = [...ADAE_STANDARD_VARIABLES];

  if (additionalVars) {
    variables.push(...additionalVars);
  }

  return {
    name: 'ADAE',
    label: 'Adverse Events Analysis Dataset',
    datasetClass: 'OCCDS',
    structure: 'One record per subject per adverse event',
    keyVariables: ['STUDYID', 'USUBJID', 'AESEQ'],
    variables,
    purpose: 'Analysis',
    isReferenceData: false,
    sourceDatasets: ['ADSL', 'AE'],
    analysisObjectives: ['Treatment-emergent adverse event analysis', 'Adverse event summary tables'],
    comment: 'ADAE derived from SDTM AE domain with treatment-emergent flag derivation.',
  };
}

/**
 * Build a complete ADaM package for a study
 */
export function buildADAMPackage(request: ADAMBuildRequest): ADAMBuildResult {
  const warnings: string[] = [];
  const datasets = [...request.datasets];

  // Validate ADSL is present (required for all ADaM packages)
  const hasADSL = datasets.some(d => d.name === 'ADSL');
  if (!hasADSL) {
    warnings.push('ADSL dataset is required for all ADaM packages. Consider adding buildADSL().');
  }

  // Validate BDS datasets reference ADSL
  for (const ds of datasets) {
    if (ds.datasetClass === 'BDS' || ds.datasetClass === 'OCCDS' || ds.datasetClass === 'ADTTE') {
      if (!ds.sourceDatasets?.includes('ADSL')) {
        warnings.push(`${ds.name}: Should reference ADSL as source dataset.`);
      }
    }

    // Validate key variables exist in variable list
    for (const key of ds.keyVariables) {
      if (!ds.variables.some(v => v.name === key)) {
        warnings.push(`${ds.name}: Key variable ${key} not found in variable list.`);
      }
    }

    // Validate required variables are present
    const requiredMissing = ds.variables
      .filter(v => v.core === 'Required')
      .filter(v => !ds.variables.some(existing => existing.name === v.name));
    if (requiredMissing.length > 0) {
      warnings.push(`${ds.name}: Missing required variables: ${requiredMissing.map(v => v.name).join(', ')}`);
    }
  }

  // Count by class
  const datasetClasses: Record<ADAMDatasetClass, number> = { ADSL: 0, BDS: 0, OCCDS: 0, ADTTE: 0, CUSTOM: 0 };
  for (const ds of datasets) {
    datasetClasses[ds.datasetClass] = (datasetClasses[ds.datasetClass] || 0) + 1;
  }

  return {
    datasets,
    metadata: {
      totalDatasets: datasets.length,
      totalVariables: datasets.reduce((sum, ds) => sum + ds.variables.length, 0),
      datasetClasses,
      standard: 'ADaM-IG',
      version: request.study.standardVersion || '1.3',
      generatedAt: new Date().toISOString(),
    },
    warnings,
  };
}

/**
 * Validate an ADaM dataset definition against CDISC rules
 */
export function validateADAMDataset(dataset: ADAMDatasetDefinition): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!dataset.name || dataset.name.length > 8) {
    errors.push('Dataset name must be 1-8 characters');
  }
  if (dataset.name && !/^[A-Z][A-Z0-9]*$/.test(dataset.name)) {
    errors.push('Dataset name must start with a letter and contain only uppercase alphanumeric characters');
  }

  // Key variables
  if (!dataset.keyVariables || dataset.keyVariables.length === 0) {
    errors.push('At least one key variable is required');
  }
  if (!dataset.keyVariables.includes('STUDYID')) {
    errors.push('STUDYID must be a key variable');
  }
  if (!dataset.keyVariables.includes('USUBJID')) {
    errors.push('USUBJID must be a key variable');
  }

  // Variable validation
  for (const v of dataset.variables) {
    if (!v.name || v.name.length > 8) {
      errors.push(`Variable ${v.name || '(unnamed)'}: name must be 1-8 characters`);
    }
    if (!v.label || v.label.length > 200) {
      warnings.push(`Variable ${v.name}: label should be ≤200 characters`);
    }
    if (v.core === 'Required' && v.origin === 'Derived' && !v.derivationMethod) {
      warnings.push(`Variable ${v.name}: Required derived variable should have derivation method`);
    }
  }

  // ADSL-specific validation
  if (dataset.datasetClass === 'ADSL') {
    if (dataset.structure !== 'One record per subject') {
      errors.push('ADSL must have structure "One record per subject"');
    }
    const hasTRT01P = dataset.variables.some(v => v.name === 'TRT01P');
    if (!hasTRT01P) {
      warnings.push('ADSL should include TRT01P (Planned Treatment for Period 01)');
    }
  }

  // BDS-specific validation
  if (dataset.datasetClass === 'BDS') {
    const hasPARAMCD = dataset.variables.some(v => v.name === 'PARAMCD');
    const hasAVAL = dataset.variables.some(v => v.name === 'AVAL');
    if (!hasPARAMCD) errors.push('BDS dataset must include PARAMCD');
    if (!hasAVAL) errors.push('BDS dataset must include AVAL');
  }

  // ADTTE-specific validation
  if (dataset.datasetClass === 'ADTTE') {
    const hasCNSR = dataset.variables.some(v => v.name === 'CNSR');
    const hasSTARTDT = dataset.variables.some(v => v.name === 'STARTDT');
    if (!hasCNSR) errors.push('ADTTE dataset must include CNSR (censor variable)');
    if (!hasSTARTDT) errors.push('ADTTE dataset must include STARTDT');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// CONVENIENCE: Build standard lab, vitals, efficacy datasets
// =============================================================================

export function buildADLB(additionalVars?: ADAMVariable[]): ADAMDatasetDefinition {
  return buildBDS('ADLB', 'Laboratory Analysis Dataset', 'LB',
    ['ALT', 'AST', 'BILI', 'CREAT', 'HGB', 'WBC', 'PLAT'],
    additionalVars
  );
}

export function buildADVS(additionalVars?: ADAMVariable[]): ADAMDatasetDefinition {
  return buildBDS('ADVS', 'Vital Signs Analysis Dataset', 'VS',
    ['SYSBP', 'DIABP', 'PULSE', 'TEMP', 'WEIGHT', 'HEIGHT', 'BMI'],
    additionalVars
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ADSL_STANDARD_VARIABLES,
  BDS_STANDARD_VARIABLES,
  ADTTE_STANDARD_VARIABLES,
  ADAE_STANDARD_VARIABLES,
  ADAM_ANALYSIS_PARAMETERS,
  ADAM_POPULATION_FLAGS,
  ADAM_CRITERION_FLAGS,
};
