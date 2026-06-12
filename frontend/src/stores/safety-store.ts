

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CaseSeriousness = 'serious' | 'non-serious';
export type CaseListedness = 'listed' | 'unlisted' | 'unknown';
export type CaseRelatedness = 'related' | 'possibly-related' | 'unlikely' | 'not-related' | 'not-assessable';
export type CaseOutcome = 'recovered' | 'recovering' | 'not-recovered' | 'fatal' | 'unknown';
export type CaseStatus = 'open' | 'in-progress' | 'pending-qc' | 'qc-complete' | 'submitted' | 'closed';
export type CaseSource = 'spontaneous' | 'clinical-trial' | 'literature' | 'solicited' | 'authority' | 'other';
export type SignalStatus = 'new' | 'under-evaluation' | 'confirmed' | 'refuted' | 'closed';
export type SignalCategory = 'clinical' | 'non-clinical' | 'quality' | 'efficacy';
export type ReportType = 'DSUR' | 'PSUR' | 'PBRER' | 'PADER' | 'IND-Annual' | 'RMP';
export type ReportStatus = 'draft' | 'in-review' | 'approved' | 'submitted';

export interface ICSRCase {
  id: string;
  programId: string;
  caseNumber: string;
  patientAge?: number;
  patientAgeUnit?: 'years' | 'months' | 'days';
  patientSex?: 'male' | 'female' | 'unknown';
  eventTermPreferred: string;
  eventSOC?: string;
  eventOnsetDate?: string;
  eventResolvedDate?: string;
  eventDescription: string;
  seriousness: CaseSeriousness;
  seriousnessCriteria?: string[];
  listedness: CaseListedness;
  relatedness: CaseRelatedness;
  outcome: CaseOutcome;
  source: CaseSource;
  studyId?: string;
  reporterCountry?: string;
  initialReceiptDate: string;
  mostRecentDate: string;
  regulatoryDeadline?: string;
  expeditedReport: boolean;
  e2bSubmitted: boolean;
  e2bSubmissionDate?: string;
  status: CaseStatus;
  assignee?: string;
  medicalReviewer?: string;
  narrativeSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetySignal {
  id: string;
  programId: string;
  signalName: string;
  eventTerm: string;
  signalSOC?: string;
  category: SignalCategory;
  detectionMethod: 'disproportionality' | 'case-review' | 'literature' | 'regulatory' | 'clinical-trial';
  detectionDate: string;
  observedCount?: number;
  expectedCount?: number;
  ror?: number;
  rorLower?: number;
  rorUpper?: number;
  status: SignalStatus;
  priority: 'high' | 'medium' | 'low';
  evaluationSummary?: string;
  recommendedActions?: string[];
  assignee?: string;
  relatedCaseIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AggregateReport {
  id: string;
  programId: string;
  applicationId?: string;
  reportType: ReportType;
  reportTitle: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  dataLockPoint: string;
  status: ReportStatus;
  dueDate: string;
  submissionDate?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

const generateId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const timestamp = (): string => new Date().toISOString();

const defaultCases: ICSRCase[] = [
  { id: 'case-001', programId: 'prog-001', caseNumber: 'LIG-2847-AE-00142', patientAge: 67, patientAgeUnit: 'years', patientSex: 'male', eventTermPreferred: 'Hepatotoxicity', eventSOC: 'Hepatobiliary disorders', eventOnsetDate: '2024-11-15', eventDescription: 'Grade 3 ALT elevation (5.2x ULN) at Week 8. Drug interrupted.', seriousness: 'serious', seriousnessCriteria: ['hospitalization'], listedness: 'listed', relatedness: 'possibly-related', outcome: 'recovering', source: 'clinical-trial', studyId: 'LIG2847-301', reporterCountry: 'US', initialReceiptDate: '2024-11-18', mostRecentDate: '2024-12-01', regulatoryDeadline: '2024-12-03', expeditedReport: true, e2bSubmitted: true, e2bSubmissionDate: '2024-11-25', status: 'submitted', assignee: 'Lisa Park', createdAt: '2024-11-18T00:00:00Z', updatedAt: '2024-12-01T00:00:00Z' },
  { id: 'case-002', programId: 'prog-001', caseNumber: 'LIG-2847-AE-00143', patientAge: 54, patientSex: 'female', eventTermPreferred: 'Interstitial lung disease', eventSOC: 'Respiratory disorders', eventOnsetDate: '2024-12-01', eventDescription: 'Dyspnea and ground-glass opacities on CT.', seriousness: 'serious', seriousnessCriteria: ['hospitalization', 'life-threatening'], listedness: 'unlisted', relatedness: 'related', outcome: 'not-recovered', source: 'clinical-trial', studyId: 'LIG2847-301', reporterCountry: 'Germany', initialReceiptDate: '2024-12-05', mostRecentDate: '2024-12-10', regulatoryDeadline: '2024-12-12', expeditedReport: true, e2bSubmitted: false, status: 'in-progress', assignee: 'Lisa Park', createdAt: '2024-12-05T00:00:00Z', updatedAt: '2024-12-10T00:00:00Z' },
];

const defaultSignals: SafetySignal[] = [
  { id: 'sig-001', programId: 'prog-001', signalName: 'Hepatotoxicity Signal', eventTerm: 'Hepatotoxicity', signalSOC: 'Hepatobiliary disorders', category: 'clinical', detectionMethod: 'case-review', detectionDate: '2024-11-20', observedCount: 12, expectedCount: 4, ror: 3.2, rorLower: 1.8, rorUpper: 5.7, status: 'under-evaluation', priority: 'high', evaluationSummary: 'Elevated reporting. Most Grade 2-3, reversible.', recommendedActions: ['Enhanced liver monitoring', 'REMS evaluation'], assignee: 'Dr. James Wilson', relatedCaseIds: ['case-001'], createdAt: '2024-11-20T00:00:00Z', updatedAt: '2024-12-05T00:00:00Z' },
];

const defaultReports: AggregateReport[] = [
  { id: 'rpt-001', programId: 'prog-001', applicationId: 'app-001', reportType: 'IND-Annual', reportTitle: 'IND 123456 Annual Report - Year 4', reportingPeriodStart: '2024-03-15', reportingPeriodEnd: '2025-03-14', dataLockPoint: '2025-02-15', status: 'draft', dueDate: '2025-06-14', author: 'Jennifer Walsh', createdAt: '2024-12-01T00:00:00Z', updatedAt: '2024-12-10T00:00:00Z' },
];

interface SafetyState {
  cases: ICSRCase[];
  signals: SafetySignal[];
  reports: AggregateReport[];
  selectedCaseId: string | null;
  selectedSignalId: string | null;
  addCase: (data: Omit<ICSRCase, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCase: (id: string, updates: Partial<ICSRCase>) => void;
  deleteCase: (id: string) => void;
  getCase: (id: string) => ICSRCase | undefined;
  getCasesForProgram: (programId: string) => ICSRCase[];
  getExpedited: () => ICSRCase[];
  addSignal: (data: Omit<SafetySignal, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSignal: (id: string, updates: Partial<SafetySignal>) => void;
  deleteSignal: (id: string) => void;
  getSignalsForProgram: (programId: string) => SafetySignal[];
  addReport: (data: Omit<AggregateReport, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateReport: (id: string, updates: Partial<AggregateReport>) => void;
  getReportsForProgram: (programId: string) => AggregateReport[];
  selectCase: (id: string | null) => void;
  selectSignal: (id: string | null) => void;
  getCaseStats: (programId?: string) => { total: number; serious: number; expedited: number; open: number };
  clearAll: () => void;
}

export const useSafetyStore = create<SafetyState>()(
  persist(
    (set, get) => ({
      cases: defaultCases,
      signals: defaultSignals,
      reports: defaultReports,
      selectedCaseId: null,
      selectedSignalId: null,
      addCase: (data) => { const id = generateId('case'); const now = timestamp(); set((s) => ({ cases: [...s.cases, { ...data, id, createdAt: now, updatedAt: now }] })); return id; },
      updateCase: (id, updates) => set((s) => ({ cases: s.cases.map((c) => c.id === id ? { ...c, ...updates, updatedAt: timestamp() } : c) })),
      deleteCase: (id) => set((s) => ({ cases: s.cases.filter((c) => c.id !== id), selectedCaseId: s.selectedCaseId === id ? null : s.selectedCaseId })),
      getCase: (id) => get().cases.find((c) => c.id === id),
      getCasesForProgram: (programId) => get().cases.filter((c) => c.programId === programId),
      getExpedited: () => get().cases.filter((c) => c.expeditedReport && !['submitted', 'closed'].includes(c.status)),
      addSignal: (data) => { const id = generateId('sig'); const now = timestamp(); set((s) => ({ signals: [...s.signals, { ...data, id, createdAt: now, updatedAt: now }] })); return id; },
      updateSignal: (id, updates) => set((s) => ({ signals: s.signals.map((sg) => sg.id === id ? { ...sg, ...updates, updatedAt: timestamp() } : sg) })),
      deleteSignal: (id) => set((s) => ({ signals: s.signals.filter((sg) => sg.id !== id), selectedSignalId: s.selectedSignalId === id ? null : s.selectedSignalId })),
      getSignalsForProgram: (programId) => get().signals.filter((s) => s.programId === programId),
      addReport: (data) => { const id = generateId('rpt'); const now = timestamp(); set((s) => ({ reports: [...s.reports, { ...data, id, createdAt: now, updatedAt: now }] })); return id; },
      updateReport: (id, updates) => set((s) => ({ reports: s.reports.map((r) => r.id === id ? { ...r, ...updates, updatedAt: timestamp() } : r) })),
      getReportsForProgram: (programId) => get().reports.filter((r) => r.programId === programId),
      selectCase: (id) => set({ selectedCaseId: id }),
      selectSignal: (id) => set({ selectedSignalId: id }),
      getCaseStats: (programId) => { const cases = programId ? get().getCasesForProgram(programId) : get().cases; return { total: cases.length, serious: cases.filter((c) => c.seriousness === 'serious').length, expedited: cases.filter((c) => c.expeditedReport).length, open: cases.filter((c) => !['submitted', 'closed'].includes(c.status)).length }; },
      clearAll: () => set({ cases: [], signals: [], reports: [], selectedCaseId: null, selectedSignalId: null }),
    }),
    { name: 'ligature-safety', storage: createJSONStorage(() => localStorage), version: 1 }
  )
);

export const useCases = () => useSafetyStore((s) => s.cases);
export const useSignals = () => useSafetyStore((s) => s.signals);
export const useReports = () => useSafetyStore((s) => s.reports);
