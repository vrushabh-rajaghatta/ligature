
/**
 * 21 CFR Part 11 Compliance Matrix Service
 * 
 * Maps Part 11 regulatory requirements to Ligature system controls
 * and tracks compliance assessment status.
 * 
 * @version 0.24.6
 */

import {
  Part11Clause,
  Part11Control,
  Part11Assessment,
  Part11MatrixEntry,
  Part11Summary,
  Part11Gap,
  Part11Section,
  ComplianceStatus,
  GapType,
  EvidenceAttachment,
  PART_11_CLAUSES,
  calculatePart11Score,
  getPart11Clause,
  getPart11ClausesBySection,
  formatClauseNumber,
  TraceableItemId,
} from '@/types/compliance-matrix';

// =============================================================================
// SERVICE STATE
// =============================================================================

interface Part11State {
  controls: Map<string, Part11Control>;
  assessments: Map<string, Part11Assessment>;
  control_sequence: number;
}

const state: Part11State = {
  controls: new Map(),
  assessments: new Map(),
  control_sequence: 0,
};

// =============================================================================
// PREDEFINED LIGATURE CONTROLS
// =============================================================================

/**
 * Standard Ligature controls that address Part 11 requirements
 */
export const LIGATURE_CONTROLS: Part11Control[] = [
  // Validation Controls
  {
    id: 'ctrl-val-001',
    name: 'System Validation Framework',
    description: 'GAMP 5 compliant validation framework with IQ/OQ/PQ protocols',
    implementation: 'Requirements Traceability Matrix (RTM) linking user requirements to test cases with documented evidence',
    module: 'Compliance',
    technical_details: 'Automated test suite with 2400+ tests, RTM service for traceability',
    sop_reference: 'SOP-VAL-001',
  },
  {
    id: 'ctrl-val-002',
    name: 'Operational Qualification Testing',
    description: 'OQ test scripts for all critical system functions',
    implementation: 'Test cases mapped to requirements with pass/fail documentation',
    module: 'Compliance',
    technical_details: 'Vitest automated testing, manual test protocols',
  },
  
  // Audit Trail Controls
  {
    id: 'ctrl-aud-001',
    name: 'Comprehensive Audit Trail',
    description: 'Tamper-evident audit logging of all record changes',
    implementation: 'Database-backed audit service with cryptographic checksums',
    module: 'Auth',
    technical_details: 'AuditTrailService with PostgreSQL storage, SHA-256 checksums',
    sop_reference: 'SOP-AUD-001',
  },
  {
    id: 'ctrl-aud-002',
    name: 'Audit Trail Immutability',
    description: 'Prevention of audit record modification or deletion',
    implementation: 'Append-only audit log with admin-only read access',
    module: 'Auth',
    technical_details: 'Database constraints prevent UPDATE/DELETE on audit_entries table',
  },
  {
    id: 'ctrl-aud-003',
    name: 'Audit Trail Export',
    description: 'Export audit records for regulatory review',
    implementation: 'CSV and PDF export with filtering options',
    module: 'Auth',
    technical_details: 'ComplianceReportService with HTML/PDF/JSON export',
  },
  
  // Access Control
  {
    id: 'ctrl-acc-001',
    name: 'User Authentication',
    description: 'Secure user authentication with password policies',
    implementation: 'bcrypt password hashing, JWT session tokens',
    module: 'Auth',
    technical_details: 'AuthService with bcrypt, HTTP-only secure cookies',
    sop_reference: 'SOP-ACC-001',
  },
  {
    id: 'ctrl-acc-002',
    name: 'Role-Based Access Control',
    description: 'Permission-based access to system functions',
    implementation: 'RBAC middleware with role-permission matrix',
    module: 'Auth',
    technical_details: 'RBAC library with permission checks on API routes',
  },
  {
    id: 'ctrl-acc-003',
    name: 'Session Management',
    description: 'Secure session handling with timeout',
    implementation: 'Session expiration and automatic logout',
    module: 'Auth',
    technical_details: 'SessionManager with configurable timeout, activity tracking',
  },
  {
    id: 'ctrl-acc-004',
    name: 'Unique User Identification',
    description: 'Unique user IDs that are never reused',
    implementation: 'UUID-based user identifiers with email uniqueness constraint',
    module: 'Auth',
    technical_details: 'Database unique constraint on user ID and email',
  },
  
  // Electronic Signatures
  {
    id: 'ctrl-sig-001',
    name: 'Electronic Signature Service',
    description: '21 CFR Part 11 compliant electronic signatures',
    implementation: 'Password re-entry for signature with meaning attribution',
    module: 'Auth',
    technical_details: 'ElectronicSignatureService with SHA-256 hash binding',
    sop_reference: 'SOP-SIG-001',
  },
  {
    id: 'ctrl-sig-002',
    name: 'Signature Manifestations',
    description: 'Display of signer name, date/time, and meaning',
    implementation: 'Signature display includes all required elements',
    module: 'Auth',
    technical_details: 'SignatureRecord type with userName, signedAt, meaning fields',
  },
  {
    id: 'ctrl-sig-003',
    name: 'Signature-Record Binding',
    description: 'Cryptographic binding of signatures to records',
    implementation: 'Hash-based signature linking that prevents transfer',
    module: 'Auth',
    technical_details: 'SignatureManifest with document hash included in signature',
  },
  {
    id: 'ctrl-sig-004',
    name: 'Signature Workflows',
    description: 'Defined signature workflows for document types',
    implementation: 'Configurable signature requirements per document type',
    module: 'Auth',
    technical_details: 'SIGNATURE_WORKFLOWS constant with document type mappings',
  },
  
  // Record Protection
  {
    id: 'ctrl-rec-001',
    name: 'Data Integrity',
    description: 'Protection against unauthorized record modification',
    implementation: 'Database constraints and application-level validation',
    module: 'Database',
    technical_details: 'Prisma schema with required fields, foreign key constraints',
  },
  {
    id: 'ctrl-rec-002',
    name: 'Record Retention',
    description: 'Long-term record storage and retrieval',
    implementation: 'PostgreSQL database with backup procedures',
    module: 'Database',
    technical_details: 'Supabase managed PostgreSQL with automated backups',
  },
  {
    id: 'ctrl-rec-003',
    name: 'Record Export',
    description: 'Human-readable and electronic record copies',
    implementation: 'PDF and structured data export capabilities',
    module: 'Documents',
    technical_details: 'PDF generation, JSON/CSV export for all record types',
  },
  
  // Operational Controls
  {
    id: 'ctrl-ops-001',
    name: 'Workflow Enforcement',
    description: 'System-enforced workflow sequences',
    implementation: 'State machine workflows with validation',
    module: 'Clinical',
    technical_details: 'ICSR workflow state machine, approval workflows',
  },
  {
    id: 'ctrl-ops-002',
    name: 'Input Validation',
    description: 'Validation of user inputs and data integrity',
    implementation: 'Frontend and backend validation with error handling',
    module: 'Core',
    technical_details: 'Zod schemas, form validation, API input validation',
  },
  
  // Security Controls
  {
    id: 'ctrl-sec-001',
    name: 'Password Policy',
    description: 'Strong password requirements and aging',
    implementation: 'Minimum complexity requirements, expiration policy',
    module: 'Auth',
    technical_details: 'Password validation rules, expiration tracking',
    sop_reference: 'SOP-SEC-001',
  },
  {
    id: 'ctrl-sec-002',
    name: 'Login Monitoring',
    description: 'Detection of unauthorized access attempts',
    implementation: 'Failed login tracking and lockout',
    module: 'Auth',
    technical_details: 'Login attempt logging, account lockout after failures',
  },
  {
    id: 'ctrl-sec-003',
    name: 'Credential Recovery',
    description: 'Secure password reset procedures',
    implementation: 'Email-based password reset with expiring tokens',
    module: 'Auth',
    technical_details: 'Password reset flow with time-limited tokens',
  },
];

