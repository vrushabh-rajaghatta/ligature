// Document Generation Data - v0.6.5
// "Database lock today, CSR sections tomorrow."
// Clinical Data → Document Generation - showing how data flows into documents

// ============================================================================
// DOCUMENT GENERATION TYPES
// ============================================================================

export type GenerationTriggerType = 
  | 'database-lock'        // Final DB lock triggers CSR generation
  | 'interim-analysis'     // Interim analysis triggers summary updates
  | 'safety-update'        // Safety data triggers PBRER/PSUR sections
  | 'protocol-amendment'   // Amendment triggers IB/protocol updates
  | 'study-completion'     // Study close triggers final reports
  | 'regulatory-request';  // HAQ/IR triggers response documents

export type GenerationStatus = 
  | 'ready'                // Ready to generate
  | 'generating'           // AI actively generating content
  | 'review-required'      // Generated, needs SME review
  | 'in-review'            // Under SME review
  | 'approved'             // Reviewed and approved
  | 'integrated'           // Merged into final document
  | 'blocked';             // Missing prerequisite data

export type GeneratedContentType = 
  | 'narrative'            // Text narrative (efficacy conclusions, safety summaries)
  | 'table'                // Data table (demographics, AE summary, efficacy results)
  | 'figure'               // Chart/graph (Kaplan-Meier, waterfall, forest plot)
  | 'listing'              // Data listing (SAE narratives, protocol deviations)
  | 'appendix';            // Supporting appendix content

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface SourceDataLink {
  id: string;
  datasetName: string;            // e.g., 'ADSL', 'ADAE', 'ADTTE'
  datasetType: 'SDTM' | 'ADaM' | 'TLF' | 'Raw';
  recordCount: number;
  lastUpdated: string;
  lockStatus: 'locked' | 'unlocked' | 'pending';
  validationStatus: 'passed' | 'warnings' | 'failed';
}

export interface GeneratedSection {
  id: string;
  sectionId: string;
  sectionNumber: string;          // e.g., '11.1', '12.2.1'
  sectionTitle: string;
  contentType: GeneratedContentType;
  status: GenerationStatus;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;        // 0-100
  sourceData: SourceDataLink[];
  generatedAt?: string;
  generatedBy: 'ai' | 'template' | 'manual';
  wordCount?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  highlightedAreas: string[];     // Areas needing SME attention
  changesSinceSource: number;     // Manual edits since generation
}

export interface GeneratedTable {
  id: string;
  tableNumber: string;            // e.g., 'Table 14.1.1'
  tableTitle: string;
  status: GenerationStatus;
  sourceDataset: string;
  rowCount: number;
  columnCount: number;
  generatedAt?: string;
  footnotes: string[];
  validationIssues: string[];
}

export interface GeneratedFigure {
  id: string;
  figureNumber: string;           // e.g., 'Figure 14.2.1'
  figureTitle: string;
  figureType: 'kaplan-meier' | 'forest-plot' | 'waterfall' | 'bar-chart' | 'line-chart' | 'scatter' | 'other';
  status: GenerationStatus;
  sourceDataset: string;
  generatedAt?: string;
}

export interface DocumentGenerationJob {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: 'csr' | 'module-25' | 'module-27-3' | 'module-27-4' | 'module-26' | 'pbrer' | 'psur' | 'ib';
  ctdSection?: string;
  triggerType: GenerationTriggerType;
  triggerEventId: string;
  triggerEventName: string;
  studyId: string;
  studyName: string;
  productId: string;
  productName: string;
  status: GenerationStatus;
  priority: 'critical' | 'high' | 'standard' | 'low';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  dueDate: string;
  assignedTo?: string;
  assignedToName?: string;
  totalSections: number;
  completedSections: number;
  totalTables: number;
  completedTables: number;
  totalFigures: number;
  completedFigures: number;
  overallConfidence: ConfidenceLevel;
  overallConfidenceScore: number;
  sections: GeneratedSection[];
  tables: GeneratedTable[];
  figures: GeneratedFigure[];
  sourceDatasets: SourceDataLink[];
  estimatedEffort: string;
  actualEffort?: string;
  automationRate: number;         // Percentage auto-generated vs manual
}

export interface GenerationQueueSummary {
  totalJobs: number;
  readyToGenerate: number;
  generating: number;
  reviewRequired: number;
  inReview: number;
  approved: number;
  blocked: number;
  totalSectionsGenerated: number;
  totalTablesGenerated: number;
  totalFiguresGenerated: number;
  averageConfidenceScore: number;
  averageAutomationRate: number;
}

// ============================================================================
// GENERATION TEMPLATE DEFINITIONS
// ============================================================================

export interface GenerationTemplate {
  id: string;
  name: string;
  documentType: DocumentGenerationJob['documentType'];
  description: string;
  sections: {
    sectionNumber: string;
    sectionTitle: string;
    contentTypes: GeneratedContentType[];
    requiredDatasets: string[];
    automatable: boolean;
    estimatedMinutes: number;
  }[];
}

