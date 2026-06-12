
// ============================================================================
// eCRF Types v0.9.10 - Electronic Case Report Form Builder
// CDASH/CDASHIG Aligned, 21 CFR Part 11 Compliant
// ============================================================================

import { SDTMDomainCode } from './sdtm-types';

// ============================================================================
// eCRF FORM STRUCTURE
// ============================================================================

/**
 * eCRF Form - Container for fields and sections
 */
export interface ECRFForm {
  id: string;
  studyId: string;
  
  // Identification
  formOID: string;
  name: string;
  label: string;
  description?: string;
  
  // Classification
  formType: ECRFFormType;
  category: ECRFFormCategory;
  
  // CDASH alignment
  cdashDomain?: SDTMDomainCode;
  cdashIGVersion?: string;
  
  // Structure
  sections: ECRFFormSection[];
  
  // Version
  version: string;
  versionStatus: 'Draft' | 'InReview' | 'Approved' | 'Released' | 'Deprecated';
  effectiveDate?: string;
  retiredDate?: string;
  
  // Assignment
  assignedVisits: string[];
  assignedEpochs: string[];
  isRepeating: boolean;
  repeatMax?: number;
  
  // Completion rules
  isRequired: boolean;
  completionDeadlineDays?: number;
  
  // Settings
  allowDataEntry: boolean;
  allowSourceDataVerification: boolean;
  requiresSignature: boolean;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

/**
 * Form Type
 */
export type ECRFFormType =
  | 'Standard'         // Normal data collection
  | 'Log'              // Log/repeating form
  | 'Mixed'            // Contains both static and log sections
  | 'Unscheduled'      // Unscheduled visit form
  | 'SAE'              // Serious Adverse Event form
  | 'DeviceReporting'; // Device malfunction reporting

/**
 * Form Category per CDASH domains
 */
export type ECRFFormCategory =
  | 'Demographics'
  | 'MedicalHistory'
  | 'PhysicalExam'
  | 'VitalSigns'
  | 'Laboratory'
  | 'ECG'
  | 'AdverseEvents'
  | 'ConcomitantMeds'
  | 'StudyTreatment'
  | 'Efficacy'
  | 'PatientReported'
  | 'Disposition'
  | 'Protocol'
  | 'Consent'
  | 'Custom';

/**
 * Form Section - Logical grouping of fields
 */
export interface ECRFFormSection {
  id: string;
  formId: string;
  
  // Identification
  sectionOID: string;
  name: string;
  label: string;
  description?: string;
  
  // Structure
  fields: ECRFField[];
  order: number;
  
  // Display
  isCollapsible: boolean;
  isCollapsedByDefault: boolean;
  
  // Conditional display
  displayCondition?: ECRFCondition;
  
  // Repeating
  isRepeating: boolean;
  repeatMax?: number;
  repeatAddLabel?: string;
  repeatRemoveLabel?: string;
}

// ============================================================================
// eCRF FIELD TYPES
// ============================================================================

/**
 * eCRF Field - Individual data collection element
 */
export interface ECRFField {
  id: string;
  formId: string;
  sectionId: string;
  
  // Identification
  fieldOID: string;
  name: string;
  label: string;
  shortLabel?: string;
  description?: string;
  
  // CDASH alignment
  cdashVariable?: string;
  cdashCore?: 'HR' | 'R/C' | 'O' | 'Perm'; // Highly Recommended, Recommended/Conditional, Optional, Permissible
  
  // SDTM mapping
  sdtmDomain?: SDTMDomainCode;
  sdtmVariable?: string;
  sdtmMappingType?: 'Direct' | 'Derived' | 'Lookup';
  
  // Data type
  dataType: ECRFDataType;
  
  // Constraints
  isRequired: boolean;
  isReadOnly: boolean;
  isHidden: boolean;
  
  // Validation
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  patternErrorMessage?: string;
  
  // Code list
  codeListId?: string;
  codeListOID?: string;
  allowOther: boolean;
  otherFieldId?: string;
  
  // Units
  unitFieldId?: string;
  defaultUnit?: string;
  availableUnits?: string[];
  
