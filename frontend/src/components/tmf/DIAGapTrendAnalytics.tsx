

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BarChart3,
  Activity,
  Shield,
  Zap,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Filter,
  Eye,
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
  StudyMilestone,
} from '@/domains/tmf/contracts';

// ============================================================================
// DIA GAP TREND ANALYTICS - v0.15.29
// DIA Reference Model gap trending, persistence analysis, remediation velocity
// ============================================================================

interface DIAGapTrendAnalyticsProps {
  study: TMFStudy;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
  onViewArtifact?: (artifact: TMFArtifact) => void;
  onSelectZone?: (zone: TMFZone) => void;
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

// Critical zones per DIA Reference Model
const CRITICAL_ZONES: TMFZone[] = ['zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-07', 'zone-10'];

// DIA Reference Model expected artifacts per zone
const DIA_REFERENCE_MODEL: Record<TMFZone, { id: string; name: string; isCritical: boolean; milestone: StudyMilestone }[]> = {
  'zone-01': [
    { id: '01.01', name: 'TMF Plan', isCritical: true, milestone: 'study-start-up' },
    { id: '01.02', name: 'TMF Index', isCritical: true, milestone: 'study-start-up' },
    { id: '01.03', name: 'Signature Manifestation Log', isCritical: true, milestone: 'study-start-up' },
    { id: '01.04', name: 'TMF Quality Control Records', isCritical: false, milestone: 'any' },
  ],
  'zone-02': [
    { id: '02.01', name: 'Protocol', isCritical: true, milestone: 'study-start-up' },
    { id: '02.02', name: 'Protocol Amendments', isCritical: true, milestone: 'any' },
    { id: '02.03', name: 'Investigator Brochure', isCritical: true, milestone: 'study-start-up' },
    { id: '02.04', name: 'Sample CRF', isCritical: true, milestone: 'study-start-up' },
    { id: '02.05', name: 'Subject Information Sheet', isCritical: true, milestone: 'first-site-initiated' },
    { id: '02.06', name: 'Informed Consent Form', isCritical: true, milestone: 'first-site-initiated' },
  ],
  'zone-03': [
    { id: '03.01', name: 'IND/CTA Application', isCritical: true, milestone: 'study-start-up' },
    { id: '03.02', name: 'Regulatory Approval', isCritical: true, milestone: 'study-start-up' },
    { id: '03.03', name: 'Regulatory Correspondence', isCritical: false, milestone: 'any' },
    { id: '03.04', name: 'Annual Reports', isCritical: true, milestone: 'any' },
  ],
  'zone-04': [
    { id: '04.01', name: 'IRB/IEC Submission', isCritical: true, milestone: 'study-start-up' },
    { id: '04.02', name: 'IRB/IEC Initial Approval', isCritical: true, milestone: 'first-site-initiated' },
    { id: '04.03', name: 'IRB/IEC Amendment Approvals', isCritical: true, milestone: 'any' },
    { id: '04.04', name: 'IRB/IEC Continuing Review', isCritical: true, milestone: 'any' },
    { id: '04.05', name: 'IRB/IEC Membership List', isCritical: false, milestone: 'first-site-initiated' },
  ],
  'zone-05': [
    { id: '05.01', name: 'Site Selection Documentation', isCritical: true, milestone: 'study-start-up' },
    { id: '05.02', name: 'Pre-Study Site Visit Report', isCritical: false, milestone: 'study-start-up' },
    { id: '05.03', name: 'Site Initiation Visit Report', isCritical: true, milestone: 'first-site-initiated' },
    { id: '05.04', name: 'Monitoring Visit Reports', isCritical: true, milestone: 'first-subject-enrolled' },
    { id: '05.05', name: 'Site Close-out Visit Report', isCritical: true, milestone: 'study-close-out' },
    { id: '05.06', name: 'Investigator CV', isCritical: true, milestone: 'first-site-initiated' },
    { id: '05.07', name: 'Form FDA 1572', isCritical: true, milestone: 'first-site-initiated' },
    { id: '05.08', name: 'Financial Disclosure', isCritical: true, milestone: 'first-site-initiated' },
  ],
  'zone-06': [
    { id: '06.01', name: 'IP Shipment Records', isCritical: true, milestone: 'first-site-initiated' },
    { id: '06.02', name: 'IP Accountability Logs', isCritical: true, milestone: 'first-subject-enrolled' },
    { id: '06.03', name: 'IP Return Records', isCritical: false, milestone: 'study-close-out' },
    { id: '06.04', name: 'IP Destruction Records', isCritical: false, milestone: 'study-close-out' },
  ],
  'zone-07': [
    { id: '07.01', name: 'Safety Management Plan', isCritical: true, milestone: 'study-start-up' },
    { id: '07.02', name: 'SAE Reports', isCritical: true, milestone: 'first-subject-enrolled' },
    { id: '07.03', name: 'SUSAR Notifications', isCritical: true, milestone: 'any' },
    { id: '07.04', name: 'DSUR/PBRER', isCritical: true, milestone: 'any' },
    { id: '07.05', name: 'Safety Database Reports', isCritical: false, milestone: 'any' },
  ],
  'zone-08': [
    { id: '08.01', name: 'Lab Certifications', isCritical: true, milestone: 'first-site-initiated' },
    { id: '08.02', name: 'Lab Normal Ranges', isCritical: true, milestone: 'first-site-initiated' },
    { id: '08.03', name: 'Sample Handling Procedures', isCritical: false, milestone: 'study-start-up' },
  ],
  'zone-09': [
    { id: '09.01', name: 'Vendor Agreements', isCritical: true, milestone: 'study-start-up' },
    { id: '09.02', name: 'Vendor Qualifications', isCritical: true, milestone: 'study-start-up' },
    { id: '09.03', name: 'Vendor Audit Reports', isCritical: false, milestone: 'any' },
  ],
  'zone-10': [
    { id: '10.01', name: 'Data Management Plan', isCritical: true, milestone: 'study-start-up' },
    { id: '10.02', name: 'CRF Completion Guidelines', isCritical: true, milestone: 'study-start-up' },
    { id: '10.03', name: 'Database Validation', isCritical: true, milestone: 'first-subject-enrolled' },
    { id: '10.04', name: 'Database Lock Documentation', isCritical: true, milestone: 'database-lock' },
  ],
};

// Milestone display names
const MILESTONE_NAMES: Record<StudyMilestone, string> = {
  'study-start-up': 'Study Start-up',
  'first-site-initiated': 'First Site Initiated',
  'first-subject-enrolled': 'First Subject Enrolled',
  'enrollment-complete': 'Enrollment Complete',
  'last-subject-last-visit': 'Last Subject Last Visit',
  'database-lock': 'Database Lock',
  'study-close-out': 'Study Close-out',
  'any': 'Ongoing',
};

// Gap trend data point
interface GapTrendPoint {
  date: string;
  weekLabel: string;
  totalGaps: number;
  criticalGaps: number;
  majorGaps: number;
  minorGaps: number;
  closedGaps: number;
  newGaps: number;
  netChange: number;
}

// Zone gap trend
interface ZoneGapTrend {
  zone: TMFZone;
  zoneName: string;
  isCritical: boolean;
  currentGaps: number;
  previousGaps: number;
  weekOverWeekChange: number;
  closureVelocity: number; // gaps closed per week
  trendDirection: 'improving' | 'stable' | 'worsening';
  sparklineData: number[];
  persistentGaps: PersistentGap[];
  riskScore: number; // 0-100
}

// Persistent gap (long-standing missing artifact)
interface PersistentGap {
  artifactId: string;
  artifactName: string;
  isCritical: boolean;
  zone: TMFZone;
  zoneName: string;
  milestone: StudyMilestone;
  milestoneName: string;
  weeksMissing: number;
  auditRisk: 'high' | 'medium' | 'low';
  remediationPriority: number;
}

// Generate simulated gap trend history
function generateGapTrendHistory(
  study: TMFStudy,
  artifactsByZone: Record<TMFZone, string[]>,
  artifactsRecord: Record<string, TMFArtifact>,
  weeks: number = 12
): GapTrendPoint[] {
  const data: GapTrendPoint[] = [];
  const today = new Date();
  
  // Calculate current gaps
  let currentTotalGaps = 0;
  let currentCriticalGaps = 0;
  
  Object.entries(DIA_REFERENCE_MODEL).forEach(([zone, expectedArtifacts]) => {
    const zoneArtifacts = artifactsByZone[zone as TMFZone] || [];
    const filedArtifacts = zoneArtifacts
      .map(id => artifactsRecord[id])
      .filter(a => a && a.status === 'filed');
    
    expectedArtifacts.forEach(expected => {
      const found = filedArtifacts.some(a => 
        a.title.toLowerCase().includes(expected.name.toLowerCase().split(' ')[0])
      );
      if (!found) {
        currentTotalGaps++;
        if (expected.isCritical) currentCriticalGaps++;
      }
    });
  });
  
  // Generate historical data working backwards
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    
    // Simulate gap reduction over time with some variance
    const progressFactor = (weeks - i) / weeks;
    const variance = Math.floor((Math.random() - 0.5) * 3);
    
    // More gaps in the past, fewer now
    const historicalMultiplier = 1 + (1 - progressFactor) * 0.8;
    const totalGaps = Math.max(currentTotalGaps, Math.round(currentTotalGaps * historicalMultiplier + variance));
    const criticalGaps = Math.max(currentCriticalGaps, Math.round(currentCriticalGaps * historicalMultiplier + Math.floor(variance / 2)));
    const majorGaps = Math.max(0, Math.round((totalGaps - criticalGaps) * 0.6));
    const minorGaps = Math.max(0, totalGaps - criticalGaps - majorGaps);
    
    // Calculate changes
    const previousTotal = data.length > 0 ? data[data.length - 1].totalGaps : totalGaps + 3;
    const closedGaps = Math.max(0, previousTotal - totalGaps + Math.floor(Math.random() * 2));
    const newGaps = Math.max(0, totalGaps - previousTotal + closedGaps);
    
    data.push({
      date: date.toISOString().split('T')[0],
      weekLabel: `W${weeks - i}`,
      totalGaps,
      criticalGaps,
      majorGaps,
      minorGaps,
      closedGaps,
      newGaps,
      netChange: previousTotal - totalGaps,
    });
  }
  
