// IND Readiness Tracker Data with DIA EDM Reference Model Integration
// Based on DIA EDM Reference Model v1.3 - Industry Standard Document Taxonomy

import { products } from './mock';

// ============================================================================
// EDM TAXONOMY REFERENCE (DIA EDM Reference Model v1.3)
// ============================================================================

export interface EDMArtifact {
  id: string;
  domain: EDMDomain;
  group: string;
  subGroup: string;
  artifactName: string;
  ctdSection?: string;
  region?: 'US' | 'EU' | 'General';
  required: 'M' | 'R' | 'E' | 'O'; // Mandatory, Recommended, Extension, Optional
}

export type EDMDomain = 'Regulatory/Admin' | 'Labeling' | 'Quality' | 'Non-Clinical' | 'Clinical';

// CTD Module mapping
export interface CTDModule {
  id: string;
  number: string;
  name: string;
  edmDomain: EDMDomain;
  sections: CTDSection[];
}

export interface CTDSection {
  id: string;
  number: string;
  name: string;
  edmArtifacts: string[]; // References to EDM artifact IDs
  required: boolean;
  documents: INDDocument[];
}

export interface INDDocument {
  id: string;
  title: string;
  sectionId: string;
  status: 'not-started' | 'draft' | 'in-review' | 'approved' | 'final';
  version: string;
  owner: string;
  dueDate: string;
  completionPercent: number;
  lastModified: string;
  edmArtifactType?: string;
  flags: DocumentFlag[];
}

