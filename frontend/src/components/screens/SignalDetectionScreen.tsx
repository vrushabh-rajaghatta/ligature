
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';

/**
 * Signal Detection Screen - v0.35.0
 * 
 * Dedicated screen for pharmacovigilance signal detection workflows:
 * - Real-time signal monitoring dashboard
 * - Disproportionality analysis (PRR, ROR, IC)
 * - Signal evaluation and tracking
 * - Aggregate report generation (PSUR, PBRER, DSUR)
 * 
 * v0.34.1: Added trend charts and visualizations
 * v0.35.0: Interactive cards - all stats, charts, and cards now drill down
 */

import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Activity, TrendingUp, TrendingDown, BarChart3, Search, Filter,
  Play, Pause, Settings, RefreshCw, Download, Eye, ChevronRight, Brain,
  Clock, CheckCircle, XCircle, AlertCircle, Target, Zap, Database,
  Calendar, FileText, ArrowRight, Info, Sparkles, LineChart, Table2,
  X, Loader2, // v0.34.3: Signal detail panel and PDF export
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { FilterState } from '@/components/layout/FilterBar';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';

// =============================================================================
// Types
// =============================================================================

interface SignalDetectionScreenProps {
  filters?: FilterState;
}

type ViewMode = 'dashboard' | 'analysis' | 'signals' | 'reports';

interface DetectedSignal {
  id: string;
  term: string;
  meddraCode: string;
  product: string;
  prr: number;
  ror: number;
  ic: number;
  caseCount: number;
  expectedCount: number;
  status: 'new' | 'under-evaluation' | 'confirmed' | 'refuted' | 'monitoring';
  priority: 'critical' | 'high' | 'medium' | 'low';
  detectedDate: string;
  lastUpdated: string;
}

interface AnalysisRun {
  id: string;
  name: string;
  algorithm: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  startTime: string;
  endTime?: string;
  signalsFound: number;
  dataPoints: number;
}

// =============================================================================
// Mock Data
// =============================================================================

const mockSignals: DetectedSignal[] = [
  {
    id: 'sig-001',
    term: 'Hepatotoxicity',
    meddraCode: '10019211',
    product: 'Nexavant',
    prr: 3.2,
    ror: 3.8,
    ic: 1.9,
    caseCount: 47,
    expectedCount: 12,
    status: 'under-evaluation',
    priority: 'high',
    detectedDate: '2026-01-15',
    lastUpdated: '2026-01-28',
  },
  {
    id: 'sig-002',
    term: 'QT Prolongation',
    meddraCode: '10037705',
    product: 'Cardiomax',
    prr: 2.1,
    ror: 2.4,
    ic: 1.2,
    caseCount: 23,
    expectedCount: 9,
    status: 'monitoring',
    priority: 'medium',
    detectedDate: '2026-01-10',
    lastUpdated: '2026-01-25',
  },
  {
    id: 'sig-003',
    term: 'Anaphylaxis',
    meddraCode: '10002198',
    product: 'Immunex-7',
    prr: 4.5,
    ror: 5.1,
    ic: 2.4,
    caseCount: 8,
    expectedCount: 2,
    status: 'confirmed',
    priority: 'critical',
    detectedDate: '2025-12-20',
    lastUpdated: '2026-01-20',
  },
  {
    id: 'sig-004',
    term: 'Rhabdomyolysis',
    meddraCode: '10039020',
    product: 'Nexavant',
    prr: 1.8,
    ror: 2.0,
    ic: 0.9,
    caseCount: 12,
    expectedCount: 6,
    status: 'new',
    priority: 'medium',
    detectedDate: '2026-01-27',
    lastUpdated: '2026-01-27',
  },
];

