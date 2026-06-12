
/**
 * Arm Randomization Configuration
 * Types and utilities for randomization strategy configuration
 * @version 0.20.1.2
 */

import type { StudyArm, TreatmentType } from '@/types/clinical-trial';

// ============================================================================
// Randomization Types
// ============================================================================

export type RandomizationMethod = 
  | 'SIMPLE'
  | 'BLOCK'
  | 'STRATIFIED'
  | 'MINIMIZATION'
  | 'COVARIATE_ADAPTIVE'
  | 'RESPONSE_ADAPTIVE';

export type BlockSizeType = 'FIXED' | 'VARIABLE' | 'PERMUTED';

export type AllocationConcealment = 
  | 'CENTRAL_IVRS'
  | 'CENTRAL_WEB'
  | 'SEQUENTIALLY_NUMBERED_CONTAINERS'
  | 'SEQUENTIALLY_NUMBERED_SEALED_ENVELOPES'
  | 'OTHER';

export interface RandomizationConfig {
  id: string;
  studyId: string;
  
  // Method
  method: RandomizationMethod;
  description?: string;
  
  // Allocation ratio
  allocationRatio: AllocationRatio;
  
  // Block randomization settings
  blockConfig?: BlockRandomizationConfig;
  
  // Stratification settings
  stratificationConfig?: StratificationConfig;
  
  // Minimization settings
  minimizationConfig?: MinimizationConfig;
  
  // Concealment
  allocationConcealment: AllocationConcealment;
  blindingScheme: BlindingScheme;
  
  // Seed and audit
  seedStrategy: SeedStrategy;
  seed?: number;
  
  // Status
  isActive: boolean;
  activatedAt?: Date;
  activatedBy?: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface AllocationRatio {
  // e.g., [2, 1] for 2:1 randomization
  ratios: number[];
  // Corresponding arm IDs
  armIds: string[];
}

export interface BlockRandomizationConfig {
  blockSizeType: BlockSizeType;
  
  // Fixed block size
  fixedBlockSize?: number;
  
  // Variable block sizes (e.g., [4, 6, 8])
  variableBlockSizes?: number[];
  
  // Whether to use permuted blocks
  usePermutedBlocks: boolean;
}

export interface StratificationConfig {
  factors: StratificationFactor[];
  
  // Whether stratification is required for randomization
  stratificationRequired: boolean;
  
  // Maximum imbalance allowed within strata
  maxImbalance?: number;
}

export interface StratificationFactor {
  id: string;
  name: string;
  description?: string;
  
  // Factor levels (e.g., ['Male', 'Female'] for sex)
  levels: StratificationLevel[];
  
  // Order for display and reporting
  order: number;
  
  // Whether this factor is required
  isRequired: boolean;
}

export interface StratificationLevel {
  id: string;
  value: string;
  label: string;
  order: number;
}

export interface MinimizationConfig {
  factors: MinimizationFactor[];
  
  // Probability of following deterministic assignment
  probability: number; // 0.7-1.0 typically
  
  // Whether to use biased coin
  useBiasedCoin: boolean;
  
  // Margin for determining balance
  balanceMargin: number;
}

export interface MinimizationFactor {
  id: string;
  name: string;
  weight: number; // Factor importance weight
  levels: string[];
}

export interface BlindingScheme {
  type: BlindingType;
  unblinderRoles?: string[];
  emergencyUnblindingProcedure?: string;
}

export type BlindingType = 
  | 'OPEN_LABEL'
  | 'SINGLE_BLIND'
  | 'DOUBLE_BLIND'
  | 'TRIPLE_BLIND';

export interface SeedStrategy {
  type: 'FIXED' | 'TIME_BASED' | 'CRYPTOGRAPHIC';
  
  // For fixed seeds, document who approved
  fixedSeedApprover?: string;
  fixedSeedApprovalDate?: Date;
}

// ============================================================================
// Randomization List Types
// ============================================================================

export interface RandomizationList {
  id: string;
  configId: string;
  studyId: string;
  siteId?: string; // Null for central lists
  stratum?: string; // Stratum identifier if stratified
  
  // List properties
  totalSlots: number;
  usedSlots: number;
  
  // Assignments
  assignments: RandomizationAssignment[];
  
  // Status
  status: RandomizationListStatus;
  generatedAt: Date;
  generatedBy: string;
  
