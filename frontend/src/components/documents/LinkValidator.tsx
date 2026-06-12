

// ============================================================================
// LinkValidator - v175: Cross-Module Link Validation & Broken Link Detection
// ============================================================================
// Validates links between documents across modules, detecting broken links
// when target documents are deleted, moved, or modified. Provides repair
// suggestions and batch validation capabilities.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Link2,
  Link2Off,
  ExternalLink,
  Trash2,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import {
  useDocumentLinkStore,
  useAllDocumentLinks,
  type LinkableModule,
  type DocumentLink,
} from '@/store/useDocumentLinkStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useTMFStore } from '@/store/useTMFStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useHAQStore } from '@/store/useHAQStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import type { BadgeColor } from '@/components/ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

export interface LinkValidationResult {
  link: DocumentLink;
  isValid: boolean;
  sourceExists: boolean;
  targetExists: boolean;
  sourceStatus?: string;
  targetStatus?: string;
  errorType?: 'source_missing' | 'target_missing' | 'both_missing' | 'stale';
  errorMessage?: string;
  repairSuggestion?: string;
  lastValidated: number;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  broken: number;
  stale: number;
  byModule: Record<LinkableModule, { total: number; broken: number }>;
  lastFullScan: number | null;
}

export interface LinkValidatorProps {
  /** Filter to specific modules */
  filterModules?: LinkableModule[];
  /** Filter to specific source document */
  sourceId?: string;
  /** Show detailed validation results */
  showDetails?: boolean;
  /** Auto-run validation on mount */
  autoValidate?: boolean;
  /** Callback when validation completes */
  onValidationComplete?: (summary: ValidationSummary) => void;
  /** Callback when link is repaired */
  onLinkRepaired?: (linkId: string) => void;
  /** Callback when link is removed */
  onLinkRemoved?: (linkId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface BrokenLinkItemProps {
  result: LinkValidationResult;
  onRemove: (linkId: string) => void;
  onNavigate: (module: LinkableModule, id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_LABELS: Record<LinkableModule, string> = {
  safety: 'Safety',
  ctms: 'Clinical',
  tmf: 'TMF',
  ectd: 'eCTD',
  qms: 'QMS',
  haq: 'HAQ',
  authoring: 'Authoring',
  publishing: 'Publishing',
};

const MODULE_COLORS: Record<LinkableModule, BadgeColor> = {
  safety: 'red',
  ctms: 'emerald',
  tmf: 'purple',
  ectd: 'blue',
  qms: 'teal',
  haq: 'amber',
  authoring: 'slate',
  publishing: 'amber',
};

// ============================================================================
// BROKEN LINK ITEM COMPONENT
// ============================================================================

function BrokenLinkItem({
  result,
  onRemove,
  onNavigate,
  isExpanded,
  onToggleExpand,
}: BrokenLinkItemProps) {
  const { link, errorType, errorMessage, repairSuggestion } = result;
  
  const errorBadge = {
    'source_missing': { color: 'red' as BadgeColor, label: 'Source Missing' },
    'target_missing': { color: 'amber' as BadgeColor, label: 'Target Missing' },
    'both_missing': { color: 'red' as BadgeColor, label: 'Both Missing' },
    'stale': { color: 'slate' as BadgeColor, label: 'Stale Link' },
  }[errorType || 'target_missing'];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 bg-surface-card cursor-pointer hover:bg-surface transition-colors"
        onClick={onToggleExpand}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
        </button>
        
        <Link2Off className="w-4 h-4 text-accent-red" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Badge color={MODULE_COLORS[link.sourceModule]} size="xs">
              {MODULE_LABELS[link.sourceModule]}
            </Badge>
            <span className="text-text-muted">→</span>
            <Badge color={MODULE_COLORS[link.targetModule]} size="xs">
              {MODULE_LABELS[link.targetModule]}
            </Badge>
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate">
            {link.sourceTitle || link.sourceId} → {link.targetTitle || link.targetId}
          </div>
        </div>
        
        <Badge color={errorBadge.color} size="xs">
          {errorBadge.label}
        </Badge>
      </div>
      
      {/* Details */}
      {isExpanded && (
        <div className="p-3 border-t border-border bg-surface space-y-3">
          {/* Error message */}
          <div className="flex items-start gap-2 p-2 bg-accent-red/10 border border-accent-red/20 rounded">
            <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              {errorMessage || 'The linked document could not be found.'}
            </div>
          </div>
          
          {/* Link details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-text-muted mb-1">Source</div>
              <div className="text-text-primary">
                {link.sourceTitle || link.sourceId}
                {result.sourceExists ? (
                  <Check className="w-3 h-3 text-accent-green inline ml-1" />
                ) : (
                  <X className="w-3 h-3 text-accent-red inline ml-1" />
                )}
              </div>
            </div>
            <div>
              <div className="text-text-muted mb-1">Target</div>
              <div className="text-text-primary">
                {link.targetTitle || link.targetId}
                {result.targetExists ? (
                  <Check className="w-3 h-3 text-accent-green inline ml-1" />
                ) : (
                  <X className="w-3 h-3 text-accent-red inline ml-1" />
                )}
              </div>
            </div>
          </div>
          
          {/* Repair suggestion */}
          {repairSuggestion && (
            <div className="flex items-start gap-2 p-2 bg-accent-blue/10 border border-accent-blue/20 rounded">
              <Wrench className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <span className="font-medium">Suggestion:</span> {repairSuggestion}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {result.sourceExists && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(link.sourceModule, link.sourceId)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View Source
              </Button>
            )}
            {result.targetExists && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(link.targetModule, link.targetId)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View Target
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(link.id)}
              className="text-accent-red hover:bg-accent-red/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LinkValidator({
  filterModules,
  sourceId,
  showDetails = true,
  autoValidate = false,
  onValidationComplete,
  onLinkRepaired,
  onLinkRemoved,
  className = '',
}: LinkValidatorProps) {
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [results, setResults] = useState<LinkValidationResult[]>([]);
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'broken' | 'valid'>('all');
  
  // Store hooks - use useMemo to avoid new array on every render
  const linksMap = useDocumentLinkStore(s => s.links);
  const allLinks = useMemo(() => Object.values(linksMap), [linksMap]);
  const deleteLink = useDocumentLinkStore(s => s.deleteLink);
  
  // Module stores for existence checking
  const safetyStore = usePharmacovigilanceStore();
  const ctmsStore = useCTMSStore();
  const tmfStore = useTMFStore();
  const qmsStore = useQMSStore();
  const haqStore = useHAQStore();
  
  // Filter links based on props
  const linksToValidate = useMemo(() => {
    let links = allLinks;
    
    if (filterModules && filterModules.length > 0) {
      links = links.filter(
        l => filterModules.includes(l.sourceModule) || filterModules.includes(l.targetModule)
      );
    }
    
    if (sourceId) {
      links = links.filter(l => l.sourceId === sourceId);
    }
    
    return links;
  }, [allLinks, filterModules, sourceId]);
  
  // Check if a document exists in a module
  const documentExists = useCallback((module: LinkableModule, id: string): boolean => {
    switch (module) {
      case 'safety':
        return Object.values(safetyStore.signals).some(s => s.id === id) || 
               Object.values(safetyStore.cases).some(c => c.id === id);
      case 'ctms':
        return Object.values(ctmsStore.studies).some(s => s.id === id);
      case 'tmf':
        return Object.values(tmfStore.artifacts).some(a => a.id === id);
      case 'qms':
        return Object.values(qmsStore.deviations).some(d => d.id === id) ||
               Object.values(qmsStore.capas).some(c => c.id === id) ||
               Object.values(qmsStore.changeControls).some(c => c.id === id);
      case 'haq':
        return Object.values(haqStore.haqs).some(h => h.id === id);
      default:
        // For modules without store access, assume exists
        return true;
    }
  }, [safetyStore, ctmsStore, tmfStore, qmsStore, haqStore]);
  
  // Get repair suggestion based on error type
  const getRepairSuggestion = (
    errorType: LinkValidationResult['errorType'],
    link: DocumentLink
  ): string | undefined => {
    switch (errorType) {
      case 'source_missing':
        return `The source document in ${MODULE_LABELS[link.sourceModule]} was deleted. Consider removing this link.`;
      case 'target_missing':
        return `The target document in ${MODULE_LABELS[link.targetModule]} was deleted. Search for an updated document to link.`;
      case 'both_missing':
        return 'Both source and target documents are missing. This link should be removed.';
      case 'stale':
        return 'This link has not been validated recently. Consider re-validating.';
      default:
        return undefined;
    }
  };
  
  // Run validation
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setValidationProgress(0);
    
    const validationResults: LinkValidationResult[] = [];
    const total = linksToValidate.length;
    
    for (let i = 0; i < total; i++) {
      const link = linksToValidate[i];
      
      // Check existence
      const sourceExists = documentExists(link.sourceModule, link.sourceId);
      const targetExists = documentExists(link.targetModule, link.targetId);
      
      // Determine error type
      let errorType: LinkValidationResult['errorType'] | undefined;
      let errorMessage: string | undefined;
      
      if (!sourceExists && !targetExists) {
        errorType = 'both_missing';
        errorMessage = 'Both the source and target documents have been deleted.';
      } else if (!sourceExists) {
        errorType = 'source_missing';
        errorMessage = `Source document "${link.sourceTitle || link.sourceId}" not found in ${MODULE_LABELS[link.sourceModule]}.`;
      } else if (!targetExists) {
        errorType = 'target_missing';
        errorMessage = `Target document "${link.targetTitle || link.targetId}" not found in ${MODULE_LABELS[link.targetModule]}.`;
      }
      
      validationResults.push({
        link,
        isValid: sourceExists && targetExists,
        sourceExists,
        targetExists,
        errorType,
        errorMessage,
        repairSuggestion: errorType ? getRepairSuggestion(errorType, link) : undefined,
        lastValidated: Date.now(),
      });
      
      // Update progress
      setValidationProgress(Math.round(((i + 1) / total) * 100));
      
      // Small delay to prevent blocking
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
    
    setResults(validationResults);
    setIsValidating(false);
    
    // Calculate summary
    const summary: ValidationSummary = {
      total: validationResults.length,
      valid: validationResults.filter(r => r.isValid).length,
      broken: validationResults.filter(r => !r.isValid).length,
      stale: 0,
      byModule: {} as Record<LinkableModule, { total: number; broken: number }>,
      lastFullScan: Date.now(),
    };
    
    // Group by module
    validationResults.forEach(r => {
      const module = r.link.sourceModule;
      if (!summary.byModule[module]) {
        summary.byModule[module] = { total: 0, broken: 0 };
      }
      summary.byModule[module].total++;
      if (!r.isValid) summary.byModule[module].broken++;
    });
    
    onValidationComplete?.(summary);
  }, [linksToValidate, documentExists, onValidationComplete]);
  
  // Handle link removal
  const handleRemoveLink = (linkId: string) => {
    deleteLink(linkId);
    setResults(prev => prev.filter(r => r.link.id !== linkId));
    onLinkRemoved?.(linkId);
  };
  
  // Handle navigation
  const handleNavigate = (module: LinkableModule, id: string) => {
    // This would integrate with useModuleNavigation
    /* Navigate to module */
  };
  
  // Toggle expanded state
  const toggleExpanded = (linkId: string) => {
    setExpandedLinks(prev => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };
  
  // Filtered and searched results
  const displayResults = useMemo(() => {
    let filtered = results;
    
    // Filter by status
    if (filterStatus === 'broken') {
      filtered = filtered.filter(r => !r.isValid);
    } else if (filterStatus === 'valid') {
      filtered = filtered.filter(r => r.isValid);
    }
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.link.sourceTitle?.toLowerCase().includes(query) ||
        r.link.targetTitle?.toLowerCase().includes(query) ||
        r.link.sourceId.toLowerCase().includes(query) ||
        r.link.targetId.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [results, filterStatus, searchQuery]);
  
  // Summary stats
  const stats = useMemo(() => ({
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    broken: results.filter(r => !r.isValid).length,
  }), [results]);
  
  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Link Validator
          </h3>
          <p className="text-sm text-text-muted mt-1">
            {linksToValidate.length} links to validate
          </p>
        </div>
        
        <Button
          variant="primary"
          onClick={runValidation}
          disabled={isValidating}
          icon={<RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />}
        >
          {isValidating ? 'Validating...' : 'Run Validation'}
        </Button>
      </div>
      
      {/* Progress bar during validation */}
      {isValidating && (
        <div className="mb-4">
          <ProgressBar value={validationProgress} color="blue" showLabel />
          <p className="text-xs text-text-muted mt-1">
            Checking link {Math.floor((validationProgress / 100) * linksToValidate.length)} of {linksToValidate.length}...
          </p>
        </div>
      )}
      
      {/* Results summary */}
      {results.length > 0 && !isValidating && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-surface-card border border-border rounded-lg">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-xs text-text-muted">Total Links</div>
          </div>
          <div className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-lg">
            <div className="text-2xl font-bold text-accent-green">{stats.valid}</div>
            <div className="text-xs text-text-muted">Valid</div>
          </div>
          <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <div className="text-2xl font-bold text-accent-red">{stats.broken}</div>
            <div className="text-xs text-text-muted">Broken</div>
          </div>
        </div>
      )}
      
      {/* Filters and search */}
      {results.length > 0 && showDetails && (
        <div className="flex items-center gap-3 mb-4">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links..."
            className="flex-1"
          />
          
          <div className="flex items-center gap-1 p-1 bg-surface-card rounded-lg">
            {(['all', 'broken', 'valid'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded capitalize ${
                  filterStatus === status
                    ? 'bg-accent-blue text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Results list */}
      {showDetails && (
        <div className="space-y-2">
          {displayResults.length === 0 && results.length > 0 && (
            <div className="text-center py-8 text-text-muted">
              <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No links match your filters</p>
            </div>
          )}
          
          {displayResults.filter(r => !r.isValid).map(result => (
            <BrokenLinkItem
              key={result.link.id}
              result={result}
              onRemove={handleRemoveLink}
              onNavigate={handleNavigate}
              isExpanded={expandedLinks.has(result.link.id)}
              onToggleExpand={() => toggleExpanded(result.link.id)}
            />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {results.length === 0 && !isValidating && (
        <div className="text-center py-12 text-text-muted">
          <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-2">No validation results yet</p>
          <p className="text-sm">Click "Run Validation" to check all links</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT VALIDATION WIDGET
// ============================================================================

export function LinkValidationWidget({
  className = '',
}: { className?: string }) {
  // Get all links from store for validation widget
  const links = useDocumentLinkStore(s => s.links);
  const allLinks = Object.values(links);
  const [brokenCount, setBrokenCount] = useState(0);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  return (
    <div className={`p-4 bg-surface-card border border-border rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">Link Health</span>
        </div>
        <Badge color={brokenCount > 0 ? 'red' : 'green'} size="xs">
          {brokenCount > 0 ? `${brokenCount} broken` : 'All valid'}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{allLinks.length} total links</span>
        {lastCheck && (
          <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LinkValidator;
