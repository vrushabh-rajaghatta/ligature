/**
 * Manufacturing Module Data - v0.8.0
 * 
 * Batch Management, Process Validation, Equipment & Facilities
 * 
 * "R&D Connected extends to the plant floor. When CMC specs finalize,
 * Manufacturing already has the process parameters. When a deviation occurs,
 * Quality and Regulatory are notified instantly. One platform from
 * development through production."
 */

// ============================================================================
// TYPES
// ============================================================================

export type ManufacturingSite = 'boston' | 'ireland' | 'singapore' | 'puerto-rico';

export type BatchStatus = 
  | 'scheduled'
  | 'in-progress'
  | 'pending-review'
  | 'pending-release'
  | 'released'
  | 'quarantine'
  | 'rejected'
  | 'cancelled';

export type BatchPhase = 
  | 'dispensing'
  | 'compounding'
  | 'filling'
  | 'lyophilization'
  | 'inspection'
  | 'labeling'
  | 'packaging'
  | 'qa-release';

export type DeviationType = 
  | 'process'
  | 'equipment'
  | 'material'
  | 'environmental'
  | 'documentation'
  | 'yield'
  | 'quality';

export type DeviationImpact = 'critical' | 'major' | 'minor';

export type ValidationStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'expired'
  | 'revalidation-required';

export type EquipmentStatus = 
  | 'qualified'
  | 'maintenance-due'
  | 'under-maintenance'
  | 'out-of-service'
  | 'pending-qualification';

// ============================================================================
// INTERFACES
// ============================================================================

export interface BatchRecord {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  site: ManufacturingSite;
  status: BatchStatus;
  currentPhase: BatchPhase;
  scheduledStart: string;
  actualStart?: string;
  scheduledEnd: string;
  actualEnd?: string;
  targetQuantity: number;
  actualQuantity?: number;
  uom: string;
  yield?: number;
  operator: string;
  reviewer?: string;
  approver?: string;
  deviationIds: string[];
  linkedCMCSpecId?: string; // R&D Connected: Links to CMC specs
  linkedBPRVersion: string; // Batch Production Record version
  phases: BatchPhaseRecord[];
  materials: BatchMaterial[];
  inProcessTests: InProcessTest[];
  notes?: string;
}

export interface BatchPhaseRecord {
  phase: BatchPhase;
  status: 'pending' | 'in-progress' | 'completed' | 'deviated';
  startTime?: string;
  endTime?: string;
  operator?: string;
  equipment?: string;
  parameters: ProcessParameter[];
  signoffs: PhaseSignoff[];
}

export interface ProcessParameter {
  name: string;
  targetValue: string;
  actualValue?: string;
  unit: string;
  lowerLimit: string;
  upperLimit: string;
  inSpec: boolean;
  isCPP: boolean; // Critical Process Parameter
  linkedCMCParam?: string; // R&D Connected: Links to CMC specification
}

export interface PhaseSignoff {
  role: 'operator' | 'supervisor' | 'qa';
  signedBy?: string;
  signedAt?: string;
  status: 'pending' | 'signed' | 'rejected';
  comments?: string;
}

export interface BatchMaterial {
  materialId: string;
  materialName: string;
  lotNumber: string;
  quantity: number;
  uom: string;
  dispensedBy?: string;
  dispensedAt?: string;
  coaVerified: boolean;
  expiryDate: string;
  supplier: string;
}

export interface InProcessTest {
  testId: string;
  testName: string;
  phase: BatchPhase;
  specification: string;
  result?: string;
  unit: string;
  passFailStatus?: 'pass' | 'fail' | 'pending';
  testedBy?: string;
  testedAt?: string;
  isCQA: boolean; // Critical Quality Attribute
  linkedCSRData?: string; // R&D Connected: Links to clinical data
}

export interface ManufacturingDeviation {
  id: string;
  deviationNumber: string;
  title: string;
  description: string;
  type: DeviationType;
  impact: DeviationImpact;
  batchId: string;
  batchNumber: string;
  productId: string;
  site: ManufacturingSite;
  phase: BatchPhase;
  discoveredDate: string;
  discoveredBy: string;
  status: 'open' | 'investigation' | 'root-cause' | 'capa' | 'closed';
  assignedTo: string;
  rootCause?: string;
  correctiveAction?: string;
  linkedCAPAId?: string;
  linkedQMSDeviationId?: string; // R&D Connected: Links to QMS
  regulatoryImpact: boolean;
  regulatoryNotificationRequired?: boolean;
  targetCloseDate: string;
  actualCloseDate?: string;
}

export interface ProcessValidation {
  id: string;
  productId: string;
  productName: string;
  site: ManufacturingSite;
  validationType: 'initial' | 'concurrent' | 'revalidation';
  status: ValidationStatus;
  stage: 'stage-1-design' | 'stage-2-qualification' | 'stage-3-verification';
  protocolId: string;
  protocolVersion: string;
  ppqBatches: string[]; // Process Performance Qualification batches
  requiredBatchCount: number;
  completedBatchCount: number;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  validationLead: string;
  approvalStatus: 'draft' | 'pending-approval' | 'approved' | 'rejected';
  linkedCMCId: string; // R&D Connected: Links to CMC process dev
  cpps: CPPDefinition[];
  cqas: CQADefinition[];
  validationReportId?: string;
}