// =============================================================================
// CONTROL OPERATIONS
// =============================================================================

/**
 * Initialize default controls
 */
export function initializeDefaultControls(): void {
  LIGATURE_CONTROLS.forEach(control => {
    state.controls.set(control.id, control);
  });
}

/**
 * Create a custom control
 */
export function createControl(
  control: Omit<Part11Control, 'id'>
): Part11Control {
  state.control_sequence++;
  const id = `ctrl-custom-${String(state.control_sequence).padStart(3, '0')}`;
  const newControl: Part11Control = { id, ...control };
  state.controls.set(id, newControl);
  return newControl;
}

/**
 * Update a control
 */
export function updateControl(
  id: string,
  updates: Partial<Omit<Part11Control, 'id'>>
): Part11Control | null {
  const control = state.controls.get(id);
  if (!control) return null;
  
  const updated: Part11Control = { ...control, ...updates };
  state.controls.set(id, updated);
  return updated;
}

/**
 * Get control by ID
 */
export function getControl(id: string): Part11Control | null {
  return state.controls.get(id) || null;
}

/**
 * Get all controls
 */
export function getAllControls(): Part11Control[] {
  return Array.from(state.controls.values());
}

/**
 * Get controls by module
 */
export function getControlsByModule(module: string): Part11Control[] {
  return Array.from(state.controls.values())
    .filter(c => c.module === module);
}

