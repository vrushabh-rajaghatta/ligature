// ============================================================================
// MSL Activities & Field Insights Data - v0.5.2
// Territory Management, Activity Tracking, Field Insights, Cross-Module Integration
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type MSLActivityType = 
  | 'scientific-exchange' 
  | 'congress-meeting' 
  | 'investigator-meeting'
  | 'site-visit'
  | 'advisory-board'
  | 'speaker-program'
  | 'publication-discussion'
  | 'data-presentation'
  | 'training'
  | 'follow-up';

export type MSLOutcome = 
  | 'insight-gained'
  | 'data-presented'
  | 'collaboration-discussed'
  | 'follow-up-needed'
  | 'issue-identified'
  | 'relationship-strengthened'
  | 'competitive-intel'
  | 'no-outcome';

export type InsightCategory = 
  | 'clinical-practice'
  | 'competitive-intel'
  | 'safety-observation'
  | 'efficacy-feedback'
  | 'unmet-need'
  | 'study-interest'
  | 'formulary-access'
  | 'patient-population'
  | 'real-world-experience';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'under-review' | 'actioned' | 'closed';
export type TerritoryRegion = 'northeast' | 'southeast' | 'midwest' | 'west' | 'southwest';

export interface MSLProfile {
  id: string;
  name: string;
  credentials: string;
  title: string;
  email: string;
  phone: string;
  territory: string;
  region: TerritoryRegion;
  primaryProducts: string[];
  therapeuticAreas: string[];
  assignedKOLCount: number;
  tier1KOLs: number;
  tier2KOLs: number;
  tier3KOLs: number;
  emergingKOLs: number;
  ytdInteractions: number;
  ytdInsights: number;
  coveragePercentage: number;
  lastActivityDate: string;
  status: 'active' | 'on-leave' | 'training';
  performanceRating: number; // 1-5
  hireDate: string;
}

export interface MSLActivity {
  id: string;
  activityCode: string;
  mslId: string;
  mslName: string;
  kolId: string;
  kolName: string;
  kolTier: 'tier-1' | 'tier-2' | 'tier-3' | 'emerging';
  kolInstitution: string;
  date: string;
  duration: number; // minutes
  type: MSLActivityType;
  format: 'in-person' | 'virtual' | 'phone' | 'email';
  location?: string;
  productId: string;
  productName: string;
  therapeuticArea: string;
  outcome: MSLOutcome;
  insights: FieldInsight[];
  meetingObjective?: string;
  discussionTopics: string[];
  materialsShared: string[];
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  linkedCongressId?: string;
  linkedAdvisoryBoardId?: string;
  linkedStudyId?: string;
  complianceVerified: boolean;
  approvalStatus: 'draft' | 'submitted' | 'approved';
  createdDate: string;
  lastModified: string;
}

export interface FieldInsight {
  id: string;
  insightCode: string;
  activityId: string;
  mslId: string;
  mslName: string;
  kolId?: string;
  kolName?: string;
  date: string;
  category: InsightCategory;
  priority: InsightPriority;
  status: InsightStatus;
  title: string;
  description: string;
  verbatimQuote?: string;
  productId: string;
  productName: string;
  therapeuticArea: string;
  indication?: string;
  tags: string[];
  linkedSignalIds: string[];
  hasSignalRelevance: boolean;
  linkedStudyIds: string[];
  linkedClaimIds: string[];
  recommendedAction?: string;
  actionTakenDate?: string;
  actionTakenBy?: string;
  actionNotes?: string;
  source: 'field-activity' | 'congress' | 'advisory-board' | 'proactive';
  aggregatedCount: number; // how many similar insights
  relatedInsightIds: string[];
  createdDate: string;
  reviewedDate?: string;
  reviewedBy?: string;
}

export interface TerritoryMetrics {
  region: TerritoryRegion;
  regionName: string;
  mslCount: number;
  totalKOLs: number;
  tier1Coverage: number;
  tier2Coverage: number;
  ytdActivities: number;
  ytdInsights: number;
  avgEngagementScore: number;
  topProducts: { productId: string; productName: string; interactionCount: number }[];
}

export interface InsightTrend {
  category: InsightCategory;
  categoryLabel: string;
  currentCount: number;
  previousCount: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  topProducts: string[];
}

export interface CrossModuleAlert {
  id: string;
  type: 'safety-signal' | 'clinical-update' | 'label-change' | 'competitive-event';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  sourceModule: string;
  sourceReference: string;
  detectedDate: string;
  relevantTerritories: TerritoryRegion[];
  relevantKOLIds: string[];
  relevantMSLIds: string[];
  recommendedFieldAction: string;
  status: 'new' | 'acknowledged' | 'field-briefed' | 'resolved';
  linkedInsightIds: string[];
}

