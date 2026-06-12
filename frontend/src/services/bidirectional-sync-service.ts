
// ============================================================================
// Bidirectional Sync Service - v204b
// CTMS ↔ USDM Two-Way Synchronization with Conflict Detection
// Enables operational edits in CTMS to flow back to source protocol
// ============================================================================

import type { USDMSpecEndpoint, USDMDataLineage, USDMLineageAppearance } from '@/domains/usdm/contracts';
type USDMEndpoint = USDMSpecEndpoint;
import type { StudyEndpoint } from '@/domains/ctms/contracts';

// ============================================================================
// TYPES
// ============================================================================

export type SyncDirection = 'usdm-to-ctms' | 'ctms-to-usdm' | 'bidirectional';
export type SourceOfTruth = 'usdm' | 'ctms' | 'manual';
export type ConflictResolutionStrategy = 'source-wins' | 'target-wins' | 'manual' | 'newest-wins';

export interface SyncConflict {
  id: string;
  usdmEndpointId: string;
  ctmsEndpointId: string;
  field: ConflictField;
  usdmValue: string;
  ctmsValue: string;
  usdmUpdatedAt: string;
  ctmsUpdatedAt: string;
  detectedAt: string;
  resolution: ConflictResolutionStrategy | null;
  resolvedValue?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type ConflictField = 
  | 'description'
  | 'level'
  | 'category'
  | 'assessmentMethod'
  | 'assessmentTimepoint';

export interface BidirectionalSyncConfig {
  sourceOfTruth: SourceOfTruth;
  defaultResolution: ConflictResolutionStrategy;
  autoResolveMinorChanges: boolean;
  trackLocalEdits: boolean;
}

export interface BidirectionalSyncResult {
  direction: SyncDirection;
  success: boolean;
  
  // Sync counts
  usdmToCTMS: {
    created: number;
    updated: number;
    unchanged: number;
  };
  ctmsToUSDM: {
    created: number;
    updated: number;
    unchanged: number;
  };
  
  // Conflicts
  conflicts: SyncConflict[];
  autoResolved: number;
  pendingResolution: number;
  
