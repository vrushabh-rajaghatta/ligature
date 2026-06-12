
/**
 * PMDAAgentPanel — PMDA Intelligence Agent
 * v0.125.83
 *
 * Three PMDA-specific modes:
 *   1. Inspection Readiness — simulates PMDA GMP/GCP inspector persona with
 *      Japan-specific findings (GMP Ordinance, PMDA Guidance, JP compliance)
 *   2. Dossier Review (J-NDA/J-MAA) — reviews dossier against PMDA scientific
 *      standards, bridging study requirements, Japanese-specific data needs
 *   3. J-NDA Advisory — guidance on J-NDA formatting, domestic clinical data
 *      strategy, bridging exemption eligibility, labelling requirements
 */

import { useState } from 'react';
import {
  Flag, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, XCircle, Info, Shield,
  FileText, ClipboardCheck, Lightbulb, BookOpen,
  TrendingUp, Globe, Users, Clock, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type PMDAMode = 'inspection' | 'dossier' | 'advisory';

type FindingClass  = 'Critical' | 'Major' | 'Minor' | 'Observation';
type DossierClass  = 'Deficiency' | 'Information Request' | 'Clarification' | 'Observation';
type AdvisoryClass = 'Required' | 'Recommended' | 'Optional' | 'Japan-Specific';

interface InspectionFinding {
  id: string;
  class: FindingClass;
  title: string;
  description: string;
  reference: string;
  ligatureRecord: string;
  suggestedResponse: string;
}

interface DossierFinding {
  id: string;
  type: DossierClass;
  ctdSection: string;
  title: string;
  description: string;
  jNDAGuideline: string;
  suggestedAction: string;
  precedent?: string;
}

interface AdvisoryItem {
  id: string;
  class: AdvisoryClass;
  topic: string;
  guidance: string;
  rationale: string;
  reference: string;
  actionRequired: string;
  deadlineNote?: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const INSPECTION_FINDINGS: InspectionFinding[] = [
  {
    id: 'PMDA-I-001', class: 'Major',
    title: 'Stability data — JP specification alignment gap',
    description: 'The submitted stability data uses ICH Q1A(R2) conditions (25°C/60%RH, 40°C/75%RH) but does not include long-term data at 30°C/65%RH for markets with intermediate climate zones. PMDA requires intermediate zone data for products intended for Japanese distribution under GMP Ordinance §16.',
    reference: 'PMDA GMP Ordinance 2023 §16; JGMP Guidance on Stability Testing',
    ligatureRecord: 'CMC → Stability → Study ST-001 (ICH primary conditions only)',
    suggestedResponse: 'Commission supplementary stability arm at 30°C/65%RH. Generate 6-month data. Provide bracketing justification for container closure system.',
  },
  {
    id: 'PMDA-I-002', class: 'Major',
    title: 'Japanese Pharmacopoeia compliance — impurity specification',
    description: 'Drug substance specification uses ICH Q3A(R2) identification thresholds (0.10% for ≤2g/day). However, JP 18th Edition specifies tighter limits for certain aromatic amines and genotoxic impurity classes under the domestic pharmacopoeia. Bridging of ICH vs JP limits has not been documented.',
    reference: 'Japanese Pharmacopoeia 18th Edition; ICH Q3A(R2)',
    ligatureRecord: 'CMC → Chemistry → DS Specification v3.2',
    suggestedResponse: 'Conduct JP vs ICH limit comparison. Document bridging rationale. Engage PMDA in pre-consultation on impurity classes requiring JP-specific limits.',
  },
  {
    id: 'PMDA-I-003', class: 'Minor',
    title: 'SOPs not available in Japanese — site inspection risk',
    description: 'Manufacturing SOPs for the contract manufacturing site are maintained in English only. PMDA inspectors require access to SOPs in Japanese or certified translation during on-site inspections. Translation project not documented.',
    reference: 'PMDA GMP Inspection Guidance (2022)',
    ligatureRecord: 'QMS → SOP Registry → Mfg SOPs (language: EN only)',
    suggestedResponse: 'Initiate certified translation programme for 15 critical GMP SOPs. Provide translation timeline commitment in inspection preparation package.',
  },
  {
    id: 'PMDA-I-004', class: 'Minor',
    title: 'Change control — PMDA prior approval threshold',
    description: 'Three post-approval changes were implemented under the internal Change Control procedure without PMDA Prior Approval notification. PMDA requires prior approval for Level 2 and above changes to drug substance manufacturing process, whereas FDA and EMA allow equivalent changes under CBE-30 or notification.',
    reference: 'PMDA Guidance on Post-Approval Changes (2021); MHW Ordinance No. 179',
    ligatureRecord: 'QMS → CAPA & Change Control → CC-2025-041, CC-2025-058, CC-2025-073',
    suggestedResponse: 'Retrospective PMDA Prior Approval submissions for 3 changes. Implement PMDA-specific change control tier in Ligature QMS. Update global change control SOP.',
  },
  {
    id: 'PMDA-I-005', class: 'Observation',
    title: 'Electronic batch records — e-signature format',
    description: 'Electronic batch records use US-format 21 CFR Part 11 e-signatures. PMDA\'s MHW Ordinance on Electronic Records requires ISMS-aligned authentication mechanisms consistent with Japanese e-signature regulations. Equivalence has not been formally assessed.',
    reference: 'MHW Ordinance (2005); PMDA Data Integrity Guidance (2022)',
    ligatureRecord: 'CMC → Batch Records → Electronic batch record system (21 CFR Part 11 certified)',
    suggestedResponse: 'Commission formal equivalence assessment between 21 CFR Part 11 and MHW Ordinance requirements. Document in QMS. Likely gap-free but must be documented.',
  },
];

const DOSSIER_FINDINGS: DossierFinding[] = [
  {
    id: 'PMDA-D-001', type: 'Deficiency',
    ctdSection: 'Module 5 (J-NDA Section 5.3.5)',
    title: 'Bridging study data — Japanese ethnic sensitivity not addressed',
    description: 'The J-NDA clinical section does not include a formal ethnic sensitivity analysis per ICH E5(R1). PMDA requires explicit demonstration that foreign clinical data is bridgeable to the Japanese population. No pharmacogenomic data on CYP2C19/CYP2D6 polymorphism prevalence (which differs significantly between Japanese and Caucasian populations) is presented.',
    jNDAGuideline: 'ICH E5(R1); PMDA Guidance on Bridging Studies (2023); MHLW Notification No. 0508-1',
    suggestedAction: 'Conduct pharmacogenomic sub-analysis from Phase 2 data. If Japanese patients included in global trial, extract sub-group PK/PD. If not, bridging PK study in healthy Japanese volunteers required.',
    precedent: 'PMDA precedent: 8 of last 12 J-NDA approvals in this class required bridging PK study. Median approval timeline extended 6 months for bridging vs full domestic development.',
  },
  {
    id: 'PMDA-D-002', type: 'Information Request',
    ctdSection: 'Module 3 (J-NDA Section 3.2.S.3)',
    title: 'Drug substance — Japanese domestic lot requirement',
    description: 'PMDA expects a batch manufactured under proposed commercial conditions using Japanese-market specification. The submitted dossier references only US and EU registration batches. PMDA often requests a Japanese validation batch or explicit equivalence data for domestic batches.',
    jNDAGuideline: 'PMDA CMC Guidance (2020); JGMP §24',
    suggestedAction: 'Provide batch analysis data for JP-specification batch or supply letter of commitment for JP registration batch. Confirm CMO agreement for JP batch manufacture.',
  },
  {
    id: 'PMDA-D-003', type: 'Information Request',
    ctdSection: 'Module 4 (J-NDA Section 4.2.3)',
    title: 'Non-clinical — domestic animal species data',
    description: 'PMDA historically requests non-clinical data from studies using Japanese-specific strains (e.g., Japanese white rabbit, ddY mouse) for certain compound classes. While ICH M3(R2) studies were conducted in SD rat and Beagle dog, PMDA reviewer may request justification for non-use of domestic strains or supplementary data.',
    jNDAGuideline: 'PMDA Non-Clinical Guidance; ICH M3(R2) Japan implementation notes',
    suggestedAction: 'Prepare species selection justification document. If compound is a first-in-class in Japan, consider proactive PMDA consultation (RS consultation) before dossier submission.',
  },
  {
    id: 'PMDA-D-004', type: 'Clarification',
    ctdSection: 'Module 2.7 (J-NDA Section 2.7.3)',
    title: 'Clinical summary — Japanese clinical study report required',
    description: 'Module 2.7 Clinical Summary references global pivotal study (Study LIG-2847-301) only. PMDA expects a dedicated Japanese language Clinical Study Report for any study conducted with Japanese patients, or a Japanese-specific sub-group report if Japanese patients were enrolled in the global trial.',
    jNDAGuideline: 'MHLW Notification on GCP (2012); PMDA GCP Guidance',
    suggestedAction: 'Identify Japanese patient enrollment in LIG-2847-301. If enrolled, generate JP sub-group CSR. If not enrolled, confirm global data bridgeability and prepare separate Japanese GCP certification.',
  },
  {
    id: 'PMDA-D-005', type: 'Observation',
    ctdSection: 'Module 1 (Administrative)',
    title: 'Package insert (PI) — J-NDA label format',
    description: 'The submitted draft label follows US FDA/EU SmPC format. Japanese Package Insert (PI) has a distinct format mandated by MHLW — 15 numbered sections including Japanese-specific sections on "Precautions for Dosage and Administration" and cultural prescribing context. A J-NDA compliant draft PI has not been included.',
    jNDAGuideline: 'MHLW Notification on Package Insert Format (2021)',
    suggestedAction: 'Engage Japanese labelling consultant to produce MHLW-compliant draft PI. Plan PMDA labelling consultation meeting prior to resubmission.',
  },
];

const ADVISORY_ITEMS: AdvisoryItem[] = [
  {
    id: 'PMDA-A-001', class: 'Required',
    topic: 'RS (Regulatory Strategy) Consultation — pre-J-NDA',
    guidance: 'PMDA offers a pre-NDA consultation system (RS Consultation) that allows sponsors to align on development strategy, bridging approach, and dossier format before formal J-NDA submission. For foreign-originated compounds, this consultation is strongly recommended and typically extends approval probability.',
    rationale: 'Historical data: J-NDAs with pre-submission RS consultation have 23% shorter review times and 40% lower rate of major deficiency letters (PMDA Annual Report 2024).',
    reference: 'PMDA Guidance on RS Consultation Procedures (2023)',
    actionRequired: 'Submit RS Consultation request to PMDA via PMDA online portal. Prepare dossier overview, development history, proposed bridging strategy. Timeline: 3–6 months pre-submission.',
    deadlineNote: 'Request no later than 6 months before planned J-NDA filing',
  },
  {
    id: 'PMDA-A-002', class: 'Required',
    topic: 'ICH E5 Bridging Exemption Assessment',
    guidance: 'Before designing a bridging study, assess whether a full bridging exemption can be claimed. PMDA allows exemption where: (1) compound PK is not sensitive to genetic polymorphisms prevalent in Japanese populations, (2) Phase 3 trial enrolled ≥10% Japanese patients, or (3) the drug class has well-established bridgeable precedent across ethnicities.',
    rationale: 'Bridging study adds 12–18 months and $2–4M. Exemption avoids this if criteria met. LIG-2847 pharmacology suggests potential CYP2C19 sensitivity — formal assessment required.',
    reference: 'ICH E5(R1); PMDA Q&A on Bridging (2022)',
    actionRequired: 'Commission formal ICH E5 ethnic sensitivity assessment from PK-PD specialist. Include CYP2C19/CYP2D6 analysis from existing Phase 2 PK dataset.',
  },
  {
    id: 'PMDA-A-003', class: 'Japan-Specific',
    topic: 'J-NDA Dossier Format — CTD with Japan-specific modules',
    guidance: 'Japan has adopted ICH CTD format (M4) but requires additional Japan-specific modules: Module 1.8 (Environmental Impact Assessment per Japanese law), Module 1.9 (Derogation from JP standards if applicable), and all Module 2 summaries must be provided in Japanese language. Module 5 CSRs may remain in English with Japanese summary.',
    rationale: 'Non-compliance with J-specific module requirements is the most common cause of J-NDA Day 1 rejection (15% of submissions per PMDA 2023 data).',
    reference: 'MHLW CTD Guidance (2021); PMDA Submission Format Guide',
    actionRequired: 'Prepare Module 1.8 Environmental Impact Assessment per Japanese Environmental Law. Commission Japanese translation of Module 2 summaries (2.4, 2.5, 2.6, 2.7). Confirm Module 1 administrative documents per PMDA checklist.',
  },
  {
    id: 'PMDA-A-004', class: 'Japan-Specific',
    topic: 'Priority Review Designation (Sakigake) — eligibility assessment',
    guidance: 'PMDA\'s Sakigake designation provides accelerated review (6 months vs 12 months standard) for breakthrough therapies addressing unmet medical needs in Japan. Oncology compounds with novel mechanisms are frequently eligible. Designation requires Japanese domestic clinical data, which may conflict with pure bridging strategy.',
    rationale: 'LIG-2847 (KRAS G12D inhibitor, first-in-class for PDAC) likely meets Sakigake scientific criteria. PDAC is listed as high-priority indication in MHLW 2024 designation list.',
    reference: 'PMDA Sakigake Designation Guidance (2023); MHLW Priority Review List',
    actionRequired: 'Assess Sakigake eligibility. If pursuing designation, plan Japanese patient enrollment in global Phase 2 or dedicated Phase 1/2 in Japanese sites. Discuss with Japanese regulatory consultant.',
    deadlineNote: 'Sakigake application must precede J-NDA by 12 months minimum',
  },
  {
    id: 'PMDA-A-005', class: 'Recommended',
    topic: 'Japanese GCP Certification for Foreign Clinical Sites',
    guidance: 'PMDA requires that foreign clinical study sites used to support the J-NDA comply with Japanese GCP (MHW Notification 1997/1998) or have formal equivalence documentation. Sites conducting the global Phase 3 must provide Japanese GCP compliance certification or a formal PMDA inspection.',
    rationale: 'Inadequate Japanese GCP certification is flagged in ~30% of J-NDA dossier reviews where foreign sites are used (PMDA Annual Report 2023).',
    reference: 'MHW Notification on GCP (1997); MHLW Revised GCP (2012)',
    actionRequired: 'Identify all Phase 3 sites to be referenced in J-NDA. Confirm Japanese GCP equivalence documentation. Prepare site master file translations for PMDA inspection readiness.',
  },
  {
    id: 'PMDA-A-006', class: 'Optional',
    topic: 'PMDA Innovation Office — early dialogue for novel mechanisms',
    guidance: 'PMDA Innovation Office provides informal early dialogue for breakthrough compounds prior to formal consultation requests. Useful for novel mechanisms (first-in-class KRAS G12D inhibitors) where PMDA scientific precedent is limited. Confidential — does not constitute formal guidance.',
    rationale: 'First-in-class compounds benefit most from early dialogue. Reduces risk of PMDA imposing unique domestic data requirements late in development.',
    reference: 'PMDA Innovation Office Procedures (2022)',
    actionRequired: 'Optional — consider requesting Innovation Office dialogue Q3 2026 if Sakigake designation pursued.',
  },
];

// ── Class tags ────────────────────────────────────────────────────────────────

function FindingTag({ cls }: { cls: FindingClass }) {
  const map: Record<FindingClass, string> = {
    Critical:    'text-red-400 bg-red-500/10 border-red-500/20',
    Major:       'text-orange-400 bg-orange-500/10 border-orange-500/20',
    Minor:       'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Observation: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${map[cls]}`}>{cls}</span>;
}

function DossierTag({ type }: { type: DossierClass }) {
  const map: Record<DossierClass, string> = {
    'Deficiency':          'text-red-400 bg-red-500/10 border-red-500/20',
    'Information Request': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'Clarification':       'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Observation':         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${map[type]}`}>{type}</span>;
}

function AdvisoryTag({ cls }: { cls: AdvisoryClass }) {
  const map: Record<AdvisoryClass, string> = {
    'Required':       'text-red-400 bg-red-500/10 border-red-500/20',
    'Recommended':    'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Optional':       'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Japan-Specific': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${map[cls]}`}>{cls}</span>;
}

// ── Card components ───────────────────────────────────────────────────────────

function InspectionFindingCard({ finding, idx }: { finding: InspectionFinding; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated/30 transition-colors">
        <div className="flex-shrink-0 mt-0.5"><FindingTag cls={finding.class} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary">{finding.title}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{finding.id} · {finding.reference.split(';')[0]}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{finding.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" />Reference</div>
              <p className="text-xs text-text-secondary">{finding.reference}</p>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Ligature Record</div>
              <p className="text-xs text-text-secondary">{finding.ligatureRecord}</p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Suggested Response</div>
            <p className="text-xs text-text-secondary leading-relaxed">{finding.suggestedResponse}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DossierFindingCard({ finding, idx }: { finding: DossierFinding; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated/30 transition-colors">
        <div className="flex-shrink-0 mt-0.5"><DossierTag type={finding.type} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary">{finding.title}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{finding.ctdSection} · {finding.id}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{finding.description}</p>
          <div className="rounded-lg bg-surface-elevated p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">J-NDA Guideline Basis</div>
            <p className="text-xs text-text-secondary">{finding.jNDAGuideline}</p>
          </div>
          {finding.precedent && (
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
              <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1 font-semibold">PMDA Precedent</div>
              <p className="text-xs text-text-secondary leading-relaxed">{finding.precedent}</p>
            </div>
          )}
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Suggested Action</div>
            <p className="text-xs text-text-secondary leading-relaxed">{finding.suggestedAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdvisoryCard({ item, idx }: { item: AdvisoryItem; idx: number }) {
  const [open, setOpen] = useState(idx < 2);
  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated/30 transition-colors">
        <div className="flex-shrink-0 mt-0.5"><AdvisoryTag cls={item.class} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary">{item.topic}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{item.id} · {item.reference.split(';')[0]}</div>
        </div>
        {item.deadlineNote && (
          <div className="flex-shrink-0 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{item.deadlineNote.substring(0, 20)}…
          </div>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{item.guidance}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Rationale</div>
              <p className="text-xs text-text-secondary leading-relaxed">{item.rationale}</p>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" />Reference</div>
              <p className="text-xs text-text-secondary">{item.reference}</p>
            </div>
          </div>
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
            <div className="text-[10px] text-violet-400 uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><Lightbulb className="w-3 h-3" />Action Required</div>
            <p className="text-xs text-text-secondary leading-relaxed">{item.actionRequired}</p>
          </div>
          {item.deadlineNote && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Clock className="w-3 h-3 flex-shrink-0" />{item.deadlineNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PMDAAgentPanel() {
  const { toast } = useToast();
  const [mode, setMode] = useState<PMDAMode>('inspection');
  const [phase, setPhase] = useState<'idle' | 'reading' | 'complete'>('idle');
  const setActiveModule = useAppStore(s => s.setActiveModule);

  const READING_STEPS: Record<PMDAMode, string[]> = {
    inspection: [
      'Loading PMDA GMP Ordinance and inspection precedent (2019–2024)',
      'Reviewing Japanese Pharmacopoeia 18th Edition specifications',
      'Cross-referencing CMC, QMS, and Batch Records in Ligature',
      'Identifying Japan-specific compliance gaps vs ICH standards',
      'Classifying findings: Critical / Major / Minor / Observation',
    ],
    dossier: [
      'Loading J-NDA CTD format requirements and MHLW notifications',
      'Reviewing ICH E5(R1) ethnic sensitivity and bridging guidance',
      'Cross-referencing Clinical, Regulatory, and CMC modules',
      'Applying PMDA dossier review precedent from prior J-NDA reviews',
      'Classifying findings: Deficiency / Information Request / Clarification',
    ],
    advisory: [
      'Loading PMDA regulatory pathway options (Standard / Sakigake / Conditional)',
      'Reviewing ICH E5(R1) bridging exemption eligibility criteria',
      'Analysing J-NDA format and module requirements (MHLW 2021)',
      'Reviewing PMDA pre-submission consultation procedures',
      'Generating prioritised J-NDA advisory guidance package',
    ],
  };

  const handleRun = async () => {
    setPhase('reading');
    await new Promise(r => setTimeout(r, 3000));
    setPhase('complete');
    const labels = { inspection: 'inspection', dossier: 'dossier review', advisory: 'J-NDA advisory' };
    toast.success(`PMDA ${labels[mode]} complete — ${mode === 'inspection' ? INSPECTION_FINDINGS.length + ' findings' : mode === 'dossier' ? DOSSIER_FINDINGS.length + ' dossier findings' : ADVISORY_ITEMS.length + ' advisory items'}`);
  };

  const modeTabs: { id: PMDAMode; label: string; tag: string; color: string }[] = [
    { id: 'inspection', label: 'Inspection Readiness', tag: 'GMP/GCP', color: 'text-red-400' },
    { id: 'dossier',    label: 'J-NDA Dossier Review', tag: 'CTD',     color: 'text-blue-400' },
    { id: 'advisory',   label: 'J-NDA Advisory',       tag: 'STRATEGY', color: 'text-violet-400' },
  ];

  const inspCounts  = { Critical: 0, Major: 2, Minor: 2, Observation: 1 };
  const dossierCounts = { Deficiency: 1, 'Information Request': 2, Clarification: 1, Observation: 1 };
  const advisCounts = { Required: 2, Recommended: 1, 'Japan-Specific': 2, Optional: 1 };

  return (
    <div className="flex flex-col h-full">

      {/* ── Config ─────────────────────────────────────────────────────────── */}
      <div className="p-6 border-b border-border space-y-4 flex-shrink-0">

        {/* Identity */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <span className="text-2xl flex-shrink-0">🇯🇵</span>
          <div>
            <div className="text-sm font-semibold text-red-400">PMDA Intelligence Agent</div>
            <div className="text-xs text-text-muted mt-0.5">
              Pharmaceuticals and Medical Devices Agency — Japan-specific regulatory intelligence across three modes: GMP/GCP inspection, J-NDA dossier review, and J-NDA strategy advisory.
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {modeTabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); setPhase('idle'); }}
                className={`px-3 py-2.5 rounded-lg border text-left transition-all ${mode === t.id ? 'border-border bg-surface-card' : 'border-border/50 text-text-muted hover:text-text-secondary'}`}
              >
                <div className={`text-[10px] font-semibold ${mode === t.id ? t.color : 'text-text-muted'}`}>{t.tag}</div>
                <div className="text-xs font-medium text-text-primary mt-0.5 leading-tight">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleRun} disabled={phase === 'reading'}>
          {phase === 'reading'
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analysing…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Run {mode === 'inspection' ? 'PMDA Inspection Simulation' : mode === 'dossier' ? 'J-NDA Dossier Review' : 'J-NDA Advisory'}</>
          }
        </Button>
      </div>

      {/* ── Output ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl opacity-20">🇯🇵</span>
            <p className="text-sm text-text-muted">Select a mode and run the PMDA agent to generate Japan-specific regulatory intelligence.</p>
          </div>
        )}

        {phase === 'reading' && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" /> Analysing PMDA requirements…
            </div>
            <div className="space-y-1.5">
              {READING_STEPS[mode].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-text-secondary">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'complete' && mode === 'inspection' && (
          <>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-red-400">PMDA Inspection Simulation Report</div>
                <div className="text-[10px] text-text-muted">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {Object.entries(inspCounts).map(([cls, n]) => (
                  <div key={cls} className="bg-surface rounded-lg p-2 text-center">
                    <div className="text-[10px] text-text-muted mb-0.5">{cls}</div>
                    <div className={`font-bold ${cls === 'Critical' ? 'text-red-400' : cls === 'Major' ? 'text-orange-400' : cls === 'Minor' ? 'text-amber-400' : 'text-blue-400'}`}>{n}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                Simulated PMDA GMP inspection of LIG-2847 manufacturing and quality dossier. Inspection persona: PMDA Office of Manufacturing Quality. No critical findings identified. 2 major findings require remediation before PMDA pre-approval inspection. Focus areas: JP-specific stability requirements and Japanese Pharmacopoeia specification alignment.
              </p>
            </div>
            <div className="space-y-3">
              {INSPECTION_FINDINGS.map((f, i) => <InspectionFindingCard key={f.id} finding={f} idx={i} />)}
            </div>
          </>
        )}

        {phase === 'complete' && mode === 'dossier' && (
          <>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-400">J-NDA Dossier Review Report — LIG-2847</div>
                <div className="text-[10px] text-text-muted">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {Object.entries(dossierCounts).map(([type, n]) => (
                  <div key={type} className="bg-surface rounded-lg p-2 text-center">
                    <div className="text-[10px] text-text-muted mb-0.5">{type.split(' ')[0]}</div>
                    <div className={`font-bold ${type === 'Deficiency' ? 'text-red-400' : type === 'Information Request' ? 'text-orange-400' : type === 'Clarification' ? 'text-amber-400' : 'text-blue-400'}`}>{n}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                J-NDA dossier reviewed against MHLW notifications, PMDA scientific guidelines, and ICH E5(R1) bridging requirements. 1 deficiency (bridging study gap) requires resolution before filing. Primary risk: Japanese ethnic sensitivity data not yet addressed.
              </p>
            </div>
            <div className="space-y-3">
              {DOSSIER_FINDINGS.map((f, i) => <DossierFindingCard key={f.id} finding={f} idx={i} />)}
            </div>
          </>
        )}

        {phase === 'complete' && mode === 'advisory' && (
          <>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-violet-400">J-NDA Strategy Advisory — LIG-2847</div>
                <div className="text-[10px] text-text-muted">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {Object.entries(advisCounts).map(([cls, n]) => (
                  <div key={cls} className="bg-surface rounded-lg p-2 text-center">
                    <div className="text-[10px] text-text-muted mb-0.5">{cls.split('-')[0]}</div>
                    <div className={`font-bold ${cls === 'Required' ? 'text-red-400' : cls === 'Recommended' ? 'text-amber-400' : cls === 'Japan-Specific' ? 'text-violet-400' : 'text-blue-400'}`}>{n}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                Strategic J-NDA advisory for LIG-2847 Japan development programme. Key decision point: Sakigake designation vs standard review pathway. Bridging exemption assessment required urgently. 2 required actions must be completed before J-NDA filing.
              </p>
            </div>
            <div className="space-y-3">
              {ADVISORY_ITEMS.map((item, i) => <AdvisoryCard key={item.id} item={item} idx={i} />)}
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />Recommended J-NDA Filing Timeline
              </div>
              <div className="space-y-2">
                {[
                  { q: 'Q2 2026', action: 'ICH E5 ethnic sensitivity assessment — commission now' },
                  { q: 'Q3 2026', action: 'PMDA RS Consultation submission (6 months pre-NDA)' },
                  { q: 'Q4 2026', action: 'Japanese Module 2 translations + Module 1.8 env. assessment' },
                  { q: 'Q1 2027', action: 'J-NDA filing (standard review) or Sakigake application deadline' },
                  { q: 'Q3 2027', action: 'Estimated PMDA approval — Sakigake pathway (6-month review)' },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-16 flex-shrink-0 text-[10px] font-semibold text-violet-400">{row.q}</div>
                    <span className="text-text-secondary">{row.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
