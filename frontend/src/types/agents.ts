// =============================================================================
// AGENT SYSTEM TYPES — v0.105.0
// =============================================================================
// Shared types for the Ligature multi-agent system.
// All agents use these types to ensure a consistent contract with the
// agent engine, store, audit log, and human review queue.
// =============================================================================

// ── Risk levels ─────────────────────────────────────────────────────────────

export type AgentRiskLevel =
  | 'editorial'       // Typos, formatting, minor wording → autopilot
  | 'substantive'     // Content changes, missing data   → autopilot + 24h override
  | 'regulatory'      // ICH/FDA compliance issues       → human approval required
  | 'safety-critical'; // Safety data, contraindications → human + e-signature

export const RISK_AUTOPILOT: Record<AgentRiskLevel, boolean> = {
  'editorial': true,
  'substantive': true,
  'regulatory': false,
  'safety-critical': false,
};

// Hours before an autopilot action becomes permanent (0 = immediate)
export const RISK_OVERRIDE_WINDOW_HOURS: Record<AgentRiskLevel, number> = {
  'editorial': 0,
  'substantive': 24,
  'regulatory': 0,    // n/a — requires human approval
  'safety-critical': 0, // n/a — requires human approval
};

// ── Agent identifiers ────────────────────────────────────────────────────────

export type AgentId =
  | 'document-resolution'
  | 'haq-response'
  | 'icsr-processing'
  // Phase 2
  | 'site-monitoring'
  | 'submission-assembly'
  | 'signal-intelligence'
  | 'quality-intelligence'
  | 'reg-strategy'
  // Phase 3 (additional — use same AgentId pool where domain overlaps)
  | 'nonclinical-package'
  | 'research-intelligence'
  | 'study-operations'
  | 'labeling-management'
  | 'cmc-lifecycle'
  // Phase 4
  | 'medical-monitor'
  | 'biostatistician'
  | 'medical-affairs'
  | 'lead-optimisation'
  // Phase 5 — L4 Executive Orchestrator
  | 'portfolio-intelligence'
  // Phase 6 — HA Intelligence (v0.125.78)
  | 'ha-inspection'
  | 'ha-dossier'
  | 'ha-predictive-haq'
  // Phase 7 — Research Intelligence (v0.125.79)
  | 'candidate-targeting'
  | 'experiment-design'
  | 'pmda-inspection'      // v0.125.83: PMDA GMP/GCP inspection simulation
  | 'pmda-dossier'         // v0.125.83: J-NDA dossier review
  | 'pmda-advisory';       // v0.125.83: J-NDA strategy advisory

export const AGENT_DISPLAY: Record<AgentId, { name: string; persona: string; color: string }> = {
  'document-resolution':  { name: 'Document Resolution',  persona: 'Doc Control Manager',     color: 'amber' },
  'haq-response':         { name: 'HAQ Response',         persona: 'HAQ Manager',             color: 'purple' },
  'icsr-processing':      { name: 'ICSR Processing',      persona: 'PV Coordinator',          color: 'coral' },
  'site-monitoring':      { name: 'Site Monitoring',      persona: 'CRA',                     color: 'teal' },
  'submission-assembly':  { name: 'Submission Assembly',  persona: 'Submission Manager',      color: 'purple' },
  'signal-intelligence':  { name: 'Signal Intelligence',  persona: 'Safety Physician',        color: 'red' },
  'quality-intelligence': { name: 'Quality Intelligence', persona: 'QA Manager',              color: 'amber' },
  'reg-strategy':         { name: 'Reg Strategy',         persona: 'Reg Affairs Director',    color: 'blue' },
  'nonclinical-package':  { name: 'Nonclinical Package',  persona: 'GLP Study Director',      color: 'amber' },
  'research-intelligence':{ name: 'Research Intelligence',persona: 'Discovery Scientist',     color: 'green' },
  'study-operations':     { name: 'Study Operations',     persona: 'Study/CRO Manager',       color: 'teal' },
  'labeling-management':  { name: 'Labeling Management',  persona: 'Labeling Specialist',     color: 'purple' },
  'cmc-lifecycle':        { name: 'CMC Lifecycle',        persona: 'CMC Scientist',            color: 'pink' },
  'medical-monitor':      { name: 'Medical Monitor',      persona: 'Medical Monitor',         color: 'coral' },
  'biostatistician':      { name: 'Biostatistician',      persona: 'Biostatistician',         color: 'blue' },
  'medical-affairs':      { name: 'Medical Affairs',      persona: 'Medical Affairs / MSL',   color: 'green' },
  'lead-optimisation':    { name: 'Lead Optimisation',    persona: 'Medicinal Chemist',       color: 'purple' },
  'portfolio-intelligence': { name: 'Portfolio Intelligence', persona: 'Chief R&D Officer',     color: 'violet' },
  'ha-inspection':        { name: 'HA Inspection Readiness', persona: 'FDA/EMA Inspector Sim',  color: 'red'    },
  'ha-dossier':           { name: 'HA Dossier Review',      persona: 'HA Scientific Reviewer',  color: 'blue'   },
  'ha-predictive-haq':    { name: 'Predictive HAQ',          persona: 'Regulatory Intelligence',  color: 'violet' },
  'candidate-targeting':  { name: 'Candidate Targeting',     persona: 'Discovery Scientist',      color: 'green'  },
  'experiment-design':    { name: 'Experiment Design',       persona: 'Lead Optimisation Sci.',   color: 'teal'   },
  'pmda-inspection':      { name: 'PMDA Inspection Readiness', persona: 'PMDA GMP/GCP Inspector',  color: 'red'    },
  'pmda-dossier':         { name: 'PMDA J-NDA Dossier Review', persona: 'PMDA Scientific Reviewer', color: 'blue'   },
  'pmda-advisory':        { name: 'J-NDA Strategy Advisory',   persona: 'Japan Regulatory Expert',  color: 'violet' },
};

