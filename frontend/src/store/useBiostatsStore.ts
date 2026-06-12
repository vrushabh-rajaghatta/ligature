

import { create } from 'zustand';

// ============================================================================
// BIOSTATISTICS STORE - Statistical Analysis & SAP Management
// ============================================================================
// Manages Statistical Analysis Plans (SAPs), analysis datasets, TLF (Tables,
// Listings, Figures) generation, and statistical programming workflows for
// clinical trial data analysis per ICH E9/E9(R1) guidelines.
// ============================================================================

// Types
export type BiostatsView = 'dashboard' | 'sap' | 'analyses' | 'tlf' | 'datasets' | 'programming';

export type SAPStatus = 'draft' | 'in-review' | 'approved' | 'amended' | 'final' | 'archived';
export type AnalysisStatus = 'planned' | 'in-progress' | 'completed' | 'validated' | 'failed';
export type TLFType = 'table' | 'listing' | 'figure';
export type TLFStatus = 'planned' | 'programmed' | 'validated' | 'qc-passed' | 'final';
export type AnalysisPopulation = 'ITT' | 'mITT' | 'PP' | 'Safety' | 'PK' | 'PD' | 'Custom';
export type StatisticalMethod =
  | 'anova' | 'ancova' | 'mmrm' | 'logistic-regression'
  | 'cox-regression' | 'kaplan-meier' | 'fisher-exact'
  | 'chi-square' | 'wilcoxon' | 'log-rank' | 'cmc-method'
  | 'bayesian' | 'gatekeeping' | 'multiplicity-adjustment';

export interface StatisticalAnalysisPlan {
  id: string;
  studyId: string;
  title: string;
  version: string;
  status: SAPStatus;
  primaryEndpoints: Endpoint[];
  secondaryEndpoints: Endpoint[];
  exploratoryEndpoints: Endpoint[];
  populations: PopulationDef[];
  analyses: AnalysisDef[];
  multiplicity: MultiplicityStrategy | null;
  interimAnalyses: InterimAnalysis[];
  estimandFramework: EstimandDef[];
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface Endpoint {
  id: string;
  name: string;
  description: string;
  type: 'primary' | 'secondary' | 'exploratory';
  variable: string;
  timepoint: string;
  method: StatisticalMethod;
  successCriteria: string;
}

export interface PopulationDef {
  id: string;
  name: string;
  code: AnalysisPopulation;
  criteria: string;
  expectedN: number;
}

export interface AnalysisDef {
  id: string;
  name: string;
  endpointId: string;
  populationId: string;
  method: StatisticalMethod;
  covariates: string[];
  sensitivityAnalyses: string[];
  status: AnalysisStatus;
  resultSummary: string | null;
  pValue: number | null;
  effectSize: number | null;
  ciLower: number | null;
  ciUpper: number | null;
}

export interface MultiplicityStrategy {
  method: 'bonferroni' | 'holm' | 'hochberg' | 'gatekeeping' | 'graphical';
  alpha: number;
  description: string;
}

export interface InterimAnalysis {
  id: string;
  type: 'futility' | 'efficacy' | 'safety' | 'sample-size-reestimation';
  plannedN: number;
  boundaryMethod: string;
  alpha_spent: number;
}

export interface EstimandDef {
  id: string;
  population: string;
  variable: string;
  intercurrentEvents: { event: string; strategy: 'treatment-policy' | 'composite' | 'hypothetical' | 'principal-stratum' | 'while-on-treatment' }[];
  summaryMeasure: string;
}

export interface TLFOutput {
  id: string;
  sapId: string;
  type: TLFType;
  number: string;
  title: string;
  population: AnalysisPopulation;
  status: TLFStatus;
  programPath: string | null;
  outputPath: string | null;
  qcStatus: 'pending' | 'passed' | 'failed' | 'waived';
  qcBy: string | null;
  qcDate: string | null;
  createdAt: string;
}

export interface AnalysisDataset {
  id: string;
  name: string;
  domain: 'ADSL' | 'ADAE' | 'ADLB' | 'ADVS' | 'ADTTE' | 'ADPC' | 'ADEG' | 'ADCM' | 'Custom';
  recordCount: number;
  variableCount: number;
  status: 'created' | 'validated' | 'locked' | 'archived';
  sourceDatasets: string[];
  createdAt: string;
}

interface BiostatsState {
  activeView: BiostatsView;
  selectedSAPId: string | null;
  saps: Record<string, StatisticalAnalysisPlan>;
  tlfOutputs: Record<string, TLFOutput>;
  datasets: Record<string, AnalysisDataset>;
  isLoading: boolean;
  error: string | null;
}

interface BiostatsActions {
  setActiveView: (view: BiostatsView) => void;
  setSelectedSAP: (id: string | null) => void;

