

// ============================================================================
// Study Intelligence Store - v54
// Zustand store for enrollment forecasting, site performance analytics,
// milestone tracking, risk scoring, and cross-study benchmarking
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import type {
  StudyIntelState,
  StudyIntelActions,
  StudyIntelView,
  StudyIntelFilters,
  EnrollmentForecastConfig,
  EnrollmentForecastResult,
  ForecastDataPoint,
  ForecastScenario,
  ForecastRisk,
  SitePerformanceAnalytics,
  SiteRecommendation,
  SiteRankingData,
  SiteRankingEntry,
  StudyMilestoneTracker,
  TrackedMilestone,
  CriticalPathAnalysis,
  StudyRiskProfile,
  RiskIndicator,
  EarlyWarningSignal,
  MitigationPlan,
  CrossStudyBenchmark,
  ComparatorStudy,
  DimensionBenchmark,
  StudyIntelDashboard,
  StudyIntelAlert,
  PerformanceTier,
  PerformanceTrend,
  RiskLevel,
  RiskCategory,
  MilestoneStatus,
  ForecastModel,
} from './studyIntelTypes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => `si-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getCurrentTimestamp = () => new Date().toISOString();

const calculatePerformanceScore = (metrics: {
  enrollment: number;
  dataQuality: number;
  compliance: number;
  operations: number;
}): number => {
  return Math.round(
    metrics.enrollment * 0.35 +
    metrics.dataQuality * 0.25 +
    metrics.compliance * 0.25 +
    metrics.operations * 0.15
  );
};

const determinePerformanceTier = (score: number): PerformanceTier => {
  if (score >= 85) return 'top';
  if (score >= 70) return 'above-average';
  if (score >= 50) return 'average';
  if (score >= 35) return 'below-average';
  return 'underperforming';
};

const determineTrend = (current: number, previous: number): PerformanceTrend => {
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
};