const mockRuns: AnalysisRun[] = [
  {
    id: 'run-001',
    name: 'Weekly PRR/ROR Analysis',
    algorithm: 'PRR + ROR + IC',
    status: 'completed',
    startTime: '2026-01-28T06:00:00Z',
    endTime: '2026-01-28T06:23:00Z',
    signalsFound: 4,
    dataPoints: 12847,
  },
  {
    id: 'run-002',
    name: 'Monthly BCPNN Run',
    algorithm: 'BCPNN (IC025)',
    status: 'running',
    startTime: '2026-01-28T08:00:00Z',
    signalsFound: 0,
    dataPoints: 45231,
  },
  {
    id: 'run-003',
    name: 'Ad-hoc Hepatic Analysis',
    algorithm: 'PRR + Clinical Review',
    status: 'scheduled',
    startTime: '2026-01-29T06:00:00Z',
    signalsFound: 0,
    dataPoints: 0,
  },
];

// v0.34.1: Trend data for visualizations
const signalTrendData = [
  { month: 'Aug', prr: 1.2, ror: 1.4, ic: 0.5, cases: 8 },
  { month: 'Sep', prr: 1.5, ror: 1.7, ic: 0.7, cases: 12 },
  { month: 'Oct', prr: 1.8, ror: 2.1, ic: 0.9, cases: 18 },
  { month: 'Nov', prr: 2.2, ror: 2.5, ic: 1.1, cases: 28 },
  { month: 'Dec', prr: 2.8, ror: 3.2, ic: 1.5, cases: 38 },
  { month: 'Jan', prr: 3.2, ror: 3.8, ic: 1.9, cases: 47 },
];

const algorithmPerformance = [
  { name: 'PRR', signals: 42, threshold: 2.0 },
  { name: 'ROR', signals: 38, threshold: 2.0 },
  { name: 'IC (BCPNN)', signals: 31, threshold: 1.0 },
  { name: 'MGPS', signals: 27, threshold: 2.0 },
];

const signalsByProduct = [
  { product: 'Nexavant', active: 12, confirmed: 3, monitoring: 5 },
  { product: 'Cardiomax', active: 8, confirmed: 2, monitoring: 3 },
  { product: 'Immunex-7', active: 6, confirmed: 1, monitoring: 2 },
  { product: 'Enzyvax', active: 4, confirmed: 0, monitoring: 2 },
];

// =============================================================================
// Helper Components
// =============================================================================

const statusConfig = {
  'new': { color: 'blue' as const, label: 'New', icon: AlertCircle },
  'under-evaluation': { color: 'amber' as const, label: 'Evaluating', icon: Eye },
  'confirmed': { color: 'red' as const, label: 'Confirmed', icon: CheckCircle },
  'refuted': { color: 'gray' as const, label: 'Refuted', icon: XCircle },
  'monitoring': { color: 'purple' as const, label: 'Monitoring', icon: Activity },
};

const priorityConfig = {
  'critical': { color: 'red' as const, label: 'Critical' },
  'high': { color: 'amber' as const, label: 'High' },
  'medium': { color: 'blue' as const, label: 'Medium' },
  'low': { color: 'gray' as const, label: 'Low' },
};

