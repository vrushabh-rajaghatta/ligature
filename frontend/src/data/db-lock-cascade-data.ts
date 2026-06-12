// Database Lock Cascade Data - v0.6.1
// "The database locks. Within 45 seconds, 38 downstream actions are activated."
// This is the second R&D Connected cascade - Clinical → Regulatory in real-time.

// ============================================================================
// DB LOCK CASCADE ACTION TYPES
// ============================================================================

export type DBLockCascadeCategory = 
  | 'db-lock'              // Database lock event and verification
  | 'data-validation'      // SDTM/ADaM validation, stats packages
  | 'csr-generation'       // CSR authoring triggered, TLFs queued
  | 'regulatory-timeline'  // Submission dates confirmed
  | 'document-finalization'// Module 2 summaries, safety updates
  | 'submission-prep'      // eCTD assembly, QC workflows
  | 'haq-readiness'        // Anticipated questions
  | 'partner-notification' // CRO handoffs, vendor alerts
  | 'quality-readiness'    // Audit trail, compliance
  | 'post-lock-monitoring';// Ongoing integrity

export type DBLockActionStatus = 
  | 'triggered'           // Action initiated automatically
  | 'in-progress'         // Being processed
  | 'pending-review'      // Awaiting human decision
  | 'completed'           // Action completed
  | 'validated'           // Validation passed
  | 'blocked';            // Requires prerequisite

export type DBLockActionPriority = 'critical' | 'high' | 'standard' | 'low';

export type DBLockLinkedModule = 
  | 'clinical' | 'ctms' | 'authoring' | 'submissions-hub' | 'publishing'
  | 'haq' | 'qms' | 'safety' | 'regulatory' | 'tmf';

export interface DBLockCascadeAction {
  id: string;
  lockEventId: string;
  category: DBLockCascadeCategory;
  title: string;
  description: string;
  status: DBLockActionStatus;
  priority: DBLockActionPriority;
  linkedModule: DBLockLinkedModule;
  linkedRecordId?: string;
  linkedRecordType?: string;
  triggeredAt: string;
  completedAt?: string;
  assignedTo?: string;
  dueDate?: string;
  automatedAction: boolean;
  requiresApproval: boolean;
  prerequisiteActionIds?: string[];
  outputArtifacts?: string[];
  notes?: string;
}

export interface DBLockStageSummary {
  category: DBLockCascadeCategory;
  label: string;
  description: string;
  icon: string;
  totalActions: number;
  completedActions: number;
  inProgressActions: number;
  pendingActions: number;
  criticalCount: number;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  estimatedDuration?: string;
}

export interface DBLockCascade {
  id: string;
  lockEventId: string;
  lockEventCode: string;
  studyId: string;
  studyName: string;
  studyPhase: string;
  productId: string;
  productName: string;
  databaseType: 'primary' | 'interim' | 'final';
  triggeredAt: string;
  lastUpdated: string;
  totalActions: number;
  completedActions: number;
  automatedActions: number;
  manualActions: number;
  estimatedSubmissionDate: string;
  stages: DBLockStageSummary[];
  actions: DBLockCascadeAction[];
  crossModuleLinks: DBLockCrossModuleLink[];
}

export interface DBLockCrossModuleLink {
  id: string;
  sourceModule: DBLockLinkedModule;
  sourceRecordId: string;
  sourceRecordType: string;
  targetModule: DBLockLinkedModule;
  targetRecordId: string;
  targetRecordType: string;
  linkType: 'triggers' | 'validates' | 'generates' | 'requires';
  createdAt: string;
  automated: boolean;
}

// ============================================================================
// DB LOCK CATEGORY METADATA
// ============================================================================

