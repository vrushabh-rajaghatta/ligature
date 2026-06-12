
/**
 * Data Entry Service
 * Runtime form data entry with validation and audit trail
 * @version 0.20.5.1
 * 
 * Handles EDC data entry including:
 * - Form instance management
 * - Field value storage with audit trail
 * - Real-time edit check execution
 * - Form lifecycle (complete, freeze, lock, sign)
 * - Offline capability support
 */

import {
  FormInstance,
  FieldValue,
  FormStatus,
  CRFDefinition,
  CRFField,
  AuditEntry,
  createFormInstance,
  createAuditEntry,
  isFormEditable,
  isFormFrozen,
  isFormLocked,
  getFieldKey,
  parseFieldKey,
  FORM_STATUS_TRANSITIONS,
} from '@/types/clinical-form';

import {
  EditCheckCompilerService,
  createEditCheckCompilerService,
  CompiledEditCheck,
  EditCheckContext,
  BatchValidationResult,
  FieldValue as CheckFieldValue,
  IEditCheckCompilerService,
} from './edit-check-compiler';

import { EditCheckResult, CheckResultStatus } from '@/types/clinical-edit-check';

// ============================================================================
// Service Configuration
// ============================================================================

export interface DataEntryServiceConfig {
  tenantId: string;
  offlineSupport?: boolean;
  maxQueueSize?: number;
  autoSaveInterval?: number; // ms, 0 = disabled
}

// ============================================================================
// Form Instance Creation
// ============================================================================

export interface CreateFormInstanceParams {
  definitionId: string;
  definitionVersion: string;
  subjectId: string;
  subjectVisitId: string;
  studyId: string;
  siteId: string;
  userId: string;
}

// ============================================================================
// Field Value Operations
// ============================================================================

export interface SetFieldValueParams {
  formInstanceId: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  value: string | number | boolean | null;
  userId: string;
  userName: string;
  changeReason?: string;
  skipValidation?: boolean;
}

export interface SetFieldValueResult {
  success: boolean;
  fieldValue?: FieldValue;
  validationResults?: FieldValidationResult;
  auditEntry?: AuditEntry;
  formStatusChanged?: boolean;
  errors?: SetFieldValueError[];
}

export interface SetFieldValueError {
  code: string;
  message: string;
  fieldOID?: string;
}

export interface SetFieldValuesParams {
  formInstanceId: string;
  values: Array<{
    fieldOID: string;
    sectionId: string;
    repeatKey?: string;
    value: string | number | boolean | null;
  }>;
  userId: string;
  userName: string;
  changeReason?: string;
  skipValidation?: boolean;
}

export interface SetFieldValuesResult {
  success: boolean;
  results: SetFieldValueResult[];
  formValidationResult?: FormValidationResult;
  formStatusChanged?: boolean;
  errors?: SetFieldValueError[];
}

// ============================================================================
// Validation Results
// ============================================================================

export interface FieldValidationResult {
  isValid: boolean;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  checkResults: EditCheckResult[];
  hasBlockingError: boolean;
  hasWarning: boolean;
}

export interface FormValidationResult {
  isValid: boolean;
  formInstanceId: string;
  totalFields: number;
  validatedFields: number;
  fieldsWithErrors: number;
  fieldsWithWarnings: number;
  fieldResults: FieldValidationResult[];
  batchResult?: BatchValidationResult;
}

// ============================================================================
// Form Lifecycle
// ============================================================================

export interface SignFormParams {
  formInstanceId: string;
  userId: string;
  userName: string;
  signatureType: 'ELECTRONIC' | 'WET_INK';
  signatureData?: string;
  attestation?: string;
}

export interface SignatureInfo {
  signatureId: string;
  signatureType: 'ELECTRONIC' | 'WET_INK';
  signedAt: Date;
  signedBy: string;
  signedByName: string;
  attestation?: string;
}

// ============================================================================
// Offline Support
// ============================================================================

export type OfflineOperationType = 
  | 'SET_VALUE'
  | 'SET_VALUES'
  | 'CLEAR_VALUE'
  | 'COMPLETE_FORM'
  | 'REOPEN_FORM'
  | 'ADD_REPEAT';

export interface OfflineOperation {
  id: string;
  operationType: OfflineOperationType;
  formInstanceId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  userId: string;
  retryCount: number;
  lastError?: string;
}

export interface QueueProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: Array<{
    operationId: string;
    error: string;
  }>;
}

// ============================================================================
// Filter and List Options
// ============================================================================

export interface FormInstanceFilter {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  subjectVisitId?: string;
  definitionId?: string;
  status?: FormStatus | FormStatus[];
  hasOpenQueries?: boolean;
  requiresSignature?: boolean;
  sdvStatus?: 'PENDING' | 'COMPLETE';
}

// ============================================================================
// Statistics
// ============================================================================

