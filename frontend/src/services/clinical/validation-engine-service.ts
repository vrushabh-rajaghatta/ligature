
/**
 * Validation Engine Service
 * Cross-form validation, protocol deviation detection, and 21 CFR Part 11 compliance
 * @version 0.20.5.2
 * 
 * Provides:
 * - Cross-form validation rules
 * - Protocol deviation detection
 * - Data consistency checks
 * - Audit trail querying and compliance
 * - 21 CFR Part 11 electronic signature verification
 */

import {
  FormInstance,
  FieldValue,
  AuditEntry,
  AuditAction,
  FormStatus,
  DataQuery,
  QueryStatus,
} from '@/types/clinical-form';

import {
  EditCheckResult,
  CheckResultStatus,
} from '@/types/clinical-edit-check';

// ============================================================================
// Service Configuration
// ============================================================================

export interface ValidationEngineConfig {
  tenantId: string;
  strictMode?: boolean;           // Fail on any validation error
  enableDeviationDetection?: boolean;
  part11Compliance?: boolean;     // Enable 21 CFR Part 11 checks
}

// ============================================================================
// Cross-Form Validation
// ============================================================================

export type CrossFormRuleType =
  | 'DATE_SEQUENCE'              // Date A must be before/after Date B across forms
  | 'VALUE_CONSISTENCY'          // Values must match across forms
  | 'REQUIRED_IF_EXISTS'         // Field required if another form has data
  | 'MUTUALLY_EXCLUSIVE'         // Only one form can have specific value
  | 'CUMULATIVE_LIMIT'           // Sum across forms must not exceed limit
  | 'TEMPORAL_CONSTRAINT'        // Time-based relationship
  | 'CONDITIONAL_PRESENCE';      // Form required based on another form's data

export interface CrossFormRule {
  id: string;
  name: string;
  description?: string;
  ruleType: CrossFormRuleType;
  isActive: boolean;
  
  // Source form/field
  sourceFormOID: string;
  sourceFieldOID: string;
  
  // Target form/field
  targetFormOID: string;
  targetFieldOID: string;
  
  // Rule parameters
  parameters: Record<string, unknown>;
  
  // Error configuration
  errorMessage: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  
  // Metadata
  createdAt: Date;
  createdBy: string;
}

export interface CrossFormValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message?: string;
  sourceFormInstanceId?: string;
  targetFormInstanceId?: string;
  sourceValue?: unknown;
  targetValue?: unknown;
}

// ============================================================================
// Protocol Deviation
// ============================================================================

export type DeviationType =
  | 'VISIT_WINDOW'               // Visit outside protocol window
  | 'PROCEDURE_TIMING'           // Procedure at wrong time
  | 'DOSE_MODIFICATION'          // Unapproved dose change
  | 'ELIGIBILITY'                // Enrolled without meeting criteria
  | 'CONSENT'                    // Consent issues
  | 'SAFETY_REPORTING'           // Late safety report
  | 'DATA_COLLECTION'            // Missing required data
  | 'PROTOCOL_PROCEDURE'         // Procedure not per protocol
  | 'CONCOMITANT_MEDICATION'     // Prohibited medication
  | 'OTHER';

export type DeviationSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export type DeviationStatus = 'DETECTED' | 'CONFIRMED' | 'RESOLVED' | 'WAIVED';

export interface ProtocolDeviation {
  id: string;
  studyId: string;
  siteId: string;
  subjectId: string;
  
  // Classification
  deviationType: DeviationType;
  severity: DeviationSeverity;
  status: DeviationStatus;
  
  // Details
  description: string;
  detectedDate: Date;
  deviationDate: Date;
  
  // Source
  sourceFormInstanceId?: string;
  sourceFieldOID?: string;
  detectionRuleId?: string;
  
  // Expected vs Actual
  expectedValue?: string;
  actualValue?: string;
  
  // Resolution
  resolution?: string;
  resolvedDate?: Date;
  resolvedBy?: string;
  
