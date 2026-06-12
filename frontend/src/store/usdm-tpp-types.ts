
// ============================================================================
// USDM TPP Types v0.9.9f - Target Product Profile, Claims & Strategy
// Strategic context layer linking commercial goals to clinical design
// ============================================================================

import { USDMCode, USDMComment } from './usdmTypes';
import { generateUSDMId, ValidationResult } from './usdm-core-types';

// ============================================================================
// TARGET PRODUCT PROFILE (TPP) - Root Entity
// ============================================================================

/**
 * TargetProductProfile - Defines the ideal label claims the study aims to achieve
 * Links strategic goals to clinical trial design decisions
 */
export interface USDMTargetProductProfile {
  id: string;
  instanceType: 'TargetProductProfile';
  
  /** Reference to the study */
  studyId: string;
  
  /** TPP name (e.g., "LIG-2847 Phase 3 NSCLC TPP") */
  name: string;
  
  /** Version (TPPs evolve through development) */
  version: string;
  
  /** TPP status */
  status: TPPStatus;
  
  /** Target indication(s) */
  targetIndications: TargetIndication[];
  
  /** Strategic positioning statement */
  positioningStatement: string;
  
  /** Therapeutic area */
  therapeuticArea: string;
  
  /** Drug class/mechanism */
  drugClass?: string;
  
  /** Target patient population summary */
  targetPopulation: string;
  
  /** References to linked claims */
  claimIds: string[];
  
  /** References to differentiation points */
  differentiationIds: string[];
  
  /** Regulatory strategy */
  regulatoryStrategy: RegulatoryStrategy;
  
  /** Commercial target */
  commercialTarget?: CommercialTarget;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Last review date */
  lastReviewDate?: string;
  
  /** Next review date */
  nextReviewDate?: string;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * TPP Status
 */
export type TPPStatus = 
  | 'Draft'
  | 'InReview'
  | 'Approved'
  | 'Active'
  | 'Superseded'
  | 'Archived';

export const TPP_STATUS_CODES: Record<TPPStatus, USDMCode> = {
  Draft: {
    code: 'TPP-DRAFT',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Draft - Under Development',
  },
  InReview: {
    code: 'TPP-REVIEW',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'In Review - Awaiting Approval',
  },
  Approved: {
    code: 'TPP-APPROVED',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Approved - Ready for Use',
  },
  Active: {
    code: 'TPP-ACTIVE',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Active - Guiding Development',
  },
  Superseded: {
    code: 'TPP-SUPERSEDED',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Superseded by New Version',
  },
  Archived: {
    code: 'TPP-ARCHIVED',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Archived',
  },
};

// ============================================================================
// TARGET INDICATION
// ============================================================================

/**
 * TargetIndication - Specific indication(s) the TPP addresses
 */
export interface TargetIndication {
  id: string;
  
  /** Indication name (e.g., "Advanced EGFR+ NSCLC") */
  name: string;
  
  /** ICD-11 or MedDRA code */
  code?: USDMCode;
  
  /** Line of therapy (1L, 2L, etc.) */
  lineOfTherapy?: LineOfTherapy;
  
  /** Priority (Primary, Secondary) */
  priority: IndicationPriority;
  
  /** Geographic scope */
  geographicScope?: string[];
  
  /** Target approval year */
  targetApprovalYear?: number;
  
  /** Notes */
  notes?: string;
}

export type LineOfTherapy = 
  | '1L'        // First line
  | '2L'        // Second line
  | '3L+'       // Third line or later
  | 'Adjuvant'  // After surgery
  | 'Neoadjuvant' // Before surgery
  | 'Maintenance'
  | 'Any';

export type IndicationPriority = 
  | 'Primary'
  | 'Secondary'
  | 'Exploratory';

export const LINE_OF_THERAPY_LABELS: Record<LineOfTherapy, string> = {
  '1L': 'First-line',
  '2L': 'Second-line',
  '3L+': 'Third-line or later',
  'Adjuvant': 'Adjuvant',
  'Neoadjuvant': 'Neoadjuvant',
  'Maintenance': 'Maintenance',
  'Any': 'Any line',
};

// ============================================================================
// TPP CLAIM
// ============================================================================

/**
 * TPPClaim - Specific label claim the TPP aims to achieve
 * Claims connect to endpoints that provide supporting evidence
 */
export interface TPPClaim {
  id: string;
  instanceType: 'TPPClaim';
  
  /** Reference to the study */
  studyId: string;
  
