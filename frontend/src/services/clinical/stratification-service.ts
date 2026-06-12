
/**
 * Stratification Service
 * Advanced stratification management and treatment allocation
 * @version 0.20.8.2
 */

import type {
  StratificationFactor,
  StratificationLevel,
  AllocationRatio,
  RandomizationConfig,
} from './arm-randomization-config';

// ============================================================================
// Stratification Factor Management Types
// ============================================================================

export interface StratificationFactorConfig {
  id: string;
  studyId: string;
  
  // Factor definition
  name: string;
  description?: string;
  
  // Levels
  levels: StratificationLevelConfig[];
  
  // Validation
  validationRules?: FactorValidationRule[];
  
  // Collection
  collectionMethod: CollectionMethod;
  collectionTiming: CollectionTiming;
  
  // Capping
  cappingEnabled: boolean;
  cappingThreshold?: number; // Max subjects per level
  
  // Required
  isRequired: boolean;
  
  // Order
  order: number;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface StratificationLevelConfig {
  id: string;
  factorId: string;
  
  // Level definition
  value: string;
  label: string;
  description?: string;
  
  // Range for numeric factors
  rangeMin?: number;
  rangeMax?: number;
  
  // Order
  order: number;
  
  // Status
  isActive: boolean;
}

export interface FactorValidationRule {
  id: string;
  type: ValidationRuleType;
  message: string;
  parameters?: Record<string, unknown>;
}

export type ValidationRuleType = 
  | 'REQUIRED'
  | 'ALLOWED_VALUES'
  | 'NUMERIC_RANGE'
  | 'DATE_RANGE'
  | 'PATTERN'
  | 'CUSTOM';

export type CollectionMethod = 
  | 'EDC_FORM'
  | 'SCREENING_FORM'
  | 'IVRS_ENTRY'
  | 'AUTO_CALCULATED'
  | 'MANUAL_ENTRY';

export type CollectionTiming = 
  | 'AT_SCREENING'
  | 'AT_RANDOMIZATION'
  | 'PRE_SCREENING'
  | 'IMPORTED';

// ============================================================================
// Treatment Allocation Types
// ============================================================================

export interface TreatmentArm {
  id: string;
  studyId: string;
  
  // Arm definition
  name: string;
  code: string;
  description?: string;
  
  // Treatment details
  treatment: TreatmentDetails;
  
  // Allocation
  allocationRatio: number;
  
  // Capacity
  plannedSubjects: number;
  enrolledSubjects: number;
  
  // Status
  status: ArmStatus;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentDetails {
  name: string;
  type: TreatmentType;
  
  // Dosing
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  
  // IP details
  ipCode?: string;
  manufacturer?: string;
  batchNumbers?: string[];
}

export type TreatmentType = 
  | 'ACTIVE'
  | 'PLACEBO'
  | 'ACTIVE_COMPARATOR'
  | 'NO_INTERVENTION'
  | 'COMBINATION';

export type ArmStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'CLOSED'
  | 'SUSPENDED';

// ============================================================================
// Kit Management Types
// ============================================================================

export interface MedicationKit {
  id: string;
  studyId: string;
  siteId?: string;
  
  // Kit info
  kitNumber: string;
  treatmentCode: string;
  armId: string;
  
  // IP details
  batchNumber?: string;
  expirationDate?: Date;
  
  // Status
  status: KitStatus;
  
  // Assignment
  assignedToSubject?: string;
  assignedAt?: Date;
  assignedBy?: string;
  
  // Shipping
  shippedDate?: Date;
  receivedDate?: Date;
  receivedBy?: string;
  
  // Temperature monitoring
  temperatureStatus?: TemperatureStatus;
  temperatureExcursions?: TemperatureExcursion[];
  
  // Dispensing
  dispensedAt?: Date;
  dispensedBy?: string;
  returnedAt?: Date;
  
  // Accountability
  pillCount?: number;
  returnedPillCount?: number;
  complianceRate?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type KitStatus = 
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ASSIGNED'
  | 'DISPENSED'
  | 'RETURNED'
  | 'QUARANTINED'
  | 'DESTROYED'
  | 'EXPIRED';

export type TemperatureStatus = 'OK' | 'EXCURSION' | 'UNKNOWN';

export interface TemperatureExcursion {
  id: string;
  recordedAt: Date;
  minTemp?: number;
  maxTemp?: number;
  duration?: number;
  impact: 'NONE' | 'UNDER_REVIEW' | 'QUARANTINE' | 'DESTROY';
  resolution?: string;
}

// ============================================================================
// Stratification Analysis Types
// ============================================================================

export interface StratificationAnalysis {
  studyId: string;
  analysisDate: Date;
  
