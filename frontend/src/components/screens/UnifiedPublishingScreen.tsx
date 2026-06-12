

// =============================================================================
// UNIFIED PUBLISHING SCREEN - v0.9.17d
// =============================================================================
// Combines eCTD Workspace (technical document assembly) and Publishing Center
// (pipeline planning, tracking, lifecycle) into a single unified module.
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  FolderOpen,
  BarChart3,
  FileText,
  Send,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Layers,
  Package,
  Link2,
  FileCheck,
  Shield,
  Calendar,
  History,
  Users,
  Activity,
} from 'lucide-react';
import { FilterState } from '@/components/layout/FilterBar';
import { SubmissionsFilterBar, SubmissionsFilter, EMPTY_SUBMISSIONS_FILTER } from '@/components/submissions/SubmissionsFilterBar';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge, BadgeColor } from '@/components/ui/Badge';

// Import sub-screens to render within tabs
import { ECTDWorkspaceScreen } from './ECTDWorkspaceScreen';
import { PublishingCenterScreen } from './PublishingCenterScreen';

// Import data for stats
import { ectdApplications, getFilteredApplications } from '@/data/ectd-data';

// =============================================================================
// Types
// =============================================================================

interface UnifiedPublishingScreenProps {
  filters?: FilterState;
  initialMode?: 'workspace' | 'pipeline';
}

type PrimaryMode = 'workspace' | 'pipeline';

// =============================================================================
// Component
// =============================================================================

export function UnifiedPublishingScreen({ filters, initialMode = 'workspace' }: UnifiedPublishingScreenProps) {
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>(initialMode);
  const [isLoading, setIsLoading] = useState(true);
  const [pubFilter, setPubFilter] = useState<SubmissionsFilter>(EMPTY_SUBMISSIONS_FILTER);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Merge prop-level FilterState with in-module SubmissionsFilter
  const mergedFilters: FilterState = {
    product:         pubFilter.program || filters?.product || '',
    region:          pubFilter.region  || filters?.region  || '',
    applicationType: pubFilter.applicationType || filters?.applicationType || '',
  };

  // Calculate quick stats
  const filteredApps = useMemo(() => {
    return getFilteredApplications({
      product:         mergedFilters.product,
      region:          mergedFilters.region,
      applicationType: mergedFilters.applicationType,
    });
  }, [mergedFilters.product, mergedFilters.region, mergedFilters.applicationType]);

  const stats = useMemo(() => {
    const totalSequences = filteredApps.reduce((acc, app) => acc + app.sequences.length, 0);
    const totalDocs = filteredApps.reduce((acc, app) => 
      acc + app.sequences.reduce((seqAcc, seq) => seqAcc + (seq.documents?.length || 0), 0), 0
    );
    const submitted = filteredApps.flatMap(app => app.sequences)
      .filter(s => s.status === 'submitted' || s.status === 'acknowledged').length;
    const drafts = filteredApps.flatMap(app => app.sequences)
      .filter(s => s.status === 'draft').length;
    const underReview = filteredApps.flatMap(app => app.sequences)
      .filter(s => s.status === 'under-review').length;

    return { totalSequences, totalDocs, submitted, drafts, underReview };
  }, [filteredApps]);

  // Primary mode tabs
  const primaryTabs = [
    {
      id: 'workspace' as PrimaryMode,
      label: 'Workspace',
      icon: <FolderOpen className="w-4 h-4" />,
      description: 'eCTD document assembly, validation, and publishing tools',
      badge: stats.totalDocs > 0 ? stats.totalDocs.toString() : undefined,
    },
    {
      id: 'pipeline' as PrimaryMode,
      label: 'Pipeline',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Submission planning, tracking, and lifecycle management',
      badge: stats.totalSequences > 0 ? stats.totalSequences.toString() : undefined,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-text-muted">Loading Publishing Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Unified Header */}
      <div className="border-b border-border bg-surface">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <Breadcrumb 
              moduleId="publishing" 
              viewLabel={primaryMode === 'workspace' ? 'Workspace' : 'Pipeline'}
              className="mb-2"
            />
            <h1 className="text-xl font-semibold text-text-primary">Publishing</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {primaryMode === 'workspace' 
                ? 'eCTD document assembly, validation, and submission preparation'
                : 'Pipeline planning, submission tracking, and lifecycle management'
              }
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Sequences:</span>
              <span className="font-semibold text-text-primary">{stats.totalSequences}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              <span className="text-text-muted">Drafts:</span>
              <span className="font-semibold text-accent-amber">{stats.drafts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-accent-purple" />
              <span className="text-text-muted">Submitted:</span>
              <span className="font-semibold text-accent-purple">{stats.submitted}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-text-muted">In Review:</span>
              <span className="font-semibold text-accent-green">{stats.underReview}</span>
            </div>
          </div>
        </div>

        {/* Primary Mode Tabs */}
        <div className="px-6 flex items-center gap-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPrimaryMode(tab.id)}
              className={`px-4 py-2.5 text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                primaryMode === tab.id
                  ? 'bg-surface-elevated text-accent-blue border-accent-blue font-medium'
                  : 'text-text-secondary hover:text-text-primary border-transparent hover:bg-surface-card'
              }`}
              title={tab.description}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  primaryMode === tab.id 
                    ? 'bg-accent-blue/20 text-accent-blue' 
                    : 'bg-surface-card text-text-muted'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar — parity with Submissions area (v0.125.84) */}
      <SubmissionsFilterBar
        value={pubFilter}
        onChange={setPubFilter}
        resultCount={filteredApps.length}
        totalCount={ectdApplications.length}
      />

      {/* Content - Render appropriate sub-screen */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {primaryMode === 'workspace' ? (
          <WorkspaceContent filters={mergedFilters} />
        ) : (
          <PipelineContent filters={mergedFilters} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Workspace Content - Wraps ECTDWorkspaceScreen without its header
// =============================================================================

function WorkspaceContent({ filters }: { filters?: FilterState }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ECTDWorkspaceScreen filters={filters} embedded />
    </div>
  );
}

// =============================================================================
// Pipeline Content - Wraps PublishingCenterScreen without its header
// =============================================================================

function PipelineContent({ filters }: { filters?: FilterState }) {
  // The PublishingCenterScreen already has all the functionality we need
  // We render it in embedded mode to hide its header
  return <PublishingCenterScreen filters={filters} embedded />;
}

// =============================================================================
// Export as default
// =============================================================================

export default UnifiedPublishingScreen;