  // SAP Management
  createSAP: (data: Partial<StatisticalAnalysisPlan>) => StatisticalAnalysisPlan;
  updateSAP: (id: string, updates: Partial<StatisticalAnalysisPlan>) => void;
  deleteSAP: (id: string) => void;
  approveSAP: (id: string, approvedBy: string) => void;
  amendSAP: (id: string) => StatisticalAnalysisPlan;

  // Endpoint Management
  addEndpoint: (sapId: string, endpoint: Partial<Endpoint>) => void;
  removeEndpoint: (sapId: string, endpointId: string) => void;

  // Analysis Management
  addAnalysis: (sapId: string, analysis: Partial<AnalysisDef>) => void;
  updateAnalysisResult: (sapId: string, analysisId: string, result: { pValue: number; effectSize: number; ciLower: number; ciUpper: number; resultSummary: string }) => void;
  runAnalysis: (sapId: string, analysisId: string) => void;

  // TLF Management
  createTLF: (data: Partial<TLFOutput>) => TLFOutput;
  updateTLFStatus: (id: string, status: TLFStatus) => void;
  qcTLF: (id: string, result: 'passed' | 'failed', qcBy: string) => void;

  // Dataset Management
  createDataset: (data: Partial<AnalysisDataset>) => AnalysisDataset;
  lockDataset: (id: string) => void;

  // Queries
  getSAPsByStudy: (studyId: string) => StatisticalAnalysisPlan[];
  getTLFsBySAP: (sapId: string) => TLFOutput[];
  getAnalysisSummary: (sapId: string) => { total: number; completed: number; validated: number; pending: number };
  getSubmissionReadyTLFs: () => TLFOutput[];

