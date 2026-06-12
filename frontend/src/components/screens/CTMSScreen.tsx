

import { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Users,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Building2,
  ChevronRight,
  Search,
  Plus,
  RefreshCw,
  Globe,
  Stethoscope,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Edit,
  MoreHorizontal,
  FlaskConical,
  Mail,
  Phone,
  ExternalLink,
  ClipboardCheck,
  Timer,
  UserCheck,
  // v182: Study Design Panel icons
  Target,
  GitBranch,
  Beaker,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Shield,
  Info,
  // v185: Protocol Deviation + Monitoring icons
  AlertOctagon,
  FileWarning,
  CheckSquare,
  ListChecks,
  Clipboard,
  PenLine,
  CircleAlert,
  CircleCheck,
  CircleX,
  FileSearch,
  ClipboardX,
  CalendarCheck,
  CalendarClock,
  UserCircle,
  FilePenLine,
  BarChart2,
  PieChart,
  Megaphone,
  // v0.6.1: Database Lock Center icons
  Database,
  Package,
  Workflow,
  Link2,
  Zap,
  Clock,
  Sparkles,
  MessageSquare,
  // v0.37.0: Study Startup Orchestrator icon
  Brain,
  X,
} from 'lucide-react';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
// v0.6.1: Database Lock Cascade imports
import {
  illuminateDBLockCascade, dbLockCategoryMeta, getDBLockCascadeProgress, getDBLockCriticalActions,
  DBLockCascadeAction, DBLockCascadeCategory, DBLockCascade, DBLockStageSummary,
} from '@/data/db-lock-cascade-data';
import type { 
  CTMSStudy, 
  CTMSStudyStatus, 
  ClinicalSite, 
  SiteStatus,
  StudyPhase,
  EnrollmentTracking,
  // v182: Study Design types
  StudyDesign,
  StudyArm,
  StudyEndpoint,
  ArmType,
  BlindingType,
  RandomizationType,
  EndpointType,
  EndpointCategory,
  // v185: Protocol Deviation + Monitoring types
  ProtocolDeviation,
  DeviationCategory,
  DeviationSeverity,
  DeviationStatus,
  MonitoringVisit,
  MonitoringVisitType,
  MonitoringVisitStatus,
  MonitoringFinding,
  FollowUpItem,
} from '@/domains/ctms/contracts';
// v95: UI Component Library imports
// v176: Added ReturnBreadcrumb for cross-module navigation
import { StatCard as UIStatCard } from '@/components/ui/Card';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { StatCardGridSkeleton, TableSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { CTMSScreenSkeleton } from '@/components/ui/ModuleContainer';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
// v0.27.4: Drillable stats for demo polish
import { DrillableStatCard, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { CompactStatBar, toCompactStat } from '@/components/ui/CompactStatBar';
import { useToast } from '@/components/ui/Toast';
// v0.43.8: ScrollableTabs for responsive tab bars
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
// v155: AddSiteModal for dead-end button
import { AddSiteModal } from './CreateModals';
import { SubmissionReadinessDashboard } from './SubmissionReadinessDashboard';
// v185: Protocol Deviation + Monitoring Dashboards
import { ProtocolDeviationDashboard, MonitoringDashboard } from './CTMSDeviationMonitoring';
// v0.14.7: Document Lineage Provenance
import { CTMSProtocolProvenance, StudyDocumentsSummary } from '@/components/clinical/ClinicalProvenanceIndicators';
// v0.37.0: Study Startup Orchestrator
import { StudyStartupOrchestratorScreen } from './StudyStartupOrchestratorScreen';
// v0.37.2: Country/Site Drill-Down
import { CountrySiteDrilldown } from '@/components/clinical/CountrySiteDrilldown';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useAppStore } from '@/store/useAppStore';

// v182: Added 'design' tab for Study Design Panel
// v185: Added 'deviations' tab for Protocol Deviation Management
// v0.6.1: Added 'db-lock' tab for Database Lock Center
// v0.37.0: Added 'startup' tab for Study Startup Orchestrator
type CTMSTab = 'studies' | 'startup' | 'design' | 'sites' | 'enrollment' | 'deviations' | 'monitoring' | 'db-lock' | 'readiness';

// v95: Color mappings for Badge components
const studyStatusColorMap: Record<CTMSStudyStatus, 'gray' | 'blue' | 'green' | 'teal' | 'purple' | 'amber' | 'red'> = {
  'planning': 'gray',
  'startup': 'blue',
  'enrolling': 'green',
  'enrollment-complete': 'teal',
  'active-follow-up': 'purple',
  'completing': 'amber',
  'completed': 'green',
  'on-hold': 'red',
  'terminated': 'red',
};

const siteStatusColorMap: Record<SiteStatus, 'gray' | 'blue' | 'purple' | 'amber' | 'teal' | 'green' | 'red'> = {
  'identified': 'gray',
  'qualified': 'blue',
  'selected': 'purple',
  'in-startup': 'amber',
  'activated': 'teal',
  'enrolling': 'green',
  'active-not-enrolling': 'purple',
  'in-closeout': 'amber',
  'closed': 'gray',
  'terminated': 'red',
};

const riskColorMap: Record<string, 'green' | 'amber' | 'red'> = {
  'low': 'green',
  'medium': 'amber',
  'high': 'red',
  'critical': 'red',
};

// v185: Deviation color maps
const deviationCategoryColorMap: Record<DeviationCategory, 'blue' | 'amber' | 'red' | 'purple' | 'teal' | 'gray'> = {
  'eligibility': 'red',
  'informed-consent': 'red',
  'study-procedures': 'amber',
  'safety-reporting': 'red',
  'ip-management': 'purple',
  'visit-schedule': 'blue',
  'prohibited-medication': 'amber',
  'data-collection': 'teal',
  'other': 'gray',
};

const deviationSeverityColorMap: Record<DeviationSeverity, 'gray' | 'amber' | 'red'> = {
  'minor': 'gray',
  'major': 'amber',
  'critical': 'red',
};

const deviationStatusColorMap: Record<DeviationStatus, 'blue' | 'amber' | 'purple' | 'green' | 'gray'> = {
  'identified': 'blue',
  'under-review': 'amber',
  'confirmed': 'purple',
  'resolved': 'green',
  'closed': 'gray',
};

const monitoringVisitTypeColorMap: Record<MonitoringVisitType, 'gray' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'red'> = {
  'site-selection': 'gray',
  'site-initiation': 'blue',
  'routine': 'green',
  'interim': 'purple',
  'for-cause': 'red',
  'closeout': 'amber',
  'remote': 'teal',
};

const monitoringVisitStatusColorMap: Record<MonitoringVisitStatus, 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple'> = {
  'planned': 'gray',
  'scheduled': 'blue',
  'in-progress': 'amber',
  'completed': 'green',
  'cancelled': 'red',
  'report-pending': 'purple',
};

const phaseColorMap: Record<StudyPhase, 'blue' | 'purple' | 'teal' | 'green' | 'gray'> = {
  'Phase 1': 'blue',
  'Phase 1/2': 'blue',
  'Phase 2': 'purple',
  'Phase 2/3': 'purple',
  'Phase 3': 'teal',
  'Phase 4': 'green',
  'Observational': 'gray',
};

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface CTMSScreenProps {
  filters: FilterState;
}

