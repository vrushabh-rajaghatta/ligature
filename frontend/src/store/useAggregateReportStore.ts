

// ============================================================================
// Aggregate Safety Reports Store - v56
// DSUR, PBRER, PSUR generation with signal detection integration
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  AggregateReportType,
  ReportGenerationStatus,
  ReportConfiguration,
  DSURReport,
  DSURSection,
  DSURSectionContent,
  PBRERReport,
  PBRERSection,
  PBRERSectionContent,
  PSURReport,
  PSURSection,
  PSURSectionContent,
  PatientExposureSummary,
  SafetyDataSummary,
  SignalSummary,
  SignalDetail,
  CrossStudyAnalysis,
  GeneratedLineListing,
  ReportReviewer,
  ReportReviewEntry,
  ReportSignature,
  BenefitRiskConclusion,
  AggregateReportView,
  AggregateReportFilters,
  AggregateReportState,
  AggregateReportActions,
} from './aggregateReportTypes';

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// DSUR Section definitions per ICH E2F
const DSUR_SECTIONS: { id: DSURSection; number: string; title: string }[] = [
  { id: 'executive-summary', number: '1', title: 'Executive Summary' },
  { id: 'introduction', number: '2', title: 'Introduction' },
  { id: 'worldwide-marketing-status', number: '3', title: 'Worldwide Marketing Authorisation Status' },
  { id: 'actions-taken', number: '4', title: 'Actions Taken in the Reporting Period for Safety Reasons' },
  { id: 'changes-to-reference-safety', number: '5', title: 'Changes to Reference Safety Information' },
  { id: 'patient-exposure', number: '6', title: 'Estimated Cumulative Exposure from Clinical Trials' },
  { id: 'individual-case-summaries', number: '7', title: 'Presentation of Individual Case Histories' },
  { id: 'studies-ongoing', number: '8', title: 'Studies' },
  { id: 'safety-findings-clinical-trials', number: '9', title: 'Safety Findings from Clinical Trials' },
  { id: 'safety-findings-non-interventional', number: '10', title: 'Safety Findings from Non-Interventional Studies' },
  { id: 'safety-related-findings-other', number: '11', title: 'Other Safety-Related Findings' },
  { id: 'non-clinical-data', number: '12', title: 'Non-Clinical Data' },
  { id: 'literature', number: '13', title: 'Literature' },
  { id: 'other-clinical-trial-safety-data', number: '14', title: 'Other Clinical Trial Safety Data' },
  { id: 'signals-new-identified', number: '15', title: 'Signal Evaluation - New Identified' },
  { id: 'signals-ongoing', number: '16', title: 'Signal Evaluation - Ongoing' },
  { id: 'signals-closed', number: '17', title: 'Signal Evaluation - Closed' },
  { id: 'benefit-risk-evaluation', number: '18', title: 'Integrated Benefit-Risk Evaluation' },
  { id: 'summary-new-information', number: '19', title: 'Summary of Important New Safety Information' },
  { id: 'conclusions', number: '20', title: 'Overall Conclusions and Risk Assessment' },
  { id: 'appendices', number: '21', title: 'Appendices' },
];

// PBRER Section definitions per ICH E2C R2
const PBRER_SECTIONS: { id: PBRERSection; number: string; title: string }[] = [
  { id: 'executive-summary', number: '1', title: 'Executive Summary' },
  { id: 'introduction', number: '2', title: 'Introduction' },
  { id: 'worldwide-marketing-authorization-status', number: '3', title: 'Worldwide Marketing Authorisation Status' },
  { id: 'actions-taken-reporting-period', number: '4', title: 'Actions Taken in the Reporting Period' },
  { id: 'changes-to-reference-safety-information', number: '5', title: 'Changes to Reference Safety Information' },
  { id: 'estimated-exposure', number: '6', title: 'Estimated Exposure and Use Patterns' },
  { id: 'data-in-summary-tabulations', number: '7', title: 'Data in Summary Tabulations' },
  { id: 'summaries-of-significant-safety-findings', number: '8', title: 'Summaries of Significant Safety Findings' },
  { id: 'signal-and-risk-evaluation', number: '9', title: 'Signal and Risk Evaluation' },
  { id: 'benefit-evaluation', number: '10', title: 'Benefit Evaluation' },
  { id: 'integrated-benefit-risk-analysis', number: '11', title: 'Integrated Benefit-Risk Analysis' },
  { id: 'conclusions-and-actions', number: '12', title: 'Conclusions and Actions' },
  { id: 'appendices', number: '13', title: 'Appendices' },
];

// PSUR Section definitions
const PSUR_SECTIONS: { id: PSURSection; number: string; title: string }[] = [
  { id: 'introduction', number: '1', title: 'Introduction' },
  { id: 'worldwide-marketing-status', number: '2', title: 'Worldwide Marketing Status' },
  { id: 'actions-taken-for-safety', number: '3', title: 'Actions Taken for Safety Reasons' },
  { id: 'changes-to-reference-product', number: '4', title: 'Changes to Reference Product Information' },
  { id: 'patient-exposure', number: '5', title: 'Patient Exposure' },
  { id: 'presentation-of-individual-case-histories', number: '6', title: 'Presentation of Individual Case Histories' },
  { id: 'studies', number: '7', title: 'Studies' },
  { id: 'other-information', number: '8', title: 'Other Information' },
  { id: 'overall-safety-evaluation', number: '9', title: 'Overall Safety Evaluation' },
  { id: 'conclusion', number: '10', title: 'Conclusion' },
];

