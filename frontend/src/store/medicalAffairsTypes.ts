
/**
 * Medical Affairs Types - v195
 * 
 * Comprehensive type system for Medical Affairs operations including:
 * - KOL (Key Opinion Leader) Management
 * - MSL (Medical Science Liaison) Activity Tracking
 * - Publication Planning & Management
 * - Advisory Board Coordination
 * - Congress & Event Management
 * - Medical Information Requests
 * - Grants & IIR (Investigator-Initiated Research)
 */

// ============================================================================
// ENUMS & CORE TYPES
// ============================================================================

export type MedAffairsModuleView = 
  | 'dashboard'
  | 'kol-management'
  | 'msl-activities'
  | 'publications'
  | 'advisory-boards'
  | 'congresses'
  | 'medical-info'
  | 'grants-iir'
  | 'analytics';

export type KOLTier = 'tier-1' | 'tier-2' | 'tier-3' | 'emerging';

export type KOLSpecialty = 
  | 'oncology'
  | 'hematology'
  | 'immunology'
  | 'neurology'
  | 'cardiology'
  | 'rare-disease'
  | 'infectious-disease'
  | 'gastroenterology'
  | 'nephrology'
  | 'pulmonology'
  | 'endocrinology'
  | 'rheumatology';

export type KOLInfluenceType = 
  | 'clinical-researcher'
  | 'thought-leader'
  | 'guideline-author'
  | 'society-leader'
  | 'patient-advocate'
  | 'policy-influencer'
  | 'digital-influencer'
  | 'payer-expert';

export type KOLRelationshipStatus = 
  | 'prospect'
  | 'engaged'
  | 'active'
  | 'strategic-partner'
  | 'inactive'
  | 'declined';

export type MSLActivityType = 
  | 'scientific-exchange'
  | 'presentation'
  | 'advisory-board'
  | 'congress-meeting'
  | 'investigator-meeting'
  | 'medical-education'
  | 'publication-discussion'
  | 'pipeline-briefing'
  | 'data-presentation'
  | 'reactive-response';

export type MSLOutcome = 
  | 'insight-gained'
  | 'request-received'
  | 'collaboration-discussed'
  | 'data-shared'
  | 'follow-up-needed'
  | 'relationship-strengthened'
  | 'opportunity-identified';

export type PublicationStatus = 
  | 'concept'
  | 'protocol-development'
  | 'data-collection'
  | 'analysis'
  | 'manuscript-drafting'
  | 'internal-review'
  | 'author-review'
  | 'submission-ready'
  | 'submitted'
  | 'under-review'
  | 'revision-requested'
  | 'accepted'
  | 'in-press'
  | 'published'
  | 'withdrawn';

export type PublicationType = 
  | 'primary-manuscript'
  | 'secondary-analysis'
  | 'review-article'
  | 'case-report'
  | 'letter-to-editor'
  | 'editorial'
  | 'congress-abstract'
  | 'congress-poster'
  | 'congress-oral'
  | 'white-paper';

export type JournalTier = 
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'specialty';

export type AdvisoryBoardType = 
  | 'scientific'
  | 'clinical'
  | 'patient'
  | 'regulatory'
  | 'commercial'
  | 'steering-committee'
  | 'dsmb';

export type AdvisoryBoardStatus = 
  | 'planning'
  | 'invitations-sent'
  | 'confirmed'
  | 'materials-in-development'
  | 'ready'
  | 'completed'
  | 'follow-up'
  | 'cancelled';

export type CongressPriority = 
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'regional';

export type MedInfoRequestType = 
  | 'safety-inquiry'
  | 'efficacy-question'
  | 'dosing-guidance'
  | 'drug-interaction'
  | 'off-label-inquiry'
  | 'product-availability'
  | 'clinical-trial-info'
  | 'comparative-data'
  | 'mechanism-of-action'
  | 'patient-support';

