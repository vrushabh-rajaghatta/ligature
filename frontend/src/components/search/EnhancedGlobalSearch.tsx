
/**
 * EnhancedGlobalSearch Component - v0.27.74
 * 
 * Comprehensive cross-module search across all Ligature modules with:
 * - Live data from all stores (documents, HAQs, submissions, safety, TMF, QMS, CTMS)
 * - Category chips for quick filtering
 * - Real-time search with relevance scoring and highlighting
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Recent searches persistence
 * - Cross-module navigation with module indicators
 * - Demo-ready visual polish with gradients and animations
 * 
 * USAGE:
 * <EnhancedGlobalSearch 
 *   isOpen={isSearchOpen} 
 *   onClose={() => setIsSearchOpen(false)}
 *   onNavigate={(module, id) => navigateTo(module, id)}
 * />
 */


import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, Filter, Clock, ArrowRight, FileText, MessageSquare,
  AlertTriangle, Send, Microscope, ChevronRight, Check, Shield,
  FolderOpen, Edit3, Package, Sparkles, Command, Zap, Layers,
  TrendingUp, Hash, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useCrossModuleSearch, CATEGORY_CONFIG, type SearchCategory, type SearchResult } from '@/hooks/useCrossModuleSearch';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedGlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (module: string, id: string, path?: string) => void;
  placeholder?: string;
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
// HIGHLIGHT TEXT
// ============================================================================

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) 
      ? <mark key={i} className="bg-accent-amber/40 text-text-primary px-0.5 rounded">{part}</mark>
      : part
  );
}

// ============================================================================
// CATEGORY CHIP
// ============================================================================

function CategoryChip({ 
  category, 
  isActive, 
  count,
  onClick 
}: { 
  category: SearchCategory; 
  isActive: boolean;
  count: number;
  onClick: () => void;
}) {
  const config = CATEGORY_CONFIG[category];
  
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200 border
        ${isActive 
          ? `${config.bgColor} ${config?.color ?? ''} border-current shadow-sm` 
          : 'bg-surface-card border-border text-text-muted hover:text-text-secondary hover:border-border-focus'
        }
      `}
    >
      <span className={config.color}>{ICON_MAP[config.icon]}</span>
      <span>{config.label}</span>
      {count > 0 && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-[10px] font-bold
          ${isActive ? 'bg-white/20' : 'bg-surface-elevated'}
        `}>
          {count}
        </span>
      )}
      {isActive && <Check className="w-3 h-3" />}
    </button>
  );
}

// ============================================================================
// RESULT ITEM
// ============================================================================