  // Factor summaries
  factorSummaries: FactorSummary[];
  
  // Stratum details
  strataDetails: StratumDetail[];
  
  // Balance metrics
  overallBalance: BalanceMetrics;
  withinStrataBalance: BalanceMetrics[];
  
  // Enrollment projections
  enrollmentProjection: EnrollmentProjection;
  
  // Issues
  balanceIssues: BalanceIssue[];
  cappingStatus: CappingStatus[];
}

export interface FactorSummary {
  factorId: string;
  factorName: string;
  totalSubjects: number;
  levelDistribution: LevelDistribution[];
  chiSquareP?: number;
}

export interface LevelDistribution {
  levelId: string;
  levelLabel: string;
  count: number;
  percentage: number;
  expectedPercentage?: number;
}

export interface StratumDetail {
  stratumId: string;
  stratumName: string;
  factorValues: { factorId: string; levelId: string; label: string }[];
  totalSubjects: number;
  armDistribution: ArmDistribution[];
  isBalanced: boolean;
}

export interface ArmDistribution {
  armId: string;
  armName: string;
  count: number;
  percentage: number;
  expectedPercentage: number;
}

export interface BalanceMetrics {
  totalSubjects: number;
  numberOfArms: number;
  chiSquareStat?: number;
  chiSquareP?: number;
  maxImbalance: number;
  isAcceptable: boolean;
}

export interface EnrollmentProjection {
  currentEnrolled: number;
  targetEnrollment: number;
  projectedCompletionDate?: Date;
  enrollmentRate: number;
  constrainedStrata: string[];
}

export interface BalanceIssue {
  type: BalanceIssueType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  affectedStratum?: string;
  affectedArm?: string;
  recommendation: string;
}

export type BalanceIssueType = 
  | 'ARM_IMBALANCE'
  | 'STRATUM_IMBALANCE'
  | 'SMALL_STRATUM'
  | 'CAPPING_APPROACHING'
  | 'ENROLLMENT_SKEW';

export interface CappingStatus {
  factorId: string;
  levelId: string;
  currentCount: number;
  cappingThreshold: number;
  percentUsed: number;
  isCapped: boolean;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface StratificationServiceConfig {
  tenantId: string;
  
  // Balance thresholds
  acceptableImbalance?: number;
  smallStratumThreshold?: number;
  
  // Capping settings
  defaultCappingEnabled?: boolean;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IStratificationService {
  // Factor management
  createFactor(params: CreateFactorParams): StratificationFactorConfig;
  updateFactor(factorId: string, updates: Partial<StratificationFactorConfig>): StratificationFactorConfig;
  deleteFactor(factorId: string): void;
  getFactor(factorId: string): StratificationFactorConfig | null;
  listFactors(studyId: string): StratificationFactorConfig[];
  
  // Level management
  addLevel(factorId: string, level: Omit<StratificationLevelConfig, 'id' | 'factorId'>): StratificationLevelConfig;
  updateLevel(levelId: string, updates: Partial<StratificationLevelConfig>): StratificationLevelConfig;
  removeLevel(levelId: string): void;
  
  // Arm management
  createArm(params: CreateArmParams): TreatmentArm;
  updateArm(armId: string, updates: Partial<TreatmentArm>): TreatmentArm;
  getArm(armId: string): TreatmentArm | null;
  listArms(studyId: string): TreatmentArm[];
  
  // Kit management
  createKit(params: CreateKitParams): MedicationKit;
  updateKit(kitId: string, updates: Partial<MedicationKit>): MedicationKit;
  assignKit(kitId: string, subjectId: string, assignedBy: string): MedicationKit;
  dispenseKit(kitId: string, dispensedBy: string): MedicationKit;
  returnKit(kitId: string, returnedPillCount?: number): MedicationKit;
  quarantineKit(kitId: string, reason: string): MedicationKit;
  getKit(kitId: string): MedicationKit | null;
  getKitByNumber(kitNumber: string): MedicationKit | null;
  listKits(filter?: KitFilter): MedicationKit[];
  getAvailableKit(studyId: string, siteId: string, treatmentCode: string): MedicationKit | null;
  
  // Validation
  validateStratificationValues(studyId: string, values: FactorValue[]): ValidationResult;
  
  // Analysis
  analyzeStratification(studyId: string): StratificationAnalysis;
  getFactorDistribution(factorId: string): FactorSummary;
  checkCappingStatus(studyId: string): CappingStatus[];
  
  // Allocation calculation
  calculateOptimalArm(studyId: string, stratumId: string, method: AllocationMethod): string;
  getAllocationRatios(studyId: string): AllocationRatio;
}

export interface CreateFactorParams {
  studyId: string;
  name: string;
  description?: string;
  levels: Omit<StratificationLevelConfig, 'id' | 'factorId'>[];
  collectionMethod: CollectionMethod;
  collectionTiming: CollectionTiming;
  cappingEnabled?: boolean;
  cappingThreshold?: number;
  isRequired?: boolean;
  createdBy: string;
}

export interface CreateArmParams {
  studyId: string;
  name: string;
  code: string;
  description?: string;
  treatment: TreatmentDetails;
  allocationRatio: number;
  plannedSubjects: number;
}

export interface CreateKitParams {
  studyId: string;
  siteId?: string;
  kitNumber: string;
  treatmentCode: string;
  armId: string;
  batchNumber?: string;
  expirationDate?: Date;
}

export interface FactorValue {
  factorId: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  factorId: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  factorId: string;
  code: string;
  message: string;
}

export interface KitFilter {
  studyId?: string;
  siteId?: string;
  armId?: string;
  treatmentCode?: string;
  status?: KitStatus;
}

export type AllocationMethod = 
  | 'RANDOM'
  | 'MINIMIZATION'
  | 'BIASED_COIN';

// ============================================================================
// Service Implementation
// ============================================================================

export class StratificationService implements IStratificationService {
  private config: Required<StratificationServiceConfig>;
  
  // Storage
  private factors: Map<string, StratificationFactorConfig> = new Map();
  private levels: Map<string, StratificationLevelConfig> = new Map();
  private arms: Map<string, TreatmentArm> = new Map();
  private kits: Map<string, MedicationKit> = new Map();
  
  // Tracking
  private stratumCounts: Map<string, Map<string, number>> = new Map(); // studyId -> stratumId -> arm -> count
  
  constructor(config: StratificationServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      acceptableImbalance: config.acceptableImbalance ?? 0.15,
      smallStratumThreshold: config.smallStratumThreshold ?? 10,
      defaultCappingEnabled: config.defaultCappingEnabled ?? false,
    };
  }
  
  // ===========================================================================
  // Factor Management
  // ===========================================================================
  
  createFactor(params: CreateFactorParams): StratificationFactorConfig {
    const factorId = crypto.randomUUID();
    const now = new Date();
    
    const factor: StratificationFactorConfig = {
      id: factorId,
      studyId: params.studyId,
      name: params.name,
      description: params.description,
      levels: [],
      collectionMethod: params.collectionMethod,
      collectionTiming: params.collectionTiming,
      cappingEnabled: params.cappingEnabled ?? this.config.defaultCappingEnabled,
      cappingThreshold: params.cappingThreshold,
      isRequired: params.isRequired ?? true,
      order: this.getNextFactorOrder(params.studyId),
      isActive: true,
      createdAt: now,
      createdBy: params.createdBy,
      updatedAt: now,
    };
    
    // Create levels
    for (const levelInput of params.levels) {
      const level = this.createLevel(factorId, levelInput);
      factor.levels.push(level);
    }
    
    this.factors.set(factorId, factor);
    return factor;
  }
  
  private createLevel(
    factorId: string,
    levelInput: Omit<StratificationLevelConfig, 'id' | 'factorId'>
  ): StratificationLevelConfig {
    const level: StratificationLevelConfig = {
      ...levelInput,
      id: crypto.randomUUID(),
      factorId,
    };
    
    this.levels.set(level.id, level);
    return level;
  }
  
  private getNextFactorOrder(studyId: string): number {
    const studyFactors = Array.from(this.factors.values())
      .filter(f => f.studyId === studyId);
    return studyFactors.length + 1;
  }
  
  updateFactor(
    factorId: string,
    updates: Partial<StratificationFactorConfig>
  ): StratificationFactorConfig {
    const factor = this.factors.get(factorId);
    if (!factor) {
      throw new Error(`Factor not found: ${factorId}`);
    }
    
    const updated: StratificationFactorConfig = {
      ...factor,
      ...updates,
      id: factor.id,
      studyId: factor.studyId,
      createdAt: factor.createdAt,
      createdBy: factor.createdBy,
      updatedAt: new Date(),
    };
    
    this.factors.set(factorId, updated);
    return updated;
  }
  
  deleteFactor(factorId: string): void {
    const factor = this.factors.get(factorId);
    if (!factor) {
      throw new Error(`Factor not found: ${factorId}`);
    }
    
    // Delete associated levels
    for (const level of factor.levels) {
      this.levels.delete(level.id);
    }
    
    this.factors.delete(factorId);
  }
  
  getFactor(factorId: string): StratificationFactorConfig | null {
    return this.factors.get(factorId) ?? null;
  }
  
  listFactors(studyId: string): StratificationFactorConfig[] {
    return Array.from(this.factors.values())
      .filter(f => f.studyId === studyId)
      .sort((a, b) => a.order - b.order);
  }
  
  // ===========================================================================
  // Level Management
  // ===========================================================================
  
  addLevel(
    factorId: string,
    levelInput: Omit<StratificationLevelConfig, 'id' | 'factorId'>
  ): StratificationLevelConfig {
    const factor = this.factors.get(factorId);
    if (!factor) {
      throw new Error(`Factor not found: ${factorId}`);
    }
    
    const level = this.createLevel(factorId, levelInput);
    factor.levels.push(level);
    factor.updatedAt = new Date();
    
    this.factors.set(factorId, factor);
    return level;
  }
  
  updateLevel(
    levelId: string,
    updates: Partial<StratificationLevelConfig>
  ): StratificationLevelConfig {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level not found: ${levelId}`);
    }
    
    const updated: StratificationLevelConfig = {
      ...level,
      ...updates,
      id: level.id,
      factorId: level.factorId,
    };
    
    this.levels.set(levelId, updated);
    
    // Update in factor
    const factor = this.factors.get(level.factorId);
    if (factor) {
      const idx = factor.levels.findIndex(l => l.id === levelId);
      if (idx >= 0) {
        factor.levels[idx] = updated;
        factor.updatedAt = new Date();
        this.factors.set(factor.id, factor);
      }
    }
    
    return updated;
  }
  
  removeLevel(levelId: string): void {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level not found: ${levelId}`);
    }
    
