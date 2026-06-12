
// ============================================================================
// AI Consistency Engine Types - v198
// Cross-document consistency checking, automatic table/figure generation,
// regulatory precedent search, and comparative language extraction
// Leverages IDMP data model and SPL content for intelligent analysis
// ============================================================================

import { DocumentType, CTDSection } from '@/types/authoring';
import { IDMPMedicinalProduct, IDMPSubstance, IDMPPharmaceuticalProduct } from './idmpTypes';
import { SPLDocument, SPLSectionCode, SPLComponent } from './splTypes';

// ============================================================================
// CROSS-DOCUMENT CONSISTENCY CHECKING
// ============================================================================

/**
 * Consistency Check - A single validation of consistency across documents
 */
export interface ConsistencyCheck {
  id: string;
  name: string;
  description: string;
  category: ConsistencyCheckCategory;
  severity: ConsistencySeverity;
  
  // Scope
  targetDocumentTypes: DocumentType[];
  sourceDataDomains: ConsistencyDataDomain[];
  
  // Rules
  rules: ConsistencyRule[];
  
  // Configuration
  isEnabled: boolean;
  autoFix: boolean;
  autoFixConfidence: number; // Minimum confidence for auto-fix
  
  // Metadata
  createdAt: string;
  createdBy: string;
  lastUpdated: string;
}

export type ConsistencyCheckCategory =
  | 'product-identity'      // Product name, strength, form consistency
  | 'substance-data'        // Active/inactive ingredient consistency
  | 'dosing-information'    // Dosage, administration consistency
  | 'safety-language'       // Warnings, contraindications consistency
  | 'clinical-data'         // Efficacy, safety results consistency
  | 'manufacturing'         // CMC, packaging consistency
  | 'regulatory-references' // Cross-reference accuracy
  | 'terminology'           // Controlled vocabulary consistency
  | 'numerical-precision'   // Numbers, statistics consistency
  | 'date-alignment';       // Date consistency across documents

export type ConsistencySeverity = 'critical' | 'major' | 'minor' | 'informational';

export type ConsistencyDataDomain =
  | 'idmp-medicinal-product'
  | 'idmp-pharmaceutical-product'
  | 'idmp-substance'
  | 'idmp-organization'
  | 'spl-labeling'
  | 'ectd-module-2'
  | 'ectd-module-3'
  | 'clinical-study-report'
  | 'investigator-brochure'
  | 'submission-documents'
  | 'master-data';

export interface ConsistencyRule {
  id: string;
  name: string;
  description: string;
  
  // Source and target
  sourceField: FieldReference;
  targetField: FieldReference;
  
  // Comparison
  comparisonType: ComparisonType;
  tolerance?: number; // For numerical comparisons
  caseSensitive?: boolean;
  
  // Context
  contextConditions: ContextCondition[];
  
  // Actions
  onMismatch: MismatchAction;
}

export interface FieldReference {
  domain: ConsistencyDataDomain;
  entityType: string;
  fieldPath: string; // Dot notation path like "pharmaceuticalProducts[0].ingredients[0].substanceName"
  displayName: string;
}

export type ComparisonType =
  | 'exact-match'
  | 'case-insensitive-match'
  | 'normalized-match'      // Strip whitespace, normalize case
  | 'semantic-match'        // AI-powered semantic similarity
  | 'numerical-equal'
  | 'numerical-within-tolerance'
  | 'date-equal'
  | 'date-within-range'
  | 'contains'
  | 'regex-match'
  | 'controlled-vocabulary'; // Must match controlled term

export interface ContextCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'in' | 'not-in';
  value: string | string[];
}

export type MismatchAction =
  | 'flag-error'
  | 'flag-warning'
  | 'suggest-fix'
  | 'auto-fix'
  | 'require-justification';

// ============================================================================
// CONSISTENCY CHECK RESULTS
// ============================================================================

export interface ConsistencyCheckResult {
  id: string;
  checkId: string;
  checkName: string;
  
  // Execution context
  executedAt: string;
  executedBy: string;
  executionDuration: number; // milliseconds
  
  // Scope
  productId: string;
  productName: string;
  documentsAnalyzed: DocumentReference[];
  
  // Results
  status: ConsistencyResultStatus;
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  
  // Issues
  issues: ConsistencyIssue[];
  
