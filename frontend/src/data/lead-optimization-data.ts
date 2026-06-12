// Lead Optimization Module Data
// v0.8.2: Complete upstream R&D Connected story
// "That compound selection? 47 compounds across 3 series. Here's why LIG-2847-042 won."

// ============================================================================
// TYPES
// ============================================================================

export type SeriesStatus = 'active' | 'deprioritized' | 'selected';
export type CompoundStatus = 'synthesized' | 'screened' | 'profiled' | 'candidate' | 'backup' | 'discontinued';

export interface LeadSeries {
  id: string;
  productId: string;
  seriesNumber: string;
  seriesName: string;
  target: string;
  chemotype: string;
  status: SeriesStatus;
  startDate: string;
  endDate?: string;
  totalCompounds: number;
  description: string;
  keyAdvantages: string[];
  keyLiabilities: string[];
  deprioritizationReason?: string;
  selectionRationale?: string;
  compounds: LeadCompound[];
  // ADMET profile for radar chart (v0.125.58)
  admetProfile?: {
    solubility: number;       // 0-100
    permeability: number;     // 0-100
    metabolicStability: number; // 0-100
    hERGSafetyMargin: number; // 0-100
    oralBioavailability: number; // 0-100
    selectivityIndex: number;  // 0-100
  };
  // R&D Connected
  linkedFormulationStudies: string[];
  linkedDOEStudies: string[];
  linkedPreclinicalStudies: string[];
}

export interface LeadCompound {
  id: string;
  seriesId: string;
  compoundNumber: string;
  synthesisDate: string;
  status: CompoundStatus;
  properties: CompoundProperties;
  sarNotes?: string;
  isSelectedCandidate: boolean;
  isBackupCandidate: boolean;
  selectionNotes?: string;
}

export interface CompoundProperties {
  ic50: string;
  ic50Value: number;  // For sorting
  cellPotency: string;
  cellPotencyValue: number;
  selectivity: string;
  permeability: string;
  permeabilityValue: number;
  metabolicStability: string;
  metabolicStabilityValue: number;
  solubility: string;
  solubilityValue: number;
  hergIC50: string;
  hergIC50Value: number;
  clogP: number;
  mw: number;
  psa: number;
  hbd: number;
  hba: number;
}

export interface CandidateSelectionSummary {
  productId: string;
  selectedCompound: string;
  backupCompound: string;
  selectionDate: string;
  selectionCommittee: string[];
  keyDifferentiators: string[];
  risksMitigated: string[];
  remainingRisks: string[];
  linkedINDStudies: string[];
}

// ============================================================================
// NEXAVANT (LIG-2847) LEAD OPTIMIZATION DATA
// ============================================================================

