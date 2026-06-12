// =============================================================================
// ENHANCED VALIDATION PANEL - v0.39.2
// =============================================================================
// Actionable validation results with one-click fixes.
// Key improvement over RIMSmart: Integrated fix actions, not just warnings.
// =============================================================================


import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  Play,
  RefreshCw,
  Download,
  FileText,
  Zap,
  Wrench,
  Eye,
  RotateCcw,
  Check,
  X,
  Filter,
  Clock,
  Shield,
  FileCheck,
  Link2,
  Hash,
  Globe,
  Server,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type ValidationCategory = 
  | 'pdf-compliance'
  | 'backbone-structure'
  | 'cross-references'
  | 'checksums'
  | 'regional'
  | 'gateway-precheck';

type ValidationSeverity = 'error' | 'warning' | 'info' | 'pass';

type FixAction = 'auto-fix' | 'manual-fix' | 'ignore' | 'defer';

interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  code: string;
  title: string;
  description: string;
  location?: string;
  documentId?: string;
  documentName?: string;
  
  // Fix options
  canAutoFix: boolean;
  fixAction?: FixAction;
  fixDescription?: string;
  fixEstimate?: string;
  
  // Status
  isFixed: boolean;
  isIgnored: boolean;
}

interface ValidationCategoryInfo {
  id: ValidationCategory;
  name: string;
  icon: React.ElementType;
  total: number;
  passed: number;
  warnings: number;
  errors: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ISSUES: ValidationIssue[] = [
  // PDF Issues
  {
    id: 'pdf-001',
    category: 'pdf-compliance',
    severity: 'warning',
    code: 'PDF-SIZE-LARGE',
    title: 'Large file may slow reviewer',
    description: 'File size exceeds 50MB recommendation for eCTD submissions.',
    location: 'm5/53-csr-001.pdf',
    documentId: 'doc-csr-001',
    documentName: 'CSR LIG-301',
    canAutoFix: true,
    fixDescription: 'Split PDF into multiple parts or compress images',
    fixEstimate: '~2 min',
    isFixed: false,
    isIgnored: false,
  },
  {
    id: 'pdf-002',
    category: 'pdf-compliance',
    severity: 'warning',
    code: 'PDF-BOOKMARK-DEPTH',
    title: 'Bookmark depth exceeds 4 levels',
    description: 'FDA recommends bookmark hierarchy not exceed 4 levels.',
    location: 'm2/27-clinical-overview.pdf',
    documentId: 'doc-co-001',
    documentName: 'Clinical Overview',
    canAutoFix: true,
    fixDescription: 'Flatten bookmark hierarchy to 4 levels',
    fixEstimate: '~30 sec',
    isFixed: false,
    isIgnored: false,
  },
  {
    id: 'pdf-003',
    category: 'pdf-compliance',
    severity: 'info',
    code: 'PDF-NO-HYPERLINKS',
    title: 'Consider adding hyperlinks to references',
    description: 'Document contains references that could be hyperlinked.',
    location: 'm2/27-clinical-summary.pdf',
    documentId: 'doc-cs-001',
    documentName: 'Clinical Summary',
    canAutoFix: true,
    fixDescription: 'Auto-detect and create hyperlinks to references',
    fixEstimate: '~1 min',
    isFixed: false,
    isIgnored: false,
  },
  // Cross-reference Issues
  {
    id: 'xref-001',
    category: 'cross-references',
    severity: 'error',
    code: 'XREF-BROKEN',
    title: 'Broken cross-reference detected',
    description: 'Hyperlink target document not found in submission.',
    location: 'm2/23-qos.pdf → m3/32s-drug-substance.pdf',
    canAutoFix: false,
    fixDescription: 'Update hyperlink to correct target path',
    isFixed: false,
    isIgnored: false,
  },
  {
    id: 'xref-002',
    category: 'cross-references',
    severity: 'warning',
    code: 'XREF-EXTERNAL',
    title: 'External hyperlink detected',
    description: 'Link points outside the submission package.',
    location: 'm2/27-clinical-summary.pdf',
    canAutoFix: true,
    fixDescription: 'Convert to internal reference or remove',
    fixEstimate: '~15 sec',
    isFixed: false,
    isIgnored: false,
  },
  // Regional Issues
  {
    id: 'reg-001',
    category: 'regional',
    severity: 'warning',
    code: 'FDA-FORM-OUTDATED',
    title: 'Form 356h may need update',
    description: 'Consider using latest version of FDA Form 356h.',
    location: 'm1/11-forms/fda-356h.xml',
    canAutoFix: true,
    fixDescription: 'Update to latest form version',
    fixEstimate: '~1 min',
    isFixed: false,
    isIgnored: false,
  },
  {
    id: 'reg-002',
    category: 'regional',
    severity: 'info',
    code: 'FDA-SEQUENCE-GAP',
    title: 'Non-sequential sequence number',
    description: 'Gap detected between sequences 0001 and 0003.',
    canAutoFix: false,
    fixDescription: 'Verify sequence numbering is intentional',
    isFixed: false,
    isIgnored: false,
  },
  // Gateway Pre-check
  {
    id: 'gw-001',
    category: 'gateway-precheck',
    severity: 'pass',
    code: 'GW-ESG-READY',
    title: 'FDA ESG gateway requirements met',
    description: 'Submission meets all FDA Electronic Submissions Gateway requirements.',
    canAutoFix: false,
    isFixed: false,
    isIgnored: false,
  },
  {
    id: 'gw-002',
    category: 'gateway-precheck',
    severity: 'warning',
    code: 'GW-SIZE-LIMIT',
    title: 'Approaching gateway size limit',
    description: 'Total package size is 85% of ESG limit (4.2GB of 5GB).',
    canAutoFix: true,
    fixDescription: 'Compress package or split into volumes',
    fixEstimate: '~5 min',
    isFixed: false,
    isIgnored: false,
  },
];

const CATEGORY_CONFIG: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  'pdf-compliance': { name: 'PDF Compliance', icon: FileText, color: 'text-blue-400' },
  'backbone-structure': { name: 'Backbone Structure', icon: FileCheck, color: 'text-purple-400' },
  'cross-references': { name: 'Cross-References', icon: Link2, color: 'text-amber-400' },
  'checksums': { name: 'Checksums', icon: Hash, color: 'text-green-400' },
  'regional': { name: 'Regional (FDA)', icon: Globe, color: 'text-pink-400' },
  'gateway-precheck': { name: 'Gateway Pre-Check', icon: Server, color: 'text-cyan-400' },
};

