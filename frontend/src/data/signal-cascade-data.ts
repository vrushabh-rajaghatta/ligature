// Signal Cascade Data - v0.6.0
// "A signal is detected. Within 30 seconds, 47 downstream actions are identified."
// This is the R&D Connected moment that makes Veeva's siloed architecture look prehistoric.

// ============================================================================
// CASCADE ACTION TYPES
// ============================================================================

export type CascadeCategory = 
  | 'detection'           // Signal creation and initial assessment
  | 'label-impact'        // CCDS, regional labels, PI updates
  | 'document-updates'    // Affected documents flagged
  | 'regulatory-timeline' // Submission date recalculations
  | 'haq-preparation'     // Anticipated questions pre-populated
  | 'field-alerts'        // MSL talking points, KOL outreach
  | 'mlr-escalation'      // Promotional materials flagged
  | 'clinical-impact'     // Trial protocol amendments, DSMB alerts
  | 'quality-impact'      // CAPA links, batch review
  | 'supply-impact';      // Manufacturing alerts

export type CascadeActionStatus = 
  | 'triggered'           // Action initiated automatically
  | 'in-progress'         // Being processed
  | 'pending-review'      // Awaiting human decision
  | 'completed'           // Action completed
  | 'escalated'           // Elevated priority
  | 'blocked';            // Requires prerequisite

export type CascadeActionPriority = 'critical' | 'high' | 'standard' | 'low';

export type LinkedModule = 
  | 'safety' | 'labeling' | 'authoring' | 'submissions-hub' | 'haq' 
  | 'medical-affairs' | 'clinical' | 'qms' | 'supply-chain' | 'ctms';