export const dbLockCategoryMeta: Record<DBLockCascadeCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}> = {
  'db-lock': {
    label: 'Database Lock',
    description: 'Lock verification, data freeze confirmation, audit trail sealed',
    icon: 'Database',
    color: 'green',
    order: 1,
  },
  'data-validation': {
    label: 'Data Validation',
    description: 'SDTM/ADaM datasets validated, stats packages verified',
    icon: 'CheckCircle',
    color: 'blue',
    order: 2,
  },
  'csr-generation': {
    label: 'CSR Generation',
    description: 'CSR authoring initiated, TLFs queued, efficacy tables generated',
    icon: 'FileText',
    color: 'purple',
    order: 3,
  },
  'regulatory-timeline': {
    label: 'Regulatory Timeline',
    description: 'Submission dates confirmed, sequence planning triggered',
    icon: 'Calendar',
    color: 'amber',
    order: 4,
  },
  'document-finalization': {
    label: 'Document Finalization',
    description: 'Module 2 summaries queued, PBRER/PSUR updates triggered',
    icon: 'FileCheck',
    color: 'indigo',
    order: 5,
  },
  'submission-prep': {
    label: 'Submission Prep',
    description: 'eCTD assembly initiated, publishing QC workflows started',
    icon: 'Package',
    color: 'cyan',
    order: 6,
  },
  'haq-readiness': {
    label: 'HAQ Readiness',
    description: 'Anticipated questions pre-populated, response templates ready',
    icon: 'MessageSquare',
    color: 'pink',
    order: 7,
  },
  'partner-notification': {
    label: 'Partner Alerts',
    description: 'CRO deliverables confirmed, vendor timelines locked',
    icon: 'Users',
    color: 'orange',
    order: 8,
  },
  'quality-readiness': {
    label: 'Quality Readiness',
    description: 'Audit trail verified, compliance checks complete',
    icon: 'Shield',
    color: 'emerald',
    order: 9,
  },
  'post-lock-monitoring': {
    label: 'Post-Lock Monitoring',
    description: 'Data integrity tracking, amendment protocols active',
    icon: 'Activity',
    color: 'gray',
    order: 10,
  },
};

// ============================================================================
// DEMO DATA - DB-LOCK-2026-001 ILLUMINATE TRIAL CASCADE
// ============================================================================

