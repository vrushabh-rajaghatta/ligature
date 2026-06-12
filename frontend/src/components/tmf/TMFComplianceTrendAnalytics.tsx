

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Download,
  ChevronRight,
  ChevronDown,
  Activity,
  Zap,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import type { BadgeColor } from '@/components/ui/Badge';
import type { ProgressColor } from '@/components/ui/Progress';
import type {
  TMFStudy,
  TMFArtifact,
  TMFZone,
} from '@/domains/tmf/contracts';

// ============================================================================
// TMF COMPLIANCE TREND ANALYTICS - v171
// Historical completeness tracking, week-over-week metrics, projected completion
// ============================================================================

interface TMFComplianceTrendAnalyticsProps {
  study: TMFStudy;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
}

// Zone names
const ZONE_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central and Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};

// Critical zones
const CRITICAL_ZONES: TMFZone[] = ['zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-07', 'zone-10'];

// Expected artifacts per zone (DIA TMF Reference Model)
const EXPECTED_ARTIFACTS: Record<TMFZone, number> = {
  'zone-01': 8,
  'zone-02': 12,
  'zone-03': 10,
  'zone-04': 15,
  'zone-05': 25,
  'zone-06': 8,
  'zone-07': 12,
  'zone-08': 6,
  'zone-09': 5,
  'zone-10': 8,
};

// Historical trend data point
interface TrendDataPoint {
  date: string;
  overallCompleteness: number;
  criticalCompleteness: number;
  inspectionScore: number;
  qcPassRate: number;
  issuesCount: number;
  artifactsFiled: number;
}

// Zone trend data
interface ZoneTrendData {
  zone: TMFZone;
  name: string;
  isCritical: boolean;
  currentScore: number;
  previousScore: number;
  weekOverWeekChange: number;
  monthOverMonthChange: number;
  sparklineData: number[];
  projectedCompletion: string | null;
  velocity: number; // artifacts per week
  trending: 'up' | 'down' | 'stable';
}

// Milestone projection
interface MilestoneProjection {
  milestone: string;
  targetScore: number;
  currentScore: number;
  projectedDate: string | null;
  daysRemaining: number | null;
  isOnTrack: boolean;
  requiredVelocity: number;
}

// Generate simulated historical data for demo
function generateHistoricalData(study: TMFStudy, weeks: number = 12): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const today = new Date();
  
  // Start from current scores and work backwards with decreasing values
  const baseOverall = study.overallCompletenessScore;
  const baseCritical = study.criticalCompletenessScore;
  const baseInspection = study.inspectionReadinessScore;
  
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    
    // Simulate improving trend with some variance
    const progressFactor = (weeks - i) / weeks;
    const variance = (Math.random() - 0.5) * 5;
    
    data.push({
      date: date.toISOString().split('T')[0],
      overallCompleteness: Math.min(100, Math.max(0, Math.round((baseOverall * progressFactor * 0.7 + 30) + variance))),
      criticalCompleteness: Math.min(100, Math.max(0, Math.round((baseCritical * progressFactor * 0.7 + 25) + variance))),
      inspectionScore: Math.min(100, Math.max(0, Math.round((baseInspection * progressFactor * 0.7 + 20) + variance))),
      qcPassRate: Math.min(100, Math.max(0, Math.round(70 + progressFactor * 20 + variance))),
      issuesCount: Math.max(0, Math.round(15 - progressFactor * 12 + Math.random() * 3)),
      artifactsFiled: Math.round(Math.random() * 5 + progressFactor * 8),
    });
  }
  
  // Ensure current week shows actual values
  if (data.length > 0) {
    const last = data[data.length - 1];
    last.overallCompleteness = baseOverall;
    last.criticalCompleteness = baseCritical;
    last.inspectionScore = baseInspection;
  }
  
  return data;
}

