
/**
 * QMS Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for Quality Management System types in Ligature.
 * 
 * Covers: Document control (SOPs, WIs, forms), CAPA (corrective/preventive actions),
 * deviations, change control, training management, audit management,
 * quality metrics, and management review.
 * 
 * Aligned with: ICH Q10, ISO 9001, 21 CFR Part 11, GxP requirements.
 * 
 * @module domains/qms/contracts
 * @version 0.27.23
 */

// =============================================================================
// COMMON ENUMS
// =============================================================================

export type QMSPriority = 'critical' | 'high' | 'medium' | 'low';

export type QMSSeverity = 'critical' | 'major' | 'minor';

export type QMSDepartment = 
  | 'regulatory-affairs' | 'clinical-operations' | 'quality-assurance' 
  | 'quality-control' | 'manufacturing' | 'r-and-d' | 'medical-affairs'
  | 'pharmacovigilance' | 'data-management' | 'biostatistics'
  | 'supply-chain' | 'facilities' | 'it' | 'hr' | 'finance' | 'executive';

export type QMSRegulatoryFramework = 
  | 'ich-q10' | 'iso-9001' | 'iso-13485' | '21-cfr-part-11' 
  | '21-cfr-part-820' | 'eu-gmp-annex-11' | 'gcp' | 'glp' | 'gmp';

export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

// =============================================================================
// DOCUMENT CONTROL ENUMS
// =============================================================================

export type QMSDocumentType = 
  | 'sop' | 'work-instruction' | 'form' | 'template' | 'policy' 
  | 'specification' | 'protocol' | 'report' | 'record' | 'manual';

export type ApprovalStatus = 
  | 'draft' | 'pending-review' | 'approved' | 'rejected' 
  | 'effective' | 'superseded' | 'retired';

export type ReviewCycleStatus = 
  | 'scheduled' | 'in-progress' | 'completed' | 'overdue' | 'extended';

export type ReviewOutcome = 'no-changes' | 'minor-revision' | 'major-revision' | 'retire';

export type ControlledCopyType = 'electronic' | 'printed';

export type ControlledCopyStatus = 'active' | 'recalled' | 'destroyed';

export type WorkflowStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

// =============================================================================
// CAPA ENUMS
// =============================================================================

export type CAPAType = 'corrective' | 'preventive' | 'both';

export type CAPASource = 
  | 'deviation' | 'audit-finding' | 'complaint' | 'oov' 
  | 'trend-analysis' | 'risk-assessment' | 'management-review'
  | 'regulatory-observation' | 'supplier-issue' | 'process-improvement';

export type CAPAStatus = 
  | 'draft' | 'pending-approval' | 'approved' | 'investigation' 
  | 'action-planning' | 'implementation' | 'effectiveness-check'
  | 'closed' | 'closed-ineffective' | 'cancelled';

export type CAPAActionStatus = 
  | 'not-started' | 'in-progress' | 'completed' 
  | 'verified' | 'overdue' | 'cancelled';

export type EffectivenessResult = 'effective' | 'partially-effective' | 'not-effective' | 'pending';

export type RootCauseMethod = 
  | '5-whys' | 'fishbone' | 'fmea' | 'fault-tree' | 'rca' | 'other';

// =============================================================================
// DEVIATION ENUMS
// =============================================================================

export type DeviationType = 'planned' | 'unplanned' | 'temporary';

export type DeviationCategory = 
  | 'process' | 'equipment' | 'material' | 'documentation'
  | 'environmental' | 'personnel' | 'facility' | 'system';

export type DeviationStatus = 
  | 'draft' | 'pending-classification' | 'classified' | 'investigation'
  | 'impact-assessment' | 'disposition' | 'closed' | 'cancelled';

export type ImmediateActionType = 
  | 'containment' | 'quarantine' | 'notification' | 'documentation' 
  | 'process-stop' | 'equipment-isolation' | 'other';

export type ProductImpactLevel = 'none' | 'potential' | 'confirmed' | 'widespread';

export type DispositionDecision = 
  | 'use-as-is' | 'rework' | 'reprocess' | 'reject' | 'return-to-supplier';

// =============================================================================
// CHANGE CONTROL ENUMS
// =============================================================================

export type ChangeType = 
  | 'process' | 'equipment' | 'facility' | 'material' | 'supplier'
  | 'specification' | 'software' | 'documentation' | 'organization' | 'other';

export type ChangeCategory = 'major' | 'minor' | 'administrative';

export type ChangeControlStatus = 
  | 'draft' | 'pending-assessment' | 'impact-assessment' | 'risk-assessment'
  | 'pending-approval' | 'approved' | 'rejected' | 'implementation'
  | 'verification' | 'closed' | 'cancelled';

export type ImpactArea = 
  | 'product-quality' | 'safety' | 'efficacy' | 'regulatory' | 'validation'
  | 'documentation' | 'training' | 'supplier' | 'cost' | 'schedule';

export type RiskLevel = 'high' | 'medium' | 'low';

