
/**
 * SDV List View
 * Source Data Verification status and progress tracking
 * @version 0.20.9.4
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Check,
  X,
  FileText,
  User,
  Building2,
  Calendar,
  AlertCircle,
  Shield,
  Percent,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type SDVVerificationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'DISCREPANCY' | 'WAIVED';
export type SDVAction = 'view' | 'verify' | 'flag_discrepancy' | 'waive' | 'resolve';
export type SDVSortField = 'subjectNumber' | 'siteName' | 'formName' | 'status' | 'verificationPercent' | 'assignedTo';
export type DiscrepancySeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface SDVRecordListItem {
  id: string;
  formInstanceId: string;
  formName: string;
  formCode: string;
  visitName: string;
  visitNumber: number;
  subjectId: string;
  subjectNumber: string;
  siteId: string;
  siteName: string;
  siteNumber: string;
  status: SDVVerificationStatus;
  verificationPercent: number;
  totalFields: number;
  verifiedFields: number;
  sdvRequiredFields: number;
  sdvCompletedFields: number;
  hasDiscrepancies: boolean;
  discrepancyCount: number;
  openDiscrepancies: number;
  criticalDiscrepancies: number;
  assignedTo?: string;
  assignedToId?: string;
  monitorName?: string;
  lastVerifiedAt?: Date;
  lastVerifiedBy?: string;
  dueDate?: Date;
  isOverdue: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  sourceDocumentsAvailable: boolean;
  createdAt: Date;
}

export interface SDVDiscrepancy {
  id: string;
  recordId: string;
  fieldName: string;
  fieldLabel: string;
  edcValue: string;
  sourceValue: string;
  severity: DiscrepancySeverity;
  status: 'OPEN' | 'RESOLVED' | 'WAIVED';
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SDVListFilters {
  status?: SDVVerificationStatus[];
  siteId?: string[];
  assignedTo?: string;
  hasDiscrepancies?: boolean;
  isOverdue?: boolean;
  priority?: ('LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL')[];
  searchTerm?: string;
}

export interface SDVListViewProps {
  records: SDVRecordListItem[];
  filters: SDVListFilters;
  onFilterChange: (filters: SDVListFilters) => void;
  onRecordClick?: (recordId: string) => void;
  onRecordAction?: (recordId: string, action: SDVAction) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSDVStatusDisplayName(status: SDVVerificationStatus): string {
  const names: Record<SDVVerificationStatus, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    VERIFIED: 'Verified',
    DISCREPANCY: 'Discrepancy Found',
    WAIVED: 'Waived',
  };
  return names[status] || status;
}

export function getSDVStatusColor(status: SDVVerificationStatus): string {
  const colors: Record<SDVVerificationStatus, string> = {
    NOT_STARTED: 'text-gray-600 bg-gray-100',
    IN_PROGRESS: 'text-blue-600 bg-blue-100',
    VERIFIED: 'text-green-600 bg-green-100',
    DISCREPANCY: 'text-red-600 bg-red-100',
    WAIVED: 'text-amber-600 bg-amber-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getSDVStatusIcon(status: SDVVerificationStatus): LucideIcon {
  const icons: Record<SDVVerificationStatus, LucideIcon> = {
    NOT_STARTED: ClipboardCheck,
    IN_PROGRESS: Clock,
    VERIFIED: CheckCircle,
    DISCREPANCY: AlertCircle,
    WAIVED: Shield,
  };
  return icons[status] || ClipboardCheck;
}

export function getPriorityDisplayName(priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function getPriorityColor(priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'): string {
  const colors = {
    LOW: 'text-gray-600 bg-gray-100',
    NORMAL: 'text-blue-600 bg-blue-100',
    HIGH: 'text-amber-600 bg-amber-100',
    CRITICAL: 'text-red-600 bg-red-100',
  };
  return colors[priority] || 'text-gray-600 bg-gray-100';
}

export function getDiscrepancySeverityColor(severity: DiscrepancySeverity): string {
  const colors = {
    MINOR: 'text-amber-600 bg-amber-100',
    MAJOR: 'text-orange-600 bg-orange-100',
    CRITICAL: 'text-red-600 bg-red-100',
  };
  return colors[severity] || 'text-gray-600 bg-gray-100';
}

export function getVerificationColor(percent: number): string {
  if (percent >= 100) return 'text-green-600';
  if (percent >= 75) return 'text-blue-600';
  if (percent >= 50) return 'text-amber-600';
  return 'text-gray-600';
}

export function getVerificationBarColor(percent: number): string {
  if (percent >= 100) return 'bg-green-500';
  if (percent >= 75) return 'bg-blue-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-gray-400';
}

export function formatDueDate(date: Date, isOverdue: boolean): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return isOverdue ? `Overdue (${formatted})` : `Due ${formatted}`;
}

export function createMockSDVRecordListItem(overrides: Partial<SDVRecordListItem> = {}): SDVRecordListItem {
  const id = overrides.id || `sdv-${Math.random().toString(36).substr(2, 9)}`;
  const totalFields = overrides.totalFields || Math.floor(Math.random() * 30) + 10;
  const sdvRequiredFields = overrides.sdvRequiredFields || Math.floor(totalFields * 0.5);
  const sdvCompletedFields = overrides.sdvCompletedFields ?? Math.floor(Math.random() * sdvRequiredFields);
  const verifiedFields = overrides.verifiedFields ?? sdvCompletedFields;
  
  const hasDiscrepancies = overrides.hasDiscrepancies ?? Math.random() > 0.7;
  const discrepancyCount = hasDiscrepancies ? Math.floor(Math.random() * 4) + 1 : 0;
  
  return {
    id,
    formInstanceId: `fi-${id}`,
    formName: 'Demographics',
    formCode: 'DM',
    visitName: 'Screening',
    visitNumber: 1,
    subjectId: `subj-${Math.random().toString(36).substr(2, 6)}`,
    subjectNumber: `001-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
    siteId: 'site-001',
    siteName: 'General Hospital Research Center',
    siteNumber: '001',
    status: 'IN_PROGRESS',
    verificationPercent: Math.round((sdvCompletedFields / sdvRequiredFields) * 100),
    totalFields,
    verifiedFields,
    sdvRequiredFields,
    sdvCompletedFields,
    hasDiscrepancies,
    discrepancyCount,
    openDiscrepancies: hasDiscrepancies ? Math.ceil(discrepancyCount / 2) : 0,
    criticalDiscrepancies: hasDiscrepancies && Math.random() > 0.7 ? 1 : 0,
    assignedTo: 'Sarah Monitor',
    assignedToId: 'user-001',
    monitorName: 'Sarah Monitor',
    isOverdue: Math.random() > 0.8,
    priority: 'NORMAL',
    sourceDocumentsAvailable: Math.random() > 0.2,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface SDVRecordCardProps {
  record: SDVRecordListItem;
  onClick?: () => void;
  onAction?: (action: SDVAction) => void;
}

function SDVRecordCard({ record, onClick, onAction }: SDVRecordCardProps) {
  const [showActions, setShowActions] = useState(false);
  const StatusIcon = getSDVStatusIcon(record.status);
  
  const availableActions: { action: SDVAction; label: string; icon: LucideIcon; disabled?: boolean }[] = [
    { action: 'view', label: 'View Details', icon: Eye },
    { action: 'verify', label: 'Verify Fields', icon: Check, disabled: record.status === 'VERIFIED' || !record.sourceDocumentsAvailable },
    { action: 'flag_discrepancy', label: 'Flag Discrepancy', icon: AlertCircle, disabled: record.status === 'VERIFIED' },
    { action: 'waive', label: 'Waive SDV', icon: Shield, disabled: record.status === 'VERIFIED' || record.status === 'WAIVED' },
    { action: 'resolve', label: 'Resolve Discrepancy', icon: CheckCircle, disabled: !record.hasDiscrepancies || record.openDiscrepancies === 0 },
  ];

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getSDVStatusColor(record.status)}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{record.formName}</h3>
            <p className="text-xs text-gray-500">{record.formCode} • {record.visitName}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {availableActions.map(({ action, label, icon: Icon, disabled }) => (
                <button
                  key={action}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled && onAction) onAction(action);
                    setShowActions(false);
                  }}
                  disabled={disabled}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                    disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject and Site Info */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span>{record.subjectNumber}</span>
        </div>
        <div className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>{record.siteNumber}</span>
        </div>
        {record.assignedTo && (
          <div className="flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{record.assignedTo}</span>
          </div>
        )}
      </div>

      {/* Verification Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">SDV Progress</span>
          <span className={`text-xs font-medium ${getVerificationColor(record.verificationPercent)}`}>
            {record.verificationPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getVerificationBarColor(record.verificationPercent)} transition-all`}
            style={{ width: `${record.verificationPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">
            {record.sdvCompletedFields}/{record.sdvRequiredFields} fields verified
          </span>
        </div>
      </div>

      {/* Status Badges and Alerts */}
      <div className="flex items-center flex-wrap gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSDVStatusColor(record.status)}`}>
          {getSDVStatusDisplayName(record.status)}
        </span>
        
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(record.priority)}`}>
          {getPriorityDisplayName(record.priority)}
        </span>
        
        {record.hasDiscrepancies && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-50">
            <AlertCircle className="w-3 h-3" />
            {record.openDiscrepancies} Open
            {record.criticalDiscrepancies > 0 && (
              <span className="text-red-700 font-bold">({record.criticalDiscrepancies} Critical)</span>
            )}
          </span>
        )}
        
        {record.isOverdue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-600 bg-amber-50">
            <Clock className="w-3 h-3" />
            Overdue
          </span>
        )}
        
        {!record.sourceDocumentsAvailable && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-100">
            <FileText className="w-3 h-3" />
            No Source Docs
          </span>
        )}
      </div>

      {/* Due Date and Last Verified */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        {record.dueDate && (
          <span className={record.isOverdue ? 'text-red-600' : ''}>
            {formatDueDate(record.dueDate, record.isOverdue)}
          </span>
        )}
        {record.lastVerifiedAt && (
          <span>
            Last verified by {record.lastVerifiedBy}
          </span>
        )}
      </div>
    </div>
  );
}

interface SDVFilterPanelProps {
  filters: SDVListFilters;
  onFilterChange: (filters: SDVListFilters) => void;
  records: SDVRecordListItem[];
}

function SDVFilterPanel({ filters, onFilterChange, records }: SDVFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const uniqueMonitors = useMemo(() => {
    const monitors = new Map<string, string>();
    records.forEach(r => {
      if (r.assignedToId && r.assignedTo) {
        monitors.set(r.assignedToId, r.assignedTo);
      }
    });
    return Array.from(monitors.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.siteId?.length) count++;
    if (filters.assignedTo) count++;
    if (filters.hasDiscrepancies) count++;
    if (filters.isOverdue) count++;
    if (filters.priority?.length) count++;
    return count;
  }, [filters]);

  const statuses: SDVVerificationStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'VERIFIED', 'DISCREPANCY', 'WAIVED'];
  const priorities: ('LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-100 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => {
                    const current = filters.status || [];
                    const updated = current.includes(status)
                      ? current.filter(s => s !== status)
                      : [...current, status];
                    onFilterChange({ ...filters, status: updated.length ? updated : undefined });
                  }}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    filters.status?.includes(status)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {getSDVStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {priorities.map(priority => (
                <button
                  key={priority}
                  onClick={() => {
                    const current = filters.priority || [];
                    const updated = current.includes(priority)
                      ? current.filter(p => p !== priority)
                      : [...current, priority];
                    onFilterChange({ ...filters, priority: updated.length ? updated : undefined });
                  }}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    filters.priority?.includes(priority)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {getPriorityDisplayName(priority)}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Filters */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Issues</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange({ 
                  ...filters, 
                  hasDiscrepancies: filters.hasDiscrepancies ? undefined : true 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.hasDiscrepancies
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Has Discrepancies
              </button>
              <button
                onClick={() => onFilterChange({ 
                  ...filters, 
                  isOverdue: filters.isOverdue ? undefined : true 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.isOverdue
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Overdue
              </button>
            </div>
          </div>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => onFilterChange({})}
              className="text-xs text-blue-600 hover:text-blue-700"
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

export function SDVListView({
  records,
  filters,
  onFilterChange,
  onRecordClick,
  onRecordAction,
  onRefresh,
  onExport,
  isLoading = false,
  className = '',
}: SDVListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  // Apply filters
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filters.status?.length && !filters.status.includes(record.status)) return false;
      if (filters.siteId?.length && !filters.siteId.includes(record.siteId)) return false;
      if (filters.assignedTo && record.assignedToId !== filters.assignedTo) return false;
      if (filters.hasDiscrepancies && !record.hasDiscrepancies) return false;
      if (filters.isOverdue && !record.isOverdue) return false;
      if (filters.priority?.length && !filters.priority.includes(record.priority)) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          record.formName.toLowerCase().includes(search) ||
          record.subjectNumber.toLowerCase().includes(search) ||
          record.siteName.toLowerCase().includes(search) ||
          record.visitName.toLowerCase().includes(search) ||
          (record.assignedTo?.toLowerCase().includes(search) || false)
        );
      }
      return true;
    });
  }, [records, filters, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const verified = filteredRecords.filter(r => r.status === 'VERIFIED').length;
    const withDiscrepancies = filteredRecords.filter(r => r.hasDiscrepancies && r.openDiscrepancies > 0).length;
    const overdue = filteredRecords.filter(r => r.isOverdue).length;
    const avgProgress = total > 0
      ? Math.round(filteredRecords.reduce((sum, r) => sum + r.verificationPercent, 0) / total)
      : 0;
    return { total, verified, withDiscrepancies, overdue, avgProgress };
  }, [filteredRecords]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onFilterChange({ ...filters, searchTerm: e.target.value || undefined });
  }, [filters, onFilterChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Source Data Verification</h2>
          <p className="text-sm text-gray-500">
            {stats.total} records • {stats.verified} verified • {stats.avgProgress}% avg progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search forms, subjects, sites, monitors..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <SDVFilterPanel filters={filters} onFilterChange={onFilterChange} records={records} />

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Records</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          <div className="text-xs text-gray-500">Verified</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.withDiscrepancies}</div>
          <div className="text-xs text-gray-500">Discrepancies</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-600">{stats.overdue}</div>
          <div className="text-xs text-gray-500">Overdue</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.avgProgress}%</div>
          <div className="text-xs text-gray-500">Avg Progress</div>
        </div>
      </div>

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No SDV records match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map(record => (
            <SDVRecordCard
              key={record.id}
              record={record}
              onClick={() => onRecordClick?.(record.id)}
              onAction={(action) => onRecordAction?.(record.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SDVListView;
