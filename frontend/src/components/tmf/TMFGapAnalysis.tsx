

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Target,
  Calendar,
  Users,
  Zap,
  TrendingUp,
  Download,
  Filter,
  Search,
  ArrowRight,
  Lightbulb,
  Shield,
  FileCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
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
// TMF GAP ANALYSIS - v0.13.90
// Artifact compliance scoring, gap identification, remediation planning
// ============================================================================

interface TMFGapAnalysisProps {
  study: TMFStudy;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
  onViewArtifact: (artifact: TMFArtifact) => void;
  onSelectZone: (zone: TMFZone) => void;
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

// Expected artifacts by zone (DIA Reference Model)
const EXPECTED_ARTIFACTS: Record<TMFZone, { id: string; name: string; isCritical: boolean; milestone: StudyMilestone; sourceModule: string; remediationHours: number }[]> = {
  'zone-01': [
    { id: '01.01', name: 'TMF Plan', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 8 },
    { id: '01.02', name: 'TMF Index', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 4 },
    { id: '01.03', name: 'Signature Manifestation Log', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 2 },
    { id: '01.04', name: 'TMF Quality Control Records', isCritical: false, milestone: 'any', sourceModule: 'manual', remediationHours: 4 },
  ],
  'zone-02': [
    { id: '02.01', name: 'Protocol', isCritical: true, milestone: 'study-start-up', sourceModule: 'authoring', remediationHours: 40 },
    { id: '02.02', name: 'Protocol Amendments', isCritical: true, milestone: 'any', sourceModule: 'authoring', remediationHours: 24 },
    { id: '02.03', name: 'Investigator Brochure', isCritical: true, milestone: 'study-start-up', sourceModule: 'authoring', remediationHours: 40 },
    { id: '02.04', name: 'Sample CRF', isCritical: true, milestone: 'study-start-up', sourceModule: 'edc', remediationHours: 16 },
    { id: '02.05', name: 'Subject Information Sheet', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'authoring', remediationHours: 16 },
    { id: '02.06', name: 'Informed Consent Form', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'authoring', remediationHours: 16 },
  ],
  'zone-03': [
    { id: '03.01', name: 'IND/CTA Application', isCritical: true, milestone: 'study-start-up', sourceModule: 'submissions', remediationHours: 80 },
    { id: '03.02', name: 'Regulatory Approval', isCritical: true, milestone: 'study-start-up', sourceModule: 'submissions', remediationHours: 8 },
    { id: '03.03', name: 'Regulatory Correspondence', isCritical: false, milestone: 'any', sourceModule: 'submissions', remediationHours: 4 },
    { id: '03.04', name: 'Annual Reports', isCritical: true, milestone: 'any', sourceModule: 'submissions', remediationHours: 40 },
  ],
  'zone-04': [
    { id: '04.01', name: 'IRB/IEC Submission', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 8 },
    { id: '04.02', name: 'IRB/IEC Initial Approval', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'manual', remediationHours: 4 },
    { id: '04.03', name: 'IRB/IEC Amendment Approvals', isCritical: true, milestone: 'any', sourceModule: 'manual', remediationHours: 8 },
    { id: '04.04', name: 'IRB/IEC Continuing Review', isCritical: true, milestone: 'any', sourceModule: 'manual', remediationHours: 8 },
    { id: '04.05', name: 'IRB/IEC Membership List', isCritical: false, milestone: 'first-site-initiated', sourceModule: 'manual', remediationHours: 2 },
  ],
  'zone-05': [
    { id: '05.01', name: 'Site Selection Documentation', isCritical: true, milestone: 'study-start-up', sourceModule: 'ctms', remediationHours: 8 },
    { id: '05.02', name: 'Pre-Study Site Visit Report', isCritical: false, milestone: 'study-start-up', sourceModule: 'ctms', remediationHours: 8 },
    { id: '05.03', name: 'Site Initiation Visit Report', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'ctms', remediationHours: 8 },
    { id: '05.04', name: 'Monitoring Visit Reports', isCritical: true, milestone: 'first-subject-enrolled', sourceModule: 'ctms', remediationHours: 16 },
    { id: '05.05', name: 'Site Close-out Visit Report', isCritical: true, milestone: 'study-close-out', sourceModule: 'ctms', remediationHours: 8 },
    { id: '05.06', name: 'Investigator CV', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'ctms', remediationHours: 2 },
    { id: '05.07', name: 'Form FDA 1572', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'ctms', remediationHours: 4 },
    { id: '05.08', name: 'Financial Disclosure', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'ctms', remediationHours: 4 },
  ],
  'zone-06': [
    { id: '06.01', name: 'IP Shipment Records', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'cmc', remediationHours: 4 },
    { id: '06.02', name: 'IP Accountability Logs', isCritical: true, milestone: 'first-subject-enrolled', sourceModule: 'cmc', remediationHours: 8 },
    { id: '06.03', name: 'IP Return Records', isCritical: false, milestone: 'study-close-out', sourceModule: 'cmc', remediationHours: 4 },
    { id: '06.04', name: 'IP Destruction Records', isCritical: false, milestone: 'study-close-out', sourceModule: 'cmc', remediationHours: 4 },
  ],
  'zone-07': [
    { id: '07.01', name: 'Safety Management Plan', isCritical: true, milestone: 'study-start-up', sourceModule: 'safety', remediationHours: 24 },
    { id: '07.02', name: 'SAE Reports', isCritical: true, milestone: 'first-subject-enrolled', sourceModule: 'safety', remediationHours: 8 },
    { id: '07.03', name: 'SUSAR Notifications', isCritical: true, milestone: 'any', sourceModule: 'safety', remediationHours: 16 },
    { id: '07.04', name: 'DSUR/PBRER', isCritical: true, milestone: 'any', sourceModule: 'safety', remediationHours: 80 },
    { id: '07.05', name: 'Safety Database Reports', isCritical: false, milestone: 'any', sourceModule: 'safety', remediationHours: 8 },
  ],
  'zone-08': [
    { id: '08.01', name: 'Lab Certifications', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'manual', remediationHours: 4 },
    { id: '08.02', name: 'Lab Normal Ranges', isCritical: true, milestone: 'first-site-initiated', sourceModule: 'manual', remediationHours: 4 },
    { id: '08.03', name: 'Sample Handling Procedures', isCritical: false, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 8 },
  ],
  'zone-09': [
    { id: '09.01', name: 'Vendor Agreements', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 16 },
    { id: '09.02', name: 'Vendor Qualifications', isCritical: true, milestone: 'study-start-up', sourceModule: 'manual', remediationHours: 8 },
    { id: '09.03', name: 'Vendor Audit Reports', isCritical: false, milestone: 'any', sourceModule: 'manual', remediationHours: 16 },
  ],
  'zone-10': [
    { id: '10.01', name: 'Data Management Plan', isCritical: true, milestone: 'study-start-up', sourceModule: 'edc', remediationHours: 24 },
    { id: '10.02', name: 'CRF Completion Guidelines', isCritical: true, milestone: 'study-start-up', sourceModule: 'edc', remediationHours: 16 },
    { id: '10.03', name: 'Database Validation', isCritical: true, milestone: 'first-subject-enrolled', sourceModule: 'edc', remediationHours: 40 },
    { id: '10.04', name: 'Database Lock Documentation', isCritical: true, milestone: 'database-lock', sourceModule: 'edc', remediationHours: 16 },
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

// Source module display names
const SOURCE_MODULE_NAMES: Record<string, string> = {
  'authoring': 'Authoring',
  'submissions': 'Submissions',
  'ctms': 'CTMS',
  'safety': 'Safety & PV',
  'edc': 'EDC',
  'cmc': 'CMC',
  'manual': 'Manual Upload',
};

// Gap severity calculation
type GapSeverity = 'critical' | 'major' | 'minor';

interface ArtifactGap {
  id: string;
  artifactId: string;
  artifactName: string;
  zone: TMFZone;
  zoneName: string;
  isCritical: boolean;
  severity: GapSeverity;
  status: 'missing' | 'incomplete' | 'qc-failed';
  milestone: StudyMilestone;
  milestoneName: string;
  sourceModule: string;
  sourceModuleName: string;
  remediationHours: number;
  suggestedAction: string;
  dueDate?: string;
  assignee?: string;
  priority: number;
}

interface RemediationPlan {
  totalGaps: number;
  criticalGaps: number;
  majorGaps: number;
  minorGaps: number;
  totalRemediationHours: number;
  estimatedCompletionDays: number;
  prioritizedActions: ArtifactGap[];
}

export function TMFGapAnalysis({
  study,
  artifactsByZone,
  artifactsRecord,
  onViewArtifact,
  onSelectZone,
}: TMFGapAnalysisProps) {
  const [expandedZones, setExpandedZones] = useState<Set<TMFZone>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<'all' | GapSeverity>('all');
  const [zoneFilter, setZoneFilter] = useState<TMFZone | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'gaps' | 'remediation' | 'scoring'>('gaps');

  // Calculate artifact gaps
  const gaps = useMemo((): ArtifactGap[] => {
    const allGaps: ArtifactGap[] = [];
    const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];

    zones.forEach(zone => {
      const zoneArtifactIds = artifactsByZone[zone] || [];
      const zoneArtifacts = zoneArtifactIds.map(id => artifactsRecord[id]).filter(Boolean);
      const expectedArtifacts = EXPECTED_ARTIFACTS[zone] || [];

      expectedArtifacts.forEach(expected => {
        // Check if artifact exists
        const matchingArtifact = zoneArtifacts.find(a => 
          a.title?.toLowerCase().includes(expected.name.toLowerCase().split(' ')[0]) ||
          a.fileName?.toLowerCase().includes(expected.name.toLowerCase().split(' ')[0])
        );

        let status: ArtifactGap['status'] = 'missing';
        let severity: GapSeverity = expected.isCritical ? 'critical' : 'major';

        if (matchingArtifact) {
          // Artifact exists - check quality
          if (matchingArtifact.qualityStatus === 'qc-failed') {
            status = 'qc-failed';
            severity = 'major';
          } else if (matchingArtifact.status === 'draft') {
            status = 'incomplete';
            severity = expected.isCritical ? 'major' : 'minor';
          } else if (matchingArtifact.status === 'filed') {
            // Filed and QC passed - no gap
            return;
          } else {
            status = 'incomplete';
            severity = 'minor';
          }
        } else {
          // Missing - severity based on criticality and zone
          if (expected.isCritical && CRITICAL_ZONES.includes(zone)) {
            severity = 'critical';
          } else if (expected.isCritical) {
            severity = 'major';
          } else {
            severity = 'minor';
          }
        }

        // Calculate priority (lower = higher priority)
        const priority = 
          (severity === 'critical' ? 0 : severity === 'major' ? 100 : 200) +
          (status === 'missing' ? 0 : status === 'qc-failed' ? 20 : 30) +
          (CRITICAL_ZONES.includes(zone) ? 0 : 50);

        // Generate suggested action
        let suggestedAction = '';
        if (status === 'missing') {
          suggestedAction = `Upload ${expected.name} from ${SOURCE_MODULE_NAMES[expected.sourceModule] || expected.sourceModule}`;
        } else if (status === 'qc-failed') {
          suggestedAction = `Review and correct QC findings for ${expected.name}`;
        } else if (status === 'incomplete') {
          suggestedAction = `Complete draft and finalize ${expected.name}`;
        }

        allGaps.push({
          id: `gap-${zone}-${expected.id}`,
          artifactId: expected.id,
          artifactName: expected.name,
          zone,
          zoneName: ZONE_NAMES[zone],
          isCritical: expected.isCritical,
          severity,
          status,
          milestone: expected.milestone,
          milestoneName: MILESTONE_NAMES[expected.milestone],
          sourceModule: expected.sourceModule,
          sourceModuleName: SOURCE_MODULE_NAMES[expected.sourceModule] || expected.sourceModule,
          remediationHours: expected.remediationHours,
          suggestedAction,
          priority,
        });
      });
    });

    // Sort by priority
    return allGaps.sort((a, b) => a.priority - b.priority);
  }, [artifactsByZone, artifactsRecord]);

  // Calculate remediation plan
  const remediationPlan = useMemo((): RemediationPlan => {
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    const majorGaps = gaps.filter(g => g.severity === 'major');
    const minorGaps = gaps.filter(g => g.severity === 'minor');
    const totalHours = gaps.reduce((sum, g) => sum + g.remediationHours, 0);
    // Assume 8 hours per day, 1 FTE
    const estimatedDays = Math.ceil(totalHours / 8);

    return {
      totalGaps: gaps.length,
      criticalGaps: criticalGaps.length,
      majorGaps: majorGaps.length,
      minorGaps: minorGaps.length,
      totalRemediationHours: totalHours,
      estimatedCompletionDays: estimatedDays,
      prioritizedActions: gaps.slice(0, 10), // Top 10 priorities
    };
  }, [gaps]);

  // Calculate compliance scores by zone
  const zoneScores = useMemo(() => {
    const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];
    
    return zones.map(zone => {
      const expected = EXPECTED_ARTIFACTS[zone]?.length || 0;
      const zoneGaps = gaps.filter(g => g.zone === zone);
      const filed = expected - zoneGaps.filter(g => g.status === 'missing').length;
      const score = expected > 0 ? Math.round((filed / expected) * 100) : 0;
      const criticalGaps = zoneGaps.filter(g => g.severity === 'critical').length;
      
      return {
        zone,
        zoneName: ZONE_NAMES[zone],
        isCritical: CRITICAL_ZONES.includes(zone),
        expected,
        filed,
        gaps: zoneGaps.length,
        criticalGaps,
        score,
      };
    });
  }, [gaps]);

  // Filter gaps
  const filteredGaps = useMemo(() => {
    return gaps.filter(gap => {
      if (severityFilter !== 'all' && gap.severity !== severityFilter) return false;
      if (zoneFilter !== 'all' && gap.zone !== zoneFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return gap.artifactName.toLowerCase().includes(q) || 
               gap.zoneName.toLowerCase().includes(q) ||
               gap.suggestedAction.toLowerCase().includes(q);
      }
      return true;
    });
  }, [gaps, severityFilter, zoneFilter, searchQuery]);

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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total Gaps"
          value={remediationPlan.totalGaps}
          color="slate"
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <SummaryCard
          label="Critical"
          value={remediationPlan.criticalGaps}
          color="red"
          icon={<XCircle className="w-5 h-5" />}
          onClick={() => setSeverityFilter('critical')}
        />
        <SummaryCard
          label="Major"
          value={remediationPlan.majorGaps}
          color="amber"
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => setSeverityFilter('major')}
        />
        <SummaryCard
          label="Est. Remediation"
          value={`${remediationPlan.estimatedCompletionDays}d`}
          color="blue"
          icon={<Clock className="w-5 h-5" />}
          subtitle={`${remediationPlan.totalRemediationHours} hours`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'gaps' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('gaps')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Gap Analysis
        </Button>
        <Button
          variant={activeTab === 'remediation' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('remediation')}
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Remediation Plan
        </Button>
        <Button
          variant={activeTab === 'scoring' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('scoring')}
        >
          <Target className="w-4 h-4 mr-2" />
          Compliance Scoring
        </Button>
      </div>

      {/* Gap Analysis Tab */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gaps..."
              className="w-64"
            />
            <div className="flex gap-2">
              {(['all', 'critical', 'major', 'minor'] as const).map(sev => (
                <Button
                  key={sev}
                  variant={severityFilter === sev ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </Button>
              ))}
            </div>
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value as TMFZone | 'all')}
              className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="all">All Zones</option>
              {Object.entries(ZONE_NAMES).map(([zone, name]) => (
                <option key={zone} value={zone}>{name}</option>
              ))}
            </select>
          </div>

          {/* Gap List */}
          <div className="space-y-2">
            {filteredGaps.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-50" />
                  <h3 className="text-lg font-medium text-text-primary mb-1">No Gaps Found</h3>
                  <p className="text-sm text-text-muted">All artifacts meet compliance requirements for this filter.</p>
                </CardContent>
              </Card>
            ) : (
              filteredGaps.map(gap => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  onNavigate={() => onSelectZone(gap.zone)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Remediation Plan Tab */}
      {activeTab === 'remediation' && (
        <div className="space-y-4">
          {/* Remediation Summary */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-6 h-6 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary mb-2">Remediation Estimate</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Total Hours:</span>
                      <span className="ml-2 font-medium text-text-primary">{remediationPlan.totalRemediationHours}h</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Est. Duration:</span>
                      <span className="ml-2 font-medium text-text-primary">{remediationPlan.estimatedCompletionDays} days</span>
                    </div>
                    <div>
                      <span className="text-text-muted">FTEs Needed:</span>
                      <span className="ml-2 font-medium text-text-primary">{Math.ceil(remediationPlan.estimatedCompletionDays / 10)} (@ 10 days)</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prioritized Actions */}
          <Card>
            <CardHeader>
              <h3 className="font-medium text-text-primary">Prioritized Actions (Top 10)</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {remediationPlan.prioritizedActions.map((gap, idx) => (
                  <div key={gap.id} className="p-4 hover:bg-surface-card transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-text-primary">{gap.artifactName}</span>
                          <Badge color={getSeverityColor(gap.severity)} size="xs">{gap.severity}</Badge>
                          <Badge color="slate" size="xs">{gap.zoneName}</Badge>
                        </div>
                        <p className="text-sm text-text-secondary">{gap.suggestedAction}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                          <span><Clock className="w-3 h-3 inline mr-1" />{gap.remediationHours}h</span>
                          <span><FileText className="w-3 h-3 inline mr-1" />{gap.sourceModuleName}</span>
                          <span><Calendar className="w-3 h-3 inline mr-1" />{gap.milestoneName}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onSelectZone(gap.zone)}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Scoring Tab */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          {/* Overall Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-text-primary">Overall Compliance Score</h3>
                  <p className="text-sm text-text-muted">Based on DIA TMF Reference Model</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-text-primary">
                    {Math.round(zoneScores.reduce((sum, z) => sum + z.score, 0) / zoneScores.length)}%
                  </div>
                  <Badge 
                    color={zoneScores.reduce((sum, z) => sum + z.score, 0) / zoneScores.length >= 80 ? 'green' : 'amber'}
                    size="sm"
                  >
                    {zoneScores.reduce((sum, z) => sum + z.score, 0) / zoneScores.length >= 80 ? 'Good Standing' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
              <ProgressBar 
                value={Math.round(zoneScores.reduce((sum, z) => sum + z.score, 0) / zoneScores.length)} 
                color={zoneScores.reduce((sum, z) => sum + z.score, 0) / zoneScores.length >= 80 ? 'green' : 'amber'} 
              />
            </CardContent>
          </Card>

          {/* Zone Scores */}
          <div className="grid grid-cols-2 gap-4">
            {zoneScores.map(zone => (
              <ZoneScoreCard
                key={zone.zone}
                zone={zone}
                isExpanded={expandedZones.has(zone.zone)}
                onToggle={() => toggleZoneExpanded(zone.zone)}
                onNavigate={() => onSelectZone(zone.zone)}
                gaps={gaps.filter(g => g.zone === zone.zone)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function SummaryCard({ 
  label, 
  value, 
  color, 
  icon,
  subtitle,
  onClick 
}: { 
  label: string; 
  value: string | number; 
  color: 'red' | 'amber' | 'blue' | 'slate' | 'green';
  icon: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    red: 'border-red-500/30 hover:bg-red-500/10',
    amber: 'border-amber-500/30 hover:bg-amber-500/10',
    blue: 'border-blue-500/30 hover:bg-blue-500/10',
    slate: 'border-slate-500/30 hover:bg-slate-500/10',
    green: 'border-emerald-500/30 hover:bg-emerald-500/10',
  };
  const iconColors: Record<string, string> = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    slate: 'text-slate-400',
    green: 'text-emerald-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-4 rounded-lg border transition-colors text-left ${colorClasses[color]} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-3">
        <div className={iconColors[color]}>{icon}</div>
        <div>
          <div className="text-2xl font-bold text-text-primary">{value}</div>
          <div className="text-xs text-text-muted">{label}</div>
          {subtitle && <div className="text-xs text-text-muted opacity-70">{subtitle}</div>}
        </div>
      </div>
    </button>
  );
}

function GapCard({ gap, onNavigate }: { gap: ArtifactGap; onNavigate: () => void }) {
  const severityColors: Record<GapSeverity, { bg: string; icon: string; badge: BadgeColor }> = {
    critical: { bg: 'border-red-500/30 bg-red-500/5', icon: 'text-red-400', badge: 'red' },
    major: { bg: 'border-amber-500/30 bg-amber-500/5', icon: 'text-amber-400', badge: 'amber' },
    minor: { bg: 'border-blue-500/30 bg-blue-500/5', icon: 'text-blue-400', badge: 'blue' },
  };
  const colors = severityColors[gap.severity];
  
  const statusColors: Record<string, BadgeColor> = {
    missing: 'red',
    incomplete: 'amber',
    'qc-failed': 'purple',
  };

  return (
    <Card className={colors.bg}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${colors?.icon ?? ''}`}>
            {gap.severity === 'critical' && <XCircle className="w-5 h-5" />}
            {gap.severity === 'major' && <AlertTriangle className="w-5 h-5" />}
            {gap.severity === 'minor' && <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-text-primary">{gap.artifactName}</span>
              <Badge color={colors.badge} size="xs">{gap.severity}</Badge>
              <Badge color={statusColors[gap.status]} size="xs">{gap.status}</Badge>
              {gap.isCritical && <Badge color="cyan" size="xs">Critical Doc</Badge>}
            </div>
            <p className="text-sm text-text-secondary mb-2">{gap.suggestedAction}</p>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span><FileText className="w-3 h-3 inline mr-1" />{gap.zoneName}</span>
              <span><Zap className="w-3 h-3 inline mr-1" />{gap.sourceModuleName}</span>
              <span><Clock className="w-3 h-3 inline mr-1" />{gap.remediationHours}h to remediate</span>
              <span><Calendar className="w-3 h-3 inline mr-1" />{gap.milestoneName}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onNavigate}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ZoneScoreCard({ 
  zone, 
  isExpanded, 
  onToggle, 
  onNavigate,
  gaps 
}: { 
  zone: { zone: TMFZone; zoneName: string; isCritical: boolean; expected: number; filed: number; gaps: number; criticalGaps: number; score: number };
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  gaps: ArtifactGap[];
}) {
  const scoreColor: ProgressColor = zone.score >= 90 ? 'emerald' : zone.score >= 70 ? 'green' : zone.score >= 50 ? 'amber' : 'red';

  return (
    <Card className={zone.isCritical ? 'border-cyan-500/30' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onToggle} className="p-1 hover:bg-surface rounded">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{zone.zoneName}</span>
              {zone.isCritical && <Badge color="cyan" size="xs">Critical</Badge>}
              {zone.criticalGaps > 0 && <Badge color="red" size="xs">{zone.criticalGaps} critical gaps</Badge>}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {zone.filed}/{zone.expected} artifacts • {zone.gaps} gaps
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-text-primary">{zone.score}%</div>
          </div>
        </div>
        <ProgressBar value={zone.score} color={scoreColor} size="sm" />
        
        {isExpanded && gaps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            {gaps.slice(0, 5).map(gap => (
              <div key={gap.id} className="flex items-center gap-2 text-sm">
                {gap.severity === 'critical' && <XCircle className="w-3 h-3 text-red-400" />}
                {gap.severity === 'major' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                {gap.severity === 'minor' && <AlertCircle className="w-3 h-3 text-blue-400" />}
                <span className="text-text-primary flex-1 truncate">{gap.artifactName}</span>
                <Badge color={getSeverityColor(gap.severity)} size="xs">{gap.status}</Badge>
              </div>
            ))}
            {gaps.length > 5 && (
              <button 
                onClick={onNavigate}
                className="text-xs text-accent-blue hover:underline"
              >
                +{gaps.length - 5} more gaps
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSeverityColor(severity: GapSeverity): BadgeColor {
  switch (severity) {
    case 'critical': return 'red';
    case 'major': return 'amber';
    case 'minor': return 'blue';
  }
}

export default TMFGapAnalysis;
