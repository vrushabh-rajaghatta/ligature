/**
 * Nonclinical Studies Data
 * 
 * Lightweight stub showing nonclinical (preclinical) study data with
 * connections to:
 * - CTD Module 4 (Nonclinical Study Reports)
 * - CTD Module 2.4 (Nonclinical Overview)
 * - CTD Module 2.6 (Nonclinical Written/Tabulated Summaries)
 * - Safety signals (translational predictions)
 */

// ============================================================================
// TYPES
// ============================================================================

export type NonclinicalStudyType = 
  | 'pharmacology-primary'
  | 'pharmacology-secondary'
  | 'pharmacology-safety'
  | 'pk-absorption'
  | 'pk-distribution'
  | 'pk-metabolism'
  | 'pk-excretion'
  | 'tox-single-dose'
  | 'tox-repeat-dose'
  | 'tox-genotoxicity'
  | 'tox-carcinogenicity'
  | 'tox-reproductive'
  | 'tox-local-tolerance'
  | 'tox-immunotoxicity'
  | 'tox-phototoxicity';

export type NonclinicalStudyStatus = 
  | 'planned'
  | 'in-progress'
  | 'data-review'
  | 'report-drafting'
  | 'qc-review'
  | 'finalized'
  | 'submitted';

export type Species = 'rat' | 'mouse' | 'dog' | 'monkey' | 'rabbit' | 'minipig' | 'in-vitro';

export type GLPStatus = 'glp' | 'non-glp' | 'glp-like';

export interface NonclinicalStudy {
  id: string;
  studyNumber: string;
  title: string;
  type: NonclinicalStudyType;
  species: Species;
  glpStatus: GLPStatus;
  status: NonclinicalStudyStatus;
  
  // Study details
  startDate: string;
  completionDate?: string;
  duration?: string;  // e.g., "28 days", "6 months"
  doseGroups?: string[];
  routeOfAdministration: string;
  
  // Product linkage
  productId: string;
  productName: string;
  
  // Findings
  keyFindings?: string[];
  noael?: string;  // No Observed Adverse Effect Level
  loael?: string;  // Lowest Observed Adverse Effect Level
  targetOrgans?: string[];
  
  // CTD linkage
  ctdSection: string;  // e.g., '4.2.3.2' for repeat-dose tox
  ctdSummarySection?: string;  // e.g., '2.6.6' for tox summary
  linkedDocumentIds?: string[];  // Authoring document IDs
  
  // Safety signal prediction
  predictedClinicalSignal?: {
    signalType: string;
    probability: number;
    rationale: string;
    monitoringRecommendation?: string;
  };
  
  // Ownership
  principalInvestigator: string;
  studyDirector: string;
  cro?: string;
  