  // Data management
  loadMockData: () => void;
  clearAll: () => void;
}

type BiostatsStore = BiostatsState & BiostatsActions;

const generateId = () => `bio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useBiostatsStore = create<BiostatsStore>((set, get) => ({
  // State
  activeView: 'dashboard',
  selectedSAPId: null,
  saps: {},
  tlfOutputs: {},
  datasets: {},
  isLoading: false,
  error: null,

  // View
  setActiveView: (view) => set({ activeView: view }),
  setSelectedSAP: (id) => set({ selectedSAPId: id }),

  // SAP CRUD
  createSAP: (data) => {
    const sap: StatisticalAnalysisPlan = {
      id: generateId(),
      studyId: data.studyId || '',
      title: data.title || 'Untitled SAP',
      version: data.version || '1.0',
      status: 'draft',
      primaryEndpoints: data.primaryEndpoints || [],
      secondaryEndpoints: data.secondaryEndpoints || [],
      exploratoryEndpoints: data.exploratoryEndpoints || [],
      populations: data.populations || [],
      analyses: data.analyses || [],
      multiplicity: data.multiplicity || null,
      interimAnalyses: data.interimAnalyses || [],
      estimandFramework: data.estimandFramework || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
    };
    set((state) => ({ saps: { ...state.saps, [sap.id]: sap } }));
    return sap;
  },

  updateSAP: (id, updates) => {
    set((state) => {
      const sap = state.saps[id];
      if (!sap) return state;
      return { saps: { ...state.saps, [id]: { ...sap, ...updates, updatedAt: new Date().toISOString() } } };
    });
  },

  deleteSAP: (id) => {
    set((state) => {
      const { [id]: _, ...saps } = state.saps;
      return { saps, selectedSAPId: state.selectedSAPId === id ? null : state.selectedSAPId };
    });
  },

  approveSAP: (id, approvedBy) => {
    set((state) => {
      const sap = state.saps[id];
      if (!sap) return state;
      return {
        saps: {
          ...state.saps,
          [id]: { ...sap, status: 'approved', approvedBy, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  amendSAP: (id) => {
    const original = get().saps[id];
    const amended: StatisticalAnalysisPlan = {
      ...(original || { id: '', studyId: '', title: 'Amended SAP', primaryEndpoints: [], secondaryEndpoints: [], exploratoryEndpoints: [], populations: [], analyses: [], multiplicity: null, interimAnalyses: [], estimandFramework: [], approvedBy: null, approvedAt: null }),
      id: generateId(),
      version: original ? `${parseFloat(original.version) + 0.1}` : '1.1',
      status: 'amended',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ saps: { ...state.saps, [amended.id]: amended } }));
    return amended;
  },

  // Endpoints
  addEndpoint: (sapId, endpoint) => {
    set((state) => {
      const sap = state.saps[sapId];
      if (!sap) return state;
      const newEp: Endpoint = {
        id: generateId(),
        name: endpoint.name || '',
        description: endpoint.description || '',
        type: endpoint.type || 'primary',
        variable: endpoint.variable || '',
        timepoint: endpoint.timepoint || '',
        method: endpoint.method || 'anova',
        successCriteria: endpoint.successCriteria || '',
      };
      const key = `${newEp.type}Endpoints` as 'primaryEndpoints' | 'secondaryEndpoints' | 'exploratoryEndpoints';
      return { saps: { ...state.saps, [sapId]: { ...sap, [key]: [...sap[key], newEp], updatedAt: new Date().toISOString() } } };
    });
  },

  removeEndpoint: (sapId, endpointId) => {
    set((state) => {
      const sap = state.saps[sapId];
      if (!sap) return state;
      return {
        saps: {
          ...state.saps,
          [sapId]: {
            ...sap,
            primaryEndpoints: sap.primaryEndpoints.filter((e) => e.id !== endpointId),
            secondaryEndpoints: sap.secondaryEndpoints.filter((e) => e.id !== endpointId),
            exploratoryEndpoints: sap.exploratoryEndpoints.filter((e) => e.id !== endpointId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // Analysis
  addAnalysis: (sapId, analysis) => {
    set((state) => {
      const sap = state.saps[sapId];
      if (!sap) return state;
      const newAnalysis: AnalysisDef = {
        id: generateId(),
        name: analysis.name || '',
        endpointId: analysis.endpointId || '',
        populationId: analysis.populationId || '',
        method: analysis.method || 'anova',
        covariates: analysis.covariates || [],
        sensitivityAnalyses: analysis.sensitivityAnalyses || [],
        status: 'planned',
        resultSummary: null,
        pValue: null,
        effectSize: null,
        ciLower: null,
        ciUpper: null,
      };
      return { saps: { ...state.saps, [sapId]: { ...sap, analyses: [...sap.analyses, newAnalysis], updatedAt: new Date().toISOString() } } };
    });
  },

  updateAnalysisResult: (sapId, analysisId, result) => {
    set((state) => {
      const sap = state.saps[sapId];
      if (!sap) return state;
      return {
        saps: {
          ...state.saps,
          [sapId]: {
            ...sap,
            analyses: sap.analyses.map((a) =>
              a.id === analysisId ? { ...a, ...result, status: 'completed' as AnalysisStatus } : a
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  runAnalysis: (sapId, analysisId) => {
    set((state) => {
      const sap = state.saps[sapId];
      if (!sap) return state;
      return {
        saps: {
          ...state.saps,
          [sapId]: {
            ...sap,
            analyses: sap.analyses.map((a) =>
              a.id === analysisId ? { ...a, status: 'in-progress' as AnalysisStatus } : a
            ),
          },
        },
      };
    });
  },

  // TLF
  createTLF: (data) => {
    const tlf: TLFOutput = {
      id: generateId(),
      sapId: data.sapId || '',
      type: data.type || 'table',
      number: data.number || 'T-14.1.1',
      title: data.title || 'Untitled Output',
      population: data.population || 'ITT',
      status: 'planned',
      programPath: data.programPath || null,
      outputPath: data.outputPath || null,
      qcStatus: 'pending',
      qcBy: null,
      qcDate: null,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ tlfOutputs: { ...state.tlfOutputs, [tlf.id]: tlf } }));
    return tlf;
  },

  updateTLFStatus: (id, status) => {
    set((state) => {
      const tlf = state.tlfOutputs[id];
      if (!tlf) return state;
      return { tlfOutputs: { ...state.tlfOutputs, [id]: { ...tlf, status } } };
    });
  },

  qcTLF: (id, result, qcBy) => {
    set((state) => {
      const tlf = state.tlfOutputs[id];
      if (!tlf) return state;
      return {
        tlfOutputs: {
          ...state.tlfOutputs,
          [id]: { ...tlf, qcStatus: result, qcBy, qcDate: new Date().toISOString() },
        },
      };
    });
  },

  // Dataset
  createDataset: (data) => {
    const ds: AnalysisDataset = {
      id: generateId(),
      name: data.name || 'Untitled Dataset',
      domain: data.domain || 'ADSL',
      recordCount: data.recordCount || 0,
      variableCount: data.variableCount || 0,
      status: 'created',
      sourceDatasets: data.sourceDatasets || [],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ datasets: { ...state.datasets, [ds.id]: ds } }));
    return ds;
  },

  lockDataset: (id) => {
    set((state) => {
      const ds = state.datasets[id];
      if (!ds) return state;
      return { datasets: { ...state.datasets, [id]: { ...ds, status: 'locked' } } };
    });
  },

  // Queries
  getSAPsByStudy: (studyId) => {
    return Object.values(get().saps).filter((s) => s.studyId === studyId);
  },

  getTLFsBySAP: (sapId) => {
    return Object.values(get().tlfOutputs).filter((t) => t.sapId === sapId);
  },

  getAnalysisSummary: (sapId) => {
    const sap = get().saps[sapId];
    if (!sap) return { total: 0, completed: 0, validated: 0, pending: 0 };
    const analyses = sap.analyses;
    return {
      total: analyses.length,
      completed: analyses.filter((a) => a.status === 'completed').length,
      validated: analyses.filter((a) => a.status === 'validated').length,
      pending: analyses.filter((a) => a.status === 'planned' || a.status === 'in-progress').length,
    };
  },

  // v0.42.46: Submission-ready TLFs for cross-module flow
  getSubmissionReadyTLFs: () => {
    return Object.values(get().tlfOutputs).filter(
      (t) => t.qcStatus === 'passed' || t.status === 'final'
    );
  },

  // Data management
  loadMockData: () => {
    const sap = get().createSAP({
      studyId: 'STUDY-001',
      title: 'Statistical Analysis Plan for Protocol NXV-301',
      primaryEndpoints: [{
        id: 'ep-1', name: 'Overall Response Rate', description: 'ORR per RECIST v1.1',
        type: 'primary', variable: 'AVALC', timepoint: 'Week 24', method: 'fisher-exact',
        successCriteria: 'p < 0.025 (one-sided)',
      }],
      populations: [
        { id: 'pop-1', name: 'Intent-to-Treat', code: 'ITT', criteria: 'All randomized subjects', expectedN: 450 },
        { id: 'pop-2', name: 'Safety', code: 'Safety', criteria: 'All subjects who received ≥1 dose', expectedN: 445 },
      ],
    });
    get().createTLF({ sapId: sap.id, type: 'table', number: 'T-14.1.1', title: 'Demographics and Baseline Characteristics (ITT)', population: 'ITT' });
    get().createTLF({ sapId: sap.id, type: 'figure', number: 'F-14.2.1', title: 'Kaplan-Meier Plot of Progression-Free Survival', population: 'ITT' });
    get().createDataset({ name: 'ADSL', domain: 'ADSL', recordCount: 450, variableCount: 85, sourceDatasets: ['DM', 'DS', 'MH'] });
  },

  clearAll: () => set({
    activeView: 'dashboard',
    selectedSAPId: null,
    saps: {},
    tlfOutputs: {},
    datasets: {},
    isLoading: false,
    error: null,
  }),
}));