// =============================================================================
// TRAINING ENUMS
// =============================================================================

export type TrainingDeliveryMethod = 
  | 'instructor-led' | 'e-learning' | 'on-the-job' | 'self-study' 
  | 'virtual' | 'blended' | 'assessment-only';

export type TrainingAssignmentStatus = 
  | 'assigned' | 'in-progress' | 'completed' | 'overdue' 
  | 'failed' | 'exempted' | 'expired';

export type TrainingStatus = 
  | 'not-started' | 'in-progress' | 'completed'
  | 'failed' | 'expired' | 'exempted';

export type TrainingCompletionType = 
  | 'passed' | 'failed' | 'exempted' | 'waived' | 'expired';

export type CurriculumStatus = 'active' | 'inactive' | 'archived';

// =============================================================================
// AUDIT ENUMS
// =============================================================================

export type AuditType = 
  | 'internal' | 'external' | 'regulatory' | 'supplier' 
  | 'customer' | 'certification' | 'for-cause';

export type AuditStatus = 
  | 'scheduled' | 'planning' | 'in-progress' | 'reporting' 
  | 'follow-up' | 'closed' | 'cancelled';

export type AuditScope = 
  | 'full-system' | 'process-specific' | 'department' | 'product' 
  | 'supplier' | 'site' | 'follow-up';

export type FindingClassification = 
  | 'observation' | 'minor' | 'major' | 'critical' 
  | 'opportunity-for-improvement' | 'noteworthy-practice';

export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation' | 'opportunity';

export type FindingStatus = 
  | 'open' | 'response-pending' | 'response-received' | 'verification-pending'
  | 'verified-closed' | 'verified-open' | 'escalated' | 'closed';

// =============================================================================
// METRICS ENUMS
// =============================================================================

export type MetricCategory = 
  | 'quality' | 'compliance' | 'process' | 'customer' 
  | 'supplier' | 'training' | 'audit' | 'capa' | 'deviation';

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

export type TrendDirection = 'improving' | 'stable' | 'declining';

export type AlertLevel = 'info' | 'warning' | 'critical';

// =============================================================================
// VIEW TYPE
// =============================================================================

export type QMSView = 
  | 'dashboard' | 'document-control' | 'capa-list' | 'capa-detail'
  | 'deviation-list' | 'deviation-detail' | 'change-control-list' | 'change-control-detail'
  | 'training-dashboard' | 'training-assignments' | 'training-records'
  | 'audit-schedule' | 'audit-detail' | 'audit-findings'
  | 'metrics' | 'management-review';

// =============================================================================
// DOCUMENT CONTROL INTERFACES
// =============================================================================

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
  periodicReviewCycle: number;
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
  confidentialityLevel: ConfidentialityLevel;
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
  status: ReviewCycleStatus;
  reviewerId: string;
  reviewerName: string;
  outcome?: ReviewOutcome;
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
  copyType: ControlledCopyType;
  status: ControlledCopyStatus;
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
  stepStatuses: StepStatusRecord[];
}

export interface StepStatusRecord {
  stepId: string;
  stepNumber: number;
  stepName: string;
  approverId: string;
  approverName: string;
  status: WorkflowStepStatus;
  actionDate?: string;
  comments?: string;
  signatureId?: string;
}

// =============================================================================
// CAPA INTERFACES (Store-aligned)
// =============================================================================

/**
 * DocumentAttachment - File attachment for QMS records
 */
export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

/**
 * CAPA - Corrective and Preventive Action (store-compatible)
 */
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

/**
 * CAPAInvestigation - Investigation phase of CAPA
 */
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

/**
 * InvestigationEvidence - Evidence collected during investigation
 */
export interface InvestigationEvidence {
  id: string;
  evidenceType: 'document' | 'record' | 'data' | 'physical' | 'testimony';
  description: string;
  collectedDate: string;
  collectedBy: string;
  location?: string;
  attachmentId?: string;
}

/**
 * InvestigationInterview - Interview conducted during investigation
 */
export interface InvestigationInterview {
  id: string;
  intervieweeId: string;
  intervieweeName: string;
  interviewDate: string;
  interviewerId: string;
  summary: string;
  keyFindings: string[];
}

/**
 * CAPAActionPlan - Action plan for CAPA
 */
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

/**
 * CAPAAction - Individual action within CAPA (store-compatible)
 */
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

/**
 * RootCauseAnalysis - Root cause analysis for CAPA (store-compatible)
 */
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

/**
 * RootCause - Individual root cause
 */
export interface RootCause {
  id: string;
  category: 'people' | 'process' | 'equipment' | 'materials' | 'environment' | 'management';
  description: string;
  evidence: string;
  isPrimary: boolean;
  likelihood: 'confirmed' | 'probable' | 'possible';
}

/**
 * ContributingFactor - Factor contributing to issue
 */
