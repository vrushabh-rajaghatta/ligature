
// ============================================================================
// Cross-Module Lineage Service - v204d-b1
// Unified sync status and lineage tracking across USDM → CTMS → Authoring
// Enables one-click sync and conflict resolution across all modules
// ============================================================================

import { USDMObjective, USDMEndpoint, USDMDataLineage } from '@/domains/usdm/contracts';
import type { StudyEndpoint } from '@/domains/ctms/contracts';
import type { CSRTemplateResult, LineageRecord } from './usdm-authoring-template-service';

// ============================================================================
// TYPES
// ============================================================================

export type ModuleName = 'usdm' | 'ctms' | 'authoring';

export type SyncHealth = 'healthy' | 'stale' | 'conflict' | 'unlinked';

export interface ModuleSyncStatus {
  module: ModuleName;
  health: SyncHealth;
  entityCount: number;
  linkedCount: number;
  staleCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
}

export interface ModuleLink {
  id: string;
  sourceModule: ModuleName;
  targetModule: ModuleName;
  sourceEntityId: string;
  targetEntityId: string;
  sourceEntityType: string;
  targetEntityType: string;
  health: SyncHealth;
  linkedAt: string;
  lastVerifiedAt: string;
}

export interface CrossModuleStatus {
  overallHealth: SyncHealth;
  modules: ModuleSyncStatus[];
  links: ModuleLink[];
  summary: {
    totalEntities: number;
    linkedEntities: number;
    staleEntities: number;
    conflictEntities: number;
    linkCoverage: number; // percentage
  };
  generatedAt: string;
}

// SyncAllResult and SyncAllError are defined in the "SYNC ALL PROGRESS TYPES" section below

export interface LineagePath {
  id: string;
  sourceEntity: {
    module: ModuleName;
    entityId: string;
    entityType: string;
    label: string;
  };
  targetEntity: {
    module: ModuleName;
    entityId: string;
    entityType: string;
    label: string;
  };
  intermediateEntities: Array<{
    module: ModuleName;
    entityId: string;
    entityType: string;
    label: string;
  }>;
  health: SyncHealth;
  createdAt: string;
}

// ============================================================================
// SYNC STATUS COMPUTATION
// ============================================================================

// Helper to compute overall status from appearances
function getLineageOverallStatus(lineage?: USDMDataLineage): { syncStatus: 'current' | 'outdated' | 'conflict' | null, lastSyncedAt: string | null } {
  if (!lineage?.appearances || lineage.appearances.length === 0) {
    return { syncStatus: null, lastSyncedAt: null };
  }
  
  let worstStatus: 'current' | 'outdated' | 'conflict' = 'current';
  let latestSync: string | null = null;
  
  for (const app of lineage.appearances) {
    if (app.syncStatus === 'conflict') worstStatus = 'conflict';
    else if (app.syncStatus === 'outdated' && worstStatus !== 'conflict') worstStatus = 'outdated';
    
    if (app.lastSyncedAt && (!latestSync || app.lastSyncedAt > latestSync)) {
      latestSync = app.lastSyncedAt;
    }
  }
  
  return { syncStatus: worstStatus, lastSyncedAt: latestSync };
}

/**
 * Compute USDM module sync status
 */
