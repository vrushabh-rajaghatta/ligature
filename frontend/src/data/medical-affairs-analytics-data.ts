// ============================================================================
// Medical Affairs Analytics Data - v0.5.4
// KOL Analytics, MSL Performance, Publication Metrics, Cross-Module Intelligence
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type TimeFrame = 'mtd' | 'qtd' | 'ytd' | 'last-30' | 'last-90' | 'last-365' | 'custom';
export type MetricTrend = 'up' | 'down' | 'stable';
export type BenchmarkComparison = 'above' | 'below' | 'at-target';

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  previousValue?: number;
  trend: MetricTrend;
  trendPercentage: number;
  benchmarkComparison?: BenchmarkComparison;
  category: 'engagement' | 'productivity' | 'quality' | 'compliance' | 'impact';
}

export interface KOLAnalytics {
  totalKOLs: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  emergingCount: number;
  engagementRate: number;
  avgInteractionsPerKOL: number;
  coverageRate: number;
  newKOLsThisQuarter: number;
  kolsByTherapeuticArea: { area: string; count: number }[];
  kolEngagementTrend: TrendDataPoint[];
  topEngagedKOLs: { name: string; institution: string; tier: string; interactions: number; insights: number }[];
}

export interface MSLPerformanceAnalytics {
  totalMSLs: number;
  avgInteractionsPerMSL: number;
  avgInsightsPerMSL: number;
  avgCoverageRate: number;
  topPerformers: { name: string; territory: string; interactions: number; insights: number; coverage: number; rating: number }[];
  bottomPerformers: { name: string; territory: string; interactions: number; insights: number; coverage: number; rating: number }[];
  activityByType: { type: string; count: number; percentage: number }[];
  insightsByCategory: { category: string; count: number; actionRate: number }[];
  territoryComparison: { region: string; mslCount: number; avgInteractions: number; avgInsights: number; avgCoverage: number }[];
  monthlyTrends: { month: string; interactions: number; insights: number; coverage: number }[];
}

export interface PublicationAnalytics {
  totalPublications: number;
  publishedThisYear: number;
  inPipeline: number;
  avgTimeToPublication: number;
  acceptanceRate: number;
  publicationsByType: { type: string; count: number; avgIF: number }[];
  publicationsByJournal: { journal: string; count: number; impactFactor: number }[];
  publicationTrend: TrendDataPoint[];
  congressPresentations: { congress: string; abstracts: number; posters: number; orals: number }[];
}

export interface MedicalReviewAnalytics {
  totalReviews: number;
  approvedThisMonth: number;
  avgCycleTime: number;
  firstPassApprovalRate: number;
  onTimeRate: number;
  reviewsByType: { type: string; count: number; avgCycleTime: number; approvalRate: number }[];
  reviewerPerformance: { reviewer: string; role: string; completed: number; avgTurnaround: number; approvalRate: number }[];
  cycleTimeTrend: TrendDataPoint[];
  bottleneckAnalysis: { stage: string; avgDays: number; itemsStuck: number }[];
}

export interface CrossModuleInsights {
  safetyCorrelations: { signalId: string; signalName: string; fieldInsights: number; reviewItems: number; publicationImpact: boolean }[];
  clinicalDataIntegration: { studyId: string; studyName: string; publications: number; presentations: number; kolDiscussions: number }[];
  competitiveIntelligence: { competitor: string; fieldMentions: number; publicationComparisons: number; marketImpact: string }[];
  insightActionFunnel: { stage: string; count: number; conversionRate: number }[];
}

export interface TrendDataPoint {
  period: string;
  value: number;
  target?: number;
}

export interface AnalyticsDashboard {
  lastUpdated: string;
  timeFrame: TimeFrame;
  kpis: KPIMetric[];
  kolAnalytics: KOLAnalytics;
  mslPerformance: MSLPerformanceAnalytics;
  publicationAnalytics: PublicationAnalytics;
  reviewAnalytics: MedicalReviewAnalytics;
  crossModuleInsights: CrossModuleInsights;
}

// ============================================================================
// DEMO DATA
// ============================================================================