    // Remove from factor
    const factor = this.factors.get(level.factorId);
    if (factor) {
      factor.levels = factor.levels.filter(l => l.id !== levelId);
      factor.updatedAt = new Date();
      this.factors.set(factor.id, factor);
    }
    
    this.levels.delete(levelId);
  }
  
  // ===========================================================================
  // Arm Management
  // ===========================================================================
  
  createArm(params: CreateArmParams): TreatmentArm {
    const now = new Date();
    
    const arm: TreatmentArm = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      name: params.name,
      code: params.code,
      description: params.description,
      treatment: params.treatment,
      allocationRatio: params.allocationRatio,
      plannedSubjects: params.plannedSubjects,
      enrolledSubjects: 0,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    
    this.arms.set(arm.id, arm);
    return arm;
  }
  
  updateArm(armId: string, updates: Partial<TreatmentArm>): TreatmentArm {
    const arm = this.arms.get(armId);
    if (!arm) {
      throw new Error(`Arm not found: ${armId}`);
    }
    
    const updated: TreatmentArm = {
      ...arm,
      ...updates,
      id: arm.id,
      studyId: arm.studyId,
      createdAt: arm.createdAt,
      updatedAt: new Date(),
    };
    
    this.arms.set(armId, updated);
    return updated;
  }
  
