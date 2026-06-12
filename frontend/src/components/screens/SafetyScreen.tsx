
import { FilterState } from '@/components/layout/FilterBar';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AlertTriangle, FileText, Clock, CheckCircle, TrendingUp, Search, Plus, Calendar, 
  Globe, Activity, BarChart3, Eye, ChevronRight, Sparkles, ArrowRight, ExternalLink, 
  Brain, Target, Link2, Send, X, Download, FileCode, Check, RefreshCw, 
  User, Building, MapPin, Pill, ClipboardList, Users, Copy,
  // v181: Signal detection icons
  Settings2, Play, History, Info, ChevronDown, ChevronUp, Filter, Table2, LineChart,
  Beaker, FlaskConical, CircleDot, TrendingDown, Minus, Database, Zap,
  // v0.6.0: Signal Impact Center icons
  Workflow, Tag, MessageSquare, Stethoscope, Shield, Truck, AlertCircle,
  // v0.13.25: Save indicator
  Loader2,
} from 'lucide-react';
import { useProducts } from '@/stores/products-store';
import { 
  icsrCases, safetySignals, similarSignals, periodicReports, ICSR, SafetySignal,
  searchMedDRA, MedDRATerm, disproportionalityData, hepatotoxicityTrend,
  // v181: Enhanced signal detection
  extendedDisproportionalityData, ExtendedDisproportionality, 
  signalDetectionRuns, SignalDetectionRun, defaultSignalConfig, SignalAlgorithm,
} from '@/data/safety-data';
// v0.6.0: Signal Cascade imports
import {
  hepatotoxicityCascade, cascadeCategoryMeta, getCascadeProgress, getCriticalActions,
  CascadeAction, CascadeCategory, SignalCascade, CascadeStageSummary,
} from '@/data/signal-cascade-data';
// v95: UI Component Library imports
// v176: Added ReturnBreadcrumb for cross-module navigation
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter, StatCard } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar, LabeledProgress } from '@/components/ui/Progress';
// v0.27.3: New layout components for demo polish
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { DrillableStatCard, columnRenderers, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { CompactStatBar } from '@/components/ui/CompactStatBar';
import { ResizableSplitView } from '@/components/ui/ResizableSplitView';
import { StatCardGridSkeleton, CardSkeleton, TableSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { SafetyScreenSkeleton } from '@/components/ui/ModuleContainer';
import { ModuleActivity } from '@/components/ui/ActivityFeed';
import { useActivityStore } from '@/store/useActivityStore';
// v112: Cross-module navigation
import { useIncomingNavigation, SafetyViewMode } from '@/hooks/useModuleNavigation';
// v159: Cross-module event system
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useCascadeEngine } from '@/store/useCascadeEngine';
// v0.12.6: State preservation for navigation
import { usePreserveModuleState } from '@/hooks/usePreserveModuleState';
// v0.35.0: Collapsible sections with persisted state
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
// v0.13.25: Toast and API for draft persistence
import { useToast } from '@/components/ui/Toast';
import { safetyApi } from '@/lib/safety-api';
// v0.13.27: ICSR Workflow Status
import { WorkflowStatus } from '@/components/safety/WorkflowStatus';
import type { ICSRWorkflowStatus } from '@/lib/safety-api';
// v0.13.31: XML Preview Panel
import { XMLPreviewPanel } from '@/components/safety/XMLPreviewPanel';
// v0.13.32: Gateway Submission Panel
import { GatewaySubmissionPanel } from '@/components/safety/GatewaySubmissionPanel';
// v0.27.54: AI Signal Analysis
import { SignalAnalysisPanel } from '@/components/safety/SignalAnalysisPanel';
// v0.27.68: Module 2.7.4 Narrative Streaming
import { SafetyNarrativeStreamingPanel } from '@/components/safety/SafetyNarrativeStreamingPanel';
// v0.86.0: Aggregate report generation
import { AggregateReportGenerationPanel } from '@/components/safety/AggregateReportGenerationPanel';
// v0.43.5: Supabase persistence
import { useSafetyPersistence } from '@/hooks/useSafetyPersistence';
import { SafetySyncStatus } from '@/components/safety/SafetySyncStatus';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAppStore } from '@/store/useAppStore';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';
import { ElectronicSignatureModal } from '@/components/ui/ElectronicSignatureModal';
import type { SignatureContext } from '@/services/electronic-signature-service';
import { useDeadClick } from '@/hooks/useDeadClick';

type SafetyView = 'overview' | 'signals' | 'signal-detail' | 'icsr' | 'case-detail' | 'case-intake' | 'signal-detection' | 'reports' | 'signal-impact';

// v95: Color mappings for Badge components
const caseStatusColorMap: Record<string, 'blue' | 'amber' | 'green' | 'purple' | 'gray'> = {
  new: 'blue',
  processing: 'amber',
  submitted: 'green',
  'follow-up': 'purple',
  'under-evaluation': 'amber',
  confirmed: 'purple',
  refuted: 'gray',
  closed: 'green',
};

const priorityColorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
  critical: 'red',
  high: 'amber',
  medium: 'blue',
  low: 'gray',
};

const signalStrengthColorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
  strong: 'red',
  moderate: 'amber',
  weak: 'blue',
  none: 'gray',
};

const causalityColorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
  certain: 'red',
  probable: 'amber',
  possible: 'blue',
  unlikely: 'gray',
};

const seriousnessColorMap: Record<string, 'red' | 'gray'> = {
  serious: 'red',
  'non-serious': 'gray',
};

const reportStatusColorMap: Record<string, 'blue' | 'amber' | 'green' | 'gray'> = {
  draft: 'gray',
  'in-progress': 'blue',
  'under-review': 'amber',
  submitted: 'green',
  approved: 'green',
};

// v181: Signal status color map for detection dashboard
const signalStatusColorMap: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'gray'> = {
  'new': 'blue',
  'under-evaluation': 'amber',
  'confirmed': 'red',
  'refuted': 'gray',
};

// v181: Algorithm display names
const algorithmDisplayNames: Record<SignalAlgorithm, string> = {
  prr: 'PRR (Proportional Reporting Ratio)',
  ror: 'ROR (Reporting Odds Ratio)',
  ebgm: 'EBGM (Empirical Bayes Geometric Mean)',
  ic: 'IC (Information Component)',
  chi2: 'Chi-Square Test',
};

// ============================================================================
// v181: SIGNAL DETECTION DASHBOARD COMPONENT
// ============================================================================

interface SignalDetectionDashboardProps {
  disproportionalityData: ExtendedDisproportionality[];
  signalRuns: SignalDetectionRun[];
  trendData: typeof hepatotoxicityTrend;
}

