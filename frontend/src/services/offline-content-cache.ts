
/**
 * Offline Content Cache Service
 * Caches document content for offline viewing
 * 
 * v0.41.9 - Offline Content Caching
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CachedDocument {
  id: string;
  type: 'template' | 'document' | 'version';
  title: string;
  content: string;
  metadata: Record<string, any>;
  version: number;
  cachedAt: number;
  expiresAt: number;
  size: number; // bytes
  checksum: string;
}

export interface CacheConfig {
  maxCacheSize: number;      // Max total cache size in bytes (default: 50MB)
  maxDocuments: number;      // Max documents to cache (default: 100)
  defaultTTL: number;        // Default TTL in ms (default: 7 days)
  storageKey: string;        // localStorage key prefix
  enableCompression: boolean;
}

export interface CacheStats {
  documentCount: number;
  totalSize: number;
  maxSize: number;
  oldestDocument: number | null;
  newestDocument: number | null;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxDocuments: 100,
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  storageKey: 'ligature-offline-cache',
  enableCompression: true,
};

// =============================================================================
// COMPRESSION HELPERS
// =============================================================================

async function compressString(str: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    return str; // Fallback for unsupported browsers
  }
  
  const blob = new Blob([str]);
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const compressedBlob = await new Response(stream).blob();
  const buffer = await compressedBlob.arrayBuffer();
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(buffer))));
}

async function decompressString(compressed: string): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    return compressed; // Fallback
  }
  
  try {
    const bytes = Uint8Array.from(atob(compressed), c => c.charCodeAt(0));
    const blob = new Blob([bytes]);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch {
    return compressed; // Return as-is if decompression fails
  }
}

function calculateChecksum(content: string): string {
  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// =============================================================================
// OFFLINE CONTENT CACHE SERVICE
// =============================================================================

export class OfflineContentCacheService {
  private config: CacheConfig;
  private cache: Map<string, CachedDocument> = new Map();
  private indexKey: string;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.indexKey = `${this.config.storageKey}-index`;
    this.loadIndex();
  }

  // ---------------------------------------------------------------------------
  // Core Cache Operations
  // ---------------------------------------------------------------------------

  /**
   * Cache a document for offline access
   */
  async cacheDocument(params: {
    id: string;
    type: CachedDocument['type'];
    title: string;
    content: string;
    metadata?: Record<string, any>;
    version?: number;
    ttl?: number;
  }): Promise<CachedDocument> {
    const {
      id,
      type,
      title,
      content,
      metadata = {},
      version = 1,
      ttl = this.config.defaultTTL,
    } = params;

    // Check size
    const size = new Blob([content]).size;
    
    // Make room if needed
    await this.ensureSpace(size);

    // Compress if enabled
    const storedContent = this.config.enableCompression 
      ? await compressString(content)
      : content;

    const cached: CachedDocument = {
      id,
      type,
      title,
      content: storedContent,
      metadata,
      version,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      size,
      checksum: calculateChecksum(content),
    };

    // Store
    this.cache.set(id, cached);
    this.saveDocument(cached);
    this.saveIndex();

    return cached;
  }

  /**
   * Get cached document
   */
  async getDocument(id: string): Promise<CachedDocument | null> {
    // Check memory cache first
    let cached = this.cache.get(id);
    
    // Try loading from storage
    if (!cached) {
      cached = this.loadDocument(id);
      if (cached) {
        this.cache.set(id, cached);
      }
    }

    if (!cached) return null;

    // Check expiration
    if (cached.expiresAt < Date.now()) {
      this.removeDocument(id);
      return null;
    }

    // Decompress content if needed
    if (this.config.enableCompression) {
      return {
        ...cached,
        content: await decompressString(cached.content),
      };
    }

    return cached;
  }

  /**
   * Check if document is cached and valid
   */
  isDocumentCached(id: string): boolean {
    const cached = this.cache.get(id);
    if (!cached) return false;
    return cached.expiresAt > Date.now();
  }

  /**
   * Check if cached version matches
   */
  isCacheValid(id: string, currentVersion: number, currentChecksum?: string): boolean {
    const cached = this.cache.get(id);
    if (!cached) return false;
    if (cached.expiresAt < Date.now()) return false;
    if (cached.version !== currentVersion) return false;
    if (currentChecksum && cached.checksum !== currentChecksum) return false;
    return true;
  }

  /**
   * Remove document from cache
   */
  removeDocument(id: string): boolean {
    const existed = this.cache.delete(id);
    if (existed) {
      this.removeFromStorage(id);
      this.saveIndex();
    }
    return existed;
  }

  /**
   * Clear all cached documents
   */
  clearAll(): void {
    for (const id of Array.from(Array.from(Array.from(Array.from(this.cache.keys()))))) {
      this.removeFromStorage(id);
    }
    this.cache.clear();
    this.saveIndex();
  }

  /**
   * Clear expired documents
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [id, doc] of Array.from(this.cache)) {
      if (doc.expiresAt < now) {
        this.removeDocument(id);
        count++;
      }
    }
    
    return count;
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Cache multiple documents
   */
  async cacheDocuments(documents: Array<{
    id: string;
    type: CachedDocument['type'];
    title: string;
    content: string;
    metadata?: Record<string, any>;
    version?: number;
  }>): Promise<CachedDocument[]> {
    const results: CachedDocument[] = [];
    
    for (const doc of Array.from(documents)) {
      const cached = await this.cacheDocument(doc);
      results.push(cached);
    }
    
    return results;
  }

  /**
   * Get multiple documents
   */
  async getDocuments(ids: string[]): Promise<Map<string, CachedDocument | null>> {
    const results = new Map<string, CachedDocument | null>();
    
    for (const id of Array.from(ids)) {
      results.set(id, await this.getDocument(id));
    }
    
    return results;
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0;
    let oldestDocument: number | null = null;
    let newestDocument: number | null = null;

    for (const doc of Array.from(Array.from(Array.from(Array.from(this.cache.values()))))) {
      totalSize += doc.size;
      if (oldestDocument === null || doc.cachedAt < oldestDocument) {
        oldestDocument = doc.cachedAt;
      }
      if (newestDocument === null || doc.cachedAt > newestDocument) {
        newestDocument = doc.cachedAt;
      }
    }

    return {
      documentCount: this.cache.size,
      totalSize,
      maxSize: this.config.maxCacheSize,
      oldestDocument,
      newestDocument,
    };
  }

  /**
   * Get list of cached document IDs
   */
  getCachedIds(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cached document metadata (without content)
   */
  getCachedMetadata(): Array<{
    id: string;
    type: CachedDocument['type'];
    title: string;
    version: number;
    cachedAt: number;
    expiresAt: number;
    size: number;
  }> {
    return Array.from(this.cache.values()).map(doc => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      version: doc.version,
      cachedAt: doc.cachedAt,
      expiresAt: doc.expiresAt,
      size: doc.size,
    }));
  }

  // ---------------------------------------------------------------------------
  // Storage Management
  // ---------------------------------------------------------------------------

  private async ensureSpace(requiredSize: number): Promise<void> {
    const stats = this.getStats();
    
    // Check document count limit
    while (this.cache.size >= this.config.maxDocuments) {
      this.evictOldest();
    }
    
    // Check size limit
    while (stats.totalSize + requiredSize > this.config.maxCacheSize && this.cache.size > 0) {
      this.evictOldest();
    }
  }

  private evictOldest(): void {
    let oldest: CachedDocument | null = null;
    
    for (const doc of Array.from(Array.from(Array.from(Array.from(this.cache.values()))))) {
      if (!oldest || doc.cachedAt < oldest.cachedAt) {
        oldest = doc;
      }
    }
    
    if (oldest) {
      this.removeDocument(oldest.id);
    }
  }

  private loadIndex(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const indexData = localStorage.getItem(this.indexKey);
      if (indexData) {
        const ids = JSON.parse(indexData) as string[];
        for (const id of Array.from(ids)) {
          const doc = this.loadDocument(id);
          if (doc && doc.expiresAt > Date.now()) {
            this.cache.set(id, doc);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load cache index:', e);
    }
  }

  private saveIndex(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const ids = Array.from(this.cache.keys());
      localStorage.setItem(this.indexKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save cache index:', e);
    }
  }

  private loadDocument(id: string): CachedDocument | null {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      const key = `${this.config.storageKey}-doc-${id}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load cached document:', e);
    }
    return null;
  }

  private saveDocument(doc: CachedDocument): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const key = `${this.config.storageKey}-doc-${doc.id}`;
      localStorage.setItem(key, JSON.stringify(doc));
    } catch (e) {
      console.warn('Failed to save cached document:', e);
      // Try to make room
      this.evictOldest();
    }
  }

  private removeFromStorage(id: string): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const key = `${this.config.storageKey}-doc-${id}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove cached document:', e);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let cacheServiceInstance: OfflineContentCacheService | null = null;

export function getOfflineCache(): OfflineContentCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new OfflineContentCacheService();
  }
  return cacheServiceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useOfflineCache() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cache = getOfflineCache();

  useEffect(() => {
    setStats(cache.getStats());
  }, [cache]);

  const cacheDocument = useCallback(async (params: Parameters<typeof cache.cacheDocument>[0]) => {
    setIsLoading(true);
    try {
      const result = await cache.cacheDocument(params);
      setStats(cache.getStats());
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  const getDocument = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      return await cache.getDocument(id);
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  const removeDocument = useCallback((id: string) => {
    const result = cache.removeDocument(id);
    setStats(cache.getStats());
    return result;
  }, [cache]);

  const clearAll = useCallback(() => {
    cache.clearAll();
    setStats(cache.getStats());
  }, [cache]);

  const clearExpired = useCallback(() => {
    const count = cache.clearExpired();
    setStats(cache.getStats());
    return count;
  }, [cache]);

  return {
    stats,
    isLoading,
    cacheDocument,
    getDocument,
    removeDocument,
    clearAll,
    clearExpired,
    isDocumentCached: (id: string) => cache.isDocumentCached(id),
    isCacheValid: (id: string, version: number, checksum?: string) => 
      cache.isCacheValid(id, version, checksum),
    getCachedMetadata: () => cache.getCachedMetadata(),
  };
}

export default OfflineContentCacheService;