// ============================================================================
// LABELS & CONSTANTS
// ============================================================================

export const ACTIVITY_TYPE_LABELS: Record<MSLActivityType, string> = {
  'scientific-exchange': 'Scientific Exchange',
  'congress-meeting': 'Congress Meeting',
  'investigator-meeting': 'Investigator Meeting',
  'site-visit': 'Site Visit',
  'advisory-board': 'Advisory Board',
  'speaker-program': 'Speaker Program',
  'publication-discussion': 'Publication Discussion',
  'data-presentation': 'Data Presentation',
  'training': 'Training',
  'follow-up': 'Follow-up',
};

export const OUTCOME_LABELS: Record<MSLOutcome, string> = {
  'insight-gained': 'Insight Gained',
  'data-presented': 'Data Presented',
  'collaboration-discussed': 'Collaboration Discussed',
  'follow-up-needed': 'Follow-up Needed',
  'issue-identified': 'Issue Identified',
  'relationship-strengthened': 'Relationship Strengthened',
  'competitive-intel': 'Competitive Intel',
  'no-outcome': 'No Outcome',
};

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  'clinical-practice': 'Clinical Practice',
  'competitive-intel': 'Competitive Intelligence',
  'safety-observation': 'Safety Observation',
  'efficacy-feedback': 'Efficacy Feedback',
  'unmet-need': 'Unmet Need',
  'study-interest': 'Study Interest',
  'formulary-access': 'Formulary/Access',
  'patient-population': 'Patient Population',
  'real-world-experience': 'Real-World Experience',
};

export const REGION_LABELS: Record<TerritoryRegion, string> = {
  'northeast': 'Northeast',
  'southeast': 'Southeast',
  'midwest': 'Midwest',
  'west': 'West',
  'southwest': 'Southwest',
};

// ============================================================================
// DEMO DATA - MSL TEAM
// ============================================================================

export const mslProfiles: MSLProfile[] = [
  {
    id: 'msl-001',
    name: 'Dr. Michael Torres',
    credentials: 'PharmD, PhD',
    title: 'Senior Medical Science Liaison',
    email: 'michael.torres@ligature.com',
    phone: '(212) 555-0147',
    territory: 'New York Metro / New England',
    region: 'northeast',
    primaryProducts: ['LIG-2847'],
    therapeuticAreas: ['Oncology'],
    assignedKOLCount: 28,
    tier1KOLs: 6,
    tier2KOLs: 12,
    tier3KOLs: 7,
    emergingKOLs: 3,
    ytdInteractions: 187,
    ytdInsights: 43,
    coveragePercentage: 92,
    lastActivityDate: '2025-12-30',
    status: 'active',
    performanceRating: 5,
    hireDate: '2021-03-15',
  },
  {
    id: 'msl-002',
    name: 'Dr. Lisa Park',
    credentials: 'MD, PhD',
    title: 'Medical Science Liaison',
    email: 'lisa.park@ligature.com',
    phone: '(713) 555-0234',
    territory: 'Texas / Oklahoma',
    region: 'southwest',
    primaryProducts: ['LIG-2847'],
    therapeuticAreas: ['Oncology', 'Hematology'],
    assignedKOLCount: 24,
    tier1KOLs: 4,
    tier2KOLs: 10,
    tier3KOLs: 8,
    emergingKOLs: 2,
    ytdInteractions: 156,
    ytdInsights: 38,
    coveragePercentage: 88,
    lastActivityDate: '2025-12-28',
    status: 'active',
    performanceRating: 4,
    hireDate: '2022-06-01',
  },
  {
    id: 'msl-003',
    name: 'Dr. Jennifer Walsh',
    credentials: 'PharmD, BCOP',
    title: 'Medical Science Liaison',
    email: 'jennifer.walsh@ligature.com',
    phone: '(415) 555-0312',
    territory: 'California / Pacific Northwest',
    region: 'west',
    primaryProducts: ['LIG-2847', 'VLX-990'],
    therapeuticAreas: ['Oncology'],
    assignedKOLCount: 32,
    tier1KOLs: 5,
    tier2KOLs: 14,
    tier3KOLs: 10,
    emergingKOLs: 3,
    ytdInteractions: 142,
    ytdInsights: 31,
    coveragePercentage: 85,
    lastActivityDate: '2025-12-29',
    status: 'active',
    performanceRating: 4,
    hireDate: '2022-09-15',
  },
  {
    id: 'msl-004',
    name: 'Dr. David Chen',
    credentials: 'PhD',
    title: 'Medical Science Liaison',
    email: 'david.chen@ligature.com',
    phone: '(312) 555-0456',
    territory: 'Great Lakes',
    region: 'midwest',
    primaryProducts: ['LIG-2847'],
    therapeuticAreas: ['Oncology'],
    assignedKOLCount: 22,
    tier1KOLs: 3,
    tier2KOLs: 9,
    tier3KOLs: 8,
    emergingKOLs: 2,
    ytdInteractions: 128,
    ytdInsights: 27,
    coveragePercentage: 82,
    lastActivityDate: '2025-12-27',
    status: 'active',
    performanceRating: 4,
    hireDate: '2023-01-10',
  },
  {
    id: 'msl-005',
    name: 'Dr. Amanda Roberts',
    credentials: 'PharmD, PhD',
    title: 'Medical Science Liaison',
    email: 'amanda.roberts@ligature.com',
    phone: '(404) 555-0567',
    territory: 'Southeast',
    region: 'southeast',
    primaryProducts: ['LIG-2847'],
    therapeuticAreas: ['Oncology'],
    assignedKOLCount: 26,
    tier1KOLs: 4,
    tier2KOLs: 11,
    tier3KOLs: 9,
    emergingKOLs: 2,
    ytdInteractions: 134,
    ytdInsights: 29,
    coveragePercentage: 84,
    lastActivityDate: '2025-12-30',
    status: 'active',
    performanceRating: 4,
    hireDate: '2022-11-20',
  },
];

