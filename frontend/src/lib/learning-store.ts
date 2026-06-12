// =============================================================================
// LEARNING STORE — v0.109.0 (Phase 5)
// =============================================================================
// Agent learning layer — tracks human accept/reject/modify decisions from the
// review queue and feeds them back to improve future agent runs.
//
// Capabilities:
//   - Record feedback from every review decision
//   - Compute per-agent calibration metrics (approval rate, draft quality, etc.)
//   - Flag agents that need recalibration
//   - Provide learning curve data for the dashboard
// =============================================================================

import type { LearningFeedback, AgentCalibration, LearningMetrics, AgentId, AgentRiskLevel } from '@/types/agents';
import { AGENT_DISPLAY } from '@/types/agents';

// ── In-memory store ───────────────────────────────────────────────────────────

const feedbackItems = new Map<string, LearningFeedback>();

// ── ID generator ──────────────────────────────────────────────────────────────

export function generateFeedbackId(): string {
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Feedback CRUD ─────────────────────────────────────────────────────────────

export function recordFeedback(fb: LearningFeedback): LearningFeedback {
  feedbackItems.set(fb.id, fb);
  return fb;
}

export function listFeedback(opts: {
  tenantId?: string;
  agentId?: AgentId;
  limit?: number;
} = {}): LearningFeedback[] {
  let items = Array.from(feedbackItems.values());
  if (opts.tenantId) items = items.filter(f => f.tenantId === opts.tenantId);
  if (opts.agentId) items = items.filter(f => f.agentId === opts.agentId);
  items.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  return opts.limit ? items.slice(0, opts.limit) : items;
}

// ── Calibration computation ───────────────────────────────────────────────────

export function computeCalibration(agentId: AgentId, tenantId?: string): AgentCalibration {
  const items = listFeedback({ agentId, tenantId });

  if (items.length === 0) {
    return {
      agentId,
      totalDecisions: 0,
      approvalRate: 0,
      modificationRate: 0,
      rejectionRate: 0,
      riskAgreementRate: 0,
      avgDraftQuality: 0,
      calibrationStatus: 'needs-review',
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    };
  }

  const total = items.length;
  const approved = items.filter(f => f.outcome === 'approved').length;
  const modified = items.filter(f => f.outcome === 'modified').length;
  const rejected = items.filter(f => f.outcome === 'rejected').length;
  const riskAgreed = items.filter(f => f.humanAgreedRisk).length;

  const qualityItems = items.filter(f => f.draftQualityScore !== null);
  const avgQuality = qualityItems.length > 0
    ? qualityItems.reduce((sum, f) => sum + (f.draftQualityScore ?? 0), 0) / qualityItems.length
    : 0;

  const approvalRate = approved / total;
  const modificationRate = modified / total;
  const rejectionRate = rejected / total;
  const riskAgreementRate = riskAgreed / total;

  // Calibration status
  let calibrationStatus: AgentCalibration['calibrationStatus'] = 'well-calibrated';
  if (rejectionRate > 0.3 || riskAgreementRate < 0.6 || avgQuality < 2.5) {
    calibrationStatus = 'recalibration-required';
  } else if (rejectionRate > 0.15 || riskAgreementRate < 0.75 || avgQuality < 3.5) {
    calibrationStatus = 'needs-review';
  }

  // Trend: compare last 5 vs first 5
  let trend: AgentCalibration['trend'] = 'stable';
  if (items.length >= 10) {
    const recent = items.slice(0, 5);
    const older = items.slice(-5);
    const recentApproval = recent.filter(f => f.outcome === 'approved').length / 5;
    const olderApproval = older.filter(f => f.outcome === 'approved').length / 5;
    if (recentApproval - olderApproval > 0.1) trend = 'improving';
    else if (olderApproval - recentApproval > 0.1) trend = 'degrading';
  }

  return {
    agentId,
    totalDecisions: total,
    approvalRate,
    modificationRate,
    rejectionRate,
    riskAgreementRate,
    avgDraftQuality: Math.round(avgQuality * 10) / 10,
    calibrationStatus,
    trend,
    lastUpdated: new Date().toISOString(),
  };
}

// ── Full learning metrics ─────────────────────────────────────────────────────

export function computeLearningMetrics(tenantId?: string): LearningMetrics {
  const allFeedback = listFeedback({ tenantId });
  const allAgentIds = Object.keys(AGENT_DISPLAY) as AgentId[];

  const agentCalibrations = allAgentIds.map(id => computeCalibration(id, tenantId));

  const total = allFeedback.length;
  const overallApproval = total > 0
    ? allFeedback.filter(f => f.outcome === 'approved').length / total
    : 0;

  const qualityItems = allFeedback.filter(f => f.draftQualityScore !== null);
  const overallQuality = qualityItems.length > 0
    ? qualityItems.reduce((sum, f) => sum + (f.draftQualityScore ?? 0), 0) / qualityItems.length
    : 0;

  const recalibrationQueue = agentCalibrations
    .filter(c => c.calibrationStatus === 'recalibration-required')
    .map(c => c.agentId);

  // Learning curve: last 30 days, grouped by day
  const now = new Date();
  const curvePoints = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - (29 - i) * 24 * 3600_000);
    const dayStr = date.toISOString().slice(0, 10);
    const dayItems = allFeedback.filter(f => f.recordedAt.startsWith(dayStr));
    const dayApproval = dayItems.length > 0
      ? dayItems.filter(f => f.outcome === 'approved').length / dayItems.length
      : null;
    const dayQualityItems = dayItems.filter(f => f.draftQualityScore !== null);
    const dayQuality = dayQualityItems.length > 0
      ? dayQualityItems.reduce((s, f) => s + (f.draftQualityScore ?? 0), 0) / dayQualityItems.length
      : null;
    return {
      date: dayStr,
      avgQuality: dayQuality ?? 0,
      approvalRate: dayApproval ?? 0,
    };
  });

  return {
    totalFeedbackItems: total,
    overallApprovalRate: Math.round(overallApproval * 1000) / 1000,
    overallDraftQuality: Math.round(overallQuality * 10) / 10,
    agentCalibrations,
    recentFeedback: allFeedback.slice(0, 10),
    recalibrationQueue,
    learningCurvePoints: curvePoints,
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────

let seeded = false;
const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

export function seedLearningData(): void {
  if (seeded || feedbackItems.size > 0) return;
  seeded = true;

  const now = new Date();
  const daysAgo = (d: number, h = 0) =>
    new Date(now.getTime() - (d * 24 + h) * 3600_000).toISOString();

  const seedFeedback: LearningFeedback[] = [
    // document-resolution — well calibrated
    {
      id: 'fb-001', reviewId: 'rev-hist-001', agentId: 'document-resolution',
      entityType: 'comment', originalRiskLevel: 'editorial', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 5, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(25), recordedBy: 'user-admin',
    },
    {
      id: 'fb-002', reviewId: 'rev-hist-002', agentId: 'document-resolution',
      entityType: 'comment', originalRiskLevel: 'substantive', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 4, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(18), recordedBy: 'user-admin',
    },
    {
      id: 'fb-003', reviewId: 'rev-hist-003', agentId: 'document-resolution',
      entityType: 'comment', originalRiskLevel: 'substantive', outcome: 'modified',
      humanAgreedRisk: true, draftQualityScore: 3,
      rejectionCategory: null,
      improvementNote: 'Resolution text was correct but needed more specific ICH reference citation.',
      modificationSummary: 'Added ICH Q3A impurity threshold reference to resolution text.',
      tenantId: DEMO_TENANT, recordedAt: daysAgo(10), recordedBy: 'user-admin',
    },
    // haq-response — good but one rejection
    {
      id: 'fb-004', reviewId: 'rev-hist-004', agentId: 'haq-response',
      entityType: 'haq', originalRiskLevel: 'regulatory', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 5, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(20), recordedBy: 'user-ra',
    },
    {
      id: 'fb-005', reviewId: 'rev-hist-005', agentId: 'haq-response',
      entityType: 'haq', originalRiskLevel: 'regulatory', outcome: 'rejected',
      humanAgreedRisk: false, draftQualityScore: 2,
      rejectionCategory: 'wrong-risk-level',
      improvementNote: 'Agent classified as regulatory but this was an administrative clarification — should have been editorial.',
      modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(8), recordedBy: 'user-ra',
    },
    {
      id: 'fb-006', reviewId: 'rev-hist-006', agentId: 'haq-response',
      entityType: 'haq', originalRiskLevel: 'regulatory', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 4, rejectionCategory: null,
      improvementNote: 'Good analysis. Consider including precedent HAQ references proactively.',
      modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(3), recordedBy: 'user-ra',
    },
    // signal-intelligence — safety-critical, conservative, high quality
    {
      id: 'fb-007', reviewId: 'rev-hist-007', agentId: 'signal-intelligence',
      entityType: 'signal', originalRiskLevel: 'safety-critical', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 5, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(15), recordedBy: 'user-safety',
    },
    {
      id: 'fb-008', reviewId: 'rev-hist-008', agentId: 'signal-intelligence',
      entityType: 'signal', originalRiskLevel: 'safety-critical', outcome: 'modified',
      humanAgreedRisk: true, draftQualityScore: 4, rejectionCategory: null,
      improvementNote: 'Benefit-risk assessment was complete but investor-facing summary was too technical.',
      modificationSummary: 'Simplified benefit-risk language for label update recommendation.',
      tenantId: DEMO_TENANT, recordedAt: daysAgo(5), recordedBy: 'user-safety',
    },
    // icsr-processing — needs review (risk disagreements)
    {
      id: 'fb-009', reviewId: 'rev-hist-009', agentId: 'icsr-processing',
      entityType: 'icsr-case', originalRiskLevel: 'regulatory', outcome: 'rejected',
      humanAgreedRisk: false, draftQualityScore: 2,
      rejectionCategory: 'incomplete-analysis',
      improvementNote: 'Agent missed secondary suspect drug interaction. MedDRA coding was correct but narrative omitted co-suspect.',
      modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(12), recordedBy: 'user-safety',
    },
    {
      id: 'fb-010', reviewId: 'rev-hist-010', agentId: 'icsr-processing',
      entityType: 'icsr-case', originalRiskLevel: 'regulatory', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 4, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(6), recordedBy: 'user-safety',
    },
    {
      id: 'fb-011', reviewId: 'rev-hist-011', agentId: 'icsr-processing',
      entityType: 'icsr-case', originalRiskLevel: 'regulatory', outcome: 'modified',
      humanAgreedRisk: true, draftQualityScore: 3,
      rejectionCategory: null,
      improvementNote: 'Narrative structure correct but 15-day clock was mis-calculated by 2 days.',
      modificationSummary: 'Corrected regulatory deadline from Day 13 to Day 15 per ICH E2B(R3).',
      tenantId: DEMO_TENANT, recordedAt: daysAgo(1), recordedBy: 'user-safety',
    },
    // quality-intelligence — improving
    {
      id: 'fb-012', reviewId: 'rev-hist-012', agentId: 'quality-intelligence',
      entityType: 'capa', originalRiskLevel: 'regulatory', outcome: 'modified',
      humanAgreedRisk: true, draftQualityScore: 3, rejectionCategory: null,
      improvementNote: 'Pattern detection was correct but CAPA quality score was too generous.',
      modificationSummary: 'Downgraded CAPA quality score from "good" to "adequate" based on missing effectiveness check.',
      tenantId: DEMO_TENANT, recordedAt: daysAgo(22), recordedBy: 'user-qa',
    },
    {
      id: 'fb-013', reviewId: 'rev-hist-013', agentId: 'quality-intelligence',
      entityType: 'capa', originalRiskLevel: 'regulatory', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 4, rejectionCategory: null,
      improvementNote: null, modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(7), recordedBy: 'user-qa',
    },
    // site-monitoring — very high quality
    {
      id: 'fb-014', reviewId: 'rev-hist-014', agentId: 'site-monitoring',
      entityType: 'site', originalRiskLevel: 'regulatory', outcome: 'approved',
      humanAgreedRisk: true, draftQualityScore: 5, rejectionCategory: null,
      improvementNote: 'Excellent risk stratification. Visit recommendation was exactly right.',
      modificationSummary: null,
      tenantId: DEMO_TENANT, recordedAt: daysAgo(9), recordedBy: 'user-clinical',
    },
  ];

  for (const fb of seedFeedback) feedbackItems.set(fb.id, fb);
}
