
// =============================================================================
// SOP LIBRARY SERVICE
// =============================================================================
// Service for managing Standard Operating Procedures including CRUD operations,
// search, versioning, training tracking, and the bundled Ligature SOP Suite.
// =============================================================================

import {
  SOPDocument,
  SOPCategory,
  SOPStatus,
  SOPFilter,
  SOPSort,
  SOPLibraryStats,
  SOPVersion,
  SOPAuditEntry,
  SOPApprover,
  TrainingAssignment,
  SOP_CATEGORIES,
  sortBySOPNumber,
  isReviewOverdue,
  parseSOPNumber,
} from '@/types/sop';

// Re-export types needed by consumers
export type { SOPLibraryStats } from '@/types/sop';

// ============================================================================
// BUNDLED SOP DEFINITIONS
// ============================================================================

/**
 * Bundled SOP metadata from Ligature SOP Suite v1.0
 */
interface BundledSOPDef {
  sopNumber: string;
  title: string;
  category: SOPCategory;
  description: string;
  keywords: string[];
}

/**
 * Complete Ligature SOP Suite - 96 production SOPs
 */
const BUNDLED_SOPS: BundledSOPDef[] = [
  // Quality System (QS) - 14 SOPs
  { sopNumber: 'QS-001', title: 'Document Control', category: 'QS', description: 'Procedures for creation, review, approval, distribution, and control of documents within the quality management system.', keywords: ['document', 'control', 'version', 'approval', 'distribution'] },
  { sopNumber: 'QS-002', title: 'Training Management', category: 'QS', description: 'Management of personnel training including identification, delivery, documentation, and effectiveness assessment.', keywords: ['training', 'qualification', 'competency', 'curriculum'] },
  { sopNumber: 'QS-003', title: 'Deviation Management', category: 'QS', description: 'Handling of deviations from approved procedures, specifications, or standards including investigation and CAPA linkage.', keywords: ['deviation', 'nonconformance', 'investigation', 'root cause'] },
  { sopNumber: 'QS-004', title: 'CAPA', category: 'QS', description: 'Corrective and Preventive Action procedures for identifying, investigating, and addressing quality issues.', keywords: ['capa', 'corrective', 'preventive', 'root cause', 'effectiveness'] },
  { sopNumber: 'QS-005', title: 'Change Control', category: 'QS', description: 'Control of changes to documents, processes, systems, and facilities with impact assessment and approval.', keywords: ['change', 'control', 'impact', 'assessment', 'approval'] },
  { sopNumber: 'QS-006', title: 'Internal Audit', category: 'QS', description: 'Planning, execution, and follow-up of internal quality audits to assess compliance and effectiveness.', keywords: ['audit', 'internal', 'compliance', 'finding', 'observation'] },
  { sopNumber: 'QS-007', title: 'Supplier Qualification', category: 'QS', description: 'Qualification and ongoing monitoring of suppliers and vendors providing materials or services.', keywords: ['supplier', 'vendor', 'qualification', 'audit', 'approved'] },
  { sopNumber: 'QS-008', title: 'Management Review', category: 'QS', description: 'Periodic management review of the quality management system for suitability and effectiveness.', keywords: ['management', 'review', 'metrics', 'kpi', 'improvement'] },
  { sopNumber: 'QS-009', title: 'Risk Management', category: 'QS', description: 'Identification, assessment, control, and monitoring of quality risks throughout product lifecycle.', keywords: ['risk', 'assessment', 'mitigation', 'control', 'fmea'] },
  { sopNumber: 'QS-010', title: 'Complaint Handling', category: 'QS', description: 'Receipt, investigation, and response to product complaints with trending and escalation.', keywords: ['complaint', 'customer', 'investigation', 'response', 'trending'] },
  { sopNumber: 'QS-011', title: 'Recall and Field Action', category: 'QS', description: 'Procedures for initiating, executing, and closing product recalls and field safety corrective actions.', keywords: ['recall', 'field', 'action', 'safety', 'withdrawal'] },
  { sopNumber: 'QS-012', title: 'Data Integrity Governance', category: 'QS', description: 'ALCOA+ principles and governance framework for ensuring data integrity across GxP operations.', keywords: ['data', 'integrity', 'alcoa', 'governance', 'electronic'] },
  { sopNumber: 'QS-013', title: 'Business Continuity', category: 'QS', description: 'Business continuity planning, disaster recovery, and emergency response procedures.', keywords: ['continuity', 'disaster', 'recovery', 'emergency', 'backup'] },
  { sopNumber: 'QS-014', title: 'Regulatory Inspection Management', category: 'QS', description: 'Preparation for, conduct during, and follow-up after regulatory authority inspections.', keywords: ['inspection', 'regulatory', 'fda', 'ema', 'audit', 'readiness'] },

  // Computerized Systems (CS) - 10 SOPs
  { sopNumber: 'CS-001', title: 'Computerized System Lifecycle', category: 'CS', description: 'End-to-end lifecycle management of computerized systems from concept to retirement.', keywords: ['lifecycle', 'system', 'computerized', 'sdlc', 'retirement'] },
  { sopNumber: 'CS-002', title: 'System Validation (CSV/CSA)', category: 'CS', description: 'Risk-based computer system validation and computer software assurance methodologies.', keywords: ['validation', 'csv', 'csa', 'iq', 'oq', 'pq', 'gamp'] },
  { sopNumber: 'CS-003', title: 'User Access Control', category: 'CS', description: 'Management of user accounts, access rights, and security controls for computerized systems.', keywords: ['access', 'user', 'security', 'password', 'role', 'permission'] },
  { sopNumber: 'CS-004', title: 'Electronic Signatures', category: 'CS', description: 'Implementation and control of electronic signatures per 21 CFR Part 11 requirements.', keywords: ['signature', 'electronic', 'part11', 'esignature', 'meaning'] },
  { sopNumber: 'CS-005', title: 'Audit Trail Management', category: 'CS', description: 'Configuration, review, and retention of audit trails for GxP computerized systems.', keywords: ['audit', 'trail', 'log', 'review', 'part11', 'annex11'] },
  { sopNumber: 'CS-006', title: 'Backup, Restore, and Archival', category: 'CS', description: 'Data backup, restoration testing, and long-term archival procedures for system data.', keywords: ['backup', 'restore', 'archive', 'retention', 'recovery'] },
  { sopNumber: 'CS-007', title: 'System Change Control', category: 'CS', description: 'Control of changes to validated computerized systems including patches and upgrades.', keywords: ['change', 'control', 'patch', 'upgrade', 'release', 'deployment'] },
  { sopNumber: 'CS-008', title: 'Cloud and SaaS Qualification', category: 'CS', description: 'Qualification and ongoing oversight of cloud-hosted and SaaS applications.', keywords: ['cloud', 'saas', 'qualification', 'vendor', 'hosting', 'aws', 'azure'] },
  { sopNumber: 'CS-009', title: 'System Decommissioning', category: 'CS', description: 'Retirement and decommissioning of computerized systems with data migration and archival.', keywords: ['decommission', 'retirement', 'migration', 'archive', 'sunset'] },
  { sopNumber: 'CS-010', title: 'Cybersecurity for GxP Systems', category: 'CS', description: 'Cybersecurity controls, monitoring, and incident response for GxP computerized systems.', keywords: ['cybersecurity', 'security', 'incident', 'vulnerability', 'threat'] },

  // Good Clinical Practice (GCP) - 18 SOPs
  { sopNumber: 'GCP-001', title: 'Protocol Development', category: 'GCP', description: 'Development, review, and approval of clinical trial protocols and amendments.', keywords: ['protocol', 'amendment', 'design', 'clinical', 'study'] },
  { sopNumber: 'GCP-002', title: 'Trial Master File Management', category: 'GCP', description: 'Setup, maintenance, and quality control of the Trial Master File (TMF/eTMF).', keywords: ['tmf', 'etmf', 'master', 'file', 'essential', 'documents'] },
  { sopNumber: 'GCP-003', title: 'Site Selection and Qualification', category: 'GCP', description: 'Selection, evaluation, and qualification of clinical trial investigator sites.', keywords: ['site', 'selection', 'qualification', 'feasibility', 'investigator'] },
  { sopNumber: 'GCP-004', title: 'Ethics and IRB Submissions', category: 'GCP', description: 'Preparation and submission of ethics committee and IRB/IEC documentation.', keywords: ['ethics', 'irb', 'iec', 'submission', 'approval', 'amendment'] },
  { sopNumber: 'GCP-005', title: 'Informed Consent', category: 'GCP', description: 'Development, implementation, and documentation of informed consent processes.', keywords: ['consent', 'informed', 'icf', 'subject', 'participant'] },
  { sopNumber: 'GCP-006', title: 'IMP Management', category: 'GCP', description: 'Management of Investigational Medicinal Products including ordering, receipt, storage, and accountability.', keywords: ['imp', 'drug', 'supply', 'accountability', 'dispensing', 'storage'] },
  { sopNumber: 'GCP-007', title: 'Safety Reporting - SAE/SUSAR', category: 'GCP', description: 'Collection, assessment, and expedited reporting of SAEs and SUSARs.', keywords: ['sae', 'susar', 'safety', 'reporting', 'expedited', 'adverse'] },
  { sopNumber: 'GCP-008', title: 'Risk-Based Monitoring', category: 'GCP', description: 'Risk-based monitoring strategy development and implementation for clinical trials.', keywords: ['monitoring', 'rbm', 'risk', 'centralized', 'remote', 'onsite'] },
  { sopNumber: 'GCP-009', title: 'Clinical Data Management', category: 'GCP', description: 'Clinical data collection, cleaning, validation, and database management.', keywords: ['data', 'management', 'cdm', 'cleaning', 'query', 'database'] },
  { sopNumber: 'GCP-010', title: 'Medical Coding', category: 'GCP', description: 'Medical coding of adverse events, medications, and medical history using standard dictionaries.', keywords: ['coding', 'meddra', 'whodrug', 'adverse', 'event', 'medication'] },
  { sopNumber: 'GCP-011', title: 'Database Lock and Unblinding', category: 'GCP', description: 'Procedures for clinical database lock, unlock, and treatment unblinding.', keywords: ['lock', 'unlock', 'unblinding', 'database', 'freeze'] },
  { sopNumber: 'GCP-012', title: 'CRO Oversight', category: 'GCP', description: 'Selection, qualification, and ongoing oversight of Contract Research Organizations.', keywords: ['cro', 'oversight', 'vendor', 'contract', 'outsourcing'] },
  { sopNumber: 'GCP-013', title: 'CSR Development', category: 'GCP', description: 'Development, review, and finalization of Clinical Study Reports per ICH E3.', keywords: ['csr', 'report', 'clinical', 'study', 'ich', 'e3'] },
  { sopNumber: 'GCP-014', title: 'Trial Registration and Disclosure', category: 'GCP', description: 'Registration of clinical trials and disclosure of results per regulatory requirements.', keywords: ['registration', 'disclosure', 'clinicaltrials', 'eudract', 'transparency'] },
  { sopNumber: 'GCP-015', title: 'Protocol Deviation Management', category: 'GCP', description: 'Identification, documentation, and reporting of clinical trial protocol deviations.', keywords: ['deviation', 'protocol', 'violation', 'gcp', 'noncompliance'] },
  { sopNumber: 'GCP-016', title: 'DMC Management', category: 'GCP', description: 'Establishment and management of Data Monitoring Committees/Data Safety Monitoring Boards.', keywords: ['dmc', 'dsmb', 'monitoring', 'committee', 'interim', 'analysis'] },
  { sopNumber: 'GCP-017', title: 'Biological Sample Management', category: 'GCP', description: 'Collection, processing, storage, and shipping of biological samples in clinical trials.', keywords: ['sample', 'biological', 'biobank', 'specimen', 'pk', 'biomarker'] },
  { sopNumber: 'GCP-018', title: 'Digital Health Technology', category: 'GCP', description: 'Use of digital health technologies, wearables, and eCOA in clinical trials.', keywords: ['digital', 'health', 'wearable', 'ecoa', 'epro', 'sensor'] },

  // Good Pharmacovigilance Practice (GVP) - 10 SOPs
  { sopNumber: 'GVP-001', title: 'Pharmacovigilance System', category: 'GVP', description: 'Establishment and maintenance of the pharmacovigilance system including QPPV and PSMF.', keywords: ['pharmacovigilance', 'system', 'qppv', 'psmf', 'safety'] },
  { sopNumber: 'GVP-002', title: 'ICSR Collection and Processing', category: 'GVP', description: 'Collection, triage, data entry, and processing of Individual Case Safety Reports.', keywords: ['icsr', 'case', 'collection', 'processing', 'e2b'] },
  { sopNumber: 'GVP-003', title: 'Expedited Reporting', category: 'GVP', description: 'Expedited reporting of serious and unexpected adverse reactions to health authorities.', keywords: ['expedited', 'reporting', 'susar', 'serious', '15-day', '7-day'] },
  { sopNumber: 'GVP-004', title: 'Periodic Safety Reports', category: 'GVP', description: 'Preparation and submission of PSUR/PBRER and DSUR periodic safety reports.', keywords: ['psur', 'pbrer', 'dsur', 'periodic', 'safety', 'report'] },
  { sopNumber: 'GVP-005', title: 'Signal Detection and Evaluation', category: 'GVP', description: 'Methods for detecting, validating, and evaluating safety signals.', keywords: ['signal', 'detection', 'evaluation', 'disproportionality', 'prr'] },
  { sopNumber: 'GVP-006', title: 'Risk Management Plans', category: 'GVP', description: 'Development, implementation, and maintenance of Risk Management Plans.', keywords: ['rmp', 'risk', 'management', 'plan', 'minimization'] },
  { sopNumber: 'GVP-007', title: 'Post-Authorization Safety Studies', category: 'GVP', description: 'Design, conduct, and reporting of post-authorization safety studies (PASS).', keywords: ['pass', 'post-authorization', 'safety', 'study', 'effectiveness'] },
  { sopNumber: 'GVP-008', title: 'PSMF Management', category: 'GVP', description: 'Creation and maintenance of the Pharmacovigilance System Master File.', keywords: ['psmf', 'master', 'file', 'pharmacovigilance', 'system'] },
  { sopNumber: 'GVP-009', title: 'Literature Surveillance', category: 'GVP', description: 'Systematic surveillance of medical literature for safety information.', keywords: ['literature', 'surveillance', 'search', 'pubmed', 'mlm'] },
  { sopNumber: 'GVP-010', title: 'Safety Communication', category: 'GVP', description: 'Communication of safety information to healthcare professionals and patients.', keywords: ['communication', 'dhpc', 'safety', 'letter', 'educational'] },

  // Good Laboratory Practice (GLP) - 10 SOPs
  { sopNumber: 'GLP-001', title: 'Study Director Responsibilities', category: 'GLP', description: 'Roles and responsibilities of the Study Director in GLP studies.', keywords: ['study', 'director', 'responsibility', 'glp', 'nonclinical'] },
  { sopNumber: 'GLP-002', title: 'Study Plan and Amendments', category: 'GLP', description: 'Preparation, approval, and amendment of GLP study plans.', keywords: ['study', 'plan', 'protocol', 'amendment', 'glp'] },
  { sopNumber: 'GLP-003', title: 'Test and Reference Item Management', category: 'GLP', description: 'Receipt, characterization, storage, and distribution of test and reference items.', keywords: ['test', 'item', 'reference', 'characterization', 'stability'] },
  { sopNumber: 'GLP-004', title: 'Test System Management', category: 'GLP', description: 'Management of test systems including animals, cell cultures, and other biological systems.', keywords: ['test', 'system', 'animal', 'cell', 'biological'] },
  { sopNumber: 'GLP-005', title: 'Raw Data Documentation', category: 'GLP', description: 'Recording, correction, and archival of raw data in GLP studies.', keywords: ['raw', 'data', 'documentation', 'correction', 'integrity'] },
  { sopNumber: 'GLP-006', title: 'GLP Equipment Management', category: 'GLP', description: 'Qualification, calibration, and maintenance of GLP laboratory equipment.', keywords: ['equipment', 'calibration', 'maintenance', 'qualification', 'glp'] },
  { sopNumber: 'GLP-007', title: 'QA Unit Functions', category: 'GLP', description: 'Organization and activities of the Quality Assurance Unit in GLP compliance.', keywords: ['qa', 'unit', 'quality', 'assurance', 'audit', 'inspection'] },
  { sopNumber: 'GLP-008', title: 'GLP Final Report', category: 'GLP', description: 'Preparation, review, and approval of GLP study final reports.', keywords: ['final', 'report', 'glp', 'study', 'compliance'] },
  { sopNumber: 'GLP-009', title: 'Archive Management', category: 'GLP', description: 'Archival, retrieval, and retention of GLP study documentation and specimens.', keywords: ['archive', 'retention', 'storage', 'retrieval', 'specimen'] },
  { sopNumber: 'GLP-010', title: 'Multi-Site Study Management', category: 'GLP', description: 'Management and oversight of multi-site GLP studies.', keywords: ['multi-site', 'study', 'principal', 'investigator', 'oversight'] },

  // Good Manufacturing Practice (GMP) - 14 SOPs
  { sopNumber: 'GMP-001', title: 'Batch Record Management', category: 'GMP', description: 'Creation, execution, review, and archival of batch production records.', keywords: ['batch', 'record', 'production', 'execution', 'review'] },
  { sopNumber: 'GMP-002', title: 'Material Release', category: 'GMP', description: 'Sampling, testing, and release of raw materials and packaging components.', keywords: ['material', 'release', 'sampling', 'testing', 'incoming'] },
  { sopNumber: 'GMP-003', title: 'In-Process Controls', category: 'GMP', description: 'In-process testing and monitoring during manufacturing operations.', keywords: ['in-process', 'control', 'ipc', 'monitoring', 'testing'] },
  { sopNumber: 'GMP-004', title: 'Equipment Qualification', category: 'GMP', description: 'Qualification of manufacturing and laboratory equipment (DQ/IQ/OQ/PQ).', keywords: ['equipment', 'qualification', 'iq', 'oq', 'pq', 'dq'] },
  { sopNumber: 'GMP-005', title: 'Process Validation', category: 'GMP', description: 'Process validation lifecycle approach including PPQ and continued process verification.', keywords: ['process', 'validation', 'ppq', 'cpv', 'lifecycle'] },
  { sopNumber: 'GMP-006', title: 'Cleaning Validation', category: 'GMP', description: 'Validation of cleaning procedures for manufacturing equipment.', keywords: ['cleaning', 'validation', 'residue', 'carryover', 'maco'] },
  { sopNumber: 'GMP-007', title: 'Environmental Monitoring', category: 'GMP', description: 'Environmental monitoring program for controlled manufacturing areas.', keywords: ['environmental', 'monitoring', 'em', 'viable', 'non-viable', 'cleanroom'] },
  { sopNumber: 'GMP-008', title: 'Stability Program', category: 'GMP', description: 'Stability testing program for drug products and drug substances.', keywords: ['stability', 'testing', 'ich', 'shelf-life', 'accelerated'] },
  { sopNumber: 'GMP-009', title: 'Laboratory Controls', category: 'GMP', description: 'QC laboratory operations including sampling, testing, and results review.', keywords: ['laboratory', 'qc', 'testing', 'analytical', 'results'] },
  { sopNumber: 'GMP-010', title: 'OOS Investigation', category: 'GMP', description: 'Investigation and resolution of Out-of-Specification test results.', keywords: ['oos', 'investigation', 'out-of-specification', 'laboratory', 'failure'] },
  { sopNumber: 'GMP-011', title: 'Batch Release', category: 'GMP', description: 'QA review and release of finished product batches for distribution.', keywords: ['batch', 'release', 'qa', 'review', 'disposition'] },
  { sopNumber: 'GMP-012', title: 'Reprocessing and Rework', category: 'GMP', description: 'Control of reprocessing and rework operations for non-conforming batches.', keywords: ['reprocessing', 'rework', 'recovery', 'non-conforming'] },
  { sopNumber: 'GMP-013', title: 'Annual Product Review', category: 'GMP', description: 'Annual product quality review and trending analysis.', keywords: ['apr', 'annual', 'product', 'review', 'trend', 'pqr'] },
  { sopNumber: 'GMP-014', title: 'Contract Manufacturing', category: 'GMP', description: 'Oversight and quality agreements for contract manufacturing operations.', keywords: ['contract', 'manufacturing', 'cmo', 'oversight', 'agreement'] },

  // Good Distribution Practice (GDP) - 8 SOPs
  { sopNumber: 'GDP-001', title: 'Warehouse Operations', category: 'GDP', description: 'Receipt, storage, and handling of pharmaceutical products in warehouses.', keywords: ['warehouse', 'storage', 'receipt', 'handling', 'inventory'] },
  { sopNumber: 'GDP-002', title: 'Cold Chain Management', category: 'GDP', description: 'Management of temperature-controlled storage and distribution.', keywords: ['cold', 'chain', 'temperature', 'refrigerated', 'frozen'] },
  { sopNumber: 'GDP-003', title: 'Transportation Qualification', category: 'GDP', description: 'Qualification of transportation lanes, vehicles, and shipping containers.', keywords: ['transportation', 'qualification', 'lane', 'shipping', 'vehicle'] },
  { sopNumber: 'GDP-004', title: 'Order Processing and Dispatch', category: 'GDP', description: 'Processing of customer orders and dispatch of pharmaceutical products.', keywords: ['order', 'dispatch', 'picking', 'packing', 'shipping'] },
  { sopNumber: 'GDP-005', title: 'Returns Processing', category: 'GDP', description: 'Handling and disposition of returned pharmaceutical products.', keywords: ['returns', 'processing', 'disposition', 'saleable', 'destruction'] },
  { sopNumber: 'GDP-006', title: 'Serialization and Track-Trace', category: 'GDP', description: 'Implementation of serialization and track-and-trace requirements.', keywords: ['serialization', 'track', 'trace', 'dscsa', 'fmd'] },
  { sopNumber: 'GDP-007', title: 'Counterfeit Prevention', category: 'GDP', description: 'Prevention and detection of counterfeit and falsified medicines.', keywords: ['counterfeit', 'falsified', 'prevention', 'detection', 'authentication'] },
  { sopNumber: 'GDP-008', title: 'Distribution Record Retention', category: 'GDP', description: 'Retention and retrieval of distribution records for traceability.', keywords: ['record', 'retention', 'traceability', 'distribution', 'archive'] },

  // Regulatory Affairs (REG) - 8 SOPs
  { sopNumber: 'REG-001', title: 'eCTD Compilation', category: 'REG', description: 'Compilation and quality control of eCTD submissions.', keywords: ['ectd', 'compilation', 'submission', 'ctd', 'module'] },
  { sopNumber: 'REG-002', title: 'IND/NDA Lifecycle', category: 'REG', description: 'Management of IND and NDA/BLA application lifecycle.', keywords: ['ind', 'nda', 'bla', 'lifecycle', 'application', 'amendment'] },
  { sopNumber: 'REG-003', title: 'Health Authority Questions', category: 'REG', description: 'Management and response to health authority questions and information requests.', keywords: ['haq', 'question', 'health', 'authority', 'response', 'ir'] },
  { sopNumber: 'REG-004', title: 'Variation Management', category: 'REG', description: 'Classification and submission of post-approval variations.', keywords: ['variation', 'change', 'supplement', 'cbea', 'prior approval'] },
  { sopNumber: 'REG-005', title: 'Labeling Management', category: 'REG', description: 'Development, review, and maintenance of product labeling.', keywords: ['labeling', 'label', 'pi', 'pil', 'smpc', 'uspi'] },
  { sopNumber: 'REG-006', title: 'Regulatory Intelligence', category: 'REG', description: 'Monitoring and assessment of regulatory changes and guidance.', keywords: ['intelligence', 'regulatory', 'guidance', 'monitoring', 'impact'] },
  { sopNumber: 'REG-007', title: 'Product Registration', category: 'REG', description: 'Registration of pharmaceutical products in target markets.', keywords: ['registration', 'market', 'authorization', 'approval', 'filing'] },
  { sopNumber: 'REG-008', title: 'Regulatory Commitments', category: 'REG', description: 'Tracking and fulfillment of regulatory commitments and conditions.', keywords: ['commitment', 'condition', 'post-approval', 'tracking', 'fulfillment'] },
];

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

