
/**
 * Storage Quota Management Service
 * Monitor and manage IndexedDB quota
 * 
 * v0.42.2 - Storage Quota Management
 */

import { getIndexedDB } from './indexeddb-service';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  usedPercent: number;
  isPersisted: boolean;
}

export interface StorageBreakdown {
  stores: Record<string, StoreUsage>;
  total: number;
  largestStore: string;
}

export interface StoreUsage {
  name: string;
  count: number;
  estimatedSize: number;
  sizePercent: number;
}

export interface CleanupResult {
  freedBytes: number;
  deletedItems: number;
  stores: Record<string, number>;
}

export interface CleanupPolicy {
  id: string;
  name: string;
  description: string;
  storeName: string;
  condition: 'expired' | 'old' | 'excess' | 'custom';
  threshold?: number;  // For 'old': days, for 'excess': max items
  priority: number;    // Lower = clean first
  customFilter?: (item: unknown) => boolean;
}

export interface StorageConfig {
  warningThreshold: number;    // Percent (default: 80)
  criticalThreshold: number;   // Percent (default: 95)
  checkInterval: number;       // ms (default: 60000)
  autocleanEnabled: boolean;
  autocleanThreshold: number;  // Percent to trigger autoclean
  cleanupPolicies: CleanupPolicy[];
}

export type StorageStatus = 'ok' | 'warning' | 'critical' | 'full';

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CLEANUP_POLICIES: CleanupPolicy[] = [
  {
    id: 'expired-cache',
    name: 'Expired Cache',
    description: 'Remove expired cache entries',
    storeName: 'cache',
    condition: 'expired',
    priority: 1,
  },
  {
    id: 'old-notifications',
    name: 'Old Notifications',
    description: 'Remove read notifications older than 30 days',
    storeName: 'notifications',
    condition: 'old',
    threshold: 30,
    priority: 2,
  },
  {
    id: 'completed-sync',
    name: 'Completed Sync Operations',
    description: 'Remove completed sync operations older than 7 days',
    storeName: 'sync-queue',
    condition: 'old',
    threshold: 7,
    priority: 3,
  },
  {
    id: 'excess-operations',
    name: 'Excess Operations',
    description: 'Keep only last 500 operations',
    storeName: 'operations',
    condition: 'excess',
    threshold: 500,
    priority: 4,
  },
];

const DEFAULT_CONFIG: StorageConfig = {
  warningThreshold: 80,
  criticalThreshold: 95,
  checkInterval: 60000,
  autocleanEnabled: true,
  autocleanThreshold: 90,
  cleanupPolicies: DEFAULT_CLEANUP_POLICIES,
};

// =============================================================================
// STORAGE QUOTA SERVICE
// =============================================================================