  /** Reference to parent TPP */
  tppId: string;
  
  /** Claim category */
  category: ClaimCategory;
  
  /** Claim type within category */
  claimType: ClaimType;
  
  /** Target claim text (ideal label language) */
  targetClaimText: string;
  
  /** Minimum acceptable claim text (floor) */
  minimumClaimText?: string;
  
  /** Current evidence status */
  evidenceStatus: EvidenceStatus;
  
  /** Priority level */
  priority: ClaimPriority;
  
  /** Evidence requirements */
  evidenceRequirements: EvidenceRequirement[];
  
  /** References to supporting endpoints (from v0.9.9e) */
  supportingEndpointIds: string[];
  
  /** References to supporting study data */
  supportingStudyIds?: string[];
  
  /** Competitive benchmark (what comparators claim) */
  competitiveBenchmark?: string;
  
  /** Regulatory acceptance likelihood */
  regulatoryLikelihood?: LikelihoodRating;
  
  /** Display order */
  displayOrder: number;
  
  /** Notes */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Claim categories (high-level grouping)
 */
export type ClaimCategory = 
  | 'Efficacy'
  | 'Safety'
  | 'Convenience'
  | 'PatientExperience'
  | 'Economic';

export const CLAIM_CATEGORY_CODES: Record<ClaimCategory, USDMCode> = {
  Efficacy: {
    code: 'CLM-EFF',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Efficacy Claim',
  },
  Safety: {
    code: 'CLM-SAF',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Safety Claim',
  },
  Convenience: {
    code: 'CLM-CONV',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Convenience Claim',
  },
  PatientExperience: {
    code: 'CLM-PRO',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Patient Experience Claim',
  },
  Economic: {
    code: 'CLM-ECON',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Economic/Value Claim',
  },
};

/**
 * Specific claim types
 */
export type ClaimType = 
  // Efficacy
  | 'SuperiorEfficacy'
  | 'NonInferiorEfficacy'
  | 'BridgingEfficacy'
  | 'DurableResponse'
  | 'DelayedProgression'
  | 'SurvivalBenefit'
  // Safety
  | 'FavorableSafetyProfile'
  | 'ReducedToxicity'
  | 'ManageableAEs'
  | 'NoNewSafetySignals'
  | 'ImprovedTolerability'
  // Convenience
  | 'OralAdministration'
  | 'ReducedDosingFrequency'
  | 'NoPremedication'
  | 'OutpatientUse'
  | 'SelfAdministration'
  // Patient Experience
  | 'ImprovedQoL'
  | 'SymptomControl'
  | 'MaintainedFunction'
  | 'ReducedHospitalization'
  // Economic
  | 'CostEffective'
  | 'ReducedHealthcareUtilization'
  | 'WorkProductivityMaintained';

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  // Efficacy
  SuperiorEfficacy: 'Superior Efficacy',
  NonInferiorEfficacy: 'Non-Inferior Efficacy',
  BridgingEfficacy: 'Bridging Efficacy Data',
  DurableResponse: 'Durable Response',
  DelayedProgression: 'Delayed Disease Progression',
  SurvivalBenefit: 'Survival Benefit',
  // Safety
  FavorableSafetyProfile: 'Favorable Safety Profile',
  ReducedToxicity: 'Reduced Toxicity',
  ManageableAEs: 'Manageable Adverse Events',
  NoNewSafetySignals: 'No New Safety Signals',
  ImprovedTolerability: 'Improved Tolerability',
  // Convenience
  OralAdministration: 'Oral Administration',
  ReducedDosingFrequency: 'Reduced Dosing Frequency',
  NoPremedication: 'No Premedication Required',
  OutpatientUse: 'Outpatient Use',
  SelfAdministration: 'Self-Administration',
  // Patient Experience
  ImprovedQoL: 'Improved Quality of Life',
  SymptomControl: 'Symptom Control',
  MaintainedFunction: 'Maintained Physical Function',
  ReducedHospitalization: 'Reduced Hospitalization',
  // Economic
  CostEffective: 'Cost-Effective',
  ReducedHealthcareUtilization: 'Reduced Healthcare Utilization',
  WorkProductivityMaintained: 'Work Productivity Maintained',
};

/**
 * Evidence status for claims
 */
export type EvidenceStatus = 
  | 'Planned'
  | 'InProgress'
  | 'DataCollected'
  | 'Analyzed'
  | 'Supportive'
  | 'NotSupportive'
  | 'Inconclusive';

export const EVIDENCE_STATUS_CODES: Record<EvidenceStatus, USDMCode> = {
  Planned: {
    code: 'EVD-PLAN',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Evidence Collection Planned',
  },
  InProgress: {
    code: 'EVD-PROG',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Evidence Collection In Progress',
  },
  DataCollected: {
    code: 'EVD-COLL',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Data Collected - Pending Analysis',
  },
  Analyzed: {
    code: 'EVD-ANLZ',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Data Analyzed',
  },
  Supportive: {
    code: 'EVD-SUPP',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Evidence Supports Claim',
  },
  NotSupportive: {
    code: 'EVD-NSUP',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Evidence Does Not Support Claim',
  },
  Inconclusive: {
    code: 'EVD-INCN',
    codeSystem: 'http://ligature.io/tpp',
    decode: 'Evidence Inconclusive',
  },
};

/**
 * Claim priority
 */
export type ClaimPriority = 
  | 'MustHave'
  | 'ShouldHave'
  | 'NiceToHave';

export const CLAIM_PRIORITY_LABELS: Record<ClaimPriority, string> = {
  MustHave: 'Must Have (Critical)',
  ShouldHave: 'Should Have (Important)',
  NiceToHave: 'Nice to Have (Desirable)',
};

/**
 * Evidence requirement for a claim
 */
export interface EvidenceRequirement {
  id: string;
  
