

// =============================================================================
// CROSS-REFERENCE VALIDATION PANEL - v0.9.17d
// =============================================================================
// Panel for validating document cross-references and hyperlinks within eCTD
// Provides broken link detection, auto-fix capabilities, and compliance reporting
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Play,
  X,
  ChevronRight,
  ChevronDown,
  FileText,
  ExternalLink,
  Wrench,
  Filter,
  Search,
  Zap,
  Clock,
  Shield,
  BarChart3,
} from 'lucide-react';
import { useECTDLinkValidationStore } from '@/store/useECTDLinkValidationStore';
import { CrossReferenceStatus, LinkType } from '@/store/cross-reference-types';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SearchInput } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

// =============================================================================
// Types
// =============================================================================

interface CrossReferenceValidationPanelProps {
  sequenceId?: string;
  applicationId?: string;
  onClose?: () => void;
}

// =============================================================================
// Badge Color Maps
// =============================================================================

const statusColorMap: Record<CrossReferenceStatus, BadgeColor> = {
  valid: 'green',
  broken: 'red',
  warning: 'amber',
  orphaned: 'purple',
  circular: 'pink',
  pending: 'slate',
  skipped: 'slate',
};

const statusIcons: Record<CrossReferenceStatus, React.ReactNode> = {
  valid: <CheckCircle className="w-3.5 h-3.5" />,
  broken: <AlertCircle className="w-3.5 h-3.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5" />,
  orphaned: <ExternalLink className="w-3.5 h-3.5" />,
  circular: <RefreshCw className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  skipped: <X className="w-3.5 h-3.5" />,
};

// =============================================================================
// Main Component
// =============================================================================

