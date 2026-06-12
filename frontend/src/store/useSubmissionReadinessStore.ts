

// ============================================================================
// Submission Readiness Store - v153
// "4 Weeks LSLV to Submission" Dashboard Store
// ============================================================================

import { create } from 'zustand';
import type {
  SubmissionReadinessState,
  SubmissionReadinessActions,
  SubmissionCountdown,
  WorkstreamReadiness,
  SubmissionMilestone,
  DataFlowMetrics,
  CSRAuthoringProgress,
  TMFSubmissionReadiness,
  RegulatoryDocReadiness,
  WorkstreamCategory,
  MilestoneStatus,
} from './submissionReadinessTypes';
import { GOLDEN_PATH_PRODUCT, GOLDEN_PATH_TIMELINE, GOLDEN_PATH_TEAM } from '@/data/golden-path-data';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SubmissionReadinessState = {
  selectedStudyId: null,
  countdowns: {},
  workstreams: {},
  milestones: {},
  dataFlowMetrics: {},
  csrProgress: {},
  tmfReadiness: {},
  regulatoryDocs: {},
  activeView: 'overview',
  isLoading: false,
  lastUpdated: new Date().toISOString(),
};

// ============================================================================
// STORE
// ============================================================================

export const useSubmissionReadinessStore = create<SubmissionReadinessState & SubmissionReadinessActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  setSelectedStudy: (studyId) => set({ selectedStudyId: studyId }),
  
  setActiveView: (view) => set({ activeView: view }),

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  loadSubmissionReadiness: (studyId) => {
    set({ isLoading: true });
    // In real implementation, this would fetch from API
    setTimeout(() => {
      get().loadMockData();
      set({ selectedStudyId: studyId, isLoading: false });
    }, 500);
  },

  refreshData: () => {
    set({ lastUpdated: new Date().toISOString() });
  },

  loadMockData: () => {
    const studyId = 'gp-study-301';
    const today = new Date();
    
    // Calculate dates - LSLV is in the very near future for demo impact
    const lslvDate = new Date('2024-12-30'); // 3 days from now for urgency
    const daysToLSLV = Math.ceil((lslvDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const submissionDate = new Date('2025-01-27'); // 4 weeks after LSLV
    const daysToSubmission = Math.ceil((submissionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // ========================================================================
    // SUBMISSION COUNTDOWN - The "Hero" Data
    // ========================================================================
    const countdown: SubmissionCountdown = {
      studyId,
      studyName: 'LIGATURE-1 (LIG-2847-301)',
      submissionType: 'NDA',
      region: 'US',
      
      lslvDate: '2024-12-30',
      dblDate: '2025-01-06', // Week 1 after LSLV
      csrTargetDate: '2025-01-20', // Week 3 after LSLV
      submissionTargetDate: '2025-01-27', // Week 4 after LSLV
      
      daysToLSLV,
      daysToSubmission,
      weeksToSubmission: Math.ceil(daysToSubmission / 7),
      
      overallReadiness: 87,
      overallStatus: 'on-track',
      
      // The "wow" metrics - traditional vs Ligature
      traditionalTimeline: 120, // Industry standard: 16-20 weeks
      ligatureTimeline: 28, // 4 weeks
      timelineReduction: 77, // 77% reduction
      
      workstreamSummaries: [
        { category: 'clinical-data', name: 'Clinical Data', percentComplete: 98, status: 'completed', itemsComplete: 612, itemsTotal: 612, blockerCount: 0, icon: 'users' },
        { category: 'csr-authoring', name: 'CSR Authoring', percentComplete: 89, status: 'in-progress', itemsComplete: 14, itemsTotal: 16, blockerCount: 0, icon: 'file-text' },
        { category: 'datasets', name: 'Datasets (SDTM/ADaM)', percentComplete: 95, status: 'on-track', itemsComplete: 42, itemsTotal: 44, blockerCount: 0, icon: 'database' },
        { category: 'tmf', name: 'TMF Readiness', percentComplete: 94, status: 'on-track', itemsComplete: 298, itemsTotal: 317, blockerCount: 2, icon: 'folder' },
        { category: 'regulatory-docs', name: 'Module 2 Summaries', percentComplete: 85, status: 'in-progress', itemsComplete: 6, itemsTotal: 7, blockerCount: 0, icon: 'file-check' },
        { category: 'publishing', name: 'eCTD Publishing', percentComplete: 72, status: 'on-track', itemsComplete: 0, itemsTotal: 1, blockerCount: 0, icon: 'send' },
      ],
    };

    // ========================================================================
    // DATA FLOW METRICS - Continuous Data Flow Story
    // ========================================================================
    const dataFlow: DataFlowMetrics = {
      studyId,
      asOfDate: today.toISOString(),
      
      // Subject data completeness
      subjectsWithCompleteData: 598,
      subjectsTotal: 612,
      dataCompletenessPercent: 97.7,
      
      // Query management - nearly clean!
      openQueries: 23,
      resolvedQueries: 4521,
      queryResolutionRate: 99.5,
      
      // Data cleaning - already done because it's continuous
      cleanedCRFs: 18247,
      totalCRFs: 18360,
      dataCleaningPercent: 99.4,
      
      // Dataset readiness - ready before LSLV because of continuous flow
      sdtmDomainsReady: 21,
      sdtmDomainsTotal: 22,
      adamDatasetsReady: 21,
      adamDatasetsTotal: 22,
      
      // Real-time authoring - CSR sections already have live data
      csrSectionsWithLiveData: 14,
      csrSectionsTotal: 16,
      tablesWithAutoUpdate: 47,
      figuresWithAutoUpdate: 23,
    };

    // ========================================================================
    // CSR AUTHORING PROGRESS - Already 89% done!
    // ========================================================================
    const csrProgress: CSRAuthoringProgress = {
      studyId,
      csrTitle: 'Clinical Study Report: LIGATURE-1',
      csrVersion: '0.9',
      overallProgress: 89,
      
      sectionsComplete: 11,
      sectionsInProgress: 4,
      sectionsNotStarted: 1,
      sectionsTotal: 16,
      
      aiDraftedSections: 8,
      aiGeneratedTables: 47,
      aiGeneratedFigures: 23,
      aiAssistedWordCount: 42000,
      totalWordCount: 68000,
      
      startedDate: '2024-06-01',
      targetCompletionDate: '2025-01-20',
      projectedCompletionDate: '2025-01-18',
      daysAheadOfSchedule: 2,
      
      sections: [
        { id: 'csr-1', studyId, sectionNumber: '1', sectionTitle: 'Title Page & Synopsis', icHModule: '1', status: 'final', percentComplete: 100, wordCount: 2500, targetWordCount: 2500, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-11-01', lastUpdated: '2024-11-15', hasLiveDataConnection: false, tablesGenerated: 2, figuresGenerated: 0, aiAssistedPercent: 30 },
        { id: 'csr-2', studyId, sectionNumber: '5', sectionTitle: 'Ethics', icHModule: '5', status: 'final', percentComplete: 100, wordCount: 1200, targetWordCount: 1200, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-10-15', lastUpdated: '2024-10-20', hasLiveDataConnection: false, tablesGenerated: 1, figuresGenerated: 0, aiAssistedPercent: 45 },
        { id: 'csr-3', studyId, sectionNumber: '6', sectionTitle: 'Investigators & Study Sites', icHModule: '6', status: 'final', percentComplete: 100, wordCount: 800, targetWordCount: 800, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-10-15', lastUpdated: '2024-10-18', hasLiveDataConnection: true, tablesGenerated: 2, figuresGenerated: 0, aiAssistedPercent: 80 },
        { id: 'csr-4', studyId, sectionNumber: '7', sectionTitle: 'Introduction', icHModule: '7', status: 'final', percentComplete: 100, wordCount: 3500, targetWordCount: 3500, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-10-01', lastUpdated: '2024-10-05', hasLiveDataConnection: false, tablesGenerated: 0, figuresGenerated: 1, aiAssistedPercent: 40 },
        { id: 'csr-5', studyId, sectionNumber: '8', sectionTitle: 'Study Objectives', icHModule: '8', status: 'final', percentComplete: 100, wordCount: 1500, targetWordCount: 1500, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-10-01', lastUpdated: '2024-10-03', hasLiveDataConnection: false, tablesGenerated: 0, figuresGenerated: 0, aiAssistedPercent: 35 },
        { id: 'csr-6', studyId, sectionNumber: '9', sectionTitle: 'Investigational Plan', icHModule: '9', status: 'final', percentComplete: 100, wordCount: 8500, targetWordCount: 8500, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-10-15', lastUpdated: '2024-10-20', hasLiveDataConnection: false, tablesGenerated: 5, figuresGenerated: 2, aiAssistedPercent: 50 },
        { id: 'csr-7', studyId, sectionNumber: '10', sectionTitle: 'Study Patients', icHModule: '10', status: 'final', percentComplete: 100, wordCount: 4200, targetWordCount: 4200, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-11-15', lastUpdated: '2024-12-20', hasLiveDataConnection: true, tablesGenerated: 8, figuresGenerated: 3, aiAssistedPercent: 75 },
        { id: 'csr-8', studyId, sectionNumber: '11.1', sectionTitle: 'Extent of Exposure', icHModule: '11.1', status: 'final', percentComplete: 100, wordCount: 3800, targetWordCount: 3800, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-11-30', lastUpdated: '2024-12-22', hasLiveDataConnection: true, tablesGenerated: 6, figuresGenerated: 2, aiAssistedPercent: 85 },
        { id: 'csr-9', studyId, sectionNumber: '11.2', sectionTitle: 'Efficacy Evaluation', icHModule: '11.2', status: 'medical-review', percentComplete: 92, wordCount: 12500, targetWordCount: 13500, author: GOLDEN_PATH_TEAM.medicalWriter.name, reviewer: GOLDEN_PATH_TEAM.medicalDirector.name, dueDate: '2025-01-10', lastUpdated: '2024-12-26', hasLiveDataConnection: true, tablesGenerated: 12, figuresGenerated: 8, aiAssistedPercent: 70 },
        { id: 'csr-10', studyId, sectionNumber: '11.3', sectionTitle: 'PK/PD Evaluation', icHModule: '11.3', status: 'final', percentComplete: 100, wordCount: 5200, targetWordCount: 5200, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-12-01', lastUpdated: '2024-12-10', hasLiveDataConnection: true, tablesGenerated: 4, figuresGenerated: 3, aiAssistedPercent: 65 },
        { id: 'csr-11', studyId, sectionNumber: '12', sectionTitle: 'Safety Evaluation', icHModule: '12', status: 'medical-review', percentComplete: 88, wordCount: 15800, targetWordCount: 18000, author: GOLDEN_PATH_TEAM.medicalWriter.name, reviewer: GOLDEN_PATH_TEAM.safetyPhysician.name, dueDate: '2025-01-15', lastUpdated: '2024-12-26', hasLiveDataConnection: true, tablesGenerated: 15, figuresGenerated: 5, aiAssistedPercent: 72 },
        { id: 'csr-12', studyId, sectionNumber: '13', sectionTitle: 'Discussion & Conclusions', icHModule: '13', status: 'drafting', percentComplete: 65, wordCount: 3200, targetWordCount: 5000, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2025-01-18', lastUpdated: '2024-12-26', hasLiveDataConnection: false, tablesGenerated: 0, figuresGenerated: 0, aiAssistedPercent: 40 },
        { id: 'csr-13', studyId, sectionNumber: '14', sectionTitle: 'Tables, Figures, Graphs', icHModule: '14', status: 'qc-review', percentComplete: 95, wordCount: 500, targetWordCount: 500, author: GOLDEN_PATH_TEAM.medicalWriter.name, reviewer: GOLDEN_PATH_TEAM.qcSpecialist.name, dueDate: '2025-01-12', lastUpdated: '2024-12-25', hasLiveDataConnection: true, tablesGenerated: 47, figuresGenerated: 23, aiAssistedPercent: 90 },
        { id: 'csr-14', studyId, sectionNumber: '15', sectionTitle: 'Reference List', icHModule: '15', status: 'final', percentComplete: 100, wordCount: 800, targetWordCount: 800, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-12-15', lastUpdated: '2024-12-15', hasLiveDataConnection: false, tablesGenerated: 0, figuresGenerated: 0, aiAssistedPercent: 95 },
        { id: 'csr-15', studyId, sectionNumber: '16.1', sectionTitle: 'Protocol & Amendments', icHModule: '16.1', status: 'approved', percentComplete: 100, wordCount: 200, targetWordCount: 200, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2024-11-01', lastUpdated: '2024-11-05', hasLiveDataConnection: false, tablesGenerated: 0, figuresGenerated: 0, aiAssistedPercent: 20 },
        { id: 'csr-16', studyId, sectionNumber: '16.2-16.4', sectionTitle: 'Appendices (CRFs, Listings, Datasets)', icHModule: '16.2', status: 'data-pending', percentComplete: 45, wordCount: 3000, targetWordCount: 6500, author: GOLDEN_PATH_TEAM.medicalWriter.name, dueDate: '2025-01-20', lastUpdated: '2024-12-26', hasLiveDataConnection: true, tablesGenerated: 0, figuresGenerated: 0, aiAssistedPercent: 85, blockers: ['Final dataset validation pending'] },
      ],
    };

    // ========================================================================
    // TMF READINESS - Ready for inspection
    // ========================================================================
    const tmfReadiness: TMFSubmissionReadiness = {
      studyId,
      overallCompleteness: 94,
      criticalArtifactsComplete: 156,
      criticalArtifactsTotal: 162,
      
      sitesReadyForClose: 68,
      sitesTotalActive: 72,
      essentialDocsComplete: 298,
      essentialDocsExpected: 317,
      
      projectedCloseDate: '2025-01-20',
      daysToClose: 24,
      
      zoneReadiness: [
        { zone: '01', zoneName: 'Central Trial Documents', artifactsComplete: 28, artifactsExpected: 28, percentComplete: 100, criticalMissing: [], status: 'completed' },
        { zone: '02', zoneName: 'Central Trial Management', artifactsComplete: 35, artifactsExpected: 36, percentComplete: 97, criticalMissing: [], status: 'on-track' },
        { zone: '03', zoneName: 'Regulatory', artifactsComplete: 42, artifactsExpected: 42, percentComplete: 100, criticalMissing: [], status: 'completed' },
        { zone: '04', zoneName: 'IRB/IEC & Ethics', artifactsComplete: 38, artifactsExpected: 40, percentComplete: 95, criticalMissing: [], status: 'on-track' },
        { zone: '05', zoneName: 'Site Management', artifactsComplete: 85, artifactsExpected: 92, percentComplete: 92, criticalMissing: ['4 sites pending close-out visit reports'], status: 'in-progress' },
        { zone: '06', zoneName: 'IP & Trial Supplies', artifactsComplete: 22, artifactsExpected: 24, percentComplete: 92, criticalMissing: ['Drug accountability reconciliation pending for 2 sites'], status: 'in-progress' },
        { zone: '07', zoneName: 'Safety Reporting', artifactsComplete: 28, artifactsExpected: 28, percentComplete: 100, criticalMissing: [], status: 'completed' },
        { zone: '08', zoneName: 'Statistics & Data', artifactsComplete: 20, artifactsExpected: 27, percentComplete: 74, criticalMissing: ['Final analysis datasets', 'TLF validation'], status: 'in-progress' },
      ],
    };

    // ========================================================================
    // MILESTONES - 4-Week Timeline View
    // ========================================================================
    const milestones: SubmissionMilestone[] = [
      // Week -1 (before LSLV) - Already done
      { id: 'ms-1', name: 'Protocol Amendments Complete', shortName: 'Protocol', category: 'regulatory-docs', description: 'All protocol amendments finalized', targetDate: '2024-12-15', actualDate: '2024-12-12', status: 'completed', daysFromLSLV: -15, percentComplete: 100, owner: GOLDEN_PATH_TEAM.clinicalLead.name, ownerRole: 'Clinical Lead' },
      { id: 'ms-2', name: 'EDC Data Entry Complete', shortName: 'EDC Complete', category: 'clinical-data', description: 'All CRF data entered for enrolled subjects', targetDate: '2024-12-20', actualDate: '2024-12-18', status: 'completed', daysFromLSLV: -10, percentComplete: 100, owner: GOLDEN_PATH_TEAM.studyManager.name, ownerRole: 'Study Manager' },
      { id: 'ms-3', name: 'Query Resolution 99%', shortName: 'Queries Clean', category: 'clinical-data', description: 'Queries resolved to <1% open', targetDate: '2024-12-25', actualDate: '2024-12-24', status: 'completed', daysFromLSLV: -5, percentComplete: 100, owner: GOLDEN_PATH_TEAM.studyManager.name, ownerRole: 'Study Manager' },
      
      // Day 0 - LSLV
      { id: 'ms-4', name: 'Last Subject Last Visit (LSLV)', shortName: 'LSLV', category: 'clinical-data', description: 'Final patient completes study', targetDate: '2024-12-30', status: 'on-track', daysFromLSLV: 0, percentComplete: 98, owner: GOLDEN_PATH_TEAM.clinicalLead.name, ownerRole: 'Clinical Lead' },
      
      // Week 1 (Days 1-7)
      { id: 'ms-5', name: 'Final EDC Data Entry', shortName: 'Final Data', category: 'clinical-data', description: 'All remaining CRF pages entered', targetDate: '2025-01-02', status: 'on-track', daysFromLSLV: 3, percentComplete: 95, owner: GOLDEN_PATH_TEAM.studyManager.name, ownerRole: 'Study Manager' },
      { id: 'ms-6', name: 'Database Lock', shortName: 'DBL', category: 'datasets', description: 'Clinical database locked', targetDate: '2025-01-06', status: 'on-track', daysFromLSLV: 7, percentComplete: 90, owner: GOLDEN_PATH_TEAM.studyManager.name, ownerRole: 'Study Manager' },
      { id: 'ms-7', name: 'SDTM Datasets Final', shortName: 'SDTM Final', category: 'datasets', description: 'All SDTM domains validated', targetDate: '2025-01-06', status: 'on-track', daysFromLSLV: 7, percentComplete: 95, owner: 'Data Management', ownerRole: 'Biostatistics' },
      
      // Week 2 (Days 8-14)
      { id: 'ms-8', name: 'ADaM Datasets Final', shortName: 'ADaM Final', category: 'datasets', description: 'Analysis datasets complete', targetDate: '2025-01-10', status: 'on-track', daysFromLSLV: 11, percentComplete: 92, owner: 'Data Management', ownerRole: 'Biostatistics' },
      { id: 'ms-9', name: 'Primary Analysis Complete', shortName: 'Analysis', category: 'datasets', description: 'Efficacy and safety analyses run', targetDate: '2025-01-13', status: 'on-track', daysFromLSLV: 14, percentComplete: 85, owner: 'Biostatistics', ownerRole: 'Biostatistics' },
      { id: 'ms-10', name: 'TLF Finalization', shortName: 'TLFs', category: 'csr-authoring', description: 'Tables, listings, figures finalized', targetDate: '2025-01-13', status: 'in-progress', daysFromLSLV: 14, percentComplete: 78, owner: GOLDEN_PATH_TEAM.medicalWriter.name, ownerRole: 'Medical Writing' },
      
      // Week 3 (Days 15-21)
      { id: 'ms-11', name: 'CSR Body Complete', shortName: 'CSR Body', category: 'csr-authoring', description: 'All narrative sections finalized', targetDate: '2025-01-17', status: 'in-progress', daysFromLSLV: 18, percentComplete: 72, owner: GOLDEN_PATH_TEAM.medicalWriter.name, ownerRole: 'Medical Writing' },
      { id: 'ms-12', name: 'CSR Medical Review', shortName: 'CSR Med Review', category: 'csr-authoring', description: 'Medical Director sign-off', targetDate: '2025-01-18', status: 'in-progress', daysFromLSLV: 19, percentComplete: 65, owner: GOLDEN_PATH_TEAM.medicalDirector.name, ownerRole: 'Medical Director' },
      { id: 'ms-13', name: 'CSR QC Complete', shortName: 'CSR QC', category: 'csr-authoring', description: 'Quality control review complete', targetDate: '2025-01-20', status: 'not-started', daysFromLSLV: 21, percentComplete: 0, owner: GOLDEN_PATH_TEAM.qcSpecialist.name, ownerRole: 'QC' },
      { id: 'ms-14', name: 'TMF Close-out', shortName: 'TMF Close', category: 'tmf', description: 'Trial master file archived', targetDate: '2025-01-20', status: 'in-progress', daysFromLSLV: 21, percentComplete: 68, owner: 'TMF Manager', ownerRole: 'Clinical Operations' },
      
      // Week 4 (Days 22-28)
      { id: 'ms-15', name: 'Module 5 Assembly', shortName: 'M5 Assembly', category: 'publishing', description: 'CSR and datasets assembled', targetDate: '2025-01-22', status: 'not-started', daysFromLSLV: 23, percentComplete: 0, owner: GOLDEN_PATH_TEAM.submissionsManager.name, ownerRole: 'Submissions' },
      { id: 'ms-16', name: 'eCTD Validation', shortName: 'Validation', category: 'publishing', description: 'Full eCTD validation pass', targetDate: '2025-01-24', status: 'not-started', daysFromLSLV: 25, percentComplete: 0, owner: GOLDEN_PATH_TEAM.submissionsManager.name, ownerRole: 'Submissions' },
      { id: 'ms-17', name: 'Final QA Release', shortName: 'QA Release', category: 'publishing', description: 'Quality assurance approval', targetDate: '2025-01-25', status: 'not-started', daysFromLSLV: 26, percentComplete: 0, owner: GOLDEN_PATH_TEAM.qualityHead.name, ownerRole: 'Quality' },
      { id: 'ms-18', name: 'NDA Module 5 Submission', shortName: 'Submit', category: 'publishing', description: 'Gateway submission to FDA ESG', targetDate: '2025-01-27', status: 'not-started', daysFromLSLV: 28, percentComplete: 0, owner: GOLDEN_PATH_TEAM.regulatoryLead.name, ownerRole: 'Regulatory Affairs' },
    ];

    // ========================================================================
    // WORKSTREAMS
    // ========================================================================
    const workstreams: WorkstreamReadiness[] = [
      {
        id: 'ws-1',
        studyId,
        category: 'clinical-data',
        name: 'Clinical Data',
        description: 'Subject data collection and quality',
        percentComplete: 98,
        status: 'completed',
        startedAt: '2023-03-18',
        projectedComplete: '2024-12-30',
        items: [
          { id: 'ws-1-1', workstreamId: 'ws-1', name: 'Subject Enrollment', type: 'milestone', status: 'complete', percentComplete: 100 },
          { id: 'ws-1-2', workstreamId: 'ws-1', name: 'CRF Data Entry', type: 'task', status: 'complete', percentComplete: 100, aiAssisted: false },
          { id: 'ws-1-3', workstreamId: 'ws-1', name: 'Query Resolution', type: 'task', status: 'complete', percentComplete: 99.5, aiAssisted: false },
          { id: 'ws-1-4', workstreamId: 'ws-1', name: 'SAE Reconciliation', type: 'task', status: 'complete', percentComplete: 100, aiAssisted: false },
          { id: 'ws-1-5', workstreamId: 'ws-1', name: 'LSLV Data Entry', type: 'task', status: 'in-progress', percentComplete: 85, dueDate: '2025-01-02' },
        ],
        blockers: [],
        trend: 'stable',
        velocity: 12,
      },
      {
        id: 'ws-2',
        studyId,
        category: 'csr-authoring',
        name: 'CSR Authoring',
        description: 'Clinical study report development',
        percentComplete: 89,
        status: 'in-progress',
        startedAt: '2024-06-01',
        projectedComplete: '2025-01-20',
        items: [
          { id: 'ws-2-1', workstreamId: 'ws-2', name: 'Synopsis & Title Page', type: 'section', status: 'complete', percentComplete: 100, aiAssisted: true },
          { id: 'ws-2-2', workstreamId: 'ws-2', name: 'Study Design Sections', type: 'section', status: 'complete', percentComplete: 100, aiAssisted: true },
          { id: 'ws-2-3', workstreamId: 'ws-2', name: 'Efficacy Analysis', type: 'section', status: 'in-progress', percentComplete: 92, aiAssisted: true, dueDate: '2025-01-10' },
          { id: 'ws-2-4', workstreamId: 'ws-2', name: 'Safety Narrative', type: 'section', status: 'in-progress', percentComplete: 88, aiAssisted: true, dueDate: '2025-01-15' },
          { id: 'ws-2-5', workstreamId: 'ws-2', name: 'Discussion & Conclusions', type: 'section', status: 'in-progress', percentComplete: 65, dueDate: '2025-01-18' },
          { id: 'ws-2-6', workstreamId: 'ws-2', name: 'Tables & Figures', type: 'section', status: 'in-progress', percentComplete: 95, aiAssisted: true, dueDate: '2025-01-12' },
        ],
        blockers: [],
        trend: 'improving',
        velocity: 2.5,
      },
      {
        id: 'ws-3',
        studyId,
        category: 'datasets',
        name: 'Datasets (SDTM/ADaM)',
        description: 'CDISC-compliant dataset preparation',
        percentComplete: 95,
        status: 'on-track',
        startedAt: '2024-01-15',
        projectedComplete: '2025-01-10',
        items: [
          { id: 'ws-3-1', workstreamId: 'ws-3', name: 'SDTM Mapping', type: 'task', status: 'complete', percentComplete: 100 },
          { id: 'ws-3-2', workstreamId: 'ws-3', name: 'SDTM Validation', type: 'task', status: 'complete', percentComplete: 100 },
          { id: 'ws-3-3', workstreamId: 'ws-3', name: 'ADaM Derivation', type: 'task', status: 'in-progress', percentComplete: 95, dueDate: '2025-01-06' },
          { id: 'ws-3-4', workstreamId: 'ws-3', name: 'Define.xml', type: 'task', status: 'in-progress', percentComplete: 90, dueDate: '2025-01-08' },
          { id: 'ws-3-5', workstreamId: 'ws-3', name: 'Pinnacle 21 Validation', type: 'task', status: 'in-progress', percentComplete: 88, dueDate: '2025-01-10' },
        ],
        blockers: [],
        trend: 'stable',
        velocity: 3,
      },
      {
        id: 'ws-4',
        studyId,
        category: 'tmf',
        name: 'TMF Readiness',
        description: 'Trial master file completeness',
        percentComplete: 94,
        status: 'on-track',
        startedAt: '2023-01-15',
        projectedComplete: '2025-01-20',
        items: [
          { id: 'ws-4-1', workstreamId: 'ws-4', name: 'Zone 1-4 Essential Docs', type: 'task', status: 'complete', percentComplete: 100 },
          { id: 'ws-4-2', workstreamId: 'ws-4', name: 'Zone 5 Site Docs', type: 'task', status: 'in-progress', percentComplete: 92, dueDate: '2025-01-15' },
          { id: 'ws-4-3', workstreamId: 'ws-4', name: 'Zone 6 IP Accountability', type: 'task', status: 'in-progress', percentComplete: 92, dueDate: '2025-01-10' },
          { id: 'ws-4-4', workstreamId: 'ws-4', name: 'Zone 8 Statistics', type: 'task', status: 'in-progress', percentComplete: 74, dueDate: '2025-01-20' },
          { id: 'ws-4-5', workstreamId: 'ws-4', name: 'Archive Preparation', type: 'task', status: 'not-started', percentComplete: 0, dueDate: '2025-01-25' },
        ],
        blockers: [
          { id: 'b-1', workstreamId: 'ws-4', description: '4 sites pending close-out visit reports', severity: 'minor', createdAt: '2024-12-20', owner: 'CRA Team' },
          { id: 'b-2', workstreamId: 'ws-4', description: 'Drug accountability reconciliation for 2 sites', severity: 'minor', createdAt: '2024-12-22', owner: 'IP Management' },
        ],
        trend: 'improving',
        velocity: 8,
      },
    ];

    // ========================================================================
    // SET STATE
    // ========================================================================
    set({
      countdowns: { [studyId]: countdown },
      workstreams: { [studyId]: workstreams },
      milestones: { [studyId]: milestones },
      dataFlowMetrics: { [studyId]: dataFlow },
      csrProgress: { [studyId]: csrProgress },
      tmfReadiness: { [studyId]: tmfReadiness },
      selectedStudyId: studyId,
      lastUpdated: new Date().toISOString(),
    });
  },

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getCountdown: (studyId) => get().countdowns[studyId],
  getWorkstreams: (studyId) => get().workstreams[studyId] || [],
  getMilestones: (studyId) => get().milestones[studyId] || [],
  getDataFlowMetrics: (studyId) => get().dataFlowMetrics[studyId],
  getCSRProgress: (studyId) => get().csrProgress[studyId],
  getTMFReadiness: (studyId) => get().tmfReadiness[studyId],
}));

// ============================================================================
// SELECTORS
// ============================================================================

const EMPTY_WORKSTREAMS: never[] = [];
const EMPTY_MILESTONES: never[] = [];

export const useSelectedStudyCountdown = () =>
  useSubmissionReadinessStore((state) =>
    state.selectedStudyId ? state.countdowns[state.selectedStudyId] : undefined
  );

export const useSelectedStudyWorkstreams = () => {
  const selectedStudyId = useSubmissionReadinessStore((state) => state.selectedStudyId);
  const workstreams = useSubmissionReadinessStore((state) => 
    selectedStudyId ? state.workstreams[selectedStudyId] : undefined
  );
  return workstreams || EMPTY_WORKSTREAMS;
};

export const useSelectedStudyMilestones = () => {
  const selectedStudyId = useSubmissionReadinessStore((state) => state.selectedStudyId);
  const milestones = useSubmissionReadinessStore((state) =>
    selectedStudyId ? state.milestones[selectedStudyId] : undefined
  );
  return milestones || EMPTY_MILESTONES;
};

export const useSelectedStudyDataFlow = () =>
  useSubmissionReadinessStore((state) =>
    state.selectedStudyId ? state.dataFlowMetrics[state.selectedStudyId] : undefined
  );

export const useSelectedStudyCSRProgress = () =>
  useSubmissionReadinessStore((state) =>
    state.selectedStudyId ? state.csrProgress[state.selectedStudyId] : undefined
  );
