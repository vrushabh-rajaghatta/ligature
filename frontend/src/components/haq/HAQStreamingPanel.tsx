

/**
 * HAQStreamingPanel - v0.27.67
 * 
 * Rich visual feedback during AI HAQ response generation:
 * - Shows similar historical responses found (RAG phase)
 * - Typewriter-style streaming draft with cursor
 * - Real-time word/token count ticking up
 * - Tokens per second and elapsed time
 * - Compliance score appearing at completion
 * - Visual progress through search → generation → complete
 * 
 * "Watch Claude draft your FDA response in real-time"
 */

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Copy, Check, StopCircle,
  Clock, Zap, FileText, TrendingUp, AlertCircle, 
  CheckCircle2, Brain, Loader2, Search, MessageSquare,
  Shield, History, Target, ArrowRight, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useHAQRAG, type RAGRequest, type SimilarResponse, type RAGStatus } from '@/hooks/useHAQRAG';
import type { HAQuestion } from '@/types/haq';
import { formatAsAMAContent, AMA_CONTENT_STYLES, StreamingCursor } from '@/utils/ama-formatter';

// =============================================================================
// TYPES
// =============================================================================

interface HAQStreamingPanelProps {
  /** The HAQ being responded to */
  haq: HAQuestion;
  /** Callback when draft is accepted */
  onAccept?: (draft: string, complianceScore: number) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether to show in expanded/modal mode */
  expanded?: boolean;
}

// =============================================================================
// COMPLIANCE SCORE CALCULATION
// =============================================================================

function calculateComplianceScore(
  draft: string, 
  haq: HAQuestion, 
  similarResponses: SimilarResponse[]
): number {
  let score = 65; // Base score
  
  // Length scoring (regulatory responses should be thorough but concise)
  const wordCount = draft.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 100) score += 5;
  if (wordCount >= 200) score += 5;
  if (wordCount >= 300) score += 3;
  if (wordCount > 600) score -= 3; // Too verbose
  
  // Structure scoring
  if (draft.includes('\n\n')) score += 2; // Has paragraphs
  if (/^\d+\./m.test(draft)) score += 3; // Has numbered points
  if (/\*\*[^*]+\*\*/m.test(draft)) score += 2; // Has bold emphasis
  
  // CTD section reference
  if (haq.ctdSection && draft.toLowerCase().includes(haq.ctdSection.toLowerCase())) {
    score += 3;
  }
  
  // Discipline-specific terminology
  const disciplineTerms: Record<string, string[]> = {
    'CMC': ['specification', 'stability', 'impurity', 'batch', 'manufacturing', 'quality'],
    'Clinical': ['efficacy', 'safety', 'endpoint', 'patient', 'population', 'trial'],
    'Nonclinical': ['toxicology', 'pharmacology', 'NOAEL', 'species', 'dose'],
    'Biostatistics': ['analysis', 'statistical', 'confidence', 'p-value', 'population'],
  };
  
  const terms = disciplineTerms[haq.discipline] || [];
  const termCount = terms.filter(term => draft.toLowerCase().includes(term)).length;
  score += Math.min(termCount * 2, 8);
  
  // Historical pattern alignment (if we have accepted responses)
  const acceptedResponses = similarResponses.filter(r => r.outcome === 'accepted');
  if (acceptedResponses.length > 0) {
    score += 5; // Bonus for having historical context
  }
  
  // High match score bonus
  const highMatches = similarResponses.filter(r => r.score >= 80);
  if (highMatches.length > 0) {
    score += 3;
  }
  
  return Math.min(score, 98); // Cap at 98
}

// =============================================================================
// =============================================================================
// PHASE INDICATOR
// =============================================================================

type Phase = 'searching' | 'generating' | 'complete' | 'error';

