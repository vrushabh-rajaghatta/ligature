

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type TherapeuticArea = 
  | 'Oncology' 
  | 'Immunology' 
  | 'Neurology' 
  | 'Cardiology' 
  | 'Rare Disease'
  | 'Infectious Disease'
  | 'Metabolic'
  | 'Respiratory'
  | 'Ophthalmology'
  | 'Dermatology';

export type Modality = 
  | 'Small Molecule' 
  | 'Monoclonal Antibody'
  | 'Bispecific Antibody'
  | 'Cell Therapy' 
  | 'Gene Therapy' 
  | 'ADC'
  | 'Enzyme Replacement'
  | 'mRNA Therapy'
  | 'siRNA'
  | 'Peptide';

export type DevelopmentStage = 
  | 'Discovery' 
  | 'Preclinical' 
  | 'IND-Enabling'
  | 'Phase 1' 
  | 'Phase 1/2'
  | 'Phase 2' 
  | 'Phase 2/3'
  | 'Phase 3' 
  | 'NDA/BLA Filed'
  | 'Approved'
  | 'Post-Marketing';

export type ProgramStatus = 'on-track' | 'at-risk' | 'delayed' | 'ahead' | 'on-hold' | 'terminated';

export type ApplicationType = 'IND' | 'NDA' | 'BLA' | 'sNDA' | 'sBLA' | 'ANDA' | 'MAA' | 'CTA' | 'JNDA' | 'NDS' | 'IMPD';

export type ApplicationStatus = 
  | 'Planning'
  | 'Active' 
  | 'Submitted' 
  | 'Under Review' 
  | 'Approved' 
  | 'CRL' 
  | 'Withdrawn'
  | 'Refused to File';

export type Region = 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'UK' | 'Australia' | 'Brazil' | 'South Korea' | 'Switzerland';

export type SequenceType = 
  | 'original'
  | 'amendment'
  | 'supplement'
  | 'ir-response'
  | 'safety-report'
  | 'annual-report'
  | 'psur'
  | 'dsur'
  | 'rmp'
  | 'labeling'
  | 'cbe'
  | 'prior-approval';

export type SequenceStatus = 
  | 'draft'
  | 'in-qc'
  | 'qc-complete'
  | 'submitted'
  | 'acknowledged'
  | 'under-review'
  | 'approved'
  | 'rejected';

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