const determineRiskLevel = (score: number): RiskLevel => {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: StudyIntelState = {
  forecastConfigs: {},
  forecastConfigsByStudy: {},
  forecastResults: {},
  latestForecastByStudy: {},
  siteAnalytics: {},
  siteAnalyticsByStudy: {},
  milestoneTrackers: {},
  trackersByStudy: {},
  riskProfiles: {},
  latestRiskByStudy: {},
  benchmarks: {},
  latestBenchmarkByStudy: {},
  dashboardData: {},
  selectedStudyId: null,
  selectedSiteId: null,
  activeView: 'dashboard',
  filters: {},
  isLoading: false,
  lastError: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useStudyIntelStore = create<StudyIntelState & StudyIntelActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // FORECAST MANAGEMENT
  // ==========================================================================

  createForecastConfig: (config) => {
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const newConfig: EnrollmentForecastConfig = {
      id,
      studyId: config.studyId || '',
      primaryModel: config.primaryModel || 's-curve',
      fallbackModel: config.fallbackModel,
      forecastHorizonDays: config.forecastHorizonDays || 180,
      granularity: config.granularity || 'weekly',
      parameters: config.parameters || {},
      useSiteSpecificRates: config.useSiteSpecificRates ?? true,
      useSeasonalAdjustment: config.useSeasonalAdjustment ?? false,
      useRegionalFactors: config.useRegionalFactors ?? true,
      historicalWeightDecay: config.historicalWeightDecay ?? 0.9,
      optimisticMultiplier: config.optimisticMultiplier ?? 1.2,
      pessimisticMultiplier: config.pessimisticMultiplier ?? 0.8,
      lastUpdated: now,
      updatedBy: 'system',
    };

    set((state) => ({
      forecastConfigs: { ...state.forecastConfigs, [id]: newConfig },
      forecastConfigsByStudy: { ...state.forecastConfigsByStudy, [newConfig.studyId]: id },
    }));

    return newConfig;
  },

  updateForecastConfig: (configId, updates) => {
    set((state) => ({
      forecastConfigs: {
        ...state.forecastConfigs,
        [configId]: {
          ...state.forecastConfigs[configId],
          ...updates,
          lastUpdated: getCurrentTimestamp(),
        },
      },
    }));
  },

  runEnrollmentForecast: (studyId, userId) => {
    const id = generateId();
    const now = getCurrentTimestamp();
    
    let configId = get().forecastConfigsByStudy[studyId];
    if (!configId) {
      const config = get().createForecastConfig({ studyId });
      configId = config.id;
    }
    const config = get().forecastConfigs[configId];

    const forecastPoints: ForecastDataPoint[] = [];
    const startDate = new Date();
    const currentEnrollment = Math.floor(Math.random() * 200) + 50;
    const targetEnrollment = 400;
    
    for (let i = 0; i < config.forecastHorizonDays; i += 7) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const progress = i / config.forecastHorizonDays;
      const sCurveValue = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
      const projected = Math.round(currentEnrollment + (targetEnrollment - currentEnrollment) * sCurveValue);
      
      forecastPoints.push({
        date: date.toISOString().split('T')[0],
        actual: i < 30 ? Math.round(currentEnrollment * (1 + i / 100)) : undefined,
        projected,
        projectedOptimistic: Math.round(projected * config.optimisticMultiplier),
        projectedPessimistic: Math.round(projected * config.pessimisticMultiplier),
        confidenceIntervalLow: Math.round(projected * 0.85),
        confidenceIntervalHigh: Math.round(projected * 1.15),
      });
    }

    const daysToCompletion = Math.round((targetEnrollment - currentEnrollment) / 3);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToCompletion);

    const scenarios: ForecastScenario[] = [
      { id: generateId(), name: 'Base Case', description: 'Current trajectory maintained', assumptions: ['Enrollment rate remains constant', 'No site closures'], projectedCompletionDate: completionDate.toISOString().split('T')[0], probability: 0.6, impactAssessment: 'On track for target completion' },
      { id: generateId(), name: 'Accelerated', description: 'Additional sites activated, improved screening', assumptions: ['3 new sites activated', '15% improved screening rate'], projectedCompletionDate: new Date(completionDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], probability: 0.25, impactAssessment: '30 days ahead of schedule' },
      { id: generateId(), name: 'Delayed', description: 'Site performance issues, competitive enrollment', assumptions: ['2 sites underperforming', 'Competitor trial launched'], projectedCompletionDate: new Date(completionDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], probability: 0.15, impactAssessment: '45 days behind schedule, budget impact $2M' },
    ];

    const forecastRisks: ForecastRisk[] = [
      { id: generateId(), category: 'site-performance', description: '3 sites showing declining enrollment rates', potentialDelayDays: 21, probability: 0.4, mitigationActions: ['Site engagement calls', 'Additional training', 'Resource support'] },
      { id: generateId(), category: 'competition', description: 'Competitor Phase 3 trial recruiting same population', potentialDelayDays: 30, probability: 0.25, mitigationActions: ['Expanded site network', 'Enhanced patient outreach'] },
    ];

    const result: EnrollmentForecastResult = {
      id, studyId, configId, generatedAt: now, generatedBy: userId,
      currentEnrollment, targetEnrollment, percentComplete: Math.round((currentEnrollment / targetEnrollment) * 100),
      projectedCompletionDate: completionDate.toISOString().split('T')[0],
      projectedCompletionDateOptimistic: scenarios[1].projectedCompletionDate,
      projectedCompletionDatePessimistic: scenarios[2].projectedCompletionDate,
      confidence: 'medium', confidenceScore: 72, forecastPoints,
      modelAccuracy: 8.5, modelFit: 0.92,
      residualAnalysis: { meanAbsoluteError: 3.2, meanSquaredError: 15.8, meanAbsolutePercentageError: 8.5, maxResidual: 12, autocorrelation: 0.15, heteroscedasticity: false },
      daysAheadBehind: -14, enrollmentVariancePercent: -8, scenarios, forecastRisks,
    };

    set((state) => ({
      forecastResults: { ...state.forecastResults, [id]: result },
      latestForecastByStudy: { ...state.latestForecastByStudy, [studyId]: id },
    }));

    return result;
  },

  runScenarioAnalysis: (studyId, scenarios) => {
    return scenarios.map((s) => ({
      id: generateId(),
      name: s.name || 'Custom Scenario',
      description: s.description || '',
      assumptions: s.assumptions || [],
      projectedCompletionDate: s.projectedCompletionDate || new Date().toISOString().split('T')[0],
      probability: s.probability || 0.5,
      impactAssessment: s.impactAssessment || '',
    }));
  },

  // ==========================================================================
  // SITE ANALYTICS
  // ==========================================================================

  calculateSitePerformance: (studyId, siteId) => {
    const id = generateId();
    const now = getCurrentTimestamp();

    const enrollmentScore = Math.floor(Math.random() * 40) + 60;
    const dataQualityScore = Math.floor(Math.random() * 40) + 60;
    const complianceScore = Math.floor(Math.random() * 40) + 60;
    const operationsScore = Math.floor(Math.random() * 40) + 60;

    const performanceScore = calculatePerformanceScore({ enrollment: enrollmentScore, dataQuality: dataQualityScore, compliance: complianceScore, operations: operationsScore });

    const analytics: SitePerformanceAnalytics = {
      id, studyId, siteId,
      siteNumber: `SITE-${siteId.slice(-3)}`,
      siteName: `Research Center ${siteId.slice(-3)}`,
      country: ['US', 'CA', 'UK', 'DE', 'FR'][Math.floor(Math.random() * 5)],
      region: ['North America', 'Europe', 'Asia-Pacific'][Math.floor(Math.random() * 3)],
      performanceScore,
      performanceTier: determinePerformanceTier(performanceScore),
      performanceTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as PerformanceTrend,
      trendChangePercent: Math.floor(Math.random() * 20) - 10,
      overallRank: Math.floor(Math.random() * 20) + 1,
      rankOutOf: 25,
      regionRank: Math.floor(Math.random() * 8) + 1,
      regionRankOutOf: 10,
      enrollmentMetrics: {
        targetEnrollment: 30,
        currentEnrollment: Math.floor(Math.random() * 25) + 5,
        percentOfTarget: Math.floor(Math.random() * 40) + 60,
        enrollmentRate: Math.random() * 3 + 1,
        enrollmentRateVsTarget: Math.random() * 0.4 + 0.8,
        screeningRate: Math.random() * 5 + 2,
        screenFailureRate: Math.random() * 0.3 + 0.1,
        randomizationRate: Math.random() * 0.9 + 0.1,
        timeToFirstScreening: Math.floor(Math.random() * 30) + 10,
        timeToFirstRandomization: Math.floor(Math.random() * 45) + 20,
        avgTimeToConsent: Math.floor(Math.random() * 7) + 3,
        projectedCompletion: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        willMeetTarget: Math.random() > 0.3,
        enrollmentTrend: 'stable',
        lastMonthEnrollment: Math.floor(Math.random() * 5) + 1,
        last3MonthAvg: Math.random() * 3 + 1,
      },
      dataQualityMetrics: {
        queryRate: Math.random() * 5 + 1,
        queryRateVsAverage: Math.random() * 0.5 + 0.75,
        queryResolutionTime: Math.floor(Math.random() * 10) + 3,
        overdueQueries: Math.floor(Math.random() * 5),
        dataEntryLag: Math.floor(Math.random() * 5) + 1,
        dataEntryLagVsAverage: Math.random() * 0.5 + 0.75,
        formsCompletionRate: Math.random() * 0.2 + 0.8,
        missingDataRate: Math.random() * 0.1,
        editCheckFailureRate: Math.random() * 0.05,
        saeReportingTimeliness: Math.random() * 0.1 + 0.9,
        queryTrend: 'stable',
        dataEntryTrend: 'improving',
      },
      complianceMetrics: {
        deviationRate: Math.random() * 3 + 0.5,
        majorDeviations: Math.floor(Math.random() * 3),
        minorDeviations: Math.floor(Math.random() * 8),
        deviationTrend: 'stable',
        visitWindowCompliance: Math.random() * 0.15 + 0.85,
        missedVisits: Math.floor(Math.random() * 5),
        unscheduledVisits: Math.floor(Math.random() * 3),
        reconsentCompleteness: Math.random() * 0.1 + 0.9,
        icfVersionCompliance: Math.random() * 0.05 + 0.95,
        trainingCompleteness: Math.random() * 0.1 + 0.9,
        gcpTrainingCurrent: Math.random() * 0.1 + 0.9,
        regulatoryDocCompleteness: Math.random() * 0.1 + 0.9,
        essentialDocsOnFile: Math.random() * 0.1 + 0.9,
      },
      operationalMetrics: {
        activationDuration: Math.floor(Math.random() * 60) + 30,
        startupEfficiency: Math.random() * 0.3 + 0.7,
        lastMonitoringVisit: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monitoringFindingsOpen: Math.floor(Math.random() * 5),
        criticalFindingsOpen: Math.floor(Math.random() * 2),
        followUpItemsOverdue: Math.floor(Math.random() * 3),
        staffTurnover: Math.random() * 0.2,
        keyStaffChanges: Math.floor(Math.random() * 2),
        responseTime: Math.floor(Math.random() * 3) + 1,
        escalationsRequested: Math.floor(Math.random() * 2),
        budgetUtilization: Math.random() * 0.3 + 0.6,
        invoiceAccuracy: Math.random() * 0.05 + 0.95,
      },
      dimensionScores: { enrollment: enrollmentScore, dataQuality: dataQualityScore, compliance: complianceScore, operations: operationsScore },
      performanceHistory: Array.from({ length: 6 }, (_, i) => ({
        date: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        performanceScore: performanceScore + Math.floor(Math.random() * 10) - 5,
        enrollmentScore: enrollmentScore + Math.floor(Math.random() * 10) - 5,
        dataQualityScore: dataQualityScore + Math.floor(Math.random() * 10) - 5,
        complianceScore: complianceScore + Math.floor(Math.random() * 10) - 5,
        operationsScore: operationsScore + Math.floor(Math.random() * 10) - 5,
        rank: Math.floor(Math.random() * 5) + (25 - performanceScore / 4),
      })),
      comparisonToAverage: [
        { metricName: 'Enrollment Rate', siteValue: 2.3, studyAverage: 2.1, percentDifference: 9.5, status: 'above' },
        { metricName: 'Query Rate', siteValue: 2.8, studyAverage: 3.2, percentDifference: -12.5, status: 'above' },
        { metricName: 'Data Entry Lag', siteValue: 2.5, studyAverage: 3.1, percentDifference: -19.4, status: 'above' },
        { metricName: 'Screen Failure Rate', siteValue: 0.22, studyAverage: 0.18, percentDifference: 22.2, status: 'below' },
      ],
      recommendations: [],
      analysisDate: now,
      dataAsOf: now,
    };

    set((state) => {
      const existingAnalytics = state.siteAnalyticsByStudy[studyId] || [];
      return {
        siteAnalytics: { ...state.siteAnalytics, [id]: analytics },
        siteAnalyticsByStudy: {
          ...state.siteAnalyticsByStudy,
          [studyId]: [...existingAnalytics.filter((a) => get().siteAnalytics[a]?.siteId !== siteId), id],
        },
      };
    });

    return analytics;
  },

  calculateAllSitePerformance: (studyId) => {
    const siteIds = ['site-001', 'site-002', 'site-003', 'site-004', 'site-005'];
    return siteIds.map((siteId) => get().calculateSitePerformance(studyId, siteId));
  },

  rankSites: (studyId) => {
    const analyticsIds = get().siteAnalyticsByStudy[studyId] || [];
    const analytics = analyticsIds.map((id) => get().siteAnalytics[id]).filter(Boolean);

    const createEntry = (a: SitePerformanceAnalytics, rank: number): SiteRankingEntry => ({
      rank, siteId: a.siteId, siteName: a.siteName, siteNumber: a.siteNumber, country: a.country,
      performanceScore: a.performanceScore, enrollmentRate: a.enrollmentMetrics.enrollmentRate,
      queryRate: a.dataQualityMetrics.queryRate, trend: a.performanceTrend, changeFromLast: a.trendChangePercent,
    });

    const sorted = [...analytics].sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      topPerformers: sorted.slice(0, 5).map((a, i) => createEntry(a, i + 1)),
      bottomPerformers: sorted.slice(-5).reverse().map((a, i) => createEntry(a, sorted.length - 4 + i)),
      mostImproved: [...analytics].sort((a, b) => b.trendChangePercent - a.trendChangePercent).slice(0, 5).map((a, i) => createEntry(a, i + 1)),
      trending: analytics.filter((a) => a.performanceTrend === 'improving').slice(0, 5).map((a, i) => createEntry(a, i + 1)),
    };
  },

  generateSiteRecommendations: (studyId, siteId) => {
    const analyticsId = (get().siteAnalyticsByStudy[studyId] || []).find((id) => get().siteAnalytics[id]?.siteId === siteId);
    if (!analyticsId) return [];

    const analytics = get().siteAnalytics[analyticsId];
    const recommendations: SiteRecommendation[] = [];

    if (analytics.enrollmentMetrics.enrollmentRate < 1.5) {
      recommendations.push({
        id: generateId(), priority: 'high', category: 'enrollment', title: 'Improve Enrollment Rate',
        description: 'Current enrollment rate is below target. Consider implementing targeted recruitment strategies.',
        expectedImpact: 'Increase enrollment rate by 30-50%',
        suggestedActions: ['Review and optimize referral pathways', 'Implement patient awareness campaigns', 'Engage community physicians'],
        estimatedEffort: 'medium',
      });
    }

    if (analytics.dataQualityMetrics.queryRate > 3) {
      recommendations.push({
        id: generateId(), priority: 'high', category: 'data-quality', title: 'Reduce Query Rate',
        description: 'Query rate is above study average. Additional training may be beneficial.',
        expectedImpact: 'Reduce query rate by 40%',
        suggestedActions: ['Conduct refresher training on CRF completion', 'Review common query patterns with site staff', 'Implement source document verification checklist'],
        estimatedEffort: 'low',
      });
    }

    return recommendations;
  },

  // ==========================================================================
  // MILESTONE TRACKING
  // ==========================================================================

  createMilestoneTracker: (studyId) => {
    const id = generateId();
    const now = getCurrentTimestamp();

    const tracker: StudyMilestoneTracker = {
      id, studyId, milestones: [],
      criticalPath: { totalDuration: 0, criticalMilestones: [], slack: {}, bottlenecks: [], projectedEndDate: '', varianceFromPlan: 0 },
      timelineHealth: 'on-track', overallVarianceDays: 0, totalMilestones: 0,
      completedMilestones: 0, atRiskMilestones: 0, delayedMilestones: 0,
      lastUpdated: now, updatedBy: 'system',
    };

    set((state) => ({
      milestoneTrackers: { ...state.milestoneTrackers, [id]: tracker },
      trackersByStudy: { ...state.trackersByStudy, [studyId]: id },
    }));

    return tracker;
  },

  addMilestone: (trackerId, milestone) => {
    const id = generateId();
    const now = getCurrentTimestamp();

    const newMilestone: TrackedMilestone = {
      id, studyId: get().milestoneTrackers[trackerId]?.studyId || '',
      name: milestone.name || 'New Milestone', description: milestone.description || '',
      category: milestone.category || 'operational', isCriticalPath: milestone.isCriticalPath ?? false,
      plannedDate: milestone.plannedDate || now, forecastDate: milestone.forecastDate || milestone.plannedDate || now,
      actualDate: milestone.actualDate, baselineDate: milestone.baselineDate || milestone.plannedDate || now,
      status: milestone.status || 'not-started', percentComplete: milestone.percentComplete || 0,
      varianceDays: 0, varianceStatus: 'on-target',
      predecessors: milestone.predecessors || [], successors: milestone.successors || [],
      dependencies: milestone.dependencies || [], completionCriteria: milestone.completionCriteria || [],
      dateHistory: [], owner: milestone.owner || '', ownerEmail: milestone.ownerEmail || '',
      notes: milestone.notes || [], risks: milestone.risks || [],
    };

    set((state) => {
      const tracker = state.milestoneTrackers[trackerId];
      if (!tracker) return state;
      return {
        milestoneTrackers: {
          ...state.milestoneTrackers,
          [trackerId]: { ...tracker, milestones: [...tracker.milestones, newMilestone], totalMilestones: tracker.totalMilestones + 1, lastUpdated: now },
        },
      };
    });

    return newMilestone;
  },

  updateMilestone: (trackerId, milestoneId, updates) => {
    set((state) => {
      const tracker = state.milestoneTrackers[trackerId];
      if (!tracker) return state;
      return {
        milestoneTrackers: {
          ...state.milestoneTrackers,
          [trackerId]: { ...tracker, milestones: tracker.milestones.map((m) => m.id === milestoneId ? { ...m, ...updates } : m), lastUpdated: getCurrentTimestamp() },
        },
      };
    });
  },

  completeMilestone: (trackerId, milestoneId, actualDate, evidence) => {
    set((state) => {
      const tracker = state.milestoneTrackers[trackerId];
      if (!tracker) return state;
      return {
        milestoneTrackers: {
          ...state.milestoneTrackers,
          [trackerId]: {
            ...tracker,
            milestones: tracker.milestones.map((m) => m.id === milestoneId ? { ...m, actualDate, status: 'completed' as MilestoneStatus, percentComplete: 100, varianceDays: Math.round((new Date(actualDate).getTime() - new Date(m.plannedDate).getTime()) / (24 * 60 * 60 * 1000)) } : m),
            completedMilestones: tracker.completedMilestones + 1,
            lastUpdated: getCurrentTimestamp(),
          },
        },
      };
    });
  },

  updateMilestoneDate: (trackerId, milestoneId, newDate, reason, userId) => {
    const now = getCurrentTimestamp();
    set((state) => {
      const tracker = state.milestoneTrackers[trackerId];
      if (!tracker) return state;
      return {
        milestoneTrackers: {
          ...state.milestoneTrackers,
          [trackerId]: {
            ...tracker,
            milestones: tracker.milestones.map((m) => m.id === milestoneId ? {
              ...m, forecastDate: newDate,
              varianceDays: Math.round((new Date(newDate).getTime() - new Date(m.plannedDate).getTime()) / (24 * 60 * 60 * 1000)),
              dateHistory: [...m.dateHistory, { id: generateId(), changeDate: now, changedBy: userId, previousDate: m.forecastDate, newDate, reason, changeType: 'forecast-update' as const }],
            } : m),
            lastUpdated: now,
          },
        },
      };
    });
  },

  runCriticalPathAnalysis: (trackerId) => {
    const tracker = get().milestoneTrackers[trackerId];
    if (!tracker) return { totalDuration: 0, criticalMilestones: [], slack: {}, bottlenecks: [], projectedEndDate: '', varianceFromPlan: 0 };

    const criticalMilestones = tracker.milestones.filter((m) => m.isCriticalPath).sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    const slack: Record<string, number> = {};
    tracker.milestones.forEach((m) => { slack[m.id] = m.isCriticalPath ? 0 : Math.floor(Math.random() * 14) + 1; });

    const bottlenecks = criticalMilestones.filter((m) => m.status === 'delayed' || m.status === 'at-risk').map((m) => ({
      milestoneId: m.id, milestoneName: m.name, delayDays: Math.abs(m.varianceDays),
      cascadeImpact: m.successors.length, mitigationOptions: ['Add resources', 'Parallel processing', 'Scope reduction'],
    }));

    const lastMilestone = criticalMilestones[criticalMilestones.length - 1];
    const projectedEndDate = lastMilestone?.forecastDate || '';
    const varianceFromPlan = lastMilestone?.varianceDays || 0;

    const analysis: CriticalPathAnalysis = {
      totalDuration: criticalMilestones.length > 0 ? Math.round((new Date(lastMilestone.forecastDate).getTime() - new Date(criticalMilestones[0].plannedDate).getTime()) / (24 * 60 * 60 * 1000)) : 0,
      criticalMilestones: criticalMilestones.map((m) => m.id), slack, bottlenecks, projectedEndDate, varianceFromPlan,
    };

    set((state) => ({
      milestoneTrackers: {
        ...state.milestoneTrackers,
        [trackerId]: { ...tracker, criticalPath: analysis, timelineHealth: varianceFromPlan > 30 ? 'delayed' : varianceFromPlan > 14 ? 'at-risk' : 'on-track', overallVarianceDays: varianceFromPlan },
      },
    }));

    return analysis;
  },

  // ==========================================================================
  // RISK MANAGEMENT
  // ==========================================================================

  assessStudyRisk: (studyId, userId) => {
    const id = generateId();
    const now = getCurrentTimestamp();

    const riskIndicators: RiskIndicator[] = [
      { id: generateId(), name: 'Enrollment Velocity', category: 'enrollment', currentValue: 2.1, threshold: { greenMax: 2.5, yellowMax: 1.5, redMax: 1.0, direction: 'higher-better' }, status: 'yellow', riskScore: 45, riskLevel: 'medium', trend: 'stable', trendValue: -5, description: 'Current enrollment rate relative to target', measurementUnit: 'subjects/week', dataSource: 'CTMS', lastUpdated: now, potentialImpact: 'May delay study completion by 4-8 weeks', affectedAreas: ['Timeline', 'Budget'] },
      { id: generateId(), name: 'Query Resolution Time', category: 'data-quality', currentValue: 8.5, threshold: { greenMax: 5, yellowMax: 10, redMax: 15, direction: 'lower-better' }, status: 'yellow', riskScore: 40, riskLevel: 'medium', trend: 'improving', trendValue: -15, description: 'Average time to resolve data queries', measurementUnit: 'days', dataSource: 'EDC', lastUpdated: now, potentialImpact: 'Database lock may be delayed', affectedAreas: ['Data Quality', 'Timeline'] },
      { id: generateId(), name: 'Site Risk Score', category: 'site-performance', currentValue: 3, threshold: { greenMax: 1, yellowMax: 3, redMax: 5, direction: 'lower-better' }, status: 'yellow', riskScore: 50, riskLevel: 'medium', trend: 'stable', trendValue: 0, description: 'Number of high-risk sites', measurementUnit: 'sites', dataSource: 'Site Analytics', lastUpdated: now, potentialImpact: 'Potential data quality and enrollment issues', affectedAreas: ['Enrollment', 'Data Quality', 'Compliance'] },
    ];

    const earlyWarnings: EarlyWarningSignal[] = [
      { id: generateId(), signalType: 'leading', category: 'enrollment', name: 'Screening Rate Decline', description: 'Screening rate has declined 15% in the last 4 weeks across 5 sites', detectedDate: now, severity: 'concern', confidence: 0.75, patternMatch: 'Pre-enrollment slowdown pattern', historicalOccurrences: 3, suggestedActions: ['Review site-specific screening funnels', 'Conduct site engagement calls', 'Assess competitive landscape'], escalationRequired: false, status: 'active' },
    ];

    const categoryScores = [
      { category: 'enrollment' as RiskCategory, score: 45, level: 'medium' as RiskLevel, trend: 'stable' as PerformanceTrend, weight: 0.25, keyDrivers: ['Low enrollment velocity'], topRisks: [] },
      { category: 'site-performance' as RiskCategory, score: 50, level: 'medium' as RiskLevel, trend: 'stable' as PerformanceTrend, weight: 0.20, keyDrivers: ['3 high-risk sites'], topRisks: [] },
      { category: 'data-quality' as RiskCategory, score: 40, level: 'medium' as RiskLevel, trend: 'improving' as PerformanceTrend, weight: 0.20, keyDrivers: ['Query resolution time'], topRisks: [] },
      { category: 'regulatory' as RiskCategory, score: 25, level: 'low' as RiskLevel, trend: 'stable' as PerformanceTrend, weight: 0.15, keyDrivers: [], topRisks: [] },
      { category: 'operational' as RiskCategory, score: 35, level: 'medium' as RiskLevel, trend: 'stable' as PerformanceTrend, weight: 0.10, keyDrivers: [], topRisks: [] },
      { category: 'safety' as RiskCategory, score: 20, level: 'low' as RiskLevel, trend: 'stable' as PerformanceTrend, weight: 0.10, keyDrivers: [], topRisks: [] },
    ];

    const overallRiskScore = Math.round(categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0));

    const profile: StudyRiskProfile = {
      id, studyId, assessmentDate: now, assessedBy: userId,
      overallRiskScore, overallRiskLevel: determineRiskLevel(overallRiskScore), overallRiskTrend: 'stable',
      categoryScores, riskIndicators, earlyWarnings,
      heatmapData: categoryScores.map((c) => ({ category: c.category, subcategory: 'overall', score: c.score, level: c.level, label: c.category })),
      riskHistory: [{ date: now, overallScore: overallRiskScore, categoryScores: Object.fromEntries(categoryScores.map((c) => [c.category, c.score])) as Record<RiskCategory, number>, activeWarnings: earlyWarnings.length, mitigationEffectiveness: 0.7 }],
      mitigationStatus: { totalMitigations: 3, completedMitigations: 1, inProgressMitigations: 2, overdueMitigations: 0, mitigationEffectiveness: 0.7, activeMitigationPlans: [] },
    };

    set((state) => ({
      riskProfiles: { ...state.riskProfiles, [id]: profile },
      latestRiskByStudy: { ...state.latestRiskByStudy, [studyId]: id },
    }));

    return profile;
  },

  updateRiskIndicator: (profileId, indicatorId, updates) => {
    set((state) => {
      const profile = state.riskProfiles[profileId];
      if (!profile) return state;
      return { riskProfiles: { ...state.riskProfiles, [profileId]: { ...profile, riskIndicators: profile.riskIndicators.map((i) => i.id === indicatorId ? { ...i, ...updates } : i) } } };
    });
  },

  acknowledgeWarning: (profileId, warningId, userId) => {
    set((state) => {
      const profile = state.riskProfiles[profileId];
      if (!profile) return state;
      return { riskProfiles: { ...state.riskProfiles, [profileId]: { ...profile, earlyWarnings: profile.earlyWarnings.map((w) => w.id === warningId ? { ...w, status: 'monitoring', assignedTo: userId } : w) } } };
    });
  },

  resolveWarning: (profileId, warningId, resolution, userId) => {
    set((state) => {
      const profile = state.riskProfiles[profileId];
      if (!profile) return state;
      return { riskProfiles: { ...state.riskProfiles, [profileId]: { ...profile, earlyWarnings: profile.earlyWarnings.map((w) => w.id === warningId ? { ...w, status: 'resolved' } : w) } } };
    });
  },

  createMitigationPlan: (profileId, plan) => {
    const id = generateId();
    const now = getCurrentTimestamp();
    const newPlan: MitigationPlan = {
      id, riskIndicatorId: plan.riskIndicatorId || '', riskName: plan.riskName || '',
      title: plan.title || 'New Mitigation Plan', description: plan.description || '', strategy: plan.strategy || '',
      owner: plan.owner || '', stakeholders: plan.stakeholders || [],
      startDate: plan.startDate || now, targetDate: plan.targetDate || '', completedDate: plan.completedDate,
      status: plan.status || 'planned', percentComplete: plan.percentComplete || 0,
      actions: plan.actions || [], expectedImpact: plan.expectedImpact || 0, actualImpact: plan.actualImpact,
    };

    set((state) => {
      const profile = state.riskProfiles[profileId];
      if (!profile) return state;
      return { riskProfiles: { ...state.riskProfiles, [profileId]: { ...profile, mitigationStatus: { ...profile.mitigationStatus, totalMitigations: profile.mitigationStatus.totalMitigations + 1, activeMitigationPlans: [...profile.mitigationStatus.activeMitigationPlans, newPlan] } } } };
    });

    return newPlan;
  },

  updateMitigationPlan: (profileId, planId, updates) => {
    set((state) => {
      const profile = state.riskProfiles[profileId];
      if (!profile) return state;
      return { riskProfiles: { ...state.riskProfiles, [profileId]: { ...profile, mitigationStatus: { ...profile.mitigationStatus, activeMitigationPlans: profile.mitigationStatus.activeMitigationPlans.map((p) => p.id === planId ? { ...p, ...updates } : p) } } } };
    });
  },

  // ==========================================================================
  // BENCHMARKING
  // ==========================================================================

  runBenchmarkAnalysis: (studyId, source, userId) => {
    const id = generateId();
    const now = getCurrentTimestamp();

    const comparatorStudies: ComparatorStudy[] = [
      { id: 'comp-001', name: 'BEACON-2023', phase: 'Phase 2', therapeuticArea: 'Oncology', indication: 'NSCLC', sampleSize: 350, startDate: '2022-03-15', completionDate: '2024-06-30', similarity: 85 },
      { id: 'comp-002', name: 'APEX-2022', phase: 'Phase 2', therapeuticArea: 'Oncology', indication: 'NSCLC', sampleSize: 400, startDate: '2021-09-01', completionDate: '2024-02-28', similarity: 78 },
      { id: 'comp-003', name: 'FRONTIER-2021', phase: 'Phase 2/3', therapeuticArea: 'Oncology', indication: 'NSCLC', sampleSize: 450, startDate: '2020-06-15', completionDate: '2023-12-15', similarity: 72 },
    ];

    const dimensionComparisons: DimensionBenchmark[] = [
      { dimension: 'enrollment-rate', studyValue: 2.3, studyValueUnit: 'subjects/site/month', benchmarkMean: 2.1, benchmarkMedian: 2.0, benchmarkP25: 1.5, benchmarkP75: 2.8, benchmarkMin: 0.8, benchmarkMax: 4.2, percentile: 62, percentileCategory: 'second-quartile', trend: 'stable', sampleSize: 45, dataQuality: 'high' },
      { dimension: 'site-activation', studyValue: 45, studyValueUnit: 'days', benchmarkMean: 52, benchmarkMedian: 48, benchmarkP25: 38, benchmarkP75: 65, benchmarkMin: 25, benchmarkMax: 95, percentile: 68, percentileCategory: 'second-quartile', trend: 'improving', sampleSize: 45, dataQuality: 'high' },
      { dimension: 'screen-failure', studyValue: 0.22, studyValueUnit: 'rate', benchmarkMean: 0.25, benchmarkMedian: 0.24, benchmarkP25: 0.18, benchmarkP75: 0.32, benchmarkMin: 0.10, benchmarkMax: 0.45, percentile: 58, percentileCategory: 'second-quartile', trend: 'stable', sampleSize: 45, dataQuality: 'medium' },
      { dimension: 'data-quality', studyValue: 2.8, studyValueUnit: 'queries/100 subjects', benchmarkMean: 3.2, benchmarkMedian: 3.0, benchmarkP25: 2.2, benchmarkP75: 4.0, benchmarkMin: 1.5, benchmarkMax: 6.5, percentile: 65, percentileCategory: 'second-quartile', trend: 'improving', sampleSize: 45, dataQuality: 'high' },
    ];

    const benchmark: CrossStudyBenchmark = {
      id, studyId, generatedAt: now, generatedBy: userId, comparatorStudies, benchmarkSource: source, dimensionComparisons,
      overallPercentile: 63, strengthAreas: ['Site activation speed', 'Data quality'], improvementAreas: ['Enrollment rate', 'Screen failure optimization'],
      keyInsights: [
        { id: generateId(), type: 'strength', dimension: 'site-activation', title: 'Fast Site Activation', description: 'Site activation time is 13% better than median', impactLevel: 'medium', evidence: ['45 days vs 52 day median'] },
        { id: generateId(), type: 'opportunity', dimension: 'enrollment-rate', title: 'Enrollment Rate Optimization', description: 'Opportunity to improve enrollment rate to top quartile', impactLevel: 'high', evidence: ['Current: 2.3, Top quartile: 2.8+'] },
      ],
      recommendations: [{ id: generateId(), priority: 'high', dimension: 'enrollment-rate', title: 'Implement site-specific enrollment targets', description: 'Set differentiated targets based on site capacity', expectedImprovement: '15-20% increase in enrollment rate', implementationEffort: 'medium', referenceSources: ['BEACON-2023'] }],
      bestPractices: [{ id: generateId(), dimension: 'site-activation', practice: 'Parallel regulatory submissions', description: 'Submit to ethics and regulatory simultaneously where permitted', sourceStudies: ['BEACON-2023', 'APEX-2022'], applicability: 'directly-applicable', expectedBenefit: '10-15 days reduction in startup' }],
    };

    set((state) => ({
      benchmarks: { ...state.benchmarks, [id]: benchmark },
      latestBenchmarkByStudy: { ...state.latestBenchmarkByStudy, [studyId]: id },
    }));

    return benchmark;
  },

  addComparatorStudy: (benchmarkId, study) => {
    set((state) => {
      const benchmark = state.benchmarks[benchmarkId];
      if (!benchmark) return state;
      const newStudy: ComparatorStudy = { id: study.id || generateId(), name: study.name || '', phase: study.phase || '', therapeuticArea: study.therapeuticArea || '', indication: study.indication || '', sampleSize: study.sampleSize || 0, startDate: study.startDate || '', completionDate: study.completionDate, similarity: study.similarity || 50 };
      return { benchmarks: { ...state.benchmarks, [benchmarkId]: { ...benchmark, comparatorStudies: [...benchmark.comparatorStudies, newStudy] } } };
    });
  },

  removeComparatorStudy: (benchmarkId, studyId) => {
    set((state) => {
      const benchmark = state.benchmarks[benchmarkId];
      if (!benchmark) return state;
      return { benchmarks: { ...state.benchmarks, [benchmarkId]: { ...benchmark, comparatorStudies: benchmark.comparatorStudies.filter((s) => s.id !== studyId) } } };
    });
  },

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  refreshDashboard: (studyId) => {
    const now = getCurrentTimestamp();
    const forecastId = get().latestForecastByStudy[studyId];
    const forecast = forecastId ? get().forecastResults[forecastId] : null;
    const riskId = get().latestRiskByStudy[studyId];
    const risk = riskId ? get().riskProfiles[riskId] : null;
    const trackerId = get().trackersByStudy[studyId];
    const tracker = trackerId ? get().milestoneTrackers[trackerId] : null;
    const siteAnalyticsIds = get().siteAnalyticsByStudy[studyId] || [];
    const siteAnalytics = siteAnalyticsIds.map((id) => get().siteAnalytics[id]).filter(Boolean);

    const dashboard: StudyIntelDashboard = {
      studyId, refreshedAt: now,
      kpiSummary: {
        enrollment: { current: forecast?.currentEnrollment || 125, target: forecast?.targetEnrollment || 400, percentComplete: forecast?.percentComplete || 31, trend: 'stable', projectedCompletion: forecast?.projectedCompletionDate || '' },
        sites: { active: siteAnalytics.length || 15, enrolling: siteAnalytics.filter((s) => s.enrollmentMetrics.currentEnrollment > 0).length || 12, atRisk: siteAnalytics.filter((s) => s.performanceTier === 'below-average' || s.performanceTier === 'underperforming').length || 3, trend: 'stable' },
        dataQuality: { queryRate: 2.8, queryRateTrend: 'improving', dataLag: 2.5 },
        timeline: { status: tracker?.timelineHealth || 'on-track', nextMilestone: tracker?.milestones.find((m) => m.status !== 'completed')?.name || 'Enrollment Complete', nextMilestoneDate: tracker?.milestones.find((m) => m.status !== 'completed')?.forecastDate || '', daysToNextMilestone: 45 },
        risk: { overallLevel: risk?.overallRiskLevel || 'medium', activeWarnings: risk?.earlyWarnings.filter((w) => w.status === 'active').length || 1, trend: risk?.overallRiskTrend || 'stable' },
      },
      enrollmentChart: {
        timeSeriesData: forecast?.forecastPoints.map((p) => ({ date: p.date, actual: p.actual || 0, target: Math.round((forecast.targetEnrollment / forecast.forecastPoints.length) * (forecast.forecastPoints.indexOf(p) + 1)), forecast: p.projected, forecastLow: p.projectedPessimistic, forecastHigh: p.projectedOptimistic })) || [],
        bySite: siteAnalytics.map((s) => ({ siteId: s.siteId, siteName: s.siteName, enrolled: s.enrollmentMetrics.currentEnrollment, target: s.enrollmentMetrics.targetEnrollment })),
        byRegion: [{ region: 'North America', enrolled: 75, target: 200 }, { region: 'Europe', enrolled: 35, target: 150 }, { region: 'Asia-Pacific', enrolled: 15, target: 50 }],
        byArm: [{ armId: 'arm-1', armName: 'Treatment', enrolled: 85, target: 270 }, { armId: 'arm-2', armName: 'Placebo', enrolled: 40, target: 130 }],
      },
      sitePerformanceMap: {
        sites: siteAnalytics.map((s) => ({
          siteId: s.siteId,
          siteName: s.siteName,
          country: s.country,
          latitude: 40 + Math.random() * 20,
          longitude: -100 + Math.random() * 60,
          performanceScore: s.performanceScore,
          performanceTier: s.performanceTier,
          enrolled: s.enrollmentMetrics.currentEnrollment,
          target: s.enrollmentMetrics.targetEnrollment,
          status: s.performanceTier === 'underperforming' ? 'at-risk' : 'active',
        })),
        regionSummary: [
          { region: 'North America', siteCount: 8, avgPerformance: 72, totalEnrolled: 75 },
          { region: 'Europe', siteCount: 5, avgPerformance: 68, totalEnrolled: 35 },
          { region: 'Asia-Pacific', siteCount: 2, avgPerformance: 65, totalEnrolled: 15 },
        ],
      },
      siteRankings: get().rankSites(studyId),
      riskSummary: {
        overallScore: risk?.overallRiskScore || 42,
        overallLevel: risk?.overallRiskLevel || 'medium',
        categoryBreakdown: risk?.categoryScores.map((c) => ({
          category: c.category,
          score: c.score,
          level: c.level,
          count: 1,
        })) || [],
        topRisks: risk?.riskIndicators.slice(0, 3).map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          level: i.riskLevel,
          trend: i.trend,
        })) || [],
        recentWarnings: risk?.earlyWarnings.map((w) => ({
          id: w.id,
          name: w.name,
          severity: w.severity,
          detectedDate: w.detectedDate,
        })) || [],
      },
      milestoneTimeline: {
        milestones: tracker?.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          plannedDate: m.plannedDate,
          forecastDate: m.forecastDate,
          actualDate: m.actualDate,
          status: m.status,
          isCriticalPath: m.isCriticalPath,
          varianceDays: m.varianceDays,
        })) || [],
        criticalPathStatus: {
          totalMilestones: tracker?.totalMilestones || 0,
          completed: tracker?.completedMilestones || 0,
          atRisk: tracker?.atRiskMilestones || 0,
          delayed: tracker?.delayedMilestones || 0,
          projectedEndDate: tracker?.criticalPath.projectedEndDate || '',
          varianceFromPlan: tracker?.criticalPath.varianceFromPlan || 0,
        },
      },
      activeAlerts: [
        {
          id: generateId(),
          type: 'enrollment',
          severity: 'warning',
          title: 'Enrollment Velocity Below Target',
          message: 'Current enrollment rate is 15% below target. Consider site engagement activities.',
          source: 'Study Intelligence',
          timestamp: now,
          acknowledged: false,
          actionRequired: true,
          suggestedAction: 'Review site-specific enrollment funnels',
        },
      ],
      suggestedActions: [
        {
          id: generateId(),
          type: 'investigate',
          title: 'Review underperforming sites',
          description: '3 sites showing declining enrollment rates',
          priority: 'high',
          estimatedImpact: 'Could improve enrollment by 10-15%',
          targetEntity: 'Sites',
        },
        {
          id: generateId(),
          type: 'monitor',
          title: 'Track query resolution times',
          description: 'Query resolution trending upward - monitor closely',
          priority: 'medium',
          estimatedImpact: 'Maintain data quality standards',
          targetEntity: 'Data Management',
        },
      ],
    };

    set((state) => ({
      dashboardData: { ...state.dashboardData, [studyId]: dashboard },
    }));

    return dashboard;
  },

  dismissAlert: (studyId, alertId) => {
    set((state) => {
      const dashboard = state.dashboardData[studyId];
      if (!dashboard) return state;

      return {
        dashboardData: {
          ...state.dashboardData,
          [studyId]: {
            ...dashboard,
            activeAlerts: dashboard.activeAlerts.filter((a) => a.id !== alertId),
          },
        },
      };
    });
  },

  acknowledgeAlert: (studyId, alertId, userId) => {
    set((state) => {
      const dashboard = state.dashboardData[studyId];
      if (!dashboard) return state;

      return {
        dashboardData: {
          ...state.dashboardData,
          [studyId]: {
            ...dashboard,
            activeAlerts: dashboard.activeAlerts.map((a) =>
              a.id === alertId ? { ...a, acknowledged: true } : a
            ),
          },
        },
      };
    });
  },

  // ==========================================================================
  // UI ACTIONS
  // ==========================================================================

  setSelectedStudy: (studyId) => set({ selectedStudyId: studyId }),
  setSelectedSite: (siteId) => set({ selectedSiteId: siteId }),
  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: {} }),

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  loadMockData: () => {
    const studyId = 'study-onco-001';
    
    // Create forecast config and run forecast
    get().createForecastConfig({ studyId, primaryModel: 's-curve' });
    get().runEnrollmentForecast(studyId, 'system');
    
    // Calculate site performance for multiple sites
    get().calculateAllSitePerformance(studyId);
    
    // Create milestone tracker with sample milestones
    const tracker = get().createMilestoneTracker(studyId);
    
    const milestones = [
      { name: 'First Site Initiated', category: 'operational' as const, isCriticalPath: true, plannedDate: '2024-01-15', forecastDate: '2024-01-15', actualDate: '2024-01-18', status: 'completed' as const },
      { name: 'First Subject Enrolled', category: 'enrollment' as const, isCriticalPath: true, plannedDate: '2024-02-01', forecastDate: '2024-02-01', actualDate: '2024-02-05', status: 'completed' as const },
      { name: '25% Enrollment', category: 'enrollment' as const, isCriticalPath: true, plannedDate: '2024-06-01', forecastDate: '2024-06-15', status: 'in-progress' as const },
      { name: '50% Enrollment', category: 'enrollment' as const, isCriticalPath: true, plannedDate: '2024-09-01', forecastDate: '2024-09-20', status: 'not-started' as const },
      { name: 'Enrollment Complete', category: 'enrollment' as const, isCriticalPath: true, plannedDate: '2024-12-01', forecastDate: '2024-12-20', status: 'not-started' as const },
      { name: 'Database Lock', category: 'data' as const, isCriticalPath: true, plannedDate: '2025-03-01', forecastDate: '2025-03-15', status: 'not-started' as const },
    ];
    
    milestones.forEach((m) => get().addMilestone(tracker.id, m));
    get().runCriticalPathAnalysis(tracker.id);
    
    // Assess risk
    get().assessStudyRisk(studyId, 'system');
    
    // Run benchmark
    get().runBenchmarkAnalysis(studyId, 'internal', 'system');
    
    // Refresh dashboard
    get().refreshDashboard(studyId);
    
    set({ selectedStudyId: studyId });
  },

  syncFromCTMS: async (studyId) => {
    set({ isLoading: true });
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));
    get().calculateAllSitePerformance(studyId);
    set({ isLoading: false });
  },

  syncFromEDC: async (studyId) => {
    set({ isLoading: true });
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Would sync data quality metrics from EDC
    set({ isLoading: false });
  },
}));

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useSelectedStudyIntel = () => {
  const selectedStudyId = useStudyIntelStore((state) => state.selectedStudyId);
  const dashboardData = useStudyIntelStore((state) => state.dashboardData);
  return selectedStudyId ? dashboardData[selectedStudyId] : null;
};