export const medAffairsKPIs: KPIMetric[] = [
  {
    id: 'kpi-001',
    name: 'KOL Engagement Rate',
    value: 78,
    unit: '%',
    target: 80,
    previousValue: 72,
    trend: 'up',
    trendPercentage: 8.3,
    benchmarkComparison: 'below',
    category: 'engagement',
  },
  {
    id: 'kpi-002',
    name: 'MSL Interactions (YTD)',
    value: 1847,
    unit: 'interactions',
    target: 2000,
    previousValue: 1502,
    trend: 'up',
    trendPercentage: 23,
    benchmarkComparison: 'at-target',
    category: 'productivity',
  },
  {
    id: 'kpi-003',
    name: 'Field Insights Captured',
    value: 168,
    unit: 'insights',
    target: 150,
    previousValue: 134,
    trend: 'up',
    trendPercentage: 25.4,
    benchmarkComparison: 'above',
    category: 'quality',
  },
  {
    id: 'kpi-004',
    name: 'Publication Pipeline',
    value: 34,
    unit: 'manuscripts',
    target: 30,
    previousValue: 28,
    trend: 'up',
    trendPercentage: 21.4,
    benchmarkComparison: 'above',
    category: 'impact',
  },
  {
    id: 'kpi-005',
    name: 'MLR Approval Rate',
    value: 87,
    unit: '%',
    target: 85,
    previousValue: 82,
    trend: 'up',
    trendPercentage: 6.1,
    benchmarkComparison: 'above',
    category: 'compliance',
  },
  {
    id: 'kpi-006',
    name: 'Avg Review Cycle Time',
    value: 8.5,
    unit: 'days',
    target: 10,
    previousValue: 11.2,
    trend: 'down',
    trendPercentage: -24.1,
    benchmarkComparison: 'above',
    category: 'productivity',
  },
  {
    id: 'kpi-007',
    name: 'Safety Signal Coverage',
    value: 94,
    unit: '%',
    target: 100,
    previousValue: 88,
    trend: 'up',
    trendPercentage: 6.8,
    benchmarkComparison: 'below',
    category: 'compliance',
  },
  {
    id: 'kpi-008',
    name: 'Insight-to-Action Rate',
    value: 72,
    unit: '%',
    target: 75,
    previousValue: 65,
    trend: 'up',
    trendPercentage: 10.8,
    benchmarkComparison: 'at-target',
    category: 'quality',
  },
];

export const kolAnalyticsData: KOLAnalytics = {
  totalKOLs: 247,
  tier1Count: 42,
  tier2Count: 87,
  tier3Count: 98,
  emergingCount: 20,
  engagementRate: 78,
  avgInteractionsPerKOL: 7.5,
  coverageRate: 86,
  newKOLsThisQuarter: 12,
  kolsByTherapeuticArea: [
    { area: 'Oncology', count: 112 },
    { area: 'Cardiology', count: 45 },
    { area: 'Pulmonology', count: 38 },
    { area: 'Hepatology', count: 28 },
    { area: 'Immunology', count: 24 },
  ],
  kolEngagementTrend: [
    { period: 'Jul', value: 68, target: 75 },
    { period: 'Aug', value: 71, target: 75 },
    { period: 'Sep', value: 73, target: 78 },
    { period: 'Oct', value: 75, target: 78 },
    { period: 'Nov', value: 76, target: 80 },
    { period: 'Dec', value: 78, target: 80 },
  ],
  topEngagedKOLs: [
    { name: 'Dr. Sarah Chen', institution: 'Memorial Sloan Kettering', tier: 'Tier 1', interactions: 24, insights: 8 },
    { name: 'Dr. James Liu', institution: 'MD Anderson', tier: 'Tier 1', interactions: 21, insights: 7 },
    { name: 'Dr. Maria Santos', institution: 'Cleveland Clinic', tier: 'Tier 1', interactions: 19, insights: 6 },
    { name: 'Dr. Robert Kim', institution: 'Mayo Clinic', tier: 'Tier 2', interactions: 18, insights: 5 },
    { name: 'Dr. Emily Watson', institution: 'Johns Hopkins', tier: 'Tier 1', interactions: 17, insights: 6 },
  ],
};

