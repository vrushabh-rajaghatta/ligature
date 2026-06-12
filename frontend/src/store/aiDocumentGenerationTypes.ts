
// ============================================================================
// AI Document Generation Engine Types - v194
// Comprehensive AI-powered regulatory document authoring with source linking,
// structured content generation, and submission-ready output
// ============================================================================

import { DocumentType, CTDSection } from '@/types/authoring';

// ============================================================================
// GENERATION WORKFLOW
// ============================================================================

export type GenerationWorkflowStatus =
  | 'configuring'        // Setting up generation parameters
  | 'source-selection'   // Selecting source documents
  | 'validating'         // Validating sources and prerequisites
  | 'generating'         // AI generation in progress
  | 'reviewing'          // Human review of generated content
  | 'refining'           // Iterating on specific sections
  | 'quality-check'      // Running quality/compliance checks
  | 'finalizing'         // Final approval
  | 'complete'           // Generation complete
  | 'failed';            // Generation failed

export type GenerationMode =
  | 'full-document'      // Generate entire document
  | 'section'            // Generate single section
  | 'subsection'         // Generate subsection
  | 'outline-first'      // Generate outline, then expand
  | 'iterative'          // Section-by-section with review
  | 'collaborative';     // AI + human interleaved

export type ContentStyle =
  | 'regulatory-formal'  // Full regulatory language
  | 'regulatory-concise' // Shorter regulatory style
  | 'scientific'         // Scientific publication style
  | 'executive-summary'  // High-level summary
  | 'patient-friendly';  // Plain language

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: DocumentType;
  ctdSection: CTDSection;
  
  // Template structure
  sections: TemplateSection[];
  
  // AI configuration
  aiEnabled: boolean;
  defaultMode: GenerationMode;
  defaultStyle: ContentStyle;
  
  // Source requirements
  requiredSourceTypes: SourceCategory[];
  recommendedSourceTypes: SourceCategory[];
  
  // Regulatory context
  ichGuidelines: string[];
  fdaGuidance: string[];
  emaGuidance: string[];
  
  // Quality requirements
  qualityStandard: 'ich-e3' | 'ich-m4' | 'ich-s' | 'custom';
  styleGuide: 'ama-11' | 'apa-7' | 'icmje' | 'custom';
  
  // Metadata
  version: string;
  lastUpdated: string;
  author: string;
}

export interface TemplateSection {
  id: string;
  number: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  
  // Content guidance
  guidance: string;
  requiredElements: string[];
  optionalElements: string[];
  
  // AI generation
  aiGeneratable: boolean;
  estimatedWordCount: { min: number; max: number };
  requiredSources: SourceCategory[];
  
  // Example content
  exampleContent?: string;
  
  // Child sections
  children: TemplateSection[];
}

// ============================================================================
// SOURCE DOCUMENT MANAGEMENT
// ============================================================================

export type SourceCategory =
  | 'clinical-study-report'
  | 'clinical-study-protocol'
  | 'statistical-analysis-plan'
  | 'statistical-report'
  | 'safety-narrative'
  | 'safety-database'
  | 'efficacy-tables'
  | 'pk-report'
  | 'pk-model'
  | 'biomarker-data'
  | 'nonclinical-pharmacology'
  | 'nonclinical-pk'
  | 'toxicology-report'
  | 'carcinogenicity-study'
  | 'genotoxicity-study'
  | 'reproductive-toxicity'
  | 'cmc-drug-substance'
  | 'cmc-drug-product'
  | 'stability-data'
  | 'manufacturing-process'
  | 'analytical-methods'
  | 'literature-review'
  | 'competitive-intelligence'
  | 'regulatory-guidance'
  | 'previous-submission'
  | 'agency-correspondence'
  | 'investigator-brochure'
  | 'labeling-current'
  | 'labeling-proposed'
  | 'advisory-committee'
  | 'risk-management-plan';

export interface SourceDocument {
  id: string;
  
  // Identification
  title: string;
  shortTitle?: string;
  documentNumber?: string;
  version: string;
  
