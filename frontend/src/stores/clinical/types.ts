
/**
 * Clinical Store Types
 * TypeScript interfaces for Clinical state management
 * @version 0.20.10.0
 */

import type {
  ClinicalStudy,
  StudyPhase,
  StudyStatus,
  StudyFilters,
} from '@/types/clinical-trial';

import type {
  ClinicalSite,
  SiteStatus,
  SiteFilters,
  SiteMetrics,
} from '@/types/clinical-site';

import type {
  ClinicalSubject,
  SubjectStatus,
  SubjectFilters,
} from '@/types/clinical-subject';

import type {
  ProtocolVisit,
  SubjectVisit,
  VisitStatus,
} from '@/types/clinical-visit';

import type {
  FormInstance,
  FormStatus,
  QueryStatus,
  QueryType,
  SDVStatus,
} from '@/types/clinical-form';

// ============================================================================
// Study Store State
// ============================================================================

export interface StudyState {
  study: ClinicalStudy;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface StudyStoreState {
  // Active study context
  activeStudyId: string | null;
  
  // Study collection
  studies: Map<string, StudyState>;
  
  // Loading states
  isLoading: boolean;
  isLoadingStudy: string | null;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: StudyFilters;
}

export interface StudyStoreActions {
  // Study lifecycle
  setActiveStudy: (studyId: string | null) => void;
  loadStudy: (studyId: string) => Promise<void>;
  loadStudies: (filters?: StudyFilters) => Promise<void>;
  createStudy: (config: Omit<ClinicalStudy, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStudy: (studyId: string, updates: Partial<ClinicalStudy>) => Promise<void>;
  deleteStudy: (studyId: string) => Promise<void>;
  
  // Status management
  updateStudyStatus: (studyId: string, status: StudyStatus, reason?: string) => Promise<void>;
  
  // Filters
  setFilters: (filters: StudyFilters) => void;
  clearFilters: () => void;
  
  // Error handling
  clearError: () => void;
}

export type StudyStore = StudyStoreState & StudyStoreActions;

// ============================================================================
// Site Store State
// ============================================================================

export interface SiteState {
  site: ClinicalSite;
  metrics: SiteMetrics | null;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface SiteStoreState {
  // Site collection (by studyId)
  sitesByStudy: Map<string, Map<string, SiteState>>;
  
  // Loading states
  isLoading: boolean;
  isLoadingSite: string | null;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: SiteFilters;
  
  // Selection state
  selectedSiteIds: Set<string>;
}

export interface SiteStoreActions {
  // Site lifecycle
  loadSites: (studyId: string, filters?: SiteFilters) => Promise<void>;
  loadSite: (studyId: string, siteId: string) => Promise<void>;
  createSite: (studyId: string, config: Omit<ClinicalSite, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSite: (studyId: string, siteId: string, updates: Partial<ClinicalSite>) => Promise<void>;
  deleteSite: (studyId: string, siteId: string) => Promise<void>;
  
  // Status management
  updateSiteStatus: (studyId: string, siteId: string, status: SiteStatus, reason?: string) => Promise<void>;
  activateSite: (studyId: string, siteId: string) => Promise<void>;
  deactivateSite: (studyId: string, siteId: string, reason: string) => Promise<void>;
  
  // Metrics
  loadSiteMetrics: (studyId: string, siteId: string) => Promise<void>;
  refreshAllMetrics: (studyId: string) => Promise<void>;
  
  // Selection
  selectSite: (siteId: string) => void;
  deselectSite: (siteId: string) => void;
  selectAllSites: (studyId: string) => void;
  clearSelection: () => void;
  
  // Filters
  setFilters: (filters: SiteFilters) => void;
  clearFilters: () => void;
  
  // Error handling
  clearError: () => void;
}

export type SiteStore = SiteStoreState & SiteStoreActions;

// ============================================================================
// Subject Store State
// ============================================================================

export interface SubjectState {
  subject: ClinicalSubject;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface EnrollmentMetrics {
  studyId: string;
  totalEnrolled: number;
  totalScreened: number;
  totalScreenFailures: number;
  totalRandomized: number;
  totalCompleted: number;
  totalDiscontinued: number;
  enrollmentRate: number; // Per month
  screenFailureRate: number; // Percentage
  byArm: Map<string, number>;
  bySite: Map<string, number>;
  byMonth: Array<{ month: string; count: number }>;
  lastUpdated: Date;
}

export interface SubjectStoreState {
  // Subject collection (by studyId -> siteId -> subjects)
  subjectsByStudy: Map<string, Map<string, Map<string, SubjectState>>>;
  
