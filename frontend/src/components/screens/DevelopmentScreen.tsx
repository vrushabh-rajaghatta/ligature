
import { FilterState } from '@/components/layout/FilterBar';
import { useState, useMemo, useEffect } from 'react';
import {
  Activity, Users, Building2, FileText, Clock, CheckCircle, AlertTriangle, Plus,
  Search, Calendar, ChevronRight, TrendingUp, Target, Sparkles, MapPin, Flag,
  Database, Lock, Eye, BarChart3, Zap, ArrowRight, PlayCircle, PauseCircle,
  XCircle, AlertCircle, Globe, Layers, GitBranch, Timer, FolderArchive, DollarSign,
  ClipboardList, Upload, Download, CheckSquare, XSquare, FileCheck, Package,
  ChevronDown, ChevronUp, ExternalLink, Shield, FlaskConical, Link2,
  Send, X, Bell, UserX, Siren, Heart
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useProducts } from '@/stores/products-store';
import { useProductFilter } from '@/hooks/useProductFilter';
import {
  ClinicalTrial, ClinicalView,
  clinicalTrials, clinicalSites, tmfSections,
  getTrialById, getSitesByTrialId, getEnrollmentMilestonesByTrialId,
  getSafetyLinksByTrialId, getTrialMetrics, getUpcomingMilestones,
  clinicalSafetyLinks, getINDLinksByTrialId, getSubmissionLinksByTrialId
} from '@/data/clinical-data';
// v121: Consolidated UI library imports
import { StatCardGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar, LabeledProgress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import type { BadgeColor } from '@/components/ui/Badge';
// v161: Cross-module event system and MedDRA search
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { searchMedDRA, MedDRATerm } from '@/data/safety-data';
import { useDeadClick } from '@/hooks/useDeadClick';

// Extended view type combining Development and Clinical
type DevelopmentView = 
  | 'overview' 
  | 'programs' 
  | 'trials' 
  | 'sites' 
  | 'enrollment'
  | 'endpoints'
  | 'data' 
  | 'ctms' 
  | 'tmf' 
  | 'budgets'
  | 'trial-detail'
  | 'safety-events';

// Color maps for standardized badge colors (v108)
const developmentStatusColorMap: Record<string, BadgeColor> = {
  'planning': 'slate',
  'startup': 'purple',
  'enrolling': 'blue',
  'active': 'green',
  'follow-up': 'amber',
  'completing': 'teal',
  'completed': 'green',
  'on-hold': 'red',
  'on-track': 'green',
  'at-risk': 'amber',
  'delayed': 'red',
  'pending': 'slate',
  'achieved': 'green',
  'monitoring': 'blue',
  'investigating': 'amber',
  'mitigated': 'teal',
  'in-progress': 'blue',
  'overdue': 'red'
};

const phaseColorMap: Record<string, BadgeColor> = {
  'Phase 1': 'purple',
  'Phase 2': 'blue',
  'Phase 3': 'emerald',
  'Phase 4': 'teal'
};

const endpointTypeColorMap: Record<string, BadgeColor> = {
  'primary': 'blue',
  'secondary': 'purple',
  'safety': 'red',
  'exploratory': 'slate'
};

// Badge helper functions (v108)
export const getDevelopmentStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => {
  const color = developmentStatusColorMap[status] || 'slate';
  return (
    <Badge color={color} size={size}>
      {status.replace(/-/g, ' ')}
    </Badge>
  );
};

export const getPhaseBadge = (phase: string, size: 'xs' | 'sm' = 'sm') => {
  const color = phaseColorMap[phase] || 'purple';
  return (
    <Badge color={color} size={size}>
      {phase}
    </Badge>
  );
};

export const getEndpointTypeBadge = (type: string, size: 'xs' | 'sm' = 'sm') => {
  const color = endpointTypeColorMap[type] || 'slate';
  return (
    <Badge color={color} size={size}>
      {type}
    </Badge>
  );
};

interface ClinicalProgram {
  id: string; product: string; productId: string; indication: string;
  phase: string; status: 'active' | 'planning' | 'completed' | 'on-hold';
  studies: number; enrolledTotal: number; targetTotal: number;
  nextMilestone: string; nextMilestoneDate: string;
}

interface DataMilestone {
  id: string; studyId: string; study: string; milestone: string;
  type: 'enrollment' | 'lock' | 'unblind' | 'csr' | 'submission';
  plannedDate: string; actualDate?: string; status: 'completed' | 'on-track' | 'at-risk' | 'delayed';
  owner: string;
}

const clinicalPrograms: ClinicalProgram[] = [
  { id: 'prog-1', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C NSCLC', phase: 'Phase 3', status: 'active', studies: 3, enrolledTotal: 892, targetTotal: 950, nextMilestone: 'NDA Submission', nextMilestoneDate: '2025-02-15' },
  { id: 'prog-2', product: 'LIG-1182', productId: 'lig-1182', indication: 'HER2+ Breast Cancer', phase: 'Phase 3', status: 'active', studies: 2, enrolledTotal: 445, targetTotal: 600, nextMilestone: 'Primary Analysis', nextMilestoneDate: '2025-06-30' },
  { id: 'prog-3', product: 'LIG-2847', productId: 'lig-2847', indication: 'KRAS G12C CRC', phase: 'Phase 2', status: 'active', studies: 1, enrolledTotal: 78, targetTotal: 120, nextMilestone: 'Interim Analysis', nextMilestoneDate: '2025-03-15' },
  { id: 'prog-4', product: 'LIG-4055', productId: 'lig-4055', indication: 'KRAS G12D Pancreatic', phase: 'Phase 1', status: 'planning', studies: 1, enrolledTotal: 0, targetTotal: 45, nextMilestone: 'First Patient In', nextMilestoneDate: '2025-09-01' },
];

const dataMilestones: DataMilestone[] = [
  { id: 'dm-1', studyId: 'LIG-2847-301', study: 'LIGATURE-1', milestone: 'Last Patient Last Visit', type: 'enrollment', plannedDate: '2024-12-15', actualDate: '2024-12-10', status: 'completed', owner: 'Clinical Ops' },
  { id: 'dm-2', studyId: 'LIG-2847-301', study: 'LIGATURE-1', milestone: 'Database Lock', type: 'lock', plannedDate: '2025-01-15', status: 'on-track', owner: 'Data Management' },
  { id: 'dm-3', studyId: 'LIG-2847-301', study: 'LIGATURE-1', milestone: 'Unblinding', type: 'unblind', plannedDate: '2025-01-20', status: 'on-track', owner: 'Biostatistics' },
  { id: 'dm-4', studyId: 'LIG-2847-301', study: 'LIGATURE-1', milestone: 'CSR Draft', type: 'csr', plannedDate: '2025-02-01', status: 'on-track', owner: 'Medical Writing' },
  { id: 'dm-5', studyId: 'LIG-2847-301', study: 'LIGATURE-1', milestone: 'NDA Submission', type: 'submission', plannedDate: '2025-02-15', status: 'on-track', owner: 'Regulatory' },
  { id: 'dm-6', studyId: 'LIG-2847-302', study: 'LIGATURE-2', milestone: 'Enrollment Complete', type: 'enrollment', plannedDate: '2025-02-28', status: 'at-risk', owner: 'Clinical Ops' },
  { id: 'dm-7', studyId: 'LIG-1182-301', study: 'LIGAMAB-1', milestone: 'Interim Analysis', type: 'unblind', plannedDate: '2025-03-15', status: 'on-track', owner: 'Biostatistics' },
];

// CTMS Data
interface CTMSTask {
  id: string; studyId: string; study: string; task: string; category: 'startup' | 'conduct' | 'closeout';
  assignee: string; dueDate: string; status: 'completed' | 'in-progress' | 'pending' | 'overdue';
  site?: string;
}

const ctmsTasks: CTMSTask[] = [
  { id: 'ctms-1', studyId: 'LIG-2847-301', study: 'LIGATURE-1', task: 'Site Closeout Visit - MSK', category: 'closeout', assignee: 'J. Martinez', dueDate: '2025-01-08', status: 'in-progress', site: 'MSK' },
  { id: 'ctms-2', studyId: 'LIG-2847-301', study: 'LIGATURE-1', task: 'Final Monitoring Report', category: 'closeout', assignee: 'S. Chen', dueDate: '2025-01-12', status: 'pending' },
  { id: 'ctms-3', studyId: 'LIG-2847-302', study: 'LIGATURE-2', task: 'Site Activation - Berlin', category: 'startup', assignee: 'M. Schmidt', dueDate: '2025-01-05', status: 'overdue', site: 'Charite' },
  { id: 'ctms-4', studyId: 'LIG-2847-302', study: 'LIGATURE-2', task: 'Protocol Amendment Training', category: 'conduct', assignee: 'L. Park', dueDate: '2025-01-10', status: 'in-progress' },
  { id: 'ctms-5', studyId: 'LIG-1182-301', study: 'LIGAMAB-1', task: 'Interim Monitoring Visit - Dana-Farber', category: 'conduct', assignee: 'R. Thompson', dueDate: '2025-01-15', status: 'pending', site: 'Dana-Farber' },
  { id: 'ctms-6', studyId: 'LIG-2847-201', study: 'LIGATURE-CRC', task: 'Site Initiation Visit - Tokyo', category: 'startup', assignee: 'K. Yamamoto', dueDate: '2024-12-20', status: 'completed', site: 'NCC Tokyo' },
  { id: 'ctms-7', studyId: 'LIG-2847-301', study: 'LIGATURE-1', task: 'Query Resolution - MD Anderson', category: 'conduct', assignee: 'A. Wilson', dueDate: '2025-01-03', status: 'completed', site: 'MD Anderson' },
];

// Study Budget Data
interface StudyBudget {
  id: string; studyId: string; study: string; category: string;
  budgeted: number; actual: number; forecast: number; variance: number;
}

const studyBudgets: StudyBudget[] = [
  { id: 'bud-1', studyId: 'LIG-2847-301', study: 'LIGATURE-1', category: 'Site Costs', budgeted: 12500000, actual: 11800000, forecast: 12200000, variance: 2.4 },
  { id: 'bud-2', studyId: 'LIG-2847-301', study: 'LIGATURE-1', category: 'CRO Fees', budgeted: 8500000, actual: 8200000, forecast: 8400000, variance: 1.2 },
  { id: 'bud-3', studyId: 'LIG-2847-301', study: 'LIGATURE-1', category: 'Lab/Central Services', budgeted: 3200000, actual: 3100000, forecast: 3150000, variance: 1.6 },
  { id: 'bud-4', studyId: 'LIG-2847-301', study: 'LIGATURE-1', category: 'Drug Supply', budgeted: 4500000, actual: 4600000, forecast: 4700000, variance: -4.4 },
  { id: 'bud-5', studyId: 'LIG-2847-301', study: 'LIGATURE-1', category: 'Regulatory', budgeted: 1800000, actual: 1650000, forecast: 1750000, variance: 2.8 },
  { id: 'bud-6', studyId: 'LIG-2847-302', study: 'LIGATURE-2', category: 'Site Costs', budgeted: 9800000, actual: 5200000, forecast: 10200000, variance: -4.1 },
  { id: 'bud-7', studyId: 'LIG-2847-302', study: 'LIGATURE-2', category: 'CRO Fees', budgeted: 6200000, actual: 3800000, forecast: 6500000, variance: -4.8 },
  { id: 'bud-8', studyId: 'LIG-1182-301', study: 'LIGAMAB-1', category: 'Site Costs', budgeted: 11200000, actual: 7800000, forecast: 11500000, variance: -2.7 },
];

// v161: Clinical Adverse Event Types
interface ClinicalAdverseEvent {
  id: string;
  trialId: string;
  trialName: string;
  subjectId: string;
  siteId: string;
  siteName: string;
  eventTerm: string;
  meddraCode: string;
  meddraSOC: string;
  onsetDate: string;
  reportedDate: string;
  seriousness: 'serious' | 'non-serious';
  seriousnessCriteria?: ('death' | 'life-threatening' | 'hospitalization' | 'disability' | 'congenital-anomaly' | 'other-serious')[];
  causality: 'certain' | 'probable' | 'possible' | 'unlikely' | 'not-assessed';
  outcome: 'recovered' | 'recovering' | 'not-recovered' | 'fatal' | 'unknown';
  status: 'new' | 'under-review' | 'escalated' | 'closed';
  expeditedReporting?: '7-day' | '15-day' | 'not-required';
  actionTaken?: 'withdrawn' | 'reduced' | 'continued' | 'not-applicable';
}

interface DSMBAlert {
  id: string;
  trialId: string;
  trialName: string;
  alertType: 'safety-concern' | 'stopping-rule' | 'unblinding-request' | 'futility';
  createdDate: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  recommendation: string;
  affectedArms?: string[];
}

// v161: Mock clinical adverse events for demo
const clinicalAdverseEvents: ClinicalAdverseEvent[] = [
  {
    id: 'ae-001',
    trialId: 'trial-001',
    trialName: 'LIGATURE-1',
    subjectId: 'LIG-301-0142',
    siteId: 'site-msk',
    siteName: 'Memorial Sloan Kettering',
    eventTerm: 'Hepatotoxicity',
    meddraCode: '10019851',
    meddraSOC: 'Hepatobiliary disorders',
    onsetDate: '2024-12-15',
    reportedDate: '2024-12-18',
    seriousness: 'serious',
    seriousnessCriteria: ['hospitalization'],
    causality: 'probable',
    outcome: 'recovering',
    status: 'new',
    expeditedReporting: '15-day',
    actionTaken: 'withdrawn',
  },
  {
    id: 'ae-002',
    trialId: 'trial-001',
    trialName: 'LIGATURE-1',
    subjectId: 'LIG-301-0089',
    siteId: 'site-mda',
    siteName: 'MD Anderson',
    eventTerm: 'ALT Increased',
    meddraCode: '10001551',
    meddraSOC: 'Investigations',
    onsetDate: '2024-12-20',
    reportedDate: '2024-12-22',
    seriousness: 'non-serious',
    causality: 'possible',
    outcome: 'recovered',
    status: 'closed',
  },
  {
    id: 'ae-003',
    trialId: 'trial-001',
    trialName: 'LIGATURE-1',
    subjectId: 'LIG-301-0203',
    siteId: 'site-dfci',
    siteName: 'Dana-Farber',
    eventTerm: 'Fatigue',
    meddraCode: '10016256',
    meddraSOC: 'General disorders',
    onsetDate: '2024-12-22',
    reportedDate: '2024-12-23',
    seriousness: 'non-serious',
    causality: 'probable',
    outcome: 'not-recovered',
    status: 'under-review',
  },
  {
    id: 'ae-004',
    trialId: 'trial-001',
    trialName: 'LIGATURE-1',
    subjectId: 'LIG-301-0178',
    siteId: 'site-msk',
    siteName: 'Memorial Sloan Kettering',
    eventTerm: 'QT Prolongation',
    meddraCode: '10037705',
    meddraSOC: 'Investigations',
    onsetDate: '2024-12-24',
    reportedDate: '2024-12-26',
    seriousness: 'serious',
    seriousnessCriteria: ['other-serious'],
    causality: 'possible',
    outcome: 'recovering',
    status: 'under-review',
    expeditedReporting: '15-day',
    actionTaken: 'reduced',
  },
  {
    id: 'ae-005',
    trialId: 'trial-002',
    trialName: 'LIGATURE-2',
    subjectId: 'LIG-302-0045',
    siteId: 'site-charite',
    siteName: 'Charité Berlin',
    eventTerm: 'Diarrhoea',
    meddraCode: '10012735',
    meddraSOC: 'Gastrointestinal disorders',
    onsetDate: '2024-12-25',
    reportedDate: '2024-12-27',
    seriousness: 'non-serious',
    causality: 'probable',
    outcome: 'recovered',
    status: 'closed',
  },
];

const dsmbAlerts: DSMBAlert[] = [
  {
    id: 'dsmb-001',
    trialId: 'trial-001',
    trialName: 'LIGATURE-1',
    alertType: 'safety-concern',
    createdDate: '2024-12-20',
    status: 'pending',
    recommendation: 'Increased hepatotoxicity signal warrants enhanced liver function monitoring for all enrolled subjects. Recommend adding LFT testing at Week 2 for new enrollees.',
    affectedArms: ['Arm A - Nexavant 100mg', 'Arm B - Nexavant 200mg'],
  },
];

interface DevelopmentScreenProps { filters?: FilterState; }

export function DevelopmentScreen({ filters }: DevelopmentScreenProps) {
  const products = useProducts();
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<DevelopmentView>('overview');
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(null);
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());
  const [siteFilter, setSiteFilter] = useState<string>('all');

  // v161: Safety event modals and state
  const [showReportAEModal, setShowReportAEModal] = useState(false);
  const [showEscalateSAEModal, setShowEscalateSAEModal] = useState(false);
  const [showDSMBAlertModal, setShowDSMBAlertModal] = useState(false);
  const [selectedAE, setSelectedAE] = useState<ClinicalAdverseEvent | null>(null);
  const [meddraSearch, setMeddraSearch] = useState('');
  const [selectedMedDRA, setSelectedMedDRA] = useState<MedDRATerm | null>(null);
  const [aeFormData, setAeFormData] = useState({
    trialId: 'trial-001',
    subjectId: '',
    siteId: '',
    seriousness: 'non-serious' as 'serious' | 'non-serious',
    causality: 'not-assessed' as ClinicalAdverseEvent['causality'],
    seriousnessCriteria: [] as ClinicalAdverseEvent['seriousnessCriteria'],
  });
  const [dsmbFormData, setDsmbFormData] = useState({
    trialId: 'trial-001',
    alertType: 'safety-concern' as DSMBAlert['alertType'],
    recommendation: '',
    affectedArms: [] as string[],
  });

  // v161: Cross-module event emission
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);

  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  // Filter by product/therapeutic area — hook is authoritative, prop is fallback
  const { filterByProductId, isFiltered: devIsFiltered } = useProductFilter();
  const matchingProductIds = useMemo(() => {
    if (devIsFiltered) {
      // Hook already knows the selected product ID — build the set from it
      return new Set(filterByProductId(products.map(p => ({ ...p, productId: p.id }))).map(p => p.id));
    }
    // Fallback: use filters prop for TA/stage cross-filters
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    return new Set(filtered.map(p => p.id));
  }, [filters, products, devIsFiltered, filterByProductId]);

  // Use clinical-data trials as primary source
  const filteredTrials = useMemo(() => {
    return clinicalTrials.filter(t => !matchingProductIds || matchingProductIds.has(t.productId));
  }, [matchingProductIds]);

  const filteredPrograms = useMemo(() => clinicalPrograms.filter(p => !matchingProductIds || matchingProductIds.has(p.productId)), [matchingProductIds]);

  // Aggregate metrics from clinical trials
  const totalEnrolled = filteredTrials.reduce((sum, t) => sum + t.enrolledSubjects, 0);
  const totalTarget = filteredTrials.reduce((sum, t) => sum + t.targetEnrollment, 0);
  const totalSites = filteredTrials.reduce((sum, t) => sum + t.totalSites, 0);
  const activeSites = filteredTrials.reduce((sum, t) => sum + t.activeSites, 0);
  const avgTMF = Math.round(filteredTrials.reduce((sum, t) => sum + t.tmfCompleteness, 0) / (filteredTrials.length || 1));

  const getProduct = (productId: string) => products.find(p => p.id === productId);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'planning': 'bg-slate-500/20 text-slate-400', 'startup': 'bg-accent-purple/20 text-accent-purple',
      'enrolling': 'bg-accent-blue/20 text-accent-blue', 'active': 'bg-accent-green/20 text-accent-green',
      'follow-up': 'bg-accent-amber/20 text-accent-amber', 'completing': 'bg-accent-teal/20 text-accent-teal',
      'completed': 'bg-accent-green/20 text-accent-green', 'on-hold': 'bg-accent-red/20 text-accent-red',
      'on-track': 'bg-accent-green/20 text-accent-green', 'at-risk': 'bg-accent-amber/20 text-accent-amber',
      'delayed': 'bg-accent-red/20 text-accent-red', 'pending': 'bg-slate-500/20 text-slate-400',
      'achieved': 'bg-accent-green/20 text-accent-green', 'monitoring': 'bg-accent-blue/20 text-accent-blue',
      'investigating': 'bg-accent-amber/20 text-accent-amber', 'mitigated': 'bg-accent-teal/20 text-accent-teal',
      'in-progress': 'bg-accent-blue/20 text-accent-blue', 'overdue': 'bg-accent-red/20 text-accent-red',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'bg-accent-green/20 text-accent-green border-accent-green/30',
      medium: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
      high: 'bg-accent-red/20 text-accent-red border-accent-red/30',
      critical: 'bg-accent-red text-white border-accent-red',
    };
    return colors[risk] || colors.low;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-accent-green';
    if (percent >= 70) return 'bg-accent-blue';
    if (percent >= 50) return 'bg-accent-amber';
    return 'bg-accent-red';
  };

  const getMilestoneIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      enrollment: <Users className="w-4 h-4" />, lock: <Lock className="w-4 h-4" />,
      unblind: <Eye className="w-4 h-4" />, csr: <FileText className="w-4 h-4" />,
      submission: <ArrowRight className="w-4 h-4" />,
    };
    return icons[type] || <Calendar className="w-4 h-4" />;
  };

  const toggleTrialExpand = (trialId: string) => {
    const newExpanded = new Set(expandedTrials);
    if (newExpanded.has(trialId)) newExpanded.delete(trialId);
    else newExpanded.add(trialId);
    setExpandedTrials(newExpanded);
  };

  const handleViewTrial = (trial: ClinicalTrial) => {
    setSelectedTrial(trial);
    setActiveView('trial-detail');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="development"
        title="Clinical Development"
        subtitle="Clinical programs, study planning, development operations, and pipeline oversight"
        icon={<Activity className="w-5 h-5" />}
      />
      {/* Navigation Tabs */}
      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        {/* Scrollable tab area */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
          {([
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'programs', icon: Layers, label: 'Programs' },
            { id: 'trials', icon: FlaskConical, label: 'Trials' },
            { id: 'sites', icon: MapPin, label: 'Sites' },
            { id: 'enrollment', icon: Users, label: 'Enrollment' },
            { id: 'endpoints', icon: Target, label: 'Endpoints' },
            { id: 'safety-events', icon: AlertTriangle, label: 'Safety Events' },
            { id: 'data', icon: Database, label: 'Data' },
            { id: 'ctms', icon: ClipboardList, label: 'CTMS' },
            { id: 'tmf', icon: FolderArchive, label: 'TMF' },
            { id: 'budgets', icon: DollarSign, label: 'Budgets' },
          ] as { id: DevelopmentView; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button 
              key={id} 
              onClick={() => { setActiveView(id); setSelectedTrial(null); }}
              className={`px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === id || (activeView === 'trial-detail' && id === 'trials')
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
          </div>
        </div>
        {/* Pinned actions — always visible */}
        <div className="flex items-center flex-shrink-0 pl-2 border-l border-border/50">
          {activeView === 'safety-events' ? (
            <button 
              onClick={() => setShowReportAEModal(true)}
              className="px-3 sm:px-4 py-2 bg-accent-red text-white rounded-lg text-sm flex items-center gap-2 hover:bg-accent-red/90 whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4" /><span className="hidden sm:inline">Report AE</span>
            </button>
          ) : (
            <button className="px-3 sm:px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2 whitespace-nowrap" onClick={() => toast.success('Development action recorded — timeline updated')}>
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Study</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* OVERVIEW */}
        {activeView === 'overview' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Clinical Development</h1>
                <p className="text-sm text-text-muted mt-1">Programs, trials, sites, and study operations</p>
              </div>

              {/* Top-level metrics - v121: migrated to StatCard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard
                  label="Programs"
                  value={filteredPrograms.length}
                  icon={<Layers className="w-5 h-5" />}
                  accentColor="purple"
                />
                <StatCard
                  label="Trials"
                  value={filteredTrials.length}
                  icon={<FlaskConical className="w-5 h-5" />}
                  accentColor="blue"
                />
                <StatCard
                  label="Enrolled"
                  value={totalEnrolled.toLocaleString()}
                  icon={<Users className="w-5 h-5" />}
                  accentColor="green"
                  trend={{ value: Math.round((totalEnrolled / totalTarget) * 100), direction: 'up' }}
                />
                <StatCard
                  label="Active Sites"
                  value={activeSites}
                  icon={<MapPin className="w-5 h-5" />}
                  accentColor="amber"
                />
                <StatCard
                  label="TMF Complete"
                  value={`${avgTMF}%`}
                  icon={<FolderArchive className="w-5 h-5" />}
                  accentColor="teal"
                />
                <StatCard
                  label="Next Milestone"
                  value="DB Lock"
                  icon={<Timer className="w-5 h-5" />}
                  accentColor="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Active Trials - v121: migrated to Card */}
                <Card variant="elevated" padding="lg" radius="lg" className="col-span-1 md:col-span-2">
                  <CardHeader title="Active Trials" icon={<FlaskConical className="w-5 h-5 text-accent-blue" />} />
                  <CardContent>
                    <div className="space-y-3">
                      {filteredTrials.filter(t => t.status !== 'completed').slice(0, 4).map(trial => {
                        const enrollPct = Math.round((trial.enrolledSubjects / trial.targetEnrollment) * 100);
                        return (
                          <Card key={trial.id} variant="ghost" padding="md" radius="md" className="hover:bg-surface-card/80 cursor-pointer" onClick={() => handleViewTrial(trial)}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="text-sm font-medium text-accent-blue">{trial.protocolNumber}</span>
                                <div className="text-sm text-text-primary mt-0.5">{trial.shortTitle}</div>
                              </div>
                              {getDevelopmentStatusBadge(trial.status, 'xs')}
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex-1">
                                <LabeledProgress
                                  label="Enrollment"
                                  value={trial.enrolledSubjects}
                                  max={trial.targetEnrollment}
                                  size="sm"
                                  color={enrollPct >= 75 ? 'green' : enrollPct >= 50 ? 'blue' : 'amber'}
                                />
                              </div>
                              <div className="text-xs text-text-muted">{trial.activeSites} sites</div>
                              <div className="text-xs text-text-muted">{trial.countries.length} countries</div>
                            </div>
                          </Card>
                        );
                      })}
                      {filteredTrials.filter(t => t.status !== 'completed').length === 0 && (
                        <EmptyState type="no-data" size="sm" title="No active trials" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Milestones - v121: migrated to Card */}
                <Card variant="elevated" padding="lg" radius="lg">
                  <CardHeader title="Upcoming Milestones" icon={<Target className="w-5 h-5 text-accent-purple" />} />
                  <CardContent>
                    <div className="space-y-3">
                      {dataMilestones.filter(m => m.status !== 'completed').slice(0, 5).map(milestone => (
                        <Card key={milestone.id} variant="ghost" padding="sm" radius="md">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-6 h-6 rounded flex items-center justify-center ${getStatusColor(milestone.status)}`}>
                              {getMilestoneIcon(milestone.type)}
                            </span>
                            <span className="text-sm font-medium text-text-primary">{milestone.milestone}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-text-muted ml-8">
                            <span>{milestone.study}</span>
                            <span>{milestone.plannedDate}</span>
                          </div>
                        </Card>
                      ))}
                      {dataMilestones.filter(m => m.status !== 'completed').length === 0 && (
                        <EmptyState type="no-data" size="sm" title="No upcoming milestones" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Safety Signals Integration */}
              {clinicalSafetyLinks.length > 0 && (
                <div className="mt-6 bg-gradient-to-br from-accent-red/10 to-accent-amber/10 border border-accent-red/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-accent-red" />
                    <span className="text-sm font-semibold text-accent-red">Active Safety Signals</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {clinicalSafetyLinks.slice(0, 3).map(link => {
                      const trial = getTrialById(link.trialId);
                      return (
                        <div key={`${link.trialId}-${link.signalId}`} className="bg-surface-card/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-primary">{link.signalName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded capitalize ${getStatusColor(link.status)}`}>{link.status}</span>
                          </div>
                          <div className="text-xs text-text-muted">{trial?.shortTitle} - {link.eventCount} events</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div className="mt-6 bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  <span className="text-sm font-semibold text-accent-purple">AI Development Insights</span>
                </div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>- LIGATURE-1 enrollment exceeded target by 20 days ahead of schedule</p>
                  <p>- Site 003 (MD Anderson) showing 15% higher screening success rate than average</p>
                  <p>- Database lock on track for Jan 15 - all queries resolved at top 10 sites</p>
                  <p>- LIGATURE-2 enrollment may benefit from additional EU sites based on screening patterns</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROGRAMS */}
        {activeView === 'programs' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Clinical Programs</h1>
                <p className="text-sm text-text-muted mt-1">Program-level view of clinical development</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredPrograms.map(program => {
                  const enrollPct = Math.round((program.enrolledTotal / program.targetTotal) * 100);
                  return (
                    <div key={program.id} className="bg-surface-elevated border border-border rounded-lg p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-text-primary">{program.product}</h3>
                            <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple">{program.phase}</span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">{program.indication}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(program.status)}`}>{program.status}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                        <div className="text-center p-3 bg-surface-card rounded-lg">
                          <div className="text-2xl font-bold text-text-primary">{program.studies}</div>
                          <div className="text-xs text-text-muted">Studies</div>
                        </div>
                        <div className="text-center p-3 bg-surface-card rounded-lg">
                          <div className="text-2xl font-bold text-accent-green">{program.enrolledTotal}</div>
                          <div className="text-xs text-text-muted">Enrolled</div>
                        </div>
                        <div className="text-center p-3 bg-surface-card rounded-lg">
                          <div className="text-2xl font-bold text-text-primary">{enrollPct}%</div>
                          <div className="text-xs text-text-muted">Complete</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="text-sm"><span className="text-text-muted">Next:</span> <span className="text-text-primary font-medium">{program.nextMilestone}</span></div>
                        <div className="text-sm text-accent-blue">{program.nextMilestoneDate}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TRIALS */}
        {activeView === 'trials' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Clinical Trials</h1>
                  <p className="text-sm text-text-muted mt-1">Trial-level management and tracking</p>
                </div>
              </div>
              <div className="space-y-4">
                {filteredTrials.map(trial => {
                  const isExpanded = expandedTrials.has(trial.id);
                  const enrollPct = Math.round((trial.enrolledSubjects / trial.targetEnrollment) * 100);
                  const safetyLinks = getSafetyLinksByTrialId(trial.id);
                  const indLinks = getINDLinksByTrialId(trial.id);
                  const subLinks = getSubmissionLinksByTrialId(trial.id);
                  
                  return (
                    <div key={trial.id} className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                      <div 
                        className="p-5 cursor-pointer hover:bg-surface-card/50"
                        onClick={() => toggleTrialExpand(trial.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-accent-blue">{trial.protocolNumber}</h3>
                              <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple">{trial.phase}</span>
                              <span className={`text-xs px-2 py-0.5 rounded capitalize ${getStatusColor(trial.status)}`}>{trial.status}</span>
                              <span className={`text-xs px-2 py-0.5 rounded border ${getRiskColor(trial.riskScore)}`}>{trial.riskScore} risk</span>
                            </div>
                            <p className="text-sm text-text-primary mt-1">{trial.title}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                        </div>
                        
                        <div className="flex items-center gap-8 mt-4">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1 w-48">
                              <span className="text-text-muted">Enrollment</span>
                              <span className="text-text-primary">{trial.enrolledSubjects}/{trial.targetEnrollment} ({enrollPct}%)</span>
                            </div>
                            <div className="w-48 h-2 bg-surface-card rounded-full overflow-hidden">
                              <div className={`h-full ${getProgressColor(enrollPct)}`} style={{ width: `${enrollPct}%` }} />
                            </div>
                          </div>
                          <div className="text-sm text-text-muted"><span className="text-text-primary font-medium">{trial.activeSites}</span> active sites</div>
                          <div className="text-sm text-text-muted"><span className="text-text-primary font-medium">{trial.countries.length}</span> countries</div>
                          <div className="text-sm text-text-muted">TMF: <span className="text-text-primary font-medium">{trial.tmfCompleteness}%</span></div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-5 bg-surface-card/30">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                            {/* Study Arms */}
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-3">Study Arms</h4>
                              <div className="space-y-2">
                                {trial.arms.map(arm => (
                                  <div key={arm.id} className="p-2 bg-surface-card rounded">
                                    <div className="text-sm text-text-primary">{arm.name}</div>
                                    <div className="text-xs text-text-muted">{arm.subjects}/{arm.targetSubjects} subjects</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Key Dates */}
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-3">Key Dates</h4>
                              <div className="space-y-2 text-sm">
                                {trial.firstPatientIn && <div className="flex justify-between"><span className="text-text-muted">FPI:</span><span className="text-text-primary">{trial.firstPatientIn}</span></div>}
                                {trial.lastPatientIn && <div className="flex justify-between"><span className="text-text-muted">LPI:</span><span className="text-text-primary">{trial.lastPatientIn}</span></div>}
                                {trial.databaseLockDate && <div className="flex justify-between"><span className="text-text-muted">DBL:</span><span className="text-accent-blue">{trial.databaseLockDate}</span></div>}
                              </div>
                            </div>

                            {/* Performance */}
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-3">Performance</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-text-muted">Query Rate:</span><span className="text-text-primary">{trial.queryRate}/100</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Deviation Rate:</span><span className="text-text-primary">{trial.protocolDeviationRate}%</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Data Lag:</span><span className="text-text-primary">{trial.dataEntryLag} days</span></div>
                              </div>
                            </div>

                            {/* Connected Modules */}
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-3">Connected Modules</h4>
                              <div className="space-y-2">
                                {safetyLinks.length > 0 && (
                                  <button className="w-full p-2 bg-accent-red/10 border border-accent-red/30 rounded text-left text-sm flex items-center gap-2" onClick={() => toast.success('Development action recorded — timeline updated')}>
                                    <Shield className="w-4 h-4 text-accent-red" />
                                    <span className="text-text-primary">{safetyLinks.length} Safety Signals</span>
                                  </button>
                                )}
                                {indLinks.length > 0 && (
                                  <button className="w-full p-2 bg-accent-green/10 border border-accent-green/30 rounded text-left text-sm flex items-center gap-2" onClick={() => toast.success('Development action recorded — timeline updated')}>
                                    <FileText className="w-4 h-4 text-accent-green" />
                                    <span className="text-text-primary">{indLinks.length} IND Docs</span>
                                  </button>
                                )}
                                {subLinks.length > 0 && (
                                  <button className="w-full p-2 bg-accent-amber/10 border border-accent-amber/30 rounded text-left text-sm flex items-center gap-2" onClick={() => toast.success('Development action recorded — timeline updated')}>
                                    <Package className="w-4 h-4 text-accent-amber" />
                                    <span className="text-text-primary">{subLinks.length} Submissions</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end mt-4">
                            <button onClick={() => handleViewTrial(trial)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2">
                              View Full Details <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SITES */}
        {activeView === 'sites' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Clinical Sites</h1>
                  <p className="text-sm text-text-muted mt-1">Site performance and enrollment tracking</p>
                </div>
                <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
                  <option value="all">All Trials</option>
                  {filteredTrials.map(t => <option key={t.id} value={t.id}>{t.shortTitle}</option>)}
                </select>
              </div>
              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Site</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Trial</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">PI</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Location</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Enrolled</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Performance</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicalSites
                      .filter(s => siteFilter === 'all' || s.trialId === siteFilter)
                      .filter(s => {
                        const trial = getTrialById(s.trialId);
                        return trial && (!matchingProductIds || matchingProductIds.has(trial.productId));
                      })
                      .map(site => {
                        const trial = getTrialById(site.trialId);
                        const enrollPct = Math.round((site.enrolledSubjects / site.targetEnrollment) * 100);
                        const countryFlag = site.address.countryCode === 'US' ? '🇺🇸' : site.address.countryCode === 'DE' ? '🇩🇪' : site.address.countryCode === 'FR' ? '🇫🇷' : site.address.countryCode === 'JP' ? '🇯🇵' : '🌍';
                        return (
                          <tr key={site.id} className="border-b border-border/50 hover:bg-surface-card/50">
                            <td className="p-4">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{site.name}</p>
                                <p className="text-xs text-text-muted">Site {site.siteNumber}</p>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-accent-blue">{trial?.shortTitle}</td>
                            <td className="p-4 text-sm text-text-primary">{site.principalInvestigator}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{countryFlag}</span>
                                <span className="text-sm text-text-muted">{site.address.city}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-surface-card rounded-full">
                                  <div className={`h-2 rounded-full ${getProgressColor(enrollPct)}`} style={{ width: `${enrollPct}%` }} />
                                </div>
                                <span className="text-sm text-text-muted">{site.enrolledSubjects}/{site.targetEnrollment}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-sm font-medium ${site.performanceScore >= 90 ? 'text-accent-green' : site.performanceScore >= 75 ? 'text-accent-blue' : site.performanceScore >= 60 ? 'text-accent-amber' : 'text-accent-red'}`}>
                                {site.performanceScore}%
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs border ${getRiskColor(site.riskLevel)}`}>{site.riskLevel}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ENROLLMENT */}
        {activeView === 'enrollment' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Enrollment Tracking</h1>
                <p className="text-sm text-text-muted mt-1">Enrollment progress and milestones across trials</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredTrials.map(trial => {
                  const milestones = getEnrollmentMilestonesByTrialId(trial.id);
                  const enrollPct = Math.round((trial.enrolledSubjects / trial.targetEnrollment) * 100);
                  return (
                    <div key={trial.id} className="bg-surface-elevated border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">{trial.shortTitle}</h3>
                          <p className="text-sm text-text-muted">{trial.protocolNumber}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${getStatusColor(trial.status)}`}>{trial.status}</span>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-text-muted">Enrollment Progress</span>
                          <span className="font-medium text-text-primary">{trial.enrolledSubjects}/{trial.targetEnrollment} ({enrollPct}%)</span>
                        </div>
                        <div className="w-full bg-surface-card rounded-full h-3">
                          <div className={`h-3 rounded-full ${getProgressColor(enrollPct)}`} style={{ width: `${enrollPct}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {milestones.slice(0, 5).map(milestone => (
                          <div key={milestone.id} className="flex items-center gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full ${
                              milestone.status === 'completed' ? 'bg-accent-green' : 
                              milestone.status === 'on-track' ? 'bg-accent-blue' : 
                              milestone.status === 'at-risk' ? 'bg-accent-amber' : 
                              milestone.status === 'delayed' ? 'bg-accent-red' : 'bg-slate-400'
                            }`} />
                            <span className="flex-1 text-text-primary">{milestone.milestone}</span>
                            <span className="text-text-muted">{milestone.actualDate || milestone.targetDate}</span>
                            {milestone.status === 'completed' && <CheckCircle className="w-4 h-4 text-accent-green" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ENDPOINTS */}
        {activeView === 'endpoints' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Study Endpoints</h1>
                <p className="text-sm text-text-muted mt-1">Primary and secondary endpoint tracking</p>
              </div>
              <div className="space-y-4 md:space-y-6">
                {filteredTrials.map(trial => (
                  <div key={trial.id} className="bg-surface-elevated border border-border rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-text-primary">{trial.shortTitle}</h3>
                      <span className="text-sm text-text-muted">{trial.phase}</span>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${getStatusColor(trial.status)}`}>{trial.status}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {trial.endpoints.map(endpoint => (
                        <div key={endpoint.id} className="p-4 bg-surface-card rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                endpoint.type === 'primary' ? 'bg-accent-blue/20 text-accent-blue' :
                                endpoint.type === 'secondary' ? 'bg-accent-purple/20 text-accent-purple' :
                                endpoint.type === 'safety' ? 'bg-accent-red/20 text-accent-red' : 'bg-slate-500/20 text-slate-400'
                              }`}>{endpoint.type}</span>
                              <span className="font-medium text-text-primary">{endpoint.name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(endpoint.status)}`}>{endpoint.status}</span>
                          </div>
                          <p className="text-sm text-text-muted mb-2">{endpoint.description}</p>
                          {(endpoint.targetValue || endpoint.currentValue) && (
                            <div className="flex items-center gap-4 text-sm pt-2 border-t border-border">
                              {endpoint.targetValue && <span className="text-text-muted">Target: <span className="text-text-primary font-medium">{endpoint.targetValue}</span></span>}
                              {endpoint.currentValue && <span className="text-text-muted">Result: <span className="text-accent-green font-medium">{endpoint.currentValue}</span></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DATA MILESTONES */}
        {activeView === 'data' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Data Milestones</h1>
                  <p className="text-sm text-text-muted mt-1">Database locks, unblinding, and CSR timelines</p>
                </div>
              </div>
              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Milestone</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Study</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Type</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Planned</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Actual</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataMilestones.map(milestone => (
                      <tr key={milestone.id} className="border-b border-border/50 hover:bg-surface-card/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center ${getStatusColor(milestone.status)}`}>
                              {getMilestoneIcon(milestone.type)}
                            </span>
                            <span className="text-sm font-medium text-text-primary">{milestone.milestone}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-accent-blue">{milestone.study}</td>
                        <td className="p-4 text-sm text-text-muted capitalize">{milestone.type}</td>
                        <td className="p-4 text-sm text-text-primary">{milestone.plannedDate}</td>
                        <td className="p-4 text-sm text-text-primary">{milestone.actualDate || '-'}</td>
                        <td className="p-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(milestone.status)}`}>{milestone.status}</span>
                        </td>
                        <td className="p-4 text-sm text-text-muted">{milestone.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CTMS */}
        {activeView === 'ctms' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">CTMS Tasks</h1>
                  <p className="text-sm text-text-muted mt-1">Clinical trial management system task tracking</p>
                </div>
              </div>
              
              {/* CTMS Stats - v121: migrated to StatCard */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard
                  label="Overdue"
                  value={ctmsTasks.filter(t => t.status === 'overdue').length}
                  icon={<AlertCircle className="w-5 h-5" />}
                  accentColor="red"
                />
                <StatCard
                  label="In Progress"
                  value={ctmsTasks.filter(t => t.status === 'in-progress').length}
                  icon={<Activity className="w-5 h-5" />}
                  accentColor="blue"
                />
                <StatCard
                  label="Pending"
                  value={ctmsTasks.filter(t => t.status === 'pending').length}
                  icon={<Clock className="w-5 h-5" />}
                />
                <StatCard
                  label="Completed"
                  value={ctmsTasks.filter(t => t.status === 'completed').length}
                  icon={<CheckCircle className="w-5 h-5" />}
                  accentColor="green"
                />
              </div>

              {/* CTMS Task Table - v121: migrated to Card */}
              <Card variant="elevated" padding="none" radius="lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Task</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Study</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Category</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Site</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Assignee</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Due Date</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctmsTasks.map(task => (
                      <tr key={task.id} className="border-b border-border/50 hover:bg-surface-card/50">
                        <td className="p-4 text-sm font-medium text-text-primary">{task.task}</td>
                        <td className="p-4 text-sm text-accent-blue">{task.study}</td>
                        <td className="p-4 text-sm text-text-muted capitalize">{task.category}</td>
                        <td className="p-4 text-sm text-text-muted">{task.site || '-'}</td>
                        <td className="p-4 text-sm text-text-primary">{task.assignee}</td>
                        <td className="p-4 text-sm text-text-muted">{task.dueDate}</td>
                        <td className="p-4 text-center">
                          {getDevelopmentStatusBadge(task.status, 'xs')}
                        </td>
                      </tr>
                    ))}
                    {ctmsTasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8">
                          <EmptyState type="no-data" size="sm" title="No CTMS tasks" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* TMF */}
        {activeView === 'tmf' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Trial Master File</h1>
                <p className="text-sm text-text-muted mt-1">TMF completeness by zone (DIA TMF Reference Model)</p>
              </div>
              {/* TMF Zones - v121: migrated to Card */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                {tmfSections.map(section => (
                  <Card key={section.id} variant="elevated" padding="md" radius="lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-text-primary">{section.zoneName}</span>
                      <Badge color="gray" size="xs">Zone {section.sectionNumber}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-text-primary mb-2">{section.completeness}%</div>
                    <ProgressBar 
                      value={section.completeness} 
                      max={100} 
                      size="sm" 
                      color={section.completeness >= 90 ? 'green' : section.completeness >= 70 ? 'blue' : 'amber'} 
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-2">
                      <span>{section.artifactCount} artifacts</span>
                      <span>{section.criticalComplete}/{section.criticalArtifacts} critical</span>
                    </div>
                  </Card>
                ))}
              </div>
              {/* TMF Inspection Readiness - v121: migrated to Card */}
              <Card variant="ghost" padding="lg" radius="lg" className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  <span className="text-sm font-semibold text-accent-purple">TMF Inspection Readiness</span>
                </div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>- Zone 4 (IRB/Ethics) at 78% - 10 site approvals pending upload</p>
                  <p>- Zone 8 (Statistics) needs SAP and SDTM specifications before DBL</p>
                  <p>- 14 monitoring visit reports overdue across 8 sites</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* BUDGETS */}
        {activeView === 'budgets' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Study Budgets</h1>
                  <p className="text-sm text-text-muted mt-1">Financial tracking and forecasting by study</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    const csvContent = [
                      ['Study', 'Category', 'Budgeted', 'Actual', 'Forecast', 'Variance %'].join(','),
                      ...studyBudgets.map(b => [
                        b.study,
                        b.category,
                        b.budgeted,
                        b.actual,
                        b.forecast,
                        b.variance
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = `study-budgets-${new Date().toISOString().split('T')[0]}.csv`;
                    window.document.body.appendChild(a);
                    a.click();
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export Report
                </Button>
              </div>

              {/* Budget Stats - v121: migrated to StatCard */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard
                  label="Total Budget"
                  value={`$${(studyBudgets.reduce((sum, b) => sum + b.budgeted, 0) / 1000000).toFixed(1)}M`}
                  icon={<DollarSign className="w-5 h-5" />}
                  accentColor="blue"
                />
                <StatCard
                  label="Actual Spend"
                  value={`$${(studyBudgets.reduce((sum, b) => sum + b.actual, 0) / 1000000).toFixed(1)}M`}
                  icon={<BarChart3 className="w-5 h-5" />}
                  accentColor="green"
                />
                <StatCard
                  label="Forecast"
                  value={`$${(studyBudgets.reduce((sum, b) => sum + b.forecast, 0) / 1000000).toFixed(1)}M`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accentColor="purple"
                />
                <StatCard
                  label="Avg Variance"
                  value={`${(studyBudgets.reduce((sum, b) => sum + b.variance, 0) / studyBudgets.length).toFixed(1)}%`}
                  icon={<Target className="w-5 h-5" />}
                  accentColor="amber"
                />
              </div>

              {/* Budget Table - v121: migrated to Card */}
              <Card variant="elevated" padding="none" radius="lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Study</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Category</th>
                      <th className="text-right p-4 text-xs font-medium text-text-muted">Budgeted</th>
                      <th className="text-right p-4 text-xs font-medium text-text-muted">Actual</th>
                      <th className="text-right p-4 text-xs font-medium text-text-muted">Forecast</th>
                      <th className="text-right p-4 text-xs font-medium text-text-muted">Variance</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted w-32">Spend Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studyBudgets.map(budget => {
                      const spendPct = Math.round((budget.actual / budget.budgeted) * 100);
                      return (
                        <tr key={budget.id} className="border-b border-border/50 hover:bg-surface-card/50">
                          <td className="p-4 text-sm text-accent-blue">{budget.study}</td>
                          <td className="p-4 text-sm text-text-primary">{budget.category}</td>
                          <td className="p-4 text-sm text-text-muted text-right">${(budget.budgeted / 1000000).toFixed(2)}M</td>
                          <td className="p-4 text-sm text-text-muted text-right">${(budget.actual / 1000000).toFixed(2)}M</td>
                          <td className="p-4 text-sm text-text-muted text-right">${(budget.forecast / 1000000).toFixed(2)}M</td>
                          <td className="p-4 text-right">
                            <Badge color={budget.variance >= 0 ? 'green' : 'red'} size="sm">
                              {budget.variance >= 0 ? '+' : ''}{budget.variance.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-4">
                            <ProgressBar
                              value={budget.actual}
                              max={budget.budgeted}
                              size="sm"
                              color={spendPct > 90 ? 'amber' : 'blue'}
                              showLabel={true}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {studyBudgets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8">
                          <EmptyState type="no-data" size="sm" title="No budget data" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* TRIAL DETAIL */}
        {activeView === 'trial-detail' && selectedTrial && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <button 
                onClick={() => { setActiveView('trials'); setSelectedTrial(null); }}
                className="mb-4 text-sm text-accent-blue hover:underline flex items-center gap-1"
              >
                ← Back to Trials
              </button>
              
              <div className="bg-surface-elevated border border-border rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary">{selectedTrial.shortTitle}</h1>
                    <p className="text-sm text-text-muted mt-1">{selectedTrial.title}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm font-medium text-accent-blue">{selectedTrial.protocolNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple">{selectedTrial.phase}</span>
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${getStatusColor(selectedTrial.status)}`}>{selectedTrial.status}</span>
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded border ${getRiskColor(selectedTrial.riskScore)}`}>
                    {selectedTrial.riskScore.toUpperCase()} RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                  <div className="text-center p-4 bg-surface-card rounded-lg">
                    <div className="text-2xl font-bold text-accent-green">{selectedTrial.enrolledSubjects}</div>
                    <div className="text-xs text-text-muted">Enrolled</div>
                  </div>
                  <div className="text-center p-4 bg-surface-card rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{selectedTrial.targetEnrollment}</div>
                    <div className="text-xs text-text-muted">Target</div>
                  </div>
                  <div className="text-center p-4 bg-surface-card rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{selectedTrial.activeSites}</div>
                    <div className="text-xs text-text-muted">Active Sites</div>
                  </div>
                  <div className="text-center p-4 bg-surface-card rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{selectedTrial.countries.length}</div>
                    <div className="text-xs text-text-muted">Countries</div>
                  </div>
                  <div className="text-center p-4 bg-surface-card rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{selectedTrial.tmfCompleteness}%</div>
                    <div className="text-xs text-text-muted">TMF Complete</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Study Arms */}
                <div className="bg-surface-elevated border border-border rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Study Arms</h3>
                  <div className="space-y-3">
                    {selectedTrial.arms.map(arm => {
                      const pct = Math.round((arm.subjects / arm.targetSubjects) * 100);
                      return (
                        <div key={arm.id} className="p-3 bg-surface-card rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text-primary">{arm.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              arm.treatmentType === 'experimental' ? 'bg-accent-blue/20 text-accent-blue' :
                              arm.treatmentType === 'comparator' ? 'bg-accent-amber/20 text-accent-amber' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>{arm.treatmentType}</span>
                          </div>
                          <p className="text-xs text-text-muted mb-2">{arm.description}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-surface rounded-full">
                              <div className={`h-2 rounded-full ${getProgressColor(pct)}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-text-muted">{arm.subjects}/{arm.targetSubjects}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Endpoints */}
                <div className="bg-surface-elevated border border-border rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Endpoints</h3>
                  <div className="space-y-3">
                    {selectedTrial.endpoints.map(endpoint => (
                      <div key={endpoint.id} className="p-3 bg-surface-card rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              endpoint.type === 'primary' ? 'bg-accent-blue/20 text-accent-blue' :
                              endpoint.type === 'secondary' ? 'bg-accent-purple/20 text-accent-purple' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>{endpoint.type}</span>
                            <span className="text-sm font-medium text-text-primary">{endpoint.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(endpoint.status)}`}>{endpoint.status}</span>
                        </div>
                        <p className="text-xs text-text-muted">{endpoint.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SAFETY EVENTS - v161 */}
        {activeView === 'safety-events' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Safety Events</h1>
                <p className="text-sm text-text-muted mt-1">Adverse event reporting and DSMB communications</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard
                  label="Total AEs"
                  value={clinicalAdverseEvents.length}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor="amber"
                />
                <StatCard
                  label="Serious AEs"
                  value={clinicalAdverseEvents.filter(ae => ae.seriousness === 'serious').length}
                  icon={<AlertCircle className="w-5 h-5" />}
                  accentColor="red"
                />
                <StatCard
                  label="Pending Review"
                  value={clinicalAdverseEvents.filter(ae => ae.status === 'new' || ae.status === 'under-review').length}
                  icon={<Clock className="w-5 h-5" />}
                  accentColor="blue"
                />
                <StatCard
                  label="Expedited"
                  value={clinicalAdverseEvents.filter(ae => ae.expeditedReporting).length}
                  icon={<Zap className="w-5 h-5" />}
                  accentColor="purple"
                />
                <StatCard
                  label="DSMB Alerts"
                  value={dsmbAlerts.filter(a => a.status === 'pending').length}
                  icon={<Bell className="w-5 h-5" />}
                  accentColor="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Recent AEs */}
                <Card variant="elevated" padding="lg" radius="lg" className="col-span-1 md:col-span-2">
                  <CardHeader 
                    title="Recent Adverse Events" 
                    icon={<AlertTriangle className="w-5 h-5 text-accent-amber" />}
                    action={
                      <button 
                        onClick={() => setShowReportAEModal(true)}
                        className="text-xs px-3 py-1.5 bg-accent-red text-white rounded-lg hover:bg-accent-red/90"
                      >
                        Report AE
                      </button>
                    }
                  />
                  <CardContent>
                    <div className="space-y-3">
                      {clinicalAdverseEvents.map(ae => (
                        <div 
                          key={ae.id} 
                          className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-surface-card/80 ${
                            ae.seriousness === 'serious' 
                              ? 'bg-accent-red/5 border-accent-red/30' 
                              : 'bg-surface-card border-border/50'
                          }`}
                          onClick={() => {
                            setSelectedAE(ae);
                            if (ae.seriousness === 'serious' && ae.status !== 'escalated') {
                              setShowEscalateSAEModal(true);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {ae.seriousness === 'serious' ? (
                                <AlertCircle className="w-4 h-4 text-accent-red" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-accent-amber" />
                              )}
                              <span className="text-sm font-medium text-text-primary">{ae.eventTerm}</span>
                              <Badge color={ae.seriousness === 'serious' ? 'red' : 'amber'} size="xs">
                                {ae.seriousness === 'serious' ? 'SAE' : 'AE'}
                              </Badge>
                              {ae.expeditedReporting && (
                                <Badge color="purple" size="xs">{ae.expeditedReporting}</Badge>
                              )}
                            </div>
                            <Badge 
                              color={
                                ae.status === 'new' ? 'blue' : 
                                ae.status === 'under-review' ? 'amber' : 
                                ae.status === 'escalated' ? 'red' : 'green'
                              } 
                              size="xs"
                            >
                              {ae.status.replace('-', ' ')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-xs text-text-muted">
                            <div>
                              <span className="text-text-secondary">Subject:</span> {ae.subjectId}
                            </div>
                            <div>
                              <span className="text-text-secondary">Trial:</span> {ae.trialName}
                            </div>
                            <div>
                              <span className="text-text-secondary">Site:</span> {ae.siteName}
                            </div>
                            <div>
                              <span className="text-text-secondary">Reported:</span> {ae.reportedDate}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-text-muted">
                              <span className="text-text-secondary">Causality:</span>{' '}
                              <span className={
                                ae.causality === 'certain' || ae.causality === 'probable' ? 'text-accent-red' :
                                ae.causality === 'possible' ? 'text-accent-amber' : 'text-text-muted'
                              }>
                                {ae.causality}
                              </span>
                            </span>
                            <span className="text-text-muted">
                              <span className="text-text-secondary">Outcome:</span> {ae.outcome}
                            </span>
                            <span className="text-text-muted">
                              <span className="text-text-secondary">MedDRA:</span> {ae.meddraSOC}
                            </span>
                          </div>
                          {ae.seriousness === 'serious' && ae.status !== 'escalated' && ae.status !== 'closed' && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAE(ae);
                                  setShowEscalateSAEModal(true);
                                }}
                                className="text-xs px-3 py-1.5 bg-accent-red text-white rounded-lg hover:bg-accent-red/90 flex items-center gap-1.5"
                              >
                                <Send className="w-3 h-3" />
                                Escalate to Safety
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column */}
                <div className="space-y-4 md:space-y-6">
                  {/* DSMB Alerts */}
                  <Card variant="elevated" padding="lg" radius="lg">
                    <CardHeader 
                      title="DSMB Communications" 
                      icon={<Shield className="w-5 h-5 text-accent-red" />}
                      action={
                        <button 
                          onClick={() => setShowDSMBAlertModal(true)}
                          className="text-xs px-3 py-1.5 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90"
                        >
                          New Alert
                        </button>
                      }
                    />
                    <CardContent>
                      {dsmbAlerts.length > 0 ? (
                        <div className="space-y-3">
                          {dsmbAlerts.map(alert => (
                            <div key={alert.id} className="p-3 bg-accent-red/5 border border-accent-red/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge color="red" size="xs">{alert.alertType.replace('-', ' ')}</Badge>
                                <Badge 
                                  color={alert.status === 'pending' ? 'amber' : alert.status === 'acknowledged' ? 'blue' : 'green'} 
                                  size="xs"
                                >
                                  {alert.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-text-primary mb-2">{alert.recommendation}</p>
                              <div className="flex items-center justify-between text-xs text-text-muted">
                                <span>{alert.trialName}</span>
                                <span>{alert.createdDate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState type="no-data" size="sm" title="No active DSMB alerts" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card variant="elevated" padding="lg" radius="lg">
                    <CardHeader title="Quick Actions" icon={<Zap className="w-5 h-5 text-accent-purple" />} />
                    <CardContent>
                      <div className="space-y-2">
                        <button 
                          onClick={() => setShowReportAEModal(true)}
                          className="w-full p-3 bg-surface-card rounded-lg border border-border/50 hover:border-accent-amber/50 transition-colors flex items-center gap-3 text-left"
                        >
                          <AlertTriangle className="w-5 h-5 text-accent-amber" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">Report Adverse Event</div>
                            <div className="text-xs text-text-muted">Log new AE from clinical site</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => setShowDSMBAlertModal(true)}
                          className="w-full p-3 bg-surface-card rounded-lg border border-border/50 hover:border-accent-red/50 transition-colors flex items-center gap-3 text-left"
                        >
                          <Siren className="w-5 h-5 text-accent-red" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">DSMB Safety Alert</div>
                            <div className="text-xs text-text-muted">Create urgent DSMB communication</div>
                          </div>
                        </button>
                        <button className="w-full p-3 bg-surface-card rounded-lg border border-border/50 hover:border-accent-blue/50 transition-colors flex items-center gap-3 text-left" onClick={() => toast.success('Development action recorded — timeline updated')}>
                          <BarChart3 className="w-5 h-5 text-accent-blue" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">Safety Analytics</div>
                            <div className="text-xs text-text-muted">View trends and signals</div>
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safety Links */}
                  <Card variant="elevated" padding="lg" radius="lg">
                    <CardHeader title="Linked Safety Signals" icon={<Link2 className="w-5 h-5 text-accent-teal" />} />
                    <CardContent>
                      <div className="space-y-2">
                        {clinicalSafetyLinks.slice(0, 3).map(link => (
                          <div key={link.signalId} className="p-3 bg-surface-card rounded-lg border border-border/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-text-primary">{link.signalName}</span>
                              <Badge 
                                color={link.status === 'investigating' ? 'amber' : link.status === 'confirmed' ? 'red' : 'blue'} 
                                size="xs"
                              >
                                {link.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-text-muted">
                              <span>{link.eventCount} events</span>
                              <span>Updated {link.lastUpdated}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REPORT AE MODAL - v161 */}
      {showReportAEModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-amber/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-accent-amber" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Report Adverse Event</h2>
                  <p className="text-xs text-text-muted">Log a new clinical adverse event</p>
                </div>
              </div>
              <button onClick={() => setShowReportAEModal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Trial & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Trial</label>
                  <select 
                    value={aeFormData.trialId}
                    onChange={(e) => setAeFormData({ ...aeFormData, trialId: e.target.value })}
                    className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  >
                    {clinicalTrials.map(t => (
                      <option key={t.id} value={t.id}>{t.shortTitle} ({t.protocolNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Subject ID</label>
                  <input 
                    type="text"
                    value={aeFormData.subjectId}
                    onChange={(e) => setAeFormData({ ...aeFormData, subjectId: e.target.value })}
                    placeholder="e.g., LIG-301-0142"
                    className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>
              </div>

              {/* MedDRA Term Search */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Adverse Event (MedDRA)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input 
                    type="text"
                    value={meddraSearch}
                    onChange={(e) => setMeddraSearch(e.target.value)}
                    placeholder="Search MedDRA terms..."
                    className="w-full pl-10 p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>
                {meddraSearch.length >= 2 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-lg bg-surface-card">
                    {searchMedDRA(meddraSearch).map(term => (
                      <button
                        key={term.ptCode}
                        onClick={() => {
                          setSelectedMedDRA(term);
                          setMeddraSearch(term.pt);
                        }}
                        className={`w-full p-2 text-left hover:bg-surface-elevated text-sm ${
                          selectedMedDRA?.ptCode === term.ptCode ? 'bg-accent-blue/10' : ''
                        }`}
                      >
                        <div className="font-medium text-text-primary">{term.pt}</div>
                        <div className="text-xs text-text-muted">{term.soc}</div>
                      </button>
                    ))}
                    {searchMedDRA(meddraSearch).length === 0 && (
                      <div className="p-3 text-sm text-text-muted">No matching terms found</div>
                    )}
                  </div>
                )}
                {selectedMedDRA && (
                  <div className="mt-2 p-2 bg-accent-blue/10 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{selectedMedDRA.pt}</div>
                      <div className="text-xs text-text-muted">{selectedMedDRA.soc} • Code: {selectedMedDRA.ptCode}</div>
                    </div>
                    <button onClick={() => { setSelectedMedDRA(null); setMeddraSearch(''); }}>
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                )}
              </div>

              {/* Seriousness */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Seriousness</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="seriousness" 
                      checked={aeFormData.seriousness === 'non-serious'}
                      onChange={() => setAeFormData({ ...aeFormData, seriousness: 'non-serious', seriousnessCriteria: [] })}
                      className="w-4 h-4 text-accent-blue"
                    />
                    <span className="text-sm text-text-primary">Non-Serious</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="seriousness" 
                      checked={aeFormData.seriousness === 'serious'}
                      onChange={() => setAeFormData({ ...aeFormData, seriousness: 'serious' })}
                      className="w-4 h-4 text-accent-red"
                    />
                    <span className="text-sm text-text-primary">Serious (SAE)</span>
                  </label>
                </div>
              </div>

              {/* Seriousness Criteria (if serious) */}
              {aeFormData.seriousness === 'serious' && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Seriousness Criteria</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'death', label: 'Death' },
                      { value: 'life-threatening', label: 'Life-Threatening' },
                      { value: 'hospitalization', label: 'Hospitalization' },
                      { value: 'disability', label: 'Disability' },
                      { value: 'congenital-anomaly', label: 'Congenital Anomaly' },
                      { value: 'other-serious', label: 'Other Medically Significant' },
                    ].map(criteria => (
                      <label key={criteria.value} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={aeFormData.seriousnessCriteria?.includes(criteria.value as any)}
                          onChange={(e) => {
                            const current = aeFormData.seriousnessCriteria || [];
                            if (e.target.checked) {
                              setAeFormData({ ...aeFormData, seriousnessCriteria: [...current, criteria.value as any] });
                            } else {
                              setAeFormData({ ...aeFormData, seriousnessCriteria: current.filter(c => c !== criteria.value) });
                            }
                          }}
                          className="w-4 h-4 text-accent-red rounded"
                        />
                        <span className="text-sm text-text-primary">{criteria.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Causality */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Causality Assessment</label>
                <select 
                  value={aeFormData.causality}
                  onChange={(e) => setAeFormData({ ...aeFormData, causality: e.target.value as any })}
                  className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                >
                  <option value="not-assessed">Not Assessed</option>
                  <option value="certain">Certain</option>
                  <option value="probable">Probable</option>
                  <option value="possible">Possible</option>
                  <option value="unlikely">Unlikely</option>
                </select>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-border bg-surface-card/50 flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {aeFormData.seriousness === 'serious' && (
                  <span className="flex items-center gap-1.5 text-accent-amber">
                    <AlertCircle className="w-4 h-4" />
                    SAE will create expedited reporting workflow in Safety module
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReportAEModal(false)} 
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (selectedMedDRA && aeFormData.subjectId) {
                      // Emit event based on seriousness
                      if (aeFormData.seriousness === 'serious') {
                        emitEvent(
                          'clinical-sae-escalated',
                          'clinical',
                          {
                            trialId: aeFormData.trialId,
                            trialName: clinicalTrials.find(t => t.id === aeFormData.trialId)?.shortTitle || '',
                            subjectId: aeFormData.subjectId,
                            eventTerm: selectedMedDRA.pt,
                            meddraCode: selectedMedDRA.ptCode,
                            meddraSOC: selectedMedDRA.soc,
                            seriousnessCriteria: aeFormData.seriousnessCriteria,
                            causality: aeFormData.causality,
                            expeditedTimeline: aeFormData.seriousnessCriteria?.includes('death') || 
                                               aeFormData.seriousnessCriteria?.includes('life-threatening') 
                                               ? '7-day' : '15-day',
                          },
                          { priority: 'critical', automated: true, requiresReview: true }
                        );
                      } else {
                        emitEvent(
                          'clinical-ae-reported',
                          'clinical',
                          {
                            trialId: aeFormData.trialId,
                            trialName: clinicalTrials.find(t => t.id === aeFormData.trialId)?.shortTitle || '',
                            subjectId: aeFormData.subjectId,
                            eventTerm: selectedMedDRA.pt,
                            meddraCode: selectedMedDRA.ptCode,
                            meddraSOC: selectedMedDRA.soc,
                            causality: aeFormData.causality,
                          },
                          { priority: 'medium', automated: true, requiresReview: false }
                        );
                      }
                      setShowReportAEModal(false);
                      setSelectedMedDRA(null);
                      setMeddraSearch('');
                      setAeFormData({
                        trialId: 'trial-001',
                        subjectId: '',
                        siteId: '',
                        seriousness: 'non-serious',
                        causality: 'not-assessed',
                        seriousnessCriteria: [],
                      });
                    }
                  }}
                  disabled={!selectedMedDRA || !aeFormData.subjectId}
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit AE Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE SAE MODAL - v161 */}
      {showEscalateSAEModal && selectedAE && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-lg border border-border">
            <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-red/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-accent-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Escalate to Safety</h2>
                  <p className="text-xs text-text-muted">Create expedited safety report</p>
                </div>
              </div>
              <button onClick={() => setShowEscalateSAEModal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              <div className="p-4 bg-accent-red/5 border border-accent-red/30 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-accent-red" />
                  <span className="text-sm font-medium text-text-primary">{selectedAE.eventTerm}</span>
                  <Badge color="red" size="xs">SAE</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div><span className="text-text-secondary">Subject:</span> {selectedAE.subjectId}</div>
                  <div><span className="text-text-secondary">Trial:</span> {selectedAE.trialName}</div>
                  <div><span className="text-text-secondary">Causality:</span> {selectedAE.causality}</div>
                  <div><span className="text-text-secondary">Onset:</span> {selectedAE.onsetDate}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Expedited Timeline</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="timeline" defaultChecked className="w-4 h-4 text-accent-red" />
                      <span className="text-sm text-text-primary">15-Day Report</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="timeline" className="w-4 h-4 text-accent-red" />
                      <span className="text-sm text-text-primary">7-Day Report (Fatal/Life-Threatening)</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-surface-card rounded-lg border border-border/50">
                  <h4 className="text-sm font-medium text-text-primary mb-2">Cross-Module Actions</h4>
                  <div className="space-y-2 text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                      <span>Create ICSR case in Safety module</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                      <span>Initiate expedited reporting workflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                      <span>Notify Regulatory Affairs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-border bg-surface-card/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowEscalateSAEModal(false)} 
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  emitEvent(
                    'clinical-sae-escalated',
                    'clinical',
                    {
                      trialId: selectedAE.trialId,
                      trialName: selectedAE.trialName,
                      subjectId: selectedAE.subjectId,
                      eventTerm: selectedAE.eventTerm,
                      meddraCode: selectedAE.meddraCode,
                      meddraSOC: selectedAE.meddraSOC,
                      seriousnessCriteria: selectedAE.seriousnessCriteria,
                      causality: selectedAE.causality,
                      expeditedTimeline: selectedAE.expeditedReporting || '15-day',
                      siteId: selectedAE.siteId,
                      siteName: selectedAE.siteName,
                    },
                    { priority: 'critical', automated: true, requiresReview: true }
                  );
                  setShowEscalateSAEModal(false);
                  setSelectedAE(null);
                }}
                className="px-6 py-2 bg-accent-red text-white rounded-lg text-sm hover:bg-accent-red/90 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Escalate SAE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DSMB ALERT MODAL - v161 */}
      {showDSMBAlertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-lg border border-border">
            <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-purple/20 rounded-lg">
                  <Shield className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">DSMB Safety Alert</h2>
                  <p className="text-xs text-text-muted">Create urgent DSMB communication</p>
                </div>
              </div>
              <button onClick={() => setShowDSMBAlertModal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Trial</label>
                <select 
                  value={dsmbFormData.trialId}
                  onChange={(e) => setDsmbFormData({ ...dsmbFormData, trialId: e.target.value })}
                  className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                >
                  {clinicalTrials.map(t => (
                    <option key={t.id} value={t.id}>{t.shortTitle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Alert Type</label>
                <select 
                  value={dsmbFormData.alertType}
                  onChange={(e) => setDsmbFormData({ ...dsmbFormData, alertType: e.target.value as any })}
                  className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                >
                  <option value="safety-concern">Safety Concern</option>
                  <option value="stopping-rule">Stopping Rule Triggered</option>
                  <option value="unblinding-request">Unblinding Request</option>
                  <option value="futility">Futility Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Recommendation</label>
                <textarea 
                  value={dsmbFormData.recommendation}
                  onChange={(e) => setDsmbFormData({ ...dsmbFormData, recommendation: e.target.value })}
                  placeholder="Describe the safety concern and recommended action..."
                  rows={4}
                  className="w-full p-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none"
                />
              </div>

              <div className="p-4 bg-accent-red/5 border border-accent-red/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-accent-red mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">This will trigger urgent notifications</span>
                </div>
                <div className="text-xs text-text-muted">
                  Safety, Regulatory, and Clinical Operations teams will be notified immediately.
                  A formal DSMB communication will be prepared for health authority submission.
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-border bg-surface-card/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowDSMBAlertModal(false)} 
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (dsmbFormData.recommendation) {
                    emitEvent(
                      'dsmb-safety-alert',
                      'clinical',
                      {
                        trialId: dsmbFormData.trialId,
                        trialName: clinicalTrials.find(t => t.id === dsmbFormData.trialId)?.shortTitle || '',
                        alertType: dsmbFormData.alertType,
                        recommendation: dsmbFormData.recommendation,
                        affectedArms: dsmbFormData.affectedArms,
                      },
                      { priority: 'critical', automated: false, requiresReview: true }
                    );
                    setShowDSMBAlertModal(false);
                    setDsmbFormData({
                      trialId: 'trial-001',
                      alertType: 'safety-concern',
                      recommendation: '',
                      affectedArms: [],
                    });
                  }
                }}
                disabled={!dsmbFormData.recommendation}
                className="px-6 py-2 bg-accent-red text-white rounded-lg text-sm hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Siren className="w-4 h-4" />
                Send DSMB Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
