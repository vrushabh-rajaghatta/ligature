
import { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  RotateCcw,
  Square,
  Shield,
  BookOpen,
  Target,
  RefreshCw,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  useDocumentQC, 
  type DocumentQCRequest, 
  type StyleIssue, 
  type CompletenessIssue 
} from '@/hooks/useDocumentQC';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentQCPanelProps {
  /** Document ID */
  documentId: string;
  /** Document title */
  documentTitle: string;
  /** Document type for completeness checks */
  documentType: DocumentQCRequest['documentType'];
  /** Sections to analyze */
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  /** Target guidelines */
  guidelines?: string[];
  /** Style guide */
  styleGuide?: DocumentQCRequest['styleGuide'];
  /** Callback when QC completes */
  onComplete?: (score: number) => void;
  /** Compact mode for sidebar */
  compact?: boolean;
}

// ============================================================================
// ISSUE CARD
// ============================================================================

function IssueCard({
  issue,
  type,
}: {
  issue: StyleIssue | CompletenessIssue;
  type: 'style' | 'completeness';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getIcon = () => {
    switch (issue.type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'suggestion': return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (issue.type) {
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30';
      case 'suggestion': return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${getBgColor()}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-primary">{issue.message}</span>
            </div>
            {type === 'style' && (issue as StyleIssue).category && (
              <span className="text-xs text-text-muted">
                {(issue as StyleIssue).category}
              </span>
            )}
            {type === 'completeness' && (issue as CompletenessIssue).guideline && (
              <span className="text-xs text-text-muted">
                {(issue as CompletenessIssue).guideline}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-border/50 text-xs">
          {type === 'style' && (issue as StyleIssue).suggestion && (
            <div className="flex items-start gap-1.5">
              <Target className="w-3 h-3 text-accent-green mt-0.5" />
              <span className="text-text-secondary">{(issue as StyleIssue).suggestion}</span>
            </div>
          )}
          {type === 'style' && (issue as StyleIssue).location?.text && (
            <div className="mt-2 px-2 py-1 bg-surface-card rounded text-text-muted font-mono">
              "{(issue as StyleIssue).location?.text}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCORE BADGE
// ============================================================================

function QCScoreBadge({ 
  score, 
  size = 'md' 
}: { 
  score: number; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const getColor = () => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBg = () => {
    if (score >= 90) return 'bg-green-500/20';
    if (score >= 70) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-1.5',
    lg: 'text-4xl px-4 py-2',
  };

  return (
    <div className={`rounded-lg font-bold ${getColor()} ${getBg()} ${sizeClasses[size]}`}>
      {score}%
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentQCPanel({
  documentId,
  documentTitle,
  documentType,
  sections,
  guidelines,
  styleGuide = 'ama-11',
  onComplete,
  compact = false,
}: DocumentQCPanelProps) {
  const [showFullReport, setShowFullReport] = useState(false);
  const [activeIssueTab, setActiveIssueTab] = useState<'all' | 'errors' | 'warnings' | 'suggestions'>('all');
  const [autoStarted, setAutoStarted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    state,
    metrics,
    runQC,
    cancel,
    reset,
    isRunning,
    isStreaming,
    isComplete,
    isError,
    isIdle,
    totalIssueCount,
    criticalIssueCount,
  } = useDocumentQC({
    onComplete: (analysis, metadata) => {
      // Calculate score based on issues
      const errors = (metadata?.styleIssues.filter(i => i.type === 'error').length || 0) +
                     (metadata?.completenessIssues.filter(i => i.type === 'error').length || 0);
      const warnings = (metadata?.styleIssues.filter(i => i.type === 'warning').length || 0) +
                       (metadata?.completenessIssues.filter(i => i.type === 'warning').length || 0);
      const score = Math.max(0, 100 - (errors * 10) - (warnings * 3));
      onComplete?.(score);
    },
  });

  // Auto-start QC when panel opens (better UX)
  useEffect(() => {
    if (!autoStarted && isIdle && sections.length > 0) {
      setAutoStarted(true);
      const request: DocumentQCRequest = {
        documentId,
        documentTitle,
        documentType,
        sections,
        targetGuidelines: guidelines,
        styleGuide,
      };
      runQC(request);
    }
  }, [autoStarted, isIdle, sections.length, documentId, documentTitle, documentType, guidelines, styleGuide, runQC]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.analysis, isStreaming]);

  const handleRunQC = () => {
    const request: DocumentQCRequest = {
      documentId,
      documentTitle,
      documentType,
      sections,
      targetGuidelines: guidelines,
      styleGuide,
    };
    runQC(request);
  };

  const handleReset = () => {
    reset();
  };

  // Calculate score
  const calculateScore = () => {
    if (!state.metadata) return null;
    const errors = (state.metadata.styleIssues.filter(i => i.type === 'error').length || 0) +
                   (state.metadata.completenessIssues.filter(i => i.type === 'error').length || 0);
    const warnings = (state.metadata.styleIssues.filter(i => i.type === 'warning').length || 0) +
                     (state.metadata.completenessIssues.filter(i => i.type === 'warning').length || 0);
    return Math.max(0, 100 - (errors * 10) - (warnings * 3));
  };

  // Filter issues
  const filteredStyleIssues = state.metadata?.styleIssues.filter(i => {
    if (activeIssueTab === 'all') return true;
    if (activeIssueTab === 'errors') return i.type === 'error';
    if (activeIssueTab === 'warnings') return i.type === 'warning';
    if (activeIssueTab === 'suggestions') return i.type === 'suggestion';
    return true;
  }) || [];

  const filteredCompletenessIssues = state.metadata?.completenessIssues.filter(i => {
    if (activeIssueTab === 'all') return true;
    if (activeIssueTab === 'errors') return i.type === 'error';
    if (activeIssueTab === 'warnings') return i.type === 'warning';
    return true;
  }) || [];

  const score = calculateScore();

  // ============================================================================
  // COMPACT MODE (for sidebar)
  // ============================================================================
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-purple" />
            <span className="text-sm font-medium text-text-primary">Document QC</span>
          </div>
          {!isRunning && !isComplete && (
            <button
              onClick={handleRunQC}
              disabled={sections.length === 0}
              className="px-2 py-1 bg-accent-purple hover:bg-accent-purple/80 text-white text-xs rounded flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              Check
            </button>
          )}
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{isStreaming ? 'AI analyzing...' : 'Running checks...'}</span>
          </div>
        )}

        {isComplete && score !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <QCScoreBadge score={score} size="sm" />
              <div className="text-xs text-text-muted">
                {criticalIssueCount > 0 && (
                  <span className="text-red-400">{criticalIssueCount} critical</span>
                )}
                {criticalIssueCount > 0 && totalIssueCount > criticalIssueCount && ' • '}
                {totalIssueCount - criticalIssueCount > 0 && (
                  <span>{totalIssueCount - criticalIssueCount} other</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowFullReport(true)}
              className="w-full px-2 py-1.5 text-xs bg-surface-card hover:bg-surface border border-border rounded text-text-secondary"
            >
              View Full Report
            </button>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // FULL MODE
  // ============================================================================
  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-blue/20">
              <Brain className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">AI Document QC</h3>
              <p className="text-xs text-text-muted">ICH guidelines • AMA 11th Edition • Completeness check</p>
            </div>
          </div>

          {!isRunning && !isComplete && (
            <button
              onClick={handleRunQC}
              disabled={sections.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-blue hover:opacity-90 text-white text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-accent-purple/20"
            >
              <Sparkles className="w-4 h-4" />
              Run Quality Check
            </button>
          )}

          {isRunning && (
            <button
              onClick={cancel}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Cancel
            </button>
          )}

          {isComplete && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-surface-card hover:bg-surface border border-border text-text-secondary text-sm rounded-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Run Again
            </button>
          )}
        </div>

        {/* Phase Indicators */}
        {isRunning && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg">
            {/* Phase 1: Rule Checks */}
            <div className={`flex items-center gap-2 ${state.status === 'checking' ? 'text-accent-purple' : state.metadata ? 'text-accent-green' : 'text-text-muted'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                state.status === 'checking' 
                  ? 'bg-accent-purple/20 animate-pulse' 
                  : state.metadata 
                    ? 'bg-accent-green/20' 
                    : 'bg-surface-card'
              }`}>
                {state.status === 'checking' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : state.metadata ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs">1</span>
                )}
              </div>
              <span className="text-xs font-medium">Rule Checks</span>
            </div>

            <div className="flex-1 h-px bg-border" />

            {/* Phase 2: AI Analysis */}
            <div className={`flex items-center gap-2 ${isStreaming ? 'text-accent-purple' : isComplete ? 'text-accent-green' : 'text-text-muted'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isStreaming 
                  ? 'bg-accent-purple/20 animate-pulse' 
                  : isComplete 
                    ? 'bg-accent-green/20' 
                    : 'bg-surface-card'
              }`}>
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs">2</span>
                )}
              </div>
              <span className="text-xs font-medium">AI Analysis</span>
            </div>

            <div className="flex-1 h-px bg-border" />

            {/* Phase 3: Complete */}
            <div className={`flex items-center gap-2 ${isComplete ? 'text-accent-green' : 'text-text-muted'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isComplete ? 'bg-accent-green/20' : 'bg-surface-card'
              }`}>
                {isComplete ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs">3</span>
                )}
              </div>
              <span className="text-xs font-medium">Complete</span>
            </div>
          </div>
        )}

        {/* Status */}
        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
            <span>
              {state.status === 'checking' && 'Running rule-based checks...'}
              {isStreaming && `AI analysis in progress... (${metrics.wordCount} words)`}
            </span>
          </div>
        )}

        {isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {state.error}
            </div>
          </div>
        )}

        {/* Score Summary (after complete) */}
        {isComplete && score !== null && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-surface-card border border-border rounded-lg">
            <div className="text-center">
              <QCScoreBadge score={score} size="lg" />
              <div className="text-xs text-text-muted mt-1">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {criticalIssueCount}
              </div>
              <div className="text-xs text-text-muted mt-1">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                {state.metadata?.styleIssues.filter(i => i.type === 'warning').length || 0}
              </div>
              <div className="text-xs text-text-muted mt-1">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {state.metadata?.styleIssues.filter(i => i.type === 'suggestion').length || 0}
              </div>
              <div className="text-xs text-text-muted mt-1">Suggestions</div>
            </div>
          </div>
        )}

        {/* Rule-Based Issues */}
        {state.metadata && (filteredStyleIssues.length > 0 || filteredCompletenessIssues.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">Automated Checks</span>
            </div>

            {/* Issue Filter Tabs */}
            <div className="flex gap-1 p-1 bg-surface-card rounded-lg">
              {(['all', 'errors', 'warnings', 'suggestions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveIssueTab(tab)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    activeIssueTab === tab
                      ? 'bg-accent-purple text-white'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {filteredCompletenessIssues.map((issue, idx) => (
                <IssueCard key={`completeness-${idx}`} issue={issue} type="completeness" />
              ))}
              {filteredStyleIssues.map((issue, idx) => (
                <IssueCard key={`style-${idx}`} issue={issue} type="style" />
              ))}
              {filteredStyleIssues.length === 0 && filteredCompletenessIssues.length === 0 && (
                <div className="text-center py-4 text-sm text-text-muted">
                  No issues in this category
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {(state.analysis || isStreaming) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-purple" />
              <span className="text-sm font-medium text-text-primary">AI Expert Review</span>
            </div>

            <div
              ref={contentRef}
              className="p-4 bg-gradient-to-br from-accent-purple/5 to-accent-blue/5 border border-accent-purple/30 rounded-lg max-h-96 overflow-auto"
            >
              <div className="prose prose-sm prose-invert max-w-none text-sm text-text-secondary">
                {state.analysis.split('\n').map((line, idx) => {
                  if (line.startsWith('## ')) {
                    return (
                      <h3 key={idx} className="text-base font-semibold text-text-primary mt-4 mb-2 flex items-center gap-2">
                        {line.includes('Critical') && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {line.includes('Major') && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {line.includes('Minor') && <Info className="w-4 h-4 text-blue-400" />}
                        {line.includes('Executive') && <Shield className="w-4 h-4 text-accent-purple" />}
                        {line.includes('Compliance') && <BookOpen className="w-4 h-4 text-accent-green" />}
                        {line.replace('## ', '')}
                      </h3>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={idx} className="font-semibold text-text-primary">
                        {line.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={idx} className="ml-4">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  if (line.trim()) {
                    return <p key={idx}>{line}</p>;
                  }
                  return null;
                })}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-accent-purple ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Idle State */}
        {isIdle && (
          <div className="py-8 text-center border border-dashed border-border rounded-lg">
            <Shield className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-primary mb-1">AI Quality Control</p>
            <p className="text-xs text-text-muted">
              Checks compliance with ICH guidelines, AMA style, and document completeness
            </p>
          </div>
        )}

        {/* Metrics Footer */}
        {isComplete && metrics.totalTimeMs > 0 && (
          <div className="pt-3 border-t border-border flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Rules: {metrics.ruleCheckTimeMs}ms
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI: {(metrics.aiAnalysisTimeMs / 1000).toFixed(1)}s
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {state.metadata?.stats.totalWords || 0} words analyzed
            </div>
          </div>
        )}
      </div>

      {/* Full Report Modal (for compact mode) */}
      {showFullReport && (
        <Modal
          isOpen={showFullReport}
          onClose={() => setShowFullReport(false)}
          title="Document QC Report"
          size="xl"
        >
          <div className="space-y-4">
            {/* Reuse the score summary and issues */}
            {isComplete && score !== null && (
              <div className="grid grid-cols-4 gap-4 p-4 bg-surface-card border border-border rounded-lg">
                <div className="text-center">
                  <QCScoreBadge score={score} size="lg" />
                  <div className="text-xs text-text-muted mt-1">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {criticalIssueCount}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Critical Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {state.metadata?.styleIssues.filter(i => i.type === 'warning').length || 0}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {state.metadata?.styleIssues.filter(i => i.type === 'suggestion').length || 0}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Suggestions</div>
                </div>
              </div>
            )}

            {/* AI Analysis in modal */}
            {state.analysis && (
              <div className="p-4 bg-surface-card border border-border rounded-lg max-h-[60vh] overflow-auto">
                <div className="prose prose-sm prose-invert max-w-none text-sm text-text-secondary">
                  {state.analysis.split('\n').map((line, idx) => {
                    if (line.startsWith('## ')) {
                      return (
                        <h3 key={idx} className="text-base font-semibold text-text-primary mt-4 mb-2">
                          {line.replace('## ', '')}
                        </h3>
                      );
                    }
                    if (line.startsWith('- ')) {
                      return <li key={idx} className="ml-4">{line.replace('- ', '')}</li>;
                    }
                    if (line.trim()) {
                      return <p key={idx}>{line}</p>;
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default DocumentQCPanel;
