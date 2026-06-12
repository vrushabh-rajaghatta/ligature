/**
 * CountrySiteDrilldown - v0.37.2
 * 
 * 3-level hierarchical navigation for clinical trial sites:
 * Level 1: Global View → Country cards with aggregate metrics
 * Level 2: Country View → Studies & Sites tabs within country
 * Level 3: Site View → Individual site details
 * 
 * Inspired by GSK Flight Deck reference.
 */


import React, { useState, useMemo, useCallback } from 'react';
import {
  Globe,
  MapPin,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ArrowUpDown,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  Flag,
  BarChart2,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import type { ClinicalSite, CTMSStudy, SiteStatus, CTMSStudyStatus } from '@/domains/ctms/contracts';

// =============================================================================
// TYPES
// =============================================================================

export interface CountrySiteDrilldownProps {
  sites: ClinicalSite[];
  studies: CTMSStudy[];
  onSiteSelect?: (siteId: string) => void;
  onStudySelect?: (studyId: string) => void;
  selectedSiteId?: string | null;
  getSiteStatusBadge: (status: SiteStatus) => React.ReactNode;
  getStudyStatusBadge?: (status: CTMSStudyStatus) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

interface CountryAggregate {
  country: string;
  countryCode: string;
  region: string;
  totalSites: number;
  activeSites: number;
  enrollingSites: number;
  startupSites: number;
  closedSites: number;
  totalEnrolled: number;
  totalTarget: number;
  enrollmentPercent: number;
  studyCount: number;
  highRiskSites: number;
}

type DrillLevel = 'global' | 'country' | 'site';
type StatusFilter = 'all' | 'startup' | 'enrolling' | 'active' | 'closed';
type SortOption = 'name' | 'enrollment' | 'sites' | 'risk';
type CountryViewTab = 'studies' | 'sites';

// =============================================================================
// COUNTRY FLAG EMOJI HELPER
// =============================================================================

function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'USA': '🇺🇸',
    'GB': '🇬🇧', 'UK': '🇬🇧',
    'DE': '🇩🇪', 'GER': '🇩🇪',
    'FR': '🇫🇷', 'FRA': '🇫🇷',
    'JP': '🇯🇵', 'JPN': '🇯🇵',
    'CA': '🇨🇦', 'CAN': '🇨🇦',
    'AU': '🇦🇺', 'AUS': '🇦🇺',
    'IT': '🇮🇹', 'ITA': '🇮🇹',
    'ES': '🇪🇸', 'ESP': '🇪🇸',
    'NL': '🇳🇱', 'NED': '🇳🇱',
    'BE': '🇧🇪', 'BEL': '🇧🇪',
    'PL': '🇵🇱', 'POL': '🇵🇱',
    'BR': '🇧🇷', 'BRA': '🇧🇷',
    'MX': '🇲🇽', 'MEX': '🇲🇽',
    'KR': '🇰🇷', 'KOR': '🇰🇷',
    'CN': '🇨🇳', 'CHN': '🇨🇳',
    'IN': '🇮🇳', 'IND': '🇮🇳',
    'CH': '🇨🇭', 'SWI': '🇨🇭',
    'SE': '🇸🇪', 'SWE': '🇸🇪',
    'DK': '🇩🇰', 'DEN': '🇩🇰',
    'NO': '🇳🇴', 'NOR': '🇳🇴',
    'FI': '🇫🇮', 'FIN': '🇫🇮',
    'AT': '🇦🇹', 'AUT': '🇦🇹',
    'IL': '🇮🇱', 'ISR': '🇮🇱',
    'SG': '🇸🇬', 'SGP': '🇸🇬',
    'HK': '🇭🇰', 'HKG': '🇭🇰',
    'TW': '🇹🇼', 'TWN': '🇹🇼',
    'NZ': '🇳🇿', 'NZL': '🇳🇿',
    'ZA': '🇿🇦', 'RSA': '🇿🇦',
  };
  return flags[countryCode.toUpperCase()] || '🌍';
}

// =============================================================================
// FILTER CHIPS COMPONENT
// =============================================================================

