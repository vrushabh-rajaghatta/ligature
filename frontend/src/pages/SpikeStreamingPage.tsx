

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Play, Square, RotateCcw, Activity, Clock, DollarSign, FileText, Zap } from 'lucide-react';

/**
 * AI STREAMING SPIKE
 * 
 * Proves real Claude API streaming works for section generation.
 * Navigate to: http://localhost:3000/spike/streaming
 * 
 * Requirements:
 * - ANTHROPIC_API_KEY in .env.local
 * - Network access to api.anthropic.com
 */

interface StreamMetrics {
  startTime: number;
  firstTokenTime: number | null;
  tokenCount: number;
  charCount: number;
  wordCount: number;
}

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error' | 'cancelled';

export default function StreamingSpikePage() {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StreamMetrics>({
    startTime: 0,
    firstTokenTime: null,
    tokenCount: 0,
    charCount: 0,
    wordCount: 0,
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update elapsed time during streaming
  useEffect(() => {
    if (status === 'streaming' && metrics.startTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - metrics.startTime);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, metrics.startTime]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (contentRef.current && status === 'streaming') {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, status]);

  const startStreaming = async () => {
    setStatus('connecting');
    setContent('');
    setError(null);
    setElapsedMs(0);
    
    const startTime = Date.now();
    setMetrics({
      startTime,
      firstTokenTime: null,
      tokenCount: 0,
      charCount: 0,
      wordCount: 0,
    });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/stream-spike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'efficacy-section',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body - streaming not supported');
      }

      setStatus('streaming');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let tokenCount = 0;
      let firstTokenTime: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setStatus('complete');
          setElapsedMs(Date.now() - startTime);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setStatus('complete');
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullContent += text;
                tokenCount++;
                
                if (firstTokenTime === null) {
                  firstTokenTime = Date.now();
                }
                
                setContent(fullContent);
                setMetrics(prev => ({
                  ...prev,
                  firstTokenTime: firstTokenTime,
                  tokenCount,
                  charCount: fullContent.length,
                  wordCount: fullContent.split(/\s+/).filter(Boolean).length,
                }));
              }
              
              if (parsed.type === 'message_stop') {
                setStatus('complete');
              }
              
              if (parsed.type === 'error') {
                throw new Error(parsed.error?.message || 'Stream error');
              }
            } catch (e) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'AbortError') {
        setStatus('cancelled');
      } else {
        setStatus('error');
        setError(e.message || 'Unknown error');
      }
    }
  };

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const reset = () => {
    setStatus('idle');
    setContent('');
    setError(null);
    setElapsedMs(0);
    setMetrics({
      startTime: 0,
      firstTokenTime: null,
      tokenCount: 0,
      charCount: 0,
      wordCount: 0,
    });
  };

  // Calculate derived metrics
  const elapsedSeconds = elapsedMs / 1000;
  const tokensPerSecond = elapsedSeconds > 0 ? metrics.tokenCount / elapsedSeconds : 0;
  const timeToFirstToken = metrics.firstTokenTime 
    ? metrics.firstTokenTime - metrics.startTime 
    : null;
  
  // Estimated cost (claude-sonnet-4 pricing)
  const estimatedInputTokens = 500; // Approximate for system + user prompt
  const estimatedCost = (estimatedInputTokens * 0.003 + metrics.tokenCount * 0.015) / 1000;

  const getStatusColor = () => {
    switch (status) {
      case 'idle': return 'bg-gray-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'streaming': return 'bg-blue-500 animate-pulse';
      case 'complete': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'cancelled': return 'bg-amber-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Ready';
      case 'connecting': return 'Connecting to Claude...';
      case 'streaming': return 'Streaming...';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      case 'cancelled': return 'Cancelled';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold">AI Streaming Spike</h1>
          </div>
          <p className="text-gray-400">
            Proves real Claude API streaming works for section generation.
            This calls the actual Anthropic API with SSE streaming.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          {status === 'idle' || status === 'complete' || status === 'error' || status === 'cancelled' ? (
            <button
              onClick={startStreaming}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Streaming
            </button>
          ) : (
            <button
              onClick={cancelStreaming}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4" />
              Cancel
            </button>
          )}
          
          {(status === 'complete' || status === 'error' || status === 'cancelled') && (
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 ml-auto">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm text-gray-300">{getStatusText()}</span>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Elapsed
            </div>
            <div className="text-2xl font-mono font-bold">
              {elapsedSeconds.toFixed(1)}s
            </div>
            {timeToFirstToken !== null && (
              <div className="text-xs text-gray-500 mt-1">
                TTFT: {timeToFirstToken}ms
              </div>
            )}
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Activity className="w-4 h-4" />
              Speed
            </div>
            <div className="text-2xl font-mono font-bold">
              {tokensPerSecond.toFixed(0)}
              <span className="text-sm text-gray-500 ml-1">tok/s</span>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <FileText className="w-4 h-4" />
              Output
            </div>
            <div className="text-2xl font-mono font-bold">
              {metrics.wordCount}
              <span className="text-sm text-gray-500 ml-1">words</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.tokenCount} tokens
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Est. Cost
            </div>
            <div className="text-2xl font-mono font-bold">
              ${estimatedCost.toFixed(4)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              claude-sonnet-4
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="font-medium text-red-400 mb-1">Error</div>
            <div className="text-sm text-red-300">{error}</div>
          </div>
        )}

        {/* Content Output */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Zap className="w-4 h-4 text-purple-400" />
              Generated Content
            </div>
            <div className="text-xs text-gray-500">
              ICH E3 Section 11.4 • Efficacy Results
            </div>
          </div>
          
          <div 
            ref={contentRef}
            className="p-4 h-96 overflow-auto font-mono text-sm leading-relaxed"
          >
            {content ? (
              <div className="whitespace-pre-wrap">
                {content}
                {status === 'streaming' && (
                  <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse" />
                )}
              </div>
            ) : status === 'idle' ? (
              <div className="text-gray-500 italic">
                Click "Start Streaming" to generate ICH E3 efficacy section content...
              </div>
            ) : status === 'connecting' ? (
              <div className="text-amber-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Establishing connection to Claude API...
              </div>
            ) : null}
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-6 text-xs text-gray-500">
          <div className="font-medium mb-2">Technical Details:</div>
          <ul className="space-y-1">
            <li>• API Endpoint: POST /api/ai/stream-spike → api.anthropic.com/v1/messages</li>
            <li>• Model: claude-sonnet-4-6</li>
            <li>• Streaming: Server-Sent Events (SSE)</li>
            <li>• Temperature: 0.3 (regulatory content)</li>
            <li>• Max Tokens: 2000</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
