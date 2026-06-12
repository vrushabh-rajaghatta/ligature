// CMC (Chemistry, Manufacturing & Controls) Module Data
// v0.8.1: Enhanced with Process Development, Formulation History, Tech Transfer
// "When Manufacturing shows CPP 'Mixing Speed 250 RPM linked to DOE-NXV-003' —
//  click through. Here's the actual study. That's not a reference. That's the source data."

export type CMCView = 
  | 'overview' 
  | 'drug-substance' 
  | 'drug-product' 
  | 'batches' 
  | 'stability' 
  | 'analytical' 
  | 'facilities'
  | 'process-dev'      // v0.8.1: DOE Studies, CPP development
  | 'formulation'      // v0.8.1: Formulation iterations
  | 'tech-transfer';   // v0.8.1: Site transfers

// ============================================================================
// v0.8.1: NEW TYPES - Process Development, Formulation, Tech Transfer
// ============================================================================

// Design of Experiments (DOE) Study - THE CRITICAL LINK TO MANUFACTURING
export type DOEStudyType = 'screening' | 'optimization' | 'robustness' | 'characterization';
export type DOEStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

export interface DOEStudy {
  id: string;
  productId: string;
  studyNumber: string;
  title: string;
  type: DOEStudyType;
  status: DOEStatus;
  objective: string;
  design: string; // e.g., "Full Factorial 2^3", "Central Composite", "Fractional Factorial"
  factors: DOEFactor[];
  responses: DOEResponse[];
  runs: number;
  completedRuns: number;
  startDate: string;
  endDate?: string;
  principalInvestigator: string;
  conclusions?: string;
  linkedCPPs: string[]; // Parameters that became CPPs based on this study
  linkedManufacturingParams: string[]; // References to manufacturing parameters
}

export interface DOEFactor {
  name: string;
  unit: string;
  lowLevel: string;
  centerPoint: string;
  highLevel: string;
  isCritical: boolean;
  finalSetpoint?: string;
  provenAcceptableRange?: string;
}

export interface DOEResponse {
  name: string;
  unit: string;
  specification?: string;
  targetValue?: string;
  impactsCQA: boolean;
}

// Formulation Development History
export type FormulationStatus = 'prototype' | 'development' | 'optimization' | 'final' | 'commercial';

export interface FormulationIteration {
  id: string;
  productId: string;
  version: string;
  dosageForm: string;
  status: FormulationStatus;
  date: string;
  description: string;
  composition: FormulationComponent[];
  testResults: FormulationTestResult[];
  issues?: string[];
  resolution?: string;
  isCurrentFormulation: boolean;
  linkedStabilityStudies: string[];
}

export interface FormulationComponent {
  name: string;
  function: string;
  amount: string;
  percentW: number;
  grade: string;
  reference: string;
}

export interface FormulationTestResult {
  parameter: string;
  result: string;
  specification: string;
  status: 'pass' | 'fail' | 'marginal';
}

// Tech Transfer Records
export type TechTransferStatus = 'planned' | 'in-progress' | 'qualification' | 'completed' | 'on-hold';
export type TechTransferType = 'site-to-site' | 'scale-up' | 'cmo-transfer' | 'process-improvement';

export interface TechTransfer {
  id: string;
  productId: string;
  transferNumber: string;
  title: string;
  type: TechTransferType;
  status: TechTransferStatus;
  sendingSite: string;
  receivingSite: string;
  startDate: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  transferLead: string;
  phases: TechTransferPhase[];
  riskAssessment: 'low' | 'medium' | 'high';
  linkedValidationId?: string;
  linkedDOEStudies: string[];
  notes?: string;
}

export interface TechTransferPhase {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  startDate?: string;
  endDate?: string;
  deliverables: string[];
  completedDeliverables: number;
}

// Scale-Up Study
export type ScaleUpStatus = 'planned' | 'in-progress' | 'completed' | 'failed';

export interface ScaleUpStudy {
  id: string;
  productId: string;
  studyNumber: string;
  title: string;
  status: ScaleUpStatus;
  fromScale: string;
  toScale: string;
  objective: string;
  startDate: string;
  endDate?: string;
  scalingFactors: ScalingFactor[];
  results?: string;
  conclusions?: string;
  linkedDOEStudies: string[];
}

export interface ScalingFactor {
  parameter: string;
  labScale: string;
  commercialScale: string;
  scalingRule: string;
  verified: boolean;
}

// ============================================================================
// EXISTING TYPES (unchanged)
// ============================================================================

// Drug Substance
export interface DrugSubstance {
  id: string;
  productId: string;
  name: string;
  genericName: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: number;
  structure: string; // simplified structure representation
  manufacturer: string;
  manufacturingSite: string;
  synthesisRoute: string;
  processDescription: string;
  criticalSteps: string[];
  specifications: Specification[];
  status: 'development' | 'clinical' | 'commercial' | 'filed';
}

export interface Specification {
  id: string;
  parameter: string;
  method: string;
  acceptanceCriteria: string;
  typicalResult: string;
  category: 'identity' | 'assay' | 'impurities' | 'physical' | 'microbial' | 'other';
}

// Drug Product
export interface DrugProduct {
  id: string;
  productId: string;
  drugSubstanceId: string;
  dosageForm: string;
  strength: string;
  routeOfAdministration: string;
  container: string;
  closure: string;
  composition: FormulationComponent[];
  manufacturingSite: string;
  batchSize: string;
  shelfLife: string;
  storageConditions: string;
  specifications: Specification[];
  status: 'development' | 'clinical' | 'commercial' | 'filed';
}

export interface FormulationComponent {
  name: string;
  function: string;
  amount: string;
  percentW: number;
  grade: string;
  reference: string;
}

// Batch Records
export interface BatchRecord {
  id: string;
  productId: string;
  drugSubstanceId?: string;
  drugProductId?: string;
  batchNumber: string;
  batchType: 'ds' | 'dp'; // drug substance or drug product
  batchScale: 'lab' | 'pilot' | 'registration' | 'commercial';
  batchSize: string;
  manufacturingSite: string;
  manufactureDate: string;
  releaseDate?: string;
  expirationDate?: string;
  status: 'in-progress' | 'released' | 'rejected' | 'stability' | 'expired';
  results: BatchResult[];
  deviations: Deviation[];
  usedInStudies?: string[];
}

