
/**
 * Sync Conflict Resolution Service
 * Handles conflicts when syncing offline changes
 * 
 * v0.42.2 - Sync Conflict Resolution
 */

import { getIndexedDB } from './indexeddb-service';

// =============================================================================
// TYPES
// =============================================================================

export type ConflictType = 
  | 'update-update'    // Both local and remote updated same entity
  | 'update-delete'    // Local updated, remote deleted
  | 'delete-update'    // Local deleted, remote updated
  | 'create-create'    // Both created entity with same ID
  | 'version-mismatch'; // Version numbers don't match

export type ResolutionStrategy = 
  | 'local-wins'       // Keep local changes
  | 'remote-wins'      // Keep remote changes
  | 'merge'            // Merge both changes
  | 'manual'           // Require user decision
  | 'newest-wins'      // Keep most recent
  | 'custom';          // Custom resolver function

export interface SyncConflict<T = Record<string, unknown>> {
  id: string;
  entityType: string;
  entityId: string;
  conflictType: ConflictType;
  localData: T | null;
  remoteData: T | null;
  localTimestamp: number;
  remoteTimestamp: number;
  localVersion?: number;
  remoteVersion?: number;
  fieldConflicts?: FieldConflict[];
  detectedAt: number;
  resolvedAt?: number;
  resolution?: ConflictResolution<T>;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface FieldConflict {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue?: unknown;
}

export interface ConflictResolution<T = Record<string, unknown>> {
  strategy: ResolutionStrategy;
  resolvedData: T | null;
  resolvedBy: 'auto' | 'user';
  timestamp: number;
  mergeDetails?: MergeDetails;
}

export interface MergeDetails {
  fieldsFromLocal: string[];
  fieldsFromRemote: string[];
  mergedFields: string[];
  discardedFields: string[];
}

export interface ResolutionRule<T = Record<string, unknown>> {
  entityType: string;
  field?: string;
  strategy: ResolutionStrategy;
  priority?: number;
  condition?: (conflict: SyncConflict<T>) => boolean;
  customResolver?: (conflict: SyncConflict<T>) => T | null;
}

export interface SyncConflictConfig {
  defaultStrategy: ResolutionStrategy;
  rules: ResolutionRule[];
  autoResolveThreshold: number; // Auto-resolve if time diff > threshold (ms)
  trackHistory: boolean;
  maxHistoryItems: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: SyncConflictConfig = {
  defaultStrategy: 'newest-wins',
  rules: [],
  autoResolveThreshold: 60000, // 1 minute
  trackHistory: true,
  maxHistoryItems: 100,
};

// =============================================================================
// SYNC CONFLICT RESOLUTION SERVICE
// =============================================================================

export class SyncConflictResolutionService {
  private config: SyncConflictConfig;
  private conflictIdCounter = 0;
  private listeners: Set<(conflict: SyncConflict) => void> = new Set();

