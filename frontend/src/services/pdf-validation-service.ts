
// PDF Validation Service for eCTD Publishing
// Validates PDF documents against FDA/EMA technical requirements

import { ValidationIssue, ValidationSeverity, ValidationCategory, PublishingDocument } from '@/types/publishing';

// ============================================================================
// PDF VALIDATION RULES
// ============================================================================

export interface PDFValidationRule {
  id: string;
  code: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  name: string;
  description: string;
  check: (doc: PDFDocumentInfo) => PDFValidationResult;
  autoFixable: boolean;
  autoFixAction?: string;
  guidance?: string;
}

export interface PDFDocumentInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  pdfVersion: string;
  isPdfA: boolean;
  pdfALevel?: '1a' | '1b' | '2a' | '2b' | '3a' | '3b';
  hasBookmarks: boolean;
  bookmarkDepth: number;
  bookmarkCount: number;
  hasHyperlinks: boolean;
  hyperlinkCount: number;
  brokenLinks: string[];
  pageCount: number;
  hasEmbeddedFonts: boolean;
  fontList: string[];
  hasEncryption: boolean;
  hasJavaScript: boolean;
  hasAttachments: boolean;
  hasComments: boolean;
  hasFormFields: boolean;
  hasLayers: boolean;
  hasTransparency: boolean;
  imageResolution: number;
  title?: string;
  author?: string;
  creationDate?: string;
  modificationDate?: string;
  producer?: string;
  sectionNumber?: string;
  moduleNumber?: string;
}

export interface PDFValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

export interface BatchValidationResult {
  totalDocuments: number;
  passedDocuments: number;
  failedDocuments: number;
  warningDocuments: number;
  results: Map<string, PDFValidationResult>;
  summary: {
    errors: number;
    warnings: number;
    info: number;
    byCategory: Record<ValidationCategory, number>;
    commonIssues: { code: string; count: number; message: string }[];
  };
  duration: number;
}