export interface BatchResult {
  parameter: string;
  specification: string;
  result: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface Deviation {
  id: string;
  description: string;
  category: 'minor' | 'major' | 'critical';
  rootCause?: string;
  capa?: string;
  status: 'open' | 'under-investigation' | 'closed';
}

// Stability Studies
export interface StabilityStudy {
  id: string;
  productId: string;
  batchId: string;
  batchNumber: string;
  studyType: 'long-term' | 'accelerated' | 'intermediate' | 'stress' | 'photostability';
  condition: string;
  protocol: string;
  startDate: string;
  status: 'ongoing' | 'completed' | 'terminated';
  timepoints: StabilityTimepoint[];
  conclusions?: string;
}

export interface StabilityTimepoint {
  months: number;
  status: 'completed' | 'scheduled' | 'missed';
  results?: StabilityResult[];
}

export interface StabilityResult {
  parameter: string;
  specification: string;
  result: string;
  trend?: 'stable' | 'increasing' | 'decreasing';
}

// Analytical Methods
export interface AnalyticalMethod {
  id: string;
  name: string;
  type: 'hplc' | 'gc' | 'ms' | 'ir' | 'uv' | 'dissolution' | 'karl-fischer' | 'particle-size' | 'microbial' | 'other';
  purpose: string;
  applicableTo: ('ds' | 'dp' | 'in-process')[];
  status: 'development' | 'validated' | 'transferred' | 'compendial';
  validationStatus: ValidationStatus;
  lastValidated?: string;
  sop?: string;
}

export interface ValidationStatus {
  specificity: 'validated' | 'pending' | 'na';
  accuracy: 'validated' | 'pending' | 'na';
  precision: 'validated' | 'pending' | 'na';
  linearity: 'validated' | 'pending' | 'na';
  range: 'validated' | 'pending' | 'na';
  robustness: 'validated' | 'pending' | 'na';
  lod: 'validated' | 'pending' | 'na';
  loq: 'validated' | 'pending' | 'na';
}

// Facilities
export interface ManufacturingSite {
  id: string;
  name: string;
  address: string;
  country: string;
  type: 'ds' | 'dp' | 'both' | 'testing' | 'packaging';
  gmpStatus: 'approved' | 'pending' | 'under-audit' | 'not-inspected';
  lastInspection?: string;
  nextInspection?: string;
  products: string[];
  capabilities: string[];
  certifications: string[];
}

// Process Parameters
export interface ProcessParameter {
  id: string;
  step: string;
  parameter: string;
  type: 'cpp' | 'kpp' | 'pp'; // critical, key, process parameter
  normalRange: string;
  provenAcceptableRange?: string;
  controlMethod: string;
  justification: string;
}

// ------- MOCK DATA -------

// Drug Substances
export const drugSubstances: DrugSubstance[] = [
  {
    id: 'ds-001',
    productId: 'lig-2847',
    name: 'Ligrastinib',
    genericName: 'ligrastinib',
    casNumber: '1234567-89-0',
    molecularFormula: 'C25H28N6O3',
    molecularWeight: 460.53,
    structure: 'KRAS G12C covalent inhibitor',
    manufacturer: 'Ligature Pharma API',
    manufacturingSite: 'site-001',
    synthesisRoute: '6-step convergent synthesis',
    processDescription: 'The synthesis involves 6 chemical steps starting from commercially available starting materials.',
    criticalSteps: ['Step 3: Coupling reaction', 'Step 5: Crystallization', 'Step 6: Milling'],
    specifications: [
      { id: 'spec-ds-001', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'White to off-white powder', typicalResult: 'White powder', category: 'physical' },
      { id: 'spec-ds-002', parameter: 'Identity (IR)', method: 'FT-IR', acceptanceCriteria: 'Matches reference', typicalResult: 'Conforms', category: 'identity' },
      { id: 'spec-ds-003', parameter: 'Assay', method: 'HPLC', acceptanceCriteria: '98.0-102.0%', typicalResult: '99.5%', category: 'assay' },
      { id: 'spec-ds-004', parameter: 'Total impurities', method: 'HPLC', acceptanceCriteria: 'NMT 1.0%', typicalResult: '0.45%', category: 'impurities' },
      { id: 'spec-ds-005', parameter: 'Any unknown impurity', method: 'HPLC', acceptanceCriteria: 'NMT 0.10%', typicalResult: '0.05%', category: 'impurities' },
      { id: 'spec-ds-006', parameter: 'Residual solvents', method: 'GC', acceptanceCriteria: 'Per ICH Q3C', typicalResult: 'Conforms', category: 'impurities' },
      { id: 'spec-ds-007', parameter: 'Water content', method: 'Karl Fischer', acceptanceCriteria: 'NMT 0.5%', typicalResult: '0.2%', category: 'physical' },
      { id: 'spec-ds-008', parameter: 'Particle size D90', method: 'Laser diffraction', acceptanceCriteria: 'NMT 50 μm', typicalResult: '35 μm', category: 'physical' },
    ],
    status: 'filed',
  },
  {
    id: 'ds-002',
    productId: 'lig-1182',
    name: 'Ligamab',
    genericName: 'ligamab',
    casNumber: 'N/A (biologic)',
    molecularFormula: 'Monoclonal antibody',
    molecularWeight: 148000,
    structure: 'IgG1 anti-HER2 monoclonal antibody',
    manufacturer: 'Ligature Biologics',
    manufacturingSite: 'site-003',
    synthesisRoute: 'CHO cell fermentation',
    processDescription: 'Recombinant production in CHO cells followed by protein A purification.',
    criticalSteps: ['Cell culture', 'Harvest', 'Protein A chromatography', 'Viral inactivation', 'UF/DF'],
    specifications: [
      { id: 'spec-ds-010', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'Clear to slightly opalescent', typicalResult: 'Clear', category: 'physical' },
      { id: 'spec-ds-011', parameter: 'Identity', method: 'Peptide mapping', acceptanceCriteria: 'Matches reference', typicalResult: 'Conforms', category: 'identity' },
      { id: 'spec-ds-012', parameter: 'Purity (SE-HPLC)', method: 'SE-HPLC', acceptanceCriteria: 'NLT 95%', typicalResult: '98.2%', category: 'assay' },
      { id: 'spec-ds-013', parameter: 'Potency', method: 'Cell-based bioassay', acceptanceCriteria: '80-125%', typicalResult: '105%', category: 'assay' },
    ],
    status: 'filed',
  },
  {
    id: 'ds-003',
    productId: 'lig-3021',
    name: 'Ligatinib',
    genericName: 'ligatinib',
    casNumber: '9876543-21-0',
    molecularFormula: 'C22H24N4O2',
    molecularWeight: 376.45,
    structure: 'JAK1/JAK2 inhibitor',
    manufacturer: 'Ligature Pharma API',
    manufacturingSite: 'site-001',
    synthesisRoute: '5-step linear synthesis',
    processDescription: 'The synthesis involves 5 chemical steps with final recrystallization.',
    criticalSteps: ['Step 4: Cyclization', 'Step 5: Recrystallization'],
    specifications: [
      { id: 'spec-ds-020', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'White to pale yellow powder', typicalResult: 'White powder', category: 'physical' },
      { id: 'spec-ds-021', parameter: 'Assay', method: 'HPLC', acceptanceCriteria: '98.0-102.0%', typicalResult: '99.8%', category: 'assay' },
      { id: 'spec-ds-022', parameter: 'Total impurities', method: 'HPLC', acceptanceCriteria: 'NMT 0.5%', typicalResult: '0.25%', category: 'impurities' },
    ],
    status: 'commercial',
  },
];

// Drug Products
export const drugProducts: DrugProduct[] = [
  {
    id: 'dp-001',
    productId: 'lig-2847',
    drugSubstanceId: 'ds-001',
    dosageForm: 'Film-coated tablet',
    strength: '200 mg',
    routeOfAdministration: 'Oral',
    container: 'HDPE bottle',
    closure: 'Child-resistant cap with induction seal',
    composition: [
      { name: 'Ligrastinib', function: 'Active ingredient', amount: '200 mg', percentW: 40.0, grade: 'In-house', reference: 'In-house spec' },
      { name: 'Microcrystalline cellulose', function: 'Diluent', amount: '150 mg', percentW: 30.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Lactose monohydrate', function: 'Diluent', amount: '80 mg', percentW: 16.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Croscarmellose sodium', function: 'Disintegrant', amount: '40 mg', percentW: 8.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Magnesium stearate', function: 'Lubricant', amount: '5 mg', percentW: 1.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Opadry Yellow', function: 'Film coating', amount: '25 mg', percentW: 5.0, grade: 'Proprietary', reference: 'Colorcon' },
    ],
    manufacturingSite: 'site-002',
    batchSize: '100,000 tablets',
    shelfLife: '24 months',
    storageConditions: 'Store at 25°C (77°F); excursions permitted to 15-30°C',
    specifications: [
      { id: 'spec-dp-001', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'Yellow film-coated oval tablet', typicalResult: 'Conforms', category: 'physical' },
      { id: 'spec-dp-002', parameter: 'Identification', method: 'HPLC', acceptanceCriteria: 'RT matches reference', typicalResult: 'Conforms', category: 'identity' },
      { id: 'spec-dp-003', parameter: 'Assay', method: 'HPLC', acceptanceCriteria: '95.0-105.0%', typicalResult: '99.2%', category: 'assay' },
      { id: 'spec-dp-004', parameter: 'Dissolution', method: 'USP <711>', acceptanceCriteria: 'NLT 80% (Q) in 30 min', typicalResult: '95%', category: 'other' },
      { id: 'spec-dp-005', parameter: 'Content uniformity', method: 'USP <905>', acceptanceCriteria: 'AV ≤ 15.0', typicalResult: 'AV = 4.5', category: 'other' },
      { id: 'spec-dp-006', parameter: 'Total impurities', method: 'HPLC', acceptanceCriteria: 'NMT 2.0%', typicalResult: '0.8%', category: 'impurities' },
    ],
    status: 'filed',
  },
  {
    id: 'dp-002',
    productId: 'lig-1182',
    drugSubstanceId: 'ds-002',
    dosageForm: 'Solution for injection',
    strength: '150 mg/mL',
    routeOfAdministration: 'Intravenous',
    container: 'Type I glass vial',
    closure: 'Rubber stopper with aluminum flip-off seal',
    composition: [
      { name: 'Ligamab', function: 'Active ingredient', amount: '150 mg', percentW: 15.0, grade: 'In-house', reference: 'In-house spec' },
      { name: 'Histidine', function: 'Buffer', amount: '2.4 mg', percentW: 0.24, grade: 'USP', reference: 'USP' },
      { name: 'Histidine HCl', function: 'Buffer', amount: '1.6 mg', percentW: 0.16, grade: 'USP', reference: 'USP' },
      { name: 'Sucrose', function: 'Stabilizer', amount: '60 mg', percentW: 6.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Polysorbate 20', function: 'Surfactant', amount: '0.2 mg', percentW: 0.02, grade: 'NF', reference: 'USP-NF' },
      { name: 'Water for Injection', function: 'Vehicle', amount: 'q.s. to 1 mL', percentW: 78.58, grade: 'USP', reference: 'USP' },
    ],
    manufacturingSite: 'site-003',
    batchSize: '10,000 vials',
    shelfLife: '24 months',
    storageConditions: 'Store refrigerated at 2-8°C. Do not freeze.',
    specifications: [
      { id: 'spec-dp-010', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'Clear to slightly opalescent', typicalResult: 'Clear', category: 'physical' },
      { id: 'spec-dp-011', parameter: 'pH', method: 'USP <791>', acceptanceCriteria: '5.8-6.2', typicalResult: '6.0', category: 'physical' },
      { id: 'spec-dp-012', parameter: 'Protein concentration', method: 'UV 280nm', acceptanceCriteria: '142.5-157.5 mg/mL', typicalResult: '151 mg/mL', category: 'assay' },
      { id: 'spec-dp-013', parameter: 'Purity (SE-HPLC)', method: 'SE-HPLC', acceptanceCriteria: 'NLT 95%', typicalResult: '97.8%', category: 'assay' },
      { id: 'spec-dp-014', parameter: 'Subvisible particles', method: 'USP <788>', acceptanceCriteria: 'Per USP', typicalResult: 'Conforms', category: 'physical' },
    ],
    status: 'filed',
  },
  {
    id: 'dp-003',
    productId: 'lig-3021',
    drugSubstanceId: 'ds-003',
    dosageForm: 'Film-coated tablet',
    strength: '5 mg',
    routeOfAdministration: 'Oral',
    container: 'Aluminum blister',
    closure: 'PVC/PVDC film',
    composition: [
      { name: 'Ligatinib', function: 'Active ingredient', amount: '5 mg', percentW: 2.5, grade: 'In-house', reference: 'In-house spec' },
      { name: 'Mannitol', function: 'Diluent', amount: '150 mg', percentW: 75.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Crospovidone', function: 'Disintegrant', amount: '30 mg', percentW: 15.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Magnesium stearate', function: 'Lubricant', amount: '2 mg', percentW: 1.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Opadry White', function: 'Film coating', amount: '13 mg', percentW: 6.5, grade: 'Proprietary', reference: 'Colorcon' },
    ],
    manufacturingSite: 'site-002',
    batchSize: '500,000 tablets',
    shelfLife: '36 months',
    storageConditions: 'Store at 25°C (77°F); excursions permitted to 15-30°C',
    specifications: [
      { id: 'spec-dp-020', parameter: 'Appearance', method: 'Visual', acceptanceCriteria: 'White round film-coated tablet', typicalResult: 'Conforms', category: 'physical' },
      { id: 'spec-dp-021', parameter: 'Assay', method: 'HPLC', acceptanceCriteria: '95.0-105.0%', typicalResult: '100.5%', category: 'assay' },
      { id: 'spec-dp-022', parameter: 'Dissolution', method: 'USP <711>', acceptanceCriteria: 'NLT 85% (Q) in 30 min', typicalResult: '98%', category: 'other' },
    ],
    status: 'commercial',
  },
];

// Batch Records
export const batchRecords: BatchRecord[] = [
  // LIG-2847 Drug Substance batches
  {
    id: 'batch-001',
    productId: 'lig-2847',
    drugSubstanceId: 'ds-001',
    batchNumber: 'DS-LIG2847-001',
    batchType: 'ds',
    batchScale: 'registration',
    batchSize: '25 kg',
    manufacturingSite: 'site-001',
    manufactureDate: '2024-01-15',
    releaseDate: '2024-02-10',
    expirationDate: '2027-01-15',
    status: 'released',
    results: [
      { parameter: 'Appearance', specification: 'White to off-white powder', result: 'White powder', status: 'pass' },
      { parameter: 'Assay', specification: '98.0-102.0%', result: '99.7%', status: 'pass' },
      { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.42%', status: 'pass' },
      { parameter: 'Water content', specification: 'NMT 0.5%', result: '0.18%', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['LIG-301', 'LIG-302'],
  },
  {
    id: 'batch-002',
    productId: 'lig-2847',
    drugSubstanceId: 'ds-001',
    batchNumber: 'DS-LIG2847-002',
    batchType: 'ds',
    batchScale: 'registration',
    batchSize: '25 kg',
    manufacturingSite: 'site-001',
    manufactureDate: '2024-03-20',
    releaseDate: '2024-04-15',
    expirationDate: '2027-03-20',
    status: 'stability',
    results: [
      { parameter: 'Appearance', specification: 'White to off-white powder', result: 'White powder', status: 'pass' },
      { parameter: 'Assay', specification: '98.0-102.0%', result: '99.5%', status: 'pass' },
      { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.48%', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['Stability'],
  },
  {
    id: 'batch-003',
    productId: 'lig-2847',
    drugSubstanceId: 'ds-001',
    batchNumber: 'DS-LIG2847-003',
    batchType: 'ds',
    batchScale: 'registration',
    batchSize: '25 kg',
    manufacturingSite: 'site-001',
    manufactureDate: '2024-05-10',
    releaseDate: '2024-06-05',
    expirationDate: '2027-05-10',
    status: 'released',
    results: [
      { parameter: 'Appearance', specification: 'White to off-white powder', result: 'Slightly off-white powder', status: 'pass' },
      { parameter: 'Assay', specification: '98.0-102.0%', result: '99.2%', status: 'pass' },
      { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.55%', status: 'pass' },
    ],
    deviations: [
      { id: 'dev-001', description: 'Slight color variation observed', category: 'minor', rootCause: 'Extended drying time', capa: 'Optimize drying parameters', status: 'closed' },
    ],
    usedInStudies: ['LIG-303'],
  },
  // LIG-2847 Drug Product batches
  {
    id: 'batch-004',
    productId: 'lig-2847',
    drugProductId: 'dp-001',
    batchNumber: 'DP-LIG2847-001',
    batchType: 'dp',
    batchScale: 'registration',
    batchSize: '100,000 tablets',
    manufacturingSite: 'site-002',
    manufactureDate: '2024-02-20',
    releaseDate: '2024-03-15',
    expirationDate: '2026-02-20',
    status: 'released',
    results: [
      { parameter: 'Appearance', specification: 'Yellow film-coated oval tablet', result: 'Conforms', status: 'pass' },
      { parameter: 'Assay', specification: '95.0-105.0%', result: '99.8%', status: 'pass' },
      { parameter: 'Dissolution', specification: 'NLT 80% (Q) in 30 min', result: '96%', status: 'pass' },
      { parameter: 'Content uniformity', specification: 'AV ≤ 15.0', result: 'AV = 3.8', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['LIG-301'],
  },
  {
    id: 'batch-005',
    productId: 'lig-2847',
    drugProductId: 'dp-001',
    batchNumber: 'DP-LIG2847-002',
    batchType: 'dp',
    batchScale: 'registration',
    batchSize: '100,000 tablets',
    manufacturingSite: 'site-002',
    manufactureDate: '2024-04-25',
    releaseDate: '2024-05-20',
    expirationDate: '2026-04-25',
    status: 'stability',
    results: [
      { parameter: 'Appearance', specification: 'Yellow film-coated oval tablet', result: 'Conforms', status: 'pass' },
      { parameter: 'Assay', specification: '95.0-105.0%', result: '100.2%', status: 'pass' },
      { parameter: 'Dissolution', specification: 'NLT 80% (Q) in 30 min', result: '95%', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['Stability'],
  },
  // LIG-1182 batches
  {
    id: 'batch-006',
    productId: 'lig-1182',
    drugSubstanceId: 'ds-002',
    batchNumber: 'DS-LIG1182-001',
    batchType: 'ds',
    batchScale: 'registration',
    batchSize: '5 kg',
    manufacturingSite: 'site-003',
    manufactureDate: '2024-02-01',
    releaseDate: '2024-03-01',
    expirationDate: '2026-02-01',
    status: 'released',
    results: [
      { parameter: 'Purity (SE-HPLC)', specification: 'NLT 95%', result: '98.5%', status: 'pass' },
      { parameter: 'Potency', specification: '80-125%', result: '108%', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['LIG-1182-01'],
  },
  {
    id: 'batch-007',
    productId: 'lig-1182',
    drugProductId: 'dp-002',
    batchNumber: 'DP-LIG1182-001',
    batchType: 'dp',
    batchScale: 'registration',
    batchSize: '10,000 vials',
    manufacturingSite: 'site-003',
    manufactureDate: '2024-03-15',
    releaseDate: '2024-04-10',
    expirationDate: '2026-03-15',
    status: 'released',
    results: [
      { parameter: 'Protein concentration', specification: '142.5-157.5 mg/mL', result: '152 mg/mL', status: 'pass' },
      { parameter: 'Purity (SE-HPLC)', specification: 'NLT 95%', result: '97.5%', status: 'pass' },
      { parameter: 'pH', specification: '5.8-6.2', result: '5.95', status: 'pass' },
    ],
    deviations: [],
    usedInStudies: ['LIG-1182-01'],
  },
];

// Stability Studies
export const stabilityStudies: StabilityStudy[] = [
  {
    id: 'stab-001',
    productId: 'lig-2847',
    batchId: 'batch-002',
    batchNumber: 'DS-LIG2847-002',
    studyType: 'long-term',
    condition: '25°C/60% RH',
    protocol: 'ICH Q1A compliant',
    startDate: '2024-04-15',
    status: 'ongoing',
    timepoints: [
      { months: 0, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '99.5%', trend: 'stable' }, { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.48%', trend: 'stable' }] },
      { months: 3, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '99.4%', trend: 'stable' }, { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.52%', trend: 'increasing' }] },
      { months: 6, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '99.3%', trend: 'stable' }, { parameter: 'Total impurities', specification: 'NMT 1.0%', result: '0.55%', trend: 'increasing' }] },
      { months: 9, status: 'scheduled' },
      { months: 12, status: 'scheduled' },
      { months: 18, status: 'scheduled' },
      { months: 24, status: 'scheduled' },
      { months: 36, status: 'scheduled' },
    ],
  },
  {
    id: 'stab-002',
    productId: 'lig-2847',
    batchId: 'batch-002',
    batchNumber: 'DS-LIG2847-002',
    studyType: 'accelerated',
    condition: '40°C/75% RH',
    protocol: 'ICH Q1A compliant',
    startDate: '2024-04-15',
    status: 'completed',
    timepoints: [
      { months: 0, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '99.5%', trend: 'stable' }] },
      { months: 3, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '98.8%', trend: 'decreasing' }] },
      { months: 6, status: 'completed', results: [{ parameter: 'Assay', specification: '98.0-102.0%', result: '98.2%', trend: 'decreasing' }] },
    ],
    conclusions: 'No significant degradation observed under accelerated conditions. Supports 24-month shelf life.',
  },
  {
    id: 'stab-003',
    productId: 'lig-2847',
    batchId: 'batch-005',
    batchNumber: 'DP-LIG2847-002',
    studyType: 'long-term',
    condition: '25°C/60% RH',
    protocol: 'ICH Q1A compliant',
    startDate: '2024-05-20',
    status: 'ongoing',
    timepoints: [
      { months: 0, status: 'completed', results: [{ parameter: 'Assay', specification: '95.0-105.0%', result: '100.2%', trend: 'stable' }, { parameter: 'Dissolution', specification: 'NLT 80% in 30 min', result: '95%', trend: 'stable' }] },
      { months: 3, status: 'completed', results: [{ parameter: 'Assay', specification: '95.0-105.0%', result: '99.8%', trend: 'stable' }, { parameter: 'Dissolution', specification: 'NLT 80% in 30 min', result: '94%', trend: 'stable' }] },
      { months: 6, status: 'completed', results: [{ parameter: 'Assay', specification: '95.0-105.0%', result: '99.5%', trend: 'stable' }, { parameter: 'Dissolution', specification: 'NLT 80% in 30 min', result: '93%', trend: 'stable' }] },
      { months: 9, status: 'scheduled' },
      { months: 12, status: 'scheduled' },
      { months: 18, status: 'scheduled' },
      { months: 24, status: 'scheduled' },
    ],
  },
  {
    id: 'stab-004',
    productId: 'lig-1182',
    batchId: 'batch-007',
    batchNumber: 'DP-LIG1182-001',
    studyType: 'long-term',
    condition: '5°C ± 3°C',
    protocol: 'ICH Q5C compliant (biologics)',
    startDate: '2024-04-10',
    status: 'ongoing',
    timepoints: [
      { months: 0, status: 'completed', results: [{ parameter: 'Purity (SE-HPLC)', specification: 'NLT 95%', result: '97.5%', trend: 'stable' }] },
      { months: 3, status: 'completed', results: [{ parameter: 'Purity (SE-HPLC)', specification: 'NLT 95%', result: '97.2%', trend: 'stable' }] },
      { months: 6, status: 'completed', results: [{ parameter: 'Purity (SE-HPLC)', specification: 'NLT 95%', result: '96.8%', trend: 'decreasing' }] },
      { months: 9, status: 'scheduled' },
      { months: 12, status: 'scheduled' },
    ],
  },
];

// Analytical Methods
export const analyticalMethods: AnalyticalMethod[] = [
  {
    id: 'method-001',
    name: 'Assay and Related Substances (HPLC)',
    type: 'hplc',
    purpose: 'Quantitation of active ingredient and impurities',
    applicableTo: ['ds', 'dp'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'validated', range: 'validated', robustness: 'validated', lod: 'validated', loq: 'validated' },
    lastValidated: '2023-11-15',
    sop: 'QC-SOP-001',
  },
  {
    id: 'method-002',
    name: 'Dissolution Testing',
    type: 'dissolution',
    purpose: 'Drug release testing for tablets',
    applicableTo: ['dp'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'na', range: 'na', robustness: 'validated', lod: 'na', loq: 'na' },
    lastValidated: '2023-12-01',
    sop: 'QC-SOP-002',
  },
  {
    id: 'method-003',
    name: 'Residual Solvents (GC)',
    type: 'gc',
    purpose: 'Detection of residual solvents per ICH Q3C',
    applicableTo: ['ds'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'validated', range: 'validated', robustness: 'validated', lod: 'validated', loq: 'validated' },
    lastValidated: '2023-10-20',
    sop: 'QC-SOP-003',
  },
  {
    id: 'method-004',
    name: 'Water Content (Karl Fischer)',
    type: 'karl-fischer',
    purpose: 'Determination of water content',
    applicableTo: ['ds', 'dp'],
    status: 'compendial',
    validationStatus: { specificity: 'na', accuracy: 'validated', precision: 'validated', linearity: 'na', range: 'na', robustness: 'na', lod: 'na', loq: 'na' },
    sop: 'QC-SOP-004',
  },
  {
    id: 'method-005',
    name: 'Particle Size Distribution',
    type: 'particle-size',
    purpose: 'Determination of particle size distribution',
    applicableTo: ['ds', 'in-process'],
    status: 'validated',
    validationStatus: { specificity: 'na', accuracy: 'validated', precision: 'validated', linearity: 'na', range: 'na', robustness: 'validated', lod: 'na', loq: 'na' },
    lastValidated: '2024-01-10',
    sop: 'QC-SOP-005',
  },
  {
    id: 'method-006',
    name: 'SE-HPLC (Size Exclusion)',
    type: 'hplc',
    purpose: 'Purity determination for biologics',
    applicableTo: ['ds', 'dp'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'validated', range: 'validated', robustness: 'validated', lod: 'na', loq: 'na' },
    lastValidated: '2023-09-15',
    sop: 'QC-SOP-006',
  },
  {
    id: 'method-007',
    name: 'Potency Bioassay',
    type: 'other',
    purpose: 'Cell-based potency assay for biologics',
    applicableTo: ['ds', 'dp'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'validated', range: 'validated', robustness: 'validated', lod: 'na', loq: 'na' },
    lastValidated: '2023-08-20',
    sop: 'QC-SOP-007',
  },
  {
    id: 'method-008',
    name: 'Blend Uniformity',
    type: 'hplc',
    purpose: 'In-process testing for blend uniformity',
    applicableTo: ['in-process'],
    status: 'validated',
    validationStatus: { specificity: 'validated', accuracy: 'validated', precision: 'validated', linearity: 'validated', range: 'validated', robustness: 'validated', lod: 'na', loq: 'na' },
    lastValidated: '2024-02-15',
    sop: 'QC-SOP-008',
  },
];

// Manufacturing Sites
export const manufacturingSites: ManufacturingSite[] = [
  {
    id: 'site-001',
    name: 'Ligature API Manufacturing',
    address: '100 Pharma Drive, Cambridge, MA 02142',
    country: 'United States',
    type: 'ds',
    gmpStatus: 'approved',
    lastInspection: '2024-03-15',
    nextInspection: '2026-03-15',
    products: ['lig-2847', 'lig-3021', 'lig-4012', 'lig-3156'],
    capabilities: ['Small molecule synthesis', 'Process development', 'cGMP manufacturing up to 100 kg scale'],
    certifications: ['FDA registered', 'EMA approved', 'PMDA approved', 'ISO 9001:2015'],
  },
  {
    id: 'site-002',
    name: 'Ligature Drug Product Manufacturing',
    address: '200 Tablet Lane, Research Triangle Park, NC 27709',
    country: 'United States',
    type: 'dp',
    gmpStatus: 'approved',
    lastInspection: '2024-01-20',
    nextInspection: '2026-01-20',
    products: ['lig-2847', 'lig-3021', 'lig-4602'],
    capabilities: ['Oral solid dosage forms', 'Film coating', 'Blister packaging', 'Bottle packaging'],
    certifications: ['FDA registered', 'EMA approved', 'Health Canada approved'],
  },
  {
    id: 'site-003',
    name: 'Ligature Biologics',
    address: '50 Biotech Boulevard, South San Francisco, CA 94080',
    country: 'United States',
    type: 'both',
    gmpStatus: 'approved',
    lastInspection: '2023-11-10',
    nextInspection: '2025-11-10',
    products: ['lig-1182', 'lig-1205', 'lig-5500'],
    capabilities: ['Mammalian cell culture', 'Purification', 'Aseptic fill-finish', 'Lyophilization'],
    certifications: ['FDA registered', 'EMA approved', 'ISO 14001:2015'],
  },
  {
    id: 'site-004',
    name: 'Ligature Quality Control Lab',
    address: '100 Pharma Drive, Building B, Cambridge, MA 02142',
    country: 'United States',
    type: 'testing',
    gmpStatus: 'approved',
    lastInspection: '2024-03-15',
    nextInspection: '2026-03-15',
    products: ['All products'],
    capabilities: ['Release testing', 'Stability testing', 'Method development', 'Method validation'],
    certifications: ['FDA registered', 'ISO 17025:2017'],
  },
  {
    id: 'site-005',
    name: 'Pharma Partner CMO',
    address: 'Industrial Zone 7, Basel, Switzerland',
    country: 'Switzerland',
    type: 'both',
    gmpStatus: 'under-audit',
    lastInspection: '2022-09-01',
    nextInspection: '2024-12-15',
    products: ['lig-4501'],
    capabilities: ['Small molecule synthesis', 'Oral solid dosage', 'Sterile manufacturing'],
    certifications: ['Swissmedic approved', 'EMA approved'],
  },
];

// Process Parameters (for LIG-2847 Drug Substance)
export const processParameters: ProcessParameter[] = [
  {
    id: 'pp-001',
    step: 'Step 3: Coupling Reaction',
    parameter: 'Reaction Temperature',
    type: 'cpp',
    normalRange: '65-70°C',
    provenAcceptableRange: '60-75°C',
    controlMethod: 'Automated temperature control with alarm',
    justification: 'Temperature affects reaction rate and impurity formation',
  },
  {
    id: 'pp-002',
    step: 'Step 3: Coupling Reaction',
    parameter: 'Reaction Time',
    type: 'cpp',
    normalRange: '4-6 hours',
    provenAcceptableRange: '3-8 hours',
    controlMethod: 'HPLC in-process control',
    justification: 'Reaction time affects conversion and impurity profile',
  },
  {
    id: 'pp-003',
    step: 'Step 5: Crystallization',
    parameter: 'Cooling Rate',
    type: 'cpp',
    normalRange: '0.5-1.0°C/min',
    provenAcceptableRange: '0.3-1.5°C/min',
    controlMethod: 'Programmed cooling jacket',
    justification: 'Cooling rate affects particle size and crystal form',
  },
  {
    id: 'pp-004',
    step: 'Step 5: Crystallization',
    parameter: 'Final Temperature',
    type: 'cpp',
    normalRange: '0-5°C',
    provenAcceptableRange: '-5 to 10°C',
    controlMethod: 'Temperature probe with recording',
    justification: 'Final temperature affects yield and purity',
  },
  {
    id: 'pp-005',
    step: 'Step 6: Milling',
    parameter: 'Mill Speed',
    type: 'kpp',
    normalRange: '2000-2500 RPM',
    provenAcceptableRange: '1500-3000 RPM',
    controlMethod: 'Automated mill control',
    justification: 'Affects particle size distribution',
  },
  {
    id: 'pp-006',
    step: 'Step 6: Milling',
    parameter: 'Screen Size',
    type: 'kpp',
    normalRange: '500 μm',
    controlMethod: 'Fixed screen installation',
    justification: 'Determines maximum particle size',
  },
];

// ============================================================================
// v0.8.1: NEW MOCK DATA - DOE Studies, Formulation, Tech Transfer
// ============================================================================

// DOE Studies - THE SOURCE DATA FOR MANUFACTURING CPPs
// These are the studies that Manufacturing references via linkedDOEStudy
export const doeStudies: DOEStudy[] = [
  {
    id: 'DOE-NXV-001',
    productId: 'lig-2847',
    studyNumber: 'DOE-NXV-001',
    title: 'Nexavant Compounding Process Screening',
    type: 'screening',
    status: 'completed',
    objective: 'Identify critical factors affecting drug product quality during compounding',
    design: 'Fractional Factorial 2^(5-2)',
    factors: [
      { name: 'Mixing Speed', unit: 'RPM', lowLevel: '150', centerPoint: '200', highLevel: '250', isCritical: true, finalSetpoint: '200', provenAcceptableRange: '180-220 RPM' },
      { name: 'Mixing Time', unit: 'min', lowLevel: '60', centerPoint: '90', highLevel: '120', isCritical: true, finalSetpoint: '90', provenAcceptableRange: '75-105 min' },
      { name: 'Temperature', unit: '°C', lowLevel: '20', centerPoint: '23', highLevel: '26', isCritical: false },
      { name: 'Order of Addition', unit: '-', lowLevel: 'API first', centerPoint: '-', highLevel: 'Excipients first', isCritical: false },
      { name: 'Batch Size', unit: 'kg', lowLevel: '5', centerPoint: '10', highLevel: '15', isCritical: false },
    ],
    responses: [
      { name: 'Content Uniformity', unit: 'AV', specification: '≤15.0', targetValue: '≤10.0', impactsCQA: true },
      { name: 'Dissolution', unit: '%', specification: '≥80% in 30 min', targetValue: '≥90% in 30 min', impactsCQA: true },
      { name: 'Assay', unit: '%', specification: '95.0-105.0%', targetValue: '98.0-102.0%', impactsCQA: true },
    ],
    runs: 16,
    completedRuns: 16,
    startDate: '2024-03-15',
    endDate: '2024-04-20',
    principalInvestigator: 'Dr. J. Martinez',
    conclusions: 'Mixing speed and mixing time identified as critical factors. Narrow operating ranges established.',
    linkedCPPs: ['CMC-PARAM-MIX-001', 'CMC-PARAM-MIX-002'],
    linkedManufacturingParams: ['Mixing Speed', 'Mixing Time'],
  },
  {
    id: 'DOE-NXV-002',
    productId: 'lig-2847',
    studyNumber: 'DOE-NXV-002',
    title: 'Nexavant Compounding Optimization',
    type: 'optimization',
    status: 'completed',
    objective: 'Optimize mixing parameters for robust content uniformity',
    design: 'Central Composite Design',
    factors: [
      { name: 'Mixing Speed', unit: 'RPM', lowLevel: '180', centerPoint: '250', highLevel: '320', isCritical: true, finalSetpoint: '250', provenAcceptableRange: '200-300 RPM' },
      { name: 'Mixing Time', unit: 'min', lowLevel: '90', centerPoint: '120', highLevel: '150', isCritical: true, finalSetpoint: '120', provenAcceptableRange: '100-140 min' },
    ],
    responses: [
      { name: 'Content Uniformity', unit: 'AV', specification: '≤15.0', targetValue: '≤8.0', impactsCQA: true },
      { name: 'Blend Uniformity', unit: '%RSD', specification: '≤5.0', targetValue: '≤3.0', impactsCQA: true },
    ],
    runs: 13,
    completedRuns: 13,
    startDate: '2024-05-01',
    endDate: '2024-06-10',
    principalInvestigator: 'Dr. J. Martinez',
    conclusions: 'Optimal setpoints: 250 RPM, 120 min. Response surface shows robust region with PAR of 200-300 RPM.',
    linkedCPPs: ['CMC-PARAM-MIX-001', 'CMC-PARAM-MIX-002'],
    linkedManufacturingParams: ['Mixing Speed', 'Mixing Time'],
  },
  {
    id: 'DOE-NXV-003',
    productId: 'lig-2847',
    studyNumber: 'DOE-NXV-003',
    title: 'Nexavant Fill Volume and Lyophilization DOE',
    type: 'optimization',
    status: 'completed',
    objective: 'Establish fill volume and lyophilization parameters for Nexavant injectable',
    design: 'Full Factorial 2^3 with center points',
    factors: [
      { name: 'Fill Volume', unit: 'mL', lowLevel: '1.9', centerPoint: '2.0', highLevel: '2.1', isCritical: true, finalSetpoint: '2.0', provenAcceptableRange: '1.95-2.05 mL' },
      { name: 'Lyo Temperature', unit: '°C', lowLevel: '-45', centerPoint: '-40', highLevel: '-35', isCritical: true, finalSetpoint: '-40', provenAcceptableRange: '-45 to -35°C' },
      { name: 'Chamber Pressure', unit: 'mTorr', lowLevel: '50', centerPoint: '100', highLevel: '150', isCritical: true, finalSetpoint: '100', provenAcceptableRange: '75-125 mTorr' },
    ],
    responses: [
      { name: 'Residual Moisture', unit: '%', specification: '≤3.0', targetValue: '≤1.5', impactsCQA: true },
      { name: 'Reconstitution Time', unit: 'sec', specification: '≤60', targetValue: '≤30', impactsCQA: true },
      { name: 'Cake Appearance', unit: '-', specification: 'White, intact', targetValue: 'White, elegant cake', impactsCQA: true },
    ],
    runs: 11,
    completedRuns: 11,
    startDate: '2024-07-01',
    endDate: '2024-08-15',
    principalInvestigator: 'Dr. S. Chen',
    conclusions: 'Fill volume 2.0 mL, Lyo temp -40°C, Chamber pressure 100 mTorr optimal. All responses within specification across PAR.',
    linkedCPPs: ['CMC-PARAM-FILL-001', 'CMC-PARAM-LYO-001', 'CMC-PARAM-LYO-002'],
    linkedManufacturingParams: ['Fill Volume', 'Lyophilization Temperature', 'Chamber Pressure'],
  },
  {
    id: 'DOE-NXV-004',
    productId: 'lig-2847',
    studyNumber: 'DOE-NXV-004',
    title: 'Nexavant Process Robustness Study',
    type: 'robustness',
    status: 'completed',
    objective: 'Verify process robustness at edge of design space',
    design: 'Edge of Failure Study',
    factors: [
      { name: 'Mixing Speed', unit: 'RPM', lowLevel: '200', centerPoint: '250', highLevel: '300', isCritical: true },
      { name: 'Fill Volume', unit: 'mL', lowLevel: '1.95', centerPoint: '2.0', highLevel: '2.05', isCritical: true },
    ],
    responses: [
      { name: 'Process Capability (Cpk)', unit: '-', specification: '≥1.33', targetValue: '≥1.67', impactsCQA: true },
    ],
    runs: 9,
    completedRuns: 9,
    startDate: '2024-09-01',
    endDate: '2024-09-25',
    principalInvestigator: 'Dr. J. Martinez',
    conclusions: 'Process demonstrated Cpk ≥1.5 across entire PAR. Ready for process validation.',
    linkedCPPs: ['CMC-PARAM-MIX-001', 'CMC-PARAM-FILL-001'],
    linkedManufacturingParams: ['Mixing Speed', 'Fill Volume'],
  },
  {
    id: 'DOE-NXV-005',
    productId: 'lig-2847',
    studyNumber: 'DOE-NXV-005',
    title: 'Nexavant Drug Substance Crystallization DOE',
    type: 'optimization',
    status: 'completed',
    objective: 'Optimize crystallization parameters for particle size and purity',
    design: 'Central Composite Design',
    factors: [
      { name: 'Cooling Rate', unit: '°C/min', lowLevel: '0.3', centerPoint: '0.5', highLevel: '0.7', isCritical: true, finalSetpoint: '0.5', provenAcceptableRange: '0.3-0.7°C/min' },
      { name: 'Final Temperature', unit: '°C', lowLevel: '-5', centerPoint: '0', highLevel: '5', isCritical: true, finalSetpoint: '0', provenAcceptableRange: '-5 to 5°C' },
      { name: 'Seed Loading', unit: '%', lowLevel: '0.1', centerPoint: '0.5', highLevel: '1.0', isCritical: false },
    ],
    responses: [
      { name: 'Particle Size D90', unit: 'μm', specification: '≤50', targetValue: '30-40', impactsCQA: true },
      { name: 'Purity', unit: '%', specification: '≥99.0', targetValue: '≥99.5', impactsCQA: true },
      { name: 'Yield', unit: '%', specification: '≥85', targetValue: '≥90', impactsCQA: false },
    ],
    runs: 17,
    completedRuns: 17,
    startDate: '2024-02-01',
    endDate: '2024-03-20',
    principalInvestigator: 'Dr. A. Patel',
    conclusions: 'Cooling rate and final temperature are critical. Optimal: 0.5°C/min, 0°C final temp.',
    linkedCPPs: ['pp-003', 'pp-004'],
    linkedManufacturingParams: ['Cooling Rate', 'Final Temperature'],
  },
];

// Formulation Iterations - History of how the formulation evolved
export const formulationIterations: FormulationIteration[] = [
  {
    id: 'form-nxv-001',
    productId: 'lig-2847',
    version: 'F1',
    dosageForm: 'Tablet',
    status: 'prototype',
    date: '2023-06-15',
    description: 'Initial tablet formulation - direct compression',
    composition: [
      { name: 'Ligrastinib', function: 'Active', amount: '200 mg', percentW: 40.0, grade: 'In-house', reference: 'Dev spec' },
      { name: 'MCC PH102', function: 'Diluent', amount: '250 mg', percentW: 50.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Croscarmellose sodium', function: 'Disintegrant', amount: '40 mg', percentW: 8.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Magnesium stearate', function: 'Lubricant', amount: '10 mg', percentW: 2.0, grade: 'NF', reference: 'USP-NF' },
    ],
    testResults: [
      { parameter: 'Dissolution (30 min)', result: '62%', specification: '≥80%', status: 'fail' },
      { parameter: 'Content Uniformity', result: 'AV = 18.5', specification: '≤15.0', status: 'fail' },
      { parameter: 'Hardness', result: '8 kp', specification: '6-12 kp', status: 'pass' },
    ],
    issues: ['Poor dissolution due to API wettability', 'Content uniformity fails due to segregation'],
    resolution: 'Add surfactant, reduce API particle size',
    isCurrentFormulation: false,
    linkedStabilityStudies: [],
  },
  {
    id: 'form-nxv-002',
    productId: 'lig-2847',
    version: 'F2',
    dosageForm: 'Tablet',
    status: 'development',
    date: '2023-09-01',
    description: 'Modified formulation with wet granulation',
    composition: [
      { name: 'Ligrastinib', function: 'Active', amount: '200 mg', percentW: 40.0, grade: 'In-house', reference: 'Dev spec' },
      { name: 'MCC PH101', function: 'Diluent', amount: '150 mg', percentW: 30.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Lactose monohydrate', function: 'Diluent', amount: '100 mg', percentW: 20.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'HPMC E5', function: 'Binder', amount: '10 mg', percentW: 2.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Croscarmellose sodium', function: 'Disintegrant', amount: '35 mg', percentW: 7.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Magnesium stearate', function: 'Lubricant', amount: '5 mg', percentW: 1.0, grade: 'NF', reference: 'USP-NF' },
    ],
    testResults: [
      { parameter: 'Dissolution (30 min)', result: '78%', specification: '≥80%', status: 'marginal' },
      { parameter: 'Content Uniformity', result: 'AV = 12.3', specification: '≤15.0', status: 'pass' },
      { parameter: 'Hardness', result: '10 kp', specification: '6-12 kp', status: 'pass' },
    ],
    issues: ['Dissolution marginally passing'],
    resolution: 'Increase disintegrant level',
    isCurrentFormulation: false,
    linkedStabilityStudies: [],
  },
  {
    id: 'form-nxv-003',
    productId: 'lig-2847',
    version: 'F3',
    dosageForm: 'Film-coated tablet',
    status: 'final',
    date: '2024-01-15',
    description: 'Optimized formulation with film coating - Clinical/Commercial',
    composition: [
      { name: 'Ligrastinib', function: 'Active ingredient', amount: '200 mg', percentW: 40.0, grade: 'In-house', reference: 'In-house spec' },
      { name: 'Microcrystalline cellulose', function: 'Diluent', amount: '150 mg', percentW: 30.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Lactose monohydrate', function: 'Diluent', amount: '80 mg', percentW: 16.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Croscarmellose sodium', function: 'Disintegrant', amount: '40 mg', percentW: 8.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Magnesium stearate', function: 'Lubricant', amount: '5 mg', percentW: 1.0, grade: 'NF', reference: 'USP-NF' },
      { name: 'Opadry Yellow', function: 'Film coating', amount: '25 mg', percentW: 5.0, grade: 'Proprietary', reference: 'Colorcon' },
    ],
    testResults: [
      { parameter: 'Dissolution (30 min)', result: '95%', specification: '≥80%', status: 'pass' },
      { parameter: 'Content Uniformity', result: 'AV = 4.5', specification: '≤15.0', status: 'pass' },
      { parameter: 'Hardness', result: '11 kp', specification: '6-12 kp', status: 'pass' },
      { parameter: 'Friability', result: '0.15%', specification: '≤1.0%', status: 'pass' },
    ],
    issues: [],
    isCurrentFormulation: true,
    linkedStabilityStudies: ['stability-001', 'stability-002'],
  },
];

// Tech Transfer Records
export const techTransfers: TechTransfer[] = [
  {
    id: 'tt-nxv-001',
    productId: 'lig-2847',
    transferNumber: 'TT-NXV-2024-001',
    title: 'Nexavant DP Transfer: Boston → Ireland',
    type: 'site-to-site',
    status: 'completed',
    sendingSite: 'site-002',
    receivingSite: 'Cork Manufacturing (Ireland)',
    startDate: '2024-06-01',
    targetCompletionDate: '2024-10-15',
    actualCompletionDate: '2024-10-10',
    transferLead: 'Dr. K. Murphy',
    phases: [
      { name: 'Knowledge Transfer', status: 'completed', startDate: '2024-06-01', endDate: '2024-07-15', deliverables: ['Process description', 'Equipment requirements', 'Training materials'], completedDeliverables: 3 },
      { name: 'Equipment Qualification', status: 'completed', startDate: '2024-07-16', endDate: '2024-08-30', deliverables: ['IQ Protocol', 'OQ Protocol', 'PQ Protocol', 'Qualification reports'], completedDeliverables: 4 },
      { name: 'Process Verification', status: 'completed', startDate: '2024-09-01', endDate: '2024-09-30', deliverables: ['Engineering batches', 'Process capability assessment'], completedDeliverables: 2 },
      { name: 'Regulatory Update', status: 'completed', startDate: '2024-10-01', endDate: '2024-10-10', deliverables: ['CMC supplement', 'Site registration'], completedDeliverables: 2 },
    ],
    riskAssessment: 'medium',
    linkedValidationId: 'val-ireland-001',
    linkedDOEStudies: ['DOE-NXV-002', 'DOE-NXV-003'],
    notes: 'Successful transfer with 3 engineering batches meeting specs. Commercial production authorized.',
  },
  {
    id: 'tt-nxv-002',
    productId: 'lig-2847',
    transferNumber: 'TT-NXV-2025-001',
    title: 'Nexavant DP Transfer: Boston → Singapore',
    type: 'site-to-site',
    status: 'in-progress',
    sendingSite: 'site-002',
    receivingSite: 'Singapore Manufacturing',
    startDate: '2025-01-15',
    targetCompletionDate: '2025-06-30',
    transferLead: 'Dr. L. Tan',
    phases: [
      { name: 'Knowledge Transfer', status: 'completed', startDate: '2025-01-15', endDate: '2025-02-28', deliverables: ['Process description', 'Equipment requirements', 'Training materials'], completedDeliverables: 3 },
      { name: 'Equipment Qualification', status: 'in-progress', startDate: '2025-03-01', deliverables: ['IQ Protocol', 'OQ Protocol', 'PQ Protocol', 'Qualification reports'], completedDeliverables: 2 },
      { name: 'Process Verification', status: 'pending', deliverables: ['Engineering batches', 'Process capability assessment'], completedDeliverables: 0 },
      { name: 'Regulatory Update', status: 'pending', deliverables: ['CMC supplement', 'Site registration'], completedDeliverables: 0 },
    ],
    riskAssessment: 'low',
    linkedDOEStudies: ['DOE-NXV-002', 'DOE-NXV-003'],
    notes: 'Leveraging learnings from Ireland transfer. On track for Q2 2025 completion.',
  },
  {
    id: 'tt-nxv-003',
    productId: 'lig-2847',
    transferNumber: 'TT-NXV-DS-2024-001',
    title: 'Nexavant DS Scale-Up: Lab → Pilot',
    type: 'scale-up',
    status: 'completed',
    sendingSite: 'R&D Labs',
    receivingSite: 'site-001',
    startDate: '2024-01-10',
    targetCompletionDate: '2024-04-30',
    actualCompletionDate: '2024-04-25',
    transferLead: 'Dr. A. Patel',
    phases: [
      { name: 'Process Risk Assessment', status: 'completed', startDate: '2024-01-10', endDate: '2024-01-25', deliverables: ['FMEA', 'Scale-up risk assessment'], completedDeliverables: 2 },
      { name: 'Scale-Up DOE', status: 'completed', startDate: '2024-01-26', endDate: '2024-03-15', deliverables: ['DOE-NXV-005', 'Scale factor calculations'], completedDeliverables: 2 },
      { name: 'Pilot Batches', status: 'completed', startDate: '2024-03-16', endDate: '2024-04-15', deliverables: ['3 pilot batches', 'Batch records'], completedDeliverables: 2 },
      { name: 'Process Lock', status: 'completed', startDate: '2024-04-16', endDate: '2024-04-25', deliverables: ['Validated parameters', 'Control strategy'], completedDeliverables: 2 },
    ],
    riskAssessment: 'medium',
    linkedDOEStudies: ['DOE-NXV-005'],
    notes: 'Crystallization scale-up required additional DOE to optimize cooling profile. Final process locked.',
  },
];

// Scale-Up Studies
export const scaleUpStudies: ScaleUpStudy[] = [
  {
    id: 'su-nxv-001',
    productId: 'lig-2847',
    studyNumber: 'SU-NXV-2024-001',
    title: 'Nexavant DP Compounding Scale-Up',
    status: 'completed',
    fromScale: '5 kg',
    toScale: '50 kg',
    objective: 'Establish scalable compounding process for commercial manufacturing',
    startDate: '2024-04-01',
    endDate: '2024-05-15',
    scalingFactors: [
      { parameter: 'Mixing Time', labScale: '15 min', commercialScale: '90 min', scalingRule: 'Tip speed constant, time scales with batch size', verified: true },
      { parameter: 'Mixing Speed', labScale: '250 RPM', commercialScale: '125 RPM', scalingRule: 'Constant tip speed (scale by D ratio)', verified: true },
      { parameter: 'Granulation Water', labScale: '0.5 L', commercialScale: '5 L', scalingRule: 'Linear scale with batch size', verified: true },
    ],
    results: 'All scaled batches met dissolution and content uniformity specifications.',
    conclusions: 'Process scales successfully using constant tip speed approach. Mixing time requires 6x increase.',
    linkedDOEStudies: ['DOE-NXV-002'],
  },
  {
    id: 'su-nxv-002',
    productId: 'lig-2847',
    studyNumber: 'SU-NXV-2024-002',
    title: 'Nexavant DS Crystallization Scale-Up',
    status: 'completed',
    fromScale: '500 g',
    toScale: '25 kg',
    objective: 'Scale crystallization while maintaining particle size and purity',
    startDate: '2024-02-15',
    endDate: '2024-04-10',
    scalingFactors: [
      { parameter: 'Cooling Rate', labScale: '1.0°C/min', commercialScale: '0.5°C/min', scalingRule: 'Reduced to account for heat transfer limitations', verified: true },
      { parameter: 'Agitation Speed', labScale: '300 RPM', commercialScale: '150 RPM', scalingRule: 'Constant power/volume', verified: true },
      { parameter: 'Seed Loading', labScale: '0.5%', commercialScale: '0.5%', scalingRule: 'Constant % of batch', verified: true },
    ],
    results: 'Particle size D90 maintained at 35 μm (spec ≤50 μm). Purity 99.6% (spec ≥99.0%).',
    conclusions: 'Crystallization scales with reduced cooling rate. DOE-NXV-005 parameters validated at scale.',
    linkedDOEStudies: ['DOE-NXV-005'],
  },
];

// Helper functions
export function getDrugSubstanceByProduct(productId: string): DrugSubstance | undefined {
  return drugSubstances.find(ds => ds.productId === productId);
}

export function getDrugProductByProduct(productId: string): DrugProduct[] {
  return drugProducts.filter(dp => dp.productId === productId);
}

export function getBatchesByProduct(productId: string): BatchRecord[] {
  return batchRecords.filter(b => b.productId === productId);
}

export function getStabilityByProduct(productId: string): StabilityStudy[] {
  return stabilityStudies.filter(s => s.productId === productId);
}

export function getStabilityByBatch(batchId: string): StabilityStudy[] {
  return stabilityStudies.filter(s => s.batchId === batchId);
}

export function getSiteById(siteId: string): ManufacturingSite | undefined {
  return manufacturingSites.find(s => s.id === siteId);
}

export function getMethodsByApplicability(type: 'ds' | 'dp' | 'in-process'): AnalyticalMethod[] {
  return analyticalMethods.filter(m => m.applicableTo.includes(type));
}

// Calculate CMC statistics for a product
export function getCMCStats(productId: string) {
  const batches = getBatchesByProduct(productId);
  const stability = getStabilityByProduct(productId);
  const ds = getDrugSubstanceByProduct(productId);
  const dps = getDrugProductByProduct(productId);

  return {
    totalBatches: batches.length,
    releasedBatches: batches.filter(b => b.status === 'released').length,
    onStability: stability.filter(s => s.status === 'ongoing').length,
    deviations: batches.reduce((acc, b) => acc + b.deviations.filter(d => d.status !== 'closed').length, 0),
    drugSubstanceStatus: ds?.status || 'unknown',
    drugProductCount: dps.length,
  };
}

// ============================================================================
// v0.8.1: NEW HELPER FUNCTIONS
// ============================================================================

// DOE Study helpers
export function getDOEStudiesByProduct(productId: string): DOEStudy[] {
  return doeStudies.filter(d => d.productId === productId);
}

export function getDOEStudyById(studyId: string): DOEStudy | undefined {
  return doeStudies.find(d => d.id === studyId);
}

export function getDOEStudyByNumber(studyNumber: string): DOEStudy | undefined {
  return doeStudies.find(d => d.studyNumber === studyNumber);
}

export function getCompletedDOEStudies(productId: string): DOEStudy[] {
  return doeStudies.filter(d => d.productId === productId && d.status === 'completed');
}

export function getDOEStudiesWithCPPs(productId: string): DOEStudy[] {
  return doeStudies.filter(d => d.productId === productId && d.linkedCPPs.length > 0);
}

// Formulation helpers
export function getFormulationsByProduct(productId: string): FormulationIteration[] {
  return formulationIterations.filter(f => f.productId === productId);
}

export function getCurrentFormulation(productId: string): FormulationIteration | undefined {
  return formulationIterations.find(f => f.productId === productId && f.isCurrentFormulation);
}

export function getFormulationHistory(productId: string): FormulationIteration[] {
  return formulationIterations
    .filter(f => f.productId === productId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Tech Transfer helpers
export function getTechTransfersByProduct(productId: string): TechTransfer[] {
  return techTransfers.filter(t => t.productId === productId);
}

export function getTechTransferById(transferId: string): TechTransfer | undefined {
  return techTransfers.find(t => t.id === transferId);
}

export function getActiveTechTransfers(productId: string): TechTransfer[] {
  return techTransfers.filter(t => t.productId === productId && t.status !== 'completed' && t.status !== 'on-hold');
}

export function getCompletedTechTransfers(productId: string): TechTransfer[] {
  return techTransfers.filter(t => t.productId === productId && t.status === 'completed');
}

// Scale-Up helpers
export function getScaleUpStudiesByProduct(productId: string): ScaleUpStudy[] {
  return scaleUpStudies.filter(s => s.productId === productId);
}

export function getScaleUpStudyById(studyId: string): ScaleUpStudy | undefined {
  return scaleUpStudies.find(s => s.id === studyId);
}

// Cross-reference: Get DOE study that established a manufacturing parameter
export function getDOEStudyForParameter(paramName: string): DOEStudy | undefined {
  return doeStudies.find(d => 
    d.linkedManufacturingParams.includes(paramName) ||
    d.factors.some(f => f.name === paramName)
  );
}

// Get enhanced CMC stats including new entities
export function getEnhancedCMCStats(productId: string) {
  const baseStats = getCMCStats(productId);
  const doeStudiesForProduct = getDOEStudiesByProduct(productId);
  const formulations = getFormulationsByProduct(productId);
  const transfers = getTechTransfersByProduct(productId);
  const scaleUps = getScaleUpStudiesByProduct(productId);

  return {
    ...baseStats,
    doeStudies: doeStudiesForProduct.length,
    completedDOE: doeStudiesForProduct.filter(d => d.status === 'completed').length,
    formulationIterations: formulations.length,
    currentFormulation: formulations.find(f => f.isCurrentFormulation)?.version || 'N/A',
    activeTransfers: transfers.filter(t => t.status === 'in-progress').length,
    completedTransfers: transfers.filter(t => t.status === 'completed').length,
    scaleUpStudies: scaleUps.length,
    completedScaleUp: scaleUps.filter(s => s.status === 'completed').length,
  };
}