// Calculate zone trends
function calculateZoneTrends(
  artifactsByZone: Record<TMFZone, string[]>,
  artifactsRecord: Record<string, TMFArtifact>
): ZoneTrendData[] {
  const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];
  
  return zones.map(zone => {
    const ids = artifactsByZone[zone] || [];
    const artifacts = ids.map(id => artifactsRecord[id]).filter(Boolean);
    const expected = EXPECTED_ARTIFACTS[zone];
    const filed = artifacts.filter(a => a.status === 'filed').length;
    const currentScore = expected > 0 ? Math.round((filed / expected) * 100) : 0;
    
    // Simulated historical scores for sparkline (last 8 weeks)
    const sparklineData: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const progressFactor = (8 - i) / 8;
      sparklineData.push(Math.min(100, Math.round(currentScore * progressFactor * 0.8 + 20 + (Math.random() - 0.5) * 10)));
    }
    sparklineData[sparklineData.length - 1] = currentScore; // Current value
    
    const previousScore = sparklineData[sparklineData.length - 2] || 0;
    const twoWeeksAgo = sparklineData[sparklineData.length - 3] || 0;
    const fourWeeksAgo = sparklineData[sparklineData.length - 5] || 0;
    
    const weekOverWeekChange = currentScore - previousScore;
    const monthOverMonthChange = currentScore - fourWeeksAgo;
    
    // Calculate velocity (artifacts per week based on trend)
    const velocity = Math.max(0, weekOverWeekChange * expected / 100);
    
    // Project completion date
    let projectedCompletion: string | null = null;
    if (currentScore < 100 && velocity > 0) {
      const remaining = expected - filed;
      const weeksToComplete = Math.ceil(remaining / velocity);
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + (weeksToComplete * 7));
      projectedCompletion = completionDate.toISOString().split('T')[0];
    } else if (currentScore >= 100) {
      projectedCompletion = 'Complete';
    }
    
    return {
      zone,
      name: ZONE_NAMES[zone],
      isCritical: CRITICAL_ZONES.includes(zone),
      currentScore,
      previousScore,
      weekOverWeekChange,
      monthOverMonthChange,
      sparklineData,
      projectedCompletion,
      velocity: Math.round(velocity * 10) / 10,
      trending: weekOverWeekChange > 2 ? 'up' : weekOverWeekChange < -2 ? 'down' : 'stable',
    };
  });
}

// Get color based on trend
const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return 'text-emerald-400';
    case 'down': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

const getTrendBadgeColor = (trend: 'up' | 'down' | 'stable'): BadgeColor => {
  switch (trend) {
    case 'up': return 'emerald';
    case 'down': return 'red';
    default: return 'slate';
  }
};

const getScoreColor = (score: number): BadgeColor => {
  if (score >= 95) return 'emerald';
  if (score >= 85) return 'green';
  if (score >= 70) return 'amber';
  if (score >= 50) return 'orange';
  return 'red';
};

const getProgressColor = (score: number): ProgressColor => {
  if (score >= 95) return 'emerald';
  if (score >= 85) return 'green';
  if (score >= 70) return 'amber';
  if (score >= 50) return 'orange';
  return 'red';
};

