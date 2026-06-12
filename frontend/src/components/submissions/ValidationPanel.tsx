

import { useState } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronRight,
  Wrench, RefreshCw, FileText, ExternalLink, X, Filter, Search
} from 'lucide-react';
import { useSequenceBuilderStore, ValidationResult, ValidationSeverity } from '@/store/useSequenceBuilderStore';
import { useToast } from '@/components/ui/Toast';

interface ValidationPanelProps {
  onClose?: () => void;
}

export function ValidationPanel({ onClose }: ValidationPanelProps) {
  const toast = useToast();
  const currentDraft = useSequenceBuilderStore(s => s.currentDraft);
  const fixValidationIssue = useSequenceBuilderStore(s => s.fixValidationIssue);
  const startValidation = useSequenceBuilderStore(s => s.startValidation);
  const isValidating = useSequenceBuilderStore(s => s.isValidating);
  
  const [severityFilter, setSeverityFilter] = useState<ValidationSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['errors', 'warnings']));
  
  const results = currentDraft?.validationRun?.results || [];
  const summary = currentDraft?.validationRun?.summary;
  
  // Filter results
  const filteredResults = results.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        r.message.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query)
      );
    }
    return true;
  });
  
  // Group by severity
  const errors = filteredResults.filter(r => r.severity === 'error');
  const warnings = filteredResults.filter(r => r.severity === 'warning');
  const infos = filteredResults.filter(r => r.severity === 'info');
  
  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }
    setExpandedGroups(next);
  };
  
  const getSeverityIcon = (severity: ValidationSeverity, size = 4) => {
    const className = `w-${size} h-${size}`;
    switch (severity) {
      case 'error':
        return <AlertCircle className={`${className} text-red-400`} />;
      case 'warning':
        return <AlertTriangle className={`${className} text-amber-400`} />;
      case 'info':
        return <CheckCircle className={`${className} text-accent-green`} />;
    }
  };
  
  const getSeverityColor = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'info': return 'bg-accent-green/10 border-accent-green/30 text-accent-green';
    }
  };
  
  const handleAutoFix = (result: ValidationResult) => {
    fixValidationIssue(result.id);
    toast.success(`Fixed: ${result.code}`);
  };
  
  const renderResultGroup = (
    title: string,
    groupResults: ValidationResult[],
    groupKey: string,
    severity: ValidationSeverity
  ) => {
    if (groupResults.length === 0) return null;
    
    const isExpanded = expandedGroups.has(groupKey);
    
    return (
      <div className="mb-4">
        <button
          onClick={() => toggleGroup(groupKey)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(severity)}`}
        >
          <div className="flex items-center gap-2">
            {getSeverityIcon(severity, 5)}
            <span className="font-medium">{title}</span>
            <span className="text-sm opacity-70">({groupResults.length})</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {groupResults.map(result => (
              <div
                key={result.id}
                className={`p-3 rounded-lg bg-surface-card border border-border ${
                  result.fixed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(result.severity)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-muted">{result.code}</span>
                        {result.fixed && (
                          <span className="text-xs px-1.5 py-0.5 bg-accent-green/20 text-accent-green rounded">
                            Fixed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-primary mt-1">{result.message}</p>
                      {result.location && (
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {result.location}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {result.autoFixable && !result.fixed && (
                    <button
                      onClick={() => handleAutoFix(result)}
                      className="px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30 flex items-center gap-1"
                    >
                      <Wrench className="w-3 h-3" />
                      Auto-fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  if (!currentDraft?.validationRun) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Validation Results</h3>
          <p className="text-text-muted mb-4">Run validation to check your submission package</p>
          <button
            onClick={() => startValidation()}
            disabled={isValidating}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            Run Validation
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">Validation Results</h3>
          <p className="text-xs text-text-muted">
            Last run: {currentDraft.validationRun.completedAt?.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startValidation()}
            disabled={isValidating}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-card"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Summary */}
      {summary && (
        <div className="p-4 border-b border-border bg-surface">
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg ${summary.errors > 0 ? 'bg-red-500/10' : 'bg-surface-card'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={`w-4 h-4 ${summary.errors > 0 ? 'text-red-400' : 'text-text-muted'}`} />
                <span className="text-xs text-text-muted">Errors</span>
              </div>
              <span className={`text-2xl font-bold ${summary.errors > 0 ? 'text-red-400' : 'text-text-muted'}`}>
                {summary.errors}
              </span>
            </div>
            <div className={`p-3 rounded-lg ${summary.warnings > 0 ? 'bg-amber-500/10' : 'bg-surface-card'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-4 h-4 ${summary.warnings > 0 ? 'text-amber-400' : 'text-text-muted'}`} />
                <span className="text-xs text-text-muted">Warnings</span>
              </div>
              <span className={`text-2xl font-bold ${summary.warnings > 0 ? 'text-amber-400' : 'text-text-muted'}`}>
                {summary.warnings}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-accent-green/10">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-accent-green" />
                <span className="text-xs text-text-muted">Passed</span>
              </div>
              <span className="text-2xl font-bold text-accent-green">
                {summary.info}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search validation results..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'error', 'warning', 'info'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                severityFilter === sev
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-card text-text-muted hover:text-text-primary'
              }`}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Results List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No results match your filters</p>
          </div>
        ) : (
          <>
            {renderResultGroup('Errors', errors, 'errors', 'error')}
            {renderResultGroup('Warnings', warnings, 'warnings', 'warning')}
            {renderResultGroup('Passed Checks', infos, 'infos', 'info')}
          </>
        )}
      </div>
      
      {/* Footer */}
      {summary && summary.errors === 0 && (
        <div className="p-4 border-t border-border bg-accent-green/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-accent-green" />
            <div>
              <p className="text-sm font-medium text-accent-green">Ready for Submission</p>
              <p className="text-xs text-text-muted">No blocking errors found. You can proceed to submit.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