// ============================================================================
// DEMO DATA - FIELD INSIGHTS (Nexavant / LIG-2847)
// ============================================================================

export const fieldInsights: FieldInsight[] = [
  {
    id: 'ins-001',
    insightCode: 'FI-2025-001',
    activityId: 'act-001',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    kolId: 'kol-001',
    kolName: 'Dr. Sarah Chen',
    date: '2025-12-28',
    category: 'efficacy-feedback',
    priority: 'high',
    status: 'actioned',
    title: 'Strong interest in combination therapy data',
    description: 'Dr. Chen expressed significant interest in seeing Nexavant combination data with checkpoint inhibitors. She believes this would address an unmet need in her patient population with progressive disease.',
    verbatimQuote: 'If I could see PFS data with pembrolizumab, that would change my prescribing for second-line.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['combination-therapy', 'checkpoint-inhibitor', 'second-line'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: ['NEXUS-2'],
    linkedClaimIds: [],
    recommendedAction: 'Share planned NEXUS-2 combination study timeline',
    actionTakenDate: '2025-12-29',
    actionTakenBy: 'Dr. Michael Torres',
    actionNotes: 'Shared NEXUS-2 protocol synopsis and enrollment timeline',
    source: 'field-activity',
    aggregatedCount: 8,
    relatedInsightIds: ['ins-003', 'ins-007'],
    createdDate: '2025-12-28',
    reviewedDate: '2025-12-29',
    reviewedBy: 'Dr. Sarah Mitchell',
  },
  {
    id: 'ins-002',
    insightCode: 'FI-2025-002',
    activityId: 'act-002',
    mslId: 'msl-002',
    mslName: 'Dr. Lisa Park',
    kolId: 'kol-002',
    kolName: 'Dr. James Mitchell',
    date: '2025-12-27',
    category: 'safety-observation',
    priority: 'critical',
    status: 'under-review',
    title: 'QTc concerns in cardiac comorbidity patients',
    description: 'Dr. Mitchell noted that 3 of his patients with pre-existing cardiac conditions showed QTc prolongation beyond expected ranges. He is limiting use in this population until clearer guidance is available.',
    verbatimQuote: 'I need to see the cardiac safety sub-analysis before I feel comfortable treating patients with baseline arrhythmias.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['cardiac-safety', 'QTc', 'comorbidity', 'subgroup-analysis'],
    linkedSignalIds: ['SIG-2026-002'],
    hasSignalRelevance: true,
    linkedStudyIds: ['NEXUS-1'],
    linkedClaimIds: ['CLM-004'],
    recommendedAction: 'Expedite cardiac safety sub-analysis from NEXUS-1',
    source: 'field-activity',
    aggregatedCount: 4,
    relatedInsightIds: ['ins-005'],
    createdDate: '2025-12-27',
  },
  {
    id: 'ins-003',
    insightCode: 'FI-2025-003',
    activityId: 'act-003',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    kolId: 'kol-003',
    kolName: 'Dr. Maria Gonzalez',
    date: '2025-12-26',
    category: 'study-interest',
    priority: 'medium',
    status: 'new',
    title: 'Interest in biomarker-driven patient selection',
    description: 'Dr. Gonzalez is very interested in participating in biomarker-driven studies. She has an established biobanking program and believes better patient selection could improve outcomes.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['biomarker', 'patient-selection', 'clinical-trial-interest'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: [],
    linkedClaimIds: [],
    source: 'field-activity',
    aggregatedCount: 6,
    relatedInsightIds: ['ins-001'],
    createdDate: '2025-12-26',
  },
  {
    id: 'ins-004',
    insightCode: 'FI-2025-004',
    activityId: 'act-004',
    mslId: 'msl-003',
    mslName: 'Dr. Jennifer Walsh',
    kolId: 'kol-004',
    kolName: 'Dr. Robert Kim',
    date: '2025-12-25',
    category: 'competitive-intel',
    priority: 'high',
    status: 'actioned',
    title: 'Competitor launching similar indication trial',
    description: 'Dr. Kim mentioned that Bristol is actively recruiting for a similar indication at his center. They are offering more flexible inclusion criteria and faster enrollment timelines.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['competitive-landscape', 'clinical-trial', 'enrollment'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: ['NEXUS-2'],
    linkedClaimIds: [],
    recommendedAction: 'Review NEXUS-2 inclusion criteria for flexibility',
    actionTakenDate: '2025-12-28',
    actionTakenBy: 'Clinical Operations',
    actionNotes: 'Shared with clinical ops for protocol amendment consideration',
    source: 'field-activity',
    aggregatedCount: 3,
    relatedInsightIds: [],
    createdDate: '2025-12-25',
    reviewedDate: '2025-12-26',
    reviewedBy: 'Dr. Sarah Mitchell',
  },
  {
    id: 'ins-005',
    insightCode: 'FI-2025-005',
    activityId: 'act-005',
    mslId: 'msl-004',
    mslName: 'Dr. David Chen',
    kolId: 'kol-006',
    kolName: 'Dr. Aisha Patel',
    date: '2025-12-24',
    category: 'safety-observation',
    priority: 'high',
    status: 'under-review',
    title: 'Hepatotoxicity pattern in NSCLC patients',
    description: 'Dr. Patel observed elevated LFTs in 2 NSCLC patients after 3 cycles. Both had prior immunotherapy. She is now monitoring LFTs more frequently in this population.',
    verbatimQuote: 'The hepatotoxicity seems more pronounced in patients previously treated with checkpoint inhibitors.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'NSCLC',
    tags: ['hepatotoxicity', 'LFT', 'prior-immunotherapy', 'NSCLC'],
    linkedSignalIds: ['SIG-2026-001'],
    hasSignalRelevance: true,
    linkedStudyIds: ['NEXUS-1'],
    linkedClaimIds: [],
    recommendedAction: 'Update hepatic monitoring guidance for prior immunotherapy patients',
    source: 'field-activity',
    aggregatedCount: 5,
    relatedInsightIds: ['ins-002'],
    createdDate: '2025-12-24',
  },
  {
    id: 'ins-006',
    insightCode: 'FI-2025-006',
    activityId: 'act-006',
    mslId: 'msl-005',
    mslName: 'Dr. Amanda Roberts',
    kolId: 'kol-005',
    kolName: 'Dr. Emily Watson',
    date: '2025-12-23',
    category: 'real-world-experience',
    priority: 'medium',
    status: 'actioned',
    title: 'Positive outcomes in elderly patients',
    description: 'Dr. Watson shared that her elderly patients (75+) have tolerated Nexavant well with dose modifications. She believes there is an opportunity for real-world data publication.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['elderly', 'dose-modification', 'tolerability', 'RWE'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: [],
    linkedClaimIds: [],
    recommendedAction: 'Explore RWE publication collaboration opportunity',
    actionTakenDate: '2025-12-26',
    actionTakenBy: 'Dr. Amanda Roberts',
    actionNotes: 'Connected Dr. Watson with Scientific Communications for RWE collaboration',
    source: 'field-activity',
    aggregatedCount: 7,
    relatedInsightIds: [],
    createdDate: '2025-12-23',
    reviewedDate: '2025-12-24',
    reviewedBy: 'Dr. Sarah Mitchell',
  },
  {
    id: 'ins-007',
    insightCode: 'FI-2025-007',
    activityId: 'act-007',
    mslId: 'msl-002',
    mslName: 'Dr. Lisa Park',
    date: '2025-12-22',
    category: 'unmet-need',
    priority: 'high',
    status: 'new',
    title: 'Third-line treatment gap',
    description: 'Multiple KOLs at SABCS noted significant unmet need for third-line treatment options. Nexavant is being considered but data in heavily pre-treated patients is limited.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['third-line', 'heavily-pretreated', 'unmet-need'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: [],
    linkedClaimIds: [],
    source: 'congress',
    aggregatedCount: 12,
    relatedInsightIds: ['ins-001'],
    createdDate: '2025-12-22',
  },
  {
    id: 'ins-008',
    insightCode: 'FI-2025-008',
    activityId: 'act-008',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    date: '2025-12-20',
    category: 'formulary-access',
    priority: 'medium',
    status: 'actioned',
    title: 'Payer restriction challenges in Northeast',
    description: 'Several community oncologists report that major payers in the Northeast are requiring prior authorization with extensive documentation for Nexavant.',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    indication: 'Advanced Solid Tumors',
    tags: ['payer', 'prior-auth', 'access', 'northeast'],
    linkedSignalIds: [],
    hasSignalRelevance: false,
    linkedStudyIds: [],
    linkedClaimIds: [],
    recommendedAction: 'Share with Market Access team for payer engagement',
    actionTakenDate: '2025-12-21',
    actionTakenBy: 'Dr. Michael Torres',
    actionNotes: 'Forwarded to Market Access - they are scheduling payer meetings',
    source: 'field-activity',
    aggregatedCount: 9,
    relatedInsightIds: [],
    createdDate: '2025-12-20',
    reviewedDate: '2025-12-21',
    reviewedBy: 'Market Access Lead',
  },
];

