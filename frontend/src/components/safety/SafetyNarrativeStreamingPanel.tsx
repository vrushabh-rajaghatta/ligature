

/**
 * SafetyNarrativeStreamingPanel - v0.27.68
 * 
 * Rich visual feedback during AI Module 2.7.4 narrative generation:
 * - Shows similar safety signals and cases found (RAG phase)
 * - Typewriter-style streaming narrative with cursor
 * - Real-time word/token count ticking up
 * - Tokens per second and elapsed time
 * - Compliance score appearing at completion
 * - Visual progress through search → generation → complete
 * 
 * "Watch Claude draft your Summary of Clinical Safety in real-time"
 */

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Copy, Check, StopCircle,
  Clock, Zap, FileText, AlertCircle, 
  CheckCircle2, Brain, Loader2, Search,
  Shield, History, ArrowRight, ThumbsUp,
  Activity, AlertTriangle, HeartPulse, Beaker,
  ClipboardList, Users, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useSafetyNarrativeRAG,
  type NarrativeRequest,
  type SimilarSignal,
  type SimilarCase,
  type NarrativeStatus
} from '@/hooks/useSafetyNarrativeRAG';
import { formatAsAMAContent, AMA_CONTENT_STYLES, StreamingCursor } from '@/utils/ama-formatter';

// =============================================================================
// TYPES
// =============================================================================

interface SafetyNarrativeStreamingPanelProps {
  /** Product name for the narrative */
  productName: string;
  /** Optional: specific signal to focus on */
  signalName?: string;
  signalId?: string;
  /** Indication being studied */
  indication?: string;
  /** Number of subjects exposed */
  subjectsExposed?: number;
  /** Callback when narrative is accepted */
  onAccept?: (narrative: string, complianceScore: number) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether to show in expanded/modal mode */
  expanded?: boolean;
}

// =============================================================================
// COMPLIANCE SCORE CALCULATION
// =============================================================================

function calculateComplianceScore(
  narrative: string,
  signals: SimilarSignal[],
  cases: SimilarCase[]
): number {
  let score = 65; // Base score
  
  // Word count scoring (Module 2.7.4 should be comprehensive)
  const wordCount = narrative.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 500) score += 3;
  if (wordCount >= 1000) score += 4;
  if (wordCount >= 2000) score += 3;
  if (wordCount > 5000) score -= 3; // Too verbose
  
  // Structure scoring - CTD sections
  const ctdSections = [
    '2.7.4.1', '2.7.4.2', '2.7.4.3', '2.7.4.4', '2.7.4.5', '2.7.4.6'
  ];
  const sectionCount = ctdSections.filter(s => narrative.includes(s)).length;
  score += Math.min(sectionCount * 2, 10);
  
  // Required content presence
  const requiredTerms = [
    'adverse event', 'serious adverse', 'death', 'laboratory',
    'exposure', 'safety profile', 'benefit-risk'
  ];
  const termCount = requiredTerms.filter(term => 
    narrative.toLowerCase().includes(term)
  ).length;
  score += Math.min(termCount * 2, 12);
  
  // Quantitative data presence
  const hasPercentages = /\d+(\.\d+)?%/.test(narrative);
  const hasNumbers = /\d{2,}/.test(narrative);
  const hasRanges = /range:?\s*\d+/.test(narrative.toLowerCase());
  if (hasPercentages) score += 3;
  if (hasNumbers) score += 2;
  if (hasRanges) score += 2;
  
  // Historical pattern alignment
  const confirmedSignals = signals.filter(s => s.outcome === 'closed-confirmed');
  if (confirmedSignals.length > 0) {
    score += 4; // Bonus for having confirmed signal patterns
  }
  
  // Case data coverage
  const seriousCases = cases.filter(c => c.seriousness === 'serious');
  if (seriousCases.length > 0) {
    score += 3; // Covered serious cases
  }
  
  // High match scores bonus
  const highMatchSignals = signals.filter(s => s.score >= 80);
  if (highMatchSignals.length > 0) {
    score += 3;
  }
  
  return Math.min(score, 98); // Cap at 98
}

// =============================================================================
// =============================================================================
// PHASE INDICATOR
// =============================================================================

type Phase = 'searching' | 'generating' | 'complete' | 'error';

