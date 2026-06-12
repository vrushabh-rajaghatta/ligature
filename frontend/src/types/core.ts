
// Core domain types for Ligature

export interface Product {
  id: string;
  name: string;
  brandName?: string;
  genericName?: string;
  therapeuticArea: TherapeuticArea;
  modality: Modality;
  stage: Stage;
  indication: string;
}

export type TherapeuticArea = 
  | 'Oncology' 
  | 'Immunology' 
  | 'Neurology' 
  | 'Cardiology' 
  | 'Rare Disease'
  | 'Infectious Disease';

export type Modality = 
  | 'Small Molecule' 
  | 'Monoclonal Antibody'
  | 'Bispecific Antibody'
  | 'Cell Therapy' 
  | 'Gene Therapy' 
  | 'ADC'
  | 'Enzyme Replacement'
  | 'mRNA Therapy';

export type Stage = 
  | 'Discovery' 
  | 'Preclinical'
  | 'IND-Enabling'
  | 'Phase 1' 
  | 'Phase 1/2'
  | 'Phase 2' 
  | 'Phase 3' 
  | 'Filed'
  | 'NDA Filed'
  | 'BLA Filed'
  | 'sNDA Filed'
  | 'Approved'
  | 'Post-Marketing';

export type Region = 
  | 'US' 
  | 'EU' 
  | 'Japan' 
  | 'China' 
  | 'Canada' 
  | 'Australia' 
  | 'Brazil' 
  | 'UK'
  | 'APAC'
  | 'LATAM';

// Study / Clinical Development
export interface Study {
  id: string;
  productId: string;
  name: string;
  phase: 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 3' | 'Phase 4';
  indication: string;
  status: 'Planning' | 'Enrolling' | 'Active' | 'Completed' | 'On Hold';
  enrolledSubjects: number;
  targetEnrollment: number;
  activeSites: number;
  tmfCompleteness: number;
  startDate: string;
  estimatedCompletion: string;
}

// Submissions
export interface Submission {
  id: string;
  productId: string;
  type: SubmissionType;
  region: Region;
  agency: string;
  status: SubmissionStatus;
  targetDate: string;
  daysUntilTarget: number;
  modulesComplete: number;
  modulesTotal: number;
  qcStatus: 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
  ectdStatus: 'Pending' | 'Valid' | 'Invalid';
  sequence?: number;
}

export type SubmissionType = 
  | 'NDA' 
  | 'BLA' 
  | 'MAA' 
  | 'J-NDA' 
  | 'IND' 
  | 'CTA'
  | 'sNDA'
  | 'sBLA'
  | 'Type II Variation';

export type SubmissionStatus = 
  | 'Draft' 
  | 'In Progress' 
  | 'QC Review' 
  | 'Ready' 
  | 'Submitted' 
  | 'Under Review' 
  | 'Approved' 
  | 'CRL';

// Registrations / Lifecycle
export interface Registration {
  id: string;
  productId: string;
  country: string;
  region: Region;
  status: 'Active' | 'Pending' | 'Expired' | 'Withdrawn';
  approvalDate?: string;
  launchDate?: string;          // v0.33.0: Commercial launch date
  expiryDate?: string;
  renewalDueDate?: string;
  licenseNumber?: string;
}

// v0.33.0: Regulatory Commitments (PMC/PMR)
export type CommitmentType = 'PMC' | 'PMR' | 'RMP-Measure' | 'Condition' | 'Other';
export type CommitmentStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Fulfilled' | 'Released' | 'Overdue';

export interface RegulatoryCommitment {
  id: string;
  productId: string;
  submissionId?: string;      // Triggering submission
  region: Region;
  agency: string;
  type: CommitmentType;
  title: string;
  description: string;
  category?: 'Clinical' | 'CMC' | 'Nonclinical' | 'Safety' | 'Labeling' | 'REMS';
  dueDate: string;
  originalDueDate?: string;
  status: CommitmentStatus;
  responsibleParty?: string;
  linkedStudyId?: string;
  fulfillmentDate?: string;
  notes?: string;
}

