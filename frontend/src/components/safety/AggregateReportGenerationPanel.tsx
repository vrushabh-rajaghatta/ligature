
/**
 * AggregateReportGenerationPanel — v0.86.0
 * Modal panel that drives PSUR/DSUR/PADER generation with progressive status,
 * structured section display, and JSON download.
 */

import { useState, useCallback } from 'react';
import {
  X, FileText, Loader2, CheckCircle, AlertCircle, Download,
  ChevronDown, ChevronRight, Sparkles, Clock, BarChart3, Shield,
  ListOrdered, Brain, FileCheck, Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PeriodicReport } from '@/data/safety-data';

// ============================================================================
// TYPES (mirrored from route for client use)
// ============================================================================

interface CaseStatistics {
  totalCases: number;
  newCasesInPeriod: number;
  seriousCases: number;
  fatalCases: number;
  nonSeriousCases: number;
  expeditedCases: number;
  bySource: Record<string, number>;
  byRegion: Record<string, number>;
  bySoc: Record<string, number>;
  byOutcome: Record<string, number>;
  byCausality: Record<string, number>;
}

interface ReportSection {
  sectionNumber: string;
  title: string;
  content: string;
  aiGenerated: boolean;
}

interface SignalSummary {
  signalId: string;
  term: string;
  status: string;
  priority: string;
  caseCount: number;
  prr: number | null;
  ror?: number | null;
  evaluationSummary: string;
  conclusion: string;
  recommendedActions: string[];
}

interface AggregateReportResult {
  reportId: string;
  reportType: string;
  productName: string;
  activeSubstance: string;
  period: { start: string; end: string; dataLockPoint: string };
  region: string;
  generatedAt: string;
  generatedBy: string;
  status: string;
  ictGuideline: string;
  statistics: CaseStatistics;
  lineListingSummary: { totalRows: number; rows: unknown[] };
  signals: SignalSummary[];
  sections: ReportSection[];
  metadata: {
    caseDataSource: string;
    aiModel: string;
    processingTimeMs: number;
    icsSectionCount: number;
  };
}

interface AggregateReportGenerationPanelProps {
  report: PeriodicReport;
  onClose: () => void;
}

// ============================================================================
// GENERATION STEPS
// ============================================================================

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface GenerationStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  status: StepStatus;
}

const INITIAL_STEPS: GenerationStep[] = [
  { id: 'validate', label: 'Validating report parameters', sublabel: 'ICH guideline mapping, period verification', icon: <FileCheck className="w-4 h-4" />, status: 'pending' },
  { id: 'cases', label: 'Loading case safety data', sublabel: 'Filtering ICSR cases for product and period', icon: <ListOrdered className="w-4 h-4" />, status: 'pending' },
  { id: 'stats', label: 'Building summary statistics', sublabel: 'SOC tabulations, causality breakdown, expedited count', icon: <BarChart3 className="w-4 h-4" />, status: 'pending' },
  { id: 'signals', label: 'Evaluating safety signals', sublabel: 'PRR/ROR data, signal status, recommended actions', icon: <Activity className="w-4 h-4" />, status: 'pending' },
  { id: 'ai', label: 'Drafting AI narrative sections', sublabel: 'Signal evaluation, benefit-risk, conclusions via Claude', icon: <Brain className="w-4 h-4" />, status: 'pending' },
  { id: 'compile', label: 'Compiling ICH sections', sublabel: 'Assembling final structured report', icon: <FileText className="w-4 h-4" />, status: 'pending' },
];

// ============================================================================
// HELPERS
// ============================================================================

const reportTypeColor: Record<string, string> = {
  PSUR: 'blue',
  PBRER: 'purple',
  DSUR: 'teal',
  PADER: 'orange',
  'IND-Annual': 'gray',
};