export function CrossReferenceValidationPanel({
  sequenceId = 'seq-001',
  applicationId = 'app-001',
  onClose,
}: CrossReferenceValidationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    currentValidation,
    isValidating,
    validationProgress,
    startValidation,
    cancelValidation,
    selectDocument,
    selectReference,
    selectedDocumentId,
    selectedReferenceId,
    statusFilter,
    moduleFilter,
    setStatusFilter,
    setModuleFilter,
    applyFix,
    applyAllAutoFixes,
    getFilteredReferences,
    getAutoFixableCount,
    generateReport,
    exportToCsv,
    reset,
  } = useECTDLinkValidationStore();
  
  const filteredReferences = useMemo(() => getFilteredReferences(), [getFilteredReferences, currentValidation, statusFilter, moduleFilter]);
  const autoFixableCount = useMemo(() => getAutoFixableCount(), [getAutoFixableCount, currentValidation]);
  
  // Toggle document expansion
  const toggleDoc = (docId: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };
  
  // Handle validation start
  const handleStartValidation = () => {
    startValidation(sequenceId, applicationId);
  };
  
  // Handle export
  const handleExport = () => {
    const csv = exportToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-ref-validation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Apply all fixes
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const handleApplyAllFixes = async () => {
    setIsApplyingFixes(true);
    await applyAllAutoFixes();
    setIsApplyingFixes(false);
  };
  
  // Calculate summary stats
  const summary = useMemo(() => {
    if (!currentValidation) return null;
    return {
      total: currentValidation.totalReferences,
      valid: currentValidation.validCount,
      broken: currentValidation.brokenCount,
      warnings: currentValidation.warningCount,
      passRate: currentValidation.totalReferences > 0
        ? Math.round((currentValidation.validCount / currentValidation.totalReferences) * 100)
        : 100,
    };
  }, [currentValidation]);
  
  // Filter references by search
  const searchedRefs = useMemo(() => {
    if (!searchQuery.trim()) return filteredReferences;
    const q = searchQuery.toLowerCase();
    return filteredReferences.filter(r =>
      r.sourceDocumentTitle.toLowerCase().includes(q) ||
      r.targetPath.toLowerCase().includes(q) ||
      r.linkText.toLowerCase().includes(q)
    );
  }, [filteredReferences, searchQuery]);
  
  // Group by document
  const groupedByDocument = useMemo(() => {
    const groups = new Map<string, typeof searchedRefs>();
    searchedRefs.forEach(ref => {
      const key = ref.sourceDocumentId;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ref);
    });
    return groups;
  }, [searchedRefs]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-surface-elevated px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-blue/10 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Cross-Reference Validation</h2>
              <p className="text-xs text-text-muted">Validate hyperlinks and document references</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isValidating && !currentValidation && (
              <Button onClick={handleStartValidation} variant="primary" size="sm">
                <Play className="w-4 h-4" />
                Start Validation
              </Button>
            )}
            {isValidating && (
              <Button onClick={cancelValidation} variant="secondary" size="sm">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            )}
            {currentValidation && !isValidating && (
              <>
                <Button onClick={handleStartValidation} variant="secondary" size="sm">
                  <RefreshCw className="w-4 h-4" />
                  Re-validate
                </Button>
                <Button onClick={handleExport} variant="secondary" size="sm">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </>
            )}
            {onClose && (
              <IconButton icon={<X className="w-4 h-4" />} label="Close" onClick={onClose} variant="ghost" size="sm" />
            )}
          </div>
        </div>
      </div>
      
      {/* Validation in Progress */}
      {isValidating && validationProgress && (
        <div className="p-4 border-b border-border bg-surface-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-sm font-medium text-text-primary">
                {validationProgress.phase === 'scanning' && 'Scanning documents...'}
                {validationProgress.phase === 'validating' && `Validating: ${validationProgress.currentDocument}`}
                {validationProgress.phase === 'analyzing' && 'Analyzing results...'}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {validationProgress.documentsScanned} / {validationProgress.totalDocuments} documents
            </span>
          </div>
          <ProgressBar 
            value={validationProgress.documentsScanned} 
            max={validationProgress.totalDocuments} 
            size="sm"
          />
          {validationProgress.issuesFound > 0 && (
            <p className="text-xs text-accent-amber mt-1">
              {validationProgress.issuesFound} issues found so far
            </p>
          )}
        </div>
      )}
      
      {/* Summary Stats */}
      {currentValidation && !isValidating && summary && (
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-text-muted" />
                <span className="text-xs text-text-muted">Total Links</span>
              </div>
              <span className="text-xl font-bold text-text-primary">{summary.total}</span>
            </div>
            <div className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-accent-green" />
                <span className="text-xs text-text-muted">Valid</span>
              </div>
              <span className="text-xl font-bold text-accent-green">{summary.valid}</span>
            </div>
            <div className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-accent-red" />
                <span className="text-xs text-text-muted">Broken</span>
              </div>
              <span className="text-xl font-bold text-accent-red">{summary.broken}</span>
            </div>
            <div className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-accent-amber" />
                <span className="text-xs text-text-muted">Warnings</span>
              </div>
              <span className="text-xl font-bold text-accent-amber">{summary.warnings}</span>
            </div>
            <div className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-text-muted" />
                <span className="text-xs text-text-muted">Pass Rate</span>
              </div>
              <span className={`text-xl font-bold ${summary.passRate >= 95 ? 'text-accent-green' : summary.passRate >= 80 ? 'text-accent-amber' : 'text-accent-red'}`}>
                {summary.passRate}%
              </span>
            </div>
          </div>
          
          {/* Auto-fix banner */}
          {autoFixableCount > 0 && (
            <div className="mt-3 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-blue" />
                <span className="text-sm text-text-primary">
                  <strong>{autoFixableCount}</strong> issues can be automatically fixed
                </span>
              </div>
              <Button 
                onClick={handleApplyAllFixes} 
                variant="primary" 
                size="sm"
                disabled={isApplyingFixes}
              >
                {isApplyingFixes ? <Spinner size="xs" /> : <Wrench className="w-4 h-4" />}
                Apply All Fixes
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Filters and Search */}
      {currentValidation && !isValidating && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-3">
          <SearchInput
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-xs"
          />
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CrossReferenceStatus | 'all')}
              className="text-sm bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-primary"
            >
              <option value="all">All Status</option>
              <option value="valid">Valid</option>
              <option value="broken">Broken</option>
              <option value="warning">Warning</option>
            </select>
            
            <select
              value={moduleFilter || ''}
              onChange={(e) => setModuleFilter(e.target.value || null)}
              className="text-sm bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-primary"
            >
              <option value="">All Modules</option>
              <option value="m1">Module 1</option>
              <option value="m2">Module 2</option>
              <option value="m3">Module 3</option>
              <option value="m4">Module 4</option>
              <option value="m5">Module 5</option>
            </select>
          </div>
          
          <span className="text-xs text-text-muted ml-auto">
            {searchedRefs.length} links shown
          </span>
        </div>
      )}
      
      {/* Results List */}
      <div className="flex-1 overflow-auto p-4">
        {!currentValidation && !isValidating && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-surface-card rounded-full flex items-center justify-center mb-4">
              <Link2 className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Validation Results</h3>
            <p className="text-sm text-text-muted mb-4 max-w-sm">
              Click "Start Validation" to scan all documents for broken hyperlinks and cross-references.
            </p>
            <Button onClick={handleStartValidation} variant="primary">
              <Play className="w-4 h-4" />
              Start Validation
            </Button>
          </div>
        )}
        
        {currentValidation && !isValidating && (
          <div className="space-y-2">
            {Array.from(groupedByDocument.entries()).map(([docId, refs]) => {
              const isExpanded = expandedDocs.has(docId);
              const hasIssues = refs.some(r => r.status !== 'valid');
              const brokenCount = refs.filter(r => r.status === 'broken').length;
              const warningCount = refs.filter(r => r.status === 'warning').length;
              
              return (
                <div key={docId} className="border border-border rounded-lg overflow-hidden">
                  {/* Document Header */}
                  <button
                    onClick={() => toggleDoc(docId)}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-surface-card transition-colors ${
                      hasIssues ? 'bg-red-500/5' : 'bg-surface-elevated'
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                    )}
                    <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <span className="text-sm font-medium text-text-primary truncate flex-1 text-left">
                      {refs[0]?.sourceDocumentTitle || 'Unknown Document'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge color="slate" size="xs">{refs.length} links</Badge>
                      {brokenCount > 0 && (
                        <Badge color="red" size="xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {brokenCount}
                        </Badge>
                      )}
                      {warningCount > 0 && (
                        <Badge color="amber" size="xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {warningCount}
                        </Badge>
                      )}
                      {!hasIssues && (
                        <Badge color="green" size="xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          All Valid
                        </Badge>
                      )}
                    </div>
                  </button>
                  
                  {/* References List */}
                  {isExpanded && (
                    <div className="border-t border-border divide-y divide-border">
                      {refs.map(ref => (
                        <div 
                          key={ref.id}
                          className={`px-4 py-2.5 flex items-start gap-3 ${
                            ref.status === 'broken' ? 'bg-red-500/5' :
                            ref.status === 'warning' ? 'bg-amber-500/5' : ''
                          } ${selectedReferenceId === ref.id ? 'ring-2 ring-accent-blue ring-inset' : ''}`}
                          onClick={() => selectReference(ref.id)}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {statusIcons[ref.status]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-primary truncate">
                                {ref.linkText}
                              </span>
                              <Badge color={statusColorMap[ref.status]} size="xs">
                                {ref.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-text-muted mt-0.5 truncate">
                              → {ref.targetPath}
                            </div>
                            {ref.validationError && (
                              <div className="text-xs text-accent-red mt-1">
                                {ref.validationError}
                              </div>
                            )}
                            {ref.suggestedFix && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-text-muted">
                                  Suggested: {ref.suggestedFix.description}
                                </span>
                                {ref.suggestedFix.autoFixable && (
                                  <Button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyFix(ref.id);
                                    }}
                                    variant="secondary" 
                                    size="xs"
                                  >
                                    <Wrench className="w-3 h-3" />
                                    Fix
                                  </Button>
                                )}
                                <span className="text-xs text-text-muted">
                                  ({ref.suggestedFix.confidence}% confidence)
                                </span>
                              </div>
                            )}
                          </div>
                          {ref.linkLocation.pageNumber && (
                            <span className="text-xs text-text-muted flex-shrink-0">
                              Page {ref.linkLocation.pageNumber}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {searchedRefs.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No links match your filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossReferenceValidationPanel;
