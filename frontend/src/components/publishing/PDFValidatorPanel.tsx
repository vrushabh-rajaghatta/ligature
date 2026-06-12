

import { useState, useCallback } from 'react';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Settings,
  Play,
  FileText,
} from 'lucide-react';
import {
  ectdPDFValidator,
  PDFValidationResult,
  PDFValidationIssue,
  RegionalSpec,
} from '@/services/ectd-pdf-validator';
import { ECTDDocument } from '@/types/ectd';

interface PDFValidatorPanelProps {
  documents: ECTDDocument[];
  selectedDocument?: ECTDDocument | null;
}

const REGIONS: { id: RegionalSpec; label: string; flag: string }[] = [
  { id: 'FDA', label: 'FDA (US)', flag: '🇺🇸' },
  { id: 'EMA', label: 'EMA (EU)', flag: '🇪🇺' },
  { id: 'HC', label: 'Health Canada', flag: '🇨🇦' },
  { id: 'PMDA', label: 'PMDA (Japan)', flag: '🇯🇵' },
  { id: 'TGA', label: 'TGA (Australia)', flag: '🇦🇺' },
  { id: 'ICH', label: 'ICH Common', flag: '🌐' },
];

export function PDFValidatorPanel({ documents, selectedDocument }: PDFValidatorPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<PDFValidationResult[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<RegionalSpec[]>(['FDA', 'ICH']);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleValidateSelected = useCallback(async () => {
    if (!selectedDocument) return;

    setIsProcessing(true);
    try {
      // Simulate PDF data
      const mockPdfData = new ArrayBuffer(selectedDocument.fileSize || 1024 * 100);
      
      const result = await ectdPDFValidator.validateDocument(
        selectedDocument.id,
        selectedDocument.title,
        mockPdfData,
        selectedRegions
      );

      setValidationResults(prev => {
        const filtered = prev.filter(r => r.documentId !== selectedDocument.id);
        return [...filtered, result];
      });
      setExpandedDocs(new Set([selectedDocument.id]));
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocument, selectedRegions]);

  const handleValidateAll = useCallback(async () => {
    setIsProcessing(true);
    setProgress({ current: 0, total: documents.length });
    
    try {
      const results: PDFValidationResult[] = [];
      
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const mockPdfData = new ArrayBuffer(doc.fileSize || 1024 * 100);
        
        const result = await ectdPDFValidator.validateDocument(
          doc.id,
          doc.title,
          mockPdfData,
          selectedRegions
        );
        results.push(result);
        setProgress({ current: i + 1, total: documents.length });
      }

      setValidationResults(results);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [documents, selectedRegions]);

  const handleClearResults = useCallback(() => {
    ectdPDFValidator.clearCache();
    setValidationResults([]);
    setExpandedDocs(new Set());
  }, []);

  const toggleExpanded = (docId: string) => {
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

  const toggleRegion = (region: RegionalSpec) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region);
      }
      return [...prev, region];
    });
  };

  // Calculate summary
  const summary = {
    total: validationResults.length,
    valid: validationResults.filter(r => r.isValid).length,
    invalid: validationResults.filter(r => !r.isValid).length,
    avgScore: validationResults.length > 0
      ? Math.round(validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length)
      : 0,
    errors: validationResults.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0),
    warnings: validationResults.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-accent-blue" />
            <h3 className="font-semibold text-text-primary">PDF Validator</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-surface-card text-text-muted'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Validate PDFs for eCTD compliance (fonts, bookmarks, page size, etc.)
        </p>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-3 border-b border-border bg-surface-card/50">
          <div className="text-xs font-medium text-text-muted mb-2">Regional Standards</div>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(region => (
              <button
                key={region.id}
                onClick={() => toggleRegion(region.id)}
                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                  selectedRegions.includes(region.id)
                    ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                    : 'border-border text-text-muted hover:border-text-muted'
                }`}
              >
                <span className="mr-1">{region.flag}</span>
                {region.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-b border-border">
        <div className="flex gap-2">
          <button
            onClick={handleValidateSelected}
            disabled={!selectedDocument || isProcessing}
            className="flex-1 px-3 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing && !progress ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Validate Selected
          </button>
          <button
            onClick={handleValidateAll}
            disabled={isProcessing || documents.length === 0}
            className="px-3 py-2 bg-surface-card text-text-primary text-sm font-medium rounded-lg border border-border hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validate All
          </button>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Validating...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-blue transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {validationResults.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="p-2 bg-surface-card rounded-lg text-center">
              <div className={`text-lg font-semibold ${summary.avgScore >= 80 ? 'text-accent-green' : summary.avgScore >= 60 ? 'text-accent-amber' : 'text-accent-red'}`}>
                {summary.avgScore}%
              </div>
              <div className="text-xs text-text-muted">Avg Score</div>
            </div>
            <div className="p-2 bg-surface-card rounded-lg text-center">
              <div className="text-lg font-semibold text-accent-green">{summary.valid}</div>
              <div className="text-xs text-text-muted">Pass</div>
            </div>
            <div className="p-2 bg-surface-card rounded-lg text-center">
              <div className="text-lg font-semibold text-accent-red">{summary.invalid}</div>
              <div className="text-xs text-text-muted">Fail</div>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-accent-red" /> {summary.errors} errors
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-accent-amber" /> {summary.warnings} warnings
            </span>
          </div>
          <button
            onClick={handleClearResults}
            className="mt-2 text-xs text-text-muted hover:text-text-primary"
          >
            Clear results
          </button>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-auto p-3">
        {validationResults.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            {selectedDocument 
              ? 'Click "Validate Selected" to check PDF compliance'
              : 'Select a document or click "Validate All"'}
          </div>
        ) : (
          <div className="space-y-2">
            {validationResults.map(result => (
              <ValidationResultCard
                key={result.documentId}
                result={result}
                isExpanded={expandedDocs.has(result.documentId)}
                onToggle={() => toggleExpanded(result.documentId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ValidationResultCard({
  result,
  isExpanded,
  onToggle,
}: {
  result: PDFValidationResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');

  return (
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-surface transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-primary truncate">
              {result.documentName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result.isValid ? (
            <CheckCircle className="w-5 h-5 text-accent-green" />
          ) : (
            <XCircle className="w-5 h-5 text-accent-red" />
          )}
          <span className={`text-sm font-medium ${
            result.score >= 80 ? 'text-accent-green' : 
            result.score >= 60 ? 'text-accent-amber' : 
            'text-accent-red'
          }`}>
            {result.score}%
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Metadata */}
          <div className="p-3 bg-surface/50 border-b border-border">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-text-muted">PDF Version:</span>{' '}
                <span className="text-text-primary">{result.metadata.pdfVersion}</span>
              </div>
              <div>
                <span className="text-text-muted">Pages:</span>{' '}
                <span className="text-text-primary">{result.metadata.pageCount}</span>
              </div>
              <div>
                <span className="text-text-muted">File Size:</span>{' '}
                <span className="text-text-primary">{formatFileSize(result.metadata.fileSize)}</span>
              </div>
              <div>
                <span className="text-text-muted">Bookmarks:</span>{' '}
                <span className="text-text-primary">{result.metadata.bookmarkCount}</span>
              </div>
              <div>
                <span className="text-text-muted">PDF/A:</span>{' '}
                <span className={result.metadata.isPDFA ? 'text-accent-green' : 'text-text-muted'}>
                  {result.metadata.isPDFA ? result.metadata.pdfaConformance || 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Tagged:</span>{' '}
                <span className={result.metadata.isTagged ? 'text-accent-green' : 'text-text-muted'}>
                  {result.metadata.isTagged ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Issues */}
          {result.issues.length === 0 ? (
            <div className="p-3 text-sm text-accent-green flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              No issues found
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {errors.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
              {warnings.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
              {infos.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: PDFValidationIssue }) {
  const [showDetails, setShowDetails] = useState(false);

  const severityConfig = {
    error: { icon: XCircle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
    warning: { icon: AlertTriangle, color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
    info: { icon: Info, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={`p-2 rounded-lg ${config?.bg ?? ''}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${config?.color ?? ''} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary">{issue.message}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-muted">{issue.category}</span>
            {issue.page && (
              <span className="text-xs text-text-muted">• Page {issue.page}</span>
            )}
            {issue.autoFixable && (
              <span className="px-1.5 py-0.5 text-xs bg-accent-teal/20 text-accent-teal rounded">
                Auto-fixable
              </span>
            )}
          </div>
          {(issue.details || issue.fixSuggestion) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-1 text-xs text-accent-blue hover:underline"
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          )}
          {showDetails && (
            <div className="mt-2 p-2 bg-surface rounded text-xs">
              {issue.details && (
                <p className="text-text-secondary mb-1">{issue.details}</p>
              )}
              {issue.fixSuggestion && (
                <p className="text-text-muted">
                  <strong>Fix:</strong> {issue.fixSuggestion}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
