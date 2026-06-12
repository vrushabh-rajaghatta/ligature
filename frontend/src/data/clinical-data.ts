// Clinical Module Data - Trial Management, Protocol Tracking, TMF, Site Management
// Designed for cross-module connectivity with Safety, IND Readiness, and Submissions

import { products } from './mock';

// ============================================================================
// CLINICAL DATA TYPES
// ============================================================================

export type ClinicalView = 
  | 'overview' 
  | 'trials' 
  | 'trial-detail' 
  | 'protocols' 
  | 'sites' 
  | 'enrollment' 
  | 'tmf' 
  | 'endpoints';

export type TrialPhase = 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 2/3' | 'Phase 3' | 'Phase 4';
export type TrialStatus = 'planning' | 'startup' | 'enrolling' | 'active' | 'follow-up' | 'completing' | 'completed' | 'on-hold' | 'terminated';
export type SiteStatus = 'identified' | 'selected' | 'activated' | 'enrolling' | 'closed' | 'on-hold';
export type TMFZone = 'zone-1' | 'zone-2' | 'zone-3' | 'zone-4' | 'zone-5' | 'zone-6' | 'zone-7' | 'zone-8';
export type DocumentStatus = 'expected' | 'pending' | 'draft' | 'in-review' | 'approved' | 'final' | 'superseded';

// ============================================================================
// TRIAL & PROTOCOL TYPES
// ============================================================================

export interface ClinicalTrial {
  id: string;
  protocolNumber: string;
  title: string;
  shortTitle: string;
  productId: string;
  phase: TrialPhase;
  indication: string;
  status: TrialStatus;
  sponsor: string;
  
  // Enrollment
  enrolledSubjects: number;
  targetEnrollment: number;
  screenFailureRate: number;
  randomizationRatio: string;
  
  // Sites
  totalSites: number;
  activeSites: number;
  countries: string[];
  
  // Timeline
  firstPatientIn?: string;
  lastPatientIn?: string;
  lastPatientLastVisit?: string;
  primaryCompletionDate?: string;
  studyCompletionDate?: string;
  databaseLockDate?: string;
  
  // Regulatory
  indNumbers: string[];
  ctaNumbers: string[];
  nctNumber?: string;
  eudractNumber?: string;
  
  // Study Design
  arms: StudyArm[];
  endpoints: Endpoint[];
  visitSchedule: VisitSchedule[];
  
  // TMF
  tmfCompleteness: number;
  essentialDocuments: number;
  expectedDocuments: number;
  
  // Safety linkage
  safetySignalIds: string[];
  
  // Team
  medicalMonitor: string;
  projectManager: string;
  cro?: string;
  
  // Metrics
  queryRate: number; // queries per 100 subjects
  protocolDeviationRate: number;
  dataEntryLag: number; // days
  
  // Risk indicators
  riskScore: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: TrialRiskFactor[];
}

export interface StudyArm {
  id: string;
  name: string;
  description: string;
  treatmentType: 'experimental' | 'comparator' | 'placebo';
  subjects: number;
  targetSubjects: number;
}

export interface Endpoint {
  id: string;
  type: 'primary' | 'secondary' | 'exploratory' | 'safety';
  name: string;
  description: string;
  assessmentTimepoint: string;
  status: 'on-track' | 'at-risk' | 'achieved' | 'not-achieved' | 'pending';
  targetValue?: string;
  currentValue?: string;
}

export interface VisitSchedule {
  visitNumber: string;
  visitName: string;
  windowDays: string;
  procedures: string[];
  required: boolean;
}

export interface TrialRiskFactor {
  id: string;
  category: 'enrollment' | 'safety' | 'data-quality' | 'regulatory' | 'operational' | 'supply';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'closed';
}

// ============================================================================
// SITE TYPES
// ============================================================================

export interface ClinicalSite {
  id: string;
  siteNumber: string;
  trialId: string;
  name: string;
  institutionType: 'academic' | 'community' | 'government' | 'private';
  address: {
    city: string;
    state?: string;
    country: string;
    countryCode: string;
  };
  status: SiteStatus;
  
  // Personnel
  principalInvestigator: string;
  subInvestigators: string[];
  studyCoordinator: string;
  
  // Enrollment
  enrolledSubjects: number;
  targetEnrollment: number;
  screeningRate: number; // per month
  screenFailureRate: number;
  
  // Performance
  queryRate: number;
  protocolDeviationCount: number;
  dataEntryLag: number;
  
  // Timeline
  activationDate?: string;
  firstPatientDate?: string;
  
  // Documents
  documentsComplete: number;
  documentsExpected: number;
  
  // Risk
  performanceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
}

// ============================================================================
// TMF TYPES (DIA TMF Reference Model aligned)
// ============================================================================

export interface TMFSection {
  id: string;
  zone: TMFZone;
  zoneName: string;
  sectionNumber: string;
  sectionName: string;
  artifactCount: number;
  completeness: number;
  criticalArtifacts: number;
  criticalComplete: number;
}

export interface TMFArtifact {
  id: string;
  trialId: string;
  zone: TMFZone;
  sectionNumber: string;
  artifactNumber: string;
  artifactName: string;
  subArtifact?: string;
  level: 'trial' | 'country' | 'site';
  siteId?: string;
  countryCode?: string;
  status: DocumentStatus;
  isCritical: boolean;
  currentVersion?: string;
  lastUpdated?: string;
  owner: string;
  dueDate?: string;
  documentPath?: string;
  comments?: string;
}

