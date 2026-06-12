// Submission Assembly Data - v0.6.6
// "When the CSR was approved, it slotted into Module 5.3.5.1."
// Document Authoring → Submission Assembly - showing how documents flow into eCTD structure

// ============================================================================
// SUBMISSION ASSEMBLY TYPES
// ============================================================================

export type DocumentReadinessStatus = 
  | 'not-started'      // Document not yet created
  | 'in-authoring'     // Document being written
  | 'in-review'        // Document under review
  | 'approved'         // Approved, ready for integration
  | 'integrated'       // Already placed in eCTD slot
  | 'needs-update';    // Integrated but source updated

export type SlotStatus = 
  | 'empty'            // No document assigned
  | 'pending'          // Document assigned but not ready
  | 'ready'            // Document ready for integration
  | 'filled'           // Document integrated
  | 'blocked';         // Missing prerequisite

export type IntegrationAction = 
  | 'auto-placed'      // System auto-placed from authoring
  | 'manual-placed'    // User manually placed
  | 'replaced'         // Replaced existing content
  | 'appended'         // Appended to existing
  | 'pending';         // Awaiting placement

export interface SourceDocument {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  version: string;
  status: DocumentReadinessStatus;
  approvedAt?: string;
  approvedBy?: string;
  authoringModuleRef: string;     // Link back to authoring module
  generationJobId?: string;       // Link to v0.6.5 generation job
  lastModified: string;
  wordCount: number;
  pageCount: number;
  hasTables: boolean;
  hasFigures: boolean;
  tableCount: number;
  figureCount: number;
  confidenceScore?: number;       // From AI generation
}

export interface ECTDSlot {
  id: string;
  ctdModule: string;             // e.g., 'm2', 'm3', 'm4', 'm5'
  ctdSection: string;            // e.g., '2.7.3', '5.3.5.1'
  sectionTitle: string;          // e.g., 'Summary of Clinical Efficacy'
  status: SlotStatus;
  sourceDocument?: SourceDocument;
  operation?: 'new' | 'replace' | 'append' | 'delete';
  assignedDocument?: string;      // Document ID if assigned
  expectedDocumentType?: string;  // What type of doc goes here
  isRequired: boolean;
  dependencies: string[];         // Section IDs this depends on
  dependents: string[];           // Sections that depend on this
  lastIntegrated?: string;
  integratedBy?: string;
  integrationAction?: IntegrationAction;
  validationStatus: 'passed' | 'warnings' | 'failed' | 'pending';
  validationMessages: string[];
  estimatedPages?: number;
}

export interface SequenceAssembly {
  id: string;
  sequenceId: string;
  sequenceNumber: string;
  applicationId: string;
  applicationNumber: string;
  applicationType: 'NDA' | 'BLA' | 'ANDA' | 'IND' | 'MAA';
  region: 'FDA' | 'EMA' | 'PMDA' | 'HC' | 'TGA';
  productId: string;
  productName: string;
  submissionType: 'original' | 'amendment' | 'supplement' | 'resubmission';
  targetDate: string;
  status: 'draft' | 'assembling' | 'ready-for-validation' | 'validated' | 'ready-for-submission';
  createdAt: string;
  lastModified: string;
  createdBy: string;
  
  // Module-level readiness
  moduleReadiness: {
    module: string;
    label: string;
    totalSlots: number;
    filledSlots: number;
    readySlots: number;
    blockedSlots: number;
    percentComplete: number;
  }[];
  
  // All slots for this sequence
  slots: ECTDSlot[];
  
  // Documents ready to integrate
  pendingDocuments: SourceDocument[];
  
  // Integration history
  integrationLog: IntegrationLogEntry[];
  
  // Overall metrics
  totalSlots: number;
  filledSlots: number;
  readyToFillSlots: number;
  blockedSlots: number;
  overallReadiness: number;
  estimatedTotalPages: number;
  actualPages: number;
}

export interface IntegrationLogEntry {
  id: string;
  timestamp: string;
  action: IntegrationAction;
  slotId: string;
  ctdSection: string;
  documentId: string;
  documentTitle: string;
  performedBy: string;
  automated: boolean;
  notes?: string;
}

