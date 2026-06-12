
/**
 * EDC List View
 * Electronic Data Capture form completion and status tracking
 * @version 0.20.9.4
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  PenTool,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Lock,
  Unlock,
  AlertCircle,
  Percent,
  User,
  Building2,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import type { FormStatus } from '@/types/clinical-form';

// =============================================================================
// TYPES
// =============================================================================

export type EDCFormStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'SIGNED' | 'LOCKED' | 'FROZEN';
export type EDCFormAction = 'view' | 'edit' | 'sign' | 'lock' | 'unlock' | 'freeze';
export type EDCSortField = 'subjectNumber' | 'siteName' | 'formName' | 'status' | 'completionPercent' | 'lastModified';

export interface EDCFormListItem {
  id: string;
  formInstanceId: string;
  formName: string;
  formCode: string;
  formVersion: string;
  visitName: string;
  visitNumber: number;
  subjectId: string;
  subjectNumber: string;
  siteId: string;
  siteName: string;
  siteNumber: string;
  status: EDCFormStatus;
  completionPercent: number;
  totalFields: number;
  completedFields: number;
  requiredFields: number;
  completedRequired: number;
  hasEditCheckFailures: boolean;
  editCheckFailureCount: number;
  hasQueries: boolean;
  openQueryCount: number;
  isSigned: boolean;
  signedBy?: string;
  signedAt?: Date;
  isLocked: boolean;
  lockedAt?: Date;
  isFrozen: boolean;
  frozenAt?: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  createdAt: Date;
}

export interface EDCListFilters {
  status?: EDCFormStatus[];
  siteId?: string[];
  visitName?: string[];
  formName?: string[];
  hasEditCheckFailures?: boolean;
  hasQueries?: boolean;
  isSigned?: boolean;
  isLocked?: boolean;
  searchTerm?: string;
}

export interface EDCListViewProps {
  forms: EDCFormListItem[];
  filters: EDCListFilters;
  onFilterChange: (filters: EDCListFilters) => void;
  onFormClick?: (formId: string) => void;
  onFormAction?: (formId: string, action: EDCFormAction) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getEDCStatusDisplayName(status: EDCFormStatus): string {
  const names: Record<EDCFormStatus, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    COMPLETE: 'Complete',
    SIGNED: 'Signed',
    LOCKED: 'Locked',
    FROZEN: 'Frozen',
  };
  return names[status] || status;
}

export function getEDCStatusColor(status: EDCFormStatus): string {
  const colors: Record<EDCFormStatus, string> = {
    NOT_STARTED: 'text-gray-600 bg-gray-100',
    IN_PROGRESS: 'text-blue-600 bg-blue-100',
    COMPLETE: 'text-green-600 bg-green-100',
    SIGNED: 'text-purple-600 bg-purple-100',
    LOCKED: 'text-amber-600 bg-amber-100',
    FROZEN: 'text-cyan-600 bg-cyan-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getEDCStatusIcon(status: EDCFormStatus): LucideIcon {
  const icons: Record<EDCFormStatus, LucideIcon> = {
    NOT_STARTED: FileText,
    IN_PROGRESS: Clock,
    COMPLETE: CheckCircle,
    SIGNED: PenTool,
    LOCKED: Lock,
    FROZEN: Lock,
  };
  return icons[status] || FileText;
}

export function getCompletionColor(percent: number): string {
  if (percent >= 100) return 'text-green-600';
  if (percent >= 75) return 'text-blue-600';
  if (percent >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function getCompletionBarColor(percent: number): string {
  if (percent >= 100) return 'bg-green-500';
  if (percent >= 75) return 'bg-blue-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function formatCompletionText(completed: number, total: number): string {
  return `${completed}/${total} fields`;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function createMockEDCFormListItem(overrides: Partial<EDCFormListItem> = {}): EDCFormListItem {
  const id = overrides.id || `edc-${Math.random().toString(36).substr(2, 9)}`;
  const totalFields = overrides.totalFields || Math.floor(Math.random() * 30) + 10;
  const completedFields = overrides.completedFields ?? Math.floor(Math.random() * totalFields);
  const requiredFields = overrides.requiredFields || Math.floor(totalFields * 0.7);
  const completedRequired = overrides.completedRequired ?? Math.min(completedFields, requiredFields);
  
  return {
    id,
    formInstanceId: `fi-${id}`,
    formName: 'Demographics',
    formCode: 'DM',
    formVersion: '1.0',
    visitName: 'Screening',
    visitNumber: 1,
    subjectId: `subj-${Math.random().toString(36).substr(2, 6)}`,
    subjectNumber: `001-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
    siteId: 'site-001',
    siteName: 'General Hospital Research Center',
    siteNumber: '001',
    status: 'IN_PROGRESS',
    completionPercent: Math.round((completedFields / totalFields) * 100),
    totalFields,
    completedFields,
    requiredFields,
    completedRequired,
    hasEditCheckFailures: Math.random() > 0.7,
    editCheckFailureCount: Math.floor(Math.random() * 3),
    hasQueries: Math.random() > 0.8,
    openQueryCount: Math.floor(Math.random() * 2),
    isSigned: false,
    isLocked: false,
    isFrozen: false,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface EDCFormCardProps {
  form: EDCFormListItem;
  onClick?: () => void;
  onAction?: (action: EDCFormAction) => void;
}

function EDCFormCard({ form, onClick, onAction }: EDCFormCardProps) {
  const [showActions, setShowActions] = useState(false);
  const StatusIcon = getEDCStatusIcon(form.status);
  
  const availableActions: { action: EDCFormAction; label: string; icon: LucideIcon; disabled?: boolean }[] = [
    { action: 'view', label: 'View Form', icon: Eye },
    { action: 'edit', label: 'Edit Form', icon: Edit, disabled: form.isLocked || form.isFrozen },
    { action: 'sign', label: 'Sign Form', icon: PenTool, disabled: form.isSigned || form.status !== 'COMPLETE' },
    { action: 'lock', label: 'Lock Form', icon: Lock, disabled: form.isLocked || !form.isSigned },
    { action: 'unlock', label: 'Unlock Form', icon: Unlock, disabled: !form.isLocked || form.isFrozen },
  ];

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getEDCStatusColor(form.status)}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{form.formName}</h3>
            <p className="text-xs text-gray-500">{form.formCode} v{form.formVersion}</p>
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
            <div className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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

      {/* Visit and Subject Info */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{form.visitName}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span>{form.subjectNumber}</span>
        </div>
        <div className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>{form.siteNumber}</span>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Completion</span>
          <span className={`text-xs font-medium ${getCompletionColor(form.completionPercent)}`}>
            {form.completionPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getCompletionBarColor(form.completionPercent)} transition-all`}
            style={{ width: `${form.completionPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">
            {formatCompletionText(form.completedFields, form.totalFields)}
          </span>
          <span className="text-xs text-gray-400">
            {form.completedRequired}/{form.requiredFields} required
          </span>
        </div>
      </div>

      {/* Status Badges and Alerts */}
      <div className="flex items-center flex-wrap gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEDCStatusColor(form.status)}`}>
          {getEDCStatusDisplayName(form.status)}
        </span>
        
        {form.hasEditCheckFailures && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-50">
            <AlertCircle className="w-3 h-3" />
            {form.editCheckFailureCount} Edit Check{form.editCheckFailureCount !== 1 ? 's' : ''}
          </span>
        )}
        
        {form.hasQueries && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-600 bg-amber-50">
            <AlertTriangle className="w-3 h-3" />
            {form.openQueryCount} Quer{form.openQueryCount !== 1 ? 'ies' : 'y'}
          </span>
        )}
        
        {form.isSigned && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-purple-600 bg-purple-50">
            <PenTool className="w-3 h-3" />
            Signed
          </span>
        )}
        
        {form.isLocked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-100">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
      </div>

      {/* Last Modified */}
      {form.lastModifiedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Last modified {formatDateTime(form.lastModifiedAt)}
          {form.lastModifiedBy && ` by ${form.lastModifiedBy}`}
        </div>
      )}
    </div>
  );
}

