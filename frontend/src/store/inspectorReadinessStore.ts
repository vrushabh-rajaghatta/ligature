

/**
 * Inspector Readiness Store
 * 
 * Comprehensive GxP inspection readiness tracking based on global health authority
 * inspector checklists for GMP, GLP, GVP, GCP, and cross-cutting GxP requirements.
 * 
 * References:
 * - EU GMP Annex 11 (Computerised Systems)
 * - FDA 21 CFR Part 11
 * - PIC/S PI 011 (GxP Computerised Systems)
 * - MHRA GxP Data Integrity (ALCOA/ALCOA+)
 * - ICH E6(R2) (GCP)
 * - EU GVP Module I (PV Quality System)
 * - OECD GLP Principles
 */

import { create } from 'zustand';
import { 
  GxPDomain, 
  InspectorCheckCategory, 
  InspectorCheckItem, 
  InspectorReadinessScore 
} from '@/types/core';

// ============================================================================
// MASTER CHECKLIST - Based on provided Global Health Authority Inspector Checklist
// ============================================================================

const MASTER_CHECKLIST: Omit<InspectorCheckItem, 'status' | 'evidence' | 'gaps' | 'capaIds' | 'lastAssessed' | 'assessedBy' | 'notes'>[] = [
  // A. INSPECTION SETUP
  {
    id: 'A1',
    category: 'system-identification',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'What is the system name/version, owner, intended use, and GxP impact (GMP/GLP/GCP/GVP)?',
    lookFor: [
      'System description',
      'Intended use statement',
      'Data flow diagrams',
      'GxP impact assessment / risk assessment',
      'Boundaries/interfaces',
      'Hosting model (on-prem/cloud)'
    ],
    regulatoryRefs: ['EU GMP Annex 11']
  },
  {
    id: 'A2',
    category: 'risk-assessment',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'What is the risk classification (patient safety, product quality, data integrity)? How was it determined?',
    lookFor: [
      'Risk assessment that drives validation depth/testing',
      'Access controls based on risk',
      'Audit trail strategy based on risk'
    ],
    regulatoryRefs: ['PIC/S PI 011']
  },
  {
    id: 'A3',
    category: 'roles-responsibilities',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Who is accountable for: system owner, process owner, QA, IT, vendor? Who approves releases?',
    lookFor: [
      'RACI matrix',
      'SOPs defining roles',
      'Training records',
      'Quality agreements (esp. for suppliers/cloud)'
    ],
    regulatoryRefs: ['PIC/S PI 011']
  },

  // B. QUALITY SYSTEM CONTROLS
  {
    id: 'B1',
    category: 'procedures',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Are SOPs complete and actually used for: validation, change control, incident/deviation, access management, periodic review, backup/restore, audit trail review, data retention/archiving, vendor management?',
    lookFor: [
      'Effective dates on SOPs',
      'Training completion records',
      'Evidence of SOP use (not "shelf SOPs")'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'PIC/S PI 011']
  },
  {
    id: 'B2',
    category: 'training',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How are users/admins trained and qualified? How is training maintained for new releases?',
    lookFor: [
      'Role-based curricula',
      'Training completion evidence',
      'Effectiveness checks for critical roles'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11']
  },
  {
    id: 'B3',
    category: 'deviations-capa',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Show the last 5 deviations/incidents impacting GxP data and how they were investigated.',
    lookFor: [
      'Root cause analysis',
      'Impact assessment (product/study/safety reporting)',
      'CAPA effectiveness verification'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'ICH Q10']
  },

  // C. VALIDATION / QUALIFICATION (CSV) & LIFECYCLE CONTROL
  {
    id: 'C1',
    category: 'validation',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Prove the system is validated for intended use (and stays that way).',
    lookFor: [
      'Validation plan',
      'URS/requirements',
      'Risk assessment',
      'Traceability matrix',
      'Test scripts/results (IQ/OQ/PQ or equivalent)',
      'Acceptance approvals',
      'Validation summary'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'GAMP 5', 'PIC/S PI 011']
  },
  {
    id: 'C2',
    category: 'requirements',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How do requirements ensure data integrity, security, audit trails, and correct calculations?',
    lookFor: [
      'Requirements covering audit trails',
      'Access control requirements',
      'Time sync requirements',
      'Electronic signature requirements',
      'Reporting requirements',
      'Interface requirements',
      '"No silent failures" requirements'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11']
  },
  {
    id: 'C3',
    category: 'spreadsheets',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Any "shadow systems" exporting data to spreadsheets for release decisions/signal detection?',
    lookFor: [
      'Inventory of spreadsheets',
      'Controls on spreadsheets',
      'Validation/verification of spreadsheets',
      'Version control',
      'Access control',
      'Second-person review'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'FDA Data Integrity Guidance']
  },

  // D. DATA INTEGRITY (ALCOA/ALCOA+)
  {
    id: 'D1',
    category: 'data-lifecycle',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Walk me through data from creation → processing → review → reporting → retention/archiving.',
    lookFor: [
      'Controls for Attributable data',
      'Controls for Legible data',
      'Controls for Contemporaneous data',
      'Controls for Original data',
      'Controls for Accurate data',
      'Controls for Complete data',
      'Controls for Consistent data',
      'Controls for Enduring data',
      'Controls for Available data'
    ],
    regulatoryRefs: ['MHRA GxP Data Integrity', 'FDA Data Integrity Guidance']
  },
  {
    id: 'D2',
    category: 'audit-trails',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Which events are audit-trailed? Who reviews audit trails, how often, and what triggers review?',
    lookFor: [
      'Audit trail configuration',
      'Sample audit trail exports',
      'Documented review logs',
      'Investigation of anomalies'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11', 'MHRA Data Integrity']
  },
  {
    id: 'D3',
    category: 'time-attribution',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How do you ensure timestamps are accurate and user actions are attributable?',
    lookFor: [
      'Time synchronization controls',
      'Unique user IDs',
      'Prohibition of shared accounts',
      'Admin activity logging'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11']
  },

  // E. SECURITY, ACCESS MANAGEMENT, SEGREGATION OF DUTIES
  {
    id: 'E1',
    category: 'access-management',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How is access granted/changed/removed? How often is access recertified?',
    lookFor: [
      'Ticket evidence for access changes',
      'Approvals for access',
      'Joiner/mover/leaver process',
      'Periodic access reviews',
      'Privileged access controls'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11']
  },
  {
    id: 'E2',
    category: 'privileged-accounts',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Who are the admins? How are admin actions controlled and monitored?',
    lookFor: [
      'Separate admin accounts',
      'MFA where possible',
      'Logging of admin actions',
      'Review of admin actions',
      'Emergency access ("break glass") procedure'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11', 'PIC/S PI 011']
  },
  {
    id: 'E3',
    category: 'segregation-of-duties',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Can the same person create, approve, and release GxP records?',
    lookFor: [
      'Role design preventing single-person end-to-end control',
      'Separation of critical steps',
      'Documented approval workflows'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'ICH Q10']
  },

  // F. ELECTRONIC RECORDS & SIGNATURES
  {
    id: 'F1',
    category: 'electronic-records',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Which records are required by predicate rules and are kept electronically?',
    lookFor: [
      'Controls making records trustworthy and reliable',
      'Predicate rule mapping',
      'Record retention requirements'
    ],
    regulatoryRefs: ['21 CFR Part 11', 'EU GMP Annex 11']
  },
  {
    id: 'F2',
    category: 'e-signatures',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Are e-signatures uniquely linked to an individual? Are they captured with meaning (e.g., review/approval) and protected from repudiation?',
    lookFor: [
      'Signature policy',
      'Authentication method',
      'Signature manifestations',
      'Linking to records',
      'Periodic checks'
    ],
    regulatoryRefs: ['21 CFR Part 11', 'EU GMP Annex 11']
  },

  // G. CHANGE CONTROL, CONFIGURATION, RELEASES
  {
    id: 'G1',
    category: 'change-control',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Show the last 3 production changes (config, code, infrastructure). What was tested? Who approved?',
    lookFor: [
      'Impact assessments',
      'Validation regression rationale',
      'Approvals',
      'Deployment evidence'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'PIC/S PI 011']
  },
  {
    id: 'G2',
    category: 'configuration',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'What configuration is "GxP critical," and how do you control it?',
    lookFor: [
      'Versioned configurations',
      'Controlled parameter changes',
      'Baseline documentation'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'GAMP 5']
  },
  {
    id: 'G3',
    category: 'periodic-review',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How do you confirm the validated state is maintained over time?',
    lookFor: [
      'Periodic review reports',
      'Incident trend analysis',
      'Change impact summaries',
      'Access review summaries',
      'Backup test results',
      'Audit trail review trends'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'PIC/S PI 011']
  },

  // H. SUPPLIERS, CLOUD, OUTSOURCED SERVICES
  {
    id: 'H1',
    category: 'supplier-qualification',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How did you qualify the vendor and hosting provider?',
    lookFor: [
      'Due diligence documentation',
      'Audits/questionnaires',
      'SLAs',
      'Quality agreement',
      'Subcontractor visibility',
      'Right-to-audit language'
    ],
    regulatoryRefs: ['PIC/S PI 011', 'EU GMP Annex 11']
  },
  {
    id: 'H2',
    category: 'sdlc',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Show SDLC controls: requirements, code review, testing, defect mgmt.',
    lookFor: [
      'Documented SDLC',
      'Release notes',
      'Known issues assessment',
      'Secure development practices'
    ],
    regulatoryRefs: ['GAMP 5', 'PIC/S PI 011']
  },

  // I. OPERATIONS
  {
    id: 'I1',
    category: 'incident-management',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How do you detect issues, assess GxP impact, and prevent recurrence?',
    lookFor: [
      'Monitoring capabilities',
      'Incident tickets',
      'Deviation linkage',
      'CAPA effectiveness'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'ICH Q10']
  },
  {
    id: 'I2',
    category: 'backup-restore',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'When was the last successful restore test? What is your RPO/RTO for GxP data?',
    lookFor: [
      'Restore test evidence',
      'DR test results',
      'Immutable backups where feasible',
      'Controlled media',
      'Retention schedules'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'PIC/S PI 011']
  },
  {
    id: 'I3',
    category: 'data-retention',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'How long do you retain records, and can you retrieve them in a readable form?',
    lookFor: [
      'Retention policy',
      'Archive validation',
      'Retrieval tests'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR Part 11']
  },
  {
    id: 'I4',
    category: 'interfaces',
    domain: ['GxP', 'GMP', 'GLP', 'GCP', 'GVP'],
    question: 'Which interfaces exist (LIMS↔MES, EDC↔CTMS, Safety DB↔regulatory gateway)? How is transfer accuracy assured?',
    lookFor: [
      'Interface specifications',
      'Data mapping',
      'Reconciliation checks',
      'Error handling',
      'Periodic review of failed messages'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'PIC/S PI 011']
  },

  // J. DOMAIN-SPECIFIC: GMP
  {
    id: 'J1-GMP-1',
    category: 'data-lifecycle',
    domain: ['GMP'],
    question: 'Batch record integrity: Are there controls preventing missing steps/retroactive entries?',
    lookFor: [
      'Second-person review where required',
      'Audit trail on batch records',
      'Sequential step enforcement'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR 211']
  },
  {
    id: 'J1-GMP-2',
    category: 'audit-trails',
    domain: ['GMP'],
    question: 'Audit trail review for critical GMP events: recipe changes, spec limits, overrides, deletions?',
    lookFor: [
      'Documented review of critical events',
      'Exception reports',
      'Investigation records'
    ],
    regulatoryRefs: ['EU GMP Annex 11']
  },
  {
    id: 'J1-GMP-3',
    category: 'interfaces',
    domain: ['GMP'],
    question: 'Instrument integration: Is raw data captured from instruments with no uncontrolled reprocessing?',
    lookFor: [
      'Direct data capture',
      'Raw data preservation',
      'Reprocessing controls'
    ],
    regulatoryRefs: ['EU GMP Annex 11', 'FDA Data Integrity']
  },
  {
    id: 'J1-GMP-4',
    category: 'validation',
    domain: ['GMP'],
    question: 'Release decision support: Are calculations, CoA generation, spec checks validated? Are there controls on master data?',
    lookFor: [
      'Validated calculations',
      'CoA generation testing',
      'Spec check validation',
      'Master data controls'
    ],
    regulatoryRefs: ['EU GMP Annex 11', '21 CFR 211']
  },

  // J. DOMAIN-SPECIFIC: GLP
  {
    id: 'J2-GLP-1',
    category: 'roles-responsibilities',
    domain: ['GLP'],
    question: 'Study integrity & QA independence: Is there QA review evidence with controlled study plans/amendments?',
    lookFor: [
      'QA review evidence',
      'Controlled study plans',
      'Amendment controls',
      'Raw data definition and protection'
    ],
    regulatoryRefs: ['OECD GLP Principles']
  },
  {
    id: 'J2-GLP-2',
    category: 'data-lifecycle',
    domain: ['GLP'],
    question: 'Sample chain of custody: Is there proper receipt, labeling, storage conditions, and disposition tracking?',
    lookFor: [
      'Sample receipt records',
      'Labeling procedures',
      'Storage condition monitoring',
      'Disposition tracking'
    ],
    regulatoryRefs: ['OECD GLP Principles']
  },
  {
    id: 'J2-GLP-3',
    category: 'audit-trails',
    domain: ['GLP'],
    question: 'Raw data controls: Are instrument audit trails enabled with reanalysis justification and controlled calculation templates?',
    lookFor: [
      'Instrument audit trails',
      'Reanalysis justification requirements',
      'Controlled calculation templates'
    ],
    regulatoryRefs: ['OECD GLP Principles', 'FDA GLP Regulations']
  },

  // J. DOMAIN-SPECIFIC: GCP
  {
    id: 'J3-GCP-1',
    category: 'data-lifecycle',
    domain: ['GCP'],
    question: 'Trial data credibility & subject protection: Are there controls consistent with ICH E6(R2) responsibilities?',
    lookFor: [
      'Data quality controls',
      'Subject protection measures',
      'Source data verification',
      'Informed consent tracking'
    ],
    regulatoryRefs: ['ICH E6(R2)']
  },
  {
    id: 'J3-GCP-2',
    category: 'access-management',
    domain: ['GCP'],
    question: 'Blinding/randomization integrity (IRT): Is there role separation, access restrictions, and emergency unblinding controls?',
    lookFor: [
      'Role separation for unblinding',
      'Access restrictions on treatment codes',
      'Emergency unblinding procedures',
      'Audit trails on unblinding'
    ],
    regulatoryRefs: ['ICH E6(R2)', 'FDA IRT Guidance']
  },
  {
    id: 'J3-GCP-3',
    category: 'data-lifecycle',
    domain: ['GCP'],
    question: 'eTMF completeness: Is there essential document filing, versioning, and access controls?',
    lookFor: [
      'Essential document checklist',
      'Filing completeness metrics',
      'Version control',
      'Access controls'
    ],
    regulatoryRefs: ['ICH E6(R2)', 'TMF Reference Model']
  },
  {
    id: 'J3-GCP-4',
    category: 'audit-trails',
    domain: ['GCP'],
    question: 'Data query/change history: Is every change attributable with reason-for-change and audit trail review?',
    lookFor: [
      'Complete audit trails',
      'Reason-for-change capture',
      'Attribution to users',
      'Audit trail review procedures'
    ],
    regulatoryRefs: ['ICH E6(R2)', '21 CFR Part 11']
  },

  // J. DOMAIN-SPECIFIC: GVP
  {
    id: 'J4-GVP-1',
    category: 'procedures',
    domain: ['GVP'],
    question: 'PV quality system: Are PV QMS elements and oversight consistent with EU GVP Module I?',
    lookFor: [
      'PV QMS documentation',
      'Oversight procedures',
      'Performance metrics',
      'Management review'
    ],
    regulatoryRefs: ['EU GVP Module I']
  },
  {
    id: 'J4-GVP-2',
    category: 'validation',
    domain: ['GVP'],
    question: 'ICSR processing & reporting: Are workflows validated with serious/expedited reporting timelines supported and reconciliation with intake sources?',
    lookFor: [
      'Validated ICSR workflows',
      'Timeline compliance metrics',
      'Reconciliation procedures',
      'Source reconciliation'
    ],
    regulatoryRefs: ['EU GVP Module VI', 'ICH E2B(R3)']
  },
  {
    id: 'J4-GVP-3',
    category: 'interfaces',
    domain: ['GVP'],
    question: 'E2B(R3) compliance: Is message generation/validation working with acknowledgements and failed transmission handling?',
    lookFor: [
      'E2B(R3) message validation',
      'Acknowledgement handling',
      'Failed transmission procedures',
      'Gateway connectivity'
    ],
    regulatoryRefs: ['ICH E2B(R3)', 'FDA E2B Guidance']
  },
  {
    id: 'J4-GVP-4',
    category: 'validation',
    domain: ['GVP'],
    question: 'Signal detection analytics: Is there data provenance, controlled code/configuration, documented methods, and change impact assessment?',
    lookFor: [
      'Data provenance tracking',
      'Controlled analytical code',
      'Documented methods',
      'Change impact assessments'
    ],
    regulatoryRefs: ['EU GVP Module IX', 'FDA Signal Detection Guidance']
  }
];

// ============================================================================
// COMMON GOTCHA FINDINGS
// ============================================================================

export const COMMON_GOTCHA_FINDINGS = [
  {
    id: 'gotcha-1',
    title: 'Shared logins / generic admin accounts',
    description: 'Using shared or generic accounts prevents attribution of actions to individuals',
    severity: 'critical',
    relatedChecks: ['D3', 'E1', 'E2']
  },
  {
    id: 'gotcha-2',
    title: 'Audit trail enabled but not reviewed',
    description: 'Audit trails exist but are never reviewed, or missing key events',
    severity: 'critical',
    relatedChecks: ['D2', 'J1-GMP-2', 'J3-GCP-4']
  },
  {
    id: 'gotcha-3',
    title: '"Validated once" but uncontrolled changes since',
    description: 'System was validated initially but changes made without proper change control',
    severity: 'critical',
    relatedChecks: ['C1', 'G1', 'G3']
  },
  {
    id: 'gotcha-4',
    title: 'Uncontrolled spreadsheets for release/signal decisions',
    description: 'Critical decisions made using unvalidated spreadsheets outside the system',
    severity: 'critical',
    relatedChecks: ['C3']
  },
  {
    id: 'gotcha-5',
    title: 'Backups exist but restore not tested',
    description: 'Backups are made but ability to restore has never been verified',
    severity: 'major',
    relatedChecks: ['I2']
  },
  {
    id: 'gotcha-6',
    title: 'Interfaces lack reconciliation',
    description: '"Silent data drift" between systems with no reconciliation checks',
    severity: 'major',
    relatedChecks: ['I4', 'J1-GMP-3']
  },
  {
    id: 'gotcha-7',
    title: 'Overpowered roles (no segregation of duties)',
    description: 'Single users can create, approve, and release GxP records',
    severity: 'critical',
    relatedChecks: ['E3']
  }
];

// ============================================================================
// EVIDENCE REQUEST LIST
// ============================================================================

export const EVIDENCE_REQUEST_LIST = [
  'System inventory + GxP impact assessment + data flow diagram',
  'Validation package (plan → traceability → test evidence → summary)',
  'SOPs (validation, change, access, audit trail review, backup/restore, incident/CAPA, periodic review, vendor mgmt)',
  'Role matrix + current access list + last access review',
  'Audit trail config + 2–3 audit trail review examples',
  'Last 3 changes + last 3 incidents/deviations with impact assessments',
  'Backup/restore test evidence + DR summary',
  'Supplier qualification + quality agreement/SLA (if vendor/cloud)'
];

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface InspectorReadinessState {
  // Checklist items
  checklistItems: Record<string, InspectorCheckItem>;
  
  // Assessment state
  currentDomain: GxPDomain | 'all';
  selectedItemId: string | null;
  
  // Actions
  initializeChecklist: () => void;
  updateItemStatus: (
    itemId: string, 
    status: InspectorCheckItem['status'],
    updates?: Partial<Pick<InspectorCheckItem, 'evidence' | 'gaps' | 'capaIds' | 'notes' | 'assessedBy'>>
  ) => void;
  setCurrentDomain: (domain: GxPDomain | 'all') => void;
  selectItem: (itemId: string | null) => void;
  
  // Computed
  getItemsByCategory: (category: InspectorCheckCategory) => InspectorCheckItem[];
  getItemsByDomain: (domain: GxPDomain) => InspectorCheckItem[];
  getReadinessScores: () => InspectorReadinessScore[];
  getOverallScore: () => number;
  getGapItems: () => InspectorCheckItem[];
  getNotAssessedItems: () => InspectorCheckItem[];
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useInspectorReadinessStore = create<InspectorReadinessState>((set, get) => ({
  checklistItems: {},
  currentDomain: 'all',
  selectedItemId: null,

  initializeChecklist: () => {
    const items: Record<string, InspectorCheckItem> = {};
    
    MASTER_CHECKLIST.forEach(item => {
      items[item.id] = {
        ...item,
        status: 'not-assessed'
      };
    });
    
    set({ checklistItems: items });
  },

  updateItemStatus: (itemId, status, updates) => {
    set(state => ({
      checklistItems: {
        ...state.checklistItems,
        [itemId]: {
          ...state.checklistItems[itemId],
          status,
          lastAssessed: new Date().toISOString(),
          ...updates
        }
      }
    }));
  },

  setCurrentDomain: (domain) => set({ currentDomain: domain }),
  
  selectItem: (itemId) => set({ selectedItemId: itemId }),

  getItemsByCategory: (category) => {
    const { checklistItems } = get();
    return Object.values(checklistItems).filter(item => item.category === category);
  },

  getItemsByDomain: (domain) => {
    const { checklistItems } = get();
    return Object.values(checklistItems).filter(item => 
      item.domain.includes(domain) || item.domain.includes('GxP')
    );
  },

  getReadinessScores: () => {
    const { checklistItems } = get();
    const items = Object.values(checklistItems);
    const domains: GxPDomain[] = ['GMP', 'GLP', 'GCP', 'GVP', 'GxP'];
    
    return domains.map(domain => {
      const domainItems = items.filter(item => 
        item.domain.includes(domain) || (domain !== 'GxP' && item.domain.includes('GxP'))
      );
      
      const compliant = domainItems.filter(i => i.status === 'compliant').length;
      const gaps = domainItems.filter(i => i.status === 'gap').length;
      const partial = domainItems.filter(i => i.status === 'partial').length;
      const notAssessed = domainItems.filter(i => i.status === 'not-assessed').length;
      const na = domainItems.filter(i => i.status === 'na').length;
      
      const assessedItems = domainItems.length - notAssessed - na;
      const score = assessedItems > 0 
        ? Math.round(((compliant + partial * 0.5) / assessedItems) * 100) 
        : 0;
      
      return {
        domain,
        totalItems: domainItems.length,
        compliant,
        gaps,
        partial,
        notAssessed,
        score
      };
    });
  },

  getOverallScore: () => {
    const { checklistItems } = get();
    const items = Object.values(checklistItems);
    
    const compliant = items.filter(i => i.status === 'compliant').length;
    const partial = items.filter(i => i.status === 'partial').length;
    const notAssessed = items.filter(i => i.status === 'not-assessed').length;
    const na = items.filter(i => i.status === 'na').length;
    
    const assessedItems = items.length - notAssessed - na;
    return assessedItems > 0 
      ? Math.round(((compliant + partial * 0.5) / assessedItems) * 100) 
      : 0;
  },

  getGapItems: () => {
    const { checklistItems } = get();
    return Object.values(checklistItems).filter(item => item.status === 'gap');
  },

  getNotAssessedItems: () => {
    const { checklistItems } = get();
    return Object.values(checklistItems).filter(item => item.status === 'not-assessed');
  }
}));

// Export types for external use
export type { InspectorReadinessState };