  // Date/Time
  dateFormat?: string;
  timeFormat?: string;
  allowPartialDate: boolean;
  allowFutureDate: boolean;
  
  // Numeric
  significantDigits?: number;
  displayFormat?: string;
  
  // Text
  multiLine: boolean;
  rows?: number;
  
  // Display
  fieldWidth?: 'small' | 'medium' | 'large' | 'full';
  helpText?: string;
  placeholder?: string;
  prefixText?: string;
  suffixText?: string;
  order: number;
  
  // Conditional logic
  displayCondition?: ECRFCondition;
  requiredCondition?: ECRFCondition;
  enableCondition?: ECRFCondition;
  
  // Edit checks
  editCheckIds: string[];
  
  // Query settings
  queryEnabled: boolean;
  autoQueryOnBlank: boolean;
  
  // SDV
  requiresSDV: boolean;
  sdvMethod?: 'Source' | 'Remote' | 'Either';
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * eCRF Data Types
 */
export type ECRFDataType =
  | 'text'           // Single-line text
  | 'textarea'       // Multi-line text
  | 'integer'        // Whole number
  | 'float'          // Decimal number
  | 'date'           // Full date (YYYY-MM-DD)
  | 'partialDate'    // Partial date (YYYY-MM or YYYY)
  | 'datetime'       // Date and time
  | 'time'           // Time only
  | 'boolean'        // Yes/No
  | 'codedValue'     // Coded value from code list
  | 'multiSelect'    // Multiple selection from code list
  | 'file'           // File upload
  | 'signature'      // Electronic signature
  | 'calculated';    // Derived/calculated value

/**
 * Code List for eCRF dropdown/radio options
 */
export interface ECRFCodeList {
  id: string;
  studyId: string;
  
  // Identification
  oid: string;
  name: string;
  description?: string;
  
  // CDISC reference
  nciCodeListCode?: string;
  sdtmCodeListOID?: string;
  
  // Type
  dataType: 'text' | 'integer' | 'float';
  
  // Items
  items: ECRFCodeListItem[];
  
  // Extensibility
  isExtensible: boolean;
  extensionInstructions?: string;
  
  // Version
  version: string;
  effectiveDate: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Code List Item
 */
export interface ECRFCodeListItem {
  id: string;
  codeListId: string;
  
  // Values
  codedValue: string;
  decodedValue: string;
  
  // Display
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
  
  // Conditional availability
  availabilityCondition?: ECRFCondition;
  
  // Specify field
  requiresSpecify: boolean;
  specifyLabel?: string;
  specifyFieldId?: string;
}

// ============================================================================
// CONDITIONAL LOGIC
// ============================================================================

/**
 * Condition for display/enable/require logic
 */
export interface ECRFCondition {
  id: string;
  
  // Type
  type: 'Simple' | 'Complex' | 'Expression';
  
  // Simple condition
  sourceFieldOID?: string;
  operator?: ECRFConditionOperator;
  value?: string | string[] | number | boolean;
  
  // Complex condition
  logicalOperator?: 'AND' | 'OR';
  conditions?: ECRFCondition[];
  
  // Expression (for complex cases)
  expression?: string;
  
  // Metadata
  description?: string;
}

/**
 * Condition Operators
 */
export type ECRFConditionOperator =
  | 'Equals'
  | 'NotEquals'
  | 'GreaterThan'
  | 'GreaterThanOrEquals'
  | 'LessThan'
  | 'LessThanOrEquals'
  | 'Contains'
  | 'StartsWith'
  | 'EndsWith'
  | 'In'
  | 'NotIn'
  | 'IsBlank'
  | 'IsNotBlank'
  | 'Between';

// ============================================================================
// EDIT CHECKS
// ============================================================================

/**
 * Edit Check - Data validation rule
 */
export interface ECRFEditCheck {
  id: string;
  studyId: string;
  
  // Identification
  checkOID: string;
  name: string;
  description: string;
  
  // Classification
  checkType: EditCheckType;
  category: EditCheckCategory;
  
  // Scope
  scope: EditCheckScope;
  formOIDs?: string[];
  fieldOIDs?: string[];
  
  // Activation
  timing: EditCheckTiming;
  
