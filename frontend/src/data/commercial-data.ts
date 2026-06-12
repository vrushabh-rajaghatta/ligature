/**
 * Commercial Module Data - v0.7.0
 * 
 * Launch Command Center, MLR Workflow, and Claims Traceability
 * 
 * "R&D Connected doesn't stop at approval. When the label is finalized,
 * Commercial already has the claims. When safety signals emerge, messaging
 * updates automatically. One platform, full lifecycle."
 */

// ============================================================================
// TYPES
// ============================================================================

export type LaunchMarket = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'CA' | 'AU' | 'BR';

export type LaunchMilestoneType = 
  | 'regulatory-approval'
  | 'label-finalization'
  | 'supply-ready'
  | 'sales-training'
  | 'market-access'
  | 'medical-readiness'
  | 'commercial-readiness'
  | 'launch-date';

export type LaunchMilestoneStatus = 'completed' | 'on-track' | 'at-risk' | 'blocked' | 'pending';

export type GoNoGoStatus = 'go' | 'conditional-go' | 'no-go' | 'pending';

export interface LaunchMilestone {
  id: string;
  type: LaunchMilestoneType;
  name: string;
  targetDate: string;
  actualDate?: string;
  status: LaunchMilestoneStatus;
  owner: string;
  department: string;
  dependencies: string[];
  notes?: string;
}

export interface LaunchMarketReadiness {
  market: LaunchMarket;
  marketName: string;
  targetLaunchDate: string;
  actualLaunchDate?: string;
  regulatoryStatus: 'approved' | 'under-review' | 'filed' | 'not-filed';
  approvalDate?: string;
  overallReadiness: number; // 0-100
  goNoGoStatus: GoNoGoStatus;
  lastGoNoGoDate?: string;
  milestones: LaunchMilestone[];
  blockers: string[];
  risks: string[];
}

export interface ProductLaunch {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  indication: string;
  therapeuticArea: string;
  launchType: 'initial' | 'new-indication' | 'new-formulation' | 'lifecycle';
  primaryMarket: LaunchMarket;
  markets: LaunchMarketReadiness[];
  overallReadiness: number;
  launchLead: string;
  crossFunctionalTeam: string[];
  lastUpdated: string;
}

// MLR Types
export type MLRMaterialType = 
  | 'sales-aid'
  | 'patient-brochure'
  | 'hcp-leave-behind'
  | 'digital-banner'
  | 'social-media'
  | 'video'
  | 'website-content'
  | 'slide-deck'
  | 'email-template'
  | 'trade-show-material';

export type MLRReviewStage = 
  | 'submitted'
  | 'medical-review'
  | 'legal-review'
  | 'regulatory-review'
  | 'revision-requested'
  | 'approved'
  | 'expired'
  | 'withdrawn';

export type MLRPriority = 'critical' | 'high' | 'standard' | 'low';

export interface MLRComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'medical' | 'legal' | 'regulatory';
  timestamp: string;
  comment: string;
  claimId?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface MLRMaterial {
  id: string;
  title: string;
  materialCode: string;
  type: MLRMaterialType;
  productId: string;
  productName: string;
  version: string;
  stage: MLRReviewStage;
  priority: MLRPriority;
  submittedBy: string;
  submittedDate: string;
  targetApprovalDate: string;
  actualApprovalDate?: string;
  expirationDate?: string;
  claimIds: string[];
  comments: MLRComment[];
  currentReviewer?: string;
  turnaroundTime?: number; // hours
  revisionCount: number;
}

export interface MLRReviewQueue {
  reviewerRole: 'medical' | 'legal' | 'regulatory';
  pendingCount: number;
  overdueCount: number;
  avgTurnaround: number; // hours
  itemIds: string[];
}

// Claims Types
export type ClaimType = 
  | 'efficacy'
  | 'safety'
  | 'dosing'
  | 'mechanism'
  | 'comparative'
  | 'patient-population'
  | 'quality-of-life';

export type ClaimStatus = 'approved' | 'pending-review' | 'expired' | 'withdrawn' | 'updated';

export interface ClaimSource {
  id: string;
  sourceType: 'label' | 'csr' | 'publication' | 'clinical-data' | 'safety-data';
  sourceId: string;
  sourceName: string;
  sourceSection?: string;
  dataPoint: string;
  extractedDate: string;
  lastValidated: string;
  linkedModule: 'regulatory' | 'clinical' | 'safety';
}

