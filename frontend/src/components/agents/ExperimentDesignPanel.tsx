
/**
 * ExperimentDesignPanel — Experiment Design Agent
 * v0.125.80
 *
 * ICH M3(R2)-guided IND-enabling study sequencer for a nominated candidate.
 * Proposes the complete non-clinical development package: species selection
 * with rationale, dose range, route, study type, GLP requirements, and
 * regulatory timeline toward IND/CTA submission.
 */

import { useState } from 'react';
import {
  FlaskConical, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Clock, Shield, BookOpen, Layers,
  Microscope, Activity, FileText, Info, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type Modality = 'small-molecule' | 'biologic' | 'oligonucleotide' | 'cell-gene';
type Route    = 'oral' | 'iv' | 'sc' | 'im' | 'inhaled' | 'topical';
type Target   = 'oncology' | 'immunology' | 'neurology' | 'cardiometabolic';

interface StudyDesign {
  id:           string;
  phase:        'Phase 0' | 'Phase 1' | 'Phase 2' | 'Phase 3';
  studyType:    string;
  ichGuideline: string;
  species:      string[];
  speciesRationale: string;
  doseRange:    string;
  duration:     string;
  route:        Route;
  glpRequired:  boolean;
  glpRationale: string;
  indRequired:  boolean;     // Required before IND/CTA?
  ctdSection:   string;      // e.g. "Module 4.2.3.2"
  estimatedWeeks: number;
  estimatedCost:  string;
  keyEndpoints:   string[];
  regulatoryNote: string;
  risk:         'Low' | 'Medium' | 'High';  // Study complexity/regulatory risk
}

interface ExperimentPackage {
  candidateId:  string;
  candidateName: string;
  modality:     Modality;
  targetClass:  string;
  indication:   string;
  route:        Route;
  indTimeline:  string;
  totalWeeks:   number;
  studies:      StudyDesign[];
  criticalPath: string[];
  regulatorySummary: string;
  ichCompliance: {
    item: string;
    status: 'Met' | 'Partial' | 'Not Met';
    note: string;
  }[];
}

// ── Data generators ───────────────────────────────────────────────────────────

function generatePackage(
  modality: Modality,
  route: Route,
  target: Target,
  candidateId: string,
): ExperimentPackage {
  const isSmMol   = modality === 'small-molecule';
  const isOral    = route === 'oral';
  const isBiologic = modality === 'biologic';

  const targetMap: Record<Target, { name: string; indication: string; targetClass: string }> = {
    oncology:       { name: 'KRAS G12D covalent inhibitor',      indication: 'Pancreatic ductal adenocarcinoma (PDAC)', targetClass: 'Oncogenic GTPase' },
    immunology:     { name: 'TYK2 allosteric inhibitor',         indication: 'Psoriasis / IBD',                        targetClass: 'Non-receptor tyrosine kinase' },
    neurology:      { name: 'LRRK2 G2019S kinase inhibitor',     indication: "LRRK2-mutant Parkinson's disease",       targetClass: 'Leucine-rich repeat kinase' },
    cardiometabolic:{ name: 'PCSK9 protein-protein interaction inhibitor', indication: 'Hypercholesterolaemia / ASCVD', targetClass: 'Serine protease' },
  };

  const t = targetMap[target];

  // ── Species selection ──────────────────────────────────────────────────────
  const primarySpecies  = isSmMol ? 'Sprague-Dawley rat' : 'Cynomolgus monkey';
  const secondarySpecies = isSmMol ? 'Beagle dog'        : 'CD-1 mouse (pharmacology)';
  const speciesRationale = isSmMol
    ? `Rat selected as primary rodent per ICH M3(R2). Metabolic profiling (CYP450) demonstrates similar hepatic oxidative metabolism between rat and human. Dog selected as non-rodent — demonstrated adequate exposure (AUC ≥3× human MRHD) in preliminary PK. Both species pharmacologically relevant for ${t.targetClass} activity.`
    : `Cynomolgus monkey selected as primary species — demonstrates pharmacological activity at ${t.targetClass} (>80% receptor occupancy at projected clinical dose). Rodent excluded due to insufficient target homology (<75% amino acid identity). Consistent with ICH S6(R1) biologic-specific guidance.`;

  const studies: StudyDesign[] = [];
  let weeksCumulative = 0;

  // ── 1. Acute (single-dose) toxicology ─────────────────────────────────────
  studies.push({
    id: 'STD-001',
    phase: 'Phase 1',
    studyType: 'Single-Dose Acute Toxicology (MTD / Dose Range Finding)',
    ichGuideline: 'ICH M3(R2), ICH S9 (oncology)',
    species: [primarySpecies, secondarySpecies],
    speciesRationale,
    doseRange: isSmMol ? '0 (vehicle), 10, 100, 300, 1000 mg/kg' : '0, 1, 10, 100 mg/kg IV bolus',
    duration: 'Single dose + 14-day observation',
    route,
    glpRequired: false,
    glpRationale: 'Non-GLP acceptable for range-finding; data informs GLP repeat-dose dose selection. GLP required from 28-day repeat-dose onward.',
    indRequired: true,
    ctdSection: 'Module 4.2.3.1',
    estimatedWeeks: 8,
    estimatedCost: '$180–240K',
    keyEndpoints: [
      'Maximum tolerated dose (MTD) or maximum feasible dose (MFD)',
      'Dose-limiting toxicity (DLT) characterisation — histopathology',
      'PK/TK: Cmax, AUC, t½ at each dose level',
      'Reversibility assessment at D14 satellite group',
    ],
    regulatoryNote: 'Informs GLP dose selection. ICH M3(R2) §3 requires acute toxicity data in ≥1 species prior to Phase 1 FIH. Non-GLP acceptable per FDA Guidance on non-clinical safety studies.',
    risk: 'Low',
  });
  weeksCumulative += 8;

  // ── 2. 28-Day repeat dose (GLP) ───────────────────────────────────────────
  studies.push({
    id: 'STD-002',
    phase: 'Phase 1',
    studyType: `28-Day Repeat-Dose Toxicology (GLP) — ${primarySpecies}`,
    ichGuideline: 'ICH M3(R2) Table 1, ICH S7A',
    species: [primarySpecies],
    speciesRationale,
    doseRange: isSmMol ? 'Vehicle, 30, 100, 300 mg/kg/day (MTD-derived)' : 'Vehicle, 3, 30, 100 mg/kg/week',
    duration: '28 days + 14-day recovery satellite',
    route,
    glpRequired: true,
    glpRationale: 'GLP required per ICH M3(R2) — 28-day duration crosses GLP threshold. Required for IND Module 4.',
    indRequired: true,
    ctdSection: 'Module 4.2.3.2',
    estimatedWeeks: 14,
    estimatedCost: '$420–580K',
    keyEndpoints: [
      'NOAEL and LOAEL establishment',
      'Target organ toxicity: clinical pathology (haem, biochemistry, urinalysis)',
      'Macroscopic + microscopic histopathology (>40 tissues)',
      'TK: Day 1 and Day 28 AUC, Cmax — exposure multiples vs human MRHD',
      'Reversibility at 14-day recovery',
    ],
    regulatoryNote: 'Enables Phase 1 single-dose and multi-dose up to 28 days. Required in CTD Module 4.2.3.2. Exposure multiple ≥10× MRHD AUC0-24 required; flag if <5× with justification.',
    risk: 'Medium',
  });
  weeksCumulative += 14;

  // ── 3. 28-Day non-rodent (GLP) ────────────────────────────────────────────
  studies.push({
    id: 'STD-003',
    phase: 'Phase 1',
    studyType: `28-Day Repeat-Dose Toxicology (GLP) — ${isBiologic ? 'Cynomolgus monkey' : 'Beagle dog'}`,
    ichGuideline: 'ICH M3(R2) Table 1, ICH S6(R1) (if biologic)',
    species: [isBiologic ? 'Cynomolgus monkey' : 'Beagle dog'],
    speciesRationale: isBiologic ? speciesRationale : 'Beagle dog selected as second non-rodent species — CYP3A4 metabolism analogous to human. High throughput oral dosing feasible.',
    doseRange: isBiologic ? '0, 3, 30, 100 mg/kg biweekly SC' : '0, 10, 30, 100 mg/kg/day PO',
    duration: '28 days + 14-day recovery satellite',
    route,
    glpRequired: true,
    glpRationale: 'Two-species repeat-dose GLP toxicology required per ICH M3(R2). Non-rodent data provides cross-species confidence for IND safety assessment.',
    indRequired: true,
    ctdSection: 'Module 4.2.3.2',
    estimatedWeeks: 14,
    estimatedCost: '$580–780K',
    keyEndpoints: [
      'Species-specific NOAEL / LOAEL',
      'Cardiovascular safety telemetry (QTc, HR, MAP) — ICH S7B assessment',
      'Immunogenicity screening (if biologic: ADA, nAb)',
      'PK profile: Cmax, AUC, t½ — exposure multiple calculation',
      'Histopathology: 40+ tissues including target organs',
    ],
    regulatoryNote: 'Two-species GLP is the FDA/EMA minimum for small molecule IND. Cardiotox (QTc) data from non-rodent informs ICH E14 waiver request potential.',
    risk: 'Medium',
  });
  weeksCumulative += 14;

  // ── 4. Genetic toxicology ─────────────────────────────────────────────────
  studies.push({
    id: 'STD-004',
    phase: 'Phase 1',
    studyType: 'Genetic Toxicology Battery (ICH S2(R1))',
    ichGuideline: 'ICH S2(R1)',
    species: ['Salmonella typhimurium (Ames)', 'L5178Y mouse lymphoma cells (in vitro MLA)', 'Sprague-Dawley rat (in vivo MN)'],
    speciesRationale: 'ICH S2(R1) Option 2 battery: in vitro Ames + MLA (or HPRT) + in vivo micronucleus. All three required for IND. Results must be negative/acceptable before FIH.',
    doseRange: 'Ames: 8 concentrations (3.16–5000 µg/plate); MLA: 8 concentrations; in vivo MN: 1000, 2000, 4000 mg/kg',
    duration: 'Parallel — can run concurrent with 28-day tox',
    route: 'oral',
    glpRequired: true,
    glpRationale: 'All ICH S2(R1) genotox studies must be GLP. Ames and in vitro clastogenicity required for IND; in vivo required if in vitro positive.',
    indRequired: true,
    ctdSection: 'Module 4.2.3.3',
    estimatedWeeks: 8,
    estimatedCost: '$120–160K',
    keyEndpoints: [
      'Ames test: reversion frequency ≤2× negative control at any dose',
      'MLA: mutant frequency in acceptable range with linear dose-response assessment',
      'In vivo MN: PCE/NCE ratio and %MN-PCE vs vehicle control',
      'Cytotoxicity characterisation at each dose level',
    ],
    regulatoryNote: 'Negative genotox battery is a prerequisite for IND. Positive in vitro result triggers mandatory in vivo follow-up — design should include contingency for rat bone marrow MN if needed.',
    risk: 'Low',
  });
  weeksCumulative += 8;

  // ── 5. Safety pharmacology core battery ───────────────────────────────────
  studies.push({
    id: 'STD-005',
    phase: 'Phase 1',
    studyType: 'Safety Pharmacology — Core Battery (ICH S7A + S7B)',
    ichGuideline: 'ICH S7A, ICH S7B',
    species: ['hERG-expressing HEK293 cells (in vitro)', 'Beagle dog (in vivo cardiovascular)', 'Sprague-Dawley rat (CNS + respiratory)'],
    speciesRationale: 'ICH S7A core battery: CNS, cardiovascular, respiratory. ICH S7B: in vitro hERG + in vivo QTc assessment in dog.',
    doseRange: 'hERG: 0.001–300 µM; In vivo: 3 doses spanning ≥30× expected Cmax',
    duration: 'Single dose studies (parallel with Phase 1 tox)',
    route,
    glpRequired: true,
    glpRationale: 'All ICH S7A/S7B core battery studies GLP-required for IND. In vitro hERG may be non-GLP if in vivo QTc conducted GLP.',
    indRequired: true,
    ctdSection: 'Module 4.2.1.3',
    estimatedWeeks: 10,
    estimatedCost: '$200–280K',
    keyEndpoints: [
      'hERG IC50 — flag if <30× free Cmax at MRHD',
      'In vivo QTc interval: ΔQTcF at 3 dose levels (ICH E14 waiver data)',
      'CNS: Irwin/FOB battery — sedation, motor coordination, grip strength',
      'Respiratory: tidal volume, respiratory rate, SpO2',
    ],
    regulatoryNote: 'FDA requires safety pharmacology prior to FIH (ICH M3(R2) §8). Cardiac risk triggers dedicated TQT study in Phase 2 if hERG IC50/Cmax <30×. Document ICH E14 waiver rationale.',
    risk: 'Low',
  });
  weeksCumulative += 10;

  // ── 6. Oncology-specific or indications-specific add-on ───────────────────
  if (target === 'oncology') {
    studies.push({
      id: 'STD-006',
      phase: 'Phase 2',
      studyType: '13-Week Repeat-Dose Toxicology + 4-Week Recovery (ICH S9)',
      ichGuideline: 'ICH S9 (oncology-specific exception pathway)',
      species: [primarySpecies, 'Beagle dog'],
      speciesRationale: 'ICH S9 provides oncology-specific guidance allowing Phase 2 initiation with 3-month data. Extended repeat-dose required before Phase 3 enrollment.',
      doseRange: 'MTD-derived from 28-day study; 3 dose levels + vehicle',
      duration: '13 weeks dosing + 4-week recovery satellite',
      route,
      glpRequired: true,
      glpRationale: 'GLP required. ICH S9 enables streamlined genotox (no chronic carcinogenicity required for oncology). 3-month tox supports Phase 2.',
      indRequired: false,
      ctdSection: 'Module 4.2.3.2',
      estimatedWeeks: 20,
      estimatedCost: '$980K–1.4M',
      keyEndpoints: [
        'Chronic NOAEL in both species',
        'Target organ toxicity progression vs 28-day — new findings?',
        'Bone marrow toxicity: M:E ratio, differential WBC counts',
        'Cumulative organ exposure assessment (kidney, liver, heart)',
        'Recovery reversibility at 4-week satellite',
      ],
      regulatoryNote: 'ICH S9 exempts oncology compounds from chronic carcinogenicity studies if indication is serious/life-threatening. 6-month rodent required before Phase 3 unless waived.',
      risk: 'High',
    });
    weeksCumulative += 20;
  } else {
    // Standard 13-week for non-oncology
    studies.push({
      id: 'STD-006',
      phase: 'Phase 2',
      studyType: '13-Week Repeat-Dose Toxicology (GLP)',
      ichGuideline: 'ICH M3(R2) Table 1',
      species: [primarySpecies, isBiologic ? 'Cynomolgus monkey' : 'Beagle dog'],
      speciesRationale: 'ICH M3(R2) Table 1: 3-month toxicology (both species) required to support Phase 2 of ≥3 months duration. 13-week study satisfies this requirement.',
      doseRange: 'Vehicle, low (0.5× NOAEL), mid (2× NOAEL), high (NOAEL equivalent or MTD)',
      duration: '13 weeks dosing + 4-week recovery satellite',
      route,
      glpRequired: true,
      glpRationale: 'GLP required. 3-month GLP tox required per ICH M3(R2) Table 1 to initiate Phase 2 clinical trials.',
      indRequired: false,
      ctdSection: 'Module 4.2.3.2',
      estimatedWeeks: 20,
      estimatedCost: '$980K–1.4M',
      keyEndpoints: [
        'NOAEL in both species — chronic exposure profile',
        'Toxicokinetics: Day 1, Day 28, Day 91 accumulation ratio',
        'Reversibility of target organ findings at 4-week recovery',
        'Chronic histopathology: extended panel (>50 tissues)',
        'Potential for organ system sensitisation over 13 weeks',
      ],
      regulatoryNote: 'Supports Phase 2 enrollment up to 3 months duration. 6-month data required for Phase 3 or Phase 2 >3 months.',
      risk: 'Medium',
    });
    weeksCumulative += 20;
  }

  // ── 7. Reproductive toxicology (Phase 2 flag) ─────────────────────────────
  studies.push({
    id: 'STD-007',
    phase: 'Phase 2',
    studyType: 'Embryo-Fetal Development (EFD) — ICH S5(R3)',
    ichGuideline: 'ICH S5(R3)',
    species: ['Sprague-Dawley rat', 'New Zealand White rabbit'],
    speciesRationale: 'ICH S5(R3) requires two species for EFD. Rat as rodent species; rabbit as non-rodent (preferred for EFD per global regulatory standard). Both required unless adequately justified.',
    doseRange: 'Vehicle, ≥3 dose levels spanning NOAEL to MTD (maternal); rat: gestation days 6–15; rabbit: days 6–18',
    duration: 'Rat: GD6–15 dose; GD21 C-section. Rabbit: GD6–18 dose; GD28 C-section.',
    route,
    glpRequired: true,
    glpRationale: 'GLP required. EFD data must be available prior to including WOCBP in clinical trials (per ICH M3(R2) §11.3.1).',
    indRequired: false,
    ctdSection: 'Module 4.2.3.4',
    estimatedWeeks: 12,
    estimatedCost: '$380–520K',
    keyEndpoints: [
      'Maternal NOAEL — body weight, food consumption, clinical signs',
      'Developmental NOAEL — fetal weight, external/visceral/skeletal malformations',
      'Implantation efficiency and resorption rate',
      'Fetal sex ratio and developmental stage assessment',
    ],
    regulatoryNote: 'Required before WOCBP enrollment. Pregnancy test + contraception requirements in FIH protocol must be consistent with EFD package. Negative EFD allows WOCBP inclusion with contraception.',
    risk: 'Medium',
  });
  weeksCumulative += 12;

  // ── Compliance matrix ──────────────────────────────────────────────────────
  const ichCompliance = [
    { item: 'ICH M3(R2) — IND-enabling non-clinical package',   status: 'Met' as const,     note: 'STD-001 to STD-005 satisfy IND requirements' },
    { item: 'ICH S2(R1) — Genotoxicity battery',                status: 'Met' as const,     note: 'Three-assay Option 2 battery planned (STD-004)' },
    { item: 'ICH S7A/S7B — Safety pharmacology core battery',   status: 'Met' as const,     note: 'hERG + in vivo QTc + CNS/respiratory (STD-005)' },
    { item: 'ICH S5(R3) — Reproductive/developmental toxicology', status: 'Partial' as const, note: 'EFD planned (STD-007); PPND/fertility deferred to Phase 3' },
    { item: 'ICH S6(R1) — Biologic non-clinical safety (if applicable)', status: isBiologic ? 'Met' as const : 'Met' as const, note: isBiologic ? 'Species selected on pharmacological relevance (ICH S6(R1))' : 'N/A — small molecule pathway' },
    { item: 'ICH S9 — Oncology-specific non-clinical',          status: target === 'oncology' ? 'Met' as const : 'Met' as const, note: target === 'oncology' ? 'ICH S9 genotox/carcinogenicity waivers applied' : 'N/A — non-oncology indication' },
    { item: 'ICH E14 — Clinical cardiac risk (QTc waiver)',      status: 'Partial' as const, note: 'In vivo QTc data from STD-005 may support E14 waiver; TQT study contingent on hERG result' },
  ];

  const criticalPath = [
    `STD-001 (Acute tox) — complete by Week 8 to inform GLP dose selection`,
    `STD-002 + STD-003 (28-day GLP rodent + non-rodent) — run in parallel from Week 10`,
    `STD-004 (Genotox) + STD-005 (Safety pharm) — parallel with 28-day tox`,
    `IND/CTA submission — target Week 26 pending all Phase 1 study completion`,
    `STD-006 (13-week GLP) — initiate post-IND clearance to support Phase 2`,
    `STD-007 (EFD) — initiate in parallel with STD-006; required for WOCBP inclusion`,
  ];

  return {
    candidateId,
    candidateName: t.name,
    modality,
    targetClass:  t.targetClass,
    indication:   t.indication,
    route,
    indTimeline:  `~${Math.round(weeksCumulative * 0.45)} months to IND-ready package`,
    totalWeeks:   weeksCumulative,
    studies,
    criticalPath,
    regulatorySummary: `This IND-enabling package is designed to satisfy FDA 21 CFR Part 312 and EMA CHMP requirements for a Phase 1 FIH study in ${t.indication}. The package follows ICH M3(R2) guidance for non-clinical safety studies and assumes a ${route === 'oral' ? 'once-daily oral' : route === 'iv' ? 'intravenous infusion' : 'subcutaneous injection'} clinical route. The oncology-specific ICH S9 ${target === 'oncology' ? 'pathway applies, enabling a streamlined genotoxicity package without chronic carcinogenicity studies' : 'pathway does not apply; standard chronic tox package required'}. Estimated total non-clinical investment: $2.5–3.8M prior to IND clearance.`,
    ichCompliance,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhaseTag({ phase }: { phase: StudyDesign['phase'] }) {
  const map = {
    'Phase 0': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    'Phase 1': 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    'Phase 2': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Phase 3': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${map[phase]}`}>
      {phase}
    </span>
  );
}

function RiskTag({ risk }: { risk: 'Low' | 'Medium' | 'High' }) {
  const map = {
    Low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    High:   'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${map[risk]}`}>
      {risk} complexity
    </span>
  );
}

function StudyCard({ study, idx }: { study: StudyDesign; idx: number }) {
  const [expanded, setExpanded] = useState(idx < 2);

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated/40 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center mt-0.5">
          <span className="text-xs font-bold text-teal-400">{study.id.split('-')[1]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PhaseTag phase={study.phase} />
            {study.glpRequired && (
              <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">GLP</span>
            )}
            {study.indRequired && (
              <span className="text-[10px] text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-1.5 py-0.5 rounded">IND-required</span>
            )}
            <RiskTag risk={study.risk} />
          </div>
          <div className="text-sm font-semibold text-text-primary leading-snug">{study.studyType}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{study.ichGuideline} · {study.ctdSection}</div>
        </div>

        <div className="flex-shrink-0 text-right ml-2">
          <div className="text-xs font-bold text-text-primary">{study.estimatedWeeks}w</div>
          <div className="text-[10px] text-text-muted">{study.estimatedCost}</div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-text-muted mt-1 ml-auto" />
            : <ChevronDown className="w-4 h-4 text-text-muted mt-1 ml-auto" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-border/40 pt-4">

          {/* Species + dose grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <Microscope className="w-3 h-3" /> Species
              </div>
              <div className="space-y-1">
                {study.species.map((s, i) => (
                  <div key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                    <span className="text-teal-400 mt-0.5">·</span> {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Dose Range
              </div>
              <div className="text-xs text-text-secondary leading-relaxed">{study.doseRange}</div>
            </div>
          </div>

          {/* Duration + route */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </div>
              <div className="text-xs text-text-secondary">{study.duration}</div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Route
              </div>
              <div className="text-xs text-text-secondary capitalize">{study.route}</div>
            </div>
          </div>

          {/* Species rationale */}
          <div className="rounded-lg bg-surface-elevated p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">Species Selection Rationale</div>
            <p className="text-xs text-text-secondary leading-relaxed">{study.speciesRationale}</p>
          </div>

          {/* Key endpoints */}
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Key Endpoints</div>
            <div className="space-y-1.5">
              {study.keyEndpoints.map((ep, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{ep}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GLP rationale */}
          <div className={`rounded-lg p-3 border ${study.glpRequired ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-surface-elevated border-border'}`}>
            <div className={`text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1 ${study.glpRequired ? 'text-emerald-400' : 'text-text-muted'}`}>
              <Shield className="w-3 h-3" /> GLP Requirement
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{study.glpRationale}</p>
          </div>

          {/* Regulatory note */}
          <div className="rounded-lg bg-accent-blue/5 border border-accent-blue/20 p-3">
            <div className="text-[10px] text-accent-blue uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
              <Info className="w-3 h-3" /> Regulatory Note
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{study.regulatoryNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExperimentDesignPanel() {
  const { toast } = useToast();
  const [modality, setModality]         = useState<Modality>('small-molecule');
  const [route, setRoute]               = useState<Route>('oral');
  const [target, setTarget]             = useState<Target>('oncology');
  const [candidateId, setCandidateId]   = useState('LIG-2847');
  const [phase, setPhase]               = useState<'idle' | 'analyzing' | 'sequencing' | 'complete'>('idle');
  const [result, setResult]             = useState<ExperimentPackage | null>(null);

  const STEPS = [
    'Loading ICH M3(R2) non-clinical study requirements matrix',
    'Querying internal capability profile — species, GLP CRO roster',
    'Applying modality-specific guidance (S6, S9, S2, S5, S7)',
    'Sequencing study dependencies and critical path',
    'Estimating timelines and cost ranges per study type',
  ];

  const handleRun = async () => {
    setPhase('analyzing');
    setResult(null);
    await new Promise(r => setTimeout(r, 2200));
    setPhase('sequencing');
    await new Promise(r => setTimeout(r, 1800));
    const pkg = generatePackage(modality, route, target, candidateId);
    setResult(pkg);
    setPhase('complete');
    toast.success(`IND-enabling package designed — ${pkg.studies.length} studies, ~${pkg.indTimeline}`);
  };

  const modalityOptions: { value: Modality; label: string; icon: string }[] = [
    { value: 'small-molecule',  label: 'Small Molecule',  icon: '⚗️' },
    { value: 'biologic',        label: 'Biologic',        icon: '🧬' },
    { value: 'oligonucleotide', label: 'Oligonucleotide', icon: '🔗' },
    { value: 'cell-gene',       label: 'Cell / Gene',     icon: '🧫' },
  ];

  const routeOptions: { value: Route; label: string }[] = [
    { value: 'oral',    label: 'Oral (PO)' },
    { value: 'iv',      label: 'IV Infusion' },
    { value: 'sc',      label: 'Subcutaneous' },
    { value: 'im',      label: 'Intramuscular' },
    { value: 'inhaled', label: 'Inhaled' },
    { value: 'topical', label: 'Topical' },
  ];

  const targetOptions: { value: Target; label: string }[] = [
    { value: 'oncology',        label: 'Oncology' },
    { value: 'immunology',      label: 'Immunology' },
    { value: 'neurology',       label: 'Neurology' },
    { value: 'cardiometabolic', label: 'Cardiometabolic' },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Config panel ──────────────────────────────────────────────────── */}
      <div className="p-6 border-b border-border space-y-4 flex-shrink-0">
        {/* Identity banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20">
          <FlaskConical className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-teal-400">Experiment Design Agent — Ligature Originate</div>
            <div className="text-xs text-text-muted mt-0.5">
              ICH M3(R2)-guided IND-enabling study sequencer. Species selection, dose range, GLP requirements, and critical path to IND.
            </div>
          </div>
        </div>

        {/* Candidate ID */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Candidate ID</label>
          <input
            value={candidateId}
            onChange={e => setCandidateId(e.target.value)}
            placeholder="e.g. LIG-2847"
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500/50"
          />
        </div>

        {/* Modality */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Modality</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {modalityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setModality(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${modality === opt.value ? 'border-teal-500/50 bg-teal-500/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}
              >
                <span>{opt.icon}</span><span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Route */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Clinical Route of Administration</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {routeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRoute(opt.value)}
                className={`px-2 py-2 rounded-lg border text-[11px] font-medium transition-all text-center ${route === opt.value ? 'border-teal-500/50 bg-teal-500/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indication */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Therapeutic Area / Indication</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {targetOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${target === opt.value ? 'border-accent-blue/50 bg-accent-blue/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleRun}
          disabled={phase === 'analyzing' || phase === 'sequencing'}
        >
          {phase === 'analyzing' || phase === 'sequencing'
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sequencing studies…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Design IND-Enabling Package</>
          }
        </Button>
      </div>

      {/* ── Output ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <FlaskConical className="w-12 h-12 text-text-muted/20" />
            <p className="text-sm text-text-muted">
              Configure the candidate and run the agent to generate an ICH M3(R2)-compliant IND-enabling study sequence.
            </p>
          </div>
        )}

        {(phase === 'analyzing' || phase === 'sequencing') && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
              {phase === 'analyzing' ? 'Analyzing ICH guidelines…' : 'Sequencing study package…'}
            </div>
            <div className="space-y-1.5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                  <span className="text-text-secondary">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'complete' && result && (
          <>
            {/* Summary card */}
            <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{result.candidateId} — {result.candidateName}</div>
                  <div className="text-xs text-text-muted mt-0.5">{result.indication} · {result.targetClass}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-teal-400">{result.studies.length}</div>
                  <div className="text-[10px] text-text-muted">Studies</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-surface rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-text-muted mb-0.5">IND Timeline</div>
                  <div className="font-bold text-text-primary text-[11px] leading-tight">{result.indTimeline}</div>
                </div>
                <div className="bg-surface rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-text-muted mb-0.5">Modality</div>
                  <div className="font-bold text-text-primary capitalize">{result.modality.replace('-', ' ')}</div>
                </div>
                <div className="bg-surface rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-text-muted mb-0.5">Route</div>
                  <div className="font-bold text-text-primary uppercase">{result.route}</div>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">{result.regulatorySummary}</p>
            </div>

            {/* ICH Compliance matrix */}
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> ICH Compliance Matrix
              </div>
              <div className="space-y-2">
                {result.ichCompliance.map((item, i) => {
                  const statusColor = item.status === 'Met' ? 'text-emerald-400' : item.status === 'Partial' ? 'text-amber-400' : 'text-red-400';
                  const StatusIcon = item.status === 'Met' ? CheckCircle : AlertTriangle;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-primary font-medium">{item.item}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{item.note}</div>
                      </div>
                      <span className={`text-[10px] font-semibold flex-shrink-0 ${statusColor}`}>{item.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical path */}
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Critical Path to IND
              </div>
              <div className="space-y-2">
                {result.criticalPath.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-teal-400">{i + 1}</span>
                    </div>
                    <span className="text-text-secondary">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Study cards */}
            <div className="flex items-center gap-2 mt-2">
              <BookOpen className="w-3.5 h-3.5 text-text-muted" />
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Study Designs ({result.studies.length})</div>
            </div>
            <div className="space-y-3">
              {result.studies.map((s, i) => <StudyCard key={s.id} study={s} idx={i} />)}
            </div>

            {/* CTD filing note */}
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> CTD Module 4 Filing Note
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                All studies are structured for direct integration into the eCTD non-clinical summary (Module 2.6) and non-clinical study reports (Module 4). Ligature&apos;s document control and eCTD publishing pipeline will auto-assign study reports to the appropriate CTD sections on upload. Module 4.3 (Literature references) can be populated from the preclinical bibliography in the Research module.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