export const useStudyForecast = (studyId: string) => {
  const latestForecastByStudy = useStudyIntelStore((state) => state.latestForecastByStudy);
  const forecastResults = useStudyIntelStore((state) => state.forecastResults);
  const forecastId = latestForecastByStudy[studyId];
  return forecastId ? forecastResults[forecastId] : null;
};

export const useStudySiteAnalytics = (studyId: string) => {
  const siteAnalyticsByStudy = useStudyIntelStore((state) => state.siteAnalyticsByStudy);
  const siteAnalytics = useStudyIntelStore((state) => state.siteAnalytics);
  return useMemo(() => {
    const analyticsIds = siteAnalyticsByStudy[studyId] || [];
    return analyticsIds.map((id) => siteAnalytics[id]).filter(Boolean);
  }, [siteAnalyticsByStudy, studyId, siteAnalytics]);
};

export const useSiteAnalyticsDetail = (studyId: string, siteId: string) => {
  const siteAnalyticsByStudy = useStudyIntelStore((state) => state.siteAnalyticsByStudy);
  const siteAnalytics = useStudyIntelStore((state) => state.siteAnalytics);
  return useMemo(() => {
    const analyticsIds = siteAnalyticsByStudy[studyId] || [];
    return analyticsIds.map((id) => siteAnalytics[id]).find((a) => a?.siteId === siteId) || null;
  }, [siteAnalyticsByStudy, studyId, siteAnalytics, siteId]);
};

