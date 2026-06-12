// Safety & Pharmacovigilance Module Data
// Centralized data for ICSR cases, safety signals, periodic reports

export type ICSRStatus = 'new' | 'processing' | 'submitted' | 'follow-up' | 'closed';
export type CaseSource = 'spontaneous' | 'clinical-trial' | 'literature' | 'health-authority' | 'patient-support' | 'solicited';
export type MedWatchFormType = '3500' | '3500A' | '3500B';
export type E2BVersion = 'R2' | 'R3';
export type SeriousnessCriteria = 'death' | 'life-threatening' | 'hospitalization' | 'disability' | 'congenital-anomaly' | 'other-serious';
export type ReporterType = 'healthcare-professional' | 'consumer' | 'other';
export type CausalityAssessment = 'certain' | 'probable' | 'possible' | 'unlikely' | 'conditional' | 'unassessable' | 'not-assessed';
export type SignalStatus = 'new' | 'under-evaluation' | 'confirmed' | 'refuted' | 'closed';
export type SignalPriority = 'critical' | 'high' | 'medium' | 'low';
export type ReportStatus = 'not-started' | 'in-progress' | 'review' | 'submitted';

export interface ICSR {
  id: string;
  caseNumber: string;
  product: string;
  productId: string;
  event: string;
  seriousness: 'serious' | 'non-serious';
  seriousnessCriteria?: SeriousnessCriteria[];
  outcome: string;
  source: string;
  country: string;
  countryFlag: string;
  receivedDate: string;
  dueDate: string;
  status: ICSRStatus;
  assignee: string;
  age?: number;
  sex?: string;
  dose?: string;
  timeToOnset?: string;
  rechallenge?: string;
  dechallenge?: string;
  concomitant?: string[];
  // Expanded case intake fields
  reporterType?: ReporterType;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  reporterInstitution?: string;
  patientInitials?: string;
  patientWeight?: number;
  patientHeight?: number;
  medicalHistory?: string[];
  narrative?: string;
  causality?: CausalityAssessment;
  listedness?: 'listed' | 'unlisted' | 'unknown';
  meddraPreferred?: string;
  meddraSOC?: string;
  actionTaken?: 'withdrawn' | 'reduced' | 'continued' | 'unknown';
  outcomeDate?: string;
  e2bExported?: boolean;
  medwatchSubmitted?: boolean;
  eudravigilanceSubmitted?: boolean;
}

export interface SafetySignal {
  id: string;
  signal: string;
  product: string;
  productId: string;
  status: SignalStatus;
  priority: SignalPriority;
  detectedDate: string;
  source: string;
  caseCount: number;
  prrValue?: number;
  rorValue?: number;
  ic025?: number;
  description?: string;
  recommendation?: string;
  relatedCases?: string[];
  classEffect?: boolean;
  labeledEvent?: boolean;
}

export interface SimilarSignal {
  drug: string;
  company: string;
  indication: string;
  signalDate: string;
  outcome: string;
  labelChange: boolean;
  timeToResolution: string;
}

export interface PeriodicReport {
  id: string;
  type: string;
  product: string;
  productId: string;
  period: string;
  region: string;
  regionFlag: string;
  dueDate: string;
  status: ReportStatus;
  owner: string;
}

// ============================================================================
// ICSR CASES
// ============================================================================