  getArm(armId: string): TreatmentArm | null {
    return this.arms.get(armId) ?? null;
  }
  
  listArms(studyId: string): TreatmentArm[] {
    return Array.from(this.arms.values())
      .filter(a => a.studyId === studyId)
      .sort((a, b) => a.code.localeCompare(b.code));
  }
  
  // ===========================================================================
  // Kit Management
  // ===========================================================================
  
  createKit(params: CreateKitParams): MedicationKit {
    const now = new Date();
    
    const kit: MedicationKit = {
      id: crypto.randomUUID(),
      studyId: params.studyId,
      siteId: params.siteId,
      kitNumber: params.kitNumber,
      treatmentCode: params.treatmentCode,
      armId: params.armId,
      batchNumber: params.batchNumber,
      expirationDate: params.expirationDate,
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    };
    
    this.kits.set(kit.id, kit);
    return kit;
  }
  
  updateKit(kitId: string, updates: Partial<MedicationKit>): MedicationKit {
    const kit = this.kits.get(kitId);
    if (!kit) {
      throw new Error(`Kit not found: ${kitId}`);
    }
    
    const updated: MedicationKit = {
      ...kit,
      ...updates,
      id: kit.id,
      studyId: kit.studyId,
      kitNumber: kit.kitNumber,
      createdAt: kit.createdAt,
      updatedAt: new Date(),
    };
    
    this.kits.set(kitId, updated);
    return updated;
  }
  