  // Summary
  overallConsistencyScore: number; // 0-100
  categoryScores: Record<ConsistencyCheckCategory, number>;
}

export type ConsistencyResultStatus =
  | 'passed'
  | 'passed-with-warnings'
  | 'failed'
  | 'error';

export interface DocumentReference {
  id: string;
  documentType: DocumentType;
  title: string;
  version: string;
  lastModified: string;
}

export interface ConsistencyIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: ConsistencySeverity;
  category: ConsistencyCheckCategory;
  
  // Location
  sourceDocument: DocumentReference;
  sourceLocation: string;
  sourceValue: string;
  
  targetDocument: DocumentReference;
  targetLocation: string;
  targetValue: string;
  
  // Analysis
  description: string;
  impact: string;
  
  // Resolution
  status: IssueStatus;
  suggestedFix?: SuggestedFix;
  appliedFix?: AppliedFix;
  justification?: string;
  
  // Audit
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type IssueStatus =
  | 'open'
  | 'acknowledged'
  | 'fix-suggested'
  | 'fix-applied'
  | 'justified'
  | 'false-positive'
  | 'resolved';

export interface SuggestedFix {
  id: string;
  fixType: 'update-source' | 'update-target' | 'update-both' | 'manual-review';
  confidence: number; // 0-1
  
  // Proposed changes
  sourceProposedValue?: string;
  targetProposedValue?: string;
  
  // Explanation
  rationale: string;
  aiGenerated: boolean;
  references: string[];
}

export interface AppliedFix {
  fixId: string;
  appliedAt: string;
  appliedBy: string;
  previousSourceValue: string;
  previousTargetValue: string;
  newSourceValue?: string;
  newTargetValue?: string;
  method: 'auto' | 'manual' | 'ai-assisted';
}

// ============================================================================
// AUTOMATIC TABLE/FIGURE GENERATION
// ============================================================================

export interface TableGenerationRequest {
  id: string;
  requestType: 'table' | 'figure' | 'listing';
  
  // Source data
  dataSource: TableDataSource;
  
  // Output specification
  outputSpec: TableOutputSpec;
  
  // Context
  targetDocument: DocumentReference;
  targetSection: string;
  
  // Configuration
  style: TableStyle;
  formatting: TableFormatting;
  
  // Metadata
  requestedAt: string;
  requestedBy: string;
  status: GenerationStatus;
}

export interface TableDataSource {
  type: 'idmp' | 'clinical-data' | 'safety-data' | 'cmc-data' | 'structured-query';
  
  // For IDMP
  idmpEntityId?: string;
  idmpEntityType?: 'medicinal-product' | 'pharmaceutical-product' | 'substance' | 'organization';
  
  // For clinical/safety/CMC
  studyIds?: string[];
  dataCategory?: string;
  
  // For structured query
  query?: StructuredDataQuery;
  
  // Filters
  filters: DataFilter[];
  
  // Transformations
  transformations: DataTransformation[];
}

export interface StructuredDataQuery {
  selectFields: string[];
  fromEntity: string;
  joins: QueryJoin[];
  whereConditions: QueryCondition[];
  groupBy?: string[];
  orderBy?: QueryOrderBy[];
  limit?: number;
}

export interface QueryJoin {
  joinType: 'inner' | 'left' | 'right';
  targetEntity: string;
  onCondition: string;
}

export interface QueryCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like' | 'between';
  value: unknown;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface DataTransformation {
  type: 'rename' | 'calculate' | 'aggregate' | 'format' | 'pivot' | 'unpivot';
  config: Record<string, unknown>;
}

export interface TableOutputSpec {
  title: string;
  tableNumber?: string;
  
  // Structure
  columns: TableColumnSpec[];
  headerRows: number;
  
  // Content
  includeFootnotes: boolean;
  includeSource: boolean;
  
  // For figures
  chartType?: ChartType;
  axisConfig?: AxisConfig;
}

export interface TableColumnSpec {
  id: string;
  header: string;
  sourceField: string;
  width?: string;
  alignment: 'left' | 'center' | 'right';
  format?: string; // e.g., "0.00", "MMM DD, YYYY"
  aggregation?: 'sum' | 'count' | 'mean' | 'min' | 'max';
}