export const leadSeries: LeadSeries[] = [
  // Series A - Initial hits, deprioritized due to metabolic instability
  {
    id: 'ls-2847-a',
    productId: 'lig-2847',
    seriesNumber: 'LS-2847-A',
    seriesName: 'Pyrrolidine Series A',
    target: 'KRAS G12C',
    chemotype: 'Acrylamide pyrrolidine',
    status: 'deprioritized',
    startDate: '2019-01-15',
    endDate: '2019-05-30',
    totalCompounds: 12,
    description: 'Initial hit series from HTS campaign. Covalent warhead targeting Cys12.',
    keyAdvantages: [
      'High biochemical potency (IC50 < 10 nM)',
      'Excellent selectivity vs WT KRAS',
      'Good cell permeability',
    ],
    keyLiabilities: [
      'Poor metabolic stability (t½ < 15 min HLM)',
      'CYP3A4 substrate with high clearance',
      'Limited oral bioavailability predicted',
    ],
    deprioritizationReason: 'Metabolic instability incompatible with QD oral dosing target. Clearance too high for therapeutic window.',
    admetProfile: { solubility: 68, permeability: 75, metabolicStability: 71, hERGSafetyMargin: 15, oralBioavailability: 58, selectivityIndex: 55 },
    linkedFormulationStudies: [],
    linkedDOEStudies: [],
    linkedPreclinicalStudies: [],
    compounds: [
      {
        id: 'cmp-a-001',
        seriesId: 'ls-2847-a',
        compoundNumber: 'LIG-2847-001',
        synthesisDate: '2019-01-20',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Initial HTS hit. Good potency but rapid metabolism.',
        properties: {
          ic50: '8.5 nM',
          ic50Value: 8.5,
          cellPotency: '45 nM (H358)',
          cellPotencyValue: 45,
          selectivity: '>500x vs WT',
          permeability: 'Papp 22 × 10⁻⁶',
          permeabilityValue: 22,
          metabolicStability: 't½ 8 min (HLM)',
          metabolicStabilityValue: 8,
          solubility: '85 μg/mL',
          solubilityValue: 85,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.2,
          mw: 425,
          psa: 78,
          hbd: 1,
          hba: 5,
        },
      },
      {
        id: 'cmp-a-005',
        seriesId: 'ls-2847-a',
        compoundNumber: 'LIG-2847-005',
        synthesisDate: '2019-02-15',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Fluorine scan. Improved potency but metabolic liability persists.',
        properties: {
          ic50: '3.2 nM',
          ic50Value: 3.2,
          cellPotency: '28 nM (H358)',
          cellPotencyValue: 28,
          selectivity: '>800x vs WT',
          permeability: 'Papp 19 × 10⁻⁶',
          permeabilityValue: 19,
          metabolicStability: 't½ 12 min (HLM)',
          metabolicStabilityValue: 12,
          solubility: '72 μg/mL',
          solubilityValue: 72,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.5,
          mw: 443,
          psa: 78,
          hbd: 1,
          hba: 5,
        },
      },
      {
        id: 'cmp-a-012',
        seriesId: 'ls-2847-a',
        compoundNumber: 'LIG-2847-012',
        synthesisDate: '2019-05-10',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Best of Series A. Still insufficient metabolic stability.',
        properties: {
          ic50: '2.8 nM',
          ic50Value: 2.8,
          cellPotency: '22 nM (H358)',
          cellPotencyValue: 22,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 18 × 10⁻⁶',
          permeabilityValue: 18,
          metabolicStability: 't½ 14 min (HLM)',
          metabolicStabilityValue: 14,
          solubility: '68 μg/mL',
          solubilityValue: 68,
          hergIC50: '25 μM',
          hergIC50Value: 25,
          clogP: 3.8,
          mw: 461,
          psa: 82,
          hbd: 1,
          hba: 6,
        },
      },
    ],
  },

  // Series B - Improved metabolism but hERG liability
  {
    id: 'ls-2847-b',
    productId: 'lig-2847',
    seriesNumber: 'LS-2847-B',
    seriesName: 'Piperidine Series B',
    target: 'KRAS G12C',
    chemotype: 'Vinyl sulfone piperidine',
    status: 'deprioritized',
    startDate: '2019-04-01',
    endDate: '2019-08-15',
    totalCompounds: 18,
    description: 'Alternative warhead strategy to address metabolic stability. Piperidine core for improved PK.',
    keyAdvantages: [
      'Good metabolic stability (t½ > 45 min HLM)',
      'Improved oral bioavailability prediction',
      'Maintained target potency',
    ],
    keyLiabilities: [
      'hERG liability (IC50 5-15 μM)',
      'Basic nitrogen introduces cardiac risk',
      'Would require extensive cardiac safety package',
    ],
    deprioritizationReason: 'hERG IC50 < 15 μM across series. Unacceptable cardiac safety risk for chronic oncology indication.',
    linkedFormulationStudies: [],
    linkedDOEStudies: [],
    linkedPreclinicalStudies: [],
    compounds: [
      {
        id: 'cmp-b-013',
        seriesId: 'ls-2847-b',
        compoundNumber: 'LIG-2847-013',
        synthesisDate: '2019-04-10',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Series B lead. Good PK but unacceptable hERG.',
        properties: {
          ic50: '5.1 nM',
          ic50Value: 5.1,
          cellPotency: '35 nM (H358)',
          cellPotencyValue: 35,
          selectivity: '>800x vs WT',
          permeability: 'Papp 15 × 10⁻⁶',
          permeabilityValue: 15,
          metabolicStability: 't½ 52 min (HLM)',
          metabolicStabilityValue: 52,
          solubility: '145 μg/mL',
          solubilityValue: 145,
          hergIC50: '8.2 μM',
          hergIC50Value: 8.2,
          clogP: 2.8,
          mw: 448,
          psa: 85,
          hbd: 2,
          hba: 6,
        },
      },
      {
        id: 'cmp-b-022',
        seriesId: 'ls-2847-b',
        compoundNumber: 'LIG-2847-022',
        synthesisDate: '2019-06-20',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Attempted hERG mitigation via fluorine. Insufficient improvement.',
        properties: {
          ic50: '4.8 nM',
          ic50Value: 4.8,
          cellPotency: '32 nM (H358)',
          cellPotencyValue: 32,
          selectivity: '>900x vs WT',
          permeability: 'Papp 14 × 10⁻⁶',
          permeabilityValue: 14,
          metabolicStability: 't½ 48 min (HLM)',
          metabolicStabilityValue: 48,
          solubility: '132 μg/mL',
          solubilityValue: 132,
          hergIC50: '12.5 μM',
          hergIC50Value: 12.5,
          clogP: 3.1,
          mw: 466,
          psa: 85,
          hbd: 2,
          hba: 6,
        },
      },
      {
        id: 'cmp-b-030',
        seriesId: 'ls-2847-b',
        compoundNumber: 'LIG-2847-030',
        synthesisDate: '2019-08-01',
        status: 'discontinued',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Best hERG in series but still below threshold. Series terminated.',
        properties: {
          ic50: '6.2 nM',
          ic50Value: 6.2,
          cellPotency: '42 nM (H358)',
          cellPotencyValue: 42,
          selectivity: '>700x vs WT',
          permeability: 'Papp 12 × 10⁻⁶',
          permeabilityValue: 12,
          metabolicStability: 't½ 55 min (HLM)',
          metabolicStabilityValue: 55,
          solubility: '118 μg/mL',
          solubilityValue: 118,
          hergIC50: '14.8 μM',
          hergIC50Value: 14.8,
          clogP: 2.6,
          mw: 452,
          psa: 92,
          hbd: 2,
          hba: 7,
        },
      },
    ],
  },

  // Series C - Selected series, balanced profile
  {
    id: 'ls-2847-c',
    productId: 'lig-2847',
    seriesNumber: 'LS-2847-C',
    seriesName: 'Optimized Pyrrolidine Series C',
    target: 'KRAS G12C',
    chemotype: 'Covalent pyrrolidine with metabolic blocker',
    status: 'selected',
    startDate: '2019-06-15',
    endDate: '2019-12-15',
    totalCompounds: 17,
    description: 'Return to pyrrolidine scaffold with strategic metabolic blocking groups. Achieved balance of potency, PK, and safety.',
    keyAdvantages: [
      'Excellent biochemical potency (IC50 < 5 nM)',
      'Good metabolic stability (t½ > 45 min)',
      'Clean hERG profile (IC50 > 30 μM)',
      'Favorable oral bioavailability',
      'Once-daily dosing feasible',
    ],
    keyLiabilities: [
      'Moderate solubility (addressed in formulation)',
      'Hepatocyte signal in high-dose tox (manageable)',
    ],
    selectionRationale: 'Series C achieved the target product profile: QD oral dosing, clean cardiac safety, manageable hepatic signal. LIG-2847-042 selected as clinical candidate based on optimal balance of potency, PK, and developability.',
    admetProfile: { solubility: 72, permeability: 85, metabolicStability: 78, hERGSafetyMargin: 88, oralBioavailability: 74, selectivityIndex: 92 },
    linkedFormulationStudies: ['form-nxv-f1', 'form-nxv-f2', 'form-nxv-f3'],
    linkedDOEStudies: ['DOE-NXV-001'],
    linkedPreclinicalStudies: ['gp-prec-001', 'gp-prec-002'],
    compounds: [
      {
        id: 'cmp-c-031',
        seriesId: 'ls-2847-c',
        compoundNumber: 'LIG-2847-031',
        synthesisDate: '2019-06-20',
        status: 'profiled',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Initial Series C compound. Proof of concept for metabolic blocking strategy.',
        properties: {
          ic50: '4.5 nM',
          ic50Value: 4.5,
          cellPotency: '28 nM (H358)',
          cellPotencyValue: 28,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 16 × 10⁻⁶',
          permeabilityValue: 16,
          metabolicStability: 't½ 38 min (HLM)',
          metabolicStabilityValue: 38,
          solubility: '95 μg/mL',
          solubilityValue: 95,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.4,
          mw: 468,
          psa: 88,
          hbd: 1,
          hba: 6,
        },
      },
      {
        id: 'cmp-c-038',
        seriesId: 'ls-2847-c',
        compoundNumber: 'LIG-2847-038',
        synthesisDate: '2019-09-05',
        status: 'profiled',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Improved metabolic stability via gem-dimethyl. Solubility reduced.',
        properties: {
          ic50: '3.1 nM',
          ic50Value: 3.1,
          cellPotency: '18 nM (H358)',
          cellPotencyValue: 18,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 17 × 10⁻⁶',
          permeabilityValue: 17,
          metabolicStability: 't½ 52 min (HLM)',
          metabolicStabilityValue: 52,
          solubility: '78 μg/mL',
          solubilityValue: 78,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.8,
          mw: 496,
          psa: 88,
          hbd: 1,
          hba: 6,
        },
      },
      {
        id: 'cmp-c-042',
        seriesId: 'ls-2847-c',
        compoundNumber: 'LIG-2847-042',
        synthesisDate: '2019-10-15',
        status: 'candidate',
        isSelectedCandidate: true,
        isBackupCandidate: false,
        sarNotes: 'CLINICAL CANDIDATE. Optimal balance of all properties. Selected Dec 2019.',
        selectionNotes: 'Best-in-class potency with clean safety profile. Solubility addressed via salt form and formulation optimization.',
        properties: {
          ic50: '2.3 nM',
          ic50Value: 2.3,
          cellPotency: '15 nM (H358)',
          cellPotencyValue: 15,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 18 × 10⁻⁶',
          permeabilityValue: 18,
          metabolicStability: 't½ 45 min (HLM)',
          metabolicStabilityValue: 45,
          solubility: '125 μg/mL',
          solubilityValue: 125,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.6,
          mw: 482,
          psa: 85,
          hbd: 1,
          hba: 6,
        },
      },
      {
        id: 'cmp-c-044',
        seriesId: 'ls-2847-c',
        compoundNumber: 'LIG-2847-044',
        synthesisDate: '2019-11-01',
        status: 'backup',
        isSelectedCandidate: false,
        isBackupCandidate: true,
        sarNotes: 'BACKUP CANDIDATE. Similar profile to -042 with slightly better solubility but lower potency.',
        selectionNotes: 'Designated backup in case of unforeseen issues with -042. Higher solubility provides formulation flexibility.',
        properties: {
          ic50: '3.8 nM',
          ic50Value: 3.8,
          cellPotency: '22 nM (H358)',
          cellPotencyValue: 22,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 19 × 10⁻⁶',
          permeabilityValue: 19,
          metabolicStability: 't½ 48 min (HLM)',
          metabolicStabilityValue: 48,
          solubility: '165 μg/mL',
          solubilityValue: 165,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.3,
          mw: 470,
          psa: 88,
          hbd: 1,
          hba: 6,
        },
      },
      {
        id: 'cmp-c-047',
        seriesId: 'ls-2847-c',
        compoundNumber: 'LIG-2847-047',
        synthesisDate: '2019-12-01',
        status: 'profiled',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Final Series C compound. Good profile but no advantage over -042.',
        properties: {
          ic50: '2.8 nM',
          ic50Value: 2.8,
          cellPotency: '17 nM (H358)',
          cellPotencyValue: 17,
          selectivity: '>1000x vs WT',
          permeability: 'Papp 17 × 10⁻⁶',
          permeabilityValue: 17,
          metabolicStability: 't½ 42 min (HLM)',
          metabolicStabilityValue: 42,
          solubility: '108 μg/mL',
          solubilityValue: 108,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.5,
          mw: 478,
          psa: 86,
          hbd: 1,
          hba: 6,
        },
      },
    ],
  },
  // Series D — active, under final profiling. Enables "Select as Candidate" nomination demo.
  {
    id: 'ls-2847-d',
    productId: 'lig-2847',
    seriesNumber: 'LS-2847-D',
    seriesName: 'Indazole Series D',
    target: 'KRAS G12C',
    chemotype: 'Non-covalent indazole',
    status: 'active',
    startDate: '2020-02-01',
    endDate: undefined,
    totalCompounds: 4,
    description: 'Non-covalent scaffold identified via fragment-based screening. Exploring as potential backup to LS-2847-C with differentiated resistance profile.',
    keyAdvantages: [
      'Activity against G12C/G12D dual mutant (emerging resistance)',
      'No electrophilic warhead — reduced off-target covalent burden',
      'Strong IP position: WO2021/054321 filed',
    ],
    keyLiabilities: [
      'Lower absolute potency vs LS-2847-C (IC50 ~18 nM)',
      'Aqueous solubility borderline — formulation challenge anticipated',
      'Limited in vivo PK data; rat study ongoing',
    ],
    deprioritizationReason: undefined,
    admetProfile: { solubility: 52, permeability: 71, metabolicStability: 80, hERGSafetyMargin: 82, oralBioavailability: 61, selectivityIndex: 78 },
    linkedFormulationStudies: [],
    linkedDOEStudies: [],
    linkedPreclinicalStudies: [],
    compounds: [
      {
        id: 'cmp-d-001',
        seriesId: 'ls-2847-d',
        compoundNumber: 'LIG-2847-051',
        synthesisDate: '2020-02-10',
        status: 'profiling',
        isSelectedCandidate: false,
        isBackupCandidate: false,
        sarNotes: 'Fragment hit from FBDD campaign. Confirmed target engagement by STD-NMR.',
        properties: {
          ic50: '42 nM',
          ic50Value: 42,
          cellPotency: '180 nM (H358)',
          cellPotencyValue: 180,
          selectivity: '>200x vs WT',
          permeability: 'Papp 14 × 10⁻⁶',
          permeabilityValue: 14,
          metabolicStability: 't½ 68 min (HLM)',
          metabolicStabilityValue: 68,
          solubility: '48 μg/mL',
          solubilityValue: 48,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 2.9,
          mw: 392,
          psa: 82,
          hbd: 2,
          hba: 5,
        },
      },
      {
        id: 'cmp-d-058',
        seriesId: 'ls-2847-d',
        compoundNumber: 'LIG-2847-058',
        synthesisDate: '2020-05-20',
        status: 'profiling',
        isSelectedCandidate: false,
        isBackupCandidate: true,
        sarNotes: 'Optimised indazole core. Improved potency and metabolic stability. Backup candidate nominee.',
        properties: {
          ic50: '18 nM',
          ic50Value: 18,
          cellPotency: '72 nM (H358)',
          cellPotencyValue: 72,
          selectivity: '>500x vs WT',
          permeability: 'Papp 16 × 10⁻⁶',
          permeabilityValue: 16,
          metabolicStability: 't½ 74 min (HLM)',
          metabolicStabilityValue: 74,
          solubility: '55 μg/mL',
          solubilityValue: 55,
          hergIC50: '>30 μM',
          hergIC50Value: 30,
          clogP: 3.1,
          mw: 418,
          psa: 84,
          hbd: 2,
          hba: 6,
        },
      },
    ],
  },
];