export type MedInfoRequestStatus = 
  | 'received'
  | 'triaged'
  | 'assigned'
  | 'in-progress'
  | 'review'
  | 'response-sent'
  | 'follow-up'
  | 'closed';

export type MedInfoRequestPriority = 
  | 'urgent'
  | 'high'
  | 'standard';

export type GrantStatus = 
  | 'concept'
  | 'letter-of-intent'
  | 'proposal-development'
  | 'internal-review'
  | 'submitted'
  | 'under-review'
  | 'approved'
  | 'contracting'
  | 'active'
  | 'completed'
  | 'closed-out'
  | 'rejected'
  | 'withdrawn';

export type GrantType = 
  | 'iir'
  | 'educational-grant'
  | 'fellowship'
  | 'research-collaboration'
  | 'registry-support';

// ============================================================================
// KOL MANAGEMENT
// ============================================================================

export interface KOLProfile {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string[];
  title: string;
  institution: string;
  institutionType: 'academic' | 'community' | 'private-practice' | 'government' | 'non-profit';
  location: {
    city: string;
    state?: string;
    country: string;
    region: string;
  };
  tier: KOLTier;
  specialties: KOLSpecialty[];
  therapeuticAreas: string[];
  influenceTypes: KOLInfluenceType[];
  relationshipStatus: KOLRelationshipStatus;
  assignedMSL?: string;
  
  // Metrics
  profileScore: number; // 0-100
  engagementScore: number; // 0-100
  influenceScore: number; // 0-100
  publicationsCount: number;
  clinicalTrials: number;
  citationCount: number;
  hIndex?: number;
  
  // Engagement History
  totalInteractions: number;
  lastInteractionDate?: string;
  yearToDateInteractions: number;
  
  // Products & Indications
  productExpertise: string[];
  indicationFocus: string[];
  
  // Contact
  email?: string;
  phone?: string;
  preferredContact: 'email' | 'phone' | 'in-person' | 'virtual';
  
  // Compliance
  consentDate?: string;
  spendToDate: number;
  annualSpendLimit: number;
  
  // Social & Digital
  twitterHandle?: string;
  linkedInUrl?: string;
  publicationsUrl?: string;
  
  // Notes
  strategicNotes: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface KOLInteraction {
  id: string;
  kolId: string;
  mslId: string;
  date: string;
  duration: number; // minutes
  type: MSLActivityType;
  location: 'in-person' | 'virtual' | 'phone' | 'email' | 'congress';
  productId?: string;
  indicationId?: string;
  
  // Content
  objectives: string[];
  topicsDiscussed: string[];
  materialsShared: string[];
  insights: string[];
  outcomes: MSLOutcome[];
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpActions: string[];
  
  // Compliance
  complianceReviewed: boolean;
  spendAmount?: number;
  spendCategory?: 'meal' | 'travel' | 'honorarium' | 'consulting' | 'other';
  
  // Quality
  interactionQuality: 'exceptional' | 'good' | 'satisfactory' | 'needs-improvement';
  
  createdAt: string;
}

export interface KOLMapping {
  id: string;
  productId: string;
  indicationId?: string;
  region: string;
  
  // Engagement Targets
  tier1Target: number;
  tier2Target: number;
  tier3Target: number;
  emergingTarget: number;
  
  // Actual
  tier1Actual: number;
  tier2Actual: number;
  tier3Actual: number;
  emergingActual: number;
  
  // Territory
  territories: {
    territoryId: string;
    territoryName: string;
    mslId: string;
    kolCount: number;
    lastUpdated: string;
  }[];
  
  updatedAt: string;
}

// ============================================================================
// MSL MANAGEMENT
// ============================================================================

export interface MSLProfile {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string[];
  title: string;
  region: string;
  territories: string[];
  therapeuticAreas: string[];
  productAssignments: string[];
  
  // Status
  status: 'active' | 'onboarding' | 'transitioning' | 'inactive';
  startDate: string;
  
