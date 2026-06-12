
// ============================================================================
// IDMP - Master Data Live Sync Service - v200
// Bidirectional synchronization between IDMP entities and Ligature Master Data
// ============================================================================

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

export interface SyncConfiguration {
  direction: 'idmp-to-master' | 'master-to-idmp' | 'bidirectional';
  syncProducts: boolean;
  syncSubstances: boolean;
  syncOrganizations: boolean;
  conflictResolution: 'idmp-wins' | 'master-wins' | 'newer-wins' | 'manual';
  validateBeforeSync: boolean;
  requireApprovalForChanges: boolean;
  autoSync: boolean;
  syncInterval: number;
  lastSyncAt?: string;
}

export const DEFAULT_SYNC_CONFIG: SyncConfiguration = {
  direction: 'bidirectional',
  syncProducts: true,
  syncSubstances: true,
  syncOrganizations: true,
  conflictResolution: 'newer-wins',
  validateBeforeSync: true,
  requireApprovalForChanges: false,
  autoSync: true,
  syncInterval: 15,
};

// ============================================================================
// SYNC RESULT TYPES
// ============================================================================

export interface SyncResult {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  totalEntities: number;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  products: EntitySyncResult;
  substances: EntitySyncResult;
  organizations: EntitySyncResult;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

export interface EntitySyncResult {
  total: number;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  details: SyncEntityDetail[];
}

export interface SyncEntityDetail {
  idmpId: string;
  masterDataId: string;
  entityName: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  direction: 'idmp-to-master' | 'master-to-idmp';
  changesApplied?: string[];
  reason?: string;
}

export interface SyncConflict {
  id: string;
  entityType: 'product' | 'substance' | 'organization';
  idmpId: string;
  masterDataId: string;
  entityName: string;
  field: string;
  idmpValue: string;
  masterDataValue: string;
  resolution: 'pending' | 'idmp-wins' | 'master-wins' | 'merged' | 'skipped';
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface SyncError {
  entityType: 'product' | 'substance' | 'organization';
  entityId: string;
  entityName: string;
  error: string;
  details?: string;
}

// ============================================================================
// SYNC SERVICE CLASS
// ============================================================================

const generateId = () => `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

export class IDMPMasterDataSyncService {
  private config: SyncConfiguration;
  private syncHistory: SyncResult[] = [];
  private pendingConflicts: SyncConflict[] = [];
  
  constructor(config: Partial<SyncConfiguration> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }
  
  // ============================================================================
  // MAIN SYNC METHODS
  // ============================================================================
  
  async performFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const syncId = generateId();
    
    const result: SyncResult = {
      id: syncId,
      startedAt: now(),
      completedAt: '',
      duration: 0,
      status: 'success',
      totalEntities: 0,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      products: this.createEmptyEntityResult(),
      substances: this.createEmptyEntityResult(),
      organizations: this.createEmptyEntityResult(),
      conflicts: [],
      errors: [],
    };
    
    try {
      // Sync Products
      if (this.config.syncProducts) {
        result.products = await this.syncProducts();
      }
      
      // Sync Substances
      if (this.config.syncSubstances) {
        result.substances = await this.syncSubstances();
      }
      
      // Sync Organizations
      if (this.config.syncOrganizations) {
        result.organizations = await this.syncOrganizations();
      }
      
      // Aggregate results
      result.totalEntities = result.products.total + result.substances.total + result.organizations.total;
      result.synced = result.products.synced + result.substances.synced + result.organizations.synced;
      result.created = result.products.created + result.substances.created + result.organizations.created;
      result.updated = result.products.updated + result.substances.updated + result.organizations.updated;
      result.skipped = result.products.skipped + result.substances.skipped + result.organizations.skipped;
      result.failed = result.products.failed + result.substances.failed + result.organizations.failed;
      
      // Determine overall status
      if (result.failed > 0) {
        result.status = result.synced > 0 ? 'partial' : 'failed';
      }
      
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        entityType: 'product',
        entityId: 'system',
        entityName: 'System',
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
    
    result.completedAt = now();
    result.duration = Date.now() - startTime;
    
    this.syncHistory.push(result);
    this.config.lastSyncAt = result.completedAt;
    
    return result;
  }
  
  // ============================================================================
  // ENTITY-SPECIFIC SYNC METHODS
  // ============================================================================
  
  private async syncProducts(): Promise<EntitySyncResult> {
    // Simulate sync delay
    await this.delay(800);
    
    return {
      total: 2,
      synced: 2,
      created: 0,
      updated: 2,
      skipped: 0,
      failed: 0,
      details: [
        {
          idmpId: 'idmp-mp-nexavant',
          masterDataId: 'prod-lig-2847',
          entityName: 'Nexavant (ligrastinib)',
          action: 'updated',
          direction: 'idmp-to-master',
          changesApplied: ['developmentStatus', 'authorizations'],
        },
        {
          idmpId: 'idmp-mp-lig3021',
          masterDataId: 'prod-lig-3021',
          entityName: 'LIG-3021 (ligracept)',
          action: 'updated',
          direction: 'idmp-to-master',
          changesApplied: ['therapeuticIndications'],
        },
      ],
    };
  }
  
  private async syncSubstances(): Promise<EntitySyncResult> {
    await this.delay(600);
    
    return {
      total: 3,
      synced: 3,
      created: 0,
      updated: 2,
      skipped: 1,
      failed: 0,
      details: [
        {
          idmpId: 'idmp-sub-ligrastinib',
          masterDataId: 'sub-001',
          entityName: 'ligrastinib mesylate',
          action: 'updated',
          direction: 'bidirectional' as any,
          changesApplied: ['molecularWeight', 'casNumber'],
        },
        {
          idmpId: 'idmp-sub-ligracept',
          masterDataId: 'sub-002',
          entityName: 'ligracept',
          action: 'updated',
          direction: 'idmp-to-master',
          changesApplied: ['substanceClass'],
        },
        {
          idmpId: 'idmp-sub-mannitol',
          masterDataId: 'sub-excipient-001',
          entityName: 'Mannitol',
          action: 'skipped',
          direction: 'bidirectional' as any,
          reason: 'No changes detected',
        },
      ],
    };
  }
  
  private async syncOrganizations(): Promise<EntitySyncResult> {
    await this.delay(400);
    
    return {
      total: 2,
      synced: 2,
      created: 0,
      updated: 1,
      skipped: 1,
      failed: 0,
      details: [
        {
          idmpId: 'idmp-org-ligature',
          masterDataId: 'org-001',
          entityName: 'Ligature Therapeutics, Inc.',
          action: 'updated',
          direction: 'master-to-idmp',
          changesApplied: ['address', 'contact'],
        },
        {
          idmpId: 'idmp-org-cmo',
          masterDataId: 'org-mfg-001',
          entityName: 'Patheon Manufacturing',
          action: 'skipped',
          direction: 'bidirectional' as any,
          reason: 'No changes detected',
        },
      ],
    };
  }
  
  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================
  
  resolveConflict(conflictId: string, resolution: 'idmp-wins' | 'master-wins' | 'merged' | 'skipped'): SyncConflict | null {
    const conflict = this.pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) return null;
    
    conflict.resolution = resolution;
    conflict.resolvedAt = now();
    conflict.resolvedBy = 'current-user';
    
    // Remove from pending
    this.pendingConflicts = this.pendingConflicts.filter(c => c.id !== conflictId);
    
    return conflict;
  }
  
  getPendingConflicts(): SyncConflict[] {
    return [...this.pendingConflicts];
  }
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  updateConfig(updates: Partial<SyncConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }
  
  getConfig(): SyncConfiguration {
    return { ...this.config };
  }
  
  getSyncHistory(): SyncResult[] {
    return [...this.syncHistory];
  }
  
  getLastSync(): SyncResult | null {
    return this.syncHistory[this.syncHistory.length - 1] || null;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private createEmptyEntityResult(): EntitySyncResult {
    return {
      total: 0,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let syncServiceInstance: IDMPMasterDataSyncService | null = null;

export function getIDMPSyncService(): IDMPMasterDataSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new IDMPMasterDataSyncService();
  }
  return syncServiceInstance;
}

export function resetSyncService(): void {
  syncServiceInstance = null;
}
