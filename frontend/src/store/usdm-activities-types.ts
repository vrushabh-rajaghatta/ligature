
// ============================================================================
// USDM Activities & Encounters Types v0.9.9c - Schedule of Activities
// TransCelerate/CDISC DDF Reference v3.0 Compliant
// ============================================================================

import { USDMCode, USDMQuantity, USDMComment } from './usdmTypes';
import { generateUSDMId, ValidationResult } from './usdm-core-types';

// ============================================================================
// ACTIVITY (USDM 3.0 First-Class Entity)
// ============================================================================

/**
 * Activity - A general description of an action or task to be performed
 * as part of a clinical study, not tied to a specific timepoint
 */
export interface USDMActivity {
  id: string;
  instanceType: 'Activity';
  
  /** Unique name for the activity */
  activityName: string;
  
  /** Description of the activity */
  activityDescription?: string;
  
  /** Activity category/type */
  activityType: USDMActivityType;
  
  /** Whether this activity is performed on all subjects */
  activityIsConditional: boolean;
  
  /** Condition under which this activity is performed (if conditional) */
  activityCondition?: string;
  
  /** Reference to procedures that comprise this activity */
  procedureIds: string[];
  
  /** Reference to biomedical concepts being assessed */
  biomedicalConceptIds: string[];
  
  /** Data collection requirements */
  dataCollectionDescription?: string;
  
  /** Typical duration */
  typicalDuration?: USDMQuantity;
  
  /** Whether this can be performed remotely */
  canBePerformedRemotely: boolean;
  
