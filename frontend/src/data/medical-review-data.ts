// ============================================================================
// Medical Review Workflow Data - v0.5.3
// MLR Review, Promotional Materials, Medical Communications Review
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type ReviewItemType = 
  | 'promotional-material' 
  | 'scientific-presentation' 
  | 'congress-abstract' 
  | 'publication-manuscript'
  | 'social-media-content'
  | 'hcp-communication'
  | 'patient-education'
  | 'sales-aid'
  | 'press-release'
  | 'training-material';

export type ReviewStatus = 
  | 'draft'
  | 'submitted'
  | 'medical-review'
  | 'legal-review'
  | 'regulatory-review'
  | 'revision-requested'
  | 'approved'
  | 'approved-with-conditions'
  | 'rejected'
  | 'expired';

export type ReviewerRole = 'medical' | 'legal' | 'regulatory' | 'brand' | 'compliance';

export type ReviewPriority = 'critical' | 'high' | 'standard' | 'low';

export type CommentType = 'required-change' | 'suggestion' | 'question' | 'approval-note' | 'legal-concern' | 'regulatory-concern';

export type ReviewOutcome = 'approved' | 'approved-with-changes' | 'revisions-required' | 'rejected';

export interface ReviewItem {
  id: string;
  itemCode: string;
  title: string;
  description: string;
  type: ReviewItemType;
  status: ReviewStatus;
  priority: ReviewPriority;
  productId: string;
  productName: string;
  indication: string;
  targetAudience: 'hcp' | 'patient' | 'caregiver' | 'payer' | 'internal';
  requestedBy: string;
  requestedDate: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  currentReviewer?: string;
  currentReviewerRole?: ReviewerRole;
  version: string;
  previousVersions: number;
  hasClaimsReference: boolean;
  linkedClaimIds: string[];
  linkedPublicationIds: string[];
  linkedSignalIds: string[];
  hasSignalImpact: boolean;
  attachments: ReviewAttachment[];
  reviewHistory: ReviewHistoryEntry[];
  comments: ReviewComment[];
  tags: string[];
}

export interface ReviewAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'pptx' | 'docx' | 'image' | 'video';
  size: string;
  uploadedDate: string;
  uploadedBy: string;
  version: string;
}

export interface ReviewHistoryEntry {
  id: string;
  action: 'submitted' | 'assigned' | 'reviewed' | 'commented' | 'approved' | 'rejected' | 'revision-requested' | 'resubmitted';
  performedBy: string;
  performedByRole: ReviewerRole;
  timestamp: string;
  notes?: string;
  outcome?: ReviewOutcome;
}

export interface ReviewComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  type: CommentType;
  text: string;
  location?: string;
  pageNumber?: number;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedDate?: string;
  response?: string;
  createdDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ReviewerAssignment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  department: string;
  assignedDate: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedDate?: string;
  outcome?: ReviewOutcome;
  turnaroundHours?: number;
}

export interface ReviewQueue {
  id: string;
  reviewerRole: ReviewerRole;
  totalItems: number;
  overdueItems: number;
  criticalItems: number;
  avgTurnaroundDays: number;
  targetTurnaroundDays: number;
}

export interface ReviewMetrics {
  totalSubmissions: number;
  pendingReview: number;
  inMedicalReview: number;
  inLegalReview: number;
  inRegulatoryReview: number;
  awaitingRevision: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  avgCycleTimeDays: number;
  onTimeApprovalRate: number;
  firstPassApprovalRate: number;
}

// ============================================================================
// LABELS
// ============================================================================

export const REVIEW_TYPE_LABELS: Record<ReviewItemType, string> = {
  'promotional-material': 'Promotional Material',
  'scientific-presentation': 'Scientific Presentation',
  'congress-abstract': 'Congress Abstract',
  'publication-manuscript': 'Publication Manuscript',
  'social-media-content': 'Social Media Content',
  'hcp-communication': 'HCP Communication',
  'patient-education': 'Patient Education',
  'sales-aid': 'Sales Aid',
  'press-release': 'Press Release',
  'training-material': 'Training Material',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  'draft': 'Draft',
  'submitted': 'Submitted',
  'medical-review': 'Medical Review',
  'legal-review': 'Legal Review',
  'regulatory-review': 'Regulatory Review',
  'revision-requested': 'Revision Requested',
  'approved': 'Approved',
  'approved-with-conditions': 'Approved w/ Conditions',
  'rejected': 'Rejected',
  'expired': 'Expired',
};