export interface ContributingFactor {
  id: string;
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * EffectivenessCheck - Effectiveness verification (store-compatible)
 */
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

/**
 * EffectivenessCriterion - Individual criterion for effectiveness check
 */
export interface EffectivenessCriterion {
  id: string;
  description: string;
  targetMetric?: string;
  actualResult?: string;
  passed: boolean | null;
  comments?: string;
}

/**
 * CAPAComment - Comment on CAPA record
 */
export interface CAPAComment {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: string;
  isInternal: boolean;
}

/**
 * CAPATimelineEntry - Timeline entry for CAPA history
 */
export interface CAPATimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: CAPAStatus;
  newStatus?: CAPAStatus;
}

/**
 * ExtensionRequest - Request to extend CAPA deadline
 */
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

// =============================================================================
// DEVIATION INTERFACES
// =============================================================================

export interface Deviation {
  id: string;
  deviationNumber: string;
  title: string;
  description: string;
  deviationType: DeviationType;
  status: DeviationStatus;
  severity?: QMSSeverity;
  priority: QMSPriority;
  department: QMSDepartment;
  discoveredBy: string;
  discoveredById: string;
  discoveryDate: string;
  discoveryTime?: string;
  ownerId: string;
  ownerName: string;
  processArea: string;
  equipmentId?: string;
  batchNumber?: string;
  productId?: string;
  productName?: string;
  immediateActions: ImmediateAction[];
  productImpactAssessment?: ProductImpactAssessment;
  riskAssessment?: DeviationRiskAssessment;
  disposition?: DeviationDisposition;
  linkedCAPAId?: string;
  linkedCAPANumber?: string;
  targetCloseDate: string;
  actualCloseDate?: string;
  regulatoryReportable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImmediateAction {
  id: string;
  actionType: ImmediateActionType;
  description: string;
  performedBy: string;
  performedAt: string;
  outcome: string;
}

export interface ProductImpactAssessment {
  id: string;
  assessedBy: string;
  assessedDate: string;
  impactLevel: ProductImpactLevel;
  affectedBatches: string[];
  affectedProducts: string[];
  patientSafetyImpact: boolean;
  patientSafetyRationale: string;
  productQualityImpact: boolean;
  productQualityRationale: string;
  conclusions: string;
}

export interface DeviationRiskAssessment {
  id: string;
  assessedBy: string;
  assessedDate: string;
  probabilityScore: number;
  severityScore: number;
  detectabilityScore: number;
  riskPriorityNumber: number;
  riskLevel: RiskLevel;
  mitigationRequired: boolean;
  mitigationPlan?: string;
}

export interface DeviationDisposition {
  id: string;
  decision: DispositionDecision;
  rationale: string;
  approvedBy: string;
  approvedDate: string;
  conditions?: string;
  affectedBatchDispositions: BatchDisposition[];
}

export interface BatchDisposition {
  batchNumber: string;
  decision: DispositionDecision;
  quantity: number;
  unit: string;
}

/**
 * DeviationInvestigation - Investigation for a deviation
 */
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

/**
 * DeviationTimelineEntry - Timeline entry for deviation history
 */
export interface DeviationTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: DeviationStatus;
  newStatus?: DeviationStatus;
}

// =============================================================================
// CHANGE CONTROL INTERFACES
// =============================================================================

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
  requestedBy: string;
  requestedById: string;
  requestedDate: string;
  ownerId: string;
  ownerName: string;
  justification: string;
  proposedChange: string;
  affectedAreas: ImpactArea[];
  affectedDocuments: string[];
  affectedProcesses: string[];
  affectedEquipment: string[];
  impactAssessment?: ChangeImpactAssessment;
  riskAssessment?: ChangeRiskAssessment;
  approvals: ChangeApproval[];
  implementationPlan?: ImplementationPlan;
  verification?: ChangeVerification;
  targetImplementationDate: string;
  actualImplementationDate?: string;
  targetCloseDate: string;
  actualCloseDate?: string;
  regulatorySubmissionRequired: boolean;
  validationRequired: boolean;
  trainingRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeImpactAssessment {
  id: string;
  assessedBy: string;
  assessedDate: string;
  impactAreas: ImpactAreaAssessment[];
  overallImpact: 'high' | 'medium' | 'low';
  conclusions: string;
}

export interface ImpactAreaAssessment {
  area: ImpactArea;
  impacted: boolean;
  description: string;
  mitigationRequired: boolean;
  mitigation?: string;
}

export interface ChangeRiskAssessment {
  id: string;
  assessedBy: string;
  assessedDate: string;
  implementationRisks: RiskItem[];
  notImplementingRisks: RiskItem[];
  overallRiskLevel: RiskLevel;
  recommendations: string;
}

export interface RiskItem {
  id: string;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  overallRisk: RiskLevel;
  mitigation?: string;
}

export interface ChangeApproval {
  id: string;
  approverRole: string;
  approverId: string;
  approverName: string;
  status: WorkflowStepStatus;
  requestedDate: string;
  responseDate?: string;
  comments?: string;
}

