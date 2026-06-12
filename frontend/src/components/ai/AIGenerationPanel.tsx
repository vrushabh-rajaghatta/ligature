// ============================================================================
// AIGenerationPanel - v0.27.49: Real-time Claude Streaming UI Component
// Visual display for AI content generation with live streaming feedback
// ============================================================================


import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Cpu,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { 
  useAIStreaming, 
  StreamingStatus,
  UseAIStreamingOptions,
} from '@/hooks/useAIStreaming';
import { CompletionRequest, AIModule, AITaskType } from '@/services/anthropic-service';
import { formatAsAMAContent, AMA_CONTENT_STYLES } from '@/utils/ama-formatter';

// ============================================================================
// TYPES
// ============================================================================

export interface AIGenerationPanelProps {
  /** Unique ID for this generation instance */
  id: string;
  /** Display title */
  title: string;
  /** Type label for the generation */
  type: 'haq-response' | 'safety-narrative' | 'document-section' | 'signal-summary' | 'general';
  /** System prompt for the generation */
  systemPrompt: string;
  /** User prompt/query */
  userPrompt: string;
  /** AI module for tracking */
  module?: AIModule;
  /** Task type for tracking */
  taskType?: AITaskType;
  /** Temperature (0-1) */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  /** Character delay for smoother streaming display (ms) */
  displayDelay?: number;
  /** Whether to auto-start generation on mount */
  autoStart?: boolean;
  /** Show detailed metrics */
  showMetrics?: boolean;
  /** Show model info */
  showModelInfo?: boolean;
  /** Callback when generation completes */
  onComplete?: (content: string) => void;
  /** Callback when user accepts the content */
  onAccept?: (content: string) => void;
  /** Callback on close/cancel */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS CONFIGS
// ============================================================================

const statusConfig: Record<StreamingStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  idle: { label: 'Ready', color: 'text-secondary', bgColor: 'bg-surface', icon: FileText },
  connecting: { label: 'Connecting...', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Loader2 },
  streaming: { label: 'Generating...', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: Sparkles },
  complete: { label: 'Complete', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertCircle },
};

