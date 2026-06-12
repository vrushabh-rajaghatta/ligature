

// v0.13.87: Electronic Lab Notebook Store with Cross-Module Integration
import { create } from 'zustand';
import {
  ELNExperiment,
  ELNNotebook,
  ELNTemplate,
  ELNDashboardMetrics,
  ELNActivityEntry,
  ExperimentStatus,
  ExperimentType,
  ELNInstrument,
  ELNDataEntry,
  ELNDataCaptureForm,
  DataEntryType,
  // v0.13.87: Cross-module link types
  ELNToCTMSLink,
  ELNToTMFLink,
  ELNToSafetyLink,
  LinkableCTMSRecord,
  LinkableTMFArtifact,
  LinkableSafetyReport,
} from './elnTypes';

// Mock data
const mockNotebooks: ELNNotebook[] = [
  {
    id: 'nb-001',
    name: 'LIG-2024-Synthesis',
    description: 'Primary synthesis notebook for LIG-2024 compound development',
    projectId: 'proj-001',
    projectName: 'LIG-2024 Program',
    ownerId: 'user-001',
    ownerName: 'Dr. Sarah Chen',
    createdAt: '2024-08-15T10:00:00Z',
    experimentCount: 24,
    status: 'active',
  },
  {
    id: 'nb-002',
    name: 'LIG-2024-Formulation',
    description: 'Formulation development studies for LIG-2024',
    projectId: 'proj-001',
    projectName: 'LIG-2024 Program',
    ownerId: 'user-002',
    ownerName: 'Dr. Michael Torres',
    createdAt: '2024-09-01T08:30:00Z',
    experimentCount: 18,
    status: 'active',
  },
  {
    id: 'nb-003',
    name: 'LIG-2025-Discovery',
    description: 'Early discovery experiments for LIG-2025 pipeline candidate',
    projectId: 'proj-002',
    projectName: 'LIG-2025 Program',
    ownerId: 'user-003',
    ownerName: 'Dr. Emily Rodriguez',
    createdAt: '2024-10-10T14:00:00Z',
    experimentCount: 12,
    status: 'active',
  },
  {
    id: 'nb-tox-001',
    title: 'LIG-2847 IND-Enabling Nonclinical Studies (GLP)',
    description: 'GLP-compliant nonclinical safety studies supporting IND filing for LIG-2847 (Nexavant). Includes repeat-dose toxicology (rat, dog), safety pharmacology core battery, PK/mass balance, and genotoxicity battery. All studies conducted per ICH M3(R2), 21 CFR Part 58.',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    status: 'active' as const,
    author: 'Dr. Sarah Mitchell',
    authorId: 'user-sd-001',
    collaborators: ['Dr. Rachel Chen', 'Dr. Oliver Bennett', 'Dr. Monica Lefevre (QA)'],
    createdAt: '2022-06-01T07:00:00Z',
    modifiedAt: '2023-09-12T16:00:00Z',
    experimentCount: 6,
    tags: ['GLP', 'IND-enabling', 'toxicology', 'safety-pharmacology', 'LIG-2847', 'ICH-M3'],
  },
];

