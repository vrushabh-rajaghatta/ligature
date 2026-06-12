
/**
 * File Storage Types
 * v0.9.8 - Cloud storage abstraction layer types
 */

// ============================================
// Storage Provider Types
// ============================================

export type StorageProvider = 's3' | 'azure' | 'local' | 'gcs';

export type StorageTier = 'hot' | 'cool' | 'archive' | 'glacier';

export type EncryptionType = 'none' | 'sse-s3' | 'sse-kms' | 'sse-c' | 'azure-sse' | 'client-side';

export type ClassificationLevel = 'public' | 'internal' | 'confidential' | 'restricted';

// ============================================
// File Metadata
// ============================================

export interface StoredFileMetadata {
  id: string;
  key: string; // Storage path/key
  bucket: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  
  // Checksums
  md5?: string;
  sha256: string;
  etag?: string;
  
  // Storage info
  provider: StorageProvider;
  region?: string;
  tier: StorageTier;
  
  // Encryption
  encrypted: boolean;
  encryptionType: EncryptionType;
  encryptionKeyId?: string;
  
  // Versioning
  versionId?: string;
  isLatestVersion: boolean;
  previousVersionId?: string;
  
  // Timestamps
  createdAt: string;
  modifiedAt: string;
  lastAccessedAt?: string;
  
  // Compliance
  retentionUntil?: string;
  legalHold: boolean;
  classificationLevel: ClassificationLevel;
  
  // Custom metadata
  customMetadata: Record<string, string>;
  
  // Association
  entityType?: 'document' | 'submission' | 'study' | 'product' | 'tmf' | 'haq';
  entityId?: string;
  
  // Audit
  uploadedBy: string;
  uploadedByName?: string;
}

// ============================================
// Upload Types
// ============================================

export interface UploadRequest {
  file: Buffer | Uint8Array | ReadableStream;
  fileName: string;
  mimeType: string;
  bucket?: string;
  key?: string; // Custom storage path
  
  // Metadata
  customMetadata?: Record<string, string>;
  classificationLevel?: ClassificationLevel;
  
  // Options
  tier?: StorageTier;
  encryptionType?: EncryptionType;
  encryptionKeyId?: string;
  
  // Retention
  retentionDays?: number;
  legalHold?: boolean;
  
  // Association
  entityType?: 'document' | 'submission' | 'study' | 'product' | 'tmf' | 'haq';
  entityId?: string;
  
  // User context
  userId: string;
  userName?: string;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  key: string;
  bucket: string;
  versionId?: string;
  etag?: string;
  sha256: string;
  size: number;
  url?: string;
}

// ============================================
// Download Types
// ============================================

export interface DownloadRequest {
  key: string;
  bucket?: string;
  versionId?: string;
  range?: { start: number; end: number };
}

export interface DownloadResponse {
  success: boolean;
  data: Buffer | Uint8Array;
  metadata: StoredFileMetadata;
  contentType: string;
  contentLength: number;
}

// ============================================
// Delete Types
// ============================================

export interface DeleteRequest {
  key: string;
  bucket?: string;
  versionId?: string;
  permanent?: boolean; // Skip soft-delete
}

export interface DeleteResponse {
  success: boolean;
  key: string;
  versionId?: string;
  deleteMarker?: boolean;
}

// ============================================
// Copy Types
// ============================================

export interface CopyRequest {
  sourceKey: string;
  sourceBucket?: string;
  sourceVersionId?: string;
  destinationKey: string;
  destinationBucket?: string;
  metadataDirective?: 'COPY' | 'REPLACE';
  newMetadata?: Record<string, string>;
}

export interface CopyResponse {
  success: boolean;
  key: string;
  bucket: string;
  versionId?: string;
  etag?: string;
}

// ============================================
// Presigned URL Types
// ============================================

export interface PresignedUrlRequest {
  key: string;
  bucket?: string;
  versionId?: string;
  operation: 'get' | 'put';
  expiresIn?: number; // Seconds
  contentType?: string;
  contentDisposition?: string;
}

export interface PresignedUrlResponse {
  url: string;
  expiresAt: string;
  method: 'GET' | 'PUT';
  headers?: Record<string, string>;
}

// ============================================
// Multipart Upload Types
// ============================================

export interface MultipartUploadSession {
  uploadId: string;
  key: string;
  bucket: string;
  createdAt: string;
  parts: MultipartPart[];
  status: 'active' | 'completed' | 'aborted';
}