export function TMFComplianceTrendAnalytics({
  study,
  artifactsByZone,
  artifactsRecord,
}: TMFComplianceTrendAnalyticsProps) {
  const [activeView, setActiveView] = useState<'overview' | 'zones' | 'milestones' | 'velocity'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'4w' | '8w' | '12w'>('8w');
  const [expandedZones, setExpandedZones] = useState<Set<TMFZone>>(new Set());

  // Generate historical data
  const historicalData = useMemo(() => {
    const weeks = selectedTimeRange === '4w' ? 4 : selectedTimeRange === '8w' ? 8 : 12;
    return generateHistoricalData(study, weeks);
  }, [study, selectedTimeRange]);

  // Calculate zone trends
  const zoneTrends = useMemo(() => {
    return calculateZoneTrends(artifactsByZone, artifactsRecord);
  }, [artifactsByZone, artifactsRecord]);

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const current = historicalData[historicalData.length - 1];
    const oneWeekAgo = historicalData[historicalData.length - 2];
    const fourWeeksAgo = historicalData[historicalData.length - 5] || historicalData[0];
    
    const weekOverWeek = {
      overall: (current?.overallCompleteness ?? 0) - (oneWeekAgo?.overallCompleteness ?? 0),
      critical: (current?.criticalCompleteness ?? 0) - (oneWeekAgo?.criticalCompleteness ?? 0),
      inspection: (current?.inspectionScore ?? 0) - (oneWeekAgo?.inspectionScore ?? 0),
      qc: (current?.qcPassRate ?? 0) - (oneWeekAgo?.qcPassRate ?? 0),
      issues: (oneWeekAgo?.issuesCount ?? 0) - (current?.issuesCount ?? 0), // Inverted - fewer is better
    };
    
    const monthOverMonth = {
      overall: (current?.overallCompleteness ?? 0) - (fourWeeksAgo?.overallCompleteness ?? 0),
      critical: (current?.criticalCompleteness ?? 0) - (fourWeeksAgo?.criticalCompleteness ?? 0),
      inspection: (current?.inspectionScore ?? 0) - (fourWeeksAgo?.inspectionScore ?? 0),
      qc: (current?.qcPassRate ?? 0) - (fourWeeksAgo?.qcPassRate ?? 0),
    };

    // Calculate average velocity (artifacts per week)
    const totalFiledChange = historicalData.reduce((sum, d, i) => {
      if (i === 0) return 0;
      return sum + d.artifactsFiled;
    }, 0);
    const avgVelocity = Math.round((totalFiledChange / (historicalData.length - 1)) * 10) / 10;

    // Projected days to 95% completion
    const targetScore = 95;
    const currentScore = current?.overallCompleteness ?? 0;
    const weeklyImprovement = weekOverWeek.overall > 0 ? weekOverWeek.overall : 2; // Default 2% if no progress
    const weeksToTarget = Math.ceil((targetScore - currentScore) / weeklyImprovement);
    const daysToTarget = currentScore >= targetScore ? 0 : weeksToTarget * 7;

    return {
      current,
      weekOverWeek,
      monthOverMonth,
      avgVelocity,
      daysToTarget,
      weeksToTarget,
    };
  }, [historicalData]);

  // Milestone projections
  const milestoneProjections = useMemo((): MilestoneProjection[] => {
    const current = aggregateMetrics.current?.overallCompleteness ?? 0;
    const weeklyVelocity = aggregateMetrics.weekOverWeek.overall > 0 ? aggregateMetrics.weekOverWeek.overall : 2;
    
    const milestones = [
      { milestone: 'Audit Ready (70%)', targetScore: 70 },
      { milestone: 'Inspection Threshold (85%)', targetScore: 85 },
      { milestone: 'Full Compliance (95%)', targetScore: 95 },
      { milestone: 'Complete (100%)', targetScore: 100 },
    ];

    return milestones.map(m => {
      const gap = m.targetScore - current;
      const weeksNeeded = gap > 0 ? Math.ceil(gap / weeklyVelocity) : 0;
      const daysNeeded = weeksNeeded * 7;
      
      let projectedDate: string | null = null;
      if (gap > 0) {
        const date = new Date();
        date.setDate(date.getDate() + daysNeeded);
        projectedDate = date.toISOString().split('T')[0];
      } else {
        projectedDate = 'Achieved';
      }

      return {
        milestone: m.milestone,
        targetScore: m.targetScore,
        currentScore: current,
        projectedDate,
        daysRemaining: gap > 0 ? daysNeeded : null,
        isOnTrack: gap <= 0 || weeklyVelocity >= 2,
        requiredVelocity: gap > 0 ? Math.round((gap / 4) * 10) / 10 : 0, // 4 week target
      };
    });
  }, [aggregateMetrics]);

  const toggleZoneExpanded = (zone: TMFZone) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'overview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            <Activity className="w-4 h-4 mr-1" /> Overview
          </Button>
          <Button
            variant={activeView === 'zones' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('zones')}
          >
            <BarChart3 className="w-4 h-4 mr-1" /> Zones
          </Button>
          <Button
            variant={activeView === 'milestones' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('milestones')}
          >
            <Target className="w-4 h-4 mr-1" /> Milestones
          </Button>
          <Button
            variant={activeView === 'velocity' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('velocity')}
          >
            <Zap className="w-4 h-4 mr-1" /> Velocity
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface rounded-lg p-1">
            {(['4w', '8w', '12w'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {range === '4w' ? '4 Weeks' : range === '8w' ? '8 Weeks' : '12 Weeks'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics with Trends */}
          <div className="grid grid-cols-4 gap-4">
            <TrendMetricCard
              label="Overall Completeness"
              value={aggregateMetrics.current?.overallCompleteness ?? 0}
              unit="%"
              weekChange={aggregateMetrics.weekOverWeek.overall}
              monthChange={aggregateMetrics.monthOverMonth.overall}
              sparkline={historicalData.map(d => d.overallCompleteness)}
            />
            <TrendMetricCard
              label="Critical Zone Completeness"
              value={aggregateMetrics.current?.criticalCompleteness ?? 0}
              unit="%"
              weekChange={aggregateMetrics.weekOverWeek.critical}
              monthChange={aggregateMetrics.monthOverMonth.critical}
              sparkline={historicalData.map(d => d.criticalCompleteness)}
            />
            <TrendMetricCard
              label="Inspection Readiness"
              value={aggregateMetrics.current?.inspectionScore ?? 0}
              unit="%"
              weekChange={aggregateMetrics.weekOverWeek.inspection}
              monthChange={aggregateMetrics.monthOverMonth.inspection}
              sparkline={historicalData.map(d => d.inspectionScore)}
              highlight
            />
            <TrendMetricCard
              label="QC Pass Rate"
              value={aggregateMetrics.current?.qcPassRate ?? 0}
              unit="%"
              weekChange={aggregateMetrics.weekOverWeek.qc}
              monthChange={aggregateMetrics.monthOverMonth.qc}
              sparkline={historicalData.map(d => d.qcPassRate)}
            />
          </div>

          {/* Projection Summary */}
          <Card className="border-cyan-500/30 bg-cyan-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Projected Full Compliance</h3>
                    <p className="text-sm text-text-muted">Based on current {aggregateMetrics.avgVelocity} artifacts/week velocity</p>
                  </div>
                </div>
                <div className="text-right">
                  {aggregateMetrics.daysToTarget === 0 ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="text-2xl font-bold text-emerald-400">Achieved</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-text-primary">{aggregateMetrics.daysToTarget} days</div>
                      <div className="text-sm text-text-muted">~{aggregateMetrics.weeksToTarget} weeks to 95%</div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium text-text-primary">Compliance Trend Over Time</h3>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-48 flex items-end justify-between gap-1">
                {historicalData.map((point, index) => {
                  const height = point.overallCompleteness;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t"
                        style={{ height: `${height * 1.8}px` }}
                        title={`${point.date}: ${point.overallCompleteness}%`}
                      />
                      {index % 2 === 0 && (
                        <span className="text-[10px] text-text-muted">
                          {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Week-over-Week Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {aggregateMetrics.weekOverWeek.issues > 0 ? (
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-text-primary">Issues Resolved</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">{Math.abs(aggregateMetrics.weekOverWeek.issues)}</div>
                <div className="text-xs text-text-muted">vs. last week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-text-primary">Filing Velocity</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">{aggregateMetrics.avgVelocity}</div>
                <div className="text-xs text-text-muted">artifacts/week avg</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-text-primary">Top Improving Zone</span>
                </div>
                <div className="text-lg font-bold text-text-primary">
                  {zoneTrends.sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange)[0]?.name || 'N/A'}
                </div>
                <div className="text-xs text-emerald-400">
                  +{Math.max(0, zoneTrends.sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange)[0]?.weekOverWeekChange || 0)}% this week
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Zones View */}
      {activeView === 'zones' && (
        <div className="space-y-3">
          {zoneTrends.map(zone => (
            <ZoneTrendCard
              key={zone.zone}
              data={zone}
              isExpanded={expandedZones.has(zone.zone)}
              onToggle={() => toggleZoneExpanded(zone.zone)}
            />
          ))}
        </div>
      )}

      {/* Milestones View */}
      {activeView === 'milestones' && (
        <div className="space-y-4">
          {milestoneProjections.map((milestone, index) => (
            <MilestoneCard key={index} milestone={milestone} />
          ))}
        </div>
      )}

      {/* Velocity View */}
      {activeView === 'velocity' && (
        <div className="space-y-6">
          {/* Velocity Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Current Velocity</div>
                <div className="text-3xl font-bold text-emerald-400">{aggregateMetrics.avgVelocity}</div>
                <div className="text-sm text-text-muted">artifacts/week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Required for 95% in 4 weeks</div>
                <div className="text-3xl font-bold text-text-primary">
                  {milestoneProjections.find(m => m.targetScore === 95)?.requiredVelocity || 0}
                </div>
                <div className="text-sm text-text-muted">artifacts/week needed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Velocity Trend</div>
                <div className="flex items-center gap-2">
                  {aggregateMetrics.weekOverWeek.overall > 0 ? (
                    <>
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                      <span className="text-xl font-bold text-emerald-400">Accelerating</span>
                    </>
                  ) : aggregateMetrics.weekOverWeek.overall < 0 ? (
                    <>
                      <TrendingDown className="w-6 h-6 text-red-400" />
                      <span className="text-xl font-bold text-red-400">Slowing</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-6 h-6 text-slate-400" />
                      <span className="text-xl font-bold text-slate-400">Stable</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zone Velocity Ranking */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium text-text-primary">Zone Velocity Ranking</h3>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {zoneTrends
                  .sort((a, b) => b.velocity - a.velocity)
                  .map((zone, index) => (
                    <div key={zone.zone} className="flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-bold text-text-muted">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary">{zone.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getTrendColor(zone.trending)}`}>
                              {zone.velocity} art/wk
                            </span>
                            {zone.trending === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                            {zone.trending === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                            {zone.trending === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <ProgressBar
                          value={zone.currentScore}
                          color={getProgressColor(zone.currentScore)}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TrendMetricCard({
  label,
  value,
  unit,
  weekChange,
  monthChange,
  sparkline,
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  weekChange: number;
  monthChange: number;
  sparkline: number[];
  highlight?: boolean;
}) {
  const isPositive = weekChange > 0;
  const isNegative = weekChange < 0;

  return (
    <Card className={highlight ? 'border-cyan-500/30 bg-cyan-500/5' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-text-muted">{label}</span>
          <Sparkline data={sparkline} />
        </div>
        <div className="text-2xl font-bold text-text-primary">
          {value}{unit}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
            {isPositive && <ArrowUpRight className="w-3 h-3" />}
            {isNegative && <ArrowDownRight className="w-3 h-3" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
            <span>{weekChange > 0 ? '+' : ''}{weekChange}% WoW</span>
          </div>
          <span className="text-text-muted">|</span>
          <span className={monthChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {monthChange > 0 ? '+' : ''}{monthChange}% MoM
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const lastValue = data[data.length - 1];
  const firstValue = data[0];
  const trending = lastValue > firstValue ? 'emerald' : lastValue < firstValue ? 'red' : 'slate';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={`var(--color-${trending}-400, currentColor)`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-${trending}-400`}
      />
    </svg>
  );
}

function ZoneTrendCard({
  data,
  isExpanded,
  onToggle,
}: {
  data: ZoneTrendData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={data.isCritical ? 'border-cyan-500/30' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-1 hover:bg-surface-card rounded">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text-primary">{data.name}</span>
              {data.isCritical && <Badge color="cyan" size="xs">Critical</Badge>}
              <Badge color={getTrendBadgeColor(data.trending)} size="xs">
                {data.trending === 'up' ? '↑ Improving' : data.trending === 'down' ? '↓ Declining' : '→ Stable'}
              </Badge>
            </div>
            <ProgressBar value={data.currentScore} color={getProgressColor(data.currentScore)} size="sm" />
          </div>

          <div className="flex items-center gap-4">
            <Sparkline data={data.sparklineData} />
            <div className="text-right">
              <div className="text-lg font-bold text-text-primary">{data.currentScore}%</div>
              <div className={`text-xs ${data.weekOverWeekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.weekOverWeekChange > 0 ? '+' : ''}{data.weekOverWeekChange}% WoW
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-text-muted mb-1">Velocity</div>
              <div className="font-medium text-text-primary">{data.velocity} art/wk</div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Month Change</div>
              <div className={`font-medium ${data.monthOverMonthChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.monthOverMonthChange > 0 ? '+' : ''}{data.monthOverMonthChange}%
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Last Week</div>
              <div className="font-medium text-text-primary">{data.previousScore}%</div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Projected Complete</div>
              <div className="font-medium text-text-primary">{data.projectedCompletion || 'N/A'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneCard({ milestone }: { milestone: MilestoneProjection }) {
  const isAchieved = milestone.projectedDate === 'Achieved';
  const progressPercent = Math.min(100, (milestone.currentScore / milestone.targetScore) * 100);

  return (
    <Card className={isAchieved ? 'border-emerald-500/30 bg-emerald-500/5' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isAchieved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : milestone.isOnTrack ? (
              <Clock className="w-5 h-5 text-cyan-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h4 className="font-medium text-text-primary">{milestone.milestone}</h4>
              <p className="text-xs text-text-muted">Target: {milestone.targetScore}%</p>
            </div>
          </div>
          <div className="text-right">
            {isAchieved ? (
              <Badge color="emerald">Achieved</Badge>
            ) : (
              <>
                <div className="text-lg font-bold text-text-primary">{milestone.daysRemaining} days</div>
                <div className="text-xs text-text-muted">Est. {milestone.projectedDate}</div>
              </>
            )}
          </div>
        </div>
        <ProgressBar
          value={progressPercent}
          color={isAchieved ? 'emerald' : milestone.isOnTrack ? 'cyan' : 'amber'}
          size="md"
        />
        {!isAchieved && (
          <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
            <span>Current: {milestone.currentScore}%</span>
            <span>Required velocity: {milestone.requiredVelocity}%/week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TMFComplianceTrendAnalytics;