export interface ISOPLibraryService {
  // CRUD
  getAll(): SOPDocument[];
  getById(id: string): SOPDocument | null;
  getBySOPNumber(sopNumber: string): SOPDocument | null;
  create(sop: Partial<SOPDocument>): SOPDocument;
  update(id: string, updates: Partial<SOPDocument>): SOPDocument | null;
  delete(id: string): boolean;

  // Search & Filter
  search(query: string): SOPDocument[];
  filter(filter: SOPFilter): SOPDocument[];
  sort(sops: SOPDocument[], sort: SOPSort): SOPDocument[];

  // Categories
  getByCategory(category: SOPCategory): SOPDocument[];
  getCategories(): SOPCategory[];
  getCategoryStats(): Record<SOPCategory, number>;

  // Status
  getByStatus(status: SOPStatus): SOPDocument[];
  updateStatus(id: string, status: SOPStatus, userId: string): SOPDocument | null;

  // Training
  assignTraining(sopId: string, userId: string, userName: string, dueDate: Date): TrainingAssignment | null;
  completeTraining(sopId: string, assignmentId: string, score?: number): boolean;
  getTrainingStatus(sopId: string): TrainingAssignment[];
  getOverdueTraining(): { sop: SOPDocument; assignment: TrainingAssignment }[];

