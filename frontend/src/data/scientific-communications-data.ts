// ============================================================================
// Scientific Communications Data - v0.5.1
// Publications Pipeline, Scientific Platform, Congress Management, Data Integration
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type PublicationType = 'primary' | 'secondary' | 'abstract' | 'poster' | 'oral' | 'review' | 'case-report' | 'letter';
export type PublicationStatus = 'concept' | 'protocol' | 'drafting' | 'internal-review' | 'external-review' | 'submitted' | 'revision' | 'accepted' | 'published';
export type ManuscriptPriority = 'critical' | 'high' | 'standard';
export type DataSourceType = 'csr' | 'cst' | 'isr' | 'pooled-analysis' | 'meta-analysis' | 'real-world' | 'preclinical';
export type ClaimStatus = 'approved' | 'pending-approval' | 'under-review' | 'retired' | 'draft';
export type CongressType = 'major' | 'regional' | 'specialty';

export interface SciPublication {
  id: string;
  publicationCode: string;
  title: string;
  shortTitle: string;
  type: PublicationType;
  status: PublicationStatus;
  priority: ManuscriptPriority;
  productId: string;
  productName: string;
  studyId?: string;
  studyName?: string;
  therapeuticArea: string;
  indication: string;
  leadAuthor: string;
  leadAuthorAffiliation: string;
  coAuthors: string[];
  medicalWriter?: string;
  internalLead: string;
  targetJournal?: string;
  targetJournalIF?: number;
  targetCongress?: string;
  targetCongressDate?: string;
  targetSubmissionDate: string;
  actualSubmissionDate?: string;
  acceptanceDate?: string;
  publicationDate?: string;
  daysToTarget: number;
  isOnTrack: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  riskReason?: string;
  dataSources: DataSourceRef[];
  linkedClaimIds: string[];
  linkedSignalIds: string[];
  hasSignalImpact: boolean;
  milestones: PublicationMilestone[];
  tags: string[];
}

export interface DataSourceRef {
  id: string;
  type: DataSourceType;
  name: string;
  reference: string;
  moduleLink?: string;
  lastUpdated: string;
  dataLockDate?: string;
  status: 'final' | 'interim' | 'pending';
}

export interface PublicationMilestone {
  id: string;
  name: string;
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  owner: string;
}

export interface ScientificClaim {
  id: string;
  claimCode: string;
  claimText: string;
  shortDescription: string;
  category: 'efficacy' | 'safety' | 'tolerability' | 'mechanism' | 'comparative' | 'patient-reported';
  status: ClaimStatus;
  productId: string;
  productName: string;
  indication: string;
  supportingStudies: string[];
  supportingPublications: string[];
  linkedDataSources: DataSourceRef[];
  approvedRegions: string[];
  effectiveDate: string;
  expirationDate?: string;
  version: string;
  lastReviewedDate: string;
  lastReviewedBy: string;
  approvedBy?: string;
  linkedSignalIds: string[];
  requiresReview: boolean;
  reviewReason?: string;
  usageCount: number;
  tags: string[];
}

export interface Congress {
  id: string;
  name: string;
  abbreviation: string;
  type: CongressType;
  location: string;
  startDate: string;
  endDate: string;
  abstractDeadline: string;
  lateBreakingDeadline?: string;
  status: 'planning' | 'abstract-submitted' | 'confirmed' | 'ongoing' | 'completed';
  productId: string;
  productName: string;
  submissions: CongressSubmission[];
  attendees: string[];
  boothNumber?: string;
  symposiumPlanned: boolean;
  symposiumDetails?: string;
  budget?: number;
}

export interface CongressSubmission {
  id: string;
  congressId: string;
  publicationId?: string;
  title: string;
  type: 'abstract' | 'poster' | 'oral' | 'late-breaking' | 'symposium';
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'presented';
  presenterId: string;
  presenterName: string;
  sessionDate?: string;
  sessionTime?: string;
  posterNumber?: string;
  presentationFile?: string;
}