function PhaseIndicator({ 
  phase, 
  signalCount, 
  caseCount 
}: { 
  phase: Phase; 
  signalCount: number; 
  caseCount: number;
}) {
  const phases = [
    { id: 'searching', label: 'Finding Similar', icon: Search },
    { id: 'generating', label: 'Generating Narrative', icon: Sparkles },
    { id: 'complete', label: 'Ready', icon: CheckCircle2 },
  ];
  
  const currentIndex = phase === 'error' ? -1 : phases.findIndex(p => p.id === phase);
  
  return (
    <div className="flex items-center gap-2">
      {phases.map((p, idx) => {
        const Icon = p.icon;
        const isActive = p.id === phase;
        const isPast = idx < currentIndex;
        
        return (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              isActive ? 'bg-accent-red/20 text-accent-red' :
              isPast ? 'bg-green-500/20 text-green-400' :
              'bg-surface-card text-text-muted'
            }`}>
              {isActive && phase !== 'complete' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPast || phase === 'complete' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="text-xs font-medium">{p.label}</span>
              {p.id === 'searching' && (signalCount > 0 || caseCount > 0) && (
                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs ml-1">
                  {signalCount + caseCount}
                </Badge>
              )}
            </div>
            {idx < phases.length - 1 && (
              <ArrowRight className={`w-3 h-3 mx-1 ${
                idx < currentIndex ? 'text-green-400' : 'text-text-muted'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// METRICS DISPLAY
// =============================================================================

interface MetricsDisplayProps {
  wordCount: number;
  tokenCount: number;
  searchTimeMs: number;
  totalTimeMs: number;
  signalCount: number;
  caseCount: number;
  status: NarrativeStatus;
  complianceScore?: number;
}

function MetricsDisplay({ 
  wordCount, 
  tokenCount, 
  searchTimeMs,
  totalTimeMs,
  signalCount,
  caseCount,
  status,
  complianceScore 
}: MetricsDisplayProps) {
  const isGenerating = status === 'streaming';
  const tokensPerSecond = totalTimeMs > 0 ? (tokenCount / totalTimeMs) * 1000 : 0;
  
  return (
    <div className="flex items-center gap-4 text-xs">
      {/* Similar Found */}
      <div className="flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-amber-400 font-medium">{signalCount}</span>
        <span className="text-text-muted">signals</span>
        <span className="text-text-muted">•</span>
        <span className="text-blue-400 font-medium">{caseCount}</span>
        <span className="text-text-muted">cases</span>
      </div>
      
      {/* Word Count */}
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-text-muted" />
        <span className={`font-mono ${isGenerating ? 'text-accent-red' : 'text-text-secondary'}`}>
          {wordCount.toLocaleString()}
        </span>
        <span className="text-text-muted">words</span>
      </div>
      
      {/* Speed */}
      {isGenerating && tokensPerSecond > 0 && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent-amber" />
          <span className="font-mono text-accent-amber">
            {tokensPerSecond.toFixed(0)}
          </span>
          <span className="text-text-muted">tok/s</span>
        </div>
      )}
      
      {/* Elapsed Time */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-text-muted" />
        <span className="font-mono text-text-secondary">
          {(totalTimeMs / 1000).toFixed(1)}s
        </span>
      </div>
      
      {/* Compliance Score (when complete) */}
      {complianceScore !== undefined && status === 'complete' && (
        <div className="flex items-center gap-1.5 ml-auto">
          <Shield className={`w-3.5 h-3.5 ${
            complianceScore >= 85 ? 'text-accent-green' :
            complianceScore >= 70 ? 'text-accent-amber' :
            'text-accent-red'
          }`} />
          <span className={`font-mono font-semibold ${
            complianceScore >= 85 ? 'text-accent-green' :
            complianceScore >= 70 ? 'text-accent-amber' :
            'text-accent-red'
          }`}>
            {complianceScore}%
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SIMILAR SIGNALS PREVIEW
// =============================================================================

function SimilarSignalPreview({ signals }: { signals: SimilarSignal[] }) {
  if (signals.length === 0) return null;
  
  const outcomeColors: Record<string, string> = {
    'closed-confirmed': 'bg-accent-red/20 text-accent-red',
    'closed-refuted': 'bg-gray-500/20 text-gray-400',
    'ongoing': 'bg-amber-500/20 text-amber-400',
  };
  
  const outcomeLabels: Record<string, string> = {
    'closed-confirmed': 'confirmed',
    'closed-refuted': 'refuted',
    'ongoing': 'ongoing',
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Similar Safety Signals</span>
      </div>
      <div className="space-y-1.5">
        {signals.slice(0, 3).map(signal => (
          <div 
            key={signal.id}
            className="flex items-center gap-2 text-xs bg-surface-card/50 px-2 py-1.5 rounded"
          >
            <span className={`font-mono font-semibold ${
              signal.score >= 80 ? 'text-accent-green' :
              signal.score >= 60 ? 'text-accent-amber' :
              'text-text-muted'
            }`}>
              {signal.score}%
            </span>
            <Badge 
              size="xs"
              className={`${outcomeColors[signal.outcome]} border-0 text-[10px]`}
            >
              {outcomeLabels[signal.outcome]}
            </Badge>
            <span className="text-text-primary font-medium truncate">
              {signal.signalName}
            </span>
            <span className="text-text-muted">•</span>
            <span className="text-text-secondary truncate">{signal.productName}</span>
            <span className="text-text-muted ml-auto">{signal.caseCount} cases</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SIMILAR CASES PREVIEW
// =============================================================================

function SimilarCasePreview({ cases }: { cases: SimilarCase[] }) {
  if (cases.length === 0) return null;
  
  const causalityColors: Record<string, string> = {
    'certain': 'bg-accent-red/20 text-accent-red',
    'probable': 'bg-amber-500/20 text-amber-400',
    'possible': 'bg-blue-500/20 text-blue-400',
    'unlikely': 'bg-gray-500/20 text-gray-400',
    'unassessable': 'bg-gray-500/20 text-gray-400',
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <ClipboardList className="w-3.5 h-3.5" />
        <span>Similar ICSR Cases</span>
      </div>
      <div className="space-y-1.5">
        {cases.slice(0, 3).map(caseItem => (
          <div 
            key={caseItem.id}
            className="flex items-center gap-2 text-xs bg-surface-card/50 px-2 py-1.5 rounded"
          >
            <span className={`font-mono font-semibold ${
              caseItem.score >= 80 ? 'text-accent-green' :
              caseItem.score >= 60 ? 'text-accent-amber' :
              'text-text-muted'
            }`}>
              {caseItem.score}%
            </span>
            <Badge 
              size="xs"
              className={`${causalityColors[caseItem.causality]} border-0 text-[10px]`}
            >
              {caseItem.causality}
            </Badge>
            {caseItem.seriousness === 'serious' && (
              <Badge size="xs" className="bg-accent-red/20 text-accent-red border-0 text-[10px]">
                serious
              </Badge>
            )}
            <span className="text-text-primary font-medium truncate">
              {caseItem.event}
            </span>
            <span className="text-text-muted ml-auto font-mono">{caseItem.caseNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SafetyNarrativeStreamingPanel({
  productName,
  signalName,
  signalId,
  indication,
  subjectsExposed,
  onAccept,
  onClose,
  expanded = false,
}: SafetyNarrativeStreamingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | undefined>();
  const [showCursor, setShowCursor] = useState(true);
  
  const {
    state,
    metrics,
    generateNarrative,
    cancel,
    reset,
  } = useSafetyNarrativeRAG({
    onComplete: (narrative, signals, cases) => {
      const score = calculateComplianceScore(narrative, signals, cases);
      setComplianceScore(score);
    },
  });

  // Auto-start generation on mount
  useEffect(() => {
    generateNarrative({
      productName,
      signalName,
      signalId,
      indication,
      subjectsExposed,
      ctdSection: '2.7.4',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cursor blink effect during streaming
  useEffect(() => {
    if (state.status === 'streaming') {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
    setShowCursor(true);
  }, [state.status]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && state.status === 'streaming') {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.generatedNarrative, state.status]);

  const handleCopy = async () => {
    if (state.generatedNarrative) {
      await navigator.clipboard.writeText(state.generatedNarrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAccept = () => {
    if (state.generatedNarrative && complianceScore !== undefined && onAccept) {
      onAccept(state.generatedNarrative, complianceScore);
    }
  };

  const getPhase = (): Phase => {
    if (state.status === 'error') return 'error';
    if (state.status === 'complete') return 'complete';
    if (state.status === 'streaming') return 'generating';
    return 'searching';
  };

  const isSearching = state.status === 'searching' || state.status === 'idle';
  const isStreaming = state.status === 'streaming';
  const isComplete = state.status === 'complete';
  const isError = state.status === 'error' || state.status === 'cancelled';
  
  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden flex flex-col ${
      expanded ? 'w-full h-full shadow-2xl' : 'max-h-[700px]'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isStreaming ? 'bg-accent-red/20' : 
            isComplete ? 'bg-accent-green/20' : 
            isSearching ? 'bg-blue-500/20' :
            isError ? 'bg-accent-red/20' : 'bg-surface-card'
          }`}>
            {isStreaming ? (
              <Sparkles className="w-5 h-5 text-accent-red animate-pulse" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
            ) : isSearching ? (
              <Search className="w-5 h-5 text-blue-400 animate-pulse" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-accent-red" />
            ) : (
              <Brain className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Module 2.7.4 Generation
              </h3>
              <Badge className="bg-accent-red/20 text-accent-red border-0 text-xs">
                Clinical Safety
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5 max-w-lg truncate">
              {productName} {indication ? `• ${indication}` : ''} {subjectsExposed ? `• ${subjectsExposed.toLocaleString()} subjects` : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(isSearching || isStreaming) && (
            <Button variant="ghost" size="sm" onClick={cancel}>
              <StopCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          {isComplete && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-accent-green" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Phase Indicator */}
      <div className="px-4 py-2 border-b border-border bg-surface-card/50">
        <PhaseIndicator 
          phase={getPhase()} 
          signalCount={state.similarSignals.length}
          caseCount={state.similarCases.length}
        />
      </div>
      
      {/* Metrics Bar */}
      <div className="px-4 py-2 border-b border-border bg-surface-card/30">
        <MetricsDisplay
          wordCount={metrics.wordCount}
          tokenCount={metrics.tokenCount}
          searchTimeMs={metrics.searchTimeMs}
          totalTimeMs={metrics.totalTimeMs}
          signalCount={metrics.signalCount}
          caseCount={metrics.caseCount}
          status={state.status}
          complianceScore={complianceScore}
        />
      </div>
      
      {/* Signal/Case Context */}
      {signalName && (
        <div className="px-4 py-3 border-b border-border bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-amber-400">Focus Signal:</span>
              <p className="text-sm text-text-secondary mt-1">
                {signalName}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Similar Signals (shown during/after search) */}
      {state.similarSignals.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <SimilarSignalPreview signals={state.similarSignals} />
        </div>
      )}
      
      {/* Similar Cases (shown during/after search) */}
      {state.similarCases.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <SimilarCasePreview cases={state.similarCases} />
        </div>
      )}
      
      {/* Content Area - AMA regulatory document styling */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6 bg-white min-h-[200px]"
        style={AMA_CONTENT_STYLES}
      >
        {isSearching && !state.generatedNarrative && (
          <div className="flex items-center gap-3 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span>Searching signals and cases for patterns...</span>
          </div>
        )}
        
        {(isStreaming || isComplete) && state.generatedNarrative && (
          <>
            <div 
              className="regulatory-content"
              style={{ textAlign: 'justify' }}
              dangerouslySetInnerHTML={{ __html: formatAsAMAContent(state.generatedNarrative) }}
            />
            {isStreaming && showCursor && <StreamingCursor />}
          </>
        )}
        
        {isStreaming && !state.generatedNarrative && (
          <div className="flex items-center gap-3 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <Loader2 className="w-5 h-5 animate-spin text-accent-red" />
            <span>Synthesizing narrative from {metrics.signalCount || 'available'} signals and {metrics.caseCount || 'available'} cases...</span>
          </div>
        )}

        {isComplete && !state.generatedNarrative && (
          <div className="flex flex-col items-center gap-4 py-8" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="text-center">
              <p className="text-text-secondary font-medium">No narrative was generated</p>
              <p className="text-text-muted text-sm mt-1">The AI completed without producing output. Please try again.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              reset();
              generateNarrative({ productName, signalName, signalId, indication, subjectsExposed, ctdSection: '2.7.4' });
            }}>
              <Sparkles className="w-4 h-4 mr-1" />
              Try Again
            </Button>
          </div>
        )}
        
        {isError && (
          <div className="flex flex-col items-center gap-4 py-8" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <AlertCircle className="w-8 h-8 text-accent-red" />
            <div className="text-center">
              <p className="text-text-secondary font-medium">Generation failed</p>
              <p className="text-text-muted text-sm mt-1 max-w-md">
                {state.error || 'An unexpected error occurred during narrative generation.'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              reset();
              generateNarrative({ productName, signalName, signalId, indication, subjectsExposed, ctdSection: '2.7.4' });
            }}>
              <Sparkles className="w-4 h-4 mr-1" />
              Try Again
            </Button>
          </div>
        )}
      </div>
      
      {/* Footer - Completion Actions */}
      {isComplete && (
        <div className="px-4 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              complianceScore && complianceScore >= 85 ? 'bg-accent-green/20' :
              complianceScore && complianceScore >= 70 ? 'bg-accent-amber/20' :
              'bg-accent-red/20'
            }`}>
              <Shield className={`w-4 h-4 ${
                complianceScore && complianceScore >= 85 ? 'text-accent-green' :
                complianceScore && complianceScore >= 70 ? 'text-accent-amber' :
                'text-accent-red'
              }`} />
              <span className={`text-sm font-semibold ${
                complianceScore && complianceScore >= 85 ? 'text-accent-green' :
                complianceScore && complianceScore >= 70 ? 'text-accent-amber' :
                'text-accent-red'
              }`}>
                {complianceScore}% Compliance Score
              </span>
            </div>
            <span className="text-xs text-text-muted">
              Generated in {(metrics.totalTimeMs / 1000).toFixed(1)}s • {metrics.wordCount} words • {metrics.signalCount} signals, {metrics.caseCount} cases used
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                reset();
                generateNarrative({
                  productName,
                  signalName,
                  signalId,
                  indication,
                  subjectsExposed,
                  ctdSection: '2.7.4',
                });
              }}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button variant="primary" size="sm" onClick={handleAccept}>
              <ThumbsUp className="w-4 h-4 mr-1" />
              Accept Narrative
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SafetyNarrativeStreamingPanel;