  // Enrollment metrics
  enrollmentMetrics: Map<string, EnrollmentMetrics>;
  
  // Loading states
  isLoading: boolean;
  isLoadingSubject: string | null;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: SubjectFilters;
  
  // Selection state
  selectedSubjectIds: Set<string>;
}

export interface SubjectStoreActions {
  // Subject lifecycle
  loadSubjects: (studyId: string, siteId?: string, filters?: SubjectFilters) => Promise<void>;
  loadSubject: (studyId: string, siteId: string, subjectId: string) => Promise<void>;
  createSubject: (studyId: string, siteId: string, config: Omit<ClinicalSubject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubject: (studyId: string, siteId: string, subjectId: string, updates: Partial<ClinicalSubject>) => Promise<void>;
  
  // Status management
  updateSubjectStatus: (studyId: string, siteId: string, subjectId: string, status: SubjectStatus, reason?: string) => Promise<void>;
  screenSubject: (studyId: string, siteId: string, subjectId: string) => Promise<void>;
  enrollSubject: (studyId: string, siteId: string, subjectId: string) => Promise<void>;
  randomizeSubject: (studyId: string, siteId: string, subjectId: string, armId: string) => Promise<void>;
  discontinueSubject: (studyId: string, siteId: string, subjectId: string, reason: string) => Promise<void>;
  completeSubject: (studyId: string, siteId: string, subjectId: string) => Promise<void>;
  
  // Enrollment metrics
  loadEnrollmentMetrics: (studyId: string) => Promise<void>;
  refreshEnrollmentMetrics: (studyId: string) => Promise<void>;
  
  // Selection
  selectSubject: (subjectId: string) => void;
  deselectSubject: (subjectId: string) => void;
  clearSelection: () => void;
  
  // Filters
  setFilters: (filters: SubjectFilters) => void;
  clearFilters: () => void;
  
  // Error handling
  clearError: () => void;
}

export type SubjectStore = SubjectStoreState & SubjectStoreActions;

// ============================================================================
// Visit Store State
// ============================================================================

/**
 * Visit compliance status for window tracking
 */
export type VisitComplianceStatus = 'IN_WINDOW' | 'EARLY' | 'LATE' | 'MISSED';

export interface VisitState {
  visit: SubjectVisit;
  lastSyncedAt: Date;
  isDirty: boolean;
}

export interface VisitScheduleState {
  studyId: string;
  protocolVisits: ProtocolVisit[];
  lastUpdated: Date;
}

export interface VisitComplianceMetrics {
  studyId: string;
  totalVisits: number;
  completedVisits: number;
  missedVisits: number;
  inWindowVisits: number;
  outOfWindowVisits: number;
  complianceRate: number; // Percentage in-window
  averageDelay: number; // Days
  bySite: Map<string, { completed: number; missed: number; complianceRate: number }>;
  lastUpdated: Date;
}

export interface VisitStoreState {
  // Visit instances (by subjectId)
  visitsBySubject: Map<string, Map<string, VisitState>>;
  
  // Protocol visit schedules (by studyId)
  visitSchedules: Map<string, VisitScheduleState>;
  
  // Compliance metrics (by studyId)
  complianceMetrics: Map<string, VisitComplianceMetrics>;
  
  // Loading states
  isLoading: boolean;
  isLoadingVisit: string | null;
  
  // Error state
  error: string | null;
  