interface EDCFilterPanelProps {
  filters: EDCListFilters;
  onFilterChange: (filters: EDCListFilters) => void;
  forms: EDCFormListItem[];
}

function EDCFilterPanel({ filters, onFilterChange, forms }: EDCFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    forms.forEach(f => sites.set(f.siteId, f.siteName));
    return Array.from(sites.entries()).map(([id, name]) => ({ id, name }));
  }, [forms]);
  
  const uniqueForms = useMemo(() => {
    const formNames = new Set<string>();
    forms.forEach(f => formNames.add(f.formName));
    return Array.from(formNames);
  }, [forms]);
  
  const uniqueVisits = useMemo(() => {
    const visits = new Set<string>();
    forms.forEach(f => visits.add(f.visitName));
    return Array.from(visits);
  }, [forms]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.siteId?.length) count++;
    if (filters.formName?.length) count++;
    if (filters.visitName?.length) count++;
    if (filters.hasEditCheckFailures) count++;
    if (filters.hasQueries) count++;
    if (filters.isSigned !== undefined) count++;
    if (filters.isLocked !== undefined) count++;
    return count;
  }, [filters]);

  const statuses: EDCFormStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'SIGNED', 'LOCKED', 'FROZEN'];

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
                  {getEDCStatusDisplayName(status)}
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
                  hasEditCheckFailures: filters.hasEditCheckFailures ? undefined : true 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.hasEditCheckFailures
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Edit Check Failures
              </button>
              <button
                onClick={() => onFilterChange({ 
                  ...filters, 
                  hasQueries: filters.hasQueries ? undefined : true 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.hasQueries
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Open Queries
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

export function EDCListView({
  forms,
  filters,
  onFilterChange,
  onFormClick,
  onFormAction,
  onRefresh,
  onExport,
  isLoading = false,
  className = '',
}: EDCListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  // Apply filters
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      if (filters.status?.length && !filters.status.includes(form.status)) return false;
      if (filters.siteId?.length && !filters.siteId.includes(form.siteId)) return false;
      if (filters.formName?.length && !filters.formName.includes(form.formName)) return false;
      if (filters.visitName?.length && !filters.visitName.includes(form.visitName)) return false;
      if (filters.hasEditCheckFailures && !form.hasEditCheckFailures) return false;
      if (filters.hasQueries && !form.hasQueries) return false;
      if (filters.isSigned !== undefined && form.isSigned !== filters.isSigned) return false;
      if (filters.isLocked !== undefined && form.isLocked !== filters.isLocked) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          form.formName.toLowerCase().includes(search) ||
          form.subjectNumber.toLowerCase().includes(search) ||
          form.siteName.toLowerCase().includes(search) ||
          form.visitName.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [forms, filters, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredForms.length;
    const complete = filteredForms.filter(f => f.status === 'COMPLETE' || f.status === 'SIGNED' || f.status === 'LOCKED').length;
    const withIssues = filteredForms.filter(f => f.hasEditCheckFailures || f.hasQueries).length;
    const avgCompletion = total > 0
      ? Math.round(filteredForms.reduce((sum, f) => sum + f.completionPercent, 0) / total)
      : 0;
    return { total, complete, withIssues, avgCompletion };
  }, [filteredForms]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onFilterChange({ ...filters, searchTerm: e.target.value || undefined });
  }, [filters, onFilterChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">EDC Forms</h2>
          <p className="text-sm text-gray-500">
            {stats.total} forms • {stats.complete} complete • {stats.avgCompletion}% avg completion
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
          placeholder="Search forms, subjects, sites..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <EDCFilterPanel filters={filters} onFilterChange={onFilterChange} forms={forms} />

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Forms</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.withIssues}</div>
          <div className="text-xs text-gray-500">With Issues</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.avgCompletion}%</div>
          <div className="text-xs text-gray-500">Avg Completion</div>
        </div>
      </div>

      {/* Form List */}
      {filteredForms.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No forms match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map(form => (
            <EDCFormCard
              key={form.id}
              form={form}
              onClick={() => onFormClick?.(form.id)}
              onAction={(action) => onFormAction?.(form.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EDCListView;
