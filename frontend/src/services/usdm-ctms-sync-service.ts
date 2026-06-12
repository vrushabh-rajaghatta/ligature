
// ============================================================================
// USDM-CTMS Sync Service - v204a
// Synchronizes USDM Endpoints to CTMS StudyEndpoints
// Provides Protocol-to-CTMS Data Lineage
// ============================================================================

import { USDMSpecEndpoint, USDMDataLineage, USDMLineageAppearance } from '@/domains/usdm/contracts';
type USDMEndpoint = USDMSpecEndpoint;
import { StudyEndpoint, EndpointType, EndpointCategory } from '@/domains/ctms/contracts';

// ============================================================================
// TYPES
// ============================================================================

export interface USDMtoCTMSSyncResult {
  success: boolean;
  syncedEndpoints: SyncedEndpointInfo[];
  errors: SyncError[];
  syncedAt: string;
}

export interface SyncedEndpointInfo {
  usdmEndpointId: string;
  ctmsEndpointId: string;
  action: 'created' | 'updated' | 'unchanged';
  name: string;
}

export interface SyncError {
  usdmEndpointId: string;
  message: string;
  code: 'MAPPING_ERROR' | 'VALIDATION_ERROR' | 'STORE_ERROR';
}

export interface EndpointMapping {
  usdmEndpoint: USDMEndpoint;
  ctmsEndpoint: Partial<StudyEndpoint>;
}

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Map USDM endpoint level to CTMS endpoint type
 */
function mapEndpointLevel(usdmLevel: string): EndpointType {
  const levelMap: Record<string, EndpointType> = {
    'PRIMARY': 'primary',
    'SECONDARY': 'secondary',
    'EXPLORATORY': 'exploratory',
  };
  return levelMap[usdmLevel.toUpperCase()] || 'exploratory';
}

/**
 * Infer endpoint category from description
 * In a real system, this would come from USDM biomedical concept linkage
 */
function inferEndpointCategory(description: string): EndpointCategory {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('survival') || lowerDesc.includes('response') || 
      lowerDesc.includes('progression') || lowerDesc.includes('efficacy')) {
    return 'efficacy';
  }
  if (lowerDesc.includes('safety') || lowerDesc.includes('adverse') || 
      lowerDesc.includes('tolerability') || lowerDesc.includes('toxicity')) {
    return 'safety';
  }
  if (lowerDesc.includes('pharmacokinetic') || lowerDesc.includes('pk') || 
      lowerDesc.includes('cmax') || lowerDesc.includes('auc')) {
    return 'pharmacokinetic';
  }
  if (lowerDesc.includes('biomarker') || lowerDesc.includes('ctdna') || 
      lowerDesc.includes('serum')) {
    return 'biomarker';
  }
  if (lowerDesc.includes('quality of life') || lowerDesc.includes('qol') || 
      lowerDesc.includes('patient-reported') || lowerDesc.includes('pro')) {
    return 'patient-reported';
  }
  
  return 'efficacy'; // Default
}

/**
 * Extract a short name from full endpoint description
 */
function extractEndpointName(description: string): string {
  // Try to extract acronym in parentheses first (e.g., "Progression-free survival (PFS)")
  const acronymMatch = description.match(/\(([A-Z]{2,6})\)/);
  if (acronymMatch) {
    return acronymMatch[1];
  }
  
  // Otherwise take first meaningful phrase
  const firstPhrase = description.split(/[,;:]|defined as|as measured/i)[0].trim();
  
  // Truncate if too long
  if (firstPhrase.length > 50) {
    return firstPhrase.substring(0, 47) + '...';
  }
  
  return firstPhrase;
}

/**
 * Extract assessment method from description if present
 */
