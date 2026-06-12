

// ============================================================================
// useDocumentQC Hook - v0.27.57
// React hook for streaming AI-powered document quality control
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  wordCount?: number;
}

export interface DocumentQCRequest {
  documentId: string;
  documentTitle: string;
  documentType: 'csr' | 'protocol' | 'ib' | 'summary' | 'module2' | 'module3' | 'module5' | 'sop' | 'other';
  sections: DocumentSection[];
  targetGuidelines?: string[];
  styleGuide?: 'ama-11' | 'apa-7' | 'icmje' | 'custom';
  checkTypes?: Array<'completeness' | 'style' | 'compliance' | 'consistency' | 'cross-references' | 'all'>;
}

export interface StyleIssue {
  type: 'error' | 'warning' | 'suggestion';
  category: string;
  message: string;
  location?: { sectionId: string; text: string };
  suggestion?: string;
}

export interface CompletenessIssue {
  type: 'error' | 'warning';
  sectionId: string;
  title: string;
  message: string;
  guideline?: string;
}

export interface QCMetadata {
  documentId: string;
  styleIssues: StyleIssue[];
  completenessIssues: CompletenessIssue[];
  stats: {
    totalSections: number;
    totalWords: number;
    styleIssueCount: number;
    completenessIssueCount: number;
  };
}

export type QCStatus = 
  | 'idle'
  | 'checking'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface QCState {
  status: QCStatus;
  analysis: string;
  metadata: QCMetadata | null;
  error: string | null;
}

export interface QCMetrics {
  ruleCheckTimeMs: number;
  aiAnalysisTimeMs: number;
  totalTimeMs: number;
  wordCount: number;
}

export interface UseDocumentQCOptions {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (analysis: string, metadata: QCMetadata | null) => void;
  onError?: (error: Error) => void;
}

export interface UseDocumentQCReturn {
  state: QCState;
  metrics: QCMetrics;
  runQC: (request: DocumentQCRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  isRunning: boolean;
  isStreaming: boolean;
  isComplete: boolean;
  isError: boolean;
  isIdle: boolean;
  totalIssueCount: number;
  criticalIssueCount: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: QCState = {
  status: 'idle',
  analysis: '',
  metadata: null,
  error: null,
};

const initialMetrics: QCMetrics = {
  ruleCheckTimeMs: 0,
  aiAnalysisTimeMs: 0,
  totalTimeMs: 0,
  wordCount: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDocumentQC(
  options: UseDocumentQCOptions = {}
): UseDocumentQCReturn {
  const { onStart, onToken, onComplete, onError } = options;

  const [state, setState] = useState<QCState>(initialState);
  const [metrics, setMetrics] = useState<QCMetrics>(initialMetrics);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamStartTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Run QC
  const runQC = useCallback(async (request: DocumentQCRequest) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset state
    startTimeRef.current = Date.now();
    
    setState({
      ...initialState,
      status: 'checking',
    });
    setMetrics(initialMetrics);

    onStart?.();

    try {
      const response = await fetch('/api/ai/document-qc', {
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
      let metadata: QCMetadata | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const totalTime = Date.now() - startTimeRef.current;
          setMetrics(prev => ({
            ...prev,
            totalTimeMs: totalTime,
            wordCount: fullAnalysis.split(/\s+/).filter(Boolean).length,
          }));
          
          setState(prev => ({
            ...prev,
            status: 'complete',
            analysis: fullAnalysis,
          }));
          
          onComplete?.(fullAnalysis, metadata);
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

              // Handle metadata (rule-based check results)
              if (parsed.type === 'metadata') {
                metadata = {
                  documentId: parsed.documentId,
                  styleIssues: parsed.styleIssues || [],
                  completenessIssues: parsed.completenessIssues || [],
                  stats: parsed.stats || {},
                };
                
                const ruleCheckTime = Date.now() - startTimeRef.current;
                streamStartTimeRef.current = Date.now();
                
                setMetrics(prev => ({ ...prev, ruleCheckTimeMs: ruleCheckTime }));
                setState(prev => ({
                  ...prev,
                  status: 'streaming',
                  metadata,
                }));
                continue;
              }

              // Handle content streaming
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullAnalysis += text;

                setState(prev => ({
                  ...prev,
                  analysis: fullAnalysis,
                }));

                onToken?.(text);
              }

              // Handle message stop
              if (parsed.type === 'message_stop') {
                const aiTime = Date.now() - streamStartTimeRef.current;
                setMetrics(prev => ({
                  ...prev,
                  aiAnalysisTimeMs: aiTime,
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

  // Computed values
  const totalIssueCount = (state.metadata?.stats.styleIssueCount || 0) + 
                          (state.metadata?.stats.completenessIssueCount || 0);
  
  const criticalIssueCount = (state.metadata?.styleIssues.filter(i => i.type === 'error').length || 0) +
                             (state.metadata?.completenessIssues.filter(i => i.type === 'error').length || 0);

  return {
    state,
    metrics,
    runQC,
    cancel,
    reset,
    isRunning: state.status === 'checking' || state.status === 'streaming',
    isStreaming: state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    totalIssueCount,
    criticalIssueCount,
  };
}

export default useDocumentQC;
