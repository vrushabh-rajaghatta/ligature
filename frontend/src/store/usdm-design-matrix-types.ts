
// ============================================================================
// USDM Design Matrix Types v0.9.9b - Study Structure (Arms, Epochs, Elements, Cells)
// TransCelerate/CDISC DDF Reference v3.0 Compliant
// ============================================================================

import { USDMCode, USDMQuantity, USDMComment } from './usdmTypes';
import { generateUSDMId, ValidationResult } from './usdm-core-types';

// ============================================================================
// STUDY ARM (Enhanced USDM 3.0)
// ============================================================================

/**
 * StudyArm - A group of subjects that will receive a particular intervention
 * or set of interventions, or no intervention, according to the protocol.
 */
export interface USDMStudyArmEnhanced {
  id: string;
  instanceType: 'StudyArm';
  
  /** Unique name for the arm */
  studyArmName: string;
  
  /** Description of the arm */
  studyArmDescription?: string;
  
  /** Type of arm (from CDISC controlled terminology) */
  studyArmType: USDMStudyArmType;
  
  /** Arm origin type - how subjects enter this arm */
  studyArmOriginType?: USDMStudyArmOriginType;
  
  /** Data origin type - source of subject data */
  studyArmDataOriginType?: USDMStudyArmDataOriginType;
  
  /** Description of data origin */
  studyArmDataOriginDescription?: string;
  
  /** Target number of subjects for this arm */
  plannedSubjectNumber?: number;
  
  /** Randomization ratio (e.g., "2:1") */
  randomizationRatio?: string;
  
