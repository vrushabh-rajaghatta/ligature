
import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Table2,
  Search,
  GitCompare,
  Settings,
  Play,
  RefreshCw,
  FileText,
  Database,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  Eye,
  Download,
  Filter,
  BarChart3,
  PieChart,
  ArrowRight,
  Zap,
  Brain,
  FileCheck,
  Scale,
  BookOpen,
  Target,
  Shield,
  Pill,
  ExternalLink,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// AI CONSISTENCY ENGINE DASHBOARD
// Enhanced AI capabilities for cross-document consistency, table generation,
// regulatory precedent search, and comparative language extraction
// ============================================================================

type ViewMode = 'dashboard' | 'consistency' | 'tables' | 'precedents' | 'comparative';

interface ConsistencyCheckSummary {
  id: string;
  name: string;
  category: string;
  lastRun: string;
  status: 'passed' | 'passed-with-warnings' | 'failed';
  issuesCount: number;
  criticalCount: number;
}

interface GeneratedTableSummary {
  id: string;
  title: string;
  tableNumber: string;
  type: 'table' | 'figure' | 'listing';
  generatedAt: string;
  rowCount: number;
  sourceData: string;
}

interface PrecedentSearchSummary {
  id: string;
  query: string;
  queryType: string;
  searchedAt: string;
  matchCount: number;
  topMatch: string;
}

interface ComparativeAnalysisSummary {
  id: string;
  name: string;
  sourceProduct: string;
  comparators: string[];
  analyzedAt: string;
  similarityScore: number;
  recommendations: number;
}

// Mock data
const mockConsistencyChecks: ConsistencyCheckSummary[] = [
  {
    id: 'cc-1',
    name: 'Product Name Consistency',
    category: 'Product Identity',
    lastRun: '2025-12-31T10:30:00Z',
    status: 'passed',
    issuesCount: 0,
    criticalCount: 0,
  },
  {
    id: 'cc-2',
    name: 'Active Ingredient Alignment',
    category: 'Substance Data',
    lastRun: '2025-12-31T10:30:00Z',
    status: 'passed-with-warnings',
    issuesCount: 2,
    criticalCount: 0,
  },
  {
    id: 'cc-3',
    name: 'Dosing Information Match',
    category: 'Dosing Information',
    lastRun: '2025-12-31T10:30:00Z',
    status: 'failed',
    issuesCount: 5,
    criticalCount: 2,
  },
  {
    id: 'cc-4',
    name: 'Safety Language Consistency',
    category: 'Safety Language',
    lastRun: '2025-12-31T10:25:00Z',
    status: 'passed',
    issuesCount: 0,
    criticalCount: 0,
  },
  {
    id: 'cc-5',
    name: 'Clinical Data Precision',
    category: 'Numerical Precision',
    lastRun: '2025-12-31T10:25:00Z',
    status: 'passed-with-warnings',
    issuesCount: 1,
    criticalCount: 0,
  },
];

const mockGeneratedTables: GeneratedTableSummary[] = [
  {
    id: 'gt-1',
    title: 'Table 14.1 - Summary of Primary Efficacy Endpoints',
    tableNumber: '14.1',
    type: 'table',
    generatedAt: '2025-12-31T09:00:00Z',
    rowCount: 24,
    sourceData: 'Clinical Study LIG-301',
  },
  {
    id: 'gt-2',
    title: 'Figure 14.2 - Kaplan-Meier Survival Curve',
    tableNumber: '14.2',
    type: 'figure',
    generatedAt: '2025-12-31T08:45:00Z',
    rowCount: 0,
    sourceData: 'Clinical Study LIG-301',
  },
  {
    id: 'gt-3',
    title: 'Table 12.1 - Active and Inactive Ingredients',
    tableNumber: '12.1',
    type: 'table',
    generatedAt: '2025-12-30T14:20:00Z',
    rowCount: 8,
    sourceData: 'IDMP Product Data',
  },
];

const mockPrecedentSearches: PrecedentSearchSummary[] = [
  {
    id: 'ps-1',
    query: 'EGFR inhibitor indication language for NSCLC',
    queryType: 'Indication Language',
    searchedAt: '2025-12-31T11:00:00Z',
    matchCount: 47,
    topMatch: 'TAGRISSO (osimertinib)',
  },
  {
    id: 'ps-2',
    query: 'Hepatotoxicity warning language',
    queryType: 'Warning Language',
    searchedAt: '2025-12-30T16:30:00Z',
    matchCount: 128,
    topMatch: 'AVASTIN (bevacizumab)',
  },
  {
    id: 'ps-3',
    query: 'QTc prolongation contraindication',
    queryType: 'Contraindication',
    searchedAt: '2025-12-30T14:15:00Z',
    matchCount: 89,
    topMatch: 'ZOFRAN (ondansetron)',
  },
];

