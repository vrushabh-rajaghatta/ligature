
// =============================================================================
// IQ/OQ/PQ VALIDATION PROTOCOL TYPES
// =============================================================================
// Types for computer system validation protocols per GAMP 5 and 21 CFR Part 11.
// Supports Installation Qualification (IQ), Operational Qualification (OQ),
// and Performance Qualification (PQ) protocol generation.
// =============================================================================

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

/**
 * Protocol type identifier
 */
export type ProtocolType = 'IQ' | 'OQ' | 'PQ';

/**
 * Protocol status in lifecycle
 */
export type ProtocolStatus = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'in_execution'
  | 'completed'
  | 'failed'
  | 'archived';

/**
 * Test case result
 */
export type TestResult = 'pass' | 'fail' | 'blocked' | 'not_run' | 'not_applicable';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * GAMP 5 software category
 */
export type GAMPCategory = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// SYSTEM INFORMATION
// ============================================================================

/**
 * System under validation
 */
export interface SystemInfo {
  /** System name */
  name: string;
  /** System version */
  version: string;
  /** Vendor/manufacturer */
  vendor: string;
  /** GAMP category (1-5) */
  gampCategory: GAMPCategory;
  /** System description */
  description: string;
  /** Intended use */
  intendedUse: string;
  /** GxP impact areas */
  gxpImpact: GxPImpact[];
  /** Regulatory requirements */
  regulations: string[];
  /** Installation environment */
  environment: 'production' | 'validation' | 'development' | 'disaster_recovery';
}

/**
 * GxP impact classification
 */
export interface GxPImpact {
  area: 'GMP' | 'GLP' | 'GCP' | 'GDP' | 'GPvP';
  impact: 'direct' | 'indirect' | 'supporting';
  description: string;
}

// ============================================================================
// PROTOCOL STRUCTURE
// ============================================================================

/**
 * Base validation protocol
 */
export interface ValidationProtocol {
  /** Unique identifier */
  id: string;
  /** Protocol type */
  type: ProtocolType;
  /** Protocol number (formatted) */
  protocolNumber: string;
  /** Version */
  version: string;
  /** Title */
  title: string;
  /** System being validated */
  system: SystemInfo;
  /** Current status */
  status: ProtocolStatus;
  /** Effective date */
  effectiveDate?: Date;
  /** Expiration date (for periodic revalidation) */
  expirationDate?: Date;
  /** Protocol sections */
  sections: ProtocolSection[];
  /** Test cases */
  testCases: TestCase[];
  /** Deviations found during execution */
  deviations: Deviation[];
  /** Approval signatures */
  approvals: Approval[];
  /** Attachments/evidence */
  attachments: Attachment[];
  /** Audit trail */
  auditTrail: AuditEntry[];
  /** Metadata */
  metadata: ProtocolMetadata;
}

/**
 * Protocol section
 */
export interface ProtocolSection {
  /** Section ID */
  id: string;
  /** Section number (e.g., "1.0", "2.1") */
  number: string;
  /** Section title */
  title: string;
  /** Section content (can be markdown) */
  content: string;
  /** Is this section required? */
  required: boolean;
  /** Subsections */
  subsections?: ProtocolSection[];
}

/**
 * Protocol metadata
 */
export interface ProtocolMetadata {
  /** Created date */
  createdAt: Date;
  /** Created by */
  createdBy: string;
  /** Last modified date */
  modifiedAt: Date;
  /** Last modified by */
  modifiedBy: string;
  /** Document owner */
  owner: string;
  /** Department */
  department: string;
  /** Project/study reference */
  projectRef?: string;
  /** Related protocols */
  relatedProtocols: string[];
  /** Tags for categorization */
  tags: string[];
}

// ============================================================================
// TEST CASES
// ============================================================================

/**
 * Individual test case
 */
export interface TestCase {
  /** Test case ID */
  id: string;
  /** Test case number */
  number: string;
  /** Test category */
  category: TestCategory;
  /** Title */
  title: string;
  /** Objective */
  objective: string;
  /** Prerequisites */
  prerequisites: string[];
  /** Test steps */
  steps: TestStep[];
  /** Expected results */
  expectedResults: string;
  /** Acceptance criteria */
  acceptanceCriteria: string;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Requirement traceability */
  requirementRefs: string[];
  /** Result */
  result: TestResult;
  /** Actual results observed */
  actualResults?: string;
  /** Executed by */
  executedBy?: string;
  /** Execution date */
  executedAt?: Date;
  /** Verified by */
  verifiedBy?: string;
  /** Verification date */
  verifiedAt?: Date;
  /** Comments */
  comments?: string;
  /** Evidence attachments */
  evidenceRefs: string[];
}