// ============================================================================
// DEMO DATA - MSL ACTIVITIES
// ============================================================================

export const mslActivities: MSLActivity[] = [
  {
    id: 'act-001',
    activityCode: 'MSL-2025-001',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    kolId: 'kol-001',
    kolName: 'Dr. Sarah Chen',
    kolTier: 'tier-1',
    kolInstitution: 'Memorial Sloan Kettering Cancer Center',
    date: '2025-12-28',
    duration: 45,
    type: 'scientific-exchange',
    format: 'in-person',
    location: 'MSKCC, New York, NY',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[0]],
    meetingObjective: 'Discuss combination therapy data and upcoming trial opportunities',
    discussionTopics: ['Combination therapy with checkpoint inhibitors', 'NEXUS-2 study design', 'Patient selection biomarkers'],
    materialsShared: ['NEXUS-1 Final Results Slide Deck', 'NEXUS-2 Protocol Synopsis'],
    followUpRequired: true,
    followUpDate: '2026-01-15',
    followUpNotes: 'Send updated NEXUS-2 enrollment timeline once finalized',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-28',
    lastModified: '2025-12-28',
  },
  {
    id: 'act-002',
    activityCode: 'MSL-2025-002',
    mslId: 'msl-002',
    mslName: 'Dr. Lisa Park',
    kolId: 'kol-002',
    kolName: 'Dr. James Mitchell',
    kolTier: 'tier-1',
    kolInstitution: 'MD Anderson Cancer Center',
    date: '2025-12-27',
    duration: 60,
    type: 'data-presentation',
    format: 'in-person',
    location: 'MD Anderson, Houston, TX',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[1]],
    meetingObjective: 'Present updated OS data and discuss cardiac safety profile',
    discussionTopics: ['Overall survival results', 'Cardiac safety in comorbid patients', 'QTc monitoring recommendations'],
    materialsShared: ['Updated OS Data Slides', 'Cardiac Safety Summary'],
    followUpRequired: true,
    followUpDate: '2026-01-10',
    followUpNotes: 'Provide cardiac safety sub-analysis when available',
    linkedStudyId: 'NEXUS-1',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-27',
    lastModified: '2025-12-27',
  },
  {
    id: 'act-003',
    activityCode: 'MSL-2025-003',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    kolId: 'kol-003',
    kolName: 'Dr. Maria Gonzalez',
    kolTier: 'tier-2',
    kolInstitution: 'Dana-Farber Cancer Institute',
    date: '2025-12-26',
    duration: 30,
    type: 'publication-discussion',
    format: 'virtual',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'collaboration-discussed',
    insights: [fieldInsights[2]],
    meetingObjective: 'Discuss biomarker publication collaboration opportunity',
    discussionTopics: ['Biomarker-driven patient selection', 'Potential publication collaboration', 'Biobanking program'],
    materialsShared: [],
    followUpRequired: false,
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-26',
    lastModified: '2025-12-26',
  },
  {
    id: 'act-004',
    activityCode: 'MSL-2025-004',
    mslId: 'msl-003',
    mslName: 'Dr. Jennifer Walsh',
    kolId: 'kol-004',
    kolName: 'Dr. Robert Kim',
    kolTier: 'tier-2',
    kolInstitution: 'Stanford Cancer Center',
    date: '2025-12-25',
    duration: 40,
    type: 'investigator-meeting',
    format: 'in-person',
    location: 'Stanford Cancer Center, Palo Alto, CA',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'competitive-intel',
    insights: [fieldInsights[3]],
    meetingObjective: 'Discuss site activation and enrollment status',
    discussionTopics: ['Site activation delays', 'Competitive enrollment landscape', 'Protocol flexibility'],
    materialsShared: ['Site Activation Checklist'],
    followUpRequired: true,
    followUpDate: '2026-01-05',
    followUpNotes: 'Follow up on protocol amendment status',
    linkedStudyId: 'NEXUS-2',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-25',
    lastModified: '2025-12-25',
  },
  {
    id: 'act-005',
    activityCode: 'MSL-2025-005',
    mslId: 'msl-004',
    mslName: 'Dr. David Chen',
    kolId: 'kol-006',
    kolName: 'Dr. Aisha Patel',
    kolTier: 'emerging',
    kolInstitution: 'Johns Hopkins',
    date: '2025-12-24',
    duration: 35,
    type: 'scientific-exchange',
    format: 'virtual',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[4]],
    meetingObjective: 'Scientific exchange on hepatotoxicity observations',
    discussionTopics: ['LFT monitoring', 'Prior immunotherapy patients', 'Dose modifications'],
    materialsShared: ['Hepatic Monitoring Guidelines'],
    followUpRequired: true,
    followUpDate: '2026-01-12',
    followUpNotes: 'Share updated hepatic monitoring guidance when available',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-24',
    lastModified: '2025-12-24',
  },
  {
    id: 'act-006',
    activityCode: 'MSL-2025-006',
    mslId: 'msl-005',
    mslName: 'Dr. Amanda Roberts',
    kolId: 'kol-005',
    kolName: 'Dr. Emily Watson',
    kolTier: 'tier-3',
    kolInstitution: 'Oncology Associates of Oregon',
    date: '2025-12-23',
    duration: 25,
    type: 'scientific-exchange',
    format: 'phone',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[5]],
    meetingObjective: 'Discuss real-world experience in elderly patients',
    discussionTopics: ['Elderly patient tolerability', 'Dose modifications', 'RWE publication interest'],
    materialsShared: [],
    followUpRequired: true,
    followUpDate: '2026-01-20',
    followUpNotes: 'Connect with Scientific Communications for RWE collaboration',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-23',
    lastModified: '2025-12-23',
  },
  {
    id: 'act-007',
    activityCode: 'MSL-2025-007',
    mslId: 'msl-002',
    mslName: 'Dr. Lisa Park',
    kolId: '',
    kolName: 'Multiple KOLs',
    kolTier: 'tier-1',
    kolInstitution: 'Various',
    date: '2025-12-22',
    duration: 180,
    type: 'congress-meeting',
    format: 'in-person',
    location: 'SABCS 2025, San Antonio, TX',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[6]],
    meetingObjective: 'Congress coverage and KOL engagement',
    discussionTopics: ['Third-line treatment landscape', 'Competitive presentations', 'Emerging data'],
    materialsShared: ['Congress Materials Package'],
    followUpRequired: false,
    linkedCongressId: 'SABCS-2025',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-22',
    lastModified: '2025-12-22',
  },
  {
    id: 'act-008',
    activityCode: 'MSL-2025-008',
    mslId: 'msl-001',
    mslName: 'Dr. Michael Torres',
    kolId: '',
    kolName: 'Community Oncologists',
    kolTier: 'tier-3',
    kolInstitution: 'Various Community Practices',
    date: '2025-12-20',
    duration: 90,
    type: 'site-visit',
    format: 'in-person',
    location: 'Northeast Region',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    therapeuticArea: 'Oncology',
    outcome: 'insight-gained',
    insights: [fieldInsights[7]],
    meetingObjective: 'Territory coverage - community oncology practice visits',
    discussionTopics: ['Payer access challenges', 'Prior authorization requirements', 'Clinical support needs'],
    materialsShared: [],
    followUpRequired: true,
    followUpDate: '2026-01-08',
    followUpNotes: 'Share payer engagement update from Market Access',
    complianceVerified: true,
    approvalStatus: 'approved',
    createdDate: '2025-12-20',
    lastModified: '2025-12-20',
  },
];

