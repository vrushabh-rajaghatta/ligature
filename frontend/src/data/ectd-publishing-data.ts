// =============================================================================
// eCTD PUBLISHING MOCK DATA - v0.9.12
// =============================================================================
// Comprehensive mock data for eCTD publishing demonstrations including
// multi-region applications (FDA, EMA), multiple sequences with lifecycle
// operations, and realistic validation results.
// =============================================================================

import type {
  ECTDApplication,
  ECTDSequence,
  ECTDModuleContent,
  ECTDSection,
  ECTDLeafDocument,
  ECTDPublishingState,
  ValidationStatus,
  ValidationIssue,
  PublishingJob,
  SequenceStatus,
  LifecycleOperation,
  CTDModule,
} from '../store/ectd-publishing-types';
import { generateECTDId, CTD_MODULE_CONFIG } from '../store/ectd-publishing-types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createDocument(
  sectionId: string,
  title: string,
  fileName: string,
  filePath: string,
  operation: LifecycleOperation = 'new',
  overrides: Partial<ECTDLeafDocument> = {}
): ECTDLeafDocument {
  const id = generateECTDId.document();
  const now = new Date().toISOString();
  
  return {
    id,
    sectionId,
    title,
    fileName,
    filePath,
    fileType: 'pdf',
    fileSizeBytes: Math.floor(Math.random() * 5000000) + 100000,
    checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    checksumAlgorithm: 'sha256',
    checksumVerified: true,
    operation,
    languageCode: 'en',
    createdAt: now,
    modifiedAt: now,
    validationStatus: {
      isValid: true,
      lastChecked: now,
      errors: 0,
      warnings: 0,
      issues: [],
    },
    pdfAttributes: {
      version: '1.7',
      pageCount: Math.floor(Math.random() * 100) + 5,
      hasBookmarks: true,
      hasHyperlinks: true,
      hasFontsEmbedded: true,
      hasAnnotations: false,
      isTagged: true,
      isSearchable: true,
      colorSpace: 'RGB',
      pageSize: { width: 612, height: 792, unit: 'pt' },
    },
    ...overrides,
  };
}

function createSection(
  moduleContentId: string,
  sectionNumber: string,
  sectionTitle: string,
  isRequired: boolean = true,
  documents: ECTDLeafDocument[] = []
): ECTDSection {
  return {
    id: generateECTDId.section(),
    moduleContentId,
    sectionNumber,
    sectionTitle,
    documents,
    displayOrder: parseInt(sectionNumber.replace(/\D/g, '')) || 0,
    isRequired,
  };
}

function createModuleContent(
  sequenceId: string,
  moduleId: CTDModule,
  sections: ECTDSection[]
): ECTDModuleContent {
  const totalDocs = sections.reduce((sum, s) => sum + s.documents.length, 0);
  const totalSize = sections.reduce((sum, s) => 
    sum + s.documents.reduce((docSum, d) => docSum + d.fileSizeBytes, 0), 0
  );
  
  return {
    id: generateECTDId.module(),
    sequenceId,
    moduleId,
    title: CTD_MODULE_CONFIG[moduleId].title,
    sections,
    documentCount: totalDocs,
    totalSizeBytes: totalSize,
    lastModified: new Date().toISOString(),
  };
}

function createValidationStatus(
  errorCount: number = 0,
  warningCount: number = 0,
  issues: ValidationIssue[] = []
): ValidationStatus {
  return {
    isValid: errorCount === 0,
    lastRun: new Date().toISOString(),
    totalErrors: errorCount,
    totalWarnings: warningCount,
    totalInfo: 0,
    completeness: errorCount === 0 ? 100 : 85,
    issues,
    rulesPassed: 25 - errorCount - warningCount,
    rulesFailed: errorCount + warningCount,
    rulesSkipped: 0,
  };
}

// =============================================================================
// FDA NDA APPLICATION - NEXAVAR-PLUS (Primary Demo Application)
// =============================================================================