export const illuminateDBLockActions: DBLockCascadeAction[] = [
  // === DATABASE LOCK (Complete) ===
  {
    id: 'dbl-001',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'db-lock',
    title: 'Database lock initiated',
    description: 'ILLUMINATE Phase 3 trial database locked - final analysis population',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'clinical',
    linkedRecordId: 'STUDY-LIG2847-P3',
    linkedRecordType: 'study',
    triggeredAt: '2026-01-02T09:00:00Z',
    completedAt: '2026-01-02T09:00:00Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'dbl-002',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'db-lock',
    title: 'Edit checks finalized',
    description: '847 edit checks executed, 0 critical queries remaining',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'clinical',
    linkedRecordId: 'STUDY-LIG2847-P3',
    linkedRecordType: 'edit-checks',
    triggeredAt: '2026-01-02T09:00:05Z',
    completedAt: '2026-01-02T09:00:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Edit Check Summary Report'],
  },
  {
    id: 'dbl-003',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'db-lock',
    title: 'Audit trail sealed',
    description: '21 CFR Part 11 compliant audit trail archived and locked',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    linkedRecordId: 'AUDIT-ILLUMINATE-001',
    linkedRecordType: 'audit-trail',
    triggeredAt: '2026-01-02T09:00:35Z',
    completedAt: '2026-01-02T09:00:45Z',
    assignedTo: 'System',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Sealed Audit Trail Certificate'],
  },

  // === DATA VALIDATION (Complete) ===
  {
    id: 'dbl-004',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'data-validation',
    title: 'SDTM datasets validated',
    description: 'All SDTM domains passed FDA Validator - 0 errors, 3 warnings (accepted)',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'clinical',
    linkedRecordId: 'SDTM-LIG2847-001',
    linkedRecordType: 'dataset-package',
    triggeredAt: '2026-01-02T09:01:00Z',
    completedAt: '2026-01-02T09:05:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['SDTM Validation Report', 'Pinnacle 21 Report'],
  },
  {
    id: 'dbl-005',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'data-validation',
    title: 'ADaM datasets generated',
    description: 'ADSL, ADAE, ADTTE, ADEFF datasets auto-generated from SDTM',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'clinical',
    linkedRecordId: 'ADAM-LIG2847-001',
    linkedRecordType: 'dataset-package',
    triggeredAt: '2026-01-02T09:05:05Z',
    completedAt: '2026-01-02T09:15:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['ADaM Datasets', 'Define.xml'],
  },
  {
    id: 'dbl-006',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'data-validation',
    title: 'Statistical analysis validated',
    description: 'SAP v3.0 analysis validated against pre-specified endpoints',
    status: 'completed',
    priority: 'high',
    linkedModule: 'clinical',
    linkedRecordId: 'SAP-LIG2847-003',
    linkedRecordType: 'analysis-plan',
    triggeredAt: '2026-01-02T09:15:05Z',
    completedAt: '2026-01-02T09:25:00Z',
    automatedAction: true,
    requiresApproval: true,
    outputArtifacts: ['SAP Compliance Certificate'],
  },
  {
    id: 'dbl-007',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'data-validation',
    title: 'Define.xml compliance verified',
    description: 'Define.xml v2.1 passed all CDISC conformance rules',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'clinical',
    triggeredAt: '2026-01-02T09:25:05Z',
    completedAt: '2026-01-02T09:28:00Z',
    automatedAction: true,
    requiresApproval: false,
  },

  // === CSR GENERATION (In Progress) ===
  {
    id: 'dbl-008',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'csr-generation',
    title: 'CSR shell activated',
    description: 'Clinical Study Report template initiated with efficacy/safety sections',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-CSR-LIG2847-001',
    linkedRecordType: 'csr',
    triggeredAt: '2026-01-02T09:00:45Z',
    completedAt: '2026-01-02T09:01:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['CSR Shell v1.0'],
  },
  {
    id: 'dbl-009',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'csr-generation',
    title: 'TLFs queued for generation',
    description: '156 Tables, Listings, and Figures queued from analysis outputs',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'TLF-PACKAGE-001',
    linkedRecordType: 'tlf-package',
    triggeredAt: '2026-01-02T09:28:05Z',
    dueDate: '2026-01-05T17:00:00Z',
    assignedTo: 'Statistics Team',
    automatedAction: true,
    requiresApproval: true,
    notes: '87/156 TLFs generated, QC in progress',
  },
  {
    id: 'dbl-010',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'csr-generation',
    title: 'Efficacy Section 11 draft initiated',
    description: 'Primary endpoint results auto-populated from validated analysis',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-CSR-LIG2847-001',
    linkedRecordType: 'csr-section',
    triggeredAt: '2026-01-02T09:30:00Z',
    dueDate: '2026-01-08T17:00:00Z',
    assignedTo: 'Dr. Maria Santos',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-011',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'csr-generation',
    title: 'Safety Section 12 draft initiated',
    description: 'AE tables linked, narratives queued for 47 SAEs',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-CSR-LIG2847-001',
    linkedRecordType: 'csr-section',
    triggeredAt: '2026-01-02T09:30:05Z',
    dueDate: '2026-01-10T17:00:00Z',
    assignedTo: 'Dr. James Wilson',
    automatedAction: false,
    requiresApproval: true,
  },

  // === REGULATORY TIMELINE (In Progress) ===
  {
    id: 'dbl-012',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'regulatory-timeline',
    title: 'FDA submission date confirmed',
    description: 'NDA submission target: March 15, 2026 - 73 days from lock',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'regulatory',
    linkedRecordId: 'SUB-NDA-LIG2847-001',
    linkedRecordType: 'submission',
    triggeredAt: '2026-01-02T09:00:50Z',
    completedAt: '2026-01-02T09:01:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Submission Timeline v2.0'],
  },
  {
    id: 'dbl-013',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'regulatory-timeline',
    title: 'EMA parallel filing assessed',
    description: 'MAA timeline aligned for Q2 2026 submission post-FDA acceptance',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'regulatory',
    linkedRecordId: 'SUB-MAA-LIG2847-001',
    linkedRecordType: 'submission',
    triggeredAt: '2026-01-02T09:01:05Z',
    dueDate: '2026-01-09T17:00:00Z',
    assignedTo: 'EU Regulatory Lead',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-014',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'regulatory-timeline',
    title: 'eCTD sequence planned',
    description: 'Sequence 0004 (final efficacy data) planned for Module 5',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'submissions-hub',
    linkedRecordId: 'SEQ-0004-LIG2847',
    linkedRecordType: 'sequence',
    triggeredAt: '2026-01-02T09:01:10Z',
    dueDate: '2026-01-15T17:00:00Z',
    assignedTo: 'Publishing Team',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'dbl-015',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'regulatory-timeline',
    title: 'Pre-NDA meeting request prepared',
    description: 'Type A meeting request drafted with clinical data package overview',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'regulatory',
    linkedRecordId: 'MEET-FDA-TYPE-A-001',
    linkedRecordType: 'meeting-request',
    triggeredAt: '2026-01-02T09:01:15Z',
    dueDate: '2026-01-06T17:00:00Z',
    assignedTo: 'VP Regulatory',
    automatedAction: false,
    requiresApproval: true,
  },

  // === DOCUMENT FINALIZATION (In Progress) ===
  {
    id: 'dbl-016',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'document-finalization',
    title: 'Module 2.5 Clinical Overview queued',
    description: 'Clinical Overview draft triggered from CSR efficacy conclusions',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-M25-LIG2847-001',
    linkedRecordType: 'ctd-document',
    triggeredAt: '2026-01-02T09:35:00Z',
    dueDate: '2026-01-20T17:00:00Z',
    assignedTo: 'Dr. Sarah Chen',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-017',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'document-finalization',
    title: 'Module 2.7.3 Summary of Clinical Efficacy updated',
    description: 'Efficacy summary linked to final ILLUMINATE data',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-M273-LIG2847-001',
    linkedRecordType: 'ctd-document',
    triggeredAt: '2026-01-02T09:35:05Z',
    dueDate: '2026-01-22T17:00:00Z',
    assignedTo: 'Medical Writing Lead',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-018',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'document-finalization',
    title: 'PBRER Section 16 triggered',
    description: 'Benefit-Risk analysis section flagged for final efficacy data integration',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'safety',
    linkedRecordId: 'DOC-PBRER-LIG2847-002',
    linkedRecordType: 'periodic-report',
    triggeredAt: '2026-01-02T09:35:10Z',
    dueDate: '2026-01-25T17:00:00Z',
    assignedTo: 'PV Lead',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'dbl-019',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'document-finalization',
    title: 'IB Amendment initiated',
    description: 'Investigator\'s Brochure amendment for final efficacy data',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-IB-LIG2847-004',
    linkedRecordType: 'ib',
    triggeredAt: '2026-01-02T09:35:15Z',
    dueDate: '2026-01-30T17:00:00Z',
    assignedTo: 'Medical Affairs',
    automatedAction: false,
    requiresApproval: true,
  },

  // === SUBMISSION PREP (Pending) ===
  {
    id: 'dbl-020',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'submission-prep',
    title: 'eCTD backbone generation started',
    description: 'Module 5.3.5 backbone created with study reports folder structure',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'publishing',
    linkedRecordId: 'ECTD-BACKBONE-0004',
    linkedRecordType: 'backbone',
    triggeredAt: '2026-01-02T09:40:00Z',
    dueDate: '2026-01-12T17:00:00Z',
    assignedTo: 'eCTD Specialist',
    automatedAction: true,
    requiresApproval: true,
    outputArtifacts: ['Backbone Structure Draft'],
  },
  {
    id: 'dbl-021',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'submission-prep',
    title: 'PDF/A conversion queued',
    description: '847 documents queued for PDF/A-2b conversion and hyperlink validation',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'publishing',
    linkedRecordId: 'CONV-BATCH-001',
    linkedRecordType: 'conversion-batch',
    triggeredAt: '2026-01-02T09:40:05Z',
    dueDate: '2026-02-01T17:00:00Z',
    assignedTo: 'Publishing Team',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'dbl-022',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'submission-prep',
    title: 'Dataset packaging initiated',
    description: 'SDTM/ADaM packages prepared for Module 5.3.5.1 and 5.3.5.3',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'publishing',
    linkedRecordId: 'PKG-DATASETS-001',
    linkedRecordType: 'data-package',
    triggeredAt: '2026-01-02T09:40:10Z',
    dueDate: '2026-01-15T17:00:00Z',
    assignedTo: 'Data Management',
    automatedAction: true,
    requiresApproval: true,
    outputArtifacts: ['SDTM Package', 'ADaM Package'],
  },
  {
    id: 'dbl-023',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'submission-prep',
    title: 'QC workflow assigned',
    description: 'Two-pass QC workflow initiated for all Module 5 documents',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'WF-QC-MOD5-001',
    linkedRecordType: 'qc-workflow',
    triggeredAt: '2026-01-02T09:40:15Z',
    dueDate: '2026-02-15T17:00:00Z',
    assignedTo: 'QC Lead',
    automatedAction: true,
    requiresApproval: true,
  },

  // === HAQ READINESS (In Progress) ===
  {
    id: 'dbl-024',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'haq-readiness',
    title: 'Anticipated efficacy questions generated',
    description: '8 FDA-style questions pre-populated based on endpoint analysis',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-EFFICACY-001',
    linkedRecordType: 'haq-template',
    triggeredAt: '2026-01-02T09:45:00Z',
    completedAt: '2026-01-02T09:45:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['HAQ Template - Efficacy'],
  },
  {
    id: 'dbl-025',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'haq-readiness',
    title: 'Statistical methodology Q&A prepared',
    description: 'Response templates for SAP methodology questions',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-STATS-001',
    linkedRecordType: 'haq-template',
    triggeredAt: '2026-01-02T09:45:05Z',
    completedAt: '2026-01-02T09:45:35Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['HAQ Template - Statistics'],
  },
  {
    id: 'dbl-026',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'haq-readiness',
    title: 'Subgroup analysis templates ready',
    description: 'Pre-populated responses for demographic subgroup questions',
    status: 'in-progress',
    priority: 'low',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-SUBGROUP-001',
    linkedRecordType: 'haq-template',
    triggeredAt: '2026-01-02T09:45:10Z',
    assignedTo: 'Biostatistics',
    automatedAction: true,
    requiresApproval: true,
  },

  // === PARTNER NOTIFICATION (In Progress) ===
  {
    id: 'dbl-027',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'partner-notification',
    title: 'CRO database lock confirmed',
    description: 'PharmaTrials Inc. notified of lock, deliverables timeline confirmed',
    status: 'completed',
    priority: 'high',
    linkedModule: 'ctms',
    linkedRecordId: 'VENDOR-PHARMATRIALS-001',
    linkedRecordType: 'vendor',
    triggeredAt: '2026-01-02T09:00:55Z',
    completedAt: '2026-01-02T09:02:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['CRO Lock Confirmation Email'],
  },
  {
    id: 'dbl-028',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'partner-notification',
    title: 'Biostatistics vendor milestone triggered',
    description: 'QuantStats LLC milestone payment triggered for final analysis',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'ctms',
    linkedRecordId: 'VENDOR-QUANTSTATS-001',
    linkedRecordType: 'vendor-milestone',
    triggeredAt: '2026-01-02T09:01:00Z',
    completedAt: '2026-01-02T09:02:30Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'dbl-029',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'partner-notification',
    title: 'Publishing vendor alerted',
    description: 'RegPub Solutions notified of eCTD compilation timeline',
    status: 'in-progress',
    priority: 'standard',
    linkedModule: 'publishing',
    linkedRecordId: 'VENDOR-REGPUB-001',
    linkedRecordType: 'vendor',
    triggeredAt: '2026-01-02T09:45:20Z',
    assignedTo: 'Vendor Management',
    automatedAction: true,
    requiresApproval: false,
  },

  // === QUALITY READINESS (In Progress) ===
  {
    id: 'dbl-030',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'quality-readiness',
    title: 'TMF completeness verified',
    description: 'Trial Master File 98.7% complete, 4 artifacts pending',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'tmf',
    linkedRecordId: 'TMF-ILLUMINATE-001',
    linkedRecordType: 'tmf',
    triggeredAt: '2026-01-02T09:50:00Z',
    completedAt: '2026-01-02T09:52:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['TMF Completeness Report'],
  },
  {
    id: 'dbl-031',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'quality-readiness',
    title: 'Audit readiness assessment',
    description: 'Pre-submission audit checklist generated, 94% compliant',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'qms',
    linkedRecordId: 'AUDIT-PRESUB-001',
    linkedRecordType: 'audit-checklist',
    triggeredAt: '2026-01-02T09:52:05Z',
    dueDate: '2026-01-15T17:00:00Z',
    assignedTo: 'QA Director',
    automatedAction: true,
    requiresApproval: true,
    outputArtifacts: ['Audit Readiness Checklist'],
  },
  {
    id: 'dbl-032',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'quality-readiness',
    title: 'GCP compliance certificate requested',
    description: 'Good Clinical Practice compliance certificate for NDA submission',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'CERT-GCP-001',
    linkedRecordType: 'compliance-cert',
    triggeredAt: '2026-01-02T09:52:10Z',
    dueDate: '2026-02-01T17:00:00Z',
    assignedTo: 'Compliance Officer',
    automatedAction: false,
    requiresApproval: true,
  },

  // === POST-LOCK MONITORING (Pending) ===
  {
    id: 'dbl-033',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'post-lock-monitoring',
    title: 'Data integrity monitoring activated',
    description: 'Continuous integrity checks enabled for locked database',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'clinical',
    linkedRecordId: 'MONITOR-INTEGRITY-001',
    linkedRecordType: 'monitoring-rule',
    triggeredAt: '2026-01-02T09:55:00Z',
    completedAt: '2026-01-02T09:55:05Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'dbl-034',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'post-lock-monitoring',
    title: 'Amendment protocol established',
    description: 'Post-lock amendment procedures documented and approved',
    status: 'pending-review',
    priority: 'low',
    linkedModule: 'qms',
    linkedRecordId: 'SOP-POSTLOCK-001',
    linkedRecordType: 'sop',
    triggeredAt: '2026-01-02T09:55:10Z',
    dueDate: '2026-01-10T17:00:00Z',
    assignedTo: 'Data Management Lead',
    automatedAction: false,
    requiresApproval: true,
  },

  // Additional actions for richer cascade
  {
    id: 'dbl-035',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'data-validation',
    title: 'CDISC compliance report generated',
    description: 'Full CDISC compliance documentation for FDA submission',
    status: 'completed',
    priority: 'high',
    linkedModule: 'clinical',
    triggeredAt: '2026-01-02T09:28:10Z',
    completedAt: '2026-01-02T09:35:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['CDISC Compliance Report'],
  },
  {
    id: 'dbl-036',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'csr-generation',
    title: 'Patient narratives queued',
    description: '47 SAE narratives queued for medical writing',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'authoring',
    linkedRecordId: 'NAR-BATCH-001',
    linkedRecordType: 'narrative-batch',
    triggeredAt: '2026-01-02T09:40:00Z',
    dueDate: '2026-01-20T17:00:00Z',
    assignedTo: 'Medical Writing',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-037',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'regulatory-timeline',
    title: 'Japan PMDA timeline assessed',
    description: 'J-NDA submission feasibility for H2 2026',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'regulatory',
    linkedRecordId: 'SUB-JNDA-LIG2847-001',
    linkedRecordType: 'submission',
    triggeredAt: '2026-01-02T09:01:20Z',
    dueDate: '2026-01-31T17:00:00Z',
    assignedTo: 'Japan Regulatory Lead',
    automatedAction: false,
    requiresApproval: true,
  },
  {
    id: 'dbl-038',
    lockEventId: 'DB-LOCK-2026-001',
    category: 'haq-readiness',
    title: 'Missing data handling Q&A',
    description: 'Response templates for sensitivity analysis questions',
    status: 'pending-review',
    priority: 'low',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-MISSING-001',
    linkedRecordType: 'haq-template',
    triggeredAt: '2026-01-02T09:45:15Z',
    dueDate: '2026-01-20T17:00:00Z',
    assignedTo: 'Biostatistics Lead',
    automatedAction: false,
    requiresApproval: true,
  },
];