// ============================================================================
// DEFAULT DATA
// ============================================================================

const defaultConfigurations: ReportConfiguration[] = [
  {
    id: 'config-001',
    reportType: 'DSUR',
    programId: 'prog-001',
    studyIds: ['LIG2847-301', 'LIG2847-101'],
    productName: 'LIG-2847',
    activeSubstance: 'ligaturemab',
    reportingPeriod: {
      startDate: '2024-03-15',
      endDate: '2025-03-14',
      dataLockPoint: '2025-02-15',
      previousDataLockPoint: '2024-02-15',
    },
    reportingCycle: 'annual',
    targetRegions: ['FDA', 'EMA', 'PMDA'],
    dueDate: '2025-06-14',
    submissionDeadline: '2025-06-14',
    includeLineListings: true,
    includeNarratives: true,
    includeSummaryTables: true,
    includeSignalSection: true,
    includeBenefitRiskAssessment: true,
    seriousnessThreshold: 'all',
    relatednessThreshold: 'all',
    createdAt: '2024-12-01T00:00:00Z',
    createdBy: 'Jennifer Walsh',
    updatedAt: '2024-12-10T00:00:00Z',
  },
];

const defaultFilters: AggregateReportFilters = {
  reportTypes: [],
  statuses: [],
  programIds: [],
  dateRange: null,
  searchTerm: '',
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

type AggregateReportStore = AggregateReportState & AggregateReportActions;

export const useAggregateReportStore = create<AggregateReportStore>()(
  persist(
    (set, get) => ({
      // STATE
      configurations: defaultConfigurations,
      dsurReports: [],
      pbrerReports: [],
      psurReports: [],
      crossStudyAnalyses: [],
      lineListings: [],
      selectedConfigId: null,
      selectedReportId: null,
      selectedAnalysisId: null,
      activeView: 'report-list',
      filters: defaultFilters,
      isLoading: false,
      error: null,
      wizardStep: 0,
      wizardDraft: null,

      // CONFIGURATION ACTIONS
      createConfiguration: (config, createdBy) => {
        const id = generateId('config');
        const now = timestamp();
        const newConfig: ReportConfiguration = { ...config, id, createdAt: now, createdBy, updatedAt: now };
        set((state) => ({ configurations: [...state.configurations, newConfig] }));
        return id;
      },
      
      updateConfiguration: (id, updates) => {
        set((state) => ({
          configurations: state.configurations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: timestamp() } : c
          ),
        }));
      },
      
      deleteConfiguration: (id) => {
        set((state) => ({
          configurations: state.configurations.filter((c) => c.id !== id),
          selectedConfigId: state.selectedConfigId === id ? null : state.selectedConfigId,
        }));
      },

      // DSUR ACTIONS
      generateDSUR: (configId, generatedBy) => {
        const config = get().configurations.find((c) => c.id === configId);
        if (!config) throw new Error('Configuration not found');
        
        const id = generateId('dsur');
        const now = timestamp();
        
        const sections: DSURSectionContent[] = DSUR_SECTIONS.map((s) => ({
          sectionId: s.id,
          sectionNumber: s.number,
          sectionTitle: s.title,
          content: '',
          tables: [],
          figures: [],
          status: 'not-started',
          autoGenerated: false,
        }));
        
        const dsur: DSURReport = {
          id,
          configId,
          programId: config.programId,
          version: 1,
          reportTitle: `DSUR - ${config.productName} - ${config.reportingPeriod.startDate} to ${config.reportingPeriod.endDate}`,
          developmentInternationalBirthDate: config.reportingPeriod.startDate,
          reportNumber: `DSUR-${config.productName}-${new Date().getFullYear()}`,
          coveringPeriod: config.reportingPeriod,
          status: 'not-started',
          priority: 'routine',
          sections,
          exposureSummary: {
            id: generateId('exp'),
            reportId: id,
            calculatedAt: now,
            clinicalTrialExposure: {
              studyExposures: [],
              totalSubjectsExposed: 0,
              totalSubjectYears: 0,
              activeArmExposure: 0,
              comparatorArmExposure: 0,
              meanDurationWeeks: 0,
              medianDurationWeeks: 0,
              maxDurationWeeks: 0,
            },
            totalPatientsExposed: 0,
            totalPatientYears: 0,
            exposureByAge: [],
            exposureBySex: [],
            exposureByRegion: [],
            exposureByDose: [],
            exposureByDuration: [],
            calculationMethod: 'Subject-level aggregation from EDC',
            dataLimitations: [],
          },
          safetyDataSummary: {
            id: generateId('safety'),
            reportId: id,
            dataLockPoint: config.reportingPeriod.dataLockPoint,
            totalCases: 0,
            newCasesThisPeriod: 0,
            seriousCases: 0,
            fatalCases: 0,
            clinicalTrialCases: 0,
            spontaneousCases: 0,
            literatureCases: 0,
            regulatoryCases: 0,
            relatedCases: 0,
            possiblyRelatedCases: 0,
            unrelatedCases: 0,
            notAssessable: 0,
            listedCases: 0,
            unlistedCases: 0,
            topAdverseEvents: [],
            topSOCs: [],
            susarCount: 0,
            susarsByType: [],
          },
          signalSummary: {
            reportId: id,
            evaluationDate: now,
            newSignalsIdentified: 0,
            signalsUnderEvaluation: 0,
            signalsConfirmed: 0,
            signalsRefuted: 0,
            signalsClosed: 0,
            newSignals: [],
            ongoingSignals: [],
            closedSignals: [],
            detectionMethods: ['disproportionality', 'case-review', 'literature'],
            evaluationProcess: 'Standard signal detection and evaluation per SOP',
          },
          completenessScore: 0,
          qualityIssues: [],
          reviewHistory: [],
          signatureBlock: {
            requiredSignatures: [
              { role: 'qualified-person', roleDescription: 'EU Qualified Person for Pharmacovigilance', required: true, order: 1 },
              { role: 'medical-officer', roleDescription: 'Chief Medical Officer', required: true, order: 2 },
            ],
            signatures: [],
            allSigned: false,
          },
          dataLockDate: config.reportingPeriod.dataLockPoint,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ dsurReports: [...state.dsurReports, dsur], selectedReportId: id }));
        return id;
      },
      
      updateDSURSection: (reportId, sectionId, content) => {
        set((state) => ({
          dsurReports: state.dsurReports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  sections: r.sections.map((s) =>
                    s.sectionId === sectionId ? { ...s, ...content, lastEditedAt: timestamp() } : s
                  ),
                  updatedAt: timestamp(),
                }
              : r
          ),
        }));
      },
      
      submitDSURForReview: (reportId, reviewerId) => {
        const reviewEntry: ReportReviewEntry = {
          id: generateId('review'),
          reviewerId,
          reviewerName: reviewerId,
          reviewerRole: 'author',
          action: 'submitted',
          sectionsReviewed: [],
          timestamp: timestamp(),
        };
        set((state) => ({
          dsurReports: state.dsurReports.map((r) =>
            r.id === reportId
              ? { ...r, status: 'medical-review' as ReportGenerationStatus, reviewHistory: [...r.reviewHistory, reviewEntry], updatedAt: timestamp() }
              : r
          ),
        }));
      },
      
      approveDSURSection: (reportId, sectionId, reviewerId) => {
        set((state) => ({
          dsurReports: state.dsurReports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  sections: r.sections.map((s) => s.sectionId === sectionId ? { ...s, status: 'approved' } : s),
                  reviewHistory: [...r.reviewHistory, { id: generateId('review'), reviewerId, reviewerName: reviewerId, reviewerRole: 'medical-reviewer', action: 'approved' as const, sectionsReviewed: [sectionId], timestamp: timestamp() }],
                  updatedAt: timestamp(),
                }
              : r
          ),
        }));
      },
      
      finalizeDSUR: (reportId) => {
        set((state) => ({
          dsurReports: state.dsurReports.map((r) =>
            r.id === reportId ? { ...r, status: 'finalized' as ReportGenerationStatus, finalizedDate: timestamp(), updatedAt: timestamp() } : r
          ),
        }));
      },

      // PBRER ACTIONS
      generatePBRER: (configId, generatedBy) => {
        const config = get().configurations.find((c) => c.id === configId);
        if (!config) throw new Error('Configuration not found');
        
        const id = generateId('pbrer');
        const now = timestamp();
        
        const sections: PBRERSectionContent[] = PBRER_SECTIONS.map((s) => ({
          sectionId: s.id,
          sectionNumber: s.number,
          sectionTitle: s.title,
          content: '',
          tables: [],
          figures: [],
          status: 'not-started',
          autoGenerated: false,
        }));
        
        const pbrer: PBRERReport = {
          id,
          configId,
          programId: config.programId,
          applicationIds: [],
          version: 1,
          reportTitle: `PBRER - ${config.productName} - ${config.reportingPeriod.startDate} to ${config.reportingPeriod.endDate}`,
          internationalBirthDate: config.reportingPeriod.startDate,
          dataPeriod: config.reportingPeriod,
          approvedIndications: [],
          referenceProduct: config.productName,
          marketedRegions: config.targetRegions,
          status: 'not-started',
          priority: 'routine',
          sections,
          exposureData: { cumulativeExposure: 0, exposureThisPeriod: 0, exposureUnits: 'patients', byIndication: [], byFormulation: [], byRegion: [] },
          safetyProfile: { productId: config.productName, assessmentDate: now, knownAdverseReactions: [], specialPopulations: [], knownInteractions: [], overdoseExperience: { casesReported: 0, clinicalPresentation: '', outcomes: '', management: '', antidoteAvailable: false } },
          benefitAssessment: { id: generateId('benefit'), reportId: id, assessmentDate: now, indications: [], overallBenefitRating: 'established', benefitSummary: '', efficacyData: [], clinicalRelevance: '', newEfficacyData: false, benefitChanges: [] },
          riskAssessment: { id: generateId('risk'), reportId: id, assessmentDate: now, identifiedRisks: [], potentialRisks: [], missingInformation: [], overallRiskProfile: 'acceptable', riskSummary: '', newRisksIdentified: false, riskProfileChanges: [], riskMinimizationMeasures: [] },
          benefitRiskConclusion: { reportId: id, assessmentDate: now, overallConclusion: 'favorable', conclusionText: '', indicationConclusions: [], changesFromPrevious: [], recommendations: [], proposedActions: [] },
          signalsEvaluated: [],
          reviewCycle: { currentPhase: 'drafting', reviewers: [], targetCompletionDate: config.dueDate, currentProgressPercent: 0, blockers: [] },
          signatureBlock: { requiredSignatures: [{ role: 'qualified-person', roleDescription: 'EU QPPV', required: true, order: 1 }, { role: 'medical-officer', roleDescription: 'CMO', required: true, order: 2 }], signatures: [], allSigned: false },
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ pbrerReports: [...state.pbrerReports, pbrer], selectedReportId: id }));
        return id;
      },
      
      updatePBRERSection: (reportId, sectionId, content) => {
        set((state) => ({
          pbrerReports: state.pbrerReports.map((r) =>
            r.id === reportId
              ? { ...r, sections: r.sections.map((s) => s.sectionId === sectionId ? { ...s, ...content, lastEditedAt: timestamp() } : s), updatedAt: timestamp() }
              : r
          ),
        }));
      },
      
      updateBenefitRisk: (reportId, benefitRisk) => {
        set((state) => ({
          pbrerReports: state.pbrerReports.map((r) =>
            r.id === reportId ? { ...r, benefitRiskConclusion: { ...r.benefitRiskConclusion, ...benefitRisk }, updatedAt: timestamp() } : r
          ),
        }));
      },
      
      finalizePBRER: (reportId) => {
        set((state) => ({
          pbrerReports: state.pbrerReports.map((r) =>
            r.id === reportId ? { ...r, status: 'finalized' as ReportGenerationStatus, updatedAt: timestamp() } : r
          ),
        }));
      },

      // PSUR ACTIONS
      generatePSUR: (configId, generatedBy) => {
        const config = get().configurations.find((c) => c.id === configId);
        if (!config) throw new Error('Configuration not found');
        
        const id = generateId('psur');
        const now = timestamp();
        
        const sections: PSURSectionContent[] = PSUR_SECTIONS.map((s) => ({
          sectionId: s.id,
          sectionNumber: s.number,
          sectionTitle: s.title,
          content: '',
          tables: [],
          status: 'not-started',
          autoGenerated: false,
        }));
        
        const psur: PSURReport = {
          id,
          configId,
          programId: config.programId,
          version: 1,
          reportTitle: `PSUR - ${config.productName} - ${config.reportingPeriod.startDate} to ${config.reportingPeriod.endDate}`,
          dataPeriod: config.reportingPeriod,
          status: 'not-started',
          sections,
          exposureSummary: {
            id: generateId('exp'), reportId: id, calculatedAt: now,
            clinicalTrialExposure: { studyExposures: [], totalSubjectsExposed: 0, totalSubjectYears: 0, activeArmExposure: 0, comparatorArmExposure: 0, meanDurationWeeks: 0, medianDurationWeeks: 0, maxDurationWeeks: 0 },
            totalPatientsExposed: 0, totalPatientYears: 0, exposureByAge: [], exposureBySex: [], exposureByRegion: [], exposureByDose: [], exposureByDuration: [], calculationMethod: 'Subject-level aggregation', dataLimitations: [],
          },
          caseAnalysis: { reportId: id, analysisDate: now, totalCasesAnalyzed: 0, newCasesThisPeriod: 0, seriousCases: 0, nonSeriousCases: 0, fatalCases: 0, relatedCases: 0, possiblyRelatedCases: 0, unlikelyRelatedCases: 0, notRelatedCases: 0, notAssessableCases: 0, listedReactions: 0, unlistedReactions: 0, notableCases: [], trendsIdentified: [] },
          reviewCycle: { currentPhase: 'drafting', reviewers: [], targetCompletionDate: config.dueDate, currentProgressPercent: 0, blockers: [] },
          signatureBlock: { requiredSignatures: [{ role: 'qualified-person', roleDescription: 'EU QPPV', required: true, order: 1 }], signatures: [], allSigned: false },
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ psurReports: [...state.psurReports, psur], selectedReportId: id }));
        return id;
      },
      
      updatePSURSection: (reportId, sectionId, content) => {
        set((state) => ({
          psurReports: state.psurReports.map((r) =>
            r.id === reportId ? { ...r, sections: r.sections.map((s) => s.sectionId === sectionId ? { ...s, ...content } : s), updatedAt: timestamp() } : r
          ),
        }));
      },
      
      finalizePSUR: (reportId) => {
        set((state) => ({
          psurReports: state.psurReports.map((r) =>
            r.id === reportId ? { ...r, status: 'finalized' as ReportGenerationStatus, updatedAt: timestamp() } : r
          ),
        }));
      },

      // EXPOSURE ANALYSIS
      calculateExposure: (reportId) => {
        const now = timestamp();
        const exposure: PatientExposureSummary = {
          id: generateId('exp'), reportId, calculatedAt: now,
          clinicalTrialExposure: {
            studyExposures: [
              { studyId: 'LIG2847-301', studyName: 'Phase 3 Pivotal Study', phase: 'Phase 3', subjectsExposed: 450, subjectYears: 375, treatmentDurationMean: 42, treatmentDurationMedian: 48, ongoingSubjects: 120, completedSubjects: 280, discontinuedSubjects: 50 },
              { studyId: 'LIG2847-101', studyName: 'Phase 1 First-in-Human', phase: 'Phase 1', subjectsExposed: 48, subjectYears: 24, treatmentDurationMean: 26, treatmentDurationMedian: 24, ongoingSubjects: 0, completedSubjects: 42, discontinuedSubjects: 6 },
            ],
            totalSubjectsExposed: 498, totalSubjectYears: 399, activeArmExposure: 348, comparatorArmExposure: 150, meanDurationWeeks: 38, medianDurationWeeks: 42, maxDurationWeeks: 104,
          },
          totalPatientsExposed: 498, totalPatientYears: 399,
          exposureByAge: [{ category: 'age', value: '18-44', count: 98, percentage: 19.7 }, { category: 'age', value: '45-64', count: 245, percentage: 49.2 }, { category: 'age', value: '65-74', count: 112, percentage: 22.5 }, { category: 'age', value: '≥75', count: 43, percentage: 8.6 }],
          exposureBySex: [{ category: 'sex', value: 'Male', count: 287, percentage: 57.6 }, { category: 'sex', value: 'Female', count: 211, percentage: 42.4 }],
          exposureByRegion: [{ category: 'region', value: 'North America', count: 198, percentage: 39.8 }, { category: 'region', value: 'Europe', count: 175, percentage: 35.1 }, { category: 'region', value: 'Asia-Pacific', count: 125, percentage: 25.1 }],
          exposureByDose: [{ category: 'dose', value: '100mg', count: 48, percentage: 9.6 }, { category: 'dose', value: '200mg', count: 225, percentage: 45.2 }, { category: 'dose', value: '400mg', count: 225, percentage: 45.2 }],
          exposureByDuration: [{ category: 'duration', value: '<3 months', count: 65, percentage: 13.1 }, { category: 'duration', value: '3-6 months', count: 142, percentage: 28.5 }, { category: 'duration', value: '6-12 months', count: 198, percentage: 39.8 }, { category: 'duration', value: '>12 months', count: 93, percentage: 18.7 }],
          calculationMethod: 'Subject-level aggregation from EDC systems', dataLimitations: ['Ongoing subjects counted at data lock', 'Duration calculated from first dose to last known dose'],
        };
        const dsur = get().dsurReports.find((r) => r.id === reportId);
        if (dsur) set((state) => ({ dsurReports: state.dsurReports.map((r) => r.id === reportId ? { ...r, exposureSummary: exposure, updatedAt: timestamp() } : r) }));
        return exposure;
      },

      // SAFETY SUMMARY
      generateSafetyDataSummary: (reportId) => {
        const now = timestamp();
        const summary: SafetyDataSummary = {
          id: generateId('safety'), reportId, dataLockPoint: now,
          totalCases: 142, newCasesThisPeriod: 67, seriousCases: 38, fatalCases: 2,
          clinicalTrialCases: 128, spontaneousCases: 8, literatureCases: 4, regulatoryCases: 2,
          relatedCases: 45, possiblyRelatedCases: 52, unrelatedCases: 35, notAssessable: 10,
          listedCases: 98, unlistedCases: 44,
          topAdverseEvents: [
            { preferredTerm: 'Hepatotoxicity', soc: 'Hepatobiliary disorders', totalCases: 18, seriousCases: 12, fatalCases: 0, incidenceRate: 3.6, comparatorRate: 0.8, relatedCases: 14, trend: 'stable', newThisPeriod: 8 },
            { preferredTerm: 'Fatigue', soc: 'General disorders', totalCases: 45, seriousCases: 2, fatalCases: 0, incidenceRate: 9.0, comparatorRate: 7.5, relatedCases: 38, trend: 'stable', newThisPeriod: 22 },
            { preferredTerm: 'Nausea', soc: 'Gastrointestinal disorders', totalCases: 32, seriousCases: 1, fatalCases: 0, incidenceRate: 6.4, comparatorRate: 5.2, relatedCases: 28, trend: 'decreasing', newThisPeriod: 12 },
          ],
          topSOCs: [
            { socName: 'Hepatobiliary disorders', socCode: '10019805', totalCases: 22, seriousCases: 14, fatalCases: 0, topPreferredTerms: ['Hepatotoxicity', 'ALT increased', 'AST increased'], percentOfTotal: 15.5 },
            { socName: 'General disorders', socCode: '10018065', totalCases: 52, seriousCases: 3, fatalCases: 0, topPreferredTerms: ['Fatigue', 'Asthenia', 'Pyrexia'], percentOfTotal: 36.6 },
            { socName: 'Gastrointestinal disorders', socCode: '10017947', totalCases: 41, seriousCases: 2, fatalCases: 0, topPreferredTerms: ['Nausea', 'Diarrhoea', 'Vomiting'], percentOfTotal: 28.9 },
          ],
          susarCount: 5,
          susarsByType: [{ category: 'Unexpected + Serious', count: 3, percentage: 60, listOfPTs: ['Interstitial lung disease', 'Stevens-Johnson syndrome'] }, { category: 'Fatal + Unexpected', count: 2, percentage: 40, listOfPTs: ['Cardiac arrest'] }],
          comparativeAnalysis: {
            treatmentGroup: { groupName: 'LIG-2847', totalSubjects: 348, totalEvents: 128, incidenceRate: 36.8, seriousRate: 9.2 },
            comparatorGroup: { groupName: 'Placebo', totalSubjects: 150, totalEvents: 42, incidenceRate: 28.0, seriousRate: 4.7 },
            relativeRisk: 1.31, riskDifference: 8.8, confidenceInterval: [0.98, 1.75], pValue: 0.067,
          },
        };
        const dsur = get().dsurReports.find((r) => r.id === reportId);
        if (dsur) set((state) => ({ dsurReports: state.dsurReports.map((r) => r.id === reportId ? { ...r, safetyDataSummary: summary, updatedAt: timestamp() } : r) }));
        return summary;
      },

      // SIGNAL INTEGRATION
      generateSignalSummary: (reportId, programId) => {
        const now = timestamp();
        const newSignals: SignalDetail[] = [{ signalId: 'sig-new-001', signalName: 'Interstitial Lung Disease', preferredTerm: 'Interstitial lung disease', soc: 'Respiratory disorders', detectionDate: '2024-11-15', detectionMethod: 'case-review', status: 'new', priority: 'high', observedCases: 3, expectedCases: 0.5, disproportionalityScore: 4.8, evaluationSummary: 'Three cases of ILD identified.', recommendedActions: ['Enhanced monitoring', 'IB update'] }];
        const ongoingSignals: SignalDetail[] = [{ signalId: 'sig-001', signalName: 'Hepatotoxicity Signal', preferredTerm: 'Hepatotoxicity', soc: 'Hepatobiliary disorders', detectionDate: '2024-06-20', detectionMethod: 'disproportionality', status: 'under-evaluation', priority: 'high', observedCases: 18, expectedCases: 4, disproportionalityScore: 3.2, evaluationSummary: 'Elevated reporting rate.', conclusion: 'Signal confirmed', recommendedActions: ['Label update'], labelingImpact: 'Warning update proposed' }];
        const summary: SignalSummary = { reportId, evaluationDate: now, newSignalsIdentified: 1, signalsUnderEvaluation: 1, signalsConfirmed: 1, signalsRefuted: 0, signalsClosed: 0, newSignals, ongoingSignals, closedSignals: [], detectionMethods: ['disproportionality', 'case-review', 'literature'], evaluationProcess: 'Standard signal evaluation per SOP' };
        const dsur = get().dsurReports.find((r) => r.id === reportId);
        if (dsur) set((state) => ({ dsurReports: state.dsurReports.map((r) => r.id === reportId ? { ...r, signalSummary: summary, updatedAt: timestamp() } : r) }));
        return summary;
      },

      // CROSS-STUDY ANALYSIS
      runCrossStudyAnalysis: (programId, studyIds, analysisType, userId) => {
        const id = generateId('xstudy');
        const now = timestamp();
        const analysis: CrossStudyAnalysis = {
          id, programId, analysisDate: now, analysisType,
          includedStudies: [
            { studyId: 'LIG2847-301', studyName: 'Phase 3 Pivotal', phase: 'Phase 3', design: 'Randomized, double-blind', population: 'Adults with solid tumors', totalSubjects: 600, treatmentArmSubjects: 450, primaryEndpoint: 'Overall Survival', studyStatus: 'ongoing', weight: 0.75 },
            { studyId: 'LIG2847-101', studyName: 'Phase 1 FIH', phase: 'Phase 1', design: 'Open-label, dose-escalation', population: 'Adults with solid tumors', totalSubjects: 48, treatmentArmSubjects: 48, primaryEndpoint: 'Safety', studyStatus: 'completed', weight: 0.25 },
          ],
          totalExposure: 498, totalPatientYears: 399,
          pooledSafetyResults: [
            { preferredTerm: 'Hepatotoxicity', soc: 'Hepatobiliary disorders', treatmentRate: 5.2, treatmentEvents: 26, treatmentExposed: 498, comparatorRate: 1.3, comparatorEvents: 2, comparatorExposed: 150, relativeRisk: 4.0, riskRatioLower: 1.8, riskRatioUpper: 8.9, pValue: 0.0012, heterogeneityI2: 0.12, signalFlag: true, clinicalAssessment: 'Increased hepatotoxicity risk confirmed.' },
          ],
          emergingSignals: [{ signalId: 'xsig-001', preferredTerm: 'Interstitial lung disease', studiesWithSignal: ['LIG2847-301'], combinedStrength: 'moderate', pooledIncidence: 0.6, expectedIncidence: 0.1, recommendation: 'Continue monitoring' }],
          heterogeneityAssessment: { overallI2: 0.15, heterogeneityPValue: 0.42, interpretation: 'low', sourcesOfHeterogeneity: ['Phase differences'], sensitivityAnalyses: [] },
          keyFindings: ['Hepatotoxicity risk confirmed with RR 4.0', 'Emerging ILD signal requires monitoring'], limitations: ['Phase 1 has different population'], recommendations: ['Update IB', 'Enhanced liver monitoring'],
          createdBy: userId, createdAt: now,
        };
        set((state) => ({ crossStudyAnalyses: [...state.crossStudyAnalyses, analysis], selectedAnalysisId: id }));
        return id;
      },

      // LINE LISTINGS
      generateLineListing: (configId, reportId) => {
        const id = generateId('listing');
        const now = timestamp();
        const listing: GeneratedLineListing = {
          id, configId, reportId, generatedAt: now, dataLockPoint: now, totalCases: 38,
          entries: [
            { caseId: 'case-001', caseNumber: 'LIG-2847-AE-00142', age: 67, sex: 'Male', country: 'United States', preferredTerm: 'Hepatotoxicity', soc: 'Hepatobiliary disorders', onsetDate: '2024-11-15', seriousness: 'Serious', seriousnessCriteria: ['Hospitalization'], outcome: 'Recovering', relatedness: 'Possibly related', listedness: 'Listed', studyId: 'LIG2847-301', treatmentArm: 'LIG-2847 400mg', narrativeSnippet: 'Grade 3 ALT elevation at Week 8.', source: 'Clinical trial', receiptDate: '2024-11-18' },
            { caseId: 'case-002', caseNumber: 'LIG-2847-AE-00143', age: 54, sex: 'Female', country: 'Germany', preferredTerm: 'Interstitial lung disease', soc: 'Respiratory disorders', onsetDate: '2024-12-01', seriousness: 'Serious', seriousnessCriteria: ['Hospitalization', 'Life-threatening'], outcome: 'Not recovered', relatedness: 'Related', listedness: 'Unlisted', studyId: 'LIG2847-301', treatmentArm: 'LIG-2847 200mg', narrativeSnippet: 'Dyspnea and ground-glass opacities on CT.', source: 'Clinical trial', receiptDate: '2024-12-05' },
          ],
          exportFormats: ['pdf', 'excel', 'csv'],
        };
        set((state) => ({ lineListings: [...state.lineListings, listing] }));
        return id;
      },

      // REVIEW WORKFLOW
      addReviewer: (reportId, reviewer) => {
        const fullReviewer: ReportReviewer = { ...reviewer, reviewStatus: 'pending', commentsCount: 0 };
        const pbrer = get().pbrerReports.find((r) => r.id === reportId);
        if (pbrer) {
          set((state) => ({
            pbrerReports: state.pbrerReports.map((r) =>
              r.id === reportId ? { ...r, reviewCycle: { ...r.reviewCycle, reviewers: [...r.reviewCycle.reviewers, fullReviewer] }, updatedAt: timestamp() } : r
            ),
          }));
        }
      },
      
      submitReview: (reportId, reviewerId, action, comments) => {
        const reviewEntry: ReportReviewEntry = { id: generateId('review'), reviewerId, reviewerName: reviewerId, reviewerRole: 'reviewer', action, comments, sectionsReviewed: [], timestamp: timestamp() };
        const dsur = get().dsurReports.find((r) => r.id === reportId);
        if (dsur) set((state) => ({ dsurReports: state.dsurReports.map((r) => r.id === reportId ? { ...r, reviewHistory: [...r.reviewHistory, reviewEntry], updatedAt: timestamp() } : r) }));
      },
      
      addSignature: (reportId, signature) => {
        const fullSignature: ReportSignature = { ...signature, signatureId: generateId('sig') };
        const dsur = get().dsurReports.find((r) => r.id === reportId);
        if (dsur) {
          const updatedSignatures = [...dsur.signatureBlock.signatures, fullSignature];
          const allSigned = dsur.signatureBlock.requiredSignatures.filter((rs) => rs.required).every((rs) => updatedSignatures.some((s) => s.role === rs.role));
          set((state) => ({ dsurReports: state.dsurReports.map((r) => r.id === reportId ? { ...r, signatureBlock: { ...r.signatureBlock, signatures: updatedSignatures, allSigned }, updatedAt: timestamp() } : r) }));
        }
      },

      // UI ACTIONS
      setActiveView: (view) => set({ activeView: view }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      selectConfig: (id) => set({ selectedConfigId: id }),
      selectReport: (id) => set({ selectedReportId: id }),
      selectAnalysis: (id) => set({ selectedAnalysisId: id }),

      // WIZARD
      setWizardStep: (step) => set({ wizardStep: step }),
      updateWizardDraft: (updates) => set((state) => ({ wizardDraft: { ...state.wizardDraft, ...updates } })),
      clearWizardDraft: () => set({ wizardDraft: null, wizardStep: 0 }),

      // DATA LOADING
      loadReportData: async (programId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load' });
        }
      },

      // CLEAR
      clearAll: () => set({
        configurations: [], dsurReports: [], pbrerReports: [], psurReports: [], crossStudyAnalyses: [], lineListings: [],
        selectedConfigId: null, selectedReportId: null, selectedAnalysisId: null,
        activeView: 'report-list', filters: defaultFilters, isLoading: false, error: null, wizardStep: 0, wizardDraft: null,
      }),
    }),
    { name: 'ligature-aggregate-reports', storage: createJSONStorage(() => localStorage), version: 1 }
  )
);

