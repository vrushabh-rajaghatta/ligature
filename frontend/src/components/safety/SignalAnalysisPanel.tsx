
import { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  RotateCcw,
  Square,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useSignalAnalysis, type SignalAnalysisRequest, type SimilarSignalMetadata } from '@/hooks/useSignalAnalysis';
import type { SafetySignal } from '@/data/safety-data';

// ============================================================================
// TYPES
// ============================================================================

interface SignalAnalysisPanelProps {
  /** The safety signal to analyze */
  signal: SafetySignal;
  /** Optional case data to include in analysis */
  recentCases?: Array<{
    caseNumber: string;
    outcome: string;
    causality: string;
    timeToOnset: string;
  }>;
  /** Optional callback when analysis completes */
  onComplete?: (analysis: string) => void;
}

// ============================================================================
// SIMILAR SIGNAL CARD
// ============================================================================

function SimilarSignalCard({
  signal,
  isExpanded,
  onToggle,
}: {
  signal: SimilarSignalMetadata;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">
                {signal.drugName}
              </span>
              {signal.labelChange && (
                <Badge color="amber" size="xs">Label Change</Badge>
              )}
            </div>
            <div className="text-xs text-text-muted truncate">
              {signal.reactionTerm}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border bg-surface/30 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-text-muted">Class:</span>
              <span className="text-text-secondary ml-1">{signal.drugClass}</span>
            </div>
            <div>
              <span className="text-text-muted">Outcome:</span>
              <span className="text-text-secondary ml-1">{signal.outcome}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SignalAnalysisPanel({
  signal,
  recentCases,
  onComplete,
}: SignalAnalysisPanelProps) {
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    state,
    metrics,
    analyze,
    cancel,
    reset,
    isAnalyzing,
    isStreaming,
    isComplete,
    isError,
    isIdle,
  } = useSignalAnalysis({
    onComplete: (analysis) => {
      onComplete?.(analysis);
    },
  });

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.analysis, isStreaming]);

  const handleAnalyze = () => {
    setShowAnalysis(true);
    
    // Extract reaction term from signal name (typically "Drug - Reaction" format)
    const signalParts = signal.signal.split(' - ');
    const reactionTerm = signalParts.length > 1 ? signalParts[1] : signal.signal;
    
    const signalAny = signal as unknown as Record<string, unknown>;
    
    const request: SignalAnalysisRequest = {
      signalId: signal.id,
      signalName: signal.signal,
      drugName: signal.product,
      drugClass: signalAny.drugClass as string | undefined,
      reactionTerm,
      soc: signalAny.soc as string | undefined,
      caseCount: signal.caseCount,
      prr: signal.prrValue,
      ror: signal.rorValue,
      ic025: signal.ic025,
      seriousCases: signalAny.seriousCases as number | undefined,
      fatalCases: signalAny.fatalCases as number | undefined,
      timeToOnsetRange: signalAny.timeToOnsetRange as string | undefined,
      dechallengePositiveRate: signalAny.dechallengePositiveRate as number | undefined,
      labeledEvent: signal.labeledEvent,
      classEffect: signal.classEffect,
      recentCases,
    };

    analyze(request);
  };

  const handleReset = () => {
    reset();
    setShowAnalysis(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Action Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-semibold text-text-primary">AI Signal Intelligence</h3>
        </div>

        {!showAnalysis ? (
          <button
            onClick={handleAnalyze}
            className="px-3 py-1.5 bg-accent-purple hover:bg-accent-purple/80 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze Signal
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {isAnalyzing && (
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

      {/* Status Line */}
      {showAnalysis && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {state.status === 'searching' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-accent-blue" />
              <span>Finding similar regulatory precedents...</span>
            </>
          )}
          {isStreaming && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-accent-purple" />
              <span>Generating analysis... ({metrics.wordCount} words)</span>
            </>
          )}
          {isComplete && (
            <>
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>
                Analysis complete • {metrics.wordCount} words • {(metrics.totalTimeMs / 1000).toFixed(1)}s
              </span>
            </>
          )}
          {isError && (
            <>
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-400">{state.error}</span>
            </>
          )}
        </div>
      )}

      {/* Similar Signals (from RAG) */}
      {state.similarSignals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted">
              Regulatory Precedents ({state.similarSignals.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {state.similarSignals.map((similar) => (
              <SimilarSignalCard
                key={similar.id}
                signal={similar}
                isExpanded={expandedSignalId === similar.id}
                onToggle={() => setExpandedSignalId(
                  expandedSignalId === similar.id ? null : similar.id
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis Output */}
      {showAnalysis && (state.analysis || isStreaming) && (
        <div className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-accent-purple/20 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-purple" />
            <span className="text-sm font-medium text-accent-purple">
              Signal Assessment
            </span>
          </div>
          
          <div
            ref={contentRef}
            className="p-4 max-h-96 overflow-auto text-sm text-text-secondary leading-relaxed prose prose-invert prose-sm max-w-none"
          >
            {state.analysis ? (
              <div className="space-y-3">
                {/* Render markdown-ish content */}
                {state.analysis.split('\n').map((line, idx) => {
                  // Headers
                  if (line.startsWith('## ')) {
                    return (
                      <h3 key={idx} className="text-base font-semibold text-text-primary mt-4 mb-2 flex items-center gap-2">
                        {line.startsWith('## Signal Assessment') && <Shield className="w-4 h-4 text-accent-purple" />}
                        {line.startsWith('## Recommended') && <Sparkles className="w-4 h-4 text-accent-green" />}
                        {line.replace('## ', '')}
                      </h3>
                    );
                  }
                  // Bold text
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={idx} className="font-semibold text-text-primary">
                        {line.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  // Bullet points
                  if (line.startsWith('- ')) {
                    return (
                      <li key={idx} className="ml-4 text-text-secondary">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  // Regular text
                  if (line.trim()) {
                    return <p key={idx}>{line}</p>;
                  }
                  return null;
                })}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-accent-purple ml-0.5 animate-pulse" />
                )}
              </div>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing signal against regulatory precedents...
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Idle State - Not yet analyzed */}
      {isIdle && !showAnalysis && (
        <div className="py-6 text-center border border-dashed border-border rounded-lg">
          <Brain className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted mb-1">
            AI-Powered Signal Assessment
          </p>
          <p className="text-xs text-text-muted">
            Analyzes disproportionality metrics against historical regulatory precedents
          </p>
        </div>
      )}

      {/* Metrics Footer */}
      {isComplete && metrics.totalTimeMs > 0 && (
        <div className="pt-3 border-t border-border flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Search: {metrics.searchTimeMs}ms
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {metrics.wordCount} words
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Total: {(metrics.totalTimeMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}

export default SignalAnalysisPanel;
