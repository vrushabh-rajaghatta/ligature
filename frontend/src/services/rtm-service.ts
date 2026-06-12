
/**
 * Requirements Traceability Matrix (RTM) Service
 * 
 * Manages bidirectional traceability between:
 * User Requirements → Design Specs → Test Cases → Code → Validation Results
 * 
 * @version 0.24.6
 */

import {
  UserRequirement,
  DesignSpecification,
  TestCase,
  TestExecution,
  CodeReference,
  EvidenceAttachment,
  RTMEntry,
  RTMSummary,
  CoverageMetrics,
  RequirementCategory,
  RequirementPriority,
  RequirementStatus,
  DesignStatus,
  TestCaseStatus,
  TestResult,
  TraceableItemId,
  QualificationPhase,
  GampCategory,
  generateRequirementCode,
  calculateCoverage,
  validateRTMEntry,
} from '@/types/compliance-matrix';

// =============================================================================
// SERVICE STATE
// =============================================================================

interface RTMState {
  requirements: Map<TraceableItemId, UserRequirement>;
  designs: Map<TraceableItemId, DesignSpecification>;
  test_cases: Map<TraceableItemId, TestCase>;
  executions: Map<string, TestExecution>;
  code_references: Map<TraceableItemId, CodeReference>;
  evidence: Map<string, EvidenceAttachment>;
  sequences: {
    requirements: number;
    designs: number;
    test_cases: number;
    code_refs: number;
    executions: number;
  };
}

const state: RTMState = {
  requirements: new Map(),
  designs: new Map(),
  test_cases: new Map(),
  executions: new Map(),
  code_references: new Map(),
  evidence: new Map(),
  sequences: {
    requirements: 0,
    designs: 0,
    test_cases: 0,
    code_refs: 0,
    executions: 0,
  },
};

// =============================================================================
// REQUIREMENT OPERATIONS
// =============================================================================

export interface CreateRequirementRequest {
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  source: string;
  rationale?: string;
  acceptance_criteria: string[];
  phase: QualificationPhase;
  gamp_category: GampCategory;
  regulatory_reference?: string;
  created_by: string;
}

/**
 * Create a new user requirement
 */
export function createRequirement(request: CreateRequirementRequest): UserRequirement {
  state.sequences.requirements++;
  const code = generateRequirementCode('UR', state.sequences.requirements);
  const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const requirement: UserRequirement = {
    id,
    code,
    title: request.title,
    description: request.description,
    category: request.category,
    priority: request.priority,
    source: request.source,
    rationale: request.rationale,
    acceptance_criteria: request.acceptance_criteria,
    phase: request.phase,
    gamp_category: request.gamp_category,
    regulatory_reference: request.regulatory_reference,
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: request.created_by,
    version: 1,
  };
  
  state.requirements.set(id, requirement);
  return requirement;
}

/**
 * Update a requirement
 */
export function updateRequirement(
  id: TraceableItemId,
  updates: Partial<Omit<UserRequirement, 'id' | 'code' | 'created_at' | 'created_by'>>
): UserRequirement | null {
  const requirement = state.requirements.get(id);
  if (!requirement) return null;
  
  const updated: UserRequirement = {
    ...requirement,
    ...updates,
    updated_at: new Date(),
    version: requirement.version + 1,
  };
  
  state.requirements.set(id, updated);
  return updated;
}

/**
 * Get requirement by ID
 */
export function getRequirement(id: TraceableItemId): UserRequirement | null {
  return state.requirements.get(id) || null;
}

/**
 * Get all requirements
 */