export const REVIEWER_ROLE_LABELS: Record<ReviewerRole, string> = {
  'medical': 'Medical',
  'legal': 'Legal',
  'regulatory': 'Regulatory',
  'brand': 'Brand',
  'compliance': 'Compliance',
};

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  'required-change': 'Required Change',
  'suggestion': 'Suggestion',
  'question': 'Question',
  'approval-note': 'Approval Note',
  'legal-concern': 'Legal Concern',
  'regulatory-concern': 'Regulatory Concern',
};

// ============================================================================
// DEMO DATA
// ============================================================================

export const reviewItems: ReviewItem[] = [
  {
    id: 'rev-001',
    itemCode: 'MLR-2026-001',
    title: 'Nexavant HCP Detail Aid - Efficacy Focus',
    description: 'Two-page detail aid highlighting Phase 3 efficacy data for oncology specialists',
    type: 'sales-aid',
    status: 'medical-review',
    priority: 'high',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'hcp',
    requestedBy: 'Marketing - US Oncology',
    requestedDate: '2025-12-18',
    dueDate: '2026-01-08',
    daysUntilDue: 6,
    isOverdue: false,
    currentReviewer: 'Dr. Sarah Mitchell',
    currentReviewerRole: 'medical',
    version: '1.2',
    previousVersions: 2,
    hasClaimsReference: true,
    linkedClaimIds: ['CLM-001', 'CLM-003', 'CLM-007'],
    linkedPublicationIds: ['PUB-2025-001'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-001', name: 'NXV-DetailAid-v1.2.pdf', type: 'pdf', size: '2.4 MB', uploadedDate: '2025-12-28', uploadedBy: 'Jennifer Walsh', version: '1.2' },
      { id: 'att-002', name: 'NXV-DetailAid-SourceDocs.pdf', type: 'pdf', size: '8.1 MB', uploadedDate: '2025-12-28', uploadedBy: 'Jennifer Walsh', version: '1.2' },
    ],
    reviewHistory: [
      { id: 'rh-001', action: 'submitted', performedBy: 'Jennifer Walsh', performedByRole: 'brand', timestamp: '2025-12-18T09:00:00Z' },
      { id: 'rh-002', action: 'assigned', performedBy: 'System', performedByRole: 'medical', timestamp: '2025-12-18T09:05:00Z', notes: 'Auto-assigned to Medical Review queue' },
      { id: 'rh-003', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-20T14:30:00Z', outcome: 'revisions-required' },
      { id: 'rh-004', action: 'resubmitted', performedBy: 'Jennifer Walsh', performedByRole: 'brand', timestamp: '2025-12-28T11:00:00Z', notes: 'Addressed all medical reviewer comments' },
    ],
    comments: [
      {
        id: 'cmt-001',
        reviewerId: 'rev-sarah',
        reviewerName: 'Dr. Sarah Mitchell',
        reviewerRole: 'medical',
        type: 'required-change',
        text: 'The ORR claim needs to include 95% CI per approved labeling language',
        location: 'Page 1, Efficacy Callout',
        pageNumber: 1,
        isResolved: true,
        resolvedBy: 'Jennifer Walsh',
        resolvedDate: '2025-12-28',
        response: 'Updated to include CI: 42.3% (95% CI: 38.1-46.5)',
        createdDate: '2025-12-20T14:30:00Z',
        priority: 'high',
      },
      {
        id: 'cmt-002',
        reviewerId: 'rev-sarah',
        reviewerName: 'Dr. Sarah Mitchell',
        reviewerRole: 'medical',
        type: 'suggestion',
        text: 'Consider adding median DOR to strengthen the efficacy narrative',
        location: 'Page 2, Duration Data',
        pageNumber: 2,
        isResolved: true,
        resolvedBy: 'Jennifer Walsh',
        resolvedDate: '2025-12-28',
        response: 'Added median DOR of 14.2 months with appropriate citation',
        createdDate: '2025-12-20T14:35:00Z',
        priority: 'medium',
      },
    ],
    tags: ['detail-aid', 'efficacy', 'us-market', 'oncology'],
  },
  {
    id: 'rev-002',
    itemCode: 'MLR-2026-002',
    title: 'Nexavant Safety Update - HCP Letter',
    description: 'Dear Healthcare Provider letter regarding updated hepatotoxicity monitoring recommendations',
    type: 'hcp-communication',
    status: 'legal-review',
    priority: 'critical',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'hcp',
    requestedBy: 'Medical Affairs - Safety Communications',
    requestedDate: '2025-12-30',
    dueDate: '2026-01-03',
    daysUntilDue: 1,
    isOverdue: false,
    currentReviewer: 'Robert Chen, JD',
    currentReviewerRole: 'legal',
    version: '1.0',
    previousVersions: 0,
    hasClaimsReference: false,
    linkedClaimIds: [],
    linkedPublicationIds: [],
    linkedSignalIds: ['SIG-2026-001'],
    hasSignalImpact: true,
    attachments: [
      { id: 'att-003', name: 'NXV-SafetyLetter-Draft.docx', type: 'docx', size: '156 KB', uploadedDate: '2025-12-30', uploadedBy: 'Dr. Amanda Roberts', version: '1.0' },
    ],
    reviewHistory: [
      { id: 'rh-005', action: 'submitted', performedBy: 'Dr. Amanda Roberts', performedByRole: 'medical', timestamp: '2025-12-30T08:00:00Z', notes: 'Expedited review requested due to safety signal correlation' },
      { id: 'rh-006', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-30T16:00:00Z', outcome: 'approved' },
      { id: 'rh-007', action: 'assigned', performedBy: 'System', performedByRole: 'legal', timestamp: '2025-12-30T16:05:00Z' },
    ],
    comments: [
      {
        id: 'cmt-003',
        reviewerId: 'rev-robert',
        reviewerName: 'Robert Chen, JD',
        reviewerRole: 'legal',
        type: 'question',
        text: 'Has this language been coordinated with the FDA response team?',
        location: 'Monitoring Recommendations Section',
        pageNumber: 1,
        isResolved: false,
        createdDate: '2026-01-01T10:00:00Z',
        priority: 'critical',
      },
    ],
    tags: ['safety', 'dhcp-letter', 'urgent', 'signal-related'],
  },
  {
    id: 'rev-003',
    itemCode: 'MLR-2026-003',
    title: 'ASCO 2026 Poster - Biomarker Subgroup Analysis',
    description: 'Scientific poster presenting biomarker-driven subgroup efficacy analysis from NEXUS-1',
    type: 'congress-abstract',
    status: 'approved',
    priority: 'high',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'hcp',
    requestedBy: 'Scientific Communications',
    requestedDate: '2025-12-01',
    dueDate: '2025-12-20',
    daysUntilDue: -13,
    isOverdue: false,
    currentReviewer: undefined,
    currentReviewerRole: undefined,
    version: '2.1',
    previousVersions: 3,
    hasClaimsReference: true,
    linkedClaimIds: ['CLM-005', 'CLM-008'],
    linkedPublicationIds: ['PUB-2025-003'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-004', name: 'ASCO2026-Poster-Final.pptx', type: 'pptx', size: '4.8 MB', uploadedDate: '2025-12-18', uploadedBy: 'Dr. Lisa Park', version: '2.1' },
    ],
    reviewHistory: [
      { id: 'rh-008', action: 'submitted', performedBy: 'Dr. Lisa Park', performedByRole: 'medical', timestamp: '2025-12-01T09:00:00Z' },
      { id: 'rh-009', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-05T11:00:00Z', outcome: 'revisions-required' },
      { id: 'rh-010', action: 'resubmitted', performedBy: 'Dr. Lisa Park', performedByRole: 'medical', timestamp: '2025-12-10T14:00:00Z' },
      { id: 'rh-011', action: 'reviewed', performedBy: 'Robert Chen, JD', performedByRole: 'legal', timestamp: '2025-12-15T09:00:00Z', outcome: 'approved' },
      { id: 'rh-012', action: 'reviewed', performedBy: 'Dr. Emily Watson', performedByRole: 'regulatory', timestamp: '2025-12-18T16:00:00Z', outcome: 'approved' },
      { id: 'rh-013', action: 'approved', performedBy: 'System', performedByRole: 'compliance', timestamp: '2025-12-18T16:05:00Z' },
    ],
    comments: [],
    tags: ['congress', 'asco', 'biomarker', 'poster'],
  },
  {
    id: 'rev-004',
    itemCode: 'MLR-2026-004',
    title: 'Patient Support Program Brochure',
    description: 'Patient-facing brochure explaining Nexavant Patient Support Program enrollment and benefits',
    type: 'patient-education',
    status: 'revision-requested',
    priority: 'standard',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'patient',
    requestedBy: 'Patient Services',
    requestedDate: '2025-12-15',
    dueDate: '2026-01-10',
    daysUntilDue: 8,
    isOverdue: false,
    currentReviewer: 'Jennifer Walsh',
    currentReviewerRole: 'brand',
    version: '1.1',
    previousVersions: 1,
    hasClaimsReference: false,
    linkedClaimIds: [],
    linkedPublicationIds: [],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-005', name: 'PSP-Brochure-v1.1.pdf', type: 'pdf', size: '1.2 MB', uploadedDate: '2025-12-22', uploadedBy: 'Maria Garcia', version: '1.1' },
    ],
    reviewHistory: [
      { id: 'rh-014', action: 'submitted', performedBy: 'Maria Garcia', performedByRole: 'brand', timestamp: '2025-12-15T10:00:00Z' },
      { id: 'rh-015', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-18T14:00:00Z', outcome: 'approved' },
      { id: 'rh-016', action: 'reviewed', performedBy: 'Dr. Emily Watson', performedByRole: 'regulatory', timestamp: '2025-12-22T11:00:00Z', outcome: 'revisions-required' },
    ],
    comments: [
      {
        id: 'cmt-004',
        reviewerId: 'rev-emily',
        reviewerName: 'Dr. Emily Watson',
        reviewerRole: 'regulatory',
        type: 'required-change',
        text: 'Fair balance statement needs to be more prominent per FDA guidance',
        location: 'Back panel',
        pageNumber: 4,
        isResolved: false,
        createdDate: '2025-12-22T11:00:00Z',
        priority: 'high',
      },
      {
        id: 'cmt-005',
        reviewerId: 'rev-emily',
        reviewerName: 'Dr. Emily Watson',
        reviewerRole: 'regulatory',
        type: 'required-change',
        text: 'Need to include ISI reference or full ISI depending on intended distribution',
        location: 'Footer',
        pageNumber: 4,
        isResolved: false,
        createdDate: '2025-12-22T11:05:00Z',
        priority: 'high',
      },
    ],
    tags: ['patient', 'psp', 'brochure'],
  },
  {
    id: 'rev-005',
    itemCode: 'MLR-2026-005',
    title: 'Nexavant Launch Deck - Cardiology Update',
    description: 'Updated sales presentation incorporating QTc prolongation data for cardiology-focused discussions',
    type: 'sales-aid',
    status: 'medical-review',
    priority: 'high',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'hcp',
    requestedBy: 'Marketing - US Oncology',
    requestedDate: '2025-12-28',
    dueDate: '2026-01-06',
    daysUntilDue: 4,
    isOverdue: false,
    currentReviewer: 'Dr. Sarah Mitchell',
    currentReviewerRole: 'medical',
    version: '1.0',
    previousVersions: 0,
    hasClaimsReference: true,
    linkedClaimIds: ['CLM-002', 'CLM-009'],
    linkedPublicationIds: [],
    linkedSignalIds: ['SIG-2026-002'],
    hasSignalImpact: true,
    attachments: [
      { id: 'att-006', name: 'NXV-LaunchDeck-Cardio.pptx', type: 'pptx', size: '12.3 MB', uploadedDate: '2025-12-28', uploadedBy: 'Michael Torres', version: '1.0' },
    ],
    reviewHistory: [
      { id: 'rh-017', action: 'submitted', performedBy: 'Michael Torres', performedByRole: 'brand', timestamp: '2025-12-28T15:00:00Z' },
      { id: 'rh-018', action: 'assigned', performedBy: 'System', performedByRole: 'medical', timestamp: '2025-12-28T15:05:00Z' },
    ],
    comments: [],
    tags: ['sales-deck', 'cardiology', 'safety', 'signal-related'],
  },
  {
    id: 'rev-006',
    itemCode: 'MLR-2026-006',
    title: 'Social Media Campaign - Patient Stories',
    description: 'Series of patient testimonial posts for LinkedIn and Twitter highlighting treatment journeys',
    type: 'social-media-content',
    status: 'regulatory-review',
    priority: 'standard',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'patient',
    requestedBy: 'Digital Marketing',
    requestedDate: '2025-12-20',
    dueDate: '2026-01-08',
    daysUntilDue: 6,
    isOverdue: false,
    currentReviewer: 'Dr. Emily Watson',
    currentReviewerRole: 'regulatory',
    version: '1.3',
    previousVersions: 3,
    hasClaimsReference: false,
    linkedClaimIds: [],
    linkedPublicationIds: [],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-007', name: 'SocialMedia-PatientStories.pdf', type: 'pdf', size: '3.5 MB', uploadedDate: '2025-12-30', uploadedBy: 'Alex Kim', version: '1.3' },
    ],
    reviewHistory: [
      { id: 'rh-019', action: 'submitted', performedBy: 'Alex Kim', performedByRole: 'brand', timestamp: '2025-12-20T11:00:00Z' },
      { id: 'rh-020', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-23T09:00:00Z', outcome: 'approved-with-changes' },
      { id: 'rh-021', action: 'resubmitted', performedBy: 'Alex Kim', performedByRole: 'brand', timestamp: '2025-12-27T14:00:00Z' },
      { id: 'rh-022', action: 'reviewed', performedBy: 'Robert Chen, JD', performedByRole: 'legal', timestamp: '2025-12-30T10:00:00Z', outcome: 'approved' },
      { id: 'rh-023', action: 'assigned', performedBy: 'System', performedByRole: 'regulatory', timestamp: '2025-12-30T10:05:00Z' },
    ],
    comments: [],
    tags: ['social-media', 'patient-stories', 'digital'],
  },
  {
    id: 'rev-007',
    itemCode: 'MLR-2026-007',
    title: 'MSL Training Module - Mechanism of Action',
    description: 'Internal training presentation on Nexavant mechanism of action for MSL team',
    type: 'training-material',
    status: 'approved',
    priority: 'standard',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'internal',
    requestedBy: 'Medical Affairs - Training',
    requestedDate: '2025-12-10',
    dueDate: '2025-12-28',
    daysUntilDue: -5,
    isOverdue: false,
    currentReviewer: undefined,
    currentReviewerRole: undefined,
    version: '1.0',
    previousVersions: 0,
    hasClaimsReference: true,
    linkedClaimIds: ['CLM-004'],
    linkedPublicationIds: ['PUB-2025-002'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-008', name: 'MSL-Training-MOA.pptx', type: 'pptx', size: '18.5 MB', uploadedDate: '2025-12-28', uploadedBy: 'Dr. David Chen', version: '1.0' },
    ],
    reviewHistory: [
      { id: 'rh-024', action: 'submitted', performedBy: 'Dr. David Chen', performedByRole: 'medical', timestamp: '2025-12-10T09:00:00Z' },
      { id: 'rh-025', action: 'reviewed', performedBy: 'Dr. Sarah Mitchell', performedByRole: 'medical', timestamp: '2025-12-15T11:00:00Z', outcome: 'approved' },
      { id: 'rh-026', action: 'approved', performedBy: 'System', performedByRole: 'compliance', timestamp: '2025-12-15T11:05:00Z' },
    ],
    comments: [],
    tags: ['training', 'msl', 'internal', 'moa'],
  },
  {
    id: 'rev-008',
    itemCode: 'MLR-2026-008',
    title: 'Press Release - NEXUS-1 Primary Endpoint Results',
    description: 'Corporate press release announcing positive primary endpoint results from NEXUS-1 trial',
    type: 'press-release',
    status: 'submitted',
    priority: 'critical',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    indication: 'NSCLC',
    targetAudience: 'hcp',
    requestedBy: 'Corporate Communications',
    requestedDate: '2026-01-02',
    dueDate: '2026-01-05',
    daysUntilDue: 3,
    isOverdue: false,
    currentReviewer: undefined,
    currentReviewerRole: undefined,
    version: '1.0',
    previousVersions: 0,
    hasClaimsReference: true,
    linkedClaimIds: ['CLM-001', 'CLM-003'],
    linkedPublicationIds: ['PUB-2025-001'],
    linkedSignalIds: [],
    hasSignalImpact: false,
    attachments: [
      { id: 'att-009', name: 'PressRelease-NEXUS1-Results.docx', type: 'docx', size: '45 KB', uploadedDate: '2026-01-02', uploadedBy: 'Corporate Comms', version: '1.0' },
    ],
    reviewHistory: [
      { id: 'rh-027', action: 'submitted', performedBy: 'Sarah Johnson', performedByRole: 'brand', timestamp: '2026-01-02T08:00:00Z', notes: 'Expedited review requested - coordinating with IR team' },
    ],
    comments: [],
    tags: ['press-release', 'corporate', 'nexus-1', 'results'],
  },
];

export const reviewQueues: ReviewQueue[] = [
  { id: 'q-medical', reviewerRole: 'medical', totalItems: 8, overdueItems: 1, criticalItems: 2, avgTurnaroundDays: 3.2, targetTurnaroundDays: 5 },
  { id: 'q-legal', reviewerRole: 'legal', totalItems: 4, overdueItems: 0, criticalItems: 1, avgTurnaroundDays: 2.8, targetTurnaroundDays: 3 },
  { id: 'q-regulatory', reviewerRole: 'regulatory', totalItems: 6, overdueItems: 0, criticalItems: 0, avgTurnaroundDays: 4.1, targetTurnaroundDays: 5 },
  { id: 'q-brand', reviewerRole: 'brand', totalItems: 3, overdueItems: 1, criticalItems: 0, avgTurnaroundDays: 1.5, targetTurnaroundDays: 2 },
  { id: 'q-compliance', reviewerRole: 'compliance', totalItems: 2, overdueItems: 0, criticalItems: 0, avgTurnaroundDays: 1.2, targetTurnaroundDays: 2 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getReviewMetrics(): ReviewMetrics {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const approvedThisMonth = reviewItems.filter(
    item => item.status === 'approved' && 
    item.reviewHistory.some(h => h.action === 'approved' && new Date(h.timestamp) >= monthStart)
  ).length;
  
  const rejectedThisMonth = reviewItems.filter(
    item => item.status === 'rejected' &&
    item.reviewHistory.some(h => h.action === 'rejected' && new Date(h.timestamp) >= monthStart)
  ).length;

  return {
    totalSubmissions: reviewItems.length,
    pendingReview: reviewItems.filter(i => i.status === 'submitted').length,
    inMedicalReview: reviewItems.filter(i => i.status === 'medical-review').length,
    inLegalReview: reviewItems.filter(i => i.status === 'legal-review').length,
    inRegulatoryReview: reviewItems.filter(i => i.status === 'regulatory-review').length,
    awaitingRevision: reviewItems.filter(i => i.status === 'revision-requested').length,
    approvedThisMonth,
    rejectedThisMonth,
    avgCycleTimeDays: 8.5,
    onTimeApprovalRate: 87,
    firstPassApprovalRate: 62,
  };
}

export function getReviewsByStatus(status: ReviewStatus): ReviewItem[] {
  return reviewItems.filter(item => item.status === status);
}

export function getReviewsByType(type: ReviewItemType): ReviewItem[] {
  return reviewItems.filter(item => item.type === type);
}

export function getOverdueReviews(): ReviewItem[] {
  return reviewItems.filter(item => item.isOverdue && !['approved', 'rejected', 'expired'].includes(item.status));
}

export function getSignalRelatedReviews(): ReviewItem[] {
  return reviewItems.filter(item => item.hasSignalImpact);
}

export function getCriticalReviews(): ReviewItem[] {
  return reviewItems.filter(item => item.priority === 'critical' && !['approved', 'rejected', 'expired'].includes(item.status));
}

export function getReviewsByReviewer(reviewerRole: ReviewerRole): ReviewItem[] {
  return reviewItems.filter(item => item.currentReviewerRole === reviewerRole);
}

export function getUnresolvedComments(itemId: string): ReviewComment[] {
  const item = reviewItems.find(i => i.id === itemId);
  return item ? item.comments.filter(c => !c.isResolved) : [];
}

export function getReviewQueueStats(): { role: ReviewerRole; pending: number; overdue: number; critical: number }[] {
  const roles: ReviewerRole[] = ['medical', 'legal', 'regulatory', 'brand', 'compliance'];
  return roles.map(role => {
    const items = getReviewsByReviewer(role);
    return {
      role,
      pending: items.length,
      overdue: items.filter(i => i.isOverdue).length,
      critical: items.filter(i => i.priority === 'critical').length,
    };
  });
}

export function getReviewTypeDistribution(): { type: ReviewItemType; count: number; approved: number; pending: number }[] {
  const types: ReviewItemType[] = ['promotional-material', 'scientific-presentation', 'congress-abstract', 'publication-manuscript', 'social-media-content', 'hcp-communication', 'patient-education', 'sales-aid', 'press-release', 'training-material'];
  return types.map(type => {
    const items = reviewItems.filter(i => i.type === type);
    return {
      type,
      count: items.length,
      approved: items.filter(i => i.status === 'approved').length,
      pending: items.filter(i => !['approved', 'rejected', 'expired'].includes(i.status)).length,
    };
  }).filter(t => t.count > 0);
}