  /** Description of what evidence is needed */
  description: string;
  
  /** Evidence type */
  evidenceType: EvidenceType;
  
  /** Whether this is mandatory or supportive */
  mandatory: boolean;
  
  /** Reference to endpoint that provides this evidence */
  endpointId?: string;
  
  /** Status */
  status: 'NotStarted' | 'InProgress' | 'Complete' | 'NotMet';
  
  /** Notes */
  notes?: string;
}

export type EvidenceType = 
  | 'PrimaryEndpoint'
  | 'SecondaryEndpoint'
  | 'SafetyData'
  | 'PRO'
  | 'Biomarker'
  | 'RealWorldEvidence'
  | 'ExternalControl'
  | 'MetaAnalysis'
  | 'ExpertOpinion';

/**
 * Likelihood rating
 */
export type LikelihoodRating = 
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Unknown';

// ============================================================================
// COMPETITIVE DIFFERENTIATION
// ============================================================================

/**
 * CompetitiveDifferentiation - How the product positions vs. alternatives
 */
export interface CompetitiveDifferentiation {
  id: string;
  instanceType: 'CompetitiveDifferentiation';
  
  /** Reference to the study */
  studyId: string;
  
  /** Reference to parent TPP */
  tppId: string;
  
  /** Competitor/comparator name */
  competitorName: string;
  
  /** Competitor drug class */
  competitorClass?: string;
  
  /** Differentiation type */
  differentiationType: DifferentiationType;
  
  /** Our advantage/differentiation statement */
  differentiationStatement: string;
  
  /** Supporting data/evidence */
  supportingEvidence?: string;
  
  /** Competitor's strength in this area */
  competitorPosition?: string;
  
  /** Clinical relevance of differentiation */
  clinicalRelevance: RelevanceRating;
  
  /** Commercial relevance of differentiation */
  commercialRelevance: RelevanceRating;
  
  /** Display order */
  displayOrder: number;
  
  /** Notes */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Types of differentiation
 */
export type DifferentiationType = 
  | 'Efficacy'
  | 'Safety'
  | 'Convenience'
  | 'MechanismOfAction'
  | 'PatientPopulation'
  | 'Pricing'
  | 'Access'
  | 'PatientExperience';

export const DIFFERENTIATION_TYPE_LABELS: Record<DifferentiationType, string> = {
  Efficacy: 'Superior Efficacy',
  Safety: 'Better Safety Profile',
  Convenience: 'More Convenient Administration',
  MechanismOfAction: 'Novel Mechanism of Action',
  PatientPopulation: 'Broader Patient Population',
  Pricing: 'Competitive Pricing',
  Access: 'Better Access/Availability',
  PatientExperience: 'Improved Patient Experience',
};

export type RelevanceRating = 
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low';

// ============================================================================
// REGULATORY STRATEGY
// ============================================================================

/**
 * RegulatoryStrategy - Regulatory pathway and designation strategy
 */
export interface RegulatoryStrategy {
  /** Primary regulatory pathway */
  primaryPathway: RegulatoryPathway;
  
