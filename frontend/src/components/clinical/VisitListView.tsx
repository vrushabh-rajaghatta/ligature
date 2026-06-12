
/**
 * Visit List View Component
 * Visit listing with filtering, window tracking, and status management
 * @version 0.20.9.3
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
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
  MoreHorizontal,
  User,
  Building2,
  FileText,
  ClipboardCheck,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import type { VisitType, VisitStatus } from '@/types/clinical-visit';

// =============================================================================
// TYPES
// =============================================================================

export interface VisitListItem {
  id: string;
  visitName: string;
  visitNumber: number;
  visitCode?: string;
  visitType: VisitType;
  status: VisitStatus;
  
  // Subject info
  subjectId: string;
  subjectNumber: string;
  
  // Site info
  siteId: string;
  siteName: string;
  siteNumber: string;
  
  // Scheduling
  scheduledDate: Date;
  windowStart: Date;
  windowEnd: Date;
  actualDate?: Date;
  
  // Window status
  isInWindow: boolean;
  isOverdue: boolean;
  daysFromTarget: number;
  
  // Completion
  formsRequired: number;
  formsCompleted: number;
  proceduresRequired: number;
  proceduresCompleted: number;
  
  // Flags
  hasDeviations: boolean;
  deviationCount: number;
  isCritical: boolean;
  
  // Personnel
  conductedBy?: string;
  
  // Notes
  notes?: string;
}

export interface VisitListFilters {
  status?: VisitStatus[];
  visitType?: VisitType[];
  siteId?: string[];
  dateRange?: { start: Date; end: Date };
  isOverdue?: boolean;
  hasDeviations?: boolean;
  isCritical?: boolean;
  searchTerm?: string;
}

export type VisitSortField = 'scheduledDate' | 'visitNumber' | 'subject' | 'site' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface VisitListViewProps {
  visits: VisitListItem[];
  filters?: VisitListFilters;
  onFilterChange?: (filters: VisitListFilters) => void;
  onVisitClick?: (visitId: string) => void;
  onVisitAction?: (visitId: string, action: VisitAction) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type VisitAction = 'view' | 'edit' | 'complete' | 'miss' | 'reschedule';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getVisitTypeDisplayName(type: VisitType): string {
  const names: Record<VisitType, string> = {
    SCREENING: 'Screening',
    BASELINE: 'Baseline',
    TREATMENT: 'Treatment',
    FOLLOWUP: 'Follow-up',
    EARLY_TERMINATION: 'Early Termination',
    UNSCHEDULED: 'Unscheduled',
  };
  return names[type] || type;
}

export function getVisitTypeColor(type: VisitType): string {
  const colors: Record<VisitType, string> = {
    SCREENING: 'text-blue-600 bg-blue-100',
    BASELINE: 'text-purple-600 bg-purple-100',
    TREATMENT: 'text-green-600 bg-green-100',
    FOLLOWUP: 'text-teal-600 bg-teal-100',
    EARLY_TERMINATION: 'text-red-600 bg-red-100',
    UNSCHEDULED: 'text-gray-600 bg-gray-100',
  };
  return colors[type] || 'text-gray-600 bg-gray-100';
}

export function getVisitStatusDisplayName(status: VisitStatus): string {
  const names: Record<VisitStatus, string> = {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    MISSED: 'Missed',
    PARTIALLY_COMPLETE: 'Partial',
  };
  return names[status] || status;
}

export function getVisitStatusColor(status: VisitStatus): string {
  const colors: Record<VisitStatus, string> = {
    SCHEDULED: 'text-blue-600 bg-blue-100',
    COMPLETED: 'text-green-600 bg-green-100',
    MISSED: 'text-red-600 bg-red-100',
    PARTIALLY_COMPLETE: 'text-amber-600 bg-amber-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getVisitStatusIcon(status: VisitStatus): LucideIcon {
  const icons: Record<VisitStatus, LucideIcon> = {
    SCHEDULED: CalendarClock,
    COMPLETED: CalendarCheck,
    MISSED: CalendarX,
    PARTIALLY_COMPLETE: AlertCircle,
  };
  return icons[status] || Calendar;
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDaysFromTarget(days: number): string {
  if (days === 0) return 'On target';
  if (days > 0) return `${days}d late`;
  return `${Math.abs(days)}d early`;
}

export function getWindowStatus(visit: VisitListItem): 'in_window' | 'early' | 'late' | 'overdue' {
  if (visit.status === 'COMPLETED' || visit.status === 'MISSED') {
    if (visit.actualDate) {
      if (visit.actualDate < visit.windowStart) return 'early';
      if (visit.actualDate > visit.windowEnd) return 'late';
    }
    return 'in_window';
  }
  if (visit.isOverdue) return 'overdue';
  return 'in_window';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VisitCardProps {
  visit: VisitListItem;
  onClick?: () => void;
  onAction?: (action: VisitAction) => void;
  showActions?: boolean;
}

function VisitCard({ visit, onClick, onAction, showActions = true }: VisitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getVisitStatusIcon(visit.status);
  const windowStatus = getWindowStatus(visit);
  const completionPercent = visit.formsRequired > 0 
    ? Math.round((visit.formsCompleted / visit.formsRequired) * 100) 
    : 0;

  const windowStatusColors = {
    in_window: 'border-green-200 bg-green-50',
    early: 'border-blue-200 bg-blue-50',
    late: 'border-amber-200 bg-amber-50',
    overdue: 'border-red-200 bg-red-50',
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
            visit.status === 'COMPLETED' ? 'bg-green-50' : 
            visit.status === 'MISSED' ? 'bg-red-50' : 
            visit.isOverdue ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <StatusIcon className={`h-5 w-5 ${
              visit.status === 'COMPLETED' ? 'text-green-600' : 
              visit.status === 'MISSED' ? 'text-red-600' : 
              visit.isOverdue ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{visit.visitName}</span>
              {visit.visitCode && (
                <span className="text-xs text-gray-400">({visit.visitCode})</span>
              )}
              {visit.isCritical && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  Critical
                </span>
              )}
            </div>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${getVisitStatusColor(visit.status)}`}>
              {getVisitStatusDisplayName(visit.status)}
            </span>
          </div>
        </div>
        {showActions && (
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
                {visit.status === 'SCHEDULED' && (
                  <>
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); onAction?.('complete'); setShowMenu(false); }}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Complete
                    </button>
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); onAction?.('reschedule'); setShowMenu(false); }}
                    >
                      <Calendar className="h-3.5 w-3.5" /> Reschedule
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subject & Site Info */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <User className="h-4 w-4" />
          <span className="truncate">{visit.subjectNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Building2 className="h-4 w-4" />
          <span className="truncate">Site {visit.siteNumber}</span>
        </div>
      </div>

      {/* Visit Window */}
      <div className={`mt-3 p-2 rounded border ${windowStatusColors[windowStatus]}`}>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-gray-500 text-xs">Window</p>
            <p className="font-medium text-gray-700">
              {formatShortDate(visit.windowStart)} – {formatShortDate(visit.windowEnd)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">
              {visit.status === 'COMPLETED' ? 'Actual' : 'Scheduled'}
            </p>
            <p className="font-medium text-gray-900">
              {formatShortDate(visit.actualDate || visit.scheduledDate)}
            </p>
          </div>
        </div>
        {visit.status !== 'COMPLETED' && visit.daysFromTarget !== 0 && (
          <p className={`text-xs mt-1 ${
            visit.isOverdue ? 'text-red-600' : 
            visit.daysFromTarget > 0 ? 'text-amber-600' : 'text-blue-600'
          }`}>
            {formatDaysFromTarget(visit.daysFromTarget)}
          </p>
        )}
      </div>

      {/* Form Completion */}
      {visit.formsRequired > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Forms</span>
            <span className="font-medium">
              {visit.formsCompleted}/{visit.formsRequired}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Alerts */}
      {(visit.hasDeviations || visit.isOverdue) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {visit.isOverdue && visit.status === 'SCHEDULED' && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-red-700 bg-red-50 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {visit.hasDeviations && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {visit.deviationCount} {visit.deviationCount === 1 ? 'Deviation' : 'Deviations'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface VisitFilterPanelProps {
  filters: VisitListFilters;
  onFilterChange: (filters: VisitListFilters) => void;
  availableSites: { id: string; name: string; number: string }[];
}

function VisitFilterPanel({ filters, onFilterChange, availableSites }: VisitFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions: VisitStatus[] = ['SCHEDULED', 'COMPLETED', 'MISSED', 'PARTIALLY_COMPLETE'];
  const typeOptions: VisitType[] = ['SCREENING', 'BASELINE', 'TREATMENT', 'FOLLOWUP', 'EARLY_TERMINATION', 'UNSCHEDULED'];

  const handleStatusToggle = (status: VisitStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const handleTypeToggle = (type: VisitType) => {
    const current = filters.visitType || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFilterChange({ ...filters, visitType: updated.length > 0 ? updated : undefined });
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.visitType?.length || 0,
    filters.siteId?.length || 0,
    filters.isOverdue ? 1 : 0,
    filters.hasDeviations ? 1 : 0,
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
                      ? getVisitStatusColor(status)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleStatusToggle(status)}
                >
                  {getVisitStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Visit Type</label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((type) => (
                <button
                  key={type}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filters.visitType?.includes(type)
                      ? getVisitTypeColor(type)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleTypeToggle(type)}
                >
                  {getVisitTypeDisplayName(type)}
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
                  filters.hasDeviations
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, hasDeviations: !filters.hasDeviations || undefined })}
              >
                Has Deviations
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filters.isCritical
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, isCritical: !filters.isCritical || undefined })}
              >
                Critical Only
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

export function VisitListView({
  visits,
  filters = {},
  onFilterChange,
  onVisitClick,
  onVisitAction,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: VisitListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<VisitSortField>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const availableSites = useMemo(() => {
    const siteMap = new Map<string, { id: string; name: string; number: string }>();
    visits.forEach((v) => {
      if (!siteMap.has(v.siteId)) {
        siteMap.set(v.siteId, { id: v.siteId, name: v.siteName, number: v.siteNumber });
      }
    });
    return Array.from(siteMap.values()).sort((a, b) => a.number.localeCompare(b.number));
  }, [visits]);

  const filteredVisits = useMemo(() => {
    let result = [...visits];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.visitName.toLowerCase().includes(term) ||
          v.subjectNumber.toLowerCase().includes(term) ||
          v.siteNumber.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((v) => filters.status!.includes(v.status));
    }

    // Type filter
    if (filters.visitType?.length) {
      result = result.filter((v) => filters.visitType!.includes(v.visitType));
    }

    // Site filter
    if (filters.siteId?.length) {
      result = result.filter((v) => filters.siteId!.includes(v.siteId));
    }

    // Overdue filter
    if (filters.isOverdue) {
      result = result.filter((v) => v.isOverdue);
    }

    // Deviations filter
    if (filters.hasDeviations) {
      result = result.filter((v) => v.hasDeviations);
    }

    // Critical filter
    if (filters.isCritical) {
      result = result.filter((v) => v.isCritical);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'scheduledDate':
          comparison = a.scheduledDate.getTime() - b.scheduledDate.getTime();
          break;
        case 'visitNumber':
          comparison = a.visitNumber - b.visitNumber;
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
  }, [visits, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredVisits.length;
    const scheduled = filteredVisits.filter((v) => v.status === 'SCHEDULED').length;
    const completed = filteredVisits.filter((v) => v.status === 'COMPLETED').length;
    const overdue = filteredVisits.filter((v) => v.isOverdue && v.status === 'SCHEDULED').length;
    return { total, scheduled, completed, overdue };
  }, [filteredVisits]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Visits</h2>
          <p className="text-sm text-gray-500">
            {stats.total} visits • {stats.scheduled} scheduled • {stats.completed} completed
            {stats.overdue > 0 && <span className="text-red-600"> • {stats.overdue} overdue</span>}
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
          placeholder="Search by visit name, subject, or site..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <VisitFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
          availableSites={availableSites}
        />
      )}

      {/* Visit Grid */}
      {filteredVisits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No visits found</p>
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
          {filteredVisits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onClick={() => onVisitClick?.(visit.id)}
              onAction={(action) => onVisitAction?.(visit.id, action)}
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

export function createMockVisitListItem(overrides?: Partial<VisitListItem>): VisitListItem {
  const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: 'visit-001',
    visitName: 'Week 4 Visit',
    visitNumber: 4,
    visitCode: 'V4',
    visitType: 'TREATMENT',
    status: 'SCHEDULED',
    subjectId: 'subj-001',
    subjectNumber: 'SUBJ-001',
    siteId: 'site-001',
    siteName: 'Memorial Hospital',
    siteNumber: '001',
    scheduledDate,
    windowStart: new Date(scheduledDate.getTime() - 3 * 24 * 60 * 60 * 1000),
    windowEnd: new Date(scheduledDate.getTime() + 3 * 24 * 60 * 60 * 1000),
    isInWindow: true,
    isOverdue: false,
    daysFromTarget: 0,
    formsRequired: 5,
    formsCompleted: 0,
    proceduresRequired: 3,
    proceduresCompleted: 0,
    hasDeviations: false,
    deviationCount: 0,
    isCritical: false,
    ...overrides,
  };
}

export default VisitListView;