export interface CascadeAction {
  id: string;
  signalId: string;
  category: CascadeCategory;
  title: string;
  description: string;
  status: CascadeActionStatus;
  priority: CascadeActionPriority;
  linkedModule: LinkedModule;
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

export interface CascadeStageSummary {
  category: CascadeCategory;
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

export interface SignalCascade {
  id: string;
  signalId: string;
  signalCode: string;
  signalName: string;
  productId: string;
  productName: string;
  severity: 'critical' | 'significant' | 'moderate' | 'minor';
  triggeredAt: string;
  lastUpdated: string;
  totalActions: number;
  completedActions: number;
  automatedActions: number;
  manualActions: number;
  estimatedCompletionDate: string;
  stages: CascadeStageSummary[];
  actions: CascadeAction[];
  crossModuleLinks: CrossModuleLink[];
}

export interface CrossModuleLink {
  id: string;
  sourceModule: LinkedModule;
  sourceRecordId: string;
  sourceRecordType: string;
  targetModule: LinkedModule;
  targetRecordId: string;
  targetRecordType: string;
  linkType: 'triggers' | 'impacts' | 'informs' | 'requires';
  createdAt: string;
  automated: boolean;
}

// ============================================================================
// CASCADE CATEGORY METADATA
// ============================================================================

export const cascadeCategoryMeta: Record<CascadeCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}> = {
  'detection': {
    label: 'Detection',
    description: 'Signal creation, severity assessment, initial classification',
    icon: 'AlertTriangle',
    color: 'red',
    order: 1,
  },
  'label-impact': {
    label: 'Label Impact Assessment',
    description: 'CCDS flagged, regional labels queued for review, PI sections identified',
    icon: 'Tag',
    color: 'amber',
    order: 2,
  },
  'document-updates': {
    label: 'Document Updates',
    description: 'Affected documents flagged for revision, SmPCs queued',
    icon: 'FileText',
    color: 'blue',
    order: 3,
  },
  'regulatory-timeline': {
    label: 'Regulatory Timeline',
    description: 'Submission dates recalculated, supplements triggered',
    icon: 'Calendar',
    color: 'purple',
    order: 4,
  },
  'haq-preparation': {
    label: 'HAQ Preparation',
    description: 'Anticipated questions pre-populated, response templates ready',
    icon: 'MessageSquare',
    color: 'cyan',
    order: 5,
  },
  'field-alerts': {
    label: 'Field Alerts',
    description: 'MSL talking points generated, KOLs flagged for outreach',
    icon: 'Users',
    color: 'green',
    order: 6,
  },
  'mlr-escalation': {
    label: 'MLR Escalation',
    description: 'Promotional materials flagged for expedited review',
    icon: 'AlertCircle',
    color: 'orange',
    order: 7,
  },
  'clinical-impact': {
    label: 'Clinical Impact',
    description: 'Protocol amendments, DSMB notifications, consent updates',
    icon: 'Stethoscope',
    color: 'indigo',
    order: 8,
  },
  'quality-impact': {
    label: 'Quality Impact',
    description: 'CAPA assessment, batch review, supplier notifications',
    icon: 'Shield',
    color: 'pink',
    order: 9,
  },
  'supply-impact': {
    label: 'Supply Impact',
    description: 'Manufacturing alerts, inventory assessment',
    icon: 'Truck',
    color: 'gray',
    order: 10,
  },
};

// ============================================================================
// DEMO DATA - SIG-2026-001 HEPATOTOXICITY CASCADE
// ============================================================================

// This is the "aha moment" - when SIG-2026-001 was detected, ALL of this happened automatically

export const hepatotoxicityCascadeActions: CascadeAction[] = [
  // === DETECTION (Complete) ===
  {
    id: 'cascade-001',
    signalId: 'SIG-2026-001',
    category: 'detection',
    title: 'Safety signal created',
    description: 'Hepatotoxicity signal SIG-2026-001 created from disproportionality analysis (PRR: 4.2, EBGM: 3.8)',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'safety',
    linkedRecordId: 'SIG-2026-001',
    linkedRecordType: 'signal',
    triggeredAt: '2024-12-15T14:30:00Z',
    completedAt: '2024-12-15T14:30:00Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-002',
    signalId: 'SIG-2026-001',
    category: 'detection',
    title: 'Severity assessed as CRITICAL',
    description: 'Auto-classification based on 12 serious cases, 3 hospitalizations, class effect potential',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'safety',
    linkedRecordId: 'SIG-2026-001',
    linkedRecordType: 'signal',
    triggeredAt: '2024-12-15T14:30:05Z',
    completedAt: '2024-12-15T14:30:05Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-003',
    signalId: 'SIG-2026-001',
    category: 'detection',
    title: 'Safety Medical Director notified',
    description: 'Dr. Sarah Chen alerted via platform notification and email escalation',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'safety',
    triggeredAt: '2024-12-15T14:30:10Z',
    completedAt: '2024-12-15T14:30:10Z',
    assignedTo: 'Dr. Sarah Chen',
    automatedAction: true,
    requiresApproval: false,
  },

  // === LABEL IMPACT (Triggered) ===
  {
    id: 'cascade-004',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'CCDS Section 4.4 flagged for update',
    description: 'Core Data Sheet special warnings section identified for hepatotoxicity language addition',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'labeling',
    linkedRecordId: 'CCDS-LIG2847-001',
    linkedRecordType: 'ccds',
    triggeredAt: '2024-12-15T14:30:15Z',
    completedAt: '2024-12-15T15:45:00Z',
    automatedAction: true,
    requiresApproval: true,
    outputArtifacts: ['CCDS Section 4.4 draft revision'],
  },
  {
    id: 'cascade-005',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'US PI Sections 5.1, 6.1 queued',
    description: 'Prescribing Information warnings and adverse reactions sections flagged for revision',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'labeling',
    linkedRecordId: 'PI-US-LIG2847',
    linkedRecordType: 'prescribing-info',
    triggeredAt: '2024-12-15T14:30:20Z',
    assignedTo: 'Regulatory Affairs US',
    dueDate: '2024-12-22',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-006',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'EU SmPC Sections 4.4, 4.8 queued',
    description: 'Summary of Product Characteristics special warnings and adverse effects sections flagged',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'labeling',
    linkedRecordId: 'SMPC-EU-LIG2847',
    linkedRecordType: 'smpc',
    triggeredAt: '2024-12-15T14:30:25Z',
    assignedTo: 'Regulatory Affairs EU',
    dueDate: '2024-12-22',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-007',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'JP Package Insert flagged',
    description: 'Japanese Package Insert precautions section identified for update',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'labeling',
    linkedRecordId: 'PI-JP-LIG2847',
    linkedRecordType: 'package-insert',
    triggeredAt: '2024-12-15T14:30:30Z',
    assignedTo: 'Regulatory Affairs Japan',
    dueDate: '2024-12-25',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-008',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'Label impact matrix generated',
    description: 'Cross-regional label comparison showing affected sections across 23 registered markets',
    status: 'completed',
    priority: 'high',
    linkedModule: 'labeling',
    triggeredAt: '2024-12-15T14:30:35Z',
    completedAt: '2024-12-15T14:30:45Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Label Impact Matrix Report'],
  },