/**
 * Search controls
 */
export function searchControls(query: string): Part11Control[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(state.controls.values())
    .filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.implementation.toLowerCase().includes(lowerQuery)
    );
}

// =============================================================================
// ASSESSMENT OPERATIONS
// =============================================================================

export interface CreateAssessmentRequest {
  clause_id: string;
  control_ids: string[];
  status: ComplianceStatus;
  gap_description?: string;
  remediation_plan?: string;
  remediation_date?: Date;
  test_case_ids?: TraceableItemId[];
  assessed_by: string;
  notes?: string;
}

/**
 * Create or update an assessment for a Part 11 clause
 */
export function assessClause(request: CreateAssessmentRequest): Part11Assessment | null {
  const clause = getPart11Clause(request.clause_id);
  if (!clause) return null;
  
  const controls = request.control_ids
    .map(id => state.controls.get(id))
    .filter((c): c is Part11Control => c !== undefined);
  
  const id = `assess-${request.clause_id}`;
  
  const assessment: Part11Assessment = {
    id,
    clause_id: request.clause_id,
    clause_number: clause.clause_number,
    clause_title: clause.title,
    controls,
    status: request.status,
    gap_description: request.gap_description,
    remediation_plan: request.remediation_plan,
    remediation_date: request.remediation_date,
    evidence: [],
    test_case_ids: request.test_case_ids || [],
    assessed_by: request.assessed_by,
    assessed_at: new Date(),
    notes: request.notes,
  };
  
  state.assessments.set(id, assessment);
  return assessment;
}

/**
 * Update an assessment
 */
export function updateAssessment(
  clauseId: string,
  updates: Partial<Omit<Part11Assessment, 'id' | 'clause_id' | 'clause_number' | 'clause_title'>>
): Part11Assessment | null {
  const id = `assess-${clauseId}`;
  const assessment = state.assessments.get(id);
  if (!assessment) return null;
  
  const updated: Part11Assessment = {
    ...assessment,
    ...updates,
    assessed_at: new Date(),
  };
  
  state.assessments.set(id, updated);
  return updated;
}

/**
 * Approve an assessment
 */
export function approveAssessment(
  clauseId: string,
  approvedBy: string
): Part11Assessment | null {
  return updateAssessment(clauseId, {
    approved_by: approvedBy,
    approved_at: new Date(),
  });
}

/**
 * Get assessment by clause ID
 */
export function getAssessment(clauseId: string): Part11Assessment | null {
  return state.assessments.get(`assess-${clauseId}`) || null;
}

/**
 * Get all assessments
 */
export function getAllAssessments(): Part11Assessment[] {
  return Array.from(state.assessments.values());
}

/**
 * Get assessments by status
 */
export function getAssessmentsByStatus(status: ComplianceStatus): Part11Assessment[] {
  return Array.from(state.assessments.values())
    .filter(a => a.status === status);
}

/**
 * Add evidence to an assessment
 */
