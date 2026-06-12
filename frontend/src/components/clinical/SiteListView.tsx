
/**
 * Site List View Component
 * Site listing with filtering, status management, and enrollment tracking
 * @version 0.20.9.2
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Shield,
  FileText,
  Stethoscope,
  RefreshCw,
  Eye,
  Edit,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import type { SiteStatus, ContractStatus, IRBStatus } from '@/types/clinical-site';

// =============================================================================
// TYPES
// =============================================================================

export interface SiteListItem {
  id: string;
  siteNumber: string;
  name: string;
  status: SiteStatus;
  
  // Location
  city: string;
  state?: string;
  country: string;
  region?: string;
  
  // Investigator
  piName: string;
  piEmail?: string;
  piPhone?: string;
  
  // Regulatory
  irbStatus: IRBStatus;
  irbExpirationDate?: Date;
  contractStatus: ContractStatus;
  
  // Enrollment
  targetEnrollment: number;
  actualEnrollment: number;
  screenFailures: number;
  activeSubjects: number;
  
  // Staff
  totalStaff: number;
  trainedStaff: number;
  
  // Dates
  activationDate?: Date;
  firstEnrollmentDate?: Date;
  lastEnrollmentDate?: Date;
  
  // Monitoring
  lastMonitoringVisit?: Date;
  openFindings: number;
}

export interface SiteListFilters {
  status?: SiteStatus[];
  country?: string[];
  region?: string[];
  irbStatus?: IRBStatus[];
  contractStatus?: ContractStatus[];
  enrollmentProgress?: 'above_target' | 'on_track' | 'below_target' | 'no_enrollment';
  searchTerm?: string;
}

export type SiteSortField = 'siteNumber' | 'name' | 'status' | 'enrollment' | 'piName' | 'country' | 'activationDate';
export type SortDirection = 'asc' | 'desc';

export interface SiteListViewProps {
  sites: SiteListItem[];
  filters?: SiteListFilters;
  onFilterChange?: (filters: SiteListFilters) => void;
  onSiteClick?: (siteId: string) => void;
  onSiteAction?: (siteId: string, action: SiteAction) => void;
  onAddSite?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
  className?: string;
}

export type SiteAction = 'view' | 'edit' | 'activate' | 'close' | 'terminate' | 'monitor';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getSiteStatusDisplayName(status: SiteStatus): string {
  const names: Record<SiteStatus, string> = {
    IDENTIFIED: 'Identified',
    SELECTED: 'Selected',
    IN_STARTUP: 'In Startup',
    ACTIVE: 'Active',
    ENROLLING: 'Enrolling',
    CLOSED: 'Closed',
    TERMINATED: 'Terminated',
  };
  return names[status] || status;
}

export function getSiteStatusColor(status: SiteStatus): string {
  const colors: Record<SiteStatus, string> = {
    IDENTIFIED: 'text-gray-600 bg-gray-100',
    SELECTED: 'text-blue-600 bg-blue-100',
    IN_STARTUP: 'text-amber-600 bg-amber-100',
    ACTIVE: 'text-green-600 bg-green-100',
    ENROLLING: 'text-emerald-600 bg-emerald-100',
    CLOSED: 'text-purple-600 bg-purple-100',
    TERMINATED: 'text-red-600 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getIRBStatusDisplayName(status: IRBStatus): string {
  const names: Record<IRBStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    CONDITIONAL: 'Conditional',
    EXPIRED: 'Expired',
    WITHDRAWN: 'Withdrawn',
  };
  return names[status] || status;
}

export function getIRBStatusColor(status: IRBStatus): string {
  const colors: Record<IRBStatus, string> = {
    PENDING: 'text-amber-600 bg-amber-100',
    APPROVED: 'text-green-600 bg-green-100',
    CONDITIONAL: 'text-blue-600 bg-blue-100',
    EXPIRED: 'text-red-600 bg-red-100',
    WITHDRAWN: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getContractStatusDisplayName(status: ContractStatus): string {
  const names: Record<ContractStatus, string> = {
    NOT_STARTED: 'Not Started',
    IN_NEGOTIATION: 'In Negotiation',
    LEGAL_REVIEW: 'Legal Review',
    EXECUTED: 'Executed',
    AMENDED: 'Amended',
  };
  return names[status] || status;
}

export function getContractStatusColor(status: ContractStatus): string {
  const colors: Record<ContractStatus, string> = {
    NOT_STARTED: 'text-gray-600 bg-gray-100',
    IN_NEGOTIATION: 'text-blue-600 bg-blue-100',
    LEGAL_REVIEW: 'text-amber-600 bg-amber-100',
    EXECUTED: 'text-green-600 bg-green-100',
    AMENDED: 'text-purple-600 bg-purple-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function calculateEnrollmentProgress(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100);
}

export function getEnrollmentStatus(actual: number, target: number): 'above' | 'on_track' | 'below' | 'none' {
  if (actual === 0) return 'none';
  const progress = calculateEnrollmentProgress(actual, target);
  if (progress >= 100) return 'above';
  if (progress >= 75) return 'on_track';
  return 'below';
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function isIRBExpiringSoon(expirationDate: Date | undefined, daysThreshold: number = 30): boolean {
  if (!expirationDate) return false;
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= daysThreshold;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SiteCardProps {
  site: SiteListItem;
  onClick?: () => void;
  onAction?: (action: SiteAction) => void;
  showActions?: boolean;
}

function SiteCard({ site, onClick, onAction, showActions = true }: SiteCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const enrollmentProgress = calculateEnrollmentProgress(site.actualEnrollment, site.targetEnrollment);
  const enrollmentStatus = getEnrollmentStatus(site.actualEnrollment, site.targetEnrollment);
  const irbExpiring = isIRBExpiringSoon(site.irbExpirationDate);
  
  const progressColorClass = {
    above: 'bg-green-500',
    on_track: 'bg-blue-500',
    below: 'bg-amber-500',
    none: 'bg-gray-300',
  }[enrollmentStatus];

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
          <div className="p-2 rounded-lg bg-blue-50">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Site {site.siteNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSiteStatusColor(site.status)}`}>
                {getSiteStatusDisplayName(site.status)}
              </span>
            </div>
            <h3 className="font-medium text-gray-900 mt-0.5">{site.name}</h3>
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
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction?.('edit'); setShowMenu(false); }}
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onAction?.('monitor'); setShowMenu(false); }}
                >
                  <Shield className="h-3.5 w-3.5" /> Monitor
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location & PI */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>{site.city}, {site.country}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Stethoscope className="h-4 w-4" />
          <span className="truncate">{site.piName}</span>
        </div>
      </div>

      {/* Enrollment Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Enrollment</span>
          <span className="font-medium">
            {site.actualEnrollment}/{site.targetEnrollment}
            <span className="text-gray-400 ml-1">({enrollmentProgress}%)</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressColorClass}`}
            style={{ width: `${Math.min(enrollmentProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Regulatory Status */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getIRBStatusColor(site.irbStatus)}`}>
          IRB: {getIRBStatusDisplayName(site.irbStatus)}
        </span>
        {irbExpiring && (
          <span className="px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expiring Soon
          </span>
        )}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getContractStatusColor(site.contractStatus)}`}>
          Contract: {getContractStatusDisplayName(site.contractStatus)}
        </span>
      </div>

      {/* Footer Stats */}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="font-medium text-gray-900">{site.activeSubjects}</p>
          <p className="text-gray-500">Active</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-900">{site.trainedStaff}/{site.totalStaff}</p>
          <p className="text-gray-500">Staff Trained</p>
        </div>
        <div className="text-center">
          <p className={`font-medium ${site.openFindings > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {site.openFindings}
          </p>
          <p className="text-gray-500">Findings</p>
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  filters: SiteListFilters;
  onFilterChange: (filters: SiteListFilters) => void;
  availableCountries: string[];
  availableRegions: string[];
}

function FilterPanel({ filters, onFilterChange, availableCountries, availableRegions }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions: SiteStatus[] = ['IDENTIFIED', 'SELECTED', 'IN_STARTUP', 'ACTIVE', 'ENROLLING', 'CLOSED', 'TERMINATED'];
  const irbOptions: IRBStatus[] = ['PENDING', 'APPROVED', 'CONDITIONAL', 'EXPIRED', 'WITHDRAWN'];

  const handleStatusToggle = (status: SiteStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const handleCountryToggle = (country: string) => {
    const current = filters.country || [];
    const updated = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country];
    onFilterChange({ ...filters, country: updated.length > 0 ? updated : undefined });
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.country?.length || 0,
    filters.irbStatus?.length || 0,
    filters.enrollmentProgress ? 1 : 0,
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
                      ? getSiteStatusColor(status)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleStatusToggle(status)}
                >
                  {getSiteStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Country Filter */}
          {availableCountries.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Country</label>
              <div className="flex flex-wrap gap-2">
                {availableCountries.map((country) => (
                  <button
                    key={country}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filters.country?.includes(country)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleCountryToggle(country)}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enrollment Progress Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Enrollment Progress</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'above_target', label: 'Above Target', color: 'bg-green-100 text-green-700' },
                { value: 'on_track', label: 'On Track', color: 'bg-blue-100 text-blue-700' },
                { value: 'below_target', label: 'Below Target', color: 'bg-amber-100 text-amber-700' },
                { value: 'no_enrollment', label: 'No Enrollment', color: 'bg-gray-100 text-gray-700' },
              ].map((option) => (
                <button
                  key={option.value}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filters.enrollmentProgress === option.value
                      ? option.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      enrollmentProgress:
                        filters.enrollmentProgress === option.value
                          ? undefined
                          : (option.value as SiteListFilters['enrollmentProgress']),
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
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

export function SiteListView({
  sites,
  filters = {},
  onFilterChange,
  onSiteClick,
  onSiteAction,
  onAddSite,
  onExport,
  onRefresh,
  isLoading = false,
  showActions = true,
  className = '',
}: SiteListViewProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [sortField, setSortField] = useState<SiteSortField>('siteNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const availableCountries = useMemo(() => {
    return Array.from(new Set(sites.map((s) => s.country))).sort();
  }, [sites]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(sites.map((s) => s.region).filter(Boolean) as string[])).sort();
  }, [sites]);

  const filteredSites = useMemo(() => {
    let result = [...sites];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.siteNumber.toLowerCase().includes(term) ||
          s.piName.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status?.length) {
      result = result.filter((s) => filters.status!.includes(s.status));
    }

    // Country filter
    if (filters.country?.length) {
      result = result.filter((s) => filters.country!.includes(s.country));
    }

    // IRB status filter
    if (filters.irbStatus?.length) {
      result = result.filter((s) => filters.irbStatus!.includes(s.irbStatus));
    }

    // Enrollment progress filter
    if (filters.enrollmentProgress) {
      result = result.filter((s) => {
        const status = getEnrollmentStatus(s.actualEnrollment, s.targetEnrollment);
        switch (filters.enrollmentProgress) {
          case 'above_target':
            return status === 'above';
          case 'on_track':
            return status === 'on_track';
          case 'below_target':
            return status === 'below';
          case 'no_enrollment':
            return status === 'none';
          default:
            return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'siteNumber':
          comparison = a.siteNumber.localeCompare(b.siteNumber);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'enrollment':
          comparison = a.actualEnrollment - b.actualEnrollment;
          break;
        case 'piName':
          comparison = a.piName.localeCompare(b.piName);
          break;
        case 'country':
          comparison = a.country.localeCompare(b.country);
          break;
        case 'activationDate':
          const aDate = a.activationDate?.getTime() || 0;
          const bDate = b.activationDate?.getTime() || 0;
          comparison = aDate - bDate;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sites, searchTerm, filters, sortField, sortDirection]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onFilterChange?.({ ...filters, searchTerm: value || undefined });
    },
    [filters, onFilterChange]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredSites.length;
    const enrolling = filteredSites.filter((s) => s.status === 'ENROLLING').length;
    const totalEnrolled = filteredSites.reduce((sum, s) => sum + s.actualEnrollment, 0);
    const totalTarget = filteredSites.reduce((sum, s) => sum + s.targetEnrollment, 0);
    return { total, enrolling, totalEnrolled, totalTarget };
  }, [filteredSites]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sites</h2>
          <p className="text-sm text-gray-500">
            {stats.total} sites • {stats.enrolling} enrolling • {stats.totalEnrolled}/{stats.totalTarget} enrolled
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
          {onAddSite && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddSite}
            >
              <Plus className="h-4 w-4" />
              Add Site
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search sites by name, number, PI, or city..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      {onFilterChange && (
        <FilterPanel
          filters={filters}
          onFilterChange={onFilterChange}
          availableCountries={availableCountries}
          availableRegions={availableRegions}
        />
      )}

      {/* Site Grid */}
      {filteredSites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No sites found</p>
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
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onClick={() => onSiteClick?.(site.id)}
              onAction={(action) => onSiteAction?.(site.id, action)}
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

export function createMockSiteListItem(overrides?: Partial<SiteListItem>): SiteListItem {
  return {
    id: 'site-001',
    siteNumber: '001',
    name: 'Memorial Hospital Research Center',
    status: 'ENROLLING',
    city: 'Boston',
    state: 'MA',
    country: 'USA',
    region: 'North America',
    piName: 'Dr. Jane Smith',
    piEmail: 'jane.smith@memorial.edu',
    piPhone: '+1-555-0100',
    irbStatus: 'APPROVED',
    irbExpirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    contractStatus: 'EXECUTED',
    targetEnrollment: 20,
    actualEnrollment: 15,
    screenFailures: 3,
    activeSubjects: 12,
    totalStaff: 5,
    trainedStaff: 4,
    activationDate: new Date('2025-06-01'),
    firstEnrollmentDate: new Date('2025-07-15'),
    lastEnrollmentDate: new Date('2026-01-05'),
    lastMonitoringVisit: new Date('2025-12-15'),
    openFindings: 2,
    ...overrides,
  };
}

export default SiteListView;