export interface CPPDefinition {
  id: string;
  name: string;
  phase: BatchPhase;
  targetValue: string;
  unit: string;
  acceptanceRange: string;
  justification: string;
  linkedDOEStudy?: string; // R&D Connected: Links to development studies
}

export interface CQADefinition {
  id: string;
  name: string;
  specification: string;
  testMethod: string;
  acceptanceCriteria: string;
  linkedSpecId?: string; // R&D Connected: Links to product spec
}

export interface Equipment {
  id: string;
  equipmentId: string;
  name: string;
  type: 'vessel' | 'mixer' | 'filter' | 'filler' | 'lyophilizer' | 'autoclave' | 'isolator' | 'packaging';
  site: ManufacturingSite;
  area: string;
  status: EquipmentStatus;
  qualificationDate?: string;
  requalificationDue?: string;
  maintenanceSchedule: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  cleaningValidationStatus: ValidationStatus;
  capacity?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}

export interface ProductionSchedule {
  id: string;
  productId: string;
  productName: string;
  site: ManufacturingSite;
  plannedBatches: number;
  completedBatches: number;
  inProgressBatches: number;
  targetYield: number;
  actualYield?: number;
  startDate: string;
  endDate: string;
  launchReadinessLinked?: boolean; // R&D Connected: Links to Commercial launch
}

// ============================================================================
// LABEL MAPS
// ============================================================================

export const SITE_LABELS: Record<ManufacturingSite, string> = {
  boston: 'Boston, MA',
  ireland: 'Cork, Ireland',
  singapore: 'Singapore',
  'puerto-rico': 'Caguas, PR',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  'pending-review': 'Pending Review',
  'pending-release': 'Pending Release',
  released: 'Released',
  quarantine: 'Quarantine',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const BATCH_PHASE_LABELS: Record<BatchPhase, string> = {
  dispensing: 'Dispensing',
  compounding: 'Compounding',
  filling: 'Filling',
  lyophilization: 'Lyophilization',
  inspection: 'Visual Inspection',
  labeling: 'Labeling',
  packaging: 'Packaging',
  'qa-release': 'QA Release',
};

export const DEVIATION_TYPE_LABELS: Record<DeviationType, string> = {
  process: 'Process Deviation',
  equipment: 'Equipment Deviation',
  material: 'Material Deviation',
  environmental: 'Environmental Deviation',
  documentation: 'Documentation Deviation',
  yield: 'Yield Deviation',
  quality: 'Quality Deviation',
};

export const DEVIATION_IMPACT_LABELS: Record<DeviationImpact, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
};

export const EQUIPMENT_TYPE_LABELS: Record<Equipment['type'], string> = {
  vessel: 'Process Vessel',
  mixer: 'Mixer/Homogenizer',
  filter: 'Filtration System',
  filler: 'Filling Machine',
  lyophilizer: 'Lyophilizer',
  autoclave: 'Autoclave',
  isolator: 'Isolator',
  packaging: 'Packaging Line',
};

// ============================================================================
// GOLDEN PATH DATA: NEXAVANT (LIG-2847) MANUFACTURING
// ============================================================================

export const manufacturingSites: ManufacturingSite[] = ['boston', 'ireland', 'singapore', 'puerto-rico'];