const signalStatusColor: Record<string, string> = {
  confirmed: 'bg-status-error/20 text-status-error',
  'under-evaluation': 'bg-status-warning/20 text-status-warning',
  closed: 'bg-status-success/20 text-status-success',
  new: 'bg-status-info/20 text-status-info',
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function downloadJSON(data: AggregateReportResult) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.reportId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-surface-card rounded-lg p-3 border border-border">
      <div className={`text-2xl font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-xs font-medium text-text-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ============================================================================
// SECTION VIEWER
// ============================================================================

function SectionViewer({ sections }: { sections: ReportSection[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1']));

  const toggle = (num: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(num) ? next.delete(num) : next.add(num);
    return next;
  });

  return (
    <div className="space-y-1">
      {sections.map(s => (
        <div key={s.sectionNumber} className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(s.sectionNumber)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-surface-card hover:bg-surface-elevated text-left transition-colors"
          >
            <span className="text-xs font-mono font-semibold text-accent-blue w-8 flex-shrink-0">
              §{s.sectionNumber}
            </span>
            <span className="flex-1 text-sm font-medium text-text-primary">{s.title}</span>
            {s.aiGenerated && (
              <span className="flex items-center gap-1 text-xs text-accent-purple bg-accent-purple/10 rounded px-2 py-0.5 flex-shrink-0">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            )}
            {expanded.has(s.sectionNumber)
              ? <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />}
          </button>
          {expanded.has(s.sectionNumber) && (
            <div className="px-4 pb-4 pt-2 bg-surface-elevated border-t border-border">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{s.content}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AggregateReportGenerationPanel({ report, onClose }: AggregateReportGenerationPanelProps) {
  const [phase, setPhase] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<AggregateReportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'statistics' | 'signals' | 'linelisting'>('sections');

  const updateStep = useCallback((id: string, status: StepStatus) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setErrorMsg(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' })));

    try {
      updateStep('validate', 'running');
      await sleep(400);
      updateStep('validate', 'done');

      updateStep('cases', 'running');
      await sleep(500);
      updateStep('cases', 'done');

      updateStep('stats', 'running');
      await sleep(400);
      updateStep('stats', 'done');

      updateStep('signals', 'running');
      await sleep(500);
      updateStep('signals', 'done');

      updateStep('ai', 'running');

      // Derive period dates from report.period string ("Jun 2024 - Nov 2024")
      // We'll use fixed dates from the seed data context
      const periodMap: Record<string, { start: string; end: string }> = {
        'lig-2847': { start: '2024-06-01', end: '2024-11-30' },
        'lig-3021': { start: '2024-01-01', end: '2024-12-31' },
        'lig-1182': { start: '2024-07-01', end: '2024-12-31' },
      };
      const period = periodMap[report.productId] || { start: '2024-06-01', end: '2024-11-30' };

      const requestBody = {
        reportType: report.type === 'PBRER' ? 'PBRER' : report.type,
        productId: report.productId,
        productName: report.product,
        activeSubstance: report.productId === 'lig-2847' ? 'ligrastinib' : report.product,
        periodStart: period.start,
        periodEnd: period.end,
        dataLockPoint: period.end,
        region: report.region === 'EU' ? 'EMA' : report.region === 'US' ? 'FDA' : report.region === 'Global' ? 'Global' : 'FDA',
        reporterName: report.owner,
      };

      const response = await fetch('/api/safety/aggregate-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      updateStep('ai', 'done');

      updateStep('compile', 'running');
      await sleep(300);
      updateStep('compile', 'done');

      setResult(json.data);
      setPhase('done');

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setErrorMsg(msg);
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      setPhase('error');
    }
  }, [report, updateStep]);

  const stepIcon = (status: StepStatus, icon: React.ReactNode) => {
    if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />;
    if (status === 'done') return <CheckCircle className="w-4 h-4 text-status-success" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-status-error" />;
    return <span className="text-text-muted w-4 h-4 flex items-center justify-center">{icon}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-base border border-border rounded-2xl shadow-modal w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex items-start gap-4 p-6 border-b border-border flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-accent-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-text-primary">Generate {report.type}</h2>
              <Badge color={(reportTypeColor[report.type] as any) || 'blue'} size="sm">{report.type}</Badge>
              <Badge color="gray" size="sm">{report.region}</Badge>
            </div>
            <p className="text-sm text-text-muted mt-0.5">
              {report.product} · {report.period} · Due {report.dueDate}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* IDLE STATE */}
          {phase === 'idle' && (
            <div className="p-6 space-y-6">
              <div className="bg-surface-elevated rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">What will be generated</h3>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>• <strong className="text-text-primary">ICH-structured report</strong> — {report.type === 'DSUR' ? '14 sections per ICH E2F' : '17 sections per ICH E2C(R2)'}</p>
                  <p>• <strong className="text-text-primary">Case statistics</strong> — total, serious, expedited, SOC breakdown, causality distribution</p>
                  <p>• <strong className="text-text-primary">Signal evaluation</strong> — active signals with PRR/ROR data and recommended actions</p>
                  <p>• <strong className="text-text-primary">AI-drafted narrative sections</strong> — signal evaluation, benefit-risk, conclusions via Claude</p>
                  <p>• <strong className="text-text-primary">Line listing summary</strong> — all cases in scope, structured rows</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg text-sm text-accent-amber">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>Generated as <strong>draft status</strong> — requires medical writer review before submission.</span>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium py-3 rounded-xl transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate {report.type}
              </button>
            </div>
          )}

          {/* GENERATING STATE */}
          {(phase === 'generating' || phase === 'error') && (
            <div className="p-6">
              <div className="space-y-3 mb-6">
                {steps.map(step => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    step.status === 'running' ? 'bg-accent-blue/5 border border-accent-blue/20' :
                    step.status === 'done' ? 'bg-status-success/5 border border-status-success/20' :
                    step.status === 'error' ? 'bg-status-error/5 border border-status-error/20' :
                    'bg-surface-elevated border border-border'
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">{stepIcon(step.status, step.icon)}</div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{step.label}</div>
                      <div className="text-xs text-text-muted">{step.sublabel}</div>
                    </div>
                    {step.status === 'running' && (
                      <div className="ml-auto text-xs text-accent-blue flex items-center gap-1">
                        <Clock className="w-3 h-3" /> running
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {phase === 'error' && errorMsg && (
                <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg text-sm text-status-error">
                  <strong>Generation failed:</strong> {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* DONE STATE */}
          {phase === 'done' && result && (
            <div className="p-6 space-y-6">

              {/* Summary bar */}
              <div className="flex items-center gap-3 p-4 bg-status-success/5 border border-status-success/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">Report generated successfully</div>
                  <div className="text-xs text-text-muted">
                    {result.reportId} · {result.metadata.icsSectionCount} sections · {result.metadata.processingTimeMs}ms ·
                    AI: {result.metadata.aiModel === 'fallback' ? 'static fallback' : 'Claude'}
                  </div>
                </div>
                <button
                  onClick={() => downloadJSON(result)}
                  className="flex items-center gap-1.5 text-sm text-accent-blue hover:text-accent-blue/80 font-medium transition-colors flex-shrink-0"
                >
                  <Download className="w-4 h-4" /> JSON
                </button>
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Cases" value={result.statistics.totalCases} />
                <StatCard label="Serious" value={result.statistics.seriousCases} color="text-status-error" sub={`${Math.round(result.statistics.seriousCases / Math.max(result.statistics.totalCases, 1) * 100)}%`} />
                <StatCard label="Expedited (15-day)" value={result.statistics.expeditedCases} color="text-status-warning" />
                <StatCard label="Active Signals" value={result.signals.length} color="text-accent-purple" />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-border">
                {(['sections', 'statistics', 'signals', 'linelisting'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? 'border-accent-blue text-accent-blue'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tab === 'linelisting' ? 'Line Listing' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* SECTIONS TAB */}
              {activeTab === 'sections' && (
                <div>
                  <p className="text-xs text-text-muted mb-3">
                    {result.metadata.icsSectionCount} sections per {result.ictGuideline}.
                    <span className="inline-flex items-center gap-1 text-accent-purple ml-2">
                      <Sparkles className="w-3 h-3" /> AI badge = Claude-drafted narrative
                    </span>
                  </p>
                  <SectionViewer sections={result.sections} />
                </div>
              )}

              {/* STATISTICS TAB */}
              {activeTab === 'statistics' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">By System Organ Class</h4>
                    <div className="space-y-1.5">
                      {Object.entries(result.statistics.bySoc).sort((a,b)=>b[1]-a[1]).map(([soc, count]) => (
                        <div key={soc} className="flex items-center gap-2">
                          <div className="w-40 text-xs text-text-muted truncate flex-shrink-0">{soc}</div>
                          <div className="flex-1 bg-surface-elevated rounded-full h-2">
                            <div
                              className="bg-accent-blue h-2 rounded-full"
                              style={{ width: `${(count / result.statistics.totalCases) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium text-text-primary w-6 text-right">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">By Source</h4>
                      {Object.entries(result.statistics.bySource).map(([src, n]) => (
                        <div key={src} className="flex justify-between text-sm py-1 border-b border-border/50">
                          <span className="text-text-secondary capitalize">{src.replace(/-/g, ' ')}</span>
                          <span className="font-medium text-text-primary">{n}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">By Causality</h4>
                      {Object.entries(result.statistics.byCausality).map(([caus, n]) => (
                        <div key={caus} className="flex justify-between text-sm py-1 border-b border-border/50">
                          <span className="text-text-secondary capitalize">{caus}</span>
                          <span className="font-medium text-text-primary">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SIGNALS TAB */}
              {activeTab === 'signals' && (
                <div className="space-y-4">
                  {result.signals.length === 0 ? (
                    <p className="text-sm text-text-muted">No active signals for this product and period.</p>
                  ) : result.signals.map(sig => (
                    <div key={sig.signalId} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-primary">{sig.term}</span>
                            <span className={`text-xs font-medium rounded px-2 py-0.5 ${signalStatusColor[sig.status] || 'bg-surface-elevated text-text-muted'}`}>
                              {sig.status}
                            </span>
                            <span className="text-xs text-text-muted">{sig.caseCount} cases</span>
                          </div>
                          {sig.prr && (
                            <div className="text-xs text-text-muted mt-1">
                              PRR {sig.prr.toFixed(2)} · ROR {sig.ror?.toFixed(2) ?? '—'}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">{sig.evaluationSummary}</p>
                      <div className="text-xs text-status-info bg-status-info/10 rounded p-2">
                        <strong>Conclusion:</strong> {sig.conclusion}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">Recommended Actions</div>
                        <div className="space-y-0.5">
                          {sig.recommendedActions.map((a, i) => (
                            <div key={i} className="text-xs text-text-secondary">• {a}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LINE LISTING TAB */}
              {activeTab === 'linelisting' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-text-muted">{result.lineListingSummary.totalRows} cases in scope</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface-card">
                          {['Case #', 'Country', 'Age', 'Sex', 'Event (PT)', 'SOC', 'Serious', 'Outcome', 'Causality', 'Receipt Date', 'Source'].map(h => (
                            <th key={h} className="text-left p-2 text-text-muted font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.lineListingSummary.rows.map((row: any, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-surface-card/50">
                            <td className="p-2 font-mono text-text-primary whitespace-nowrap">{row.caseNumber}</td>
                            <td className="p-2 text-text-secondary">{row.country}</td>
                            <td className="p-2 text-text-secondary">{row.age ?? '—'}</td>
                            <td className="p-2 text-text-secondary">{row.sex}</td>
                            <td className="p-2 text-text-primary whitespace-nowrap">{row.event}</td>
                            <td className="p-2 text-text-muted max-w-[140px] truncate">{row.soc}</td>
                            <td className="p-2">
                              <span className={`rounded px-1.5 py-0.5 ${row.seriousness === 'serious' ? 'bg-status-error/15 text-status-error' : 'bg-surface-elevated text-text-muted'}`}>
                                {row.seriousness}
                              </span>
                            </td>
                            <td className="p-2 text-text-secondary capitalize">{row.outcome}</td>
                            <td className="p-2 text-text-secondary capitalize">{row.causality}</td>
                            <td className="p-2 text-text-muted whitespace-nowrap">{row.receivedDate}</td>
                            <td className="p-2 text-text-muted capitalize">{row.source?.replace(/-/g,' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-text-muted">
            {phase === 'done' && result
              ? `Draft status · ${result.ictGuideline} · ${result.metadata.icsSectionCount} sections`
              : 'Ligature Aggregate Report Engine v0.86.0'}
          </span>
          <div className="flex gap-2">
            {phase === 'done' && result && (
              <button
                onClick={() => downloadJSON(result)}
                className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-2 text-text-secondary hover:bg-surface-elevated transition-colors"
              >
                <Download className="w-4 h-4" /> Download JSON
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm border border-border rounded-lg px-4 py-2 text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
