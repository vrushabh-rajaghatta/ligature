
// =============================================================================
// STRUCTURED CONTENT MIGRATIONS
// =============================================================================
// Migration helpers for the native structured content schema.
// Provides utilities for data migration from Docuvera and schema upgrades.
//
// Part of v0.18.6 - Structured Content Schema
// =============================================================================

import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Migration phase definitions
 */
export type MigrationPhase = 
  | 'not_started'
  | 'parallel_read_only'    // Phase 1: Native DB mirrors Docuvera (read-only)
  | 'write_through'         // Phase 2: Writes go to both systems
  | 'native_primary'        // Phase 3: Native is primary, Docuvera backup
  | 'completed';            // Migration complete, Docuvera disconnected

/**
 * Migration status for tracking progress
 */
export interface MigrationStatus {
  phase: MigrationPhase;
  startedAt?: Date;
  completedAt?: Date;
  
  // Progress tracking
  totalComponents: number;
  migratedComponents: number;
  totalDocuments: number;
  migratedDocuments: number;
  totalDerivations: number;
  migratedDerivations: number;
  
  // Error tracking
  errors: MigrationError[];
  warnings: MigrationWarning[];
  
  // Checkpoints
  lastCheckpoint?: Date;
  lastSuccessfulEntity?: string;
}

export interface MigrationError {
  entityType: 'component' | 'document' | 'derivation' | 'assembly';
  entityId: string;
  externalId?: string;
  error: string;
  timestamp: Date;
  retryable: boolean;
}

export interface MigrationWarning {
  entityType: 'component' | 'document' | 'derivation' | 'assembly';
  entityId: string;
  warning: string;
  timestamp: Date;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  tenantId: string;
  batchSize: number;
  dryRun: boolean;
  skipValidation: boolean;
  continueOnError: boolean;
  preserveTimestamps: boolean;
  preserveIds: boolean;
}

/**
 * Default migration options
 */
export const DEFAULT_MIGRATION_OPTIONS: MigrationOptions = {
  tenantId: 'default',
  batchSize: 100,
  dryRun: false,
  skipValidation: false,
  continueOnError: true,
  preserveTimestamps: true,
  preserveIds: true,
};

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  phase: MigrationPhase;
  
  // Counts
  componentsCreated: number;
  documentsCreated: number;
  derivationsCreated: number;
  assembliesCreated: number;
  
  // Issues
  errors: MigrationError[];
  warnings: MigrationWarning[];
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

/**
 * Schema version info
 */
export interface SchemaVersion {
  version: string;
  appliedAt: Date;
  description: string;
  checksum: string;
}

// -----------------------------------------------------------------------------
// Content Hash Utilities
// -----------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of content for change detection
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Verify content hash matches
 */
export function verifyContentHash(content: string, expectedHash: string): boolean {
  const actualHash = computeContentHash(content);
  return actualHash === expectedHash;
}

/**
 * Generate a short hash for display purposes
 */
export function shortHash(hash: string, length: number = 8): string {
  return hash.slice(0, length);
}

// -----------------------------------------------------------------------------
// Version Utilities
// -----------------------------------------------------------------------------

/**
 * Parse semantic version string
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compare two version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  
  if (vA.major !== vB.major) return vA.major < vB.major ? -1 : 1;
  if (vA.minor !== vB.minor) return vA.minor < vB.minor ? -1 : 1;
  if (vA.patch !== vB.patch) return vA.patch < vB.patch ? -1 : 1;
  
  return 0;
}

/**
 * Increment version number
 */
