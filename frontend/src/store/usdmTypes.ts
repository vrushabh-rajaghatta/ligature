
// ============================================================================
// USDM Types - Unified Study Definitions Model (v202)
// TransCelerate/CDISC DDF Reference Architecture v3.x Compliant
// Digital Protocol Standard for Protocol-to-Submission Data Lineage
// ============================================================================

// ============================================================================
// CORE STUDY DEFINITION (Root Entity)
// ============================================================================

/**
 * Study - The root entity representing a complete clinical study definition
 * Aligned with ICH M11 CeSHarP (Clinical electronic Structured Harmonised Protocol)
 */
export interface USDMStudy {
  id: string;
  instanceType: 'Study';
  
  // Study Identity
  studyTitle: string;
  studyShortTitle: string;
  studyAcronym?: string;
  studyRationale: string;
  
  // Protocol Information
  studyProtocolVersions: USDMStudyProtocolVersion[];
  
  // Identifiers
  studyIdentifiers: USDMStudyIdentifier[];
  
  // Study Type & Phase
  studyType: USDMCode;
  studyPhase: USDMCode;
  
  // Business Therapeutic Area
  businessTherapeuticAreas: USDMCode[];
  
  // Study Designs (a study can have multiple designs/amendments)
  studyDesigns: USDMStudyDesign[];
  
  // Document version management
  documentVersionId?: string;
  
  // Cross-references to Ligature entities
  linkedProductId?: string;
  linkedCTMSStudyId?: string;
  linkedSubmissionIds: string[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: number;
}

/**
 * Study Protocol Version - Versioned protocol document information
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
  
  // Amendment tracking
  protocolAmendment?: string;
  amendmentScope?: USDMCode;
  amendmentRationale?: string;
}

/**
 * Study Identifier - Regulatory and sponsor identifiers
 */
export interface USDMStudyIdentifier {
  id: string;
  instanceType: 'StudyIdentifier';
  
  studyIdentifier: string;
  studyIdentifierScope: USDMOrganization;
}

// ============================================================================
// STUDY DESIGN
// ============================================================================

/**
 * Study Design - The complete design specification for a study
 * Contains objectives, endpoints, populations, arms, epochs, and schedule of activities
 */
export interface USDMStudyDesign {
  id: string;
  instanceType: 'StudyDesign';
  
  // Design Identity
  studyDesignName?: string;
  studyDesignDescription?: string;
  
  // Therapeutic Area & Indication
  therapeuticAreas: USDMCode[];
  studyIndications: USDMIndication[];
  studyInterventions: USDMStudyIntervention[];
  
  // Design Characteristics
  trialIntentTypes: USDMCode[]; // e.g., Treatment, Prevention, Diagnostic
  trialTypes: USDMCode[]; // e.g., Safety, Efficacy, PK
  interventionModel: USDMCode;
  
  // Objectives & Endpoints (the heart of lineage tracking)
  objectives: USDMObjective[];
  
  // Populations & Eligibility
  studyPopulations: USDMStudyPopulation[];
  
  // Study Structure (Arms & Epochs)
  studyArms: USDMStudyArm[];
  studyEpochs: USDMStudyEpoch[];
  studyCells: USDMStudyCell[];
  
  // Activities & Schedule
  activities: USDMActivity[];
  encounters: USDMEncounter[];
  
  // Timing (Schedule of Activities)
  timelines: USDMScheduleTimeline[];
  
  // Biomedical Concepts (data collection specifications)
  biomedicalConcepts: USDMBiomedicalConcept[];
  bcCategories: USDMBiomedicalConceptCategory[];
  bcSurrogates: USDMBiomedicalConceptSurrogate[];
  
  // Workflow
  studyWorkflows: USDMWorkflow[];
  
  // Masking/Blinding
  maskingRoles: USDMCode[];
  
  // Estimands (ICH E9 R1)
  studyEstimands: USDMEstimand[];
}

// ============================================================================
// OBJECTIVES & ENDPOINTS
// ============================================================================

/**
 * Objective - A study objective with associated endpoints
 * This is the KEY entity for lineage tracking - objectives flow through to
 * CTMS, Authoring (CSR), Submissions (Module 5), and HAQ responses
 */
export interface USDMObjective {
  id: string;
  instanceType: 'Objective';
  