  // Statistics
  getStats(): SOPLibraryStats;
  getPendingReview(): SOPDocument[];
  getOverdueReview(): SOPDocument[];

  // Versioning
  createNewVersion(id: string, version: string, reason: string, changes: string, author: string): SOPDocument | null;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class SOPLibraryService implements ISOPLibraryService {
  private sops: Map<string, SOPDocument> = new Map();
  private sopsByNumber: Map<string, string> = new Map(); // sopNumber -> id

  constructor() {
    this.initializeBundledSOPs();
  }

  /**
   * Initialize library with bundled SOPs
   */
  private initializeBundledSOPs(): void {
    const effectiveDate = new Date('2026-01-08');
    const reviewDate = new Date('2027-01-08'); // 1 year review cycle

    for (const def of BUNDLED_SOPS) {
      const id = `sop-${def.sopNumber.toLowerCase().replace('-', '')}`;
      
      const sop: SOPDocument = {
        id,
        sopNumber: def.sopNumber,
        category: def.category,
        title: def.title,
        description: def.description,
        version: '1.0',
        status: 'effective',
        effectiveDate,
        reviewDueDate: reviewDate,
        nextReviewDate: reviewDate,
        department: this.getDepartmentForCategory(def.category),
        owner: 'Quality Assurance',
        author: 'Ligature SOP Team',
        approvers: [
          { name: 'Author', role: 'author', department: 'QA', status: 'approved', signedAt: effectiveDate },
          { name: 'Reviewer', role: 'reviewer', department: 'QA', status: 'approved', signedAt: effectiveDate },
          { name: 'QA Approver', role: 'qa_approver', department: 'QA', status: 'approved', signedAt: effectiveDate },
        ],
        keywords: def.keywords,
        relatedSOPs: [],
        fileRef: `/sops/${def.sopNumber}-${def.title.replace(/[^a-zA-Z0-9]/g, '-')}-v1.0.docx`,
        trainingRequired: true,
        trainingAssignments: [],
        versionHistory: [
          {
            version: '1.0',
            effectiveDate,
            reason: 'Initial release',
            changes: 'Initial version of SOP',
            author: 'Ligature SOP Team',
            approvedBy: 'QA Director',
            approvedAt: effectiveDate,
          },
        ],
        auditTrail: [
          {
            id: `audit-${id}-1`,
            timestamp: effectiveDate,
            user: 'System',
            action: 'SOP Created',
            details: `${def.sopNumber} ${def.title} v1.0 created from Ligature SOP Suite`,
          },
        ],
        metadata: {
          createdAt: effectiveDate,
          createdBy: 'Ligature SOP Suite',
          modifiedAt: effectiveDate,
          modifiedBy: 'Ligature SOP Suite',
          tags: [def.category, ...def.keywords.slice(0, 3)],
          language: 'en',
        },
      };

      this.sops.set(id, sop);
      this.sopsByNumber.set(def.sopNumber, id);
    }
  }

  private getDepartmentForCategory(category: SOPCategory): string {
    const departments: Record<SOPCategory, string> = {
      QS: 'Quality Assurance',
      CS: 'IT/Validation',
      GCP: 'Clinical Operations',
      GVP: 'Drug Safety',
      GLP: 'Nonclinical',
      GMP: 'Manufacturing',
      GDP: 'Supply Chain',
      REG: 'Regulatory Affairs',
    };
    return departments[category];
  }

  // CRUD Operations
  getAll(): SOPDocument[] {
    return Array.from(this.sops.values()).sort(sortBySOPNumber);
  }

  getById(id: string): SOPDocument | null {
    return this.sops.get(id) || null;
  }

  getBySOPNumber(sopNumber: string): SOPDocument | null {
    const id = this.sopsByNumber.get(sopNumber);
    return id ? this.sops.get(id) || null : null;
  }

  create(sopData: Partial<SOPDocument>): SOPDocument {
    const id = `sop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sop: SOPDocument = {
      id,
      sopNumber: sopData.sopNumber || 'NEW-001',
      category: sopData.category || 'QS',
      title: sopData.title || 'Untitled SOP',
      description: sopData.description || '',
      version: sopData.version || '0.1',
      status: 'draft',
      department: sopData.department || 'Quality Assurance',
      owner: sopData.owner || '',
      author: sopData.author || '',
      approvers: sopData.approvers || [],
      keywords: sopData.keywords || [],
      relatedSOPs: sopData.relatedSOPs || [],
      trainingRequired: sopData.trainingRequired ?? true,
      trainingAssignments: [],
      versionHistory: [],
      auditTrail: [
        {
          id: `audit-${id}-1`,
          timestamp: now,
          user: sopData.author || 'Unknown',
          action: 'SOP Created',
          details: `New SOP created: ${sopData.title || 'Untitled'}`,
        },
      ],
      metadata: {
        createdAt: now,
        createdBy: sopData.author || 'Unknown',
        modifiedAt: now,
        modifiedBy: sopData.author || 'Unknown',
        tags: sopData.metadata?.tags || [],
        language: 'en',
      },
    };

    this.sops.set(id, sop);
    this.sopsByNumber.set(sop.sopNumber, id);
    return sop;
  }

  update(id: string, updates: Partial<SOPDocument>): SOPDocument | null {
    const sop = this.sops.get(id);
    if (!sop) return null;

    const updatedSOP: SOPDocument = {
      ...sop,
      ...updates,
      metadata: {
        ...sop.metadata,
        modifiedAt: new Date(),
        modifiedBy: updates.metadata?.modifiedBy || sop.metadata.modifiedBy,
      },
    };

    this.sops.set(id, updatedSOP);
    return updatedSOP;
  }

  delete(id: string): boolean {
    const sop = this.sops.get(id);
    if (!sop) return false;

    this.sopsByNumber.delete(sop.sopNumber);
    this.sops.delete(id);
    return true;
  }

  // Search & Filter
  search(query: string): SOPDocument[] {
    const q = query.toLowerCase();
    return this.getAll().filter(sop =>
      sop.sopNumber.toLowerCase().includes(q) ||
      sop.title.toLowerCase().includes(q) ||
      sop.description.toLowerCase().includes(q) ||
      sop.keywords.some(k => k.toLowerCase().includes(q))
    );
  }

  filter(filter: SOPFilter): SOPDocument[] {
    let results = this.getAll();

    if (filter.category) {
      const cats = Array.isArray(filter.category) ? filter.category : [filter.category];
      results = results.filter(sop => cats.includes(sop.category));
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(sop => statuses.includes(sop.status));
    }

    if (filter.department) {
      results = results.filter(sop => sop.department === filter.department);
    }

    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      results = results.filter(sop =>
        sop.keywords.some(k => k.toLowerCase().includes(kw))
      );
    }

    if (filter.trainingRequired !== undefined) {
      results = results.filter(sop => sop.trainingRequired === filter.trainingRequired);
    }

    if (filter.reviewDueBefore) {
      results = results.filter(sop =>
        sop.reviewDueDate && sop.reviewDueDate < filter.reviewDueBefore!
      );
    }

    return results;
  }

  sort(sops: SOPDocument[], sort: SOPSort): SOPDocument[] {
    return [...sops].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'sopNumber':
          comparison = sortBySOPNumber(a, b);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'effectiveDate':
          comparison = (a.effectiveDate?.getTime() || 0) - (b.effectiveDate?.getTime() || 0);
          break;
        case 'reviewDueDate':
          comparison = (a.reviewDueDate?.getTime() || 0) - (b.reviewDueDate?.getTime() || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  // Categories
  getByCategory(category: SOPCategory): SOPDocument[] {
    return this.getAll().filter(sop => sop.category === category);
  }

  getCategories(): SOPCategory[] {
    return Object.keys(SOP_CATEGORIES) as SOPCategory[];
  }

  getCategoryStats(): Record<SOPCategory, number> {
    const stats: Record<SOPCategory, number> = {
      QS: 0, CS: 0, GCP: 0, GVP: 0, GLP: 0, GMP: 0, GDP: 0, REG: 0,
    };

    for (const sop of Array.from(Array.from(Array.from(Array.from(this.sops.values()))))) {
      stats[sop.category]++;
    }

    return stats;
  }

  // Status
  getByStatus(status: SOPStatus): SOPDocument[] {
    return this.getAll().filter(sop => sop.status === status);
  }

  updateStatus(id: string, status: SOPStatus, userId: string): SOPDocument | null {
    const sop = this.sops.get(id);
    if (!sop) return null;

    const now = new Date();
    const updated: SOPDocument = {
      ...sop,
      status,
      auditTrail: [
        ...sop.auditTrail,
        {
          id: `audit-${id}-${sop.auditTrail.length + 1}`,
          timestamp: now,
          user: userId,
          action: 'Status Changed',
          details: `Status changed from ${sop.status} to ${status}`,
          previousValue: sop.status,
          newValue: status,
        },
      ],
      metadata: {
        ...sop.metadata,
        modifiedAt: now,
        modifiedBy: userId,
      },
    };

    this.sops.set(id, updated);
    return updated;
  }

  // Training
  assignTraining(sopId: string, userId: string, userName: string, dueDate: Date): TrainingAssignment | null {
    const sop = this.sops.get(sopId);
    if (!sop) return null;

    const assignment: TrainingAssignment = {
      id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      assignedAt: new Date(),
      dueDate,
      status: 'assigned',
    };

    sop.trainingAssignments = [...(sop.trainingAssignments || []), assignment];
    this.sops.set(sopId, sop);

    return assignment;
  }

  completeTraining(sopId: string, assignmentId: string, score?: number): boolean {
    const sop = this.sops.get(sopId);
    if (!sop || !sop.trainingAssignments) return false;

    const idx = sop.trainingAssignments.findIndex(a => a.id === assignmentId);
    if (idx === -1) return false;

    sop.trainingAssignments[idx] = {
      ...sop.trainingAssignments[idx],
      status: 'completed',
      completedAt: new Date(),
      score,
    };

    this.sops.set(sopId, sop);
    return true;
  }

  getTrainingStatus(sopId: string): TrainingAssignment[] {
    const sop = this.sops.get(sopId);
    return sop?.trainingAssignments || [];
  }

  getOverdueTraining(): { sop: SOPDocument; assignment: TrainingAssignment }[] {
    const overdue: { sop: SOPDocument; assignment: TrainingAssignment }[] = [];
    const now = new Date();

    for (const sop of Array.from(Array.from(Array.from(Array.from(this.sops.values()))))) {
      if (!sop.trainingAssignments) continue;

      for (const assignment of sop.trainingAssignments) {
        if (assignment.status !== 'completed' && assignment.status !== 'waived' && assignment.dueDate < now) {
          overdue.push({ sop, assignment: { ...assignment, status: 'overdue' } });
        }
      }
    }

    return overdue;
  }

  // Statistics
  getStats(): SOPLibraryStats {
    const sops = this.getAll();
    const now = new Date();

    const byCategory = this.getCategoryStats();

    const byStatus: Record<SOPStatus, number> = {
      draft: 0, in_review: 0, pending_approval: 0, approved: 0,
      effective: 0, superseded: 0, retired: 0, archived: 0,
    };
    for (const sop of sops) {
      byStatus[sop.status]++;
    }

    const pendingReview = sops.filter(sop =>
      sop.status === 'in_review' || sop.status === 'pending_approval'
    ).length;

    const overdueReview = sops.filter(sop =>
      sop.reviewDueDate && sop.reviewDueDate < now && sop.status === 'effective'
    ).length;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentlyUpdated = sops.filter(sop =>
      sop.metadata.modifiedAt > thirtyDaysAgo
    ).length;

    const trainingOverdue = this.getOverdueTraining().length;

    return {
      total: sops.length,
      byCategory,
      byStatus,
      pendingReview,
      overdueReview,
      trainingOverdue,
      recentlyUpdated,
    };
  }

  getPendingReview(): SOPDocument[] {
    return this.getAll().filter(sop =>
      sop.status === 'in_review' || sop.status === 'pending_approval'
    );
  }

  getOverdueReview(): SOPDocument[] {
    const now = new Date();
    return this.getAll().filter(sop =>
      sop.reviewDueDate && sop.reviewDueDate < now && sop.status === 'effective'
    );
  }

  // Versioning
  createNewVersion(
    id: string,
    version: string,
    reason: string,
    changes: string,
    author: string
  ): SOPDocument | null {
    const sop = this.sops.get(id);
    if (!sop) return null;

    const now = new Date();

    const newVersion: SOPVersion = {
      version,
      effectiveDate: now,
      reason,
      changes,
      author,
      approvedBy: '',
      approvedAt: now,
    };

    const updated: SOPDocument = {
      ...sop,
      version,
      status: 'draft',
      versionHistory: [...sop.versionHistory, newVersion],
      auditTrail: [
        ...sop.auditTrail,
        {
          id: `audit-${id}-${sop.auditTrail.length + 1}`,
          timestamp: now,
          user: author,
          action: 'New Version Created',
          details: `Version ${version} created: ${reason}`,
          previousValue: sop.version,
          newValue: version,
        },
      ],
      metadata: {
        ...sop.metadata,
        modifiedAt: now,
        modifiedBy: author,
      },
    };

    this.sops.set(id, updated);
    return updated;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let serviceInstance: SOPLibraryService | null = null;

export function getSOPLibraryService(): SOPLibraryService {
  if (!serviceInstance) {
    serviceInstance = new SOPLibraryService();
  }
  return serviceInstance;
}

export function createSOPLibraryService(): SOPLibraryService {
  return new SOPLibraryService();
}

export function resetSOPLibraryService(): void {
  serviceInstance = null;
}