  // Rule definition
  ruleType: 'Condition' | 'Expression' | 'CrossForm' | 'RangeCheck' | 'QueryText';
  
  // For condition-based rules
  condition?: ECRFCondition;
  
  // For expression-based rules
  expression?: string;
  
  // For cross-form rules
  crossFormRule?: {
    sourceFormOID: string;
    sourceFieldOID: string;
    targetFormOID: string;
    targetFieldOID: string;
    comparison: ECRFConditionOperator;
  };
  
  // For range checks
  rangeRule?: {
    fieldOID: string;
    lowValue?: number;
    highValue?: number;
    lowComparison?: 'Inclusive' | 'Exclusive';
    highComparison?: 'Inclusive' | 'Exclusive';
    dynamicLowFieldOID?: string;
    dynamicHighFieldOID?: string;
  };
  
  // Action on failure
  actionType: EditCheckAction;
  
  // Query settings (if action is query)
  querySettings?: {
    queryText: string;
    queryRecipient: 'Site' | 'Monitor' | 'DataManager' | 'Medical';
    queryPriority: 'Low' | 'Medium' | 'High' | 'Critical';
    autoClose: boolean;
    autoCloseCondition?: ECRFCondition;
  };
  
  // Message settings (if action is message)
  messageSettings?: {
    messageType: 'Info' | 'Warning' | 'Error';
    messageText: string;
  };
  
  // Status
  status: 'Draft' | 'Active' | 'Inactive' | 'Deprecated';
  effectiveDate?: string;
  retiredDate?: string;
  
  // Testing
  testCount: number;
  lastTestedAt?: string;
  lastTestResult?: 'Pass' | 'Fail';
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Edit Check Types
 */
export type EditCheckType =
  | 'DataValidation'      // Single field validation
  | 'CrossField'          // Cross-field within form
  | 'CrossForm'           // Cross-form validation
  | 'CrossVisit'          // Across visits
  | 'RangeCheck'          // Numeric range
  | 'DateLogic'           // Date comparisons
  | 'RequiredField'       // Conditional required
  | 'UniqueValue'         // Uniqueness constraint
  | 'ExternalReference'   // External data lookup
  | 'Custom';             // Custom expression

/**
 * Edit Check Category
 */
export type EditCheckCategory =
  | 'Completeness'        // Missing data
  | 'Consistency'         // Data consistency
  | 'Range'               // Out of range
  | 'Logic'               // Logical inconsistency
  | 'Conformance'         // Protocol conformance
  | 'Safety'              // Safety-related
  | 'Efficacy'            // Efficacy-related
  | 'Regulatory';         // Regulatory requirement

/**
 * Edit Check Scope
 */
export type EditCheckScope =
  | 'Field'               // Single field
  | 'Form'                // Within a form
  | 'Visit'               // Within a visit
  | 'Subject'             // Across all subject data
  | 'Study';              // Study-level

/**
 * Edit Check Timing
 */
export type EditCheckTiming =
  | 'OnEntry'             // As data is entered
  | 'OnSave'              // When form is saved
  | 'OnSubmit'            // When form is submitted
  | 'Batch'               // Batch processing
  | 'Manual';             // Manual trigger

/**
 * Edit Check Action
 */
export type EditCheckAction =
  | 'Block'               // Prevent save
  | 'Warn'                // Warning message
  | 'AutoQuery'           // Create query
  | 'Info'                // Informational
  | 'Derive'              // Trigger derivation
  | 'Flag';               // Flag for review

/**
 * Edit Check Execution Result
 */
export interface EditCheckResult {
  id: string;
  checkId: string;
  
  // Context
  subjectId: string;
  visitOID?: string;
  formOID: string;
  fieldOID?: string;
  recordKey?: string;
  
  // Result
  passed: boolean;
  message?: string;
  
  // Action taken
  actionTaken: EditCheckAction;
  queryCreated?: string;
  
  // Values
  value?: string;
  comparisonValue?: string;
  
  // Timing
  executedAt: string;
  executionDuration: number;
}

// ============================================================================
// eCRF VISIT/SCHEDULE
// ============================================================================

/**
 * Visit Schedule Definition
 */
export interface ECRFVisitSchedule {
  id: string;
  studyId: string;
  