export const icsrCases: ICSR[] = [
  { 
    id: 'icsr-1', caseNumber: 'US-LIG-2024-00456', product: 'LIG-2847', productId: 'lig-2847', event: 'Hepatotoxicity', seriousness: 'serious', 
    seriousnessCriteria: ['hospitalization'], outcome: 'hospitalization', source: 'spontaneous', country: 'United States', countryFlag: '🇺🇸', 
    receivedDate: '2024-12-10', dueDate: '2024-12-25', status: 'processing', assignee: 'Lisa Park', age: 67, sex: 'M', dose: '200mg QD', 
    timeToOnset: '6 weeks', dechallenge: 'Positive', rechallenge: 'Not done',
    reporterType: 'healthcare-professional', reporterName: 'Dr. James Wilson', reporterInstitution: 'Memorial Sloan Kettering Cancer Center',
    patientInitials: 'JD', patientWeight: 78, medicalHistory: ['NSCLC Stage IV', 'Hypertension', 'Type 2 Diabetes'],
    narrative: 'A 67-year-old male patient developed Grade 3 hepatotoxicity (ALT 8x ULN, AST 6x ULN) after 6 weeks on ligrastinib 200mg daily for KRAS G12C+ NSCLC. Drug was discontinued with positive dechallenge. Patient hospitalized for monitoring, LFTs normalized within 3 weeks.',
    causality: 'probable', listedness: 'listed', meddraPreferred: 'Hepatotoxicity', meddraSOC: 'Hepatobiliary disorders', actionTaken: 'withdrawn'
  },
  { 
    id: 'icsr-2', caseNumber: 'US-LIG-2024-00448', product: 'LIG-2847', productId: 'lig-2847', event: 'Hepatotoxicity', seriousness: 'serious', 
    seriousnessCriteria: ['hospitalization'], outcome: 'hospitalization', source: 'spontaneous', country: 'United States', countryFlag: '🇺🇸', 
    receivedDate: '2024-12-05', dueDate: '2024-12-20', status: 'submitted', assignee: 'Lisa Park', age: 54, sex: 'F', dose: '200mg QD', 
    timeToOnset: '8 weeks', dechallenge: 'Positive', rechallenge: 'Not done',
    reporterType: 'healthcare-professional', reporterName: 'Dr. Sarah Martinez', reporterInstitution: 'MD Anderson Cancer Center',
    patientInitials: 'MR', patientWeight: 62, medicalHistory: ['NSCLC Stage IIIB', 'Former smoker'],
    narrative: 'A 54-year-old female developed severe transaminase elevation (ALT 12x ULN) after 8 weeks of ligrastinib. Hospitalized, drug discontinued. Complete recovery within 4 weeks.',
    causality: 'probable', listedness: 'listed', meddraPreferred: 'Hepatotoxicity', meddraSOC: 'Hepatobiliary disorders', actionTaken: 'withdrawn',
    e2bExported: true, medwatchSubmitted: true
  },
  { 
    id: 'icsr-3', caseNumber: 'EU-LIG-2024-00234', product: 'LIG-2847', productId: 'lig-2847', event: 'Hepatotoxicity', seriousness: 'serious', 
    seriousnessCriteria: ['hospitalization'], outcome: 'hospitalization', source: 'clinical-trial', country: 'Germany', countryFlag: '🇩🇪', 
    receivedDate: '2024-11-28', dueDate: '2024-12-13', status: 'submitted', assignee: 'David Kim', age: 71, sex: 'M', dose: '200mg QD', 
    timeToOnset: '4 weeks', dechallenge: 'Positive', rechallenge: 'Not done',
    reporterType: 'healthcare-professional', reporterName: 'Prof. Klaus Schmidt', reporterInstitution: 'Charité Berlin',
    patientInitials: 'HM', patientWeight: 85, medicalHistory: ['NSCLC Stage IV', 'COPD', 'Previous chemotherapy'],
    causality: 'probable', listedness: 'listed', actionTaken: 'withdrawn', e2bExported: true, eudravigilanceSubmitted: true
  },
  { 
    id: 'icsr-4', caseNumber: 'EU-LIG-2024-00189', product: 'LIG-2847', productId: 'lig-2847', event: 'Hepatotoxicity', seriousness: 'serious', 
    seriousnessCriteria: ['other-serious'], outcome: 'other', source: 'spontaneous', country: 'France', countryFlag: '🇫🇷', 
    receivedDate: '2024-11-15', dueDate: '2024-11-30', status: 'submitted', assignee: 'Lisa Park', age: 62, sex: 'F', dose: '200mg QD', 
    timeToOnset: '5 weeks', dechallenge: 'Positive',
    causality: 'possible', listedness: 'listed', actionTaken: 'withdrawn', e2bExported: true
  },
  { 
    id: 'icsr-5', caseNumber: 'JP-LIG-2024-00089', product: 'LIG-2847', productId: 'lig-2847', event: 'Hepatotoxicity', seriousness: 'serious', 
    seriousnessCriteria: ['hospitalization'], outcome: 'hospitalization', source: 'clinical-trial', country: 'Japan', countryFlag: '🇯🇵', 
    receivedDate: '2024-11-10', dueDate: '2024-11-25', status: 'submitted', assignee: 'David Kim', age: 58, sex: 'M', dose: '200mg QD', 
    timeToOnset: '7 weeks', dechallenge: 'Positive',
    causality: 'probable', listedness: 'listed', actionTaken: 'withdrawn', e2bExported: true
  },
  { id: 'icsr-6', caseNumber: 'US-LIG-2024-00412', product: 'LIG-2847', productId: 'lig-2847', event: 'ALT Increased', seriousness: 'serious', outcome: 'recovered', source: 'spontaneous', country: 'United States', countryFlag: '🇺🇸', receivedDate: '2024-10-28', dueDate: '2024-11-12', status: 'submitted', assignee: 'Lisa Park', age: 65, sex: 'F', dose: '200mg QD', timeToOnset: '3 weeks', dechallenge: 'Positive', causality: 'probable', actionTaken: 'reduced', e2bExported: true, medwatchSubmitted: true },
  { id: 'icsr-7', caseNumber: 'CA-LIG-2024-00067', product: 'LIG-2847', productId: 'lig-2847', event: 'AST Increased', seriousness: 'non-serious', outcome: 'recovered', source: 'clinical-trial', country: 'Canada', countryFlag: '🇨🇦', receivedDate: '2024-10-15', dueDate: '2024-11-14', status: 'submitted', assignee: 'David Kim', age: 59, sex: 'M', dose: '200mg QD', timeToOnset: '2 weeks', dechallenge: 'Positive', causality: 'possible', actionTaken: 'reduced', e2bExported: true },
  { id: 'icsr-8', caseNumber: 'EU-LIG-2024-00123', product: 'LIG-2847', productId: 'lig-2847', event: 'Interstitial Lung Disease', seriousness: 'serious', seriousnessCriteria: ['hospitalization'], outcome: 'hospitalization', source: 'clinical-trial', country: 'Germany', countryFlag: '🇩🇪', receivedDate: '2024-12-08', dueDate: '2024-12-23', status: 'processing', assignee: 'Lisa Park', causality: 'possible', actionTaken: 'withdrawn' },
  { id: 'icsr-9', caseNumber: 'JP-LIG-2024-00091', product: 'LIG-2847', productId: 'lig-2847', event: 'QTc Prolongation', seriousness: 'serious', seriousnessCriteria: ['other-serious'], outcome: 'other', source: 'clinical-trial', country: 'Japan', countryFlag: '🇯🇵', receivedDate: '2024-12-05', dueDate: '2024-12-20', status: 'submitted', assignee: 'David Kim', causality: 'possible', e2bExported: true },
  { id: 'icsr-10', caseNumber: 'US-LIG-2024-00455', product: 'LIG-2847', productId: 'lig-2847', event: 'Diarrhea', seriousness: 'non-serious', outcome: 'recovered', source: 'spontaneous', country: 'United States', countryFlag: '🇺🇸', receivedDate: '2024-12-09', dueDate: '2025-01-08', status: 'new', assignee: 'Unassigned', causality: 'not-assessed' },
  // Additional cases for other products
  { id: 'icsr-11', caseNumber: 'US-LIG-2024-00301', product: 'LIG-1182', productId: 'lig-1182', event: 'Infusion Reaction', seriousness: 'serious', seriousnessCriteria: ['other-serious'], outcome: 'recovered', source: 'clinical-trial', country: 'United States', countryFlag: '🇺🇸', receivedDate: '2024-12-01', dueDate: '2024-12-16', status: 'submitted', assignee: 'Lisa Park', causality: 'certain', e2bExported: true, medwatchSubmitted: true },
  { id: 'icsr-12', caseNumber: 'EU-LIG-2024-00145', product: 'LIG-3021', productId: 'lig-3021', event: 'Neutropenia', seriousness: 'serious', seriousnessCriteria: ['hospitalization'], outcome: 'recovered', source: 'spontaneous', country: 'Spain', countryFlag: '🇪🇸', receivedDate: '2024-11-20', dueDate: '2024-12-05', status: 'submitted', assignee: 'David Kim', causality: 'probable', e2bExported: true, eudravigilanceSubmitted: true },
];

// ============================================================================
// SAFETY SIGNALS
// ============================================================================