// v0.33.0: Portfolio-level submission planning
export interface PortfolioMilestone {
  id: string;
  productId: string;
  submissionId?: string;
  title: string;
  type: 'submission' | 'approval' | 'launch' | 'commitment' | 'review-meeting' | 'other';
  date: string;
  status: 'planned' | 'on-track' | 'at-risk' | 'delayed' | 'complete';
  region?: Region;
  dependencies?: string[];    // IDs of milestones this depends on
  notes?: string;
}

// HAQ (Health Authority Questions)
export interface HAQ {
  id: string;
  submissionId: string;
  productId: string;
  agency: string;
  receivedDate: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Draft Response' | 'Submitted' | 'Closed';
  category: 'Clinical' | 'CMC' | 'Nonclinical' | 'Administrative' | 'Labeling' | 'Safety' | 'Clinical Pharmacology';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  questionCount: number;
  assignee?: string;
}

// Documents / Authoring
export interface Document {
  id: string;
  productId: string;
  title: string;
  moduleSection: string;
  version: string;
  status: 'Draft' | 'In Review' | 'Approved' | 'Effective';
  lastModified: string;
  author: string;
  wordCount?: number;
}

// Alerts
export interface Alert {
  id: string;
  type: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  entityType: 'submission' | 'study' | 'registration' | 'haq' | 'document';
  entityId: string;
  createdAt: string;
}

// Filter state
export interface FilterState {
  products: string[];
  therapeuticAreas: TherapeuticArea[];
  modalities: Modality[];
  regions: Region[];
  stages: Stage[];
}

// Navigation
export type ModuleId = 
  // Platform / Home
  | 'home'                  // R&D Command Center — entry experience
  | 'action-center'         // Unified task inbox
  | 'activity'
  
  // Research (v0.40.4: Restored as first nav section)
  | 'research'              // Research Overview
  | 'research-lead-opt'     // Lead Optimization
  | 'research-translational'// Translational Science
  | 'research-targets'      // Target Programs
  | 'research-preclinical'  // Preclinical/Nonclinical
  | 'research-ind'          // IND Readiness
  | 'research-literature'   // Literature Monitoring
  | 'research-intelligence' // Competitive Intelligence
  | 'eln'                   // Electronic Lab Notebook
  
  // Clinical Development (v0.40.4: Renamed from Development)
  | 'portfolio'
  | 'study-design'          // USDM protocol builder
  | 'ctms'                  // Clinical Trials
  | 'biostats'              // Biostatistics - SAP, ADAM, TLF (v0.39.3)
  | 'study-startup'         // Study Startup Orchestrator (v0.37.0)
  | 'tmf'                   // Trial Master File
  | 'study-intel'           // Study Intelligence
  
  // PV/Safety (v0.40.4: Renamed from Preclinical & Safety)
  | 'safety'                // Pharmacovigilance
  | 'signal-detection'      // Signal Detection (new)
  | 'psmf'                  // PSMF
  
  // CMC
  | 'cmc'                   // Chemistry & Manufacturing
  | 'cmc-manufacturing'     // Legacy alias
  | 'stability'             // Stability studies (new)
  | 'batch-records'         // Batch records (new)
  
  // Regulatory
  | 'authoring'
  | 'document-control'
  | 'submission-command'     // Publisher Command Center (v0.38.4)
  | 'submissions-hub'
  | 'submission-planning'   // Global/Local Submission Plan (v0.61.0)
  | 'template-registry'     // Template Registry + Holiday Calendars (v0.63.0)
  | 'publishing'
  | 'haq'
  | 'labeling'
  | 'spl'                   // Structured Product Labeling (v0.42.43)
  | 'strategy'
  | 'reg-calendar'
  | 'master-data'           // Includes IDMP
  | 'continuous-submission'
  | 'ectd-intelligence'     // Document-to-Data extraction
  | 'reg-intel'             // v0.59.0: LIG-030 Regulatory Intelligence
  
  // Quality
  | 'qms'
  | 'glp'                   // GLP Compliance
  | 'gcp'                   // GCP Compliance
  | 'gmp'                   // GMP Compliance
  | 'inspector-readiness'
  | 'archives'              // R&D Archives
  
  // Commercial
  | 'commercial'            // Launch & Market Access
  | 'adpromo'               // Ad/Promo Review
  | 'supply-chain'
  | 'medical-affairs'

  // BD / Business Development — Ligature Transact (v0.125.81)
  | 'bd'                    // BD Overview — Ligature Transact hub
  | 'bd-due-diligence'      // Asset Due Diligence Agent
  | 'bd-data-room'          // Virtual Data Room manager
  
  // Intelligence (AI)
  | 'ai-authoring'          // AI Authoring (renamed from ai-generation)
  | 'ai-generation'         // Legacy alias
  | 'ai-consistency'        // Consistency Engine
  | 'analytics'
  
  // Administration
  | 'admin'
  
  // Legacy / Redirects
  | 'development'           // Legacy - use portfolio
  | 'nonclinical'           // Legacy - use research-preclinical
  | 'sample-management'     // Legacy
  | 'quality'               // Legacy
  | 'submissions'           // Legacy
  | 'registrations'         // Legacy
  | 'commitments'           // Legacy
  | 'portfolio-strategy'    // Legacy
  | 'ectd-workspace'        // Legacy
  | 'ectd-publishing'       // Legacy
  | 'publishing-center'     // Legacy
  | 'publications'          // Legacy
  | 'manufacturing'         // Legacy
  | 'idmp'                  // Legacy - now part of master-data
  | 'rd-connected'          // R&D Connected — investor demo pipeline orchestrator
  | 'agent-hub';            // Agent Hub — multi-agent operations dashboard