  // Visits
  visits: ECRFVisit[];
  
  // Unscheduled visit forms
  unscheduledForms: string[];
  
  // Version
  version: string;
  status: 'Draft' | 'Active' | 'Amended';
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Visit Definition
 */
export interface ECRFVisit {
  id: string;
  scheduleId: string;
  
  // Identification
  visitOID: string;
  visitNum: number;
  visitName: string;
  shortName: string;
  
  // Timing
  epochOID?: string;
  targetDay?: number;
  windowBefore?: number;
  windowAfter?: number;
  
  // Forms
  formAssignments: ECRFFormAssignment[];
  
  // Display
  order: number;
  isRequired: boolean;
  
  // Settings
  allowUnscheduled: boolean;
}

/**
 * Form Assignment to Visit
 */
export interface ECRFFormAssignment {
  id: string;
  visitId: string;
  formId: string;
  
  // Settings
  isRequired: boolean;
  order: number;
  
  // Conditional
  condition?: ECRFCondition;
}

// ============================================================================
// eCRF DATA ENTRY
// ============================================================================

/**
 * Form Instance - Actual data entry
 */
export interface ECRFFormInstance {
  id: string;
  formId: string;
  
  // Subject context
  studyId: string;
  siteId: string;
  subjectId: string;
  visitOID: string;
  visitDate?: string;
  
  // Repeating form
  repeatKey?: number;
  
  // Status
  status: ECRFFormStatus;
  
  // Data
  data: Record<string, ECRFFieldValue>;
  
  // Completion
  completedAt?: string;
  completedBy?: string;
  
  // SDV
  sdvStatus: 'NotRequired' | 'Pending' | 'Partial' | 'Complete';
  sdvCompletedAt?: string;
  sdvCompletedBy?: string;
  
  // Signature
  signatureStatus: 'NotRequired' | 'Pending' | 'Signed';
  signedAt?: string;
  signedBy?: string;
  signatureReason?: string;
  
  // Lock
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  
  // Freeze
  isFrozen: boolean;
  frozenAt?: string;
  frozenBy?: string;
  
  // Queries
  openQueries: number;
  totalQueries: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Form Status
 */
export type ECRFFormStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'Complete'
  | 'Incomplete'
  | 'Verified'
  | 'Frozen'
  | 'Locked';

/**
 * Field Value
 */
export interface ECRFFieldValue {
  fieldOID: string;
  
  // Value
  value: string | number | boolean | null;
  displayValue?: string;
  
  // Metadata
  enteredAt: string;
  enteredBy: string;
  modifiedAt?: string;
  modifiedBy?: string;
  
  // Data quality
  hasQuery: boolean;
  queryCount: number;
  sdvRequired: boolean;
  sdvCompleted: boolean;
  
  // Change reason (for edits after initial entry)
  changeReason?: string;
}

// ============================================================================
// STATE & ACTIONS
// ============================================================================

/**
 * eCRF Store State
 */
export interface ECRFState {
  // Forms
  forms: Record<string, ECRFForm>;
  formsByStudy: Record<string, string[]>;
  
  // Code Lists
  codeLists: Record<string, ECRFCodeList>;
  codeListsByStudy: Record<string, string[]>;
  
  // Edit Checks
  editChecks: Record<string, ECRFEditCheck>;
  editChecksByStudy: Record<string, string[]>;
  editChecksByForm: Record<string, string[]>;
  
  // Visit Schedule
  visitSchedules: Record<string, ECRFVisitSchedule>;
  
  // Form Instances (data entry)
  formInstances: Record<string, ECRFFormInstance>;
  instancesBySubject: Record<string, string[]>;
  instancesByVisit: Record<string, string[]>;
  
  // Edit Check Results
  editCheckResults: Record<string, EditCheckResult[]>;
  