export interface AssemblyQueueItem {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  sourceModule: 'authoring' | 'generation' | 'external';
  status: 'ready' | 'pending-approval' | 'processing' | 'integrated' | 'blocked';
  targetSlot: string;           // CTD section
  targetSlotTitle: string;
  operation: 'new' | 'replace' | 'append';
  priority: 'critical' | 'high' | 'standard' | 'low';
  addedAt: string;
  processedAt?: string;
  addedBy: string;
  sequenceId: string;
  productId: string;
  productName: string;
  automationEligible: boolean;
  blockedReason?: string;
  dependencies: { section: string; status: SlotStatus }[];
}

export interface AssemblyDashboardSummary {
  totalSequencesInAssembly: number;
  documentsReadyToIntegrate: number;
  documentsIntegratedToday: number;
  sequencesReadyForValidation: number;
  blockedItems: number;
  averageReadinessScore: number;
  upcomingDeadlines: { sequenceId: string; applicationNumber: string; targetDate: string; daysRemaining: number }[];
}

// ============================================================================
// GOLDEN PATH DATA - NEXAVANT NDA ASSEMBLY
// ============================================================================

// Source documents coming from v0.6.5 Document Generation
const nexavantSourceDocuments: SourceDocument[] = [
  {
    id: 'src-doc-001',
    documentId: 'auth-csr-11',
    documentTitle: 'CSR Section 11 - Efficacy Results',
    documentType: 'csr-efficacy',
    version: '2.1',
    status: 'approved',
    approvedAt: '2026-01-02T14:30:00Z',
    approvedBy: 'Dr. Sarah Chen',
    authoringModuleRef: 'authoring/doc/csr-lig301-efficacy',
    generationJobId: 'gen-job-001',
    lastModified: '2026-01-02T14:30:00Z',
    wordCount: 12450,
    pageCount: 28,
    hasTables: true,
    hasFigures: true,
    tableCount: 8,
    figureCount: 3,
    confidenceScore: 87
  },
  {
    id: 'src-doc-002',
    documentId: 'auth-csr-12',
    documentTitle: 'CSR Section 12 - Safety Results',
    documentType: 'csr-safety',
    version: '1.3',
    status: 'in-review',
    authoringModuleRef: 'authoring/doc/csr-lig301-safety',
    generationJobId: 'gen-job-002',
    lastModified: '2026-01-02T15:45:00Z',
    wordCount: 18920,
    pageCount: 42,
    hasTables: true,
    hasFigures: true,
    tableCount: 12,
    figureCount: 4,
    confidenceScore: 82
  },
  {
    id: 'src-doc-003',
    documentId: 'auth-m273',
    documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
    documentType: 'module-27-3',
    version: '1.0',
    status: 'approved',
    approvedAt: '2026-01-02T16:00:00Z',
    approvedBy: 'Dr. Michael Torres',
    authoringModuleRef: 'authoring/doc/m273-efficacy-summary',
    generationJobId: 'gen-job-003',
    lastModified: '2026-01-02T16:00:00Z',
    wordCount: 8500,
    pageCount: 22,
    hasTables: true,
    hasFigures: true,
    tableCount: 6,
    figureCount: 2,
    confidenceScore: 91
  },
  {
    id: 'src-doc-004',
    documentId: 'auth-m274',
    documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
    documentType: 'module-27-4',
    version: '0.8',
    status: 'in-authoring',
    authoringModuleRef: 'authoring/doc/m274-safety-summary',
    generationJobId: 'gen-job-004',
    lastModified: '2026-01-02T12:30:00Z',
    wordCount: 6200,
    pageCount: 16,
    hasTables: true,
    hasFigures: false,
    tableCount: 8,
    figureCount: 0,
    confidenceScore: 70
  },
  {
    id: 'src-doc-005',
    documentId: 'auth-m25',
    documentTitle: 'Module 2.5 - Clinical Overview',
    documentType: 'module-25',
    version: '1.2',
    status: 'approved',
    approvedAt: '2026-01-01T10:00:00Z',
    approvedBy: 'Dr. Sarah Chen',
    authoringModuleRef: 'authoring/doc/m25-clinical-overview',
    lastModified: '2026-01-01T10:00:00Z',
    wordCount: 15200,
    pageCount: 35,
    hasTables: true,
    hasFigures: true,
    tableCount: 4,
    figureCount: 6,
    confidenceScore: 94
  },
  {
    id: 'src-doc-006',
    documentId: 'auth-m26',
    documentTitle: 'Module 2.6 - Nonclinical Overview',
    documentType: 'module-26',
    version: '2.0',
    status: 'integrated',
    approvedAt: '2025-12-28T14:00:00Z',
    approvedBy: 'Dr. James Wilson',
    authoringModuleRef: 'authoring/doc/m26-nonclinical-overview',
    lastModified: '2025-12-28T14:00:00Z',
    wordCount: 9800,
    pageCount: 24,
    hasTables: true,
    hasFigures: true,
    tableCount: 3,
    figureCount: 5
  },
  {
    id: 'src-doc-007',
    documentId: 'auth-csr-full',
    documentTitle: 'Clinical Study Report LIG-301 (Full)',
    documentType: 'csr-full',
    version: '0.9',
    status: 'in-review',
    authoringModuleRef: 'authoring/doc/csr-lig301-full',
    lastModified: '2026-01-02T17:00:00Z',
    wordCount: 85400,
    pageCount: 210,
    hasTables: true,
    hasFigures: true,
    tableCount: 45,
    figureCount: 18
  }
];