const typeLabels: Record<AIGenerationPanelProps['type'], string> = {
  'haq-response': 'HAQ Response Draft',
  'safety-narrative': 'Safety Case Narrative',
  'document-section': 'Document Section',
  'signal-summary': 'Signal Summary',
  'general': 'AI Generated Content',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AIGenerationPanel({
  id,
  title,
  type,
  systemPrompt,
  userPrompt,
  module = 'general',
  taskType = 'draft-generation',
  temperature = 0.3,
  maxTokens = 4096,
  displayDelay = 0,
  autoStart = false,
  showMetrics = true,
  showModelInfo = false,
  onComplete,
  onAccept,
  onClose,
  className = '',
}: AIGenerationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Streaming hook
  const {
    state,
    metrics,
    startStreaming,
    cancel,
    reset,
    isStreaming,
    isComplete,
    isError,
  } = useAIStreaming({
    module,
    taskType,
    displayDelay,
    onComplete: (response) => {
      onComplete?.(state.content);
    },
  });

  // Build the request
  const buildRequest = useCallback((): CompletionRequest => ({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    config: { temperature, maxTokens },
  }), [systemPrompt, userPrompt, temperature, maxTokens]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && !hasStartedRef.current && state.status === 'idle') {
      hasStartedRef.current = true;
      startStreaming(buildRequest());
    }
  }, [autoStart, state.status, startStreaming, buildRequest]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.content, isStreaming]);

  // Handle start/regenerate
  const handleStart = useCallback(() => {
    reset();
    startStreaming(buildRequest());
  }, [reset, startStreaming, buildRequest]);

  // Handle copy
  const handleCopy = async () => {
    if (state.content) {
      await navigator.clipboard.writeText(state.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle accept
  const handleAccept = () => {
    onAccept?.(state.content);
  };

  // Get status config
  const config = statusConfig[state.status];
  const StatusIcon = config.icon;

  return (
    <div className={`bg-surface-elevated border border-border rounded-xl overflow-hidden ${expanded ? 'w-full h-full shadow-2xl' : ''} ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
            <StatusIcon className={`w-4 h-4 ${config?.color ?? ''} ${isStreaming ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="font-medium text-sm text-primary">{title}</h3>
            <p className="text-xs text-secondary">{typeLabels[type]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span className={`flex items-center gap-1.5 text-xs ${config?.color ?? ''} ${config.bgColor} px-2 py-1 rounded`}>
            {isStreaming && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
            {config.label}
          </span>

          {/* Actions */}
          {state.content && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-surface transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-secondary" />
              )}
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-surface transition-colors"
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4 text-secondary" />
            ) : (
              <Maximize2 className="w-4 h-4 text-secondary" />
            )}
          </button>

          {onClose && (
            <button
              onClick={() => {
                cancel();
                onClose();
              }}
              className="p-1.5 rounded hover:bg-surface transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Prompt Preview (collapsible) */}
      {showModelInfo && (
        <div className="px-4 py-2 bg-surface/50 border-b border-border">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors"
          >
            {showPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <Cpu className="w-3 h-3" />
            claude-sonnet-4 · temp {temperature} · {maxTokens} max tokens
          </button>
          {showPrompt && (
            <div className="mt-2 p-2 bg-surface rounded text-xs font-mono text-secondary max-h-32 overflow-auto">
              <div className="mb-2">
                <span className="text-blue-400">System:</span>
                <div className="pl-2 text-primary/70">{systemPrompt.slice(0, 200)}...</div>
              </div>
              <div>
                <span className="text-emerald-400">User:</span>
                <div className="pl-2 text-primary/70">{userPrompt.slice(0, 200)}...</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div
        ref={contentRef}
        className={`p-4 overflow-y-auto ${expanded ? 'h-[calc(100%-10rem)]' : 'max-h-96 min-h-48'}`}
      >
        {state.status === 'idle' ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="w-8 h-8 text-secondary mb-3" />
            <p className="text-sm text-secondary mb-4">Ready to generate {typeLabels[type]?.toLowerCase()}</p>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Generation
            </button>
          </div>
        ) : state.status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
            <p className="text-sm text-red-400 mb-2">Generation failed</p>
            <p className="text-xs text-secondary mb-4 max-w-md">{state.error}</p>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-surface border border-border text-primary rounded-lg hover:bg-surface-elevated transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <div 
            className="bg-white rounded p-4"
            style={AMA_CONTENT_STYLES}
          >
            <div 
              className="regulatory-content"
              style={{ textAlign: 'justify' }}
              dangerouslySetInnerHTML={{ __html: formatAsAMAContent(state.content) }}
            />
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Footer with Metrics */}
      {showMetrics && (state.status !== 'idle') && (
        <div className="px-4 py-3 border-t border-border bg-surface">
          <div className="flex items-center justify-between">
            {/* Left: Metrics */}
            <div className="flex items-center gap-4 text-xs text-secondary">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {metrics.wordCount} words
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {metrics.elapsedSeconds.toFixed(1)}s
              </span>
              {isComplete && metrics.totalTokens > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    {metrics.totalTokens} tokens
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${metrics.estimatedCost.toFixed(4)}
                  </span>
                </>
              )}
              {isStreaming && (
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Zap className="w-3.5 h-3.5" />
                  {metrics.tokensPerSecond.toFixed(0)} tok/s
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isStreaming && (
                <button
                  onClick={cancel}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Pause className="w-3 h-3" />
                  Stop
                </button>
              )}
              {isComplete && (
                <>
                  <button
                    onClick={handleStart}
                    className="px-3 py-1.5 text-xs font-medium bg-surface border border-border text-primary rounded hover:bg-surface-elevated transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                  {onAccept && (
                    <button
                      onClick={handleAccept}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      Use This Draft
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT INLINE STREAMING INDICATOR
// ============================================================================

export function AIStreamingIndicator({
  isActive,
  label = 'Generating',
  showDots = true,
}: {
  isActive: boolean;
  label?: string;
  showDots?: boolean;
}) {
  if (!isActive) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
      <Sparkles className="w-3 h-3 animate-pulse" />
      <span>{label}</span>
      {showDots && (
        <span className="flex gap-0.5">
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      )}
    </span>
  );
}

// ============================================================================
// QUALITY SCORE BADGE
// ============================================================================

export function AIQualityBadge({
  score,
  showLabel = true,
}: {
  score: number;
  showLabel?: boolean;
}) {
  const getColor = () => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10';
    if (score >= 75) return 'text-blue-400 bg-blue-500/10';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const getLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Review';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getColor()}`}>
      <span className="font-bold">{score}</span>
      {showLabel && <span className="text-secondary/80">{getLabel()}</span>}
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AIGenerationPanel;
