
// ============================================================================
// USDM Eligibility Types v0.9.9d - Inclusion/Exclusion Criteria
// TransCelerate/CDISC DDF Reference v3.0 Compliant
// ============================================================================

import { USDMCode, USDMComment } from './usdmTypes';
import { generateUSDMId, ValidationResult } from './usdm-core-types';

// ============================================================================
// ELIGIBILITY CRITERIA (USDM 3.0 First-Class Entity)
// ============================================================================

/**
 * EligibilityCriteria - Container for all inclusion/exclusion criteria for a study
 * This is the top-level entity that holds all criterion groups
 */
export interface USDMEligibilityCriteria {
  id: string;
  instanceType: 'EligibilityCriteria';
  
  /** Reference to the study */
  studyId: string;
  
  /** Overall description of eligibility requirements */
  description?: string;
  
  /** Target population description */
  targetPopulation?: string;
  
  /** Minimum age for enrollment */
  minimumAge?: USDMAgeRange;
  
  /** Maximum age for enrollment */
  maximumAge?: USDMAgeRange;
  
  /** Sex/gender requirements */
  sex?: USDMSexType;
  
  /** Whether healthy volunteers are accepted */
  healthyVolunteers: boolean;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Age range for eligibility
 */
export interface USDMAgeRange {
  value: number;
  unit: USDMAgeUnit;
}

export type USDMAgeUnit = 'Years' | 'Months' | 'Weeks' | 'Days';

/**
 * Sex/gender types for eligibility
 */
export type USDMSexType = 
  | 'Male'
  | 'Female'
  | 'All';

export const SEX_TYPE_CODES: Record<USDMSexType, USDMCode> = {
  Male: {
    code: 'C20197',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Male',
  },
  Female: {
    code: 'C16576',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Female',
  },
  All: {
    code: 'C49636',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'All',
  },
};

// ============================================================================
// ELIGIBILITY CRITERION GROUP (Logical Grouping)
// ============================================================================

/**
 * EligibilityCriterionGroup - A logical grouping of criteria
 * Groups can represent: all inclusion criteria, all exclusion criteria,
 * or domain-specific groups (e.g., "Laboratory Requirements")
 */
export interface USDMEligibilityCriterionGroup {
  id: string;
  instanceType: 'EligibilityCriterionGroup';
  
  /** Reference to parent eligibility criteria */
  eligibilityCriteriaId: string;
  
  /** Group name (e.g., "Inclusion Criteria", "Exclusion Criteria") */
  name: string;
  
  /** Group description */
  description?: string;
  
  /** Whether this is for inclusion or exclusion */
  criterionType: USDMCriterionType;
  
  /** Display order within eligibility criteria */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Criterion type - inclusion vs exclusion
 */
export type USDMCriterionType = 
  | 'Inclusion'
  | 'Exclusion';

export const CRITERION_TYPE_CODES: Record<USDMCriterionType, USDMCode> = {
  Inclusion: {
    code: 'C25532',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Inclusion Criterion',
  },
  Exclusion: {
    code: 'C25370',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Exclusion Criterion',
  },
};

// ============================================================================
// ELIGIBILITY CRITERION (Individual Characteristic)
// ============================================================================

/**
 * EligibilityCriterion - An individual criterion (characteristic) that subjects
 * must meet (inclusion) or must not have (exclusion) to participate
 */
export interface USDMEligibilityCriterion {
  id: string;
  instanceType: 'EligibilityCriterion';
  
  /** Reference to parent group */
  groupId: string;
  
  /** Criterion identifier (e.g., "I1", "E3") */
  identifier: string;
  
  /** Short name */
  name: string;
  
  /** Full criterion text */
  text: string;
  
  /** Category of criterion */
  category: USDMCriterionCategory;
  
  /** Whether this is inclusion or exclusion */
  criterionType: USDMCriterionType;
  
  /** Whether this criterion is required or can be waived */
  isRequired: boolean;
  
  /** Condition under which criterion applies (if not always) */
  applicabilityCondition?: string;
  
  /** Dictionary term reference (MedDRA, ICD-10, etc.) */
  dictionaryReference?: USDMDictionaryReference;
  
  /** Contextual information / rationale */
  contextDescription?: string;
  
  /** Expected assessment method */
  assessmentMethod?: string;
  
  /** Notes and comments */
  notes?: USDMComment[];
  
