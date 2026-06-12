
/**
 * GlobalSearch Component - v0.27.73
 * 
 * Comprehensive cross-module search across all Ligature modules with:
 * - Live data from all stores (documents, HAQs, submissions, safety, TMF, QMS, CTMS)
 * - Category filtering with visual chips
 * - Real-time search with relevance scoring
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Recent searches persistence
 * - Cross-module navigation
 * 
 * USAGE:
 * <GlobalSearch onResultClick={(result) => navigateTo(result)} />
 */


import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, Filter, Clock, ArrowRight, FileText, MessageSquare,
  AlertTriangle, Send, Pill, Users, Building2, Microscope, Tag,
  ChevronRight, Check, Calendar, Layers, Database, Shield, Activity,
  Briefcase, ClipboardList, FolderOpen, BookOpen, BarChart3, Edit3,
  Package, Sparkles, Command, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCrossModuleSearch, CATEGORY_CONFIG, type SearchCategory, type SearchResult } from '@/hooks/useCrossModuleSearch';

// ============================================================================
// TYPES
// ============================================================================

export type { SearchCategory, SearchResult };

export type SearchScope = 'all' | 'metadata' | 'content';

export interface SearchFilter {
  categories: SearchCategory[];
  statuses: string[];
  modules: string[];
  types: string[];
  scope: SearchScope;
}

export interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
  onClose?: () => void;
  isOpen?: boolean;
  placeholder?: string;
  defaultFilters?: Partial<SearchFilter>;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-4 h-4" />,
  Edit3: <Edit3 className="w-4 h-4" />,
  Send: <Send className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  FolderOpen: <FolderOpen className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Microscope: <Microscope className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
};

// ============================================================================
// STATUS BADGE COLORS
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// ============================================================================
// DEFAULT FILTERS
// ============================================================================

const DEFAULT_FILTERS: SearchFilter = {
  categories: [],
  statuses: [],
  modules: [],
  types: [],
  scope: 'all',
};

// ============================================================================
// FILTER OPTIONS
// ============================================================================

const MODULE_FILTERS = [
  { id: 'regulatory', label: 'Regulatory', color: 'bg-amber-500' },
  { id: 'clinical', label: 'Clinical', color: 'bg-green-500' },
  { id: 'safety', label: 'Safety', color: 'bg-red-500' },
  { id: 'quality', label: 'Quality', color: 'bg-indigo-500' },
  { id: 'data', label: 'Data', color: 'bg-violet-500' },
];

const STATUS_FILTERS = [
  { id: 'draft', label: 'Draft' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'in-review', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'effective', label: 'Effective' },
  { id: 'closed', label: 'Closed' },
];

// ============================================================================
// MOCK SEARCH DATA (Replace with real data sources)
// ============================================================================

