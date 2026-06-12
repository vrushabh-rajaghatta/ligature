
/**
 * Local Storage Provider
 * v0.9.8 - In-memory storage for development and demo
 */

import { BaseStorageProvider } from './IStorageProvider';
import {
  StorageProvider,
  StorageConfig,
  StoredFileMetadata,
  UploadRequest,
  UploadResponse,
  DownloadRequest,
  DownloadResponse,
  DeleteRequest,
  DeleteResponse,
  CopyRequest,
  CopyResponse,
  PresignedUrlRequest,
  PresignedUrlResponse,
  ListFilesRequest,
  ListFilesResponse,
  IntegrityCheckRequest,
  IntegrityCheckResponse,
  InitiateMultipartRequest,
  InitiateMultipartResponse,
  UploadPartRequest,
  UploadPartResponse,
  CompleteMultipartRequest,
  CompleteMultipartResponse,
  AbortMultipartRequest,
  BucketInfo,
  StorageQuota,
  StorageHealthCheck,
  MultipartUploadSession,
} from './types';

/**
 * Local Storage Provider
 * Uses in-memory Maps for development and demo
 */
export class LocalStorageProvider extends BaseStorageProvider {
  readonly providerType: StorageProvider = 'local';
  
  // In-memory stores
  private files: Map<string, Buffer> = new Map();
  private metadata: Map<string, StoredFileMetadata> = new Map();
  private versions: Map<string, StoredFileMetadata[]> = new Map();
  private buckets: Map<string, BucketInfo> = new Map();
  private multipartSessions: Map<string, MultipartUploadSession> = new Map();
  private multipartParts: Map<string, Map<number, Buffer>> = new Map();
  
  constructor(config: StorageConfig) {
    super(config);
    // Create default bucket
    this.buckets.set(config.defaultBucket, {
      name: config.defaultBucket,
      createdAt: new Date().toISOString(),
      versioning: config.enableVersioning ?? true,
      encryption: config.enableServerSideEncryption ?? false,
      publicAccess: false,
    });
  }
  