const mockExperiments: ELNExperiment[] = [
  // ── EXP-001: In Vitro hERG Safety (LIG-2847) ─────────────────────────
  {
    id: 'exp-001',
    notebookId: 'nb-001',
    title: 'LIG-2847 hERG Channel Inhibition — Manual Patch Clamp (ICH S7B)',
    type: 'assay',
    status: 'approved',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'PHARM-2847-001',
    studyName: 'Safety Pharmacology Core Battery',
    author: 'Dr. Rachel Chen',
    authorId: 'user-rchen',
    collaborators: ['Dr. Oliver Bennett', 'Mark Osei'],
    createdAt: '2022-10-15T08:00:00Z',
    modifiedAt: '2022-10-28T17:30:00Z',
    startDate: '2022-10-15',
    completionDate: '2022-10-20',
    objective: 'Determine IC₅₀ for hERG potassium channel inhibition by LIG-2847 using manual whole-cell patch clamp in CHO-K1 cells stably expressing hERG. Study required per ICH S7B prior to first clinical dose.',
    hypothesis: 'LIG-2847 hERG IC₅₀ will exceed 30× free clinical Cmax based on structural analysis and preliminary computational prediction (IC₅₀ estimated 5–15 μM).',
    materials: [
      { id: 'mat-001', name: 'LIG-2847 API Lot', catalogNumber: 'LIG2847-API-003', lotNumber: 'API-2022-047', vendor: 'Internal — CMC', quantity: '25', unit: 'mg', sampleId: 'samp-api-047' },
      { id: 'mat-002', name: 'CHO-K1 hERG Stable Cell Line', catalogNumber: 'CL-HERG-CHO-001', lotNumber: 'CL-2022-003', vendor: 'Eurofins CDMO', quantity: 'P8 passage', unit: 'vial' },
      { id: 'mat-003', name: 'Extracellular Solution (Tyrode\'s)', catalogNumber: 'SOL-TYR-001', lotNumber: 'L20221010', vendor: 'In-house', quantity: '500', unit: 'mL' },
      { id: 'mat-004', name: 'DMSO (vehicle)', catalogNumber: 'DMSO-HPLC', lotNumber: 'L20221001', vendor: 'Sigma-Aldrich', quantity: '10', unit: 'mL' },
      { id: 'mat-005', name: 'Cisapride (positive control)', catalogNumber: 'CIS-REF-001', lotNumber: 'REF-2022-009', vendor: 'Sigma-Aldrich', quantity: '5', unit: 'mg' },
    ],
    procedures: [
      { id: 'step-001', stepNumber: 1, description: 'Prepare LIG-2847 stock solution at 10 mM in DMSO. Dilute to 0.001, 0.01, 0.1, 1, 3, 10, 30 μM in Tyrode\'s. Final DMSO ≤0.3%. Prepare cisapride positive control at 0.1 μM.', duration: '45 min', equipment: ['Hamilton diluter', 'Analytical balance'], completedAt: '2022-10-15T09:45:00Z', completedBy: 'Mark Osei', notes: 'All dilutions prepared fresh day of experiment. Vehicle control: 0.3% DMSO.' },
      { id: 'step-002', stepNumber: 2, description: 'Establish whole-cell patch clamp configuration on CHO-K1 hERG cells. Voltage protocol: holding potential −80 mV; depolarising step to +20 mV (2 s); repolarising step to −40 mV (2 s) to activate tail current. Record tail current amplitude as hERG surrogate endpoint.', duration: '2 hr', equipment: ['Axon Axopatch 200B amplifier', 'Digidata 1550B', 'Sutter MP-285 micromanipulator', 'Olympus IX73 microscope'], completedAt: '2022-10-16T11:00:00Z', completedBy: 'Dr. Rachel Chen', notes: 'Seal resistance >1 GΩ required. Access resistance <15 MΩ required. Temperature: 22 ± 1°C.' },
      { id: 'step-003', stepNumber: 3, description: 'Apply vehicle control for 3 min to establish stable baseline tail current. Apply each LIG-2847 concentration for minimum 3 min or until steady-state inhibition. Wash with Tyrode\'s between concentrations.', duration: '4 hr', equipment: ['Axon Axopatch 200B amplifier', 'Gravity perfusion system'], completedAt: '2022-10-17T15:30:00Z', completedBy: 'Dr. Rachel Chen', notes: 'n=3 cells per concentration. Accept only cells with <10% rundown during baseline.' },
      { id: 'step-004', stepNumber: 4, description: 'Apply cisapride positive control (0.1 μM). Confirm ≥70% inhibition to validate assay sensitivity. Calculate % inhibition = (1 − I_drug/I_baseline) × 100 for each concentration.', duration: '1 hr', equipment: ['Axon Axopatch 200B amplifier'], completedAt: '2022-10-18T10:00:00Z', completedBy: 'Dr. Rachel Chen' },
      { id: 'step-005', stepNumber: 5, description: 'Fit concentration–inhibition data to Hill equation: % inhibition = 100 / (1 + (IC₅₀/[C])^n). Report IC₅₀ ± 95% CI and Hill coefficient (n). Calculate safety margin: IC₅₀ / free clinical Cmax (estimated 0.82 μM).', duration: '2 hr', equipment: ['GraphPad Prism 10'], completedAt: '2022-10-20T14:00:00Z', completedBy: 'Dr. Rachel Chen', notes: 'Weighted nonlinear least squares fitting. R² ≥0.98 required.' },
    ],
    observations: 'Vehicle control (0.3% DMSO): no effect on tail current amplitude vs. pre-vehicle baseline (−0.9 ± 2.1%). Cisapride positive control (0.1 μM): 83.4 ± 4.2% inhibition — assay validated. LIG-2847 concentration-dependent inhibition observed across 0.1–30 μM range. No physical precipitation observed at any test concentration. All seals maintained >1 GΩ. Mean access resistance 8.4 ± 2.1 MΩ.',
    results: 'LIG-2847 hERG IC₅₀ = 8.4 μM (95% CI: 6.9–10.2 μM). Hill coefficient n = 1.12. Safety margin = IC₅₀ / free Cmax = 8.4 / 0.082 = 102×. % inhibition by concentration: 0.001 μM: 0.4%; 0.01 μM: 1.2%; 0.1 μM: 4.8%; 1 μM: 28.3%; 3 μM: 51.7%; 10 μM: 79.4%; 30 μM: 94.1%. Nav1.5 IC₅₀ >100 μM (no significant inhibition). Cav1.2 IC₅₀ >100 μM (no significant inhibition).',
    conclusions: 'LIG-2847 demonstrates concentration-dependent hERG inhibition with IC₅₀ = 8.4 μM. Safety margin of 102× free clinical Cmax is acceptable per ICH S7B framework. Cardiac telemetry in the 13-week dog study is mandated as in vivo follow-up per ICH E14/S7B integrated risk assessment. Data sufficient for inclusion in nonclinical safety pharmacology section of IND (Module 4.2.1).',
    attachments: [
      { id: 'att-001', name: 'Raw Patch Clamp Traces — LIG-2847 10 μM', type: 'application/axon', size: 4250000, uploadedAt: '2022-10-17T16:00:00Z', uploadedBy: 'Dr. Rachel Chen', url: '/eln/exp-001/raw-traces-10uM.abf' },
      { id: 'att-002', name: 'Concentration-Inhibition Curve (GraphPad)', type: 'application/pdf', size: 890000, uploadedAt: '2022-10-20T15:00:00Z', uploadedBy: 'Dr. Rachel Chen', url: '/eln/exp-001/hERG-curve-LIG2847.pdf' },
      { id: 'att-003', name: 'Positive Control Validation Data', type: 'application/pdf', size: 340000, uploadedAt: '2022-10-18T11:00:00Z', uploadedBy: 'Dr. Rachel Chen', url: '/eln/exp-001/cisapride-validation.pdf' },
    ],
    dataFiles: [
      { id: 'df-001', name: 'Axopatch Raw Data — All Concentrations', instrument: 'Axon Axopatch 200B', format: 'abf', size: 28500000, uploadedAt: '2022-10-17T16:00:00Z', dataPoints: 1440 },
      { id: 'df-002', name: 'Summary Analysis — GraphPad Prism', instrument: 'GraphPad Prism 10', format: 'pzfx', size: 450000, uploadedAt: '2022-10-20T14:30:00Z', dataPoints: 21 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Rachel Chen',
    signedAt: '2022-10-21T10:30:00Z',
    witnessedBy: 'Dr. Oliver Bennett',
    witnessedAt: '2022-10-22T09:00:00Z',
    linkedSamples: ['samp-api-047', 'samp-cl-herg-003'],
    linkedDocuments: ['doc-pharm-2847-001-FINAL'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-pharm-001'],
    tags: ['hERG', 'safety-pharmacology', 'patch-clamp', 'ICH-S7B', 'LIG-2847', 'IND-enabling'],
    keywords: ['hERG IC50', 'cardiac safety', 'patch clamp', 'CHO-K1', 'cisapride', 'tail current'],
  },

  // ── EXP-002: 4-Week Rat Tox — Group 3 Clinical Pathology Sampling ─────
  {
    id: 'exp-002',
    notebookId: 'nb-001',
    title: 'TOX-2847-002 — Week 4 Terminal Sacrifice: Clinical Pathology & Organ Weights',
    type: 'animal-study',
    status: 'approved',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'TOX-2847-002',
    studyName: '4-Week Repeat-Dose Toxicology (GLP) — Sprague-Dawley Rat',
    author: 'Dr. Sarah Mitchell',
    authorId: 'user-smitchell',
    collaborators: ['James Okafor (QA)', 'Dr. Anne Rutherford'],
    createdAt: '2023-06-19T06:30:00Z',
    modifiedAt: '2023-06-22T18:45:00Z',
    startDate: '2023-06-19',
    completionDate: '2023-06-22',
    objective: 'Terminal sacrifice and collection of clinical pathology, organ weight, and necropsy data for all groups at study Week 4 of TOX-2847-002. Data will populate Module 4.2.3 of the IND. GLP study — all data entries are original electronic records per 21 CFR Part 11.',
    hypothesis: null,
    materials: [
      { id: 'mat-101', name: 'LIG-2847 Oral Gavage Formulation — 100 mg/kg/day (Group 3)', catalogNumber: 'FORM-2847-G3', lotNumber: 'FORM-2023-031', vendor: 'Internal — Formulation', quantity: '50', unit: 'mL', sampleId: 'samp-form-g3-wk4' },
      { id: 'mat-102', name: 'Vehicle Control Formulation — 0.5% CMC (Group 1)', catalogNumber: 'FORM-VEH-001', lotNumber: 'FORM-2023-028', vendor: 'Internal — Formulation', quantity: '50', unit: 'mL' },
      { id: 'mat-103', name: 'EDTA tubes (K₂EDTA 1.8 mg/mL)', catalogNumber: 'BD-365974', lotNumber: 'BD-2023-041', vendor: 'BD Vacutainer', quantity: '200', unit: 'tubes' },
      { id: 'mat-104', name: 'Lithium heparin tubes', catalogNumber: 'BD-367960', lotNumber: 'BD-2023-039', vendor: 'BD Vacutainer', quantity: '200', unit: 'tubes' },
      { id: 'mat-105', name: '10% Neutral buffered formalin', catalogNumber: 'NBF-4L-001', lotNumber: 'NBF-2023-006', vendor: 'Leica Biosystems', quantity: '4', unit: 'L' },
    ],
    procedures: [
      { id: 'step-101', stepNumber: 1, description: 'Pre-weigh all animals. Record individual body weights to 0.1 g precision. Flag any animal with >15% BW loss for veterinary review before proceeding.', duration: '30 min', equipment: ['Mettler Toledo PB5001-S balance', 'PrecisionWeigh software'], completedAt: '2023-06-19T07:00:00Z', completedBy: 'Dr. Sarah Mitchell', notes: 'All weights within acceptable range. No animals flagged.' },
      { id: 'step-102', stepNumber: 2, description: 'Anaesthetise by isoflurane inhalation (4% induction, 2% maintenance). Confirm depth of anaesthesia by toe-pinch reflex. Collect ~4 mL blood by cardiac puncture into EDTA and heparin tubes. Label immediately with animal ID, date, time, and collector initials per ALCOA+.', duration: '3 hr', equipment: ['SomnoFlo isoflurane system', 'Butterfly needle 23G', 'BD Vacutainer holder'], completedAt: '2023-06-19T11:00:00Z', completedBy: 'Dr. Sarah Mitchell', notes: 'n=10 M + 10 F per group. Haematology: EDTA tube. Clinical chemistry: heparin tube. Tubes inverted ×8 immediately after collection.' },
      { id: 'step-103', stepNumber: 3, description: 'Perform complete necropsy per protocol SOPs. Weigh target organs: liver, kidneys (L+R), adrenals (L+R), spleen, thymus, heart, lungs, brain, testes/ovaries. Record to 0.001 g. Calculate organ:body weight ratios.', duration: '4 hr', equipment: ['Sartorius Practum 224-1S balance', 'Dissection instruments (autoclaved set per animal)'], completedAt: '2023-06-19T16:00:00Z', completedBy: 'Dr. Anne Rutherford' },
      { id: 'step-104', stepNumber: 4, description: 'Fix tissues in 10% NBF for ≥24 h. Target organs per protocol: liver (3 sections), kidneys, heart, lung (all lobes), brain, spinal cord, thymus, spleen, adrenals, gonads, bone marrow (femur), GI tract, skin. Label cassettes with Study No., Animal ID, Group, Tissue.', duration: '2 hr', equipment: ['Tissue cassettes', 'NBF fixative'], completedAt: '2023-06-20T09:00:00Z', completedBy: 'James Okafor (QA)' },
      { id: 'step-105', stepNumber: 5, description: 'Submit EDTA blood to in-house haematology analyser (Sysmex XN-1000). Submit heparin plasma to clinical chemistry analyser (Roche Cobas c502). Report 19-parameter haematology and 20-parameter clinical chemistry panels per protocol.', duration: '6 hr', equipment: ['Sysmex XN-1000', 'Roche Cobas c502'], completedAt: '2023-06-20T17:00:00Z', completedBy: 'Dr. Anne Rutherford', notes: 'Samples processed within 2 h of collection. QC pools run at start and end of each analytical session.' },
    ],
    observations: 'All necropsies completed within 4 h of euthanasia. Group 3 males (300 mg/kg/day): liver enlargement macroscopically evident in 7/10 animals — centrilobular pale colouration. Liver weights elevated vs. vehicle: males +38%, females +29%. No macroscopic findings in Groups 1 or 2. Group 4 (300 mg/kg/day): 2 animals with slight alopecia — not considered adverse. All haematology and clinical chemistry samples processed within protocol-specified timeframes.',
    results: 'GROUP 3 (100 mg/kg/day) — KEY DEVIATIONS FROM VEHICLE: ALT: 148 U/L vs 44 U/L (vehicle) [3.4× ULN]; AST: 112 U/L vs 38 U/L [2.9× ULN]; Liver:BW ratio M: 4.82% vs 3.50% (vehicle) [p<0.01]; Centrilobular hepatocellular hypertrophy: 8/10 M, 7/10 F (confirmed histopathology pending). GROUP 1 (vehicle): all parameters within historical control range. GROUP 2 (30 mg/kg/day): no statistically significant deviations from vehicle — NOAEL confirmed.',
    conclusions: 'Week 4 data confirm hepatocellular effect at 100 mg/kg/day (LOAEL) and 300 mg/kg/day. No adverse findings at 30 mg/kg/day (NOAEL). Liver changes consistent with adaptive hepatocellular hypertrophy (centrilobular). Histopathology report (from Charles River Pathology) to be incorporated into final study report. Data meet ALCOA+ requirements; all original records in Ligature ELN. GLP QA inspection completed — no critical findings.',
    attachments: [
      { id: 'att-101', name: 'Body Weight Data — All Groups Week 4', type: 'application/xlsx', size: 145000, uploadedAt: '2023-06-19T07:45:00Z', uploadedBy: 'Dr. Sarah Mitchell', url: '/eln/exp-002/BW-wk4-all-groups.xlsx' },
      { id: 'att-102', name: 'Organ Weight Raw Data', type: 'application/xlsx', size: 198000, uploadedAt: '2023-06-19T17:30:00Z', uploadedBy: 'Dr. Anne Rutherford', url: '/eln/exp-002/organ-weights-wk4.xlsx' },
      { id: 'att-103', name: 'Haematology + Clinical Chemistry Results', type: 'application/pdf', size: 1240000, uploadedAt: '2023-06-21T09:00:00Z', uploadedBy: 'Dr. Anne Rutherford', url: '/eln/exp-002/clin-path-wk4.pdf' },
      { id: 'att-104', name: 'QA Inspection Report — Week 4 Necropsy', type: 'application/pdf', size: 560000, uploadedAt: '2023-06-22T14:00:00Z', uploadedBy: 'James Okafor (QA)', url: '/eln/exp-002/QA-inspection-wk4.pdf' },
    ],
    dataFiles: [
      { id: 'df-101', name: 'Sysmex XN-1000 Haematology Export', instrument: 'Sysmex XN-1000', format: 'csv', size: 320000, uploadedAt: '2023-06-20T18:00:00Z', dataPoints: 760 },
      { id: 'df-102', name: 'Roche Cobas Clinical Chemistry Export', instrument: 'Roche Cobas c502', format: 'csv', size: 280000, uploadedAt: '2023-06-20T18:30:00Z', dataPoints: 800 },
      { id: 'df-103', name: 'Organ Weight Database Export', instrument: 'Sartorius Practum (calibrated)', format: 'csv', size: 48000, uploadedAt: '2023-06-19T17:30:00Z', dataPoints: 240 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Sarah Mitchell',
    signedAt: '2023-06-22T16:00:00Z',
    witnessedBy: 'James Okafor (QA)',
    witnessedAt: '2023-06-23T09:30:00Z',
    linkedSamples: ['samp-wk4-g1-m', 'samp-wk4-g1-f', 'samp-wk4-g3-m', 'samp-wk4-g3-f'],
    linkedDocuments: ['doc-tox-2847-002-DRAFT', 'doc-hist-report-pending'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-tox-002-wk4'],
    tags: ['GLP', 'toxicology', 'necropsy', 'clinical-pathology', 'ALCOA+', '21CFR-Part11', 'IND-enabling', 'LIG-2847'],
    keywords: ['organ weight', 'ALT', 'AST', 'hepatocellular hypertrophy', 'NOAEL', 'LOAEL', 'haematology', 'clinical chemistry'],
  },

  // ── EXP-003: In Vitro KRAS G12C Cellular Efficacy ──────────────────────
  {
    id: 'exp-003',
    notebookId: 'nb-002',
    title: 'LIG-2847 Cellular Efficacy — KRAS G12C IC₅₀ Panel (NCI-H358, MiaPaCa-2, A549)',
    type: 'assay',
    status: 'reviewed',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'PHARM-2847-EFF-001',
    studyName: 'In Vitro Efficacy Package — Lead Optimisation',
    author: 'Dr. Emily Rodriguez',
    authorId: 'user-erodriguez',
    collaborators: ['Dr. James Kim', 'Priya Nair'],
    createdAt: '2022-04-10T09:00:00Z',
    modifiedAt: '2022-04-25T17:00:00Z',
    startDate: '2022-04-10',
    completionDate: '2022-04-22',
    objective: 'Determine cellular IC₅₀ of LIG-2847 against KRAS G12C-mutant cancer cell lines (NCI-H358 NSCLC, MiaPaCa-2 PDAC) and KRAS wild-type control (A549). Assess selectivity window and confirm on-target mechanism via pERK suppression.',
    hypothesis: 'LIG-2847 will demonstrate ≥100-fold selectivity for KRAS G12C-mutant vs. wild-type cell lines. pERK suppression at sub-IC₅₀ concentrations will confirm on-target KRAS inhibition.',
    materials: [
      { id: 'mat-201', name: 'LIG-2847 API Lot', catalogNumber: 'LIG2847-API-002', lotNumber: 'API-2022-019', vendor: 'Internal — CMC', quantity: '10', unit: 'mg' },
      { id: 'mat-202', name: 'NCI-H358 (KRAS G12C, NSCLC)', catalogNumber: 'ATCC-CRL-5807', lotNumber: 'P12-2022-001', vendor: 'ATCC', quantity: 'P12', unit: 'passage' },
      { id: 'mat-203', name: 'MiaPaCa-2 (KRAS G12C, PDAC)', catalogNumber: 'ATCC-CRL-1420', lotNumber: 'P8-2022-003', vendor: 'ATCC', quantity: 'P8', unit: 'passage' },
      { id: 'mat-204', name: 'A549 (KRAS G12S, NSCLC, WT control)', catalogNumber: 'ATCC-CCL-185', lotNumber: 'P15-2022-002', vendor: 'ATCC', quantity: 'P15', unit: 'passage' },
      { id: 'mat-205', name: 'CellTiter-Glo 2.0 Luminescent Viability Reagent', catalogNumber: 'Promega G9243', lotNumber: 'LOT-0001284567', vendor: 'Promega', quantity: '100', unit: 'mL', expiryDate: '2023-04-01' },
    ],
    procedures: [
      { id: 'step-201', stepNumber: 1, description: 'Seed cells in 96-well white plates: NCI-H358 2000/well, MiaPaCa-2 1500/well, A549 2000/well in 100 μL complete medium. Incubate 24 h at 37°C/5% CO₂ to allow attachment.', duration: '30 min + 24 h incubation', equipment: ['Multidrop Combi liquid handler', 'Incucyte S3 live cell imager for confluence check'], completedAt: '2022-04-11T09:00:00Z', completedBy: 'Priya Nair', notes: 'Seeding density validated in prior optimisation experiment (EXP-OPTIM-001). Confluence at time of dosing: 30–40%.' },
      { id: 'step-202', stepNumber: 2, description: 'Prepare LIG-2847 10-point 3× dilution series: 10 μM down to 0.00051 μM in DMSO. Dilute into medium (final DMSO 0.1%). Sotorasib (AMG-510) included as reference compound at same concentrations. Add 50 μL compound solution to 100 μL medium per well. Incubate 72 h.', duration: '1 hr', equipment: ['Hamilton STAR liquid handler', 'Echo 655 acoustic dispenser'], completedAt: '2022-04-12T10:00:00Z', completedBy: 'Dr. Emily Rodriguez', notes: 'n=4 technical replicates per concentration per cell line. DMSO vehicle: 0.1%. No precipitation observed at any test concentration.' },
      { id: 'step-203', stepNumber: 3, description: 'At 72 h: equilibrate CellTiter-Glo to RT. Add 50 μL CTG per well. Shake 2 min, incubate 10 min dark. Read luminescence on EnVision 2105 plate reader. Normalise to DMSO vehicle (100% viability) and staurosporine positive control (0%).', duration: '1 hr', equipment: ['EnVision 2105 multimode reader', 'BioTek EL406 plate washer'], completedAt: '2022-04-15T14:00:00Z', completedBy: 'Priya Nair' },
      { id: 'step-204', stepNumber: 4, description: 'For pERK western: seed NCI-H358 in 6-well plates, treat with LIG-2847 0.01, 0.1, 1 μM for 4 h. Lyse cells in RIPA buffer. SDS-PAGE, transfer, blot with anti-pERK (Thr202/Tyr204, CST #4370) and anti-total ERK (CST #4695). Quantify bands by densitometry (ImageJ).', duration: '8 hr', equipment: ['Bio-Rad Mini-PROTEAN system', 'ChemiDoc MP Imaging System'], completedAt: '2022-04-18T18:00:00Z', completedBy: 'Dr. James Kim' },
      { id: 'step-205', stepNumber: 5, description: 'Fit dose-response data to 4-parameter logistic (4PL) model in GraphPad Prism. Report IC₅₀ ± 95% CI, Hill slope, and Emax. Calculate selectivity ratio: A549 IC₅₀ / NCI-H358 IC₅₀.', duration: '3 hr', equipment: ['GraphPad Prism 10'], completedAt: '2022-04-22T16:00:00Z', completedBy: 'Dr. Emily Rodriguez' },
    ],
    observations: 'LIG-2847 shows marked differential growth inhibition between KRAS G12C cell lines and A549 WT control. Sotorasib reference compound IC₅₀ values consistent with published literature (NCI-H358: 0.42 μM — publication reports 0.38 μM). pERK western shows concentration-dependent suppression in NCI-H358 at sub-IC₅₀ concentrations, confirming on-target KRAS inhibition as mechanism. No cytotoxicity in vehicle wells. Z-factor for CTG assay: 0.81 (excellent).',
    results: 'LIG-2847 CELLULAR IC₅₀: NCI-H358 (KRAS G12C NSCLC): 0.18 μM [95% CI 0.14–0.23]. MiaPaCa-2 (KRAS G12C PDAC): 0.31 μM [95% CI 0.24–0.39]. A549 (KRAS WT control): >10 μM (Emax 12% at 10 μM). Selectivity ratio (A549/H358): >56×. Hill slope: 1.4 (H358), 1.6 (MiaPaCa-2). SOTORASIB REFERENCE: NCI-H358 IC₅₀ = 0.42 μM (consistent with literature). pERK SUPPRESSION (NCI-H358): 0.01 μM: −8%; 0.1 μM: −61%; 1 μM: −89% vs. DMSO vehicle. On-target mechanism confirmed.',
    conclusions: 'LIG-2847 demonstrates potent, selective anti-proliferative activity against KRAS G12C-mutant cell lines. IC₅₀ 0.18 μM in NCI-H358 represents a 2.3-fold improvement over sotorasib in this assay. Greater than 56-fold selectivity over KRAS WT control A549. pERK suppression confirms covalent KRAS G12C target engagement as mechanism. Data support advancement of LIG-2847 to in vivo xenograft efficacy studies. All data meet ALCOA+ requirements and support Module 2.6.2 pharmacology summary.',
    attachments: [
      { id: 'att-201', name: 'Dose-Response Curves — All 3 Cell Lines', type: 'application/pdf', size: 1120000, uploadedAt: '2022-04-22T17:00:00Z', uploadedBy: 'Dr. Emily Rodriguez', url: '/eln/exp-003/dose-response-curves.pdf' },
      { id: 'att-202', name: 'pERK Western Blot Image', type: 'image/tiff', size: 8940000, uploadedAt: '2022-04-18T19:00:00Z', uploadedBy: 'Dr. James Kim', url: '/eln/exp-003/pERK-western-H358.tif' },
      { id: 'att-203', name: 'Raw Luminescence Data (EnVision export)', type: 'application/xlsx', size: 245000, uploadedAt: '2022-04-15T15:00:00Z', uploadedBy: 'Priya Nair', url: '/eln/exp-003/EnVision-raw-CTG.xlsx' },
    ],
    dataFiles: [
      { id: 'df-201', name: 'EnVision 2105 — Raw CTG Luminescence', instrument: 'PerkinElmer EnVision 2105', format: 'csv', size: 89000, uploadedAt: '2022-04-15T15:00:00Z', dataPoints: 384 },
      { id: 'df-202', name: 'GraphPad Prism — 4PL Fits', instrument: 'GraphPad Prism 10', format: 'pzfx', size: 340000, uploadedAt: '2022-04-22T16:30:00Z', dataPoints: 120 },
      { id: 'df-203', name: 'ChemiDoc — Western Band Quantification', instrument: 'Bio-Rad ChemiDoc MP', format: 'scn', size: 12400000, uploadedAt: '2022-04-18T19:00:00Z', dataPoints: 12 },
    ],
    signatureStatus: 'signed',
    signedBy: 'Dr. Emily Rodriguez',
    signedAt: '2022-04-23T10:00:00Z',
    linkedSamples: ['samp-api-019', 'samp-cl-h358', 'samp-cl-miapaca', 'samp-cl-a549'],
    linkedDocuments: ['doc-pharm-efficacy-summary-2847'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-eff-001'],
    tags: ['efficacy', 'KRAS-G12C', 'IC50', 'cellular-assay', 'selectivity', 'pERK', 'LIG-2847', 'lead-optimisation'],
    keywords: ['KRAS G12C', 'IC50', 'CellTiter-Glo', 'NCI-H358', 'MiaPaCa-2', 'pERK', 'western blot', '4PL'],
  },

  // ── EXP-004: Bioanalytical Method Validation (PK) ──────────────────────
  {
    id: 'exp-004',
    notebookId: 'nb-003',
    title: 'LIG-2847 LC-MS/MS Bioanalytical Method Validation — Rat Plasma (FDA BMV 2018)',
    type: 'bioanalytical',
    status: 'approved',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'PK-2847-001',
    studyName: 'PK / Mass Balance — IND-Enabling',
    author: 'Dr. Anne Rutherford',
    authorId: 'user-arutherford',
    collaborators: ['Thomas Bauer', 'Mei Lin'],
    createdAt: '2022-08-01T08:00:00Z',
    modifiedAt: '2022-09-05T17:30:00Z',
    startDate: '2022-08-01',
    completionDate: '2022-09-01',
    objective: 'Validate LC-MS/MS method for quantification of LIG-2847 in Sprague-Dawley rat plasma. Validation per FDA Bioanalytical Method Validation Guidance (2018) and ICH M10 (2022). Method will support GLP PK studies for IND filing.',
    hypothesis: null,
    materials: [
      { id: 'mat-301', name: 'LIG-2847 Reference Standard (certified purity 99.6%)', catalogNumber: 'REF-LIG2847-001', lotNumber: 'REF-2022-009', vendor: 'Internal — Analytical', quantity: '5', unit: 'mg', sampleId: 'samp-ref-001' },
      { id: 'mat-302', name: 'LIG-2847-d₈ Internal Standard', catalogNumber: 'IS-LIG2847-D8-001', lotNumber: 'IS-2022-003', vendor: 'Isotec (custom synthesis)', quantity: '2', unit: 'mg' },
      { id: 'mat-303', name: 'Blank Sprague-Dawley rat plasma (K₂EDTA)', catalogNumber: 'PLASMA-RAT-SD-K2', lotNumber: 'PLM-2022-041', vendor: 'BioreclamationIVT', quantity: '50', unit: 'mL' },
      { id: 'mat-304', name: 'Acetonitrile LC-MS grade', catalogNumber: 'ACN-LCMS-4L', lotNumber: 'L20220718', vendor: 'Honeywell Burdick & Jackson', quantity: '4', unit: 'L' },
    ],
    procedures: [
      { id: 'step-301', stepNumber: 1, description: 'Prepare calibration standards (CS) in blank rat plasma: 1, 5, 20, 100, 500, 1000, 2000 ng/mL (n=6 analytical runs). Prepare QC low (3 ng/mL), medium (400 ng/mL), high (1600 ng/mL) and dilution QC (4000 ng/mL, 1:2 dilution). All standards prepared from independent stock solutions.', duration: '4 hr', equipment: ['Mettler Toledo XS205 balance', 'Hamilton MICROLAB NIMBUS'], completedAt: '2022-08-05T12:00:00Z', completedBy: 'Mei Lin', notes: 'IS concentration: 50 ng/mL LIG-2847-d₈ added to all calibrators, QCs, and study samples.' },
      { id: 'step-302', stepNumber: 2, description: 'Sample extraction: protein precipitation. Add 200 μL ACN (containing IS 50 ng/mL) to 50 μL plasma. Vortex 30 s, centrifuge 3000×g 10 min 4°C. Transfer 100 μL supernatant to LC vial. Run on SCIEX QTRAP 6500+ in positive ESI MRM mode.', duration: '2 hr', equipment: ['Eppendorf 5810R centrifuge', 'SCIEX QTRAP 6500+', 'Agilent 1290 Infinity II UHPLC'], completedAt: '2022-08-08T16:00:00Z', completedBy: 'Thomas Bauer', notes: 'MRM transitions: LIG-2847 m/z 487.2→341.1 (quant), 487.2→195.1 (qual). IS m/z 495.2→345.1.' },
      { id: 'step-303', stepNumber: 3, description: 'Assess selectivity (n=6 blank lots), carry-over (post-ULOQ blank), matrix effect (IS-normalised ME at QC-L and QC-H), extraction recovery (n=3 QC levels, n=5 replicates), within-run and between-run precision and accuracy (n=6 runs × 4 QCs). Assess stability: freeze-thaw (3 cycles), bench top (4 h, 24 h), long-term (−70°C, 6 months).', duration: '30 days', equipment: ['SCIEX QTRAP 6500+', 'Agilent 1290 Infinity II UHPLC', 'Analyst 1.7.2 software'], completedAt: '2022-09-01T17:00:00Z', completedBy: 'Dr. Anne Rutherford' },
    ],
    observations: 'Method demonstrates excellent selectivity — no interfering peaks at retention time of LIG-2847 or IS in any of 6 blank matrix lots. Carry-over: <5% of LLOQ at ULOQ injection. Matrix effect (IS-normalised): QC-L 103%, QC-H 98% — negligible matrix effect. Extraction recovery consistent across all 3 QC levels (mean 94.3 ± 3.2%). All stability conditions met acceptance criteria.',
    results: 'VALIDATION SUMMARY: LLOQ: 1 ng/mL (CV 8.4%, accuracy 102.1%). ULOQ: 2000 ng/mL. Dynamic range: 1–2000 ng/mL (2000-fold). Within-run precision (CV%): 2.8–7.9% across all QCs and runs. Between-run precision (CV%): 3.4–8.6%. Accuracy (%RE): −4.2% to +6.8% — all within ±15% (±20% at LLOQ). IS-normalised matrix effect: 96–107%. Extraction recovery: 91.2–97.6%. Freeze-thaw stability (3 cycles): stable. Benchtop (24 h, RT): stable. Long-term (−70°C, 6 months): stable. All acceptance criteria per FDA BMV 2018 met.',
    conclusions: 'LC-MS/MS method for LIG-2847 in rat plasma fully validated per FDA BMV 2018 and ICH M10. Dynamic range 1–2000 ng/mL covers the expected concentration range for the GLP PK study (Cmax predicted 800 ng/mL at 10 mg/kg IV). Method transferred to Charles River Laboratories Bioanalytical Services for use in the IND-enabling PK/TK studies. Validation report reference: BMV-LIG2847-RAT-001 v1.0 FINAL.',
    attachments: [
      { id: 'att-301', name: 'Validation Report BMV-LIG2847-RAT-001', type: 'application/pdf', size: 3450000, uploadedAt: '2022-09-05T10:00:00Z', uploadedBy: 'Dr. Anne Rutherford', url: '/eln/exp-004/BMV-LIG2847-RAT-001-FINAL.pdf' },
      { id: 'att-302', name: 'Chromatograms — Representative LLOQ and ULOQ', type: 'application/pdf', size: 890000, uploadedAt: '2022-09-03T14:00:00Z', uploadedBy: 'Thomas Bauer', url: '/eln/exp-004/chromatograms-LLOQ-ULOQ.pdf' },
    ],
    dataFiles: [
      { id: 'df-301', name: 'SCIEX Analyst — All Validation Runs', instrument: 'SCIEX QTRAP 6500+', format: 'wiff', size: 4200000000, uploadedAt: '2022-09-01T18:00:00Z', dataPoints: 6840 },
      { id: 'df-302', name: 'Watson LIMS — Validation Summary', instrument: 'Thermo Fisher Watson LIMS 7.6', format: 'pdf', size: 1100000, uploadedAt: '2022-09-05T10:00:00Z', dataPoints: 0 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Anne Rutherford',
    signedAt: '2022-09-06T10:00:00Z',
    witnessedBy: 'Dr. Sarah Mitchell',
    witnessedAt: '2022-09-07T09:30:00Z',
    linkedSamples: ['samp-ref-001', 'samp-is-d8-001', 'samp-blank-plasma-rat'],
    linkedDocuments: ['doc-bmv-lig2847-rat-001'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-pk-bmv-001'],
    tags: ['bioanalytical', 'LC-MS/MS', 'method-validation', 'BMV', 'ICH-M10', 'FDA-2018', 'PK', 'LIG-2847', 'GLP'],
    keywords: ['LLOQ', 'ULOQ', 'MRM', 'matrix effect', 'extraction recovery', 'precision', 'accuracy', 'stability'],
  },

  // ── EXP-005: KRAS G12C Xenograft In Vivo Efficacy ──────────────────────
  {
    id: 'exp-005',
    notebookId: 'nb-002',
    title: 'LIG-2847 In Vivo Efficacy — NCI-H358 KRAS G12C Xenograft (BALB/c Nude)',
    type: 'animal-study',
    status: 'completed',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'PHARM-2847-INV-001',
    studyName: 'In Vivo Efficacy Package',
    author: 'Dr. Emily Rodriguez',
    authorId: 'user-erodriguez',
    collaborators: ['Dr. James Kim', 'Priya Nair', 'Dr. Sarah Mitchell'],
    createdAt: '2022-05-15T07:00:00Z',
    modifiedAt: '2022-08-01T17:00:00Z',
    startDate: '2022-05-15',
    completionDate: '2022-07-30',
    objective: 'Evaluate antitumour activity of LIG-2847 in an NCI-H358 KRAS G12C NSCLC xenograft model in BALB/c nude mice. Assess tumour growth inhibition (TGI%) at 3 dose levels. Compare to sotorasib reference arm. Correlate tumour pERK suppression with PD endpoint.',
    hypothesis: 'LIG-2847 at 30 mg/kg QD PO will achieve ≥80% TGI in NCI-H358 xenograft model, consistent with superior in vitro potency vs. sotorasib.',
    materials: [
      { id: 'mat-401', name: 'LIG-2847 API — formulated in 0.5% CMC/0.1% Tween-80', catalogNumber: 'FORM-2847-OG-001', lotNumber: 'FORM-2022-015', vendor: 'Internal — Formulation', quantity: '200', unit: 'mg' },
      { id: 'mat-402', name: 'Sotorasib (AMG-510) reference compound', catalogNumber: 'SOTA-REF-001', lotNumber: 'MedChem-2022-041', vendor: 'MedChemExpress', quantity: '100', unit: 'mg' },
      { id: 'mat-403', name: 'BALB/c nude mice, female, 6–8 wk', catalogNumber: 'CAnN.Cg-Foxn1nu/Crl', lotNumber: 'CRL-2022-Batch04', vendor: 'Charles River', quantity: '70', unit: 'animals' },
      { id: 'mat-404', name: 'NCI-H358 cells (KRAS G12C NSCLC)', catalogNumber: 'ATCC-CRL-5807', lotNumber: 'P14-2022-002', vendor: 'ATCC', quantity: '5×10⁷', unit: 'cells' },
    ],
    procedures: [
      { id: 'step-401', stepNumber: 1, description: 'Implant NCI-H358 cells (5×10⁶ in 100 μL PBS/Matrigel 1:1) subcutaneously into right flank of BALB/c nude mice. Monitor tumour establishment. Randomise when mean tumour volume reaches 150–200 mm³ (Day 0). n=10/group: G1 vehicle (PO QD), G2 LIG-2847 10 mg/kg PO QD, G3 LIG-2847 30 mg/kg PO QD, G4 LIG-2847 100 mg/kg PO QD, G5 sotorasib 30 mg/kg PO QD, G6 sotorasib 100 mg/kg PO QD.', duration: '14 days (implant to randomisation)', equipment: ['Hamilton syringe', 'Callipers (electronic)', 'Anesthesia workstation'], completedAt: '2022-06-01T12:00:00Z', completedBy: 'Dr. Emily Rodriguez', notes: 'Randomisation at Day 0: mean TV 184 ± 23 mm³ across all groups (well-balanced). TV = (L × W²)/2.' },
      { id: 'step-402', stepNumber: 2, description: 'Dose all animals by oral gavage QD for 28 days. Record tumour volume (callipers, 3×/week) and body weight (3×/week). Observe for signs of distress daily. Stop-dose any animal with >20% BW loss.', duration: '28 days', equipment: ['Electronic callipers', 'Mettler Toledo balance', 'Gavage needles 20G'], completedAt: '2022-06-29T18:00:00Z', completedBy: 'Priya Nair', notes: '1 animal in G4 (100 mg/kg) stopped Day 18 — >20% BW loss. All other animals completed 28-day dosing. No treatment-related deaths.' },
      { id: 'step-403', stepNumber: 3, description: 'Terminal sacrifice at Day 28. Collect blood (retro-orbital, lithium heparin) for PK/TK. Collect tumour for PD endpoints: bisect each tumour. One half snap-frozen for western (pERK, pAKT, KRAS-GTP pull-down). One half in NBF for IHC (Ki67, cleaved caspase-3, pERK IHC). Record tumour weight.', duration: '2 days', equipment: ['Liquid nitrogen', 'NBF fixative', 'Cryovials', 'Dry ice'], completedAt: '2022-07-01T17:00:00Z', completedBy: 'Dr. Emily Rodriguez' },
      { id: 'step-404', stepNumber: 4, description: 'Analyse PD data: western for pERK/tERK ratio in tumour lysates. IHC Ki67 quantification (% positive nuclei, 5 HPF per tumour). Calculate TGI% = [1 − (ΔTV_treated/ΔTV_vehicle)] × 100. Statistical analysis: one-way ANOVA + Tukey post-hoc for tumour volumes. p<0.05 considered significant.', duration: '14 days', equipment: ['Bio-Rad ChemiDoc', 'Leica Aperio slide scanner', 'GraphPad Prism 10'], completedAt: '2022-07-30T17:00:00Z', completedBy: 'Dr. James Kim' },
    ],
    observations: 'LIG-2847 demonstrates dose-dependent tumour growth inhibition. Vehicle-dosed tumours reached mean TV ~1840 mm³ by Day 28. LIG-2847 30 mg/kg and 100 mg/kg groups show near-complete tumour stasis — 3 complete regressions (tumour not palpable) in 100 mg/kg group. Sotorasib reference shows less TGI at same doses. Body weight tolerability acceptable for all LIG-2847 groups except 100 mg/kg (1 stop-dose). Tumour pERK suppression correlates with anti-tumour activity.',
    results: 'TUMOUR GROWTH INHIBITION (Day 28): G1 Vehicle: mean TV 1842 mm³ (baseline). G2 LIG-2847 10 mg/kg: TGI 62% (p<0.01). G3 LIG-2847 30 mg/kg: TGI 89% (p<0.001). G4 LIG-2847 100 mg/kg: TGI 97%, 3 CR (p<0.001). G5 Sotorasib 30 mg/kg: TGI 71% (p<0.01). G6 Sotorasib 100 mg/kg: TGI 84% (p<0.001). pERK SUPPRESSION (% vs vehicle, tumour lysate): LIG-2847 10 mg/kg −45%; 30 mg/kg −78%; 100 mg/kg −93%. Ki67 (% positive): Vehicle 68%; LIG-2847 100 mg/kg 12%. Cleaved caspase-3 positive: Vehicle 3%; LIG-2847 100 mg/kg 31%.',
    conclusions: 'LIG-2847 demonstrates superior in vivo anti-tumour efficacy vs. sotorasib at equivalent dose levels in NCI-H358 KRAS G12C xenograft model. TGI 89% at 30 mg/kg, consistent with ≥80% hypothesis. pERK suppression and Ki67 reduction confirm on-target pharmacodynamic mechanism. Apoptosis (caspase-3) confirmed at 100 mg/kg. Efficacy data support selection of 30 mg/kg as the minimum efficacious dose for IND enabling studies. Data included in Module 2.6.2 Pharmacology Summary and Module 4 study report.',
    attachments: [
      { id: 'att-401', name: 'Tumour Growth Curves — All Groups', type: 'application/pdf', size: 1560000, uploadedAt: '2022-07-30T18:00:00Z', uploadedBy: 'Dr. Emily Rodriguez', url: '/eln/exp-005/TGI-curves-all-groups.pdf' },
      { id: 'att-402', name: 'pERK Western + Ki67 IHC Images', type: 'application/pdf', size: 4200000, uploadedAt: '2022-07-28T17:00:00Z', uploadedBy: 'Dr. James Kim', url: '/eln/exp-005/PD-endpoints-western-IHC.pdf' },
      { id: 'att-403', name: 'Body Weight Data — All Groups', type: 'application/xlsx', size: 89000, uploadedAt: '2022-07-30T17:00:00Z', uploadedBy: 'Priya Nair', url: '/eln/exp-005/BW-all-groups.xlsx' },
      { id: 'att-404', name: 'Statistical Analysis — GraphPad Prism', type: 'application/pdf', size: 780000, uploadedAt: '2022-07-30T18:30:00Z', uploadedBy: 'Dr. Emily Rodriguez', url: '/eln/exp-005/statistics-ANOVA.pdf' },
    ],
    dataFiles: [
      { id: 'df-401', name: 'Tumour Volume Raw Data — 3×/week callipers', instrument: 'Mitutoyo 500-196-30 callipers', format: 'xlsx', size: 145000, uploadedAt: '2022-06-29T19:00:00Z', dataPoints: 1260 },
      { id: 'df-402', name: 'Body Weight Raw Data', instrument: 'Mettler Toledo MS304S balance', format: 'xlsx', size: 98000, uploadedAt: '2022-06-29T19:00:00Z', dataPoints: 1260 },
      { id: 'df-403', name: 'Aperio ImageScope — Ki67 IHC Quantification', instrument: 'Leica Aperio AT2 scanner', format: 'svs', size: 4800000000, uploadedAt: '2022-07-28T16:00:00Z', dataPoints: 300 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Emily Rodriguez',
    signedAt: '2022-08-02T10:00:00Z',
    witnessedBy: 'Dr. Sarah Mitchell',
    witnessedAt: '2022-08-03T09:00:00Z',
    linkedSamples: ['samp-api-form-015', 'samp-xenograft-h358-day28'],
    linkedDocuments: ['doc-pharm-2847-inv-001-FINAL', 'doc-mod262-pharm-summary'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-eff-invivo-001'],
    tags: ['in-vivo', 'xenograft', 'KRAS-G12C', 'TGI', 'efficacy', 'pERK', 'IHC', 'PD-biomarker', 'LIG-2847'],
    keywords: ['xenograft', 'NCI-H358', 'tumour growth inhibition', 'pERK', 'Ki67', 'sotorasib', 'oral gavage', 'BALB/c nude'],
  },

  // ── EXP-TOX-001: 4-Week GLP Repeat-Dose Toxicology ──────────────────────
  {
    id: 'exp-tox-001',
    notebookId: 'nb-tox-001',
    title: 'TOX-2847-001 · 4-Week Repeat-Dose Toxicity — LIG-2847 in Rats (GLP)',
    type: 'animal-study',
    status: 'approved',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'study-ind-2847',
    studyName: 'LIG-2847 IND-Enabling Toxicology',
    author: 'Dr. Sarah Mitchell',
    authorId: 'user-sd-001',
    collaborators: ['Dr. Anne Rutherford (PK)', 'Dr. Monica Lefevre (QA)'],
    createdAt: '2023-03-15T07:00:00Z',
    modifiedAt: '2023-07-10T16:30:00Z',
    startDate: '2023-03-15',
    completionDate: '2023-06-20',
    objective: 'Determine NOAEL, LOAEL, and target organ toxicity of LIG-2847 following 4-week oral gavage dosing in Sprague-Dawley rats with 2-week recovery. GLP-compliant per ICH M3(R2) §11.3.4.1 and 21 CFR Part 58.',
    hypothesis: 'Hepatocellular findings from dose-range finding will persist at ≥100 mg/kg/day. NOAEL expected at 30 mg/kg/day.',
    materials: [
      { id: 'mat-tox-001', name: 'LIG-2847 Drug Substance', catalogNumber: 'DS-2847-GLP-003', lotNumber: 'DS-2847-23-003', vendor: 'Ligature API Synthesis', quantity: '150', unit: 'g' },
      { id: 'mat-tox-002', name: '0.5% Methylcellulose Vehicle', catalogNumber: 'VEH-MC-05', lotNumber: 'VEH-23-041', vendor: 'Covance Pharmacy', quantity: '2', unit: 'L' },
      { id: 'mat-tox-003', name: 'SD Rat (Crl:CD(SD))', catalogNumber: 'N/A', lotNumber: 'N/A', vendor: 'Charles River Laboratories', quantity: '80', unit: 'animals (40M/40F)' },
    ],
    procedures: [
      { id: 'step-tox-001', stepNumber: 1, description: 'Acclimatisation — 7 days minimum. Daily clinical observations. Stratified randomisation to 4 dose groups (n=10M/10F per group) by body weight using CATO software. Dose groups: 0 (vehicle), 30, 100, 300 mg/kg/day.', duration: '7 days', equipment: ['Animal facility', 'CATO randomisation software', 'Ohaus Explorer balance'], completedAt: '2023-03-22T08:00:00Z', completedBy: 'Dr. Sarah Mitchell', notes: 'All 80 animals passed health screen. No pre-existing findings. Mean BW 242 ± 18g (M), 192 ± 14g (F).' },
      { id: 'step-tox-002', stepNumber: 2, description: 'Daily oral gavage dosing at 0, 30, 100, 300 mg/kg/day (10 mL/kg dose volume). Dosed at same time each day ±30 min per 21 CFR Part 58. Body weights and food consumption recorded twice weekly. Clinical observations twice daily.', duration: '28 days', equipment: ['Gavage needles 18G FTP', 'Analytical balance', 'Dose preparation worksheets'], completedAt: '2023-04-19T09:00:00Z', completedBy: 'Dr. Sarah Mitchell', notes: 'One animal found dead at Day 18 (300 mg/kg, M). Necropsy: gavage accident. Replaced per protocol. No other unscheduled deaths.' },
      { id: 'step-tox-003', stepNumber: 3, description: 'Clinical pathology: blood and urine at Week 2 and terminal. Haematology (CBC + differential), clinical chemistry (ALT, AST, ALP, GGT, bilirubin, BUN, creatinine, electrolytes), coagulation (PT, aPTT). Urinalysis. Samples processed within 2h collection.', duration: '4 hr per timepoint', equipment: ['EDTA tubes', 'Heparin tubes', 'Metabolic cages', 'Advia 2120', 'Cobas 8000'], completedAt: '2023-04-26T14:00:00Z', completedBy: 'Dr. Sarah Mitchell' },
      { id: 'step-tox-004', stepNumber: 4, description: 'Terminal necropsy (Day 29) plus recovery satellite groups (Day 43: 5M/5F/group). Full macroscopic pathology. Organ weights: liver, kidney, heart, spleen, lung, brain, adrenals, thymus, gonads. Tissue collection and processing per SOP TPC-023. H&E staining, peer-reviewed histopathology.', duration: '2 days', equipment: ['Necropsy suite', 'Tissue cassettes', 'Leica RM2245 microtome', 'H&E stain'], completedAt: '2023-06-20T17:00:00Z', completedBy: 'Dr. Sarah Mitchell' },
    ],
    observations: 'Hepatocellular hypertrophy (centrilobular, minimal-to-mild) in 8/10M, 7/10F at 100 mg/kg/day and 10/10M, 10/10F at 300 mg/kg/day. Partially reversible by Day 43 (recovery). ALT 2.8–3.2× ULN, AST 1.9–2.4× ULN at ≥100 mg/kg/day. Body weight −12% vs vehicle at 300 mg/kg/day (Wk 4). No mortality at scheduled doses. No cardiovascular, renal, haematological, or CNS findings.',
    results: 'NOAEL: 30 mg/kg/day. LOAEL: 100 mg/kg/day (hepatocellular hypertrophy, ↑ALT/AST). MTD: 300 mg/kg/day. Target organ: liver. Findings consistent with adaptive hepatocellular response; partially reversible. Provides ≥10× safety margin over proposed clinical starting dose (0.3 mg/kg/day).',
    conclusions: 'Acceptable safety profile for IND. NOAEL 30 mg/kg/day supports Phase 1 entry. LFT monitoring recommended in clinical protocol. Study qualifies for eCTD Module 4.2.3.2. ICH M3(R2) §11.3.4.1 requirement fulfilled.',
    attachments: [
      { id: 'att-tox-001', name: 'Histopathology — Liver H&E Representative Images', type: 'image/tiff', size: 48500000, uploadedAt: '2023-06-25T10:00:00Z', uploadedBy: 'Dr. Sarah Mitchell', url: '/files/tox-2847-001/histo-liver.tiff' },
      { id: 'att-tox-002', name: 'Gross Pathology Photos', type: 'image/jpeg', size: 8200000, uploadedAt: '2023-06-25T10:30:00Z', uploadedBy: 'Dr. Sarah Mitchell', url: '/files/tox-2847-001/gross-path.jpg' },
    ],
    dataFiles: [
      { id: 'df-tox-001', name: 'Body Weight Raw Data — All Groups', instrument: 'Ohaus Explorer Balance', format: 'csv', size: 42000, uploadedAt: '2023-06-22T09:00:00Z', dataPoints: 1120 },
      { id: 'df-tox-002', name: 'Clinical Chemistry — Terminal (Wk 4)', instrument: 'Cobas 8000', format: 'xlsx', size: 185000, uploadedAt: '2023-06-22T14:00:00Z', dataPoints: 480 },
      { id: 'df-tox-003', name: 'Haematology — Full Dataset', instrument: 'Advia 2120i', format: 'xlsx', size: 210000, uploadedAt: '2023-06-22T14:30:00Z', dataPoints: 640 },
      { id: 'df-tox-004', name: 'Organ Weights — All Groups (Terminal + Recovery)', instrument: 'Mettler Toledo XS205', format: 'csv', size: 28000, uploadedAt: '2023-06-23T10:00:00Z', dataPoints: 1040 },
      { id: 'df-tox-005', name: 'Histopathology Severity Grading Table', instrument: 'Manual (Olympus BX53 light microscopy)', format: 'xlsx', size: 95000, uploadedAt: '2023-07-08T16:00:00Z', dataPoints: 1200 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Sarah Mitchell',
    signedAt: '2023-07-10T15:00:00Z',
    witnessedBy: 'Dr. Monica Lefevre (QA Unit)',
    witnessedAt: '2023-07-18T11:00:00Z',
    linkedSamples: [],
    linkedDocuments: ['doc-tox-2847-001-FINAL'],
    linkedCTMSRecords: [],
    linkedSafetyReports: [],
    linkedTMFArtifacts: ['tmf-mod4-tox-4wk-rat'],
    tags: ['GLP', 'toxicology', 'IND-enabling', 'LIG-2847', 'ICH-M3', 'NOAEL', '21-CFR-58'],
    keywords: ['repeat-dose', 'oral gavage', 'hepatotoxicity', 'NOAEL', 'LOAEL', 'histopathology', '21 CFR 58'],
  },

  // ── EXP-TOX-002: Safety Pharmacology Core Battery ────────────────────────
  {
    id: 'exp-tox-002',
    notebookId: 'nb-tox-001',
    title: 'PHARM-2847-001 · Safety Pharmacology Core Battery — LIG-2847 (GLP, ICH S7A/S7B)',
    type: 'animal-study',
    status: 'approved',
    projectId: 'proj-lig2847',
    projectName: 'LIG-2847 Nexavant Program',
    studyId: 'study-ind-2847',
    studyName: 'LIG-2847 IND-Enabling Safety Pharmacology',
    author: 'Dr. Rachel Chen',
    authorId: 'user-sd-002',
    collaborators: ['Dr. Oliver Bennett (Cardiology CRO)', 'Dr. Sarah Mitchell (Study Director)'],
    createdAt: '2022-09-01T07:00:00Z',
    modifiedAt: '2022-12-15T16:00:00Z',
    startDate: '2022-09-01',
    completionDate: '2022-11-30',
    objective: 'Evaluate potential unintended pharmacological effects of LIG-2847 on CNS, cardiovascular (hERG), and respiratory systems per ICH S7A core battery requirements. Assess hERG channel inhibition per ICH S7B.',
    hypothesis: 'hERG liability is the primary CVS concern given structural similarity to known hERG binders. CNS and respiratory findings not anticipated at therapeutic exposures.',
    materials: [
      { id: 'mat-sp-001', name: 'LIG-2847 Drug Substance', catalogNumber: 'DS-2847-GLP-001', lotNumber: 'DS-2847-22-001', vendor: 'Ligature API Synthesis', quantity: '50', unit: 'g' },
      { id: 'mat-sp-002', name: 'CHO-K1/hERG cells (passage 12)', catalogNumber: 'CHO-hERG-K1', lotNumber: 'P12-2022-09', vendor: 'Covance Cell Bank', quantity: '1', unit: 'flask T175' },
      { id: 'mat-sp-003', name: 'SD Rat — CNS/Respiratory', catalogNumber: 'N/A', lotNumber: 'N/A', vendor: 'Charles River Laboratories', quantity: '40', unit: 'animals (20M/20F)' },
    ],
    procedures: [
      { id: 'step-sp-001', stepNumber: 1, description: 'hERG patch clamp (ICH S7B) — Manual whole-cell patch clamp on CHO-K1/hERG cells at 37°C. Concentrations: 0.1, 1, 3, 10, 30, 100 μM (n=3 cells per conc). Vehicle control (0.1% DMSO), positive control E-4031 (10 nM). Tail current at −40 mV after +20 mV depolarisation. IC₅₀ by Hill equation fit (GraphPad Prism 9).', duration: '3 days', equipment: ['Axon Multiclamp 700B amplifier', 'Digidata 1550 digitiser', 'pCLAMP 11 software', 'Incubator 37°C/5% CO₂'], completedAt: '2022-09-10T17:00:00Z', completedBy: 'Dr. Rachel Chen', notes: 'E-4031 positive control IC₅₀ = 11.8 nM (historical range 8–15 nM ✓). Vehicle: no effect. All QC criteria met.' },
      { id: 'step-sp-002', stepNumber: 2, description: 'CNS assessment — Modified Irwin Battery (ICH S7A). Rats dosed PO: vehicle, 30, 100, 300 mg/kg (n=5M/group). Observations at 0.5, 1, 2, 4, 8, 24h post-dose. 40+ behavioural, autonomic, neuromuscular parameters. Grip strength and rectal temperature. Blinded observer per Irwin (1968).', duration: '5 days', equipment: ['Grip strength meter (Bioseb)', 'Rotarod (Ugo Basile)', 'Open field tracking (Ethovision)', 'Rectal thermometer'], completedAt: '2022-10-15T17:00:00Z', completedBy: 'Dr. Rachel Chen' },
      { id: 'step-sp-003', stepNumber: 3, description: 'Respiratory — Whole-body plethysmography, unrestrained rats. Tidal volume (Vt), respiratory rate (RR), minute volume (MV) at 1, 2, 4h post-dose. Matched dose groups. Finepointe RC, bias flow 1 L/min, 37°C. 5-min baseline recording prior to dosing.', duration: '3 days', equipment: ['Buxco Finepointe RC plethysmograph', 'Bias flow controller', 'DataCapture 2.2 software'], completedAt: '2022-11-15T17:00:00Z', completedBy: 'Dr. Rachel Chen', notes: 'All QC acceptance criteria met. No positive control required for respiratory per ICH S7A.' },
    ],
    observations: 'hERG IC₅₀ = 8.4 μM (95% CI: 6.9–10.2 μM). At 100 μM: 78% inhibition. Safety margin vs estimated clinical Cmax (0.82 μM): 10.2×. CNS Irwin: no pharmacological effects at 30 or 100 mg/kg. Marginal sedation score at 300 mg/kg at 1h (1.2/4 vs 0.1/4 vehicle; p=0.08, not significant). Respiratory: no statistically significant changes in Vt, RR, or MV at any dose or timepoint.',
    results: 'hERG IC₅₀ = 8.4 μM — 10.2× margin over clinical Cmax. Follow-up in vivo QTc telemetry conducted in 13-week dog study (TOX-2847-002). CNS NOAEL = 100 mg/kg (therapeutic equivalent). No CNS safety concern for clinical entry. Respiratory NOAEL ≥ 300 mg/kg. No respiratory concern.',
    conclusions: 'Core battery complete per ICH S7A. hERG signal identified (10× margin) — QTc monitoring required in clinical protocol per ICH E14. CNS and respiratory acceptable for Phase 1. Study qualifies for eCTD Module 4.2.1. ICH M3(R2) §11.1 requirement fulfilled.',
    attachments: [
      { id: 'att-sp-001', name: 'hERG Patch Clamp Traces — Representative Concentrations', type: 'image/tiff', size: 12400000, uploadedAt: '2022-09-12T10:00:00Z', uploadedBy: 'Dr. Rachel Chen', url: '/files/pharm-2847-001/herg-traces.tiff' },
      { id: 'att-sp-002', name: 'Irwin Battery Scoring Sheet — Blinded Observer', type: 'application/xlsx', size: 125000, uploadedAt: '2022-10-16T14:00:00Z', uploadedBy: 'Dr. Rachel Chen', url: '/files/pharm-2847-001/irwin-scoring.xlsx' },
    ],
    dataFiles: [
      { id: 'df-sp-001', name: 'hERG IC₅₀ Curve Fit — Hill Equation (GraphPad)', instrument: 'Axon Multiclamp 700B + pCLAMP 11', format: 'xlsx', size: 48000, uploadedAt: '2022-09-11T09:00:00Z', dataPoints: 18 },
      { id: 'df-sp-002', name: 'Plethysmography Raw Data — Vt / RR / MV All Groups', instrument: 'Buxco Finepointe RC', format: 'csv', size: 310000, uploadedAt: '2022-11-16T09:00:00Z', dataPoints: 2880 },
    ],
    signatureStatus: 'countersigned',
    signedBy: 'Dr. Rachel Chen',
    signedAt: '2022-12-15T15:00:00Z',
    witnessedBy: 'Dr. Monica Lefevre (QA Unit)',
    witnessedAt: '2022-12-20T11:00:00Z',
    linkedSamples: [],
    linkedDocuments: ['doc-pharm-2847-001-FINAL'],
    linkedCTMSRecords: [],
    linkedSafetyReports: ['safety-003'],
    linkedTMFArtifacts: ['tmf-mod4-safpharm-001'],
    tags: ['GLP', 'safety-pharmacology', 'IND-enabling', 'LIG-2847', 'hERG', 'ICH-S7A', 'ICH-S7B', 'QTc'],
    keywords: ['patch clamp', 'hERG', 'Irwin battery', 'plethysmography', 'CNS', 'cardiovascular', 'QTc', '21 CFR 58'],
  },
];


const mockTemplates: ELNTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Standard Synthesis Experiment',
    type: 'synthesis',
    description: 'Template for standard chemical synthesis experiments',
    procedureSteps: [
      { stepNumber: 1, description: 'Charge reactor with starting materials' },
      { stepNumber: 2, description: 'Add reagents/catalysts' },
      { stepNumber: 3, description: 'Heat/cool to target temperature' },
      { stepNumber: 4, description: 'Monitor reaction progress' },
      { stepNumber: 5, description: 'Work-up and isolation' },
      { stepNumber: 6, description: 'Characterization and yield calculation' },
    ],
    requiredMaterials: [
      { name: 'Starting Material', quantity: '', unit: 'g' },
      { name: 'Solvent', quantity: '', unit: 'mL' },
    ],
    isGlobal: true,
    createdBy: 'System',
    createdAt: '2024-01-01T00:00:00Z',
    usageCount: 156,
  },
  {
    id: 'tpl-002',
    name: 'Tablet Formulation Study',
    type: 'formulation',
    description: 'Template for tablet formulation development experiments',
    procedureSteps: [
      { stepNumber: 1, description: 'Weigh and sieve components' },
      { stepNumber: 2, description: 'Blend API with excipients' },
      { stepNumber: 3, description: 'Granulate if required' },
      { stepNumber: 4, description: 'Add lubricant and final blend' },
      { stepNumber: 5, description: 'Compress tablets' },
      { stepNumber: 6, description: 'Perform in-process testing' },
    ],
    requiredMaterials: [
      { name: 'API', quantity: '', unit: 'g' },
      { name: 'Filler', quantity: '', unit: 'g' },
      { name: 'Disintegrant', quantity: '', unit: 'g' },
      { name: 'Lubricant', quantity: '', unit: 'g' },
    ],
    isGlobal: true,
    createdBy: 'System',
    createdAt: '2024-01-01T00:00:00Z',
    usageCount: 89,
  },
];

const mockRecentActivity: ELNActivityEntry[] = [
  { id: 'act-001', experimentId: 'exp-001', experimentTitle: 'LIG-2024-A Synthesis Scale-Up Batch 3', action: 'updated', userId: 'user-001', userName: 'Dr. Sarah Chen', timestamp: '2025-01-08T14:30:00Z', details: 'Added temperature log data' },
  { id: 'act-002', experimentId: 'exp-003', experimentTitle: 'LIG-2024 Tablet Formulation F7', action: 'signed', userId: 'user-002', userName: 'Dr. Michael Torres', timestamp: '2025-01-06T16:00:00Z' },
  { id: 'act-003', experimentId: 'exp-004', experimentTitle: 'LIG-2024 Stability T=0 Analysis', action: 'witnessed', userId: 'user-002', userName: 'Dr. Michael Torres', timestamp: '2025-01-07T09:00:00Z' },
  { id: 'act-004', experimentId: 'exp-004', experimentTitle: 'LIG-2024 Stability T=0 Analysis', action: 'approved', userId: 'user-005', userName: 'Dr. Robert Kim', timestamp: '2025-01-07T17:00:00Z' },
  { id: 'act-005', experimentId: 'exp-005', experimentTitle: 'LIG-2025 Lead Compound Screening', action: 'created', userId: 'user-003', userName: 'Dr. Emily Rodriguez', timestamp: '2025-01-08T08:00:00Z' },
];

// v0.13.86: Mock Instruments
const mockInstruments: ELNInstrument[] = [
  {
    id: 'inst-001',
    name: 'HPLC System 1',
    type: 'HPLC',
    manufacturer: 'Agilent',
    model: '1260 Infinity II',
    serialNumber: 'DE12345678',
    location: 'Lab A-101',
    status: 'available',
    lastCalibration: '2024-12-15',
    nextCalibration: '2025-03-15',
    calibrationInterval: 90,
    integrationEnabled: true,
    integrationProtocol: 'REST',
    connectionString: 'http://hplc-001.lab.local:8080',
    dataFormat: 'CSV',
    custodian: 'Dr. James Kim',
    department: 'Analytical',
  },
  {
    id: 'inst-002',
    name: 'Analytical Balance AB-1',
    type: 'Balance',
    manufacturer: 'Mettler Toledo',
    model: 'XPR205',
    serialNumber: 'B123456789',
    location: 'Lab A-102',
    status: 'available',
    lastCalibration: '2025-01-02',
    nextCalibration: '2025-02-02',
    calibrationInterval: 30,
    integrationEnabled: true,
    integrationProtocol: 'REST',
    connectionString: 'http://balance-001.lab.local:5000',
    dataFormat: 'JSON',
    custodian: 'Lisa Wang',
    department: 'Synthesis',
  },
  {
    id: 'inst-003',
    name: 'pH Meter PH-1',
    type: 'pH Meter',
    manufacturer: 'Mettler Toledo',
    model: 'SevenExcellence',
    serialNumber: 'PH87654321',
    location: 'Lab A-103',
    status: 'available',
    lastCalibration: '2025-01-05',
    nextCalibration: '2025-01-12',
    calibrationInterval: 7,
    integrationEnabled: false,
    integrationProtocol: 'manual',
    custodian: 'Dr. Sarah Chen',
    department: 'Formulation',
  },
  {
    id: 'inst-004',
    name: 'UV-Vis Spectrophotometer',
    type: 'Spectrophotometer',
    manufacturer: 'Shimadzu',
    model: 'UV-2600i',
    serialNumber: 'UV98765432',
    location: 'Lab B-201',
    status: 'in-use',
    lastCalibration: '2024-11-20',
    nextCalibration: '2025-02-20',
    calibrationInterval: 90,
    integrationEnabled: true,
    integrationProtocol: 'file-import',
    dataFormat: 'CSV',
    custodian: 'Dr. Michael Torres',
    department: 'Analytical',
  },
  {
    id: 'inst-005',
    name: 'Dissolution Apparatus',
    type: 'Dissolution',
    manufacturer: 'Sotax',
    model: 'AT Xtend',
    serialNumber: 'DIS11223344',
    location: 'Lab B-202',
    status: 'maintenance',
    lastCalibration: '2024-10-01',
    nextCalibration: '2025-01-01',
    calibrationInterval: 90,
    integrationEnabled: true,
    integrationProtocol: 'LIMS',
    custodian: 'Dr. Emily Rodriguez',
    department: 'Formulation',
  },
];

// v0.13.86: Mock Data Entries (for exp-001)
const mockDataEntries: ELNDataEntry[] = [
  {
    id: 'de-001',
    experimentId: 'exp-001',
    stepId: 'step-001',
    timestamp: '2025-01-06T10:35:00Z',
    entryType: 'instrument',
    fieldName: 'sm1_weight',
    fieldLabel: 'Starting Material Weight',
    value: 502.3,
    unit: 'g',
    expectedMin: 495,
    expectedMax: 505,
    isOutOfSpec: false,
    instrumentId: 'inst-002',
    instrumentName: 'Analytical Balance AB-1',
    rawReading: '502.3456',
    enteredBy: 'Dr. Sarah Chen',
    verifiedBy: 'Dr. James Kim',
    verifiedAt: '2025-01-06T10:40:00Z',
  },
  {
    id: 'de-002',
    experimentId: 'exp-001',
    stepId: 'step-002',
    timestamp: '2025-01-06T11:05:00Z',
    entryType: 'instrument',
    fieldName: 'catalyst_weight',
    fieldLabel: 'Catalyst Weight',
    value: 25.1,
    unit: 'g',
    expectedMin: 24,
    expectedMax: 26,
    isOutOfSpec: false,
    instrumentId: 'inst-002',
    instrumentName: 'Analytical Balance AB-1',
    rawReading: '25.0892',
    enteredBy: 'Dr. Sarah Chen',
  },
  {
    id: 'de-003',
    experimentId: 'exp-001',
    stepId: 'step-003',
    timestamp: '2025-01-06T11:30:00Z',
    entryType: 'manual',
    fieldName: 'initial_temp',
    fieldLabel: 'Initial Temperature',
    value: 23.5,
    unit: '°C',
    enteredBy: 'Dr. Sarah Chen',
  },
  {
    id: 'de-004',
    experimentId: 'exp-001',
    stepId: 'step-003',
    timestamp: '2025-01-06T12:30:00Z',
    entryType: 'manual',
    fieldName: 'reaction_temp_1h',
    fieldLabel: 'Temperature at T+1h',
    value: 64.8,
    unit: '°C',
    expectedMin: 63,
    expectedMax: 67,
    isOutOfSpec: false,
    enteredBy: 'Dr. Sarah Chen',
    notes: 'Stable, no fluctuations observed',
  },
  {
    id: 'de-005',
    experimentId: 'exp-001',
    stepId: 'step-003',
    timestamp: '2025-01-06T14:30:00Z',
    entryType: 'manual',
    fieldName: 'reaction_temp_3h',
    fieldLabel: 'Temperature at T+3h',
    value: 65.2,
    unit: '°C',
    expectedMin: 63,
    expectedMax: 67,
    isOutOfSpec: false,
    enteredBy: 'Dr. Sarah Chen',
  },
  {
    id: 'de-006',
    experimentId: 'exp-001',
    timestamp: '2025-01-06T16:00:00Z',
    entryType: 'calculated',
    fieldName: 'theoretical_yield',
    fieldLabel: 'Theoretical Yield',
    value: 485.2,
    unit: 'g',
    formula: '(sm1_weight * 0.966)',
    referencedEntries: ['de-001'],
    enteredBy: 'System',
  },
];

// v0.13.87: Mock Linkable Records from Other Modules
const mockLinkableCTMSRecords: LinkableCTMSRecord[] = [
  { id: 'ctms-visit-001', type: 'visit', name: 'Visit 1 - Screening', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Completed' },
  { id: 'ctms-visit-002', type: 'visit', name: 'Visit 2 - Baseline', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Scheduled' },
  { id: 'ctms-sample-001', type: 'sample-collection', name: 'PK Sample Day 1', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Collected' },
  { id: 'ctms-sample-002', type: 'sample-collection', name: 'PK Sample Day 7', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Pending' },
  { id: 'ctms-ae-001', type: 'adverse-event', name: 'AE-001: Headache (Mild)', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Resolved' },
  { id: 'ctms-subject-001', type: 'subject', name: 'Subject 001-001', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Active' },
  { id: 'ctms-site-001', type: 'site', name: 'Site 001 - Boston Medical', studyId: 'study-001', studyName: 'LIG-2024-001', status: 'Active' },
];

const mockLinkableTMFArtifacts: LinkableTMFArtifact[] = [
  { id: 'tmf-001', name: 'Investigator Brochure v3.0', zone: 'Zone 01', section: '01.03', documentType: 'Investigator Brochure', status: 'Final' },
  { id: 'tmf-002', name: 'Protocol v2.1', zone: 'Zone 01', section: '01.01', documentType: 'Protocol', status: 'Final' },
  { id: 'tmf-003', name: 'Statistical Analysis Plan', zone: 'Zone 01', section: '01.04', documentType: 'SAP', status: 'Draft' },
  { id: 'tmf-004', name: 'ICF Template v1.2', zone: 'Zone 02', section: '02.01', documentType: 'Informed Consent', status: 'Approved' },
  { id: 'tmf-005', name: 'Lab Manual', zone: 'Zone 04', section: '04.02', documentType: 'Lab Manual', status: 'Final' },
  { id: 'tmf-006', name: 'Monitoring Plan', zone: 'Zone 03', section: '03.01', documentType: 'Monitoring Plan', status: 'Final' },
];

const mockLinkableSafetyReports: LinkableSafetyReport[] = [
  { id: 'safety-001', type: 'ICSR', name: 'ICSR-2025-0001', caseNumber: 'LIG-2024-AE-001', status: 'Submitted' },
  { id: 'safety-002', type: 'ICSR', name: 'ICSR-2025-0002', caseNumber: 'LIG-2024-AE-002', status: 'Draft' },
  { id: 'safety-003', type: 'Signal', name: 'Signal Assessment: Hepatotoxicity', status: 'Under Review' },
  { id: 'safety-004', type: 'PSUR', name: 'PSUR #1 (Jan 2025)', status: 'In Progress' },
  { id: 'safety-005', type: 'DSUR', name: 'DSUR 2024 Annual', status: 'Submitted' },
];

// v0.13.87: Mock Existing Links
const mockCTMSLinks: ELNToCTMSLink[] = [
  {
    id: 'link-ctms-001',
    experimentId: 'exp-001',
    ctmsRecordId: 'ctms-sample-001',
    ctmsRecordType: 'sample-collection',
    ctmsRecordName: 'PK Sample Day 1',
    studyId: 'study-001',
    studyName: 'LIG-2024-001',
    linkedAt: '2025-01-06T12:00:00Z',
    linkedBy: 'Dr. Sarah Chen',
  },
];

const mockTMFLinks: ELNToTMFLink[] = [
  {
    id: 'link-tmf-001',
    experimentId: 'exp-001',
    tmfArtifactId: 'tmf-005',
    tmfArtifactName: 'Lab Manual',
    tmfZone: 'Zone 04',
    tmfSection: '04.02',
    tmfDocumentType: 'Lab Manual',
    linkedAt: '2025-01-06T09:30:00Z',
    linkedBy: 'Dr. Sarah Chen',
  },
];

const mockSafetyLinks: ELNToSafetyLink[] = [];

interface ELNState {
  // Data
  notebooks: ELNNotebook[];
  experiments: ELNExperiment[];
  templates: ELNTemplate[];
  instruments: ELNInstrument[];       // v0.13.86
  dataEntries: ELNDataEntry[];        // v0.13.86
  
  // v0.13.87: Cross-module links
  ctmsLinks: ELNToCTMSLink[];
  tmfLinks: ELNToTMFLink[];
  safetyLinks: ELNToSafetyLink[];
  linkableCTMSRecords: LinkableCTMSRecord[];
  linkableTMFArtifacts: LinkableTMFArtifact[];
  linkableSafetyReports: LinkableSafetyReport[];
  
  // UI State
  selectedNotebookId: string | null;
  selectedExperimentId: string | null;
  viewingExperimentId: string | null;  // v0.13.85: Full detail view
  activeTab: 'dashboard' | 'experiments' | 'notebooks' | 'templates';
  searchQuery: string;
  filterStatus: ExperimentStatus | 'all';
  filterType: ExperimentType | 'all';
  
  // Actions
  setSelectedNotebook: (id: string | null) => void;
  setSelectedExperiment: (id: string | null) => void;
  setViewingExperiment: (id: string | null) => void;  // v0.13.85
  setActiveTab: (tab: 'dashboard' | 'experiments' | 'notebooks' | 'templates') => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: ExperimentStatus | 'all') => void;
  setFilterType: (type: ExperimentType | 'all') => void;
  
  // v0.13.85: Protocol execution
  completeProtocolStep: (experimentId: string, stepId: string, completedBy: string) => void;
  uncompleteProtocolStep: (experimentId: string, stepId: string) => void;
  updateExperimentObservations: (experimentId: string, observations: string) => void;
  updateExperimentResults: (experimentId: string, results: string) => void;
  updateExperimentConclusions: (experimentId: string, conclusions: string) => void;
  
  // v0.13.86: Data capture
  addDataEntry: (entry: Omit<ELNDataEntry, 'id' | 'timestamp'>) => void;
  updateDataEntry: (entryId: string, updates: Partial<ELNDataEntry>) => void;
  deleteDataEntry: (entryId: string) => void;
  verifyDataEntry: (entryId: string, verifiedBy: string) => void;
  captureFromInstrument: (experimentId: string, instrumentId: string, fieldName: string, fieldLabel: string, enteredBy: string) => void;
  
  // v0.13.87: Cross-module linking
  linkToCTMS: (experimentId: string, record: LinkableCTMSRecord, linkedBy: string) => void;
  linkToTMF: (experimentId: string, artifact: LinkableTMFArtifact, linkedBy: string) => void;
  linkToSafety: (experimentId: string, report: LinkableSafetyReport, linkedBy: string) => void;
  unlinkCTMS: (linkId: string) => void;
  unlinkTMF: (linkId: string) => void;
  unlinkSafety: (linkId: string) => void;
  
  // Computed
  getFilteredExperiments: () => ELNExperiment[];
  getDashboardMetrics: () => ELNDashboardMetrics;
  getExperimentsByNotebook: (notebookId: string) => ELNExperiment[];
  getExperimentById: (id: string) => ELNExperiment | undefined;
  getNotebookById: (id: string) => ELNNotebook | undefined;
  getDataEntriesForExperiment: (experimentId: string) => ELNDataEntry[];  // v0.13.86
  getInstrumentById: (id: string) => ELNInstrument | undefined;           // v0.13.86
  getAvailableInstruments: () => ELNInstrument[];                          // v0.13.86
  // v0.13.87: Cross-module link getters
  getCTMSLinksForExperiment: (experimentId: string) => ELNToCTMSLink[];
  getTMFLinksForExperiment: (experimentId: string) => ELNToTMFLink[];
  getSafetyLinksForExperiment: (experimentId: string) => ELNToSafetyLink[];
  getUnlinkedCTMSRecords: (experimentId: string) => LinkableCTMSRecord[];
  getUnlinkedTMFArtifacts: (experimentId: string) => LinkableTMFArtifact[];
  getUnlinkedSafetyReports: (experimentId: string) => LinkableSafetyReport[];
}

export const useELNStore = create<ELNState>((set, get) => ({
  // Initial data
  notebooks: mockNotebooks,
  experiments: mockExperiments,
  templates: mockTemplates,
  instruments: mockInstruments,     // v0.13.86
  dataEntries: mockDataEntries,     // v0.13.86
  
  // v0.13.87: Cross-module links
  ctmsLinks: mockCTMSLinks,
  tmfLinks: mockTMFLinks,
  safetyLinks: mockSafetyLinks,
  linkableCTMSRecords: mockLinkableCTMSRecords,
  linkableTMFArtifacts: mockLinkableTMFArtifacts,
  linkableSafetyReports: mockLinkableSafetyReports,
  
  // Initial UI state
  selectedNotebookId: null,
  selectedExperimentId: null,
  viewingExperimentId: null,  // v0.13.85
  activeTab: 'dashboard',
  searchQuery: '',
  filterStatus: 'all',
  filterType: 'all',
  
  // Actions
  setSelectedNotebook: (id) => set({ selectedNotebookId: id }),
  setSelectedExperiment: (id) => set({ selectedExperimentId: id }),
  setViewingExperiment: (id) => set({ viewingExperimentId: id }),  // v0.13.85
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterType: (type) => set({ filterType: type }),
  
  // v0.13.85: Protocol execution actions
  completeProtocolStep: (experimentId, stepId, completedBy) => set((state) => ({
    experiments: state.experiments.map((exp) => {
      if (exp.id !== experimentId) return exp;
      return {
        ...exp,
        procedures: exp.procedures.map((step) => {
          if (step.id !== stepId) return step;
          return {
            ...step,
            completedAt: new Date().toISOString(),
            completedBy,
          };
        }),
        modifiedAt: new Date().toISOString(),
      };
    }),
  })),
  
  uncompleteProtocolStep: (experimentId, stepId) => set((state) => ({
    experiments: state.experiments.map((exp) => {
      if (exp.id !== experimentId) return exp;
      return {
        ...exp,
        procedures: exp.procedures.map((step) => {
          if (step.id !== stepId) return step;
          return {
            ...step,
            completedAt: undefined,
            completedBy: undefined,
          };
        }),
        modifiedAt: new Date().toISOString(),
      };
    }),
  })),
  
  updateExperimentObservations: (experimentId, observations) => set((state) => ({
    experiments: state.experiments.map((exp) => {
      if (exp.id !== experimentId) return exp;
      return { ...exp, observations, modifiedAt: new Date().toISOString() };
    }),
  })),
  
  updateExperimentResults: (experimentId, results) => set((state) => ({
    experiments: state.experiments.map((exp) => {
      if (exp.id !== experimentId) return exp;
      return { ...exp, results, modifiedAt: new Date().toISOString() };
    }),
  })),
  
  updateExperimentConclusions: (experimentId, conclusions) => set((state) => ({
    experiments: state.experiments.map((exp) => {
      if (exp.id !== experimentId) return exp;
      return { ...exp, conclusions, modifiedAt: new Date().toISOString() };
    }),
  })),
  
  // v0.13.86: Data capture actions
  addDataEntry: (entry) => set((state) => ({
    dataEntries: [
      ...state.dataEntries,
      {
        ...entry,
        id: `de-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    ],
  })),
  
  updateDataEntry: (entryId, updates) => set((state) => ({
    dataEntries: state.dataEntries.map((entry) => {
      if (entry.id !== entryId) return entry;
      return { ...entry, ...updates };
    }),
  })),
  
  deleteDataEntry: (entryId) => set((state) => ({
    dataEntries: state.dataEntries.filter((entry) => entry.id !== entryId),
  })),
  
  verifyDataEntry: (entryId, verifiedBy) => set((state) => ({
    dataEntries: state.dataEntries.map((entry) => {
      if (entry.id !== entryId) return entry;
      return {
        ...entry,
        verifiedBy,
        verifiedAt: new Date().toISOString(),
      };
    }),
  })),
  
  captureFromInstrument: (experimentId, instrumentId, fieldName, fieldLabel, enteredBy) => {
    const instrument = get().instruments.find((i) => i.id === instrumentId);
    if (!instrument) return;
    
    // Simulate instrument reading (in real app, this would call instrument API)
    const simulatedValue = Math.random() * 100;
    const simulatedRaw = simulatedValue.toFixed(4);
    
    set((state) => ({
      dataEntries: [
        ...state.dataEntries,
        {
          id: `de-${Date.now()}`,
          experimentId,
          timestamp: new Date().toISOString(),
          entryType: 'instrument' as const,
          fieldName,
          fieldLabel,
          value: parseFloat(simulatedValue.toFixed(2)),
          instrumentId,
          instrumentName: instrument.name,
          rawReading: simulatedRaw,
          enteredBy,
        },
      ],
    }));
  },
  
  // v0.13.87: Cross-module linking actions
  linkToCTMS: (experimentId, record, linkedBy) => set((state) => ({
    ctmsLinks: [
      ...state.ctmsLinks,
      {
        id: `link-ctms-${Date.now()}`,
        experimentId,
        ctmsRecordId: record.id,
        ctmsRecordType: record.type,
        ctmsRecordName: record.name,
        studyId: record.studyId,
        studyName: record.studyName,
        linkedAt: new Date().toISOString(),
        linkedBy,
      },
    ],
  })),
  
  linkToTMF: (experimentId, artifact, linkedBy) => set((state) => ({
    tmfLinks: [
      ...state.tmfLinks,
      {
        id: `link-tmf-${Date.now()}`,
        experimentId,
        tmfArtifactId: artifact.id,
        tmfArtifactName: artifact.name,
        tmfZone: artifact.zone,
        tmfSection: artifact.section,
        tmfDocumentType: artifact.documentType,
        linkedAt: new Date().toISOString(),
        linkedBy,
      },
    ],
  })),
  
  linkToSafety: (experimentId, report, linkedBy) => set((state) => ({
    safetyLinks: [
      ...state.safetyLinks,
      {
        id: `link-safety-${Date.now()}`,
        experimentId,
        safetyReportId: report.id,
        safetyReportName: report.name,
        reportType: report.type,
        caseNumber: report.caseNumber,
        linkedAt: new Date().toISOString(),
        linkedBy,
      },
    ],
  })),
  
  unlinkCTMS: (linkId) => set((state) => ({
    ctmsLinks: state.ctmsLinks.filter((l) => l.id !== linkId),
  })),
  
  unlinkTMF: (linkId) => set((state) => ({
    tmfLinks: state.tmfLinks.filter((l) => l.id !== linkId),
  })),
  
  unlinkSafety: (linkId) => set((state) => ({
    safetyLinks: state.safetyLinks.filter((l) => l.id !== linkId),
  })),
  
  // Computed
  getFilteredExperiments: () => {
    const { experiments, searchQuery, filterStatus, filterType, selectedNotebookId } = get();
    
    return experiments.filter((exp) => {
      // Filter by notebook if selected
      if (selectedNotebookId && exp.notebookId !== selectedNotebookId) return false;
      
      // Filter by status
      if (filterStatus !== 'all' && exp.status !== filterStatus) return false;
      
      // Filter by type
      if (filterType !== 'all' && exp.type !== filterType) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          exp.title.toLowerCase().includes(query) ||
          exp.author.toLowerCase().includes(query) ||
          exp.projectName.toLowerCase().includes(query) ||
          exp.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  },
  
  getDashboardMetrics: () => {
    const { experiments } = get();
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const experimentsByType: Record<ExperimentType, number> = {
      synthesis: 0,
      assay: 0,
      formulation: 0,
      stability: 0,
      analytical: 0,
      bioanalytical: 0,
      'cell-culture': 0,
      'animal-study': 0,
      'process-development': 0,
      other: 0,
    };
    
    const experimentsByStatus: Record<ExperimentStatus, number> = {
      draft: 0,
      'in-progress': 0,
      completed: 0,
      reviewed: 0,
      approved: 0,
      archived: 0,
    };
    
    let completedThisMonth = 0;
    let pendingReview = 0;
    let pendingSignature = 0;
    
    experiments.forEach((exp) => {
      experimentsByType[exp.type]++;
      experimentsByStatus[exp.status]++;
      
      if (exp.completionDate) {
        const completionDate = new Date(exp.completionDate);
        if (completionDate >= monthStart) {
          completedThisMonth++;
        }
      }
      
      if (exp.status === 'completed') pendingReview++;
      if (exp.signatureStatus === 'unsigned' && exp.status !== 'draft') pendingSignature++;
    });
    
    return {
      totalExperiments: experiments.length,
      activeExperiments: experiments.filter((e) => e.status === 'in-progress').length,
      completedThisMonth,
      pendingReview,
      pendingSignature,
      overdueExperiments: 0, // Would calculate based on due dates
      experimentsByType,
      experimentsByStatus,
      recentActivity: mockRecentActivity,
    };
  },
  
  getExperimentsByNotebook: (notebookId) => {
    return get().experiments.filter((e) => e.notebookId === notebookId);
  },
  
  getExperimentById: (id) => {
    return get().experiments.find((e) => e.id === id);
  },
  
  getNotebookById: (id) => {
    return get().notebooks.find((n) => n.id === id);
  },
  
  // v0.13.86: Data entry computed functions
  getDataEntriesForExperiment: (experimentId) => {
    return get().dataEntries.filter((e) => e.experimentId === experimentId);
  },
  
  getInstrumentById: (id) => {
    return get().instruments.find((i) => i.id === id);
  },
  
  getAvailableInstruments: () => {
    return get().instruments.filter((i) => i.status === 'available');
  },
  
  // v0.13.87: Cross-module link computed functions
  getCTMSLinksForExperiment: (experimentId) => {
    return get().ctmsLinks.filter((l) => l.experimentId === experimentId);
  },
  
  getTMFLinksForExperiment: (experimentId) => {
    return get().tmfLinks.filter((l) => l.experimentId === experimentId);
  },
  
  getSafetyLinksForExperiment: (experimentId) => {
    return get().safetyLinks.filter((l) => l.experimentId === experimentId);
  },
  
  getUnlinkedCTMSRecords: (experimentId) => {
    const linkedIds = get().ctmsLinks
      .filter((l) => l.experimentId === experimentId)
      .map((l) => l.ctmsRecordId);
    return get().linkableCTMSRecords.filter((r) => !linkedIds.includes(r.id));
  },
  
  getUnlinkedTMFArtifacts: (experimentId) => {
    const linkedIds = get().tmfLinks
      .filter((l) => l.experimentId === experimentId)
      .map((l) => l.tmfArtifactId);
    return get().linkableTMFArtifacts.filter((a) => !linkedIds.includes(a.id));
  },
  
  getUnlinkedSafetyReports: (experimentId) => {
    const linkedIds = get().safetyLinks
      .filter((l) => l.experimentId === experimentId)
      .map((l) => l.safetyReportId);
    return get().linkableSafetyReports.filter((r) => !linkedIds.includes(r.id));
  },
}));
