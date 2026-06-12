

/**
 * AuditTimeline - v129
 * 
 * Version history and audit trail visualization components.
 * Features:
 * - Chronological timeline display
 * - Version comparison views
 * - Change tracking visualization
 * - Collapsible detail panels
 * - User attribution
 * - Filter by action type
 */

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  History, Clock, User, ChevronDown, ChevronRight, ChevronUp,
  FileText, Edit3, Check, X, Plus, Trash2, Eye, GitBranch,
  AlertCircle, ArrowRight, Filter, Calendar, RefreshCw,
  Sparkles, MessageSquare, Link2, Copy, ExternalLink,
  GitCompare, Layers, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type AuditActionCategory = 
  | 'create' | 'update' | 'delete' | 'approve' | 'reject'
  | 'submit' | 'review' | 'ai-action' | 'system' | 'access';

export interface AuditTimelineEntry {
  id: string;
  timestamp: string;
  
  // Action details
  action: string;
  actionCategory: AuditActionCategory;
  description: string;
  
  // Actor
  userId: string;
  userName: string;
  userRole?: string;
  
  // Target
  targetType: string;
  targetId: string;
  targetName: string;
  
  // Version info
  version?: string;
  previousVersion?: string;
  
  // Change details
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Related entries
  correlationId?: string;
  parentId?: string;
  
  // AI-specific
  aiGenerated?: boolean;
  aiModel?: string;
}

