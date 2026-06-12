// ============================================================================
// CPIDetailPanel — v0.62.0
// LIG-008 COMPLETE: CPI click-through detail panel with shared/unique filter
// Shows full CPI registry for a plan, with row-level links back to the grid
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  X, Layers, Globe, Crown, FileText, CheckCircle2,
  Link2, ChevronRight, Search, Filter,
} from 'lucide-react';
import { CPIRecord, cpiRegistry, GlobalSubmissionPlan, GSPTask } from '@/data/global-submission-plan-data';

const MARKET_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', Japan: '🇯🇵', China: '🇨🇳',
  Canada: '🇨🇦', UK: '🇬🇧', Australia: '🇦🇺', Korea: '🇰🇷',
};

const SECTION_COLORS: Record<string, string> = {
  M1: 'text-violet-400 bg-violet-500/15',
  M2: 'text-cyan-400 bg-cyan-500/15',
  M3: 'text-amber-400 bg-amber-500/15',
  M4: 'text-pink-400 bg-pink-500/15',
  M5: 'text-emerald-400 bg-emerald-500/15',
};

type CPIFilter = 'all' | 'shared' | 'unique';

interface CPIDetailPanelProps {
  plan: GlobalSubmissionPlan;
  onClose: () => void;
  onJumpToTask?: (taskId: string) => void;
}

export function CPIDetailPanel({ plan, onClose, onJumpToTask }: CPIDetailPanelProps) {
  const [filter, setFilter] = useState<CPIFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedCPI, setSelectedCPI] = useState<CPIRecord | null>(null);

  // Only show CPI records relevant to this plan's submissions
  const planSubmissionIds = new Set(plan.submissions.map(s => s.id));

  const filteredCPIs = useMemo(() => {
    return cpiRegistry.filter(cpi => {
      // Relevance: at least one submissionId matches this plan
      const relevant = cpi.submissionIds.some(id => planSubmissionIds.has(id));
      if (!relevant) return false;
      if (filter === 'shared' && cpi.status !== 'shared') return false;
      if (filter === 'unique' && cpi.status !== 'market-unique') return false;
      if (search) {
        const q = search.toLowerCase();
        if (!cpi.title.toLowerCase().includes(q) && !cpi.id.toLowerCase().includes(q) && !cpi.ctdSection.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filter, search, planSubmissionIds]);

  const sharedCount = cpiRegistry.filter(c => c.submissionIds.some(id => planSubmissionIds.has(id)) && c.status === 'shared').length;
  const uniqueCount = cpiRegistry.filter(c => c.submissionIds.some(id => planSubmissionIds.has(id)) && c.status === 'market-unique').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-surface-elevated h-full flex flex-col border-l border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-text-primary">Common Package Items</h2>
              </div>
              <p className="text-sm text-text-muted">{plan.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-text-secondary">{sharedCount} shared across all markets</span>
            </div>
            <div className="text-text-muted">·</div>
            <div className="flex items-center gap-1.5 text-sm">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-text-secondary">{uniqueCount} market-unique items</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-border flex-shrink-0 flex items-center gap-3">
          {/* Filter toggle */}
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            {(['all', 'shared', 'unique'] as CPIFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded capitalize transition-colors ${
                  filter === f ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'all' ? `All (${sharedCount + uniqueCount})` : f === 'shared' ? `Shared (${sharedCount})` : `Unique (${uniqueCount})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search CPI items..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>

        {/* CPI list */}
        <div className="flex-1 overflow-auto">
          {filteredCPIs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p>No CPI items match current filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCPIs.map(cpi => {
                const isSelected = selectedCPI?.id === cpi.id;
                const sectionCfg = SECTION_COLORS[cpi.moduleSection] ?? 'text-text-muted bg-surface';

                return (
                  <div key={cpi.id}>
                    {/* Row */}
                    <button
                      className={`w-full text-left px-5 py-3.5 hover:bg-surface-card/60 transition-colors ${isSelected ? 'bg-surface-card' : ''}`}
                      onClick={() => setSelectedCPI(isSelected ? null : cpi)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 pt-0.5">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${sectionCfg}`}>
                            {cpi.moduleSection}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-text-muted">{cpi.id}</span>
                            <span className="text-xs text-text-muted font-mono">§{cpi.ctdSection}</span>
                            {cpi.status === 'shared' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-medium">
                                Shared
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">
                                Unique
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-text-primary truncate">{cpi.title}</p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {cpi.markets.map(m => (
                              <span key={m} className="text-[10px] text-text-muted">
                                {MARKET_FLAGS[m] ?? ''} {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 text-text-muted transition-transform mt-1 ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="px-5 pb-4 bg-surface-card/40 border-t border-border/50">
                        <div className="pt-3 space-y-3">
                          {cpi.description && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Description</p>
                              <p className="text-sm text-text-secondary">{cpi.description}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {cpi.documentRef && (
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Document Reference</p>
                                <div className="flex items-center gap-1.5 text-sm text-accent-blue">
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{cpi.documentRef}</span>
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Shared Markets</p>
                              <div className="flex flex-wrap gap-1">
                                {cpi.markets.map(m => (
                                  <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                                    {MARKET_FLAGS[m] ?? ''} {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {cpi.linkedTaskId && onJumpToTask && (
                            <button
                              onClick={() => { onJumpToTask(cpi.linkedTaskId!); onClose(); }}
                              className="flex items-center gap-1.5 text-sm text-accent-blue hover:text-accent-blue/80 mt-1"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Jump to task row in plan grid
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CPIDetailPanel;
