
/**
 * SubmissionsFilterBar — v0.125.77
 * Shared filter component for Submission Planning and Publishing screens.
 * Filter parity with Submissions Hub: Program, Application type, Region, Status, Sequence.
 * Filter state persists within session via useState at the parent level.
 */

import { SlidersHorizontal, X } from 'lucide-react';

export interface SubmissionsFilter {
  program: string;
  applicationType: string; // IND | NDA | MAA | CTA | BLA | ''
  region: string;
  status: string;
  sequence: string; // 'original' | 'amendment' | ''
}

export const EMPTY_SUBMISSIONS_FILTER: SubmissionsFilter = {
  program: '', applicationType: '', region: '', status: '', sequence: '',
};

interface SubmissionsFilterBarProps {
  value: SubmissionsFilter;
  onChange: (f: SubmissionsFilter) => void;
  resultCount?: number;
  totalCount?: number;
}

const sel = 'text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer';

export function SubmissionsFilterBar({ value, onChange, resultCount, totalCount }: SubmissionsFilterBarProps) {
  const set = (k: keyof SubmissionsFilter, v: string) => onChange({ ...value, [k]: v });
  const clear = () => onChange(EMPTY_SUBMISSIONS_FILTER);
  const activeCount = Object.values(value).filter(Boolean).length;

  return (
    <div className="px-6 py-2.5 border-b border-border bg-surface flex flex-col gap-2">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0" />

        <select value={value.program} onChange={e => set('program', e.target.value)} className={sel}>
          <option value="">All Programs</option>
          <option value="LIG-2847">LIG-2847 (Nexavant)</option>
          <option value="LIG-1182">LIG-1182 (Oncorix)</option>
          <option value="LIG-3156">LIG-3156</option>
          <option value="LIG-4491">LIG-4491</option>
        </select>

        <select value={value.applicationType} onChange={e => set('applicationType', e.target.value)} className={sel}>
          <option value="">All Applications</option>
          {['IND', 'NDA', 'BLA', 'MAA', 'CTA'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={value.region} onChange={e => set('region', e.target.value)} className={sel}>
          <option value="">All Regions</option>
          <option value="US">🇺🇸 FDA</option>
          <option value="EU">🇪🇺 EMA</option>
          <option value="JP">🇯🇵 PMDA</option>
          <option value="CA">🇨🇦 Health Canada</option>
        </select>

        <select value={value.status} onChange={e => set('status', e.target.value)} className={sel}>
          <option value="">All Statuses</option>
          {['Planning', 'In Progress', 'Under Review', 'Submitted', 'Approved', 'On Hold'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={value.sequence} onChange={e => set('sequence', e.target.value)} className={sel}>
          <option value="">All Sequences</option>
          <option value="original">Original (Seq 0)</option>
          <option value="amendment">Amendments (Seq ≥1)</option>
        </select>

        <div className="flex-1" />
        {resultCount !== undefined && totalCount !== undefined && (
          <span className="text-[11px] text-text-muted">{resultCount} of {totalCount}</span>
        )}
        {activeCount > 0 && (
          <button onClick={clear} className="text-[11px] text-text-muted hover:text-text-primary transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {value.program && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              {value.program}<button onClick={() => set('program', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {value.applicationType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {value.applicationType}<button onClick={() => set('applicationType', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {value.region && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {value.region}<button onClick={() => set('region', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {value.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {value.status}<button onClick={() => set('status', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {value.sequence && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {value.sequence === 'original' ? 'Original' : 'Amendments'}<button onClick={() => set('sequence', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
