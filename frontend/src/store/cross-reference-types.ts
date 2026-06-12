
// =============================================================================
// CROSS-REFERENCE VALIDATION TYPES - v0.9.17d
// =============================================================================
// Types for document cross-reference integrity validation within eCTD submissions
// Supports hyperlink validation, broken reference detection, and auto-fix suggestions
// =============================================================================

/**
 * Represents a cross-reference link within a document
 */
export interface CrossReference {
  id: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sourceFilePath: string;
  sourceModule: string;
  sourceSection?: string;
  
  // Target information
  targetType: CrossReferenceTargetType;
  targetPath: string;              // File path or URL
  targetDocumentId?: string;       // If referencing another document
  targetDocumentTitle?: string;
  targetModule?: string;
  targetSection?: string;
  targetAnchor?: string;           // e.g., #section-2.1
  
  // Link metadata
  linkText: string;                // Display text of the link
  linkLocation: LinkLocation;      // Where in the source doc
  linkType: LinkType;
  
  // Validation status
  status: CrossReferenceStatus;
  validatedAt?: string;
  validationError?: string;
  suggestedFix?: SuggestedFix;
}

/**
 * Target type for cross-references
 */
export type CrossReferenceTargetType = 
  | 'internal-document'    // Another document in same eCTD
  | 'internal-section'     // Section within same document
  | 'external-url'         // External website
  | 'bookmark'             // PDF bookmark
  | 'anchor'               // Named anchor in target
  | 'unknown';

/**
 * Type of link
 */
export type LinkType = 
  | 'pdf-hyperlink'        // Link embedded in PDF
  | 'xml-reference'        // Reference in XML backbone
  | 'document-reference'   // Text reference like "see Section 2.7"
  | 'table-of-contents'    // TOC entry
  | 'list-of-tables'       // LOT entry
  | 'list-of-figures'      // LOF entry
  | 'bibliography'         // Bibliography citation
  | 'appendix-reference';  // Reference to appendix

/**
 * Location information for where the link appears
 */
export interface LinkLocation {
  pageNumber?: number;
  section?: string;
  paragraph?: number;
  characterOffset?: number;
  xpath?: string;          // For XML documents
}

/**
 * Validation status
 */
export type CrossReferenceStatus = 
  | 'valid'                // Link resolves correctly
  | 'broken'               // Target not found
  | 'warning'              // Target exists but may be incorrect
  | 'orphaned'             // Target exists but source is missing
  | 'circular'             // Circular reference detected
  | 'pending'              // Not yet validated
  | 'skipped';             // Validation skipped (external URL, etc.)

/**
 * Suggested fix for broken references
 */
export interface SuggestedFix {
  type: FixType;
  description: string;
  confidence: number;      // 0-100%
  suggestedTarget?: string;
  suggestedPath?: string;
  autoFixable: boolean;
}

export type FixType = 
  | 'update-path'          // Path has changed
  | 'update-anchor'        // Anchor/bookmark has changed
  | 'remove-link'          // Target no longer exists
  | 'create-target'        // Target should be created
  | 'manual-review';       // Needs human decision

/**
 * Validation result for a document
 */
export interface DocumentCrossRefValidation {
  documentId: string;
  documentTitle: string;
  filePath: string;
  module: string;
  section?: string;
  
  totalReferences: number;
  validCount: number;
  brokenCount: number;
  warningCount: number;
  pendingCount: number;
  
  references: CrossReference[];
  validatedAt: string;
  validationDuration: number;  // ms
}

/**
 * Validation result for an entire sequence
 */
export interface SequenceCrossRefValidation {
  sequenceId: string;
  sequenceNumber: string;
  applicationId: string;
  applicationNumber: string;
  
  // Aggregate stats
  totalDocuments: number;
  documentsWithIssues: number;
  totalReferences: number;
  validCount: number;
  brokenCount: number;
  warningCount: number;
  orphanedCount: number;
  circularCount: number;
  
  // Document-level results
  documentResults: DocumentCrossRefValidation[];
  
  // Orphaned documents (referenced but not in sequence)
  orphanedReferences: OrphanedReference[];
  
  // Circular reference chains
  circularChains: CircularChain[];
  
  // Validation metadata
  validatedAt: string;
  validationDuration: number;
  validatedBy?: string;
}

/**
 * Reference to a document that doesn't exist
 */
export interface OrphanedReference {
  referencedPath: string;
  referencedFrom: {
    documentId: string;
    documentTitle: string;
    filePath: string;
  }[];
  suggestedMatches?: string[];  // Similar paths that might be correct
}

/**
 * Circular reference chain
 */
export interface CircularChain {
  id: string;
  documents: {
    documentId: string;
    documentTitle: string;
    filePath: string;
  }[];
  severity: 'low' | 'medium' | 'high';  // Based on chain length and doc importance
}

/**
 * Validation options
 */