// Module Group for mega-menu navigation
export type ModuleGroup = 
  | 'development'
  | 'safety'
  | 'cmc'
  | 'regulatory'
  | 'quality'
  | 'commercial'
  | 'intelligence';

export interface ModuleGroupConfig {
  id: ModuleGroup;
  label: string;
  color: string;
  modules: ModuleId[];
}

// GxP Inspector Checklist Types
export type GxPDomain = 'GMP' | 'GLP' | 'GCP' | 'GVP' | 'GxP';

export type InspectorCheckCategory = 
  | 'system-identification'
  | 'risk-assessment'
  | 'roles-responsibilities'
  | 'procedures'
  | 'training'
  | 'deviations-capa'
  | 'validation'
  | 'requirements'
  | 'spreadsheets'
  | 'data-lifecycle'
  | 'audit-trails'
  | 'time-attribution'
  | 'access-management'
  | 'privileged-accounts'
  | 'segregation-of-duties'
  | 'electronic-records'
  | 'e-signatures'
  | 'change-control'
  | 'configuration'
  | 'periodic-review'
  | 'supplier-qualification'
  | 'sdlc'
  | 'incident-management'
  | 'backup-restore'
  | 'data-retention'
  | 'interfaces';

export interface InspectorCheckItem {
  id: string;
  category: InspectorCheckCategory;
  domain: GxPDomain[];
  question: string;
  lookFor: string[];
  regulatoryRefs: string[];
  status: 'not-assessed' | 'compliant' | 'gap' | 'partial' | 'na';
  evidence?: string[];
  gaps?: string[];
  capaIds?: string[];
  lastAssessed?: string;
  assessedBy?: string;
  notes?: string;
}

export interface InspectorReadinessScore {
  domain: GxPDomain;
  totalItems: number;
  compliant: number;
  gaps: number;
  partial: number;
  notAssessed: number;
  score: number; // percentage
}

// Document Tree Types (for hierarchical navigation)
export interface DocumentTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'document' | 'version';
  parentId: string | null;
  path: string; // e.g., "product-1/ind-123456/m2/2.5"
  children?: DocumentTreeNode[];
  metadata?: {
    productId?: string;
    submissionId?: string;
    module?: string;
    section?: string;
    version?: string;
    status?: string;
    documentId?: string;
    fileType?: string;
    fileSize?: number;
    lastModified?: string;
  };
  expanded?: boolean;
}

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  count?: number;
  color?: string;
}

// v0.13.45: Approval workflow types (Phase 2.3e.1)
