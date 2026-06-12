
/**
 * Batch Records Screen - v0.35.0
 * 
 * Manufacturing batch record management:
 * - Electronic Batch Records (EBR)
 * - Batch genealogy and traceability
 * - In-process controls and release testing
 * - Deviation and CAPA linkage
 * 
 * v0.34.1: Added QMS deviation linkage
 * v0.35.0: Interactive stats - all cards drill down to filtered views
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Package, FileText, CheckCircle, Clock, AlertTriangle, Search, Plus,
  Download, Eye, ChevronRight, Filter, Activity, Database, Layers,
  ClipboardCheck, FlaskConical, Truck, BarChart3, Calendar, ArrowRight,
  XCircle, Pause, Play, GitBranch, Link2, Settings, ExternalLink, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { FilterState } from '@/components/layout/FilterBar';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useAppStore } from '@/store/useAppStore';
import { useDeadClick } from '@/hooks/useDeadClick';

// =============================================================================
// Types
// =============================================================================

interface BatchRecordsScreenProps {
  filters?: FilterState;
}

type ViewMode = 'dashboard' | 'batches' | 'in-process' | 'deviations' | 'release';

interface BatchRecord {
  id: string;
  batchNumber: string;
  product: string;
  productCode: string;
  quantity: string;
  manufacturingDate: string;
  status: 'in-progress' | 'pending-review' | 'approved' | 'released' | 'rejected' | 'quarantine';
  stage: string;
  progress: number;
  deviations: number;
  ipcResults: { pass: number; fail: number; pending: number };
  assignee: string;
  site: string;
}

interface IPCTest {
  id: string;
  batchNumber: string;
  testName: string;
  stage: string;
  specification: string;
  result?: string;
  status: 'pass' | 'fail' | 'pending' | 'in-progress';
  testedBy?: string;
  testedDate?: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const mockBatches: BatchRecord[] = [
  {
    id: 'br-001',
    batchNumber: 'NX-2026-001',
    product: 'Nexavant 50mg Tablets',
    productCode: 'NX-050-TAB',
    quantity: '500,000 tablets',
    manufacturingDate: '2026-01-25',
    status: 'in-progress',
    stage: 'Compression',
    progress: 65,
    deviations: 0,
    ipcResults: { pass: 8, fail: 0, pending: 4 },
    assignee: 'M. Chen',
    site: 'Boston Manufacturing',
  },
  {
    id: 'br-002',
    batchNumber: 'NX-2026-002',
    product: 'Nexavant 100mg Tablets',
    productCode: 'NX-100-TAB',
    quantity: '250,000 tablets',
    manufacturingDate: '2026-01-20',
    status: 'pending-review',
    stage: 'Packaging',
    progress: 100,
    deviations: 1,
    ipcResults: { pass: 12, fail: 0, pending: 0 },
    assignee: 'S. Patel',
    site: 'Boston Manufacturing',
  },
  {
    id: 'br-003',
    batchNumber: 'CM-2026-003',
    product: 'Cardiomax Injectable 10mg/mL',
    productCode: 'CM-010-INJ',
    quantity: '10,000 vials',
    manufacturingDate: '2026-01-18',
    status: 'approved',
    stage: 'Complete',
    progress: 100,
    deviations: 0,
    ipcResults: { pass: 15, fail: 0, pending: 0 },
    assignee: 'J. Kim',
    site: 'San Diego Biologics',
  },
  {
    id: 'br-004',
    batchNumber: 'IX7-2026-001',
    product: 'Immunex-7 Lyophilized',
    productCode: 'IX7-LYO-50',
    quantity: '5,000 vials',
    manufacturingDate: '2026-01-22',
    status: 'quarantine',
    stage: 'QC Testing',
    progress: 90,
    deviations: 2,
    ipcResults: { pass: 10, fail: 1, pending: 1 },
    assignee: 'R. Garcia',
    site: 'San Diego Biologics',
  },
  {
    id: 'br-005',
    batchNumber: 'NX-2026-003',
    product: 'Nexavant 50mg Tablets',
    productCode: 'NX-050-TAB',
    quantity: '500,000 tablets',
    manufacturingDate: '2026-01-28',
    status: 'in-progress',
    stage: 'Granulation',
    progress: 25,
    deviations: 0,
    ipcResults: { pass: 3, fail: 0, pending: 9 },
    assignee: 'M. Chen',
    site: 'Boston Manufacturing',
  },
];

const mockIPCTests: IPCTest[] = [
  {
    id: 'ipc-001',
    batchNumber: 'NX-2026-001',
    testName: 'Blend Uniformity',
    stage: 'Blending',
    specification: 'RSD ≤ 5%',
    result: '2.3%',
    status: 'pass',
    testedBy: 'A. Wong',
    testedDate: '2026-01-25',
  },
  {
    id: 'ipc-002',
    batchNumber: 'NX-2026-001',
    testName: 'Granule Moisture',
    stage: 'Granulation',
    specification: '1.0-3.0%',
    result: '2.1%',
    status: 'pass',
    testedBy: 'A. Wong',
    testedDate: '2026-01-26',
  },
  {
    id: 'ipc-003',
    batchNumber: 'NX-2026-001',
    testName: 'Tablet Weight',
    stage: 'Compression',
    specification: '250mg ± 5%',
    result: '251mg',
    status: 'pass',
    testedBy: 'B. Johnson',
    testedDate: '2026-01-27',
  },
  {
    id: 'ipc-004',
    batchNumber: 'NX-2026-001',
    testName: 'Hardness',
    stage: 'Compression',
    specification: '8-12 kP',
    status: 'pending',
  },
  {
    id: 'ipc-005',
    batchNumber: 'IX7-2026-001',
    testName: 'Bioburden',
    stage: 'Pre-filtration',
    specification: '< 10 CFU/mL',
    result: '15 CFU/mL',
    status: 'fail',
    testedBy: 'C. Martinez',
    testedDate: '2026-01-24',
  },
];

// v0.34.1: Deviation data linked to QMS
interface Deviation {
  id: string;
  number: string;
  batchNumber: string;
  title: string;
  type: 'minor' | 'major' | 'critical';
  status: 'open' | 'investigation' | 'capa-required' | 'closed';
  openedDate: string;
  owner: string;
  qmsLink: string;
}

const mockDeviations: Deviation[] = [
  {
    id: 'dev-001',
    number: 'DEV-2026-0042',
    batchNumber: 'NX-2026-002',
    title: 'Tablet weight variation outside control limits',
    type: 'minor',
    status: 'investigation',
    openedDate: '2026-01-22',
    owner: 'S. Patel',
    qmsLink: 'qms?deviation=DEV-2026-0042',
  },
  {
    id: 'dev-002',
    number: 'DEV-2026-0045',
    batchNumber: 'IX7-2026-001',
    title: 'Bioburden OOS - Pre-filtration step',
    type: 'major',
    status: 'capa-required',
    openedDate: '2026-01-24',
    owner: 'R. Garcia',
    qmsLink: 'qms?deviation=DEV-2026-0045',
  },
  {
    id: 'dev-003',
    number: 'DEV-2026-0046',
    batchNumber: 'IX7-2026-001',
    title: 'Equipment qualification gap identified',
    type: 'minor',
    status: 'open',
    openedDate: '2026-01-25',
    owner: 'R. Garcia',
    qmsLink: 'qms?deviation=DEV-2026-0046',
  },
];

// Deviation type colors
const deviationTypeConfig = {
  'minor': { color: 'amber' as const, label: 'Minor' },
  'major': { color: 'red' as const, label: 'Major' },
  'critical': { color: 'red' as const, label: 'Critical' },
};

const deviationStatusConfig = {
  'open': { color: 'blue' as const, label: 'Open' },
  'investigation': { color: 'amber' as const, label: 'Investigation' },
  'capa-required': { color: 'red' as const, label: 'CAPA Required' },
  'closed': { color: 'green' as const, label: 'Closed' },
};

// =============================================================================
// Helper Components
// =============================================================================

const statusConfig = {
  'in-progress': { color: 'blue' as const, label: 'In Progress', icon: Activity },
  'pending-review': { color: 'amber' as const, label: 'Pending Review', icon: Clock },
  'approved': { color: 'green' as const, label: 'Approved', icon: CheckCircle },
  'released': { color: 'purple' as const, label: 'Released', icon: Truck },
  'rejected': { color: 'red' as const, label: 'Rejected', icon: XCircle },
  'quarantine': { color: 'red' as const, label: 'Quarantine', icon: AlertTriangle },
};

const ipcStatusConfig = {
  'pass': { color: 'green' as const, label: 'Pass' },
  'fail': { color: 'red' as const, label: 'Fail' },
  'pending': { color: 'gray' as const, label: 'Pending' },
  'in-progress': { color: 'blue' as const, label: 'In Progress' },
};

function BatchCard({ batch, onClick }: { batch: BatchRecord; onClick: () => void }) {
  const status = statusConfig[batch.status];
  const StatusIcon = status.icon;
  
  return (
    <Card 
      className="hover:border-accent-blue transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-accent-blue" />
              <h4 className="font-semibold text-text-primary">{batch.batchNumber}</h4>
            </div>
            <p className="text-sm text-text-muted mt-0.5">{batch.product}</p>
          </div>
          <div className="flex items-center gap-2">
            {batch.deviations > 0 && (
              <Badge color="amber" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {batch.deviations} Dev
              </Badge>
            )}
            <Badge color={status.color} size="sm">
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-text-muted">Stage:</span>
              <span className="ml-1 text-text-primary">{batch.stage}</span>
            </div>
            <div>
              <span className="text-text-muted">Quantity:</span>
              <span className="ml-1 text-text-primary">{batch.quantity}</span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-primary font-medium">{batch.progress}%</span>
            </div>
            <ProgressBar 
              value={batch.progress} 
              max={100} 
              size="sm" 
              color={batch.status === 'quarantine' ? 'red' : 'blue'} 
            />
          </div>
          
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-accent-green">✓ {batch.ipcResults.pass}</span>
              {batch.ipcResults.fail > 0 && (
                <span className="text-accent-red">✗ {batch.ipcResults.fail}</span>
              )}
              <span className="text-text-muted">◯ {batch.ipcResults.pending}</span>
            </div>
            <span className="text-text-muted">{batch.site}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IPCTestRow({ test }: { test: IPCTest }) {
  const { deadClick } = useDeadClick();
  const status = ipcStatusConfig[test.status];
  
  return (
    <tr className="border-b border-border hover:bg-surface-card transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-text-primary">{test.batchNumber}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-text-primary">{test.testName}</div>
        <div className="text-xs text-text-muted">{test.stage}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary">{test.specification}</td>
      <td className="px-4 py-3">
        {test.result ? (
          <span className={test.status === 'fail' ? 'text-accent-red font-medium' : 'text-text-primary'}>
            {test.result}
          </span>
        ) : (
          <span className="text-text-muted">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge color={status.color} size="sm">{status.label}</Badge>
      </td>
      <td className="px-4 py-3 text-text-muted text-sm">
        {test.testedBy || '-'}
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => toast.info('Select a batch from the list to view full record, test results, and release status')}>
          <Eye className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BatchRecordsScreen({ filters }: BatchRecordsScreenProps) {
    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  // v0.35.0: Filter state for drill-downs
  const [batchFilter, setBatchFilter] = useState<'all' | 'in-progress' | 'pending-review' | 'quarantine' | 'deviations'>('all');
  
  // v0.35.0: Collapsible dashboard sections with persisted state
  const { isCollapsed, setCollapsed } = useCollapsedSections('batch-records');
  
  // v0.35.0: Clear filter handler
  const handleClearFilter = useCallback(() => {
    setBatchFilter('all');
  }, []);
  
  // v0.34.1: QMS navigation
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  const navigateToQMS = useCallback((deviation?: Deviation) => {
    setActiveModule('qms');
    // In a real app, this would pass the deviation ID to QMS
  }, [setActiveModule]);

  // Filter batches - v0.34.8: Added batchFilter support
  const filteredBatches = useMemo(() => {
    return mockBatches.filter(batch => {
      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = (
          batch.batchNumber.toLowerCase().includes(q) ||
          batch.product.toLowerCase().includes(q) ||
          batch.productCode.toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;
      }
      
      // Apply drill-down filter
      switch (batchFilter) {
        case 'in-progress':
          return batch.status === 'in-progress';
        case 'pending-review':
          return batch.status === 'pending-review';
        case 'quarantine':
          return batch.status === 'quarantine';
        case 'deviations':
          return batch.deviations > 0;
        default:
          return true;
      }
    });
  }, [searchQuery, batchFilter]);

  // Stats
  const inProgress = mockBatches.filter(b => b.status === 'in-progress').length;
  const pendingReview = mockBatches.filter(b => b.status === 'pending-review').length;
  const quarantine = mockBatches.filter(b => b.status === 'quarantine').length;
  const totalDeviations = mockBatches.reduce((sum, b) => sum + b.deviations, 0);

  // v0.34.8: Stats with onClick handlers for drill-down
  const stats: ScreenStat[] = [
    {
      id: 'in-progress',
      label: 'In Progress',
      value: inProgress,
      icon: <Activity className="w-5 h-5" />,
      color: 'blue',
      onClick: () => {
        setBatchFilter('in-progress');
        setViewMode('batches');
      },
    },
    {
      id: 'pending-review',
      label: 'Pending Review',
      value: pendingReview,
      icon: <Clock className="w-5 h-5" />,
      color: 'amber',
      onClick: () => {
        setBatchFilter('pending-review');
        setViewMode('batches');
      },
    },
    {
      id: 'quarantine',
      label: 'In Quarantine',
      value: quarantine,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: quarantine > 0 ? 'red' : 'gray',
      onClick: () => {
        setBatchFilter('quarantine');
        setViewMode('batches');
      },
    },
    {
      id: 'deviations',
      label: 'Open Deviations',
      value: totalDeviations,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: totalDeviations > 0 ? 'amber' : 'gray',
      onClick: () => {
        setBatchFilter('all');
        setViewMode('deviations');
      },
    },
  ];

  // Tabs
  const tabs: ScreenTab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'batches', label: 'Batch Records', icon: <Package className="w-4 h-4" />, count: filteredBatches.length },
    { id: 'in-process', label: 'IPC Testing', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'deviations', label: 'Deviations', icon: <AlertTriangle className="w-4 h-4" />, count: mockDeviations.filter(d => d.status !== 'closed').length },
    { id: 'release', label: 'Release', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <ScreenLayout
      title="Batch Records"
      subtitle="Electronic batch records, in-process controls, and release management"
      stats={stats}
      tabs={tabs}
      activeTab={viewMode}
      onTabChange={(tab) => setViewMode(tab as ViewMode)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => toast.success('New batch record created — assign product, lot number, and manufacturing date to begin')}>
            <Plus className="w-4 h-4 mr-1" />
            New Batch
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const b=new Blob(['Batch Records Export\n'+new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='batch-records.txt'; a.click(); toast.success('Batch records exported'); }}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      }
    >
      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          {/* v0.35.0: Active Batches - Collapsible */}
          <CollapsibleSection
            title="Active Batches"
            icon={<Package className="w-5 h-5" />}
            count={filteredBatches.filter(b => ['in-progress', 'pending-review', 'quarantine'].includes(b.status)).length}
            defaultExpanded={!isCollapsed('active-batches')}
            onToggle={(expanded) => setCollapsed('active-batches', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="ghost" size="sm" onClick={() => setViewMode('batches')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              {filteredBatches
                .filter(b => ['in-progress', 'pending-review', 'quarantine'].includes(b.status))
                .slice(0, 4)
                .map(batch => (
                  <BatchCard 
                    key={batch.id} 
                    batch={batch} 
                    onClick={() => setSelectedBatch(batch)}
                  />
                ))}
            </div>
          </CollapsibleSection>

          {/* v0.35.0: IPC Tests - Collapsible */}
          <CollapsibleSection
            title="IPC Tests - Attention Required"
            icon={<ClipboardCheck className="w-5 h-5" />}
            count={mockIPCTests.filter(t => t.status === 'fail' || t.status === 'pending').length}
            defaultExpanded={!isCollapsed('ipc-tests')}
            onToggle={(expanded) => setCollapsed('ipc-tests', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="ghost" size="sm" onClick={() => setViewMode('in-process')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          >
            <table className="w-full">
              <thead className="bg-surface-card border-y border-border">
                <tr className="text-left text-sm text-text-muted">
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Test</th>
                  <th className="px-4 py-2 font-medium">Specification</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Tested By</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mockIPCTests
                  .filter(t => t.status === 'fail' || t.status === 'pending')
                  .slice(0, 5)
                  .map(test => (
                    <IPCTestRow key={test.id} test={test} />
                  ))}
              </tbody>
            </table>
          </CollapsibleSection>
        </div>
      )}

      {/* Batches View */}
      {viewMode === 'batches' && (
        <div className="space-y-4">
          {/* v0.34.8: Active Filter Banner */}
          {batchFilter !== 'all' && (
            <div className="flex items-center justify-between p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-accent-blue" />
                <span className="text-text-secondary">Filtered by:</span>
                <Badge 
                  color={batchFilter === 'quarantine' ? 'red' : batchFilter === 'pending-review' ? 'amber' : batchFilter === 'deviations' ? 'amber' : 'blue'} 
                  size="sm"
                >
                  {batchFilter === 'in-progress' ? 'In Progress' : 
                   batchFilter === 'pending-review' ? 'Pending Review' : 
                   batchFilter === 'quarantine' ? 'In Quarantine' : 
                   'With Deviations'}
                </Badge>
                <span className="text-text-muted">({filteredBatches.length} batches)</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                <X className="w-4 h-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by batch number, product, or code..."
              className="w-96"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.info('Filter batch records by product, lot status, manufacture date, or release state')}>
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredBatches.map(batch => (
              <BatchCard 
                key={batch.id} 
                batch={batch} 
                onClick={() => setSelectedBatch(batch)}
              />
            ))}
          </div>
        </div>
      )}

      {/* IPC Testing View */}
      {viewMode === 'in-process' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">In-Process Control Tests</h3>
              <Button variant="outline" size="sm" onClick={() => toast.success('Test result recorded — QC specification checked · batch record updated')}>
                <Plus className="w-4 h-4 mr-1" />
                Record Result
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-surface-card border-y border-border">
                <tr className="text-left text-sm text-text-muted">
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Test</th>
                  <th className="px-4 py-3 font-medium">Specification</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tested By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {mockIPCTests.map(test => (
                  <IPCTestRow key={test.id} test={test} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Deviations View - v0.34.1 */}
      {viewMode === 'deviations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-text-primary">Batch Deviations</h3>
              <Badge color="amber" size="sm">{mockDeviations.filter(d => d.status !== 'closed').length} Open</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateToQMS()}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Open QMS
              </Button>
              <Button variant="primary" size="sm" onClick={() => toast.success('Deviation record created — assign CAPA owner and root cause category to proceed')}>
                <Plus className="w-4 h-4 mr-1" />
                New Deviation
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-surface-card border-y border-border">
                  <tr className="text-left text-sm text-text-muted">
                    <th className="px-4 py-3 font-medium">Deviation #</th>
                    <th className="px-4 py-3 font-medium">Batch</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Opened</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockDeviations.map(deviation => {
                    const type = deviationTypeConfig[deviation.type];
                    const status = deviationStatusConfig[deviation.status];
                    return (
                      <tr key={deviation.id} className="border-b border-border hover:bg-surface-card transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-accent-blue">{deviation.number}</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{deviation.batchNumber}</td>
                        <td className="px-4 py-3">
                          <span className="text-text-primary">{deviation.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={type.color} size="sm">{type.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={status.color} size="sm">{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{deviation.owner}</td>
                        <td className="px-4 py-3 text-text-muted text-sm">{deviation.openedDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedDeviation(deviation);
                                setShowDeviationModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigateToQMS(deviation)}
                              title="Open in QMS"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-accent-blue mt-0.5" />
                <div>
                  <h4 className="font-medium text-text-primary">QMS Integration</h4>
                  <p className="text-sm text-text-muted mt-1">
                    Deviations are linked to the Quality Management System. Click "Open in QMS" to view full 
                    investigation details, root cause analysis, and associated CAPAs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Release View */}
      {viewMode === 'release' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Batch Release</h3>
              <p className="text-text-muted mb-4">
                Review and release approved batches for distribution.
              </p>
              <div className="flex items-center justify-center gap-4">
                {filteredBatches.filter(b => b.status === 'approved').map(batch => (
                  <Card key={batch.id} className="w-64">
                    <CardContent className="p-4">
                      <div className="font-medium text-text-primary">{batch.batchNumber}</div>
                      <div className="text-sm text-text-muted mb-3">{batch.product}</div>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => toast.success('Batch release initiated — QP review and 21 CFR Part 211 checklist activated')}>
                        Release Batch
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {filteredBatches.filter(b => b.status === 'approved').length === 0 && (
                  <p className="text-text-muted">No batches pending release</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deviation Detail Modal */}
      {showDeviationModal && selectedDeviation && (
        <Modal
          isOpen={showDeviationModal}
          onClose={() => {
            setShowDeviationModal(false);
            setSelectedDeviation(null);
          }}
          title={`Deviation ${selectedDeviation.number}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-text-muted uppercase">Batch</label>
                <p className="font-medium text-text-primary">{selectedDeviation.batchNumber}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase">Type</label>
                <Badge color={deviationTypeConfig[selectedDeviation.type]?.color} size="sm">
                  {deviationTypeConfig[selectedDeviation.type]?.label}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase">Status</label>
                <Badge color={deviationStatusConfig[selectedDeviation.status]?.color} size="sm">
                  {deviationStatusConfig[selectedDeviation.status]?.label}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase">Owner</label>
                <p className="font-medium text-text-primary">{selectedDeviation.owner}</p>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-text-muted uppercase">Title</label>
              <p className="text-text-primary mt-1">{selectedDeviation.title}</p>
            </div>

            <div className="p-4 bg-surface-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-accent-blue" />
                <span className="text-sm font-medium text-text-primary">QMS Record</span>
              </div>
              <p className="text-sm text-text-muted mb-3">
                Full deviation investigation, root cause analysis, and CAPA tracking available in QMS.
              </p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => {
                  navigateToQMS(selectedDeviation);
                  setShowDeviationModal(false);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open in QMS
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ScreenLayout>
  );
}

export default BatchRecordsScreen;