  /** Target regions */
  targetRegions: TargetRegion[];
  
  /** Special designations pursued/granted */
  designations: RegulatoryDesignation[];
  
  /** Reference product (for biosimilars/generics) */
  referenceProduct?: string;
  
  /** Key regulatory assumptions */
  keyAssumptions?: string[];
  
  /** Regulatory risks */
  regulatoryRisks?: string[];
  
  /** Notes */
  notes?: string;
}

export type RegulatoryPathway = 
  | 'Standard'           // Standard approval (NDA/BLA)
  | 'Accelerated'        // FDA Accelerated Approval
  | 'Priority'           // Priority Review
  | 'Breakthrough'       // Breakthrough Therapy
  | 'FastTrack'          // Fast Track
  | 'RMAT'               // Regenerative Medicine Advanced Therapy
  | '505b2'              // 505(b)(2)
  | 'Biosimilar'
  | 'Conditional'        // EMA Conditional Approval
  | 'PRIME';             // EMA PRIME

export const REGULATORY_PATHWAY_LABELS: Record<RegulatoryPathway, string> = {
  Standard: 'Standard NDA/BLA',
  Accelerated: 'Accelerated Approval',
  Priority: 'Priority Review',
  Breakthrough: 'Breakthrough Therapy Designation',
  FastTrack: 'Fast Track',
  RMAT: 'RMAT Designation',
  '505b2': '505(b)(2) Pathway',
  Biosimilar: 'Biosimilar Pathway',
  Conditional: 'Conditional Marketing Authorization',
  PRIME: 'EMA PRIME Designation',
};

/**
 * Target regulatory region
 */
export interface TargetRegion {
  region: string;  // 'US', 'EU', 'Japan', 'China', etc.
  targetSubmissionDate?: string;
  targetApprovalDate?: string;
  pathway?: RegulatoryPathway;
  status: 'Planned' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Withdrawn';
  notes?: string;
}

/**
 * Regulatory designation
 */
export interface RegulatoryDesignation {
  designation: DesignationType;
  region: string;
  status: 'Planned' | 'Applied' | 'Granted' | 'Denied';
  grantDate?: string;
  expirationDate?: string;
  notes?: string;
}

export type DesignationType = 
  | 'BreakthroughTherapy'
  | 'FastTrack'
  | 'AcceleratedApproval'
  | 'PriorityReview'
  | 'OrphanDrug'
  | 'RarePediatric'
  | 'PRIME'
  | 'ConditionalApproval'
  | 'Sakigake'           // Japan
  | 'PIDD';              // Japan Priority Infectious Disease Drug

export const DESIGNATION_TYPE_LABELS: Record<DesignationType, string> = {
  BreakthroughTherapy: 'Breakthrough Therapy',
  FastTrack: 'Fast Track',
  AcceleratedApproval: 'Accelerated Approval',
  PriorityReview: 'Priority Review',
  OrphanDrug: 'Orphan Drug',
  RarePediatric: 'Rare Pediatric Disease',
  PRIME: 'PRIME (EMA)',
  ConditionalApproval: 'Conditional Approval (EMA)',
  Sakigake: 'Sakigake (Japan)',
  PIDD: 'Priority Infectious Disease Drug (Japan)',
};

// ============================================================================
// COMMERCIAL TARGET
// ============================================================================

/**
 * CommercialTarget - Commercial positioning and expectations
 */
export interface CommercialTarget {
  /** Target patient population size */
  targetPopulationSize?: string;
  
  /** Market size estimate */
  marketSizeEstimate?: string;
  
  /** Peak sales forecast */
  peakSalesForecast?: string;
  
  /** Key payer considerations */
  payerConsiderations?: string[];
  
  /** Target price positioning */
  pricePositioning?: 'Premium' | 'Parity' | 'Discount';
  
  /** Key commercial messages */
  keyMessages?: string[];
  
  /** Notes */
  notes?: string;
}

// ============================================================================
// STORE STATE AND ACTIONS
// ============================================================================

export interface USDMTPPState {
  /** TPPs indexed by study ID */
  tppsByStudyId: Record<string, USDMTargetProductProfile[]>;
  
  /** Claims indexed by study ID */
  claimsByStudyId: Record<string, TPPClaim[]>;
  
  /** Differentiations indexed by study ID */
  differentiationsByStudyId: Record<string, CompetitiveDifferentiation[]>;
  