export type ChartType =
  | 'bar' | 'line' | 'scatter' | 'pie'
  | 'kaplan-meier' | 'forest-plot' | 'waterfall'
  | 'box-plot' | 'violin' | 'heatmap';

export interface AxisConfig {
  xAxis: AxisSpec;
  yAxis: AxisSpec;
  secondaryYAxis?: AxisSpec;
}

export interface AxisSpec {
  field: string;
  label: string;
  scale: 'linear' | 'log' | 'time' | 'categorical';
  range?: [number, number];
}

export interface TableStyle {
  template: 'regulatory-standard' | 'ich-e3' | 'fda-guidance' | 'ema-standard' | 'custom';
  theme: 'professional' | 'clean' | 'compact';
  borders: 'full' | 'horizontal' | 'none';
  alternateRowColors: boolean;
}

export interface TableFormatting {
  fontFamily: string;
  fontSize: number;
  headerBold: boolean;
  decimalPrecision: number;
  thousandsSeparator: boolean;
  dateFormat: string;
  nullDisplay: string;
}

export type GenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface GeneratedTable {
  id: string;
  requestId: string;
  
  // Output
  tableType: 'table' | 'figure' | 'listing';
  title: string;
  tableNumber: string;
  
  // Content
  headers: string[][];
  rows: string[][];
  footnotes: string[];
  source: string;
  
  // For figures
  chartData?: ChartData;
  chartConfig?: ChartConfig;
  
  // Metadata
  generatedAt: string;
  dataAsOf: string;
  rowCount: number;
  
  // Export formats
  formats: GeneratedTableFormat[];
}

export interface GeneratedTableFormat {
  format: 'html' | 'docx' | 'rtf' | 'pdf' | 'csv' | 'xlsx';
  content: string; // Base64 for binary formats
  fileSize: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: Record<string, unknown>;
  scales: Record<string, unknown>;
}

// ============================================================================
// REGULATORY PRECEDENT SEARCH
// ============================================================================

export interface PrecedentSearchRequest {
  id: string;
  
  // Query
  queryType: PrecedentQueryType;
  queryText: string;
  
  // Context
  therapeuticArea?: string;
  indication?: string;
  productType?: string;
  region: RegulatorRegion[];
  
  // Filters
  dateRange?: { start: string; end: string };
  approvalTypes?: string[];
  labelSections?: SPLSectionCode[];
  
  // Configuration
  maxResults: number;
  includeRejected: boolean;
  includeWithdrawn: boolean;
  
  // Metadata
  requestedAt: string;
  requestedBy: string;
  status: GenerationStatus;
}

export type PrecedentQueryType =
  | 'indication-language'     // How have others described this indication?
  | 'dosing-regimen'          // What dosing has been approved?
  | 'safety-language'         // How have others written safety sections?
  | 'efficacy-claims'         // What efficacy claims have been approved?
  | 'contraindication'        // What contraindications are typical?
  | 'warning-language'        // How are warnings typically worded?
  | 'drug-interaction'        // What drug interactions are documented?
  | 'pediatric-use'           // Pediatric language precedents
  | 'geriatric-use'           // Geriatric language precedents
  | 'pregnancy-lactation'     // Pregnancy/lactation language
  | 'boxed-warning'           // Boxed warning precedents
  | 'rems-elements'           // REMS program elements
  | 'general';                // Open-ended search

export type RegulatorRegion = 'us' | 'eu' | 'jp' | 'ca' | 'uk' | 'ch' | 'au' | 'global';

// Simplified precedent match for DailyMed search results (v200)
export interface PrecedentMatch {
  id: string;
  productName: string;
  manufacturer: string;
  approvalDate: string;
  region: RegulatorRegion;
  labelSection: string;
  relevantText: string;
  relevanceScore: number;
  matchType: 'semantic' | 'keyword' | 'exact';
  highlightedTerms: string[];
  sourceUrl: string;
  ndc?: string;
}

export interface PrecedentSearchResult {
  id: string;
  requestId: string;
  
  // Query info
  query: string;
  queryType: PrecedentQueryType;
  searchedAt: string;
  
  // Results
  totalMatches: number;
  matches: PrecedentMatch[];
  results?: RegulatoryPrecedent[]; // Legacy
  
  // Facets
  facets: {
    regions: Record<string, number>;
    productTypes: Record<string, number>;
    therapeuticAreas: Record<string, number>;
    years: Record<string, number>;
  };
  