export interface AuditTimelineProps {
  /** Timeline entries */
  entries: AuditTimelineEntry[];
  /** Title for the timeline */
  title?: string;
  /** Show header */
  showHeader?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Max entries to show initially */
  initialLimit?: number;
  /** Enable filtering */
  showFilters?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** On entry click */
  onEntryClick?: (entry: AuditTimelineEntry) => void;
  /** Show version comparison */
  showVersionCompare?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const actionCategoryConfig: Record<AuditActionCategory, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
}> = {
  create: {
    icon: <Plus className="w-3.5 h-3.5" />,
    color: 'text-accent-green',
    bg: 'bg-accent-green/20',
    label: 'Created',
  },
  update: {
    icon: <Edit3 className="w-3.5 h-3.5" />,
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/20',
    label: 'Updated',
  },
  delete: {
    icon: <Trash2 className="w-3.5 h-3.5" />,
    color: 'text-accent-red',
    bg: 'bg-accent-red/20',
    label: 'Deleted',
  },
  approve: {
    icon: <Check className="w-3.5 h-3.5" />,
    color: 'text-accent-green',
    bg: 'bg-accent-green/20',
    label: 'Approved',
  },
  reject: {
    icon: <X className="w-3.5 h-3.5" />,
    color: 'text-accent-red',
    bg: 'bg-accent-red/20',
    label: 'Rejected',
  },
  submit: {
    icon: <ArrowUpRight className="w-3.5 h-3.5" />,
    color: 'text-accent-purple',
    bg: 'bg-accent-purple/20',
    label: 'Submitted',
  },
  review: {
    icon: <Eye className="w-3.5 h-3.5" />,
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/20',
    label: 'Reviewed',
  },
  'ai-action': {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-accent-teal',
    bg: 'bg-accent-teal/20',
    label: 'AI Action',
  },
  system: {
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    label: 'System',
  },
  access: {
    icon: <ExternalLink className="w-3.5 h-3.5" />,
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    label: 'Accessed',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function groupByDate(entries: AuditTimelineEntry[]): Map<string, AuditTimelineEntry[]> {
  const groups = new Map<string, AuditTimelineEntry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dateKey = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
    });
    
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, entry]);
  });
  
  return groups;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TimelineEntryProps {
  entry: AuditTimelineEntry;
  compact?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

function TimelineEntry({ entry, compact, isFirst, isLast, onClick }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const config = actionCategoryConfig[entry.actionCategory];
  const hasChanges = entry.changes && entry.changes.length > 0;
  
  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${config?.bg ?? ''} ${config?.color ?? ''}
          ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-border' : ''}
        `}>
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
        )}
      </div>
      
      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <div 
          className={`
            bg-surface-elevated border border-border rounded-lg p-3
            ${onClick ? 'cursor-pointer hover:border-accent-blue/30' : ''}
          `}
          onClick={onClick}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-text-primary">
                  {entry.action}
                </span>
                {entry.aiGenerated && (
                  <Badge color="teal" size="xs" icon={<Sparkles className="w-3 h-3" />}>
                    AI
                  </Badge>
                )}
                {entry.version && (
                  <Badge color="blue" size="xs">v{entry.version}</Badge>
                )}
              </div>
              
              {!compact && (
                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                  {entry.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-text-muted" title={formatFullTimestamp(entry.timestamp)}>
                {formatTimestamp(entry.timestamp)}
              </span>
              {hasChanges && !compact && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="p-1 hover:bg-surface-card rounded"
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* User info */}
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            <User className="w-3 h-3" />
            <span>{entry.userName}</span>
            {entry.userRole && (
              <>
                <span>•</span>
                <span>{entry.userRole}</span>
              </>
            )}
          </div>
          
          {/* Target */}
          {!compact && (
            <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
              <FileText className="w-3 h-3" />
              <span className="text-text-secondary">{entry.targetName}</span>
            </div>
          )}
          
          {/* Expanded changes */}
          {expanded && hasChanges && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-xs font-medium text-text-muted mb-2">Changes</div>
              {entry.changes!.map((change, idx) => (
                <div key={idx} className="bg-surface-card rounded p-2 text-xs">
                  <div className="font-medium text-text-secondary mb-1">{change.field}</div>
                  <div className="flex items-start gap-2">
                    {change.oldValue && (
                      <div className="flex-1">
                        <span className="text-accent-red line-through">{change.oldValue}</span>
                      </div>
                    )}
                    {change.oldValue && change.newValue && (
                      <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />
                    )}
                    {change.newValue && (
                      <div className="flex-1">
                        <span className="text-accent-green">{change.newValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* AI details */}
          {expanded && entry.aiGenerated && entry.aiModel && (
            <div className="mt-2 text-xs text-text-muted">
              <span>Model: {entry.aiModel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DateGroupProps {
  date: string;
  entries: AuditTimelineEntry[];
  compact?: boolean;
  onEntryClick?: (entry: AuditTimelineEntry) => void;
}

function DateGroup({ date, entries, compact, onEntryClick }: DateGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-3 group"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
        <span className="text-sm font-medium text-text-secondary">{date}</span>
        <Badge color="gray" size="xs">{entries.length}</Badge>
      </button>
      
      {!collapsed && (
        <div className="ml-2">
          {entries.map((entry, idx) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              compact={compact}
              isFirst={idx === 0}
              isLast={idx === entries.length - 1}
              onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditTimeline({
  entries,
  title = 'Audit Trail',
  showHeader = true,
  compact = false,
  initialLimit = 20,
  showFilters = false,
  isLoading = false,
  emptyMessage = 'No audit history',
  onEntryClick,
  showVersionCompare = false,
}: AuditTimelineProps) {
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory | 'all'>('all');
  const [showAll, setShowAll] = useState(false);
  
  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    
    if (selectedCategory !== 'all') {
      result = result.filter(e => e.actionCategory === selectedCategory);
    }
    
    return result.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [entries, selectedCategory]);
  
  // Limit entries
  const displayEntries = showAll ? filteredEntries : filteredEntries.slice(0, initialLimit);
  const hasMore = filteredEntries.length > initialLimit;
  
  // Group by date
  const groupedEntries = useMemo(() => groupByDate(displayEntries), [displayEntries]);
  
  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    entries.forEach(e => {
      counts[e.actionCategory] = (counts[e.actionCategory] || 0) + 1;
    });
    return counts;
  }, [entries]);
  
  return (
    <Card variant="elevated" padding="lg" radius="lg">
      {showHeader && (
        <CardHeader
          title={title}
          icon={<History className="w-5 h-5 text-accent-purple" />}
          action={
            <div className="flex items-center gap-2">
              <Badge color="gray" size="sm">{entries.length} entries</Badge>
            </div>
          }
        />
      )}
      
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border overflow-x-auto">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
          {(['all', 'create', 'update', 'approve', 'submit', 'ai-action'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                transition-colors
                ${selectedCategory === cat
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                }
              `}
            >
              {cat === 'all' ? 'All' : actionCategoryConfig[cat]?.label}
              {categoryCounts[cat] > 0 && (
                <span className="ml-1 opacity-75">({categoryCounts[cat]})</span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Content */}
      {isLoading ? (
        <ListSkeleton items={5} showIcon />
      ) : displayEntries.length > 0 ? (
        <>
          {Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
            <DateGroup
              key={date}
              date={date}
              entries={dateEntries}
              compact={compact}
              onEntryClick={onEntryClick}
            />
          ))}
          
          {hasMore && !showAll && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
              >
                Show {filteredEntries.length - initialLimit} more entries
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          type="no-data"
          size="sm"
          title={emptyMessage}
          icon={<History className="w-8 h-8" />}
        />
      )}
    </Card>
  );
}