  // Objective Definition
  objectiveDescription: string;
  objectiveLevel: USDMCode; // Primary, Secondary, Exploratory
  
  // Associated Endpoints
  objectiveEndpoints: USDMEndpoint[];
  
  // Lineage Tracking (Ligature-specific extension)
  lineage: USDMDataLineage;
  
  description?: string;
}

/**
 * Endpoint - Measurable outcome for an objective
 * Contains the precise definition that must appear consistently across documents
 */
export interface USDMEndpoint {
  id: string;
  instanceType: 'Endpoint';
  
  // Endpoint Definition
  endpointDescription: string;
  endpointPurposeDescription?: string;
  endpointLevel: USDMCode; // Primary, Secondary, Exploratory
  
  // Assessment Method
  outcomeLevel?: USDMCode;
  
  // Lineage Tracking (Ligature-specific extension)
  lineage: USDMDataLineage;
}

/**
 * Data Lineage - Tracks where this data element appears across Ligature
 * This is the differentiating feature for protocol-to-submission traceability
 */
export interface USDMDataLineage {
  // Source of truth
  sourceEntityId: string;
  sourceEntityType: 'objective' | 'endpoint' | 'population' | 'intervention' | 'activity';
  
  // Where this element appears (auto-populated by Ligature)
  appearances: USDMLineageAppearance[];
  
  // Version tracking
  lastUpdated: string;
  versionHash: string; // Hash of content for change detection
}

export interface USDMLineageAppearance {
  module: 'ctms' | 'authoring' | 'submissions' | 'haq' | 'safety' | 'tmf';
  entityType: string; // e.g., 'csr-section', 'submission-module', 'haq-response'
  entityId: string;
  sectionReference?: string; // e.g., '11.1' for CSR
  lastSyncedAt: string;
  syncStatus: 'current' | 'outdated' | 'conflict';
}

// ============================================================================
// STUDY POPULATION & ELIGIBILITY
// ============================================================================

/**
 * Study Population - Defines subject populations for analysis
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
 * Eligibility Criteria - Inclusion/Exclusion criteria
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

// ============================================================================
// STUDY STRUCTURE (Arms, Epochs, Cells)
// ============================================================================

/**
 * Study Arm - A treatment arm in the study
 */
export interface USDMStudyArm {
  id: string;
  instanceType: 'StudyArm';
  
  studyArmName: string;
  studyArmDescription?: string;
  studyArmType: USDMCode; // Experimental, Active Comparator, Placebo, etc.
  studyArmDataOriginDescription?: string;
  studyArmDataOriginType?: USDMCode;
  
  // Notes
  notes?: USDMComment[];
}

/**
 * Study Epoch - A time period in the study (e.g., Screening, Treatment, Follow-up)
 */
export interface USDMStudyEpoch {
  id: string;
  instanceType: 'StudyEpoch';
  
  studyEpochName: string;
  studyEpochDescription?: string;
  studyEpochType: USDMCode; // Screening, Run-in, Treatment, Washout, Follow-up
  
  // Sequence
  previousStudyEpochId?: string;
  nextStudyEpochId?: string;
  
  // Notes
  notes?: USDMComment[];
}

/**
 * Study Cell - The intersection of an Arm and Epoch
 * Contains the study design elements that occur in that cell
 */
export interface USDMStudyCell {
  id: string;
  instanceType: 'StudyCell';
  
  studyArmId: string;
  studyEpochId: string;
  
  // Elements in this cell
  studyElements: USDMStudyElement[];
}

/**
 * Study Element - A design element within a cell (e.g., treatment period)
 */
export interface USDMStudyElement {
  id: string;
  instanceType: 'StudyElement';
  
  studyElementName: string;
  studyElementDescription?: string;
  
  // Transition rules
  transitionStartRule?: USDMTransitionRule;
  transitionEndRule?: USDMTransitionRule;
}

export interface USDMTransitionRule {
  id: string;
  instanceType: 'TransitionRule';
  