  /** Display order in the design matrix */
  displayOrder: number;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Study Arm Types per CDISC CT
 */
export type USDMStudyArmType = 
  | 'Experimental'           // Experimental treatment arm
  | 'ActiveComparator'       // Active comparator arm
  | 'PlaceboComparator'      // Placebo comparator arm
  | 'ShamComparator'         // Sham procedure arm
  | 'NoIntervention'         // No intervention/observation arm
  | 'Other';                 // Other type

export const STUDY_ARM_TYPE_CODES: Record<USDMStudyArmType, USDMCode> = {
  Experimental: {
    code: 'C174266',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Experimental Arm',
  },
  ActiveComparator: {
    code: 'C174267',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Active Comparator Arm',
  },
  PlaceboComparator: {
    code: 'C174268',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Placebo Comparator Arm',
  },
  ShamComparator: {
    code: 'C174269',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Sham Comparator Arm',
  },
  NoIntervention: {
    code: 'C174270',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'No Intervention Arm',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

/**
 * Arm Origin Type - How subjects arrive in this arm
 */
export type USDMStudyArmOriginType = 
  | 'Assigned'        // Subjects directly assigned
  | 'Randomized'      // Subjects randomized from pool
  | 'Stratified'      // Subjects stratified then assigned
  | 'CrossoverFrom'   // Subjects crossed over from another arm
  | 'Rollover';       // Subjects rolled over from previous study

export const ARM_ORIGIN_TYPE_CODES: Record<USDMStudyArmOriginType, USDMCode> = {
  Assigned: {
    code: 'C99907x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Directly Assigned',
  },
  Randomized: {
    code: 'C99907x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Randomized',
  },
  Stratified: {
    code: 'C99907x3',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Stratified Randomization',
  },
  CrossoverFrom: {
    code: 'C99907x4',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Crossover',
  },
  Rollover: {
    code: 'C99907x5',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Rollover',
  },
};

/**
 * Data Origin Type - Source of subject data for this arm
 */
export type USDMStudyArmDataOriginType = 
  | 'Collected'         // Data collected prospectively
  | 'Derived'           // Data derived from other sources
  | 'ExternalSource'    // Data from external real-world source
  | 'HistoricalControl' // Historical control data
  | 'Simulated';        // Simulated/synthetic data

export const DATA_ORIGIN_TYPE_CODES: Record<USDMStudyArmDataOriginType, USDMCode> = {
  Collected: {
    code: 'C99908x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Collected',
  },
  Derived: {
    code: 'C99908x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Derived',
  },
  ExternalSource: {
    code: 'C99908x3',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Real-World Data Source',
  },
  HistoricalControl: {
    code: 'C99908x4',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Historical Control',
  },
  Simulated: {
    code: 'C99908x5',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Simulated',
  },
};

// ============================================================================
// STUDY EPOCH (Enhanced USDM 3.0)
// ============================================================================

/**
 * StudyEpoch - A period of time in the study during which activities occur
 * Epochs are ordered sequentially to define the study timeline
 */
export interface USDMStudyEpochEnhanced {
  id: string;
  instanceType: 'StudyEpoch';
  
  /** Unique name for the epoch */
  studyEpochName: string;
  
  /** Description of the epoch */
  studyEpochDescription?: string;
  
  /** Type of epoch (from CDISC controlled terminology) */
  studyEpochType: USDMStudyEpochType;
  
  /** Sequence number for ordering */
  sequenceNumber: number;
  
  /** Reference to previous epoch (for linked list navigation) */
  previousStudyEpochId?: string;
  
  /** Reference to next epoch (for linked list navigation) */
  nextStudyEpochId?: string;
  
  /** Planned duration */
  plannedDuration?: USDMQuantity;
  
  /** Minimum duration (for flexible epochs) */
  minimumDuration?: USDMQuantity;
  
  /** Maximum duration (for flexible epochs) */
  maximumDuration?: USDMQuantity;
  
  /** Whether subjects can exit study during this epoch */
  allowsEarlyTermination: boolean;
  
  /** Entry criteria for this epoch (if different from study entry) */
  entryCriteriaDescription?: string;
  
  /** Exit criteria for this epoch */
  exitCriteriaDescription?: string;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Study Epoch Types per CDISC CT
 */
export type USDMStudyEpochType = 
  | 'Screening'        // Eligibility assessment period
  | 'RunIn'            // Run-in/stabilization period
  | 'Treatment'        // Active treatment period
  | 'Washout'          // Washout between treatments
  | 'FollowUp'         // Post-treatment follow-up
  | 'Extension'        // Open-label extension
  | 'Crossover'        // Crossover transition period
  | 'LongTermFollowUp' // Long-term safety follow-up
  | 'Observation'      // Observation/natural history period
  | 'Other';           // Other period type

export const STUDY_EPOCH_TYPE_CODES: Record<USDMStudyEpochType, USDMCode> = {
  Screening: {
    code: 'C48262',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Screening Epoch',
  },
  RunIn: {
    code: 'C161418',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Run-In Epoch',
  },
  Treatment: {
    code: 'C101840',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Treatment Epoch',
  },
  Washout: {
    code: 'C161419',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Washout Epoch',
  },
  FollowUp: {
    code: 'C62637',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Follow-Up Epoch',
  },
  Extension: {
    code: 'C174271',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Extension Epoch',
  },
  Crossover: {
    code: 'C174272',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Crossover Epoch',
  },
  LongTermFollowUp: {
    code: 'C174273',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Long-Term Follow-Up Epoch',
  },
  Observation: {
    code: 'C174274',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Observation Epoch',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

// ============================================================================
// STUDY ELEMENT (Enhanced with Transition Rules)
// ============================================================================

/**
 * StudyElement - The smallest unit of study design, contained within cells
 * Defines what happens (interventions, activities) during that portion of the study
 */
export interface USDMStudyElementEnhanced {
  id: string;
  instanceType: 'StudyElement';
  
  /** Unique name for the element */
  studyElementName: string;
  
  /** Description of the element */
  studyElementDescription?: string;
  
  /** Rule for entering this element */
  transitionStartRule?: USDMTransitionRuleEnhanced;
  
  /** Rule for exiting this element */
  transitionEndRule?: USDMTransitionRuleEnhanced;
  
  /** Planned duration of this element */
  plannedDuration?: USDMQuantity;
  
  /** Intervention IDs associated with this element */
  studyInterventionIds: string[];
  
  /** Activity IDs that occur during this element */
  activityIds: string[];
  
  /** Whether this element is optional */
  isOptional: boolean;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * TransitionRule - Conditions for entering or exiting a study element
 */
export interface USDMTransitionRuleEnhanced {
  id: string;
  instanceType: 'TransitionRule';
  
  /** Human-readable description of the rule */
  transitionRuleDescription: string;
  
  /** Type of rule */
  ruleType: USDMTransitionRuleType;
  
  /** Reference to criteria that must be met (eligibility criterion IDs) */
  criteriaIds?: string[];
  
  /** Time-based conditions */
  timeCondition?: USDMTimeCondition;
  
  /** Event-based conditions */
  eventCondition?: string;
  
  /** Whether all conditions must be met (AND) or any (OR) */
  conditionOperator: 'AND' | 'OR';
}

export type USDMTransitionRuleType = 
  | 'TimeBased'       // After specified duration
  | 'EventBased'      // Upon occurrence of event
  | 'CriteriaBased'   // When criteria are met
  | 'Investigator'    // At investigator discretion
  | 'Composite';      // Combination of conditions

export interface USDMTimeCondition {
  /** Duration value */
  duration: USDMQuantity;
  
  /** Relative to what anchor point */
  relativeTo: USDMTimeAnchor;
  
  /** Window around the time point */
  window?: {
    before?: USDMQuantity;
    after?: USDMQuantity;
  };
}

export type USDMTimeAnchor = 
  | 'StudyStart'
  | 'EpochStart'
  | 'ElementStart'
  | 'PreviousVisit'
  | 'Randomization'
  | 'FirstDose'
  | 'LastDose'
  | 'Event';

// ============================================================================
// STUDY CELL (Enhanced Arm × Epoch Intersection)
// ============================================================================

/**
 * StudyCell - The intersection of a study arm and study epoch
 * Contains the study elements that occur for that arm during that epoch
 */
export interface USDMStudyCellEnhanced {
  id: string;
  instanceType: 'StudyCell';
  
  /** Reference to the arm */
  studyArmId: string;
  
  /** Reference to the epoch */
  studyEpochId: string;
  
  /** Elements contained in this cell */
  studyElements: USDMStudyElementEnhanced[];
  
  /** Whether this cell is active (some cells may be empty in certain designs) */
  isActive: boolean;
  
  /** Special instructions for this cell */
  cellDescription?: string;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DESIGN MATRIX STATE
// ============================================================================

/**
 * State for the design matrix store
 */
export interface USDMDesignMatrixState {
  /** Arms indexed by study design ID */
  armsByDesignId: Record<string, USDMStudyArmEnhanced[]>;
  
  /** Epochs indexed by study design ID */
  epochsByDesignId: Record<string, USDMStudyEpochEnhanced[]>;
  
  /** Cells indexed by study design ID */
  cellsByDesignId: Record<string, USDMStudyCellEnhanced[]>;
  
  /** Elements indexed by ID for quick lookup */
  elementsById: Record<string, USDMStudyElementEnhanced>;
  
  /** Transition rules indexed by ID */
  transitionRulesById: Record<string, USDMTransitionRuleEnhanced>;
  
  /** Selected arm for editing */
  selectedArmId: string | null;
  
  /** Selected epoch for editing */
  selectedEpochId: string | null;
  
  /** Selected cell for editing */
  selectedCellId: string | null;
}

/**
 * Actions for the design matrix store
 */
export interface USDMDesignMatrixActions {
  // Arms
  addStudyArm: (studyDesignId: string, arm: Partial<USDMStudyArmEnhanced>) => USDMStudyArmEnhanced;
  updateStudyArm: (armId: string, updates: Partial<USDMStudyArmEnhanced>) => void;
  removeStudyArm: (armId: string) => void;
  reorderArms: (studyDesignId: string, armIds: string[]) => void;
  getStudyArms: (studyDesignId: string) => USDMStudyArmEnhanced[];
  
  // Epochs
  addStudyEpoch: (studyDesignId: string, epoch: Partial<USDMStudyEpochEnhanced>) => USDMStudyEpochEnhanced;
  updateStudyEpoch: (epochId: string, updates: Partial<USDMStudyEpochEnhanced>) => void;
  removeStudyEpoch: (epochId: string) => void;
  reorderEpochs: (studyDesignId: string, epochIds: string[]) => void;
  getStudyEpochs: (studyDesignId: string) => USDMStudyEpochEnhanced[];
  getEpochSequence: (studyDesignId: string) => USDMStudyEpochEnhanced[];
  
  // Cells
  createStudyCell: (studyDesignId: string, armId: string, epochId: string) => USDMStudyCellEnhanced;
  updateStudyCell: (cellId: string, updates: Partial<USDMStudyCellEnhanced>) => void;
  getStudyCell: (studyDesignId: string, armId: string, epochId: string) => USDMStudyCellEnhanced | undefined;
  getStudyCells: (studyDesignId: string) => USDMStudyCellEnhanced[];
  getCellsForArm: (studyDesignId: string, armId: string) => USDMStudyCellEnhanced[];
  getCellsForEpoch: (studyDesignId: string, epochId: string) => USDMStudyCellEnhanced[];
  
  // Elements
  addElementToCell: (cellId: string, element: Partial<USDMStudyElementEnhanced>) => USDMStudyElementEnhanced;
  updateElement: (elementId: string, updates: Partial<USDMStudyElementEnhanced>) => void;
  removeElementFromCell: (cellId: string, elementId: string) => void;
  
  // Transition Rules
  createTransitionRule: (rule: Partial<USDMTransitionRuleEnhanced>) => USDMTransitionRuleEnhanced;
  updateTransitionRule: (ruleId: string, updates: Partial<USDMTransitionRuleEnhanced>) => void;
  
  // Matrix Operations
  getDesignMatrix: (studyDesignId: string) => DesignMatrixView;
  generateCellsForDesign: (studyDesignId: string) => void;
  
  // Selection
  setSelectedArm: (armId: string | null) => void;
  setSelectedEpoch: (epochId: string | null) => void;
  setSelectedCell: (cellId: string | null) => void;
  
  // Bulk Operations
  clearDesignMatrix: (studyDesignId: string) => void;
}

/**
 * View model for the design matrix
 */
export interface DesignMatrixView {
  studyDesignId: string;
  arms: USDMStudyArmEnhanced[];
  epochs: USDMStudyEpochEnhanced[];
  matrix: DesignMatrixCell[][];
  totalSubjects: number;
  totalDuration?: USDMQuantity;
}

export interface DesignMatrixCell {
  cell: USDMStudyCellEnhanced | null;
  armId: string;
  epochId: string;
  armIndex: number;
  epochIndex: number;
  hasElements: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a StudyArm with defaults
 */
export const createStudyArmEnhanced = (
  name: string,
  type: USDMStudyArmType,
  displayOrder: number,
  options: Partial<USDMStudyArmEnhanced> = {}
): USDMStudyArmEnhanced => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('arm'),
    instanceType: 'StudyArm',
    studyArmName: name,
    studyArmType: type,
    displayOrder,
    studyArmDescription: options.studyArmDescription,
    studyArmOriginType: options.studyArmOriginType,
    studyArmDataOriginType: options.studyArmDataOriginType || 'Collected',
    studyArmDataOriginDescription: options.studyArmDataOriginDescription,
    plannedSubjectNumber: options.plannedSubjectNumber,
    randomizationRatio: options.randomizationRatio,
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a StudyEpoch with defaults
 */
export const createStudyEpochEnhanced = (
  name: string,
  type: USDMStudyEpochType,
  sequenceNumber: number,
  options: Partial<USDMStudyEpochEnhanced> = {}
): USDMStudyEpochEnhanced => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('epoch'),
    instanceType: 'StudyEpoch',
    studyEpochName: name,
    studyEpochType: type,
    sequenceNumber,
    studyEpochDescription: options.studyEpochDescription,
    previousStudyEpochId: options.previousStudyEpochId,
    nextStudyEpochId: options.nextStudyEpochId,
    plannedDuration: options.plannedDuration,
    minimumDuration: options.minimumDuration,
    maximumDuration: options.maximumDuration,
    allowsEarlyTermination: options.allowsEarlyTermination ?? true,
    entryCriteriaDescription: options.entryCriteriaDescription,
    exitCriteriaDescription: options.exitCriteriaDescription,
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a StudyCell with defaults
 */
export const createStudyCellEnhanced = (
  armId: string,
  epochId: string,
  options: Partial<USDMStudyCellEnhanced> = {}
): USDMStudyCellEnhanced => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('cell'),
    instanceType: 'StudyCell',
    studyArmId: armId,
    studyEpochId: epochId,
    studyElements: options.studyElements || [],
    isActive: options.isActive ?? true,
    cellDescription: options.cellDescription,
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a StudyElement with defaults
 */
export const createStudyElementEnhanced = (
  name: string,
  options: Partial<USDMStudyElementEnhanced> = {}
): USDMStudyElementEnhanced => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('elem'),
    instanceType: 'StudyElement',
    studyElementName: name,
    studyElementDescription: options.studyElementDescription,
    transitionStartRule: options.transitionStartRule,
    transitionEndRule: options.transitionEndRule,
    plannedDuration: options.plannedDuration,
    studyInterventionIds: options.studyInterventionIds || [],
    activityIds: options.activityIds || [],
    isOptional: options.isOptional ?? false,
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a TransitionRule with defaults
 */
export const createTransitionRuleEnhanced = (
  description: string,
  ruleType: USDMTransitionRuleType,
  options: Partial<USDMTransitionRuleEnhanced> = {}
): USDMTransitionRuleEnhanced => {
  return {
    id: options.id || generateUSDMId('rule'),
    instanceType: 'TransitionRule',
    transitionRuleDescription: description,
    ruleType,
    criteriaIds: options.criteriaIds || [],
    timeCondition: options.timeCondition,
    eventCondition: options.eventCondition,
    conditionOperator: options.conditionOperator || 'AND',
  };
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a StudyArm
 */
export const validateStudyArm = (arm: USDMStudyArmEnhanced): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!arm.studyArmName || arm.studyArmName.trim().length === 0) {
    errors.push('Arm name is required');
  }
  if (!arm.studyArmType) {
    errors.push('Arm type is required');
  }
  if (arm.displayOrder < 0) {
    errors.push('Display order must be non-negative');
  }
  if (arm.plannedSubjectNumber !== undefined && arm.plannedSubjectNumber < 0) {
    errors.push('Planned subject number must be non-negative');
  }
  if (!arm.studyArmDescription) {
    warnings.push('Arm description is recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a StudyEpoch
 */
export const validateStudyEpoch = (epoch: USDMStudyEpochEnhanced): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!epoch.studyEpochName || epoch.studyEpochName.trim().length === 0) {
    errors.push('Epoch name is required');
  }
  if (!epoch.studyEpochType) {
    errors.push('Epoch type is required');
  }
  if (epoch.sequenceNumber < 0) {
    errors.push('Sequence number must be non-negative');
  }
  if (!epoch.studyEpochDescription) {
    warnings.push('Epoch description is recommended');
  }
  if (!epoch.plannedDuration) {
    warnings.push('Planned duration should be specified');
  }
  if (epoch.minimumDuration && epoch.maximumDuration) {
    if (epoch.minimumDuration.value > epoch.maximumDuration.value) {
      errors.push('Minimum duration cannot exceed maximum duration');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a StudyCell
 */
export const validateStudyCell = (cell: USDMStudyCellEnhanced): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!cell.studyArmId) {
    errors.push('Arm reference is required');
  }
  if (!cell.studyEpochId) {
    errors.push('Epoch reference is required');
  }
  if (cell.isActive && cell.studyElements.length === 0) {
    warnings.push('Active cell has no study elements');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a StudyElement
 */
export const validateStudyElement = (element: USDMStudyElementEnhanced): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!element.studyElementName || element.studyElementName.trim().length === 0) {
    errors.push('Element name is required');
  }
  if (!element.studyElementDescription) {
    warnings.push('Element description is recommended');
  }
  if (element.studyInterventionIds.length === 0 && element.activityIds.length === 0) {
    warnings.push('Element has no interventions or activities');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate entire design matrix
 */
export const validateDesignMatrix = (
  arms: USDMStudyArmEnhanced[],
  epochs: USDMStudyEpochEnhanced[],
  cells: USDMStudyCellEnhanced[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for minimum structure
  if (arms.length === 0) {
    errors.push('At least one study arm is required');
  }
  if (epochs.length === 0) {
    errors.push('At least one study epoch is required');
  }
  
  // Check epoch sequence continuity
  const sortedEpochs = [...epochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  for (let i = 0; i < sortedEpochs.length - 1; i++) {
    if (sortedEpochs[i].nextStudyEpochId !== sortedEpochs[i + 1].id) {
      warnings.push(`Epoch sequence linkage may be inconsistent at ${sortedEpochs[i].studyEpochName}`);
    }
  }
  
  // Check for expected cells
  const expectedCellCount = arms.length * epochs.length;
  if (cells.length < expectedCellCount) {
    warnings.push(`Design matrix has ${cells.length} cells, expected ${expectedCellCount}`);
  }
  
  // Validate individual components
  arms.forEach((arm) => {
    const result = validateStudyArm(arm);
    errors.push(...result.errors.map((e) => `Arm "${arm.studyArmName}": ${e}`));
    warnings.push(...result.warnings.map((w) => `Arm "${arm.studyArmName}": ${w}`));
  });
  
  epochs.forEach((epoch) => {
    const result = validateStudyEpoch(epoch);
    errors.push(...result.errors.map((e) => `Epoch "${epoch.studyEpochName}": ${e}`));
    warnings.push(...result.warnings.map((w) => `Epoch "${epoch.studyEpochName}": ${w}`));
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// DURATION HELPERS
// ============================================================================

/**
 * Calculate total study duration from epochs
 */
export const calculateTotalDuration = (epochs: USDMStudyEpochEnhanced[]): USDMQuantity | undefined => {
  const sortedEpochs = [...epochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  
  let totalDays = 0;
  let hasUnknown = false;
  
  for (const epoch of sortedEpochs) {
    if (epoch.plannedDuration) {
      // Convert to days for summation
      const days = convertToDays(epoch.plannedDuration);
      if (days !== undefined) {
        totalDays += days;
      } else {
        hasUnknown = true;
      }
    } else {
      hasUnknown = true;
    }
  }
  
  if (hasUnknown) {
    return undefined;
  }
  
  // Convert back to appropriate unit
  // Use sensible thresholds: years >= 365, months >= 90, weeks >= 7
  if (totalDays >= 365) {
    return { value: Math.round(totalDays / 365 * 10) / 10, unit: 'years' };
  } else if (totalDays >= 90) {
    return { value: Math.round(totalDays / 30 * 10) / 10, unit: 'months' };
  } else if (totalDays >= 7) {
    return { value: Math.round(totalDays / 7 * 10) / 10, unit: 'weeks' };
  }
  return { value: totalDays, unit: 'days' };
};

/**
 * Convert a quantity to days
 */
const convertToDays = (quantity: USDMQuantity): number | undefined => {
  const unitLower = quantity.unit.toLowerCase();
  switch (unitLower) {
    case 'days':
    case 'day':
    case 'd':
      return quantity.value;
    case 'weeks':
    case 'week':
    case 'w':
      return quantity.value * 7;
    case 'months':
    case 'month':
    case 'mo':
      return quantity.value * 30;
    case 'years':
    case 'year':
    case 'y':
      return quantity.value * 365;
    default:
      return undefined;
  }
};