export const batches: BatchRecord[] = [
  {
    id: 'batch-001',
    batchNumber: 'NXV-2026-001',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    status: 'released',
    currentPhase: 'qa-release',
    scheduledStart: '2025-12-15',
    actualStart: '2025-12-15',
    scheduledEnd: '2025-12-22',
    actualEnd: '2025-12-21',
    targetQuantity: 50000,
    actualQuantity: 49850,
    uom: 'vials',
    yield: 99.7,
    operator: 'M. O\'Brien',
    reviewer: 'K. Walsh',
    approver: 'Dr. P. Murphy',
    deviationIds: [],
    linkedCMCSpecId: 'CMC-NXV-001',
    linkedBPRVersion: 'BPR-NXV-3.2',
    phases: [
      {
        phase: 'dispensing',
        status: 'completed',
        startTime: '2025-12-15T06:00:00Z',
        endTime: '2025-12-15T10:00:00Z',
        operator: 'M. O\'Brien',
        equipment: 'EQ-DISP-001',
        parameters: [
          { name: 'Room Temperature', targetValue: '20', actualValue: '19.8', unit: '°C', lowerLimit: '18', upperLimit: '22', inSpec: true, isCPP: false },
          { name: 'Room Humidity', targetValue: '45', actualValue: '44', unit: '%RH', lowerLimit: '30', upperLimit: '60', inSpec: true, isCPP: false },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'M. O\'Brien', signedAt: '2025-12-15T10:05:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-15T10:30:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'compounding',
        status: 'completed',
        startTime: '2025-12-15T11:00:00Z',
        endTime: '2025-12-16T08:00:00Z',
        operator: 'S. Kelly',
        equipment: 'EQ-MIX-003',
        parameters: [
          { name: 'Mixing Speed', targetValue: '250', actualValue: '248', unit: 'RPM', lowerLimit: '240', upperLimit: '260', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-MIX-001' },
          { name: 'Mixing Time', targetValue: '120', actualValue: '122', unit: 'min', lowerLimit: '115', upperLimit: '130', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-MIX-002' },
          { name: 'Temperature', targetValue: '25', actualValue: '24.8', unit: '°C', lowerLimit: '23', upperLimit: '27', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-TEMP-001' },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'S. Kelly', signedAt: '2025-12-16T08:15:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-16T09:00:00Z', status: 'signed' },
          { role: 'qa', signedBy: 'Dr. P. Murphy', signedAt: '2025-12-16T10:00:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'filling',
        status: 'completed',
        startTime: '2025-12-17T06:00:00Z',
        endTime: '2025-12-18T18:00:00Z',
        operator: 'J. Brennan',
        equipment: 'EQ-FILL-002',
        parameters: [
          { name: 'Fill Volume', targetValue: '2.0', actualValue: '2.01', unit: 'mL', lowerLimit: '1.95', upperLimit: '2.05', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-FILL-001' },
          { name: 'Fill Speed', targetValue: '200', actualValue: '198', unit: 'vials/min', lowerLimit: '180', upperLimit: '220', inSpec: true, isCPP: false },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'J. Brennan', signedAt: '2025-12-18T18:30:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-18T19:00:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'lyophilization',
        status: 'completed',
        startTime: '2025-12-19T00:00:00Z',
        endTime: '2025-12-20T12:00:00Z',
        operator: 'M. O\'Brien',
        equipment: 'EQ-LYO-001',
        parameters: [
          { name: 'Shelf Temperature', targetValue: '-40', actualValue: '-40.2', unit: '°C', lowerLimit: '-42', upperLimit: '-38', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-LYO-001' },
          { name: 'Chamber Pressure', targetValue: '100', actualValue: '98', unit: 'mTorr', lowerLimit: '80', upperLimit: '120', inSpec: true, isCPP: true, linkedCMCParam: 'CMC-PARAM-LYO-002' },
          { name: 'Primary Drying Time', targetValue: '24', actualValue: '24', unit: 'hours', lowerLimit: '22', upperLimit: '28', inSpec: true, isCPP: true },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'M. O\'Brien', signedAt: '2025-12-20T12:30:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-20T13:00:00Z', status: 'signed' },
          { role: 'qa', signedBy: 'Dr. P. Murphy', signedAt: '2025-12-20T14:00:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'inspection',
        status: 'completed',
        startTime: '2025-12-20T14:00:00Z',
        endTime: '2025-12-20T20:00:00Z',
        operator: 'A. Doyle',
        equipment: 'EQ-INSP-001',
        parameters: [
          { name: 'Reject Rate', targetValue: '0.5', actualValue: '0.3', unit: '%', lowerLimit: '0', upperLimit: '1.0', inSpec: true, isCPP: false },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'A. Doyle', signedAt: '2025-12-20T20:15:00Z', status: 'signed' },
          { role: 'qa', signedBy: 'Dr. P. Murphy', signedAt: '2025-12-20T21:00:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'labeling',
        status: 'completed',
        startTime: '2025-12-21T06:00:00Z',
        endTime: '2025-12-21T12:00:00Z',
        operator: 'C. Flynn',
        equipment: 'EQ-LABEL-001',
        parameters: [],
        signoffs: [
          { role: 'operator', signedBy: 'C. Flynn', signedAt: '2025-12-21T12:15:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'packaging',
        status: 'completed',
        startTime: '2025-12-21T13:00:00Z',
        endTime: '2025-12-21T18:00:00Z',
        operator: 'C. Flynn',
        equipment: 'EQ-PACK-002',
        parameters: [],
        signoffs: [
          { role: 'operator', signedBy: 'C. Flynn', signedAt: '2025-12-21T18:15:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-21T18:45:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'qa-release',
        status: 'completed',
        startTime: '2025-12-21T19:00:00Z',
        endTime: '2025-12-21T22:00:00Z',
        operator: 'Dr. P. Murphy',
        parameters: [],
        signoffs: [
          { role: 'qa', signedBy: 'Dr. P. Murphy', signedAt: '2025-12-21T22:00:00Z', status: 'signed' },
        ],
      },
    ],
    materials: [
      { materialId: 'MAT-001', materialName: 'Nexavant API', lotNumber: 'API-2025-048', quantity: 5.2, uom: 'kg', dispensedBy: 'M. O\'Brien', dispensedAt: '2025-12-15T07:30:00Z', coaVerified: true, expiryDate: '2027-06-15', supplier: 'PharmaChem Ltd' },
      { materialId: 'MAT-002', materialName: 'Sucrose', lotNumber: 'SUC-2025-112', quantity: 2.5, uom: 'kg', dispensedBy: 'M. O\'Brien', dispensedAt: '2025-12-15T08:00:00Z', coaVerified: true, expiryDate: '2026-12-31', supplier: 'ExcipientCo' },
      { materialId: 'MAT-003', materialName: 'Histidine Buffer', lotNumber: 'HIS-2025-089', quantity: 1.0, uom: 'kg', dispensedBy: 'M. O\'Brien', dispensedAt: '2025-12-15T08:30:00Z', coaVerified: true, expiryDate: '2026-09-30', supplier: 'BufferTech' },
      { materialId: 'MAT-004', materialName: 'WFI', lotNumber: 'WFI-2025-445', quantity: 100, uom: 'L', dispensedBy: 'M. O\'Brien', dispensedAt: '2025-12-15T09:00:00Z', coaVerified: true, expiryDate: '2026-01-15', supplier: 'Internal' },
    ],
    inProcessTests: [
      { testId: 'IPT-001', testName: 'pH', phase: 'compounding', specification: '6.0 ± 0.2', result: '6.02', unit: '', passFailStatus: 'pass', testedBy: 'QC Lab', testedAt: '2025-12-16T07:00:00Z', isCQA: true, linkedCSRData: 'CSR-STABILITY-001' },
      { testId: 'IPT-002', testName: 'Osmolality', phase: 'compounding', specification: '280-320', result: '298', unit: 'mOsm/kg', passFailStatus: 'pass', testedBy: 'QC Lab', testedAt: '2025-12-16T07:30:00Z', isCQA: true },
      { testId: 'IPT-003', testName: 'Bioburden', phase: 'filling', specification: '< 10', result: '2', unit: 'CFU/mL', passFailStatus: 'pass', testedBy: 'Micro Lab', testedAt: '2025-12-17T10:00:00Z', isCQA: false },
      { testId: 'IPT-004', testName: 'Residual Moisture', phase: 'lyophilization', specification: '< 2.0%', result: '1.2', unit: '%', passFailStatus: 'pass', testedBy: 'QC Lab', testedAt: '2025-12-20T13:00:00Z', isCQA: true, linkedCSRData: 'CSR-STABILITY-002' },
      { testId: 'IPT-005', testName: 'Particulates', phase: 'inspection', specification: '≤ 6000 (≥10µm), ≤ 600 (≥25µm)', result: '2100, 180', unit: 'particles/container', passFailStatus: 'pass', testedBy: 'QC Lab', testedAt: '2025-12-20T19:00:00Z', isCQA: true },
    ],
    notes: 'First commercial batch post-approval. All parameters within specification. Released for distribution.',
  },
  {
    id: 'batch-002',
    batchNumber: 'NXV-2026-002',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    status: 'in-progress',
    currentPhase: 'filling',
    scheduledStart: '2025-12-28',
    actualStart: '2025-12-28',
    scheduledEnd: '2026-01-04',
    targetQuantity: 50000,
    uom: 'vials',
    operator: 'S. Kelly',
    deviationIds: [],
    linkedCMCSpecId: 'CMC-NXV-001',
    linkedBPRVersion: 'BPR-NXV-3.2',
    phases: [
      {
        phase: 'dispensing',
        status: 'completed',
        startTime: '2025-12-28T06:00:00Z',
        endTime: '2025-12-28T10:00:00Z',
        operator: 'M. O\'Brien',
        equipment: 'EQ-DISP-001',
        parameters: [
          { name: 'Room Temperature', targetValue: '20', actualValue: '20.1', unit: '°C', lowerLimit: '18', upperLimit: '22', inSpec: true, isCPP: false },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'M. O\'Brien', signedAt: '2025-12-28T10:05:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-28T10:30:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'compounding',
        status: 'completed',
        startTime: '2025-12-28T11:00:00Z',
        endTime: '2025-12-29T08:00:00Z',
        operator: 'S. Kelly',
        equipment: 'EQ-MIX-003',
        parameters: [
          { name: 'Mixing Speed', targetValue: '250', actualValue: '251', unit: 'RPM', lowerLimit: '240', upperLimit: '260', inSpec: true, isCPP: true },
          { name: 'Mixing Time', targetValue: '120', actualValue: '120', unit: 'min', lowerLimit: '115', upperLimit: '130', inSpec: true, isCPP: true },
        ],
        signoffs: [
          { role: 'operator', signedBy: 'S. Kelly', signedAt: '2025-12-29T08:15:00Z', status: 'signed' },
          { role: 'supervisor', signedBy: 'K. Walsh', signedAt: '2025-12-29T09:00:00Z', status: 'signed' },
        ],
      },
      {
        phase: 'filling',
        status: 'in-progress',
        startTime: '2025-12-30T06:00:00Z',
        operator: 'J. Brennan',
        equipment: 'EQ-FILL-002',
        parameters: [
          { name: 'Fill Volume', targetValue: '2.0', actualValue: '2.00', unit: 'mL', lowerLimit: '1.95', upperLimit: '2.05', inSpec: true, isCPP: true },
        ],
        signoffs: [
          { role: 'operator', status: 'pending' },
        ],
      },
      { phase: 'lyophilization', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'inspection', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'labeling', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'packaging', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'qa-release', status: 'pending', parameters: [], signoffs: [] },
    ],
    materials: [
      { materialId: 'MAT-001', materialName: 'Nexavant API', lotNumber: 'API-2025-049', quantity: 5.2, uom: 'kg', dispensedBy: 'M. O\'Brien', dispensedAt: '2025-12-28T07:30:00Z', coaVerified: true, expiryDate: '2027-06-30', supplier: 'PharmaChem Ltd' },
    ],
    inProcessTests: [
      { testId: 'IPT-011', testName: 'pH', phase: 'compounding', specification: '6.0 ± 0.2', result: '5.98', unit: '', passFailStatus: 'pass', testedBy: 'QC Lab', testedAt: '2025-12-29T07:00:00Z', isCQA: true },
    ],
  },
  {
    id: 'batch-003',
    batchNumber: 'NXV-2026-003',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    status: 'pending-review',
    currentPhase: 'qa-release',
    scheduledStart: '2025-12-08',
    actualStart: '2025-12-08',
    scheduledEnd: '2025-12-15',
    actualEnd: '2025-12-14',
    targetQuantity: 50000,
    actualQuantity: 48920,
    uom: 'vials',
    yield: 97.8,
    operator: 'J. Brennan',
    reviewer: 'K. Walsh',
    deviationIds: ['dev-001'],
    linkedCMCSpecId: 'CMC-NXV-001',
    linkedBPRVersion: 'BPR-NXV-3.2',
    phases: [
      { phase: 'dispensing', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'M. O\'Brien', signedAt: '2025-12-08T10:00:00Z', status: 'signed' }] },
      { phase: 'compounding', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'S. Kelly', signedAt: '2025-12-09T08:00:00Z', status: 'signed' }] },
      { phase: 'filling', status: 'deviated', parameters: [], signoffs: [{ role: 'operator', signedBy: 'J. Brennan', signedAt: '2025-12-10T18:00:00Z', status: 'signed' }] },
      { phase: 'lyophilization', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'M. O\'Brien', signedAt: '2025-12-12T12:00:00Z', status: 'signed' }] },
      { phase: 'inspection', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'A. Doyle', signedAt: '2025-12-12T20:00:00Z', status: 'signed' }] },
      { phase: 'labeling', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'C. Flynn', signedAt: '2025-12-13T12:00:00Z', status: 'signed' }] },
      { phase: 'packaging', status: 'completed', parameters: [], signoffs: [{ role: 'operator', signedBy: 'C. Flynn', signedAt: '2025-12-13T18:00:00Z', status: 'signed' }] },
      { phase: 'qa-release', status: 'pending', parameters: [], signoffs: [{ role: 'qa', status: 'pending' }] },
    ],
    materials: [],
    inProcessTests: [],
    notes: 'Minor yield deviation during filling phase. Under QA review.',
  },
  {
    id: 'batch-004',
    batchNumber: 'NXV-2026-004',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    status: 'scheduled',
    currentPhase: 'dispensing',
    scheduledStart: '2026-01-06',
    scheduledEnd: '2026-01-13',
    targetQuantity: 50000,
    uom: 'vials',
    operator: 'M. O\'Brien',
    deviationIds: [],
    linkedCMCSpecId: 'CMC-NXV-001',
    linkedBPRVersion: 'BPR-NXV-3.2',
    phases: [
      { phase: 'dispensing', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'compounding', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'filling', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'lyophilization', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'inspection', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'labeling', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'packaging', status: 'pending', parameters: [], signoffs: [] },
      { phase: 'qa-release', status: 'pending', parameters: [], signoffs: [] },
    ],
    materials: [],
    inProcessTests: [],
  },
  {
    id: 'batch-005',
    batchNumber: 'NXV-2026-005',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    status: 'scheduled',
    currentPhase: 'dispensing',
    scheduledStart: '2026-01-13',
    scheduledEnd: '2026-01-20',
    targetQuantity: 50000,
    uom: 'vials',
    operator: 'S. Kelly',
    deviationIds: [],
    linkedCMCSpecId: 'CMC-NXV-001',
    linkedBPRVersion: 'BPR-NXV-3.2',
    phases: [],
    materials: [],
    inProcessTests: [],
  },
];

export const deviations: ManufacturingDeviation[] = [
  {
    id: 'dev-001',
    deviationNumber: 'MFG-DEV-2025-047',
    title: 'Fill Volume Excursion During Batch NXV-2026-003',
    description: 'Fill volume briefly exceeded upper limit (2.08 mL vs 2.05 mL limit) during filling operation. Approximately 1,200 units affected before adjustment.',
    type: 'process',
    impact: 'minor',
    batchId: 'batch-003',
    batchNumber: 'NXV-2026-003',
    productId: 'LIG-2847',
    site: 'ireland',
    phase: 'filling',
    discoveredDate: '2025-12-10',
    discoveredBy: 'J. Brennan',
    status: 'capa',
    assignedTo: 'K. Walsh',
    rootCause: 'Filling needle calibration drift. Preventive maintenance schedule was borderline.',
    correctiveAction: 'Affected units segregated and destroyed. Filling line recalibrated. PM frequency increased.',
    linkedCAPAId: 'CAPA-2025-089',
    linkedQMSDeviationId: 'QMS-DEV-2025-312',
    regulatoryImpact: false,
    targetCloseDate: '2026-01-10',
  },
  {
    id: 'dev-002',
    deviationNumber: 'MFG-DEV-2025-046',
    title: 'Environmental Excursion - Compounding Suite',
    description: 'Temperature excursion in compounding suite B. Room temperature reached 28°C for approximately 15 minutes due to HVAC malfunction.',
    type: 'environmental',
    impact: 'major',
    batchId: 'batch-003',
    batchNumber: 'NXV-2026-003',
    productId: 'LIG-2847',
    site: 'ireland',
    phase: 'compounding',
    discoveredDate: '2025-12-09',
    discoveredBy: 'BMS Alarm',
    status: 'closed',
    assignedTo: 'Facilities Team',
    rootCause: 'HVAC damper actuator failure',
    correctiveAction: 'Damper replaced. No product in suite at time of excursion. Batch 003 compounding completed before event.',
    linkedCAPAId: 'CAPA-2025-088',
    linkedQMSDeviationId: 'QMS-DEV-2025-310',
    regulatoryImpact: false,
    targetCloseDate: '2025-12-20',
    actualCloseDate: '2025-12-18',
  },
];

export const processValidations: ProcessValidation[] = [
  {
    id: 'pv-001',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    validationType: 'initial',
    status: 'completed',
    stage: 'stage-3-verification',
    protocolId: 'PV-NXV-001',
    protocolVersion: '2.0',
    ppqBatches: ['PPQ-001', 'PPQ-002', 'PPQ-003'],
    requiredBatchCount: 3,
    completedBatchCount: 3,
    startDate: '2025-06-01',
    targetEndDate: '2025-11-30',
    actualEndDate: '2025-11-15',
    validationLead: 'Dr. S. O\'Connor',
    approvalStatus: 'approved',
    linkedCMCId: 'CMC-NXV-001',
    cpps: [
      { id: 'cpp-001', name: 'Mixing Speed', phase: 'compounding', targetValue: '250', unit: 'RPM', acceptanceRange: '240-260', justification: 'Based on DOE study DOE-NXV-003', linkedDOEStudy: 'DOE-NXV-003' },
      { id: 'cpp-002', name: 'Mixing Time', phase: 'compounding', targetValue: '120', unit: 'min', acceptanceRange: '115-130', justification: 'Per development studies', linkedDOEStudy: 'DOE-NXV-003' },
      { id: 'cpp-003', name: 'Fill Volume', phase: 'filling', targetValue: '2.0', unit: 'mL', acceptanceRange: '1.95-2.05', justification: 'Per product specification' },
      { id: 'cpp-004', name: 'Lyophilization Shelf Temp', phase: 'lyophilization', targetValue: '-40', unit: '°C', acceptanceRange: '-42 to -38', justification: 'Based on cycle development', linkedDOEStudy: 'DOE-NXV-005' },
      { id: 'cpp-005', name: 'Chamber Pressure', phase: 'lyophilization', targetValue: '100', unit: 'mTorr', acceptanceRange: '80-120', justification: 'Based on cycle development', linkedDOEStudy: 'DOE-NXV-005' },
    ],
    cqas: [
      { id: 'cqa-001', name: 'Potency', specification: '95-105%', testMethod: 'HPLC', acceptanceCriteria: 'All results within specification', linkedSpecId: 'SPEC-NXV-001' },
      { id: 'cqa-002', name: 'Residual Moisture', specification: '< 2.0%', testMethod: 'Karl Fischer', acceptanceCriteria: 'All results < 2.0%', linkedSpecId: 'SPEC-NXV-001' },
      { id: 'cqa-003', name: 'Particulate Matter', specification: 'Per USP <788>', testMethod: 'Light Obscuration', acceptanceCriteria: 'All results within specification' },
      { id: 'cqa-004', name: 'Sterility', specification: 'No growth', testMethod: 'USP <71>', acceptanceCriteria: 'Pass' },
    ],
    validationReportId: 'VR-NXV-001',
  },
  {
    id: 'pv-002',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'boston',
    validationType: 'initial',
    status: 'in-progress',
    stage: 'stage-2-qualification',
    protocolId: 'PV-NXV-002',
    protocolVersion: '1.0',
    ppqBatches: ['PPQ-BOS-001'],
    requiredBatchCount: 3,
    completedBatchCount: 1,
    startDate: '2025-10-01',
    targetEndDate: '2026-03-31',
    validationLead: 'Dr. M. Chen',
    approvalStatus: 'approved',
    linkedCMCId: 'CMC-NXV-001',
    cpps: [
      { id: 'cpp-006', name: 'Mixing Speed', phase: 'compounding', targetValue: '250', unit: 'RPM', acceptanceRange: '240-260', justification: 'Tech transfer from Ireland site' },
    ],
    cqas: [
      { id: 'cqa-005', name: 'Potency', specification: '95-105%', testMethod: 'HPLC', acceptanceCriteria: 'All results within specification' },
    ],
  },
];

export const equipment: Equipment[] = [
  {
    id: 'eq-001',
    equipmentId: 'EQ-DISP-001',
    name: 'Dispensing Isolator A',
    type: 'isolator',
    site: 'ireland',
    area: 'Dispensing Suite A',
    status: 'qualified',
    qualificationDate: '2024-06-15',
    requalificationDue: '2025-06-15',
    maintenanceSchedule: 'Quarterly',
    lastMaintenanceDate: '2025-12-01',
    nextMaintenanceDate: '2026-03-01',
    cleaningValidationStatus: 'completed',
    manufacturer: 'SKAN',
    model: 'Isolator Pro 3000',
    serialNumber: 'SKN-2024-1456',
  },
  {
    id: 'eq-002',
    equipmentId: 'EQ-MIX-003',
    name: 'Compounding Vessel 3',
    type: 'vessel',
    site: 'ireland',
    area: 'Compounding Suite B',
    status: 'qualified',
    qualificationDate: '2024-08-20',
    requalificationDue: '2025-08-20',
    maintenanceSchedule: 'Monthly',
    lastMaintenanceDate: '2025-12-15',
    nextMaintenanceDate: '2026-01-15',
    cleaningValidationStatus: 'completed',
    capacity: '500 L',
    manufacturer: 'Sartorius',
    model: 'Biostat STR 500',
    serialNumber: 'SAR-2024-7821',
  },
  {
    id: 'eq-003',
    equipmentId: 'EQ-FILL-002',
    name: 'Aseptic Filling Line 2',
    type: 'filler',
    site: 'ireland',
    area: 'Filling Suite A',
    status: 'qualified',
    qualificationDate: '2024-05-10',
    requalificationDue: '2025-05-10',
    maintenanceSchedule: 'Weekly',
    lastMaintenanceDate: '2025-12-28',
    nextMaintenanceDate: '2026-01-04',
    cleaningValidationStatus: 'completed',
    capacity: '250 vials/min',
    manufacturer: 'Groninger',
    model: 'MFCS 5000',
    serialNumber: 'GRN-2024-3345',
  },
  {
    id: 'eq-004',
    equipmentId: 'EQ-LYO-001',
    name: 'Lyophilizer 1',
    type: 'lyophilizer',
    site: 'ireland',
    area: 'Lyophilization Suite',
    status: 'qualified',
    qualificationDate: '2024-04-01',
    requalificationDue: '2025-04-01',
    maintenanceSchedule: 'Semi-Annual',
    lastMaintenanceDate: '2025-10-15',
    nextMaintenanceDate: '2026-04-15',
    cleaningValidationStatus: 'completed',
    capacity: '50,000 vials',
    manufacturer: 'SP Scientific',
    model: 'LyoStar 4',
    serialNumber: 'SPS-2024-8892',
  },
  {
    id: 'eq-005',
    equipmentId: 'EQ-INSP-001',
    name: 'Visual Inspection System',
    type: 'packaging',
    site: 'ireland',
    area: 'Inspection Suite',
    status: 'qualified',
    qualificationDate: '2024-07-20',
    requalificationDue: '2025-07-20',
    maintenanceSchedule: 'Monthly',
    lastMaintenanceDate: '2025-12-10',
    nextMaintenanceDate: '2026-01-10',
    cleaningValidationStatus: 'completed',
    manufacturer: 'Seidenader',
    model: 'V90-T',
    serialNumber: 'SED-2024-5567',
  },
  {
    id: 'eq-006',
    equipmentId: 'EQ-AUTO-001',
    name: 'Steam Autoclave 1',
    type: 'autoclave',
    site: 'ireland',
    area: 'Utilities',
    status: 'maintenance-due',
    qualificationDate: '2024-03-15',
    requalificationDue: '2025-03-15',
    maintenanceSchedule: 'Monthly',
    lastMaintenanceDate: '2025-11-30',
    nextMaintenanceDate: '2025-12-30',
    cleaningValidationStatus: 'completed',
    manufacturer: 'Fedegari',
    model: 'FOB5',
    serialNumber: 'FED-2024-1123',
  },
];

export const productionSchedules: ProductionSchedule[] = [
  {
    id: 'sched-001',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'ireland',
    plannedBatches: 12,
    completedBatches: 1,
    inProgressBatches: 2,
    targetYield: 99.0,
    actualYield: 99.7,
    startDate: '2025-12-01',
    endDate: '2026-03-31',
    launchReadinessLinked: true,
  },
  {
    id: 'sched-002',
    productId: 'LIG-2847',
    productName: 'Nexavant 100mg',
    site: 'boston',
    plannedBatches: 6,
    completedBatches: 0,
    inProgressBatches: 0,
    targetYield: 98.5,
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    launchReadinessLinked: false,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getBatchById(batchId: string): BatchRecord | undefined {
  return batches.find(b => b.id === batchId);
}

export function getBatchesByProduct(productId: string): BatchRecord[] {
  return batches.filter(b => b.productId === productId);
}

export function getBatchesBySite(site: ManufacturingSite): BatchRecord[] {
  return batches.filter(b => b.site === site);
}

export function getBatchesByStatus(status: BatchStatus): BatchRecord[] {
  return batches.filter(b => b.status === status);
}

export function getActiveBatches(): BatchRecord[] {
  return batches.filter(b => b.status === 'in-progress' || b.status === 'pending-review');
}

export function getDeviationById(deviationId: string): ManufacturingDeviation | undefined {
  return deviations.find(d => d.id === deviationId);
}

export function getDeviationsByBatch(batchId: string): ManufacturingDeviation[] {
  return deviations.filter(d => d.batchId === batchId);
}

export function getOpenDeviations(): ManufacturingDeviation[] {
  return deviations.filter(d => d.status !== 'closed');
}

export function getDeviationsBySite(site: ManufacturingSite): ManufacturingDeviation[] {
  return deviations.filter(d => d.site === site);
}

export function getProcessValidationById(pvId: string): ProcessValidation | undefined {
  return processValidations.find(pv => pv.id === pvId);
}

export function getProcessValidationsByProduct(productId: string): ProcessValidation[] {
  return processValidations.filter(pv => pv.productId === productId);
}

export function getEquipmentBySite(site: ManufacturingSite): Equipment[] {
  return equipment.filter(eq => eq.site === site);
}

export function getEquipmentByStatus(status: EquipmentStatus): Equipment[] {
  return equipment.filter(eq => eq.status === status);
}

export function getEquipmentRequiringMaintenance(): Equipment[] {
  const today = new Date();
  return equipment.filter(eq => {
    if (!eq.nextMaintenanceDate) return false;
    const maintDate = new Date(eq.nextMaintenanceDate);
    const diffDays = Math.ceil((maintDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });
}

export function getProductionSchedulesByProduct(productId: string): ProductionSchedule[] {
  return productionSchedules.filter(ps => ps.productId === productId);
}

// Dashboard Summary
export interface ManufacturingDashboardSummary {
  activeBatches: number;
  batchesPendingRelease: number;
  batchesReleased: number;
  openDeviations: number;
  criticalDeviations: number;
  equipmentQualified: number;
  equipmentMaintenanceDue: number;
  overallYield: number;
  sitesActive: number;
}

export function getManufacturingDashboardSummary(): ManufacturingDashboardSummary {
  const activeBatches = batches.filter(b => b.status === 'in-progress').length;
  const batchesPendingRelease = batches.filter(b => b.status === 'pending-release' || b.status === 'pending-review').length;
  const batchesReleased = batches.filter(b => b.status === 'released').length;
  const openDevs = deviations.filter(d => d.status !== 'closed');
  const criticalDevs = openDevs.filter(d => d.impact === 'critical');
  const qualifiedEquipment = equipment.filter(eq => eq.status === 'qualified').length;
  const maintenanceDue = equipment.filter(eq => eq.status === 'maintenance-due').length;
  
  // Calculate average yield from released batches
  const releasedWithYield = batches.filter(b => b.status === 'released' && b.yield !== undefined);
  const avgYield = releasedWithYield.length > 0
    ? releasedWithYield.reduce((sum, b) => sum + (b.yield || 0), 0) / releasedWithYield.length
    : 0;
  
  const activeSites = new Set(batches.filter(b => b.status === 'in-progress' || b.status === 'scheduled').map(b => b.site)).size;

  return {
    activeBatches,
    batchesPendingRelease,
    batchesReleased,
    openDeviations: openDevs.length,
    criticalDeviations: criticalDevs.length,
    equipmentQualified: qualifiedEquipment,
    equipmentMaintenanceDue: maintenanceDue,
    overallYield: Math.round(avgYield * 10) / 10,
    sitesActive: activeSites,
  };
}

// Phase progress for a batch
export function getBatchPhaseProgress(batch: BatchRecord): { completed: number; total: number; percentage: number } {
  const total = batch.phases.length;
  const completed = batch.phases.filter(p => p.status === 'completed').length;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// CPP compliance for a batch
export function getBatchCPPCompliance(batch: BatchRecord): { total: number; inSpec: number; outOfSpec: number } {
  let total = 0;
  let inSpec = 0;
  let outOfSpec = 0;
  
  batch.phases.forEach(phase => {
    phase.parameters.filter(p => p.isCPP).forEach(param => {
      total++;
      if (param.inSpec) {
        inSpec++;
      } else {
        outOfSpec++;
      }
    });
  });
  
  return { total, inSpec, outOfSpec };
}