  // === DOCUMENT UPDATES ===
  {
    id: 'cascade-009',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'Investigator Brochure flagged',
    description: 'IB Section 6 (Summary of Data and Guidance) identified for hepatotoxicity data update',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-IB-LIG2847-v12',
    linkedRecordType: 'investigator-brochure',
    triggeredAt: '2024-12-15T14:31:00Z',
    assignedTo: 'Medical Writing',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-010',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'DSUR narrative section flagged',
    description: 'Development Safety Update Report 2024 Section 4.1 (Safety Signal) requires update',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-DSUR-2024',
    linkedRecordType: 'dsur',
    triggeredAt: '2024-12-15T14:31:05Z',
    assignedTo: 'Safety Writing',
    dueDate: '2024-12-18',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-011',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'Clinical Overview Section 2.5.5 flagged',
    description: 'Module 2.5 Clinical Overview safety conclusions section identified for revision',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-M25-LIG2847',
    linkedRecordType: 'clinical-overview',
    triggeredAt: '2024-12-15T14:31:10Z',
    assignedTo: 'Medical Writing Lead',
    dueDate: '2024-12-23',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-012',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'Risk Management Plan update triggered',
    description: 'RMP Module SVIII safety concerns and Module V risk minimization measures flagged',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-RMP-LIG2847-v3',
    linkedRecordType: 'rmp',
    triggeredAt: '2024-12-15T14:31:15Z',
    assignedTo: 'PV Writing',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-013',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'PSUR narrative section queued',
    description: 'Periodic Safety Update Report hepatotoxicity signal section pre-populated',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'authoring',
    linkedRecordId: 'DOC-PSUR-LIG2847-Q4',
    linkedRecordType: 'psur',
    triggeredAt: '2024-12-15T14:31:20Z',
    assignedTo: 'Safety Writing',
    dueDate: '2024-12-28',
    automatedAction: true,
    requiresApproval: true,
  },

