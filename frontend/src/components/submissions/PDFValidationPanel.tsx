

import { useState, useMemo } from 'react';
import {
  FileCheck, Play, CheckCircle, AlertTriangle, AlertCircle, XCircle,
  ChevronRight, ChevronDown, Zap, RefreshCw, Download, Eye,
  FileText, Clock, Wrench, Info, Filter
} from 'lucide-react';
import {
  PDFValidationService,
  PDFDocumentInfo,
  PDFValidationResult,
  BatchValidationResult,
  PDF_VALIDATION_RULES,
  generateMockPDFInfo,
} from '@/services/pdf-validation-service';
import { PublishingDocument, ValidationSeverity } from '@/types/publishing';

interface PDFValidationPanelProps {
  documents: PublishingDocument[];
  onValidationComplete?: (result: BatchValidationResult) => void;
  projectId?: string;
}

const severityConfig: Record<ValidationSeverity, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  error: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Error' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Warning' },
  info: { icon: <Info className="w-4 h-4" />, color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', label: 'Info' },
};

export function PDFValidationPanel({ documents, onValidationComplete, projectId }: PDFValidationPanelProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BatchValidationResult | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<ValidationSeverity | 'all'>('all');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [autoFixProgress, setAutoFixProgress] = useState<{ fixing: boolean; current: string; progress: number }>({ fixing: false, current: '', progress: 0 });
  
  const service = useMemo(() => new PDFValidationService(), []);

  const runValidation = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate mock PDF info for each document
      const pdfInfos: PDFDocumentInfo[] = documents.map(doc => generateMockPDFInfo(doc));
      
      // Run batch validation
      const result = await service.validateBatch(pdfInfos);
      
      setValidationResult(result);
      onValidationComplete?.(result);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoFixAll = async () => {
    if (!validationResult) return;
    
    setAutoFixProgress({ fixing: true, current: '', progress: 0 });
    
    // Get all auto-fixable issues
    const autoFixableIssues: { docId: string; code: string }[] = [];
    validationResult.results.forEach((result, docId) => {
      result.issues.filter(i => i.autoFixable).forEach(issue => {
        autoFixableIssues.push({ docId, code: issue.code });
      });
    });

    const total = autoFixableIssues.length;
    let processed = 0;

    for (const { docId, code } of autoFixableIssues) {
      setAutoFixProgress({
        fixing: true,
        current: `Fixing ${code}...`,
        progress: Math.round((processed / total) * 100),
      });
      
      // Simulate fix time
      await new Promise(resolve => setTimeout(resolve, 200));
      processed++;
    }

    setAutoFixProgress({ fixing: false, current: '', progress: 100 });
    
    // Re-run validation to show fixed state
    await runValidation();
  };

  const toggleDocExpanded = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  // Filter results by severity
  const filteredResults = useMemo(() => {
    if (!validationResult) return null;
    
    if (filterSeverity === 'all') return validationResult;

    const filtered = new Map<string, PDFValidationResult>();
    validationResult.results.forEach((result, docId) => {
      const filteredIssues = result.issues.filter(i => i.severity === filterSeverity);
      if (filteredIssues.length > 0) {
        filtered.set(docId, { ...result, issues: filteredIssues });
      }
    });

    return {
      ...validationResult,
      results: filtered,
    };
  }, [validationResult, filterSeverity]);

  // Stats from validation
  const stats = useMemo(() => {
    if (!validationResult) return null;
    return {
      total: validationResult.totalDocuments,
      passed: validationResult.passedDocuments,
      failed: validationResult.failedDocuments,
      warnings: validationResult.warningDocuments,
      errors: validationResult.summary.errors,
      warningCount: validationResult.summary.warnings,
      autoFixable: validationResult.summary.commonIssues.filter(i => 
        PDF_VALIDATION_RULES.find(r => r.code === i.code)?.autoFixable
      ).reduce((sum, i) => sum + i.count, 0),
    };
  }, [validationResult]);

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">PDF Validation</h3>
            <p className="text-xs text-text-muted">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • FDA/EMA compliance checks
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={runValidation}
            disabled={isValidating || autoFixProgress.fixing}
            className="px-4 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
          >
            {isValidating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isValidating ? 'Validating...' : 'Run Validation'}
          </button>
        </div>
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <div className="p-4 border-b border-border bg-accent-blue/5">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-accent-blue animate-spin" />
            <div className="flex-1">
              <div className="text-sm text-text-primary">Validating documents...</div>
              <div className="text-xs text-text-muted">Checking PDF/A compliance, bookmarks, hyperlinks, and more</div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-fix Progress */}
      {autoFixProgress.fixing && (
        <div className="p-4 border-b border-border bg-accent-green/5">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-accent-green animate-pulse" />
            <div className="flex-1">
              <div className="text-sm text-text-primary">Auto-fixing issues...</div>
              <div className="text-xs text-text-muted">{autoFixProgress.current}</div>
            </div>
            <span className="text-sm font-medium text-accent-green">{autoFixProgress.progress}%</span>
          </div>
          <div className="h-2 bg-surface-card rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-green transition-all"
              style={{ width: `${autoFixProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Summary */}
      {stats && (
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-surface-card rounded-lg">
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div className="text-center p-3 bg-accent-green/10 rounded-lg">
              <div className="text-2xl font-bold text-accent-green">{stats.passed}</div>
              <div className="text-xs text-text-muted">Passed</div>
            </div>
            <div className="text-center p-3 bg-amber-500/10 rounded-lg">
              <div className="text-2xl font-bold text-amber-400">{stats.warnings}</div>
              <div className="text-xs text-text-muted">Warnings</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-text-muted">Failed</div>
            </div>
            <div className="text-center p-3 bg-accent-purple/10 rounded-lg">
              <div className="text-2xl font-bold text-accent-purple">{stats.autoFixable}</div>
              <div className="text-xs text-text-muted">Auto-fixable</div>
            </div>
          </div>

          {/* Auto-fix all button */}
          {stats.autoFixable > 0 && (
            <button
              onClick={handleAutoFixAll}
              disabled={autoFixProgress.fixing}
              className="mt-4 w-full py-2 bg-accent-purple/10 text-accent-purple text-sm rounded-lg hover:bg-accent-purple/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Auto-fix {stats.autoFixable} issue{stats.autoFixable !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Common Issues */}
      {validationResult && validationResult.summary.commonIssues.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-3">Common Issues</h4>
          <div className="space-y-2">
            {validationResult.summary.commonIssues.slice(0, 5).map(issue => {
              const rule = PDF_VALIDATION_RULES.find(r => r.code === issue.code);
              return (
                <div key={issue.code} className="flex items-center justify-between p-2 bg-surface-card rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted">{issue.code}</span>
                    <span className="text-sm text-text-secondary">{rule?.name || issue.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-surface px-2 py-0.5 rounded text-text-muted">
                      {issue.count}x
                    </span>
                    {rule?.autoFixable && (
                      <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Auto-fix
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {validationResult && (
        <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-3">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted">Filter:</span>
          <div className="flex items-center gap-1">
            {(['all', 'error', 'warning', 'info'] as const).map(severity => (
              <button
                key={severity}
                onClick={() => setFilterSeverity(severity)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filterSeverity === severity
                    ? severity === 'all' 
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : `${severityConfig[severity as ValidationSeverity]?.bgColor} ${severityConfig[severity as ValidationSeverity]?.color}`
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {severity === 'all' ? 'All' : severityConfig[severity as ValidationSeverity]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Results List */}
      {filteredResults && (
        <div className="max-h-96 overflow-auto divide-y divide-border">
          {Array.from(filteredResults.results.entries()).map(([docId, result]) => {
            const doc = documents.find(d => d.id === docId);
            const isExpanded = expandedDocs.has(docId);
            const hasErrors = result.issues.some(i => i.severity === 'error');
            const hasWarnings = result.issues.some(i => i.severity === 'warning');
            
            return (
              <div key={docId} className="bg-surface">
                {/* Document Header */}
                <div 
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                  onClick={() => toggleDocExpanded(docId)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    hasErrors ? 'bg-red-500/20' :
                    hasWarnings ? 'bg-amber-500/20' :
                    'bg-accent-green/20'
                  }`}>
                    {hasErrors ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : hasWarnings ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {doc?.fileName || docId}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {result.issues.length === 0 ? (
                        <span className="text-accent-green">All checks passed</span>
                      ) : (
                        <>
                          {result.issues.filter(i => i.severity === 'error').length > 0 && (
                            <span className="text-red-400">
                              {result.issues.filter(i => i.severity === 'error').length} error(s)
                            </span>
                          )}
                          {result.issues.filter(i => i.severity === 'warning').length > 0 && (
                            <span className="text-amber-400">
                              {result.issues.filter(i => i.severity === 'warning').length} warning(s)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                
                {/* Expanded Issues */}
                {isExpanded && result.issues.length > 0 && (
                  <div className="px-4 pb-3 space-y-2 bg-surface-card/50">
                    {result.issues.map((issue, idx) => {
                      const config = severityConfig[issue.severity];
                      const rule = PDF_VALIDATION_RULES.find(r => r.code === issue.code);
                      
                      return (
                        <div key={idx} className={`p-3 rounded-lg border ${config.bgColor} border-transparent`}>
                          <div className="flex items-start gap-2">
                            <span className={config.color}>{config.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-text-muted">{issue.code}</span>
                                <span className="text-sm font-medium text-text-primary">{issue.message}</span>
                              </div>
                              {issue.details && (
                                <p className="text-xs text-text-secondary mt-1">{issue.details}</p>
                              )}
                              {issue.manualFixGuidance && (
                                <p className="text-xs text-text-muted mt-2 italic">
                                  💡 {issue.manualFixGuidance}
                                </p>
                              )}
                            </div>
                            {issue.autoFixable && (
                              <button className="px-2 py-1 text-xs bg-accent-purple/20 text-accent-purple rounded hover:bg-accent-purple/30 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Fix
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredResults.results.size === 0 && (
            <div className="p-8 text-center text-text-muted">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent-green opacity-50" />
              <p className="text-sm">No issues found matching current filter</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!validationResult && !isValidating && (
        <div className="p-8 text-center">
          <FileCheck className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary mb-1">Ready to validate</p>
          <p className="text-xs text-text-muted">
            Click "Run Validation" to check {documents.length} document{documents.length !== 1 ? 's' : ''} for PDF compliance
          </p>
        </div>
      )}

      {/* Footer */}
      {validationResult && (
        <div className="p-3 border-t border-border bg-surface flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Validated in {validationResult.duration}ms
          </span>
          <div className="flex items-center gap-2">
            <button className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1">
              <Download className="w-3 h-3" />
              Export Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
