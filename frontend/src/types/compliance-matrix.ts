
/**
 * Compliance Matrix Types - OQ Track
 * 
 * Requirements Traceability Matrix (RTM) and 21 CFR Part 11 Compliance Matrix
 * for regulatory software validation.
 * 
 * @version 0.24.6
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Unique identifier for any traceable item
 */
export type TraceableItemId = string;

/**
 * Validation qualification phases
 */
export type QualificationPhase = 'IQ' | 'OQ' | 'PQ';

/**
 * Overall compliance status
 */
export type ComplianceStatus = 
  | 'compliant'        // Fully meets requirement
  | 'partial'          // Partially meets, gaps identified
  | 'planned'          // Implementation planned
  | 'not_applicable'   // N/A for this system
  | 'non_compliant';   // Does not meet requirement

/**
 * Priority levels for requirements
 */
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Risk classification for GAMP 5
 */
export type GampCategory = 1 | 2 | 3 | 4 | 5;

/**
 * Document evidence types
 */
export type EvidenceType =
  | 'specification'
  | 'design_document'
  | 'test_script'
  | 'test_result'
  | 'sop'
  | 'screenshot'
  | 'audit_log'
  | 'certificate'
  | 'assessment'
  | 'risk_analysis'
  | 'other';

// =============================================================================
// REQUIREMENTS TRACEABILITY MATRIX (RTM)
// =============================================================================

/**
 * User Requirement - What the system must do
 */
export interface UserRequirement {
  id: TraceableItemId;
  code: string;              // e.g., "UR-001"
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  source: string;            // Where requirement came from
  rationale?: string;        // Why this requirement exists
  acceptance_criteria: string[];
  phase: QualificationPhase;
  gamp_category: GampCategory;
  regulatory_reference?: string;  // e.g., "21 CFR 11.10(a)"
  status: RequirementStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  version: number;
}

export type RequirementCategory =
  | 'functional'
  | 'security'
  | 'audit_trail'
  | 'electronic_signature'
  | 'access_control'
  | 'data_integrity'
  | 'validation'
  | 'reporting'
  | 'integration'
  | 'performance'
  | 'usability'
  | 'regulatory';

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'implemented'
  | 'tested'
  | 'validated'
  | 'retired';

/**
 * Design Specification - How the requirement will be implemented
 */
export interface DesignSpecification {
  id: TraceableItemId;
  code: string;              // e.g., "DS-001"
  title: string;
  description: string;
  requirement_ids: TraceableItemId[];  // Links to UserRequirements
  technical_approach: string;
  components: string[];      // System components involved
  interfaces?: string[];     // External interfaces
  constraints?: string[];    // Technical constraints
  assumptions?: string[];    // Design assumptions
  risks?: DesignRisk[];
  status: DesignStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  version: number;
}