// ============================================================================
// SELECTOR HOOKS (with useMemo for stable references)
// ============================================================================

export const useAggregateConfigurations = () => useAggregateReportStore((s) => s.configurations);
export const useSelectedConfiguration = () => useAggregateReportStore((s) => s.configurations.find((c) => c.id === s.selectedConfigId));
export const useDSURReports = () => useAggregateReportStore((s) => s.dsurReports);
export const usePBRERReports = () => useAggregateReportStore((s) => s.pbrerReports);
export const usePSURReports = () => useAggregateReportStore((s) => s.psurReports);
export const useSelectedDSUR = () => useAggregateReportStore((s) => s.dsurReports.find((r) => r.id === s.selectedReportId));
export const useSelectedPBRER = () => useAggregateReportStore((s) => s.pbrerReports.find((r) => r.id === s.selectedReportId));
export const useSelectedPSUR = () => useAggregateReportStore((s) => s.psurReports.find((r) => r.id === s.selectedReportId));
export const useCrossStudyAnalyses = () => useAggregateReportStore((s) => s.crossStudyAnalyses);
export const useSelectedCrossStudyAnalysis = () => useAggregateReportStore((s) => s.crossStudyAnalyses.find((a) => a.id === s.selectedAnalysisId));
export const useLineListings = () => useAggregateReportStore((s) => s.lineListings);
export const useAggregateReportFilters = () => useAggregateReportStore((s) => s.filters);
export const useAggregateReportView = () => useAggregateReportStore((s) => s.activeView);
export const useAggregateReportLoading = () => useAggregateReportStore((s) => s.isLoading);
export const useAggregateReportError = () => useAggregateReportStore((s) => s.error);