// ============================================================================
// ENROLLMENT & PATIENT TYPES
// ============================================================================

export interface EnrollmentMilestone {
  id: string;
  trialId: string;
  milestone: string;
  targetDate: string;
  actualDate?: string;
  targetCount?: number;
  actualCount?: number;
  status: 'completed' | 'on-track' | 'at-risk' | 'delayed' | 'pending';
  type: 'fpi' | 'enrollment' | 'lpi' | 'lplv' | 'dbl' | 'csr';
}

export interface EnrollmentTrend {
  date: string;
  enrolled: number;
  target: number;
  screened: number;
}

export interface PatientDisposition {
  category: string;
  count: number;
  percentage: number;
}

// ============================================================================
// CROSS-MODULE INTEGRATION TYPES
// ============================================================================

export interface ClinicalSafetyLink {
  trialId: string;
  signalId: string;
  signalName: string;
  eventCount: number;
  lastUpdated: string;
  status: 'monitoring' | 'investigating' | 'confirmed' | 'refuted';
}

export interface ClinicalINDLink {
  trialId: string;
  indSubmissionId: string;
  moduleSection: string;
  documentType: string;
  status: 'not-started' | 'in-progress' | 'complete';
  targetDate: string;
}

export interface ClinicalSubmissionLink {
  trialId: string;
  submissionId: string;
  submissionType: string;
  region: string;
  csrStatus: 'not-started' | 'drafting' | 'in-review' | 'final';
  datasetStatus: 'not-started' | 'in-progress' | 'validated' | 'submitted';
}

// ============================================================================
// MOCK DATA
// ============================================================================

