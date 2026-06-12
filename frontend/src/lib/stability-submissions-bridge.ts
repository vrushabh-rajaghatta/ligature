
// =============================================================================
// STABILITY → SUBMISSIONS BRIDGE — v0.42.47
// =============================================================================
// Cross-module data flow from ICH Q1 Stability studies to eCTD submissions.
// Maps stability data, shelf-life predictions, and OOS investigations to
// eCTD Module 3.2.P.8 (Stability) sections per ICH CTD structure.
//
// Key concept: Completed stability studies with all timepoint data become
// deliverables for Module 3.2.P.8 of an eCTD submission. This bridge tracks
// which studies are submission-ready and maps data to the correct eCTD section.
// =============================================================================

import { useStabilityStore } from '@/store/useStabilityStore';
import type {
  StabilityStudy,
  StabilityProtocol,
  StabilityDataPoint,
  ShelfLifePrediction,
  OOSInvestigation,
  StudyType,
  StorageCondition,
} from '@/store/useStabilityStore';

// =============================================================================
// eCTD MODULE 3.2.P.8 MAPPING TABLE
// =============================================================================
// ICH M4Q quality module structure for stability data.

export interface StabilityECTDMapping {
  studyType: StudyType;
  ectdModule: string;
  ectdSection: string;
  ectdTitle: string;
  ichGuideline: string;
  priority: 'required' | 'supporting' | 'optional';
}

export const ECTD_STABILITY_MAPPINGS: StabilityECTDMapping[] = [
  // Required studies for registration
  { studyType: 'long-term', ectdModule: '3.2.P.8.1', ectdSection: 'stability-summary', ectdTitle: 'Stability Summary and Conclusion', ichGuideline: 'ICH Q1A(R2)', priority: 'required' },
  { studyType: 'accelerated', ectdModule: '3.2.P.8.1', ectdSection: 'stability-summary', ectdTitle: 'Accelerated Stability Data', ichGuideline: 'ICH Q1A(R2)', priority: 'required' },
  { studyType: 'intermediate', ectdModule: '3.2.P.8.1', ectdSection: 'stability-summary', ectdTitle: 'Intermediate Condition Data', ichGuideline: 'ICH Q1A(R2)', priority: 'supporting' },

  // Post-approval commitment studies
  { studyType: 'long-term', ectdModule: '3.2.P.8.2', ectdSection: 'post-approval-stability', ectdTitle: 'Post-Approval Stability Protocol and Commitment', ichGuideline: 'ICH Q1A(R2)', priority: 'required' },

  // Photostability
  { studyType: 'photostability', ectdModule: '3.2.P.8.3', ectdSection: 'photostability', ectdTitle: 'Photostability Study Data', ichGuideline: 'ICH Q1B', priority: 'supporting' },

  // Stress/forced degradation
  { studyType: 'stress', ectdModule: '3.2.P.8.1', ectdSection: 'stress-testing', ectdTitle: 'Stress Testing / Forced Degradation Data', ichGuideline: 'ICH Q1A(R2) §2.1.2', priority: 'supporting' },
  { studyType: 'forced-degradation', ectdModule: '3.2.P.8.1', ectdSection: 'stress-testing', ectdTitle: 'Forced Degradation Pathway Data', ichGuideline: 'ICH Q1A(R2)', priority: 'supporting' },

  // In-use stability
  { studyType: 'in-use', ectdModule: '3.2.P.8.1', ectdSection: 'in-use-stability', ectdTitle: 'In-Use Stability Data', ichGuideline: 'ICH Q1A(R2)', priority: 'optional' },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

export function getStabilityECTDMapping(studyType: StudyType): StabilityECTDMapping | null {
  return ECTD_STABILITY_MAPPINGS.find(m => m.studyType === studyType) ?? null;
}

export function getECTDModuleForStudy(studyType: StudyType): string {
  const mapping = getStabilityECTDMapping(studyType);
  return mapping?.ectdModule ?? '3.2.P.8.1';
}

export function getRequiredStudyTypes(): StudyType[] {
  return ECTD_STABILITY_MAPPINGS
    .filter(m => m.priority === 'required')
    .map(m => m.studyType);
}

export function getMappingsForPriority(priority: 'required' | 'supporting' | 'optional'): StabilityECTDMapping[] {
  return ECTD_STABILITY_MAPPINGS.filter(m => m.priority === priority);
}

// =============================================================================
// STUDY SUBMISSION STATUS
// =============================================================================

export type StudySubmissionReadiness = 'ready' | 'partial' | 'not-ready' | 'no-data';

export interface StudySubmissionStatus {
  studyId: string;
  productName: string;
  batchNumber: string;
  studyType: StudyType;
  condition: StorageCondition;
  status: string;
  dataPointCount: number;
  timePointsCovered: number;
  timePointsTotal: number;
  hasOOS: boolean;
  openOOSCount: number;
  hasPrediction: boolean;
  predictedShelfLife: number | null;
  isSubmissionReady: boolean;
  ectdModule: string;
  ectdSection: string;
  priority: 'required' | 'supporting' | 'optional';
  ichGuideline: string;
}

export interface StabilitySubmissionReport {
  productId: string;
  totalStudies: number;
  submissionReady: number;
  requiredReady: number;
  requiredTotal: number;
  supportingReady: number;
  supportingTotal: number;
  optionalReady: number;
  optionalTotal: number;
  readinessLevel: StudySubmissionReadiness;
  openOOSCount: number;
  studyStatuses: StudySubmissionStatus[];
  conditionCoverage: Record<string, { ready: number; total: number }>;
  batchCoverage: number;
}

// =============================================================================
// READINESS ASSESSMENT
// =============================================================================

/**
 * Determine if a study is submission-ready.
 * A study is ready when: completed, has data for all timepoints,
 * no open OOS investigations, and within-spec results.
 */
export function isStudySubmissionReady(studyId: string): boolean {
  const store = useStabilityStore.getState();
  const study = store.studies[studyId];
  if (!study) return false;

  // Must be completed or active with sufficient data
  if (study.status !== 'completed' && study.status !== 'active') return false;

  const dataPoints = store.getDataByStudy(studyId);
  if (dataPoints.length === 0) return false;

  // Check timepoint coverage
  const coveredTimepoints = new Set(dataPoints.map(dp => dp.timePointMonths));
  const expectedTimepoints = study.timePoints;
  const coverage = coveredTimepoints.size / Math.max(expectedTimepoints.length, 1);

  // For completed studies, need full coverage; for active, need ≥50%
  if (study.status === 'completed' && coverage < 1) return false;
  if (study.status === 'active' && coverage < 0.5) return false;

  // No open OOS investigations
  const openOOS = Object.values(store.oosInvestigations)
    .filter(o => o.studyId === studyId && (o.status === 'open' || o.status === 'investigation'));
  if (openOOS.length > 0) return false;

  return true;
}

/**
 * Get submission status for all studies for a given product.
 */
export function getStudySubmissionStatuses(productId?: string): StudySubmissionStatus[] {
  const store = useStabilityStore.getState();
  const studies = productId
    ? store.getStudiesByProduct(productId)
    : Object.values(store.studies);

  return studies.map(study => {
    const mapping = getStabilityECTDMapping(study.studyType);
    const dataPoints = store.getDataByStudy(study.id);
    const coveredTimepoints = new Set(dataPoints.map(dp => dp.timePointMonths));
    const openOOS = Object.values(store.oosInvestigations)
      .filter(o => o.studyId === study.id && (o.status === 'open' || o.status === 'investigation'));
    const predictions = store.getPredictionsByStudy(study.id);
    const latestPrediction = predictions.length > 0
      ? predictions.sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt))[0]
      : null;

    return {
      studyId: study.id,
      productName: study.productName,
      batchNumber: study.batchNumber,
      studyType: study.studyType,
      condition: study.condition,
      status: study.status,
      dataPointCount: dataPoints.length,
      timePointsCovered: coveredTimepoints.size,
      timePointsTotal: study.timePoints.length,
      hasOOS: openOOS.length > 0,
      openOOSCount: openOOS.length,
      hasPrediction: !!latestPrediction,
      predictedShelfLife: latestPrediction?.predictedShelfLife ?? null,
      isSubmissionReady: isStudySubmissionReady(study.id),
      ectdModule: mapping?.ectdModule ?? '3.2.P.8.1',
      ectdSection: mapping?.ectdSection ?? 'stability-summary',
      priority: mapping?.priority ?? 'supporting',
      ichGuideline: mapping?.ichGuideline ?? 'ICH Q1A(R2)',
    };
  });
}