  // Search metrics
  searchMetrics: {
    queryExpansionTerms: string[];
    semanticSimilarityThreshold: number;
    documentsSearched: number;
    searchDuration: number;
  };
  
  // Analysis (legacy)
  commonPatterns?: LanguagePattern[];
  recommendedApproach?: string;
  searchDuration?: number;
}

export interface RegulatoryPrecedent {
  id: string;
  
  // Source
  productName: string;
  applicationType: string; // NDA, BLA, ANDA
  applicationNumber: string;
  
  // Approval
  approvalDate: string;
  approvalRegion: RegulatorRegion;
  approvalStatus: 'approved' | 'tentative' | 'rejected' | 'withdrawn';
  
  // Content
  sectionCode: SPLSectionCode;
  sectionTitle: string;
  excerptText: string;
  fullText: string;
  
  // Relevance
  relevanceScore: number; // 0-1
  matchHighlights: string[];
  
  // Context
  therapeuticArea: string;
  indication: string;
  productType: string;
  
  // Links
  dailyMedUrl?: string;
  drugsAtFdaUrl?: string;
  emaUrl?: string;
}

export interface LanguagePattern {
  id: string;
  pattern: string;
  frequency: number; // Number of occurrences
  exampleProducts: string[];
  variations: string[];
  recommendation: 'strongly-recommended' | 'recommended' | 'optional' | 'avoid';
}

// ============================================================================
// COMPARATIVE LANGUAGE EXTRACTION
// ============================================================================

export interface ComparativeAnalysisRequest {
  id: string;
  
  // Source
  sourceProduct: ProductReference;
  sourceDocument: DocumentReference;
  sourceSection?: string;
  
  // Comparators
  comparatorProducts: ProductReference[];
  
  // Analysis scope
  analysisType: ComparativeAnalysisType[];
  
  // Configuration
  highlightDifferences: boolean;
  suggestImprovements: boolean;
  includeMetrics: boolean;
  
  // Metadata
  requestedAt: string;
  requestedBy: string;
  status: GenerationStatus;
}

export interface ProductReference {
  id: string;
  name: string;
  applicationNumber?: string;
  manufacturer?: string;
  region?: RegulatorRegion;
}

export type ComparativeAnalysisType =
  | 'indication-scope'        // Compare approved indications
  | 'dosing-comparison'       // Compare dosing recommendations
  | 'safety-profile'          // Compare safety language
  | 'efficacy-claims'         // Compare efficacy statements
  | 'warning-comprehensiveness' // Compare warning coverage
  | 'language-clarity'        // Readability and clarity
  | 'regulatory-compliance'   // Guideline adherence
  | 'label-completeness';     // Section coverage

export interface ComparativeAnalysisResult {
  id: string;
  requestId: string;
  
  // Analysis
  sourceProduct: ProductReference;
  comparisons: ProductComparison[];
  
  // Summary
  overallAssessment: string;
  keyDifferences: KeyDifference[];
  recommendations: LanguageRecommendation[];
  
  // Metrics
  metrics: ComparativeMetrics;
  
  // Metadata
  analyzedAt: string;
  analysisDuration: number;
}

export interface ProductComparison {
  comparatorProduct: ProductReference;
  
  // Section-by-section comparison
  sectionComparisons: SectionComparison[];
  
  // Overall similarity
  overallSimilarity: number; // 0-1
  
  // Notable differences
  significantDifferences: SignificantDifference[];
}

export interface SectionComparison {
  sectionCode: SPLSectionCode;
  sectionTitle: string;
  
  // Presence
  presentInSource: boolean;
  presentInComparator: boolean;
  
  // Content analysis
  textSimilarity: number; // 0-1
  structureSimilarity: number; // 0-1
  
  // Differences
  additionsInSource: string[];
  deletionsFromSource: string[];
  
  // Recommendations
  recommendation?: string;
}

export interface SignificantDifference {
  category: ComparativeAnalysisType;
  description: string;
  sourceText: string;
  comparatorText: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionRequired: boolean;
}

export interface KeyDifference {
  category: ComparativeAnalysisType;
  description: string;
  implication: string;
  recommendation: string;
}