export function addAssessmentEvidence(
  clauseId: string,
  evidence: Omit<EvidenceAttachment, 'id'>
): EvidenceAttachment | null {
  const id = `assess-${clauseId}`;
  const assessment = state.assessments.get(id);
  if (!assessment) return null;
  
  const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const attachment: EvidenceAttachment = { id: evidenceId, ...evidence };
  
  assessment.evidence.push(attachment);
  state.assessments.set(id, assessment);
  
  return attachment;
}

/**
 * Link test cases to an assessment
 */
export function linkTestCasesToAssessment(
  clauseId: string,
  testCaseIds: TraceableItemId[]
): Part11Assessment | null {
  const assessment = getAssessment(clauseId);
  if (!assessment) return null;
  
  const newIds = Array.from(new Set([...assessment.test_case_ids, ...testCaseIds]));
  return updateAssessment(clauseId, { test_case_ids: newIds });
}

// =============================================================================
// MATRIX OPERATIONS
// =============================================================================

/**
 * Build complete Part 11 matrix entry
 */
export function buildMatrixEntry(clauseId: string): Part11MatrixEntry | null {
  const clause = getPart11Clause(clauseId);
  if (!clause) return null;
  
  const assessment = getAssessment(clauseId);
  
  // If no assessment exists, create a placeholder
  const defaultAssessment: Part11Assessment = assessment || {
    id: `assess-${clauseId}`,
    clause_id: clauseId,
    clause_number: clause.clause_number,
    clause_title: clause.title,
    controls: [],
    status: 'planned',
    evidence: [],
    test_case_ids: [],
    assessed_by: 'System',
    assessed_at: new Date(),
  };
  
  return {
    clause,
    assessment: defaultAssessment,
    related_requirements: [], // Would be populated from RTM linkage
  };
}

/**
 * Build complete Part 11 matrix
 */
export function buildFullMatrix(): Part11MatrixEntry[] {
  return PART_11_CLAUSES
    .map(clause => buildMatrixEntry(clause.id))
    .filter((e): e is Part11MatrixEntry => e !== null);
}

/**
 * Get matrix entries by section
 */
export function getMatrixBySection(section: Part11Section): Part11MatrixEntry[] {
  return getPart11ClausesBySection(section)
    .map(clause => buildMatrixEntry(clause.id))
    .filter((e): e is Part11MatrixEntry => e !== null);
}

/**
 * Get Part 11 summary statistics
 */
export function getPart11Summary(): Part11Summary {
  const assessments = getAllAssessments();
  const allClauses = PART_11_CLAUSES;
  
  // Count by status
  const byStatus: Record<ComplianceStatus, number> = {
    compliant: 0,
    partial: 0,
    planned: 0,
    not_applicable: 0,
    non_compliant: 0,
  };
  
  assessments.forEach(a => {
    byStatus[a.status]++;
  });
  
  // Add unassessed clauses as planned
  const unassessedCount = allClauses.length - assessments.length;
  byStatus.planned += unassessedCount;
  
  // Count by section
  const sections: Part11Section[] = ['subpart_a', 'subpart_b', 'subpart_c'];
  const bySection: Record<Part11Section, {
    total: number;
    compliant: number;
    partial: number;
    planned: number;
    not_applicable: number;
    non_compliant: number;
  }> = {} as any;
  
  sections.forEach(section => {
    const sectionClauses = getPart11ClausesBySection(section);
    const sectionAssessments = assessments.filter(a => 
      sectionClauses.some(c => c.id === a.clause_id)
    );
    
    bySection[section] = {
      total: sectionClauses.length,
      compliant: sectionAssessments.filter(a => a.status === 'compliant').length,
      partial: sectionAssessments.filter(a => a.status === 'partial').length,
      planned: sectionClauses.length - sectionAssessments.length + 
               sectionAssessments.filter(a => a.status === 'planned').length,
      not_applicable: sectionAssessments.filter(a => a.status === 'not_applicable').length,
      non_compliant: sectionAssessments.filter(a => a.status === 'non_compliant').length,
    };
  });
  
  // Calculate overall score
  const overallScore = calculatePart11Score(assessments);
  
  // Identify gaps
  const gaps: Part11Gap[] = assessments
    .filter(a => a.status === 'partial' || a.status === 'non_compliant' || a.status === 'planned')
    .filter(a => a.gap_description)
    .map(a => ({
      clause_id: a.clause_id,
      clause_number: a.clause_number,
      gap_type: determineGapType(a),
      description: a.gap_description || 'Assessment pending',
      severity: a.status === 'non_compliant' ? 'critical' : 
                a.status === 'partial' ? 'major' : 'minor',
      remediation: a.remediation_plan || 'Remediation plan pending',
      target_date: a.remediation_date,
    }));
  
  // Find latest assessment date
  const lastAssessed = assessments.length > 0
    ? new Date(Math.max(...assessments.map(a => a.assessed_at.getTime())))
    : new Date();
  
  return {
    total_clauses: allClauses.length,
    by_status: byStatus,
    by_section: bySection,
    overall_compliance_score: overallScore,
    gaps,
    last_assessed: lastAssessed,
  };
}

