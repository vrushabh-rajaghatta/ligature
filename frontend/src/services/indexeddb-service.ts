
/**
 * IndexedDB Service
 * Replaces localStorage with IndexedDB for larger offline storage
 * 
 * v0.42.1 - IndexedDB Integration
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DBConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

export interface QueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export interface DBStats {
  stores: {
    [storeName: string]: {
      count: number;
      estimatedSize?: number;
    };
  };
  totalEstimatedSize: number;
}

// =============================================================================
// DEFAULT SCHEMA
// =============================================================================

const DEFAULT_CONFIG: DBConfig = {
  name: 'ligature-db',
  version: 1,
  stores: [
    {
      name: 'documents',
      keyPath: 'id',
      indexes: [
        { name: 'by-type', keyPath: 'type' },
        { name: 'by-updated', keyPath: 'updatedAt' },
        { name: 'by-synced', keyPath: 'syncedAt' },
      ],
    },
    {
      name: 'operations',
      keyPath: 'id',
      indexes: [
        { name: 'by-session', keyPath: 'sessionId' },
        { name: 'by-timestamp', keyPath: 'timestamp' },
        { name: 'by-synced', keyPath: 'isSynced' },
      ],
    },
    {
      name: 'cache',
      keyPath: 'key',
      indexes: [
        { name: 'by-expires', keyPath: 'expiresAt' },
        { name: 'by-type', keyPath: 'type' },
      ],
    },
    {
      name: 'notifications',
      keyPath: 'id',
      indexes: [
        { name: 'by-read', keyPath: 'isRead' },
        { name: 'by-created', keyPath: 'createdAt' },
        { name: 'by-type', keyPath: 'type' },
      ],
    },
    {
      name: 'preferences',
      keyPath: 'key',
    },
    {
      name: 'sync-queue',
      keyPath: 'id',
      indexes: [
        { name: 'by-priority', keyPath: 'priority' },
        { name: 'by-created', keyPath: 'createdAt' },
        { name: 'by-status', keyPath: 'status' },
      ],
    },
  ],
};

// =============================================================================
// INDEXEDDB SERVICE
// =============================================================================

export class IndexedDBService {
  private config: DBConfig;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<DBConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      stores: config.stores || DEFAULT_CONFIG.stores,
    };
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.openDatabase();
    await this.initPromise;
    this.isInitialized = true;
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        this.db.onerror = (event) => {
          console.error('Database error:', (event.target as any)?.error);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    for (const storeConfig of this.config.stores) {
      // Delete existing store if it exists
      if (db.objectStoreNames.contains(storeConfig.name)) {
        db.deleteObjectStore(storeConfig.name);
      }

      // Create store
      const store = db.createObjectStore(storeConfig.name, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement,
      });

      // Create indexes
      if (storeConfig.indexes) {
        for (const indexConfig of storeConfig.indexes) {
          store.createIndex(indexConfig.name, indexConfig.keyPath, {
            unique: indexConfig.unique,
            multiEntry: indexConfig.multiEntry,
          });
        }
      }
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Add or update a record
   */
  async put<T>(storeName: string, data: T): Promise<IDBValidKey> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add multiple records
   */
  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const item of items) {
        store.put(item);
      }
    });
  }

  /**
   * Get a record by key
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      let source: IDBObjectStore | IDBIndex = store;
      if (options?.index) {
        source = store.index(options.index);
      }

      const results: T[] = [];
      let skipped = 0;
      let collected = 0;
      const offset = options?.offset || 0;
      const limit = options?.limit;

      const request = source.openCursor(options?.range, options?.direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }
          
          if (limit && collected >= limit) {
            resolve(results);
            return;
          }

          results.push(cursor.value);
          collected++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query records using an index
   */
  async query<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a record by key
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete multiple records
   */
  async deleteMany(storeName: string, keys: IDBValidKey[]): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const key of keys) {
        store.delete(key);
      }
    });
  }

  /**
   * Clear all records in a store
   */
  async clear(storeName: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Count records in a store
   */
  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = query ? store.count(query) : store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Check if a record exists
   */
  async exists(storeName: string, key: IDBValidKey): Promise<boolean> {
    const record = await this.get(storeName, key);
    return record !== undefined;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DBStats> {
    await this.init();
    
    const stats: DBStats = {
      stores: {},
      totalEstimatedSize: 0,
    };

    for (const storeConfig of this.config.stores) {
      const count = await this.count(storeConfig.name);
      stats.stores[storeConfig.name] = { count };
    }

    // Estimate total size if StorageManager available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      stats.totalEstimatedSize = estimate.usage || 0;
    }

    return stats;
  }

  /**
   * Delete expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    await this.init();
    
    const now = Date.now();
    const expired = await this.query<{ key: string; expiresAt: number }>(
      'cache',
      'by-expires',
      IDBKeyRange.upperBound(now)
    );

    if (expired.length > 0) {
      await this.deleteMany('cache', expired.map(e => e.key));
    }

    return expired.length;
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    await this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ---------------------------------------------------------------------------
  // Transaction Helpers
  // ---------------------------------------------------------------------------

  /**
   * Execute multiple operations in a single transaction
   */
  async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (stores: Map<string, IDBObjectStore>) => Promise<T>
  ): Promise<T> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const transaction = this.db!.transaction(names, mode);
      
      const stores = new Map<string, IDBObjectStore>();
      for (const name of names) {
        stores.set(name, transaction.objectStore(name));
      }

      let result: T;

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));

      callback(stores)
        .then(r => { result = r; })
        .catch(e => transaction.abort());
    });
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let dbInstance: IndexedDBService | null = null;