const fdaApp: ECTDApplication = {
  id: 'app_fda_nda_001',
  applicationNumber: 'NDA 215847',
  sponsorApplicationId: 'LIG-2024-NDA-001',
  submissionType: 'nda',
  region: 'US',
  ectdVersion: '4.0',
  productId: 'prod_nexavar_plus',
  productName: 'Nexavar-Plus',
  substanceNames: ['ligacitinib maleate'],
  dosageForms: ['Tablet, Film-Coated'],
  sponsorName: 'Ligature Therapeutics',
  sponsorDUNS: '123456789',
  contactName: 'Dr. Sarah Chen',
  contactEmail: 'sarah.chen@ligature.com',
  receivingAgency: 'FDA',
  agencyApplicationNumber: 'NDA 215847',
  status: 'under-review',
  createdAt: '2024-06-15T08:00:00Z',
  updatedAt: '2025-01-04T14:30:00Z',
  submittedAt: '2024-08-01T09:00:00Z',
  sequences: [],
  archivePath: '/archive/nda215847',
  tags: ['priority-review', 'oncology', 'breakthrough-therapy'],
  notes: 'Fast Track designation granted. Priority Review voucher applied.',
};

// FDA Sequence 0000 - Original NDA Submission
const fdaSeq0000Docs: ECTDLeafDocument[] = [];
const fdaSeq0000Sections: ECTDSection[] = [];

// Module 1 documents
const m1Sec1_1 = createSection('mod_m1_0000', '1.1', 'Forms', true, [
  createDocument('sec_1_1', 'Form FDA 356h', '356h.pdf', 'm1/us/356h.pdf'),
]);
const m1Sec1_2 = createSection('mod_m1_0000', '1.2', 'Cover Letter', true, [
  createDocument('sec_1_2', 'Cover Letter - Original NDA', 'cover-letter.pdf', 'm1/us/cover-letter.pdf'),
]);
const m1Sec1_3 = createSection('mod_m1_0000', '1.3', 'Administrative Information', true, [
  createDocument('sec_1_3', 'Contact Information', 'contact-info.pdf', 'm1/us/admin/contact-info.pdf'),
  createDocument('sec_1_3', 'Debarment Certification', 'debarment-cert.pdf', 'm1/us/admin/debarment-cert.pdf'),
  createDocument('sec_1_3', 'Financial Certification', 'financial-cert.pdf', 'm1/us/admin/financial-cert.pdf'),
]);
const m1Sec1_14 = createSection('mod_m1_0000', '1.14', 'Labeling', true, [
  createDocument('sec_1_14', 'Draft Package Insert', 'package-insert.pdf', 'm1/us/labeling/package-insert.pdf'),
  createDocument('sec_1_14', 'Patient Labeling', 'patient-labeling.pdf', 'm1/us/labeling/patient-labeling.pdf'),
]);

// Module 2 documents
const m2Sec2_2 = createSection('mod_m2_0000', '2.2', 'CTD Introduction', true, [
  createDocument('sec_2_2', 'CTD Introduction', 'introduction.pdf', 'm2/22-intro/introduction.pdf'),
]);
const m2Sec2_3 = createSection('mod_m2_0000', '2.3', 'Quality Overall Summary', true, [
  createDocument('sec_2_3', 'Quality Overall Summary', 'qos.pdf', 'm2/23-qos/qos.pdf'),
]);
const m2Sec2_5 = createSection('mod_m2_0000', '2.5', 'Clinical Overview', true, [
  createDocument('sec_2_5', 'Clinical Overview', 'clinical-overview.pdf', 'm2/25-clin-over/clinical-overview.pdf'),
]);
const m2Sec2_7 = createSection('mod_m2_0000', '2.7', 'Clinical Summary', true, [
  createDocument('sec_2_7', 'Summary of Clinical Efficacy', 'clinical-efficacy.pdf', 'm2/27-clin-summ/clinical-efficacy.pdf'),
  createDocument('sec_2_7', 'Summary of Clinical Safety', 'clinical-safety.pdf', 'm2/27-clin-summ/clinical-safety.pdf'),
]);

