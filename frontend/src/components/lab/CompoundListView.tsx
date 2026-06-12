
/**
 * Compound List View Component
 * Compound browsing, registration, and status management
 * @version 0.21.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Atom,
  FlaskConical,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Tag,
  FolderKanban,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Beaker,
  Eye,
  Edit,
  Trash2,
  Link2,
  LinkIcon,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import type { Compound, CompoundStatus, HazardClass } from '@/types/lab-discovery';

// =============================================================================
// TYPES
// =============================================================================

export interface CompoundListItem {
  id: string;
  compoundId: string;
  name: string;
  synonyms: string[];
  status: CompoundStatus;
  
  // Structure
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  
  // Classification
  therapeuticArea?: string;
  targetClass?: string;
  mechanismOfAction?: string;
  
  // Safety
  hazardClasses: HazardClass[];
  
  // Tracking
  projectIds: string[];
  programId?: string;
  tags: string[];
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Counts
  batchCount: number;
  sampleCount: number;
  experimentCount: number;
}

export interface CompoundListFilters {
  status?: CompoundStatus[];
  therapeuticArea?: string[];
  targetClass?: string[];
  hasStructure?: boolean;
  projectId?: string;
  hazardClass?: HazardClass;
  searchTerm?: string;
}

export type CompoundSortField = 'compoundId' | 'name' | 'status' | 'therapeuticArea' | 'createdAt' | 'molecularWeight';
export type SortDirection = 'asc' | 'desc';

export interface CompoundListViewProps {
  compounds: CompoundListItem[];
  filters?: CompoundListFilters;
  onFilterChange?: (filters: CompoundListFilters) => void;
  onCompoundClick?: (compoundId: string) => void;
  onCompoundAction?: (compoundId: string, action: CompoundAction) => void;
  onAddCompound?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type CompoundAction = 'view' | 'edit' | 'delete' | 'link_project' | 'create_batch' | 'view_structure';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getCompoundStatusDisplayName(status: CompoundStatus): string {
  const names: Record<CompoundStatus, string> = {
    VIRTUAL: 'Virtual',
    SYNTHESIZED: 'Synthesized',
    CHARACTERIZED: 'Characterized',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    DISCONTINUED: 'Discontinued',
  };
  return names[status] || status;
}

export function getCompoundStatusColor(status: CompoundStatus): string {
  const colors: Record<CompoundStatus, string> = {
    VIRTUAL: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
    SYNTHESIZED: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
    CHARACTERIZED: 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30',
    ACTIVE: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
    INACTIVE: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
    DISCONTINUED: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getCompoundStatusIcon(status: CompoundStatus): LucideIcon {
  const icons: Record<CompoundStatus, LucideIcon> = {
    VIRTUAL: FileText,
    SYNTHESIZED: FlaskConical,
    CHARACTERIZED: Beaker,
    ACTIVE: CheckCircle,
    INACTIVE: Clock,
    DISCONTINUED: XCircle,
  };
  return icons[status] || Atom;
}

export function getHazardColor(hazard: HazardClass): string {
  const colors: Record<HazardClass, string> = {
    NONE: 'text-gray-500 bg-gray-100',
    FLAMMABLE: 'text-orange-600 bg-orange-100',
    CORROSIVE: 'text-yellow-600 bg-yellow-100',
    TOXIC: 'text-red-600 bg-red-100',
    OXIDIZER: 'text-purple-600 bg-purple-100',
    BIOHAZARD: 'text-rose-600 bg-rose-100',
    RADIOACTIVE: 'text-fuchsia-600 bg-fuchsia-100',
    CYTOTOXIC: 'text-pink-600 bg-pink-100',
    CONTROLLED_SUBSTANCE: 'text-blue-600 bg-blue-100',
  };
  return colors[hazard] || 'text-gray-500 bg-gray-100';
}

export function formatMolecularWeight(mw?: number): string {
  if (!mw) return '—';
  return `${mw.toFixed(2)} g/mol`;
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CompoundCardProps {
  compound: CompoundListItem;
  onClick?: () => void;
  onAction?: (action: CompoundAction) => void;
  showActions?: boolean;
}

function CompoundCard({ compound, onClick, onAction, showActions = true }: CompoundCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const StatusIcon = getCompoundStatusIcon(compound.status);
  const isActive = compound.status === 'ACTIVE';
  const isDiscontinued = compound.status === 'DISCONTINUED';
  const hasHazards = compound.hazardClasses.length > 0 && !compound.hazardClasses.includes('NONE');

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
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-50 dark:bg-green-900/20' : isDiscontinued ? 'bg-gray-50 dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
            <StatusIcon className={`h-5 w-5 ${isActive ? 'text-green-600' : isDiscontinued ? 'text-gray-500' : 'text-blue-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{compound.compoundId}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCompoundStatusColor(compound.status)}`}>
                {getCompoundStatusDisplayName(compound.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{compound.name}</p>
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
                  Edit Compound
                </button>
                {compound.smiles && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.('view_structure');
                      setShowMenu(false);
                    }}
                  >
                    <Atom className="h-4 w-4 text-gray-400" />
                    View Structure
                  </button>
                )}
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('create_batch');
                    setShowMenu(false);
                  }}
                >
                  <FlaskConical className="h-4 w-4 text-gray-400" />
                  Create Batch
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('link_project');
                    setShowMenu(false);
                  }}
                >
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                  Link to Project
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('delete');
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Properties */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        {compound.molecularFormula && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">Formula</span>
            <p className="font-mono text-gray-700 dark:text-gray-300">{compound.molecularFormula}</p>
          </div>
        )}
        {compound.molecularWeight && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">MW</span>
            <p className="text-gray-700 dark:text-gray-300">{formatMolecularWeight(compound.molecularWeight)}</p>
          </div>
        )}
        {compound.therapeuticArea && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">Therapeutic Area</span>
            <p className="text-gray-700 dark:text-gray-300">{compound.therapeuticArea}</p>
          </div>
        )}
        {compound.targetClass && (
          <div>
            <span className="text-gray-500 dark:text-gray-500">Target</span>
            <p className="text-gray-700 dark:text-gray-300">{compound.targetClass}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FlaskConical className="h-3.5 w-3.5" />
            {compound.batchCount} batches
          </span>
          <span className="flex items-center gap-1">
            <Beaker className="h-3.5 w-3.5" />
            {compound.sampleCount} samples
          </span>
        </div>
        {hasHazards && (
          <div className="flex items-center gap-1">
            {compound.hazardClasses.filter(h => h !== 'NONE').slice(0, 3).map((hazard) => (
              <span
                key={hazard}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getHazardColor(hazard)}`}
              >
                {hazard.substring(0, 3)}
              </span>
            ))}
            {compound.hazardClasses.length > 3 && (
              <span className="text-xs text-gray-400">+{compound.hazardClasses.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface CompoundFilterPanelProps {
  filters: CompoundListFilters;
  onFilterChange: (filters: CompoundListFilters) => void;
  therapeuticAreas: string[];
  targetClasses: string[];
}

function CompoundFilterPanel({ filters, onFilterChange, therapeuticAreas, targetClasses }: CompoundFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statuses: CompoundStatus[] = ['VIRTUAL', 'SYNTHESIZED', 'CHARACTERIZED', 'ACTIVE', 'INACTIVE', 'DISCONTINUED'];
  const activeFilterCount = [
    filters.status?.length,
    filters.therapeuticArea?.length,
    filters.targetClass?.length,
    filters.hasStructure !== undefined ? 1 : 0,
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
              {statuses.map((status) => (
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
                  {getCompoundStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Therapeutic Area */}
          {therapeuticAreas.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Therapeutic Area</label>
              <select
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                value={filters.therapeuticArea?.[0] || ''}
                onChange={(e) => {
                  onFilterChange({
                    ...filters,
                    therapeuticArea: e.target.value ? [e.target.value] : undefined,
                  });
                }}
              >
                <option value="">All Areas</option>
                {therapeuticAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          )}

          {/* Has Structure */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has-structure"
              checked={filters.hasStructure === true}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  hasStructure: e.target.checked ? true : undefined,
                });
              }}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
            />
            <label htmlFor="has-structure" className="text-sm text-gray-600 dark:text-gray-400">
              Has molecular structure
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

export function CompoundListView({
  compounds,
  filters = {},
  onFilterChange,
  onCompoundClick,
  onCompoundAction,
  onAddCompound,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: CompoundListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<CompoundSortField>('compoundId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const therapeuticAreas = useMemo(() => {
    const areas = new Set<string>();
    compounds.forEach((c) => {
      if (c.therapeuticArea) areas.add(c.therapeuticArea);
    });
    return Array.from(areas).sort();
  }, [compounds]);

  const targetClasses = useMemo(() => {
    const classes = new Set<string>();
    compounds.forEach((c) => {
      if (c.targetClass) classes.add(c.targetClass);
    });
    return Array.from(classes).sort();
  }, [compounds]);

  const filteredCompounds = useMemo(() => {
    let result = [...compounds];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.compoundId.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.synonyms.some((s) => s.toLowerCase().includes(term)) ||
          (c.molecularFormula?.toLowerCase().includes(term)) ||
          (c.therapeuticArea?.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((c) => filters.status!.includes(c.status));
    }

    // Therapeutic area filter
    if (filters.therapeuticArea?.length) {
      result = result.filter((c) => c.therapeuticArea && filters.therapeuticArea!.includes(c.therapeuticArea));
    }

    // Target class filter
    if (filters.targetClass?.length) {
      result = result.filter((c) => c.targetClass && filters.targetClass!.includes(c.targetClass));
    }

    // Has structure filter
    if (filters.hasStructure !== undefined) {
      result = result.filter((c) => Boolean(c.smiles) === filters.hasStructure);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'compoundId':
          comparison = a.compoundId.localeCompare(b.compoundId);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'therapeuticArea':
          comparison = (a.therapeuticArea || '').localeCompare(b.therapeuticArea || '');
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'molecularWeight':
          comparison = (a.molecularWeight || 0) - (b.molecularWeight || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [compounds, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredCompounds.length;
    const active = filteredCompounds.filter((c) => c.status === 'ACTIVE').length;
    const withStructure = filteredCompounds.filter((c) => c.smiles).length;
    const recent = filteredCompounds.filter(
      (c) => c.createdAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;
    return { total, active, withStructure, recent };
  }, [filteredCompounds]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compounds</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.total} compounds • {stats.active} active • {stats.withStructure} with structure
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
          {onAddCompound && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddCompound}
            >
              <Plus className="h-4 w-4" />
              Register Compound
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by compound ID, name, formula, or therapeutic area..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <CompoundFilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
          therapeuticAreas={therapeuticAreas}
          targetClasses={targetClasses}
        />
      )}

      {/* Compound Grid */}
      {filteredCompounds.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Atom className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No compounds found</p>
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
          {filteredCompounds.map((compound) => (
            <CompoundCard
              key={compound.id}
              compound={compound}
              onClick={() => onCompoundClick?.(compound.id)}
              onAction={(action) => onCompoundAction?.(compound.id, action)}
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

export function createMockCompoundListItem(overrides?: Partial<CompoundListItem>): CompoundListItem {
  return {
    id: 'cpd-001',
    compoundId: 'ABC-12345',
    name: 'Lead Compound Alpha',
    synonyms: ['LCA', 'Alpha-1'],
    status: 'ACTIVE',
    molecularFormula: 'C20H25N3O4',
    molecularWeight: 371.43,
    smiles: 'CC(C)NCC(O)c1ccc(O)c(O)c1',
    therapeuticArea: 'Oncology',
    targetClass: 'Kinase Inhibitor',
    mechanismOfAction: 'Selective inhibitor of receptor tyrosine kinases',
    hazardClasses: ['TOXIC'],
    projectIds: ['proj-001'],
    programId: 'pgm-001',
    tags: ['lead', 'high-priority'],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-10'),
    createdBy: 'user-001',
    batchCount: 3,
    sampleCount: 15,
    experimentCount: 8,
    ...overrides,
  };
}

export default CompoundListView;