export const mslPerformanceData: MSLPerformanceAnalytics = {
  totalMSLs: 5,
  avgInteractionsPerMSL: 149,
  avgInsightsPerMSL: 33.6,
  avgCoverageRate: 86.2,
  topPerformers: [
    { name: 'Dr. Michael Torres', territory: 'Northeast', interactions: 187, insights: 43, coverage: 92, rating: 4.8 },
    { name: 'Dr. Lisa Park', territory: 'Southwest', interactions: 156, insights: 38, coverage: 88, rating: 4.5 },
    { name: 'Dr. Jennifer Walsh', territory: 'West', interactions: 142, insights: 31, coverage: 85, rating: 4.3 },
  ],
  bottomPerformers: [
    { name: 'Dr. David Chen', territory: 'Midwest', interactions: 128, insights: 27, coverage: 82, rating: 4.0 },
    { name: 'Dr. Amanda Roberts', territory: 'Southeast', interactions: 134, insights: 29, coverage: 84, rating: 4.1 },
  ],
  activityByType: [
    { type: 'Scientific Exchange', count: 312, percentage: 42 },
    { type: 'Congress Meeting', count: 156, percentage: 21 },
    { type: 'Site Visit', count: 112, percentage: 15 },
    { type: 'Data Presentation', count: 89, percentage: 12 },
    { type: 'Advisory Board', count: 45, percentage: 6 },
    { type: 'Other', count: 33, percentage: 4 },
  ],
  insightsByCategory: [
    { category: 'Clinical Practice', count: 45, actionRate: 78 },
    { category: 'Safety Observation', count: 38, actionRate: 92 },
    { category: 'Efficacy Feedback', count: 32, actionRate: 65 },
    { category: 'Competitive Intel', count: 28, actionRate: 71 },
    { category: 'Study Interest', count: 15, actionRate: 88 },
    { category: 'Unmet Need', count: 10, actionRate: 60 },
  ],
  territoryComparison: [
    { region: 'Northeast', mslCount: 1, avgInteractions: 187, avgInsights: 43, avgCoverage: 92 },
    { region: 'Southwest', mslCount: 1, avgInteractions: 156, avgInsights: 38, avgCoverage: 88 },
    { region: 'West', mslCount: 1, avgInteractions: 142, avgInsights: 31, avgCoverage: 85 },
    { region: 'Southeast', mslCount: 1, avgInteractions: 134, avgInsights: 29, avgCoverage: 84 },
    { region: 'Midwest', mslCount: 1, avgInteractions: 128, avgInsights: 27, avgCoverage: 82 },
  ],
  monthlyTrends: [
    { month: 'Jul', interactions: 98, insights: 22, coverage: 78 },
    { month: 'Aug', interactions: 112, insights: 25, coverage: 80 },
    { month: 'Sep', interactions: 125, insights: 28, coverage: 82 },
    { month: 'Oct', interactions: 134, insights: 31, coverage: 84 },
    { month: 'Nov', interactions: 142, insights: 34, coverage: 85 },
    { month: 'Dec', interactions: 136, insights: 28, coverage: 86 },
  ],
};

export const publicationAnalyticsData: PublicationAnalytics = {
  totalPublications: 34,
  publishedThisYear: 18,
  inPipeline: 16,
  avgTimeToPublication: 8.5,
  acceptanceRate: 76,
  publicationsByType: [
    { type: 'Primary Research', count: 8, avgIF: 12.4 },
    { type: 'Abstract', count: 12, avgIF: 0 },
    { type: 'Poster', count: 8, avgIF: 0 },
    { type: 'Review Article', count: 4, avgIF: 8.2 },
    { type: 'Case Report', count: 2, avgIF: 3.5 },
  ],
  publicationsByJournal: [
    { journal: 'Journal of Clinical Oncology', count: 4, impactFactor: 45.3 },
    { journal: 'NEJM', count: 2, impactFactor: 91.2 },
    { journal: 'Lancet Oncology', count: 3, impactFactor: 41.3 },
    { journal: 'Annals of Oncology', count: 3, impactFactor: 32.5 },
    { journal: 'Clinical Cancer Research', count: 6, impactFactor: 11.5 },
  ],
  publicationTrend: [
    { period: 'Q1', value: 4, target: 4 },
    { period: 'Q2', value: 5, target: 4 },
    { period: 'Q3', value: 4, target: 5 },
    { period: 'Q4', value: 5, target: 5 },
  ],
  congressPresentations: [
    { congress: 'ASCO 2025', abstracts: 6, posters: 4, orals: 2 },
    { congress: 'ESMO 2025', abstracts: 4, posters: 3, orals: 1 },
    { congress: 'AACR 2025', abstracts: 3, posters: 2, orals: 1 },
    { congress: 'ASH 2025', abstracts: 2, posters: 2, orals: 0 },
  ],
};