export interface DataIntegrationAlert {
  id: string;
  type: 'study-update' | 'signal-detected' | 'data-lock' | 'label-change';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  sourceModule: string;
  affectedPublications: string[];
  affectedClaims: string[];
  detectedDate: string;
  status: 'new' | 'acknowledged' | 'resolved';
  resolvedDate?: string;
  resolvedBy?: string;
  recommendedAction: string;
}

// ============================================================================
// LABELS
// ============================================================================

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  'primary': 'Primary Manuscript',
  'secondary': 'Secondary Analysis',
  'abstract': 'Congress Abstract',
  'poster': 'Poster Presentation',
  'oral': 'Oral Presentation',
  'review': 'Review Article',
  'case-report': 'Case Report',
  'letter': 'Letter/Commentary',
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  'concept': 'Concept',
  'protocol': 'Protocol Development',
  'drafting': 'Drafting',
  'internal-review': 'Internal Review',
  'external-review': 'External Review',
  'submitted': 'Submitted',
  'revision': 'Revision',
  'accepted': 'Accepted',
  'published': 'Published',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  'approved': 'Approved',
  'pending-approval': 'Pending Approval',
  'under-review': 'Under Review',
  'retired': 'Retired',
  'draft': 'Draft',
};

export const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  'csr': 'Clinical Study Report',
  'cst': 'Clinical Study Tables',
  'isr': 'Integrated Summary Report',
  'pooled-analysis': 'Pooled Analysis',
  'meta-analysis': 'Meta-Analysis',
  'real-world': 'Real-World Evidence',
  'preclinical': 'Preclinical Data',
};

// ============================================================================
// DEMO DATA - PUBLICATIONS
// ============================================================================