// eCTD Slots for Module 2 (CTD Summaries)
const module2Slots: ECTDSlot[] = [
  {
    id: 'slot-m2-25',
    ctdModule: 'm2',
    ctdSection: '2.5',
    sectionTitle: 'Clinical Overview',
    status: 'filled',
    sourceDocument: nexavantSourceDocuments.find(d => d.documentId === 'auth-m25'),
    operation: 'new',
    assignedDocument: 'auth-m25',
    expectedDocumentType: 'module-25',
    isRequired: true,
    dependencies: ['2.7.1', '2.7.2', '2.7.3', '2.7.4', '2.7.5', '2.7.6'],
    dependents: [],
    lastIntegrated: '2026-01-01T11:00:00Z',
    integratedBy: 'System (Auto)',
    integrationAction: 'auto-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 35
  },
  {
    id: 'slot-m2-26',
    ctdModule: 'm2',
    ctdSection: '2.6',
    sectionTitle: 'Nonclinical Overview',
    status: 'filled',
    sourceDocument: nexavantSourceDocuments.find(d => d.documentId === 'auth-m26'),
    operation: 'new',
    assignedDocument: 'auth-m26',
    expectedDocumentType: 'module-26',
    isRequired: true,
    dependencies: [],
    dependents: ['2.4'],
    lastIntegrated: '2025-12-28T15:00:00Z',
    integratedBy: 'System (Auto)',
    integrationAction: 'auto-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 24
  },
  {
    id: 'slot-m2-273',
    ctdModule: 'm2',
    ctdSection: '2.7.3',
    sectionTitle: 'Summary of Clinical Efficacy',
    status: 'ready',
    sourceDocument: nexavantSourceDocuments.find(d => d.documentId === 'auth-m273'),
    operation: 'new',
    assignedDocument: 'auth-m273',
    expectedDocumentType: 'module-27-3',
    isRequired: true,
    dependencies: [],
    dependents: ['2.5'],
    integrationAction: 'pending',
    validationStatus: 'pending',
    validationMessages: ['Ready for integration - approved 2 hours ago'],
    estimatedPages: 22
  },
  {
    id: 'slot-m2-274',
    ctdModule: 'm2',
    ctdSection: '2.7.4',
    sectionTitle: 'Summary of Clinical Safety',
    status: 'pending',
    sourceDocument: nexavantSourceDocuments.find(d => d.documentId === 'auth-m274'),
    operation: 'new',
    assignedDocument: 'auth-m274',
    expectedDocumentType: 'module-27-4',
    isRequired: true,
    dependencies: [],
    dependents: ['2.5'],
    validationStatus: 'pending',
    validationMessages: ['Awaiting document approval - currently in authoring'],
    estimatedPages: 18
  },
  {
    id: 'slot-m2-271',
    ctdModule: 'm2',
    ctdSection: '2.7.1',
    sectionTitle: 'Summary of Biopharmaceutic Studies',
    status: 'filled',
    operation: 'new',
    expectedDocumentType: 'module-27-1',
    isRequired: true,
    dependencies: [],
    dependents: ['2.5'],
    lastIntegrated: '2025-12-20T10:00:00Z',
    integratedBy: 'Dr. Emily Park',
    integrationAction: 'manual-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 15
  },
  {
    id: 'slot-m2-272',
    ctdModule: 'm2',
    ctdSection: '2.7.2',
    sectionTitle: 'Summary of Clinical Pharmacology Studies',
    status: 'filled',
    operation: 'new',
    expectedDocumentType: 'module-27-2',
    isRequired: true,
    dependencies: [],
    dependents: ['2.5'],
    lastIntegrated: '2025-12-22T14:00:00Z',
    integratedBy: 'Dr. James Wilson',
    integrationAction: 'manual-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 28
  }
];

