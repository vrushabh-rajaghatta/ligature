

/**
 * AuthoringStreamingPanel - v0.27.66
 * 
 * Rich visual feedback during AI document generation:
 * - Typewriter-style streaming text with cursor
 * - Real-time word/token count ticking up
 * - Tokens per second and elapsed time
 * - Quality score appearing at completion
 * - Visual progress indicator
 * - Cancel/pause controls
 * 
 * "Watch Claude think in real-time"
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, X, Pause, Play, Copy, Check, StopCircle,
  Clock, Zap, FileText, TrendingUp, AlertCircle, 
  CheckCircle2, Brain, Loader2, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { 
  useSectionGeneration, 
  type GenerationContext,
  type GenerationStatus 
} from '@/hooks/useSectionGeneration';
import type { DocumentSection, DocumentType } from '@/types/authoring';
import type { SourceDocument } from '@/store/useAuthoringStore';
import { formatAsAMAContent, AMA_CONTENT_STYLES, StreamingCursor } from '@/utils/ama-formatter';

// =============================================================================
// TYPES
// =============================================================================

interface AuthoringStreamingPanelProps {
  /** Document section being generated */
  section: DocumentSection;
  /** Type of document */
  documentType: DocumentType;
  /** Generation context */
  context: GenerationContext;
  /** Source documents for citations */
  sources: SourceDocument[];
  /** Callback when generation completes */
  onComplete?: (content: string, qualityScore: number) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether to show in expanded/modal mode */
  expanded?: boolean;
}

// =============================================================================
// QUALITY SCORE CALCULATION
// =============================================================================

function calculateQualityScore(content: string, documentType: DocumentType): number {
  let score = 70; // Base score
  
  // Length scoring (regulatory docs should be thorough)
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount > 200) score += 5;
  if (wordCount > 400) score += 5;
  if (wordCount > 600) score += 3;
  
  // Structure scoring (headers, lists, paragraphs)
  if (content.includes('\n\n')) score += 3; // Has paragraphs
  if (/^\d+\.\s/m.test(content)) score += 2; // Has numbered items
  if (/^[A-Z][^.!?]*[.!?]$/m.test(content)) score += 2; // Complete sentences
  
  // Citation scoring
  const citationCount = (content.match(/\[Source:/g) || []).length;
  if (citationCount > 0) score += 3;
  if (citationCount > 2) score += 2;
  
  // Terminology scoring (regulatory-specific terms)
  const regulatoryTerms = ['efficacy', 'safety', 'adverse', 'clinical', 'patient', 'treatment', 'dose', 'endpoint'];
  const termCount = regulatoryTerms.filter(term => content.toLowerCase().includes(term)).length;
  score += Math.min(termCount, 5);
  
  return Math.min(score, 98); // Cap at 98 (never perfect)
}

// =============================================================================
// METRICS DISPLAY
// =============================================================================

interface MetricsDisplayProps {
  wordCount: number;
  tokenCount: number;
  tokensPerSecond: number;
  elapsedSeconds: number;
  status: GenerationStatus;
  qualityScore?: number;
}