export const clinicalTrials: ClinicalTrial[] = [
  {
    id: 'trial-001',
    protocolNumber: 'LIG-2847-301',
    title: 'A Randomized, Open-Label, Phase 3 Study of Ligrastinib Versus Docetaxel in Previously Treated Patients with KRAS G12C-Mutant Non-Small Cell Lung Cancer',
    shortTitle: 'LIGATURE-1',
    productId: 'lig-2847',
    phase: 'Phase 3',
    indication: 'KRAS G12C NSCLC',
    status: 'active',
    sponsor: 'Ligature Therapeutics',
    enrolledSubjects: 612,
    targetEnrollment: 650,
    screenFailureRate: 18,
    randomizationRatio: '2:1',
    totalSites: 85,
    activeSites: 78,
    countries: ['USA', 'Germany', 'France', 'UK', 'Japan', 'South Korea', 'Australia', 'Canada', 'Spain', 'Italy', 'Netherlands', 'Belgium'],
    firstPatientIn: '2023-03-15',
    lastPatientIn: '2024-11-20',
    lastPatientLastVisit: '2025-03-15',
    primaryCompletionDate: '2025-01-15',
    studyCompletionDate: '2025-08-30',
    databaseLockDate: '2025-01-20',
    indNumbers: ['IND-2847-001'],
    ctaNumbers: ['CTA-EU-2847-301', 'CTA-JP-2847-301'],
    nctNumber: 'NCT05123456',
    eudractNumber: '2023-000123-45',
    tmfCompleteness: 87,
    essentialDocuments: 1245,
    expectedDocuments: 1432,
    safetySignalIds: ['signal-001', 'signal-002'],
    medicalMonitor: 'Dr. Sarah Chen',
    projectManager: 'Jennifer Walsh',
    cro: 'IQVIA',
    queryRate: 2.8,
    protocolDeviationRate: 4.2,
    dataEntryLag: 3.2,
    riskScore: 'medium',
    arms: [
      { id: 'arm-1', name: 'Ligrastinib', description: 'Ligrastinib 400mg QD', treatmentType: 'experimental', subjects: 408, targetSubjects: 433 },
      { id: 'arm-2', name: 'Docetaxel', description: 'Docetaxel 75mg/m² Q3W', treatmentType: 'comparator', subjects: 204, targetSubjects: 217 },
    ],
    endpoints: [
      { id: 'ep-1', type: 'primary', name: 'Overall Survival (OS)', description: 'Time from randomization to death from any cause', assessmentTimepoint: 'Primary analysis', status: 'on-track', targetValue: 'HR ≤ 0.75', currentValue: 'HR 0.68 (interim)' },
      { id: 'ep-2', type: 'secondary', name: 'Progression-Free Survival (PFS)', description: 'Time from randomization to disease progression or death', assessmentTimepoint: 'Primary analysis', status: 'achieved', targetValue: 'HR ≤ 0.65', currentValue: 'HR 0.52' },
      { id: 'ep-3', type: 'secondary', name: 'Objective Response Rate (ORR)', description: 'Proportion of patients with CR or PR', assessmentTimepoint: 'Week 12', status: 'achieved', targetValue: '≥ 35%', currentValue: '42%' },
      { id: 'ep-4', type: 'secondary', name: 'Duration of Response (DOR)', description: 'Time from first response to progression', assessmentTimepoint: 'Primary analysis', status: 'on-track' },
      { id: 'ep-5', type: 'safety', name: 'Safety and Tolerability', description: 'AE incidence and severity', assessmentTimepoint: 'Continuous', status: 'on-track' },
    ],
    visitSchedule: [
      { visitNumber: 'V1', visitName: 'Screening', windowDays: '-28 to -1', procedures: ['Informed Consent', 'Medical History', 'KRAS Testing', 'CT Scan'], required: true },
      { visitNumber: 'V2', visitName: 'Baseline/Randomization', windowDays: 'Day 1', procedures: ['Randomization', 'First Dose', 'Labs', 'ECG'], required: true },
      { visitNumber: 'V3', visitName: 'Week 3', windowDays: '±3 days', procedures: ['Safety Assessment', 'Labs'], required: true },
      { visitNumber: 'V4', visitName: 'Week 6', windowDays: '±3 days', procedures: ['Safety Assessment', 'Labs', 'CT Scan'], required: true },
    ],
    riskFactors: [
      { id: 'rf-1', category: 'enrollment', description: 'Enrollment slower than projected in EU sites', impact: 'medium', likelihood: 'medium', mitigation: 'Adding 5 new sites in Germany and France', owner: 'Jennifer Walsh', status: 'open' },
      { id: 'rf-2', category: 'data-quality', description: 'Query rate above target at 10 sites', impact: 'medium', likelihood: 'low', mitigation: 'Enhanced monitoring and site training scheduled', owner: 'Data Management', status: 'mitigated' },
    ],
  },
  {
    id: 'trial-002',
    protocolNumber: 'LIG-2847-302',
    title: 'A Randomized, Double-Blind, Phase 3 Study of Ligrastinib in Combination with Pembrolizumab Versus Pembrolizumab Alone in First-Line KRAS G12C-Mutant NSCLC',
    shortTitle: 'LIGATURE-2',
    productId: 'lig-2847',
    phase: 'Phase 3',
    indication: 'KRAS G12C NSCLC 1L',
    status: 'enrolling',
    sponsor: 'Ligature Therapeutics',
    enrolledSubjects: 280,
    targetEnrollment: 450,
    screenFailureRate: 22,
    randomizationRatio: '1:1',
    totalSites: 62,
    activeSites: 58,
    countries: ['USA', 'Germany', 'France', 'UK', 'Japan', 'Canada', 'Australia', 'Italy', 'Spain'],
    firstPatientIn: '2023-09-01',
    primaryCompletionDate: '2026-03-30',
    studyCompletionDate: '2026-12-15',
    indNumbers: ['IND-2847-001'],
    ctaNumbers: ['CTA-EU-2847-302'],
    nctNumber: 'NCT05234567',
    tmfCompleteness: 72,
    essentialDocuments: 892,
    expectedDocuments: 1238,
    safetySignalIds: ['signal-001'],
    medicalMonitor: 'Dr. Michael Ross',
    projectManager: 'Robert Martinez',
    cro: 'PPD',
    queryRate: 3.1,
    protocolDeviationRate: 3.8,
    dataEntryLag: 2.8,
    riskScore: 'medium',
    arms: [
      { id: 'arm-1', name: 'Ligrastinib + Pembrolizumab', description: 'Ligrastinib 400mg QD + Pembrolizumab 200mg Q3W', treatmentType: 'experimental', subjects: 140, targetSubjects: 225 },
      { id: 'arm-2', name: 'Pembrolizumab', description: 'Pembrolizumab 200mg Q3W', treatmentType: 'comparator', subjects: 140, targetSubjects: 225 },
    ],
    endpoints: [
      { id: 'ep-1', type: 'primary', name: 'Progression-Free Survival (PFS)', description: 'Time from randomization to disease progression or death', assessmentTimepoint: 'Primary analysis', status: 'pending' },
      { id: 'ep-2', type: 'secondary', name: 'Overall Survival (OS)', description: 'Time from randomization to death from any cause', assessmentTimepoint: 'Final analysis', status: 'pending' },
    ],
    visitSchedule: [],
    riskFactors: [
      { id: 'rf-1', category: 'enrollment', description: 'Screen failure rate above target', impact: 'high', likelihood: 'high', mitigation: 'Protocol amendment to expand eligibility criteria', owner: 'Medical Affairs', status: 'open' },
    ],
  },
  {
    id: 'trial-003',
    protocolNumber: 'LIG-4055-101',
    title: 'A Phase 1, First-in-Human, Dose Escalation and Expansion Study of Pancrastinib in Patients with KRAS G12D-Mutant Advanced Solid Tumors',
    shortTitle: 'PANCRAS-1',
    productId: 'lig-4055',
    phase: 'Phase 1',
    indication: 'KRAS G12D Solid Tumors',
    status: 'enrolling',
    sponsor: 'Ligature Therapeutics',
    enrolledSubjects: 28,
    targetEnrollment: 90,
    screenFailureRate: 25,
    randomizationRatio: 'N/A',
    totalSites: 12,
    activeSites: 10,
    countries: ['USA', 'UK', 'Australia'],
    firstPatientIn: '2024-06-15',
    primaryCompletionDate: '2025-12-15',
    studyCompletionDate: '2026-06-30',
    indNumbers: ['IND-4055-001'],
    ctaNumbers: [],
    nctNumber: 'NCT05345678',
    tmfCompleteness: 65,
    essentialDocuments: 312,
    expectedDocuments: 480,
    safetySignalIds: [],
    medicalMonitor: 'Dr. Emily Thompson',
    projectManager: 'David Kim',
    queryRate: 2.1,
    protocolDeviationRate: 2.5,
    dataEntryLag: 2.2,
    riskScore: 'low',
    arms: [
      { id: 'arm-1', name: 'Dose Escalation', description: 'Pancrastinib dose levels 50mg-800mg QD', treatmentType: 'experimental', subjects: 18, targetSubjects: 40 },
      { id: 'arm-2', name: 'Expansion - Pancreatic', description: 'Pancrastinib at RP2D in pancreatic cancer', treatmentType: 'experimental', subjects: 10, targetSubjects: 50 },
    ],
    endpoints: [
      { id: 'ep-1', type: 'primary', name: 'Maximum Tolerated Dose (MTD)', description: 'Highest dose with DLT rate < 33%', assessmentTimepoint: 'Dose escalation', status: 'on-track' },
      { id: 'ep-2', type: 'primary', name: 'Recommended Phase 2 Dose (RP2D)', description: 'Optimal dose for expansion', assessmentTimepoint: 'Dose escalation', status: 'pending' },
      { id: 'ep-3', type: 'secondary', name: 'Pharmacokinetics', description: 'PK parameters (Cmax, AUC, t1/2)', assessmentTimepoint: 'Cycle 1', status: 'on-track' },
    ],
    visitSchedule: [],
    riskFactors: [],
  },
  {
    id: 'trial-004',
    protocolNumber: 'LIG-1182-301',
    title: 'A Randomized, Open-Label, Phase 3 Study of Ligamab Versus Trastuzumab Deruxtecan in Previously Treated HER2-Positive Metastatic Breast Cancer',
    shortTitle: 'LIGAMAB-1',
    productId: 'lig-1182',
    phase: 'Phase 3',
    indication: 'HER2+ Breast Cancer',
    status: 'active',
    sponsor: 'Ligature Therapeutics',
    enrolledSubjects: 445,
    targetEnrollment: 600,
    screenFailureRate: 15,
    randomizationRatio: '1:1',
    totalSites: 72,
    activeSites: 68,
    countries: ['USA', 'Germany', 'France', 'UK', 'Japan', 'South Korea', 'China', 'Brazil', 'Canada', 'Spain', 'Italy'],
    firstPatientIn: '2023-06-01',
    primaryCompletionDate: '2025-06-30',
    studyCompletionDate: '2026-03-15',
    indNumbers: ['IND-1182-001'],
    ctaNumbers: ['CTA-EU-1182-301', 'CTA-JP-1182-301', 'CTA-CN-1182-301'],
    nctNumber: 'NCT05456789',
    eudractNumber: '2023-000456-78',
    tmfCompleteness: 82,
    essentialDocuments: 1089,
    expectedDocuments: 1328,
    safetySignalIds: ['signal-003'],
    medicalMonitor: 'Dr. Lisa Park',
    projectManager: 'Amanda Chen',
    cro: 'ICON',
    queryRate: 2.5,
    protocolDeviationRate: 3.2,
    dataEntryLag: 2.9,
    riskScore: 'low',
    arms: [
      { id: 'arm-1', name: 'Ligamab', description: 'Ligamab 5.4mg/kg Q3W', treatmentType: 'experimental', subjects: 223, targetSubjects: 300 },
      { id: 'arm-2', name: 'T-DXd', description: 'Trastuzumab deruxtecan 5.4mg/kg Q3W', treatmentType: 'comparator', subjects: 222, targetSubjects: 300 },
    ],
    endpoints: [
      { id: 'ep-1', type: 'primary', name: 'Progression-Free Survival (PFS)', description: 'Time from randomization to disease progression or death', assessmentTimepoint: 'Primary analysis', status: 'on-track' },
      { id: 'ep-2', type: 'secondary', name: 'Overall Survival (OS)', description: 'Time from randomization to death from any cause', assessmentTimepoint: 'Final analysis', status: 'pending' },
      { id: 'ep-3', type: 'secondary', name: 'Objective Response Rate (ORR)', description: 'Proportion with CR or PR', assessmentTimepoint: 'Week 12', status: 'on-track', targetValue: '≥ 45%', currentValue: '52%' },
    ],
    visitSchedule: [],
    riskFactors: [],
  },
];