// eCTD Slots for Module 5 (Clinical Study Reports)
const module5Slots: ECTDSlot[] = [
  {
    id: 'slot-m5-3511',
    ctdModule: 'm5',
    ctdSection: '5.3.5.1',
    sectionTitle: 'Clinical Study Reports - Controlled Clinical Studies',
    status: 'ready',
    sourceDocument: nexavantSourceDocuments.find(d => d.documentId === 'auth-csr-full'),
    operation: 'new',
    assignedDocument: 'auth-csr-full',
    expectedDocumentType: 'csr-full',
    isRequired: true,
    dependencies: [],
    dependents: ['2.7.3', '2.7.4'],
    integrationAction: 'pending',
    validationStatus: 'warnings',
    validationMessages: ['Document in final review - pending approval', 'All sections complete'],
    estimatedPages: 210
  },
  {
    id: 'slot-m5-331',
    ctdModule: 'm5',
    ctdSection: '5.3.3.1',
    sectionTitle: 'Reports of Human PK Studies',
    status: 'filled',
    operation: 'new',
    expectedDocumentType: 'pk-report',
    isRequired: true,
    dependencies: [],
    dependents: ['2.7.2'],
    lastIntegrated: '2025-12-15T09:00:00Z',
    integratedBy: 'Dr. Lisa Chen',
    integrationAction: 'manual-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 85
  },
  {
    id: 'slot-m5-341',
    ctdModule: 'm5',
    ctdSection: '5.3.4.1',
    sectionTitle: 'Healthy Subject PD Studies',
    status: 'filled',
    operation: 'new',
    expectedDocumentType: 'pd-report',
    isRequired: true,
    dependencies: [],
    dependents: ['2.7.2'],
    lastIntegrated: '2025-12-18T11:00:00Z',
    integratedBy: 'Dr. Michael Torres',
    integrationAction: 'manual-placed',
    validationStatus: 'passed',
    validationMessages: [],
    estimatedPages: 65
  }
];

// Integration log entries
const integrationLog: IntegrationLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-01-02T16:05:00Z',
    action: 'auto-placed',
    slotId: 'slot-m2-273',
    ctdSection: '2.7.3',
    documentId: 'auth-m273',
    documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
    performedBy: 'System',
    automated: true,
    notes: 'Auto-placed after document approval by Dr. Michael Torres'
  },
  {
    id: 'log-002',
    timestamp: '2026-01-01T11:00:00Z',
    action: 'auto-placed',
    slotId: 'slot-m2-25',
    ctdSection: '2.5',
    documentId: 'auth-m25',
    documentTitle: 'Module 2.5 - Clinical Overview',
    performedBy: 'System',
    automated: true,
    notes: 'Auto-placed after document approval by Dr. Sarah Chen'
  },
  {
    id: 'log-003',
    timestamp: '2025-12-28T15:00:00Z',
    action: 'auto-placed',
    slotId: 'slot-m2-26',
    ctdSection: '2.6',
    documentId: 'auth-m26',
    documentTitle: 'Module 2.6 - Nonclinical Overview',
    performedBy: 'System',
    automated: true,
    notes: 'Auto-placed after document approval by Dr. James Wilson'
  },
  {
    id: 'log-004',
    timestamp: '2025-12-22T14:00:00Z',
    action: 'manual-placed',
    slotId: 'slot-m2-272',
    ctdSection: '2.7.2',
    documentId: 'ext-m272',
    documentTitle: 'Summary of Clinical Pharmacology Studies',
    performedBy: 'Dr. James Wilson',
    automated: false,
    notes: 'Manually uploaded from external authoring system'
  },
  {
    id: 'log-005',
    timestamp: '2025-12-20T10:00:00Z',
    action: 'manual-placed',
    slotId: 'slot-m2-271',
    ctdSection: '2.7.1',
    documentId: 'ext-m271',
    documentTitle: 'Summary of Biopharmaceutic Studies',
    performedBy: 'Dr. Emily Park',
    automated: false,
    notes: 'Manually uploaded from external authoring system'
  }
];