/**
 * Test category
 */
export type TestCategory =
  // IQ Categories
  | 'hardware_verification'
  | 'software_installation'
  | 'network_configuration'
  | 'documentation_review'
  | 'environment_verification'
  // OQ Categories
  | 'functional_testing'
  | 'security_testing'
  | 'boundary_testing'
  | 'error_handling'
  | 'interface_testing'
  | 'calculation_verification'
  | 'audit_trail_testing'
  | 'electronic_signature'
  // PQ Categories
  | 'workflow_testing'
  | 'performance_testing'
  | 'user_acceptance'
  | 'business_process'
  | 'integration_testing'
  | 'stress_testing';

/**
 * Individual test step
 */
export interface TestStep {
  /** Step number */
  stepNumber: number;
  /** Action to perform */
  action: string;
  /** Expected result for this step */
  expectedResult: string;
  /** Actual result observed */
  actualResult?: string;
  /** Step passed? */
  passed?: boolean;
  /** Screenshot/evidence reference */
  evidenceRef?: string;
}

// ============================================================================
// DEVIATIONS
// ============================================================================

/**
 * Deviation from expected results
 */
export interface Deviation {
  /** Deviation ID */
  id: string;
  /** Deviation number */
  number: string;
  /** Related test case */
  testCaseId: string;
  /** Description */
  description: string;
  /** Classification */
  classification: DeviationClassification;
  /** Impact assessment */
  impactAssessment: string;
  /** Root cause (if determined) */
  rootCause?: string;
  /** Corrective action */
  correctiveAction?: string;
  /** Preventive action */
  preventiveAction?: string;
  /** Status */
  status: DeviationStatus;
  /** Raised by */
  raisedBy: string;
  /** Raised date */
  raisedAt: Date;
  /** Closed by */
  closedBy?: string;
  /** Closed date */
  closedAt?: Date;
  /** CAPA reference (if applicable) */
  capaRef?: string;
}

export type DeviationClassification = 'critical' | 'major' | 'minor' | 'observation';
export type DeviationStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'rejected';

// ============================================================================
// APPROVALS
// ============================================================================

/**
 * Approval signature
 */
export interface Approval {
  /** Approval ID */
  id: string;
  /** Role */
  role: ApprovalRole;
  /** Person name */
  name: string;
  /** Title/position */
  title: string;
  /** Department */
  department: string;
  /** Signature (could be digital signature hash) */
  signature?: string;
  /** Signature date */
  signedAt?: Date;
  /** Status */
  status: 'pending' | 'approved' | 'rejected';
  /** Comments */
  comments?: string;
  /** Approval meaning */
  meaning: string;
}

export type ApprovalRole = 
  | 'author'
  | 'reviewer'
  | 'qa_approver'
  | 'system_owner'
  | 'it_approver'
  | 'validation_lead'
  | 'quality_head'
  | 'executed_by'
  | 'verified_by';

// ============================================================================
// ATTACHMENTS & EVIDENCE
// ============================================================================

/**
 * Attachment/evidence item
 */
export interface Attachment {
  /** Attachment ID */
  id: string;
  /** File name */
  fileName: string;
  /** File type */
  fileType: string;
  /** File size in bytes */
  fileSize: number;
  /** Description */
  description: string;
  /** Attachment type */
  type: AttachmentType;
  /** Upload date */
  uploadedAt: Date;
  /** Uploaded by */
  uploadedBy: string;
  /** Hash for integrity */
  checksum?: string;
}

export type AttachmentType = 
  | 'screenshot'
  | 'configuration'
  | 'log_file'
  | 'report'
  | 'certificate'
  | 'specification'
  | 'procedure'
  | 'other';

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Audit trail entry
 */
export interface AuditEntry {
  /** Entry ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** User */
  user: string;
  /** Action performed */
  action: string;
  /** Details/changes */
  details: string;
  /** Previous value (if change) */
  previousValue?: string;
  /** New value (if change) */
  newValue?: string;
  /** IP address */
  ipAddress?: string;
}