  /**
   * Upload a file
   */
  async upload(request: UploadRequest): Promise<UploadResponse> {
    const bucket = this.getBucket(request.bucket);
    const data = await this.toBuffer(request.file);
    
    this.validateFileSize(data.length);
    
    const key = request.key || this.generateKey(request.fileName);
    const fileId = this.generateFileId();
    const versionId = this.config.enableVersioning ? this.generateVersionId() : undefined;
    const sha256 = this.computeChecksum(data);
    const etag = `"${sha256.substring(0, 32)}"`;
    
    // Store file data
    const storageKey = this.getStorageKey(bucket, key, versionId);
    this.files.set(storageKey, data);
    
    // Create metadata
    const now = new Date().toISOString();
    const meta: StoredFileMetadata = {
      id: fileId,
      key,
      bucket,
      fileName: request.fileName,
      originalFileName: request.fileName,
      mimeType: request.mimeType || this.getMimeType(request.fileName),
      size: data.length,
      sha256,
      etag,
      provider: 'local',
      tier: request.tier || this.config.defaultTier || 'hot',
      encrypted: request.encryptionType !== 'none' && request.encryptionType !== undefined,
      encryptionType: request.encryptionType || 'none',
      encryptionKeyId: request.encryptionKeyId,
      versionId,
      isLatestVersion: true,
      createdAt: now,
      modifiedAt: now,
      legalHold: request.legalHold || false,
      classificationLevel: request.classificationLevel || 'internal',
      customMetadata: request.customMetadata || {},
      entityType: request.entityType,
      entityId: request.entityId,
      uploadedBy: request.userId,
      uploadedByName: request.userName,
      retentionUntil: request.retentionDays
        ? new Date(Date.now() + request.retentionDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    };
    
    // Store metadata
    const metaKey = this.getMetadataKey(bucket, key);
    this.metadata.set(metaKey, meta);
    
    // Store version if versioning enabled
    if (this.config.enableVersioning && versionId) {
      const versionsKey = `versions:${bucket}:${key}`;
      const existingVersions = this.versions.get(versionsKey) || [];
      
      // Mark old versions as not latest
      existingVersions.forEach(v => {
        v.isLatestVersion = false;
      });
      
      existingVersions.push(meta);
      this.versions.set(versionsKey, existingVersions);
    }
    
    return {
      success: true,
      fileId,
      key,
      bucket,
      versionId,
      etag,
      sha256,
      size: data.length,
    };
  }
  
  /**
   * Download a file
   */
  async download(request: DownloadRequest): Promise<DownloadResponse> {
    const bucket = this.getBucket(request.bucket);
    const storageKey = this.getStorageKey(bucket, request.key, request.versionId);
    
    const data = this.files.get(storageKey);
    if (!data) {
      throw new Error(`File not found: ${request.key}`);
    }
    
    const metaKey = this.getMetadataKey(bucket, request.key);
    const meta = this.metadata.get(metaKey);
    if (!meta) {
      throw new Error(`Metadata not found: ${request.key}`);
    }
    
    // Handle range request
    let responseData = data;
    if (request.range) {
      responseData = data.subarray(request.range.start, request.range.end + 1);
    }
    
    // Update last accessed
    meta.lastAccessedAt = new Date().toISOString();
    this.metadata.set(metaKey, meta);
    
    return {
      success: true,
      data: responseData,
      metadata: meta,
      contentType: meta.mimeType,
      contentLength: responseData.length,
    };
  }
  
  /**
   * Delete a file
   */
  async delete(request: DeleteRequest): Promise<DeleteResponse> {
    const bucket = this.getBucket(request.bucket);
    const metaKey = this.getMetadataKey(bucket, request.key);
    const meta = this.metadata.get(metaKey);
    
    if (!meta) {
      throw new Error(`File not found: ${request.key}`);
    }
    
    // Check legal hold
    if (meta.legalHold) {
      throw new Error(`Cannot delete file under legal hold: ${request.key}`);
    }
    
    // Check retention
    if (meta.retentionUntil && new Date(meta.retentionUntil) > new Date()) {
      throw new Error(`Cannot delete file under retention until ${meta.retentionUntil}`);
    }
    
    const storageKey = this.getStorageKey(bucket, request.key, request.versionId);
    
    if (this.config.enableVersioning && !request.permanent) {
      // Soft delete - create delete marker
      const deleteMarkerId = this.generateVersionId();
      return {
        success: true,
        key: request.key,
        versionId: deleteMarkerId,
        deleteMarker: true,
      };
    }
    
    // Hard delete
    this.files.delete(storageKey);
    this.metadata.delete(metaKey);
    
    // Remove from versions
    const versionsKey = `versions:${bucket}:${request.key}`;
    this.versions.delete(versionsKey);
    
    return {
      success: true,
      key: request.key,
      versionId: request.versionId,
    };
  }
  
  /**
   * Copy a file
   */
  async copy(request: CopyRequest): Promise<CopyResponse> {
    const sourceBucket = this.getBucket(request.sourceBucket);
    const destBucket = this.getBucket(request.destinationBucket);
    
    const sourceStorageKey = this.getStorageKey(sourceBucket, request.sourceKey, request.sourceVersionId);
    const sourceMetaKey = this.getMetadataKey(sourceBucket, request.sourceKey);
    
    const sourceData = this.files.get(sourceStorageKey);
    const sourceMeta = this.metadata.get(sourceMetaKey);
    
    if (!sourceData || !sourceMeta) {
      throw new Error(`Source file not found: ${request.sourceKey}`);
    }
    
    const versionId = this.config.enableVersioning ? this.generateVersionId() : undefined;
    const destStorageKey = this.getStorageKey(destBucket, request.destinationKey, versionId);
    const destMetaKey = this.getMetadataKey(destBucket, request.destinationKey);
    
    // Copy data
    this.files.set(destStorageKey, Buffer.from(sourceData));
    
    // Copy or replace metadata
    const now = new Date().toISOString();
    const newMeta: StoredFileMetadata = {
      ...sourceMeta,
      id: this.generateFileId(),
      key: request.destinationKey,
      bucket: destBucket,
      versionId,
      isLatestVersion: true,
      createdAt: now,
      modifiedAt: now,
      customMetadata: request.metadataDirective === 'REPLACE' && request.newMetadata
        ? request.newMetadata
        : sourceMeta.customMetadata,
    };
    
    this.metadata.set(destMetaKey, newMeta);
    
    return {
      success: true,
      key: request.destinationKey,
      bucket: destBucket,
      versionId,
      etag: newMeta.etag,
    };
  }
  
  /**
   * Get file metadata
   */
  async getMetadata(key: string, bucket?: string, _versionId?: string): Promise<StoredFileMetadata | null> {
    const b = this.getBucket(bucket);
    const metaKey = this.getMetadataKey(b, key);
    return this.metadata.get(metaKey) || null;
  }
  
  /**
   * Update file metadata
   */
  async updateMetadata(key: string, updates: Partial<StoredFileMetadata>, bucket?: string): Promise<StoredFileMetadata> {
    const b = this.getBucket(bucket);
    const metaKey = this.getMetadataKey(b, key);
    const existing = this.metadata.get(metaKey);
    
    if (!existing) {
      throw new Error(`File not found: ${key}`);
    }
    
    const updated: StoredFileMetadata = {
      ...existing,
      ...updates,
      modifiedAt: new Date().toISOString(),
    };
    
    this.metadata.set(metaKey, updated);
    return updated;
  }
  
  /**
   * List files
   */
  async list(request: ListFilesRequest): Promise<ListFilesResponse> {
    const bucket = this.getBucket(request.bucket);
    const prefix = request.prefix || '';
    const maxKeys = request.maxKeys || 1000;
    
    let files: StoredFileMetadata[] = [];
    const prefixes = new Set<string>();
    
    for (const [metaKey, meta] of Array.from(Array.from(this.metadata.entries()))) {
      if (!metaKey.startsWith(`meta:${bucket}:`)) continue;
      if (prefix && !meta.key.startsWith(prefix)) continue;
      
      // Filter by entity
      if (request.entityType && meta.entityType !== request.entityType) continue;
      if (request.entityId && meta.entityId !== request.entityId) continue;
      
      // Handle delimiter (folder simulation)
      if (request.delimiter) {
        const keyWithoutPrefix = meta.key.substring(prefix.length);
        const delimiterIndex = keyWithoutPrefix.indexOf(request.delimiter);
        if (delimiterIndex !== -1) {
          prefixes.add(prefix + keyWithoutPrefix.substring(0, delimiterIndex + 1));
          continue;
        }
      }
      
      files.push(meta);
    }
    
    // Sort by creation date descending
    files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    const startIndex = request.continuationToken ? parseInt(request.continuationToken, 10) : 0;
    const totalCount = files.length;
    files = files.slice(startIndex, startIndex + maxKeys);
    
    const isTruncated = startIndex + files.length < totalCount;
    
    return {
      files,
      prefixes: Array.from(prefixes),
      isTruncated,
      continuationToken: isTruncated ? String(startIndex + maxKeys) : undefined,
      totalCount,
    };
  }
  
  /**
   * Generate presigned URL
   */
  async getPresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    const bucket = this.getBucket(request.bucket);
    const expiresIn = request.expiresIn || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    
    // For local provider, generate a mock presigned URL
    const signature = this.computeChecksum(Buffer.from(`${bucket}:${request.key}:${expiresAt}`)).substring(0, 16);
    const url = `local://${bucket}/${request.key}?signature=${signature}&expires=${expiresAt}`;
    
    return {
      url,
      expiresAt,
      method: request.operation === 'get' ? 'GET' : 'PUT',
      headers: request.contentType ? { 'Content-Type': request.contentType } : undefined,
    };
  }
  