  // Metrics (YTD)
  totalInteractions: number;
  kolsCovered: number;
  congressesAttended: number;
  advisoryBoardsSupported: number;
  publicationsSupported: number;
  insightsCaptures: number;
  
  // Targets
  interactionTarget: number;
  kolCoverageTarget: number;
  
  // Contact
  email: string;
  phone: string;
  manager: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface MSLActivity {
  id: string;
  mslId: string;
  date: string;
  activityType: MSLActivityType;
  
  // KOL Context (if applicable)
  kolId?: string;
  kolName?: string;
  kolTier?: KOLTier;
  
  // Details
  productId?: string;
  indicationId?: string;
  location: string;
  duration: number;
  
  // Content
  description: string;
  objectives: string[];
  outcomes: MSLOutcome[];
  insights: string[];
  materialsUsed: string[];
  
  // Follow-up
  followUpRequired: boolean;
  followUpNotes?: string;
  
  // Status
  status: 'planned' | 'completed' | 'cancelled';
  
  createdAt: string;
}

export interface MSLInsight {
  id: string;
  mslId: string;
  activityId?: string;
  kolId?: string;
  date: string;
  
  // Classification
  category: 'clinical' | 'competitive' | 'market-access' | 'safety' | 'product' | 'pipeline' | 'regulatory';
  priority: 'high' | 'medium' | 'low';
  
  // Content
  title: string;
  description: string;
  source: string;
  therapeuticArea?: string;
  productId?: string;
  
  // Action
  actionRequired: boolean;
  actionOwner?: string;
  actionStatus?: 'open' | 'in-progress' | 'completed';
  
  // Distribution
  sharedWith: string[];
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PUBLICATION PLANNING
// ============================================================================

export interface Publication {
  id: string;
  title: string;
  shortTitle: string;
  publicationType: PublicationType;
  status: PublicationStatus;
  
  // Product/Study
  productId: string;
  productName: string;
  studyId?: string;
  studyName?: string;
  indicationId?: string;
  
  // Authors
  leadAuthor: {
    id: string;
    name: string;
    institution: string;
    isKOL: boolean;
  };
  coAuthors: {
    id: string;
    name: string;
    institution: string;
    role: 'author' | 'writing-group' | 'acknowledgment';
  }[];
  medicalWriter?: string;
  
  // Target
  targetJournal?: string;
  journalTier?: JournalTier;
  impactFactor?: number;
  targetCongress?: string;
  targetDate?: string;
  
  // Timeline
  conceptDate?: string;
  protocolApprovalDate?: string;
  dataLockDate?: string;
  manuscriptStartDate?: string;
  internalReviewDate?: string;
  authorReviewDate?: string;
  submissionDate?: string;
  acceptanceDate?: string;
  publicationDate?: string;
  
  // Key Dates Tracking
  currentMilestone: string;
  nextMilestone?: string;
  nextMilestoneDate?: string;
  daysToNextMilestone?: number;
  onTrack: boolean;
  
  // Content
  objectives: string[];
  keyMessages: string[];
  dataPoints: string[];
  
  // Compliance
  icmjeCompliant: boolean;
  disclosuresComplete: boolean;
  gppCompliant: boolean;
  
  // Cost
  estimatedCost?: number;
  actualCost?: number;
  
  // Links
  manuscriptDocId?: string;
  supportingDocIds: string[];
  
  // Priority
  strategicPriority: 'critical' | 'high' | 'medium' | 'low';
  
