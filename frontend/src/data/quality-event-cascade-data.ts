// Quality Event Cascade Data - v0.6.2
// "A critical deviation is identified. Within 60 seconds, 42 downstream actions are activated."
// This is the third R&D Connected cascade - Quality → Enterprise in real-time.

// ============================================================================
// QUALITY EVENT CASCADE ACTION TYPES
// ============================================================================

export type QualityEventCategory = 
  | 'event-classification'   // Initial event classification and severity
  | 'root-cause'            // Root cause investigation initiated
  | 'batch-impact'          // Batch/lot impact assessment
  | 'clinical-notification' // Clinical sites notified
  | 'capa-initiation'       // CAPA triggered automatically
  | 'regulatory-assessment' // Regulatory impact assessment
  | 'supply-impact'         // Supply chain/manufacturing alerts
  | 'tmf-documentation'     // TMF updates and audit trail
  | 'audit-readiness'       // Compliance and audit preparation
  | 'resolution-tracking';  // Effectiveness verification

export type QualityEventStatus = 
  | 'triggered'           // Action initiated automatically
  | 'in-progress'         // Being processed
  | 'pending-review'      // Awaiting human decision
  | 'completed'           // Action completed
  | 'verified'            // Verification passed
  | 'escalated'           // Elevated priority
  | 'blocked';            // Requires prerequisite

export type QualityEventPriority = 'critical' | 'high' | 'standard' | 'low';

export type QualityLinkedModule = 
  | 'qms' | 'clinical' | 'ctms' | 'safety' | 'regulatory' | 'supply-chain'
  | 'manufacturing' | 'tmf' | 'authoring' | 'submissions-hub';