  transitionRuleDescription: string;
}

// ============================================================================
// SCHEDULE OF ACTIVITIES (Activities, Encounters, Timing)
// ============================================================================

/**
 * Activity - A procedure, assessment, or action performed in the study
 */
export interface USDMActivity {
  id: string;
  instanceType: 'Activity';
  
  activityName: string;
  activityDescription?: string;
  
  // Definition
  definedProcedures: USDMProcedure[];
  
  // Biomedical concepts collected during this activity
  biomedicalConceptIds: string[];
  
  // Context
  previousActivityId?: string;
  nextActivityId?: string;
  
  // Timing
  activityTimelineId?: string;
  
  // Notes
  notes?: USDMComment[];
}

/**
 * Procedure - A specific procedure within an activity
 */
export interface USDMProcedure {
  id: string;
  instanceType: 'Procedure';
  
  procedureName: string;
  procedureDescription?: string;
  procedureType: USDMCode;
  procedureCode?: USDMCode;
}

/**
 * Encounter - A visit or interaction point (subject encounter)
 */
export interface USDMEncounter {
  id: string;
  instanceType: 'Encounter';
  
  encounterName: string;
  encounterDescription?: string;
  encounterLabel?: string;
  
  encounterType: USDMCode; // Scheduled, Unscheduled
  encounterEnvironmentalSetting?: USDMCode; // Clinic, Home, Virtual
  encounterContactModes: USDMCode[]; // In-person, Phone, Video
  
  // Transition
  transitionStartRule?: USDMTransitionRule;
  transitionEndRule?: USDMTransitionRule;
  
  // Scheduling
  scheduledAtTimingId?: string;
  
  // Previous/Next
  previousEncounterId?: string;
  nextEncounterId?: string;
  
  // Notes
  notes?: USDMComment[];
}

/**
 * Schedule Timeline - Timing information for the schedule of activities
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
 * Scheduled Activity Instance - An activity scheduled at a specific timepoint
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
 * Timing - A timepoint definition
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

export interface USDMTimingReference {
  timingId?: string;
  type: 'AfterStudyStart' | 'AfterPreviousVisit' | 'AfterDose' | 'AfterRandomization' | 'Fixed';
}

export interface USDMTimingWindow {
  windowLower?: USDMQuantity;
  windowUpper?: USDMQuantity;
}

export interface USDMScheduleTimelineExit {
  id: string;
  instanceType: 'ScheduleTimelineExit';
  exitDescription: string;
}

// ============================================================================
// BIOMEDICAL CONCEPTS (Data Collection)
// ============================================================================

/**
 * Biomedical Concept - A standardized data element for collection
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

export interface USDMBiomedicalConceptCategory {
  id: string;
  instanceType: 'BiomedicalConceptCategory';
  
  bcCategoryName: string;
  bcCategoryDescription?: string;
  bcCategoryMemberIds: string[];
}

export interface USDMBiomedicalConceptSurrogate {
  id: string;
  instanceType: 'BiomedicalConceptSurrogate';
  
  bcSurrogateName: string;
  bcSurrogateReference?: string;
}

export interface USDMResponseCode {
  code: string;
  decode: string;
  codeSystem?: string;
}

export interface USDMDataContract {
  id: string;
  dataContractUri: string;
  bcPropertyId: string;
}

// ============================================================================
// STUDY INTERVENTIONS
// ============================================================================

/**
 * Study Intervention - Treatment/intervention in the study
 */
export interface USDMStudyIntervention {
  id: string;
  instanceType: 'StudyIntervention';
  
  interventionDescription: string;
  
  // Coded intervention
  codes: USDMCode[];
  
  // Administration
  administrations: USDMAdministration[];
}

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

export interface USDMIndication {
  id: string;
  instanceType: 'Indication';
  