  // Selection
  selectedVisitIds: Set<string>;
}

export interface VisitStoreActions {
  // Visit lifecycle
  loadVisits: (subjectId: string) => Promise<void>;
  loadVisit: (subjectId: string, visitId: string) => Promise<void>;
  scheduleVisit: (subjectId: string, protocolVisitId: string, scheduledDate: Date) => Promise<string>;
  rescheduleVisit: (visitId: string, newDate: Date, reason: string) => Promise<void>;
  
  // Visit completion
  startVisit: (visitId: string) => Promise<void>;
  completeVisit: (visitId: string) => Promise<void>;
  missVisit: (visitId: string, reason: string) => Promise<void>;
  
  // Protocol schedule
  loadVisitSchedule: (studyId: string) => Promise<void>;
  
  // Compliance
  loadComplianceMetrics: (studyId: string) => Promise<void>;
  calculateWindowCompliance: (visitId: string) => VisitComplianceStatus;
  
  // Selection
  selectVisit: (visitId: string) => void;
  deselectVisit: (visitId: string) => void;
  clearSelection: () => void;
  
  // Error handling
  clearError: () => void;
}

export type VisitStore = VisitStoreState & VisitStoreActions;

// ============================================================================
// EDC (Electronic Data Capture) Store State
// ============================================================================

export interface FormState {
  form: FormInstance;
  lastSyncedAt: Date;
  isDirty: boolean;
  pendingChanges: FormFieldChange[];
}

export interface FormFieldChange {
  fieldId: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
  changedBy: string;
}

export interface FormDataState {
  formInstanceId: string;
  data: Map<string, unknown>;
  sdvStatus: Map<string, SDVStatus>;
  lastSavedAt: Date;
}

export interface EDCStoreState {
  // Form instances (by visitInstanceId)
  formsByVisit: Map<string, Map<string, FormState>>;
  
  // Form data
  formData: Map<string, FormDataState>;
  
  // Loading states
  isLoading: boolean;
  isLoadingForm: string | null;
  isSaving: boolean;
  
  // Error state
  error: string | null;
  
  // Active form context
  activeFormId: string | null;
  
  // Edit check failures
  editCheckFailures: Map<string, EditCheckFailure[]>;
}

export interface EditCheckFailure {
  id: string;
  formInstanceId: string;
  fieldId: string;
  ruleId: string;
  ruleName: string;
  severity: 'WARNING' | 'ERROR';
  message: string;
  detectedAt: Date;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface EDCStoreActions {
  // Form lifecycle
  loadForms: (visitInstanceId: string) => Promise<void>;
  loadForm: (formInstanceId: string) => Promise<void>;
  saveForm: (formInstanceId: string) => Promise<void>;
  submitForm: (formInstanceId: string) => Promise<void>;
  
  // Field operations
  setFieldValue: (formInstanceId: string, fieldId: string, value: unknown) => void;
  clearFieldValue: (formInstanceId: string, fieldId: string) => void;
  
  // Form status
  freezeForm: (formInstanceId: string) => Promise<void>;
  unfreezeForm: (formInstanceId: string, reason: string) => Promise<void>;
  lockForm: (formInstanceId: string) => Promise<void>;
  
  // SDV
  markFieldSDVComplete: (formInstanceId: string, fieldId: string) => Promise<void>;
  markFormSDVComplete: (formInstanceId: string) => Promise<void>;
  
  // Edit checks
  runEditChecks: (formInstanceId: string) => Promise<EditCheckFailure[]>;
  acknowledgeEditCheck: (failureId: string) => Promise<void>;
  
  // Active form
  setActiveForm: (formInstanceId: string | null) => void;
  
  // Error handling
  clearError: () => void;
}

export type EDCStore = EDCStoreState & EDCStoreActions;

// ============================================================================
// Query Store State
// ============================================================================

export interface QueryState {
  id: string;
  formInstanceId: string;
  fieldId: string;
  type: QueryType;
  status: QueryStatus;
  message: string;
  response?: string;
  createdAt: Date;
  createdBy: string;
  respondedAt?: Date;
  respondedBy?: string;
  closedAt?: Date;
  closedBy?: string;
  dueDate?: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  isOverdue: boolean;
}

export interface QueryMetrics {
  studyId: string;
  totalQueries: number;
  openQueries: number;
  answeredQueries: number;
  closedQueries: number;
  cancelledQueries: number;
  averageResolutionTime: number; // Days
  overdueQueries: number;
  queryRate: number; // Per 100 forms
  bySite: Map<string, { open: number; closed: number; rate: number }>;
  byAge: Array<{ range: string; count: number }>;
  lastUpdated: Date;
}

export interface QueryStoreState {
  // Queries (by formInstanceId)
  queriesByForm: Map<string, Map<string, QueryState>>;
  