  constructor(config: Partial<SyncConflictConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  /**
   * Detect conflicts between local and remote data
   */
  detectConflict<T extends Record<string, unknown>>(params: {
    entityType: string;
    entityId: string;
    localData: T | null;
    remoteData: T | null;
    localTimestamp: number;
    remoteTimestamp: number;
    localVersion?: number;
    remoteVersion?: number;
  }): SyncConflict<T> | null {
    const { entityType, entityId, localData, remoteData, localTimestamp, remoteTimestamp, localVersion, remoteVersion } = params;

    // No conflict if data is identical
    if (this.isEqual(localData, remoteData)) {
      return null;
    }

    // Determine conflict type
    let conflictType: ConflictType;
    
    if (localData === null && remoteData !== null) {
      conflictType = 'delete-update';
    } else if (localData !== null && remoteData === null) {
      conflictType = 'update-delete';
    } else if (localVersion !== undefined && remoteVersion !== undefined && localVersion !== remoteVersion) {
      conflictType = 'version-mismatch';
    } else {
      conflictType = 'update-update';
    }

    // Detect field-level conflicts
    const fieldConflicts = this.detectFieldConflicts(localData, remoteData);

    const conflict: SyncConflict<Record<string, unknown>> = {
      id: this.generateConflictId(),
      entityType,
      entityId,
      conflictType,
      localData,
      remoteData,
      localTimestamp,
      remoteTimestamp,
      localVersion,
      remoteVersion,
      fieldConflicts,
      detectedAt: Date.now(),
      status: 'pending',
    };

    // Notify listeners
    this.notifyListeners(conflict);

    return conflict as unknown as SyncConflict<T>;
  }

  /**
   * Detect field-level conflicts between two objects
   */
  private detectFieldConflicts(local: Record<string, unknown> | null, remote: Record<string, unknown> | null): FieldConflict[] {
    if (!local || !remote || typeof local !== 'object' || typeof remote !== 'object') {
      return [];
    }

    const conflicts: FieldConflict[] = [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of Array.from(allKeys)) {
      // Skip metadata fields
      if (['id', 'createdAt', 'updatedAt', 'version', 'syncedAt'].includes(key)) {
        continue;
      }

      const localValue = local[key];
      const remoteValue = remote[key];

      if (!this.isEqual(localValue, remoteValue)) {
        conflicts.push({
          field: key,
          localValue,
          remoteValue,
        });
      }
    }

    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // Conflict Resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve a conflict using configured strategy
   */
  async resolveConflict<T extends Record<string, unknown>>(conflict: SyncConflict<T>, userStrategy?: ResolutionStrategy): Promise<ConflictResolution<T>> {
    const strategy = userStrategy || this.determineStrategy(conflict);
    let resolvedData: T | null;
    let mergeDetails: MergeDetails | undefined;

    switch (strategy) {
      case 'local-wins':
        resolvedData = conflict.localData;
        break;

      case 'remote-wins':
        resolvedData = conflict.remoteData;
        break;

      case 'newest-wins':
        resolvedData = conflict.localTimestamp > conflict.remoteTimestamp
          ? conflict.localData
          : conflict.remoteData;
        break;

      case 'merge':
        const mergeResult = this.mergeData(conflict);
        resolvedData = mergeResult.data;
        mergeDetails = mergeResult.details;
        break;

      case 'custom':
        const rule = this.findMatchingRule(conflict);
        if (rule?.customResolver) {
          resolvedData = rule.customResolver(conflict) as unknown as T;
        } else {
          resolvedData = conflict.localData as unknown as T;
        }
        break;

      case 'manual':
      default:
        // For manual, return local data but mark as needing user input
        resolvedData = conflict.localData as unknown as T;
        break;
    }

    const resolution: ConflictResolution<Record<string, unknown>> = {
      strategy,
      resolvedData,
      resolvedBy: userStrategy ? 'user' : 'auto',
      timestamp: Date.now(),
      mergeDetails,
    };

    // Update conflict
    conflict.resolution = resolution as unknown as ConflictResolution<T>;
    conflict.resolvedAt = Date.now();
    conflict.status = 'resolved';

    // Store in history
    if (this.config.trackHistory) {
      await this.storeConflictHistory(conflict);
    }

    return resolution as unknown as ConflictResolution<T>;
  }

  /**
   * Resolve multiple conflicts
   */
  async resolveConflicts(conflicts: SyncConflict[]): Promise<Map<string, ConflictResolution>> {
    const resolutions = new Map<string, ConflictResolution>();
    
    for (const conflict of Array.from(conflicts)) {
      const resolution = await this.resolveConflict(conflict);
      resolutions.set(conflict.id, resolution);
    }
    
    return resolutions;
  }

  /**
   * User-driven resolution for specific fields
   */
  async resolveWithFieldSelections(
    conflict: SyncConflict,
    fieldSelections: Record<string, 'local' | 'remote'>
  ): Promise<ConflictResolution> {
    const resolvedData = { ...conflict.remoteData };
    const fieldsFromLocal: string[] = [];
    const fieldsFromRemote: string[] = [];

    for (const [field, source] of Array.from(Object.entries(fieldSelections))) {
      if (source === 'local') {
        resolvedData[field] = conflict.localData?.[field];
        fieldsFromLocal.push(field);
      } else {
        resolvedData[field] = conflict.remoteData?.[field];
        fieldsFromRemote.push(field);
      }
    }

    const resolution: ConflictResolution<Record<string, unknown>> = {
      strategy: 'manual',
      resolvedData,
      resolvedBy: 'user',
      timestamp: Date.now(),
      mergeDetails: {
        fieldsFromLocal,
        fieldsFromRemote,
        mergedFields: [],
        discardedFields: [],
      },
    };

    conflict.resolution = resolution as unknown as ConflictResolution<Record<string, unknown>>;
    conflict.resolvedAt = Date.now();
    conflict.status = 'resolved';

    if (this.config.trackHistory) {
      await this.storeConflictHistory(conflict);
    }

    return resolution;
  }

  // ---------------------------------------------------------------------------
  // Strategy Determination
  // ---------------------------------------------------------------------------

  private determineStrategy(conflict: SyncConflict): ResolutionStrategy {
    // Check for matching rules
    const rule = this.findMatchingRule(conflict);
    if (rule) {
      return rule.strategy;
    }

    // Check auto-resolve threshold
    const timeDiff = Math.abs(conflict.localTimestamp - conflict.remoteTimestamp);
    if (timeDiff > this.config.autoResolveThreshold) {
      return 'newest-wins';
    }

    return this.config.defaultStrategy;
  }

  private findMatchingRule(conflict: SyncConflict): ResolutionRule | null {
    const matchingRules = this.config.rules
      .filter(rule => {
        if (rule.entityType !== conflict.entityType && rule.entityType !== '*') {
          return false;
        }
        if (rule.condition && !rule.condition(conflict)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return matchingRules[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Merging
  // ---------------------------------------------------------------------------

  private mergeData<T extends Record<string, unknown>>(conflict: SyncConflict<T>): { data: T; details: MergeDetails } {
    const local = (conflict.localData || {}) as Record<string, unknown>;
    const remote = (conflict.remoteData || {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = {};
    
    const fieldsFromLocal: string[] = [];
    const fieldsFromRemote: string[] = [];
    const mergedFields: string[] = [];

    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of Array.from(allKeys)) {
      // Skip metadata
      if (['id', 'createdAt', 'version'].includes(key)) {
        merged[key] = remote[key] ?? local[key];
        continue;
      }

      const localVal = local[key];
      const remoteVal = remote[key];

      if (this.isEqual(localVal, remoteVal)) {
        merged[key] = localVal;
      } else if (localVal === undefined) {
        merged[key] = remoteVal;
        fieldsFromRemote.push(key);
      } else if (remoteVal === undefined) {
        merged[key] = localVal;
        fieldsFromLocal.push(key);
      } else if (Array.isArray(localVal) && Array.isArray(remoteVal)) {
        // Merge arrays by union
        merged[key] = Array.from(new Set([...localVal, ...remoteVal]));
        mergedFields.push(key);
      } else if (typeof localVal === 'object' && typeof remoteVal === 'object') {
        // Recursive merge for objects
        merged[key] = { ...remoteVal, ...localVal };
        mergedFields.push(key);
      } else {
        // Prefer local for scalar conflicts
        merged[key] = localVal;
        fieldsFromLocal.push(key);
      }
    }

    // Update timestamps
    merged.updatedAt = Date.now();
    merged.syncedAt = Date.now();

    return {
      data: merged as unknown as T,
      details: {
        fieldsFromLocal,
        fieldsFromRemote,
        mergedFields,
        discardedFields: [],
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Rules Management
  // ---------------------------------------------------------------------------

  addRule(rule: ResolutionRule): void {
    this.config.rules.push(rule);
  }

  removeRule(entityType: string, field?: string): void {
    this.config.rules = this.config.rules.filter(r => 
      !(r.entityType === entityType && r.field === field)
    );
  }

  setDefaultStrategy(strategy: ResolutionStrategy): void {
    this.config.defaultStrategy = strategy;
  }

  // ---------------------------------------------------------------------------
  // History & Persistence
  // ---------------------------------------------------------------------------

  private async storeConflictHistory(conflict: SyncConflict): Promise<void> {
    const db = getIndexedDB();
    
    // Add to history store (using cache store)
    await db.put('cache', {
      key: `conflict-history-${conflict.id}`,
      value: conflict,
      type: 'conflict-history',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Trim old history
    const history = await db.query<{ key: string; createdAt: number; value: SyncConflict }>('cache', 'by-type', 'conflict-history');
    if (history.length > this.config.maxHistoryItems) {
      const toDelete = history
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, history.length - this.config.maxHistoryItems)
        .map(h => h.key);
      await db.deleteMany('cache', toDelete);
    }
  }

  async getConflictHistory(limit?: number): Promise<SyncConflict[]> {
    const db = getIndexedDB();
    const history = await db.query<{ value: SyncConflict }>('cache', 'by-type', 'conflict-history');
    
    return history
      .map(h => h.value)
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, limit || 50);
  }

  async getPendingConflicts(): Promise<SyncConflict[]> {
    const history = await this.getConflictHistory();
    return history.filter(c => c.status === 'pending');
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  onConflict(listener: (conflict: SyncConflict) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(conflict: SyncConflict): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(conflict);
      } catch (e) {
        console.error('Conflict listener error:', e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return false;
    
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => this.isEqual(objA[key], objB[key]));
  }

  private generateConflictId(): string {
    return `conflict-${Date.now()}-${++this.conflictIdCounter}`;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let serviceInstance: SyncConflictResolutionService | null = null;

export function getSyncConflictService(config?: Partial<SyncConflictConfig>): SyncConflictResolutionService {
  if (!serviceInstance) {
    serviceInstance = new SyncConflictResolutionService(config);
  }
  return serviceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useSyncConflicts() {
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const service = getSyncConflictService();

  useEffect(() => {
    // Load pending conflicts
    service.getPendingConflicts()
      .then(setPendingConflicts)
      .finally(() => setIsLoading(false));

    // Listen for new conflicts
    const unsubscribe = service.onConflict((conflict) => {
      if (conflict.status === 'pending') {
        setPendingConflicts(prev => [...prev, conflict]);
      }
    });

    return unsubscribe;
  }, [service]);

  const resolveConflict = useCallback(async (
    conflictId: string,
    strategy?: ResolutionStrategy
  ) => {
    const conflict = pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) return null;

    const resolution = await service.resolveConflict(conflict, strategy);
    setPendingConflicts(prev => prev.filter(c => c.id !== conflictId));
    return resolution;
  }, [pendingConflicts, service]);

  const resolveWithSelections = useCallback(async (
    conflictId: string,
    fieldSelections: Record<string, 'local' | 'remote'>
  ) => {
    const conflict = pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) return null;

    const resolution = await service.resolveWithFieldSelections(conflict, fieldSelections);
    setPendingConflicts(prev => prev.filter(c => c.id !== conflictId));
    return resolution;
  }, [pendingConflicts, service]);

  const dismissConflict = useCallback(async (conflictId: string) => {
    const conflict = pendingConflicts.find(c => c.id === conflictId);
    if (conflict) {
      conflict.status = 'dismissed';
      setPendingConflicts(prev => prev.filter(c => c.id !== conflictId));
    }
  }, [pendingConflicts]);

  return {
    pendingConflicts,
    isLoading,
    resolveConflict,
    resolveWithSelections,
    dismissConflict,
    hasPendingConflicts: pendingConflicts.length > 0,
  };
}

export default SyncConflictResolutionService;