const SEVERITY_CONFIG: Record<ValidationSeverity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertCircle },
  warning: { label: 'Warning', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: AlertTriangle },
  info: { label: 'Info', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Info },
  pass: { label: 'Pass', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function SeverityBadge({ severity }: { severity: ValidationSeverity }) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''} ${config?.bg ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategorySummaryCard({
  category,
  issues,
  expanded,
  onToggle,
}: {
  category: string;
  issues: ValidationIssue[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  
  const errors = issues.filter(i => i.severity === 'error' && !i.isFixed && !i.isIgnored).length;
  const warnings = issues.filter(i => i.severity === 'warning' && !i.isFixed && !i.isIgnored).length;
  const passed = issues.filter(i => i.severity === 'pass' || i.isFixed).length;
  const total = issues.length;

  const overallStatus = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'pass';
  const statusConfig = SEVERITY_CONFIG[overallStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-surface-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusConfig?.bg ?? ''}`}>
            <Icon className={`w-4 h-4 ${config?.color ?? ''}`} />
          </div>
          <div className="text-left">
            <div className="font-medium text-text-primary text-sm">{config.name}</div>
            <div className="text-xs text-text-muted">
              {passed}/{total} passed
              {errors > 0 && <span className="text-red-400 ml-2">{errors} errors</span>}
              {warnings > 0 && <span className="text-amber-400 ml-2">{warnings} warnings</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusConfig?.color ?? ''}`} />
          <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
    </div>
  );
}

function IssueCard({
  issue,
  onFix,
  onIgnore,
  onUndo,
}: {
  issue: ValidationIssue;
  onFix: () => void;
  onIgnore: () => void;
  onUndo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityConfig = SEVERITY_CONFIG[issue.severity];

  if (issue.isFixed || issue.isIgnored) {
    return (
      <div className="p-3 bg-surface-elevated rounded-lg opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {issue.isFixed ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm text-text-muted line-through">{issue.title}</span>
          </div>
          <button onClick={onUndo} className="text-xs text-text-muted hover:text-text-primary">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${
      issue.severity === 'error' ? 'border-red-500/30 bg-red-500/5' :
      issue.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
      'border-border bg-surface-card'
    }`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Severity Icon */}
          <div className={`p-1.5 rounded ${severityConfig?.bg ?? ''}`}>
            {React.createElement(severityConfig.icon, { className: `w-4 h-4 ${severityConfig?.color ?? ''}` })}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-muted font-mono">{issue.code}</span>
              <SeverityBadge severity={issue.severity} />
            </div>
            <h4 className="text-sm font-medium text-text-primary">{issue.title}</h4>
            {issue.location && (
              <p className="text-xs text-text-muted mt-1 font-mono truncate">{issue.location}</p>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            {issue.canAutoFix && (
              <button
                onClick={onFix}
                className="px-2 py-1 text-xs font-medium text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center gap-1"
                title={issue.fixDescription}
              >
                <Zap className="w-3 h-3" />
                Fix
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-surface-elevated rounded"
            >
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50 pt-3 space-y-3">
          <p className="text-xs text-text-secondary">{issue.description}</p>
          
          {issue.fixDescription && (
            <div className="p-2 bg-surface-elevated rounded">
              <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                Fix Action
              </div>
              <p className="text-xs text-text-primary">{issue.fixDescription}</p>
              {issue.fixEstimate && (
                <p className="text-xs text-text-muted mt-1">Estimated time: {issue.fixEstimate}</p>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {issue.canAutoFix && (
              <button
                onClick={onFix}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Auto-Fix
              </button>
            )}
            {!issue.canAutoFix && (
              <button className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-card rounded hover:bg-surface-elevated flex items-center justify-center gap-1">
                <Wrench className="w-3 h-3" />
                Manual Fix
              </button>
            )}
            <button
              onClick={onIgnore}
              className="px-3 py-1.5 text-xs text-text-muted hover:bg-surface-card rounded flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Ignore
            </button>
            {issue.documentId && (
              <button className="px-3 py-1.5 text-xs text-text-muted hover:bg-surface-card rounded flex items-center gap-1">
                <Eye className="w-3 h-3" />
                View
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface EnhancedValidationPanelProps {
  submissionId?: string;
  onRunValidation?: () => void;
  onExport?: () => void;
}

export function EnhancedValidationPanel({
  submissionId,
  onRunValidation,
  onExport,
}: EnhancedValidationPanelProps) {
  const [issues, setIssues] = useState(MOCK_ISSUES);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['pdf-compliance', 'cross-references']));
  const [filterSeverity, setFilterSeverity] = useState<ValidationSeverity | 'all'>('all');
  const [isRunning, setIsRunning] = useState(false);

  // Group issues by category
  const issuesByCategory = useMemo(() => {
    const grouped: Record<string, ValidationIssue[]> = {};
    issues.forEach(issue => {
      if (!grouped[issue.category]) grouped[issue.category] = [];
      grouped[issue.category].push(issue);
    });
    return grouped;
  }, [issues]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const active = issues.filter(i => !i.isFixed && !i.isIgnored);
    const errors = active.filter(i => i.severity === 'error').length;
    const warnings = active.filter(i => i.severity === 'warning').length;
    const passed = issues.filter(i => i.severity === 'pass' || i.isFixed).length;
    const fixable = active.filter(i => i.canAutoFix).length;
    return { errors, warnings, passed, total: issues.length, fixable };
  }, [issues]);

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleFix = (issueId: string) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, isFixed: true } : i));
  };

  const handleIgnore = (issueId: string) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, isIgnored: true } : i));
  };

  const handleUndo = (issueId: string) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, isFixed: false, isIgnored: false } : i));
  };

  const handleFixAll = () => {
    setIssues(prev => prev.map(i => i.canAutoFix && !i.isFixed && !i.isIgnored ? { ...i, isFixed: true } : i));
  };

  const handleRunValidation = async () => {
    setIsRunning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRunning(false);
    onRunValidation?.();
  };

  const overallStatus = stats.errors > 0 ? 'error' : stats.warnings > 0 ? 'warning' : 'pass';
  const overallConfig = SEVERITY_CONFIG[overallStatus];

  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${overallConfig?.bg ?? ''}`}>
              <Shield className={`w-5 h-5 ${overallConfig?.color ?? ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Validation Results</h2>
              <p className="text-xs text-text-muted">
                {stats.passed}/{stats.total} checks passed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunValidation}
              disabled={isRunning}
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded-lg flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              Re-validate
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded-lg flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Overall Progress</span>
            <span>{Math.round((stats.passed / stats.total) * 100)}% Ready</span>
          </div>
          <div className="h-2 bg-surface-card rounded-full overflow-hidden flex">
            <div className="bg-green-500" style={{ width: `${(stats.passed / stats.total) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(stats.warnings / stats.total) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(stats.errors / stats.total) * 100}%` }} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-2 bg-green-500/10 rounded text-center">
            <div className="text-lg font-bold text-green-400">{stats.passed}</div>
            <div className="text-xs text-green-400">Passed</div>
          </div>
          <div className="p-2 bg-amber-500/10 rounded text-center">
            <div className="text-lg font-bold text-amber-400">{stats.warnings}</div>
            <div className="text-xs text-amber-400">Warnings</div>
          </div>
          <div className="p-2 bg-red-500/10 rounded text-center">
            <div className="text-lg font-bold text-red-400">{stats.errors}</div>
            <div className="text-xs text-red-400">Errors</div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded text-center">
            <div className="text-lg font-bold text-blue-400">{stats.fixable}</div>
            <div className="text-xs text-blue-400">Auto-Fixable</div>
          </div>
        </div>

        {/* Fix All Button */}
        {stats.fixable > 0 && (
          <button
            onClick={handleFixAll}
            className="w-full mt-4 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            Fix All {stats.fixable} Auto-Fixable Issues
          </button>
        )}
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Object.entries(issuesByCategory).map(([category, categoryIssues]) => (
          <div key={category}>
            <CategorySummaryCard
              category={category}
              issues={categoryIssues}
              expanded={expandedCategories.has(category)}
              onToggle={() => handleToggleCategory(category)}
            />
            
            {expandedCategories.has(category) && (
              <div className="mt-2 ml-4 space-y-2">
                {categoryIssues
                  .filter(i => filterSeverity === 'all' || i.severity === filterSeverity)
                  .map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onFix={() => handleFix(issue.id)}
                      onIgnore={() => handleIgnore(issue.id)}
                      onUndo={() => handleUndo(issue.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-surface-card">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            Last validated: {new Date().toLocaleTimeString()}
          </div>
          <button
            disabled={stats.errors > 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
              stats.errors > 0
                ? 'bg-surface-elevated text-text-muted cursor-not-allowed'
                : 'bg-accent-green text-white hover:bg-accent-green/90'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {stats.errors > 0 ? 'Fix Errors to Proceed' : 'Proceed to Package'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedValidationPanel;
