
/**
 * Clinical Form Types
 * CRF (Case Report Form) and EDC form types
 * @version 0.20.0
 */

// ============================================================================
// Field Data Types
// ============================================================================

export type FieldDataType = 
  | 'TEXT'
  | 'INTEGER'
  | 'FLOAT'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'CODELIST'
  | 'PARTIAL_DATE';

export const FIELD_DATA_TYPES: FieldDataType[] = [
  'TEXT',
  'INTEGER',
  'FLOAT',
  'DATE',
  'TIME',
  'DATETIME',
  'BOOLEAN',
  'CODELIST',
  'PARTIAL_DATE',
];

// ============================================================================
// Form Status Types
// ============================================================================

export type FormDefinitionStatus = 'DRAFT' | 'APPROVED' | 'RETIRED';

export type FormStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FROZEN' | 'LOCKED';

export const FORM_STATUSES: FormStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETE',
  'FROZEN',
  'LOCKED',
];

export const FORM_STATUS_TRANSITIONS: Record<FormStatus, FormStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETE'],
  COMPLETE: ['FROZEN', 'IN_PROGRESS'], // Can reopen for corrections
  FROZEN: ['LOCKED', 'COMPLETE'], // Can unfreeze for corrections
  LOCKED: [], // Terminal state
};

// ============================================================================
// SDV and Signature Status
// ============================================================================

export type SDVStatus = 'NOT_REQUIRED' | 'PENDING' | 'PARTIAL' | 'COMPLETE';

export type SignatureStatus = 'NOT_REQUIRED' | 'PENDING' | 'SIGNED';

// ============================================================================
// Query Status
// ============================================================================

export type QueryStatus = 'OPEN' | 'ANSWERED' | 'CLOSED' | 'CANCELLED';

export type QueryType = 'MANUAL' | 'SYSTEM' | 'AUTO_QUERY';

// ============================================================================
// Codelist Types
// ============================================================================

export interface CodelistItem {
  codedValue: string;
  displayText: string;
  orderNumber: number;
  isDefault?: boolean;
  isActive: boolean;
}

export interface Codelist {
  id: string;
  name: string;
  description?: string;
  dataType: 'TEXT' | 'INTEGER';
  extensible: boolean;
  source?: 'CDISC' | 'MEDDRA' | 'WHO_DRUG' | 'SPONSOR' | 'CUSTOM';
  version?: string;
  items: CodelistItem[];
}

// ============================================================================
// Field Validation
// ============================================================================

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string; // Regex pattern
  patternMessage?: string;
  customRule?: string;
  customRuleMessage?: string;
}

// ============================================================================
// CRF Field
// ============================================================================

export interface CRFField {
  id: string;
  fieldOID: string; // CDISC-style OID
  label: string;
  shortLabel?: string;
  dataType: FieldDataType;
  
  // Requirements
  required: boolean;
  sdvRequired: boolean;
  
  // Validation
  validation?: FieldValidation;
  
  // Codelist (for CODELIST type)
  codelistId?: string;
  codelist?: Codelist;
  
  // Display
  order: number;
  helpText?: string;
  placeholder?: string;
  
  // Flags
  isHidden: boolean;
  isReadOnly: boolean;
  isKey: boolean; // Key field for repeating sections
  
  // Defaults
  defaultValue?: string | number | boolean;
}

// ============================================================================
// CRF Section
// ============================================================================

export interface CRFSection {
  id: string;
  name: string;
  description?: string;
  order: number;
  
  // Section behavior
  repeating: boolean;
  maxRepeats?: number;
  
  // Fields
  fields: CRFField[];
  
  // Display
  collapsible: boolean;
  collapsed: boolean;
  
  // Conditional display
  displayCondition?: string;
}

// ============================================================================
// Validation Rule
// ============================================================================

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  expression: string; // Rule expression
  errorMessage: string;
  severity: ValidationSeverity;
  
  // Scope
  fieldOIDs?: string[]; // Specific fields, or all if empty
  sectionIds?: string[];
  
  // Timing
  fireOnChange: boolean;
  fireOnSave: boolean;
  fireOnSubmit: boolean;
  
  // Status
  isActive: boolean;
}