export interface PromotionalClaim {
  id: string;
  claimText: string;
  claimType: ClaimType;
  productId: string;
  productName: string;
  status: ClaimStatus;
  approvedDate?: string;
  expirationDate?: string;
  sources: ClaimSource[];
  usageCount: number; // Number of materials using this claim
  materialIds: string[];
  lastReviewed: string;
  reviewedBy: string;
  regionalVariations: {
    market: LaunchMarket;
    claimText: string;
    status: ClaimStatus;
  }[];
}

// Dashboard Summary Types
export interface CommercialDashboardSummary {
  activeLaunches: number;
  launchesOnTrack: number;
  launchesAtRisk: number;
  launchesBlocked: number;
  pendingMLRMaterials: number;
  overdueMLRMaterials: number;
  avgMLRTurnaround: number;
  activeClaims: number;
  claimsExpiringIn30Days: number;
  claimsNeedingUpdate: number; // Due to label/safety changes
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const LAUNCH_MILESTONE_LABELS: Record<LaunchMilestoneType, string> = {
  'regulatory-approval': 'Regulatory Approval',
  'label-finalization': 'Label Finalization',
  'supply-ready': 'Supply Chain Ready',
  'sales-training': 'Sales Force Training',
  'market-access': 'Market Access/Pricing',
  'medical-readiness': 'Medical Affairs Ready',
  'commercial-readiness': 'Commercial Materials Ready',
  'launch-date': 'Launch Date',
};

export const LAUNCH_MILESTONE_ICONS: Record<LaunchMilestoneType, string> = {
  'regulatory-approval': 'FileCheck',
  'label-finalization': 'Tag',
  'supply-ready': 'Truck',
  'sales-training': 'GraduationCap',
  'market-access': 'DollarSign',
  'medical-readiness': 'Stethoscope',
  'commercial-readiness': 'Megaphone',
  'launch-date': 'Rocket',
};

export const MARKET_LABELS: Record<LaunchMarket, string> = {
  US: 'United States',
  EU: 'European Union',
  UK: 'United Kingdom',
  JP: 'Japan',
  CN: 'China',
  CA: 'Canada',
  AU: 'Australia',
  BR: 'Brazil',
};

export const MLR_MATERIAL_LABELS: Record<MLRMaterialType, string> = {
  'sales-aid': 'Sales Aid / Detail Aid',
  'patient-brochure': 'Patient Brochure',
  'hcp-leave-behind': 'HCP Leave-Behind',
  'digital-banner': 'Digital Banner Ad',
  'social-media': 'Social Media Post',
  'video': 'Video Content',
  'website-content': 'Website Content',
  'slide-deck': 'Slide Deck',
  'email-template': 'Email Template',
  'trade-show-material': 'Trade Show Material',
};

export const MLR_STAGE_LABELS: Record<MLRReviewStage, string> = {
  submitted: 'Submitted',
  'medical-review': 'Medical Review',
  'legal-review': 'Legal Review',
  'regulatory-review': 'Regulatory Review',
  'revision-requested': 'Revision Requested',
  approved: 'Approved',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  efficacy: 'Efficacy',
  safety: 'Safety',
  dosing: 'Dosing',
  mechanism: 'Mechanism of Action',
  comparative: 'Comparative',
  'patient-population': 'Patient Population',
  'quality-of-life': 'Quality of Life',
};

// ============================================================================
// DEMO DATA - NEXAVANT (LIG-2847) LAUNCH
// ============================================================================

const nexavantUSMilestones: LaunchMilestone[] = [
  {
    id: 'ms-001',
    type: 'regulatory-approval',
    name: 'FDA BLA Approval',
    targetDate: '2026-01-15',
    actualDate: '2025-12-28',
    status: 'completed',
    owner: 'Dr. Sarah Chen',
    department: 'Regulatory Affairs',
    dependencies: [],
    notes: 'Approved 18 days ahead of target',
  },
  {
    id: 'ms-002',
    type: 'label-finalization',
    name: 'US PI/Label Finalization',
    targetDate: '2026-01-05',
    actualDate: '2026-01-02',
    status: 'completed',
    owner: 'Jennifer Martinez',
    department: 'Labeling',
    dependencies: ['ms-001'],
    notes: 'Final label includes expanded patient population',
  },
  {
    id: 'ms-003',
    type: 'supply-ready',
    name: 'Commercial Supply Available',
    targetDate: '2026-01-20',
    status: 'on-track',
    owner: 'Michael Thompson',
    department: 'Supply Chain',
    dependencies: ['ms-001'],
    notes: '6-month inventory at distribution centers',
  },
  {
    id: 'ms-004',
    type: 'sales-training',
    name: 'Sales Force Certification',
    targetDate: '2026-01-25',
    status: 'on-track',
    owner: 'Lisa Anderson',
    department: 'Commercial Training',
    dependencies: ['ms-002'],
    notes: '450 reps to be certified',
  },
  {
    id: 'ms-005',
    type: 'market-access',
    name: 'Payer Contracts Finalized',
    targetDate: '2026-01-30',
    status: 'at-risk',
    owner: 'David Kim',
    department: 'Market Access',
    dependencies: ['ms-001'],
    notes: 'CVS negotiation ongoing - may slip 1 week',
  },
  {
    id: 'ms-006',
    type: 'medical-readiness',
    name: 'MSL Field Deployment',
    targetDate: '2026-01-28',
    status: 'on-track',
    owner: 'Dr. James Wilson',
    department: 'Medical Affairs',
    dependencies: ['ms-002'],
    notes: '35 MSLs trained on label claims',
  },
  {
    id: 'ms-007',
    type: 'commercial-readiness',
    name: 'Promotional Materials Approved',
    targetDate: '2026-01-31',
    status: 'on-track',
    owner: 'Emily Roberts',
    department: 'Commercial Marketing',
    dependencies: ['ms-002'],
    notes: '12 of 15 core materials through MLR',
  },
  {
    id: 'ms-008',
    type: 'launch-date',
    name: 'US Commercial Launch',
    targetDate: '2026-02-03',
    status: 'on-track',
    owner: 'Robert Chen',
    department: 'Commercial Operations',
    dependencies: ['ms-003', 'ms-004', 'ms-005', 'ms-006', 'ms-007'],
    notes: 'National launch planned',
  },
];

const nexavantEUMilestones: LaunchMilestone[] = [
  {
    id: 'ms-eu-001',
    type: 'regulatory-approval',
    name: 'EMA MAA Approval',
    targetDate: '2026-03-15',
    status: 'pending',
    owner: 'Dr. Hans Mueller',
    department: 'Regulatory Affairs EU',
    dependencies: [],
    notes: 'CHMP opinion expected Feb 2026',
  },
  {
    id: 'ms-eu-002',
    type: 'label-finalization',
    name: 'EU SmPC Finalization',
    targetDate: '2026-03-25',
    status: 'pending',
    owner: 'Marie Dubois',
    department: 'Labeling EU',
    dependencies: ['ms-eu-001'],
  },
  {
    id: 'ms-eu-003',
    type: 'market-access',
    name: 'Germany G-BA Assessment',
    targetDate: '2026-06-01',
    status: 'pending',
    owner: 'Klaus Weber',
    department: 'Market Access EU',
    dependencies: ['ms-eu-001'],
    notes: 'Early benefit assessment filing Q1 2026',
  },
  {
    id: 'ms-eu-004',
    type: 'launch-date',
    name: 'Germany Launch',
    targetDate: '2026-06-15',
    status: 'pending',
    owner: 'Anna Schmidt',
    department: 'Commercial EU',
    dependencies: ['ms-eu-002', 'ms-eu-003'],
  },
];

export const productLaunches: ProductLaunch[] = [
  {
    id: 'launch-001',
    productId: 'LIG-2847',
    productName: 'LIG-2847',
    brandName: 'Nexavant',
    indication: 'Relapsed/Refractory Multiple Myeloma',
    therapeuticArea: 'Oncology',
    launchType: 'initial',
    primaryMarket: 'US',
    overallReadiness: 87,
    launchLead: 'Robert Chen',
    crossFunctionalTeam: [
      'Dr. Sarah Chen (Regulatory)',
      'Jennifer Martinez (Labeling)',
      'Michael Thompson (Supply)',
      'Lisa Anderson (Training)',
      'David Kim (Market Access)',
      'Dr. James Wilson (Medical)',
      'Emily Roberts (Marketing)',
    ],
    lastUpdated: '2026-01-02T14:30:00Z',
    markets: [
      {
        market: 'US',
        marketName: 'United States',
        targetLaunchDate: '2026-02-03',
        regulatoryStatus: 'approved',
        approvalDate: '2025-12-28',
        overallReadiness: 87,
        goNoGoStatus: 'conditional-go',
        lastGoNoGoDate: '2025-12-30',
        milestones: nexavantUSMilestones,
        blockers: [],
        risks: ['CVS payer negotiation may slip 1 week'],
      },
      {
        market: 'EU',
        marketName: 'European Union',
        targetLaunchDate: '2026-06-15',
        regulatoryStatus: 'under-review',
        overallReadiness: 45,
        goNoGoStatus: 'pending',
        milestones: nexavantEUMilestones,
        blockers: ['Awaiting CHMP opinion'],
        risks: ['G-BA benefit assessment timing uncertain'],
      },
      {
        market: 'JP',
        marketName: 'Japan',
        targetLaunchDate: '2026-09-01',
        regulatoryStatus: 'filed',
        overallReadiness: 30,
        goNoGoStatus: 'pending',
        milestones: [],
        blockers: ['PMDA review in progress'],
        risks: [],
      },
    ],
  },
  {
    id: 'launch-002',
    productId: 'LIG-1152',
    productName: 'LIG-1152',
    brandName: 'Cardivex',
    indication: 'Heart Failure with Reduced Ejection Fraction',
    therapeuticArea: 'Cardiology',
    launchType: 'initial',
    primaryMarket: 'US',
    overallReadiness: 62,
    launchLead: 'Michelle Park',
    crossFunctionalTeam: [],
    lastUpdated: '2026-01-01T10:00:00Z',
    markets: [
      {
        market: 'US',
        marketName: 'United States',
        targetLaunchDate: '2026-04-15',
        regulatoryStatus: 'under-review',
        overallReadiness: 62,
        goNoGoStatus: 'pending',
        milestones: [],
        blockers: ['Awaiting FDA Complete Response'],
        risks: ['Potential FDA AdComm request'],
      },
    ],
  },
];

// MLR Materials
export const mlrMaterials: MLRMaterial[] = [
  {
    id: 'mlr-001',
    title: 'Nexavant Core Sales Aid',
    materialCode: 'NXV-SA-001',
    type: 'sales-aid',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'approved',
    priority: 'critical',
    submittedBy: 'Emily Roberts',
    submittedDate: '2025-12-15',
    targetApprovalDate: '2026-01-10',
    actualApprovalDate: '2026-01-02',
    expirationDate: '2027-01-02',
    claimIds: ['claim-001', 'claim-002', 'claim-003', 'claim-004'],
    comments: [],
    turnaroundTime: 432, // 18 days
    revisionCount: 2,
  },
  {
    id: 'mlr-002',
    title: 'Nexavant Patient Brochure',
    materialCode: 'NXV-PB-001',
    type: 'patient-brochure',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'approved',
    priority: 'high',
    submittedBy: 'Sarah Johnson',
    submittedDate: '2025-12-18',
    targetApprovalDate: '2026-01-15',
    actualApprovalDate: '2025-12-30',
    expirationDate: '2026-12-30',
    claimIds: ['claim-001', 'claim-005'],
    comments: [],
    turnaroundTime: 288, // 12 days
    revisionCount: 1,
  },
  {
    id: 'mlr-003',
    title: 'Nexavant HCP Leave-Behind',
    materialCode: 'NXV-LB-001',
    type: 'hcp-leave-behind',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'regulatory-review',
    priority: 'high',
    submittedBy: 'Emily Roberts',
    submittedDate: '2025-12-20',
    targetApprovalDate: '2026-01-20',
    claimIds: ['claim-001', 'claim-002', 'claim-006'],
    comments: [
      {
        id: 'cmt-001',
        reviewerId: 'rev-001',
        reviewerName: 'Dr. Patricia Moore',
        reviewerRole: 'medical',
        timestamp: '2025-12-28T10:30:00Z',
        comment: 'Efficacy claim on page 2 needs citation to Table 14.2.1 of CSR',
        claimId: 'claim-001',
        resolved: true,
        resolvedBy: 'Emily Roberts',
        resolvedAt: '2025-12-29T14:00:00Z',
      },
      {
        id: 'cmt-002',
        reviewerId: 'rev-002',
        reviewerName: 'Mark Stevens',
        reviewerRole: 'legal',
        timestamp: '2025-12-30T09:15:00Z',
        comment: 'Approved with minor edits',
        resolved: true,
        resolvedBy: 'Emily Roberts',
        resolvedAt: '2025-12-30T16:00:00Z',
      },
    ],
    currentReviewer: 'Jennifer Martinez (Regulatory)',
    revisionCount: 1,
  },
  {
    id: 'mlr-004',
    title: 'Nexavant Digital Banner Set',
    materialCode: 'NXV-DB-001',
    type: 'digital-banner',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'medical-review',
    priority: 'standard',
    submittedBy: 'Digital Team',
    submittedDate: '2025-12-28',
    targetApprovalDate: '2026-01-25',
    claimIds: ['claim-001'],
    comments: [],
    currentReviewer: 'Dr. Patricia Moore',
    revisionCount: 0,
  },
  {
    id: 'mlr-005',
    title: 'Nexavant Congress Booth Materials',
    materialCode: 'NXV-TM-001',
    type: 'trade-show-material',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'submitted',
    priority: 'high',
    submittedBy: 'Congress Team',
    submittedDate: '2026-01-02',
    targetApprovalDate: '2026-01-20',
    claimIds: ['claim-001', 'claim-002', 'claim-003', 'claim-007'],
    comments: [],
    revisionCount: 0,
  },
  {
    id: 'mlr-006',
    title: 'Nexavant MOA Video',
    materialCode: 'NXV-VD-001',
    type: 'video',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    version: '1.0',
    stage: 'revision-requested',
    priority: 'standard',
    submittedBy: 'Creative Agency',
    submittedDate: '2025-12-22',
    targetApprovalDate: '2026-01-15',
    claimIds: ['claim-004'],
    comments: [
      {
        id: 'cmt-003',
        reviewerId: 'rev-001',
        reviewerName: 'Dr. Patricia Moore',
        reviewerRole: 'medical',
        timestamp: '2025-12-29T11:00:00Z',
        comment: 'Animation at 0:45 oversimplifies receptor binding mechanism. Please revise to show both binding sites.',
        claimId: 'claim-004',
        resolved: false,
      },
    ],
    currentReviewer: 'Creative Agency (Revision)',
    revisionCount: 1,
  },
];

// Promotional Claims
export const promotionalClaims: PromotionalClaim[] = [
  {
    id: 'claim-001',
    claimText: 'Nexavant demonstrated a 47% improvement in progression-free survival compared to standard of care',
    claimType: 'efficacy',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2026-01-02',
    expirationDate: '2027-01-02',
    sources: [
      {
        id: 'src-001',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 14.1 Clinical Studies',
        dataPoint: 'PFS HR 0.53 (95% CI: 0.42-0.67)',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
      {
        id: 'src-002',
        sourceType: 'csr',
        sourceId: 'csr-lig301',
        sourceName: 'LIG-301 Clinical Study Report',
        sourceSection: 'Table 14.2.1',
        dataPoint: 'Primary endpoint analysis',
        extractedDate: '2025-12-15',
        lastValidated: '2026-01-02',
        linkedModule: 'clinical',
      },
    ],
    usageCount: 8,
    materialIds: ['mlr-001', 'mlr-002', 'mlr-003', 'mlr-004', 'mlr-005'],
    lastReviewed: '2026-01-02',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
  {
    id: 'claim-002',
    claimText: 'Overall response rate of 82% (95% CI: 76-88%) in heavily pretreated patients',
    claimType: 'efficacy',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2026-01-02',
    expirationDate: '2027-01-02',
    sources: [
      {
        id: 'src-003',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 14.1',
        dataPoint: 'ORR analysis',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
    ],
    usageCount: 5,
    materialIds: ['mlr-001', 'mlr-003', 'mlr-005'],
    lastReviewed: '2026-01-02',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
  {
    id: 'claim-003',
    claimText: 'Manageable safety profile with no new safety signals identified',
    claimType: 'safety',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2026-01-02',
    expirationDate: '2027-01-02',
    sources: [
      {
        id: 'src-004',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 6 Adverse Reactions',
        dataPoint: 'Safety summary',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
      {
        id: 'src-005',
        sourceType: 'safety-data',
        sourceId: 'psur-nxv-001',
        sourceName: 'Nexavant Periodic Safety Update Report',
        sourceSection: 'Signal Detection Summary',
        dataPoint: 'No new signals identified',
        extractedDate: '2025-12-20',
        lastValidated: '2026-01-02',
        linkedModule: 'safety',
      },
    ],
    usageCount: 6,
    materialIds: ['mlr-001', 'mlr-005'],
    lastReviewed: '2026-01-02',
    reviewedBy: 'Dr. James Wilson',
    regionalVariations: [],
  },
  {
    id: 'claim-004',
    claimText: 'Novel bispecific mechanism targets both CD38 and BCMA for enhanced tumor killing',
    claimType: 'mechanism',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2025-12-28',
    expirationDate: '2026-12-28',
    sources: [
      {
        id: 'src-006',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 12.1 Mechanism of Action',
        dataPoint: 'MOA description',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
    ],
    usageCount: 3,
    materialIds: ['mlr-001', 'mlr-006'],
    lastReviewed: '2025-12-28',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
  {
    id: 'claim-005',
    claimText: 'Convenient once-weekly subcutaneous dosing',
    claimType: 'dosing',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2025-12-28',
    expirationDate: '2026-12-28',
    sources: [
      {
        id: 'src-007',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 2 Dosage and Administration',
        dataPoint: 'Dosing schedule',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
    ],
    usageCount: 4,
    materialIds: ['mlr-001', 'mlr-002'],
    lastReviewed: '2025-12-28',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
  {
    id: 'claim-006',
    claimText: 'Demonstrated efficacy in patients who have received ≥3 prior lines of therapy',
    claimType: 'patient-population',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2026-01-02',
    expirationDate: '2027-01-02',
    sources: [
      {
        id: 'src-008',
        sourceType: 'label',
        sourceId: 'lbl-nxv-001',
        sourceName: 'Nexavant US Prescribing Information',
        sourceSection: 'Section 1 Indications and Usage',
        dataPoint: 'Indication statement',
        extractedDate: '2026-01-02',
        lastValidated: '2026-01-02',
        linkedModule: 'regulatory',
      },
    ],
    usageCount: 3,
    materialIds: ['mlr-003'],
    lastReviewed: '2026-01-02',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
  {
    id: 'claim-007',
    claimText: 'Median duration of response: 18.2 months',
    claimType: 'efficacy',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    status: 'approved',
    approvedDate: '2026-01-02',
    expirationDate: '2027-01-02',
    sources: [
      {
        id: 'src-009',
        sourceType: 'csr',
        sourceId: 'csr-lig301',
        sourceName: 'LIG-301 Clinical Study Report',
        sourceSection: 'Table 14.2.3',
        dataPoint: 'Duration of response analysis',
        extractedDate: '2025-12-15',
        lastValidated: '2026-01-02',
        linkedModule: 'clinical',
      },
    ],
    usageCount: 2,
    materialIds: ['mlr-005'],
    lastReviewed: '2026-01-02',
    reviewedBy: 'Dr. Patricia Moore',
    regionalVariations: [],
  },
];

// MLR Review Queues
export const mlrReviewQueues: MLRReviewQueue[] = [
  {
    reviewerRole: 'medical',
    pendingCount: 3,
    overdueCount: 0,
    avgTurnaround: 48,
    itemIds: ['mlr-004', 'mlr-005'],
  },
  {
    reviewerRole: 'legal',
    pendingCount: 2,
    overdueCount: 0,
    avgTurnaround: 36,
    itemIds: ['mlr-005'],
  },
  {
    reviewerRole: 'regulatory',
    pendingCount: 2,
    overdueCount: 0,
    avgTurnaround: 24,
    itemIds: ['mlr-003', 'mlr-005'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProductLaunchById(launchId: string): ProductLaunch | undefined {
  return productLaunches.find(l => l.id === launchId);
}

export function getProductLaunchesByStatus(status: 'on-track' | 'at-risk' | 'blocked'): ProductLaunch[] {
  return productLaunches.filter(launch => {
    const primaryMarket = launch.markets.find(m => m.market === launch.primaryMarket);
    if (!primaryMarket) return false;
    
    if (status === 'blocked') {
      return primaryMarket.blockers.length > 0;
    }
    if (status === 'at-risk') {
      return primaryMarket.milestones.some(m => m.status === 'at-risk');
    }
    return primaryMarket.milestones.every(m => m.status === 'completed' || m.status === 'on-track');
  });
}

export function getMLRMaterialsByStage(stage: MLRReviewStage): MLRMaterial[] {
  return mlrMaterials.filter(m => m.stage === stage);
}

export function getMLRMaterialsByProduct(productId: string): MLRMaterial[] {
  return mlrMaterials.filter(m => m.productId === productId);
}

export function getPendingMLRMaterials(): MLRMaterial[] {
  const pendingStages: MLRReviewStage[] = ['submitted', 'medical-review', 'legal-review', 'regulatory-review'];
  return mlrMaterials.filter(m => pendingStages.includes(m.stage));
}

export function getClaimById(claimId: string): PromotionalClaim | undefined {
  return promotionalClaims.find(c => c.id === claimId);
}

export function getClaimsByProduct(productId: string): PromotionalClaim[] {
  return promotionalClaims.filter(c => c.productId === productId);
}

export function getClaimsByType(claimType: ClaimType): PromotionalClaim[] {
  return promotionalClaims.filter(c => c.claimType === claimType);
}

export function getClaimsExpiringWithin(days: number): PromotionalClaim[] {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return promotionalClaims.filter(c => {
    if (!c.expirationDate) return false;
    const expDate = new Date(c.expirationDate);
    return expDate <= futureDate && c.status === 'approved';
  });
}

export function getMaterialsUsingClaim(claimId: string): MLRMaterial[] {
  return mlrMaterials.filter(m => m.claimIds.includes(claimId));
}

export function getCommercialDashboardSummary(): CommercialDashboardSummary {
  const pendingMaterials = getPendingMLRMaterials();
  const today = new Date();
  
  const overdueMaterials = pendingMaterials.filter(m => {
    const targetDate = new Date(m.targetApprovalDate);
    return targetDate < today;
  });
  
  const avgTurnaround = mlrMaterials
    .filter(m => m.turnaroundTime)
    .reduce((sum, m) => sum + (m.turnaroundTime || 0), 0) / 
    mlrMaterials.filter(m => m.turnaroundTime).length || 0;
  
  const activeClaims = promotionalClaims.filter(c => c.status === 'approved');
  const expiringClaims = getClaimsExpiringWithin(30);
  
  // Check for claims that need update due to label/safety changes
  // In a real system, this would check against actual label version changes
  const claimsNeedingUpdate = 0;
  
  return {
    activeLaunches: productLaunches.length,
    launchesOnTrack: getProductLaunchesByStatus('on-track').length,
    launchesAtRisk: getProductLaunchesByStatus('at-risk').length,
    launchesBlocked: getProductLaunchesByStatus('blocked').length,
    pendingMLRMaterials: pendingMaterials.length,
    overdueMLRMaterials: overdueMaterials.length,
    avgMLRTurnaround: Math.round(avgTurnaround / 24), // Convert hours to days
    activeClaims: activeClaims.length,
    claimsExpiringIn30Days: expiringClaims.length,
    claimsNeedingUpdate,
  };
}

export function getLaunchReadinessBreakdown(launch: ProductLaunch): {
  regulatory: number;
  supply: number;
  commercial: number;
  medical: number;
  marketAccess: number;
} {
  const primaryMarket = launch.markets.find(m => m.market === launch.primaryMarket);
  if (!primaryMarket) {
    return { regulatory: 0, supply: 0, commercial: 0, medical: 0, marketAccess: 0 };
  }
  
  const milestoneProgress = (types: LaunchMilestoneType[]): number => {
    const relevant = primaryMarket.milestones.filter(m => types.includes(m.type));
    if (relevant.length === 0) return 0;
    const completed = relevant.filter(m => m.status === 'completed').length;
    return Math.round((completed / relevant.length) * 100);
  };
  
  return {
    regulatory: milestoneProgress(['regulatory-approval', 'label-finalization']),
    supply: milestoneProgress(['supply-ready']),
    commercial: milestoneProgress(['sales-training', 'commercial-readiness']),
    medical: milestoneProgress(['medical-readiness']),
    marketAccess: milestoneProgress(['market-access']),
  };
}
