// =============================================================================
// MEDICAL AFFAIRS AGENT — v0.108.0
// =============================================================================
// Virtual MSL / Medical Affairs Lead: manages publication planning, tracks
// KOL interactions, drafts medical information responses, checks AdPromo compliance.
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

export const medicalAffairsAgent: AgentDefinition = {
  id: 'medical-affairs' as AgentId,

  systemPrompt: `You are the Medical Affairs Agent for Ligature — a virtual Medical Affairs Director and MSL.

Your role: Manage publication planning, track scientific exchange with KOLs, draft medical information
responses, and check promotional and medical materials for label compliance.

For each medical affairs task:
1. Identify the task type: publication-review, kol-engagement, med-info-response, adpromo-compliance
2. Read relevant context (approved label, study data, KOL history)
3. For publication review: check data accuracy vs source, authorship compliance (ICMJE), timeline
4. For KOL engagement: retrieve interaction history, prepare scientific exchange brief
5. For med-info response: draft response grounded strictly in approved label and published data
6. For AdPromo compliance: check claims against approved label — every claim must be label-supported
7. Set risk level:
   - EDITORIAL: Minor formatting, reference format → autopilot
   - SUBSTANTIVE: Missing reference, minor claim issue → autopilot with correction
   - REGULATORY: Off-label claim, misleading representation, missing risk information → human review
   - SAFETY-CRITICAL: Safety information missing from promotional material → urgent regulatory review
8. Set draft output

Standards: ICMJE authorship criteria, GPP3 (Good Publication Practice), PhRMA Code,
OIG Guidance on Pharmaceutical Manufacturer Relationships with Physicians.
FDA regulations: 21 CFR 202 (Prescription Drug Advertising), FDA Final Rule on
Prescription Drug Promotion. Off-label promotion is a regulatory violation.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_approved_label_claims',
      description: 'Retrieve approved indication, efficacy claims, and safety information from the current label.',
      input_schema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          sections: { type: 'array', items: { type: 'string' } },
        },
        required: ['product_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/spl?productId=${input.product_id}`);
        if (data) return data;
        return {
          productId: input.product_id, productName: 'Nexavant',
          approvedIndication: 'Treatment of adult patients with KRAS G12C-mutated locally advanced or metastatic NSCLC, as determined by an FDA-approved test, who have received at least one prior systemic therapy.',
          approvedEfficacyClaims: [
            'Median PFS 8.6 months vs 5.4 months (HR 0.58, 95% CI 0.43-0.79, p<0.001)',
            'ORR 43% (95% CI 36-51%) per blinded IRC',
            'Median DOR 9.1 months',
          ],
          labelledAEs: ['Nausea', 'Diarrhoea', 'Fatigue', 'Hepatocellular injury', 'Anaemia'],
          contraindications: ['Severe hepatic impairment (Child-Pugh C)'],
          boxedWarning: null,
          version: '1.0', approvedDate: '2025-11-01',
        };
      },
    },
    {
      name: 'check_adpromo_compliance',
      description: 'Check promotional or medical material claims against the approved label.',
      input_schema: {
        type: 'object',
        properties: {
          material_id: { type: 'string' },
          claims: { type: 'array', items: { type: 'string' }, description: 'Claims in the material to review' },
          material_type: { type: 'string', description: 'promotional/medical-education/congress-slide/leave-behind' },
        },
        required: ['claims'],
      },
      handler: async (input) => {
        const claims = (input.claims as string[]) ?? [];
        const issues = claims.map((claim, i) => {
          const isOffLabel = claim.toLowerCase().includes('first-line') ||
            claim.toLowerCase().includes('colorectal') ||
            claim.toLowerCase().includes('pancreatic');
          const missingSafety = claim.toLowerCase().includes('effective') &&
            !claim.toLowerCase().includes('risk');
          return {
            claimIndex: i + 1,
            claim: claim.slice(0, 100),
            status: isOffLabel ? 'OFF_LABEL_VIOLATION' : missingSafety ? 'FAIR_BALANCE_ISSUE' : 'COMPLIANT',
            issue: isOffLabel ? 'Claim references unapproved indication — constitutes off-label promotion' :
              missingSafety ? 'Efficacy claim without corresponding risk information — fair balance required' : null,
          };
        });
        const violations = issues.filter(i => i.status !== 'COMPLIANT');
        return {
          totalClaims: claims.length, violations: violations.length,
          issues,
          overallStatus: violations.some(v => v.status === 'OFF_LABEL_VIOLATION') ? 'FAIL_OFF_LABEL' :
            violations.length > 0 ? 'FAIL_FAIR_BALANCE' : 'PASS',
          recommendation: violations.length > 0 ? 'Material cannot be distributed — requires revision' : 'Material compliant for distribution',
        };
      },
    },
    {
      name: 'draft_medical_information_response',
      description: 'Draft a medical information response to an unsolicited inquiry, grounded in label and published data.',
      input_schema: {
        type: 'object',
        properties: {
          inquiry: { type: 'string', description: 'The medical question received' },
          requester_type: { type: 'string', description: 'HCP/Patient/Payer/Researcher' },
          product_id: { type: 'string' },
        },
        required: ['inquiry', 'requester_type'],
      },
      handler: async (input) => {
        return {
          responseType: 'Standard Medical Information Response',
          groundedIn: 'Approved prescribing information v1.0 and peer-reviewed published data',
          disclaimer: 'This response provides information for educational purposes only and does not constitute medical advice.',
          requiresMedicalReview: true,
          templateUsed: 'MED-INFO-STD-001',
          keyPoints: [
            'Response limited to approved indication and on-label data',
            'Off-label inquiries acknowledged but not specifically addressed',
            'Safety information included per fair balance requirement',
          ],
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify medical affairs compliance risk.',
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
      description: 'Set the medical affairs assessment output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              taskType: { type: 'string' },
              complianceStatus: { type: 'string', description: 'compliant/minor-issues/major-violations/off-label' },
              violations: { type: 'array', items: { type: 'string' } },
              requiredCorrections: { type: 'array', items: { type: 'string' } },
              draftContent: { type: 'string' },
              approvalRequired: { type: 'boolean' },
              distributionReady: { type: 'boolean' },
            },
            required: ['taskType', 'complianceStatus', 'requiredCorrections', 'approvalRequired'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Process the following medical affairs task.

Entity ID: ${ctx.entityId}
Task Type: ${ctx.extra?.taskType ?? 'adpromo-compliance'}
Product: ${ctx.extra?.productId ?? 'prod-001'}

Steps:
1. Read approved label claims and safety information
2. Execute the specific task (compliance check / med-info draft / publication review)
3. Classify risk level
4. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { taskType?: string; complianceStatus?: string };
    return `${ctx.entityId} — ${d?.taskType ?? 'medical affairs'} · ${d?.complianceStatus ?? 'review required'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 48 * 3600_000).toISOString(),
};