export interface MultipartPart {
  partNumber: number;
  etag: string;
  size: number;
  uploadedAt: string;
}

export interface InitiateMultipartRequest {
  key: string;
  bucket?: string;
  fileName: string;
  mimeType: string;
  customMetadata?: Record<string, string>;
  encryptionType?: EncryptionType;
  encryptionKeyId?: string;
}

export interface InitiateMultipartResponse {
  uploadId: string;
  key: string;
  bucket: string;
}

export interface UploadPartRequest {
  uploadId: string;
  key: string;
  bucket?: string;
  partNumber: number;
  data: Buffer | Uint8Array;
}

export interface UploadPartResponse {
  partNumber: number;
  etag: string;
  size: number;
}

export interface CompleteMultipartRequest {
  uploadId: string;
  key: string;
  bucket?: string;
  parts: Array<{ partNumber: number; etag: string }>;
  userId: string;
  userName?: string;
  entityType?: 'document' | 'submission' | 'study' | 'product' | 'tmf' | 'haq';
  entityId?: string;
}

export interface CompleteMultipartResponse {
  success: boolean;
  fileId: string;
  key: string;
  bucket: string;
  versionId?: string;
  etag?: string;
  sha256: string;
  size: number;
}

export interface AbortMultipartRequest {
  uploadId: string;
  key: string;
  bucket?: string;
}

// ============================================
// List Types
// ============================================

export interface ListFilesRequest {
  bucket?: string;
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
  entityType?: 'document' | 'submission' | 'study' | 'product' | 'tmf' | 'haq';
  entityId?: string;
}

export interface ListFilesResponse {
  files: StoredFileMetadata[];
  prefixes: string[]; // Common prefixes (folders)
  isTruncated: boolean;
  continuationToken?: string;
  totalCount: number;
}

// ============================================
// Integrity Types
// ============================================

export interface IntegrityCheckRequest {
  key: string;
  bucket?: string;
  versionId?: string;
  expectedSha256?: string;
}

export interface IntegrityCheckResponse {
  valid: boolean;
  key: string;
  expectedSha256?: string;
  actualSha256: string;
  checkedAt: string;
}

// ============================================
// Bucket Types
// ============================================

export interface BucketInfo {
  name: string;
  region?: string;
  createdAt: string;
  versioning: boolean;
  encryption: boolean;
  publicAccess: boolean;
}

// ============================================
// Storage Quota
// ============================================

export interface StorageQuota {
  used: number;
  limit: number;
  fileCount: number;
  fileCountLimit?: number;
}

// ============================================
// Health Check
// ============================================

export interface StorageHealthCheck {
  provider: StorageProvider;
  healthy: boolean;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

// ============================================
// Audit Event
// ============================================

export interface FileAuditEvent {
  eventType: 
    | 'uploaded'
    | 'downloaded'
    | 'deleted'
    | 'copied'
    | 'metadata_updated'
    | 'integrity_verified'
    | 'version_restored'
    | 'presigned_url_generated';
  fileId?: string;
  key: string;
  bucket: string;
  userId: string;
  timestamp: string;
  details: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
}

// ============================================
// Configuration
// ============================================

export interface StorageConfig {
  provider: StorageProvider;
  region?: string;
  endpoint?: string;
  
  // Credentials (for S3/GCS)
  accessKeyId?: string;
  secretAccessKey?: string;
  
  // Azure credentials
  accountName?: string;
  accountKey?: string;
  connectionString?: string;
  
  // Default settings
  defaultBucket: string;
  defaultTier?: StorageTier;
  defaultEncryption?: EncryptionType;
  encryptionKeyId?: string;
  
  // Features
  enableVersioning?: boolean;
  enableServerSideEncryption?: boolean;
  
  // Limits
  maxFileSize?: number;
  minMultipartPartSize?: number;
  maxMultipartPartSize?: number;
}

export const DEFAULT_STORAGE_CONFIG: Partial<StorageConfig> = {
  provider: 'local',
  defaultBucket: 'ligature-files',
  defaultTier: 'hot',
  defaultEncryption: 'none',
  enableVersioning: true,
  enableServerSideEncryption: false,
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  minMultipartPartSize: 5 * 1024 * 1024, // 5MB
  maxMultipartPartSize: 100 * 1024 * 1024, // 100MB
};