export interface DataEntryStats {
  totalFormInstances: number;
  byStatus: Record<FormStatus, number>;
  formsWithOpenQueries: number;
  pendingSignatures: number;
  offlineQueueSize: number;
  averageCompletionTime: number; // ms
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IDataEntryService {
  // Form Instance Management
  createFormInstance(params: CreateFormInstanceParams): Promise<FormInstance>;
  getFormInstance(id: string): FormInstance | undefined;
  listFormInstances(filter?: FormInstanceFilter): FormInstance[];
  deleteFormInstance(id: string): Promise<void>;
  
  // Form Definition Management
  setFormDefinition(definition: CRFDefinition): void;
  getFormDefinition(id: string): CRFDefinition | undefined;
  
  // Field Data Entry
  setFieldValue(params: SetFieldValueParams): Promise<SetFieldValueResult>;
  setFieldValues(params: SetFieldValuesParams): Promise<SetFieldValuesResult>;
  clearFieldValue(formInstanceId: string, fieldOID: string, sectionId: string, repeatKey: string | undefined, userId: string, userName: string): Promise<void>;
  getFieldValue(formInstanceId: string, fieldKey: string): FieldValue | undefined;
  
  // Repeating Sections
  addRepeatInstance(formInstanceId: string, sectionId: string, userId: string, userName: string): Promise<string>;
  removeRepeatInstance(formInstanceId: string, sectionId: string, repeatKey: string, userId: string, userName: string): Promise<void>;
  getRepeatKeys(formInstanceId: string, sectionId: string): string[];
  
  // Validation
  validateField(formInstanceId: string, fieldOID: string, sectionId: string, repeatKey?: string): FieldValidationResult;
  validateForm(formInstanceId: string): FormValidationResult;
  setEditChecks(checks: CompiledEditCheck[]): void;
  getFieldEditChecks(fieldOID: string): CompiledEditCheck[];
  
  // Form Lifecycle
  completeForm(formInstanceId: string, userId: string, userName: string): Promise<FormInstance>;
  reopenForm(formInstanceId: string, userId: string, userName: string, reason: string): Promise<FormInstance>;
  freezeForm(formInstanceId: string, userId: string, userName: string): Promise<FormInstance>;
  unfreezeForm(formInstanceId: string, userId: string, userName: string, reason: string): Promise<FormInstance>;
  lockForm(formInstanceId: string, userId: string, userName: string): Promise<FormInstance>;
  signForm(params: SignFormParams): Promise<FormInstance>;
  
  // Offline Support
  queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): void;
  getQueuedOperations(): OfflineOperation[];
  processQueue(): Promise<QueueProcessingResult>;
  clearQueue(): void;
  getQueueSize(): number;
  
  // Statistics
  getStats(): DataEntryStats;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class DataEntryService implements IDataEntryService {
  private readonly config: Required<DataEntryServiceConfig>;
  private readonly formInstances: Map<string, FormInstance> = new Map();
  private readonly formDefinitions: Map<string, CRFDefinition> = new Map();
  private readonly editChecks: Map<string, CompiledEditCheck> = new Map();
  private readonly fieldToChecks: Map<string, string[]> = new Map(); // fieldOID -> checkIds
  private readonly offlineQueue: OfflineOperation[] = [];
  private readonly repeatCounters: Map<string, number> = new Map(); // formId:sectionId -> counter
  private readonly activeRepeatKeys: Map<string, Set<string>> = new Map(); // formId:sectionId -> Set<repeatKey>
  private readonly compiler: IEditCheckCompilerService;
  private readonly signatures: Map<string, SignatureInfo> = new Map();
  
  constructor(config: DataEntryServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      offlineSupport: config.offlineSupport ?? true,
      maxQueueSize: config.maxQueueSize ?? 1000,
      autoSaveInterval: config.autoSaveInterval ?? 0,
    };
    
    this.compiler = createEditCheckCompilerService({ tenantId: config.tenantId });
  }
  
  // --------------------------------------------------------------------------
  // Form Instance Management
  // --------------------------------------------------------------------------
  