  // Progress
  progress: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface NonclinicalSummary {
  id: string;
  productId: string;
  productName: string;
  summaryType: 'overview' | 'pharmacology-written' | 'pharmacology-tabulated' | 
               'pk-written' | 'pk-tabulated' | 'tox-written' | 'tox-tabulated';
  ctdSection: string;
  title: string;
  status: 'not-started' | 'drafting' | 'review' | 'finalized';
  progress: number;
  linkedStudyIds: string[];  // Studies that feed this summary
  authorName?: string;
  lastUpdated: string;
}

// ============================================================================
// STUDY TYPE MAPPINGS
// ============================================================================

export const STUDY_TYPE_LABELS: Record<NonclinicalStudyType, string> = {
  'pharmacology-primary': 'Primary Pharmacodynamics',
  'pharmacology-secondary': 'Secondary Pharmacodynamics',
  'pharmacology-safety': 'Safety Pharmacology',
  'pk-absorption': 'Absorption',
  'pk-distribution': 'Distribution',
  'pk-metabolism': 'Metabolism',
  'pk-excretion': 'Excretion',
  'tox-single-dose': 'Single-Dose Toxicity',
  'tox-repeat-dose': 'Repeat-Dose Toxicity',
  'tox-genotoxicity': 'Genotoxicity',
  'tox-carcinogenicity': 'Carcinogenicity',
  'tox-reproductive': 'Reproductive Toxicity',
  'tox-local-tolerance': 'Local Tolerance',
  'tox-immunotoxicity': 'Immunotoxicity',
  'tox-phototoxicity': 'Phototoxicity',
};

export const STUDY_TYPE_CTD_MAPPING: Record<NonclinicalStudyType, { section: string; name: string }> = {
  'pharmacology-primary': { section: '4.2.1.1', name: 'Primary Pharmacodynamics' },
  'pharmacology-secondary': { section: '4.2.1.2', name: 'Secondary Pharmacodynamics' },
  'pharmacology-safety': { section: '4.2.1.3', name: 'Safety Pharmacology' },
  'pk-absorption': { section: '4.2.2.2', name: 'Absorption' },
  'pk-distribution': { section: '4.2.2.3', name: 'Distribution' },
  'pk-metabolism': { section: '4.2.2.4', name: 'Metabolism' },
  'pk-excretion': { section: '4.2.2.5', name: 'Excretion' },
  'tox-single-dose': { section: '4.2.3.1', name: 'Single-Dose Toxicity' },
  'tox-repeat-dose': { section: '4.2.3.2', name: 'Repeat-Dose Toxicity' },
  'tox-genotoxicity': { section: '4.2.3.3', name: 'Genotoxicity' },
  'tox-carcinogenicity': { section: '4.2.3.4', name: 'Carcinogenicity' },
  'tox-reproductive': { section: '4.2.3.5', name: 'Reproductive and Developmental Toxicity' },
  'tox-local-tolerance': { section: '4.2.3.6', name: 'Local Tolerance' },
  'tox-immunotoxicity': { section: '4.2.3.7.2', name: 'Immunotoxicity' },
  'tox-phototoxicity': { section: '4.2.3.7.7', name: 'Phototoxicity' },
};

export const SPECIES_LABELS: Record<Species, string> = {
  'rat': 'Rat',
  'mouse': 'Mouse',
  'dog': 'Dog',
  'monkey': 'Cynomolgus Monkey',
  'rabbit': 'Rabbit',
  'minipig': 'Minipig',
  'in-vitro': 'In Vitro',
};

// ============================================================================
// MOCK DATA - LIG-2847 (Nexavant) Nonclinical Package
// ============================================================================

export const nonclinicalStudies: NonclinicalStudy[] = [
  // Pharmacology Studies
  {
    id: 'nc-001',
    studyNumber: 'LIG-2847-PD-001',
    title: 'Primary Pharmacodynamics of LIG-2847 in JAK2 Enzyme Assay',
    type: 'pharmacology-primary',
    species: 'in-vitro',
    glpStatus: 'non-glp',
    status: 'finalized',
    startDate: '2024-01-15',
    completionDate: '2024-03-20',
    routeOfAdministration: 'N/A (in vitro)',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'IC50 = 2.3 nM for JAK2 inhibition',
      '> 100-fold selectivity over JAK1 and JAK3',
      'Dose-dependent inhibition of STAT5 phosphorylation',
    ],
    ctdSection: '4.2.1.1',
    ctdSummarySection: '2.6.2',
    principalInvestigator: 'Dr. James Wilson',
    studyDirector: 'Dr. Sarah Park',
    progress: 100,
    createdAt: '2024-01-10',
    updatedAt: '2024-03-25',
  },
  {
    id: 'nc-002',
    studyNumber: 'LIG-2847-SP-001',
    title: 'Safety Pharmacology Core Battery - Cardiovascular (hERG)',
    type: 'pharmacology-safety',
    species: 'in-vitro',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-02-01',
    completionDate: '2024-04-15',
    routeOfAdministration: 'N/A (in vitro)',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'IC50 for hERG inhibition = 18.5 µM',
      'Safety margin > 1000x over projected Cmax',
      'No QT prolongation concern at therapeutic doses',
    ],
    ctdSection: '4.2.1.3',
    ctdSummarySection: '2.6.2',
    principalInvestigator: 'Dr. Emily Chen',
    studyDirector: 'Dr. Robert Kim',
    cro: 'Covance Laboratories',
    progress: 100,
    createdAt: '2024-02-01',
    updatedAt: '2024-04-20',
  },
  {
    id: 'nc-003',
    studyNumber: 'LIG-2847-SP-002',
    title: 'Safety Pharmacology - CNS and Respiratory',
    type: 'pharmacology-safety',
    species: 'rat',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-03-01',
    completionDate: '2024-05-30',
    routeOfAdministration: 'Oral (gavage)',
    doseGroups: ['0 (vehicle)', '30 mg/kg', '100 mg/kg', '300 mg/kg'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'No CNS effects observed up to 300 mg/kg',
      'No respiratory rate changes',
      'No behavioral abnormalities in Irwin screen',
    ],
    ctdSection: '4.2.1.3',
    ctdSummarySection: '2.6.2',
    principalInvestigator: 'Dr. Maria Rodriguez',
    studyDirector: 'Dr. David Lee',
    cro: 'Charles River Laboratories',
    progress: 100,
    createdAt: '2024-03-01',
    updatedAt: '2024-06-05',
  },
  
  // PK Studies
  {
    id: 'nc-004',
    studyNumber: 'LIG-2847-PK-001',
    title: 'Single-Dose Pharmacokinetics in Rats',
    type: 'pk-absorption',
    species: 'rat',
    glpStatus: 'non-glp',
    status: 'finalized',
    startDate: '2024-01-20',
    completionDate: '2024-03-10',
    routeOfAdministration: 'Oral and IV',
    doseGroups: ['10 mg/kg PO', '5 mg/kg IV'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Oral bioavailability = 68%',
      't1/2 = 4.2 hours',
      'Tmax = 1.5 hours',
      'Linear PK observed',
    ],
    ctdSection: '4.2.2.2',
    ctdSummarySection: '2.6.4',
    principalInvestigator: 'Dr. Kevin Zhang',
    studyDirector: 'Dr. Lisa Wang',
    progress: 100,
    createdAt: '2024-01-20',
    updatedAt: '2024-03-15',
  },
  {
    id: 'nc-005',
    studyNumber: 'LIG-2847-PK-002',
    title: 'Tissue Distribution Study in Rats',
    type: 'pk-distribution',
    species: 'rat',
    glpStatus: 'non-glp',
    status: 'finalized',
    startDate: '2024-02-15',
    completionDate: '2024-04-30',
    routeOfAdministration: 'Oral (gavage)',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Wide tissue distribution',
      'Highest concentrations in liver and kidney',
      'Low CNS penetration (brain:plasma = 0.08)',
      'Moderate protein binding (89%)',
    ],
    ctdSection: '4.2.2.3',
    ctdSummarySection: '2.6.4',
    principalInvestigator: 'Dr. Amanda Foster',
    studyDirector: 'Dr. Michael Brown',
    progress: 100,
    createdAt: '2024-02-15',
    updatedAt: '2024-05-05',
  },
  {
    id: 'nc-006',
    studyNumber: 'LIG-2847-PK-003',
    title: 'In Vitro Metabolism and CYP Inhibition',
    type: 'pk-metabolism',
    species: 'in-vitro',
    glpStatus: 'non-glp',
    status: 'finalized',
    startDate: '2024-03-01',
    completionDate: '2024-05-15',
    routeOfAdministration: 'N/A (in vitro)',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Primary metabolism via CYP3A4 (65%) and CYP2C9 (25%)',
      'No significant CYP inhibition at therapeutic concentrations',
      'Weak CYP3A4 inducer',
      'No reactive metabolites detected',
    ],
    ctdSection: '4.2.2.4',
    ctdSummarySection: '2.6.4',
    principalInvestigator: 'Dr. Jennifer Martinez',
    studyDirector: 'Dr. Thomas Clark',
    progress: 100,
    createdAt: '2024-03-01',
    updatedAt: '2024-05-20',
  },
  
  // Toxicology Studies
  {
    id: 'nc-007',
    studyNumber: 'LIG-2847-TOX-001',
    title: 'Single-Dose Acute Toxicity in Rats',
    type: 'tox-single-dose',
    species: 'rat',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-02-01',
    completionDate: '2024-03-30',
    routeOfAdministration: 'Oral (gavage)',
    doseGroups: ['0 (vehicle)', '500 mg/kg', '1000 mg/kg', '2000 mg/kg'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'LD50 > 2000 mg/kg',
      'Target organs: liver, bone marrow',
      'Full recovery by Day 14',
    ],
    noael: '500 mg/kg',
    targetOrgans: ['Liver', 'Bone marrow'],
    ctdSection: '4.2.3.1',
    ctdSummarySection: '2.6.6',
    principalInvestigator: 'Dr. Patricia Adams',
    studyDirector: 'Dr. Richard Johnson',
    cro: 'Charles River Laboratories',
    progress: 100,
    createdAt: '2024-02-01',
    updatedAt: '2024-04-05',
  },
  {
    id: 'nc-008',
    studyNumber: 'LIG-2847-TOX-002',
    title: '4-Week Repeat-Dose Toxicity in Rats with 2-Week Recovery',
    type: 'tox-repeat-dose',
    species: 'rat',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-03-15',
    completionDate: '2024-06-30',
    duration: '28 days + 14 days recovery',
    routeOfAdministration: 'Oral (gavage)',
    doseGroups: ['0 (vehicle)', '10 mg/kg/day', '30 mg/kg/day', '100 mg/kg/day'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Dose-dependent hepatocellular hypertrophy',
      'Reversible bone marrow hypocellularity at ≥30 mg/kg',
      'ALT elevation at 100 mg/kg (2.5x ULN)',
      'Full recovery after 2 weeks',
    ],
    noael: '10 mg/kg/day',
    loael: '30 mg/kg/day',
    targetOrgans: ['Liver', 'Bone marrow'],
    ctdSection: '4.2.3.2',
    ctdSummarySection: '2.6.6',
    predictedClinicalSignal: {
      signalType: 'Hepatotoxicity',
      probability: 72,
      rationale: 'ALT elevation and hepatocellular changes in rat predict clinical monitoring need',
      monitoringRecommendation: 'Monitor LFTs weekly x 4, then monthly',
    },
    principalInvestigator: 'Dr. Patricia Adams',
    studyDirector: 'Dr. Richard Johnson',
    cro: 'Charles River Laboratories',
    progress: 100,
    createdAt: '2024-03-15',
    updatedAt: '2024-07-10',
  },
  {
    id: 'nc-009',
    studyNumber: 'LIG-2847-TOX-003',
    title: '13-Week Repeat-Dose Toxicity in Dogs with 4-Week Recovery',
    type: 'tox-repeat-dose',
    species: 'dog',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-04-01',
    completionDate: '2024-09-15',
    duration: '13 weeks + 4 weeks recovery',
    routeOfAdministration: 'Oral (capsule)',
    doseGroups: ['0 (vehicle)', '3 mg/kg/day', '10 mg/kg/day', '30 mg/kg/day'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Minimal hepatocellular hypertrophy at ≥10 mg/kg',
      'No bone marrow effects (species difference)',
      'Reversible GI intolerance at 30 mg/kg (emesis)',
      'ECG: No QTc changes',
    ],
    noael: '10 mg/kg/day',
    targetOrgans: ['Liver', 'GI tract'],
    ctdSection: '4.2.3.2',
    ctdSummarySection: '2.6.6',
    principalInvestigator: 'Dr. Susan Miller',
    studyDirector: 'Dr. James Taylor',
    cro: 'Covance Laboratories',
    progress: 100,
    createdAt: '2024-04-01',
    updatedAt: '2024-09-25',
  },
  {
    id: 'nc-010',
    studyNumber: 'LIG-2847-TOX-004',
    title: 'Genotoxicity Battery - Ames, In Vitro MN, In Vivo MN',
    type: 'tox-genotoxicity',
    species: 'in-vitro',
    glpStatus: 'glp',
    status: 'finalized',
    startDate: '2024-02-15',
    completionDate: '2024-06-01',
    routeOfAdministration: 'N/A (in vitro) / Oral (in vivo)',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Ames test: Negative',
      'In vitro micronucleus: Negative',
      'In vivo micronucleus (rat): Negative at 500 mg/kg',
    ],
    ctdSection: '4.2.3.3',
    ctdSummarySection: '2.6.6',
    principalInvestigator: 'Dr. Helen Park',
    studyDirector: 'Dr. Andrew Smith',
    cro: 'BioReliance',
    progress: 100,
    createdAt: '2024-02-15',
    updatedAt: '2024-06-10',
  },
  {
    id: 'nc-011',
    studyNumber: 'LIG-2847-TOX-005',
    title: 'Embryo-Fetal Development Study in Rats',
    type: 'tox-reproductive',
    species: 'rat',
    glpStatus: 'glp',
    status: 'report-drafting',
    startDate: '2024-06-01',
    completionDate: '2024-10-15',
    duration: 'GD 6-17',
    routeOfAdministration: 'Oral (gavage)',
    doseGroups: ['0 (vehicle)', '10 mg/kg/day', '30 mg/kg/day', '100 mg/kg/day'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    keyFindings: [
      'Maternal toxicity at 100 mg/kg (body weight reduction)',
      'Fetal weight reduction at ≥30 mg/kg',
      'No teratogenic effects observed',
    ],
    noael: '10 mg/kg/day (maternal), 10 mg/kg/day (developmental)',
    ctdSection: '4.2.3.5.2',
    ctdSummarySection: '2.6.6',
    principalInvestigator: 'Dr. Catherine Lee',
    studyDirector: 'Dr. Brian Wright',
    cro: 'Charles River Laboratories',
    progress: 85,
    createdAt: '2024-06-01',
    updatedAt: '2024-11-01',
  },
  {
    id: 'nc-012',
    studyNumber: 'LIG-2847-TOX-006',
    title: '26-Week Repeat-Dose Toxicity in Rats',
    type: 'tox-repeat-dose',
    species: 'rat',
    glpStatus: 'glp',
    status: 'in-progress',
    startDate: '2024-07-01',
    duration: '26 weeks + 4 weeks recovery',
    routeOfAdministration: 'Oral (gavage)',
    doseGroups: ['0 (vehicle)', '3 mg/kg/day', '10 mg/kg/day', '30 mg/kg/day'],
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    ctdSection: '4.2.3.2',
    ctdSummarySection: '2.6.6',
    principalInvestigator: 'Dr. Patricia Adams',
    studyDirector: 'Dr. Richard Johnson',
    cro: 'Charles River Laboratories',
    progress: 65,
    createdAt: '2024-07-01',
    updatedAt: '2024-12-01',
  },
];

