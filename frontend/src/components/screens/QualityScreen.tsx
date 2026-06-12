
import { FilterState } from '@/components/layout/FilterBar';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Search,
  Plus,
  ChevronRight,
  Package,
  FlaskConical,
  ClipboardCheck,
  AlertCircle,
  TrendingUp,
  Calendar,
  User,
  Building2,
  Thermometer,
  Shield,
  XCircle
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge, BadgeColor } from '@/components/ui/Badge';
// v112: Use enhanced StatCard from Card.tsx via barrel export
// v126: Added Card, CardHeader, CardContent for full migration
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Card';
// v126: Skeleton components for loading states
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v116: Breadcrumb navigation
import { Breadcrumb } from '@/components/ui/Breadcrumb';
// v112: Cross-module navigation
import { useIncomingNavigation, QualityViewMode } from '@/hooks/useModuleNavigation';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';

type QualityView = 'overview' | 'changes' | 'deviations' | 'batches' | 'stability';

interface ChangeControl {
  id: string;
  title: string;
  type: 'process' | 'equipment' | 'supplier' | 'specification' | 'site';
  product: string;
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'closed';
  priority: 'critical' | 'major' | 'minor';
  initiatedDate: string;
  targetDate: string;
  owner: string;
  regulatoryImpact: boolean;
  impactedDocuments: string[];
}

interface Deviation {
  id: string;
  title: string;
  type: 'process' | 'equipment' | 'documentation' | 'environmental';
  product: string;
  batchNumber?: string;
  status: 'open' | 'investigating' | 'capa' | 'closed';
  severity: 'critical' | 'major' | 'minor';
  reportedDate: string;
  dueDate: string;
  assignee: string;
  rootCause?: string;
}

interface BatchRecord {
  id: string;
  batchNumber: string;
  product: string;
  site: string;
  status: 'in-progress' | 'pending-release' | 'released' | 'rejected' | 'quarantine';
  startDate: string;
  endDate?: string;
  yield?: number;
  deviations: number;
}

interface StabilityStudy {
  id: string;
  product: string;
  condition: string;
  protocol: string;
  status: 'ongoing' | 'completed' | 'on-hold';
  startDate: string;
  nextTimepoint: string;
  trend: 'stable' | 'watch' | 'oost';
}

// ============================================================================
// v109 Color Maps - QualityScreen
// ============================================================================

// Change Control & General Status color map
const qualityStatusColorMap: Record<string, BadgeColor> = {
  draft: 'gray',
  review: 'amber',
  approved: 'blue',
  implemented: 'green',
  closed: 'green',
  open: 'red',
  investigating: 'amber',
  capa: 'purple',
  'in-progress': 'blue',
  'pending-release': 'amber',
  released: 'green',
  rejected: 'red',
  quarantine: 'red',
  ongoing: 'blue',
  completed: 'green',
  'on-hold': 'gray',
};

// Priority/Severity color map
const priorityColorMap: Record<string, BadgeColor> = {
  critical: 'red',
  major: 'amber',
  minor: 'gray',
};

// Change type color map
const changeTypeColorMap: Record<string, BadgeColor> = {
  process: 'blue',
  equipment: 'purple',
  supplier: 'teal',
  specification: 'amber',
  site: 'cyan',
};

// Deviation type color map
const deviationTypeColorMap: Record<string, BadgeColor> = {
  process: 'blue',
  equipment: 'purple',
  documentation: 'amber',
  environmental: 'teal',
};

// Batch status color map
const batchStatusColorMap: Record<string, BadgeColor> = {
  'in-progress': 'blue',
  'pending-release': 'amber',
  released: 'green',
  rejected: 'red',
  quarantine: 'red',
};

// Stability trend color map
const stabilityTrendColorMap: Record<string, BadgeColor> = {
  stable: 'green',
  watch: 'amber',
  oost: 'red',
};

// ============================================================================
// v109 Badge Helpers - QualityScreen
// ============================================================================

export const getQualityStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={qualityStatusColorMap[status] || 'gray'} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

export const getPriorityBadge = (priority: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={priorityColorMap[priority] || 'gray'} size={size}>
    {priority}
  </Badge>
);

export const getChangeTypeBadge = (type: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={changeTypeColorMap[type] || 'gray'} size={size}>
    {type}
  </Badge>
);

export const getDeviationTypeBadge = (type: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={deviationTypeColorMap[type] || 'gray'} size={size}>
    {type}
  </Badge>
);

export const getBatchStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={batchStatusColorMap[status] || 'gray'} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

