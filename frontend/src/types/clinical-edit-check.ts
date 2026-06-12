
/**
 * Clinical Edit Check Types
 * Sophisticated validation system for EDC data quality
 * @version 0.20.4.1
 * 
 * Edit checks are the secret sauce of EDC systems. Medidata Rave requires
 * programming. Ligature provides visual building with these underlying types.
 */

// ============================================================================
// Extended Field Control Types
// ============================================================================

/**
 * Extended field control types beyond basic data types
 * These determine how a field is rendered and behaves in the UI
 */
export type FieldControlType =
  | 'TEXT_INPUT'          // Single-line text
  | 'TEXTAREA'            // Multi-line text
  | 'INTEGER_INPUT'       // Whole number
  | 'DECIMAL_INPUT'       // Decimal number with precision
  | 'DATE_PICKER'         // Date selection
  | 'TIME_PICKER'         // Time selection
  | 'DATETIME_PICKER'     // Combined date/time
  | 'PARTIAL_DATE'        // UN/UNK allowed for day/month
  | 'DROPDOWN'            // Single select from codelist
  | 'RADIO'               // Radio buttons for short codelists
  | 'CHECKBOX'            // Single yes/no checkbox
  | 'CHECKBOX_GROUP'      // Multiple selection
  | 'SLIDER'              // Numeric slider (e.g., pain scale)
  | 'FILE_UPLOAD'         // Document attachment
  | 'SIGNATURE'           // E-signature capture
  | 'CALCULATED'          // Derived from other fields
  | 'LAB_VALUE'           // Lab result with units and ranges
  | 'DICTIONARY_LOOKUP'   // MedDRA, WHO Drug, etc.
  | 'SUBJECT_ID'          // Auto-generated subject ID
  | 'RANDOMIZATION';      // Randomization number

export const FIELD_CONTROL_TYPES: FieldControlType[] = [
  'TEXT_INPUT', 'TEXTAREA', 'INTEGER_INPUT', 'DECIMAL_INPUT',
  'DATE_PICKER', 'TIME_PICKER', 'DATETIME_PICKER', 'PARTIAL_DATE',
  'DROPDOWN', 'RADIO', 'CHECKBOX', 'CHECKBOX_GROUP', 'SLIDER',
  'FILE_UPLOAD', 'SIGNATURE', 'CALCULATED', 'LAB_VALUE',
  'DICTIONARY_LOOKUP', 'SUBJECT_ID', 'RANDOMIZATION'
];

// ============================================================================
// Edit Check Categories
// ============================================================================

/**
 * Categories of edit checks - determines the check logic type
 */
export type EditCheckCategory =
  | 'RANGE'               // Value within min/max bounds
  | 'FORMAT'              // Pattern/format validation
  | 'REQUIRED'            // Conditional requirement
  | 'CROSS_FIELD'         // Relationship between fields
  | 'CROSS_FORM'          // Relationship across forms
  | 'TEMPORAL'            // Date/time logic
  | 'CONSISTENCY'         // Logical consistency
  | 'DICTIONARY'          // External dictionary validation
  | 'LAB_RANGE'           // Lab normal ranges
  | 'CALCULATION'         // Computed/derived values
  | 'EXTERNAL'            // External system lookup
  | 'CUSTOM';             // Custom expression

export const EDIT_CHECK_CATEGORIES: EditCheckCategory[] = [
  'RANGE', 'FORMAT', 'REQUIRED', 'CROSS_FIELD', 'CROSS_FORM',
  'TEMPORAL', 'CONSISTENCY', 'DICTIONARY', 'LAB_RANGE',
  'CALCULATION', 'EXTERNAL', 'CUSTOM'
];

// ============================================================================
// Comparison Operators
// ============================================================================

export type ComparisonOperator =
  | 'EQ'                  // Equal
  | 'NE'                  // Not equal
  | 'GT'                  // Greater than
  | 'GE'                  // Greater than or equal
  | 'LT'                  // Less than
  | 'LE'                  // Less than or equal
  | 'IN'                  // In list
  | 'NOT_IN'              // Not in list
  | 'BETWEEN'             // Between two values
  | 'NOT_BETWEEN'         // Not between
  | 'CONTAINS'            // String contains
  | 'NOT_CONTAINS'        // String does not contain
  | 'STARTS_WITH'         // String starts with
  | 'ENDS_WITH'           // String ends with
  | 'MATCHES'             // Regex match
  | 'IS_NULL'             // Is empty/null
  | 'IS_NOT_NULL'         // Is not empty/null
  | 'BEFORE'              // Date before
  | 'AFTER'               // Date after
  | 'WITHIN_DAYS'         // Within N days
  | 'SAME_DAY';           // Same date