  // Ensure current week matches actual values
  if (data.length > 0) {
    const last = data[data.length - 1];
    last.totalGaps = currentTotalGaps;
    last.criticalGaps = currentCriticalGaps;
    last.majorGaps = Math.round((currentTotalGaps - currentCriticalGaps) * 0.6);
    last.minorGaps = currentTotalGaps - currentCriticalGaps - last.majorGaps;
  }
  
  return data;
}

// Calculate zone-level gap trends
function calculateZoneGapTrends(
  artifactsByZone: Record<TMFZone, string[]>,
  artifactsRecord: Record<string, TMFArtifact>
): ZoneGapTrend[] {
  const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];
  
  return zones.map(zone => {
    const expectedArtifacts = DIA_REFERENCE_MODEL[zone];
    const zoneArtifacts = artifactsByZone[zone] || [];
    const filedArtifacts = zoneArtifacts
      .map(id => artifactsRecord[id])
      .filter(a => a && a.status === 'filed');
    
    // Find current gaps
    const gaps: PersistentGap[] = [];
    expectedArtifacts.forEach(expected => {
      const found = filedArtifacts.some(a => 
        a.title.toLowerCase().includes(expected.name.toLowerCase().split(' ')[0])
      );
      if (!found) {
        const weeksMissing = Math.floor(Math.random() * 8) + 1; // Simulated
        gaps.push({
          artifactId: expected.id,
          artifactName: expected.name,
          isCritical: expected.isCritical,
          zone,
          zoneName: ZONE_NAMES[zone],
          milestone: expected.milestone,
          milestoneName: MILESTONE_NAMES[expected.milestone],
          weeksMissing,
          auditRisk: weeksMissing > 6 ? 'high' : weeksMissing > 3 ? 'medium' : 'low',
          remediationPriority: expected.isCritical ? (10 - weeksMissing * 0.5) : (7 - weeksMissing * 0.3),
        });
      }
    });
    
    const currentGaps = gaps.length;
    
    // Simulate historical sparkline (last 8 weeks)
    const sparklineData: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const historicalMultiplier = 1 + (i / 8) * 0.5;
      sparklineData.push(Math.round(currentGaps * historicalMultiplier + (Math.random() - 0.5) * 2));
    }
    sparklineData[sparklineData.length - 1] = currentGaps;
    
    const previousGaps = sparklineData[sparklineData.length - 2];
    const weekOverWeekChange = currentGaps - previousGaps;
    const closureVelocity = Math.max(0, (sparklineData[0] - currentGaps) / 8);
    
    // Calculate risk score based on gap count, criticality, and persistence
    const criticalGapCount = gaps.filter(g => g.isCritical).length;
    const highRiskCount = gaps.filter(g => g.auditRisk === 'high').length;
    const riskScore = Math.min(100, 
      criticalGapCount * 15 + 
      (currentGaps - criticalGapCount) * 5 + 
      highRiskCount * 10
    );
    
    return {
      zone,
      zoneName: ZONE_NAMES[zone],
      isCritical: CRITICAL_ZONES.includes(zone),
      currentGaps,
      previousGaps,
      weekOverWeekChange,
      closureVelocity: Math.round(closureVelocity * 10) / 10,
      trendDirection: weekOverWeekChange < 0 ? 'improving' : weekOverWeekChange > 0 ? 'worsening' : 'stable',
      sparklineData,
      persistentGaps: gaps.sort((a, b) => b.weeksMissing - a.weeksMissing),
      riskScore,
    };
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DIAGapTrendAnalytics({
  study,
  artifactsByZone,
  artifactsRecord,
  onViewArtifact,
  onSelectZone,
}: DIAGapTrendAnalyticsProps) {
  const [activeView, setActiveView] = useState<'overview' | 'zones' | 'persistent'>('overview');
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<'4w' | '8w' | '12w'>('12w');
  
  const weeks = timeRange === '4w' ? 4 : timeRange === '8w' ? 8 : 12;
  
  const trendHistory = useMemo(
    () => generateGapTrendHistory(study, artifactsByZone, artifactsRecord, weeks),
    [study, artifactsByZone, artifactsRecord, weeks]
  );
  
  const zoneTrends = useMemo(
    () => calculateZoneGapTrends(artifactsByZone, artifactsRecord),
    [artifactsByZone, artifactsRecord]
  );
  
  // Aggregate metrics
  const currentTotal = trendHistory[trendHistory.length - 1]?.totalGaps || 0;
  const startTotal = trendHistory[0]?.totalGaps || 0;
  const totalReduction = startTotal - currentTotal;
  const reductionPercent = startTotal > 0 ? Math.round((totalReduction / startTotal) * 100) : 0;
  
  const currentCritical = trendHistory[trendHistory.length - 1]?.criticalGaps || 0;
  const avgClosureRate = trendHistory.reduce((sum, p) => sum + p.closedGaps, 0) / trendHistory.length;
  
  const persistentGaps = zoneTrends.flatMap(z => z.persistentGaps).filter(g => g.weeksMissing >= 4);
  const highRiskGaps = persistentGaps.filter(g => g.auditRisk === 'high');
  
  const overallRiskScore = zoneTrends.reduce((sum, z) => sum + z.riskScore, 0) / zoneTrends.length;
  
  const toggleZone = (zone: string) => {
    const newSet = new Set(expandedZones);
    if (newSet.has(zone)) {
      newSet.delete(zone);
    } else {
      newSet.add(zone);
    }
    setExpandedZones(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            DIA Reference Model Gap Trending
          </h3>
          <p className="text-sm text-text-muted mt-1">
            Track gap closure progress against DIA TMF Reference Model v3.2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['4w', '8w', '12w'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      {/* View Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {[
          { id: 'overview' as const, label: 'Gap Trend Overview', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'zones' as const, label: 'Zone Analysis', icon: <FileText className="w-4 h-4" /> },
          { id: 'persistent' as const, label: 'Persistent Gaps', icon: <AlertTriangle className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              activeView === tab.id
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-card'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard
              label="Total Gaps"
              value={currentTotal}
              change={-totalReduction}
              changeLabel={`${reductionPercent}% reduction`}
              color={currentTotal < 10 ? 'emerald' : currentTotal < 20 ? 'amber' : 'red'}
              icon={<Target className="w-5 h-5" />}
            />
            <MetricCard
              label="Critical Gaps"
              value={currentCritical}
              color={currentCritical === 0 ? 'emerald' : currentCritical < 5 ? 'amber' : 'red'}
              icon={<XCircle className="w-5 h-5" />}
            />
            <MetricCard
              label="Avg Closure Rate"
              value={avgClosureRate.toFixed(1)}
              suffix="/week"
              color={avgClosureRate >= 2 ? 'emerald' : avgClosureRate >= 1 ? 'amber' : 'slate'}
              icon={<Zap className="w-5 h-5" />}
            />
            <MetricCard
              label="Persistent (4+ wks)"
              value={persistentGaps.length}
              color={persistentGaps.length === 0 ? 'emerald' : persistentGaps.length < 5 ? 'amber' : 'red'}
              icon={<Clock className="w-5 h-5" />}
            />
            <MetricCard
              label="Risk Score"
              value={Math.round(overallRiskScore)}
              suffix="/100"
              color={overallRiskScore < 30 ? 'emerald' : overallRiskScore < 60 ? 'amber' : 'red'}
              icon={<Shield className="w-5 h-5" />}
            />
          </div>
          
          {/* Gap Trend Chart */}
          <Card>
            <CardHeader>
              <h4 className="font-medium text-text-primary">Gap Count Trend</h4>
            </CardHeader>
            <CardContent>
              <div className="h-64 relative">
                <GapTrendChart data={trendHistory} />
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-text-muted">Critical Gaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-text-muted">Major Gaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-text-muted">Minor Gaps</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <h4 className="font-medium text-text-primary">Weekly Gap Activity</h4>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div className="font-medium text-text-muted">Week</div>
                <div className="font-medium text-text-muted text-center">Closed</div>
                <div className="font-medium text-text-muted text-center">New</div>
                <div className="font-medium text-text-muted text-center">Net Change</div>
                <div className="font-medium text-text-muted text-center">Total</div>
                <div className="font-medium text-text-muted text-center">Critical</div>
                {trendHistory.slice(-6).map((point, idx) => (
                  <div key={idx} className="contents">
                    <div className="text-text-secondary py-1">{point.weekLabel}</div>
                    <div className="text-center py-1">
                      <Badge color="emerald" size="xs">{point.closedGaps}</Badge>
                    </div>
                    <div className="text-center py-1">
                      <Badge color="amber" size="xs">{point.newGaps}</Badge>
                    </div>
                    <div className="text-center py-1">
                      <Badge 
                        color={point.netChange > 0 ? 'emerald' : point.netChange < 0 ? 'red' : 'slate'} 
                        size="xs"
                      >
                        {point.netChange > 0 ? '+' : ''}{point.netChange}
                      </Badge>
                    </div>
                    <div className="text-center py-1 text-text-primary">{point.totalGaps}</div>
                    <div className="text-center py-1">
                      <Badge color={point.criticalGaps > 0 ? 'red' : 'emerald'} size="xs">
                        {point.criticalGaps}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Zone Analysis View */}
      {activeView === 'zones' && (
        <div className="space-y-4">
          {zoneTrends.map(zone => (
            <ZoneGapTrendCard
              key={zone.zone}
              data={zone}
              isExpanded={expandedZones.has(zone.zone)}
              onToggle={() => toggleZone(zone.zone)}
              onNavigate={() => onSelectZone?.(zone.zone)}
            />
          ))}
        </div>
      )}
      
      {/* Persistent Gaps View */}
      {activeView === 'persistent' && (
        <div className="space-y-4">
          {/* Risk Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-text-primary">{highRiskGaps.length}</div>
                    <div className="text-xs text-text-muted">High Risk (6+ weeks)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                  <div>
                    <div className="text-2xl font-bold text-text-primary">
                      {persistentGaps.filter(g => g.auditRisk === 'medium').length}
                    </div>
                    <div className="text-xs text-text-muted">Medium Risk (4-6 weeks)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-text-primary">
                      {persistentGaps.filter(g => g.isCritical).length}
                    </div>
                    <div className="text-xs text-text-muted">Critical Artifacts Missing</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Persistent Gap List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-text-primary">Persistent Gap Details</h4>
                <Badge color="slate">{persistentGaps.length} gaps</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {persistentGaps.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                  <p>No persistent gaps detected</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {persistentGaps.map((gap, idx) => (
                    <PersistentGapRow key={idx} gap={gap} />
                  ))}
                </div>
              )}
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

function MetricCard({
  label,
  value,
  suffix,
  change,
  changeLabel,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  color: 'emerald' | 'amber' | 'red' | 'slate' | 'cyan';
  icon: React.ReactNode;
}) {
  const colorClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    slate: 'border-slate-500/30 bg-slate-500/5',
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
  };
  const iconColors = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    slate: 'text-slate-400',
    cyan: 'text-cyan-400',
  };

  return (
    <Card className={colorClasses[color]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={iconColors[color]}>{icon}</div>
          <div className="flex-1">
            <div className="text-xs text-text-muted mb-1">{label}</div>
            <div className="text-xl font-bold text-text-primary">
              {value}{suffix && <span className="text-sm font-normal text-text-muted">{suffix}</span>}
            </div>
            {changeLabel && (
              <div className={`text-xs mt-1 ${change && change < 0 ? 'text-emerald-400' : 'text-text-muted'}`}>
                {changeLabel}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GapTrendChart({ data }: { data: GapTrendPoint[] }) {
  if (data.length < 2) return null;
  
  const maxGaps = Math.max(...data.map(d => d.totalGaps), 1);
  const height = 200;
  const width = 100; // Percentage
  const padding = 40;
  
  // Create stacked area paths
  const getY = (value: number) => height - padding - ((value / maxGaps) * (height - padding * 2));
  const getX = (index: number) => (index / (data.length - 1)) * (width - 10) + 5;
  
  // Build paths for each gap type (stacked)
  const minorPath = data.map((d, i) => {
    const x = getX(i);
    const y = getY(d.minorGaps);
    return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
  }).join(' ');
  
  const majorPath = data.map((d, i) => {
    const x = getX(i);
    const y = getY(d.minorGaps + d.majorGaps);
    return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
  }).join(' ');
  
  const criticalPath = data.map((d, i) => {
    const x = getX(i);
    const y = getY(d.totalGaps);
    return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
  }).join(' ');
  
  return (
    <svg width="100%" height={height} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <g key={ratio}>
          <line
            x1="5%"
            x2="95%"
            y1={height - padding - ratio * (height - padding * 2)}
            y2={height - padding - ratio * (height - padding * 2)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
          <text
            x="2%"
            y={height - padding - ratio * (height - padding * 2) + 4}
            className="text-[10px] fill-text-muted"
          >
            {Math.round(maxGaps * ratio)}
          </text>
        </g>
      ))}
      
      {/* Total line (top) */}
      <path
        d={criticalPath}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Major line */}
      <path
        d={majorPath}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Minor line */}
      <path
        d={minorPath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={`${getX(i)}%`}
            cy={getY(d.totalGaps)}
            r="4"
            fill="#ef4444"
          />
          <text
            x={`${getX(i)}%`}
            y={height - 10}
            textAnchor="middle"
            className="text-[10px] fill-text-muted"
          >
            {d.weekLabel}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ZoneGapTrendCard({
  data,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  data: ZoneGapTrend;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const trendColor = {
    improving: 'text-emerald-400',
    stable: 'text-slate-400',
    worsening: 'text-red-400',
  }[data.trendDirection];
  
  const trendBadgeColors: Record<'improving' | 'stable' | 'worsening', BadgeColor> = {
    improving: 'emerald',
    stable: 'slate',
    worsening: 'red',
  };
  const trendBadgeColor = trendBadgeColors[data.trendDirection];
  
  const riskColor: ProgressColor = data.riskScore < 30 ? 'emerald' : data.riskScore < 60 ? 'amber' : 'red';

  return (
    <Card className={data.isCritical ? 'border-cyan-500/30' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-1 hover:bg-surface rounded">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text-primary">{data.zoneName}</span>
              {data.isCritical && <Badge color="cyan" size="xs">Critical Zone</Badge>}
              <Badge color={trendBadgeColor} size="xs">
                {data.trendDirection === 'improving' ? '↓' : data.trendDirection === 'worsening' ? '↑' : '→'} {data.trendDirection}
              </Badge>
            </div>
            <div className="text-xs text-text-muted">
              {data.currentGaps} gaps • {data.closureVelocity} closed/week • Risk: {data.riskScore}/100
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Sparkline data={data.sparklineData} />
            <div className="text-right">
              <div className="text-lg font-bold text-text-primary">{data.currentGaps}</div>
              <div className={`text-xs ${trendColor}`}>
                {data.weekOverWeekChange > 0 ? '+' : ''}{data.weekOverWeekChange} WoW
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onNavigate}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {isExpanded && data.persistentGaps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-medium text-text-muted mb-2">Persistent Gaps in Zone</div>
            <div className="space-y-1">
              {data.persistentGaps.slice(0, 5).map((gap, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {gap.auditRisk === 'high' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  {gap.auditRisk === 'medium' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                  {gap.auditRisk === 'low' && <Clock className="w-3 h-3 text-blue-400" />}
                  <span className="text-text-primary flex-1 truncate">{gap.artifactName}</span>
                  <Badge color={gap.isCritical ? 'red' : 'slate'} size="xs">
                    {gap.weeksMissing}w
                  </Badge>
                </div>
              ))}
              {data.persistentGaps.length > 5 && (
                <button 
                  onClick={onNavigate}
                  className="text-xs text-accent-blue hover:underline"
                >
                  +{data.persistentGaps.length - 5} more gaps
                </button>
              )}
            </div>
          </div>
        )}
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
  // For gaps, decreasing is good (emerald)
  const trending = lastValue < firstValue ? 'emerald' : lastValue > firstValue ? 'red' : 'slate';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={trending === 'emerald' ? '#10b981' : trending === 'red' ? '#ef4444' : '#64748b'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersistentGapRow({ gap }: { gap: PersistentGap }) {
  const riskColors = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-blue-500/30 bg-blue-500/5',
  };
  const riskIcons = {
    high: <AlertTriangle className="w-4 h-4 text-red-400" />,
    medium: <AlertCircle className="w-4 h-4 text-amber-400" />,
    low: <Clock className="w-4 h-4 text-blue-400" />,
  };
  const riskBadges: Record<string, BadgeColor> = {
    high: 'red',
    medium: 'amber',
    low: 'blue',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${riskColors[gap.auditRisk]}`}>
      {riskIcons[gap.auditRisk]}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-text-primary truncate">{gap.artifactName}</span>
          {gap.isCritical && <Badge color="red" size="xs">Critical</Badge>}
        </div>
        <div className="text-xs text-text-muted">
          {gap.zoneName} • Due: {gap.milestoneName}
        </div>
      </div>
      <div className="text-right">
        <Badge color={riskBadges[gap.auditRisk]} size="sm">
          {gap.weeksMissing} weeks
        </Badge>
        <div className="text-xs text-text-muted mt-1">
          {gap.auditRisk} risk
        </div>
      </div>
    </div>
  );
}

export default DIAGapTrendAnalytics;
