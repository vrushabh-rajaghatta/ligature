
/**
 * Subject List View Component
 * Subject listing with filtering, status tracking, and enrollment management
 * @version 0.20.9.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  User,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  Calendar,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Shuffle,
  Activity,
  ClipboardList,
  Shield,
  Building2,
  RefreshCw,
  Eye,
  Edit,
  type LucideIcon,
} from 'lucide-react';
import type { SubjectStatus } from '@/types/clinical-subject';

// =============================================================================
// TYPES
// =============================================================================

export interface SubjectListItem {
  id: string;
  subjectNumber: string;
  screeningNumber?: string;
  randomizationNumber?: string;
  status: SubjectStatus;
  
  // Site info
  siteId: string;
  siteName: string;
  siteNumber: string;
  
  // Enrollment
  screeningDate?: Date;
  enrollmentDate?: Date;
  randomizationDate?: Date;
  completionDate?: Date;
  withdrawalDate?: Date;
  
  // Treatment
  armId?: string;
  armName?: string;
  treatmentCode?: string;
  
  // Visit info
  nextVisitDate?: Date;
  nextVisitName?: string;
  visitsCompleted: number;
  visitsMissed: number;
  
  // Data status
  openQueries: number;
  protocolDeviations: number;
  
  // Demographics (minimal, de-identified)
  age?: number;
  sex?: 'M' | 'F' | 'O';
  
  // Consent
  hasActiveConsent: boolean;
  consentVersion?: string;
  
  // Last activity
  lastActivityDate: Date;
  daysOnStudy: number;
}

export interface SubjectListFilters {
  status?: SubjectStatus[];
  siteId?: string[];
  armId?: string[];
  hasOpenQueries?: boolean;
  hasDeviations?: boolean;
  consentStatus?: 'active' | 'withdrawn' | 'pending';
  searchTerm?: string;
}

export type SubjectSortField = 'subjectNumber' | 'status' | 'site' | 'enrollmentDate' | 'daysOnStudy' | 'nextVisit' | 'queries';
export type SortDirection = 'asc' | 'desc';

export interface SubjectListViewProps {
  subjects: SubjectListItem[];
  filters?: SubjectListFilters;
  onFilterChange?: (filters: SubjectListFilters) => void;
  onSubjectClick?: (subjectId: string) => void;
  onSubjectAction?: (subjectId: string, action: SubjectAction) => void;
  onAddSubject?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type SubjectAction = 'view' | 'edit' | 'schedule_visit' | 'record_visit' | 'withdraw';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSubjectStatusDisplayName(status: SubjectStatus): string {
  const names: Record<SubjectStatus, string> = {
    PRE_SCREENING: 'Pre-Screening',
    SCREENING: 'Screening',
    SCREEN_FAILURE: 'Screen Failure',
    ENROLLED: 'Enrolled',
    RANDOMIZED: 'Randomized',
    ON_TREATMENT: 'On Treatment',
    COMPLETED: 'Completed',
    WITHDRAWN: 'Withdrawn',
    LOST_TO_FOLLOWUP: 'Lost to Follow-up',
  };
  return names[status] || status;
}

export function getSubjectStatusColor(status: SubjectStatus): string {
  const colors: Record<SubjectStatus, string> = {
    PRE_SCREENING: 'text-gray-600 bg-gray-100',
    SCREENING: 'text-blue-600 bg-blue-100',
    SCREEN_FAILURE: 'text-red-600 bg-red-100',
    ENROLLED: 'text-green-600 bg-green-100',
    RANDOMIZED: 'text-purple-600 bg-purple-100',
    ON_TREATMENT: 'text-emerald-600 bg-emerald-100',
    COMPLETED: 'text-teal-600 bg-teal-100',
    WITHDRAWN: 'text-amber-600 bg-amber-100',
    LOST_TO_FOLLOWUP: 'text-orange-600 bg-orange-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getSubjectStatusIcon(status: SubjectStatus): LucideIcon {
  const icons: Record<SubjectStatus, LucideIcon> = {
    PRE_SCREENING: UserPlus,
    SCREENING: ClipboardList,
    SCREEN_FAILURE: XCircle,
    ENROLLED: UserCheck,
    RANDOMIZED: Shuffle,
    ON_TREATMENT: Activity,
    COMPLETED: CheckCircle,
    WITHDRAWN: UserX,
    LOST_TO_FOLLOWUP: AlertTriangle,
  };
  return icons[status] || User;
}

export function isActiveStatus(status: SubjectStatus): boolean {
  return ['ENROLLED', 'RANDOMIZED', 'ON_TREATMENT'].includes(status);
}

export function isTerminalStatus(status: SubjectStatus): boolean {
  return ['SCREEN_FAILURE', 'COMPLETED', 'WITHDRAWN', 'LOST_TO_FOLLOWUP'].includes(status);
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
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return formatDate(date);
}

export function getSexDisplayName(sex: 'M' | 'F' | 'O' | undefined): string {
  if (!sex) return '—';
  const names = { M: 'Male', F: 'Female', O: 'Other' };
  return names[sex];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubjectCardProps {
  subject: SubjectListItem;
  onClick?: () => void;
  onAction?: (action: SubjectAction) => void;
  showActions?: boolean;
}

function SubjectCard({ subject, onClick, onAction, showActions = true }: SubjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getSubjectStatusIcon(subject.status);
  const isActive = isActiveStatus(subject.status);
  const isTerminal = isTerminalStatus(subject.status);
  
  const hasIssues = subject.openQueries > 0 || subject.protocolDeviations > 0;
  const nextVisitOverdue = subject.nextVisitDate && subject.nextVisitDate < new Date();

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
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-50' : isTerminal ? 'bg-gray-50' : 'bg-blue-50'}`}>
            <StatusIcon className={`h-5 w-5 ${isActive ? 'text-green-600' : isTerminal ? 'text-gray-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{subject.subjectNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSubjectStatusColor(subject.status)}`}>
                {getSubjectStatusDisplayName(subject.status)}
              </span>
            </div>
            {subject.randomizationNumber && (
              <p className="text-xs text-gray-500 mt-0.5">
                Rand: {subject.randomizationNumber}
              </p>
            )}
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
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction?.('view'); setShowMenu(false); }}
                >
                  <Eye className="h-3.5 w-3.5" /> View Details
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction?.('edit'); setShowMenu(false); }}
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                {isActive && (
                  <>
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); onAction?.('record_visit'); setShowMenu(false); }}
                    >
                      <Calendar className="h-3.5 w-3.5" /> Record Visit
                    </button>
                    <button
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); onAction?.('withdraw'); setShowMenu(false); }}
                    >
                      <UserX className="h-3.5 w-3.5" /> Withdraw
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Site & Treatment Info */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Building2 className="h-4 w-4" />
          <span className="truncate">Site {subject.siteNumber}</span>
        </div>
        {subject.armName && (
          <div className="flex items-center gap-2 text-gray-500">
            <Shuffle className="h-4 w-4" />
            <span className="truncate">{subject.armName}</span>
          </div>
        )}
      </div>

      {/* Visit Info */}
      {isActive && subject.nextVisitDate && (
        <div className={`mt-3 p-2 rounded ${nextVisitOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${nextVisitOverdue ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={nextVisitOverdue ? 'text-red-700' : 'text-gray-700'}>
                {subject.nextVisitName || 'Next Visit'}
              </span>
            </div>
            <span className={`font-medium ${nextVisitOverdue ? 'text-red-700' : 'text-gray-900'}`}>
              {formatRelativeDate(subject.nextVisitDate)}
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {hasIssues && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {subject.openQueries > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {subject.openQueries} {subject.openQueries === 1 ? 'Query' : 'Queries'}
            </span>
          )}
          {subject.protocolDeviations > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-red-700 bg-red-50 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {subject.protocolDeviations} {subject.protocolDeviations === 1 ? 'Deviation' : 'Deviations'}
            </span>
          )}
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="font-medium text-gray-900">{subject.daysOnStudy}</p>
          <p className="text-gray-500">Days</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-900">{subject.visitsCompleted}</p>
          <p className="text-gray-500">Visits</p>
        </div>
        <div className="text-center">
          <p className={`font-medium ${subject.visitsMissed > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {subject.visitsMissed}
          </p>
          <p className="text-gray-500">Missed</p>
        </div>
      </div>

      {/* Consent Status */}
      <div className="mt-2 flex items-center gap-1 text-xs">
        {subject.hasActiveConsent ? (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-green-700">Consented</span>
            {subject.consentVersion && (
              <span className="text-gray-400">(v{subject.consentVersion})</span>
            )}
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-700">No Active Consent</span>
          </>
        )}
      </div>
    </div>
  );
}

interface SubjectFilterPanelProps {
  filters: SubjectListFilters;
  onFilterChange: (filters: SubjectListFilters) => void;
  availableSites: { id: string; name: string; number: string }[];
  availableArms: { id: string; name: string }[];
}

function SubjectFilterPanel({
  filters,
  onFilterChange,
  availableSites,
  availableArms,
}: SubjectFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions: SubjectStatus[] = [
    'PRE_SCREENING',
    'SCREENING',
    'SCREEN_FAILURE',
    'ENROLLED',
    'RANDOMIZED',
    'ON_TREATMENT',
    'COMPLETED',
    'WITHDRAWN',
    'LOST_TO_FOLLOWUP',
  ];

  const handleStatusToggle = (status: SubjectStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const handleSiteToggle = (siteId: string) => {
    const current = filters.siteId || [];
    const updated = current.includes(siteId)
      ? current.filter((s) => s !== siteId)
      : [...current, siteId];
    onFilterChange({ ...filters, siteId: updated.length > 0 ? updated : undefined });
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.siteId?.length || 0,
    filters.armId?.length || 0,
    filters.hasOpenQueries ? 1 : 0,
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
                      ? getSubjectStatusColor(status)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleStatusToggle(status)}
                >
                  {getSubjectStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Site Filter */}
          {availableSites.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Site</label>
              <div className="flex flex-wrap gap-2">
                {availableSites.slice(0, 10).map((site) => (
                  <button
                    key={site.id}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filters.siteId?.includes(site.id)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleSiteToggle(site.id)}
                  >
                    Site {site.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Issue Filters */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Issues</label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filters.hasOpenQueries
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, hasOpenQueries: !filters.hasOpenQueries || undefined })}
              >
                Has Open Queries
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filters.hasDeviations
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onFilterChange({ ...filters, hasDeviations: !filters.hasDeviations || undefined })}
              >
                Has Deviations
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

export function SubjectListView({
  subjects,
  filters = {},
  onFilterChange,
  onSubjectClick,
  onSubjectAction,
  onAddSubject,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: SubjectListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<SubjectSortField>('subjectNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const availableSites = useMemo(() => {
    const siteMap = new Map<string, { id: string; name: string; number: string }>();
    subjects.forEach((s) => {
      if (!siteMap.has(s.siteId)) {
        siteMap.set(s.siteId, { id: s.siteId, name: s.siteName, number: s.siteNumber });
      }
    });
    return Array.from(siteMap.values()).sort((a, b) => a.number.localeCompare(b.number));
  }, [subjects]);

  const availableArms = useMemo(() => {
    const armMap = new Map<string, { id: string; name: string }>();
    subjects.forEach((s) => {
      if (s.armId && !armMap.has(s.armId)) {
        armMap.set(s.armId, { id: s.armId, name: s.armName || s.armId });
      }
    });
    return Array.from(armMap.values());
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    let result = [...subjects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.subjectNumber.toLowerCase().includes(term) ||
          (s.screeningNumber?.toLowerCase().includes(term)) ||
          (s.randomizationNumber?.toLowerCase().includes(term)) ||
          s.siteName.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((s) => filters.status!.includes(s.status));
    }

    // Site filter
    if (filters.siteId?.length) {
      result = result.filter((s) => filters.siteId!.includes(s.siteId));
    }

    // Arm filter
    if (filters.armId?.length) {
      result = result.filter((s) => s.armId && filters.armId!.includes(s.armId));
    }

    // Query filter
    if (filters.hasOpenQueries) {
      result = result.filter((s) => s.openQueries > 0);
    }

    // Deviation filter
    if (filters.hasDeviations) {
      result = result.filter((s) => s.protocolDeviations > 0);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'subjectNumber':
          comparison = a.subjectNumber.localeCompare(b.subjectNumber);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'site':
          comparison = a.siteNumber.localeCompare(b.siteNumber);
          break;
        case 'enrollmentDate':
          const aDate = a.enrollmentDate?.getTime() || 0;
          const bDate = b.enrollmentDate?.getTime() || 0;
          comparison = aDate - bDate;
          break;
        case 'daysOnStudy':
          comparison = a.daysOnStudy - b.daysOnStudy;
          break;
        case 'nextVisit':
          const aNext = a.nextVisitDate?.getTime() || Infinity;
          const bNext = b.nextVisitDate?.getTime() || Infinity;
          comparison = aNext - bNext;
          break;
        case 'queries':
          comparison = a.openQueries - b.openQueries;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [subjects, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredSubjects.length;
    const active = filteredSubjects.filter((s) => isActiveStatus(s.status)).length;
    const completed = filteredSubjects.filter((s) => s.status === 'COMPLETED').length;
    const withQueries = filteredSubjects.filter((s) => s.openQueries > 0).length;
    return { total, active, completed, withQueries };
  }, [filteredSubjects]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>
          <p className="text-sm text-gray-500">
            {stats.total} subjects • {stats.active} active • {stats.completed} completed
            {stats.withQueries > 0 && ` • ${stats.withQueries} with queries`}
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
          {onAddSubject && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddSubject}
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by subject ID, screening number, or randomization number..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <SubjectFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
          availableSites={availableSites}
          availableArms={availableArms}
        />
      )}

      {/* Subject Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No subjects found</p>
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
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => onSubjectClick?.(subject.id)}
              onAction={(action) => onSubjectAction?.(subject.id, action)}
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

export function createMockSubjectListItem(overrides?: Partial<SubjectListItem>): SubjectListItem {
  return {
    id: 'subj-001',
    subjectNumber: 'SUBJ-001',
    screeningNumber: 'SCR-001',
    randomizationNumber: 'R0001',
    status: 'ON_TREATMENT',
    siteId: 'site-001',
    siteName: 'Memorial Hospital',
    siteNumber: '001',
    screeningDate: new Date('2025-06-15'),
    enrollmentDate: new Date('2025-07-01'),
    randomizationDate: new Date('2025-07-01'),
    armId: 'arm-001',
    armName: 'Treatment A',
    treatmentCode: 'TRT-001',
    nextVisitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    nextVisitName: 'Week 12 Visit',
    visitsCompleted: 8,
    visitsMissed: 0,
    openQueries: 2,
    protocolDeviations: 0,
    age: 54,
    sex: 'F',
    hasActiveConsent: true,
    consentVersion: '2.0',
    lastActivityDate: new Date(),
    daysOnStudy: 195,
    ...overrides,
  };
}

export default SubjectListView;
