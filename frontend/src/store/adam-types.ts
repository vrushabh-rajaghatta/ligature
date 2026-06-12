
// ============================================================================
// ADaM Types v0.42.37 - Analysis Data Model
// CDISC ADaM Implementation Guide v1.3 & ADaM IG for BDS v1.0 Compliant
// ============================================================================

// ============================================================================
// ADaM DATASET STRUCTURES
// ============================================================================

/**
 * ADaM Dataset Structure Types per ADaM IG v1.3
 */
export type ADaMDatasetStructure =
  | 'ADSL'     // Subject-Level Analysis Dataset (one record per subject)
  | 'BDS'      // Basic Data Structure (one or more records per subject per analysis parameter)
  | 'OCCDS'    // Occurrence Data Structure (one record per subject per event)
  | 'OTHER';   // Other structures (e.g., ADTTE)

/**
 * Standard ADaM Dataset Names
 */
export type ADaMDatasetCode =
  | 'ADSL'     // Subject-Level Analysis
  | 'ADAE'     // Adverse Events Analysis
  | 'ADCM'     // Concomitant Medications Analysis
  | 'ADEG'     // ECG Analysis
  | 'ADEX'     // Exposure Analysis
  | 'ADLB'     // Laboratory Analysis
  | 'ADMH'     // Medical History Analysis
  | 'ADPC'     // PK Concentrations Analysis
  | 'ADPP'     // PK Parameters Analysis
  | 'ADQS'     // Questionnaire Analysis
  | 'ADVS'     // Vital Signs Analysis
  | 'ADTTE'    // Time-to-Event Analysis
  | 'ADEFF';   // Efficacy Analysis

// ============================================================================
// ADaM VARIABLE DEFINITIONS
// ============================================================================

/**
 * ADaM variable classification per ADaM IG
 */
export type ADaMVariableRole =
  | 'Identifier'      // Subject/record identification (STUDYID, USUBJID, PARAMCD)
  | 'Timing'          // Timing variables (ADT, ADY, AVISIT, AVISITN)
  | 'Analysis Value'  // Primary analysis values (AVAL, AVALC, CHG, PCHG, BASE)
  | 'Grouping'        // Treatment/subgroup variables (TRTA, TRTP, AGEGR1)
  | 'Population'      // Population flags (SAFFL, ITTFL, EFFFL, FASFL)
  | 'Criterion'       // Criteria variables (CRIT1, CRIT1FL, CRIT1FN)
  | 'Record Level'    // Record-level flags (ANL01FL, AENTMTFL)
  | 'Supportive';     // Other derived variables

/**
 * ADaM Analysis Value Derivation Types
 */
export type ADaMDerivationType =
  | 'assigned'           // Directly from SDTM or protocol
  | 'derived'            // Calculated from other variables
  | 'imputed'            // Missing values filled by algorithm
  | 'windowed'           // Analysis window applied
  | 'last-observation'   // LOCF
  | 'baseline'           // Baseline derivation rule
  | 'change-from-base'   // CHG = AVAL - BASE
  | 'percent-change';    // PCHG = (AVAL - BASE) / BASE * 100

/**
 * ADaM Variable Core Status
 */
export type ADaMCoreStatus =
  | 'Required'           // Must be present (STUDYID, USUBJID, etc.)
  | 'Required/Conditional' // Required based on dataset structure
  | 'Conditionally Required' // Required when related variables exist
  | 'Permissible';       // Optional

export interface ADaMVariableDefinition {
  name: string;
  label: string;
  dataType: 'text' | 'integer' | 'float' | 'date' | 'datetime';
  length?: number;
  significantDigits?: number;
  role: ADaMVariableRole;
  core: ADaMCoreStatus;
  derivationType?: ADaMDerivationType;
  derivationRule?: string;
  codeListOID?: string;
  sdtmOrigin?: string;          // Source SDTM variable (e.g., 'DM.AGE')
  controlledTerminology?: string; // e.g., 'AGEGR1' code list
  comment?: string;
}

// ============================================================================
// ADaM DATASET DEFINITION
// ============================================================================

export interface ADaMDatasetDefinition {
  id: string;
  name: ADaMDatasetCode | string;
  label: string;
  structure: ADaMDatasetStructure;
  purpose: 'Analysis';
  sdtmSourceDomains: string[];   // e.g., ['DM', 'AE', 'VS']
  keyVariables: string[];
  variables: ADaMVariableDefinition[];
  populationFlags: string[];     // Which population flags apply (SAFFL, ITTFL, etc.)
  analysisParameters?: ADaMAnalysisParameter[];
  derivationNotes?: string;
  whereClause?: string;          // Overall dataset-level filter
}

export interface ADaMAnalysisParameter {
  paramcd: string;               // Parameter Code (e.g., 'SYSBP', 'DIABP', 'GLUC')
  param: string;                 // Parameter Name (e.g., 'Systolic Blood Pressure')
  paramn?: number;               // Parameter Number
  parcat1?: string;              // Parameter Category 1
  parcat2?: string;              // Parameter Category 2
  sdtmTestcd?: string;           // SDTM --TESTCD mapping
  sdtmTest?: string;             // SDTM --TEST mapping
  sdtmDomain: string;            // Source SDTM domain
  unit?: string;                 // Analysis unit
  baselineRule: ADaMBaselineRule;
  analysisWindows?: ADaMAnalysisWindow[];
}

export interface ADaMBaselineRule {
  method: 'last-before-dose' | 'screening-visit' | 'average' | 'worst-case' | 'custom';
  referenceDate: string;         // e.g., 'TRTSDT' (treatment start date)
  windowBefore?: number;         // Days before reference
  windowAfter?: number;          // Days after reference (usually 0)
  description: string;
}

export interface ADaMAnalysisWindow {
  id: string;
  avisit: string;                // Analysis Visit (e.g., 'Week 4', 'End of Treatment')
  avisitn: number;               // Numeric visit
  windowStart: number;           // Days from reference
  windowEnd: number;             // Days from reference
  targetDay: number;             // Target study day
  selectionMethod: 'closest-to-target' | 'worst-case' | 'average' | 'last';
}

// ============================================================================
// POPULATION FLAGS
// ============================================================================

export interface ADaMPopulationFlag {
  variable: string;              // e.g., 'SAFFL', 'ITTFL'
  label: string;                 // e.g., 'Safety Population Flag'
  derivationRule: string;        // Human-readable rule
  sdtmCriteria: string[];        // Conditions
}

// ============================================================================
// ADaM TRACEABILITY
// ============================================================================

export interface ADaMTraceabilityRecord {
  adamVariable: string;
  adamDataset: string;
  sdtmVariable?: string;
  sdtmDomain?: string;
  derivationMethod: string;
  analysisReason: string;
}

// ============================================================================
// ADaM GENERATION REQUEST
// ============================================================================

export interface ADaMGenerationRequest {
  studyId: string;
  studyName: string;
  protocolNumber: string;
  sponsorName: string;
  treatmentVariable: string;     // e.g., 'TRT01P' for planned, 'TRT01A' for actual
  datasets: ADaMDatasetDefinition[];
  populationFlags: ADaMPopulationFlag[];
  globalBaselineRule?: ADaMBaselineRule;
}

export interface ADaMGenerationResult {
  studyId: string;
  datasets: ADaMDatasetDefinition[];
  traceability: ADaMTraceabilityRecord[];
  metadata: {
    generatedAt: string;
    adamVersion: string;
    totalVariables: number;
    totalParameters: number;
    datasetCount: number;
  };
  warnings: string[];
}
