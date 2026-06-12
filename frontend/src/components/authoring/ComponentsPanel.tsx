

import { useState, useCallback, useMemo } from 'react';
import {
  Layers, Search, Plus, Check, CheckCircle, Clock, AlertCircle,
  Copy, FileText, Shield, BarChart3, Beaker, ChevronDown, ChevronRight,
  ExternalLink, Star, History, Edit3, Trash2
} from 'lucide-react';
import { ComponentLibraryItem } from '@/types/authoring';
import { componentLibrary } from '@/data/authoring-data';
import { useToast } from '@/components/ui/Toast';

interface ComponentsPanelProps {
  documentType: string;
  onInsertComponent: (component: ComponentLibraryItem, position?: 'cursor' | 'end') => void;
  onViewComponent?: (component: ComponentLibraryItem) => void;
}

type ComponentCategory = 'all' | 'mechanism-of-action' | 'safety-statement' | 'statistical-methods' | 'eligibility' | 'endpoint';

const categoryConfig: Record<ComponentCategory, { label: string; icon: React.ReactNode; color: string }> = {
  'all': { label: 'All', icon: <Layers className="w-4 h-4" />, color: 'text-text-muted' },
  'mechanism-of-action': { label: 'MOA', icon: <Beaker className="w-4 h-4" />, color: 'text-purple-400' },
  'safety-statement': { label: 'Safety', icon: <Shield className="w-4 h-4" />, color: 'text-red-400' },
  'statistical-methods': { label: 'Stats', icon: <BarChart3 className="w-4 h-4" />, color: 'text-blue-400' },
  'eligibility': { label: 'Eligibility', icon: <Check className="w-4 h-4" />, color: 'text-green-400' },
  'endpoint': { label: 'Endpoints', icon: <FileText className="w-4 h-4" />, color: 'text-amber-400' },
};

export function ComponentsPanel({
  documentType,
  onInsertComponent,
  onViewComponent,
}: ComponentsPanelProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory>('all');
  const [showApprovedOnly, setShowApprovedOnly] = useState(true);
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  
  // Filter components
  const filteredComponents = useMemo(() => {
    return componentLibrary.filter(comp => {
      // Filter by document type applicability
      if (!comp.applicableDocumentTypes?.includes(documentType as any)) {
        // Still show if it's a generic component
        if (comp.applicableDocumentTypes && comp.applicableDocumentTypes.length > 0) {
          return false;
        }
      }
      
      // Filter by category
      if (selectedCategory !== 'all' && comp.category !== selectedCategory) {
        return false;
      }
      
      // Filter by status
      if (showApprovedOnly && comp.status !== 'approved') {
        return false;
      }
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          comp.title.toLowerCase().includes(query) ||
          comp.content.toLowerCase().includes(query) ||
          comp.tags?.some(t => t.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [documentType, selectedCategory, showApprovedOnly, searchQuery]);
  
  // Get usage stats
  const usageStats = useMemo(() => {
    const usedInThisDoc = componentLibrary.filter(c => 
      c.usedInDocuments?.some(d => d.includes(documentType))
    ).length;
    const totalUsage = componentLibrary.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    return { usedInThisDoc, totalUsage };
  }, [documentType]);
  
  const toggleExpand = (compId: string) => {
    const next = new Set(expandedComponents);
    if (next.has(compId)) {
      next.delete(compId);
    } else {
      next.add(compId);
    }
    setExpandedComponents(next);
  };
  
  const handleInsert = (comp: ComponentLibraryItem) => {
    onInsertComponent(comp, 'cursor');
    
    // Track as recently used
    setRecentlyUsed(prev => {
      const next = [comp.id, ...prev.filter(id => id !== comp.id)].slice(0, 5);
      return next;
    });
    
    toast.success(`Inserted "${comp.title}"`);
  };
  
  const handleCopyToClipboard = async (comp: ComponentLibraryItem) => {
    try {
      await navigator.clipboard.writeText(comp.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };
  
  const getStatusBadge = (status: ComponentLibraryItem['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'draft':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Draft
          </span>
        );
      case 'in-review':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'retired':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Retired
          </span>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Usage Stats */}
      <div className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
        <div className="text-xs font-medium text-accent-blue mb-1">Component Reuse</div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{usageStats.usedInThisDoc} components in this doc type</span>
          <span className="text-accent-green">↑ {usageStats.totalUsage} total uses</span>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search components..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
        />
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-1">
        {(Object.entries(categoryConfig) as [ComponentCategory, typeof categoryConfig[ComponentCategory]][]).map(([cat, config]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              selectedCategory === cat
                ? 'bg-accent-blue text-white'
                : 'bg-surface-card text-text-muted hover:text-text-primary'
            }`}
          >
            {config.icon}
            {config.label}
          </button>
        ))}
      </div>
      
      {/* Approved Only Toggle */}
      <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showApprovedOnly}
          onChange={(e) => setShowApprovedOnly(e.target.checked)}
          className="rounded border-border bg-surface-card"
        />
        Show approved only
      </label>
      
      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
            <History className="w-3 h-3" />
            Recently Used
          </div>
          <div className="flex flex-wrap gap-1">
            {recentlyUsed.map(id => {
              const comp = componentLibrary.find(c => c.id === id);
              if (!comp) return null;
              return (
                <button
                  key={id}
                  onClick={() => handleInsert(comp)}
                  className="text-xs px-2 py-1 bg-surface-card rounded border border-border hover:border-accent-blue/50 truncate max-w-[150px]"
                >
                  {comp.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Components List */}
      <div className="space-y-2 max-h-[400px] overflow-auto">
        {filteredComponents.map(comp => {
          const isExpanded = expandedComponents.has(comp.id);
          const catConfig = categoryConfig[comp.category as ComponentCategory] || categoryConfig['all'];
          
          return (
            <div
              key={comp.id}
              className="bg-surface-card rounded-lg border border-border overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-3 cursor-pointer hover:bg-surface transition-colors"
                onClick={() => toggleExpand(comp.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className={catConfig.color}>
                      {catConfig.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{comp.title}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        v{comp.version} • Used {comp.usageCount}x
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(comp.status)}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border pt-3">
                  {/* Preview */}
                  <div className="p-2 bg-surface rounded text-xs text-text-secondary mb-3 max-h-32 overflow-auto">
                    {comp.content}
                  </div>
                  
                  {/* Tags */}
                  {comp.tags && comp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {comp.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-surface rounded text-text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className="text-xs text-text-muted mb-3">
                    <div>Created by {comp.createdBy}</div>
                    {comp.approvedBy && (
                      <div>Approved by {comp.approvedBy}</div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewComponent?.(comp)}
                        className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Full
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard(comp)}
                        className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={() => handleInsert(comp)}
                      className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded hover:bg-accent-blue/90 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Insert
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No components found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
      
      {/* Browse Full Library */}
      <button className="w-full py-2 text-xs text-accent-blue hover:underline flex items-center justify-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Browse Full Component Library
      </button>
      
      {/* Create New */}
      <button className="w-full py-2 text-xs bg-surface-card border border-border rounded-lg text-text-muted hover:text-text-primary hover:border-accent-blue/50 flex items-center justify-center gap-1 transition-colors">
        <Plus className="w-3 h-3" />
        Create New Component
      </button>
    </div>
  );
}