  // All queries for study (flat list)
  queriesByStudy: Map<string, QueryState[]>;
  
  // Query metrics
  queryMetrics: Map<string, QueryMetrics>;
  
  // Loading states
  isLoading: boolean;
  isLoadingQuery: string | null;
  
  // Error state
  error: string | null;
  
  // Selection
  selectedQueryIds: Set<string>;
  
  // Filters
  filters: QueryFilters;
}

export interface QueryFilters {
  status?: QueryStatus[];
  type?: QueryType[];
  priority?: QueryState['priority'][];
  siteId?: string[];
  isOverdue?: boolean;
  formInstanceId?: string;
  fieldId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  searchTerm?: string;
}

export interface QueryStoreActions {
  // Query lifecycle
  loadQueries: (formInstanceId: string) => Promise<void>;
  loadQueriesByStudy: (studyId: string, filters?: QueryFilters) => Promise<void>;
  createQuery: (config: CreateQueryConfig) => Promise<string>;
  respondToQuery: (queryId: string, response: string) => Promise<void>;
  closeQuery: (queryId: string) => Promise<void>;
  cancelQuery: (queryId: string, reason: string) => Promise<void>;
  reopenQuery: (queryId: string, reason: string) => Promise<void>;
  
  // Metrics
  loadQueryMetrics: (studyId: string) => Promise<void>;
  refreshQueryMetrics: (studyId: string) => Promise<void>;
  
  // Selection
  selectQuery: (queryId: string) => void;
  deselectQuery: (queryId: string) => void;
  clearSelection: () => void;
  
  // Filters
  setFilters: (filters: QueryFilters) => void;
  clearFilters: () => void;
  
  // Error handling
  clearError: () => void;
}

export interface CreateQueryConfig {
  formInstanceId: string;
  fieldId: string;
  type: QueryType;
  message: string;
  priority?: QueryState['priority'];
  dueDate?: Date;
  createdBy: string;
}

export type QueryStore = QueryStoreState & QueryStoreActions;

// ============================================================================
// Combined Clinical Store State
// ============================================================================

export interface ClinicalStoreState {
  // Study configuration
  activeStudyId: string | null;
  studies: Map<string, StudyState>;
  
  // Site state
  sites: Map<string, SiteState>;
  siteMetrics: Map<string, SiteMetrics>;
  
  // Subject state
  subjects: Map<string, SubjectState>;
  enrollmentMetrics: EnrollmentMetrics | null;
  
  // Visit state
  visits: Map<string, VisitState>;
  visitSchedule: VisitScheduleState | null;
  
  // EDC state
  forms: Map<string, FormState>;
  formData: Map<string, FormDataState>;
  
  // Query state
  queries: Map<string, QueryState>;
  queryMetrics: QueryMetrics | null;
  