export interface LanguageRecommendation {
  id: string;
  section: SPLSectionCode;
  currentText: string;
  recommendedText: string;
  rationale: string;
  source: 'precedent' | 'guideline' | 'comparator' | 'ai-suggestion';
  confidence: number;
  references: string[];
}

export interface ComparativeMetrics {
  readabilityScores: Record<string, number>; // Product -> Flesch-Kincaid score
  sectionCoverage: Record<string, number>; // Product -> % sections present
  averageSectionLength: Record<string, number>;
  technicalTermDensity: Record<string, number>;
  warningComprehensiveness: Record<string, number>;
}

// ============================================================================
// AI CONSISTENCY ENGINE STATE & ACTIONS
// ============================================================================

export interface AIConsistencyEngineState {
  // Consistency Checks
  checks: Record<string, ConsistencyCheck>;
  checkResults: Record<string, ConsistencyCheckResult>;
  activeCheckId: string | null;
  
  // Table Generation
  tableRequests: Record<string, TableGenerationRequest>;
  generatedTables: Record<string, GeneratedTable>;
  activeTableRequestId: string | null;
  
  // Precedent Search
  precedentRequests: Record<string, PrecedentSearchRequest>;
  precedentResults: Record<string, PrecedentSearchResult>;
  activePrecedentRequestId: string | null;
  
  // Comparative Analysis
  comparativeRequests: Record<string, ComparativeAnalysisRequest>;
  comparativeResults: Record<string, ComparativeAnalysisResult>;
  activeComparativeRequestId: string | null;
  
  // UI State
  activeView: AIConsistencyView;
  selectedProductId: string | null;
  
  // Processing
  isProcessing: boolean;
  processingProgress: number;
  error: string | null;
  
  // Configuration
  engineConfig: AIConsistencyEngineConfig;
}

export type AIConsistencyView =
  | 'dashboard'
  | 'consistency-checks'
  | 'check-results'
  | 'table-generation'
  | 'generated-tables'
  | 'precedent-search'
  | 'precedent-results'
  | 'comparative-analysis'
  | 'comparative-results'
  | 'settings';

export interface AIConsistencyEngineConfig {
  // Model settings
  model: 'claude-sonnet-4' | 'claude-opus-4';
  temperature: number;
  
  // Consistency settings
  autoRunChecks: boolean;
  checkSchedule: 'on-save' | 'hourly' | 'daily' | 'manual';
  minConfidenceForAutoFix: number;
  
  // Table generation settings
  defaultTableStyle: TableStyle;
  defaultFormatting: TableFormatting;
  
  // Precedent search settings
  defaultMaxResults: number;
  defaultRegions: RegulatorRegion[];
  
  // Comparative analysis settings
  defaultAnalysisTypes: ComparativeAnalysisType[];
}

export const DEFAULT_CONSISTENCY_ENGINE_CONFIG: AIConsistencyEngineConfig = {
  model: 'claude-sonnet-4',
  temperature: 0.2,
  autoRunChecks: true,
  checkSchedule: 'on-save',
  minConfidenceForAutoFix: 0.95,
  defaultTableStyle: {
    template: 'ich-e3',
    theme: 'professional',
    borders: 'horizontal',
    alternateRowColors: true,
  },
  defaultFormatting: {
    fontFamily: 'Arial',
    fontSize: 10,
    headerBold: true,
    decimalPrecision: 2,
    thousandsSeparator: true,
    dateFormat: 'DD-MMM-YYYY',
    nullDisplay: '-',
  },
  defaultMaxResults: 25,
  defaultRegions: ['us', 'eu'],
  defaultAnalysisTypes: ['indication-scope', 'safety-profile', 'dosing-comparison'],
};

export interface AIConsistencyEngineActions {
  // Consistency Check Management
  createCheck: (data: Partial<ConsistencyCheck>) => ConsistencyCheck;
  updateCheck: (id: string, updates: Partial<ConsistencyCheck>) => void;
  deleteCheck: (id: string) => void;
  enableCheck: (id: string) => void;
  disableCheck: (id: string) => void;
  
  // Consistency Check Execution
  runCheck: (checkId: string, productId: string) => Promise<ConsistencyCheckResult>;
  runAllChecks: (productId: string) => Promise<ConsistencyCheckResult[]>;
  resolveIssue: (resultId: string, issueId: string, resolution: IssueResolution) => void;
  applyFix: (resultId: string, issueId: string, fixId: string) => Promise<void>;
  