// Assembly Queue - Documents ready to integrate
const assemblyQueue: AssemblyQueueItem[] = [
  {
    id: 'queue-001',
    documentId: 'auth-m273',
    documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
    documentType: 'module-27-3',
    sourceModule: 'generation',
    status: 'ready',
    targetSlot: '2.7.3',
    targetSlotTitle: 'Summary of Clinical Efficacy',
    operation: 'new',
    priority: 'critical',
    addedAt: '2026-01-02T16:00:00Z',
    addedBy: 'System',
    sequenceId: 'seq-nda-nexavant-0004',
    productId: 'prod-lig-2847',
    productName: 'Nexavant (LIG-2847)',
    automationEligible: true,
    dependencies: []
  },
  {
    id: 'queue-002',
    documentId: 'auth-csr-full',
    documentTitle: 'Clinical Study Report LIG-301 (Full)',
    documentType: 'csr-full',
    sourceModule: 'authoring',
    status: 'pending-approval',
    targetSlot: '5.3.5.1',
    targetSlotTitle: 'Controlled Clinical Studies',
    operation: 'new',
    priority: 'critical',
    addedAt: '2026-01-02T17:00:00Z',
    addedBy: 'System',
    sequenceId: 'seq-nda-nexavant-0004',
    productId: 'prod-lig-2847',
    productName: 'Nexavant (LIG-2847)',
    automationEligible: true,
    blockedReason: 'Awaiting final review approval',
    dependencies: []
  },
  {
    id: 'queue-003',
    documentId: 'auth-m274',
    documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
    documentType: 'module-27-4',
    sourceModule: 'generation',
    status: 'blocked',
    targetSlot: '2.7.4',
    targetSlotTitle: 'Summary of Clinical Safety',
    operation: 'new',
    priority: 'high',
    addedAt: '2026-01-02T12:30:00Z',
    addedBy: 'System',
    sequenceId: 'seq-nda-nexavant-0004',
    productId: 'prod-lig-2847',
    productName: 'Nexavant (LIG-2847)',
    automationEligible: false,
    blockedReason: 'Document still in authoring - 65% complete',
    dependencies: [
      { section: 'CSR Section 12', status: 'pending' }
    ]
  },
  {
    id: 'queue-004',
    documentId: 'auth-csr-11',
    documentTitle: 'CSR Section 11 - Efficacy Results',
    documentType: 'csr-efficacy',
    sourceModule: 'generation',
    status: 'integrated',
    targetSlot: '5.3.5.1',
    targetSlotTitle: 'Controlled Clinical Studies',
    operation: 'append',
    priority: 'critical',
    addedAt: '2026-01-02T14:30:00Z',
    processedAt: '2026-01-02T14:35:00Z',
    addedBy: 'System',
    sequenceId: 'seq-nda-nexavant-0004',
    productId: 'prod-lig-2847',
    productName: 'Nexavant (LIG-2847)',
    automationEligible: true,
    dependencies: []
  }
];

// Main Sequence Assembly data for Nexavant NDA
export const nexavantSequenceAssembly: SequenceAssembly = {
  id: 'assembly-nda-nexavant-0004',
  sequenceId: 'seq-nda-nexavant-0004',
  sequenceNumber: '0004',
  applicationId: 'app-nda-nexavant',
  applicationNumber: 'NDA-214987',
  applicationType: 'NDA',
  region: 'FDA',
  productId: 'prod-lig-2847',
  productName: 'Nexavant (LIG-2847)',
  submissionType: 'original',
  targetDate: '2026-01-31',
  status: 'assembling',
  createdAt: '2025-12-01T09:00:00Z',
  lastModified: '2026-01-02T17:30:00Z',
  createdBy: 'Dr. Sarah Chen',
  
  moduleReadiness: [
    {
      module: 'm1',
      label: 'Module 1 - Administrative',
      totalSlots: 12,
      filledSlots: 10,
      readySlots: 2,
      blockedSlots: 0,
      percentComplete: 83
    },
    {
      module: 'm2',
      label: 'Module 2 - CTD Summaries',
      totalSlots: 8,
      filledSlots: 4,
      readySlots: 2,
      blockedSlots: 2,
      percentComplete: 50
    },
    {
      module: 'm3',
      label: 'Module 3 - Quality',
      totalSlots: 15,
      filledSlots: 15,
      readySlots: 0,
      blockedSlots: 0,
      percentComplete: 100
    },
    {
      module: 'm4',
      label: 'Module 4 - Nonclinical',
      totalSlots: 10,
      filledSlots: 10,
      readySlots: 0,
      blockedSlots: 0,
      percentComplete: 100
    },
    {
      module: 'm5',
      label: 'Module 5 - Clinical',
      totalSlots: 18,
      filledSlots: 12,
      readySlots: 4,
      blockedSlots: 2,
      percentComplete: 67
    }
  ],
  
  slots: [...module2Slots, ...module5Slots],
  pendingDocuments: nexavantSourceDocuments.filter(d => d.status === 'approved' || d.status === 'in-review'),
  integrationLog,
  
  totalSlots: 63,
  filledSlots: 51,
  readyToFillSlots: 8,
  blockedSlots: 4,
  overallReadiness: 81,
  estimatedTotalPages: 2850,
  actualPages: 2340
};

