

// ============================================================================
// useHAQRAG Hook - v0.27.52
// React hook for RAG-powered HAQ response generation with streaming
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SimilarResponse {
  id: string;
  questionText: string;
  applicationNumber: string;
  productName: string;
  discipline: string;
  outcome: 'accepted' | 'follow-up' | 'rejected';
  score: number;
  matchedTerms: string[];
  responseText?: string;
}

export interface RAGRequest {
  questionText: string;
  discipline?: string;
  ctdSection?: string;
  source?: string;
  productName?: string;
  topK?: number;
}

export type RAGStatus = 
  | 'idle'
  | 'searching'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface RAGState {
  status: RAGStatus;
  similarResponses: SimilarResponse[];
  generatedDraft: string;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface RAGMetrics {
  searchTimeMs: number;
  streamTimeMs: number;
  totalTimeMs: number;
  tokenCount: number;
  wordCount: number;
  similarCount: number;
}

export interface UseHAQRAGOptions {
  /** Callback when similar responses are found */
  onSimilarFound?: (responses: SimilarResponse[]) => void;
  /** Callback on each token received */
  onToken?: (token: string, fullContent: string) => void;
  /** Callback when generation completes */
  onComplete?: (draft: string, similar: SimilarResponse[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseHAQRAGReturn {
  /** Current RAG state */
  state: RAGState;
  /** Computed metrics */
  metrics: RAGMetrics;
  /** Find similar responses only (no generation) */
  findSimilar: (request: RAGRequest) => Promise<SimilarResponse[]>;
  /** Find similar and generate draft with streaming */
  generateDraft: (request: RAGRequest) => Promise<void>;
  /** Cancel ongoing operation */
  cancel: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Status helpers */
  isSearching: boolean;
  isStreaming: boolean;
  isComplete: boolean;
  isError: boolean;
  isIdle: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: RAGState = {
  status: 'idle',
  similarResponses: [],
  generatedDraft: '',
  error: null,
  startedAt: null,
  completedAt: null,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useHAQRAG(options: UseHAQRAGOptions = {}): UseHAQRAGReturn {
  const {
    onSimilarFound,
    onToken,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<RAGState>(initialState);
  const [searchEndTime, setSearchEndTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef<string>('');
  const tokenCountRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Find similar responses only (no generation)
  const findSimilar = useCallback(async (request: RAGRequest): Promise<SimilarResponse[]> => {
    setState(prev => ({
      ...prev,
      status: 'searching',
      startedAt: Date.now(),
      error: null,
    }));

    try {
      const response = await fetch('/api/ai/haq-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          generateDraft: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const similarResponses = data.similarResponses || [];

      setState(prev => ({
        ...prev,
        status: 'complete',
        similarResponses,
        completedAt: Date.now(),
      }));

      onSimilarFound?.(similarResponses);
      return similarResponses;

    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      }));
      onError?.(err);
      throw err;
    }
  }, [onSimilarFound, onError]);

  // Generate draft with streaming
  const generateDraft = useCallback(async (request: RAGRequest): Promise<void> => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset state
    fullContentRef.current = '';
    tokenCountRef.current = 0;
    setSearchEndTime(null);

    setState({
      ...initialState,
      status: 'searching',
      startedAt: Date.now(),
    });

    // Timeout protection: abort if nothing happens in 30s
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setState(prev => {
        // Only set error if we haven't completed
        if (prev.status !== 'complete') {
          return {
            ...prev,
            status: 'error',
            error: 'Request timed out after 30 seconds. Please try again.',
            completedAt: Date.now(),
          };
        }
        return prev;
      });
    }, 30000);

    try {
      // logger.debug('HAQ-RAG', Starting fetch to /api/ai/haq-rag...');
      const response = await fetch('/api/ai/haq-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          generateDraft: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      // logger.debug('HAQ-RAG', Response received:', response.status, response.headers.get('content-type'));

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg = errorBody?.error || `API error (HTTP ${response.status})`;
        console.error('[useHAQRAG] API error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Check if this is a non-streaming JSON response (no API key configured)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        // logger.debug('HAQ-RAG', JSON response received:', { aiDraftAvailable: data.aiDraftAvailable, hasSimilar: !!data.similarResponses, messageLength: data.message?.length });
        
        // Handle case where AI draft is not available (no API key)
        if (data.aiDraftAvailable === false) {
          const message = data.message || 'AI draft generation requires API key configuration.';
          setState(prev => ({
            ...prev,
            status: 'complete',
            similarResponses: data.similarResponses || [],
            generatedDraft: message,
            completedAt: Date.now(),
          }));
          onComplete?.(message, data.similarResponses || []);
          clearTimeout(timeoutId);
          return;
        }
        
        // Handle regular JSON response with similar responses only
        if (data.similarResponses) {
          setState(prev => ({
            ...prev,
            status: 'complete',
            similarResponses: data.similarResponses,
            generatedDraft: data.message || 'Similar responses found but no AI draft was generated.',
            completedAt: Date.now(),
          }));
          onSimilarFound?.(data.similarResponses);
          clearTimeout(timeoutId);
          return;
        }

        // Unexpected JSON response - don't silently fail
        throw new Error('Unexpected response format from server');
      }

      // logger.debug('HAQ-RAG', SSE stream detected, starting to read...');

      if (!response.body) {
        throw new Error('No response body - streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let similarResponses: SimilarResponse[] = [];
      let hasStartedStreaming = false;
      let eventCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream finished - check if we actually got content
          if (!fullContentRef.current && eventCount === 0) {
            setState(prev => ({
              ...prev,
              status: 'error',
              error: 'Stream completed but no content was received. The AI service may be unavailable.',
              completedAt: Date.now(),
            }));
            onError?.(new Error('Empty stream response'));
          } else {
            setState(prev => ({
              ...prev,
              status: 'complete',
              generatedDraft: fullContentRef.current || 'Response generation completed but produced no output. Please try again.',
              completedAt: Date.now(),
            }));
            onComplete?.(fullContentRef.current, similarResponses);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setState(prev => ({
                ...prev,
                status: 'complete',
                generatedDraft: fullContentRef.current || prev.generatedDraft,
                completedAt: Date.now(),
              }));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              eventCount++;

              // Handle metadata (similar responses)
              if (parsed.type === 'metadata' && parsed.similarResponses) {
                similarResponses = parsed.similarResponses;
                const now = Date.now();
                setSearchEndTime(now);
                
                setState(prev => ({
                  ...prev,
                  status: 'streaming',
                  similarResponses,
                }));
                
                onSimilarFound?.(similarResponses);
                continue;
              }

              // Handle content streaming - accept both delta formats
              const deltaText = parsed.delta?.text || parsed.delta?.content;
              if (parsed.type === 'content_block_delta' && deltaText) {
                if (!hasStartedStreaming) {
                  hasStartedStreaming = true;
                  // Clear timeout once we start getting content
                  clearTimeout(timeoutId);
                  setState(prev => ({ ...prev, status: 'streaming' }));
                }

                fullContentRef.current += deltaText;
                tokenCountRef.current++;

                setState(prev => ({
                  ...prev,
                  generatedDraft: fullContentRef.current,
                }));

                onToken?.(deltaText, fullContentRef.current);
              }

              // Handle message stop
              if (parsed.type === 'message_stop') {
                setState(prev => ({
                  ...prev,
                  status: 'complete',
                  generatedDraft: fullContentRef.current || prev.generatedDraft,
                  completedAt: Date.now(),
                }));
              }

              // Handle errors from Anthropic
              if (parsed.type === 'error') {
                throw new Error(parsed.error?.message || 'AI service returned an error');
              }

            } catch (parseError) {
              // Only warn for actual parse failures, not event: lines
              if (data.trim() && !data.startsWith('event:') && !(parseError instanceof SyntaxError)) {
                throw parseError; // Re-throw non-parse errors (e.g., the error type handler above)
              }
            }
          }
        }
      }

    } catch (error) {
      const err = error as Error;
      
      if (err.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          status: prev.status === 'error' ? 'error' : 'cancelled', // Keep error state if timeout set it
          completedAt: Date.now(),
        }));
        clearTimeout(timeoutId);
        return;
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || 'An unexpected error occurred during generation',
        completedAt: Date.now(),
      }));
      
      onError?.(err);
    } finally {
      clearTimeout(timeoutId);
    }
  }, [onSimilarFound, onToken, onComplete, onError]);

  // Cancel operation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      completedAt: Date.now(),
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    fullContentRef.current = '';
    tokenCountRef.current = 0;
    setSearchEndTime(null);
    setState(initialState);
  }, []);

  // Compute metrics
  const metrics: RAGMetrics = {
    searchTimeMs: searchEndTime && state.startedAt 
      ? searchEndTime - state.startedAt 
      : 0,
    streamTimeMs: searchEndTime && state.completedAt 
      ? state.completedAt - searchEndTime 
      : (state.startedAt && state.completedAt ? state.completedAt - state.startedAt : 0),
    totalTimeMs: state.startedAt && state.completedAt 
      ? state.completedAt - state.startedAt 
      : (state.startedAt ? Date.now() - state.startedAt : 0),
    tokenCount: tokenCountRef.current,
    wordCount: state.generatedDraft.split(/\s+/).filter(Boolean).length,
    similarCount: state.similarResponses.length,
  };

  return {
    state,
    metrics,
    findSimilar,
    generateDraft,
    cancel,
    reset,
    isSearching: state.status === 'searching',
    isStreaming: state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get just the similar responses for a question (no generation)
 */
export function useSimilarResponses(questionText: string | null, options?: RAGRequest) {
  const { state, findSimilar, isSearching } = useHAQRAG();
  const [responses, setResponses] = useState<SimilarResponse[]>([]);
  const previousQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!questionText || questionText === previousQuestionRef.current) {
      return;
    }
    
    previousQuestionRef.current = questionText;
    
    findSimilar({
      questionText,
      ...options,
    }).then(setResponses).catch(() => {
      setResponses([]);
    });
  }, [questionText, options, findSimilar]);

  return {
    responses,
    isLoading: isSearching,
    error: state.error,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useHAQRAG;
