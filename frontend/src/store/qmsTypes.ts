
// ============================================================================
// QMS Types - Quality Management System (v57)
// Comprehensive types for document control, CAPA, deviations, change control,
// training management, audit management, and quality metrics
// ============================================================================

// ============================================================================
// COMMON ENUMS & TYPES
// ============================================================================

export type QMSDocumentType = 
  | 'sop' | 'work-instruction' | 'form' | 'template' | 'policy' 
  | 'specification' | 'protocol' | 'report' | 'record' | 'manual';

export type QMSPriority = 'critical' | 'high' | 'medium' | 'low';

export type QMSSeverity = 'critical' | 'major' | 'minor';

export type ApprovalStatus = 'draft' | 'pending-review' | 'approved' | 'rejected' | 'effective' | 'superseded' | 'retired';

export type QMSDepartment = 
  | 'regulatory-affairs' | 'clinical-operations' | 'quality-assurance' 
  | 'quality-control' | 'manufacturing' | 'r-and-d' | 'medical-affairs'
  | 'pharmacovigilance' | 'data-management' | 'biostatistics'
  | 'supply-chain' | 'facilities' | 'it' | 'hr' | 'finance' | 'executive';

export type QMSRegulatoryFramework = 
  | 'ich-q10' | 'iso-9001' | 'iso-13485' | '21-cfr-part-11' 
  | '21-cfr-part-820' | 'eu-gmp-annex-11' | 'gcp' | 'glp' | 'gmp';

// ============================================================================
// DOCUMENT CONTROL
// ============================================================================

export interface ControlledDocument {
  id: string;
  documentNumber: string;
  title: string;
  documentType: QMSDocumentType;
  department: QMSDepartment;
  version: string;
  majorVersion: number;
  minorVersion: number;
  status: ApprovalStatus;
  effectiveDate?: string;
  expirationDate?: string;
  periodicReviewDate?: string;
  periodicReviewCycle: number; // months
  author: string;
  authorId: string;
  owner: string;
  ownerId: string;
  description: string;
  keywords: string[];
  category: string;
  subcategory?: string;
  regulatoryFrameworks: QMSRegulatoryFramework[];
  supersededDocumentId?: string;
  relatedDocumentIds: string[];
  attachments: DocumentAttachment[];
  trainingRequired: boolean;
  trainingCurriculumIds: string[];
  changeControlRequired: boolean;
  currentChangeControlId?: string;
  fileLocation: string;
  fileSize: number;
  fileChecksum: string;
  retentionYears: number;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  status: ApprovalStatus;
  effectiveDate?: string;
  retiredDate?: string;
  changeDescription: string;
  changedSections: string[];
  changeControlId?: string;
  reviewCycle: DocumentReviewCycle;
  approvalWorkflow: ApprovalWorkflowInstance;
  createdAt: string;
  createdBy: string;
}

export interface DocumentReviewCycle {
  id: string;
  documentVersionId: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue' | 'extended';
  reviewerId: string;
  reviewerName: string;
  outcome?: 'no-changes' | 'minor-revision' | 'major-revision' | 'retire';
  comments?: string;
  extensionReason?: string;
  extensionApprovedBy?: string;
}

export interface ControlledCopy {
  id: string;
  documentId: string;
  documentVersion: string;
  copyNumber: number;
  issuedTo: string;
  issuedToId: string;
  issuedDate: string;
  location: string;
  copyType: 'electronic' | 'printed';
  status: 'active' | 'recalled' | 'destroyed';
  recalledDate?: string;
  destroyedDate?: string;
  destroyedBy?: string;
  acknowledgmentRequired: boolean;
  acknowledgmentDate?: string;
}

export interface ApprovalWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: QMSDocumentType[];
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  approverRole: string;
  approverIds?: string[];
  isParallel: boolean;
  isRequired: boolean;
  escalationDays: number;
  escalationTo?: string;
}

export interface ApprovalWorkflowInstance {
  id: string;
  templateId: string;
  documentVersionId: string;
  currentStepNumber: number;
  status: 'in-progress' | 'completed' | 'rejected' | 'cancelled';
  initiatedAt: string;
  initiatedBy: string;
  completedAt?: string;
  stepStatuses: WorkflowStepStatus[];
}

export interface WorkflowStepStatus {
  stepId: string;
  stepNumber: number;
  stepName: string;
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  comments?: string;
  signatureId?: string;
}

// ============================================================================
// CAPA (CORRECTIVE AND PREVENTIVE ACTIONS)
// ============================================================================

export type CAPAType = 'corrective' | 'preventive' | 'both';
export type CAPASource = 
  | 'deviation' | 'audit-finding' | 'complaint' | 'oov' 
  | 'trend-analysis' | 'risk-assessment' | 'management-review'
  | 'regulatory-observation' | 'supplier-issue' | 'process-improvement';
export type CAPAStatus = 
  | 'draft' | 'pending-approval' | 'approved' | 'investigation' 
  | 'action-planning' | 'implementation' | 'effectiveness-check'
  | 'closed' | 'closed-ineffective' | 'cancelled';

export interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  capaType: CAPAType;
  source: CAPASource;
  sourceRecordId?: string;
  sourceRecordNumber?: string;
  priority: QMSPriority;
  severity: QMSSeverity;
  status: CAPAStatus;
  department: QMSDepartment;
  affectedDepartments: QMSDepartment[];
  affectedProducts: string[];
  affectedProcesses: string[];
  affectedSystems: string[];
  regulatoryImpact: boolean;
  regulatoryNotificationRequired: boolean;
  regulatoryNotificationStatus?: 'not-required' | 'pending' | 'submitted' | 'acknowledged';
  assigneeId: string;
  assigneeName: string;
  ownerId: string;
  ownerName: string;
  initiatorId: string;
  initiatorName: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  effectivenessCheckDate?: string;
  effectivenessCheckCompleted: boolean;
  effectivenessCheckResult?: 'effective' | 'partially-effective' | 'ineffective';
  rootCauseAnalysis?: RootCauseAnalysis;
  investigation: CAPAInvestigation;
  actionPlan: CAPAActionPlan;
  effectivenessChecks: EffectivenessCheck[];
  linkedCAPAs: string[];
  linkedDeviations: string[];
  linkedAuditFindings: string[];
  linkedChangeControls: string[];
  attachments: DocumentAttachment[];
  comments: CAPAComment[];
  timeline: CAPATimelineEntry[];
  extensionHistory: ExtensionRequest[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}

export interface RootCauseAnalysis {
  id: string;
  capaId: string;
  methodology: 'fishbone' | '5-why' | 'fault-tree' | 'pareto' | 'fmea' | 'other';
  methodologyOther?: string;
  analysisDate: string;
  performedBy: string;
  performedById: string;
  problemStatement: string;
  rootCauses: RootCause[];
  contributingFactors: ContributingFactor[];
  conclusion: string;
  reviewedBy?: string;
  reviewedById?: string;
  reviewDate?: string;
  approved: boolean;
}

export interface RootCause {
  id: string;
  category: 'people' | 'process' | 'equipment' | 'materials' | 'environment' | 'management';
  description: string;
  evidence: string;
  isPrimary: boolean;
  likelihood: 'confirmed' | 'probable' | 'possible';
}

export interface ContributingFactor {
  id: string;
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CAPAInvestigation {
  id: string;
  capaId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  startDate?: string;
  completionDate?: string;
  investigatorId: string;
  investigatorName: string;
  scopeDescription: string;
  findingsSummary?: string;
  evidenceCollected: InvestigationEvidence[];
  interviewsConducted: InvestigationInterview[];
}

export interface InvestigationEvidence {
  id: string;
  evidenceType: 'document' | 'record' | 'data' | 'physical' | 'testimony';
  description: string;
  collectedDate: string;
  collectedBy: string;
  location?: string;
  attachmentId?: string;
}

export interface InvestigationInterview {
  id: string;
  intervieweeId: string;
  intervieweeName: string;
  interviewDate: string;
  interviewerId: string;
  summary: string;
  keyFindings: string[];
}

export interface CAPAActionPlan {
  id: string;
  capaId: string;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
  approvedDate?: string;
  approvedBy?: string;
  actions: CAPAAction[];
  totalActions: number;
  completedActions: number;
  overdueActions: number;
}

export interface CAPAAction {
  id: string;
  actionNumber: number;
  actionType: 'immediate' | 'corrective' | 'preventive';
  description: string;
  assigneeId: string;
  assigneeName: string;
  targetDate: string;
  completedDate?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  priority: QMSPriority;
  deliverables: string[];
  evidence?: string;
  attachmentIds: string[];
  verifiedBy?: string;
  verifiedDate?: string;
  comments: string;
}

export interface EffectivenessCheck {
  id: string;
  capaId: string;
  checkNumber: number;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  checkType: 'initial' | 'follow-up' | 'final';
  criteria: EffectivenessCriterion[];
  performedById?: string;
  performedByName?: string;
  overallResult?: 'effective' | 'partially-effective' | 'ineffective';
  evidence?: string;
  recommendations?: string;
  requiresRecurrence: boolean;
  nextCheckDate?: string;
}

export interface EffectivenessCriterion {
  id: string;
  description: string;
  targetMetric?: string;
  actualResult?: string;
  passed: boolean | null;
  comments?: string;
}

export interface CAPAComment {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: string;
  isInternal: boolean;
}

export interface CAPATimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: CAPAStatus;
  newStatus?: CAPAStatus;
}

export interface ExtensionRequest {
  id: string;
  requestedBy: string;
  requestedById: string;
  requestDate: string;
  originalDueDate: string;
  requestedDueDate: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedById?: string;
  reviewDate?: string;
  reviewComments?: string;
}

// ============================================================================
// DEVIATION MANAGEMENT
// ============================================================================

export type DeviationType = 'planned' | 'unplanned' | 'temporary';
export type DeviationCategory = 
  | 'process' | 'equipment' | 'material' | 'documentation'
  | 'environmental' | 'personnel' | 'facility' | 'system';
export type DeviationStatus = 
  | 'draft' | 'pending-classification' | 'classified' 
  | 'investigation' | 'pending-approval' | 'approved'
  | 'implemented' | 'closed' | 'cancelled';

