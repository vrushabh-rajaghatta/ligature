

/**
 * Breadcrumb - v115
 * 
 * Contextual navigation breadcrumb that shows the current location
 * within the module hierarchy. Supports:
 * - Module group > Module > View hierarchy
 * - Clickable ancestors for quick navigation
 * - Optional custom path segments
 * - Integration with navigation context
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { ModuleId, ModuleGroup } from '@/types/core';
import { useAppStore } from '@/store/useAppStore';

// Module to Group mapping - v0.33.23 reorganized
const MODULE_GROUP_MAP: Record<ModuleId, { group: ModuleGroup; groupLabel: string; color: string }> = {
  // Platform
  'action-center': { group: 'development', groupLabel: 'Platform', color: '#3B82F6' },
  'activity': { group: 'development', groupLabel: 'Platform', color: '#3B82F6' },
  
  // Development
  'portfolio': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'study-design': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'ctms': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'tmf': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'study-intel': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'development': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  
  // Safety
  'safety': { group: 'safety', groupLabel: 'Safety', color: '#F43F5E' },
  'signal-detection': { group: 'safety', groupLabel: 'Safety', color: '#F43F5E' },
  'psmf': { group: 'safety', groupLabel: 'Safety', color: '#F43F5E' },
  
  // CMC
  'cmc': { group: 'cmc', groupLabel: 'CMC', color: '#F97316' },
  'cmc-manufacturing': { group: 'cmc', groupLabel: 'CMC', color: '#F97316' },
  'stability': { group: 'cmc', groupLabel: 'CMC', color: '#F97316' },
  'batch-records': { group: 'cmc', groupLabel: 'CMC', color: '#F97316' },
  'manufacturing': { group: 'cmc', groupLabel: 'CMC', color: '#F97316' },
  
  // Regulatory
  'authoring': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'document-control': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'submissions': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'submissions-hub': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'publishing': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'ectd-workspace': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'ectd-publishing': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'publishing-center': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'haq': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'labeling': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'strategy': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'reg-calendar': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'master-data': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'continuous-submission': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'registrations': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'commitments': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  'portfolio-strategy': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  
  // Quality
  'qms': { group: 'quality', groupLabel: 'Quality', color: '#EF4444' },
  'quality': { group: 'quality', groupLabel: 'Quality', color: '#EF4444' },
  'glp': { group: 'quality', groupLabel: 'Quality', color: '#EF4444' },
  'inspector-readiness': { group: 'quality', groupLabel: 'Quality', color: '#EF4444' },
  'archives': { group: 'quality', groupLabel: 'Quality', color: '#EF4444' },
  
  // Commercial
  'commercial': { group: 'commercial', groupLabel: 'Commercial', color: '#8B5CF6' },
  'supply-chain': { group: 'commercial', groupLabel: 'Commercial', color: '#8B5CF6' },
  'medical-affairs': { group: 'commercial', groupLabel: 'Commercial', color: '#8B5CF6' },
  
  // Intelligence
  'ai-generation': { group: 'intelligence', groupLabel: 'Intelligence', color: '#06B6D4' },
  'ai-authoring': { group: 'intelligence', groupLabel: 'Intelligence', color: '#06B6D4' },
  'ai-consistency': { group: 'intelligence', groupLabel: 'Intelligence', color: '#06B6D4' },
  'analytics': { group: 'intelligence', groupLabel: 'Intelligence', color: '#06B6D4' },
  'idmp': { group: 'regulatory', groupLabel: 'Regulatory', color: '#F59E0B' },
  
  // Legacy
  'research': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'sample-management': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'eln': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'nonclinical': { group: 'development', groupLabel: 'Development', color: '#10B981' },
  'publications': { group: 'commercial', groupLabel: 'Commercial', color: '#8B5CF6' },
  'admin': { group: 'quality', groupLabel: 'Admin', color: '#64748B' },
  'home': { group: 'development', groupLabel: 'Home', color: '#14B8A6' },
  'research-lead-opt': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-translational': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-targets': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-preclinical': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-ind': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-literature': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'research-intelligence': { group: 'development', groupLabel: 'Research', color: '#8B5CF6' },
  'biostats': { group: 'development', groupLabel: 'Clinical', color: '#3B82F6' },
  'study-startup': { group: 'development', groupLabel: 'Clinical', color: '#3B82F6' },
  'submission-command': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'submission-planning': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'template-registry': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'spl': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'ectd-intelligence': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'reg-intel': { group: 'regulatory', groupLabel: 'Regulatory', color: '#10B981' },
  'gcp': { group: 'quality', groupLabel: 'Quality', color: '#F59E0B' },
  'gmp': { group: 'quality', groupLabel: 'Quality', color: '#F59E0B' },
  'adpromo': { group: 'commercial', groupLabel: 'Commercial', color: '#EC4899' },
  'rd-connected': { group: 'development', groupLabel: 'Platform', color: '#14B8A6' },
  'agent-hub': { group: 'development', groupLabel: 'Platform', color: '#A855F7' },
};

// Module labels
const MODULE_LABELS: Record<ModuleId, string> = {
  'portfolio': 'Portfolio',
  'action-center': 'My Tasks',
  'activity': 'Activity',
  'research': 'Research',
  'sample-management': 'Sample Management',
  'eln': 'Lab Notebook',
  'development': 'Development',
  'study-design': 'Study Design',
  'safety': 'Safety & PV',
  'psmf': 'PSMF',
  'glp': 'GLP Compliance',
  'nonclinical': 'Nonclinical',
  'quality': 'Quality',
  'cmc': 'CMC & Manufacturing',
  'cmc-manufacturing': 'CMC & Manufacturing',
  'authoring': 'Authoring',
  'labeling': 'Labeling',
  'submissions': 'Submissions',
  'submissions-hub': 'Submissions Hub',
  'publishing': 'Publishing',
  'ectd-workspace': 'Publishing',
  'publishing-center': 'Publishing',
  'ectd-publishing': 'Publishing',
  'strategy': 'Regulatory Strategy',
  'haq': 'HAQ',
  'supply-chain': 'Supply Chain',
  'publications': 'Publications',
  'admin': 'Administration',
  'home': 'Home',
  'research-lead-opt': 'Lead Optimization',
  'research-translational': 'Translational Science',
  'research-targets': 'Research Targets',
  'research-preclinical': 'Preclinical Research',
  'research-ind': 'IND Readiness',
  'research-literature': 'Literature Monitoring',
  'research-intelligence': 'Competitive Intelligence',
  'biostats': 'Biostatistics',
  'study-startup': 'Study Startup',
  'submission-command': 'Submission Command',
  'submission-planning': 'Submission Planning',
  'template-registry': 'Template Registry',
  'spl': 'Structured Product Labeling',
  'ectd-intelligence': 'eCTD Intelligence',
  'reg-intel': 'Regulatory Intelligence',
  'gcp': 'GCP Compliance',
  'gmp': 'GMP Compliance',
  'adpromo': 'Ad/Promo Review',
  'rd-connected': 'R&D Connected',
  'agent-hub': 'Agent Hub',
  'master-data': 'Master Data',
  'document-control': 'Document Control',
  'ctms': 'Clinical Trials',
  'tmf': 'Trial Master File',
  'study-intel': 'Study Intelligence',
  'qms': 'QMS',
  'inspector-readiness': 'Inspector Readiness',
  'archives': 'R&D Archives',
  'reg-calendar': 'Regulatory Calendar',
  'ai-generation': 'AI Document Generation',
  'medical-affairs': 'Medical Affairs',
  'continuous-submission': 'Continuous Submission',
  'ai-consistency': 'AI Consistency',
  'idmp': 'IDMP',
  'analytics': 'Platform Analytics',
  'commercial': 'Commercial',
  'manufacturing': 'CMC & Manufacturing',
  'registrations': 'Registrations',
  'commitments': 'Commitments',
  'portfolio-strategy': 'Portfolio Strategy',
  // v0.33.23: New modules
  'signal-detection': 'Signal Detection',
  'stability': 'Stability',
  'batch-records': 'Batch Records',
  'ai-authoring': 'AI Authoring',
};

export interface BreadcrumbSegment {
  label: string;
  moduleId?: ModuleId;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  /** Current module ID - auto-generates group + module breadcrumb */
  moduleId?: ModuleId;
  /** Current view/tab within module */
  viewLabel?: string;
  /** Additional custom segments after module */
  segments?: BreadcrumbSegment[];
  /** Alternative prop name for segments (backwards compatibility) */
  items?: Array<{ label: string; href?: string }>;
  /** Show home icon as first segment */
  showHome?: boolean;
  /** Callback when home is clicked */
  onHomeClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function Breadcrumb({
  moduleId,
  viewLabel,
  segments = [],
  items,
  showHome = true,
  onHomeClick,
  className = '',
}: BreadcrumbProps) {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  // Convert items to segments if provided (backwards compatibility)
  const effectiveSegments = items?.map(item => ({
    label: item.label,
    href: item.href,
  })) || segments;
  
  // Build breadcrumb trail
  const trail: BreadcrumbSegment[] = [];
  
  // Add home
  if (showHome) {
    trail.push({
      label: 'Home',
      moduleId: 'portfolio',
      onClick: onHomeClick || (() => setActiveModule('portfolio')),
    });
  }
  
  // Add group and module from moduleId
  if (moduleId) {
    const groupInfo = MODULE_GROUP_MAP[moduleId];
    if (groupInfo) {
      // Add group (not clickable - just context)
      trail.push({
        label: groupInfo.groupLabel,
      });
    }
    
    // Add module
    trail.push({
      label: MODULE_LABELS[moduleId] || moduleId,
      moduleId,
      onClick: () => setActiveModule(moduleId),
    });
  }
  
  // Add view label if provided
  if (viewLabel) {
    trail.push({
      label: viewLabel,
    });
  }
  
  // Add custom segments
  trail.push(...effectiveSegments);
  
  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {trail.map((segment, index) => {
          const isLast = index === trail.length - 1;
          const isClickable = !isLast && (segment.onClick || segment.moduleId);
          const isHome = index === 0 && showHome;
          
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              )}
              
              {isClickable ? (
                <button
                  onClick={segment.onClick || (segment.moduleId ? () => setActiveModule(segment.moduleId!) : undefined)}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
                >
                  {isHome && <Home className="w-3.5 h-3.5" />}
                  <span>{isHome ? '' : segment.label}</span>
                </button>
              ) : (
                <span
                  className={`px-1.5 py-0.5 ${
                    isLast 
                      ? 'text-text-primary font-medium' 
                      : 'text-text-muted'
                  }`}
                >
                  {isHome && !isClickable ? (
                    <Home className="w-3.5 h-3.5" />
                  ) : (
                    segment.label
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact breadcrumb variant for tight spaces
 */
export function BreadcrumbCompact({
  moduleId,
  viewLabel,
  className = '',
}: Pick<BreadcrumbProps, 'moduleId' | 'viewLabel' | 'className'>) {
  const groupInfo = moduleId ? MODULE_GROUP_MAP[moduleId] : null;
  const moduleLabel = moduleId ? MODULE_LABELS[moduleId] : null;
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {groupInfo && (
        <>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${groupInfo?.color ?? ''}20`,
              color: groupInfo.color,
            }}
          >
            {groupInfo.groupLabel}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        </>
      )}
      {moduleLabel && (
        <span className="text-text-primary font-medium">{moduleLabel}</span>
      )}
      {viewLabel && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-secondary">{viewLabel}</span>
        </>
      )}
    </div>
  );
}

export default Breadcrumb;