// ── Run status ───────────────────────────────────────────────────────────────

export type AgentRunStatus =
  | 'running'
  | 'completed'       // Autopilot action applied
  | 'escalated'       // Sent to human review queue
  | 'approved'        // Human approved the draft
  | 'rejected'        // Human rejected the draft
  | 'failed';         // Error during execution

// ── Tool types ───────────────────────────────────────────────────────────────

export interface AgentToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
}

// ── Core agent run record ────────────────────────────────────────────────────

export interface AgentRun {
  id: string;
  agentId: AgentId;
  status: AgentRunStatus;

  // What triggered this run
  triggeredBy: 'webhook' | 'scheduled' | 'manual' | 'cross-agent';
  triggerEntityType: string;  // e.g. 'comment', 'haq', 'icsr-case'
  triggerEntityId: string;

  // Classification result
  riskLevel: AgentRiskLevel | null;
  riskRationale: string | null;

  // What the agent decided to do
  decision: string | null;        // Human-readable summary of the action taken
  draftOutput: unknown | null;    // The draft content (resolution text, HAQ response, etc.)

  // Routing
  autopilot: boolean;
  reviewRequestId: string | null; // Set when escalated

  // Execution metadata
  toolCalls: AgentToolCall[];
  tokensUsed: number;
  durationMs: number;
  model: string;

  // Audit
  tenantId: string;
  initiatedBy: string;  // userId or 'system'
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

// ── Human review queue ───────────────────────────────────────────────────────

export type ReviewOutcome = 'approved' | 'rejected' | 'modified';

export interface AgentReviewRequest {
  id: string;
  agentRunId: string;
  agentId: AgentId;

  // What needs reviewing
  entityType: string;
  entityId: string;
  entityLabel: string;    // Human-readable e.g. "IR-2026-001 — Section 4.2"

  riskLevel: AgentRiskLevel;
  summary: string;        // 1-line description of what the agent wants to do
  draftOutput: unknown;   // The agent's proposed action/content

  // SLA
  dueAt: string;          // When this needs a decision by
  priority: 'urgent' | 'high' | 'normal';

  // Resolution
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'expired';
  outcome: ReviewOutcome | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  modifiedOutput: unknown | null;