export function getAllRequirements(): UserRequirement[] {
  return Array.from(state.requirements.values())
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get requirements by category
 */
export function getRequirementsByCategory(category: RequirementCategory): UserRequirement[] {
  return Array.from(state.requirements.values())
    .filter(r => r.category === category)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get requirements by status
 */
export function getRequirementsByStatus(status: RequirementStatus): UserRequirement[] {
  return Array.from(state.requirements.values())
    .filter(r => r.status === status)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get requirements by priority
 */
export function getRequirementsByPriority(priority: RequirementPriority): UserRequirement[] {
  return Array.from(state.requirements.values())
    .filter(r => r.priority === priority)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get requirements by phase
 */
export function getRequirementsByPhase(phase: QualificationPhase): UserRequirement[] {
  return Array.from(state.requirements.values())
    .filter(r => r.phase === phase)
    .sort((a, b) => a.code.localeCompare(b.code));
}

// =============================================================================
// DESIGN SPECIFICATION OPERATIONS
// =============================================================================

export interface CreateDesignRequest {
  title: string;
  description: string;
  requirement_ids: TraceableItemId[];
  technical_approach: string;
  components: string[];
  interfaces?: string[];
  constraints?: string[];
  assumptions?: string[];
  created_by: string;
}

/**
 * Create a new design specification
 */
export function createDesign(request: CreateDesignRequest): DesignSpecification {
  state.sequences.designs++;
  const code = generateRequirementCode('DS', state.sequences.designs);
  const id = `ds-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const design: DesignSpecification = {
    id,
    code,
    title: request.title,
    description: request.description,
    requirement_ids: request.requirement_ids,
    technical_approach: request.technical_approach,
    components: request.components,
    interfaces: request.interfaces,
    constraints: request.constraints,
    assumptions: request.assumptions,
    risks: [],
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: request.created_by,
    version: 1,
  };
  
  state.designs.set(id, design);
  return design;
}

/**
 * Update a design specification
 */
export function updateDesign(
  id: TraceableItemId,
  updates: Partial<Omit<DesignSpecification, 'id' | 'code' | 'created_at' | 'created_by'>>
): DesignSpecification | null {
  const design = state.designs.get(id);
  if (!design) return null;
  
  const updated: DesignSpecification = {
    ...design,
    ...updates,
    updated_at: new Date(),
    version: design.version + 1,
  };
  
  state.designs.set(id, updated);
  return updated;
}

/**
 * Get design by ID
 */
export function getDesign(id: TraceableItemId): DesignSpecification | null {
  return state.designs.get(id) || null;
}

/**
 * Get all designs
 */
export function getAllDesigns(): DesignSpecification[] {
  return Array.from(state.designs.values())
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get designs for a requirement
 */
export function getDesignsForRequirement(requirementId: TraceableItemId): DesignSpecification[] {
  return Array.from(state.designs.values())
    .filter(d => d.requirement_ids.includes(requirementId))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Link design to requirements
 */
export function linkDesignToRequirements(
  designId: TraceableItemId,
  requirementIds: TraceableItemId[]
): DesignSpecification | null {
  const design = state.designs.get(designId);
  if (!design) return null;
  
  const newIds = Array.from(new Set([...design.requirement_ids, ...requirementIds]));
  return updateDesign(designId, { requirement_ids: newIds });
}

// =============================================================================
// TEST CASE OPERATIONS
// =============================================================================

export interface CreateTestCaseRequest {
  title: string;
  description: string;
  requirement_ids: TraceableItemId[];
  design_ids: TraceableItemId[];
  type: TestCase['type'];
  priority: RequirementPriority;
  preconditions: string[];
  steps: TestCase['steps'];
  expected_result: string;
  test_data?: string;
  environment?: string;
  created_by: string;
}

/**
 * Create a new test case
 */
export function createTestCase(request: CreateTestCaseRequest): TestCase {
  state.sequences.test_cases++;
  const code = generateRequirementCode('TC', state.sequences.test_cases);
  const id = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const testCase: TestCase = {
    id,
    code,
    title: request.title,
    description: request.description,
    requirement_ids: request.requirement_ids,
    design_ids: request.design_ids,
    type: request.type,
    priority: request.priority,
    preconditions: request.preconditions,
    steps: request.steps,
    expected_result: request.expected_result,
    test_data: request.test_data,
    environment: request.environment,
    automation_status: 'manual',
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: request.created_by,
    version: 1,
  };
  
  state.test_cases.set(id, testCase);
  return testCase;
}

/**
 * Update a test case
 */
export function updateTestCase(
  id: TraceableItemId,
  updates: Partial<Omit<TestCase, 'id' | 'code' | 'created_at' | 'created_by'>>
): TestCase | null {
  const testCase = state.test_cases.get(id);
  if (!testCase) return null;
  
  const updated: TestCase = {
    ...testCase,
    ...updates,
    updated_at: new Date(),
    version: testCase.version + 1,
  };
  
  state.test_cases.set(id, updated);
  return updated;
}

/**
 * Get test case by ID
 */
export function getTestCase(id: TraceableItemId): TestCase | null {
  return state.test_cases.get(id) || null;
}

/**
 * Get all test cases
 */
export function getAllTestCases(): TestCase[] {
  return Array.from(state.test_cases.values())
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get test cases for a requirement
 */
export function getTestCasesForRequirement(requirementId: TraceableItemId): TestCase[] {
  return Array.from(state.test_cases.values())
    .filter(tc => tc.requirement_ids.includes(requirementId))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get test cases for a design
 */
export function getTestCasesForDesign(designId: TraceableItemId): TestCase[] {
  return Array.from(state.test_cases.values())
    .filter(tc => tc.design_ids.includes(designId))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Mark test case as automated
 */
export function markTestCaseAutomated(
  id: TraceableItemId,
  automationReference: string
): TestCase | null {
  return updateTestCase(id, {
    automation_status: 'automated',
    automation_reference: automationReference,
  });
}

// =============================================================================
// TEST EXECUTION OPERATIONS
// =============================================================================

export interface RecordExecutionRequest {
  test_case_id: TraceableItemId;
  executed_by: string;
  environment: string;
  build_version: string;
  result: TestResult;
  actual_result: string;
  step_results: TestExecution['step_results'];
  duration_seconds?: number;
  defects_found?: string[];
  notes?: string;
}

/**
 * Record a test execution
 */
export function recordExecution(request: RecordExecutionRequest): TestExecution {
  // v0.27.8: Use sequence counter for deterministic ordering
  const seq = ++state.sequences.executions;
  const id = `exec-${String(seq).padStart(6, '0')}`;
  
  const execution: TestExecution = {
    id,
    test_case_id: request.test_case_id,
    executed_at: new Date(),
    executed_by: request.executed_by,
    environment: request.environment,
    build_version: request.build_version,
    result: request.result,
    actual_result: request.actual_result,
    step_results: request.step_results,
    duration_seconds: request.duration_seconds,
    defects_found: request.defects_found,
    notes: request.notes,
    attachments: [],
  };
  
  state.executions.set(id, execution);
  
  // Update test case status if passing
  const testCase = state.test_cases.get(request.test_case_id);
  if (testCase && request.result === 'pass') {
    updateTestCase(request.test_case_id, { status: 'active' });
  }
  
  return execution;
}

/**
 * Get execution by ID
 */
export function getExecution(id: string): TestExecution | null {
  return state.executions.get(id) || null;
}

/**
 * Get executions for a test case
 */
export function getExecutionsForTestCase(testCaseId: TraceableItemId): TestExecution[] {
  return Array.from(state.executions.values())
    .filter(e => e.test_case_id === testCaseId)
    .sort((a, b) => {
      // Sort by timestamp descending, use ID as tiebreaker for deterministic ordering
      const timeDiff = b.executed_at.getTime() - a.executed_at.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
}

/**
 * Get latest execution for a test case
 */
export function getLatestExecution(testCaseId: TraceableItemId): TestExecution | null {
  const executions = getExecutionsForTestCase(testCaseId);
  return executions.length > 0 ? executions[0] : null;
}

/**
 * Get all executions
 */
export function getAllExecutions(): TestExecution[] {
  return Array.from(state.executions.values())
    .sort((a, b) => {
      // Sort by timestamp descending, use ID as tiebreaker for deterministic ordering
      const timeDiff = b.executed_at.getTime() - a.executed_at.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
}

/**
 * Sign a test execution
 */
export function signExecution(
  executionId: string,
  signedBy: string,
  meaning: 'executed' | 'verified' | 'approved'
): TestExecution | null {
  const execution = state.executions.get(executionId);
  if (!execution) return null;
  
  const updated: TestExecution = {
    ...execution,
    signature: {
      signed_by: signedBy,
      signed_at: new Date(),
      meaning,
      hash: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
    },
  };
  
  state.executions.set(executionId, updated);
  return updated;
}

// =============================================================================
// CODE REFERENCE OPERATIONS
// =============================================================================

export interface CreateCodeRefRequest {
  design_id: TraceableItemId;
  file_path: string;
  line_range?: { start: number; end: number };
  function_name?: string;
  class_name?: string;
  module_name: string;
  description: string;
  commit_hash?: string;
}

/**
 * Create a code reference
 */
export function createCodeReference(request: CreateCodeRefRequest): CodeReference {
  state.sequences.code_refs++;
  const id = `cr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const codeRef: CodeReference = {
    id,
    design_id: request.design_id,
    file_path: request.file_path,
    line_range: request.line_range,
    function_name: request.function_name,
    class_name: request.class_name,
    module_name: request.module_name,
    description: request.description,
    commit_hash: request.commit_hash,
    created_at: new Date(),
  };
  
  state.code_references.set(id, codeRef);
  return codeRef;
}

/**
 * Get code reference by ID
 */
export function getCodeReference(id: TraceableItemId): CodeReference | null {
  return state.code_references.get(id) || null;
}

/**
 * Get code references for a design
 */
export function getCodeReferencesForDesign(designId: TraceableItemId): CodeReference[] {
  return Array.from(state.code_references.values())
    .filter(cr => cr.design_id === designId);
}

/**
 * Get all code references
 */
export function getAllCodeReferences(): CodeReference[] {
  return Array.from(state.code_references.values());
}

// =============================================================================
// EVIDENCE OPERATIONS
// =============================================================================

/**
 * Add evidence attachment
 */
export function addEvidence(evidence: Omit<EvidenceAttachment, 'id'>): EvidenceAttachment {
  const id = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const attachment: EvidenceAttachment = { id, ...evidence };
  state.evidence.set(id, attachment);
  return attachment;
}

/**
 * Get evidence by ID
 */
export function getEvidence(id: string): EvidenceAttachment | null {
  return state.evidence.get(id) || null;
}

/**
 * Get all evidence
 */
export function getAllEvidence(): EvidenceAttachment[] {
  return Array.from(state.evidence.values());
}

// =============================================================================
// RTM ENTRY OPERATIONS
// =============================================================================

/**
 * Build complete RTM entry for a requirement
 */
export function buildRTMEntry(requirementId: TraceableItemId): RTMEntry | null {
  const requirement = state.requirements.get(requirementId);
  if (!requirement) return null;
  
  // Get linked designs
  const designs = getDesignsForRequirement(requirementId);
  
  // Get test cases linked to requirement or its designs
  const testCases = getTestCasesForRequirement(requirementId);
  const designTestCases = designs.flatMap(d => getTestCasesForDesign(d.id));
  const allTestCases = Array.from(new Map([...testCases, ...designTestCases].map(tc => [tc.id, tc])).values());
  
  // Get code references for designs
  const codeRefs = designs.flatMap(d => getCodeReferencesForDesign(d.id));
  
  // Get executions for test cases
  const executions = allTestCases.flatMap(tc => getExecutionsForTestCase(tc.id));
  
  // Calculate coverage metrics
  const passCount = executions.filter(e => e.result === 'pass').length;
  const failCount = executions.filter(e => e.result === 'fail').length;
  
  const coverage: CoverageMetrics = {
    has_design: designs.length > 0,
    has_tests: allTestCases.length > 0,
    has_code: codeRefs.length > 0,
    has_execution: executions.length > 0,
    has_passing_execution: passCount > 0,
    design_count: designs.length,
    test_count: allTestCases.length,
    code_ref_count: codeRefs.length,
    execution_count: executions.length,
    pass_count: passCount,
    fail_count: failCount,
    coverage_percentage: calculateCoverage({
      designs,
      test_cases: allTestCases,
      code_references: codeRefs,
      executions,
    }),
  };
  
  return {
    requirement,
    designs,
    test_cases: allTestCases,
    code_references: codeRefs,
    executions,
    evidence: [],
    coverage,
  };
}

/**
 * Build RTM entries for all requirements
 */
export function buildFullRTM(): RTMEntry[] {
  return getAllRequirements()
    .map(r => buildRTMEntry(r.id))
    .filter((e): e is RTMEntry => e !== null);
}

/**
 * Get RTM summary statistics
 */
export function getRTMSummary(): RTMSummary {
  const requirements = getAllRequirements();
  const entries = buildFullRTM();
  
  // Count by category
  const byCategory = {} as Record<RequirementCategory, number>;
  const categories: RequirementCategory[] = [
    'functional', 'security', 'audit_trail', 'electronic_signature',
    'access_control', 'data_integrity', 'validation', 'reporting',
    'integration', 'performance', 'usability', 'regulatory',
  ];
  categories.forEach(c => {
    byCategory[c] = requirements.filter(r => r.category === c).length;
  });
  
  // Count by priority
  const byPriority = {} as Record<RequirementPriority, number>;
  const priorities: RequirementPriority[] = ['critical', 'high', 'medium', 'low'];
  priorities.forEach(p => {
    byPriority[p] = requirements.filter(r => r.priority === p).length;
  });
  
  // Count by status
  const byStatus = {} as Record<RequirementStatus, number>;
  const statuses: RequirementStatus[] = ['draft', 'approved', 'implemented', 'tested', 'validated', 'retired'];
  statuses.forEach(s => {
    byStatus[s] = requirements.filter(r => r.status === s).length;
  });
  
  // Coverage counts
  const withDesign = entries.filter(e => e.coverage.has_design).length;
  const withTests = entries.filter(e => e.coverage.has_tests).length;
  const withCode = entries.filter(e => e.coverage.has_code).length;
  const withExecution = entries.filter(e => e.coverage.has_execution).length;
  const fullyTraced = entries.filter(e => e.coverage.coverage_percentage === 100).length;
  const gaps = entries.length - fullyTraced;
  
  // Test summary
  const allTests = getAllTestCases();
  const allExecutions = getAllExecutions();
  const passRate = allExecutions.length > 0
    ? (allExecutions.filter(e => e.result === 'pass').length / allExecutions.length) * 100
    : 0;
  
  // Overall coverage
  const totalCoverage = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.coverage.coverage_percentage, 0) / entries.length
    : 0;
  
  return {
    total_requirements: requirements.length,
    by_category: byCategory,
    by_priority: byPriority,
    by_status: byStatus,
    coverage: {
      with_design: withDesign,
      with_tests: withTests,
      with_code: withCode,
      with_execution: withExecution,
      fully_traced: fullyTraced,
      gaps,
    },
    test_summary: {
      total_tests: allTests.length,
      automated: allTests.filter(t => t.automation_status === 'automated').length,
      manual: allTests.filter(t => t.automation_status === 'manual').length,
      executions: allExecutions.length,
      pass_rate: Math.round(passRate),
    },
    overall_coverage_percentage: Math.round(totalCoverage),
    last_updated: new Date(),
  };
}

/**
 * Find gaps in traceability
 */
export function findTraceabilityGaps(): Array<{
  requirement: UserRequirement;
  gaps: string[];
}> {
  const entries = buildFullRTM();
  const gapsFound: Array<{ requirement: UserRequirement; gaps: string[] }> = [];
  
  entries.forEach(entry => {
    const validation = validateRTMEntry(entry);
    if (!validation.valid) {
      gapsFound.push({
        requirement: entry.requirement,
        gaps: validation.gaps,
      });
    }
  });
  
  return gapsFound;
}

/**
 * Get orphaned designs (no requirement linked)
 */
export function getOrphanedDesigns(): DesignSpecification[] {
  return getAllDesigns().filter(d => d.requirement_ids.length === 0);
}

/**
 * Get orphaned test cases (no requirement or design linked)
 */
export function getOrphanedTestCases(): TestCase[] {
  return getAllTestCases().filter(tc => 
    tc.requirement_ids.length === 0 && tc.design_ids.length === 0
  );
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * Export RTM state to JSON
 */
export function exportRTMState(): string {
  const exportData = {
    requirements: Array.from(state.requirements.values()),
    designs: Array.from(state.designs.values()),
    test_cases: Array.from(state.test_cases.values()),
    executions: Array.from(state.executions.values()),
    code_references: Array.from(state.code_references.values()),
    evidence: Array.from(state.evidence.values()),
    sequences: state.sequences,
    exported_at: new Date().toISOString(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import RTM state from JSON
 */
export function importRTMState(json: string): boolean {
  try {
    const data = JSON.parse(json);
    
    // Clear existing state
    state.requirements.clear();
    state.designs.clear();
    state.test_cases.clear();
    state.executions.clear();
    state.code_references.clear();
    state.evidence.clear();
    
    // Import data
    data.requirements?.forEach((r: UserRequirement) => {
      r.created_at = new Date(r.created_at);
      r.updated_at = new Date(r.updated_at);
      state.requirements.set(r.id, r);
    });
    
    data.designs?.forEach((d: DesignSpecification) => {
      d.created_at = new Date(d.created_at);
      d.updated_at = new Date(d.updated_at);
      state.designs.set(d.id, d);
    });
    
    data.test_cases?.forEach((tc: TestCase) => {
      tc.created_at = new Date(tc.created_at);
      tc.updated_at = new Date(tc.updated_at);
      state.test_cases.set(tc.id, tc);
    });
    
    data.executions?.forEach((e: TestExecution) => {
      e.executed_at = new Date(e.executed_at);
      if (e.signature) {
        e.signature.signed_at = new Date(e.signature.signed_at);
      }
      state.executions.set(e.id, e);
    });
    
    data.code_references?.forEach((cr: CodeReference) => {
      cr.created_at = new Date(cr.created_at);
      state.code_references.set(cr.id, cr);
    });
    
    data.evidence?.forEach((ev: EvidenceAttachment) => {
      ev.uploaded_at = new Date(ev.uploaded_at);
      state.evidence.set(ev.id, ev);
    });
    
    if (data.sequences) {
      state.sequences = data.sequences;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import RTM state:', error);
    return false;
  }
}

/**
 * Reset RTM state (for testing)
 */
export function resetRTMState(): void {
  state.requirements.clear();
  state.designs.clear();
  state.test_cases.clear();
  state.executions.clear();
  state.code_references.clear();
  state.evidence.clear();
  state.sequences = {
    requirements: 0,
    designs: 0,
    test_cases: 0,
    code_refs: 0,
    executions: 0,
  };
}

// =============================================================================
// SERVICE EXPORT
// =============================================================================

export const rtmService = {
  // Requirements
  createRequirement,
  updateRequirement,
  getRequirement,
  getAllRequirements,
  getRequirementsByCategory,
  getRequirementsByStatus,
  getRequirementsByPriority,
  getRequirementsByPhase,
  
  // Designs
  createDesign,
  updateDesign,
  getDesign,
  getAllDesigns,
  getDesignsForRequirement,
  linkDesignToRequirements,
  
  // Test Cases
  createTestCase,
  updateTestCase,
  getTestCase,
  getAllTestCases,
  getTestCasesForRequirement,
  getTestCasesForDesign,
  markTestCaseAutomated,
  
  // Executions
  recordExecution,
  getExecution,
  getExecutionsForTestCase,
  getLatestExecution,
  getAllExecutions,
  signExecution,
  
  // Code References
  createCodeReference,
  getCodeReference,
  getCodeReferencesForDesign,
  getAllCodeReferences,
  
  // Evidence
  addEvidence,
  getEvidence,
  getAllEvidence,
  
  // RTM Operations
  buildRTMEntry,
  buildFullRTM,
  getRTMSummary,
  findTraceabilityGaps,
  getOrphanedDesigns,
  getOrphanedTestCases,
  
  // Import/Export
  exportRTMState,
  importRTMState,
  resetRTMState,
};
