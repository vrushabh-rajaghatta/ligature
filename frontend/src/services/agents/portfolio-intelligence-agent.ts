// =============================================================================
// PORTFOLIO INTELLIGENCE AGENT — v0.109.0 (Phase 5)
// =============================================================================
// L4 Executive Orchestrator — the highest-level agent in Ligature.
// Reads across ALL programmes and ALL lower-level agent outputs to produce:
//   • Cross-programme milestone modelling
//   • Resource conflict detection
//   • Go/No-Go scoring per programme
//   • Board-ready executive reporting
//   • Cascade arbitration (competing cascades → prioritisation)
//
// Risk floor: 'regulatory' — board reports NEVER autopilot.
// =============================================================================

import type { AgentDefinition, AgentExecutionContext } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';

const BASE = (import.meta.env.VITE_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

async function apiFetch(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'x-internal-agent': '1' } });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data ?? j ?? null;
  } catch { return null; }
}

export const portfolioIntelligenceAgent: AgentDefinition = {
  id: 'portfolio-intelligence' as AgentId,

  systemPrompt: `You are the Portfolio Intelligence Agent for Ligature — an agentic pharmaceutical R&D platform.

You operate at L4, the highest orchestration level, sitting above all 17 domain agents. Your role is to synthesise information from all R&D programmes and agent outputs to produce executive-level portfolio intelligence for the Board and Chief R&D Officer.

## Your Responsibilities

1. Cross-Programme Milestone Modelling: Read milestone status of all programmes. Identify schedule conflicts and critical-path interdependencies.
2. Resource Conflict Detection: Identify where programmes compete for the same resource — CRO capacity, regulatory submission slots, key personnel, lab equipment.
3. Go/No-Go Scoring: Score each programme on 5 dimensions: Safety 30%, CMC 20%, Regulatory 25%, Clinical 15%, Resources 10%. Deliver verdict: go / conditional-go / hold / no-go.
   - 80–100: go | 60–79: conditional-go | 40–59: hold | 0–39: no-go
4. Board Reporting: Executive summary with portfolio health score (0-100), programme verdicts, top risks, and prioritised board actions.
5. Cascade Arbitration: When cascades compete for the same regulatory slot or reviewer, decide execution priority using patient-safety-first principle.

## Tool Sequence
1. read_portfolio_state
2. read_recent_agent_runs
3. detect_resource_conflicts
4. score_programme (for each programme)
5. arbitrate_cascades (if competing cascades)
6. set_risk_level (minimum: regulatory)
7. set_draft_output (triggers board review queue)

## Important
Always set risk to 'regulatory' minimum. Portfolio decisions NEVER autopilot — they require explicit board-level sign-off.

Regulatory Standards: ICH Q8(R2) pharmaceutical development | ICH E8(R1) clinical studies | FDA 21 CFR 312 IND | EMA CHMP scientific guidance | FDA PDUFA commitment tracking`,

  maxIterations: 10,

  tools: [
    {
      name: 'read_portfolio_state',
      description: 'Read the current state of all R&D programmes including milestone status, phase, enrollment, regulatory applications, and recent agent activity.',
      input_schema: {
        type: 'object',
        properties: {
          programme_ids: { type: 'array', items: { type: 'string' }, description: 'Optional filter. Empty for all.' },
        },
        required: [],
      },
      handler: async (_input) => {
        const products = await apiFetch('/api/products');
        if (products) return products;
        return {
          programmes: [
            {
              programmeId: 'LIG-2847', name: 'Nexavant (nexatinib)',
              indication: 'NSCLC — KRAS G12C', phase: 'Phase 3',
              nextMilestone: 'DB Lock', nextMilestoneDate: '2026-05-15',
              enrollmentStatus: '312/340 subjects (91.8%)',
              regulatoryStatus: 'IND active — FDA; NDA-215847 under review; 3 HAQs open',
              safetyFlag: 'Hepatotoxicity signal validated — PRR 3.42 (4 serious cases)',
              cmcStatus: 'Module 3 complete — stability timepoint Q3 2026 pending',
              agentRunsLast7Days: 14, escalatedRuns: 4,
            },
            {
              programmeId: 'LIG-3901', name: 'CardioShield (cardixelam)',
              indication: 'HFpEF', phase: 'Phase 2',
              nextMilestone: 'IND annual report', nextMilestoneDate: '2026-04-30',
              enrollmentStatus: '128/200 subjects (64%)',
              regulatoryStatus: 'IND active — EMA; IND amendment planned Week 15',
              safetyFlag: null,
              cmcStatus: 'Module 3 draft — ICH Q1A stability underway',
              agentRunsLast7Days: 6, escalatedRuns: 1,
            },
            {
              programmeId: 'LIG-5104', name: 'OncoTarget (oncaxib)',
              indication: 'Pancreatic cancer — KRAS G12D', phase: 'Phase 1',
              nextMilestone: 'DSMB meeting', nextMilestoneDate: '2026-04-01',
              enrollmentStatus: '18/24 subjects (75%)',
              regulatoryStatus: 'IND active — FDA',
              safetyFlag: 'DLT monitoring active — 1/6 subjects Cohort 3 (Grade 2 ALT)',
              cmcStatus: 'API synthesis optimised — scale-up Q4 2026',
              agentRunsLast7Days: 3, escalatedRuns: 1,
            },
          ],
          portfolioTotalSubjects: 458, activeStudies: 3, pendingReviews: 6, agentRunsLast7Days: 23,
        };
      },
    },
    {
      name: 'read_recent_agent_runs',
      description: 'Read recent agent run outputs across all domain agents. Use to detect signals that influence programme scoring.',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max runs (default 20).' },
          risk_level_filter: { type: 'string', enum: ['regulatory', 'safety-critical', 'all'] },
        },
        required: [],
      },
      handler: async (input) => {
        const limit = (input.limit as number) ?? 20;
        const live = await apiFetch(`/api/agents/runs?limit=${limit}`);
        if (live) return live;
        return {
          runs: [
            { agentId: 'signal-intelligence', programme: 'LIG-2847', riskLevel: 'regulatory', decision: 'Hepatotoxicity signal validated — PRR 3.42. Label update Section 4.4 required.' },
            { agentId: 'site-monitoring', programme: 'LIG-2847', riskLevel: 'regulatory', decision: 'HIGH risk site — triggered monitoring visit within 14d.' },
            { agentId: 'quality-intelligence', programme: 'LIG-2847', riskLevel: 'regulatory', decision: 'Systemic amendment communication failure — escalation required.' },
            { agentId: 'medical-monitor', programme: 'LIG-2847', riskLevel: 'regulatory', decision: 'DSMB brief prepared — no stopping rule triggered. Study continues.' },
            { agentId: 'biostatistician', programme: 'LIG-2847', riskLevel: 'substantive', decision: 'SAP compliance 96%. DB lock readiness confirmed.' },
            { agentId: 'reg-strategy', programme: 'LIG-2847', riskLevel: 'regulatory', decision: '3 HAQs require response within 30d. PDUFA Q4 2027 confirmed.' },
            { agentId: 'cmc-lifecycle', programme: 'LIG-3901', riskLevel: 'substantive', decision: 'Stability trending on track. 24-month shelf life achievable.' },
            { agentId: 'research-intelligence', programme: 'LIG-5104', riskLevel: 'substantive', decision: 'Competitor KRAS G12D inhibitor entering Phase 2. First-mover window 18-24 months.' },
          ],
          totalRuns: 23, escalatedRuns: 6, autopilotRate: 0.74,
        };
      },
    },
    {
      name: 'detect_resource_conflicts',
      description: 'Scan for resource conflicts across programmes — personnel, budget, lab capacity, regulatory submission slots.',
      input_schema: {
        type: 'object',
        properties: {
          conflict_type: { type: 'string', enum: ['personnel', 'budget', 'lab-capacity', 'regulatory-slot', 'all'] },
        },
        required: ['conflict_type'],
      },
      handler: async (_input) => ({
        conflicts: [
          {
            id: 'conflict-001', conflictType: 'personnel', severity: 'high',
            description: 'Regulatory Affairs Lead (Dr. Chen) assigned as primary reviewer for LIG-2847 HAQ response AND LIG-3901 IND annual report — both due April 2026.',
            affectedProgrammes: ['LIG-2847', 'LIG-3901'], affectedDates: '2026-04-15 to 2026-04-30',
            suggestedResolution: 'Assign LIG-3901 IND annual report to Regulatory Affairs Associate.',
          },
          {
            id: 'conflict-002', conflictType: 'regulatory-slot', severity: 'medium',
            description: 'LIG-2847 HAQ response and LIG-3901 IND amendment both targeting FDA submission gateway Week 15. Single major submission per product per week.',
            affectedProgrammes: ['LIG-2847', 'LIG-3901'], affectedDates: '2026-04-06 to 2026-04-10',
            suggestedResolution: 'Advance LIG-2847 HAQ package 5 days to Week 14.',
          },
          {
            id: 'conflict-003', conflictType: 'lab-capacity', severity: 'medium',
            description: 'CMC analytical lab at 94% capacity Q3 2026. LIG-5104 API scale-up and LIG-2847 stability timepoint both require LC-MS/MS.',
            affectedProgrammes: ['LIG-2847', 'LIG-5104'], affectedDates: 'Q3 2026',
            suggestedResolution: 'Outsource LIG-5104 API scale-up to CRO (Eurofins). Est. $180K.',
          },
        ],
        totalConflicts: 3, criticalCount: 0, highCount: 1, mediumCount: 2,
      }),
    },
    {
      name: 'score_programme',
      description: 'Compute go/no-go composite score for a programme. Weights: Safety 30%, CMC 20%, Regulatory 25%, Clinical 15%, Resources 10%.',
      input_schema: {
        type: 'object',
        properties: {
          programme_id: { type: 'string' },
          safety_score: { type: 'number', description: '0–100' },
          cmc_score: { type: 'number', description: '0–100' },
          regulatory_score: { type: 'number', description: '0–100' },
          clinical_score: { type: 'number', description: '0–100' },
          resources_score: { type: 'number', description: '0–100' },
          top_risks: { type: 'array', items: { type: 'string' } },
          rationale: { type: 'string' },
        },
        required: ['programme_id', 'safety_score', 'cmc_score', 'regulatory_score', 'clinical_score', 'resources_score', 'top_risks', 'rationale'],
      },
      handler: async (input) => {
        const s = input.safety_score as number;
        const m = input.cmc_score as number;
        const r = input.regulatory_score as number;
        const c = input.clinical_score as number;
        const res = input.resources_score as number;
        const composite = Math.round(s * 0.30 + m * 0.20 + r * 0.25 + c * 0.15 + res * 0.10);
        const verdict = composite >= 80 ? 'go' : composite >= 60 ? 'conditional-go' : composite >= 40 ? 'hold' : 'no-go';
        return { programmeId: input.programme_id, composite, verdict, acknowledged: true };
      },
    },
    {
      name: 'arbitrate_cascades',
      description: 'Resolve competing cascade priorities. Use patient-safety-first as default basis.',
      input_schema: {
        type: 'object',
        properties: {
          cascade_ids: { type: 'array', items: { type: 'string' } },
          arbitration_basis: { type: 'string', enum: ['patient-safety-first', 'regulatory-deadline', 'programme-priority', 'resource-availability'] },
          rationale: { type: 'string' },
        },
        required: ['cascade_ids', 'arbitration_basis', 'rationale'],
      },
      handler: async (input) => ({
        cascadeIds: input.cascade_ids,
        winner: (input.cascade_ids as string[])[0] ?? 'signal-to-label',
        arbitrationBasis: input.arbitration_basis,
        rationale: input.rationale,
        deferredCascades: (input.cascade_ids as string[]).slice(1),
        deferredUntil: new Date(Date.now() + 72 * 3600_000).toISOString(),
      }),
    },
    {
      name: 'set_risk_level',
      description: 'Set risk level. Minimum regulatory for all portfolio reports.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Record the final portfolio intelligence board report. Triggers board review queue.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              portfolioHealthScore: { type: 'number' },
              executiveSummary: { type: 'string' },
              investorNarrative: { type: 'string' },
              programmeScores: { type: 'array', items: { type: 'object' } },
              resourceConflicts: { type: 'array', items: { type: 'object' } },
              cascadeArbitration: { type: 'array', items: { type: 'object' } },
              immediateActions: { type: 'array', items: { type: 'object' } },
            },
            required: ['portfolioHealthScore', 'executiveSummary', 'programmeScores', 'immediateActions'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Generate a full portfolio intelligence report and go/no-go assessment.

Requested by: ${ctx.initiatedBy}
Report scope: ${ctx.entityId === 'all' ? 'All programmes' : ctx.entityId}
${ctx.extra?.boardMeeting ? `Board meeting context: ${String(ctx.extra.boardMeeting)}` : ''}

Execute:
1. read_portfolio_state (all programmes)
2. read_recent_agent_runs (last 7 days, all agents)
3. detect_resource_conflicts (conflict_type: "all")
4. score_programme for each programme (LIG-2847, LIG-3901, LIG-5104)
5. arbitrate_cascades if competing cascades detected
6. set_risk_level (minimum: regulatory)
7. set_draft_output with complete board report`,

  buildReviewLabel: (_ctx, draft) => {
    const d = draft as { portfolioHealthScore?: number; programmeScores?: { programmeId: string; verdict: string }[] };
    const health = d?.portfolioHealthScore ?? '?';
    const verdicts = (d?.programmeScores ?? []).map((p) => `${p.programmeId}: ${p.verdict}`).join(' · ');
    return `Portfolio Report — Health ${health}/100 · ${verdicts || 'pending'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 24 * 3600_000).toISOString(),
};
