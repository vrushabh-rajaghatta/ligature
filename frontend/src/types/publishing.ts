
// eCTD Publishing Module Types

export type ECTDVersionType = '3.2.2' | '4.0';
export type SubmissionStatus = 'draft' | 'assembling' | 'validating' | 'validated' | 'ready' | 'submitted' | 'acknowledged' | 'accepted' | 'rejected';
export type ValidationSeverity = 'error' | 'warning' | 'info';
export type GatewayStatus = 'pending' | 'uploading' | 'processing' | 'accepted' | 'rejected' | 'acknowledged';

// Publishing project - a submission being assembled
export interface PublishingProject {
  id: string;
  applicationId: string;
  applicationNumber: string;
  productId: string;
  productName: string;
  
  // Submission details
  sequenceNumber: string;
  submissionType: SubmissionType;
  submissionSubType?: string;
  description: string;
  
  // Configuration
  ectdVersion: ECTDVersionType;
  region: 'US' | 'EU' | 'Japan' | 'Canada' | 'China';
  agency: string;
  
  // Status
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  targetDate?: string;
  submittedDate?: string;
  
  // Content
  modules: PublishingModule[];
  documents: PublishingDocument[];
  
  // Validation
  lastValidation?: ValidationResult;
  validationHistory: ValidationResult[];
  
  // Gateway
  gatewaySubmission?: GatewaySubmission;
  
  // Team
  createdBy: string;
  assignedTo?: string[];
  reviewers?: string[];
}

export type SubmissionType = 
  | 'original' 
  | 'amendment' 
  | 'supplement' 
  | 'annual-report' 
  | 'ir-response' 
  | 'safety-report'
  | 'labeling'
  | 'cbe-0'
  | 'cbe-30'
  | 'prior-approval';

export interface PublishingModule {
  number: string; // '1', '2', '3', '4', '5'
  title: string;
  sections: PublishingSection[];
  documentCount: number;
  status: 'empty' | 'partial' | 'complete';
}

export interface PublishingSection {
  id: string;
  number: string; // '1.1', '2.3', '3.2.S.1', etc.
  title: string;
  documents: PublishingDocument[];
  required: boolean;
  status: 'empty' | 'draft' | 'ready';
  leaf?: ECTDLeaf; // For v4.0
}

export interface PublishingDocument {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  
  // CTD placement
  moduleNumber: string;
  sectionNumber: string;
  
  // Document attributes
  documentType: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  lifecycleStatus?: 'current' | 'superseded';
  
  // PDF compliance
  pdfVersion?: string;
  isPdfA?: boolean;
  hasBookmarks?: boolean;
  hasHyperlinks?: boolean;
  pageCount?: number;
  
  // Validation status
  validationStatus: 'pending' | 'valid' | 'invalid' | 'warning';
  validationIssues?: ValidationIssue[];
  
  // Metadata
  addedAt: string;
  addedBy: string;
}

export interface ECTDLeaf {
  id: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  title: string;
  xlink?: string;
  checksum?: string;
  checksumType?: string;
  modifiedFile?: string;
}

// Validation
export interface ValidationResult {
  id: string;
  projectId: string;
  timestamp: string;
  ectdVersion: ECTDVersionType;
  
  // Results
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  
  issues: ValidationIssue[];
  
  // Validation types performed
  technicalValidation: boolean;
  businessValidation: boolean;
  pdfValidation: boolean;
  checksumValidation: boolean;
  
  duration: number; // seconds
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  code: string;
  message: string;
  details?: string;
  
  // Location
  documentId?: string;
  documentPath?: string;
  sectionNumber?: string;
  
  // Resolution
  autoFixable: boolean;
  autoFixAction?: string;
  manualFixGuidance?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export type ValidationCategory = 
  | 'structure'      // XML structure, folder hierarchy
  | 'naming'         // File naming conventions
  | 'pdf'            // PDF/A compliance, bookmarks, hyperlinks
  | 'checksum'       // File integrity
  | 'business'       // Required documents, completeness
  | 'cross-reference'// Internal links, citations
  | 'metadata'       // Document attributes
  | 'regional';      // Region-specific requirements

// Gateway submission
export interface GatewaySubmission {
  id: string;
  projectId: string;
  gateway: GatewayType;
  
  // Submission details
  submissionId?: string; // Gateway-assigned ID
  trackingNumber?: string;
  
  // Status
  status: GatewayStatus;
  statusHistory: GatewayStatusEvent[];
  
  // Dates
  submittedAt?: string;
  acknowledgedAt?: string;
  
  // Response
  acknowledgmentId?: string;
  acknowledgmentDocument?: string;
  rejectionReason?: string;
}

export type GatewayType = 'ESG' | 'CESP' | 'PMDA-Gateway' | 'Common-European' | 'Direct';

export interface GatewayStatusEvent {
  status: GatewayStatus;
  timestamp: string;
  message?: string;
}

// eCTD XML Backbone structures
export interface ECTDBackbone {
  version: ECTDVersionType;
  dtdVersion: string;
  
  // Submission info
  submissionDescription: string;
  sequenceNumber: string;
  submissionType: string;
  
  // Application info
  applicationNumber: string;
  applicationType: string;
  
  // Content
  modules: ECTDXMLModule[];
}

export interface ECTDXMLModule {
  number: string;
  title: string;
  sections: ECTDXMLSection[];
}

export interface ECTDXMLSection {
  number: string;
  title: string;
  documents: ECTDXMLDocument[];
  subsections?: ECTDXMLSection[];
}

export interface ECTDXMLDocument {
  id: string;
  title: string;
  xlink: string;
  operation: string;
  checksum: string;
  checksumType: string;
}

// Publishing workflow
export interface PublishingWorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  order: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export const PUBLISHING_WORKFLOW_STEPS: PublishingWorkflowStep[] = [
  { id: 'assemble', name: 'Assemble Documents', status: 'pending', order: 1 },
  { id: 'generate-checksums', name: 'Generate Checksums', status: 'pending', order: 2 },
  { id: 'validate-pdf', name: 'Validate PDFs', status: 'pending', order: 3 },
  { id: 'validate-structure', name: 'Validate Structure', status: 'pending', order: 4 },
  { id: 'generate-backbone', name: 'Generate XML Backbone', status: 'pending', order: 5 },
  { id: 'validate-backbone', name: 'Validate Backbone', status: 'pending', order: 6 },
  { id: 'package', name: 'Create Submission Package', status: 'pending', order: 7 },
  { id: 'final-qc', name: 'Final QC Review', status: 'pending', order: 8 },
];