// ============================================================================
// VERSION COMPARISON COMPONENT
// ============================================================================

interface VersionCompareProps {
  versions: Array<{
    version: string;
    timestamp: string;
    author: string;
    changes: number;
    summary?: string;
  }>;
  currentVersion: string;
  onCompare?: (v1: string, v2: string) => void;
}

export function VersionCompare({ versions, currentVersion, onCompare }: VersionCompareProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  
  const toggleVersion = (version: string) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter(v => v !== version));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version]);
    }
  };
  
  const canCompare = selectedVersions.length === 2;
  
  return (
    <Card variant="elevated" padding="lg" radius="lg">
      <CardHeader
        title="Version History"
        icon={<GitBranch className="w-5 h-5 text-accent-blue" />}
        action={
          canCompare && onCompare && (
            <Button
              variant="primary"
              size="sm"
              icon={<GitCompare className="w-4 h-4" />}
              onClick={() => onCompare(selectedVersions[0], selectedVersions[1])}
            >
              Compare
            </Button>
          )
        }
      />
      
      <div className="space-y-2">
        {versions.map((v, idx) => (
          <div
            key={v.version}
            onClick={() => toggleVersion(v.version)}
            className={`
              flex items-center gap-3 p-3 rounded-lg cursor-pointer
              transition-colors border
              ${selectedVersions.includes(v.version)
                ? 'bg-accent-blue/10 border-accent-blue/30'
                : 'bg-surface-card border-border hover:border-accent-blue/20'
              }
              ${v.version === currentVersion ? 'ring-1 ring-accent-green' : ''}
            `}
          >
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
              ${selectedVersions.includes(v.version) 
                ? 'bg-accent-blue text-white' 
                : 'bg-surface-elevated text-text-secondary'
              }
            `}>
              {selectedVersions.indexOf(v.version) + 1 || ''}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">v{v.version}</span>
                {v.version === currentVersion && (
                  <Badge color="green" size="xs">Current</Badge>
                )}
                {idx === 0 && v.version !== currentVersion && (
                  <Badge color="blue" size="xs">Latest</Badge>
                )}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {v.author} • {formatTimestamp(v.timestamp)}
                {v.changes > 0 && ` • ${v.changes} changes`}
              </div>
              {v.summary && (
                <p className="text-xs text-text-secondary mt-1 line-clamp-1">{v.summary}</p>
              )}
            </div>
            
            <Layers className="w-4 h-4 text-text-muted" />
          </div>
        ))}
      </div>
      
      {selectedVersions.length > 0 && selectedVersions.length < 2 && (
        <p className="text-xs text-text-muted text-center mt-3">
          Select another version to compare
        </p>
      )}
    </Card>
  );
}

// ============================================================================
// COMPACT TIMELINE WIDGET
// ============================================================================

export function AuditTimelineWidget({ 
  entries,
  limit = 5,
  onViewAll,
}: { 
  entries: AuditTimelineEntry[];
  limit?: number;
  onViewAll?: () => void;
}) {
  const recentEntries = entries.slice(0, limit);
  
  return (
    <Card variant="elevated" padding="md" radius="lg">
      <CardHeader
        title="Recent Activity"
        icon={<Clock className="w-4 h-4 text-accent-teal" />}
        action={
          onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )
        }
      />
      
      {recentEntries.length > 0 ? (
        <div className="space-y-2">
          {recentEntries.map(entry => {
            const config = actionCategoryConfig[entry.actionCategory];
            return (
              <div key={entry.id} className="flex items-center gap-3 py-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config?.bg ?? ''} ${config?.color ?? ''}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{entry.action}</p>
                  <p className="text-xs text-text-muted">
                    {entry.userName} • {formatTimestamp(entry.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-4">No recent activity</p>
      )}
    </Card>
  );
}

export default AuditTimeline;
