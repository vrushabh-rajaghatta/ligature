


import { useState, useCallback } from 'react';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// System prompts for different authoring contexts
const systemPrompts = {
  protocol: `You are an expert regulatory medical writer assistant specializing in clinical study protocols. 
You help draft, review, and improve protocol content following ICH E6(R2) guidelines.
Be concise, precise, and use appropriate regulatory language.
When drafting content, follow the standard protocol structure and include appropriate cross-references.`,

  csr: `You are an expert regulatory medical writer assistant specializing in Clinical Study Reports (CSRs).
You help draft, review, and improve CSR content following ICH E3 guidelines.
Ensure accuracy with source data, maintain consistency with TFLs, and use precise statistical language.
When referencing data, note that values should be verified against source TFLs.`,

  ib: `You are an expert regulatory medical writer assistant specializing in Investigator's Brochures.
You help draft, review, and improve IB content following ICH E7 guidelines.
Focus on clear presentation of safety data, pharmacology, and clinical information for investigators.`,

  module25: `You are an expert regulatory medical writer assistant specializing in CTD Module 2.5 Clinical Overview.
You help create integrated summaries of clinical data for regulatory submissions.
Focus on benefit-risk assessment, clinical pharmacology, efficacy, and safety narratives.`,

  module27: `You are an expert regulatory medical writer assistant specializing in CTD Module 2.7 Clinical Summary.
You help create detailed clinical summaries including biopharmaceutics, pharmacokinetics, efficacy, and safety.
Ensure consistency with Module 5 CSRs and appropriate cross-referencing.`,

  general: `You are an expert regulatory medical writer assistant for pharmaceutical documents.
You help draft, review, and improve regulatory content following ICH guidelines.
Be concise, precise, and use appropriate regulatory language.`
};

// Action-specific prompts
const actionPrompts = {
  draft: (sectionTitle: string, context: string) => 
    `Draft content for the section "${sectionTitle}". 
Context: ${context}
Provide well-structured regulatory content with appropriate subheadings if needed. Keep it professional and compliant.`,

  summarize: (sources: string) =>
    `Summarize the following source documents for use in regulatory writing:
${sources}
Provide a concise summary highlighting key points relevant to the current document.`,

  consistency: (content: string) =>
    `Review the following content for consistency issues:
${content}
Check for:
1. Terminology consistency
2. Abbreviation usage (defined before use)
3. Number formatting
4. Date format consistency
5. Cross-reference accuracy
Report any issues found.`,

  clarity: (content: string) =>
    `Improve the clarity of the following regulatory content while maintaining accuracy:
${content}
Suggest specific improvements for readability and precision.`,

  custom: (prompt: string, context: string) =>
    `${prompt}

Context from current document:
${context}`
};

export function useAIAssistant(documentType: string = 'general') {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AIMessage[]>([]);

  const getSystemPrompt = useCallback(() => {
    const type = documentType.toLowerCase();
    if (type.includes('protocol')) return systemPrompts.protocol;
    if (type.includes('csr') || type.includes('clinical study report')) return systemPrompts.csr;
    if (type.includes('ib') || type.includes('investigator')) return systemPrompts.ib;
    if (type.includes('2.5') || type.includes('overview')) return systemPrompts.module25;
    if (type.includes('2.7') || type.includes('summary')) return systemPrompts.module27;
    return systemPrompts.general;
  }, [documentType]);

  const callClaude = useCallback(async (userMessage: string): Promise<AIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          type: documentType || 'general',
          context: history.length > 0 ? `Previous conversation:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}` : '',
          maxTokens: 1500,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'AI service error');
      }
      
      const assistantMessage = data.content || '';

      // Update history
      setHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage }
      ]);

      return {
        content: assistantMessage,
        usage: data.usage
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getSystemPrompt, history]);

  const draftSection = useCallback(async (sectionTitle: string, context: string = '') => {
    const prompt = actionPrompts.draft(sectionTitle, context);
    return callClaude(prompt);
  }, [callClaude]);

  const summarizeSources = useCallback(async (sources: string) => {
    const prompt = actionPrompts.summarize(sources);
    return callClaude(prompt);
  }, [callClaude]);

  const checkConsistency = useCallback(async (content: string) => {
    const prompt = actionPrompts.consistency(content);
    return callClaude(prompt);
  }, [callClaude]);

  const improveClarity = useCallback(async (content: string) => {
    const prompt = actionPrompts.clarity(content);
    return callClaude(prompt);
  }, [callClaude]);

  const customPrompt = useCallback(async (prompt: string, context: string = '') => {
    const fullPrompt = actionPrompts.custom(prompt, context);
    return callClaude(fullPrompt);
  }, [callClaude]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    isLoading,
    error,
    history,
    draftSection,
    summarizeSources,
    checkConsistency,
    improveClarity,
    customPrompt,
    clearHistory,
  };
}

// Standalone component for AI response display
export function AIResponsePanel({ 
  response, 
  isLoading, 
  error,
  onInsert,
  onCopy 
}: { 
  response: string | null;
  isLoading: boolean;
  error: string | null;
  onInsert?: (text: string) => void;
  onCopy?: (text: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-sm text-purple-400">Generating response...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
        <p className="text-sm text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!response) return null;

  return (
    <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
      <div className="prose prose-sm prose-invert max-w-none">
        <div className="text-sm text-text-primary whitespace-pre-wrap">{response}</div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-500/20">
        {onInsert && (
          <button
            onClick={() => onInsert(response)}
            className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
          >
            Insert into document
          </button>
        )}
        {onCopy && (
          <button
            onClick={() => onCopy(response)}
            className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded hover:bg-surface-elevated"
          >
            Copy to clipboard
          </button>
        )}
      </div>
    </div>
  );
}