export function getIndexedDB(config?: Partial<DBConfig>): IndexedDBService {
  if (!dbInstance) {
    dbInstance = new IndexedDBService(config);
  }
  return dbInstance;
}

// =============================================================================
// CONVENIENCE WRAPPERS
// =============================================================================

/**
 * Document storage wrapper
 */
export const DocumentStore = {
  async save(doc: { id: string; [key: string]: unknown }): Promise<void> {
    const db = getIndexedDB();
    await db.put('documents', { ...doc, updatedAt: Date.now() });
  },

  async get(id: string): Promise<any | undefined> {
    const db = getIndexedDB();
    return db.get('documents', id);
  },

  async getAll(): Promise<any[]> {
    const db = getIndexedDB();
    return db.getAll('documents');
  },

  async getByType(type: string): Promise<any[]> {
    const db = getIndexedDB();
    return db.query('documents', 'by-type', type);
  },

  async delete(id: string): Promise<void> {
    const db = getIndexedDB();
    await db.delete('documents', id);
  },

  async getUnsynced(): Promise<any[]> {
    const db = getIndexedDB();
    return db.query('documents', 'by-synced', IDBKeyRange.only(null));
  },
};

/**
 * Cache storage wrapper
 */
export const CacheStore = {
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const db = getIndexedDB();
    await db.put('cache', {
      key,
      value,
      type: typeof value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
    });
  },

  async get<T>(key: string): Promise<T | undefined> {
    const db = getIndexedDB();
    const entry = await db.get<{ key: string; value: T; expiresAt: number | null }>('cache', key);
    
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await db.delete('cache', key);
      return undefined;
    }
    
    return entry.value;
  },

  async delete(key: string): Promise<void> {
    const db = getIndexedDB();
    await db.delete('cache', key);
  },

  async clear(): Promise<void> {
    const db = getIndexedDB();
    await db.clear('cache');
  },

  async clearExpired(): Promise<number> {
    const db = getIndexedDB();
    return db.clearExpiredCache();
  },
};

/**
 * Preferences storage wrapper
 */
export const PreferencesStore = {
  async set(key: string, value: unknown): Promise<void> {
    const db = getIndexedDB();
    await db.put('preferences', { key, value, updatedAt: Date.now() });
  },

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = getIndexedDB();
    const entry = await db.get<{ key: string; value: T }>('preferences', key);
    return entry?.value ?? defaultValue;
  },

  async delete(key: string): Promise<void> {
    const db = getIndexedDB();
    await db.delete('preferences', key);
  },

  async getAll(): Promise<Record<string, unknown>> {
    const db = getIndexedDB();
    const entries = await db.getAll<{ key: string; value: unknown }>('preferences');
    return Object.fromEntries(entries.map(e => [e.key, e.value]));
  },
};

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useIndexedDB() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DBStats | null>(null);

  useEffect(() => {
    const db = getIndexedDB();
    db.init()
      .then(() => {
        setIsReady(true);
        return db.getStats();
      })
      .then(setStats)
      .catch(e => setError(e.message));
  }, []);

  const refreshStats = useCallback(async () => {
    const db = getIndexedDB();
    const newStats = await db.getStats();
    setStats(newStats);
    return newStats;
  }, []);

  return {
    isReady,
    error,
    stats,
    refreshStats,
    db: getIndexedDB(),
    DocumentStore,
    CacheStore,
    PreferencesStore,
  };
}

export default IndexedDBService;