export const safetySignals: SafetySignal[] = [
  { 
    id: 'sig-1', 
    signal: 'Hepatotoxicity - Grade 3+ transaminase elevations', 
    product: 'LIG-2847', 
    productId: 'lig-2847',
    status: 'confirmed', 
    priority: 'critical', 
    detectedDate: '2024-11-15', 
    source: 'Disproportionality Analysis + Clinical Trial Data', 
    caseCount: 23, 
    prrValue: 3.2,
    rorValue: 3.8,
    ic025: 1.4,
    description: 'Confirmed signal of Grade 3+ hepatotoxicity (ALT/AST >5x ULN) in patients receiving ligrastinib 200mg. Cases predominantly occur within 4-8 weeks of treatment initiation. All cases resolved with drug discontinuation. Pattern consistent with idiosyncratic drug-induced liver injury.',
    recommendation: 'CCDS update recommended to strengthen hepatotoxicity warnings, add monitoring recommendations (LFTs at baseline, every 2 weeks for first 3 months, then monthly), and include dose modification guidance.',
    relatedCases: ['icsr-1', 'icsr-2', 'icsr-3', 'icsr-4', 'icsr-5', 'icsr-6', 'icsr-7'],
    classEffect: true,
    labeledEvent: true
  },
  {
    id: 'sig-1b',
    signal: '🚨 Severe Hepatotoxicity Cluster - Japan (EMERGING)',
    product: 'LIG-2847',
    productId: 'lig-2847',
    status: 'new',
    priority: 'critical',
    detectedDate: '2026-01-15',
    source: 'Spontaneous Reports (PMDA) + AI Pattern Detection',
    caseCount: 4,
    prrValue: 4.7,
    rorValue: 5.2,
    ic025: 1.9,
    description: '⚠️ EMERGING SIGNAL: Four new cases of severe hepatotoxicity reported from Japan in past 72 hours. All patients were on concomitant ursodeoxycholic acid (UDCA). AI analysis identified potential CYP3A4-mediated drug-drug interaction resulting in ~3x higher ligrastinib plasma levels. Japanese prescribing patterns show 28% UDCA use vs 3% globally. Pattern differs from known idiosyncratic DILI—suggests metabolic pathway involvement requiring urgent label update.',
    recommendation: 'URGENT: (1) Update investigator communications re: UDCA co-administration within 24 hours, (2) Prepare expedited safety report for PMDA, (3) Complete PK interaction modeling within 72 hours, (4) Update CCDS with concomitant medication guidance, (5) Schedule emergency SDRP meeting.',
    relatedCases: ['icsr-jp-1', 'icsr-jp-2', 'icsr-jp-3', 'icsr-jp-4'],
    classEffect: true,
    labeledEvent: false
  },
  { 
    id: 'sig-2', 
    signal: 'QTc prolongation >60ms from baseline', 
    product: 'LIG-2847', 
    productId: 'lig-2847', 
    status: 'confirmed', 
    priority: 'medium', 
    detectedDate: '2024-10-01', 
    source: 'Clinical Trial ECG Data', 
    caseCount: 8, 
    prrValue: 1.9, 
    labeledEvent: true 
  },
  { 
    id: 'sig-3', 
    signal: 'Interstitial Lung Disease', 
    product: 'LIG-2847', 
    productId: 'lig-2847', 
    status: 'under-evaluation', 
    priority: 'high', 
    detectedDate: '2024-12-01', 
    source: 'Literature Review + Spontaneous Reports', 
    caseCount: 5, 
    classEffect: true, 
    labeledEvent: true 
  },
  { 
    id: 'sig-4', 
    signal: 'Skin rash - photosensitivity', 
    product: 'LIG-3021', 
    productId: 'lig-3021', 
    status: 'new', 
    priority: 'low', 
    detectedDate: '2024-12-05', 
    source: 'Spontaneous Reports', 
    caseCount: 3 
  },
  { 
    id: 'sig-5', 
    signal: 'Infusion-related reactions', 
    product: 'LIG-1182', 
    productId: 'lig-1182', 
    status: 'confirmed', 
    priority: 'medium', 
    detectedDate: '2024-09-15', 
    source: 'Clinical Trial Data', 
    caseCount: 12, 
    prrValue: 2.1,
    labeledEvent: true 
  },
];

// ============================================================================
// SIMILAR SIGNALS (Competitor Intelligence)
// ============================================================================

export const similarSignals: SimilarSignal[] = [
  { drug: 'Sotorasib (Lumakras)', company: 'Amgen', indication: 'KRAS G12C NSCLC', signalDate: '2021-05', outcome: 'Label updated with hepatotoxicity warning', labelChange: true, timeToResolution: '3 months' },
  { drug: 'Adagrasib (Krazati)', company: 'Mirati', indication: 'KRAS G12C NSCLC', signalDate: '2022-12', outcome: 'Boxed warning added for hepatotoxicity', labelChange: true, timeToResolution: '4 months' },
  { drug: 'Divarasib', company: 'Roche', indication: 'KRAS G12C Solid Tumors', signalDate: '2024-03', outcome: 'Under evaluation - Phase 3 ongoing', labelChange: false, timeToResolution: 'Ongoing' },
];

// ============================================================================
// PERIODIC REPORTS
// ============================================================================