export function incrementVersion(
  version: string, 
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const v = parseVersion(version);
  
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
    default:
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

/**
 * Convert version string to sortable number
 */
export function versionToNumber(version: string): number {
  const v = parseVersion(version);
  return v.major * 1000000 + v.minor * 1000 + v.patch;
}

// -----------------------------------------------------------------------------
// Migration Status Helpers
// -----------------------------------------------------------------------------

/**
 * Create initial migration status
 */
export function createMigrationStatus(
  totalComponents: number = 0,
  totalDocuments: number = 0,
  totalDerivations: number = 0
): MigrationStatus {
  return {
    phase: 'not_started',
    totalComponents,
    migratedComponents: 0,
    totalDocuments,
    migratedDocuments: 0,
    totalDerivations,
    migratedDerivations: 0,
    errors: [],
    warnings: [],
  };
}

/**
 * Calculate migration progress percentage
 */
export function calculateMigrationProgress(status: MigrationStatus): number {
  const totalEntities = 
    status.totalComponents + 
    status.totalDocuments + 
    status.totalDerivations;
    
  if (totalEntities === 0) return 100;
  
  const migratedEntities = 
    status.migratedComponents + 
    status.migratedDocuments + 
    status.migratedDerivations;
    
  return Math.round((migratedEntities / totalEntities) * 100);
}

/**
 * Check if migration can proceed to next phase
 */
export function canAdvancePhase(status: MigrationStatus): boolean {
  // Can't advance if there are unresolved errors
  if (status.errors.length > 0) return false;
  
  // Check phase-specific requirements
  switch (status.phase) {
    case 'not_started':
      // Can start migration anytime
      return true;
      
    case 'parallel_read_only':
      // Need all entities migrated to move to write-through
      return (
        status.migratedComponents >= status.totalComponents &&
        status.migratedDocuments >= status.totalDocuments &&
        status.migratedDerivations >= status.totalDerivations
      );
      
    case 'write_through':
      // Require validation period before native primary
      // In production, would check for X days of successful operation
      return true;
      
    case 'native_primary':
      // Final validation before completing
      return true;
      
    case 'completed':
      // Already completed
      return false;
      
    default:
      return false;
  }
}

/**
 * Get next migration phase
 */
export function getNextPhase(current: MigrationPhase): MigrationPhase | null {
  const phases: MigrationPhase[] = [
    'not_started',
    'parallel_read_only',
    'write_through',
    'native_primary',
    'completed',
  ];
  
  const currentIndex = phases.indexOf(current);
  if (currentIndex === -1 || currentIndex === phases.length - 1) {
    return null;
  }
  
  return phases[currentIndex + 1];
}

/**
 * Advance to next migration phase
 */
export function advanceMigrationPhase(status: MigrationStatus): MigrationStatus {
  if (!canAdvancePhase(status)) {
    throw new Error(`Cannot advance from phase: ${status.phase}`);
  }
  
  const nextPhase = getNextPhase(status.phase);
  if (!nextPhase) {
    throw new Error('Already at final phase');
  }
  
  return {
    ...status,
    phase: nextPhase,
    startedAt: status.startedAt || new Date(),
    completedAt: nextPhase === 'completed' ? new Date() : undefined,
  };
}

// -----------------------------------------------------------------------------
// ID Generation
// -----------------------------------------------------------------------------

/**
 * Generate a CUID-like ID for new entities
 */
export function generateEntityId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const id = `${timestamp}${random}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a component ID
 */
export function generateComponentId(): string {
  return generateEntityId('cmp');
}

/**
 * Generate a document ID
 */
export function generateDocumentId(): string {
  return generateEntityId('doc');
}

/**
 * Generate a derivation ID
 */
export function generateDerivationId(): string {
  return generateEntityId('drv');
}

/**
 * Generate an assembly ID
 */
export function generateAssemblyId(): string {
  return generateEntityId('asm');
}

// -----------------------------------------------------------------------------
// Data Transformation
// -----------------------------------------------------------------------------

/**
 * Transform external source type to our format
 */
export function normalizeExternalSource(source: string | null | undefined): string | undefined {
  if (!source) return undefined;
  
  const normalized = source.toLowerCase().trim();
  
  switch (normalized) {
    case 'docuvera':
    case 'dv':
      return 'docuvera';
    case 'legacy':
    case 'old':
      return 'legacy';
    case 'import':
    case 'csv':
    case 'excel':
      return 'import';
    default:
      return 'import';
  }
}

/**
 * Transform content format string to enum value
 */
export function normalizeContentFormat(format: string | null | undefined): string {
  if (!format) return 'PLAIN';
  
  const normalized = format.toLowerCase().trim();
  
  switch (normalized) {
    case 'xml':
    case 'application/xml':
      return 'XML';
    case 'html':
    case 'text/html':
      return 'HTML';
    case 'markdown':
    case 'md':
    case 'text/markdown':
      return 'MARKDOWN';
    case 'json':
    case 'application/json':
      return 'JSON';
    case 'text':
    case 'plain':
    case 'text/plain':
    default:
      return 'PLAIN';
  }
}

/**
 * Transform component type string to enum value
 */
export function normalizeComponentType(type: string | null | undefined): string {
  if (!type) return 'OTHER';
  
  const normalized = type.toLowerCase().replace(/[_\-\s]/g, '_');
  
  const typeMap: Record<string, string> = {
    'indication': 'INDICATION',
    'indications': 'INDICATION',
    'dosage': 'DOSAGE',
    'dosing': 'DOSAGE',
    'contraindication': 'CONTRAINDICATION',
    'contraindications': 'CONTRAINDICATION',
    'warning': 'WARNING',
    'warnings': 'WARNING',
    'precaution': 'PRECAUTION',
    'precautions': 'PRECAUTION',
    'adverse_reaction': 'ADVERSE_REACTION',
    'adverse_reactions': 'ADVERSE_REACTION',
    'side_effects': 'ADVERSE_REACTION',
    'drug_interaction': 'DRUG_INTERACTION',
    'drug_interactions': 'DRUG_INTERACTION',
    'clinical_pharmacology': 'CLINICAL_PHARMACOLOGY',
    'pharmacology': 'CLINICAL_PHARMACOLOGY',
    'storage': 'STORAGE',
    'description': 'DESCRIPTION',
    'study_design': 'STUDY_DESIGN',
    'efficacy_results': 'EFFICACY_RESULTS',
    'efficacy': 'EFFICACY_RESULTS',
    'safety_results': 'SAFETY_RESULTS',
    'safety': 'SAFETY_RESULTS',
    'pk_results': 'PK_RESULTS',
    'pharmacokinetics': 'PK_RESULTS',
    'narrative': 'NARRATIVE',
    'table': 'TABLE',
    'figure': 'FIGURE',
    'reference': 'REFERENCE',
    'references': 'REFERENCE',
    'appendix': 'APPENDIX',
  };
  
  return typeMap[normalized] || 'OTHER';
}

/**
 * Transform document type string to enum value
 */
export function normalizeDocumentType(type: string | null | undefined): string {
  if (!type) return 'OTHER';
  
  const normalized = type.toLowerCase().replace(/[_\-\s]/g, '_');
  
  const typeMap: Record<string, string> = {
    'ccds': 'CCDS',
    'core_data_sheet': 'CCDS',
    'smpc': 'SMPC',
    'summary_of_product_characteristics': 'SMPC',
    'uspi': 'USPI',
    'us_prescribing_information': 'USPI',
    'prescribing_information': 'USPI',
    'pil': 'PIL',
    'patient_information_leaflet': 'PIL',
    'package_insert': 'PIL',
    'protocol': 'PROTOCOL',
    'csr': 'CSR',
    'clinical_study_report': 'CSR',
    'ib': 'IB',
    'investigators_brochure': 'IB',
    'icf': 'ICF',
    'informed_consent': 'ICF',
    'sop': 'SOP',
    'template': 'TEMPLATE',
  };
  
  return typeMap[normalized] || 'OTHER';
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validate component data before migration
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateComponentData(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!data.title || typeof data.title !== 'string') {
    errors.push('title is required and must be a string');
  }
  
  if (!data.section || typeof data.section !== 'string') {
    errors.push('section is required and must be a string');
  }
  
  if (!data.contentBody) {
    errors.push('contentBody is required');
  }
  
  if (!data.productId || typeof data.productId !== 'string') {
    errors.push('productId is required and must be a string');
  }
  
  // Warnings for optional but recommended fields
  if (!data.markets || !Array.isArray(data.markets) || data.markets.length === 0) {
    warnings.push('markets array is empty - will default to empty array');
  }
  
  if (!data.language) {
    warnings.push('language not specified - will default to "en"');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate document data before migration
 */
export function validateDocumentData(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!data.title || typeof data.title !== 'string') {
    errors.push('title is required and must be a string');
  }
  
  if (!data.documentType || typeof data.documentType !== 'string') {
    errors.push('documentType is required and must be a string');
  }
  
  if (!data.productId || typeof data.productId !== 'string') {
    errors.push('productId is required and must be a string');
  }
  
  // Warnings
  if (!data.markets || !Array.isArray(data.markets) || data.markets.length === 0) {
    warnings.push('markets array is empty - will default to empty array');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// Export Default Configuration
// -----------------------------------------------------------------------------

export const MIGRATION_CONFIG = {
  defaultOptions: DEFAULT_MIGRATION_OPTIONS,
  phases: ['not_started', 'parallel_read_only', 'write_through', 'native_primary', 'completed'] as const,
  batchSizes: {
    components: 100,
    documents: 50,
    derivations: 100,
    assemblies: 200,
  },
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
  },
};
