// ============================================================================
// global-submission-plan-data.ts — v0.62.0
// Seed data for Global Submission Plan (GSP) and Local Submission Plan (LSP)
// LIG-002 COMPLETE · LIG-007 COMPLETE · LIG-008 COMPLETE
// LIG-003 COMPLETE · LIG-004 COMPLETE · LIG-005 COMPLETE
// ============================================================================

export type PlanType = 'GSP' | 'LSP';

// ============================================================================
// LIG-005: TEMPLATE REGISTRY
// ============================================================================

export type TemplateType = '8-week' | '16-week' | '40-market';

export interface SubmissionTemplate {
  id: TemplateType;
  label: string;
  description: string;
  typicalTimeline: string;
  taskCount: number;
  modules: string[];      // which CTD modules are covered
  suitable: string[];     // use-case guidance
  isUQ: boolean;          // Upper Quartile (UQ) template flag
  color: string;
  badge: string;
}

export const SUBMISSION_TEMPLATES: SubmissionTemplate[] = [
  {
    id: '8-week',
    label: '8-Week Fast-Track',
    description: 'Streamlined template for priority review submissions with a compressed timeline. Covers essential CTD sections with parallelised authoring and review tracks.',
    typicalTimeline: '8 weeks from trigger milestone to submission',
    taskCount: 42,
    modules: ['M1', 'M2', 'M3', 'M5'],
    suitable: ['Priority / Breakthrough Therapy', 'Accelerated Approval', 'Rolling Review supplements'],
    isUQ: true,
    color: 'text-red-400',
    badge: 'bg-red-500/15',
  },
  {
    id: '16-week',
    label: '16-Week Standard',
    description: 'Standard template for NDA, MAA, and J-NDA submissions. Balanced scope covering all five CTD modules with sequential and parallel authoring phases.',
    typicalTimeline: '16 weeks from data-lock to submission',
    taskCount: 78,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    suitable: ['Standard NDA / MAA / J-NDA', 'BLA for biologics', 'Type II Variations'],
    isUQ: false,
    color: 'text-blue-400',
    badge: 'bg-blue-500/15',
  },
  {
    id: '40-market',
    label: '40-Market Global Expansion',
    description: 'Comprehensive GSP template designed for simultaneous multi-market filings. Includes lead market template rows plus pre-configured satellite delta task sets for up to 40 markets.',
    typicalTimeline: '12–18 months from lead market file to final satellite submission',
    taskCount: 156,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    suitable: ['Global simultaneous NDA/MAA/J-NDA launches', 'Post-approval market expansion programmes', 'Core dossier strategy with CCP reference'],
    isUQ: false,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/15',
  },
];

// ============================================================================
// LIG-004: PROVISIONING ERROR
// ============================================================================

export type ProvisioningStatus = 'provisioning' | 'active' | 'provisioning-failed' | 'draft';

export interface ProvisioningError {
  failedSubmissionIds: string[];
  failedStep: string;
  errorReason: string;
  occurredAt: string;
}

// ============================================================================
// LIG-008: CPI REGISTRY
// ============================================================================

export interface CPIRecord {
  id: string;                 // e.g. "CPI-001"
  title: string;
  ctdSection: string;
  moduleSection: string;
  markets: string[];          // which markets reference this CPI
  submissionIds: string[];
  status: 'shared' | 'market-unique';
  linkedTaskId?: string;      // task row that owns this CPI
  description?: string;
  documentRef?: string;       // linked document title
}

