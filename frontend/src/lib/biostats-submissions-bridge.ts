
// =============================================================================
// BIOSTATS → SUBMISSIONS BRIDGE — v0.42.46
// =============================================================================
// Cross-module data flow from Biostatistics TLF outputs to eCTD submission
// assembly. Maps QC-passed tables, listings, and figures to eCTD Module 5
// (Clinical Study Reports) sections per ICH M4 structure.
//
// Key concept: TLFs that pass QC become deliverables for Module 5 of an eCTD
// submission. This bridge tracks which TLFs are submission-ready, maps them
// to the correct eCTD location, and provides readiness metrics.
// =============================================================================

import { useBiostatsStore } from '@/store/useBiostatsStore';
import type { TLFOutput, TLFType, AnalysisPopulation, StatisticalAnalysisPlan } from '@/store/useBiostatsStore';

// =============================================================================
// eCTD MODULE 5 MAPPING TABLE
// =============================================================================
// ICH M4 Clinical Study Report structure for statistical outputs.

export interface ECTDMapping {
  tlfType: TLFType;
  population: AnalysisPopulation;
  ectdModule: string;
  ectdSection: string;
  ectdTitle: string;
  priority: 'critical' | 'supporting' | 'appendix';
}

export const ECTD_MODULE5_MAPPINGS: ECTDMapping[] = [
  // Primary efficacy tables → 5.3.5.1
  { tlfType: 'table', population: 'ITT', ectdModule: '5.3.5.1', ectdSection: 'efficacy-tables', ectdTitle: 'Tabular Listing of Efficacy Data (ITT)', priority: 'critical' },
  { tlfType: 'table', population: 'mITT', ectdModule: '5.3.5.1', ectdSection: 'efficacy-tables', ectdTitle: 'Tabular Listing of Efficacy Data (mITT)', priority: 'critical' },
  { tlfType: 'table', population: 'PP', ectdModule: '5.3.5.1', ectdSection: 'efficacy-tables', ectdTitle: 'Tabular Listing of Efficacy Data (PP)', priority: 'supporting' },

  // Safety tables → 5.3.5.3
  { tlfType: 'table', population: 'Safety', ectdModule: '5.3.5.3', ectdSection: 'safety-tables', ectdTitle: 'Tabular Listing of Safety Data', priority: 'critical' },

  // PK tables → 5.3.3
  { tlfType: 'table', population: 'PK', ectdModule: '5.3.3', ectdSection: 'pk-tables', ectdTitle: 'PK Data Tables', priority: 'supporting' },
  { tlfType: 'table', population: 'PD', ectdModule: '5.3.4', ectdSection: 'pd-tables', ectdTitle: 'PD Data Tables', priority: 'supporting' },

  // Figures → same module as tables, figures subsection
  { tlfType: 'figure', population: 'ITT', ectdModule: '5.3.5.1', ectdSection: 'efficacy-figures', ectdTitle: 'Efficacy Figures (ITT)', priority: 'critical' },
  { tlfType: 'figure', population: 'mITT', ectdModule: '5.3.5.1', ectdSection: 'efficacy-figures', ectdTitle: 'Efficacy Figures (mITT)', priority: 'supporting' },
  { tlfType: 'figure', population: 'Safety', ectdModule: '5.3.5.3', ectdSection: 'safety-figures', ectdTitle: 'Safety Figures', priority: 'critical' },
  { tlfType: 'figure', population: 'PK', ectdModule: '5.3.3', ectdSection: 'pk-figures', ectdTitle: 'PK Figures', priority: 'supporting' },

  // Listings → appendix
  { tlfType: 'listing', population: 'ITT', ectdModule: '5.3.7', ectdSection: 'patient-listings', ectdTitle: 'Individual Patient Data Listings (ITT)', priority: 'appendix' },
  { tlfType: 'listing', population: 'Safety', ectdModule: '5.3.7', ectdSection: 'safety-listings', ectdTitle: 'Individual Patient Safety Listings', priority: 'appendix' },
  { tlfType: 'listing', population: 'PK', ectdModule: '5.3.7', ectdSection: 'pk-listings', ectdTitle: 'PK Data Listings', priority: 'appendix' },

  // Catch-all for custom populations
  { tlfType: 'table', population: 'Custom', ectdModule: '5.3.5.1', ectdSection: 'additional-tables', ectdTitle: 'Additional Statistical Tables', priority: 'supporting' },
  { tlfType: 'figure', population: 'Custom', ectdModule: '5.3.5.1', ectdSection: 'additional-figures', ectdTitle: 'Additional Statistical Figures', priority: 'supporting' },
  { tlfType: 'listing', population: 'Custom', ectdModule: '5.3.7', ectdSection: 'additional-listings', ectdTitle: 'Additional Data Listings', priority: 'appendix' },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

export function getECTDMapping(tlfType: TLFType, population: AnalysisPopulation): ECTDMapping | null {
  return ECTD_MODULE5_MAPPINGS.find(m => m.tlfType === tlfType && m.population === population) ?? null;
}

export function getECTDModule(tlfType: TLFType, population: AnalysisPopulation): string {
  const mapping = getECTDMapping(tlfType, population);
  return mapping?.ectdModule ?? '5.3.5.1'; // Default to efficacy
}

export function getMappingsForModule(ectdModule: string): ECTDMapping[] {
  return ECTD_MODULE5_MAPPINGS.filter(m => m.ectdModule === ectdModule);
}

// =============================================================================
// SUBMISSION READINESS
// =============================================================================

export type SubmissionReadinessLevel = 'ready' | 'partial' | 'not-ready' | 'no-data';

export interface TLFSubmissionStatus {
  tlfId: string;
  tlfNumber: string;
  tlfTitle: string;
  tlfType: TLFType;
  population: AnalysisPopulation;
  qcStatus: string;
  isSubmissionReady: boolean;
  ectdModule: string;
  ectdSection: string;
  priority: 'critical' | 'supporting' | 'appendix';
}

export interface SubmissionReadinessReport {
  sapId: string;
  sapTitle: string;
  totalTLFs: number;
  submissionReady: number;
  criticalReady: number;
  criticalTotal: number;
  supportingReady: number;
  supportingTotal: number;
  appendixReady: number;
  appendixTotal: number;
  readinessLevel: SubmissionReadinessLevel;
  tlfStatuses: TLFSubmissionStatus[];
  ectdModuleCoverage: Record<string, { ready: number; total: number }>;
}

/**
 * Get submission-ready TLFs (QC passed or final status).
 */
export function getSubmissionReadyTLFs(): TLFOutput[] {
  const { tlfOutputs } = useBiostatsStore.getState();
  return Object.values(tlfOutputs).filter(
    tlf => tlf.qcStatus === 'passed' || tlf.status === 'final'
  );
}

/**
 * Get all TLFs mapped to their eCTD locations with readiness status.
 */
export function getTLFSubmissionStatuses(): TLFSubmissionStatus[] {
  const { tlfOutputs } = useBiostatsStore.getState();
  return Object.values(tlfOutputs).map(tlf => {
    const mapping = getECTDMapping(tlf.type, tlf.population);
    const isReady = tlf.qcStatus === 'passed' || tlf.status === 'final';
    return {
      tlfId: tlf.id,
      tlfNumber: tlf.number,
      tlfTitle: tlf.title,
      tlfType: tlf.type,
      population: tlf.population,
      qcStatus: tlf.qcStatus,
      isSubmissionReady: isReady,
      ectdModule: mapping?.ectdModule ?? '5.3.5.1',
      ectdSection: mapping?.ectdSection ?? 'additional-tables',
      priority: mapping?.priority ?? 'supporting',
    };
  });
}

/**
 * Generate a comprehensive submission readiness report for a given SAP.
 * This is the "R&D Connected" moment — biostats data flowing into submissions.
 */
export function getSubmissionReadinessReport(sapId: string): SubmissionReadinessReport {
  const store = useBiostatsStore.getState();
  const sap = store.saps[sapId];

  if (!sap) {
    return {
      sapId,
      sapTitle: 'Unknown SAP',
      totalTLFs: 0,
      submissionReady: 0,
      criticalReady: 0,
      criticalTotal: 0,
      supportingReady: 0,
      supportingTotal: 0,
      appendixReady: 0,
      appendixTotal: 0,
      readinessLevel: 'no-data',
      tlfStatuses: [],
      ectdModuleCoverage: {},
    };
  }

  const sapTLFs = Object.values(store.tlfOutputs).filter(t => t.sapId === sapId);
  const statuses = sapTLFs.map(tlf => {
    const mapping = getECTDMapping(tlf.type, tlf.population);
    const isReady = tlf.qcStatus === 'passed' || tlf.status === 'final';
    return {
      tlfId: tlf.id,
      tlfNumber: tlf.number,
      tlfTitle: tlf.title,
      tlfType: tlf.type,
      population: tlf.population,
      qcStatus: tlf.qcStatus,
      isSubmissionReady: isReady,
      ectdModule: mapping?.ectdModule ?? '5.3.5.1',
      ectdSection: mapping?.ectdSection ?? 'additional-tables',
      priority: mapping?.priority ?? 'supporting',
    };
  });

  const criticalStatuses = statuses.filter(s => s.priority === 'critical');
  const supportingStatuses = statuses.filter(s => s.priority === 'supporting');
  const appendixStatuses = statuses.filter(s => s.priority === 'appendix');

  const criticalReady = criticalStatuses.filter(s => s.isSubmissionReady).length;
  const supportingReady = supportingStatuses.filter(s => s.isSubmissionReady).length;
  const appendixReady = appendixStatuses.filter(s => s.isSubmissionReady).length;
  const totalReady = statuses.filter(s => s.isSubmissionReady).length;

  // eCTD module coverage
  const moduleCoverage: Record<string, { ready: number; total: number }> = {};
  for (const s of statuses) {
    if (!moduleCoverage[s.ectdModule]) {
      moduleCoverage[s.ectdModule] = { ready: 0, total: 0 };
    }
    moduleCoverage[s.ectdModule].total++;
    if (s.isSubmissionReady) moduleCoverage[s.ectdModule].ready++;
  }

  // Determine readiness level
  let readinessLevel: SubmissionReadinessLevel;
  if (sapTLFs.length === 0) {
    readinessLevel = 'no-data';
  } else if (criticalReady === criticalStatuses.length && criticalStatuses.length > 0) {
    readinessLevel = totalReady === sapTLFs.length ? 'ready' : 'partial';
  } else {
    readinessLevel = 'not-ready';
  }

  return {
    sapId,
    sapTitle: sap.title,
    totalTLFs: sapTLFs.length,
    submissionReady: totalReady,
    criticalReady,
    criticalTotal: criticalStatuses.length,
    supportingReady,
    supportingTotal: supportingStatuses.length,
    appendixReady,
    appendixTotal: appendixStatuses.length,
    readinessLevel,
    tlfStatuses: statuses,
    ectdModuleCoverage: moduleCoverage,
  };
}