  /**
   * Initiate multipart upload
   */
  async initiateMultipartUpload(request: InitiateMultipartRequest): Promise<InitiateMultipartResponse> {
    const bucket = this.getBucket(request.bucket);
    const uploadId = `mpu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: MultipartUploadSession = {
      uploadId,
      key: request.key,
      bucket,
      createdAt: new Date().toISOString(),
      parts: [],
      status: 'active',
    };
    
    this.multipartSessions.set(uploadId, session);
    this.multipartParts.set(uploadId, new Map());
    
    return {
      uploadId,
      key: request.key,
      bucket,
    };
  }
  
  /**
   * Upload part
   */
  async uploadPart(request: UploadPartRequest): Promise<UploadPartResponse> {
    const session = this.multipartSessions.get(request.uploadId);
    if (!session || session.status !== 'active') {
      throw new Error(`Multipart upload not found or not active: ${request.uploadId}`);
    }
    
    const data = request.data instanceof Buffer ? request.data : Buffer.from(request.data);
    const etag = `"${this.computeChecksum(data).substring(0, 32)}"`;
    
    const parts = this.multipartParts.get(request.uploadId)!;
    parts.set(request.partNumber, data);
    
    session.parts.push({
      partNumber: request.partNumber,
      etag,
      size: data.length,
      uploadedAt: new Date().toISOString(),
    });
    
    return {
      partNumber: request.partNumber,
      etag,
      size: data.length,
    };
  }
  
  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(request: CompleteMultipartRequest): Promise<CompleteMultipartResponse> {
    const session = this.multipartSessions.get(request.uploadId);
    if (!session || session.status !== 'active') {
      throw new Error(`Multipart upload not found or not active: ${request.uploadId}`);
    }
    
    const parts = this.multipartParts.get(request.uploadId)!;
    
    // Verify all parts are present
    const sortedPartNumbers = request.parts.map(p => p.partNumber).sort((a, b) => a - b);
    for (let i = 0; i < sortedPartNumbers.length; i++) {
      if (!parts.has(sortedPartNumbers[i])) {
        throw new Error(`Missing part: ${sortedPartNumbers[i]}`);
      }
    }
    
    // Assemble file
    const buffers: Buffer[] = [];
    for (const partNum of sortedPartNumbers) {
      buffers.push(parts.get(partNum)!);
    }
    const data = Buffer.concat(buffers);
    
    // Upload assembled file
    const bucket = this.getBucket(request.bucket);
    const fileId = this.generateFileId();
    const versionId = this.config.enableVersioning ? this.generateVersionId() : undefined;
    const sha256 = this.computeChecksum(data);
    const etag = `"${sha256.substring(0, 32)}"`;
    
    const storageKey = this.getStorageKey(bucket, request.key, versionId);
    this.files.set(storageKey, data);
    
    const now = new Date().toISOString();
    const meta: StoredFileMetadata = {
      id: fileId,
      key: request.key,
      bucket,
      fileName: request.key.split('/').pop() || request.key,
      originalFileName: request.key.split('/').pop() || request.key,
      mimeType: 'application/octet-stream',
      size: data.length,
      sha256,
      etag,
      provider: 'local',
      tier: 'hot',
      encrypted: false,
      encryptionType: 'none',
      versionId,
      isLatestVersion: true,
      createdAt: now,
      modifiedAt: now,
      legalHold: false,
      classificationLevel: 'internal',
      customMetadata: {},
      entityType: request.entityType,
      entityId: request.entityId,
      uploadedBy: request.userId,
      uploadedByName: request.userName,
    };
    
    const metaKey = this.getMetadataKey(bucket, request.key);
    this.metadata.set(metaKey, meta);
    
    // Cleanup session
    session.status = 'completed';
    this.multipartParts.delete(request.uploadId);
    
    return {
      success: true,
      fileId,
      key: request.key,
      bucket,
      versionId,
      etag,
      sha256,
      size: data.length,
    };
  }
  
  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(request: AbortMultipartRequest): Promise<void> {
    const session = this.multipartSessions.get(request.uploadId);
    if (session) {
      session.status = 'aborted';
    }
    this.multipartParts.delete(request.uploadId);
  }
  
  /**
   * List versions
   */
  async listVersions(key: string, bucket?: string): Promise<StoredFileMetadata[]> {
    const b = this.getBucket(bucket);
    const versionsKey = `versions:${b}:${key}`;
    return this.versions.get(versionsKey) || [];
  }
  
  /**
   * Restore version
   */
  async restoreVersion(key: string, versionId: string, bucket?: string): Promise<StoredFileMetadata> {
    const b = this.getBucket(bucket);
    const versionsKey = `versions:${b}:${key}`;
    const versions = this.versions.get(versionsKey);
    
    if (!versions) {
      throw new Error(`No versions found for: ${key}`);
    }
    
    const versionToRestore = versions.find(v => v.versionId === versionId);
    if (!versionToRestore) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    // Get version data
    const sourceStorageKey = this.getStorageKey(b, key, versionId);
    const data = this.files.get(sourceStorageKey);
    if (!data) {
      throw new Error(`Version data not found: ${versionId}`);
    }
    
    // Create new version from old data
    const newVersionId = this.generateVersionId();
    const newStorageKey = this.getStorageKey(b, key, newVersionId);
    this.files.set(newStorageKey, Buffer.from(data));
    
    // Update metadata
    const now = new Date().toISOString();
    const newMeta: StoredFileMetadata = {
      ...versionToRestore,
      versionId: newVersionId,
      previousVersionId: versionId,
      isLatestVersion: true,
      modifiedAt: now,
    };
    
    // Mark all other versions as not latest
    versions.forEach(v => {
      v.isLatestVersion = false;
    });
    versions.push(newMeta);
    
    const metaKey = this.getMetadataKey(b, key);
    this.metadata.set(metaKey, newMeta);
    
    return newMeta;
  }
  
  /**
   * Verify file integrity
   */
  async verifyIntegrity(request: IntegrityCheckRequest): Promise<IntegrityCheckResponse> {
    const bucket = this.getBucket(request.bucket);
    const storageKey = this.getStorageKey(bucket, request.key, request.versionId);
    
    const data = this.files.get(storageKey);
    if (!data) {
      throw new Error(`File not found: ${request.key}`);
    }
    
    const actualSha256 = this.computeChecksum(data);
    const valid = !request.expectedSha256 || actualSha256 === request.expectedSha256;
    
    return {
      valid,
      key: request.key,
      expectedSha256: request.expectedSha256,
      actualSha256,
      checkedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Create bucket
   */
  async createBucket(name: string, region?: string): Promise<BucketInfo> {
    if (this.buckets.has(name)) {
      throw new Error(`Bucket already exists: ${name}`);
    }
    
    const bucket: BucketInfo = {
      name,
      region,
      createdAt: new Date().toISOString(),
      versioning: this.config.enableVersioning ?? false,
      encryption: this.config.enableServerSideEncryption ?? false,
      publicAccess: false,
    };
    
    this.buckets.set(name, bucket);
    return bucket;
  }
  
  /**
   * Delete bucket
   */
  async deleteBucket(name: string): Promise<void> {
    // Check if bucket is empty
    for (const metaKey of Array.from(Array.from(this.metadata.keys()))) {
      if (metaKey.startsWith(`meta:${name}:`)) {
        throw new Error(`Bucket not empty: ${name}`);
      }
    }
    
    this.buckets.delete(name);
  }
  
  /**
   * List buckets
   */
  async listBuckets(): Promise<BucketInfo[]> {
    return Array.from(this.buckets.values());
  }
  
  /**
   * Check if bucket exists
   */
  async bucketExists(name: string): Promise<boolean> {
    return this.buckets.has(name);
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<StorageHealthCheck> {
    return {
      provider: 'local',
      healthy: true,
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
    };
  }
  
  /**
   * Get storage quota
   */
  async getQuota(bucket?: string): Promise<StorageQuota> {
    const b = bucket ? bucket : undefined;
    let used = 0;
    let fileCount = 0;
    
    for (const [metaKey, meta] of Array.from(Array.from(this.metadata.entries()))) {
      if (b && !metaKey.startsWith(`meta:${b}:`)) continue;
      used += meta.size;
      fileCount++;
    }
    
    return {
      used,
      limit: 10 * 1024 * 1024 * 1024, // 10GB default
      fileCount,
    };
  }
  
  // ============================================
  // Helper methods
  // ============================================
  
  private getStorageKey(bucket: string, key: string, versionId?: string): string {
    return versionId ? `${bucket}:${key}:${versionId}` : `${bucket}:${key}`;
  }
  
  private getMetadataKey(bucket: string, key: string): string {
    return `meta:${bucket}:${key}`;
  }
  
  private async toBuffer(input: Buffer | Uint8Array | ReadableStream): Promise<Buffer> {
    if (input instanceof Buffer) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    
    // Handle ReadableStream
    const chunks: Uint8Array[] = [];
    const reader = input.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  
  // ============================================
  // Test helpers
  // ============================================
  
  /**
   * Get file count (for testing)
   */
  getFileCount(): number {
    return this.metadata.size;
  }
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.files.clear();
    this.metadata.clear();
    this.versions.clear();
    this.multipartSessions.clear();
    this.multipartParts.clear();
    // Keep default bucket
    this.buckets.clear();
    this.buckets.set(this.config.defaultBucket, {
      name: this.config.defaultBucket,
      createdAt: new Date().toISOString(),
      versioning: this.config.enableVersioning ?? true,
      encryption: this.config.enableServerSideEncryption ?? false,
      publicAccess: false,
    });
  }
}
