
/**
 * Query List View Component
 * Query listing with filtering, aging tracking, and resolution workflow
 * @version 0.20.9.3
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Reply,
  MoreHorizontal,
  User,
  Building2,
  FileText,
  AlertCircle,
  Timer,
  ArrowUp,
  Send,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import type { QueryStatus, QueryType } from '@/types/clinical-form';
import type { QueryPriority, QueryCategory } from '@/services/clinical/query-management-service';

// =============================================================================
// TYPES
// =============================================================================

export interface QueryListItem {
  id: string;
  queryText: string;
  queryType: QueryType;
  status: QueryStatus;
  priority: QueryPriority;
  category: QueryCategory;
  
  // Location
  formName: string;
  fieldLabel: string;
  sectionName?: string;
  
  // Subject/Site info
  subjectId: string;
  subjectNumber: string;
  siteId: string;
  siteName: string;
  siteNumber: string;
  
  // Assignment
  openedBy: string;
  openedAt: Date;
  assignedTo?: string;
  
  // Aging
  ageInDays: number;
  isOverdue: boolean;
  dueDate?: Date;
  
  // Escalation
  escalationLevel: number;
  isEscalated: boolean;
  
  // Response
  hasResponse: boolean;
  responseCount: number;
  lastResponseAt?: Date;
  lastResponseBy?: string;
  
  // Resolution
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionType?: 'CORRECTED' | 'CONFIRMED' | 'NOT_APPLICABLE' | 'WAIVED';
}

export interface QueryListFilters {
  status?: QueryStatus[];
  priority?: QueryPriority[];
  category?: QueryCategory[];
  siteId?: string[];
  isOverdue?: boolean;
  isEscalated?: boolean;
  assignedTo?: string;
  searchTerm?: string;
}

export type QuerySortField = 'openedAt' | 'ageInDays' | 'priority' | 'subject' | 'site' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface QueryListViewProps {
  queries: QueryListItem[];
  filters?: QueryListFilters;
  onFilterChange?: (filters: QueryListFilters) => void;
  onQueryClick?: (queryId: string) => void;
  onQueryAction?: (queryId: string, action: QueryAction) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type QueryAction = 'view' | 'respond' | 'close' | 'escalate' | 'reassign';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getQueryStatusDisplayName(status: QueryStatus): string {
  const names: Record<QueryStatus, string> = {
    OPEN: 'Open',
    ANSWERED: 'Answered',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  };
  return names[status] || status;
}

export function getQueryStatusColor(status: QueryStatus): string {
  const colors: Record<QueryStatus, string> = {
    OPEN: 'text-blue-600 bg-blue-100',
    ANSWERED: 'text-amber-600 bg-amber-100',
    CLOSED: 'text-green-600 bg-green-100',
    CANCELLED: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getQueryStatusIcon(status: QueryStatus): LucideIcon {
  const icons: Record<QueryStatus, LucideIcon> = {
    OPEN: MessageCircle,
    ANSWERED: Reply,
    CLOSED: CheckCircle,
    CANCELLED: XCircle,
  };
  return icons[status] || MessageSquare;
}

export function getQueryPriorityDisplayName(priority: QueryPriority): string {
  const names: Record<QueryPriority, string> = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    CRITICAL: 'Critical',
  };
  return names[priority] || priority;
}

export function getQueryPriorityColor(priority: QueryPriority): string {
  const colors: Record<QueryPriority, string> = {
    LOW: 'text-gray-600 bg-gray-100',
    NORMAL: 'text-blue-600 bg-blue-100',
    HIGH: 'text-amber-600 bg-amber-100',
    CRITICAL: 'text-red-600 bg-red-100',
  };
  return colors[priority] || 'text-gray-600 bg-gray-100';
}

export function getQueryCategoryDisplayName(category: QueryCategory): string {
  const names: Record<QueryCategory, string> = {
    DATA_CLARIFICATION: 'Data Clarification',
    MISSING_DATA: 'Missing Data',
    OUT_OF_RANGE: 'Out of Range',
    INCONSISTENT_DATA: 'Inconsistent Data',
    PROTOCOL_DEVIATION: 'Protocol Deviation',
    SOURCE_VERIFICATION: 'Source Verification',
    CODING: 'Coding',
    OTHER: 'Other',
  };
  return names[category] || category;
}

export function getQueryCategoryColor(category: QueryCategory): string {
  const colors: Record<QueryCategory, string> = {
    DATA_CLARIFICATION: 'text-blue-600 bg-blue-100',
    MISSING_DATA: 'text-amber-600 bg-amber-100',
    OUT_OF_RANGE: 'text-red-600 bg-red-100',
    INCONSISTENT_DATA: 'text-purple-600 bg-purple-100',
    PROTOCOL_DEVIATION: 'text-red-600 bg-red-100',
    SOURCE_VERIFICATION: 'text-teal-600 bg-teal-100',
    CODING: 'text-indigo-600 bg-indigo-100',
    OTHER: 'text-gray-600 bg-gray-100',
  };
  return colors[category] || 'text-gray-600 bg-gray-100';
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeDate(date: Date | undefined): string {
  if (!date) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return formatDate(date);
}

export function formatAge(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w ${days % 7}d`;
  return `${Math.floor(days / 30)}m ${days % 30}d`;
}

export function getAgeStatus(days: number, isOverdue: boolean): 'fresh' | 'aging' | 'warning' | 'critical' {
  if (isOverdue) return 'critical';
  if (days >= 7) return 'warning';
  if (days >= 3) return 'aging';
  return 'fresh';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface QueryCardProps {
  query: QueryListItem;
  onClick?: () => void;
  onAction?: (action: QueryAction) => void;
  showActions?: boolean;
}

function QueryCard({ query, onClick, onAction, showActions = true }: QueryCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getQueryStatusIcon(query.status);
  const ageStatus = getAgeStatus(query.ageInDays, query.isOverdue);

  const ageColors = {
    fresh: 'text-green-600',
    aging: 'text-blue-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            query.status === 'CLOSED' ? 'bg-green-50' : 
            query.status === 'ANSWERED' ? 'bg-amber-50' : 
            query.isOverdue ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <StatusIcon className={`h-5 w-5 ${
              query.status === 'CLOSED' ? 'text-green-600' : 
              query.status === 'ANSWERED' ? 'text-amber-600' : 
              query.isOverdue ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getQueryStatusColor(query.status)}`}>
                {getQueryStatusDisplayName(query.status)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getQueryPriorityColor(query.priority)}`}>
                {getQueryPriorityDisplayName(query.priority)}
              </span>
              {query.isEscalated && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-0.5">
                  <ArrowUp className="h-3 w-3" />
                  L{query.escalationLevel}
                </span>
              )}
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getQueryCategoryColor(query.category)}`}>
              {getQueryCategoryDisplayName(query.category)}
            </span>
          </div>
        </div>
        {showActions && query.status !== 'CLOSED' && query.status !== 'CANCELLED' && (
          <div className="relative">
            <button
              className="p-1 hover:bg-gray-100 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction?.('view'); setShowMenu(false); }}
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                {query.status === 'OPEN' && (
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); onAction?.('respond'); setShowMenu(false); }}
                  >
                    <Reply className="h-3.5 w-3.5" /> Respond
                  </button>
                )}
                {query.status === 'ANSWERED' && (
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); onAction?.('close'); setShowMenu(false); }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Close
                  </button>
                )}
                {!query.isEscalated && query.status === 'OPEN' && (
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); onAction?.('escalate'); setShowMenu(false); }}
                  >
                    <ArrowUp className="h-3.5 w-3.5" /> Escalate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Query Text */}
      <div className="mt-3">
        <p className="text-sm text-gray-700 line-clamp-2">{query.queryText}</p>
      </div>

      {/* Field Location */}
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <FileText className="h-3 w-3" />
        <span className="truncate">{query.formName} › {query.fieldLabel}</span>
      </div>

      {/* Subject & Site Info */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <User className="h-4 w-4" />
          <span className="truncate">{query.subjectNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Building2 className="h-4 w-4" />
          <span className="truncate">Site {query.siteNumber}</span>
        </div>
      </div>

      {/* Age & Response Info */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Timer className={`h-3.5 w-3.5 ${ageColors[ageStatus]}`} />
          <span className={ageColors[ageStatus]}>{formatAge(query.ageInDays)}</span>
          {query.isOverdue && (
            <span className="text-red-600 font-medium ml-1">OVERDUE</span>
          )}
        </div>
        {query.hasResponse && (
          <div className="flex items-center gap-1 text-gray-500">
            <Reply className="h-3.5 w-3.5" />
            <span>{query.responseCount} {query.responseCount === 1 ? 'response' : 'responses'}</span>
          </div>
        )}
      </div>

      {/* Assignment */}
      {query.assignedTo && query.status !== 'CLOSED' && (
        <div className="mt-2 text-xs text-gray-500">
          Assigned to: <span className="font-medium">{query.assignedTo}</span>
        </div>
      )}
    </div>
  );
}

interface QueryFilterPanelProps {
  filters: QueryListFilters;
  onFilterChange: (filters: QueryListFilters) => void;
  availableSites: { id: string; name: string; number: string }[];
}

function QueryFilterPanel({ filters, onFilterChange, availableSites }: QueryFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions: QueryStatus[] = ['OPEN', 'ANSWERED', 'CLOSED', 'CANCELLED'];
  const priorityOptions: QueryPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
  const categoryOptions: QueryCategory[] = [
    'DATA_CLARIFICATION', 'MISSING_DATA', 'OUT_OF_RANGE', 'INCONSISTENT_DATA',
    'PROTOCOL_DEVIATION', 'SOURCE_VERIFICATION', 'CODING', 'OTHER'
  ];

  const handleStatusToggle = (status: QueryStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const handlePriorityToggle = (priority: QueryPriority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFilterChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.priority?.length || 0,
    filters.category?.length || 0,
    filters.siteId?.length || 0,
    filters.isOverdue ? 1 : 0,
    filters.isEscalated ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        className="w-full px-4 py-3 flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filters.status?.includes(status)
                      ? getQueryStatusColor(status)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleStatusToggle(status)}
                >
                  {getQueryStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => (
                <button
                  key={priority}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filters.priority?.includes(priority)
                      ? getQueryPriorityColor(priority)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handlePriorityToggle(priority)}
                >
                  {getQueryPriorityDisplayName(priority)}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Filters */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Issues</label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filters.isOverdue
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, isOverdue: !filters.isOverdue || undefined })}
              >
                Overdue
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filters.isEscalated
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, isEscalated: !filters.isEscalated || undefined })}
              >
                Escalated
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => onFilterChange({})}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QueryListView({
  queries,
  filters = {},
  onFilterChange,
  onQueryClick,
  onQueryAction,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: QueryListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<QuerySortField>('openedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const availableSites = useMemo(() => {
    const siteMap = new Map<string, { id: string; name: string; number: string }>();
    queries.forEach((q) => {
      if (!siteMap.has(q.siteId)) {
        siteMap.set(q.siteId, { id: q.siteId, name: q.siteName, number: q.siteNumber });
      }
    });
    return Array.from(siteMap.values()).sort((a, b) => a.number.localeCompare(b.number));
  }, [queries]);

  const filteredQueries = useMemo(() => {
    let result = [...queries];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (q) =>
          q.queryText.toLowerCase().includes(term) ||
          q.subjectNumber.toLowerCase().includes(term) ||
          q.siteNumber.toLowerCase().includes(term) ||
          q.fieldLabel.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((q) => filters.status!.includes(q.status));
    }

    // Priority filter
    if (filters.priority?.length) {
      result = result.filter((q) => filters.priority!.includes(q.priority));
    }

    // Category filter
    if (filters.category?.length) {
      result = result.filter((q) => filters.category!.includes(q.category));
    }

    // Site filter
    if (filters.siteId?.length) {
      result = result.filter((q) => filters.siteId!.includes(q.siteId));
    }

    // Overdue filter
    if (filters.isOverdue) {
      result = result.filter((q) => q.isOverdue);
    }

    // Escalated filter
    if (filters.isEscalated) {
      result = result.filter((q) => q.isEscalated);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'openedAt':
          comparison = a.openedAt.getTime() - b.openedAt.getTime();
          break;
        case 'ageInDays':
          comparison = a.ageInDays - b.ageInDays;
          break;
        case 'priority':
          const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'subject':
          comparison = a.subjectNumber.localeCompare(b.subjectNumber);
          break;
        case 'site':
          comparison = a.siteNumber.localeCompare(b.siteNumber);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [queries, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredQueries.length;
    const open = filteredQueries.filter((q) => q.status === 'OPEN').length;
    const answered = filteredQueries.filter((q) => q.status === 'ANSWERED').length;
    const overdue = filteredQueries.filter((q) => q.isOverdue).length;
    const avgAge = total > 0 
      ? Math.round(filteredQueries.reduce((sum, q) => sum + q.ageInDays, 0) / total) 
      : 0;
    return { total, open, answered, overdue, avgAge };
  }, [filteredQueries]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Queries</h2>
          <p className="text-sm text-gray-500">
            {stats.total} queries • {stats.open} open • {stats.answered} answered
            {stats.overdue > 0 && <span className="text-red-600"> • {stats.overdue} overdue</span>}
            {stats.avgAge > 0 && <span> • {stats.avgAge}d avg age</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={onExport}
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by query text, subject, site, or field..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <QueryFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
          availableSites={availableSites}
        />
      )}

      {/* Query Grid */}
      {filteredQueries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No queries found</p>
          {(searchTerm || Object.keys(filters).length > 0) && (
            <button
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => {
                setSearchTerm('');
                onFilterChange?.({});
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueries.map((query) => (
            <QueryCard
              key={query.id}
              query={query}
              onClick={() => onQueryClick?.(query.id)}
              onAction={(action) => onQueryAction?.(query.id, action)}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMockQueryListItem(overrides?: Partial<QueryListItem>): QueryListItem {
  return {
    id: 'query-001',
    queryText: 'Please clarify the systolic blood pressure value recorded. The value of 250 mmHg appears to be outside the expected range.',
    queryType: 'MANUAL',
    status: 'OPEN',
    priority: 'HIGH',
    category: 'OUT_OF_RANGE',
    formName: 'Vital Signs',
    fieldLabel: 'Systolic BP',
    sectionName: 'Blood Pressure',
    subjectId: 'subj-001',
    subjectNumber: 'SUBJ-001',
    siteId: 'site-001',
    siteName: 'Memorial Hospital',
    siteNumber: '001',
    openedBy: 'Data Manager',
    openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    assignedTo: 'Site Coordinator',
    ageInDays: 5,
    isOverdue: false,
    escalationLevel: 0,
    isEscalated: false,
    hasResponse: false,
    responseCount: 0,
    ...overrides,
  };
}

export default QueryListView;