function SignalDetectionDashboard({ disproportionalityData, signalRuns, trendData }: SignalDetectionDashboardProps) {
  // State for dashboard
    const { deadClick } = useDeadClick();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SignalAlgorithm>('ebgm');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ExtendedDisproportionality | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [selectedSignal, setSelectedSignal] = useState<SafetySignal | null>(safetySignals[0]);
  
  // Configurable thresholds
  const [thresholds, setThresholds] = useState({
    prr: 2.0,
    ror: 2.0,
    ebgm05: 2.0,
    ic025: 0.5,
    chi2: 4.0,
    minCases: 3,
  });

  // Toast notifications
  const toast = useToast();

  // Filtered data based on algorithm thresholds
  const signalsAboveThreshold = useMemo(() => {
    return disproportionalityData.filter(d => {
      switch (selectedAlgorithm) {
        case 'prr': return d.prr >= thresholds.prr;
        case 'ror': return d.ror >= thresholds.ror;
        case 'ebgm': return d.ebgm05 >= thresholds.ebgm05;
        case 'ic': return d.icLower >= thresholds.ic025;
        case 'chi2': return d.chi2 >= thresholds.chi2;
        default: return d.ebgm05 >= thresholds.ebgm05;
      }
    });
  }, [disproportionalityData, selectedAlgorithm, thresholds]);

  // Stats
  const stats = useMemo(() => {
    const strong = disproportionalityData.filter(d => d.signalStrength === 'strong').length;
    const moderate = disproportionalityData.filter(d => d.signalStrength === 'moderate').length;
    const confirmed = disproportionalityData.filter(d => d.signalStatus === 'confirmed').length;
    const underEval = disproportionalityData.filter(d => d.signalStatus === 'under-evaluation').length;
    return { strong, moderate, confirmed, underEval, total: disproportionalityData.length };
  }, [disproportionalityData]);

  // Simulate running analysis
  const handleRunAnalysis = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  // Get metric value based on selected algorithm
  const getMetricValue = (d: ExtendedDisproportionality) => {
    switch (selectedAlgorithm) {
      case 'prr': return d.prr;
      case 'ror': return d.ror;
      case 'ebgm': return d.ebgm;
      case 'ic': return d.ic;
      case 'chi2': return d.chi2;
      default: return d.ebgm;
    }
  };

  // Get threshold for selected algorithm
  const getCurrentThreshold = () => {
    switch (selectedAlgorithm) {
      case 'prr': return thresholds.prr;
      case 'ror': return thresholds.ror;
      case 'ebgm': return thresholds.ebgm05;
      case 'ic': return thresholds.ic025;
      case 'chi2': return thresholds.chi2;
      default: return thresholds.ebgm05;
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* v0.50.0: ViewOnlyBanner moved to top-level ScreenHeader */}
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Signal Detection Dashboard</h1>
            <p className="text-sm text-text-muted mt-1">Quantitative disproportionality analysis with PRR, ROR, EBGM, and IC metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
              defaultValue="lig-2847"
            >
              <option value="lig-2847">LIG-2847 (Ligrastinib)</option>
              <option value="lig-1182">LIG-1182</option>
              <option value="lig-3021">LIG-3021</option>
            </select>
            <select 
              className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"
              defaultValue="faers-internal"
            >
              <option value="faers-internal">FAERS + Internal DB</option>
              <option value="faers">FAERS Only</option>
              <option value="eudravigilance">EudraVigilance</option>
              <option value="vigibase">VigiBase (WHO)</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => setShowRunHistory(true)}>
              <History className="w-4 h-4" />Run History
            </Button>
            <Button variant="primary" onClick={handleRunAnalysis} disabled={isRunning}>
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
          <StatCard
            label="Total Events Analyzed"
            value={stats.total}
            icon={<Database className="w-5 h-5" />}
            accentColor="blue"
          >
            <span className="text-xs text-text-muted">MedDRA PTs</span>
          </StatCard>
          <StatCard
            label="Strong Signals"
            value={stats.strong}
            icon={<AlertTriangle className="w-5 h-5" />}
            accentColor="red"
          >
            <span className="text-xs text-text-muted">Above all thresholds</span>
          </StatCard>
          <StatCard
            label="Moderate Signals"
            value={stats.moderate}
            icon={<CircleDot className="w-5 h-5" />}
            accentColor="amber"
          >
            <span className="text-xs text-text-muted">Require evaluation</span>
          </StatCard>
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            icon={<CheckCircle className="w-5 h-5" />}
            accentColor="purple"
          >
            <span className="text-xs text-text-muted">In pharmacovigilance</span>
          </StatCard>
          <StatCard
            label="Under Evaluation"
            value={stats.underEval}
            icon={<FlaskConical className="w-5 h-5" />}
            accentColor="blue"
          >
            <span className="text-xs text-text-muted">Active review</span>
          </StatCard>
        </div>

        {/* Algorithm Selection & Configuration */}
        <div className="mb-6 p-4 bg-surface-elevated border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Algorithm:</span>
                <ButtonGroup>
                  {(['prr', 'ror', 'ebgm', 'ic', 'chi2'] as SignalAlgorithm[]).map(algo => (
                    <Button
                      key={algo}
                      variant={selectedAlgorithm === algo ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedAlgorithm(algo)}
                    >
                      {algo.toUpperCase()}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Threshold:</span>
                  <span className={`font-semibold ${signalsAboveThreshold.length > 0 ? 'text-accent-red' : 'text-text-primary'}`}>
                    ≥{getCurrentThreshold().toFixed(selectedAlgorithm === 'ic' ? 1 : 1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Signals:</span>
                  <span className="font-semibold text-accent-red">{signalsAboveThreshold.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Min Cases:</span>
                  <span className="font-medium">{thresholds.minCases}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonGroup>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'chart' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('chart')}
                >
                  <LineChart className="w-4 h-4" />
                </Button>
              </ButtonGroup>
              <Button variant="ghost" size="sm" onClick={() => setShowConfigPanel(!showConfigPanel)}>
                <Settings2 className="w-4 h-4" />Configure
              </Button>
            </div>
          </div>

          {/* Expandable Configuration Panel */}
          {showConfigPanel && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1">PRR Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.prr}
                    onChange={e => setThresholds(t => ({ ...t, prr: parseFloat(e.target.value) || 2 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">ROR Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.ror}
                    onChange={e => setThresholds(t => ({ ...t, ror: parseFloat(e.target.value) || 2 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">EBGM05 Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.ebgm05}
                    onChange={e => setThresholds(t => ({ ...t, ebgm05: parseFloat(e.target.value) || 2 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">IC₀.₂₅ Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.ic025}
                    onChange={e => setThresholds(t => ({ ...t, ic025: parseFloat(e.target.value) || 0.5 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Chi² Threshold</label>
                  <input
                    type="number"
                    step="0.5"
                    value={thresholds.chi2}
                    onChange={e => setThresholds(t => ({ ...t, chi2: parseFloat(e.target.value) || 4 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Min Cases</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={thresholds.minCases}
                    onChange={e => setThresholds(t => ({ ...t, minCases: parseInt(e.target.value) || 3 }))}
                    className="w-full px-2 py-1.5 bg-surface-card border border-border rounded text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                <Info className="w-4 h-4" />
                <span>Standard thresholds: PRR ≥2.0, ROR ≥2.0, EBGM05 ≥2.0, IC₀.₂₅ ≥0.5, Chi² ≥4.0, Min 3 cases</span>
                <button 
                  className="text-accent-blue hover:underline"
                  onClick={() => setThresholds({ prr: 2.0, ror: 2.0, ebgm05: 2.0, ic025: 0.5, chi2: 4.0, minCases: 3 })}
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content: Table or Chart View */}
        {viewMode === 'table' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Results Table - 2 columns */}
            <div className="col-span-1 md:col-span-2">
              <Card variant="elevated" padding="none">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Disproportionality Results</h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Last run: Dec 15, 2024 14:30</span>
                    <span>•</span>
                    <span>Duration: 2.3s</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface-card">
                        <th className="text-left p-3 text-xs font-medium text-text-muted">Event (MedDRA PT)</th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">n</th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">
                          PRR
                          <span className="block text-[10px] font-normal">(95% CI)</span>
                        </th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">
                          ROR
                          <span className="block text-[10px] font-normal">(95% CI)</span>
                        </th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">
                          EBGM
                          <span className="block text-[10px] font-normal">(EB05-EB95)</span>
                        </th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">
                          IC
                          <span className="block text-[10px] font-normal">(IC₀.₂₅)</span>
                        </th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">Signal</th>
                        <th className="text-center p-3 text-xs font-medium text-text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disproportionalityData.map((row, idx) => {
                        const isAboveThreshold = getMetricValue(row) >= getCurrentThreshold();
                        const isSelected = selectedEvent?.eventName === row.eventName;
                        return (
                          <tr 
                            key={idx} 
                            className={`border-b border-border/50 cursor-pointer transition-colors ${
                              row.signalStrength === 'strong' ? 'bg-accent-red/5' : 
                              row.signalStrength === 'moderate' ? 'bg-accent-amber/5' : ''
                            } ${isSelected ? 'ring-2 ring-accent-blue ring-inset' : 'hover:bg-surface-card/50'}`}
                            onClick={() => setSelectedEvent(row)}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {row.trendsUp ? (
                                  <TrendingUp className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
                                ) : row.signalStrength === 'none' ? (
                                  <Minus className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{row.eventName}</div>
                                  <div className="text-xs text-text-muted">{row.meddraCode} • {row.meddraSOC}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-sm font-semibold">{row.contingency.a}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-medium ${row.prr >= thresholds.prr ? 'text-accent-red' : ''}`}>
                                {row.prr.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                ({row.prrLower.toFixed(1)}-{row.prrUpper.toFixed(1)})
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-medium ${row.ror >= thresholds.ror ? 'text-accent-red' : ''}`}>
                                {row.ror.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                ({row.rorLower.toFixed(1)}-{row.rorUpper.toFixed(1)})
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-medium ${row.ebgm05 >= thresholds.ebgm05 ? 'text-accent-red' : ''}`}>
                                {row.ebgm.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                ({row.ebgm05.toFixed(1)}-{row.ebgm95.toFixed(1)})
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`text-sm font-medium ${row.icLower >= thresholds.ic025 ? 'text-accent-red' : ''}`}>
                                {row.ic.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                ({row.icLower.toFixed(2)})
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge color={signalStrengthColorMap[row.signalStrength] || 'gray'} size="sm">
                                {row.signalStrength}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge color={signalStatusColorMap[row.signalStatus] || 'gray'} size="sm">
                                {row.signalStatus.replace('-', ' ')}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Detail Panel - 1 column */}
            <div className="space-y-4">
              {selectedEvent ? (
                <>
                  <Card variant="elevated" padding="lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">{selectedEvent.eventName}</h3>
                        <p className="text-sm text-text-muted">{selectedEvent.meddraCode} • {selectedEvent.meddraSOC}</p>
                      </div>
                      <Badge color={signalStrengthColorMap[selectedEvent.signalStrength] || 'gray'}>
                        {selectedEvent.signalStrength}
                      </Badge>
                    </div>

                    {/* Contingency Table Visualization */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-text-muted mb-2">2×2 Contingency Table</h4>
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="bg-surface-card p-2 rounded text-center"></div>
                        <div className="bg-surface-card p-2 rounded text-center font-medium">Event+</div>
                        <div className="bg-surface-card p-2 rounded text-center font-medium">Event−</div>
                        <div className="bg-surface-card p-2 rounded text-center font-medium">Drug+</div>
                        <div className="bg-accent-red/10 p-2 rounded text-center font-semibold text-accent-red">
                          {selectedEvent.contingency.a}
                        </div>
                        <div className="bg-surface-card p-2 rounded text-center">{selectedEvent.contingency.b}</div>
                        <div className="bg-surface-card p-2 rounded text-center font-medium">Drug−</div>
                        <div className="bg-surface-card p-2 rounded text-center">{selectedEvent.contingency.c}</div>
                        <div className="bg-surface-card p-2 rounded text-center">{selectedEvent.contingency.d}</div>
                      </div>
                    </div>

                    {/* Metrics Summary */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-text-muted">Signal Metrics</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-surface-card p-2 rounded">
                          <div className="text-text-muted text-xs">PRR</div>
                          <div className={`font-semibold ${selectedEvent.prr >= thresholds.prr ? 'text-accent-red' : ''}`}>
                            {selectedEvent.prr.toFixed(2)} <span className="text-xs font-normal text-text-muted">({selectedEvent.prrLower.toFixed(1)}-{selectedEvent.prrUpper.toFixed(1)})</span>
                          </div>
                        </div>
                        <div className="bg-surface-card p-2 rounded">
                          <div className="text-text-muted text-xs">ROR</div>
                          <div className={`font-semibold ${selectedEvent.ror >= thresholds.ror ? 'text-accent-red' : ''}`}>
                            {selectedEvent.ror.toFixed(2)} <span className="text-xs font-normal text-text-muted">({selectedEvent.rorLower.toFixed(1)}-{selectedEvent.rorUpper.toFixed(1)})</span>
                          </div>
                        </div>
                        <div className="bg-surface-card p-2 rounded">
                          <div className="text-text-muted text-xs">EBGM (EB05)</div>
                          <div className={`font-semibold ${selectedEvent.ebgm05 >= thresholds.ebgm05 ? 'text-accent-red' : ''}`}>
                            {selectedEvent.ebgm.toFixed(2)} <span className="text-xs font-normal text-text-muted">({selectedEvent.ebgm05.toFixed(1)})</span>
                          </div>
                        </div>
                        <div className="bg-surface-card p-2 rounded">
                          <div className="text-text-muted text-xs">IC (IC₀.₂₅)</div>
                          <div className={`font-semibold ${selectedEvent.icLower >= thresholds.ic025 ? 'text-accent-red' : ''}`}>
                            {selectedEvent.ic.toFixed(2)} <span className="text-xs font-normal text-text-muted">({selectedEvent.icLower.toFixed(2)})</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface-card p-2 rounded text-sm">
                        <div className="text-text-muted text-xs">Chi² (p-value)</div>
                        <div className={`font-semibold ${selectedEvent.chi2 >= thresholds.chi2 ? 'text-accent-red' : ''}`}>
                          {selectedEvent.chi2.toFixed(1)} <span className="text-xs font-normal text-text-muted">(p={selectedEvent.pValue.toFixed(4)})</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Confidence Interval Visualization */}
                  <Card variant="elevated" padding="lg">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Confidence Intervals</h4>
                    <div className="space-y-4">
                      {/* EBGM CI */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-muted">EBGM (90% CI)</span>
                          <span className="font-medium">{selectedEvent.ebgm05.toFixed(2)} - {selectedEvent.ebgm95.toFixed(2)}</span>
                        </div>
                        <div className="h-6 bg-surface-card rounded relative">
                          {/* Threshold line */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-accent-red/50"
                            style={{ left: `${Math.min((thresholds.ebgm05 / 6) * 100, 100)}%` }}
                          />
                          {/* CI bar */}
                          <div 
                            className={`absolute top-1 bottom-1 rounded ${selectedEvent.ebgm05 >= thresholds.ebgm05 ? 'bg-accent-red' : 'bg-accent-blue'}`}
                            style={{ 
                              left: `${Math.max((selectedEvent.ebgm05 / 6) * 100, 0)}%`,
                              right: `${Math.max(100 - (selectedEvent.ebgm95 / 6) * 100, 0)}%`,
                            }}
                          />
                          {/* Point estimate */}
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-white border border-slate-400"
                            style={{ left: `${Math.min((selectedEvent.ebgm / 6) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted mt-1">
                          <span>0</span>
                          <span>2</span>
                          <span>4</span>
                          <span>6+</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card variant="elevated" padding="lg">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('icsr');
                        }}
                      >
                        <Eye className="w-4 h-4" />View Related Cases
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (selectedSignal) {
                            const blob = new Blob([`Signal Report\nSignal: ${selectedSignal.signal}\nProduct: ${selectedSignal.product}\nStatus: ${selectedSignal.status}\nCase Count: ${selectedSignal.caseCount}\nPRR: ${selectedSignal.prrValue?.toFixed(2) || 'N/A'}\nROR: ${selectedSignal.rorValue?.toFixed(2) || 'N/A'}\nGenerated: ${new Date().toLocaleDateString()}`], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `signal-report-${selectedSignal.id}.txt`; a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Signal report downloaded');
                          }
                        }}
                      >
                        <FileText className="w-4 h-4" />Generate Signal Report
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (selectedSignal) {
                            setSelectedSignal(prev => prev ? { ...prev, status: 'under-evaluation' } : prev);
                            toast.success(`Signal escalated to Signal Review Board — status: Under Evaluation`);
                          }
                        }}
                      >
                        <Send className="w-4 h-4" />Escalate to Signal Review
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <Card variant="elevated" padding="lg">
                  <EmptyState
                    title="Select an Event"
                    description="Click on a row in the table to view detailed metrics and confidence intervals"
                    icon={<BarChart3 className="w-10 h-10" />}
                  />
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Chart View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* PRR/ROR Trend Chart */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Hepatotoxicity Signal Trend (PRR)</h3>
              <div className="h-64 flex items-end gap-2">
                {trendData.map((point, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-accent-red/20 rounded-t relative" 
                      style={{ height: `${(point.prr / 4) * 100}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-accent-red font-medium">
                        {point.prr.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-xs text-text-muted mt-2">{point.month.slice(0, 3)}</div>
                    <div className="text-[10px] text-text-muted">n={point.caseCount}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-accent-red/20 rounded" />
                  <span>PRR Value</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-accent-red/50" />
                  <span>Threshold (2.0)</span>
                </div>
              </div>
            </Card>

            {/* Cumulative Cases */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Cumulative Cases Over Time</h3>
              <div className="h-64 flex items-end gap-2">
                {trendData.map((point, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-accent-blue/20 rounded-t relative" 
                      style={{ height: `${(point.cumulative / 25) * 100}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-accent-blue font-medium">
                        {point.cumulative}
                      </div>
                    </div>
                    <div className="text-xs text-text-muted mt-2">{point.month.slice(0, 3)}</div>
                    <div className="text-[10px] text-text-muted">+{point.caseCount}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-accent-blue/20 rounded" />
                  <span>Cumulative Total</span>
                </div>
              </div>
            </Card>

            {/* Forest Plot Style - All Signals */}
            <Card variant="elevated" padding="lg" className="col-span-1 md:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary mb-4">EBGM Forest Plot - All Events</h3>
              <div className="space-y-2">
                {disproportionalityData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-text-primary truncate">{d.eventName}</div>
                    <div className="flex-1 h-6 bg-surface-card rounded relative">
                      {/* Threshold line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-accent-red/50"
                        style={{ left: `${(thresholds.ebgm05 / 8) * 100}%` }}
                      />
                      {/* CI bar */}
                      <div 
                        className={`absolute top-1.5 bottom-1.5 rounded ${d.ebgm05 >= thresholds.ebgm05 ? 'bg-accent-red/60' : 'bg-slate-400/40'}`}
                        style={{ 
                          left: `${Math.max((d.ebgm05 / 8) * 100, 0)}%`,
                          right: `${Math.max(100 - Math.min((d.ebgm95 / 8) * 100, 100), 0)}%`,
                        }}
                      />
                      {/* Point estimate */}
                      <div 
                        className={`absolute top-0.5 bottom-0.5 w-1.5 rounded-full ${d.ebgm05 >= thresholds.ebgm05 ? 'bg-accent-red' : 'bg-slate-500'}`}
                        style={{ left: `${Math.min((d.ebgm / 8) * 100, 97)}%` }}
                      />
                    </div>
                    <div className="w-24 text-xs text-right">
                      <span className={d.ebgm05 >= thresholds.ebgm05 ? 'text-accent-red font-medium' : 'text-text-muted'}>
                        {d.ebgm.toFixed(2)} ({d.ebgm05.toFixed(1)}-{d.ebgm95.toFixed(1)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span>0</span>
                <span>EBGM Scale</span>
                <span>8+</span>
              </div>
            </Card>
          </div>
        )}

        {/* AI Summary */}
        <div className="mt-6 bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-5 flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-accent-purple mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">AI Signal Analysis Summary</h3>
            <p className="text-sm text-text-secondary">
              <strong>{stats.strong} events</strong> exceed signal thresholds across all algorithms. 
              Hepatotoxicity (EBGM 3.15, EB05 2.18), ALT increased, and AST increased form a 
              <strong className="text-accent-purple"> hepatic cluster</strong> consistent with class effect 
              observed in other KRAS G12C inhibitors. 
              <strong className="text-accent-red"> Recommend: Immediate signal assessment meeting and 
              consideration of CCDS update.</strong>
            </p>
            <div className="mt-3 flex items-center gap-4">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  if (selectedSignal) {
                    const blob = new Blob([`Full Signal Evaluation Report\n${'='.repeat(40)}\nSignal: ${selectedSignal.signal}\nProduct: ${selectedSignal.product}\nStatus: ${selectedSignal.status}\nPriority: ${selectedSignal.priority}\nDetected: ${selectedSignal.detectedDate}\nSource: ${selectedSignal.source}\nCase Count: ${selectedSignal.caseCount}\nPRR: ${selectedSignal.prrValue?.toFixed(3) || 'N/A'} | ROR: ${selectedSignal.rorValue?.toFixed(3) || 'N/A'}\nDescription: ${selectedSignal.description || 'N/A'}\nRecommendation: ${selectedSignal.recommendation || 'Pending evaluation'}\nGenerated: ${new Date().toISOString()}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `signal-full-report-${selectedSignal.id}.txt`; a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Full signal report downloaded');
                  }
                }}
              >
                <FileText className="w-4 h-4" />Generate Full Report
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  if (selectedSignal) {
                    setSelectedSignal(prev => prev ? { ...prev, status: 'under-evaluation' } : prev);
                    toast.success(`Signal Review Board meeting requested — status advanced to Under Evaluation`);
                  }
                }}
              >
                <Send className="w-4 h-4" />Schedule Review Meeting
              </Button>
            </div>
          </div>
        </div>

        {/* Run History Modal */}
        {showRunHistory && (
          <Modal isOpen={showRunHistory} title="Signal Detection Run History" onClose={() => setShowRunHistory(false)}>
            <div className="space-y-3">
              {signalRuns.map(run => (
                <div key={run.id} className="p-3 bg-surface-card rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge color={run.status === 'completed' ? 'green' : run.status === 'running' ? 'blue' : 'red'} size="sm">
                        {run.status}
                      </Badge>
                      <span className="text-sm font-medium">{run.product}</span>
                    </div>
                    <span className="text-xs text-text-muted">{new Date(run.runDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>Algorithm: {run.config.algorithm.toUpperCase()}</span>
                    <span>•</span>
                    <button onClick={() => useAppStore.getState().setActiveModule('signal-detection')} className="text-accent-blue hover:underline flex items-center gap-1">
                      Source: {run.dataSource} <ExternalLink className="w-3 h-3" />
                    </button>
                    <span>•</span>
                    <span>Signals: {run.signalsDetected}/{run.totalEvents}</span>
                    <span>•</span>
                    <span>Duration: {run.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// ============================================================================

interface SafetyScreenProps { filters?: FilterState; }

// ============================================================================
// v184: E2B(R3) Case Intake Types and Data
// ============================================================================

interface E2BReporter {
  id: string;
  firstName: string;
  lastName: string;
  qualification: string;
  qualificationLabel: string;
  organization: string;
  department: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  countryLabel: string;
  telephone: string;
  email: string;
  isPrimary: boolean;
}

interface E2BDrug {
  id: string;
  characterization: string; // 1=Suspect, 2=Concomitant, 3=Interacting
  productName: string;
  substanceName: string;
  dose: string;
  doseUnit: string;
  frequency: string;
  route: string;
  routeLabel: string;
  indication: string;
  indicationMedDRA: string;
  startDate: string;
  endDate: string;
  batchNumber: string;
  actionTaken: string;
  actionTakenLabel: string;
}

interface E2BReaction {
  id: string;
  termReported: string;
  meddraCode: string;
  meddraVersion: string;
  meddraSOC: string;
  startDate: string;
  endDate: string;
  duration: string;
  durationUnit: string;
  outcome: string;
  outcomeLabel: string;
  seriousness: 'serious' | 'non-serious';
  seriousnessCriteria: string[];
  medicallyConfirmed: boolean;
}

interface E2BTest {
  id: string;
  date: string;
  name: string;
  meddraCode: string;
  result: string;
  resultValue: string;
  unit: string;
  normalLow: string;
  normalHigh: string;
  comments: string;
}

interface E2BFormState {
  // Section A - Administrative
  senderReportId: string;
  reportType: 'initial' | 'followup';
  receiptDate: string;
  mostRecentDate: string;
  seriousness: 'serious' | 'non-serious' | '';
  
  // Section C - Reporters
  reporters: E2BReporter[];
  
  // Section D - Patient
  patientId: string;
  patientInitials: string;
  age: string;
  ageUnit: string;
  ageGroup: string;
  sex: string;
  weight: string;
  height: string;
  medicalHistory: string[];
  deathDate: string;
  autopsyDone: boolean;
  
  // Section G - Drugs
  drugs: E2BDrug[];
  
  // Section E - Reactions
  reactions: E2BReaction[];
  
  // Section B/E - Seriousness (at case level)
  resultsInDeath: boolean;
  lifeThreatening: boolean;
  hospitalization: boolean;
  disability: boolean;
  congenitalAnomaly: boolean;
  otherMedicallyImportant: boolean;
  
  // Section F - Tests
  tests: E2BTest[];
  
  // Section H - Narrative
  narrative: string;
  reporterComments: string;
  senderComments: string;
  senderDiagnosis: string;
  
  // Gateway selection
  selectedGateways: string[];
}

const initialE2BFormState: E2BFormState = {
  senderReportId: '',
  reportType: 'initial',
  receiptDate: new Date().toISOString().split('T')[0],
  mostRecentDate: new Date().toISOString().split('T')[0],
  seriousness: '',
  reporters: [],
  patientId: '',
  patientInitials: '',
  age: '',
  ageUnit: '801',
  ageGroup: '',
  sex: '',
  weight: '',
  height: '',
  medicalHistory: [],
  deathDate: '',
  autopsyDone: false,
  drugs: [],
  reactions: [],
  resultsInDeath: false,
  lifeThreatening: false,
  hospitalization: false,
  disability: false,
  congenitalAnomaly: false,
  otherMedicallyImportant: false,
  tests: [],
  narrative: '',
  reporterComments: '',
  senderComments: '',
  senderDiagnosis: '',
  selectedGateways: [],
};

// E2B(R3) Code Lists
const e2bQualificationCodes = [
  { code: '1', label: 'Physician' },
  { code: '2', label: 'Pharmacist' },
  { code: '3', label: 'Other Health Professional' },
  { code: '4', label: 'Lawyer' },
  { code: '5', label: 'Consumer/Non-Health Professional' },
];

const e2bAgeUnitCodes = [
  { code: '801', label: 'Year' },
  { code: '802', label: 'Month' },
  { code: '803', label: 'Week' },
  { code: '804', label: 'Day' },
  { code: '805', label: 'Hour' },
];

const e2bAgeGroupCodes = [
  { code: '1', label: 'Neonate (0-27 days)' },
  { code: '2', label: 'Infant (28 days - 23 months)' },
  { code: '3', label: 'Child (2-11 years)' },
  { code: '4', label: 'Adolescent (12-17 years)' },
  { code: '5', label: 'Adult (18-64 years)' },
  { code: '6', label: 'Elderly (≥65 years)' },
];

const e2bSexCodes = [
  { code: '1', label: 'Male' },
  { code: '2', label: 'Female' },
  { code: '0', label: 'Unknown' },
];

const e2bDrugCharacterization = [
  { code: '1', label: 'Suspect' },
  { code: '2', label: 'Concomitant' },
  { code: '3', label: 'Interacting' },
];

const e2bRouteOfAdmin = [
  { code: '065', label: 'Oral' },
  { code: '050', label: 'Intravenous' },
  { code: '048', label: 'Intramuscular' },
  { code: '100', label: 'Subcutaneous' },
  { code: '020', label: 'Cutaneous' },
  { code: '060', label: 'Nasal' },
  { code: '030', label: 'Inhalation' },
  { code: '070', label: 'Rectal' },
  { code: '075', label: 'Ophthalmic' },
];

const e2bActionTaken = [
  { code: '1', label: 'Drug withdrawn' },
  { code: '2', label: 'Dose reduced' },
  { code: '3', label: 'Dose increased' },
  { code: '4', label: 'Dose not changed' },
  { code: '5', label: 'Unknown' },
  { code: '6', label: 'Not applicable' },
];

const e2bOutcomeCodes = [
  { code: '1', label: 'Recovered/Resolved' },
  { code: '2', label: 'Recovering/Resolving' },
  { code: '3', label: 'Not recovered/Not resolved' },
  { code: '4', label: 'Recovered with sequelae' },
  { code: '5', label: 'Fatal' },
  { code: '6', label: 'Unknown' },
];

const e2bTestResultCodes = [
  { code: '1', label: 'Positive' },
  { code: '2', label: 'Negative' },
  { code: '3', label: 'Borderline' },
  { code: '4', label: 'Inconclusive' },
];

const e2bGateways = [
  { id: 'fda', name: 'FDA FAERS', flag: '🇺🇸', region: 'US' },
  { id: 'ema', name: 'EudraVigilance', flag: '🇪🇺', region: 'EU' },
  { id: 'pmda', name: 'PMDA', flag: '🇯🇵', region: 'JP' },
  { id: 'hc', name: 'Health Canada', flag: '🇨🇦', region: 'CA' },
  { id: 'tga', name: 'TGA Australia', flag: '🇦🇺', region: 'AU' },
];

const e2bCountryCodes = [
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'IT', label: '🇮🇹 Italy' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'CH', label: '🇨🇭 Switzerland' },
  { code: 'BR', label: '🇧🇷 Brazil' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'CN', label: '🇨🇳 China' },
  { code: 'KR', label: '🇰🇷 South Korea' },
];

// Wizard step configuration
const e2bWizardSteps = [
  { id: 1, section: 'A', name: 'Administrative', label: 'Report Info', icon: FileText },
  { id: 2, section: 'C', name: 'Primary Source', label: 'Reporter', icon: User },
  { id: 3, section: 'D', name: 'Patient', label: 'Patient', icon: Users },
  { id: 4, section: 'G', name: 'Drug', label: 'Product', icon: Pill },
  { id: 5, section: 'E', name: 'Reaction', label: 'Event', icon: AlertTriangle },
  { id: 6, section: 'F', name: 'Tests', label: 'Tests', icon: Activity },
  { id: 7, section: 'H', name: 'Narrative', label: 'Narrative', icon: FileText },
  { id: 8, section: 'Review', name: 'Review', label: 'Review & Submit', icon: Send },
];

// ============================================================================

export function SafetyScreen({ filters }: SafetyScreenProps) {
  const { deadClick } = useDeadClick();
  const products = useProducts();
  const [activeView, setActiveView] = useState<SafetyView>('overview');

  const lix = useLixAgent('Safety');
  const [selectedSignal, setSelectedSignal] = useState<SafetySignal | null>(safetySignals[0]);
  const [selectedCase, setSelectedCase] = useState<ICSR | null>(null);
  const [showInitiateLabelModal, setShowInitiateLabelModal] = useState(false);
  const [showMedWatchModal, setShowMedWatchModal] = useState(false);
  const [showE2BModal, setShowE2BModal] = useState(false);
  const [showCaseSignatureModal, setShowCaseSignatureModal] = useState(false);
  const [caseSignatureSuccess, setCaseSignatureSuccess] = useState<string | null>(null);
  const [caseIntakeStep, setCaseIntakeStep] = useState(1);
  const [meddraSearch, setMeddraSearch] = useState('');
  const [selectedMedDRA, setSelectedMedDRA] = useState<MedDRATerm | null>(null);
  
  // v184: E2B(R3) Wizard State
  const [e2bForm, setE2bForm] = useState<E2BFormState>(initialE2BFormState);
  const [showGatewaySimulation, setShowGatewaySimulation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  
  // v0.13.25: Draft persistence state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCaseNumber, setDraftCaseNumber] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // v0.13.27: AI narrative generation state
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  // v0.27.68: Module 2.7.4 narrative streaming panel
  const [showNarrativePanel, setShowNarrativePanel] = useState(false);
  // v0.86.0: Aggregate report generation panel
  const [aggregateReportTarget, setAggregateReportTarget] = useState<typeof periodicReports[0] | null>(null);
  // v0.126.16: New periodic report modal
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newReportForm, setNewReportForm] = useState({ type: 'PBRER', product: 'LIG-2847 (Nexavant)', period: '', region: 'Global', owner: '' });
  const toast = useToast();
  
  // v0.43.5: Supabase persistence sync
  const persistence = useSafetyPersistence();
  
  // v0.13.25: Save Draft handler - persists E2B form to database
  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    try {
      const result = await safetyApi.saveDraft({
        id: draftId || undefined,
        caseNumber: draftCaseNumber || undefined,
        formState: e2bForm,
        currentStep: caseIntakeStep,
      });
      
      // Store the draft ID for subsequent saves
      setDraftId(result.id);
      setDraftCaseNumber(result.caseNumber);
      
      toast.success(`Draft saved: ${result.caseNumber}`);
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  }, [draftId, draftCaseNumber, e2bForm, caseIntakeStep, toast]);
  
  // v0.13.27: AI Narrative Generation handler
  const handleGenerateNarrative = useCallback(async () => {
    // Validate minimum required data
    if (e2bForm.drugs.length === 0) {
      toast.error('Add at least one drug before generating narrative');
      return;
    }
    if (e2bForm.reactions.length === 0) {
      toast.error('Add at least one reaction before generating narrative');
      return;
    }
    
    setIsGeneratingNarrative(true);
    try {
      const response = await fetch('/api/safety/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientInitials: e2bForm.patientInitials,
          age: e2bForm.age,
          ageUnit: e2bForm.ageUnit,
          sex: e2bForm.sex,
          weight: e2bForm.weight,
          height: e2bForm.height,
          medicalHistory: e2bForm.medicalHistory,
          seriousness: e2bForm.seriousness,
          resultsInDeath: e2bForm.resultsInDeath,
          lifeThreatening: e2bForm.lifeThreatening,
          hospitalization: e2bForm.hospitalization,
          disability: e2bForm.disability,
          congenitalAnomaly: e2bForm.congenitalAnomaly,
          otherMedicallyImportant: e2bForm.otherMedicallyImportant,
          deathDate: e2bForm.deathDate,
          drugs: e2bForm.drugs,
          reactions: e2bForm.reactions,
          tests: e2bForm.tests,
          reporters: e2bForm.reporters,
          reportType: e2bForm.reportType,
          receiptDate: e2bForm.receiptDate,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate narrative');
      }
      
      const result = await response.json();
      
      // Update form with generated content
      setE2bForm(f => ({
        ...f,
        narrative: result.narrative,
        senderComments: result.senderComments,
        senderDiagnosis: result.senderDiagnosis,
      }));
      
      toast.success('Narrative generated successfully');
    } catch (error) {
      console.error('Failed to generate narrative:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate narrative');
    } finally {
      setIsGeneratingNarrative(false);
    }
  }, [e2bForm, toast]);
  
  // v127: Loading state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  // v0.35.0: Collapsible dashboard sections
  const { isCollapsed, setCollapsed } = useCollapsedSections('safety');
  
  // v0.12.6: State preservation for navigation stack
  const preserveState = useMemo(() => ({
    activeView,
    selectedSignalId: selectedSignal?.id || null,
    selectedCaseId: selectedCase?.id || null,
  }), [activeView, selectedSignal?.id, selectedCase?.id]);
  
  const { restoredState, updateLabel } = usePreserveModuleState(
    'safety',
    preserveState,
    ['activeView', 'selectedSignalId', 'selectedCaseId'],
    {
      label: 'Safety & PV',
      labelFn: (state) => {
        if (state.selectedSignalId) {
          const sig = safetySignals.find(s => s.id === state.selectedSignalId);
          return sig ? `Signal: ${sig.signal}` : 'Safety & PV';
        }
        if (state.selectedCaseId) {
          const c = icsrCases.find(c => c.id === state.selectedCaseId);
          return c ? `Case: ${c.caseNumber}` : 'Safety & PV';
        }
        return 'Safety & PV';
      },
    }
  );
  
  // Restore state from navigation stack on mount
  useEffect(() => {
    if (restoredState) {
      if (restoredState.activeView) setActiveView(restoredState.activeView as SafetyView);
      if (restoredState.selectedSignalId) {
        const sig = safetySignals.find(s => s.id === restoredState.selectedSignalId);
        if (sig) setSelectedSignal(sig);
      }
      if (restoredState.selectedCaseId) {
        const c = icsrCases.find(c => c.id === restoredState.selectedCaseId);
        if (c) setSelectedCase(c);
      }
    }
  }, [restoredState]);
  
  // Update breadcrumb when selection changes
  useEffect(() => {
    if (selectedSignal && activeView === 'signal-detail') {
      updateLabel(`Signal: ${selectedSignal.signal}`);
    } else if (selectedCase && activeView === 'case-detail') {
      updateLabel(`Case: ${selectedCase.caseNumber}`);
    } else {
      updateLabel('Safety & PV');
    }
  }, [selectedSignal, selectedCase, activeView, updateLabel]);
  
  // v127: Activity store for event cascading
  const onSafetySignal = useActivityStore(s => s.onSafetySignal);
  
  // v159: Cross-module event system
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);
  // v0.44.42: Cascade engine — fire downstream task chains
  const fireTrigger = useCascadeEngine(s => s.fireTrigger);
  
  // v112: Cross-module navigation
  const { getContext } = useIncomingNavigation();
  
  // v0.125.7: Apply incoming navigation context on mount
  useEffect(() => {
    const context = getContext();
    if (!context) return;

    const viewModeMap: Record<string, SafetyView> = {
      'dashboard': 'overview',
      'cases': 'icsr',
      'icsr': 'icsr',
      'signals': 'signals',
      'signal-detection': 'signal-detection',
      'reports': 'reports',
    };

    if (context.viewMode) {
      setActiveView(viewModeMap[context.viewMode] ?? 'overview');
    }

    // Deep-link to a specific signal
    if (context.selection?.signalId) {
      const signal = safetySignals.find(s => s.id === context.selection!.signalId);
      if (signal) {
        setSelectedSignal(signal);
        setActiveView('signals');
      }
    }
  }, [getContext]);

  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all' || filters.modality !== 'all' || filters.stage !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    return new Set(filtered.map(p => p.id));
  }, [filters]);

  const filteredCases = useMemo(() => icsrCases.filter(c => !matchingProductIds || matchingProductIds.has(c.productId)), [matchingProductIds]);
  const filteredSignals = useMemo(() => safetySignals.filter(s => !matchingProductIds || matchingProductIds.has(s.productId)), [matchingProductIds]);
  const hepatoCases = icsrCases.filter(c => c.event.includes('Hepato') || c.event.includes('ALT') || c.event.includes('AST'));
  const meddraResults = useMemo(() => meddraSearch.length >= 2 ? searchMedDRA(meddraSearch) : [], [meddraSearch]);

  // v0.27.3: Drillable stats configuration
  const safetyDrillableStats: ScreenStat[] = useMemo(() => {
    const openCases = filteredCases.filter(c => c.status !== 'submitted');
    const seriousCases = filteredCases.filter(c => c.seriousness === 'serious');
    const dueSoonCases = filteredCases.filter(c => {
      const daysUntilDue = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue >= 0 && c.status !== 'submitted';
    });
    const activeSignals = filteredSignals.filter(s => s.status !== 'closed' && s.status !== 'refuted');
    
    return [
      {
        id: 'open-cases',
        value: openCases.length,
        label: 'Open Cases',
        color: 'text-accent-blue',
        icon: <FileText className="w-5 h-5" />,
        drilldown: {
          title: 'Open ICSR Cases',
          subtitle: `${openCases.length} cases requiring attention`,
          items: openCases.map(c => ({
            id: c.id,
            caseNumber: c.caseNumber,
            event: c.event,
            status: c.status,
            seriousness: c.seriousness,
            dueDate: c.dueDate,
            daysLeft: Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          })),
          columns: [
            { key: 'caseNumber', label: 'Case #', width: 90, render: (v: string) => <span className="font-mono text-xs text-accent-blue">{v}</span> },
            { key: 'event', label: 'Event', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'status', label: 'Status', width: 80, render: (v: string) => <Badge color={caseStatusColorMap[v] || 'gray'} size="xs">{v}</Badge> },
            { key: 'seriousness', label: 'Serious', width: 70, render: (v: string) => v === 'serious' ? <Badge color="red" size="xs">Yes</Badge> : <span className="text-text-muted">No</span> },
            { key: 'daysLeft', label: 'Due', width: 60, render: (v: number) => <Badge color={v <= 0 ? 'red' : v <= 7 ? 'amber' : 'gray'} size="xs">{v <= 0 ? 'Overdue' : `${v}d`}</Badge> },
          ],
          onItemClick: (item) => {
            const c = filteredCases.find(ca => ca.id === item.id);
            if (c) { setSelectedCase(c); setActiveView('case-detail'); }
          },
          searchable: true,
        },
      },
      {
        id: 'active-signals',
        value: activeSignals.length,
        label: 'Active Signals',
        color: 'text-accent-red',
        icon: <AlertTriangle className="w-5 h-5" />,
        drilldown: {
          title: 'Active Safety Signals',
          subtitle: `${activeSignals.filter(s => s.priority === 'critical').length} critical priority`,
          items: activeSignals.map(s => ({
            id: s.id,
            signal: s.signal,
            status: s.status,
            priority: s.priority,
            cases: s.caseCount,
            prr: s.prrValue || 0,
          })),
          columns: [
            { key: 'signal', label: 'Signal', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'priority', label: 'Priority', width: 70, render: (v: string) => <Badge color={priorityColorMap[v] || 'gray'} size="xs">{v}</Badge> },
            { key: 'cases', label: 'Cases', width: 50, render: (v: number) => <span className="font-semibold">{v}</span> },
            { key: 'prr', label: 'PRR', width: 50, render: (v: number) => <span className={v > 2 ? 'text-accent-red font-medium' : ''}>{v.toFixed(1)}</span> },
          ],
          onItemClick: (item) => {
            const s = filteredSignals.find(sig => sig.id === item.id);
            if (s) { setSelectedSignal(s); setActiveView('signal-detail'); }
          },
        },
      },
      {
        id: 'due-soon',
        value: dueSoonCases.length,
        label: 'Due <7 Days',
        color: 'text-accent-amber',
        icon: <Clock className="w-5 h-5" />,
        drilldown: {
          title: 'Cases Due Within 7 Days',
          subtitle: 'Requires immediate attention',
          items: dueSoonCases.map(c => ({
            id: c.id,
            caseNumber: c.caseNumber,
            event: c.event,
            dueDate: c.dueDate,
            daysLeft: Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            seriousness: c.seriousness,
          })),
          columns: [
            { key: 'caseNumber', label: 'Case #', width: 90, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'event', label: 'Event', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'daysLeft', label: 'Due In', width: 60, render: (v: number) => <Badge color={v <= 2 ? 'red' : 'amber'} size="xs">{v}d</Badge> },
            { key: 'seriousness', label: 'Serious', width: 70, render: (v: string) => v === 'serious' ? <Badge color="red" size="xs">Yes</Badge> : <span className="text-text-muted">No</span> },
          ],
          onItemClick: (item) => {
            const c = filteredCases.find(ca => ca.id === item.id);
            if (c) { setSelectedCase(c); setActiveView('case-detail'); }
          },
        },
      },
      {
        id: 'serious',
        value: seriousCases.length,
        label: 'Serious Cases',
        color: 'text-accent-purple',
        icon: <Shield className="w-5 h-5" />,
        drilldown: {
          title: 'Serious Adverse Events',
          subtitle: 'Cases meeting seriousness criteria',
          items: seriousCases.map(c => ({
            id: c.id,
            caseNumber: c.caseNumber,
            event: c.event,
            status: c.status,
            outcome: c.outcome,
          })),
          columns: [
            { key: 'caseNumber', label: 'Case #', width: 90, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'event', label: 'Event', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'status', label: 'Status', width: 80, render: (v: string) => <Badge color={caseStatusColorMap[v] || 'gray'} size="xs">{v}</Badge> },
            { key: 'outcome', label: 'Outcome', width: 80, render: (v: string) => <span className="text-xs">{v}</span> },
          ],
          onItemClick: (item) => {
            const c = filteredCases.find(ca => ca.id === item.id);
            if (c) { setSelectedCase(c); setActiveView('case-detail'); }
          },
        },
      },
      {
        id: 'submitted',
        value: filteredCases.filter(c => c.status === 'submitted').length,
        label: 'Submitted',
        color: 'text-accent-green',
        icon: <CheckCircle className="w-5 h-5" />,
        drilldown: {
          title: 'Submitted Cases',
          subtitle: 'Successfully submitted to health authorities',
          items: filteredCases.filter(c => c.status === 'submitted').map(c => ({
            id: c.id,
            caseNumber: c.caseNumber,
            event: c.event,
            submittedDate: c.dueDate,
            destination: 'FDA FAERS',
          })),
          columns: [
            { key: 'caseNumber', label: 'Case #', width: 90, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'event', label: 'Event', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'destination', label: 'Destination', width: 100, render: (v: string) => <Badge color="green" size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => {
            const c = filteredCases.find(ca => ca.id === item.id);
            if (c) { setSelectedCase(c); setActiveView('case-detail'); }
          },
        },
      },
    ];
  }, [filteredCases, filteredSignals]);

  // v139: Show skeleton during initial load
  if (isLoading) {
    return <SafetyScreenSkeleton />;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner */}
      <ScreenHeader
        moduleId="safety"
          showAssetContext
        title="Safety & Pharmacovigilance"
        subtitle="Signal detection, ICSR case management, and periodic safety reporting"
        icon={<Activity className="w-5 h-5" />}
      />
      {/* Top Bar - v0.43.8: overflow-x-auto for mobile */}
      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        {/* Scrollable tab area */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
            <ButtonGroup>
              {(['overview', 'signals', 'signal-impact', 'signal-detection', 'icsr', 'reports'] as const).map(view => (
                <Button
                  variant={
                    activeView === view || 
                    (activeView === 'signal-detail' && view === 'signals') || 
                    (activeView === 'case-detail' && view === 'icsr') || 
                    (activeView === 'case-intake' && view === 'icsr') 
                      ? 'primary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => setActiveView(view)}
                >
                  {view === 'overview' && <Activity className="w-4 h-4" />}
                  {view === 'signals' && <AlertTriangle className="w-4 h-4" />}
                  {view === 'signal-impact' && <Workflow className="w-4 h-4" />}
                  {view === 'signal-detection' && <BarChart3 className="w-4 h-4" />}
                  {view === 'icsr' && <FileText className="w-4 h-4" />}
                  {view === 'reports' && <Calendar className="w-4 h-4" />}
                  <span className="hidden sm:inline">{view === 'icsr' ? 'Cases' : view === 'signal-detection' ? 'Analytics' : view === 'signal-impact' ? 'Impact Center' : view.charAt(0).toUpperCase() + view.slice(1)}</span>
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>
        {/* Pinned actions — always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2 border-l border-border/50">
          <div className="hidden md:block">
            <SafetySyncStatus
              syncStatus={persistence.syncStatus}
              isOnline={persistence.isOnline}
              lastSyncedAt={persistence.lastSyncedAt}
              syncError={persistence.syncError}
              onRefresh={persistence.refresh}
            />
          </div>
          {/* v0.50.0: CapabilityGate wiring for New Case */}
          <CapabilityGate moduleId="safety" capability="author">
          <Button variant="primary" size="sm" className="whitespace-nowrap" onClick={() => { setCaseIntakeStep(1); setActiveView('case-intake'); }}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Case</span>
          </Button>
          </CapabilityGate>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
      {lix.status !== 'monitoring' && (
        <LixInlineAlert
          moduleScope="Safety"
          message={lix.message}
          severity={lix.severity}
          actionLabel={lix.actionLabel ?? undefined}
          onAction={lix.actionLabel ? () => useAppStore.getState().setActiveModule('agent-hub') : undefined}
          className="mx-4 md:mx-6 mt-3"
        />
      )}
        {/* OVERVIEW */}
        {activeView === 'overview' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* v116: Breadcrumb navigation */}
              <Breadcrumb 
                moduleId="safety"
                viewLabel="Overview"
                className="mb-4"
              />
              
              {/* v176: Cross-module return navigation */}
              <ReturnBreadcrumb variant="inline" className="mb-4" />
              
              {/* v0.44.49: Compact header */}
              <p className="text-sm text-text-muted mb-4">Signal detection, case management & periodic reporting</p>

              {/* v0.44.49: Dynamic hero signal — data-driven from filteredSignals */}
              {(() => {
                const heroSignal =
                  filteredSignals.find(s => s.priority === 'critical' && s.status === 'confirmed') ??
                  filteredSignals.find(s => s.priority === 'critical' && s.status !== 'closed') ??
                  filteredSignals.find(s => s.priority === 'high' && s.status === 'confirmed') ??
                  filteredSignals.find(s => s.status !== 'closed') ??
                  null;
                if (!heroSignal) return null;
                const isCritical = heroSignal.priority === 'critical';
                const isConfirmed = heroSignal.status === 'confirmed';
                return (
                  <div
                    onClick={() => { setSelectedSignal(heroSignal); setActiveView('signal-detail'); }}
                    className={`
                      mb-6 flex items-start gap-4 p-4 rounded-xl border-l-4 border cursor-pointer
                      transition-all duration-150 hover:-translate-y-px hover:shadow-lg
                      ${isCritical
                        ? 'border-l-red-500 border-red-500/25 bg-red-500/5 hover:shadow-red-500/10'
                        : 'border-l-amber-500 border-amber-500/20 bg-amber-500/5 hover:shadow-amber-500/10'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                      ${isCritical ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                          {isConfirmed ? 'Confirmed Signal' : 'Signal Under Evaluation'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase
                          ${isCritical ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                          {heroSignal.priority}
                        </span>
                        {heroSignal.classEffect && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">Class Effect</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary leading-snug mb-1">
                        {heroSignal.signal}
                      </h3>
                      <p className="text-xs text-text-muted mb-2 line-clamp-2 hidden sm:block">
                        {heroSignal.description ?? `${heroSignal.caseCount} cases reported${heroSignal.prrValue ? ` · PRR ${heroSignal.prrValue}` : ''}${heroSignal.rorValue ? ` · ROR ${heroSignal.rorValue}` : ''}`}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSignal(heroSignal); setActiveView('signal-detail'); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                            ${isCritical ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                        >
                          <Eye className="w-3.5 h-3.5" />View Details
                        </button>
                        {isConfirmed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowInitiateLabelModal(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                              border-red-500/40 text-red-400 hover:bg-red-500/10"
                          >
                            <Send className="w-3.5 h-3.5" />Initiate Label Update
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex-shrink-0 text-right text-xs text-text-muted hidden md:block">
                      <div>{heroSignal.caseCount} cases</div>
                      {heroSignal.prrValue && <div>PRR {heroSignal.prrValue}</div>}
                      <div className="mt-1 text-[10px]">Detected {heroSignal.detectedDate}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Stats - v0.36.7: Compact stat bar saves vertical space */}
              <CompactStatBar 
                stats={safetyDrillableStats.map(stat => ({
                  id: stat.id,
                  value: stat.value,
                  label: stat.label,
                  icon: stat.icon,
                  color: stat.color?.replace('text-accent-', '') as 'blue' | 'red' | 'amber' | 'purple' | 'green',
                  drilldown: stat.drilldown as DrilldownConfig,
                  highlight: stat.id === 'critical' || stat.id === 'overdue',
                }))}
                className="mb-6"
              />

              {/* Main Content Grid - v0.35.0: Collapsible sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Recent Cases */}
                <div className="col-span-1 md:col-span-2">
                  <CollapsibleSection
                    title="Recent Serious Cases"
                    icon={<FileText className="w-5 h-5 text-accent-red" />}
                    count={filteredCases.filter(c => c.seriousness === 'serious').length}
                    defaultExpanded={!isCollapsed('recent-cases')}
                    onToggle={(expanded) => setCollapsed('recent-cases', !expanded)}
                    variant="card"
                    size="sm"
                    headerActions={
                      <Button variant="link" size="sm" onClick={() => setActiveView('icsr')}>View All</Button>
                    }
                  >
                    <div className="space-y-2">
                      {filteredCases.filter(c => c.seriousness === 'serious').length === 0 ? (
                        <EmptyState type="no-data" size="sm" title="No serious cases" description="No cases meet seriousness criteria" />
                      ) : filteredCases.filter(c => c.seriousness === 'serious').slice(0, 5).map(icsr => (
                        <div key={icsr.id} className="flex items-center justify-between p-3 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer"
                          onClick={() => { setSelectedCase(icsr); setActiveView('case-detail'); }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{icsr.countryFlag}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-accent-blue">{icsr.caseNumber}</span>
                                <Badge color="red" size="xs">serious</Badge>
                              </div>
                              <div className="text-xs text-text-muted">{icsr.event} • {icsr.product}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge color={caseStatusColorMap[icsr.status] || 'gray'} size="sm">{icsr.status}</Badge>
                            <div className="text-xs text-text-muted mt-1">Due: {icsr.dueDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                </div>

                {/* Active Signals */}
                <CollapsibleSection
                  title="Active Signals"
                  icon={<AlertTriangle className="w-5 h-5 text-accent-amber" />}
                  count={filteredSignals.filter(s => s.status !== 'closed').length}
                  defaultExpanded={!isCollapsed('active-signals')}
                  onToggle={(expanded) => setCollapsed('active-signals', !expanded)}
                  variant="card"
                  size="sm"
                  headerActions={
                    <Button variant="link" size="sm" onClick={() => setActiveView('signals')}>View All</Button>
                  }
                >
                  {/* v0.44.49: Urgency-sorted signals with visual priority weight */}
                  {(() => {
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    const activeSignals = filteredSignals
                      .filter(s => s.status !== 'closed')
                      .sort((a, b) => {
                        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                        if (pDiff !== 0) return pDiff;
                        // confirmed before under-evaluation
                        if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
                        if (b.status === 'confirmed' && a.status !== 'confirmed') return 1;
                        return b.caseCount - a.caseCount;
                      });
                    if (activeSignals.length === 0) {
                      return <EmptyState type="no-data" size="sm" title="No active signals" description="All signals have been closed" />;
                    }
                    return (
                      <div className="space-y-2">
                        {activeSignals.map((sig, idx) => {
                          const isCritical = sig.priority === 'critical';
                          const isHigh = sig.priority === 'high';
                          const isConfirmed = sig.status === 'confirmed';
                          return (
                            <div
                              key={sig.id}
                              onClick={() => { setSelectedSignal(sig); setActiveView('signal-detail'); }}
                              className={`p-3 rounded-lg cursor-pointer transition-all duration-150 hover:-translate-y-px
                                ${isCritical
                                  ? 'bg-red-500/8 border border-red-500/20 hover:border-red-500/35'
                                  : isHigh
                                    ? 'bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30'
                                    : 'bg-surface-card border border-transparent hover:bg-surface-card/80 hover:border-border'
                                }`}
                            >
                              <div className="flex items-start justify-between mb-1 gap-2">
                                <div className={`text-sm leading-snug line-clamp-1 ${isCritical ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>
                                  {sig.signal}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {isConfirmed && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-bold uppercase">Confirmed</span>}
                                  <Badge color={priorityColorMap[sig.priority] || 'gray'} size="xs">{sig.priority}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-text-muted">
                                <span className={isCritical ? 'text-red-400 font-medium' : ''}>{sig.caseCount} cases</span>
                                {sig.prrValue && <><span>·</span><span>PRR {sig.prrValue}</span></>}
                                {sig.classEffect && <><span>·</span><span className="text-purple-400">Class effect</span></>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CollapsibleSection>
              </div>

              {/* AI Insights - v0.35.0: Collapsible */}
              <div className="mt-6">
                <CollapsibleSection
                  title="AI Safety Intelligence"
                  icon={<Brain className="w-5 h-5 text-accent-purple" />}
                  badge={{ text: 'AI', color: 'purple' }}
                  defaultExpanded={!isCollapsed('ai-insights')}
                  onToggle={(expanded) => setCollapsed('ai-insights', !expanded)}
                  variant="card"
                  size="sm"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="p-3 bg-accent-purple/5 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Class Effect Analysis</div>
                      <div className="text-sm text-text-primary">Hepatotoxicity signal consistent with other KRAS G12C inhibitors (sotorasib, adagrasib). Recommend proactive monitoring protocol.</div>
                    </div>
                    <div className="p-3 bg-accent-purple/5 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Regulatory Precedent</div>
                      <div className="text-sm text-text-primary">Similar signals led to label updates within 3-4 months for competitors. FDA may request CBE-30 or prior approval supplement.</div>
                    </div>
                    <div className="p-3 bg-accent-purple/5 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Predicted Actions</div>
                      <div className="text-sm text-text-primary">High likelihood of: CCDS update (95%), USPI revision (90%), SmPC variation (88%), PBRER signal section (100%).</div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </div>
        )}

        {/* SIGNAL DETAIL VIEW - The key view for the video */}
        {activeView === 'signal-detail' && selectedSignal && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="link" size="sm" onClick={() => setActiveView('signals')}>Signals</Button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-text-primary">{selectedSignal.signal}</span>
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-semibold text-text-primary">{selectedSignal.signal}</h1>
                    <Badge color={priorityColorMap[selectedSignal.priority] || 'gray'} variant="default" size="sm">{selectedSignal.priority.toUpperCase()}</Badge>
                    <Badge color={caseStatusColorMap[selectedSignal.status] || 'gray'} size="sm">{selectedSignal.status.replace('-', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    <button onClick={() => useAppStore.getState().setActiveModule('portfolio')} className="hover:text-accent-blue hover:underline transition-colors">{selectedSignal.product}</button>
                    {' • '}Detected {selectedSignal.detectedDate}
                    {' • '}
                    <button onClick={() => useAppStore.getState().setActiveModule('signal-detection')} className="hover:text-accent-blue hover:underline transition-colors">Source: {selectedSignal.source}</button>
                  </p>
                </div>
                {/* v173: Cross-module linking actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    toast.success(`Signal linked to ${selectedSignal?.product || 'trial'} — opening CTMS`);
                    setTimeout(() => useAppStore.getState().setActiveModule('ctms'), 600);
                  }}>
                    <Link2 className="w-4 h-4 mr-1" />Link to Trial
                  </Button>
                  <Button variant="danger" onClick={() => setShowInitiateLabelModal(true)}>
                    <Send className="w-4 h-4" />Initiate Label Update
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Main Content */}
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  {/* Signal Summary */}
                  <Card variant="elevated">
                    <CardContent>
                      <h3 className="text-sm font-semibold text-text-primary mb-3">Signal Summary</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{selectedSignal.description}</p>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-4 pt-4 border-t border-border">
                        <StatCard label="Total Cases" value={selectedSignal.caseCount} accentColor="red" />
                        <StatCard label="PRR Value" value={selectedSignal.prrValue || '-'} accentColor="blue" />
                        <StatCard label="ROR Value" value={selectedSignal.rorValue || '-'} accentColor="blue" />
                        <StatCard label="IC₀.₂₅" value={selectedSignal.ic025 || '-'} accentColor="blue" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Case Series */}
                  <Card variant="elevated">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text-primary">Case Series ({hepatoCases.length} cases)</h3>
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={() => {
                            const csvContent = [
                              ['Case #', 'Event', 'Age', 'Sex', 'Time to Onset', 'Outcome', 'Dechallenge'].join(','),
                              ...hepatoCases.map(c => [
                                c.caseNumber,
                                c.event,
                                c.age,
                                c.sex,
                                c.timeToOnset,
                                c.outcome,
                                c.dechallenge
                              ].join(','))
                            ].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = window.document.createElement('a');
                            a.href = url;
                            a.download = `medwatch-export-${selectedSignal?.id || 'signal'}-${new Date().toISOString().split('T')[0]}.csv`;
                            window.document.body.appendChild(a);
                            a.click();
                            window.document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />Export to MedWatch
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2 text-xs font-medium text-text-muted">Case #</th>
                              <th className="text-left p-2 text-xs font-medium text-text-muted">Event</th>
                              <th className="text-center p-2 text-xs font-medium text-text-muted">Age/Sex</th>
                              <th className="text-left p-2 text-xs font-medium text-text-muted">Onset</th>
                              <th className="text-left p-2 text-xs font-medium text-text-muted">Outcome</th>
                              <th className="text-center p-2 text-xs font-medium text-text-muted">Dechall</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hepatoCases.map(c => {
                              const caseNumber = c.caseNumber.split('-').pop();
                              const handleCaseClick = () => {
                                const icsr = icsrCases.find(i => i.caseNumber === c.caseNumber);
                                if (icsr) { setSelectedCase(icsr); setActiveView('case-detail'); }
                              };
                              return (
                              <tr key={c.id} className="border-b border-border/50 hover:bg-surface-card/50">
                                <td className="p-2">
                                  <button
                                    onClick={handleCaseClick}
                                    className="flex items-center gap-1 hover:underline group"
                                    title={`Open ICSR ${c.caseNumber}`}
                                  >
                                    {c.countryFlag}
                                    <span className="text-accent-blue group-hover:text-accent-blue/70 transition-colors">{caseNumber}</span>
                                  </button>
                                </td>
                                <td className="p-2 text-text-primary">{c.event}</td>
                                <td className="p-2 text-center text-text-muted">{c.age}/{c.sex}</td>
                                <td className="p-2 text-text-muted">{c.timeToOnset}</td>
                                <td className="p-2"><Badge color={c.outcome === 'hospitalization' ? 'red' : 'green'} size="xs">{c.outcome}</Badge></td>
                                <td className="p-2 text-center">{c.dechallenge === 'Positive' ? <CheckCircle className="w-4 h-4 text-accent-green mx-auto" /> : <span className="text-text-muted">-</span>}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Similar Signals in Class */}
                  <Card className="bg-accent-purple/5 border-accent-purple/20">
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-accent-purple" />
                        <h3 className="text-sm font-semibold text-text-primary">AI: Similar Signals in KRAS G12C Inhibitor Class</h3>
                      </div>
                      <div className="space-y-3">
                        {similarSignals.map((sim, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-text-primary">{sim.drug}</div>
                              <div className="text-xs text-text-muted">{sim.company} • {sim.indication}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-text-secondary">{sim.outcome}</div>
                              <div className="text-xs text-text-muted">Resolution: {sim.timeToResolution}</div>
                            </div>
                            {sim.labelChange && <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0 ml-3" />}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-accent-purple/10 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-accent-purple mt-0.5" />
                          <div className="text-sm text-text-secondary">
                            <strong className="text-text-primary">Regulatory Intelligence:</strong> Based on precedent, expect FDA inquiry within 30 days of next PBRER/PSUR submission. Proactive CBE-30 labeling supplement recommended.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-6">
                  {/* v0.27.54: AI Signal Analysis */}
                  <Card variant="elevated" padding="lg">
                    <SignalAnalysisPanel 
                      signal={selectedSignal}
                      recentCases={hepatoCases.slice(0, 5).map(c => ({
                        caseNumber: c.caseNumber,
                        outcome: c.outcome,
                        causality: c.causality || 'Unknown',
                        timeToOnset: c.timeToOnset || 'Unknown',
                      }))}
                    />
                  </Card>

                  {/* Recommendation */}
                  <Card className="bg-accent-red/5 border-accent-red/20">
                    <CardContent>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-accent-red" />
                        <h3 className="text-sm font-semibold text-text-primary">Recommended Action</h3>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">{selectedSignal.recommendation}</p>
                      <Button variant="danger" className="w-full" onClick={() => setShowInitiateLabelModal(true)}>
                        <Send className="w-4 h-4" />Initiate Label Update
                      </Button>
                    </CardContent>
                  </Card>

                  {/* v0.27.68: Module 2.7.4 Narrative Generation */}
                  <Card className="bg-accent-purple/5 border-accent-purple/20">
                    <CardContent>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-accent-purple" />
                        <h3 className="text-sm font-semibold text-text-primary">AI Narrative Generation</h3>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">
                        Generate Module 2.7.4 Summary of Clinical Safety section incorporating this signal's data and historical patterns.
                      </p>
                      <Button 
                        variant="secondary" 
                        className="w-full border-accent-purple/30 hover:bg-accent-purple/10" 
                        onClick={() => setShowNarrativePanel(true)}
                      >
                        <FileText className="w-4 h-4" />Generate 2.7.4 Narrative
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Signal Timeline */}
                  <Card variant="elevated" padding="lg">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Signal Timeline</h3>
                    <div className="space-y-4">
                      {[
                        { date: 'Nov 15, 2024', event: 'Signal detected', desc: 'Disproportionality analysis flagged PRR > 2.0', status: 'complete' },
                        { date: 'Nov 22, 2024', event: 'Evaluation initiated', desc: 'Medical review of 15 cases begun', status: 'complete' },
                        { date: 'Dec 5, 2024', event: 'Additional cases identified', desc: '8 new cases added to series', status: 'complete' },
                        { date: 'Dec 10, 2024', event: 'Signal confirmed', desc: 'PRAC concurrence obtained', status: 'complete' },
                        { date: 'Pending', event: 'Label update', desc: 'CCDS revision pending', status: 'pending' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${item.status === 'complete' ? 'bg-accent-green' : 'bg-slate-300'}`} />
                            {i < 4 && <div className="w-0.5 h-full bg-border mt-1" />}
                          </div>
                          <div className="pb-4">
                            <div className="text-xs text-text-muted">{item.date}</div>
                            <div className="text-sm font-medium text-text-primary">{item.event}</div>
                            <div className="text-xs text-text-muted">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Quick Stats */}
                  <Card variant="elevated" padding="lg">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Signal Attributes</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-text-muted">Labeled Event:</span><span className={selectedSignal.labeledEvent ? 'text-accent-green' : 'text-accent-red'}>{selectedSignal.labeledEvent ? 'Yes' : 'No'}</span></div>
                      <div className="flex justify-between"><span className="text-text-muted">Class Effect:</span><span className={selectedSignal.classEffect ? 'text-accent-purple' : 'text-text-secondary'}>{selectedSignal.classEffect ? 'Yes' : 'No'}</span></div>
                      <div className="flex justify-between"><span className="text-text-muted">Mechanism:</span><span className="text-text-secondary">Idiosyncratic DILI</span></div>
                      <div className="flex justify-between"><span className="text-text-muted">Expectedness:</span><span className="text-text-secondary">Expected, increased severity</span></div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIGNALS LIST */}
        {activeView === 'signals' && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Safety Signals</h1>
              </div>
              <Card variant="elevated" padding="none">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Signal</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Product</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Priority</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Cases</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">PRR</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredSignals.map(sig => (
                      <tr key={sig.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer" onClick={() => { setSelectedSignal(sig); setActiveView('signal-detail'); }}>
                        <td className="p-4">
                          <div className="text-sm text-text-primary">{sig.signal}</div>
                          <div className="text-xs text-text-muted">{sig.source}</div>
                        </td>
                        <td className="p-4 text-sm text-text-secondary">{sig.product}</td>
                        <td className="p-4 text-center"><Badge color={priorityColorMap[sig.priority] || 'gray'} size="sm">{sig.priority}</Badge></td>
                        <td className="p-4 text-center"><Badge color={caseStatusColorMap[sig.status] || 'gray'} size="sm">{sig.status.replace('-', ' ')}</Badge></td>
                        <td className="p-4 text-center text-sm">{sig.caseCount}</td>
                        <td className="p-4 text-center text-sm">{sig.prrValue || '-'}</td>
                        <td className="p-4 text-center">
                          <IconButton icon={<Eye className="w-4 h-4" />} label="View signal" variant="ghost" size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* ICSR CASES */}
        {activeView === 'icsr' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">ICSR Case Management</h1>
                <div className="flex items-center gap-3">
                  <SearchInput placeholder="Search cases..." className="w-64" />
                </div>
              </div>
              <Card variant="elevated" padding="none">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Case Number</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Event</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Product</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Serious</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Received</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Due</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Assignee</th>
                  </tr></thead>
                  <tbody>
                    {filteredCases.map(icsr => (
                      <tr
                        key={icsr.id}
                        className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer"
                        onClick={() => { setSelectedCase(icsr); setActiveView('case-detail'); }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span>{icsr.countryFlag}</span>
                            <span className="text-sm text-accent-blue hover:underline font-medium">{icsr.caseNumber}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-text-primary">{icsr.event}</td>
                        <td className="p-4 text-sm text-text-secondary">{icsr.product}</td>
                        <td className="p-4 text-center"><Badge color={seriousnessColorMap[icsr.seriousness] || 'gray'} size="sm">{icsr.seriousness}</Badge></td>
                        <td className="p-4 text-center"><Badge color={caseStatusColorMap[icsr.status] || 'gray'} size="sm">{icsr.status}</Badge></td>
                        <td className="p-4 text-sm text-text-muted">{icsr.receivedDate}</td>
                        <td className="p-4 text-sm text-text-muted">{icsr.dueDate}</td>
                        <td className="p-4 text-sm text-text-muted">{icsr.assignee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* REPORTS */}
        {activeView === 'reports' && (
          <div className="p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Periodic Reports</h1>
                <Button variant="primary" onClick={() => { setNewReportForm({ type: 'PBRER', product: 'LIG-2847 (Nexavant)', period: '', region: 'Global', owner: '' }); setShowNewReportModal(true); }}><Plus className="w-4 h-4" />New Report</Button>
              </div>
              <Card variant="elevated" padding="none">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Report Type</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Product</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Period</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Region</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Due Date</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Owner</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Actions</th>
                  </tr></thead>
                  <tbody>
                    {periodicReports.map(report => (
                      <tr key={report.id} className="border-b border-border/50 hover:bg-surface-card/50">
                        <td className="p-4 text-sm font-medium text-accent-blue">{report.type}</td>
                        <td className="p-4 text-sm text-text-secondary">{report.product}</td>
                        <td className="p-4 text-sm text-text-secondary">{report.period}</td>
                        <td className="p-4"><span className="flex items-center gap-2 text-sm">{report.regionFlag} {report.region}</span></td>
                        <td className="p-4 text-center"><Badge color={reportStatusColorMap[report.status] || 'gray'} size="sm">{report.status.replace('-', ' ')}</Badge></td>
                        <td className="p-4 text-sm text-text-muted">{report.dueDate}</td>
                        <td className="p-4 text-sm text-text-muted">{report.owner}</td>
                        <td className="p-4">
                          <button
                            onClick={() => setAggregateReportTarget(report)}
                            className="flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-blue/80 border border-accent-blue/30 hover:border-accent-blue/60 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
                          >
                            <Sparkles className="w-3 h-3" />
                            Generate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* Signal Detection Analytics - v181 Enhanced Dashboard */}
        {activeView === 'signal-detection' && (
          <SignalDetectionDashboard 
            disproportionalityData={extendedDisproportionalityData}
            signalRuns={signalDetectionRuns}
            trendData={hepatotoxicityTrend}
          />
        )}

        {/* v0.6.0: Signal Impact Center - Safety → Regulatory Cascade */}
        {activeView === 'signal-impact' && (
          <div className="p-4 md:p-6">
            <div className="max-w-[1600px] mx-auto">
              {/* Breadcrumb */}
              <Breadcrumb 
                moduleId="safety"
                viewLabel="Signal Impact Center"
                className="mb-4"
              />
              
              {/* Hero Banner - The "Aha Moment" */}
              <div className="mb-6 bg-gradient-to-r from-accent-red/10 via-accent-amber/10 to-accent-purple/10 border border-accent-red/30 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-accent-red/20 flex items-center justify-center flex-shrink-0">
                      <Workflow className="w-6 h-6 sm:w-8 sm:h-8 text-accent-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Signal Impact Center</h1>
                        <Badge color="red" size="sm">LIVE CASCADE</Badge>
                        <Badge color="purple" size="sm">R&D Connected</Badge>
                      </div>
                      <p className="text-text-secondary mb-4 max-w-3xl text-sm sm:text-base">
                        A safety signal was detected. Within <span className="font-bold text-accent-red">30 seconds</span>, 
                        <span className="font-bold text-text-primary"> 47 downstream actions</span> were automatically identified 
                        across 10 modules. In legacy systems, this takes 6-8 weeks.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse" />
                          <span className="text-text-muted">Cascade Active</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Signal:</span>
                          <span className="ml-1 font-semibold text-accent-red">{hepatotoxicityCascade.signalCode}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Product:</span>
                          <span className="ml-1 font-semibold">{hepatotoxicityCascade.productName}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Severity:</span>
                          <Badge color="red" size="sm">CRITICAL</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-4xl font-bold text-accent-red">{hepatotoxicityCascade.totalActions}</div>
                    <div className="text-sm text-text-muted">Actions Triggered</div>
                    <div className="mt-2 text-xs text-text-muted">
                      {hepatotoxicityCascade.completedActions} completed • {hepatotoxicityCascade.totalActions - hepatotoxicityCascade.completedActions} in progress
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard
                  label="Time to Identify"
                  value="30s"
                  icon={<Clock className="w-5 h-5" />}
                  accentColor="green"
                >
                  <span className="text-xs text-accent-green">vs 6-8 weeks legacy</span>
                </StatCard>
                <StatCard
                  label="Modules Impacted"
                  value="10"
                  icon={<Link2 className="w-5 h-5" />}
                  accentColor="purple"
                >
                  <span className="text-xs text-text-muted">Cross-R&D cascade</span>
                </StatCard>
                <StatCard
                  label="Automated Actions"
                  value="100%"
                  icon={<Zap className="w-5 h-5" />}
                  accentColor="blue"
                >
                  <span className="text-xs text-text-muted">Zero manual triage</span>
                </StatCard>
                <StatCard
                  label="Critical Items"
                  value={getCriticalActions(hepatotoxicityCascade).length}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor="red"
                >
                  <span className="text-xs text-text-muted">Requiring action</span>
                </StatCard>
                <StatCard
                  label="Completion"
                  value={`${getCascadeProgress(hepatotoxicityCascade).percentComplete}%`}
                  icon={<CheckCircle className="w-5 h-5" />}
                  accentColor="green"
                >
                  <span className="text-xs text-text-muted">{hepatotoxicityCascade.completedActions}/{hepatotoxicityCascade.totalActions} actions</span>
                </StatCard>
                <StatCard
                  label="Est. Resolution"
                  value="45d"
                  icon={<Calendar className="w-5 h-5" />}
                  accentColor="amber"
                >
                  <span className="text-xs text-text-muted">Target: Jan 30, 2025</span>
                </StatCard>
              </div>

              {/* Cascade Stage Pipeline */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-text-primary">Cascade Pipeline</h2>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent-green" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent-blue" />
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
                    {hepatotoxicityCascade.stages.map((stage, idx) => {
                      const meta = cascadeCategoryMeta[stage.category];
                      const StageIcon = stage.category === 'detection' ? AlertTriangle :
                                       stage.category === 'label-impact' ? Tag :
                                       stage.category === 'document-updates' ? FileText :
                                       stage.category === 'regulatory-timeline' ? Calendar :
                                       stage.category === 'haq-preparation' ? MessageSquare :
                                       stage.category === 'field-alerts' ? Users :
                                       stage.category === 'mlr-escalation' ? AlertCircle :
                                       stage.category === 'clinical-impact' ? Stethoscope :
                                       stage.category === 'quality-impact' ? Shield :
                                       Truck;
                      const statusColor = stage.status === 'completed' ? 'bg-accent-green' :
                                         stage.status === 'in-progress' ? 'bg-accent-blue' :
                                         'bg-border';
                      const statusBorder = stage.status === 'completed' ? 'border-accent-green/30' :
                                          stage.status === 'in-progress' ? 'border-accent-blue/30' :
                                          'border-border';
                      
                      return (
                        <div key={stage.category} className="flex items-stretch">
                          <div className={`flex-shrink-0 w-40 rounded-lg border ${statusBorder} bg-surface-elevated p-3 flex flex-col`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-lg ${statusColor}/20 flex items-center justify-center`}>
                                <StageIcon className={`w-4 h-4 ${stage.status === 'completed' ? 'text-accent-green' : stage.status === 'in-progress' ? 'text-accent-blue' : 'text-text-muted'}`} />
                              </div>
                              {stage.criticalCount > 0 && (
                                <Badge color="red" size="sm">{stage.criticalCount}</Badge>
                              )}
                            </div>
                            <div className="text-sm font-medium text-text-primary mb-1">{stage.label}</div>
                            <div className="text-xs text-text-muted mb-2 flex-1">{stage.description}</div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={stage.status === 'completed' ? 'text-accent-green' : stage.status === 'in-progress' ? 'text-accent-blue' : 'text-text-muted'}>
                                {stage.completedActions}/{stage.totalActions}
                              </span>
                              {stage.status === 'completed' && <Check className="w-4 h-4 text-accent-green" />}
                              {stage.status === 'in-progress' && <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />}
                            </div>
                          </div>
                          {idx < hepatotoxicityCascade.stages.length - 1 && (
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
                      <AlertTriangle className="w-5 h-5 text-accent-red" />
                      <h3 className="font-semibold text-text-primary">Critical Actions</h3>
                      <Badge color="red" size="sm">{getCriticalActions(hepatotoxicityCascade).length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {getCriticalActions(hepatotoxicityCascade).slice(0, 10).map(action => (
                        <div key={action.id} className="p-3 bg-accent-red/5 border border-accent-red/20 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge color={action.status === 'in-progress' ? 'blue' : action.status === 'pending-review' ? 'amber' : 'gray'} size="sm">
                                  {action.status.replace('-', ' ')}
                                </Badge>
                                <span className="text-xs text-text-muted">{cascadeCategoryMeta[action.category]?.label ?? action.category}</span>
                              </div>
                              <div className="text-sm font-medium text-text-primary">{action.title}</div>
                              <div className="text-xs text-text-muted mt-1">{action.description}</div>
                            </div>
                            <div className="text-right text-xs text-text-muted flex-shrink-0">
                              {action.dueDate && (
                                <div className="text-accent-red">Due: {new Date(action.dueDate).toLocaleDateString()}</div>
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
                      <Activity className="w-5 h-5 text-accent-blue" />
                      <h3 className="font-semibold text-text-primary">Recent Activity</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {hepatotoxicityCascade.actions
                        .filter(a => a.status === 'completed')
                        .sort((a, b) => new Date(b.completedAt || b.triggeredAt).getTime() - new Date(a.completedAt || a.triggeredAt).getTime())
                        .slice(0, 10)
                        .map(action => (
                          <div key={action.id} className="p-3 bg-surface-elevated border border-border rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Check className="w-4 h-4 text-accent-green" />
                                  <span className="text-xs text-text-muted">{cascadeCategoryMeta[action.category]?.label ?? action.category}</span>
                                </div>
                                <div className="text-sm font-medium text-text-primary">{action.title}</div>
                                {action.outputArtifacts && action.outputArtifacts.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <FileText className="w-3 h-3 text-text-muted" />
                                    <span className="text-xs text-accent-blue">{action.outputArtifacts[0]}</span>
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
              <div className="mt-6 p-4 bg-accent-purple/5 border border-accent-purple/20 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-1">R&D Connected: The Cascade Effect</h4>
                    <p className="text-sm text-text-secondary">
                      Veeva Vault Safety doesn't know what Veeva Vault RIM found. We do. When signal SIG-2026-001 was detected: 
                      <span className="text-accent-purple font-medium"> 5 labels flagged</span> • 
                      <span className="text-accent-blue font-medium"> 6 documents queued</span> • 
                      <span className="text-accent-amber font-medium"> 4 submissions triggered</span> • 
                      <span className="text-accent-green font-medium"> 12 KOLs alerted</span> • 
                      <span className="text-accent-red font-medium"> 2 MLR items escalated</span>.
                      That's not just pharmacovigilance — that's intelligence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case Intake Wizard - v184: Full E2B(R3) Implementation */}
        {activeView === 'case-intake' && (
          <div className="p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <button onClick={() => setActiveView('icsr')} className="hover:text-text-primary">Cases</button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-text-primary">New Case (E2B R3)</span>
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-3">
                    Case Intake Wizard
                    <Badge color="purple" size="sm">E2B(R3)</Badge>
                    {/* v0.13.25: Show saved case number */}
                    {draftCaseNumber && (
                      <Badge color="green" size="sm">{draftCaseNumber}</Badge>
                    )}
                  </h1>
                  <p className="text-sm text-text-muted mt-1">
                    ICH-compliant ICSR with full section mapping
                    {draftId && <span className="text-accent-green ml-2">• Draft saved</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">Completeness</div>
                    <div className="text-lg font-semibold text-text-primary">
                      {Math.round(((e2bForm.patientInitials ? 1 : 0) + (e2bForm.drugs.length > 0 ? 1 : 0) + (e2bForm.reactions.length > 0 ? 1 : 0) + (e2bForm.reporters.length > 0 ? 1 : 0) + (e2bForm.narrative ? 1 : 0)) / 5 * 100)}%
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowXmlPreview(true)}>
                    <FileCode className="w-4 h-4" />Preview XML
                  </Button>
                </div>
              </div>

              {/* E2B(R3) Section Progress */}
              <div className="mb-8 bg-surface-elevated border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {e2bWizardSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isComplete = idx + 1 < caseIntakeStep;
                    const isCurrent = idx + 1 === caseIntakeStep;
                    return (
                      <div key={step.id} className="flex-1 flex items-center">
                        <button onClick={() => setCaseIntakeStep(step.id)} className={`flex flex-col items-center gap-1 ${isCurrent ? '' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${isComplete ? 'bg-accent-green text-white' : isCurrent ? 'bg-accent-purple text-white' : 'bg-surface-card text-text-muted border border-border'}`}>
                            {isComplete ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                          </div>
                          <div className="text-center">
                            <div className={`text-xs font-medium ${isCurrent ? 'text-accent-purple' : 'text-text-muted'}`}>{step.section !== 'Review' ? `§${step.section}` : ''}</div>
                            <div className={`text-xs ${isCurrent ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</div>
                          </div>
                        </button>
                        {idx < e2bWizardSteps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-accent-green' : 'bg-border'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 1: Section A - Administrative */}
              {caseIntakeStep === 1 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-purple" />Section A: Administrative Information
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Report identification and seriousness assessment</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="text-sm font-medium block mb-2">Sender's Safety Report ID *</label>
                      <input type="text" value={e2bForm.senderReportId} onChange={e => setE2bForm(f => ({ ...f, senderReportId: e.target.value }))} placeholder="US-LIG-2025-XXXXX" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                      <div className="text-xs text-text-muted mt-1">A.1.0.1 - Unique case identifier</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Type of Report *</label>
                      <div className="flex gap-3">
                        <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 ${e2bForm.reportType === 'initial' ? 'border-accent-purple bg-accent-purple/5' : 'border-border bg-surface-card'}`}>
                          <input type="radio" name="reportType" checked={e2bForm.reportType === 'initial'} onChange={() => setE2bForm(f => ({ ...f, reportType: 'initial' }))} />
                          <div><div className="text-sm font-medium">Initial</div><div className="text-xs text-text-muted">First report</div></div>
                        </label>
                        <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 ${e2bForm.reportType === 'followup' ? 'border-accent-purple bg-accent-purple/5' : 'border-border bg-surface-card'}`}>
                          <input type="radio" name="reportType" checked={e2bForm.reportType === 'followup'} onChange={() => setE2bForm(f => ({ ...f, reportType: 'followup' }))} />
                          <div><div className="text-sm font-medium">Follow-up</div><div className="text-xs text-text-muted">Amendment</div></div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Date of First Receipt *</label>
                      <input type="date" value={e2bForm.receiptDate} onChange={e => setE2bForm(f => ({ ...f, receiptDate: e.target.value }))} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                      <div className="text-xs text-text-muted mt-1">A.1.4</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Date of Most Recent Info</label>
                      <input type="date" value={e2bForm.mostRecentDate} onChange={e => setE2bForm(f => ({ ...f, mostRecentDate: e.target.value }))} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                      <div className="text-xs text-text-muted mt-1">A.1.5</div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-sm font-medium block mb-2">Seriousness *</label>
                      <div className="flex gap-3">
                        <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 ${e2bForm.seriousness === 'serious' ? 'border-accent-red bg-accent-red/5' : 'border-border bg-surface-card'}`}>
                          <input type="radio" name="seriousness" checked={e2bForm.seriousness === 'serious'} onChange={() => setE2bForm(f => ({ ...f, seriousness: 'serious' }))} />
                          <AlertTriangle className="w-5 h-5 text-accent-red" />
                          <div><div className="text-sm font-medium">Serious</div><div className="text-xs text-text-muted">15-day expedited</div></div>
                        </label>
                        <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 ${e2bForm.seriousness === 'non-serious' ? 'border-accent-green bg-accent-green/5' : 'border-border bg-surface-card'}`}>
                          <input type="radio" name="seriousness" checked={e2bForm.seriousness === 'non-serious'} onChange={() => setE2bForm(f => ({ ...f, seriousness: 'non-serious' }))} />
                          <CheckCircle className="w-5 h-5 text-accent-green" />
                          <div><div className="text-sm font-medium">Non-Serious</div><div className="text-xs text-text-muted">90-day periodic</div></div>
                        </label>
                      </div>
                    </div>
                    {e2bForm.seriousness === 'serious' && (
                      <div className="col-span-1 md:col-span-2 p-4 bg-accent-red/5 border border-accent-red/20 rounded-lg">
                        <label className="text-sm font-medium block mb-3">Seriousness Criteria (B.2) - Select all that apply *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[{k:'resultsInDeath',l:'Results in death',c:'B.2.i.0'},{k:'lifeThreatening',l:'Life-threatening',c:'B.2.i.1'},{k:'hospitalization',l:'Hospitalization',c:'B.2.i.2'},{k:'disability',l:'Disability/Incapacity',c:'B.2.i.3'},{k:'congenitalAnomaly',l:'Congenital anomaly',c:'B.2.i.4'},{k:'otherMedicallyImportant',l:'Other medically important',c:'B.2.i.5'}].map(cr => (
                            <label key={cr.k} className="flex items-center gap-2 p-2 bg-surface-card rounded-lg cursor-pointer hover:bg-surface-card/80">
                              <input type="checkbox" checked={e2bForm[cr.k as keyof E2BFormState] as boolean} onChange={e => setE2bForm(f => ({ ...f, [cr.k]: e.target.checked }))} className="rounded border-border" />
                              <div><div className="text-sm">{cr.l}</div><div className="text-xs text-text-muted">{cr.c}</div></div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Section C - Reporter */}
              {caseIntakeStep === 2 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-accent-purple" />Section C: Primary Source
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Reporter information and contact details</p>
                  {e2bForm.reporters.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {e2bForm.reporters.map((r, i) => (
                        <div key={r.id} className="p-4 bg-surface-card rounded-lg border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge color={r.isPrimary ? 'purple' : 'gray'} size="sm">{r.isPrimary ? 'Primary' : 'Secondary'}</Badge>
                            <span className="text-sm font-medium">{r.firstName} {r.lastName}</span>
                            <span className="text-sm text-text-muted">• {r.qualificationLabel} • {r.countryLabel}</span>
                          </div>
                          <button onClick={() => setE2bForm(f => ({ ...f, reporters: f.reporters.filter((_, idx) => idx !== i) }))} className="p-1 hover:bg-surface-elevated rounded"><X className="w-4 h-4 text-text-muted" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-sm font-medium block mb-2">First Name</label><input type="text" id="rep-fn" placeholder="Jane" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                    <div><label className="text-sm font-medium block mb-2">Last Name *</label><input type="text" id="rep-ln" placeholder="Smith" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                    <div><label className="text-sm font-medium block mb-2">Qualification *</label><select id="rep-qual" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"><option value="">Select...</option>{e2bQualificationCodes.map(q => <option key={q.code} value={q.code}>{q.label}</option>)}</select></div>
                    <div><label className="text-sm font-medium block mb-2">Country *</label><select id="rep-country" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"><option value="">Select...</option>{e2bCountryCodes.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
                    <div><label className="text-sm font-medium block mb-2">Organization</label><input type="text" id="rep-org" placeholder="Memorial Hospital" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                    <div><label className="text-sm font-medium block mb-2">Email</label><input type="email" id="rep-email" placeholder="jane@hospital.org" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const fn = (document.getElementById('rep-fn') as HTMLInputElement)?.value || '';
                      const ln = (document.getElementById('rep-ln') as HTMLInputElement)?.value || '';
                      const qual = (document.getElementById('rep-qual') as HTMLSelectElement)?.value || '';
                      const ctry = (document.getElementById('rep-country') as HTMLSelectElement)?.value || '';
                      const org = (document.getElementById('rep-org') as HTMLInputElement)?.value || '';
                      const email = (document.getElementById('rep-email') as HTMLInputElement)?.value || '';
                      if (ln && qual && ctry) {
                        setE2bForm(f => ({ ...f, reporters: [...f.reporters, { id: `r-${Date.now()}`, firstName: fn, lastName: ln, qualification: qual, qualificationLabel: e2bQualificationCodes.find(q => q.code === qual)?.label || '', organization: org, department: '', street: '', city: '', state: '', postcode: '', country: ctry, countryLabel: e2bCountryCodes.find(c => c.code === ctry)?.label || '', telephone: '', email, isPrimary: f.reporters.length === 0 }] }));
                      }
                    }}><Plus className="w-4 h-4" />Add Reporter</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Section D - Patient */}
              {caseIntakeStep === 3 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent-purple" />Section D: Patient Information
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Patient demographics and medical history</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div><label className="text-sm font-medium block mb-2">Patient Initials *</label><input type="text" maxLength={3} value={e2bForm.patientInitials} onChange={e => setE2bForm(f => ({ ...f, patientInitials: e.target.value.toUpperCase() }))} placeholder="JD" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><div className="text-xs text-text-muted mt-1">D.1.1</div></div>
                    <div><label className="text-sm font-medium block mb-2">Age</label><div className="flex gap-2"><input type="number" value={e2bForm.age} onChange={e => setE2bForm(f => ({ ...f, age: e.target.value }))} placeholder="65" className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><select value={e2bForm.ageUnit} onChange={e => setE2bForm(f => ({ ...f, ageUnit: e.target.value }))} className="w-24 px-2 py-2 bg-surface-card border border-border rounded-lg text-sm">{e2bAgeUnitCodes.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}</select></div><div className="text-xs text-text-muted mt-1">D.2.1 / D.2.2a</div></div>
                    <div><label className="text-sm font-medium block mb-2">Age Group</label><select value={e2bForm.ageGroup} onChange={e => setE2bForm(f => ({ ...f, ageGroup: e.target.value }))} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"><option value="">Select...</option>{e2bAgeGroupCodes.map(g => <option key={g.code} value={g.code}>{g.label}</option>)}</select><div className="text-xs text-text-muted mt-1">D.2.3</div></div>
                    <div><label className="text-sm font-medium block mb-2">Sex</label><select value={e2bForm.sex} onChange={e => setE2bForm(f => ({ ...f, sex: e.target.value }))} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"><option value="">Select...</option>{e2bSexCodes.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select><div className="text-xs text-text-muted mt-1">D.5</div></div>
                    <div><label className="text-sm font-medium block mb-2">Weight (kg)</label><input type="number" value={e2bForm.weight} onChange={e => setE2bForm(f => ({ ...f, weight: e.target.value }))} placeholder="78" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><div className="text-xs text-text-muted mt-1">D.3</div></div>
                    <div><label className="text-sm font-medium block mb-2">Height (cm)</label><input type="number" value={e2bForm.height} onChange={e => setE2bForm(f => ({ ...f, height: e.target.value }))} placeholder="175" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><div className="text-xs text-text-muted mt-1">D.4</div></div>
                  </div>
                </div>
              )}

              {/* Step 4: Section G - Drug */}
              {caseIntakeStep === 4 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-accent-purple" />Section G: Drug Information
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Suspect and concomitant medications</p>
                  {e2bForm.drugs.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {e2bForm.drugs.map((d, i) => (
                        <div key={d.id} className="p-4 bg-surface-card rounded-lg border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge color={d.characterization === '1' ? 'red' : 'gray'} size="sm">{e2bDrugCharacterization.find(c => c.code === d.characterization)?.label}</Badge>
                            <span className="text-sm font-medium text-accent-blue">{d.productName}</span>
                            <span className="text-sm text-text-muted">• {d.dose} {d.doseUnit} • {d.routeLabel}</span>
                          </div>
                          <button onClick={() => setE2bForm(f => ({ ...f, drugs: f.drugs.filter((_, idx) => idx !== i) }))} className="p-1 hover:bg-surface-elevated rounded"><X className="w-4 h-4 text-text-muted" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-sm font-medium block mb-2">Characterization *</label><select id="drug-char" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">{e2bDrugCharacterization.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select><div className="text-xs text-text-muted mt-1">G.k.1</div></div>
                    <div><label className="text-sm font-medium block mb-2">Product Name *</label><select id="drug-name" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm"><option value="LIG-2847">LIG-2847 (Ligrastinib)</option><option value="LIG-3021">LIG-3021</option><option value="LIG-1182">LIG-1182</option></select><div className="text-xs text-text-muted mt-1">G.k.2.2</div></div>
                    <div><label className="text-sm font-medium block mb-2">Dose</label><div className="flex gap-2"><input type="text" id="drug-dose" placeholder="200" className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><select id="drug-unit" className="w-24 px-2 py-2 bg-surface-card border border-border rounded-lg text-sm"><option>mg</option><option>g</option><option>mcg</option><option>mL</option></select></div></div>
                    <div><label className="text-sm font-medium block mb-2">Route</label><select id="drug-route" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">{e2bRouteOfAdmin.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}</select><div className="text-xs text-text-muted mt-1">G.k.4.r.9.1</div></div>
                    <div><label className="text-sm font-medium block mb-2">Action Taken</label><select id="drug-action" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">{e2bActionTaken.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}</select><div className="text-xs text-text-muted mt-1">G.k.8</div></div>
                    <div><label className="text-sm font-medium block mb-2">Indication</label><input type="text" id="drug-ind" placeholder="NSCLC" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const char = (document.getElementById('drug-char') as HTMLSelectElement)?.value || '1';
                      const name = (document.getElementById('drug-name') as HTMLSelectElement)?.value || '';
                      const dose = (document.getElementById('drug-dose') as HTMLInputElement)?.value || '';
                      const unit = (document.getElementById('drug-unit') as HTMLSelectElement)?.value || 'mg';
                      const route = (document.getElementById('drug-route') as HTMLSelectElement)?.value || '065';
                      const action = (document.getElementById('drug-action') as HTMLSelectElement)?.value || '5';
                      const ind = (document.getElementById('drug-ind') as HTMLInputElement)?.value || '';
                      if (name) {
                        setE2bForm(f => ({ ...f, drugs: [...f.drugs, { id: `d-${Date.now()}`, characterization: char, productName: name, substanceName: '', dose, doseUnit: unit, frequency: '', route, routeLabel: e2bRouteOfAdmin.find(r => r.code === route)?.label || '', indication: ind, indicationMedDRA: '', startDate: '', endDate: '', batchNumber: '', actionTaken: action, actionTakenLabel: e2bActionTaken.find(a => a.code === action)?.label || '' }] }));
                      }
                    }}><Plus className="w-4 h-4" />Add Drug</Button>
                  </div>
                </div>
              )}

              {/* Step 5: Section E - Reaction */}
              {caseIntakeStep === 5 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-accent-purple" />Section E: Reaction/Event
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Adverse reaction details and MedDRA coding</p>
                  {e2bForm.reactions.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {e2bForm.reactions.map((r, i) => (
                        <div key={r.id} className="p-4 bg-surface-card rounded-lg border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge color={r.seriousness === 'serious' ? 'red' : 'gray'} size="sm">{r.seriousness}</Badge>
                            <span className="text-sm font-medium">{r.termReported}</span>
                            <span className="text-sm text-text-muted">• {r.meddraCode} • {r.outcomeLabel}</span>
                          </div>
                          <button onClick={() => setE2bForm(f => ({ ...f, reactions: f.reactions.filter((_, idx) => idx !== i) }))} className="p-1 hover:bg-surface-elevated rounded"><X className="w-4 h-4 text-text-muted" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">MedDRA Term *</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input type="text" value={meddraSearch} onChange={e => setMeddraSearch(e.target.value)} placeholder="Search MedDRA..." className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                      </div>
                      {meddraResults.length > 0 && (
                        <div className="mt-2 bg-surface-card border border-border rounded-lg max-h-40 overflow-auto">
                          {meddraResults.slice(0, 6).map((term, idx) => (
                            <div key={idx} onClick={() => { setSelectedMedDRA(term); setMeddraSearch(term.pt); }} className={`p-3 hover:bg-surface-elevated cursor-pointer border-b border-border/50 last:border-0 ${selectedMedDRA?.ptCode === term.ptCode ? 'bg-accent-purple/10' : ''}`}>
                              <div className="flex justify-between"><span className="text-sm font-medium">{term.pt}</span><span className="text-xs text-text-muted">{term.ptCode}</span></div>
                              <div className="text-xs text-text-muted">{term.soc}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedMedDRA && <div className="mt-2 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg flex items-center gap-2"><Check className="w-4 h-4 text-accent-green" /><span className="text-sm font-medium">{selectedMedDRA.pt}</span><span className="text-xs text-text-muted ml-2">{selectedMedDRA.ptCode}</span></div>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div><label className="text-sm font-medium block mb-2">Outcome</label><select id="rxn-outcome" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">{e2bOutcomeCodes.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}</select><div className="text-xs text-text-muted mt-1">E.i.7</div></div>
                      <div><label className="text-sm font-medium block mb-2">Start Date</label><input type="date" id="rxn-start" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><div className="text-xs text-text-muted mt-1">E.i.4</div></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={() => {
                      if (selectedMedDRA) {
                        const outcome = (document.getElementById('rxn-outcome') as HTMLSelectElement)?.value || '6';
                        const start = (document.getElementById('rxn-start') as HTMLInputElement)?.value || '';
                        setE2bForm(f => ({ ...f, reactions: [...f.reactions, { id: `rxn-${Date.now()}`, termReported: selectedMedDRA.pt, meddraCode: selectedMedDRA.ptCode, meddraVersion: '27.0', meddraSOC: selectedMedDRA.soc, startDate: start, endDate: '', duration: '', durationUnit: '', outcome, outcomeLabel: e2bOutcomeCodes.find(o => o.code === outcome)?.label || '', seriousness: e2bForm.seriousness === 'serious' ? 'serious' : 'non-serious', seriousnessCriteria: [], medicallyConfirmed: true }] }));
                        setSelectedMedDRA(null);
                        setMeddraSearch('');
                      }
                    }}><Plus className="w-4 h-4" />Add Reaction</Button>
                  </div>
                </div>
              )}

              {/* Step 6: Section F - Tests */}
              {caseIntakeStep === 6 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-accent-purple" />Section F: Test Results
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Relevant laboratory tests and diagnostic procedures</p>
                  {e2bForm.tests.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {e2bForm.tests.map((t, i) => (
                        <div key={t.id} className="p-4 bg-surface-card rounded-lg border border-border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{t.name}</span>
                            <span className="text-sm text-text-muted">• {t.resultValue} {t.unit} • {t.date}</span>
                          </div>
                          <button onClick={() => setE2bForm(f => ({ ...f, tests: f.tests.filter((_, idx) => idx !== i) }))} className="p-1 hover:bg-surface-elevated rounded"><X className="w-4 h-4 text-text-muted" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div><label className="text-sm font-medium block mb-2">Test Name</label><input type="text" id="test-name" placeholder="ALT" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                    <div><label className="text-sm font-medium block mb-2">Result</label><div className="flex gap-2"><input type="text" id="test-value" placeholder="450" className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /><input type="text" id="test-unit" placeholder="U/L" className="w-20 px-2 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div></div>
                    <div><label className="text-sm font-medium block mb-2">Date</label><input type="date" id="test-date" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" /></div>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const name = (document.getElementById('test-name') as HTMLInputElement)?.value || '';
                      const value = (document.getElementById('test-value') as HTMLInputElement)?.value || '';
                      const unit = (document.getElementById('test-unit') as HTMLInputElement)?.value || '';
                      const date = (document.getElementById('test-date') as HTMLInputElement)?.value || '';
                      if (name) {
                        setE2bForm(f => ({ ...f, tests: [...f.tests, { id: `t-${Date.now()}`, date, name, meddraCode: '', result: '', resultValue: value, unit, normalLow: '', normalHigh: '', comments: '' }] }));
                      }
                    }}><Plus className="w-4 h-4" />Add Test</Button>
                  </div>
                  <div className="mt-4 p-3 bg-surface-card rounded-lg text-sm text-text-muted">
                    <Info className="w-4 h-4 inline mr-2" />Optional section. Add relevant lab results if available.
                  </div>
                </div>
              )}

              {/* Step 7: Section H - Narrative */}
              {caseIntakeStep === 7 && (
                <div className="bg-surface-elevated border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-purple" />Section H: Narrative
                  </h2>
                  <p className="text-sm text-text-muted mb-6">Case narrative and sender comments</p>
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="text-sm font-medium block mb-2">Case Narrative *</label>
                      <textarea value={e2bForm.narrative} onChange={e => setE2bForm(f => ({ ...f, narrative: e.target.value }))} placeholder="Describe the clinical course including relevant history, concomitant medications, event timeline, and outcome..." className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm h-40" />
                      <div className="flex items-center justify-between mt-1"><div className="text-xs text-text-muted">H.1 - Maximum 100,000 characters</div><div className="text-xs text-text-muted">{e2bForm.narrative.length}/100000</div></div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Sender's Comments</label>
                      <textarea value={e2bForm.senderComments} onChange={e => setE2bForm(f => ({ ...f, senderComments: e.target.value }))} placeholder="Additional comments from the sender..." className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm h-24" />
                      <div className="text-xs text-text-muted mt-1">H.4</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Sender's Diagnosis</label>
                      <input type="text" value={e2bForm.senderDiagnosis} onChange={e => setE2bForm(f => ({ ...f, senderDiagnosis: e.target.value }))} placeholder="Primary diagnosis or medical assessment..." className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                      <div className="text-xs text-text-muted mt-1">H.5</div>
                    </div>
                    <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-4 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-accent-purple" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">AI Narrative Assistance</h3>
                        <p className="text-sm text-text-muted mt-1">Narrative can be auto-generated from structured data. Click to generate draft narrative from entered information.</p>
                        <button 
                          onClick={handleGenerateNarrative}
                          disabled={isGeneratingNarrative || e2bForm.drugs.length === 0 || e2bForm.reactions.length === 0}
                          className="mt-2 text-sm text-accent-purple font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:text-accent-purple/80"
                        >
                          {isGeneratingNarrative ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4" />
                              Generate Draft Narrative →
                            </>
                          )}
                        </button>
                        {(e2bForm.drugs.length === 0 || e2bForm.reactions.length === 0) && (
                          <p className="text-xs text-text-muted mt-2">Add at least one drug and one reaction first</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Review & Submit */}
              {caseIntakeStep === 8 && (
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-surface-elevated border border-border rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-accent-purple" />Case Summary
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-sm">
                      <div className="space-y-4">
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Report Info (A)</h3><div className="text-text-primary">{e2bForm.senderReportId || 'Not set'}</div><div className="text-text-muted">{e2bForm.reportType} • {e2bForm.receiptDate}</div></div>
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Reporters (C)</h3>{e2bForm.reporters.length > 0 ? e2bForm.reporters.map(r => <div key={r.id} className="text-text-primary">{r.firstName} {r.lastName} • {r.qualificationLabel}</div>) : <div className="text-text-muted">None added</div>}</div>
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Patient (D)</h3><div className="text-text-primary">{e2bForm.patientInitials || 'N/A'}{e2bForm.age && `, ${e2bForm.age}y`}{e2bForm.sex && ` ${e2bSexCodes.find(s => s.code === e2bForm.sex)?.label}`}</div></div>
                      </div>
                      <div className="space-y-4">
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Drugs (G)</h3>{e2bForm.drugs.length > 0 ? e2bForm.drugs.map(d => <div key={d.id} className="text-accent-blue">{d.productName} • {d.dose}{d.doseUnit}</div>) : <div className="text-text-muted">None added</div>}</div>
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Reactions (E)</h3>{e2bForm.reactions.length > 0 ? e2bForm.reactions.map(r => <div key={r.id} className={r.seriousness === 'serious' ? 'text-accent-red' : 'text-text-primary'}>{r.termReported}</div>) : <div className="text-text-muted">None added</div>}</div>
                        <div><h3 className="font-semibold text-text-muted text-xs uppercase tracking-wide mb-2">Seriousness</h3><Badge color={e2bForm.seriousness === 'serious' ? 'red' : 'green'} size="sm">{e2bForm.seriousness || 'Not set'}</Badge></div>
                      </div>
                    </div>
                  </div>

                  {/* Regulatory Timeline */}
                  <div className={`${e2bForm.seriousness === 'serious' ? 'bg-accent-red/10 border-accent-red/30' : 'bg-accent-blue/10 border-accent-blue/30'} border rounded-lg p-4 flex items-start gap-3`}>
                    <Clock className={`w-5 h-5 ${e2bForm.seriousness === 'serious' ? 'text-accent-red' : 'text-accent-blue'}`} />
                    <div>
                      <h3 className="text-sm font-semibold">Regulatory Timeline</h3>
                      <div className="text-sm text-text-muted mt-1">
                        {e2bForm.seriousness === 'serious' 
                          ? `15-day expedited due: ${new Date(new Date(e2bForm.receiptDate).getTime() + 15*24*60*60*1000).toLocaleDateString()}`
                          : `90-day periodic due: ${new Date(new Date(e2bForm.receiptDate).getTime() + 90*24*60*60*1000).toLocaleDateString()}`
                        }
                      </div>
                    </div>
                  </div>

                  {/* Gateway Selection */}
                  <div className="bg-surface-elevated border border-border rounded-lg p-6">
                    <h3 className="text-sm font-semibold mb-4">Select Destination Gateways</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {e2bGateways.map(gw => (
                        <label key={gw.id} className={`flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer border-2 ${e2bForm.selectedGateways.includes(gw.id) ? 'border-accent-purple bg-accent-purple/5' : 'border-border bg-surface-card'}`}>
                          <input type="checkbox" checked={e2bForm.selectedGateways.includes(gw.id)} onChange={e => setE2bForm(f => ({ ...f, selectedGateways: e.target.checked ? [...f.selectedGateways, gw.id] : f.selectedGateways.filter(g => g !== gw.id) }))} className="sr-only" />
                          <span className="text-2xl">{gw.flag}</span>
                          <span className="text-sm font-medium">{gw.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Validation */}
                  <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-accent-green" />
                    <div>
                      <h3 className="text-sm font-semibold">Validation Passed</h3>
                      <p className="text-sm text-text-muted">ICSR validates against ICH E2B(R3) schema requirements</p>
                    </div>
                  </div>

                  {/* v0.13.31: XML Preview Button */}
                  <div className="bg-surface-elevated border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold mb-1">E2B(R3) XML Output</h3>
                        <p className="text-sm text-text-muted">Preview and download the generated ICH-compliant XML</p>
                      </div>
                      <button 
                        onClick={() => setShowXmlPreview(true)}
                        className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm flex items-center gap-2 hover:bg-accent-purple/90"
                      >
                        <FileCode className="w-4 h-4" />
                        Preview XML
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => caseIntakeStep > 1 ? setCaseIntakeStep(caseIntakeStep - 1) : setActiveView('icsr')} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                  {caseIntakeStep > 1 ? '← Previous' : 'Cancel'}
                </button>
                <div className="flex gap-3">
                  {/* v0.13.25: Save Draft available at all steps */}
                  <button 
                    onClick={handleSaveDraft} 
                    disabled={isSavingDraft}
                    className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-surface-card disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Draft</>
                    )}
                  </button>
                  {caseIntakeStep < 8 ? (
                    <button onClick={() => setCaseIntakeStep(caseIntakeStep + 1)} className="px-6 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/90">
                      Continue →
                    </button>
                  ) : (
                    <button onClick={() => setShowGatewaySimulation(true)} className="px-6 py-2 bg-accent-green text-white rounded-lg text-sm flex items-center gap-2 hover:bg-accent-green/90">
                      <Send className="w-4 h-4" />Submit to Gateway{e2bForm.selectedGateways.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* v0.13.32: Gateway Submission Panel - Full ACK flow simulation */}
        <GatewaySubmissionPanel
          formState={e2bForm}
          selectedGatewayIds={e2bForm.selectedGateways}
          isOpen={showGatewaySimulation}
          onClose={() => setShowGatewaySimulation(false)}
          onComplete={() => {
            setActiveView('icsr');
            setE2bForm(initialE2BFormState);
            setCaseIntakeStep(1);
            setDraftId(null);
            setDraftCaseNumber(null);
          }}
          caseNumber={draftCaseNumber || e2bForm.senderReportId || undefined}
        />

        {/* v0.13.31: XML Preview Panel - Uses API for proper E2B(R3) generation */}
        <XMLPreviewPanel
          formState={e2bForm}
          isOpen={showXmlPreview}
          onClose={() => setShowXmlPreview(false)}
          senderId="LIGATURE"
          receiverId={e2bForm.selectedGateways.includes('fda') ? 'FDA' : e2bForm.selectedGateways.includes('ema') ? 'EMA' : 'FDA'}
          caseNumber={draftCaseNumber || e2bForm.senderReportId || undefined}
        />


        {/* Case Detail */}
        {activeView === 'case-detail' && selectedCase && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4"><button onClick={() => setActiveView('icsr')} className="hover:text-text-primary">Cases</button><ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedCase.caseNumber}</span></div>
              <div className="flex items-start justify-between mb-6">
                <div><div className="flex items-center gap-3 mb-2"><span className="text-2xl">{selectedCase.countryFlag}</span><h1 className="text-2xl font-semibold text-text-primary">{selectedCase.caseNumber}</h1><Badge color={seriousnessColorMap[selectedCase.seriousness] || 'gray'} size="sm">{selectedCase.seriousness}</Badge><Badge color={caseStatusColorMap[selectedCase.status] || 'gray'} size="sm">{selectedCase.status}</Badge></div><p className="text-sm text-text-muted">{selectedCase.product} • {selectedCase.event}</p></div>
                <div className="flex items-center gap-2"><button onClick={() => setShowMedWatchModal(true)} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2"><FileText className="w-4 h-4" />MedWatch</button><button onClick={() => setShowE2BModal(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2"><FileCode className="w-4 h-4" />E2B(R3)</button>{!caseSignatureSuccess && (selectedCase.status === 'processing' || selectedCase.status === 'new') && (<button onClick={() => setShowCaseSignatureModal(true)} className="px-4 py-2 bg-accent-teal text-white rounded-lg text-sm flex items-center gap-2 hover:bg-accent-teal/90 transition-colors"><span className="text-base leading-none">✍</span>Approve for Submission</button>)}{caseSignatureSuccess && (<span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/30 text-xs font-medium text-accent-green">✓ Signature applied</span>)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  <Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-4">Case Details</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-sm"><div><div className="text-xs text-text-muted mb-1">Patient</div><div>{selectedCase.patientInitials || 'N/A'}, {selectedCase.age}y {selectedCase.sex}</div></div><div><div className="text-xs text-text-muted mb-1">Weight</div><div>{selectedCase.patientWeight ? `${selectedCase.patientWeight}kg` : 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Dose</div><div>{selectedCase.dose || 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Onset</div><div>{selectedCase.timeToOnset || 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Dechallenge</div><div>{selectedCase.dechallenge || 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Outcome</div><div className="capitalize">{selectedCase.outcome}</div></div><div><div className="text-xs text-text-muted mb-1">Causality</div><div>{selectedCase.causality || 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Rechallenge</div><div>{selectedCase.rechallenge || 'N/A'}</div></div><div><div className="text-xs text-text-muted mb-1">Action</div><div className="capitalize">{selectedCase.actionTaken || 'N/A'}</div></div></div></Card>
                  {selectedCase.narrative && (<Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-3">Narrative</h3><p className="text-sm text-text-secondary leading-relaxed">{selectedCase.narrative}</p></Card>)}
                  <Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-3">MedDRA Coding</h3><div className="flex items-center gap-4"><div className="flex-1 p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">PT</div><div className="text-sm font-medium">{selectedCase.meddraPreferred || selectedCase.event}</div></div><ChevronRight className="w-4 h-4 text-text-muted" /><div className="flex-1 p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">SOC</div><div className="text-sm font-medium">{selectedCase.meddraSOC || 'Hepatobiliary disorders'}</div></div></div></Card>
                </div>
                <div className="space-y-4 md:space-y-6">
                  {/* Workflow Status - Phase 2.1b */}
                  <WorkflowStatus
                    caseId={selectedCase.id}
                    caseNumber={selectedCase.caseNumber}
                    initialStatus={(selectedCase.status === 'new' ? 'DRAFT' : selectedCase.status === 'processing' ? 'DATA_ENTRY' : selectedCase.status === 'submitted' ? 'SUBMITTED' : 'DRAFT') as ICSRWorkflowStatus}
                    userRole="SAFETY"
                    userName="Current User"
                  />
                  <Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-3">Reporter</h3><div className="space-y-2 text-sm">{selectedCase.reporterName && (<div className="flex items-center gap-2"><User className="w-4 h-4 text-text-muted" />{selectedCase.reporterName}</div>)}{selectedCase.reporterInstitution && (<div className="flex items-center gap-2"><Building className="w-4 h-4 text-text-muted" />{selectedCase.reporterInstitution}</div>)}<div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-text-muted" />{selectedCase.country}</div></div></Card>
                  <Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-3">Submission Status</h3><div className="space-y-2"><div className="flex items-center justify-between p-2 bg-surface-card rounded"><span className="text-sm">MedWatch</span>{selectedCase.medwatchSubmitted ? <span className="text-xs px-2 py-0.5 rounded bg-accent-green/20 text-accent-green">Sent</span> : <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">Pending</span>}</div><div className="flex items-center justify-between p-2 bg-surface-card rounded"><span className="text-sm">E2B</span>{selectedCase.e2bExported ? <span className="text-xs px-2 py-0.5 rounded bg-accent-green/20 text-accent-green">Exported</span> : <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">Pending</span>}</div></div></Card>
                  <Card variant="elevated" padding="lg"><h3 className="text-sm font-semibold mb-3">Timeline</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-text-muted">Received:</span>{selectedCase.receivedDate}</div><div className="flex justify-between"><span className="text-text-muted">Due:</span><span className="text-accent-amber">{selectedCase.dueDate}</span></div><div className="flex justify-between"><span className="text-text-muted">Assignee:</span>{selectedCase.assignee}</div></div></Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 21 CFR Part 11 — ICSR Approval Signature */}
      {showCaseSignatureModal && selectedCase && (
        <ElectronicSignatureModal
          isOpen={showCaseSignatureModal}
          onClose={() => setShowCaseSignatureModal(false)}
          onConfirm={async (reason) => {
            const docContent = JSON.stringify({
              caseNumber: selectedCase.caseNumber,
              product: selectedCase.product,
              event: selectedCase.event,
              status: selectedCase.status,
              causality: selectedCase.causality,
              seriousness: selectedCase.seriousness,
            });
            await fetch('/api/signatures', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: 'icsr-case',
                entityId: selectedCase.id,
                entityLabel: selectedCase.caseNumber,
                action: 'Approve for Submission',
                meaning: 'approved-for-submission',
                signedByUserId: 'current-user',
                signedByName: 'James Liu',
                signedByTitle: 'Director, Regulatory Affairs',
                reason,
                documentContent: docContent,
              }),
            });
            setCaseSignatureSuccess(selectedCase.id);
          }}
          context={{
            entityType: 'icsr-case',
            entityId: selectedCase.id,
            entityLabel: selectedCase.caseNumber,
            action: 'Approve for Submission',
            meaning: 'approved-for-submission',
          }}
          currentUser={{ name: 'James Liu', title: 'Director, Regulatory Affairs', email: 'j.liu@ligaturerd.io' }}
        />
      )}

      {/* MedWatch Modal */}
      {showMedWatchModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[700px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center"><FileText className="w-5 h-5 text-accent-blue" /></div><div><h2 className="text-lg font-semibold">FDA MedWatch 3500</h2><p className="text-sm text-text-muted">{selectedCase.caseNumber}</p></div></div><button onClick={() => setShowMedWatchModal(false)} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button></div>
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(90vh-140px)]">
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent-green" /><span className="text-sm font-medium">AI Auto-populated from ICSR</span></div>
              <div className="space-y-4">
                <div className="p-4 bg-surface-card rounded-lg"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-accent-blue text-white rounded text-xs flex items-center justify-center">A</span>Patient</h3><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-sm"><div><div className="text-xs text-text-muted">Initials</div><div className="font-medium">{selectedCase.patientInitials || 'N/A'}</div></div><div><div className="text-xs text-text-muted">Age</div><div className="font-medium">{selectedCase.age || 'N/A'}</div></div><div><div className="text-xs text-text-muted">Sex</div><div className="font-medium">{selectedCase.sex || 'N/A'}</div></div><div><div className="text-xs text-text-muted">Weight</div><div className="font-medium">{selectedCase.patientWeight ? `${selectedCase.patientWeight}kg` : 'N/A'}</div></div></div></div>
                <div className="p-4 bg-surface-card rounded-lg"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-accent-blue text-white rounded text-xs flex items-center justify-center">B</span>Event</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm"><div><div className="text-xs text-text-muted">Description</div><div>{selectedCase.event}</div></div><div><div className="text-xs text-text-muted">Outcome</div><div className="capitalize">{selectedCase.outcome}</div></div></div></div>
                <div className="p-4 bg-surface-card rounded-lg"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-accent-blue text-white rounded text-xs flex items-center justify-center">C</span>Product</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm"><div><div className="text-xs text-text-muted">Name</div><div className="font-medium text-accent-blue">{selectedCase.product}</div></div><div><div className="text-xs text-text-muted">Dose</div><div>{selectedCase.dose || 'N/A'}</div></div></div></div>
                <div className="p-4 bg-surface-card rounded-lg"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-accent-blue text-white rounded text-xs flex items-center justify-center">E</span>Reporter</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm"><div><div className="text-xs text-text-muted">Type</div><div className="capitalize">{selectedCase.reporterType || 'HCP'}</div></div><div><div className="text-xs text-text-muted">Name</div><div>{selectedCase.reporterName || 'N/A'}</div></div></div></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3"><button onClick={() => setShowMedWatchModal(false)} className="px-4 py-2 text-sm text-text-secondary">Cancel</button><button className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2"><Download className="w-4 h-4" />PDF</button><button className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2"><Send className="w-4 h-4" />Submit to FDA</button></div>
          </div>
        </div>
      )}

      {/* E2B Export Modal */}
      {showE2BModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[650px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center"><FileCode className="w-5 h-5 text-accent-purple" /></div><div><h2 className="text-lg font-semibold">E2B(R3) Export</h2><p className="text-sm text-text-muted">{selectedCase.caseNumber}</p></div></div><button onClick={() => setShowE2BModal(false)} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button></div>
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6"><label className="text-sm font-medium block mb-2">Version</label><div className="flex gap-3"><label className="flex items-center gap-2 p-3 bg-surface-card rounded-lg cursor-pointer border-2 border-accent-purple"><input type="radio" name="e2bv" defaultChecked /><div><div className="text-sm font-medium">R3</div><div className="text-xs text-text-muted">Current</div></div></label><label className="flex items-center gap-2 p-3 bg-surface-card rounded-lg cursor-pointer border border-border"><input type="radio" name="e2bv" /><div><div className="text-sm font-medium">R2</div><div className="text-xs text-text-muted">Legacy</div></div></label></div></div>
              <div className="mb-6"><label className="text-sm font-medium block mb-2">Destination</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{n:'FDA FAERS',f:'🇺🇸',s:selectedCase.country==='United States'},{n:'EudraVigilance',f:'🇪🇺',s:selectedCase.country==='Germany'},{n:'PMDA',f:'🇯🇵',s:selectedCase.country==='Japan'}].map((d,i)=>(<label key={i} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border ${d.s?'border-accent-purple bg-accent-purple/5':'border-border'}`}><input type="checkbox" defaultChecked={d.s} className="rounded" /><span>{d.f}</span><span className="text-sm">{d.n}</span></label>))}</div></div>
              <div className="bg-surface-card rounded-lg p-4 mb-6"><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold">Preview</h3><button className="text-xs text-accent-blue flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button></div><pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded overflow-auto max-h-32 font-mono">{`<ichicsr>\n  <safetyreport>\n    <safetyreportid>${selectedCase.caseNumber}</safetyreportid>\n    <patient><patientinitial>${selectedCase.patientInitials||''}</patientinitial></patient>\n    <drug><medicinalproduct>${selectedCase.product}</medicinalproduct></drug>\n    <reaction><reactionmeddrapt>${selectedCase.event}</reactionmeddrapt></reaction>\n  </safetyreport>\n</ichicsr>`}</pre></div>
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 flex items-start gap-3"><CheckCircle className="w-5 h-5 text-accent-green" /><div><h3 className="text-sm font-semibold">Validation Passed</h3><p className="text-sm text-text-muted">Validates against ICH E2B(R3) schema</p></div></div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3"><button onClick={() => setShowE2BModal(false)} className="px-4 py-2 text-sm text-text-secondary">Cancel</button><button className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2"><Download className="w-4 h-4" />XML</button><button className="px-6 py-2 bg-accent-purple text-white rounded-lg text-sm flex items-center gap-2"><Send className="w-4 h-4" />Submit</button></div>
          </div>
        </div>
      )}

      {/* Initiate Label Update Modal */}
      {showInitiateLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[600px] shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-accent-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Initiate Label Update</h2>
                  <p className="text-sm text-text-muted">Safety Signal: Hepatotoxicity - LIG-2847</p>
                </div>
              </div>
              <button onClick={() => setShowInitiateLabelModal(false)} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-accent-purple mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">AI-Generated Recommendation</div>
                    <p className="text-sm text-text-secondary mt-1">Based on the confirmed signal and class effect analysis, recommend updating CCDS Section 4.4 (Warnings) to include enhanced hepatotoxicity monitoring guidance and dose modification recommendations.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Update Type</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                  <option>CCDS Update - Safety Warning Enhancement</option>
                  <option>CBE-30 Supplement (US)</option>
                  <option>Type II Variation (EU)</option>
                  <option>All of the above</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Affected Sections</label>
                <div className="space-y-2">
                  {['4.4 Warnings and Precautions', '4.2 Posology (monitoring)', '4.8 Adverse Reactions (frequency update)'].map((section, i) => (
                    <label key={i} className="flex items-center gap-2 p-2 bg-surface-card rounded-lg cursor-pointer hover:bg-surface-card/80">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span className="text-sm text-text-primary">{section}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Target Timeline</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                  <option>Urgent - 30 days (CBE-30)</option>
                  <option>Standard - 90 days</option>
                  <option>Next PBRER cycle</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Notes</label>
                <textarea className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary h-20" placeholder="Additional context for the labeling team..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-text-muted flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Will create linked tasks in Labeling, Publishing, and HAQ modules
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowInitiateLabelModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                <button 
                  onClick={() => {
                    // v159: Emit cross-module events for label change
                    if (selectedSignal) {
                      emitEvent(
                        'safety-signal-confirmed',
                        'safety',
                        {
                          signalId: selectedSignal.id,
                          signal: selectedSignal.signal,
                          product: selectedSignal.product,
                          productId: selectedSignal.productId,
                          priority: selectedSignal.priority,
                          prr: selectedSignal.prrValue,
                          ror: selectedSignal.rorValue,
                          caseCount: selectedSignal.caseCount,
                          recommendation: selectedSignal.recommendation,
                        },
                        { priority: 'critical', automated: true, requiresReview: true }
                      );
                      emitEvent(
                        'label-change-recommended',
                        'safety',
                        {
                          signalId: selectedSignal.id,
                          signal: selectedSignal.signal,
                          product: selectedSignal.product,
                          productId: selectedSignal.productId,
                          sections: ['4.4', '4.2', '4.8'],
                          updateType: 'CCDS Update - Safety Warning Enhancement',
                          timeline: '30 days',
                        },
                        { priority: 'high', automated: true, requiresReview: false }
                      );
                    }
                    // v0.44.42: Fire cascade engine — spawns CAPA, labeling review, submission flag
                    if (selectedSignal) {
                      fireTrigger({
                        type: 'safety-signal-confirmed',
                        sourceModule: 'safety',
                        sourceId: selectedSignal.id,
                        sourceLabel: 'Signal ' + selectedSignal.id + ' — ' + selectedSignal.signal,
                        triggeredBy: 'current-user',
                        metadata: {
                          signalId: selectedSignal.id,
                          signal: selectedSignal.signal,
                          product: selectedSignal.product,
                          priority: selectedSignal.priority,
                          caseCount: selectedSignal.caseCount,
                        },
                      });
                    }
                    setShowInitiateLabelModal(false);
                    // Navigate to Labeling module where the tasks now exist
                    setTimeout(() => useAppStore.getState().setActiveModule('labeling'), 400);
                  }} 
                  className="px-6 py-2 bg-accent-red text-white rounded-lg text-sm hover:bg-accent-red/90 flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />Initiate Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* v0.27.68: Module 2.7.4 Narrative Generation Panel */}
      {showNarrativePanel && selectedSignal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="w-full max-w-4xl max-h-[90vh]">
            <SafetyNarrativeStreamingPanel
              productName={selectedSignal.product}
              signalName={selectedSignal.signal}
              signalId={selectedSignal.id}
              indication="the target indication"
              subjectsExposed={1247}
              expanded={false}
              onAccept={(narrative, score) => {
                toast.success(`Narrative accepted with ${score}% compliance score`);
                setShowNarrativePanel(false);
              }}
              onClose={() => setShowNarrativePanel(false)}
            />
          </div>
        </div>
      )}

      {/* v0.86.0: Aggregate Report Generation Panel */}
      {aggregateReportTarget && (
        <AggregateReportGenerationPanel
          report={aggregateReportTarget}
          onClose={() => setAggregateReportTarget(null)}
        />
      )}

      {/* v0.126.16: New Periodic Report Modal */}
      {showNewReportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-red/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-red" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">New Periodic Report</h2>
                  <p className="text-xs text-text-muted">ICH E2C / ICH E2F compliant</p>
                </div>
              </div>
              <button onClick={() => setShowNewReportModal(false)} className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Report Type</label>
                <select
                  value={newReportForm.type}
                  onChange={e => setNewReportForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                >
                  <option>PBRER</option>
                  <option>PSUR</option>
                  <option>DSUR</option>
                  <option>IND Annual Report</option>
                  <option>NDA Annual Report</option>
                  <option>PADER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Product</label>
                <input
                  value={newReportForm.product}
                  onChange={e => setNewReportForm(f => ({ ...f, product: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  placeholder="e.g. LIG-2847 (Nexavant)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Data Lock Point</label>
                  <input
                    type="date"
                    value={newReportForm.period}
                    onChange={e => setNewReportForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Region</label>
                  <select
                    value={newReportForm.region}
                    onChange={e => setNewReportForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  >
                    <option>Global</option>
                    <option>FDA</option>
                    <option>EMA</option>
                    <option>PMDA</option>
                    <option>Health Canada</option>
                    <option>TGA</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Responsible Officer</label>
                <input
                  value={newReportForm.owner}
                  onChange={e => setNewReportForm(f => ({ ...f, owner: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  placeholder="e.g. Dr. Sarah Chen"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowNewReportModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newReportForm.period) { toast.error('Please set a data lock point date'); return; }
                  toast.success(`${newReportForm.type} initiated for ${newReportForm.product} · ${newReportForm.region} — report added to queue`);
                  setShowNewReportModal(false);
                  setActiveView('reports');
                }}
                className="px-5 py-2 bg-accent-red text-white rounded-lg text-sm font-medium hover:bg-accent-red/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />Initiate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