  // Notes
  notes: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PublicationPlan {
  id: string;
  name: string;
  productId: string;
  indicationId?: string;
  year: number;
  
  // Strategy
  overarchingStrategy: string;
  keyMessages: string[];
  targetAudiences: string[];
  
  // Targets
  primaryManuscriptTarget: number;
  congressAbstractTarget: number;
  congressPosterTarget: number;
  congressOralTarget: number;
  reviewArticleTarget: number;
  
  // Actual
  primaryManuscriptActual: number;
  congressAbstractActual: number;
  congressPosterActual: number;
  congressOralActual: number;
  reviewArticleActual: number;
  
  // Publications
  publicationIds: string[];
  
  // Budget
  allocatedBudget: number;
  spentBudget: number;
  
  // Status
  status: 'draft' | 'approved' | 'active' | 'completed';
  approvalDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ADVISORY BOARDS
// ============================================================================

export interface AdvisoryBoard {
  id: string;
  name: string;
  type: AdvisoryBoardType;
  status: AdvisoryBoardStatus;
  
  // Product/Indication
  productId: string;
  productName: string;
  indicationId?: string;
  
  // Event Details
  date: string;
  endDate?: string;
  duration: number; // hours
  format: 'in-person' | 'virtual' | 'hybrid';
  location?: string;
  venue?: string;
  
  // Objectives
  primaryObjective: string;
  secondaryObjectives: string[];
  keyQuestions: string[];
  expectedOutcomes: string[];
  
  // Participants
  chairperson?: {
    id: string;
    name: string;
    institution: string;
  };
  participants: {
    kolId: string;
    name: string;
    institution: string;
    specialty: string;
    confirmed: boolean;
    conflictOfInterest: boolean;
  }[];
  internalAttendees: {
    name: string;
    role: string;
    department: string;
  }[];
  
  // Materials
  agenda?: string;
  backgroundMaterials: string[];
  presentationIds: string[];
  summaryDocId?: string;
  
  // Budget & Compliance
  totalBudget: number;
  spentBudget: number;
  honorariumPerParticipant: number;
  travelCovered: boolean;
  fairMarketValue: boolean;
  complianceApproved: boolean;
  complianceApprovalDate?: string;
  
  // Insights & Outcomes
  keyInsights: string[];
  recommendations: string[];
  actionItems: {
    description: string;
    owner: string;
    dueDate: string;
    status: 'open' | 'in-progress' | 'completed';
  }[];
  
  // Team
  projectLead: string;
  medicalLead: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONGRESS MANAGEMENT
// ============================================================================

export interface Congress {
  id: string;
  name: string;
  abbreviation: string;
  society: string;
  priority: CongressPriority;
  therapeuticArea: string;
  
  // Dates
  startDate: string;
  endDate: string;
  abstractDeadline?: string;
  earlyBirdDeadline?: string;
  registrationDeadline?: string;
  
  // Location
  location: string;
  venue?: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  timezone: string;
  
  // Attendance
  expectedAttendance: number;
  keyAudienceSegments: string[];
  
  // Company Participation
  boothNumber?: string;
  boothSize?: string;
  symposiumSlot?: boolean;
  
  // Budget
  allocatedBudget: number;
  spentBudget: number;
  
  // Status
  planningStatus: 'not-started' | 'planning' | 'ready' | 'in-progress' | 'completed' | 'cancelled';
  
  createdAt: string;
  updatedAt: string;
}

export interface CongressActivity {
  id: string;
  congressId: string;
  productId?: string;
  
  // Activity Type
  type: 'abstract' | 'poster' | 'oral-presentation' | 'symposium' | 'satellite' | 'booth' | 'kol-meeting' | 'advisory-board';
  
  // Details
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  
  // Presenters/Attendees
  presenter?: {
    id?: string;
    name: string;
    institution: string;
    isKOL: boolean;
  };
  attendees?: string[];
  
  // Status
  status: 'planned' | 'submitted' | 'accepted' | 'rejected' | 'confirmed' | 'completed' | 'cancelled';
  
  // Related
  publicationId?: string;
  advisoryBoardId?: string;
  
  // Notes
  objectives?: string[];
  outcomes?: string[];
  
  createdAt: string;
}

// ============================================================================
// MEDICAL INFORMATION
// ============================================================================

export interface MedInfoRequest {
  id: string;
  requestNumber: string;
  
  // Requester
  requesterType: 'hcp' | 'patient' | 'caregiver' | 'pharmacist' | 'payer' | 'internal';
  requesterName: string;
  requesterCredentials?: string;
  requesterInstitution?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  region: string;
  country: string;
  
  // Request
  requestType: MedInfoRequestType;
  requestMethod: 'phone' | 'email' | 'web' | 'letter' | 'congress' | 'field';
  priority: MedInfoRequestPriority;
  receivedDate: string;
  dueDate: string;
  
  // Product Context
  productId: string;
  productName: string;
  indicationId?: string;
  
  // Question
  question: string;
  clinicalContext?: string;
  patientSpecifics?: string;
  
  // Response
  status: MedInfoRequestStatus;
  assignedTo?: string;
  responseDate?: string;
  responseMethod?: 'phone' | 'email' | 'letter' | 'fax';
  response?: string;
  responseSummary?: string;
  standardResponseUsed?: string;
  attachmentIds: string[];
  
  // Classification
  adverseEventReported: boolean;
  productQualityIssue: boolean;
  offLabelInquiry: boolean;
  
  // Quality
  responseTime: number; // hours
  withinSLA: boolean;
  satisfactionScore?: number;
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface StandardResponse {
  id: string;
  productId: string;
  category: MedInfoRequestType;
  
  // Content
  title: string;
  question: string;
  response: string;
  references: string[];
  
  // Metadata
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  status: 'draft' | 'approved' | 'active' | 'expired' | 'retired';
  
  // Approval
  approvedBy?: string;
  approvalDate?: string;
  
  // Usage
  usageCount: number;
  lastUsedDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GRANTS & IIR
// ============================================================================

export interface Grant {
  id: string;
  grantNumber: string;
  type: GrantType;
  status: GrantStatus;
  
  // Title & Description
  title: string;
  shortTitle: string;
  scientificRationale: string;
  
  // Product/Indication
  productId?: string;
  productName?: string;
  therapeuticArea: string;
  indication?: string;
  
  // Principal Investigator
  principalInvestigator: {
    id?: string;
    name: string;
    credentials: string;
    institution: string;
    email: string;
    isKOL: boolean;
  };
  
  // Institution
  institution: string;
  institutionType: 'academic' | 'community' | 'government' | 'non-profit';
  country: string;
  
  // Timeline
  submissionDate?: string;
  approvalDate?: string;
  startDate?: string;
  endDate?: string;
  extensionDate?: string;
  closeOutDate?: string;
  
  // Milestones
  milestones: {
    id: string;
    name: string;
    dueDate: string;
    completedDate?: string;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    deliverables?: string[];
  }[];
  
  // Budget
  requestedAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  remainingAmount: number;
  currency: string;
  
  // Study Design (for IIR)
  studyDesign?: string;
  enrollmentTarget?: number;
  enrollmentActual?: number;
  
  // Deliverables
  expectedPublications: string[];
  expectedPresentations: string[];
  dataSharingAgreed: boolean;
  
  // Compliance
  contractExecuted: boolean;
  contractDocId?: string;
  irbApproved?: boolean;
  irbApprovalDate?: string;
  
  // Internal
  scientificLead: string;
  operationsLead?: string;
  reviewCommitteeDate?: string;
  
  // Notes
  notes: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface IIRProtocol {
  id: string;
  grantId: string;
  protocolNumber: string;
  version: string;
  
  // Study Details
  title: string;
  phase?: string;
  studyType: 'interventional' | 'observational' | 'registry' | 'real-world-evidence';
  
  // Design
  designSummary: string;
  primaryObjective: string;
  secondaryObjectives: string[];
  endpoints: {
    type: 'primary' | 'secondary' | 'exploratory';
    description: string;
    timepoint?: string;
  }[];
  
  // Population
  population: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  
  // Status
  status: 'development' | 'submitted' | 'approved' | 'amended' | 'active';
  approvalDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export interface MedAffairsMetrics {
  period: string; // e.g., "2025-Q1"
  
  // KOL Metrics
  kol: {
    totalKOLs: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    emergingCount: number;
    newEngagements: number;
    activeRelationships: number;
    coverageRate: number;
    engagementScore: number;
  };
  
  // MSL Metrics
  msl: {
    totalMSLs: number;
    totalInteractions: number;
    interactionsPerMSL: number;
    uniqueKOLsEngaged: number;
    scientificExchanges: number;
    insightsCaptured: number;
    congressesAttended: number;
    targetAchievement: number;
  };
  
  // Publication Metrics
  publications: {
    total: number;
    primaryManuscripts: number;
    congressPresentations: number;
    acceptanceRate: number;
    tier1Publications: number;
    averageImpactFactor: number;
    onTrackPercentage: number;
  };
  
  // Advisory Board Metrics
  advisoryBoards: {
    total: number;
    completed: number;
    totalParticipants: number;
    insightsCaptured: number;
    actionItemsGenerated: number;
    actionItemsCompleted: number;
  };
  
  // Med Info Metrics
  medInfo: {
    totalRequests: number;
    averageResponseTime: number;
    slaCompliance: number;
    satisfactionScore: number;
    byType: Record<MedInfoRequestType, number>;
  };
  
  // Grant Metrics
  grants: {
    total: number;
    active: number;
    totalFunding: number;
    disbursedFunding: number;
    publicationsGenerated: number;
  };
  
  updatedAt: string;
}

export interface KOLEngagementTrend {
  period: string;
  tier1Interactions: number;
  tier2Interactions: number;
  tier3Interactions: number;
  totalInteractions: number;
  uniqueKOLs: number;
  insightsCaptured: number;
}

export interface PublicationFunnel {
  stage: PublicationStatus;
  count: number;
  averageDaysInStage: number;
  onTrackCount: number;
  delayedCount: number;
}

// ============================================================================
// CROSS-MODULE INTEGRATION
// ============================================================================

export interface MedAffairsRegulatoryLink {
  id: string;
  medAffairsEntityType: 'publication' | 'advisory-board' | 'grant' | 'kol-interaction';
  medAffairsEntityId: string;
  
  regulatoryEntityType: 'submission' | 'haq' | 'document' | 'safety-report';
  regulatoryEntityId: string;
  
  linkType: 'data-source' | 'referenced-in' | 'informs' | 'supports';
  description?: string;
  
  createdAt: string;
  createdBy: string;
}

export interface MedAffairsSafetyLink {
  id: string;
  medAffairsEntityType: 'med-info-request' | 'kol-interaction' | 'congress-activity';
  medAffairsEntityId: string;
  
  safetyEntityType: 'signal' | 'case' | 'aggregate-report';
  safetyEntityId: string;
  
  linkType: 'reported' | 'discussed' | 'relates-to';
  
  createdAt: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface MedAffairsConfig {
  // KOL Settings
  kolTieringCriteria: {
    tier1MinScore: number;
    tier2MinScore: number;
    tier3MinScore: number;
  };
  kolScoreWeights: {
    publications: number;
    clinicalTrials: number;
    societyRoles: number;
    engagementHistory: number;
  };
  
  // MSL Settings
  mslInteractionTargets: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  mslKOLCoverageTarget: number;
  
  // Publication Settings
  publicationTargets: {
    primaryManuscriptsPerYear: number;
    congressAbstractsPerCongress: number;
  };
  
  // Med Info Settings
  medInfoSLA: {
    urgent: number; // hours
    high: number;
    standard: number;
  };
  
  // Grant Settings
  grantApprovalThreshold: number;
  iirReviewCommitteeMeetingFrequency: 'monthly' | 'quarterly';
}