function ResultItem({ 
  result, 
  query, 
  isSelected, 
  onClick 
}: { 
  result: SearchResult; 
  query: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const config = CATEGORY_CONFIG[result.category];
  
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left transition-all duration-150 flex items-start gap-3
        ${isSelected 
          ? 'bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border-l-2 border-accent-purple' 
          : 'hover:bg-surface-card border-l-2 border-transparent'
        }
      `}
    >
      {/* Category Icon */}
      <div className={`
        p-2 rounded-lg flex-shrink-0 transition-transform
        ${config.bgColor} ${config?.color ?? ''}
        ${isSelected ? 'scale-110' : ''}
      `}>
        {ICON_MAP[config.icon]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text-primary">
            {highlightMatch(result.title, query)}
          </span>
          {result.status && (
            <span className={`
              px-2 py-0.5 rounded-full text-[10px] font-medium border
              ${result.statusColor === 'green' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
              ${result.statusColor === 'amber' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}
              ${result.statusColor === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
              ${result.statusColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
              ${result.statusColor === 'gray' || !result.statusColor ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : ''}
            `}>
              {result.status}
            </span>
          )}
        </div>
        
        {result.subtitle && (
          <div className="text-sm text-text-muted mt-0.5 truncate">
            {highlightMatch(result.subtitle, query)}
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-xs font-medium ${config?.color ?? ''}`}>
            {config.label}
          </span>
          {result.type && (
            <>
              <span className="text-text-muted text-xs">•</span>
              <span className="text-xs text-text-muted">{result.type}</span>
            </>
          )}
          {result.relevanceScore > 80 && (
            <>
              <span className="text-text-muted text-xs">•</span>
              <span className="text-xs text-accent-green flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                High Match
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Arrow */}
      <div className={`
        flex-shrink-0 mt-2 transition-transform
        ${isSelected ? 'translate-x-1 text-accent-purple' : 'text-text-muted'}
      `}>
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

function QuickActions({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    { id: 'recent-docs', label: 'Recent Documents', icon: <FileText className="w-4 h-4" />, category: 'authoring' },
    { id: 'open-haqs', label: 'Open HAQs', icon: <MessageSquare className="w-4 h-4" />, category: 'haqs' },
    { id: 'pending-safety', label: 'Pending Safety Cases', icon: <AlertTriangle className="w-4 h-4" />, category: 'safety' },
    { id: 'active-submissions', label: 'Active Submissions', icon: <Send className="w-4 h-4" />, category: 'submissions' },
  ];

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-accent-amber" />
        <span className="text-xs font-medium text-text-muted">Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.category)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary bg-surface-card hover:bg-surface-elevated rounded-lg transition-colors border border-border hover:border-border-focus"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedGlobalSearch({
  isOpen,
  onClose,
  onNavigate,
  placeholder = 'Search across all modules...',
}: EnhancedGlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<SearchCategory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Use cross-module search hook
  const { search, totalItems, getSuggestions } = useCrossModuleSearch();
  
  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setActiveCategories([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ligature-recent-searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);
  
  // Perform search
  const results = useMemo(() => {
    return search(query, { 
      categories: activeCategories.length > 0 ? activeCategories : undefined 
    });
  }, [query, activeCategories, search]);
  
  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<SearchCategory, number> = {
      documents: 0,
      authoring: 0,
      submissions: 0,
      haqs: 0,
      safety: 0,
      tmf: 0,
      qms: 0,
      ctms: 0,
      products: 0,
    };
    
    // Search all results without category filter to get counts
    const allResults = search(query, {});
    allResults.forEach(r => {
      counts[r.category]++;
    });
    
    return counts;
  }, [query, search]);
  
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
      groups[r.category].push(r);
    });
    
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([category, items]) => ({
        category: category as SearchCategory,
        items: items.slice(0, 5),
        total: items.length,
      }));
  }, [results]);
  
  // Flatten for keyboard navigation
  const flatResults = useMemo(() => {
    return groupedResults.flatMap(g => g.items);
  }, [groupedResults]);
  
  // Toggle category filter
  const toggleCategory = useCallback((category: SearchCategory) => {
    setActiveCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    setSelectedIndex(0);
  }, []);
  
  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    // Save to recent searches
    if (query.trim()) {
      try {
        const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('ligature-recent-searches', JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
    }
    
    // Navigate
    if (onNavigate && result.path) {
      const [module, ...rest] = result.path.split('/').filter(Boolean);
      onNavigate(module, rest.join('/'), result.path);
    }
    
    onClose();
  }, [query, recentSearches, onNavigate, onClose]);
  
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
        onClose();
        break;
    }
  }, [flatResults, selectedIndex, handleResultClick, onClose]);
  
  // Quick action handler
  const handleQuickAction = useCallback((category: string) => {
    setActiveCategories([category as SearchCategory]);
    setQuery('');
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Search Panel */}
      <div 
        className="relative w-full max-w-3xl bg-surface-elevated border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-accent-purple/10 via-accent-blue/10 to-accent-teal/10 border-b border-border">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-blue/20">
              <Search className="w-5 h-5 text-accent-purple" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-lg outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1.5 hover:bg-surface-card rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <kbd className="px-1.5 py-0.5 bg-surface-card rounded border border-border">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-card rounded border border-border">K</kbd>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors text-text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Category Chips */}
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_CONFIG) as SearchCategory[]).map(category => (
              <CategoryChip
                key={category}
                category={category}
                isActive={activeCategories.includes(category)}
                count={categoryCounts[category]}
                onClick={() => toggleCategory(category)}
              />
            ))}
            {activeCategories.length > 0 && (
              <button
                onClick={() => setActiveCategories([])}
                className="text-xs text-accent-blue hover:underline px-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        
        {/* Results */}
        <div ref={resultsRef} className="max-h-[55vh] overflow-auto">
          {/* No Query - Show Quick Actions & Recent */}
          {!query && activeCategories.length === 0 && (
            <>
              <QuickActions onAction={handleQuickAction} />
              
              {recentSearches.length > 0 && (
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
                        className="px-3 py-1.5 text-sm text-text-secondary bg-surface-card rounded-lg hover:bg-surface-elevated transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Index Stats */}
              <div className="px-4 py-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-card rounded-full">
                  <Layers className="w-4 h-4 text-accent-purple" />
                  <span className="text-sm text-text-muted">
                    <span className="font-semibold text-text-primary">{totalItems}</span> items indexed across all modules
                  </span>
                </div>
              </div>
            </>
          )}
          
          {/* No Results */}
          {(query || activeCategories.length > 0) && results.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-card flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-text-muted" />
              </div>
              <div className="text-text-primary font-medium mb-1">No results found</div>
              <div className="text-sm text-text-muted">
                Try adjusting your search or removing filters
              </div>
            </div>
          )}
          
          {/* Grouped Results */}
          {groupedResults.map(({ category, items, total }) => {
            const config = CATEGORY_CONFIG[category];
            return (
              <div key={category} className="border-b border-border/50 last:border-0">
                <div className="px-4 py-2 bg-surface-card/50 flex items-center justify-between sticky top-0">
                  <div className="flex items-center gap-2">
                    <span className={config.color}>
                      {ICON_MAP[config.icon]}
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {config.label}
                    </span>
                    <Badge color="gray" size="xs">{total}</Badge>
                  </div>
                  {total > 5 && (
                    <button 
                      onClick={() => {
                        setActiveCategories([category]);
                      }}
                      className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                    >
                      View all {total}
                      <ExternalLink className="w-3 h-3" />
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
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">Enter</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-border">Esc</kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            )}
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-purple" />
              Cross-module search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedGlobalSearch;