export const generationTemplates: GenerationTemplate[] = [
  {
    id: 'tmpl-csr-efficacy',
    name: 'CSR Section 11 - Efficacy',
    documentType: 'csr',
    description: 'Clinical Study Report efficacy results and analysis',
    sections: [
      { sectionNumber: '11.1', sectionTitle: 'Primary Efficacy Endpoint', contentTypes: ['narrative', 'table', 'figure'], requiredDatasets: ['ADTTE', 'ADSL'], automatable: true, estimatedMinutes: 45 },
      { sectionNumber: '11.2', sectionTitle: 'Secondary Efficacy Endpoints', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADEFF', 'ADSL'], automatable: true, estimatedMinutes: 60 },
      { sectionNumber: '11.3', sectionTitle: 'Exploratory Endpoints', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADEFF'], automatable: true, estimatedMinutes: 30 },
      { sectionNumber: '11.4', sectionTitle: 'Efficacy Conclusions', contentTypes: ['narrative'], requiredDatasets: ['ADTTE', 'ADEFF'], automatable: false, estimatedMinutes: 90 },
    ],
  },
  {
    id: 'tmpl-csr-safety',
    name: 'CSR Section 12 - Safety',
    documentType: 'csr',
    description: 'Clinical Study Report safety results and analysis',
    sections: [
      { sectionNumber: '12.1', sectionTitle: 'Extent of Exposure', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADSL', 'ADEX'], automatable: true, estimatedMinutes: 30 },
      { sectionNumber: '12.2', sectionTitle: 'Adverse Events', contentTypes: ['narrative', 'table', 'listing'], requiredDatasets: ['ADAE'], automatable: true, estimatedMinutes: 90 },
      { sectionNumber: '12.2.1', sectionTitle: 'Treatment-Emergent AEs', contentTypes: ['table'], requiredDatasets: ['ADAE'], automatable: true, estimatedMinutes: 20 },
      { sectionNumber: '12.2.2', sectionTitle: 'Serious Adverse Events', contentTypes: ['narrative', 'table', 'listing'], requiredDatasets: ['ADAE'], automatable: true, estimatedMinutes: 45 },
      { sectionNumber: '12.2.3', sectionTitle: 'Deaths', contentTypes: ['narrative', 'listing'], requiredDatasets: ['ADAE', 'ADDS'], automatable: false, estimatedMinutes: 60 },
      { sectionNumber: '12.3', sectionTitle: 'Clinical Laboratory Evaluations', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADLB'], automatable: true, estimatedMinutes: 45 },
      { sectionNumber: '12.4', sectionTitle: 'Vital Signs', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADVS'], automatable: true, estimatedMinutes: 30 },
      { sectionNumber: '12.5', sectionTitle: 'Safety Conclusions', contentTypes: ['narrative'], requiredDatasets: ['ADAE', 'ADLB'], automatable: false, estimatedMinutes: 90 },
    ],
  },
  {
    id: 'tmpl-module-273',
    name: 'Module 2.7.3 - Summary of Clinical Efficacy',
    documentType: 'module-27-3',
    description: 'CTD Module 2.7.3 clinical efficacy summary',
    sections: [
      { sectionNumber: '2.7.3.1', sectionTitle: 'Background and Overview', contentTypes: ['narrative'], requiredDatasets: [], automatable: false, estimatedMinutes: 60 },
      { sectionNumber: '2.7.3.2', sectionTitle: 'Summary of Results', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADTTE', 'ADEFF'], automatable: true, estimatedMinutes: 90 },
      { sectionNumber: '2.7.3.3', sectionTitle: 'Comparison and Analyses', contentTypes: ['narrative', 'figure'], requiredDatasets: ['ADTTE'], automatable: true, estimatedMinutes: 60 },
      { sectionNumber: '2.7.3.4', sectionTitle: 'Analysis of Clinical Information', contentTypes: ['narrative'], requiredDatasets: [], automatable: false, estimatedMinutes: 120 },
    ],
  },
  {
    id: 'tmpl-module-274',
    name: 'Module 2.7.4 - Summary of Clinical Safety',
    documentType: 'module-27-4',
    description: 'CTD Module 2.7.4 clinical safety summary',
    sections: [
      { sectionNumber: '2.7.4.1', sectionTitle: 'Exposure to Drug', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADSL', 'ADEX'], automatable: true, estimatedMinutes: 45 },
      { sectionNumber: '2.7.4.2', sectionTitle: 'Adverse Events', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADAE'], automatable: true, estimatedMinutes: 90 },
      { sectionNumber: '2.7.4.3', sectionTitle: 'Clinical Laboratory Findings', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADLB'], automatable: true, estimatedMinutes: 60 },
      { sectionNumber: '2.7.4.4', sectionTitle: 'Vital Signs and ECG', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADVS', 'ADEG'], automatable: true, estimatedMinutes: 45 },
      { sectionNumber: '2.7.4.5', sectionTitle: 'Safety in Special Groups', contentTypes: ['narrative', 'table'], requiredDatasets: ['ADSL', 'ADAE'], automatable: true, estimatedMinutes: 60 },
      { sectionNumber: '2.7.4.6', sectionTitle: 'Post-Marketing Data', contentTypes: ['narrative'], requiredDatasets: [], automatable: false, estimatedMinutes: 30 },
    ],
  },
];

// ============================================================================
// GOLDEN PATH: NEXAVANT (LIG-2847) DOCUMENT GENERATION DATA
// ============================================================================

// Source datasets from Study LIG-301 ILLUMINATE database lock
export const lig301SourceDatasets: SourceDataLink[] = [
  {
    id: 'ds-adsl-301',
    datasetName: 'ADSL',
    datasetType: 'ADaM',
    recordCount: 847,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-adtte-301',
    datasetName: 'ADTTE',
    datasetType: 'ADaM',
    recordCount: 847,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-adae-301',
    datasetName: 'ADAE',
    datasetType: 'ADaM',
    recordCount: 4892,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-adeff-301',
    datasetName: 'ADEFF',
    datasetType: 'ADaM',
    recordCount: 3247,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-adlb-301',
    datasetName: 'ADLB',
    datasetType: 'ADaM',
    recordCount: 127650,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-advs-301',
    datasetName: 'ADVS',
    datasetType: 'ADaM',
    recordCount: 25410,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
  {
    id: 'ds-adex-301',
    datasetName: 'ADEX',
    datasetType: 'ADaM',
    recordCount: 847,
    lastUpdated: '2026-01-02T09:00:00Z',
    lockStatus: 'locked',
    validationStatus: 'passed',
  },
];

// Document Generation Jobs for Nexavant
export const documentGenerationJobs: DocumentGenerationJob[] = [
  // =========================================================================
  // CSR SECTION 11 - EFFICACY (Study LIG-301)
  // =========================================================================
  {
    id: 'gen-csr-s11-001',
    documentId: 'DOC-CSR-LIG2847-001',
    documentTitle: 'CSR Section 11 - Efficacy Results',
    documentType: 'csr',
    ctdSection: 'Module 5.3.5.1',
    triggerType: 'database-lock',
    triggerEventId: 'DB-LOCK-2026-001',
    triggerEventName: 'Study LIG-301 ILLUMINATE Final Database Lock',
    studyId: 'LIG-301',
    studyName: 'ILLUMINATE - Phase 3 Pivotal',
    productId: 'LIG-2847',
    productName: 'Nexavant (ligatumab)',
    status: 'review-required',
    priority: 'critical',
    createdAt: '2026-01-02T09:00:45Z',
    startedAt: '2026-01-02T09:01:00Z',
    completedAt: '2026-01-02T09:18:32Z',
    dueDate: '2026-01-08T17:00:00Z',
    assignedTo: 'user-maria-santos',
    assignedToName: 'Dr. Maria Santos',
    totalSections: 4,
    completedSections: 3,
    totalTables: 8,
    completedTables: 8,
    totalFigures: 3,
    completedFigures: 3,
    overallConfidence: 'high',
    overallConfidenceScore: 87,
    sections: [
      {
        id: 'sec-11-1',
        sectionId: 'csr-11-1',
        sectionNumber: '11.1',
        sectionTitle: 'Primary Efficacy Endpoint',
        contentType: 'narrative',
        status: 'approved',
        confidenceLevel: 'high',
        confidenceScore: 94,
        sourceData: [
          { id: 'ds-adtte-301', datasetName: 'ADTTE', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:05:22Z',
        generatedBy: 'ai',
        wordCount: 1847,
        reviewedBy: 'Dr. Maria Santos',
        reviewedAt: '2026-01-02T14:30:00Z',
        highlightedAreas: [],
        changesSinceSource: 2,
      },
      {
        id: 'sec-11-2',
        sectionId: 'csr-11-2',
        sectionNumber: '11.2',
        sectionTitle: 'Secondary Efficacy Endpoints',
        contentType: 'narrative',
        status: 'approved',
        confidenceLevel: 'high',
        confidenceScore: 91,
        sourceData: [
          { id: 'ds-adeff-301', datasetName: 'ADEFF', datasetType: 'ADaM', recordCount: 3247, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:08:15Z',
        generatedBy: 'ai',
        wordCount: 2156,
        reviewedBy: 'Dr. Maria Santos',
        reviewedAt: '2026-01-02T15:15:00Z',
        highlightedAreas: [],
        changesSinceSource: 5,
      },
      {
        id: 'sec-11-3',
        sectionId: 'csr-11-3',
        sectionNumber: '11.3',
        sectionTitle: 'Exploratory Endpoints',
        contentType: 'narrative',
        status: 'in-review',
        confidenceLevel: 'high',
        confidenceScore: 88,
        sourceData: [
          { id: 'ds-adeff-301', datasetName: 'ADEFF', datasetType: 'ADaM', recordCount: 3247, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:12:00Z',
        generatedBy: 'ai',
        wordCount: 1423,
        highlightedAreas: ['Biomarker subgroup analysis interpretation'],
        changesSinceSource: 0,
      },
      {
        id: 'sec-11-4',
        sectionId: 'csr-11-4',
        sectionNumber: '11.4',
        sectionTitle: 'Efficacy Conclusions',
        contentType: 'narrative',
        status: 'review-required',
        confidenceLevel: 'medium',
        confidenceScore: 72,
        sourceData: [
          { id: 'ds-adtte-301', datasetName: 'ADTTE', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
          { id: 'ds-adeff-301', datasetName: 'ADEFF', datasetType: 'ADaM', recordCount: 3247, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:18:32Z',
        generatedBy: 'ai',
        wordCount: 892,
        highlightedAreas: [
          'Clinical significance interpretation requires SME input',
          'Comparison to historical controls needs verification',
          'Benefit-risk language pending medical review',
        ],
        changesSinceSource: 0,
      },
    ],
    tables: [
      { id: 'tbl-14-1-1', tableNumber: 'Table 14.1.1', tableTitle: 'Subject Disposition', status: 'approved', sourceDataset: 'ADSL', rowCount: 12, columnCount: 5, generatedAt: '2026-01-02T09:03:00Z', footnotes: ['ITT population', 'Percentages based on randomized subjects'], validationIssues: [] },
      { id: 'tbl-14-1-2', tableNumber: 'Table 14.1.2', tableTitle: 'Demographics and Baseline Characteristics', status: 'approved', sourceDataset: 'ADSL', rowCount: 24, columnCount: 4, generatedAt: '2026-01-02T09:03:30Z', footnotes: ['ITT population'], validationIssues: [] },
      { id: 'tbl-14-2-1', tableNumber: 'Table 14.2.1', tableTitle: 'Primary Endpoint: PFS by Treatment Arm', status: 'approved', sourceDataset: 'ADTTE', rowCount: 8, columnCount: 6, generatedAt: '2026-01-02T09:04:00Z', footnotes: ['Stratified log-rank test', 'HR from Cox model'], validationIssues: [] },
      { id: 'tbl-14-2-2', tableNumber: 'Table 14.2.2', tableTitle: 'PFS Subgroup Analysis', status: 'approved', sourceDataset: 'ADTTE', rowCount: 18, columnCount: 7, generatedAt: '2026-01-02T09:04:30Z', footnotes: ['Forest plot values'], validationIssues: [] },
      { id: 'tbl-14-2-3', tableNumber: 'Table 14.2.3', tableTitle: 'Overall Response Rate', status: 'approved', sourceDataset: 'ADEFF', rowCount: 6, columnCount: 5, generatedAt: '2026-01-02T09:05:00Z', footnotes: ['RECIST 1.1 criteria'], validationIssues: [] },
      { id: 'tbl-14-2-4', tableNumber: 'Table 14.2.4', tableTitle: 'Duration of Response', status: 'approved', sourceDataset: 'ADEFF', rowCount: 8, columnCount: 5, generatedAt: '2026-01-02T09:05:30Z', footnotes: ['Responders only'], validationIssues: [] },
      { id: 'tbl-14-2-5', tableNumber: 'Table 14.2.5', tableTitle: 'Time to Response', status: 'approved', sourceDataset: 'ADEFF', rowCount: 6, columnCount: 4, generatedAt: '2026-01-02T09:06:00Z', footnotes: [], validationIssues: [] },
      { id: 'tbl-14-2-6', tableNumber: 'Table 14.2.6', tableTitle: 'Secondary Endpoints Summary', status: 'approved', sourceDataset: 'ADEFF', rowCount: 12, columnCount: 6, generatedAt: '2026-01-02T09:06:30Z', footnotes: [], validationIssues: [] },
    ],
    figures: [
      { id: 'fig-14-2-1', figureNumber: 'Figure 14.2.1', figureTitle: 'Kaplan-Meier Plot: PFS', figureType: 'kaplan-meier', status: 'approved', sourceDataset: 'ADTTE', generatedAt: '2026-01-02T09:07:00Z' },
      { id: 'fig-14-2-2', figureNumber: 'Figure 14.2.2', figureTitle: 'Forest Plot: PFS Subgroups', figureType: 'forest-plot', status: 'approved', sourceDataset: 'ADTTE', generatedAt: '2026-01-02T09:07:30Z' },
      { id: 'fig-14-2-3', figureNumber: 'Figure 14.2.3', figureTitle: 'Waterfall Plot: Best % Change in Target Lesion', figureType: 'waterfall', status: 'approved', sourceDataset: 'ADEFF', generatedAt: '2026-01-02T09:08:00Z' },
    ],
    sourceDatasets: lig301SourceDatasets.filter(d => ['ADSL', 'ADTTE', 'ADEFF'].includes(d.datasetName)),
    estimatedEffort: '8 hours',
    actualEffort: '2.5 hours',
    automationRate: 78,
  },

  // =========================================================================
  // CSR SECTION 12 - SAFETY (Study LIG-301)
  // =========================================================================
  {
    id: 'gen-csr-s12-001',
    documentId: 'DOC-CSR-LIG2847-001',
    documentTitle: 'CSR Section 12 - Safety Results',
    documentType: 'csr',
    ctdSection: 'Module 5.3.5.1',
    triggerType: 'database-lock',
    triggerEventId: 'DB-LOCK-2026-001',
    triggerEventName: 'Study LIG-301 ILLUMINATE Final Database Lock',
    studyId: 'LIG-301',
    studyName: 'ILLUMINATE - Phase 3 Pivotal',
    productId: 'LIG-2847',
    productName: 'Nexavant (ligatumab)',
    status: 'generating',
    priority: 'critical',
    createdAt: '2026-01-02T09:00:45Z',
    startedAt: '2026-01-02T09:20:00Z',
    dueDate: '2026-01-10T17:00:00Z',
    assignedTo: 'user-james-wilson',
    assignedToName: 'Dr. James Wilson',
    totalSections: 8,
    completedSections: 4,
    totalTables: 12,
    completedTables: 8,
    totalFigures: 2,
    completedFigures: 1,
    overallConfidence: 'medium',
    overallConfidenceScore: 76,
    sections: [
      {
        id: 'sec-12-1',
        sectionId: 'csr-12-1',
        sectionNumber: '12.1',
        sectionTitle: 'Extent of Exposure',
        contentType: 'narrative',
        status: 'approved',
        confidenceLevel: 'high',
        confidenceScore: 95,
        sourceData: [
          { id: 'ds-adex-301', datasetName: 'ADEX', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:22:00Z',
        generatedBy: 'ai',
        wordCount: 945,
        reviewedBy: 'Dr. James Wilson',
        reviewedAt: '2026-01-02T11:00:00Z',
        highlightedAreas: [],
        changesSinceSource: 1,
      },
      {
        id: 'sec-12-2',
        sectionId: 'csr-12-2',
        sectionNumber: '12.2',
        sectionTitle: 'Adverse Events',
        contentType: 'narrative',
        status: 'approved',
        confidenceLevel: 'high',
        confidenceScore: 89,
        sourceData: [
          { id: 'ds-adae-301', datasetName: 'ADAE', datasetType: 'ADaM', recordCount: 4892, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:28:00Z',
        generatedBy: 'ai',
        wordCount: 3421,
        reviewedBy: 'Dr. James Wilson',
        reviewedAt: '2026-01-02T14:00:00Z',
        highlightedAreas: [],
        changesSinceSource: 8,
      },
      {
        id: 'sec-12-2-2',
        sectionId: 'csr-12-2-2',
        sectionNumber: '12.2.2',
        sectionTitle: 'Serious Adverse Events',
        contentType: 'narrative',
        status: 'in-review',
        confidenceLevel: 'high',
        confidenceScore: 85,
        sourceData: [
          { id: 'ds-adae-301', datasetName: 'ADAE', datasetType: 'ADaM', recordCount: 4892, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:35:00Z',
        generatedBy: 'ai',
        wordCount: 1876,
        highlightedAreas: ['47 SAE narratives linked - 12 require additional clinical context'],
        changesSinceSource: 0,
      },
      {
        id: 'sec-12-2-3',
        sectionId: 'csr-12-2-3',
        sectionNumber: '12.2.3',
        sectionTitle: 'Deaths',
        contentType: 'narrative',
        status: 'review-required',
        confidenceLevel: 'medium',
        confidenceScore: 68,
        sourceData: [
          { id: 'ds-adae-301', datasetName: 'ADAE', datasetType: 'ADaM', recordCount: 4892, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:42:00Z',
        generatedBy: 'ai',
        wordCount: 2134,
        highlightedAreas: [
          'Causality assessment requires Safety Physician review',
          '3 deaths pending final adjudication',
          'Narrative summaries need clinical interpretation',
        ],
        changesSinceSource: 0,
      },
      {
        id: 'sec-12-3',
        sectionId: 'csr-12-3',
        sectionNumber: '12.3',
        sectionTitle: 'Clinical Laboratory Evaluations',
        contentType: 'narrative',
        status: 'generating',
        confidenceLevel: 'medium',
        confidenceScore: 75,
        sourceData: [
          { id: 'ds-adlb-301', datasetName: 'ADLB', datasetType: 'ADaM', recordCount: 127650, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedAt: '2026-01-02T09:48:00Z',
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-12-4',
        sectionId: 'csr-12-4',
        sectionNumber: '12.4',
        sectionTitle: 'Vital Signs',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-advs-301', datasetName: 'ADVS', datasetType: 'ADaM', recordCount: 25410, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-12-5',
        sectionId: 'csr-12-5',
        sectionNumber: '12.5',
        sectionTitle: 'Safety in Special Populations',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adsl-301', datasetName: 'ADSL', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
          { id: 'ds-adae-301', datasetName: 'ADAE', datasetType: 'ADaM', recordCount: 4892, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-12-6',
        sectionId: 'csr-12-6',
        sectionNumber: '12.6',
        sectionTitle: 'Safety Conclusions',
        contentType: 'narrative',
        status: 'blocked',
        confidenceLevel: 'low',
        confidenceScore: 0,
        sourceData: [],
        generatedBy: 'manual',
        wordCount: 0,
        highlightedAreas: ['Requires completion of all preceding safety sections'],
        changesSinceSource: 0,
      },
    ],
    tables: [
      { id: 'tbl-14-3-1', tableNumber: 'Table 14.3.1', tableTitle: 'Extent of Exposure', status: 'approved', sourceDataset: 'ADEX', rowCount: 8, columnCount: 4, generatedAt: '2026-01-02T09:21:00Z', footnotes: ['Safety population'], validationIssues: [] },
      { id: 'tbl-14-3-2', tableNumber: 'Table 14.3.2', tableTitle: 'Treatment-Emergent AEs by SOC and PT', status: 'approved', sourceDataset: 'ADAE', rowCount: 156, columnCount: 6, generatedAt: '2026-01-02T09:25:00Z', footnotes: ['MedDRA v25.0', 'Safety population'], validationIssues: [] },
      { id: 'tbl-14-3-3', tableNumber: 'Table 14.3.3', tableTitle: 'AEs by Maximum Severity', status: 'approved', sourceDataset: 'ADAE', rowCount: 45, columnCount: 5, generatedAt: '2026-01-02T09:26:00Z', footnotes: ['CTCAE v5.0'], validationIssues: [] },
      { id: 'tbl-14-3-4', tableNumber: 'Table 14.3.4', tableTitle: 'Drug-Related AEs', status: 'approved', sourceDataset: 'ADAE', rowCount: 78, columnCount: 5, generatedAt: '2026-01-02T09:27:00Z', footnotes: ['Investigator assessment'], validationIssues: [] },
      { id: 'tbl-14-3-5', tableNumber: 'Table 14.3.5', tableTitle: 'Serious Adverse Events', status: 'approved', sourceDataset: 'ADAE', rowCount: 47, columnCount: 7, generatedAt: '2026-01-02T09:32:00Z', footnotes: ['Safety population'], validationIssues: [] },
      { id: 'tbl-14-3-6', tableNumber: 'Table 14.3.6', tableTitle: 'Deaths', status: 'approved', sourceDataset: 'ADAE', rowCount: 12, columnCount: 6, generatedAt: '2026-01-02T09:38:00Z', footnotes: ['All deaths on study'], validationIssues: [] },
      { id: 'tbl-14-3-7', tableNumber: 'Table 14.3.7', tableTitle: 'AEs Leading to Discontinuation', status: 'approved', sourceDataset: 'ADAE', rowCount: 34, columnCount: 5, generatedAt: '2026-01-02T09:40:00Z', footnotes: [], validationIssues: [] },
      { id: 'tbl-14-3-8', tableNumber: 'Table 14.3.8', tableTitle: 'AEs of Special Interest', status: 'approved', sourceDataset: 'ADAE', rowCount: 28, columnCount: 6, generatedAt: '2026-01-02T09:41:00Z', footnotes: ['Hepatotoxicity, infusion reactions, infections'], validationIssues: [] },
      { id: 'tbl-14-3-9', tableNumber: 'Table 14.3.9', tableTitle: 'Clinical Laboratory Abnormalities', status: 'generating', sourceDataset: 'ADLB', rowCount: 0, columnCount: 0, generatedAt: undefined, footnotes: [], validationIssues: [] },
      { id: 'tbl-14-3-10', tableNumber: 'Table 14.3.10', tableTitle: 'Hepatic Laboratory Parameters', status: 'ready', sourceDataset: 'ADLB', rowCount: 0, columnCount: 0, generatedAt: undefined, footnotes: [], validationIssues: [] },
      { id: 'tbl-14-3-11', tableNumber: 'Table 14.3.11', tableTitle: 'Vital Signs Summary', status: 'ready', sourceDataset: 'ADVS', rowCount: 0, columnCount: 0, generatedAt: undefined, footnotes: [], validationIssues: [] },
      { id: 'tbl-14-3-12', tableNumber: 'Table 14.3.12', tableTitle: 'Safety by Age Subgroup', status: 'ready', sourceDataset: 'ADAE', rowCount: 0, columnCount: 0, generatedAt: undefined, footnotes: [], validationIssues: [] },
    ],
    figures: [
      { id: 'fig-14-3-1', figureNumber: 'Figure 14.3.1', figureTitle: 'Time to First AE of Special Interest', figureType: 'kaplan-meier', status: 'approved', sourceDataset: 'ADAE', generatedAt: '2026-01-02T09:30:00Z' },
      { id: 'fig-14-3-2', figureNumber: 'Figure 14.3.2', figureTitle: 'Laboratory Parameters Over Time', figureType: 'line-chart', status: 'generating', sourceDataset: 'ADLB', generatedAt: undefined },
    ],
    sourceDatasets: lig301SourceDatasets.filter(d => ['ADSL', 'ADAE', 'ADLB', 'ADVS', 'ADEX'].includes(d.datasetName)),
    estimatedEffort: '12 hours',
    automationRate: 72,
  },

  // =========================================================================
  // MODULE 2.7.3 - SUMMARY OF CLINICAL EFFICACY
  // =========================================================================
  {
    id: 'gen-m273-001',
    documentId: 'DOC-M273-LIG2847-001',
    documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
    documentType: 'module-27-3',
    ctdSection: 'Module 2.7.3',
    triggerType: 'database-lock',
    triggerEventId: 'DB-LOCK-2026-001',
    triggerEventName: 'Study LIG-301 ILLUMINATE Final Database Lock',
    studyId: 'LIG-301',
    studyName: 'ILLUMINATE - Phase 3 Pivotal',
    productId: 'LIG-2847',
    productName: 'Nexavant (ligatumab)',
    status: 'ready',
    priority: 'critical',
    createdAt: '2026-01-02T09:35:05Z',
    dueDate: '2026-01-22T17:00:00Z',
    assignedTo: 'user-mw-lead',
    assignedToName: 'Medical Writing Lead',
    totalSections: 4,
    completedSections: 0,
    totalTables: 6,
    completedTables: 0,
    totalFigures: 4,
    completedFigures: 0,
    overallConfidence: 'medium',
    overallConfidenceScore: 0,
    sections: [
      {
        id: 'sec-273-1',
        sectionId: 'm273-1',
        sectionNumber: '2.7.3.1',
        sectionTitle: 'Background and Overview of Clinical Efficacy',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: ['Requires CSR Section 11 completion for source data'],
        changesSinceSource: 0,
      },
      {
        id: 'sec-273-2',
        sectionId: 'm273-2',
        sectionNumber: '2.7.3.2',
        sectionTitle: 'Summary of Results of Individual Studies',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adtte-301', datasetName: 'ADTTE', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-273-3',
        sectionId: 'm273-3',
        sectionNumber: '2.7.3.3',
        sectionTitle: 'Comparison and Analyses of Results Across Studies',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-273-4',
        sectionId: 'm273-4',
        sectionNumber: '2.7.3.4',
        sectionTitle: 'Analysis of Clinical Information Relevant to Dosing',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'low',
        confidenceScore: 0,
        sourceData: [],
        generatedBy: 'manual',
        wordCount: 0,
        highlightedAreas: ['Complex clinical interpretation - manual authoring recommended'],
        changesSinceSource: 0,
      },
    ],
    tables: [],
    figures: [],
    sourceDatasets: lig301SourceDatasets.filter(d => ['ADTTE', 'ADEFF'].includes(d.datasetName)),
    estimatedEffort: '16 hours',
    automationRate: 65,
  },

  // =========================================================================
  // MODULE 2.7.4 - SUMMARY OF CLINICAL SAFETY
  // =========================================================================
  {
    id: 'gen-m274-001',
    documentId: 'DOC-M274-LIG2847-001',
    documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
    documentType: 'module-27-4',
    ctdSection: 'Module 2.7.4',
    triggerType: 'database-lock',
    triggerEventId: 'DB-LOCK-2026-001',
    triggerEventName: 'Study LIG-301 ILLUMINATE Final Database Lock',
    studyId: 'LIG-301',
    studyName: 'ILLUMINATE - Phase 3 Pivotal',
    productId: 'LIG-2847',
    productName: 'Nexavant (ligatumab)',
    status: 'ready',
    priority: 'critical',
    createdAt: '2026-01-02T09:35:10Z',
    dueDate: '2026-01-25T17:00:00Z',
    assignedTo: 'user-james-wilson',
    assignedToName: 'Dr. James Wilson',
    totalSections: 6,
    completedSections: 0,
    totalTables: 8,
    completedTables: 0,
    totalFigures: 2,
    completedFigures: 0,
    overallConfidence: 'medium',
    overallConfidenceScore: 0,
    sections: [
      {
        id: 'sec-274-1',
        sectionId: 'm274-1',
        sectionNumber: '2.7.4.1',
        sectionTitle: 'Exposure to Drug',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'high',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adex-301', datasetName: 'ADEX', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-274-2',
        sectionId: 'm274-2',
        sectionNumber: '2.7.4.2',
        sectionTitle: 'Adverse Events',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'high',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adae-301', datasetName: 'ADAE', datasetType: 'ADaM', recordCount: 4892, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-274-3',
        sectionId: 'm274-3',
        sectionNumber: '2.7.4.3',
        sectionTitle: 'Clinical Laboratory Findings',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'high',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adlb-301', datasetName: 'ADLB', datasetType: 'ADaM', recordCount: 127650, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-274-4',
        sectionId: 'm274-4',
        sectionNumber: '2.7.4.4',
        sectionTitle: 'Vital Signs, Physical Findings, and ECG',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'high',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-advs-301', datasetName: 'ADVS', datasetType: 'ADaM', recordCount: 25410, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-274-5',
        sectionId: 'm274-5',
        sectionNumber: '2.7.4.5',
        sectionTitle: 'Safety in Special Groups and Situations',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'medium',
        confidenceScore: 0,
        sourceData: [
          { id: 'ds-adsl-301', datasetName: 'ADSL', datasetType: 'ADaM', recordCount: 847, lastUpdated: '2026-01-02T09:00:00Z', lockStatus: 'locked', validationStatus: 'passed' },
        ],
        generatedBy: 'ai',
        wordCount: 0,
        highlightedAreas: [],
        changesSinceSource: 0,
      },
      {
        id: 'sec-274-6',
        sectionId: 'm274-6',
        sectionNumber: '2.7.4.6',
        sectionTitle: 'Post-Marketing Data',
        contentType: 'narrative',
        status: 'ready',
        confidenceLevel: 'low',
        confidenceScore: 0,
        sourceData: [],
        generatedBy: 'manual',
        wordCount: 0,
        highlightedAreas: ['No post-marketing data - section will state "Not applicable"'],
        changesSinceSource: 0,
      },
    ],
    tables: [],
    figures: [],
    sourceDatasets: lig301SourceDatasets.filter(d => ['ADSL', 'ADAE', 'ADLB', 'ADVS', 'ADEX'].includes(d.datasetName)),
    estimatedEffort: '20 hours',
    automationRate: 70,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getGenerationQueueSummary(): GenerationQueueSummary {
  const jobs = documentGenerationJobs;
  
  const statusCounts = {
    ready: 0,
    generating: 0,
    'review-required': 0,
    'in-review': 0,
    approved: 0,
    integrated: 0,
    blocked: 0,
  };
  
  let totalSections = 0;
  let totalTables = 0;
  let totalFigures = 0;
  let totalConfidence = 0;
  let totalAutomation = 0;
  let jobsWithConfidence = 0;
  
  jobs.forEach(job => {
    statusCounts[job.status]++;
    totalSections += job.completedSections;
    totalTables += job.completedTables;
    totalFigures += job.completedFigures;
    if (job.overallConfidenceScore > 0) {
      totalConfidence += job.overallConfidenceScore;
      jobsWithConfidence++;
    }
    totalAutomation += job.automationRate;
  });
  
  return {
    totalJobs: jobs.length,
    readyToGenerate: statusCounts.ready,
    generating: statusCounts.generating,
    reviewRequired: statusCounts['review-required'],
    inReview: statusCounts['in-review'],
    approved: statusCounts.approved,
    blocked: statusCounts.blocked,
    totalSectionsGenerated: totalSections,
    totalTablesGenerated: totalTables,
    totalFiguresGenerated: totalFigures,
    averageConfidenceScore: jobsWithConfidence > 0 ? Math.round(totalConfidence / jobsWithConfidence) : 0,
    averageAutomationRate: Math.round(totalAutomation / jobs.length),
  };
}

export function getJobsByStatus(status: GenerationStatus): DocumentGenerationJob[] {
  return documentGenerationJobs.filter(job => job.status === status);
}

export function getJobsByTrigger(triggerType: GenerationTriggerType): DocumentGenerationJob[] {
  return documentGenerationJobs.filter(job => job.triggerType === triggerType);
}

export function getJobById(jobId: string): DocumentGenerationJob | undefined {
  return documentGenerationJobs.find(job => job.id === jobId);
}

export function getJobsForProduct(productId: string): DocumentGenerationJob[] {
  return documentGenerationJobs.filter(job => job.productId === productId);
}

export function getJobsForStudy(studyId: string): DocumentGenerationJob[] {
  return documentGenerationJobs.filter(job => job.studyId === studyId);
}

export function getSectionsNeedingReview(): GeneratedSection[] {
  const sections: GeneratedSection[] = [];
  documentGenerationJobs.forEach(job => {
    job.sections.forEach(section => {
      if (section.status === 'review-required' || section.status === 'in-review') {
        sections.push(section);
      }
    });
  });
  return sections;
}

export function getGenerationMetrics() {
  const summary = getGenerationQueueSummary();
  return {
    documentsInQueue: summary.totalJobs,
    sectionsGenerated: summary.totalSectionsGenerated,
    tablesGenerated: summary.totalTablesGenerated,
    figuresGenerated: summary.totalFiguresGenerated,
    avgConfidence: summary.averageConfidenceScore,
    automationRate: summary.averageAutomationRate,
    reviewPending: summary.reviewRequired + summary.inReview,
  };
}

// Status configuration for UI
export const generationStatusConfig: Record<GenerationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  ready: { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: 'PlayCircle' },
  generating: { label: 'Generating', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: 'Sparkles' },
  'review-required': { label: 'Review Required', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: 'AlertCircle' },
  'in-review': { label: 'In Review', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', icon: 'Eye' },
  approved: { label: 'Approved', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: 'CheckCircle' },
  integrated: { label: 'Integrated', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: 'FileCheck' },
  blocked: { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: 'XCircle' },
};

export const confidenceLevelConfig: Record<ConfidenceLevel, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High Confidence', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  medium: { label: 'Medium Confidence', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  low: { label: 'Low Confidence', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export const contentTypeConfig: Record<GeneratedContentType, { label: string; icon: string }> = {
  narrative: { label: 'Narrative', icon: 'FileText' },
  table: { label: 'Table', icon: 'Table' },
  figure: { label: 'Figure', icon: 'BarChart3' },
  listing: { label: 'Listing', icon: 'List' },
  appendix: { label: 'Appendix', icon: 'Paperclip' },
};