// Module 3 documents
const m3Sec3_2_S = createSection('mod_m3_0000', '3.2.S', 'Drug Substance', true, [
  createDocument('sec_3_2_s', 'Drug Substance Specification', 'drug-substance.pdf', 'm3/32s-drug-sub/drug-substance.pdf'),
  createDocument('sec_3_2_s', 'Manufacturing Process', 'ds-manufacturing.pdf', 'm3/32s-drug-sub/ds-manufacturing.pdf'),
]);
const m3Sec3_2_P = createSection('mod_m3_0000', '3.2.P', 'Drug Product', true, [
  createDocument('sec_3_2_p', 'Drug Product Description', 'drug-product.pdf', 'm3/32p-drug-prod/drug-product.pdf'),
  createDocument('sec_3_2_p', 'Pharmaceutical Development', 'pharma-dev.pdf', 'm3/32p-drug-prod/pharma-dev.pdf'),
  createDocument('sec_3_2_p', 'Stability Data', 'stability.pdf', 'm3/32p-drug-prod/stability.pdf'),
]);

// Module 5 documents
const m5Sec5_3_5 = createSection('mod_m5_0000', '5.3.5', 'Clinical Study Reports', true, [
  createDocument('sec_5_3_5', 'Pivotal Study NXP-301 CSR', 'nxp-301-csr.pdf', 'm5/535-efficacy/nxp-301-csr.pdf'),
  createDocument('sec_5_3_5', 'Supportive Study NXP-201 CSR', 'nxp-201-csr.pdf', 'm5/535-efficacy/nxp-201-csr.pdf'),
]);

const fdaSeq0000: ECTDSequence = {
  id: 'seq_fda_0000',
  applicationId: 'app_fda_nda_001',
  sequenceNumber: '0000',
  sequenceType: 'original',
  sequenceDescription: 'Original NDA Submission',
  submissionType: 'original',
  status: 'acknowledged',
  createdAt: '2024-06-15T08:00:00Z',
  updatedAt: '2024-08-15T10:00:00Z',
  publishedAt: '2024-08-01T09:00:00Z',
  submittedAt: '2024-08-01T09:00:00Z',
  acknowledgementDate: '2024-08-02T14:30:00Z',
  modules: [
    createModuleContent('seq_fda_0000', 'm1', [m1Sec1_1, m1Sec1_2, m1Sec1_3, m1Sec1_14]),
    createModuleContent('seq_fda_0000', 'm2', [m2Sec2_2, m2Sec2_3, m2Sec2_5, m2Sec2_7]),
    createModuleContent('seq_fda_0000', 'm3', [m3Sec3_2_S, m3Sec3_2_P]),
    createModuleContent('seq_fda_0000', 'm4', []),
    createModuleContent('seq_fda_0000', 'm5', [m5Sec5_3_5]),
  ],
  validationStatus: createValidationStatus(0, 2, [
    {
      id: 'val_001',
      ruleId: 'PDF-002',
      ruleName: 'PDF Bookmarks',
      category: 'pdf',
      severity: 'warning',
      message: 'Large document without granular bookmarks',
      documentPath: 'm5/535-efficacy/nxp-301-csr.pdf',
      isResolved: true,
      resolvedAt: '2024-07-28T10:00:00Z',
      resolution: 'Added detailed bookmarks to CSR',
      isWaived: false,
    },
    {
      id: 'val_002',
      ruleId: 'REF-001',
      ruleName: 'Cross-Reference',
      category: 'reference',
      severity: 'warning',
      message: 'Cross-reference target not found in current sequence',
      documentPath: 'm2/25-clin-over/clinical-overview.pdf',
      isResolved: true,
      resolvedAt: '2024-07-29T15:00:00Z',
      resolution: 'Updated hyperlink to correct target',
      isWaived: false,
    },
  ]),
  preparedBy: 'Sarah Chen',
  approvedBy: 'Michael Thompson',
  approvalDate: '2024-07-31T16:00:00Z',
};