  // Classification
  category: SourceCategory;
  documentType: string;
  
  // Content
  filePath?: string;
  fileSize?: number;
  pageCount?: number;
  wordCount?: number;
  
  // Structure (for navigation)
  sections: SourceSection[];
  tables: SourceTable[];
  figures: SourceFigure[];
  
  // Metadata
  author: string;
  createdDate: string;
  modifiedDate: string;
  effectiveDate?: string;
  
  // Study context
  productId?: string;
  productName?: string;
  studyId?: string;
  studyName?: string;
  
  // Processing status
  indexed: boolean;
  indexedDate?: string;
  embeddingsGenerated: boolean;
  extractedData?: ExtractedData;
  
  // Usage tracking
  citationCount: number;
  lastCited?: string;
}

export interface SourceSection {
  id: string;
  number: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  content?: string;
  summary?: string;
}

export interface SourceTable {
  id: string;
  number: string;
  title: string;
  page: number;
  columns: string[];
  rowCount: number;
  hasFootnotes: boolean;
  extractedData?: TableData;
}

export interface SourceFigure {
  id: string;
  number: string;
  title: string;
  page: number;
  figureType: 'chart' | 'diagram' | 'image' | 'kaplan-meier' | 'forest-plot' | 'other';
  description?: string;
}

export interface ExtractedData {
  keyFindings: string[];
  primaryEndpoints: EndpointData[];
  safetySignals: SafetySignal[];
  demographics: DemographicData;
  statisticalResults: StatisticalResult[];
}

export interface EndpointData {
  name: string;
  type: 'primary' | 'secondary' | 'exploratory';
  result: string;
  pValue?: string;
  confidenceInterval?: string;
  hazardRatio?: string;
}

export interface SafetySignal {
  term: string;
  category: string;
  treatmentIncidence: string;
  controlIncidence: string;
  riskDifference?: string;
}

export interface DemographicData {
  totalN: number;
  treatmentN: number;
  controlN: number;
  meanAge?: number;
  ageRange?: string;
  malePercent?: number;
}

export interface StatisticalResult {
  parameter: string;
  estimate: string;
  ci95: string;
  pValue: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  footnotes: string[];
}

// ============================================================================
// GENERATION SESSION
// ============================================================================

export interface GenerationSession {
  id: string;
  
  // Configuration
  documentType: DocumentType;
  templateId: string;
  mode: GenerationMode;
  style: ContentStyle;
  
  // Context
  productId: string;
  productName: string;
  studyId?: string;
  studyName?: string;
  indication?: string;
  
  // Sources
  selectedSources: SourceDocument[];
  sourceMapping: SourceMapping[];
  
  // Progress
  status: GenerationWorkflowStatus;
  currentSectionId?: string;
  sectionsCompleted: string[];
  sectionsPending: string[];
  
  // Generated content
  generatedSections: GeneratedSection[];
  outline?: DocumentOutline;
  
  // Quality
  qualityScore?: number;
  complianceIssues: ComplianceIssue[];
  
  // Statistics
  totalWordCount: number;
  totalCitations: number;
  tokensUsed: number;
  estimatedCost: number;
  
  // Timing
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
  
  // Audit
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface SourceMapping {
  sectionId: string;
  sourceIds: string[];
  requiredCoverage: boolean;
}

export interface DocumentOutline {
  sections: OutlineSection[];
  estimatedWordCount: number;
  estimatedPages: number;
}

export interface OutlineSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  keyPoints: string[];
  estimatedWordCount: number;
  sourcesUsed: string[];
  children: OutlineSection[];
}

export interface GeneratedSection {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  
  // Content
  content: string;
  wordCount: number;
  
  // Citations
  citations: Citation[];
  
  // Quality
  qualityScore: number;
  complianceIssues: ComplianceIssue[];
  suggestions: string[];
  
  // Generation metadata
  modelUsed: string;
  tokensUsed: number;
  generatedAt: string;
  generationTimeMs: number;
  