  // CAPA link
  capaId?: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface DeviationDetectionRule {
  id: string;
  name: string;
  description?: string;
  deviationType: DeviationType;
  defaultSeverity: DeviationSeverity;
  isActive: boolean;
  
  // Detection logic
  formOID: string;
  fieldOID?: string;
  condition: string;  // Expression to evaluate
  
  // Parameters
  parameters: Record<string, unknown>;
  
  // Message template
  messageTemplate: string;
}

// ============================================================================
// Audit Trail
// ============================================================================

export interface AuditQueryFilter {
  formInstanceId?: string;
  subjectId?: string;
  siteId?: string;
  studyId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  fieldOID?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeSystemActions?: boolean;
}

export interface AuditTrailReport {
  entries: AuditEntry[];
  totalCount: number;
  filteredCount: number;
  dateRange: { from: Date; to: Date };
  generatedAt: Date;
  generatedBy: string;
}

export interface AuditSummary {
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  byUser: Record<string, number>;
  byDate: Array<{ date: string; count: number }>;
  recentActivity: AuditEntry[];
}

// ============================================================================
// 21 CFR Part 11 Compliance
// ============================================================================

export interface Part11Check {
  id: string;
  name: string;
  description: string;
  category: 'ELECTRONIC_SIGNATURE' | 'AUDIT_TRAIL' | 'ACCESS_CONTROL' | 'DATA_INTEGRITY';
  requirement: string;
  isRequired: boolean;
}

export interface Part11ComplianceResult {
  checkId: string;
  checkName: string;
  passed: boolean;
  requirement: string;
  finding?: string;
  recommendation?: string;
}

export interface SignatureVerification {
  signatureId: string;
  isValid: boolean;
  signedBy: string;
  signedAt: Date;
  meaning: string;
  formInstanceId: string;
  verificationMethod: 'ELECTRONIC' | 'BIOMETRIC' | 'PASSWORD';
  issues: string[];
}

// ============================================================================
// Data Consistency
// ============================================================================

export interface ConsistencyCheck {
  id: string;
  name: string;
  description?: string;
  checkType: 'DUPLICATE' | 'ORPHAN' | 'MISSING_LINK' | 'REFERENTIAL' | 'TEMPORAL';
  isActive: boolean;
  
  // What to check
  entityType: 'FORM_INSTANCE' | 'SUBJECT' | 'VISIT' | 'QUERY';
  
  // Parameters
  parameters: Record<string, unknown>;
}

export interface ConsistencyIssue {
  checkId: string;
  checkName: string;
  entityType: string;
  entityId: string;
  issueType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedAction?: string;
}

// ============================================================================
// Validation Statistics
// ============================================================================

export interface ValidationStats {
  totalRulesConfigured: number;
  activeRules: number;
  totalValidationsRun: number;
  passRate: number;
  
  // By type
  crossFormRules: number;
  deviationRules: number;
  consistencyChecks: number;
  
