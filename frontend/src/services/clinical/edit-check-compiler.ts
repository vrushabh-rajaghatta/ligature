
/**
 * Edit Check Compiler Service
 * Compiles edit check definitions into executable validation functions
 * @version 0.20.4.3
 * 
 * The compiler transforms declarative edit check definitions into
 * optimized executable functions that can validate EDC data in real-time.
 */

import {
  EditCheckDefinition,
  EditCheckResult,
  CheckCondition,
  ConditionGroup,
  ValueSource,
  FieldReference,
  ComparisonOperator,
  LogicalOperator,
  CheckTiming,
  EditCheckAction,
  EditCheckActionConfig,
  CheckResultStatus,
  EditCheckCategory,
  isConditionGroup,
  flattenConditions,
  getCheckFieldReferences,
} from '@/types/clinical-edit-check';

import { CRFField, FieldDataType } from '@/types/clinical-form';

// ============================================================================
// Compiler Configuration
// ============================================================================

export interface EditCheckCompilerConfig {
  tenantId: string;
  strictMode?: boolean;     // Fail on any compilation error
  cacheCompiled?: boolean;  // Cache compiled functions
  debugMode?: boolean;      // Include debug info in results
}

// ============================================================================
// Field Context
// ============================================================================

/**
 * Runtime context for edit check execution
 */
export interface EditCheckContext {
  // Current field value
  currentValue?: FieldValue;
  
  // Field metadata
  currentField?: {
    formOID: string;
    sectionId: string;
    fieldOID: string;
    repeatIndex?: number;
  };
  
  // Subject context
  subject?: {
    id: string;
    age?: number;
    sex?: 'M' | 'F';
    enrollmentDate?: Date;
    randomizationDate?: Date;
    firstDoseDate?: Date;
    lastDoseDate?: Date;
  };
  
  // Site context
  site?: {
    id: string;
    timezone?: string;
  };
  
  // Visit context
  visit?: {
    visitOID: string;
    visitDate?: Date;
  };
  
  // User context
  user?: {
    id: string;
    roles: string[];
  };
  
  // Study context
  study?: {
    id: string;
    startDate?: Date;
  };
  
  // Form data lookup function
  getFieldValue: (ref: FieldReference) => FieldValue | undefined;
  
  // Form instance ID
  formInstanceId: string;
  
  // Current timestamp
  currentTimestamp: Date;
}

export type FieldValue = string | number | boolean | Date | null | undefined;

// ============================================================================
// Compiled Check
// ============================================================================

/**
 * A compiled edit check ready for execution
 */
export interface CompiledEditCheck {
  checkId: string;
  checkOID: string;
  name: string;
  category: EditCheckCategory;
  timing: CheckTiming[];
  
  // Compiled precondition function (returns true if check should run)
  preconditionFn?: CompiledConditionFn;
  
  // Compiled check condition function (returns true if check fires)
  checkFn: CompiledConditionFn;
  
  // Actions to take when check fires
  actions: EditCheckActionConfig[];
  
  // Query configuration
  queryConfig?: {
    queryText: string;
    queryCategory?: string;
    autoCloseOnChange: boolean;
  };
  
  // Derivation configuration
  derivationConfig?: {
    targetFieldOID: string;
    expression: string;
    derivationFn?: (ctx: EditCheckContext) => FieldValue;
  };
  
  // Field references for dependency tracking
  fieldReferences: FieldReference[];
  
  // Compilation metadata
  compiledAt: Date;
  compilerVersion: string;
  
  // Bypass info
  bypassable: boolean;
  bypassRoles?: string[];
  
  // Dependencies
  dependsOn?: string[];
}

export type CompiledConditionFn = (ctx: EditCheckContext) => boolean;

// ============================================================================
// Compilation Result
// ============================================================================

export interface CompilationResult {
  success: boolean;
  check?: CompiledEditCheck;
  errors: CompilationError[];
  warnings: CompilationWarning[];
}

export interface CompilationError {
  code: string;
  message: string;
  location?: string;
}

export interface CompilationWarning {
  code: string;
  message: string;
  location?: string;
}

// ============================================================================
// Edit Check Templates
// ============================================================================

export type EditCheckTemplateType = 
  | 'RANGE_CHECK'
  | 'DATE_SEQUENCE'
  | 'REQUIRED_IF'
  | 'CROSS_FIELD_COMPARE'
  | 'CROSS_FORM_REFERENCE'
  | 'AGE_CHECK'
  | 'FUTURE_DATE'
  | 'DATE_IN_STUDY'
  | 'CHANGE_FROM_BASELINE'
  | 'WITHIN_WINDOW'
  | 'VALID_CODELIST';

export interface EditCheckTemplate {
  id: string;
  type: EditCheckTemplateType;
  name: string;
  description: string;
  category: EditCheckCategory;
  parameters: TemplateParameter[];
  createDefinition: (params: Record<string, unknown>) => Partial<EditCheckDefinition>;
}

export interface TemplateParameter {
  name: string;
  type: 'field' | 'value' | 'number' | 'date' | 'operator' | 'list';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

// ============================================================================
// Batch Execution
// ============================================================================

export interface BatchValidationRequest {
  formInstanceId: string;
  timing: CheckTiming;
  checks: CompiledEditCheck[];
  context: EditCheckContext;
  stopOnFirstError?: boolean;
}

export interface BatchValidationResult {
  formInstanceId: string;
  timing: CheckTiming;
  executedAt: Date;
  totalChecks: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  executionTimeMs: number;
  results: EditCheckResult[];
  hasBlockingErrors: boolean;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IEditCheckCompilerService {
  // Compilation
  compile(check: EditCheckDefinition): CompilationResult;
  compileAll(checks: EditCheckDefinition[]): Map<string, CompilationResult>;
  
  // Execution
  execute(compiled: CompiledEditCheck, context: EditCheckContext): EditCheckResult;
  executeBatch(request: BatchValidationRequest): BatchValidationResult;
  
  // Templates
  getTemplates(): EditCheckTemplate[];
  getTemplate(type: EditCheckTemplateType): EditCheckTemplate | undefined;
  createFromTemplate(type: EditCheckTemplateType, params: Record<string, unknown>): Partial<EditCheckDefinition>;
  
  // Expression evaluation
  evaluateExpression(expression: string, context: EditCheckContext): FieldValue;
  
  // Dependency resolution
  getExecutionOrder(checks: CompiledEditCheck[]): CompiledEditCheck[];
  getDependencies(check: CompiledEditCheck): string[];
  
  // Cache management
  clearCache(): void;
  getCacheStats(): { size: number; hits: number; misses: number };
}

// ============================================================================
// Edit Check Compiler Service Implementation
// ============================================================================

export class EditCheckCompilerService implements IEditCheckCompilerService {
  private config: EditCheckCompilerConfig;
  private cache: Map<string, CompiledEditCheck> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private templates: Map<EditCheckTemplateType, EditCheckTemplate>;
  
