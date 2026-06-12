/**
 * CitationMonitorPanel — v0.44.59 / rebuilt v0.45.2
 *
 * Admin panel for the Regulatory Citation Monitor.
 * Shows all tracked citations, their status, last check time,
 * affected modules, and provides manual check triggers.
 *
 * Lives in AdminScreen under a "Citation Monitor" tab.
 */


import { useState, useMemo } from 'react';
import {
  RefreshCw, Shield, AlertTriangle, CheckCircle, Clock,
  ExternalLink, ChevronDown, ChevronRight, Filter,
  FileText, Globe, Building2, Beaker, Heart, Search,
} from 'lucide-react';
import { useCitationMonitor } from '@/hooks/useCitationMonitor';
import { REGULATORY_CITATIONS } from '@/config/regulatory-citations';

const AUTHORITY_COLORS: Record<string, string> = {
  ICH:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FDA:  'bg-red-500/15 text-red-400 border-red-500/20',
  EMA:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  MHRA: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  PMDA: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  WHO:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  TGA:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  clinical:    <Beaker className="w-3.5 h-3.5" />,
  safety:      <Heart className="w-3.5 h-3.5" />,
  quality:     <Shield className="w-3.5 h-3.5" />,
  regulatory:  <FileText className="w-3.5 h-3.5" />,
  cmc:         <Building2 className="w-3.5 h-3.5" />,
  nonclinical: <Beaker className="w-3.5 h-3.5" />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  current:   { label: 'Current',   color: 'text-emerald-400', icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> },
  updated:   { label: 'Updated',   color: 'text-amber-400',   icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> },
  withdrawn: { label: 'Withdrawn', color: 'text-red-400',     icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> },
  draft:     { label: 'Draft',     color: 'text-blue-400',    icon: <Clock className="w-3.5 h-3.5 text-blue-400" /> },
  unknown:   { label: 'Unknown',   color: 'text-text-muted',  icon: <Clock className="w-3.5 h-3.5 text-text-muted" /> },
};

export function CitationMonitorPanel() {
  const {
    citations, changedCount, isChecking, isLoading,
    lastChecked, lastCheckResult, error, checkAll, checkOne,
  } = useCitationMonitor();

  const [filterAuthority, setFilterAuthority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use the full registry for display (hook only gets summaries)
  const fullCitations = REGULATORY_CITATIONS;

  // Filtered list
  const filtered = useMemo(() => {
    return fullCitations.filter(c => {
      if (filterAuthority !== 'all' && c.authority !== filterAuthority) return false;
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.code.toLowerCase().includes(q) ||
               c.title.toLowerCase().includes(q) ||
               c.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [fullCitations, filterAuthority, filterCategory, searchQuery]);

  // Changed IDs from last check
  const changedIds = new Set(lastCheckResult?.changed.map(c => c.id) ?? []);
  const errorIds = new Set(lastCheckResult?.errors.map(c => c.id) ?? []);

  // Stats
  const authorities = Array.from(new Set(fullCitations.map(c => c.authority)));
  const categories = Array.from(new Set(fullCitations.map(c => c.category)));

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Regulatory Citation Monitor
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Tracking {fullCitations.length} regulatory citations across {authorities.length} authorities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-text-muted">
              Last checked: {formatDateTime(lastChecked)}
            </span>
          )}
          <button
            onClick={() => checkAll()}
            disabled={isChecking}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
              transition-all
              ${isChecking
                ? 'bg-blue-500/10 text-blue-400/50 cursor-wait'
                : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking…' : 'Check All Now'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {lastCheckResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface-card border border-border">
            <div className="text-2xl font-bold text-text-primary tabular-nums">{lastCheckResult.checked}</div>
            <div className="text-xs text-text-muted mt-0.5">Checked</div>
          </div>
          <div className={`p-3 rounded-xl border ${changedCount > 0 ? 'bg-amber-500/8 border-amber-500/25' : 'bg-surface-card border-border'}`}>
            <div className={`text-2xl font-bold tabular-nums ${changedCount > 0 ? 'text-amber-400' : 'text-text-primary'}`}>
              {changedCount}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Changed</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-card border border-border">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {lastCheckResult.unchanged.length}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Unchanged</div>
          </div>
          <div className={`p-3 rounded-xl border ${lastCheckResult.errors.length > 0 ? 'bg-red-500/8 border-red-500/25' : 'bg-surface-card border-border'}`}>
            <div className={`text-2xl font-bold tabular-nums ${lastCheckResult.errors.length > 0 ? 'text-red-400' : 'text-text-primary'}`}>
              {lastCheckResult.errors.length}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Errors</div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search citations…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        <select
          value={filterAuthority}
          onChange={e => setFilterAuthority(e.target.value)}
          className="text-xs bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-primary"
        >
          <option value="all">All Authorities</option>
          {authorities.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-xs bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-primary"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>

        <span className="text-xs text-text-muted ml-auto">
          {filtered.length} of {fullCitations.length} citations
        </span>
      </div>

      {/* Citation list */}
      <div className="space-y-2">
        {filtered.map(citation => {
          const isChanged = changedIds.has(citation.id);
          const isError = errorIds.has(citation.id);
          const isExpanded = expandedId === citation.id;
          const statusCfg = STATUS_CONFIG[isChanged ? 'updated' : citation.status] ?? STATUS_CONFIG.unknown;
          const authColor = AUTHORITY_COLORS[citation.authority] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20';

          return (
            <div
              key={citation.id}
              className={`
                rounded-xl border overflow-hidden transition-all
                ${isChanged ? 'bg-amber-500/5 border-amber-500/20' : isError ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-card border-border'}
              `}
            >
              {/* Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : citation.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                }

                {/* Status icon */}
                <div className="flex-shrink-0">{statusCfg.icon}</div>

                {/* Authority badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${authColor}`}>
                  {citation.authority}
                </span>

                {/* Code + Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{citation.code}</span>
                    {isChanged && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase">
                        Changed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted truncate">{citation.title}</p>
                </div>

                {/* Category */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
                  {CATEGORY_ICONS[citation.category]}
                  <span className="capitalize">{citation.category}</span>
                </div>

                {/* Effective date */}
                <span className="text-xs text-text-muted flex-shrink-0 hidden md:block">
                  {formatDate(citation.effectiveDate)}
                </span>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Source URL</p>
                      <a
                        href={citation.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 break-all"
                      >
                        {citation.sourceUrl.slice(0, 60)}…
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Last Checked</p>
                      <p className="text-xs text-text-primary">{formatDateTime(citation.lastChecked)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Last Changed</p>
                      <p className="text-xs text-text-primary">{formatDateTime(citation.lastChanged)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Fingerprint</p>
                      <p className="text-xs text-text-muted font-mono truncate">{citation.lastFingerprint.slice(0, 24)}…</p>
                    </div>
                  </div>

                  {/* Affected modules */}
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Affected Modules</p>
                    <div className="flex flex-wrap gap-1.5">
                      {citation.affectedModules.map(m => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-text-secondary font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Affected sections */}
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Affected Document Sections</p>
                    <div className="flex flex-wrap gap-1.5">
                      {citation.affectedSections.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-text-secondary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); checkOne(citation.id); }}
                      disabled={isChecking}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                      Check Now
                    </button>
                    <a
                      href={citation.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        bg-surface-elevated text-text-secondary hover:text-text-primary transition-all border border-border"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Source
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-text-muted">
            No citations match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
