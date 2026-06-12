// Research & Discovery Module Data
// Literature alerts, target programs, preclinical studies, competitor intelligence

export type LiteratureType = 'publication' | 'patent' | 'conference' | 'regulatory' | 'news';
export type Relevance = 'high' | 'medium' | 'low';
export type TargetStage = 'discovery' | 'lead-opt' | 'preclinical' | 'ind-enabling' | 'clinical';
export type StudyType = 'toxicology' | 'pharmacology' | 'pk' | 'safety-pharm' | 'carcinogenicity' | 'repro-tox';
export type StudyStatus = 'planned' | 'ongoing' | 'completed' | 'report-draft' | 'final';
export type ThreatLevel = 'high' | 'medium' | 'low';

export interface LiteratureAlert {
  id: string;
  title: string;
  source: string;
  journal?: string;
  date: string;
  type: LiteratureType;
  relevance: Relevance;
  product?: string;
  productId?: string;
  competitor?: string;
  summary: string;
  url?: string;
  tags: string[];
}

export interface TargetProgram {
  id: string;
  target: string;
  targetClass: string;
  indication: string;
  modality: string;
  stage: TargetStage;
  confidence: number;
  product?: string;
  productId?: string;
  startDate: string;
  nextMilestone: string;
  nextMilestoneDate: string;
  team: string;
  rationale: string;
}

export interface PreclinicalStudy {
  id: string;
  studyNumber: string;
  title: string;
  type: StudyType;
  species: string;
  product: string;
  productId: string;
  cro: string;
  status: StudyStatus;
  startDate: string;
  endDate?: string;
  duration: string;
  glpCompliant: boolean;
  findings?: string;
  regulatoryPurpose: string;
  // Rich structured data (v0.125.67)
  studyDirector?: string;
  reportNumber?: string;
  route?: string;
  doseLevels?: string[];
  noael?: string;
  loael?: string;
  mtd?: string;
  noaelBasis?: string;
  keyFindings?: string;
  ichCitations?: string[];
  ectdSection?: string;
  ichM3Section?: string;
  glpStatement?: string;
  doseResponseData?: { dose: number; effect: number; toxicity: number }[];
  inVitroData?: { assay: string; endpoint: string; result: string; unit: string }[];
  inVivoData?: { model: string; endpoint: string; result: string; significance: string }[];
  signatureHash?: string;
  signatureDate?: string;
  qaDate?: string;
  documentLinks?: { label: string; ectdPath: string; type: 'report' | 'protocol' | 'raw-data' }[];
}

export interface CompetitorProgram {
  id: string;
  company: string;
  drug: string;
  target: string;
  indication: string;
  stage: string;
  latestNews: string;
  newsDate: string;
  threat: ThreatLevel;
}

// ============================================================================
// LITERATURE ALERTS
// ============================================================================