interface FilterChipsProps {
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

function FilterChips({ statusFilter, onStatusChange, sortBy, onSortChange }: FilterChipsProps) {
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'startup', label: 'Start Up' },
    { value: 'enrolling', label: 'Enrolling' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      {/* Status Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Status:</span>
        <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === opt.value
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-text-muted" />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="px-2 py-1.5 bg-surface-elevated border border-border rounded-lg text-xs text-text-primary"
        >
          <option value="name">A-Z</option>
          <option value="enrollment">Enrollment</option>
          <option value="sites">Sites</option>
          <option value="risk">Risk</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// COUNTRY CARD COMPONENT
// =============================================================================

interface CountryCardProps {
  country: CountryAggregate;
  onClick: () => void;
}

function CountryCard({ country, onClick }: CountryCardProps) {
  const isOnTrack = country.enrollmentPercent >= 75;
  const hasHighRisk = country.highRiskSites > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-surface-card border border-border rounded-xl hover:border-accent-blue/50 hover:bg-surface-elevated transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCountryFlag(country.countryCode)}</span>
          <div>
            <h3 className="font-semibold text-text-primary">{country.country}</h3>
            <span className="text-xs text-text-muted">{country.region}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-blue transition-colors" />
      </div>

      {/* 4-Column Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center p-2 bg-surface rounded-lg">
          <div className="text-lg font-bold text-text-primary">{country.enrollingSites}</div>
          <div className="text-[10px] text-text-muted">Enrolling</div>
        </div>
        <div className="text-center p-2 bg-surface rounded-lg">
          <div className="text-lg font-bold text-text-primary">{country.activeSites}</div>
          <div className="text-[10px] text-text-muted">Active</div>
        </div>
        <div className="text-center p-2 bg-surface rounded-lg">
          <div className="text-lg font-bold text-text-primary">{country.studyCount}</div>
          <div className="text-[10px] text-text-muted">Studies</div>
        </div>
        <div className="text-center p-2 bg-surface rounded-lg">
          <div className="text-lg font-bold text-text-primary">{country.totalSites}</div>
          <div className="text-[10px] text-text-muted">Total Sites</div>
        </div>
      </div>

      {/* Enrollment Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-muted">Enrollment</span>
          <span className={isOnTrack ? 'text-emerald-400' : 'text-amber-400'}>
            {country.totalEnrolled}/{country.totalTarget}
          </span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(country.enrollmentPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Risk Indicator */}
      {hasHighRisk && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          <span>{country.highRiskSites} high-risk site{country.highRiskSites > 1 ? 's' : ''}</span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// COUNTRY VIEW COMPONENT (Level 2)
// =============================================================================

interface CountryViewProps {
  country: CountryAggregate;
  sites: ClinicalSite[];
  studies: CTMSStudy[];
  onBack: () => void;
  onSiteSelect: (siteId: string) => void;
  onStudySelect?: (studyId: string) => void;
  getSiteStatusBadge: (status: SiteStatus) => React.ReactNode;
  getStudyStatusBadge?: (status: CTMSStudyStatus) => React.ReactNode;
  getRiskBadge: (risk: 'low' | 'medium' | 'high' | 'critical') => React.ReactNode;
}

function CountryView({ 
  country, 
  sites, 
  studies, 
  onBack, 
  onSiteSelect, 
  onStudySelect,
  getSiteStatusBadge,
  getStudyStatusBadge,
  getRiskBadge 
}: CountryViewProps) {
  const [activeTab, setActiveTab] = useState<CountryViewTab>('sites');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sites by search
  const filteredSites = useMemo(() => {
    if (!searchQuery) return sites;
    const query = searchQuery.toLowerCase();
    return sites.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.siteNumber.toLowerCase().includes(query) ||
      s.principalInvestigator.name.toLowerCase().includes(query)
    );
  }, [sites, searchQuery]);

  // Filter studies by search
  const filteredStudies = useMemo(() => {
    if (!searchQuery) return studies;
    const query = searchQuery.toLowerCase();
    return studies.filter(s => 
      s.protocolNumber.toLowerCase().includes(query) ||
      s.shortTitle.toLowerCase().includes(query) ||
      s.indication.toLowerCase().includes(query)
    );
  }, [studies, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Country Header */}
      <div className="p-4 border-b border-border bg-surface-card">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-accent-blue hover:text-accent-blue/80 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to All Countries
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCountryFlag(country.countryCode)}</span>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{country.country}</h2>
              <span className="text-sm text-text-muted">{country.region}</span>
            </div>
          </div>
          
          {/* Country Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{country.totalSites}</div>
              <div className="text-xs text-text-muted">Sites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{country.studyCount}</div>
              <div className="text-xs text-text-muted">Studies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{country.enrollmentPercent}%</div>
              <div className="text-xs text-text-muted">Enrolled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 border-b border-border bg-surface">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('sites')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sites'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Sites ({sites.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('studies')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'studies'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Studies ({studies.length})
            </div>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-surface">
        <SearchInput
          placeholder={activeTab === 'sites' ? 'Search sites...' : 'Search studies...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sites' && (
          <div className="space-y-2">
            {filteredSites.length === 0 ? (
              <EmptyState icon={<Building2 className="w-12 h-12" />} title="No sites found" />
            ) : (
              filteredSites.map(site => (
                <button
                  key={site.id}
                  onClick={() => onSiteSelect(site.id)}
                  className="w-full text-left p-4 bg-surface-card border border-border rounded-lg hover:border-accent-blue/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">Site {site.siteNumber}</span>
                      {getSiteStatusBadge(site.status)}
                    </div>
                    {getRiskBadge(site.riskScore)}
                  </div>
                  <h4 className="font-medium text-text-primary mb-1">{site.name}</h4>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {site.address.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      {site.principalInvestigator.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {site.enrolledSubjects}/{site.targetEnrollment}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'studies' && (
          <div className="space-y-2">
            {filteredStudies.length === 0 ? (
              <EmptyState icon={<FlaskConical className="w-12 h-12" />} title="No studies found" />
            ) : (
              filteredStudies.map(study => (
                <button
                  key={study.id}
                  onClick={() => onStudySelect?.(study.id)}
                  className="w-full text-left p-4 bg-surface-card border border-border rounded-lg hover:border-accent-blue/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-400">{study.protocolNumber}</span>
                      {getStudyStatusBadge?.(study.status)}
                    </div>
                    {getRiskBadge(study.riskScore)}
                  </div>
                  <h4 className="font-medium text-text-primary mb-1">{study.shortTitle}</h4>
                  <p className="text-xs text-text-muted mb-2">{study.indication}</p>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {study.activeSites} active sites
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {study.enrolledSubjects}/{study.targetEnrollment}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CountrySiteDrilldown({
  sites,
  studies,
  onSiteSelect,
  onStudySelect,
  selectedSiteId,
  getSiteStatusBadge,
  getStudyStatusBadge,
  getRiskBadge,
}: CountrySiteDrilldownProps) {
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('global');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregate sites by country
  const countryAggregates = useMemo(() => {
    const countryMap = new Map<string, CountryAggregate>();

    sites.forEach(site => {
      const country = site.address.country;
      const existing = countryMap.get(country);

      if (!existing) {
        countryMap.set(country, {
          country,
          countryCode: site.address.countryCode || country.slice(0, 2).toUpperCase(),
          region: site.address.region || 'Global',
          totalSites: 1,
          activeSites: ['activated', 'enrolling', 'active-not-enrolling'].includes(site.status) ? 1 : 0,
          enrollingSites: site.status === 'enrolling' ? 1 : 0,
          startupSites: site.status === 'in-startup' ? 1 : 0,
          closedSites: ['closed', 'terminated'].includes(site.status) ? 1 : 0,
          totalEnrolled: site.enrolledSubjects,
          totalTarget: site.targetEnrollment,
          enrollmentPercent: 0,
          studyCount: 0,
          highRiskSites: ['high', 'critical'].includes(site.riskScore) ? 1 : 0,
        });
      } else {
        existing.totalSites++;
        if (['activated', 'enrolling', 'active-not-enrolling'].includes(site.status)) existing.activeSites++;
        if (site.status === 'enrolling') existing.enrollingSites++;
        if (site.status === 'in-startup') existing.startupSites++;
        if (['closed', 'terminated'].includes(site.status)) existing.closedSites++;
        existing.totalEnrolled += site.enrolledSubjects;
        existing.totalTarget += site.targetEnrollment;
        if (['high', 'critical'].includes(site.riskScore)) existing.highRiskSites++;
      }
    });

    // Calculate enrollment percent and study counts
    countryMap.forEach((agg, country) => {
      agg.enrollmentPercent = agg.totalTarget > 0 
        ? Math.round((agg.totalEnrolled / agg.totalTarget) * 100) 
        : 0;
      // Count unique studies in this country
      const countrySites = sites.filter(s => s.address.country === country);
      const studyIds = new Set(countrySites.map(s => s.studyId));
      agg.studyCount = studyIds.size;
    });

    return Array.from(countryMap.values());
  }, [sites]);

  // Apply filters and sorting to countries
  const filteredCountries = useMemo(() => {
    let result = [...countryAggregates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.country.toLowerCase().includes(query) ||
        c.region.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (statusFilter) {
      case 'startup':
        result = result.filter(c => c.startupSites > 0);
        break;
      case 'enrolling':
        result = result.filter(c => c.enrollingSites > 0);
        break;
      case 'active':
        result = result.filter(c => c.activeSites > 0);
        break;
      case 'closed':
        result = result.filter(c => c.closedSites > 0);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.country.localeCompare(b.country));
        break;
      case 'enrollment':
        result.sort((a, b) => b.enrollmentPercent - a.enrollmentPercent);
        break;
      case 'sites':
        result.sort((a, b) => b.totalSites - a.totalSites);
        break;
      case 'risk':
        result.sort((a, b) => b.highRiskSites - a.highRiskSites);
        break;
    }

    return result;
  }, [countryAggregates, searchQuery, statusFilter, sortBy]);

  // Get sites and studies for selected country
  const countrySites = useMemo(() => {
    if (!selectedCountry) return [];
    return sites.filter(s => s.address.country === selectedCountry);
  }, [sites, selectedCountry]);

  const countryStudies = useMemo(() => {
    if (!selectedCountry) return [];
    const studyIds = new Set(countrySites.map(s => s.studyId));
    return studies.filter(s => studyIds.has(s.id));
  }, [countrySites, studies]);

  const selectedCountryData = useMemo(() => {
    return countryAggregates.find(c => c.country === selectedCountry) || null;
  }, [countryAggregates, selectedCountry]);

  // Handlers
  const handleCountryClick = useCallback((country: string) => {
    setSelectedCountry(country);
    setDrillLevel('country');
  }, []);

  const handleBackToGlobal = useCallback(() => {
    setSelectedCountry(null);
    setDrillLevel('global');
  }, []);

  const handleSiteSelect = useCallback((siteId: string) => {
    onSiteSelect?.(siteId);
  }, [onSiteSelect]);

  // Global stats
  const globalStats = useMemo(() => ({
    totalCountries: countryAggregates.length,
    totalSites: sites.length,
    activeSites: sites.filter(s => ['activated', 'enrolling', 'active-not-enrolling'].includes(s.status)).length,
    enrollingSites: sites.filter(s => s.status === 'enrolling').length,
    totalEnrolled: sites.reduce((sum, s) => sum + s.enrolledSubjects, 0),
    totalTarget: sites.reduce((sum, s) => sum + s.targetEnrollment, 0),
  }), [countryAggregates, sites]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Level 2: Country View
  if (drillLevel === 'country' && selectedCountryData) {
    return (
      <CountryView
        country={selectedCountryData}
        sites={countrySites}
        studies={countryStudies}
        onBack={handleBackToGlobal}
        onSiteSelect={handleSiteSelect}
        onStudySelect={onStudySelect}
        getSiteStatusBadge={getSiteStatusBadge}
        getStudyStatusBadge={getStudyStatusBadge}
        getRiskBadge={getRiskBadge}
      />
    );
  }

  // Level 1: Global View (default)
  return (
    <div className="h-full flex flex-col">
      {/* Global Header */}
      <div className="p-4 border-b border-border bg-surface-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Global Site Network</h2>
              <span className="text-sm text-text-muted">
                {globalStats.totalCountries} countries • {globalStats.totalSites} sites
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{globalStats.enrollingSites}</div>
              <div className="text-xs text-text-muted">Enrolling</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{globalStats.activeSites}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-text-primary">
                {globalStats.totalTarget > 0 
                  ? Math.round((globalStats.totalEnrolled / globalStats.totalTarget) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-text-muted">Enrolled</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchInput
          placeholder="Search countries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="px-4 pt-4 bg-surface">
        <FilterChips
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {/* Country Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCountries.length === 0 ? (
          <EmptyState 
            icon={<Globe className="w-12 h-12" />} 
            title="No countries found" 
            description="Try adjusting your filters or search query"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map(country => (
              <CountryCard
                key={country.country}
                country={country}
                onClick={() => handleCountryClick(country.country)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CountrySiteDrilldown;
