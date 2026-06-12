

import { create } from 'zustand';

// ============================================================================
// STABILITY STORE - ICH Q1 Stability Study Management
// ============================================================================
// Manages stability studies, protocols, time-point data, out-of-spec (OOS)
// investigations, shelf-life predictions, and regulatory submission data
// per ICH Q1A–Q1E guidelines.
// ============================================================================

export type StabilityView = 'dashboard' | 'studies' | 'protocols' | 'data' | 'trends' | 'oos' | 'reports';

export type StudyType = 'long-term' | 'intermediate' | 'accelerated' | 'stress' | 'photostability' | 'in-use' | 'forced-degradation';
export type StudyStatus = 'planned' | 'active' | 'on-hold' | 'completed' | 'cancelled';
export type StorageCondition = '25C/60RH' | '30C/65RH' | '30C/75RH' | '40C/75RH' | '5C' | '-20C' | 'ambient' | 'custom';
export type PackagingConfig = 'primary' | 'bulk' | 'stability-chamber' | 'inverted' | 'upright' | 'with-desiccant';
export type OOSStatus = 'open' | 'investigation' | 'confirmed-oos' | 'confirmed-within-spec' | 'closed';
export type TestParameter = 'assay' | 'degradation-products' | 'dissolution' | 'water-content' | 'appearance' | 'pH' | 'microbial-limits' | 'particle-size' | 'hardness' | 'friability' | 'related-substances' | 'custom';