export const clinicalSites: ClinicalSite[] = [
  // LIGATURE-1 Sites
  { id: 'site-001', siteNumber: '001', trialId: 'trial-001', name: 'MD Anderson Cancer Center', institutionType: 'academic', address: { city: 'Houston', state: 'TX', country: 'United States', countryCode: 'US' }, status: 'enrolling', principalInvestigator: 'Dr. John Smith', subInvestigators: ['Dr. Maria Garcia', 'Dr. James Wilson'], studyCoordinator: 'Sarah Johnson', enrolledSubjects: 42, targetEnrollment: 45, screeningRate: 4.2, screenFailureRate: 18, queryRate: 2.1, protocolDeviationCount: 3, dataEntryLag: 2.5, documentsComplete: 156, documentsExpected: 168, performanceScore: 92, riskLevel: 'low', activationDate: '2023-02-15', firstPatientDate: '2023-03-18' },
  { id: 'site-002', siteNumber: '002', trialId: 'trial-001', name: 'Memorial Sloan Kettering Cancer Center', institutionType: 'academic', address: { city: 'New York', state: 'NY', country: 'United States', countryCode: 'US' }, status: 'enrolling', principalInvestigator: 'Dr. Lisa Park', subInvestigators: ['Dr. Robert Chen'], studyCoordinator: 'Michael Brown', enrolledSubjects: 38, targetEnrollment: 40, screeningRate: 3.8, screenFailureRate: 22, queryRate: 2.8, protocolDeviationCount: 5, dataEntryLag: 3.1, documentsComplete: 148, documentsExpected: 162, performanceScore: 85, riskLevel: 'low', activationDate: '2023-02-20', firstPatientDate: '2023-03-22' },
  { id: 'site-003', siteNumber: '003', trialId: 'trial-001', name: 'Dana-Farber Cancer Institute', institutionType: 'academic', address: { city: 'Boston', state: 'MA', country: 'United States', countryCode: 'US' }, status: 'enrolling', principalInvestigator: 'Dr. Robert Chen', subInvestigators: [], studyCoordinator: 'Emily Davis', enrolledSubjects: 35, targetEnrollment: 40, screeningRate: 3.5, screenFailureRate: 15, queryRate: 1.9, protocolDeviationCount: 2, dataEntryLag: 2.2, documentsComplete: 152, documentsExpected: 162, performanceScore: 94, riskLevel: 'low', activationDate: '2023-02-18', firstPatientDate: '2023-03-20' },
  { id: 'site-004', siteNumber: '101', trialId: 'trial-001', name: 'Charité University Hospital', institutionType: 'academic', address: { city: 'Berlin', country: 'Germany', countryCode: 'DE' }, status: 'enrolling', principalInvestigator: 'Dr. Hans Mueller', subInvestigators: ['Dr. Anna Schmidt'], studyCoordinator: 'Klaus Weber', enrolledSubjects: 28, targetEnrollment: 30, screeningRate: 2.8, screenFailureRate: 20, queryRate: 3.2, protocolDeviationCount: 4, dataEntryLag: 3.5, documentsComplete: 138, documentsExpected: 158, performanceScore: 78, riskLevel: 'medium', activationDate: '2023-04-10', firstPatientDate: '2023-04-25' },
  { id: 'site-005', siteNumber: '102', trialId: 'trial-001', name: 'Gustave Roussy', institutionType: 'academic', address: { city: 'Paris', country: 'France', countryCode: 'FR' }, status: 'enrolling', principalInvestigator: 'Dr. Marie Dubois', subInvestigators: [], studyCoordinator: 'Pierre Martin', enrolledSubjects: 32, targetEnrollment: 35, screeningRate: 3.2, screenFailureRate: 12, queryRate: 2.2, protocolDeviationCount: 2, dataEntryLag: 2.8, documentsComplete: 144, documentsExpected: 158, performanceScore: 91, riskLevel: 'low', activationDate: '2023-04-05', firstPatientDate: '2023-04-18' },
  { id: 'site-006', siteNumber: '201', trialId: 'trial-001', name: 'National Cancer Center', institutionType: 'government', address: { city: 'Tokyo', country: 'Japan', countryCode: 'JP' }, status: 'enrolling', principalInvestigator: 'Dr. Kenji Tanaka', subInvestigators: ['Dr. Yuki Sato'], studyCoordinator: 'Akiko Yamamoto', enrolledSubjects: 25, targetEnrollment: 30, screeningRate: 2.5, screenFailureRate: 25, queryRate: 2.5, protocolDeviationCount: 3, dataEntryLag: 3.8, documentsComplete: 135, documentsExpected: 158, performanceScore: 82, riskLevel: 'medium', activationDate: '2023-05-15', firstPatientDate: '2023-06-01' },
  // PANCRAS-1 Sites  
  { id: 'site-007', siteNumber: '001', trialId: 'trial-003', name: 'UCSF Helen Diller Cancer Center', institutionType: 'academic', address: { city: 'San Francisco', state: 'CA', country: 'United States', countryCode: 'US' }, status: 'enrolling', principalInvestigator: 'Dr. Emily Thompson', subInvestigators: [], studyCoordinator: 'Kevin Lee', enrolledSubjects: 8, targetEnrollment: 15, screeningRate: 2.0, screenFailureRate: 25, queryRate: 1.8, protocolDeviationCount: 1, dataEntryLag: 2.0, documentsComplete: 42, documentsExpected: 56, performanceScore: 88, riskLevel: 'low', activationDate: '2024-05-20', firstPatientDate: '2024-06-15' },
  { id: 'site-008', siteNumber: '002', trialId: 'trial-003', name: 'Johns Hopkins Sidney Kimmel Cancer Center', institutionType: 'academic', address: { city: 'Baltimore', state: 'MD', country: 'United States', countryCode: 'US' }, status: 'enrolling', principalInvestigator: 'Dr. David Kim', subInvestigators: ['Dr. Nancy Wu'], studyCoordinator: 'Jennifer Adams', enrolledSubjects: 6, targetEnrollment: 15, screeningRate: 1.5, screenFailureRate: 28, queryRate: 2.2, protocolDeviationCount: 0, dataEntryLag: 2.4, documentsComplete: 38, documentsExpected: 56, performanceScore: 85, riskLevel: 'low', activationDate: '2024-05-25', firstPatientDate: '2024-06-22' },
];

