
/**
 * Upload to Document Service
 * 
 * Converts upload results into Document Control records with:
 * - Automatic metadata extraction from filename and MIME type
 * - Context-based categorization (TMF, eCTD, Safety, etc.)
 * - Support for creating new versions of existing documents
 * - Integration with Document Control store
 * 
 * @version 0.13.42
 */

import type { 
  EnterpriseDocument, DocumentCategory, DocumentClassification, 
  FileFormat, ContentType, RetentionCategory 
} from '@/domains/document-control/contracts';
import type { UploadResult, UploadContext } from '@/components/documents/DocumentUploadPanel';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentFromUploadOptions {
  /** Upload result from the upload API */
  uploadResult: UploadResult;
  /** Upload context for categorization */
  context: UploadContext;
  /** If true, create as new version of linked document */
  createAsNewVersion?: boolean;
  /** Document ID to link as new version */
  linkedDocumentId?: string;
  /** Override document title (defaults to filename) */
  title?: string;
  /** Override document description */
  description?: string;
  /** Override document category */
  category?: DocumentCategory;
  /** Additional tags */
  tags?: string[];
  /** Owner information */
  owner?: {
    id: string;
    name: string;
    department: string;
  };
}

export interface DocumentFromUploadResult {
  success: boolean;
  document?: Partial<EnterpriseDocument>;
  versionInfo?: {
    isNewVersion: boolean;
    previousDocumentId?: string;
    previousVersion?: string;
  };
  error?: string;
}

