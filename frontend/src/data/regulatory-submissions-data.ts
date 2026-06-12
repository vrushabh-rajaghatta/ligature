// Regulatory Submissions Portfolio Data
// Supports IND, NDA, BLA, MAA, CTA, and sNDA/sBLA submissions

import { products, applications } from './mock';
import {
  INDSubmission, ModuleReadiness, SectionReadiness, Milestone,
  CriticalPathItem, GapItem, RiskFactor,
  mockMilestones, mockCriticalPath, mockGaps, mockRiskFactors
} from './ind-readiness-data';

// ============================================================================
// DYNAMIC DATE HELPERS - v0.38.5
// Generate realistic dates relative to today
// ============================================================================

function getRelativeDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getPastDate(daysAgo: number): string {
  return getRelativeDate(-daysAgo);
}

function getFutureDate(daysAhead: number): string {
  return getRelativeDate(daysAhead);
}

// ============================================================================
// SUBMISSION TYPES AND INTERFACES
// ============================================================================

export type SubmissionType = 'IND' | 'NDA' | 'BLA' | 'MAA' | 'CTA' | 'sNDA' | 'sBLA' | 'JNDA' | 'NDS';
export type SubmissionStatus = 'on-track' | 'at-risk' | 'delayed' | 'blocked' | 'submitted' | 'approved';

export interface RegulatorySubmission {
  id: string;
  productId: string;
  applicationId?: string; // Link to applications table
  applicationNumber: string;
  submissionType: SubmissionType;
  region: 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'Global';
  agency: 'FDA' | 'EMA' | 'PMDA' | 'NMPA' | 'Health Canada';
  targetDate: string;
  projectedDate: string;
  overallReadiness: number;
  status: SubmissionStatus;
  phase?: string; // For INDs: Phase 1, Phase 2, etc.
  modules: ModuleReadiness[];
  milestones: Milestone[];
  criticalPath: CriticalPathItem[];
  gaps: GapItem[];
  riskFactors: RiskFactor[];
  // Portfolio metadata
  priority: 'critical' | 'high' | 'medium' | 'low';
  programLead: string;
  therapeuticArea: string;
  lastUpdated: string;
  // Progress tracking
  modulesComplete?: number;
  modulesTotal?: number;
}

// ============================================================================
// HELPER FUNCTIONS FOR GENERATING REALISTIC DATA
// ============================================================================