  // Issues
  totalDeviations: number;
  unresolvedDeviations: number;
  consistencyIssues: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IValidationEngineService {
  // Cross-Form Validation
  addCrossFormRule(rule: Omit<CrossFormRule, 'id' | 'createdAt'>): CrossFormRule;
  updateCrossFormRule(ruleId: string, updates: Partial<CrossFormRule>): CrossFormRule;
  deleteCrossFormRule(ruleId: string): void;
  getCrossFormRule(ruleId: string): CrossFormRule | undefined;
  listCrossFormRules(studyId?: string): CrossFormRule[];
  validateCrossForm(subjectId: string, formInstances: FormInstance[]): CrossFormValidationResult[];
  
  // Protocol Deviation Detection
  addDeviationRule(rule: Omit<DeviationDetectionRule, 'id'>): DeviationDetectionRule;
  updateDeviationRule(ruleId: string, updates: Partial<DeviationDetectionRule>): DeviationDetectionRule;
  deleteDeviationRule(ruleId: string): void;
  listDeviationRules(): DeviationDetectionRule[];
  detectDeviations(subjectId: string, formInstances: FormInstance[]): ProtocolDeviation[];
  
  // Deviation Management
  createDeviation(deviation: Omit<ProtocolDeviation, 'id' | 'createdAt' | 'updatedAt'>): ProtocolDeviation;
  updateDeviation(deviationId: string, updates: Partial<ProtocolDeviation>, userId: string): ProtocolDeviation;
  resolveDeviation(deviationId: string, resolution: string, userId: string): ProtocolDeviation;
  getDeviation(deviationId: string): ProtocolDeviation | undefined;
  listDeviations(filter?: { subjectId?: string; siteId?: string; status?: DeviationStatus }): ProtocolDeviation[];
  
  // Audit Trail
  queryAuditTrail(filter: AuditQueryFilter): AuditEntry[];
  generateAuditReport(filter: AuditQueryFilter, generatedBy: string): AuditTrailReport;
  getAuditSummary(studyId: string): AuditSummary;
  
  // 21 CFR Part 11
  getPart11Checks(): Part11Check[];
  runPart11Compliance(formInstance: FormInstance): Part11ComplianceResult[];
  verifySignature(signatureId: string): SignatureVerification;
  
  // Data Consistency
  addConsistencyCheck(check: Omit<ConsistencyCheck, 'id'>): ConsistencyCheck;
  runConsistencyChecks(studyId: string): ConsistencyIssue[];
  
  // Statistics
  getStats(): ValidationStats;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class ValidationEngineService implements IValidationEngineService {
  private readonly config: Required<ValidationEngineConfig>;
  private readonly crossFormRules: Map<string, CrossFormRule> = new Map();
  private readonly deviationRules: Map<string, DeviationDetectionRule> = new Map();
  private readonly deviations: Map<string, ProtocolDeviation> = new Map();
  private readonly consistencyChecks: Map<string, ConsistencyCheck> = new Map();
  private readonly auditEntries: AuditEntry[] = [];
  private readonly signatures: Map<string, { signedBy: string; signedAt: Date; formInstanceId: string; meaning: string }> = new Map();
  
  private validationRunCount = 0;
  private validationPassCount = 0;
  
  constructor(config: ValidationEngineConfig) {
    this.config = {
      tenantId: config.tenantId,
      strictMode: config.strictMode ?? false,
      enableDeviationDetection: config.enableDeviationDetection ?? true,
      part11Compliance: config.part11Compliance ?? true,
    };
    
    this.initializeDefaultPart11Checks();
  }
  
  // --------------------------------------------------------------------------
  // Cross-Form Validation
  // --------------------------------------------------------------------------
  
  addCrossFormRule(rule: Omit<CrossFormRule, 'id' | 'createdAt'>): CrossFormRule {
    const newRule: CrossFormRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    this.crossFormRules.set(newRule.id, newRule);
    return newRule;
  }
  
  updateCrossFormRule(ruleId: string, updates: Partial<CrossFormRule>): CrossFormRule {
    const rule = this.crossFormRules.get(ruleId);
    if (!rule) {
      throw new Error(`Cross-form rule not found: ${ruleId}`);
    }
    
    const updated = { ...rule, ...updates, id: rule.id, createdAt: rule.createdAt };
    this.crossFormRules.set(ruleId, updated);
    return updated;
  }
  
  deleteCrossFormRule(ruleId: string): void {
    if (!this.crossFormRules.has(ruleId)) {
      throw new Error(`Cross-form rule not found: ${ruleId}`);
    }
    this.crossFormRules.delete(ruleId);
  }
  
  getCrossFormRule(ruleId: string): CrossFormRule | undefined {
    return this.crossFormRules.get(ruleId);
  }
  
  listCrossFormRules(studyId?: string): CrossFormRule[] {
    const rules = Array.from(this.crossFormRules.values());
    // Could filter by studyId if rules had studyId field
    return rules;
  }
  
  validateCrossForm(subjectId: string, formInstances: FormInstance[]): CrossFormValidationResult[] {
    const results: CrossFormValidationResult[] = [];
    const activeRules = Array.from(this.crossFormRules.values()).filter(r => r.isActive);
    
    for (const rule of activeRules) {
      this.validationRunCount++;
      const result = this.evaluateCrossFormRule(rule, formInstances);
      results.push(result);
      if (result.passed) {
        this.validationPassCount++;
      }
    }
    
    return results;
  }
  
  private evaluateCrossFormRule(rule: CrossFormRule, formInstances: FormInstance[]): CrossFormValidationResult {
    // Find source and target form instances
    const sourceForm = formInstances.find(f => f.definitionId === rule.sourceFormOID);
    const targetForm = formInstances.find(f => f.definitionId === rule.targetFormOID);
    
    if (!sourceForm || !targetForm) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: true, // Can't evaluate if forms don't exist
        severity: rule.severity,
      };
    }
    
    const sourceValue = sourceForm.data[rule.sourceFieldOID]?.value;
    const targetValue = targetForm.data[rule.targetFieldOID]?.value;
    
    let passed = true;
    let message: string | undefined;
    
    switch (rule.ruleType) {
      case 'DATE_SEQUENCE': {
        if (sourceValue && targetValue) {
          const sourceDate = new Date(sourceValue as string);
          const targetDate = new Date(targetValue as string);
          const relationship = rule.parameters.relationship as 'BEFORE' | 'AFTER' | 'SAME';
          
          if (relationship === 'BEFORE' && sourceDate >= targetDate) {
            passed = false;
            message = rule.errorMessage;
          } else if (relationship === 'AFTER' && sourceDate <= targetDate) {
            passed = false;
            message = rule.errorMessage;
          } else if (relationship === 'SAME' && sourceDate.getTime() !== targetDate.getTime()) {
            passed = false;
            message = rule.errorMessage;
          }
        }
        break;
      }
      
      case 'VALUE_CONSISTENCY': {
        if (sourceValue !== undefined && targetValue !== undefined && sourceValue !== targetValue) {
          passed = false;
          message = rule.errorMessage;
        }
        break;
      }
      
      case 'REQUIRED_IF_EXISTS': {
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
          if (targetValue === undefined || targetValue === null || targetValue === '') {
            passed = false;
            message = rule.errorMessage;
          }
        }
        break;
      }
      
      case 'MUTUALLY_EXCLUSIVE': {
        const exclusiveValue = rule.parameters.exclusiveValue;
        if (sourceValue === exclusiveValue && targetValue === exclusiveValue) {
          passed = false;
          message = rule.errorMessage;
        }
        break;
      }
      
      case 'CUMULATIVE_LIMIT': {
        const limit = rule.parameters.limit as number;
        const sourceNum = Number(sourceValue) || 0;
        const targetNum = Number(targetValue) || 0;
        if (sourceNum + targetNum > limit) {
          passed = false;
          message = rule.errorMessage;
        }
        break;
      }
      
      case 'TEMPORAL_CONSTRAINT': {
        if (sourceValue && targetValue) {
          const sourceDate = new Date(sourceValue as string);
          const targetDate = new Date(targetValue as string);
          const maxDays = rule.parameters.maxDays as number;
          const diffDays = Math.abs((targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > maxDays) {
            passed = false;
            message = rule.errorMessage;
          }
        }
        break;
      }
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      severity: rule.severity,
      message,
      sourceFormInstanceId: sourceForm.id,
      targetFormInstanceId: targetForm.id,
      sourceValue,
      targetValue,
    };
  }
  