export interface Deviation {
  id: string;
  deviationNumber: string;
  title: string;
  description: string;
  deviationType: DeviationType;
  category: DeviationCategory;
  subcategory?: string;
  severity: QMSSeverity;
  status: DeviationStatus;
  department: QMSDepartment;
  affectedArea: string;
  affectedProducts: string[];
  affectedBatches: string[];
  affectedProcesses: string[];
  affectedDocuments: string[];
  productImpact: ProductImpactAssessment;
  patientSafetyImpact: 'none' | 'potential' | 'confirmed';
  regulatoryImpact: 'none' | 'reportable' | 'requires-notification';
  discoveryDate: string;
  discoveredBy: string;
  discoveredById: string;
  occurrenceDate: string;
  reportedDate: string;
  reportedBy: string;
  reportedById: string;
  ownerId: string;
  ownerName: string;
  classificationDate?: string;
  classifiedBy?: string;
  classifiedById?: string;
  immediateActions: ImmediateAction[];
  investigation?: DeviationInvestigation;
  riskAssessment?: DeviationRiskAssessment;
  disposition?: DeviationDisposition;
  linkedCAPAs: string[];
  linkedChangeControls: string[];
  attachments: DocumentAttachment[];
  comments: CAPAComment[];
  timeline: DeviationTimelineEntry[];
  approvalWorkflow?: ApprovalWorkflowInstance;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}

export interface ProductImpactAssessment {
  id: string;
  impactLevel: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  qualityAttributes: QualityAttributeImpact[];
  affectedQuantity?: number;
  affectedUnits?: string;
  marketStatus: 'not-released' | 'released' | 'partially-released';
  recallRequired: boolean;
  recallType?: 'market-withdrawal' | 'class-i' | 'class-ii' | 'class-iii';
  quarantineRequired: boolean;
  quarantineStatus?: 'not-started' | 'in-progress' | 'completed';
  justification: string;
  assessedBy: string;
  assessedDate: string;
}

export interface QualityAttributeImpact {
  attribute: string;
  specification: string;
  actualResult?: string;
  impacted: boolean;
  comments?: string;
}

export interface ImmediateAction {
  id: string;
  description: string;
  takenBy: string;
  takenById: string;
  takenAt: string;
  result: string;
  evidence?: string;
  attachmentIds: string[];
}

export interface DeviationInvestigation {
  id: string;
  deviationId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  assigneeId: string;
  assigneeName: string;
  startDate?: string;
  targetDate: string;
  completionDate?: string;
  rootCauseIdentified: boolean;
  rootCauseDescription?: string;
  rootCauseCategory?: RootCause['category'];
  investigationSummary?: string;
  capaRequired: boolean;
  capaId?: string;
}

export interface DeviationRiskAssessment {
  id: string;
  deviationId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  severityScore: number;
  occurrenceScore: number;
  detectabilityScore: number;
  riskPriorityNumber: number; // RPN = S x O x D
  justification: string;
  mitigationMeasures: string[];
  residualRisk: 'acceptable' | 'unacceptable';
  assessedBy: string;
  assessedById: string;
  assessedDate: string;
  approvedBy?: string;
  approvedById?: string;
  approvedDate?: string;
}

export interface DeviationDisposition {
  id: string;
  deviationId: string;
  decision: 'use-as-is' | 'rework' | 'reprocess' | 'reject' | 'return-to-supplier' | 'not-applicable';
  justification: string;
  conditions?: string;
  approvedBy: string;
  approvedById: string;
  approvedDate: string;
  implementedDate?: string;
  implementedBy?: string;
  verifiedDate?: string;
  verifiedBy?: string;
}

export interface DeviationTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: DeviationStatus;
  newStatus?: DeviationStatus;
}

// ============================================================================
// CHANGE CONTROL
// ============================================================================

export type ChangeType = 
  | 'process' | 'equipment' | 'facility' | 'system'
  | 'material' | 'supplier' | 'document' | 'specification'
  | 'method' | 'packaging' | 'labeling' | 'personnel';

export type ChangeCategory = 'major' | 'minor' | 'administrative';

export type ChangeControlStatus = 
  | 'draft' | 'pending-review' | 'impact-assessment' 
  | 'pending-approval' | 'approved' | 'implementation'
  | 'verification' | 'closed' | 'rejected' | 'cancelled';

export interface ChangeControl {
  id: string;
  changeNumber: string;
  title: string;
  description: string;
  changeType: ChangeType;
  category: ChangeCategory;
  status: ChangeControlStatus;
  priority: QMSPriority;
  department: QMSDepartment;
  requestorId: string;
  requestorName: string;
  ownerId: string;
  ownerName: string;
  sponsorId?: string;
  sponsorName?: string;
  justification: string;
  businessDrivers: string[];
  proposedChange: ProposedChangeDetail;
  currentState: string;
  futureState: string;
  impactAssessment: ChangeImpactAssessment;
  riskAssessment: ChangeRiskAssessment;
  implementationPlan: ImplementationPlan;
  verification: ChangeVerification;
  affectedDepartments: QMSDepartment[];
  affectedProducts: string[];
  affectedProcesses: string[];
  affectedSystems: string[];
  affectedDocuments: ControlledDocumentReference[];
  regulatoryAssessment: RegulatoryChangeAssessment;
  approvalWorkflow: ApprovalWorkflowInstance;
  linkedDeviations: string[];
  linkedCAPAs: string[];
  linkedRegIntelAlerts: string[];
  attachments: DocumentAttachment[];
  comments: CAPAComment[];
  timeline: ChangeControlTimelineEntry[];
  targetImplementationDate: string;
  actualImplementationDate?: string;
  targetClosureDate: string;
  actualClosureDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposedChangeDetail {
  id: string;
  currentConfiguration: string;
  proposedConfiguration: string;
  technicalRationale: string;
  alternatives: ChangeAlternative[];
  selectedAlternative?: string;
}

export interface ChangeAlternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedCost?: number;
  estimatedDuration?: number;
  selected: boolean;
}

