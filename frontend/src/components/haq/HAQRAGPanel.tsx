
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle,
  Loader2,
  Play,
  Square,
  RotateCcw,
  Brain,
  FileText,
  Clock,
  Zap,
  TrendingUp,
  AlertCircle,
  Target,
  Shield,
} from 'lucide-react';
import { useHAQRAG, type SimilarResponse } from '@/hooks/useHAQRAG';
import { Badge } from '@/components/ui/Badge';
import type { HAQuestion } from '@/types/haq';
import { formatAsAMAContent, AMA_CONTENT_STYLES } from '@/utils/ama-formatter';

// ============================================================================
// TYPES
// ============================================================================

interface HAQRAGPanelProps {
  /** The selected HAQ to find similar responses for */
  haq: HAQuestion;
  /** Callback when user wants to use a generated draft */
  onUseDraft?: (draft: string) => void;
  /** Callback when user wants to use a template from similar response */
  onUseTemplate?: (responseText: string) => void;
  /** Callback to view full response in document viewer */
  onViewFull?: (response: SimilarResponse) => void;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getOutcomeColor = (outcome: string) => {
  switch (outcome) {
    case 'accepted': return 'green';
    case 'follow-up': return 'amber';
    case 'rejected': return 'red';
    default: return 'slate';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-slate-400';
};

const getScoreGradient = (score: number) => {
  if (score >= 80) return 'from-green-500 to-emerald-500';
  if (score >= 60) return 'from-blue-500 to-cyan-500';
  if (score >= 40) return 'from-amber-500 to-yellow-500';
  return 'from-slate-500 to-gray-500';
};

const getConfidenceLabel = (score: number) => {
  if (score >= 80) return { label: 'High Match', icon: Shield };
  if (score >= 60) return { label: 'Good Match', icon: Target };
  if (score >= 40) return { label: 'Partial Match', icon: TrendingUp };
  return { label: 'Low Match', icon: AlertCircle };
};

// Highlight [DATA NEEDED] placeholders in generated content
const highlightPlaceholders = (text: string) => {
  const parts = text.split(/(\[DATA NEEDED[^\]]*\]|\[.*?NEEDED\]|\[INSERT.*?\]|\[TBD.*?\])/gi);
  return parts.map((part, i) => {
    if (part.match(/\[DATA NEEDED[^\]]*\]|\[.*?NEEDED\]|\[INSERT.*?\]|\[TBD.*?\]/i)) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 text-xs font-mono"
        >
          <AlertCircle className="w-3 h-3" />
          {part}
        </span>
      );
    }
    return part;
  });
};

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