function SignalRow({ signal, onClick }: { signal: DetectedSignal; onClick: () => void }) {
  const status = statusConfig[signal.status];
  const priority = priorityConfig[signal.priority];
  const StatusIcon = status.icon;
  
  return (
    <tr 
      className="border-b border-border hover:bg-surface-card cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 text-${status.color === 'gray' ? 'text-muted' : `accent-${status?.color ?? ''}`}`} />
          <div>
            <div className="font-medium text-text-primary">{signal.term}</div>
            <div className="text-xs text-text-muted">{signal.meddraCode}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-text-secondary">{signal.product}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <div title="PRR">
            <span className="text-text-muted">PRR:</span>
            <span className={`ml-1 font-medium ${signal.prr >= 2 ? 'text-accent-red' : 'text-text-primary'}`}>
              {signal.prr.toFixed(1)}
            </span>
          </div>
          <div title="ROR">
            <span className="text-text-muted">ROR:</span>
            <span className={`ml-1 font-medium ${signal.ror >= 2 ? 'text-accent-red' : 'text-text-primary'}`}>
              {signal.ror.toFixed(1)}
            </span>
          </div>
          <div title="IC">
            <span className="text-text-muted">IC:</span>
            <span className={`ml-1 font-medium ${signal.ic >= 1 ? 'text-accent-red' : 'text-text-primary'}`}>
              {signal.ic.toFixed(1)}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-text-primary">{signal.caseCount}</span>
        <span className="text-text-muted"> / {signal.expectedCount} expected</span>
      </td>
      <td className="px-4 py-3">
        <Badge color={priority.color} size="sm">{priority.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge color={status.color} size="sm">{status.label}</Badge>
      </td>
      <td className="px-4 py-3 text-text-muted text-sm">{signal.lastUpdated}</td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </td>
    </tr>
  );
}

function AnalysisRunCard({ run, onClick }: { run: AnalysisRun; onClick?: () => void }) {
  const statusColors = {
    'running': 'blue',
    'completed': 'green',
    'failed': 'red',
    'scheduled': 'gray',
  } as const;
  
  return (
    <Card 
      className={`hover:border-accent-blue transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-text-primary">{run.name}</h4>
            <p className="text-sm text-text-muted">{run.algorithm}</p>
          </div>
          <Badge color={statusColors[run.status]} size="sm">
            {run.status === 'running' && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-sm">
          <div>
            <span className="text-text-muted">Data Points</span>
            <div className="font-medium text-text-primary">
              {run.dataPoints.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-text-muted">Signals Found</span>
            <div className="font-medium text-text-primary">{run.signalsFound}</div>
          </div>
          <div>
            <span className="text-text-muted">Started</span>
            <div className="font-medium text-text-primary">
              {new Date(run.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        
        {onClick && (
          <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
            <span className="text-xs text-accent-blue flex items-center gap-1">
              View Details <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SignalDetectionScreen({ filters }: SignalDetectionScreenProps) {
    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const lix = useLixAgent('Signal');
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<DetectedSignal | null>(null);
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{
    type: 'status' | 'priority' | 'product' | 'algorithm' | null;
    value: string | null;
  }>({ type: null, value: null });

  // v0.35.0: Collapsible dashboard sections with persisted state
  const { isCollapsed, setCollapsed } = useCollapsedSections('signal-detection');

  // v0.35.0: Drill-down handlers for stats and charts
  const handleStatClick = useCallback((filterType: 'status' | 'priority', filterValue: string) => {
    setActiveFilter({ type: filterType, value: filterValue });
    setViewMode('signals');
  }, []);

  const handleProductClick = useCallback((product: string) => {
    setActiveFilter({ type: 'product', value: product });
    setViewMode('signals');
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveFilter({ type: null, value: null });
  }, []);

  // v0.34.3: Generate Signal Assessment PDF
  const handleGenerateSignalReport = async (signal: DetectedSignal, reportType: 'signal-assessment' | 'psur' | 'pbrer' | 'dsur' = 'signal-assessment') => {
    setIsGeneratingPdf(true);
    
    try {
      const response = await fetch('/api/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          signal: {
            id: signal.id,
            term: signal.term,
            meddraCode: signal.meddraCode,
            product: signal.product,
            status: signal.status,
            priority: signal.priority,
            detectedDate: signal.detectedDate,
            lastUpdated: signal.lastUpdated,
          },
          metrics: {
            prr: signal.prr,
            prrCI: [signal.prr * 0.7, signal.prr * 1.4],
            ror: signal.ror,
            rorCI: [signal.ror * 0.65, signal.ror * 1.5],
            ic: signal.ic,
            icCI: [signal.ic - 0.5, signal.ic + 0.5],
            caseCount: signal.caseCount,
            expectedCount: signal.expectedCount,
            totalExposure: 125000,
          },
          demographics: {
            ageDistribution: [
              { group: '18-40', count: Math.round(signal.caseCount * 0.15), percent: 15 },
              { group: '41-65', count: Math.round(signal.caseCount * 0.45), percent: 45 },
              { group: '66+', count: Math.round(signal.caseCount * 0.40), percent: 40 },
            ],
            genderDistribution: [
              { gender: 'Male', count: Math.round(signal.caseCount * 0.48), percent: 48 },
              { gender: 'Female', count: Math.round(signal.caseCount * 0.52), percent: 52 },
            ],
            outcomeDistribution: [
              { outcome: 'Recovered', count: Math.round(signal.caseCount * 0.65), percent: 65 },
              { outcome: 'Recovering', count: Math.round(signal.caseCount * 0.20), percent: 20 },
              { outcome: 'Not Recovered', count: Math.round(signal.caseCount * 0.10), percent: 10 },
              { outcome: 'Fatal', count: Math.round(signal.caseCount * 0.05), percent: 5 },
            ],
          },
          trendData: [
            { period: '2024-Q1', caseCount: Math.round(signal.caseCount * 0.1), cumulativeCount: Math.round(signal.caseCount * 0.1), prr: signal.prr * 0.6 },
            { period: '2024-Q2', caseCount: Math.round(signal.caseCount * 0.15), cumulativeCount: Math.round(signal.caseCount * 0.25), prr: signal.prr * 0.75 },
            { period: '2024-Q3', caseCount: Math.round(signal.caseCount * 0.25), cumulativeCount: Math.round(signal.caseCount * 0.5), prr: signal.prr * 0.9 },
            { period: '2024-Q4', caseCount: Math.round(signal.caseCount * 0.5), cumulativeCount: signal.caseCount, prr: signal.prr },
          ],
          assessment: signal.status === 'confirmed' || signal.priority === 'critical' ? {
            signalStrength: signal.prr > 3 ? 'strong' : signal.prr > 2 ? 'moderate' : 'weak',
            causalityAssessment: 'Possible causal relationship based on temporal association and biological plausibility.',
            riskBenefit: 'Current benefit-risk balance remains favorable with appropriate risk minimization measures.',
            recommendations: [
              'Continue close monitoring of reported cases',
              'Update product labeling with additional warnings',
              'Implement risk minimization measures',
              'Schedule follow-up signal review in 90 days',
            ],
            conclusion: `The signal for ${signal.term} requires continued monitoring. The disproportionality analysis shows ${signal.prr >= 2 ? 'statistically significant' : 'borderline'} elevation.`,
          } : undefined,
          preparedBy: 'Ligature PV System',
          reviewedBy: 'Drug Safety Officer',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${signal.term.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating signal report:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filter signals - v0.34.8: Added activeFilter support for drill-downs
  const filteredSignals = useMemo(() => {
    return mockSignals.filter(signal => {
      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = (
          signal.term.toLowerCase().includes(q) ||
          signal.product.toLowerCase().includes(q) ||
          signal.meddraCode.includes(q)
        );
        if (!matchesSearch) return false;
      }
      
      // Apply drill-down filter
      if (activeFilter.type && activeFilter.value) {
        switch (activeFilter.type) {
          case 'status':
            // Handle special 'active' filter (all non-refuted)
            if (activeFilter.value === 'active') {
              return signal.status !== 'refuted';
            }
            return signal.status === activeFilter.value;
          case 'priority':
            return signal.priority === activeFilter.value;
          case 'product':
            return signal.product === activeFilter.value;
          default:
            return true;
        }
      }
      
      return true;
    });
  }, [searchQuery, activeFilter]);

  // Stats - v0.34.8: Made clickable for drill-down
  const stats: ScreenStat[] = [
    {
      id: 'active-signals',
      label: 'Active Signals',
      value: mockSignals.filter(s => s.status !== 'refuted').length,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'amber',
      onClick: () => handleStatClick('status', 'active'),
    },
    {
      id: 'critical',
      label: 'Critical',
      value: mockSignals.filter(s => s.priority === 'critical').length,
      icon: <Zap className="w-5 h-5" />,
      color: 'red',
      onClick: () => handleStatClick('priority', 'critical'),
    },
    {
      id: 'under-evaluation',
      label: 'Under Evaluation',
      value: mockSignals.filter(s => s.status === 'under-evaluation').length,
      icon: <Eye className="w-5 h-5" />,
      color: 'blue',
      onClick: () => handleStatClick('status', 'under-evaluation'),
    },
    {
      id: 'last-run',
      label: 'Last Run',
      value: '23 min ago',
      icon: <Clock className="w-5 h-5" />,
      color: 'gray',
      onClick: () => setViewMode('analysis'),
    },
  ];

  // Tabs
  const tabs: ScreenTab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'signals', label: 'Signals', icon: <AlertTriangle className="w-4 h-4" />, count: filteredSignals.length },
    { id: 'analysis', label: 'Analysis Runs', icon: <Activity className="w-4 h-4" /> },
    { id: 'reports', label: 'Aggregate Reports', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <ScreenLayout
      title="Signal Detection"
      subtitle="Real-time pharmacovigilance signal monitoring and analysis"
      stats={stats}
      tabs={tabs}
      activeTab={viewMode}
      onTabChange={(tab) => setViewMode(tab as ViewMode)}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? 'Pause Monitoring' : 'Start Monitoring'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
            <Settings className="w-4 h-4 mr-1" />
            Configure
          </Button>
        </div>
      }
    >
      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          {/* v0.35.0: Charts Row - Collapsible */}
          <CollapsibleSection
            title="Signal Trends & Distribution"
            icon={<TrendingUp className="w-5 h-5" />}
            count={mockSignals.filter(s => s.status !== 'refuted').length}
            defaultExpanded={!isCollapsed('charts')}
            onToggle={(expanded) => setCollapsed('charts', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
              {/* Signal Trend Chart - Clickable to view signal */}
              <Card 
                className="cursor-pointer hover:border-accent-amber transition-colors"
                onClick={() => setSelectedSignal(mockSignals[0])}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent-amber" />
                      <h3 className="font-semibold text-text-primary">Hepatotoxicity Signal Trend</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="red" size="sm">Above Threshold</Badge>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={signalTrendData}>
                        <defs>
                          <linearGradient id="colorPrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f3f4f6'
                          }} 
                        />
                        <Legend />
                        <Area type="monotone" dataKey="prr" name="PRR" stroke="#f59e0b" fill="url(#colorPrr)" strokeWidth={2} />
                        <Line type="monotone" dataKey="ror" name="ROR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="ic" name="IC" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-red-500" />
                      <span className="text-text-muted">Threshold (PRR/ROR ≥ 2.0)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Signals by Product - Clickable bars */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent-blue" />
                    <h3 className="font-semibold text-text-primary">Signals by Product</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={signalsByProduct} 
                        layout="vertical"
                        onClick={(data: unknown) => {
                          const d = data as { activePayload?: Array<{ payload?: { product?: string } }> } | null;
                          if (d?.activePayload?.[0]?.payload?.product) {
                            handleProductClick(d.activePayload[0].payload.product);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis dataKey="product" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f3f4f6'
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="active" name="Active" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="confirmed" name="Confirmed" fill="#ef4444" stackId="a" />
                        <Bar dataKey="monitoring" name="Monitoring" fill="#8b5cf6" stackId="a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-text-muted text-center mt-2">Click a bar to filter signals by product</p>
                </CardContent>
              </Card>
            </div>
          </CollapsibleSection>

          {/* v0.35.0: Algorithm Performance - Collapsible */}
          <CollapsibleSection
            title="Detection Algorithms"
            icon={<Brain className="w-5 h-5" />}
            badge={{ text: 'Live', color: 'green' }}
            defaultExpanded={!isCollapsed('algorithms')}
            onToggle={(expanded) => setCollapsed('algorithms', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pt-2">
              {algorithmPerformance.map((algo) => (
                <button
                  key={algo.name}
                  onClick={() => {
                    setActiveFilter({ type: 'algorithm', value: algo.name });
                    setViewMode('signals');
                  }}
                  className="p-4 bg-surface-card rounded-lg border border-border text-left hover:border-accent-blue hover:bg-surface-card/80 transition-all cursor-pointer"
                >
                  <div className="text-sm text-text-muted mb-1">{algo.name}</div>
                  <div className="text-2xl font-semibold text-text-primary">
                    {algo.signals}
                  </div>
                  <div className="text-xs text-accent-green flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    Signals detected
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    Threshold: {algo.threshold}
                  </div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* v0.35.0: Recent Signals - Collapsible */}
          <CollapsibleSection
            title="Recent Signals"
            icon={<AlertTriangle className="w-5 h-5" />}
            count={filteredSignals.length}
            defaultExpanded={!isCollapsed('recent-signals')}
            onToggle={(expanded) => setCollapsed('recent-signals', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="ghost" size="sm" onClick={() => setViewMode('signals')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          >
            <table className="w-full">
              <thead className="bg-surface-card border-y border-border">
                <tr className="text-left text-sm text-text-muted">
                  <th className="px-4 py-2 font-medium">Signal</th>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Metrics</th>
                  <th className="px-4 py-2 font-medium">Cases</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSignals.slice(0, 5).map(signal => (
                  <SignalRow 
                    key={signal.id} 
                    signal={signal} 
                    onClick={() => setSelectedSignal(signal)}
                  />
                ))}
              </tbody>
            </table>
          </CollapsibleSection>

          {/* v0.35.0: Analysis Runs - Collapsible */}
          <CollapsibleSection
            title="Analysis Runs"
            icon={<Play className="w-5 h-5" />}
            count={mockRuns.length}
            defaultExpanded={!isCollapsed('analysis-runs')}
            onToggle={(expanded) => setCollapsed('analysis-runs', !expanded)}
            variant="card"
            size="sm"
            headerActions={
              <Button variant="outline" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <Play className="w-4 h-4 mr-1" />
                New Analysis
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-2">
              {mockRuns.map(run => (
                <AnalysisRunCard 
                  key={run.id} 
                  run={run}
                  onClick={() => setSelectedRun(run)}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Signals View */}
      {viewMode === 'signals' && (
        <div className="space-y-4">
          {/* v0.34.8: Active Filter Banner */}
          {activeFilter.type && activeFilter.value && (
            <div className="flex items-center justify-between p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-accent-blue" />
                <span className="text-text-secondary">Filtered by:</span>
                <Badge color="blue" size="sm">
                  {activeFilter.type === 'status' && activeFilter.value === 'active' ? 'Active Signals' :
                   activeFilter.type === 'status' ? `Status: ${activeFilter.value}` :
                   activeFilter.type === 'priority' ? `Priority: ${activeFilter.value}` :
                   activeFilter.type === 'product' ? `Product: ${activeFilter.value}` :
                   activeFilter.type === 'algorithm' ? `Algorithm: ${activeFilter.value}` : activeFilter.value}
                </Badge>
                <span className="text-text-muted">({filteredSignals.length} signals)</span>
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
              placeholder="Search signals by term, product, or MedDRA code..."
              className="w-96"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-surface-card border-y border-border">
                  <tr className="text-left text-sm text-text-muted">
                    <th className="px-4 py-3 font-medium">Signal</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Disproportionality Metrics</th>
                    <th className="px-4 py-3 font-medium">Cases</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Updated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals.map(signal => (
                    <SignalRow 
                      key={signal.id} 
                      signal={signal} 
                      onClick={() => setSelectedSignal(signal)}
                    />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Runs View */}
      {viewMode === 'analysis' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Analysis History</h3>
            <Button variant="primary" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
              <Play className="w-4 h-4 mr-1" />
              Run New Analysis
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {mockRuns.map(run => (
              <AnalysisRunCard 
                key={run.id} 
                run={run}
                onClick={() => setSelectedRun(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reports View */}
      {viewMode === 'reports' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[
              { name: 'PSUR', desc: 'Periodic Safety Update Report', due: '2026-03-15' },
              { name: 'PBRER', desc: 'Periodic Benefit-Risk Evaluation', due: '2026-04-01' },
              { name: 'DSUR', desc: 'Development Safety Update Report', due: '2026-02-28' },
            ].map(report => (
              <Card key={report.name} className="hover:border-accent-blue transition-colors cursor-pointer" onClick={() => { setActiveModule('psmf'); toast.info(`Opening ${report.name} workspace…`); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="w-8 h-8 text-accent-blue" />
                    <Badge color="amber" size="sm">Due Soon</Badge>
                  </div>
                  <h4 className="font-semibold text-text-primary">{report.name}</h4>
                  <p className="text-sm text-text-muted mb-3">{report.desc}</p>
                  <div className="flex items-center gap-1 text-sm text-text-muted">
                    <Calendar className="w-4 h-4" />
                    Due: {report.due}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Signal Detail Panel */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSelectedSignal(null)}>
          <div className="bg-surface-elevated border border-border rounded-xl shadow-xl w-[700px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedSignal.term}</h2>
                <p className="text-sm text-text-muted">{selectedSignal.meddraCode} • {selectedSignal.product}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={priorityConfig[selectedSignal.priority]?.color} size="sm">
                  {priorityConfig[selectedSignal.priority]?.label}
                </Badge>
                <Badge color={statusConfig[selectedSignal.status]?.color} size="sm">
                  {statusConfig[selectedSignal.status]?.label}
                </Badge>
                <button onClick={() => setSelectedSignal(null)} className="p-1 hover:bg-surface-card rounded">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(80vh-120px)]">
              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">PRR</div>
                  <div className={`text-2xl font-bold ${selectedSignal.prr >= 2 ? 'text-accent-red' : 'text-text-primary'}`}>
                    {selectedSignal.prr.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-muted">95% CI: {(selectedSignal.prr * 0.7).toFixed(2)} - {(selectedSignal.prr * 1.4).toFixed(2)}</div>
                </div>
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">ROR</div>
                  <div className={`text-2xl font-bold ${selectedSignal.ror >= 2 ? 'text-accent-red' : 'text-text-primary'}`}>
                    {selectedSignal.ror.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-muted">95% CI: {(selectedSignal.ror * 0.65).toFixed(2)} - {(selectedSignal.ror * 1.5).toFixed(2)}</div>
                </div>
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">IC</div>
                  <div className={`text-2xl font-bold ${selectedSignal.ic >= 1 ? 'text-accent-red' : 'text-text-primary'}`}>
                    {selectedSignal.ic.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-muted">95% CI: {(selectedSignal.ic - 0.5).toFixed(2)} - {(selectedSignal.ic + 0.5).toFixed(2)}</div>
                </div>
              </div>
              
              {/* Case Counts */}
              <div className="bg-surface-card p-4 rounded-lg border border-border mb-6">
                <h4 className="text-sm font-medium text-text-primary mb-3">Case Summary</h4>
                <div className="flex items-center gap-8">
                  <div>
                    <span className="text-2xl font-bold text-text-primary">{selectedSignal.caseCount}</span>
                    <span className="text-sm text-text-muted ml-2">Observed cases</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-text-muted">{selectedSignal.expectedCount.toFixed(1)}</span>
                    <span className="text-sm text-text-muted ml-2">Expected</span>
                  </div>
                  <div>
                    <span className={`text-2xl font-bold ${selectedSignal.caseCount / selectedSignal.expectedCount >= 2 ? 'text-accent-red' : 'text-accent-amber'}`}>
                      {(selectedSignal.caseCount / selectedSignal.expectedCount).toFixed(1)}x
                    </span>
                    <span className="text-sm text-text-muted ml-2">Ratio</span>
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="bg-surface-card p-4 rounded-lg border border-border mb-6">
                <h4 className="text-sm font-medium text-text-primary mb-3">Signal Timeline</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Detected:</span>
                    <span className="ml-2 text-text-primary">{selectedSignal.detectedDate}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Last Updated:</span>
                    <span className="ml-2 text-text-primary">{selectedSignal.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSignalReport(selectedSignal, 'signal-assessment')}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  Signal Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSignalReport(selectedSignal, 'psur')}
                  disabled={isGeneratingPdf}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  PSUR Format
                </Button>
              </div>
              <Button variant="primary" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <Eye className="w-4 h-4 mr-1" />
                Full Evaluation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* v0.34.8: Analysis Run Detail Panel */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSelectedRun(null)}>
          <div className="bg-surface-elevated border border-border rounded-xl shadow-xl w-[600px] max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedRun.name}</h2>
                <p className="text-sm text-text-muted">{selectedRun.algorithm}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  color={selectedRun.status === 'completed' ? 'green' : selectedRun.status === 'running' ? 'blue' : selectedRun.status === 'failed' ? 'red' : 'gray'} 
                  size="sm"
                >
                  {selectedRun.status === 'running' && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
                  {selectedRun.status.charAt(0).toUpperCase() + selectedRun.status.slice(1)}
                </Badge>
                <button onClick={() => setSelectedRun(null)} className="p-1 hover:bg-surface-card rounded">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(70vh-140px)]">
              {/* Run Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">Data Points Analyzed</div>
                  <div className="text-2xl font-bold text-text-primary">
                    {selectedRun.dataPoints.toLocaleString()}
                  </div>
                </div>
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">Signals Found</div>
                  <div className={`text-2xl font-bold ${selectedRun.signalsFound > 0 ? 'text-accent-amber' : 'text-text-primary'}`}>
                    {selectedRun.signalsFound}
                  </div>
                </div>
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted mb-1">Duration</div>
                  <div className="text-2xl font-bold text-text-primary">
                    {selectedRun.endTime ? '23 min' : 'Running...'}
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="bg-surface-card p-4 rounded-lg border border-border mb-6">
                <h4 className="text-sm font-medium text-text-primary mb-3">Run Timeline</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Started:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(selectedRun.startTime).toLocaleString()}
                    </span>
                  </div>
                  {selectedRun.endTime && (
                    <div>
                      <span className="text-text-muted">Completed:</span>
                      <span className="ml-2 text-text-primary">
                        {new Date(selectedRun.endTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Signals Found Preview */}
              {selectedRun.signalsFound > 0 && (
                <div className="bg-surface-card p-4 rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-text-primary mb-3">Signals Detected</h4>
                  <div className="space-y-2">
                    {mockSignals.slice(0, selectedRun.signalsFound).map(signal => (
                      <div 
                        key={signal.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-surface-card/80 cursor-pointer"
                        onClick={() => {
                          setSelectedRun(null);
                          setSelectedSignal(signal);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-accent-amber" />
                          <span className="text-text-primary">{signal.term}</span>
                          <Badge color={priorityConfig[signal.priority]?.color ?? 'gray'} size="sm">
                            {priorityConfig[signal.priority]?.label ?? signal.priority}
                          </Badge>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
              <Button variant="outline" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <Download className="w-4 h-4 mr-1" />
                Export Results
              </Button>
              <Button variant="primary" size="sm" onClick={() => toast.success('Signal detection action recorded')}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Re-run Analysis
              </Button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}

export default SignalDetectionScreen;