  /** Display order within group */
  displayOrder: number;
  
  /** Audit */
  createdAt: string;
  updatedAt: string;
}

/**
 * Criterion categories based on common clinical trial domains
 */
export type USDMCriterionCategory = 
  | 'Diagnosis'         // Disease/condition diagnosis
  | 'Demographics'      // Age, sex, etc.
  | 'Laboratory'        // Lab values
  | 'Medical History'   // Prior conditions
  | 'Medications'       // Prior/concurrent medications
  | 'Procedures'        // Prior procedures/surgeries
  | 'Performance'       // Performance status (ECOG, etc.)
  | 'Consent'           // Consent-related
  | 'Contraception'     // Reproductive requirements
  | 'Lifestyle'         // Smoking, alcohol, etc.
  | 'Geographic'        // Location requirements
  | 'Other';            // Other criteria

export const CRITERION_CATEGORY_CODES: Record<USDMCriterionCategory, USDMCode> = {
  Diagnosis: {
    code: 'C15220',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Diagnosis',
  },
  Demographics: {
    code: 'C16495',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Demographics',
  },
  Laboratory: {
    code: 'C25294',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Laboratory',
  },
  'Medical History': {
    code: 'C18772',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Medical History',
  },
  Medications: {
    code: 'C459',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Medications',
  },
  Procedures: {
    code: 'C25218',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Procedures',
  },
  Performance: {
    code: 'C25195',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Performance Status',
  },
  Consent: {
    code: 'C16735',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Informed Consent',
  },
  Contraception: {
    code: 'C13645',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Contraception',
  },
  Lifestyle: {
    code: 'C16795',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Lifestyle',
  },
  Geographic: {
    code: 'C25464',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Geographic Location',
  },
  Other: {
    code: 'C17649',
    codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
    decode: 'Other',
  },
};

/**
 * Reference to a dictionary/terminology term
 */
export interface USDMDictionaryReference {
  /** Dictionary name (MedDRA, ICD-10, SNOMED-CT, etc.) */
  dictionary: string;
  
  /** Term code */
  code: string;
  
  /** Term text */
  text: string;
  