export const getStabilityTrendBadge = (trend: string, size: 'xs' | 'sm' = 'sm', showIcon: boolean = true) => {
  const icon = showIcon ? (
    trend === 'stable' ? <CheckCircle className="w-3 h-3" /> :
    trend === 'watch' ? <AlertTriangle className="w-3 h-3" /> :
    <AlertCircle className="w-3 h-3" />
  ) : undefined;
  
  return (
    <Badge color={stabilityTrendColorMap[trend] || 'gray'} size={size} icon={icon}>
      {trend === 'oost' ? 'OOS Trend' : trend}
    </Badge>
  );
};

// ============================================================================
// Mock Data
// ============================================================================

const changeControls: ChangeControl[] = [
  {
    id: 'CC-2024-001',
    title: 'Update dissolution method for LIG-2847 tablets',
    type: 'process',
    product: 'LIG-2847',
    status: 'review',
    priority: 'major',
    initiatedDate: '2024-11-15',
    targetDate: '2024-12-30',
    owner: 'Michael Roberts',
    regulatoryImpact: true,
    impactedDocuments: ['3.2.P.5.2', '3.2.P.5.3', 'Batch Records'],
  },
  {
    id: 'CC-2024-002',
    title: 'Qualify new API supplier (Site B)',
    type: 'supplier',
    product: 'LIG-2847',
    status: 'approved',
    priority: 'critical',
    initiatedDate: '2024-10-01',
    targetDate: '2024-12-15',
    owner: 'Sarah Chen',
    regulatoryImpact: true,
    impactedDocuments: ['3.2.S.2.3', 'QAA', 'Supply Agreement'],
  },
  {
    id: 'CC-2024-003',
    title: 'Equipment upgrade - Tablet press firmware',
    type: 'equipment',
    product: 'LIG-2847',
    status: 'implemented',
    priority: 'minor',
    initiatedDate: '2024-09-20',
    targetDate: '2024-11-30',
    owner: 'James Wilson',
    regulatoryImpact: false,
    impactedDocuments: ['Equipment Qualification', 'PM Schedule'],
  },
  {
    id: 'CC-2024-004',
    title: 'Update assay specification limits',
    type: 'specification',
    product: 'LIG-3021',
    status: 'draft',
    priority: 'major',
    initiatedDate: '2024-12-01',
    targetDate: '2025-01-31',
    owner: 'Emily Parker',
    regulatoryImpact: true,
    impactedDocuments: ['3.2.P.5.1', 'Release Specification'],
  },
];

const deviations: Deviation[] = [
  {
    id: 'DEV-2024-047',
    title: 'OOS result for blend uniformity - Batch LIG-2847-042',
    type: 'process',
    product: 'LIG-2847',
    batchNumber: 'LIG-2847-042',
    status: 'investigating',
    severity: 'critical',
    reportedDate: '2024-12-05',
    dueDate: '2024-12-20',
    assignee: 'Quality Team',
    rootCause: 'Under investigation',
  },
  {
    id: 'DEV-2024-048',
    title: 'Environmental excursion - Warehouse Zone B',
    type: 'environmental',
    product: 'LIG-2847',
    status: 'capa',
    severity: 'major',
    reportedDate: '2024-12-03',
    dueDate: '2024-12-25',
    assignee: 'Facilities',
    rootCause: 'HVAC malfunction',
  },
  {
    id: 'DEV-2024-049',
    title: 'Missing batch record signature',
    type: 'documentation',
    product: 'LIG-3021',
    batchNumber: 'LIG-3021-015',
    status: 'closed',
    severity: 'minor',
    reportedDate: '2024-11-28',
    dueDate: '2024-12-05',
    assignee: 'Production',
    rootCause: 'Training gap',
  },
];

const batchRecords: BatchRecord[] = [
  { id: 'BR-001', batchNumber: 'LIG-2847-042', product: 'LIG-2847', site: 'Site A', status: 'quarantine', startDate: '2024-12-01', endDate: '2024-12-05', yield: 92, deviations: 1 },
  { id: 'BR-002', batchNumber: 'LIG-2847-041', product: 'LIG-2847', site: 'Site A', status: 'released', startDate: '2024-11-25', endDate: '2024-11-29', yield: 96, deviations: 0 },
  { id: 'BR-003', batchNumber: 'LIG-3021-016', product: 'LIG-3021', site: 'Site B', status: 'pending-release', startDate: '2024-12-02', endDate: '2024-12-06', yield: 94, deviations: 0 },
  { id: 'BR-004', batchNumber: 'LIG-2847-040', product: 'LIG-2847', site: 'Site A', status: 'released', startDate: '2024-11-18', endDate: '2024-11-22', yield: 95, deviations: 0 },
  { id: 'BR-005', batchNumber: 'LIG-2847-043', product: 'LIG-2847', site: 'Site A', status: 'released', startDate: '2024-11-20', endDate: '2024-11-24', yield: 97, deviations: 0 },
];