  // Review status
  status: 'generated' | 'reviewed' | 'approved' | 'rejected' | 'regenerated';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  
  // Version tracking
  version: number;
  previousVersions: GeneratedSectionVersion[];
}

export interface GeneratedSectionVersion {
  version: number;
  content: string;
  generatedAt: string;
  reason: string;
}

export interface Citation {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceSectionId?: string;
  sourceSectionTitle?: string;
  pageNumber?: number;
  inTextReference: string;
  context: string;
  verified: boolean;
}

export interface ComplianceIssue {
  id: string;
  type: 'ich' | 'ama' | 'fda' | 'ema' | 'structure' | 'content' | 'citation';
  severity: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  location: string;
  sectionId?: string;
  suggestion?: string;
  autoFixable: boolean;
}

// ============================================================================
// MODULE 2 SPECIFIC TYPES
// ============================================================================

export type Module2Section = 
  | '2.4'      // Nonclinical Overview
  | '2.5'      // Clinical Overview
  | '2.7.1'    // Summary of Biopharmaceutic Studies
  | '2.7.2'    // Summary of Clinical Pharmacology Studies
  | '2.7.3'    // Summary of Clinical Efficacy
  | '2.7.4'    // Summary of Clinical Safety
  | '2.7.5'    // Literature References
  | '2.7.6';   // Synopses of Individual Studies

export interface Module2GenerationConfig {
  section: Module2Section;
  title: string;
  
  // Content requirements
  requiredSubsections: string[];
  optionalSubsections: string[];
  
  // Source mapping
  primarySources: SourceCategory[];
  secondarySources: SourceCategory[];
  
  // ICH guidance
  ichE3Sections: string[];
  
  // Word count guidance
  typicalWordCount: { min: number; max: number };
  
  // Cross-references
  crossReferences: {
    module: string;
    section: string;
    description: string;
  }[];
}