export interface CrossRefValidationOptions {
  validateInternalLinks: boolean;
  validateExternalUrls: boolean;
  validateBookmarks: boolean;
  validateAnchors: boolean;
  checkOrphans: boolean;
  checkCircular: boolean;
  maxExternalTimeout: number;  // ms
  includeModules?: string[];   // Only validate these modules
  excludeModules?: string[];   // Skip these modules
  parallelism: number;         // Concurrent validations
}

/**
 * Default validation options
 */
export const DEFAULT_CROSS_REF_OPTIONS: CrossRefValidationOptions = {
  validateInternalLinks: true,
  validateExternalUrls: false,  // Off by default - slow and may fail in demo
  validateBookmarks: true,
  validateAnchors: true,
  checkOrphans: true,
  checkCircular: true,
  maxExternalTimeout: 5000,
  parallelism: 4,
};

/**
 * Validation progress for long-running operations
 */
export interface ValidationProgress {
  phase: 'scanning' | 'validating' | 'analyzing' | 'complete';
  currentDocument?: string;
  documentsScanned: number;
  totalDocuments: number;
  referencesChecked: number;
  totalReferences: number;
  issuesFound: number;
  estimatedTimeRemaining?: number;  // ms
}

/**
 * Cross-reference validation rules (configurable per region/submission type)
 */
export interface CrossRefValidationRule {
  id: string;
  name: string;
  description: string;
  category: CrossRefRuleCategory;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  applicableRegions: string[];  // FDA, EMA, etc.
  applicableModules?: string[];
  checkFn?: string;  // Name of validation function
}

export type CrossRefRuleCategory = 
  | 'link-integrity'       // Basic link validation
  | 'path-format'          // Path naming conventions
  | 'module-reference'     // Cross-module reference rules
  | 'external-reference'   // External URL rules
  | 'document-structure'   // TOC/LOT/LOF consistency
  | 'regional-requirement'; // Region-specific rules

/**
 * Built-in validation rules
 */
export const CROSS_REF_VALIDATION_RULES: CrossRefValidationRule[] = [
  {
    id: 'link-target-exists',
    name: 'Link Target Exists',
    description: 'All internal hyperlinks must resolve to existing documents',
    category: 'link-integrity',
    severity: 'error',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'bookmark-target-exists',
    name: 'Bookmark Target Exists',
    description: 'PDF bookmarks must link to valid page locations',
    category: 'link-integrity',
    severity: 'error',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'relative-paths-only',
    name: 'Relative Paths Only',
    description: 'Internal links must use relative paths, not absolute',
    category: 'path-format',
    severity: 'error',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'no-external-links-m1',
    name: 'No External Links in Module 1',
    description: 'Module 1 documents should not contain external URLs',
    category: 'external-reference',
    severity: 'warning',
    enabled: true,
    applicableRegions: ['FDA'],
    applicableModules: ['m1'],
  },
  {
    id: 'toc-completeness',
    name: 'TOC Completeness',
    description: 'Table of Contents entries must link to all major sections',
    category: 'document-structure',
    severity: 'warning',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'cross-module-refs-valid',
    name: 'Cross-Module References Valid',
    description: 'References between modules must use correct module prefixes',
    category: 'module-reference',
    severity: 'warning',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'case-sensitive-paths',
    name: 'Case-Sensitive Paths',
    description: 'File paths must match exact case of target files',
    category: 'path-format',
    severity: 'error',
    enabled: true,
    applicableRegions: ['FDA', 'EMA'],
  },
  {
    id: 'no-spaces-in-paths',
    name: 'No Spaces in Paths',
    description: 'File paths should not contain spaces',
    category: 'path-format',
    severity: 'warning',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA'],
  },
  {
    id: 'circular-ref-detection',
    name: 'Circular Reference Detection',
    description: 'Detect and flag circular reference chains between documents',
    category: 'link-integrity',
    severity: 'warning',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
  {
    id: 'orphan-document-detection',
    name: 'Orphan Document Detection',
    description: 'Flag documents that are referenced but not included in sequence',
    category: 'link-integrity',
    severity: 'error',
    enabled: true,
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'ANVISA', 'NMPA', 'ICH'],
  },
];

/**
 * Cross-reference report for export
 */
export interface CrossRefReport {
  title: string;
  generatedAt: string;
  generatedBy?: string;
  
  // Summary
  summary: {
    sequenceNumber: string;
    applicationNumber: string;
    totalDocuments: number;
    totalReferences: number;
    validCount: number;
    issueCount: number;
    passRate: number;  // percentage
  };
  
  // Issues by category
  issuesByCategory: {
    category: CrossRefRuleCategory;
    count: number;
    issues: {
      rule: string;
      severity: string;
      document: string;
      details: string;
    }[];
  }[];
  
  // Issues by module
  issuesByModule: {
    module: string;
    count: number;
    documents: string[];
  }[];
  
  // Detailed findings
  findings: CrossReference[];
}