export const periodicReports: PeriodicReport[] = [
  { id: 'pr-1', type: 'PBRER', product: 'LIG-2847', productId: 'lig-2847', period: 'Jun 2024 - Nov 2024', region: 'EU', regionFlag: '🇪🇺', dueDate: '2025-02-28', status: 'in-progress', owner: 'Lisa Park' },
  { id: 'pr-2', type: 'PSUR', product: 'LIG-2847', productId: 'lig-2847', period: 'Jun 2024 - Nov 2024', region: 'US', regionFlag: '🇺🇸', dueDate: '2025-02-28', status: 'not-started', owner: 'Lisa Park' },
  { id: 'pr-3', type: 'DSUR', product: 'LIG-3021', productId: 'lig-3021', period: 'Jan 2024 - Dec 2024', region: 'Global', regionFlag: '🌐', dueDate: '2025-01-31', status: 'review', owner: 'David Kim' },
  { id: 'pr-4', type: 'PSUR', product: 'LIG-1182', productId: 'lig-1182', period: 'Jul 2024 - Dec 2024', region: 'US', regionFlag: '🇺🇸', dueDate: '2025-03-15', status: 'not-started', owner: 'Lisa Park' },
  { id: 'pr-5', type: 'PBRER', product: 'LIG-3021', productId: 'lig-3021', period: 'Jan 2024 - Dec 2024', region: 'EU', regionFlag: '🇪🇺', dueDate: '2025-03-31', status: 'not-started', owner: 'David Kim' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getSignalPriorityColor = (priority: SignalPriority): string => {
  const colors: Record<SignalPriority, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-amber-500/20 text-amber-400',
    medium: 'bg-blue-500/20 text-blue-400',
    low: 'bg-slate-500/20 text-slate-400',
  };
  return colors[priority];
};

export const getSignalStatusColor = (status: SignalStatus): string => {
  const colors: Record<SignalStatus, string> = {
    new: 'bg-purple-500/20 text-purple-400',
    'under-evaluation': 'bg-amber-500/20 text-amber-400',
    confirmed: 'bg-red-500/20 text-red-400',
    refuted: 'bg-slate-500/20 text-slate-400',
    closed: 'bg-green-500/20 text-green-400',
  };
  return colors[status];
};

export const getICSRStatusColor = (status: ICSRStatus): string => {
  const colors: Record<ICSRStatus, string> = {
    new: 'bg-purple-500/20 text-purple-400',
    processing: 'bg-blue-500/20 text-blue-400',
    submitted: 'bg-green-500/20 text-green-400',
    'follow-up': 'bg-amber-500/20 text-amber-400',
    closed: 'bg-surface-hover text-text-muted',
  };
  return colors[status];
};

export const getReportStatusColor = (status: ReportStatus): string => {
  const colors: Record<ReportStatus, string> = {
    'not-started': 'bg-slate-500/20 text-slate-400',
    'in-progress': 'bg-blue-500/20 text-blue-400',
    review: 'bg-amber-500/20 text-amber-400',
    submitted: 'bg-green-500/20 text-green-400',
  };
  return colors[status];
};

// Statistics helpers
export const getSafetyStats = (productFilter?: Set<string> | null) => {
  const filteredSignals = productFilter 
    ? safetySignals.filter(s => productFilter.has(s.productId))
    : safetySignals;
  
  const filteredCases = productFilter
    ? icsrCases.filter(c => productFilter.has(c.productId))
    : icsrCases;

  return {
    activeSignals: filteredSignals.filter(s => s.status !== 'closed' && s.status !== 'refuted').length,
    criticalSignals: filteredSignals.filter(s => s.priority === 'critical' || s.priority === 'high').length,
    pendingLabelUpdates: filteredSignals.filter(s => s.status === 'confirmed' && s.labeledEvent).length,
    totalCases: filteredCases.length,
    seriousCases: filteredCases.filter(c => c.seriousness === 'serious').length,
    pendingCases: filteredCases.filter(c => c.status === 'new' || c.status === 'processing').length,
  };
};

// ============================================================================
// MEDDRA CODING (subset for demo)
// ============================================================================

export interface MedDRATerm {
  pt: string; // Preferred Term
  ptCode: string;
  soc: string; // System Organ Class
  socCode: string;
  hlgt?: string; // High Level Group Term
  hlt?: string; // High Level Term
  llt?: string[]; // Low Level Terms
}

export const medDRATerms: MedDRATerm[] = [
  { pt: 'Hepatotoxicity', ptCode: '10019851', soc: 'Hepatobiliary disorders', socCode: '10019805', hlgt: 'Hepatobiliary disorders', hlt: 'Hepatocellular damage and hepatitis NEC' },
  { pt: 'Alanine aminotransferase increased', ptCode: '10001551', soc: 'Investigations', socCode: '10022891', hlgt: 'Hepatobiliary investigations', hlt: 'Hepatic enzymes and function abnormal' },
  { pt: 'Aspartate aminotransferase increased', ptCode: '10003481', soc: 'Investigations', socCode: '10022891', hlgt: 'Hepatobiliary investigations', hlt: 'Hepatic enzymes and function abnormal' },
  { pt: 'Drug-induced liver injury', ptCode: '10072268', soc: 'Hepatobiliary disorders', socCode: '10019805', hlgt: 'Hepatobiliary disorders', hlt: 'Hepatocellular damage and hepatitis NEC' },
  { pt: 'Interstitial lung disease', ptCode: '10022611', soc: 'Respiratory, thoracic and mediastinal disorders', socCode: '10038738', hlgt: 'Lower respiratory tract disorders (excl obstruction and infection)', hlt: 'Interstitial and pulmonary inflammatory conditions' },
  { pt: 'Pneumonitis', ptCode: '10035742', soc: 'Respiratory, thoracic and mediastinal disorders', socCode: '10038738', hlgt: 'Lower respiratory tract disorders (excl obstruction and infection)', hlt: 'Interstitial and pulmonary inflammatory conditions' },
  { pt: 'QT prolonged', ptCode: '10037705', soc: 'Investigations', socCode: '10022891', hlgt: 'Cardiac and vascular investigations (incl enzyme tests)', hlt: 'ECG investigations' },
  { pt: 'Diarrhoea', ptCode: '10012735', soc: 'Gastrointestinal disorders', socCode: '10017947', hlgt: 'Gastrointestinal motility and defaecation conditions', hlt: 'Diarrhoea (excl infective)' },
  { pt: 'Nausea', ptCode: '10028813', soc: 'Gastrointestinal disorders', socCode: '10017947', hlgt: 'Nausea and vomiting symptoms', hlt: 'Nausea and vomiting NEC' },
  { pt: 'Fatigue', ptCode: '10016256', soc: 'General disorders and administration site conditions', socCode: '10018065', hlgt: 'General system disorders NEC', hlt: 'Asthenic conditions' },
  { pt: 'Neutropenia', ptCode: '10029354', soc: 'Blood and lymphatic system disorders', socCode: '10005329', hlgt: 'Leucocyte disorders', hlt: 'Neutropenias' },
  { pt: 'Infusion related reaction', ptCode: '10051792', soc: 'Injury, poisoning and procedural complications', socCode: '10022117', hlgt: 'Procedural related injuries and complications NEC', hlt: 'Infusion site reactions' },
  { pt: 'Rash', ptCode: '10037844', soc: 'Skin and subcutaneous tissue disorders', socCode: '10040785', hlgt: 'Epidermal and dermal conditions', hlt: 'Rashes, eruptions and exanthems NEC' },
  { pt: 'Photosensitivity reaction', ptCode: '10034972', soc: 'Skin and subcutaneous tissue disorders', socCode: '10040785', hlgt: 'Epidermal and dermal conditions', hlt: 'Photosensitivity conditions' },
];

export const searchMedDRA = (query: string): MedDRATerm[] => {
  const q = query.toLowerCase();
  return medDRATerms.filter(t => 
    t.pt.toLowerCase().includes(q) || 
    t.soc.toLowerCase().includes(q) ||
    t.ptCode.includes(q)
  );
};

// ============================================================================
// MEDWATCH FORM STRUCTURE
// ============================================================================

export interface MedWatchForm {
  formType: MedWatchFormType;
  caseId: string;
  // Section A - Patient Information
  patientInitials: string;
  age?: number;
  ageUnit?: 'years' | 'months' | 'days';
  sex?: 'M' | 'F' | 'UNK';
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  ethnicity?: string;
  // Section B - Adverse Event
  eventDescription: string;
  eventDateOnset?: string;
  eventDateResolved?: string;
  seriousnessOutcomes: {
    death?: boolean;
    deathDate?: string;
    lifeThreatening?: boolean;
    hospitalization?: boolean;
    hospitalizationDates?: string;
    disability?: boolean;
    congenitalAnomaly?: boolean;
    requiredIntervention?: boolean;
    other?: boolean;
    otherText?: string;
  };
  relevantTests?: string;
  otherRelevantHistory?: string;
  // Section C - Suspect Product
  productName: string;
  manufacturer?: string;
  ndc?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  dateStarted?: string;
  dateStopped?: string;
  diagnosisIndication?: string;
  eventAbatedAfterStopping?: 'yes' | 'no' | 'na' | 'unk';
  eventReappearedOnRechallenge?: 'yes' | 'no' | 'na' | 'unk';
  lotNumber?: string;
  expirationDate?: string;
  // Section D - Suspect Medical Device (not used for drugs)
  // Section E - Reporter Information
  reporterType: ReporterType;
  reporterName?: string;
  reporterAddress?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  reporterHealthProfession?: string;
  reporterOccupation?: string;
  initialReportDate: string;
  // Section F - For use by FDA
  fdaReceivedDate?: string;
  reportType?: 'initial' | 'follow-up';
  // Generated fields
  generatedDate: string;
  status: 'draft' | 'ready' | 'submitted';
}

export const generateMedWatchForm = (icsr: ICSR): MedWatchForm => {
  const seriousCriteria = icsr.seriousnessCriteria || [];
  return {
    formType: icsr.source === 'clinical-trial' ? '3500A' : '3500',
    caseId: icsr.id,
    patientInitials: icsr.patientInitials || `${icsr.sex || 'U'}${icsr.age || '00'}`,
    age: icsr.age,
    ageUnit: 'years',
    sex: icsr.sex as 'M' | 'F' | 'UNK',
    weight: icsr.patientWeight,
    weightUnit: 'kg',
    eventDescription: icsr.narrative || `${icsr.event} following administration of ${icsr.product}`,
    eventDateOnset: icsr.receivedDate,
    seriousnessOutcomes: {
      death: seriousCriteria.includes('death'),
      lifeThreatening: seriousCriteria.includes('life-threatening'),
      hospitalization: seriousCriteria.includes('hospitalization') || icsr.outcome === 'hospitalization',
      disability: seriousCriteria.includes('disability'),
      congenitalAnomaly: seriousCriteria.includes('congenital-anomaly'),
      requiredIntervention: false,
      other: seriousCriteria.includes('other-serious'),
    },
    relevantTests: icsr.event.includes('ALT') || icsr.event.includes('AST') || icsr.event.includes('Hepato') 
      ? 'LFTs: ALT, AST, bilirubin, ALP' : undefined,
    otherRelevantHistory: icsr.medicalHistory?.join(', '),
    productName: icsr.product,
    dose: icsr.dose,
    route: 'Oral',
    diagnosisIndication: 'NSCLC (KRAS G12C mutation)',
    eventAbatedAfterStopping: icsr.dechallenge === 'Positive' ? 'yes' : 'unk',
    eventReappearedOnRechallenge: icsr.rechallenge === 'Positive' ? 'yes' : icsr.rechallenge === 'Not done' ? 'na' : 'unk',
    reporterType: icsr.reporterType || 'healthcare-professional',
    reporterName: icsr.reporterName,
    initialReportDate: icsr.receivedDate,
    reportType: 'initial',
    generatedDate: new Date().toISOString().split('T')[0],
    status: 'draft',
  };
};

// ============================================================================
// E2B(R3) ICSR EXPORT STRUCTURE
// ============================================================================

export interface E2BMessage {
  version: E2BVersion;
  messageId: string;
  creationDate: string;
  senderType: 'company' | 'authority';
  senderId: string;
  receiverId: string;
  safetyReport: E2BSafetyReport;
}

export interface E2BSafetyReport {
  safetyReportId: string;
  safetyReportVersion: number;
  primarySourceCountry: string;
  occurCountry: string;
  transmissionDate: string;
  reportType: 'spontaneous' | 'report-from-study' | 'other' | 'not-available';
  seriousness: {
    seriousnessDeathFlag: boolean;
    seriousnessLifeThreateningFlag: boolean;
    seriousnessHospitalizationFlag: boolean;
    seriousnessDisablingFlag: boolean;
    seriousnessCongenitalAnomalyFlag: boolean;
    seriousnessOtherFlag: boolean;
  };
  patient: E2BPatient;
  primarySource: E2BPrimarySource;
  drugs: E2BDrug[];
  reactions: E2BReaction[];
  caseSummary: string;
  senderComment?: string;
}

export interface E2BPatient {
  patientOnsetAge?: number;
  patientOnsetAgeUnit?: string;
  patientSex: '1' | '2' | '0'; // 1=Male, 2=Female, 0=Unknown
  patientWeight?: number;
  patientHeight?: number;
  medicalHistoryText?: string;
}

export interface E2BPrimarySource {
  reporterGivenName?: string;
  reporterFamilyName?: string;
  qualification: '1' | '2' | '3' | '4' | '5'; // 1=Physician, 2=Pharmacist, 3=Other HP, 4=Lawyer, 5=Consumer
  reporterCountry: string;
  reporterOrganization?: string;
}

export interface E2BDrug {
  drugCharacterization: '1' | '2' | '3'; // 1=Suspect, 2=Concomitant, 3=Interacting
  medicinalProduct: string;
  obtainDrugCountry?: string;
  drugBatchNumber?: string;
  drugDosageText?: string;
  drugDosageForm?: string;
  drugRouteOfAdministration?: string;
  drugIndication?: string;
  drugStartDate?: string;
  drugEndDate?: string;
  drugActionDrug?: string; // Action taken
  drugReactionRelatedness?: {
    drugAssessmentSource?: string;
    drugAssessmentMethod?: string;
    drugResult?: string;
  };
}

export interface E2BReaction {
  reactionMedDRAVersion: string;
  reactionMedDRALLT?: string;
  reactionMedDRAPT: string;
  reactionMedDRASOC?: string;
  reactionStartDate?: string;
  reactionEndDate?: string;
  reactionOutcome: '1' | '2' | '3' | '4' | '5' | '6'; // 1=recovered, 2=recovering, 3=not recovered, 4=recovered w sequelae, 5=fatal, 6=unknown
}

export const generateE2BMessage = (icsr: ICSR, version: E2BVersion = 'R3'): E2BMessage => {
  const meddra = medDRATerms.find(m => m.pt.toLowerCase().includes(icsr.event.toLowerCase().split(' ')[0])) || medDRATerms[0];
  
  const reportTypeMap: Record<string, E2BSafetyReport['reportType']> = {
    'spontaneous': 'spontaneous',
    'clinical-trial': 'report-from-study',
    'literature': 'other',
    'health-authority': 'other',
    'patient-support': 'spontaneous',
    'solicited': 'other'
  };

  const qualificationMap: Record<ReporterType, E2BPrimarySource['qualification']> = {
    'healthcare-professional': '1',
    'consumer': '5',
    'other': '3'
  };

  const outcomeMap: Record<string, E2BReaction['reactionOutcome']> = {
    'recovered': '1',
    'recovering': '2',
    'not recovered': '3',
    'recovered with sequelae': '4',
    'fatal': '5',
    'hospitalization': '6',
    'other': '6'
  };

  const actionMap: Record<string, string> = {
    'withdrawn': '1',
    'reduced': '2',
    'continued': '3',
    'unknown': '4'
  };

  const seriousCriteria = icsr.seriousnessCriteria || [];

  return {
    version,
    messageId: `MSG-${icsr.caseNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
    creationDate: new Date().toISOString(),
    senderType: 'company',
    senderId: 'LIGATURE-PHARMA',
    receiverId: icsr.country === 'United States' ? 'FDA' : icsr.country === 'Japan' ? 'PMDA' : 'EMA',
    safetyReport: {
      safetyReportId: icsr.caseNumber,
      safetyReportVersion: 1,
      primarySourceCountry: icsr.country,
      occurCountry: icsr.country,
      transmissionDate: new Date().toISOString().split('T')[0],
      reportType: reportTypeMap[icsr.source] || 'spontaneous',
      seriousness: {
        seriousnessDeathFlag: seriousCriteria.includes('death'),
        seriousnessLifeThreateningFlag: seriousCriteria.includes('life-threatening'),
        seriousnessHospitalizationFlag: seriousCriteria.includes('hospitalization') || icsr.outcome === 'hospitalization',
        seriousnessDisablingFlag: seriousCriteria.includes('disability'),
        seriousnessCongenitalAnomalyFlag: seriousCriteria.includes('congenital-anomaly'),
        seriousnessOtherFlag: seriousCriteria.includes('other-serious'),
      },
      patient: {
        patientOnsetAge: icsr.age,
        patientOnsetAgeUnit: '801', // Years
        patientSex: icsr.sex === 'M' ? '1' : icsr.sex === 'F' ? '2' : '0',
        patientWeight: icsr.patientWeight,
        patientHeight: icsr.patientHeight,
        medicalHistoryText: icsr.medicalHistory?.join('; '),
      },
      primarySource: {
        reporterGivenName: icsr.reporterName?.split(' ')[0],
        reporterFamilyName: icsr.reporterName?.split(' ').slice(1).join(' '),
        qualification: qualificationMap[icsr.reporterType || 'healthcare-professional'],
        reporterCountry: icsr.country,
        reporterOrganization: icsr.reporterInstitution,
      },
      drugs: [
        {
          drugCharacterization: '1', // Suspect
          medicinalProduct: icsr.product,
          drugDosageText: icsr.dose,
          drugRouteOfAdministration: 'Oral',
          drugIndication: 'NSCLC with KRAS G12C mutation',
          drugActionDrug: actionMap[icsr.actionTaken || 'unknown'],
          drugReactionRelatedness: icsr.causality ? {
            drugAssessmentSource: 'Sponsor',
            drugAssessmentMethod: 'WHO-UMC',
            drugResult: icsr.causality,
          } : undefined,
        },
        ...(icsr.concomitant || []).map(drug => ({
          drugCharacterization: '2' as const, // Concomitant
          medicinalProduct: drug,
        })),
      ],
      reactions: [
        {
          reactionMedDRAVersion: '27.0',
          reactionMedDRAPT: meddra.pt,
          reactionMedDRASOC: meddra.soc,
          reactionStartDate: icsr.receivedDate,
          reactionOutcome: outcomeMap[icsr.outcome] || '6',
        },
      ],
      caseSummary: icsr.narrative || `${icsr.age || 'Unknown age'} ${icsr.sex || ''} patient experienced ${icsr.event} following treatment with ${icsr.product} ${icsr.dose || ''}. Time to onset: ${icsr.timeToOnset || 'unknown'}. Outcome: ${icsr.outcome}. Dechallenge: ${icsr.dechallenge || 'unknown'}.`,
    },
  };
};

// ============================================================================
// SIGNAL DETECTION / DISPROPORTIONALITY ANALYSIS
// ============================================================================

export interface DisproportionalityMetric {
  eventName: string;
  meddraCode: string;
  observed: number;
  expected: number;
  prr: number; // Proportional Reporting Ratio
  prrLower: number;
  prrUpper: number;
  ror: number; // Reporting Odds Ratio
  rorLower: number;
  rorUpper: number;
  ic: number; // Information Component
  icLower: number;
  chi2: number;
  signalStrength: 'strong' | 'moderate' | 'weak' | 'none';
  trendsUp: boolean;
}

export const disproportionalityData: DisproportionalityMetric[] = [
  { eventName: 'Hepatotoxicity', meddraCode: '10019851', observed: 23, expected: 7.2, prr: 3.19, prrLower: 2.1, prrUpper: 4.8, ror: 3.82, rorLower: 2.4, rorUpper: 6.1, ic: 1.68, icLower: 1.1, chi2: 34.7, signalStrength: 'strong', trendsUp: true },
  { eventName: 'ALT Increased', meddraCode: '10001551', observed: 18, expected: 6.1, prr: 2.95, prrLower: 1.8, prrUpper: 4.5, ror: 3.42, rorLower: 2.0, rorUpper: 5.8, ic: 1.52, icLower: 0.9, chi2: 26.3, signalStrength: 'strong', trendsUp: true },
  { eventName: 'AST Increased', meddraCode: '10003481', observed: 14, expected: 5.8, prr: 2.41, prrLower: 1.4, prrUpper: 4.1, ror: 2.78, rorLower: 1.5, rorUpper: 5.2, ic: 1.27, icLower: 0.6, chi2: 18.2, signalStrength: 'moderate', trendsUp: true },
  { eventName: 'QT Prolongation', meddraCode: '10037705', observed: 8, expected: 4.2, prr: 1.90, prrLower: 0.9, prrUpper: 3.9, ror: 2.08, rorLower: 0.9, rorUpper: 4.6, ic: 0.93, icLower: 0.1, chi2: 8.1, signalStrength: 'moderate', trendsUp: false },
  { eventName: 'Interstitial Lung Disease', meddraCode: '10022611', observed: 5, expected: 1.8, prr: 2.78, prrLower: 1.1, prrUpper: 6.8, ror: 3.21, rorLower: 1.2, rorUpper: 8.4, ic: 1.45, icLower: 0.4, chi2: 12.4, signalStrength: 'moderate', trendsUp: true },
  { eventName: 'Diarrhoea', meddraCode: '10012735', observed: 45, expected: 38.2, prr: 1.18, prrLower: 0.9, prrUpper: 1.6, ror: 1.22, rorLower: 0.9, rorUpper: 1.7, ic: 0.24, icLower: -0.2, chi2: 3.2, signalStrength: 'none', trendsUp: false },
  { eventName: 'Nausea', meddraCode: '10028813', observed: 52, expected: 48.5, prr: 1.07, prrLower: 0.8, prrUpper: 1.4, ror: 1.09, rorLower: 0.8, rorUpper: 1.5, ic: 0.10, icLower: -0.3, chi2: 1.1, signalStrength: 'none', trendsUp: false },
  { eventName: 'Fatigue', meddraCode: '10016256', observed: 38, expected: 35.1, prr: 1.08, prrLower: 0.8, prrUpper: 1.5, ror: 1.11, rorLower: 0.8, rorUpper: 1.6, ic: 0.12, icLower: -0.3, chi2: 1.4, signalStrength: 'none', trendsUp: false },
  { eventName: 'Rash', meddraCode: '10037844', observed: 12, expected: 9.2, prr: 1.30, prrLower: 0.7, prrUpper: 2.3, ror: 1.38, rorLower: 0.7, rorUpper: 2.6, ic: 0.38, icLower: -0.3, chi2: 4.1, signalStrength: 'weak', trendsUp: false },
];

export const getSignalThresholds = () => ({
  prr: { strong: 2.0, moderate: 1.5 },
  ror: { strong: 2.0, moderate: 1.5 },
  ic025: { strong: 0.5, moderate: 0.25 },
  chi2: { strong: 10.0, moderate: 5.0 },
  minCaseCount: 3,
});

// Time series data for signal trending
export interface SignalTimePoint {
  month: string;
  caseCount: number;
  prr: number;
  ror: number;
  cumulative: number;
}

export const hepatotoxicityTrend: SignalTimePoint[] = [
  { month: 'Jul 2024', caseCount: 2, prr: 1.8, ror: 2.0, cumulative: 2 },
  { month: 'Aug 2024', caseCount: 3, prr: 2.1, ror: 2.4, cumulative: 5 },
  { month: 'Sep 2024', caseCount: 4, prr: 2.4, ror: 2.8, cumulative: 9 },
  { month: 'Oct 2024', caseCount: 5, prr: 2.7, ror: 3.2, cumulative: 14 },
  { month: 'Nov 2024', caseCount: 5, prr: 3.0, ror: 3.5, cumulative: 19 },
  { month: 'Dec 2024', caseCount: 4, prr: 3.2, ror: 3.8, cumulative: 23 },
];

// ============================================================================
// ENHANCED SIGNAL DETECTION - v181
// ============================================================================

// Contingency table for 2x2 analysis
export interface ContingencyTable {
  a: number; // Drug + Event
  b: number; // Drug + No Event
  c: number; // No Drug + Event
  d: number; // No Drug + No Event
}

// Extended disproportionality metrics with EBGM
export interface ExtendedDisproportionality {
  eventName: string;
  meddraCode: string;
  meddraSOC: string;
  contingency: ContingencyTable;
  // PRR - Proportional Reporting Ratio
  prr: number;
  prrLower: number;
  prrUpper: number;
  // ROR - Reporting Odds Ratio
  ror: number;
  rorLower: number;
  rorUpper: number;
  // IC - Information Component (Bayesian)
  ic: number;
  icLower: number; // IC025
  icUpper: number; // IC975
  // EBGM - Empirical Bayes Geometric Mean
  ebgm: number;
  ebgm05: number; // Lower 5% bound
  ebgm95: number; // Upper 95% bound
  // Chi-square
  chi2: number;
  pValue: number;
  // Signal assessment
  signalStrength: 'strong' | 'moderate' | 'weak' | 'none';
  signalStatus: 'new' | 'confirmed' | 'under-evaluation' | 'refuted';
  trendsUp: boolean;
  lastUpdated: string;
}

// Signal detection algorithm types
export type SignalAlgorithm = 'prr' | 'ror' | 'ebgm' | 'ic' | 'chi2';

// Detection run configuration
export interface SignalDetectionConfig {
  algorithm: SignalAlgorithm;
  prrThreshold: number;
  rorThreshold: number;
  ebgm05Threshold: number;
  ic025Threshold: number;
  chi2Threshold: number;
  minCaseCount: number;
  confidenceLevel: number;
  dateRange: { start: string; end: string };
}

export const defaultSignalConfig: SignalDetectionConfig = {
  algorithm: 'ebgm',
  prrThreshold: 2.0,
  rorThreshold: 2.0,
  ebgm05Threshold: 2.0,
  ic025Threshold: 0.5,
  chi2Threshold: 4.0,
  minCaseCount: 3,
  confidenceLevel: 0.95,
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
};

// Extended disproportionality data with EBGM
export const extendedDisproportionalityData: ExtendedDisproportionality[] = [
  {
    eventName: 'Hepatotoxicity',
    meddraCode: '10019851',
    meddraSOC: 'Hepatobiliary disorders',
    contingency: { a: 23, b: 477, c: 180, d: 49320 },
    prr: 3.19, prrLower: 2.10, prrUpper: 4.80,
    ror: 3.82, rorLower: 2.40, rorUpper: 6.10,
    ic: 1.68, icLower: 1.10, icUpper: 2.26,
    ebgm: 3.15, ebgm05: 2.18, ebgm95: 4.56,
    chi2: 34.7, pValue: 0.0001,
    signalStrength: 'strong', signalStatus: 'confirmed', trendsUp: true,
    lastUpdated: '2024-12-15',
  },
  {
    eventName: 'ALT Increased',
    meddraCode: '10001551',
    meddraSOC: 'Investigations',
    contingency: { a: 18, b: 482, c: 152, d: 49348 },
    prr: 2.95, prrLower: 1.80, prrUpper: 4.50,
    ror: 3.42, rorLower: 2.00, rorUpper: 5.80,
    ic: 1.52, icLower: 0.90, icUpper: 2.14,
    ebgm: 2.88, ebgm05: 1.92, ebgm95: 4.32,
    chi2: 26.3, pValue: 0.0003,
    signalStrength: 'strong', signalStatus: 'confirmed', trendsUp: true,
    lastUpdated: '2024-12-15',
  },
  {
    eventName: 'AST Increased',
    meddraCode: '10003481',
    meddraSOC: 'Investigations',
    contingency: { a: 14, b: 486, c: 145, d: 49355 },
    prr: 2.41, prrLower: 1.40, prrUpper: 4.10,
    ror: 2.78, rorLower: 1.50, rorUpper: 5.20,
    ic: 1.27, icLower: 0.60, icUpper: 1.94,
    ebgm: 2.35, ebgm05: 1.48, ebgm95: 3.73,
    chi2: 18.2, pValue: 0.002,
    signalStrength: 'moderate', signalStatus: 'confirmed', trendsUp: true,
    lastUpdated: '2024-12-15',
  },
  {
    eventName: 'QT Prolongation',
    meddraCode: '10037705',
    meddraSOC: 'Cardiac disorders',
    contingency: { a: 8, b: 492, c: 105, d: 49395 },
    prr: 1.90, prrLower: 0.90, prrUpper: 3.90,
    ror: 2.08, rorLower: 0.90, rorUpper: 4.60,
    ic: 0.93, icLower: 0.10, icUpper: 1.76,
    ebgm: 1.85, ebgm05: 0.98, ebgm95: 3.50,
    chi2: 8.1, pValue: 0.044,
    signalStrength: 'moderate', signalStatus: 'under-evaluation', trendsUp: false,
    lastUpdated: '2024-12-10',
  },
  {
    eventName: 'Interstitial Lung Disease',
    meddraCode: '10022611',
    meddraSOC: 'Respiratory disorders',
    contingency: { a: 5, b: 495, c: 45, d: 49455 },
    prr: 2.78, prrLower: 1.10, prrUpper: 6.80,
    ror: 3.21, rorLower: 1.20, rorUpper: 8.40,
    ic: 1.45, icLower: 0.40, icUpper: 2.50,
    ebgm: 2.68, ebgm05: 1.22, ebgm95: 5.89,
    chi2: 12.4, pValue: 0.012,
    signalStrength: 'moderate', signalStatus: 'under-evaluation', trendsUp: true,
    lastUpdated: '2024-12-08',
  },
  {
    eventName: 'Diarrhoea',
    meddraCode: '10012735',
    meddraSOC: 'Gastrointestinal disorders',
    contingency: { a: 45, b: 455, c: 950, d: 48550 },
    prr: 1.18, prrLower: 0.90, prrUpper: 1.60,
    ror: 1.22, rorLower: 0.90, rorUpper: 1.70,
    ic: 0.24, icLower: -0.20, icUpper: 0.68,
    ebgm: 1.15, ebgm05: 0.88, ebgm95: 1.50,
    chi2: 3.2, pValue: 0.36,
    signalStrength: 'none', signalStatus: 'refuted', trendsUp: false,
    lastUpdated: '2024-12-01',
  },
  {
    eventName: 'Nausea',
    meddraCode: '10028813',
    meddraSOC: 'Gastrointestinal disorders',
    contingency: { a: 52, b: 448, c: 1210, d: 48290 },
    prr: 1.07, prrLower: 0.80, prrUpper: 1.40,
    ror: 1.09, rorLower: 0.80, rorUpper: 1.50,
    ic: 0.10, icLower: -0.30, icUpper: 0.50,
    ebgm: 1.05, ebgm05: 0.82, ebgm95: 1.34,
    chi2: 1.1, pValue: 0.58,
    signalStrength: 'none', signalStatus: 'refuted', trendsUp: false,
    lastUpdated: '2024-12-01',
  },
  {
    eventName: 'Fatigue',
    meddraCode: '10016256',
    meddraSOC: 'General disorders',
    contingency: { a: 38, b: 462, c: 875, d: 48625 },
    prr: 1.08, prrLower: 0.80, prrUpper: 1.50,
    ror: 1.11, rorLower: 0.80, rorUpper: 1.60,
    ic: 0.12, icLower: -0.30, icUpper: 0.54,
    ebgm: 1.08, ebgm05: 0.80, ebgm95: 1.46,
    chi2: 1.4, pValue: 0.52,
    signalStrength: 'none', signalStatus: 'refuted', trendsUp: false,
    lastUpdated: '2024-12-01',
  },
  {
    eventName: 'Rash',
    meddraCode: '10037844',
    meddraSOC: 'Skin disorders',
    contingency: { a: 12, b: 488, c: 230, d: 49270 },
    prr: 1.30, prrLower: 0.70, prrUpper: 2.30,
    ror: 1.38, rorLower: 0.70, rorUpper: 2.60,
    ic: 0.38, icLower: -0.30, icUpper: 1.06,
    ebgm: 1.28, ebgm05: 0.75, ebgm95: 2.18,
    chi2: 4.1, pValue: 0.25,
    signalStrength: 'weak', signalStatus: 'refuted', trendsUp: false,
    lastUpdated: '2024-12-01',
  },
];

// Signal detection run history
export interface SignalDetectionRun {
  id: string;
  runDate: string;
  config: SignalDetectionConfig;
  productId: string;
  product: string;
  dataSource: string;
  totalEvents: number;
  signalsDetected: number;
  status: 'completed' | 'running' | 'failed';
  duration: string;
  runBy: string;
}

export const signalDetectionRuns: SignalDetectionRun[] = [
  {
    id: 'run-001',
    runDate: '2024-12-15T14:30:00Z',
    config: defaultSignalConfig,
    productId: 'lig-2847',
    product: 'LIG-2847',
    dataSource: 'FAERS + Internal Safety DB',
    totalEvents: 9,
    signalsDetected: 3,
    status: 'completed',
    duration: '2.3s',
    runBy: 'Dr. Sarah Chen',
  },
  {
    id: 'run-002',
    runDate: '2024-12-10T09:15:00Z',
    config: { ...defaultSignalConfig, algorithm: 'prr' },
    productId: 'lig-2847',
    product: 'LIG-2847',
    dataSource: 'FAERS',
    totalEvents: 9,
    signalsDetected: 2,
    status: 'completed',
    duration: '1.8s',
    runBy: 'System',
  },
  {
    id: 'run-003',
    runDate: '2024-12-01T08:00:00Z',
    config: { ...defaultSignalConfig, algorithm: 'ror' },
    productId: 'lig-2847',
    product: 'LIG-2847',
    dataSource: 'EudraVigilance',
    totalEvents: 7,
    signalsDetected: 2,
    status: 'completed',
    duration: '3.1s',
    runBy: 'System',
  },
];

// Helper function to calculate signal metrics
export function calculateDisproportionality(ct: ContingencyTable): {
  prr: number; prrLower: number; prrUpper: number;
  ror: number; rorLower: number; rorUpper: number;
  chi2: number;
} {
  const { a, b, c, d } = ct;
  const n = a + b + c + d;
  
  // PRR calculation
  const prr = (a / (a + b)) / (c / (c + d));
  const sePrr = Math.sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d));
  const prrLower = prr * Math.exp(-1.96 * sePrr);
  const prrUpper = prr * Math.exp(1.96 * sePrr);
  
  // ROR calculation
  const ror = (a * d) / (b * c);
  const seRor = Math.sqrt(1/a + 1/b + 1/c + 1/d);
  const rorLower = ror * Math.exp(-1.96 * seRor);
  const rorUpper = ror * Math.exp(1.96 * seRor);
  
  // Chi-square calculation
  const expected = ((a + b) * (a + c)) / n;
  const chi2 = Math.pow(a - expected, 2) / expected;
  
  return { prr, prrLower, prrUpper, ror, rorLower, rorUpper, chi2 };
}