export const MODULE_2_CONFIGS: Record<Module2Section, Module2GenerationConfig> = {
  '2.4': {
    section: '2.4',
    title: 'Nonclinical Overview',
    requiredSubsections: [
      'Overview of Nonclinical Testing Strategy',
      'Pharmacology',
      'Pharmacokinetics',
      'Toxicology',
      'Integrated Overview and Conclusions',
    ],
    optionalSubsections: ['Carcinogenicity', 'Reproductive Toxicity'],
    primarySources: ['nonclinical-pharmacology', 'nonclinical-pk', 'toxicology-report'],
    secondarySources: ['carcinogenicity-study', 'genotoxicity-study', 'reproductive-toxicity'],
    ichE3Sections: [],
    typicalWordCount: { min: 5000, max: 15000 },
    crossReferences: [
      { module: 'Module 4', section: '4.2', description: 'Study Reports' },
    ],
  },
  '2.5': {
    section: '2.5',
    title: 'Clinical Overview',
    requiredSubsections: [
      'Product Development Rationale',
      'Overview of Biopharmaceutics',
      'Overview of Clinical Pharmacology',
      'Overview of Efficacy',
      'Overview of Safety',
      'Benefits and Risks Conclusions',
    ],
    optionalSubsections: ['Literature References'],
    primarySources: ['clinical-study-report', 'investigator-brochure', 'statistical-report'],
    secondarySources: ['pk-report', 'safety-database', 'literature-review'],
    ichE3Sections: [],
    typicalWordCount: { min: 15000, max: 40000 },
    crossReferences: [
      { module: 'Module 2', section: '2.7', description: 'Clinical Summary' },
      { module: 'Module 5', section: '5.3', description: 'Clinical Study Reports' },
    ],
  },
  '2.7.1': {
    section: '2.7.1',
    title: 'Summary of Biopharmaceutic Studies and Associated Analytical Methods',
    requiredSubsections: [
      'Background and Overview',
      'Summary of Results',
      'Comparison and Analyses',
      'Discussion and Conclusions',
    ],
    optionalSubsections: [],
    primarySources: ['pk-report', 'analytical-methods'],
    secondarySources: ['clinical-study-report'],
    ichE3Sections: [],
    typicalWordCount: { min: 3000, max: 10000 },
    crossReferences: [],
  },
  '2.7.2': {
    section: '2.7.2',
    title: 'Summary of Clinical Pharmacology Studies',
    requiredSubsections: [
      'Background and Overview',
      'Summary of Results',
      'Comparison and Analyses',
      'Special Populations',
      'Discussion and Conclusions',
    ],
    optionalSubsections: ['Drug Interactions'],
    primarySources: ['pk-report', 'pk-model', 'clinical-study-report'],
    secondarySources: ['biomarker-data'],
    ichE3Sections: [],
    typicalWordCount: { min: 5000, max: 15000 },
    crossReferences: [],
  },
  '2.7.3': {
    section: '2.7.3',
    title: 'Summary of Clinical Efficacy',
    requiredSubsections: [
      'Background and Overview of Clinical Efficacy',
      'Summary of Results of Individual Studies',
      'Comparison and Analyses of Results Across Studies',
      'Analysis of Clinical Information Relevant to Dosing',
      'Persistence of Efficacy and/or Tolerance Effects',
      'Discussion and Conclusions',
    ],
    optionalSubsections: [],
    primarySources: ['clinical-study-report', 'statistical-report', 'efficacy-tables'],
    secondarySources: ['literature-review'],
    ichE3Sections: ['11'],
    typicalWordCount: { min: 20000, max: 50000 },
    crossReferences: [
      { module: 'Module 5', section: '5.3.5', description: 'Clinical Study Reports' },
    ],
  },
  '2.7.4': {
    section: '2.7.4',
    title: 'Summary of Clinical Safety',
    requiredSubsections: [
      'Exposure to Drug',
      'Adverse Events',
      'Clinical Laboratory Evaluations',
      'Vital Signs, Physical Findings, and Other Safety Observations',
      'Safety in Special Groups and Situations',
      'Post-marketing Experience',
      'Discussion and Conclusions',
    ],
    optionalSubsections: ['Overdose', 'Drug Abuse', 'Withdrawal and Rebound'],
    primarySources: ['safety-database', 'clinical-study-report', 'safety-narrative'],
    secondarySources: ['literature-review', 'labeling-current'],
    ichE3Sections: ['12'],
    typicalWordCount: { min: 25000, max: 60000 },
    crossReferences: [
      { module: 'Module 2', section: '2.7.3', description: 'Efficacy Summary' },
    ],
  },
  '2.7.5': {
    section: '2.7.5',
    title: 'Literature References',
    requiredSubsections: [],
    optionalSubsections: [],
    primarySources: ['literature-review'],
    secondarySources: [],
    ichE3Sections: [],
    typicalWordCount: { min: 500, max: 2000 },
    crossReferences: [],
  },
  '2.7.6': {
    section: '2.7.6',
    title: 'Synopses of Individual Studies',
    requiredSubsections: [],
    optionalSubsections: [],
    primarySources: ['clinical-study-report', 'clinical-study-protocol'],
    secondarySources: [],
    ichE3Sections: [],
    typicalWordCount: { min: 10000, max: 30000 },
    crossReferences: [],
  },
};

// ============================================================================
// AI ENGINE CONFIGURATION
// ============================================================================

export interface AIEngineConfig {
  // Model settings
  model: 'claude-sonnet-4' | 'claude-opus-4';
  temperature: number;
  maxTokens: number;
  
  // Generation settings
  chunkSize: number;          // Words per generation chunk
  overlapSize: number;        // Overlap between chunks
  parallelSections: number;   // Sections to generate in parallel
  
  // Quality settings
  minQualityScore: number;    // Minimum score to accept
  maxRegenerations: number;   // Max regeneration attempts
  
  // Citation settings
  requireCitations: boolean;
  minCitationsPerSection: number;
  citationVerification: boolean;
  