function PhaseIndicator({ phase, similarCount }: { phase: Phase; similarCount: number }) {
  const phases = [
    { id: 'searching', label: 'Finding Similar', icon: Search },
    { id: 'generating', label: 'Drafting Response', icon: Sparkles },
    { id: 'complete', label: 'Ready', icon: CheckCircle2 },
  ];
  
  const currentIndex = phase === 'error' ? -1 : phases.findIndex(p => p.id === phase);
  
  return (
    <div className="flex items-center gap-2">
      {phases.map((p, idx) => {
        const Icon = p.icon;
        const isActive = p.id === phase;
        const isPast = idx < currentIndex;
        const isFuture = idx > currentIndex;
        
        return (
          <div key={p.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              isActive ? 'bg-accent-purple/20 text-accent-purple' :
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
              {p.id === 'searching' && similarCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs ml-1">
                  {similarCount}
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
  similarCount: number;
  status: RAGStatus;
  complianceScore?: number;
}

function MetricsDisplay({ 
  wordCount, 
  tokenCount, 
  searchTimeMs,
  totalTimeMs,
  similarCount,
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
        <span className="text-blue-400 font-medium">{similarCount}</span>
        <span className="text-text-muted">similar</span>
      </div>
      
      {/* Word Count */}
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-text-muted" />
        <span className={`font-mono ${isGenerating ? 'text-accent-purple' : 'text-text-secondary'}`}>
          {wordCount.toLocaleString()}
        </span>
        <span className="text-text-muted">words</span>
      </div>
      
      {/* Speed */}
      {isGenerating && tokensPerSecond > 0 && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent-amber" />
          <span className="font-mono text-accent-amber">
            {tokensPerSecond.toFixed(1)}
          </span>
          <span className="text-text-muted">tok/s</span>
        </div>
      )}
      
      {/* Elapsed Time */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-text-muted" />
        <span className={`font-mono ${isGenerating ? 'text-accent-purple animate-pulse' : 'text-text-secondary'}`}>
          {(totalTimeMs / 1000).toFixed(1)}s
        </span>
      </div>
      
      {/* Compliance Score (shown on complete) */}
      {status === 'complete' && complianceScore !== undefined && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
          <Shield className="w-3.5 h-3.5 text-accent-green" />
          <span className="font-mono text-accent-green font-semibold">
            {complianceScore}%
          </span>
          <span className="text-text-muted">compliance</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SIMILAR RESPONSE PREVIEW
// =============================================================================

function SimilarResponsePreview({ responses }: { responses: SimilarResponse[] }) {
  if (responses.length === 0) return null;
  
  const topResponses = responses.slice(0, 3);
  
  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-blue-400">
          Historical Pattern Matches
        </span>
      </div>
      <div className="space-y-1.5">
        {topResponses.map(r => (
          <div key={r.id} className="flex items-center gap-2 text-xs">
            <span className={`font-mono ${
              r.score >= 80 ? 'text-green-400' :
              r.score >= 60 ? 'text-blue-400' :
              'text-amber-400'
            }`}>
              {r.score}%
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              r.outcome === 'accepted' ? 'bg-green-500/20 text-green-400' :
              r.outcome === 'follow-up' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {r.outcome}
            </span>
            <span className="text-text-muted truncate flex-1">
              {r.productName} • {r.discipline}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function HAQStreamingPanel({
  haq,
  onAccept,
  onClose,
  expanded = false,
}: HAQStreamingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | undefined>();
  const [showCursor, setShowCursor] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const generateCalledRef = useRef(false);
  
  // Use the HAQ RAG hook
  const {
    state,
    metrics,
    generateDraft,
    cancel,
  } = useHAQRAG({
    onToken: (token, fullContent) => {
      // Auto-scroll on each token
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    },
    onComplete: (draft, similar) => {
      const score = calculateComplianceScore(draft, haq, similar);
      setComplianceScore(score);
      setShowCursor(false);
    },
    onError: (error) => {
      setShowCursor(false);
      console.error('[HAQStreamingPanel] Generation error:', error.message);
    },
  });
  
  // Determine phase
  const getPhase = (): Phase => {
    if (state.status === 'searching') return 'searching';
    if (state.status === 'streaming') return 'generating';
    if (state.status === 'complete') return 'complete';
    if (state.status === 'error') return 'error';
    return 'searching'; // idle/cancelled show as searching (initializing)
  };
  
  // Start generation on mount or when HAQ changes — no race condition
  useEffect(() => {
    generateCalledRef.current = false;
    setComplianceScore(undefined);
    setShowCursor(true);
    
    // generateDraft internally resets state and creates a new AbortController
    // No need to call reset() first — that caused the idle gap
    const request: RAGRequest = {
      questionText: haq.questionText,
      discipline: haq.discipline,
      ctdSection: haq.ctdSection,
      source: haq.source,
      productName: haq.productName,
    };
    
    // Use microtask to ensure React has flushed state from any prior render
    const timer = requestAnimationFrame(() => {
      if (!generateCalledRef.current) {
        generateCalledRef.current = true;
        // logger.debug('HAQStreamingPanel', Calling generateDraft for HAQ:', haq.id, 'question:', haq.questionText.substring(0, 60));
        generateDraft(request);
      } else {
        // logger.debug('HAQStreamingPanel', Skipped duplicate generateDraft call');
      }
    });
    
    return () => {
      cancelAnimationFrame(timer);
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haq.id, retryCount]); // retryCount triggers re-generation
  
  // Cursor blink effect
  useEffect(() => {
    if (state.status !== 'streaming') return;
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [state.status]);
  
  // Handle copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API failures
    }
  };
  
  // Handle accept
  const handleAccept = () => {
    if (onAccept && state.generatedDraft) {
      onAccept(state.generatedDraft, complianceScore || 0);
    }
    onClose?.();
  };

  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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
            isStreaming ? 'bg-accent-purple/20' : 
            isComplete ? 'bg-accent-green/20' : 
            isSearching ? 'bg-blue-500/20' :
            isError ? 'bg-accent-red/20' : 'bg-surface-card'
          }`}>
            {isStreaming ? (
              <Sparkles className="w-5 h-5 text-accent-purple animate-pulse" />
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
                AI Response Generation
              </h3>
              <Badge className={`border-0 text-xs ${
                haq.discipline === 'CMC' ? 'bg-teal-500/20 text-teal-400' :
                haq.discipline === 'Clinical' ? 'bg-blue-500/20 text-blue-400' :
                haq.discipline === 'Nonclinical' ? 'bg-purple-500/20 text-purple-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {haq.discipline}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5 max-w-lg truncate">
              {haq.ctdSection} • {haq.source}
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
        <PhaseIndicator phase={getPhase()} similarCount={state.similarResponses.length} />
      </div>
      
      {/* Metrics Bar */}
      <div className="px-4 py-2 border-b border-border bg-surface-card/30">
        <MetricsDisplay
          wordCount={metrics.wordCount}
          tokenCount={metrics.tokenCount}
          searchTimeMs={metrics.searchTimeMs}
          totalTimeMs={metrics.totalTimeMs}
          similarCount={metrics.similarCount}
          status={state.status}
          complianceScore={complianceScore}
        />
      </div>
      
      {/* Question Preview */}
      <div className="px-4 py-3 border-b border-border bg-amber-500/5">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-medium text-amber-400">FDA Question:</span>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {haq.questionText}
            </p>
          </div>
        </div>
      </div>
      
      {/* Similar Responses (shown during/after search) */}
      {state.similarResponses.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <SimilarResponsePreview responses={state.similarResponses} />
        </div>
      )}
      
      {/* Content Area - AMA regulatory document styling */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6 bg-white min-h-[200px]"
        style={AMA_CONTENT_STYLES}
      >
        {/* Searching / Initializing state */}
        {isSearching && !state.generatedDraft && (
          <div className="flex items-center gap-3 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span>Searching historical responses for patterns...</span>
          </div>
        )}
        
        {/* Streaming or Complete WITH content */}
        {(isStreaming || isComplete) && state.generatedDraft && (
          <>
            <div 
              className="regulatory-content"
              style={{ textAlign: 'justify' }}
              dangerouslySetInnerHTML={{ __html: formatAsAMAContent(state.generatedDraft) }}
            />
            {isStreaming && showCursor && <StreamingCursor />}
          </>
        )}
        
        {/* Streaming but no content yet (waiting for first token) */}
        {isStreaming && !state.generatedDraft && (
          <div className="flex items-center gap-3 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
            <span>Synthesizing response from {metrics.similarCount || 'historical'} patterns...</span>
          </div>
        )}

        {/* Complete but NO content (fallback - should not normally happen) */}
        {isComplete && !state.generatedDraft && (
          <div className="flex flex-col items-center gap-4 py-8" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="text-center">
              <p className="text-text-secondary font-medium">No response was generated</p>
              <p className="text-text-muted text-sm mt-1">The AI completed without producing output. This can happen if the service is temporarily unavailable.</p>
            </div>
            <button 
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
        
        {/* Error state with retry */}
        {isError && (
          <div className="flex flex-col items-center gap-4 py-8" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <AlertCircle className="w-8 h-8 text-accent-red" />
            <div className="text-center">
              <p className="text-text-secondary font-medium">Generation failed</p>
              <p className="text-text-muted text-sm mt-1 max-w-md">
                {state.error || 'An unexpected error occurred during AI response generation.'}
              </p>
            </div>
            <button 
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Try Again
            </button>
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
              Generated in {(metrics.totalTimeMs / 1000).toFixed(1)}s • {metrics.wordCount} words • {metrics.similarCount} patterns used
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRetry}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button variant="primary" size="sm" onClick={handleAccept}>
              <ThumbsUp className="w-4 h-4 mr-1" />
              Accept Draft
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

export default HAQStreamingPanel;