export interface DesignRisk {
  id: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

export type DesignStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'implemented'
  | 'retired';

/**
 * Test Case - How the requirement will be verified
 */
export interface TestCase {
  id: TraceableItemId;
  code: string;              // e.g., "TC-001"
  title: string;
  description: string;
  requirement_ids: TraceableItemId[];  // Links to UserRequirements
  design_ids: TraceableItemId[];       // Links to DesignSpecifications
  type: TestType;
  priority: RequirementPriority;
  preconditions: string[];
  steps: TestStep[];
  expected_result: string;
  test_data?: string;
  environment?: string;
  automation_status: AutomationStatus;
  automation_reference?: string;  // Link to automated test
  status: TestCaseStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  version: number;
}

export interface TestStep {
  number: number;
  action: string;
  expected: string;
  notes?: string;
}

export type TestType =
  | 'functional'
  | 'integration'
  | 'security'
  | 'performance'
  | 'regression'
  | 'user_acceptance'
  | 'boundary'
  | 'negative';

export type AutomationStatus =
  | 'automated'
  | 'manual'
  | 'semi_automated'
  | 'planned';

export type TestCaseStatus =
  | 'draft'
  | 'approved'
  | 'active'
  | 'deprecated';

/**
 * Test Execution - Record of test being run
 */
export interface TestExecution {
  id: string;
  test_case_id: TraceableItemId;
  executed_at: Date;
  executed_by: string;
  environment: string;
  build_version: string;
  result: TestResult;
  actual_result: string;
  step_results: StepResult[];
  duration_seconds?: number;
  defects_found?: string[];
  attachments?: EvidenceAttachment[];
  notes?: string;
  signature?: ExecutionSignature;
}

export interface StepResult {
  step_number: number;
  result: TestResult;
  actual: string;
  screenshot_id?: string;
}

export type TestResult = 'pass' | 'fail' | 'blocked' | 'skipped' | 'in_progress';

export interface ExecutionSignature {
  signed_by: string;
  signed_at: Date;
  meaning: 'executed' | 'verified' | 'approved';
  hash: string;
}

/**
 * Code Reference - Traceability to implementation
 */
export interface CodeReference {
  id: TraceableItemId;
  design_id: TraceableItemId;
  file_path: string;
  line_range?: { start: number; end: number };
  function_name?: string;
  class_name?: string;
  module_name: string;
  description: string;
  commit_hash?: string;
  created_at: Date;
}

/**
 * Evidence Attachment
 */
export interface EvidenceAttachment {
  id: string;
  name: string;
  type: EvidenceType;
  file_path?: string;
  url?: string;
  description: string;
  uploaded_at: Date;
  uploaded_by: string;
}

/**
 * Complete RTM Entry - Full traceability chain
 */
export interface RTMEntry {
  requirement: UserRequirement;
  designs: DesignSpecification[];
  test_cases: TestCase[];
  code_references: CodeReference[];
  executions: TestExecution[];
  evidence: EvidenceAttachment[];
  coverage: CoverageMetrics;
}

/**
 * Coverage metrics for an RTM entry
 */
export interface CoverageMetrics {
  has_design: boolean;
  has_tests: boolean;
  has_code: boolean;
  has_execution: boolean;
  has_passing_execution: boolean;
  design_count: number;
  test_count: number;
  code_ref_count: number;
  execution_count: number;
  pass_count: number;
  fail_count: number;
  coverage_percentage: number;  // 0-100
}

/**
 * RTM Summary Statistics
 */
export interface RTMSummary {
  total_requirements: number;
  by_category: Record<RequirementCategory, number>;
  by_priority: Record<RequirementPriority, number>;
  by_status: Record<RequirementStatus, number>;
  coverage: {
    with_design: number;
    with_tests: number;
    with_code: number;
    with_execution: number;
    fully_traced: number;
    gaps: number;
  };
  test_summary: {
    total_tests: number;
    automated: number;
    manual: number;
    executions: number;
    pass_rate: number;
  };
  overall_coverage_percentage: number;
  last_updated: Date;
}

// =============================================================================
// 21 CFR PART 11 COMPLIANCE MATRIX
// =============================================================================

/**
 * Part 11 Clause Reference
 */
export interface Part11Clause {
  id: string;
  section: Part11Section;
  clause_number: string;      // e.g., "11.10(a)"
  title: string;
  full_text: string;
  interpretation?: string;    // Guidance on interpretation
  applicability: Part11Applicability;
}

export type Part11Section =
  | 'subpart_a'   // General Provisions (11.1-11.3)
  | 'subpart_b'   // Electronic Records (11.10)
  | 'subpart_c';  // Electronic Signatures (11.50-11.300)

export type Part11Applicability =
  | 'required'           // Must comply
  | 'conditional'        // Depends on use case
  | 'optional'           // Best practice
  | 'not_applicable';    // N/A for this system type

/**
 * System Control - How Ligature addresses Part 11
 */
export interface Part11Control {
  id: string;
  name: string;
  description: string;
  implementation: string;    // How it's implemented
  module: string;           // System module
  technical_details?: string;
  configuration?: string;   // Any configuration needed
  sop_reference?: string;   // Related SOP
}

/**
 * Compliance Assessment - Clause to Control mapping
 */
export interface Part11Assessment {
  id: string;
  clause_id: string;
  clause_number: string;
  clause_title: string;
  controls: Part11Control[];
  status: ComplianceStatus;
  gap_description?: string;
  remediation_plan?: string;
  remediation_date?: Date;
  evidence: EvidenceAttachment[];
  test_case_ids: TraceableItemId[];  // Links to RTM test cases
  assessed_by: string;
  assessed_at: Date;
  approved_by?: string;
  approved_at?: Date;
  notes?: string;
}

/**
 * Complete Part 11 Matrix Entry
 */
export interface Part11MatrixEntry {
  clause: Part11Clause;
  assessment: Part11Assessment;
  related_requirements: UserRequirement[];
}

/**
 * Part 11 Matrix Summary
 */
export interface Part11Summary {
  total_clauses: number;
  by_status: Record<ComplianceStatus, number>;
  by_section: Record<Part11Section, {
    total: number;
    compliant: number;
    partial: number;
    planned: number;
    not_applicable: number;
    non_compliant: number;
  }>;
  overall_compliance_score: number;  // 0-100
  gaps: Part11Gap[];
  last_assessed: Date;
}

/**
 * Identified Gap in Part 11 compliance
 */
export interface Part11Gap {
  clause_id: string;
  clause_number: string;
  gap_type: GapType;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  remediation: string;
  target_date?: Date;
  owner?: string;
}

export type GapType =
  | 'missing_control'
  | 'partial_implementation'
  | 'documentation_gap'
  | 'testing_gap'
  | 'procedural_gap';

// =============================================================================
// STANDARD PART 11 CLAUSES
// =============================================================================

/**
 * Standard Part 11 clauses for reference
 */
export const PART_11_CLAUSES: Part11Clause[] = [
  // Subpart B - Electronic Records
  {
    id: 'p11-10a',
    section: 'subpart_b',
    clause_number: '11.10(a)',
    title: 'Validation',
    full_text: 'Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records.',
    interpretation: 'Systems must be validated per GAMP 5 guidelines with documented evidence.',
    applicability: 'required',
  },
  {
    id: 'p11-10b',
    section: 'subpart_b',
    clause_number: '11.10(b)',
    title: 'Legible Record Generation',
    full_text: 'The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying by the agency.',
    interpretation: 'Must be able to export records as human-readable documents and electronic formats.',
    applicability: 'required',
  },
  {
    id: 'p11-10c',
    section: 'subpart_b',
    clause_number: '11.10(c)',
    title: 'Record Protection',
    full_text: 'Protection of records to enable their accurate and ready retrieval throughout the records retention period.',
    interpretation: 'Records must be stored securely with backup and disaster recovery.',
    applicability: 'required',
  },
  {
    id: 'p11-10d',
    section: 'subpart_b',
    clause_number: '11.10(d)',
    title: 'System Access Controls',
    full_text: 'Limiting system access to authorized individuals.',
    interpretation: 'Role-based access control with authentication required.',
    applicability: 'required',
  },
  {
    id: 'p11-10e',
    section: 'subpart_b',
    clause_number: '11.10(e)',
    title: 'Audit Trail',
    full_text: 'Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records.',
    interpretation: 'All record changes must be captured in tamper-evident audit trail.',
    applicability: 'required',
  },
  {
    id: 'p11-10f',
    section: 'subpart_b',
    clause_number: '11.10(f)',
    title: 'Operational Checks',
    full_text: 'Use of operational system checks to enforce permitted sequencing of steps and events, as appropriate.',
    interpretation: 'Workflow controls to enforce business rules and sequences.',
    applicability: 'conditional',
  },
  {
    id: 'p11-10g',
    section: 'subpart_b',
    clause_number: '11.10(g)',
    title: 'Authority Checks',
    full_text: 'Use of authority checks to ensure that only authorized individuals can use the system, electronically sign a record, access the operation or computer system input or output device, alter a record, or perform the operation at hand.',
    interpretation: 'Permission-based access to functions based on role and training.',
    applicability: 'required',
  },
  {
    id: 'p11-10h',
    section: 'subpart_b',
    clause_number: '11.10(h)',
    title: 'Device Checks',
    full_text: 'Use of device (e.g., terminal) checks to determine, as appropriate, the validity of the source of data input or operational instruction.',
    interpretation: 'Input validation and source verification where applicable.',
    applicability: 'conditional',
  },
  {
    id: 'p11-10i',
    section: 'subpart_b',
    clause_number: '11.10(i)',
    title: 'Personnel Training',
    full_text: 'Determination that persons who develop, maintain, or use electronic record/electronic signature systems have the education, training, and experience to perform their assigned tasks.',
    interpretation: 'Training records and qualification documentation required.',
    applicability: 'required',
  },
  {
    id: 'p11-10j',
    section: 'subpart_b',
    clause_number: '11.10(j)',
    title: 'Written Policies',
    full_text: 'The establishment of, and adherence to, written policies that hold individuals accountable and responsible for actions initiated under their electronic signatures.',
    interpretation: 'SOPs for electronic signature use and accountability.',
    applicability: 'required',
  },
  {
    id: 'p11-10k1',
    section: 'subpart_b',
    clause_number: '11.10(k)(1)',
    title: 'Document Control - Distribution',
    full_text: 'Appropriate controls over the distribution of, access to, and use of documentation for system operation and maintenance.',
    interpretation: 'Controlled document distribution with version control.',
    applicability: 'required',
  },
  {
    id: 'p11-10k2',
    section: 'subpart_b',
    clause_number: '11.10(k)(2)',
    title: 'Document Control - Revisions',
    full_text: 'Revision and change control procedures to maintain an audit trail that documents time-sequenced development and modification of systems documentation.',
    interpretation: 'Version history for all system documentation.',
    applicability: 'required',
  },
  // Subpart C - Electronic Signatures
  {
    id: 'p11-50a',
    section: 'subpart_c',
    clause_number: '11.50(a)',
    title: 'Signature Manifestations',
    full_text: 'Signed electronic records shall contain information associated with the signing that clearly indicates all of the following: (1) The printed name of the signer; (2) The date and time when the signature was executed; and (3) The meaning (such as review, approval, responsibility, or authorship) associated with the signature.',
    interpretation: 'Electronic signatures must display signer name, timestamp, and meaning.',
    applicability: 'required',
  },
  {
    id: 'p11-50b',
    section: 'subpart_c',
    clause_number: '11.50(b)',
    title: 'Signature Display',
    full_text: 'The items identified in paragraphs (a)(1), (a)(2), and (a)(3) of this section shall be subject to the same controls as for electronic records and shall be included as part of any human readable form of the electronic record.',
    interpretation: 'Signature information visible in all record views.',
    applicability: 'required',
  },
  {
    id: 'p11-70',
    section: 'subpart_c',
    clause_number: '11.70',
    title: 'Signature/Record Linking',
    full_text: 'Electronic signatures and handwritten signatures executed to electronic records shall be linked to their respective electronic records to ensure that the signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record by ordinary means.',
    interpretation: 'Cryptographic binding of signatures to records.',
    applicability: 'required',
  },
  {
    id: 'p11-100a',
    section: 'subpart_c',
    clause_number: '11.100(a)',
    title: 'Unique Identification',
    full_text: 'Each electronic signature shall be unique to one individual and shall not be reused by, or reassigned to, anyone else.',
    interpretation: 'Unique user identifiers that are never reused.',
    applicability: 'required',
  },
  {
    id: 'p11-100b',
    section: 'subpart_c',
    clause_number: '11.100(b)',
    title: 'Identity Verification',
    full_text: 'Before an organization establishes, assigns, certifies, or otherwise sanctions an individual\'s electronic signature, or any element of such electronic signature, the organization shall verify the identity of the individual.',
    interpretation: 'Identity verification before signature capability granted.',
    applicability: 'required',
  },
  {
    id: 'p11-100c',
    section: 'subpart_c',
    clause_number: '11.100(c)',
    title: 'Certification to FDA',
    full_text: 'Persons using electronic signatures shall, prior to or at the time of such use, certify to the agency that the electronic signatures in their system, used on or after August 20, 1997, are intended to be the legally binding equivalent of traditional handwritten signatures.',
    interpretation: 'Organization must certify to FDA that e-signatures are legally binding.',
    applicability: 'required',
  },
  {
    id: 'p11-200a1',
    section: 'subpart_c',
    clause_number: '11.200(a)(1)',
    title: 'Signature Components',
    full_text: 'Electronic signatures that are not based upon biometrics shall: (i) Employ at least two distinct identification components such as an identification code and password.',
    interpretation: 'Two-factor identification (username + password minimum).',
    applicability: 'required',
  },
  {
    id: 'p11-200a2',
    section: 'subpart_c',
    clause_number: '11.200(a)(2)',
    title: 'Continuous Session Signing',
    full_text: 'When an individual executes a series of signings during a single, continuous period of controlled system access, the first signing shall be executed using all electronic signature components; subsequent signings shall be executed using at least one electronic signature component that is only executable by, and designed to be used only by, the individual.',
    interpretation: 'First signature requires full auth; subsequent can use single component.',
    applicability: 'required',
  },
  {
    id: 'p11-200a3',
    section: 'subpart_c',
    clause_number: '11.200(a)(3)',
    title: 'Non-Continuous Signing',
    full_text: 'When an individual executes one or more signings not performed during a single, continuous period of controlled system access, each signing shall be executed using all of the electronic signature components.',
    interpretation: 'Each new session requires full authentication for signing.',
    applicability: 'required',
  },
  {
    id: 'p11-300a',
    section: 'subpart_c',
    clause_number: '11.300(a)',
    title: 'Unique ID Code',
    full_text: 'Maintaining the uniqueness of each combined identification code and password, such that no two individuals have the same combination of identification code and password.',
    interpretation: 'Unique username/password combinations enforced.',
    applicability: 'required',
  },
  {
    id: 'p11-300b',
    section: 'subpart_c',
    clause_number: '11.300(b)',
    title: 'Periodic ID Revision',
    full_text: 'Ensuring that identification code and password issuances are periodically checked, recalled, or revised (e.g., to cover such events as password aging).',
    interpretation: 'Password expiration and rotation policies.',
    applicability: 'required',
  },
  {
    id: 'p11-300c',
    section: 'subpart_c',
    clause_number: '11.300(c)',
    title: 'Loss Management',
    full_text: 'Following loss management procedures to electronically deauthorize lost, stolen, missing, or otherwise potentially compromised tokens, cards, and other devices that bear or generate identification code or password information, and to issue temporary or permanent replacements using suitable, rigorous controls.',
    interpretation: 'Procedures for handling compromised credentials.',
    applicability: 'required',
  },
  {
    id: 'p11-300d',
    section: 'subpart_c',
    clause_number: '11.300(d)',
    title: 'Unauthorized Use Detection',
    full_text: 'Use of transaction safeguards to prevent unauthorized use of passwords and/or identification codes, and to detect and report in an immediate and urgent manner any attempts at their unauthorized use to the system security unit, and, as appropriate, to organizational management.',
    interpretation: 'Intrusion detection and alerting for unauthorized access attempts.',
    applicability: 'required',
  },
  {
    id: 'p11-300e',
    section: 'subpart_c',
    clause_number: '11.300(e)',
    title: 'Device Testing',
    full_text: 'Initial and periodic testing of devices, such as tokens or cards, that bear or generate identification code or password information to ensure that they function properly and have not been altered in an unauthorized manner.',
    interpretation: 'Regular testing of authentication mechanisms.',
    applicability: 'conditional',
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate RTM code
 */
export function generateRequirementCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Calculate coverage percentage for an RTM entry
 */
export function calculateCoverage(entry: Partial<RTMEntry>): number {
  let covered = 0;
  let total = 4; // design, tests, code, execution
  
  if (entry.designs && entry.designs.length > 0) covered++;
  if (entry.test_cases && entry.test_cases.length > 0) covered++;
  if (entry.code_references && entry.code_references.length > 0) covered++;
  if (entry.executions && entry.executions.some(e => e.result === 'pass')) covered++;
  
  return (covered / total) * 100;
}

/**
 * Calculate overall Part 11 compliance score
 */
export function calculatePart11Score(assessments: Part11Assessment[]): number {
  if (assessments.length === 0) return 0;
  
  const weights: Record<ComplianceStatus, number> = {
    compliant: 1,
    partial: 0.5,
    planned: 0.25,
    not_applicable: 1, // N/A doesn't count against score
    non_compliant: 0,
  };
  
  const applicable = assessments.filter(a => a.status !== 'not_applicable');
  if (applicable.length === 0) return 100;
  
  const score = applicable.reduce((sum, a) => sum + weights[a.status], 0);
  return Math.round((score / applicable.length) * 100);
}

/**
 * Get Part 11 clause by ID
 */
export function getPart11Clause(clauseId: string): Part11Clause | undefined {
  return PART_11_CLAUSES.find(c => c.id === clauseId);
}

/**
 * Get Part 11 clauses by section
 */
export function getPart11ClausesBySection(section: Part11Section): Part11Clause[] {
  return PART_11_CLAUSES.filter(c => c.section === section);
}

/**
 * Validate RTM entry completeness
 */
export function validateRTMEntry(entry: RTMEntry): { valid: boolean; gaps: string[] } {
  const gaps: string[] = [];
  
  if (!entry.designs || entry.designs.length === 0) {
    gaps.push('No design specification linked');
  }
  
  if (!entry.test_cases || entry.test_cases.length === 0) {
    gaps.push('No test cases linked');
  }
  
  if (!entry.code_references || entry.code_references.length === 0) {
    gaps.push('No code references linked');
  }
  
  if (!entry.executions || entry.executions.length === 0) {
    gaps.push('No test executions recorded');
  } else if (!entry.executions.some(e => e.result === 'pass')) {
    gaps.push('No passing test execution');
  }
  
  return {
    valid: gaps.length === 0,
    gaps,
  };
}

/**
 * Format clause number for display
 */
export function formatClauseNumber(clause: Part11Clause): string {
  return `21 CFR ${clause.clause_number}`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ComplianceStatus): string {
  const colors: Record<ComplianceStatus, string> = {
    compliant: 'green',
    partial: 'yellow',
    planned: 'blue',
    not_applicable: 'gray',
    non_compliant: 'red',
  };
  return colors[status];
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: RequirementPriority): string {
  const colors: Record<RequirementPriority, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'gray',
  };
  return colors[priority];
}