  // UI state
  filters: ClinicalFilters;
  selectedItems: SelectedItems;
  viewMode: ClinicalViewMode;
}

export interface ClinicalFilters {
  study?: StudyFilters;
  site?: SiteFilters;
  subject?: SubjectFilters;
  query?: QueryFilters;
}

export interface SelectedItems {
  studyIds: Set<string>;
  siteIds: Set<string>;
  subjectIds: Set<string>;
  visitIds: Set<string>;
  formIds: Set<string>;
  queryIds: Set<string>;
}

export type ClinicalViewMode = 
  | 'dashboard'
  | 'sites'
  | 'subjects'
  | 'visits'
  | 'edc'
  | 'queries'
  | 'sdv'
  | 'randomization';

// ============================================================================
// Action Types (Discriminated Union)
// ============================================================================

export type StudyAction =
  | { type: 'STUDY_LOAD_START'; studyId: string }
  | { type: 'STUDY_LOAD_SUCCESS'; study: ClinicalStudy }
  | { type: 'STUDY_LOAD_ERROR'; studyId: string; error: string }
  | { type: 'STUDY_UPDATE'; studyId: string; updates: Partial<ClinicalStudy> }
  | { type: 'STUDY_STATUS_CHANGE'; studyId: string; status: StudyStatus; reason?: string }
  | { type: 'STUDY_DELETE'; studyId: string }
  | { type: 'SET_ACTIVE_STUDY'; studyId: string | null };

export type SiteAction =
  | { type: 'SITE_LOAD_START'; studyId: string; siteId?: string }
  | { type: 'SITE_LOAD_SUCCESS'; studyId: string; sites: ClinicalSite[] }
  | { type: 'SITE_LOAD_ERROR'; studyId: string; error: string }
  | { type: 'SITE_UPDATE'; studyId: string; siteId: string; updates: Partial<ClinicalSite> }
  | { type: 'SITE_STATUS_CHANGE'; studyId: string; siteId: string; status: SiteStatus; reason?: string }
  | { type: 'SITE_METRICS_UPDATE'; siteId: string; metrics: SiteMetrics }
  | { type: 'SITE_SELECT'; siteId: string }
  | { type: 'SITE_DESELECT'; siteId: string }
  | { type: 'SITE_SELECT_ALL'; studyId: string }
  | { type: 'SITE_CLEAR_SELECTION' };

export type SubjectAction =
  | { type: 'SUBJECT_LOAD_START'; studyId: string; siteId?: string }
  | { type: 'SUBJECT_LOAD_SUCCESS'; studyId: string; subjects: ClinicalSubject[] }
  | { type: 'SUBJECT_LOAD_ERROR'; studyId: string; error: string }
  | { type: 'SUBJECT_UPDATE'; subjectId: string; updates: Partial<ClinicalSubject> }
  | { type: 'SUBJECT_STATUS_CHANGE'; subjectId: string; status: SubjectStatus; reason?: string }
  | { type: 'SUBJECT_RANDOMIZE'; subjectId: string; armId: string }
  | { type: 'ENROLLMENT_METRICS_UPDATE'; studyId: string; metrics: EnrollmentMetrics };

export type VisitAction =
  | { type: 'VISIT_LOAD_START'; subjectId: string }
  | { type: 'VISIT_LOAD_SUCCESS'; subjectId: string; visits: SubjectVisit[] }
  | { type: 'VISIT_LOAD_ERROR'; subjectId: string; error: string }
  | { type: 'VISIT_SCHEDULE'; visitId: string; scheduledDate: Date }
  | { type: 'VISIT_START'; visitId: string }
  | { type: 'VISIT_COMPLETE'; visitId: string }
  | { type: 'VISIT_MISS'; visitId: string; reason: string }
  | { type: 'VISIT_RESCHEDULE'; visitId: string; newDate: Date; reason: string };

export type FormAction =
  | { type: 'FORM_LOAD_START'; visitInstanceId: string }
  | { type: 'FORM_LOAD_SUCCESS'; visitInstanceId: string; forms: FormInstance[] }
  | { type: 'FORM_LOAD_ERROR'; visitInstanceId: string; error: string }
  | { type: 'FORM_FIELD_CHANGE'; formInstanceId: string; fieldId: string; value: unknown }
  | { type: 'FORM_SAVE'; formInstanceId: string }
  | { type: 'FORM_SUBMIT'; formInstanceId: string }
  | { type: 'FORM_FREEZE'; formInstanceId: string }
  | { type: 'FORM_UNFREEZE'; formInstanceId: string; reason: string }
  | { type: 'FORM_LOCK'; formInstanceId: string }
  | { type: 'FORM_SDV_COMPLETE'; formInstanceId: string; fieldId?: string };

export type QueryAction =
  | { type: 'QUERY_LOAD_START'; formInstanceId?: string; studyId?: string }
  | { type: 'QUERY_LOAD_SUCCESS'; queries: QueryState[] }
  | { type: 'QUERY_LOAD_ERROR'; error: string }
  | { type: 'QUERY_CREATE'; query: QueryState }
  | { type: 'QUERY_RESPOND'; queryId: string; response: string }
  | { type: 'QUERY_CLOSE'; queryId: string }
  | { type: 'QUERY_CANCEL'; queryId: string; reason: string }
  | { type: 'QUERY_REOPEN'; queryId: string; reason: string }
  | { type: 'QUERY_METRICS_UPDATE'; studyId: string; metrics: QueryMetrics };

export type UIAction =
  | { type: 'SET_VIEW_MODE'; mode: ClinicalViewMode }
  | { type: 'SET_FILTERS'; filters: Partial<ClinicalFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SELECT_ITEM'; itemType: keyof SelectedItems; itemId: string }
  | { type: 'DESELECT_ITEM'; itemType: keyof SelectedItems; itemId: string }
  | { type: 'CLEAR_SELECTION'; itemType?: keyof SelectedItems };

export type ClinicalAction =
  | StudyAction
  | SiteAction
  | SubjectAction
  | VisitAction
  | FormAction
  | QueryAction
  | UIAction;

// ============================================================================
// Selector Types
// ============================================================================

export interface ClinicalSelectors {
  // Study selectors
  selectActiveStudy: (state: ClinicalStoreState) => StudyState | null;
  selectStudyById: (state: ClinicalStoreState, studyId: string) => StudyState | null;
  selectAllStudies: (state: ClinicalStoreState) => StudyState[];
  selectFilteredStudies: (state: ClinicalStoreState, filters: StudyFilters) => StudyState[];
  
  // Site selectors
  selectSiteById: (state: ClinicalStoreState, siteId: string) => SiteState | null;
  selectSitesByStudy: (state: ClinicalStoreState, studyId: string) => SiteState[];
  selectFilteredSites: (state: ClinicalStoreState, filters: SiteFilters) => SiteState[];
  selectSiteMetrics: (state: ClinicalStoreState, siteId: string) => SiteMetrics | null;
  
  // Subject selectors
  selectSubjectById: (state: ClinicalStoreState, subjectId: string) => SubjectState | null;
  selectSubjectsBySite: (state: ClinicalStoreState, siteId: string) => SubjectState[];
  selectSubjectsByStudy: (state: ClinicalStoreState, studyId: string) => SubjectState[];
  selectFilteredSubjects: (state: ClinicalStoreState, filters: SubjectFilters) => SubjectState[];
  
  // Visit selectors
  selectVisitById: (state: ClinicalStoreState, visitId: string) => VisitState | null;
  selectVisitsBySubject: (state: ClinicalStoreState, subjectId: string) => VisitState[];
  selectUpcomingVisits: (state: ClinicalStoreState, days: number) => VisitState[];
  selectOverdueVisits: (state: ClinicalStoreState) => VisitState[];
  
  // Form selectors
  selectFormById: (state: ClinicalStoreState, formId: string) => FormState | null;
  selectFormsByVisit: (state: ClinicalStoreState, visitId: string) => FormState[];
  selectIncompleteFormsBySubject: (state: ClinicalStoreState, subjectId: string) => FormState[];
  
  // Query selectors
  selectQueryById: (state: ClinicalStoreState, queryId: string) => QueryState | null;
  selectQueriesByForm: (state: ClinicalStoreState, formId: string) => QueryState[];
  selectOpenQueries: (state: ClinicalStoreState, studyId?: string) => QueryState[];
  selectOverdueQueries: (state: ClinicalStoreState) => QueryState[];
  selectFilteredQueries: (state: ClinicalStoreState, filters: QueryFilters) => QueryState[];
}

// ============================================================================
// Initial State Factories
// ============================================================================

export function createInitialStudyStoreState(): StudyStoreState {
  return {
    activeStudyId: null,
    studies: new Map(),
    isLoading: false,
    isLoadingStudy: null,
    error: null,
    filters: {},
  };
}

export function createInitialSiteStoreState(): SiteStoreState {
  return {
    sitesByStudy: new Map(),
    isLoading: false,
    isLoadingSite: null,
    error: null,
    filters: {},
    selectedSiteIds: new Set(),
  };
}

export function createInitialSubjectStoreState(): SubjectStoreState {
  return {
    subjectsByStudy: new Map(),
    enrollmentMetrics: new Map(),
    isLoading: false,
    isLoadingSubject: null,
    error: null,
    filters: {},
    selectedSubjectIds: new Set(),
  };
}

export function createInitialVisitStoreState(): VisitStoreState {
  return {
    visitsBySubject: new Map(),
    visitSchedules: new Map(),
    complianceMetrics: new Map(),
    isLoading: false,
    isLoadingVisit: null,
    error: null,
    selectedVisitIds: new Set(),
  };
}

export function createInitialEDCStoreState(): EDCStoreState {
  return {
    formsByVisit: new Map(),
    formData: new Map(),
    isLoading: false,
    isLoadingForm: null,
    isSaving: false,
    error: null,
    activeFormId: null,
    editCheckFailures: new Map(),
  };
}

export function createInitialQueryStoreState(): QueryStoreState {
  return {
    queriesByForm: new Map(),
    queriesByStudy: new Map(),
    queryMetrics: new Map(),
    isLoading: false,
    isLoadingQuery: null,
    error: null,
    selectedQueryIds: new Set(),
    filters: {},
  };
}

export function createInitialClinicalStoreState(): ClinicalStoreState {
  return {
    activeStudyId: null,
    studies: new Map(),
    sites: new Map(),
    siteMetrics: new Map(),
    subjects: new Map(),
    enrollmentMetrics: null,
    visits: new Map(),
    visitSchedule: null,
    forms: new Map(),
    formData: new Map(),
    queries: new Map(),
    queryMetrics: null,
    filters: {},
    selectedItems: {
      studyIds: new Set(),
      siteIds: new Set(),
      subjectIds: new Set(),
      visitIds: new Set(),
      formIds: new Set(),
      queryIds: new Set(),
    },
    viewMode: 'dashboard',
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStudyAction(action: ClinicalAction): action is StudyAction {
  return action.type.startsWith('STUDY_') || action.type === 'SET_ACTIVE_STUDY';
}

export function isSiteAction(action: ClinicalAction): action is SiteAction {
  return action.type.startsWith('SITE_');
}

export function isSubjectAction(action: ClinicalAction): action is SubjectAction {
  return action.type.startsWith('SUBJECT_') || action.type === 'ENROLLMENT_METRICS_UPDATE';
}

export function isVisitAction(action: ClinicalAction): action is VisitAction {
  return action.type.startsWith('VISIT_');
}

export function isFormAction(action: ClinicalAction): action is FormAction {
  return action.type.startsWith('FORM_');
}

export function isQueryAction(action: ClinicalAction): action is QueryAction {
  return action.type.startsWith('QUERY_');
}

export function isUIAction(action: ClinicalAction): action is UIAction {
  return ['SET_VIEW_MODE', 'SET_FILTERS', 'CLEAR_FILTERS', 'SELECT_ITEM', 'DESELECT_ITEM', 'CLEAR_SELECTION'].includes(action.type);
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidClinicalViewMode(value: unknown): value is ClinicalViewMode {
  const validModes: ClinicalViewMode[] = [
    'dashboard', 'sites', 'subjects', 'visits', 'edc', 'queries', 'sdv', 'randomization'
  ];
  return typeof value === 'string' && validModes.includes(value as ClinicalViewMode);
}

export function isValidQueryPriority(value: unknown): value is QueryState['priority'] {
  const validPriorities: QueryState['priority'][] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
  return typeof value === 'string' && validPriorities.includes(value as QueryState['priority']);
}

export function isValidEditCheckSeverity(value: unknown): value is EditCheckFailure['severity'] {
  const validSeverities: EditCheckFailure['severity'][] = ['WARNING', 'ERROR'];
  return typeof value === 'string' && validSeverities.includes(value as EditCheckFailure['severity']);
}