export const COMPARISON_OPERATORS: ComparisonOperator[] = [
  'EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'IN', 'NOT_IN',
  'BETWEEN', 'NOT_BETWEEN', 'CONTAINS', 'NOT_CONTAINS',
  'STARTS_WITH', 'ENDS_WITH', 'MATCHES', 'IS_NULL', 'IS_NOT_NULL',
  'BEFORE', 'AFTER', 'WITHIN_DAYS', 'SAME_DAY'
];

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

// ============================================================================
// Edit Check Actions
// ============================================================================

/**
 * What happens when an edit check fires
 */
export type EditCheckAction =
  | 'HARD_ERROR'          // Block save, must fix
  | 'SOFT_ERROR'          // Allow save with reason
  | 'WARNING'             // Display warning, allow save
  | 'INFO'                // Informational message
  | 'AUTO_QUERY'          // Open automatic query
  | 'SET_VALUE'           // Set derived value
  | 'CLEAR_VALUE'         // Clear field value
  | 'ENABLE_FIELD'        // Enable a field
  | 'DISABLE_FIELD'       // Disable a field
  | 'SHOW_FIELD'          // Show hidden field
  | 'HIDE_FIELD'          // Hide visible field
  | 'REQUIRE_FIELD'       // Make field required
  | 'UNREQUIRE_FIELD'     // Remove required status
  | 'LOG_ONLY';           // Log for data review

export const EDIT_CHECK_ACTIONS: EditCheckAction[] = [
  'HARD_ERROR', 'SOFT_ERROR', 'WARNING', 'INFO', 'AUTO_QUERY',
  'SET_VALUE', 'CLEAR_VALUE', 'ENABLE_FIELD', 'DISABLE_FIELD',
  'SHOW_FIELD', 'HIDE_FIELD', 'REQUIRE_FIELD', 'UNREQUIRE_FIELD', 'LOG_ONLY'
];

// ============================================================================
// Check Timing
// ============================================================================

export type CheckTiming =
  | 'ON_CHANGE'           // When field value changes
  | 'ON_BLUR'             // When field loses focus
  | 'ON_SAVE'             // Before form save
  | 'ON_COMPLETE'         // When form marked complete
  | 'ON_FREEZE'           // Before form freeze
  | 'BATCH';              // During batch processing

export const CHECK_TIMINGS: CheckTiming[] = [
  'ON_CHANGE', 'ON_BLUR', 'ON_SAVE', 'ON_COMPLETE', 'ON_FREEZE', 'BATCH'
];

// ============================================================================
// Field Reference
// ============================================================================

/**
 * Reference to a field for cross-field/cross-form checks
 */
export interface FieldReference {
  formOID?: string;           // Form OID (current form if omitted)
  sectionId?: string;         // Section ID (for repeating sections)
  fieldOID: string;           // Field OID
  repeatIndex?: number;       // Specific repeat instance
  repeatRelation?: 'SAME' | 'ANY' | 'ALL' | 'FIRST' | 'LAST' | 'PREVIOUS';
}

/**
 * Value source for comparisons - can be literal, field, or system value
 */
export interface ValueSource {
  type: 'LITERAL' | 'FIELD' | 'SYSTEM' | 'CALCULATION';
  
  // For LITERAL
  literalValue?: string | number | boolean | null;
  
  // For FIELD
  fieldReference?: FieldReference;
  
  // For SYSTEM
  systemVariable?: 
    | 'CURRENT_DATE'
    | 'CURRENT_TIME'
    | 'CURRENT_DATETIME'
    | 'SUBJECT_AGE'
    | 'SUBJECT_SEX'
    | 'STUDY_START_DATE'
    | 'ENROLLMENT_DATE'
    | 'RANDOMIZATION_DATE'
    | 'FIRST_DOSE_DATE'
    | 'LAST_DOSE_DATE'
    | 'VISIT_DATE'
    | 'USER_ID'
    | 'SITE_ID';
  