export class StorageQuotaService {
  private config: StorageConfig;
  private checkTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(quota: StorageQuota, status: StorageStatus) => void> = new Set();
  private lastQuota: StorageQuota | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      cleanupPolicies: config.cleanupPolicies || DEFAULT_CLEANUP_POLICIES,
    };
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    // Start periodic checks
    this.startPeriodicCheck();
    
    // Initial check
    await this.checkQuota();
  }

  destroy(): void {
    this.stopPeriodicCheck();
  }

  // ---------------------------------------------------------------------------
  // Quota Checking
  // ---------------------------------------------------------------------------

  /**
   * Get current storage quota
   */
  async getQuota(): Promise<StorageQuota> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return {
        used: 0,
        available: 0,
        total: 0,
        usedPercent: 0,
        isPersisted: false,
      };
    }

    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const total = estimate.quota || 0;
    const available = total - used;

    let isPersisted = false;
    if ('persisted' in navigator.storage) {
      isPersisted = await navigator.storage.persisted();
    }

    return {
      used,
      available,
      total,
      usedPercent: total > 0 ? (used / total) * 100 : 0,
      isPersisted,
    };
  }

  /**
   * Check quota and notify listeners
   */
  async checkQuota(): Promise<StorageStatus> {
    const quota = await this.getQuota();
    const status = this.getStatus(quota);

    this.lastQuota = quota;
    this.notifyListeners(quota, status);

    // Auto-clean if threshold exceeded
    if (this.config.autocleanEnabled && quota.usedPercent >= this.config.autocleanThreshold) {
      await this.runAutoclean();
    }

    return status;
  }

  /**
   * Get storage status
   */
  getStatus(quota: StorageQuota): StorageStatus {
    if (quota.usedPercent >= 99) return 'full';
    if (quota.usedPercent >= this.config.criticalThreshold) return 'critical';
    if (quota.usedPercent >= this.config.warningThreshold) return 'warning';
    return 'ok';
  }

  /**
   * Request persistent storage
   */
  async requestPersistence(): Promise<boolean> {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      return false;
    }

    return await navigator.storage.persist();
  }

  // ---------------------------------------------------------------------------
  // Storage Breakdown
  // ---------------------------------------------------------------------------

  /**
   * Get detailed storage breakdown by store
   */
  async getBreakdown(): Promise<StorageBreakdown> {
    const db = getIndexedDB();
    const stats = await db.getStats();
    
    const breakdown: StorageBreakdown = {
      stores: {},
      total: 0,
      largestStore: '',
    };

    let maxSize = 0;

    for (const [storeName, storeStats] of Array.from(Object.entries(stats.stores))) {
      // Estimate size based on count (rough approximation)
      const estimatedSize = storeStats.count * 1024; // Assume ~1KB per item avg
      
      breakdown.stores[storeName] = {
        name: storeName,
        count: storeStats.count,
        estimatedSize,
        sizePercent: 0, // Will calculate after total
      };

      breakdown.total += estimatedSize;

      if (estimatedSize > maxSize) {
        maxSize = estimatedSize;
        breakdown.largestStore = storeName;
      }
    }

    // Calculate percentages
    for (const store of Array.from(Object.values(breakdown.stores))) {
      store.sizePercent = breakdown.total > 0 
        ? (store.estimatedSize / breakdown.total) * 100 
        : 0;
    }

    return breakdown;
  }

  // ---------------------------------------------------------------------------
  // Cleanup Operations
  // ---------------------------------------------------------------------------

  /**
   * Run cleanup based on policies
   */
  async runCleanup(policyIds?: string[]): Promise<CleanupResult> {
    const result: CleanupResult = {
      freedBytes: 0,
      deletedItems: 0,
      stores: {},
    };

    const policies = policyIds
      ? this.config.cleanupPolicies.filter(p => policyIds.includes(p.id))
      : this.config.cleanupPolicies;

    // Sort by priority
    policies.sort((a, b) => a.priority - b.priority);

    for (const policy of Array.from(policies)) {
      const policyResult = await this.runCleanupPolicy(policy);
      result.freedBytes += policyResult.freedBytes;
      result.deletedItems += policyResult.deletedItems;
      result.stores[policy.storeName] = (result.stores[policy.storeName] || 0) + policyResult.deletedItems;
    }

    return result;
  }

  private async runCleanupPolicy(policy: CleanupPolicy): Promise<{ freedBytes: number; deletedItems: number }> {
    const db = getIndexedDB();
    let deletedItems = 0;
    let freedBytes = 0;

    // v0.42.28: Interface for storage items with optional timestamps
    interface StorageItem {
      id?: string;
      key?: string;
      expiresAt?: number;
      createdAt?: number;
      updatedAt?: number;
      [key: string]: unknown;
    }

    try {
      const items = await db.getAll<StorageItem>(policy.storeName);
      const toDelete: StorageItem[] = [];
      const now = Date.now();

      for (const item of Array.from(items)) {
        let shouldDelete = false;

        switch (policy.condition) {
          case 'expired':
            shouldDelete = item.expiresAt && item.expiresAt < now;
            break;

          case 'old':
            const age = now - (item.createdAt || item.updatedAt || 0);
            const maxAge = (policy.threshold || 30) * 24 * 60 * 60 * 1000;
            shouldDelete = age > maxAge;
            break;

          case 'excess':
            // Will handle after sorting
            break;

          case 'custom':
            shouldDelete = policy.customFilter?.(item) ?? false;
            break;
        }

        if (shouldDelete) {
          toDelete.push(item);
        }
      }

      // Handle excess condition
      if (policy.condition === 'excess' && policy.threshold) {
        const sorted = items.sort((a, b) => 
          (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0)
        );
        const excess = sorted.slice(policy.threshold);
        toDelete.push(...excess);
      }

      // Delete items
      if (toDelete.length > 0) {
        const keys = toDelete.map(item => item.id || item.key);
        await db.deleteMany(policy.storeName, keys);
        deletedItems = toDelete.length;
        freedBytes = deletedItems * 1024; // Rough estimate
      }
    } catch (error) {
      logger.error('Storage', `Cleanup policy ${policy.id} failed`, error);
    }

    return { freedBytes, deletedItems };
  }

  /**
   * Run autoclean to reduce storage usage
   */
  private async runAutoclean(): Promise<void> {
    logger.debug('Storage', 'Running autoclean...');
    const result = await this.runCleanup();
    logger.debug('Storage', `Autoclean complete: ${result.deletedItems} items, ~${this.formatBytes(result.freedBytes)} freed`);
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: string): Promise<number> {
    const db = getIndexedDB();
    const count = await db.count(storeName);
    await db.clear(storeName);
    return count;
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = getIndexedDB();
    await db.deleteDatabase();
  }

  // ---------------------------------------------------------------------------
  // Periodic Checking
  // ---------------------------------------------------------------------------

  private startPeriodicCheck(): void {
    this.stopPeriodicCheck();
    this.checkTimer = setInterval(() => {
      this.checkQuota();
    }, this.config.checkInterval);
  }

  private stopPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  onQuotaChange(listener: (quota: StorageQuota, status: StorageStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Send current state immediately
    if (this.lastQuota) {
      listener(this.lastQuota, this.getStatus(this.lastQuota));
    }
    
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(quota: StorageQuota, status: StorageStatus): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(quota, status);
      } catch (e) {
        logger.error('Storage', 'Quota listener error', e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  addCleanupPolicy(policy: CleanupPolicy): void {
    this.config.cleanupPolicies.push(policy);
  }

  removeCleanupPolicy(policyId: string): void {
    this.config.cleanupPolicies = this.config.cleanupPolicies.filter(p => p.id !== policyId);
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let serviceInstance: StorageQuotaService | null = null;

export function getStorageQuotaService(config?: Partial<StorageConfig>): StorageQuotaService {
  if (!serviceInstance) {
    serviceInstance = new StorageQuotaService(config);
  }
  return serviceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useStorageQuota() {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [status, setStatus] = useState<StorageStatus>('ok');
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const service = getStorageQuotaService();

  useEffect(() => {
    service.init();

    const unsubscribe = service.onQuotaChange((q, s) => {
      setQuota(q);
      setStatus(s);
      setIsLoading(false);
    });

    // Get breakdown
    service.getBreakdown().then(setBreakdown);

    return () => {
      unsubscribe();
      service.destroy();
    };
  }, [service]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await service.checkQuota();
    const b = await service.getBreakdown();
    setBreakdown(b);
    setIsLoading(false);
  }, [service]);

  const runCleanup = useCallback(async (policyIds?: string[]) => {
    const result = await service.runCleanup(policyIds);
    await refresh();
    return result;
  }, [service, refresh]);

  const clearStore = useCallback(async (storeName: string) => {
    const count = await service.clearStore(storeName);
    await refresh();
    return count;
  }, [service, refresh]);

  const requestPersistence = useCallback(async () => {
    return service.requestPersistence();
  }, [service]);

  return {
    quota,
    status,
    breakdown,
    isLoading,
    refresh,
    runCleanup,
    clearStore,
    requestPersistence,
    formatBytes: service.formatBytes.bind(service),
  };
}

export default StorageQuotaService;