export const reviewAnalyticsData: MedicalReviewAnalytics = {
  totalReviews: 156,
  approvedThisMonth: 24,
  avgCycleTime: 8.5,
  firstPassApprovalRate: 62,
  onTimeRate: 87,
  reviewsByType: [
    { type: 'Sales Aid', count: 42, avgCycleTime: 7.2, approvalRate: 88 },
    { type: 'HCP Communication', count: 28, avgCycleTime: 5.5, approvalRate: 92 },
    { type: 'Congress Abstract', count: 24, avgCycleTime: 12.3, approvalRate: 78 },
    { type: 'Patient Education', count: 22, avgCycleTime: 9.1, approvalRate: 85 },
    { type: 'Social Media', count: 18, avgCycleTime: 6.8, approvalRate: 72 },
    { type: 'Press Release', count: 12, avgCycleTime: 4.2, approvalRate: 95 },
    { type: 'Training Material', count: 10, avgCycleTime: 6.5, approvalRate: 98 },
  ],
  reviewerPerformance: [
    { reviewer: 'Dr. Sarah Mitchell', role: 'Medical', completed: 48, avgTurnaround: 3.2, approvalRate: 85 },
    { reviewer: 'Robert Chen, JD', role: 'Legal', completed: 38, avgTurnaround: 2.8, approvalRate: 92 },
    { reviewer: 'Dr. Emily Watson', role: 'Regulatory', completed: 35, avgTurnaround: 4.1, approvalRate: 88 },
    { reviewer: 'Jennifer Walsh', role: 'Brand', completed: 28, avgTurnaround: 1.5, approvalRate: 95 },
  ],
  cycleTimeTrend: [
    { period: 'Jul', value: 11.2, target: 10 },
    { period: 'Aug', value: 10.5, target: 10 },
    { period: 'Sep', value: 9.8, target: 10 },
    { period: 'Oct', value: 9.2, target: 10 },
    { period: 'Nov', value: 8.8, target: 10 },
    { period: 'Dec', value: 8.5, target: 10 },
  ],
  bottleneckAnalysis: [
    { stage: 'Medical Review', avgDays: 3.2, itemsStuck: 2 },
    { stage: 'Legal Review', avgDays: 2.8, itemsStuck: 1 },
    { stage: 'Regulatory Review', avgDays: 4.1, itemsStuck: 1 },
    { stage: 'Revision Turnaround', avgDays: 3.5, itemsStuck: 3 },
    { stage: 'Final Approval', avgDays: 0.8, itemsStuck: 0 },
  ],
};

