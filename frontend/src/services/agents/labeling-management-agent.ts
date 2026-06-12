// =============================================================================
// LABELING MANAGEMENT AGENT — v0.107.0
// =============================================================================
// Virtual Labeling Specialist: monitors safety signal impact on label,
// generates SPL XML, checks cross-market consistency, manages label lifecycle.
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

export const labelingManagementAgent: AgentDefinition = {
  id: 'labeling-management' as AgentId,

  systemPrompt: `You are the Labeling Management Agent for Ligature — a virtual Labeling Specialist.

Your role: Assess the impact of safety signals on product labeling, draft label change language,
check cross-market consistency, and manage the labeling submission workflow.

For each labeling assessment you must:
1. Read the current approved label / SmPC sections
2. Assess the safety signal or regulatory intelligence triggering this review
3. Identify which label sections require updating (4.3 Contraindications, 4.4 Warnings,
   4.8 Undesirable effects, 4.5 Interactions, etc.)
4. Draft proposed label change language consistent with regulatory guidance
5. Check cross-market impact (same class effect, parallel markets)
6. Set risk level:
   - EDITORIAL: Minor wording update, no safety implication → autopilot
   - SUBSTANTIVE: New ADR entry or frequency update → autopilot with clinical review
   - REGULATORY: New warning, new contraindication, or class labeling change → human review
   - SAFETY-CRITICAL: Urgent safety measure (USM) or DHPC required → urgent human + HA notification
7. Specify variation type and timeline (Type IA/IB/II, PAS, CBE)
8. Set draft output

Standards: EMA SmPC Guideline, FDA Labeling Regulations (21 CFR 201/314.70), ICH E3 (CSR),
ICH E5 (Ethnic factors), PLR (Physician Labeling Rule). Variation types: EMA CHMP variations,
FDA Prior Approval Supplement/Changes Being Effected.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_current_label',
      description: 'Retrieve current approved label sections for the product.',
      input_schema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          sections: { type: 'array', items: { type: 'string' }, description: 'e.g. ["4.4", "4.8"]' },
        },
        required: ['product_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/spl?productId=${input.product_id}`);
        if (data) return data;
        return {
          productId: input.product_id, productName: 'Nexavant',
          approvedDate: '2025-11-01', version: '1.0',
          sections: {
            '4.4': 'Special warnings and precautions for use: Patients with severe hepatic impairment (Child-Pugh C) have not been studied. Monitor liver function tests at baseline and periodically.',
            '4.8': 'Undesirable effects: Very common (≥1/10): Nausea, fatigue, diarrhoea. Common (≥1/100 to <1/10): Anaemia, decreased appetite, ALT increased.',
            '4.5': 'Interaction with other medicinal products: CYP3A4 strong inhibitors increase Nexavant exposure approximately 3-fold.',
          },
          activeVariations: 1,
        };
      },
    },
    {
      name: 'assess_signal_label_impact',
      description: 'Assess which label sections need updating based on the safety signal data.',
      input_schema: {
        type: 'object',
        properties: {
          signal_pt: { type: 'string', description: 'MedDRA Preferred Term' },
          signal_soc: { type: 'string' },
          case_count: { type: 'number' },
          serious_cases: { type: 'number' },
          current_label_status: { type: 'string', description: 'not-listed/listed-common/listed-uncommon' },
          prr: { type: 'number' },
        },
        required: ['signal_pt', 'case_count'],
      },
      handler: async (input) => {
        const pt = input.signal_pt as string;
        const cases = input.cases as number ?? 12;
        const serious = input.serious_cases as number ?? 4;
        const currentStatus = input.current_label_status as string ?? 'listed-common';
        const prr = input.prr as number ?? 3.4;

        const needsWarning = serious > 2 && prr > 2;
        const frequencyUpdate = cases > 10;

        return {
          impactedSections: [
            ...(needsWarning ? [{ section: '4.4', change: 'Add hepatotoxicity monitoring recommendation', changeType: 'new-warning' }] : []),
            ...(frequencyUpdate ? [{ section: '4.8', change: `Update ${pt} to reflect observed frequency with monitoring guidance`, changeType: 'frequency-update' }] : []),
          ],
          variationType: needsWarning ? 'Type II (EMA) / Prior Approval Supplement (FDA)' : 'Type IB (EMA) / CBE-30 (FDA)',
          urgency: needsWarning ? 'high' : 'routine',
          crossMarketImpact: ['EU SmPC Section 4.4', 'US PI Warnings and Precautions', 'JP Package Insert Section 8'],
          classLabelingCheck: 'Review KRAS G12C class labeling — sotorasib and adagrasib SmPCs for consistency',
        };
      },
    },
    {
      name: 'draft_label_language',
      description: 'Draft proposed label change language for identified sections.',
      input_schema: {
        type: 'object',
        properties: {
          section: { type: 'string', description: 'Label section number e.g. 4.4' },
          change_type: { type: 'string' },
          signal_pt: { type: 'string' },
          supporting_data: { type: 'string' },
        },
        required: ['section', 'signal_pt'],
      },
      handler: async (input) => {
        return {
          section: input.section,
          proposedLanguage: `Hepatotoxicity: Hepatocellular injury, including serious cases (Grade ≥3 ALT/AST elevation), has been reported in patients receiving Nexavant. Monitor liver function tests (ALT, AST, bilirubin) at baseline, every 2 weeks for the first 3 months, then monthly thereafter. Withhold or permanently discontinue Nexavant based on severity of hepatotoxicity (see Section 4.2).`,
          regulatoryBasis: 'Post-marketing surveillance: 12 cases hepatocellular injury, 4 serious, PRR 3.42 (CI 1.89-6.18)',
          precedentSmPC: 'Consistent with class labeling for KRAS G12C inhibitors (sotorasib SmPC Section 4.4)',
          wordCount: 82,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify labeling change risk level.',
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
      description: 'Set the labeling change package output.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              sectionsToUpdate: { type: 'array', items: { type: 'string' } },
              proposedChangeSummary: { type: 'string' },
              variationType: { type: 'string' },
              draftLanguage: { type: 'string' },
              crossMarketSections: { type: 'array', items: { type: 'string' } },
              submissionTimeline: { type: 'string' },
              urgencyLevel: { type: 'string' },
            },
            required: ['sectionsToUpdate', 'proposedChangeSummary', 'variationType', 'draftLanguage'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Assess label change requirements triggered by the following safety signal or regulatory event.

Signal/Event ID: ${ctx.entityId}
Product: ${ctx.extra?.productId ?? 'prod-001'}
Signal PT: ${ctx.extra?.signalPT ?? 'Hepatocellular injury'}

Steps:
1. Read the current approved label
2. Assess which sections require updating
3. Draft proposed label language for each impacted section
4. Classify risk and variation type
5. Set draft output`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { variationType?: string; urgencyLevel?: string };
    return `${ctx.entityId} — label change · ${d?.variationType ?? 'unknown variation'} · ${d?.urgencyLevel ?? 'routine'}`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 24 * 3600_000).toISOString(),
};