  // Compliance settings
  ichComplianceCheck: boolean;
  amaStyleCheck: boolean;
  fdaGuidanceCheck: boolean;
}

export const DEFAULT_AI_CONFIG: AIEngineConfig = {
  model: 'claude-sonnet-4',
  temperature: 0.3,
  maxTokens: 4000,
  chunkSize: 1500,
  overlapSize: 200,
  parallelSections: 3,
  minQualityScore: 0.75,
  maxRegenerations: 3,
  requireCitations: true,
  minCitationsPerSection: 2,
  citationVerification: true,
  ichComplianceCheck: true,
  amaStyleCheck: true,
  fdaGuidanceCheck: true,
};

// ============================================================================
// UI STATE
// ============================================================================

export type AIGenerationView =
  | 'templates'       // Template selection
  | 'configure'       // Configuration and source selection
  | 'generate'        // Active generation
  | 'review'          // Content review
  | 'export'          // Export options
  | 'history';        // Generation history

export interface AIGenerationUIState {
  activeView: AIGenerationView;
  selectedTemplateId: string | null;
  activeSessionId: string | null;
  expandedSections: string[];
  showSourcePanel: boolean;
  showQualityPanel: boolean;
  previewMode: 'rendered' | 'markdown' | 'split';
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

export interface AIDocumentGenerationState {
  // Templates
  templates: DocumentTemplate[];
  
  // Sessions
  sessions: GenerationSession[];
  activeSessionId: string | null;
  
  // Sources
  availableSources: SourceDocument[];
  sourceIndex: Map<string, SourceDocument>;
  
  // UI State
  uiState: AIGenerationUIState;
  
  // Configuration
  engineConfig: AIEngineConfig;
  
  // Loading
  isLoading: boolean;
  generationProgress: number;
  error: string | null;
}

export interface AIDocumentGenerationActions {
  // Template management
  loadTemplates: () => Promise<void>;
  selectTemplate: (templateId: string) => void;
  
  // Session management
  createSession: (config: Partial<GenerationSession>) => string;
  loadSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<GenerationSession>) => void;
  deleteSession: (sessionId: string) => void;
  
  // Source management
  loadSources: (productId: string) => Promise<void>;
  selectSources: (sessionId: string, sourceIds: string[]) => void;
  mapSourceToSection: (sessionId: string, sectionId: string, sourceIds: string[]) => void;
  indexSource: (sourceId: string) => Promise<void>;
  
  // Generation
  generateOutline: (sessionId: string) => Promise<DocumentOutline>;
  generateSection: (sessionId: string, sectionId: string) => Promise<GeneratedSection>;
  generateFullDocument: (sessionId: string) => Promise<void>;
  regenerateSection: (sessionId: string, sectionId: string, instructions?: string) => Promise<GeneratedSection>;
  
  // Review
  reviewSection: (sessionId: string, sectionId: string, status: GeneratedSection['status'], comments?: string) => void;
  acceptSection: (sessionId: string, sectionId: string) => void;
  rejectSection: (sessionId: string, sectionId: string, reason: string) => void;
  
  // Quality
  runQualityCheck: (sessionId: string) => Promise<ComplianceIssue[]>;
  fixComplianceIssue: (sessionId: string, issueId: string) => Promise<void>;
  
  // Export
  exportToWord: (sessionId: string) => Promise<Blob>;
  exportToMarkdown: (sessionId: string) => string;
  exportToPDF: (sessionId: string) => Promise<Blob>;
  pushToAuthoring: (sessionId: string, documentId: string) => Promise<void>;
  
  // UI actions
  setActiveView: (view: AIGenerationView) => void;
  toggleSourcePanel: () => void;
  toggleQualityPanel: () => void;
  setPreviewMode: (mode: AIGenerationUIState['previewMode']) => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
  
  // Configuration
  updateEngineConfig: (config: Partial<AIEngineConfig>) => void;
  resetEngineConfig: () => void;
  
  // Clear
  clearError: () => void;
  resetState: () => void;
}