export const useStudyMilestoneTracker = (studyId: string) => {
  const trackersByStudy = useStudyIntelStore((state) => state.trackersByStudy);
  const milestoneTrackers = useStudyIntelStore((state) => state.milestoneTrackers);
  const trackerId = trackersByStudy[studyId];
  return trackerId ? milestoneTrackers[trackerId] : null;
};

export const useStudyRiskProfile = (studyId: string) => {
  const latestRiskByStudy = useStudyIntelStore((state) => state.latestRiskByStudy);
  const riskProfiles = useStudyIntelStore((state) => state.riskProfiles);
  const riskId = latestRiskByStudy[studyId];
  return riskId ? riskProfiles[riskId] : null;
};

export const useStudyBenchmark = (studyId: string) => {
  const latestBenchmarkByStudy = useStudyIntelStore((state) => state.latestBenchmarkByStudy);
  const benchmarks = useStudyIntelStore((state) => state.benchmarks);
  const benchmarkId = latestBenchmarkByStudy[studyId];
  return benchmarkId ? benchmarks[benchmarkId] : null;
};

export const useStudyIntelDashboard = (studyId: string) => {
  const dashboardData = useStudyIntelStore((state) => state.dashboardData);
  return dashboardData[studyId] || null;
};

export const useStudyIntelFilters = () => useStudyIntelStore((state) => state.filters);
export const useStudyIntelActiveView = () => useStudyIntelStore((state) => state.activeView);
export const useStudyIntelLoading = () => useStudyIntelStore((state) => state.isLoading);

export const useEarlyWarnings = (studyId: string) => {
  const latestRiskByStudy = useStudyIntelStore((state) => state.latestRiskByStudy);
  const riskProfiles = useStudyIntelStore((state) => state.riskProfiles);
  const riskId = latestRiskByStudy[studyId];
  return riskId ? riskProfiles[riskId]?.earlyWarnings || [] : [];
};

export const useActiveEarlyWarnings = (studyId: string) => {
  const warnings = useEarlyWarnings(studyId);
  return useMemo(() => warnings.filter((w) => w.status === 'active'), [warnings]);
};

export const useSiteRankings = (studyId: string) => {
  const dashboardData = useStudyIntelStore((state) => state.dashboardData);
  return dashboardData[studyId]?.siteRankings || null;
};