export interface ChangeImpactAssessment {
  id: string;
  changeControlId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  overallImpact: 'low' | 'medium' | 'high' | 'critical';
  departmentImpacts: DepartmentImpact[];
  qualityImpact: QualityImpact;
  operationalImpact: OperationalImpact;
  financialImpact: FinancialImpact;
  assessedBy: string;
  assessedById: string;
  assessedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
}

export interface DepartmentImpact {
  department: QMSDepartment;
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  description: string;
  resourceRequirements?: string;
  trainingRequired: boolean;
  assessedBy: string;
  assessedDate: string;
}

export interface QualityImpact {
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectsProductQuality: boolean;
  affectsValidationStatus: boolean;
  revalidationRequired: boolean;
  requalificationRequired: boolean;
  stabilityImpact: boolean;
  specificationChangeRequired: boolean;
  description: string;
}

export interface OperationalImpact {
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  productionDowntime: number; // hours
  implementationEffort: number; // person-hours
  trainingEffort: number; // person-hours
  description: string;
}

export interface FinancialImpact {
  implementationCost: number;
  recurringCost: number;
  costSavings: number;
  paybackPeriod?: number; // months
  capitalRequired: boolean;
  budgetApprovalRequired: boolean;
  description: string;
}

export interface ChangeRiskAssessment {
  id: string;
  changeControlId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  risks: IdentifiedRisk[];
  mitigationPlan: string;
  residualRiskLevel: 'low' | 'medium' | 'high';
  assessedBy: string;
  assessedById: string;
  assessedDate: string;
}

export interface IdentifiedRisk {
  id: string;
  description: string;
  category: 'quality' | 'safety' | 'regulatory' | 'operational' | 'financial';
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
  riskScore: number;
  mitigation: string;
  owner: string;
}

export interface ImplementationPlan {
  id: string;
  changeControlId: string;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
  phases: ImplementationPhase[];
  totalTasks: number;
  completedTasks: number;
  startDate?: string;
  targetEndDate: string;
  actualEndDate?: string;
}

export interface ImplementationPhase {
  id: string;
  phaseNumber: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
  tasks: ImplementationTask[];
  dependencies: string[];
  milestones: string[];
}

export interface ImplementationTask {
  id: string;
  taskNumber: number;
  description: string;
  assigneeId: string;
  assigneeName: string;
  targetDate: string;
  completedDate?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  blockedReason?: string;
  deliverables: string[];
  evidence?: string;
  comments?: string;
}

export interface ChangeVerification {
  id: string;
  changeControlId: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  verificationCriteria: VerificationCriterion[];
  overallResult?: 'pass' | 'pass-with-conditions' | 'fail';
  verifiedBy?: string;
  verifiedById?: string;
  verifiedDate?: string;
  conditions?: string;
  evidence?: string;
}

export interface VerificationCriterion {
  id: string;
  description: string;
  acceptanceCriteria: string;
  actualResult?: string;
  status: 'not-tested' | 'pass' | 'fail' | 'not-applicable';
  testedBy?: string;
  testedDate?: string;
  evidence?: string;
}

export interface RegulatoryChangeAssessment {
  id: string;
  changeControlId: string;
  regulatoryImpact: 'none' | 'notification' | 'variation' | 'new-submission';
  affectedMarkets: string[];
  submissionRequirements: RegulatorySubmissionRequirement[];
  assessedBy: string;
  assessedById: string;
  assessedDate: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface RegulatorySubmissionRequirement {
  id: string;
  market: string;
  agency: string;
  submissionType: string;
  requiredDocuments: string[];
  targetSubmissionDate?: string;
  actualSubmissionDate?: string;
  status: 'not-required' | 'pending' | 'submitted' | 'approved';
}

export interface ControlledDocumentReference {
  documentId: string;
  documentNumber: string;
  title: string;
  currentVersion: string;
  changeRequired: boolean;
  changeDescription?: string;
  newVersion?: string;
}

export interface ChangeControlTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: ChangeControlStatus;
  newStatus?: ChangeControlStatus;
}

// ============================================================================
// TRAINING MANAGEMENT
// ============================================================================

export type TrainingType = 
  | 'initial' | 'refresher' | 'annual' | 'job-specific'
  | 'regulatory' | 'gmp' | 'safety' | 'system' | 'sop-specific';

export type TrainingDeliveryMethod = 
  | 'classroom' | 'online' | 'on-the-job' | 'self-study'
  | 'virtual-instructor' | 'simulation' | 'blended';

export type TrainingStatus = 
  | 'not-started' | 'in-progress' | 'completed'
  | 'failed' | 'expired' | 'exempted';

export interface TrainingCurriculum {
  id: string;
  curriculumCode: string;
  title: string;
  description: string;
  department: QMSDepartment;
  targetRoles: string[];
  trainingType: TrainingType;
  courses: CurriculumCourse[];
  prerequisites: string[];
  validityPeriod: number; // months
  isActive: boolean;
  isMandatory: boolean;
  regulatoryRequirement: boolean;
  linkedDocumentIds: string[];
  linkedSOPs: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  effectiveDate: string;
  retiredDate?: string;
}

export interface CurriculumCourse {
  id: string;
  courseId: string;
  courseTitle: string;
  sequenceNumber: number;
  isMandatory: boolean;
  isPrerequisite: boolean;
}