  constructor(config: EditCheckCompilerConfig) {
    this.config = {
      strictMode: false,
      cacheCompiled: true,
      debugMode: false,
      ...config,
    };
    this.templates = this.initializeTemplates();
  }
  
  // --------------------------------------------------------------------------
  // Compilation
  // --------------------------------------------------------------------------
  
  compile(check: EditCheckDefinition): CompilationResult {
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];
    
    try {
      // Check cache first
      if (this.config.cacheCompiled && this.cache.has(check.id)) {
        this.cacheHits++;
        return {
          success: true,
          check: this.cache.get(check.id),
          errors: [],
          warnings: [],
        };
      }
      this.cacheMisses++;
      
      // Validate check structure
      this.validateCheckStructure(check, errors, warnings);
      
      if (errors.length > 0 && this.config.strictMode) {
        return { success: false, errors, warnings };
      }
      
      // Compile precondition
      let preconditionFn: CompiledConditionFn | undefined;
      if (check.precondition) {
        try {
          preconditionFn = this.compileConditionGroup(check.precondition);
        } catch (e) {
          errors.push({
            code: 'PRECONDITION_COMPILE_ERROR',
            message: `Failed to compile precondition: ${e instanceof Error ? e.message : 'Unknown error'}`,
            location: 'precondition',
          });
        }
      }
      
      // Compile main check condition
      let checkFn: CompiledConditionFn;
      try {
        checkFn = this.compileConditionGroup(check.checkCondition);
      } catch (e) {
        errors.push({
          code: 'CONDITION_COMPILE_ERROR',
          message: `Failed to compile check condition: ${e instanceof Error ? e.message : 'Unknown error'}`,
          location: 'checkCondition',
        });
        return { success: false, errors, warnings };
      }
      
      // Compile derivation if present
      let derivationFn: ((ctx: EditCheckContext) => FieldValue) | undefined;
      if (check.derivationConfig) {
        try {
          derivationFn = this.compileExpression(check.derivationConfig.expression);
        } catch (e) {
          warnings.push({
            code: 'DERIVATION_COMPILE_WARNING',
            message: `Failed to compile derivation: ${e instanceof Error ? e.message : 'Unknown error'}`,
            location: 'derivationConfig',
          });
        }
      }
      
      // Get field references
      const fieldReferences = getCheckFieldReferences(check);
      
      // Build compiled check
      const compiled: CompiledEditCheck = {
        checkId: check.id,
        checkOID: check.checkOID,
        name: check.name,
        category: check.category,
        timing: check.timing,
        preconditionFn,
        checkFn,
        actions: check.actions,
        queryConfig: check.queryConfig,
        derivationConfig: check.derivationConfig ? {
          ...check.derivationConfig,
          derivationFn,
        } : undefined,
        fieldReferences,
        compiledAt: new Date(),
        compilerVersion: '0.20.4.3',
        bypassable: check.bypassable,
        bypassRoles: check.bypassRoles,
        dependsOn: check.dependsOn,
      };
      
      // Cache if enabled
      if (this.config.cacheCompiled) {
        this.cache.set(check.id, compiled);
      }
      
      return { success: true, check: compiled, errors, warnings };
    } catch (e) {
      errors.push({
        code: 'COMPILATION_ERROR',
        message: `Unexpected compilation error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
      return { success: false, errors, warnings };
    }
  }
  
  compileAll(checks: EditCheckDefinition[]): Map<string, CompilationResult> {
    const results = new Map<string, CompilationResult>();
    
    for (const check of checks) {
      results.set(check.id, this.compile(check));
    }
    
    return results;
  }
  
  // --------------------------------------------------------------------------
  // Condition Compilation
  // --------------------------------------------------------------------------
  
  private compileConditionGroup(group: ConditionGroup): CompiledConditionFn {
    const compiledConditions: CompiledConditionFn[] = [];
    
    for (const item of group.conditions) {
      if (isConditionGroup(item)) {
        compiledConditions.push(this.compileConditionGroup(item));
      } else {
        compiledConditions.push(this.compileCondition(item));
      }
    }
    
    return (ctx: EditCheckContext): boolean => {
      if (group.logicalOperator === 'NOT') {
        // NOT applies to first condition only
        return !compiledConditions[0](ctx);
      }
      
      if (group.logicalOperator === 'AND') {
        return compiledConditions.every(fn => fn(ctx));
      }
      
      // OR
      return compiledConditions.some(fn => fn(ctx));
    };
  }
  
  private compileCondition(condition: CheckCondition): CompiledConditionFn {
    return (ctx: EditCheckContext): boolean => {
      const leftValue = this.resolveValueSource(condition.leftOperand, ctx);
      
      // Handle unary operators
      if (condition.operator === 'IS_NULL') {
        return leftValue === null || leftValue === undefined || leftValue === '';
      }
      if (condition.operator === 'IS_NOT_NULL') {
        return leftValue !== null && leftValue !== undefined && leftValue !== '';
      }
      
      // Get right operand
      const rightValue = condition.rightOperand 
        ? this.resolveValueSource(condition.rightOperand, ctx)
        : undefined;
      
      return this.evaluateComparison(
        condition.operator,
        leftValue,
        rightValue,
        condition.rightOperandSecondary 
          ? this.resolveValueSource(condition.rightOperandSecondary, ctx)
          : undefined,
        condition.valueList,
        condition.dayCount
      );
    };
  }
  
  private resolveValueSource(source: ValueSource, ctx: EditCheckContext): FieldValue {
    switch (source.type) {
      case 'LITERAL':
        return source.literalValue;
        
      case 'FIELD':
        if (!source.fieldReference) {
          return undefined;
        }
        return ctx.getFieldValue(source.fieldReference);
        
      case 'SYSTEM':
        return this.resolveSystemVariable(source.systemVariable!, ctx);
        
      case 'CALCULATION':
        return this.evaluateExpression(source.calculationExpression!, ctx);
        
      default:
        return undefined;
    }
  }
  
  private resolveSystemVariable(
    variable: string,
    ctx: EditCheckContext
  ): FieldValue {
    switch (variable) {
      case 'CURRENT_DATE':
        return ctx.currentTimestamp;
      case 'CURRENT_TIME':
        return ctx.currentTimestamp;
      case 'CURRENT_DATETIME':
        return ctx.currentTimestamp;
      case 'SUBJECT_AGE':
        return ctx.subject?.age;
      case 'SUBJECT_SEX':
        return ctx.subject?.sex;
      case 'STUDY_START_DATE':
        return ctx.study?.startDate;
      case 'ENROLLMENT_DATE':
        return ctx.subject?.enrollmentDate;
      case 'RANDOMIZATION_DATE':
        return ctx.subject?.randomizationDate;
      case 'FIRST_DOSE_DATE':
        return ctx.subject?.firstDoseDate;
      case 'LAST_DOSE_DATE':
        return ctx.subject?.lastDoseDate;
      case 'VISIT_DATE':
        return ctx.visit?.visitDate;
      case 'USER_ID':
        return ctx.user?.id;
      case 'SITE_ID':
        return ctx.site?.id;
      default:
        return undefined;
    }
  }
  
  private evaluateComparison(
    operator: ComparisonOperator,
    left: FieldValue,
    right: FieldValue,
    secondary?: FieldValue,
    valueList?: (string | number)[],
    dayCount?: number
  ): boolean {
    // Convert to comparable types
    const l = this.normalizeValue(left);
    const r = this.normalizeValue(right);
    const s = secondary ? this.normalizeValue(secondary) : undefined;
    
    switch (operator) {
      case 'EQ':
        return this.compareEqual(l, r);
      case 'NE':
        return !this.compareEqual(l, r);
      case 'GT':
        return this.compareGreater(l, r);
      case 'GE':
        return this.compareGreater(l, r) || this.compareEqual(l, r);
      case 'LT':
        return this.compareGreater(r, l);
      case 'LE':
        return this.compareGreater(r, l) || this.compareEqual(l, r);
      case 'IN':
        return valueList ? valueList.includes(l as string | number) : false;
      case 'NOT_IN':
        return valueList ? !valueList.includes(l as string | number) : true;
      case 'BETWEEN':
        return this.compareGreater(l, r) || this.compareEqual(l, r)
          ? (s !== undefined && (this.compareGreater(s, l) || this.compareEqual(s, l)))
          : false;
      case 'NOT_BETWEEN':
        return !this.evaluateComparison('BETWEEN', left, right, secondary);
      case 'CONTAINS':
        return typeof l === 'string' && typeof r === 'string' && l.includes(r);
      case 'NOT_CONTAINS':
        return typeof l === 'string' && typeof r === 'string' && !l.includes(r);
      case 'STARTS_WITH':
        return typeof l === 'string' && typeof r === 'string' && l.startsWith(r);
      case 'ENDS_WITH':
        return typeof l === 'string' && typeof r === 'string' && l.endsWith(r);
      case 'MATCHES':
        if (typeof l !== 'string' || typeof r !== 'string') return false;
        try {
          return new RegExp(r).test(l);
        } catch {
          return false;
        }
      case 'BEFORE':
        return this.compareDates(l, r) < 0;
      case 'AFTER':
        return this.compareDates(l, r) > 0;
      case 'SAME_DAY':
        return this.compareDates(l, r) === 0;
      case 'WITHIN_DAYS':
        if (dayCount === undefined) return false;
        const diff = Math.abs(this.compareDates(l, r));
        return diff <= dayCount;
      default:
        return false;
    }
  }
  
  private normalizeValue(value: FieldValue): string | number | boolean | Date | null {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Try parsing as date
      const dateMatch = /^\d{4}-\d{2}-\d{2}/.test(value);
      if (dateMatch) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
      }
      // Try parsing as number
      const num = parseFloat(value);
      if (!isNaN(num) && value.trim() !== '') return num;
      return value;
    }
    return value;
  }
  
  private compareEqual(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    return a === b;
  }
  
  private compareGreater(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() > b.getTime();
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a > b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a > b;
    }
    return false;
  }
  
  private compareDates(a: unknown, b: unknown): number {
    const dateA = a instanceof Date ? a : new Date(String(a));
    const dateB = b instanceof Date ? b : new Date(String(b));
    
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
      return NaN;
    }
    
    // Compare date parts only (ignore time)
    const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
    const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
    
    const diffMs = dayA.getTime() - dayB.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }
  
  // --------------------------------------------------------------------------
  // Expression Evaluation
  // --------------------------------------------------------------------------
  
  evaluateExpression(expression: string, ctx: EditCheckContext): FieldValue {
    // Simple expression parser for common patterns
    const trimmed = expression.trim();
    
    // Field reference: ${FORM.FIELD} or ${FIELD}
    const fieldRefMatch = trimmed.match(/^\$\{([^}]+)\}$/);
    if (fieldRefMatch) {
      const parts = fieldRefMatch[1].split('.');
      const fieldRef: FieldReference = {
        formOID: parts.length > 1 ? parts[0] : undefined,
        fieldOID: parts.length > 1 ? parts[1] : parts[0],
      };
      // Try direct lookup first, then with current form
      let value = ctx.getFieldValue(fieldRef);
      if (value === undefined && !fieldRef.formOID && ctx.currentField?.formOID) {
        value = ctx.getFieldValue({
          ...fieldRef,
          formOID: ctx.currentField.formOID,
        });
      }
      return value;
    }
    
    // System variable: @CURRENT_DATE
    const sysVarMatch = trimmed.match(/^@(\w+)$/);
    if (sysVarMatch) {
      return this.resolveSystemVariable(sysVarMatch[1], ctx);
    }
    
    // Date arithmetic: ${DATE} + 7 (must check before numeric arithmetic)
    const dateArithMatch = trimmed.match(/^\$\{([^}]+)\}\s*([+\-])\s*(\d+)$/);
    if (dateArithMatch) {
      const dateVal = this.evaluateExpression(`\${${dateArithMatch[1]}}`, ctx);
      
      // Only treat as date arithmetic if value looks like a date
      if (dateVal instanceof Date || (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal))) {
        const date = dateVal instanceof Date ? dateVal : new Date(String(dateVal));
        const days = parseInt(dateArithMatch[3], 10);
        
        if (!isNaN(date.getTime()) && !isNaN(days)) {
          const result = new Date(date);
          if (dateArithMatch[2] === '+') {
            result.setDate(result.getDate() + days);
          } else {
            result.setDate(result.getDate() - days);
          }
          return result;
        }
      }
      
      // Fall through to numeric arithmetic
      const leftNum = typeof dateVal === 'number' ? dateVal : parseFloat(String(dateVal));
      const rightNum = parseInt(dateArithMatch[3], 10);
      
      if (!isNaN(leftNum) && !isNaN(rightNum)) {
        return dateArithMatch[2] === '+' ? leftNum + rightNum : leftNum - rightNum;
      }
      
      return null;
    }
    
    // Arithmetic: ${A} + ${B}
    const arithmeticMatch = trimmed.match(/^\$\{([^}]+)\}\s*([+\-*/])\s*\$\{([^}]+)\}$/);
    if (arithmeticMatch) {
      const left = this.evaluateExpression(`\${${arithmeticMatch[1]}}`, ctx);
      const right = this.evaluateExpression(`\${${arithmeticMatch[3]}}`, ctx);
      const leftNum = typeof left === 'number' ? left : parseFloat(String(left));
      const rightNum = typeof right === 'number' ? right : parseFloat(String(right));
      
      if (isNaN(leftNum) || isNaN(rightNum)) return null;
      
      switch (arithmeticMatch[2]) {
        case '+': return leftNum + rightNum;
        case '-': return leftNum - rightNum;
        case '*': return leftNum * rightNum;
        case '/': return rightNum !== 0 ? leftNum / rightNum : null;
      }
    }
    
    // Age calculation: AGE(${BRTHDTC})
    const ageMatch = trimmed.match(/^AGE\(\$\{([^}]+)\}\)$/);
    if (ageMatch) {
      const birthDate = this.evaluateExpression(`\${${ageMatch[1]}}`, ctx);
      const bd = birthDate instanceof Date ? birthDate : new Date(String(birthDate));
      
      if (isNaN(bd.getTime())) return null;
      
      const today = ctx.currentTimestamp;
      let age = today.getFullYear() - bd.getFullYear();
      const monthDiff = today.getMonth() - bd.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
        age--;
      }
      return age;
    }
    
    // DATEDIFF: DATEDIFF(${A}, ${B})
    const dateDiffMatch = trimmed.match(/^DATEDIFF\(\$\{([^}]+)\},\s*\$\{([^}]+)\}\)$/);
    if (dateDiffMatch) {
      const date1 = this.evaluateExpression(`\${${dateDiffMatch[1]}}`, ctx);
      const date2 = this.evaluateExpression(`\${${dateDiffMatch[2]}}`, ctx);
      
      const d1 = date1 instanceof Date ? date1 : new Date(String(date1));
      const d2 = date2 instanceof Date ? date2 : new Date(String(date2));
      
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
      
      return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // BMI calculation: BMI(${WEIGHT}, ${HEIGHT})
    const bmiMatch = trimmed.match(/^BMI\(\$\{([^}]+)\},\s*\$\{([^}]+)\}\)$/);
    if (bmiMatch) {
      const weight = this.evaluateExpression(`\${${bmiMatch[1]}}`, ctx);
      const height = this.evaluateExpression(`\${${bmiMatch[2]}}`, ctx);
      
      const w = typeof weight === 'number' ? weight : parseFloat(String(weight));
      const h = typeof height === 'number' ? height : parseFloat(String(height));
      
      if (isNaN(w) || isNaN(h) || h === 0) return null;
      
      // Height in cm, weight in kg
      const heightM = h / 100;
      return Math.round((w / (heightM * heightM)) * 10) / 10;
    }
    
    // BSA calculation: BSA(${WEIGHT}, ${HEIGHT})
    const bsaMatch = trimmed.match(/^BSA\(\$\{([^}]+)\},\s*\$\{([^}]+)\}\)$/);
    if (bsaMatch) {
      const weight = this.evaluateExpression(`\${${bsaMatch[1]}}`, ctx);
      const height = this.evaluateExpression(`\${${bsaMatch[2]}}`, ctx);
      
      const w = typeof weight === 'number' ? weight : parseFloat(String(weight));
      const h = typeof height === 'number' ? height : parseFloat(String(height));
      
      if (isNaN(w) || isNaN(h)) return null;
      
      // Mosteller formula
      return Math.round(Math.sqrt((h * w) / 3600) * 100) / 100;
    }
    
    // Literal number
    const numMatch = trimmed.match(/^-?\d+(\.\d+)?$/);
    if (numMatch) {
      return parseFloat(trimmed);
    }
    
    // Literal string
    const strMatch = trimmed.match(/^"([^"]*)"$|^'([^']*)'$/);
    if (strMatch) {
      return strMatch[1] || strMatch[2] || '';
    }
    
    // Unknown expression
    return null;
  }
  
  compileExpression(expression: string): (ctx: EditCheckContext) => FieldValue {
    return (ctx: EditCheckContext) => this.evaluateExpression(expression, ctx);
  }
  
  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  
  private validateCheckStructure(
    check: EditCheckDefinition,
    errors: CompilationError[],
    warnings: CompilationWarning[]
  ): void {
    // Check required fields
    if (!check.id) {
      errors.push({ code: 'MISSING_ID', message: 'Edit check ID is required' });
    }
    if (!check.checkOID) {
      errors.push({ code: 'MISSING_OID', message: 'Edit check OID is required' });
    }
    if (!check.name) {
      errors.push({ code: 'MISSING_NAME', message: 'Edit check name is required' });
    }
    if (!check.checkCondition) {
      errors.push({ code: 'MISSING_CONDITION', message: 'Check condition is required' });
    }
    if (!check.actions || check.actions.length === 0) {
      warnings.push({ code: 'NO_ACTIONS', message: 'Edit check has no actions defined' });
    }
    if (!check.timing || check.timing.length === 0) {
      warnings.push({ code: 'NO_TIMING', message: 'Edit check has no timing specified' });
    }
    
    // Validate condition structure
    if (check.checkCondition) {
      this.validateConditionGroup(check.checkCondition, errors, warnings, 'checkCondition');
    }
    if (check.precondition) {
      this.validateConditionGroup(check.precondition, errors, warnings, 'precondition');
    }
    
    // Validate actions
    for (let i = 0; i < (check.actions?.length || 0); i++) {
      const action = check.actions[i];
      if (action.action === 'SET_VALUE' && !action.setValue && !check.derivationConfig) {
        warnings.push({
          code: 'SET_VALUE_NO_VALUE',
          message: `Action ${i} is SET_VALUE but no value or derivation specified`,
          location: `actions[${i}]`,
        });
      }
      if (['ENABLE_FIELD', 'DISABLE_FIELD', 'SHOW_FIELD', 'HIDE_FIELD', 'REQUIRE_FIELD', 'UNREQUIRE_FIELD']
          .includes(action.action) && !action.targetFieldOID) {
        errors.push({
          code: 'MISSING_TARGET_FIELD',
          message: `Action ${action.action} requires targetFieldOID`,
          location: `actions[${i}]`,
        });
      }
    }
  }
  
  private validateConditionGroup(
    group: ConditionGroup,
    errors: CompilationError[],
    warnings: CompilationWarning[],
    path: string
  ): void {
    if (!group.conditions || group.conditions.length === 0) {
      errors.push({
        code: 'EMPTY_CONDITION_GROUP',
        message: 'Condition group has no conditions',
        location: path,
      });
      return;
    }
    
    for (let i = 0; i < group.conditions.length; i++) {
      const item = group.conditions[i];
      const itemPath = `${path}.conditions[${i}]`;
      
      if (isConditionGroup(item)) {
        this.validateConditionGroup(item, errors, warnings, itemPath);
      } else {
        this.validateCondition(item, errors, warnings, itemPath);
      }
    }
  }
  
  private validateCondition(
    condition: CheckCondition,
    errors: CompilationError[],
    warnings: CompilationWarning[],
    path: string
  ): void {
    if (!condition.leftOperand) {
      errors.push({
        code: 'MISSING_LEFT_OPERAND',
        message: 'Condition missing left operand',
        location: path,
      });
    }
    
    if (!condition.operator) {
      errors.push({
        code: 'MISSING_OPERATOR',
        message: 'Condition missing operator',
        location: path,
      });
    }
    
    // Check if binary operator needs right operand
    const unaryOps: ComparisonOperator[] = ['IS_NULL', 'IS_NOT_NULL'];
    const listOps: ComparisonOperator[] = ['IN', 'NOT_IN'];
    
    if (!unaryOps.includes(condition.operator) && !listOps.includes(condition.operator)) {
      if (!condition.rightOperand) {
        errors.push({
          code: 'MISSING_RIGHT_OPERAND',
          message: `Operator ${condition.operator} requires right operand`,
          location: path,
        });
      }
    }
    
    if (listOps.includes(condition.operator) && (!condition.valueList || condition.valueList.length === 0)) {
      errors.push({
        code: 'MISSING_VALUE_LIST',
        message: `Operator ${condition.operator} requires value list`,
        location: path,
      });
    }
    
    if (['BETWEEN', 'NOT_BETWEEN'].includes(condition.operator) && !condition.rightOperandSecondary) {
      errors.push({
        code: 'MISSING_SECONDARY_OPERAND',
        message: `Operator ${condition.operator} requires secondary operand`,
        location: path,
      });
    }
    
    if (condition.operator === 'WITHIN_DAYS' && condition.dayCount === undefined) {
      errors.push({
        code: 'MISSING_DAY_COUNT',
        message: 'WITHIN_DAYS requires dayCount',
        location: path,
      });
    }
  }
  
  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------
  
  execute(compiled: CompiledEditCheck, context: EditCheckContext): EditCheckResult {
    const startTime = Date.now();
    
    try {
      // Check precondition
      if (compiled.preconditionFn && !compiled.preconditionFn(context)) {
        return {
          checkId: compiled.checkId,
          checkOID: compiled.checkOID,
          checkName: compiled.name,
          status: 'SKIPPED',
          actionsTaken: [],
          bypassed: false,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
          formInstanceId: context.formInstanceId,
          fieldOID: context.currentField?.fieldOID,
          sectionId: context.currentField?.sectionId,
        };
      }
      
      // Execute main check
      const checkFired = compiled.checkFn(context);
      
      if (!checkFired) {
        return {
          checkId: compiled.checkId,
          checkOID: compiled.checkOID,
          checkName: compiled.name,
          status: 'PASSED',
          actionsTaken: [],
          bypassed: false,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
          formInstanceId: context.formInstanceId,
          fieldOID: context.currentField?.fieldOID,
          sectionId: context.currentField?.sectionId,
        };
      }
      
      // Check fired - execute actions
      const actionsTaken: EditCheckResult['actionsTaken'] = [];
      
      for (const action of compiled.actions.sort((a, b) => a.priority - b.priority)) {
        const taken: EditCheckResult['actionsTaken'][0] = {
          action: action.action,
          message: action.message,
          targetField: action.targetFieldOID,
        };
        
        if (action.action === 'SET_VALUE') {
          if (compiled.derivationConfig?.derivationFn) {
            taken.value = compiled.derivationConfig.derivationFn(context) as string | number;
          } else if (action.setValue !== undefined) {
            taken.value = action.setValue;
          }
        }
        
        actionsTaken.push(taken);
      }
      
      return {
        checkId: compiled.checkId,
        checkOID: compiled.checkOID,
        checkName: compiled.name,
        status: 'FAILED',
        actionsTaken,
        bypassed: false,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        formInstanceId: context.formInstanceId,
        fieldOID: context.currentField?.fieldOID,
        sectionId: context.currentField?.sectionId,
      };
    } catch (e) {
      return {
        checkId: compiled.checkId,
        checkOID: compiled.checkOID,
        checkName: compiled.name,
        status: 'ERROR',
        actionsTaken: [{
          action: 'LOG_ONLY',
          message: `Execution error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        }],
        bypassed: false,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        formInstanceId: context.formInstanceId,
        fieldOID: context.currentField?.fieldOID,
        sectionId: context.currentField?.sectionId,
      };
    }
  }
  