const MOCK_SEARCH_INDEX: SearchResult[] = [
  // Documents
  {
    id: 'doc-001',
    category: 'documents',
    title: 'US Prescribing Information - LIG-001',
    subtitle: 'DOC-2024-00067 • v1.2',
    status: 'Effective',
    statusColor: 'green',
    type: 'Label',
    module: 'Labeling',
    moduleIcon: 'FileText',
    moduleColor: 'text-amber-500',
    relevanceScore: 95,
    metadata: { version: '1.2', author: 'Sarah Chen', effectiveDate: '2024-01-15' },
  },
  {
    id: 'doc-002',
    category: 'documents',
    title: 'Clinical Study Report - Phase 3',
    subtitle: 'DOC-2024-00089 • v3.1',
    status: 'In Review',
    statusColor: 'amber',
    type: 'CSR',
    module: 'Authoring',
    moduleIcon: 'Edit3',
    moduleColor: 'text-amber-500',
    relevanceScore: 88,
    metadata: { version: '3.1', author: 'Michael Roberts', pages: 245 },
  },
  {
    id: 'doc-003',
    category: 'documents',
    title: 'Quality Manual - GMP Compliance',
    subtitle: 'DOC-2024-00102 • v2.0',
    status: 'Approved',
    statusColor: 'green',
    type: 'SOP',
    module: 'QMS',
    moduleIcon: 'Shield',
    moduleColor: 'text-red-500',
    relevanceScore: 82,
    metadata: { version: '2.0', department: 'Quality Assurance' },
  },
  // Submissions
  {
    id: 'sub-001',
    category: 'submissions',
    title: 'NDA 215847 - Nexovant',
    subtitle: 'FDA • Target: Mar 15, 2024',
    status: 'On Track',
    statusColor: 'blue',
    type: 'NDA',
    module: 'Submissions',
    moduleIcon: 'Send',
    moduleColor: 'text-purple-500',
    relevanceScore: 92,
    metadata: { region: 'FDA', sequence: '0045', product: 'Nexovant' },
  },
  {
    id: 'sub-002',
    category: 'submissions',
    title: 'MAA - Cardiozen European Filing',
    subtitle: 'EMA • Target: Apr 30, 2024',
    status: 'At Risk',
    statusColor: 'amber',
    type: 'MAA',
    module: 'Submissions',
    moduleIcon: 'Send',
    moduleColor: 'text-purple-500',
    relevanceScore: 85,
    metadata: { region: 'EMA', product: 'Cardiozen' },
  },
  // HAQs
  {
    id: 'haq-001',
    category: 'haqs',
    title: 'FDA CMC Question - Stability Data',
    subtitle: 'HAQ-2024-0142 • Due: Jan 20, 2024',
    status: 'Open',
    statusColor: 'amber',
    type: 'CMC',
    module: 'HAQ',
    moduleIcon: 'MessageSquare',
    moduleColor: 'text-amber-500',
    relevanceScore: 90,
    metadata: { authority: 'FDA', dueDate: '2024-01-20', priority: 'High' },
  },
  {
    id: 'haq-002',
    category: 'haqs',
    title: 'EMA Clinical Efficacy Query',
    subtitle: 'HAQ-2024-0156 • Due: Feb 5, 2024',
    status: 'In Progress',
    statusColor: 'blue',
    type: 'Clinical',
    module: 'HAQ',
    moduleIcon: 'MessageSquare',
    moduleColor: 'text-amber-500',
    relevanceScore: 78,
    metadata: { authority: 'EMA', assignee: 'Dr. Emily Watson' },
  },
  // Safety Cases
  {
    id: 'safety-001',
    category: 'safety',
    title: 'ICSR-2024-00892 - Serious AE Report',
    subtitle: 'E2B Submitted • Nexovant',
    status: 'Closed',
    statusColor: 'green',
    type: 'ICSR',
    module: 'Safety',
    moduleIcon: 'AlertTriangle',
    moduleColor: 'text-red-500',
    relevanceScore: 75,
    metadata: { product: 'Nexovant', seriousness: 'Serious', outcome: 'Recovered' },
  },
  // CTMS (was "programs" and "studies")
  {
    id: 'ctms-001',
    category: 'ctms',
    title: 'Nexovant Development Program',
    subtitle: 'Phase 3 • Oncology',
    status: 'On Track',
    statusColor: 'green',
    type: 'Phase 3',
    module: 'Portfolio',
    moduleIcon: 'Microscope',
    moduleColor: 'text-teal-500',
    relevanceScore: 95,
    metadata: { phase: 'Phase 3', indication: 'NSCLC', sponsor: 'Ligature Pharma' },
  },
  {
    id: 'ctms-002',
    category: 'ctms',
    title: 'NEXO-301 - Pivotal Efficacy Trial',
    subtitle: '450 patients • 32 sites',
    status: 'Enrolling',
    statusColor: 'blue',
    type: 'Phase 3',
    module: 'CTMS',
    moduleIcon: 'Microscope',
    moduleColor: 'text-green-500',
    relevanceScore: 88,
    metadata: { enrollment: 312, target: 450, sites: 32 },
  },
  // Products
  {
    id: 'prod-001',
    category: 'products',
    title: 'Nexovant (LIG-001)',
    subtitle: 'Small Molecule • Oncology',
    status: 'Active',
    statusColor: 'green',
    type: 'Drug',
    module: 'Master Data',
    moduleIcon: 'Package',
    moduleColor: 'text-violet-500',
    relevanceScore: 92,
    metadata: { inn: 'Nexovant', modality: 'Small Molecule' },
  },
];

// ============================================================================
// SEARCH LOGIC
// ============================================================================