// ============================================================================
// CRF Definition
// ============================================================================

export interface CRFDefinition {
  id: string;
  studyId: string;
  tenantId: string;
  
  // Identification
  formName: string;
  formOID: string; // CDISC OID
  version: string;
  versionDate: Date;
  
  // Status
  status: FormDefinitionStatus;
  
  // Structure
  sections: CRFSection[];
  
  // Validation
  validationRules: ValidationRule[];
  
  // Settings
  requiresSignature: boolean;
  sdvPercentage: number; // 0-100, percentage of fields requiring SDV
  
  // Annotations
  instructions?: string;
  completionGuidelines?: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Field Value
// ============================================================================

export interface FieldValue {
  fieldOID: string;
  sectionId: string;
  repeatKey?: string; // For repeating sections
  value: string | number | boolean | null;
  displayValue?: string; // Decoded codelist value
  
  // Audit
  enteredAt: Date;
  enteredBy: string;
  modifiedAt?: Date;
  modifiedBy?: string;
  changeReason?: string;
  
  // SDV
  sdvRequired: boolean;
  sdvCompleted: boolean;
  sdvCompletedAt?: Date;
  sdvCompletedBy?: string;
}

// ============================================================================
// Data Query
// ============================================================================

export interface DataQuery {
  id: string;
  formInstanceId: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  
  // Query details
  queryType: QueryType;
  status: QueryStatus;
  queryText: string;
  queryCategory?: string;
  
  // Response
  response?: string;
  
  // Timeline
  openedBy: string;
  openedDate: Date;
  answeredBy?: string;
  answeredDate?: Date;
  closedBy?: string;
  closedDate?: Date;
  
  // Auto-close
  autoClosedOnChange: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Audit Entry
// ============================================================================

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SIGN'
  | 'LOCK'
  | 'UNLOCK'
  | 'FREEZE'
  | 'UNFREEZE'
  | 'SDV'
  | 'QUERY_OPEN'
  | 'QUERY_ANSWER'
  | 'QUERY_CLOSE';

export interface AuditEntry {
  id: string;
  formInstanceId: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  
  // Field-level changes
  fieldOID?: string;
  sectionId?: string;
  repeatKey?: string;
  oldValue?: string;
  newValue?: string;
  
  // Reason
  reason?: string;
  
  // System info
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Form Instance
// ============================================================================

export interface FormInstance {
  id: string;
  definitionId: string;
  definitionVersion: string;
  
  // Context
  subjectId: string;
  subjectVisitId: string;
  studyId: string;
  siteId: string;
  tenantId: string;
  
  // Status
  status: FormStatus;
  
  // Data
  data: Record<string, FieldValue>; // Keyed by fieldOID or fieldOID:repeatKey
  
  // Queries
  queries: DataQuery[];
  openQueryCount: number;
  
  // SDV
  sdvStatus: SDVStatus;
  sdvProgress: number; // Percentage
  
  // Signature
  signatureStatus: SignatureStatus;
  signedAt?: Date;
  signedBy?: string;
  signatureId?: string;
  