  assignKit(kitId: string, subjectId: string, assignedBy: string): MedicationKit {
    const kit = this.kits.get(kitId);
    if (!kit) {
      throw new Error(`Kit not found: ${kitId}`);
    }
    
    if (kit.status !== 'AVAILABLE' && kit.status !== 'RESERVED') {
      throw new Error(`Kit ${kit.kitNumber} is not available for assignment`);
    }
    
    const updated: MedicationKit = {
      ...kit,
      status: 'ASSIGNED',
      assignedToSubject: subjectId,
      assignedAt: new Date(),
      assignedBy,
      updatedAt: new Date(),
    };
    
    this.kits.set(kitId, updated);
    return updated;
  }
  
  dispenseKit(kitId: string, dispensedBy: string): MedicationKit {
    const kit = this.kits.get(kitId);
    if (!kit) {
      throw new Error(`Kit not found: ${kitId}`);
    }
    
    if (kit.status !== 'ASSIGNED') {
      throw new Error(`Kit ${kit.kitNumber} must be assigned before dispensing`);
    }
    
    const updated: MedicationKit = {
      ...kit,
      status: 'DISPENSED',
      dispensedAt: new Date(),
      dispensedBy,
      updatedAt: new Date(),
    };
    
    this.kits.set(kitId, updated);
    return updated;
  }
  
  returnKit(kitId: string, returnedPillCount?: number): MedicationKit {
    const kit = this.kits.get(kitId);
    if (!kit) {
      throw new Error(`Kit not found: ${kitId}`);
    }
    
    let complianceRate: number | undefined;
    if (kit.pillCount && returnedPillCount !== undefined) {
      const dispensed = kit.pillCount;
      const taken = dispensed - returnedPillCount;
      complianceRate = dispensed > 0 ? (taken / dispensed) * 100 : undefined;
    }
    
    const updated: MedicationKit = {
      ...kit,
      status: 'RETURNED',
      returnedAt: new Date(),
      returnedPillCount,
      complianceRate,
      updatedAt: new Date(),
    };
    
    this.kits.set(kitId, updated);
    return updated;
  }
  
  quarantineKit(kitId: string, reason: string): MedicationKit {
    const kit = this.kits.get(kitId);
    if (!kit) {
      throw new Error(`Kit not found: ${kitId}`);
    }
    
    const excursion: TemperatureExcursion = {
      id: crypto.randomUUID(),
      recordedAt: new Date(),
      impact: 'QUARANTINE',
      resolution: reason,
    };
    
    const updated: MedicationKit = {
      ...kit,
      status: 'QUARANTINED',
      temperatureStatus: 'EXCURSION',
      temperatureExcursions: [...(kit.temperatureExcursions ?? []), excursion],
      updatedAt: new Date(),
    };
    
    this.kits.set(kitId, updated);
    return updated;
  }
  
  getKit(kitId: string): MedicationKit | null {
    return this.kits.get(kitId) ?? null;
  }
  
  getKitByNumber(kitNumber: string): MedicationKit | null {
    for (const kit of Array.from(Array.from(this.kits.values()))) {
      if (kit.kitNumber === kitNumber) {
        return kit;
      }
    }
    return null;
  }
  
  listKits(filter?: KitFilter): MedicationKit[] {
    let kits = Array.from(this.kits.values());
    
    if (filter) {
      if (filter.studyId) {
        kits = kits.filter(k => k.studyId === filter.studyId);
      }
      if (filter.siteId) {
        kits = kits.filter(k => k.siteId === filter.siteId);
      }
      if (filter.armId) {
        kits = kits.filter(k => k.armId === filter.armId);
      }
      if (filter.treatmentCode) {
        kits = kits.filter(k => k.treatmentCode === filter.treatmentCode);
      }
      if (filter.status) {
        kits = kits.filter(k => k.status === filter.status);
      }
    }
    
    return kits.sort((a, b) => a.kitNumber.localeCompare(b.kitNumber));
  }
  
  getAvailableKit(studyId: string, siteId: string, treatmentCode: string): MedicationKit | null {
    // First try site-specific kits
    for (const kit of Array.from(Array.from(this.kits.values()))) {
      if (kit.studyId === studyId &&
          kit.siteId === siteId &&
          kit.treatmentCode === treatmentCode &&
          kit.status === 'AVAILABLE') {
        // Check not expired
        if (!kit.expirationDate || kit.expirationDate > new Date()) {
          return kit;
        }
      }
    }
    
    // Fall back to study-level kits (no site assigned)
    for (const kit of Array.from(Array.from(this.kits.values()))) {
      if (kit.studyId === studyId &&
          !kit.siteId &&
          kit.treatmentCode === treatmentCode &&
          kit.status === 'AVAILABLE') {
        if (!kit.expirationDate || kit.expirationDate > new Date()) {
          return kit;
        }
      }
    }
    
    return null;
  }
  
