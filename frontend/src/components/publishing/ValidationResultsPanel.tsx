
// =============================================================================
// VALIDATION RESULTS PANEL - v0.9.13
// =============================================================================
// Display validation results with actions to resolve or waive issues.
// =============================================================================

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  FileText,
  Shield,
  Download,
} from 'lucide-react';
import {
  useECTDPublishingStore,
} from '@/store/useECTDPublishingStore';
import type { ValidationCategory, ValidationSeverity, ValidationStatus, ValidationIssue } from '@/store/ectd-publishing-types';
import {
  downloadValidationReport,
  createValidationReportData,
} from '@/services/validation-report-service';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ValidationResultsPanelProps {
  sequenceId: string;
  applicationNumber?: string;
  sequenceNumber?: string;
  region?: string;
  onRevalidate?: () => void;
  onProceed?: () => void;
}

type FilterOption = 'all' | 'errors' | 'warnings' | 'unresolved';

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<ValidationSeverity, { icon: React.ReactNode; color: string; bgColor: string }> = {
  'error': { 
    icon: <XCircle className="w-4 h-4" />, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 border-red-200' 
  },
  'warning': { 
    icon: <AlertTriangle className="w-4 h-4" />, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 border-amber-200' 
  },
  'info': { 
    icon: <Info className="w-4 h-4" />, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200' 
  },
};

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  'structure': 'Structure',
  'pdf': 'PDF Compliance',
  'reference': 'References',
  'checksum': 'Checksums',
  'metadata': 'Metadata',
  'regional': 'Regional',
  'business': 'Business Rules',
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function StatCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className={`px-4 py-3 rounded-lg border ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

function IssueCard({
  issue,
  onResolve,
  onWaive,
}: {
  issue: ValidationIssue;
  onResolve: (resolution: string) => void;
  onWaive: (justification: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [resolution, setResolution] = useState('');
  const [justification, setJustification] = useState('');
  const config = SEVERITY_CONFIG[issue.severity];
  
  const isResolved = issue.isResolved || issue.isWaived;
  
  return (
    <div className={`border rounded-lg p-4 ${isResolved ? 'opacity-60 bg-surface-secondary' : config.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={config.color}>{config.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-content-primary">{issue.ruleId}</span>
            <span className="text-xs px-2 py-0.5 bg-surface-secondary rounded">
              {CATEGORY_LABELS[issue.category]}
            </span>
          </div>
          <p className="text-sm text-content-primary mb-1">{issue.message}</p>
          {issue.details && (
            <p className="text-xs text-content-secondary mb-2">{issue.details}</p>
          )}
          {issue.documentPath && (
            <div className="flex items-center gap-1 text-xs text-content-tertiary">
              <FileText className="w-3 h-3" />
              {issue.documentPath}
            </div>
          )}
          
          {isResolved && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              {issue.isWaived ? (
                <>
                  <span className="font-medium">Waived:</span> {issue.waiverJustification}
                </>
              ) : (
                <>
                  <span className="font-medium">Resolved:</span> {issue.resolution}
                </>
              )}
            </div>
          )}
          
          {!isResolved && (
            <div className="mt-3 flex items-center gap-2">
              {!showActions ? (
                <>
                  <button
                    onClick={() => setShowActions(true)}
                    className="text-xs px-2 py-1 text-accent-blue hover:bg-accent-blue/10 rounded transition-colors"
                  >
                    Resolve...
                  </button>
                  {issue.severity !== 'error' && (
                    <button
                      onClick={() => {
                        setShowActions(true);
                      }}
                      className="text-xs px-2 py-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    >
                      Waive...
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full space-y-2">
                  <input
                    type="text"
                    placeholder={issue.severity === 'error' ? 'Resolution notes...' : 'Resolution or waiver justification...'}
                    value={resolution || justification}
                    onChange={(e) => {
                      setResolution(e.target.value);
                      setJustification(e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border border-subtle rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (resolution) onResolve(resolution);
                        setShowActions(false);
                        setResolution('');
                      }}
                      disabled={!resolution}
                      className="text-xs px-2 py-1 bg-accent-blue text-white rounded disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    {issue.severity !== 'error' && (
                      <button
                        onClick={() => {
                          if (justification) onWaive(justification);
                          setShowActions(false);
                          setJustification('');
                        }}
                        disabled={!justification}
                        className="text-xs px-2 py-1 bg-amber-500 text-white rounded disabled:opacity-50"
                      >
                        Waive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowActions(false);
                        setResolution('');
                        setJustification('');
                      }}
                      className="text-xs px-2 py-1 text-content-secondary hover:bg-surface-secondary rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ValidationResultsPanel({
  sequenceId,
  applicationNumber = 'N/A',
  sequenceNumber = '0000',
  region = 'US',
  onRevalidate,
  onProceed,
}: ValidationResultsPanelProps) {
  const validation = useECTDPublishingStore(s => s.validationResults[sequenceId]);
  const { runValidation, resolveIssue, waiveIssue } = useECTDPublishingStore();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isValidating, setIsValidating] = useState(false);
  
  const handleRevalidate = async () => {
    setIsValidating(true);
    await runValidation(sequenceId);
    setIsValidating(false);
    onRevalidate?.();
  };
  
  const handleExportReport = () => {
    if (!validation) return;
    
    const reportData = createValidationReportData(validation, {
      title: `Validation Report - ${applicationNumber} Sequence ${sequenceNumber}`,
      applicationNumber,
      sequenceNumber,
      region,
      includeResolved: true,
      includeWaived: true,
      includeInfo: true,
    });
    
    downloadValidationReport(reportData, `validation-report-${applicationNumber}-${sequenceNumber}.html`);
  };
  
  const filteredIssues = validation?.issues.filter(issue => {
    switch (filter) {
      case 'errors': return issue.severity === 'error';
      case 'warnings': return issue.severity === 'warning';
      case 'unresolved': return !issue.isResolved && !issue.isWaived;
      default: return true;
    }
  }) || [];
  
  const unresolvedErrors = validation?.issues.filter(
    i => i.severity === 'error' && !i.isResolved && !i.isWaived
  ).length || 0;
  
  if (!validation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-content-tertiary opacity-50" />
          <p className="text-content-secondary mb-4">No validation results yet</p>
          <button
            onClick={handleRevalidate}
            disabled={isValidating}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Run Validation'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-subtle">
        <div>
          <h2 className="font-semibold text-content-primary">Validation Results</h2>
          <p className="text-sm text-content-secondary">
            Last run: {new Date(validation.lastRun).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-secondary rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleRevalidate}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-secondary rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            Re-validate
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-subtle">
        <StatCard 
          label="Errors" 
          value={validation.totalErrors} 
          color="text-red-600 bg-red-50 border-red-200" 
        />
        <StatCard 
          label="Warnings" 
          value={validation.totalWarnings} 
          color="text-amber-600 bg-amber-50 border-amber-200" 
        />
        <StatCard 
          label="Info" 
          value={validation.totalInfo} 
          color="text-blue-600 bg-blue-50 border-blue-200" 
        />
        <div className="px-4 py-3 rounded-lg border border-subtle">
          <div className="text-2xl font-bold text-content-primary">{validation.completeness}%</div>
          <div className="text-sm text-content-secondary">Completeness</div>
          <div className="mt-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-blue rounded-full transition-all"
              style={{ width: `${validation.completeness}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-subtle">
        {(['all', 'errors', 'warnings', 'unresolved'] as FilterOption[]).map(opt => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === opt 
                ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                : 'text-content-secondary hover:bg-surface-secondary'
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Issues List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-content-tertiary">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No issues found</p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onResolve={(res) => resolveIssue(issue.id, res)}
              onWaive={(just) => waiveIssue(issue.id, just)}
            />
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-subtle bg-surface-secondary">
        {unresolvedErrors > 0 ? (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {unresolvedErrors} unresolved error{unresolvedErrors !== 1 ? 's' : ''} must be fixed
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Ready to proceed
          </div>
        )}
        <button
          onClick={onProceed}
          disabled={unresolvedErrors > 0}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proceed to Publishing
        </button>
      </div>
    </div>
  );
}
