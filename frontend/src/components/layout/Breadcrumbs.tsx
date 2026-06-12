
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { ModuleId } from '@/types/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  /** Module ID for auto-generating module breadcrumb */
  moduleId?: ModuleId;
  /** Additional breadcrumb items after module */
  items?: BreadcrumbItem[];
  /** Show home icon at start */
  showHome?: boolean;
  /** Called when home is clicked */
  onHomeClick?: () => void;
  /** Custom separator */
  separator?: React.ReactNode;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Maximum items to show before collapsing */
  maxItems?: number;
  /** Additional className */
  className?: string;
}

// ============================================================================
// MODULE METADATA
// ============================================================================

interface ModuleMeta {
  label: string;
  group: string;
  groupColor: string;
}

const MODULE_METADATA: Record<string, ModuleMeta> = {
  'portfolio': { label: 'Portfolio', group: 'Development', groupColor: '#10B981' },
  'research': { label: 'Research', group: 'Research', groupColor: '#06B6D4' },
  'eln': { label: 'Lab Notebook', group: 'Research', groupColor: '#06B6D4' },
  'development': { label: 'Development', group: 'Development', groupColor: '#10B981' },
  'study-design': { label: 'Study Design', group: 'Development', groupColor: '#10B981' },
  'ctms': { label: 'Clinical Trials', group: 'Development', groupColor: '#10B981' },
  'tmf': { label: 'Trial Master File', group: 'Development', groupColor: '#10B981' },
  'study-intel': { label: 'Study Intelligence', group: 'Development', groupColor: '#10B981' },
  'safety': { label: 'Safety & PV', group: 'Development', groupColor: '#10B981' },
  'psmf': { label: 'PSMF', group: 'Development', groupColor: '#10B981' },
  'cmc-manufacturing': { label: 'CMC & Manufacturing', group: 'Development', groupColor: '#10B981' },
  'authoring': { label: 'Authoring', group: 'Regulatory', groupColor: '#F59E0B' },
  'submissions-hub': { label: 'Submissions Hub', group: 'Regulatory', groupColor: '#F59E0B' },
  'registrations': { label: 'Registrations', group: 'Regulatory', groupColor: '#F59E0B' },
  'commitments': { label: 'Commitments', group: 'Regulatory', groupColor: '#F59E0B' },
  'portfolio-strategy': { label: 'Portfolio Strategy', group: 'Regulatory', groupColor: '#F59E0B' },
  'publishing': { label: 'Publishing', group: 'Regulatory', groupColor: '#F59E0B' },
  'haq': { label: 'HAQ', group: 'Regulatory', groupColor: '#F59E0B' },
  'labeling': { label: 'Labeling', group: 'Regulatory', groupColor: '#F59E0B' },
  'spl': { label: 'SPL', group: 'Regulatory', groupColor: '#F59E0B' },
  'strategy': { label: 'Strategy', group: 'Regulatory', groupColor: '#F59E0B' },
  'master-data': { label: 'Master Data', group: 'Regulatory', groupColor: '#F59E0B' },
  'qms': { label: 'QMS', group: 'Quality', groupColor: '#EF4444' },
  'document-control': { label: 'Documents', group: 'Quality', groupColor: '#EF4444' },
  'glp': { label: 'GLP Compliance', group: 'Quality', groupColor: '#EF4444' },
  'archives': { label: 'R&D Archives', group: 'Quality', groupColor: '#EF4444' },
  'inspector-readiness': { label: 'Inspector Readiness', group: 'Quality', groupColor: '#EF4444' },
  'commercial': { label: 'Commercial', group: 'Commercial', groupColor: '#8B5CF6' },
  'supply-chain': { label: 'Supply Chain', group: 'Commercial', groupColor: '#8B5CF6' },
  'medical-affairs': { label: 'Medical Affairs', group: 'Commercial', groupColor: '#8B5CF6' },
  'ai-generation': { label: 'AI Generation', group: 'Operations', groupColor: '#14B8A6' },
  'ai-consistency': { label: 'AI Consistency', group: 'Operations', groupColor: '#14B8A6' },
  'idmp': { label: 'IDMP', group: 'Operations', groupColor: '#14B8A6' },
  'analytics': { label: 'Analytics', group: 'Operations', groupColor: '#14B8A6' },
  'reg-calendar': { label: 'Reg Calendar', group: 'Operations', groupColor: '#14B8A6' },
  'continuous-submission': { label: 'Continuous Submit', group: 'Operations', groupColor: '#14B8A6' },
  'action-center': { label: 'My Tasks', group: 'Core', groupColor: '#3B82F6' },
  'activity': { label: 'Activity', group: 'Core', groupColor: '#3B82F6' },
  'admin': { label: 'Administration', group: 'System', groupColor: '#6B7280' },
  'quality': { label: 'Quality', group: 'Quality', groupColor: '#EF4444' },
  'nonclinical': { label: 'Nonclinical', group: 'Research', groupColor: '#06B6D4' },
  'sample-management': { label: 'Sample Management', group: 'Research', groupColor: '#06B6D4' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Breadcrumbs({
  moduleId,
  items = [],
  showHome = true,
  onHomeClick,
  separator,
  compact = false,
  maxItems = 4,
  className = '',
}: BreadcrumbsProps) {
  // Build full breadcrumb list
  const allItems: BreadcrumbItem[] = [];
  
  // Add module group and module if moduleId provided
  if (moduleId) {
    const meta = MODULE_METADATA[moduleId];
    if (meta) {
      // Add group
      allItems.push({
        label: meta.group,
      });
      // Add module
      allItems.push({
        label: meta.label,
      });
    }
  }
  
  // Add custom items
  allItems.push(...items);
  
  // Collapse if too many items
  const shouldCollapse = allItems.length > maxItems;
  const visibleItems = shouldCollapse 
    ? [...allItems.slice(0, 1), { label: '...' }, ...allItems.slice(-2)]
    : allItems;
  
  const separatorEl = separator || (
    <ChevronRight className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-text-muted flex-shrink-0`} />
  );
  
  return (
    <nav 
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
    >
      {/* Home */}
      {showHome && (
        <>
          <button
            onClick={onHomeClick}
            className="p-1 rounded hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors"
            title="Home"
          >
            <Home className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
          {allItems.length > 0 && separatorEl}
        </>
      )}
      
      {/* Items */}
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const isEllipsis = item.label === '...';
        
        return (
          <React.Fragment key={index}>
            {isEllipsis ? (
              <span className="text-text-muted px-1">...</span>
            ) : item.onClick || item.href ? (
              <button
                onClick={item.onClick}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors ${
                  isLast 
                    ? 'font-medium text-text-primary' 
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                }`}
              >
                {item.icon}
                <span className={compact ? 'max-w-[80px] truncate' : 'max-w-[150px] truncate'}>
                  {item.label}
                </span>
              </button>
            ) : (
              <span 
                className={`flex items-center gap-1.5 px-1.5 py-0.5 ${
                  isLast ? 'font-medium text-text-primary' : 'text-text-muted'
                }`}
              >
                {item.icon}
                <span className={compact ? 'max-w-[80px] truncate' : 'max-w-[150px] truncate'}>
                  {item.label}
                </span>
              </span>
            )}
            
            {!isLast && !isEllipsis && separatorEl}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/**
 * Simplified breadcrumb that just shows module context
 */
export function ModuleBreadcrumb({
  moduleId,
  pageName,
  tabName,
  onModuleClick,
  compact = false,
}: {
  moduleId: ModuleId;
  pageName?: string;
  tabName?: string;
  onModuleClick?: () => void;
  compact?: boolean;
}) {
  const meta = MODULE_METADATA[moduleId];
  
  if (!meta) return null;
  
  const items: BreadcrumbItem[] = [];
  
  if (pageName) {
    items.push({ label: pageName });
  }
  
  if (tabName) {
    items.push({ label: tabName });
  }
  
  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Group badge */}
      <span 
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ 
          backgroundColor: `${meta.groupColor}15`,
          color: meta.groupColor,
        }}
      >
        {meta.group}
      </span>
      
      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
      
      {/* Module */}
      {onModuleClick ? (
        <button 
          onClick={onModuleClick}
          className="font-medium text-text-primary hover:underline"
        >
          {meta.label}
        </button>
      ) : (
        <span className="font-medium text-text-primary">{meta.label}</span>
      )}
      
      {/* Page */}
      {pageName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-secondary">{pageName}</span>
        </>
      )}
      
      {/* Tab */}
      {tabName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">{tabName}</span>
        </>
      )}
    </div>
  );
}

export default Breadcrumbs;