/**
 * Determine gap type from assessment
 */
function determineGapType(assessment: Part11Assessment): GapType {
  if (assessment.controls.length === 0) {
    return 'missing_control';
  }
  if (assessment.evidence.length === 0) {
    return 'documentation_gap';
  }
  if (assessment.test_case_ids.length === 0) {
    return 'testing_gap';
  }
  return 'partial_implementation';
}

/**
 * Find non-compliant clauses
 */
export function findNonCompliantClauses(): Part11Assessment[] {
  return getAssessmentsByStatus('non_compliant');
}

/**
 * Find clauses needing attention
 */
export function findClausesNeedingAttention(): Part11MatrixEntry[] {
  const matrix = buildFullMatrix();
  return matrix.filter(entry => 
    entry.assessment.status === 'partial' ||
    entry.assessment.status === 'non_compliant' ||
    entry.assessment.status === 'planned'
  );
}

// =============================================================================
// CLAUSE-CONTROL MAPPING SUGGESTIONS
// =============================================================================

/**
 * Suggest controls for a clause based on clause type
 */
export function suggestControlsForClause(clauseId: string): Part11Control[] {
  const clause = getPart11Clause(clauseId);
  if (!clause) return [];
  
  // Map clause patterns to control IDs
  const controlMappings: Record<string, string[]> = {
    'p11-10a': ['ctrl-val-001', 'ctrl-val-002'],
    'p11-10b': ['ctrl-rec-003'],
    'p11-10c': ['ctrl-rec-001', 'ctrl-rec-002'],
    'p11-10d': ['ctrl-acc-001', 'ctrl-acc-002', 'ctrl-acc-004'],
    'p11-10e': ['ctrl-aud-001', 'ctrl-aud-002', 'ctrl-aud-003'],
    'p11-10f': ['ctrl-ops-001'],
    'p11-10g': ['ctrl-acc-002'],
    'p11-10h': ['ctrl-ops-002'],
    'p11-10i': [], // Training - procedural
    'p11-10j': [], // Written policies - procedural
    'p11-10k1': [], // Document control - procedural
    'p11-10k2': [], // Revision control - procedural
    'p11-50a': ['ctrl-sig-001', 'ctrl-sig-002'],
    'p11-50b': ['ctrl-sig-002'],
    'p11-70': ['ctrl-sig-003'],
    'p11-100a': ['ctrl-acc-004'],
    'p11-100b': [], // Identity verification - procedural
    'p11-100c': [], // FDA certification - procedural
    'p11-200a1': ['ctrl-acc-001'],
    'p11-200a2': ['ctrl-acc-003', 'ctrl-sig-001'],
    'p11-200a3': ['ctrl-acc-001', 'ctrl-sig-001'],
    'p11-300a': ['ctrl-acc-004'],
    'p11-300b': ['ctrl-sec-001'],
    'p11-300c': ['ctrl-sec-003'],
    'p11-300d': ['ctrl-sec-002'],
    'p11-300e': [], // Device testing - procedural
  };
  
  const controlIds = controlMappings[clauseId] || [];
  return controlIds
    .map(id => state.controls.get(id))
    .filter((c): c is Part11Control => c !== undefined);
}