  tenantId: string;
  createdAt: string;
}

// ── Agent trigger payload ────────────────────────────────────────────────────

export interface AgentTriggerPayload {
  agentId: AgentId;
  entityType: string;
  entityId: string;
  triggeredBy: AgentRun['triggeredBy'];
  initiatedBy: string;
  tenantId: string;
  context?: Record<string, unknown>;
}

// ── Per-agent input/output contracts ─────────────────────────────────────────

export interface DocResolutionInput {
  commentId: string;
  documentId: string;
  sectionId?: string;
}

export interface DocResolutionOutput {
  commentId: string;
  riskLevel: AgentRiskLevel;
  riskRationale: string;
  proposedResolution: string;
  proposedStatus: 'resolved' | 'rejected';
  regulatoryBasis?: string;
  autopilotApplied: boolean;
}

export interface HAQResponseInput {
  haqId: string;
}

export interface HAQResponseOutput {
  haqId: string;
  riskLevel: AgentRiskLevel;
  discipline: string;
  responseOutline: string;
  regulatoryBasis: string[];
  precedentIds: string[];
  recommendedReviewer: string;
  draftSections: { title: string; content: string }[];
  autopilotApplied: boolean;
}

export interface ICSRProcessingInput {
  caseId: string;
}

export interface ICSRProcessingOutput {
  caseId: string;
  riskLevel: AgentRiskLevel;
  seriousnessAssessment: string;
  suggestedMeddraPT: string;
  suggestedMeddraHLT: string;
  suggestedSOC: string;
  narrativeDraft: string;
  regulatoryDeadline: string;
  requiresExpedited: boolean;
  autopilotApplied: boolean;
}

// =============================================================================
// PHASE 5 TYPES — Portfolio Intelligence · Proactive Mode · Learning Layer
// =============================================================================

// ── Portfolio Intelligence (L4) ───────────────────────────────────────────────

export interface ProgrammeScore {
  programmeId: string;       // e.g. 'LIG-2847' (Nexavant)
  programmeName: string;
  indication: string;
  phase: string;             // Phase 1 / Phase 2 / Phase 3 / NDA
  goNoGoScore: number;       // 0–100 composite
  goNoGoVerdict: 'go' | 'conditional-go' | 'hold' | 'no-go';
  dimensionScores: {
    safety: number;
    cmc: number;
    regulatory: number;
    clinical: number;
    resources: number;
  };
  topRisks: string[];
  nextMilestone: string;
  nextMilestoneDate: string;
  lastUpdated: string;
}

export interface ResourceConflict {
  id: string;
  conflictType: 'personnel' | 'budget' | 'lab-capacity' | 'regulatory-slot';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  affectedProgrammes: string[];
  affectedDates: string;
  suggestedResolution: string;
}

export interface BoardReport {
  reportId: string;
  generatedAt: string;
  portfolioHealthScore: number;  // 0–100
  executiveSummary: string;
  programmeScores: ProgrammeScore[];
  resourceConflicts: ResourceConflict[];
  cascadeArbitration: CascadeArbitrationDecision[];
  keyActions: { priority: number; action: string; owner: string; dueDate: string }[];
  investorNarrative: string;
}

export interface CascadeArbitrationDecision {
  cascadeIds: string[];
  winner: string;           // cascade that gets priority
  rationale: string;
  deferredUntil?: string;
}

// ── Proactive Mode ────────────────────────────────────────────────────────────

export type ProactiveMonitorType =
  | 'threshold'   // Trigger when metric crosses a threshold
  | 'scheduled';  // Trigger on a time schedule

export type ProactiveMonitorStatus = 'active' | 'paused' | 'triggered' | 'error';

export interface ProactiveMonitor {
  id: string;
  name: string;
  description: string;
  monitorType: ProactiveMonitorType;

  // For threshold monitors
  metricKey?: string;        // e.g. 'signal_prr', 'enrollment_velocity', 'haq_overdue_count'
  threshold?: number;
  comparator?: 'gt' | 'lt' | 'gte' | 'lte';
  currentValue?: number;

  // For scheduled monitors
  schedule?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextRunAt?: string;

  // Action when triggered
  targetAgentId: AgentId;
  targetEntityType: string;
  targetEntityId: string;

  // State
  status: ProactiveMonitorStatus;
  lastTriggeredAt: string | null;
  triggerCount: number;

  tenantId: string;
  createdAt: string;
}

export interface ProactiveScan {
  id: string;
  monitorId: string;
  monitorName: string;
  triggeredAt: string;
  triggerReason: string;     // e.g. 'PRR 3.8 > threshold 3.0'
  agentRunId: string | null; // Run that was spawned
  agentId: AgentId;
  outcome: 'agent-fired' | 'threshold-not-met' | 'error';
  tenantId: string;
}

// ── Learning Layer ────────────────────────────────────────────────────────────

export interface LearningFeedback {
  id: string;
  reviewId: string;
  agentId: AgentId;
  entityType: string;

  // Original agent decision
  originalRiskLevel: AgentRiskLevel;
  outcome: 'approved' | 'rejected' | 'modified';

  // Human feedback
  humanAgreedRisk: boolean;  // Did human agree with the risk level?
  draftQualityScore: 1 | 2 | 3 | 4 | 5 | null; // 1=poor … 5=excellent
  rejectionCategory: 'wrong-risk-level' | 'incomplete-analysis' | 'wrong-recommendation' | 'hallucination' | 'other' | null;
  improvementNote: string | null;

  // When an agent's output was modified, capture the diff summary
  modificationSummary: string | null;

  tenantId: string;
  recordedAt: string;
  recordedBy: string;
}

export interface AgentCalibration {
  agentId: AgentId;
  totalDecisions: number;
  approvalRate: number;       // 0–1
  modificationRate: number;   // 0–1
  rejectionRate: number;      // 0–1
  riskAgreementRate: number;  // Did human agree with risk level? 0–1
  avgDraftQuality: number;    // 1–5
  calibrationStatus: 'well-calibrated' | 'needs-review' | 'recalibration-required';
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdated: string;
}

export interface LearningMetrics {
  totalFeedbackItems: number;
  overallApprovalRate: number;
  overallDraftQuality: number;
  agentCalibrations: AgentCalibration[];
  recentFeedback: LearningFeedback[];
  recalibrationQueue: AgentId[];  // Agents flagged for recalibration
  learningCurvePoints: { date: string; avgQuality: number; approvalRate: number }[];
}