  // For CALCULATION
  calculationExpression?: string;
}

// ============================================================================
// Check Condition
// ============================================================================

/**
 * A single condition in an edit check
 */
export interface CheckCondition {
  id: string;
  
  // Left side of comparison
  leftOperand: ValueSource;
  
  // Operator
  operator: ComparisonOperator;
  
  // Right side of comparison
  rightOperand?: ValueSource;          // For most operators
  rightOperandSecondary?: ValueSource; // For BETWEEN
  
  // For collection operators (IN, NOT_IN)
  valueList?: (string | number)[];
  
  // For WITHIN_DAYS
  dayCount?: number;
}

/**
 * A group of conditions combined with logical operators
 */
export interface ConditionGroup {
  id: string;
  logicalOperator: LogicalOperator;
  conditions: (CheckCondition | ConditionGroup)[];
}

// ============================================================================
// Edit Check Definition
// ============================================================================

export type EditCheckStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';

/**
 * Complete edit check definition
 */
export interface EditCheckDefinition {
  id: string;
  studyId: string;
  tenantId: string;
  
  // Identification
  checkOID: string;             // Unique OID like "EC.AEDAT_AFTER_CONSENT"
  name: string;                 // Human-readable name
  description?: string;         // Detailed description
  category: EditCheckCategory;
  
  // Version control
  version: string;
  status: EditCheckStatus;
  
  // Scope - what forms/fields this check applies to
  scope: {
    formOIDs?: string[];        // Specific forms (all if empty)
    sectionIds?: string[];      // Specific sections
    fieldOIDs?: string[];       // Specific fields
  };
  
  // When to run
  timing: CheckTiming[];
  
  // Precondition - check only runs if this is true
  precondition?: ConditionGroup;
  
  // The actual check condition - fires action if TRUE
  checkCondition: ConditionGroup;
  
  // What happens when check fires
  actions: EditCheckActionConfig[];
  
  // Query configuration (for AUTO_QUERY action)
  queryConfig?: {
    queryText: string;
    queryCategory?: string;
    autoCloseOnChange: boolean;
  };
  
  // Derivation configuration (for SET_VALUE action)
  derivationConfig?: {
    targetFieldOID: string;
    expression: string;
  };
  
  // Bypass rules
  bypassable: boolean;         // Can user bypass with reason?
  bypassRoles?: string[];      // Roles that can bypass
  
  // Dependencies - checks that must run first
  dependsOn?: string[];        // Check IDs
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  activatedAt?: Date;
  activatedBy?: string;
}

export interface EditCheckActionConfig {
  action: EditCheckAction;
  message?: string;
  targetFieldOID?: string;     // For field-targeting actions
  setValue?: string | number;  // For SET_VALUE
  priority: number;            // Order of execution
}

// ============================================================================
// Edit Check Result
// ============================================================================

export type CheckResultStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'ERROR';

/**
 * Result of executing an edit check
 */
export interface EditCheckResult {
  checkId: string;
  checkOID: string;
  checkName: string;
  
  status: CheckResultStatus;
  
  // Failure details
  failedConditions?: CheckCondition[];
  
  // Action taken
  actionsTaken: {
    action: EditCheckAction;
    message?: string;
    targetField?: string;
    value?: string | number;
  }[];
  
  // For bypassed checks
  bypassed: boolean;
  bypassReason?: string;
  bypassedBy?: string;
  bypassedAt?: Date;
  
  // Execution details
  executedAt: Date;
  executionTimeMs: number;
  
  // Context
  formInstanceId: string;
  fieldOID?: string;
  sectionId?: string;
  repeatKey?: string;
}

// ============================================================================
// Lab Reference Ranges
// ============================================================================

export type LabRangeType = 
  | 'NORMAL'              // Normal range
  | 'PANIC_LOW'           // Critically low
  | 'PANIC_HIGH'          // Critically high
  | 'THERAPEUTIC'         // Therapeutic range
  | 'TOXIC';              // Toxic level