export interface TrainingCourse {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  version: string;
  deliveryMethod: TrainingDeliveryMethod;
  duration: number; // minutes
  passingScore?: number;
  maxAttempts?: number;
  materials: TrainingMaterial[];
  assessmentRequired: boolean;
  assessmentId?: string;
  instructorRequired: boolean;
  qualifiedInstructors: string[];
  scheduledSessions: TrainingSession[];
  isActive: boolean;
  effectiveDate: string;
  retiredDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingMaterial {
  id: string;
  title: string;
  type: 'document' | 'video' | 'presentation' | 'interactive' | 'link';
  fileLocation?: string;
  url?: string;
  duration?: number;
  sequenceNumber: number;
}

export interface TrainingSession {
  id: string;
  courseId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  enrolledParticipants: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface TrainingAssignment {
  id: string;
  userId: string;
  userName: string;
  curriculumId: string;
  curriculumTitle: string;
  courseId: string;
  courseTitle: string;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  status: TrainingStatus;
  assignedBy: string;
  assignedReason: 'new-hire' | 'role-change' | 'document-update' | 'periodic' | 'remediation' | 'voluntary';
  attempts: TrainingAttempt[];
  currentAttempt: number;
  score?: number;
  passed: boolean | null;
  certificateId?: string;
  expirationDate?: string;
  exemptionReason?: string;
  exemptionApprovedBy?: string;
}

export interface TrainingAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  score?: number;
  passed: boolean | null;
  timeSpent: number; // minutes
  assessmentResponses?: AssessmentResponse[];
}

export interface AssessmentResponse {
  questionId: string;
  response: string | string[];
  isCorrect: boolean | null;
  pointsEarned: number;
}

export interface TrainingRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  department: QMSDepartment;
  role: string;
  completedTrainings: CompletedTraining[];
  currentAssignments: string[];
  overdueAssignments: string[];
  upcomingExpirations: TrainingExpiration[];
  complianceStatus: 'compliant' | 'non-compliant' | 'at-risk';
  compliancePercentage: number;
}

export interface CompletedTraining {
  assignmentId: string;
  curriculumId: string;
  curriculumTitle: string;
  courseId: string;
  courseTitle: string;
  completedDate: string;
  expirationDate?: string;
  score?: number;
  certificateId?: string;
}

export interface TrainingExpiration {
  assignmentId: string;
  trainingTitle: string;
  expirationDate: string;
  daysUntilExpiration: number;
  renewalRequired: boolean;
}

export interface TrainingCertificate {
  id: string;
  certificateNumber: string;
  assignmentId: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  curriculumId?: string;
  curriculumTitle?: string;
  issuedDate: string;
  expirationDate?: string;
  instructorName?: string;
  score?: number;
  status: 'active' | 'expired' | 'revoked';
  revokedReason?: string;
}

// ============================================================================
// AUDIT MANAGEMENT
// ============================================================================

export type AuditType = 
  | 'internal' | 'external' | 'regulatory' | 'customer'
  | 'supplier' | 'certification' | 'self-inspection';

export type AuditScope = 
  | 'system' | 'process' | 'product' | 'facility'
  | 'department' | 'supplier' | 'clinical-site';

export type AuditStatus = 
  | 'planned' | 'scheduled' | 'preparation' | 'in-progress'
  | 'report-draft' | 'report-review' | 'closed' | 'cancelled';

export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation' | 'opportunity';

