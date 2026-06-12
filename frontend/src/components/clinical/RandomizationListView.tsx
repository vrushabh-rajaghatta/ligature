
/**
 * Randomization List View
 * Randomization assignment tracking and arm distribution
 * @version 0.20.9.4
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Shuffle,
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
  RotateCcw,
  Unlock,
  AlertCircle,
  User,
  Building2,
  Calendar,
  Pill,
  Shield,
  BarChart3,
  Layers,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type RandomizationAssignmentStatus = 'PENDING' | 'ASSIGNED' | 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'UNBLINDED';
export type RandomizationAction = 'view' | 'unblind' | 'discontinue' | 'reassign' | 'view_history';
export type RandomizationSortField = 'subjectNumber' | 'siteName' | 'armName' | 'status' | 'randomizedAt' | 'stratumName';

export interface RandomizationListItem {
  id: string;
  randomizationNumber: string;
  subjectId: string;
  subjectNumber: string;
  siteId: string;
  siteName: string;
  siteNumber: string;
  armId: string;
  armName: string;
  armCode: string;
  status: RandomizationAssignmentStatus;
  stratumId?: string;
  stratumName?: string;
  stratificationFactors: StratificationFactorValue[];
  randomizedAt: Date;
  randomizedBy: string;
  treatmentStartDate?: Date;
  treatmentEndDate?: Date;
  discontinuedAt?: Date;
  discontinuedReason?: string;
  isUnblinded: boolean;
  unblindedAt?: Date;
  unblindedBy?: string;
  unblindedReason?: string;
  kitNumber?: string;
  isEmergencyUnblind: boolean;
  hasUnblindingRequest: boolean;
  pendingUnblindingRequestId?: string;
}

export interface StratificationFactorValue {
  factorId: string;
  factorName: string;
  levelId: string;
  levelName: string;
}

export interface ArmDistribution {
  armId: string;
  armName: string;
  armCode: string;
  count: number;
  target: number;
  percentComplete: number;
  isBalanced: boolean;
  deviationPercent: number;
}

export interface RandomizationListFilters {
  status?: RandomizationAssignmentStatus[];
  armId?: string[];
  siteId?: string[];
  stratumId?: string[];
  isUnblinded?: boolean;
  hasUnblindingRequest?: boolean;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
}

export interface RandomizationListViewProps {
  assignments: RandomizationListItem[];
  armDistribution?: ArmDistribution[];
  filters: RandomizationListFilters;
  onFilterChange: (filters: RandomizationListFilters) => void;
  onAssignmentClick?: (assignmentId: string) => void;
  onAssignmentAction?: (assignmentId: string, action: RandomizationAction) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  showArmDistribution?: boolean;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getRandomizationStatusDisplayName(status: RandomizationAssignmentStatus): string {
  const names: Record<RandomizationAssignmentStatus, string> = {
    PENDING: 'Pending',
    ASSIGNED: 'Assigned',
    ACTIVE: 'Active',
    DISCONTINUED: 'Discontinued',
    COMPLETED: 'Completed',
    UNBLINDED: 'Unblinded',
  };
  return names[status] || status;
}

export function getRandomizationStatusColor(status: RandomizationAssignmentStatus): string {
  const colors: Record<RandomizationAssignmentStatus, string> = {
    PENDING: 'text-gray-600 bg-gray-100',
    ASSIGNED: 'text-blue-600 bg-blue-100',
    ACTIVE: 'text-green-600 bg-green-100',
    DISCONTINUED: 'text-red-600 bg-red-100',
    COMPLETED: 'text-purple-600 bg-purple-100',
    UNBLINDED: 'text-amber-600 bg-amber-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getRandomizationStatusIcon(status: RandomizationAssignmentStatus): LucideIcon {
  const icons: Record<RandomizationAssignmentStatus, LucideIcon> = {
    PENDING: Clock,
    ASSIGNED: Shuffle,
    ACTIVE: Pill,
    DISCONTINUED: XCircle,
    COMPLETED: CheckCircle,
    UNBLINDED: Unlock,
  };
  return icons[status] || Shuffle;
}

export function getArmColor(index: number): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  return colors[index % colors.length];
}

export function getArmBadgeColor(index: number): string {
  const colors = [
    'text-blue-700 bg-blue-100',
    'text-green-700 bg-green-100',
    'text-purple-700 bg-purple-100',
    'text-amber-700 bg-amber-100',
    'text-cyan-700 bg-cyan-100',
    'text-pink-700 bg-pink-100',
    'text-indigo-700 bg-indigo-100',
    'text-teal-700 bg-teal-100',
  ];
  return colors[index % colors.length];
}

export function formatRandomizationDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRandomizationDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getBalanceIndicator(deviationPercent: number): { color: string; label: string } {
  if (Math.abs(deviationPercent) <= 5) {
    return { color: 'text-green-600', label: 'Balanced' };
  }
  if (Math.abs(deviationPercent) <= 10) {
    return { color: 'text-amber-600', label: 'Minor Imbalance' };
  }
  return { color: 'text-red-600', label: 'Imbalanced' };
}

export function createMockRandomizationListItem(overrides: Partial<RandomizationListItem> = {}): RandomizationListItem {
  const id = overrides.id || `rand-${Math.random().toString(36).substr(2, 9)}`;
  const arms = ['Treatment A', 'Treatment B', 'Placebo'];
  const armIndex = Math.floor(Math.random() * arms.length);
  
  return {
    id,
    randomizationNumber: `R-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
    subjectId: `subj-${Math.random().toString(36).substr(2, 6)}`,
    subjectNumber: `001-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
    siteId: 'site-001',
    siteName: 'General Hospital Research Center',
    siteNumber: '001',
    armId: `arm-${armIndex}`,
    armName: arms[armIndex],
    armCode: ['TRT-A', 'TRT-B', 'PBO'][armIndex],
    status: 'ACTIVE',
    stratificationFactors: [
      { factorId: 'age', factorName: 'Age Group', levelId: 'adult', levelName: '18-65' },
      { factorId: 'sex', factorName: 'Sex', levelId: 'male', levelName: 'Male' },
    ],
    randomizedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    randomizedBy: 'IXRS System',
    isUnblinded: false,
    isEmergencyUnblind: false,
    hasUnblindingRequest: Math.random() > 0.9,
    ...overrides,
  };
}

export function createMockArmDistribution(arms: string[] = ['Treatment A', 'Treatment B', 'Placebo']): ArmDistribution[] {
  const target = 50;
  return arms.map((name, index) => {
    const count = Math.floor(Math.random() * 20) + 40;
    const percentComplete = Math.round((count / target) * 100);
    const deviationPercent = Math.round(((count - target) / target) * 100);
    return {
      armId: `arm-${index}`,
      armName: name,
      armCode: ['TRT-A', 'TRT-B', 'PBO'][index] || `ARM-${index}`,
      count,
      target,
      percentComplete,
      isBalanced: Math.abs(deviationPercent) <= 5,
      deviationPercent,
    };
  });
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ArmDistributionPanelProps {
  distribution: ArmDistribution[];
}

function ArmDistributionPanel({ distribution }: ArmDistributionPanelProps) {
  const totalCount = distribution.reduce((sum, arm) => sum + arm.count, 0);
  const totalTarget = distribution.reduce((sum, arm) => sum + arm.target, 0);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Arm Distribution</h3>
        </div>
        <div className="text-sm text-gray-500">
          {totalCount} / {totalTarget} randomized
        </div>
      </div>
      
      {/* Visual Bar */}
      <div className="h-8 flex rounded-lg overflow-hidden mb-4">
        {distribution.map((arm, index) => (
          <div
            key={arm.armId}
            className={`${getArmColor(index)} transition-all`}
            style={{ width: `${(arm.count / totalCount) * 100}%` }}
            title={`${arm.armName}: ${arm.count} subjects`}
          />
        ))}
      </div>
      
      {/* Legend and Stats */}
      <div className="grid grid-cols-3 gap-4">
        {distribution.map((arm, index) => {
          const balance = getBalanceIndicator(arm.deviationPercent);
          return (
            <div key={arm.armId} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${getArmColor(index)}`} />
                <span className="text-sm font-medium text-gray-900">{arm.armName}</span>
              </div>
              <div className="text-sm text-gray-600">
                {arm.count} / {arm.target} ({arm.percentComplete}%)
              </div>
              <div className={`text-xs ${balance?.color ?? ''}`}>
                {arm.deviationPercent > 0 ? '+' : ''}{arm.deviationPercent}% • {balance.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RandomizationCardProps {
  assignment: RandomizationListItem;
  armIndex: number;
  onClick?: () => void;
  onAction?: (action: RandomizationAction) => void;
}

function RandomizationCard({ assignment, armIndex, onClick, onAction }: RandomizationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const StatusIcon = getRandomizationStatusIcon(assignment.status);
  
  const availableActions: { action: RandomizationAction; label: string; icon: LucideIcon; disabled?: boolean }[] = [
    { action: 'view', label: 'View Details', icon: Eye },
    { action: 'view_history', label: 'View History', icon: Layers },
    { action: 'unblind', label: 'Request Unblinding', icon: Unlock, disabled: assignment.isUnblinded || assignment.hasUnblindingRequest },
    { action: 'discontinue', label: 'Discontinue Treatment', icon: XCircle, disabled: assignment.status === 'DISCONTINUED' || assignment.status === 'COMPLETED' },
  ];

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getRandomizationStatusColor(assignment.status)}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{assignment.randomizationNumber}</h3>
            <p className="text-xs text-gray-500">Subject {assignment.subjectNumber}</p>
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

      {/* Arm Assignment */}
      <div className="mb-3 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getArmColor(armIndex)}`} />
          <span className={`text-sm font-medium px-2 py-0.5 rounded ${getArmBadgeColor(armIndex)}`}>
            {assignment.armName}
          </span>
          <span className="text-xs text-gray-500">({assignment.armCode})</span>
        </div>
        {assignment.kitNumber && (
          <div className="mt-1 text-xs text-gray-500">
            Kit: {assignment.kitNumber}
          </div>
        )}
      </div>

      {/* Site Info */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>{assignment.siteNumber}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatRandomizationDate(assignment.randomizedAt)}</span>
        </div>
      </div>

      {/* Stratification Factors */}
      {assignment.stratificationFactors.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Stratification</div>
          <div className="flex flex-wrap gap-1">
            {assignment.stratificationFactors.map(factor => (
              <span 
                key={factor.factorId}
                className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {factor.factorName}: {factor.levelName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status Badges */}
      <div className="flex items-center flex-wrap gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRandomizationStatusColor(assignment.status)}`}>
          {getRandomizationStatusDisplayName(assignment.status)}
        </span>
        
        {assignment.isUnblinded && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-600 bg-amber-50">
            <Unlock className="w-3 h-3" />
            Unblinded
          </span>
        )}
        
        {assignment.hasUnblindingRequest && !assignment.isUnblinded && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50">
            <Clock className="w-3 h-3" />
            Unblind Requested
          </span>
        )}
        
        {assignment.isEmergencyUnblind && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-50">
            <AlertCircle className="w-3 h-3" />
            Emergency
          </span>
        )}
      </div>

      {/* Discontinuation Info */}
      {assignment.status === 'DISCONTINUED' && assignment.discontinuedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Discontinued {formatRandomizationDate(assignment.discontinuedAt)}
          {assignment.discontinuedReason && `: ${assignment.discontinuedReason}`}
        </div>
      )}
    </div>
  );
}

interface RandomizationFilterPanelProps {
  filters: RandomizationListFilters;
  onFilterChange: (filters: RandomizationListFilters) => void;
  assignments: RandomizationListItem[];
}

function RandomizationFilterPanel({ filters, onFilterChange, assignments }: RandomizationFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const uniqueArms = useMemo(() => {
    const arms = new Map<string, string>();
    assignments.forEach(a => arms.set(a.armId, a.armName));
    return Array.from(arms.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);
  
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    assignments.forEach(a => sites.set(a.siteId, a.siteName));
    return Array.from(sites.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.armId?.length) count++;
    if (filters.siteId?.length) count++;
    if (filters.isUnblinded !== undefined) count++;
    if (filters.hasUnblindingRequest) count++;
    return count;
  }, [filters]);

  const statuses: RandomizationAssignmentStatus[] = ['PENDING', 'ASSIGNED', 'ACTIVE', 'DISCONTINUED', 'COMPLETED', 'UNBLINDED'];

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
                  {getRandomizationStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Arm Filter */}
          {uniqueArms.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Treatment Arm</label>
              <div className="flex flex-wrap gap-2">
                {uniqueArms.map(({ id, name }) => (
                  <button
                    key={id}
                    onClick={() => {
                      const current = filters.armId || [];
                      const updated = current.includes(id)
                        ? current.filter(a => a !== id)
                        : [...current, id];
                      onFilterChange({ ...filters, armId: updated.length ? updated : undefined });
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      filters.armId?.includes(id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unblinding Filters */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Unblinding</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange({ 
                  ...filters, 
                  isUnblinded: filters.isUnblinded === undefined ? true : undefined 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.isUnblinded
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Unblinded
              </button>
              <button
                onClick={() => onFilterChange({ 
                  ...filters, 
                  hasUnblindingRequest: filters.hasUnblindingRequest ? undefined : true 
                })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.hasUnblindingRequest
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Pending Unblind Request
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

export function RandomizationListView({
  assignments,
  armDistribution,
  filters,
  onFilterChange,
  onAssignmentClick,
  onAssignmentAction,
  onRefresh,
  onExport,
  isLoading = false,
  showArmDistribution = true,
  className = '',
}: RandomizationListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  // Build arm index map for coloring
  const armIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const uniqueArms = new Set<string>();
    assignments.forEach(a => uniqueArms.add(a.armId));
    Array.from(uniqueArms).forEach((armId, index) => {
      map.set(armId, index);
    });
    return map;
  }, [assignments]);

  // Apply filters
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      if (filters.status?.length && !filters.status.includes(assignment.status)) return false;
      if (filters.armId?.length && !filters.armId.includes(assignment.armId)) return false;
      if (filters.siteId?.length && !filters.siteId.includes(assignment.siteId)) return false;
      if (filters.isUnblinded !== undefined && assignment.isUnblinded !== filters.isUnblinded) return false;
      if (filters.hasUnblindingRequest && !assignment.hasUnblindingRequest) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          assignment.randomizationNumber.toLowerCase().includes(search) ||
          assignment.subjectNumber.toLowerCase().includes(search) ||
          assignment.siteName.toLowerCase().includes(search) ||
          assignment.armName.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [assignments, filters, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredAssignments.length;
    const active = filteredAssignments.filter(a => a.status === 'ACTIVE').length;
    const unblinded = filteredAssignments.filter(a => a.isUnblinded).length;
    const discontinued = filteredAssignments.filter(a => a.status === 'DISCONTINUED').length;
    const pendingUnblind = filteredAssignments.filter(a => a.hasUnblindingRequest && !a.isUnblinded).length;
    return { total, active, unblinded, discontinued, pendingUnblind };
  }, [filteredAssignments]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onFilterChange({ ...filters, searchTerm: e.target.value || undefined });
  }, [filters, onFilterChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Randomization</h2>
          <p className="text-sm text-gray-500">
            {stats.total} assignments • {stats.active} active • {stats.unblinded} unblinded
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

      {/* Arm Distribution */}
      {showArmDistribution && armDistribution && armDistribution.length > 0 && (
        <ArmDistributionPanel distribution={armDistribution} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by randomization #, subject, site, arm..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <RandomizationFilterPanel filters={filters} onFilterChange={onFilterChange} assignments={assignments} />

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-600">{stats.unblinded}</div>
          <div className="text-xs text-gray-500">Unblinded</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.discontinued}</div>
          <div className="text-xs text-gray-500">Discontinued</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.pendingUnblind}</div>
          <div className="text-xs text-gray-500">Pending Unblind</div>
        </div>
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Shuffle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No randomization assignments match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map(assignment => (
            <RandomizationCard
              key={assignment.id}
              assignment={assignment}
              armIndex={armIndexMap.get(assignment.armId) || 0}
              onClick={() => onAssignmentClick?.(assignment.id)}
              onAction={(action) => onAssignmentAction?.(assignment.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default RandomizationListView;