export interface QualityEventAction {
  id: string;
  eventId: string;
  category: QualityEventCategory;
  title: string;
  description: string;
  status: QualityEventStatus;
  priority: QualityEventPriority;
  linkedModule: QualityLinkedModule;
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

export interface QualityEventStageSummary {
  category: QualityEventCategory;
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

export interface QualityEventCascade {
  id: string;
  eventId: string;
  eventCode: string;
  eventType: 'deviation' | 'oos' | 'complaint' | 'audit-finding' | 'capa-escalation';
  eventTitle: string;
  severity: 'critical' | 'major' | 'minor';
  siteId: string;
  siteName: string;
  productId: string;
  productName: string;
  batchNumber?: string;
  triggeredAt: string;
  lastUpdated: string;
  totalActions: number;
  completedActions: number;
  automatedActions: number;
  manualActions: number;
  estimatedResolutionDate: string;
  stages: QualityEventStageSummary[];
  actions: QualityEventAction[];
  crossModuleLinks: QualityCrossModuleLink[];
}

export interface QualityCrossModuleLink {
  id: string;
  sourceModule: QualityLinkedModule;
  sourceRecordId: string;
  sourceRecordType: string;
  targetModule: QualityLinkedModule;
  targetRecordId: string;
  targetRecordType: string;
  linkType: 'triggers' | 'impacts' | 'generates' | 'requires' | 'notifies';
  createdAt: string;
  automated: boolean;
}

// ============================================================================
// QUALITY EVENT CATEGORY METADATA
// ============================================================================

export const qualityEventCategoryMeta: Record<QualityEventCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}> = {
  'event-classification': {
    label: 'Event Classification',
    description: 'Critical deviation identified, severity assessed, escalation triggered',
    icon: 'AlertTriangle',
    color: 'red',
    order: 1,
  },
  'root-cause': {
    label: 'Root Cause Investigation',
    description: 'Investigation team assigned, 5-Why analysis initiated, timeline established',
    icon: 'Search',
    color: 'purple',
    order: 2,
  },
  'batch-impact': {
    label: 'Batch/Lot Assessment',
    description: 'Affected batches identified, quarantine initiated, distribution hold',
    icon: 'Package',
    color: 'orange',
    order: 3,
  },
  'clinical-notification': {
    label: 'Clinical Site Alerts',
    description: 'Affected sites notified, patient safety assessed, protocol review triggered',
    icon: 'Building2',
    color: 'blue',
    order: 4,
  },
  'capa-initiation': {
    label: 'CAPA Initiation',
    description: 'Corrective action triggered, preventive measures identified, owners assigned',
    icon: 'Shield',
    color: 'emerald',
    order: 5,
  },
  'regulatory-assessment': {
    label: 'Regulatory Assessment',
    description: 'Field alert evaluation, variation filing assessed, agency notification reviewed',
    icon: 'FileText',
    color: 'amber',
    order: 6,
  },
  'supply-impact': {
    label: 'Supply Chain Impact',
    description: 'Manufacturing alerts, inventory assessment, supplier notifications',
    icon: 'Truck',
    color: 'cyan',
    order: 7,
  },
  'tmf-documentation': {
    label: 'TMF Documentation',
    description: 'Essential documents updated, audit trail sealed, version control locked',
    icon: 'FolderOpen',
    color: 'indigo',
    order: 8,
  },
  'audit-readiness': {
    label: 'Audit Readiness',
    description: 'Compliance checklist activated, inspector documentation prepared',
    icon: 'ClipboardCheck',
    color: 'pink',
    order: 9,
  },
  'resolution-tracking': {
    label: 'Resolution Verification',
    description: 'Effectiveness checks scheduled, closure criteria defined, trending updated',
    icon: 'CheckCircle2',
    color: 'green',
    order: 10,
  },
};

// ============================================================================
// DEMO DATA - DEV-2026-0147 OOS CRITICAL DEVIATION CASCADE
// ============================================================================

// This is the "aha moment" - when DEV-2026-0147 was classified, ALL of this happened automatically

export const criticalDeviationActions: QualityEventAction[] = [
  // === EVENT CLASSIFICATION (Complete) ===
  {
    id: 'qe-001',
    eventId: 'DEV-2026-0147',
    category: 'event-classification',
    title: 'Critical deviation identified',
    description: 'OOS result detected at Site 042 - API potency test failed specification (92.3% vs 95-105%)',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    linkedRecordId: 'DEV-2026-0147',
    linkedRecordType: 'deviation',
    triggeredAt: '2026-01-02T14:30:00Z',
    completedAt: '2026-01-02T14:30:15Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['DEV-2026-0147 created'],
  },
  {
    id: 'qe-002',
    eventId: 'DEV-2026-0147',
    category: 'event-classification',
    title: 'Severity classified as Critical',
    description: 'AI-assisted classification based on: patient safety impact, batch scope, regulatory notification threshold',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    linkedRecordId: 'DEV-2026-0147',
    linkedRecordType: 'deviation',
    triggeredAt: '2026-01-02T14:30:16Z',
    completedAt: '2026-01-02T14:30:20Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Severity: CRITICAL'],
  },
  {
    id: 'qe-003',
    eventId: 'DEV-2026-0147',
    category: 'event-classification',
    title: 'Executive escalation triggered',
    description: 'VP Quality, Site Director, and Head of Manufacturing notified via emergency protocol',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:30:21Z',
    completedAt: '2026-01-02T14:30:25Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Dr. Sarah Chen',
    outputArtifacts: ['Escalation emails sent', 'SMS alerts delivered'],
  },
  {
    id: 'qe-004',
    eventId: 'DEV-2026-0147',
    category: 'event-classification',
    title: 'Cross-functional war room activated',
    description: 'Quality, Manufacturing, Regulatory, and Clinical teams assembled for rapid response',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:30:26Z',
    completedAt: '2026-01-02T14:35:00Z',
    automatedAction: false,
    requiresApproval: false,
    assignedTo: 'Dr. Sarah Chen',
  },