export interface Program {
  id: string;
  code: string;
  name: string;
  genericName?: string;
  therapeuticArea: TherapeuticArea;
  modality: Modality;
  indication: string;
  stage: DevelopmentStage;
  status: ProgramStatus;
  programLead?: string;
  medicalLead?: string;
  regulatoryLead?: string;
  startDate?: string;
  targetApprovalDate?: string;
  nextMilestone?: string;
  nextMilestoneDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  programId: string;
  applicationNumber: string;
  type: ApplicationType;
  region: Region;
  agency: string;
  status: ApplicationStatus;
  submissionDate?: string;
  approvalDate?: string;
  pdfuaDate?: string;
  reviewDivision?: string;
  projectManager?: string;
  primaryContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sequence {
  id: string;
  applicationId: string;
  sequenceNumber: string;
  type: SequenceType;
  description: string;
  status: SequenceStatus;
  submissionDate?: string;
  acknowledgedDate?: string;
  gatewayReceipt?: string;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  programId: string;
  applicationId?: string;
  name: string;
  category: 'clinical' | 'regulatory' | 'cmc' | 'commercial' | 'safety';
  targetDate: string;
  actualDate?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  dependencies?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// ============================================================================
// DEFAULT DATA
// ============================================================================

const defaultPrograms: Program[] = [
  {
    id: 'prog-001',
    code: 'LIG-2847',
    name: 'Nexavant',
    genericName: 'ligrastinib',
    therapeuticArea: 'Oncology',
    modality: 'Small Molecule',
    indication: 'KRAS G12C+ NSCLC',
    stage: 'NDA/BLA Filed',
    status: 'on-track',
    programLead: 'Sarah Chen',
    medicalLead: 'Dr. James Wilson',
    regulatoryLead: 'Jennifer Walsh',
    nextMilestone: 'FDA PDUFA Date',
    nextMilestoneDate: '2025-02-15',
    description: 'First-in-class KRAS G12C inhibitor for non-small cell lung cancer',
    createdAt: '2020-01-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'prog-002',
    code: 'LIG-1182',
    name: 'Oncorix',
    genericName: 'ligamab',
    therapeuticArea: 'Oncology',
    modality: 'Monoclonal Antibody',
    indication: 'HER2+ Breast Cancer',
    stage: 'NDA/BLA Filed',
    status: 'on-track',
    programLead: 'David Kim',
    medicalLead: 'Dr. Amanda Foster',
    regulatoryLead: 'Michael Rodriguez',
    nextMilestone: 'BLA PDUFA Date',
    nextMilestoneDate: '2025-04-15',
    description: 'Next-generation HER2-targeting antibody with enhanced ADCC activity for metastatic breast cancer',
    createdAt: '2019-06-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
  {
    id: 'prog-003',
    code: 'LIG-3021',
    name: 'Rheumaclar',
    genericName: 'ligatinib',
    therapeuticArea: 'Immunology',
    modality: 'Small Molecule',
    indication: 'Rheumatoid Arthritis',
    stage: 'Approved',
    status: 'on-track',
    programLead: 'Maria Garcia',
    createdAt: '2018-03-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z',
  },
];

const defaultApplications: Application[] = [
  // LIG-2847 (Nexavant) Applications
  {
    id: 'app-001',
    programId: 'prog-001',
    applicationNumber: 'IND 123456',
    type: 'IND',
    region: 'US',
    agency: 'FDA',
    status: 'Active',
    submissionDate: '2021-03-15',
    createdAt: '2021-03-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'app-002',
    programId: 'prog-001',
    applicationNumber: 'NDA 215847',
    type: 'NDA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    submissionDate: '2024-06-15',
    pdfuaDate: '2025-02-15',
    reviewDivision: 'Division of Oncology Products 1',
    projectManager: 'Jennifer Walsh',
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  // LIG-1182 (Oncorix) Applications
  {
    id: 'app-003',
    programId: 'prog-002',
    applicationNumber: 'IND 118245',
    type: 'IND',
    region: 'US',
    agency: 'FDA',
    status: 'Active',
    submissionDate: '2020-01-20',
    createdAt: '2020-01-20T00:00:00Z',
    updatedAt: '2024-10-15T00:00:00Z',
  },
  {
    id: 'app-004',
    programId: 'prog-002',
    applicationNumber: 'BLA 761298',
    type: 'BLA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    submissionDate: '2024-08-15',
    pdfuaDate: '2025-04-15',
    reviewDivision: 'Division of Oncology Products 2',
    projectManager: 'Michael Rodriguez',
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'app-005',
    programId: 'prog-002',
    applicationNumber: 'MAA EMEA/H/C/006142',
    type: 'MAA',
    region: 'EU',
    agency: 'EMA',
    status: 'Under Review',
    submissionDate: '2024-09-01',
    reviewDivision: 'CHMP',
    projectManager: 'Elena Vasquez',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
];

const defaultSequences: Sequence[] = [
  // LIG-2847 NDA Sequences (app-002)
  {
    id: 'seq-001',
    applicationId: 'app-002',
    sequenceNumber: '0000',
    type: 'original',
    description: 'Original NDA Submission',
    status: 'under-review',
    submissionDate: '2024-06-15',
    acknowledgedDate: '2024-06-20',
    gatewayReceipt: 'GW-2024-0615-001',
    documentCount: 847,
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-06-20T00:00:00Z',
  },
  {
    id: 'seq-002',
    applicationId: 'app-002',
    sequenceNumber: '0001',
    type: 'ir-response',
    description: 'FDA Information Request Response - CMC',
    status: 'submitted',
    submissionDate: '2024-09-15',
    acknowledgedDate: '2024-09-18',
    gatewayReceipt: 'GW-2024-0915-003',
    documentCount: 45,
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2024-09-18T00:00:00Z',
  },
  {
    id: 'seq-003',
    applicationId: 'app-002',
    sequenceNumber: '0002',
    type: 'ir-response',
    description: 'FDA Information Request Response - Clinical',
    status: 'draft',
    documentCount: 0,
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },
  // LIG-2847 IND Sequences (app-001)
  {
    id: 'seq-004',
    applicationId: 'app-001',
    sequenceNumber: '0000',
    type: 'original',
    description: 'Original IND Submission',
    status: 'acknowledged',
    submissionDate: '2021-03-15',
    acknowledgedDate: '2021-03-20',
    documentCount: 312,
    createdAt: '2021-03-15T00:00:00Z',
    updatedAt: '2021-03-20T00:00:00Z',
  },
  {
    id: 'seq-005',
    applicationId: 'app-001',
    sequenceNumber: '0001',
    type: 'amendment',
    description: 'Protocol Amendment - Phase 3 Expansion',
    status: 'acknowledged',
    submissionDate: '2022-06-01',
    acknowledgedDate: '2022-06-05',
    documentCount: 89,
    createdAt: '2022-06-01T00:00:00Z',
    updatedAt: '2022-06-05T00:00:00Z',
  },
  {
    id: 'seq-006',
    applicationId: 'app-001',
    sequenceNumber: '0002',
    type: 'safety-report',
    description: 'Annual IND Safety Report',
    status: 'acknowledged',
    submissionDate: '2024-03-15',
    acknowledgedDate: '2024-03-18',
    documentCount: 156,
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-03-18T00:00:00Z',
  },
  // LIG-1182 IND Sequences (app-003)
  {
    id: 'seq-007',
    applicationId: 'app-003',
    sequenceNumber: '0000',
    type: 'original',
    description: 'Original IND Submission',
    status: 'acknowledged',
    submissionDate: '2020-01-20',
    acknowledgedDate: '2020-01-25',
    documentCount: 285,
    createdAt: '2020-01-20T00:00:00Z',
    updatedAt: '2020-01-25T00:00:00Z',
  },
  {
    id: 'seq-008',
    applicationId: 'app-003',
    sequenceNumber: '0001',
    type: 'amendment',
    description: 'Protocol Amendment - Dose Escalation',
    status: 'acknowledged',
    submissionDate: '2020-08-15',
    acknowledgedDate: '2020-08-20',
    documentCount: 67,
    createdAt: '2020-08-15T00:00:00Z',
    updatedAt: '2020-08-20T00:00:00Z',
  },
  {
    id: 'seq-009',
    applicationId: 'app-003',
    sequenceNumber: '0002',
    type: 'amendment',
    description: 'Protocol Amendment - Phase 2 Expansion Cohorts',
    status: 'acknowledged',
    submissionDate: '2021-04-01',
    acknowledgedDate: '2021-04-05',
    documentCount: 124,
    createdAt: '2021-04-01T00:00:00Z',
    updatedAt: '2021-04-05T00:00:00Z',
  },
  {
    id: 'seq-010',
    applicationId: 'app-003',
    sequenceNumber: '0003',
    type: 'safety-report',
    description: 'Annual IND Safety Report 2024',
    status: 'acknowledged',
    submissionDate: '2024-01-20',
    acknowledgedDate: '2024-01-24',
    documentCount: 198,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-24T00:00:00Z',
  },
  // LIG-1182 BLA Sequences (app-004)
  {
    id: 'seq-011',
    applicationId: 'app-004',
    sequenceNumber: '0000',
    type: 'original',
    description: 'Original BLA Submission',
    status: 'under-review',
    submissionDate: '2024-08-15',
    acknowledgedDate: '2024-08-22',
    gatewayReceipt: 'GW-2024-0815-007',
    documentCount: 1247,
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2024-08-22T00:00:00Z',
  },
  {
    id: 'seq-012',
    applicationId: 'app-004',
    sequenceNumber: '0001',
    type: 'ir-response',
    description: 'FDA Day 74 Letter Response',
    status: 'acknowledged',
    submissionDate: '2024-11-01',
    acknowledgedDate: '2024-11-05',
    gatewayReceipt: 'GW-2024-1101-012',
    documentCount: 89,
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-05T00:00:00Z',
  },
  {
    id: 'seq-013',
    applicationId: 'app-004',
    sequenceNumber: '0002',
    type: 'ir-response',
    description: 'FDA Information Request - Manufacturing Site',
    status: 'draft',
    documentCount: 0,
    createdAt: '2024-12-10T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },
  // LIG-1182 MAA Sequences (app-005)
  {
    id: 'seq-014',
    applicationId: 'app-005',
    sequenceNumber: '0000',
    type: 'original',
    description: 'Original MAA Submission',
    status: 'under-review',
    submissionDate: '2024-09-01',
    acknowledgedDate: '2024-09-10',
    gatewayReceipt: 'CESP-2024-09-00142',
    documentCount: 1156,
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-09-10T00:00:00Z',
  },
  {
    id: 'seq-015',
    applicationId: 'app-005',
    sequenceNumber: '0001',
    type: 'ir-response',
    description: 'Day 120 List of Questions Response',
    status: 'in-qc',
    documentCount: 156,
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
];

const defaultMilestones: Milestone[] = [
  // LIG-2847 (Nexavant) Milestones
  {
    id: 'ms-001',
    programId: 'prog-001',
    applicationId: 'app-002',
    name: 'FDA PDUFA Date',
    category: 'regulatory',
    targetDate: '2025-02-15',
    status: 'in-progress',
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-002',
    programId: 'prog-001',
    applicationId: 'app-002',
    name: 'Advisory Committee Meeting',
    category: 'regulatory',
    targetDate: '2025-01-15',
    status: 'planned',
    notes: 'ODAC meeting scheduled',
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-003',
    programId: 'prog-001',
    name: 'Commercial Launch (US)',
    category: 'commercial',
    targetDate: '2025-04-01',
    status: 'planned',
    dependencies: ['ms-001'],
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  // LIG-1182 (Oncorix) Milestones
  {
    id: 'ms-004',
    programId: 'prog-002',
    applicationId: 'app-004',
    name: 'BLA PDUFA Date',
    category: 'regulatory',
    targetDate: '2025-04-15',
    status: 'in-progress',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-006',
    programId: 'prog-002',
    applicationId: 'app-004',
    name: 'FDA Pre-Approval Inspection',
    category: 'regulatory',
    targetDate: '2025-02-01',
    status: 'planned',
    notes: 'Manufacturing site inspection - Raleigh, NC',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-007',
    programId: 'prog-002',
    applicationId: 'app-005',
    name: 'EMA CHMP Opinion',
    category: 'regulatory',
    targetDate: '2025-05-15',
    status: 'planned',
    notes: 'Day 210 expected opinion',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-008',
    programId: 'prog-002',
    name: 'EU Marketing Authorization',
    category: 'regulatory',
    targetDate: '2025-07-15',
    status: 'planned',
    dependencies: ['ms-007'],
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-009',
    programId: 'prog-002',
    name: 'Commercial Launch (US)',
    category: 'commercial',
    targetDate: '2025-06-01',
    status: 'planned',
    dependencies: ['ms-004'],
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: 'ms-010',
    programId: 'prog-002',
    name: 'Commercial Launch (EU)',
    category: 'commercial',
    targetDate: '2025-09-01',
    status: 'planned',
    dependencies: ['ms-008'],
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  // LIG-3021 (Rheumaclar) Milestones
  {
    id: 'ms-005',
    programId: 'prog-003',
    name: 'Post-Marketing Study Start',
    category: 'clinical',
    targetDate: '2025-03-01',
    status: 'planned',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
];

// ============================================================================
// STORE
// ============================================================================

interface PortfolioState {
  programs: Program[];
  applications: Application[];
  sequences: Sequence[];
  milestones: Milestone[];
  selectedProgramId: string | null;
  selectedApplicationId: string | null;
  isLoading: boolean;
  lastSyncedAt: string | null;
  
  addProgram: (program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  getProgram: (id: string) => Program | undefined;
  getProgramByCode: (code: string) => Program | undefined;
  
  addApplication: (application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  getApplication: (id: string) => Application | undefined;
  getApplicationsForProgram: (programId: string) => Application[];
  
  addSequence: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSequence: (id: string, updates: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  getSequence: (id: string) => Sequence | undefined;
  getSequencesForApplication: (applicationId: string) => Sequence[];
  getNextSequenceNumber: (applicationId: string) => string;
  
  addMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;
  getMilestonesForProgram: (programId: string) => Milestone[];
  
  selectProgram: (id: string | null) => void;
  selectApplication: (id: string | null) => void;
  
  importData: (data: { programs?: Program[]; applications?: Application[]; sequences?: Sequence[]; milestones?: Milestone[] }) => void;
  exportData: () => { programs: Program[]; applications: Application[]; sequences: Sequence[]; milestones: Milestone[] };
  resetToDefaults: () => void;
  clearAll: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      programs: defaultPrograms,
      applications: defaultApplications,
      sequences: defaultSequences,
      milestones: defaultMilestones,
      selectedProgramId: null,
      selectedApplicationId: null,
      isLoading: false,
      lastSyncedAt: null,

      addProgram: (programData) => {
        const id = generateId('prog');
        const now = timestamp();
        set((state) => ({
          programs: [...state.programs, { ...programData, id, createdAt: now, updatedAt: now }],
          lastSyncedAt: now,
        }));
        return id;
      },

      updateProgram: (id, updates) => {
        const now = timestamp();
        set((state) => ({
          programs: state.programs.map((p) => p.id === id ? { ...p, ...updates, updatedAt: now } : p),
          lastSyncedAt: now,
        }));
      },

      deleteProgram: (id) => {
        set((state) => ({
          programs: state.programs.filter((p) => p.id !== id),
          applications: state.applications.filter((a) => a.programId !== id),
          milestones: state.milestones.filter((m) => m.programId !== id),
          selectedProgramId: state.selectedProgramId === id ? null : state.selectedProgramId,
          lastSyncedAt: timestamp(),
        }));
      },

      getProgram: (id) => get().programs.find((p) => p.id === id),
      getProgramByCode: (code) => get().programs.find((p) => p.code === code),

      addApplication: (appData) => {
        const id = generateId('app');
        const now = timestamp();
        set((state) => ({
          applications: [...state.applications, { ...appData, id, createdAt: now, updatedAt: now }],
          lastSyncedAt: now,
        }));
        return id;
      },

      updateApplication: (id, updates) => {
        set((state) => ({
          applications: state.applications.map((a) => a.id === id ? { ...a, ...updates, updatedAt: timestamp() } : a),
          lastSyncedAt: timestamp(),
        }));
      },

      deleteApplication: (id) => {
        set((state) => ({
          applications: state.applications.filter((a) => a.id !== id),
          sequences: state.sequences.filter((s) => s.applicationId !== id),
          milestones: state.milestones.filter((m) => m.applicationId !== id),
          selectedApplicationId: state.selectedApplicationId === id ? null : state.selectedApplicationId,
          lastSyncedAt: timestamp(),
        }));
      },

      getApplication: (id) => get().applications.find((a) => a.id === id),
      getApplicationsForProgram: (programId) => get().applications.filter((a) => a.programId === programId),

      addSequence: (seqData) => {
        const id = generateId('seq');
        const now = timestamp();
        set((state) => ({
          sequences: [...state.sequences, { ...seqData, id, createdAt: now, updatedAt: now }],
          lastSyncedAt: now,
        }));
        return id;
      },

      updateSequence: (id, updates) => {
        set((state) => ({
          sequences: state.sequences.map((s) => s.id === id ? { ...s, ...updates, updatedAt: timestamp() } : s),
          lastSyncedAt: timestamp(),
        }));
      },

      deleteSequence: (id) => {
        set((state) => ({
          sequences: state.sequences.filter((s) => s.id !== id),
          lastSyncedAt: timestamp(),
        }));
      },

      getSequence: (id) => get().sequences.find((s) => s.id === id),
      
      getSequencesForApplication: (applicationId) =>
        get().sequences.filter((s) => s.applicationId === applicationId)
          .sort((a, b) => a.sequenceNumber.localeCompare(b.sequenceNumber)),

      getNextSequenceNumber: (applicationId) => {
        const sequences = get().getSequencesForApplication(applicationId);
        if (sequences.length === 0) return '0000';
        const maxSeq = Math.max(...sequences.map((s) => parseInt(s.sequenceNumber, 10)));
        return String(maxSeq + 1).padStart(4, '0');
      },

      addMilestone: (msData) => {
        const id = generateId('ms');
        const now = timestamp();
        set((state) => ({
          milestones: [...state.milestones, { ...msData, id, createdAt: now, updatedAt: now }],
          lastSyncedAt: now,
        }));
        return id;
      },

      updateMilestone: (id, updates) => {
        set((state) => ({
          milestones: state.milestones.map((m) => m.id === id ? { ...m, ...updates, updatedAt: timestamp() } : m),
          lastSyncedAt: timestamp(),
        }));
      },

      deleteMilestone: (id) => {
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
          lastSyncedAt: timestamp(),
        }));
      },

      getMilestonesForProgram: (programId) => get().milestones.filter((m) => m.programId === programId),

      selectProgram: (id) => set({ selectedProgramId: id }),
      selectApplication: (id) => set({ selectedApplicationId: id }),

      importData: (data) => {
        set((state) => ({
          programs: data.programs ?? state.programs,
          applications: data.applications ?? state.applications,
          sequences: data.sequences ?? state.sequences,
          milestones: data.milestones ?? state.milestones,
          lastSyncedAt: timestamp(),
        }));
      },

      exportData: () => {
        const state = get();
        return {
          programs: state.programs,
          applications: state.applications,
          sequences: state.sequences,
          milestones: state.milestones,
        };
      },

      resetToDefaults: () => {
        set({
          programs: defaultPrograms,
          applications: defaultApplications,
          sequences: defaultSequences,
          milestones: defaultMilestones,
          selectedProgramId: null,
          selectedApplicationId: null,
          lastSyncedAt: timestamp(),
        });
      },

      clearAll: () => {
        set({
          programs: [],
          applications: [],
          sequences: [],
          milestones: [],
          selectedProgramId: null,
          selectedApplicationId: null,
          lastSyncedAt: timestamp(),
        });
      },
    }),
    {
      name: 'ligature-portfolio',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// Selectors
export const usePrograms = () => usePortfolioStore((state) => state.programs);
export const useApplications = () => usePortfolioStore((state) => state.applications);
export const useSequences = () => usePortfolioStore((state) => state.sequences);
export const useMilestones = () => usePortfolioStore((state) => state.milestones);

export const useSelectedProgram = () => {
  const programs = usePortfolioStore((state) => state.programs);
  const selectedId = usePortfolioStore((state) => state.selectedProgramId);
  return useMemo(() => programs.find((p) => p.id === selectedId) ?? null, [programs, selectedId]);
};

export const useSelectedApplication = () => {
  const applications = usePortfolioStore((state) => state.applications);
  const selectedId = usePortfolioStore((state) => state.selectedApplicationId);
  return useMemo(() => applications.find((a) => a.id === selectedId) ?? null, [applications, selectedId]);
};

export const useProgramsWithStats = () => {
  const programs = usePortfolioStore((state) => state.programs);
  const applications = usePortfolioStore((state) => state.applications);
  const milestones = usePortfolioStore((state) => state.milestones);

  return useMemo(() => programs.map((program) => {
    const programApps = applications.filter((a) => a.programId === program.id);
    const programMilestones = milestones.filter((m) => m.programId === program.id);
    const upcomingMilestones = programMilestones
      .filter((m) => m.status === 'planned' || m.status === 'in-progress')
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

    return {
      ...program,
      applicationCount: programApps.length,
      activeApplications: programApps.filter((a) => a.status === 'Active' || a.status === 'Under Review').length,
      nextMilestone: upcomingMilestones[0],
      regions: Array.from(new Set(programApps.map((a) => a.region))),
    };
  }), [programs, applications, milestones]);
};