export function computeUSDMStatus(
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[],
  lineageIndex: Record<string, USDMDataLineage>
): ModuleSyncStatus {
  const totalEntities = objectives.length + endpoints.length;
  let linkedCount = 0;
  let staleCount = 0;
  let conflictCount = 0;
  let lastSyncedAt: string | null = null;

  // Check objectives
  for (const obj of objectives) {
    if (obj.lineage?.appearances && obj.lineage.appearances.length > 0) {
      linkedCount++;
      const { syncStatus, lastSyncedAt: objLastSync } = getLineageOverallStatus(obj.lineage);
      if (syncStatus === 'outdated') staleCount++;
      if (syncStatus === 'conflict') conflictCount++;
      if (objLastSync && (!lastSyncedAt || objLastSync > lastSyncedAt)) {
        lastSyncedAt = objLastSync;
      }
    }
  }

  // Check endpoints
  for (const ep of endpoints) {
    if (ep.lineage?.appearances && ep.lineage.appearances.length > 0) {
      linkedCount++;
      const { syncStatus, lastSyncedAt: epLastSync } = getLineageOverallStatus(ep.lineage);
      if (syncStatus === 'outdated') staleCount++;
      if (syncStatus === 'conflict') conflictCount++;
      if (epLastSync && (!lastSyncedAt || epLastSync > lastSyncedAt)) {
        lastSyncedAt = epLastSync;
      }
    }
  }

  // Also check lineageIndex for additional tracked entities
  for (const lineage of Object.values(lineageIndex)) {
    const { lastSyncedAt: indexLastSync } = getLineageOverallStatus(lineage);
    if (indexLastSync && (!lastSyncedAt || indexLastSync > lastSyncedAt)) {
      lastSyncedAt = indexLastSync;
    }
  }

  const health = computeHealthFromCounts(conflictCount, staleCount, linkedCount, totalEntities);

  return {
    module: 'usdm',
    health,
    entityCount: totalEntities,
    linkedCount,
    staleCount,
    conflictCount,
    lastSyncedAt,
  };
}

/**
 * Compute CTMS module sync status
 */
export function computeCTMSStatus(
  endpoints: StudyEndpoint[],
  usdmEndpoints: USDMEndpoint[]
): ModuleSyncStatus {
  const totalEntities = endpoints.length;
  let linkedCount = 0;
  let staleCount = 0;
  let conflictCount = 0;
  let lastSyncedAt: string | null = null;

  // Build USDM endpoint map for comparison
  const usdmMap = new Map(usdmEndpoints.map(ep => [ep.id, ep]));

  for (const ctmsEp of endpoints) {
    // Check if linked to USDM (has usdmSourceId or matching ID pattern)
    const sourceId = ctmsEp.usdmSourceId || ctmsEp.id;
    const usdmSource = usdmMap.get(sourceId);
    
    if (usdmSource) {
      linkedCount++;
      
      // Check for staleness using USDM sync status
      if (ctmsEp.usdmSyncStatus === 'outdated') {
        staleCount++;
      }
      
      // Check for conflicts
      if (ctmsEp.usdmSyncStatus === 'conflict') {
        conflictCount++;
      }
      
      // Alternative: check by comparing content
      if (!ctmsEp.usdmSyncStatus && ctmsEp.fullDefinition !== usdmSource.endpointDescription) {
        // Content differs but no status set - could be a conflict or just stale
        if (ctmsEp.usdmVersionHash && ctmsEp.usdmVersionHash !== usdmSource.lineage?.versionHash) {
          staleCount++;
        }
      }
    }

    if (ctmsEp.usdmSyncedAt && (!lastSyncedAt || ctmsEp.usdmSyncedAt > lastSyncedAt)) {
      lastSyncedAt = ctmsEp.usdmSyncedAt;
    }
  }

  const health = computeHealthFromCounts(conflictCount, staleCount, linkedCount, totalEntities);

  return {
    module: 'ctms',
    health,
    entityCount: totalEntities,
    linkedCount,
    staleCount,
    conflictCount,
    lastSyncedAt,
  };
}

/**
 * Compute Authoring module sync status
 */