// ============================================================================
// DEMO DATA - CROSS-MODULE ALERTS
// ============================================================================

export const crossModuleAlerts: CrossModuleAlert[] = [
  {
    id: 'cma-001',
    type: 'safety-signal',
    severity: 'critical',
    title: 'Hepatotoxicity Signal - Field Correlation Required',
    description: 'Safety has detected an emerging hepatotoxicity signal in NSCLC patients with prior immunotherapy. Field insights from Dr. Chen and Dr. Patel corroborate this pattern. MSL team should gather additional real-world observations.',
    sourceModule: 'Safety',
    sourceReference: 'SIG-2026-001',
    detectedDate: '2025-12-20',
    relevantTerritories: ['northeast', 'midwest', 'west'],
    relevantKOLIds: ['kol-001', 'kol-006'],
    relevantMSLIds: ['msl-001', 'msl-004'],
    recommendedFieldAction: 'Conduct targeted outreach to hepatology-focused oncologists. Document any additional hepatotoxicity observations, especially in prior immunotherapy patients.',
    status: 'field-briefed',
    linkedInsightIds: ['ins-005'],
  },
  {
    id: 'cma-002',
    type: 'safety-signal',
    severity: 'warning',
    title: 'QTc Prolongation - Cardiac Safety Sub-Analysis',
    description: 'QTc signal under investigation. Field insights indicate KOL concern regarding cardiac comorbidity patients. Cardiac sub-analysis from NEXUS-1 being expedited.',
    sourceModule: 'Safety',
    sourceReference: 'SIG-2026-002',
    detectedDate: '2025-12-22',
    relevantTerritories: ['southwest'],
    relevantKOLIds: ['kol-002'],
    relevantMSLIds: ['msl-002'],
    recommendedFieldAction: 'Monitor for additional QTc observations. Prepare to share cardiac sub-analysis once available.',
    status: 'acknowledged',
    linkedInsightIds: ['ins-002'],
  },
  {
    id: 'cma-003',
    type: 'clinical-update',
    severity: 'info',
    title: 'NEXUS-1 Database Lock Complete',
    description: 'Clinical has completed database lock for NEXUS-1 primary analysis. Final OS and PFS data now available for field discussions. Publications team is preparing manuscripts.',
    sourceModule: 'Clinical',
    sourceReference: 'NEXUS-1',
    detectedDate: '2025-12-28',
    relevantTerritories: ['northeast', 'southwest', 'west', 'midwest', 'southeast'],
    relevantKOLIds: [],
    relevantMSLIds: ['msl-001', 'msl-002', 'msl-003', 'msl-004', 'msl-005'],
    recommendedFieldAction: 'Schedule scientific exchanges with Tier 1 KOLs to discuss final NEXUS-1 results. Coordinate with Publications on authorship discussions.',
    status: 'new',
    linkedInsightIds: [],
  },
  {
    id: 'cma-004',
    type: 'competitive-event',
    severity: 'warning',
    title: 'Competitor Phase 3 Results Announced',
    description: 'Bristol announced topline results for their competitive program at SABCS. Mixed efficacy results but favorable safety profile being highlighted.',
    sourceModule: 'Competitive Intelligence',
    sourceReference: 'CI-2025-047',
    detectedDate: '2025-12-21',
    relevantTerritories: ['northeast', 'southwest', 'west', 'midwest', 'southeast'],
    relevantKOLIds: [],
    relevantMSLIds: ['msl-001', 'msl-002', 'msl-003', 'msl-004', 'msl-005'],
    recommendedFieldAction: 'Prepare talking points comparing Nexavant efficacy data. Document KOL perceptions of competitive data.',
    status: 'field-briefed',
    linkedInsightIds: ['ins-004'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getMSLStatistics() {
  const total = mslProfiles.length;
  const activeCount = mslProfiles.filter(m => m.status === 'active').length;
  const totalKOLs = mslProfiles.reduce((sum, m) => sum + m.assignedKOLCount, 0);
  const tier1KOLs = mslProfiles.reduce((sum, m) => sum + m.tier1KOLs, 0);
  const ytdInteractions = mslProfiles.reduce((sum, m) => sum + m.ytdInteractions, 0);
  const ytdInsights = mslProfiles.reduce((sum, m) => sum + m.ytdInsights, 0);
  const avgCoverage = mslProfiles.reduce((sum, m) => sum + m.coveragePercentage, 0) / total;
  
  return {
    total,
    activeCount,
    totalKOLs,
    tier1KOLs,
    ytdInteractions,
    ytdInsights,
    avgCoverage: Math.round(avgCoverage),
  };
}

export function getActivityStatistics() {
  const total = mslActivities.length;
  const thisMonth = mslActivities.filter(a => a.date >= '2025-12-01').length;
  const withFollowUp = mslActivities.filter(a => a.followUpRequired).length;
  const byType = mslActivities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<MSLActivityType, number>);
  const byOutcome = mslActivities.reduce((acc, a) => {
    acc[a.outcome] = (acc[a.outcome] || 0) + 1;
    return acc;
  }, {} as Record<MSLOutcome, number>);
  
  return {
    total,
    thisMonth,
    withFollowUp,
    byType,
    byOutcome,
  };
}

export function getInsightStatistics() {
  const total = fieldInsights.length;
  const newCount = fieldInsights.filter(i => i.status === 'new').length;
  const criticalCount = fieldInsights.filter(i => i.priority === 'critical').length;
  const highCount = fieldInsights.filter(i => i.priority === 'high').length;
  const withSignalRelevance = fieldInsights.filter(i => i.hasSignalRelevance).length;
  const actionedCount = fieldInsights.filter(i => i.status === 'actioned').length;
  
  const byCategory = fieldInsights.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {} as Record<InsightCategory, number>);
  
  return {
    total,
    newCount,
    criticalCount,
    highCount,
    withSignalRelevance,
    actionedCount,
    byCategory,
  };
}

export function getTerritoryMetrics(): TerritoryMetrics[] {
  const regions: TerritoryRegion[] = ['northeast', 'southeast', 'midwest', 'west', 'southwest'];
  
  return regions.map(region => {
    const regionMSLs = mslProfiles.filter(m => m.region === region);
    const totalKOLs = regionMSLs.reduce((sum, m) => sum + m.assignedKOLCount, 0);
    const tier1Total = regionMSLs.reduce((sum, m) => sum + m.tier1KOLs, 0);
    const tier2Total = regionMSLs.reduce((sum, m) => sum + m.tier2KOLs, 0);
    const ytdActivities = regionMSLs.reduce((sum, m) => sum + m.ytdInteractions, 0);
    const ytdInsights = regionMSLs.reduce((sum, m) => sum + m.ytdInsights, 0);
    const avgEngagement = regionMSLs.length > 0 
      ? regionMSLs.reduce((sum, m) => sum + m.coveragePercentage, 0) / regionMSLs.length
      : 0;
    
    return {
      region,
      regionName: REGION_LABELS[region],
      mslCount: regionMSLs.length,
      totalKOLs,
      tier1Coverage: tier1Total > 0 ? Math.round((tier1Total / totalKOLs) * 100) : 0,
      tier2Coverage: tier2Total > 0 ? Math.round((tier2Total / totalKOLs) * 100) : 0,
      ytdActivities,
      ytdInsights,
      avgEngagementScore: Math.round(avgEngagement),
      topProducts: [{ productId: 'LIG-2847', productName: 'Nexavant', interactionCount: ytdActivities }],
    };
  });
}

export function getInsightTrends(): InsightTrend[] {
  const categories: InsightCategory[] = [
    'safety-observation',
    'efficacy-feedback',
    'competitive-intel',
    'unmet-need',
    'study-interest',
    'real-world-experience',
    'formulary-access',
    'clinical-practice',
    'patient-population',
  ];
  
  return categories.map(category => {
    const categoryInsights = fieldInsights.filter(i => i.category === category);
    const currentCount = categoryInsights.length;
    const previousCount = Math.max(1, currentCount - Math.floor(Math.random() * 3)); // Mock previous period
    const change = currentCount - previousCount;
    
    return {
      category,
      categoryLabel: INSIGHT_CATEGORY_LABELS[category],
      currentCount,
      previousCount,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      trendPercentage: previousCount > 0 ? Math.round((change / previousCount) * 100) : 0,
      topProducts: ['Nexavant'],
    };
  });
}

export function getAlertStatistics() {
  const total = crossModuleAlerts.length;
  const criticalCount = crossModuleAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = crossModuleAlerts.filter(a => a.severity === 'warning').length;
  const newCount = crossModuleAlerts.filter(a => a.status === 'new').length;
  const fieldBriefed = crossModuleAlerts.filter(a => a.status === 'field-briefed').length;
  
  return {
    total,
    criticalCount,
    warningCount,
    newCount,
    fieldBriefed,
  };
}

export function getActivitiesByMSL(mslId: string): MSLActivity[] {
  return mslActivities.filter(a => a.mslId === mslId);
}

export function getInsightsByMSL(mslId: string): FieldInsight[] {
  return fieldInsights.filter(i => i.mslId === mslId);
}

export function getInsightsByKOL(kolId: string): FieldInsight[] {
  return fieldInsights.filter(i => i.kolId === kolId);
}

export function getSignalRelatedInsights(): FieldInsight[] {
  return fieldInsights.filter(i => i.hasSignalRelevance);
}

export function getPendingFollowUps(): MSLActivity[] {
  return mslActivities.filter(a => a.followUpRequired && !a.followUpDate);
}

export function getUpcomingFollowUps(): MSLActivity[] {
  const today = new Date().toISOString().split('T')[0];
  return mslActivities
    .filter(a => a.followUpRequired && a.followUpDate && a.followUpDate >= today)
    .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));
}