// ============================================================================
// AGGREGATE CASCADE DATA
// ============================================================================

export const illuminateDBLockCascade: DBLockCascade = {
  id: 'cascade-dblock-001',
  lockEventId: 'DB-LOCK-2026-001',
  lockEventCode: 'DB-LOCK-2026-001',
  studyId: 'STUDY-LIG2847-P3',
  studyName: 'ILLUMINATE Phase 3',
  studyPhase: 'Phase 3',
  productId: 'LIG-2847',
  productName: 'Nexavant (arbaclofen)',
  databaseType: 'final',
  triggeredAt: '2026-01-02T09:00:00Z',
  lastUpdated: '2026-01-02T09:55:10Z',
  totalActions: 38,
  completedActions: 16,
  automatedActions: 28,
  manualActions: 10,
  estimatedSubmissionDate: '2026-03-15',
  stages: [
    {
      category: 'db-lock',
      label: 'Database Lock',
      description: 'Lock verified, audit trail sealed',
      icon: 'Database',
      totalActions: 3,
      completedActions: 3,
      inProgressActions: 0,
      pendingActions: 0,
      criticalCount: 0,
      status: 'completed',
    },
    {
      category: 'data-validation',
      label: 'Data Validation',
      description: 'SDTM/ADaM validated, CDISC compliant',
      icon: 'CheckCircle',
      totalActions: 5,
      completedActions: 5,
      inProgressActions: 0,
      pendingActions: 0,
      criticalCount: 0,
      status: 'completed',
    },
    {
      category: 'csr-generation',
      label: 'CSR Generation',
      description: 'Shell active, TLFs 87/156, sections drafting',
      icon: 'FileText',
      totalActions: 5,
      completedActions: 1,
      inProgressActions: 3,
      pendingActions: 1,
      criticalCount: 4,
      status: 'in-progress',
    },
    {
      category: 'regulatory-timeline',
      label: 'Regulatory Timeline',
      description: 'FDA Mar 15, EMA Q2, sequences planned',
      icon: 'Calendar',
      totalActions: 5,
      completedActions: 1,
      inProgressActions: 2,
      pendingActions: 2,
      criticalCount: 1,
      status: 'in-progress',
    },
    {
      category: 'document-finalization',
      label: 'Document Finalization',
      description: 'M2.5, M2.7.3, PBRER queued',
      icon: 'FileCheck',
      totalActions: 4,
      completedActions: 0,
      inProgressActions: 1,
      pendingActions: 3,
      criticalCount: 2,
      status: 'in-progress',
    },
    {
      category: 'submission-prep',
      label: 'Submission Prep',
      description: 'eCTD backbone, PDF/A, datasets',
      icon: 'Package',
      totalActions: 4,
      completedActions: 0,
      inProgressActions: 2,
      pendingActions: 2,
      criticalCount: 1,
      status: 'in-progress',
    },
    {
      category: 'haq-readiness',
      label: 'HAQ Readiness',
      description: '8 efficacy questions pre-populated',
      icon: 'MessageSquare',
      totalActions: 4,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 0,
      status: 'in-progress',
    },
    {
      category: 'partner-notification',
      label: 'Partner Alerts',
      description: 'CRO confirmed, vendors notified',
      icon: 'Users',
      totalActions: 3,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 0,
      criticalCount: 0,
      status: 'in-progress',
    },
    {
      category: 'quality-readiness',
      label: 'Quality Readiness',
      description: 'TMF 98.7%, audit checklist active',
      icon: 'Shield',
      totalActions: 3,
      completedActions: 1,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 1,
      status: 'in-progress',
    },
    {
      category: 'post-lock-monitoring',
      label: 'Post-Lock Monitoring',
      description: 'Integrity monitoring active',
      icon: 'Activity',
      totalActions: 2,
      completedActions: 1,
      inProgressActions: 0,
      pendingActions: 1,
      criticalCount: 0,
      status: 'in-progress',
    },
  ],
  actions: illuminateDBLockActions,
  crossModuleLinks: [
    {
      id: 'link-dbl-001',
      sourceModule: 'clinical',
      sourceRecordId: 'DB-LOCK-2026-001',
      sourceRecordType: 'database-lock',
      targetModule: 'authoring',
      targetRecordId: 'DOC-CSR-LIG2847-001',
      targetRecordType: 'csr',
      linkType: 'triggers',
      createdAt: '2026-01-02T09:00:45Z',
      automated: true,
    },
    {
      id: 'link-dbl-002',
      sourceModule: 'clinical',
      sourceRecordId: 'DB-LOCK-2026-001',
      sourceRecordType: 'database-lock',
      targetModule: 'submissions-hub',
      targetRecordId: 'SUB-NDA-LIG2847-001',
      targetRecordType: 'submission',
      linkType: 'triggers',
      createdAt: '2026-01-02T09:00:50Z',
      automated: true,
    },
    {
      id: 'link-dbl-003',
      sourceModule: 'clinical',
      sourceRecordId: 'SDTM-LIG2847-001',
      sourceRecordType: 'dataset-package',
      targetModule: 'publishing',
      targetRecordId: 'ECTD-BACKBONE-0004',
      targetRecordType: 'backbone',
      linkType: 'generates',
      createdAt: '2026-01-02T09:40:00Z',
      automated: true,
    },
    {
      id: 'link-dbl-004',
      sourceModule: 'authoring',
      sourceRecordId: 'DOC-CSR-LIG2847-001',
      sourceRecordType: 'csr',
      targetModule: 'haq',
      targetRecordId: 'HAQ-TEMPLATE-EFFICACY-001',
      targetRecordType: 'haq-template',
      linkType: 'generates',
      createdAt: '2026-01-02T09:45:00Z',
      automated: true,
    },
    {
      id: 'link-dbl-005',
      sourceModule: 'clinical',
      sourceRecordId: 'DB-LOCK-2026-001',
      sourceRecordType: 'database-lock',
      targetModule: 'tmf',
      targetRecordId: 'TMF-ILLUMINATE-001',
      targetRecordType: 'tmf',
      linkType: 'validates',
      createdAt: '2026-01-02T09:50:00Z',
      automated: true,
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDBLockActionsByCategory(cascade: DBLockCascade, category: DBLockCascadeCategory): DBLockCascadeAction[] {
  return cascade.actions.filter(a => a.category === category);
}

export function getDBLockCascadeProgress(cascade: DBLockCascade): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentComplete: number;
} {
  const total = cascade.totalActions;
  const completed = cascade.actions.filter(a => a.status === 'completed' || a.status === 'validated').length;
  const inProgress = cascade.actions.filter(a => a.status === 'in-progress').length;
  const pending = cascade.actions.filter(a => a.status === 'pending-review' || a.status === 'triggered').length;
  
  return {
    total,
    completed,
    inProgress,
    pending,
    percentComplete: Math.round((completed / total) * 100),
  };
}

export function getDBLockCriticalActions(cascade: DBLockCascade): DBLockCascadeAction[] {
  return cascade.actions.filter(a => a.priority === 'critical' && a.status !== 'completed' && a.status !== 'validated');
}

export function getDBLockOverdueActions(cascade: DBLockCascade): DBLockCascadeAction[] {
  const now = new Date();
  return cascade.actions.filter(a => {
    if (a.status === 'completed' || a.status === 'validated' || !a.dueDate) return false;
    return new Date(a.dueDate) < now;
  });
}

export function getDBLockActionsByModule(cascade: DBLockCascade, module: DBLockLinkedModule): DBLockCascadeAction[] {
  return cascade.actions.filter(a => a.linkedModule === module);
}

// ============================================================================
// DEMO STATISTICS
// ============================================================================

export const dbLockCascadeDemoStats = {
  databaseLockedAt: '2026-01-02T09:00:00Z',
  cascadeTriggeredWithin: '45 seconds',
  totalActionsIdentified: 38,
  automatedActionsPercent: 74, // 28/38
  manualActionsRequired: 10,
  crossModuleConnections: 5,
  modulesImpacted: 8,
  criticalActions: 9,
  targetSubmissionDate: 'March 15, 2026',
  daysToSubmission: 72,
  // Comparison to legacy
  legacyKickoffTime: '2 weeks',
  ligatureKickoffTime: '45 seconds',
  timeReductionPercent: 99.8,
};