  // === ROOT CAUSE INVESTIGATION (In Progress) ===
  {
    id: 'qe-005',
    eventId: 'DEV-2026-0147',
    category: 'root-cause',
    title: 'Investigation team assigned',
    description: 'QA Lead, Process Engineer, and Analytical Chemist assigned to investigation',
    status: 'completed',
    priority: 'high',
    linkedModule: 'qms',
    linkedRecordId: 'INV-2026-0089',
    linkedRecordType: 'investigation',
    triggeredAt: '2026-01-02T14:31:00Z',
    completedAt: '2026-01-02T14:32:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Michael Torres',
  },
  {
    id: 'qe-006',
    eventId: 'DEV-2026-0147',
    category: 'root-cause',
    title: '5-Why analysis template initiated',
    description: 'Root cause analysis framework activated with pre-populated equipment and process data',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:32:00Z',
    dueDate: '2026-01-03T14:32:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Michael Torres',
  },
  {
    id: 'qe-007',
    eventId: 'DEV-2026-0147',
    category: 'root-cause',
    title: 'Equipment maintenance records pulled',
    description: 'Blender BL-042 maintenance history, calibration records, and cleaning logs retrieved',
    status: 'completed',
    priority: 'high',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:32:05Z',
    completedAt: '2026-01-02T14:32:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['BL-042 maintenance log', 'Calibration cert #CAL-2025-4892'],
  },
  {
    id: 'qe-008',
    eventId: 'DEV-2026-0147',
    category: 'root-cause',
    title: 'Environmental monitoring data retrieved',
    description: 'Temperature, humidity, and particle count data for manufacturing area during batch production',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:32:35Z',
    completedAt: '2026-01-02T14:33:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['EM data export 2026-01-02'],
  },

