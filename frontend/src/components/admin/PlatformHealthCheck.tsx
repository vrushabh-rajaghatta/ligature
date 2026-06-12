
/**
 * PlatformHealthCheck — v0.122.0
 *
 * Admin tool that auto-navigates through every module, waits for render,
 * and reports whether each one crashed an ErrorBoundary.
 *
 * Works in production — uses the global useErrorLogStore which the
 * ErrorBoundary writes to on every catch.
 *
 * Usage: Admin screen → Health Check tab → Run Full Scan
 */

import { useState, useCallback, useRef } from 'react';
import {
  Play, CheckCircle2, XCircle, Clock, AlertTriangle,
  RotateCcw, Download, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useErrorLogStore } from '@/store/useErrorLogStore';
import { ModuleId } from '@/types/core';

// ── All modules to test ───────────────────────────────────────────────────────
const ALL_MODULES: { id: ModuleId; label: string; section: string }[] = [
  // Platform
  { id: 'home',                label: 'Home',                 section: 'Platform' },
  { id: 'action-center',       label: 'My Tasks',             section: 'Platform' },
  { id: 'rd-connected',        label: 'R&D Connected',        section: 'Platform' },
  { id: 'agent-hub',           label: 'Agent Hub',            section: 'Platform' },
  // Research
  { id: 'research',            label: 'Research Overview',    section: 'Research' },
  { id: 'research-lead-opt',   label: 'Lead Optimisation',    section: 'Research' },
  { id: 'research-translational', label: 'Translational',     section: 'Research' },
  { id: 'research-targets',    label: 'Targets',              section: 'Research' },
  { id: 'research-preclinical',label: 'Preclinical',          section: 'Research' },
  { id: 'research-ind',        label: 'IND Readiness',        section: 'Research' },
  { id: 'research-literature', label: 'Literature',           section: 'Research' },
  { id: 'research-intelligence',label: 'Intelligence',        section: 'Research' },
  { id: 'eln',                 label: 'ELN',                  section: 'Research' },
  // Clinical Development
  { id: 'portfolio',           label: 'Portfolio',            section: 'Clinical' },
  { id: 'study-design',        label: 'Study Design',         section: 'Clinical' },
  { id: 'study-startup',       label: 'Study Startup',        section: 'Clinical' },
  { id: 'ctms',                label: 'Clinical Trials',      section: 'Clinical' },
  { id: 'biostats',            label: 'Biostatistics',        section: 'Clinical' },
  { id: 'tmf',                 label: 'Trial Master File',    section: 'Clinical' },
  { id: 'study-intel',         label: 'Study Intelligence',   section: 'Clinical' },
  // CMC
  { id: 'cmc',                 label: 'Chemistry & Mfg',      section: 'CMC' },
  { id: 'stability',           label: 'Stability',            section: 'CMC' },
  { id: 'batch-records',       label: 'Batch Records',        section: 'CMC' },
  // Regulatory
  { id: 'authoring',           label: 'Authoring',            section: 'Regulatory' },
  { id: 'document-control',    label: 'Document Control',     section: 'Regulatory' },
  { id: 'template-registry',   label: 'Template Registry',    section: 'Regulatory' },
  { id: 'submission-command',  label: 'Command Center',       section: 'Regulatory' },
  { id: 'submissions-hub',     label: 'Submissions Hub',      section: 'Regulatory' },
  { id: 'submission-planning', label: 'Submission Planning',  section: 'Regulatory' },
  { id: 'publishing',          label: 'Publishing',           section: 'Regulatory' },
  { id: 'continuous-submission',label: 'Continuous Sub',      section: 'Regulatory' },
  { id: 'haq',                 label: 'HAQ Management',       section: 'Regulatory' },
  { id: 'ectd-intelligence',   label: 'eCTD Intelligence',    section: 'Regulatory' },
  { id: 'reg-intel',           label: 'Reg Intelligence',     section: 'Regulatory' },
  { id: 'labeling',            label: 'Labeling',             section: 'Regulatory' },
  { id: 'spl',                 label: 'SPL',                  section: 'Regulatory' },
  { id: 'strategy',            label: 'Strategy & Planning',  section: 'Regulatory' },
  { id: 'reg-calendar',        label: 'Reg Calendar',         section: 'Regulatory' },
  { id: 'master-data',         label: 'Master Data & IDMP',   section: 'Regulatory' },
  // PV / Safety
  { id: 'safety',              label: 'Pharmacovigilance',    section: 'PV/Safety' },
  { id: 'signal-detection',    label: 'Signal Detection',     section: 'PV/Safety' },
  { id: 'psmf',                label: 'PSMF',                 section: 'PV/Safety' },
  // Quality
  { id: 'qms',                 label: 'QMS',                  section: 'Quality' },
  { id: 'glp',                 label: 'GLP Compliance',       section: 'Quality' },
  { id: 'gcp',                 label: 'GCP Compliance',       section: 'Quality' },
  { id: 'gmp',                 label: 'GMP Compliance',       section: 'Quality' },
  { id: 'inspector-readiness', label: 'Inspector Readiness',  section: 'Quality' },
  { id: 'archives',            label: 'R&D Archives',         section: 'Quality' },
  // Commercial
  { id: 'commercial',          label: 'Launch & Market Access',section: 'Commercial' },
  { id: 'adpromo',             label: 'Ad/Promo Review',      section: 'Commercial' },
  { id: 'supply-chain',        label: 'Supply Chain',         section: 'Commercial' },
  { id: 'medical-affairs',     label: 'Medical Affairs',      section: 'Commercial' },
  // Intel
  { id: 'ai-authoring',        label: 'AI Authoring',         section: 'Intel' },
  { id: 'ai-consistency',      label: 'Consistency Engine',   section: 'Intel' },
  { id: 'analytics',           label: 'Analytics',            section: 'Intel' },
];

type ModuleStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';

interface ModuleResult {
  id: ModuleId;
  label: string;
  section: string;
  status: ModuleStatus;
  errorMessage?: string;
  durationMs?: number;
}

const DWELL_MS = 1200; // ms to wait on each module before checking for errors

// ─────────────────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ModuleStatus }) {
  if (status === 'pass')    return <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />;
  if (status === 'fail')    return <XCircle      className="w-4 h-4 text-accent-red   flex-shrink-0" />;
  if (status === 'running') return <Loader2      className="w-4 h-4 text-accent-blue  flex-shrink-0 animate-spin" />;
  if (status === 'skipped') return <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />;
  return                           <Clock        className="w-4 h-4 text-text-muted   flex-shrink-0" />;
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, string> = {
    pending: 'bg-surface text-text-muted',
    running: 'bg-accent-blue/10 text-accent-blue',
    pass:    'bg-accent-green/10 text-accent-green',
    fail:    'bg-accent-red/10 text-accent-red',
    skipped: 'bg-accent-amber/10 text-accent-amber',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${map[status]}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function PlatformHealthCheck() {
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const errorLogEntries = useErrorLogStore(s => s.entries);
  const clearErrorLog   = useErrorLogStore(s => s.clear);

  const [results, setResults]         = useState<ModuleResult[]>([]);
  const [running, setRunning]         = useState(false);
  const [currentIdx, setCurrentIdx]   = useState<number | null>(null);
  const [expandedFails, setExpandedFails] = useState<Set<ModuleId>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Platform', 'Research', 'Clinical', 'CMC', 'Regulatory', 'PV/Safety', 'Quality', 'Commercial', 'Intel'])
  );
  const abortRef = useRef(false);

  const toggleSection = (s: string) =>
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });

  const toggleFail = (id: ModuleId) =>
    setExpandedFails(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const runScan = useCallback(async () => {
    abortRef.current = false;
    clearErrorLog();

    const initial: ModuleResult[] = ALL_MODULES.map(m => ({
      ...m,
      status: 'pending',
    }));
    setResults(initial);
    setRunning(true);
    setCurrentIdx(0);

    for (let i = 0; i < ALL_MODULES.length; i++) {
      if (abortRef.current) break;

      const mod = ALL_MODULES[i];
      setCurrentIdx(i);

      // Mark as running
      setResults(prev =>
        prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r)
      );

      // Note errors before navigating
      const errorsBefore = useErrorLogStore.getState().entries.length;
      const t0 = Date.now();

      // Navigate to the module
      setActiveModule(mod.id);

      // Wait for render + possible async effects
      await new Promise(r => setTimeout(r, DWELL_MS));

      // Check if ErrorBoundary fired during this module visit
      const errorsAfter = useErrorLogStore.getState().entries.length;
      const newErrors = useErrorLogStore.getState().entries.slice(0, errorsAfter - errorsBefore);
      const moduleError = newErrors.find(e => e.moduleName === mod.label || e.moduleName.toLowerCase().includes(mod.label.toLowerCase().split(' ')[0]));

      const durationMs = Date.now() - t0;

      setResults(prev =>
        prev.map((r, idx) =>
          idx === i
            ? {
                ...r,
                status: moduleError ? 'fail' : 'pass',
                errorMessage: moduleError?.message,
                durationMs,
              }
            : r
        )
      );
    }

    setRunning(false);
    setCurrentIdx(null);
    // Return to admin
    setActiveModule('admin');
  }, [clearErrorLog, setActiveModule]);

  const stopScan = () => {
    abortRef.current = true;
  };

  const downloadReport = () => {
    const lines = [
      `Ligature Platform Health Check — ${new Date().toISOString()}`,
      `Total: ${results.length}  Pass: ${results.filter(r => r.status === 'pass').length}  Fail: ${results.filter(r => r.status === 'fail').length}`,
      '',
      'MODULE,SECTION,STATUS,DURATION_MS,ERROR',
      ...results.map(r =>
        [r.id, r.section, r.status, r.durationMs ?? '', (r.errorMessage ?? '').replace(/,/g, ';')].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ligature-health-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passed  = results.filter(r => r.status === 'pass').length;
  const failed  = results.filter(r => r.status === 'fail').length;
  const pending = results.filter(r => r.status === 'pending').length;
  const hasRun  = results.length > 0;

  // Group results by section
  const sections = Array.from(new Set(ALL_MODULES.map(m => m.section)));

  return (
    <div className="space-y-6">
      {/* Header / controls */}
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text-primary">Platform Health Check</h3>
            <p className="text-sm text-text-muted mt-0.5">
              Automatically navigates all {ALL_MODULES.length} modules and detects ErrorBoundary crashes.
              Takes ~{Math.round((ALL_MODULES.length * DWELL_MS) / 1000 / 60)} minutes.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasRun && !running && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            {running ? (
              <button
                onClick={stopScan}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-red/10 text-accent-red border border-accent-red/20 rounded-lg hover:bg-accent-red/20 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={runScan}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
              >
                <Play className="w-4 h-4" />
                {hasRun ? 'Re-run Scan' : 'Run Full Scan'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {running && currentIdx !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>Testing: <span className="text-text-primary font-medium">{ALL_MODULES[currentIdx]?.label}</span></span>
              <span>{currentIdx + 1} / {ALL_MODULES.length}</span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / ALL_MODULES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary stats */}
        {hasRun && !running && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
              <span className="font-semibold text-accent-green">{passed}</span>
              <span className="text-text-muted">passed</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <XCircle className="w-4 h-4 text-accent-red" />
              <span className="font-semibold text-accent-red">{failed}</span>
              <span className="text-text-muted">failed</span>
            </div>
            {pending > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="text-text-muted">{pending} not run</span>
              </div>
            )}
            <div className="ml-auto">
              {failed === 0 ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-accent-green/10 text-accent-green">
                  ✓ All clear
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-accent-red/10 text-accent-red">
                  {failed} module{failed !== 1 ? 's' : ''} need attention
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results by section */}
      {hasRun && (
        <div className="space-y-2">
          {sections.map(section => {
            const sectionResults = results.filter(r => r.section === section);
            const sectionFails = sectionResults.filter(r => r.status === 'fail').length;
            const isOpen = expandedSections.has(section);

            return (
              <div key={section} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-card hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-text-primary text-sm">{section}</span>
                    {sectionFails > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red">
                        {sectionFails} failing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {sectionResults.filter(r => r.status === 'pass').length}/{sectionResults.length} passed
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-border">
                    {sectionResults.map(result => (
                      <div key={result.id}>
                        <div
                          className={`flex items-center gap-3 px-4 py-2.5 ${result.status === 'fail' ? 'bg-accent-red/4' : ''}`}
                        >
                          <StatusIcon status={result.status} />
                          <span className="flex-1 text-sm text-text-primary">{result.label}</span>
                          <span className="text-xs text-text-muted font-mono">{result.id}</span>
                          {result.durationMs && (
                            <span className="text-xs text-text-muted">{result.durationMs}ms</span>
                          )}
                          <StatusBadge status={result.status} />
                          {result.status === 'fail' && (
                            <button
                              onClick={() => toggleFail(result.id)}
                              className="p-1 hover:bg-surface-card rounded"
                            >
                              {expandedFails.has(result.id)
                                ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                                : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                              }
                            </button>
                          )}
                        </div>
                        {result.status === 'fail' && expandedFails.has(result.id) && result.errorMessage && (
                          <div className="px-4 pb-3 pt-1 bg-accent-red/4">
                            <p className="text-xs font-mono text-accent-red break-all bg-accent-red/8 rounded p-2">
                              {result.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live error log */}
      {errorLogEntries.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-surface-card border-b border-border flex items-center justify-between">
            <span className="font-medium text-text-primary text-sm">Live Error Log</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{errorLogEntries.length} entries</span>
              <button
                onClick={clearErrorLog}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {errorLogEntries.map(entry => (
              <div key={entry.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-accent-red">{entry.moduleName}</span>
                  <span className="text-xs text-text-muted">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs font-mono text-text-primary break-all">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