export const cpiRegistry: CPIRecord[] = [
  { id: 'CPI-001', title: 'Comprehensive Table of Contents', ctdSection: '1.0', moduleSection: 'M1', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-004', description: 'Unified ToC covering all CTD sections for all market submissions', documentRef: 'Nexavant-ToC-v3.2' },
  { id: 'CPI-002', title: 'Integrated Summary of Efficacy (ISE)', ctdSection: '2.7.3', moduleSection: 'M2', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-005', description: 'Global efficacy summary drawing on pooled analysis from LIG-301, LIG-201', documentRef: 'Nexavant-ISE-v2.1' },
  { id: 'CPI-003', title: 'Integrated Summary of Safety (ISS)', ctdSection: '2.7.4', moduleSection: 'M2', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-006', description: 'Comprehensive safety analysis across all clinical studies', documentRef: 'Nexavant-ISS-v2.0' },
  { id: 'CPI-004', title: 'Quality Overall Summary (QOS)', ctdSection: '2.3', moduleSection: 'M2', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-007', description: 'CMC narrative summary linking all Module 3 sections', documentRef: 'Nexavant-QOS-v1.8' },
  { id: 'CPI-005', title: 'Drug Substance — Manufacturing (3.2.S.2)', ctdSection: '3.2.S.2', moduleSection: 'M3', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-010', documentRef: 'Nexavant-DS-Mfg-v4.1' },
  { id: 'CPI-006', title: 'Drug Substance — Characterisation (3.2.S.3)', ctdSection: '3.2.S.3', moduleSection: 'M3', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-011', documentRef: 'Nexavant-DS-Char-v3.0' },
  { id: 'CPI-007', title: 'Drug Substance — Stability (3.2.S.7)', ctdSection: '3.2.S.7', moduleSection: 'M3', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-012', documentRef: 'Nexavant-DS-Stab-v2.3' },
  { id: 'CPI-008', title: 'Drug Product — Pharmaceutical Development (3.2.P.2)', ctdSection: '3.2.P.2', moduleSection: 'M3', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-013', documentRef: 'Nexavant-DP-PhDev-v2.5' },
  { id: 'CPI-009', title: 'Drug Product — Stability (3.2.P.8)', ctdSection: '3.2.P.8', moduleSection: 'M3', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-014', documentRef: 'Nexavant-DP-Stab-v1.9' },
  { id: 'CPI-010', title: 'Nonclinical Overview (Pharm/Tox)', ctdSection: '2.6', moduleSection: 'M4', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-016', documentRef: 'Nexavant-NC-Overview-v1.2' },
  { id: 'CPI-011', title: 'Nonclinical Written Summaries — Pharmacology', ctdSection: '4.2.1', moduleSection: 'M4', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-017', documentRef: 'Nexavant-NC-PharmSummary-v1.1' },
  { id: 'CPI-012', title: 'Pivotal CSR — Study LIG-301', ctdSection: '5.3.5.1', moduleSection: 'M5', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-019', documentRef: 'LIG-301-CSR-Final-v1.0' },
  { id: 'CPI-013', title: 'Supportive CSRs — Studies LIG-101/201', ctdSection: '5.3.5.2', moduleSection: 'M5', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-020', documentRef: 'LIG-101-201-CSR-Bundle-v1.0' },
  { id: 'CPI-014', title: 'Population PK Analysis Report', ctdSection: '5.3.3', moduleSection: 'M5', markets: ['US','EU','Japan'], submissionIds: ['sub-us-nda','sub-eu-maa','sub-jp-jnda'], status: 'shared', linkedTaskId: 't-021', documentRef: 'Nexavant-PopPK-v1.4' },
];
export type TaskStatus = 'not-started' | 'in-progress' | 'complete' | 'on-hold' | 'inactive';
export type TaskSection = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
export type TaskPhase = 'Authoring' | 'Review' | 'Approval' | 'Publishing' | 'Submission';

export interface GSPSubmission {
  id: string;
  type: string;       // NDA, MAA, JNDA, etc.
  market: string;     // US, EU, Japan, etc.
  agency: string;     // FDA, EMA, PMDA, etc.
  flag: string;
  isLead: boolean;
  targetDate: string;
}

export interface GSPTask {
  id: string;
  rowNum: number;
  taskName: string;
  ctdSection: string;         // e.g. "2.7.2", "3.2.S.1"
  moduleSection: TaskSection; // M1–M5
  phase: TaskPhase;
  // LIG-007: Per-row submission and country attribution
  submissionIds: string[];    // which submission IDs apply
  markets: string[];          // which markets this row belongs to
  isLeadMarketTask: boolean;  // true = from lead market template
  // LIG-008: CPI reference
  cpiReference?: string;      // e.g. "CPI-042"
  cpiSharedMarkets?: string[]; // markets sharing this CPI item
  // LIG-009: CCP Reference — M3 rows in Global submissions
  isCCPReferenced?: boolean;  // true = row uses CCP not submission-specific content plan
  ccpReference?: string;      // e.g. "CCP-Nexavant-v2.1"
  ccpReviewPending?: boolean; // true = Core/Global classification changed, needs review
  // LIG-019: Holiday row (locked, non-editable, excluded from progress)
  isHolidayRow?: boolean;
  holidayMarket?: string;     // which market's calendar this holiday belongs to
  holidayType?: 'public' | 'agency-closure' | 'custom';
  // LIG-010: Row inactivation (field-clearing + reversible)
  inactivatedAt?: string;     // ISO timestamp
  inactivatedBy?: string;
  // Templated values — stored for restoration on re-activation
  templatePredecessorIds?: string[];
  templateDuration?: number;
  // LIG-015: Date auto-calculation tracking
  isDateCalculated?: boolean; // true = date was auto-calculated from trigger milestone
  isDateOverridden?: boolean; // true = user manually overrode a calculated date
  weekendAdjusted?: boolean;  // true = date was snapped from weekend to working day
  // LIG-018: Manual date edit + lock
  isDateLocked?: boolean;     // true = user explicitly locked dates; excluded from all recalculations
  // LIG-013: Baseline snapshot — frozen dates captured at Set Baseline time
  baselineStartDate?: string;  // frozen plannedStartDate at baseline capture
  baselineFinishDate?: string; // frozen plannedFinishDate at baseline capture
  // Task metadata
  status: TaskStatus;
  owner?: string;
  plannedStartDate?: string;
  plannedFinishDate?: string;
  actualFinishDate?: string;
  duration?: number;          // working days
  predecessorIds?: string[];
  isCriticalPath?: boolean;
  daysOver?: number;          // LIG-017 placeholder
  notes?: string;
}

export interface GlobalSubmissionPlan {
  id: string;
  name: string;
  planType: PlanType;
  compound: string;
  productName: string;
  indication: string;
  leadMarket: string;
  satelliteMarkets: string[];
  submissions: GSPSubmission[];
  tasks: GSPTask[];
  status: 'draft' | 'active' | 'complete';
  // LIG-005: Template type
  templateId: TemplateType;
  templateType: string;       // display label
  // LIG-004: Provisioning status + error
  provisioningStatus: ProvisioningStatus;
  provisioningError?: ProvisioningError;
  // LIG-015: UQ trigger milestone
  triggerMilestoneName?: string;  // e.g. "LSLV — Last Subject Last Visit"
  triggerMilestoneDate?: string;  // YYYY-MM-DD
  datesCalculatedAt?: string;     // when last auto-calc was run
  // LIG-013: Baseline snapshot
  baselineCapturedAt?: string;  // ISO timestamp of when baseline was set
  baselineCapturedBy?: string;  // user who captured the baseline
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// OWNERS — shared pool for demo
// ============================================================================
const OWNERS = {
  lead_reg: 'Sarah Mitchell',
  cmc: 'James Park',
  clinical: 'Dr. Aisha Okonkwo',
  publishing: 'Tom Reyes',
  eu_reg: 'Katrina Müller',
  jp_reg: 'Hiroshi Tanaka',
  labeling: 'Priya Sharma',
  us_reg: 'Sarah Mitchell',
};

// ============================================================================
// DEMO GSP — Ligrastinib NDA (US Lead) + EU MAA + JP J-NDA
// ============================================================================
export const demoGSP: GlobalSubmissionPlan = {
  id: 'gsp-lig-001',
  name: 'Ligrastinib — Global NDA/MAA/J-NDA',
  planType: 'GSP',
  compound: 'Ligrastinib',
  productName: 'Nexavant',
  indication: 'Metastatic Non-Small Cell Lung Cancer',
  leadMarket: 'US',
  satelliteMarkets: ['EU', 'Japan'],
  status: 'active',
  templateId: '40-market',
  templateType: '40-Market Global Expansion',
  provisioningStatus: 'active',
  createdAt: '2025-11-01',
  updatedAt: '2026-02-25',
  createdBy: 'Sarah Mitchell',

  submissions: [
    { id: 'sub-us-nda', type: 'NDA', market: 'US', agency: 'FDA', flag: '🇺🇸', isLead: true, targetDate: '2026-09-30' },
    { id: 'sub-eu-maa', type: 'MAA', market: 'EU', agency: 'EMA', flag: '🇪🇺', isLead: false, targetDate: '2026-12-15' },
    { id: 'sub-jp-jnda', type: 'J-NDA', market: 'Japan', agency: 'PMDA', flag: '🇯🇵', isLead: false, targetDate: '2027-03-31' },
  ],

  tasks: [
    // ── MODULE 1 ─────────────────────────────────────────────────────────────
    {
      id: 't-001', rowNum: 1,
      taskName: 'Regional Cover Letters',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      cpiReference: undefined,
      status: 'complete', owner: OWNERS.lead_reg,
      plannedStartDate: '2026-06-01', plannedFinishDate: '2026-06-15', actualFinishDate: '2026-06-12',
      duration: 10, isCriticalPath: false,
    },
    {
      id: 't-002', rowNum: 2,
      taskName: 'EU Regional Cover Letter',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'in-progress', owner: OWNERS.eu_reg,
      plannedStartDate: '2026-07-01', plannedFinishDate: '2026-07-20',
      duration: 14, predecessorIds: ['t-001'],
    },
    {
      id: 't-003', rowNum: 3,
      taskName: 'Japan Regional Cover Letter',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.jp_reg,
      plannedStartDate: '2026-09-01', plannedFinishDate: '2026-09-20',
      duration: 14,
    },
    {
      id: 't-004', rowNum: 4,
      taskName: 'Comprehensive Table of Contents',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-001', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'in-progress', owner: OWNERS.publishing,
      plannedStartDate: '2026-07-15', plannedFinishDate: '2026-08-01',
      duration: 12, isCriticalPath: true,
    },

    // ── MODULE 2 ─────────────────────────────────────────────────────────────
    {
      id: 't-005', rowNum: 5,
      taskName: 'Integrated Summary of Efficacy (ISE)',
      ctdSection: '2.7.3', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-002', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'in-progress', owner: OWNERS.clinical,
      plannedStartDate: '2026-01-01', plannedFinishDate: '2026-02-05',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 't-006', rowNum: 6,
      taskName: 'Integrated Summary of Safety (ISS)',
      ctdSection: '2.7.4', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-003', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'in-progress', owner: OWNERS.clinical,
      plannedStartDate: '2026-04-15', plannedFinishDate: '2026-07-15',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 't-007', rowNum: 7,
      taskName: 'Quality Overall Summary (QOS)',
      ctdSection: '2.3', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-004', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'not-started', owner: OWNERS.cmc,
      plannedStartDate: '2026-06-01', plannedFinishDate: '2026-07-30',
      duration: 45, predecessorIds: ['t-015'],
    },
    {
      id: 't-008', rowNum: 8,
      taskName: 'EU Risk Management Plan (RMP)',
      ctdSection: '1.8.2', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.eu_reg,
      plannedStartDate: '2026-06-15', plannedFinishDate: '2026-08-15',
      duration: 45, notes: 'EU-specific requirement — no US/JP equivalent',
    },
    {
      id: 't-009', rowNum: 9,
      taskName: 'JP CTD Bridging Summary (Japanese)',
      ctdSection: '2.0', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.jp_reg,
      plannedStartDate: '2026-07-01', plannedFinishDate: '2026-09-15',
      duration: 55, notes: 'Japanese language requirement — translation required',
    },

    // ── MODULE 3 ─────────────────────────────────────────────────────────────
    {
      id: 't-010', rowNum: 10,
      taskName: '3.2.S Drug Substance — Manufacturing',
      ctdSection: '3.2.S.2', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-005', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      isCCPReferenced: true, ccpReference: 'CCP-Nexavant-v2.1',
      status: 'complete', owner: OWNERS.cmc,
      plannedStartDate: '2026-01-01', plannedFinishDate: '2026-03-31', actualFinishDate: '2026-04-05',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 't-011', rowNum: 11,
      taskName: '3.2.S Drug Substance — Characterisation',
      ctdSection: '3.2.S.3', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-006', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      isCCPReferenced: true, ccpReference: 'CCP-Nexavant-v2.1',
      status: 'complete', owner: OWNERS.cmc,
      plannedStartDate: '2026-01-15', plannedFinishDate: '2026-04-15', actualFinishDate: '2026-04-10',
      duration: 65,
    },
    {
      id: 't-012', rowNum: 12,
      taskName: '3.2.S Drug Substance — Stability',
      ctdSection: '3.2.S.7', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-007', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      isCCPReferenced: true, ccpReference: 'CCP-Nexavant-v2.1',
      status: 'in-progress', owner: OWNERS.cmc,
      plannedStartDate: '2026-03-01', plannedFinishDate: '2026-02-10',
      duration: 65, isCriticalPath: true,
      predecessorIds: ['t-010'],
    },
    {
      id: 't-013', rowNum: 13,
      taskName: '3.2.P Drug Product — Pharmaceutical Development',
      ctdSection: '3.2.P.2', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-008', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      isCCPReferenced: true, ccpReference: 'CCP-Nexavant-v2.1',
      status: 'complete', owner: OWNERS.cmc,
      plannedStartDate: '2026-02-01', plannedFinishDate: '2026-04-30', actualFinishDate: '2026-04-28',
      duration: 60,
    },
    {
      id: 't-014', rowNum: 14,
      taskName: '3.2.P Drug Product — Stability',
      ctdSection: '3.2.P.8', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-009', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      isCCPReferenced: true, ccpReference: 'CCP-Nexavant-v2.1',
      status: 'in-progress', owner: OWNERS.cmc,
      plannedStartDate: '2026-03-15', plannedFinishDate: '2026-02-15',
      duration: 75, isCriticalPath: true, predecessorIds: ['t-013'],
    },
    {
      id: 't-015', rowNum: 15,
      taskName: 'EU Specific Stability Commitments',
      ctdSection: '3.2.P.8', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.eu_reg,
      plannedStartDate: '2026-05-01', plannedFinishDate: '2026-06-15',
      duration: 30, predecessorIds: ['t-014'],
      notes: 'EMA requires 12-month real-time stability data at submission',
    },

    // ── MODULE 4 ─────────────────────────────────────────────────────────────
    {
      id: 't-016', rowNum: 16,
      taskName: 'Nonclinical Overview (Pharm/Tox)',
      ctdSection: '2.6', moduleSection: 'M4', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-010', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2026-01-01', plannedFinishDate: '2026-02-28', actualFinishDate: '2026-02-25',
      duration: 40,
    },
    {
      id: 't-017', rowNum: 17,
      taskName: 'Nonclinical Written Summaries — Pharmacology',
      ctdSection: '4.2.1', moduleSection: 'M4', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-011', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2026-01-15', plannedFinishDate: '2026-03-15', actualFinishDate: '2026-03-10',
      duration: 45, predecessorIds: ['t-016'],
    },
    {
      id: 't-018', rowNum: 18,
      taskName: 'JP Additional Nonclinical Studies (Bridging)',
      ctdSection: '4.2', moduleSection: 'M4', phase: 'Authoring',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.jp_reg,
      plannedStartDate: '2026-06-01', plannedFinishDate: '2026-08-30',
      duration: 65,
      notes: 'PMDA requires ethnicity bridging study data',
    },

    // ── MODULE 5 ─────────────────────────────────────────────────────────────
    {
      id: 't-019', rowNum: 19,
      taskName: 'Clinical Study Reports — Pivotal (Study LIG-301)',
      ctdSection: '5.3.5.1', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-012', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2025-12-01', plannedFinishDate: '2026-03-31', actualFinishDate: '2026-03-28',
      duration: 85, isCriticalPath: true,
    },
    {
      id: 't-020', rowNum: 20,
      taskName: 'Clinical Study Reports — Supportive (Studies LIG-101/201)',
      ctdSection: '5.3.5.2', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-013', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2026-01-01', plannedFinishDate: '2026-03-31', actualFinishDate: '2026-04-02',
      duration: 65,
    },
    {
      id: 't-021', rowNum: 21,
      taskName: 'PK/PD Reports — Population PK Analysis',
      ctdSection: '5.3.3', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-us-nda', 'sub-eu-maa', 'sub-jp-jnda'], markets: ['US', 'EU', 'Japan'],
      isLeadMarketTask: true,
      cpiReference: 'CPI-014', cpiSharedMarkets: ['US', 'EU', 'Japan'],
      status: 'in-progress', owner: OWNERS.clinical,
      plannedStartDate: '2026-03-01', plannedFinishDate: '2026-05-31',
      duration: 65, isCriticalPath: true, predecessorIds: ['t-019'],
    },
    {
      id: 't-022', rowNum: 22,
      taskName: 'JP Ethnicity Bridging Clinical Report',
      ctdSection: '5.3.5.3', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.jp_reg,
      plannedStartDate: '2026-05-01', plannedFinishDate: '2026-07-31',
      duration: 65,
      notes: 'Japanese PK bridging study LIG-401 — final DBL June 2026',
    },

    // ── LABELING ─────────────────────────────────────────────────────────────
    {
      id: 't-023', rowNum: 23,
      taskName: 'US Prescribing Information (PI) — Authoring',
      ctdSection: '1.14', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'in-progress', owner: OWNERS.labeling,
      plannedStartDate: '2026-04-01', plannedFinishDate: '2026-07-01',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 't-024', rowNum: 24,
      taskName: 'EU SmPC — Authoring',
      ctdSection: '1.3.1', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.eu_reg,
      plannedStartDate: '2026-05-01', plannedFinishDate: '2026-08-01',
      duration: 65,
    },
    {
      id: 't-025', rowNum: 25,
      taskName: 'JP Package Insert (PI) — Authoring (Japanese)',
      ctdSection: '1.14', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.jp_reg,
      plannedStartDate: '2026-07-01', plannedFinishDate: '2026-09-30',
      duration: 65,
    },

    // ── PUBLISHING / FINAL ────────────────────────────────────────────────────
    {
      id: 't-026', rowNum: 26,
      taskName: 'eCTD Sequence Compilation — US NDA',
      ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.publishing,
      plannedStartDate: '2026-08-01', plannedFinishDate: '2026-09-15',
      duration: 30, isCriticalPath: true,
      predecessorIds: ['t-005', 't-006', 't-012', 't-014', 't-021', 't-023'],
    },
    {
      id: 't-027', rowNum: 27,
      taskName: 'eCTD Sequence Compilation — EU MAA',
      ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.publishing,
      plannedStartDate: '2026-10-01', plannedFinishDate: '2026-11-30',
      duration: 40, predecessorIds: ['t-026', 't-008', 't-015', 't-024'],
    },
    {
      id: 't-028', rowNum: 28,
      taskName: 'eCTD Sequence Compilation — JP J-NDA',
      ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.publishing,
      plannedStartDate: '2026-12-01', plannedFinishDate: '2027-02-28',
      duration: 60, predecessorIds: ['t-026', 't-018', 't-022', 't-025'],
    },

    // ── LIG-019: HOLIDAY ROWS (auto-inserted, locked, excluded from progress) ─
    {
      id: 'hol-us-mem-2026', rowNum: 29,
      taskName: '🏖 Memorial Day — FDA Closed',
      ctdSection: '—', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      isHolidayRow: true, holidayMarket: 'US', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-05-25', plannedFinishDate: '2026-05-25',
      duration: 1,
      notes: 'FDA official holiday — no submissions processed. Auto-inserted by US holiday calendar.',
    },
    {
      id: 'hol-eu-whit-2026', rowNum: 30,
      taskName: '🏖 Whit Monday — EMA Closed',
      ctdSection: '—', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      isHolidayRow: true, holidayMarket: 'EU', holidayType: 'agency-closure',
      status: 'not-started',
      plannedStartDate: '2026-05-25', plannedFinishDate: '2026-05-25',
      duration: 1,
      notes: 'EMA agency closure. Auto-inserted by EU holiday calendar.',
    },
    {
      id: 'hol-us-jul4-2026', rowNum: 31,
      taskName: '🏖 Independence Day (observed) — FDA Closed',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      isHolidayRow: true, holidayMarket: 'US', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-07-03', plannedFinishDate: '2026-07-03',
      duration: 1,
      notes: 'July 4 falls on Saturday — FDA observes Friday 3 July. eCTD submissions received but review paused.',
    },
    {
      id: 'hol-jp-marine-2026', rowNum: 32,
      taskName: '🏖 Marine Day — PMDA Closed',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      isHolidayRow: true, holidayMarket: 'Japan', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-07-20', plannedFinishDate: '2026-07-20',
      duration: 1,
      notes: 'PMDA closed. Auto-inserted by Japan holiday calendar.',
    },
    {
      id: 'hol-eu-summer-2026', rowNum: 33,
      taskName: '🏖 EMA Summer Closure (3–14 Aug)',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-eu-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      isHolidayRow: true, holidayMarket: 'EU', holidayType: 'agency-closure',
      status: 'not-started',
      plannedStartDate: '2026-08-03', plannedFinishDate: '2026-08-14',
      duration: 8,
      notes: 'EMA reduced operations. CHMP meetings postponed. Plan MAA submission to avoid this window.',
    },
    {
      id: 'hol-jp-mountain-2026', rowNum: 34,
      taskName: '🏖 Mountain Day — PMDA Closed',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-jp-jnda'], markets: ['Japan'],
      isLeadMarketTask: false,
      isHolidayRow: true, holidayMarket: 'Japan', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-08-11', plannedFinishDate: '2026-08-11',
      duration: 1,
      notes: 'PMDA closed. Auto-inserted by Japan holiday calendar.',
    },
    {
      id: 'hol-us-labor-2026', rowNum: 35,
      taskName: '🏖 Labor Day — FDA Closed',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-us-nda'], markets: ['US'],
      isLeadMarketTask: true,
      isHolidayRow: true, holidayMarket: 'US', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-09-07', plannedFinishDate: '2026-09-07',
      duration: 1,
      notes: 'FDA closed. NDA target submission date 30 Sep — allow buffer. Auto-inserted by US holiday calendar.',
    },
  ],
};

// ============================================================================
// DEMO LSP — CardioShield NDA (US only, Local Submission Plan)
// ============================================================================
export const demoLSP: GlobalSubmissionPlan = {
  id: 'lsp-cs-001',
  name: 'CardioShield — US NDA',
  planType: 'LSP',
  compound: 'CardioShield',
  productName: 'CardioShield',
  indication: 'Heart Failure with Reduced Ejection Fraction',
  leadMarket: 'US',
  satelliteMarkets: [],
  status: 'active',
  templateId: '16-week',
  templateType: '16-Week Standard',
  provisioningStatus: 'active',
  createdAt: '2025-10-15',
  updatedAt: '2026-02-10',
  createdBy: 'James Park',

  submissions: [
    { id: 'sub-cs-nda', type: 'NDA', market: 'US', agency: 'FDA', flag: '🇺🇸', isLead: true, targetDate: '2026-11-30' },
  ],

  tasks: [
    {
      id: 'cs-001', rowNum: 1,
      taskName: 'Integrated Summary of Efficacy',
      ctdSection: '2.7.3', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2026-05-01', plannedFinishDate: '2026-07-31', actualFinishDate: '2026-07-28',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 'cs-002', rowNum: 2,
      taskName: 'Integrated Summary of Safety',
      ctdSection: '2.7.4', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'in-progress', owner: OWNERS.clinical,
      plannedStartDate: '2026-05-15', plannedFinishDate: '2026-08-15',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 'cs-003', rowNum: 3,
      taskName: 'Drug Substance (3.2.S)',
      ctdSection: '3.2.S', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'complete', owner: OWNERS.cmc,
      plannedStartDate: '2026-04-01', plannedFinishDate: '2026-06-30', actualFinishDate: '2026-06-25',
      duration: 65,
    },
    {
      id: 'cs-004', rowNum: 4,
      taskName: 'Pivotal Clinical Study Report',
      ctdSection: '5.3.5.1', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'complete', owner: OWNERS.clinical,
      plannedStartDate: '2026-03-01', plannedFinishDate: '2026-06-30', actualFinishDate: '2026-06-28',
      duration: 90, isCriticalPath: true,
    },
    {
      id: 'cs-005', rowNum: 5,
      taskName: 'US Prescribing Information',
      ctdSection: '1.14', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'in-progress', owner: OWNERS.labeling,
      plannedStartDate: '2026-06-01', plannedFinishDate: '2026-08-31',
      duration: 65, isCriticalPath: true,
    },
    {
      id: 'cs-006', rowNum: 6,
      taskName: 'eCTD Compilation & Submission',
      ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-cs-nda'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.publishing,
      plannedStartDate: '2026-09-15', plannedFinishDate: '2026-11-15',
      duration: 45, isCriticalPath: true,
      predecessorIds: ['cs-001', 'cs-002', 'cs-003', 'cs-004', 'cs-005'],
    },
  ],
};

// ============================================================================
// LIG-004 DEMO — OncoTarget GSP with provisioning failure
// ============================================================================
export const demoFailedPlan: GlobalSubmissionPlan = {
  id: 'gsp-ot-002',
  name: 'OncoTarget — China/Korea NDA',
  planType: 'GSP',
  compound: 'OncoTarget',
  productName: 'OncoTarget',
  indication: 'HER2+ Breast Cancer',
  leadMarket: 'China',
  satelliteMarkets: ['Korea'],
  status: 'draft',
  templateId: '16-week',
  templateType: '16-Week Standard',
  provisioningStatus: 'provisioning-failed',
  provisioningError: {
    failedSubmissionIds: ['sub-kr-nda'],
    failedStep: 'CPI Resolution — Korea NDA',
    errorReason: 'Unable to resolve CPI references for Korea submission: submission ID "KR-OT-2026-01" not found in Master Data. Verify the submission ID exists in IDMP registry before retrying.',
    occurredAt: '2026-02-24T14:32:00Z',
  },
  submissions: [
    { id: 'sub-cn-nda', type: 'NDA', market: 'China', agency: 'NMPA', flag: '🇨🇳', isLead: true, targetDate: '2027-06-30' },
    { id: 'sub-kr-nda', type: 'NDA', market: 'Korea', agency: 'MFDS', flag: '🇰🇷', isLead: false, targetDate: '2027-09-30' },
  ],
  tasks: [],
  createdAt: '2026-02-24',
  updatedAt: '2026-02-24',
  createdBy: 'James Park',
};

// ============================================================================
// DEMO UQ GSP — OncoPrime BLA (8-Week Fast-Track, UQ template, trigger-milestone pending)
// LIG-015 demo: shows TriggerMilestoneBanner on load
// ============================================================================
export const demoUQPlan: GlobalSubmissionPlan = {
  id: 'gsp-uq-001',
  name: 'OncoPrime BLA — US Priority Review',
  planType: 'GSP',
  compound: 'OncoPrime',
  productName: 'OncoPrime (pralitumab)',
  indication: 'Relapsed/Refractory Diffuse Large B-Cell Lymphoma (r/r DLBCL)',
  leadMarket: 'US',
  satelliteMarkets: ['EU'],
  status: 'active',
  templateId: '8-week',
  templateType: '8-Week Fast-Track (UQ)',
  provisioningStatus: 'active',
  createdAt: '2026-01-20',
  updatedAt: '2026-02-20',
  createdBy: 'Sarah Mitchell',
  submissions: [
    { id: 'sub-op-bla', type: 'BLA', market: 'US', agency: 'FDA', flag: '🇺🇸', isLead: true, targetDate: '2026-09-30' },
    { id: 'sub-op-maa', type: 'MAA', market: 'EU', agency: 'EMA', flag: '🇪🇺', isLead: false, targetDate: '2026-12-15' },
  ],
  tasks: [
    {
      id: 'op-001', rowNum: 1,
      taskName: 'Pivotal CSR — OncoPrime-301',
      ctdSection: '5.3.5.1', moduleSection: 'M5', phase: 'Authoring',
      submissionIds: ['sub-op-bla', 'sub-op-maa'], markets: ['US', 'EU'],
      isLeadMarketTask: true,
      status: 'in-progress', owner: OWNERS.clinical,
      duration: 35, isCriticalPath: true,
      predecessorIds: [],
    },
    {
      id: 'op-002', rowNum: 2,
      taskName: 'Integrated Summary of Efficacy',
      ctdSection: '2.7.3', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-op-bla', 'sub-op-maa'], markets: ['US', 'EU'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.clinical,
      duration: 21, isCriticalPath: true,
      predecessorIds: ['op-001'],
    },
    {
      id: 'op-003', rowNum: 3,
      taskName: 'Integrated Summary of Safety',
      ctdSection: '2.7.4', moduleSection: 'M2', phase: 'Authoring',
      submissionIds: ['sub-op-bla', 'sub-op-maa'], markets: ['US', 'EU'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.clinical,
      duration: 21, isCriticalPath: true,
      predecessorIds: ['op-001'],
    },
    {
      id: 'op-004', rowNum: 4,
      taskName: 'Drug Substance — Biologic Characterisation',
      ctdSection: '3.2.S.3', moduleSection: 'M3', phase: 'Authoring',
      submissionIds: ['sub-op-bla'], markets: ['US'],
      isLeadMarketTask: true,
      isCCPReferenced: true, ccpReference: 'CCP-OncoPrime-v1.0',
      status: 'complete', owner: OWNERS.cmc,
      duration: 30,
    },
    {
      id: 'op-005', rowNum: 5,
      taskName: 'FDA BLA Cover Letter + Module 1 Package',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-op-bla'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.us_reg,
      duration: 14, isCriticalPath: true,
      predecessorIds: ['op-002', 'op-003'],
    },
    {
      id: 'op-006', rowNum: 6,
      taskName: 'REMS Assessment',
      ctdSection: '1.17', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-op-bla'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.us_reg,
      duration: 10,
      predecessorIds: ['op-005'],
    },
    {
      id: 'op-007', rowNum: 7,
      taskName: 'eCTD Sequence Compilation — BLA',
      ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-op-bla'], markets: ['US'],
      isLeadMarketTask: true,
      status: 'not-started', owner: OWNERS.publishing,
      duration: 7, isCriticalPath: true,
      predecessorIds: ['op-005', 'op-006'],
    },
    {
      id: 'op-008', rowNum: 8,
      taskName: 'EMA MAA Cover Letter + Dossier Package',
      ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring',
      submissionIds: ['sub-op-maa'], markets: ['EU'],
      isLeadMarketTask: false,
      status: 'not-started', owner: OWNERS.eu_reg,
      duration: 21,
      predecessorIds: ['op-002', 'op-003'],
    },
    // LIG-019: Holiday rows for OncoPrime plan
    {
      id: 'hol-op-labor', rowNum: 9,
      taskName: '🏖 Labor Day — FDA Closed',
      ctdSection: '—', moduleSection: 'M1', phase: 'Publishing',
      submissionIds: ['sub-op-bla'], markets: ['US'],
      isLeadMarketTask: true,
      isHolidayRow: true, holidayMarket: 'US', holidayType: 'public',
      status: 'not-started',
      plannedStartDate: '2026-09-07', plannedFinishDate: '2026-09-07',
      duration: 1,
      notes: 'BLA target 30 Sep — ensure eCTD compiled before Labor Day. Auto-inserted.',
    },
  ],
};

export const allPlans: GlobalSubmissionPlan[] = [demoGSP, demoLSP, demoUQPlan, demoFailedPlan];
