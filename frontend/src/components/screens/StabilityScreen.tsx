
/**
 * Stability Screen - v0.42.47
 * 
 * CMC Stability studies management:
 * - Stability protocols and schedules
 * - Testing timepoints and conditions
 * - Trend analysis and shelf-life predictions
 * - OOS/OOT investigations
 * - eCTD Module 3.2.P.8 submission readiness (cross-module → Submissions)
 * 
 * v0.34.1: Added trend analysis charts
 * v0.35.0: Interactive stats - all cards drill down to filtered views
 */

import { useState, useMemo } from 'react';
import {
  Thermometer, Clock, Calendar, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Play, Pause, Settings, Download, Plus, Eye, ChevronRight,
  Beaker, Package, FileText, BarChart3, Activity, Filter, Search,
  ArrowRight, Database, FlaskConical, Target, Layers, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { DualRepDocumentBlock } from '@/components/documents/DualRepDocumentBlock'; // v0.125.75;
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { useToast } from '@/components/ui/Toast';
import { FilterState } from '@/components/layout/FilterBar';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from 'recharts';

// =============================================================================
// Types
// =============================================================================

interface StabilityScreenProps {
  filters?: FilterState;
}

type ViewMode = 'dashboard' | 'studies' | 'testing' | 'trends';

// v0.34.8: Filter state for drill-downs
type StudyFilter = 'all' | 'active' | 'overdue' | 'alerts';

interface StabilityStudy {
  id: string;
  product: string;
  batch: string;
  protocol: string;
  condition: string;
  startDate: string;
  duration: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  progress: number;
  nextTimepoint: string;
  testingComplete: number;
  testingTotal: number;
  alerts: number;
}

interface TestingTimepoint {
  id: string;
  study: string;
  timepoint: string;
  condition: string;
  scheduledDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  tests: { name: string; result?: string; spec: string; status: 'pass' | 'fail' | 'pending' }[];
}

// =============================================================================
// Mock Data
// =============================================================================

const mockStudies: StabilityStudy[] = [
  {
    id: 'stab-001',
    product: 'Nexavant 50mg Tablets',
    batch: 'NX-2025-001',
    protocol: 'ICH Q1A Long-term',
    condition: '25°C/60% RH',
    startDate: '2025-06-15',
    duration: '36 months',
    status: 'active',
    progress: 42,
    nextTimepoint: '2026-02-15',
    testingComplete: 5,
    testingTotal: 12,
    alerts: 0,
  },
  {
    id: 'stab-002',
    product: 'Nexavant 50mg Tablets',
    batch: 'NX-2025-001',
    protocol: 'ICH Q1A Accelerated',
    condition: '40°C/75% RH',
    startDate: '2025-06-15',
    duration: '6 months',
    status: 'completed',
    progress: 100,
    nextTimepoint: '-',
    testingComplete: 4,
    testingTotal: 4,
    alerts: 0,
  },
  {
    id: 'stab-003',
    product: 'Cardiomax Injectable',
    batch: 'CM-2025-003',
    protocol: 'ICH Q1A Long-term',
    condition: '5°C ± 3°C',
    startDate: '2025-08-01',
    duration: '24 months',
    status: 'active',
    progress: 25,
    nextTimepoint: '2026-02-01',
    testingComplete: 2,
    testingTotal: 8,
    alerts: 1,
  },
  {
    id: 'stab-004',
    product: 'Immunex-7 Lyophilized',
    batch: 'IX7-2025-002',
    protocol: 'ICH Q5C Biologics',
    condition: '-20°C ± 5°C',
    startDate: '2025-09-15',
    duration: '24 months',
    status: 'active',
    progress: 17,
    nextTimepoint: '2026-03-15',
    testingComplete: 1,
    testingTotal: 6,
    alerts: 0,
  },
  {
    id: 'stab-005',
    product: 'Nexavant 100mg Tablets',
    batch: 'NX-2025-007',
    protocol: 'ICH Q1A Intermediate',
    condition: '30°C/65% RH',
    startDate: '2025-10-01',
    duration: '12 months',
    status: 'on-hold',
    progress: 8,
    nextTimepoint: 'On Hold',
    testingComplete: 1,
    testingTotal: 6,
    alerts: 2,
  },
];

const mockTimepoints: TestingTimepoint[] = [
  {
    id: 'tp-001',
    study: 'stab-001',
    timepoint: '6 months',
    condition: '25°C/60% RH',
    scheduledDate: '2025-12-15',
    status: 'completed',
    tests: [
      { name: 'Assay', result: '99.2%', spec: '95-105%', status: 'pass' },
      { name: 'Dissolution', result: '92%', spec: 'NLT 80%', status: 'pass' },
      { name: 'Impurities', result: '0.3%', spec: 'NMT 1.0%', status: 'pass' },
    ],
  },
  {
    id: 'tp-002',
    study: 'stab-001',
    timepoint: '9 months',
    condition: '25°C/60% RH',
    scheduledDate: '2026-03-15',
    status: 'pending',
    tests: [
      { name: 'Assay', spec: '95-105%', status: 'pending' },
      { name: 'Dissolution', spec: 'NLT 80%', status: 'pending' },
      { name: 'Impurities', spec: 'NMT 1.0%', status: 'pending' },
    ],
  },
  {
    id: 'tp-003',
    study: 'stab-003',
    timepoint: '3 months',
    condition: '5°C ± 3°C',
    scheduledDate: '2025-11-01',
    status: 'completed',
    tests: [
      { name: 'Potency', result: '98.5%', spec: '90-110%', status: 'pass' },
      { name: 'pH', result: '7.2', spec: '7.0-7.5', status: 'pass' },
      { name: 'Particulates', result: '12/mL', spec: 'NMT 25/mL', status: 'pass' },
    ],
  },
  {
    id: 'tp-004',
    study: 'stab-003',
    timepoint: '6 months',
    condition: '5°C ± 3°C',
    scheduledDate: '2026-02-01',
    status: 'overdue',
    tests: [
      { name: 'Potency', spec: '90-110%', status: 'pending' },
      { name: 'pH', spec: '7.0-7.5', status: 'pending' },
      { name: 'Particulates', spec: 'NMT 25/mL', status: 'pending' },
    ],
  },
];

// v0.34.1: Trend analysis data
const assayTrendData = [
  { timepoint: '0M', assay: 100.0, lowerSpec: 95, upperSpec: 105, predicted: 100 },
  { timepoint: '3M', assay: 99.5, lowerSpec: 95, upperSpec: 105, predicted: 99.6 },
  { timepoint: '6M', assay: 99.2, lowerSpec: 95, upperSpec: 105, predicted: 99.2 },
  { timepoint: '9M', assay: null, lowerSpec: 95, upperSpec: 105, predicted: 98.8 },
  { timepoint: '12M', assay: null, lowerSpec: 95, upperSpec: 105, predicted: 98.4 },
  { timepoint: '18M', assay: null, lowerSpec: 95, upperSpec: 105, predicted: 97.6 },
  { timepoint: '24M', assay: null, lowerSpec: 95, upperSpec: 105, predicted: 96.8 },
  { timepoint: '36M', assay: null, lowerSpec: 95, upperSpec: 105, predicted: 95.2 },
];

const dissolutionTrendData = [
  { timepoint: '0M', dissolution: 98, lowerSpec: 80 },
  { timepoint: '3M', dissolution: 95, lowerSpec: 80 },
  { timepoint: '6M', dissolution: 92, lowerSpec: 80 },
  { timepoint: '9M', dissolution: null, lowerSpec: 80, predicted: 89 },
  { timepoint: '12M', dissolution: null, lowerSpec: 80, predicted: 86 },
  { timepoint: '18M', dissolution: null, lowerSpec: 80, predicted: 83 },
  { timepoint: '24M', dissolution: null, lowerSpec: 80, predicted: 80 },
];

const impurityTrendData = [
  { timepoint: '0M', impurity: 0.1, upperSpec: 1.0 },
  { timepoint: '3M', impurity: 0.2, upperSpec: 1.0 },
  { timepoint: '6M', impurity: 0.3, upperSpec: 1.0 },
  { timepoint: '9M', impurity: null, upperSpec: 1.0, predicted: 0.4 },
  { timepoint: '12M', impurity: null, upperSpec: 1.0, predicted: 0.5 },
  { timepoint: '18M', impurity: null, upperSpec: 1.0, predicted: 0.65 },
  { timepoint: '24M', impurity: null, upperSpec: 1.0, predicted: 0.8 },
  { timepoint: '36M', impurity: null, upperSpec: 1.0, predicted: 0.95 },
];

// =============================================================================
// Helper Components
// =============================================================================

const statusConfig = {
  'active': { color: 'green' as const, label: 'Active' },
  'completed': { color: 'blue' as const, label: 'Completed' },
  'on-hold': { color: 'amber' as const, label: 'On Hold' },
  'cancelled': { color: 'gray' as const, label: 'Cancelled' },
};

const timepointStatusConfig = {
  'pending': { color: 'gray' as const, label: 'Pending' },
  'in-progress': { color: 'blue' as const, label: 'In Progress' },
  'completed': { color: 'green' as const, label: 'Complete' },
  'overdue': { color: 'red' as const, label: 'Overdue' },
};

function StudyCard({ study, onSelect }: { study: StabilityStudy; onSelect?: () => void }) {
  const status = statusConfig[study.status];
  
  return (
    <Card className="hover:border-accent-blue transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-text-primary">{study.product}</h4>
            <p className="text-sm text-text-muted">Batch: {study.batch}</p>
          </div>
          <div className="flex items-center gap-2">
            {study.alerts > 0 && (
              <Badge color="red" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {study.alerts}
              </Badge>
            )}
            <Badge color={status.color} size="sm">{status.label}</Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-text-muted">Protocol:</span>
              <span className="ml-1 text-text-primary">{study.protocol}</span>
            </div>
            <div>
              <span className="text-text-muted">Condition:</span>
              <span className="ml-1 text-text-primary">{study.condition}</span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-primary font-medium">{study.progress}%</span>
            </div>
            <ProgressBar value={study.progress} max={100} size="sm" color="blue" />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-text-muted">
              <Calendar className="w-3.5 h-3.5" />
              Next: {study.nextTimepoint}
            </div>
            <div className="text-text-muted">
              {study.testingComplete}/{study.testingTotal} timepoints
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimepointRow({ timepoint }: { timepoint: TestingTimepoint }) {
  const { deadClick } = useDeadClick();
  const status = timepointStatusConfig[timepoint.status];
  
  return (
    <tr className="border-b border-border hover:bg-surface-card transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-text-primary">{timepoint.timepoint}</div>
        <div className="text-xs text-text-muted">{timepoint.condition}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary">{timepoint.scheduledDate}</td>
      <td className="px-4 py-3">
        <Badge color={status.color} size="sm">{status.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {timepoint.tests.map((test, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                test.status === 'pass' ? 'bg-accent-green' :
                test.status === 'fail' ? 'bg-accent-red' :
                'bg-gray-300'
              }`}
              title={`${test.name}: ${test.result || 'Pending'}`}
            />
          ))}
          <span className="text-sm text-text-muted">
            {timepoint.tests.filter(t => t.status !== 'pending').length}/{timepoint.tests.length} tests
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => toast.success('Stability action recorded — specification updated')}>
          View <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </td>
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StabilityScreen({ filters }: StabilityScreenProps) {
    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  // v0.35.0: Filter state for drill-downs
  const [studyFilter, setStudyFilter] = useState<StudyFilter>('all');
  const [selectedStudy, setSelectedStudy] = useState<StabilityStudy | null>(null);
  const [selectedTimepoint, setSelectedTimepoint] = useState<TestingTimepoint | null>(null);
  const toast = useToast();

  // v0.35.0: Collapsible dashboard sections with persisted state
  const { isCollapsed, setCollapsed } = useCollapsedSections('stability');

  // v0.35.0: Clear filter handler
  const handleClearFilter = () => {
    setStudyFilter('all');
  };

  // Filter studies - v0.34.8: Added studyFilter support
  const filteredStudies = useMemo(() => {
    return mockStudies.filter(study => {
      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = (
          study.product.toLowerCase().includes(q) ||
          study.batch.toLowerCase().includes(q) ||
          study.protocol.toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;
      }
      
      // Apply drill-down filter
      switch (studyFilter) {
        case 'active':
          return study.status === 'active';
        case 'alerts':
          return study.alerts > 0;
        default:
          return true;
      }
    });
  }, [searchQuery, studyFilter]);
  
  // v0.34.8: Filter timepoints for overdue view
  const filteredTimepoints = useMemo(() => {
    if (studyFilter === 'overdue') {
      return mockTimepoints.filter(t => t.status === 'overdue');
    }
    return mockTimepoints;
  }, [studyFilter]);

  // Stats
  const activeStudies = mockStudies.filter(s => s.status === 'active').length;
  const overdueTimepoints = mockTimepoints.filter(t => t.status === 'overdue').length;
  const totalAlerts = mockStudies.reduce((sum, s) => sum + s.alerts, 0);
  const pendingTests = mockTimepoints.filter(t => t.status === 'pending').length;

  // v0.34.8: Stats with onClick handlers for drill-down
  const stats: ScreenStat[] = [
    {
      id: 'active-studies',
      label: 'Active Studies',
      value: activeStudies,
      icon: <FlaskConical className="w-5 h-5" />,
      color: 'green',
      onClick: () => {
        setStudyFilter('active');
        setViewMode('studies');
      },
    },
    {
      id: 'upcoming-tests',
      label: 'Upcoming Tests',
      value: pendingTests,
      icon: <Calendar className="w-5 h-5" />,
      color: 'blue',
      onClick: () => {
        setStudyFilter('all');
        setViewMode('testing');
      },
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: overdueTimepoints,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: overdueTimepoints > 0 ? 'red' : 'gray',
      onClick: () => {
        setStudyFilter('overdue');
        setViewMode('testing');
      },
    },
    {
      id: 'alerts',
      label: 'OOS/OOT Alerts',
      value: totalAlerts,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: totalAlerts > 0 ? 'amber' : 'gray',
      onClick: () => {
        setStudyFilter('alerts');
        setViewMode('studies');
      },
    },
  ];

  // Tabs
  const tabs: ScreenTab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'studies', label: 'Studies', icon: <FlaskConical className="w-4 h-4" />, count: filteredStudies.length },
    { id: 'testing', label: 'Testing Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'trends', label: 'Trend Analysis', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <ScreenLayout
      title="Stability Studies"
      subtitle="ICH-compliant stability testing and shelf-life management"
      stats={stats}
      tabs={tabs}
      activeTab={viewMode}
      onTabChange={(tab) => setViewMode(tab as ViewMode)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => toast.success('Stability action recorded — specification updated')}>
            <Plus className="w-4 h-4 mr-1" />
            New Study
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success('Stability action recorded — specification updated')}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      }
    >
      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          {/* v0.35.0: Active Studies - Collapsible */}
          <CollapsibleSection
            title="Active Studies"
            icon={<FlaskConical className="w-5 h-5" />}
            count={filteredStudies.filter(s => s.status === 'active').length}
            defaultExpanded={!isCollapsed('active-studies')}
            onToggle={(expanded) => setCollapsed('active-studies', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="ghost" size="sm" onClick={() => setViewMode('studies')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              {filteredStudies.filter(s => s.status === 'active').slice(0, 4).map(study => (
                <StudyCard key={study.id} study={study} onSelect={() => { setSelectedStudy(study); toast.info(`Opening study: ${study.product} — Batch ${study.batch}`); }} />
              ))}
            </div>
          </CollapsibleSection>

          {/* v0.35.0: Upcoming Testing - Collapsible */}
          <CollapsibleSection
            title="Upcoming Testing Timepoints"
            icon={<Calendar className="w-5 h-5" />}
            count={mockTimepoints.filter(t => t.status === 'pending').length}
            defaultExpanded={!isCollapsed('upcoming-testing')}
            onToggle={(expanded) => setCollapsed('upcoming-testing', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="ghost" size="sm" onClick={() => setViewMode('testing')}>
                View Schedule <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          >
            <table className="w-full">
              <thead className="bg-surface-card border-y border-border">
                <tr className="text-left text-sm text-text-muted">
                  <th className="px-4 py-2 font-medium">Timepoint</th>
                  <th className="px-4 py-2 font-medium">Scheduled</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Tests</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mockTimepoints.slice(0, 4).map(tp => (
                  <TimepointRow key={tp.id} timepoint={tp} />
                ))}
              </tbody>
            </table>
          </CollapsibleSection>

          {/* v0.42.47: eCTD Submission Readiness — Cross-Module Link */}
          <CollapsibleSection
            title="eCTD Module 3.2.P.8 Readiness"
            icon={<FileText className="w-5 h-5" />}
            defaultExpanded={!isCollapsed('submission-readiness')}
            onToggle={(expanded) => setCollapsed('submission-readiness', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-accent-green">
                    {filteredStudies.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Completed Studies</div>
                  <div className="text-xs text-accent-green">Submission Ready</div>
                </div>
                <div className="p-3 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-accent-amber">
                    {filteredStudies.filter(s => s.status === 'active').length}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Active Studies</div>
                  <div className="text-xs text-accent-amber">In Progress</div>
                </div>
                <div className="p-3 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    {mockStudies.length > 0 ? Math.round(filteredStudies.filter(s => s.status === 'completed').length / mockStudies.length * 100) : 0}%
                  </div>
                  <div className="text-xs text-text-muted mt-1">Overall</div>
                  <div className="text-xs text-text-secondary">Readiness</div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { section: '3.2.P.8.1', label: 'Stability Summary', protocols: ['Long-term', 'Accelerated', 'Stress'], required: true },
                  { section: '3.2.P.8.2', label: 'Post-Approval Commitment', protocols: ['Long-term'], required: true },
                  { section: '3.2.P.8.3', label: 'Photostability', protocols: ['Photostability'], required: false },
                ].map(section => {
                  const relevant = filteredStudies.filter(s => section.protocols.some(p => s.protocol.includes(p)));
                  const ready = relevant.filter(s => s.status === 'completed').length;
                  return (
                    <div key={section.section} className="flex items-center justify-between p-2 bg-surface-card rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-muted w-20">{section.section}</span>
                        <span className="text-sm text-text-primary">{section.label}</span>
                        {section.required && <Badge color="red" size="xs">Required</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">{ready}/{relevant.length} studies</span>
                        <Badge color={ready > 0 && ready === relevant.length ? 'green' : ready > 0 ? 'amber' : 'slate'} size="xs">
                          {ready > 0 && ready === relevant.length ? 'Ready' : ready > 0 ? 'Partial' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg flex items-start gap-2">
                <Database className="w-4 h-4 text-accent-blue mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-text-primary">Cross-Module Link</div>
                  <p className="text-xs text-text-muted mt-0.5">Completed stability studies with all timepoints and no open OOS auto-qualify for eCTD Module 3.2.P.8 inclusion. ICH Q1A(R2) compliance tracked per study type.</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Studies View */}
      {viewMode === 'studies' && (
        <div className="space-y-4">
          {/* v0.34.8: Active Filter Banner */}
          {studyFilter !== 'all' && (
            <div className="flex items-center justify-between p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-accent-blue" />
                <span className="text-text-secondary">Filtered by:</span>
                <Badge color={studyFilter === 'active' ? 'green' : 'amber'} size="sm">
                  {studyFilter === 'active' ? 'Active Studies' : 'Studies with Alerts'}
                </Badge>
                <span className="text-text-muted">({filteredStudies.length} studies)</span>
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
              placeholder="Search by product, batch, or protocol..."
              className="w-96"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success('Stability action recorded — specification updated')}>
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredStudies.map(study => (
              <StudyCard key={study.id} study={study} onSelect={() => { setSelectedStudy(study); toast.info(`Opening study: ${study.product} — Batch ${study.batch}`); }} />
            ))}
          </div>
        </div>
      )}

      {/* Testing Schedule View */}
      {viewMode === 'testing' && (
        <div className="space-y-4">
          {/* v0.34.8: Active Filter Banner */}
          {studyFilter === 'overdue' && (
            <div className="flex items-center justify-between p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-accent-red" />
                <span className="text-text-secondary">Filtered by:</span>
                <Badge color="red" size="sm">Overdue Timepoints</Badge>
                <span className="text-text-muted">({filteredTimepoints.length} timepoints)</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                <X className="w-4 h-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}
          
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-surface-card border-y border-border">
                  <tr className="text-left text-sm text-text-muted">
                    <th className="px-4 py-3 font-medium">Timepoint</th>
                    <th className="px-4 py-3 font-medium">Scheduled Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tests</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimepoints.map(tp => (
                    <TimepointRow key={tp.id} timepoint={tp} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && (
        <div className="space-y-4 md:space-y-6">
          {/* Study Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary">Nexavant 50mg Tablets - Batch NX-2025-001</h3>
                  <p className="text-sm text-text-muted">ICH Q1A Long-term (25°C/60% RH) - 36 months</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="green" size="sm">On Track</Badge>
                  <Badge color="blue" size="sm">Predicted Shelf Life: 36 months</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Assay Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-accent-blue" />
                    <h3 className="font-semibold text-text-primary">Assay Trend</h3>
                  </div>
                  <Badge color="green" size="sm">Within Spec</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={assayTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="timepoint" stroke="#9ca3af" fontSize={12} />
                      <YAxis domain={[90, 110]} stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number | null) => value ? `${value}%` : 'Pending'}
                      />
                      <Legend />
                      <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Lower Spec', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={105} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Upper Spec', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="assay" name="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5, fill: '#3b82f6' }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Dissolution Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-accent-green" />
                    <h3 className="font-semibold text-text-primary">Dissolution Trend</h3>
                  </div>
                  <Badge color="green" size="sm">Within Spec</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dissolutionTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="timepoint" stroke="#9ca3af" fontSize={12} />
                      <YAxis domain={[70, 100]} stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number | null) => value ? `${value}%` : 'Pending'}
                      />
                      <Legend />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Lower Spec (80%)', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="dissolution" name="Actual" stroke="#10b981" strokeWidth={2} dot={{ r: 5, fill: '#10b981' }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Impurity Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-accent-amber" />
                    <h3 className="font-semibold text-text-primary">Related Substances Trend</h3>
                  </div>
                  <Badge color="green" size="sm">Within Spec</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={impurityTrendData}>
                      <defs>
                        <linearGradient id="colorImpurity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="timepoint" stroke="#9ca3af" fontSize={12} />
                      <YAxis domain={[0, 1.2]} stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f3f4f6'
                        }}
                        formatter={(value: number | null) => value ? `${value}%` : 'Pending'}
                      />
                      <Legend />
                      <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Upper Spec (1.0%)', fill: '#ef4444', fontSize: 10 }} />
                      <Area type="monotone" dataKey="impurity" name="Actual" stroke="#f59e0b" fill="url(#colorImpurity)" strokeWidth={2} dot={{ r: 5, fill: '#f59e0b' }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Shelf Life Prediction */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent-purple" />
                  <h3 className="font-semibold text-text-primary">Shelf Life Prediction</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-card rounded-lg border border-border">
                    <div className="text-sm text-text-muted mb-1">Predicted Shelf Life (95% CI)</div>
                    <div className="text-3xl font-bold text-accent-green">36 months</div>
                    <div className="text-sm text-text-muted mt-1">Based on Arrhenius kinetics model</div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-xs text-text-muted">Limiting Parameter</div>
                      <div className="font-medium text-text-primary">Assay</div>
                    </div>
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-xs text-text-muted">Degradation Rate</div>
                      <div className="font-medium text-text-primary">0.15%/month</div>
                    </div>
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-xs text-text-muted">R² (Model Fit)</div>
                      <div className="font-medium text-accent-green">0.994</div>
                    </div>
                    <div className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-xs text-text-muted">Confidence</div>
                      <div className="font-medium text-accent-green">High</div>
                    </div>
                  </div>

                  <Button variant="primary" className="w-full" onClick={() => toast.success('Stability action recorded — specification updated')}>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Stability Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* v0.125.75: eCTD Dual-Rep — Stability Report */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-text-primary">Stability Document Package</h3>
              </CardHeader>
              <CardContent>
                <DualRepDocumentBlock
                  packageTitle="Stability Study Document Package"
                  docs={[
                    { label: 'Stability Study Report', ectdPath: 'm3/32-body-data/325-stab/3251-dp/stability-report-CURRENT.pdf', type: 'stability', sampleUrl: 'https://database.ich.org/sites/default/files/Q1A%28R2%29%20Guideline.pdf' },
                    { label: 'Stability Protocol', ectdPath: 'm3/32-body-data/325-stab/3251-dp/stability-protocol-v2.pdf', type: 'protocol', sampleUrl: 'https://database.ich.org/sites/default/files/Q1A%28R2%29%20Guideline.pdf' },
                    { label: 'Stability Data Tabulation', ectdPath: 'm3/32-body-data/325-stab/3251-dp/stability-data-tables.pdf', type: 'raw-data', sampleUrl: 'https://database.ich.org/sites/default/files/Q1E_Guideline.pdf' },
                  ]}
                  ectdMeta={{ module: 'Module 3.2', section: '3.2.P.8 / 3.2.S.7 — Stability', ichReference: 'ICH Q1A(R2), Q1E' }}
                  structuredDataNote="Time-point assay results, degradant levels, pH measurements, and shelf-life predictions are stored as structured records in Ligature. This enables real-time trending against ICH specifications, Arrhenius modelling updates, and direct authoring of Module 3.2 stability summaries. The stability report document is the regulatory master; structured data drives the predictive intelligence layer."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}

export default StabilityScreen;