export interface ImplementationPlan {
  id: string;
  phases: ImplementationPhase[];
  estimatedDuration: number;
  actualDuration?: number;
}

export interface ImplementationPhase {
  id: string;
  phaseName: string;
  description: string;
  sequence: number;
  tasks: ImplementationTask[];
  targetStartDate: string;
  targetEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface ImplementationTask {
  id: string;
  taskName: string;
  description: string;
  assignedTo: string;
  targetDate: string;
  completedDate?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  completionEvidence?: string;
}

export interface ChangeVerification {
  id: string;
  verifiedBy: string;
  verifiedDate: string;
  verificationMethod: string;
  criteria: string;
  findings: string;
  overallResult: 'pass' | 'fail' | 'conditional-pass';
  conditions?: string;
  followUpRequired: boolean;
}

/**
 * ChangeAlternative - Alternative option for change
 */
export interface ChangeAlternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedCost?: number;
  estimatedDuration?: number;
  selected: boolean;
}

/**
 * ChangeControlTimelineEntry - Timeline entry for change control history
 */
export interface ChangeControlTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: ChangeControlStatus;
  newStatus?: ChangeControlStatus;
}

/**
 * ProposedChangeDetail - Technical details of proposed change
 */
export interface ProposedChangeDetail {
  id: string;
  currentConfiguration: string;
  proposedConfiguration: string;
  technicalRationale: string;
  alternatives: ChangeAlternative[];
  selectedAlternative?: string;
}

/**
 * DepartmentImpact - Impact assessment for a department
 */
export interface DepartmentImpact {
  department: QMSDepartment;
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  description: string;
  resourceRequirements?: string;
  trainingRequired: boolean;
  assessedBy: string;
  assessedDate: string;
}

/**
 * FinancialImpact - Financial impact assessment
 */
export interface FinancialImpact {
  implementationCost: number;
  recurringCost: number;
  costSavings: number;
  paybackPeriod?: number;
  capitalRequired: boolean;
  budgetApprovalRequired: boolean;
  description: string;
}

/**
 * IdentifiedRisk - Risk identified during assessment
 */
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

/**
 * OperationalImpact - Operational impact assessment
 */
export interface OperationalImpact {
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  productionDowntime: number;
  implementationEffort: number;
  trainingEffort: number;
  description: string;
}

/**
 * QualityAttributeImpact - Impact on quality attributes
 */
export interface QualityAttributeImpact {
  attribute: string;
  specification: string;
  actualResult?: string;
  impacted: boolean;
  comments?: string;
}

/**
 * QualityImpact - Quality impact assessment
 */
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

/**
 * RegulatoryChangeAssessment - Regulatory assessment for change
 */
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

/**
 * RegulatorySubmissionRequirement - Submission requirement for regulatory
 */
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

/**
 * VerificationCriterion - Criterion for change verification
 */
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

/**
 * ControlledDocumentReference - Reference to controlled document
 */
export interface ControlledDocumentReference {
  documentId: string;
  documentNumber: string;
  title: string;
  currentVersion: string;
  changeRequired: boolean;
  changeDescription?: string;
  newVersion?: string;
}

// =============================================================================
// TRAINING INTERFACES
// =============================================================================