// ============================================================================
// PROTOCOL TEMPLATES
// ============================================================================

/**
 * IQ Protocol template configuration
 */
export interface IQTemplateConfig {
  /** Include hardware verification */
  includeHardware: boolean;
  /** Include software installation */
  includeSoftware: boolean;
  /** Include network configuration */
  includeNetwork: boolean;
  /** Include documentation review */
  includeDocumentation: boolean;
  /** Custom sections */
  customSections: ProtocolSection[];
  /** Test case templates to include */
  testCaseTemplates: TestCaseTemplate[];
}

/**
 * OQ Protocol template configuration
 */
export interface OQTemplateConfig {
  /** Include functional testing */
  includeFunctional: boolean;
  /** Include security testing */
  includeSecurity: boolean;
  /** Include Part 11 testing */
  includePart11: boolean;
  /** Include boundary testing */
  includeBoundary: boolean;
  /** Include error handling */
  includeErrorHandling: boolean;
  /** Custom sections */
  customSections: ProtocolSection[];
  /** Test case templates */
  testCaseTemplates: TestCaseTemplate[];
}

/**
 * PQ Protocol template configuration
 */
export interface PQTemplateConfig {
  /** Include workflow testing */
  includeWorkflow: boolean;
  /** Include performance testing */
  includePerformance: boolean;
  /** Include UAT */
  includeUAT: boolean;
  /** Include integration testing */
  includeIntegration: boolean;
  /** Custom sections */
  customSections: ProtocolSection[];
  /** Test case templates */
  testCaseTemplates: TestCaseTemplate[];
}

/**
 * Test case template
 */
export interface TestCaseTemplate {
  /** Template ID */
  id: string;
  /** Category */
  category: TestCategory;
  /** Title template */
  titleTemplate: string;
  /** Objective template */
  objectiveTemplate: string;
  /** Default steps */
  defaultSteps: Omit<TestStep, 'actualResult' | 'passed' | 'evidenceRef'>[];
  /** Expected results template */
  expectedResultsTemplate: string;
  /** Acceptance criteria template */
  acceptanceCriteriaTemplate: string;
  /** Default risk level */
  defaultRiskLevel: RiskLevel;
  /** Variables to substitute */
  variables: string[];
}

// ============================================================================
// GENERATION OPTIONS
// ============================================================================

/**
 * Options for generating a protocol
 */
export interface ProtocolGenerationOptions {
  /** Protocol type */
  type: ProtocolType;
  /** System info */
  system: SystemInfo;
  /** Protocol number prefix */
  numberPrefix: string;
  /** Department */
  department: string;
  /** Owner */
  owner: string;
  /** Approval roles required */
  approvalRoles: ApprovalRole[];
  /** IQ-specific config (if type is IQ) */
  iqConfig?: IQTemplateConfig;
  /** OQ-specific config (if type is OQ) */
  oqConfig?: OQTemplateConfig;
  /** PQ-specific config (if type is PQ) */
  pqConfig?: PQTemplateConfig;
  /** Related protocols (for traceability) */
  relatedProtocols?: string[];
  /** Project reference */
  projectRef?: string;
  /** Tags */
  tags?: string[];
}

// ============================================================================
// SUMMARY & REPORTING
// ============================================================================

/**
 * Protocol execution summary
 */
export interface ProtocolSummary {
  /** Protocol ID */
  protocolId: string;
  /** Protocol type */
  type: ProtocolType;
  /** Total test cases */
  totalTestCases: number;
  /** Passed */
  passed: number;
  /** Failed */
  failed: number;
  /** Blocked */
  blocked: number;
  /** Not run */
  notRun: number;
  /** Not applicable */
  notApplicable: number;
  /** Pass rate percentage */
  passRate: number;
  /** Total deviations */
  totalDeviations: number;
  /** Open deviations */
  openDeviations: number;
  /** Critical deviations */
  criticalDeviations: number;
  /** Overall status */
  overallStatus: 'pass' | 'fail' | 'incomplete';
  /** Completion percentage */
  completionPercentage: number;
}

/**
 * Test coverage by category
 */