function extractAssessmentMethod(description: string): string {
  // Look for common assessment method patterns
  const patterns = [
    /per\s+([A-Z]+\s*[\d.]*)/i,  // "per RECIST 1.1"
    /using\s+([A-Z]+)/i,         // "using CTCAE"
    /according to\s+([A-Z]+)/i,  // "according to RECIST"
    /by\s+([A-Z]+)/i,            // "by BICR"
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return 'Per protocol';
}

/**
 * Generate a version hash for change detection
 */
function generateVersionHash(endpoint: USDMEndpoint): string {
  // Simple hash based on content that matters for sync
  const content = `${endpoint.endpointDescription}|${endpoint.endpointLevel?.decode || ''}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

/**
 * Map a single USDM endpoint to CTMS endpoint format
 */
export function mapUSDMEndpointToCTMS(
  usdmEndpoint: USDMEndpoint,
  ctmsStudyId: string
): Partial<StudyEndpoint> {
  const level = usdmEndpoint.endpointLevel?.decode || 'PRIMARY';
  const description = usdmEndpoint.endpointDescription;
  
  return {
    studyId: ctmsStudyId,
    type: mapEndpointLevel(level),
    category: inferEndpointCategory(description),
    name: extractEndpointName(description),
    fullDefinition: description,
    assessmentMethod: extractAssessmentMethod(description),
    assessmentTimepoint: 'Per protocol', // Would come from USDM SoA in full implementation
    status: 'pending',
    
    // USDM source tracking
    usdmSourceId: usdmEndpoint.id,
    usdmVersionHash: generateVersionHash(usdmEndpoint),
    usdmSyncedAt: new Date().toISOString(),
    usdmSyncStatus: 'current',
  };
}

/**
 * Check if CTMS endpoint needs update based on USDM source
 */
export function needsSync(
  ctmsEndpoint: StudyEndpoint,
  usdmEndpoint: USDMEndpoint
): boolean {
  if (!ctmsEndpoint.usdmSourceId) {
    return false; // Not linked to USDM
  }
  
  const currentHash = generateVersionHash(usdmEndpoint);
  return ctmsEndpoint.usdmVersionHash !== currentHash;
}

/**
 * Generate lineage appearance record for CTMS
 */
export function createCTMSLineageAppearance(
  ctmsEndpointId: string,
  ctmsStudyId: string
): USDMLineageAppearance {
  return {
    module: 'ctms',
    entityType: 'study-endpoint',
    entityId: ctmsEndpointId,
    sectionReference: 'Study Endpoints',
    lastSyncedAt: new Date().toISOString(),
    syncStatus: 'current',
  };
}

/**
 * Batch sync multiple USDM endpoints to CTMS
 * Returns mapping information for store updates
 */
export function prepareBatchSync(
  usdmEndpoints: USDMEndpoint[],
  existingCTMSEndpoints: StudyEndpoint[],
  ctmsStudyId: string
): {
  toCreate: EndpointMapping[];
  toUpdate: { ctmsEndpointId: string; updates: Partial<StudyEndpoint> }[];
  unchanged: string[];
} {
  const result = {
    toCreate: [] as EndpointMapping[],
    toUpdate: [] as { ctmsEndpointId: string; updates: Partial<StudyEndpoint> }[],
    unchanged: [] as string[],
  };
  
  // Build lookup of existing CTMS endpoints by USDM source ID
  const ctmsByUsdmId = new Map<string, StudyEndpoint>();
  existingCTMSEndpoints.forEach(ep => {
    if (ep.usdmSourceId) {
      ctmsByUsdmId.set(ep.usdmSourceId, ep);
    }
  });
  
  usdmEndpoints.forEach(usdmEp => {
    const existingCTMS = ctmsByUsdmId.get(usdmEp.id);
    
    if (!existingCTMS) {
      // New endpoint - needs creation
      result.toCreate.push({
        usdmEndpoint: usdmEp,
        ctmsEndpoint: mapUSDMEndpointToCTMS(usdmEp, ctmsStudyId),
      });
    } else if (needsSync(existingCTMS, usdmEp)) {
      // Existing endpoint - needs update
      const updates = mapUSDMEndpointToCTMS(usdmEp, ctmsStudyId);
      result.toUpdate.push({
        ctmsEndpointId: existingCTMS.id,
        updates,
      });
    } else {
      // No change needed
      result.unchanged.push(usdmEp.id);
    }
  });
  
  return result;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate USDM endpoint has minimum required data for sync
 */
export function validateForSync(endpoint: USDMEndpoint): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!endpoint.id) {
    errors.push('Missing endpoint ID');
  }
  if (!endpoint.endpointDescription || endpoint.endpointDescription.trim().length < 10) {
    errors.push('Endpoint description is too short or missing');
  }
  if (!endpoint.endpointLevel) {
    errors.push('Missing endpoint level (Primary/Secondary/Exploratory)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SYNC STATUS HELPERS
// ============================================================================

/**
 * Determine sync status based on version comparison
 */
export function determineSyncStatus(
  ctmsVersionHash: string | undefined,
  usdmVersionHash: string
): 'current' | 'outdated' | 'conflict' {
  if (!ctmsVersionHash) {
    return 'outdated'; // Never synced
  }
  if (ctmsVersionHash === usdmVersionHash) {
    return 'current';
  }
  // For now, any difference means outdated
  // A full implementation would check for local CTMS edits to detect conflicts
  return 'outdated';
}

/**
 * Get sync statistics for a set of CTMS endpoints
 */
export function getSyncStats(endpoints: StudyEndpoint[]): {
  total: number;
  linked: number;
  current: number;
  outdated: number;
  unlinked: number;
} {
  const stats = {
    total: endpoints.length,
    linked: 0,
    current: 0,
    outdated: 0,
    unlinked: 0,
  };
  
  endpoints.forEach(ep => {
    if (ep.usdmSourceId) {
      stats.linked++;
      if (ep.usdmSyncStatus === 'current') {
        stats.current++;
      } else {
        stats.outdated++;
      }
    } else {
      stats.unlinked++;
    }
  });
  
  return stats;
}