  /** Selection state */
  selectedTPPId: string | null;
  selectedClaimId: string | null;
  selectedDifferentiationId: string | null;
}

export interface USDMTPPActions {
  // TPP CRUD
  addTPP: (studyId: string, tppData: Partial<USDMTargetProductProfile>) => USDMTargetProductProfile;
  updateTPP: (tppId: string, updates: Partial<USDMTargetProductProfile>) => void;
  removeTPP: (tppId: string) => void;
  
  // Claim CRUD
  addClaim: (studyId: string, tppId: string, claimData: Partial<TPPClaim>) => TPPClaim;
  updateClaim: (claimId: string, updates: Partial<TPPClaim>) => void;
  removeClaim: (claimId: string) => void;
  reorderClaims: (studyId: string, claimIds: string[]) => void;
  linkEndpointToClaim: (claimId: string, endpointId: string) => void;
  unlinkEndpointFromClaim: (claimId: string, endpointId: string) => void;
  
  // Differentiation CRUD
  addDifferentiation: (studyId: string, tppId: string, diffData: Partial<CompetitiveDifferentiation>) => CompetitiveDifferentiation;
  updateDifferentiation: (diffId: string, updates: Partial<CompetitiveDifferentiation>) => void;
  removeDifferentiation: (diffId: string) => void;
  reorderDifferentiations: (studyId: string, diffIds: string[]) => void;
  
  // Indication management
  addIndication: (tppId: string, indication: Partial<TargetIndication>) => void;
  updateIndication: (tppId: string, indicationId: string, updates: Partial<TargetIndication>) => void;
  removeIndication: (tppId: string, indicationId: string) => void;
  
  // Evidence requirement management
  addEvidenceRequirement: (claimId: string, requirement: Partial<EvidenceRequirement>) => void;
  updateEvidenceRequirement: (claimId: string, requirementId: string, updates: Partial<EvidenceRequirement>) => void;
  removeEvidenceRequirement: (claimId: string, requirementId: string) => void;
  
  // Designation management
  addDesignation: (tppId: string, designation: Partial<RegulatoryDesignation>) => void;
  updateDesignation: (tppId: string, designationIndex: number, updates: Partial<RegulatoryDesignation>) => void;
  removeDesignation: (tppId: string, designationIndex: number) => void;
  
  // Views
  getTPPView: (studyId: string) => TPPView | undefined;
  getClaimsByCategory: (studyId: string, category: ClaimCategory) => TPPClaim[];
  getClaimsByPriority: (studyId: string, priority: ClaimPriority) => TPPClaim[];
  
  // Selection
  selectTPP: (tppId: string | null) => void;
  selectClaim: (claimId: string | null) => void;
  selectDifferentiation: (diffId: string | null) => void;
  