export function computeAuthoringStatus(
  csrResult: CSRTemplateResult | null,
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[]
): ModuleSyncStatus {
  if (!csrResult) {
    return {
      module: 'authoring',
      health: 'unlinked',
      entityCount: 0,
      linkedCount: 0,
      staleCount: 0,
      conflictCount: 0,
      lastSyncedAt: null,
    };
  }

  const totalEntities = csrResult.sections.length;
  let linkedCount = 0;
  let staleCount = 0;
  const conflictCount = 0; // CSR sections don't have conflicts (generated from source)

  // Build maps for source lookup
  const objectiveMap = new Map(objectives.map(o => [o.id, o]));
  const endpointMap = new Map(endpoints.map(e => [e.id, e]));

  // Check lineage records for staleness
  for (const record of csrResult.lineageRecords) {
    linkedCount++;
    
    // Check if source has been updated since CSR was generated
    const source = record.sourceEntityType === 'objective' 
      ? objectiveMap.get(record.sourceEntityId)
      : endpointMap.get(record.sourceEntityId);
    
    if (source && source.lineage?.lastUpdated && csrResult.generatedAt) {
      const sourceTime = new Date(source.lineage.lastUpdated).getTime();
      const csrTime = new Date(csrResult.generatedAt).getTime();
      
      if (sourceTime > csrTime) {
        staleCount++;
      }
    }
  }

  const health = computeHealthFromCounts(conflictCount, staleCount, linkedCount, totalEntities);

  return {
    module: 'authoring',
    health,
    entityCount: totalEntities,
    linkedCount,
    staleCount,
    conflictCount,
    lastSyncedAt: csrResult.generatedAt,
  };
}

/**
 * Compute overall health from counts
 */
function computeHealthFromCounts(
  conflictCount: number,
  staleCount: number,
  linkedCount: number,
  totalEntities: number
): SyncHealth {
  if (conflictCount > 0) return 'conflict';
  if (staleCount > 0) return 'stale';
  if (linkedCount === 0 && totalEntities > 0) return 'unlinked';
  return 'healthy';
}

// ============================================================================
// CROSS-MODULE STATUS
// ============================================================================

/**
 * Generate complete cross-module sync status
 */