  // === REGULATORY TIMELINE ===
  {
    id: 'cascade-014',
    signalId: 'SIG-2026-001',
    category: 'regulatory-timeline',
    title: 'US NDA Safety Supplement triggered',
    description: 'CBE-30 supplement initiated for PI safety update per 21 CFR 314.70(c)',
    status: 'triggered',
    priority: 'critical',
    linkedModule: 'submissions-hub',
    linkedRecordId: 'SUB-NDA-SUP-001',
    linkedRecordType: 'submission',
    triggeredAt: '2024-12-15T14:32:00Z',
    assignedTo: 'Regulatory Operations US',
    dueDate: '2025-01-14',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-015',
    signalId: 'SIG-2026-001',
    category: 'regulatory-timeline',
    title: 'EU Type II Variation assessed',
    description: 'Article 16a safety variation requirement evaluated - Type II confirmed',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'submissions-hub',
    linkedRecordId: 'SUB-EU-VAR-001',
    linkedRecordType: 'variation',
    triggeredAt: '2024-12-15T14:32:05Z',
    assignedTo: 'Regulatory Affairs EU',
    dueDate: '2025-01-30',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-016',
    signalId: 'SIG-2026-001',
    category: 'regulatory-timeline',
    title: 'JP PMDA notification assessed',
    description: 'PMDA safety notification requirement under review per PAFSC guidelines',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'submissions-hub',
    linkedRecordId: 'SUB-JP-SAF-001',
    linkedRecordType: 'notification',
    triggeredAt: '2024-12-15T14:32:10Z',
    assignedTo: 'Regulatory Affairs Japan',
    dueDate: '2025-01-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-017',
    signalId: 'SIG-2026-001',
    category: 'regulatory-timeline',
    title: 'Regulatory calendar updated',
    description: 'All LIG-2847 submission timelines recalculated accounting for safety supplement priority',
    status: 'completed',
    priority: 'high',
    linkedModule: 'submissions-hub',
    triggeredAt: '2024-12-15T14:32:15Z',
    completedAt: '2024-12-15T14:32:20Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Updated Regulatory Calendar'],
  },

  // === HAQ PREPARATION ===
  {
    id: 'cascade-018',
    signalId: 'SIG-2026-001',
    category: 'haq-preparation',
    title: 'FDA hepatotoxicity HAQ template pre-populated',
    description: 'Anticipated FDA questions on hepatotoxicity monitoring, dose modification, contraindications',
    status: 'completed',
    priority: 'high',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-001',
    linkedRecordType: 'haq-template',
    triggeredAt: '2024-12-15T14:33:00Z',
    completedAt: '2024-12-15T14:33:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['HAQ Response Template - Hepatotoxicity'],
  },
  {
    id: 'cascade-019',
    signalId: 'SIG-2026-001',
    category: 'haq-preparation',
    title: 'EMA hepatotoxicity questions pre-populated',
    description: 'Anticipated EMA questions based on PRAC signal precedents for similar compounds',
    status: 'completed',
    priority: 'high',
    linkedModule: 'haq',
    linkedRecordId: 'HAQ-TEMPLATE-002',
    linkedRecordType: 'haq-template',
    triggeredAt: '2024-12-15T14:33:35Z',
    completedAt: '2024-12-15T14:34:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['HAQ Response Template - EMA Hepatotoxicity'],
  },
  {
    id: 'cascade-020',
    signalId: 'SIG-2026-001',
    category: 'haq-preparation',
    title: 'Case narratives pre-compiled',
    description: '12 serious hepatotoxicity case narratives compiled for HA response readiness',
    status: 'completed',
    priority: 'high',
    linkedModule: 'haq',
    triggeredAt: '2024-12-15T14:34:05Z',
    completedAt: '2024-12-15T14:35:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Case Narrative Compilation'],
  },
  {
    id: 'cascade-021',
    signalId: 'SIG-2026-001',
    category: 'haq-preparation',
    title: 'Competitor label comparison generated',
    description: 'Hepatotoxicity labeling analysis for KRAS inhibitors class (sotorasib, adagrasib)',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'haq',
    triggeredAt: '2024-12-15T14:35:05Z',
    completedAt: '2024-12-15T14:36:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Competitive Label Analysis'],
  },

  // === FIELD ALERTS ===
  {
    id: 'cascade-022',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: 'MSL talking points generated',
    description: 'Hepatotoxicity discussion guide with monitoring recommendations for field medical',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'MSL-TP-001',
    linkedRecordType: 'talking-points',
    triggeredAt: '2024-12-15T14:37:00Z',
    completedAt: '2024-12-15T14:38:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['MSL Talking Points - Hepatotoxicity Signal'],
  },
  {
    id: 'cascade-023',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: '12 KOLs flagged for proactive outreach',
    description: 'Key hepatology and oncology KOLs identified for signal communication',
    status: 'completed',
    priority: 'high',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'KOL-OUTREACH-001',
    linkedRecordType: 'kol-list',
    triggeredAt: '2024-12-15T14:38:05Z',
    completedAt: '2024-12-15T14:38:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['KOL Outreach Priority List'],
  },
  {
    id: 'cascade-024',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: 'Field safety letter drafted',
    description: 'Dear Healthcare Provider letter template prepared for hepatotoxicity communication',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'FSL-001',
    linkedRecordType: 'field-safety-letter',
    triggeredAt: '2024-12-15T14:38:35Z',
    assignedTo: 'Medical Affairs Lead',
    dueDate: '2024-12-18',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-025',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: 'Medical information response updated',
    description: 'MI standard response for hepatotoxicity inquiries updated in knowledge base',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'MI-SR-HEPATO-001',
    linkedRecordType: 'standard-response',
    triggeredAt: '2024-12-15T14:39:00Z',
    assignedTo: 'Medical Information',
    dueDate: '2024-12-17',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-026',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: 'Territory alert distributed',
    description: 'All MSL territories notified with hepatotoxicity signal summary',
    status: 'completed',
    priority: 'high',
    linkedModule: 'medical-affairs',
    triggeredAt: '2024-12-15T14:39:30Z',
    completedAt: '2024-12-15T14:40:00Z',
    automatedAction: true,
    requiresApproval: false,
  },

  // === MLR ESCALATION ===
  {
    id: 'cascade-027',
    signalId: 'SIG-2026-001',
    category: 'mlr-escalation',
    title: 'MLR-2026-002 escalated to CRITICAL',
    description: 'HCP Communication mentioning hepatic monitoring escalated for expedited review',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'MLR-2026-002',
    linkedRecordType: 'mlr-item',
    triggeredAt: '2024-12-15T14:41:00Z',
    completedAt: '2024-12-15T14:41:05Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-028',
    signalId: 'SIG-2026-001',
    category: 'mlr-escalation',
    title: 'MLR-2026-005 escalated to CRITICAL',
    description: 'Sales Aid with safety messaging flagged for signal-related content review',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'MLR-2026-005',
    linkedRecordType: 'mlr-item',
    triggeredAt: '2024-12-15T14:41:10Z',
    completedAt: '2024-12-15T14:41:15Z',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-029',
    signalId: 'SIG-2026-001',
    category: 'mlr-escalation',
    title: 'Active promotional materials audit',
    description: 'Scan of 47 active LIG-2847 materials for hepatotoxicity-related claims',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'medical-affairs',
    triggeredAt: '2024-12-15T14:41:20Z',
    assignedTo: 'MLR Coordinator',
    dueDate: '2024-12-17',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-030',
    signalId: 'SIG-2026-001',
    category: 'mlr-escalation',
    title: 'Congress materials review triggered',
    description: '3 upcoming congress presentations flagged for safety content review',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'medical-affairs',
    linkedRecordId: 'CONGRESS-REVIEW-001',
    linkedRecordType: 'congress-materials',
    triggeredAt: '2024-12-15T14:41:30Z',
    assignedTo: 'Scientific Communications',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },

  // === CLINICAL IMPACT ===
  {
    id: 'cascade-031',
    signalId: 'SIG-2026-001',
    category: 'clinical-impact',
    title: 'Active trial protocols assessed',
    description: '4 active LIG-2847 trials identified for protocol amendment consideration',
    status: 'in-progress',
    priority: 'critical',
    linkedModule: 'ctms',
    linkedRecordId: 'PROTOCOL-REVIEW-001',
    linkedRecordType: 'protocol-assessment',
    triggeredAt: '2024-12-15T14:42:00Z',
    assignedTo: 'Clinical Operations',
    dueDate: '2024-12-18',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-032',
    signalId: 'SIG-2026-001',
    category: 'clinical-impact',
    title: 'DSMB notification prepared',
    description: 'Data Safety Monitoring Board alert drafted for hepatotoxicity signal',
    status: 'pending-review',
    priority: 'critical',
    linkedModule: 'ctms',
    linkedRecordId: 'DSMB-ALERT-001',
    linkedRecordType: 'dsmb-notification',
    triggeredAt: '2024-12-15T14:42:10Z',
    assignedTo: 'Clinical Safety',
    dueDate: '2024-12-16',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-033',
    signalId: 'SIG-2026-001',
    category: 'clinical-impact',
    title: 'Informed consent assessment',
    description: 'ICF hepatotoxicity language evaluated for adequacy across 4 active trials',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'ctms',
    linkedRecordId: 'ICF-REVIEW-001',
    linkedRecordType: 'icf-assessment',
    triggeredAt: '2024-12-15T14:42:20Z',
    assignedTo: 'Regulatory Affairs Clinical',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-034',
    signalId: 'SIG-2026-001',
    category: 'clinical-impact',
    title: 'Monitoring guidelines updated',
    description: 'Enhanced LFT monitoring schedule recommended for active trial sites',
    status: 'completed',
    priority: 'critical',
    linkedModule: 'ctms',
    triggeredAt: '2024-12-15T14:42:30Z',
    completedAt: '2024-12-15T14:50:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Updated Monitoring Guidelines'],
  },

  // === QUALITY IMPACT ===
  {
    id: 'cascade-035',
    signalId: 'SIG-2026-001',
    category: 'quality-impact',
    title: 'Quality event correlation analysis',
    description: 'Manufacturing batches correlated with hepatotoxicity cases - no batch-specific signal',
    status: 'completed',
    priority: 'high',
    linkedModule: 'qms',
    triggeredAt: '2024-12-15T14:43:00Z',
    completedAt: '2024-12-15T14:55:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Batch Correlation Report'],
  },
  {
    id: 'cascade-036',
    signalId: 'SIG-2026-001',
    category: 'quality-impact',
    title: 'CAPA assessment initiated',
    description: 'Corrective action assessment for enhanced batch release testing consideration',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'qms',
    linkedRecordId: 'CAPA-2024-089',
    linkedRecordType: 'capa',
    triggeredAt: '2024-12-15T14:43:10Z',
    assignedTo: 'Quality Assurance',
    dueDate: '2024-12-22',
    automatedAction: true,
    requiresApproval: true,
  },

  // === SUPPLY IMPACT ===
  {
    id: 'cascade-037',
    signalId: 'SIG-2026-001',
    category: 'supply-impact',
    title: 'Supply continuity assessment',
    description: 'Impact assessment if label change requires temporary supply disruption',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'supply-chain',
    linkedRecordId: 'SUPPLY-ASSESS-001',
    linkedRecordType: 'supply-assessment',
    triggeredAt: '2024-12-15T14:44:00Z',
    assignedTo: 'Supply Chain Planning',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-038',
    signalId: 'SIG-2026-001',
    category: 'supply-impact',
    title: 'Packaging update assessment',
    description: 'Patient information leaflet reprint requirements evaluated for label change',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'supply-chain',
    triggeredAt: '2024-12-15T14:44:10Z',
    assignedTo: 'Packaging Operations',
    dueDate: '2024-12-23',
    automatedAction: true,
    requiresApproval: true,
  },

  // Additional granular actions to reach 47 total
  {
    id: 'cascade-039',
    signalId: 'SIG-2026-001',
    category: 'detection',
    title: 'Similar drug class signals retrieved',
    description: 'Historical hepatotoxicity signals for KRAS inhibitor class analyzed',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'safety',
    triggeredAt: '2024-12-15T14:30:40Z',
    completedAt: '2024-12-15T14:31:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Class Effect Analysis'],
  },
  {
    id: 'cascade-040',
    signalId: 'SIG-2026-001',
    category: 'label-impact',
    title: 'Patient Medication Guide flagged',
    description: 'US Patient Medication Guide liver warning section identified for revision',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'labeling',
    triggeredAt: '2024-12-15T14:30:50Z',
    assignedTo: 'Regulatory Affairs US',
    dueDate: '2024-12-22',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-041',
    signalId: 'SIG-2026-001',
    category: 'document-updates',
    title: 'CSR safety section flagged',
    description: 'Clinical Study Report Module 5.3.5 safety section identified for update',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'authoring',
    triggeredAt: '2024-12-15T14:31:25Z',
    assignedTo: 'Medical Writing',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-042',
    signalId: 'SIG-2026-001',
    category: 'regulatory-timeline',
    title: 'Health Canada notification assessed',
    description: 'REMS-like requirements under Health Canada safety review',
    status: 'pending-review',
    priority: 'standard',
    linkedModule: 'submissions-hub',
    triggeredAt: '2024-12-15T14:32:20Z',
    assignedTo: 'Regulatory Affairs Canada',
    dueDate: '2025-01-15',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-043',
    signalId: 'SIG-2026-001',
    category: 'haq-preparation',
    title: 'Line listing pre-generated',
    description: 'Hepatotoxicity case line listing auto-generated for HA submission',
    status: 'completed',
    priority: 'high',
    linkedModule: 'haq',
    triggeredAt: '2024-12-15T14:36:05Z',
    completedAt: '2024-12-15T14:36:30Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Hepatotoxicity Case Line Listing'],
  },
  {
    id: 'cascade-044',
    signalId: 'SIG-2026-001',
    category: 'field-alerts',
    title: 'FAQs for field teams generated',
    description: 'Frequently asked questions document for MSL and sales team reference',
    status: 'completed',
    priority: 'standard',
    linkedModule: 'medical-affairs',
    triggeredAt: '2024-12-15T14:40:05Z',
    completedAt: '2024-12-15T14:41:00Z',
    automatedAction: true,
    requiresApproval: false,
    outputArtifacts: ['Field Team FAQ Document'],
  },
  {
    id: 'cascade-045',
    signalId: 'SIG-2026-001',
    category: 'clinical-impact',
    title: 'Site notification template prepared',
    description: 'Clinical site notification letter for hepatotoxicity signal drafted',
    status: 'pending-review',
    priority: 'high',
    linkedModule: 'ctms',
    triggeredAt: '2024-12-15T14:42:40Z',
    assignedTo: 'Clinical Operations',
    dueDate: '2024-12-18',
    automatedAction: true,
    requiresApproval: true,
  },
  {
    id: 'cascade-046',
    signalId: 'SIG-2026-001',
    category: 'quality-impact',
    title: 'Stability data review triggered',
    description: 'Review of stability data for any correlation with potency/impurity changes',
    status: 'in-progress',
    priority: 'standard',
    linkedModule: 'qms',
    triggeredAt: '2024-12-15T14:43:20Z',
    assignedTo: 'Quality Control',
    dueDate: '2024-12-20',
    automatedAction: true,
    requiresApproval: false,
  },
  {
    id: 'cascade-047',
    signalId: 'SIG-2026-001',
    category: 'mlr-escalation',
    title: 'Website content audit initiated',
    description: 'Patient and HCP website content reviewed for hepatotoxicity claims accuracy',
    status: 'in-progress',
    priority: 'high',
    linkedModule: 'medical-affairs',
    triggeredAt: '2024-12-15T14:41:40Z',
    assignedTo: 'Digital Marketing',
    dueDate: '2024-12-18',
    automatedAction: true,
    requiresApproval: true,
  },
];

