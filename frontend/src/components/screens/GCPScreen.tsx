
/**
 * GCP Screen - v0.35.1
 * ICH E6(R2) Good Clinical Practice Compliance Dashboard
 * 
 * Manages clinical trial compliance across:
 * - Site inspections & oversight
 * - Protocol deviations
 * - Investigator qualifications
 * - Essential documents
 * - Training compliance
 */

import { useState, useMemo } from 'react';
import {
  Shield, FileText, Users, Building2, ClipboardCheck, Archive,
  Search, Plus, ChevronRight, CheckCircle, AlertTriangle, Clock, X,
  User, Calendar, ExternalLink, Eye, Edit, AlertCircle, TrendingUp,
  BarChart3, Activity, Gauge, Target, Stethoscope, MapPin, GraduationCap,
  AlertOctagon, FileWarning, RefreshCw, Globe, Award, Briefcase,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// TYPES
// ============================================================================

type GCPTab = 'dashboard' | 'sites' | 'deviations' | 'training' | 'documents' | 'inspections';

interface Site {
  id: string;
  name: string;
  investigator: string;
  country: string;
  status: 'active' | 'inactive' | 'pending' | 'closed';
  enrolledSubjects: number;
  targetEnrollment: number;
  openDeviations: number;
  lastMonitoringVisit: string;
  nextVisitDue: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ProtocolDeviation {
  id: string;
  siteId: string;
  siteName: string;
  category: 'eligibility' | 'consent' | 'safety-reporting' | 'ip-accountability' | 'procedure' | 'visit-window';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  subjectId: string;
  reportedDate: string;
  status: 'open' | 'under-review' | 'closed';
  rootCause?: string;
  capa?: string;
}

interface TrainingRecord {
  id: string;
  personName: string;
  role: 'investigator' | 'sub-investigator' | 'coordinator' | 'pharmacist' | 'nurse';
  site: string;
  training: string;
  completedDate: string | null;
  dueDate: string;
  status: 'completed' | 'overdue' | 'due-soon' | 'not-started';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSites: Site[] = [
  { id: 'SITE-001', name: 'Massachusetts General Hospital', investigator: 'Dr. Sarah Chen', country: 'US', status: 'active', enrolledSubjects: 45, targetEnrollment: 60, openDeviations: 2, lastMonitoringVisit: '2025-01-15', nextVisitDue: '2025-02-15', riskLevel: 'low' },
  { id: 'SITE-002', name: 'Johns Hopkins University', investigator: 'Dr. Michael Roberts', country: 'US', status: 'active', enrolledSubjects: 38, targetEnrollment: 50, openDeviations: 0, lastMonitoringVisit: '2025-01-10', nextVisitDue: '2025-02-10', riskLevel: 'low' },
  { id: 'SITE-003', name: 'Charité Berlin', investigator: 'Dr. Klaus Weber', country: 'DE', status: 'active', enrolledSubjects: 28, targetEnrollment: 40, openDeviations: 3, lastMonitoringVisit: '2024-12-20', nextVisitDue: '2025-01-20', riskLevel: 'medium' },
  { id: 'SITE-004', name: 'Royal Marsden Hospital', investigator: 'Dr. Emma Thompson', country: 'GB', status: 'active', enrolledSubjects: 52, targetEnrollment: 55, openDeviations: 1, lastMonitoringVisit: '2025-01-08', nextVisitDue: '2025-02-08', riskLevel: 'low' },
  { id: 'SITE-005', name: 'Tokyo University Hospital', investigator: 'Dr. Yuki Tanaka', country: 'JP', status: 'pending', enrolledSubjects: 0, targetEnrollment: 30, openDeviations: 0, lastMonitoringVisit: '-', nextVisitDue: '2025-02-01', riskLevel: 'low' },
  { id: 'SITE-006', name: 'Hospital Clinic Barcelona', investigator: 'Dr. Carlos Mendez', country: 'ES', status: 'active', enrolledSubjects: 22, targetEnrollment: 35, openDeviations: 5, lastMonitoringVisit: '2024-11-30', nextVisitDue: '2025-01-30', riskLevel: 'high' },
];

const mockDeviations: ProtocolDeviation[] = [
  { id: 'PD-001', siteId: 'SITE-003', siteName: 'Charité Berlin', category: 'visit-window', severity: 'minor', description: 'Visit 4 conducted 3 days outside protocol window', subjectId: 'SUBJ-312', reportedDate: '2025-01-18', status: 'open' },
  { id: 'PD-002', siteId: 'SITE-006', siteName: 'Hospital Clinic Barcelona', category: 'safety-reporting', severity: 'major', description: 'SAE reported 48 hours late to sponsor', subjectId: 'SUBJ-601', reportedDate: '2025-01-15', status: 'under-review', rootCause: 'Staff unfamiliar with reporting timeline' },
  { id: 'PD-003', siteId: 'SITE-001', siteName: 'Massachusetts General Hospital', category: 'ip-accountability', severity: 'minor', description: 'Temperature excursion during IP storage', subjectId: 'N/A', reportedDate: '2025-01-12', status: 'closed', rootCause: 'Refrigerator malfunction', capa: 'Backup refrigerator installed' },
  { id: 'PD-004', siteId: 'SITE-006', siteName: 'Hospital Clinic Barcelona', category: 'consent', severity: 'critical', description: 'Subject enrolled prior to IRB amendment approval', subjectId: 'SUBJ-615', reportedDate: '2025-01-10', status: 'open' },
  { id: 'PD-005', siteId: 'SITE-003', siteName: 'Charité Berlin', category: 'eligibility', severity: 'major', description: 'Subject enrolled with exclusion criterion present', subjectId: 'SUBJ-308', reportedDate: '2025-01-08', status: 'under-review' },
];

const mockTraining: TrainingRecord[] = [
  { id: 'TR-001', personName: 'Dr. Carlos Mendez', role: 'investigator', site: 'Hospital Clinic Barcelona', training: 'Protocol Amendment 3', completedDate: null, dueDate: '2025-01-25', status: 'overdue' },
  { id: 'TR-002', personName: 'Maria Garcia', role: 'coordinator', site: 'Hospital Clinic Barcelona', training: 'EDC System Training', completedDate: null, dueDate: '2025-01-28', status: 'due-soon' },
  { id: 'TR-003', personName: 'Dr. Klaus Weber', role: 'investigator', site: 'Charité Berlin', training: 'GCP Refresher', completedDate: '2025-01-10', dueDate: '2025-01-15', status: 'completed' },
  { id: 'TR-004', personName: 'Dr. Sarah Chen', role: 'investigator', site: 'Massachusetts General Hospital', training: 'Protocol Amendment 3', completedDate: '2025-01-05', dueDate: '2025-01-10', status: 'completed' },
];

const metrics = {
  overallCompliance: 87,
  activeSites: 5,
  pendingSites: 1,
  totalEnrolled: 185,
  targetEnrollment: 270,
  openDeviations: 11,
  criticalDeviations: 1,
  majorDeviations: 3,
  overdueVisits: 2,
  trainingCompliance: 92,
  overdueTraining: 1,
  upcomingInspections: 1,
};

// ============================================================================
// COMPONENTS
// ============================================================================

const ComplianceGauge = ({ score }: { score: number }) => {
  const color = score >= 90 ? 'text-green-400' : score >= 75 ? 'text-amber-400' : 'text-red-400';
  const bgColor = score >= 90 ? 'stroke-green-500/20' : score >= 75 ? 'stroke-amber-500/20' : 'stroke-red-500/20';
  const fgColor = score >= 90 ? 'stroke-green-500' : score >= 75 ? 'stroke-amber-500' : 'stroke-red-500';
  
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r="56" fill="none" className={bgColor} strokeWidth="12" />
        <circle 
          cx="64" cy="64" r="56" fill="none" 
          className={fgColor} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 352} 352`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{score}%</span>
        <span className="text-xs text-text-muted">Compliant</span>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon, color = 'blue' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}) => {
  const colors = {
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">{value}</div>
          <div className="text-sm text-text-secondary">{title}</div>
          {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

const SiteRow = ({ site }: { site: Site }) => {
  const statusColors = {
    active: 'green',
    inactive: 'gray',
    pending: 'amber',
    closed: 'red',
  } as const;
  
  const riskColors = {
    low: 'green',
    medium: 'amber',
    high: 'red',
  } as const;
  
  const flags: Record<string, string> = { US: '🇺🇸', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', ES: '🇪🇸' };
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
      <div className="flex items-center gap-4">
        <span className="text-xl">{flags[site.country] || '🌐'}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{site.name}</span>
            <Badge color={statusColors[site.status]} size="xs">{site.status}</Badge>
            {site.riskLevel === 'high' && <Badge color="red" size="xs">High Risk</Badge>}
          </div>
          <div className="text-sm text-text-muted">{site.investigator} • {site.id}</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="font-medium text-text-primary">{site.enrolledSubjects}/{site.targetEnrollment}</div>
          <div className="text-xs text-text-muted">Enrolled</div>
        </div>
        <div className="text-center">
          <div className={`font-medium ${site.openDeviations > 0 ? 'text-amber-400' : 'text-text-primary'}`}>{site.openDeviations}</div>
          <div className="text-xs text-text-muted">Deviations</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-muted">Next Visit</div>
          <div className="text-sm text-text-secondary">{site.nextVisitDue}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </div>
  );
};

const DeviationRow = ({ deviation }: { deviation: ProtocolDeviation }) => {
  const severityColors = { minor: 'blue', major: 'amber', critical: 'red' } as const;
  const statusColors = { open: 'amber', 'under-review': 'blue', closed: 'green' } as const;
  
  return (
    <div className="flex items-center justify-between p-4 bg-surface-card rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${
          deviation.severity === 'critical' ? 'bg-red-500' : 
          deviation.severity === 'major' ? 'bg-amber-500' : 'bg-blue-500'
        }`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{deviation.id}</span>
            <Badge color={severityColors[deviation.severity]} size="xs">{deviation.severity}</Badge>
            <Badge color={statusColors[deviation.status]} size="xs">{deviation.status}</Badge>
          </div>
          <div className="text-sm text-text-secondary mt-1">{deviation.description}</div>
          <div className="text-xs text-text-muted mt-1">{deviation.siteName} • Subject {deviation.subjectId}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-text-secondary">{deviation.reportedDate}</div>
        <Badge color="gray" size="xs" className="mt-1">{deviation.category}</Badge>
      </div>
    </div>
  );
};

// ============================================================================
// TRAINING TAB DATA & COMPONENTS
// ============================================================================

interface TrainingCourse {
  id: string;
  courseName: string;
  category: 'gcp-required' | 'protocol-specific' | 'system-training' | 'regulatory';
  frequency: 'one-time' | 'annual' | 'biennial' | 'per-amendment';
  requiredRoles: string[];
}

interface SiteTrainingStatus {
  siteId: string;
  siteName: string;
  totalRequired: number;
  completed: number;
  overdue: number;
  dueSoon: number;
}

const trainingCourses: TrainingCourse[] = [
  { id: 'TC-001', courseName: 'ICH E6(R2) GCP Refresher', category: 'gcp-required', frequency: 'biennial', requiredRoles: ['investigator', 'sub-investigator', 'coordinator'] },
  { id: 'TC-002', courseName: 'Protocol v3.0 Training', category: 'protocol-specific', frequency: 'per-amendment', requiredRoles: ['investigator', 'sub-investigator', 'coordinator', 'pharmacist', 'nurse'] },
  { id: 'TC-003', courseName: 'Medidata Rave EDC System', category: 'system-training', frequency: 'one-time', requiredRoles: ['coordinator'] },
  { id: 'TC-004', courseName: 'SAE Reporting Procedures', category: 'regulatory', frequency: 'annual', requiredRoles: ['investigator', 'sub-investigator', 'coordinator', 'nurse'] },
  { id: 'TC-005', courseName: 'Protocol Amendment 3 — Eligibility Changes', category: 'protocol-specific', frequency: 'per-amendment', requiredRoles: ['investigator', 'sub-investigator', 'coordinator'] },
  { id: 'TC-006', courseName: 'Informed Consent Procedures', category: 'gcp-required', frequency: 'annual', requiredRoles: ['investigator', 'sub-investigator', 'coordinator'] },
  { id: 'TC-007', courseName: 'IP Handling & Accountability', category: 'protocol-specific', frequency: 'one-time', requiredRoles: ['pharmacist', 'coordinator'] },
  { id: 'TC-008', courseName: 'WBDC Radiation Safety', category: 'regulatory', frequency: 'annual', requiredRoles: ['nurse'] },
];

const mockAllTraining: TrainingRecord[] = [
  { id: 'TR-001', personName: 'Dr. Carlos Mendez', role: 'investigator', site: 'Hospital Clinic Barcelona', training: 'Protocol Amendment 3 — Eligibility Changes', completedDate: null, dueDate: '2025-01-25', status: 'overdue' },
  { id: 'TR-002', personName: 'Maria Garcia', role: 'coordinator', site: 'Hospital Clinic Barcelona', training: 'Medidata Rave EDC System', completedDate: null, dueDate: '2025-01-28', status: 'due-soon' },
  { id: 'TR-003', personName: 'Dr. Klaus Weber', role: 'investigator', site: 'Charité Berlin', training: 'ICH E6(R2) GCP Refresher', completedDate: '2025-01-10', dueDate: '2025-01-15', status: 'completed' },
  { id: 'TR-004', personName: 'Dr. Sarah Chen', role: 'investigator', site: 'Massachusetts General Hospital', training: 'Protocol Amendment 3 — Eligibility Changes', completedDate: '2025-01-05', dueDate: '2025-01-10', status: 'completed' },
  { id: 'TR-005', personName: 'Linda Park', role: 'coordinator', site: 'Massachusetts General Hospital', training: 'SAE Reporting Procedures', completedDate: '2025-01-08', dueDate: '2025-01-20', status: 'completed' },
  { id: 'TR-006', personName: 'Dr. Michael Roberts', role: 'investigator', site: 'Johns Hopkins University', training: 'ICH E6(R2) GCP Refresher', completedDate: '2024-12-20', dueDate: '2025-01-05', status: 'completed' },
  { id: 'TR-007', personName: 'Dr. Emma Thompson', role: 'investigator', site: 'Royal Marsden Hospital', training: 'Protocol Amendment 3 — Eligibility Changes', completedDate: null, dueDate: '2025-02-01', status: 'due-soon' },
  { id: 'TR-008', personName: 'James Liu', role: 'pharmacist', site: 'Johns Hopkins University', training: 'IP Handling & Accountability', completedDate: '2024-11-30', dueDate: '2024-12-15', status: 'completed' },
  { id: 'TR-009', personName: 'Ana López', role: 'coordinator', site: 'Hospital Clinic Barcelona', training: 'Informed Consent Procedures', completedDate: null, dueDate: '2025-02-10', status: 'not-started' },
  { id: 'TR-010', personName: 'Dr. Yuki Tanaka', role: 'investigator', site: 'Tokyo University Hospital', training: 'ICH E6(R2) GCP Refresher', completedDate: null, dueDate: '2025-02-15', status: 'not-started' },
];

const siteTrainingStatus: SiteTrainingStatus[] = [
  { siteId: 'SITE-001', siteName: 'Massachusetts General Hospital', totalRequired: 18, completed: 17, overdue: 0, dueSoon: 1 },
  { siteId: 'SITE-002', siteName: 'Johns Hopkins University', totalRequired: 16, completed: 15, overdue: 0, dueSoon: 0 },
  { siteId: 'SITE-003', siteName: 'Charité Berlin', totalRequired: 20, completed: 18, overdue: 0, dueSoon: 2 },
  { siteId: 'SITE-004', siteName: 'Royal Marsden Hospital', totalRequired: 14, completed: 13, overdue: 0, dueSoon: 1 },
  { siteId: 'SITE-005', siteName: 'Tokyo University Hospital', totalRequired: 12, completed: 10, overdue: 0, dueSoon: 0 },
  { siteId: 'SITE-006', siteName: 'Hospital Clinic Barcelona', totalRequired: 22, completed: 18, overdue: 1, dueSoon: 3 },
];

const trainingStatusConfig = {
  completed:    { color: 'green' as const,  label: 'Completed' },
  overdue:      { color: 'red' as const,    label: 'Overdue'   },
  'due-soon':   { color: 'amber' as const,  label: 'Due Soon'  },
  'not-started':{ color: 'slate' as const,  label: 'Pending'   },
};

const roleColors: Record<string, string> = {
  investigator:       'text-purple-400',
  'sub-investigator': 'text-blue-400',
  coordinator:        'text-teal-400',
  pharmacist:         'text-amber-400',
  nurse:              'text-pink-400',
};

function GCPTrainingTab({ searchQuery }: { searchQuery: string }) {
    const { deadClick } = useDeadClick();
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-soon' | 'not-started'>('all');
  const { isCollapsed, setCollapsed } = useCollapsedSections('gcp-training');

  const filtered = useMemo(() => {
    let list = mockAllTraining;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.personName.toLowerCase().includes(q) || r.training.toLowerCase().includes(q) || r.site.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    return list;
  }, [searchQuery, filterStatus]);

  const overallCompliance = Math.round((mockAllTraining.filter(t => t.status === 'completed').length / mockAllTraining.length) * 100);
  const overdueCount = mockAllTraining.filter(t => t.status === 'overdue').length;
  const dueSoonCount = mockAllTraining.filter(t => t.status === 'due-soon').length;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{overallCompliance}%</span>
            </div>
            <div className="text-sm text-text-secondary">Overall Compliance</div>
            <ProgressBar value={overallCompliance} color="green" size="sm" className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{overdueCount}</span>
            </div>
            <div className="text-sm text-text-secondary">Overdue</div>
            <div className="text-xs text-text-muted mt-1">Requires immediate attention</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-amber-400">{dueSoonCount}</span>
            </div>
            <div className="text-sm text-text-secondary">Due Within 14 Days</div>
            <div className="text-xs text-text-muted mt-1">Action recommended</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-text-primary">{mockAllTraining.length}</span>
            </div>
            <div className="text-sm text-text-secondary">Training Records</div>
            <div className="text-xs text-text-muted mt-1">Across {mockSites.length} sites</div>
          </CardContent>
        </Card>
      </div>

      {/* Site Compliance Overview */}
      <CollapsibleSection
        title="Compliance by Site"
        icon={<Building2 className="w-5 h-5 text-blue-400" />}
        defaultExpanded={!isCollapsed('site-compliance')}
        onToggle={(expanded) => setCollapsed('site-compliance', !expanded)}
        variant="card"
        size="sm"
      >
        <div className="space-y-3">
          {siteTrainingStatus.map(site => {
            const pct = Math.round((site.completed / site.totalRequired) * 100);
            return (
              <div key={site.siteId} className="flex items-center gap-4">
                <div className="w-52 shrink-0">
                  <div className="text-sm font-medium text-text-primary truncate">{site.siteName}</div>
                  <div className="text-xs text-text-muted">{site.completed}/{site.totalRequired} complete</div>
                </div>
                <div className="flex-1">
                  <ProgressBar value={pct} color={site.overdue > 0 ? 'red' : pct >= 95 ? 'green' : 'amber'} size="sm" />
                </div>
                <div className="w-12 text-right text-sm font-semibold text-text-primary">{pct}%</div>
                <div className="flex items-center gap-2">
                  {site.overdue > 0 && <Badge color="red" size="xs">{site.overdue} overdue</Badge>}
                  {site.dueSoon > 0 && <Badge color="amber" size="xs">{site.dueSoon} due soon</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Filters + Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-text-muted" />
              <span className="font-medium text-text-primary">Training Records</span>
              <Badge color="slate" size="xs">{filtered.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'overdue', 'due-soon', 'not-started'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterStatus === s
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-card text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'overdue' ? 'Overdue' : s === 'due-soon' ? 'Due Soon' : 'Pending'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No records match the selected filter</div>
            ) : filtered.map(record => (
              <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    record.status === 'completed' ? 'bg-green-500' :
                    record.status === 'overdue' ? 'bg-red-500' :
                    record.status === 'due-soon' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm">{record.personName}</span>
                      <span className={`text-xs font-medium ${roleColors[record.role] || 'text-text-muted'}`}>{record.role}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{record.training}</div>
                    <div className="text-xs text-text-muted">{record.site}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {record.completedDate ? (
                    <div className="text-right">
                      <div className="text-xs text-text-muted">Completed</div>
                      <div className="text-text-secondary">{record.completedDate}</div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs text-text-muted">Due</div>
                      <div className={record.status === 'overdue' ? 'text-red-400 font-medium' : 'text-text-secondary'}>{record.dueDate}</div>
                    </div>
                  )}
                  <Badge color={trainingStatusConfig[record.status]?.color ?? 'gray'} size="xs">{trainingStatusConfig[record.status]?.label ?? record.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Required Courses Reference */}
      <CollapsibleSection
        title="Required Training Courses"
        icon={<Award className="w-5 h-5 text-purple-400" />}
        defaultExpanded={false}
        onToggle={(expanded) => setCollapsed('courses', !expanded)}
        variant="card"
        size="sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trainingCourses.map(course => (
            <div key={course.id} className="p-3 bg-surface rounded-lg border border-border">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">{course.courseName}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {course.requiredRoles.join(', ')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge color={course.category === 'gcp-required' ? 'blue' : course.category === 'protocol-specific' ? 'purple' : course.category === 'regulatory' ? 'amber' : 'slate'} size="xs">
                    {course.category.replace('-', ' ')}
                  </Badge>
                  <span className="text-xs text-text-muted">{course.frequency}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// ESSENTIAL DOCUMENTS TAB
// ============================================================================

type DocSection = 'before-trial' | 'during-trial' | 'after-trial';
type DocStatus = 'on-file' | 'missing' | 'expired' | 'pending';

interface EssentialDoc {
  id: string;
  name: string;
  section: DocSection;
  required: boolean;
  siteStatuses: Record<string, DocStatus>;
  icfRef: string;
}

const essentialDocsList: EssentialDoc[] = [
  { id: 'ED-001', name: 'Investigator Brochure (current version)', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.1', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'on-file', 'SITE-006': 'on-file' } },
  { id: 'ED-002', name: 'Signed Protocol & All Amendments', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.2', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-003', name: 'Informed Consent Form(s) & Translations', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.3', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-004', name: 'IRB/IEC Approval — Protocol', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.4', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-005', name: 'IRB/IEC Membership List', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.5', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'missing', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-006', name: 'Regulatory Authority Authorization / Notification', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.7', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-007', name: 'Investigator CV & GCP Certificates', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.10', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'on-file', 'SITE-006': 'on-file' } },
  { id: 'ED-008', name: 'Normal Value(s)/Range(s) for Laboratory Tests', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.11', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'expired', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-009', name: 'Medical / Laboratory / Technical Procedures & Certifications', section: 'before-trial', required: true, icfRef: 'ICH E6 §8.2.12', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'missing' } },
  { id: 'ED-010', name: 'Monitoring Visit Reports (all)', section: 'during-trial', required: true, icfRef: 'ICH E6 §8.3.12', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-011', name: 'Relevant Communications — Letters, Meeting Notes', section: 'during-trial', required: true, icfRef: 'ICH E6 §8.3.14', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-012', name: 'IP Accountability Records', section: 'during-trial', required: true, icfRef: 'ICH E6 §8.3.2', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-013', name: 'Subject Screening & Enrollment Log', section: 'during-trial', required: true, icfRef: 'ICH E6 §8.3.20', siteStatuses: { 'SITE-001': 'on-file', 'SITE-002': 'on-file', 'SITE-003': 'on-file', 'SITE-004': 'on-file', 'SITE-005': 'pending', 'SITE-006': 'on-file' } },
  { id: 'ED-014', name: 'Close-Out Visit Report', section: 'after-trial', required: true, icfRef: 'ICH E6 §8.4.1', siteStatuses: { 'SITE-001': 'pending', 'SITE-002': 'pending', 'SITE-003': 'pending', 'SITE-004': 'pending', 'SITE-005': 'pending', 'SITE-006': 'pending' } },
];

const docStatusConfig: Record<DocStatus, { color: 'green' | 'red' | 'amber' | 'blue'; label: string }> = {
  'on-file':  { color: 'green', label: 'On File' },
  'missing':  { color: 'red',   label: 'Missing' },
  'expired':  { color: 'amber', label: 'Expired' },
  'pending':  { color: 'blue',  label: 'Pending' },
};

const sectionLabels: Record<DocSection, string> = {
  'before-trial': 'Before Trial Commencement',
  'during-trial': 'During Trial',
  'after-trial':  'After Completion / Termination',
};

function GCPDocumentsTab({ searchQuery }: { searchQuery: string }) {
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const { isCollapsed, setCollapsed } = useCollapsedSections('gcp-docs');

  const filtered = useMemo(() => {
    if (!searchQuery) return essentialDocsList;
    const q = searchQuery.toLowerCase();
    return essentialDocsList.filter(d => d.name.toLowerCase().includes(q) || d.icfRef.toLowerCase().includes(q));
  }, [searchQuery]);

  const siteIds = mockSites.map(s => s.id);
  const displaySites = selectedSite === 'all' ? siteIds : [selectedSite];

  const sections: DocSection[] = ['before-trial', 'during-trial', 'after-trial'];

  const getOverallStatus = (doc: EssentialDoc): 'ok' | 'warn' | 'error' => {
    const statuses = displaySites.map(sid => doc.siteStatuses[sid]);
    if (statuses.includes('missing')) return 'error';
    if (statuses.includes('expired')) return 'warn';
    if (statuses.some(s => s === 'pending')) return 'warn';
    return 'ok';
  };

  const totalDocs = essentialDocsList.length;
  const missingCount = essentialDocsList.filter(d => Object.values(d.siteStatuses).includes('missing')).length;
  const expiredCount = essentialDocsList.filter(d => Object.values(d.siteStatuses).includes('expired')).length;
  const completeCount = essentialDocsList.filter(d => !Object.values(d.siteStatuses).includes('missing') && !Object.values(d.siteStatuses).includes('expired')).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><FileText className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-text-primary">{totalDocs}</span></div><div className="text-sm text-text-secondary">Total Required</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{completeCount}</span></div><div className="text-sm text-text-secondary">Complete</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{expiredCount}</span></div><div className="text-sm text-text-secondary">Expired</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertOctagon className="w-5 h-5 text-red-400" /><span className="text-2xl font-bold text-red-400">{missingCount}</span></div><div className="text-sm text-text-secondary">Missing</div></CardContent></Card>
      </div>

      {/* Site Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-text-muted">View by site:</span>
        <button onClick={() => setSelectedSite('all')} className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedSite === 'all' ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>All Sites</button>
        {mockSites.map(s => (
          <button key={s.id} onClick={() => setSelectedSite(s.id)} className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedSite === s.id ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>{s.id}</button>
        ))}
      </div>

      {/* Documents by Section */}
      {sections.map(section => {
        const sectionDocs = filtered.filter(d => d.section === section);
        if (sectionDocs.length === 0) return null;
        return (
          <CollapsibleSection
            key={section}
            title={sectionLabels[section]}
            icon={<Archive className="w-5 h-5 text-text-muted" />}
            count={sectionDocs.length}
            defaultExpanded={!isCollapsed(section)}
            onToggle={(expanded) => setCollapsed(section, !expanded)}
            variant="card"
            size="sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium">Document</th>
                    <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium w-28">ICH Ref</th>
                    {displaySites.map(sid => {
                      const site = mockSites.find(s => s.id === sid);
                      return <th key={sid} className="text-center py-2 px-2 text-xs text-text-muted font-medium w-24">{sid}</th>;
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sectionDocs.map(doc => {
                    const overall = getOverallStatus(doc);
                    return (
                      <tr key={doc.id} className={`hover:bg-surface-card/30 ${overall === 'error' ? 'bg-red-500/5' : overall === 'warn' ? 'bg-amber-500/5' : ''}`}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {overall === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            {overall === 'warn' && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            {overall === 'ok' && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                            <span className="text-text-primary">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-text-muted font-mono">{doc.icfRef}</td>
                        {displaySites.map(sid => {
                          const status = doc.siteStatuses[sid] || 'pending';
                          const cfg = docStatusConfig[status];
                          return (
                            <td key={sid} className="py-3 px-2 text-center">
                              <Badge color={cfg.color} size="xs">{cfg.label}</Badge>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

// ============================================================================
// INSPECTIONS TAB
// ============================================================================

type InspectionStatus = 'scheduled' | 'in-progress' | 'complete' | 'finding-issued' | 'closed';
type FindingCategory = 'critical' | 'major' | 'minor' | 'observation';

interface Inspection {
  id: string;
  authority: string;
  type: 'routine' | 'for-cause' | 'pre-approval' | 'surveillance';
  scope: string;
  scheduledDate: string;
  completedDate?: string;
  status: InspectionStatus;
  lead: string;
  findings: { category: FindingCategory; count: number }[];
  readinessScore: number;
  notes?: string;
}

interface InspectionFinding {
  id: string;
  inspectionId: string;
  category: FindingCategory;
  description: string;
  responseDeadline: string;
  status: 'open' | 'response-submitted' | 'closed';
  capaRef?: string;
}

const mockInspections: Inspection[] = [
  {
    id: 'INS-001', authority: 'FDA', type: 'pre-approval', scope: 'Clinical Site — Massachusetts General Hospital (SITE-001)',
    scheduledDate: '2025-03-15', status: 'scheduled', lead: 'Regulatory Affairs', readinessScore: 84,
    findings: [],
    notes: 'Pre-approval inspection in preparation for NDA submission. All essential documents must be complete.',
  },
  {
    id: 'INS-002', authority: 'EMA', type: 'routine', scope: 'Sponsor Audit — Data Management & Safety Reporting Systems',
    scheduledDate: '2025-02-10', status: 'scheduled', lead: 'Clinical Operations', readinessScore: 91,
    findings: [],
  },
  {
    id: 'INS-003', authority: 'MHRA', type: 'for-cause', scope: 'Clinical Site — Royal Marsden Hospital (SITE-004)',
    scheduledDate: '2025-01-20', completedDate: '2025-01-22', status: 'finding-issued', lead: 'QA Director',
    readinessScore: 78,
    findings: [{ category: 'major', count: 1 }, { category: 'minor', count: 2 }],
    notes: 'Triggered by SAE reporting discrepancy. Response required by 2025-02-20.',
  },
  {
    id: 'INS-004', authority: 'PMDA', type: 'surveillance', scope: 'Clinical Site — Tokyo University Hospital (SITE-005)',
    scheduledDate: '2024-11-05', completedDate: '2024-11-06', status: 'closed', lead: 'Regional Monitor',
    readinessScore: 96,
    findings: [{ category: 'minor', count: 1 }],
  },
];

const mockFindings: InspectionFinding[] = [
  { id: 'FND-001', inspectionId: 'INS-003', category: 'major', description: 'Protocol deviation PD-002 (SAE reporting delay) not reported to MHRA within regulatory timeline', responseDeadline: '2025-02-20', status: 'open', capaRef: 'CAPA-2025-011' },
  { id: 'FND-002', inspectionId: 'INS-003', category: 'minor', description: 'Monitoring visit log incomplete — 2 entries missing visit duration', responseDeadline: '2025-02-20', status: 'response-submitted' },
  { id: 'FND-003', inspectionId: 'INS-003', category: 'minor', description: 'Normal lab ranges document version in use predates current accreditation', responseDeadline: '2025-02-20', status: 'open' },
  { id: 'FND-004', inspectionId: 'INS-004', category: 'minor', description: 'Subject identification codes not consistently applied across two EDC entries', responseDeadline: '2024-12-06', status: 'closed' },
];

const inspectionStatusConfig: Record<InspectionStatus, { color: 'blue' | 'amber' | 'green' | 'red' | 'purple'; label: string }> = {
  'scheduled':       { color: 'blue',   label: 'Scheduled' },
  'in-progress':     { color: 'amber',  label: 'In Progress' },
  'complete':        { color: 'green',  label: 'Complete' },
  'finding-issued':  { color: 'red',    label: 'Finding Issued' },
  'closed':          { color: 'purple', label: 'Closed' },
};

const findingCategoryColors: Record<FindingCategory, 'red' | 'amber' | 'blue' | 'slate'> = {
  critical: 'red', major: 'amber', minor: 'blue', observation: 'slate',
};

const authorityBadgeColors: Record<string, string> = {
  FDA: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  EMA: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  MHRA: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  PMDA: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function ReadinessBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : score >= 75 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-text-primary w-8 text-right">{score}%</span>
    </div>
  );
}

function GCPInspectionsTab() {
  const [selectedInspection, setSelectedInspection] = useState<string | null>('INS-003');
  const { isCollapsed, setCollapsed } = useCollapsedSections('gcp-inspections');

  const selected = mockInspections.find(i => i.id === selectedInspection);
  const selectedFindings = mockFindings.filter(f => f.inspectionId === selectedInspection);

  const openFindings = mockFindings.filter(f => f.status === 'open').length;
  const upcoming = mockInspections.filter(i => i.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><ClipboardCheck className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-text-primary">{mockInspections.length}</span></div><div className="text-sm text-text-secondary">Total Inspections</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Calendar className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{upcoming}</span></div><div className="text-sm text-text-secondary">Upcoming</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-2xl font-bold text-red-400">{openFindings}</span></div><div className="text-sm text-text-secondary">Open Findings</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Target className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">84%</span></div><div className="text-sm text-text-secondary">Avg Readiness</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Inspection List */}
        <div className="lg:col-span-2 space-y-3">
          {mockInspections.map(ins => {
            const statusCfg = inspectionStatusConfig[ins.status];
            const totalFindings = ins.findings.reduce((acc, f) => acc + f.count, 0);
            return (
              <div
                key={ins.id}
                onClick={() => setSelectedInspection(ins.id === selectedInspection ? null : ins.id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                  selectedInspection === ins.id
                    ? 'bg-accent-blue/10 border-accent-blue/40'
                    : 'bg-surface-card border-border hover:bg-surface-card/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${authorityBadgeColors[ins.authority] || 'bg-surface text-text-muted border-border'}`}>
                      {ins.authority}
                    </span>
                    <Badge color={statusCfg.color} size="xs">{statusCfg.label}</Badge>
                  </div>
                  <span className="text-xs text-text-muted">{ins.scheduledDate}</span>
                </div>
                <div className="text-sm font-medium text-text-primary mb-1">{ins.scope}</div>
                <div className="text-xs text-text-muted capitalize mb-2">{ins.type.replace('-', ' ')} • {ins.lead}</div>
                <ReadinessBar score={ins.readinessScore} />
                {totalFindings > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {ins.findings.map(f => (
                      <Badge key={f.category} color={findingCategoryColors[f.category]} size="xs">{f.count} {f.category}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${authorityBadgeColors[selected.authority] || ''}`}>{selected.authority}</span>
                    <Badge color={inspectionStatusConfig[selected.status]?.color} size="xs">{inspectionStatusConfig[selected.status]?.label}</Badge>
                    <span className="text-sm text-text-muted capitalize">{selected.type.replace('-', ' ')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Scope</div>
                  <div className="text-sm text-text-primary">{selected.scope}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs text-text-muted mb-0.5">Scheduled</div><div className="text-text-primary">{selected.scheduledDate}</div></div>
                  {selected.completedDate && <div><div className="text-xs text-text-muted mb-0.5">Completed</div><div className="text-text-primary">{selected.completedDate}</div></div>}
                  <div><div className="text-xs text-text-muted mb-0.5">Lead</div><div className="text-text-primary">{selected.lead}</div></div>
                  <div><div className="text-xs text-text-muted mb-0.5">Inspection ID</div><div className="text-text-muted font-mono">{selected.id}</div></div>
                </div>

                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Inspection Readiness</div>
                  <ReadinessBar score={selected.readinessScore} />
                  <div className="text-xs text-text-muted mt-1">
                    {selected.readinessScore >= 90 ? '✓ Ready for inspection' : selected.readinessScore >= 75 ? '⚠ Some items require attention' : '✗ Significant preparation needed'}
                  </div>
                </div>

                {selected.notes && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                    {selected.notes}
                  </div>
                )}

                {selectedFindings.length > 0 && (
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wide mb-3">Findings ({selectedFindings.length})</div>
                    <div className="space-y-3">
                      {selectedFindings.map(finding => (
                        <div key={finding.id} className={`p-3 rounded-lg border ${finding.category === 'critical' || finding.category === 'major' ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-card border-border'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge color={findingCategoryColors[finding.category]} size="xs">{finding.category}</Badge>
                              <Badge color={finding.status === 'closed' ? 'green' : finding.status === 'response-submitted' ? 'blue' : 'amber'} size="xs">{finding.status.replace('-', ' ')}</Badge>
                            </div>
                            {finding.capaRef && <span className="text-xs text-purple-400 font-mono">{finding.capaRef}</span>}
                          </div>
                          <div className="text-sm text-text-secondary">{finding.description}</div>
                          {finding.status !== 'closed' && (
                            <div className="text-xs text-text-muted mt-2">Response deadline: <span className="text-amber-400">{finding.responseDeadline}</span></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFindings.length === 0 && selected.status === 'scheduled' && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="text-sm font-medium text-blue-300 mb-1">Pre-Inspection Checklist</div>
                    <div className="space-y-1.5 text-xs text-text-muted">
                      {['Essential documents complete at all sites', 'All deviations closed or under documented CAPA', 'Investigator training current', 'IP accountability reconciled', 'Protocol compliance confirmed'].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className={`w-3.5 h-3.5 ${i < 3 ? 'text-green-400' : 'text-amber-400'}`} />
                          <span className={i < 3 ? 'text-text-secondary line-through' : 'text-text-secondary'}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">Select an inspection to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GCPScreen() {
  const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<GCPTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { isCollapsed, setCollapsed } = useCollapsedSections('gcp');
  
  const tabs: { id: GCPTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'sites', label: 'Sites', icon: <Building2 className="w-4 h-4" /> },
    { id: 'deviations', label: 'Deviations', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'training', label: 'Training', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'documents', label: 'Essential Docs', icon: <FileText className="w-4 h-4" /> },
    { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  const filteredSites = useMemo(() => {
    if (!searchQuery) return mockSites;
    const q = searchQuery.toLowerCase();
    return mockSites.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.investigator.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);
  
  const filteredDeviations = useMemo(() => {
    if (!searchQuery) return mockDeviations;
    const q = searchQuery.toLowerCase();
    return mockDeviations.filter(d => 
      d.description.toLowerCase().includes(q) || 
      d.siteName.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-surface">
      <ScreenHeader
        moduleId="gcp"
        title="GCP Compliance"
        subtitle="ICH E6(R2) Good Clinical Practice — deviation tracking, audit management, and inspection readiness"
        icon={<Shield className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-64" />
            <CapabilityGate moduleId="gcp" capability="author" inline>
              <Button variant="primary" size="sm" onClick={deadClick}>
                <Plus className="w-4 h-4 mr-1" />
                Report Deviation
              </Button>
            </CapabilityGate>
          </div>
        }
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface-card text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Compliance Score + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card className="lg:row-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">GCP Compliance</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-4">
                  <ComplianceGauge score={metrics.overallCompliance} />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full text-center">
                    <div>
                      <div className="text-lg font-bold text-green-400">{metrics.activeSites}</div>
                      <div className="text-xs text-text-muted">Active Sites</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">{metrics.totalEnrolled}</div>
                      <div className="text-xs text-text-muted">Enrolled</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <MetricCard
                title="Protocol Deviations"
                value={metrics.openDeviations}
                subtitle={`${metrics.criticalDeviations} critical, ${metrics.majorDeviations} major`}
                icon={<AlertTriangle className="w-5 h-5" />}
                color={metrics.criticalDeviations > 0 ? 'red' : 'amber'}
              />
              
              <MetricCard
                title="Overdue Visits"
                value={metrics.overdueVisits}
                subtitle="Monitoring visits past due"
                icon={<Calendar className="w-5 h-5" />}
                color={metrics.overdueVisits > 0 ? 'red' : 'green'}
              />
              
              <MetricCard
                title="Training Compliance"
                value={`${metrics.trainingCompliance}%`}
                subtitle={`${metrics.overdueTraining} overdue`}
                icon={<GraduationCap className="w-5 h-5" />}
                color={metrics.trainingCompliance >= 95 ? 'green' : 'amber'}
              />
              
              <MetricCard
                title="Upcoming Inspections"
                value={metrics.upcomingInspections}
                subtitle="Next 90 days"
                icon={<ClipboardCheck className="w-5 h-5" />}
                color="purple"
              />
            </div>
            
            {/* High Risk Sites */}
            <CollapsibleSection
              title="High Risk Sites"
              icon={<AlertOctagon className="w-5 h-5 text-red-400" />}
              count={mockSites.filter(s => s.riskLevel === 'high').length}
              defaultExpanded={!isCollapsed('high-risk-sites')}
              onToggle={(expanded) => setCollapsed('high-risk-sites', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="space-y-3">
                {mockSites.filter(s => s.riskLevel === 'high').length === 0 ? (
                  <EmptyState type="no-data" size="sm" title="No high risk sites" description="All sites within acceptable risk levels" />
                ) : mockSites.filter(s => s.riskLevel === 'high').map(site => (
                  <SiteRow key={site.id} site={site} />
                ))}
              </div>
            </CollapsibleSection>
            
            {/* Recent Deviations */}
            <CollapsibleSection
              title="Recent Protocol Deviations"
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              count={mockDeviations.filter(d => d.status !== 'closed').length}
              defaultExpanded={!isCollapsed('recent-deviations')}
              onToggle={(expanded) => setCollapsed('recent-deviations', !expanded)}
              variant="card"
              size="sm"
              headerActions={
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('deviations')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              }
            >
              <div className="space-y-3">
                {mockDeviations.filter(d => d.status !== 'closed').slice(0, 4).map(deviation => (
                  <DeviationRow key={deviation.id} deviation={deviation} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}
        
        {activeTab === 'sites' && (
          <div className="space-y-4">
            {filteredSites.length === 0 ? (
              <EmptyState type="no-results" title="No sites found" description="No sites match your search" />
            ) : filteredSites.map(site => (
              <SiteRow key={site.id} site={site} />
            ))}
          </div>
        )}
        
        {activeTab === 'deviations' && (
          <div className="space-y-4">
            {filteredDeviations.length === 0 ? (
              <EmptyState type="no-results" title="No deviations found" description="No deviations match your search" />
            ) : filteredDeviations.map(deviation => (
              <DeviationRow key={deviation.id} deviation={deviation} />
            ))}
          </div>
        )}
        
        {activeTab === 'training' && (
          <GCPTrainingTab searchQuery={searchQuery} />
        )}

        {activeTab === 'documents' && (
          <GCPDocumentsTab searchQuery={searchQuery} />
        )}

        {activeTab === 'inspections' && (
          <GCPInspectionsTab />
        )}
      </div>
    </div>
  );
}

export default GCPScreen;