export const literatureAlerts: LiteratureAlert[] = [
  { id: 'lit-1', title: 'Phase 3 results for adagrasib in KRAS G12C NSCLC show durable responses', source: 'NEJM', journal: 'New England Journal of Medicine', date: '2024-12-10', type: 'publication', relevance: 'high', competitor: 'Mirati', summary: 'KRYSTAL-1 trial shows 43% ORR with median DOR of 8.5 months. Hepatotoxicity reported in 8% of patients.', tags: ['KRAS G12C', 'adagrasib', 'NSCLC', 'Phase 3'] },
  { id: 'lit-2', title: 'FDA issues guidance on hepatotoxicity monitoring for kinase inhibitors', source: 'FDA', date: '2024-12-08', type: 'regulatory', relevance: 'high', summary: 'New guidance recommends baseline and periodic LFT monitoring for all kinase inhibitors. Suggests minimum monitoring frequency of every 2 weeks for first 3 months.', tags: ['hepatotoxicity', 'FDA guidance', 'kinase inhibitors'] },
  { id: 'lit-3', title: 'Novel KRAS G12D inhibitor enters Phase 1 trials', source: 'ClinicalTrials.gov', date: '2024-12-05', type: 'news', relevance: 'medium', competitor: 'Revolution Medicines', summary: 'RMC-9805 begins first-in-human study for KRAS G12D mutant solid tumors. Expands competitive landscape beyond G12C.', tags: ['KRAS G12D', 'Phase 1', 'competitive'] },
  { id: 'lit-4', title: 'Combination strategies with KRAS inhibitors: A review', source: 'Nature Reviews Drug Discovery', journal: 'Nat Rev Drug Discov', date: '2024-12-01', type: 'publication', relevance: 'medium', summary: 'Comprehensive review of combination approaches including PD-1, MEK, and SHP2 inhibitors. Highlights potential synergies and toxicity concerns.', tags: ['combination therapy', 'review', 'KRAS'] },
  { id: 'lit-5', title: 'Amgen reports updated sotorasib data at ESMO', source: 'ESMO 2024', date: '2024-11-28', type: 'conference', relevance: 'high', competitor: 'Amgen', summary: 'CodeBreaK 200 trial shows comparable PFS to docetaxel. Hepatotoxicity management guidelines presented.', tags: ['sotorasib', 'ESMO', 'Phase 3'] },
  { id: 'lit-6', title: 'Patent granted for novel KRAS degrader technology', source: 'USPTO', date: '2024-11-20', type: 'patent', relevance: 'low', competitor: 'Nurix', summary: 'Patent covers PROTAC-based degradation of mutant KRAS proteins. Potential new modality entering space.', tags: ['patent', 'PROTAC', 'degrader'] },
  { id: 'lit-7', title: 'EMA updates guidance on ADC development', source: 'EMA', date: '2024-11-15', type: 'regulatory', relevance: 'medium', summary: 'New reflection paper on antibody-drug conjugates addresses linker stability, payload considerations, and bioanalytical requirements.', tags: ['ADC', 'EMA guidance', 'regulatory'] },
  { id: 'lit-8', title: 'HER2-targeted therapies in breast cancer: 2024 update', source: 'Journal of Clinical Oncology', journal: 'JCO', date: '2024-11-10', type: 'publication', relevance: 'high', summary: 'Comprehensive review of HER2-targeted therapy landscape including T-DXd, T-DM1, and emerging agents. Discusses sequencing strategies.', tags: ['HER2', 'breast cancer', 'review'] },
];

// ============================================================================
// TARGET PROGRAMS
// ============================================================================

export const targetPrograms: TargetProgram[] = [
  { id: 'tgt-1', target: 'KRAS G12C', targetClass: 'Oncogene', indication: 'NSCLC', modality: 'Small Molecule', stage: 'clinical', confidence: 95, product: 'LIG-2847', productId: 'lig-2847', startDate: '2021-03-01', nextMilestone: 'NDA Approval', nextMilestoneDate: '2025-Q2', team: 'Oncology Unit 1', rationale: 'Validated target with approved competitors. Differentiated safety profile.' },
  { id: 'tgt-2', target: 'HER2', targetClass: 'RTK', indication: 'Breast Cancer', modality: 'ADC', stage: 'clinical', confidence: 88, product: 'LIG-1182', productId: 'lig-1182', startDate: '2020-06-15', nextMilestone: 'BLA Submission', nextMilestoneDate: '2025-Q1', team: 'Oncology Unit 2', rationale: 'Novel payload with improved therapeutic index vs. T-DXd.' },
  { id: 'tgt-3', target: 'KRAS G12D', targetClass: 'Oncogene', indication: 'Pancreatic Cancer', modality: 'Small Molecule', stage: 'lead-opt', confidence: 65, product: 'LIG-4055', productId: 'lig-4055', startDate: '2024-01-15', nextMilestone: 'IND-enabling studies', nextMilestoneDate: '2025-Q3', team: 'Discovery', rationale: 'G12D is most common KRAS mutation. No approved therapies yet.' },
  { id: 'tgt-4', target: 'CD47', targetClass: 'Immune Checkpoint', indication: 'AML', modality: 'Antibody', stage: 'preclinical', confidence: 55, startDate: '2023-09-01', nextMilestone: 'Candidate Selection', nextMilestoneDate: '2025-Q2', team: 'Immuno-Oncology', rationale: "Don't eat me signal. Synergy potential with existing therapies." },
  { id: 'tgt-5', target: 'TIGIT', targetClass: 'Immune Checkpoint', indication: 'Solid Tumors', modality: 'Antibody', stage: 'discovery', confidence: 40, startDate: '2024-06-01', nextMilestone: 'Lead Identification', nextMilestoneDate: '2025-Q1', team: 'Immuno-Oncology', rationale: 'Next-gen checkpoint. Roche/Merck programs inform strategy.' },
  { id: 'tgt-6', target: 'JAK1', targetClass: 'Kinase', indication: 'Rheumatoid Arthritis', modality: 'Small Molecule', stage: 'clinical', confidence: 92, product: 'LIG-3021', productId: 'lig-3021', startDate: '2019-01-01', nextMilestone: 'sNDA Approval', nextMilestoneDate: '2025-Q2', team: 'Immunology', rationale: 'Selective JAK1 inhibitor with improved GI tolerability.' },
];

