
// =============================================================================
// eCTD PUBLISHING DASHBOARD - v0.9.13
// =============================================================================
// Main dashboard for eCTD publishing showing all regulatory applications
// with filtering, status display, and navigation to sequence builder.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  Search,
  Plus,
  Filter,
  Globe,
  FileText,
  ChevronRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  useECTDPublishingStore,
  useFilteredApplications,
  useApplicationList,
} from '@/store/useECTDPublishingStore';
import type { ECTDApplication, SequenceStatus } from '@/store/ectd-publishing-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ECTDPublishingDashboardProps {
  onSelectApplication?: (app: ECTDApplication) => void;
  onCreateApplication?: () => void;
}

// -----------------------------------------------------------------------------
// STATUS CONFIG
// -----------------------------------------------------------------------------

const STATUS_CONFIG: Record<SequenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'planning': { label: 'Planning', color: 'text-content-secondary bg-surface-secondary', icon: <Clock className="w-3 h-3" /> },
  'draft': { label: 'Draft', color: 'text-blue-600 bg-blue-50', icon: <FileText className="w-3 h-3" /> },
  'in-review': { label: 'In Review', color: 'text-purple-600 bg-purple-50', icon: <Clock className="w-3 h-3" /> },
  'validated': { label: 'Validated', color: 'text-cyan-600 bg-cyan-50', icon: <CheckCircle className="w-3 h-3" /> },
  'ready': { label: 'Ready', color: 'text-indigo-600 bg-indigo-50', icon: <CheckCircle className="w-3 h-3" /> },
  'submitted': { label: 'Submitted', color: 'text-amber-600 bg-amber-50', icon: <Clock className="w-3 h-3" /> },
  'acknowledged': { label: 'Acknowledged', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3 h-3" /> },
  'under-review': { label: 'Under Review', color: 'text-amber-600 bg-amber-50', icon: <Clock className="w-3 h-3" /> },
  'questions': { label: 'Questions', color: 'text-orange-600 bg-orange-50', icon: <AlertCircle className="w-3 h-3" /> },
  'approved': { label: 'Approved', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3 h-3" /> },
  'rejected': { label: 'Rejected', color: 'text-red-600 bg-red-50', icon: <XCircle className="w-3 h-3" /> },
  'withdrawn': { label: 'Withdrawn', color: 'text-gray-600 bg-gray-50', icon: <XCircle className="w-3 h-3" /> },
};

const REGION_FLAGS: Record<string, string> = {
  'US': '🇺🇸',
  'EU': '🇪🇺',
  'JP': '🇯🇵',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'CH': '🇨🇭',
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: SequenceStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['planning'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config?.color ?? ''}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ApplicationCard({
  app,
  sequenceCount,
  onSelect,
  onCreateSequence,
}: {
  app: ECTDApplication;
  sequenceCount: number;
  onSelect: () => void;
  onCreateSequence: () => void;
}) {
  const flag = REGION_FLAGS[app.region] || '🌐';
  
  return (
    <div className="bg-surface-primary border border-subtle rounded-lg p-4 hover:border-accent-blue/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-content-primary">{app.applicationNumber}</h3>
          <p className="text-sm text-content-secondary">{app.productName}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
      
      <div className="flex items-center gap-4 text-sm text-content-secondary mb-4">
        <span className="flex items-center gap-1">
          {flag} {app.receivingAgency}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {sequenceCount} sequence{sequenceCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-accent-blue hover:bg-accent-blue/10 rounded transition-colors"
        >
          View
        </button>
        <button
          onClick={onCreateSequence}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-content-secondary hover:bg-surface-secondary rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Sequence
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ECTDPublishingDashboard({
  onSelectApplication,
  onCreateApplication,
}: ECTDPublishingDashboardProps) {
  const apps = useFilteredApplications();
  const { setFilters, clearFilters, selectApplication } = useECTDPublishingStore();
  const filters = useECTDPublishingStore(s => s.filters);
  const sequencesByApp = useECTDPublishingStore(s => s.sequencesByApplication);
  const toast = useToast();
  
  const [searchValue, setSearchValue] = useState(filters.search || '');
  
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setFilters({ search: value || undefined });
  };
  
  const handleSelectApp = (app: ECTDApplication) => {
    selectApplication(app.id);
    onSelectApplication?.(app);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-subtle">
        <h1 className="text-xl font-semibold text-content-primary">eCTD Publishing</h1>
        <button
          onClick={onCreateApplication}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-subtle">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
        </div>
        
        <select
          value={filters.region || ''}
          onChange={(e) => setFilters({ region: e.target.value || undefined })}
          className="px-3 py-2 bg-surface-secondary border border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">All Regions</option>
          <option value="US">🇺🇸 United States</option>
          <option value="EU">🇪🇺 European Union</option>
          <option value="JP">🇯🇵 Japan</option>
          <option value="CA">🇨🇦 Canada</option>
        </select>
        
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ status: e.target.value as SequenceStatus || undefined })}
          className="px-3 py-2 bg-surface-secondary border border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="submitted">Submitted</option>
          <option value="under-review">Under Review</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="approved">Approved</option>
        </select>
        
        {(filters.region || filters.status || filters.search) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-content-secondary hover:text-content-primary"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Application Grid */}
      <div className="flex-1 overflow-auto p-4">
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-content-secondary">
            <Globe className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No applications found</p>
            <p className="text-sm">Create a new application to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                sequenceCount={(sequencesByApp[app.id] || []).length}
                onSelect={() => handleSelectApp(app)}
                onCreateSequence={() => {
                  selectApplication(app.id);
                  toast.info('Application selected — open the sequence panel and use New Sequence to add a submission');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