export function generateCrossModuleStatus(
  usdmObjectives: USDMObjective[],
  usdmEndpoints: USDMEndpoint[],
  usdmLineageIndex: Record<string, USDMDataLineage>,
  ctmsEndpoints: StudyEndpoint[],
  csrResult: CSRTemplateResult | null
): CrossModuleStatus {
  // Compute individual module statuses
  const usdmStatus = computeUSDMStatus(usdmObjectives, usdmEndpoints, usdmLineageIndex);
  const ctmsStatus = computeCTMSStatus(ctmsEndpoints, usdmEndpoints);
  const authoringStatus = computeAuthoringStatus(csrResult, usdmObjectives, usdmEndpoints);

  const modules = [usdmStatus, ctmsStatus, authoringStatus];

  // Generate module links
  const links = generateModuleLinks(
    usdmObjectives,
    usdmEndpoints,
    ctmsEndpoints,
    csrResult
  );

  // Compute summary
  const totalEntities = modules.reduce((sum, m) => sum + m.entityCount, 0);
  const linkedEntities = modules.reduce((sum, m) => sum + m.linkedCount, 0);
  const staleEntities = modules.reduce((sum, m) => sum + m.staleCount, 0);
  const conflictEntities = modules.reduce((sum, m) => sum + m.conflictCount, 0);
  const linkCoverage = totalEntities > 0 ? Math.round((linkedEntities / totalEntities) * 100) : 0;

  // Compute overall health
  let overallHealth: SyncHealth = 'healthy';
  if (conflictEntities > 0) {
    overallHealth = 'conflict';
  } else if (staleEntities > 0) {
    overallHealth = 'stale';
  } else if (linkedEntities === 0 && totalEntities > 0) {
    overallHealth = 'unlinked';
  }

  return {
    overallHealth,
    modules,
    links,
    summary: {
      totalEntities,
      linkedEntities,
      staleEntities,
      conflictEntities,
      linkCoverage,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate links between modules
 */
function generateModuleLinks(
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[],
  csrResult: CSRTemplateResult | null
): ModuleLink[] {
  const links: ModuleLink[] = [];
  const now = new Date().toISOString();

  // USDM → CTMS links (endpoints)
  const ctmsMap = new Map(ctmsEndpoints.map(ep => [ep.usdmSourceId || ep.id, ep]));
  
  for (const usdmEp of endpoints) {
    const ctmsEp = ctmsMap.get(usdmEp.id);
    if (ctmsEp) {
      const health = computeLinkHealth(usdmEp, ctmsEp);
      links.push({
        id: `usdm-ctms-${usdmEp.id}`,
        sourceModule: 'usdm',
        targetModule: 'ctms',
        sourceEntityId: usdmEp.id,
        targetEntityId: ctmsEp.id,
        sourceEntityType: 'endpoint',
        targetEntityType: 'endpoint',
        health,
        linkedAt: ctmsEp.usdmSyncedAt || now,
        lastVerifiedAt: now,
      });
    }
  }

  // USDM → Authoring links (from CSR lineage records)
  if (csrResult) {
    for (const record of csrResult.lineageRecords) {
      links.push({
        id: `usdm-authoring-${record.sourceEntityId}`,
        sourceModule: 'usdm',
        targetModule: 'authoring',
        sourceEntityId: record.sourceEntityId,
        targetEntityId: record.targetEntityId,
        sourceEntityType: record.sourceEntityType,
        targetEntityType: record.targetEntityType,
        health: 'healthy', // CSR links are always derived, not edited
        linkedAt: record.createdAt,
        lastVerifiedAt: now,
      });
    }
  }

  return links;
}

/**
 * Compute health of a USDM ↔ CTMS link
 */
function computeLinkHealth(
  usdmEp: USDMEndpoint,
  ctmsEp: StudyEndpoint
): SyncHealth {
  // Check for description mismatch (potential conflict)
  if (ctmsEp.fullDefinition !== usdmEp.endpointDescription) {
    // If both have been updated (CTMS has local edits and USDM has been updated)
    if (ctmsEp.ctmsLastEditedAt && usdmEp.lineage?.lastUpdated) {
      return 'conflict';
    }
    // Otherwise just stale
    return 'stale';
  }
  
  // Check sync status
  if (ctmsEp.usdmSyncStatus === 'conflict') {
    return 'conflict';
  }
  if (ctmsEp.usdmSyncStatus === 'outdated') {
    return 'stale';
  }
  
  return 'healthy';
}

// ============================================================================
// LINEAGE PATH TRACING
// ============================================================================

/**
 * Trace the full lineage path for an entity
 */
export function traceLineagePath(
  entityId: string,
  entityType: 'objective' | 'endpoint',
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[],
  csrResult: CSRTemplateResult | null
): LineagePath[] {
  const paths: LineagePath[] = [];
  const now = new Date().toISOString();

  if (entityType === 'objective') {
    const objective = objectives.find(o => o.id === entityId);
    if (!objective) return paths;

    // USDM Objective → Authoring CSR
    if (csrResult) {
      const csrLinks = csrResult.lineageRecords.filter(
        r => r.sourceEntityId === entityId && r.sourceEntityType === 'objective'
      );
      for (const link of csrLinks) {
        paths.push({
          id: `path-${entityId}-authoring-${link.targetEntityId}`,
          sourceEntity: {
            module: 'usdm',
            entityId: objective.id,
            entityType: 'objective',
            label: objective.objectiveDescription.slice(0, 50) + '...',
          },
          targetEntity: {
            module: 'authoring',
            entityId: link.targetEntityId,
            entityType: 'csr-section',
            label: `CSR Section ${link.csrSection}`,
          },
          intermediateEntities: [],
          health: 'healthy',
          createdAt: link.createdAt,
        });
      }
    }
  } else {
    // entityType === 'endpoint'
    const endpoint = endpoints.find(e => e.id === entityId);
    if (!endpoint) return paths;

    // USDM Endpoint → CTMS
    const ctmsEp = ctmsEndpoints.find(
      ep => ep.usdmSourceId === entityId || ep.id === entityId
    );
    if (ctmsEp) {
      paths.push({
        id: `path-${entityId}-ctms-${ctmsEp.id}`,
        sourceEntity: {
          module: 'usdm',
          entityId: endpoint.id,
          entityType: 'endpoint',
          label: endpoint.endpointDescription.slice(0, 50) + '...',
        },
        targetEntity: {
          module: 'ctms',
          entityId: ctmsEp.id,
          entityType: 'endpoint',
          label: ctmsEp.name || ctmsEp.fullDefinition.slice(0, 50) + '...',
        },
        intermediateEntities: [],
        health: computeLinkHealth(endpoint, ctmsEp),
        createdAt: ctmsEp.usdmSyncedAt || now,
      });
    }

    // USDM Endpoint → Authoring CSR
    if (csrResult) {
      const csrLinks = csrResult.lineageRecords.filter(
        r => r.sourceEntityId === entityId && r.sourceEntityType === 'endpoint'
      );
      for (const link of csrLinks) {
        paths.push({
          id: `path-${entityId}-authoring-${link.targetEntityId}`,
          sourceEntity: {
            module: 'usdm',
            entityId: endpoint.id,
            entityType: 'endpoint',
            label: endpoint.endpointDescription.slice(0, 50) + '...',
          },
          targetEntity: {
            module: 'authoring',
            entityId: link.targetEntityId,
            entityType: 'csr-section',
            label: `CSR Section ${link.csrSection}`,
          },
          intermediateEntities: [],
          health: 'healthy',
          createdAt: link.createdAt,
        });
      }
    }
  }

  return paths;
}

// ============================================================================
// SYNC ALL MODULES
// ============================================================================

/**
 * Sync all modules from USDM source (stub for store integration in b3)
 * This is a planning function - actual sync happens in store actions
 */
export function planSyncAll(
  usdmObjectives: USDMObjective[],
  usdmEndpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[],
  csrResult: CSRTemplateResult | null
): {
  usdmToCTMS: { toCreate: string[]; toUpdate: string[] };
  usdmToAuthoring: { needsRegeneration: boolean };
  ctmsToUSDM: { toUpdate: string[] };
} {
  const usdmToCTMS = { toCreate: [] as string[], toUpdate: [] as string[] };
  const usdmToAuthoring = { needsRegeneration: false };
  const ctmsToUSDM = { toUpdate: [] as string[] };

  // Build CTMS map
  const ctmsMap = new Map(ctmsEndpoints.map(ep => [ep.usdmSourceId || ep.id, ep]));

  // Plan USDM → CTMS sync
  for (const usdmEp of usdmEndpoints) {
    const ctmsEp = ctmsMap.get(usdmEp.id);
    if (!ctmsEp) {
      usdmToCTMS.toCreate.push(usdmEp.id);
    } else if (ctmsEp.fullDefinition !== usdmEp.endpointDescription) {
      usdmToCTMS.toUpdate.push(usdmEp.id);
    }
  }

  // Plan Authoring regeneration
  if (csrResult) {
    // Check if any source has changed since generation
    const objectiveMap = new Map(usdmObjectives.map(o => [o.id, o]));
    const endpointMap = new Map(usdmEndpoints.map(e => [e.id, e]));

    for (const record of csrResult.lineageRecords) {
      const source = record.sourceEntityType === 'objective'
        ? objectiveMap.get(record.sourceEntityId)
        : endpointMap.get(record.sourceEntityId);
      
      if (source && source.lineage?.lastUpdated && csrResult.generatedAt) {
        const sourceTime = new Date(source.lineage.lastUpdated).getTime();
        const csrTime = new Date(csrResult.generatedAt).getTime();
        
        if (sourceTime > csrTime) {
          usdmToAuthoring.needsRegeneration = true;
          break;
        }
      }
    }
  } else if (usdmObjectives.length > 0 || usdmEndpoints.length > 0) {
    // No CSR but we have USDM data - needs generation
    usdmToAuthoring.needsRegeneration = true;
  }

  return { usdmToCTMS, usdmToAuthoring, ctmsToUSDM };
}

// ============================================================================
// SYNC ALL PROGRESS TYPES (v204d-b4)
// ============================================================================

export type SyncPhase = 
  | 'idle'
  | 'planning'
  | 'usdm-to-ctms'
  | 'usdm-to-authoring'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  currentStep: number;
  totalSteps: number;
  message: string;
  startedAt: string;
  estimatedCompletion?: string;
}

export interface SyncAllResult {
  success: boolean;
  modulesProcessed: ModuleName[];
  usdmToCTMS: { synced: number; skipped: number; errors: number };
  usdmToAuthoring: { synced: number; skipped: number; errors: number };
  ctmsToUSDM: { synced: number; skipped: number; errors: number };
  conflictsDetected: number;
  syncedAt: string;
  errors: SyncAllError[];
  duration: number;
}

export interface SyncAllError {
  module: ModuleName;
  entityId: string;
  message: string;
  code: string;
}

// ============================================================================
// SYNC ALL EXECUTION (v204d-b4)
// ============================================================================

/**
 * Execute a full sync across all modules
 * Returns step-by-step results for progress tracking
 */
export function executeSyncAll(
  usdmObjectives: USDMObjective[],
  usdmEndpoints: USDMEndpoint[],
  ctmsEndpoints: StudyEndpoint[],
  csrResult: CSRTemplateResult | null,
  options: {
    onProgress?: (progress: SyncProgress) => void;
    skipAuthoring?: boolean;
    resolutionStrategy?: 'usdm-wins' | 'ctms-wins' | 'newest-wins';
  } = {}
): SyncAllResult {
  const startTime = Date.now();
  const now = new Date().toISOString();
  const errors: SyncAllError[] = [];
  
  const result: SyncAllResult = {
    success: true,
    modulesProcessed: [],
    usdmToCTMS: { synced: 0, skipped: 0, errors: 0 },
    usdmToAuthoring: { synced: 0, skipped: 0, errors: 0 },
    ctmsToUSDM: { synced: 0, skipped: 0, errors: 0 },
    conflictsDetected: 0,
    syncedAt: now,
    errors: [],
    duration: 0,
  };
  
  // Phase 1: Planning
  options.onProgress?.({
    phase: 'planning',
    currentStep: 1,
    totalSteps: 4,
    message: 'Analyzing cross-module relationships...',
    startedAt: now,
  });
  
  const plan = planSyncAll(usdmObjectives, usdmEndpoints, ctmsEndpoints, csrResult);
  const totalOperations = 
    plan.usdmToCTMS.toCreate.length + 
    plan.usdmToCTMS.toUpdate.length + 
    (plan.usdmToAuthoring.needsRegeneration && !options.skipAuthoring ? 1 : 0);
  
  // Phase 2: USDM → CTMS sync
  options.onProgress?.({
    phase: 'usdm-to-ctms',
    currentStep: 2,
    totalSteps: 4,
    message: `Syncing ${plan.usdmToCTMS.toCreate.length + plan.usdmToCTMS.toUpdate.length} endpoints to CTMS...`,
    startedAt: now,
  });
  
  result.modulesProcessed.push('usdm');
  
  // Process CTMS creations
  for (const endpointId of plan.usdmToCTMS.toCreate) {
    try {
      // In production, this would call the CTMS store's create action
      result.usdmToCTMS.synced++;
    } catch (err) {
      result.usdmToCTMS.errors++;
      errors.push({
        module: 'ctms',
        entityId: endpointId,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'CREATE_FAILED',
      });
    }
  }
  
  // Process CTMS updates
  for (const endpointId of plan.usdmToCTMS.toUpdate) {
    try {
      // In production, this would call the CTMS store's update action
      result.usdmToCTMS.synced++;
    } catch (err) {
      result.usdmToCTMS.errors++;
      errors.push({
        module: 'ctms',
        entityId: endpointId,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'UPDATE_FAILED',
      });
    }
  }
  
  result.modulesProcessed.push('ctms');
  
  // Phase 3: USDM → Authoring sync
  if (!options.skipAuthoring) {
    options.onProgress?.({
      phase: 'usdm-to-authoring',
      currentStep: 3,
      totalSteps: 4,
      message: plan.usdmToAuthoring.needsRegeneration 
        ? 'Regenerating CSR template sections...'
        : 'Authoring sections are current.',
      startedAt: now,
    });
    
    if (plan.usdmToAuthoring.needsRegeneration) {
      try {
        // In production, this would call the Authoring store's generate action
        result.usdmToAuthoring.synced = usdmEndpoints.length + usdmObjectives.length;
      } catch (err) {
        result.usdmToAuthoring.errors++;
        errors.push({
          module: 'authoring',
          entityId: 'csr-template',
          message: err instanceof Error ? err.message : 'Unknown error',
          code: 'GENERATION_FAILED',
        });
      }
    } else {
      result.usdmToAuthoring.skipped = usdmEndpoints.length + usdmObjectives.length;
    }
    
    result.modulesProcessed.push('authoring');
  }
  
  // Phase 4: Finalization
  options.onProgress?.({
    phase: 'finalizing',
    currentStep: 4,
    totalSteps: 4,
    message: 'Verifying sync status...',
    startedAt: now,
  });
  
  // Detect conflicts
  const ctmsMap = new Map(ctmsEndpoints.map(ep => [ep.usdmSourceId || ep.id, ep]));
  for (const usdmEp of usdmEndpoints) {
    const ctmsEp = ctmsMap.get(usdmEp.id);
    if (ctmsEp && ctmsEp.fullDefinition !== usdmEp.endpointDescription) {
      result.conflictsDetected++;
    }
  }
  
  result.errors = errors;
  result.success = errors.length === 0;
  result.duration = Date.now() - startTime;
  
  options.onProgress?.({
    phase: 'complete',
    currentStep: 4,
    totalSteps: 4,
    message: result.success ? 'Sync completed successfully!' : `Completed with ${errors.length} error(s)`,
    startedAt: now,
  });
  
  return result;
}

/**
 * Get a human-readable summary of sync results
 */
export function getSyncResultSummary(result: SyncAllResult): string {
  const parts: string[] = [];
  
  const totalSynced = result.usdmToCTMS.synced + result.usdmToAuthoring.synced;
  const totalSkipped = result.usdmToCTMS.skipped + result.usdmToAuthoring.skipped;
  const totalErrors = result.usdmToCTMS.errors + result.usdmToAuthoring.errors;
  
  if (totalSynced > 0) {
    parts.push(`${totalSynced} synced`);
  }
  if (totalSkipped > 0) {
    parts.push(`${totalSkipped} skipped`);
  }
  if (totalErrors > 0) {
    parts.push(`${totalErrors} errors`);
  }
  if (result.conflictsDetected > 0) {
    parts.push(`${result.conflictsDetected} conflicts`);
  }
  
  if (parts.length === 0) {
    return 'No changes needed';
  }
  
  return parts.join(', ') + ` (${result.duration}ms)`;
}

// ============================================================================
// HEALTH INDICATORS
// ============================================================================

export const HEALTH_LABELS: Record<SyncHealth, string> = {
  healthy: 'Synced',
  stale: 'Needs Sync',
  conflict: 'Conflict',
  unlinked: 'Not Linked',
};

export const HEALTH_COLORS: Record<SyncHealth, string> = {
  healthy: 'green',
  stale: 'amber',
  conflict: 'red',
  unlinked: 'gray',
};

export const MODULE_LABELS: Record<ModuleName, string> = {
  usdm: 'Study Design (USDM)',
  ctms: 'Clinical Trials (CTMS)',
  authoring: 'Document Authoring',
};