  // === BATCH/LOT ASSESSMENT (In Progress) ===
  {
    id: 'qe-009',
    eventId: 'DEV-2026-0147',
    category: 'batch-impact',
    title: 'Affected batch quarantined',
    description: 'Batch NX-2026-0042 (15,000 units) placed on immediate quality hold',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'manufacturing',
    linkedRecordId: 'NX-2026-0042',
    linkedRecordType: 'batch',
    triggeredAt: '2026-01-02T14:31:30Z',
    completedAt: '2026-01-02T14:32:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Quarantine order QO-2026-0147'],
  },
  {
    id: 'qe-010',
    eventId: 'DEV-2026-0147',
    category: 'batch-impact',
    title: 'Related batches identified',
    description: '3 additional batches from same API lot flagged for retesting: NX-2026-0038, NX-2026-0039, NX-2026-0040',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:32:00Z',
    completedAt: '2026-01-02T14:32:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Related batch report'],
  },
  {
    id: 'qe-011',
    eventId: 'DEV-2026-0147',
    category: 'batch-impact',
    title: 'Distribution hold initiated',
    description: 'Warehouse release blocked for all batches pending investigation outcome',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'supply-chain',
    triggeredAt: '2026-01-02T14:32:35Z',
    completedAt: '2026-01-02T14:33:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Distribution hold DH-2026-0147'],
  },
  {
    id: 'qe-012',
    eventId: 'DEV-2026-0147',
    category: 'batch-impact',
    title: 'Retest samples scheduled',
    description: 'Expedited retest protocol initiated for quarantined batches - results due within 48 hours',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:33:00Z',
    dueDate: '2026-01-04T14:33:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Lab Team A',
  },

  // === CLINICAL NOTIFICATION (In Progress) ===
  {
    id: 'qe-013',
    eventId: 'DEV-2026-0147',
    category: 'clinical-notification',
    title: 'Affected clinical sites identified',
    description: 'Site 042, 058, and 071 received material from affected API lot - 127 patients potentially impacted',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'ctms',
    triggeredAt: '2026-01-02T14:33:00Z',
    completedAt: '2026-01-02T14:33:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Site impact report'],
  },
  {
    id: 'qe-014',
    eventId: 'DEV-2026-0147',
    category: 'clinical-notification',
    title: 'Principal Investigators notified',
    description: 'Urgent notification sent to PIs at affected sites with preliminary assessment and hold instructions',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'ctms',
    triggeredAt: '2026-01-02T14:33:35Z',
    completedAt: '2026-01-02T14:34:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['PI notification emails'],
  },
  {
    id: 'qe-015',
    eventId: 'DEV-2026-0147',
    category: 'clinical-notification',
    title: 'Patient safety assessment initiated',
    description: 'Medical monitor reviewing patient exposure data - no adverse events reported to date',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'safety',
    triggeredAt: '2026-01-02T14:34:00Z',
    dueDate: '2026-01-02T18:00:00Z',
    automatedAction: false,
    requiresApproval: true,
    assignedTo: 'Dr. James Morrison',
  },
  {
    id: 'qe-016',
    eventId: 'DEV-2026-0147',
    category: 'clinical-notification',
    title: 'DSMB notification queued',
    description: 'Data Safety Monitoring Board briefing prepared pending patient safety assessment',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'clinical',
    triggeredAt: '2026-01-02T14:34:30Z',
    dueDate: '2026-01-03T12:00:00Z',
    automatedAction: true,
    requiresApproval: true,
    assignedTo: 'Dr. Patricia Wells',
  },

  // === CAPA INITIATION (In Progress) ===
  {
    id: 'qe-017',
    eventId: 'DEV-2026-0147',
    category: 'capa-initiation',
    title: 'CAPA record auto-generated',
    description: 'CAPA-2026-0089 created with pre-populated deviation linkage and impact assessment template',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'qms',
    linkedRecordId: 'CAPA-2026-0089',
    linkedRecordType: 'capa',
    triggeredAt: '2026-01-02T14:35:00Z',
    completedAt: '2026-01-02T14:35:15Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['CAPA-2026-0089 created'],
  },
  {
    id: 'qe-018',
    eventId: 'DEV-2026-0147',
    category: 'capa-initiation',
    title: 'Immediate containment actions identified',
    description: 'AI-suggested containment: quarantine, retest, enhanced monitoring - pending QA approval',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'qms',
    linkedRecordId: 'CAPA-2026-0089',
    linkedRecordType: 'capa',
    triggeredAt: '2026-01-02T14:35:20Z',
    dueDate: '2026-01-02T16:00:00Z',
    automatedAction: true,
    requiresApproval: true,
    assignedTo: 'Dr. Sarah Chen',
  },
  {
    id: 'qe-019',
    eventId: 'DEV-2026-0147',
    category: 'capa-initiation',
    title: 'Preventive action opportunities flagged',
    description: 'System identified 2 similar OOS events in past 12 months - trending analysis initiated',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:35:30Z',
    dueDate: '2026-01-05T14:35:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Trending report TR-2026-0147'],
  },
  {
    id: 'qe-020',
    eventId: 'DEV-2026-0147',
    category: 'capa-initiation',
    title: 'CAPA effectiveness criteria defined',
    description: 'Success metrics established: 0 repeat OOS, 100% batch release within spec for 6 months',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'CAPA-2026-0089',
    linkedRecordType: 'capa',
    triggeredAt: '2026-01-02T14:36:00Z',
    completedAt: '2026-01-02T14:36:30Z',
    automatedAction: true,
    requiresApproval: false,
  },

  // === REGULATORY ASSESSMENT (Pending) ===
  {
    id: 'qe-021',
    eventId: 'DEV-2026-0147',
    category: 'regulatory-assessment',
    title: 'FDA Field Alert evaluation initiated',
    description: 'Regulatory team assessing whether event meets FDA Field Alert Report (FAR) threshold',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'regulatory',
    triggeredAt: '2026-01-02T14:36:00Z',
    dueDate: '2026-01-02T20:00:00Z',
    automatedAction: false,
    requiresApproval: true,
    assignedTo: 'Robert Kim',
  },
  {
    id: 'qe-022',
    eventId: 'DEV-2026-0147',
    category: 'regulatory-assessment',
    title: 'EMA Variation impact assessed',
    description: 'Type II variation may be required if root cause involves manufacturing process change',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'regulatory',
    triggeredAt: '2026-01-02T14:36:30Z',
    dueDate: '2026-01-05T14:36:30Z',
    automatedAction: true,
    requiresApproval: true,
    assignedTo: 'Elena Kowalski',
  },
  {
    id: 'qe-023',
    eventId: 'DEV-2026-0147',
    category: 'regulatory-assessment',
    title: 'Annual Report inclusion flagged',
    description: 'Event automatically flagged for inclusion in next Annual Product Quality Review',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'regulatory',
    triggeredAt: '2026-01-02T14:37:00Z',
    completedAt: '2026-01-02T14:37:10Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['APQR flag set'],
  },
  {
    id: 'qe-024',
    eventId: 'DEV-2026-0147',
    category: 'regulatory-assessment',
    title: 'IND safety report assessment',
    description: 'Medical Safety reviewing if event requires IND Safety Report to FDA within 15 days',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'safety',
    triggeredAt: '2026-01-02T14:37:15Z',
    dueDate: '2026-01-03T14:37:15Z',
    automatedAction: false,
    requiresApproval: true,
    assignedTo: 'Dr. James Morrison',
  },

  // === SUPPLY CHAIN IMPACT (In Progress) ===
  {
    id: 'qe-025',
    eventId: 'DEV-2026-0147',
    category: 'supply-impact',
    title: 'Manufacturing line hold',
    description: 'Line 3 at Site 042 placed on hold pending equipment investigation',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:38:00Z',
    completedAt: '2026-01-02T14:38:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Line hold order LH-2026-0147'],
  },
  {
    id: 'qe-026',
    eventId: 'DEV-2026-0147',
    category: 'supply-impact',
    title: 'Inventory impact calculated',
    description: 'Supply planning notified: 45,000 units at risk, 3-week production buffer available',
    status: 'completed',
    priority: 'high',
    linkedModule: 'supply-chain',
    triggeredAt: '2026-01-02T14:38:35Z',
    completedAt: '2026-01-02T14:39:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Inventory impact assessment'],
  },
  {
    id: 'qe-027',
    eventId: 'DEV-2026-0147',
    category: 'supply-impact',
    title: 'API supplier notified',
    description: 'ChemSource Inc. alerted to potential raw material quality issue - lot records requested',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'supply-chain',
    triggeredAt: '2026-01-02T14:39:00Z',
    dueDate: '2026-01-03T14:39:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Procurement Team',
    outputArtifacts: ['Supplier notification SN-2026-0147'],
  },
  {
    id: 'qe-028',
    eventId: 'DEV-2026-0147',
    category: 'supply-impact',
    title: 'Alternate site assessment',
    description: 'Evaluating Site 089 capacity for potential production transfer if line 3 extended hold required',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:39:30Z',
    dueDate: '2026-01-04T14:39:30Z',
    automatedAction: true,
    requiresApproval: true,
    assignedTo: 'Manufacturing Director',
  },

  // === TMF DOCUMENTATION (In Progress) ===
  {
    id: 'qe-029',
    eventId: 'DEV-2026-0147',
    category: 'tmf-documentation',
    title: 'TMF deviation record created',
    description: 'Essential document reference added to Trial Master File with full audit trail',
    status: 'completed',
    priority: 'high',
    linkedModule: 'tmf',
    linkedRecordId: 'TMF-DEV-2026-0147',
    linkedRecordType: 'essential-document',
    triggeredAt: '2026-01-02T14:40:00Z',
    completedAt: '2026-01-02T14:40:15Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['TMF reference created'],
  },
  {
    id: 'qe-030',
    eventId: 'DEV-2026-0147',
    category: 'tmf-documentation',
    title: 'Batch records locked',
    description: 'All batch records for affected lots version-locked for investigation integrity',
    status: 'completed',
    priority: 'high',
    linkedModule: 'manufacturing',
    triggeredAt: '2026-01-02T14:40:20Z',
    completedAt: '2026-01-02T14:40:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Batch record lock confirmation'],
  },
  {
    id: 'qe-031',
    eventId: 'DEV-2026-0147',
    category: 'tmf-documentation',
    title: 'Chain of custody documented',
    description: 'Retain samples identified and custody chain documented for potential regulatory inspection',
    status: 'in-progress',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:40:35Z',
    dueDate: '2026-01-02T18:00:00Z',
    automatedAction: false,
    requiresApproval: false,
    assignedTo: 'QC Supervisor',
  },
  {
    id: 'qe-032',
    eventId: 'DEV-2026-0147',
    category: 'tmf-documentation',
    title: 'Investigation timeline generated',
    description: 'Automated timeline document created with all actions, decisions, and timestamps',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:41:00Z',
    completedAt: '2026-01-02T14:41:10Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Timeline document TL-DEV-2026-0147'],
  },

  // === AUDIT READINESS (Pending) ===
  {
    id: 'qe-033',
    eventId: 'DEV-2026-0147',
    category: 'audit-readiness',
    title: 'Inspector documentation package initiated',
    description: 'Pre-assembled documentation package for potential regulatory inspection',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:42:00Z',
    dueDate: '2026-01-03T14:42:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'QA Documentation',
  },
  {
    id: 'qe-034',
    eventId: 'DEV-2026-0147',
    category: 'audit-readiness',
    title: 'Compliance checklist activated',
    description: '21 CFR 211 and EU GMP compliance verification checklist for deviation handling',
    status: 'in-progress',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:42:30Z',
    dueDate: '2026-01-03T14:42:30Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'qe-035',
    eventId: 'DEV-2026-0147',
    category: 'audit-readiness',
    title: 'Training records verified',
    description: 'All personnel involved in batch production confirmed current on required training',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:43:00Z',
    completedAt: '2026-01-02T14:43:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Training verification report'],
  },
  {
    id: 'qe-036',
    eventId: 'DEV-2026-0147',
    category: 'audit-readiness',
    title: 'SME interview schedule prepared',
    description: 'Key personnel availability confirmed for potential inspector interviews',
    status: 'pending-review',
    priority: 'low',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:44:00Z',
    dueDate: '2026-01-04T14:44:00Z',
    automatedAction: true,
    requiresApproval: false,
    assignedTo: 'Site Quality Director',
  },

  // === RESOLUTION TRACKING (Pending) ===
  {
    id: 'qe-037',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Effectiveness check scheduled',
    description: 'CAPA effectiveness verification scheduled for 90 days post-implementation',
    status: 'triggered',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'CAPA-2026-0089',
    linkedRecordType: 'capa',
    triggeredAt: '2026-01-02T14:45:00Z',
    dueDate: '2026-04-02T14:45:00Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'qe-038',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Trending dashboard updated',
    description: 'Quality metrics dashboard updated with new deviation - trend analysis refreshed',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:45:30Z',
    completedAt: '2026-01-02T14:45:45Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Dashboard updated'],
  },
  {
    id: 'qe-039',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Closure criteria documented',
    description: 'Defined closure requirements: root cause confirmed, CAPA effective, batches dispositioned',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'DEV-2026-0147',
    linkedRecordType: 'deviation',
    triggeredAt: '2026-01-02T14:46:00Z',
    completedAt: '2026-01-02T14:46:15Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'qe-040',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Lessons learned template created',
    description: 'Post-resolution knowledge capture template prepared for quality improvement',
    status: 'triggered',
    priority: 'low',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:46:30Z',
    dueDate: '2026-02-01T14:46:30Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'qe-041',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Management review queued',
    description: 'Event flagged for next Management Review meeting agenda',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2026-01-02T14:47:00Z',
    completedAt: '2026-01-02T14:47:10Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['MR agenda item added'],
  },
  {
    id: 'qe-042',
    eventId: 'DEV-2026-0147',
    category: 'resolution-tracking',
    title: 'Regulatory close-out prepared',
    description: 'Template for regulatory close-out documentation prepared pending investigation completion',
    status: 'triggered',
    priority: 'standard',
    linkedModule: 'regulatory',
    triggeredAt: '2026-01-02T14:47:30Z',
    dueDate: '2026-01-15T14:47:30Z',
    automatedAction: true,
    requiresApproval: true,
    assignedTo: 'Robert Kim',
  },
];