/**
 * Generate a comprehensive stability submission readiness report.
 */
export function getStabilitySubmissionReport(productId: string): StabilitySubmissionReport {
  const store = useStabilityStore.getState();
  const studies = store.getStudiesByProduct(productId);

  if (studies.length === 0) {
    return {
      productId,
      totalStudies: 0,
      submissionReady: 0,
      requiredReady: 0,
      requiredTotal: 0,
      supportingReady: 0,
      supportingTotal: 0,
      optionalReady: 0,
      optionalTotal: 0,
      readinessLevel: 'no-data',
      openOOSCount: 0,
      studyStatuses: [],
      conditionCoverage: {},
      batchCoverage: 0,
    };
  }

  const statuses = getStudySubmissionStatuses(productId);

  const requiredStatuses = statuses.filter(s => s.priority === 'required');
  const supportingStatuses = statuses.filter(s => s.priority === 'supporting');
  const optionalStatuses = statuses.filter(s => s.priority === 'optional');

  const requiredReady = requiredStatuses.filter(s => s.isSubmissionReady).length;
  const supportingReady = supportingStatuses.filter(s => s.isSubmissionReady).length;
  const optionalReady = optionalStatuses.filter(s => s.isSubmissionReady).length;
  const totalReady = statuses.filter(s => s.isSubmissionReady).length;

  const openOOSCount = statuses.reduce((sum, s) => sum + s.openOOSCount, 0);

  // Condition coverage
  const conditionCoverage: Record<string, { ready: number; total: number }> = {};
  for (const s of statuses) {
    if (!conditionCoverage[s.condition]) {
      conditionCoverage[s.condition] = { ready: 0, total: 0 };
    }
    conditionCoverage[s.condition].total++;
    if (s.isSubmissionReady) conditionCoverage[s.condition].ready++;
  }

  // Batch coverage
  const uniqueBatches = new Set(studies.map(s => s.batchId));

  // Readiness level
  let readinessLevel: StudySubmissionReadiness;
  if (requiredReady === requiredStatuses.length && requiredStatuses.length > 0 && openOOSCount === 0) {
    readinessLevel = totalReady === statuses.length ? 'ready' : 'partial';
  } else if (totalReady > 0) {
    readinessLevel = 'partial';
  } else {
    readinessLevel = 'not-ready';
  }

  return {
    productId,
    totalStudies: studies.length,
    submissionReady: totalReady,
    requiredReady,
    requiredTotal: requiredStatuses.length,
    supportingReady,
    supportingTotal: supportingStatuses.length,
    optionalReady,
    optionalTotal: optionalStatuses.length,
    readinessLevel,
    openOOSCount,
    studyStatuses: statuses,
    conditionCoverage,
    batchCoverage: uniqueBatches.size,
  };
}