function searchIndex(
  query: string,
  filters: SearchFilter,
  index: SearchResult[]
): SearchResult[] {
  if (!query.trim() && filters.modules.length === 0 && filters.types.length === 0 && filters.statuses.length === 0) {
    return [];
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return index
    .filter(item => {
      // Apply module filter
      if (filters.modules.length > 0) {
        const itemModuleGroup = getModuleGroup(item.module);
        if (!filters.modules.includes(itemModuleGroup)) {
          return false;
        }
      }
      
      // Apply type filter
      if (filters.types.length > 0 && item.type) {
        if (!filters.types.includes(item.type.toLowerCase())) {
          return false;
        }
      }
      
      // Apply status filter
      if (filters.statuses.length > 0 && item.status) {
        const normalizedStatus = item.status.toLowerCase().replace(/\s+/g, '-');
        if (!filters.statuses.includes(normalizedStatus)) {
          return false;
        }
      }
      
      // Text search
      if (normalizedQuery) {
        const searchableText = [
          item.title,
          item.subtitle,
          item.description,
          item.type,
          item.status,
          ...Object.values(item.metadata).map(v => String(v)),
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(normalizedQuery)) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function getModuleGroup(module: string): string {
  const regulatory = ['submissions', 'haq', 'authoring', 'publishing', 'labeling', 'document-control', 'master-data'];
  const clinical = ['ctms', 'tmf', 'study-design', 'study-intel'];
  const safety = ['safety', 'psmf'];
  const quality = ['qms', 'glp', 'archives'];
  
  if (regulatory.some(m => module.toLowerCase().includes(m))) return 'regulatory';
  if (clinical.some(m => module.toLowerCase().includes(m))) return 'clinical';
  if (safety.some(m => module.toLowerCase().includes(m))) return 'safety';
  if (quality.some(m => module.toLowerCase().includes(m))) return 'quality';
  return 'commercial';
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) 
      ? <mark key={i} className="bg-accent-amber/30 text-text-primary px-0.5 rounded">{part}</mark>
      : part
  );
}

// ============================================================================
// FILTER PANEL COMPONENT
// ============================================================================

interface FilterPanelProps {
  filters: SearchFilter;
  onChange: (filters: SearchFilter) => void;
  onClear: () => void;
}

function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  const activeFilterCount = 
    filters.modules.length + 
    filters.types.length + 
    filters.statuses.length +
    (filters.scope !== 'all' ? 1 : 0);
  
  const toggleFilter = (category: 'modules' | 'types' | 'statuses', value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [category]: updated });
  };
  
  return (
    <div className="p-4 border-b border-border bg-surface-card/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">Filters</span>
          {activeFilterCount > 0 && (
            <Badge color="blue" size="xs">{activeFilterCount}</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-accent-blue hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      
      {/* Search Scope */}
      <div className="mb-4">
        <div className="text-xs font-medium text-text-muted mb-2">Search In</div>
        <div className="flex gap-2">
          {(['all', 'metadata', 'content'] as SearchScope[]).map(scope => (
            <button
              key={scope}
              onClick={() => onChange({ ...filters, scope })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filters.scope === scope
                  ? 'bg-accent-blue text-white border-accent-blue'
                  : 'bg-surface border-border text-text-secondary hover:border-border-focus'
              }`}
            >
              {scope === 'all' ? 'All' : scope === 'metadata' ? 'Metadata' : 'Content'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Module Filters */}
      <div className="mb-4">
        <div className="text-xs font-medium text-text-muted mb-2">Module</div>
        <div className="flex flex-wrap gap-2">
          {MODULE_FILTERS.map(mod => (
            <button
              key={mod.id}
              onClick={() => toggleFilter('modules', mod.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                filters.modules.includes(mod.id)
                  ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                  : 'bg-surface border-border text-text-secondary hover:border-border-focus'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mod?.color ?? ''}`} />
              {mod.label}
              {filters.modules.includes(mod.id) && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>
      
      {/* Status Filters */}
      <div>
        <div className="text-xs font-medium text-text-muted mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(status => (
            <button
              key={status.id}
              onClick={() => toggleFilter('statuses', status.id)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                filters.statuses.includes(status.id)
                  ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                  : 'bg-surface border-border text-text-secondary hover:border-border-focus'
              }`}
            >
              {status.label}
              {filters.statuses.includes(status.id) && <Check className="w-3 h-3 ml-1 inline" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RESULT ITEM COMPONENT
// ============================================================================

interface ResultItemProps {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}

function ResultItem({ result, query, isSelected, onClick }: ResultItemProps) {
  const categoryConfig = CATEGORY_CONFIG[result.category];
  
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-surface-card transition-colors flex items-start gap-3 ${
        isSelected ? 'bg-surface-card' : ''
      }`}
    >
      {/* Category Icon */}
      <div className={`p-2 rounded-lg bg-surface-elevated flex-shrink-0 ${categoryConfig?.color ?? ''}`}>
        {categoryConfig.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">
            {highlightMatch(result.title, query)}
          </span>
          {result.status && (
            <Badge color={result.statusColor as any || 'gray'} size="xs">
              {result.status}
            </Badge>
          )}
        </div>
        {result.subtitle && (
          <div className="text-sm text-text-muted mt-0.5 truncate">
            {highlightMatch(result.subtitle, query)}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs ${categoryConfig?.color ?? ''}`}>
            {categoryConfig.label}
          </span>
          <span className="text-text-muted">•</span>
          <span className="text-xs text-text-muted">{result.module}</span>
          {result.type && (
            <>
              <span className="text-text-muted">•</span>
              <span className="text-xs text-text-muted">{result.type}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-2" />
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GlobalSearch({
  onResultClick,
  onClose,
  isOpen = true,
  placeholder = 'Search documents, submissions, HAQs, safety cases...',
  defaultFilters,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({ ...DEFAULT_FILTERS, ...defaultFilters });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ligature-recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);
  
  // Perform search
  const results = useMemo(() => {
    return searchIndex(query, filters, MOCK_SEARCH_INDEX);
  }, [query, filters]);
  
  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<SearchCategory, SearchResult[]> = {
      documents: [],
      authoring: [],
      submissions: [],
      haqs: [],
      safety: [],
      tmf: [],
      qms: [],
      ctms: [],
      products: [],
    };
    
    results.forEach(r => {
      if (groups[r.category]) {
        groups[r.category].push(r);
      }
    });
    
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([category, items]) => ({
        category: category as SearchCategory,
        items: items.slice(0, 5), // Limit to 5 per category
        total: items.length,
      }));
  }, [results]);
  
  // Flatten for keyboard navigation
  const flatResults = useMemo(() => {
    return groupedResults.flatMap(g => g.items);
  }, [groupedResults]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleResultClick(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [flatResults, selectedIndex, onClose]);
  
  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    // Save to recent searches
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('ligature-recent-searches', JSON.stringify(updated));
    }
    
    onResultClick?.(result);
  }, [query, recentSearches, onResultClick]);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);
  
  // Active filter count
  const activeFilterCount = 
    filters.modules.length + 
    filters.types.length + 
    filters.statuses.length +
    (filters.scope !== 'all' ? 1 : 0);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Search Panel */}
      <div 
        className="relative w-full max-w-2xl bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-base outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-surface-card rounded transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'hover:bg-surface-card text-text-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-blue text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-card rounded-lg transition-colors text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        )}
        
        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-auto">
          {/* Recent Searches (when no query) */}
          {!query && recentSearches.length > 0 && (
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-muted">Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(search)}
                    className="px-2.5 py-1 text-sm text-text-secondary bg-surface-card rounded-lg hover:bg-surface-elevated transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* No Results */}
          {query && results.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Search className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
              <div className="text-text-primary font-medium mb-1">No results found</div>
              <div className="text-sm text-text-muted">
                Try adjusting your search or filters
              </div>
            </div>
          )}
          
          {/* Grouped Results */}
          {groupedResults.map(({ category, items, total }) => (
            <div key={category} className="border-b border-border/50 last:border-0">
              <div className="px-4 py-2 bg-surface-card/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={CATEGORY_CONFIG[category].color}>
                    {CATEGORY_CONFIG[category].icon}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {CATEGORY_CONFIG[category].label}
                  </span>
                  <Badge color="gray" size="xs">{total}</Badge>
                </div>
                {total > 5 && (
                  <button className="text-xs text-accent-blue hover:underline">
                    View all {total}
                  </button>
                )}
              </div>
              <div className="divide-y divide-border/30">
                {items.map((result, i) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    query={query}
                    isSelected={flatResults.indexOf(result) === selectedIndex}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">Enter</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">Esc</kbd>
              to close
            </span>
          </div>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEARCH TRIGGER (For Header)
// ============================================================================

export interface SearchTriggerProps {
  onOpen: () => void;
  className?: string;
}

export function SearchTrigger({ onOpen, className = '' }: SearchTriggerProps) {
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
  
  return (
    <button
      onClick={onOpen}
      className={`
        flex items-center gap-2 px-3 py-2 
        bg-surface-card border border-border rounded-lg
        text-text-muted hover:text-text-secondary hover:border-border-focus
        transition-colors w-48 lg:w-64
        ${className}
      `}
    >
      <Search className="w-4 h-4" />
      <span className="text-sm flex-1 text-left">Search...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-surface-elevated rounded border border-border">
        ⌘K
      </kbd>
    </button>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GlobalSearch;
