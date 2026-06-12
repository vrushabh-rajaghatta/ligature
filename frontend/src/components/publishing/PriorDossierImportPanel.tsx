
/**
 * PriorDossierImportPanel
 * Rolling submission / amendment workflow.
 *
 * Allows a sponsor to import a prior eCTD sequence's validated dataset
 * inventory, then compute a delta against the current package — flagging
 * unchanged datasets as "carry-forward" (skip re-validation) and changed
 * datasets as "re-validate".
 *
 * Replaces weeks of manual cross-referencing between prior and current
 * dataset inventories. Each carry-forward saves ~45 minutes of biostatistician
 * time per domain.
 *
 * @version 0.126.9
 */

import React, { useState } from 'react';
import {
  Upload, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Clock, ArrowRight, Package, Database, FileCode, Download,
  Zap, ChevronRight, RotateCcw, TrendingUp, Info,
} from 'lucide-react';
import {
  useDataPackageStore,
  DEMO_PRIOR_DOSSIERS,
  type DeltaAction,
  type DatasetDelta,
} from '@/store/useDataPackageStore';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';

// ─── Delta action config ──────────────────────────────────────────────────────

const DELTA_CONFIG: Record<DeltaAction, {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; description: string;
}> = {
  'carry-forward': {
    label: 'Carry Forward', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    description: 'No structural changes detected — reuse prior validated dataset',
  },
  're-validate': {
    label: 'Re-validate', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    description: 'Records or variables changed — full CDISC validation required',
  },
  'new': {
    label: 'New Domain', color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/20',
    icon: <Database className="w-4 h-4 text-blue-400" />,
    description: 'Domain not in prior submission — full validation required',
  },
  'removed': {
    label: 'Removed', color: 'text-slate-400', bg: 'bg-slate-500/8', border: 'border-slate-500/20',
    icon: <XCircle className="w-4 h-4 text-slate-400" />,
    description: 'Present in prior submission, absent from current package',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PriorDossierImportPanel() {
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);

  const priorDossier        = useDataPackageStore(s => s.priorDossier);
  const deltaManifest       = useDataPackageStore(s => s.deltaManifest);
  const manifest            = useDataPackageStore(s => s.manifest);
  const importLog           = useDataPackageStore(s => s.importLog);
  const importPriorDossier  = useDataPackageStore(s => s.importPriorDossier);
  const clearPriorDossier   = useDataPackageStore(s => s.clearPriorDossier);
  const generateDelta       = useDataPackageStore(s => s.generateDeltaManifest);

  const [newSeqNumber, setNewSeqNumber] = useState('0004');
  const [manualSeqInput, setManualSeqInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const handleLoadDemo = (dossier: typeof DEMO_PRIOR_DOSSIERS[0]) => {
    importPriorDossier(dossier);
    toast.success(`Prior dossier loaded — ${dossier.submissionType} seq ${dossier.sequenceNumber}`);
  };

  const handleGenerateDelta = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 800)); // simulate analysis
    const delta = generateDelta(newSeqNumber);
    setIsGenerating(false);
    if (delta) {
      toast.success(
        `Delta manifest generated — ${delta.carriedForward} carry-forward, ~${delta.estimatedTimeSaved} saved`,
        { action: { label: 'Go to CDISC →', onClick: () => setActiveModule('biostats') } }
      );
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-400" />
            Prior Dossier Import
          </h2>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            Import a prior approved eCTD sequence to identify unchanged datasets.
            Carry-forward datasets skip re-validation — only changed or new domains require CDISC checks.
          </p>
        </div>
        {priorDossier && (
          <button onClick={() => { clearPriorDossier(); }} className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Step 1 — Import prior dossier */}
      <div className={`rounded-xl border p-5 ${priorDossier ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-surface-card'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${priorDossier ? 'bg-emerald-500 text-white' : 'bg-surface-elevated text-text-muted border border-border'}`}>1</div>
          <span className="text-sm font-semibold text-text-primary">Import Prior eCTD Sequence</span>
          {priorDossier && <span className="text-xs text-emerald-400 ml-auto flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Loaded</span>}
        </div>

        {!priorDossier ? (
          <div className="space-y-4">
            {/* Manual entry */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Application + Sequence Number</label>
                <input
                  value={manualSeqInput}
                  onChange={e => setManualSeqInput(e.target.value)}
                  placeholder="e.g. IND 138754 / seq 0003"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                />
              </div>
              <button
                disabled={!manualSeqInput.trim()}
                onClick={() => {
                  // Simulate loading the IND 0003 demo
                  handleLoadDemo(DEMO_PRIOR_DOSSIERS[0]);
                  setManualSeqInput('');
                }}
                className="mt-6 flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 disabled:opacity-40 transition-colors"
              >
                <Upload className="w-4 h-4" /> Load
              </button>
            </div>

            {/* Demo quick-loads */}
            <div>
              <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Demo — Quick Load</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEMO_PRIOR_DOSSIERS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleLoadDemo(d)}
                    className="flex items-start gap-3 p-3.5 bg-surface-elevated hover:bg-surface-card border border-border rounded-xl text-left transition-colors group"
                  >
                    <div className="p-2 bg-purple-500/15 rounded-lg flex-shrink-0 mt-0.5">
                      <Package className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-text-primary">{d.applicationNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-card rounded text-text-muted">Seq {d.sequenceNumber}</span>
                      </div>
                      <div className="text-xs font-medium text-text-secondary mt-0.5">{d.submissionType}</div>
                      <div className="text-[10px] text-text-muted mt-1">{fmtDate(d.submissionDate)} · {d.datasets.length} datasets · SDTM v{d.cdiscVersion}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-blue flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-xl">
            <div className="p-3 bg-purple-500/15 rounded-xl">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-text-primary">{priorDossier.applicationNumber}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-surface-card rounded text-text-muted font-mono">Seq {priorDossier.sequenceNumber}</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">{priorDossier.submissionType} · {fmtDate(priorDossier.submissionDate)}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                <span>{priorDossier.datasets.length} datasets</span>
                <span>SDTM v{priorDossier.cdiscVersion}</span>
                <span>{priorDossier.datasets.reduce((s, d) => s + d.records, 0).toLocaleString()} records</span>
                <span className="text-emerald-400">{priorDossier.datasets.filter(d => d.status === 'PASS').length} PASS</span>
                {priorDossier.datasets.filter(d => d.status !== 'PASS').length > 0 && (
                  <span className="text-amber-400">{priorDossier.datasets.filter(d => d.status !== 'PASS').length} WARN</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2 — Generate delta */}
      {priorDossier && (
        <div className={`rounded-xl border p-5 ${deltaManifest ? 'border-blue-500/20 bg-blue-500/5' : 'border-border bg-surface-card'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${deltaManifest ? 'bg-blue-500 text-white' : 'bg-surface-elevated text-text-muted border border-border'}`}>2</div>
            <span className="text-sm font-semibold text-text-primary">Generate Delta Manifest</span>
            {deltaManifest && <span className="text-xs text-blue-400 ml-auto flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Generated</span>}
          </div>

          <div className="flex items-end gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">New Sequence Number</label>
              <input
                value={newSeqNumber}
                onChange={e => setNewSeqNumber(e.target.value)}
                placeholder="e.g. 0004"
                className="w-28 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div className="text-xs text-text-muted pb-2">
              Comparing seq <span className="font-mono text-text-secondary">{priorDossier.sequenceNumber}</span>
              <ArrowRight className="inline w-3 h-3 mx-1" />
              seq <span className="font-mono text-text-secondary">{newSeqNumber}</span>
              {manifest && <span className="ml-2 text-emerald-400">· {manifest.datasets.length} current datasets loaded</span>}
              {!manifest && <span className="ml-2 text-amber-400">· No current package — comparison against prior inventory only</span>}
            </div>
            <button
              onClick={handleGenerateDelta}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isGenerating ? 'Analysing…' : 'Generate Delta'}
            </button>
          </div>

          {!manifest && !deltaManifest && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg text-xs text-amber-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              No current validated package found. Generate delta based on prior dossier inventory, or
              <button onClick={() => setActiveModule('biostats')} className="underline ml-1">run CDISC validation first</button>.
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Delta results */}
      {deltaManifest && (
        <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
          {/* Summary strip */}
          <div className="px-5 py-4 border-b border-border bg-surface-elevated">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Delta Analysis — Seq {deltaManifest.priorSequence} → {deltaManifest.newSequence}
              </h3>
              <button
                onClick={() => {
                  const lines = [
                    `LIGATURE IDOP — DATA PACKAGE DELTA REPORT`,
                    `${'='.repeat(60)}`,
                    `Study: ${deltaManifest.studyId}  |  Generated: ${new Date(deltaManifest.createdAt).toISOString()}`,
                    `Prior Sequence: ${deltaManifest.priorSequence}  →  New Sequence: ${deltaManifest.newSequence}`,
                    ``,
                    `SUMMARY`,
                    `-`.repeat(40),
                    `  Carry-forward:       ${deltaManifest.carriedForward} dataset(s)`,
                    `  Requires re-validate: ${deltaManifest.requiresRevalidation} dataset(s)`,
                    `  New domains:          ${deltaManifest.newDomains} dataset(s)`,
                    `  Removed:              ${deltaManifest.removedDomains} dataset(s)`,
                    `  Estimated time saved: ~${deltaManifest.estimatedTimeSaved}`,
                    ``,
                    `DATASET DELTA`,
                    `-`.repeat(40),
                    ...deltaManifest.deltas.map(d =>
                      `[${d.action.toUpperCase()}] ${d.domain} — ${d.label}\n  Reason: ${d.reason}${d.recordsDiff !== undefined ? `\n  Records: ${d.prior?.records.toLocaleString() ?? '—'} → ${d.current?.records.toLocaleString() ?? '—'} (${d.recordsDiff > 0 ? '+' : ''}${d.recordsDiff?.toLocaleString()})` : ''}`
                    ),
                    ``,
                    `Generated by Ligature IDOP v0.126.9`,
                  ].join('\n');
                  const blob = new Blob([lines], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Delta-${deltaManifest.priorSequence}-to-${deltaManifest.newSequence}-${new Date().toISOString().slice(0,10)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Delta report downloaded');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:bg-surface-card transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Carry Forward', value: deltaManifest.carriedForward,          color: 'text-emerald-400', sub: '~' + Math.round(deltaManifest.carriedForward * 0.75) + 'h saved' },
                { label: 'Re-validate',   value: deltaManifest.requiresRevalidation,    color: 'text-amber-400',   sub: 'CDISC check needed' },
                { label: 'New Domains',   value: deltaManifest.newDomains,              color: 'text-blue-400',    sub: 'full validation' },
                { label: 'Time Saved',    value: `~${deltaManifest.estimatedTimeSaved}`, color: 'text-purple-400', sub: 'vs. full re-run' },
              ].map(s => (
                <div key={s.label} className="p-3 bg-surface-card rounded-xl border border-border">
                  <div className="text-xs text-text-muted">{s.label}</div>
                  <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset delta table */}
          <div className="divide-y divide-border">
            {deltaManifest.deltas.map(d => {
              const cfg = DELTA_CONFIG[d.action];
              const isExpanded = expandedDomain === d.domain;
              return (
                <div key={d.domain} className={`${cfg.bg} ${cfg.border} border-l-4`}>
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:brightness-105 transition-all"
                    onClick={() => setExpandedDomain(isExpanded ? null : d.domain)}
                  >
                    {cfg.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-text-primary text-sm">{d.domain}</span>
                        <span className="text-xs text-text-secondary">{d.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{d.reason}</div>
                    </div>
                    {/* Records comparison */}
                    {d.prior && d.current && (
                      <div className="flex items-center gap-2 text-xs text-text-muted flex-shrink-0">
                        <span className="font-mono">{d.prior.records.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-mono">{d.current.records.toLocaleString()}</span>
                        {d.recordsDiff !== undefined && d.recordsDiff !== 0 && (
                          <span className={`font-semibold ${d.recordsDiff > 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            ({d.recordsDiff > 0 ? '+' : ''}{d.recordsDiff.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                    {d.prior && !d.current && (
                      <span className="text-xs text-text-muted font-mono flex-shrink-0">{d.prior.records.toLocaleString()} records</span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {d.prior && (
                        <>
                          <div className="p-3 bg-surface-card rounded-lg border border-border">
                            <div className="text-[10px] text-text-muted uppercase">Prior Score</div>
                            <div className={`text-lg font-bold ${d.prior.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>{d.prior.score}%</div>
                            <div className="text-[10px] text-text-muted">{fmtDate(d.prior.validatedAt)}</div>
                          </div>
                          <div className="p-3 bg-surface-card rounded-lg border border-border">
                            <div className="text-[10px] text-text-muted uppercase">Prior Variables</div>
                            <div className="text-lg font-bold text-text-primary">{d.prior.variableCount}</div>
                            <div className="text-[10px] text-text-muted">Define-XML {d.prior.defineXmlVersion}</div>
                          </div>
                        </>
                      )}
                      {d.current && (
                        <>
                          <div className="p-3 bg-surface-card rounded-lg border border-border">
                            <div className="text-[10px] text-text-muted uppercase">Current Score</div>
                            <div className={`text-lg font-bold ${d.current.status === 'PASS' ? 'text-emerald-400' : d.current.status === 'FAIL' ? 'text-red-400' : 'text-amber-400'}`}>{d.current.score}%</div>
                            <div className="text-[10px] text-text-muted">{d.current.status}</div>
                          </div>
                          <div className="p-3 bg-surface-card rounded-lg border border-border">
                            <div className="text-[10px] text-text-muted uppercase">eCTD Path</div>
                            <div className="text-[10px] font-mono text-text-secondary truncate mt-0.5">{d.current.ectdPath}</div>
                          </div>
                        </>
                      )}
                      {d.action === 'carry-forward' && (
                        <div className="col-span-2 md:col-span-4 flex items-center gap-2 p-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Dataset passes carry-forward criteria. Prior validated XPT file will be referenced in new sequence without re-validation. ~45 minutes saved.
                        </div>
                      )}
                      {(d.action === 're-validate' || d.action === 'new') && (
                        <div className="col-span-2 md:col-span-4 flex items-center justify-between p-2.5 bg-amber-500/8 border border-amber-500/20 rounded-lg">
                          <span className="text-xs text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Full CDISC validation required before this dataset can be included in the submission.
                          </span>
                          <button
                            onClick={() => setActiveModule('biostats')}
                            className="text-[10px] px-2.5 py-1 bg-accent-blue text-white rounded hover:bg-accent-blue/90 transition-colors flex-shrink-0"
                          >
                            Open in Validator →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-4 border-t border-border bg-surface-elevated flex items-center justify-between">
            <div className="text-xs text-text-muted">
              <span className="text-emerald-400 font-semibold">{deltaManifest.carriedForward}</span> datasets can be carried forward without re-validation ·
              <span className="text-amber-400 font-semibold ml-1">{deltaManifest.requiresRevalidation + deltaManifest.newDomains}</span> require CDISC checks
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModule('biostats')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary rounded-lg text-xs hover:bg-surface-card transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" /> Validate in Biostats
              </button>
              <button
                onClick={() => {
                  toast.success('Delta package applied to submission builder');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
              >
                <Package className="w-3.5 h-3.5" /> Apply to Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log */}
      {importLog.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-text-primary">Audit Log</span>
          </div>
          <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
            {importLog.slice(0, 8).map((entry, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <Clock className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary">{entry.action}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{entry.user} · {new Date(entry.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
