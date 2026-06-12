/**
 * ligature-products.ts — Ligature Product Tier Configuration
 * v0.125.83
 *
 * Defines the three Ligature product packages and their capability mappings.
 * Consumed by marketing surfaces, investor materials, and the Admin tier switcher.
 *
 *   Ligature Originate  — Discovery & Early Development Intelligence
 *   Ligature Transact   — Business Development & Partnering Operations
 *   Ligature Comply     — Regulatory, Quality & Compliance Operations (core platform)
 */

// ── Product definitions ────────────────────────────────────────────────────────

export interface LigatureProduct {
  id:          'originate' | 'transact' | 'comply';
  name:        string;
  tagline:     string;
  description: string;
  color:       string;     // Tailwind color token (no prefix)
  accentHex:   string;     // Hex for SVG / non-Tailwind use
  modules:     string[];   // ModuleId[] keys this product covers
  agents:      string[];   // AgentId[] keys included
  keyCapabilities: {
    label:       string;
    description: string;
  }[];
  targetPersona: string;
  investorValue: string;   // One-line investor framing
}

export const LIGATURE_PRODUCTS: Record<LigatureProduct['id'], LigatureProduct> = {

  originate: {
    id:       'originate',
    name:     'Ligature Originate',
    tagline:  'Discover the right programs. Build the strongest pipeline.',
    description:
      'AI-powered discovery and early development intelligence. Candidate targeting, experiment design, competitive landscape, and IND-enabling study sequencing — all grounded in your live Ligature data and platform-inferred capability profile.',
    color:    'emerald',
    accentHex: '#34d399',
    modules:  ['research', 'research-lead-opt', 'research-translational', 'research-targets', 'research-preclinical', 'research-ind', 'research-intelligence', 'eln'],
    agents:   ['candidate-targeting', 'experiment-design', 'ha-predictive-haq'],
    keyCapabilities: [
      { label: 'Candidate Targeting',      description: 'Multi-criteria scoring across 5 dimensions: scientific validity, clinical feasibility, competitive landscape, internal capability, and commercial opportunity. Reads live org capability profile.' },
      { label: 'Experiment Design Agent',  description: 'ICH M3(R2)-guided IND-enabling study sequencer. Species selection rationale, GLP requirements, CTD section mapping, cost and timeline estimates per study.' },
      { label: 'Org Capability Profile',   description: 'Self-reported + platform-inferred capability scoring (chemistry, biology, manufacturing, regulatory, clinical). Feeds directly into Candidate Targeting internalCapability dimension.' },
      { label: 'Research Intelligence',    description: 'Competitive landscape, patent monitoring, target validation — integrated with live PubMed and ClinicalTrials.gov signals.' },
      { label: 'IND Readiness Tracker',    description: 'End-to-end IND preparation status across non-clinical, CMC, and regulatory workstreams with gap analysis and timeline.' },
    ],
    targetPersona:  'CSO, Head of Research, Early Development Lead, Pipeline Strategy',
    investorValue:  'Turns R&D data into tractable pipeline decisions — reducing discovery-to-IND cycle time from 24 to 14 months.',
  },

  transact: {
    id:       'transact',
    name:     'Ligature Transact',
    tagline:  'Close faster. Protect more. Share nothing you shouldn\'t.',
    description:
      'End-to-end BD operations on top of your live R&D data. One-click due diligence package assembly, field-level redaction, SHA-256 integrity verification, time-limited data rooms, divestiture package builder, and a structured partnership workspace.',
    color:    'violet',
    accentHex: '#a78bfa',
    modules:  ['bd', 'bd-due-diligence', 'bd-data-room'],
    agents:   ['candidate-targeting'],
    keyCapabilities: [
      { label: 'Asset Due Diligence Agent',    description: 'One-click assembly of all Ligature-held data for an asset. 6 configurable data classes with Include / Redact / Exclude per class. SHA-256 per-document + manifest integrity seal.' },
      { label: 'Virtual Data Room',            description: 'Time-limited, watermarked, NDA-gated data rooms with IP whitelist, max-user controls, and real-time access logging to the immutable audit trail.' },
      { label: 'Divestiture Package Builder',  description: 'Buyer-ready divestiture data package assembly. CDA template, IP landscape, CMC summary (redacted), regulatory history, development cost summary.' },
      { label: 'Partnership Workspace',        description: 'Secure deal channel with milestone tracker, shared document log, and encrypted partner messaging. All activity audit-logged.' },
      { label: 'Integrity Verification',       description: 'SHA-256 manifest hash computed over all package documents at assembly time. Tamper-evident, immutable. Re-verifiable at any time.' },
    ],
    targetPersona:  'CEO, CFO, BD Lead, General Counsel, Head of Partnerships',
    investorValue:  'Cuts due diligence preparation from 6 weeks to 6 hours — and makes every data room defensible in court.',
  },

  comply: {
    id:       'comply',
    name:     'Ligature Comply',
    tagline:  'The operating system for GxP-grade drug development.',
    description:
      'The full Ligature platform — the core regulatory, quality, and compliance operating system. eCTD submissions, HAQ management, safety surveillance, QMS, CMC, clinical operations, and the complete HA intelligence agent suite. Everything from IND to NDA.',
    color:    'blue',
    accentHex: '#60a5fa',
    modules:  [
      'authoring', 'document-control', 'submission-command', 'submissions-hub',
      'submission-planning', 'publishing', 'haq', 'ectd-intelligence', 'reg-intel',
      'labeling', 'spl', 'strategy', 'reg-calendar', 'master-data', 'continuous-submission',
      'safety', 'signal-detection', 'psmf',
      'qms', 'glp', 'gcp', 'gmp', 'inspector-readiness', 'archives',
      'cmc', 'stability', 'batch-records',
      'ctms', 'study-design', 'biostats', 'tmf',
      'commercial', 'medical-affairs', 'supply-chain', 'adpromo',
      'analytics', 'ai-authoring', 'ai-consistency',
      'agent-hub',
    ],
    agents: [
      'ha-inspection', 'ha-dossier', 'ha-predictive-haq',
      'pmda-inspection', 'pmda-dossier', 'pmda-advisory',
      'narrative-writer', 'consistency-checker', 'label-reviewer',
      'safety-signal', 'deviation-classifier', 'capa-writer',
      'submission-planner', 'gap-analyst', 'risk-assessor',
      'clinical-protocol', 'study-monitor', 'data-reviewer',
    ],
    keyCapabilities: [
      { label: 'HA Intelligence Agents',    description: 'FDA, EMA, and PMDA inspection readiness, dossier review, and predictive HAQ generation. All 3 major health authorities. All 3 modes.' },
      { label: 'PMDA Agents (Japan)',        description: '3-mode PMDA agent: GMP inspection simulation, J-NDA dossier review, and J-NDA strategy advisory (SAKIGAKE, RS meetings, bridging, GPSP).' },
      { label: 'eCTD Publishing Pipeline',  description: 'Full eCTD authoring, sequence management, and gateway simulation (FDA ESG, EMA CESP, PMDA, Health Canada). IND→NDA chain.' },
      { label: 'HAQ Management',            description: '21 CFR Part 11 e-sig HAQ response workflow. Predictive HAQ generation. Live Supabase persistence. 100% response rate dashboard.' },
      { label: 'Quality Management System', description: 'Deviation management, CAPA workflow, audit management, ICH Q10 PQS, 21 CFR Part 820 compliance. SOC 2 Type II prepared.' },
      { label: 'Safety Surveillance',       description: 'E2B(R3) ICSR generation, signal detection, PSMF, aggregate reporting. Real-time PV dashboard with MedDRA coding.' },
      { label: 'Clinical Operations',       description: 'Full CTMS with ICH E6(R3) RBM monitoring, TMF management, biostatistics (SAP, CDISC ADAM/SDTM), and blinding controls.' },
      { label: '21 CFR Part 11 Compliance', description: 'SHA-256 audit trail chain hashing, dual e-signatures, role-based access control, RLS policies, and SOC 2 Type II audit trail.' },
    ],
    targetPersona:  'Head of Regulatory, CMO, Head of Quality, CTO — full platform licensee',
    investorValue:  'Replaces Veeva Vault + 6 point solutions with a single AI-native platform purpose-built for drug development operations.',
  },
};

// ── Helper ─────────────────────────────────────────────────────────────────────

export function getProductForModule(moduleId: string): LigatureProduct['id'] | null {
  for (const [id, product] of Object.entries(LIGATURE_PRODUCTS)) {
    if (product.modules.includes(moduleId)) return id as LigatureProduct['id'];
  }
  return null;
}

export function getProductForAgent(agentId: string): LigatureProduct['id'] | null {
  // Comply contains all agents; Originate has discovery agents; Transact has BD
  if (LIGATURE_PRODUCTS.originate.agents.includes(agentId)) return 'originate';
  if (LIGATURE_PRODUCTS.transact.agents.includes(agentId)) return 'transact';
  return 'comply';
}

export const PRODUCT_ORDER: LigatureProduct['id'][] = ['originate', 'transact', 'comply'];