  // Audit
  auditTrail: AuditEntry[];
  
  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  frozenAt?: Date;
  lockedAt?: Date;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isFieldDataType(value: unknown): value is FieldDataType {
  return typeof value === 'string' && FIELD_DATA_TYPES.includes(value as FieldDataType);
}

export function isFormStatus(value: unknown): value is FormStatus {
  return typeof value === 'string' && FORM_STATUSES.includes(value as FormStatus);
}

export function isValidFormStatusTransition(from: FormStatus, to: FormStatus): boolean {
  return FORM_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isQueryStatus(value: unknown): value is QueryStatus {
  const validStatuses: QueryStatus[] = ['OPEN', 'ANSWERED', 'CLOSED', 'CANCELLED'];
  return typeof value === 'string' && validStatuses.includes(value as QueryStatus);
}

export function isQueryType(value: unknown): value is QueryType {
  const validTypes: QueryType[] = ['MANUAL', 'SYSTEM', 'AUTO_QUERY'];
  return typeof value === 'string' && validTypes.includes(value as QueryType);
}

export function isSDVStatus(value: unknown): value is SDVStatus {
  const validStatuses: SDVStatus[] = ['NOT_REQUIRED', 'PENDING', 'PARTIAL', 'COMPLETE'];
  return typeof value === 'string' && validStatuses.includes(value as SDVStatus);
}

export function isValidationSeverity(value: unknown): value is ValidationSeverity {
  const validValues: ValidationSeverity[] = ['ERROR', 'WARNING', 'INFO'];
  return typeof value === 'string' && validValues.includes(value as ValidationSeverity);
}

export function isOIDFormat(value: string): boolean {
  // CDISC OID format: letters, numbers, underscores, periods
  const oidPattern = /^[A-Za-z][A-Za-z0-9_.]*$/;
  return oidPattern.test(value);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createCodelistItem(params: {
  codedValue: string;
  displayText: string;
  orderNumber: number;
  isDefault?: boolean;
}): CodelistItem {
  return {
    codedValue: params.codedValue,
    displayText: params.displayText,
    orderNumber: params.orderNumber,
    isDefault: params.isDefault ?? false,
    isActive: true,
  };
}

export function createCodelist(params: {
  id?: string;
  name: string;
  description?: string;
  items: CodelistItem[];
  source?: Codelist['source'];
}): Codelist {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    description: params.description,
    dataType: 'TEXT',
    extensible: false,
    source: params.source ?? 'SPONSOR',
    items: params.items,
  };
}

export function createCRFField(params: {
  id?: string;
  fieldOID: string;
  label: string;
  dataType: FieldDataType;
  required?: boolean;
  sdvRequired?: boolean;
  order?: number;
  validation?: FieldValidation;
  codelistId?: string;
}): CRFField {
  return {
    id: params.id ?? crypto.randomUUID(),
    fieldOID: params.fieldOID,
    label: params.label,
    dataType: params.dataType,
    required: params.required ?? false,
    sdvRequired: params.sdvRequired ?? false,
    validation: params.validation,
    codelistId: params.codelistId,
    order: params.order ?? 0,
    isHidden: false,
    isReadOnly: false,
    isKey: false,
  };
}

export function createCRFSection(params: {
  id?: string;
  name: string;
  order: number;
  fields?: CRFField[];
  repeating?: boolean;
}): CRFSection {
  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    order: params.order,
    repeating: params.repeating ?? false,
    fields: params.fields ?? [],
    collapsible: false,
    collapsed: false,
  };
}

export function createCRFDefinition(params: {
  id?: string;
  studyId: string;
  tenantId: string;
  formName: string;
  formOID: string;
  version?: string;
  sections?: CRFSection[];
  createdBy: string;
}): CRFDefinition {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    studyId: params.studyId,
    tenantId: params.tenantId,
    formName: params.formName,
    formOID: params.formOID,
    version: params.version ?? '1.0',
    versionDate: now,
    status: 'DRAFT',
    sections: params.sections ?? [],
    validationRules: [],
    requiresSignature: false,
    sdvPercentage: 100,
    createdAt: now,
    createdBy: params.createdBy,
    updatedAt: now,
    updatedBy: params.createdBy,
  };
}

export function createFormInstance(params: {
  id?: string;
  definitionId: string;
  definitionVersion: string;
  subjectId: string;
  subjectVisitId: string;
  studyId: string;
  siteId: string;
  tenantId: string;
  createdBy: string;
}): FormInstance {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    definitionId: params.definitionId,
    definitionVersion: params.definitionVersion,
    subjectId: params.subjectId,
    subjectVisitId: params.subjectVisitId,
    studyId: params.studyId,
    siteId: params.siteId,
    tenantId: params.tenantId,
    status: 'NOT_STARTED',
    data: {},
    queries: [],
    openQueryCount: 0,
    sdvStatus: 'PENDING',
    sdvProgress: 0,
    signatureStatus: 'NOT_REQUIRED',
    auditTrail: [],
    createdAt: now,
    createdBy: params.createdBy,
    updatedAt: now,
    updatedBy: params.createdBy,
  };
}

export function createDataQuery(params: {
  id?: string;
  formInstanceId: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  queryType: QueryType;
  queryText: string;
  openedBy: string;
}): DataQuery {
  const now = new Date();
  return {
    id: params.id ?? crypto.randomUUID(),
    formInstanceId: params.formInstanceId,
    fieldOID: params.fieldOID,
    sectionId: params.sectionId,
    repeatKey: params.repeatKey,
    queryType: params.queryType,
    status: 'OPEN',
    queryText: params.queryText,
    openedBy: params.openedBy,
    openedDate: now,
    autoClosedOnChange: params.queryType === 'AUTO_QUERY',
    createdAt: now,
    updatedAt: now,
  };
}

export function createAuditEntry(params: {
  id?: string;
  formInstanceId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  fieldOID?: string;
  sectionId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}): AuditEntry {
  return {
    id: params.id ?? crypto.randomUUID(),
    formInstanceId: params.formInstanceId,
    timestamp: new Date(),
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    fieldOID: params.fieldOID,
    sectionId: params.sectionId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    reason: params.reason,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getFormStatusDisplayName(status: FormStatus): string {
  const displayNames: Record<FormStatus, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    COMPLETE: 'Complete',
    FROZEN: 'Frozen',
    LOCKED: 'Locked',
  };
  return displayNames[status];
}

export function getQueryStatusDisplayName(status: QueryStatus): string {
  const displayNames: Record<QueryStatus, string> = {
    OPEN: 'Open',
    ANSWERED: 'Answered',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  };
  return displayNames[status];
}

export function getSDVStatusDisplayName(status: SDVStatus): string {
  const displayNames: Record<SDVStatus, string> = {
    NOT_REQUIRED: 'Not Required',
    PENDING: 'Pending',
    PARTIAL: 'Partial',
    COMPLETE: 'Complete',
  };
  return displayNames[status];
}

export function getFieldDataTypeDisplayName(type: FieldDataType): string {
  const displayNames: Record<FieldDataType, string> = {
    TEXT: 'Text',
    INTEGER: 'Integer',
    FLOAT: 'Decimal',
    DATE: 'Date',
    TIME: 'Time',
    DATETIME: 'Date/Time',
    BOOLEAN: 'Yes/No',
    CODELIST: 'Selection',
    PARTIAL_DATE: 'Partial Date',
  };
  return displayNames[type];
}

export function isFormEditable(form: FormInstance): boolean {
  return form.status === 'NOT_STARTED' || form.status === 'IN_PROGRESS';
}

export function isFormLocked(form: FormInstance): boolean {
  return form.status === 'LOCKED';
}

export function isFormFrozen(form: FormInstance): boolean {
  return form.status === 'FROZEN' || form.status === 'LOCKED';
}

export function hasOpenQueries(form: FormInstance): boolean {
  return form.openQueryCount > 0;
}

export function getOpenQueries(form: FormInstance): DataQuery[] {
  return form.queries.filter(q => q.status === 'OPEN');
}

export function getAnsweredQueries(form: FormInstance): DataQuery[] {
  return form.queries.filter(q => q.status === 'ANSWERED');
}

export function calculateSDVProgress(form: FormInstance, definition: CRFDefinition): number {
  const sdvFields = definition.sections
    .flatMap(s => s.fields)
    .filter(f => f.sdvRequired);
  
  if (sdvFields.length === 0) return 100;
  
  const completedSDV = Object.values(form.data).filter(v => v.sdvRequired && v.sdvCompleted).length;
  
  return Math.round((completedSDV / sdvFields.length) * 100);
}

export function getFormCompletionPercentage(form: FormInstance, definition: CRFDefinition): number {
  const requiredFields = definition.sections
    .flatMap(s => s.fields)
    .filter(f => f.required);
  
  if (requiredFields.length === 0) return 100;
  
  const completedFields = requiredFields.filter(f => {
    const value = form.data[f.fieldOID];
    return value && value.value !== null && value.value !== '';
  });
  
  return Math.round((completedFields.length / requiredFields.length) * 100);
}

export function getFieldKey(fieldOID: string, repeatKey?: string): string {
  return repeatKey ? `${fieldOID}:${repeatKey}` : fieldOID;
}

export function parseFieldKey(key: string): { fieldOID: string; repeatKey?: string } {
  const parts = key.split(':');
  return {
    fieldOID: parts[0],
    repeatKey: parts[1],
  };
}