export interface TrainingCurriculum {
  id: string;
  curriculumCode: string;
  name: string;
  description: string;
  department: QMSDepartment;
  jobRoles: string[];
  courses: CurriculumCourse[];
  status: CurriculumStatus;
  effectiveDate: string;
  retiredDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumCourse {
  courseId: string;
  sequence: number;
  isRequired: boolean;
  prerequisiteCourseIds: string[];
}

export interface TrainingCourse {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  deliveryMethod: TrainingDeliveryMethod;
  duration: number;
  durationUnit: 'minutes' | 'hours' | 'days';
  passingScore?: number;
  validityPeriod?: number;
  validityUnit?: 'months' | 'years';
  materials: TrainingMaterial[];
  version: string;
  effectiveDate: string;
  retiredDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingMaterial {
  id: string;
  name: string;
  type: 'document' | 'video' | 'presentation' | 'quiz' | 'external-link';
  url?: string;
  documentId?: string;
}

export interface TrainingAssignment {
  id: string;
  userId: string;
  userName: string;
  curriculumId: string;
  curriculumName: string;
  courseId: string;
  courseName: string;
  status: TrainingAssignmentStatus;
  assignedDate: string;
  dueDate: string;
  startedDate?: string;
  completedDate?: string;
  score?: number;
  attempts: number;
  maxAttempts: number;
  completionType?: TrainingCompletionType;
  exemptionReason?: string;
  exemptionApprovedBy?: string;
  certificateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  userId: string;
  userName: string;
  department: QMSDepartment;
  jobRole: string;
  totalAssignments: number;
  completed: number;
  inProgress: number;
  overdue: number;
  compliancePercent: number;
  nextDueDate?: string;
}

export interface TrainingCertificate {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  courseId: string;
  courseName: string;
  completedDate: string;
  expirationDate?: string;
  score?: number;
  issuedAt: string;
  isValid: boolean;
}

/**
 * TrainingType - Types of training
 */
export type TrainingType = 
  | 'initial' | 'refresher' | 'annual' | 'job-specific'
  | 'regulatory' | 'gmp' | 'safety' | 'system' | 'sop-specific';

/**
 * CompletedTraining - Record of completed training
 */
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

/**
 * TrainingAttempt - Attempt at training/assessment
 */
export interface TrainingAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  score?: number;
  passed: boolean | null;
  timeSpent: number;
  assessmentResponses?: AssessmentResponse[];
}

/**
 * AssessmentResponse - Response to assessment question
 */
export interface AssessmentResponse {
  questionId: string;
  response: string | string[];
  isCorrect: boolean | null;
  pointsEarned: number;
}

/**
 * TrainingExpiration - Training expiration notification
 */
export interface TrainingExpiration {
  assignmentId: string;
  trainingTitle: string;
  expirationDate: string;
  daysUntilExpiration: number;
  renewalRequired: boolean;
}

/**
 * TrainingSession - Scheduled training session
 */
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

// =============================================================================
// AUDIT INTERFACES
// =============================================================================

export interface QMSAudit {
  id: string;
  auditNumber: string;
  title: string;
  auditType: AuditType;
  scope: AuditScope;
  status: AuditStatus;
  department?: QMSDepartment;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  leadAuditorId: string;
  leadAuditorName: string;
  auditTeam: AuditTeamMember[];
  auditees: AuditeeInfo[];
  objectives: string[];
  criteria: string[];
  plan?: AuditPlan;
  findings: AuditFinding[];
  report?: AuditReport;
  regulatoryFrameworks: QMSRegulatoryFramework[];
  previousAuditId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTeamMember {
  userId: string;
  userName: string;
  role: 'lead' | 'auditor' | 'observer' | 'technical-expert';
}

export interface AuditeeInfo {
  userId: string;
  userName: string;
  department: QMSDepartment;
  role: string;
}

export interface AuditPlan {
  id: string;
  auditId: string;
  version: string;
  approvedBy?: string;
  approvedDate?: string;
  schedule: AuditScheduleItem[];
  documentRequests: string[];
  logistics: string;
}

export interface AuditScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  location: string;
  auditorIds: string[];
  auditeeIds: string[];
}

export interface AuditFinding {
  id: string;
  auditId: string;
  findingNumber: string;
  classification: FindingClassification;
  status: FindingStatus;
  area: string;
  requirementReference: string;
  description: string;
  objectiveEvidence: string;
  auditeeResponse?: AuditeeResponse;
  linkedCAPAId?: string;
  linkedCAPANumber?: string;
  dueDate?: string;
  verificationResult?: 'verified-closed' | 'verified-open' | 'pending';
  verifiedBy?: string;
  verifiedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditeeResponse {
  response: string;
  respondedBy: string;
  respondedDate: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  targetDate?: string;
  evidence?: string;
}

export interface AuditReport {
  id: string;
  auditId: string;
  version: string;
  executiveSummary: string;
  scopeDescription: string;
  methodology: string;
  findingsSummary: FindingsSummary;
  conclusions: string;
  recommendations: string[];
  issuedBy?: string;
  issuedDate?: string;
  distributionList: string[];
}

export interface FindingsSummary {
  total: number;
  critical: number;
  major: number;
  minor: number;
  observations: number;
  opportunities: number;
}

// =============================================================================
// METRICS INTERFACES
// =============================================================================

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
  thresholdDirection: 'above' | 'below';
  frequency: MetricPeriod;
  dataSource: string;
  owner: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetricDataPoint {
  id: string;
  metricId: string;
  period: string;
  periodType: MetricPeriod;
  value: number;
  target: number;
  variance: number;
  variancePercent: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
  notes?: string;
  calculatedAt: string;
}

export interface QualityDashboard {
  asOfDate: string;
  period: string;
  periodType: MetricPeriod;
  overallScore: number;
  overallTrend: TrendDirection;
  metricsSummary: MetricsSummary;
  alerts: QualityAlert[];
  openItems: OpenItemsSummary;
  recentActivity: RecentActivity[];
}

export interface MetricsSummary {
  total: number;
  onTarget: number;
  warning: number;
  critical: number;
  notMeasured: number;
}

export interface QualityAlert {
  id: string;
  alertType: 'metric' | 'deadline' | 'escalation' | 'compliance';
  level: AlertLevel;
  title: string;
  description: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface OpenItemsSummary {
  openCAPAs: number;
  overdueCAPAs: number;
  openDeviations: number;
  overdueDeviations: number;
  openChangeControls: number;
  openAuditFindings: number;
  overdueTraining: number;
  documentsPendingReview: number;
}

export interface RecentActivity {
  id: string;
  activityType: string;
  description: string;
  referenceType: string;
  referenceId: string;
  referenceNumber: string;
  performedBy: string;
  performedAt: string;
}

// =============================================================================
// FILTER INTERFACE
// =============================================================================

export interface QMSFilters {
  departments?: QMSDepartment[];
  statuses?: string[];
  priorities?: QMSPriority[];
  severities?: QMSSeverity[];
  dateRange?: { start: string; end: string };
  assigneeId?: string;
  searchText?: string;
}

/**
 * AuditChecklist - Checklist template for audits
 */
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

/**
 * ChecklistSection - Section within audit checklist
 */
export interface ChecklistSection {
  id: string;
  sectionNumber: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

/**
 * ChecklistItem - Item within checklist section
 */
export interface ChecklistItem {
  id: string;
  itemNumber: string;
  requirement: string;
  guidanceText?: string;
  regulatoryReference?: string;
  isCritical: boolean;
  evidenceRequired: string[];
}

/**
 * ChecklistResponse - Response to checklist item
 */
export interface ChecklistResponse {
  itemId: string;
  status: 'conforming' | 'non-conforming' | 'not-applicable' | 'not-assessed';
  findingId?: string;
  evidence: string;
  notes?: string;
  assessedBy: string;
  assessedDate: string;
}

/**
 * Auditee - Person being audited
 */
export interface Auditee {
  id: string;
  userId: string;
  userName: string;
  department: QMSDepartment;
  role: string;
  contactInfo: string;
}

/**
 * AuditTimelineEntry - Timeline entry for audit history
 */
export interface AuditTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  previousStatus?: AuditStatus;
  newStatus?: AuditStatus;
}

/**
 * QMSAuditPlan - Audit plan details
 */
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

// =============================================================================
// MANAGEMENT REVIEW INTERFACES
// =============================================================================

/**
 * ManagementReview - Management review meeting record
 */
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

/**
 * ReviewAttendee - Attendee of management review
 */
export interface ReviewAttendee {
  id: string;
  userId: string;
  userName: string;
  role: string;
  department: QMSDepartment;
  attendance: 'present' | 'absent' | 'excused';
}

/**
 * ReviewAgendaItem - Agenda item for management review
 */
export interface ReviewAgendaItem {
  id: string;
  itemNumber: number;
  topic: string;
  presenter: string;
  duration: number;
  documentIds?: string[];
}

/**
 * ManagementReviewInput - Input to management review
 */
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

/**
 * ManagementReviewOutput - Output from management review
 */
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

/**
 * ReviewDecision - Decision made during management review
 */
export interface ReviewDecision {
  id: string;
  decisionNumber: number;
  topic: string;
  decision: string;
  rationale: string;
  votingResult?: string;
  effectiveDate?: string;
}

/**
 * ReviewActionItem - Action item from management review
 */
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

/**
 * QualityRecommendation - Quality improvement recommendation
 */
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

// =============================================================================
// DASHBOARD & METRICS INTERFACES
// =============================================================================

/**
 * CategoryMetrics - Metrics grouped by category
 */
export interface CategoryMetrics {
  category: MetricCategory;
  metrics: MetricSummary[];
  overallStatus: 'green' | 'yellow' | 'red';
  trendDirection: TrendDirection;
}

/**
 * MetricSummary - Summary of a metric
 */
export interface MetricSummary {
  metricId: string;
  metricCode: string;
  name: string;
  currentValue: number;
  target: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
}

/**
 * SummaryMetric - Summary metric for dashboard
 */
export interface SummaryMetric {
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'on-target' | 'warning' | 'critical';
  trend: TrendDirection;
  changeFromPrevious: number;
}

/**
 * ChartDataPoint - Data point for charts
 */
export interface ChartDataPoint {
  period: string;
  value: number;
  target: number;
}

/**
 * TrendChartData - Data for trend charts
 */
export interface TrendChartData {
  metricId: string;
  metricName: string;
  dataPoints: ChartDataPoint[];
  targetLine: number;
  warningLine: number;
  criticalLine: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DOCUMENT_TYPE_LABELS: Record<QMSDocumentType, string> = {
  'sop': 'Standard Operating Procedure',
  'work-instruction': 'Work Instruction',
  'form': 'Form',
  'template': 'Template',
  'policy': 'Policy',
  'specification': 'Specification',
  'protocol': 'Protocol',
  'report': 'Report',
  'record': 'Record',
  'manual': 'Manual',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  'draft': 'Draft',
  'pending-review': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'effective': 'Effective',
  'superseded': 'Superseded',
  'retired': 'Retired',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'pending-review': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-blue-100 text-blue-800',
  'rejected': 'bg-red-100 text-red-800',
  'effective': 'bg-green-100 text-green-800',
  'superseded': 'bg-orange-100 text-orange-800',
  'retired': 'bg-gray-200 text-gray-600',
};

export const CAPA_STATUS_LABELS: Record<CAPAStatus, string> = {
  'draft': 'Draft',
  'pending-approval': 'Pending Approval',
  'approved': 'Approved',
  'investigation': 'Investigation',
  'action-planning': 'Action Planning',
  'implementation': 'Implementation',
  'effectiveness-check': 'Effectiveness Check',
  'closed': 'Closed',
  'closed-ineffective': 'Closed - Ineffective',
  'cancelled': 'Cancelled',
};

export const CAPA_STATUS_COLORS: Record<CAPAStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'pending-approval': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-blue-100 text-blue-800',
  'investigation': 'bg-purple-100 text-purple-800',
  'action-planning': 'bg-indigo-100 text-indigo-800',
  'implementation': 'bg-cyan-100 text-cyan-800',
  'effectiveness-check': 'bg-orange-100 text-orange-800',
  'closed': 'bg-green-100 text-green-800',
  'closed-ineffective': 'bg-red-100 text-red-800',
  'cancelled': 'bg-gray-200 text-gray-600',
};

export const DEVIATION_STATUS_LABELS: Record<DeviationStatus, string> = {
  'draft': 'Draft',
  'pending-classification': 'Pending Classification',
  'classified': 'Classified',
  'investigation': 'Investigation',
  'impact-assessment': 'Impact Assessment',
  'disposition': 'Disposition',
  'closed': 'Closed',
  'cancelled': 'Cancelled',
};

export const DEVIATION_STATUS_COLORS: Record<DeviationStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'pending-classification': 'bg-yellow-100 text-yellow-800',
  'classified': 'bg-blue-100 text-blue-800',
  'investigation': 'bg-purple-100 text-purple-800',
  'impact-assessment': 'bg-orange-100 text-orange-800',
  'disposition': 'bg-cyan-100 text-cyan-800',
  'closed': 'bg-green-100 text-green-800',
  'cancelled': 'bg-gray-200 text-gray-600',
};

export const SEVERITY_LABELS: Record<QMSSeverity, string> = {
  'critical': 'Critical',
  'major': 'Major',
  'minor': 'Minor',
};

export const SEVERITY_COLORS: Record<QMSSeverity, string> = {
  'critical': 'bg-red-100 text-red-800',
  'major': 'bg-orange-100 text-orange-800',
  'minor': 'bg-yellow-100 text-yellow-800',
};

export const PRIORITY_LABELS: Record<QMSPriority, string> = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

export const PRIORITY_COLORS: Record<QMSPriority, string> = {
  'critical': 'bg-red-100 text-red-800',
  'high': 'bg-orange-100 text-orange-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-gray-100 text-gray-800',
};

export const DEPARTMENT_LABELS: Record<QMSDepartment, string> = {
  'regulatory-affairs': 'Regulatory Affairs',
  'clinical-operations': 'Clinical Operations',
  'quality-assurance': 'Quality Assurance',
  'quality-control': 'Quality Control',
  'manufacturing': 'Manufacturing',
  'r-and-d': 'R&D',
  'medical-affairs': 'Medical Affairs',
  'pharmacovigilance': 'Pharmacovigilance',
  'data-management': 'Data Management',
  'biostatistics': 'Biostatistics',
  'supply-chain': 'Supply Chain',
  'facilities': 'Facilities',
  'it': 'IT',
  'hr': 'Human Resources',
  'finance': 'Finance',
  'executive': 'Executive',
};

export const TRAINING_STATUS_LABELS: Record<TrainingAssignmentStatus, string> = {
  'assigned': 'Assigned',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'overdue': 'Overdue',
  'failed': 'Failed',
  'exempted': 'Exempted',
  'expired': 'Expired',
};

export const TRAINING_STATUS_COLORS: Record<TrainingAssignmentStatus, string> = {
  'assigned': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-green-100 text-green-800',
  'overdue': 'bg-red-100 text-red-800',
  'failed': 'bg-red-200 text-red-900',
  'exempted': 'bg-gray-100 text-gray-800',
  'expired': 'bg-orange-100 text-orange-800',
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  'scheduled': 'Scheduled',
  'planning': 'Planning',
  'in-progress': 'In Progress',
  'reporting': 'Reporting',
  'follow-up': 'Follow-Up',
  'closed': 'Closed',
  'cancelled': 'Cancelled',
};

export const FINDING_CLASSIFICATION_LABELS: Record<FindingClassification, string> = {
  'observation': 'Observation',
  'minor': 'Minor Finding',
  'major': 'Major Finding',
  'critical': 'Critical Finding',
  'opportunity-for-improvement': 'Opportunity for Improvement',
  'noteworthy-practice': 'Noteworthy Practice',
};

export const FINDING_CLASSIFICATION_COLORS: Record<FindingClassification, string> = {
  'observation': 'bg-blue-100 text-blue-800',
  'minor': 'bg-yellow-100 text-yellow-800',
  'major': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800',
  'opportunity-for-improvement': 'bg-cyan-100 text-cyan-800',
  'noteworthy-practice': 'bg-green-100 text-green-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isApprovalStatus(value: string): value is ApprovalStatus {
  return ['draft', 'pending-review', 'approved', 'rejected', 
          'effective', 'superseded', 'retired'].includes(value);
}

export function isCAPAStatus(value: string): value is CAPAStatus {
  return ['draft', 'pending-approval', 'approved', 'investigation', 
          'action-planning', 'implementation', 'effectiveness-check',
          'closed', 'closed-ineffective', 'cancelled'].includes(value);
}

export function isDeviationStatus(value: string): value is DeviationStatus {
  return ['draft', 'pending-classification', 'classified', 'investigation',
          'impact-assessment', 'disposition', 'closed', 'cancelled'].includes(value);
}

export function isQMSSeverity(value: string): value is QMSSeverity {
  return ['critical', 'major', 'minor'].includes(value);
}

export function isQMSPriority(value: string): value is QMSPriority {
  return ['critical', 'high', 'medium', 'low'].includes(value);
}

export function isTrainingStatus(value: string): value is TrainingAssignmentStatus {
  return ['assigned', 'in-progress', 'completed', 'overdue', 
          'failed', 'exempted', 'expired'].includes(value);
}

export function isAuditStatus(value: string): value is AuditStatus {
  return ['scheduled', 'planning', 'in-progress', 'reporting', 
          'follow-up', 'closed', 'cancelled'].includes(value);
}

export function isFindingClassification(value: string): value is FindingClassification {
  return ['observation', 'minor', 'major', 'critical',
          'opportunity-for-improvement', 'noteworthy-practice'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isDocumentEffective(doc: ControlledDocument): boolean {
  return doc.status === 'effective';
}

export function isDocumentExpiringSoon(doc: ControlledDocument, daysThreshold: number = 30): boolean {
  if (!doc.periodicReviewDate) return false;
  const reviewDate = new Date(doc.periodicReviewDate);
  const now = new Date();
  const diffDays = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
}

export function isCAPAOpen(capa: CAPA): boolean {
  return !['closed', 'closed-ineffective', 'cancelled'].includes(capa.status);
}

export function isCAPAOverdue(capa: CAPA): boolean {
  if (!isCAPAOpen(capa)) return false;
  return new Date(capa.targetCompletionDate) < new Date();
}

export function isDeviationOpen(deviation: Deviation): boolean {
  return !['closed', 'cancelled'].includes(deviation.status);
}

export function isDeviationOverdue(deviation: Deviation): boolean {
  if (!isDeviationOpen(deviation)) return false;
  return new Date(deviation.targetCloseDate) < new Date();
}

export function isTrainingOverdue(assignment: TrainingAssignment): boolean {
  if (assignment.status === 'completed' || assignment.status === 'exempted') return false;
  return new Date(assignment.dueDate) < new Date();
}

export function calculateTrainingCompliance(records: TrainingRecord[]): number {
  if (records.length === 0) return 0;
  const totalCompliance = records.reduce((sum, r) => sum + r.compliancePercent, 0);
  return Math.round(totalCompliance / records.length);
}

export function calculateCAPAMetrics(capas: CAPA[]): {
  total: number;
  open: number;
  overdue: number;
  avgAge: number;
} {
  const open = capas.filter(c => isCAPAOpen(c));
  const overdue = open.filter(c => isCAPAOverdue(c));
  const ages = open.map(c => {
    const initDate = new Date(c.createdAt);
    return Math.floor((Date.now() - initDate.getTime()) / (1000 * 60 * 60 * 24));
  });
  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  
  return {
    total: capas.length,
    open: open.length,
    overdue: overdue.length,
    avgAge: Math.round(avgAge),
  };
}

export function calculateDeviationMetrics(deviations: Deviation[]): {
  total: number;
  open: number;
  overdue: number;
  bySeverity: Record<QMSSeverity, number>;
} {
  const open = deviations.filter(d => isDeviationOpen(d));
  const overdue = open.filter(d => isDeviationOverdue(d));
  
  return {
    total: deviations.length,
    open: open.length,
    overdue: overdue.length,
    bySeverity: {
      critical: deviations.filter(d => d.severity === 'critical').length,
      major: deviations.filter(d => d.severity === 'major').length,
      minor: deviations.filter(d => d.severity === 'minor').length,
    },
  };
}

export function getNextDocumentVersion(
  currentVersion: string, 
  changeType: 'major' | 'minor'
): string {
  const [major, minor] = currentVersion.split('.').map(Number);
  if (changeType === 'major') {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

export function calculateRiskPriorityNumber(
  probability: number, 
  severity: number, 
  detectability: number
): number {
  return probability * severity * detectability;
}

export function getRiskLevelFromRPN(rpn: number): RiskLevel {
  if (rpn >= 125) return 'high';
  if (rpn >= 50) return 'medium';
  return 'low';
}

export function formatDocumentNumber(
  prefix: string, 
  sequenceNumber: number, 
  padLength: number = 4
): string {
  return `${prefix}-${sequenceNumber.toString().padStart(padLength, '0')}`;
}
