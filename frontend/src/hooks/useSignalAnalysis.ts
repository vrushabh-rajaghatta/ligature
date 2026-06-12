

// ============================================================================
// useSignalAnalysis Hook - v0.27.54
// React hook for streaming AI-powered safety signal analysis
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SignalAnalysisRequest {
  signalId: string;
  signalName: string;
  drugName: string;
  drugClass?: string;
  reactionTerm: string;
  soc?: string;
  caseCount: number;
  prr?: number;
  ror?: number;
  ic025?: number;
  seriousCases?: number;
  fatalCases?: number;
  timeToOnsetRange?: string;
  dechallengePositiveRate?: number;
  labeledEvent?: boolean;
  classEffect?: boolean;
  recentCases?: Array<{
    caseNumber: string;
    outcome: string;
    causality: string;
    timeToOnset: string;
  }>;
}

export interface SimilarSignalMetadata {
  id: string;
  drugName: string;
  drugClass: string;
  reactionTerm: string;
  outcome: string;
  labelChange: boolean;
}

export type AnalysisStatus = 
  | 'idle'
  | 'searching'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface AnalysisState {
  status: AnalysisStatus;
  analysis: string;
  similarSignals: SimilarSignalMetadata[];
  error: string | null;
}

export interface AnalysisMetrics {
  searchTimeMs: number;
  streamTimeMs: number;
  totalTimeMs: number;
  wordCount: number;
  tokenCount: number;
}

export interface UseSignalAnalysisOptions {
  /** Callback when streaming starts */
  onStart?: () => void;
  /** Callback on each token */
  onToken?: (token: string) => void;
  /** Callback when analysis completes */
  onComplete?: (analysis: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseSignalAnalysisReturn {
  state: AnalysisState;
  metrics: AnalysisMetrics;
  analyze: (request: SignalAnalysisRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  isAnalyzing: boolean;
  isStreaming: boolean;
  isComplete: boolean;
  isError: boolean;
  isIdle: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AnalysisState = {
  status: 'idle',
  analysis: '',
  similarSignals: [],
  error: null,
};

const initialMetrics: AnalysisMetrics = {
  searchTimeMs: 0,
  streamTimeMs: 0,
  totalTimeMs: 0,
  wordCount: 0,
  tokenCount: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSignalAnalysis(
  options: UseSignalAnalysisOptions = {}
): UseSignalAnalysisReturn {
  const { onStart, onToken, onComplete, onError } = options;

  const [state, setState] = useState<AnalysisState>(initialState);
  const [metrics, setMetrics] = useState<AnalysisMetrics>(initialMetrics);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamStartTimeRef = useRef<number>(0);
  const tokenCountRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Analyze signal
  const analyze = useCallback(async (request: SignalAnalysisRequest) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset state
    startTimeRef.current = Date.now();
    tokenCountRef.current = 0;
    
    setState({
      ...initialState,
      status: 'searching',
    });
    setMetrics(initialMetrics);

    onStart?.();

    try {
      const response = await fetch('/api/ai/safety-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnalysis = '';
      let similarSignals: SimilarSignalMetadata[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const totalTime = Date.now() - startTimeRef.current;
          setMetrics(prev => ({
            ...prev,
            totalTimeMs: totalTime,
            wordCount: fullAnalysis.split(/\s+/).filter(Boolean).length,
            tokenCount: tokenCountRef.current,
          }));
          
          setState(prev => ({
            ...prev,
            status: 'complete',
            analysis: fullAnalysis,
          }));
          
          onComplete?.(fullAnalysis);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle metadata (similar signals)
              if (parsed.type === 'metadata') {
                similarSignals = parsed.similarSignals || [];
                const searchTime = Date.now() - startTimeRef.current;
                streamStartTimeRef.current = Date.now();
                
                setMetrics(prev => ({ ...prev, searchTimeMs: searchTime }));
                setState(prev => ({
                  ...prev,
                  status: 'streaming',
                  similarSignals,
                }));
                continue;
              }

              // Handle content streaming
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullAnalysis += text;
                tokenCountRef.current++;

                setState(prev => ({
                  ...prev,
                  analysis: fullAnalysis,
                }));

                onToken?.(text);
              }

              // Handle message stop
              if (parsed.type === 'message_stop') {
                const streamTime = Date.now() - streamStartTimeRef.current;
                setMetrics(prev => ({
                  ...prev,
                  streamTimeMs: streamTime,
                }));
              }

            } catch {
              // Ignore parse errors
            }
          }
        }
      }

    } catch (error) {
      const err = error as Error;

      if (err.name === 'AbortError') {
        setState(prev => ({ ...prev, status: 'cancelled' }));
        return;
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));

      onError?.(err);
    }
  }, [onStart, onToken, onComplete, onError]);

  // Cancel
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(initialState);
    setMetrics(initialMetrics);
  }, []);

  return {
    state,
    metrics,
    analyze,
    cancel,
    reset,
    isAnalyzing: state.status === 'searching' || state.status === 'streaming',
    isStreaming: state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
  };
}

export default useSignalAnalysis;