export interface DocumentFlag {
  type: 'missing-data' | 'qc-issue' | 'dependency' | 'overdue' | 'blocked';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// IND READINESS TYPES
// ============================================================================

export type INDReadinessView = 'overview' | 'module-grid' | 'critical-path' | 'gap-analysis' | 'documents';

export interface INDSubmission {
  id: string;
  productId: string;
  applicationNumber: string;
  submissionType: 'IND' | 'NDA' | 'BLA' | 'CTA' | 'MAA';
  targetDate: string;
  projectedDate: string;
  overallReadiness: number;
  status: 'on-track' | 'at-risk' | 'delayed' | 'blocked';
  modules: ModuleReadiness[];
  milestones: Milestone[];
  criticalPath: CriticalPathItem[];
  gaps: GapItem[];
  riskFactors: RiskFactor[];
}

export interface ModuleReadiness {
  moduleId: string;
  moduleNumber: string;
  moduleName: string;
  completionPercent: number;
  documentsTotal: number;
  documentsComplete: number;
  documentsDraft: number;
  documentsNotStarted: number;
  status: 'complete' | 'on-track' | 'at-risk' | 'blocked' | 'not-started';
  owner: string;
  dueDate: string;
  sections: SectionReadiness[];
  dependencies: string[];
  blockers: string[];
}

export interface SectionReadiness {
  sectionId: string;
  sectionNumber: string;
  sectionName: string;
  completionPercent: number;
  documentsTotal: number;
  documentsComplete: number;
  status: 'complete' | 'on-track' | 'at-risk' | 'blocked' | 'not-started';
  owner: string;
  dueDate: string;
  requiredByEDM: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  type: 'internal' | 'regulatory' | 'clinical';
  targetDate: string;
  status: 'completed' | 'on-track' | 'at-risk' | 'missed';
  completedDate?: string;
  dependencies: string[];
  description: string;
}

export interface CriticalPathItem {
  id: string;
  task: string;
  module: string;
  startDate: string;
  endDate: string;
  duration: number; // days
  dependencies: string[];
  status: 'completed' | 'in-progress' | 'not-started' | 'blocked';
  owner: string;
  isBlocking: boolean;
  slack: number; // days of slack
}

export interface GapItem {
  id: string;
  module: string;
  section: string;
  category: 'document' | 'data' | 'study' | 'process';
  description: string;
  severity: 'critical' | 'major' | 'minor';
  fdaRequirement: string;
  edmReference: string;
  recommendation: string;
  estimatedEffort: string;
  owner?: string;
  dueDate?: string;
  status: 'open' | 'in-progress' | 'resolved';
}

export interface RiskFactor {
  id: string;
  category: 'timeline' | 'quality' | 'dependency' | 'resource' | 'regulatory';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
  owner: string;
  status: 'active' | 'mitigated' | 'resolved';
}

// ============================================================================
// EDM ARTIFACT DEFINITIONS (Subset for IND)
// ============================================================================

export const edmArtifacts: EDMArtifact[] = [
  // Module 1 - Administrative
  { id: 'edm-m1-001', domain: 'Regulatory/Admin', group: 'Administrative Information', subGroup: 'Cover Letter', artifactName: 'Cover Letter', ctdSection: '1.1', region: 'General', required: 'M' },
  { id: 'edm-m1-002', domain: 'Regulatory/Admin', group: 'Administrative Information', subGroup: 'Table of Contents', artifactName: 'Table of Contents', ctdSection: '1.2', region: 'General', required: 'M' },
  { id: 'edm-m1-003', domain: 'Regulatory/Admin', group: 'Applicant Information', subGroup: 'Application Form', artifactName: 'FDA Form 1571', ctdSection: '1.1', region: 'US', required: 'M' },
  { id: 'edm-m1-004', domain: 'Regulatory/Admin', group: 'Applicant Information', subGroup: 'Application Form', artifactName: 'FDA Form 356h', ctdSection: '1.1', region: 'US', required: 'M' },
  { id: 'edm-m1-005', domain: 'Regulatory/Admin', group: 'Administrative Information', subGroup: 'References', artifactName: 'Letter of Authorization', ctdSection: '1.4', region: 'General', required: 'O' },
  { id: 'edm-m1-006', domain: 'Regulatory/Admin', group: 'Administrative Information', subGroup: 'Regulatory Correspondence', artifactName: 'Regulatory Correspondence', ctdSection: '1.12', region: 'General', required: 'O' },
  
  // Module 2 - Summaries
  { id: 'edm-m2-001', domain: 'Quality', group: 'Quality Overall Summary', subGroup: 'Drug Substance', artifactName: 'Quality Overall Summary', ctdSection: '2.3', region: 'General', required: 'M' },
  { id: 'edm-m2-002', domain: 'Non-Clinical', group: 'Summary documents', subGroup: 'Non-clinical Summaries', artifactName: 'Nonclinical Overview', ctdSection: '2.4', region: 'General', required: 'M' },
  { id: 'edm-m2-003', domain: 'Clinical', group: 'Summaries', subGroup: 'Overview', artifactName: 'Clinical Overview', ctdSection: '2.5', region: 'General', required: 'M' },
  { id: 'edm-m2-004', domain: 'Non-Clinical', group: 'Summary documents', subGroup: 'Non-clinical Summaries', artifactName: 'Nonclinical Summary', ctdSection: '2.6', region: 'General', required: 'M' },
  { id: 'edm-m2-005', domain: 'Clinical', group: 'Summaries', subGroup: 'Clinical Pharmacology Studies', artifactName: 'Summary of Clinical Pharmacology Studies', ctdSection: '2.7.1', region: 'General', required: 'M' },
  { id: 'edm-m2-006', domain: 'Clinical', group: 'Summaries', subGroup: 'Clinical Efficacy', artifactName: 'Summary of Clinical Efficacy', ctdSection: '2.7.3', region: 'General', required: 'M' },
  { id: 'edm-m2-007', domain: 'Clinical', group: 'Summaries', subGroup: 'Clinical Safety', artifactName: 'Summary of Clinical Safety', ctdSection: '2.7.4', region: 'General', required: 'M' },
  
  // Module 3 - Quality (CMC)
  { id: 'edm-m3-001', domain: 'Quality', group: 'Drug Substance', subGroup: 'Characterization', artifactName: 'General Information', ctdSection: '3.2.S.1', region: 'General', required: 'M' },
  { id: 'edm-m3-002', domain: 'Quality', group: 'Drug Substance', subGroup: 'Manufacture', artifactName: 'Description of the Drug Substance Manufacturing Process', ctdSection: '3.2.S.2.2', region: 'General', required: 'M' },
  { id: 'edm-m3-003', domain: 'Quality', group: 'Drug Substance', subGroup: 'Controls', artifactName: 'Specifications - Drug Substance', ctdSection: '3.2.S.4.1', region: 'General', required: 'M' },
  { id: 'edm-m3-004', domain: 'Quality', group: 'Drug Substance', subGroup: 'Controls', artifactName: 'Analytical Procedures - Drug Substance', ctdSection: '3.2.S.4.2', region: 'General', required: 'M' },
  { id: 'edm-m3-005', domain: 'Quality', group: 'Drug Substance', subGroup: 'Stability', artifactName: 'Stability Data - Drug Substance', ctdSection: '3.2.S.7.3', region: 'General', required: 'M' },
  { id: 'edm-m3-006', domain: 'Quality', group: 'Drug Product', subGroup: 'Composition', artifactName: 'Description and Composition', ctdSection: '3.2.P.1', region: 'General', required: 'M' },
  { id: 'edm-m3-007', domain: 'Quality', group: 'Drug Product', subGroup: 'Pharmaceutical Development', artifactName: 'Formulation Development', ctdSection: '3.2.P.2.2', region: 'General', required: 'M' },
  { id: 'edm-m3-008', domain: 'Quality', group: 'Drug Product', subGroup: 'Manufacture', artifactName: 'Description of the Drug Product Manufacturing Process', ctdSection: '3.2.P.3.3', region: 'General', required: 'M' },
  { id: 'edm-m3-009', domain: 'Quality', group: 'Drug Product', subGroup: 'Controls', artifactName: 'Specifications', ctdSection: '3.2.P.5.1', region: 'General', required: 'M' },
  { id: 'edm-m3-010', domain: 'Quality', group: 'Drug Product', subGroup: 'Stability', artifactName: 'Drug Product Stability Data', ctdSection: '3.2.P.8.3', region: 'General', required: 'M' },
  
  // Module 4 - Nonclinical
  { id: 'edm-m4-001', domain: 'Non-Clinical', group: 'Pharmacology Study Reports', subGroup: 'Primary Pharmacodynamics', artifactName: 'Primary Pharmacodynamics Study Report', ctdSection: '4.2.1.1', region: 'General', required: 'M' },
  { id: 'edm-m4-002', domain: 'Non-Clinical', group: 'Pharmacology Study Reports', subGroup: 'Safety Pharmacology', artifactName: 'Safety Pharmacology Study Report', ctdSection: '4.2.1.3', region: 'General', required: 'M' },
  { id: 'edm-m4-003', domain: 'Non-Clinical', group: 'Pharmacokinetics Study Reports', subGroup: 'Absorption', artifactName: 'Absorption Study Report', ctdSection: '4.2.2.2', region: 'General', required: 'M' },
  { id: 'edm-m4-004', domain: 'Non-Clinical', group: 'Toxicology Study Reports', subGroup: 'Single dose toxicity', artifactName: 'Single Dose Toxicity Study Report', ctdSection: '4.2.3.1', region: 'General', required: 'M' },
  { id: 'edm-m4-005', domain: 'Non-Clinical', group: 'Toxicology Study Reports', subGroup: 'Repeat dose toxicity', artifactName: 'Repeat Dose Toxicity Study Report', ctdSection: '4.2.3.2', region: 'General', required: 'M' },
  { id: 'edm-m4-006', domain: 'Non-Clinical', group: 'Toxicology Study Reports', subGroup: 'Genotoxicity', artifactName: 'Genotoxicity In Vitro Study Report', ctdSection: '4.2.3.3.1', region: 'General', required: 'M' },
  { id: 'edm-m4-007', domain: 'Non-Clinical', group: 'Toxicology Study Reports', subGroup: 'Genotoxicity', artifactName: 'Genotoxicity In Vivo Study Report', ctdSection: '4.2.3.3.2', region: 'General', required: 'M' },
  
  // Module 5 - Clinical
  { id: 'edm-m5-001', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: 'Synopsis', artifactName: 'Synopsis', ctdSection: '5.3', region: 'General', required: 'M' },
  { id: 'edm-m5-002', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: 'Clinical Study Report', artifactName: 'Report body', ctdSection: '5.3', region: 'General', required: 'M' },
  { id: 'edm-m5-003', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: '', artifactName: 'Full protocol', ctdSection: '5.3', region: 'General', required: 'M' },
  { id: 'edm-m5-004', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: '', artifactName: 'Informed consent', ctdSection: '5.3', region: 'General', required: 'M' },
  { id: 'edm-m5-005', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: '', artifactName: 'Investigator CVs', ctdSection: '5.3', region: 'General', required: 'R' },
  { id: 'edm-m5-006', domain: 'Clinical', group: 'Clinical Study Reports', subGroup: 'Datasets', artifactName: 'Data tabulation dataset', ctdSection: '5.3', region: 'US', required: 'M' },
];

// ============================================================================
// MOCK IND READINESS DATA
// ============================================================================

const mockDocuments: INDDocument[] = [
  // Module 1
  { id: 'doc-m1-001', title: 'FDA Form 1571', sectionId: 'm1-forms', status: 'approved', version: '1.0', owner: 'Sarah Chen', dueDate: '2025-01-15', completionPercent: 100, lastModified: '2024-12-10', edmArtifactType: 'FDA Form 1571', flags: [] },
  { id: 'doc-m1-002', title: 'Cover Letter', sectionId: 'm1-admin', status: 'draft', version: '0.3', owner: 'Sarah Chen', dueDate: '2025-01-20', completionPercent: 60, lastModified: '2024-12-14', edmArtifactType: 'Cover Letter', flags: [] },
  { id: 'doc-m1-003', title: 'Introductory Statement', sectionId: 'm1-intro', status: 'in-review', version: '0.8', owner: 'Dr. James Wilson', dueDate: '2025-01-18', completionPercent: 85, lastModified: '2024-12-13', flags: [] },
  { id: 'doc-m1-004', title: 'Investigator Brochure', sectionId: 'm1-ib', status: 'in-review', version: '2.1', owner: 'Dr. Emily Park', dueDate: '2025-01-22', completionPercent: 90, lastModified: '2024-12-12', flags: [] },
  
  // Module 2
  { id: 'doc-m2-001', title: 'Quality Overall Summary', sectionId: 'm2-qos', status: 'draft', version: '0.5', owner: 'Michael Roberts', dueDate: '2025-01-25', completionPercent: 45, lastModified: '2024-12-11', edmArtifactType: 'Quality Overall Summary', flags: [{ type: 'dependency', message: 'Awaiting stability data from Module 3', severity: 'high' }] },
  { id: 'doc-m2-002', title: 'Nonclinical Overview', sectionId: 'm2-nco', status: 'in-review', version: '1.2', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-20', completionPercent: 88, lastModified: '2024-12-10', edmArtifactType: 'Nonclinical Overview', flags: [] },
  { id: 'doc-m2-003', title: 'Clinical Overview', sectionId: 'm2-co', status: 'not-started', version: '-', owner: 'Dr. James Wilson', dueDate: '2025-01-28', completionPercent: 0, lastModified: '-', edmArtifactType: 'Clinical Overview', flags: [{ type: 'blocked', message: 'Phase 1 study report pending', severity: 'critical' }] },
  { id: 'doc-m2-004', title: 'Nonclinical Written Summary', sectionId: 'm2-ncs', status: 'draft', version: '0.7', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-22', completionPercent: 65, lastModified: '2024-12-09', flags: [] },
  { id: 'doc-m2-005', title: 'Clinical Summary', sectionId: 'm2-cs', status: 'not-started', version: '-', owner: 'Dr. James Wilson', dueDate: '2025-01-30', completionPercent: 0, lastModified: '-', flags: [{ type: 'dependency', message: 'Waiting on Clinical Overview', severity: 'high' }] },
  
  // Module 3 (CMC)
  { id: 'doc-m3-001', title: 'Drug Substance - General Information', sectionId: 'm3-ds-general', status: 'approved', version: '1.0', owner: 'Michael Roberts', dueDate: '2025-01-10', completionPercent: 100, lastModified: '2024-12-01', edmArtifactType: 'General Information', flags: [] },
  { id: 'doc-m3-002', title: 'Drug Substance - Manufacturing Process', sectionId: 'm3-ds-mfg', status: 'final', version: '1.1', owner: 'Dr. Rachel Kim', dueDate: '2025-01-12', completionPercent: 100, lastModified: '2024-12-05', flags: [] },
  { id: 'doc-m3-003', title: 'Drug Substance - Specifications', sectionId: 'm3-ds-spec', status: 'approved', version: '1.0', owner: 'Dr. Rachel Kim', dueDate: '2025-01-10', completionPercent: 100, lastModified: '2024-11-28', flags: [] },
  { id: 'doc-m3-004', title: 'Drug Substance - Stability', sectionId: 'm3-ds-stability', status: 'in-review', version: '0.9', owner: 'Jennifer Walsh', dueDate: '2025-01-18', completionPercent: 85, lastModified: '2024-12-12', flags: [{ type: 'missing-data', message: '6-month accelerated data pending', severity: 'medium' }] },
  { id: 'doc-m3-005', title: 'Drug Product - Description', sectionId: 'm3-dp-desc', status: 'approved', version: '1.0', owner: 'Michael Roberts', dueDate: '2025-01-10', completionPercent: 100, lastModified: '2024-12-02', flags: [] },
  { id: 'doc-m3-006', title: 'Drug Product - Formulation', sectionId: 'm3-dp-form', status: 'final', version: '1.2', owner: 'Dr. Rachel Kim', dueDate: '2025-01-12', completionPercent: 100, lastModified: '2024-12-06', flags: [] },
  { id: 'doc-m3-007', title: 'Drug Product - Manufacturing', sectionId: 'm3-dp-mfg', status: 'in-review', version: '0.8', owner: 'Michael Roberts', dueDate: '2025-01-20', completionPercent: 75, lastModified: '2024-12-11', flags: [] },
  { id: 'doc-m3-008', title: 'Drug Product - Specifications', sectionId: 'm3-dp-spec', status: 'draft', version: '0.6', owner: 'Dr. Rachel Kim', dueDate: '2025-01-22', completionPercent: 55, lastModified: '2024-12-10', flags: [] },
  { id: 'doc-m3-009', title: 'Drug Product - Stability', sectionId: 'm3-dp-stability', status: 'draft', version: '0.4', owner: 'Jennifer Walsh', dueDate: '2025-01-25', completionPercent: 35, lastModified: '2024-12-08', flags: [{ type: 'missing-data', message: 'Initial stability timepoint data incomplete', severity: 'high' }] },
  
  // Module 4 (Nonclinical)
  { id: 'doc-m4-001', title: 'Pharmacology - Primary PD', sectionId: 'm4-pharm-pd', status: 'final', version: '1.0', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-08', completionPercent: 100, lastModified: '2024-11-20', flags: [] },
  { id: 'doc-m4-002', title: 'Pharmacology - Safety', sectionId: 'm4-pharm-safety', status: 'final', version: '1.0', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-08', completionPercent: 100, lastModified: '2024-11-22', flags: [] },
  { id: 'doc-m4-003', title: 'PK - ADME Studies', sectionId: 'm4-pk', status: 'approved', version: '1.1', owner: 'Dr. David Chen', dueDate: '2025-01-10', completionPercent: 100, lastModified: '2024-11-25', flags: [] },
  { id: 'doc-m4-004', title: 'Toxicology - Single Dose', sectionId: 'm4-tox-single', status: 'final', version: '1.0', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-05', completionPercent: 100, lastModified: '2024-11-15', flags: [] },
  { id: 'doc-m4-005', title: 'Toxicology - Repeat Dose (28-day)', sectionId: 'm4-tox-repeat', status: 'final', version: '1.0', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-08', completionPercent: 100, lastModified: '2024-11-18', flags: [] },
  { id: 'doc-m4-006', title: 'Toxicology - Genotoxicity Battery', sectionId: 'm4-tox-geno', status: 'approved', version: '1.0', owner: 'Dr. David Chen', dueDate: '2025-01-10', completionPercent: 100, lastModified: '2024-11-28', flags: [] },
  
  // Module 5 (Clinical)
  { id: 'doc-m5-001', title: 'Phase 1 Protocol', sectionId: 'm5-protocol', status: 'approved', version: '3.0', owner: 'Dr. James Wilson', dueDate: '2024-12-01', completionPercent: 100, lastModified: '2024-10-15', flags: [] },
  { id: 'doc-m5-002', title: 'Informed Consent Form', sectionId: 'm5-icf', status: 'approved', version: '2.1', owner: 'Dr. Emily Park', dueDate: '2024-12-01', completionPercent: 100, lastModified: '2024-10-20', flags: [] },
  { id: 'doc-m5-003', title: 'Phase 1 Study Report', sectionId: 'm5-csr', status: 'in-review', version: '0.9', owner: 'Dr. James Wilson', dueDate: '2025-01-28', completionPercent: 78, lastModified: '2024-12-14', flags: [{ type: 'qc-issue', message: 'Statistical tables pending medical review', severity: 'medium' }] },
  { id: 'doc-m5-004', title: 'Investigator CVs & Site Info', sectionId: 'm5-investigators', status: 'draft', version: '0.5', owner: 'Dr. Emily Park', dueDate: '2025-01-20', completionPercent: 50, lastModified: '2024-12-08', flags: [] },
];

const mockSectionReadiness: Record<string, SectionReadiness[]> = {
  'm1': [
    { sectionId: 'm1-forms', sectionNumber: '1.1', sectionName: 'FDA Forms', completionPercent: 100, documentsTotal: 2, documentsComplete: 2, status: 'complete', owner: 'Sarah Chen', dueDate: '2025-01-15', requiredByEDM: true },
    { sectionId: 'm1-admin', sectionNumber: '1.2', sectionName: 'Administrative', completionPercent: 60, documentsTotal: 2, documentsComplete: 0, status: 'on-track', owner: 'Sarah Chen', dueDate: '2025-01-20', requiredByEDM: true },
    { sectionId: 'm1-intro', sectionNumber: '1.3', sectionName: 'Introductory Statement', completionPercent: 85, documentsTotal: 1, documentsComplete: 0, status: 'on-track', owner: 'Dr. James Wilson', dueDate: '2025-01-18', requiredByEDM: true },
    { sectionId: 'm1-ib', sectionNumber: '1.14', sectionName: 'Investigator Brochure', completionPercent: 90, documentsTotal: 1, documentsComplete: 0, status: 'on-track', owner: 'Dr. Emily Park', dueDate: '2025-01-22', requiredByEDM: true },
  ],
  'm2': [
    { sectionId: 'm2-qos', sectionNumber: '2.3', sectionName: 'Quality Overall Summary', completionPercent: 45, documentsTotal: 1, documentsComplete: 0, status: 'at-risk', owner: 'Michael Roberts', dueDate: '2025-01-25', requiredByEDM: true },
    { sectionId: 'm2-nco', sectionNumber: '2.4', sectionName: 'Nonclinical Overview', completionPercent: 88, documentsTotal: 1, documentsComplete: 0, status: 'on-track', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-20', requiredByEDM: true },
    { sectionId: 'm2-co', sectionNumber: '2.5', sectionName: 'Clinical Overview', completionPercent: 0, documentsTotal: 1, documentsComplete: 0, status: 'blocked', owner: 'Dr. James Wilson', dueDate: '2025-01-28', requiredByEDM: true },
    { sectionId: 'm2-ncs', sectionNumber: '2.6', sectionName: 'Nonclinical Written Summary', completionPercent: 65, documentsTotal: 1, documentsComplete: 0, status: 'on-track', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-22', requiredByEDM: true },
    { sectionId: 'm2-cs', sectionNumber: '2.7', sectionName: 'Clinical Summary', completionPercent: 0, documentsTotal: 1, documentsComplete: 0, status: 'blocked', owner: 'Dr. James Wilson', dueDate: '2025-01-30', requiredByEDM: true },
  ],
  'm3': [
    { sectionId: 'm3-ds', sectionNumber: '3.2.S', sectionName: 'Drug Substance', completionPercent: 96, documentsTotal: 4, documentsComplete: 3, status: 'on-track', owner: 'Michael Roberts', dueDate: '2025-01-18', requiredByEDM: true },
    { sectionId: 'm3-dp', sectionNumber: '3.2.P', sectionName: 'Drug Product', completionPercent: 73, documentsTotal: 5, documentsComplete: 2, status: 'at-risk', owner: 'Dr. Rachel Kim', dueDate: '2025-01-25', requiredByEDM: true },
  ],
  'm4': [
    { sectionId: 'm4-pharm', sectionNumber: '4.2.1', sectionName: 'Pharmacology', completionPercent: 100, documentsTotal: 2, documentsComplete: 2, status: 'complete', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-08', requiredByEDM: true },
    { sectionId: 'm4-pk', sectionNumber: '4.2.2', sectionName: 'Pharmacokinetics', completionPercent: 100, documentsTotal: 1, documentsComplete: 1, status: 'complete', owner: 'Dr. David Chen', dueDate: '2025-01-10', requiredByEDM: true },
    { sectionId: 'm4-tox', sectionNumber: '4.2.3', sectionName: 'Toxicology', completionPercent: 100, documentsTotal: 3, documentsComplete: 3, status: 'complete', owner: 'Dr. Lisa Martinez', dueDate: '2025-01-10', requiredByEDM: true },
  ],
  'm5': [
    { sectionId: 'm5-protocol', sectionNumber: '5.3.1', sectionName: 'Study Protocol', completionPercent: 100, documentsTotal: 1, documentsComplete: 1, status: 'complete', owner: 'Dr. James Wilson', dueDate: '2024-12-01', requiredByEDM: true },
    { sectionId: 'm5-icf', sectionNumber: '5.3.2', sectionName: 'Informed Consent', completionPercent: 100, documentsTotal: 1, documentsComplete: 1, status: 'complete', owner: 'Dr. Emily Park', dueDate: '2024-12-01', requiredByEDM: true },
    { sectionId: 'm5-csr', sectionNumber: '5.3.5', sectionName: 'Clinical Study Reports', completionPercent: 78, documentsTotal: 1, documentsComplete: 0, status: 'at-risk', owner: 'Dr. James Wilson', dueDate: '2025-01-28', requiredByEDM: true },
    { sectionId: 'm5-investigators', sectionNumber: '5.3.6', sectionName: 'Investigator Info', completionPercent: 50, documentsTotal: 1, documentsComplete: 0, status: 'on-track', owner: 'Dr. Emily Park', dueDate: '2025-01-20', requiredByEDM: false },
  ],
};

export const mockModuleReadiness: ModuleReadiness[] = [
  {
    moduleId: 'm1',
    moduleNumber: '1',
    moduleName: 'Administrative Information',
    completionPercent: 82,
    documentsTotal: 6,
    documentsComplete: 2,
    documentsDraft: 2,
    documentsNotStarted: 0,
    status: 'on-track',
    owner: 'Sarah Chen',
    dueDate: '2025-01-22',
    sections: mockSectionReadiness['m1'],
    dependencies: [],
    blockers: [],
  },
  {
    moduleId: 'm2',
    moduleNumber: '2',
    moduleName: 'CTD Summaries',
    completionPercent: 40,
    documentsTotal: 5,
    documentsComplete: 0,
    documentsDraft: 3,
    documentsNotStarted: 2,
    status: 'at-risk',
    owner: 'Dr. James Wilson',
    dueDate: '2025-01-30',
    sections: mockSectionReadiness['m2'],
    dependencies: ['m3', 'm4', 'm5'],
    blockers: ['Phase 1 Study Report (m5) must be complete before Clinical Overview can be finalized'],
  },
  {
    moduleId: 'm3',
    moduleNumber: '3',
    moduleName: 'Quality (CMC)',
    completionPercent: 83,
    documentsTotal: 9,
    documentsComplete: 5,
    documentsDraft: 3,
    documentsNotStarted: 0,
    status: 'on-track',
    owner: 'Michael Roberts',
    dueDate: '2025-01-25',
    sections: mockSectionReadiness['m3'],
    dependencies: [],
    blockers: [],
  },
  {
    moduleId: 'm4',
    moduleNumber: '4',
    moduleName: 'Nonclinical',
    completionPercent: 100,
    documentsTotal: 6,
    documentsComplete: 6,
    documentsDraft: 0,
    documentsNotStarted: 0,
    status: 'complete',
    owner: 'Dr. Lisa Martinez',
    dueDate: '2025-01-10',
    sections: mockSectionReadiness['m4'],
    dependencies: [],
    blockers: [],
  },
  {
    moduleId: 'm5',
    moduleNumber: '5',
    moduleName: 'Clinical',
    completionPercent: 78,
    documentsTotal: 4,
    documentsComplete: 2,
    documentsDraft: 1,
    documentsNotStarted: 0,
    status: 'at-risk',
    owner: 'Dr. James Wilson',
    dueDate: '2025-01-28',
    sections: mockSectionReadiness['m5'],
    dependencies: [],
    blockers: [],
  },
];

// ============================================================================
// DYNAMIC DATE HELPER - v0.38.5
// Generate dates relative to today for realistic demo data
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

export const mockMilestones: Milestone[] = [
  { id: 'ms-001', name: 'Nonclinical Package Complete', type: 'internal', targetDate: getPastDate(10), status: 'completed', completedDate: getPastDate(15), dependencies: [], description: 'All Module 4 documents finalized' },
  { id: 'ms-002', name: 'CMC Package Ready', type: 'internal', targetDate: getFutureDate(5), status: 'on-track', dependencies: ['ms-001'], description: 'Module 3 quality documentation complete' },
  { id: 'ms-003', name: 'Phase 1 CSR Finalized', type: 'clinical', targetDate: getFutureDate(8), status: 'at-risk', dependencies: [], description: 'Clinical study report locked for submission' },
  { id: 'ms-004', name: 'Module 2 Summaries Complete', type: 'internal', targetDate: getFutureDate(12), status: 'at-risk', dependencies: ['ms-002', 'ms-003'], description: 'All CTD summaries finalized' },
  { id: 'ms-005', name: 'IND QC Review', type: 'internal', targetDate: getFutureDate(18), status: 'on-track', dependencies: ['ms-004'], description: 'Quality control review of full package' },
  { id: 'ms-006', name: 'IND Submission', type: 'regulatory', targetDate: getFutureDate(25), status: 'on-track', dependencies: ['ms-005'], description: 'FDA IND submission target date' },
  { id: 'ms-007', name: 'FDA 30-Day Review Complete', type: 'regulatory', targetDate: getFutureDate(55), status: 'on-track', dependencies: ['ms-006'], description: 'Expected clearance to proceed' },
  { id: 'ms-008', name: 'First Patient Dosed', type: 'clinical', targetDate: getFutureDate(70), status: 'on-track', dependencies: ['ms-007'], description: 'Phase 2 study initiation' },
];

export const mockCriticalPath: CriticalPathItem[] = [
  { id: 'cp-001', task: 'Complete Phase 1 CSR Statistical Analysis', module: 'Module 5', startDate: '2024-12-10', endDate: '2024-12-20', duration: 10, dependencies: [], status: 'completed', owner: 'Dr. James Wilson', isBlocking: false, slack: 0 },
  { id: 'cp-002', task: 'Finalize Phase 1 CSR Medical Writing', module: 'Module 5', startDate: '2024-12-15', endDate: '2025-01-10', duration: 26, dependencies: ['cp-001'], status: 'in-progress', owner: 'Dr. James Wilson', isBlocking: true, slack: 0 },
  { id: 'cp-003', task: 'Phase 1 CSR QC Review', module: 'Module 5', startDate: '2025-01-11', endDate: '2025-01-20', duration: 9, dependencies: ['cp-002'], status: 'not-started', owner: 'Jennifer Walsh', isBlocking: true, slack: 0 },
  { id: 'cp-004', task: 'Complete Clinical Overview', module: 'Module 2', startDate: '2025-01-21', endDate: '2025-01-28', duration: 7, dependencies: ['cp-003'], status: 'not-started', owner: 'Dr. James Wilson', isBlocking: true, slack: 0 },
  { id: 'cp-005', task: 'Drug Product Stability Data Lock', module: 'Module 3', startDate: '2024-12-20', endDate: '2025-01-15', duration: 26, dependencies: [], status: 'in-progress', owner: 'Jennifer Walsh', isBlocking: true, slack: 5 },
  { id: 'cp-006', task: 'Quality Overall Summary', module: 'Module 2', startDate: '2025-01-16', endDate: '2025-01-25', duration: 9, dependencies: ['cp-005'], status: 'not-started', owner: 'Michael Roberts', isBlocking: true, slack: 0 },
  { id: 'cp-007', task: 'Full Package QC', module: 'All', startDate: '2025-01-31', endDate: '2025-02-05', duration: 5, dependencies: ['cp-004', 'cp-006'], status: 'not-started', owner: 'QC Team', isBlocking: true, slack: 0 },
  { id: 'cp-008', task: 'eCTD Compilation & Validation', module: 'All', startDate: '2025-02-06', endDate: '2025-02-12', duration: 6, dependencies: ['cp-007'], status: 'not-started', owner: 'Publishing Team', isBlocking: true, slack: 0 },
  { id: 'cp-009', task: 'IND Submission', module: 'All', startDate: '2025-02-15', endDate: '2025-02-15', duration: 1, dependencies: ['cp-008'], status: 'not-started', owner: 'Regulatory Team', isBlocking: false, slack: 0 },
];

export const mockGaps: GapItem[] = [
  {
    id: 'gap-001',
    module: 'Module 3',
    section: '3.2.P.8.3',
    category: 'data',
    description: '6-month accelerated stability data not yet available for Drug Product',
    severity: 'major',
    fdaRequirement: 'ICH Q1A requires accelerated stability data to support proposed shelf life',
    edmReference: 'Drug Product Stability Data (EDM: 3.2.P.8.3)',
    recommendation: 'Include available 3-month accelerated data with commitment to provide 6-month data as amendment',
    estimatedEffort: '2 weeks for data compilation',
    owner: 'Jennifer Walsh',
    dueDate: '2025-01-15',
    status: 'in-progress',
  },
  {
    id: 'gap-002',
    module: 'Module 2',
    section: '2.5',
    category: 'document',
    description: 'Clinical Overview cannot be completed until Phase 1 CSR is finalized',
    severity: 'critical',
    fdaRequirement: 'ICH M4E requires completed clinical overview for submission',
    edmReference: 'Clinical Overview (EDM: 2.5)',
    recommendation: 'Prioritize Phase 1 CSR completion; consider parallel drafting of Clinical Overview sections',
    estimatedEffort: '3 weeks including review cycles',
    owner: 'Dr. James Wilson',
    dueDate: '2025-01-28',
    status: 'open',
  },
  {
    id: 'gap-003',
    module: 'Module 3',
    section: '3.2.P.5.1',
    category: 'data',
    description: 'Drug Product specification limits not fully justified',
    severity: 'minor',
    fdaRequirement: 'FDA expects scientific rationale for all specification limits',
    edmReference: 'Specifications (EDM: 3.2.P.5.1)',
    recommendation: 'Add justification section citing batch history and stability data',
    estimatedEffort: '1 week',
    owner: 'Dr. Rachel Kim',
    dueDate: '2025-01-20',
    status: 'open',
  },
  {
    id: 'gap-004',
    module: 'Module 5',
    section: '5.3.5',
    category: 'process',
    description: 'Phase 1 CSR statistical tables awaiting final medical review signoff',
    severity: 'major',
    fdaRequirement: 'ICH E3 requires QC-verified statistical outputs',
    edmReference: 'Clinical Study Reports (EDM: 5.3.5)',
    recommendation: 'Schedule dedicated review session; escalate to Clinical Lead',
    estimatedEffort: '5 days',
    owner: 'Dr. James Wilson',
    dueDate: '2025-01-15',
    status: 'in-progress',
  },
  {
    id: 'gap-005',
    module: 'Module 1',
    section: '1.14',
    category: 'document',
    description: 'Investigator Brochure requires update with latest safety data',
    severity: 'minor',
    fdaRequirement: 'IB must reflect current safety profile before study initiation',
    edmReference: 'Investigator Brochure',
    recommendation: 'Integrate hepatotoxicity signal findings from Phase 1',
    estimatedEffort: '3 days',
    owner: 'Dr. Emily Park',
    dueDate: '2025-01-22',
    status: 'open',
  },
];

export const mockRiskFactors: RiskFactor[] = [
  {
    id: 'risk-001',
    category: 'timeline',
    title: 'Phase 1 CSR Delay Impact',
    description: 'Any delay in Phase 1 CSR completion directly impacts Clinical Overview and Module 2 summaries, potentially delaying IND submission',
    impact: 'high',
    probability: 'medium',
    mitigation: 'Daily stand-ups on CSR progress; escalation path to CMO defined',
    owner: 'Dr. James Wilson',
    status: 'active',
  },
  {
    id: 'risk-002',
    category: 'quality',
    title: 'Stability Data Timing',
    description: 'Drug Product accelerated stability 6-month timepoint falls after target submission date',
    impact: 'medium',
    probability: 'high',
    mitigation: 'Include commitment in IND to provide data as amendment; precedent for FDA acceptance exists',
    owner: 'Michael Roberts',
    status: 'mitigated',
  },
  {
    id: 'risk-003',
    category: 'dependency',
    title: 'Cross-Module Dependencies',
    description: 'Module 2 summaries depend on finalized content from Modules 3, 4, and 5',
    impact: 'high',
    probability: 'medium',
    mitigation: 'Parallel authoring with placeholder text; daily sync between module leads',
    owner: 'Sarah Chen',
    status: 'active',
  },
  {
    id: 'risk-004',
    category: 'resource',
    title: 'Medical Writing Capacity',
    description: 'Single medical writer assigned to Clinical Overview and Summary may create bottleneck',
    impact: 'medium',
    probability: 'medium',
    mitigation: 'Contract medical writer on standby; prioritized task list agreed',
    owner: 'Jennifer Walsh',
    status: 'mitigated',
  },
  {
    id: 'risk-005',
    category: 'regulatory',
    title: 'Hepatotoxicity Signal',
    description: 'Emerging hepatotoxicity signal may require additional risk communication in IND',
    impact: 'high',
    probability: 'low',
    mitigation: 'Proactive safety section in Clinical Overview; monitoring plan in protocol',
    owner: 'Dr. Lisa Martinez',
    status: 'active',
  },
];

// Main IND Submission Data
export const indSubmissions: INDSubmission[] = [
  {
    id: 'ind-lig-4055',
    productId: 'lig-4055',
    applicationNumber: 'IND-PENDING',
    submissionType: 'IND',
    targetDate: '2025-02-15',
    projectedDate: '2025-02-18',
    overallReadiness: 72,
    status: 'at-risk',
    modules: mockModuleReadiness,
    milestones: mockMilestones,
    criticalPath: mockCriticalPath,
    gaps: mockGaps,
    riskFactors: mockRiskFactors,
  },
];

// Helper functions
export function getINDByProductId(productId: string): INDSubmission | undefined {
  return indSubmissions.find(ind => ind.productId === productId);
}

export function getDocumentsByModule(moduleId: string): INDDocument[] {
  return mockDocuments.filter(doc => doc.sectionId.startsWith(moduleId));
}

export function getDocumentsBySection(sectionId: string): INDDocument[] {
  return mockDocuments.filter(doc => doc.sectionId === sectionId);
}

export function getEDMArtifactsByDomain(domain: EDMDomain): EDMArtifact[] {
  return edmArtifacts.filter(a => a.domain === domain);
}

export function getEDMArtifactsByModule(ctdModulePrefix: string): EDMArtifact[] {
  return edmArtifacts.filter(a => a.ctdSection?.startsWith(ctdModulePrefix));
}

export function calculateModuleCompletion(moduleId: string): number {
  const docs = getDocumentsByModule(moduleId);
  if (docs.length === 0) return 0;
  return Math.round(docs.reduce((sum, d) => sum + d.completionPercent, 0) / docs.length);
}

export function getBlockingItems(ind: INDSubmission): CriticalPathItem[] {
  return ind.criticalPath.filter(item => item.isBlocking && item.status !== 'completed');
}

export function getCriticalGaps(ind: INDSubmission): GapItem[] {
  return ind.gaps.filter(gap => gap.severity === 'critical' && gap.status !== 'resolved');
}

export function getActiveRisks(ind: INDSubmission): RiskFactor[] {
  return ind.riskFactors.filter(risk => risk.status === 'active');
}

export { mockDocuments };