  // Table Generation
  createTableRequest: (data: Partial<TableGenerationRequest>) => TableGenerationRequest;
  generateTable: (requestId: string) => Promise<GeneratedTable>;
  exportTable: (tableId: string, format: 'html' | 'docx' | 'rtf' | 'pdf' | 'csv' | 'xlsx') => Promise<Blob>;
  deleteGeneratedTable: (tableId: string) => void;
  
  // Precedent Search
  createPrecedentSearch: (data: Partial<PrecedentSearchRequest>) => PrecedentSearchRequest;
  executePrecedentSearch: (requestId: string) => Promise<PrecedentSearchResult>;
  savePrecedent: (precedentId: string) => void;
  
  // Comparative Analysis
  createComparativeAnalysis: (data: Partial<ComparativeAnalysisRequest>) => ComparativeAnalysisRequest;
  executeComparativeAnalysis: (requestId: string) => Promise<ComparativeAnalysisResult>;
  applyRecommendation: (resultId: string, recommendationId: string) => Promise<void>;
  
  // UI Actions
  setActiveView: (view: AIConsistencyView) => void;
  setSelectedProduct: (productId: string | null) => void;
  setActiveCheck: (checkId: string | null) => void;
  setActiveTableRequest: (requestId: string | null) => void;
  setActivePrecedentRequest: (requestId: string | null) => void;
  setActiveComparativeRequest: (requestId: string | null) => void;
  
  // Configuration
  updateEngineConfig: (config: Partial<AIConsistencyEngineConfig>) => void;
  resetEngineConfig: () => void;
  
  // State Management
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}

export interface IssueResolution {
  status: IssueStatus;
  justification?: string;
  fixApplied?: boolean;
}

// ============================================================================
// PREDEFINED CONSISTENCY CHECKS
// ============================================================================

export const PREDEFINED_CONSISTENCY_CHECKS: Omit<ConsistencyCheck, 'id' | 'createdAt' | 'createdBy' | 'lastUpdated'>[] = [
  {
    name: 'Product Name Consistency',
    description: 'Verify product name is consistent across all documents',
    category: 'product-identity',
    severity: 'critical',
    targetDocumentTypes: ['csr', 'ib', 'protocol', 'module-2-summary'],
    sourceDataDomains: ['idmp-medicinal-product', 'spl-labeling'],
    rules: [],
    isEnabled: true,
    autoFix: false,
    autoFixConfidence: 0.99,
  },
  {
    name: 'Active Ingredient Consistency',
    description: 'Verify active ingredient name and strength across documents',
    category: 'substance-data',
    severity: 'critical',
    targetDocumentTypes: ['csr', 'ib', 'module-2-summary', 'module-3-quality'],
    sourceDataDomains: ['idmp-substance', 'idmp-pharmaceutical-product', 'spl-labeling'],
    rules: [],
    isEnabled: true,
    autoFix: false,
    autoFixConfidence: 0.95,
  },
  {
    name: 'Dosing Information Alignment',
    description: 'Verify dosing recommendations match across labeling and clinical documents',
    category: 'dosing-information',
    severity: 'critical',
    targetDocumentTypes: ['csr', 'protocol', 'module-2-summary'],
    sourceDataDomains: ['spl-labeling', 'clinical-study-report'],
    rules: [],
    isEnabled: true,
    autoFix: false,
    autoFixConfidence: 0.90,
  },
  {
    name: 'Contraindication Language',
    description: 'Verify contraindication language is consistent with approved labeling',
    category: 'safety-language',
    severity: 'major',
    targetDocumentTypes: ['ib', 'protocol'],
    sourceDataDomains: ['spl-labeling'],
    rules: [],
    isEnabled: true,
    autoFix: true,
    autoFixConfidence: 0.85,
  },
  {
    name: 'Clinical Data Precision',
    description: 'Verify statistical values are reported consistently',
    category: 'numerical-precision',
    severity: 'major',
    targetDocumentTypes: ['csr', 'module-2-summary'],
    sourceDataDomains: ['clinical-study-report'],
    rules: [],
    isEnabled: true,
    autoFix: false,
    autoFixConfidence: 0.95,
  },
];
