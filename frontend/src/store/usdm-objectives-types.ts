
// ============================================================================
// USDM Objectives & Endpoints Types v0.9.9e - Study Objectives, Endpoints, Estimands
// TransCelerate/CDISC DDF Reference v3.0 Compliant + ICH E9(R1) Estimand Framework
// ============================================================================

import { USDMCode, USDMComment } from './usdmTypes';
import { generateUSDMId, ValidationResult } from './usdm-core-types';

// ============================================================================
// STUDY OBJECTIVE (USDM 3.0 First-Class Entity)
// ============================================================================

/**
 * StudyObjective - Represents a study objective (primary, secondary, exploratory)
 * Objectives define what the study aims to demonstrate or discover
 */
export interface USDMStudyObjective {
  id: string;
  instanceType: 'StudyObjective';
  
  /** Reference to the study */
  studyId: string;
  
  /** Short unique identifier (e.g., PO1, SO2, EO3) */
  identifier?: string;
  
  /** Brief name of the objective */
  name: string;
  
  /** Full text of the objective */
  text: string;
  
  /** Objective level (primary, secondary, exploratory) */
  level: USDMObjectiveLevel;
  
  /** References to linked endpoints */
  endpointIds: string[];
  
  /** Display order within the level */
  displayOrder: number;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Objective levels per CDISC/ICH standards
 */
export type USDMObjectiveLevel = 
  | 'Primary'
  | 'Secondary'
  | 'Exploratory';

export const OBJECTIVE_LEVEL_CODES: Record<USDMObjectiveLevel, USDMCode> = {
  Primary: {
    code: 'C85826',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Primary Objective',
  },
  Secondary: {
    code: 'C85827',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Secondary Objective',
  },
  Exploratory: {
    code: 'C85828',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Exploratory Objective',
  },
};

// ============================================================================
// ENDPOINT (USDM 3.0 First-Class Entity)
// ============================================================================

/**
 * Endpoint - Represents a clinical trial endpoint
 * Endpoints are measurable outcomes that support objectives
 */
export interface USDMEndpoint {
  id: string;
  instanceType: 'Endpoint';
  
  /** Reference to the study */
  studyId: string;
  
  /** Short unique identifier (e.g., PE1, SE2, SAE1) */
  identifier?: string;
  
  /** Brief name of the endpoint */
  name: string;
  
  /** Full text describing the endpoint */
  text: string;
  
  /** Purpose of the endpoint */
  purpose: USDMEndpointPurpose;
  
  /** Outcome measure details */
  outcomeMeasure: USDMOutcomeMeasure;
  
  /** Timeframe for measurement (e.g., "Week 24", "At progression") */
  timeframe?: string;
  
  /** References to linked estimands */
  estimandIds: string[];
  
  /** Display order within the purpose */
  displayOrder: number;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Endpoint purpose per CDISC standards
 */
export type USDMEndpointPurpose = 
  | 'Primary'
  | 'Secondary'
  | 'Exploratory'
  | 'Safety'
  | 'Pharmacokinetic';

export const ENDPOINT_PURPOSE_CODES: Record<USDMEndpointPurpose, USDMCode> = {
  Primary: {
    code: 'C98772',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Primary Endpoint',
  },
  Secondary: {
    code: 'C98781',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Secondary Endpoint',
  },
  Exploratory: {
    code: 'C98724',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Exploratory Endpoint',
  },
  Safety: {
    code: 'C49501',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Safety Endpoint',
  },
  Pharmacokinetic: {
    code: 'C49663',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Pharmacokinetic Endpoint',
  },
};

/**
 * Outcome measure details
 */
export interface USDMOutcomeMeasure {
  /** Name of the measure */
  name: string;
  
  /** Description of how it's measured */
  description?: string;
  
  /** Unit of measurement */
  unit?: string;
  
  /** Type of variable */
  variableType?: USDMVariableType;
  
  /** Assessment method (e.g., "BICR", "Investigator assessment") */
  assessmentMethod?: string;
  