export const tmfSections: TMFSection[] = [
  { id: 'tmf-z1', zone: 'zone-1', zoneName: 'Trial Master File', sectionNumber: '01', sectionName: 'Trial Oversight', artifactCount: 45, completeness: 92, criticalArtifacts: 12, criticalComplete: 11 },
  { id: 'tmf-z2', zone: 'zone-2', zoneName: 'Central Trial Documents', sectionNumber: '02', sectionName: 'Central Trial Documents', artifactCount: 68, completeness: 88, criticalArtifacts: 18, criticalComplete: 16 },
  { id: 'tmf-z3', zone: 'zone-3', zoneName: 'Regulatory', sectionNumber: '03', sectionName: 'Regulatory Documents', artifactCount: 124, completeness: 85, criticalArtifacts: 32, criticalComplete: 27 },
  { id: 'tmf-z4', zone: 'zone-4', zoneName: 'IRB/IEC', sectionNumber: '04', sectionName: 'IRB/Ethics', artifactCount: 156, completeness: 78, criticalArtifacts: 45, criticalComplete: 35 },
  { id: 'tmf-z5', zone: 'zone-5', zoneName: 'Site Management', sectionNumber: '05', sectionName: 'Site Documents', artifactCount: 892, completeness: 82, criticalArtifacts: 168, criticalComplete: 138 },
  { id: 'tmf-z6', zone: 'zone-6', zoneName: 'IP & Trial Supplies', sectionNumber: '06', sectionName: 'Investigational Product', artifactCount: 78, completeness: 91, criticalArtifacts: 22, criticalComplete: 20 },
  { id: 'tmf-z7', zone: 'zone-7', zoneName: 'Safety Reporting', sectionNumber: '07', sectionName: 'Safety Reports', artifactCount: 234, completeness: 94, criticalArtifacts: 56, criticalComplete: 53 },
  { id: 'tmf-z8', zone: 'zone-8', zoneName: 'Statistics & Data', sectionNumber: '08', sectionName: 'Statistics', artifactCount: 45, completeness: 72, criticalArtifacts: 15, criticalComplete: 11 },
];