  indicationDescription: string;
  codes: USDMCode[];
}

// ============================================================================
// ESTIMANDS (ICH E9 R1)
// ============================================================================

/**
 * Estimand - ICH E9 R1 compliant estimand definition
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

export interface USDMIntercurrentEvent {
  id: string;
  instanceType: 'IntercurrentEvent';
  
  intercurrentEventDescription: string;
  intercurrentEventStrategy: USDMCode; // Treatment policy, Composite, Hypothetical, Principal Stratum
}

// ============================================================================
// WORKFLOW
// ============================================================================

export interface USDMWorkflow {
  id: string;
  instanceType: 'Workflow';
  
  workflowDescription: string;
  workflowItems: USDMWorkflowItem[];
}

export interface USDMWorkflowItem {
  id: string;
  instanceType: 'WorkflowItem';
  
  workflowItemDescription: string;
  previousWorkflowItemId?: string;
  nextWorkflowItemId?: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Organization - Sponsor, regulatory authority, etc.
 */
export interface USDMOrganization {
  id: string;
  instanceType: 'Organization';
  
  organizationName: string;
  organizationIdentifier?: string;
  organizationIdentifierScheme?: string;
  organizationType: USDMCode;
  
  // Address
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

/**
 * Code - Coded value with terminology reference
 */
export interface USDMCode {
  id?: string;
  code: string;
  codeSystem: string;
  codeSystemVersion?: string;
  decode: string;
  instanceType?: 'Code';
}

/**
 * Quantity - Numeric value with unit
 */
export interface USDMQuantity {
  value: number;
  unit: string;
  comparator?: '<' | '<=' | '>=' | '>';
}

/**
 * Range - Numeric range
 */
export interface USDMRange {
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

/**
 * Comment/Note
 */
export interface USDMComment {
  id: string;
  text: string;
}

// ============================================================================
// USDM STORE STATE
// ============================================================================

export interface USDMState {
  // Studies (root entities)
  studies: Record<string, USDMStudy>;
  studyDesigns: Record<string, USDMStudyDesign>;
  
  // Objectives & Endpoints (key for lineage)
  objectives: Record<string, USDMObjective>;
  endpoints: Record<string, USDMEndpoint>;
  
  // Populations & Eligibility
  populations: Record<string, USDMStudyPopulation>;
  eligibilityCriteria: Record<string, USDMEligibilityCriteria>;
  
  // Study Structure
  studyArms: Record<string, USDMStudyArm>;
  studyEpochs: Record<string, USDMStudyEpoch>;
  studyCells: Record<string, USDMStudyCell>;
  
  // Schedule of Activities
  activities: Record<string, USDMActivity>;
  encounters: Record<string, USDMEncounter>;
  timelines: Record<string, USDMScheduleTimeline>;
  scheduledInstances: Record<string, USDMScheduledActivityInstance>;
  
  // Biomedical Concepts
  biomedicalConcepts: Record<string, USDMBiomedicalConcept>;
  
  // Interventions
  interventions: Record<string, USDMStudyIntervention>;
  
  // Lookup indices
  studyByProductId: Record<string, string[]>;
  studyByCTMSId: Record<string, string>;
  objectivesByStudyDesignId: Record<string, string[]>;
  endpointsByObjectiveId: Record<string, string[]>;
  
  // Lineage tracking
  lineageIndex: Record<string, USDMDataLineage>;
  
  // UI State
  selectedStudyId: string | null;
  selectedStudyDesignId: string | null;
  selectedObjectiveId: string | null;
  activeView: USDMView;
  isLoading: boolean;
  error: string | null;
  
  // Export state
  lastExportedAt: string | null;
  exportFormat: 'json' | 'pdf' | null;
}

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

// ============================================================================
// USDM ACTIONS
// ============================================================================

export interface USDMActions {
  // Study CRUD
  createStudy: (data: Partial<USDMStudy>) => USDMStudy;
  updateStudy: (id: string, updates: Partial<USDMStudy>) => void;
  deleteStudy: (id: string) => void;
  
  // Study Design CRUD
  createStudyDesign: (studyId: string, data: Partial<USDMStudyDesign>) => USDMStudyDesign;
  updateStudyDesign: (id: string, updates: Partial<USDMStudyDesign>) => void;
  
  // Objectives & Endpoints
  addObjective: (studyDesignId: string, objective: Partial<USDMObjective>) => USDMObjective;
  updateObjective: (id: string, updates: Partial<USDMObjective>) => void;
  removeObjective: (id: string) => void;
  