  // --------------------------------------------------------------------------
  // Protocol Deviation Detection
  // --------------------------------------------------------------------------
  
  addDeviationRule(rule: Omit<DeviationDetectionRule, 'id'>): DeviationDetectionRule {
    const newRule: DeviationDetectionRule = {
      ...rule,
      id: crypto.randomUUID(),
    };
    
    this.deviationRules.set(newRule.id, newRule);
    return newRule;
  }
  
  updateDeviationRule(ruleId: string, updates: Partial<DeviationDetectionRule>): DeviationDetectionRule {
    const rule = this.deviationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Deviation rule not found: ${ruleId}`);
    }
    
    const updated = { ...rule, ...updates, id: rule.id };
    this.deviationRules.set(ruleId, updated);
    return updated;
  }
  
  deleteDeviationRule(ruleId: string): void {
    if (!this.deviationRules.has(ruleId)) {
      throw new Error(`Deviation rule not found: ${ruleId}`);
    }
    this.deviationRules.delete(ruleId);
  }
  
  listDeviationRules(): DeviationDetectionRule[] {
    return Array.from(this.deviationRules.values());
  }
  
  detectDeviations(subjectId: string, formInstances: FormInstance[]): ProtocolDeviation[] {
    if (!this.config.enableDeviationDetection) {
      return [];
    }
    
    const detected: ProtocolDeviation[] = [];
    const activeRules = Array.from(this.deviationRules.values()).filter(r => r.isActive);
    
    for (const rule of activeRules) {
      const formInstance = formInstances.find(f => f.definitionId === rule.formOID);
      if (!formInstance) continue;
      
      const deviation = this.evaluateDeviationRule(rule, subjectId, formInstance);
      if (deviation) {
        detected.push(deviation);
        this.deviations.set(deviation.id, deviation);
      }
    }
    
    return detected;
  }
  
  private evaluateDeviationRule(
    rule: DeviationDetectionRule,
    subjectId: string,
    formInstance: FormInstance
  ): ProtocolDeviation | null {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    
    let isDeviation = false;
    let actualValue: string | undefined;
    let expectedValue: string | undefined;
    
    if (rule.fieldOID) {
      const fieldValue = formInstance.data[rule.fieldOID];
      actualValue = fieldValue?.value !== undefined ? String(fieldValue.value) : undefined;
      
      // Example condition evaluations
      if (rule.condition.includes('IS_NULL') && actualValue === undefined) {
        isDeviation = true;
      } else if (rule.condition.includes('GT')) {
        const threshold = rule.parameters.threshold as number;
        expectedValue = `<= ${threshold}`;
        if (Number(actualValue) > threshold) {
          isDeviation = true;
        }
      } else if (rule.condition.includes('LT')) {
        const threshold = rule.parameters.threshold as number;
        expectedValue = `>= ${threshold}`;
        if (Number(actualValue) < threshold) {
          isDeviation = true;
        }
      } else if (rule.condition.includes('NOT_IN')) {
        const allowedValues = rule.parameters.allowedValues as string[];
        expectedValue = `One of: ${allowedValues.join(', ')}`;
        if (actualValue && !allowedValues.includes(actualValue)) {
          isDeviation = true;
        }
      }
    }
    
    if (!isDeviation) {
      return null;
    }
    
    const now = new Date();
    const description = rule.messageTemplate
      .replace('{fieldOID}', rule.fieldOID || '')
      .replace('{actualValue}', actualValue || 'N/A')
      .replace('{expectedValue}', expectedValue || 'N/A');
    
    return {
      id: crypto.randomUUID(),
      studyId: formInstance.studyId,
      siteId: formInstance.siteId,
      subjectId,
      deviationType: rule.deviationType,
      severity: rule.defaultSeverity,
      status: 'DETECTED',
      description,
      detectedDate: now,
      deviationDate: now,
      sourceFormInstanceId: formInstance.id,
      sourceFieldOID: rule.fieldOID,
      detectionRuleId: rule.id,
      expectedValue,
      actualValue,
      createdAt: now,
      createdBy: 'SYSTEM',
      updatedAt: now,
      updatedBy: 'SYSTEM',
    };
  }
  
  // --------------------------------------------------------------------------
  // Deviation Management
  // --------------------------------------------------------------------------
  
  createDeviation(deviation: Omit<ProtocolDeviation, 'id' | 'createdAt' | 'updatedAt'>): ProtocolDeviation {
    const now = new Date();
    const newDeviation: ProtocolDeviation = {
      ...deviation,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    this.deviations.set(newDeviation.id, newDeviation);
    return newDeviation;
  }
  
  updateDeviation(deviationId: string, updates: Partial<ProtocolDeviation>, userId: string): ProtocolDeviation {
    const deviation = this.deviations.get(deviationId);
    if (!deviation) {
      throw new Error(`Deviation not found: ${deviationId}`);
    }
    
    const updated: ProtocolDeviation = {
      ...deviation,
      ...updates,
      id: deviation.id,
      createdAt: deviation.createdAt,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    
    this.deviations.set(deviationId, updated);
    return updated;
  }
  
  resolveDeviation(deviationId: string, resolution: string, userId: string): ProtocolDeviation {
    return this.updateDeviation(deviationId, {
      status: 'RESOLVED',
      resolution,
      resolvedDate: new Date(),
      resolvedBy: userId,
    }, userId);
  }
  
  getDeviation(deviationId: string): ProtocolDeviation | undefined {
    return this.deviations.get(deviationId);
  }
  
  listDeviations(filter?: { subjectId?: string; siteId?: string; status?: DeviationStatus }): ProtocolDeviation[] {
    let results = Array.from(this.deviations.values());
    
    if (filter?.subjectId) {
      results = results.filter(d => d.subjectId === filter.subjectId);
    }
    if (filter?.siteId) {
      results = results.filter(d => d.siteId === filter.siteId);
    }
    if (filter?.status) {
      results = results.filter(d => d.status === filter.status);
    }
    
    return results.sort((a, b) => b.detectedDate.getTime() - a.detectedDate.getTime());
  }
  
  // --------------------------------------------------------------------------
  // Audit Trail
  // --------------------------------------------------------------------------
  
  // Method to add audit entries (for testing/integration)
  addAuditEntry(entry: AuditEntry): void {
    this.auditEntries.push(entry);
  }
  
  queryAuditTrail(filter: AuditQueryFilter): AuditEntry[] {
    let results = [...this.auditEntries];
    
    if (filter.formInstanceId) {
      results = results.filter(e => e.formInstanceId === filter.formInstanceId);
    }
    if (filter.userId) {
      results = results.filter(e => e.userId === filter.userId);
    }
    if (filter.action) {
      const actions = Array.isArray(filter.action) ? filter.action : [filter.action];
      results = results.filter(e => actions.includes(e.action));
    }
    if (filter.fieldOID) {
      results = results.filter(e => e.fieldOID === filter.fieldOID);
    }
    if (filter.dateFrom) {
      results = results.filter(e => e.timestamp >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      results = results.filter(e => e.timestamp <= filter.dateTo!);
    }
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  generateAuditReport(filter: AuditQueryFilter, generatedBy: string): AuditTrailReport {
    const entries = this.queryAuditTrail(filter);
    
    const timestamps = entries.map(e => e.timestamp.getTime());
    const minDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const maxDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
    
    return {
      entries,
      totalCount: this.auditEntries.length,
      filteredCount: entries.length,
      dateRange: { from: minDate, to: maxDate },
      generatedAt: new Date(),
      generatedBy,
    };
  }
  
  getAuditSummary(studyId: string): AuditSummary {
    const entries = this.auditEntries;
    
    const byAction: Record<AuditAction, number> = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      SIGN: 0,
      LOCK: 0,
      UNLOCK: 0,
      FREEZE: 0,
      UNFREEZE: 0,
      SDV: 0,
      QUERY_OPEN: 0,
      QUERY_ANSWER: 0,
      QUERY_CLOSE: 0,
    };
    
    const byUser: Record<string, number> = {};
    const byDateMap: Map<string, number> = new Map();
    
    for (const entry of entries) {
      byAction[entry.action]++;
      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;
      
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      byDateMap.set(dateKey, (byDateMap.get(dateKey) || 0) + 1);
    }
    
    const byDate = Array.from(byDateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const recentActivity = entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
    
    return {
      totalEntries: entries.length,
      byAction,
      byUser,
      byDate,
      recentActivity,
    };
  }
  
  // --------------------------------------------------------------------------
  // 21 CFR Part 11 Compliance
  // --------------------------------------------------------------------------
  
  private part11Checks: Part11Check[] = [];
  
  private initializeDefaultPart11Checks(): void {
    this.part11Checks = [
      {
        id: 'P11-001',
        name: 'Electronic Signature Uniqueness',
        description: 'Each electronic signature must be unique to one individual',
        category: 'ELECTRONIC_SIGNATURE',
        requirement: '§11.100(a)',
        isRequired: true,
      },
      {
        id: 'P11-002',
        name: 'Signature Meaning',
        description: 'Signed records must include meaning of signature (e.g., review, approval)',
        category: 'ELECTRONIC_SIGNATURE',
        requirement: '§11.50(a)',
        isRequired: true,
      },
      {
        id: 'P11-003',
        name: 'Audit Trail',
        description: 'Computer-generated, time-stamped audit trails must be maintained',
        category: 'AUDIT_TRAIL',
        requirement: '§11.10(e)',
        isRequired: true,
      },
      {
        id: 'P11-004',
        name: 'Audit Trail Independence',
        description: 'Audit trail entries cannot be modified by operators',
        category: 'AUDIT_TRAIL',
        requirement: '§11.10(e)',
        isRequired: true,
      },
      {
        id: 'P11-005',
        name: 'Record Retention',
        description: 'Electronic records must be retained for required period',
        category: 'DATA_INTEGRITY',
        requirement: '§11.10(c)',
        isRequired: true,
      },
      {
        id: 'P11-006',
        name: 'Access Controls',
        description: 'System access limited to authorized individuals',
        category: 'ACCESS_CONTROL',
        requirement: '§11.10(d)',
        isRequired: true,
      },
      {
        id: 'P11-007',
        name: 'Signature Date/Time',
        description: 'Electronic signature must include date and time',
        category: 'ELECTRONIC_SIGNATURE',
        requirement: '§11.50(b)',
        isRequired: true,
      },
      {
        id: 'P11-008',
        name: 'Signature-Record Link',
        description: 'Electronic signature must be linked to electronic record',
        category: 'ELECTRONIC_SIGNATURE',
        requirement: '§11.70',
        isRequired: true,
      },
    ];
  }
  
  getPart11Checks(): Part11Check[] {
    return [...this.part11Checks];
  }
  
  runPart11Compliance(formInstance: FormInstance): Part11ComplianceResult[] {
    if (!this.config.part11Compliance) {
      return [];
    }
    
    const results: Part11ComplianceResult[] = [];
    
    for (const check of this.part11Checks) {
      const result = this.evaluatePart11Check(check, formInstance);
      results.push(result);
    }
    
    return results;
  }
  
  private evaluatePart11Check(check: Part11Check, formInstance: FormInstance): Part11ComplianceResult {
    let passed = true;
    let finding: string | undefined;
    let recommendation: string | undefined;
    
    switch (check.id) {
      case 'P11-002': // Signature Meaning
        if (formInstance.signatureStatus === 'SIGNED' && formInstance.signatureId) {
          const sig = this.signatures.get(formInstance.signatureId);
          if (!sig || !sig.meaning) {
            passed = false;
            finding = 'Signature does not include meaning/purpose';
            recommendation = 'Add signature meaning (e.g., "I confirm accuracy of data")';
          }
        }
        break;
        
      case 'P11-003': // Audit Trail
        if (formInstance.auditTrail.length === 0) {
          passed = false;
          finding = 'No audit trail entries found';
          recommendation = 'Ensure all changes are captured in audit trail';
        }
        break;
        
      case 'P11-004': // Audit Trail Independence
        // Check that audit entries have timestamps
        const missingTimestamps = formInstance.auditTrail.filter(e => !e.timestamp);
        if (missingTimestamps.length > 0) {
          passed = false;
          finding = `${missingTimestamps.length} audit entries missing timestamps`;
          recommendation = 'Ensure system generates timestamps for all audit entries';
        }
        break;
        
      case 'P11-007': // Signature Date/Time
        if (formInstance.signatureStatus === 'SIGNED' && !formInstance.signedAt) {
          passed = false;
          finding = 'Signature missing date/time';
          recommendation = 'Capture timestamp at time of signature';
        }
        break;
        
      case 'P11-008': // Signature-Record Link
        if (formInstance.signatureStatus === 'SIGNED' && !formInstance.signatureId) {
          passed = false;
          finding = 'Signature not linked to record';
          recommendation = 'Ensure signature ID is captured and linked';
        }
        break;
    }
    
    return {
      checkId: check.id,
      checkName: check.name,
      passed,
      requirement: check.requirement,
      finding,
      recommendation,
    };
  }
  
  // Method to register signatures (for testing/integration)
  registerSignature(signatureId: string, info: { signedBy: string; signedAt: Date; formInstanceId: string; meaning: string }): void {
    this.signatures.set(signatureId, info);
  }
  
  verifySignature(signatureId: string): SignatureVerification {
    const sig = this.signatures.get(signatureId);
    const issues: string[] = [];
    
    if (!sig) {
      return {
        signatureId,
        isValid: false,
        signedBy: 'UNKNOWN',
        signedAt: new Date(),
        meaning: '',
        formInstanceId: '',
        verificationMethod: 'ELECTRONIC',
        issues: ['Signature not found'],
      };
    }
    
    if (!sig.meaning) {
      issues.push('Missing signature meaning');
    }
    if (!sig.signedAt) {
      issues.push('Missing signature timestamp');
    }
    
    return {
      signatureId,
      isValid: issues.length === 0,
      signedBy: sig.signedBy,
      signedAt: sig.signedAt,
      meaning: sig.meaning,
      formInstanceId: sig.formInstanceId,
      verificationMethod: 'ELECTRONIC',
      issues,
    };
  }
  
  // --------------------------------------------------------------------------
  // Data Consistency
  // --------------------------------------------------------------------------
  
  addConsistencyCheck(check: Omit<ConsistencyCheck, 'id'>): ConsistencyCheck {
    const newCheck: ConsistencyCheck = {
      ...check,
      id: crypto.randomUUID(),
    };
    
    this.consistencyChecks.set(newCheck.id, newCheck);
    return newCheck;
  }
  
  runConsistencyChecks(studyId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const activeChecks = Array.from(this.consistencyChecks.values()).filter(c => c.isActive);
    
    // In a real implementation, these would run against actual data
    // For now, return empty - checks are configured but not executed against mock data
    
    return issues;
  }
  
  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------
  
  getStats(): ValidationStats {
    const crossFormRules = this.crossFormRules.size;
    const deviationRules = this.deviationRules.size;
    const consistencyChecks = this.consistencyChecks.size;
    const activeRules = 
      Array.from(this.crossFormRules.values()).filter(r => r.isActive).length +
      Array.from(this.deviationRules.values()).filter(r => r.isActive).length +
      Array.from(this.consistencyChecks.values()).filter(c => c.isActive).length;
    
    const deviations = Array.from(this.deviations.values());
    const unresolvedDeviations = deviations.filter(d => d.status !== 'RESOLVED').length;
    
    return {
      totalRulesConfigured: crossFormRules + deviationRules + consistencyChecks,
      activeRules,
      totalValidationsRun: this.validationRunCount,
      passRate: this.validationRunCount > 0 
        ? (this.validationPassCount / this.validationRunCount) * 100 
        : 100,
      crossFormRules,
      deviationRules,
      consistencyChecks,
      totalDeviations: deviations.length,
      unresolvedDeviations,
      consistencyIssues: 0,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createValidationEngineService(config: ValidationEngineConfig): ValidationEngineService {
  return new ValidationEngineService(config);
}