// ============================================================================
// CTD MODULE 2.6 SUMMARIES
// ============================================================================

export const nonclinicalSummaries: NonclinicalSummary[] = [
  {
    id: 'ncs-001',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'pharmacology-written',
    ctdSection: '2.6.2',
    title: 'Pharmacology Written Summary',
    status: 'finalized',
    progress: 100,
    linkedStudyIds: ['nc-001', 'nc-002', 'nc-003'],
    authorName: 'Dr. James Wilson',
    lastUpdated: '2024-08-15',
  },
  {
    id: 'ncs-002',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'pharmacology-tabulated',
    ctdSection: '2.6.3',
    title: 'Pharmacology Tabulated Summary',
    status: 'finalized',
    progress: 100,
    linkedStudyIds: ['nc-001', 'nc-002', 'nc-003'],
    authorName: 'Dr. James Wilson',
    lastUpdated: '2024-08-20',
  },
  {
    id: 'ncs-003',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'pk-written',
    ctdSection: '2.6.4',
    title: 'Pharmacokinetics Written Summary',
    status: 'finalized',
    progress: 100,
    linkedStudyIds: ['nc-004', 'nc-005', 'nc-006'],
    authorName: 'Dr. Kevin Zhang',
    lastUpdated: '2024-08-25',
  },
  {
    id: 'ncs-004',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'pk-tabulated',
    ctdSection: '2.6.5',
    title: 'Pharmacokinetics Tabulated Summary',
    status: 'finalized',
    progress: 100,
    linkedStudyIds: ['nc-004', 'nc-005', 'nc-006'],
    authorName: 'Dr. Kevin Zhang',
    lastUpdated: '2024-08-28',
  },
  {
    id: 'ncs-005',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'tox-written',
    ctdSection: '2.6.6',
    title: 'Toxicology Written Summary',
    status: 'review',
    progress: 80,
    linkedStudyIds: ['nc-007', 'nc-008', 'nc-009', 'nc-010', 'nc-011', 'nc-012'],
    authorName: 'Dr. Patricia Adams',
    lastUpdated: '2024-11-15',
  },
  {
    id: 'ncs-006',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'tox-tabulated',
    ctdSection: '2.6.7',
    title: 'Toxicology Tabulated Summary',
    status: 'drafting',
    progress: 60,
    linkedStudyIds: ['nc-007', 'nc-008', 'nc-009', 'nc-010', 'nc-011', 'nc-012'],
    authorName: 'Dr. Patricia Adams',
    lastUpdated: '2024-11-10',
  },
  {
    id: 'ncs-007',
    productId: 'prod-001',
    productName: 'LIG-2847 (Nexavant)',
    summaryType: 'overview',
    ctdSection: '2.4',
    title: 'Nonclinical Overview',
    status: 'drafting',
    progress: 45,
    linkedStudyIds: ['nc-001', 'nc-002', 'nc-003', 'nc-004', 'nc-005', 'nc-006', 'nc-007', 'nc-008', 'nc-009', 'nc-010', 'nc-011'],
    authorName: 'Dr. Sarah Park',
    lastUpdated: '2024-11-20',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getStudiesByType = (type: NonclinicalStudyType): NonclinicalStudy[] => {
  return nonclinicalStudies.filter(s => s.type === type);
};

export const getStudiesByProduct = (productId: string): NonclinicalStudy[] => {
  return nonclinicalStudies.filter(s => s.productId === productId);
};

export const getStudiesByStatus = (status: NonclinicalStudyStatus): NonclinicalStudy[] => {
  return nonclinicalStudies.filter(s => s.status === status);
};

export const getStudiesWithPredictions = (): NonclinicalStudy[] => {
  return nonclinicalStudies.filter(s => s.predictedClinicalSignal);
};

export const getSummariesByProduct = (productId: string): NonclinicalSummary[] => {
  return nonclinicalSummaries.filter(s => s.productId === productId);
};

export const getStudyById = (id: string): NonclinicalStudy | undefined => {
  return nonclinicalStudies.find(s => s.id === id);
};

export const getSummaryById = (id: string): NonclinicalSummary | undefined => {
  return nonclinicalSummaries.find(s => s.id === id);
};

export const getStudyCategoryStats = (productId: string) => {
  const studies = getStudiesByProduct(productId);
  
  const pharmacology = studies.filter(s => s.type.startsWith('pharmacology-'));
  const pk = studies.filter(s => s.type.startsWith('pk-'));
  const tox = studies.filter(s => s.type.startsWith('tox-'));
  
  return {
    pharmacology: {
      total: pharmacology.length,
      completed: pharmacology.filter(s => s.status === 'finalized' || s.status === 'submitted').length,
    },
    pharmacokinetics: {
      total: pk.length,
      completed: pk.filter(s => s.status === 'finalized' || s.status === 'submitted').length,
    },
    toxicology: {
      total: tox.length,
      completed: tox.filter(s => s.status === 'finalized' || s.status === 'submitted').length,
    },
  };
};

export const getNonclinicalPackageReadiness = (productId: string) => {
  const studies = getStudiesByProduct(productId);
  const summaries = getSummariesByProduct(productId);
  
  const totalStudies = studies.length;
  const completedStudies = studies.filter(s => s.status === 'finalized' || s.status === 'submitted').length;
  
  const totalSummaries = summaries.length;
  const completedSummaries = summaries.filter(s => s.status === 'finalized').length;
  
  const overallProgress = Math.round(
    ((completedStudies / totalStudies) * 0.7 + (completedSummaries / totalSummaries) * 0.3) * 100
  );
  
  return {
    studies: { total: totalStudies, completed: completedStudies },
    summaries: { total: totalSummaries, completed: completedSummaries },
    overallProgress,
    ready: completedStudies === totalStudies && completedSummaries === totalSummaries,
  };
};
