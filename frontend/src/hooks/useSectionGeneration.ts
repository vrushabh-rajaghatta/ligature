

// ============================================================================
// useSectionGeneration Hook - v0.27.54
// React hook for streaming section generation via API route
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentSection, DocumentType } from '@/types/authoring';
import { SourceDocument, Citation } from '@/store/useAuthoringStore';
import { logger } from '@/lib/logger';
import { getFallbackContent, simulateStreaming } from '@/lib/demo-generation-fallback';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationContext {
  productName: string;
  studyName?: string;
  indication?: string;
}

export type GenerationStatus = 
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface GenerationState {
  status: GenerationStatus;
  content: string;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface GenerationMetrics {
  totalTimeMs: number;
  wordCount: number;
  tokenCount: number;
  tokensPerSecond: number;
  /** Elapsed time in seconds (convenience field) */
  elapsedSeconds: number;
  /** Alias for tokenCount (for backward compatibility) */
  totalTokens: number;
  /** Estimated cost based on token count */
  estimatedCost: number;
}

export interface UseSectionGenerationOptions {
  /** Callback on each token received */
  onToken?: (token: string, fullContent: string) => void;
  /** Callback when streaming starts */
  onStart?: () => void;
  /** Callback when generation completes */
  onComplete?: (content: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseSectionGenerationReturn {
  /** Current generation state */
  state: GenerationState;
  /** Computed metrics */
  metrics: GenerationMetrics;
  /** Start generating section content */
  generate: (
    section: DocumentSection,
    documentType: DocumentType,
    context: GenerationContext,
    sources: SourceDocument[]
  ) => Promise<void>;
  /** Cancel ongoing generation */
  cancel: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Status helpers */
  isGenerating: boolean;
  isComplete: boolean;
  isError: boolean;
  isIdle: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: GenerationState = {
  status: 'idle',
  content: '',
  error: null,
  startedAt: null,
  completedAt: null,
};

// ============================================================================
// CITATION EXTRACTION
// ============================================================================

function extractCitations(content: string, sources: SourceDocument[]): Citation[] {
  const citations: Citation[] = [];
  const citationPattern = /\[Source:\s*([^\]]+)\]/g;
  let match;
  
  while ((match = citationPattern.exec(content)) !== null) {
    const sourceRef = match[1].trim();
    
    // Try to match to a source document
    const matchedSource = sources.find(s => 
      s.title.toLowerCase().includes(sourceRef.toLowerCase()) ||
      sourceRef.toLowerCase().includes(s.title.split(' - ')[0].toLowerCase())
    );
    
    if (matchedSource) {
      const existingCitation = citations.find(c => c.sourceId === matchedSource.id);
      if (!existingCitation) {
        citations.push({
          id: `cite-${citations.length + 1}`,
          sourceId: matchedSource.id,
          sourceTitle: matchedSource.title,
          quotedText: sourceRef,
          confidence: 'high',
        });
      }
    } else {
      // Create citation for unmatched reference
      citations.push({
        id: `cite-${citations.length + 1}`,
        sourceId: `unknown-${citations.length}`,
        sourceTitle: sourceRef,
        quotedText: sourceRef,
        confidence: 'low',
      });
    }
  }
  
  return citations;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSectionGeneration(
  options: UseSectionGenerationOptions = {}
): UseSectionGenerationReturn {
  const { onToken, onStart, onComplete, onError } = options;

  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef<string>('');
  const tokenCountRef = useRef<number>(0);
  const sourcesRef = useRef<SourceDocument[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generate section content
  const generate = useCallback(async (
    section: DocumentSection,
    documentType: DocumentType,
    context: GenerationContext,
    sources: SourceDocument[]
  ): Promise<void> => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset state
    fullContentRef.current = '';
    tokenCountRef.current = 0;
    sourcesRef.current = sources;

    setState({
      ...initialState,
      status: 'preparing',
      startedAt: Date.now(),
    });

    onStart?.();

    try {
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: {
            id: section.id,
            number: section.number,
            title: section.title,
            // v0.32.9: Pass template fields for document-type-aware generation
            aiPrompt: (section as any).aiPrompt,
            guidance: (section as any).guidance,
            wordCountTarget: (section as any).wordCountTarget,
          },
          documentType,
          context,
          sources: sources.map(s => ({
            id: s.id,
            title: s.title,
            type: s.type,
            version: s.version,
            sections: s.sections,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Streaming not supported');
      }

      setState(prev => ({ ...prev, status: 'streaming' }));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setState(prev => ({
            ...prev,
            status: 'complete',
            content: fullContentRef.current,
            completedAt: Date.now(),
          }));
          onComplete?.(fullContentRef.current);
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
                completedAt: Date.now(),
              }));
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle metadata
              if (parsed.type === 'metadata') {
                // v0.32.9: Log metadata to confirm API version
                logger.debug('SectionGen', `API metadata: v${parsed.apiVersion}, category: ${parsed.documentCategory}, section: ${parsed.section?.number}`);
                continue;
              }

              // Handle content streaming
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullContentRef.current += text;
                tokenCountRef.current++;

                setState(prev => ({
                  ...prev,
                  content: fullContentRef.current,
                }));

                onToken?.(text, fullContentRef.current);
              }

              // Handle message stop
              if (parsed.type === 'message_stop') {
                setState(prev => ({
                  ...prev,
                  status: 'complete',
                  completedAt: Date.now(),
                }));
              }

              // Handle errors
              if (parsed.type === 'error') {
                throw new Error(parsed.error?.message || 'Stream error');
              }

            } catch (parseError) {
              // Ignore JSON parse errors for non-JSON lines
              if (data.trim() && !data.startsWith('event:')) {
                // Not a JSON line, ignore
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
          status: 'cancelled',
          completedAt: Date.now(),
        }));
        return;
      }

      // v0.42.48: Demo fallback — simulate streaming with pre-generated content
      // when API is unavailable (no key, network error, 500, etc.)
      logger.warn('SectionGen', `API failed (${err.message}), activating demo fallback`);
      
      try {
        const fallback = getFallbackContent(documentType, section.number, section.title);
        fullContentRef.current = '';
        tokenCountRef.current = 0;

        setState(prev => ({ ...prev, status: 'streaming', error: null }));

        await simulateStreaming(
          fallback.content,
          {
            onToken: (token) => {
              fullContentRef.current += token;
              tokenCountRef.current++;
              setState(prev => ({ ...prev, content: fullContentRef.current }));
              onToken?.(token, fullContentRef.current);
            },
            onComplete: (content) => {
              setState(prev => ({
                ...prev,
                status: 'complete',
                content,
                completedAt: Date.now(),
              }));
              onComplete?.(content);
            },
          },
          { signal: abortControllerRef.current?.signal }
        );
      } catch (fallbackError) {
        const fbErr = fallbackError as Error;
        if (fbErr.name === 'AbortError') {
          setState(prev => ({ ...prev, status: 'cancelled', completedAt: Date.now() }));
          return;
        }

        // Only show error if fallback also fails
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err.message,
          completedAt: Date.now(),
        }));
        onError?.(err);
      }
    }
  }, [onToken, onStart, onComplete, onError]);

  // Cancel generation
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
    setState(initialState);
  }, []);

  // Compute metrics
  const elapsedMs = state.startedAt 
    ? (state.completedAt || Date.now()) - state.startedAt 
    : 0;
  
  const tokenCount = tokenCountRef.current;
  // Claude Sonnet pricing: ~$3 per 1M input, ~$15 per 1M output tokens (estimate output)
  const estimatedCost = tokenCount * 0.000015;
  
  const metrics: GenerationMetrics = {
    totalTimeMs: elapsedMs,
    wordCount: state.content.split(/\s+/).filter(Boolean).length,
    tokenCount,
    tokensPerSecond: elapsedMs > 0 ? (tokenCount / elapsedMs) * 1000 : 0,
    elapsedSeconds: elapsedMs / 1000,
    totalTokens: tokenCount,
    estimatedCost,
  };

  return {
    state,
    metrics,
    generate,
    cancel,
    reset,
    isGenerating: state.status === 'preparing' || state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
  };
}

/**
 * Extract citations from generated content
 * Call this after generation completes
 */
export function extractSectionCitations(
  content: string,
  sources: SourceDocument[]
): Citation[] {
  return extractCitations(content, sources);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useSectionGeneration;