export const useWizardState = () => {
  const wizardStep = useAggregateReportStore((s) => s.wizardStep);
  const wizardDraft = useAggregateReportStore((s) => s.wizardDraft);
  return useMemo(() => ({ step: wizardStep, draft: wizardDraft }), [wizardStep, wizardDraft]);
};

export const useProgramReports = (programId: string) => {
  const dsurReports = useAggregateReportStore((s) => s.dsurReports);
  const pbrerReports = useAggregateReportStore((s) => s.pbrerReports);
  const psurReports = useAggregateReportStore((s) => s.psurReports);
  return useMemo(() => ({
    dsurs: dsurReports.filter((r) => r.programId === programId),
    pbrers: pbrerReports.filter((r) => r.programId === programId),
    psurs: psurReports.filter((r) => r.programId === programId),
  }), [dsurReports, pbrerReports, psurReports, programId]);
};

export const useAllReports = () => {
  const dsurReports = useAggregateReportStore((s) => s.dsurReports);
  const pbrerReports = useAggregateReportStore((s) => s.pbrerReports);
  const psurReports = useAggregateReportStore((s) => s.psurReports);
  const filters = useAggregateReportStore((s) => s.filters);
  return useMemo(() => {
    const allReports = [
      ...dsurReports.map((r) => ({ ...r, type: 'DSUR' as const })),
      ...pbrerReports.map((r) => ({ ...r, type: 'PBRER' as const })),
      ...psurReports.map((r) => ({ ...r, type: 'PSUR' as const })),
    ];
    let filtered = allReports;
    if (filters.reportTypes.length > 0) filtered = filtered.filter((r) => filters.reportTypes.includes(r.type));
    if (filters.statuses.length > 0) filtered = filtered.filter((r) => filters.statuses.includes(r.status));
    if (filters.programIds.length > 0) filtered = filtered.filter((r) => filters.programIds.includes(r.programId));
    if (filters.searchTerm) { const term = filters.searchTerm.toLowerCase(); filtered = filtered.filter((r) => r.reportTitle.toLowerCase().includes(term)); }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dsurReports, pbrerReports, psurReports, filters]);
};

export const useUpcomingReports = () => {
  const configurations = useAggregateReportStore((s) => s.configurations);
  return useMemo(() => {
    const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return configurations.filter((c) => new Date(c.dueDate) <= thirtyDaysFromNow).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [configurations]);
};

export const useReportStats = () => {
  const configurations = useAggregateReportStore((s) => s.configurations);
  const dsurReports = useAggregateReportStore((s) => s.dsurReports);
  const pbrerReports = useAggregateReportStore((s) => s.pbrerReports);
  const psurReports = useAggregateReportStore((s) => s.psurReports);
  return useMemo(() => ({
    totalConfigurations: configurations.length,
    totalDSURs: dsurReports.length,
    totalPBRERs: pbrerReports.length,
    totalPSURs: psurReports.length,
    inProgress: [...dsurReports, ...pbrerReports, ...psurReports].filter((r) => !['finalized', 'submitted'].includes(r.status)).length,
    finalized: [...dsurReports, ...pbrerReports, ...psurReports].filter((r) => r.status === 'finalized' || r.status === 'submitted').length,
  }), [configurations, dsurReports, pbrerReports, psurReports]);
};