function generateModuleReadiness(
  readinessProfile: 'early' | 'mid' | 'late' | 'complete',
  submissionType: SubmissionType
): ModuleReadiness[] {
  const profiles = {
    early: { m1: 30, m2: 15, m3: 45, m4: 60, m5: 20 },
    mid: { m1: 65, m2: 45, m3: 75, m4: 85, m5: 55 },
    late: { m1: 85, m2: 72, m3: 90, m4: 100, m5: 78 },
    complete: { m1: 100, m2: 100, m3: 100, m4: 100, m5: 100 },
  };
  
  const p = profiles[readinessProfile];
  const getStatus = (pct: number): ModuleReadiness['status'] => {
    if (pct === 100) return 'complete';
    if (pct >= 80) return 'on-track';
    if (pct >= 50) return 'at-risk';
    if (pct > 0) return 'blocked';
    return 'not-started';
  };

  const baseModules: ModuleReadiness[] = [
    {
      moduleId: 'm1', moduleNumber: '1', moduleName: 'Administrative',
      completionPercent: p.m1, documentsTotal: 8, documentsComplete: Math.round(8 * p.m1 / 100),
      documentsDraft: Math.round(8 * (100 - p.m1) / 200), documentsNotStarted: Math.round(8 * (100 - p.m1) / 200),
      status: getStatus(p.m1), owner: 'Regulatory Affairs', dueDate: '2025-02-01',
      sections: [], dependencies: [], blockers: p.m1 < 50 ? ['Awaiting protocol finalization'] : []
    },
    {
      moduleId: 'm2', moduleNumber: '2', moduleName: 'Summaries',
      completionPercent: p.m2, documentsTotal: 6, documentsComplete: Math.round(6 * p.m2 / 100),
      documentsDraft: Math.round(6 * (100 - p.m2) / 200), documentsNotStarted: Math.round(6 * (100 - p.m2) / 200),
      status: getStatus(p.m2), owner: 'Medical Writing', dueDate: '2025-02-10',
      sections: [], dependencies: ['m3', 'm4', 'm5'], blockers: p.m2 < 50 ? ['Dependent on source modules'] : []
    },
    {
      moduleId: 'm3', moduleNumber: '3', moduleName: 'Quality (CMC)',
      completionPercent: p.m3, documentsTotal: 12, documentsComplete: Math.round(12 * p.m3 / 100),
      documentsDraft: Math.round(12 * (100 - p.m3) / 200), documentsNotStarted: Math.round(12 * (100 - p.m3) / 200),
      status: getStatus(p.m3), owner: 'CMC Team', dueDate: '2025-01-25',
      sections: [], dependencies: [], blockers: p.m3 < 70 ? ['Stability data pending'] : []
    },
    {
      moduleId: 'm4', moduleNumber: '4', moduleName: 'Nonclinical',
      completionPercent: p.m4, documentsTotal: 8, documentsComplete: Math.round(8 * p.m4 / 100),
      documentsDraft: Math.round(8 * (100 - p.m4) / 200), documentsNotStarted: Math.round(8 * (100 - p.m4) / 200),
      status: getStatus(p.m4), owner: 'Nonclinical', dueDate: '2025-01-15',
      sections: [], dependencies: [], blockers: []
    },
    {
      moduleId: 'm5', moduleNumber: '5', moduleName: 'Clinical',
      completionPercent: p.m5, documentsTotal: 10, documentsComplete: Math.round(10 * p.m5 / 100),
      documentsDraft: Math.round(10 * (100 - p.m5) / 200), documentsNotStarted: Math.round(10 * (100 - p.m5) / 200),
      status: getStatus(p.m5), owner: 'Clinical Team', dueDate: '2025-02-05',
      sections: [], dependencies: [], blockers: p.m5 < 60 ? ['CSR pending finalization'] : []
    },
  ];

  return baseModules;
}

function generateGaps(count: number, severity: 'critical' | 'major' | 'minor'): GapItem[] {
  const templates: Partial<GapItem>[] = [
    { module: 'Module 3', section: '3.2.P.8.3', category: 'data', description: 'Stability data incomplete', fdaRequirement: 'ICH Q1A', recommendation: 'Expedite stability studies' },
    { module: 'Module 2', section: '2.5', category: 'document', description: 'Clinical Overview pending CSR', fdaRequirement: 'ICH M4E', recommendation: 'Parallel drafting recommended' },
    { module: 'Module 5', section: '5.3.5', category: 'study', description: 'CSR statistical review pending', fdaRequirement: 'ICH E3', recommendation: 'Schedule dedicated review' },
    { module: 'Module 3', section: '3.2.S.4', category: 'data', description: 'Analytical method validation incomplete', fdaRequirement: 'ICH Q2', recommendation: 'Expedite method validation' },
    { module: 'Module 4', section: '4.2.3', category: 'study', description: 'Toxicology study report pending', fdaRequirement: 'ICH S7', recommendation: 'Accelerate report finalization' },
  ];

  return templates.slice(0, count).map((t, i) => ({
    id: `gap-gen-${i}`,
    module: t.module!,
    section: t.section!,
    category: t.category as GapItem['category'],
    description: t.description!,
    severity,
    fdaRequirement: t.fdaRequirement!,
    edmReference: `EDM ${t.section}`,
    recommendation: t.recommendation!,
    estimatedEffort: severity === 'critical' ? '3 weeks' : severity === 'major' ? '2 weeks' : '1 week',
    status: 'open' as const,
  }));
}