function MetricsDisplay({ 
  wordCount, 
  tokenCount, 
  tokensPerSecond, 
  elapsedSeconds,
  status,
  qualityScore 
}: MetricsDisplayProps) {
  const isGenerating = status === 'streaming' || status === 'preparing';
  
  return (
    <div className="flex items-center gap-4 text-xs">
      {/* Word Count */}
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-text-muted" />
        <span className={`font-mono ${isGenerating ? 'text-accent-blue' : 'text-text-secondary'}`}>
          {wordCount.toLocaleString()}
        </span>
        <span className="text-text-muted">words</span>
      </div>
      
      {/* Tokens */}
      <div className="flex items-center gap-1.5">
        <Brain className="w-3.5 h-3.5 text-text-muted" />
        <span className={`font-mono ${isGenerating ? 'text-accent-blue' : 'text-text-secondary'}`}>
          {tokenCount.toLocaleString()}
        </span>
        <span className="text-text-muted">tokens</span>
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
        <span className={`font-mono ${isGenerating ? 'text-accent-blue animate-pulse' : 'text-text-secondary'}`}>
          {elapsedSeconds.toFixed(1)}s
        </span>
      </div>
      
      {/* Quality Score (shown on complete) */}
      {status === 'complete' && qualityScore !== undefined && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
          <BarChart3 className="w-3.5 h-3.5 text-accent-green" />
          <span className="font-mono text-accent-green font-semibold">
            {qualityScore}%
          </span>
          <span className="text-text-muted">quality</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  status: GenerationStatus;
  progress: number; // 0-100
}

function ProgressBar({ status, progress }: ProgressBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'preparing': return 'bg-accent-amber';
      case 'streaming': return 'bg-accent-blue';
      case 'complete': return 'bg-accent-green';
      case 'error': return 'bg-accent-red';
      case 'cancelled': return 'bg-text-muted';
      default: return 'bg-text-muted';
    }
  };
  
  return (
    <div className="h-1 bg-surface-card rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-300 ${getStatusColor()} ${
          status === 'streaming' ? 'animate-pulse' : ''
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// =============================================================================
// STATUS BADGE
// =============================================================================

interface StatusBadgeProps {
  status: GenerationStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    idle: { label: 'Ready', color: 'bg-slate-500/20 text-slate-400', icon: FileText },
    preparing: { label: 'Preparing', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
    streaming: { label: 'Generating', color: 'bg-blue-500/20 text-blue-400', icon: Sparkles },
    complete: { label: 'Complete', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
    error: { label: 'Error', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
    cancelled: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400', icon: StopCircle },
  }[status];
  
  const Icon = config.icon;
  const isAnimated = status === 'preparing' || status === 'streaming';
  
  return (
    <Badge className={`${config?.color ?? ''} border-0`}>
      <Icon className={`w-3 h-3 mr-1 ${isAnimated ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AuthoringStreamingPanel({
  section,
  documentType,
  context,
  sources,
  onComplete,
  onClose,
  expanded = false,
}: AuthoringStreamingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | undefined>();
  const [showCursor, setShowCursor] = useState(true);
  
  // Calculate estimated progress (based on typical section length)
  const estimateProgress = useCallback((wordCount: number, status: GenerationStatus) => {
    if (status === 'complete') return 100;
    if (status === 'preparing') return 5;
    // Assume typical section is ~400-600 words
    const targetWords = 500;
    return Math.min(5 + (wordCount / targetWords) * 90, 95);
  }, []);
  
  // Use the section generation hook
  const {
    state,
    metrics,
    generate,
    cancel,
    reset,
    isGenerating,
    isComplete,
    isError,
  } = useSectionGeneration({
    onToken: (token, fullContent) => {
      // Auto-scroll on each token
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    },
    onComplete: (content) => {
      const score = calculateQualityScore(content, documentType);
      setQualityScore(score);
      setShowCursor(false);
      onComplete?.(content, score);
    },
    onError: (error) => {
      console.error('Generation error:', error);
    },
  });
  
  // Start generation on mount
  useEffect(() => {
    generate(section, documentType, context, sources);
    
    return () => {
      // Cleanup on unmount
      cancel();
    };
  }, []); // Only run once on mount
  
  // Cursor blink effect
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [isGenerating]);
  
  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(state.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const progress = estimateProgress(metrics.wordCount, state.status);
  
  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden flex flex-col ${
      expanded ? 'w-full h-full shadow-2xl' : 'max-h-[600px]'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isGenerating ? 'bg-accent-blue/20' : 
            isComplete ? 'bg-accent-green/20' : 
            isError ? 'bg-accent-red/20' : 'bg-surface-card'
          }`}>
            {isGenerating ? (
              <Sparkles className="w-5 h-5 text-accent-blue animate-pulse" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-accent-red" />
            ) : (
              <Brain className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                AI Document Generation
              </h3>
              <StatusBadge status={state.status} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Section {section.number}: {section.title}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isGenerating && (
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
      
      {/* Progress Bar */}
      <ProgressBar status={state.status} progress={progress} />
      
      {/* Metrics Bar */}
      <div className="px-4 py-2 border-b border-border bg-surface-card/50">
        <MetricsDisplay
          wordCount={metrics.wordCount}
          tokenCount={metrics.tokenCount}
          tokensPerSecond={metrics.tokensPerSecond}
          elapsedSeconds={metrics.elapsedSeconds}
          status={state.status}
          qualityScore={qualityScore}
        />
      </div>
      
      {/* Content Area - AMA regulatory document styling */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6 bg-white min-h-[200px]"
        style={{
          fontFamily: '"Times New Roman", Times, Georgia, serif',
          fontSize: '12pt',
          lineHeight: '1.6',
          color: '#1a1a1a',
        }}
      >
        {state.status === 'preparing' && (
          <div className="flex items-center gap-3 text-text-muted" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing source documents and preparing generation...</span>
          </div>
        )}
        
        {(state.status === 'streaming' || state.status === 'complete') && state.content && (
          <div 
            className="regulatory-content"
            style={{ textAlign: 'justify' }}
            dangerouslySetInnerHTML={{ 
              __html: formatAsAMAContent(state.content) 
            }}
          />
        )}
        {(state.status === 'streaming' || state.status === 'complete') && isGenerating && showCursor && <StreamingCursor />}
        
        {state.status === 'complete' && !state.content && (
          <div className="flex flex-col items-center gap-4 py-8" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="text-center">
              <p className="text-text-secondary font-medium">No content was generated</p>
              <p className="text-text-muted text-sm mt-1">The AI completed without producing output. Please try again.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => generate(section, documentType, context, sources)}>
              <Sparkles className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}
        
        {state.status === 'error' && (
          <div className="flex items-center gap-3 text-accent-red" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <AlertCircle className="w-5 h-5" />
            <span>{state.error || 'An error occurred during generation'}</span>
          </div>
        )}
        
        {state.status === 'cancelled' && (
          <div className="text-text-muted" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <p className="mb-2">Generation cancelled.</p>
            {state.content && (
              <div 
                className="regulatory-content border-l-2 border-border pl-3"
                style={{ textAlign: 'justify' }}
                dangerouslySetInnerHTML={{ 
                  __html: formatAsAMAContent(state.content) 
                }}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Footer - Completion Actions */}
      {isComplete && (
        <div className="px-4 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              qualityScore && qualityScore >= 85 ? 'bg-accent-green/20' :
              qualityScore && qualityScore >= 70 ? 'bg-accent-amber/20' :
              'bg-accent-red/20'
            }`}>
              <TrendingUp className={`w-4 h-4 ${
                qualityScore && qualityScore >= 85 ? 'text-accent-green' :
                qualityScore && qualityScore >= 70 ? 'text-accent-amber' :
                'text-accent-red'
              }`} />
              <span className={`text-sm font-semibold ${
                qualityScore && qualityScore >= 85 ? 'text-accent-green' :
                qualityScore && qualityScore >= 70 ? 'text-accent-amber' :
                'text-accent-red'
              }`}>
                {qualityScore}% Quality Score
              </span>
            </div>
            <span className="text-xs text-text-muted">
              Generated in {metrics.elapsedSeconds.toFixed(1)}s • {metrics.wordCount} words
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => generate(section, documentType, context, sources)}>
              <Sparkles className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              <Check className="w-4 h-4 mr-1" />
              Accept & Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT STREAMING INDICATOR
// =============================================================================

interface StreamingIndicatorProps {
  isActive: boolean;
  wordCount?: number;
  tokensPerSecond?: number;
}

export function StreamingIndicator({ isActive, wordCount = 0, tokensPerSecond = 0 }: StreamingIndicatorProps) {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
      <Sparkles className="w-4 h-4 text-accent-blue animate-pulse" />
      <span className="text-xs text-accent-blue font-medium">Generating</span>
      <span className="text-xs text-text-muted">
        {wordCount} words • {tokensPerSecond.toFixed(1)} tok/s
      </span>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AuthoringStreamingPanel;
