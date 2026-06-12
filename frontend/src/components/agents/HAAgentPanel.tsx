
/**
 * HAAgentPanel — Health Authority Intelligence Agents
 * v0.125.78
 *
 * Mode 1: Inspection Readiness
 *   Simulates a GMP/GCP/GLP inspector from a specific HA. Reviews SOPs,
 *   batch records, audit trails, deviation logs, and CAPA closure rates.
 *   Output: mock inspection report with Critical / Major / Minor findings
 *   linked to specific Ligature records.
 *
 * Mode 2: Dossier Review
 *   HA scientific reviewer perspective. Critiques Module 2 summaries,
 *   nonclinical/clinical overviews, CMC sections. Flags gaps and
 *   deficiencies with regulatory basis citations.
 *
 * Roadmap: Section 2 — HA Intelligence Agent System (Phase 1: FDA + EMA)
 */

import { useState } from 'react';
import {
  ShieldAlert, ClipboardCheck, ChevronDown, ChevronUp,
  AlertTriangle, AlertCircle, Info, CheckCircle, Play,
  RefreshCw, ExternalLink, BookOpen, FileText, Building2,
  Sparkles, X, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type HAMode = 'inspection' | 'dossier' | 'predictive';

type HA =
  | 'fda-ora-gmp'
  | 'fda-cder'
  | 'fda-cber'
  | 'ema-chmp'
  | 'pmda';

type FindingClass = 'Critical' | 'Major' | 'Minor' | 'Observation';

interface InspectionFinding {
  id: string;
  class: FindingClass;
  title: string;
  description: string;
  regulatoryBasis: string;
  linkedRecord?: { label: string; module: string; id: string };
  suggestedResponse: string;
}

interface DossierFinding {
  id: string;
  type: 'Deficiency' | 'Information Request' | 'Clarification' | 'Observation';
  module: string;
  section: string;
  title: string;
  description: string;
  regulatoryBasis: string;
  suggestedAction: string;
  precedent?: string;
}


// ── Predictive HAQ types ─────────────────────────────────────────────────────

type HAQConfidence = 'High' | 'Medium' | 'Low';

interface PredictedHAQ {
  id: string;
  rank: number;
  confidence: HAQConfidence;
  question: string;
  rationale: string;
  module: string;
  section: string;
  reviewerProfile: string;
  regulatoryBasis: string;
  precedentSource: string;
  suggestedResponseFramework: string;
  internalPrecedent?: string;
}

// ── HA configuration ──────────────────────────────────────────────────────────

const HA_CONFIG: Record<HA, {
  label: string; flag: string; agency: string;
  inspectionFocus: string[];
  reviewStandards: string[];
  persona: string;
}> = {
  'fda-ora-gmp': {
    label: 'FDA ORA (GMP)', flag: '🇺🇸', agency: 'FDA Office of Regulatory Affairs',
    inspectionFocus: ['Data integrity', 'CAPA closure', 'Audit trail completeness', 'Laboratory controls', 'Out-of-specification investigations'],
    reviewStandards: ['21 CFR Part 211', '21 CFR Part 11', 'FDA Data Integrity Guidance (2018)', 'ICH Q10'],
    persona: 'I am conducting a simulated FDA ORA GMP inspection. My focus areas are data integrity, CAPA closure rates, and audit trail completeness per 21 CFR Part 211.',
  },
  'fda-cder': {
    label: 'FDA CDER', flag: '🇺🇸', agency: 'FDA Center for Drug Evaluation and Research',
    inspectionFocus: ['Clinical data integrity', 'Protocol adherence', 'IRB oversight', 'Informed consent', 'Adverse event reporting'],
    reviewStandards: ['21 CFR Part 312', '21 CFR Part 50', '21 CFR Part 56', 'ICH E6(R3)', 'ICH E3'],
    persona: 'I am conducting a simulated FDA CDER clinical review. My focus areas are clinical data integrity, protocol deviation management, and adverse event completeness.',
  },
  'fda-cber': {
    label: 'FDA CBER', flag: '🇺🇸', agency: 'FDA Center for Biologics Evaluation and Research',
    inspectionFocus: ['Lot release testing', 'Potency assay validation', 'Biological product standards', 'Cold chain', 'Comparability studies'],
    reviewStandards: ['21 CFR Part 601', '21 CFR Part 610', 'ICH Q5A', 'ICH Q5E'],
    persona: 'I am conducting a simulated FDA CBER biologics inspection. My focus areas are lot release testing, potency assay validation, and comparability study adequacy.',
  },
  'ema-chmp': {
    label: 'EMA CHMP', flag: '🇪🇺', agency: 'European Medicines Agency — CHMP',
    inspectionFocus: ['GMP compliance', 'Quality management system', 'Change control', 'Validation', 'Supplier qualification'],
    reviewStandards: ['EU GMP Annex 11', 'EU GMP Annex 15', 'EMA/CHMP/ICH/Q9', 'ICH Q10', 'Eudralex Vol 4'],
    persona: 'I am conducting a simulated EMA CHMP GMP inspection. My focus areas are computerised system validation, change control robustness, and supplier qualification records.',
  },
  'pmda': {
    label: 'PMDA (Japan)', flag: '🇯🇵', agency: 'Pharmaceuticals and Medical Devices Agency',
    inspectionFocus: ['Japanese GMP compliance', 'Quality standards', 'Stability data', 'Manufacturing process validation', 'Specification alignment'],
    reviewStandards: ['Japanese Pharmacopoeia', 'PMDA GMP Ordinance', 'ICH Q8/Q9/Q10', 'MHW Ordinance No. 179'],
    persona: 'I am conducting a simulated PMDA GMP inspection. My focus areas are Japanese GMP ordinance compliance, stability data completeness, and manufacturing process validation.',
  },
};

// ── Mock finding generators ───────────────────────────────────────────────────

function generateInspectionFindings(ha: HA): InspectionFinding[] {
  const cfg = HA_CONFIG[ha];
  const base: InspectionFinding[] = [
    {
      id: 'INS-001',
      class: 'Critical',
      title: 'Incomplete audit trail for electronic batch records',
      description: `Batch records BPR-2847-301 through BPR-2847-306 show gaps in the electronic audit trail between 02:15 and 04:47 on three separate occasions. Per ${cfg.reviewStandards[1] ?? '21 CFR Part 11'}, all actions on electronic records must be timestamped and attributable to a specific individual. The audit trail suppression cannot be justified by the firm's current SOPs.`,
      regulatoryBasis: cfg.reviewStandards[1] ?? '21 CFR Part 11.10(e)',
      linkedRecord: { label: 'DEV-2026-034 — Batch Record Audit Trail Gap', module: 'qms', id: 'DEV-2026-034' },
      suggestedResponse: 'Immediate CAPA required. Root cause analysis within 15 business days. Retrospective review of all affected batches. SOP QMS-012 revision with enhanced audit trail monitoring.',
    },
    {
      id: 'INS-002',
      class: 'Major',
      title: 'CAPA closure rate below acceptable threshold',
      description: `Review of the CAPA system revealed 7 open CAPAs beyond their committed closure date, representing a 23% overdue rate. Three of these involve repeat observations from the prior ${ha.startsWith('fda') ? 'FDA' : ha === 'ema-chmp' ? 'EMA' : 'PMDA'} inspection (2024). The effectiveness check for CAPA-2025-018 was completed without documented evidence of re-inspection of the corrective measure.`,
      regulatoryBasis: cfg.reviewStandards[cfg.reviewStandards.length - 1] ?? 'ICH Q10 §3.2',
      linkedRecord: { label: 'CAPA-2025-018 — Overdue Effectiveness Check', module: 'qms', id: 'CAPA-2025-018' },
      suggestedResponse: 'Provide CAPA closure schedule with justified revised dates. Submit evidence of effectiveness checks for all CAPAs closed since last inspection. Implement escalation trigger at 80% of committed timeline.',
    },
    {
      id: 'INS-003',
      class: 'Major',
      title: 'Out-of-specification investigation deficiencies',
      description: `OOS investigation OOS-2026-007 for Batch LIG-2847-B042 closed without Phase II investigation following an initial assignable cause of "analyst error." The investigation conclusion is not supported by data — no retest of the original sample was performed and the analyst error was not confirmed through observable evidence. Additional OOS events were not assessed for impact on distributed product.`,
      regulatoryBasis: cfg.reviewStandards[0] ?? '21 CFR 211.192',
      linkedRecord: { label: 'OOS-2026-007 — Batch LIG-2847-B042', module: 'qms', id: 'OOS-2026-007' },
      suggestedResponse: 'Re-open investigation OOS-2026-007 with full Phase II analysis. Assess impact on distributed Batch B042. Provide revised investigation SOP with mandatory Phase II triggers. Implement investigator training on OOS procedures.',
    },
    {
      id: 'INS-004',
      class: 'Minor',
      title: 'SOP review cycle overdue for three documents',
      description: `SOPs QMS-004 (Change Control), QMS-017 (Deviation Management), and QMS-031 (Environmental Monitoring) are past their biennial review date by 47, 23, and 8 days respectively. While the content remains current, the periodic review requirement was not met per the firm's own quality system policy.`,
      regulatoryBasis: cfg.reviewStandards[cfg.reviewStandards.length - 1] ?? 'ICH Q10 §4.2',
      linkedRecord: { label: 'SOP QMS-004 v2.1 — Overdue Review', module: 'document-control', id: 'SOP-QMS-004' },
      suggestedResponse: 'Complete all three SOP reviews within 30 days. Implement automated review calendar with 60-day advance notification. Demonstrate system to inspector at close-out.',
    },
    {
      id: 'INS-005',
      class: 'Observation',
      title: 'Environmental monitoring trend data not formally reviewed at management review',
      description: `The most recent management review (Q1 2026) did not include a formal review of environmental monitoring trend data for the aseptic filling suite. While the data is available in the LIMS and shows no excursions, the absence of formal review documentation represents a gap against the firm's management review SOP.`,
      regulatoryBasis: 'ICH Q10 §4.1 — Management Review',
      suggestedResponse: 'Include EM trend data as a standing agenda item at all future management reviews. Update management review SOP template accordingly.',
    },
  ];

  // Filter/adjust based on HA focus
  if (ha === 'ema-chmp') {
    base[0].regulatoryBasis = 'EU GMP Annex 11 §12';
    base[1].regulatoryBasis = 'EU GMP Part I Chapter 1';
  } else if (ha === 'pmda') {
    base[0].regulatoryBasis = 'MHW Ordinance No. 179, Article 11';
    base[1].title = 'Self-inspection system deficiencies';
  }

  return base;
}

function generateDossierFindings(ha: HA): DossierFinding[] {
  return [
    {
      id: 'DOS-001',
      type: 'Deficiency',
      module: 'Module 2',
      section: '2.7.2 — Summary of Clinical Pharmacology Studies',
      title: 'Inadequate justification for dose selection in elderly population',
      description: 'The clinical pharmacology summary does not provide adequate data to support dose selection in patients aged ≥75 years. PK data from Study LIG-2847-101 excluded subjects >70 years. An age-stratified analysis or a dedicated PK sub-study in elderly patients is required.',
      regulatoryBasis: 'ICH E7 — Studies in Support of Special Populations: Geriatrics',
      suggestedAction: 'Provide age-stratified PK analysis from available data OR commit to a post-marketing PK study in patients ≥75 years with specified enrollment timeline.',
      precedent: 'Similar deficiency raised in FDA review of KRASG12C inhibitor sotorasib (AMG 510, BLA 214553) — resolved with pharmacokinetic modeling submission.',
    },
    {
      id: 'DOS-002',
      type: 'Information Request',
      module: 'Module 3',
      section: '3.2.P.5.3 — Validation of Analytical Procedures',
      title: 'Intermediate precision data incomplete for impurity method',
      description: 'The impurity method validation report (Analytical Method AM-2847-003) presents repeatability data from a single analyst on a single day. ICH Q2(R1) requires demonstration of intermediate precision across at minimum 2 analysts on 2 separate days. Please provide the missing intermediate precision data.',
      regulatoryBasis: 'ICH Q2(R1) §3 — Validation Characteristics',
      suggestedAction: 'Submit complete intermediate precision data for AM-2847-003 with statistical summary (RSD, acceptance criterion ≤2.0%).',
    },
    {
      id: 'DOS-003',
      type: 'Deficiency',
      module: 'Module 5',
      section: '5.3.5.1 — Study LIG-2847-301 Clinical Study Report',
      title: 'Protocol deviation impact on primary endpoint not assessed',
      description: 'The CSR for Study LIG-2847-301 identifies 47 major protocol deviations across 12 sites. The primary efficacy analysis (ITT population) does not include a sensitivity analysis excluding subjects with major deviations. Given that the primary endpoint result is borderline significant (p=0.043), the impact of deviations on the result must be evaluated.',
      regulatoryBasis: 'ICH E9(R1) — Statistical Principles; ICH E3 §9.4',
      suggestedAction: 'Provide sensitivity analysis of primary endpoint excluding subjects with major deviations. If result is no longer significant, provide additional supportive evidence or a proposed label modification.',
      precedent: 'FDA issued Complete Response Letter for similar borderline result without deviation sensitivity analysis in NDA 213526.',
    },
    {
      id: 'DOS-004',
      type: 'Clarification',
      module: 'Module 2',
      section: '2.4 — Nonclinical Overview',
      title: 'Species selection rationale for repeat-dose toxicity insufficient',
      description: 'The nonclinical overview states that rat and dog were selected as toxicology species based on "standard practice." A mechanistic justification referencing comparative receptor binding, metabolic profile, or pharmacodynamic response in the selected species relative to humans is expected.',
      regulatoryBasis: 'ICH M3(R2) §3.1; ICH S6(R1) for biologics',
      suggestedAction: 'Provide a pharmacologically justified rationale for species selection referencing receptor binding data, metabolite profile comparison, and pharmacological response data from discovery studies.',
    },
    {
      id: 'DOS-005',
      type: 'Observation',
      module: 'Module 3',
      section: '3.2.S.7 — Stability',
      title: 'No stability data under in-use conditions for reconstituted product',
      description: 'The stability dossier covers long-term, intermediate, and accelerated conditions for the drug substance and drug product but does not include in-use stability data following reconstitution. While not a deficiency at this filing stage, data will be required prior to approval for the proposed labelled shelf-life after first opening.',
      regulatoryBasis: 'ICH Q1A(R2) §4.1 — In-Use Stability Testing',
      suggestedAction: 'Initiate in-use stability study under conditions representative of clinical use (reconstitution, storage, light exposure). Commit to submission of data prior to approval.',
    },
  ];
}


function generatePredictiveHAQs(ha: HA): PredictedHAQ[] {
  const agencyName = ha.startsWith('fda') ? 'FDA' : ha === 'ema-chmp' ? 'EMA CHMP' : 'PMDA';
  const division = ha === 'fda-ora-gmp' ? 'ORA/CDER Division of Manufacturing Quality'
    : ha === 'fda-cder' ? 'CDER Division of Oncology Products 1'
    : ha === 'ema-chmp' ? 'CHMP Scientific Advisory Group — Oncology'
    : 'PMDA Office of New Drug IV';

  return [
    {
      id: 'PHAQ-001', rank: 1, confidence: 'High',
      question: `Please provide an age-stratified pharmacokinetic analysis for patients ≥75 years, or justify why dose adjustment is not required in this population based on available data from Study LIG-2847-101.`,
      rationale: `${agencyName} has raised this question in 4 of the last 6 KRAS G12C inhibitor reviews (2022–2025). The study excluded patients >70 years but the label population includes elderly patients. Internal HAQ precedent: similar question received on IND-123456 in 2024.`,
      module: 'Module 5', section: '5.3.1 — Clinical Pharmacology Studies',
      reviewerProfile: division,
      regulatoryBasis: 'ICH E7 — Studies in Support of Special Populations: Geriatrics',
      precedentSource: 'FDA PDUFA review of sotorasib (AMG 510, BLA 214553, 2021); adagrasib NDA 216340 (2022)',
      suggestedResponseFramework: '1. PK modeling using age as covariate from Study 101 data. 2. PopPK sensitivity analysis. 3. If data insufficient: propose bridging PK study with timeline.',
      internalPrecedent: 'IR-2024-003 — received on IND-123456; responded with PopPK analysis; HA accepted within 14 days.',
    },
    {
      id: 'PHAQ-002', rank: 2, confidence: 'High',
      question: `Provide a sensitivity analysis of the primary Overall Survival endpoint from Study LIG-2847-301 that excludes subjects with major protocol deviations. Justify the impact on the benefit-risk assessment if the result is no longer statistically significant.`,
      rationale: `47 major protocol deviations documented across 12 sites. Primary endpoint p=0.043 (borderline). ${agencyName} has issued CRLs in comparable situations (see NDA 213526). This question has >90% probability of appearing in the Day 74 List of Outstanding Issues.`,
      module: 'Module 5', section: '5.3.5.1 — Study LIG-2847-301 CSR',
      reviewerProfile: division,
      regulatoryBasis: 'ICH E9(R1) §3.3 — Sensitivity Analyses; ICH E3 §9.4',
      precedentSource: `${agencyName} Complete Response Letter for NDA 213526 (2023); FDA Statistical Review of NDA 215847`,
      suggestedResponseFramework: '1. Per-protocol population sensitivity analysis. 2. Tipping point analysis. 3. If borderline: supplementary evidence from secondary endpoints and QoL data.',
    },
    {
      id: 'PHAQ-003', rank: 3, confidence: 'High',
      question: `Describe the proposed risk minimisation measures for ${ha === 'ema-chmp' ? 'the EU RMP' : 'the REMS programme'} for [Identified Risk: ILD/pneumonitis]. Provide incidence data from the safety database and justify the proposed monitoring frequency.`,
      rationale: `ILD/pneumonitis is a class effect for KRAS G12C inhibitors. ${agencyName} required REMS/RMP for sotorasib and adagrasib. The safety database shows 3.2% incidence (Grade ≥3: 0.8%) in LIG-2847-301.`,
      module: 'Module 2', section: '2.5 — Clinical Overview',
      reviewerProfile: division,
      regulatoryBasis: ha === 'ema-chmp' ? 'GVP Module V — Risk Management Systems' : '21 CFR 355-1 — REMS Requirements',
      precedentSource: 'Sotorasib EU RMP v3.0 (2023); Adagrasib FDA REMS (2022)',
      suggestedResponseFramework: '1. ILD/pneumonitis risk characterisation table. 2. Proposed monitoring algorithm (CT at baseline, 3, 6, 12 months). 3. Healthcare provider communication plan. 4. If REMS/RMP required: draft elements ready for submission.',
    },
    {
      id: 'PHAQ-004', rank: 4, confidence: 'Medium',
      question: `Confirm the comparability of the drug substance manufactured at the proposed commercial site (Site B, Lot scale-up) versus the clinical material used in pivotal Study LIG-2847-301. Provide a side-by-side comparison of all critical quality attributes.`,
      rationale: `Site B was not used for pivotal clinical material. ${agencyName} routinely requests CQA comparability data when commercial manufacturing site differs from clinical site, particularly for small molecules with polymorphic forms.`,
      module: 'Module 3', section: '3.2.S.2.6 — Manufacturing Process Development',
      reviewerProfile: 'CMC review division',
      regulatoryBasis: 'ICH Q5E — Comparability; ICH Q6A — Specifications',
      precedentSource: 'EMA CHMP Assessment Report for similar KRAS inhibitor (2024)',
      suggestedResponseFramework: '1. CQA comparison table (lot analysis, dissolution, impurity profile, polymorphic form). 2. Statistical equivalence testing. 3. Stability data from Site B commercial lots.',
    },
    {
      id: 'PHAQ-005', rank: 5, confidence: 'Medium',
      question: `Please clarify the drug-drug interaction potential with CYP3A4 inducers and inhibitors and update the proposed labelling Section 7 accordingly. Provide clinical PK data or physiologically-based PK modelling to support the DDI assessment.`,
      rationale: `Ligrastinib is a CYP3A4 substrate (in vitro data in Module 5). No dedicated clinical DDI study was conducted. ${agencyName} will require either clinical DDI data or a well-validated PBPK model to support labelling recommendations.`,
      module: 'Module 2', section: '2.7.2 — Clinical Pharmacology',
      reviewerProfile: division,
      regulatoryBasis: 'FDA DDI Guidance (2020); EMA DDI Guideline (2012)',
      precedentSource: 'FDA Pharmacology Review of NDA 215847',
      suggestedResponseFramework: '1. PBPK model validation report. 2. DDI simulations for strong/moderate CYP3A4 inhibitors and inducers. 3. Proposed label language for Section 7 (DDI) with dose modification guidance.',
      internalPrecedent: 'IR-2025-007 — received on IND-123456; resolved with PBPK submission; accepted.',
    },
    {
      id: 'PHAQ-006', rank: 6, confidence: 'Low',
      question: `Provide additional data to support the proposed shelf-life of 36 months for the drug product. The accelerated stability data at 40°C/75% RH shows a trend in the impurity [Imp-A] that approaches the specification limit at 6 months.`,
      rationale: `The impurity trend is within specification but the slope extrapolated to 36 months approaches the limit. ${agencyName} may request additional real-time data or a reduced shelf-life claim if trend continues. Probability is lower as no specification exceedance has occurred.`,
      module: 'Module 3', section: '3.2.P.8 — Stability',
      reviewerProfile: 'CMC review division',
      regulatoryBasis: 'ICH Q1A(R2) §5 — Shelf Life',
      precedentSource: 'EMA Stability Guideline CPMP/QWP/122/02 (2003)',
      suggestedResponseFramework: '1. Updated real-time stability data (18-month timepoint). 2. Statistical analysis of impurity trend with 95% confidence interval projection. 3. If trend continues: propose label statement for storage conditions.',
    },
  ];
}

// ── Finding card components ───────────────────────────────────────────────────

const FINDING_COLORS: Record<FindingClass, { bg: string; border: string; text: string; dot: string }> = {
  Critical:    { bg: 'bg-red-500/5',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500' },
  Major:       { bg: 'bg-amber-500/5',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-500' },
  Minor:       { bg: 'bg-blue-500/5',   border: 'border-blue-500/30',   text: 'text-blue-400',   dot: 'bg-blue-500' },
  Observation: { bg: 'bg-slate-500/5',  border: 'border-slate-500/20',  text: 'text-slate-400',  dot: 'bg-slate-500' },
};

const DOSSIER_COLORS: Record<DossierFinding['type'], { bg: string; border: string; text: string }> = {
  'Deficiency':        { bg: 'bg-red-500/5',    border: 'border-red-500/30',    text: 'text-red-400' },
  'Information Request':{ bg: 'bg-amber-500/5', border: 'border-amber-500/30',  text: 'text-amber-400' },
  'Clarification':     { bg: 'bg-blue-500/5',   border: 'border-blue-500/30',   text: 'text-blue-400' },
  'Observation':       { bg: 'bg-slate-500/5',  border: 'border-slate-500/20',  text: 'text-slate-400' },
};

function InspectionFindingCard({ finding, idx }: { finding: InspectionFinding; idx: number }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const colors = FINDING_COLORS[finding.class];
  const setActiveModule = useAppStore(s => s.setActiveModule);

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${colors.text}`}>
          {finding.class}
        </span>
        <span className="text-xs font-mono text-text-muted flex-shrink-0">{finding.id}</span>
        <span className="text-sm font-medium text-text-primary flex-1 text-left">{finding.title}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <p className="text-xs text-text-secondary leading-relaxed">{finding.description}</p>

          <div className="flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-text-muted font-mono">{finding.regulatoryBasis}</span>
          </div>

          {finding.linkedRecord && (
            <button
              onClick={() => setActiveModule(finding.linkedRecord!.module as any)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface-card hover:border-accent-blue/50 transition-colors w-full text-left"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />
              <span className="text-xs text-text-primary flex-1">{finding.linkedRecord.label}</span>
              <span className="text-[10px] text-text-muted">{finding.linkedRecord.module}</span>
            </button>
          )}

          <div className="rounded-lg bg-surface-card border border-border p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">Suggested Response</div>
            <p className="text-xs text-text-secondary leading-relaxed">{finding.suggestedResponse}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DossierFindingCard({ finding, idx }: { finding: DossierFinding; idx: number }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const colors = DOSSIER_COLORS[finding.type];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${colors.text}`}>
          {finding.type}
        </span>
        <span className="text-xs font-mono text-text-muted flex-shrink-0">{finding.module}</span>
        <span className="text-sm font-medium text-text-primary flex-1 text-left truncate">{finding.title}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <div className="text-[10px] text-text-muted font-mono">{finding.section}</div>
          <p className="text-xs text-text-secondary leading-relaxed">{finding.description}</p>

          <div className="flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-text-muted font-mono">{finding.regulatoryBasis}</span>
          </div>

          {finding.precedent && (
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
              <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1 font-semibold">Precedent Decision</div>
              <p className="text-xs text-text-secondary leading-relaxed">{finding.precedent}</p>
            </div>
          )}

          <div className="rounded-lg bg-surface-card border border-border p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">Suggested Action</div>
            <p className="text-xs text-text-secondary leading-relaxed">{finding.suggestedAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}


const CONF_COLORS: Record<HAQConfidence, { bg: string; border: string; text: string; badge: string }> = {
  High:   { bg: 'bg-red-500/5',    border: 'border-red-500/25',    text: 'text-red-400',    badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  Medium: { bg: 'bg-amber-500/5',  border: 'border-amber-500/25',  text: 'text-amber-400',  badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Low:    { bg: 'bg-blue-500/5',   border: 'border-blue-500/25',   text: 'text-blue-400',   badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

function PredictiveHAQCard({ haq, idx }: { haq: PredictedHAQ; idx: number }) {
  const [expanded, setExpanded] = useState(idx < 2);
  const colors = CONF_COLORS[haq.confidence];
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-lg font-bold text-text-muted/40 w-6 flex-shrink-0">#{haq.rank}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${colors.badge}`}>{haq.confidence}</span>
        <span className="text-xs font-mono text-text-muted flex-shrink-0 hidden sm:inline">{haq.module} · {haq.section.split('—')[0].trim()}</span>
        <span className="text-sm font-medium text-text-primary flex-1 text-left line-clamp-1">{haq.question.slice(0, 80)}…</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <p className="text-xs text-text-secondary leading-relaxed font-medium">{haq.question}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-text-muted">Section: </span><span className="text-text-primary font-mono">{haq.section}</span></div>
            <div><span className="text-text-muted">Reviewer: </span><span className="text-text-primary">{haq.reviewerProfile}</span></div>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed border-l-2 border-amber-500/40 pl-3">{haq.rationale}</div>
          <div className="flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-text-muted font-mono">{haq.regulatoryBasis}</span>
          </div>
          {haq.precedentSource && (
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
              <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1 font-semibold">External Precedent</div>
              <p className="text-xs text-text-secondary">{haq.precedentSource}</p>
            </div>
          )}
          {haq.internalPrecedent && (
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 font-semibold">Internal Ligature Precedent</div>
              <p className="text-xs text-text-secondary">{haq.internalPrecedent}</p>
            </div>
          )}
          <div className="rounded-lg bg-surface-card border border-border p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">Suggested Response Framework</div>
            <p className="text-xs text-text-secondary leading-relaxed">{haq.suggestedResponseFramework}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface HAAgentPanelProps {
  mode: HAMode;
}

export function HAAgentPanel({ mode }: HAAgentPanelProps) {
  const { toast } = useToast();
  const [selectedHA, setSelectedHA] = useState<HA>('fda-ora-gmp');
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'persona' | 'reading' | 'analyzing' | 'complete'>('idle');
  const [inspectionFindings, setInspectionFindings] = useState<InspectionFinding[]>([]);
  const [dossierFindings, setDossierFindings] = useState<DossierFinding[]>([]);
  const [predictedHAQs, setPredictedHAQs] = useState<PredictedHAQ[]>([]);
  const [personaMessage, setPersonaMessage] = useState('');

  const cfg = HA_CONFIG[selectedHA];

  const handleRun = async () => {
    setIsRunning(true);
    setPhase('persona');
    setInspectionFindings([]);
    setDossierFindings([]);
    setPredictedHAQs([]);

    // Phase 1: Declare persona
    setPersonaMessage(cfg.persona);
    await new Promise(r => setTimeout(r, 1800));

    // Phase 2: Reading records
    setPhase('reading');
    await new Promise(r => setTimeout(r, 2200));

    // Phase 3: Analyzing
    setPhase('analyzing');
    await new Promise(r => setTimeout(r, 2000));

    // Phase 4: Complete
    if (mode === 'inspection') {
      setInspectionFindings(generateInspectionFindings(selectedHA));
    } else if (mode === 'dossier') {
      setDossierFindings(generateDossierFindings(selectedHA));
    } else {
      setPredictedHAQs(generatePredictiveHAQs(selectedHA));
    }
    setPhase('complete');
    setIsRunning(false);
    toast.success(
      mode === 'inspection'
        ? `Inspection simulation complete — ${generateInspectionFindings(selectedHA).length} findings generated`
        : `Dossier review complete — ${generateDossierFindings(selectedHA).length} items identified`
    );
  };

  const findings = mode === 'inspection' ? inspectionFindings : mode === 'dossier' ? dossierFindings : predictedHAQs;
  const criticalCount = inspectionFindings.filter(f => f.class === 'Critical').length;
  const majorCount = inspectionFindings.filter(f => f.class === 'Major').length;
  const deficiencyCount = dossierFindings.filter(f => f.type === 'Deficiency').length;

  const READING_STEPS = mode === 'inspection'
    ? ['Reading SOP library (QMS-004, QMS-017, QMS-031…)', 'Reviewing deviation log (47 records, last 24 months)', 'Checking CAPA closure rates and effectiveness reviews', 'Scanning batch record audit trails (BPR-2847-301 to 306)', 'Cross-referencing OOS investigations against 21 CFR 211.192']
    : mode === 'dossier'
    ? ['Loading Module 2 clinical and nonclinical summaries', 'Reviewing Module 3 CMC sections and analytical methods', 'Reading Module 5 clinical study reports', 'Cross-referencing against EPAR precedent database', 'Comparing to current agency guidance documents']
    : ['Loading internal HAQ precedent database (23 prior HAQs)', 'Ingesting external precedent — FDA PDUFA letters (2020–2025)', 'Ingesting EMA EPARs for KRAS G12C class (8 products)', 'Scanning current dossier for gap patterns', 'Ranking predicted questions by confidence level'];

  return (
    <div className="flex flex-col h-full">

      {/* Configuration */}
      <div className="p-6 border-b border-border space-y-4 flex-shrink-0">

        {/* Mode indicator */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${mode === 'inspection' ? 'bg-red-500/5 border border-red-500/20' : mode === 'dossier' ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-violet-500/5 border border-violet-500/20'}`}>
          {mode === 'inspection'
            ? <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            : mode === 'dossier' ? <ClipboardCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
            : <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0" />
          }
          <div>
            <div className={`text-sm font-semibold ${mode === 'inspection' ? 'text-red-400' : mode === 'dossier' ? 'text-blue-400' : 'text-violet-400'}`}>
              {mode === 'inspection' ? 'Inspection Readiness Simulation' : mode === 'dossier' ? 'Dossier Review Simulation' : 'Predictive HAQ Generation'}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {mode === 'inspection'
                ? 'Simulates a regulatory inspector reviewing your GMP records, SOPs, and quality system'
                : mode === 'dossier' ? 'Adopts HA reviewer perspective — critiques dossier against agency standards and precedent'
                : 'Combines internal HAQ precedent + external regulatory decisions to rank predicted HA questions before filing'}
            </div>
          </div>
        </div>

        {/* HA selector */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
            Health Authority
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(HA_CONFIG) as [HA, typeof HA_CONFIG[HA]][]).map(([ha, c]) => (
              <button
                key={ha}
                onClick={() => { setSelectedHA(ha); setPhase('idle'); setInspectionFindings([]); setDossierFindings([]); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                  selectedHA === ha
                    ? 'border-accent-blue/50 bg-accent-blue/5 text-text-primary'
                    : 'border-border text-text-muted hover:border-border/80 hover:text-text-secondary'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="text-xs font-medium truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Focus areas */}
        <div>
          <div className="text-xs text-text-muted mb-2 font-medium">Inspection Focus Areas</div>
          <div className="flex flex-wrap gap-1.5">
            {cfg.inspectionFocus.map(f => (
              <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-card border border-border text-text-muted">{f}</span>
            ))}
          </div>
        </div>

        {/* Run button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Running simulation…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Run {mode === 'inspection' ? 'Inspection' : mode === 'dossier' ? 'Dossier Review' : 'Predictive HAQ'} Simulation</>
          }
        </Button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Idle state */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            {mode === 'inspection'
              ? <ShieldAlert className="w-12 h-12 text-text-muted/20" />
              : <ClipboardCheck className="w-12 h-12 text-text-muted/20" />
            }
            <p className="text-sm text-text-muted">
              {mode === 'inspection'
                ? 'Configure the Health Authority above and run the inspection simulation to identify readiness gaps.'
                : 'Configure the Health Authority above and run the dossier review to identify potential deficiencies before filing.'}
            </p>
            <p className="text-xs text-text-muted/60 max-w-sm">
              Findings will be classified per {cfg.agency} nomenclature and linked to specific Ligature records.
            </p>
          </div>
        )}

        {/* Persona declaration */}
        {(phase === 'persona' || phase === 'reading' || phase === 'analyzing' || phase === 'complete') && personaMessage && (
          <div className="rounded-xl border border-border bg-surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">{cfg.agency} — Simulated Reviewer</div>
                <div className="text-[10px] text-text-muted">{cfg.label}</div>
              </div>
            </div>
            <p className="text-xs text-text-secondary italic leading-relaxed">&ldquo;{personaMessage}&rdquo;</p>
          </div>
        )}

        {/* Reading steps */}
        {(phase === 'reading' || phase === 'analyzing') && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-blue" />
              {phase === 'reading' ? 'Reading records…' : 'Analyzing findings…'}
            </div>
            <div className="space-y-1.5">
              {READING_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-text-secondary">{step}</span>
                </div>
              ))}
              {phase === 'analyzing' && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <RefreshCw className="w-3.5 h-3.5 text-accent-blue animate-spin flex-shrink-0" />
                  <span className="text-accent-blue">Classifying findings by severity…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'complete' && findings.length > 0 && (
          <>
            {/* Summary KPIs */}
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-text-primary">
                  {mode === 'inspection' ? 'Simulated Inspection Report' : 'Dossier Review Report'}
                </div>
                <div className="text-[10px] text-text-muted">{cfg.agency} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>

              {mode === 'inspection' ? (
                <div className="grid grid-cols-4 gap-3">
                  {(['Critical','Major','Minor','Observation'] as FindingClass[]).map(cls => {
                    const count = inspectionFindings.filter(f => f.class === cls).length;
                    const colors = FINDING_COLORS[cls];
                    return (
                      <div key={cls} className={`rounded-lg p-3 border text-center ${colors.border} ${colors.bg}`}>
                        <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{cls}</div>
                      </div>
                    );
                  })}
                </div>
              ) : mode === 'predictive' ? (
                <div className="grid grid-cols-3 gap-3">
                  {(['High','Medium','Low'] as HAQConfidence[]).map(conf => {
                    const count = predictedHAQs.filter(h => h.confidence === conf).length;
                    const colors = CONF_COLORS[conf];
                    return (
                      <div key={conf} className={`rounded-lg p-3 border text-center ${colors.border} ${colors.bg}`}>
                        <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{conf} Confidence</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {(['Deficiency','Information Request','Clarification','Observation'] as DossierFinding['type'][]).map(type => {
                    const count = dossierFindings.filter(f => f.type === type).length;
                    const colors = DOSSIER_COLORS[type];
                    return (
                      <div key={type} className={`rounded-lg p-3 border text-center ${colors.border} ${colors.bg}`}>
                        <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
                        <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{type}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mode === 'predictive' && predictedHAQs.filter(h=>h.confidence==='High').length > 0 && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                  <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    {predictedHAQs.filter(h=>h.confidence==='High').length} high-confidence questions predicted. These have appeared in ≥75% of comparable submissions reviewed by this agency. Address proactively in your dossier before filing.
                  </p>
                </div>
              )}
              {mode !== 'predictive' && (criticalCount > 0 || deficiencyCount > 0) && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    {mode === 'inspection'
                      ? `${criticalCount} Critical finding${criticalCount !== 1 ? 's' : ''} require immediate CAPA initiation. Review all findings with QA leadership before the inspection.`
                      : `${deficiencyCount} Deficien${deficiencyCount !== 1 ? 'cies' : 'cy'} identified that could result in a Complete Response Letter. Address before submission.`
                    }
                  </p>
                </div>
              )}

              <div className="mt-3 text-[10px] text-text-muted/60 italic flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Simulation only — not a substitute for formal regulatory advice. All findings require human review before action.
              </div>
            </div>

            {/* Finding cards */}
            <div className="space-y-3">
              {mode === 'inspection'
                ? inspectionFindings.map((f, i) => <InspectionFindingCard key={f.id} finding={f} idx={i} />)
                : mode === 'dossier'
                ? dossierFindings.map((f, i) => <DossierFindingCard key={f.id} finding={f} idx={i} />)
                : predictedHAQs.map((h, i) => <PredictiveHAQCard key={h.id} haq={h} idx={i} />)
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}
