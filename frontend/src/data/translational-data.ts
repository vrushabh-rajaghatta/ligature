// Translational Science Module Data
// v0.8.2: Bridge preclinical findings to clinical expectations
// "That hepatotoxicity signal? Preclinical predicted it. Here's the translation study."

// ============================================================================
// TYPES
// ============================================================================

export type TranslationalStudyType = 'pk-translation' | 'efficacy-translation' | 'safety-translation' | 'biomarker-validation';
export type TranslationalStatus = 'completed' | 'ongoing' | 'planned';
export type CorrelationStatus = 'confirmed' | 'partial' | 'not-confirmed' | 'pending';
export type BiomarkerValidationStatus = 'discovery' | 'qualified' | 'validated' | 'clinical';
export type BiomarkerType = 'efficacy' | 'safety' | 'pk' | 'pharmacodynamic' | 'predictive' | 'prognostic';

export interface TranslationalStudy {
  id: string;
  productId: string;
  studyNumber: string;
  title: string;
  type: TranslationalStudyType;
  status: TranslationalStatus;
  startDate: string;
  completionDate?: string;
  species: string;
  objective: string;
  methodology: string;
  clinicalRelevance: string;
  keyFindings: TranslationalFinding[];
  conclusions: string;
  recommendations: string[];
  // R&D Connected
  linkedPreclinicalStudies: string[];
  linkedClinicalStudies: string[];
  linkedSafetySignals: string[];
  linkedProtocolSections: string[];
}