// ============================================================================
// CROSS-MODULE LINKS
// ============================================================================

export const criticalDeviationLinks: QualityCrossModuleLink[] = [
  {
    id: 'qcl-001',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'qms',
    targetRecordId: 'CAPA-2026-0089',
    targetRecordType: 'capa',
    linkType: 'triggers',
    createdAt: '2026-01-02T14:35:00Z',
    automated: true,
  },
  {
    id: 'qcl-002',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'manufacturing',
    targetRecordId: 'NX-2026-0042',
    targetRecordType: 'batch',
    linkType: 'impacts',
    createdAt: '2026-01-02T14:31:30Z',
    automated: true,
  },
  {
    id: 'qcl-003',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'ctms',
    targetRecordId: 'SITE-042',
    targetRecordType: 'site',
    linkType: 'notifies',
    createdAt: '2026-01-02T14:33:35Z',
    automated: true,
  },
  {
    id: 'qcl-004',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'ctms',
    targetRecordId: 'SITE-058',
    targetRecordType: 'site',
    linkType: 'notifies',
    createdAt: '2026-01-02T14:33:35Z',
    automated: true,
  },
  {
    id: 'qcl-005',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'ctms',
    targetRecordId: 'SITE-071',
    targetRecordType: 'site',
    linkType: 'notifies',
    createdAt: '2026-01-02T14:33:35Z',
    automated: true,
  },
  {
    id: 'qcl-006',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'safety',
    targetRecordId: 'PSA-2026-0147',
    targetRecordType: 'safety-assessment',
    linkType: 'triggers',
    createdAt: '2026-01-02T14:34:00Z',
    automated: true,
  },
  {
    id: 'qcl-007',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'regulatory',
    targetRecordId: 'FAR-EVAL-2026-0147',
    targetRecordType: 'field-alert-evaluation',
    linkType: 'triggers',
    createdAt: '2026-01-02T14:36:00Z',
    automated: true,
  },
  {
    id: 'qcl-008',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'supply-chain',
    targetRecordId: 'DH-2026-0147',
    targetRecordType: 'distribution-hold',
    linkType: 'generates',
    createdAt: '2026-01-02T14:32:35Z',
    automated: true,
  },
  {
    id: 'qcl-009',
    sourceModule: 'qms',
    sourceRecordId: 'DEV-2026-0147',
    sourceRecordType: 'deviation',
    targetModule: 'tmf',
    targetRecordId: 'TMF-DEV-2026-0147',
    targetRecordType: 'essential-document',
    linkType: 'generates',
    createdAt: '2026-01-02T14:40:00Z',
    automated: true,
  },
  {
    id: 'qcl-010',
    sourceModule: 'manufacturing',
    sourceRecordId: 'BL-042',
    targetRecordType: 'equipment',
    targetModule: 'qms',
    targetRecordId: 'INV-2026-0089',
    sourceRecordType: 'investigation',
    linkType: 'requires',
    createdAt: '2026-01-02T14:32:05Z',
    automated: true,
  },
];

