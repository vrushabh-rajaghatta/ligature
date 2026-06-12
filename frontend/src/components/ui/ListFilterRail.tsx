
/**
 * ListFilterRail — v0.125.27
 *
 * Reusable horizontal search + filter bar for high-volume list screens
 * (SAPs, ad hoc analyses, documents, submissions, safety signals, etc.)
 *
 * Usage:
 *   <ListFilterRail
 *     search={search}
 *     onSearch={setSearch}
 *     filters={[
 *       { key: 'status', label: 'Status', value: statusFilter, options: STATUS_OPTIONS, onChange: setStatusFilter },
 *       { key: 'study',  label: 'Study',  value: studyFilter,  options: studyOptions,  onChange: setStudyFilter  },
 *     ]}
 *     resultCount={filtered.length}
 *     totalCount={all.length}
 *   />
 */

import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface ListFilterRailProps {
  search: string;
  onSearch: (q: string) => void;
  filters?: FilterConfig[];
  resultCount?: number;
  totalCount?: number;
  searchPlaceholder?: string;
  className?: string;
}

export function ListFilterRail({
  search,
  onSearch,
  filters = [],
  resultCount,
  totalCount,
  searchPlaceholder = 'Search…',
  className = '',
}: ListFilterRailProps) {
  const hasActiveFilters = search.trim() !== '' || filters.some(f => f.value !== 'all' && f.value !== '');

  const handleClearAll = () => {
    onSearch('');
    filters.forEach(f => f.onChange('all'));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50 focus:border-accent-blue/50"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {filters.map(filter => (
          <div key={filter.key} className="relative">
            <select
              value={filter.value}
              onChange={e => filter.onChange(e.target.value)}
              className={`pl-3 pr-7 py-1.5 text-sm border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-blue/50 focus:border-accent-blue/50 ${
                filter.value !== 'all' && filter.value !== ''
                  ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                  : 'bg-surface-card border-border text-text-secondary'
              }`}
            >
              <option value="all">{filter.label}: All</option>
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>
        ))}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-surface-card rounded-lg transition-colors border border-border"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        {/* Result count */}
        {resultCount !== undefined && totalCount !== undefined && (
          <span className="text-xs text-text-muted ml-auto flex-shrink-0">
            {resultCount === totalCount
              ? `${totalCount} result${totalCount !== 1 ? 's' : ''}`
              : `${resultCount} of ${totalCount}`}
          </span>
        )}
      </div>
    </div>
  );
}
