
/**
 * Batch List View Component
 * Batch records, QC workflow, and release management
 * @version 0.21.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Package,
  Factory,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  FileCheck,
  Eye,
  Edit,
  Play,
  Lock,
  Unlock,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import type { Batch, BatchStatus, BatchSpecification, StorageCondition } from '@/types/lab-discovery';

// =============================================================================
// TYPES
// =============================================================================

export interface BatchListItem {
  id: string;
  batchNumber: string;
  compoundId: string;
  compoundName?: string;
  status: BatchStatus;
  
  // Production
  manufacturingDate: Date;
  manufacturingSiteId?: string;
  manufacturingSiteName?: string;
  manufacturingMethod?: string;
  scaleType: 'LAB' | 'PILOT' | 'COMMERCIAL';
  
  // Quantity
  initialQuantity: number;
  currentQuantity: number;
  quantityUnit: string;
  
  // Quality
  purity?: number;
  potency?: number;
  specifications: BatchSpecificationSummary[];
  
  // Storage
  storageCondition: StorageCondition;
  
  // Dates
  expiryDate?: Date;
  retestDate?: Date;
  releaseDate?: Date;
  releasedBy?: string;
  
  // Tracking
  sampleCount: number;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
}

export interface BatchSpecificationSummary {
  id: string;
  parameter: string;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'NOT_TESTED';
}

export interface BatchListFilters {
  status?: BatchStatus[];
  compoundId?: string;
  scaleType?: ('LAB' | 'PILOT' | 'COMMERCIAL')[];
  pendingQC?: boolean;
  expiringSoon?: boolean;
  searchTerm?: string;
}

export type BatchSortField = 'batchNumber' | 'status' | 'manufacturingDate' | 'currentQuantity' | 'expiryDate' | 'purity';
export type SortDirection = 'asc' | 'desc';

export interface BatchListViewProps {
  batches: BatchListItem[];
  filters?: BatchListFilters;
  onFilterChange?: (filters: BatchListFilters) => void;
  onBatchClick?: (batchId: string) => void;
  onBatchAction?: (batchId: string, action: BatchAction) => void;
  onAddBatch?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type BatchAction = 'view' | 'edit' | 'start_qc' | 'release' | 'reject' | 'quarantine' | 'view_coa';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getBatchStatusDisplayName(status: BatchStatus): string {
  const names: Record<BatchStatus, string> = {
    PLANNED: 'Planned',
    IN_PRODUCTION: 'In Production',
    QC_PENDING: 'QC Pending',
    QC_IN_PROGRESS: 'QC In Progress',
    RELEASED: 'Released',
    REJECTED: 'Rejected',
    QUARANTINED: 'Quarantined',
    EXPIRED: 'Expired',
  };
  return names[status] || status;
}

export function getBatchStatusColor(status: BatchStatus): string {
  const colors: Record<BatchStatus, string> = {
    PLANNED: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
    IN_PRODUCTION: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
    QC_PENDING: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
    QC_IN_PROGRESS: 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30',
    RELEASED: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
    REJECTED: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
    QUARANTINED: 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30',
    EXPIRED: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getBatchStatusIcon(status: BatchStatus): LucideIcon {
  const icons: Record<BatchStatus, LucideIcon> = {
    PLANNED: Clock,
    IN_PRODUCTION: Factory,
    QC_PENDING: ClipboardCheck,
    QC_IN_PROGRESS: Shield,
    RELEASED: CheckCircle,
    REJECTED: XCircle,
    QUARANTINED: Lock,
    EXPIRED: AlertTriangle,
  };
  return icons[status] || Package;
}

export function getScaleTypeLabel(scale: 'LAB' | 'PILOT' | 'COMMERCIAL'): string {
  const labels = {
    LAB: 'Lab Scale',
    PILOT: 'Pilot Scale',
    COMMERCIAL: 'Commercial',
  };
  return labels[scale];
}

export function getScaleTypeColor(scale: 'LAB' | 'PILOT' | 'COMMERCIAL'): string {
  const colors = {
    LAB: 'text-cyan-600 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-900/20',
    PILOT: 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20',
    COMMERCIAL: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20',
  };
  return colors[scale];
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatPercentage(value?: number): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(1)}%`;
}

export function isExpiringSoon(expiryDate?: Date, daysThreshold = 30): boolean {
  if (!expiryDate) return false;
  const thresholdDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
  return expiryDate <= thresholdDate && expiryDate > new Date();
}

export function canStartQC(status: BatchStatus): boolean {
  return status === 'QC_PENDING';
}

export function canRelease(status: BatchStatus): boolean {
  return status === 'QC_IN_PROGRESS';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface BatchCardProps {
  batch: BatchListItem;
  onClick?: () => void;
  onAction?: (action: BatchAction) => void;
  showActions?: boolean;
}

function BatchCard({ batch, onClick, onAction, showActions = true }: BatchCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getBatchStatusIcon(batch.status);
  const isReleased = batch.status === 'RELEASED';
  const isRejected = batch.status === 'REJECTED';
  const isPendingQC = batch.status === 'QC_PENDING' || batch.status === 'QC_IN_PROGRESS';
  
  const passedSpecs = batch.specifications.filter((s) => s.status === 'PASS').length;
  const failedSpecs = batch.specifications.filter((s) => s.status === 'FAIL').length;
  const pendingSpecs = batch.specifications.filter((s) => s.status === 'PENDING').length;
  const totalSpecs = batch.specifications.length;
  
  const quantityPercent = (batch.currentQuantity / batch.initialQuantity) * 100;
  const expiringSoon = isExpiringSoon(batch.expiryDate);

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
            isReleased ? 'bg-green-50 dark:bg-green-900/20' : 
            isRejected ? 'bg-red-50 dark:bg-red-900/20' : 
            isPendingQC ? 'bg-amber-50 dark:bg-amber-900/20' : 
            'bg-gray-50 dark:bg-gray-800'
          }`}>
            <StatusIcon className={`h-5 w-5 ${
              isReleased ? 'text-green-600' : 
              isRejected ? 'text-red-600' : 
              isPendingQC ? 'text-amber-600' : 
              'text-gray-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{batch.batchNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBatchStatusColor(batch.status)}`}>
                {getBatchStatusDisplayName(batch.status)}
              </span>
            </div>
            {batch.compoundName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{batch.compoundName}</p>
            )}
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
                {isReleased && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('view_coa');
                      setShowMenu(false);
                    }}
                  >
                    <FileCheck className="h-4 w-4 text-gray-400" />
                    View CoA
                  </button>
                )}
                {canStartQC(batch.status) && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('start_qc');
                      setShowMenu(false);
                    }}
                  >
                    <Play className="h-4 w-4 text-gray-400" />
                    Start QC
                  </button>
                )}
                {canRelease(batch.status) && (
                  <>
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('release');
                        setShowMenu(false);
                      }}
                    >
                      <Unlock className="h-4 w-4" />
                      Release Batch
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('reject');
                        setShowMenu(false);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Batch
                    </button>
                  </>
                )}
                {!isRejected && batch.status !== 'QUARANTINED' && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('quarantine');
                      setShowMenu(false);
                    }}
                  >
                    <Lock className="h-4 w-4" />
                    Quarantine
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scale Type & Method */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScaleTypeColor(batch.scaleType)}`}>
          {getScaleTypeLabel(batch.scaleType)}
        </span>
        {batch.manufacturingMethod && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{batch.manufacturingMethod}</span>
        )}
      </div>

      {/* QC Status Bar */}
      {totalSpecs > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">QC Progress</span>
            <span className="text-gray-600 dark:text-gray-300">
              {passedSpecs}/{totalSpecs} specs passed
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
            {passedSpecs > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(passedSpecs / totalSpecs) * 100}%` }}
              />
            )}
            {failedSpecs > 0 && (
              <div
                className="h-full bg-red-500"
                style={{ width: `${(failedSpecs / totalSpecs) * 100}%` }}
              />
            )}
            {pendingSpecs > 0 && (
              <div
                className="h-full bg-gray-300 dark:bg-gray-600"
                style={{ width: `${(pendingSpecs / totalSpecs) * 100}%` }}
              />
            )}
          </div>
          {failedSpecs > 0 && (
            <p className="text-[10px] text-red-500 mt-0.5">{failedSpecs} spec(s) failed</p>
          )}
        </div>
      )}

      {/* Properties Grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {batch.purity !== undefined && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">Purity</span>
            <p className="text-gray-700 dark:text-gray-300 font-medium">{formatPercentage(batch.purity)}</p>
          </div>
        )}
        <div>
          <span className="text-gray-500 dark:text-gray-500">Available</span>
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            {formatQuantity(batch.currentQuantity, batch.quantityUnit)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-500">Manufactured</span>
          <p className="text-gray-700 dark:text-gray-300">{formatDate(batch.manufacturingDate)}</p>
        </div>
        {batch.expiryDate && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">Expires</span>
            <p className={`${expiringSoon ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {formatDate(batch.expiryDate)}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {batch.sampleCount} samples
          </span>
          {batch.releaseDate && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Released {formatDate(batch.releaseDate)}
            </span>
          )}
        </div>
        {expiringSoon && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>
    </div>
  );
}

interface BatchFilterPanelProps {
  filters: BatchListFilters;
  onFilterChange: (filters: BatchListFilters) => void;
}

function BatchFilterPanel({ filters, onFilterChange }: BatchFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statuses: BatchStatus[] = ['PLANNED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_IN_PROGRESS', 'RELEASED', 'REJECTED', 'QUARANTINED', 'EXPIRED'];
  const scaleTypes: ('LAB' | 'PILOT' | 'COMMERCIAL')[] = ['LAB', 'PILOT', 'COMMERCIAL'];
  
  const activeFilterCount = [
    filters.status?.length,
    filters.scaleType?.length,
    filters.pendingQC ? 1 : 0,
    filters.expiringSoon ? 1 : 0,
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
                  {getBatchStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Type Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Scale</label>
            <div className="flex flex-wrap gap-1">
              {scaleTypes.map((scale) => (
                <button
                  key={scale}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    filters.scaleType?.includes(scale)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    const current = filters.scaleType || [];
                    const updated = current.includes(scale)
                      ? current.filter((s) => s !== scale)
                      : [...current, scale];
                    onFilterChange({ ...filters, scaleType: updated.length > 0 ? updated : undefined });
                  }}
                >
                  {getScaleTypeLabel(scale)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pending-qc"
                checked={filters.pendingQC === true}
                onChange={(e) => {
                  onFilterChange({
                    ...filters,
                    pendingQC: e.target.checked ? true : undefined,
                  });
                }}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
              <label htmlFor="pending-qc" className="text-sm text-gray-600 dark:text-gray-400">
                Pending QC
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="expiring-soon-batch"
                checked={filters.expiringSoon === true}
                onChange={(e) => {
                  onFilterChange({
                    ...filters,
                    expiringSoon: e.target.checked ? true : undefined,
                  });
                }}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
              <label htmlFor="expiring-soon-batch" className="text-sm text-gray-600 dark:text-gray-400">
                Expiring within 30 days
              </label>
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

export function BatchListView({
  batches,
  filters = {},
  onFilterChange,
  onBatchClick,
  onBatchAction,
  onAddBatch,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: BatchListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<BatchSortField>('batchNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredBatches = useMemo(() => {
    let result = [...batches];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(term) ||
          (b.compoundName?.toLowerCase().includes(term)) ||
          (b.manufacturingMethod?.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((b) => filters.status!.includes(b.status));
    }

    // Scale type filter
    if (filters.scaleType?.length) {
      result = result.filter((b) => filters.scaleType!.includes(b.scaleType));
    }

    // Pending QC filter
    if (filters.pendingQC) {
      result = result.filter((b) => b.status === 'QC_PENDING' || b.status === 'QC_IN_PROGRESS');
    }

    // Expiring soon filter
    if (filters.expiringSoon) {
      result = result.filter((b) => isExpiringSoon(b.expiryDate));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'batchNumber':
          comparison = a.batchNumber.localeCompare(b.batchNumber);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'manufacturingDate':
          comparison = a.manufacturingDate.getTime() - b.manufacturingDate.getTime();
          break;
        case 'currentQuantity':
          comparison = a.currentQuantity - b.currentQuantity;
          break;
        case 'expiryDate':
          const aExp = a.expiryDate?.getTime() || Infinity;
          const bExp = b.expiryDate?.getTime() || Infinity;
          comparison = aExp - bExp;
          break;
        case 'purity':
          comparison = (a.purity || 0) - (b.purity || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [batches, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredBatches.length;
    const released = filteredBatches.filter((b) => b.status === 'RELEASED').length;
    const pendingQC = filteredBatches.filter((b) => ['QC_PENDING', 'QC_IN_PROGRESS'].includes(b.status)).length;
    const expiringSoon = filteredBatches.filter((b) => isExpiringSoon(b.expiryDate)).length;
    return { total, released, pendingQC, expiringSoon };
  }, [filteredBatches]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Batches</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.total} batches • {stats.released} released
            {stats.pendingQC > 0 && ` • ${stats.pendingQC} pending QC`}
            {stats.expiringSoon > 0 && ` • ${stats.expiringSoon} expiring`}
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
          {onAddBatch && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddBatch}
            >
              <Plus className="h-4 w-4" />
              Create Batch
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by batch number, compound, or method..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <BatchFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Batch Grid */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No batches found</p>
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
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onClick={() => onBatchClick?.(batch.id)}
              onAction={(action) => onBatchAction?.(batch.id, action)}
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

export function createMockBatchListItem(overrides?: Partial<BatchListItem>): BatchListItem {
  return {
    id: 'batch-001',
    batchNumber: 'BATCH-2025-001',
    compoundId: 'cpd-001',
    compoundName: 'Lead Compound Alpha',
    status: 'RELEASED',
    manufacturingDate: new Date('2025-01-01'),
    manufacturingMethod: 'Synthetic Route A',
    scaleType: 'LAB',
    initialQuantity: 500,
    currentQuantity: 350,
    quantityUnit: 'MG',
    purity: 98.5,
    potency: 99.2,
    specifications: [
      { id: 'spec-1', parameter: 'Purity', status: 'PASS' },
      { id: 'spec-2', parameter: 'Identity', status: 'PASS' },
      { id: 'spec-3', parameter: 'Residual Solvents', status: 'PASS' },
    ],
    storageCondition: 'FROZEN',
    expiryDate: new Date('2026-01-01'),
    releaseDate: new Date('2025-01-05'),
    releasedBy: 'QC Manager',
    sampleCount: 8,
    createdAt: new Date('2025-01-01'),
    createdBy: 'user-001',
    ...overrides,
  };
}

export default BatchListView;