// Candidate Selection Summary
export const candidateSelectionSummary: CandidateSelectionSummary = {
  productId: 'lig-2847',
  selectedCompound: 'LIG-2847-042',
  backupCompound: 'LIG-2847-044',
  selectionDate: '2019-12-15',
  selectionCommittee: [
    'Dr. Sarah Chen (Medical Director)',
    'Dr. James Wilson (Clinical Lead)',
    'Michael Roberts (CMC Lead)',
    'Dr. Tom Anderson (Nonclinical Lead)',
  ],
  keyDifferentiators: [
    'Best-in-class biochemical potency (IC50 2.3 nM)',
    'Clean hERG profile (>30 μM) - no cardiac liability',
    'Suitable for once-daily oral dosing (t½ 45 min HLM)',
    'High selectivity (>1000x vs wild-type KRAS)',
    'Competitive differentiation vs sotorasib (longer target engagement)',
  ],
  risksMitigated: [
    'Metabolic instability (Series A) - resolved via blocking groups',
    'hERG liability (Series B) - avoided with Series C chemotype',
    'CYP inhibition - minimal interaction observed',
  ],
  remainingRisks: [
    'Moderate solubility (125 μg/mL) - requires formulation optimization',
    'Hepatocyte signal in high-dose preclinical - monitor in clinic',
    'Class effect GI tolerability - antiemetic prophylaxis planned',
  ],
  linkedINDStudies: ['gp-prec-001', 'gp-prec-002', 'gp-prec-003'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getLeadSeriesByProduct(productId: string): LeadSeries[] {
  return leadSeries.filter(s => s.productId === productId);
}

export function getLeadSeriesById(seriesId: string): LeadSeries | undefined {
  return leadSeries.find(s => s.id === seriesId);
}

export function getSelectedSeries(productId: string): LeadSeries | undefined {
  return leadSeries.find(s => s.productId === productId && s.status === 'selected');
}

export function getClinicalCandidate(productId: string): LeadCompound | undefined {
  const selected = getSelectedSeries(productId);
  return selected?.compounds.find(c => c.isSelectedCandidate);
}

export function getBackupCandidate(productId: string): LeadCompound | undefined {
  const selected = getSelectedSeries(productId);
  return selected?.compounds.find(c => c.isBackupCandidate);
}

export function getAllCompoundsForProduct(productId: string): LeadCompound[] {
  return leadSeries
    .filter(s => s.productId === productId)
    .flatMap(s => s.compounds);
}

export function getCompoundById(compoundId: string): LeadCompound | undefined {
  for (const series of leadSeries) {
    const compound = series.compounds.find(c => c.id === compoundId);
    if (compound) return compound;
  }
  return undefined;
}

export function getLeadOptStats(productId: string) {
  const series = getLeadSeriesByProduct(productId);
  const allCompounds = getAllCompoundsForProduct(productId);
  const candidate = getClinicalCandidate(productId);
  
  return {
    totalSeries: series.length,
    activeSeries: series.filter(s => s.status === 'active').length,
    selectedSeries: series.filter(s => s.status === 'selected').length,
    deprioritizedSeries: series.filter(s => s.status === 'deprioritized').length,
    totalCompounds: allCompounds.length,
    candidateSelected: !!candidate,
    candidateNumber: candidate?.compoundNumber || 'N/A',
  };
}

// Get compounds sorted by a property
export function getCompoundsSortedBy(
  productId: string, 
  property: keyof CompoundProperties,
  ascending: boolean = true
): LeadCompound[] {
  const compounds = getAllCompoundsForProduct(productId);
  return compounds.sort((a, b) => {
    const aVal = a.properties[property];
    const bVal = b.properties[property];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return ascending ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });
}

// Get series timeline for visualization
export function getSeriesTimeline(productId: string): Array<{
  seriesNumber: string;
  status: SeriesStatus;
  startDate: string;
  endDate?: string;
  compoundCount: number;
}> {
  return getLeadSeriesByProduct(productId)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map(s => ({
      seriesNumber: s.seriesNumber,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      compoundCount: s.compounds.length,
    }));
}