export interface TranslationalFinding {
  id: string;
  parameter: string;
  preclinicalValue: string;
  preclinicalSpecies: string;
  humanPrediction: string;
  predictionMethod: string;
  actualClinical?: string;
  correlation: CorrelationStatus;
  implication: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface BiomarkerPanel {
  id: string;
  productId: string;
  name: string;
  purpose: string;
  targetPopulation: string;
  validationStatus: BiomarkerValidationStatus;
  markers: Biomarker[];
  linkedClinicalProtocol?: string;
  linkedAssayValidation?: string;
  regulatoryStrategy: string;
}

export interface Biomarker {
  id: string;
  name: string;
  type: BiomarkerType;
  matrix: string;
  method: string;
  threshold?: string;
  clinicalUtility: string;
  validationStatus: BiomarkerValidationStatus;
  supportingData: string;
}

export interface PKTranslationSummary {
  productId: string;
  species: string[];
  keyParameters: PKParameter[];
  allometricScaling: string;
  humanPKPrediction: PKPrediction;
  clinicalPKObserved?: PKPrediction;
  overallCorrelation: CorrelationStatus;
}

export interface PKParameter {
  parameter: string;
  unit: string;
  rat: string;
  dog: string;
  humanPredicted: string;
  humanObserved?: string;
  correlation: CorrelationStatus;
}

export interface PKPrediction {
  cmax: string;
  tmax: string;
  auc: string;
  halfLife: string;
  clearance: string;
  vd: string;
  bioavailability: string;
}

export interface SafetyTranslation {
  id: string;
  productId: string;
  organ: string;
  preclinicalFinding: string;
  preclinicalSpecies: string;
  preclinicalDose: string;
  preclinicalExposure: string;
  humanRelevance: 'likely' | 'possible' | 'unlikely';
  humanRelevanceRationale: string;
  clinicalMonitoring: string[];
  monitoringFrequency: string;
  stoppingRules?: string;
  clinicalObservation?: string;
  predictionAccuracy?: CorrelationStatus;
  // R&D Connected
  linkedPreclinicalStudy: string;
  linkedSafetySignal?: string;
  linkedProtocolSection?: string;
}

// ============================================================================
// NEXAVANT (LIG-2847) TRANSLATIONAL DATA
// ============================================================================

export const translationalStudies: TranslationalStudy[] = [
  // PK Translation Study
  {
    id: 'tr-2847-001',
    productId: 'lig-2847',
    studyNumber: 'TR-2847-001',
    title: 'Pharmacokinetic Translation and Human Dose Prediction',
    type: 'pk-translation',
    status: 'completed',
    startDate: '2020-08-01',
    completionDate: '2020-10-15',
    species: 'Rat, Dog → Human',
    objective: 'Predict human PK parameters using allometric scaling and physiologically-based PK modeling to support FIH dose selection.',
    methodology: 'Single-species scaling from rat and dog, multi-species allometric scaling, and PBPK modeling using GastroPlus.',
    clinicalRelevance: 'Predictions used to establish starting dose (50 mg) and target therapeutic dose range (150-300 mg) for Phase 1.',
    keyFindings: [
      {
        id: 'tr-001-f1',
        parameter: 'Half-life',
        preclinicalValue: '4.2 h (rat), 6.8 h (dog)',
        preclinicalSpecies: 'Rat, Dog',
        humanPrediction: '8-12 hours',
        predictionMethod: 'Allometric scaling with correction for species differences in protein binding',
        actualClinical: '11 hours',
        correlation: 'confirmed',
        implication: 'Supports once-daily dosing regimen',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-001-f2',
        parameter: 'Oral Bioavailability',
        preclinicalValue: '45% (rat), 62% (dog)',
        preclinicalSpecies: 'Rat, Dog',
        humanPrediction: '55-70%',
        predictionMethod: 'PBPK modeling with human intestinal permeability and hepatic extraction',
        actualClinical: '68%',
        correlation: 'confirmed',
        implication: 'Good oral absorption; no IV formulation needed for clinical development',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-001-f3',
        parameter: 'Clearance',
        preclinicalValue: '15 mL/min/kg (rat), 8 mL/min/kg (dog)',
        preclinicalSpecies: 'Rat, Dog',
        humanPrediction: '5-8 mL/min/kg',
        predictionMethod: 'Allometric scaling',
        actualClinical: '6.2 mL/min/kg',
        correlation: 'confirmed',
        implication: 'Moderate clearance supports QD dosing',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-001-f4',
        parameter: 'Therapeutic Exposure (AUC)',
        preclinicalValue: 'Efficacious AUC: 15,000 ng·h/mL (xenograft)',
        preclinicalSpecies: 'Mouse',
        humanPrediction: 'Target AUC: 12,000-20,000 ng·h/mL at 200 mg QD',
        predictionMethod: 'Efficacy-exposure correlation from xenograft studies scaled to human',
        actualClinical: '16,500 ng·h/mL at 200 mg',
        correlation: 'confirmed',
        implication: '200 mg provides therapeutic exposure with safety margin',
        confidenceLevel: 'high',
      },
    ],
    conclusions: 'Human PK well-predicted by preclinical data. Starting dose of 50 mg provides 10x safety margin relative to NOAEL. Target dose of 200 mg QD achieves therapeutic exposure.',
    recommendations: [
      'Proceed with 50 mg starting dose in FIH study',
      'Target 200 mg QD for efficacy evaluation',
      'No food effect study needed based on BCS Class II classification',
    ],
    linkedPreclinicalStudies: ['gp-prec-001', 'gp-prec-002', 'PK-2847-001', 'PK-2847-002'],
    linkedClinicalStudies: ['NCT05123456'],
    linkedSafetySignals: [],
    linkedProtocolSections: ['dose-escalation', 'pk-sampling'],
  },

  // Efficacy Translation Study
  {
    id: 'tr-2847-002',
    productId: 'lig-2847',
    studyNumber: 'TR-2847-002',
    title: 'Efficacy Translation: Xenograft to Clinical Response',
    type: 'efficacy-translation',
    status: 'completed',
    startDate: '2020-09-01',
    completionDate: '2020-12-01',
    species: 'Mouse (PDX) → Human',
    objective: 'Translate preclinical efficacy signals to predict clinical response rates and exposure-response relationships.',
    methodology: 'Analysis of dose-response across 8 KRAS G12C PDX models; exposure-response modeling; historical comparator analysis.',
    clinicalRelevance: 'Predicted clinical ORR of 35-45% based on preclinical efficacy and competitor clinical data.',
    keyFindings: [
      {
        id: 'tr-002-f1',
        parameter: 'Overall Response Rate',
        preclinicalValue: '75% response rate in PDX (>50% tumor regression)',
        preclinicalSpecies: 'Mouse PDX',
        humanPrediction: '35-45% ORR',
        predictionMethod: 'Historical translation factor (0.5x) applied to PDX response rate',
        actualClinical: '42% ORR (Phase 2)',
        correlation: 'confirmed',
        implication: 'Prediction accuracy supports development strategy',
        confidenceLevel: 'medium',
      },
      {
        id: 'tr-002-f2',
        parameter: 'Target Engagement (pERK reduction)',
        preclinicalValue: '>90% pERK reduction at efficacious dose',
        preclinicalSpecies: 'Mouse',
        humanPrediction: '>80% pERK reduction at therapeutic dose',
        predictionMethod: 'PK-PD modeling',
        actualClinical: '85% mean pERK reduction',
        correlation: 'confirmed',
        implication: 'PD biomarker confirms mechanism engagement',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-002-f3',
        parameter: 'Duration of Response',
        preclinicalValue: 'Sustained regression through 28-day treatment',
        preclinicalSpecies: 'Mouse PDX',
        humanPrediction: 'Median DOR 6-10 months (based on competitor data)',
        predictionMethod: 'Class-based historical analysis',
        actualClinical: 'Median DOR 9.2 months',
        correlation: 'confirmed',
        implication: 'Durable responses comparable to class',
        confidenceLevel: 'medium',
      },
    ],
    conclusions: 'Preclinical efficacy translated well to clinical outcomes. Response rate and durability consistent with KRAS G12C inhibitor class. PD biomarker confirms mechanism.',
    recommendations: [
      'Use pERK as pharmacodynamic endpoint in expansion cohorts',
      'ctDNA monitoring may predict response',
      'Consider combination strategies to improve durability',
    ],
    linkedPreclinicalStudies: ['gp-tv-002', 'PHARM-2847-001'],
    linkedClinicalStudies: ['NCT05123456', 'NCT05234567'],
    linkedSafetySignals: [],
    linkedProtocolSections: ['efficacy-endpoints', 'biomarker-assessments'],
  },

  // Safety Translation Study - THE KEY HEPATOTOXICITY PREDICTION
  {
    id: 'tr-2847-003',
    productId: 'lig-2847',
    studyNumber: 'TR-2847-003',
    title: 'Safety Translation: Hepatotoxicity Risk Assessment',
    type: 'safety-translation',
    status: 'completed',
    startDate: '2020-10-01',
    completionDate: '2021-01-15',
    species: 'Rat, Dog → Human',
    objective: 'Assess human hepatotoxicity risk based on preclinical findings and establish clinical monitoring strategy.',
    methodology: 'Analysis of ALT/AST elevations in repeat-dose tox studies; exposure-response for hepatic effects; cross-species scaling of safety margins.',
    clinicalRelevance: 'CRITICAL: Predicted hepatotoxicity risk in humans requiring q2w LFT monitoring. This prediction was confirmed in clinical studies.',
    keyFindings: [
      {
        id: 'tr-003-f1',
        parameter: 'ALT Elevation',
        preclinicalValue: '3-5x ULN at 150 mg/kg (3x clinical exposure)',
        preclinicalSpecies: 'Dog',
        humanPrediction: 'Grade 1-2 ALT elevation expected in 10-15% of patients',
        predictionMethod: 'Exposure-response analysis with species scaling factor',
        actualClinical: 'Grade 1-2 ALT elevation in 12% of patients',
        correlation: 'confirmed',
        implication: 'Prediction accurate; monitoring strategy validated',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-003-f2',
        parameter: 'Reversibility',
        preclinicalValue: 'Full reversibility within 4 weeks of dose cessation',
        preclinicalSpecies: 'Dog',
        humanPrediction: 'Reversible with dose modification or interruption',
        predictionMethod: 'Histopathology correlation and recovery data',
        actualClinical: 'All cases resolved with dose modification',
        correlation: 'confirmed',
        implication: 'Manageable toxicity with appropriate monitoring',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-003-f3',
        parameter: 'Mechanism',
        preclinicalValue: 'Hepatocyte hypertrophy (adaptive response), not necrosis',
        preclinicalSpecies: 'Rat, Dog',
        humanPrediction: 'On-target effect; not idiosyncratic hepatotoxicity',
        predictionMethod: 'Mechanism-based analysis of histopathology',
        actualClinical: 'Pattern consistent with on-target effect',
        correlation: 'confirmed',
        implication: 'Predictable, dose-dependent; not idiosyncratic',
        confidenceLevel: 'high',
      },
      {
        id: 'tr-003-f4',
        parameter: 'Safety Margin',
        preclinicalValue: 'NOAEL provides 2.5x margin at 200 mg clinical dose',
        preclinicalSpecies: 'Dog',
        humanPrediction: 'Adequate safety margin for chronic dosing',
        predictionMethod: 'AUC-based safety margin calculation',
        actualClinical: 'Safety margin confirmed adequate',
        correlation: 'confirmed',
        implication: 'Supports long-term dosing at 200 mg QD',
        confidenceLevel: 'high',
      },
    ],
    conclusions: 'Hepatotoxicity risk was accurately predicted from preclinical studies. The monitoring strategy (q2w LFT for first 3 months) effectively identifies cases early, allowing intervention before progression. All cases were reversible.',
    recommendations: [
      'Implement q2w LFT monitoring for first 12 weeks',
      'Monthly LFT thereafter',
      'Dose reduction algorithm for Grade 2+ elevations',
      'Include hepatotoxicity management in prescribing information',
    ],
    linkedPreclinicalStudies: ['gp-prec-001', 'gp-prec-002', 'TOX-2847-002'],
    linkedClinicalStudies: ['NCT05123456', 'NCT05234567', 'NCT05345678'],
    linkedSafetySignals: ['sig-001'],
    linkedProtocolSections: ['safety-monitoring', 'dose-modification', 'stopping-rules'],
  },
];

// Biomarker Panels
export const biomarkerPanels: BiomarkerPanel[] = [
  {
    id: 'bm-panel-2847',
    productId: 'lig-2847',
    name: 'Nexavant Biomarker Panel',
    purpose: 'Patient selection, response prediction, and pharmacodynamic monitoring',
    targetPopulation: 'KRAS G12C+ NSCLC patients',
    validationStatus: 'validated',
    regulatoryStrategy: 'Companion diagnostic for KRAS G12C mutation; exploratory for PD and response biomarkers',
    linkedClinicalProtocol: 'NCT05345678',
    linkedAssayValidation: 'AVR-2847-001',
    markers: [
      {
        id: 'bm-001',
        name: 'KRAS G12C Mutation',
        type: 'predictive',
        matrix: 'Tumor tissue',
        method: 'PCR-based companion diagnostic (FDA-approved)',
        threshold: 'Mutation detected',
        clinicalUtility: 'Patient selection - required for treatment eligibility',
        validationStatus: 'validated',
        supportingData: 'Clinical correlation in Phase 2/3 studies',
      },
      {
        id: 'bm-002',
        name: 'ctDNA KRAS G12C',
        type: 'predictive',
        matrix: 'Plasma',
        method: 'Digital PCR',
        threshold: 'VAF > 0.1%',
        clinicalUtility: 'Response monitoring; early progression detection',
        validationStatus: 'qualified',
        supportingData: 'Correlation with radiographic response in Phase 2',
      },
      {
        id: 'bm-003',
        name: 'pERK Reduction',
        type: 'pharmacodynamic',
        matrix: 'Tumor biopsy (paired)',
        method: 'IHC',
        threshold: '>50% reduction from baseline',
        clinicalUtility: 'Confirm mechanism engagement; correlates with response',
        validationStatus: 'qualified',
        supportingData: 'PK-PD modeling and clinical correlation',
      },
      {
        id: 'bm-004',
        name: 'Baseline Tumor Burden',
        type: 'prognostic',
        matrix: 'Imaging (CT)',
        method: 'RECIST 1.1 sum of target lesions',
        threshold: 'Continuous variable',
        clinicalUtility: 'Prognostic for PFS; lower burden = better outcomes',
        validationStatus: 'validated',
        supportingData: 'Multivariate analysis from Phase 3',
      },
      {
        id: 'bm-005',
        name: 'STK11 Mutation Status',
        type: 'predictive',
        matrix: 'Tumor tissue',
        method: 'NGS panel',
        threshold: 'Mutation detected',
        clinicalUtility: 'May identify patients with reduced response',
        validationStatus: 'discovery',
        supportingData: 'Exploratory analysis suggests lower response rate',
      },
    ],
  },
];

// PK Translation Summary
export const pkTranslationSummary: PKTranslationSummary = {
  productId: 'lig-2847',
  species: ['Rat', 'Dog'],
  keyParameters: [
    {
      parameter: 'Cmax',
      unit: 'ng/mL',
      rat: '2,450',
      dog: '3,200',
      humanPredicted: '1,800-2,500',
      humanObserved: '2,150',
      correlation: 'confirmed',
    },
    {
      parameter: 'Tmax',
      unit: 'h',
      rat: '1.5',
      dog: '2.0',
      humanPredicted: '2-4',
      humanObserved: '3.0',
      correlation: 'confirmed',
    },
    {
      parameter: 'AUC0-24',
      unit: 'ng·h/mL',
      rat: '12,000',
      dog: '18,500',
      humanPredicted: '14,000-18,000',
      humanObserved: '16,500',
      correlation: 'confirmed',
    },
    {
      parameter: 't½',
      unit: 'h',
      rat: '4.2',
      dog: '6.8',
      humanPredicted: '8-12',
      humanObserved: '11',
      correlation: 'confirmed',
    },
    {
      parameter: 'CL/F',
      unit: 'mL/min/kg',
      rat: '15',
      dog: '8',
      humanPredicted: '5-8',
      humanObserved: '6.2',
      correlation: 'confirmed',
    },
    {
      parameter: 'F',
      unit: '%',
      rat: '45',
      dog: '62',
      humanPredicted: '55-70',
      humanObserved: '68',
      correlation: 'confirmed',
    },
  ],
  allometricScaling: 'Single-species scaling with fu correction; validated by PBPK',
  humanPKPrediction: {
    cmax: '1,800-2,500 ng/mL',
    tmax: '2-4 h',
    auc: '14,000-18,000 ng·h/mL',
    halfLife: '8-12 h',
    clearance: '5-8 mL/min/kg',
    vd: '2-3 L/kg',
    bioavailability: '55-70%',
  },
  clinicalPKObserved: {
    cmax: '2,150 ng/mL',
    tmax: '3.0 h',
    auc: '16,500 ng·h/mL',
    halfLife: '11 h',
    clearance: '6.2 mL/min/kg',
    vd: '2.4 L/kg',
    bioavailability: '68%',
  },
  overallCorrelation: 'confirmed',
};

// Safety Translations
export const safetyTranslations: SafetyTranslation[] = [
  {
    id: 'st-2847-001',
    productId: 'lig-2847',
    organ: 'Liver',
    preclinicalFinding: 'ALT elevation with hepatocyte hypertrophy',
    preclinicalSpecies: 'Dog',
    preclinicalDose: '150 mg/kg/day',
    preclinicalExposure: '3x clinical AUC at 200 mg',
    humanRelevance: 'likely',
    humanRelevanceRationale: 'On-target mechanism; observed in most sensitive species; exposure-dependent',
    clinicalMonitoring: [
      'LFT panel (ALT, AST, ALP, bilirubin)',
      'Baseline and q2w for 12 weeks',
      'Monthly thereafter',
    ],
    monitoringFrequency: 'Every 2 weeks for first 12 weeks, then monthly',
    stoppingRules: 'Hold for Grade 3; discontinue for Grade 4 or recurrent Grade 3',
    clinicalObservation: 'Grade 1-2 ALT elevation in 12% of patients; all cases reversible',
    predictionAccuracy: 'confirmed',
    linkedPreclinicalStudy: 'gp-prec-002',
    linkedSafetySignal: 'sig-001',
    linkedProtocolSection: 'safety-monitoring-hepatic',
  },
  {
    id: 'st-2847-002',
    productId: 'lig-2847',
    organ: 'Gastrointestinal',
    preclinicalFinding: 'Emesis, decreased food consumption',
    preclinicalSpecies: 'Dog',
    preclinicalDose: 'All doses (≥30 mg/kg)',
    preclinicalExposure: 'All exposure levels',
    humanRelevance: 'likely',
    humanRelevanceRationale: 'Class effect for KRAS inhibitors; GI tract is proliferating tissue',
    clinicalMonitoring: [
      'Patient-reported GI symptoms',
      'Antiemetic prophylaxis per protocol',
    ],
    monitoringFrequency: 'Each study visit',
    stoppingRules: 'Dose modify for Grade 2+; consider PPI for dyspepsia',
    clinicalObservation: 'Nausea in 35%, diarrhea in 28%; generally Grade 1-2',
    predictionAccuracy: 'confirmed',
    linkedPreclinicalStudy: 'gp-prec-002',
    linkedSafetySignal: undefined,
    linkedProtocolSection: 'safety-monitoring-gi',
  },
  {
    id: 'st-2847-003',
    productId: 'lig-2847',
    organ: 'Cardiac',
    preclinicalFinding: 'No QTc prolongation; clean hERG (>30 μM)',
    preclinicalSpecies: 'Dog',
    preclinicalDose: 'Up to 150 mg/kg',
    preclinicalExposure: '3x clinical AUC',
    humanRelevance: 'unlikely',
    humanRelevanceRationale: 'Clean hERG, no QTc signal in dedicated safety pharmacology study',
    clinicalMonitoring: [
      'ECG at baseline',
      'ECG monitoring in dose escalation only',
    ],
    monitoringFrequency: 'Baseline; dose escalation visits only',
    clinicalObservation: 'No QTc prolongation observed; no cardiac events',
    predictionAccuracy: 'confirmed',
    linkedPreclinicalStudy: 'SAFEPHARM-2847-001',
    linkedSafetySignal: undefined,
    linkedProtocolSection: 'safety-monitoring-cardiac',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTranslationalStudiesByProduct(productId: string): TranslationalStudy[] {
  return translationalStudies.filter(s => s.productId === productId);
}

export function getTranslationalStudyById(studyId: string): TranslationalStudy | undefined {
  return translationalStudies.find(s => s.id === studyId);
}

export function getTranslationalStudiesByType(productId: string, type: TranslationalStudyType): TranslationalStudy[] {
  return translationalStudies.filter(s => s.productId === productId && s.type === type);
}

export function getBiomarkerPanelByProduct(productId: string): BiomarkerPanel | undefined {
  return biomarkerPanels.find(p => p.productId === productId);
}

export function getSafetyTranslationsByProduct(productId: string): SafetyTranslation[] {
  return safetyTranslations.filter(s => s.productId === productId);
}

export function getSafetyTranslationByOrgan(productId: string, organ: string): SafetyTranslation | undefined {
  return safetyTranslations.find(s => s.productId === productId && s.organ.toLowerCase() === organ.toLowerCase());
}

export function getConfirmedPredictions(productId: string): TranslationalFinding[] {
  return translationalStudies
    .filter(s => s.productId === productId)
    .flatMap(s => s.keyFindings)
    .filter(f => f.correlation === 'confirmed');
}

export function getPKTranslationSummaryByProduct(productId: string): PKTranslationSummary | undefined {
  return pkTranslationSummary.productId === productId ? pkTranslationSummary : undefined;
}

export function getTranslationalStats(productId: string) {
  const studies = getTranslationalStudiesByProduct(productId);
  const allFindings = studies.flatMap(s => s.keyFindings);
  const safetyTrans = getSafetyTranslationsByProduct(productId);
  const biomarkers = getBiomarkerPanelByProduct(productId);
  
  return {
    totalStudies: studies.length,
    completedStudies: studies.filter(s => s.status === 'completed').length,
    totalFindings: allFindings.length,
    confirmedPredictions: allFindings.filter(f => f.correlation === 'confirmed').length,
    partialPredictions: allFindings.filter(f => f.correlation === 'partial').length,
    pendingPredictions: allFindings.filter(f => f.correlation === 'pending').length,
    safetyTranslations: safetyTrans.length,
    confirmedSafetyPredictions: safetyTrans.filter(s => s.predictionAccuracy === 'confirmed').length,
    totalBiomarkers: biomarkers?.markers.length || 0,
    validatedBiomarkers: biomarkers?.markers.filter(m => m.validationStatus === 'validated').length || 0,
    predictionAccuracy: allFindings.length > 0 
      ? Math.round((allFindings.filter(f => f.correlation === 'confirmed').length / allFindings.filter(f => f.correlation !== 'pending').length) * 100)
      : 0,
  };
}

// Get studies linked to a safety signal
export function getTranslationalStudiesForSafetySignal(signalId: string): TranslationalStudy[] {
  return translationalStudies.filter(s => s.linkedSafetySignals.includes(signalId));
}

// Get the safety translation that predicted a given signal
export function getSafetyTranslationForSignal(signalId: string): SafetyTranslation | undefined {
  return safetyTranslations.find(s => s.linkedSafetySignal === signalId);
}