function generateMilestones(targetDate: string, status: SubmissionStatus, submissionId: string = 'gen'): Milestone[] {
  const target = new Date(targetDate);
  const now = new Date();
  const daysUntilTarget = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // If target date is a hardcoded past date (more than 60 days ago), shift to be more relevant
  // This handles legacy data that had static 2024/early-2025 dates
  let adjustedDaysUntilTarget = daysUntilTarget;
  if (daysUntilTarget < -60) {
    // For very old submissions, mark them as already submitted/completed
    // and don't generate actionable milestones
    if (status === 'submitted' || status === 'approved') {
      return [
        {
          id: `ms-${submissionId}-4`, name: 'Submission Complete', type: 'regulatory',
          targetDate: targetDate, status: 'completed', dependencies: [], description: 'Submission filed'
        },
      ];
    }
    // For non-submitted old submissions, shift to near future for demo purposes
    adjustedDaysUntilTarget = 30;
  }
  
  const offset = adjustedDaysUntilTarget < 0 ? -adjustedDaysUntilTarget + 30 : 0;
  
  const milestones: Milestone[] = [
    {
      id: `ms-${submissionId}-1`, name: 'Nonclinical Package Complete', type: 'internal',
      targetDate: getRelativeDate(offset - 45 + adjustedDaysUntilTarget),
      status: adjustedDaysUntilTarget > 45 ? 'on-track' : (status === 'on-track' || status === 'submitted' || status === 'approved' ? 'completed' : 'on-track'),
      dependencies: [], description: 'Module 4 finalized'
    },
    {
      id: `ms-${submissionId}-2`, name: 'CMC Package Ready', type: 'internal',
      targetDate: getRelativeDate(offset - 30 + adjustedDaysUntilTarget),
      status: adjustedDaysUntilTarget > 30 ? 'on-track' : (status === 'at-risk' ? 'at-risk' : (status === 'submitted' || status === 'approved' ? 'completed' : 'on-track')),
      dependencies: [], description: 'Module 3 complete'
    },
    {
      id: `ms-${submissionId}-3`, name: 'Clinical Package Complete', type: 'clinical',
      targetDate: getRelativeDate(offset - 20 + adjustedDaysUntilTarget),
      status: adjustedDaysUntilTarget > 20 ? 'on-track' : (status === 'blocked' ? 'at-risk' : (status === 'submitted' || status === 'approved' ? 'completed' : 'on-track')),
      dependencies: [], description: 'Module 5 finalized'
    },
    {
      id: `ms-${submissionId}-4`, name: 'Submission Target', type: 'regulatory',
      targetDate: getRelativeDate(offset + adjustedDaysUntilTarget),
      status: status === 'submitted' || status === 'approved' ? 'completed' : 'on-track',
      dependencies: [], description: 'Target submission date'
    },
  ];
  return milestones;
}

// ============================================================================
// REGULATORY SUBMISSIONS DATA - 35 SUBMISSIONS
// ============================================================================

