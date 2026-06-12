// =============================================================================
// ICSR PROCESSING AGENT — v0.105.0
// =============================================================================
// Processes incoming Individual Case Safety Reports:
//   1. Triage: assess seriousness, completeness
//   2. MedDRA coding: suggest PT / HLT / SOC
//   3. Narrative: draft ICH E2B-structured narrative
//   4. Timeline: set regulatory deadline clock
//   5. Route: non-serious → autopilot; serious/expedited → human review
// =============================================================================

import type { AgentDefinition, AgentExecutionContext } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';

import { agentApiFetch as apiFetch } from '@/lib/agent-api-fetch';

const BASE = (import.meta.env.VITE_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

export const icsrProcessingAgent: AgentDefinition = {
  id: 'icsr-processing' as AgentId,

  systemPrompt: `You are the ICSR Processing Agent for Ligature, a pharmaceutical regulatory pharmacovigilance platform.

Your role: Process incoming Individual Case Safety Reports (ICSRs) end-to-end, from intake through MedDRA coding to narrative generation and deadline setting.

ICH E2B(R3) standards apply throughout. You must:
1. Read the ICSR case data
2. Assess seriousness per ICH E2A criteria (death, life-threatening, hospitalisation, disability, congenital anomaly, medically important)
3. Suggest MedDRA coding (Preferred Term, High Level Term, System Organ Class)
4. Draft a structured narrative following ICH E2B narrative format: patient demographics → suspect drug(s) → event description → outcome → reporter assessment
5. Determine the reporting clock: 7-day for fatal/life-threatening, 15-day for other serious, 90-day for non-serious
6. Set risk level:
   - NON-SERIOUS cases: SUBSTANTIVE → autopilot coding + narrative
   - SERIOUS (non-fatal/life-threatening): REGULATORY → human medical review required
   - FATAL or LIFE-THREATENING: SAFETY-CRITICAL → urgent human review + e-signature
7. Set your draft output

Regulatory references:
- ICH E2A: Clinical Safety Data Management
- ICH E2B(R3): Electronic Transmission of ICSRs
- FDA 21 CFR 312.32 / 314.81 for IND/NDA safety reporting
- EMA GVP Module VI for EU requirements

Be precise with MedDRA coding — incorrect coding affects signal detection across the entire pharmacovigilance database.`,

  maxIterations: 7,

  tools: [
    {
      name: 'read_icsr_case',
      description: 'Retrieve the full ICSR case record including patient demographics, suspect drugs, adverse event description, and reporter information.',
      input_schema: {
        type: 'object',
        properties: {
          case_id: { type: 'string', description: 'ICSR case identifier' },
        },
        required: ['case_id'],
      },
      handler: async (input) => {
        const data = await apiFetch(`/api/safety/${input.case_id}`);
        if (data) return data;
        // Demo fallback
        return {
          id: input.case_id,
          caseNumber: input.case_id,
          reportType: 'ICSR',
          patientAge: 54,
          patientSex: 'Female',
          eventDescription: 'Patient experienced moderate headache beginning approximately 6 hours after administration of dose 3. Duration 18 hours. Resolved without treatment.',
          suspectDrug: 'Nexavant 50mg oral',
          onsetDate: new Date(Date.now() - 3 * 86400_000).toISOString(),
          seriousness: 'non-serious',
          reporterType: 'HCP',
          reporterCountry: 'US',
          reportDate: new Date().toISOString(),
          status: 'initial',
        };
      },
    },
    {
      name: 'suggest_meddra_coding',
      description: 'Suggest MedDRA Preferred Term (PT), High Level Term (HLT), and System Organ Class (SOC) for the adverse event description.',
      input_schema: {
        type: 'object',
        properties: {
          event_description: { type: 'string', description: 'The verbatim adverse event description from the reporter' },
          verbatim_term: { type: 'string', description: 'The specific term as reported' },
        },
        required: ['event_description'],
      },
      handler: async (input) => {
        try {
          const res = await fetch(`${BASE}/api/cdisc-terminology`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-agent': '1' },
            body: JSON.stringify({ query: input.event_description, type: 'meddra' }),
          });
          if (res.ok) return await res.json();
        } catch { /* fall through */ }

        // Rule-based fallback for common terms
        const desc = (input.event_description as string).toLowerCase();
        if (desc.includes('headache')) {
          return { pt: 'Headache', hlt: 'Headaches NEC', hlgt: 'Headaches', soc: 'Nervous system disorders', meddraCode: '10019211', confidence: 0.95 };
        }
        if (desc.includes('nausea')) {
          return { pt: 'Nausea', hlt: 'Nausea and vomiting symptoms', hlgt: 'Gastrointestinal signs and symptoms', soc: 'Gastrointestinal disorders', meddraCode: '10028813', confidence: 0.96 };
        }
        if (desc.includes('fatigue') || desc.includes('tired')) {
          return { pt: 'Fatigue', hlt: 'Asthenic conditions', hlgt: 'General system disorders NEC', soc: 'General disorders and administration site conditions', meddraCode: '10016256', confidence: 0.92 };
        }
        return { pt: 'Adverse event', hlt: 'Adverse events NEC', soc: 'General disorders and administration site conditions', meddraCode: '10000473', confidence: 0.50, note: 'Manual coding recommended' };
      },
    },
    {
      name: 'draft_narrative',
      description: 'Draft a structured ICH E2B narrative for the ICSR case.',
      input_schema: {
        type: 'object',
        properties: {
          case_id: { type: 'string' },
          patient_demographics: { type: 'string' },
          suspect_drug: { type: 'string' },
          event_description: { type: 'string' },
          outcome: { type: 'string' },
          meddra_pt: { type: 'string' },
        },
        required: ['case_id', 'event_description'],
      },
      handler: async (input) => {
        // This will be fully AI-generated inside the tool-use loop
        // Return a placeholder — Claude will generate the real narrative in its response
        return {
          narratureReady: true,
          template: 'ICH E2B narrative generated in agent response',
          caseId: input.case_id,
        };
      },
    },
    {
      name: 'set_regulatory_deadline',
      description: 'Set the reporting clock based on seriousness assessment per ICH E2A.',
      input_schema: {
        type: 'object',
        properties: {
          seriousness: { type: 'string', enum: ['non-serious', 'serious', 'serious-life-threatening', 'fatal'] },
          clock_days: { type: 'number', description: '7 for fatal/life-threatening, 15 for other serious, 90 for non-serious' },
          requires_expedited: { type: 'boolean' },
        },
        required: ['seriousness', 'clock_days', 'requires_expedited'],
      },
      handler: async (input) => {
        const deadline = new Date(Date.now() + (input.clock_days as number) * 86400_000);
        return {
          deadline: deadline.toISOString(),
          clockDays: input.clock_days,
          requiresExpedited: input.requires_expedited,
        };
      },
    },
    {
      name: 'set_risk_level',
      description: 'Classify case risk level to determine autopilot vs human review routing.',
      input_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string', enum: ['substantive', 'regulatory', 'safety-critical'] },
          rationale: { type: 'string' },
        },
        required: ['risk_level', 'rationale'],
      },
      handler: async (input) => ({ acknowledged: true, riskLevel: input.risk_level }),
    },
    {
      name: 'set_draft_output',
      description: 'Set the ICSR processing output — coding, narrative, deadline, and routing recommendation.',
      input_schema: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            properties: {
              seriousnessAssessment: { type: 'string' },
              suggestedMeddraPT: { type: 'string' },
              suggestedMeddraHLT: { type: 'string' },
              suggestedSOC: { type: 'string' },
              narrativeDraft: { type: 'string' },
              regulatoryDeadline: { type: 'string' },
              requiresExpedited: { type: 'boolean' },
            },
            required: ['seriousnessAssessment', 'suggestedMeddraPT', 'suggestedSOC', 'narrativeDraft', 'regulatoryDeadline', 'requiresExpedited'],
          },
        },
        required: ['output'],
      },
      handler: async () => ({ acknowledged: true }),
    },
  ],

  buildUserMessage: (ctx: AgentExecutionContext) =>
    `Process the following ICSR case end-to-end.

Case ID: ${ctx.entityId}

Steps:
1. Read the full case record
2. Assess seriousness per ICH E2A criteria
3. Suggest MedDRA coding (PT, HLT, SOC)
4. Draft the ICH E2B-structured narrative
5. Set the regulatory reporting deadline
6. Classify risk level and set your output
7. Summarise your recommendations`,

  buildReviewLabel: (ctx, draft) => {
    const d = draft as { suggestedMeddraPT?: string; requiresExpedited?: boolean };
    const urgency = d?.requiresExpedited ? 'EXPEDITED' : 'Routine';
    return `${ctx.entityId} — ${d?.suggestedMeddraPT ?? 'ICSR'} [${urgency}]`;
  },

  buildReviewDueAt: () => new Date(Date.now() + 24 * 3600_000).toISOString(),
};
