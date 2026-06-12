

// ============================================================================
// useAIStreaming Hook - v0.27.49: Real Claude API Streaming for React
// Bridges anthropic-service streamComplete() to React state management
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  streamComplete, 
  CompletionRequest, 
  CompletionResponse,
  AIModule,
  AITaskType 
} from '@/services/anthropic-service';

// ============================================================================
// TYPES
// ============================================================================

export type StreamingStatus = 
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface StreamingState {
  status: StreamingStatus;
  content: string;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface StreamingMetrics {
  tokensPerSecond: number;
  totalTokens: number;
  estimatedCost: number;
  elapsedSeconds: number;
  wordCount: number;
}

export interface UseAIStreamingOptions {
  /** AI module for usage tracking */
  module?: AIModule;
  /** Task type for usage tracking */
  taskType?: AITaskType;
  /** Callback on each token received */
  onToken?: (token: string, fullContent: string) => void;
  /** Callback when streaming starts */
  onStart?: () => void;
  /** Callback when streaming completes */
  onComplete?: (response: CompletionResponse) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Character delay for smoother display (ms, 0 = real-time) */
  displayDelay?: number;
}

export interface UseAIStreamingReturn {
  /** Current streaming state */
  state: StreamingState;
  /** Computed metrics */
  metrics: StreamingMetrics;
  /** Start a streaming request */
  startStreaming: (request: CompletionRequest) => Promise<void>;
  /** Cancel ongoing stream */
  cancel: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Whether complete */
  isComplete: boolean;
  /** Whether errored */
  isError: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: StreamingState = {
  status: 'idle',
  content: '',
  error: null,
  startedAt: null,
  completedAt: null,
  inputTokens: 0,
  outputTokens: 0,
  latencyMs: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAIStreaming(options: UseAIStreamingOptions = {}): UseAIStreamingReturn {
  const {
    module = 'general',
    taskType = 'draft-generation',
    onToken,
    onStart,
    onComplete,
    onError,
    displayDelay = 0,
  } = options;

  const [state, setState] = useState<StreamingState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const displayQueueRef = useRef<string[]>([]);
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullContentRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    };
  }, []);

  // Process display queue with optional delay for smoother UX
  const processDisplayQueue = useCallback(() => {
    if (displayQueueRef.current.length === 0) return;

    const token = displayQueueRef.current.shift()!;
    setState(prev => ({
      ...prev,
      content: prev.content + token,
    }));

    if (displayQueueRef.current.length > 0 && displayDelay > 0) {
      displayTimeoutRef.current = setTimeout(processDisplayQueue, displayDelay);
    } else if (displayQueueRef.current.length > 0) {
      // Process immediately if no delay
      processDisplayQueue();
    }
  }, [displayDelay]);

  // Start streaming request
  const startStreaming = useCallback(async (request: CompletionRequest) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Reset state
    fullContentRef.current = '';
    displayQueueRef.current = [];
    
    setState({
      ...initialState,
      status: 'connecting',
      startedAt: Date.now(),
    });
    
    onStart?.();

    try {
      setState(prev => ({ ...prev, status: 'streaming' }));

      await streamComplete(
        request,
        {
          onToken: (token) => {
            fullContentRef.current += token;
            
            if (displayDelay > 0) {
              // Queue tokens for delayed display
              displayQueueRef.current.push(token);
              if (displayQueueRef.current.length === 1) {
                processDisplayQueue();
              }
            } else {
              // Display immediately
              setState(prev => ({
                ...prev,
                content: prev.content + token,
              }));
            }
            
            onToken?.(token, fullContentRef.current);
          },
          onComplete: (response) => {
            // Ensure all queued content is displayed
            const finalContent = fullContentRef.current;
            
            setState(prev => ({
              ...prev,
              status: 'complete',
              content: finalContent,
              completedAt: Date.now(),
              inputTokens: response.inputTokens,
              outputTokens: response.outputTokens,
              latencyMs: response.latencyMs,
            }));
            
            onComplete?.(response);
          },
          onError: (error) => {
            setState(prev => ({
              ...prev,
              status: 'error',
              error: error.message,
              completedAt: Date.now(),
            }));
            
            onError?.(error);
          },
        },
        module,
        taskType
      );
    } catch (error) {
      // Handle abort
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          completedAt: Date.now(),
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        error: (error as Error).message,
        completedAt: Date.now(),
      }));
      
      onError?.(error as Error);
    }
  }, [module, taskType, displayDelay, onToken, onStart, onComplete, onError, processDisplayQueue]);

  // Cancel streaming
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
    }
    
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      completedAt: Date.now(),
    }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
    }
    
    fullContentRef.current = '';
    displayQueueRef.current = [];
    setState(initialState);
  }, []);

  // Compute metrics
  const metrics: StreamingMetrics = {
    tokensPerSecond: state.startedAt && state.outputTokens > 0
      ? state.outputTokens / ((state.completedAt || Date.now()) - state.startedAt) * 1000
      : 0,
    totalTokens: state.inputTokens + state.outputTokens,
    estimatedCost: calculateEstimatedCost(state.inputTokens, state.outputTokens),
    elapsedSeconds: state.startedAt
      ? ((state.completedAt || Date.now()) - state.startedAt) / 1000
      : 0,
    wordCount: state.content.split(/\s+/).filter(Boolean).length,
  };

  return {
    state,
    metrics,
    startStreaming,
    cancel,
    reset,
    isStreaming: state.status === 'streaming' || state.status === 'connecting',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateEstimatedCost(inputTokens: number, outputTokens: number): number {
  // Sonnet 4 pricing: $3/1M input, $15/1M output
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

// ============================================================================
// SPECIALIZED HOOKS FOR COMMON USE CASES
// ============================================================================

/**
 * Hook specifically for HAQ response generation with streaming
 */
export function useHAQResponseStreaming(options: Omit<UseAIStreamingOptions, 'module' | 'taskType'> = {}) {
  return useAIStreaming({
    ...options,
    module: 'haq-response',
    taskType: 'draft-generation',
  });
}

/**
 * Hook specifically for document section generation with streaming
 */
export function useSectionGenerationStreaming(options: Omit<UseAIStreamingOptions, 'module' | 'taskType'> = {}) {
  return useAIStreaming({
    ...options,
    module: 'document-authoring',
    taskType: 'section-authoring',
  });
}

/**
 * Hook specifically for safety narrative generation with streaming
 */
export function useSafetyNarrativeStreaming(options: Omit<UseAIStreamingOptions, 'module' | 'taskType'> = {}) {
  return useAIStreaming({
    ...options,
    module: 'safety-narratives',
    taskType: 'narrative-generation',
  });
}

/**
 * Hook specifically for signal summary generation with streaming
 */
export function useSignalSummaryStreaming(options: Omit<UseAIStreamingOptions, 'module' | 'taskType'> = {}) {
  return useAIStreaming({
    ...options,
    module: 'signal-analysis',
    taskType: 'signal-summary',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useAIStreaming;
