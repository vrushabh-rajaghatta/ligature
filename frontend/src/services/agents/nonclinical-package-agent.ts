// =============================================================================
// NONCLINICAL PACKAGE AGENT — v0.107.0
// =============================================================================
// Virtual GLP Study Director / Toxicologist: assesses ICH M3 package
// completeness, monitors ALCOA+ data integrity, assembles Module 4 summary.
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

export const nonclinicalPackageAgent: AgentDefinition = {
  id: 'nonclinical-package' as AgentId,

  systemPrompt: `You are the Nonclinical Package Agent for Ligature — a virtual GLP Study Director and Toxicologist.

Your role: Assess ICH M3(R2) package completeness for IND/NDA submissions, monitor ALCOA+ data integrity
across GLP studies, and flag gaps before regulatory submission.

For each assessment you must:
1. Read the GLP study record and EDC integration status
2. Assess ICH M3(R2) study coverage: safety pharmacology, single-dose tox, repeat-dose tox,
   genotoxicity, reproductive tox, carcinogenicity (if applicable), local tolerance
3. Check ALCOA+ data integrity flags from the EDC sync
4. Verify 21 CFR Part 58 / OECD GLP compliance elements
5. Set risk level:
   - EDITORIAL: Package complete, minor documentation gaps → autopilot
   - SUBSTANTIVE: Non-critical study gaps, timeline risk → autopilot with override
   - REGULATORY: Critical study missing, ALCOA+ failures, or GLP compliance gap → human review
   - SAFETY-CRITICAL: Unexpected severe toxicity findings requiring immediate sponsor notification → urgent
6. Generate gap remediation plan with ICH M3(R2) citations
7. Set draft output

Standards: ICH M3(R2) Nonclinical Safety Studies, ICH S7A/S7B (Safety Pharmacology),
ICH S2(R1) (Genotoxicity), ICH S5(R3) (Reproductive Toxicology), OECD GLP Principles,
21 CFR Part 58 (GLP for Non-Clinical Laboratory Studies).`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_glp_study',
      description: 'Retrieve GLP study record including status, study type, findings, and EDC connection.',
      input_schema: {
        type: 'object',
        properties: { study_id: { type: 'string' } },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/glp/edc-link?studyId=${input.study_id}`);
        if (data) return data;
        return {
          id: input.study_id, studyNumber: 'GLP-2025-047',
          title: '13-Week Repeat-Dose Oral Toxicity Study in Rats',
          type: 'repeat-dose-toxicology', species: 'Rat', duration: '13 weeks',
          status: 'final-report-pending', glpCompliant: true,
          testFacility: 'Charles River Laboratories', studyDirector: 'Dr. K. Hoffman',
          noael: '50 mg/kg/day', mtd: '200 mg/kg/day',
          keyFindings: 'Dose-related hepatocellular hypertrophy at 200 mg/kg — considered adaptive, not adverse at NOAEL dose.',
          alcoa: { completeness: 88, integrityFlags: 3, auditTrailGaps: 1 },
          ectdSlot: 'Module 4.2.3.2',
        };
      },
    },
    {
      name: 'check_ich_m3_coverage',
      description: 'Assess ICH M3(R2) study package completeness against required study battery for the indication and phase.',
      input_schema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          indication: { type: 'string' },
          development_phase: { type: 'string', description: 'IND/Phase1/Phase2/Phase3/NDA' },
        },
        required: ['product_id'],
      },
      handler: async (input) => {
        const phase = (input.development_phase as string ?? 'NDA').toLowerCase();
        return {
          required: [
            { study: 'Safety pharmacology (hERG, CV, respiratory)', status: 'complete', slot: 'Module 4.2.1' },
            { study: 'Single-dose acute toxicology', status: 'complete', slot: 'Module 4.2.3.1' },
            { study: '13-week repeat-dose tox (rat)', status: 'final-report-pending', slot: 'Module 4.2.3.2' },
            { study: '13-week repeat-dose tox (dog)', status: 'complete', slot: 'Module 4.2.3.2' },
            { study: 'In vitro genotoxicity (Ames + MN)', status: 'complete', slot: 'Module 4.2.3.5' },
            { study: 'In vivo micronucleus', status: 'complete', slot: 'Module 4.2.3.5' },
            { study: 'Embryo-fetal development (rat)', status: 'complete', slot: 'Module 4.2.3.4' },
            { study: 'Embryo-fetal development (rabbit)', status: 'in-progress', slot: 'Module 4.2.3.4', note: 'Final report due 2026-05-15' },
            { study: 'Carcinogenicity (rat 2yr)', status: phase === 'nda' ? 'missing' : 'not-required', slot: 'Module 4.2.3.3', note: phase === 'nda' ? 'Required for NDA — not started' : '' },
          ],
          completenessScore: phase === 'nda' ? 78 : 88,
          criticalGaps: phase === 'nda' ? ['Carcinogenicity study not started — 24-month timeline'] : [],
          phase,
        };
      },
    },
    {
      name: 'check_alcoa_integrity',
      description: 'Review ALCOA+ data integrity audit findings from GLP EDC sync.',
      input_schema: {
        type: 'object',
        properties: { study_id: { type: 'string' } },
        required: ['study_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/glp/edc-sync`);
        if (data) return data;
        return {
          integrityFlags: [
            { type: 'audit-trail-gap', endpoint: 'Clinical Pathology', description: '3 data entries with no audit trail — system downtime 2025-12-14', severity: 'major', remediation: 'Paper backup records exist — need to be entered with explanatory note' },
            { type: 'out-of-range', endpoint: 'Body Weight', description: '1 outlier value (Week 8, Animal 2M-004) flagged as potential transcription error', severity: 'minor' },
            { type: 'timestamp-anomaly', endpoint: 'Dosing Records', description: '2 records show dosing time after necropsy time — data entry error', severity: 'major' },
          ],
          alcoaScore: 88, completeness: 96, contemporaneous: 91, accurate: 94,
          originalData: true, attributable: 98,
          overallCompliant: false, remediationRequired: true,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify nonclinical package risk level.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['editorial', 'substantive', 'regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Set the nonclinical package assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              packageCompletenessScore: { type: 'number' },
              criticalGaps: { type: 'array', items: { type: 'string' } },
              alcoaIssues: { type: 'array', items: { type: 'string' } },
              remediationPlan: { type: 'array', items: { type: 'string' } },
              submissionReadiness: { type: 'string', description: 'ready/at-risk/not-ready' },
              estimatedReadyDate: { type: 'string' },
            },
            required: ['packageCompletenessScore', 'criticalGaps', 'remediationPlan', 'submissionReadiness'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Assess the nonclinical package for IND/NDA submission readiness.

Study ID: ${ctx.entityId}
Product: ${ctx.extra?.productId ?? 'prod-001'}
Development Phase: ${ctx.extra?.developmentPhase ?? 'NDA'}

Steps:
1. Read the GLP study record
2. Assess ICH M3(R2) study coverage
3. Check ALCOA+ integrity findings
4. Classify risk and set output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { packageCompletenessScore?: number; submissionReadiness?: string };
    return `${ctx.entityId} — ${d?.packageCompletenessScore ?? '?'}% complete · ${d?.submissionReadiness ?? 'unknown'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