  // Audit
  lastAccessedAt?: Date;
  lastAccessedBy?: string;
}

export type RandomizationListStatus = 
  | 'DRAFT'
  | 'APPROVED'
  | 'ACTIVE'
  | 'EXHAUSTED'
  | 'ARCHIVED';

export interface RandomizationAssignment {
  sequenceNumber: number;
  armId: string;
  armName: string;
  treatmentCode?: string;
  blockNumber?: number;
  
  // Usage tracking
  isUsed: boolean;
  usedAt?: Date;
  usedFor?: string; // Subject ID
}

// ============================================================================
// Validation Types
// ============================================================================

export interface RandomizationValidationResult {
  isValid: boolean;
  errors: RandomizationValidationError[];
  warnings: RandomizationValidationWarning[];
}

export interface RandomizationValidationError {
  code: string;
  field: string;
  message: string;
}

export interface RandomizationValidationWarning {
  code: string;
  field: string;
  message: string;
  recommendation?: string;
}

// ============================================================================
// Arm Randomization Service Interface
// ============================================================================

export interface IArmRandomizationConfigService {
  // Configuration CRUD
  createConfig(studyId: string, config: Omit<RandomizationConfig, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>): Promise<RandomizationConfig>;
  updateConfig(configId: string, updates: Partial<RandomizationConfig>, updatedBy: string): Promise<RandomizationConfig>;
  getConfig(studyId: string): Promise<RandomizationConfig | null>;
  
  // Validation
  validateConfig(config: RandomizationConfig, arms: StudyArm[]): Promise<RandomizationValidationResult>;
  
  // List generation
  generateList(configId: string, options: ListGenerationOptions): Promise<RandomizationList>;
  
  // Allocation ratio helpers
  calculateAllocationRatio(arms: StudyArm[]): AllocationRatio;
  validateAllocationRatio(ratio: AllocationRatio, arms: StudyArm[]): boolean;
}

export interface ListGenerationOptions {
  siteId?: string;
  stratum?: string;
  size: number;
  seed?: number;
  generatedBy: string;
}

// ============================================================================
// Arm Randomization Service Implementation
// ============================================================================

export class ArmRandomizationConfigService implements IArmRandomizationConfigService {
  private configs: Map<string, RandomizationConfig> = new Map();
  private lists: Map<string, RandomizationList[]> = new Map();
  
  // ===========================================================================
  // Configuration CRUD
  // ===========================================================================
  
