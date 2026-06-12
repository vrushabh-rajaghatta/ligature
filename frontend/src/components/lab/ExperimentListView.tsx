
/**
 * Experiment List View Component
 * Experiment lifecycle management with team and results tracking
 * @version 0.21.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  FlaskRound,
  Microscope,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Eye,
  Edit,
  Trash2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { Experiment, ExperimentStatus, ExperimentType } from '@/types/lab-discovery';

// =============================================================================
// TYPES
// =============================================================================

export interface ExperimentListItem {
  id: string;
  experimentId: string;
  title: string;
  type: ExperimentType;
  status: ExperimentStatus;
  
  // Location
  laboratoryId: string;
  laboratoryName?: string;
  
  // Project
  projectId?: string;
  projectName?: string;
  protocolId?: string;
  protocolName?: string;
  
  // Principal Investigator
  principalInvestigatorId: string;
  principalInvestigatorName: string;
  
  // Description
  description?: string;
  objectives: string[];
  hypothesis?: string;
  
  // Team
  teamMemberCount: number;
  
  // Materials
  sampleCount: number;
  compoundCount: number;
  
  // Results
  parameterCount: number;
  resultCount: number;
  
  // Compliance
  glpCompliant: boolean;
  
  // Dates
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  tags: string[];
}

export interface ExperimentListFilters {
  status?: ExperimentStatus[];
  type?: ExperimentType[];
  laboratoryId?: string;
  projectId?: string;
  principalInvestigatorId?: string;
  glpCompliant?: boolean;
  searchTerm?: string;
}

export type ExperimentSortField = 'experimentId' | 'title' | 'status' | 'type' | 'plannedStartDate' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ExperimentListViewProps {
  experiments: ExperimentListItem[];
  filters?: ExperimentListFilters;
  onFilterChange?: (filters: ExperimentListFilters) => void;
  onExperimentClick?: (experimentId: string) => void;
  onExperimentAction?: (experimentId: string, action: ExperimentAction) => void;
  onAddExperiment?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type ExperimentAction = 'view' | 'edit' | 'start' | 'pause' | 'resume' | 'complete' | 'cancel' | 'delete';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getExperimentStatusDisplayName(status: ExperimentStatus): string {
  const names: Record<ExperimentStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    ON_HOLD: 'On Hold',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    ARCHIVED: 'Archived',
  };
  return names[status] || status;
}

export function getExperimentStatusColor(status: ExperimentStatus): string {
  const colors: Record<ExperimentStatus, string> = {
    DRAFT: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
    PLANNED: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
    IN_PROGRESS: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
    ON_HOLD: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
    COMPLETED: 'text-teal-600 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/30',
    FAILED: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
    CANCELLED: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
    ARCHIVED: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getExperimentStatusIcon(status: ExperimentStatus): LucideIcon {
  const icons: Record<ExperimentStatus, LucideIcon> = {
    DRAFT: Edit,
    PLANNED: Calendar,
    IN_PROGRESS: PlayCircle,
    ON_HOLD: PauseCircle,
    COMPLETED: CheckCircle,
    FAILED: XCircle,
    CANCELLED: StopCircle,
    ARCHIVED: Clock,
  };
  return icons[status] || FlaskRound;
}

export function getExperimentTypeDisplayName(type: ExperimentType): string {
  const names: Record<ExperimentType, string> = {
    SYNTHESIS: 'Synthesis',
    SCREENING: 'Screening',
    ASSAY: 'Assay',
    ADME: 'ADME',
    TOXICOLOGY: 'Toxicology',
    FORMULATION: 'Formulation',
    STABILITY: 'Stability',
    ANALYTICAL: 'Analytical',
    BIOANALYTICAL: 'Bioanalytical',
    IN_VIVO: 'In Vivo',
    IN_VITRO: 'In Vitro',
    COMPUTATIONAL: 'Computational',
  };
  return names[type] || type;
}

export function getExperimentTypeColor(type: ExperimentType): string {
  const colors: Record<ExperimentType, string> = {
    SYNTHESIS: 'text-purple-600 bg-purple-50',
    SCREENING: 'text-blue-600 bg-blue-50',
    ASSAY: 'text-cyan-600 bg-cyan-50',
    ADME: 'text-orange-600 bg-orange-50',
    TOXICOLOGY: 'text-red-600 bg-red-50',
    FORMULATION: 'text-green-600 bg-green-50',
    STABILITY: 'text-amber-600 bg-amber-50',
    ANALYTICAL: 'text-indigo-600 bg-indigo-50',
    BIOANALYTICAL: 'text-rose-600 bg-rose-50',
    IN_VIVO: 'text-pink-600 bg-pink-50',
    IN_VITRO: 'text-teal-600 bg-teal-50',
    COMPUTATIONAL: 'text-slate-600 bg-slate-50',
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function isActive(status: ExperimentStatus): boolean {
  return ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'].includes(status);
}

export function isTerminal(status: ExperimentStatus): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELLED', 'ARCHIVED'].includes(status);
}

export function canStart(status: ExperimentStatus): boolean {
  return status === 'PLANNED';
}

export function canPause(status: ExperimentStatus): boolean {
  return status === 'IN_PROGRESS';
}

export function canResume(status: ExperimentStatus): boolean {
  return status === 'ON_HOLD';
}

export function canComplete(status: ExperimentStatus): boolean {
  return status === 'IN_PROGRESS';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ExperimentCardProps {
  experiment: ExperimentListItem;
  onClick?: () => void;
  onAction?: (action: ExperimentAction) => void;
  showActions?: boolean;
}

function ExperimentCard({ experiment, onClick, onAction, showActions = true }: ExperimentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getExperimentStatusIcon(experiment.status);
  const experimentIsActive = isActive(experiment.status);
  const experimentIsTerminal = isTerminal(experiment.status);
  const isInProgress = experiment.status === 'IN_PROGRESS';
  const isOnHold = experiment.status === 'ON_HOLD';

  // Calculate progress (if in progress)
  const hasPlannedDates = experiment.plannedStartDate && experiment.plannedEndDate;
  const progressPercent = useMemo(() => {
    if (!isInProgress || !hasPlannedDates) return 0;
    const start = experiment.actualStartDate?.getTime() || experiment.plannedStartDate!.getTime();
    const end = experiment.plannedEndDate!.getTime();
    const now = Date.now();
    return Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
  }, [experiment, isInProgress, hasPlannedDates]);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${
        onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isInProgress ? 'bg-green-50 dark:bg-green-900/20' : 
            isOnHold ? 'bg-amber-50 dark:bg-amber-900/20' : 
            experimentIsTerminal ? 'bg-gray-50 dark:bg-gray-800' : 
            'bg-blue-50 dark:bg-blue-900/20'
          }`}>
            <StatusIcon className={`h-5 w-5 ${
              isInProgress ? 'text-green-600' : 
              isOnHold ? 'text-amber-600' : 
              experimentIsTerminal ? 'text-gray-500' : 
              'text-blue-600'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{experiment.experimentId}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getExperimentStatusColor(experiment.status)}`}>
                {getExperimentStatusDisplayName(experiment.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{experiment.title}</p>
          </div>
        </div>
        {showActions && (
          <div className="relative">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('view');
                    setShowMenu(false);
                  }}
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                  View Details
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('edit');
                    setShowMenu(false);
                  }}
                >
                  <Edit className="h-4 w-4 text-gray-400" />
                  Edit Experiment
                </button>
                {canStart(experiment.status) && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('start');
                      setShowMenu(false);
                    }}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Start Experiment
                  </button>
                )}
                {canPause(experiment.status) && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('pause');
                      setShowMenu(false);
                    }}
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pause Experiment
                  </button>
                )}
                {canResume(experiment.status) && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('resume');
                      setShowMenu(false);
                    }}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Resume Experiment
                  </button>
                )}
                {canComplete(experiment.status) && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('complete');
                      setShowMenu(false);
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete Experiment
                  </button>
                )}
                {experimentIsActive && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('cancel');
                        setShowMenu(false);
                      }}
                    >
                      <StopCircle className="h-4 w-4" />
                      Cancel Experiment
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Type & GLP Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getExperimentTypeColor(experiment.type)}`}>
          {getExperimentTypeDisplayName(experiment.type)}
        </span>
        {experiment.glpCompliant && (
          <span className="px-2 py-0.5 rounded text-xs font-medium text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20">
            GLP
          </span>
        )}
        {experiment.laboratoryName && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{experiment.laboratoryName}</span>
        )}
      </div>

      {/* Progress Bar (for in-progress experiments) */}
      {isInProgress && hasPlannedDates && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className="text-gray-600 dark:text-gray-300">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressPercent > 100 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Objectives */}
      {experiment.objectives.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <Target className="h-3.5 w-3.5" />
            <span>Objectives</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
            {experiment.objectives.join('; ')}
          </p>
        </div>
      )}

      {/* PI & Dates */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-500">Principal Investigator</span>
          <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <User className="h-3 w-3" />
            {experiment.principalInvestigatorName}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-500">
            {experiment.actualStartDate ? 'Started' : 'Planned Start'}
          </span>
          <p className="text-gray-700 dark:text-gray-300">
            {formatDate(experiment.actualStartDate || experiment.plannedStartDate)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {experiment.teamMemberCount} members
          </span>
          <span className="flex items-center gap-1">
            <FlaskRound className="h-3.5 w-3.5" />
            {experiment.sampleCount} samples
          </span>
          {experiment.resultCount > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              {experiment.resultCount} results
            </span>
          )}
        </div>
        {experiment.tags.length > 0 && (
          <div className="flex items-center gap-1">
            {experiment.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
            {experiment.tags.length > 2 && (
              <span className="text-xs text-gray-400">+{experiment.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExperimentFilterPanelProps {
  filters: ExperimentListFilters;
  onFilterChange: (filters: ExperimentListFilters) => void;
}

function ExperimentFilterPanel({ filters, onFilterChange }: ExperimentFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statuses: ExperimentStatus[] = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const types: ExperimentType[] = ['SYNTHESIS', 'SCREENING', 'ASSAY', 'ADME', 'TOXICOLOGY', 'FORMULATION', 'ANALYTICAL', 'BIOANALYTICAL'];
  
  const activeFilterCount = [
    filters.status?.length,
    filters.type?.length,
    filters.glpCompliant !== undefined ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <button
        className="flex items-center justify-between w-full"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
            <div className="flex flex-wrap gap-1">
              {statuses.slice(0, 5).map((status) => (
                <button
                  key={status}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    filters.status?.includes(status)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    const current = filters.status || [];
                    const updated = current.includes(status)
                      ? current.filter((s) => s !== status)
                      : [...current, status];
                    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
                  }}
                >
                  {getExperimentStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1">
              {types.slice(0, 6).map((type) => (
                <button
                  key={type}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    filters.type?.includes(type)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    const current = filters.type || [];
                    const updated = current.includes(type)
                      ? current.filter((t) => t !== type)
                      : [...current, type];
                    onFilterChange({ ...filters, type: updated.length > 0 ? updated : undefined });
                  }}
                >
                  {getExperimentTypeDisplayName(type)}
                </button>
              ))}
            </div>
          </div>

          {/* GLP Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="glp-compliant"
              checked={filters.glpCompliant === true}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  glpCompliant: e.target.checked ? true : undefined,
                });
              }}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
            />
            <label htmlFor="glp-compliant" className="text-sm text-gray-600 dark:text-gray-400">
              GLP Compliant only
            </label>
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

export function ExperimentListView({
  experiments,
  filters = {},
  onFilterChange,
  onExperimentClick,
  onExperimentAction,
  onAddExperiment,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: ExperimentListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<ExperimentSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredExperiments = useMemo(() => {
    let result = [...experiments];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.experimentId.toLowerCase().includes(term) ||
          e.title.toLowerCase().includes(term) ||
          e.principalInvestigatorName.toLowerCase().includes(term) ||
          (e.projectName?.toLowerCase().includes(term)) ||
          (e.laboratoryName?.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((e) => filters.status!.includes(e.status));
    }

    // Type filter
    if (filters.type?.length) {
      result = result.filter((e) => filters.type!.includes(e.type));
    }

    // GLP filter
    if (filters.glpCompliant !== undefined) {
      result = result.filter((e) => e.glpCompliant === filters.glpCompliant);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'experimentId':
          comparison = a.experimentId.localeCompare(b.experimentId);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'plannedStartDate':
          const aPlan = a.plannedStartDate?.getTime() || 0;
          const bPlan = b.plannedStartDate?.getTime() || 0;
          comparison = aPlan - bPlan;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [experiments, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredExperiments.length;
    const active = filteredExperiments.filter((e) => isActive(e.status)).length;
    const inProgress = filteredExperiments.filter((e) => e.status === 'IN_PROGRESS').length;
    const completed = filteredExperiments.filter((e) => e.status === 'COMPLETED').length;
    return { total, active, inProgress, completed };
  }, [filteredExperiments]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Experiments</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.total} experiments • {stats.active} active • {stats.inProgress} in progress • {stats.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            onClick={onExport}
          >
            <Download className="h-5 w-5" />
          </button>
          {onAddExperiment && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddExperiment}
            >
              <Plus className="h-4 w-4" />
              New Experiment
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by ID, title, PI, project, or lab..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <ExperimentFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Experiment Grid */}
      {filteredExperiments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <FlaskRound className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No experiments found</p>
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
          {filteredExperiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onClick={() => onExperimentClick?.(experiment.id)}
              onAction={(action) => onExperimentAction?.(experiment.id, action)}
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

export function createMockExperimentListItem(overrides?: Partial<ExperimentListItem>): ExperimentListItem {
  return {
    id: 'exp-001',
    experimentId: 'EXP-2025-0001',
    title: 'Dose-Response Study for Lead Compound',
    type: 'ASSAY',
    status: 'IN_PROGRESS',
    laboratoryId: 'lab-001',
    laboratoryName: 'Discovery Lab A',
    projectId: 'proj-001',
    projectName: 'Project Alpha',
    principalInvestigatorId: 'user-001',
    principalInvestigatorName: 'Dr. Jane Smith',
    description: 'Comprehensive dose-response characterization of lead compound',
    objectives: [
      'Determine IC50 values',
      'Establish dose-response curve',
      'Identify maximum tolerated dose',
    ],
    teamMemberCount: 4,
    sampleCount: 12,
    compoundCount: 3,
    parameterCount: 8,
    resultCount: 24,
    glpCompliant: true,
    plannedStartDate: new Date('2025-01-01'),
    plannedEndDate: new Date('2025-01-31'),
    actualStartDate: new Date('2025-01-05'),
    createdAt: new Date('2024-12-15'),
    createdBy: 'user-001',
    tags: ['high-priority', 'lead-compound'],
    ...overrides,
  };
}

export default ExperimentListView;