const generateIssueId = () => `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// FDA/EMA PDF TECHNICAL REQUIREMENTS
// ============================================================================

export const PDF_VALIDATION_RULES: PDFValidationRule[] = [
  {
    id: 'pdf-a-compliance',
    code: 'PDF-001',
    category: 'pdf',
    severity: 'error',
    name: 'PDF/A Compliance',
    description: 'Document must be PDF/A compliant for archival',
    autoFixable: true,
    autoFixAction: 'Convert to PDF/A-1b or PDF/A-2b format',
    guidance: 'Use PDF conversion tools to save as PDF/A.',
    check: (doc) => {
      if (!doc.isPdfA) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-001',
            message: 'Document is not PDF/A compliant',
            details: `Current version: PDF ${doc.pdfVersion}. FDA and EMA require PDF/A format.`,
            documentId: doc.id,
            documentPath: doc.filePath,
            sectionNumber: doc.sectionNumber,
            autoFixable: true,
            autoFixAction: 'Convert to PDF/A-1b format',
            manualFixGuidance: 'Save as PDF/A using Adobe Acrobat or compatible software',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'pdf-version',
    code: 'PDF-002',
    category: 'pdf',
    severity: 'warning',
    name: 'PDF Version',
    description: 'PDF version should be 1.4-1.7 for best compatibility',
    autoFixable: false,
    guidance: 'Save with PDF version 1.4-1.7 for optimal gateway compatibility.',
    check: (doc) => {
      const version = parseFloat(doc.pdfVersion);
      if (version < 1.4 || version > 1.7) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-002',
            message: `PDF version ${doc.pdfVersion} may have compatibility issues`,
            details: 'Recommended versions: 1.4-1.7.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: false,
            manualFixGuidance: 'Re-export document with PDF version 1.4-1.7',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'bookmarks-required',
    code: 'PDF-003',
    category: 'pdf',
    severity: 'error',
    name: 'Bookmarks Required',
    description: 'Documents over 5 pages must have bookmarks',
    autoFixable: true,
    autoFixAction: 'Generate bookmarks from document headings',
    guidance: 'Add bookmarks based on document headings.',
    check: (doc) => {
      if (doc.pageCount > 5 && !doc.hasBookmarks) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-003',
            message: `Document requires bookmarks (${doc.pageCount} pages, no bookmarks found)`,
            details: 'FDA and EMA require bookmarks for documents exceeding 5 pages.',
            documentId: doc.id,
            documentPath: doc.filePath,
            sectionNumber: doc.sectionNumber,
            autoFixable: true,
            autoFixAction: 'Auto-generate bookmarks from headings',
            manualFixGuidance: 'Add bookmarks in Adobe Acrobat based on document structure',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'bookmark-depth',
    code: 'PDF-004',
    category: 'pdf',
    severity: 'warning',
    name: 'Bookmark Depth',
    description: 'Bookmark hierarchy should not exceed 4 levels',
    autoFixable: true,
    autoFixAction: 'Flatten bookmark hierarchy to 4 levels',
    guidance: 'Simplify bookmark structure to max 4 levels.',
    check: (doc) => {
      if (doc.hasBookmarks && doc.bookmarkDepth > 4) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-004',
            message: `Bookmark depth (${doc.bookmarkDepth} levels) exceeds recommended maximum`,
            details: 'FDA recommends bookmark hierarchies of 4 levels or fewer.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Flatten bookmark structure',
            manualFixGuidance: 'Reorganize bookmarks to have no more than 4 nested levels',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'embedded-fonts',
    code: 'PDF-005',
    category: 'pdf',
    severity: 'error',
    name: 'Embedded Fonts',
    description: 'All fonts must be embedded',
    autoFixable: true,
    autoFixAction: 'Embed all fonts in document',
    guidance: 'Re-export with "Embed all fonts" option enabled.',
    check: (doc) => {
      if (!doc.hasEmbeddedFonts) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-005',
            message: 'Document contains non-embedded fonts',
            details: `Fonts used: ${doc.fontList.join(', ')}. All fonts must be embedded.`,
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Embed all fonts',
            manualFixGuidance: 'Re-export from source application with font embedding enabled',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'no-encryption',
    code: 'PDF-006',
    category: 'pdf',
    severity: 'error',
    name: 'No Encryption',
    description: 'PDF must not be encrypted or password protected',
    autoFixable: true,
    autoFixAction: 'Remove PDF encryption',
    guidance: 'Remove any security settings from the PDF.',
    check: (doc) => {
      if (doc.hasEncryption) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-006',
            message: 'Document is encrypted or password protected',
            details: 'eCTD submissions must not contain encrypted PDFs.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Remove PDF security',
            manualFixGuidance: 'Open in PDF editor with password and save without security settings',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'no-javascript',
    code: 'PDF-007',
    category: 'pdf',
    severity: 'error',
    name: 'No JavaScript',
    description: 'PDF must not contain JavaScript',
    autoFixable: true,
    autoFixAction: 'Remove embedded JavaScript',
    guidance: 'Remove any JavaScript actions from the document.',
    check: (doc) => {
      if (doc.hasJavaScript) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-007',
            message: 'Document contains embedded JavaScript',
            details: 'JavaScript is not permitted in eCTD submissions.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Remove JavaScript',
            manualFixGuidance: 'Use PDF preflight tools to identify and remove JavaScript',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'no-attachments',
    code: 'PDF-008',
    category: 'pdf',
    severity: 'error',
    name: 'No Attachments',
    description: 'PDF must not contain embedded attachments',
    autoFixable: true,
    autoFixAction: 'Extract and remove attachments',
    guidance: 'Remove embedded files and submit separately.',
    check: (doc) => {
      if (doc.hasAttachments) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-008',
            message: 'Document contains embedded attachments',
            details: 'Embedded attachments are not permitted.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Extract attachments',
            manualFixGuidance: 'Extract embedded files and include as separate documents',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'hyperlink-validation',
    code: 'PDF-009',
    category: 'pdf',
    severity: 'error',
    name: 'Hyperlink Validation',
    description: 'All hyperlinks must be valid and resolve correctly',
    autoFixable: false,
    guidance: 'Fix or remove broken links.',
    check: (doc) => {
      if (doc.brokenLinks.length > 0) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'error',
            category: 'pdf',
            code: 'PDF-009',
            message: `Document contains ${doc.brokenLinks.length} broken hyperlink(s)`,
            details: `Broken links: ${doc.brokenLinks.slice(0, 5).join(', ')}${doc.brokenLinks.length > 5 ? '...' : ''}`,
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: false,
            manualFixGuidance: 'Review and fix each broken link',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'image-resolution',
    code: 'PDF-010',
    category: 'pdf',
    severity: 'warning',
    name: 'Image Resolution',
    description: 'Images should be 150-300 DPI for optimal quality',
    autoFixable: true,
    autoFixAction: 'Optimize image resolution to 150-300 DPI',
    guidance: 'Resample images to 150-300 DPI range.',
    check: (doc) => {
      if (doc.imageResolution > 0 && (doc.imageResolution < 150 || doc.imageResolution > 600)) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-010',
            message: `Image resolution (${doc.imageResolution} DPI) outside recommended range`,
            details: `Recommended: 150-300 DPI. Current: ${doc.imageResolution} DPI.`,
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Optimize images',
            manualFixGuidance: 'Use PDF optimization to resample images to 150-300 DPI',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'file-size',
    code: 'PDF-011',
    category: 'pdf',
    severity: 'warning',
    name: 'File Size',
    description: 'Individual PDFs should not exceed 100MB',
    autoFixable: true,
    autoFixAction: 'Compress PDF or split into smaller documents',
    guidance: 'Large files can cause gateway issues.',
    check: (doc) => {
      const maxSize = 100 * 1024 * 1024;
      if (doc.fileSize > maxSize) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-011',
            message: `File size (${(doc.fileSize / 1024 / 1024).toFixed(1)}MB) exceeds recommended maximum`,
            details: 'Files over 100MB may cause gateway upload issues.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Compress or split document',
            manualFixGuidance: 'Use PDF optimization tools to reduce file size',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'no-form-fields',
    code: 'PDF-012',
    category: 'pdf',
    severity: 'warning',
    name: 'No Form Fields',
    description: 'Interactive form fields should be flattened',
    autoFixable: true,
    autoFixAction: 'Flatten form fields',
    guidance: 'Convert form fields to static content.',
    check: (doc) => {
      if (doc.hasFormFields) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-012',
            message: 'Document contains interactive form fields',
            details: 'Form fields should be flattened for eCTD submissions.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Flatten form fields',
            manualFixGuidance: 'Use PDF flattening feature in Adobe Acrobat',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'no-layers',
    code: 'PDF-013',
    category: 'pdf',
    severity: 'warning',
    name: 'No Layers',
    description: 'PDF layers (OCG) should be flattened',
    autoFixable: true,
    autoFixAction: 'Flatten PDF layers',
    guidance: 'Flatten layers for consistent display.',
    check: (doc) => {
      if (doc.hasLayers) {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'pdf',
            code: 'PDF-013',
            message: 'Document contains PDF layers',
            details: 'Layers may cause rendering inconsistencies.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Flatten layers',
            manualFixGuidance: 'Use PDF preflight tools to flatten layer content',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },

  {
    id: 'document-title',
    code: 'PDF-014',
    category: 'metadata',
    severity: 'warning',
    name: 'Document Title',
    description: 'PDF should have a meaningful title in metadata',
    autoFixable: true,
    autoFixAction: 'Set document title from filename',
    guidance: 'Set the document title property.',
    check: (doc) => {
      if (!doc.title || doc.title.trim() === '') {
        return {
          passed: false,
          issues: [{
            id: generateIssueId(),
            severity: 'warning',
            category: 'metadata',
            code: 'PDF-014',
            message: 'Document title metadata is empty',
            details: 'Setting a descriptive title improves organization.',
            documentId: doc.id,
            documentPath: doc.filePath,
            autoFixable: true,
            autoFixAction: 'Set title from filename',
            manualFixGuidance: 'Add descriptive title in PDF properties/metadata',
          }],
        };
      }
      return { passed: true, issues: [] };
    },
  },
];

// ============================================================================
// PDF VALIDATION SERVICE
// ============================================================================

export class PDFValidationService {
  private rules: PDFValidationRule[];

  constructor(customRules?: PDFValidationRule[]) {
    this.rules = customRules || PDF_VALIDATION_RULES;
  }

  validateDocument(doc: PDFDocumentInfo): PDFValidationResult {
    const allIssues: ValidationIssue[] = [];
    
    for (const rule of this.rules) {
      const result = rule.check(doc);
      if (!result.passed) {
        allIssues.push(...result.issues);
      }
    }

    return {
      passed: allIssues.filter(i => i.severity === 'error').length === 0,
      issues: allIssues,
    };
  }

  async validateBatch(documents: PDFDocumentInfo[]): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const results = new Map<string, PDFValidationResult>();
    
    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;
    
    const categoryCount: Record<ValidationCategory, number> = {
      structure: 0,
      naming: 0,
      pdf: 0,
      checksum: 0,
      business: 0,
      'cross-reference': 0,
      metadata: 0,
      regional: 0,
    };
    
    const issueCodeCount = new Map<string, { count: number; message: string }>();

    for (const doc of documents) {
      const result = this.validateDocument(doc);
      results.set(doc.id, result);
      
      const hasErrors = result.issues.some(i => i.severity === 'error');
      const hasWarnings = result.issues.some(i => i.severity === 'warning');
      
      if (hasErrors) {
        failedCount++;
      } else if (hasWarnings) {
        warningCount++;
      } else {
        passedCount++;
      }
      
      for (const issue of result.issues) {
        if (issue.severity === 'error') totalErrors++;
        else if (issue.severity === 'warning') totalWarnings++;
        else totalInfo++;
        
        categoryCount[issue.category]++;
        
        const existing = issueCodeCount.get(issue.code);
        if (existing) {
          existing.count++;
        } else {
          issueCodeCount.set(issue.code, { count: 1, message: issue.message });
        }
      }
    }

    const commonIssues = Array.from(issueCodeCount.entries())
      .map(([code, data]) => ({ code, count: data.count, message: data.message }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDocuments: documents.length,
      passedDocuments: passedCount,
      failedDocuments: failedCount,
      warningDocuments: warningCount,
      results,
      summary: {
        errors: totalErrors,
        warnings: totalWarnings,
        info: totalInfo,
        byCategory: categoryCount,
        commonIssues,
      },
      duration: Date.now() - startTime,
    };
  }

  getAutoFixableRules(): PDFValidationRule[] {
    return this.rules.filter(r => r.autoFixable);
  }

  getRuleByCode(code: string): PDFValidationRule | undefined {
    return this.rules.find(r => r.code === code);
  }

  async simulateAutoFix(doc: PDFDocumentInfo, issueCode: string): Promise<PDFDocumentInfo> {
    const rule = this.getRuleByCode(issueCode);
    if (!rule || !rule.autoFixable) {
      return doc;
    }

    const fixed = { ...doc };
    
    switch (issueCode) {
      case 'PDF-001':
        fixed.isPdfA = true;
        fixed.pdfALevel = '1b';
        break;
      case 'PDF-003':
        fixed.hasBookmarks = true;
        fixed.bookmarkCount = Math.ceil(fixed.pageCount / 3);
        fixed.bookmarkDepth = 2;
        break;
      case 'PDF-004':
        fixed.bookmarkDepth = 4;
        break;
      case 'PDF-005':
        fixed.hasEmbeddedFonts = true;
        break;
      case 'PDF-006':
        fixed.hasEncryption = false;
        break;
      case 'PDF-007':
        fixed.hasJavaScript = false;
        break;
      case 'PDF-008':
        fixed.hasAttachments = false;
        break;
      case 'PDF-010':
        fixed.imageResolution = 200;
        break;
      case 'PDF-011':
        fixed.fileSize = Math.min(fixed.fileSize, 50 * 1024 * 1024);
        break;
      case 'PDF-012':
        fixed.hasFormFields = false;
        break;
      case 'PDF-013':
        fixed.hasLayers = false;
        break;
      case 'PDF-014':
        fixed.title = fixed.fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        break;
    }

    return fixed;
  }
}

// ============================================================================
// MOCK PDF DOCUMENT INFO GENERATOR
// ============================================================================

export function generateMockPDFInfo(doc: PublishingDocument): PDFDocumentInfo {
  const hasIssues = Math.random() > 0.7;
  
  return {
    id: doc.id,
    fileName: doc.fileName,
    filePath: doc.filePath,
    fileSize: doc.fileSize,
    pdfVersion: hasIssues && Math.random() > 0.5 ? '2.0' : '1.6',
    isPdfA: !hasIssues || Math.random() > 0.3,
    pdfALevel: '1b',
    hasBookmarks: doc.pageCount ? doc.pageCount > 5 ? !hasIssues || Math.random() > 0.4 : true : true,
    bookmarkDepth: hasIssues ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1,
    bookmarkCount: doc.pageCount ? Math.ceil(doc.pageCount / 5) : 5,
    hasHyperlinks: Math.random() > 0.3,
    hyperlinkCount: Math.floor(Math.random() * 20),
    brokenLinks: hasIssues && Math.random() > 0.7 ? ['../m2/invalid-ref.pdf', '../m5/missing.pdf'] : [],
    pageCount: doc.pageCount || Math.floor(Math.random() * 100) + 1,
    hasEmbeddedFonts: !hasIssues || Math.random() > 0.2,
    fontList: ['Arial', 'Times New Roman', 'Helvetica'],
    hasEncryption: hasIssues && Math.random() > 0.9,
    hasJavaScript: hasIssues && Math.random() > 0.95,
    hasAttachments: hasIssues && Math.random() > 0.9,
    hasComments: hasIssues && Math.random() > 0.8,
    hasFormFields: hasIssues && Math.random() > 0.85,
    hasLayers: hasIssues && Math.random() > 0.9,
    hasTransparency: Math.random() > 0.7,
    imageResolution: hasIssues && Math.random() > 0.7 ? (Math.random() > 0.5 ? 72 : 600) : 200,
    title: hasIssues && Math.random() > 0.5 ? '' : doc.title,
    author: 'Ligature Authoring',
    creationDate: new Date().toISOString(),
    modificationDate: new Date().toISOString(),
    producer: 'Adobe PDF Library 15.0',
    sectionNumber: doc.sectionNumber,
    moduleNumber: doc.moduleNumber,
  };
}

export const pdfValidationService = new PDFValidationService();