export const regulatorySubmissions: RegulatorySubmission[] = [
  // ============ ONCOLOGY PORTFOLIO ============
  // LIG-4055 - Pancrastinib (KRAS G12D Pancreatic) - IND
  {
    id: 'sub-001',
    productId: 'lig-4055',
    applicationNumber: 'IND-PENDING',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: getFutureDate(25),
    projectedDate: getFutureDate(28),
    overallReadiness: 72,
    status: 'at-risk',
    phase: 'Phase 1',
    modules: generateModuleReadiness('late', 'IND'),
    milestones: mockMilestones,
    criticalPath: mockCriticalPath,
    gaps: mockGaps,
    riskFactors: mockRiskFactors,
    priority: 'critical',
    programLead: 'Dr. James Wilson',
    therapeuticArea: 'Oncology',
    lastUpdated: getPastDate(3),
  },
  // LIG-4055 - EU CTA
  {
    id: 'sub-002',
    productId: 'lig-4055',
    applicationNumber: 'CTA-2025-001',
    submissionType: 'CTA',
    region: 'EU',
    agency: 'EMA',
    targetDate: getFutureDate(40),
    projectedDate: getFutureDate(45),
    overallReadiness: 58,
    status: 'at-risk',
    phase: 'Phase 1',
    modules: generateModuleReadiness('mid', 'CTA'),
    milestones: generateMilestones(getFutureDate(40), 'at-risk', 'sub-002'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. James Wilson',
    therapeuticArea: 'Oncology',
    lastUpdated: getPastDate(5),
  },

  // LIG-2847 - Nexavant (KRAS G12C NSCLC) - NDA under review
  {
    id: 'sub-003',
    productId: 'lig-2847',
    applicationId: 'app-002',
    applicationNumber: 'NDA 215847',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: getPastDate(180),
    projectedDate: getPastDate(180),
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: generateMilestones(getPastDate(180), 'submitted', 'sub-003'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-10',
  },
  // LIG-2847 - MAA
  {
    id: 'sub-004',
    productId: 'lig-2847',
    applicationId: 'app-003',
    applicationNumber: 'EMEA/H/C/006123',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2024-07-01',
    projectedDate: '2024-07-01',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'MAA'),
    milestones: generateMilestones('2024-07-01', 'submitted', 'sub-004'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-08',
  },

  // LIG-2848 - Nexavant CRC sNDA
  {
    id: 'sub-005',
    productId: 'lig-2848',
    applicationId: 'app-006',
    applicationNumber: 'sNDA 215847-S001',
    submissionType: 'sNDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-12-01',
    projectedDate: '2024-12-01',
    overallReadiness: 100,
    status: 'approved',
    modules: generateModuleReadiness('complete', 'sNDA'),
    milestones: generateMilestones('2024-12-01', 'approved', 'sub-005'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'high',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-01',
  },

  // LIG-3156 - Melnorix (BRAF Melanoma) - IND
  {
    id: 'sub-006',
    productId: 'lig-3156',
    applicationNumber: 'IND 145678',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-04-15',
    projectedDate: '2025-04-20',
    overallReadiness: 45,
    status: 'on-track',
    phase: 'Phase 2',
    modules: generateModuleReadiness('mid', 'IND'),
    milestones: generateMilestones('2025-04-15', 'on-track', 'sub-006'),
    criticalPath: [],
    gaps: generateGaps(1, 'minor'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Sarah Kim',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-11',
  },

  // LIG-4012 - Exontib (EGFR Exon 20) - IND
  {
    id: 'sub-007',
    productId: 'lig-4012',
    applicationNumber: 'IND 156789',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-06-01',
    projectedDate: '2025-06-01',
    overallReadiness: 28,
    status: 'on-track',
    phase: 'Phase 1',
    modules: generateModuleReadiness('early', 'IND'),
    milestones: generateMilestones('2025-06-01', 'on-track', 'sub-007'),
    criticalPath: [],
    gaps: generateGaps(3, 'major'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Michael Chen',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-09',
  },

  // LIG-1182 - Oncorix (HER2+ Breast) - BLA
  {
    id: 'sub-008',
    productId: 'lig-1182',
    applicationId: 'app-008',
    applicationNumber: 'BLA 761234',
    submissionType: 'BLA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-08-15',
    projectedDate: '2024-08-15',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'BLA'),
    milestones: generateMilestones('2024-08-15', 'submitted', 'sub-008'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. Lisa Martinez',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-05',
  },
  // LIG-1182 - MAA
  {
    id: 'sub-009',
    productId: 'lig-1182',
    applicationId: 'app-009',
    applicationNumber: 'EMEA/H/C/006250',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2024-09-01',
    projectedDate: '2024-09-01',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'MAA'),
    milestones: generateMilestones('2024-09-01', 'submitted', 'sub-009'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. Lisa Martinez',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-03',
  },

  // LIG-1205 - Lymphocel (CD3xCD20 Lymphoma) - IND
  {
    id: 'sub-010',
    productId: 'lig-1205',
    applicationNumber: 'IND 167890',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-05-01',
    projectedDate: '2025-05-10',
    overallReadiness: 52,
    status: 'at-risk',
    phase: 'Phase 2',
    modules: generateModuleReadiness('mid', 'IND'),
    milestones: generateMilestones('2025-05-01', 'at-risk', 'sub-010'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Emily Park',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-10',
  },

  // LIG-1340 - Troparix (Trop-2 ADC) - IND
  {
    id: 'sub-011',
    productId: 'lig-1340',
    applicationNumber: 'IND 178901',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-07-15',
    projectedDate: '2025-07-15',
    overallReadiness: 22,
    status: 'on-track',
    phase: 'Phase 1',
    modules: generateModuleReadiness('early', 'IND'),
    milestones: generateMilestones('2025-07-15', 'on-track', 'sub-011'),
    criticalPath: [],
    gaps: generateGaps(2, 'minor'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. David Chen',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-07',
  },

  // ============ IMMUNOLOGY PORTFOLIO ============
  // LIG-3021 - Rheumaclar (RA) - Already approved, tracking lifecycle
  {
    id: 'sub-012',
    productId: 'lig-3021',
    applicationId: 'app-011',
    applicationNumber: 'NDA 214500',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2023-03-01',
    projectedDate: '2023-03-01',
    overallReadiness: 100,
    status: 'approved',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: [],
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'low',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-01-15',
  },

  // LIG-3022 - Rheumaclar PsA sNDA
  {
    id: 'sub-013',
    productId: 'lig-3022',
    applicationId: 'app-014',
    applicationNumber: 'sNDA 214500-S002',
    submissionType: 'sNDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-09-15',
    projectedDate: '2024-09-15',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'sNDA'),
    milestones: generateMilestones('2024-09-15', 'submitted', 'sub-013'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'high',
    programLead: 'David Kim',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-12-01',
  },

  // LIG-3089 - Dermala (Atopic Dermatitis) - BLA
  {
    id: 'sub-014',
    productId: 'lig-3089',
    applicationNumber: 'BLA 761456',
    submissionType: 'BLA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-08-01',
    projectedDate: '2025-08-15',
    overallReadiness: 65,
    status: 'at-risk',
    modules: generateModuleReadiness('mid', 'BLA'),
    milestones: generateMilestones('2025-08-01', 'at-risk', 'sub-014'),
    criticalPath: [],
    gaps: generateGaps(3, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Rachel Kim',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-12-12',
  },
  // LIG-3089 - MAA
  {
    id: 'sub-015',
    productId: 'lig-3089',
    applicationNumber: 'EMEA/H/C/006500',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-09-01',
    projectedDate: '2025-09-15',
    overallReadiness: 55,
    status: 'at-risk',
    modules: generateModuleReadiness('mid', 'MAA'),
    milestones: generateMilestones('2025-09-01', 'at-risk', 'sub-015'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Rachel Kim',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-12-10',
  },

  // LIG-3145 - Colonix (UC) - IND Phase 2
  {
    id: 'sub-016',
    productId: 'lig-3145',
    applicationNumber: 'IND 189012',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-03-15',
    projectedDate: '2025-03-20',
    overallReadiness: 68,
    status: 'on-track',
    phase: 'Phase 2',
    modules: generateModuleReadiness('late', 'IND'),
    milestones: generateMilestones('2025-03-15', 'on-track', 'sub-016'),
    criticalPath: [],
    gaps: generateGaps(1, 'minor'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Emily Park',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-12-08',
  },

  // ============ NEUROLOGY PORTFOLIO ============
  // LIG-4455 - Cognivex (Alzheimer's) - IND Phase 2
  {
    id: 'sub-017',
    productId: 'lig-4455',
    applicationNumber: 'IND 190123',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-04-01',
    projectedDate: '2025-04-05',
    overallReadiness: 55,
    status: 'on-track',
    phase: 'Phase 2',
    modules: generateModuleReadiness('mid', 'IND'),
    milestones: generateMilestones('2025-04-01', 'on-track', 'sub-017'),
    criticalPath: [],
    gaps: generateGaps(2, 'minor'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. James Wilson',
    therapeuticArea: 'Neurology',
    lastUpdated: '2024-12-11',
  },

  // LIG-4501 - Parkinel (Parkinson's) - NDA
  {
    id: 'sub-018',
    productId: 'lig-4501',
    applicationNumber: 'NDA 216789',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-06-15',
    projectedDate: '2025-06-30',
    overallReadiness: 78,
    status: 'at-risk',
    modules: generateModuleReadiness('late', 'NDA'),
    milestones: generateMilestones('2025-06-15', 'at-risk', 'sub-018'),
    criticalPath: [],
    gaps: generateGaps(2, 'critical'),
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. Lisa Martinez',
    therapeuticArea: 'Neurology',
    lastUpdated: '2024-12-13',
  },
  // LIG-4501 - MAA
  {
    id: 'sub-019',
    productId: 'lig-4501',
    applicationNumber: 'EMEA/H/C/006700',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-07-01',
    projectedDate: '2025-07-20',
    overallReadiness: 72,
    status: 'at-risk',
    modules: generateModuleReadiness('late', 'MAA'),
    milestones: generateMilestones('2025-07-01', 'at-risk', 'sub-019'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. Lisa Martinez',
    therapeuticArea: 'Neurology',
    lastUpdated: '2024-12-12',
  },

  // LIG-4602 - Migrela (Migraine) - NDA Filed
  {
    id: 'sub-020',
    productId: 'lig-4602',
    applicationId: 'app-016',
    applicationNumber: 'NDA 216100',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-10-01',
    projectedDate: '2024-10-01',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: generateMilestones('2024-10-01', 'submitted', 'sub-020'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Sarah Kim',
    therapeuticArea: 'Neurology',
    lastUpdated: '2024-12-05',
  },

  // ============ RARE DISEASE PORTFOLIO ============
  // LIG-5500 - Spinagen (SMA Gene Therapy) - BLA Filed
  {
    id: 'sub-021',
    productId: 'lig-5500',
    applicationId: 'app-018',
    applicationNumber: 'BLA 761567',
    submissionType: 'BLA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-07-15',
    projectedDate: '2024-07-15',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'BLA'),
    milestones: generateMilestones('2024-07-15', 'submitted', 'sub-021'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. David Chen',
    therapeuticArea: 'Rare Disease',
    lastUpdated: '2024-12-02',
  },
  // LIG-5500 - MAA
  {
    id: 'sub-022',
    productId: 'lig-5500',
    applicationNumber: 'EMEA/H/C/006800',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2024-10-01',
    projectedDate: '2024-10-01',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'MAA'),
    milestones: generateMilestones('2024-10-01', 'submitted', 'sub-022'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'critical',
    programLead: 'Dr. David Chen',
    therapeuticArea: 'Rare Disease',
    lastUpdated: '2024-11-28',
  },

  // LIG-5601 - Ureaclear (OTC Deficiency mRNA) - IND
  {
    id: 'sub-023',
    productId: 'lig-5601',
    applicationNumber: 'IND 201234',
    submissionType: 'IND',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-05-15',
    projectedDate: '2025-05-20',
    overallReadiness: 42,
    status: 'on-track',
    phase: 'Phase 1/2',
    modules: generateModuleReadiness('mid', 'IND'),
    milestones: generateMilestones('2025-05-15', 'on-track', 'sub-023'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Michael Chen',
    therapeuticArea: 'Rare Disease',
    lastUpdated: '2024-12-09',
  },

  // ============ CARDIOLOGY PORTFOLIO ============
  // LIG-6100 - Cardiostat (approved)
  {
    id: 'sub-024',
    productId: 'lig-6100',
    applicationNumber: 'NDA 213500',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2022-06-01',
    projectedDate: '2022-06-01',
    overallReadiness: 100,
    status: 'approved',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: [],
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'low',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Cardiology',
    lastUpdated: '2023-01-15',
  },

  // LIG-6101 - Cardiostat Peds sNDA
  {
    id: 'sub-025',
    productId: 'lig-6101',
    applicationNumber: 'sNDA 213500-S001',
    submissionType: 'sNDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2024-11-01',
    projectedDate: '2024-11-01',
    overallReadiness: 100,
    status: 'submitted',
    modules: generateModuleReadiness('complete', 'sNDA'),
    milestones: generateMilestones('2024-11-01', 'submitted', 'sub-025'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Sarah Kim',
    therapeuticArea: 'Cardiology',
    lastUpdated: '2024-12-01',
  },

  // LIG-6250 - Pressova (Resistant HTN) - NDA
  {
    id: 'sub-026',
    productId: 'lig-6250',
    applicationNumber: 'NDA 217000',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-09-01',
    projectedDate: '2025-09-15',
    overallReadiness: 48,
    status: 'on-track',
    modules: generateModuleReadiness('mid', 'NDA'),
    milestones: generateMilestones('2025-09-01', 'on-track', 'sub-026'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Rachel Kim',
    therapeuticArea: 'Cardiology',
    lastUpdated: '2024-12-10',
  },

  // ============ INFECTIOUS DISEASE PORTFOLIO ============
  // LIG-7001 - Hepacure (approved)
  {
    id: 'sub-027',
    productId: 'lig-7001',
    applicationNumber: 'NDA 212000',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2021-03-01',
    projectedDate: '2021-03-01',
    overallReadiness: 100,
    status: 'approved',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: [],
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'low',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Infectious Disease',
    lastUpdated: '2022-01-15',
  },

  // LIG-7050 - Fungaclear (Aspergillosis) - NDA
  {
    id: 'sub-028',
    productId: 'lig-7050',
    applicationNumber: 'NDA 217500',
    submissionType: 'NDA',
    region: 'US',
    agency: 'FDA',
    targetDate: '2025-10-01',
    projectedDate: '2025-10-15',
    overallReadiness: 62,
    status: 'on-track',
    modules: generateModuleReadiness('mid', 'NDA'),
    milestones: generateMilestones('2025-10-01', 'on-track', 'sub-028'),
    criticalPath: [],
    gaps: generateGaps(2, 'minor'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Emily Park',
    therapeuticArea: 'Infectious Disease',
    lastUpdated: '2024-12-08',
  },

  // ============ ADDITIONAL REGIONAL SUBMISSIONS ============
  // Japan submissions
  {
    id: 'sub-029',
    productId: 'lig-2847',
    applicationId: 'app-004',
    applicationNumber: 'JNDA 30100123',
    submissionType: 'JNDA',
    region: 'Japan',
    agency: 'PMDA',
    targetDate: '2024-11-15',
    projectedDate: '2024-11-15',
    overallReadiness: 100,
    status: 'approved',
    modules: generateModuleReadiness('complete', 'NDA'),
    milestones: [],
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'high',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-11-15',
  },

  // China submission
  {
    id: 'sub-030',
    productId: 'lig-1182',
    applicationNumber: 'NMPA-BLA-2025-001',
    submissionType: 'BLA',
    region: 'China',
    agency: 'NMPA',
    targetDate: '2025-06-01',
    projectedDate: '2025-06-15',
    overallReadiness: 58,
    status: 'on-track',
    modules: generateModuleReadiness('mid', 'BLA'),
    milestones: generateMilestones('2025-06-01', 'on-track', 'sub-030'),
    criticalPath: [],
    gaps: generateGaps(2, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Lisa Martinez',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-06',
  },

  // More early-stage INDs
  {
    id: 'sub-031',
    productId: 'lig-3156',
    applicationNumber: 'CTA-2025-002',
    submissionType: 'CTA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-05-01',
    projectedDate: '2025-05-10',
    overallReadiness: 35,
    status: 'on-track',
    phase: 'Phase 2',
    modules: generateModuleReadiness('early', 'CTA'),
    milestones: generateMilestones('2025-05-01', 'on-track', 'sub-031'),
    criticalPath: [],
    gaps: generateGaps(2, 'minor'),
    riskFactors: [],
    priority: 'medium',
    programLead: 'Dr. Sarah Kim',
    therapeuticArea: 'Oncology',
    lastUpdated: '2024-12-05',
  },

  // Blocked submission example
  {
    id: 'sub-032',
    productId: 'lig-4455',
    applicationNumber: 'CTA-2025-003',
    submissionType: 'CTA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-04-15',
    projectedDate: '2025-05-15',
    overallReadiness: 32,
    status: 'blocked',
    phase: 'Phase 2',
    modules: generateModuleReadiness('early', 'CTA'),
    milestones: generateMilestones('2025-04-15', 'blocked', 'sub-032'),
    criticalPath: [],
    gaps: generateGaps(3, 'critical'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. James Wilson',
    therapeuticArea: 'Neurology',
    lastUpdated: '2024-12-14',
  },

  // Delayed submission
  {
    id: 'sub-033',
    productId: 'lig-5601',
    applicationNumber: 'CTA-2025-004',
    submissionType: 'CTA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-05-01',
    projectedDate: '2025-06-15',
    overallReadiness: 38,
    status: 'delayed',
    phase: 'Phase 1/2',
    modules: generateModuleReadiness('early', 'CTA'),
    milestones: generateMilestones('2025-05-01', 'delayed', 'sub-033'),
    criticalPath: [],
    gaps: generateGaps(2, 'critical'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Michael Chen',
    therapeuticArea: 'Rare Disease',
    lastUpdated: '2024-12-13',
  },

  // Canada submission
  {
    id: 'sub-034',
    productId: 'lig-3021',
    applicationNumber: 'NDS 12345',
    submissionType: 'NDS',
    region: 'Canada',
    agency: 'Health Canada',
    targetDate: '2025-02-01',
    projectedDate: '2025-02-01',
    overallReadiness: 88,
    status: 'on-track',
    modules: generateModuleReadiness('late', 'NDA'),
    milestones: generateMilestones('2025-02-01', 'on-track', 'sub-034'),
    criticalPath: [],
    gaps: [],
    riskFactors: [],
    priority: 'medium',
    programLead: 'Jennifer Walsh',
    therapeuticArea: 'Immunology',
    lastUpdated: '2024-12-10',
  },

  // One more at-risk for variety
  {
    id: 'sub-035',
    productId: 'lig-6250',
    applicationNumber: 'EMEA/H/C/006900',
    submissionType: 'MAA',
    region: 'EU',
    agency: 'EMA',
    targetDate: '2025-10-15',
    projectedDate: '2025-11-01',
    overallReadiness: 42,
    status: 'at-risk',
    modules: generateModuleReadiness('mid', 'MAA'),
    milestones: generateMilestones('2025-10-15', 'at-risk', 'sub-035'),
    criticalPath: [],
    gaps: generateGaps(3, 'major'),
    riskFactors: [],
    priority: 'high',
    programLead: 'Dr. Rachel Kim',
    therapeuticArea: 'Cardiology',
    lastUpdated: '2024-12-11',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSubmissionsByStatus(status: SubmissionStatus): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => s.status === status);
}

export function getSubmissionsByProduct(productId: string): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => s.productId === productId);
}

export function getSubmissionsByType(type: SubmissionType): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => s.submissionType === type);
}

export function getSubmissionsByTherapeuticArea(area: string): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => s.therapeuticArea === area);
}

export function getSubmissionsByRegion(region: string): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => s.region === region);
}

export function getActiveSubmissions(): RegulatorySubmission[] {
  return regulatorySubmissions.filter(s => 
    s.status !== 'approved' && s.status !== 'submitted'
  );
}

export function getSubmissionsDueInDays(days: number): RegulatorySubmission[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return regulatorySubmissions.filter(s => {
    const target = new Date(s.targetDate);
    return target <= cutoff && s.status !== 'approved' && s.status !== 'submitted';
  });
}

export function getPortfolioMetrics() {
  const active = getActiveSubmissions();
  return {
    totalActive: active.length,
    atRisk: active.filter(s => s.status === 'at-risk').length,
    blocked: active.filter(s => s.status === 'blocked').length,
    delayed: active.filter(s => s.status === 'delayed').length,
    onTrack: active.filter(s => s.status === 'on-track').length,
    dueNext30Days: getSubmissionsDueInDays(30).length,
    dueNext60Days: getSubmissionsDueInDays(60).length,
    dueNext90Days: getSubmissionsDueInDays(90).length,
    criticalGapsTotal: active.reduce((sum, s) => sum + s.gaps.filter(g => g.severity === 'critical').length, 0),
    avgReadiness: Math.round(active.reduce((sum, s) => sum + s.overallReadiness, 0) / active.length),
  };
}

export function getProduct(productId: string) {
  return products.find(p => p.id === productId);
}