  async createConfig(
    studyId: string,
    configInput: Omit<RandomizationConfig, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>
  ): Promise<RandomizationConfig> {
    // Check for existing config
    if (this.configs.has(studyId)) {
      throw new Error(`Randomization config already exists for study ${studyId}`);
    }
    
    const now = new Date();
    const config: RandomizationConfig = {
      ...configInput,
      id: crypto.randomUUID(),
      studyId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.configs.set(studyId, config);
    return config;
  }
  
  async updateConfig(
    configId: string,
    updates: Partial<RandomizationConfig>,
    updatedBy: string
  ): Promise<RandomizationConfig> {
    // Find config by ID
    let config: RandomizationConfig | undefined;
    for (const c of Array.from(Array.from(this.configs.values()))) {
      if (c.id === configId) {
        config = c;
        break;
      }
    }
    
    if (!config) {
      throw new Error(`Randomization config not found: ${configId}`);
    }
    
    // Don't allow updates to active configs
    if (config.isActive) {
      throw new Error('Cannot update active randomization configuration');
    }
    
    const updatedConfig: RandomizationConfig = {
      ...config,
      ...updates,
      id: config.id, // Prevent ID change
      studyId: config.studyId, // Prevent study change
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.configs.set(config.studyId, updatedConfig);
    return updatedConfig;
  }
  
  async getConfig(studyId: string): Promise<RandomizationConfig | null> {
    return this.configs.get(studyId) ?? null;
  }
  
  // ===========================================================================
  // Validation
  // ===========================================================================
  
  async validateConfig(
    config: RandomizationConfig,
    arms: StudyArm[]
  ): Promise<RandomizationValidationResult> {
    const errors: RandomizationValidationError[] = [];
    const warnings: RandomizationValidationWarning[] = [];
    
    // Validate allocation ratio
    if (config.allocationRatio.ratios.length !== config.allocationRatio.armIds.length) {
      errors.push({
        code: 'RATIO_ARM_MISMATCH',
        field: 'allocationRatio',
        message: 'Number of ratios must match number of arms',
      });
    }
    
    // Validate arm IDs exist
    const armIds = new Set(arms.map(a => a.id));
    for (const armId of config.allocationRatio.armIds) {
      if (!armIds.has(armId)) {
        errors.push({
          code: 'INVALID_ARM_ID',
          field: 'allocationRatio.armIds',
          message: `Arm ID not found: ${armId}`,
        });
      }
    }
    
    // Validate all arms are included
    if (config.allocationRatio.armIds.length !== arms.length) {
      warnings.push({
        code: 'NOT_ALL_ARMS_INCLUDED',
        field: 'allocationRatio',
        message: 'Not all study arms are included in randomization',
        recommendation: 'Verify this is intentional (e.g., some arms may be non-randomized)',
      });
    }
    
    // Validate ratios are positive
    for (const ratio of config.allocationRatio.ratios) {
      if (ratio <= 0) {
        errors.push({
          code: 'INVALID_RATIO',
          field: 'allocationRatio.ratios',
          message: 'Allocation ratios must be positive',
        });
        break;
      }
    }
    
    // Validate block config if block randomization
    if (config.method === 'BLOCK' && config.blockConfig) {
      const bc = config.blockConfig;
      const totalRatio = config.allocationRatio.ratios.reduce((a, b) => a + b, 0);
      
      if (bc.blockSizeType === 'FIXED' && bc.fixedBlockSize) {
        if (bc.fixedBlockSize % totalRatio !== 0) {
          errors.push({
            code: 'INVALID_BLOCK_SIZE',
            field: 'blockConfig.fixedBlockSize',
            message: `Block size must be a multiple of allocation ratio sum (${totalRatio})`,
          });
        }
        if (bc.fixedBlockSize < totalRatio * 2) {
          warnings.push({
            code: 'SMALL_BLOCK_SIZE',
            field: 'blockConfig.fixedBlockSize',
            message: 'Small block sizes may compromise blinding',
            recommendation: 'Consider using variable block sizes',
          });
        }
      }
      
      if (bc.blockSizeType === 'VARIABLE' && bc.variableBlockSizes) {
        for (const size of bc.variableBlockSizes) {
          if (size % totalRatio !== 0) {
            errors.push({
              code: 'INVALID_BLOCK_SIZE',
              field: 'blockConfig.variableBlockSizes',
              message: `Block size ${size} must be a multiple of allocation ratio sum (${totalRatio})`,
            });
          }
        }
      }
    }
    
    // Validate stratification config
    if (config.method === 'STRATIFIED' && config.stratificationConfig) {
      if (config.stratificationConfig.factors.length === 0) {
        errors.push({
          code: 'NO_STRATIFICATION_FACTORS',
          field: 'stratificationConfig.factors',
          message: 'At least one stratification factor is required',
        });
      }
      
      // Check for factor level counts (warn if too many strata)
      let totalStrata = 1;
      for (const factor of config.stratificationConfig.factors) {
        totalStrata *= factor.levels.length;
      }
      if (totalStrata > 20) {
        warnings.push({
          code: 'MANY_STRATA',
          field: 'stratificationConfig.factors',
          message: `${totalStrata} strata may lead to imbalance in small studies`,
          recommendation: 'Consider reducing stratification factors or using minimization',
        });
      }
    }
    
    // Validate minimization config
    if (config.method === 'MINIMIZATION' && config.minimizationConfig) {
      if (config.minimizationConfig.probability < 0.5 || config.minimizationConfig.probability > 1) {
        errors.push({
          code: 'INVALID_MINIMIZATION_PROBABILITY',
          field: 'minimizationConfig.probability',
          message: 'Minimization probability must be between 0.5 and 1.0',
        });
      }
      
      // Validate weights sum
      const totalWeight = config.minimizationConfig.factors.reduce((sum, f) => sum + f.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        warnings.push({
          code: 'WEIGHTS_NOT_NORMALIZED',
          field: 'minimizationConfig.factors',
          message: 'Factor weights do not sum to 1.0',
          recommendation: 'Normalize weights for easier interpretation',
        });
      }
    }
    
    // Validate blinding
    if (config.blindingScheme.type === 'DOUBLE_BLIND' && config.allocationConcealment === 'OTHER') {
      warnings.push({
        code: 'WEAK_CONCEALMENT_FOR_BLINDING',
        field: 'allocationConcealment',
        message: 'Double-blind studies should use central randomization',
        recommendation: 'Consider IVRS or web-based central randomization',
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  // ===========================================================================
  // List Generation
  // ===========================================================================
  
  async generateList(
    configId: string,
    options: ListGenerationOptions
  ): Promise<RandomizationList> {
    // Find config
    let config: RandomizationConfig | undefined;
    for (const c of Array.from(Array.from(this.configs.values()))) {
      if (c.id === configId) {
        config = c;
        break;
      }
    }
    
    if (!config) {
      throw new Error(`Randomization config not found: ${configId}`);
    }
    
    // Generate assignments based on method
    const assignments = this.generateAssignments(config, options.size, options.seed);
    
    const list: RandomizationList = {
      id: crypto.randomUUID(),
      configId,
      studyId: config.studyId,
      siteId: options.siteId,
      stratum: options.stratum,
      totalSlots: options.size,
      usedSlots: 0,
      assignments,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedBy: options.generatedBy,
    };
    
    // Store list
    const studyLists = this.lists.get(config.studyId) ?? [];
    studyLists.push(list);
    this.lists.set(config.studyId, studyLists);
    
    return list;
  }
  
  private generateAssignments(
    config: RandomizationConfig,
    size: number,
    seed?: number
  ): RandomizationAssignment[] {
    // Seed random number generator
    const rng = seed !== undefined ? this.seededRandom(seed) : Math.random;
    
    switch (config.method) {
      case 'SIMPLE':
        return this.generateSimpleRandomization(config, size, rng);
      case 'BLOCK':
        return this.generateBlockRandomization(config, size, rng);
      default:
        return this.generateBlockRandomization(config, size, rng);
    }
  }
  
  private generateSimpleRandomization(
    config: RandomizationConfig,
    size: number,
    rng: () => number
  ): RandomizationAssignment[] {
    const assignments: RandomizationAssignment[] = [];
    const { ratios, armIds } = config.allocationRatio;
    const totalRatio = ratios.reduce((a, b) => a + b, 0);
    
    // Calculate cumulative probabilities
    const cumProbs: number[] = [];
    let cumSum = 0;
    for (const ratio of ratios) {
      cumSum += ratio / totalRatio;
      cumProbs.push(cumSum);
    }
    
    for (let i = 0; i < size; i++) {
      const r = rng();
      let armIndex = 0;
      for (let j = 0; j < cumProbs.length; j++) {
        if (r <= cumProbs[j]) {
          armIndex = j;
          break;
        }
      }
      
      assignments.push({
        sequenceNumber: i + 1,
        armId: armIds[armIndex],
        armName: `Arm ${armIndex + 1}`, // Would get actual name from arms
        isUsed: false,
      });
    }
    
    return assignments;
  }
  
  private generateBlockRandomization(
    config: RandomizationConfig,
    size: number,
    rng: () => number
  ): RandomizationAssignment[] {
    const assignments: RandomizationAssignment[] = [];
    const { ratios, armIds } = config.allocationRatio;
    const totalRatio = ratios.reduce((a, b) => a + b, 0);
    
    // Determine block size
    let blockSize = totalRatio * 2; // Default
    if (config.blockConfig) {
      if (config.blockConfig.blockSizeType === 'FIXED' && config.blockConfig.fixedBlockSize) {
        blockSize = config.blockConfig.fixedBlockSize;
      } else if (config.blockConfig.variableBlockSizes?.length) {
        // Randomly select block size
        const sizes = config.blockConfig.variableBlockSizes;
        blockSize = sizes[Math.floor(rng() * sizes.length)];
      }
    }
    
    // Generate blocks
    let sequenceNumber = 1;
    let blockNumber = 1;
    
    while (sequenceNumber <= size) {
      // Create one block
      const block: RandomizationAssignment[] = [];
      const multiplier = blockSize / totalRatio;
      
      // Add assignments according to ratio
      for (let i = 0; i < ratios.length; i++) {
        const count = ratios[i] * multiplier;
        for (let j = 0; j < count; j++) {
          block.push({
            sequenceNumber: 0, // Will be set after shuffle
            armId: armIds[i],
            armName: `Arm ${i + 1}`,
            blockNumber,
            isUsed: false,
          });
        }
      }
      
      // Shuffle the block (Fisher-Yates)
      for (let i = block.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [block[i], block[j]] = [block[j], block[i]];
      }
      
      // Add to assignments
      for (const assignment of block) {
        if (sequenceNumber > size) break;
        assignment.sequenceNumber = sequenceNumber++;
        assignments.push(assignment);
      }
      
      blockNumber++;
    }
    
    return assignments;
  }
  
  private seededRandom(seed: number): () => number {
    // Simple seeded PRNG (Mulberry32)
    return () => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  // ===========================================================================
  // Allocation Ratio Helpers
  // ===========================================================================
  
  calculateAllocationRatio(arms: StudyArm[]): AllocationRatio {
    // Calculate ratio based on planned subjects
    const subjects = arms.map(a => a.plannedSubjects);
    const gcd = this.gcdArray(subjects);
    
    return {
      ratios: subjects.map(s => s / gcd),
      armIds: arms.map(a => a.id),
    };
  }
  
  validateAllocationRatio(ratio: AllocationRatio, arms: StudyArm[]): boolean {
    // Check all arm IDs exist
    const armIds = new Set(arms.map(a => a.id));
    for (const id of ratio.armIds) {
      if (!armIds.has(id)) return false;
    }
    
    // Check ratio length matches
    if (ratio.ratios.length !== ratio.armIds.length) return false;
    
    // Check all ratios are positive
    if (ratio.ratios.some(r => r <= 0)) return false;
    
    return true;
  }
  
  private gcdArray(arr: number[]): number {
    return arr.reduce((a, b) => this.gcd(a, b));
  }
  
  private gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Get all lists for a study
   */
  async getLists(studyId: string): Promise<RandomizationList[]> {
    return this.lists.get(studyId) ?? [];
  }
  
  /**
   * Activate a configuration
   */
  async activateConfig(configId: string, activatedBy: string): Promise<RandomizationConfig> {
    let config: RandomizationConfig | undefined;
    for (const c of Array.from(Array.from(this.configs.values()))) {
      if (c.id === configId) {
        config = c;
        break;
      }
    }
    
    if (!config) {
      throw new Error(`Randomization config not found: ${configId}`);
    }
    
    if (config.isActive) {
      throw new Error('Configuration is already active');
    }
    
    const activatedConfig: RandomizationConfig = {
      ...config,
      isActive: true,
      activatedAt: new Date(),
      activatedBy,
      updatedAt: new Date(),
      updatedBy: activatedBy,
    };
    
    this.configs.set(config.studyId, activatedConfig);
    return activatedConfig;
  }
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.configs.clear();
    this.lists.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createArmRandomizationConfigService(): ArmRandomizationConfigService {
  return new ArmRandomizationConfigService();
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getMethodDisplayName(method: RandomizationMethod): string {
  const names: Record<RandomizationMethod, string> = {
    SIMPLE: 'Simple Randomization',
    BLOCK: 'Block Randomization',
    STRATIFIED: 'Stratified Randomization',
    MINIMIZATION: 'Minimization',
    COVARIATE_ADAPTIVE: 'Covariate-Adaptive Randomization',
    RESPONSE_ADAPTIVE: 'Response-Adaptive Randomization',
  };
  return names[method];
}

export function getBlindingTypeDisplayName(type: BlindingType): string {
  const names: Record<BlindingType, string> = {
    OPEN_LABEL: 'Open-Label',
    SINGLE_BLIND: 'Single-Blind',
    DOUBLE_BLIND: 'Double-Blind',
    TRIPLE_BLIND: 'Triple-Blind',
  };
  return names[type];
}

export function getAllocationConcealmentDisplayName(concealment: AllocationConcealment): string {
  const names: Record<AllocationConcealment, string> = {
    CENTRAL_IVRS: 'Central IVRS/IRT',
    CENTRAL_WEB: 'Central Web-Based System',
    SEQUENTIALLY_NUMBERED_CONTAINERS: 'Sequentially Numbered Drug Containers',
    SEQUENTIALLY_NUMBERED_SEALED_ENVELOPES: 'Sequentially Numbered Sealed Envelopes',
    OTHER: 'Other',
  };
  return names[concealment];
}
