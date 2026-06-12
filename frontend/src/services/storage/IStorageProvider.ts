
/**
 * Storage Provider Interface
 * v0.9.8 - Abstract interface for cloud storage providers
 */

import { createHash } from 'crypto';
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
} from './types';

/**
 * Storage Provider Interface
 * All storage providers must implement this interface
 */
export interface IStorageProvider {
  readonly providerType: StorageProvider;
  readonly config: StorageConfig;
  
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Core operations
  upload(request: UploadRequest): Promise<UploadResponse>;
  download(request: DownloadRequest): Promise<DownloadResponse>;
  delete(request: DeleteRequest): Promise<DeleteResponse>;
  copy(request: CopyRequest): Promise<CopyResponse>;
  
  // Metadata
  getMetadata(key: string, bucket?: string, versionId?: string): Promise<StoredFileMetadata | null>;
  updateMetadata(key: string, metadata: Partial<StoredFileMetadata>, bucket?: string): Promise<StoredFileMetadata>;
  list(request: ListFilesRequest): Promise<ListFilesResponse>;
  
  // Presigned URLs
  getPresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse>;
  
  // Multipart upload
  initiateMultipartUpload(request: InitiateMultipartRequest): Promise<InitiateMultipartResponse>;
  uploadPart(request: UploadPartRequest): Promise<UploadPartResponse>;
  completeMultipartUpload(request: CompleteMultipartRequest): Promise<CompleteMultipartResponse>;
  abortMultipartUpload(request: AbortMultipartRequest): Promise<void>;
  
  // Versioning
  listVersions(key: string, bucket?: string): Promise<StoredFileMetadata[]>;
  restoreVersion(key: string, versionId: string, bucket?: string): Promise<StoredFileMetadata>;
  
  // Integrity
  verifyIntegrity(request: IntegrityCheckRequest): Promise<IntegrityCheckResponse>;
  computeChecksum(data: Buffer | Uint8Array): string;
  
  // Bucket operations
  createBucket(name: string, region?: string): Promise<BucketInfo>;
  deleteBucket(name: string): Promise<void>;
  listBuckets(): Promise<BucketInfo[]>;
  bucketExists(name: string): Promise<boolean>;
  
  // Health & quota
  healthCheck(): Promise<StorageHealthCheck>;
  getQuota(bucket?: string): Promise<StorageQuota>;
}

/**
 * Base Storage Provider
 * Provides common utility methods for all providers
 */
export abstract class BaseStorageProvider implements IStorageProvider {
  abstract readonly providerType: StorageProvider;
  readonly config: StorageConfig;
  
  constructor(config: StorageConfig) {
    this.config = config;
  }
  
  // Default lifecycle implementations (can be overridden)
  async initialize(): Promise<void> {
    // Default no-op, override if needed
  }
  
  async shutdown(): Promise<void> {
    // Default no-op, override if needed
  }
  
  // Abstract methods that must be implemented
  abstract upload(request: UploadRequest): Promise<UploadResponse>;
  abstract download(request: DownloadRequest): Promise<DownloadResponse>;
  abstract delete(request: DeleteRequest): Promise<DeleteResponse>;
  abstract copy(request: CopyRequest): Promise<CopyResponse>;
  abstract getMetadata(key: string, bucket?: string, versionId?: string): Promise<StoredFileMetadata | null>;
  abstract updateMetadata(key: string, metadata: Partial<StoredFileMetadata>, bucket?: string): Promise<StoredFileMetadata>;
  abstract list(request: ListFilesRequest): Promise<ListFilesResponse>;
  abstract getPresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse>;
  abstract initiateMultipartUpload(request: InitiateMultipartRequest): Promise<InitiateMultipartResponse>;
  abstract uploadPart(request: UploadPartRequest): Promise<UploadPartResponse>;
  abstract completeMultipartUpload(request: CompleteMultipartRequest): Promise<CompleteMultipartResponse>;
  abstract abortMultipartUpload(request: AbortMultipartRequest): Promise<void>;
  abstract listVersions(key: string, bucket?: string): Promise<StoredFileMetadata[]>;
  abstract restoreVersion(key: string, versionId: string, bucket?: string): Promise<StoredFileMetadata>;
  abstract verifyIntegrity(request: IntegrityCheckRequest): Promise<IntegrityCheckResponse>;
  abstract createBucket(name: string, region?: string): Promise<BucketInfo>;
  abstract deleteBucket(name: string): Promise<void>;
  abstract listBuckets(): Promise<BucketInfo[]>;
  abstract bucketExists(name: string): Promise<boolean>;
  abstract healthCheck(): Promise<StorageHealthCheck>;
  abstract getQuota(bucket?: string): Promise<StorageQuota>;
  
  /**
   * Compute SHA256 checksum of data
   */
  computeChecksum(data: Buffer | Uint8Array): string {
    const buffer = data instanceof Buffer ? data : Buffer.from(data);
    return createHash('sha256').update(buffer).digest('hex');
  }
  
  /**
   * Generate unique file ID
   */
  protected generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate unique version ID
   */
  protected generateVersionId(): string {
    return `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate storage key from file name
   */
  protected generateKey(fileName: string, prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${timestamp}-${random}-${sanitized}`;
    return prefix ? `${prefix}/${key}` : key;
  }
  
  /**
   * Get bucket name, using default if not specified
   */
  protected getBucket(bucket?: string): string {
    return bucket || this.config.defaultBucket;
  }
  
  /**
   * Validate file size
   */
  protected validateFileSize(size: number): void {
    const maxSize = this.config.maxFileSize || 5 * 1024 * 1024 * 1024;
    if (size > maxSize) {
      throw new Error(`File size ${size} exceeds maximum allowed size ${maxSize}`);
    }
  }
  
  /**
   * Parse content type from file name
   */
  protected getMimeType(fileName: string, provided?: string): string {
    if (provided) return provided;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      xml: 'application/xml',
      json: 'application/json',
      zip: 'application/zip',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      html: 'text/html',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