export type LabUnit = 
  | 'mg/dL' | 'mmol/L' | 'g/dL' | 'g/L' | 'U/L' | 'IU/L'
  | 'ng/mL' | 'pg/mL' | 'µg/L' | 'nmol/L' | 'pmol/L'
  | 'mEq/L' | 'mmHg' | '%' | 'cells/µL' | 'x10^9/L' | 'x10^12/L'
  | 'seconds' | 'ratio' | 'INR' | 'pH' | 'mOsm/kg' | 'mg/24h';

export interface LabReferenceRange {
  id: string;
  testCode: string;           // Lab test code
  testName: string;           // Lab test name
  
  // Range type
  rangeType: LabRangeType;
  
  // Bounds
  lowValue?: number;
  highValue?: number;
  unit: LabUnit;
  
  // Stratification
  sex?: 'M' | 'F';
  ageMin?: number;
  ageMax?: number;
  ageUnit?: 'YEARS' | 'MONTHS' | 'DAYS';
  
  // Fasting requirement
  fastingRequired?: boolean;
  
  // Source
  source?: string;            // Reference for range
  
  // Validity
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

/**
 * Lab value with context
 */
export interface LabValueResult {
  testCode: string;
  value: number;
  unit: LabUnit;
  
  // Range evaluation
  applicableRange?: LabReferenceRange;
  rangeStatus: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'UNKNOWN';
  percentFromNormal?: number;
  
  // Flags
  isCritical: boolean;
  requiresReview: boolean;
}

// ============================================================================
// Dictionary Types (MedDRA, WHO Drug, etc.)
// ============================================================================

export type DictionaryType = 
  | 'MEDDRA'              // Medical Dictionary for Regulatory Activities
  | 'WHO_DRUG'            // WHO Drug Dictionary
  | 'SNOMED_CT'           // SNOMED Clinical Terms
  | 'ICD_10'              // ICD-10 Codes
  | 'ICD_11'              // ICD-11 Codes
  | 'LOINC'               // Logical Observation Identifiers
  | 'CTCAE'               // Common Terminology Criteria for AE
  | 'CUSTOM';             // Custom dictionary

export interface DictionaryTerm {
  id: string;
  dictionaryType: DictionaryType;
  dictionaryVersion: string;
  
  // Term hierarchy (for hierarchical dictionaries like MedDRA)
  code: string;
  preferredTerm: string;
  
  // MedDRA-specific hierarchy
  lowLevelTerm?: string;      // LLT
  preferredTermCode?: string; // PT code
  highLevelTerm?: string;     // HLT
  highLevelGroupTerm?: string;// HLGT
  systemOrganClass?: string;  // SOC
  
  // WHO Drug-specific
  drugName?: string;
  atcCode?: string;
  atcText?: string;
  
  // Synonyms
  synonyms?: string[];
  
  // Status
  isActive: boolean;
  
  // Primary flag (for multi-axiality)
  isPrimary: boolean;
}

export interface DictionaryLookupResult {
  searchTerm: string;
  dictionaryType: DictionaryType;
  dictionaryVersion: string;
  matches: DictionaryTerm[];
  exactMatch?: DictionaryTerm;
  suggestedTerms?: DictionaryTerm[];
}

// ============================================================================
// Calculation Expression Types
// ============================================================================

export type CalculationFunction =
  | 'SUM'                 // Sum of values
  | 'AVG'                 // Average
  | 'MIN'                 // Minimum
  | 'MAX'                 // Maximum
  | 'COUNT'               // Count of values
  | 'DATEDIFF'            // Date difference
  | 'DATEADD'             // Add to date
  | 'AGE'                 // Calculate age
  | 'BMI'                 // BMI calculation
  | 'BSA'                 // Body surface area
  | 'CREATININE_CL'       // Creatinine clearance
  | 'EGFR'                // Estimated GFR
  | 'ROUND'               // Round number
  | 'ABS'                 // Absolute value
  | 'IF'                  // Conditional
  | 'COALESCE'            // First non-null
  | 'CONCAT';             // String concatenation

export interface CalculationExpression {
  id: string;
  name: string;
  description?: string;
  
  // Expression definition
  expression: string;        // e.g., "BMI(WEIGHT, HEIGHT)"
  