export const tmfArtifacts: TMFArtifact[] = [
  // Zone 1 - Trial Oversight
  { id: 'art-001', trialId: 'trial-001', zone: 'zone-1', sectionNumber: '01.01', artifactNumber: '01.01.01', artifactName: 'Trial Master File Plan', level: 'trial', status: 'final', isCritical: true, currentVersion: '2.0', lastUpdated: '2024-06-15', owner: 'Document Management', dueDate: '2023-01-15' },
  { id: 'art-002', trialId: 'trial-001', zone: 'zone-1', sectionNumber: '01.02', artifactNumber: '01.02.01', artifactName: 'Sponsor Organization Chart', level: 'trial', status: 'final', isCritical: false, currentVersion: '3.0', lastUpdated: '2024-09-01', owner: 'Project Management' },
  { id: 'art-003', trialId: 'trial-001', zone: 'zone-1', sectionNumber: '01.03', artifactNumber: '01.03.01', artifactName: 'Delegation Log', level: 'trial', status: 'approved', isCritical: true, currentVersion: '1.5', lastUpdated: '2024-12-01', owner: 'Clinical Operations' },
  // Zone 3 - Regulatory  
  { id: 'art-010', trialId: 'trial-001', zone: 'zone-3', sectionNumber: '03.01', artifactNumber: '03.01.01', artifactName: 'IND Application', level: 'trial', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-01-10', owner: 'Regulatory Affairs' },
  { id: 'art-011', trialId: 'trial-001', zone: 'zone-3', sectionNumber: '03.01', artifactNumber: '03.01.02', artifactName: 'FDA Acknowledgement Letter', level: 'trial', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-02-01', owner: 'Regulatory Affairs' },
  { id: 'art-012', trialId: 'trial-001', zone: 'zone-3', sectionNumber: '03.02', artifactNumber: '03.02.01', artifactName: 'Protocol', subArtifact: 'Version 3.0', level: 'trial', status: 'final', isCritical: true, currentVersion: '3.0', lastUpdated: '2024-03-15', owner: 'Medical Writing' },
  { id: 'art-013', trialId: 'trial-001', zone: 'zone-3', sectionNumber: '03.02', artifactNumber: '03.02.02', artifactName: 'Protocol Amendment 1', level: 'trial', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-09-20', owner: 'Medical Writing' },
  { id: 'art-014', trialId: 'trial-001', zone: 'zone-3', sectionNumber: '03.03', artifactNumber: '03.03.01', artifactName: 'Investigator Brochure', level: 'trial', status: 'approved', isCritical: true, currentVersion: '4.0', lastUpdated: '2024-08-15', owner: 'Regulatory Affairs' },
  // Zone 5 - Site Documents (country/site level)
  { id: 'art-020', trialId: 'trial-001', zone: 'zone-5', sectionNumber: '05.01', artifactNumber: '05.01.01', artifactName: 'Site Selection Visit Report', level: 'site', siteId: 'site-001', status: 'final', isCritical: false, currentVersion: '1.0', lastUpdated: '2023-01-20', owner: 'Clinical Operations' },
  { id: 'art-021', trialId: 'trial-001', zone: 'zone-5', sectionNumber: '05.02', artifactNumber: '05.02.01', artifactName: 'Confidentiality Agreement', level: 'site', siteId: 'site-001', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-01-15', owner: 'Legal' },
  { id: 'art-022', trialId: 'trial-001', zone: 'zone-5', sectionNumber: '05.03', artifactNumber: '05.03.01', artifactName: 'Clinical Trial Agreement', level: 'site', siteId: 'site-001', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-02-10', owner: 'Legal' },
  { id: 'art-023', trialId: 'trial-001', zone: 'zone-5', sectionNumber: '05.04', artifactNumber: '05.04.01', artifactName: 'Site Initiation Visit Report', level: 'site', siteId: 'site-001', status: 'final', isCritical: true, currentVersion: '1.0', lastUpdated: '2023-02-28', owner: 'Clinical Operations' },
  { id: 'art-024', trialId: 'trial-001', zone: 'zone-5', sectionNumber: '05.05', artifactNumber: '05.05.01', artifactName: 'Monitoring Visit Report', subArtifact: 'Visit 12', level: 'site', siteId: 'site-001', status: 'approved', isCritical: false, currentVersion: '1.0', lastUpdated: '2024-11-15', owner: 'Clinical Operations' },
];

export const enrollmentMilestones: EnrollmentMilestone[] = [
  { id: 'em-001', trialId: 'trial-001', milestone: 'First Patient First Visit', targetDate: '2023-03-15', actualDate: '2023-03-18', status: 'completed', type: 'fpi' },
  { id: 'em-002', trialId: 'trial-001', milestone: '25% Enrollment', targetDate: '2023-09-01', actualDate: '2023-09-12', targetCount: 163, actualCount: 163, status: 'completed', type: 'enrollment' },
  { id: 'em-003', trialId: 'trial-001', milestone: '50% Enrollment', targetDate: '2024-03-01', actualDate: '2024-03-20', targetCount: 325, actualCount: 325, status: 'completed', type: 'enrollment' },
  { id: 'em-004', trialId: 'trial-001', milestone: '75% Enrollment', targetDate: '2024-07-15', actualDate: '2024-08-05', targetCount: 488, actualCount: 488, status: 'completed', type: 'enrollment' },
  { id: 'em-005', trialId: 'trial-001', milestone: 'Last Patient In', targetDate: '2024-11-30', actualDate: '2024-11-20', targetCount: 650, actualCount: 612, status: 'completed', type: 'lpi' },
  { id: 'em-006', trialId: 'trial-001', milestone: 'Last Patient Last Visit', targetDate: '2025-03-15', targetCount: 612, status: 'on-track', type: 'lplv' },
  { id: 'em-007', trialId: 'trial-001', milestone: 'Database Lock', targetDate: '2025-01-20', status: 'on-track', type: 'dbl' },
  { id: 'em-008', trialId: 'trial-001', milestone: 'Clinical Study Report', targetDate: '2025-02-28', status: 'pending', type: 'csr' },
  // Trial 002
  { id: 'em-010', trialId: 'trial-002', milestone: 'First Patient First Visit', targetDate: '2023-09-01', actualDate: '2023-09-05', status: 'completed', type: 'fpi' },
  { id: 'em-011', trialId: 'trial-002', milestone: '50% Enrollment', targetDate: '2024-12-15', targetCount: 225, actualCount: 280, status: 'at-risk', type: 'enrollment' },
  // Trial 003
  { id: 'em-020', trialId: 'trial-003', milestone: 'First Patient First Visit', targetDate: '2024-06-15', actualDate: '2024-06-15', status: 'completed', type: 'fpi' },
  { id: 'em-021', trialId: 'trial-003', milestone: 'Dose Escalation Complete', targetDate: '2025-06-15', targetCount: 40, actualCount: 18, status: 'on-track', type: 'enrollment' },
];

export const enrollmentTrends: Record<string, EnrollmentTrend[]> = {
  'trial-001': [
    { date: '2023-04', enrolled: 15, target: 20, screened: 22 },
    { date: '2023-05', enrolled: 38, target: 50, screened: 52 },
    { date: '2023-06', enrolled: 72, target: 85, screened: 95 },
    { date: '2023-07', enrolled: 108, target: 120, screened: 140 },
    { date: '2023-08', enrolled: 148, target: 160, screened: 188 },
    { date: '2023-09', enrolled: 185, target: 200, screened: 232 },
    { date: '2023-10', enrolled: 228, target: 245, screened: 282 },
    { date: '2023-11', enrolled: 272, target: 290, screened: 335 },
    { date: '2023-12', enrolled: 310, target: 335, screened: 382 },
    { date: '2024-01', enrolled: 352, target: 380, screened: 432 },
    { date: '2024-02', enrolled: 390, target: 425, screened: 478 },
    { date: '2024-03', enrolled: 428, target: 470, screened: 525 },
    { date: '2024-04', enrolled: 465, target: 510, screened: 570 },
    { date: '2024-05', enrolled: 498, target: 545, screened: 612 },
    { date: '2024-06', enrolled: 528, target: 575, screened: 648 },
    { date: '2024-07', enrolled: 552, target: 600, screened: 678 },
    { date: '2024-08', enrolled: 575, target: 620, screened: 705 },
    { date: '2024-09', enrolled: 592, target: 635, screened: 725 },
    { date: '2024-10', enrolled: 605, target: 645, screened: 742 },
    { date: '2024-11', enrolled: 612, target: 650, screened: 752 },
  ],
};

// ============================================================================
// CROSS-MODULE LINKS
// ============================================================================

export const clinicalSafetyLinks: ClinicalSafetyLink[] = [
  { trialId: 'trial-001', signalId: 'signal-001', signalName: 'Hepatotoxicity Signal', eventCount: 23, lastUpdated: '2024-12-10', status: 'monitoring' },
  { trialId: 'trial-001', signalId: 'signal-002', signalName: 'QT Prolongation', eventCount: 8, lastUpdated: '2024-11-28', status: 'investigating' },
  { trialId: 'trial-004', signalId: 'signal-003', signalName: 'ILD Signal', eventCount: 12, lastUpdated: '2024-12-05', status: 'monitoring' },
];

export const clinicalINDLinks: ClinicalINDLink[] = [
  { trialId: 'trial-003', indSubmissionId: 'ind-001', moduleSection: 'M2.5', documentType: 'Clinical Overview', status: 'in-progress', targetDate: '2025-03-15' },
  { trialId: 'trial-003', indSubmissionId: 'ind-001', moduleSection: 'M5.3.3', documentType: 'Clinical Study Reports', status: 'not-started', targetDate: '2025-04-30' },
];

export const clinicalSubmissionLinks: ClinicalSubmissionLink[] = [
  { trialId: 'trial-001', submissionId: 'sub-001', submissionType: 'NDA', region: 'US', csrStatus: 'drafting', datasetStatus: 'in-progress' },
  { trialId: 'trial-001', submissionId: 'sub-002', submissionType: 'MAA', region: 'EU', csrStatus: 'not-started', datasetStatus: 'not-started' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTrialById(trialId: string): ClinicalTrial | undefined {
  return clinicalTrials.find(t => t.id === trialId);
}

export function getTrialsByProductId(productId: string): ClinicalTrial[] {
  return clinicalTrials.filter(t => t.productId === productId);
}

export function getSitesByTrialId(trialId: string): ClinicalSite[] {
  return clinicalSites.filter(s => s.trialId === trialId);
}

export function getTMFArtifactsByTrialId(trialId: string): TMFArtifact[] {
  return tmfArtifacts.filter(a => a.trialId === trialId);
}

export function getTMFArtifactsByZone(trialId: string, zone: TMFZone): TMFArtifact[] {
  return tmfArtifacts.filter(a => a.trialId === trialId && a.zone === zone);
}

export function getEnrollmentMilestonesByTrialId(trialId: string): EnrollmentMilestone[] {
  return enrollmentMilestones.filter(m => m.trialId === trialId);
}

export function getEnrollmentTrendByTrialId(trialId: string): EnrollmentTrend[] {
  return enrollmentTrends[trialId] || [];
}

export function getSafetyLinksByTrialId(trialId: string): ClinicalSafetyLink[] {
  return clinicalSafetyLinks.filter(l => l.trialId === trialId);
}

export function getINDLinksByTrialId(trialId: string): ClinicalINDLink[] {
  return clinicalINDLinks.filter(l => l.trialId === trialId);
}

export function getSubmissionLinksByTrialId(trialId: string): ClinicalSubmissionLink[] {
  return clinicalSubmissionLinks.filter(l => l.trialId === trialId);
}

export function calculateTMFCompleteness(trialId: string): number {
  const artifacts = getTMFArtifactsByTrialId(trialId);
  if (artifacts.length === 0) return 0;
  const complete = artifacts.filter(a => a.status === 'final' || a.status === 'approved').length;
  return Math.round((complete / artifacts.length) * 100);
}

export function getTrialRiskScore(trial: ClinicalTrial): 'low' | 'medium' | 'high' | 'critical' {
  const factors: number[] = [];
  
  // Enrollment risk
  const enrollmentPct = (trial.enrolledSubjects / trial.targetEnrollment) * 100;
  if (enrollmentPct < 50) factors.push(3);
  else if (enrollmentPct < 75) factors.push(2);
  else factors.push(1);
  
  // Data quality risk
  if (trial.queryRate > 4) factors.push(3);
  else if (trial.queryRate > 3) factors.push(2);
  else factors.push(1);
  
  // TMF risk
  if (trial.tmfCompleteness < 70) factors.push(3);
  else if (trial.tmfCompleteness < 85) factors.push(2);
  else factors.push(1);
  
  const avgRisk = factors.reduce((a, b) => a + b, 0) / factors.length;
  if (avgRisk >= 2.5) return 'critical';
  if (avgRisk >= 2) return 'high';
  if (avgRisk >= 1.5) return 'medium';
  return 'low';
}

export function getUpcomingMilestones(days: number = 30): EnrollmentMilestone[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return enrollmentMilestones
    .filter(m => {
      if (m.status === 'completed') return false;
      const targetDate = new Date(m.targetDate);
      return targetDate >= now && targetDate <= cutoff;
    })
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
}

export function getTrialMetrics(trial: ClinicalTrial) {
  return {
    enrollmentRate: Math.round((trial.enrolledSubjects / trial.targetEnrollment) * 100),
    siteActivationRate: Math.round((trial.activeSites / trial.totalSites) * 100),
    tmfCompleteness: trial.tmfCompleteness,
    queryRate: trial.queryRate,
    deviationRate: trial.protocolDeviationRate,
    dataLag: trial.dataEntryLag,
  };
}