  // Reset
  clearTPPStore: () => void;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * Complete TPP view with all related data
 */
export interface TPPView {
  studyId: string;
  tpp: USDMTargetProductProfile;
  claims: ClaimView[];
  differentiations: CompetitiveDifferentiation[];
  statistics: TPPStatistics;
}

export interface ClaimView {
  claim: TPPClaim;
  supportingEndpointCount: number;
  evidenceCompleteness: number; // 0-100%
}

export interface TPPStatistics {
  totalClaims: number;
  claimsByCategory: Record<ClaimCategory, number>;
  claimsByPriority: Record<ClaimPriority, number>;
  claimsByEvidenceStatus: Record<EvidenceStatus, number>;
  totalDifferentiations: number;
  designationsCount: number;
  targetRegionsCount: number;
  evidenceCompleteness: number; // Overall evidence completeness
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new TPP
 */
export function createTPP(
  studyId: string,
  name: string,
  therapeuticArea: string,
  positioningStatement: string,
  targetPopulation: string,
  overrides?: Partial<USDMTargetProductProfile>
): USDMTargetProductProfile {
  const now = new Date().toISOString();
  return {
    id: overrides?.id || generateUSDMId('tpp'),
    instanceType: 'TargetProductProfile',
    studyId,
    name,
    version: overrides?.version || '1.0',
    status: overrides?.status || 'Draft',
    targetIndications: overrides?.targetIndications || [],
    positioningStatement,
    therapeuticArea,
    drugClass: overrides?.drugClass,
    targetPopulation,
    claimIds: overrides?.claimIds || [],
    differentiationIds: overrides?.differentiationIds || [],
    regulatoryStrategy: overrides?.regulatoryStrategy || {
      primaryPathway: 'Standard',
      targetRegions: [],
      designations: [],
    },
    commercialTarget: overrides?.commercialTarget,
    notes: overrides?.notes,
    lastReviewDate: overrides?.lastReviewDate,
    nextReviewDate: overrides?.nextReviewDate,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

/**
 * Create a new claim
 */
export function createClaim(
  studyId: string,
  tppId: string,
  category: ClaimCategory,
  claimType: ClaimType,
  targetClaimText: string,
  priority: ClaimPriority,
  displayOrder: number,
  overrides?: Partial<TPPClaim>
): TPPClaim {
  const now = new Date().toISOString();
  return {
    id: overrides?.id || generateUSDMId('claim'),
    instanceType: 'TPPClaim',
    studyId,
    tppId,
    category,
    claimType,
    targetClaimText,
    minimumClaimText: overrides?.minimumClaimText,
    evidenceStatus: overrides?.evidenceStatus || 'Planned',
    priority,
    evidenceRequirements: overrides?.evidenceRequirements || [],
    supportingEndpointIds: overrides?.supportingEndpointIds || [],
    supportingStudyIds: overrides?.supportingStudyIds,
    competitiveBenchmark: overrides?.competitiveBenchmark,
    regulatoryLikelihood: overrides?.regulatoryLikelihood,
    displayOrder,
    notes: overrides?.notes,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

/**
 * Create a new differentiation
 */
export function createDifferentiation(
  studyId: string,
  tppId: string,
  competitorName: string,
  differentiationType: DifferentiationType,
  differentiationStatement: string,
  displayOrder: number,
  overrides?: Partial<CompetitiveDifferentiation>
): CompetitiveDifferentiation {
  const now = new Date().toISOString();
  return {
    id: overrides?.id || generateUSDMId('diff'),
    instanceType: 'CompetitiveDifferentiation',
    studyId,
    tppId,
    competitorName,
    competitorClass: overrides?.competitorClass,
    differentiationType,
    differentiationStatement,
    supportingEvidence: overrides?.supportingEvidence,
    competitorPosition: overrides?.competitorPosition,
    clinicalRelevance: overrides?.clinicalRelevance || 'Medium',
    commercialRelevance: overrides?.commercialRelevance || 'Medium',
    displayOrder,
    notes: overrides?.notes,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

/**
 * Create a new indication
 */
export function createIndication(
  name: string,
  priority: IndicationPriority,
  overrides?: Partial<TargetIndication>
): TargetIndication {
  return {
    id: overrides?.id || generateUSDMId('ind'),
    name,
    code: overrides?.code,
    lineOfTherapy: overrides?.lineOfTherapy,
    priority,
    geographicScope: overrides?.geographicScope,
    targetApprovalYear: overrides?.targetApprovalYear,
    notes: overrides?.notes,
  };
}

/**
 * Create a new evidence requirement
 */
export function createEvidenceRequirement(
  description: string,
  evidenceType: EvidenceType,
  mandatory: boolean,
  overrides?: Partial<EvidenceRequirement>
): EvidenceRequirement {
  return {
    id: overrides?.id || generateUSDMId('evreq'),
    description,
    evidenceType,
    mandatory,
    endpointId: overrides?.endpointId,
    status: overrides?.status || 'NotStarted',
    notes: overrides?.notes,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a TPP
 */
export function validateTPP(tpp: USDMTargetProductProfile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!tpp.name?.trim()) {
    errors.push('TPP name is required');
  }
  
  if (!tpp.therapeuticArea?.trim()) {
    errors.push('Therapeutic area is required');
  }
  
  if (!tpp.positioningStatement?.trim()) {
    errors.push('Positioning statement is required');
  }
  
  if (!tpp.targetPopulation?.trim()) {
    errors.push('Target population is required');
  }
  
  if (tpp.targetIndications.length === 0) {
    warnings.push('No target indications defined');
  }
  
  if (tpp.claimIds.length === 0) {
    warnings.push('No claims linked to TPP');
  }
  
  if (tpp.regulatoryStrategy.targetRegions.length === 0) {
    warnings.push('No target regions specified in regulatory strategy');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a claim
 */
export function validateClaim(claim: TPPClaim): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!claim.targetClaimText?.trim()) {
    errors.push('Target claim text is required');
  }
  
  if (!claim.category) {
    errors.push('Claim category is required');
  }
  
  if (!claim.claimType) {
    errors.push('Claim type is required');
  }
  
  if (claim.supportingEndpointIds.length === 0) {
    warnings.push('No supporting endpoints linked to claim');
  }
  
  if (claim.evidenceRequirements.length === 0) {
    warnings.push('No evidence requirements defined');
  }
  
  const mandatoryReqs = claim.evidenceRequirements.filter(r => r.mandatory);
  const incompleteMandatory = mandatoryReqs.filter(r => r.status !== 'Complete');
  if (incompleteMandatory.length > 0) {
    warnings.push(`${incompleteMandatory.length} mandatory evidence requirement(s) not complete`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a differentiation
 */
export function validateDifferentiation(diff: CompetitiveDifferentiation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!diff.competitorName?.trim()) {
    errors.push('Competitor name is required');
  }
  
  if (!diff.differentiationType) {
    errors.push('Differentiation type is required');
  }
  
  if (!diff.differentiationStatement?.trim()) {
    errors.push('Differentiation statement is required');
  }
  
  if (!diff.supportingEvidence?.trim()) {
    warnings.push('No supporting evidence provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete TPP with all claims and differentiations
 */
export function validateCompleteTPP(
  tpp: USDMTargetProductProfile,
  claims: TPPClaim[],
  differentiations: CompetitiveDifferentiation[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate TPP itself
  const tppResult = validateTPP(tpp);
  errors.push(...tppResult.errors);
  warnings.push(...tppResult.warnings);
  
  // Check for must-have claims
  const mustHaveClaims = claims.filter(c => c.priority === 'MustHave');
  if (mustHaveClaims.length === 0) {
    warnings.push('No must-have claims defined');
  }
  
  // Check for efficacy claims
  const efficacyClaims = claims.filter(c => c.category === 'Efficacy');
  if (efficacyClaims.length === 0) {
    warnings.push('No efficacy claims defined');
  }
  
  // Check for safety claims
  const safetyClaims = claims.filter(c => c.category === 'Safety');
  if (safetyClaims.length === 0) {
    warnings.push('No safety claims defined');
  }
  
  // Check competitive differentiations
  if (differentiations.length === 0) {
    warnings.push('No competitive differentiations defined');
  }
  
  // Check for orphaned claims (not in TPP's claimIds)
  const orphanedClaims = claims.filter(c => !tpp.claimIds.includes(c.id));
  if (orphanedClaims.length > 0) {
    warnings.push(`${orphanedClaims.length} claim(s) not linked to TPP`);
  }
  
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
 * Get claims by category
 */
export function getClaimsByCategory(claims: TPPClaim[], category: ClaimCategory): TPPClaim[] {
  return claims
    .filter(c => c.category === category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get claims by priority
 */
export function getClaimsByPriority(claims: TPPClaim[], priority: ClaimPriority): TPPClaim[] {
  return claims
    .filter(c => c.priority === priority)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get claims by evidence status
 */
export function getClaimsByEvidenceStatus(claims: TPPClaim[], status: EvidenceStatus): TPPClaim[] {
  return claims.filter(c => c.evidenceStatus === status);
}

/**
 * Count claims by category
 */
export function countClaimsByCategory(claims: TPPClaim[]): Record<ClaimCategory, number> {
  return {
    Efficacy: claims.filter(c => c.category === 'Efficacy').length,
    Safety: claims.filter(c => c.category === 'Safety').length,
    Convenience: claims.filter(c => c.category === 'Convenience').length,
    PatientExperience: claims.filter(c => c.category === 'PatientExperience').length,
    Economic: claims.filter(c => c.category === 'Economic').length,
  };
}

/**
 * Count claims by priority
 */
export function countClaimsByPriority(claims: TPPClaim[]): Record<ClaimPriority, number> {
  return {
    MustHave: claims.filter(c => c.priority === 'MustHave').length,
    ShouldHave: claims.filter(c => c.priority === 'ShouldHave').length,
    NiceToHave: claims.filter(c => c.priority === 'NiceToHave').length,
  };
}

/**
 * Count claims by evidence status
 */
export function countClaimsByEvidenceStatus(claims: TPPClaim[]): Record<EvidenceStatus, number> {
  return {
    Planned: claims.filter(c => c.evidenceStatus === 'Planned').length,
    InProgress: claims.filter(c => c.evidenceStatus === 'InProgress').length,
    DataCollected: claims.filter(c => c.evidenceStatus === 'DataCollected').length,
    Analyzed: claims.filter(c => c.evidenceStatus === 'Analyzed').length,
    Supportive: claims.filter(c => c.evidenceStatus === 'Supportive').length,
    NotSupportive: claims.filter(c => c.evidenceStatus === 'NotSupportive').length,
    Inconclusive: claims.filter(c => c.evidenceStatus === 'Inconclusive').length,
  };
}

/**
 * Calculate evidence completeness for a claim (0-100)
 */
export function calculateClaimEvidenceCompleteness(claim: TPPClaim): number {
  if (claim.evidenceRequirements.length === 0) return 0;
  
  const completeCount = claim.evidenceRequirements.filter(r => r.status === 'Complete').length;
  return Math.round((completeCount / claim.evidenceRequirements.length) * 100);
}

/**
 * Calculate overall TPP evidence completeness (0-100)
 */
export function calculateTPPEvidenceCompleteness(claims: TPPClaim[]): number {
  if (claims.length === 0) return 0;
  
  const totalCompleteness = claims.reduce((sum, claim) => {
    return sum + calculateClaimEvidenceCompleteness(claim);
  }, 0);
  
  return Math.round(totalCompleteness / claims.length);
}

/**
 * Get label for claim category
 */
export function getClaimCategoryLabel(category: ClaimCategory): string {
  return CLAIM_CATEGORY_CODES[category]?.decode || category;
}

/**
 * Get label for claim type
 */
export function getClaimTypeLabel(claimType: ClaimType): string {
  return CLAIM_TYPE_LABELS[claimType] || claimType;
}

/**
 * Get label for evidence status
 */
export function getEvidenceStatusLabel(status: EvidenceStatus): string {
  return EVIDENCE_STATUS_CODES[status]?.decode || status;
}

/**
 * Get label for TPP status
 */
export function getTPPStatusLabel(status: TPPStatus): string {
  return TPP_STATUS_CODES[status]?.decode || status;
}

/**
 * Get label for regulatory pathway
 */
export function getRegulatoryPathwayLabel(pathway: RegulatoryPathway): string {
  return REGULATORY_PATHWAY_LABELS[pathway] || pathway;
}

/**
 * Get label for differentiation type
 */
export function getDifferentiationTypeLabel(type: DifferentiationType): string {
  return DIFFERENTIATION_TYPE_LABELS[type] || type;
}

/**
 * Format TPP summary as text (for documents/reports)
 */
export function formatTPPSummary(
  tpp: USDMTargetProductProfile,
  claims: TPPClaim[],
  differentiations: CompetitiveDifferentiation[]
): string {
  const lines: string[] = [];
  
  lines.push(`# ${tpp.name}`);
  lines.push(`Version: ${tpp.version} | Status: ${getTPPStatusLabel(tpp.status)}`);
  lines.push('');
  
  lines.push('## Positioning');
  lines.push(tpp.positioningStatement);
  lines.push('');
  
  lines.push('## Target Population');
  lines.push(tpp.targetPopulation);
  lines.push('');
  
  if (tpp.targetIndications.length > 0) {
    lines.push('## Target Indications');
    tpp.targetIndications.forEach((ind, i) => {
      const lot = ind.lineOfTherapy ? ` (${LINE_OF_THERAPY_LABELS[ind.lineOfTherapy]})` : '';
      lines.push(`${i + 1}. ${ind.name}${lot} - ${ind.priority}`);
    });
    lines.push('');
  }
  
  const mustHaveClaims = getClaimsByPriority(claims, 'MustHave');
  if (mustHaveClaims.length > 0) {
    lines.push('## Critical Claims (Must Have)');
    mustHaveClaims.forEach((claim, i) => {
      lines.push(`${i + 1}. [${claim.category}] ${claim.targetClaimText}`);
    });
    lines.push('');
  }
  
  if (differentiations.length > 0) {
    lines.push('## Competitive Differentiation');
    differentiations.forEach((diff, i) => {
      lines.push(`${i + 1}. vs. ${diff.competitorName}: ${diff.differentiationStatement}`);
    });
    lines.push('');
  }
  
  lines.push('## Regulatory Strategy');
  lines.push(`Primary Pathway: ${getRegulatoryPathwayLabel(tpp.regulatoryStrategy.primaryPathway)}`);
  if (tpp.regulatoryStrategy.designations.length > 0) {
    lines.push('Designations:');
    tpp.regulatoryStrategy.designations.forEach(d => {
      lines.push(`  - ${DESIGNATION_TYPE_LABELS[d.designation]} (${d.region}): ${d.status}`);
    });
  }
  
  return lines.join('\n');
}