  /** Version of the dictionary */
  version?: string;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new EligibilityCriteria
 */
export function createEligibilityCriteria(
  studyId: string,
  overrides?: Partial<USDMEligibilityCriteria>
): USDMEligibilityCriteria {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('elig-criteria'),
    instanceType: 'EligibilityCriteria',
    studyId,
    healthyVolunteers: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a new EligibilityCriterionGroup
 */
export function createEligibilityCriterionGroup(
  eligibilityCriteriaId: string,
  name: string,
  criterionType: USDMCriterionType,
  displayOrder: number,
  overrides?: Partial<USDMEligibilityCriterionGroup>
): USDMEligibilityCriterionGroup {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('elig-group'),
    instanceType: 'EligibilityCriterionGroup',
    eligibilityCriteriaId,
    name,
    criterionType,
    displayOrder,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a new EligibilityCriterion
 */
export function createEligibilityCriterion(
  groupId: string,
  identifier: string,
  name: string,
  text: string,
  criterionType: USDMCriterionType,
  category: USDMCriterionCategory,
  displayOrder: number,
  overrides?: Partial<USDMEligibilityCriterion>
): USDMEligibilityCriterion {
  const now = new Date().toISOString();
  return {
    id: generateUSDMId('elig-criterion'),
    instanceType: 'EligibilityCriterion',
    groupId,
    identifier,
    name,
    text,
    criterionType,
    category,
    isRequired: true,
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
 * Validate an EligibilityCriteria
 */
export function validateEligibilityCriteria(criteria: USDMEligibilityCriteria): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!criteria.id) errors.push('Eligibility criteria must have an ID');
  if (!criteria.studyId) errors.push('Eligibility criteria must reference a study');
  
  if (criteria.minimumAge && criteria.maximumAge) {
    const minAgeInDays = convertAgeToDays(criteria.minimumAge);
    const maxAgeInDays = convertAgeToDays(criteria.maximumAge);
    if (minAgeInDays > maxAgeInDays) {
      errors.push('Minimum age cannot exceed maximum age');
    }
  }
  
  if (!criteria.description) {
    warnings.push('Consider adding a description of eligibility requirements');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an EligibilityCriterionGroup
 */
export function validateEligibilityCriterionGroup(
  group: USDMEligibilityCriterionGroup
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!group.id) errors.push('Criterion group must have an ID');
  if (!group.eligibilityCriteriaId) errors.push('Criterion group must reference eligibility criteria');
  if (!group.name || group.name.trim() === '') {
    errors.push('Criterion group must have a name');
  }
  if (!group.criterionType) errors.push('Criterion group must specify inclusion or exclusion type');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an EligibilityCriterion
 */
export function validateEligibilityCriterion(
  criterion: USDMEligibilityCriterion
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!criterion.id) errors.push('Criterion must have an ID');
  if (!criterion.groupId) errors.push('Criterion must reference a group');
  if (!criterion.identifier || criterion.identifier.trim() === '') {
    errors.push('Criterion must have an identifier (e.g., I1, E3)');
  }
  if (!criterion.text || criterion.text.trim() === '') {
    errors.push('Criterion must have criterion text');
  }
  if (!criterion.criterionType) errors.push('Criterion must specify inclusion or exclusion type');
  if (!criterion.category) errors.push('Criterion must have a category');
  
  if (!criterion.assessmentMethod) {
    warnings.push(`Criterion ${criterion.identifier}: Consider specifying assessment method`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete eligibility (criteria + groups + individual criteria)
 */
export function validateCompleteEligibility(
  criteria: USDMEligibilityCriteria,
  groups: USDMEligibilityCriterionGroup[],
  criteriaList: USDMEligibilityCriterion[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate criteria container
  const criteriaValidation = validateEligibilityCriteria(criteria);
  errors.push(...criteriaValidation.errors);
  warnings.push(...criteriaValidation.warnings);

  // Check for both inclusion and exclusion groups
  const hasInclusion = groups.some(g => g.criterionType === 'Inclusion');
  const hasExclusion = groups.some(g => g.criterionType === 'Exclusion');
  
  if (!hasInclusion) {
    warnings.push('No inclusion criteria groups defined');
  }
  if (!hasExclusion) {
    warnings.push('No exclusion criteria groups defined');
  }

  // Validate each group
  for (const group of groups) {
    const groupValidation = validateEligibilityCriterionGroup(group);
    errors.push(...groupValidation.errors.map(e => `Group "${group.name}": ${e}`));
    warnings.push(...groupValidation.warnings.map(w => `Group "${group.name}": ${w}`));
  }

  // Validate each criterion
  for (const criterion of criteriaList) {
    const criterionValidation = validateEligibilityCriterion(criterion);
    errors.push(...criterionValidation.errors.map(e => `${criterion.identifier}: ${e}`));
    warnings.push(...criterionValidation.warnings);
    
    // Check group reference
    if (!groups.some(g => g.id === criterion.groupId)) {
      errors.push(`Criterion ${criterion.identifier} references non-existent group`);
    }
  }

  // Check for duplicate identifiers
  const identifiers = criteriaList.map(c => c.identifier);
  const duplicates = identifiers.filter((id, idx) => identifiers.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    errors.push(`Duplicate criterion identifiers: ${Array.from(new Set(duplicates)).join(', ')}`);
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
 * Convert age to days for comparison
 */
export function convertAgeToDays(age: USDMAgeRange): number {
  switch (age.unit) {
    case 'Years': return age.value * 365;
    case 'Months': return age.value * 30;
    case 'Weeks': return age.value * 7;
    case 'Days': return age.value;
  }
}

/**
 * Format age range for display
 */
export function formatAgeRange(age: USDMAgeRange): string {
  return `${age.value} ${age.unit.toLowerCase()}`;
}

/**
 * Get display label for criterion category
 */
export function getCriterionCategoryLabel(category: USDMCriterionCategory): string {
  return CRITERION_CATEGORY_CODES[category]?.decode || category;
}

/**
 * Get display label for criterion type
 */
export function getCriterionTypeLabel(type: USDMCriterionType): string {
  return CRITERION_TYPE_CODES[type]?.decode || type;
}

/**
 * Generate criterion identifier based on type and sequence
 */
export function generateCriterionIdentifier(
  type: USDMCriterionType,
  sequence: number
): string {
  const prefix = type === 'Inclusion' ? 'I' : 'E';
  return `${prefix}${sequence}`;
}

/**
 * Count criteria by type
 */
export function countCriteriaByType(
  criteria: USDMEligibilityCriterion[]
): { inclusion: number; exclusion: number; total: number } {
  const inclusion = criteria.filter(c => c.criterionType === 'Inclusion').length;
  const exclusion = criteria.filter(c => c.criterionType === 'Exclusion').length;
  return { inclusion, exclusion, total: criteria.length };
}

/**
 * Get criteria by category
 */
export function getCriteriaByCategory(
  criteria: USDMEligibilityCriterion[],
  category: USDMCriterionCategory
): USDMEligibilityCriterion[] {
  return criteria.filter(c => c.category === category);
}

/**
 * Get criteria by group
 */
export function getCriteriaByGroup(
  criteria: USDMEligibilityCriterion[],
  groupId: string
): USDMEligibilityCriterion[] {
  return criteria
    .filter(c => c.groupId === groupId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * Complete eligibility view for display
 */
export interface EligibilityView {
  studyId: string;
  criteria: USDMEligibilityCriteria;
  inclusionGroups: EligibilityGroupView[];
  exclusionGroups: EligibilityGroupView[];
  statistics: EligibilityStatistics;
}

/**
 * Group with its criteria for display
 */
export interface EligibilityGroupView {
  group: USDMEligibilityCriterionGroup;
  criteria: USDMEligibilityCriterion[];
}

/**
 * Eligibility statistics
 */
export interface EligibilityStatistics {
  totalGroups: number;
  inclusionGroups: number;
  exclusionGroups: number;
  totalCriteria: number;
  inclusionCriteria: number;
  exclusionCriteria: number;
  requiredCriteria: number;
  waivableCriteria: number;
  categoryCounts: Record<USDMCriterionCategory, number>;
}

// ============================================================================
// STORE STATE & ACTIONS TYPES
// ============================================================================

export interface USDMEligibilityState {
  /** Eligibility criteria by study ID */
  criteriaByStudyId: Record<string, USDMEligibilityCriteria>;
  
  /** Criterion groups by study ID */
  groupsByStudyId: Record<string, USDMEligibilityCriterionGroup[]>;
  
  /** Individual criteria by study ID */
  criterionsByStudyId: Record<string, USDMEligibilityCriterion[]>;
  
  /** UI state */
  selectedCriteriaId: string | null;
  selectedGroupId: string | null;
  selectedCriterionId: string | null;
}

export interface USDMEligibilityActions {
  // Eligibility Criteria
  setEligibilityCriteria: (
    studyId: string,
    data: Partial<USDMEligibilityCriteria>
  ) => USDMEligibilityCriteria;
  updateEligibilityCriteria: (
    studyId: string,
    updates: Partial<USDMEligibilityCriteria>
  ) => void;
  
  // Criterion Groups
  addGroup: (
    studyId: string,
    groupData: Partial<USDMEligibilityCriterionGroup>
  ) => USDMEligibilityCriterionGroup;
  updateGroup: (groupId: string, updates: Partial<USDMEligibilityCriterionGroup>) => void;
  removeGroup: (groupId: string) => void;
  reorderGroups: (studyId: string, groupIds: string[]) => void;
  
  // Individual Criteria
  addCriterion: (
    studyId: string,
    criterionData: Partial<USDMEligibilityCriterion>
  ) => USDMEligibilityCriterion;
  updateCriterion: (criterionId: string, updates: Partial<USDMEligibilityCriterion>) => void;
  removeCriterion: (criterionId: string) => void;
  moveCriterion: (criterionId: string, newGroupId: string, newDisplayOrder: number) => void;
  reorderCriteria: (groupId: string, criterionIds: string[]) => void;
  
  // Bulk Operations
  bulkAddCriteria: (
    studyId: string,
    criteria: Partial<USDMEligibilityCriterion>[]
  ) => USDMEligibilityCriterion[];
  copyCriteriaFromStudy: (sourceStudyId: string, targetStudyId: string) => void;
  
  // Queries
  getGroupById: (groupId: string) => USDMEligibilityCriterionGroup | undefined;
  getCriterionById: (criterionId: string) => USDMEligibilityCriterion | undefined;
  getEligibilityView: (studyId: string) => EligibilityView | undefined;
  
  // Selection
  selectCriteria: (criteriaId: string | null) => void;
  selectGroup: (groupId: string | null) => void;
  selectCriterion: (criterionId: string | null) => void;
  
  // Reset
  clearEligibilityStore: () => void;
}