export interface ExtractedMetadata {
  title: string;
  category: DocumentCategory;
  classification: DocumentClassification;
  contentType: ContentType;
  fileFormat: FileFormat;
  tags: string[];
  keywords: string[];
  retentionCategory: RetentionCategory;
  retentionPeriodYears: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Map MIME types to file formats */
const MIME_TO_FORMAT: Record<string, FileFormat> = {
  'application/pdf': 'pdf',
  'application/msword': 'docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'txt',
  'text/xml': 'xml',
  'application/xml': 'xml',
  'application/json': 'json',
  'text/html': 'html',
  'text/markdown': 'md',
  'application/rtf': 'rtf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/** Context-based category mapping */
const CONTEXT_TO_CATEGORY: Record<UploadContext, DocumentCategory> = {
  tmf: 'clinical',
  ectd: 'regulatory',
  safety: 'safety',
  authoring: 'regulatory',
  qms: 'quality',
  general: 'administrative',
};

/** Context-based retention settings */
const CONTEXT_RETENTION: Record<UploadContext, { category: RetentionCategory; years: number }> = {
  tmf: { category: 'clinical-trial', years: 25 },
  ectd: { category: 'regulatory-submission', years: 15 },
  safety: { category: 'safety-report', years: 15 },
  authoring: { category: 'regulatory-submission', years: 15 },
  qms: { category: 'quality-record', years: 15 },
  general: { category: 'business-record', years: 7 },
};

/** Document type patterns for auto-categorization */
const DOCUMENT_TYPE_PATTERNS: Array<{ pattern: RegExp; category: DocumentCategory; tags: string[] }> = [
  { pattern: /protocol/i, category: 'clinical', tags: ['protocol', 'study-design'] },
  { pattern: /icf|consent/i, category: 'clinical', tags: ['icf', 'consent-form', 'ethics'] },
  { pattern: /csr|clinical.?study.?report/i, category: 'clinical', tags: ['csr', 'clinical-study-report'] },
  { pattern: /ib|investigator.?brochure/i, category: 'clinical', tags: ['ib', 'investigator-brochure'] },
  { pattern: /sae|adverse.?event/i, category: 'safety', tags: ['sae', 'adverse-event'] },
  { pattern: /cioms|narrative/i, category: 'safety', tags: ['cioms', 'narrative'] },
  { pattern: /psur|pbrer/i, category: 'safety', tags: ['psur', 'periodic-report'] },
  { pattern: /dsur/i, category: 'safety', tags: ['dsur', 'annual-report'] },
  { pattern: /sop|procedure/i, category: 'quality', tags: ['sop', 'procedure'] },
  { pattern: /cmc|manufacturing/i, category: 'manufacturing', tags: ['cmc', 'manufacturing'] },
  { pattern: /stability/i, category: 'manufacturing', tags: ['stability', 'cmc'] },
  { pattern: /specification/i, category: 'manufacturing', tags: ['specification', 'cmc'] },
  { pattern: /batch.?record/i, category: 'manufacturing', tags: ['batch-record', 'manufacturing'] },
  { pattern: /label|package.?insert|pi/i, category: 'labeling', tags: ['labeling', 'pi'] },
  { pattern: /nonclinical|tox|pharm/i, category: 'nonclinical', tags: ['nonclinical'] },
  { pattern: /submission|dossier|nda|bla|ind|maa/i, category: 'regulatory', tags: ['submission'] },
  { pattern: /correspondence|letter|email/i, category: 'correspondence', tags: ['correspondence'] },
  { pattern: /haq|deficiency|question/i, category: 'correspondence', tags: ['haq', 'correspondence'] },
  { pattern: /template/i, category: 'template', tags: ['template'] },
  { pattern: /training/i, category: 'training', tags: ['training'] },
  { pattern: /reference/i, category: 'reference', tags: ['reference'] },
];

/** Region patterns for extraction */
const REGION_PATTERNS: Array<{ pattern: RegExp; region: string }> = [
  { pattern: /\b(us|usa|fda)\b/i, region: 'US' },
  { pattern: /\b(eu|ema|europe)\b/i, region: 'EU' },
  { pattern: /\b(jp|japan|pmda)\b/i, region: 'Japan' },
  { pattern: /\b(cn|china|nmpa)\b/i, region: 'China' },
  { pattern: /\b(uk|mhra)\b/i, region: 'UK' },
  { pattern: /\b(ca|canada|health.?canada)\b/i, region: 'Canada' },
];

// =============================================================================
// METADATA EXTRACTION
// =============================================================================

/**
 * Extract metadata from filename and upload context
 */
export function extractMetadataFromUpload(
  fileName: string,
  mimeType: string,
  context: UploadContext
): ExtractedMetadata {
  // Clean filename for analysis (remove extension, path, special chars)
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ')    // Replace separators with spaces
    .trim();
  
  // Determine file format from MIME type
  const fileFormat: FileFormat = MIME_TO_FORMAT[mimeType] || 'pdf';
  
  // Start with context-based defaults
  let category: DocumentCategory = CONTEXT_TO_CATEGORY[context];
  const tags: string[] = [];
  const keywords: string[] = [];
  
  // Extract keywords from filename
  const words = cleanName.split(/\s+/).filter(w => w.length > 2);
  keywords.push(...words.slice(0, 10)); // Limit to 10 keywords
  
  // Check document type patterns
  for (const { pattern, category: patternCategory, tags: patternTags } of Array.from(DOCUMENT_TYPE_PATTERNS)) {
    if (pattern.test(cleanName) || pattern.test(fileName)) {
      category = patternCategory;
      tags.push(...patternTags);
      break; // Use first match
    }
  }
  
  // Check for region mentions
  for (const { pattern, region } of Array.from(REGION_PATTERNS)) {
    if (pattern.test(cleanName) || pattern.test(fileName)) {
      tags.push(`region:${region.toLowerCase()}`);
      break;
    }
  }
  
  // Add context-specific tag
  if (context !== 'general') {
    tags.push(`context:${context}`);
  }
  
  // Determine classification based on category and context
  // Category-based classification takes precedence
  let classification: DocumentClassification = 'controlled';
  if (category === 'template') {
    classification = 'template';
  } else if (category === 'reference') {
    classification = 'reference';
  } else if (context === 'general') {
    classification = 'working';
  }
  
  // Determine content type
  let contentType: ContentType = 'document';
  if (category === 'template') {
    contentType = 'template';
  }
  
  // Get retention settings from context
  const retention = CONTEXT_RETENTION[context];
  
  // Generate title from filename
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return {
    title,
    category,
    classification,
    contentType,
    fileFormat,
    tags: Array.from(new Set(tags)), // Dedupe tags
    keywords: Array.from(new Set(keywords)), // Dedupe keywords
    retentionCategory: retention.category,
    retentionPeriodYears: retention.years,
  };
}

/**
 * Generate a document ID with optional sequence
 */
// Counter for unique ID generation within same millisecond
let documentIdCounter = 0;
let lastDocumentIdTimestamp = 0;

export function generateDocumentId(sequence?: number): string {
  const year = new Date().getFullYear();
  if (sequence !== undefined) {
    return `DOC-${year}-${String(sequence).padStart(5, '0')}`;
  }
  // Combine timestamp, counter, and random for guaranteed uniqueness
  const now = Date.now();
  if (now === lastDocumentIdTimestamp) {
    documentIdCounter++;
  } else {
    documentIdCounter = 0;
    lastDocumentIdTimestamp = now;
  }
  // Use last 3 digits of timestamp + counter + random
  const timePart = now % 1000;
  const counterPart = documentIdCounter % 100;
  const combined = timePart * 100 + counterPart;
  return `DOC-${year}-${String(combined).padStart(5, '0')}`;
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

/**
 * Create document data from upload result
 * 
 * This function prepares document data for creation in the Document Control store.
 * It does NOT directly mutate the store - the caller should use the returned data
 * to call the appropriate store action.
 */
export function createDocumentFromUpload(
  options: DocumentFromUploadOptions
): DocumentFromUploadResult {
  try {
    const { 
      uploadResult, 
      context, 
      createAsNewVersion = false,
      linkedDocumentId,
      title: overrideTitle,
      description: overrideDescription,
      category: overrideCategory,
      tags: additionalTags = [],
      owner,
    } = options;
    
    // Validate upload result
    if (!uploadResult.success) {
      return {
        success: false,
        error: 'Upload was not successful',
      };
    }
    
    // Extract metadata from upload
    const metadata = extractMetadataFromUpload(
      uploadResult.fileName,
      uploadResult.mimeType,
      context
    );
    
    // Merge with overrides
    const finalTitle = overrideTitle || metadata.title;
    const finalCategory = overrideCategory || metadata.category;
    const finalTags = [...metadata.tags, ...additionalTags];
    
    // Build document data
    const now = new Date().toISOString();
    const documentData: Partial<EnterpriseDocument> = {
      // Will be set by store: id, documentId
      title: finalTitle,
      description: overrideDescription || `Uploaded from ${uploadResult.fileName}`,
      category: finalCategory,
      classification: metadata.classification,
      contentType: metadata.contentType,
      
      // Version info (store will manage actual versioning)
      version: '1.0.0',
      majorVersion: 1,
      minorVersion: 0,
      patchVersion: 0,
      versionHistory: [],
      
      // Status
      status: 'draft',
      
      // Owner info
      ownerId: owner?.id || 'system',
      ownerName: owner?.name || 'System',
      ownerDepartment: owner?.department || getDefaultDepartment(finalCategory),
      authorId: owner?.id || 'system',
      authorName: owner?.name || 'System',
      collaborators: [],
      
      // File info from upload result
      fileFormat: metadata.fileFormat,
      filePath: uploadResult.filePath,
      fileSize: uploadResult.fileSize,
      fileChecksum: uploadResult.checksum,
      contentHash: uploadResult.checksum,
      
      // Organization
      folders: [getDefaultFolder(context, finalCategory)],
      tags: finalTags,
      keywords: metadata.keywords,
      language: 'en',
      
      // Relationships
      relatedDocumentIds: [],
      linkedModules: [],
      attachments: [],
      
      // Metadata
      customMetadata: {
        uploadContext: context,
        uploadedFrom: 'document-upload-panel',
        originalFileName: uploadResult.fileName,
        storageProvider: uploadResult.storageProvider,
        ...(uploadResult.cloudUrl && { cloudUrl: uploadResult.cloudUrl }),
      },
      securityClassification: 'internal',
      accessControlList: [],
      
      // Archive & Retention
      archiveStatus: 'active',
      retentionCategory: metadata.retentionCategory,
      retentionPeriodYears: metadata.retentionPeriodYears,
      legalHoldIds: [],
      
      // Audit
      createdAt: now,
      createdBy: owner?.id || 'system',
      updatedAt: now,
      lastModifiedBy: owner?.id || 'system',
    };
    
    // Handle version linking
    const versionInfo = {
      isNewVersion: createAsNewVersion && !!linkedDocumentId,
      previousDocumentId: createAsNewVersion ? linkedDocumentId : undefined,
    };
    
    if (versionInfo.isNewVersion && linkedDocumentId) {
      documentData.parentDocumentId = linkedDocumentId;
      documentData.customMetadata = {
        ...documentData.customMetadata,
        isVersionOf: linkedDocumentId,
      };
    }
    
    return {
      success: true,
      document: documentData,
      versionInfo,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating document',
    };
  }
}

/**
 * Create multiple documents from batch upload results
 */
export function createDocumentsFromBatchUpload(
  uploadResults: UploadResult[],
  context: UploadContext,
  owner?: { id: string; name: string; department: string }
): DocumentFromUploadResult[] {
  return uploadResults
    .filter(result => result.success)
    .map(uploadResult => createDocumentFromUpload({
      uploadResult,
      context,
      owner,
    }));
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get default department based on document category
 */
function getDefaultDepartment(category: DocumentCategory): string {
  const departmentMap: Record<DocumentCategory, string> = {
    regulatory: 'regulatory-affairs',
    clinical: 'clinical-operations',
    safety: 'pharmacovigilance',
    quality: 'quality-assurance',
    manufacturing: 'manufacturing',
    nonclinical: 'preclinical',
    cmc: 'cmc-operations',
    labeling: 'regulatory-affairs',
    correspondence: 'regulatory-affairs',
    administrative: 'administration',
    training: 'training',
    reference: 'regulatory-affairs',
    template: 'regulatory-affairs',
    archive: 'records-management',
  };
  return departmentMap[category] || 'regulatory-affairs';
}

/**
 * Get default folder path based on context and category
 */
function getDefaultFolder(context: UploadContext, category: DocumentCategory): string {
  const contextFolders: Record<UploadContext, string> = {
    tmf: '/Trial Master File',
    ectd: '/Submissions/eCTD',
    safety: '/Safety/Reports',
    authoring: '/Documents/Drafts',
    qms: '/Quality/Documents',
    general: '/General',
  };
  
  const categoryFolders: Record<DocumentCategory, string> = {
    regulatory: '/Regulatory',
    clinical: '/Clinical',
    safety: '/Safety',
    quality: '/Quality',
    manufacturing: '/Manufacturing',
    nonclinical: '/Nonclinical',
    cmc: '/CMC',
    labeling: '/Labeling',
    correspondence: '/Correspondence',
    administrative: '/Administrative',
    training: '/Training',
    reference: '/Reference',
    template: '/Templates',
    archive: '/Archive',
  };
  
  return `${contextFolders[context]}${categoryFolders[category]}`;
}

/**
 * Validate that an upload result can be converted to a document
 */
export function validateUploadForDocument(uploadResult: UploadResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!uploadResult.success) {
    errors.push('Upload was not successful');
  }
  
  if (!uploadResult.fileId) {
    errors.push('Missing file ID');
  }
  
  if (!uploadResult.fileName) {
    errors.push('Missing file name');
  }
  
  if (!uploadResult.filePath) {
    errors.push('Missing file path');
  }
  
  if (!uploadResult.checksum) {
    errors.push('Missing file checksum');
  }
  
  if (uploadResult.fileSize <= 0) {
    errors.push('Invalid file size');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  createDocumentFromUpload,
  createDocumentsFromBatchUpload,
  extractMetadataFromUpload,
  generateDocumentId,
  validateUploadForDocument,
};