  executeBatch(request: BatchValidationRequest): BatchValidationResult {
    const startTime = Date.now();
    const results: EditCheckResult[] = [];
    
    // Sort checks by dependencies
    const orderedChecks = this.getExecutionOrder(request.checks);
    
    let hasBlockingErrors = false;
    
    for (const check of orderedChecks) {
      // Skip if not applicable for this timing
      if (!check.timing.includes(request.timing)) {
        continue;
      }
      
      const result = this.execute(check, request.context);
      results.push(result);
      
      if (result.status === 'FAILED') {
        const hasHardError = result.actionsTaken.some(a => a.action === 'HARD_ERROR');
        if (hasHardError) {
          hasBlockingErrors = true;
          if (request.stopOnFirstError) {
            break;
          }
        }
      }
    }
    
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const skipped = results.filter(r => r.status === 'SKIPPED').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    
    return {
      formInstanceId: request.formInstanceId,
      timing: request.timing,
      executedAt: new Date(),
      totalChecks: results.length,
      passed,
      failed,
      skipped,
      errors,
      executionTimeMs: Date.now() - startTime,
      results,
      hasBlockingErrors,
    };
  }
  
  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------
  
  getTemplates(): EditCheckTemplate[] {
    return Array.from(this.templates.values());
  }
  