// Dashboard summary
export const assemblyDashboardSummary: AssemblyDashboardSummary = {
  totalSequencesInAssembly: 3,
  documentsReadyToIntegrate: 4,
  documentsIntegratedToday: 2,
  sequencesReadyForValidation: 1,
  blockedItems: 4,
  averageReadinessScore: 78,
  upcomingDeadlines: [
    {
      sequenceId: 'seq-nda-nexavant-0004',
      applicationNumber: 'NDA-214987',
      targetDate: '2026-01-31',
      daysRemaining: 29
    },
    {
      sequenceId: 'seq-bla-lig2850-0002',
      applicationNumber: 'BLA-765432',
      targetDate: '2026-02-15',
      daysRemaining: 44
    },
    {
      sequenceId: 'seq-ind-lig2855-0001',
      applicationNumber: 'IND-145678',
      targetDate: '2026-03-01',
      daysRemaining: 58
    }
  ]
};

// Export assembly queue
export const submissionAssemblyQueue = assemblyQueue;

// Export source documents
export const assemblySourceDocuments = nexavantSourceDocuments;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSlotsByModule(assembly: SequenceAssembly, module: string): ECTDSlot[] {
  return assembly.slots.filter(s => s.ctdModule === module);
}

export function getSlotsByStatus(assembly: SequenceAssembly, status: SlotStatus): ECTDSlot[] {
  return assembly.slots.filter(s => s.status === status);
}

export function getReadyToIntegrate(assembly: SequenceAssembly): ECTDSlot[] {
  return assembly.slots.filter(s => s.status === 'ready');
}

export function getBlockedSlots(assembly: SequenceAssembly): ECTDSlot[] {
  return assembly.slots.filter(s => s.status === 'blocked');
}

export function getPendingDocuments(assembly: SequenceAssembly): SourceDocument[] {
  return assembly.pendingDocuments.filter(d => 
    d.status === 'approved' && 
    !assembly.slots.some(s => s.assignedDocument === d.documentId && s.status === 'filled')
  );
}

export function getQueueByStatus(status: AssemblyQueueItem['status']): AssemblyQueueItem[] {
  return submissionAssemblyQueue.filter(q => q.status === status);
}

export function getQueueByPriority(priority: AssemblyQueueItem['priority']): AssemblyQueueItem[] {
  return submissionAssemblyQueue.filter(q => q.priority === priority);
}

export function getRecentIntegrations(assembly: SequenceAssembly, hours: number = 24): IntegrationLogEntry[] {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  return assembly.integrationLog.filter(log => new Date(log.timestamp) > cutoff);
}

export function getModuleReadiness(assembly: SequenceAssembly, module: string) {
  return assembly.moduleReadiness.find(m => m.module === module);
}

export function calculateOverallReadiness(assembly: SequenceAssembly): number {
  return Math.round((assembly.filledSlots / assembly.totalSlots) * 100);
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

export const slotStatusConfig: Record<SlotStatus, { label: string; color: string; bgColor: string }> = {
  'empty': { label: 'Empty', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  'pending': { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  'ready': { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'filled': { label: 'Filled', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'blocked': { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/10' }
};

export const documentReadinessConfig: Record<DocumentReadinessStatus, { label: string; color: string; bgColor: string }> = {
  'not-started': { label: 'Not Started', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  'in-authoring': { label: 'In Authoring', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  'in-review': { label: 'In Review', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  'approved': { label: 'Approved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'integrated': { label: 'Integrated', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'needs-update': { label: 'Needs Update', color: 'text-orange-400', bgColor: 'bg-orange-500/10' }
};

export const integrationActionConfig: Record<IntegrationAction, { label: string; icon: string }> = {
  'auto-placed': { label: 'Auto-Placed', icon: 'Zap' },
  'manual-placed': { label: 'Manually Placed', icon: 'User' },
  'replaced': { label: 'Replaced', icon: 'RefreshCw' },
  'appended': { label: 'Appended', icon: 'Plus' },
  'pending': { label: 'Pending', icon: 'Clock' }
};