  addEndpoint: (objectiveId: string, endpoint: Partial<USDMEndpoint>) => USDMEndpoint;
  updateEndpoint: (id: string, updates: Partial<USDMEndpoint>) => void;
  removeEndpoint: (id: string) => void;
  
  // Study Structure
  addStudyArm: (studyDesignId: string, arm: Partial<USDMStudyArm>) => USDMStudyArm;
  updateStudyArm: (id: string, updates: Partial<USDMStudyArm>) => void;
  removeStudyArm: (id: string) => void;
  
  addStudyEpoch: (studyDesignId: string, epoch: Partial<USDMStudyEpoch>) => USDMStudyEpoch;
  updateStudyEpoch: (id: string, updates: Partial<USDMStudyEpoch>) => void;
  removeStudyEpoch: (id: string) => void;
  
  // Schedule of Activities
  addActivity: (studyDesignId: string, activity: Partial<USDMActivity>) => USDMActivity;
  updateActivity: (id: string, updates: Partial<USDMActivity>) => void;
  removeActivity: (id: string) => void;
  
  addEncounter: (studyDesignId: string, encounter: Partial<USDMEncounter>) => USDMEncounter;
  updateEncounter: (id: string, updates: Partial<USDMEncounter>) => void;
  removeEncounter: (id: string) => void;
  
  scheduleActivity: (activityId: string, encounterId: string, timingId: string) => USDMScheduledActivityInstance;
  unscheduleActivity: (instanceId: string) => void;
  
  // Eligibility
  addEligibilityCriterion: (populationId: string, criterion: Partial<USDMEligibilityCriteria>) => USDMEligibilityCriteria;
  updateEligibilityCriterion: (id: string, updates: Partial<USDMEligibilityCriteria>) => void;
  removeEligibilityCriterion: (id: string) => void;
  
  // Lineage Management (key differentiator)
  trackLineage: (entityId: string, entityType: USDMDataLineage['sourceEntityType']) => void;
  recordLineageAppearance: (entityId: string, appearance: USDMLineageAppearance) => void;
  syncLineage: (entityId: string) => Promise<void>;
  getLineageForEntity: (entityId: string) => USDMDataLineage | null;
  findOutdatedLineage: () => { entityId: string; lineage: USDMDataLineage }[];
  
  // Cross-module linking
  linkToCTMSStudy: (usdmStudyId: string, ctmsStudyId: string) => void;
  linkToProduct: (usdmStudyId: string, productId: string) => void;
  linkToSubmission: (usdmStudyId: string, submissionId: string) => void;
  
  // Export
  exportToUSDMJson: (studyId: string) => object; // TransCelerate USDM JSON format
  exportToProtocolPDF: (studyId: string) => Promise<Blob>;
  
  // Import
  importFromUSDMJson: (json: object) => USDMStudy;
  
  // UI Actions
  setSelectedStudy: (id: string | null) => void;
  setSelectedStudyDesign: (id: string | null) => void;
  setSelectedObjective: (id: string | null) => void;
  setActiveView: (view: USDMView) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Mock Data
  loadMockData: () => void;
  clearAll: () => void;
}

// ============================================================================
// USDM VALIDATION
// ============================================================================

export interface USDMValidationResult {
  isValid: boolean;
  entityId: string;
  entityType: string;
  errors: USDMValidationError[];
  warnings: USDMValidationWarning[];
  validatedAt: string;
}

export interface USDMValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

export interface USDMValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

// ============================================================================
// LINEAGE SYNC TYPES
// ============================================================================

export interface LineageSyncRequest {
  sourceEntityId: string;
  sourceEntityType: USDMDataLineage['sourceEntityType'];
  targetModules: USDMLineageAppearance['module'][];
}

export interface LineageSyncResult {
  sourceEntityId: string;
  syncedAppearances: USDMLineageAppearance[];
  conflicts: LineageConflict[];
  syncedAt: string;
}

export interface LineageConflict {
  module: USDMLineageAppearance['module'];
  entityId: string;
  field: string;
  sourceValue: string;
  targetValue: string;
  resolution: 'pending' | 'source-wins' | 'target-wins' | 'manual';
}