export function CTMSScreen({ filters }: CTMSScreenProps) {
  // v0.125.33: Scope context
  const { studyProtocolNumber, scopeSummary, scopeFlag } = useScopeContext('ctms');
    const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<CTMSTab>('studies');
  // v0.44.46: Cascade engine — fire DB lock chain once on first visit to db-lock tab
  const fireTrigger = useCascadeEngine(s => s.fireTrigger);
  // v0.44.50: Also need skipStep for cascade strip dismiss
  const skipCascadeStep = useCascadeEngine(s => s.skipStep);
  const cascadeChains = useCascadeEngine(s => s.chains);
  const [dbLockFired, setDbLockFired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
  // v155: Modal state for Add Site
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showNewStudyModal, setShowNewStudyModal] = useState(false);
  const [newStudyForm, setNewStudyForm] = useState({ title: '', protocolNumber: '', phase: 'Phase 2', indication: '', sponsor: 'Ligature Therapeutics', targetEnrollment: '100' });
  const toast = useToast();
  
  // v127: Loading state for perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  // Use stable selectors - access the record directly, not Object.values()
  const studiesRecord = useCTMSStore(s => s.studies);
  const sitesRecord = useCTMSStore(s => s.sites);
  const sitesByStudy = useCTMSStore(s => s.sitesByStudy);
  const enrollmentTrackingRecord = useCTMSStore(s => s.enrollmentTracking);
  const loadMockData = useCTMSStore(s => s.loadMockData);
  const createStudy = useCTMSStore(s => s.createStudy);
  const addSite = useCTMSStore(s => s.addSite);
  // v182: Study Design selectors
  const studyDesignsRecord = useCTMSStore(s => s.studyDesigns);
  const studyArmsRecord = useCTMSStore(s => s.studyArms);
  const studyEndpointsRecord = useCTMSStore(s => s.studyEndpoints);
  // v185: Protocol Deviation + Monitoring selectors
  const protocolDeviationsRecord = useCTMSStore(s => s.protocolDeviations);
  const deviationsByStudyRecord = useCTMSStore(s => s.deviationsByStudy);
  const monitoringVisitsRecord = useCTMSStore(s => s.monitoringVisits);
  const monitoringBySiteRecord = useCTMSStore(s => s.monitoringBySite);
  const reportDeviation = useCTMSStore(s => s.reportDeviation);
  const updateDeviation = useCTMSStore(s => s.updateDeviation);
  const closeDeviation = useCTMSStore(s => s.closeDeviation);
  const scheduleMonitoringVisit = useCTMSStore(s => s.scheduleMonitoringVisit);
  const updateMonitoringVisit = useCTMSStore(s => s.updateMonitoringVisit);
  const completeMonitoringVisit = useCTMSStore(s => s.completeMonitoringVisit);

  // Convert to arrays in render (not in selector)
  const studies = useMemo(() => Object.values(studiesRecord), [studiesRecord]);
  const sites = useMemo(() => Object.values(sitesRecord), [sitesRecord]);

  // v0.44.50: Auto-select most urgent study once data loads — eliminates empty right panel
  // NOTE: Must be AFTER const studies definition to avoid TDZ
  useEffect(() => {
    if (isLoading || selectedStudyId || studies.length === 0) return;
    const priority =
      studies.find(s => s.riskScore === 'critical') ??
      studies.find(s => s.riskScore === 'high') ??
      studies.find(s => s.status === 'enrolling') ??
      studies[0];
    if (priority) setSelectedStudyId(priority.id);
  }, [isLoading, studies]);

  // v0.125.33: Scope-driven study selection — override auto-select when scope changes
  useEffect(() => {
    if (!studyProtocolNumber || studies.length === 0) return;
    const match = studies.find(s => s.protocolNumber === studyProtocolNumber);
    if (match) setSelectedStudyId(match.id);
  }, [studyProtocolNumber, studies.length]);
  const selectedStudy = selectedStudyId ? studiesRecord[selectedStudyId] : null;
  const selectedSite = selectedSiteId ? sitesRecord[selectedSiteId] : null;

  // Get sites for selected study
  const studySites = useMemo(() => {
    if (!selectedStudyId) return [];
    const siteIds = sitesByStudy[selectedStudyId] || [];
    return siteIds.map(id => sitesRecord[id]).filter(Boolean);
  }, [selectedStudyId, sitesByStudy, sitesRecord]);

  const selectedEnrollment = selectedStudyId ? enrollmentTrackingRecord[selectedStudyId] : null;

  const handleLoadData = () => {
    if (studies.length === 0) {
      loadMockData();
    }
  };

  // v185: Count deviations and monitoring visits
  const allDeviations = useMemo(() => Object.values(protocolDeviationsRecord), [protocolDeviationsRecord]);
  const openDeviations = useMemo(() => allDeviations.filter(d => d.status !== 'closed' && d.status !== 'resolved'), [allDeviations]);
  const allMonitoringVisits = useMemo(() => Object.values(monitoringVisitsRecord), [monitoringVisitsRecord]);
  const upcomingMonitoringVisits = useMemo(() => allMonitoringVisits.filter(v => v.status === 'planned' || v.status === 'scheduled'), [allMonitoringVisits]);

  const tabs: { id: CTMSTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'studies', label: 'Studies', icon: <FlaskConical className="w-4 h-4" />, count: studies.length },
    // v0.37.0: Study Startup Orchestrator tab
    { id: 'startup', label: 'Study Start-Up', icon: <Brain className="w-4 h-4" />, count: studies.filter(s => s.status === 'startup' || s.status === 'planning').length },
    // v182: Study Design tab
    { id: 'design', label: 'Study Design', icon: <GitBranch className="w-4 h-4" />, count: Object.keys(studyDesignsRecord).length },
    { id: 'sites', label: 'Sites', icon: <Building2 className="w-4 h-4" />, count: sites.length },
    { id: 'enrollment', label: 'Enrollment', icon: <TrendingUp className="w-4 h-4" />, count: studies.filter(s => s.status === 'enrolling').length },
    // v185: Protocol Deviations tab
    { id: 'deviations', label: 'Deviations', icon: <AlertOctagon className="w-4 h-4" />, count: openDeviations.length },
    { id: 'monitoring', label: 'Monitoring', icon: <ClipboardCheck className="w-4 h-4" />, count: upcomingMonitoringVisits.length },
    // v0.6.1: Database Lock Center tab
    { id: 'db-lock', label: 'DB Lock Center', icon: <Database className="w-4 h-4" />, count: 1 },
    { id: 'readiness', label: 'Submission Readiness', icon: <Timer className="w-4 h-4" />, count: 1 },
  ];

  // v96: Badge helper functions using UI component library
  const studyStatusLabels: Record<CTMSStudyStatus, string> = {
    'planning': 'Planning',
    'startup': 'Startup',
    'enrolling': 'Enrolling',
    'enrollment-complete': 'Enrollment Complete',
    'active-follow-up': 'Active Follow-up',
    'completing': 'Completing',
    'completed': 'Completed',
    'on-hold': 'On Hold',
    'terminated': 'Terminated',
  };

  const getStudyStatusBadge = (status: CTMSStudyStatus) => {
    return <Badge color={studyStatusColorMap[status]} size="sm">{studyStatusLabels[status]}</Badge>;
  };

  const getSiteStatusBadge = (status: SiteStatus) => {
    return <Badge color={siteStatusColorMap[status]} size="sm">{status.replace(/-/g, ' ')}</Badge>;
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high' | 'critical') => {
    return <Badge color={riskColorMap[risk]} size="sm">{risk.charAt(0).toUpperCase() + risk.slice(1)} Risk</Badge>;
  };

  const getPhaseBadge = (phase: StudyPhase) => {
    return <Badge color={phaseColorMap[phase]} size="sm">{phase}</Badge>;
  };

  const stats = useMemo(() => {
    const totalEnrolled = studies.reduce((sum, s) => sum + s.enrolledSubjects, 0);
    const totalTarget = studies.reduce((sum, s) => sum + s.targetEnrollment, 0);
    const enrollingStudies = studies.filter(s => s.status === 'enrolling').length;
    const activeSites = sites.filter(s => ['activated', 'enrolling', 'active-not-enrolling'].includes(s.status)).length;
    const highRiskStudies = studies.filter(s => s.riskScore === 'high' || s.riskScore === 'critical').length;
    return {
      totalStudies: studies.length,
      enrollingStudies,
      totalSites: sites.length,
      activeSites,
      totalEnrolled,
      totalTarget,
      enrollmentPercent: totalTarget > 0 ? Math.round((totalEnrolled / totalTarget) * 100) : 0,
      highRiskStudies,
    };
  }, [studies, sites]);

  // v0.27.4: Drillable stats with real data behind each metric
  const ctmsDrillableStats = useMemo(() => {
    const enrollingStudiesList = studies.filter(s => s.status === 'enrolling');
    const activeSitesList = sites.filter(s => ['activated', 'enrolling', 'active-not-enrolling'].includes(s.status));
    const highRiskStudiesList = studies.filter(s => s.riskScore === 'high' || s.riskScore === 'critical');
    const countrySet = new Set(studies.flatMap(s => s.countries));

    return [
      {
        id: 'active-studies',
        value: stats.enrollingStudies,
        label: 'Active Studies',
        accentColor: 'green' as const,
        icon: <FlaskConical className="w-5 h-5" />,
        subValue: `of ${stats.totalStudies}`,
        drilldown: {
          title: 'Actively Enrolling Studies',
          subtitle: `${enrollingStudiesList.length} studies currently enrolling`,
          items: enrollingStudiesList.map(s => ({
            id: s.id,
            protocol: s.protocolNumber,
            title: s.shortTitle || s.title,
            phase: s.phase,
            enrolled: s.enrolledSubjects,
            target: s.targetEnrollment,
            progress: s.targetEnrollment > 0 ? Math.round((s.enrolledSubjects / s.targetEnrollment) * 100) : 0,
          })),
          columns: [
            { key: 'protocol', label: 'Protocol', width: 100, render: (v: string) => <span className="font-mono text-xs text-emerald-400">{v}</span> },
            { key: 'title', label: 'Study', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'phase', label: 'Phase', width: 70, render: (v: string) => <Badge color="purple" size="xs">{v}</Badge> },
            { key: 'progress', label: 'Enrolled', width: 80, render: (v: number) => <Badge color={v >= 75 ? 'green' : v >= 50 ? 'amber' : 'gray'} size="xs">{v}%</Badge> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('studies'); },
          searchable: true,
        } as DrilldownConfig,
      },
      {
        id: 'active-sites',
        value: stats.activeSites,
        label: 'Active Sites',
        accentColor: 'blue' as const,
        icon: <Building2 className="w-5 h-5" />,
        subValue: `of ${stats.totalSites}`,
        drilldown: {
          title: 'Active Clinical Sites',
          subtitle: `${activeSitesList.length} sites currently active`,
          items: activeSitesList.map(s => ({
            id: s.id,
            siteNumber: s.siteNumber,
            name: s.name,
            status: s.status,
            country: s.address.country,
            enrolled: s.enrolledSubjects || 0,
          })),
          columns: [
            { key: 'siteNumber', label: 'Site #', width: 70, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'name', label: 'Site Name', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'country', label: 'Country', width: 80, render: (v: string) => <span className="text-text-muted">{v}</span> },
            { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={v === 'enrolling' ? 'green' : 'blue'} size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => { setSelectedSiteId(item.id); setActiveTab('sites'); },
          searchable: true,
        } as DrilldownConfig,
      },
      {
        id: 'enrolled',
        value: stats.totalEnrolled,
        label: 'Total Enrolled',
        accentColor: 'teal' as const,
        icon: <Users className="w-5 h-5" />,
        subValue: `of ${stats.totalTarget}`,
        drilldown: {
          title: 'Enrollment by Study',
          subtitle: `${stats.enrollmentPercent}% overall enrollment`,
          items: studies.filter(s => s.targetEnrollment > 0).map(s => ({
            id: s.id,
            protocol: s.protocolNumber,
            enrolled: s.enrolledSubjects,
            target: s.targetEnrollment,
            percent: Math.round((s.enrolledSubjects / s.targetEnrollment) * 100),
          })),
          columns: [
            { key: 'protocol', label: 'Protocol', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'enrolled', label: 'Enrolled', width: 70, render: (v: number) => <span className="font-semibold">{v}</span> },
            { key: 'target', label: 'Target', width: 60, render: (v: number) => <span className="text-text-muted">{v}</span> },
            { key: 'percent', label: 'Progress', width: 80, render: (v: number) => <Badge color={v >= 100 ? 'green' : v >= 75 ? 'teal' : v >= 50 ? 'amber' : 'gray'} size="xs">{v}%</Badge> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('enrollment'); },
        } as DrilldownConfig,
      },
      {
        id: 'high-risk',
        value: stats.highRiskStudies,
        label: 'High Risk',
        accentColor: stats.highRiskStudies > 0 ? 'red' as const : 'gray' as const,
        icon: <AlertTriangle className="w-5 h-5" />,
        className: stats.highRiskStudies > 0 ? 'ring-1 ring-red-500' : '',
        drilldown: {
          title: 'High Risk Studies',
          subtitle: 'Studies requiring immediate attention',
          items: highRiskStudiesList.map(s => ({
            id: s.id,
            protocol: s.protocolNumber,
            title: s.shortTitle || s.title,
            risk: s.riskScore,
            status: s.status,
          })),
          columns: [
            { key: 'protocol', label: 'Protocol', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'title', label: 'Study', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'risk', label: 'Risk', width: 70, render: (v: string) => <Badge color={v === 'critical' ? 'red' : 'amber'} size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('studies'); },
        } as DrilldownConfig,
      },
      {
        id: 'countries',
        value: countrySet.size,
        label: 'Countries',
        accentColor: 'purple' as const,
        icon: <Globe className="w-5 h-5" />,
        drilldown: {
          title: 'Countries with Active Sites',
          subtitle: `${countrySet.size} countries across studies`,
          items: Array.from(countrySet).map((country, idx) => {
            const countrySites = sites.filter(s => s.address.country === country);
            return {
              id: `country-${idx}`,
              country,
              sites: countrySites.length,
              subjects: countrySites.reduce((sum, s) => sum + (s.enrolledSubjects || 0), 0),
            };
          }),
          columns: [
            { key: 'country', label: 'Country', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'sites', label: 'Sites', width: 60, render: (v: number) => <Badge color="blue" size="xs">{v}</Badge> },
            { key: 'subjects', label: 'Subjects', width: 70, render: (v: number) => <span className="text-text-muted">{v}</span> },
          ],
          onItemClick: () => setActiveTab('sites'),
        } as DrilldownConfig,
      },
    ];
  }, [studies, sites, stats]);

  const filteredStudies = useMemo(() => {
    return studies.filter(study =>
      study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.protocolNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.shortTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [studies, searchQuery]);

  const filteredSites = useMemo(() => {
    const sitesToFilter = activeTab === 'sites' ? sites : studySites;
    return sitesToFilter.filter(site =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.siteNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sites, studySites, searchQuery, activeTab]);

  // v139: Show skeleton during initial load
  if (isLoading) {
    return <CTMSScreenSkeleton />;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner */}
      <ScreenHeader
        moduleId="ctms"
          showAssetContext
        title="Clinical Trial Management"
        subtitle="Study oversight, site performance, enrollment tracking, and monitoring"
        icon={<FlaskConical className="w-5 h-5" />}
      />
      {/* v0.125.33: Scope context banner */}
      <ScopeContextBanner label="Study" scopeFlag={scopeFlag} scopeSummary={scopeSummary} />
      {/* Header — v0.44.50: compact */}
      <div className="bg-surface-elevated border-b border-border px-6 py-4">
        {/* v116: Breadcrumb navigation */}
        <Breadcrumb 
          moduleId="ctms"
          viewLabel={activeTab === 'studies' ? 'Studies' : activeTab === 'sites' ? 'Sites' : activeTab === 'enrollment' ? 'Enrollment' : 'Monitoring'}
          className="mb-2"
        />
        <ReturnBreadcrumb variant="inline" className="mb-3" />

        {/* v0.44.50: Cascade strip — tasks targeting ctms from other modules */}
        {(() => {
          const ctmsEntries = cascadeChains
            .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
            .flatMap(chain =>
              chain.steps
                .filter(s => s.targetModule === 'ctms' && (s.status === 'pending' || s.status === 'spawned'))
                .map(step => ({ chain, step }))
            );
          if (ctmsEntries.length === 0) return null;
          return (
            <div className="mb-3 space-y-2">
              {ctmsEntries.map(({ chain, step }) => {
                const mins = Math.floor((Date.now() - new Date(chain.trigger.triggeredAt).getTime()) / 60000);
                const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
                return (
                  <div key={`${chain.id}-${step.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border
                      bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">New Study Required</span>
                        <span className="text-xs text-text-muted">· {ago}</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{step.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">Triggered by: {chain.trigger.sourceLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowNewStudyModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                          bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Create Study
                      </button>
                      <button onClick={() => skipCascadeStep(chain.id, step.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Dismiss"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-muted">Study operations, site management, and enrollment tracking</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleLoadData}>
              <RefreshCw className="w-4 h-4" />
              {studies.length === 0 ? 'Load Data' : 'Refresh'}
            </Button>

            <CapabilityGate moduleId="ctms" capability="author">
            <Button 
              variant="success" 
              size="sm"
              onClick={() => setShowNewStudyModal(true)}
            >
              <Plus className="w-4 h-4" />
              New Study
            </Button>
            </CapabilityGate>
          </div>
        </div>

        {/* v0.36.7: Compact Stats Row - saves ~80px vertical space */}
        <CompactStatBar 
          stats={ctmsDrillableStats.map(stat => toCompactStat(stat))}
          className="mb-4"
        />

        {/* v0.43.8: ScrollableTabs for responsive tab bars */}
        <div className="-mb-4">
          <ScrollableTabs
            tabs={tabs.map(tab => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              count: tab.count,
            }))}
            activeTab={activeTab}
            onTabChange={(id) => {
              setActiveTab(id as CTMSTab);
              setSelectedStudyId(null);
              setSelectedSiteId(null);
              setSearchQuery('');
              // v0.44.46: Fire DB lock cascade on first visit to db-lock tab
              if (id === 'db-lock' && !dbLockFired) {
                setDbLockFired(true);
                fireTrigger({
                  type: 'db-lock-completed',
                  sourceModule: 'ctms',
                  sourceId: illuminateDBLockCascade.lockEventCode,
                  sourceLabel: illuminateDBLockCascade.studyName + ' — DB Lock ' + illuminateDBLockCascade.lockEventCode,
                  metadata: {
                    studyName: illuminateDBLockCascade.studyName,
                    lockEventCode: illuminateDBLockCascade.lockEventCode,
                    databaseType: illuminateDBLockCascade.databaseType,
                  },
                });
              }
            }}
            activeColor="#10B981"
          />
        </div>
      </div>

      {/* Content - Regular tabs */}
      {activeTab !== 'readiness' && activeTab !== 'design' && activeTab !== 'deviations' && activeTab !== 'monitoring' && activeTab !== 'db-lock' && (
        <div className="flex-1 overflow-hidden flex">
          {/* List Panel */}
          <div className="hidden lg:flex w-[420px] border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <SearchInput
                placeholder={activeTab === 'studies' ? 'Search studies...' : 'Search sites...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'studies' && <StudyList studies={filteredStudies} selectedId={selectedStudyId} onSelect={(id) => { setSelectedStudyId(id); setSelectedSiteId(null); }} getStatusBadge={getStudyStatusBadge} getPhaseBadge={getPhaseBadge} getRiskBadge={getRiskBadge} />}
              {activeTab === 'sites' && <SiteList sites={filteredSites} selectedId={selectedSiteId} onSelect={setSelectedSiteId} getStatusBadge={getSiteStatusBadge} getRiskBadge={getRiskBadge} />}
              {activeTab === 'enrollment' && <StudyList studies={filteredStudies.filter(s => s.status === 'enrolling')} selectedId={selectedStudyId} onSelect={(id) => { setSelectedStudyId(id); setSelectedSiteId(null); }} getStatusBadge={getStudyStatusBadge} getPhaseBadge={getPhaseBadge} getRiskBadge={getRiskBadge} />}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="flex-1 overflow-y-auto bg-surface">
            {activeTab === 'studies' && selectedStudy && <StudyDetail study={selectedStudy} sites={studySites} enrollment={selectedEnrollment} selectedSiteId={selectedSiteId} onSelectSite={setSelectedSiteId} onAddSite={() => setShowAddSiteModal(true)} getStatusBadge={getStudyStatusBadge} getSiteStatusBadge={getSiteStatusBadge} getPhaseBadge={getPhaseBadge} getRiskBadge={getRiskBadge} />}
            {activeTab === 'sites' && selectedSite && <SiteDetail site={selectedSite} study={selectedSite ? studiesRecord[selectedSite.studyId] : undefined} getStatusBadge={getSiteStatusBadge} getRiskBadge={getRiskBadge} />}
            {activeTab === 'enrollment' && selectedStudy && <EnrollmentDetail study={selectedStudy} enrollment={selectedEnrollment} sites={studySites} getSiteStatusBadge={getSiteStatusBadge} />}
            {!selectedStudy && !selectedSite && (
              <div className="h-full flex items-center justify-center text-text-muted">
                <div className="text-center">
                  {studies.length === 0 ? (
                    <>
                      <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">No Studies Loaded</p>
                      <p className="text-sm mb-4">Click &quot;Load Data&quot; to populate with sample clinical trials</p>
                    </>
                  ) : (
                    <>
                      <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">Select a {activeTab === 'sites' ? 'Site' : 'Study'}</p>
                      <p className="text-sm">Choose from the list to view details</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* v185: Protocol Deviation Dashboard - Full Screen */}
      {activeTab === 'deviations' && (
        <ProtocolDeviationDashboard 
          studies={studies}
          sites={sites}
          deviations={allDeviations}
          deviationsByStudy={deviationsByStudyRecord}
          onReportDeviation={reportDeviation}
          onUpdateDeviation={updateDeviation}
          onCloseDeviation={closeDeviation}
        />
      )}

      {/* v185: Monitoring Visit Dashboard - Full Screen */}
      {activeTab === 'monitoring' && (
        <MonitoringDashboard 
          studies={studies}
          sites={sites}
          monitoringVisits={allMonitoringVisits}
          monitoringBySite={monitoringBySiteRecord}
          onScheduleVisit={scheduleMonitoringVisit}
          onUpdateVisit={updateMonitoringVisit}
          onCompleteVisit={completeMonitoringVisit}
        />
      )}

      {/* v182: Study Design Dashboard - Full Screen */}
      {activeTab === 'design' && (
        <StudyDesignDashboard 
          studies={studies}
          studyDesigns={studyDesignsRecord}
          studyArms={studyArmsRecord}
          studyEndpoints={studyEndpointsRecord}
          getPhaseBadge={getPhaseBadge}
          getStatusBadge={getStudyStatusBadge}
        />
      )}

      {/* v0.37.0: Study Startup Orchestrator - Full Screen */}
      {activeTab === 'startup' && (
        <StudyStartupOrchestratorScreen />
      )}

      {/* v0.37.2: Country/Site Drill-Down - Full Screen */}
      {activeTab === 'sites' && (
        <div className="flex-1 overflow-hidden">
          <CountrySiteDrilldown
            sites={sites}
            studies={studies}
            onSiteSelect={setSelectedSiteId}
            onStudySelect={(id) => { setSelectedStudyId(id); setActiveTab('studies'); }}
            selectedSiteId={selectedSiteId}
            getSiteStatusBadge={getSiteStatusBadge}
            getStudyStatusBadge={getStudyStatusBadge}
            getRiskBadge={getRiskBadge}
          />
        </div>
      )}

      {/* Submission Readiness Dashboard - Full Screen */}
      {activeTab === 'readiness' && (
        <SubmissionReadinessDashboard />
      )}

      {/* v0.6.1: Database Lock Center - Full Screen */}
      {activeTab === 'db-lock' && (
        <DatabaseLockCenter cascade={illuminateDBLockCascade} />
      )}

      {/* v155: Add Site Modal */}
      <AddSiteModal 
        isOpen={showAddSiteModal} 
        onClose={() => setShowAddSiteModal(false)} 
        onCreate={(data) => {
          if (selectedStudyId) {
            addSite(selectedStudyId, data as any);
          }
          setShowAddSiteModal(false);
        }}
        studyId={selectedStudyId || undefined}
      />

      {/* v0.44.14: New Study Modal */}
      {showNewStudyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowNewStudyModal(false); }}>
          <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">New Clinical Study</h2>
              <button onClick={() => setShowNewStudyModal(false)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Study Title *</label>
                <input value={newStudyForm.title} onChange={e => setNewStudyForm(f => ({...f, title: e.target.value}))} placeholder="e.g. A Phase 2 Study of LIG-101 in..." className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Protocol Number *</label>
                  <input value={newStudyForm.protocolNumber} onChange={e => setNewStudyForm(f => ({...f, protocolNumber: e.target.value}))} placeholder="e.g. LIG-101-P2-001" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Phase</label>
                  <select value={newStudyForm.phase} onChange={e => setNewStudyForm(f => ({...f, phase: e.target.value}))} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue">
                    {['Phase 1', 'Phase 1/2', 'Phase 2', 'Phase 2/3', 'Phase 3', 'Phase 4'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Indication / Therapeutic Area</label>
                <input value={newStudyForm.indication} onChange={e => setNewStudyForm(f => ({...f, indication: e.target.value}))} placeholder="e.g. Oncology — NSCLC" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sponsor</label>
                  <input value={newStudyForm.sponsor} onChange={e => setNewStudyForm(f => ({...f, sponsor: e.target.value}))} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Target Enrollment</label>
                  <input type="number" value={newStudyForm.targetEnrollment} onChange={e => setNewStudyForm(f => ({...f, targetEnrollment: e.target.value}))} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowNewStudyModal(false)}>Cancel</Button>
              <Button variant="success" size="sm" disabled={!newStudyForm.title.trim() || !newStudyForm.protocolNumber.trim()} onClick={() => {
                createStudy({
                  protocolNumber: newStudyForm.protocolNumber.trim(),
                  title: newStudyForm.title.trim(),
                  shortTitle: newStudyForm.title.trim().slice(0, 60),
                  phase: newStudyForm.phase as any,
                  status: 'planning',
                  indication: newStudyForm.indication.trim(),
                  sponsor: newStudyForm.sponsor.trim(),
                  targetEnrollment: parseInt(newStudyForm.targetEnrollment) || 0,
                  plannedStartDate: new Date().toISOString(),
                  medicalMonitor: '', projectManager: '',
                });
                setShowNewStudyModal(false);
                setNewStudyForm({ title: '', protocolNumber: '', phase: 'Phase 2', indication: '', sponsor: 'Ligature Therapeutics', targetEnrollment: '100' });
                toast.success(`Study created — ${newStudyForm.protocolNumber.trim()}`, {
                  action: { label: 'View in CTMS →', onClick: () => useAppStore.getState().setActiveModule('ctms') },
                });
              }}>
                <Plus className="w-4 h-4" />
                Create Study
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CTMS STAT CARD (local component, renamed to avoid conflict with UI library)
// =============================================================================
interface CTMSStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'teal' | 'green' | 'red' | 'amber' | 'purple' | 'slate';
  trend?: 'up' | 'down';
}

function CTMSStatCard({ label, value, subValue, icon, color, trend }: CTMSStatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    teal: 'bg-accent-teal/20 text-accent-teal',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    slate: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <div className="bg-surface-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded ${colorClasses[color]}`}>{icon}</div>
        {trend && <div className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>{trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-xl font-semibold text-text-primary">{value}</div>
        {subValue && <div className="text-xs text-text-muted">{subValue}</div>}
      </div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}

// =============================================================================
// STUDY LIST
// =============================================================================
interface StudyListProps {
  studies: CTMSStudy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getStatusBadge: (status: CTMSStudyStatus) => React.ReactNode;
  getPhaseBadge: (phase: StudyPhase) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

function StudyList({ studies, selectedId, onSelect, getStatusBadge, getPhaseBadge, getRiskBadge }: StudyListProps) {
  if (studies.length === 0) {
    return <EmptyState icon={<FlaskConical className="w-12 h-12" />} title="No studies found" />;
  }
  return (
    <div className="divide-y divide-border">
      {studies.map(study => {
        const enrollmentPct = study.targetEnrollment > 0 ? Math.round((study.enrolledSubjects / study.targetEnrollment) * 100) : 0;
        return (
          <button key={study.id} onClick={() => onSelect(study.id)} className={`w-full text-left p-4 hover:bg-surface-card transition-colors ${selectedId === study.id ? 'bg-surface-card border-l-2 border-emerald-500' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* v0.14.7: Protocol Provenance with lineage tracking */}
                  <CTMSProtocolProvenance
                    studyId={study.id}
                    protocolNumber={study.protocolNumber}
                    protocolVersion="1.0"
                  />
                  {getPhaseBadge(study.phase)}
                </div>
                <h3 className="font-medium text-text-primary text-sm truncate">{study.shortTitle}</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
            </div>
            <p className="text-xs text-text-muted truncate mb-3">{study.indication}</p>
            <div className="flex items-center justify-between gap-2 mb-2">{getStatusBadge(study.status)}{getRiskBadge(study.riskScore)}</div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">Enrollment</span>
                <span className="text-text-secondary">{study.enrolledSubjects} / {study.targetEnrollment}</span>
              </div>
              <ProgressBar value={enrollmentPct} max={100} color="emerald" size="sm" />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
              <div className="flex items-center gap-1"><Building2 className="w-3 h-3" /><span>{study.activeSites} sites</span></div>
              <div className="flex items-center gap-1"><Globe className="w-3 h-3" /><span>{study.countries.length} countries</span></div>
              {/* v0.14.7: Study documents summary */}
              <StudyDocumentsSummary studyId={study.id} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// SITE LIST
// =============================================================================
interface SiteListProps {
  sites: ClinicalSite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getStatusBadge: (status: SiteStatus) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

function SiteList({ sites, selectedId, onSelect, getStatusBadge, getRiskBadge }: SiteListProps) {
  if (sites.length === 0) {
    return <EmptyState icon={<Building2 className="w-12 h-12" />} title="No sites found" />;
  }
  return (
    <div className="divide-y divide-border">
      {sites.map(site => (
        <button key={site.id} onClick={() => onSelect(site.id)} className={`w-full text-left p-4 hover:bg-surface-card transition-colors ${selectedId === site.id ? 'bg-surface-card border-l-2 border-emerald-500' : ''}`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-text-muted">Site {site.siteNumber}</span>
                {getStatusBadge(site.status)}
              </div>
              <h3 className="font-medium text-text-primary text-sm truncate">{site.name}</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-3"><MapPin className="w-3 h-3" /><span>{site.address.city}, {site.address.country}</span></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs"><Users className="w-3 h-3 text-text-muted" /><span className="text-text-secondary">{site.enrolledSubjects}</span><span className="text-text-muted">/ {site.targetEnrollment}</span></div>
            {getRiskBadge(site.riskScore)}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-text-muted"><Stethoscope className="w-3 h-3" /><span>{site.principalInvestigator.name}</span></div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================
function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm text-text-primary flex items-center gap-1">{value}{icon}</span>
    </div>
  );
}

function TeamMember({ role, name }: { role: string; name: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center mx-auto mb-2">
        <span className="text-sm font-medium text-text-primary">{name.split(' ').map(n => n[0]).join('')}</span>
      </div>
      <div className="text-sm text-text-primary truncate">{name}</div>
      <div className="text-xs text-text-muted">{role}</div>
    </div>
  );
}

function MetricBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: 'blue' | 'amber' | 'emerald' }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClass = { blue: 'bg-blue-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[color];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary">{value} {unit}</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// =============================================================================
// STUDY DETAIL
// =============================================================================
interface StudyDetailProps {
  study: CTMSStudy;
  sites: ClinicalSite[];
  enrollment: EnrollmentTracking | null | undefined;
  selectedSiteId: string | null;
  onSelectSite: (id: string) => void;
  onAddSite: () => void;
  getStatusBadge: (status: CTMSStudyStatus) => React.ReactNode;
  getSiteStatusBadge: (status: SiteStatus) => React.ReactNode;
  getPhaseBadge: (phase: StudyPhase) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

function StudyDetail({ study, sites, enrollment, selectedSiteId, onSelectSite, onAddSite, getStatusBadge, getSiteStatusBadge, getPhaseBadge, getRiskBadge }: StudyDetailProps) {
  const { deadClick } = useDeadClick();
  const enrollmentPct = study.targetEnrollment > 0 ? Math.round((study.enrolledSubjects / study.targetEnrollment) * 100) : 0;
  return (
    <div className="p-4 md:p-6">
      {/* v0.50.0: ViewOnlyBanner moved to top-level ScreenHeader */}
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-text-muted">{study.protocolNumber}</span>
            {getPhaseBadge(study.phase)}
            {getStatusBadge(study.status)}
            {getRiskBadge(study.riskScore)}
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">{study.shortTitle}</h2>
          <p className="text-sm text-text-muted">{study.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-surface-card border border-border rounded-lg hover:bg-surface-elevated transition-colors" onClick={deadClick}><Edit className="w-4 h-4 text-text-secondary" /></button>
          <button className="p-2 bg-surface-card border border-border rounded-lg hover:bg-surface-elevated transition-colors" onClick={deadClick}><MoreHorizontal className="w-4 h-4 text-text-secondary" /></button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-emerald-400" /><span className="text-xs text-text-muted">Enrolled</span></div>
            <div className="text-2xl font-semibold text-text-primary">{study.enrolledSubjects}</div>
            <div className="text-xs text-text-muted">of {study.targetEnrollment} target</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">Active Sites</span></div>
            <div className="text-2xl font-semibold text-text-primary">{study.activeSites}</div>
            <div className="text-xs text-text-muted">of {study.totalSites} total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-purple-400" /><span className="text-xs text-text-muted">Countries</span></div>
            <div className="text-2xl font-semibold text-text-primary">{study.countries.length}</div>
            <div className="text-xs text-text-muted">{study.regions.length} regions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-accent-teal" /><span className="text-xs text-text-muted">Enrollment Rate</span></div>
            <div className="text-2xl font-semibold text-text-primary">{enrollment?.enrollmentRate || 0}</div>
            <div className="text-xs text-text-muted">per week</div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Progress */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Enrollment Progress</h3>
            <span className="text-sm text-text-secondary">{enrollmentPct}%</span>
          </div>
          <ProgressBar value={enrollmentPct} max={100} color="emerald" size="md" className="mb-3" />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>First Subject In: {study.firstSubjectIn || 'Not started'}</span>
            <span>Projected LPI: {enrollment?.projectedLastPatientIn || 'TBD'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Study Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Study Information</h3>
            <div className="space-y-3">
              <DetailRow label="Product" value={study.productName} />
              <DetailRow label="Indication" value={study.indication} />
              <DetailRow label="Sponsor" value={study.sponsor} />
              {study.cro && <DetailRow label="CRO" value={study.cro} />}
              <DetailRow label="Study Type" value={study.type} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Regulatory IDs</h3>
            <div className="space-y-3">
              {study.indNumber && <DetailRow label="IND" value={study.indNumber} />}
              {study.nctNumber && <DetailRow label="NCT" value={study.nctNumber} icon={<ExternalLink className="w-3 h-3" />} />}
              {study.eudractNumber && <DetailRow label="EudraCT" value={study.eudractNumber} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Study Team</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <TeamMember role="Medical Monitor" name={study.medicalMonitor} />
            <TeamMember role="Project Manager" name={study.projectManager} />
            {study.dataManager && <TeamMember role="Data Manager" name={study.dataManager} />}
            {study.statistician && <TeamMember role="Statistician" name={study.statistician} />}
          </div>
        </CardContent>
      </Card>

      {/* Sites List */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">Study Sites ({sites.length})</h3>
            <Button variant="ghost" size="sm" onClick={onAddSite}><Plus className="w-3 h-3 mr-1" />Add Site</Button>
          </div>
          {sites.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No sites assigned to this study</p>
          ) : (
            <div className="divide-y divide-border">
              {sites.map(site => (
                <div key={site.id} onClick={() => onSelectSite(site.id)} className={`py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-surface rounded px-2 -mx-2 transition-colors ${selectedSiteId === site.id ? 'bg-surface' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <div className="flex items-center gap-2"><span className="text-xs font-mono text-text-muted">Site {site.siteNumber}</span>{getSiteStatusBadge(site.status)}</div>
                        <div className="font-medium text-text-primary text-sm">{site.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><div className="text-sm font-medium text-text-primary">{site.enrolledSubjects}/{site.targetEnrollment}</div><div className="text-xs text-text-muted">enrolled</div></div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// SITE DETAIL
// =============================================================================
interface SiteDetailProps {
  site: ClinicalSite;
  study?: CTMSStudy;
  getStatusBadge: (status: SiteStatus) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

function SiteDetail({ site, study, getStatusBadge, getRiskBadge }: SiteDetailProps) {
  const enrollmentPct = site.targetEnrollment > 0 ? Math.round((site.enrolledSubjects / site.targetEnrollment) * 100) : 0;
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-text-muted">Site {site.siteNumber}</span>
            {getStatusBadge(site.status)}
            {getRiskBadge(site.riskScore)}
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-1">{site.name}</h2>
          <div className="flex items-center gap-2 text-sm text-text-muted"><MapPin className="w-4 h-4" /><span>{site.address.city}, {site.address.state || ''} {site.address.country}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton 
            icon={<Edit className="w-4 h-4" />} 
            label="Edit site" 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Would open site edit modal
            }}
          />
          <IconButton 
            icon={<MoreHorizontal className="w-4 h-4" />} 
            label="More options" 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Would open more options dropdown
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-emerald-400" /><span className="text-xs text-text-muted">Enrolled</span></div>
            <div className="text-2xl font-semibold text-text-primary">{site.enrolledSubjects}</div>
            <div className="text-xs text-text-muted">of {site.targetEnrollment} target</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">Enrollment Rate</span></div>
            <div className="text-2xl font-semibold text-text-primary">{site.enrollmentRate}</div>
            <div className="text-xs text-text-muted">per month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Screen Failure</span></div>
            <div className="text-2xl font-semibold text-text-primary">{site.screenFailureRate}%</div>
            <div className="text-xs text-text-muted">{site.screenFailures} failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-purple-400" /><span className="text-xs text-text-muted">Data Entry Lag</span></div>
            <div className="text-2xl font-semibold text-text-primary">{site.dataEntryLag}</div>
            <div className="text-xs text-text-muted">days</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Enrollment Progress</h3>
            <span className="text-sm text-text-secondary">{enrollmentPct}%</span>
          </div>
          <ProgressBar value={enrollmentPct} max={100} color="emerald" size="md" className="mb-3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-center text-xs">
            <div><div className="text-text-primary font-medium">{site.activeSubjects}</div><div className="text-text-muted">Active</div></div>
            <div><div className="text-text-primary font-medium">{site.completedSubjects}</div><div className="text-text-muted">Completed</div></div>
            <div><div className="text-text-primary font-medium">{site.discontinuedSubjects}</div><div className="text-text-muted">Discontinued</div></div>
            <div><div className="text-text-primary font-medium">{site.screenFailures}</div><div className="text-text-muted">Screen Failed</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Principal Investigator</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center"><Stethoscope className="w-5 h-5 text-purple-400" /></div>
              <div className="flex-1">
                <div className="font-medium text-text-primary">{site.principalInvestigator.name}</div>
                <div className="text-xs text-text-muted">{site.principalInvestigator.credentials}</div>
                {site.principalInvestigator.specialty && <div className="text-xs text-text-muted mt-1">{site.principalInvestigator.specialty}</div>}
                <div className="flex items-center gap-4 mt-2">
                  <a href={`mailto:${site.principalInvestigator.email}`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Mail className="w-3 h-3" />Email</a>
                  {site.principalInvestigator.phone && <a href={`tel:${site.principalInvestigator.phone}`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Phone className="w-3 h-3" />Call</a>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Study Coordinator</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center"><UserCheck className="w-5 h-5 text-blue-400" /></div>
              <div className="flex-1">
                <div className="font-medium text-text-primary">{site.studyCoordinator.name}</div>
                <div className="text-xs text-text-muted">{site.studyCoordinator.role}</div>
                <div className="flex items-center gap-4 mt-2">
                  <a href={`mailto:${site.studyCoordinator.email}`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Mail className="w-3 h-3" />Email</a>
                  {site.studyCoordinator.phone && <a href={`tel:${site.studyCoordinator.phone}`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Phone className="w-3 h-3" />Call</a>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <MetricBar label="Query Rate" value={site.queryRate} max={10} unit="per 100 subjects" color="blue" />
            <MetricBar label="Protocol Deviation Rate" value={site.protocolDeviationRate} max={5} unit="%" color="amber" />
            <MetricBar label="Screening Rate" value={site.screeningRate} max={10} unit="per month" color="emerald" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Key Dates</h3>
            <div className="space-y-3">
              {site.siteInitiationDate && <DetailRow label="Site Initiation" value={site.siteInitiationDate} />}
              {site.firstSubjectEnrolledDate && <DetailRow label="First Subject Enrolled" value={site.firstSubjectEnrolledDate} />}
              {site.lastMonitoringVisit && <DetailRow label="Last Monitoring Visit" value={site.lastMonitoringVisit} />}
              {site.nextMonitoringVisit && <DetailRow label="Next Monitoring Visit" value={site.nextMonitoringVisit} />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Documents</h3>
            <div className="space-y-3">
              <DetailRow label="Required" value={String(site.documentsRequired)} />
              <DetailRow label="Received" value={String(site.documentsReceived)} />
              <DetailRow label="Approved" value={String(site.documentsApproved)} />
            </div>
            <ProgressBar 
              value={site.documentsRequired > 0 ? (site.documentsApproved / site.documentsRequired) * 100 : 0} 
              max={100} 
              color="emerald" 
              size="sm" 
              className="mt-4" 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// ENROLLMENT DETAIL
// =============================================================================
interface EnrollmentDetailProps {
  study: CTMSStudy;
  enrollment: EnrollmentTracking | null | undefined;
  sites: ClinicalSite[];
  getSiteStatusBadge: (status: SiteStatus) => React.ReactNode;
}

function EnrollmentDetail({ study, enrollment, sites, getSiteStatusBadge }: EnrollmentDetailProps) {
  if (!enrollment) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">{study.shortTitle}</h2>
        <p className="text-text-muted">No enrollment tracking data available for this study.</p>
      </div>
    );
  }

  const enrollmentPct = enrollment.targetEnrollment > 0 ? Math.round((enrollment.enrolled / enrollment.targetEnrollment) * 100) : 0;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">{study.shortTitle} - Enrollment Dashboard</h2>
        <p className="text-sm text-text-muted">Protocol: {study.protocolNumber}</p>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-text-primary">{enrollment.screened}</div>
            <div className="text-xs text-text-muted">Screened</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-amber-400">{enrollment.screenFailed}</div>
            <div className="text-xs text-text-muted">Screen Failed</div>
            <div className="text-xs text-amber-400">{enrollment.screenFailureRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-emerald-400">{enrollment.enrolled}</div>
            <div className="text-xs text-text-muted">Enrolled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-accent-teal">{enrollment.onTreatment}</div>
            <div className="text-xs text-text-muted">On Treatment</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-green-400">{enrollment.completed}</div>
            <div className="text-xs text-text-muted">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Overall Enrollment Progress</h3>
            <span className="text-lg font-semibold text-emerald-400">{enrollmentPct}%</span>
          </div>
          <ProgressBar value={enrollmentPct} max={100} color="emerald" size="lg" className="mb-3" />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{enrollment.enrolled} enrolled of {enrollment.targetEnrollment} target</span>
            <span>Rate: {enrollment.enrollmentRate} per week</span>
          </div>
        </CardContent>
      </Card>

      {/* Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Projections</h3>
            <div className="space-y-3">
              <DetailRow label="Projected LPI" value={enrollment.projectedLastPatientIn} />
              <DetailRow label="Projected Completion" value={enrollment.projectedCompletionDate} />
              <DetailRow label="Enrollment vs Target" value={`${enrollment.enrollmentVsTarget}%`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Discontinuation</h3>
            <div className="space-y-3">
              <DetailRow label="Discontinued" value={String(enrollment.discontinued)} />
              <DetailRow label="Discontinuation Rate" value={`${enrollment.discontinuationRate}%`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Breakdown */}
      {enrollment.byRegion.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Enrollment by Region</h3>
            <div className="space-y-4">
              {enrollment.byRegion.map(region => (
                <div key={region.region}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-primary">{region.region}</span>
                    <span className="text-text-muted">{region.enrolled} / {region.target} ({region.percentComplete}%)</span>
                  </div>
                  <ProgressBar value={region.percentComplete} max={100} color="blue" size="sm" />
                  <div className="flex items-center justify-between text-xs text-text-muted mt-1">
                    <span>{region.activeSites} active sites</span>
                    <span>{region.enrollmentRate}/week</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Performance */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Site Enrollment Performance</h3>
          <div className="space-y-2">
            {sites.sort((a, b) => b.enrolledSubjects - a.enrolledSubjects).slice(0, 10).map(site => {
              const pct = site.targetEnrollment > 0 ? Math.round((site.enrolledSubjects / site.targetEnrollment) * 100) : 0;
              return (
                <div key={site.id} className="flex items-center gap-4">
                  <div className="w-20 text-xs font-mono text-text-muted">Site {site.siteNumber}</div>
                  <div className="flex-1">
                    <ProgressBar value={pct} max={100} color="emerald" size="sm" />
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm text-text-primary">{site.enrolledSubjects}</span>
                    <span className="text-xs text-text-muted">/{site.targetEnrollment}</span>
                  </div>
                  <div className="w-16">{getSiteStatusBadge(site.status)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// v182: STUDY DESIGN DASHBOARD
// =============================================================================

// Color maps for Study Design
const blindingColorMap: Record<BlindingType, 'blue' | 'purple' | 'teal' | 'green'> = {
  'open-label': 'blue',
  'single-blind': 'purple',
  'double-blind': 'teal',
  'triple-blind': 'green',
};

const randomizationColorMap: Record<RandomizationType, 'gray' | 'blue' | 'purple' | 'amber' | 'teal'> = {
  'none': 'gray',
  'simple': 'blue',
  'block': 'purple',
  'stratified': 'amber',
  'adaptive': 'teal',
};

const armTypeColorMap: Record<ArmType, 'blue' | 'green' | 'purple' | 'gray' | 'amber'> = {
  'experimental': 'blue',
  'active-comparator': 'green',
  'placebo': 'purple',
  'sham': 'gray',
  'no-intervention': 'amber',
};

const endpointTypeColorMap: Record<EndpointType, 'red' | 'blue' | 'purple' | 'amber'> = {
  'primary': 'red',
  'secondary': 'blue',
  'exploratory': 'purple',
  'safety': 'amber',
};

const endpointCategoryColorMap: Record<EndpointCategory, 'green' | 'red' | 'purple' | 'blue' | 'teal' | 'amber'> = {
  'efficacy': 'green',
  'safety': 'red',
  'pharmacokinetic': 'purple',
  'biomarker': 'blue',
  'patient-reported': 'teal',
  'quality-of-life': 'amber',
};

interface StudyDesignDashboardProps {
  studies: CTMSStudy[];
  studyDesigns: Record<string, StudyDesign>;
  studyArms: Record<string, StudyArm[]>;
  studyEndpoints: Record<string, StudyEndpoint[]>;
  getPhaseBadge: (phase: StudyPhase) => React.ReactNode;
  getStatusBadge: (status: CTMSStudyStatus) => React.ReactNode;
}

function StudyDesignDashboard({ studies, studyDesigns, studyArms, studyEndpoints, getPhaseBadge, getStatusBadge }: StudyDesignDashboardProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    design: true,
    arms: true,
    endpoints: true,
    interim: false,
  });

  const selectedStudy = selectedStudyId ? studies.find(s => s.id === selectedStudyId) : null;
  const selectedDesign = selectedStudyId ? studyDesigns[selectedStudyId] : null;
  const selectedArms = selectedStudyId ? studyArms[selectedStudyId] || [] : [];
  const selectedEndpointsList = selectedStudyId ? studyEndpoints[selectedStudyId] || [] : [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalArms = Object.values(studyArms).flat().length;
    const totalEndpoints = Object.values(studyEndpoints).flat().length;
    const primaryEndpoints = Object.values(studyEndpoints).flat().filter(e => e.type === 'primary').length;
    const adaptiveStudies = Object.values(studyDesigns).filter(d => d.isAdaptive).length;
    return { totalArms, totalEndpoints, primaryEndpoints, adaptiveStudies };
  }, [studyArms, studyEndpoints, studyDesigns]);

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Study List Panel */}
      <div className="hidden lg:flex w-[380px] border-r border-border flex flex-col bg-surface-elevated">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">Study Design Overview</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface p-2 rounded-lg">
              <div className="text-lg font-semibold text-text-primary">{stats.totalArms}</div>
              <div className="text-xs text-text-muted">Total Arms</div>
            </div>
            <div className="bg-surface p-2 rounded-lg">
              <div className="text-lg font-semibold text-text-primary">{stats.primaryEndpoints}</div>
              <div className="text-xs text-text-muted">Primary Endpoints</div>
            </div>
            <div className="bg-surface p-2 rounded-lg">
              <div className="text-lg font-semibold text-text-primary">{stats.totalEndpoints}</div>
              <div className="text-xs text-text-muted">All Endpoints</div>
            </div>
            <div className="bg-surface p-2 rounded-lg">
              <div className="text-lg font-semibold text-accent-teal">{stats.adaptiveStudies}</div>
              <div className="text-xs text-text-muted">Adaptive Designs</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {studies.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No studies available. Load data to view study designs.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {studies.map(study => {
                const design = studyDesigns[study.id];
                const arms = studyArms[study.id] || [];
                const endpoints = studyEndpoints[study.id] || [];
                
                return (
                  <div
                    key={study.id}
                    onClick={() => setSelectedStudyId(study.id)}
                    className={`p-4 cursor-pointer transition-colors ${selectedStudyId === study.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 'hover:bg-surface'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-text-muted">{study.protocolNumber}</span>
                      {getPhaseBadge(study.phase)}
                    </div>
                    <div className="font-medium text-text-primary text-sm mb-2">{study.shortTitle}</div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {arms.length} arms
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {endpoints.length} endpoints
                      </span>
                      {design?.isAdaptive && (
                        <Badge color="teal" size="xs">Adaptive</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-surface p-6">
        {!selectedStudy ? (
          <div className="h-full flex items-center justify-center text-text-muted">
            <div className="text-center">
              <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Select a Study</p>
              <p className="text-sm">Choose a study from the list to view its design details</p>
            </div>
          </div>
        ) : (
          <>
            {/* Study Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-text-muted">{selectedStudy.protocolNumber}</span>
                {getPhaseBadge(selectedStudy.phase)}
                {getStatusBadge(selectedStudy.status)}
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-1">{selectedStudy.shortTitle}</h2>
              <p className="text-sm text-text-muted">{selectedStudy.title}</p>
            </div>

            {/* Design Overview Section */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('design')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-medium text-text-primary">Study Design</h3>
                  </div>
                  {expandedSections.design ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </div>
              </CardHeader>
              {expandedSections.design && selectedDesign && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                    <div className="bg-surface p-3 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Blinding</div>
                      <Badge color={blindingColorMap[selectedDesign.blinding]} size="sm">
                        {selectedDesign.blinding.replace(/-/g, ' ')}
                      </Badge>
                    </div>
                    <div className="bg-surface p-3 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Randomization</div>
                      <Badge color={randomizationColorMap[selectedDesign.randomization]} size="sm">
                        {selectedDesign.randomization}
                      </Badge>
                    </div>
                    <div className="bg-surface p-3 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Allocation</div>
                      <span className="text-sm font-medium text-text-primary">{selectedDesign.allocationRatio}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Treatment Duration</span>
                        <span className="text-text-primary">{selectedDesign.treatmentDurationWeeks} weeks</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Follow-up Duration</span>
                        <span className="text-text-primary">{selectedDesign.followUpDurationWeeks} weeks</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Total Duration</span>
                        <span className="text-text-primary font-medium">{selectedDesign.totalDurationWeeks} weeks</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Placebo Arm</span>
                        <Badge color={selectedDesign.hasPlacebo ? 'green' : 'gray'} size="xs">
                          {selectedDesign.hasPlacebo ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Active Comparator</span>
                        <Badge color={selectedDesign.hasActiveComparator ? 'green' : 'gray'} size="xs">
                          {selectedDesign.hasActiveComparator ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">Adaptive Design</span>
                        <Badge color={selectedDesign.isAdaptive ? 'teal' : 'gray'} size="xs">
                          {selectedDesign.isAdaptive ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {selectedDesign.adaptiveFeatures && selectedDesign.adaptiveFeatures.length > 0 && (
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
                      <div className="text-xs text-teal-400 mb-2 font-medium">Adaptive Features</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDesign.adaptiveFeatures.map((feature, idx) => (
                          <Badge key={idx} color="teal" size="xs">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDesign.stratificationFactors.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-text-muted mb-2 font-medium">Stratification Factors</div>
                      <div className="space-y-2">
                        {selectedDesign.stratificationFactors.map((factor) => (
                          <div key={factor.id} className="flex items-center justify-between bg-surface p-2 rounded">
                            <span className="text-sm text-text-primary">{factor.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted">{factor.levels.join(' | ')}</span>
                              {factor.isRequired && <Badge color="red" size="xs">Required</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Study Arms Section */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('arms')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-text-primary">Study Arms ({selectedArms.length})</h3>
                  </div>
                  {expandedSections.arms ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </div>
              </CardHeader>
              {expandedSections.arms && (
                <CardContent className="pt-0">
                  {selectedArms.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No arms defined for this study</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedArms.map(arm => {
                        const enrollmentPct = arm.targetEnrollment > 0 ? Math.round((arm.enrolledSubjects / arm.targetEnrollment) * 100) : 0;
                        return (
                          <div key={arm.id} className="bg-surface rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-text-primary">{arm.name}</span>
                                  <Badge color={armTypeColorMap[arm.type]} size="xs">{arm.type.replace(/-/g, ' ')}</Badge>
                                  <Badge color={arm.status === 'open' ? 'green' : arm.status === 'closed' ? 'gray' : 'amber'} size="xs">{arm.status}</Badge>
                                </div>
                                <p className="text-xs text-text-muted">{arm.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-text-primary">{arm.enrolledSubjects}</div>
                                <div className="text-xs text-text-muted">of {arm.targetEnrollment}</div>
                              </div>
                            </div>
                            
                            <ProgressBar value={enrollmentPct} max={100} color="blue" size="sm" className="mb-3" />
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-center">
                              <div>
                                <div className="text-sm font-medium text-text-primary">{arm.dose || 'N/A'}</div>
                                <div className="text-xs text-text-muted">Dose</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-text-primary">{arm.route || 'N/A'}</div>
                                <div className="text-xs text-text-muted">Route</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-text-primary">{arm.frequency || 'N/A'}</div>
                                <div className="text-xs text-text-muted">Frequency</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-text-primary">{arm.allocationWeight}x</div>
                                <div className="text-xs text-text-muted">Allocation</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Endpoints Section */}
            <Card className="mb-6">
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('endpoints')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-medium text-text-primary">Endpoints ({selectedEndpointsList.length})</h3>
                  </div>
                  {expandedSections.endpoints ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </div>
              </CardHeader>
              {expandedSections.endpoints && (
                <CardContent className="pt-0">
                  {selectedEndpointsList.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No endpoints defined for this study</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Group by type */}
                      {(['primary', 'secondary', 'exploratory', 'safety'] as EndpointType[]).map(epType => {
                        const typeEndpoints = selectedEndpointsList.filter(e => e.type === epType);
                        if (typeEndpoints.length === 0) return null;
                        
                        return (
                          <div key={epType}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge color={endpointTypeColorMap[epType]} size="sm">{epType.charAt(0).toUpperCase() + epType.slice(1)}</Badge>
                              <span className="text-xs text-text-muted">({typeEndpoints.length})</span>
                            </div>
                            <div className="space-y-2 ml-2">
                              {typeEndpoints.map(ep => (
                                <div key={ep.id} className="bg-surface rounded-lg p-3 border-l-2" style={{ borderLeftColor: epType === 'primary' ? '#ef4444' : epType === 'secondary' ? '#3b82f6' : epType === 'safety' ? '#f59e0b' : '#8b5cf6' }}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-text-primary text-sm">{ep.name}</span>
                                        <Badge color={endpointCategoryColorMap[ep.category]} size="xs">{ep.category}</Badge>
                                        {ep.status === 'achieved' && <Badge color="green" size="xs">Achieved</Badge>}
                                        {ep.status === 'not-achieved' && <Badge color="red" size="xs">Not Achieved</Badge>}
                                      </div>
                                      <p className="text-xs text-text-muted line-clamp-2">{ep.fullDefinition}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-xs">
                                    {ep.assessmentMethod && (
                                      <span className="text-text-muted">Method: <span className="text-text-secondary">{ep.assessmentMethod}</span></span>
                                    )}
                                    {ep.assessmentTimepoint && (
                                      <span className="text-text-muted">Timepoint: <span className="text-text-secondary">{ep.assessmentTimepoint}</span></span>
                                    )}
                                    {ep.targetValue && (
                                      <span className="text-text-muted">Target: <span className="text-text-secondary">{ep.targetValue}</span></span>
                                    )}
                                    {ep.result && (
                                      <span className="text-text-muted">Result: <span className="text-emerald-400 font-medium">{ep.result}</span></span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Interim Analyses Section */}
            {selectedDesign && selectedDesign.interimAnalyses.length > 0 && (
              <Card>
                <CardHeader className="cursor-pointer" onClick={() => toggleSection('interim')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-medium text-text-primary">Interim Analyses ({selectedDesign.interimAnalyses.length})</h3>
                    </div>
                    {expandedSections.interim ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </CardHeader>
                {expandedSections.interim && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {selectedDesign.interimAnalyses.map((ia, idx) => (
                        <div key={ia.id} className="bg-surface rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-400 font-medium">{idx + 1}</span>
                              <span className="font-medium text-text-primary text-sm">{ia.name}</span>
                            </div>
                            <Badge color={ia.status === 'completed' ? 'green' : ia.status === 'ongoing' ? 'blue' : 'gray'} size="xs">
                              {ia.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs ml-8">
                            <span className="text-text-muted">Trigger: <span className="text-text-secondary">{ia.triggerType.replace(/-/g, ' ')} ({ia.triggerValue})</span></span>
                            {ia.plannedDate && <span className="text-text-muted">Planned: <span className="text-text-secondary">{ia.plannedDate}</span></span>}
                            {ia.actualDate && <span className="text-text-muted">Actual: <span className="text-text-secondary">{ia.actualDate}</span></span>}
                            {ia.outcome && <span className="text-text-muted">Outcome: <span className="text-emerald-400">{ia.outcome}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// v0.6.1: CASCADE METRIC CARD (Local component for cascade dashboards)
// =============================================================================
interface CascadeMetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'cyan' | 'teal';
  subtext?: string;
  subtextColor?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red' | 'muted';
}

function CascadeMetricCard({ label, value, icon, color, subtext, subtextColor = 'muted' }: CascadeMetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    teal: 'bg-teal-500/20 text-teal-400',
  };
  
  const valueColorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    teal: 'text-teal-400',
  };

  const subtextColorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    muted: 'text-text-muted',
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${valueColorClasses[color]}`}>{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
      {subtext && (
        <div className={`text-xs mt-1 ${subtextColorClasses[subtextColor]}`}>{subtext}</div>
      )}
    </div>
  );
}

// =============================================================================
// v0.6.1: DATABASE LOCK CENTER COMPONENT
// =============================================================================
// "The database locks. Within 45 seconds, 38 downstream actions are activated."

interface DatabaseLockCenterProps {
  cascade: DBLockCascade;
}

function DatabaseLockCenter({ cascade }: DatabaseLockCenterProps) {
  const progress = getDBLockCascadeProgress(cascade);
  const criticalActions = getDBLockCriticalActions(cascade);

  // Icon mapping for stages
  const getStageIcon = (category: DBLockCascadeCategory) => {
    switch (category) {
      case 'db-lock': return Database;
      case 'data-validation': return CheckSquare;
      case 'csr-generation': return FileText;
      case 'regulatory-timeline': return Calendar;
      case 'document-finalization': return FilePenLine;
      case 'submission-prep': return Package;
      case 'haq-readiness': return MessageSquare;
      case 'partner-notification': return Users;
      case 'quality-readiness': return Shield;
      case 'post-lock-monitoring': return Activity;
      default: return Database;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb 
          moduleId="ctms"
          viewLabel="Database Lock Center"
          className="mb-4"
        />
        
        {/* Hero Banner - The "Aha Moment" */}
        <div className="mb-6 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Database Lock Center</h1>
                  <Badge color="green" size="sm">LIVE CASCADE</Badge>
                  <Badge color="purple" size="sm">R&D Connected</Badge>
                </div>
                <p className="text-text-secondary mb-4 max-w-3xl text-sm sm:text-base">
                  The database locked. Within <span className="font-bold text-emerald-400">45 seconds</span>, 
                  <span className="font-bold text-text-primary"> {cascade.totalActions} downstream actions</span> were automatically activated 
                  — from CSR generation to eCTD assembly. In legacy systems, this kickoff takes 2 weeks to schedule.
                </p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-text-muted">Cascade Active</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Lock Event:</span>
                    <span className="ml-1 font-semibold text-emerald-400">{cascade.lockEventCode}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Study:</span>
                    <span className="ml-1 font-semibold">{cascade.studyName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Database:</span>
                    <Badge color="green" size="sm">{cascade.databaseType.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <div className="text-4xl font-bold text-emerald-400">{cascade.totalActions}</div>
              <div className="text-sm text-text-muted">Actions Triggered</div>
              <div className="mt-2 text-xs text-text-muted">
                {cascade.completedActions} completed • {cascade.totalActions - cascade.completedActions} in progress
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
          <CascadeMetricCard
            label="Time to Kickoff"
            value="45s"
            icon={<Clock className="w-5 h-5" />}
            color="emerald"
            subtext="vs 2 weeks legacy"
            subtextColor="emerald"
          />
          <CascadeMetricCard
            label="Modules Impacted"
            value="8"
            icon={<Link2 className="w-5 h-5" />}
            color="purple"
            subtext="Cross-R&D cascade"
          />
          <CascadeMetricCard
            label="Automated Actions"
            value="74%"
            icon={<Zap className="w-5 h-5" />}
            color="blue"
            subtext={`${cascade.automatedActions}/${cascade.totalActions} auto`}
          />
          <CascadeMetricCard
            label="Critical Items"
            value={criticalActions.length}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            subtext="Requiring action"
          />
          <CascadeMetricCard
            label="Completion"
            value={`${progress.percentComplete}%`}
            icon={<CheckSquare className="w-5 h-5" />}
            color="emerald"
            subtext={`${cascade.completedActions}/${cascade.totalActions} actions`}
          />
          <CascadeMetricCard
            label="Target Submission"
            value="Mar 15"
            icon={<Calendar className="w-5 h-5" />}
            color="amber"
            subtext="72 days from lock"
          />
        </div>

        {/* Cascade Stage Pipeline */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">DB Lock → Submission Cascade</h2>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-border" />
                  <span>Pending</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
              {cascade.stages.map((stage, idx) => {
                const StageIcon = getStageIcon(stage.category);
                const statusColor = stage.status === 'completed' ? 'bg-emerald-500' :
                                   stage.status === 'in-progress' ? 'bg-blue-500' :
                                   'bg-border';
                const statusBorder = stage.status === 'completed' ? 'border-emerald-500/30' :
                                    stage.status === 'in-progress' ? 'border-blue-500/30' :
                                    'border-border';
                
                return (
                  <div key={stage.category} className="flex items-stretch">
                    <div className={`flex-shrink-0 w-40 rounded-lg border ${statusBorder} bg-surface-elevated p-3 flex flex-col`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg ${statusColor}/20 flex items-center justify-center`}>
                          <StageIcon className={`w-4 h-4 ${stage.status === 'completed' ? 'text-emerald-400' : stage.status === 'in-progress' ? 'text-blue-400' : 'text-text-muted'}`} />
                        </div>
                        {stage.criticalCount > 0 && (
                          <Badge color="red" size="sm">{stage.criticalCount}</Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium text-text-primary mb-1">{stage.label}</div>
                      <div className="text-xs text-text-muted mb-2 flex-1">{stage.description}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={stage.status === 'completed' ? 'text-emerald-400' : stage.status === 'in-progress' ? 'text-blue-400' : 'text-text-muted'}>
                          {stage.completedActions}/{stage.totalActions}
                        </span>
                        {stage.status === 'completed' && <CheckSquare className="w-4 h-4 text-emerald-400" />}
                        {stage.status === 'in-progress' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                    </div>
                    {idx < cascade.stages.length - 1 && (
                      <div className="flex items-center px-1">
                        <ChevronRight className="w-4 h-4 text-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Critical Actions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-text-primary">Critical Actions</h3>
                <Badge color="red" size="sm">{criticalActions.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {criticalActions.slice(0, 10).map(action => (
                  <div key={action.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color={action.status === 'in-progress' ? 'blue' : action.status === 'pending-review' ? 'amber' : 'gray'} size="sm">
                            {action.status.replace('-', ' ')}
                          </Badge>
                          <span className="text-xs text-text-muted">{dbLockCategoryMeta[action.category]?.label ?? action.category}</span>
                        </div>
                        <div className="text-sm font-medium text-text-primary">{action.title}</div>
                        <div className="text-xs text-text-muted mt-1">{action.description}</div>
                      </div>
                      <div className="text-right text-xs text-text-muted flex-shrink-0">
                        {action.dueDate && (
                          <div className="text-red-400">Due: {new Date(action.dueDate).toLocaleDateString()}</div>
                        )}
                        {action.assignedTo && (
                          <div>{action.assignedTo}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-text-primary">Recent Activity</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {cascade.actions
                  .filter(a => a.status === 'completed' || a.status === 'validated')
                  .sort((a, b) => new Date(b.completedAt || b.triggeredAt).getTime() - new Date(a.completedAt || a.triggeredAt).getTime())
                  .slice(0, 10)
                  .map(action => (
                    <div key={action.id} className="p-3 bg-surface-elevated border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-text-muted">{dbLockCategoryMeta[action.category]?.label ?? action.category}</span>
                          </div>
                          <div className="text-sm font-medium text-text-primary">{action.title}</div>
                          {action.outputArtifacts && action.outputArtifacts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <FileText className="w-3 h-3 text-text-muted" />
                              <span className="text-xs text-blue-400">{action.outputArtifacts[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-text-muted flex-shrink-0">
                          {action.completedAt && new Date(action.completedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* R&D Connected Callout */}
        <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-1">R&D Connected: The DB Lock Cascade</h4>
              <p className="text-sm text-text-secondary">
                In legacy systems, a database lock triggers a 2-week kickoff meeting cycle. In Ligature, when {cascade.lockEventCode} locked: 
                <span className="text-emerald-400 font-medium"> SDTM/ADaM validated</span> • 
                <span className="text-blue-400 font-medium"> CSR shell activated</span> • 
                <span className="text-amber-400 font-medium"> 156 TLFs queued</span> • 
                <span className="text-purple-400 font-medium"> eCTD assembly started</span> • 
                <span className="text-cyan-400 font-medium"> submission date confirmed</span>.
                That's not just clinical operations — that's R&D Connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