const stabilityStudies: StabilityStudy[] = [
  { id: 'STAB-001', product: 'LIG-2847 Tablets 100mg', condition: '25°C/60% RH', protocol: 'Long-term', status: 'ongoing', startDate: '2023-06-15', nextTimepoint: '2024-12-15', trend: 'stable' },
  { id: 'STAB-002', product: 'LIG-2847 Tablets 100mg', condition: '40°C/75% RH', protocol: 'Accelerated', status: 'completed', startDate: '2023-06-15', nextTimepoint: '-', trend: 'stable' },
  { id: 'STAB-003', product: 'LIG-2847 Tablets 100mg', condition: '30°C/65% RH', protocol: 'Intermediate', status: 'ongoing', startDate: '2023-06-15', nextTimepoint: '2024-12-15', trend: 'watch' },
  { id: 'STAB-004', product: 'LIG-3021 Capsules 50mg', condition: '25°C/60% RH', protocol: 'Long-term', status: 'ongoing', startDate: '2024-01-10', nextTimepoint: '2025-01-10', trend: 'stable' },
];

interface QualityScreenProps {
  filters?: FilterState;
}

export function QualityScreen({ filters: _filters }: QualityScreenProps) {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<QualityView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const { filterByProductName } = useProductFilter();

  // Apply product filter first, then search filter
  const q = searchQuery.toLowerCase();
  const filteredChangeControls = filterByProductName(
    q ? changeControls.filter(cc =>
        cc.id.toLowerCase().includes(q) ||
        cc.title.toLowerCase().includes(q) ||
        cc.product.toLowerCase().includes(q) ||
        cc.owner.toLowerCase().includes(q) ||
        cc.type.toLowerCase().includes(q)
      )
    : changeControls
  );
  const filteredDeviations = filterByProductName(
    q ? deviations.filter(d =>
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.product.toLowerCase().includes(q) ||
        d.assignee.toLowerCase().includes(q)
      )
    : deviations
  );
  const filteredBatchRecords = filterByProductName(
    q ? batchRecords.filter(b =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q) ||
        b.site.toLowerCase().includes(q)
      )
    : batchRecords
  );
  const filteredStabilityStudies = filterByProductName(
    q ? stabilityStudies.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.product.toLowerCase().includes(q) ||
        s.condition.toLowerCase().includes(q)
      )
    : stabilityStudies
  );

  // v126: Loading state for skeleton display
  const [isLoading, setIsLoading] = useState(true);
  
  // v126: Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  // v112: Cross-module navigation
  const { getContext } = useIncomingNavigation();
  
  // v112: Apply incoming navigation context on mount
  useEffect(() => {
    const context = getContext();
    if (context) {
      if (context.viewMode) {
        const viewModeMap: Record<string, QualityView> = {
          'overview': 'overview',
          'changes': 'changes',
          'deviations': 'deviations',
          'batches': 'batches',
          'stability': 'stability',
        };
        const targetView = viewModeMap[context.viewMode] || 'overview';
        setActiveView(targetView);
      }
    }
  }, [getContext]);

  // Legacy helpers maintained for backward compatibility
  const getTrendIcon = (trend: StabilityStudy['trend']) => {
    switch (trend) {
      case 'stable': return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'watch': return <AlertTriangle className="w-4 h-4 text-accent-amber" />;
      case 'oost': return <AlertCircle className="w-4 h-4 text-accent-red" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        moduleId="quality"
        title="Quality & CMC"
        subtitle="Change controls, deviations, batch records, and stability monitoring"
        icon={<Shield className="w-5 h-5" />}
        actions={
          <CapabilityGate moduleId="quality" capability="author" inline>
            <button className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2" onClick={() => toast.success('Quality record updated — QMS audit trail stamped')}>
              <Plus className="w-4 h-4" />
              New Record
            </button>
          </CapabilityGate>
        }
      />
      <div className="flex-1 overflow-auto p-6">
      {/* v116: Breadcrumb navigation */}
      <Breadcrumb 
        moduleId="quality" 
        viewLabel={activeView === 'overview' ? 'Overview' : activeView === 'changes' ? 'Change Controls' : activeView === 'deviations' ? 'Deviations' : activeView === 'batches' ? 'Batches' : 'Stability'}
        className="mb-4"
      />

      {/* Stats - v112: Clickable StatCards with navigation */}
      {/* v126: Loading skeleton for stats */}
      {isLoading ? (
        <StatCardGridSkeleton count={5} columns={5} className="mb-6" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
          <StatCard
            value={changeControls.filter(c => c.status !== 'closed').length}
            label="Open Changes"
            accentColor="blue"
            onClick={() => setActiveView('changes')}
            clickHint="View change controls"
          />
          <StatCard
            value={deviations.filter(d => d.status !== 'closed').length}
            label="Open Deviations"
            accentColor="amber"
            onClick={() => setActiveView('deviations')}
            clickHint="View deviations"
          />
          <StatCard
            value={batchRecords.length}
            label="Batches (30d)"
            accentColor="teal"
            onClick={() => setActiveView('batches')}
            clickHint="View batch records"
          />
          <StatCard
            value={stabilityStudies.filter(s => s.status === 'ongoing').length}
            label="Stability Studies"
            accentColor="purple"
            onClick={() => setActiveView('stability')}
            clickHint="View stability studies"
          />
          <StatCard
            value="94%"
            label="Batch Yield"
            accentColor="green"
            onClick={() => setActiveView('batches')}
            clickHint="View batch performance"
          />
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-4 mb-4 md:mb-6">
        <div className="flex bg-surface-card rounded-lg p-1">
          {(['overview', 'changes', 'deviations', 'batches', 'stability'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
                activeView === view
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {view === 'changes' ? 'Change Controls' : view}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Change Controls - v126: Card migration */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Recent Change Controls"
              action={<button onClick={() => setActiveView('changes')} className="text-xs text-accent-blue hover:underline">View all</button>}
            />
            <CardContent>
              <div className="space-y-3">
                {changeControls.slice(0, 3).map(cc => (
                  <Card key={cc.id} variant="ghost" padding="sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-text-muted">{cc.id}</span>
                        <div className="text-sm font-medium text-text-primary">{cc.title}</div>
                      </div>
                      {getQualityStatusBadge(cc.status, 'xs')}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{cc.product}</span>
                      <span>•</span>
                      <span>{cc.owner}</span>
                      {cc.regulatoryImpact && (
                        <>
                          <span>•</span>
                          <span className="text-accent-amber flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Reg Impact
                          </span>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Open Deviations - v126: Card migration */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Open Deviations"
              action={<button onClick={() => setActiveView('deviations')} className="text-xs text-accent-blue hover:underline">View all</button>}
            />
            <CardContent>
              <div className="space-y-3">
                {filteredDeviations.filter(d => d.status !== 'closed').map(dev => (
                  <Card key={dev.id} variant="ghost" padding="sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{dev.id}</span>
                          {getPriorityBadge(dev.severity, 'xs')}
                        </div>
                        <div className="text-sm font-medium text-text-primary mt-1">{dev.title}</div>
                      </div>
                      {getQualityStatusBadge(dev.status, 'xs')}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{dev.product}</span>
                      <span>•</span>
                      <span>Due: {dev.dueDate}</span>
                      <span>•</span>
                      <span>{dev.assignee}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Batches - v126: Card migration */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Recent Batches"
              action={<button onClick={() => setActiveView('batches')} className="text-xs text-accent-blue hover:underline">View all</button>}
            />
            <CardContent>
              <div className="space-y-2">
                {filteredBatchRecords.slice(0, 4).map(batch => (
                  <div key={batch.id} className="flex items-center gap-3 p-2 bg-surface-card rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{batch.batchNumber}</div>
                      <div className="text-xs text-text-muted">{batch.product} • {batch.site}</div>
                    </div>
                    {getBatchStatusBadge(batch.status, 'xs')}
                    {batch.yield && (
                      <span className="text-xs text-text-muted">{batch.yield}%</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stability Watch - v126: Card migration */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Stability Studies"
              action={<button onClick={() => setActiveView('stability')} className="text-xs text-accent-blue hover:underline">View all</button>}
            />
            <CardContent>
              <div className="space-y-2">
                {filteredStabilityStudies.map(study => (
                  <div key={study.id} className="flex items-center gap-3 p-2 bg-surface-card rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{study.product}</div>
                      <div className="text-xs text-text-muted">{study.condition} • {study.protocol}</div>
                    </div>
                    {getTrendIcon(study.trend)}
                    {getQualityStatusBadge(study.status, 'xs')}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Controls View - v126: Card wrapper */}
      {activeView === 'changes' && (
        <Card variant="elevated" padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-card">
                <th className="text-left p-4 text-sm font-medium text-text-muted">ID</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Title</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Type</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Product</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Priority</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Target</th>
              </tr>
            </thead>
            <tbody>
              {filteredChangeControls.map(cc => (
                <tr key={cc.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer">
                  <td className="p-4 text-sm text-accent-blue">{cc.id}</td>
                  <td className="p-4">
                    <div className="text-sm text-text-primary">{cc.title}</div>
                    {cc.regulatoryImpact && (
                      <span className="text-xs text-accent-amber flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3" /> Regulatory Impact
                      </span>
                    )}
                  </td>
                  <td className="p-4">{getChangeTypeBadge(cc.type, 'xs')}</td>
                  <td className="p-4 text-sm text-text-secondary">{cc.product}</td>
                  <td className="p-4 text-center">
                    {getPriorityBadge(cc.priority, 'xs')}
                  </td>
                  <td className="p-4 text-center">
                    {getQualityStatusBadge(cc.status, 'xs')}
                  </td>
                  <td className="p-4 text-sm text-text-muted">{cc.owner}</td>
                  <td className="p-4 text-sm text-text-muted">{cc.targetDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {/* Deviations View - v126: Card wrapper */}
      {activeView === 'deviations' && (
        <Card variant="elevated" padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-card">
                <th className="text-left p-4 text-sm font-medium text-text-muted">ID</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Title</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Type</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Product</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Severity</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Assignee</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Due</th>
              </tr>
            </thead>
            <tbody>
              {deviations.map(dev => (
                <tr key={dev.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer">
                  <td className="p-4 text-sm text-accent-blue">{dev.id}</td>
                  <td className="p-4">
                    <div className="text-sm text-text-primary">{dev.title}</div>
                    {dev.rootCause && (
                      <div className="text-xs text-text-muted mt-1">Root cause: {dev.rootCause}</div>
                    )}
                  </td>
                  <td className="p-4">{getDeviationTypeBadge(dev.type, 'xs')}</td>
                  <td className="p-4 text-sm text-text-secondary">{dev.product}</td>
                  <td className="p-4 text-center">
                    {getPriorityBadge(dev.severity, 'xs')}
                  </td>
                  <td className="p-4 text-center">
                    {getQualityStatusBadge(dev.status, 'xs')}
                  </td>
                  <td className="p-4 text-sm text-text-muted">{dev.assignee}</td>
                  <td className="p-4 text-sm text-text-muted">{dev.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Batches View - v126: Card wrapper */}
      {activeView === 'batches' && (
        <Card variant="elevated" padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-card">
                <th className="text-left p-4 text-sm font-medium text-text-muted">Batch Number</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Product</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Site</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Start</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">End</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Yield</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Deviations</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatchRecords.map(batch => (
                <tr key={batch.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer">
                  <td className="p-4 text-sm font-medium text-accent-blue">{batch.batchNumber}</td>
                  <td className="p-4 text-sm text-text-secondary">{batch.product}</td>
                  <td className="p-4 text-sm text-text-secondary">{batch.site}</td>
                  <td className="p-4 text-center">
                    {getBatchStatusBadge(batch.status, 'xs')}
                  </td>
                  <td className="p-4 text-sm text-text-muted">{batch.startDate}</td>
                  <td className="p-4 text-sm text-text-muted">{batch.endDate || '-'}</td>
                  <td className="p-4 text-center text-sm text-text-primary">{batch.yield ? `${batch.yield}%` : '-'}</td>
                  <td className="p-4 text-center">
                    {batch.deviations > 0 ? (
                      <Badge color="amber" size="xs">{batch.deviations}</Badge>
                    ) : (
                      <Badge color="green" size="xs">0</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Stability View - v126: Card wrapper */}
      {activeView === 'stability' && (
        <Card variant="elevated" padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-card">
                <th className="text-left p-4 text-sm font-medium text-text-muted">Product</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Condition</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Protocol</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Start Date</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Next Timepoint</th>
                <th className="text-center p-4 text-sm font-medium text-text-muted">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredStabilityStudies.map(study => (
                <tr key={study.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer">
                  <td className="p-4 text-sm font-medium text-text-primary">{study.product}</td>
                  <td className="p-4 text-sm text-text-secondary">{study.condition}</td>
                  <td className="p-4 text-sm text-text-secondary">{study.protocol}</td>
                  <td className="p-4 text-center">
                    {getQualityStatusBadge(study.status, 'xs')}
                  </td>
                  <td className="p-4 text-sm text-text-muted">{study.startDate}</td>
                  <td className="p-4 text-sm text-text-muted">{study.nextTimepoint}</td>
                  <td className="p-4 text-center">
                    {getStabilityTrendBadge(study.trend, 'xs')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
    </div>
  );
}
