
/**
 * Sample List View Component
 * Sample tracking with chain of custody and location management
 * @version 0.21.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Beaker,
  TestTube,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  MapPin,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  Package,
  Thermometer,
  Snowflake,
  Eye,
  Edit,
  Trash2,
  ArrowRightLeft,
  History,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import type { Sample, SampleStatus, SampleType, StorageCondition, CustodyEvent, CustodyEventType, HazardClass } from '@/types/lab-discovery';

// =============================================================================
// TYPES
// =============================================================================

export interface SampleListItem {
  id: string;
  sampleId: string;
  barcode?: string;
  status: SampleStatus;
  type: SampleType;
  
  // Source
  compoundId?: string;
  compoundName?: string;
  batchId?: string;
  batchNumber?: string;
  parentSampleId?: string;
  sourceType: 'SYNTHESIS' | 'PURCHASE' | 'ALIQUOT' | 'DERIVED' | 'RECEIVED';
  
  // Quantity
  initialQuantity: number;
  currentQuantity: number;
  quantityUnit: string;
  concentration?: number;
  concentrationUnit?: string;
  
  // Physical
  physicalForm: string;
  containerType: string;
  
  // Storage
  storageCondition: StorageCondition;
  storageLocationId?: string;
  locationPath?: string;
  
  // Quality
  qualityGrade?: 'RESEARCH' | 'GLP' | 'GMP' | 'REFERENCE';
  
  // Dates
  registrationDate: Date;
  expiryDate?: Date;
  lastAccessedAt?: Date;
  
  // Safety
  hazardClasses: HazardClass[];
  
  // Chain of custody
  currentCustodian?: string;
  custodyEventCount: number;
}

export interface SampleListFilters {
  status?: SampleStatus[];
  type?: SampleType[];
  compoundId?: string;
  batchId?: string;
  storageCondition?: StorageCondition[];
  qualityGrade?: string[];
  expiringSoon?: boolean;
  searchTerm?: string;
}

export type SampleSortField = 'sampleId' | 'status' | 'type' | 'currentQuantity' | 'registrationDate' | 'expiryDate';
export type SortDirection = 'asc' | 'desc';

export interface SampleListViewProps {
  samples: SampleListItem[];
  filters?: SampleListFilters;
  onFilterChange?: (filters: SampleListFilters) => void;
  onSampleClick?: (sampleId: string) => void;
  onSampleAction?: (sampleId: string, action: SampleAction) => void;
  onAddSample?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type SampleAction = 'view' | 'edit' | 'transfer' | 'aliquot' | 'dispose' | 'view_custody';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSampleStatusDisplayName(status: SampleStatus): string {
  const names: Record<SampleStatus, string> = {
    REGISTERED: 'Registered',
    IN_STORAGE: 'In Storage',
    IN_USE: 'In Use',
    CONSUMED: 'Consumed',
    EXPIRED: 'Expired',
    DISPOSED: 'Disposed',
    QUARANTINED: 'Quarantined',
    LOST: 'Lost',
  };
  return names[status] || status;
}

export function getSampleStatusColor(status: SampleStatus): string {
  const colors: Record<SampleStatus, string> = {
    REGISTERED: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
    IN_STORAGE: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
    IN_USE: 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30',
    CONSUMED: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
    EXPIRED: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
    DISPOSED: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
    QUARANTINED: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
    LOST: 'text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getSampleStatusIcon(status: SampleStatus): LucideIcon {
  const icons: Record<SampleStatus, LucideIcon> = {
    REGISTERED: TestTube,
    IN_STORAGE: Archive,
    IN_USE: Beaker,
    CONSUMED: CheckCircle,
    EXPIRED: Clock,
    DISPOSED: Trash2,
    QUARANTINED: AlertTriangle,
    LOST: XCircle,
  };
  return icons[status] || TestTube;
}

export function getSampleTypeDisplayName(type: SampleType): string {
  const names: Record<SampleType, string> = {
    COMPOUND: 'Compound',
    REFERENCE_STANDARD: 'Reference Std',
    BIOLOGICAL: 'Biological',
    INTERMEDIATE: 'Intermediate',
    FORMULATION: 'Formulation',
    PLACEBO: 'Placebo',
    REAGENT: 'Reagent',
    CONTROL: 'Control',
  };
  return names[type] || type;
}

export function getSampleTypeColor(type: SampleType): string {
  const colors: Record<SampleType, string> = {
    COMPOUND: 'text-blue-600 bg-blue-50',
    REFERENCE_STANDARD: 'text-purple-600 bg-purple-50',
    BIOLOGICAL: 'text-rose-600 bg-rose-50',
    INTERMEDIATE: 'text-amber-600 bg-amber-50',
    FORMULATION: 'text-green-600 bg-green-50',
    PLACEBO: 'text-gray-600 bg-gray-50',
    REAGENT: 'text-cyan-600 bg-cyan-50',
    CONTROL: 'text-teal-600 bg-teal-50',
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
}

export function getStorageConditionIcon(condition: StorageCondition): LucideIcon {
  const frozenConditions: StorageCondition[] = ['FROZEN', 'ULTRA_FROZEN', 'CRYOGENIC'];
  const coldConditions: StorageCondition[] = ['REFRIGERATED'];
  
  if (frozenConditions.includes(condition)) return Snowflake;
  if (coldConditions.includes(condition)) return Thermometer;
  return Package;
}

export function getStorageConditionLabel(condition: StorageCondition): string {
  const labels: Record<StorageCondition, string> = {
    AMBIENT: 'Ambient',
    REFRIGERATED: '2-8°C',
    FROZEN: '-20°C',
    ULTRA_FROZEN: '-80°C',
    CRYOGENIC: '-196°C',
    CONTROLLED_ROOM: '15-25°C',
    LIGHT_PROTECTED: 'Light Protected',
    DESICCATED: 'Desiccated',
  };
  return labels[condition] || condition;
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

export function isExpiringSoon(expiryDate?: Date, daysThreshold = 30): boolean {
  if (!expiryDate) return false;
  const thresholdDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
  return expiryDate <= thresholdDate && expiryDate > new Date();
}

export function isExpired(expiryDate?: Date): boolean {
  if (!expiryDate) return false;
  return expiryDate <= new Date();
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SampleCardProps {
  sample: SampleListItem;
  onClick?: () => void;
  onAction?: (action: SampleAction) => void;
  showActions?: boolean;
}

function SampleCard({ sample, onClick, onAction, showActions = true }: SampleCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getSampleStatusIcon(sample.status);
  const StorageIcon = getStorageConditionIcon(sample.storageCondition);
  
  const isActive = ['IN_STORAGE', 'IN_USE'].includes(sample.status);
  const expired = isExpired(sample.expiryDate);
  const expiring = isExpiringSoon(sample.expiryDate);
  const lowQuantity = sample.currentQuantity < sample.initialQuantity * 0.1;
  
  const quantityPercent = (sample.currentQuantity / sample.initialQuantity) * 100;

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
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
            <StatusIcon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{sample.sampleId}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSampleStatusColor(sample.status)}`}>
                {getSampleStatusDisplayName(sample.status)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-xs ${getSampleTypeColor(sample.type)}`}>
                {getSampleTypeDisplayName(sample.type)}
              </span>
              {sample.qualityGrade && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{sample.qualityGrade}</span>
              )}
            </div>
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
                    onAction?.('view_custody');
                    setShowMenu(false);
                  }}
                >
                  <History className="h-4 w-4 text-gray-400" />
                  Chain of Custody
                </button>
                {isActive && (
                  <>
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('transfer');
                        setShowMenu(false);
                      }}
                    >
                      <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                      Transfer
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('aliquot');
                        setShowMenu(false);
                      }}
                    >
                      <Scissors className="h-4 w-4 text-gray-400" />
                      Create Aliquot
                    </button>
                  </>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('dispose');
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Dispose
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source Info */}
      {(sample.compoundName || sample.batchNumber) && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {sample.compoundName && <span className="font-medium">{sample.compoundName}</span>}
          {sample.compoundName && sample.batchNumber && <span className="mx-1">•</span>}
          {sample.batchNumber && <span>Batch {sample.batchNumber}</span>}
        </div>
      )}

      {/* Quantity Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">Quantity</span>
          <span className={`font-medium ${lowQuantity ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
            {formatQuantity(sample.currentQuantity, sample.quantityUnit)}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              lowQuantity ? 'bg-red-500' : quantityPercent > 50 ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(quantityPercent, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 text-right">
          of {formatQuantity(sample.initialQuantity, sample.quantityUnit)} initial
        </p>
      </div>

      {/* Storage Info */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <StorageIcon className="h-3.5 w-3.5" />
          <span>{getStorageConditionLabel(sample.storageCondition)}</span>
        </div>
        {sample.locationPath && (
          <>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{sample.locationPath}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {sample.expiryDate && (
            <span className={`flex items-center gap-1 ${expired ? 'text-red-600' : expiring ? 'text-amber-600' : ''}`}>
              <Calendar className="h-3.5 w-3.5" />
              {expired ? 'Expired' : expiring ? 'Expiring' : 'Exp'} {formatDate(sample.expiryDate)}
            </span>
          )}
          {sample.custodyEventCount > 0 && (
            <span className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              {sample.custodyEventCount} events
            </span>
          )}
        </div>
        {(expired || expiring || lowQuantity) && (
          <AlertTriangle className={`h-4 w-4 ${expired ? 'text-red-500' : 'text-amber-500'}`} />
        )}
      </div>
    </div>
  );
}

interface SampleFilterPanelProps {
  filters: SampleListFilters;
  onFilterChange: (filters: SampleListFilters) => void;
}

function SampleFilterPanel({ filters, onFilterChange }: SampleFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statuses: SampleStatus[] = ['REGISTERED', 'IN_STORAGE', 'IN_USE', 'CONSUMED', 'EXPIRED', 'DISPOSED', 'QUARANTINED', 'LOST'];
  const types: SampleType[] = ['COMPOUND', 'REFERENCE_STANDARD', 'BIOLOGICAL', 'INTERMEDIATE', 'FORMULATION', 'PLACEBO', 'REAGENT', 'CONTROL'];
  const conditions: StorageCondition[] = ['AMBIENT', 'REFRIGERATED', 'FROZEN', 'ULTRA_FROZEN', 'CRYOGENIC', 'CONTROLLED_ROOM'];
  
  const activeFilterCount = [
    filters.status?.length,
    filters.type?.length,
    filters.storageCondition?.length,
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
                  {getSampleStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1">
              {types.slice(0, 4).map((type) => (
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
                  {getSampleTypeDisplayName(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Condition */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Storage</label>
            <div className="flex flex-wrap gap-1">
              {conditions.map((condition) => (
                <button
                  key={condition}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    filters.storageCondition?.includes(condition)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    const current = filters.storageCondition || [];
                    const updated = current.includes(condition)
                      ? current.filter((c) => c !== condition)
                      : [...current, condition];
                    onFilterChange({ ...filters, storageCondition: updated.length > 0 ? updated : undefined });
                  }}
                >
                  {getStorageConditionLabel(condition)}
                </button>
              ))}
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="expiring-soon"
              checked={filters.expiringSoon === true}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  expiringSoon: e.target.checked ? true : undefined,
                });
              }}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
            />
            <label htmlFor="expiring-soon" className="text-sm text-gray-600 dark:text-gray-400">
              Expiring within 30 days
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

export function SampleListView({
  samples,
  filters = {},
  onFilterChange,
  onSampleClick,
  onSampleAction,
  onAddSample,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: SampleListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<SampleSortField>('sampleId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredSamples = useMemo(() => {
    let result = [...samples];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.sampleId.toLowerCase().includes(term) ||
          (s.barcode?.toLowerCase().includes(term)) ||
          (s.compoundName?.toLowerCase().includes(term)) ||
          (s.batchNumber?.toLowerCase().includes(term)) ||
          (s.locationPath?.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((s) => filters.status!.includes(s.status));
    }

    // Type filter
    if (filters.type?.length) {
      result = result.filter((s) => filters.type!.includes(s.type));
    }

    // Storage condition filter
    if (filters.storageCondition?.length) {
      result = result.filter((s) => filters.storageCondition!.includes(s.storageCondition));
    }

    // Expiring soon filter
    if (filters.expiringSoon) {
      result = result.filter((s) => isExpiringSoon(s.expiryDate) || isExpired(s.expiryDate));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'sampleId':
          comparison = a.sampleId.localeCompare(b.sampleId);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'currentQuantity':
          comparison = a.currentQuantity - b.currentQuantity;
          break;
        case 'registrationDate':
          comparison = a.registrationDate.getTime() - b.registrationDate.getTime();
          break;
        case 'expiryDate':
          const aExp = a.expiryDate?.getTime() || Infinity;
          const bExp = b.expiryDate?.getTime() || Infinity;
          comparison = aExp - bExp;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [samples, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredSamples.length;
    const inStorage = filteredSamples.filter((s) => s.status === 'IN_STORAGE').length;
    const expiringSoon = filteredSamples.filter((s) => isExpiringSoon(s.expiryDate)).length;
    const lowStock = filteredSamples.filter((s) => s.currentQuantity < s.initialQuantity * 0.1).length;
    return { total, inStorage, expiringSoon, lowStock };
  }, [filteredSamples]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Samples</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.total} samples • {stats.inStorage} in storage
            {stats.expiringSoon > 0 && ` • ${stats.expiringSoon} expiring soon`}
            {stats.lowStock > 0 && ` • ${stats.lowStock} low stock`}
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
          {onAddSample && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddSample}
            >
              <Plus className="h-4 w-4" />
              Register Sample
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by sample ID, barcode, compound, or location..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <SampleFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Sample Grid */}
      {filteredSamples.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <TestTube className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No samples found</p>
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
          {filteredSamples.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              onClick={() => onSampleClick?.(sample.id)}
              onAction={(action) => onSampleAction?.(sample.id, action)}
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

export function createMockSampleListItem(overrides?: Partial<SampleListItem>): SampleListItem {
  return {
    id: 'smp-001',
    sampleId: 'SMP-2025-00001',
    barcode: 'BC12345678',
    status: 'IN_STORAGE',
    type: 'COMPOUND',
    compoundId: 'cpd-001',
    compoundName: 'Lead Compound Alpha',
    batchId: 'batch-001',
    batchNumber: 'BATCH-2025-001',
    sourceType: 'SYNTHESIS',
    initialQuantity: 100,
    currentQuantity: 75,
    quantityUnit: 'MG',
    physicalForm: 'POWDER',
    containerType: 'Amber Vial',
    storageCondition: 'FROZEN',
    locationPath: 'Freezer-1/Rack-A/Box-3/Position-B5',
    qualityGrade: 'GLP',
    registrationDate: new Date('2025-01-01'),
    expiryDate: new Date('2026-01-01'),
    lastAccessedAt: new Date('2025-01-08'),
    hazardClasses: ['TOXIC'],
    currentCustodian: 'user-001',
    custodyEventCount: 5,
    ...overrides,
  };
}

export default SampleListView;
