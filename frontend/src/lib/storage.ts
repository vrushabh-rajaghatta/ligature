
/**
 * Cloud Storage Service (Cloudflare R2)
 * 
 * R2 is S3-compatible, so we use the AWS SDK.
 * Provides upload, download, delete, and signed URL generation.
 * 
 * @version 0.13.5
 * @bite 1.2b - Cloud storage integration
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string; // Optional custom domain for public access
}

function getStorageConfig(): StorageConfig {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'Missing R2 configuration. Required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
    );
  }
  
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

// =============================================================================
// S3 CLIENT (Singleton)
// =============================================================================

let s3Client: S3Client | null = null;
let storageConfig: StorageConfig | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getStorageConfig();
    storageConfig = config;
    
    s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto'
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

function getBucketName(): string {
  if (!storageConfig) {
    storageConfig = getStorageConfig();
  }
  return storageConfig.bucketName;
}

// =============================================================================
// STORAGE OPERATIONS
// =============================================================================

export interface UploadOptions {
  /** Storage path/key (e.g., "tmf/pdf/2026/01/file_xyz_doc.pdf") */
  key: string;
  /** File content as Buffer */
  body: Buffer;
  /** MIME type */
  contentType: string;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

export interface UploadResponse {
  success: boolean;
  key: string;
  url: string;
  etag?: string;
}

export interface DownloadResponse {
  success: boolean;
  body: Buffer;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

/**
 * Upload a file to R2
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResponse> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    Metadata: options.metadata,
  });
  
  const response = await client.send(command);
  
  // Build URL (use custom domain if configured, otherwise R2 endpoint)
  const config = getStorageConfig();
  const url = config.publicUrl
    ? `${config.publicUrl}/${options.key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${bucket}/${options.key}`;
  
  return {
    success: true,
    key: options.key,
    url,
    etag: response.ETag,
  };
}

/**
 * Download a file from R2
 */
export async function downloadFile(key: string): Promise<DownloadResponse> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const response = await client.send(command);
  
  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  
  return {
    success: true,
    body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || body.length,
    metadata: response.Metadata,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<{ success: boolean }> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  await client.send(command);
  
  return { success: true };
}

/**
 * Check if a file exists in R2
 */
export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error) {
    // NotFound error means file doesn't exist
    if ((error as { name?: string }).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a signed URL for temporary access
 * Useful for secure downloads without exposing bucket publicly
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a signed URL for direct upload (client-side upload)
 * Useful for large files to bypass server
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

// =============================================================================
// STORAGE STATUS CHECK
// =============================================================================

export interface StorageStatus {
  configured: boolean;
  provider: 'r2';
  bucket?: string;
  error?: string;
}

/**
 * Check if storage is properly configured
 * Useful for health checks and graceful degradation
 */
export function getStorageStatus(): StorageStatus {
  try {
    const config = getStorageConfig();
    return {
      configured: true,
      provider: 'r2',
      bucket: config.bucketName,
    };
  } catch (error) {
    return {
      configured: false,
      provider: 'r2',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test storage connection by attempting a HEAD request on the bucket
 */
export async function testStorageConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucketName();
    
    // Try to check if a test key exists (will fail with access error if creds are wrong)
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: '__connection_test__',
    });
    
    try {
      await client.send(command);
    } catch (error) {
      // NotFound is expected and means connection works
      if ((error as { name?: string }).name === 'NotFound') {
        return { success: true };
      }
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