function ConfidenceIndicator({ score }: { score: number }) {
  const { label, icon: Icon } = getConfidenceLabel(score);
  const gradient = getScoreGradient(score);
  
  return (
    <div className="flex items-center gap-2">
      {/* Confidence bar */}
      <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${getScoreColor(score)}`}>
        {score}%
      </span>
    </div>
  );
}

// ============================================================================
// RAG QUALITY SUMMARY
// ============================================================================

function RAGQualitySummary({ 
  responses, 
  isSearching 
}: { 
  responses: SimilarResponse[]; 
  isSearching: boolean;
}) {
  const avgScore = responses.length > 0 
    ? Math.round(responses.reduce((sum, r) => sum + r.score, 0) / responses.length)
    : 0;
  
  const highQualityCount = responses.filter(r => r.score >= 70).length;
  const acceptedCount = responses.filter(r => r.outcome === 'accepted').length;
  
  if (isSearching || responses.length === 0) return null;
  
  return (
    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 border border-accent-purple/20 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-accent-purple/20">
          <Brain className="w-4 h-4 text-accent-purple" />
        </div>
        <div>
          <div className="text-xs text-text-muted">RAG Quality</div>
          <div className={`text-sm font-semibold ${getScoreColor(avgScore)}`}>
            {avgScore >= 70 ? 'Excellent' : avgScore >= 50 ? 'Good' : 'Fair'}
          </div>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border" />
      
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-text-muted">High-quality:</span>
          <span className="ml-1 text-accent-green font-medium">{highQualityCount}</span>
        </div>
        <div>
          <span className="text-text-muted">Accepted:</span>
          <span className="ml-1 text-accent-blue font-medium">{acceptedCount}</span>
        </div>
        <div>
          <span className="text-text-muted">Avg Score:</span>
          <span className={`ml-1 font-medium ${getScoreColor(avgScore)}`}>{avgScore}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SIMILAR RESPONSE CARD
// ============================================================================

function SimilarResponseCard({
  response,
  isExpanded,
  onToggle,
  onUseTemplate,
  onViewFull,
}: {
  response: SimilarResponse;
  isExpanded: boolean;
  onToggle: () => void;
  onUseTemplate?: (text: string) => void;
  onViewFull?: (response: SimilarResponse) => void;
}) {
  const { label: confidenceLabel, icon: ConfidenceIcon } = getConfidenceLabel(response.score);
  
  return (
    <div className={`bg-surface-card border rounded-lg overflow-hidden transition-all ${
      response.score >= 70 
        ? 'border-accent-green/30 shadow-sm shadow-accent-green/10' 
        : 'border-border'
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 min-w-0">
            {/* Score and confidence row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <ConfidenceIndicator score={response.score} />
                <Badge color={getOutcomeColor(response.outcome)} size="xs">
                  {response.outcome}
                </Badge>
              </div>
              {response.score >= 70 && (
                <span className="text-xs text-accent-green flex items-center gap-1">
                  <ConfidenceIcon className="w-3 h-3" />
                  {confidenceLabel}
                </span>
              )}
            </div>
            
            <p className="text-sm text-text-secondary line-clamp-2">
              {response.questionText}
            </p>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
              <span className="px-1.5 py-0.5 bg-surface rounded">{response.discipline}</span>
              <span>•</span>
              <span>{response.applicationNumber}</span>
              <span>•</span>
              <span>{response.productName}</span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-surface/30">
          {/* Matched Terms */}
          {response.matchedTerms.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Matched terms:
              </div>
              <div className="flex flex-wrap gap-1">
                {response.matchedTerms.map((term, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-accent-blue/20 text-accent-blue rounded"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Response Preview */}
          {response.responseText && (
            <div className="bg-surface rounded-lg p-3 mb-3">
              <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-accent-green" />
                Accepted Response:
              </div>
              <p className="text-sm text-text-secondary line-clamp-4">
                {response.responseText}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {onUseTemplate && response.responseText && (
              <button
                onClick={() => onUseTemplate(response.responseText!)}
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Use as template
              </button>
            )}
            {onViewFull && (
              <button
                onClick={() => onViewFull(response)}
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View full
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HAQRAGPanel({
  haq,
  onUseDraft,
  onUseTemplate,
  onViewFull,
  compact = false,
}: HAQRAGPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    state,
    metrics,
    findSimilar,
    generateDraft,
    cancel,
    reset,
    isSearching,
    isStreaming,
    isComplete,
    isError,
    isIdle,
  } = useHAQRAG({
    onComplete: (draft) => {
      setShowDraft(true);
    },
  });

  // Count placeholders in generated draft
  const placeholderCount = useMemo(() => {
    if (!state.generatedDraft) return 0;
    const matches = state.generatedDraft.match(/\[DATA NEEDED[^\]]*\]|\[.*?NEEDED\]|\[INSERT.*?\]|\[TBD.*?\]/gi);
    return matches ? matches.length : 0;
  }, [state.generatedDraft]);

  // Auto-search when HAQ changes
  useEffect(() => {
    if (haq?.questionText) {
      findSimilar({
        questionText: haq.questionText,
        discipline: haq.discipline,
        ctdSection: haq.ctdSection,
      });
    }
  }, [haq?.id]); // Only re-run when HAQ ID changes

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.generatedDraft, isStreaming]);

  const handleGenerateDraft = () => {
    setShowDraft(true);
    generateDraft({
      questionText: haq.questionText,
      discipline: haq.discipline,
      ctdSection: haq.ctdSection,
      source: haq.source,
      productName: haq.productName,
    });
  };

  const handleUseDraft = () => {
    if (onUseDraft && state.generatedDraft) {
      onUseDraft(state.generatedDraft);
    }
  };

  const handleReset = () => {
    reset();
    setShowDraft(false);
    // Re-search after reset
    findSimilar({
      questionText: haq.questionText,
      discipline: haq.discipline,
      ctdSection: haq.ctdSection,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-blue/20">
            <Brain className="w-4 h-4 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">RAG Intelligence</h3>
            {!compact && state.similarResponses.length > 0 && (
              <p className="text-xs text-text-muted">
                {state.similarResponses.filter(r => r.score >= 70).length} high-confidence matches
              </p>
            )}
          </div>
        </div>
        
        {!showDraft ? (
          <button
            onClick={handleGenerateDraft}
            disabled={isSearching || state.similarResponses.length === 0}
            className="px-3 py-1.5 bg-gradient-to-r from-accent-purple to-accent-blue hover:opacity-90 disabled:bg-surface-card disabled:text-text-muted disabled:from-surface-card disabled:to-surface-card text-white text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-accent-purple/20 disabled:shadow-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Draft
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {(isStreaming || isSearching) && (
              <button
                onClick={cancel}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg flex items-center gap-1.5"
              >
                <Square className="w-3 h-3" />
                Cancel
              </button>
            )}
            {(isComplete || isError) && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-surface-card hover:bg-surface text-text-secondary text-xs rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* RAG Quality Summary */}
      {!compact && (
        <RAGQualitySummary responses={state.similarResponses} isSearching={isSearching} />
      )}

      {/* Status */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {isSearching && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-accent-blue" />
            <span>Searching historical responses...</span>
          </>
        )}
        {isStreaming && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-accent-purple" />
            <span>Generating draft... ({metrics.wordCount} words)</span>
          </>
        )}
        {isComplete && !showDraft && (
          <>
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span>{state.similarResponses.length} similar responses found</span>
          </>
        )}
        {isComplete && showDraft && (
          <>
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span>Draft ready • {metrics.wordCount} words • {(metrics.totalTimeMs / 1000).toFixed(1)}s</span>
            {placeholderCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''} to fill
              </span>
            )}
          </>
        )}
        {isError && (
          <span className="text-red-400">{state.error}</span>
        )}
      </div>

      {/* Generated Draft */}
      {showDraft && (
        <div className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-accent-purple/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              AI-Generated Draft
              {placeholderCount > 0 && (
                <span className="text-xs text-amber-400">
                  ({placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            {isComplete && state.generatedDraft && (
              <button
                onClick={handleUseDraft}
                className="px-3 py-1 bg-accent-purple text-white text-xs rounded flex items-center gap-1.5"
              >
                <CheckCircle className="w-3 h-3" />
                Use Draft
              </button>
            )}
          </div>
          
          <div
            ref={contentRef}
            className="p-4 max-h-64 overflow-auto leading-relaxed bg-white rounded"
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              fontSize: '11pt',
              lineHeight: '1.5',
              color: '#1a1a1a',
            }}
          >
            {state.generatedDraft ? (
              <div style={{ textAlign: 'justify' }}>
                {highlightPlaceholders(state.generatedDraft)}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-accent-purple ml-0.5 animate-pulse" />
                )}
              </div>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synthesizing response from historical patterns...
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Similar Responses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">
            Similar Historical Responses
          </span>
          {state.similarResponses.length > 0 && (
            <Badge color="blue" size="xs">
              {state.similarResponses.length}
            </Badge>
          )}
        </div>

        {state.similarResponses.length > 0 ? (
          <div className="space-y-2">
            {state.similarResponses.map((similar) => (
              <SimilarResponseCard
                key={similar.id}
                response={similar}
                isExpanded={expandedId === similar.id}
                onToggle={() => setExpandedId(expandedId === similar.id ? null : similar.id)}
                onUseTemplate={onUseTemplate}
                onViewFull={onViewFull}
              />
            ))}
          </div>
        ) : isSearching ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent-blue mx-auto mb-2" />
            <p className="text-sm text-text-muted">Searching response library...</p>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-text-muted">
            No similar historical responses found
          </div>
        )}
      </div>

      {/* Metrics Footer */}
      {(isComplete || isStreaming) && metrics.searchTimeMs > 0 && (
        <div className="pt-3 border-t border-border flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Search: {metrics.searchTimeMs}ms
          </div>
          {metrics.similarCount > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {metrics.similarCount} matches
            </div>
          )}
          {showDraft && metrics.totalTimeMs > 0 && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Total: {(metrics.totalTimeMs / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HAQRAGPanel;