// FDA Sequence 0001 - IR Response
const fdaSeq0001: ECTDSequence = {
  id: 'seq_fda_0001',
  applicationId: 'app_fda_nda_001',
  sequenceNumber: '0001',
  sequenceType: 'response',
  sequenceDescription: 'Response to FDA Information Request (IR)',
  submissionType: 'ir-response',
  relatedSequences: ['seq_fda_0000'],
  status: 'submitted',
  createdAt: '2024-11-01T08:00:00Z',
  updatedAt: '2024-12-15T14:00:00Z',
  publishedAt: '2024-12-15T09:00:00Z',
  submittedAt: '2024-12-15T09:00:00Z',
  modules: [
    createModuleContent('seq_fda_0001', 'm1', [
      createSection('mod_m1_0001', '1.2', 'Cover Letter', true, [
        createDocument('sec_1_2_0001', 'Cover Letter - IR Response', 'cover-letter-0001.pdf', 'm1/us/cover-letter-0001.pdf'),
      ]),
      createSection('mod_m1_0001', '1.12', 'Correspondence', true, [
        createDocument('sec_1_12_0001', 'IR Response Document', 'ir-response.pdf', 'm1/us/corr/ir-response.pdf'),
        createDocument('sec_1_12_0001', 'Supporting Data Summary', 'supporting-data.pdf', 'm1/us/corr/supporting-data.pdf'),
      ]),
    ]),
    createModuleContent('seq_fda_0001', 'm2', [
      createSection('mod_m2_0001', '2.7', 'Clinical Summary', false, [
        createDocument('sec_2_7_0001', 'Updated Clinical Safety Summary', 'clinical-safety-updated.pdf', 'm2/27-clin-summ/clinical-safety-updated.pdf', 'replace'),
      ]),
    ]),
    createModuleContent('seq_fda_0001', 'm3', []),
    createModuleContent('seq_fda_0001', 'm4', []),
    createModuleContent('seq_fda_0001', 'm5', [
      createSection('mod_m5_0001', '5.3.5', 'Clinical Study Reports', false, [
        createDocument('sec_5_3_5_0001', 'Additional Safety Analysis', 'safety-analysis.pdf', 'm5/535-efficacy/safety-analysis.pdf', 'append'),
      ]),
    ]),
  ],
  validationStatus: createValidationStatus(0, 0),
  preparedBy: 'Jennifer Williams',
  approvedBy: 'Sarah Chen',
  approvalDate: '2024-12-14T16:00:00Z',
};

// FDA Sequence 0002 - In Progress (Draft)
const fdaSeq0002: ECTDSequence = {
  id: 'seq_fda_0002',
  applicationId: 'app_fda_nda_001',
  sequenceNumber: '0002',
  sequenceType: 'amendment',
  sequenceDescription: 'Annual Report - Year 1',
  submissionType: 'annual-report',
  status: 'draft',
  createdAt: '2025-01-02T08:00:00Z',
  updatedAt: '2025-01-04T10:00:00Z',
  modules: [
    createModuleContent('seq_fda_0002', 'm1', [
      createSection('mod_m1_0002', '1.2', 'Cover Letter', true, []),
      createSection('mod_m1_0002', '1.3', 'Administrative Information', true, []),
    ]),
    createModuleContent('seq_fda_0002', 'm2', []),
    createModuleContent('seq_fda_0002', 'm3', []),
    createModuleContent('seq_fda_0002', 'm4', []),
    createModuleContent('seq_fda_0002', 'm5', []),
  ],
  validationStatus: createValidationStatus(2, 3, [
    {
      id: 'val_010',
      ruleId: 'REQ-001',
      ruleName: 'Required Documents',
      category: 'structure',
      severity: 'error',
      message: 'Cover letter is required',
      details: 'Section 1.2 must contain a cover letter document',
      isResolved: false,
      isWaived: false,
    },
    {
      id: 'val_011',
      ruleId: 'REQ-002',
      ruleName: 'Required Documents',
      category: 'structure',
      severity: 'error',
      message: 'Administrative information incomplete',
      details: 'Contact information document is required',
      isResolved: false,
      isWaived: false,
    },
  ]),
  preparedBy: 'David Park',
};

// =============================================================================
// EMA MAA APPLICATION - NEXAVAR-PLUS EU
// =============================================================================