// ============================================================================
// AGGREGATE CASCADE DATA
// ============================================================================

export const criticalDeviationCascade: QualityEventCascade = {
  id: 'qec-001',
  eventId: 'DEV-2026-0147',
  eventCode: 'DEV-2026-0147',
  eventType: 'oos',
  eventTitle: 'OOS - API Potency Test Failure',
  severity: 'critical',
  siteId: 'SITE-042',
  siteName: 'Manufacturing Site 042 (Boston)',
  productId: 'LIG-2847',
  productName: 'Nexavant (LIG-2847)',
  batchNumber: 'NX-2026-0042',
  triggeredAt: '2026-01-02T14:30:00Z',
  lastUpdated: '2026-01-02T14:47:30Z',
  totalActions: 42,
  completedActions: 18,
  automatedActions: 32,
  manualActions: 10,
  estimatedResolutionDate: '2026-01-15T00:00:00Z',
  stages: [
    {
      category: 'event-classification',
      label: 'Event Classification',
      description: 'Critical deviation identified and escalated',
      icon: 'AlertTriangle',
      totalActions: 4,
      completedActions: 4,
      inProgressActions: 0,
      pendingActions: 0,
      criticalCount: 3,
      status: 'completed',
      estimatedDuration: '5 min',
    },
    {
      category: 'root-cause',
      label: 'Root Cause Investigation',
      description: 'Investigation team assigned, analysis initiated',
      icon: 'Search',
      totalActions: 4,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 0,
      status: 'in-progress',
      estimatedDuration: '24 hrs',
    },
    {
      category: 'batch-impact',
      label: 'Batch/Lot Assessment',
      description: 'Affected batches quarantined, retesting scheduled',
      icon: 'Package',
      totalActions: 4,
      completedActions: 3,
      inProgressActions: 1,
      pendingActions: 0,
      criticalCount: 2,
      status: 'in-progress',
      estimatedDuration: '48 hrs',
    },
    {
      category: 'clinical-notification',
      label: 'Clinical Site Alerts',
      description: 'Sites notified, patient safety assessed',
      icon: 'Building2',
      totalActions: 4,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 3,
      status: 'in-progress',
      estimatedDuration: '4 hrs',
    },
    {
      category: 'capa-initiation',
      label: 'CAPA Initiation',
      description: 'Corrective action triggered, containment planned',
      icon: 'Shield',
      totalActions: 4,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 2,
      status: 'in-progress',
      estimatedDuration: '2 hrs',
    },
    {
      category: 'regulatory-assessment',
      label: 'Regulatory Assessment',
      description: 'FDA FAR evaluation, variation impact assessed',
      icon: 'FileText',
      totalActions: 4,
      completedActions: 1,
      inProgressActions: 2,
      pendingActions: 1,
      criticalCount: 1,
      status: 'in-progress',
      estimatedDuration: '6 hrs',
    },
    {
      category: 'supply-impact',
      label: 'Supply Chain Impact',
      description: 'Manufacturing hold, supplier notification',
      icon: 'Truck',
      totalActions: 4,
      completedActions: 2,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 1,
      status: 'in-progress',
      estimatedDuration: '24 hrs',
    },
    {
      category: 'tmf-documentation',
      label: 'TMF Documentation',
      description: 'Essential documents updated, records locked',
      icon: 'FolderOpen',
      totalActions: 4,
      completedActions: 3,
      inProgressActions: 1,
      pendingActions: 0,
      criticalCount: 0,
      status: 'in-progress',
      estimatedDuration: '4 hrs',
    },
    {
      category: 'audit-readiness',
      label: 'Audit Readiness',
      description: 'Inspector documentation prepared',
      icon: 'ClipboardCheck',
      totalActions: 4,
      completedActions: 1,
      inProgressActions: 2,
      pendingActions: 1,
      criticalCount: 0,
      status: 'in-progress',
      estimatedDuration: '24 hrs',
    },
    {
      category: 'resolution-tracking',
      label: 'Resolution Verification',
      description: 'Effectiveness checks, lessons learned',
      icon: 'CheckCircle2',
      totalActions: 6,
      completedActions: 3,
      inProgressActions: 0,
      pendingActions: 3,
      criticalCount: 0,
      status: 'pending',
      estimatedDuration: '90 days',
    },
  ],
  actions: criticalDeviationActions,
  crossModuleLinks: criticalDeviationLinks,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getQualityEventCascadeProgress(cascade: QualityEventCascade): {
  percentage: number;
  completedStages: number;
  totalStages: number;
  criticalPending: number;
  automationRate: number;
} {
  const completedStages = cascade.stages.filter(s => s.status === 'completed').length;
  const criticalPending = cascade.actions.filter(
    a => a.priority === 'critical' && a.status !== 'completed' && a.status !== 'verified'
  ).length;
  
  return {
    percentage: Math.round((cascade.completedActions / cascade.totalActions) * 100),
    completedStages,
    totalStages: cascade.stages.length,
    criticalPending,
    automationRate: Math.round((cascade.automatedActions / cascade.totalActions) * 100),
  };
}

export function getQualityEventCriticalActions(cascade: QualityEventCascade): QualityEventAction[] {
  return cascade.actions
    .filter(a => a.priority === 'critical' && a.status !== 'completed' && a.status !== 'verified')
    .sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
}

export function getQualityEventRecentActivity(cascade: QualityEventCascade, limit: number = 10): QualityEventAction[] {
  return cascade.actions
    .filter(a => a.status === 'completed' || a.status === 'verified')
    .sort((a, b) => new Date(b.completedAt || b.triggeredAt).getTime() - new Date(a.completedAt || a.triggeredAt).getTime())
    .slice(0, limit);
}

export function getQualityEventActionsByCategory(cascade: QualityEventCascade): Record<QualityEventCategory, QualityEventAction[]> {
  const grouped: Record<QualityEventCategory, QualityEventAction[]> = {
    'event-classification': [],
    'root-cause': [],
    'batch-impact': [],
    'clinical-notification': [],
    'capa-initiation': [],
    'regulatory-assessment': [],
    'supply-impact': [],
    'tmf-documentation': [],
    'audit-readiness': [],
    'resolution-tracking': [],
  };
  
  cascade.actions.forEach(action => {
    grouped[action.category].push(action);
  });
  
  return grouped;
}

export function getQualityEventModuleImpact(cascade: QualityEventCascade): { module: QualityLinkedModule; count: number }[] {
  const moduleCounts = new Map<QualityLinkedModule, number>();
  
  cascade.actions.forEach(action => {
    const current = moduleCounts.get(action.linkedModule) || 0;
    moduleCounts.set(action.linkedModule, current + 1);
  });
  
  return Array.from(moduleCounts.entries())
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);
}