// ============================================================================
// PRECLINICAL STUDIES
// ============================================================================

export const preclinicalStudies: PreclinicalStudy[] = [
  {
    id: 'nc-1', studyNumber: 'TOX-2847-001', title: '4-Week Repeat-Dose Toxicity Study in Rats (GLP)',
    type: 'toxicology', species: 'Rat (Sprague-Dawley)', product: 'LIG-2847', productId: 'lig-2847',
    cro: 'Covance Laboratories Inc.', status: 'final',
    startDate: '2023-03-15', endDate: '2023-06-20', duration: 'Oral gavage · 4 weeks + 2-week recovery',
    route: 'Oral gavage', glpCompliant: true,
    findings: 'Hepatocellular hypertrophy at ≥100 mg/kg/day (LOAEL). Partially reversible. ALT/AST 3× ULN at ≥100 mg/kg/day. No deaths. No cardiovascular findings.',
    keyFindings: 'Hepatocellular hypertrophy (centrilobular) at ≥100 mg/kg/day, partially reversible. ALT/AST up to 3× ULN. BW suppression −12% at 300 mg/kg/day. No deaths. No cardiovascular findings.',
    regulatoryPurpose: 'IND-enabling',
    studyDirector: 'Dr. Sarah Mitchell',
    reportNumber: 'STR-LIG2847-TOX-002 v1.0 FINAL',
    ectdSection: 'Module 4.2.3.2 — Repeat-Dose Toxicity',
    ichM3Section: 'ICH M3(R2) §11.3.4.1',
    doseLevels: ['0 (vehicle)', '30 mg/kg/day', '100 mg/kg/day', '300 mg/kg/day'],
    noael: '30 mg/kg/day',
    loael: '100 mg/kg/day',
    mtd: '300 mg/kg/day',
    noaelBasis: 'No adverse clinical signs, body weight changes, or histopathological findings at 30 mg/kg/day.',
    ichCitations: ['ICH M3(R2) §11.3.4.1', 'ICH S4', 'OECD TG 407', '21 CFR Part 58'],
    glpStatement: 'Conducted in compliance with OECD GLP Principles (ENV/MC/CHEM(98)17) and 21 CFR Part 58. QA inspections performed on 3 occasions.',
    doseResponseData: [
      { dose: 0,   effect: 0,  toxicity: 0  },
      { dose: 30,  effect: 45, toxicity: 3  },
      { dose: 100, effect: 78, toxicity: 28 },
      { dose: 300, effect: 94, toxicity: 62 },
    ],
    inVitroData: [
      { assay: 'hERG patch clamp', endpoint: 'IC₅₀', result: '> 100', unit: 'μM' },
      { assay: 'CYP3A4 inhibition', endpoint: 'IC₅₀', result: '18.4', unit: 'μM' },
      { assay: 'Hepatocyte cytotoxicity (rat)', endpoint: 'LC₅₀', result: '> 200', unit: 'μM' },
    ],
    inVivoData: [
      { model: 'Rat SD — hepatic histopath', endpoint: 'Centrilobular hypertrophy incidence', result: '0/10 @ NOAEL; 8/10 @ LOAEL', significance: 'p < 0.01 vs vehicle at LOAEL' },
      { model: 'Rat SD — clinical pathology', endpoint: 'ALT (U/L)', result: '42 → 128 at LOAEL', significance: '3× ULN, reversible at recovery' },
    ],
    signatureHash: 'sha256:c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    signatureDate: '2023-07-10',
    qaDate: '2023-07-18',
    documentLinks: [
      { label: 'Final Study Report', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-002-FINAL.pdf', type: 'report' },
      { label: 'Study Protocol', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-002-PROTOCOL.pdf', type: 'protocol' },
      { label: 'Raw Data Package', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-002-RAW.zip', type: 'raw-data' },
    ],
  },
  {
    id: 'nc-2', studyNumber: 'TOX-2847-002', title: '13-Week Repeat-Dose Toxicity in Beagle Dogs (GLP)',
    type: 'toxicology', species: 'Dog (Beagle)', product: 'LIG-2847', productId: 'lig-2847',
    cro: 'Charles River Laboratories', status: 'final',
    startDate: '2023-04-01', endDate: '2023-08-15', duration: 'Oral capsule · 13 weeks + 4-week recovery',
    route: 'Oral capsule', glpCompliant: true,
    findings: 'QTc prolongation at ≥30 mg/kg/day (ΔQTc +28 ms at 30; +52 ms at 90 mg/kg/day). Partially reversible. hERG IC₅₀ = 8.4 μM in vitro.',
    keyFindings: 'QTc prolongation at ≥30 mg/kg/day (ΔQTc +28 ms at 30; +52 ms at 90 mg/kg/day supratherapeutic). Partially reversible. Hepatocellular hypertrophy at 90 mg/kg/day. hERG IC50 = 8.4 μM. No arrhythmia observed.',
    regulatoryPurpose: 'IND-enabling',
    studyDirector: 'Dr. Oliver Bennett',
    reportNumber: 'STR-LIG2847-TOX-003 v1.0 FINAL',
    ectdSection: 'Module 4.2.3.2 — Repeat-Dose Toxicity (Non-Rodent)',
    ichM3Section: 'ICH M3(R2) §11.3.4.2',
    doseLevels: ['0 (vehicle)', '10 mg/kg/day', '30 mg/kg/day', '90 mg/kg/day'],
    noael: '10 mg/kg/day',
    loael: '30 mg/kg/day',
    mtd: '90 mg/kg/day',
    noaelBasis: 'No adverse findings at 10 mg/kg/day. QTc prolongation first observed at 30 mg/kg/day.',
    ichCitations: ['ICH M3(R2) §11.3.4.2', 'ICH S7B', 'ICH E14', 'OECD TG 409', '21 CFR Part 58'],
    glpStatement: 'Conducted in compliance with OECD GLP Principles and 21 CFR Part 58. Telemetry and Holter monitoring per ICH S7B.',
    doseResponseData: [
      { dose: 0,  effect: 0,  toxicity: 0  },
      { dose: 10, effect: 38, toxicity: 4  },
      { dose: 30, effect: 65, toxicity: 32 },
      { dose: 90, effect: 88, toxicity: 72 },
    ],
    inVitroData: [
      { assay: 'hERG patch clamp (manual)', endpoint: 'IC₅₀', result: '8.4', unit: 'μM' },
      { assay: 'Nav1.5 patch clamp', endpoint: 'IC₅₀', result: '> 100', unit: 'μM' },
      { assay: 'Cav1.2 patch clamp', endpoint: 'IC₅₀', result: '> 100', unit: 'μM' },
    ],
    inVivoData: [
      { model: 'Dog Beagle — telemetry', endpoint: 'ΔQTc (ms) at 30 mg/kg/day', result: '+28 ms', significance: 'Clinically relevant threshold: +20 ms' },
      { model: 'Dog Beagle — telemetry', endpoint: 'ΔQTc (ms) at 90 mg/kg/day', result: '+52 ms', significance: 'Supratherapeutic; no arrhythmia observed' },
      { model: 'Dog Beagle — histopath', endpoint: 'Hepatocellular hypertrophy', result: '0/4 @ NOAEL; 4/4 @ 90 mg/kg/day', significance: 'p < 0.05 vs vehicle' },
    ],
    signatureHash: 'sha256:d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
    signatureDate: '2023-09-05',
    qaDate: '2023-09-12',
    documentLinks: [
      { label: 'Final Study Report', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-003-FINAL.pdf', type: 'report' },
      { label: 'Telemetry Data — QTc Analysis', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-003-QTC.pdf', type: 'raw-data' },
      { label: 'Histopathology Report', ectdPath: 'm4/42-stud-rep/423-tox/4232-rep-dose-tox/TOX-2847-003-HISTO.pdf', type: 'raw-data' },
    ],
  },
  { id: 'nc-3', studyNumber: 'TOX-2847-003', title: '26-Week Chronic Toxicity in Rats', type: 'toxicology', species: 'Rat (Sprague-Dawley)', product: 'LIG-2847', productId: 'lig-2847', cro: 'Covance Labs', status: 'final', startDate: '2023-06-01', endDate: '2024-01-15', duration: '26 weeks + recovery', glpCompliant: true, findings: 'Consistent with 4-week study', regulatoryPurpose: 'NDA-enabling' },
  { id: 'nc-4', studyNumber: 'CARC-2847-001', title: '2-Year Carcinogenicity Study in Rats', type: 'carcinogenicity', species: 'Rat (Sprague-Dawley)', product: 'LIG-2847', productId: 'lig-2847', cro: 'Charles River', status: 'ongoing', startDate: '2024-01-15', duration: '104 weeks', glpCompliant: true, regulatoryPurpose: 'Post-marketing commitment' },
  { id: 'nc-5', studyNumber: 'TOX-1182-001', title: '4-Week Repeat Dose Toxicity in Rats', type: 'toxicology', species: 'Rat (Sprague-Dawley)', product: 'LIG-1182', productId: 'lig-1182', cro: 'Covance Labs', status: 'final', startDate: '2022-08-01', endDate: '2022-11-15', duration: '4 weeks + recovery', glpCompliant: true, findings: 'Target organ: bone marrow (reversible)', regulatoryPurpose: 'IND-enabling' },
  { id: 'nc-6', studyNumber: 'TOX-4055-001', title: 'Dose Range Finding in Rats', type: 'toxicology', species: 'Rat (Sprague-Dawley)', product: 'LIG-4055', productId: 'lig-4055', cro: 'In-house', status: 'ongoing', startDate: '2024-11-01', duration: '2 weeks', glpCompliant: false, regulatoryPurpose: 'Lead optimization' },
  { id: 'nc-7', studyNumber: 'PK-2847-001', title: 'Mass Balance Study in Rats', type: 'pk', species: 'Rat (Sprague-Dawley)', product: 'LIG-2847', productId: 'lig-2847', cro: 'Covance Labs', status: 'final', startDate: '2023-02-01', endDate: '2023-03-15', duration: '6 weeks', glpCompliant: true, regulatoryPurpose: 'IND-enabling' },
  { id: 'nc-8', studyNumber: 'PHARM-2847-001', title: 'In Vivo Efficacy - KRAS G12C Xenograft', type: 'pharmacology', species: 'Mouse (Nude)', product: 'LIG-2847', productId: 'lig-2847', cro: 'In-house', status: 'final', startDate: '2022-06-01', endDate: '2022-08-15', duration: '10 weeks', glpCompliant: false, findings: '85% tumor growth inhibition at MTD', regulatoryPurpose: 'Proof of concept' },
];

// ============================================================================
// COMPETITOR PROGRAMS
// ============================================================================

export const competitorPrograms: CompetitorProgram[] = [
  { id: 'comp-1', company: 'Amgen', drug: 'Sotorasib (Lumakras)', target: 'KRAS G12C', indication: 'NSCLC', stage: 'Approved', latestNews: 'Label updated with hepatotoxicity boxed warning', newsDate: '2024-11-15', threat: 'high' },
  { id: 'comp-2', company: 'Mirati', drug: 'Adagrasib (Krazati)', target: 'KRAS G12C', indication: 'NSCLC', stage: 'Approved', latestNews: 'Phase 3 data published in NEJM', newsDate: '2024-12-10', threat: 'high' },
  { id: 'comp-3', company: 'Roche', drug: 'Divarasib', target: 'KRAS G12C', indication: 'Solid Tumors', stage: 'Phase 3', latestNews: 'Registrational trial ongoing, data expected 2025', newsDate: '2024-10-20', threat: 'high' },
  { id: 'comp-4', company: 'Revolution Medicines', drug: 'RMC-6236', target: 'KRAS Multi', indication: 'Solid Tumors', stage: 'Phase 2', latestNews: 'Pan-KRAS inhibitor shows early activity', newsDate: '2024-11-28', threat: 'medium' },
  { id: 'comp-5', company: 'Eli Lilly', drug: 'LY3537982', target: 'KRAS G12C', indication: 'NSCLC', stage: 'Phase 2', latestNews: 'Combination study with cetuximab initiated', newsDate: '2024-09-15', threat: 'medium' },
  { id: 'comp-6', company: 'BMS', drug: 'Undisclosed', target: 'KRAS G12D', indication: 'Pancreatic', stage: 'Phase 1', latestNews: 'IND cleared for first G12D program', newsDate: '2024-08-01', threat: 'medium' },
  { id: 'comp-7', company: 'Daiichi Sankyo', drug: 'T-DXd (Enhertu)', target: 'HER2', indication: 'Breast Cancer', stage: 'Approved', latestNews: 'Label expanded to HER2-low breast cancer', newsDate: '2024-06-15', threat: 'high' },
  { id: 'comp-8', company: 'AbbVie', drug: 'Upadacitinib', target: 'JAK1', indication: 'RA/AD/UC', stage: 'Approved', latestNews: 'Post-marketing CV safety data released', newsDate: '2024-10-01', threat: 'high' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getStageColor = (stage: TargetStage): string => {
  const colors: Record<TargetStage, string> = {
    discovery: 'bg-slate-500/20 text-slate-400',
    'lead-opt': 'bg-purple-500/20 text-purple-400',
    preclinical: 'bg-blue-500/20 text-blue-400',
    'ind-enabling': 'bg-amber-500/20 text-amber-400',
    clinical: 'bg-green-500/20 text-green-400',
  };
  return colors[stage] || 'bg-slate-500/20 text-slate-400';
};

export const getStudyStatusColor = (status: StudyStatus): string => {
  const colors: Record<StudyStatus, string> = {
    planned: 'bg-slate-500/20 text-slate-400',
    ongoing: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    'report-draft': 'bg-amber-500/20 text-amber-400',
    final: 'bg-green-500/20 text-green-400',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400';
};

export const getRelevanceColor = (relevance: Relevance): string => {
  const colors: Record<Relevance, string> = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-slate-500/20 text-slate-400',
  };
  return colors[relevance];
};

export const getThreatColor = (threat: ThreatLevel): string => {
  const colors: Record<ThreatLevel, string> = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-green-500/20 text-green-400',
  };
  return colors[threat];
};

export const getLiteratureTypeIcon = (type: LiteratureType): string => {
  const icons: Record<LiteratureType, string> = {
    publication: 'BookOpen',
    patent: 'Shield',
    conference: 'Users',
    regulatory: 'FileText',
    news: 'Globe',
  };
  return icons[type];
};

// ============================================================================
// IND READINESS TRACKER
// ============================================================================

export interface INDSection {
  id: string;
  section: string;
  name: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked';
  owner: string;
  dueDate?: string;
  notes?: string;
}

export interface INDReadinessProgram {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  indication: string;
  targetINDDate: string;
  overallReadiness: number;
  sections: INDSection[];
}

export const indReadinessPrograms: INDReadinessProgram[] = [
  {
    id: 'ind-lig-5601',
    productId: 'lig-5601',
    productName: 'LIG-5601',
    brandName: 'Ureaclear',
    indication: 'OTC Deficiency',
    targetINDDate: '2025-06-15',
    overallReadiness: 62,
    sections: [
      { id: 'ind-1', section: '2.4', name: 'Nonclinical Overview', progress: 75, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-03-01' },
      { id: 'ind-2', section: '2.6', name: 'Nonclinical Written Summary', progress: 45, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-03-15' },
      { id: 'ind-3', section: '3.2.S', name: 'Drug Substance', progress: 90, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-02-01' },
      { id: 'ind-4', section: '3.2.P', name: 'Drug Product', progress: 65, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-03-01' },
      { id: 'ind-5', section: '4.2.1', name: 'Pharmacology Studies', progress: 100, status: 'complete', owner: 'Tom Anderson' },
      { id: 'ind-6', section: '4.2.2', name: 'Pharmacokinetic Studies', progress: 85, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-02-15' },
      { id: 'ind-7', section: '4.2.3', name: 'Toxicology Studies', progress: 40, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-04-01', notes: 'GLP tox study ongoing' },
      { id: 'ind-8', section: '5.3.1', name: 'Clinical Protocol', progress: 30, status: 'in-progress', owner: 'David Kim', dueDate: '2025-05-01' },
    ]
  },
  {
    id: 'ind-lig-1340',
    productId: 'lig-1340',
    productName: 'LIG-1340',
    brandName: 'Troparix',
    indication: 'Trop-2+ Solid Tumors',
    targetINDDate: '2025-09-01',
    overallReadiness: 38,
    sections: [
      { id: 'ind-9', section: '2.4', name: 'Nonclinical Overview', progress: 25, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-06-01' },
      { id: 'ind-10', section: '2.6', name: 'Nonclinical Written Summary', progress: 15, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-06-15' },
      { id: 'ind-11', section: '3.2.S', name: 'Drug Substance', progress: 70, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-05-01' },
      { id: 'ind-12', section: '3.2.P', name: 'Drug Product', progress: 55, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-05-15' },
      { id: 'ind-13', section: '4.2.1', name: 'Pharmacology Studies', progress: 80, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-04-01' },
      { id: 'ind-14', section: '4.2.2', name: 'Pharmacokinetic Studies', progress: 35, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-05-01' },
      { id: 'ind-15', section: '4.2.3', name: 'Toxicology Studies', progress: 10, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-07-01', notes: 'DRF study in progress' },
      { id: 'ind-16', section: '5.3.1', name: 'Clinical Protocol', progress: 15, status: 'in-progress', owner: 'David Kim', dueDate: '2025-08-01' },
    ]
  },
  {
    id: 'ind-lig-1205',
    productId: 'lig-1205',
    productName: 'LIG-1205',
    brandName: 'Lymphocel',
    indication: 'CD3xCD20 B-cell Lymphoma',
    targetINDDate: '2025-04-15',
    overallReadiness: 78,
    sections: [
      { id: 'ind-17', section: '2.4', name: 'Nonclinical Overview', progress: 90, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-02-01' },
      { id: 'ind-18', section: '2.6', name: 'Nonclinical Written Summary', progress: 85, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-02-15' },
      { id: 'ind-19', section: '3.2.S', name: 'Drug Substance', progress: 95, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-01-15' },
      { id: 'ind-20', section: '3.2.P', name: 'Drug Product', progress: 80, status: 'in-progress', owner: 'Robert Kim', dueDate: '2025-02-01' },
      { id: 'ind-21', section: '4.2.1', name: 'Pharmacology Studies', progress: 100, status: 'complete', owner: 'Tom Anderson' },
      { id: 'ind-22', section: '4.2.2', name: 'Pharmacokinetic Studies', progress: 100, status: 'complete', owner: 'Tom Anderson' },
      { id: 'ind-23', section: '4.2.3', name: 'Toxicology Studies', progress: 70, status: 'in-progress', owner: 'Tom Anderson', dueDate: '2025-03-01' },
      { id: 'ind-24', section: '5.3.1', name: 'Clinical Protocol', progress: 55, status: 'in-progress', owner: 'David Kim', dueDate: '2025-03-15' },
    ]
  },
];

export const getINDSectionStatusColor = (status: INDSection['status']): string => {
  const colors: Record<INDSection['status'], string> = {
    'not-started': 'bg-slate-500/20 text-slate-400',
    'in-progress': 'bg-blue-500/20 text-blue-400',
    'complete': 'bg-green-500/20 text-green-400',
    'blocked': 'bg-red-500/20 text-red-400',
  };
  return colors[status];
};