const emaApp: ECTDApplication = {
  id: 'app_ema_maa_001',
  applicationNumber: 'EMEA/H/C/006543',
  sponsorApplicationId: 'LIG-2024-MAA-EU-001',
  submissionType: 'maa',
  region: 'EU',
  ectdVersion: '4.0',
  productId: 'prod_nexavar_plus',
  productName: 'Nexavar-Plus',
  substanceNames: ['ligacitinib maleate'],
  dosageForms: ['Film-coated tablet'],
  sponsorName: 'Ligature Therapeutics EU',
  contactName: 'Dr. Hans Mueller',
  contactEmail: 'hans.mueller@ligature-eu.com',
  receivingAgency: 'EMA',
  status: 'submitted',
  createdAt: '2024-09-01T08:00:00Z',
  updatedAt: '2025-01-03T11:00:00Z',
  submittedAt: '2024-11-15T10:00:00Z',
  sequences: [],
  archivePath: '/archive/emea-h-c-006543',
  tags: ['centralised-procedure', 'oncology'],
  notes: 'Centralised procedure - Rapporteur: Germany, Co-Rapporteur: Netherlands',
};

// EMA Sequence 0000 - Original MAA
const emaSeq0000: ECTDSequence = {
  id: 'seq_ema_0000',
  applicationId: 'app_ema_maa_001',
  sequenceNumber: '0000',
  sequenceType: 'original',
  sequenceDescription: 'Original Marketing Authorisation Application',
  submissionType: 'original',
  status: 'acknowledged',
  createdAt: '2024-09-01T08:00:00Z',
  updatedAt: '2024-11-20T10:00:00Z',
  publishedAt: '2024-11-15T10:00:00Z',
  submittedAt: '2024-11-15T10:00:00Z',
  acknowledgementDate: '2024-11-16T09:00:00Z',
  modules: [
    createModuleContent('seq_ema_0000', 'm1', [
      createSection('mod_m1_ema_0000', '1.0', 'Cover Letter', true, [
        createDocument('sec_1_0_ema', 'Cover Letter', 'cover-letter.pdf', 'm1/eu/cover-letter.pdf'),
      ]),
      createSection('mod_m1_ema_0000', '1.2', 'Application Form', true, [
        createDocument('sec_1_2_ema', 'Application Form', 'application-form.pdf', 'm1/eu/application-form.pdf'),
      ]),
      createSection('mod_m1_ema_0000', '1.3', 'Product Information', true, [
        createDocument('sec_1_3_ema', 'SmPC', 'smpc.pdf', 'm1/eu/pi/smpc.pdf'),
        createDocument('sec_1_3_ema', 'Package Leaflet', 'pil.pdf', 'm1/eu/pi/pil.pdf'),
        createDocument('sec_1_3_ema', 'Labelling', 'labelling.pdf', 'm1/eu/pi/labelling.pdf'),
      ]),
      createSection('mod_m1_ema_0000', '1.5', 'Expert Statements', true, [
        createDocument('sec_1_5_ema', 'Quality Expert Statement', 'qp-expert.pdf', 'm1/eu/experts/qp-expert.pdf'),
        createDocument('sec_1_5_ema', 'Clinical Expert Statement', 'clin-expert.pdf', 'm1/eu/experts/clin-expert.pdf'),
      ]),
      createSection('mod_m1_ema_0000', '1.8', 'Environmental Risk Assessment', true, [
        createDocument('sec_1_8_ema', 'ERA', 'era.pdf', 'm1/eu/era.pdf'),
      ]),
    ]),
    createModuleContent('seq_ema_0000', 'm2', [
      createSection('mod_m2_ema_0000', '2.2', 'CTD Introduction', true, [
        createDocument('sec_2_2_ema', 'Introduction', 'introduction.pdf', 'm2/22-intro/introduction.pdf'),
      ]),
      createSection('mod_m2_ema_0000', '2.3', 'Quality Overall Summary', true, [
        createDocument('sec_2_3_ema', 'Quality Overall Summary', 'qos.pdf', 'm2/23-qos/qos.pdf'),
      ]),
      createSection('mod_m2_ema_0000', '2.5', 'Clinical Overview', true, [
        createDocument('sec_2_5_ema', 'Clinical Overview', 'clinical-overview.pdf', 'm2/25-clin-over/clinical-overview.pdf'),
      ]),
    ]),
    createModuleContent('seq_ema_0000', 'm3', [
      createSection('mod_m3_ema_0000', '3.2.S', 'Drug Substance', true, [
        createDocument('sec_3_2_s_ema', 'Drug Substance', 'drug-substance.pdf', 'm3/32s-drug-sub/drug-substance.pdf'),
      ]),
      createSection('mod_m3_ema_0000', '3.2.P', 'Drug Product', true, [
        createDocument('sec_3_2_p_ema', 'Drug Product', 'drug-product.pdf', 'm3/32p-drug-prod/drug-product.pdf'),
      ]),
    ]),
    createModuleContent('seq_ema_0000', 'm4', []),
    createModuleContent('seq_ema_0000', 'm5', [
      createSection('mod_m5_ema_0000', '5.3.5', 'Clinical Study Reports', true, [
        createDocument('sec_5_3_5_ema', 'Pivotal Study NXP-301 CSR', 'nxp-301-csr.pdf', 'm5/535-efficacy/nxp-301-csr.pdf'),
      ]),
    ]),
  ],
  validationStatus: createValidationStatus(0, 1, [
    {
      id: 'val_ema_001',
      ruleId: 'EU-LANG-001',
      ruleName: 'Language Requirement',
      category: 'regional',
      severity: 'warning',
      message: 'SmPC translations pending for some EU languages',
      details: 'Translations for Bulgarian, Croatian, and Maltese not yet provided',
      isResolved: false,
      isWaived: true,
      waivedAt: '2024-11-10T10:00:00Z',
      waiverJustification: 'Translations will be provided before Day 120',
    },
  ]),
  preparedBy: 'Hans Mueller',
  approvedBy: 'Dr. Maria Schmidt',
  approvalDate: '2024-11-14T16:00:00Z',
};