  /** Reference to a validated instrument/scale */
  instrument?: string;
}

// ============================================================================
// ESTIMAND (ICH E9(R1) Framework)
// ============================================================================

/**
 * Estimand - ICH E9(R1) compliant estimand definition
 * Estimands precisely define the treatment effect to be estimated
 * 
 * The five components are:
 * 1. Treatment - The treatment condition (intervention vs comparator)
 * 2. Population - The target population
 * 3. Variable - The outcome/endpoint being measured
 * 4. Intercurrent Events - Events affecting interpretation and how to handle them
 * 5. Summary Measure - How the treatment effect is summarized
 */
export interface USDMEstimand {
  id: string;
  instanceType: 'Estimand';
  
  /** Reference to the study */
  studyId: string;
  
  /** Reference to the associated endpoint */
  endpointId: string;
  
  /** Label/name for this estimand */
  label: string;
  
  /** Full description of the estimand */
  description?: string;
  
  // ICH E9(R1) Five Components:
  
  /** Component 1: Treatment - The intervention being assessed */
  treatment: USDMEstimandTreatment;
  
  /** Component 2: Population - The target population */
  population: USDMEstimandPopulation;
  
  /** Component 3: Variable - The outcome variable */
  variable: USDMEstimandVariable;
  
  /** Component 4: Intercurrent Events - Events and handling strategies */
  intercurrentEvents: USDMIntercurrentEvent[];
  
  /** Component 5: Summary Measure - How treatment effect is expressed */
  summaryMeasure: USDMSummaryMeasure;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Display order within the endpoint */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Component 1: Treatment definition for estimand
 */
export interface USDMEstimandTreatment {
  /** Description of the treatment condition */
  description: string;
  
  /** Reference to study arm/intervention */
  treatmentArmId?: string;
  
  /** Description of comparator (if applicable) */
  comparator?: string;
  
  /** Reference to comparator arm */
  comparatorArmId?: string;
}

/**
 * Component 2: Population definition for estimand
 */
export interface USDMEstimandPopulation {
  /** Population type */
  type: USDMPopulationType;
  
  /** Detailed description of the population */
  description: string;
  