  // UI State
  selectedFormId: string | null;
  selectedCheckId: string | null;
  selectedInstanceId: string | null;
  activeView: ECRFView;
  formBuilderMode: 'Design' | 'Preview' | 'Test';
  filters: ECRFFilters;
  isLoading: boolean;
  lastError: string | null;
}

export type ECRFView =
  | 'forms'
  | 'form-builder'
  | 'codelists'
  | 'edit-checks'
  | 'check-detail'
  | 'visit-schedule'
  | 'data-entry'
  | 'sdv'
  | 'queries';

export interface ECRFFilters {
  studyId?: string;
  formCategory?: ECRFFormCategory[];
  formStatus?: string[];
  checkCategory?: EditCheckCategory[];
  checkStatus?: string[];
}

/**
 * eCRF Store Actions
 */
export interface ECRFActions {
  // Form management
  createForm: (form: Partial<ECRFForm>) => ECRFForm;
  updateForm: (formId: string, updates: Partial<ECRFForm>) => void;
  deleteForm: (formId: string) => void;
  duplicateForm: (formId: string, newName: string) => ECRFForm;
  getForm: (formId: string) => ECRFForm | undefined;
  getFormsByStudy: (studyId: string) => ECRFForm[];
  
  // Section management
  addSection: (formId: string, section: Partial<ECRFFormSection>) => ECRFFormSection;
  updateSection: (formId: string, sectionId: string, updates: Partial<ECRFFormSection>) => void;
  removeSection: (formId: string, sectionId: string) => void;
  reorderSections: (formId: string, orderedIds: string[]) => void;
  
  // Field management
  addField: (formId: string, sectionId: string, field: Partial<ECRFField>) => ECRFField;
  updateField: (formId: string, fieldId: string, updates: Partial<ECRFField>) => void;
  removeField: (formId: string, fieldId: string) => void;
  duplicateField: (formId: string, fieldId: string) => ECRFField;
  reorderFields: (formId: string, sectionId: string, orderedIds: string[]) => void;
  
  // Code list management
  createCodeList: (codeList: Partial<ECRFCodeList>) => ECRFCodeList;
  updateCodeList: (codeListId: string, updates: Partial<ECRFCodeList>) => void;
  deleteCodeList: (codeListId: string) => void;
  addCodeListItem: (codeListId: string, item: Partial<ECRFCodeListItem>) => ECRFCodeListItem;
  updateCodeListItem: (codeListId: string, itemId: string, updates: Partial<ECRFCodeListItem>) => void;
  removeCodeListItem: (codeListId: string, itemId: string) => void;
  reorderCodeListItems: (codeListId: string, orderedIds: string[]) => void;
  
  // Edit check management
  createEditCheck: (check: Partial<ECRFEditCheck>) => ECRFEditCheck;
  updateEditCheck: (checkId: string, updates: Partial<ECRFEditCheck>) => void;
  deleteEditCheck: (checkId: string) => void;
  duplicateEditCheck: (checkId: string, newName: string) => ECRFEditCheck;
  testEditCheck: (checkId: string, testData: Record<string, unknown>) => EditCheckResult;
  executeEditChecks: (formInstanceId: string, checkIds?: string[]) => EditCheckResult[];
  
  // Visit schedule management
  createVisitSchedule: (schedule: Partial<ECRFVisitSchedule>) => ECRFVisitSchedule;
  updateVisitSchedule: (scheduleId: string, updates: Partial<ECRFVisitSchedule>) => void;
  addVisit: (scheduleId: string, visit: Partial<ECRFVisit>) => ECRFVisit;
  updateVisit: (scheduleId: string, visitId: string, updates: Partial<ECRFVisit>) => void;
  removeVisit: (scheduleId: string, visitId: string) => void;
  assignFormToVisit: (scheduleId: string, visitId: string, formId: string, isRequired: boolean) => void;
  
  // Form instance management (data entry)
  createFormInstance: (instance: Partial<ECRFFormInstance>) => ECRFFormInstance;
  updateFormInstance: (instanceId: string, updates: Partial<ECRFFormInstance>) => void;
  saveFieldValue: (instanceId: string, fieldOID: string, value: ECRFFieldValue) => void;
  submitForm: (instanceId: string) => void;
  