  getTemplate(type: EditCheckTemplateType): EditCheckTemplate | undefined {
    return this.templates.get(type);
  }
  
  createFromTemplate(type: EditCheckTemplateType, params: Record<string, unknown>): Partial<EditCheckDefinition> {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Unknown template type: ${type}`);
    }
    
    // Validate required parameters
    for (const param of template.parameters) {
      if (param.required && params[param.name] === undefined) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
    
    return template.createDefinition(params);
  }
  
  private initializeTemplates(): Map<EditCheckTemplateType, EditCheckTemplate> {
    const templates = new Map<EditCheckTemplateType, EditCheckTemplate>();
    
    // Range Check Template
    templates.set('RANGE_CHECK', {
      id: 'tpl-range-check',
      type: 'RANGE_CHECK',
      name: 'Range Check',
      description: 'Validates that a numeric value is within specified bounds',
      category: 'RANGE',
      parameters: [
        { name: 'fieldOID', type: 'field', required: true, description: 'Field to validate' },
        { name: 'minValue', type: 'number', required: false, description: 'Minimum allowed value' },
        { name: 'maxValue', type: 'number', required: false, description: 'Maximum allowed value' },
        { name: 'action', type: 'value', required: false, description: 'Action on failure', defaultValue: 'SOFT_ERROR' },
      ],
      createDefinition: (params) => ({
        category: 'RANGE',
        timing: ['ON_BLUR', 'ON_SAVE'],
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'OR',
          conditions: [
            ...(params.minValue !== undefined ? [{
              id: 'c1',
              leftOperand: { type: 'FIELD' as const, fieldReference: { fieldOID: params.fieldOID as string } },
              operator: 'LT' as ComparisonOperator,
              rightOperand: { type: 'LITERAL' as const, literalValue: params.minValue as number },
            }] : []),
            ...(params.maxValue !== undefined ? [{
              id: 'c2',
              leftOperand: { type: 'FIELD' as const, fieldReference: { fieldOID: params.fieldOID as string } },
              operator: 'GT' as ComparisonOperator,
              rightOperand: { type: 'LITERAL' as const, literalValue: params.maxValue as number },
            }] : []),
          ],
        },
        actions: [{
          action: (params.action || 'SOFT_ERROR') as EditCheckAction,
          message: `Value must be ${params.minValue !== undefined ? `≥ ${params.minValue}` : ''} ${params.minValue !== undefined && params.maxValue !== undefined ? 'and' : ''} ${params.maxValue !== undefined ? `≤ ${params.maxValue}` : ''}`,
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    // Date Sequence Template
    templates.set('DATE_SEQUENCE', {
      id: 'tpl-date-sequence',
      type: 'DATE_SEQUENCE',
      name: 'Date Sequence',
      description: 'Validates that one date is after another',
      category: 'TEMPORAL',
      parameters: [
        { name: 'laterDateFieldOID', type: 'field', required: true, description: 'The date that should be later' },
        { name: 'earlierDateFieldOID', type: 'field', required: true, description: 'The date that should be earlier' },
        { name: 'allowSameDay', type: 'value', required: false, description: 'Allow dates to be the same', defaultValue: true },
      ],
      createDefinition: (params) => ({
        category: 'TEMPORAL',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'p1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.laterDateFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
            {
              id: 'p2',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.earlierDateFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
          ],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.laterDateFieldOID as string } },
            operator: params.allowSameDay ? 'BEFORE' : 'BEFORE',
            rightOperand: { type: 'FIELD', fieldReference: { fieldOID: params.earlierDateFieldOID as string } },
          }],
        },
        actions: [{
          action: 'SOFT_ERROR',
          message: `Date must be ${params.allowSameDay ? 'on or ' : ''}after ${params.earlierDateFieldOID}`,
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    // Required If Template
    templates.set('REQUIRED_IF', {
      id: 'tpl-required-if',
      type: 'REQUIRED_IF',
      name: 'Required If',
      description: 'Makes a field required based on another field value',
      category: 'REQUIRED',
      parameters: [
        { name: 'requiredFieldOID', type: 'field', required: true, description: 'Field that becomes required' },
        { name: 'conditionFieldOID', type: 'field', required: true, description: 'Field to check' },
        { name: 'conditionValue', type: 'value', required: true, description: 'Value that triggers requirement' },
      ],
      createDefinition: (params) => ({
        category: 'REQUIRED',
        timing: ['ON_SAVE', 'ON_COMPLETE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'p1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.conditionFieldOID as string } },
            operator: 'EQ',
            rightOperand: { type: 'LITERAL', literalValue: params.conditionValue as string },
          }],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.requiredFieldOID as string } },
            operator: 'IS_NULL',
          }],
        },
        actions: [{
          action: 'HARD_ERROR',
          message: `This field is required when ${params.conditionFieldOID} is ${params.conditionValue}`,
          targetFieldOID: params.requiredFieldOID as string,
          priority: 1,
        }],
        bypassable: false,
      }),
    });
    
    // Future Date Template
    templates.set('FUTURE_DATE', {
      id: 'tpl-future-date',
      type: 'FUTURE_DATE',
      name: 'No Future Dates',
      description: 'Ensures a date is not in the future',
      category: 'TEMPORAL',
      parameters: [
        { name: 'fieldOID', type: 'field', required: true, description: 'Date field to validate' },
        { name: 'allowToday', type: 'value', required: false, description: 'Allow today\'s date', defaultValue: true },
      ],
      createDefinition: (params) => ({
        category: 'TEMPORAL',
        timing: ['ON_BLUR', 'ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'p1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
            operator: 'IS_NOT_NULL',
          }],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
            operator: 'AFTER',
            rightOperand: { type: 'SYSTEM', systemVariable: 'CURRENT_DATE' },
          }],
        },
        actions: [{
          action: 'HARD_ERROR',
          message: 'Date cannot be in the future',
          priority: 1,
        }],
        bypassable: false,
      }),
    });
    
    // Age Check Template
    templates.set('AGE_CHECK', {
      id: 'tpl-age-check',
      type: 'AGE_CHECK',
      name: 'Age Range Check',
      description: 'Validates subject age is within study limits',
      category: 'RANGE',
      parameters: [
        { name: 'birthDateFieldOID', type: 'field', required: true, description: 'Date of birth field' },
        { name: 'minAge', type: 'number', required: false, description: 'Minimum age in years' },
        { name: 'maxAge', type: 'number', required: false, description: 'Maximum age in years' },
      ],
      createDefinition: (params) => ({
        category: 'RANGE',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'p1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.birthDateFieldOID as string } },
            operator: 'IS_NOT_NULL',
          }],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'OR',
          conditions: [
            ...(params.minAge !== undefined ? [{
              id: 'c1',
              leftOperand: { type: 'CALCULATION' as const, calculationExpression: `AGE(\${${params.birthDateFieldOID}})` },
              operator: 'LT' as ComparisonOperator,
              rightOperand: { type: 'LITERAL' as const, literalValue: params.minAge as number },
            }] : []),
            ...(params.maxAge !== undefined ? [{
              id: 'c2',
              leftOperand: { type: 'CALCULATION' as const, calculationExpression: `AGE(\${${params.birthDateFieldOID}})` },
              operator: 'GT' as ComparisonOperator,
              rightOperand: { type: 'LITERAL' as const, literalValue: params.maxAge as number },
            }] : []),
          ],
        },
        actions: [{
          action: 'HARD_ERROR',
          message: `Subject age must be ${params.minAge !== undefined ? `≥ ${params.minAge}` : ''} ${params.minAge !== undefined && params.maxAge !== undefined ? 'and' : ''} ${params.maxAge !== undefined ? `≤ ${params.maxAge}` : ''} years`,
          priority: 1,
        }],
        bypassable: false,
      }),
    });
    
    // Cross-Field Compare Template
    templates.set('CROSS_FIELD_COMPARE', {
      id: 'tpl-cross-field-compare',
      type: 'CROSS_FIELD_COMPARE',
      name: 'Cross-Field Comparison',
      description: 'Compares two fields with a specified operator',
      category: 'CROSS_FIELD',
      parameters: [
        { name: 'field1OID', type: 'field', required: true, description: 'First field' },
        { name: 'operator', type: 'operator', required: true, description: 'Comparison operator' },
        { name: 'field2OID', type: 'field', required: true, description: 'Second field' },
      ],
      createDefinition: (params) => ({
        category: 'CROSS_FIELD',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'p1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.field1OID as string } },
              operator: 'IS_NOT_NULL',
            },
            {
              id: 'p2',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.field2OID as string } },
              operator: 'IS_NOT_NULL',
            },
          ],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.field1OID as string } },
            operator: this.negateOperator(params.operator as ComparisonOperator),
            rightOperand: { type: 'FIELD', fieldReference: { fieldOID: params.field2OID as string } },
          }],
        },
        actions: [{
          action: 'SOFT_ERROR',
          message: `${params.field1OID} must be ${params.operator} ${params.field2OID}`,
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    // Within Window Template
    templates.set('WITHIN_WINDOW', {
      id: 'tpl-within-window',
      type: 'WITHIN_WINDOW',
      name: 'Within Visit Window',
      description: 'Validates a date is within the visit window',
      category: 'TEMPORAL',
      parameters: [
        { name: 'dateFieldOID', type: 'field', required: true, description: 'Date field to check' },
        { name: 'targetDateFieldOID', type: 'field', required: true, description: 'Target/scheduled date' },
        { name: 'windowDays', type: 'number', required: true, description: 'Allowed window in days' },
      ],
      createDefinition: (params) => ({
        category: 'TEMPORAL',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'p1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.dateFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
            {
              id: 'p2',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.targetDateFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
          ],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'NOT',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.dateFieldOID as string } },
            operator: 'WITHIN_DAYS',
            rightOperand: { type: 'FIELD', fieldReference: { fieldOID: params.targetDateFieldOID as string } },
            dayCount: params.windowDays as number,
          }],
        },
        actions: [{
          action: 'WARNING',
          message: `Date is outside the ${params.windowDays}-day visit window`,
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    // Valid Codelist Template
    templates.set('VALID_CODELIST', {
      id: 'tpl-valid-codelist',
      type: 'VALID_CODELIST',
      name: 'Valid Codelist Value',
      description: 'Validates a value is in the allowed list',
      category: 'FORMAT',
      parameters: [
        { name: 'fieldOID', type: 'field', required: true, description: 'Field to validate' },
        { name: 'allowedValues', type: 'list', required: true, description: 'List of allowed values' },
      ],
      createDefinition: (params) => ({
        category: 'FORMAT',
        timing: ['ON_BLUR', 'ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'p1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
            operator: 'IS_NOT_NULL',
          }],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
            operator: 'NOT_IN',
            valueList: params.allowedValues as (string | number)[],
          }],
        },
        actions: [{
          action: 'HARD_ERROR',
          message: 'Invalid value selected',
          priority: 1,
        }],
        bypassable: false,
      }),
    });
    
    // Date in Study Template
    templates.set('DATE_IN_STUDY', {
      id: 'tpl-date-in-study',
      type: 'DATE_IN_STUDY',
      name: 'Date Within Study Period',
      description: 'Validates a date is within the study period for the subject',
      category: 'TEMPORAL',
      parameters: [
        { name: 'fieldOID', type: 'field', required: true, description: 'Date field to validate' },
      ],
      createDefinition: (params) => ({
        category: 'TEMPORAL',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'p1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
            operator: 'IS_NOT_NULL',
          }],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'OR',
          conditions: [
            {
              id: 'c1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
              operator: 'BEFORE',
              rightOperand: { type: 'SYSTEM', systemVariable: 'ENROLLMENT_DATE' },
            },
            {
              id: 'c2',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.fieldOID as string } },
              operator: 'AFTER',
              rightOperand: { type: 'SYSTEM', systemVariable: 'CURRENT_DATE' },
            },
          ],
        },
        actions: [{
          action: 'SOFT_ERROR',
          message: 'Date must be within the subject\'s study participation period',
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    // Change from Baseline Template
    templates.set('CHANGE_FROM_BASELINE', {
      id: 'tpl-change-from-baseline',
      type: 'CHANGE_FROM_BASELINE',
      name: 'Change from Baseline',
      description: 'Calculates and validates change from baseline value',
      category: 'CALCULATION',
      parameters: [
        { name: 'currentFieldOID', type: 'field', required: true, description: 'Current value field' },
        { name: 'baselineFormOID', type: 'field', required: true, description: 'Baseline form OID' },
        { name: 'baselineFieldOID', type: 'field', required: true, description: 'Baseline value field' },
        { name: 'changeFieldOID', type: 'field', required: true, description: 'Target field for change' },
      ],
      createDefinition: (params) => ({
        category: 'CALCULATION',
        timing: ['ON_CHANGE', 'ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'p1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.currentFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
            {
              id: 'p2',
              leftOperand: { 
                type: 'FIELD', 
                fieldReference: { 
                  formOID: params.baselineFormOID as string,
                  fieldOID: params.baselineFieldOID as string,
                } 
              },
              operator: 'IS_NOT_NULL',
            },
          ],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'LITERAL', literalValue: true },
            operator: 'EQ',
            rightOperand: { type: 'LITERAL', literalValue: true },
          }],
        },
        derivationConfig: {
          targetFieldOID: params.changeFieldOID as string,
          expression: `\${${params.currentFieldOID}} - \${${params.baselineFormOID}.${params.baselineFieldOID}}`,
        },
        actions: [{
          action: 'SET_VALUE',
          targetFieldOID: params.changeFieldOID as string,
          priority: 1,
        }],
        bypassable: false,
      }),
    });
    
    // Cross-Form Reference Template
    templates.set('CROSS_FORM_REFERENCE', {
      id: 'tpl-cross-form-reference',
      type: 'CROSS_FORM_REFERENCE',
      name: 'Cross-Form Reference',
      description: 'Validates a value against a field on another form',
      category: 'CROSS_FORM',
      parameters: [
        { name: 'currentFieldOID', type: 'field', required: true, description: 'Current form field' },
        { name: 'referenceFormOID', type: 'field', required: true, description: 'Reference form OID' },
        { name: 'referenceFieldOID', type: 'field', required: true, description: 'Reference field OID' },
        { name: 'operator', type: 'operator', required: true, description: 'Comparison operator' },
      ],
      createDefinition: (params) => ({
        category: 'CROSS_FORM',
        timing: ['ON_SAVE'],
        precondition: {
          id: 'pre-1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'p1',
              leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.currentFieldOID as string } },
              operator: 'IS_NOT_NULL',
            },
            {
              id: 'p2',
              leftOperand: { 
                type: 'FIELD', 
                fieldReference: { 
                  formOID: params.referenceFormOID as string,
                  fieldOID: params.referenceFieldOID as string,
                } 
              },
              operator: 'IS_NOT_NULL',
            },
          ],
        },
        checkCondition: {
          id: 'cond-1',
          logicalOperator: 'AND',
          conditions: [{
            id: 'c1',
            leftOperand: { type: 'FIELD', fieldReference: { fieldOID: params.currentFieldOID as string } },
            operator: this.negateOperator(params.operator as ComparisonOperator),
            rightOperand: { 
              type: 'FIELD', 
              fieldReference: { 
                formOID: params.referenceFormOID as string,
                fieldOID: params.referenceFieldOID as string,
              } 
            },
          }],
        },
        actions: [{
          action: 'SOFT_ERROR',
          message: `Value must be ${params.operator} the value in ${params.referenceFormOID}.${params.referenceFieldOID}`,
          priority: 1,
        }],
        bypassable: true,
      }),
    });
    
    return templates;
  }
  
  private negateOperator(operator: ComparisonOperator): ComparisonOperator {
    const negations: Partial<Record<ComparisonOperator, ComparisonOperator>> = {
      'EQ': 'NE',
      'NE': 'EQ',
      'GT': 'LE',
      'GE': 'LT',
      'LT': 'GE',
      'LE': 'GT',
      'BEFORE': 'AFTER',
      'AFTER': 'BEFORE',
    };
    return negations[operator] || operator;
  }
  
  // --------------------------------------------------------------------------
  // Dependency Resolution
  // --------------------------------------------------------------------------
  
  getExecutionOrder(checks: CompiledEditCheck[]): CompiledEditCheck[] {
    const checkMap = new Map<string, CompiledEditCheck>();
    const visited = new Set<string>();
    const order: CompiledEditCheck[] = [];
    
    for (const check of checks) {
      checkMap.set(check.checkId, check);
    }
    
    const visit = (check: CompiledEditCheck) => {
      if (visited.has(check.checkId)) return;
      visited.add(check.checkId);
      
      // Visit dependencies first
      if (check.dependsOn) {
        for (const depId of check.dependsOn) {
          const dep = checkMap.get(depId);
          if (dep) {
            visit(dep);
          }
        }
      }
      
      order.push(check);
    };
    
    for (const check of checks) {
      visit(check);
    }
    
    return order;
  }
  
  getDependencies(check: CompiledEditCheck): string[] {
    return check.dependsOn || [];
  }
  
  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------
  
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEditCheckCompilerService(
  config: EditCheckCompilerConfig
): IEditCheckCompilerService {
  return new EditCheckCompilerService(config);
}