// =============================================================================
// SECOND FDA APPLICATION - ANDA (Generic)
// =============================================================================

const fdaAndaApp: ECTDApplication = {
  id: 'app_fda_anda_001',
  applicationNumber: 'ANDA 217892',
  sponsorApplicationId: 'LIG-2024-ANDA-001',
  submissionType: 'anda',
  region: 'US',
  ectdVersion: '4.0',
  productId: 'prod_generic_001',
  productName: 'Ligacitinib Tablets',
  substanceNames: ['ligacitinib'],
  dosageForms: ['Tablet'],
  sponsorName: 'Ligature Generics',
  receivingAgency: 'FDA',
  status: 'planning',
  createdAt: '2025-01-03T08:00:00Z',
  updatedAt: '2025-01-04T09:00:00Z',
  sequences: [],
  archivePath: '/archive/anda217892',
  tags: ['generic', 'first-to-file'],
};

const fdaAndaSeq0000: ECTDSequence = {
  id: 'seq_fda_anda_0000',
  applicationId: 'app_fda_anda_001',
  sequenceNumber: '0000',
  sequenceType: 'original',
  sequenceDescription: 'Original ANDA Submission',
  submissionType: 'original',
  status: 'planning',
  createdAt: '2025-01-03T08:00:00Z',
  updatedAt: '2025-01-04T09:00:00Z',
  modules: [
    createModuleContent('seq_fda_anda_0000', 'm1', []),
    createModuleContent('seq_fda_anda_0000', 'm2', []),
    createModuleContent('seq_fda_anda_0000', 'm3', []),
    createModuleContent('seq_fda_anda_0000', 'm4', []),
    createModuleContent('seq_fda_anda_0000', 'm5', []),
  ],
  validationStatus: createValidationStatus(5, 2, [
    {
      id: 'val_anda_001',
      ruleId: 'REQ-001',
      ruleName: 'Required Documents',
      category: 'structure',
      severity: 'error',
      message: 'Module 1 is empty',
      isResolved: false,
      isWaived: false,
    },
    {
      id: 'val_anda_002',
      ruleId: 'REQ-001',
      ruleName: 'Required Documents',
      category: 'structure',
      severity: 'error',
      message: 'Module 2 is empty',
      isResolved: false,
      isWaived: false,
    },
    {
      id: 'val_anda_003',
      ruleId: 'REQ-001',
      ruleName: 'Required Documents',
      category: 'structure',
      severity: 'error',
      message: 'Module 3 is empty',
      isResolved: false,
      isWaived: false,
    },
  ]),
};

// =============================================================================
// PUBLISHING JOBS
// =============================================================================