  // Workflow actions
  freezeFormInstance: (instanceId: string, frozenBy: string) => void;
  unfreezeFormInstance: (instanceId: string, unfrozenBy: string, reason: string) => void;
  lockFormInstance: (instanceId: string, lockedBy: string) => void;
  unlockFormInstance: (instanceId: string, unlockedBy: string, reason: string) => void;
  signFormInstance: (instanceId: string, signedBy: string, reason: string) => void;
  completeSDV: (instanceId: string, sdvBy: string, fieldOIDs?: string[]) => void;
  
  // UI actions
  setSelectedForm: (formId: string | null) => void;
  setSelectedCheck: (checkId: string | null) => void;
  setSelectedInstance: (instanceId: string | null) => void;
  setActiveView: (view: ECRFView) => void;
  setFormBuilderMode: (mode: 'Design' | 'Preview' | 'Test') => void;
  setFilters: (filters: Partial<ECRFFilters>) => void;
  clearFilters: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique eCRF ID
 */
export const generateECRFId = (prefix: string = 'ecrf'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generate OID for forms, fields, etc.
 */
export const generateOID = (type: 'form' | 'section' | 'field' | 'codelist' | 'check' | 'visit'): string => {
  const prefixes = {
    form: 'F',
    section: 'S',
    field: 'IT',
    codelist: 'CL',
    check: 'EC',
    visit: 'V',
  };
  return `${prefixes[type]}.${Date.now().toString(36).toUpperCase()}.${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
};

/**
 * Create default field based on data type
 */
export const createDefaultField = (dataType: ECRFDataType, name: string): Partial<ECRFField> => {
  const baseField: Partial<ECRFField> = {
    name,
    label: name,
    dataType,
    isRequired: false,
    isReadOnly: false,
    isHidden: false,
    allowOther: false,
    allowPartialDate: false,
    allowFutureDate: true,
    multiLine: false,
    queryEnabled: true,
    autoQueryOnBlank: false,
    requiresSDV: false,
    editCheckIds: [],
  };
  
  switch (dataType) {
    case 'text':
      return { ...baseField, maxLength: 200, fieldWidth: 'medium' };
    case 'textarea':
      return { ...baseField, multiLine: true, rows: 4, maxLength: 2000, fieldWidth: 'full' };
    case 'integer':
      return { ...baseField, fieldWidth: 'small' };
    case 'float':
      return { ...baseField, significantDigits: 2, fieldWidth: 'small' };
    case 'date':
      return { ...baseField, dateFormat: 'YYYY-MM-DD', allowFutureDate: false, fieldWidth: 'medium' };
    case 'partialDate':
      return { ...baseField, allowPartialDate: true, fieldWidth: 'medium' };
    case 'datetime':
      return { ...baseField, dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', fieldWidth: 'medium' };
    case 'time':
      return { ...baseField, timeFormat: 'HH:mm', fieldWidth: 'small' };
    case 'boolean':
      return { ...baseField, fieldWidth: 'small' };
    case 'codedValue':
      return { ...baseField, fieldWidth: 'medium' };
    case 'multiSelect':
      return { ...baseField, fieldWidth: 'large' };
    default:
      return baseField;
  }
};

/**
 * Validate form structure
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateForm = (form: ECRFForm): FormValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!form.formOID || form.formOID.trim() === '') {
    errors.push('Form OID is required');
  }
  if (!form.name || form.name.trim() === '') {
    errors.push('Form name is required');
  }
  if (!form.label || form.label.trim() === '') {
    errors.push('Form label is required');
  }
  
  // Sections
  if (!form.sections || form.sections.length === 0) {
    warnings.push('Form has no sections');
  } else {
    form.sections.forEach((section, idx) => {
      if (!section.sectionOID) {
        errors.push(`Section ${idx + 1} is missing OID`);
      }
      if (!section.fields || section.fields.length === 0) {
        warnings.push(`Section "${section.name || idx + 1}" has no fields`);
      }
    });
  }
  
  // Field validation
  const fieldOIDs = new Set<string>();
  form.sections?.forEach(section => {
    section.fields?.forEach(field => {
      if (!field.fieldOID) {
        errors.push(`Field "${field.name}" is missing OID`);
      } else if (fieldOIDs.has(field.fieldOID)) {
        errors.push(`Duplicate field OID: ${field.fieldOID}`);
      } else {
        fieldOIDs.add(field.fieldOID);
      }
      
      if (field.dataType === 'codedValue' && !field.codeListId) {
        warnings.push(`Field "${field.name}" is coded but has no code list assigned`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate edit check definition
 */
export const validateEditCheck = (check: ECRFEditCheck): FormValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!check.checkOID) {
    errors.push('Check OID is required');
  }
  if (!check.name) {
    errors.push('Check name is required');
  }
  if (!check.description) {
    warnings.push('Check description is recommended');
  }
  
  // Rule validation
  switch (check.ruleType) {
    case 'Condition':
      if (!check.condition) {
        errors.push('Condition is required for condition-based checks');
      }
      break;
    case 'Expression':
      if (!check.expression) {
        errors.push('Expression is required for expression-based checks');
      }
      break;
    case 'CrossForm':
      if (!check.crossFormRule) {
        errors.push('Cross-form rule definition is required');
      }
      break;
    case 'RangeCheck':
      if (!check.rangeRule) {
        errors.push('Range rule definition is required');
      }
      break;
  }
  
  // Query settings validation
  if (check.actionType === 'AutoQuery' && !check.querySettings) {
    errors.push('Query settings required when action is AutoQuery');
  }
  if (check.querySettings && !check.querySettings.queryText) {
    errors.push('Query text is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// STANDARD EDIT CHECK TEMPLATES
// ============================================================================

/**
 * Standard Edit Check Templates
 */
export const STANDARD_EDIT_CHECK_TEMPLATES: Record<string, Partial<ECRFEditCheck>> = {
  RequiredField: {
    name: 'Required Field Check',
    checkType: 'RequiredField',
    category: 'Completeness',
    timing: 'OnSave',
    actionType: 'AutoQuery',
    querySettings: {
      queryText: 'Please provide a value for this required field.',
      queryRecipient: 'Site',
      queryPriority: 'Medium',
      autoClose: true,
    },
  },
  DateRange: {
    name: 'Date Range Check',
    checkType: 'DateLogic',
    category: 'Logic',
    timing: 'OnEntry',
    actionType: 'Warn',
    messageSettings: {
      messageType: 'Warning',
      messageText: 'The entered date appears to be outside the expected range.',
    },
  },
  NumericRange: {
    name: 'Numeric Range Check',
    checkType: 'RangeCheck',
    category: 'Range',
    timing: 'OnEntry',
    actionType: 'AutoQuery',
    querySettings: {
      queryText: 'The entered value is outside the expected range. Please verify.',
      queryRecipient: 'Site',
      queryPriority: 'High',
      autoClose: false,
    },
  },
  FutureDate: {
    name: 'Future Date Check',
    checkType: 'DateLogic',
    category: 'Logic',
    timing: 'OnEntry',
    actionType: 'Block',
    messageSettings: {
      messageType: 'Error',
      messageText: 'Future dates are not allowed for this field.',
    },
  },
  EndBeforeStart: {
    name: 'End Date Before Start Date',
    checkType: 'CrossField',
    category: 'Logic',
    timing: 'OnSave',
    actionType: 'AutoQuery',
    querySettings: {
      queryText: 'End date cannot be before start date. Please correct.',
      queryRecipient: 'Site',
      queryPriority: 'High',
      autoClose: false,
    },
  },
  ConcomitantMedIndication: {
    name: 'Concomitant Med Requires Indication',
    checkType: 'CrossField',
    category: 'Completeness',
    timing: 'OnSave',
    actionType: 'AutoQuery',
    querySettings: {
      queryText: 'Please provide the indication for this concomitant medication.',
      queryRecipient: 'Site',
      queryPriority: 'Medium',
      autoClose: true,
    },
  },
  AESeriousCriteria: {
    name: 'Serious AE Requires Criteria',
    checkType: 'CrossField',
    category: 'Safety',
    timing: 'OnSave',
    actionType: 'Block',
    messageSettings: {
      messageType: 'Error',
      messageText: 'At least one seriousness criterion must be selected for serious adverse events.',
    },
  },
};
