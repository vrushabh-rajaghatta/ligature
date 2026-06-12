

import { useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, FileText, X,
  Check, ChevronDown, ChevronRight, Eye, Download, Send, List
} from 'lucide-react';
import { AuthoringDocument } from '@/types/authoring';

interface QCChecklistProps {
  document: AuthoringDocument;
  onClose: () => void;
  onComplete: (passed: boolean, report: QCReport) => void;
}

interface QCCheckItem {
  id: string;
  category: QCCategory;
  name: string;
  description: string;
  automated: boolean;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning' | 'skipped';
  details?: string;
  severity: 'critical' | 'major' | 'minor';
}

interface QCReport {
  documentId: string;
  documentTitle: string;
  timestamp: string;
  overallStatus: 'passed' | 'failed' | 'passed-with-warnings';
  items: QCCheckItem[];
  reviewer: string;
  comments: string;
}

type QCCategory = 'formatting' | 'references' | 'consistency' | 'compliance' | 'content';

const categoryConfig: Record<QCCategory, { label: string; icon: React.ReactNode }> = {
  formatting: { label: 'Formatting', icon: <FileText className="w-4 h-4" /> },
  references: { label: 'References & Cross-References', icon: <List className="w-4 h-4" /> },
  consistency: { label: 'Consistency', icon: <Check className="w-4 h-4" /> },
  compliance: { label: 'Regulatory Compliance', icon: <CheckCircle className="w-4 h-4" /> },
  content: { label: 'Content Quality', icon: <Eye className="w-4 h-4" /> },
};