const mockComparativeAnalyses: ComparativeAnalysisSummary[] = [
  {
    id: 'ca-1',
    name: 'EGFR Inhibitor Comparative Analysis',
    sourceProduct: 'Nexavant (ligrastinib)',
    comparators: ['TAGRISSO', 'IRESSA', 'GILOTRIF'],
    analyzedAt: '2025-12-31T10:00:00Z',
    similarityScore: 0.78,
    recommendations: 12,
  },
  {
    id: 'ca-2',
    name: 'Immuno-Oncology Comparative Analysis',
    sourceProduct: 'Nexavant (ligrastinib)',
    comparators: ['KEYTRUDA', 'OPDIVO'],
    analyzedAt: '2025-12-29T15:30:00Z',
    similarityScore: 0.42,
    recommendations: 8,
  },
];

export default function AIConsistencyEngineDashboard() {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);

  const handleRunAllChecks = () => {
    setIsRunningChecks(true);
    setTimeout(() => setIsRunningChecks(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'passed-with-warnings':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Passed
          </span>
        );
      case 'passed-with-warnings':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Warnings
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate summary stats
  const passedChecks = mockConsistencyChecks.filter(c => c.status === 'passed').length;
  const warningChecks = mockConsistencyChecks.filter(c => c.status === 'passed-with-warnings').length;
  const failedChecks = mockConsistencyChecks.filter(c => c.status === 'failed').length;
  const totalIssues = mockConsistencyChecks.reduce((sum, c) => sum + c.issuesCount, 0);
  const criticalIssues = mockConsistencyChecks.reduce((sum, c) => sum + c.criticalCount, 0);
  const consistencyScore = Math.round(((passedChecks + warningChecks * 0.5) / mockConsistencyChecks.length) * 100);

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-4 md:space-y-6">
        <ScreenHeader
          title="AI Consistency Engine"
          subtitle="Cross-document consistency, table generation, precedent search, and comparative analysis"
          icon={<Brain className="w-5 h-5" />}
          actions={
            <button
              onClick={handleRunAllChecks}
              disabled={isRunningChecks}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isRunningChecks ? (<><RefreshCw className="w-4 h-4 animate-spin" />Running...</>) : (<><Play className="w-4 h-4" />Run All Checks</>)}
            </button>
          }
        />


        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'consistency', label: 'Consistency Checks', icon: FileCheck },
            { id: 'tables', label: 'Table Generation', icon: Table2 },
            { id: 'precedents', label: 'Precedent Search', icon: Search },
            { id: 'comparative', label: 'Comparative Analysis', icon: Scale },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeView === tab.id
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeView === 'dashboard' && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-muted text-sm">Consistency Score</span>
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Target className="w-4 h-4 text-violet-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text-primary">{consistencyScore}%</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +5%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    style={{ width: `${consistencyScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-muted text-sm">Check Status</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text-primary">{passedChecks}/{mockConsistencyChecks.length}</span>
                  <span className="text-xs text-text-muted">passed</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {mockConsistencyChecks.map((check, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${
                        check.status === 'passed'
                          ? 'bg-emerald-500'
                          : check.status === 'passed-with-warnings'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-muted text-sm">Issues Found</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text-primary">{totalIssues}</span>
                  <span className="text-xs text-red-400">{criticalIssues} critical</span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  {warningChecks} checks with warnings
                </p>
              </div>

              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-muted text-sm">Generated Content</span>
                  <div className="p-1.5 rounded-lg bg-cyan-500/10">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text-primary">{mockGeneratedTables.length}</span>
                  <span className="text-xs text-text-muted">tables/figures</span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  {mockPrecedentSearches.length} searches • {mockComparativeAnalyses.length} analyses
                </p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Consistency Checks Section */}
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-violet-400" />
                    <h2 className="font-semibold text-text-primary">Recent Consistency Checks</h2>
                  </div>
                  <button
                    onClick={() => setActiveView('consistency')}
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {mockConsistencyChecks.slice(0, 4).map((check) => (
                    <div key={check.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <h3 className="font-medium text-text-primary">{check.name}</h3>
                            <p className="text-xs text-text-muted">{check.category}</p>
                          </div>
                        </div>
                        {getStatusBadge(check.status)}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted ml-8">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(check.lastRun)}
                        </span>
                        {check.issuesCount > 0 && (
                          <span className="text-amber-400">
                            {check.issuesCount} issue{check.issuesCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Tables Section */}
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-text-primary">Generated Tables & Figures</h2>
                  </div>
                  <button
                    onClick={() => setActiveView('tables')}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {mockGeneratedTables.map((table) => (
                    <div key={table.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {table.type === 'figure' ? (
                            <PieChart className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Table2 className="w-5 h-5 text-cyan-400" />
                          )}
                          <div>
                            <h3 className="font-medium text-text-primary text-sm">{table.title}</h3>
                            <button
                              onClick={() => useAppStore.getState().setActiveModule(table.sourceData.includes('IDMP') ? 'master-data' : 'ctms')}
                              className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                            >
                              Source: {table.sourceData} <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors" onClick={() => toast.info('Document preview — select a document from the list to render it in the viewer panel')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors" onClick={() => { const b=new Blob(['Consistency Report\n'+new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='consistency-report.txt'; a.click(); toast.success('Report downloaded'); }}>
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted ml-8">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(table.generatedAt)}
                        </span>
                        {table.rowCount > 0 && <span>{table.rowCount} rows</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Precedent Search Section */}
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-amber-400" />
                    <h2 className="font-semibold text-text-primary">Regulatory Precedent Searches</h2>
                  </div>
                  <button
                    onClick={() => setActiveView('precedents')}
                    className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {mockPrecedentSearches.map((search) => (
                    <div key={search.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <BookOpen className="w-5 h-5 text-amber-400" />
                          <div>
                            <h3 className="font-medium text-text-primary text-sm">{search.query}</h3>
                            <p className="text-xs text-text-muted">{search.queryType}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {search.matchCount} matches
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted ml-8">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(search.searchedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Pill className="w-3 h-3" />
                          Top: {search.topMatch}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparative Analysis Section */}
              <div className="bg-surface-card border border-border rounded-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-text-primary">Comparative Analyses</h2>
                  </div>
                  <button
                    onClick={() => setActiveView('comparative')}
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {mockComparativeAnalyses.map((analysis) => (
                    <div key={analysis.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <GitCompare className="w-5 h-5 text-emerald-400" />
                          <div>
                            <h3 className="font-medium text-text-primary text-sm">{analysis.sourceProduct}</h3>
                            <p className="text-xs text-text-muted">
                              vs. {analysis.comparators.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-text-primary">
                            {Math.round(analysis.similarityScore * 100)}% similar
                          </div>
                          <div className="text-xs text-emerald-400">
                            {analysis.recommendations} recommendations
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted ml-8">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(analysis.analyzedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Capabilities Card */}
            <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 border border-violet-500/30 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-violet-400" />
                    <h2 className="font-semibold text-text-primary">AI-Powered Capabilities</h2>
                  </div>
                  <p className="text-sm text-text-muted max-w-2xl">
                    The AI Consistency Engine leverages IDMP data models and SPL content to provide
                    intelligent cross-document analysis, automatic content generation, and regulatory
                    precedent insights. Powered by Claude for semantic understanding and pattern recognition.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center gap-2" onClick={() => toast.success('New consistency analysis created — configure document scope and rule set in the settings panel')}>
                    <Sparkles className="w-4 h-4" />
                    New Analysis
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-surface-card/50 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCheck className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-text-primary">Consistency</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Cross-document validation using IDMP master data
                  </p>
                </div>
                <div className="bg-surface-card/50 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Table2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-text-primary">Auto-Generation</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Tables and figures from structured data sources
                  </p>
                </div>
                <div className="bg-surface-card/50 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-text-primary">Precedents</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Search approved labeling across therapeutic areas
                  </p>
                </div>
                <div className="bg-surface-card/50 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-text-primary">Comparative</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Language extraction from approved products
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Consistency Checks View */}
        {activeView === 'consistency' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Consistency Checks</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors" onClick={() => toast.info('Filter panel — narrow results by document type, module, or flagged severity')}>
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors" onClick={() => toast.success('Consistency check running on selected documents — results appear below within 30s')}>
                  <Play className="w-4 h-4" />
                  Run Selected
                </button>
              </div>
            </div>

            <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Check</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Issues</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Last Run</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockConsistencyChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-surface-elevated/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <span className="font-medium text-text-primary">{check.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-muted">{check.category}</td>
                      <td className="px-4 py-4">{getStatusBadge(check.status)}</td>
                      <td className="px-4 py-4">
                        {check.issuesCount > 0 ? (
                          <span className="text-amber-400">{check.issuesCount}</span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-text-muted text-sm">{formatDate(check.lastRun)}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors" onClick={() => toast.info('Document preview — select a row to render the full document in the viewer panel')}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Generation View */}
        {activeView === 'tables' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Table & Figure Generation</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors" onClick={() => toast.success('Generating updated consistency template — pulling latest approved language from Document Store')}>
                <Sparkles className="w-4 h-4" />
                Generate New
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {mockGeneratedTables.map((table) => (
                <div key={table.id} className="bg-surface-card border border-border rounded-xl overflow-hidden">
                  <div className="aspect-video bg-surface-elevated flex items-center justify-center border-b border-border">
                    {table.type === 'figure' ? (
                      <PieChart className="w-16 h-16 text-cyan-400/30" />
                    ) : (
                      <Table2 className="w-16 h-16 text-cyan-400/30" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-text-primary text-sm mb-1">{table.title}</h3>
                    <button
                      onClick={() => useAppStore.getState().setActiveModule(table.sourceData.includes('IDMP') ? 'master-data' : 'ctms')}
                      className="text-xs text-accent-blue hover:underline flex items-center gap-1 mb-3"
                    >
                      Source: {table.sourceData} <ExternalLink className="w-3 h-3" />
                    </button>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">{formatDate(table.generatedAt)}</span>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors" onClick={() => toast.info('Document preview — select a row to render the full document in the viewer panel')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors" onClick={() => { const b=new Blob(['Consistency Analysis Export\n'+new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='consistency-export.txt'; a.click(); toast.success('Report downloaded'); }}>
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precedent Search View */}
        {activeView === 'precedents' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Regulatory Precedent Search</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors" onClick={() => toast.info('Enter a term or phrase in the search box above to find all usages across the dossier')}>
                <Search className="w-4 h-4" />
                New Search
              </button>
            </div>

            {/* Search Input */}
            <div className="bg-surface-card border border-border rounded-xl p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search approved labeling language..."
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <select className="px-4 py-2 bg-surface border border-border rounded-lg text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option>All Query Types</option>
                  <option>Indication Language</option>
                  <option>Dosing Regimen</option>
                  <option>Safety Language</option>
                  <option>Warning Language</option>
                </select>
                <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors" onClick={() => toast.success('Searching dossier for term usages — results grouped by module and document')}>
                  Search
                </button>
              </div>
            </div>

            {/* Recent Searches */}
            <div className="bg-surface-card border border-border rounded-xl">
              <div className="p-4 border-b border-border">
                <h3 className="font-medium text-text-primary">Recent Searches</h3>
              </div>
              <div className="divide-y divide-border">
                {mockPrecedentSearches.map((search) => (
                  <div key={search.id} className="p-4 hover:bg-surface-elevated/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-text-primary">{search.query}</h4>
                        <p className="text-sm text-text-muted mt-1">{search.queryType}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {search.matchCount} matches
                        </span>
                        <p className="text-xs text-text-muted mt-1">{formatDate(search.searchedAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-text-muted">Top match:</span>
                      <span className="text-xs text-amber-400">{search.topMatch}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted" />
                      <button className="text-xs text-violet-400 hover:text-violet-300" onClick={() => { setActiveView('consistency'); toast.info('Switching to consistency view for this analysis'); }}>View Results</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comparative Analysis View */}
        {activeView === 'comparative' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Comparative Language Analysis</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors" onClick={() => toast.success('Version comparison created — select two document versions to diff side-by-side')}>
                <GitCompare className="w-4 h-4" />
                New Comparison
              </button>
            </div>

            {/* Analyses */}
            <div className="space-y-4">
              {mockComparativeAnalyses.map((analysis) => (
                <div key={analysis.id} className="bg-surface-card border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-surface-elevated/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h3 className="font-semibold text-text-primary">{analysis.sourceProduct}</h3>
                          <p className="text-sm text-text-muted">
                            Compared against: {analysis.comparators.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-text-primary">
                          {Math.round(analysis.similarityScore * 100)}%
                        </div>
                        <div className="text-xs text-text-muted">similarity</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      <div className="bg-surface rounded-lg p-3">
                        <div className="text-lg font-bold text-emerald-400">{analysis.recommendations}</div>
                        <div className="text-xs text-text-muted">Recommendations</div>
                      </div>
                      <div className="bg-surface rounded-lg p-3">
                        <div className="text-lg font-bold text-text-primary">{analysis.comparators.length}</div>
                        <div className="text-xs text-text-muted">Comparators</div>
                      </div>
                      <div className="bg-surface rounded-lg p-3">
                        <div className="text-lg font-bold text-text-primary text-sm">{formatDate(analysis.analyzedAt)}</div>
                        <div className="text-xs text-text-muted">Analyzed</div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button className="px-3 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors flex items-center gap-1"
                        onClick={() => { setActiveView('consistency'); toast.info(`Opening consistency report: ${analysis.name}`); }}>
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button className="px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1"
                        onClick={() => toast.success(`Exporting consistency report: ${analysis.name}…`)}>
                        <Download className="w-4 h-4" />
                        Export Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