const publishingJobs: Record<string, PublishingJob> = {
  'job_001': {
    id: 'job_001',
    sequenceId: 'seq_fda_0001',
    outputFormat: 'ectd',
    targetGateway: 'FDA-ESG',
    validationLevel: 'full',
    includeViewerFiles: true,
    status: 'completed',
    progress: 100,
    currentStep: 'Complete',
    createdAt: '2024-12-15T08:30:00Z',
    startedAt: '2024-12-15T08:35:00Z',
    completedAt: '2024-12-15T09:00:00Z',
    gatewayResponse: {
      gateway: 'FDA-ESG',
      transactionId: 'ESG-2024-12-15-001',
      status: 'accepted',
      receivedAt: '2024-12-15T09:00:00Z',
      acknowledgementNumber: 'ACK-NDA215847-0001',
      messages: [
        { type: 'info', code: 'ESG-001', message: 'Submission received and queued for processing' },
      ],
    },
  },
  'job_002': {
    id: 'job_002',
    sequenceId: 'seq_ema_0000',
    outputFormat: 'ectd',
    targetGateway: 'EMA-CESP',
    validationLevel: 'full',
    includeViewerFiles: true,
    status: 'completed',
    progress: 100,
    currentStep: 'Complete',
    createdAt: '2024-11-15T09:00:00Z',
    startedAt: '2024-11-15T09:05:00Z',
    completedAt: '2024-11-15T10:00:00Z',
    gatewayResponse: {
      gateway: 'EMA-CESP',
      transactionId: 'CESP-2024-11-15-001',
      status: 'accepted',
      receivedAt: '2024-11-15T10:00:00Z',
      acknowledgementNumber: 'CESP-ACK-006543-0000',
      messages: [
        { type: 'info', code: 'CESP-001', message: 'Submission validated and accepted' },
      ],
    },
  },
};

// =============================================================================
// AGGREGATE ALL DOCUMENTS
// =============================================================================

function collectDocuments(sequences: ECTDSequence[]): Record<string, ECTDLeafDocument> {
  const docs: Record<string, ECTDLeafDocument> = {};
  
  for (const seq of sequences) {
    for (const mod of seq.modules) {
      for (const sec of mod.sections) {
        for (const doc of sec.documents) {
          docs[doc.id] = doc;
        }
      }
    }
  }
  
  return docs;
}

function collectDocumentsBySequence(sequences: ECTDSequence[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const seq of sequences) {
    const docIds: string[] = [];
    for (const mod of seq.modules) {
      for (const sec of mod.sections) {
        for (const doc of sec.documents) {
          docIds.push(doc.id);
        }
      }
    }
    result[seq.id] = docIds;
  }
  
  return result;
}

// =============================================================================
// EXPORT MOCK DATA
// =============================================================================

const allSequences = [fdaSeq0000, fdaSeq0001, fdaSeq0002, emaSeq0000, fdaAndaSeq0000];

export const mockECTDPublishingData: Partial<ECTDPublishingState> = {
  applications: {
    [fdaApp.id]: fdaApp,
    [emaApp.id]: emaApp,
    [fdaAndaApp.id]: fdaAndaApp,
  },
  applicationIndex: [fdaApp.id, emaApp.id, fdaAndaApp.id],
  selectedApplicationId: fdaApp.id,
  
  sequences: {
    [fdaSeq0000.id]: fdaSeq0000,
    [fdaSeq0001.id]: fdaSeq0001,
    [fdaSeq0002.id]: fdaSeq0002,
    [emaSeq0000.id]: emaSeq0000,
    [fdaAndaSeq0000.id]: fdaAndaSeq0000,
  },
  sequencesByApplication: {
    [fdaApp.id]: [fdaSeq0000.id, fdaSeq0001.id, fdaSeq0002.id],
    [emaApp.id]: [emaSeq0000.id],
    [fdaAndaApp.id]: [fdaAndaSeq0000.id],
  },
  selectedSequenceId: fdaSeq0000.id,
  
  documents: collectDocuments(allSequences),
  documentsBySequence: collectDocumentsBySequence(allSequences),
  
  publishingJobs,
  
  activeView: 'applications',
  filters: {},
  isLoading: false,
  error: null,
};

// Export individual entities for direct access
export const mockApplications = [fdaApp, emaApp, fdaAndaApp];
export const mockSequences = allSequences;
export const mockPublishingJobs = Object.values(publishingJobs);