export const crossModuleInsightsData: CrossModuleInsights = {
  safetyCorrelations: [
    { signalId: 'SIG-2026-001', signalName: 'Hepatotoxicity in NSCLC', fieldInsights: 4, reviewItems: 2, publicationImpact: true },
    { signalId: 'SIG-2026-002', signalName: 'QTc Prolongation - Cardiac', fieldInsights: 3, reviewItems: 1, publicationImpact: false },
    { signalId: 'SIG-2026-003', signalName: 'Infusion Reactions', fieldInsights: 2, reviewItems: 0, publicationImpact: false },
  ],
  clinicalDataIntegration: [
    { studyId: 'NEXUS-1', studyName: 'Phase 3 NSCLC Efficacy', publications: 4, presentations: 6, kolDiscussions: 45 },
    { studyId: 'NEXUS-2', studyName: 'Biomarker Substudy', publications: 2, presentations: 3, kolDiscussions: 28 },
    { studyId: 'NEXUS-CARDIAC', studyName: 'Cardiac Safety Extension', publications: 1, presentations: 2, kolDiscussions: 18 },
  ],
  competitiveIntelligence: [
    { competitor: 'Bristol-Myers Squibb', fieldMentions: 34, publicationComparisons: 5, marketImpact: 'High' },
    { competitor: 'Merck', fieldMentions: 28, publicationComparisons: 4, marketImpact: 'Medium' },
    { competitor: 'Roche', fieldMentions: 22, publicationComparisons: 3, marketImpact: 'Medium' },
    { competitor: 'AstraZeneca', fieldMentions: 18, publicationComparisons: 2, marketImpact: 'Low' },
  ],
  insightActionFunnel: [
    { stage: 'Captured', count: 168, conversionRate: 100 },
    { stage: 'Reviewed', count: 152, conversionRate: 90 },
    { stage: 'Validated', count: 128, conversionRate: 84 },
    { stage: 'Action Planned', count: 98, conversionRate: 77 },
    { stage: 'Actioned', count: 72, conversionRate: 73 },
    { stage: 'Impact Measured', count: 45, conversionRate: 63 },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAnalyticsDashboard(timeFrame: TimeFrame = 'ytd'): AnalyticsDashboard {
  return {
    lastUpdated: new Date().toISOString(),
    timeFrame,
    kpis: medAffairsKPIs,
    kolAnalytics: kolAnalyticsData,
    mslPerformance: mslPerformanceData,
    publicationAnalytics: publicationAnalyticsData,
    reviewAnalytics: reviewAnalyticsData,
    crossModuleInsights: crossModuleInsightsData,
  };
}

export function getKPIsByCategory(category: KPIMetric['category']): KPIMetric[] {
  return medAffairsKPIs.filter(kpi => kpi.category === category);
}

export function getKPIsAboveTarget(): KPIMetric[] {
  return medAffairsKPIs.filter(kpi => kpi.benchmarkComparison === 'above');
}

export function getKPIsBelowTarget(): KPIMetric[] {
  return medAffairsKPIs.filter(kpi => kpi.benchmarkComparison === 'below');
}

export function getTerritoryRankings(): { region: string; score: number; rank: number }[] {
  const territories = mslPerformanceData.territoryComparison.map(t => ({
    region: t.region,
    score: (t.avgInteractions * 0.3) + (t.avgInsights * 0.4) + (t.avgCoverage * 0.3),
  }));
  
  territories.sort((a, b) => b.score - a.score);
  return territories.map((t, idx) => ({ ...t, rank: idx + 1 }));
}

export function getInsightCategoryTrends(): { category: string; trend: MetricTrend; change: number }[] {
  return mslPerformanceData.insightsByCategory.map(cat => ({
    category: cat.category,
    trend: cat.actionRate > 70 ? 'up' : cat.actionRate > 50 ? 'stable' : 'down',
    change: Math.round((cat.actionRate - 65) / 65 * 100),
  }));
}

export function getReviewBottlenecks(): { stage: string; severity: 'critical' | 'warning' | 'ok'; recommendation: string }[] {
  return reviewAnalyticsData.bottleneckAnalysis.map(b => ({
    stage: b.stage,
    severity: b.itemsStuck >= 3 ? 'critical' : b.itemsStuck >= 2 ? 'warning' : 'ok',
    recommendation: b.itemsStuck >= 2 
      ? `${b.itemsStuck} items stuck in ${b.stage}. Consider adding reviewer capacity.`
      : `${b.stage} operating within normal parameters.`,
  }));
}

export function getCrossModuleAlertCount(): { module: string; alerts: number; critical: number }[] {
  return [
    { module: 'Safety', alerts: crossModuleInsightsData.safetyCorrelations.length, critical: crossModuleInsightsData.safetyCorrelations.filter(s => s.fieldInsights >= 3).length },
    { module: 'Clinical', alerts: crossModuleInsightsData.clinicalDataIntegration.length, critical: 0 },
    { module: 'Competitive', alerts: crossModuleInsightsData.competitiveIntelligence.length, critical: crossModuleInsightsData.competitiveIntelligence.filter(c => c.marketImpact === 'High').length },
  ];
}

export function getPublicationImpactScore(): number {
  const totalIF = publicationAnalyticsData.publicationsByJournal.reduce(
    (sum, j) => sum + (j.count * j.impactFactor), 0
  );
  return Math.round(totalIF / publicationAnalyticsData.totalPublications * 10) / 10;
}

export function getMSLProductivityIndex(): { name: string; index: number; benchmark: number }[] {
  return mslPerformanceData.topPerformers.concat(mslPerformanceData.bottomPerformers).map(msl => ({
    name: msl.name,
    index: Math.round((msl.interactions * 0.4 + msl.insights * 0.4 + msl.coverage * 0.2) / 10),
    benchmark: 85,
  }));
}