  // Parsed components
  function?: CalculationFunction;
  arguments?: ValueSource[];
  
  // Result
  resultDataType: 'INTEGER' | 'FLOAT' | 'DATE' | 'TEXT';
  resultPrecision?: number;  // Decimal places
  resultUnit?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isFieldControlType(value: unknown): value is FieldControlType {
  return typeof value === 'string' && FIELD_CONTROL_TYPES.includes(value as FieldControlType);
}

export function isEditCheckCategory(value: unknown): value is EditCheckCategory {
  return typeof value === 'string' && EDIT_CHECK_CATEGORIES.includes(value as EditCheckCategory);
}

export function isComparisonOperator(value: unknown): value is ComparisonOperator {
  return typeof value === 'string' && COMPARISON_OPERATORS.includes(value as ComparisonOperator);
}

export function isEditCheckAction(value: unknown): value is EditCheckAction {
  return typeof value === 'string' && EDIT_CHECK_ACTIONS.includes(value as EditCheckAction);
}

export function isCheckTiming(value: unknown): value is CheckTiming {
  return typeof value === 'string' && CHECK_TIMINGS.includes(value as CheckTiming);
}

export function isLabRangeType(value: unknown): value is LabRangeType {
  const validTypes: LabRangeType[] = ['NORMAL', 'PANIC_LOW', 'PANIC_HIGH', 'THERAPEUTIC', 'TOXIC'];
  return typeof value === 'string' && validTypes.includes(value as LabRangeType);
}

export function isDictionaryType(value: unknown): value is DictionaryType {
  const validTypes: DictionaryType[] = ['MEDDRA', 'WHO_DRUG', 'SNOMED_CT', 'ICD_10', 'ICD_11', 'LOINC', 'CTCAE', 'CUSTOM'];
  return typeof value === 'string' && validTypes.includes(value as DictionaryType);
}

export function isConditionGroup(item: CheckCondition | ConditionGroup): item is ConditionGroup {
  return 'logicalOperator' in item && 'conditions' in item;
}

export function isCheckCondition(item: CheckCondition | ConditionGroup): item is CheckCondition {
  return 'leftOperand' in item && 'operator' in item;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFieldReference(params: {
  fieldOID: string;
  formOID?: string;
  sectionId?: string;
  repeatIndex?: number;
  repeatRelation?: FieldReference['repeatRelation'];
}): FieldReference {
  return {
    fieldOID: params.fieldOID,
    formOID: params.formOID,
    sectionId: params.sectionId,
    repeatIndex: params.repeatIndex,
    repeatRelation: params.repeatRelation,
  };
}

export function createLiteralValue(value: string | number | boolean | null): ValueSource {
  return {
    type: 'LITERAL',
    literalValue: value,
  };
}

export function createFieldValue(fieldOID: string, formOID?: string): ValueSource {
  return {
    type: 'FIELD',
    fieldReference: { fieldOID, formOID },
  };
}

export function createSystemValue(systemVariable: ValueSource['systemVariable']): ValueSource {
  return {
    type: 'SYSTEM',
    systemVariable,
  };
}

export function createCheckCondition(params: {
  id?: string;
  leftOperand: ValueSource;
  operator: ComparisonOperator;
  rightOperand?: ValueSource;
  rightOperandSecondary?: ValueSource;
  valueList?: (string | number)[];
  dayCount?: number;
}): CheckCondition {
  return {
    id: params.id ?? crypto.randomUUID(),
    leftOperand: params.leftOperand,
    operator: params.operator,
    rightOperand: params.rightOperand,
    rightOperandSecondary: params.rightOperandSecondary,
    valueList: params.valueList,
    dayCount: params.dayCount,
  };
}

export function createConditionGroup(params: {
  id?: string;
  logicalOperator: LogicalOperator;
  conditions: (CheckCondition | ConditionGroup)[];
}): ConditionGroup {
  return {
    id: params.id ?? crypto.randomUUID(),
    logicalOperator: params.logicalOperator,
    conditions: params.conditions,
  };
}

export function createEditCheckDefinition(params: {
  id?: string;
  studyId: string;
  tenantId: string;
  checkOID: string;
  name: string;
  description?: string;
  category: EditCheckCategory;
  timing?: CheckTiming[];
  checkCondition: ConditionGroup;
  actions: EditCheckActionConfig[];
  createdBy: string;
}): EditCheckDefinition {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    studyId: params.studyId,
    tenantId: params.tenantId,
    checkOID: params.checkOID,
    name: params.name,
    description: params.description,
    category: params.category,
    version: '1.0',
    status: 'DRAFT',
    scope: {},
    timing: params.timing ?? ['ON_SAVE'],
    checkCondition: params.checkCondition,
    actions: params.actions,
    bypassable: false,
    createdAt: now,
    createdBy: params.createdBy,
    updatedAt: now,
    updatedBy: params.createdBy,
  };
}

export function createEditCheckActionConfig(params: {
  action: EditCheckAction;
  message?: string;
  targetFieldOID?: string;
  setValue?: string | number;
  priority?: number;
}): EditCheckActionConfig {
  return {
    action: params.action,
    message: params.message,
    targetFieldOID: params.targetFieldOID,
    setValue: params.setValue,
    priority: params.priority ?? 0,
  };
}

export function createEditCheckResult(params: {
  checkId: string;
  checkOID: string;
  checkName: string;
  formInstanceId: string;
  status: CheckResultStatus;
  fieldOID?: string;
  sectionId?: string;
  repeatKey?: string;
  actionsTaken?: EditCheckResult['actionsTaken'];
  executionTimeMs?: number;
}): EditCheckResult {
  return {
    checkId: params.checkId,
    checkOID: params.checkOID,
    checkName: params.checkName,
    formInstanceId: params.formInstanceId,
    status: params.status,
    fieldOID: params.fieldOID,
    sectionId: params.sectionId,
    repeatKey: params.repeatKey,
    actionsTaken: params.actionsTaken ?? [],
    bypassed: false,
    executedAt: new Date(),
    executionTimeMs: params.executionTimeMs ?? 0,
  };
}

export function createLabReferenceRange(params: {
  id?: string;
  testCode: string;
  testName: string;
  rangeType?: LabRangeType;
  lowValue?: number;
  highValue?: number;
  unit: LabUnit;
  sex?: 'M' | 'F';
  ageMin?: number;
  ageMax?: number;
}): LabReferenceRange {
  return {
    id: params.id ?? crypto.randomUUID(),
    testCode: params.testCode,
    testName: params.testName,
    rangeType: params.rangeType ?? 'NORMAL',
    lowValue: params.lowValue,
    highValue: params.highValue,
    unit: params.unit,
    sex: params.sex,
    ageMin: params.ageMin,
    ageMax: params.ageMax,
  };
}

export function createDictionaryTerm(params: {
  id?: string;
  dictionaryType: DictionaryType;
  dictionaryVersion: string;
  code: string;
  preferredTerm: string;
  lowLevelTerm?: string;
  highLevelTerm?: string;
  systemOrganClass?: string;
}): DictionaryTerm {
  return {
    id: params.id ?? crypto.randomUUID(),
    dictionaryType: params.dictionaryType,
    dictionaryVersion: params.dictionaryVersion,
    code: params.code,
    preferredTerm: params.preferredTerm,
    lowLevelTerm: params.lowLevelTerm,
    highLevelTerm: params.highLevelTerm,
    systemOrganClass: params.systemOrganClass,
    isActive: true,
    isPrimary: true,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getFieldControlTypeDisplayName(type: FieldControlType): string {
  const displayNames: Record<FieldControlType, string> = {
    TEXT_INPUT: 'Text Input',
    TEXTAREA: 'Text Area',
    INTEGER_INPUT: 'Integer',
    DECIMAL_INPUT: 'Decimal',
    DATE_PICKER: 'Date',
    TIME_PICKER: 'Time',
    DATETIME_PICKER: 'Date/Time',
    PARTIAL_DATE: 'Partial Date',
    DROPDOWN: 'Dropdown',
    RADIO: 'Radio Buttons',
    CHECKBOX: 'Checkbox',
    CHECKBOX_GROUP: 'Checkbox Group',
    SLIDER: 'Slider',
    FILE_UPLOAD: 'File Upload',
    SIGNATURE: 'Signature',
    CALCULATED: 'Calculated',
    LAB_VALUE: 'Lab Value',
    DICTIONARY_LOOKUP: 'Dictionary Lookup',
    SUBJECT_ID: 'Subject ID',
    RANDOMIZATION: 'Randomization',
  };
  return displayNames[type];
}

export function getEditCheckCategoryDisplayName(category: EditCheckCategory): string {
  const displayNames: Record<EditCheckCategory, string> = {
    RANGE: 'Range Check',
    FORMAT: 'Format Check',
    REQUIRED: 'Conditional Requirement',
    CROSS_FIELD: 'Cross-Field Check',
    CROSS_FORM: 'Cross-Form Check',
    TEMPORAL: 'Temporal Check',
    CONSISTENCY: 'Consistency Check',
    DICTIONARY: 'Dictionary Check',
    LAB_RANGE: 'Lab Range Check',
    CALCULATION: 'Calculation',
    EXTERNAL: 'External Lookup',
    CUSTOM: 'Custom Check',
  };
  return displayNames[category];
}

export function getComparisonOperatorDisplayName(operator: ComparisonOperator): string {
  const displayNames: Record<ComparisonOperator, string> = {
    EQ: 'equals',
    NE: 'not equals',
    GT: 'greater than',
    GE: 'greater than or equal to',
    LT: 'less than',
    LE: 'less than or equal to',
    IN: 'is in',
    NOT_IN: 'is not in',
    BETWEEN: 'is between',
    NOT_BETWEEN: 'is not between',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'does not contain',
    STARTS_WITH: 'starts with',
    ENDS_WITH: 'ends with',
    MATCHES: 'matches pattern',
    IS_NULL: 'is empty',
    IS_NOT_NULL: 'is not empty',
    BEFORE: 'is before',
    AFTER: 'is after',
    WITHIN_DAYS: 'is within days of',
    SAME_DAY: 'is same day as',
  };
  return displayNames[operator];
}

export function getEditCheckActionDisplayName(action: EditCheckAction): string {
  const displayNames: Record<EditCheckAction, string> = {
    HARD_ERROR: 'Block Save (Error)',
    SOFT_ERROR: 'Require Reason',
    WARNING: 'Show Warning',
    INFO: 'Show Info',
    AUTO_QUERY: 'Open Query',
    SET_VALUE: 'Set Value',
    CLEAR_VALUE: 'Clear Value',
    ENABLE_FIELD: 'Enable Field',
    DISABLE_FIELD: 'Disable Field',
    SHOW_FIELD: 'Show Field',
    HIDE_FIELD: 'Hide Field',
    REQUIRE_FIELD: 'Make Required',
    UNREQUIRE_FIELD: 'Make Optional',
    LOG_ONLY: 'Log Only',
  };
  return displayNames[action];
}

export function getCheckTimingDisplayName(timing: CheckTiming): string {
  const displayNames: Record<CheckTiming, string> = {
    ON_CHANGE: 'On Field Change',
    ON_BLUR: 'On Field Exit',
    ON_SAVE: 'On Form Save',
    ON_COMPLETE: 'On Form Complete',
    ON_FREEZE: 'On Form Freeze',
    BATCH: 'Batch Processing',
  };
  return displayNames[timing];
}

export function getLabRangeTypeDisplayName(type: LabRangeType): string {
  const displayNames: Record<LabRangeType, string> = {
    NORMAL: 'Normal Range',
    PANIC_LOW: 'Critical Low',
    PANIC_HIGH: 'Critical High',
    THERAPEUTIC: 'Therapeutic Range',
    TOXIC: 'Toxic Level',
  };
  return displayNames[type];
}

export function getDictionaryTypeDisplayName(type: DictionaryType): string {
  const displayNames: Record<DictionaryType, string> = {
    MEDDRA: 'MedDRA',
    WHO_DRUG: 'WHO Drug Dictionary',
    SNOMED_CT: 'SNOMED CT',
    ICD_10: 'ICD-10',
    ICD_11: 'ICD-11',
    LOINC: 'LOINC',
    CTCAE: 'CTCAE',
    CUSTOM: 'Custom Dictionary',
  };
  return displayNames[type];
}

/**
 * Check if a lab value is within normal range
 */
export function evaluateLabValue(
  value: number,
  ranges: LabReferenceRange[]
): LabValueResult['rangeStatus'] {
  const normalRange = ranges.find(r => r.rangeType === 'NORMAL');
  const panicLow = ranges.find(r => r.rangeType === 'PANIC_LOW');
  const panicHigh = ranges.find(r => r.rangeType === 'PANIC_HIGH');
  
  if (panicLow?.highValue !== undefined && value <= panicLow.highValue) {
    return 'CRITICAL_LOW';
  }
  if (panicHigh?.lowValue !== undefined && value >= panicHigh.lowValue) {
    return 'CRITICAL_HIGH';
  }
  if (normalRange) {
    if (normalRange.lowValue !== undefined && value < normalRange.lowValue) {
      return 'LOW';
    }
    if (normalRange.highValue !== undefined && value > normalRange.highValue) {
      return 'HIGH';
    }
    return 'NORMAL';
  }
  return 'UNKNOWN';
}

/**
 * Find applicable lab range based on demographics
 */
export function findApplicableLabRange(
  ranges: LabReferenceRange[],
  testCode: string,
  sex?: 'M' | 'F',
  age?: number
): LabReferenceRange | undefined {
  const applicableRanges = ranges.filter(r => {
    if (r.testCode !== testCode) return false;
    if (r.sex && sex && r.sex !== sex) return false;
    if (r.ageMin !== undefined && age !== undefined && age < r.ageMin) return false;
    if (r.ageMax !== undefined && age !== undefined && age > r.ageMax) return false;
    return true;
  });
  
  // Prefer most specific range (with sex and age stratification)
  return applicableRanges.sort((a, b) => {
    const aSpecificity = (a.sex ? 1 : 0) + (a.ageMin !== undefined ? 1 : 0);
    const bSpecificity = (b.sex ? 1 : 0) + (b.ageMin !== undefined ? 1 : 0);
    return bSpecificity - aSpecificity;
  })[0];
}

/**
 * Get all conditions in a condition group (flattened)
 */
export function flattenConditions(group: ConditionGroup): CheckCondition[] {
  const conditions: CheckCondition[] = [];
  
  for (const item of group.conditions) {
    if (isConditionGroup(item)) {
      conditions.push(...flattenConditions(item));
    } else {
      conditions.push(item);
    }
  }
  
  return conditions;
}

/**
 * Get all field references in an edit check
 */
export function getCheckFieldReferences(check: EditCheckDefinition): FieldReference[] {
  const references: FieldReference[] = [];
  
  function extractFromValueSource(source: ValueSource): void {
    if (source.type === 'FIELD' && source.fieldReference) {
      references.push(source.fieldReference);
    }
  }
  
  function extractFromCondition(condition: CheckCondition): void {
    extractFromValueSource(condition.leftOperand);
    if (condition.rightOperand) {
      extractFromValueSource(condition.rightOperand);
    }
    if (condition.rightOperandSecondary) {
      extractFromValueSource(condition.rightOperandSecondary);
    }
  }
  
  function extractFromGroup(group: ConditionGroup): void {
    for (const item of group.conditions) {
      if (isConditionGroup(item)) {
        extractFromGroup(item);
      } else {
        extractFromCondition(item);
      }
    }
  }
  
  if (check.precondition) {
    extractFromGroup(check.precondition);
  }
  extractFromGroup(check.checkCondition);
  
  return references;
}

/**
 * Check if edit check is a derivation (calculates a value)
 */
export function isDerivationCheck(check: EditCheckDefinition): boolean {
  return check.actions.some(a => a.action === 'SET_VALUE');
}

/**
 * Check if edit check can block form save
 */
export function isBlockingCheck(check: EditCheckDefinition): boolean {
  return check.actions.some(a => a.action === 'HARD_ERROR');
}

/**
 * Get the severity level of an edit check (based on actions)
 */
export function getCheckSeverity(check: EditCheckDefinition): 'ERROR' | 'WARNING' | 'INFO' {
  if (check.actions.some(a => a.action === 'HARD_ERROR' || a.action === 'SOFT_ERROR')) {
    return 'ERROR';
  }
  if (check.actions.some(a => a.action === 'WARNING' || a.action === 'AUTO_QUERY')) {
    return 'WARNING';
  }
  return 'INFO';
}