  /** Special instructions */
  instructions?: string;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Display order */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Activity Types per CDISC / Protocol SoA Categories
 */
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
  | 'Other';              // Other activity type

export const ACTIVITY_TYPE_CODES: Record<USDMActivityType, USDMCode> = {
  Assessment: {
    code: 'C25217',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Assessment',
  },
  Procedure: {
    code: 'C25218',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Procedure',
  },
  Administration: {
    code: 'C25409',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Administration',
  },
  Safety: {
    code: 'C25165',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Safety Assessment',
  },
  Laboratory: {
    code: 'C25294',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Laboratory Test',
  },
  Imaging: {
    code: 'C17369',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Imaging',
  },
  Questionnaire: {
    code: 'C17048',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Questionnaire',
  },
  PhysicalExam: {
    code: 'C20989',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Physical Examination',
  },
  Consent: {
    code: 'C16735',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Informed Consent',
  },
  DataCollection: {
    code: 'C15783',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Data Collection',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

// ============================================================================
// PROCEDURE (Clinical Procedure Component)
// ============================================================================

/**
 * Procedure - A specific clinical procedure that may be part of one or more activities
 */
export interface USDMProcedure {
  id: string;
  instanceType: 'Procedure';
  
  /** Procedure code from standard terminology */
  procedureCode?: USDMCode;
  
  /** Unique name for the procedure */
  procedureName: string;
  
  /** Description of the procedure */
  procedureDescription?: string;
  
  /** Procedure category */
  procedureType: USDMProcedureType;
  
  /** Whether this procedure is invasive */
  isInvasive: boolean;
  
  /** Typical duration */
  typicalDuration?: USDMQuantity;
  
  /** Specimen type (if applicable) */
  specimenType?: string;
  
  /** Volume/quantity (if applicable) */
  specimenQuantity?: USDMQuantity;
  
  /** Required equipment or resources */
  requiredResources?: string[];
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Procedure Types
 */
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
  | 'Other';              // Other procedure

export const PROCEDURE_TYPE_CODES: Record<USDMProcedureType, USDMCode> = {
  BloodDraw: {
    code: 'C28221',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Blood Draw',
  },
  Biopsy: {
    code: 'C15189',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Biopsy',
  },
  Imaging: {
    code: 'C17369',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Imaging Procedure',
  },
  ECG: {
    code: 'C38033',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Electrocardiogram',
  },
  VitalSigns: {
    code: 'C25428',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Vital Signs',
  },
  PhysicalExam: {
    code: 'C20989',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Physical Examination',
  },
  Interview: {
    code: 'C16751',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Clinical Interview',
  },
  Questionnaire: {
    code: 'C17048',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Questionnaire Administration',
  },
  DrugAdministration: {
    code: 'C25409',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Drug Administration',
  },
  Injection: {
    code: 'C28161',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Injection',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

// ============================================================================
// ENCOUNTER (Visit/Timepoint Definition)
// ============================================================================

/**
 * Encounter - A defined point in time (visit) at which study activities are performed
 * This is the column header in the Schedule of Activities
 */
export interface USDMEncounter {
  id: string;
  instanceType: 'Encounter';
  
  /** Unique name for the encounter (e.g., "Screening Visit", "Week 4") */
  encounterName: string;
  
  /** Description of the encounter */
  encounterDescription?: string;
  
  /** Type of encounter */
  encounterType: USDMEncounterType;
  
  /** Reference to the epoch this encounter belongs to */
  epochId: string;
  
  /** Sequence number within the study */
  encounterSequence: number;
  
  /** Scheduled timing (relative to reference point) */
  scheduledTiming?: USDMScheduledTiming;
  
  /** Window before scheduled time (negative tolerance) */
  windowBefore?: USDMQuantity;
  
  /** Window after scheduled time (positive tolerance) */
  windowAfter?: USDMQuantity;
  
  /** Whether this encounter is required or optional */
  isRequired: boolean;
  
  /** Contact mode (in-person, phone, video, etc.) */
  contactMode: USDMContactMode;
  
  /** Transition rule for when this encounter occurs */
  transitionRule?: string;
  
  /** Reference to previous encounter (linked list) */
  previousEncounterId?: string;
  
  /** Reference to next encounter (linked list) */
  nextEncounterId?: string;
  
  /** Environment requirements (clinic, home, etc.) */
  environmentType?: USDMEnvironmentType;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Encounter Types
 */
export type USDMEncounterType = 
  | 'ScheduledVisit'      // Regular scheduled visit
  | 'UnscheduledVisit'    // Unscheduled/ad-hoc visit
  | 'PhoneContact'        // Phone call
  | 'RemoteVisit'         // Telemedicine/video
  | 'HomeVisit'           // Home nursing visit
  | 'Hospitalization'     // Inpatient stay
  | 'EarlyTermination'    // Early discontinuation visit
  | 'FollowUp'            // Follow-up contact
  | 'Other';              // Other encounter type

export const ENCOUNTER_TYPE_CODES: Record<USDMEncounterType, USDMCode> = {
  ScheduledVisit: {
    code: 'C49647',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Scheduled Visit',
  },
  UnscheduledVisit: {
    code: 'C99910x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Unscheduled Visit',
  },
  PhoneContact: {
    code: 'C99910x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Telephone Contact',
  },
  RemoteVisit: {
    code: 'C99910x3',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Remote/Virtual Visit',
  },
  HomeVisit: {
    code: 'C99910x4',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Home Visit',
  },
  Hospitalization: {
    code: 'C15701',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Hospitalization',
  },
  EarlyTermination: {
    code: 'C99910x5',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Early Termination Visit',
  },
  FollowUp: {
    code: 'C62637',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Follow-Up',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

/**
 * Contact Mode - How the encounter is conducted
 */
export type USDMContactMode = 
  | 'InPerson'            // Face-to-face at site
  | 'Phone'               // Telephone
  | 'Video'               // Video conferencing
  | 'Email'               // Email communication
  | 'App'                 // Mobile app/ePRO
  | 'Device'              // Remote monitoring device
  | 'Multiple';           // Multiple modes allowed

export const CONTACT_MODE_CODES: Record<USDMContactMode, USDMCode> = {
  InPerson: {
    code: 'C99911x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'In-Person',
  },
  Phone: {
    code: 'C99911x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Telephone',
  },
  Video: {
    code: 'C99911x3',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Video Conference',
  },
  Email: {
    code: 'C99911x4',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Email',
  },
  App: {
    code: 'C99911x5',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Mobile Application',
  },
  Device: {
    code: 'C99911x6',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Remote Device',
  },
  Multiple: {
    code: 'C99911x7',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Multiple Modes',
  },
};

/**
 * Environment Type - Where the encounter takes place
 */
export type USDMEnvironmentType = 
  | 'Clinic'              // Clinical site
  | 'Hospital'            // Hospital setting
  | 'Home'                // Patient's home
  | 'Laboratory'          // Lab facility
  | 'ImagingCenter'       // Imaging facility
  | 'Remote'              // Remote/virtual
  | 'Other';              // Other location

export const ENVIRONMENT_TYPE_CODES: Record<USDMEnvironmentType, USDMCode> = {
  Clinic: {
    code: 'C51282',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Clinic',
  },
  Hospital: {
    code: 'C16696',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Hospital',
  },
  Home: {
    code: 'C43234',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Home',
  },
  Laboratory: {
    code: 'C16808',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Laboratory',
  },
  ImagingCenter: {
    code: 'C99912x1',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Imaging Center',
  },
  Remote: {
    code: 'C99912x2',
    codeSystem: 'http://www.cdisc.org',
    decode: 'Remote',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

/**
 * Scheduled Timing - When the encounter is scheduled relative to a reference
 */
export interface USDMScheduledTiming {
  /** Reference point (e.g., "Randomization", "First Dose", "Day 1") */
  referencePoint: string;
  
  /** Timing value (can be negative for before reference) */
  value: number;
  
  /** Unit of time */
  unit: 'days' | 'weeks' | 'months' | 'years';
  
  /** Type of timing reference */
  referenceType: USDMTimingReferenceType;
}

export type USDMTimingReferenceType = 
  | 'StudyStart'          // Relative to study start
  | 'EpochStart'          // Relative to epoch start
  | 'FirstDose'           // Relative to first dose
  | 'LastDose'            // Relative to last dose
  | 'Randomization'       // Relative to randomization
  | 'Event'               // Relative to an event
  | 'PreviousEncounter';  // Relative to previous encounter

// ============================================================================
// SCHEDULED ACTIVITY INSTANCE (SoA Cell - Activity × Encounter)
// ============================================================================

/**
 * ScheduledActivityInstance - The intersection of an Activity and Encounter
 * This represents a single cell in the Schedule of Activities matrix
 */
export interface USDMScheduledActivityInstance {
  id: string;
  instanceType: 'ScheduledActivityInstance';
  
  /** Reference to the activity */
  activityId: string;
  
  /** Reference to the encounter (visit) */
  encounterId: string;
  
  /** Whether this activity is required at this encounter */
  isRequired: boolean;
  
  /** Whether this activity is conditional at this encounter */
  isConditional: boolean;
  
  /** Condition for performing the activity at this encounter */
  condition?: string;
  
  /** Specific timing within the encounter window */
  timingDescription?: string;
  
  /** Override duration for this specific instance */
  overrideDuration?: USDMQuantity;
  
  /** Arms this instance applies to (empty = all arms) */
  applicableArmIds: string[];
  
  /** Special instructions for this instance */
  specialInstructions?: string;
  
  /** Footnote reference(s) for SoA display */
  footnoteIds: string[];
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FOOTNOTE (SoA Footnotes)
// ============================================================================

/**
 * Footnote - Explanatory note for the Schedule of Activities
 */
export interface USDMSoAFootnote {
  id: string;
  instanceType: 'SoAFootnote';
  
  /** Footnote symbol or number */
  symbol: string;
  
  /** Footnote text */
  text: string;
  
  /** Display order */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// STATE & ACTIONS INTERFACES
// ============================================================================

/**
 * State for Activities & Encounters Store
 */
export interface USDMActivitiesState {
  /** Activities indexed by study ID */
  activitiesByStudyId: Record<string, USDMActivity[]>;
  
  /** Procedures indexed by study ID */
  proceduresByStudyId: Record<string, USDMProcedure[]>;
  
  /** Encounters indexed by study ID */
  encountersByStudyId: Record<string, USDMEncounter[]>;
  
  /** Scheduled activity instances indexed by study ID */
  scheduledInstancesByStudyId: Record<string, USDMScheduledActivityInstance[]>;
  
  /** Footnotes indexed by study ID */
  footnotesByStudyId: Record<string, USDMSoAFootnote[]>;
  
  /** Selection state */
  selectedActivityId: string | null;
  selectedEncounterId: string | null;
  selectedInstanceId: string | null;
}

/**
 * Actions for Activities & Encounters Store
 */
export interface USDMActivitiesActions {
  // Activities
  addActivity: (studyId: string, activity: Partial<USDMActivity>) => USDMActivity;
  updateActivity: (activityId: string, updates: Partial<USDMActivity>) => void;
  removeActivity: (activityId: string) => void;
  reorderActivities: (studyId: string, activityIds: string[]) => void;
  getActivities: (studyId: string) => USDMActivity[];
  getActivityById: (activityId: string) => USDMActivity | undefined;
  
  // Procedures
  addProcedure: (studyId: string, procedure: Partial<USDMProcedure>) => USDMProcedure;
  updateProcedure: (procedureId: string, updates: Partial<USDMProcedure>) => void;
  removeProcedure: (procedureId: string) => void;
  getProcedures: (studyId: string) => USDMProcedure[];
  getProcedureById: (procedureId: string) => USDMProcedure | undefined;
  
  // Encounters
  addEncounter: (studyId: string, encounter: Partial<USDMEncounter>) => USDMEncounter;
  updateEncounter: (encounterId: string, updates: Partial<USDMEncounter>) => void;
  removeEncounter: (encounterId: string) => void;
  reorderEncounters: (studyId: string, encounterIds: string[]) => void;
  getEncounters: (studyId: string) => USDMEncounter[];
  getEncounterById: (encounterId: string) => USDMEncounter | undefined;
  getEncountersByEpoch: (studyId: string, epochId: string) => USDMEncounter[];
  
  // Scheduled Instances
  scheduleActivity: (studyId: string, activityId: string, encounterId: string, options?: Partial<USDMScheduledActivityInstance>) => USDMScheduledActivityInstance;
  updateScheduledInstance: (instanceId: string, updates: Partial<USDMScheduledActivityInstance>) => void;
  unscheduleActivity: (instanceId: string) => void;
  getScheduledInstances: (studyId: string) => USDMScheduledActivityInstance[];
  getInstanceByActivityAndEncounter: (studyId: string, activityId: string, encounterId: string) => USDMScheduledActivityInstance | undefined;
  getInstancesByActivity: (studyId: string, activityId: string) => USDMScheduledActivityInstance[];
  getInstancesByEncounter: (studyId: string, encounterId: string) => USDMScheduledActivityInstance[];
  
  // Footnotes
  addFootnote: (studyId: string, footnote: Partial<USDMSoAFootnote>) => USDMSoAFootnote;
  updateFootnote: (footnoteId: string, updates: Partial<USDMSoAFootnote>) => void;
  removeFootnote: (footnoteId: string) => void;
  getFootnotes: (studyId: string) => USDMSoAFootnote[];
  
  // Schedule of Activities Matrix View
  getScheduleOfActivities: (studyId: string) => ScheduleOfActivitiesView;
  
  // Selection
  selectActivity: (activityId: string | null) => void;
  selectEncounter: (encounterId: string | null) => void;
  selectInstance: (instanceId: string | null) => void;
  
  // Bulk Operations
  bulkScheduleActivity: (studyId: string, activityId: string, encounterIds: string[], options?: Partial<USDMScheduledActivityInstance>) => USDMScheduledActivityInstance[];
  bulkUnscheduleActivity: (studyId: string, activityId: string) => void;
  copyEncounterSchedule: (studyId: string, sourceEncounterId: string, targetEncounterId: string) => void;
}

// ============================================================================
// VIEW MODELS
// ============================================================================

/**
 * Schedule of Activities Matrix View
 */
export interface ScheduleOfActivitiesView {
  studyId: string;
  
  /** Activities (rows) */
  activities: USDMActivity[];
  
  /** Encounters (columns) */
  encounters: USDMEncounter[];
  
  /** Matrix cells [activityIndex][encounterIndex] */
  matrix: SoACell[][];
  
  /** Footnotes */
  footnotes: USDMSoAFootnote[];
  
  /** Summary statistics */
  totalActivities: number;
  totalEncounters: number;
  totalScheduledInstances: number;
  requiredInstanceCount: number;
  conditionalInstanceCount: number;
}

/**
 * SoA Cell - Single cell in the matrix
 */
export interface SoACell {
  /** The scheduled instance (if activity is scheduled at this encounter) */
  instance: USDMScheduledActivityInstance | null;
  
  /** Activity reference */
  activityId: string;
  
  /** Encounter reference */
  encounterId: string;
  
  /** Position indices */
  activityIndex: number;
  encounterIndex: number;
  
  /** Whether there's a scheduled activity */
  isScheduled: boolean;
  
  /** Whether the scheduled activity is required */
  isRequired: boolean;
  
  /** Whether the scheduled activity is conditional */
  isConditional: boolean;
  
  /** Display symbol for the cell */
  displaySymbol: 'X' | 'O' | 'C' | '-';
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an Activity with defaults
 */
export const createActivity = (
  name: string,
  type: USDMActivityType,
  displayOrder: number,
  options: Partial<USDMActivity> = {}
): USDMActivity => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('act'),
    instanceType: 'Activity',
    activityName: name,
    activityDescription: options.activityDescription,
    activityType: type,
    activityIsConditional: options.activityIsConditional ?? false,
    activityCondition: options.activityCondition,
    procedureIds: options.procedureIds || [],
    biomedicalConceptIds: options.biomedicalConceptIds || [],
    dataCollectionDescription: options.dataCollectionDescription,
    typicalDuration: options.typicalDuration,
    canBePerformedRemotely: options.canBePerformedRemotely ?? false,
    instructions: options.instructions,
    notes: options.notes || [],
    displayOrder,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a Procedure with defaults
 */
export const createProcedure = (
  name: string,
  type: USDMProcedureType,
  options: Partial<USDMProcedure> = {}
): USDMProcedure => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('proc'),
    instanceType: 'Procedure',
    procedureCode: options.procedureCode,
    procedureName: name,
    procedureDescription: options.procedureDescription,
    procedureType: type,
    isInvasive: options.isInvasive ?? false,
    typicalDuration: options.typicalDuration,
    specimenType: options.specimenType,
    specimenQuantity: options.specimenQuantity,
    requiredResources: options.requiredResources || [],
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create an Encounter with defaults
 */
export const createEncounter = (
  name: string,
  type: USDMEncounterType,
  epochId: string,
  sequence: number,
  options: Partial<USDMEncounter> = {}
): USDMEncounter => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('enc'),
    instanceType: 'Encounter',
    encounterName: name,
    encounterDescription: options.encounterDescription,
    encounterType: type,
    epochId,
    encounterSequence: sequence,
    scheduledTiming: options.scheduledTiming,
    windowBefore: options.windowBefore,
    windowAfter: options.windowAfter,
    isRequired: options.isRequired ?? true,
    contactMode: options.contactMode || 'InPerson',
    transitionRule: options.transitionRule,
    previousEncounterId: options.previousEncounterId,
    nextEncounterId: options.nextEncounterId,
    environmentType: options.environmentType || 'Clinic',
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a ScheduledActivityInstance with defaults
 */
export const createScheduledActivityInstance = (
  activityId: string,
  encounterId: string,
  options: Partial<USDMScheduledActivityInstance> = {}
): USDMScheduledActivityInstance => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('sai'),
    instanceType: 'ScheduledActivityInstance',
    activityId,
    encounterId,
    isRequired: options.isRequired ?? true,
    isConditional: options.isConditional ?? false,
    condition: options.condition,
    timingDescription: options.timingDescription,
    overrideDuration: options.overrideDuration,
    applicableArmIds: options.applicableArmIds || [],
    specialInstructions: options.specialInstructions,
    footnoteIds: options.footnoteIds || [],
    notes: options.notes || [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a SoA Footnote with defaults
 */
export const createSoAFootnote = (
  symbol: string,
  text: string,
  displayOrder: number,
  options: Partial<USDMSoAFootnote> = {}
): USDMSoAFootnote => {
  const now = new Date().toISOString();
  return {
    id: options.id || generateUSDMId('fn'),
    instanceType: 'SoAFootnote',
    symbol,
    text,
    displayOrder,
    createdAt: now,
    updatedAt: now,
  };
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate an Activity
 */
export const validateActivity = (activity: USDMActivity): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!activity.activityName || activity.activityName.trim().length === 0) {
    errors.push('Activity name is required');
  }
  if (!activity.activityType) {
    errors.push('Activity type is required');
  }
  if (activity.displayOrder < 0) {
    errors.push('Display order must be non-negative');
  }
  if (activity.activityIsConditional && !activity.activityCondition) {
    warnings.push('Conditional activity should have a condition specified');
  }
  if (!activity.activityDescription) {
    warnings.push('Activity description is recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a Procedure
 */
export const validateProcedure = (procedure: USDMProcedure): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!procedure.procedureName || procedure.procedureName.trim().length === 0) {
    errors.push('Procedure name is required');
  }
  if (!procedure.procedureType) {
    errors.push('Procedure type is required');
  }
  if (!procedure.procedureDescription) {
    warnings.push('Procedure description is recommended');
  }
  if (procedure.isInvasive && !procedure.procedureCode) {
    warnings.push('Invasive procedures should have a procedure code');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate an Encounter
 */
export const validateEncounter = (encounter: USDMEncounter): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!encounter.encounterName || encounter.encounterName.trim().length === 0) {
    errors.push('Encounter name is required');
  }
  if (!encounter.encounterType) {
    errors.push('Encounter type is required');
  }
  if (!encounter.epochId) {
    errors.push('Epoch reference is required');
  }
  if (encounter.encounterSequence < 0) {
    errors.push('Encounter sequence must be non-negative');
  }
  if (!encounter.encounterDescription) {
    warnings.push('Encounter description is recommended');
  }
  if (encounter.isRequired && !encounter.scheduledTiming) {
    warnings.push('Required encounters should have scheduled timing');
  }
  if (encounter.windowBefore && encounter.windowAfter) {
    if (encounter.windowBefore.value < 0 || encounter.windowAfter.value < 0) {
      warnings.push('Window values should be non-negative');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a ScheduledActivityInstance
 */
export const validateScheduledActivityInstance = (instance: USDMScheduledActivityInstance): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!instance.activityId) {
    errors.push('Activity reference is required');
  }
  if (!instance.encounterId) {
    errors.push('Encounter reference is required');
  }
  if (instance.isConditional && !instance.condition) {
    warnings.push('Conditional instances should have a condition specified');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate the entire Schedule of Activities
 */
export const validateScheduleOfActivities = (
  activities: USDMActivity[],
  encounters: USDMEncounter[],
  instances: USDMScheduledActivityInstance[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for minimum structure
  if (activities.length === 0) {
    errors.push('At least one activity is required');
  }
  if (encounters.length === 0) {
    errors.push('At least one encounter is required');
  }
  
  // Check encounter sequence continuity
  const sortedEncounters = [...encounters].sort((a, b) => a.encounterSequence - b.encounterSequence);
  for (let i = 0; i < sortedEncounters.length - 1; i++) {
    if (sortedEncounters[i].nextEncounterId !== sortedEncounters[i + 1].id) {
      warnings.push(`Encounter sequence linkage may be inconsistent at ${sortedEncounters[i].encounterName}`);
    }
  }
  
  // Check for orphaned instances
  const activityIds = new Set(activities.map((a) => a.id));
  const encounterIds = new Set(encounters.map((e) => e.id));
  
  instances.forEach((inst) => {
    if (!activityIds.has(inst.activityId)) {
      errors.push(`Scheduled instance ${inst.id} references non-existent activity`);
    }
    if (!encounterIds.has(inst.encounterId)) {
      errors.push(`Scheduled instance ${inst.id} references non-existent encounter`);
    }
  });
  
  // Validate individual components
  activities.forEach((activity) => {
    const result = validateActivity(activity);
    errors.push(...result.errors.map((e) => `Activity "${activity.activityName}": ${e}`));
    warnings.push(...result.warnings.map((w) => `Activity "${activity.activityName}": ${w}`));
  });
  
  encounters.forEach((encounter) => {
    const result = validateEncounter(encounter);
    errors.push(...result.errors.map((e) => `Encounter "${encounter.encounterName}": ${e}`));
    warnings.push(...result.warnings.map((w) => `Encounter "${encounter.encounterName}": ${w}`));
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get display symbol for a SoA cell
 */
export const getSoACellSymbol = (instance: USDMScheduledActivityInstance | null): 'X' | 'O' | 'C' | '-' => {
  if (!instance) return '-';
  if (instance.isConditional) return 'C';
  if (instance.isRequired) return 'X';
  return 'O'; // Optional
};

/**
 * Get display label for activity type
 */
export const getActivityTypeLabel = (type: USDMActivityType): string => {
  return ACTIVITY_TYPE_CODES[type]?.decode || type;
};

/**
 * Get display label for encounter type
 */
export const getEncounterTypeLabel = (type: USDMEncounterType): string => {
  return ENCOUNTER_TYPE_CODES[type]?.decode || type;
};

/**
 * Get display label for contact mode
 */
export const getContactModeLabel = (mode: USDMContactMode): string => {
  return CONTACT_MODE_CODES[mode]?.decode || mode;
};

/**
 * Format scheduled timing for display
 */
export const formatScheduledTiming = (timing: USDMScheduledTiming): string => {
  const sign = timing.value >= 0 ? '+' : '';
  return `${timing.referencePoint} ${sign}${timing.value} ${timing.unit}`;
};

/**
 * Format visit window for display
 */
export const formatVisitWindow = (before?: USDMQuantity, after?: USDMQuantity): string => {
  if (!before && !after) return 'No window';
  const beforeStr = before ? `-${before.value} ${before.unit}` : '';
  const afterStr = after ? `+${after.value} ${after.unit}` : '';
  return `${beforeStr} / ${afterStr}`.trim();
};