/**
 * Auto-assess all clauses with suggested controls
 */
export function autoAssessWithDefaults(assessedBy: string): void {
  PART_11_CLAUSES.forEach(clause => {
    const existingAssessment = getAssessment(clause.id);
    if (!existingAssessment) {
      const suggestedControls = suggestControlsForClause(clause.id);
      const status: ComplianceStatus = 
        suggestedControls.length > 0 ? 'compliant' : 
        clause.applicability === 'conditional' ? 'not_applicable' : 'planned';
      
      assessClause({
        clause_id: clause.id,
        control_ids: suggestedControls.map(c => c.id),
        status,
        assessed_by: assessedBy,
        notes: suggestedControls.length > 0 
          ? 'Auto-assessed based on system capabilities'
          : 'Requires procedural controls or manual assessment',
      });
    }
  });
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * Export Part 11 matrix state to JSON
 */
export function exportPart11State(): string {
  const exportData = {
    controls: Array.from(state.controls.values()),
    assessments: Array.from(state.assessments.values()),
    control_sequence: state.control_sequence,
    exported_at: new Date().toISOString(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import Part 11 matrix state from JSON
 */
export function importPart11State(json: string): boolean {
  try {
    const data = JSON.parse(json);
    
    // Clear existing state (except default controls)
    state.controls.clear();
    state.assessments.clear();
    
    // Re-initialize default controls
    initializeDefaultControls();
    
    // Import custom controls
    data.controls?.forEach((c: Part11Control) => {
      if (!c.id.startsWith('ctrl-custom-')) return; // Skip defaults
      state.controls.set(c.id, c);
    });
    
    // Import assessments
    data.assessments?.forEach((a: Part11Assessment) => {
      a.assessed_at = new Date(a.assessed_at);
      if (a.approved_at) {
        a.approved_at = new Date(a.approved_at);
      }
      if (a.remediation_date) {
        a.remediation_date = new Date(a.remediation_date);
      }
      a.evidence.forEach(e => {
        e.uploaded_at = new Date(e.uploaded_at);
      });
      state.assessments.set(a.id, a);
    });
    
    if (data.control_sequence) {
      state.control_sequence = data.control_sequence;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import Part 11 state:', error);
    return false;
  }
}

/**
 * Reset Part 11 state (for testing)
 */
export function resetPart11State(): void {
  state.controls.clear();
  state.assessments.clear();
  state.control_sequence = 0;
}

/**
 * Initialize service with defaults
 */
export function initializePart11Service(): void {
  if (state.controls.size === 0) {
    initializeDefaultControls();
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generate Part 11 compliance report as HTML
 */
export function generateComplianceReportHTML(): string {
  const summary = getPart11Summary();
  const matrix = buildFullMatrix();
  
  const statusBadge = (status: ComplianceStatus): string => {
    const colors: Record<ComplianceStatus, string> = {
      compliant: '#22c55e',
      partial: '#f59e0b',
      planned: '#3b82f6',
      not_applicable: '#6b7280',
      non_compliant: '#ef4444',
    };
    return `<span style="background: ${colors[status]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${status.replace('_', ' ').toUpperCase()}</span>`;
  };
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>21 CFR Part 11 Compliance Matrix - Ligature</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; padding: 24px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { margin: 0 0 8px 0; color: #1e293b; }
    .header .meta { color: #64748b; font-size: 14px; }
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { margin: 0 0 16px 0; color: #334155; font-size: 18px; }
    .score { font-size: 48px; font-weight: 700; color: ${summary.overall_compliance_score >= 90 ? '#22c55e' : summary.overall_compliance_score >= 70 ? '#f59e0b' : '#ef4444'}; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .stat { text-align: center; padding: 16px; background: #f8fafc; border-radius: 6px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .section-header { background: #1e293b; color: white; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
    .gap { padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; margin-bottom: 8px; }
    .gap.major { background: #fef3c7; border-color: #f59e0b; }
    .gap.minor { background: #f0f9ff; border-color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>21 CFR Part 11 Compliance Matrix</h1>
      <div class="meta">
        Ligature Intelligent Development & Operations Platform<br>
        Generated: ${new Date().toLocaleString()}<br>
        Last Assessment: ${summary.last_assessed.toLocaleDateString()}
      </div>
    </div>

    <div class="card">
      <h2>Overall Compliance Score</h2>
      <div style="display: flex; align-items: center; gap: 24px;">
        <div class="score">${summary.overall_compliance_score}%</div>
        <div class="stats-grid" style="flex: 1;">
          <div class="stat">
            <div class="stat-value" style="color: #22c55e;">${summary.by_status.compliant}</div>
            <div class="stat-label">Compliant</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #f59e0b;">${summary.by_status.partial}</div>
            <div class="stat-label">Partial</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #3b82f6;">${summary.by_status.planned}</div>
            <div class="stat-label">Planned</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #ef4444;">${summary.by_status.non_compliant}</div>
            <div class="stat-label">Non-Compliant</div>
          </div>
        </div>
      </div>
    </div>

    ${summary.gaps.length > 0 ? `
    <div class="card">
      <h2>Identified Gaps (${summary.gaps.length})</h2>
      ${summary.gaps.map(gap => `
        <div class="gap ${gap.severity}">
          <strong>21 CFR ${gap.clause_number}</strong> - ${gap.description}<br>
          <small>Remediation: ${gap.remediation}${gap.target_date ? ` (Target: ${gap.target_date.toLocaleDateString()})` : ''}</small>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="card">
      <h2>Compliance Matrix</h2>
      <table>
        <thead>
          <tr class="section-header">
            <th colspan="4">Subpart B - Electronic Records (11.10)</th>
          </tr>
          <tr>
            <th style="width: 120px;">Clause</th>
            <th style="width: 200px;">Title</th>
            <th>Controls</th>
            <th style="width: 120px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${matrix.filter(e => e.clause.section === 'subpart_b').map(entry => `
            <tr>
              <td><strong>§${entry.clause.clause_number}</strong></td>
              <td>${entry.clause.title}</td>
              <td>${entry.assessment.controls.length > 0 ? entry.assessment.controls.map(c => c.name).join(', ') : '<em>Procedural</em>'}</td>
              <td>${statusBadge(entry.assessment.status)}</td>
            </tr>
          `).join('')}
        </tbody>
        <thead>
          <tr class="section-header">
            <th colspan="4">Subpart C - Electronic Signatures (11.50-11.300)</th>
          </tr>
        </thead>
        <tbody>
          ${matrix.filter(e => e.clause.section === 'subpart_c').map(entry => `
            <tr>
              <td><strong>§${entry.clause.clause_number}</strong></td>
              <td>${entry.clause.title}</td>
              <td>${entry.assessment.controls.length > 0 ? entry.assessment.controls.map(c => c.name).join(', ') : '<em>Procedural</em>'}</td>
              <td>${statusBadge(entry.assessment.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      This report was generated by Ligature Part 11 Compliance Matrix Service<br>
      21 CFR Part 11 Electronic Records; Electronic Signatures
    </div>
  </div>
</body>
</html>`;
}

// =============================================================================
// SERVICE EXPORT
// =============================================================================

export const part11Service = {
  // Controls
  initializeDefaultControls,
  createControl,
  updateControl,
  getControl,
  getAllControls,
  getControlsByModule,
  searchControls,
  
  // Assessments
  assessClause,
  updateAssessment,
  approveAssessment,
  getAssessment,
  getAllAssessments,
  getAssessmentsByStatus,
  addAssessmentEvidence,
  linkTestCasesToAssessment,
  
  // Matrix Operations
  buildMatrixEntry,
  buildFullMatrix,
  getMatrixBySection,
  getPart11Summary,
  findNonCompliantClauses,
  findClausesNeedingAttention,
  
  // Suggestions
  suggestControlsForClause,
  autoAssessWithDefaults,
  
  // Import/Export
  exportPart11State,
  importPart11State,
  resetPart11State,
  initializePart11Service,
  
  // Reports
  generateComplianceReportHTML,
  
  // Constants
  LIGATURE_CONTROLS,
};