  // Metadata
  syncedAt: string;
  errors: SyncError[];
}

export interface SyncError {
  endpointId: string;
  source: 'usdm' | 'ctms';
  message: string;
  code: string;
}

export interface EndpointSyncPair {
  usdmEndpoint: USDMEndpoint | null;
  ctmsEndpoint: StudyEndpoint | null;
  linkType: 'linked' | 'usdm-only' | 'ctms-only';
  syncStatus: 'current' | 'usdm-ahead' | 'ctms-ahead' | 'conflict';
  conflicts: ConflictField[];
}

export interface CTMSLocalEdit {
  ctmsEndpointId: string;
  field: ConflictField;
  previousValue: string;
  newValue: string;
  editedAt: string;
  editedBy?: string;
}

// ============================================================================
// HASH GENERATION
// ============================================================================

/**
 * Generate content hash for USDM endpoint
 */
export function generateUSDMHash(endpoint: USDMEndpoint): string {
  const content = [
    endpoint.endpointDescription,
    endpoint.endpointLevel?.decode || '',
    endpoint.endpointPurposeDescription || '',
  ].join('|');
  
  return generateHash(content);
}

/**
 * Generate content hash for CTMS endpoint
 */
export function generateCTMSHash(endpoint: StudyEndpoint): string {
  const content = [
    endpoint.fullDefinition,
    endpoint.type,
    endpoint.category,
    endpoint.assessmentMethod,
    endpoint.assessmentTimepoint,
  ].join('|');
  
  return generateHash(content);
}

/**
 * Simple hash function for change detection
 */
function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Compare USDM and CTMS endpoints to detect field-level conflicts
 */
export function detectConflicts(
  usdmEndpoint: USDMEndpoint,
  ctmsEndpoint: StudyEndpoint
): ConflictField[] {
  const conflicts: ConflictField[] = [];
  
  // Compare description/definition
  if (normalizeText(usdmEndpoint.endpointDescription) !== normalizeText(ctmsEndpoint.fullDefinition)) {
    conflicts.push('description');
  }
  
  // Compare level/type
  const usdmLevel = (usdmEndpoint.endpointLevel?.decode || 'PRIMARY').toUpperCase();
  const ctmsType = ctmsEndpoint.type.toUpperCase();
  if (usdmLevel !== ctmsType) {
    conflicts.push('level');
  }
  
  // Category conflicts require more sophisticated comparison
  // (USDM infers category from biomedical concepts, CTMS has explicit category)
  
  return conflicts;
}

/**
 * Normalize text for comparison (trim, lowercase, collapse whitespace)
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Build detailed conflict record
 */
export function buildConflictRecord(
  usdmEndpoint: USDMEndpoint,
  ctmsEndpoint: StudyEndpoint,
  field: ConflictField
): SyncConflict {
  const now = new Date().toISOString();
  
  let usdmValue: string;
  let ctmsValue: string;
  
  switch (field) {
    case 'description':
      usdmValue = usdmEndpoint.endpointDescription;
      ctmsValue = ctmsEndpoint.fullDefinition;
      break;
    case 'level':
      usdmValue = usdmEndpoint.endpointLevel?.decode || 'PRIMARY';
      ctmsValue = ctmsEndpoint.type;
      break;
    case 'category':
      usdmValue = inferCategoryFromDescription(usdmEndpoint.endpointDescription);
      ctmsValue = ctmsEndpoint.category;
      break;
    case 'assessmentMethod':
      usdmValue = extractAssessmentMethod(usdmEndpoint.endpointDescription);
      ctmsValue = ctmsEndpoint.assessmentMethod;
      break;
    case 'assessmentTimepoint':
      usdmValue = 'Per protocol';
      ctmsValue = ctmsEndpoint.assessmentTimepoint;
      break;
    default:
      usdmValue = '';
      ctmsValue = '';
  }
  
  return {
    id: `conflict-${usdmEndpoint.id}-${ctmsEndpoint.id}-${field}`,
    usdmEndpointId: usdmEndpoint.id,
    ctmsEndpointId: ctmsEndpoint.id,
    field,
    usdmValue,
    ctmsValue,
    usdmUpdatedAt: usdmEndpoint.lineage?.lastUpdated || now,
    ctmsUpdatedAt: ctmsEndpoint.usdmSyncedAt || now,
    detectedAt: now,
    resolution: null,
  };
}

// ============================================================================
// SYNC PAIR ANALYSIS
// ============================================================================

/**
 * Build sync pairs from USDM and CTMS endpoints
 */
export function buildSyncPairs(
  usdmEndpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[]
): EndpointSyncPair[] {
  const pairs: EndpointSyncPair[] = [];
  
  // Index CTMS endpoints by USDM source ID
  const ctmsByUsdmId = new Map<string, StudyEndpoint>();
  const linkedCtmsIds = new Set<string>();
  
  ctmsEndpoints.forEach(ep => {
    if (ep.usdmSourceId) {
      ctmsByUsdmId.set(ep.usdmSourceId, ep);
      linkedCtmsIds.add(ep.id);
    }
  });
  
  // Process USDM endpoints
  usdmEndpoints.forEach(usdmEp => {
    const ctmsEp = ctmsByUsdmId.get(usdmEp.id);
    
    if (ctmsEp) {
      // Linked pair - check for conflicts
      const conflicts = detectConflicts(usdmEp, ctmsEp);
      const usdmHash = generateUSDMHash(usdmEp);
      const ctmsHash = generateCTMSHash(ctmsEp);
      
      let syncStatus: EndpointSyncPair['syncStatus'];
      if (conflicts.length > 0) {
        syncStatus = 'conflict';
      } else if (ctmsEp.usdmVersionHash === usdmHash) {
        syncStatus = 'current';
      } else {
        // Determine which is ahead
        const usdmUpdated = new Date(usdmEp.lineage?.lastUpdated || 0).getTime();
        const ctmsUpdated = new Date(ctmsEp.usdmSyncedAt || 0).getTime();
        syncStatus = usdmUpdated > ctmsUpdated ? 'usdm-ahead' : 'ctms-ahead';
      }
      
      pairs.push({
        usdmEndpoint: usdmEp,
        ctmsEndpoint: ctmsEp,
        linkType: 'linked',
        syncStatus,
        conflicts,
      });
    } else {
      // USDM-only (not yet synced to CTMS)
      pairs.push({
        usdmEndpoint: usdmEp,
        ctmsEndpoint: null,
        linkType: 'usdm-only',
        syncStatus: 'usdm-ahead',
        conflicts: [],
      });
    }
  });
  
  // Find CTMS-only endpoints (created directly in CTMS, not from USDM)
  ctmsEndpoints.forEach(ctmsEp => {
    if (!ctmsEp.usdmSourceId) {
      pairs.push({
        usdmEndpoint: null,
        ctmsEndpoint: ctmsEp,
        linkType: 'ctms-only',
        syncStatus: 'ctms-ahead',
        conflicts: [],
      });
    }
  });
  
  return pairs;
}

/**
 * Get sync summary from pairs
 */
export function getSyncPairSummary(pairs: EndpointSyncPair[]): {
  total: number;
  current: number;
  usdmAhead: number;
  ctmsAhead: number;
  conflicts: number;
  usdmOnly: number;
  ctmsOnly: number;
} {
  return {
    total: pairs.length,
    current: pairs.filter(p => p.syncStatus === 'current').length,
    usdmAhead: pairs.filter(p => p.syncStatus === 'usdm-ahead' && p.linkType === 'linked').length,
    ctmsAhead: pairs.filter(p => p.syncStatus === 'ctms-ahead' && p.linkType === 'linked').length,
    conflicts: pairs.filter(p => p.syncStatus === 'conflict').length,
    usdmOnly: pairs.filter(p => p.linkType === 'usdm-only').length,
    ctmsOnly: pairs.filter(p => p.linkType === 'ctms-only').length,
  };
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Apply resolution strategy to a conflict
 */
export function resolveConflict(
  conflict: SyncConflict,
  strategy: ConflictResolutionStrategy,
  manualValue?: string
): SyncConflict {
  const now = new Date().toISOString();
  
  let resolvedValue: string;
  
  switch (strategy) {
    case 'source-wins':
      resolvedValue = conflict.usdmValue; // USDM is source
      break;
    case 'target-wins':
      resolvedValue = conflict.ctmsValue; // CTMS is target
      break;
    case 'newest-wins':
      const usdmTime = new Date(conflict.usdmUpdatedAt).getTime();
      const ctmsTime = new Date(conflict.ctmsUpdatedAt).getTime();
      resolvedValue = usdmTime > ctmsTime ? conflict.usdmValue : conflict.ctmsValue;
      break;
    case 'manual':
      resolvedValue = manualValue || conflict.usdmValue;
      break;
    default:
      resolvedValue = conflict.usdmValue;
  }
  
  return {
    ...conflict,
    resolution: strategy,
    resolvedValue,
    resolvedAt: now,
  };
}

/**
 * Auto-resolve minor conflicts based on configuration
 */
export function autoResolveConflicts(
  conflicts: SyncConflict[],
  config: BidirectionalSyncConfig
): { resolved: SyncConflict[]; pending: SyncConflict[] } {
  const resolved: SyncConflict[] = [];
  const pending: SyncConflict[] = [];
  
  conflicts.forEach(conflict => {
    // Determine if this is a "minor" change
    const isMinor = isMinorChange(conflict);
    
    if (config.autoResolveMinorChanges && isMinor) {
      resolved.push(resolveConflict(conflict, config.defaultResolution));
    } else {
      pending.push(conflict);
    }
  });
  
  return { resolved, pending };
}

/**
 * Determine if a conflict represents a minor change
 */
function isMinorChange(conflict: SyncConflict): boolean {
  // Whitespace-only differences are minor
  if (normalizeText(conflict.usdmValue) === normalizeText(conflict.ctmsValue)) {
    return true;
  }
  
  // Case-only differences in type/category are minor
  if (conflict.field === 'level' || conflict.field === 'category') {
    if (conflict.usdmValue.toLowerCase() === conflict.ctmsValue.toLowerCase()) {
      return true;
    }
  }
  
  // Small text changes (< 5% difference) could be considered minor
  // This is a simplified check
  const lenDiff = Math.abs(conflict.usdmValue.length - conflict.ctmsValue.length);
  const maxLen = Math.max(conflict.usdmValue.length, conflict.ctmsValue.length);
  if (maxLen > 0 && (lenDiff / maxLen) < 0.05) {
    // Further check: is it just punctuation?
    const stripped1 = conflict.usdmValue.replace(/[.,;:'"()]/g, '');
    const stripped2 = conflict.ctmsValue.replace(/[.,;:'"()]/g, '');
    if (normalizeText(stripped1) === normalizeText(stripped2)) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// REVERSE SYNC (CTMS → USDM)
// ============================================================================

/**
 * Map CTMS endpoint back to USDM format
 */
export function mapCTMSEndpointToUSDM(
  ctmsEndpoint: StudyEndpoint
): Partial<USDMEndpoint> {
  // Map CTMS type to USDM level
  const levelMap: Record<string, string> = {
    'primary': 'PRIMARY',
    'secondary': 'SECONDARY',
    'exploratory': 'EXPLORATORY',
  };
  
  return {
    endpointDescription: ctmsEndpoint.fullDefinition,
    endpointLevel: {
      code: levelMap[ctmsEndpoint.type] || 'EXPLORATORY',
      codeSystem: 'CDISC',
      decode: levelMap[ctmsEndpoint.type] || 'EXPLORATORY',
    },
    endpointPurposeDescription: `${ctmsEndpoint.category} endpoint - ${ctmsEndpoint.assessmentMethod}`,
  };
}

/**
 * Prepare reverse sync batch (CTMS → USDM)
 */
export function prepareReverseSyncBatch(
  pairs: EndpointSyncPair[],
  config: BidirectionalSyncConfig
): {
  toUpdate: { usdmEndpointId: string; updates: Partial<USDMEndpoint> }[];
  toCreate: { ctmsEndpointId: string; usdmData: Partial<USDMEndpoint> }[];
  skipped: string[];
} {
  const result = {
    toUpdate: [] as { usdmEndpointId: string; updates: Partial<USDMEndpoint> }[],
    toCreate: [] as { ctmsEndpointId: string; usdmData: Partial<USDMEndpoint> }[],
    skipped: [] as string[],
  };
  
  // Only process if CTMS is source of truth or bidirectional
  if (config.sourceOfTruth === 'usdm') {
    return result; // Skip reverse sync if USDM is source of truth
  }
  
  pairs.forEach(pair => {
    if (pair.linkType === 'ctms-only' && pair.ctmsEndpoint) {
      // CTMS-only: create in USDM
      result.toCreate.push({
        ctmsEndpointId: pair.ctmsEndpoint.id,
        usdmData: mapCTMSEndpointToUSDM(pair.ctmsEndpoint),
      });
    } else if (pair.linkType === 'linked' && pair.syncStatus === 'ctms-ahead' && pair.ctmsEndpoint && pair.usdmEndpoint) {
      // CTMS ahead: update USDM
      result.toUpdate.push({
        usdmEndpointId: pair.usdmEndpoint.id,
        updates: mapCTMSEndpointToUSDM(pair.ctmsEndpoint),
      });
    } else if (pair.syncStatus === 'conflict') {
      // Has conflicts - skip for manual resolution
      result.skipped.push(pair.ctmsEndpoint?.id || pair.usdmEndpoint?.id || '');
    }
  });
  
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Infer category from endpoint description
 */
function inferCategoryFromDescription(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('survival') || lowerDesc.includes('response') || 
      lowerDesc.includes('progression') || lowerDesc.includes('efficacy')) {
    return 'efficacy';
  }
  if (lowerDesc.includes('safety') || lowerDesc.includes('adverse') || 
      lowerDesc.includes('tolerability')) {
    return 'safety';
  }
  if (lowerDesc.includes('pharmacokinetic') || lowerDesc.includes('pk') || 
      lowerDesc.includes('cmax') || lowerDesc.includes('auc')) {
    return 'pharmacokinetic';
  }
  if (lowerDesc.includes('biomarker') || lowerDesc.includes('ctdna')) {
    return 'biomarker';
  }
  if (lowerDesc.includes('quality of life') || lowerDesc.includes('qol') || 
      lowerDesc.includes('patient-reported')) {
    return 'patient-reported';
  }
  
  return 'efficacy';
}

/**
 * Extract assessment method from description
 */
function extractAssessmentMethod(description: string): string {
  const patterns = [
    /per\s+([A-Z]+\s*[\d.]*)/i,
    /using\s+([A-Z]+)/i,
    /according to\s+([A-Z]+)/i,
    /by\s+([A-Z]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return 'Per protocol';
}

// ============================================================================
// LOCAL EDIT TRACKING
// ============================================================================

/**
 * Track a local edit to a CTMS endpoint
 */
export function recordLocalEdit(
  ctmsEndpointId: string,
  field: ConflictField,
  previousValue: string,
  newValue: string
): CTMSLocalEdit {
  return {
    ctmsEndpointId,
    field,
    previousValue,
    newValue,
    editedAt: new Date().toISOString(),
  };
}

/**
 * Determine if CTMS endpoint has been locally edited since last sync
 */
export function hasLocalEdits(
  endpoint: StudyEndpoint,
  localEdits: CTMSLocalEdit[]
): boolean {
  const endpointEdits = localEdits.filter(e => e.ctmsEndpointId === endpoint.id);
  
  // Check if any edit occurred after last sync
  const lastSync = endpoint.usdmSyncedAt ? new Date(endpoint.usdmSyncedAt).getTime() : 0;
  return endpointEdits.some(edit => new Date(edit.editedAt).getTime() > lastSync);
}

/**
 * Get local edit history for an endpoint
 */
export function getLocalEditHistory(
  ctmsEndpointId: string,
  localEdits: CTMSLocalEdit[]
): CTMSLocalEdit[] {
  return localEdits
    .filter(e => e.ctmsEndpointId === ctmsEndpointId)
    .sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime());
}

// ============================================================================
// FULL BIDIRECTIONAL SYNC
// ============================================================================

/**
 * Execute full bidirectional sync with conflict detection
 */
export function executeBidirectionalSync(
  usdmEndpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[],
  config: BidirectionalSyncConfig,
  localEdits: CTMSLocalEdit[] = []
): BidirectionalSyncResult {
  const now = new Date().toISOString();
  
  // Build sync pairs
  const pairs = buildSyncPairs(usdmEndpoints, ctmsEndpoints);
  
  // Collect all conflicts
  const allConflicts: SyncConflict[] = [];
  pairs.forEach(pair => {
    if (pair.usdmEndpoint && pair.ctmsEndpoint) {
      pair.conflicts.forEach(field => {
        allConflicts.push(buildConflictRecord(pair.usdmEndpoint!, pair.ctmsEndpoint!, field));
      });
    }
  });
  
  // Auto-resolve where configured
  const { resolved, pending } = autoResolveConflicts(allConflicts, config);
  
  // Calculate sync counts
  const usdmOnlyCount = pairs.filter(p => p.linkType === 'usdm-only').length;
  const ctmsOnlyCount = pairs.filter(p => p.linkType === 'ctms-only').length;
  const usdmAheadCount = pairs.filter(p => p.syncStatus === 'usdm-ahead' && p.linkType === 'linked').length;
  const ctmsAheadCount = pairs.filter(p => p.syncStatus === 'ctms-ahead' && p.linkType === 'linked').length;
  const currentCount = pairs.filter(p => p.syncStatus === 'current').length;
  
  return {
    direction: config.sourceOfTruth === 'usdm' ? 'usdm-to-ctms' : 
               config.sourceOfTruth === 'ctms' ? 'ctms-to-usdm' : 'bidirectional',
    success: pending.length === 0,
    
    usdmToCTMS: {
      created: usdmOnlyCount,
      updated: usdmAheadCount,
      unchanged: currentCount,
    },
    ctmsToUSDM: {
      created: ctmsOnlyCount,
      updated: ctmsAheadCount,
      unchanged: currentCount,
    },
    
    conflicts: [...resolved, ...pending],
    autoResolved: resolved.length,
    pendingResolution: pending.length,
    
    syncedAt: now,
    errors: [],
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const defaultSyncConfig: BidirectionalSyncConfig = {
  sourceOfTruth: 'usdm',
  defaultResolution: 'source-wins',
  autoResolveMinorChanges: true,
  trackLocalEdits: true,
};