export interface CategoryCoverage {
  category: TestCategory;
  total: number;
  executed: number;
  passed: number;
  failed: number;
  coverage: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate protocol number
 */
export function generateProtocolNumber(
  type: ProtocolType,
  prefix: string,
  sequence: number
): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const seq = sequence.toString().padStart(3, '0');
  return `${prefix}-${type}-${year}-${seq}`;
}

/**
 * Calculate protocol summary
 */
export function calculateProtocolSummary(protocol: ValidationProtocol): ProtocolSummary {
  const testCases = protocol.testCases;
  const total = testCases.length;
  
  const passed = testCases.filter(tc => tc.result === 'pass').length;
  const failed = testCases.filter(tc => tc.result === 'fail').length;
  const blocked = testCases.filter(tc => tc.result === 'blocked').length;
  const notRun = testCases.filter(tc => tc.result === 'not_run').length;
  const notApplicable = testCases.filter(tc => tc.result === 'not_applicable').length;
  
  const executed = passed + failed + blocked;
  const applicable = total - notApplicable;
  const passRate = applicable > 0 ? (passed / applicable) * 100 : 0;
  const completionPercentage = applicable > 0 ? (executed / applicable) * 100 : 0;
  
  const totalDeviations = protocol.deviations.length;
  const openDeviations = protocol.deviations.filter(d => 
    d.status === 'open' || d.status === 'investigating'
  ).length;
  const criticalDeviations = protocol.deviations.filter(d => 
    d.classification === 'critical'
  ).length;
  
  let overallStatus: 'pass' | 'fail' | 'incomplete' = 'incomplete';
  if (completionPercentage === 100) {
    overallStatus = failed === 0 && criticalDeviations === 0 ? 'pass' : 'fail';
  }
  
  return {
    protocolId: protocol.id,
    type: protocol.type,
    totalTestCases: total,
    passed,
    failed,
    blocked,
    notRun,
    notApplicable,
    passRate: Math.round(passRate * 10) / 10,
    totalDeviations,
    openDeviations,
    criticalDeviations,
    overallStatus,
    completionPercentage: Math.round(completionPercentage * 10) / 10,
  };
}

/**
 * Get GAMP category description
 */
export function getGAMPCategoryDescription(category: GAMPCategory): string {
  const descriptions: Record<GAMPCategory, string> = {
    1: 'Infrastructure Software',
    2: 'Non-configurable Software (Firmware)',
    3: 'Non-configurable Software (COTS)',
    4: 'Configured Software',
    5: 'Custom Software',
  };
  return descriptions[category];
}

/**
 * Get test category display name
 */
export function getTestCategoryDisplayName(category: TestCategory): string {
  const names: Record<TestCategory, string> = {
    hardware_verification: 'Hardware Verification',
    software_installation: 'Software Installation',
    network_configuration: 'Network Configuration',
    documentation_review: 'Documentation Review',
    environment_verification: 'Environment Verification',
    functional_testing: 'Functional Testing',
    security_testing: 'Security Testing',
    boundary_testing: 'Boundary Testing',
    error_handling: 'Error Handling',
    interface_testing: 'Interface Testing',
    calculation_verification: 'Calculation Verification',
    audit_trail_testing: 'Audit Trail Testing',
    electronic_signature: 'Electronic Signature',
    workflow_testing: 'Workflow Testing',
    performance_testing: 'Performance Testing',
    user_acceptance: 'User Acceptance',
    business_process: 'Business Process',
    integration_testing: 'Integration Testing',
    stress_testing: 'Stress Testing',
  };
  return names[category];
}

/**
 * Check if protocol is ready for execution
 */
export function isReadyForExecution(protocol: ValidationProtocol): boolean {
  // Must be approved
  const hasAllApprovals = protocol.approvals
    .filter(a => a.role === 'author' || a.role === 'reviewer' || a.role === 'qa_approver')
    .every(a => a.status === 'approved');
  
  // Must have test cases
  const hasTestCases = protocol.testCases.length > 0;
  
  // Status must be approved
  const statusOk = protocol.status === 'approved';
  
  return hasAllApprovals && hasTestCases && statusOk;
}

/**
 * Check if protocol is complete
 */
export function isProtocolComplete(protocol: ValidationProtocol): boolean {
  const summary = calculateProtocolSummary(protocol);
  return summary.completionPercentage === 100 && summary.openDeviations === 0;
}