export interface StabilityStudy {
  id: string;
  protocolId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  studyType: StudyType;
  status: StudyStatus;
  condition: StorageCondition;
  customCondition: string | null;
  packaging: PackagingConfig;
  startDate: string;
  endDate: string | null;
  timePoints: number[]; // months
  orientation: 'upright' | 'inverted' | 'both' | 'na';
  chamberNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StabilityProtocol {
  id: string;
  title: string;
  productId: string;
  version: string;
  status: 'draft' | 'approved' | 'amended' | 'retired';
  studyTypes: StudyType[];
  conditions: StorageCondition[];
  timePointsMonths: number[];
  testParameters: TestParameterDef[];
  batchRequirements: { minBatches: number; scaleRequirement: string };
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestParameterDef {
  id: string;
  parameter: TestParameter;
  customName: string | null;
  method: string;
  specification: string;
  unit: string;
  lowerLimit: number | null;
  upperLimit: number | null;
  targetValue: number | null;
}

export interface StabilityDataPoint {
  id: string;
  studyId: string;
  timePointMonths: number;
  parameterId: string;
  parameterName: string;
  value: number;
  unit: string;
  specification: string;
  withinSpec: boolean;
  testedDate: string;
  testedBy: string;
  notes: string | null;
}

export interface OOSInvestigation {
  id: string;
  studyId: string;
  dataPointId: string;
  parameter: string;
  observedValue: number;
  specLimit: string;
  status: OOSStatus;
  rootCause: string | null;
  correctiveAction: string | null;
  investigator: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface ShelfLifePrediction {
  id: string;
  studyId: string;
  parameter: string;
  method: 'linear-regression' | 'arrhenius' | 'bracketing' | 'matrixing';
  predictedShelfLife: number; // months
  confidence: number; // 0-1
  r2: number;
  slope: number;
  intercept: number;
  calculatedAt: string;
}

interface StabilityState {
  activeView: StabilityView;
  selectedStudyId: string | null;
  studies: Record<string, StabilityStudy>;
  protocols: Record<string, StabilityProtocol>;
  dataPoints: Record<string, StabilityDataPoint>;
  oosInvestigations: Record<string, OOSInvestigation>;
  predictions: Record<string, ShelfLifePrediction>;
  isLoading: boolean;
  error: string | null;
}

interface StabilityActions {
  setActiveView: (view: StabilityView) => void;
  setSelectedStudy: (id: string | null) => void;

  // Protocol management
  createProtocol: (data: Partial<StabilityProtocol>) => StabilityProtocol;
  updateProtocol: (id: string, updates: Partial<StabilityProtocol>) => void;
  approveProtocol: (id: string, approvedBy: string) => void;

  // Study management
  createStudy: (data: Partial<StabilityStudy>) => StabilityStudy;
  updateStudy: (id: string, updates: Partial<StabilityStudy>) => void;
  startStudy: (id: string) => void;
  completeStudy: (id: string) => void;
  cancelStudy: (id: string) => void;

  // Data entry
  addDataPoint: (data: Partial<StabilityDataPoint>) => StabilityDataPoint;
  updateDataPoint: (id: string, updates: Partial<StabilityDataPoint>) => void;
  deleteDataPoint: (id: string) => void;
  getDataByStudy: (studyId: string) => StabilityDataPoint[];
  getDataByTimePoint: (studyId: string, timePoint: number) => StabilityDataPoint[];

  // OOS management
  createOOS: (data: Partial<OOSInvestigation>) => OOSInvestigation;
  updateOOS: (id: string, updates: Partial<OOSInvestigation>) => void;
  closeOOS: (id: string, rootCause: string, correctiveAction: string) => void;
  getOpenOOS: () => OOSInvestigation[];

  // Predictions
  calculateShelfLife: (studyId: string, parameter: string) => ShelfLifePrediction;
  getPredictionsByStudy: (studyId: string) => ShelfLifePrediction[];

  // Queries
  getStudiesByProduct: (productId: string) => StabilityStudy[];
  getStudiesByBatch: (batchId: string) => StabilityStudy[];
  getActiveStudies: () => StabilityStudy[];
  getUpcomingTimePoints: (daysAhead: number) => { study: StabilityStudy; timePointMonths: number; dueDate: string }[];
  getOOSRate: () => { total: number; oos: number; rate: number };
  getSubmissionReadyStudies: () => StabilityStudy[];

  // Data management
  loadMockData: () => void;
  clearAll: () => void;
}

type StabilityStore = StabilityState & StabilityActions;

const generateId = () => `stb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useStabilityStore = create<StabilityStore>((set, get) => ({
  // State
  activeView: 'dashboard',
  selectedStudyId: null,
  studies: {},
  protocols: {},
  dataPoints: {},
  oosInvestigations: {},
  predictions: {},
  isLoading: false,
  error: null,

  // View
  setActiveView: (view) => set({ activeView: view }),
  setSelectedStudy: (id) => set({ selectedStudyId: id }),

  // Protocol management
  createProtocol: (data) => {
    const protocol: StabilityProtocol = {
      id: generateId(),
      title: data.title || 'Untitled Protocol',
      productId: data.productId || '',
      version: data.version || '1.0',
      status: 'draft',
      studyTypes: data.studyTypes || ['long-term', 'accelerated'],
      conditions: data.conditions || ['25C/60RH', '40C/75RH'],
      timePointsMonths: data.timePointsMonths || [0, 3, 6, 9, 12, 18, 24, 36],
      testParameters: data.testParameters || [],
      batchRequirements: data.batchRequirements || { minBatches: 3, scaleRequirement: 'pilot or production' },
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ protocols: { ...state.protocols, [protocol.id]: protocol } }));
    return protocol;
  },

  updateProtocol: (id, updates) => {
    set((state) => {
      const protocol = state.protocols[id];
      if (!protocol) return state;
      return { protocols: { ...state.protocols, [id]: { ...protocol, ...updates, updatedAt: new Date().toISOString() } } };
    });
  },

  approveProtocol: (id, approvedBy) => {
    set((state) => {
      const protocol = state.protocols[id];
      if (!protocol) return state;
      return {
        protocols: {
          ...state.protocols,
          [id]: { ...protocol, status: 'approved', approvedBy, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  // Study management
  createStudy: (data) => {
    const study: StabilityStudy = {
      id: generateId(),
      protocolId: data.protocolId || '',
      productId: data.productId || '',
      productName: data.productName || '',
      batchId: data.batchId || '',
      batchNumber: data.batchNumber || '',
      studyType: data.studyType || 'long-term',
      status: 'planned',
      condition: data.condition || '25C/60RH',
      customCondition: data.customCondition || null,
      packaging: data.packaging || 'primary',
      startDate: data.startDate || new Date().toISOString(),
      endDate: null,
      timePoints: data.timePoints || [0, 3, 6, 9, 12, 18, 24, 36],
      orientation: data.orientation || 'na',
      chamberNumber: data.chamberNumber || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ studies: { ...state.studies, [study.id]: study } }));
    return study;
  },

  updateStudy: (id, updates) => {
    set((state) => {
      const study = state.studies[id];
      if (!study) return state;
      return { studies: { ...state.studies, [id]: { ...study, ...updates, updatedAt: new Date().toISOString() } } };
    });
  },

  startStudy: (id) => {
    set((state) => {
      const study = state.studies[id];
      if (!study) return state;
      return { studies: { ...state.studies, [id]: { ...study, status: 'active', updatedAt: new Date().toISOString() } } };
    });
  },

  completeStudy: (id) => {
    set((state) => {
      const study = state.studies[id];
      if (!study) return state;
      return {
        studies: { ...state.studies, [id]: { ...study, status: 'completed', endDate: new Date().toISOString(), updatedAt: new Date().toISOString() } },
      };
    });
  },

  cancelStudy: (id) => {
    set((state) => {
      const study = state.studies[id];
      if (!study) return state;
      return { studies: { ...state.studies, [id]: { ...study, status: 'cancelled', updatedAt: new Date().toISOString() } } };
    });
  },

  // Data entry
  addDataPoint: (data) => {
    const dp: StabilityDataPoint = {
      id: generateId(),
      studyId: data.studyId || '',
      timePointMonths: data.timePointMonths ?? 0,
      parameterId: data.parameterId || '',
      parameterName: data.parameterName || '',
      value: data.value ?? 0,
      unit: data.unit || '%',
      specification: data.specification || '',
      withinSpec: data.withinSpec ?? true,
      testedDate: data.testedDate || new Date().toISOString(),
      testedBy: data.testedBy || 'system',
      notes: data.notes || null,
    };
    set((state) => ({ dataPoints: { ...state.dataPoints, [dp.id]: dp } }));
    return dp;
  },

  updateDataPoint: (id, updates) => {
    set((state) => {
      const dp = state.dataPoints[id];
      if (!dp) return state;
      return { dataPoints: { ...state.dataPoints, [id]: { ...dp, ...updates } } };
    });
  },

  deleteDataPoint: (id) => {
    set((state) => {
      const { [id]: _, ...dataPoints } = state.dataPoints;
      return { dataPoints };
    });
  },

  getDataByStudy: (studyId) => Object.values(get().dataPoints).filter((dp) => dp.studyId === studyId),

  getDataByTimePoint: (studyId, timePoint) =>
    Object.values(get().dataPoints).filter((dp) => dp.studyId === studyId && dp.timePointMonths === timePoint),

  // OOS management
  createOOS: (data) => {
    const oos: OOSInvestigation = {
      id: generateId(),
      studyId: data.studyId || '',
      dataPointId: data.dataPointId || '',
      parameter: data.parameter || '',
      observedValue: data.observedValue ?? 0,
      specLimit: data.specLimit || '',
      status: 'open',
      rootCause: null,
      correctiveAction: null,
      investigator: data.investigator || null,
      openedAt: new Date().toISOString(),
      closedAt: null,
    };
    set((state) => ({ oosInvestigations: { ...state.oosInvestigations, [oos.id]: oos } }));
    return oos;
  },

  updateOOS: (id, updates) => {
    set((state) => {
      const oos = state.oosInvestigations[id];
      if (!oos) return state;
      return { oosInvestigations: { ...state.oosInvestigations, [id]: { ...oos, ...updates } } };
    });
  },

  closeOOS: (id, rootCause, correctiveAction) => {
    set((state) => {
      const oos = state.oosInvestigations[id];
      if (!oos) return state;
      return {
        oosInvestigations: {
          ...state.oosInvestigations,
          [id]: { ...oos, status: 'closed', rootCause, correctiveAction, closedAt: new Date().toISOString() },
        },
      };
    });
  },

  getOpenOOS: () => Object.values(get().oosInvestigations).filter((o) => o.status === 'open' || o.status === 'investigation'),

  // Predictions
  calculateShelfLife: (studyId, parameter) => {
    const data = get().getDataByStudy(studyId).filter((dp) => dp.parameterName === parameter);
    // Simple linear regression simulation
    const n = data.length || 1;
    const slope = -0.05; // simulated degradation rate
    const intercept = 100;
    const r2 = 0.95;
    const predictedShelfLife = Math.max(0, Math.round((90 - intercept) / slope)); // months to reach 90% spec

    const prediction: ShelfLifePrediction = {
      id: generateId(),
      studyId,
      parameter,
      method: 'linear-regression',
      predictedShelfLife: Math.min(predictedShelfLife, 60),
      confidence: 0.95,
      r2,
      slope,
      intercept,
      calculatedAt: new Date().toISOString(),
    };

    set((state) => ({ predictions: { ...state.predictions, [prediction.id]: prediction } }));
    return prediction;
  },

  getPredictionsByStudy: (studyId) => Object.values(get().predictions).filter((p) => p.studyId === studyId),

  // Queries
  getStudiesByProduct: (productId) => Object.values(get().studies).filter((s) => s.productId === productId),
  getStudiesByBatch: (batchId) => Object.values(get().studies).filter((s) => s.batchId === batchId),
  getActiveStudies: () => Object.values(get().studies).filter((s) => s.status === 'active'),

  getUpcomingTimePoints: (daysAhead) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysAhead * 86400000);
    const results: { study: StabilityStudy; timePointMonths: number; dueDate: string }[] = [];

    for (const study of Object.values(get().studies)) {
      if (study.status !== 'active') continue;
      const startDate = new Date(study.startDate);
      for (const tp of study.timePoints) {
        const dueDate = new Date(startDate.getTime() + tp * 30 * 86400000);
        if (dueDate >= now && dueDate <= cutoff) {
          results.push({ study, timePointMonths: tp, dueDate: dueDate.toISOString() });
        }
      }
    }

    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  getOOSRate: () => {
    const allDataPoints = Object.values(get().dataPoints);
    const oosCount = allDataPoints.filter((dp) => !dp.withinSpec).length;
    return {
      total: allDataPoints.length,
      oos: oosCount,
      rate: allDataPoints.length > 0 ? oosCount / allDataPoints.length : 0,
    };
  },

  // v0.42.47: Submission-ready studies for cross-module flow
  getSubmissionReadyStudies: () => {
    const state = get();
    return Object.values(state.studies).filter((study) => {
      if (study.status !== 'completed' && study.status !== 'active') return false;
      const dataPoints = Object.values(state.dataPoints).filter(dp => dp.studyId === study.id);
      if (dataPoints.length === 0) return false;
      const openOOS = Object.values(state.oosInvestigations)
        .filter(o => o.studyId === study.id && (o.status === 'open' || o.status === 'investigation'));
      return openOOS.length === 0;
    });
  },

  // Data management
  loadMockData: () => {
    const protocol = get().createProtocol({
      title: 'Stability Protocol for NEXAVANT Tablets',
      productId: 'PROD-NXV',
      testParameters: [
        { id: 'tp-1', parameter: 'assay', customName: null, method: 'HPLC-UV', specification: '95.0–105.0%', unit: '%', lowerLimit: 95, upperLimit: 105, targetValue: 100 },
        { id: 'tp-2', parameter: 'degradation-products', customName: null, method: 'HPLC-UV', specification: 'NMT 0.5% individual, NMT 2.0% total', unit: '%', lowerLimit: null, upperLimit: 0.5, targetValue: 0 },
        { id: 'tp-3', parameter: 'dissolution', customName: null, method: 'USP <711>', specification: 'NLT 80% (Q) in 30 min', unit: '%', lowerLimit: 80, upperLimit: null, targetValue: 95 },
      ],
    });

    const study = get().createStudy({
      protocolId: protocol.id,
      productId: 'PROD-NXV',
      productName: 'NEXAVANT™ 100mg Tablets',
      batchId: 'BATCH-001',
      batchNumber: 'NXV-2025-001',
      studyType: 'long-term',
      condition: '25C/60RH',
    });
    get().startStudy(study.id);

    // Add some data points
    get().addDataPoint({ studyId: study.id, timePointMonths: 0, parameterId: 'tp-1', parameterName: 'assay', value: 100.2, unit: '%', specification: '95.0–105.0%', withinSpec: true, testedBy: 'Lab Analyst A' });
    get().addDataPoint({ studyId: study.id, timePointMonths: 3, parameterId: 'tp-1', parameterName: 'assay', value: 99.8, unit: '%', specification: '95.0–105.0%', withinSpec: true, testedBy: 'Lab Analyst A' });
    get().addDataPoint({ studyId: study.id, timePointMonths: 6, parameterId: 'tp-1', parameterName: 'assay', value: 99.1, unit: '%', specification: '95.0–105.0%', withinSpec: true, testedBy: 'Lab Analyst B' });
  },

  clearAll: () => set({
    activeView: 'dashboard',
    selectedStudyId: null,
    studies: {},
    protocols: {},
    dataPoints: {},
    oosInvestigations: {},
    predictions: {},
    isLoading: false,
    error: null,
  }),
}));