export const sciPublications: SciPublication[] = [
  {
    id: 'pub-001',
    publicationCode: 'PUB-LIG2847-001',
    title: 'Efficacy and Safety of Nexavant (LIG-2847) in Patients with KRAS G12C-Mutated Non-Small Cell Lung Cancer: Results from the Phase 3 NEXUS-1 Trial',
    shortTitle: 'NEXUS-1 Primary Results',
    type: 'primary',
    status: 'external-review',
    priority: 'critical',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    studyId: 'LIG2847-301',
    studyName: 'NEXUS-1 Phase 3',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. Sarah Chen',
    leadAuthorAffiliation: 'Memorial Sloan Kettering Cancer Center',
    coAuthors: ['Dr. James Mitchell', 'Dr. Maria Gonzalez', 'Dr. Robert Anderson', 'Dr. Lisa Park'],
    medicalWriter: 'Jennifer Adams, PhD',
    internalLead: 'Dr. Amanda Foster',
    targetJournal: 'New England Journal of Medicine',
    targetJournalIF: 176.1,
    targetSubmissionDate: '2026-01-31',
    daysToTarget: 29,
    isOnTrack: true,
    riskLevel: 'low',
    dataSources: [
      { id: 'ds-001', type: 'csr', name: 'LIG2847-301 CSR', reference: 'Module 5.3.5.1', moduleLink: '/clinical/studies/lig2847-301', lastUpdated: '2025-12-15', dataLockDate: '2025-11-30', status: 'final' },
      { id: 'ds-002', type: 'cst', name: 'NEXUS-1 Statistical Tables', reference: 'CST-2847-301', moduleLink: '/clinical/studies/lig2847-301/tables', lastUpdated: '2025-12-20', status: 'final' },
    ],
    linkedClaimIds: ['claim-001', 'claim-002', 'claim-003'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    milestones: [
      { id: 'ms-001', name: 'First Draft Complete', targetDate: '2025-11-15', actualDate: '2025-11-12', status: 'completed', owner: 'Jennifer Adams' },
      { id: 'ms-002', name: 'Internal Review Complete', targetDate: '2025-12-15', actualDate: '2025-12-14', status: 'completed', owner: 'Dr. Amanda Foster' },
      { id: 'ms-003', name: 'Author Review Complete', targetDate: '2026-01-15', status: 'in-progress', owner: 'Dr. Sarah Chen' },
      { id: 'ms-004', name: 'Submission', targetDate: '2026-01-31', status: 'pending', owner: 'Publications Team' },
    ],
    tags: ['phase3', 'primary-endpoint', 'NEJM', 'priority'],
  },
  {
    id: 'pub-002',
    publicationCode: 'PUB-LIG2847-002',
    title: 'Cardiac Safety Profile of Nexavant: Comprehensive Analysis of QTc Prolongation Across Clinical Trials',
    shortTitle: 'Cardiac Safety Analysis',
    type: 'secondary',
    status: 'internal-review',
    priority: 'high',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. Robert Anderson',
    leadAuthorAffiliation: 'Cleveland Clinic',
    coAuthors: ['Dr. Jennifer Walsh', 'Dr. Michael Torres'],
    medicalWriter: 'Thomas Wright, PhD',
    internalLead: 'Dr. Jennifer Walsh',
    targetJournal: 'Journal of Clinical Oncology',
    targetJournalIF: 45.3,
    targetSubmissionDate: '2026-02-28',
    daysToTarget: 57,
    isOnTrack: false,
    riskLevel: 'high',
    riskReason: 'Linked to active safety signal SIG-2026-002; may require revision pending signal evaluation',
    dataSources: [
      { id: 'ds-003', type: 'pooled-analysis', name: 'Cardiac Safety Pooled Analysis', reference: 'PA-2847-CARDIAC', moduleLink: '/safety/pooled/cardiac', lastUpdated: '2025-12-28', status: 'interim' },
    ],
    linkedClaimIds: ['claim-004'],
    linkedSignalIds: ['sig-2'],
    hasSignalImpact: true,
    milestones: [
      { id: 'ms-005', name: 'First Draft Complete', targetDate: '2025-12-20', actualDate: '2025-12-22', status: 'completed', owner: 'Thomas Wright' },
      { id: 'ms-006', name: 'Signal Assessment', targetDate: '2026-01-15', status: 'in-progress', owner: 'Dr. Jennifer Walsh' },
      { id: 'ms-007', name: 'Internal Review', targetDate: '2026-02-01', status: 'pending', owner: 'Publications Committee' },
    ],
    tags: ['cardiac', 'safety', 'QTc', 'signal-impact'],
  },
  {
    id: 'pub-003',
    publicationCode: 'PUB-LIG2847-003',
    title: 'Patient-Reported Outcomes in the NEXUS-1 Trial: Health-Related Quality of Life with Nexavant vs Standard of Care',
    shortTitle: 'NEXUS-1 PRO Analysis',
    type: 'secondary',
    status: 'drafting',
    priority: 'standard',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    studyId: 'LIG2847-301',
    studyName: 'NEXUS-1 Phase 3',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. Maria Gonzalez',
    leadAuthorAffiliation: 'Dana-Farber Cancer Institute',
    coAuthors: ['Dr. Emily Johnson', 'Dr. Sarah Chen'],
    medicalWriter: 'Jennifer Adams, PhD',
    internalLead: 'Dr. Emily Johnson',
    targetJournal: 'The Lancet Oncology',
    targetJournalIF: 51.1,
    targetSubmissionDate: '2026-03-31',
    daysToTarget: 88,
    isOnTrack: true,
    riskLevel: 'low',
    dataSources: [
      { id: 'ds-004', type: 'csr', name: 'NEXUS-1 PRO Dataset', reference: 'Module 5.3.5.1 PRO', moduleLink: '/clinical/studies/lig2847-301/pro', lastUpdated: '2025-12-15', status: 'final' },
    ],
    linkedClaimIds: ['claim-005'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    milestones: [
      { id: 'ms-008', name: 'Statistical Analysis Complete', targetDate: '2026-01-15', status: 'in-progress', owner: 'Biostatistics' },
      { id: 'ms-009', name: 'First Draft', targetDate: '2026-02-15', status: 'pending', owner: 'Jennifer Adams' },
    ],
    tags: ['PRO', 'quality-of-life', 'patient-centered'],
  },
  {
    id: 'pub-004',
    publicationCode: 'PUB-LIG2847-004',
    title: 'Hepatotoxicity Management in KRAS G12C Inhibitor Therapy: Experience from the Nexavant Clinical Program',
    shortTitle: 'Hepatotoxicity Management',
    type: 'review',
    status: 'concept',
    priority: 'high',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. James Mitchell',
    leadAuthorAffiliation: 'MD Anderson Cancer Center',
    coAuthors: ['Dr. Amanda Foster'],
    internalLead: 'Dr. Amanda Foster',
    targetJournal: 'Clinical Cancer Research',
    targetJournalIF: 11.5,
    targetSubmissionDate: '2026-04-30',
    daysToTarget: 118,
    isOnTrack: false,
    riskLevel: 'high',
    riskReason: 'Publication contingent on hepatotoxicity signal (SIG-2026-001) evaluation and CCDS update',
    dataSources: [
      { id: 'ds-005', type: 'pooled-analysis', name: 'Hepatotoxicity Pooled Analysis', reference: 'PA-2847-HEPATO', moduleLink: '/safety/pooled/hepato', lastUpdated: '2025-12-30', status: 'interim' },
    ],
    linkedClaimIds: [],
    linkedSignalIds: ['sig-1'],
    hasSignalImpact: true,
    milestones: [
      { id: 'ms-010', name: 'Signal Evaluation Complete', targetDate: '2026-01-31', status: 'pending', owner: 'Safety Team' },
      { id: 'ms-011', name: 'Concept Approval', targetDate: '2026-02-15', status: 'pending', owner: 'Publications Committee' },
    ],
    tags: ['hepatotoxicity', 'safety', 'signal-dependent'],
  },
  {
    id: 'pub-005',
    publicationCode: 'PUB-LIG2847-005',
    title: 'Nexavant in KRAS G12C-Mutated NSCLC: Updated Efficacy and Safety from NEXUS-1',
    shortTitle: 'ASCO 2026 Abstract',
    type: 'abstract',
    status: 'drafting',
    priority: 'critical',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    studyId: 'LIG2847-301',
    studyName: 'NEXUS-1 Phase 3',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. Sarah Chen',
    leadAuthorAffiliation: 'Memorial Sloan Kettering Cancer Center',
    coAuthors: ['NEXUS-1 Investigators'],
    internalLead: 'Dr. Amanda Foster',
    targetCongress: 'ASCO 2026',
    targetCongressDate: '2026-05-30',
    targetSubmissionDate: '2026-02-15',
    daysToTarget: 44,
    isOnTrack: true,
    riskLevel: 'low',
    dataSources: [
      { id: 'ds-006', type: 'csr', name: 'NEXUS-1 Updated Data Cut', reference: 'Module 5.3.5.1-Update', lastUpdated: '2026-01-02', dataLockDate: '2025-12-31', status: 'final' },
    ],
    linkedClaimIds: ['claim-001', 'claim-002'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    milestones: [
      { id: 'ms-012', name: 'Data Cut', targetDate: '2025-12-31', actualDate: '2025-12-31', status: 'completed', owner: 'Clinical Ops' },
      { id: 'ms-013', name: 'Abstract Draft', targetDate: '2026-01-31', status: 'in-progress', owner: 'Dr. Amanda Foster' },
      { id: 'ms-014', name: 'Submission', targetDate: '2026-02-15', status: 'pending', owner: 'Publications Team' },
    ],
    tags: ['ASCO', 'abstract', 'priority'],
  },
  {
    id: 'pub-006',
    publicationCode: 'PUB-LIG2847-006',
    title: 'Real-World Effectiveness of Nexavant in Previously Treated KRAS G12C+ NSCLC: Early Experience',
    shortTitle: 'Real-World Evidence',
    type: 'primary',
    status: 'submitted',
    priority: 'standard',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    therapeuticArea: 'Oncology',
    indication: 'KRAS G12C+ NSCLC',
    leadAuthor: 'Dr. Lisa Park',
    leadAuthorAffiliation: 'University of California San Francisco',
    coAuthors: ['Dr. David Kim', 'Dr. Rachel Green'],
    medicalWriter: 'Mark Stevens, PhD',
    internalLead: 'Dr. Michael Torres',
    targetJournal: 'Annals of Oncology',
    targetJournalIF: 32.4,
    targetSubmissionDate: '2025-12-15',
    actualSubmissionDate: '2025-12-18',
    daysToTarget: -18,
    isOnTrack: true,
    riskLevel: 'low',
    dataSources: [
      { id: 'ds-007', type: 'real-world', name: 'Flatiron NSCLC Cohort', reference: 'RWE-2847-001', moduleLink: '/real-world/flatiron', lastUpdated: '2025-11-30', status: 'final' },
    ],
    linkedClaimIds: [],
    linkedSignalIds: [],
    hasSignalImpact: false,
    milestones: [
      { id: 'ms-015', name: 'Submission', targetDate: '2025-12-15', actualDate: '2025-12-18', status: 'completed', owner: 'Publications Team' },
      { id: 'ms-016', name: 'Initial Decision', targetDate: '2026-03-15', status: 'pending', owner: 'Journal' },
    ],
    tags: ['RWE', 'submitted'],
  },
];

// ============================================================================
// DEMO DATA - SCIENTIFIC CLAIMS (PLATFORM)
// ============================================================================

export const scientificClaims: ScientificClaim[] = [
  {
    id: 'claim-001',
    claimCode: 'CLM-LIG2847-001',
    claimText: 'Nexavant demonstrated a statistically significant improvement in progression-free survival (PFS) compared to docetaxel in patients with KRAS G12C-mutated NSCLC (median PFS 7.1 months vs 4.2 months; HR 0.56; 95% CI 0.44-0.72; p<0.0001).',
    shortDescription: 'PFS superiority vs docetaxel',
    category: 'efficacy',
    status: 'approved',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    indication: 'KRAS G12C+ NSCLC, 2L+',
    supportingStudies: ['LIG2847-301'],
    supportingPublications: ['pub-001'],
    linkedDataSources: [
      { id: 'ds-001', type: 'csr', name: 'LIG2847-301 CSR', reference: 'Section 11.1', lastUpdated: '2025-12-15', status: 'final' },
    ],
    approvedRegions: ['US', 'EU', 'Japan', 'Canada'],
    effectiveDate: '2025-06-15',
    version: '1.0',
    lastReviewedDate: '2025-12-01',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Publications Committee',
    linkedSignalIds: [],
    requiresReview: false,
    usageCount: 89,
    tags: ['primary-endpoint', 'PFS', 'efficacy'],
  },
  {
    id: 'claim-002',
    claimCode: 'CLM-LIG2847-002',
    claimText: 'Nexavant showed a clinically meaningful overall response rate (ORR) of 42.3% (95% CI 36.1-48.7%) with a median duration of response of 11.2 months.',
    shortDescription: 'ORR and DOR data',
    category: 'efficacy',
    status: 'approved',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    indication: 'KRAS G12C+ NSCLC, 2L+',
    supportingStudies: ['LIG2847-301', 'LIG2847-201'],
    supportingPublications: ['pub-001'],
    linkedDataSources: [
      { id: 'ds-001', type: 'csr', name: 'LIG2847-301 CSR', reference: 'Section 11.2', lastUpdated: '2025-12-15', status: 'final' },
    ],
    approvedRegions: ['US', 'EU', 'Japan', 'Canada'],
    effectiveDate: '2025-06-15',
    version: '1.0',
    lastReviewedDate: '2025-12-01',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Publications Committee',
    linkedSignalIds: [],
    requiresReview: false,
    usageCount: 67,
    tags: ['ORR', 'DOR', 'efficacy'],
  },
  {
    id: 'claim-003',
    claimCode: 'CLM-LIG2847-003',
    claimText: 'Nexavant was generally well-tolerated with a manageable safety profile. The most common adverse events (≥20%) were diarrhea (43%), nausea (31%), and fatigue (28%).',
    shortDescription: 'General tolerability profile',
    category: 'tolerability',
    status: 'approved',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    indication: 'KRAS G12C+ NSCLC, 2L+',
    supportingStudies: ['LIG2847-301'],
    supportingPublications: ['pub-001'],
    linkedDataSources: [
      { id: 'ds-001', type: 'csr', name: 'LIG2847-301 CSR', reference: 'Section 12', lastUpdated: '2025-12-15', status: 'final' },
    ],
    approvedRegions: ['US', 'EU', 'Japan', 'Canada'],
    effectiveDate: '2025-06-15',
    version: '1.0',
    lastReviewedDate: '2025-12-01',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Publications Committee',
    linkedSignalIds: [],
    requiresReview: false,
    usageCount: 112,
    tags: ['safety', 'tolerability', 'AEs'],
  },
  {
    id: 'claim-004',
    claimCode: 'CLM-LIG2847-004',
    claimText: 'QTc prolongation >60ms from baseline was observed in 3.2% of patients treated with Nexavant. Routine ECG monitoring is recommended.',
    shortDescription: 'QTc safety data',
    category: 'safety',
    status: 'under-review',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    indication: 'KRAS G12C+ NSCLC',
    supportingStudies: ['LIG2847-301', 'LIG2847-201'],
    supportingPublications: [],
    linkedDataSources: [
      { id: 'ds-003', type: 'pooled-analysis', name: 'Cardiac Safety Pooled Analysis', reference: 'PA-2847-CARDIAC', lastUpdated: '2025-12-28', status: 'interim' },
    ],
    approvedRegions: ['US', 'EU'],
    effectiveDate: '2025-08-01',
    version: '1.1',
    lastReviewedDate: '2025-12-28',
    lastReviewedBy: 'Dr. Jennifer Walsh',
    linkedSignalIds: ['sig-2'],
    requiresReview: true,
    reviewReason: 'Under review due to active safety signal SIG-2026-002 (QTc prolongation)',
    usageCount: 45,
    tags: ['cardiac', 'QTc', 'safety', 'signal-review'],
  },
  {
    id: 'claim-005',
    claimCode: 'CLM-LIG2847-005',
    claimText: 'Patients treated with Nexavant reported improvements in disease-related symptoms and maintained health-related quality of life throughout treatment.',
    shortDescription: 'PRO/QoL claim',
    category: 'patient-reported',
    status: 'pending-approval',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    indication: 'KRAS G12C+ NSCLC, 2L+',
    supportingStudies: ['LIG2847-301'],
    supportingPublications: ['pub-003'],
    linkedDataSources: [
      { id: 'ds-004', type: 'csr', name: 'NEXUS-1 PRO Dataset', reference: 'Module 5.3.5.1 PRO', lastUpdated: '2025-12-15', status: 'final' },
    ],
    approvedRegions: [],
    effectiveDate: '2026-03-01',
    version: '1.0',
    lastReviewedDate: '2025-12-20',
    lastReviewedBy: 'Dr. Emily Johnson',
    linkedSignalIds: [],
    requiresReview: false,
    usageCount: 0,
    tags: ['PRO', 'QoL', 'patient-centered'],
  },
];

// ============================================================================
// DEMO DATA - CONGRESSES
// ============================================================================

export const congresses: Congress[] = [
  {
    id: 'congress-001',
    name: 'American Society of Clinical Oncology Annual Meeting',
    abbreviation: 'ASCO 2026',
    type: 'major',
    location: 'Chicago, IL',
    startDate: '2026-05-29',
    endDate: '2026-06-02',
    abstractDeadline: '2026-02-15',
    lateBreakingDeadline: '2026-04-15',
    status: 'planning',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    submissions: [
      { id: 'sub-001', congressId: 'congress-001', publicationId: 'pub-005', title: 'NEXUS-1 Updated Efficacy and Safety', type: 'abstract', status: 'draft', presenterId: 'kol-001', presenterName: 'Dr. Sarah Chen' },
      { id: 'sub-002', congressId: 'congress-001', title: 'Cardiac Safety Analysis', type: 'poster', status: 'draft', presenterId: 'kol-004', presenterName: 'Dr. Robert Anderson' },
    ],
    attendees: ['Dr. Amanda Foster', 'Dr. Michael Torres', 'Dr. Lisa Park'],
    boothNumber: 'TBD',
    symposiumPlanned: true,
    symposiumDetails: 'Satellite symposium on KRAS-targeted therapy',
  },
  {
    id: 'congress-002',
    name: 'European Society for Medical Oncology Congress',
    abbreviation: 'ESMO 2026',
    type: 'major',
    location: 'Barcelona, Spain',
    startDate: '2026-09-13',
    endDate: '2026-09-17',
    abstractDeadline: '2026-05-01',
    status: 'planning',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    submissions: [],
    attendees: ['Dr. Amanda Foster'],
    symposiumPlanned: false,
  },
  {
    id: 'congress-003',
    name: 'World Conference on Lung Cancer',
    abbreviation: 'WCLC 2026',
    type: 'specialty',
    location: 'Singapore',
    startDate: '2026-08-09',
    endDate: '2026-08-12',
    abstractDeadline: '2026-04-15',
    status: 'planning',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    submissions: [],
    attendees: [],
    symposiumPlanned: true,
    symposiumDetails: 'Joint symposium on KRAS mutations in lung cancer',
  },
];

// ============================================================================
// DEMO DATA - DATA INTEGRATION ALERTS
// ============================================================================

export const dataIntegrationAlerts: DataIntegrationAlert[] = [
  {
    id: 'alert-001',
    type: 'signal-detected',
    severity: 'critical',
    title: 'Safety Signal Impact - Hepatotoxicity (SIG-2026-001)',
    description: 'Confirmed hepatotoxicity signal may impact 1 publication and 0 claims. Review required.',
    sourceModule: 'Safety',
    affectedPublications: ['pub-004'],
    affectedClaims: [],
    detectedDate: '2024-11-15',
    status: 'acknowledged',
    recommendedAction: 'Hold publication PUB-LIG2847-004 pending CCDS update. Review dependent content.',
  },
  {
    id: 'alert-002',
    type: 'signal-detected',
    severity: 'warning',
    title: 'Safety Signal Impact - QTc Prolongation (SIG-2026-002)',
    description: 'QTc signal may require updates to cardiac safety publication and claims.',
    sourceModule: 'Safety',
    affectedPublications: ['pub-002'],
    affectedClaims: ['claim-004'],
    detectedDate: '2024-10-01',
    status: 'acknowledged',
    recommendedAction: 'Await signal evaluation before finalizing PUB-LIG2847-002. Update claim CLM-LIG2847-004 if warranted.',
  },
  {
    id: 'alert-003',
    type: 'data-lock',
    severity: 'info',
    title: 'NEXUS-1 Data Lock Complete',
    description: 'Final data lock for LIG2847-301 completed. Updated data available for publications.',
    sourceModule: 'Clinical',
    affectedPublications: ['pub-001', 'pub-005'],
    affectedClaims: ['claim-001', 'claim-002'],
    detectedDate: '2025-12-31',
    status: 'resolved',
    resolvedDate: '2026-01-02',
    resolvedBy: 'Dr. Amanda Foster',
    recommendedAction: 'Incorporate final data into pending publications.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPublicationsByStatus(status: PublicationStatus): SciPublication[] {
  return sciPublications.filter(p => p.status === status);
}

export function getPublicationsByProduct(productId: string): SciPublication[] {
  return sciPublications.filter(p => p.productId === productId);
}

export function getPublicationsWithSignalImpact(): SciPublication[] {
  return sciPublications.filter(p => p.hasSignalImpact);
}

export function getPublicationsAtRisk(): SciPublication[] {
  return sciPublications.filter(p => p.riskLevel === 'high' || !p.isOnTrack);
}

export function getClaimsByStatus(status: ClaimStatus): ScientificClaim[] {
  return scientificClaims.filter(c => c.status === status);
}

export function getClaimsByProduct(productId: string): ScientificClaim[] {
  return scientificClaims.filter(c => c.productId === productId);
}

export function getClaimsRequiringReview(): ScientificClaim[] {
  return scientificClaims.filter(c => c.requiresReview);
}

export function getUpcomingCongresses(): Congress[] {
  const now = new Date();
  return congresses.filter(c => new Date(c.startDate) > now).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function getActiveAlerts(): DataIntegrationAlert[] {
  return dataIntegrationAlerts.filter(a => a.status !== 'resolved');
}

export function getCriticalAlerts(): DataIntegrationAlert[] {
  return dataIntegrationAlerts.filter(a => a.severity === 'critical' && a.status !== 'resolved');
}

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

export function getPublicationStatistics() {
  const total = sciPublications.length;
  const inPipeline = sciPublications.filter(p => !['published', 'accepted'].includes(p.status)).length;
  const published = sciPublications.filter(p => p.status === 'published').length;
  const submitted = sciPublications.filter(p => p.status === 'submitted').length;
  const atRisk = sciPublications.filter(p => p.riskLevel === 'high' || !p.isOnTrack).length;
  const withSignalImpact = sciPublications.filter(p => p.hasSignalImpact).length;
  const primaryManuscripts = sciPublications.filter(p => p.type === 'primary').length;
  const abstracts = sciPublications.filter(p => ['abstract', 'poster', 'oral'].includes(p.type)).length;
  
  // Count by status for pipeline view
  const statusCounts = {
    concept: sciPublications.filter(p => p.status === 'concept').length,
    protocol: sciPublications.filter(p => p.status === 'protocol').length,
    drafting: sciPublications.filter(p => p.status === 'drafting').length,
    'internal-review': sciPublications.filter(p => p.status === 'internal-review').length,
    'external-review': sciPublications.filter(p => p.status === 'external-review').length,
    submitted: sciPublications.filter(p => p.status === 'submitted').length,
    revision: sciPublications.filter(p => p.status === 'revision').length,
    accepted: sciPublications.filter(p => p.status === 'accepted').length,
    published: sciPublications.filter(p => p.status === 'published').length,
  };

  return {
    total,
    inPipeline,
    published,
    submitted,
    atRisk,
    withSignalImpact,
    primaryManuscripts,
    abstracts,
    statusCounts,
  };
}

export function getClaimStatistics() {
  const total = scientificClaims.length;
  const approved = scientificClaims.filter(c => c.status === 'approved').length;
  const pending = scientificClaims.filter(c => c.status === 'pending-approval').length;
  const underReview = scientificClaims.filter(c => c.status === 'under-review').length;
  const requiresReview = scientificClaims.filter(c => c.requiresReview).length;
  const totalUsage = scientificClaims.reduce((sum, c) => sum + c.usageCount, 0);
  
  return {
    total,
    approved,
    pending,
    underReview,
    requiresReview,
    totalUsage,
  };
}

export function getCongressStatistics() {
  const upcoming = congresses.filter(c => new Date(c.startDate) > new Date());
  const totalSubmissions = congresses.reduce((sum, c) => sum + c.submissions.length, 0);
  const pendingSubmissions = congresses.reduce((sum, c) => sum + c.submissions.filter(s => s.status === 'draft').length, 0);
  
  return {
    total: congresses.length,
    upcoming: upcoming.length,
    totalSubmissions,
    pendingSubmissions,
    nextCongress: upcoming[0] || null,
  };
}

export function getAlertStatistics() {
  const active = dataIntegrationAlerts.filter(a => a.status !== 'resolved');
  const critical = active.filter(a => a.severity === 'critical').length;
  const warning = active.filter(a => a.severity === 'warning').length;
  
  return {
    total: active.length,
    critical,
    warning,
    info: active.length - critical - warning,
  };
}