export interface QMSAudit {
  id: string;
  auditNumber: string;
  title: string;
  auditType: AuditType;
  scope: AuditScope;
  status: AuditStatus;
  department: QMSDepartment;
  affectedDepartments: QMSDepartment[];
  scheduledStartDate: string;
  scheduledEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  auditPlan: QMSAuditPlan;
  auditTeam: AuditTeamMember[];
  leadAuditorId: string;
  leadAuditorName: string;
  auditees: Auditee[];
  regulatoryFrameworks: QMSRegulatoryFramework[];
  checklistId?: string;
  findings: AuditFinding[];
  report?: AuditReport;
  linkedCAPAs: string[];
  linkedDeviations: string[];
  previousAuditId?: string;
  attachments: DocumentAttachment[];
  comments: CAPAComment[];
  timeline: AuditTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface QMSAuditPlan {
  id: string;
  auditId: string;
  version: string;
  status: 'draft' | 'approved' | 'final';
  objectives: string[];
  scope: string;
  exclusions?: string;
  criteria: string[];
  methodology: string;
  schedule: AuditScheduleItem[];
  resourceRequirements: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface AuditScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  activity: string;
  location: string;
  auditorIds: string[];
  auditeeIds: string[];
  processes: string[];
  documents: string[];
}

export interface AuditTeamMember {
  id: string;
  userId: string;
  userName: string;
  role: 'lead-auditor' | 'auditor' | 'observer' | 'technical-expert';
  department: string;
  qualifications: string[];
  conflictOfInterest: boolean;
  conflictDetails?: string;
}

export interface Auditee {
  id: string;
  userId: string;
  userName: string;
  department: QMSDepartment;
  role: string;
  contactInfo: string;
}

export interface AuditChecklist {
  id: string;
  title: string;
  auditType: AuditType;
  scope: AuditScope;
  regulatoryFramework: QMSRegulatoryFramework;
  version: string;
  sections: ChecklistSection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistSection {
  id: string;
  sectionNumber: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  itemNumber: string;
  requirement: string;
  guidanceText?: string;
  regulatoryReference?: string;
  isCritical: boolean;
  evidenceRequired: string[];
}

export interface ChecklistResponse {
  itemId: string;
  status: 'conforming' | 'non-conforming' | 'not-applicable' | 'not-assessed';
  findingId?: string;
  evidence: string;
  notes?: string;
  assessedBy: string;
  assessedDate: string;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  findingNumber: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: string;
  affectedProcess: string;
  affectedDepartment: QMSDepartment;
  regulatoryReference?: string;
  checklistItemId?: string;
  evidence: string;
  rootCause?: string;
  status: 'open' | 'response-pending' | 'response-received' | 'verified' | 'closed';
  auditeeResponse?: AuditeeResponse;
  capaRequired: boolean;
  capaId?: string;
  verificationDate?: string;
  verifiedBy?: string;
  verificationResult?: 'effective' | 'ineffective';
  closedDate?: string;
  closedBy?: string;
}

export interface AuditeeResponse {
  id: string;
  findingId: string;
  responseDate: string;
  respondedBy: string;
  respondedById: string;
  rootCauseAnalysis?: string;
  correctiveActions: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  evidence?: string;
  attachmentIds: string[];
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  reviewComments?: string;
}

export interface AuditReport {
  id: string;
  auditId: string;
  reportNumber: string;
  version: string;
  status: 'draft' | 'review' | 'final' | 'issued';
  executiveSummary: string;
  scope: string;
  methodology: string;
  findingsSummary: FindingsSummary;
  conclusions: string;
  recommendations: string[];
  distributionList: string[];
  preparedBy: string;
  preparedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  issuedDate?: string;
}

export interface FindingsSummary {
  totalFindings: number;
  critical: number;
  major: number;
  minor: number;
  observations: number;
  opportunities: number;
  openFindings: number;
  closedFindings: number;
}

export interface AuditTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: AuditStatus;
  newStatus?: AuditStatus;
}

// ============================================================================
// QUALITY METRICS & KPIs
// ============================================================================

export type MetricCategory = 
  | 'capa' | 'deviation' | 'change-control' | 'training'
  | 'audit' | 'document-control' | 'complaints' | 'supplier';

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface QualityMetric {
  id: string;
  metricCode: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string;
  unit: string;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  higherIsBetter: boolean;
  department?: QMSDepartment;
  isActive: boolean;
  frequency: MetricPeriod;
  owner: string;
  ownerId: string;
}

export interface MetricDataPoint {
  id: string;
  metricId: string;
  period: string;
  periodType: MetricPeriod;
  value: number;
  target: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
  previousValue?: number;
  changePercent?: number;
  dataSource: string;
  calculatedAt: string;
  calculatedBy: string;
  notes?: string;
}

export interface QualityDashboard {
  id: string;
  generatedAt: string;
  period: string;
  periodType: MetricPeriod;
  summaryMetrics: SummaryMetric[];
  categoryMetrics: CategoryMetrics[];
  trendCharts: TrendChartData[];
  alerts: QualityAlert[];
  recommendations: QualityRecommendation[];
}

export interface SummaryMetric {
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
  changeFromPrevious: number;
}

export interface CategoryMetrics {
  category: MetricCategory;
  metrics: MetricSummary[];
  overallStatus: 'green' | 'yellow' | 'red';
  trendDirection: TrendDirection;
}

export interface MetricSummary {
  metricId: string;
  metricCode: string;
  name: string;
  currentValue: number;
  target: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
}

export interface TrendChartData {
  metricId: string;
  metricName: string;
  dataPoints: ChartDataPoint[];
  targetLine: number;
  warningLine: number;
  criticalLine: number;
}

export interface ChartDataPoint {
  period: string;
  value: number;
  target: number;
}

export interface QualityAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: MetricCategory;
  title: string;
  description: string;
  metricId?: string;
  currentValue?: number;
  threshold?: number;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface QualityRecommendation {
  id: string;
  priority: QMSPriority;
  category: MetricCategory;
  title: string;
  description: string;
  rationale: string;
  suggestedActions: string[];
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// MANAGEMENT REVIEW
// ============================================================================

export interface ManagementReview {
  id: string;
  reviewNumber: string;
  title: string;
  reviewDate: string;
  status: 'scheduled' | 'preparation' | 'in-progress' | 'completed' | 'cancelled';
  chairpersonId: string;
  chairpersonName: string;
  attendees: ReviewAttendee[];
  agenda: ReviewAgendaItem[];
  inputs: ManagementReviewInput[];
  outputs: ManagementReviewOutput[];
  decisions: ReviewDecision[];
  actionItems: ReviewActionItem[];
  minutes?: string;
  attachments: DocumentAttachment[];
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAttendee {
  id: string;
  userId: string;
  userName: string;
  role: string;
  department: QMSDepartment;
  attendance: 'present' | 'absent' | 'excused';
}

export interface ReviewAgendaItem {
  id: string;
  itemNumber: number;
  topic: string;
  presenter: string;
  duration: number; // minutes
  documentIds?: string[];
}

export interface ManagementReviewInput {
  id: string;
  category: 'audit-results' | 'customer-feedback' | 'process-performance'
    | 'product-conformity' | 'capa-status' | 'previous-review-actions'
    | 'changes' | 'recommendations' | 'resources';
  title: string;
  summary: string;
  data?: Record<string, unknown>;
  documentIds?: string[];
  presenter: string;
}

export interface ManagementReviewOutput {
  id: string;
  category: 'improvement-opportunities' | 'resource-needs' | 'policy-changes'
    | 'objective-changes' | 'qms-effectiveness';
  title: string;
  description: string;
  priority: QMSPriority;
  actionRequired: boolean;
  assignedTo?: string;
}

export interface ReviewDecision {
  id: string;
  decisionNumber: number;
  topic: string;
  decision: string;
  rationale: string;
  votingResult?: string;
  effectiveDate?: string;
}

export interface ReviewActionItem {
  id: string;
  actionNumber: number;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  completedDate?: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  linkedOutputId?: string;
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

export type QMSView = 
  | 'dashboard' | 'document-control' | 'capa-list' | 'capa-detail'
  | 'deviation-list' | 'deviation-detail' | 'change-control-list' | 'change-control-detail'
  | 'training-dashboard' | 'training-assignments' | 'training-records'
  | 'audit-schedule' | 'audit-detail' | 'audit-findings'
  | 'metrics' | 'management-review';

export interface QMSFilters {
  departments?: QMSDepartment[];
  statuses?: string[];
  priorities?: QMSPriority[];
  severities?: QMSSeverity[];
  dateRange?: { start: string; end: string };
  assigneeId?: string;
  searchText?: string;
}

export interface QMSState {
  // Document Control
  controlledDocuments: Record<string, ControlledDocument>;
  documentVersions: Record<string, DocumentVersion>;
  documentsByNumber: Record<string, string>;
  controlledCopies: Record<string, ControlledCopy>;
  approvalWorkflows: Record<string, ApprovalWorkflowTemplate>;
  workflowInstances: Record<string, ApprovalWorkflowInstance>;
  
  // CAPA
  capas: Record<string, CAPA>;
  capasByNumber: Record<string, string>;
  rootCauseAnalyses: Record<string, RootCauseAnalysis>;
  
  // Deviations
  deviations: Record<string, Deviation>;
  deviationsByNumber: Record<string, string>;
  
  // Change Control
  changeControls: Record<string, ChangeControl>;
  changeControlsByNumber: Record<string, string>;
  
  // Training
  curricula: Record<string, TrainingCurriculum>;
  courses: Record<string, TrainingCourse>;
  assignments: Record<string, TrainingAssignment>;
  assignmentsByUser: Record<string, string[]>;
  trainingRecords: Record<string, TrainingRecord>;
  certificates: Record<string, TrainingCertificate>;
  
  // Audit
  audits: Record<string, QMSAudit>;
  auditsByNumber: Record<string, string>;
  checklists: Record<string, AuditChecklist>;
  findings: Record<string, AuditFinding>;
  findingsByAudit: Record<string, string[]>;
  
  // Metrics
  metrics: Record<string, QualityMetric>;
  metricData: Record<string, MetricDataPoint[]>;
  dashboardData: QualityDashboard | null;
  
  // Management Review
  managementReviews: Record<string, ManagementReview>;
  
  // UI State
  selectedDocumentId: string | null;
  selectedCAPAId: string | null;
  selectedDeviationId: string | null;
  selectedChangeControlId: string | null;
  selectedAuditId: string | null;
  selectedAssignmentId: string | null;
  activeView: QMSView;
  filters: QMSFilters;
  isLoading: boolean;
  lastError: string | null;
}

export interface QMSActions {
  // Document Control Actions
  createDocument: (data: Partial<ControlledDocument>) => ControlledDocument;
  updateDocument: (id: string, updates: Partial<ControlledDocument>) => void;
  createDocumentVersion: (documentId: string, changes: string) => DocumentVersion;
  submitForApproval: (documentVersionId: string) => void;
  approveDocument: (workflowInstanceId: string, stepId: string, approverId: string, comments?: string) => void;
  rejectDocument: (workflowInstanceId: string, stepId: string, approverId: string, comments: string) => void;
  makeEffective: (documentVersionId: string) => void;
  retireDocument: (documentId: string, reason: string) => void;
  issueControlledCopy: (documentId: string, issuedTo: string, copyType: ControlledCopy['copyType']) => ControlledCopy;
  recallControlledCopy: (copyId: string) => void;
  schedulePeriodicReview: (documentId: string) => void;
  
  // CAPA Actions
  createCAPA: (data: Partial<CAPA>) => CAPA;
  updateCAPA: (id: string, updates: Partial<CAPA>) => void;
  assignCAPA: (capaId: string, assigneeId: string, assigneeName: string) => void;
  startInvestigation: (capaId: string) => void;
  completeInvestigation: (capaId: string, findings: string) => void;
  addRootCauseAnalysis: (capaId: string, analysis: Partial<RootCauseAnalysis>) => RootCauseAnalysis;
  addCAPAAction: (capaId: string, action: Partial<CAPAAction>) => CAPAAction;
  completeCAPAAction: (capaId: string, actionId: string, evidence: string) => void;
  scheduleEffectivenessCheck: (capaId: string, scheduledDate: string) => void;
  completeEffectivenessCheck: (capaId: string, checkId: string, result: EffectivenessCheck['overallResult']) => void;
  closeCAPA: (capaId: string, closedBy: string) => void;
  
  // Deviation Actions
  createDeviation: (data: Partial<Deviation>) => Deviation;
  updateDeviation: (id: string, updates: Partial<Deviation>) => void;
  classifyDeviation: (deviationId: string, severity: QMSSeverity, classifiedBy: string) => void;
  addImmediateAction: (deviationId: string, action: Partial<ImmediateAction>) => void;
  assessProductImpact: (deviationId: string, assessment: Partial<ProductImpactAssessment>) => void;
  assessDeviationRisk: (deviationId: string, assessment: Partial<DeviationRiskAssessment>) => void;
  setDisposition: (deviationId: string, disposition: Partial<DeviationDisposition>) => void;
  linkDeviationToCAPA: (deviationId: string, capaId: string) => void;
  closeDeviation: (deviationId: string, closedBy: string) => void;
  
  // Change Control Actions
  createChangeControl: (data: Partial<ChangeControl>) => ChangeControl;
  updateChangeControl: (id: string, updates: Partial<ChangeControl>) => void;
  submitForImpactAssessment: (changeId: string) => void;
  completeImpactAssessment: (changeId: string, assessment: Partial<ChangeImpactAssessment>) => void;
  completeRiskAssessment: (changeId: string, assessment: Partial<ChangeRiskAssessment>) => void;
  submitForApprovalCC: (changeId: string) => void;
  approveChangeControl: (changeId: string, approverId: string, comments?: string) => void;
  rejectChangeControl: (changeId: string, approverId: string, reason: string) => void;
  startImplementation: (changeId: string) => void;
  completeImplementationTask: (changeId: string, phaseId: string, taskId: string) => void;
  completeVerification: (changeId: string, result: ChangeVerification['overallResult']) => void;
  closeChangeControl: (changeId: string, closedBy: string) => void;
  
  // Training Actions
  createCurriculum: (data: Partial<TrainingCurriculum>) => TrainingCurriculum;
  updateCurriculum: (id: string, updates: Partial<TrainingCurriculum>) => void;
  createCourse: (data: Partial<TrainingCourse>) => TrainingCourse;
  updateCourse: (id: string, updates: Partial<TrainingCourse>) => void;
  assignTraining: (userId: string, curriculumId: string, courseId: string, dueDate: string) => TrainingAssignment;
  startTraining: (assignmentId: string) => void;
  completeTraining: (assignmentId: string, score?: number) => void;
  failTraining: (assignmentId: string, score: number) => void;
  exemptFromTraining: (assignmentId: string, reason: string, approvedBy: string) => void;
  scheduleTrainingSession: (courseId: string, session: Partial<TrainingSession>) => TrainingSession;
  issueCertificate: (assignmentId: string) => TrainingCertificate;
  calculateUserCompliance: (userId: string) => TrainingRecord;
  
  // Audit Actions
  createAudit: (data: Partial<QMSAudit>) => QMSAudit;
  updateAudit: (id: string, updates: Partial<QMSAudit>) => void;
  createAuditPlan: (auditId: string, plan: Partial<QMSAuditPlan>) => QMSAuditPlan;
  approveAuditPlan: (auditId: string, approvedBy: string) => void;
  startAudit: (auditId: string) => void;
  addAuditFinding: (auditId: string, finding: Partial<AuditFinding>) => AuditFinding;
  updateFindingResponse: (findingId: string, response: Partial<AuditeeResponse>) => void;
  verifyFinding: (findingId: string, result: AuditFinding['verificationResult'], verifiedBy: string) => void;
  closeFinding: (findingId: string, closedBy: string) => void;
  generateAuditReport: (auditId: string) => AuditReport;
  issueAuditReport: (auditId: string, issuedBy: string) => void;
  closeAudit: (auditId: string, closedBy: string) => void;
  
  // Metrics Actions
  defineMetric: (data: Partial<QualityMetric>) => QualityMetric;
  updateMetric: (id: string, updates: Partial<QualityMetric>) => void;
  recordMetricData: (metricId: string, data: Partial<MetricDataPoint>) => void;
  calculateMetrics: (period: string, periodType: MetricPeriod) => void;
  generateDashboard: (period: string, periodType: MetricPeriod) => QualityDashboard;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => void;
  
  // Management Review Actions
  createManagementReview: (data: Partial<ManagementReview>) => ManagementReview;
  updateManagementReview: (id: string, updates: Partial<ManagementReview>) => void;
  addReviewInput: (reviewId: string, input: Partial<ManagementReviewInput>) => void;
  addReviewOutput: (reviewId: string, output: Partial<ManagementReviewOutput>) => void;
  addReviewDecision: (reviewId: string, decision: Partial<ReviewDecision>) => void;
  addReviewActionItem: (reviewId: string, actionItem: Partial<ReviewActionItem>) => void;
  completeReviewAction: (reviewId: string, actionId: string) => void;
  closeManagementReview: (reviewId: string) => void;
  
  // Cross-Module Integration
  linkRegIntelToChangeControl: (regIntelAlertId: string, changeControlId: string) => void;
  triggerTrainingFromDocumentUpdate: (documentId: string) => void;
  createCAPAFromAuditFinding: (findingId: string) => CAPA;
  createCAPAFromDeviation: (deviationId: string) => CAPA;
  
  // UI Actions
  setSelectedDocumentId: (id: string | null) => void;
  setSelectedCAPAId: (id: string | null) => void;
  setSelectedDeviationId: (id: string | null) => void;
  setSelectedChangeControlId: (id: string | null) => void;
  setSelectedAuditId: (id: string | null) => void;
  setSelectedAssignmentId: (id: string | null) => void;
  setActiveView: (view: QMSView) => void;
  setFilters: (filters: Partial<QMSFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Management
  loadMockData: () => void;
  clearAll: () => void;
}