const initialChecks: QCCheckItem[] = [
  { id: 'qc-1', category: 'formatting', name: 'Document Structure', description: 'Verify all required sections are present', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-2', category: 'formatting', name: 'Header/Footer Consistency', description: 'Check headers and footers match template', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-3', category: 'formatting', name: 'Table Formatting', description: 'Tables follow standard formatting guidelines', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-4', category: 'formatting', name: 'Figure Formatting', description: 'Figures have proper labels and captions', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-5', category: 'formatting', name: 'Font Consistency', description: 'Document uses approved fonts throughout', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-6', category: 'references', name: 'Table Numbering', description: 'Tables are numbered sequentially', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-7', category: 'references', name: 'Figure Numbering', description: 'Figures are numbered sequentially', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-8', category: 'references', name: 'Cross-Reference Integrity', description: 'All cross-references resolve correctly', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-9', category: 'references', name: 'Bibliography Completeness', description: 'All citations have corresponding references', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-10', category: 'references', name: 'Hyperlink Validation', description: 'All hyperlinks are functional', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-11', category: 'consistency', name: 'Abbreviation Usage', description: 'Abbreviations defined on first use and used consistently', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-12', category: 'consistency', name: 'Terminology Consistency', description: 'Key terms used consistently throughout', automated: true, status: 'pending', severity: 'major' },
  { id: 'qc-13', category: 'consistency', name: 'Date Format Consistency', description: 'Dates follow standard format (DD-MMM-YYYY)', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-14', category: 'consistency', name: 'Number Formatting', description: 'Numbers and decimals formatted consistently', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-15', category: 'consistency', name: 'TFL-Text Consistency', description: 'Text references match TFL data values', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-16', category: 'compliance', name: 'ICH E3 Structure', description: 'CSR follows ICH E3 section structure (Sections 1-16)', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-17', category: 'compliance', name: 'ICH E3 Synopsis', description: 'Synopsis contains all required elements per ICH E3', automated: false, status: 'pending', severity: 'critical' },
  { id: 'qc-18', category: 'compliance', name: 'ICH E3 Appendices', description: 'All required appendices present (16.1-16.4)', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-19', category: 'compliance', name: 'Protocol Conformance', description: 'CSR content aligns with protocol specifications', automated: false, status: 'pending', severity: 'critical' },
  { id: 'qc-20', category: 'compliance', name: 'Regulatory Template Match', description: 'Content matches regulatory template requirements', automated: false, status: 'pending', severity: 'critical' },
  { id: 'qc-21', category: 'compliance', name: 'Required Sections Complete', description: 'All mandatory sections contain content', automated: true, status: 'pending', severity: 'critical' },
  { id: 'qc-22', category: 'content', name: 'Spelling Check', description: 'No spelling errors detected', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-23', category: 'content', name: 'Grammar Check', description: 'No grammar issues detected', automated: true, status: 'pending', severity: 'minor' },
  { id: 'qc-24', category: 'content', name: 'Data Accuracy', description: 'Key data points match source documents', automated: false, status: 'pending', severity: 'critical' },
  { id: 'qc-25', category: 'content', name: 'Subject Narratives Complete', description: 'All required subject narratives included', automated: true, status: 'pending', severity: 'major' },
];

export function QCChecklist({ document, onClose, onComplete }: QCChecklistProps) {
  const [checks, setChecks] = useState<QCCheckItem[]>(initialChecks);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<QCCategory>>(new Set(['formatting', 'references', 'consistency', 'compliance', 'content'] as QCCategory[]));
  const [comments, setComments] = useState('');

  const toggleCategory = (category: QCCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const runAutomatedChecks = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < checks.length; i++) {
      if (checks[i].automated) {
        setChecks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'running' } : c));
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        
        const rand = Math.random();
        let newStatus: QCCheckItem['status'];
        let details: string | undefined;
        
        if (rand > 0.85) {
          newStatus = 'failed';
          details = 'Issue detected - manual review required';
        } else if (rand > 0.7) {
          newStatus = 'warning';
          details = 'Minor issue found';
        } else {
          newStatus = 'passed';
        }
        
        setChecks(prev => prev.map((c, idx) => idx === i ? { ...c, status: newStatus, details } : c));
      }
    }
    
    setIsRunning(false);
  };

  const updateManualCheck = (checkId: string, status: 'passed' | 'failed' | 'warning' | 'skipped') => {
    setChecks(prev => prev.map(c => c.id === checkId ? { ...c, status } : c));
  };

  const getStatusIcon = (status: QCCheckItem['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-accent-blue animate-spin" />;
      case 'skipped': return <Clock className="w-4 h-4 text-text-muted" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  const getCategorySummary = (category: QCCategory) => {
    const categoryChecks = checks.filter(c => c.category === category);
    return {
      total: categoryChecks.length,
      passed: categoryChecks.filter(c => c.status === 'passed').length,
      failed: categoryChecks.filter(c => c.status === 'failed').length,
      warnings: categoryChecks.filter(c => c.status === 'warning').length,
    };
  };

  const getOverallStatus = (): 'pending' | 'passed' | 'failed' | 'passed-with-warnings' => {
    const criticalFailed = checks.filter(c => c.severity === 'critical' && c.status === 'failed').length;
    const anyFailed = checks.filter(c => c.status === 'failed').length;
    const anyWarning = checks.filter(c => c.status === 'warning').length;
    const allComplete = checks.every(c => c.status !== 'pending' && c.status !== 'running');
    
    if (!allComplete) return 'pending';
    if (criticalFailed > 0) return 'failed';
    if (anyFailed > 0 || anyWarning > 0) return 'passed-with-warnings';
    return 'passed';
  };

  const handleComplete = () => {
    const report: QCReport = {
      documentId: document.id,
      documentTitle: document.title,
      timestamp: new Date().toISOString(),
      overallStatus: getOverallStatus() as 'passed' | 'failed' | 'passed-with-warnings',
      items: checks,
      reviewer: 'Patricia Lee',
      comments,
    };
    onComplete(report.overallStatus !== 'failed', report);
  };

  const passedCount = checks.filter(c => c.status === 'passed').length;
  const failedCount = checks.filter(c => c.status === 'failed').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const pendingCount = checks.filter(c => c.status === 'pending' || c.status === 'running').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">QC Checklist</h2>
              <p className="text-sm text-text-muted">{document.shortTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="px-6 py-3 bg-surface-card border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green" />
                <span className="text-sm text-text-primary">{passedCount} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-text-primary">{failedCount} Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-text-primary">{warningCount} Warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-muted">{pendingCount} Pending</span>
              </div>
            </div>
            <button
              onClick={runAutomatedChecks}
              disabled={isRunning}
              className="px-4 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Automated Checks'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {Object.entries(categoryConfig).map(([categoryKey, config]) => {
            const category = categoryKey as QCCategory;
            const summary = getCategorySummary(category);
            const categoryChecks = checks.filter(c => c.category === category);
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 bg-surface-card rounded-lg hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                    <span className="text-text-muted">{config.icon}</span>
                    <span className="text-sm font-medium text-text-primary">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {summary.passed > 0 && <span className="text-xs px-2 py-0.5 bg-accent-green/20 text-accent-green rounded">{summary.passed} ✓</span>}
                    {summary.failed > 0 && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">{summary.failed} ✗</span>}
                    {summary.warnings > 0 && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">{summary.warnings} ⚠</span>}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2 pl-4">
                    {categoryChecks.map(check => (
                      <div key={check.id} className={`p-3 rounded-lg border ${check.status === 'failed' ? 'bg-red-500/5 border-red-500/30' : check.status === 'warning' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-surface border-border'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(check.status)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{check.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${check.severity === 'critical' ? 'bg-red-500/20 text-red-400' : check.severity === 'major' ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-card text-text-muted'}`}>{check.severity}</span>
                                {check.automated && <span className="text-xs text-text-muted">(automated)</span>}
                              </div>
                              <p className="text-xs text-text-muted mt-0.5">{check.description}</p>
                              {check.details && <p className={`text-xs mt-1 ${check.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{check.details}</p>}
                            </div>
                          </div>
                          {!check.automated && check.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateManualCheck(check.id, 'passed')} className="p-1 hover:bg-accent-green/20 rounded text-text-muted hover:text-accent-green" title="Pass"><Check className="w-4 h-4" /></button>
                              <button onClick={() => updateManualCheck(check.id, 'warning')} className="p-1 hover:bg-amber-500/20 rounded text-text-muted hover:text-amber-400" title="Warning"><AlertTriangle className="w-4 h-4" /></button>
                              <button onClick={() => updateManualCheck(check.id, 'failed')} className="p-1 hover:bg-red-500/20 rounded text-text-muted hover:text-red-400" title="Fail"><X className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-6">
            <label className="text-sm font-medium text-text-primary mb-2 block">QC Comments</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add any comments or notes about this QC review..." className="w-full h-24 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getOverallStatus() === 'passed' && <span className="text-sm text-accent-green flex items-center gap-2"><CheckCircle className="w-4 h-4" /> All checks passed</span>}
            {getOverallStatus() === 'passed-with-warnings' && <span className="text-sm text-amber-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Passed with warnings</span>}
            {getOverallStatus() === 'failed' && <span className="text-sm text-red-400 flex items-center gap-2"><XCircle className="w-4 h-4" /> Critical issues found</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button className="px-4 py-2 bg-surface-card text-text-primary rounded-lg text-sm hover:bg-surface border border-border flex items-center gap-2"><Download className="w-4 h-4" />Export Report</button>
            <button onClick={handleComplete} disabled={pendingCount > 0} className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4" />Complete QC Review</button>
          </div>
        </div>
      </div>
    </div>
  );
}
