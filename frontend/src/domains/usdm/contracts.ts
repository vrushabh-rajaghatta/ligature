
/**
 * USDM Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Unified Study Definitions Model (USDM) types in Ligature.
 * TransCelerate/CDISC DDF Reference v3.0 Compliant with ICH M11 CeSHarP alignment.
 * 
 * Covers: Study identity, objectives, endpoints, estimands (ICH E9 R1), 
 * study structure (arms, epochs, cells), eligibility, activities, 
 * encounters (Schedule of Activities), and data lineage tracking.
 * 
 * @module domains/usdm/contracts
 * @version 0.27.23
 */

// =============================================================================
// CORE CODE TYPE (CDISC Standard)
// =============================================================================

export interface USDMCode {
  id?: string;
  code: string;
  codeSystem: string;
  codeSystemVersion?: string;
  decode: string;
  instanceType?: 'Code';
}

export interface USDMQuantity {
  value: number;
  unit: string;
  comparator?: '<' | '<=' | '>=' | '>';
}

export interface USDMRange {
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

export interface USDMComment {
  id: string;
  text: string;
}

// =============================================================================
// STUDY IDENTITY ENUMS & TYPES
// =============================================================================

export type USDMStudyTitleType = 
  | 'Brief'           // Short name for internal use
  | 'Official'        // Full regulatory title
  | 'Scientific'      // Scientific/technical title
  | 'Public'          // Plain language for registries/public
  | 'Acronym';        // Study acronym

export type USDMStudyVersionStatus = 
  | 'Draft'
  | 'Final'
  | 'Approved'
  | 'Superseded'
  | 'Withdrawn';

export type USDMAmendmentScope = 
  | 'Global'          // Applies to all regions/sites
  | 'Regional'        // Applies to specific region(s)
  | 'Country'         // Applies to specific country/countries
  | 'Site';           // Applies to specific site(s)

export type USDMStudyIdentifierType = 
  | 'SponsorId'           // Sponsor's internal identifier
  | 'RegistryId'          // Clinical trial registry (NCT, EudraCT, etc.)
  | 'RegulatoryId'        // Regulatory submission ID (IND, CTA, etc.)
  | 'SecondaryId'         // Secondary/alternate identifier
  | 'OtherGrantId';       // Grant or funding identifier

// =============================================================================
// OBJECTIVE & ENDPOINT ENUMS
// =============================================================================

export type USDMObjectiveLevel = 
  | 'Primary'
  | 'Secondary'
  | 'Exploratory';

export type USDMEndpointPurpose = 
  | 'Primary'
  | 'Secondary'
  | 'Exploratory'
  | 'Safety'
  | 'Pharmacokinetic';

export type USDMVariableType = 
  | 'Continuous'
  | 'Binary'
  | 'Categorical'
  | 'Time-to-Event'
  | 'Count'
  | 'Ordinal';

// =============================================================================
// ESTIMAND ENUMS (ICH E9 R1)
// =============================================================================

export type USDMPopulationType =
  | 'ITT'          // Intent-to-Treat
  | 'mITT'         // Modified Intent-to-Treat
  | 'PP'           // Per-Protocol
  | 'Safety'       // Safety Population
  | 'PK'           // Pharmacokinetic Population
  | 'Custom';

export type USDMICEStrategy =
  | 'TreatmentPolicy'    // Use all observed data regardless of ICE
  | 'Composite'          // Include ICE as part of outcome
  | 'Hypothetical'       // Estimate outcome if ICE had not occurred
  | 'PrincipalStratum'   // Focus on subpopulation without ICE
  | 'WhileOnTreatment';  // Consider data only while on treatment

export type USDMSummaryMeasureType =
  | 'Difference'         // e.g., mean difference
  | 'Ratio'              // e.g., odds ratio, hazard ratio
  | 'RelativeRisk'       // Relative risk
  | 'Proportion'         // Responder rate
  | 'EventRate'          // Events per person-year
  | 'Median'             // Median time
  | 'KaplanMeier'        // Survival probability
  | 'LeastSquaresMean'   // LS mean
  | 'Other';

// =============================================================================
// STUDY STRUCTURE ENUMS
// =============================================================================

export type USDMStudyArmType = 
  | 'Experimental'
  | 'Comparator'
  | 'Placebo'
  | 'Active Comparator'
  | 'Sham'
  | 'No Intervention';

export type USDMEpochType = 
  | 'Screening'
  | 'Run-In'
  | 'Treatment'
  | 'Follow-Up'
  | 'Washout'
  | 'Extension'
  | 'Long-Term Follow-Up';

export type USDMActivityType = 
  | 'Assessment'          // Efficacy/clinical assessments
  | 'Procedure'           // Clinical procedures (blood draw, biopsy)
  | 'Administration'      // Drug/treatment administration
  | 'Safety'              // Safety monitoring (AE, vitals)
  | 'Laboratory'          // Lab tests
  | 'Imaging'             // Imaging/radiology
  | 'Questionnaire'       // PRO/QoL questionnaires
  | 'PhysicalExam'        // Physical examination
  | 'Consent'             // Informed consent
  | 'DataCollection'      // General data collection
  | 'Other';

export type USDMProcedureType = 
  | 'BloodDraw'           // Phlebotomy
  | 'Biopsy'              // Tissue biopsy
  | 'Imaging'             // CT, MRI, PET, etc.
  | 'ECG'                 // Electrocardiogram
  | 'VitalSigns'          // BP, HR, Temp, etc.
  | 'PhysicalExam'        // Physical examination
  | 'Interview'           // Clinical interview
  | 'Questionnaire'       // Patient questionnaire
  | 'DrugAdministration'  // Drug dosing
  | 'Injection'           // Injection/infusion
  | 'Other';

export type USDMEncounterType = 
  | 'Screening'           // Initial screening visit
  | 'Baseline'            // Baseline/randomization visit
  | 'Treatment'           // On-treatment visit
  | 'EndOfTreatment'      // End of treatment visit
  | 'FollowUp'            // Follow-up visit
  | 'EarlyTermination'    // Early termination visit
  | 'Unscheduled'         // Unscheduled/unplanned visit
  | 'Telephone'           // Phone call/remote
  | 'Safety'              // Safety-specific visit
  | 'Other';

export type USDMContactMode = 
  | 'InPerson'
  | 'Telephone'
  | 'Video'
  | 'Email'
  | 'App'
  | 'HomeBased'
  | 'Other';

// =============================================================================
// ELIGIBILITY ENUMS
// =============================================================================

export type USDMCriterionCategory = 
  | 'Inclusion'
  | 'Exclusion';

export type USDMCriterionType = 
  | 'Age'
  | 'Sex'
  | 'Diagnosis'
  | 'Laboratory'
  | 'MedicalHistory'
  | 'Medication'
  | 'Performance'
  | 'Consent'
  | 'Geographic'
  | 'Other';

// =============================================================================
// LINEAGE ENUMS
// =============================================================================

export type USDMLineageSourceType = 
  | 'objective' | 'endpoint' | 'population' | 'intervention' | 'activity';

export type USDMLineageModule = 
  | 'ctms' | 'authoring' | 'submissions' | 'haq' | 'safety' | 'tmf';

export type USDMLineageSyncStatus = 'current' | 'outdated' | 'conflict';

// =============================================================================
// VIEW TYPES
// =============================================================================

export type USDMView = 
  | 'dashboard'
  | 'protocol-builder'
  | 'objectives-endpoints'
  | 'study-structure'
  | 'schedule-of-activities'
  | 'eligibility'
  | 'interventions'
  | 'biomedical-concepts'
  | 'lineage-viewer'
  | 'export';

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface USDMOrganization {
  id: string;
  instanceType: 'Organization';
  organizationName: string;
  organizationIdentifier?: string;
  organizationIdentifierScheme?: string;
  organizationType: USDMCode;
  legalAddress?: USDMAddress;
}

export interface USDMAddress {
  line: string[];
  city: string;
  district?: string;
  state?: string;
  postalCode: string;
  country: USDMCode;
}

export interface USDMStudyTitle {
  id: string;
  instanceType: 'StudyTitle';
  text: string;
  type: USDMStudyTitleType;
  language?: string;
  isPrimary: boolean;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface USDMStudyVersion {
  id: string;
  instanceType: 'StudyVersion';
  studyId: string;
  versionIdentifier: string;
  status: USDMStudyVersionStatus;
  rationale?: string;
  effectiveDate?: string;
  linkedProtocolVersionId?: string;
  amendmentNumber?: string;
  amendmentScope?: USDMAmendmentScope;
  changeSummary?: string;
  previousVersionId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface USDMStudyIdentifier {
  id: string;
  instanceType: 'StudyIdentifier';
  studyIdentifier: string;
  studyIdentifierScope: USDMOrganization;
  identifierType: USDMStudyIdentifierType;
  isPrimary: boolean;
  registryLink?: string;
  effectiveDate?: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// OBJECTIVE & ENDPOINT INTERFACES
// =============================================================================

export interface USDMStudyObjective {
  id: string;
  instanceType: 'StudyObjective';
  studyId: string;
  identifier?: string;
  name: string;
  text: string;
  level: USDMObjectiveLevel;
  endpointIds: string[];
  displayOrder: number;
  notes?: USDMComment[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMSpecEndpoint {
  id: string;
  instanceType: 'Endpoint';
  studyId: string;
  identifier?: string;
  name: string;
  text: string;
  purpose: USDMEndpointPurpose;
  outcomeMeasure: USDMOutcomeMeasure;
  timeframe?: string;
  estimandIds: string[];
  displayOrder: number;
  notes?: USDMComment[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMOutcomeMeasure {
  name: string;
  description?: string;
  unit?: string;
  variableType?: USDMVariableType;
  assessmentMethod?: string;
  instrument?: string;
}

// =============================================================================
// ESTIMAND INTERFACES (ICH E9 R1) - Store-Compatible
// =============================================================================

/**
 * USDMEstimand - ICH E9 R1 compliant estimand definition (store-compatible)
 */
export interface USDMEstimand {
  id: string;
  instanceType: 'Estimand';
  
  // Population
  analysisPopulation: string;
  analysisPopulationId?: string;
  
  // Treatment
  treatment: string;
  interventionId?: string;
  
  // Variable (endpoint)
  variableOfInterest: string;
  endpointId?: string;
  
  // Summary measure
  summaryMeasure: string;
  
  // Intercurrent events
  intercurrentEvents: USDMIntercurrentEvent[];
}

/**
 * USDMIntercurrentEvent - ICE definition (store-compatible)
 */
export interface USDMIntercurrentEvent {
  id: string;
  instanceType: 'IntercurrentEvent';
  
  intercurrentEventDescription: string;
  intercurrentEventStrategy: USDMCode; // Treatment policy, Composite, Hypothetical, Principal Stratum
}

// Internal spec-compliant versions (for future migration)
export interface USDMInternalEstimand {
  id: string;
  instanceType: 'Estimand';
  studyId: string;
  endpointId: string;
  label: string;
  description?: string;
  treatment: USDMEstimandTreatment;
  population: USDMEstimandPopulation;
  variable: USDMEstimandVariable;
  intercurrentEvents: USDMInternalIntercurrentEvent[];
  summaryMeasure: USDMSummaryMeasure;
  notes?: USDMComment[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface USDMEstimandTreatment {
  description: string;
  treatmentArmId?: string;
  comparator?: string;
  comparatorArmId?: string;
}

export interface USDMEstimandPopulation {
  type: USDMPopulationType;
  description: string;
  eligibilityCriteriaRef?: string;
}

export interface USDMEstimandVariable {
  type: USDMVariableType;
  description: string;
  timepoint?: string;
  endpointRef?: string;
}

export interface USDMInternalIntercurrentEvent {
  id: string;
  instanceType: 'IntercurrentEvent';
  estimandId: string;
  name: string;
  description: string;
  strategy: USDMICEStrategy;
  strategyRationale?: string;
  displayOrder: number;
}

export interface USDMSummaryMeasure {
  type: USDMSummaryMeasureType;
  description: string;
  statisticalMethod?: string;
  confidenceLevel?: number;
}

// =============================================================================
// STUDY STRUCTURE INTERFACES
// =============================================================================

export interface USDMInternalStudyArm {
  id: string;
  instanceType: 'StudyArm';
  studyDesignId: string;
  name: string;
  label?: string;
  description?: string;
  armType: USDMStudyArmType;
  targetEnrollment?: number;
  armOrigin?: string;
  dataOriginDescription?: string;
  displayOrder: number;
  interventionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMInternalStudyEpoch {
  id: string;
  instanceType: 'StudyEpoch';
  studyDesignId: string;
  name: string;
  label?: string;
  description?: string;
  epochType: USDMEpochType;
  sequence: number;
  plannedDuration?: USDMQuantity;
  minDuration?: USDMQuantity;
  maxDuration?: USDMQuantity;
  encounterIds: string[];
  previousEpochId?: string;
  nextEpochId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface USDMStudyCell {
  id: string;
  instanceType: 'StudyCell';
  studyDesignId: string;
  armId: string;
  epochId: string;
  elements: USDMStudyElement[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMStudyElement {
  id: string;
  instanceType: 'StudyElement';
  name?: string;
  description?: string;
  transitionStartRule?: string;
  transitionEndRule?: string;
}

// =============================================================================
// ACTIVITY & ENCOUNTER INTERFACES
// =============================================================================

export interface USDMInternalActivity {
  id: string;
  instanceType: 'Activity';
  activityName: string;
  activityDescription?: string;
  activityType: USDMActivityType;
  activityIsConditional: boolean;
  activityCondition?: string;
  procedureIds: string[];
  biomedicalConceptIds: string[];
  dataCollectionDescription?: string;
  typicalDuration?: USDMQuantity;
  canBePerformedRemotely: boolean;
  instructions?: string;
  notes?: USDMComment[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * USDMProcedure - A specific procedure within an activity (store-compatible)
 */
export interface USDMProcedure {
  id: string;
  instanceType: 'Procedure';
  
  procedureName: string;
  procedureDescription?: string;
  procedureType: USDMCode;
  procedureCode?: USDMCode;
}

export interface USDMInternalEncounter {
  id: string;
  instanceType: 'Encounter';
  encounterName: string;
  encounterLabel?: string;
  encounterDescription?: string;
  encounterType: USDMEncounterType;
  epochId: string;
  encounterSequence: number;
  contactModes: USDMContactMode[];
  environmentalSetting?: USDMCode[];
  scheduledTiming?: USDMScheduledTiming;
  windowBefore?: USDMQuantity;
  windowAfter?: USDMQuantity;
  isRequired: boolean;
  previousEncounterId?: string;
  nextEncounterId?: string;
  notes?: USDMComment[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMScheduledTiming {
  referencePoint: 'StudyStart' | 'Randomization' | 'FirstDose' | 'PreviousVisit' | 'Custom';
  customReferenceDescription?: string;
  value: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
}

export interface USDMInternalScheduledActivityInstance {
  id: string;
  instanceType: 'ScheduledActivityInstance';
  activityId: string;
  encounterId: string;
  isRequired: boolean;
  isConditional: boolean;
  condition?: string;
  timingDescription?: string;
  overrideDuration?: USDMQuantity;
  applicableArmIds: string[];
  specialInstructions?: string;
  footnoteIds: string[];
  notes?: USDMComment[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ELIGIBILITY INTERFACES (Internal/Spec-Compliant)
// =============================================================================

export interface USDMInternalEligibilityCriterion {
  id: string;
  instanceType: 'EligibilityCriteria';
  studyId: string;
  identifier: string;
  name?: string;
  text: string;
  category: USDMCriterionCategory;
  type: USDMCriterionType;
  displayOrder: number;
  contextIds?: string[];
  dictionaryId?: string;
  notes?: USDMComment[];
  createdAt: string;
  updatedAt: string;
}

export interface USDMInternalStudyPopulation {
  id: string;
  instanceType: 'StudyPopulation';
  populationDescription: string;
  plannedEnrollmentNumber?: USDMRange;
  plannedCompletionNumber?: USDMRange;
  plannedMaximumAgeOfSubjects?: USDMQuantity;
  plannedMinimumAgeOfSubjects?: USDMQuantity;
  plannedSexOfParticipants?: USDMCode[];
  criteria: USDMInternalEligibilityCriterion[];
}

// =============================================================================
// LINEAGE INTERFACES
// =============================================================================

export interface USDMInternalDataLineage {
  sourceEntityId: string;
  sourceEntityType: USDMLineageSourceType;
  appearances: USDMLineageAppearance[];
  lastUpdated: string;
  versionHash: string;
}

export interface USDMInternalLineageAppearance {
  module: USDMLineageModule;
  entityType: string;
  entityId: string;
  sectionReference?: string;
  lastSyncedAt: string;
  syncStatus: USDMLineageSyncStatus;
}

export interface LineageConflict {
  module: USDMLineageModule;
  entityId: string;
  field: string;
  sourceValue: string;
  targetValue: string;
  resolution: 'pending' | 'source-wins' | 'target-wins' | 'manual';
}

// =============================================================================
// SUMMARY INTERFACES
// =============================================================================

export interface USDMStudySummary {
  id: string;
  studyTitle: string;
  studyShortTitle: string;
  studyAcronym?: string;
  sponsorIdentifier: string;
  registryIdentifier?: string;
  phase: string;
  therapeuticArea: string;
  indication: string;
  version: string;
  status: USDMStudyVersionStatus;
  objectiveCount: number;
  endpointCount: number;
  armCount: number;
  plannedEnrollment?: number;
}

export interface USDMObjectivesSummary {
  primaryCount: number;
  secondaryCount: number;
  exploratoryCount: number;
  total: number;
}

export interface USDMEndpointsSummary {
  primary: number;
  secondary: number;
  exploratory: number;
  safety: number;
  pharmacokinetic: number;
  total: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const OBJECTIVE_LEVEL_LABELS: Record<USDMObjectiveLevel, string> = {
  Primary: 'Primary Objective',
  Secondary: 'Secondary Objective',
  Exploratory: 'Exploratory Objective',
};

export const ENDPOINT_PURPOSE_LABELS: Record<USDMEndpointPurpose, string> = {
  Primary: 'Primary Endpoint',
  Secondary: 'Secondary Endpoint',
  Exploratory: 'Exploratory Endpoint',
  Safety: 'Safety Endpoint',
  Pharmacokinetic: 'Pharmacokinetic Endpoint',
};

export const ICE_STRATEGY_LABELS: Record<USDMICEStrategy, string> = {
  TreatmentPolicy: 'Treatment Policy (Use all observed data)',
  Composite: 'Composite (Include event in outcome)',
  Hypothetical: 'Hypothetical (What would have happened)',
  PrincipalStratum: 'Principal Stratum (Subpopulation focus)',
  WhileOnTreatment: 'While On Treatment (Data only during treatment)',
};

export const POPULATION_TYPE_LABELS: Record<USDMPopulationType, string> = {
  ITT: 'Intent-to-Treat',
  mITT: 'Modified Intent-to-Treat',
  PP: 'Per-Protocol',
  Safety: 'Safety Population',
  PK: 'PK Population',
  Custom: 'Custom Population',
};

export const STUDY_ARM_TYPE_LABELS: Record<USDMStudyArmType, string> = {
  Experimental: 'Experimental',
  Comparator: 'Comparator',
  Placebo: 'Placebo',
  'Active Comparator': 'Active Comparator',
  Sham: 'Sham Comparator',
  'No Intervention': 'No Intervention',
};

export const EPOCH_TYPE_LABELS: Record<USDMEpochType, string> = {
  Screening: 'Screening',
  'Run-In': 'Run-In',
  Treatment: 'Treatment',
  'Follow-Up': 'Follow-Up',
  Washout: 'Washout',
  Extension: 'Extension',
  'Long-Term Follow-Up': 'Long-Term Follow-Up',
};

export const ACTIVITY_TYPE_LABELS: Record<USDMActivityType, string> = {
  Assessment: 'Assessment',
  Procedure: 'Procedure',
  Administration: 'Administration',
  Safety: 'Safety Monitoring',
  Laboratory: 'Laboratory',
  Imaging: 'Imaging',
  Questionnaire: 'Questionnaire',
  PhysicalExam: 'Physical Exam',
  Consent: 'Informed Consent',
  DataCollection: 'Data Collection',
  Other: 'Other',
};

export const ENCOUNTER_TYPE_LABELS: Record<USDMEncounterType, string> = {
  Screening: 'Screening',
  Baseline: 'Baseline/Randomization',
  Treatment: 'Treatment',
  EndOfTreatment: 'End of Treatment',
  FollowUp: 'Follow-Up',
  EarlyTermination: 'Early Termination',
  Unscheduled: 'Unscheduled',
  Telephone: 'Telephone',
  Safety: 'Safety Visit',
  Other: 'Other',
};

export const VERSION_STATUS_LABELS: Record<USDMStudyVersionStatus, string> = {
  Draft: 'Draft',
  Final: 'Final',
  Approved: 'Approved',
  Superseded: 'Superseded',
  Withdrawn: 'Withdrawn',
};

export const VERSION_STATUS_COLORS: Record<USDMStudyVersionStatus, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  Final: 'bg-blue-100 text-blue-800',
  Approved: 'bg-green-100 text-green-800',
  Superseded: 'bg-yellow-100 text-yellow-800',
  Withdrawn: 'bg-red-100 text-red-800',
};

export const CRITERION_CATEGORY_LABELS: Record<USDMCriterionCategory, string> = {
  Inclusion: 'Inclusion Criteria',
  Exclusion: 'Exclusion Criteria',
};

export const LINEAGE_SYNC_STATUS_COLORS: Record<USDMLineageSyncStatus, string> = {
  current: 'bg-green-100 text-green-800',
  outdated: 'bg-yellow-100 text-yellow-800',
  conflict: 'bg-red-100 text-red-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isObjectiveLevel(value: string): value is USDMObjectiveLevel {
  return ['Primary', 'Secondary', 'Exploratory'].includes(value);
}

export function isEndpointPurpose(value: string): value is USDMEndpointPurpose {
  return ['Primary', 'Secondary', 'Exploratory', 'Safety', 'Pharmacokinetic'].includes(value);
}

export function isICEStrategy(value: string): value is USDMICEStrategy {
  return ['TreatmentPolicy', 'Composite', 'Hypothetical', 'PrincipalStratum', 'WhileOnTreatment'].includes(value);
}

export function isVersionStatus(value: string): value is USDMStudyVersionStatus {
  return ['Draft', 'Final', 'Approved', 'Superseded', 'Withdrawn'].includes(value);
}

export function isActivityType(value: string): value is USDMActivityType {
  return ['Assessment', 'Procedure', 'Administration', 'Safety', 'Laboratory', 
          'Imaging', 'Questionnaire', 'PhysicalExam', 'Consent', 'DataCollection', 'Other'].includes(value);
}

export function isEncounterType(value: string): value is USDMEncounterType {
  return ['Screening', 'Baseline', 'Treatment', 'EndOfTreatment', 'FollowUp', 
          'EarlyTermination', 'Unscheduled', 'Telephone', 'Safety', 'Other'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function generateUSDMId(prefix: string = 'usdm'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getObjectivesByLevel(
  objectives: USDMStudyObjective[],
  level: USDMObjectiveLevel
): USDMStudyObjective[] {
  return objectives
    .filter(o => o.level === level)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getEndpointsByPurpose(
  endpoints: USDMSpecEndpoint[],
  purpose: USDMEndpointPurpose
): USDMSpecEndpoint[] {
  return endpoints
    .filter(e => e.purpose === purpose)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function countObjectivesByLevel(
  objectives: USDMStudyObjective[]
): Record<USDMObjectiveLevel, number> {
  return {
    Primary: objectives.filter(o => o.level === 'Primary').length,
    Secondary: objectives.filter(o => o.level === 'Secondary').length,
    Exploratory: objectives.filter(o => o.level === 'Exploratory').length,
  };
}

export function countEndpointsByPurpose(
  endpoints: USDMSpecEndpoint[]
): Record<USDMEndpointPurpose, number> {
  return {
    Primary: endpoints.filter(e => e.purpose === 'Primary').length,
    Secondary: endpoints.filter(e => e.purpose === 'Secondary').length,
    Exploratory: endpoints.filter(e => e.purpose === 'Exploratory').length,
    Safety: endpoints.filter(e => e.purpose === 'Safety').length,
    Pharmacokinetic: endpoints.filter(e => e.purpose === 'Pharmacokinetic').length,
  };
}

export function generateObjectiveIdentifier(
  level: USDMObjectiveLevel,
  existingObjectives: USDMStudyObjective[]
): string {
  const prefix = level === 'Primary' ? 'PO' : level === 'Secondary' ? 'SO' : 'EO';
  const sameLevel = existingObjectives.filter(o => o.level === level);
  return `${prefix}${sameLevel.length + 1}`;
}

export function generateEndpointIdentifier(
  purpose: USDMEndpointPurpose,
  existingEndpoints: USDMSpecEndpoint[]
): string {
  const prefixMap: Record<USDMEndpointPurpose, string> = {
    Primary: 'PE',
    Secondary: 'SE',
    Exploratory: 'EE',
    Safety: 'SAE',
    Pharmacokinetic: 'PKE',
  };
  const prefix = prefixMap[purpose];
  const samePurpose = existingEndpoints.filter(e => e.purpose === purpose);
  return `${prefix}${samePurpose.length + 1}`;
}

export function isEstimandComplete(estimand: USDMInternalEstimand): boolean {
  return !!(
    estimand.treatment?.description &&
    estimand.population?.type && estimand.population?.description &&
    estimand.variable?.type && estimand.variable?.description &&
    estimand.summaryMeasure?.type && estimand.summaryMeasure?.description
  );
}

export function formatScheduledTiming(timing: USDMScheduledTiming): string {
  const sign = timing.value >= 0 ? '+' : '';
  return `${timing.referencePoint} ${sign}${timing.value} ${timing.unit}`;
}

export function formatVisitWindow(
  before?: USDMQuantity, 
  after?: USDMQuantity
): string {
  if (!before && !after) return 'No window';
  const beforeStr = before ? `-${before.value} ${before.unit}` : '';
  const afterStr = after ? `+${after.value} ${after.unit}` : '';
  return `${beforeStr} / ${afterStr}`.trim();
}

export function getSoACellSymbol(
  instance: USDMInternalScheduledActivityInstance | null
): 'X' | 'O' | 'C' | '-' {
  if (!instance) return '-';
  if (instance.isConditional) return 'C';
  if (instance.isRequired) return 'X';
  return 'O'; // Optional
}

export function categorizeEligibilityCriteria(
  criteria: USDMInternalEligibilityCriterion[]
): { inclusion: USDMInternalEligibilityCriterion[]; exclusion: USDMInternalEligibilityCriterion[] } {
  return {
    inclusion: criteria
      .filter(c => c.category === 'Inclusion')
      .sort((a, b) => a.displayOrder - b.displayOrder),
    exclusion: criteria
      .filter(c => c.category === 'Exclusion')
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

export function hasLineageConflicts(lineage: USDMDataLineage): boolean {
  return lineage.appearances.some(a => a.syncStatus === 'conflict');
}

export function getOutdatedLineageAppearances(
  lineage: USDMDataLineage
): USDMLineageAppearance[] {
  return lineage.appearances.filter(
    a => a.syncStatus === 'outdated' || a.syncStatus === 'conflict'
  );
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateObjective(objective: USDMStudyObjective): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!objective.name?.trim()) errors.push('Objective must have a name');
  if (!objective.text?.trim()) errors.push('Objective must have text description');
  if (!objective.level) errors.push('Objective must have a level');
  if (objective.endpointIds.length === 0) warnings.push('Objective has no linked endpoints');

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateEndpoint(endpoint: USDMSpecEndpoint): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!endpoint.name?.trim()) errors.push('Endpoint must have a name');
  if (!endpoint.text?.trim()) errors.push('Endpoint must have text description');
  if (!endpoint.purpose) errors.push('Endpoint must have a purpose');
  if (!endpoint.outcomeMeasure?.name) warnings.push('Endpoint should have outcome measure defined');
  if (!endpoint.timeframe) warnings.push('Endpoint timeframe is recommended');

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateEstimand(estimand: USDMInternalEstimand): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!estimand.label?.trim()) errors.push('Estimand must have a label');
  if (!estimand.treatment?.description) errors.push('Estimand must have treatment description');
  if (!estimand.population?.type) errors.push('Estimand must have population type');
  if (!estimand.population?.description) errors.push('Estimand must have population description');
  if (!estimand.variable?.type) errors.push('Estimand must have variable type');
  if (!estimand.variable?.description) errors.push('Estimand must have variable description');
  if (!estimand.summaryMeasure?.type) errors.push('Estimand must have summary measure type');
  if (!estimand.summaryMeasure?.description) errors.push('Estimand must have summary measure description');
  
  if (estimand.intercurrentEvents.length === 0) {
    warnings.push('Consider defining intercurrent events for complete estimand');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateActivity(activity: USDMInternalActivity): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!activity.activityName?.trim()) errors.push('Activity name is required');
  if (!activity.activityType) errors.push('Activity type is required');
  if (activity.activityIsConditional && !activity.activityCondition) {
    warnings.push('Conditional activity should have a condition specified');
  }
  if (!activity.activityDescription) warnings.push('Activity description is recommended');

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateEncounter(encounter: USDMInternalEncounter): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!encounter.encounterName?.trim()) errors.push('Encounter name is required');
  if (!encounter.encounterType) errors.push('Encounter type is required');
  if (!encounter.epochId) errors.push('Epoch reference is required');
  if (!encounter.encounterDescription) warnings.push('Encounter description is recommended');
  if (encounter.isRequired && !encounter.scheduledTiming) {
    warnings.push('Required encounters should have scheduled timing');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// =============================================================================
// TRANSCELERATE SPEC TYPES (for external interoperability)
// =============================================================================
// These types align with TransCelerate/CDISC USDM v3.x specification.
// Use USDMSpec* types for import/export with external systems.
// Use the non-prefixed types (above) for internal Ligature operations.
// =============================================================================

/**
 * TransCelerate USDM Study - Root entity for external spec compliance
 */
export interface USDMSpecStudy {
  id: string;
  instanceType: 'Study';
  studyTitle: string;
  studyShortTitle: string;
  studyAcronym?: string;
  studyRationale: string;
  studyProtocolVersions: USDMSpecStudyProtocolVersion[];
  studyIdentifiers: USDMStudyIdentifier[];
  studyType: USDMCode;
  studyPhase: USDMCode;
  businessTherapeuticAreas: USDMCode[];
  studyDesigns: USDMSpecStudyDesign[];
  documentVersionId?: string;
  linkedProductId?: string;
  linkedCTMSStudyId?: string;
  linkedSubmissionIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: number;
}

/**
 * TransCelerate USDM Study Protocol Version
 */
export interface USDMSpecStudyProtocolVersion {
  id: string;
  instanceType: 'StudyProtocolVersion';
  briefTitle: string;
  officialTitle: string;
  publicTitle?: string;
  scientificTitle?: string;
  protocolVersion: string;
  protocolEffectiveDate: string;
  protocolStatus: USDMCode;
  protocolAmendment?: string;
  amendmentScope?: USDMCode;
  amendmentRationale?: string;
}

/**
 * TransCelerate USDM Study Design
 */
export interface USDMSpecStudyDesign {
  id: string;
  instanceType: 'StudyDesign';
  studyDesignName?: string;
  studyDesignDescription?: string;
  therapeuticAreas: USDMCode[];
  studyIndications: unknown[];
  studyInterventions: unknown[];
  trialIntentTypes: USDMCode[];
  trialTypes: USDMCode[];
  interventionModel: USDMCode;
  objectives: USDMSpecObjective[];
  studyPopulations: unknown[];
  studyArms: USDMSpecStudyArm[];
  studyEpochs: USDMSpecStudyEpoch[];
  studyCells: unknown[];
  activities: USDMSpecActivity[];
  encounters: USDMSpecEncounter[];
  timelines: unknown[];
  biomedicalConcepts: unknown[];
  bcCategories: unknown[];
  bcSurrogates: unknown[];
  studyWorkflows: unknown[];
  maskingRoles: USDMCode[];
  studyEstimands: unknown[];
}

/**
 * TransCelerate USDM Objective
 */
export interface USDMSpecObjective {
  id: string;
  instanceType: 'Objective';
  objectiveDescription: string;
  objectiveLevel: USDMCode;
  objectiveEndpoints: USDMSpecEndpoint[];
  lineage: USDMDataLineage;
}

/**
 * TransCelerate USDM Endpoint
 */
export interface USDMSpecEndpoint {
  id: string;
  instanceType: 'Endpoint';
  endpointDescription: string;
  endpointPurposeDescription?: string;
  endpointLevel: USDMCode;
  outcomeLevel?: USDMCode;
  lineage: USDMDataLineage;
}

/**
 * TransCelerate USDM Study Arm
 */
export interface USDMSpecStudyArm {
  id: string;
  instanceType: 'StudyArm';
  studyArmName: string;
  studyArmDescription?: string;
  studyArmType: USDMCode;
  studyArmDataOriginDescription?: string;
  studyArmDataOriginType?: USDMCode;
  notes?: USDMComment[];
}

/**
 * TransCelerate USDM Study Epoch
 */
export interface USDMSpecStudyEpoch {
  id: string;
  instanceType: 'StudyEpoch';
  studyEpochName: string;
  studyEpochDescription?: string;
  studyEpochType: USDMCode;
  previousStudyEpochId?: string;
  nextStudyEpochId?: string;
  notes?: USDMComment[];
}

/**
 * TransCelerate USDM Activity
 */
export interface USDMSpecActivity {
  id: string;
  instanceType: 'Activity';
  activityName: string;
  activityDescription?: string;
  definedProcedures: USDMSpecProcedure[];
  biomedicalConceptIds: string[];
  previousActivityId?: string;
  nextActivityId?: string;
  activityTimelineId?: string;
  notes?: USDMComment[];
}

/**
 * TransCelerate USDM Procedure
 */
export interface USDMSpecProcedure {
  id: string;
  instanceType: 'Procedure';
  procedureName: string;
  procedureDescription?: string;
  procedureType: USDMCode;
  procedureCode?: USDMCode;
}

/**
 * TransCelerate USDM Transition Rule
 */
export interface USDMSpecTransitionRule {
  id: string;
  instanceType: 'TransitionRule';
  transitionRuleDescription: string;
}

/**
 * TransCelerate USDM Encounter
 */
export interface USDMSpecEncounter {
  id: string;
  instanceType: 'Encounter';
  encounterName: string;
  encounterDescription?: string;
  encounterLabel?: string;
  encounterType: USDMCode;
  encounterEnvironmentalSetting?: USDMCode;
  encounterContactModes: USDMCode[];
  transitionStartRule?: USDMSpecTransitionRule;
  transitionEndRule?: USDMSpecTransitionRule;
  scheduledAtTimingId?: string;
  previousEncounterId?: string;
  nextEncounterId?: string;
  notes?: USDMComment[];
}

// =============================================================================
// LEGACY ALIASES (for gradual migration from store types)
// =============================================================================
// These aliases map store type names to spec types for backward compatibility.
// Files importing from '@/store/usdmTypes' can migrate to '@/domains/usdm'
// by using these aliases during the transition period.
// =============================================================================

// Note: USDMStudy, USDMStudyDesign, USDMObjective are now full interfaces below
// matching the store structure for compatibility.

// The following types have DIFFERENT structures between spec and internal versions.
// These aliases point to the SPEC versions for backward compatibility with store imports.
// For new code, prefer the internal Ligature types (USDMStudyArm, etc.) or explicit Spec types.

/** @deprecated Internal USDMStudyArm has different structure - use USDMSpecStudyArm for spec compliance */
export type LegacyUSDMStudyArm = USDMSpecStudyArm;

/** @deprecated Internal USDMStudyEpoch has different structure - use USDMSpecStudyEpoch for spec compliance */
export type LegacyUSDMStudyEpoch = USDMSpecStudyEpoch;

/** @deprecated Internal USDMActivity has different structure - use USDMSpecActivity for spec compliance */
export type LegacyUSDMActivity = USDMSpecActivity;

/** @deprecated Internal USDMEncounter has different structure - use USDMSpecEncounter for spec compliance */
export type LegacyUSDMEncounter = USDMSpecEncounter;

// =============================================================================
// STORE COMPATIBILITY TYPES
// =============================================================================
// These types match the store definitions exactly for backward compatibility.
// Files importing from '@/store/usdmTypes' can migrate to '@/domains/usdm'.

/**
 * USDMStudy - Store-compatible study entity
 */
export interface USDMStudy {
  id: string;
  instanceType: 'Study';
  studyTitle: string;
  studyShortTitle: string;
  studyAcronym?: string;
  studyRationale: string;
  studyProtocolVersions: USDMStudyProtocolVersion[];
  studyIdentifiers: USDMStudyIdentifierCompat[];
  studyType: USDMCode;
  studyPhase: USDMCode;
  businessTherapeuticAreas: USDMCode[];
  studyDesigns: USDMStudyDesign[];
  documentVersionId?: string;
  linkedProductId?: string;
  linkedCTMSStudyId?: string;
  linkedSubmissionIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: number;
}

/**
 * USDMStudyIdentifierCompat - Store-compatible identifier (simpler than domain)
 */
export interface USDMStudyIdentifierCompat {
  id: string;
  instanceType: 'StudyIdentifier';
  studyIdentifier: string;
  studyIdentifierScope: USDMOrganization;
}

/**
 * USDMStudyProtocolVersion - Protocol document version
 */
export interface USDMStudyProtocolVersion {
  id: string;
  instanceType: 'StudyProtocolVersion';
  briefTitle: string;
  officialTitle: string;
  publicTitle?: string;
  scientificTitle?: string;
  protocolVersion: string;
  protocolEffectiveDate: string;
  protocolStatus: USDMCode;
  protocolAmendment?: string;
  amendmentScope?: USDMCode;
  amendmentRationale?: string;
}

/**
 * USDMStudyDesign - Store-compatible study design (full structure)
 */
export interface USDMStudyDesign {
  id: string;
  instanceType: 'StudyDesign';
  studyDesignName?: string;
  studyDesignDescription?: string;
  therapeuticAreas: USDMCode[];
  studyIndications: USDMIndication[];
  studyInterventions: USDMStudyIntervention[];
  trialIntentTypes: USDMCode[];
  trialTypes: USDMCode[];
  interventionModel: USDMCode;
  objectives: USDMObjective[];
  studyPopulations: USDMStudyPopulation[];
  studyArms: USDMStudyArm[];
  studyEpochs: USDMStudyEpoch[];
  studyCells: USDMStudyCellCompat[];
  activities: USDMActivity[];
  encounters: USDMEncounter[];
  timelines: USDMScheduleTimeline[];
  biomedicalConcepts: USDMBiomedicalConcept[];
  bcCategories: USDMBiomedicalConceptCategory[];
  bcSurrogates: USDMBiomedicalConceptSurrogate[];
  studyWorkflows: USDMWorkflow[];
  maskingRoles: USDMCode[];
  studyEstimands: USDMEstimand[];
}

/**
 * USDMIndication - Study indication
 */
export interface USDMIndication {
  id: string;
  instanceType: 'Indication';
  indicationDescription: string;
  codes: USDMCode[];
}

/**
 * USDMStudyIntervention - Study intervention/treatment
 */
export interface USDMStudyIntervention {
  id: string;
  instanceType: 'StudyIntervention';
  interventionDescription: string;
  codes: USDMCode[];
  administrations: USDMAdministration[];
}

/**
 * USDMAdministration - Intervention administration details
 */
export interface USDMAdministration {
  id: string;
  instanceType: 'Administration';
  administrationName: string;
  administrationDescription?: string;
  route: USDMCode;
  dose?: USDMQuantity;
  frequency?: USDMCode;
  duration?: USDMQuantity;
}

/**
 * USDMStudyPopulation - Defines subject populations for analysis (store-compatible)
 * Matches src/store/usdmTypes.ts exactly
 */
export interface USDMStudyPopulation {
  id: string;
  instanceType: 'StudyPopulation';
  
  populationDescription: string;
  
  // Enrollment targets
  plannedEnrollmentNumber?: USDMRange;
  plannedCompletionNumber?: USDMRange;
  plannedMaximumAgeOfSubjects?: USDMQuantity;
  plannedMinimumAgeOfSubjects?: USDMQuantity;
  plannedSexOfParticipants?: USDMCode[];
  
  // Eligibility Criteria
  criteria: USDMEligibilityCriteria[];
}

/**
 * USDMEligibilityCriteria - Inclusion/Exclusion criteria (store-compatible)
 * Matches src/store/usdmTypes.ts exactly
 */
export interface USDMEligibilityCriteria {
  id: string;
  instanceType: 'EligibilityCriteria';
  
  name?: string;
  label?: string;
  description?: string;
  text: string;
  
  // Category
  category: USDMCode; // Inclusion, Exclusion
  
  // Identifier for tracking
  identifier?: string;
  
  // Context - when/where this applies
  contextIds?: string[]; // Reference to epochs, arms, etc.
  
  // Dictionary references (for coded criteria)
  dictionaryId?: string;
  
  // Lineage
  lineage?: USDMDataLineage;
}

/**
 * USDMStudyCellCompat - Store-compatible study cell
 */
export interface USDMStudyCellCompat {
  id: string;
  instanceType: 'StudyCell';
  studyArmId: string;
  studyEpochId: string;
  studyElements: USDMStudyElementCompat[];
}

/**
 * USDMStudyElementCompat - Store-compatible study element
 */
export interface USDMStudyElementCompat {
  id: string;
  instanceType: 'StudyElement';
  studyElementName: string;
  studyElementDescription?: string;
  transitionStartRule?: USDMTransitionRule;
  transitionEndRule?: USDMTransitionRule;
}

/**
 * USDMTransitionRule - Transition rule for elements
 */
export interface USDMTransitionRule {
  id: string;
  instanceType: 'TransitionRule';
  transitionRuleDescription: string;
}

/**
 * USDMScheduleTimeline - Schedule timeline (store-compatible)
 * Matches src/store/usdmTypes.ts exactly
 */
export interface USDMScheduleTimeline {
  id: string;
  instanceType: 'ScheduleTimeline';
  
  scheduleTimelineName: string;
  scheduleTimelineDescription?: string;
  
  // Entry point
  scheduleTimelineEntryId?: string;
  
  // Exit conditions
  scheduleTimelineExits: USDMScheduleTimelineExit[];
  
  // Timing instances
  timings: USDMTiming[];
  
  // Scheduled instances (activities at specific timepoints)
  scheduledInstances: USDMScheduledActivityInstance[];
}

/**
 * USDMScheduleTimelineExit - Exit condition for timeline
 */
export interface USDMScheduleTimelineExit {
  id: string;
  instanceType: 'ScheduleTimelineExit';
  exitDescription: string;
}

/**
 * USDMTiming - A timepoint definition
 */
export interface USDMTiming {
  id: string;
  instanceType: 'Timing';
  
  timingName?: string;
  timingDescription?: string;
  timingLabel?: string;
  
  timingType: USDMCode;
  timingValue?: USDMQuantity;
  timingRelativeToFrom?: USDMTimingReference;
  timingWindow?: USDMTimingWindow;
}

/**
 * USDMTimingReference - Reference point for timing
 */
export interface USDMTimingReference {
  timingId?: string;
  type: 'AfterStudyStart' | 'AfterPreviousVisit' | 'AfterDose' | 'AfterRandomization' | 'Fixed';
}

/**
 * USDMTimingWindow - Window around a timepoint
 */
export interface USDMTimingWindow {
  windowLower?: USDMQuantity;
  windowUpper?: USDMQuantity;
}

/**
 * USDMScheduledActivityInstance - An activity scheduled at a specific timepoint
 * This is the core of the Schedule of Activities (SoA)
 */
export interface USDMScheduledActivityInstance {
  id: string;
  instanceType: 'ScheduledActivityInstance';
  
  activityId: string;
  encounterId?: string;
  timingId: string;
  epochId?: string;
  
  // Default value
  scheduledInstanceDefaultConditionId?: string;
  
  // Data contracts (what data is collected)
  dataContracts?: USDMDataContract[];
}

/**
 * USDMDataContract - Data collection specification
 */
export interface USDMDataContract {
  id: string;
  instanceType: 'DataContract';
  dataContractName: string;
  dataContractDescription?: string;
}

/**
 * USDMBiomedicalConcept - Biomedical concept (store-compatible)
 * Aligned with CDISC Biomedical Concepts (BC) and SDTM domains
 */
export interface USDMBiomedicalConcept {
  id: string;
  instanceType: 'BiomedicalConcept';
  
  bcName: string;
  bcSynonyms?: string[];
  bcDescription?: string;
  
  // Reference to CDISC BC library
  bcReference?: string;
  bcCode?: USDMCode;
  
  // Properties
  bcProperties: USDMBiomedicalConceptProperty[];
  
  // Category
  bcCategoryId?: string;
}

/**
 * USDMBiomedicalConceptProperty - Property of a biomedical concept
 */
export interface USDMBiomedicalConceptProperty {
  id: string;
  instanceType: 'BiomedicalConceptProperty';
  
  bcPropertyName: string;
  bcPropertyRequired: boolean;
  bcPropertyEnabled: boolean;
  bcPropertyDataType: string;
  bcPropertyResponseCodes?: USDMResponseCode[];
  
  // Mapping to SDTM
  sdtmVariable?: string;
  sdtmDomain?: string;
}

/**
 * USDMResponseCode - Response code for BC properties
 */
export interface USDMResponseCode {
  code: string;
  decode: string;
  codeSystem?: string;
}

/**
 * USDMBiomedicalConceptCategory - BC category (store-compatible)
 */
export interface USDMBiomedicalConceptCategory {
  id: string;
  instanceType: 'BiomedicalConceptCategory';
  
  bcCategoryName: string;
  bcCategoryDescription?: string;
  bcCategoryMemberIds: string[];
}

/**
 * USDMBiomedicalConceptSurrogate - BC surrogate (store-compatible)
 */
export interface USDMBiomedicalConceptSurrogate {
  id: string;
  instanceType: 'BiomedicalConceptSurrogate';
  
  bcSurrogateName: string;
  bcSurrogateReference?: string;
}

/**
 * USDMWorkflow - Study workflow
 */
export interface USDMWorkflow {
  id: string;
  instanceType: 'Workflow';
  workflowDescription: string;
  workflowItems: USDMWorkflowItem[];
}

/**
 * USDMWorkflowItem - Workflow item
 */
export interface USDMWorkflowItem {
  id: string;
  instanceType: 'WorkflowItem';
  workflowItemDescription: string;
  workflowItemActivityId?: string;
  workflowItemEncounterId?: string;
}

/**
 * USDMObjective - Store-compatible objective with lineage
 */
export interface USDMObjective {
  id: string;
  instanceType: 'Objective';
  objectiveDescription: string;
  objectiveLevel: USDMCode;
  objectiveEndpoints: USDMEndpoint[];
  lineage: USDMDataLineage;
  description?: string;
}

/**
 * USDMEndpoint - Store-compatible endpoint with lineage
 */
export interface USDMEndpoint {
  id: string;
  instanceType: 'Endpoint';
  endpointDescription: string;
  endpointPurposeDescription?: string;
  endpointLevel: USDMCode;
  outcomeLevel?: USDMCode;
  lineage: USDMDataLineage;
}

/**
 * USDMStudyArm - Store-compatible study arm
 */
export interface USDMStudyArm {
  id: string;
  instanceType: 'StudyArm';
  studyArmName: string;
  studyArmDescription?: string;
  studyArmType: USDMCode;
  studyArmDataOriginDescription?: string;
  studyArmDataOriginType?: USDMCode;
  notes?: USDMComment[];
}

/**
 * USDMStudyEpoch - Store-compatible study epoch
 */
export interface USDMStudyEpoch {
  id: string;
  instanceType: 'StudyEpoch';
  studyEpochName: string;
  studyEpochDescription?: string;
  studyEpochType: USDMCode;
  previousStudyEpochId?: string;
  nextStudyEpochId?: string;
  notes?: USDMComment[];
}

/**
 * USDMActivity - Store-compatible activity
 */
export interface USDMActivity {
  id: string;
  instanceType: 'Activity';
  activityName: string;
  activityDescription?: string;
  definedProcedures: USDMProcedure[];
  biomedicalConceptIds: string[];
  previousActivityId?: string;
  nextActivityId?: string;
  activityTimelineId?: string;
  notes?: USDMComment[];
}

/**
 * USDMEncounter - Store-compatible encounter
 */
export interface USDMEncounter {
  id: string;
  instanceType: 'Encounter';
  encounterName: string;
  encounterDescription?: string;
  encounterLabel?: string;
  encounterType: USDMCode;
  encounterEnvironmentalSetting?: USDMCode;
  encounterContactModes: USDMCode[];
  transitionStartRule?: USDMTransitionRule;
  transitionEndRule?: USDMTransitionRule;
  scheduledAtTimingId?: string;
  previousEncounterId?: string;
  nextEncounterId?: string;
  notes?: USDMComment[];
}

/**
 * USDMDataLineage - Lineage tracking for traceability
 */
export interface USDMDataLineage {
  sourceEntityId: string;
  sourceEntityType: 'objective' | 'endpoint' | 'population' | 'intervention' | 'activity';
  appearances: USDMLineageAppearance[];
  lastUpdated: string;
  versionHash: string;
}

/**
 * USDMLineageAppearance - Where an element appears across modules
 */
export interface USDMLineageAppearance {
  module: 'ctms' | 'authoring' | 'submissions' | 'haq' | 'safety' | 'tmf';
  entityType: string;
  entityId: string;
  sectionReference?: string;
  lastSyncedAt: string;
  syncStatus: 'current' | 'outdated' | 'conflict';
}

// =============================================================================
// LINEAGE SYNC TYPES
// =============================================================================

/**
 * LineageSyncRequest - Request to sync lineage across modules
 */
export interface LineageSyncRequest {
  sourceEntityId: string;
  sourceEntityType: USDMDataLineage['sourceEntityType'];
  targetModules: USDMLineageAppearance['module'][];
}

/**
 * LineageSyncResult - Result of a lineage sync operation
 */
export interface LineageSyncResult {
  sourceEntityId: string;
  syncedAppearances: USDMLineageAppearance[];
  conflicts: LineageConflict[];
  syncedAt: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * USDMValidationResult - Result of validating a USDM entity
 */
export interface USDMValidationResult {
  isValid: boolean;
  entityId: string;
  entityType: string;
  errors: USDMValidationError[];
  warnings: USDMValidationWarning[];
  validatedAt: string;
}

/**
 * USDMValidationError - A validation error
 */
export interface USDMValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

/**
 * USDMValidationWarning - A validation warning
 */
export interface USDMValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}
