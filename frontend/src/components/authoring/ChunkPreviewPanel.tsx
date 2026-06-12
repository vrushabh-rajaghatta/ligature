

import React, { useState, useMemo } from 'react';
import {
  Layers,
  FileText,
  Table2,
  Image,
  Heading,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
  Filter,
  Eye,
  EyeOff,
  Zap,
  Hash,
  BookOpen,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

// ============================================================================
// Types
// ============================================================================

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  type: 'text' | 'table' | 'figure' | 'heading';
}

export interface ChunkPreviewPanelProps {
  /** Source document name */
  sourceName: string;
  /** Array of text chunks */
  chunks: TextChunk[];
  /** Total token count for source */
  totalTokens?: number;
  /** Callback when chunk is selected for inclusion */
  onSelectChunks?: (chunkIds: string[]) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether panel is open */
  isOpen?: boolean;
  /** Maximum tokens to show in context */
  maxContextTokens?: number;
  /** Class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CHUNK_TYPE_INFO: Record<TextChunk['type'], {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  text: {
    icon: <FileText className="w-4 h-4" />,
    label: 'Text',
    color: 'blue',
  },
  table: {
    icon: <Table2 className="w-4 h-4" />,
    label: 'Table',
    color: 'green',
  },
  figure: {
    icon: <Image className="w-4 h-4" />,
    label: 'Figure',
    color: 'purple',
  },
  heading: {
    icon: <Heading className="w-4 h-4" />,
    label: 'Heading',
    color: 'amber',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  return `${(tokens / 1000).toFixed(1)}K`;
}

function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

const ChunkTypeBadge: React.FC<{ type: TextChunk['type'] }> = ({ type }) => {
  const info = CHUNK_TYPE_INFO[type];
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[info.color]}`}>
      {info.icon}
      {info.label}
    </span>
  );
};

const ChunkCard: React.FC<{
  chunk: TextChunk;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onCopy: () => void;
}> = ({ chunk, isSelected, isExpanded, onSelect, onToggleExpand, onCopy }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };
  
  return (
    <div
      className={`
        border rounded-lg transition-all
        ${isSelected 
          ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 ring-1 ring-blue-300' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
        }
      `}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`
            w-5 h-5 rounded border flex items-center justify-center flex-shrink-0
            ${isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300 hover:border-blue-400'
            }
          `}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>
        
        <button className="text-gray-400 flex-shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              #{chunk.index + 1}
            </span>
            <ChunkTypeBadge type={chunk.type} />
            {chunk.sectionTitle && (
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {chunk.sectionTitle}
              </span>
            )}
          </div>
          
          {!isExpanded && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
              {truncateText(chunk.text, 100)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500">
            pp. {chunk.pageStart}{chunk.pageEnd !== chunk.pageStart ? `-${chunk.pageEnd}` : ''}
          </span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {formatTokenCount(chunk.tokenCount)} tokens
          </span>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 relative">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Copy text"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono pr-8 max-h-64 overflow-y-auto">
              {chunk.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function ChunkPreviewPanel({
  sourceName,
  chunks,
  totalTokens,
  onSelectChunks,
  onClose,
  isOpen = true,
  maxContextTokens = 100000,
  className = '',
}: ChunkPreviewPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TextChunk['type'] | 'all'>('all');
  const [showSelected, setShowSelected] = useState(false);
  
  // Calculate selected tokens
  const selectedTokens = useMemo(() => {
    return chunks
      .filter(c => selectedIds.has(c.id))
      .reduce((sum, c) => sum + c.tokenCount, 0);
  }, [chunks, selectedIds]);
  
  // Filter chunks
  const filteredChunks = useMemo(() => {
    return chunks.filter(chunk => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const inText = chunk.text.toLowerCase().includes(query);
        const inSection = chunk.sectionTitle?.toLowerCase().includes(query);
        if (!inText && !inSection) return false;
      }
      if (typeFilter !== 'all' && chunk.type !== typeFilter) return false;
      if (showSelected && !selectedIds.has(chunk.id)) return false;
      return true;
    });
  }, [chunks, searchQuery, typeFilter, showSelected, selectedIds]);
  
  // Group by section
  const groupedChunks = useMemo(() => {
    const groups: Record<string, TextChunk[]> = {};
    filteredChunks.forEach(chunk => {
      const section = chunk.sectionTitle || 'Other';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(chunk);
    });
    return groups;
  }, [filteredChunks]);
  
  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(filteredChunks.map(c => c.id)));
  };
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };
  
  const expandAll = () => {
    setExpandedIds(new Set(filteredChunks.map(c => c.id)));
  };
  
  const collapseAll = () => {
    setExpandedIds(new Set());
  };
  
  // Token budget indicator
  const tokenBudgetPercent = Math.min((selectedTokens / maxContextTokens) * 100, 100);
  const isOverBudget = selectedTokens > maxContextTokens;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose?.()}
      title=""
      size="xl"
    >
      <div className={`max-h-[80vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Chunk Preview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {sourceName} • {chunks.length} chunks • {formatTokenCount(totalTokens || 0)} total tokens
            </p>
          </div>
          
          <button
            onClick={() => onClose?.()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Token Budget Indicator */}
        <div className="py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Context Budget
            </span>
            <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {formatTokenCount(selectedTokens)} / {formatTokenCount(maxContextTokens)} tokens
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverBudget 
                  ? 'bg-red-500' 
                  : tokenBudgetPercent > 75 
                    ? 'bg-amber-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(tokenBudgetPercent, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <p className="text-xs text-red-600 mt-1">
              Selection exceeds context budget. Some chunks may be truncated.
            </p>
          )}
        </div>
        
        {/* Filters & Actions */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chunks..."
              className="w-64"
            />
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="table">Table</option>
              <option value="figure">Figure</option>
              <option value="heading">Heading</option>
            </select>
            
            <button
              onClick={() => setShowSelected(!showSelected)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm
                ${showSelected 
                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              {showSelected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Selected Only
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
            
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={expandedIds.size > 0 ? collapseAll : expandAll}>
              {expandedIds.size > 0 ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
        </div>
        
        {/* Chunk List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {Object.entries(groupedChunks).map(([section, sectionChunks]) => (
            <div key={section}>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {section}
                <Badge color="gray">{sectionChunks.length}</Badge>
              </h4>
              
              <div className="space-y-2">
                {sectionChunks.map(chunk => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    isSelected={selectedIds.has(chunk.id)}
                    isExpanded={expandedIds.has(chunk.id)}
                    onSelect={() => toggleSelection(chunk.id)}
                    onToggleExpand={() => toggleExpand(chunk.id)}
                    onCopy={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {filteredChunks.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {chunks.length === 0 
                ? 'No chunks available'
                : 'No chunks match your filters'
              }
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            Selected chunks will be included in AI context
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onClose?.()}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSelectChunks?.(Array.from(selectedIds));
                onClose?.();
              }}
              disabled={selectedIds.size === 0}
            >
              <Zap className="w-4 h-4 mr-1" />
              Use {selectedIds.size} Chunks
              {selectedIds.size > 0 && (
                <span className="ml-1 text-xs opacity-75">
                  ({formatTokenCount(selectedTokens)} tokens)
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ChunkPreviewPanel;