// ============================================================================
// AGGREGATE CASCADE DATA
// ============================================================================

export const hepatotoxicityCascade: SignalCascade = {
  id: 'cascade-sig-2026-001',
  signalId: 'SIG-2026-001',
  signalCode: 'SIG-2026-001',
  signalName: 'Hepatotoxicity',
  productId: 'lig-2847',
  productName: 'LIG-2847 (Nexavant)',
  severity: 'critical',
  triggeredAt: '2024-12-15T14:30:00Z',
  lastUpdated: '2024-12-15T15:00:00Z',
  totalActions: 47,
  completedActions: 18,
  automatedActions: 47,
  manualActions: 0,
  estimatedCompletionDate: '2025-01-30',
  stages: [
    {
      category: 'detection',
      label: 'Detection',
      description: 'Signal creation and initial assessment',
      icon: 'AlertTriangle',
      totalActions: 4,
      completedActions: 4,
      inProgressActions: 0,
      pendingActions: 0,
      criticalCount: 2,
      status: 'completed',
    },
    {
      category: 'label-impact',
      label: 'Label Impact',
      description: 'CCDS flagged, 3 regional labels queued for review',
      icon: 'Tag',
      totalActions: 6,
      completedActions: 2,
      inProgressActions: 2,
      pendingActions: 2,
      criticalCount: 3,
      status: 'in-progress',
    },
    {
      category: 'document-updates',
      label: 'Document Updates',
      description: 'PI Section 4.4 flagged, 5 documents queued',
      icon: 'FileText',
      totalActions: 6,
      completedActions: 0,
      inProgressActions: 3,
      pendingActions: 3,
      criticalCount: 2,
      status: 'in-progress',
    },
    {
      category: 'regulatory-timeline',
      label: 'Regulatory Timeline',
      description: 'US NDA supplement triggered, EU variation assessed',
      icon: 'Calendar',
      totalActions: 5,
      completedActions: 1,
      inProgressActions: 1,
      pendingActions: 3,
      criticalCount: 2,
      status: 'in-progress',
    },
    {
      category: 'haq-preparation',
      label: 'HAQ Preparation',
      description: '4 anticipated questions pre-populated',
      icon: 'MessageSquare',
      totalActions: 5,
      completedActions: 5,
      inProgressActions: 0,
      pendingActions: 0,
      criticalCount: 0,
      status: 'completed',
    },
    {
      category: 'field-alerts',
      label: 'Field Alerts',
      description: 'MSL talking points generated, 12 KOLs flagged',
      icon: 'Users',
      totalActions: 6,
      completedActions: 4,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 1,
      status: 'in-progress',
    },
    {
      category: 'mlr-escalation',
      label: 'MLR Escalation',
      description: '2 promotional materials → critical priority',
      icon: 'AlertCircle',
      totalActions: 5,
      completedActions: 2,
      inProgressActions: 2,
      pendingActions: 1,
      criticalCount: 2,
      status: 'in-progress',
    },
    {
      category: 'clinical-impact',
      label: 'Clinical Impact',
      description: '4 active trials assessed, DSMB notified',
      icon: 'Stethoscope',
      totalActions: 5,
      completedActions: 1,
      inProgressActions: 2,
      pendingActions: 2,
      criticalCount: 2,
      status: 'in-progress',
    },
    {
      category: 'quality-impact',
      label: 'Quality Impact',
      description: 'Batch correlation complete, CAPA assessment initiated',
      icon: 'Shield',
      totalActions: 3,
      completedActions: 1,
      inProgressActions: 1,
      pendingActions: 1,
      criticalCount: 0,
      status: 'in-progress',
    },
    {
      category: 'supply-impact',
      label: 'Supply Impact',
      description: 'Continuity and packaging assessment pending',
      icon: 'Truck',
      totalActions: 2,
      completedActions: 0,
      inProgressActions: 0,
      pendingActions: 2,
      criticalCount: 0,
      status: 'pending',
    },
  ],
  actions: hepatotoxicityCascadeActions,
  crossModuleLinks: [
    {
      id: 'link-001',
      sourceModule: 'safety',
      sourceRecordId: 'SIG-2026-001',
      sourceRecordType: 'signal',
      targetModule: 'labeling',
      targetRecordId: 'CCDS-LIG2847-001',
      targetRecordType: 'ccds',
      linkType: 'triggers',
      createdAt: '2024-12-15T14:30:15Z',
      automated: true,
    },
    {
      id: 'link-002',
      sourceModule: 'safety',
      sourceRecordId: 'SIG-2026-001',
      sourceRecordType: 'signal',
      targetModule: 'medical-affairs',
      targetRecordId: 'MLR-2026-002',
      targetRecordType: 'mlr-item',
      linkType: 'impacts',
      createdAt: '2024-12-15T14:41:00Z',
      automated: true,
    },
    {
      id: 'link-003',
      sourceModule: 'safety',
      sourceRecordId: 'SIG-2026-001',
      sourceRecordType: 'signal',
      targetModule: 'submissions-hub',
      targetRecordId: 'SUB-NDA-SUP-001',
      targetRecordType: 'submission',
      linkType: 'triggers',
      createdAt: '2024-12-15T14:32:00Z',
      automated: true,
    },
    {
      id: 'link-004',
      sourceModule: 'safety',
      sourceRecordId: 'SIG-2026-001',
      sourceRecordType: 'signal',
      targetModule: 'haq',
      targetRecordId: 'HAQ-TEMPLATE-001',
      targetRecordType: 'haq-template',
      linkType: 'informs',
      createdAt: '2024-12-15T14:33:00Z',
      automated: true,
    },
    {
      id: 'link-005',
      sourceModule: 'safety',
      sourceRecordId: 'SIG-2026-001',
      sourceRecordType: 'signal',
      targetModule: 'ctms',
      targetRecordId: 'DSMB-ALERT-001',
      targetRecordType: 'dsmb-notification',
      linkType: 'triggers',
      createdAt: '2024-12-15T14:42:10Z',
      automated: true,
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCascadeActionsByCategory(cascade: SignalCascade, category: CascadeCategory): CascadeAction[] {
  return cascade.actions.filter(a => a.category === category);
}

export function getCascadeProgress(cascade: SignalCascade): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentComplete: number;
} {
  const total = cascade.totalActions;
  const completed = cascade.actions.filter(a => a.status === 'completed').length;
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

export function getCriticalActions(cascade: SignalCascade): CascadeAction[] {
  return cascade.actions.filter(a => a.priority === 'critical' && a.status !== 'completed');
}

export function getOverdueActions(cascade: SignalCascade): CascadeAction[] {
  const now = new Date();
  return cascade.actions.filter(a => {
    if (a.status === 'completed' || !a.dueDate) return false;
    return new Date(a.dueDate) < now;
  });
}

export function getActionsByModule(cascade: SignalCascade, module: LinkedModule): CascadeAction[] {
  return cascade.actions.filter(a => a.linkedModule === module);
}

export function getTimelineEvents(cascade: SignalCascade): {
  timestamp: string;
  action: CascadeAction;
  eventType: 'triggered' | 'completed';
}[] {
  const events: { timestamp: string; action: CascadeAction; eventType: 'triggered' | 'completed' }[] = [];
  
  cascade.actions.forEach(action => {
    events.push({
      timestamp: action.triggeredAt,
      action,
      eventType: 'triggered',
    });
    
    if (action.completedAt) {
      events.push({
        timestamp: action.completedAt,
        action,
        eventType: 'completed',
      });
    }
  });
  
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ============================================================================
// DEMO STATISTICS
// ============================================================================

export const cascadeDemoStats = {
  signalDetectedAt: '2024-12-15T14:30:00Z',
  cascadeTriggeredWithin: '30 seconds',
  totalActionsIdentified: 47,
  automatedActionsPercent: 100,
  crossModuleConnections: 5,
  modulesImpacted: 10,
  criticalActions: 14,
  estimatedTimeToResolution: '45 days',
  // Comparison to legacy
  legacyTimeToIdentify: '6-8 weeks',
  ligatureTimeToIdentify: '30 seconds',
  timeReductionPercent: 99.95,
};