  async createFormInstance(params: CreateFormInstanceParams): Promise<FormInstance> {
    const definition = this.formDefinitions.get(params.definitionId);
    if (!definition) {
      throw new Error(`Form definition not found: ${params.definitionId}`);
    }
    
    const instance = createFormInstance({
      definitionId: params.definitionId,
      definitionVersion: params.definitionVersion,
      subjectId: params.subjectId,
      subjectVisitId: params.subjectVisitId,
      studyId: params.studyId,
      siteId: params.siteId,
      tenantId: this.config.tenantId,
      createdBy: params.userId,
    });
    
    // Set signature requirement from definition
    if (definition.requiresSignature) {
      instance.signatureStatus = 'PENDING';
    }
    
    // Create initial audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId: params.userId,
      userName: params.userId, // Will be resolved by caller
      action: 'CREATE',
    });
    instance.auditTrail.push(auditEntry);
    
    this.formInstances.set(instance.id, instance);
    return instance;
  }
  
  getFormInstance(id: string): FormInstance | undefined {
    return this.formInstances.get(id);
  }
  
  listFormInstances(filter?: FormInstanceFilter): FormInstance[] {
    let results = Array.from(this.formInstances.values());
    
    if (!filter) return results;
    
    if (filter.studyId) {
      results = results.filter(f => f.studyId === filter.studyId);
    }
    if (filter.siteId) {
      results = results.filter(f => f.siteId === filter.siteId);
    }
    if (filter.subjectId) {
      results = results.filter(f => f.subjectId === filter.subjectId);
    }
    if (filter.subjectVisitId) {
      results = results.filter(f => f.subjectVisitId === filter.subjectVisitId);
    }
    if (filter.definitionId) {
      results = results.filter(f => f.definitionId === filter.definitionId);
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(f => statuses.includes(f.status));
    }
    if (filter.hasOpenQueries !== undefined) {
      results = results.filter(f => 
        filter.hasOpenQueries ? f.openQueryCount > 0 : f.openQueryCount === 0
      );
    }
    if (filter.requiresSignature !== undefined) {
      results = results.filter(f =>
        filter.requiresSignature 
          ? f.signatureStatus === 'PENDING'
          : f.signatureStatus !== 'PENDING'
      );
    }
    if (filter.sdvStatus) {
      results = results.filter(f =>
        filter.sdvStatus === 'PENDING'
          ? f.sdvStatus === 'PENDING' || f.sdvStatus === 'PARTIAL'
          : f.sdvStatus === 'COMPLETE'
      );
    }
    
    return results;
  }
  
  async deleteFormInstance(id: string): Promise<void> {
    const instance = this.formInstances.get(id);
    if (!instance) {
      throw new Error(`Form instance not found: ${id}`);
    }
    
    if (isFormLocked(instance)) {
      throw new Error('Cannot delete a locked form instance');
    }
    
    this.formInstances.delete(id);
    
    // Clean up repeat counters and active keys
    for (const key of Array.from(Array.from(this.repeatCounters.keys()))) {
      if (key.startsWith(`${id}:`)) {
        this.repeatCounters.delete(key);
      }
    }
    for (const key of Array.from(Array.from(this.activeRepeatKeys.keys()))) {
      if (key.startsWith(`${id}:`)) {
        this.activeRepeatKeys.delete(key);
      }
    }
  }
  
  // --------------------------------------------------------------------------
  // Form Definition Management
  // --------------------------------------------------------------------------
  
  setFormDefinition(definition: CRFDefinition): void {
    this.formDefinitions.set(definition.id, definition);
  }
  
  getFormDefinition(id: string): CRFDefinition | undefined {
    return this.formDefinitions.get(id);
  }
  
  // --------------------------------------------------------------------------
  // Field Data Entry
  // --------------------------------------------------------------------------
  
  async setFieldValue(params: SetFieldValueParams): Promise<SetFieldValueResult> {
    const instance = this.formInstances.get(params.formInstanceId);
    if (!instance) {
      return {
        success: false,
        errors: [{ code: 'FORM_NOT_FOUND', message: `Form instance not found: ${params.formInstanceId}` }],
      };
    }
    
    // Check if form is editable
    if (!isFormEditable(instance)) {
      return {
        success: false,
        errors: [{ 
          code: 'FORM_NOT_EDITABLE', 
          message: `Form is ${instance.status} and cannot be edited`,
          fieldOID: params.fieldOID,
        }],
      };
    }
    
    const definition = this.formDefinitions.get(instance.definitionId);
    if (!definition) {
      return {
        success: false,
        errors: [{ code: 'DEFINITION_NOT_FOUND', message: 'Form definition not found' }],
      };
    }
    
    // Find the field definition
    const field = this.findField(definition, params.sectionId, params.fieldOID);
    if (!field) {
      return {
        success: false,
        errors: [{ 
          code: 'FIELD_NOT_FOUND', 
          message: `Field not found: ${params.fieldOID}`,
          fieldOID: params.fieldOID,
        }],
      };
    }
    
    // Field-level validation (type, range, etc.)
    const typeValidation = this.validateFieldType(field, params.value);
    if (!typeValidation.isValid) {
      return {
        success: false,
        errors: typeValidation.errors,
      };
    }
    
    // Get existing value for audit
    const fieldKey = getFieldKey(params.fieldOID, params.repeatKey);
    const existingValue = instance.data[fieldKey];
    const oldValue = existingValue?.value;
    
    // Check if value actually changed
    const valueChanged = oldValue !== params.value;
    
    // Create field value
    const now = new Date();
    const fieldValue: FieldValue = {
      fieldOID: params.fieldOID,
      sectionId: params.sectionId,
      repeatKey: params.repeatKey,
      value: params.value,
      enteredAt: existingValue?.enteredAt ?? now,
      enteredBy: existingValue?.enteredBy ?? params.userId,
      modifiedAt: valueChanged ? now : existingValue?.modifiedAt,
      modifiedBy: valueChanged ? params.userId : existingValue?.modifiedBy,
      changeReason: valueChanged ? params.changeReason : existingValue?.changeReason,
      sdvRequired: field.sdvRequired,
      sdvCompleted: existingValue?.sdvCompleted ?? false,
      sdvCompletedAt: existingValue?.sdvCompletedAt,
      sdvCompletedBy: existingValue?.sdvCompletedBy,
    };
    
    // Store field value
    instance.data[fieldKey] = fieldValue;
    
    // Update form status if first entry
    let formStatusChanged = false;
    if (instance.status === 'NOT_STARTED') {
      instance.status = 'IN_PROGRESS';
      instance.startedAt = now;
      formStatusChanged = true;
    }
    
    // Create audit entry if value changed
    let auditEntry: AuditEntry | undefined;
    if (valueChanged) {
      auditEntry = createAuditEntry({
        formInstanceId: instance.id,
        userId: params.userId,
        userName: params.userName,
        action: existingValue ? 'UPDATE' : 'CREATE',
        fieldOID: params.fieldOID,
        sectionId: params.sectionId,
        oldValue: oldValue !== undefined ? String(oldValue) : undefined,
        newValue: params.value !== null ? String(params.value) : undefined,
        reason: params.changeReason,
      });
      instance.auditTrail.push(auditEntry);
    }
    
    // Update timestamps
    instance.updatedAt = now;
    instance.updatedBy = params.userId;
    
    // Run edit check validation (unless skipped)
    let validationResults: FieldValidationResult | undefined;
    if (!params.skipValidation) {
      validationResults = this.validateField(
        params.formInstanceId,
        params.fieldOID,
        params.sectionId,
        params.repeatKey
      );
    }
    
    // Check for auto-close queries
    if (valueChanged) {
      this.autoCloseQueries(instance, params.fieldOID, params.sectionId, params.repeatKey);
    }
    
    return {
      success: true,
      fieldValue,
      validationResults,
      auditEntry,
      formStatusChanged,
    };
  }
  
  async setFieldValues(params: SetFieldValuesParams): Promise<SetFieldValuesResult> {
    const results: SetFieldValueResult[] = [];
    const errors: SetFieldValueError[] = [];
    let formStatusChanged = false;
    
    for (const valueSpec of params.values) {
      const result = await this.setFieldValue({
        formInstanceId: params.formInstanceId,
        fieldOID: valueSpec.fieldOID,
        sectionId: valueSpec.sectionId,
        repeatKey: valueSpec.repeatKey,
        value: valueSpec.value,
        userId: params.userId,
        userName: params.userName,
        changeReason: params.changeReason,
        skipValidation: true, // Validate all at once at the end
      });
      
      results.push(result);
      
      if (!result.success && result.errors) {
        errors.push(...result.errors);
      }
      
      if (result.formStatusChanged) {
        formStatusChanged = true;
      }
    }
    
    // Run full form validation unless skipped
    let formValidationResult: FormValidationResult | undefined;
    if (!params.skipValidation) {
      formValidationResult = this.validateForm(params.formInstanceId);
    }
    
    return {
      success: errors.length === 0,
      results,
      formValidationResult,
      formStatusChanged,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
  
  async clearFieldValue(
    formInstanceId: string,
    fieldOID: string,
    sectionId: string,
    repeatKey: string | undefined,
    userId: string,
    userName: string
  ): Promise<void> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    if (!isFormEditable(instance)) {
      throw new Error(`Form is ${instance.status} and cannot be edited`);
    }
    
    const fieldKey = getFieldKey(fieldOID, repeatKey);
    const existingValue = instance.data[fieldKey];
    
    if (existingValue) {
      // Create audit entry
      const auditEntry = createAuditEntry({
        formInstanceId: instance.id,
        userId,
        userName,
        action: 'DELETE',
        fieldOID,
        sectionId,
        oldValue: existingValue.value !== null ? String(existingValue.value) : undefined,
      });
      instance.auditTrail.push(auditEntry);
      
      // Remove value
      delete instance.data[fieldKey];
      
      // Update timestamps
      instance.updatedAt = new Date();
      instance.updatedBy = userId;
    }
  }
  
  getFieldValue(formInstanceId: string, fieldKey: string): FieldValue | undefined {
    const instance = this.formInstances.get(formInstanceId);
    return instance?.data[fieldKey];
  }
  
  // --------------------------------------------------------------------------
  // Repeating Sections
  // --------------------------------------------------------------------------
  
  async addRepeatInstance(
    formInstanceId: string,
    sectionId: string,
    userId: string,
    userName: string
  ): Promise<string> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    if (!isFormEditable(instance)) {
      throw new Error(`Form is ${instance.status} and cannot be edited`);
    }
    
    const definition = this.formDefinitions.get(instance.definitionId);
    if (!definition) {
      throw new Error('Form definition not found');
    }
    
    // Find section
    const section = definition.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }
    
    if (!section.repeating) {
      throw new Error('Section is not a repeating section');
    }
    
    // Check max repeats
    const currentRepeats = this.getRepeatKeys(formInstanceId, sectionId);
    if (section.maxRepeats && currentRepeats.length >= section.maxRepeats) {
      throw new Error(`Maximum repeats (${section.maxRepeats}) reached for section`);
    }
    
    // Generate new repeat key
    const counterKey = `${formInstanceId}:${sectionId}`;
    const counter = (this.repeatCounters.get(counterKey) ?? 0) + 1;
    this.repeatCounters.set(counterKey, counter);
    const repeatKey = `R${counter}`;
    
    // Track the active repeat key
    if (!this.activeRepeatKeys.has(counterKey)) {
      this.activeRepeatKeys.set(counterKey, new Set());
    }
    this.activeRepeatKeys.get(counterKey)!.add(repeatKey);
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'CREATE',
      sectionId,
      newValue: `Added repeat instance: ${repeatKey}`,
    });
    instance.auditTrail.push(auditEntry);
    
    // Update timestamps
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    return repeatKey;
  }
  
  async removeRepeatInstance(
    formInstanceId: string,
    sectionId: string,
    repeatKey: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    if (!isFormEditable(instance)) {
      throw new Error(`Form is ${instance.status} and cannot be edited`);
    }
    
    // Remove all field values for this repeat instance
    const keysToRemove: string[] = [];
    for (const key of Object.keys(instance.data)) {
      const parsed = parseFieldKey(key);
      if (parsed.repeatKey === repeatKey) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      delete instance.data[key];
    }
    
    // Remove from active repeat keys tracking
    const counterKey = `${formInstanceId}:${sectionId}`;
    this.activeRepeatKeys.get(counterKey)?.delete(repeatKey);
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'DELETE',
      sectionId,
      oldValue: `Removed repeat instance: ${repeatKey}`,
    });
    instance.auditTrail.push(auditEntry);
    
    // Update timestamps
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
  }
  
  getRepeatKeys(formInstanceId: string, sectionId: string): string[] {
    const counterKey = `${formInstanceId}:${sectionId}`;
    const activeKeys = this.activeRepeatKeys.get(counterKey);
    
    if (activeKeys && activeKeys.size > 0) {
      return Array.from(activeKeys).sort();
    }
    
    // Fallback: also check data for repeat keys (backward compatibility)
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) return [];
    
    const definition = this.formDefinitions.get(instance.definitionId);
    if (!definition) return [];
    
    // Find section fields
    const section = definition.sections.find(s => s.id === sectionId);
    if (!section) return [];
    
    const sectionFieldOIDs = new Set(section.fields.map(f => f.fieldOID));
    
    // Collect unique repeat keys from data
    const repeatKeys = new Set<string>();
    for (const key of Object.keys(instance.data)) {
      const parsed = parseFieldKey(key);
      if (parsed.repeatKey && sectionFieldOIDs.has(parsed.fieldOID)) {
        repeatKeys.add(parsed.repeatKey);
      }
    }
    
    return Array.from(repeatKeys).sort();
  }
  
  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  
  validateField(
    formInstanceId: string,
    fieldOID: string,
    sectionId: string,
    repeatKey?: string
  ): FieldValidationResult {
    const checkResults: EditCheckResult[] = [];
    let hasBlockingError = false;
    let hasWarning = false;
    
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      return {
        isValid: false,
        fieldOID,
        sectionId,
        repeatKey,
        checkResults: [],
        hasBlockingError: true,
        hasWarning: false,
      };
    }
    
    // Get checks for this field
    const checkIds = this.fieldToChecks.get(fieldOID) ?? [];
    const context = this.buildCheckContext(instance, fieldOID, sectionId, repeatKey);
    
    for (const checkId of checkIds) {
      const check = this.editChecks.get(checkId);
      if (!check) continue;
      
      // Only run checks with ON_CHANGE timing
      if (!check.timing.includes('ON_CHANGE')) continue;
      
      const result = this.compiler.execute(check, context);
      checkResults.push(result);
      
      if (result.status === 'FAILED') {
        // Check if any action is blocking
        for (const action of result.actionsTaken) {
          if (action.action === 'AUTO_QUERY' || action.action === 'HARD_ERROR') {
            hasBlockingError = true;
          }
          if (action.action === 'WARNING' || action.action === 'SOFT_ERROR') {
            hasWarning = true;
          }
        }
      }
    }
    
    return {
      isValid: !hasBlockingError,
      fieldOID,
      sectionId,
      repeatKey,
      checkResults,
      hasBlockingError,
      hasWarning,
    };
  }
  
  validateForm(formInstanceId: string): FormValidationResult {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      return {
        isValid: false,
        formInstanceId,
        totalFields: 0,
        validatedFields: 0,
        fieldsWithErrors: 0,
        fieldsWithWarnings: 0,
        fieldResults: [],
      };
    }
    
    const definition = this.formDefinitions.get(instance.definitionId);
    if (!definition) {
      return {
        isValid: false,
        formInstanceId,
        totalFields: 0,
        validatedFields: 0,
        fieldsWithErrors: 0,
        fieldsWithWarnings: 0,
        fieldResults: [],
      };
    }
    
    const fieldResults: FieldValidationResult[] = [];
    let fieldsWithErrors = 0;
    let fieldsWithWarnings = 0;
    
    // Collect all field values to validate
    const fieldsToValidate: Array<{ fieldOID: string; sectionId: string; repeatKey?: string }> = [];
    
    for (const section of definition.sections) {
      if (section.repeating) {
        const repeatKeys = this.getRepeatKeys(formInstanceId, section.id);
        for (const repeatKey of repeatKeys) {
          for (const field of section.fields) {
            fieldsToValidate.push({
              fieldOID: field.fieldOID,
              sectionId: section.id,
              repeatKey,
            });
          }
        }
      } else {
        for (const field of section.fields) {
          fieldsToValidate.push({
            fieldOID: field.fieldOID,
            sectionId: section.id,
          });
        }
      }
    }
    
    // Run batch validation using compiler
    const checksToRun = Array.from(this.editChecks.values())
      .filter(c => c.timing.includes('ON_SAVE'));
    
    let batchResult: BatchValidationResult | undefined;
    
    if (checksToRun.length > 0) {
      const context = this.buildCheckContext(instance);
      batchResult = this.compiler.executeBatch({
        formInstanceId,
        timing: 'ON_SAVE',
        checks: checksToRun,
        context,
      });
    }
    
    // Validate each field
    for (const fieldSpec of fieldsToValidate) {
      const result = this.validateField(
        formInstanceId,
        fieldSpec.fieldOID,
        fieldSpec.sectionId,
        fieldSpec.repeatKey
      );
      fieldResults.push(result);
      
      if (result.hasBlockingError) fieldsWithErrors++;
      if (result.hasWarning) fieldsWithWarnings++;
    }
    
    // Also check required fields
    const requiredFieldErrors = this.checkRequiredFields(instance, definition);
    fieldsWithErrors += requiredFieldErrors;
    
    const isValid = fieldsWithErrors === 0 && 
      (batchResult ? !batchResult.hasBlockingErrors : true);
    
    return {
      isValid,
      formInstanceId,
      totalFields: fieldsToValidate.length,
      validatedFields: fieldResults.length,
      fieldsWithErrors,
      fieldsWithWarnings,
      fieldResults,
      batchResult,
    };
  }
  
  setEditChecks(checks: CompiledEditCheck[]): void {
    this.editChecks.clear();
    this.fieldToChecks.clear();
    
    for (const check of checks) {
      this.editChecks.set(check.checkId, check);
      
      // Index by field references
      for (const ref of check.fieldReferences) {
        const existing = this.fieldToChecks.get(ref.fieldOID) ?? [];
        if (!existing.includes(check.checkId)) {
          existing.push(check.checkId);
        }
        this.fieldToChecks.set(ref.fieldOID, existing);
      }
    }
  }
  
  getFieldEditChecks(fieldOID: string): CompiledEditCheck[] {
    const checkIds = this.fieldToChecks.get(fieldOID) ?? [];
    return checkIds
      .map(id => this.editChecks.get(id))
      .filter((c): c is CompiledEditCheck => c !== undefined);
  }
  
  // --------------------------------------------------------------------------
  // Form Lifecycle
  // --------------------------------------------------------------------------
  
  async completeForm(
    formInstanceId: string,
    userId: string,
    userName: string
  ): Promise<FormInstance> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    // Check valid transition
    if (!FORM_STATUS_TRANSITIONS[instance.status].includes('COMPLETE')) {
      throw new Error(`Cannot complete form from status: ${instance.status}`);
    }
    
    // Validate form before completing
    const validation = this.validateForm(formInstanceId);
    if (!validation.isValid) {
      throw new Error('Form has validation errors and cannot be completed');
    }
    
    // Check required fields
    const definition = this.formDefinitions.get(instance.definitionId);
    if (definition) {
      const missingRequired = this.getMissingRequiredFields(instance, definition);
      if (missingRequired.length > 0) {
        throw new Error(`Required fields are missing: ${missingRequired.join(', ')}`);
      }
    }
    
    // Update status
    instance.status = 'COMPLETE';
    instance.completedAt = new Date();
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'UPDATE',
      newValue: 'Form marked as complete',
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  async reopenForm(
    formInstanceId: string,
    userId: string,
    userName: string,
    reason: string
  ): Promise<FormInstance> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    // Check valid transition
    if (!FORM_STATUS_TRANSITIONS[instance.status].includes('IN_PROGRESS')) {
      throw new Error(`Cannot reopen form from status: ${instance.status}`);
    }
    
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required when reopening a form');
    }
    
    // Update status
    instance.status = 'IN_PROGRESS';
    instance.completedAt = undefined;
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'UPDATE',
      newValue: 'Form reopened',
      reason,
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  async freezeForm(
    formInstanceId: string,
    userId: string,
    userName: string
  ): Promise<FormInstance> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    // Check valid transition
    if (!FORM_STATUS_TRANSITIONS[instance.status].includes('FROZEN')) {
      throw new Error(`Cannot freeze form from status: ${instance.status}`);
    }
    
    // Check if there are open queries
    if (instance.openQueryCount > 0) {
      throw new Error('Cannot freeze form with open queries');
    }
    
    // Update status
    instance.status = 'FROZEN';
    instance.frozenAt = new Date();
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'FREEZE',
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  async unfreezeForm(
    formInstanceId: string,
    userId: string,
    userName: string,
    reason: string
  ): Promise<FormInstance> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    // Check valid transition
    if (!FORM_STATUS_TRANSITIONS[instance.status].includes('COMPLETE')) {
      throw new Error(`Cannot unfreeze form from status: ${instance.status}`);
    }
    
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required when unfreezing a form');
    }
    
    // Update status
    instance.status = 'COMPLETE';
    instance.frozenAt = undefined;
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'UNFREEZE',
      reason,
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  async lockForm(
    formInstanceId: string,
    userId: string,
    userName: string
  ): Promise<FormInstance> {
    const instance = this.formInstances.get(formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${formInstanceId}`);
    }
    
    // Check valid transition
    if (!FORM_STATUS_TRANSITIONS[instance.status].includes('LOCKED')) {
      throw new Error(`Cannot lock form from status: ${instance.status}`);
    }
    
    // Check if signature is required and not signed
    if (instance.signatureStatus === 'PENDING') {
      throw new Error('Form requires signature before locking');
    }
    
    // Update status
    instance.status = 'LOCKED';
    instance.lockedAt = new Date();
    instance.updatedAt = new Date();
    instance.updatedBy = userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId,
      userName,
      action: 'LOCK',
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  async signForm(params: SignFormParams): Promise<FormInstance> {
    const instance = this.formInstances.get(params.formInstanceId);
    if (!instance) {
      throw new Error(`Form instance not found: ${params.formInstanceId}`);
    }
    
    // Must be complete or frozen to sign
    if (instance.status !== 'COMPLETE' && instance.status !== 'FROZEN') {
      throw new Error('Form must be complete or frozen to sign');
    }
    
    // Check if already signed
    if (instance.signatureStatus === 'SIGNED') {
      throw new Error('Form is already signed');
    }
    
    // Create signature
    const signatureId = crypto.randomUUID();
    const signatureInfo: SignatureInfo = {
      signatureId,
      signatureType: params.signatureType,
      signedAt: new Date(),
      signedBy: params.userId,
      signedByName: params.userName,
      attestation: params.attestation,
    };
    this.signatures.set(signatureId, signatureInfo);
    
    // Update instance
    instance.signatureStatus = 'SIGNED';
    instance.signedAt = signatureInfo.signedAt;
    instance.signedBy = params.userId;
    instance.signatureId = signatureId;
    instance.updatedAt = new Date();
    instance.updatedBy = params.userId;
    
    // Create audit entry
    const auditEntry = createAuditEntry({
      formInstanceId: instance.id,
      userId: params.userId,
      userName: params.userName,
      action: 'SIGN',
      newValue: `Signature ID: ${signatureId}`,
    });
    instance.auditTrail.push(auditEntry);
    
    return instance;
  }
  
  // --------------------------------------------------------------------------
  // Offline Support
  // --------------------------------------------------------------------------
  
  queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    if (!this.config.offlineSupport) {
      throw new Error('Offline support is disabled');
    }
    
    if (this.offlineQueue.length >= this.config.maxQueueSize) {
      throw new Error('Offline queue is full');
    }
    
    const queuedOperation: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      retryCount: 0,
    };
    
    this.offlineQueue.push(queuedOperation);
  }
  
  getQueuedOperations(): OfflineOperation[] {
    return [...this.offlineQueue];
  }
  
  async processQueue(): Promise<QueueProcessingResult> {
    const results: QueueProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      errors: [],
    };
    
    const operationsToProcess = [...this.offlineQueue];
    
    for (const operation of operationsToProcess) {
      results.processed++;
      
      try {
        await this.executeQueuedOperation(operation);
        
        // Remove from queue on success
        const index = this.offlineQueue.findIndex(op => op.id === operation.id);
        if (index !== -1) {
          this.offlineQueue.splice(index, 1);
        }
        
        results.succeeded++;
      } catch (error) {
        operation.retryCount++;
        operation.lastError = error instanceof Error ? error.message : String(error);
        
        results.failed++;
        results.errors.push({
          operationId: operation.id,
          error: operation.lastError,
        });
      }
    }
    
    results.remaining = this.offlineQueue.length;
    return results;
  }
  
  clearQueue(): void {
    this.offlineQueue.length = 0;
  }
  
  getQueueSize(): number {
    return this.offlineQueue.length;
  }
  
  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------
  
  getStats(): DataEntryStats {
    const instances = Array.from(this.formInstances.values());
    
    const byStatus: Record<FormStatus, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      FROZEN: 0,
      LOCKED: 0,
    };
    
    let formsWithOpenQueries = 0;
    let pendingSignatures = 0;
    let totalCompletionTime = 0;
    let completedCount = 0;
    
    for (const instance of instances) {
      byStatus[instance.status]++;
      
      if (instance.openQueryCount > 0) formsWithOpenQueries++;
      if (instance.signatureStatus === 'PENDING') pendingSignatures++;
      
      if (instance.completedAt && instance.startedAt) {
        totalCompletionTime += instance.completedAt.getTime() - instance.startedAt.getTime();
        completedCount++;
      }
    }
    
    return {
      totalFormInstances: instances.length,
      byStatus,
      formsWithOpenQueries,
      pendingSignatures,
      offlineQueueSize: this.offlineQueue.length,
      averageCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
    };
  }
  
  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------
  
  private findField(definition: CRFDefinition, sectionId: string, fieldOID: string): CRFField | undefined {
    for (const section of definition.sections) {
      if (section.id === sectionId) {
        return section.fields.find(f => f.fieldOID === fieldOID);
      }
    }
    return undefined;
  }
  
  private validateFieldType(
    field: CRFField,
    value: string | number | boolean | null
  ): { isValid: boolean; errors: SetFieldValueError[] } {
    const errors: SetFieldValueError[] = [];
    
    if (value === null) {
      return { isValid: true, errors: [] };
    }
    
    switch (field.dataType) {
      case 'INTEGER':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
              errors.push({
                code: 'INVALID_INTEGER',
                message: `Field ${field.fieldOID} requires an integer value`,
                fieldOID: field.fieldOID,
              });
            }
          }
        }
        // Check range
        if (field.validation?.minValue !== undefined && Number(value) < field.validation.minValue) {
          errors.push({
            code: 'VALUE_TOO_LOW',
            message: `Value must be at least ${field.validation.minValue}`,
            fieldOID: field.fieldOID,
          });
        }
        if (field.validation?.maxValue !== undefined && Number(value) > field.validation.maxValue) {
          errors.push({
            code: 'VALUE_TOO_HIGH',
            message: `Value must be at most ${field.validation.maxValue}`,
            fieldOID: field.fieldOID,
          });
        }
        break;
        
      case 'FLOAT':
        if (typeof value !== 'number') {
          if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
              errors.push({
                code: 'INVALID_FLOAT',
                message: `Field ${field.fieldOID} requires a numeric value`,
                fieldOID: field.fieldOID,
              });
            }
          }
        }
        // Check range
        if (field.validation?.minValue !== undefined && Number(value) < field.validation.minValue) {
          errors.push({
            code: 'VALUE_TOO_LOW',
            message: `Value must be at least ${field.validation.minValue}`,
            fieldOID: field.fieldOID,
          });
        }
        if (field.validation?.maxValue !== undefined && Number(value) > field.validation.maxValue) {
          errors.push({
            code: 'VALUE_TOO_HIGH',
            message: `Value must be at most ${field.validation.maxValue}`,
            fieldOID: field.fieldOID,
          });
        }
        break;
        
      case 'DATE':
      case 'DATETIME':
        if (typeof value === 'string') {
          const parsed = Date.parse(value);
          if (isNaN(parsed)) {
            errors.push({
              code: 'INVALID_DATE',
              message: `Field ${field.fieldOID} requires a valid date`,
              fieldOID: field.fieldOID,
            });
          }
        }
        break;
        
      case 'BOOLEAN':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 'Y' && value !== 'N') {
          errors.push({
            code: 'INVALID_BOOLEAN',
            message: `Field ${field.fieldOID} requires a boolean value`,
            fieldOID: field.fieldOID,
          });
        }
        break;
        
      case 'TEXT':
        if (typeof value === 'string') {
          if (field.validation?.minLength !== undefined && value.length < field.validation.minLength) {
            errors.push({
              code: 'VALUE_TOO_SHORT',
              message: `Value must be at least ${field.validation.minLength} characters`,
              fieldOID: field.fieldOID,
            });
          }
          if (field.validation?.maxLength !== undefined && value.length > field.validation.maxLength) {
            errors.push({
              code: 'VALUE_TOO_LONG',
              message: `Value must be at most ${field.validation.maxLength} characters`,
              fieldOID: field.fieldOID,
            });
          }
          if (field.validation?.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors.push({
                code: 'PATTERN_MISMATCH',
                message: field.validation.patternMessage ?? `Value does not match required pattern`,
                fieldOID: field.fieldOID,
              });
            }
          }
        }
        break;
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  private buildCheckContext(
    instance: FormInstance,
    currentFieldOID?: string,
    currentSectionId?: string,
    currentRepeatKey?: string
  ): EditCheckContext {
    return {
      formInstanceId: instance.id,
      currentTimestamp: new Date(),
      currentField: currentFieldOID ? {
        formOID: instance.definitionId,
        sectionId: currentSectionId ?? '',
        fieldOID: currentFieldOID,
        repeatIndex: currentRepeatKey ? parseInt(currentRepeatKey.replace('R', ''), 10) : undefined,
      } : undefined,
      currentValue: currentFieldOID 
        ? instance.data[getFieldKey(currentFieldOID, currentRepeatKey)]?.value as CheckFieldValue
        : undefined,
      getFieldValue: (ref) => {
        const key = getFieldKey(ref.fieldOID, currentRepeatKey);
        const fieldValue = instance.data[key];
        return fieldValue?.value as CheckFieldValue;
      },
    };
  }
  
  private checkRequiredFields(instance: FormInstance, definition: CRFDefinition): number {
    let errorCount = 0;
    
    for (const section of definition.sections) {
      if (section.repeating) {
        const repeatKeys = this.getRepeatKeys(instance.id, section.id);
        for (const repeatKey of repeatKeys) {
          for (const field of section.fields) {
            if (field.required) {
              const key = getFieldKey(field.fieldOID, repeatKey);
              const value = instance.data[key];
              if (!value || value.value === null || value.value === '') {
                errorCount++;
              }
            }
          }
        }
      } else {
        for (const field of section.fields) {
          if (field.required) {
            const value = instance.data[field.fieldOID];
            if (!value || value.value === null || value.value === '') {
              errorCount++;
            }
          }
        }
      }
    }
    
    return errorCount;
  }
  
  private getMissingRequiredFields(instance: FormInstance, definition: CRFDefinition): string[] {
    const missing: string[] = [];
    
    for (const section of definition.sections) {
      if (section.repeating) {
        const repeatKeys = this.getRepeatKeys(instance.id, section.id);
        for (const repeatKey of repeatKeys) {
          for (const field of section.fields) {
            if (field.required) {
              const key = getFieldKey(field.fieldOID, repeatKey);
              const value = instance.data[key];
              if (!value || value.value === null || value.value === '') {
                missing.push(`${field.fieldOID}[${repeatKey}]`);
              }
            }
          }
        }
      } else {
        for (const field of section.fields) {
          if (field.required) {
            const value = instance.data[field.fieldOID];
            if (!value || value.value === null || value.value === '') {
              missing.push(field.fieldOID);
            }
          }
        }
      }
    }
    
    return missing;
  }
  
  private autoCloseQueries(
    instance: FormInstance,
    fieldOID: string,
    sectionId: string,
    repeatKey?: string
  ): void {
    // Find queries for this field that are configured to auto-close
    for (const query of instance.queries) {
      if (
        query.status === 'OPEN' &&
        query.autoClosedOnChange &&
        query.fieldOID === fieldOID &&
        query.sectionId === sectionId &&
        query.repeatKey === repeatKey
      ) {
        query.status = 'CLOSED';
        query.closedDate = new Date();
        query.response = 'Auto-closed on value change';
        query.updatedAt = new Date();
        instance.openQueryCount--;
      }
    }
  }
  
  private async executeQueuedOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.operationType) {
      case 'SET_VALUE': {
        const payload = operation.payload as unknown as SetFieldValueParams;
        await this.setFieldValue({
          ...payload,
          formInstanceId: operation.formInstanceId,
        });
        break;
      }
      
      case 'SET_VALUES': {
        const payload = operation.payload as unknown as Omit<SetFieldValuesParams, 'formInstanceId'>;
        await this.setFieldValues({
          ...payload,
          formInstanceId: operation.formInstanceId,
        });
        break;
      }
      
      case 'CLEAR_VALUE': {
        const payload = operation.payload as {
          fieldOID: string;
          sectionId: string;
          repeatKey?: string;
          userName: string;
        };
        await this.clearFieldValue(
          operation.formInstanceId,
          payload.fieldOID,
          payload.sectionId,
          payload.repeatKey,
          operation.userId,
          payload.userName
        );
        break;
      }
      
      case 'COMPLETE_FORM': {
        const payload = operation.payload as { userName: string };
        await this.completeForm(
          operation.formInstanceId,
          operation.userId,
          payload.userName
        );
        break;
      }
      
      case 'REOPEN_FORM': {
        const payload = operation.payload as { userName: string; reason: string };
        await this.reopenForm(
          operation.formInstanceId,
          operation.userId,
          payload.userName,
          payload.reason
        );
        break;
      }
      
      case 'ADD_REPEAT': {
        const payload = operation.payload as { sectionId: string; userName: string };
        await this.addRepeatInstance(
          operation.formInstanceId,
          payload.sectionId,
          operation.userId,
          payload.userName
        );
        break;
      }
      
      default:
        throw new Error(`Unknown operation type: ${operation.operationType}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDataEntryService(config: DataEntryServiceConfig): DataEntryService {
  return new DataEntryService(config);
}