  // ===========================================================================
  // Validation
  // ===========================================================================
  
  validateStratificationValues(studyId: string, values: FactorValue[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    const factors = this.listFactors(studyId);
    const providedFactorIds = new Set(values.map(v => v.factorId));
    
    // Check required factors
    for (const factor of factors) {
      if (factor.isRequired && factor.isActive && !providedFactorIds.has(factor.id)) {
        errors.push({
          factorId: factor.id,
          code: 'REQUIRED_FACTOR_MISSING',
          message: `Required stratification factor "${factor.name}" is missing`,
        });
      }
    }
    
    // Validate provided values
    for (const value of values) {
      const factor = this.factors.get(value.factorId);
      
      if (!factor) {
        errors.push({
          factorId: value.factorId,
          code: 'FACTOR_NOT_FOUND',
          message: `Stratification factor not found: ${value.factorId}`,
        });
        continue;
      }
      
      // Check value is valid level
      const validLevel = factor.levels.find(
        l => l.value === value.value || l.id === value.value
      );
      
      if (!validLevel) {
        errors.push({
          factorId: value.factorId,
          code: 'INVALID_LEVEL',
          message: `Invalid level "${value.value}" for factor "${factor.name}"`,
        });
      } else if (!validLevel.isActive) {
        warnings.push({
          factorId: value.factorId,
          code: 'INACTIVE_LEVEL',
          message: `Level "${validLevel?.label ?? ''}" is no longer active`,
        });
      }
      
      // Check capping
      if (factor.cappingEnabled && factor.cappingThreshold && validLevel) {
        const currentCount = this.getLevelCount(studyId, value.factorId, validLevel.id);
        if (currentCount >= factor.cappingThreshold) {
          errors.push({
            factorId: value.factorId,
            code: 'LEVEL_CAPPED',
            message: `Level "${validLevel?.label ?? ''}" has reached its capping threshold`,
          });
        } else if (currentCount >= factor.cappingThreshold * 0.9) {
          warnings.push({
            factorId: value.factorId,
            code: 'APPROACHING_CAP',
            message: `Level "${validLevel?.label ?? ''}" is approaching its capping threshold`,
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  private getLevelCount(studyId: string, factorId: string, levelId: string): number {
    // This would be tracked during actual randomization
    // For now, return 0
    return 0;
  }
  
  // ===========================================================================
  // Analysis
  // ===========================================================================
  
  analyzeStratification(studyId: string): StratificationAnalysis {
    const factors = this.listFactors(studyId);
    const arms = this.listArms(studyId);
    
    const factorSummaries: FactorSummary[] = factors.map(f => 
      this.getFactorDistribution(f.id)
    );
    
    // Generate strata details
    const strataDetails: StratumDetail[] = this.generateStrataDetails(studyId, arms);
    
    // Calculate overall balance
    const overallBalance = this.calculateOverallBalance(studyId, arms);
    
    // Within-strata balance
    const withinStrataBalance = strataDetails.map(s => ({
      totalSubjects: s.totalSubjects,
      numberOfArms: s.armDistribution.length,
      maxImbalance: this.calculateMaxImbalance(s.armDistribution),
      isAcceptable: s.isBalanced,
    }));
    
    // Enrollment projection
    const enrollmentProjection = this.calculateEnrollmentProjection(studyId, arms);
    
    // Balance issues
    const balanceIssues = this.detectBalanceIssues(studyId, strataDetails, arms);
    
    // Capping status
    const cappingStatus = this.checkCappingStatus(studyId);
    
    return {
      studyId,
      analysisDate: new Date(),
      factorSummaries,
      strataDetails,
      overallBalance,
      withinStrataBalance,
      enrollmentProjection,
      balanceIssues,
      cappingStatus,
    };
  }
  
  getFactorDistribution(factorId: string): FactorSummary {
    const factor = this.factors.get(factorId);
    if (!factor) {
      throw new Error(`Factor not found: ${factorId}`);
    }
    
    // In a real implementation, this would query actual enrollment data
    const levelDistribution: LevelDistribution[] = factor.levels.map(level => ({
      levelId: level.id,
      levelLabel: level.label,
      count: 0,
      percentage: 0,
      expectedPercentage: 100 / factor.levels.length,
    }));
    
    return {
      factorId: factor.id,
      factorName: factor.name,
      totalSubjects: 0,
      levelDistribution,
    };
  }
  
  private generateStrataDetails(studyId: string, arms: TreatmentArm[]): StratumDetail[] {
    // In a real implementation, this would generate all strata combinations
    // and calculate their distributions
    return [];
  }
  
  private calculateOverallBalance(studyId: string, arms: TreatmentArm[]): BalanceMetrics {
    const totalEnrolled = arms.reduce((sum, a) => sum + a.enrolledSubjects, 0);
    const numberOfArms = arms.length;
    
    let maxImbalance = 0;
    if (totalEnrolled > 0 && numberOfArms > 1) {
      const expected = totalEnrolled / numberOfArms;
      for (const arm of arms) {
        const imbalance = Math.abs(arm.enrolledSubjects - expected) / expected;
        if (imbalance > maxImbalance) maxImbalance = imbalance;
      }
    }
    
    return {
      totalSubjects: totalEnrolled,
      numberOfArms,
      maxImbalance,
      isAcceptable: maxImbalance <= this.config.acceptableImbalance,
    };
  }
  
  private calculateMaxImbalance(armDistribution: ArmDistribution[]): number {
    let maxImbalance = 0;
    for (const arm of armDistribution) {
      const imbalance = Math.abs(arm.percentage - arm.expectedPercentage);
      if (imbalance > maxImbalance) maxImbalance = imbalance;
    }
    return maxImbalance;
  }
  
  private calculateEnrollmentProjection(studyId: string, arms: TreatmentArm[]): EnrollmentProjection {
    const currentEnrolled = arms.reduce((sum, a) => sum + a.enrolledSubjects, 0);
    const targetEnrollment = arms.reduce((sum, a) => sum + a.plannedSubjects, 0);
    
    return {
      currentEnrolled,
      targetEnrollment,
      enrollmentRate: 0, // Would calculate from historical data
      constrainedStrata: [],
    };
  }
  
  private detectBalanceIssues(
    studyId: string,
    strataDetails: StratumDetail[],
    arms: TreatmentArm[]
  ): BalanceIssue[] {
    const issues: BalanceIssue[] = [];
    
    // Check overall arm imbalance
    const totalEnrolled = arms.reduce((sum, a) => sum + a.enrolledSubjects, 0);
    if (totalEnrolled >= 10) {
      const expected = totalEnrolled / arms.length;
      for (const arm of arms) {
        const imbalance = Math.abs(arm.enrolledSubjects - expected) / expected;
        if (imbalance > this.config.acceptableImbalance) {
          issues.push({
            type: 'ARM_IMBALANCE',
            severity: imbalance > 0.25 ? 'HIGH' : 'MEDIUM',
            description: `Arm "${arm.name}" is ${imbalance > 0 ? 'over' : 'under'}-enrolled`,
            affectedArm: arm.id,
            recommendation: 'Consider adjusting allocation weights or using minimization',
          });
        }
      }
    }
    
    // Check small strata
    for (const stratum of strataDetails) {
      if (stratum.totalSubjects < this.config.smallStratumThreshold && stratum.totalSubjects > 0) {
        issues.push({
          type: 'SMALL_STRATUM',
          severity: 'LOW',
          description: `Stratum "${stratum.stratumName}" has few subjects (${stratum.totalSubjects})`,
          affectedStratum: stratum.stratumId,
          recommendation: 'Consider collapsing strata or monitoring closely',
        });
      }
    }
    
    return issues;
  }
  
  checkCappingStatus(studyId: string): CappingStatus[] {
    const statuses: CappingStatus[] = [];
    
    const factors = this.listFactors(studyId);
    
    for (const factor of factors) {
      if (!factor.cappingEnabled || !factor.cappingThreshold) continue;
      
      for (const level of factor.levels) {
        const currentCount = this.getLevelCount(studyId, factor.id, level.id);
        const percentUsed = (currentCount / factor.cappingThreshold) * 100;
        
        statuses.push({
          factorId: factor.id,
          levelId: level.id,
          currentCount,
          cappingThreshold: factor.cappingThreshold,
          percentUsed,
          isCapped: currentCount >= factor.cappingThreshold,
        });
      }
    }
    
    return statuses;
  }
  
  // ===========================================================================
  // Allocation Calculation
  // ===========================================================================
  
  calculateOptimalArm(studyId: string, stratumId: string, method: AllocationMethod): string {
    const arms = this.listArms(studyId);
    
    if (arms.length === 0) {
      throw new Error('No arms defined for study');
    }
    
    switch (method) {
      case 'RANDOM':
        return this.calculateRandomAllocation(arms);
      case 'MINIMIZATION':
        return this.calculateMinimizationAllocation(arms, stratumId);
      case 'BIASED_COIN':
        return this.calculateBiasedCoinAllocation(arms, stratumId);
      default:
        return this.calculateRandomAllocation(arms);
    }
  }
  
  private calculateRandomAllocation(arms: TreatmentArm[]): string {
    // Simple random based on allocation ratios
    const totalRatio = arms.reduce((sum, a) => sum + a.allocationRatio, 0);
    const random = Math.random() * totalRatio;
    
    let cumulative = 0;
    for (const arm of arms) {
      cumulative += arm.allocationRatio;
      if (random <= cumulative) {
        return arm.id;
      }
    }
    
    return arms[arms.length - 1].id;
  }
  
  private calculateMinimizationAllocation(arms: TreatmentArm[], stratumId: string): string {
    // Find arm with least imbalance
    let bestArm = arms[0];
    let lowestImbalance = Infinity;
    
    for (const arm of arms) {
      // Calculate what imbalance would be if this arm selected
      const hypotheticalCount = arm.enrolledSubjects + 1;
      const totalEnrolled = arms.reduce((sum, a) => sum + a.enrolledSubjects, 0) + 1;
      const expectedRatio = arm.allocationRatio / arms.reduce((sum, a) => sum + a.allocationRatio, 0);
      const actualRatio = hypotheticalCount / totalEnrolled;
      const imbalance = Math.abs(actualRatio - expectedRatio);
      
      if (imbalance < lowestImbalance) {
        lowestImbalance = imbalance;
        bestArm = arm;
      }
    }
    
    return bestArm.id;
  }
  
  private calculateBiasedCoinAllocation(arms: TreatmentArm[], stratumId: string): string {
    const probability = 0.7; // 70% chance to pick minimizing arm
    
    if (Math.random() < probability) {
      return this.calculateMinimizationAllocation(arms, stratumId);
    } else {
      return this.calculateRandomAllocation(arms);
    }
  }
  
  getAllocationRatios(studyId: string): AllocationRatio {
    const arms = this.listArms(studyId);
    
    return {
      ratios: arms.map(a => a.allocationRatio),
      armIds: arms.map(a => a.id),
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.factors.clear();
    this.levels.clear();
    this.arms.clear();
    this.kits.clear();
    this.stratumCounts.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createStratificationService(
  config: StratificationServiceConfig
): StratificationService {
  return new StratificationService(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getCollectionMethodDisplayName(method: CollectionMethod): string {
  const names: Record<CollectionMethod, string> = {
    EDC_FORM: 'EDC Form',
    SCREENING_FORM: 'Screening Form',
    IVRS_ENTRY: 'IVRS Entry',
    AUTO_CALCULATED: 'Auto-Calculated',
    MANUAL_ENTRY: 'Manual Entry',
  };
  return names[method];
}

export function getCollectionTimingDisplayName(timing: CollectionTiming): string {
  const names: Record<CollectionTiming, string> = {
    AT_SCREENING: 'At Screening',
    AT_RANDOMIZATION: 'At Randomization',
    PRE_SCREENING: 'Pre-Screening',
    IMPORTED: 'Imported',
  };
  return names[timing];
}

export function getTreatmentTypeDisplayName(type: TreatmentType): string {
  const names: Record<TreatmentType, string> = {
    ACTIVE: 'Active Treatment',
    PLACEBO: 'Placebo',
    ACTIVE_COMPARATOR: 'Active Comparator',
    NO_INTERVENTION: 'No Intervention',
    COMBINATION: 'Combination',
  };
  return names[type];
}

export function getKitStatusDisplayName(status: KitStatus): string {
  const names: Record<KitStatus, string> = {
    AVAILABLE: 'Available',
    RESERVED: 'Reserved',
    ASSIGNED: 'Assigned',
    DISPENSED: 'Dispensed',
    RETURNED: 'Returned',
    QUARANTINED: 'Quarantined',
    DESTROYED: 'Destroyed',
    EXPIRED: 'Expired',
  };
  return names[status];
}

export function getArmStatusDisplayName(status: ArmStatus): string {
  const names: Record<ArmStatus, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    SUSPENDED: 'Suspended',
  };
  return names[status];
}