  /** Reference to eligibility criteria */
  eligibilityCriteriaRef?: string;
}

export type USDMPopulationType =
  | 'ITT'          // Intent-to-Treat
  | 'mITT'         // Modified Intent-to-Treat
  | 'PP'           // Per-Protocol
  | 'Safety'       // Safety population
  | 'PK'           // Pharmacokinetic population
  | 'Custom';      // Custom definition

export const POPULATION_TYPE_CODES: Record<USDMPopulationType, USDMCode> = {
  ITT: {
    code: 'C70854',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Intent to Treat Population',
  },
  mITT: {
    code: 'C174318',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Modified Intent to Treat Population',
  },
  PP: {
    code: 'C70855',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Per Protocol Population',
  },
  Safety: {
    code: 'C49501',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Safety Population',
  },
  PK: {
    code: 'C70864',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Pharmacokinetic Population',
  },
  Custom: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

/**
 * Component 3: Variable definition for estimand
 */
export interface USDMEstimandVariable {
  /** Type of variable */
  type: USDMVariableType;
  
  /** Description of the outcome variable */
  description: string;
  
  /** Unit of measurement (if applicable) */
  unit?: string;
  
  /** Assessment timing/schedule */
  assessmentSchedule?: string;
  
  /** Reference to endpoint outcome measure */
  outcomeRef?: string;
}

export type USDMVariableType =
  | 'Continuous'
  | 'Binary'
  | 'Ordinal'
  | 'TimeToEvent'
  | 'Count'
  | 'Composite';

export const VARIABLE_TYPE_CODES: Record<USDMVariableType, USDMCode> = {
  Continuous: {
    code: 'C71267',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Continuous Variable',
  },
  Binary: {
    code: 'C71268',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Binary Variable',
  },
  Ordinal: {
    code: 'C71269',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Ordinal Variable',
  },
  TimeToEvent: {
    code: 'C82568',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Time-to-Event Variable',
  },
  Count: {
    code: 'C71270',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Count Variable',
  },
  Composite: {
    code: 'C94485',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Composite Variable',
  },
};

/**
 * Component 4: Intercurrent Event with handling strategy
 */
export interface USDMIntercurrentEvent {
  id: string;
  instanceType: 'IntercurrentEvent';
  
  /** Reference to parent estimand */
  estimandId: string;
  
  /** Name of the intercurrent event */
  name: string;
  
  /** Description of the event */
  description: string;
  
  /** Strategy for handling this event */
  strategy: USDMICEStrategy;
  
  /** Rationale for the chosen strategy */
  strategyRationale?: string;
  
  /** Display order */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * ICH E9(R1) Intercurrent Event handling strategies
 */
export type USDMICEStrategy =
  | 'TreatmentPolicy'    // Use all observed data regardless of event
  | 'Composite'          // Include event as part of the outcome
  | 'Hypothetical'       // Estimate what would have happened without event
  | 'PrincipalStratum'   // Focus on subpopulation that wouldn't have event
  | 'WhileOnTreatment';  // Use data only while on assigned treatment

export const ICE_STRATEGY_CODES: Record<USDMICEStrategy, USDMCode> = {
  TreatmentPolicy: {
    code: 'C178894',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Treatment Policy Strategy',
  },
  Composite: {
    code: 'C178895',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Composite Variable Strategy',
  },
  Hypothetical: {
    code: 'C178896',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Hypothetical Strategy',
  },
  PrincipalStratum: {
    code: 'C178897',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Principal Stratum Strategy',
  },
  WhileOnTreatment: {
    code: 'C178898',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'While On Treatment Strategy',
  },
};

/**
 * Component 5: Summary Measure
 */
export interface USDMSummaryMeasure {
  /** Type of summary measure */
  type: USDMSummaryMeasureType;
  
  /** Description of the summary measure */
  description: string;
  
  /** Statistical method details */
  statisticalMethod?: string;
  
  /** Confidence interval level (e.g., 95) */
  confidenceLevel?: number;
  
  /** Stratification factors */
  stratificationFactors?: string[];
}

export type USDMSummaryMeasureType =
  | 'Difference'    // Difference between treatments
  | 'Ratio'         // Ratio of treatment effects
  | 'Proportion'    // Proportion/percentage
  | 'HazardRatio'   // Hazard ratio for time-to-event
  | 'OddsRatio'     // Odds ratio
  | 'Mean'          // Mean value
  | 'Median'        // Median value
  | 'Custom';       // Custom summary measure

export const SUMMARY_MEASURE_TYPE_CODES: Record<USDMSummaryMeasureType, USDMCode> = {
  Difference: {
    code: 'C48660',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Difference',
  },
  Ratio: {
    code: 'C48661',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Ratio',
  },
  Proportion: {
    code: 'C45253',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Proportion',
  },
  HazardRatio: {
    code: 'C94534',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Hazard Ratio',
  },
  OddsRatio: {
    code: 'C16932',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Odds Ratio',
  },
  Mean: {
    code: 'C53319',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Mean',
  },
  Median: {
    code: 'C28007',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Median',
  },
  Custom: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

// ============================================================================
// STATE TYPES
// ============================================================================

export interface USDMObjectivesState {
  /** Objectives indexed by study ID */
  objectivesByStudyId: Record<string, USDMStudyObjective[]>;
  
  /** Endpoints indexed by study ID */
  endpointsByStudyId: Record<string, USDMEndpoint[]>;
  
  /** Estimands indexed by study ID */
  estimandsByStudyId: Record<string, USDMEstimand[]>;
  
  /** Intercurrent events indexed by estimand ID */
  iceByEstimandId: Record<string, USDMIntercurrentEvent[]>;
  
  /** Selection state */
  selectedObjectiveId: string | null;
  selectedEndpointId: string | null;
  selectedEstimandId: string | null;
}

export interface USDMObjectivesActions {
  // Objectives
  addObjective: (studyId: string, data: Partial<USDMStudyObjective>) => USDMStudyObjective;
  updateObjective: (id: string, updates: Partial<USDMStudyObjective>) => void;
  removeObjective: (id: string) => void;
  reorderObjectives: (studyId: string, level: USDMObjectiveLevel, objectiveIds: string[]) => void;
  linkEndpointToObjective: (objectiveId: string, endpointId: string) => void;
  unlinkEndpointFromObjective: (objectiveId: string, endpointId: string) => void;
  
  // Endpoints
  addEndpoint: (studyId: string, data: Partial<USDMEndpoint>) => USDMEndpoint;
  updateEndpoint: (id: string, updates: Partial<USDMEndpoint>) => void;
  removeEndpoint: (id: string) => void;
  reorderEndpoints: (studyId: string, purpose: USDMEndpointPurpose, endpointIds: string[]) => void;
  linkEstimandToEndpoint: (endpointId: string, estimandId: string) => void;
  unlinkEstimandFromEndpoint: (endpointId: string, estimandId: string) => void;
  
  // Estimands
  addEstimand: (studyId: string, data: Partial<USDMEstimand>) => USDMEstimand;
  updateEstimand: (id: string, updates: Partial<USDMEstimand>) => void;
  removeEstimand: (id: string) => void;
  
  // Intercurrent Events
  addIntercurrentEvent: (estimandId: string, data: Partial<USDMIntercurrentEvent>) => USDMIntercurrentEvent;
  updateIntercurrentEvent: (estimandId: string, eventId: string, updates: Partial<USDMIntercurrentEvent>) => void;
  removeIntercurrentEvent: (estimandId: string, eventId: string) => void;
  
  // Bulk operations
  copyObjectivesFromStudy: (sourceStudyId: string, targetStudyId: string) => void;
  clearObjectivesStore: () => void;
  
  // Queries
  getObjectiveById: (id: string) => USDMStudyObjective | undefined;
  getEndpointById: (id: string) => USDMEndpoint | undefined;
  getEstimandById: (id: string) => USDMEstimand | undefined;
  getObjectivesEndpointsView: (studyId: string) => ObjectivesEndpointsView;
  
  // Selection
  selectObjective: (id: string | null) => void;
  selectEndpoint: (id: string | null) => void;
  selectEstimand: (id: string | null) => void;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * Complete view of objectives and endpoints for a study
 */
export interface ObjectivesEndpointsView {
  studyId: string;
  primaryObjectives: ObjectiveView[];
  secondaryObjectives: ObjectiveView[];
  exploratoryObjectives: ObjectiveView[];
  statistics: ObjectivesEndpointsStatistics;
}

/**
 * Single objective with its linked endpoints
 */
export interface ObjectiveView {
  objective: USDMStudyObjective;
  endpoints: EndpointView[];
}

/**
 * Single endpoint with its linked estimands
 */
export interface EndpointView {
  endpoint: USDMEndpoint;
  estimands: EstimandView[];
}

/**
 * Single estimand with its intercurrent events
 */
export interface EstimandView {
  estimand: USDMEstimand;
  intercurrentEvents: USDMIntercurrentEvent[];
}

/**
 * Statistics for objectives and endpoints
 */
export interface ObjectivesEndpointsStatistics {
  totalObjectives: number;
  objectivesByLevel: Record<USDMObjectiveLevel, number>;
  totalEndpoints: number;
  endpointsByPurpose: Record<USDMEndpointPurpose, number>;
  totalEstimands: number;
  estimandsByLevel: Record<USDMObjectiveLevel, number>;
  endpointsWithEstimands: number;
  endpointsWithoutEstimands: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new StudyObjective
 */
export function createStudyObjective(
  studyId: string,
  name: string,
  text: string,
  level: USDMObjectiveLevel,
  displayOrder: number,
  overrides?: Partial<USDMStudyObjective>
): USDMStudyObjective {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('objective'),
    instanceType: 'StudyObjective',
    studyId,
    name,
    text,
    level,
    endpointIds: [],
    displayOrder,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a new Endpoint
 */
export function createEndpoint(
  studyId: string,
  name: string,
  text: string,
  purpose: USDMEndpointPurpose,
  outcomeMeasure: USDMOutcomeMeasure,
  displayOrder: number,
  overrides?: Partial<USDMEndpoint>
): USDMEndpoint {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('endpoint'),
    instanceType: 'Endpoint',
    studyId,
    name,
    text,
    purpose,
    outcomeMeasure,
    estimandIds: [],
    displayOrder,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a new Estimand with all five ICH E9(R1) components
 */
export function createEstimand(
  studyId: string,
  endpointId: string,
  label: string,
  treatment: USDMEstimandTreatment,
  population: USDMEstimandPopulation,
  variable: USDMEstimandVariable,
  summaryMeasure: USDMSummaryMeasure,
  displayOrder: number = 0,
  overrides?: Partial<USDMEstimand>
): USDMEstimand {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('estimand'),
    instanceType: 'Estimand',
    studyId,
    endpointId,
    label,
    treatment,
    population,
    variable,
    intercurrentEvents: [],
    summaryMeasure,
    displayOrder,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a new Intercurrent Event
 */
export function createIntercurrentEvent(
  estimandId: string,
  name: string,
  description: string,
  strategy: USDMICEStrategy,
  displayOrder: number,
  overrides?: Partial<USDMIntercurrentEvent>
): USDMIntercurrentEvent {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('ice'),
    instanceType: 'IntercurrentEvent',
    estimandId,
    name,
    description,
    strategy,
    displayOrder,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a StudyObjective
 */
export function validateStudyObjective(objective: USDMStudyObjective): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!objective.id) errors.push('Objective must have an ID');
  if (!objective.studyId) errors.push('Objective must reference a study');
  if (!objective.name?.trim()) errors.push('Objective must have a name');
  if (!objective.text?.trim()) errors.push('Objective must have descriptive text');
  if (!objective.level) errors.push('Objective must have a level (Primary/Secondary/Exploratory)');
  
  if (objective.endpointIds.length === 0) {
    warnings.push('Objective has no linked endpoints');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an Endpoint
 */
export function validateEndpoint(endpoint: USDMEndpoint): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!endpoint.id) errors.push('Endpoint must have an ID');
  if (!endpoint.studyId) errors.push('Endpoint must reference a study');
  if (!endpoint.name?.trim()) errors.push('Endpoint must have a name');
  if (!endpoint.text?.trim()) errors.push('Endpoint must have descriptive text');
  if (!endpoint.purpose) errors.push('Endpoint must have a purpose');
  if (!endpoint.outcomeMeasure?.name?.trim()) errors.push('Endpoint must have an outcome measure');
  
  if (endpoint.purpose === 'Primary' && endpoint.estimandIds.length === 0) {
    warnings.push('Primary endpoint should have at least one estimand defined');
  }
  
  if (!endpoint.timeframe) {
    warnings.push('Consider specifying a timeframe for the endpoint');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an Estimand (ICH E9(R1) compliance)
 */
export function validateEstimand(estimand: USDMEstimand): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!estimand.id) errors.push('Estimand must have an ID');
  if (!estimand.studyId) errors.push('Estimand must reference a study');
  if (!estimand.endpointId) errors.push('Estimand must reference an endpoint');
  if (!estimand.label?.trim()) errors.push('Estimand must have a label');
  
  // Validate all five ICH E9(R1) components
  
  // Component 1: Treatment
  if (!estimand.treatment) {
    errors.push('Estimand must define the treatment (ICH E9(R1) Component 1)');
  } else if (!estimand.treatment.description?.trim()) {
    errors.push('Treatment must have a description');
  }
  
  // Component 2: Population
  if (!estimand.population) {
    errors.push('Estimand must define the population (ICH E9(R1) Component 2)');
  } else {
    if (!estimand.population.type) errors.push('Population must have a type');
    if (!estimand.population.description?.trim()) errors.push('Population must have a description');
  }
  
  // Component 3: Variable
  if (!estimand.variable) {
    errors.push('Estimand must define the variable (ICH E9(R1) Component 3)');
  } else {
    if (!estimand.variable.type) errors.push('Variable must have a type');
    if (!estimand.variable.description?.trim()) errors.push('Variable must have a description');
  }
  
  // Component 4: Intercurrent Events
  if (estimand.intercurrentEvents.length === 0) {
    warnings.push('Estimand should consider potential intercurrent events (ICH E9(R1) Component 4)');
  }
  
  // Component 5: Summary Measure
  if (!estimand.summaryMeasure) {
    errors.push('Estimand must define the summary measure (ICH E9(R1) Component 5)');
  } else {
    if (!estimand.summaryMeasure.type) errors.push('Summary measure must have a type');
    if (!estimand.summaryMeasure.description?.trim()) errors.push('Summary measure must have a description');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an Intercurrent Event
 */
export function validateIntercurrentEvent(ice: USDMIntercurrentEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ice.id) errors.push('Intercurrent event must have an ID');
  if (!ice.estimandId) errors.push('Intercurrent event must reference an estimand');
  if (!ice.name?.trim()) errors.push('Intercurrent event must have a name');
  if (!ice.description?.trim()) errors.push('Intercurrent event must have a description');
  if (!ice.strategy) errors.push('Intercurrent event must have a handling strategy');
  
  if (!ice.strategyRationale?.trim()) {
    warnings.push('Consider providing rationale for the chosen strategy');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete objectives and endpoints structure for a study
 */
export function validateCompleteObjectivesEndpoints(
  objectives: USDMStudyObjective[],
  endpoints: USDMEndpoint[],
  estimands: USDMEstimand[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Must have at least one primary objective
  const primaryObjectives = objectives.filter(o => o.level === 'Primary');
  if (primaryObjectives.length === 0) {
    errors.push('Study must have at least one primary objective');
  }
  
  // Must have at least one primary endpoint
  const primaryEndpoints = endpoints.filter(e => e.purpose === 'Primary');
  if (primaryEndpoints.length === 0) {
    errors.push('Study must have at least one primary endpoint');
  }
  
  // Check for orphaned endpoints (not linked to any objective)
  const linkedEndpointIds = new Set(objectives.flatMap(o => o.endpointIds));
  const orphanedEndpoints = endpoints.filter(e => !linkedEndpointIds.has(e.id));
  if (orphanedEndpoints.length > 0) {
    warnings.push(`${orphanedEndpoints.length} endpoint(s) not linked to any objective`);
  }
  
  // Validate individual items
  objectives.forEach(obj => {
    const result = validateStudyObjective(obj);
    errors.push(...result.errors.map(e => `Objective "${obj.name}": ${e}`));
    warnings.push(...result.warnings.map(w => `Objective "${obj.name}": ${w}`));
  });
  
  endpoints.forEach(ep => {
    const result = validateEndpoint(ep);
    errors.push(...result.errors.map(e => `Endpoint "${ep.name}": ${e}`));
    warnings.push(...result.warnings.map(w => `Endpoint "${ep.name}": ${w}`));
  });
  
  estimands.forEach(est => {
    const result = validateEstimand(est);
    errors.push(...result.errors.map(e => `Estimand "${est?.label ?? ''}": ${e}`));
    warnings.push(...result.warnings.map(w => `Estimand "${est?.label ?? ''}": ${w}`));
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get objectives by level
 */
export function getObjectivesByLevel(
  objectives: USDMStudyObjective[],
  level: USDMObjectiveLevel
): USDMStudyObjective[] {
  return objectives
    .filter(o => o.level === level)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get endpoints by purpose
 */
export function getEndpointsByPurpose(
  endpoints: USDMEndpoint[],
  purpose: USDMEndpointPurpose
): USDMEndpoint[] {
  return endpoints
    .filter(e => e.purpose === purpose)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get endpoints linked to an objective
 */
export function getEndpointsForObjective(
  objective: USDMStudyObjective,
  endpoints: USDMEndpoint[]
): USDMEndpoint[] {
  const endpointSet = new Set(objective.endpointIds);
  return endpoints.filter(e => endpointSet.has(e.id));
}

/**
 * Get estimands for an endpoint
 */
export function getEstimandsForEndpoint(
  endpoint: USDMEndpoint,
  estimands: USDMEstimand[]
): USDMEstimand[] {
  return estimands.filter(est => est.endpointId === endpoint.id);
}

/**
 * Count objectives by level
 */
export function countObjectivesByLevel(
  objectives: USDMStudyObjective[]
): Record<USDMObjectiveLevel, number> {
  return {
    Primary: objectives.filter(o => o.level === 'Primary').length,
    Secondary: objectives.filter(o => o.level === 'Secondary').length,
    Exploratory: objectives.filter(o => o.level === 'Exploratory').length,
  };
}

/**
 * Count endpoints by purpose
 */
export function countEndpointsByPurpose(
  endpoints: USDMEndpoint[]
): Record<USDMEndpointPurpose, number> {
  return {
    Primary: endpoints.filter(e => e.purpose === 'Primary').length,
    Secondary: endpoints.filter(e => e.purpose === 'Secondary').length,
    Exploratory: endpoints.filter(e => e.purpose === 'Exploratory').length,
    Safety: endpoints.filter(e => e.purpose === 'Safety').length,
    Pharmacokinetic: endpoints.filter(e => e.purpose === 'Pharmacokinetic').length,
  };
}

/**
 * Generate an objective identifier based on level
 */
export function generateObjectiveIdentifier(
  level: USDMObjectiveLevel,
  existingObjectives: USDMStudyObjective[]
): string {
  const prefix = level === 'Primary' ? 'PO' : level === 'Secondary' ? 'SO' : 'EO';
  const sameLevel = existingObjectives.filter(o => o.level === level);
  return `${prefix}${sameLevel.length + 1}`;
}

/**
 * Generate an endpoint identifier based on purpose
 */
export function generateEndpointIdentifier(
  purpose: USDMEndpointPurpose,
  existingEndpoints: USDMEndpoint[]
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

/**
 * Get human-readable label for objective level
 */
export function getObjectiveLevelLabel(level: USDMObjectiveLevel): string {
  return OBJECTIVE_LEVEL_CODES[level].decode;
}

/**
 * Get human-readable label for endpoint purpose
 */
export function getEndpointPurposeLabel(purpose: USDMEndpointPurpose): string {
  return ENDPOINT_PURPOSE_CODES[purpose].decode;
}

/**
 * Get human-readable label for ICE strategy
 */
export function getICEStrategyLabel(strategy: USDMICEStrategy): string {
  const labels: Record<USDMICEStrategy, string> = {
    TreatmentPolicy: 'Treatment Policy (Use all observed data)',
    Composite: 'Composite (Include event in outcome)',
    Hypothetical: 'Hypothetical (What would have happened)',
    PrincipalStratum: 'Principal Stratum (Subpopulation focus)',
    WhileOnTreatment: 'While On Treatment (Data only during treatment)',
  };
  return labels[strategy];
}

/**
 * Format an estimand as a human-readable text description
 */
export function formatEstimandAsText(
  estimand: USDMEstimand,
  ices: USDMIntercurrentEvent[]
): string {
  const parts: string[] = [];
  
  parts.push(`Treatment: ${estimand.treatment.description}`);
  if (estimand.treatment.comparator) {
    parts.push(`Comparator: ${estimand.treatment.comparator}`);
  }
  
  parts.push(`Population: ${estimand.population.description} (${estimand.population.type})`);
  parts.push(`Variable: ${estimand.variable.description} (${estimand.variable.type})`);
  
  if (ices.length > 0) {
    parts.push('Intercurrent Events:');
    ices.forEach((ice, i) => {
      parts.push(`  ${i + 1}. ${ice.name} → ${getICEStrategyLabel(ice.strategy)}`);
    });
  }
  
  parts.push(`Summary Measure: ${estimand.summaryMeasure.description} (${estimand.summaryMeasure.type})`);
  if (estimand.summaryMeasure.confidenceLevel) {
    parts.push(`Confidence Level: ${estimand.summaryMeasure.confidenceLevel}%`);
  }
  
  return parts.join('\n');
}

/**
 * Check if an estimand is ICH E9(R1) compliant (has all 5 components)
 */
export function isEstimandComplete(estimand: USDMEstimand): boolean {
  return !!(
    estimand.treatment?.description &&
    estimand.population?.type && estimand.population?.description &&
    estimand.variable?.type && estimand.variable?.description &&
    estimand.summaryMeasure?.type && estimand.summaryMeasure?.description
  );
}

/**
 * Get the primary estimand for an endpoint (if multiple exist)
 */
export function getPrimaryEstimand(
  endpoint: USDMEndpoint,
  estimands: USDMEstimand[]
): USDMEstimand | undefined {
  const endpointEstimands = getEstimandsForEndpoint(endpoint, estimands);
  // Return the first one (primary) or undefined
  return endpointEstimands[0];
}
