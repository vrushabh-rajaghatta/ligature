
// ============================================================================
// useSafetyIntelligence Hook - v0.27.54
// React hook for AI-powered safety intelligence features
// ============================================================================

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface MedDRASuggestion {
  pt: string;
  ptCode: string;
  soc: string;
  socCode: string;
  confidence: number;
  matchType: 'exact' | 'synonym' | 'semantic';
}

export interface MedDRACodingResult {
  verbatimTerm: string;
  suggestions: MedDRASuggestion[];
  timestamp: string;
}

export interface CausalityResult {
  drugName: string;
  reactionTerm: string;
  assessment: string;
  confidence: number;
  reasoning: string[];
  naranjoScore: number;
  whoUmcCategory: string;
  timestamp: string;
}

export interface HistoricalCase {
  id: string;
  caseNumber: string;
  drugName: string;
  drugClass: string;
  reactionTerm: string;
  meddraCode: string;
  soc: string;
  seriousness: 'serious' | 'non-serious';
  outcome: string;
  causality: string;
  timeToOnset: string;
  dechallenge: string;
  narrativeSummary: string;
  regulatoryAction?: string;
}

export interface SimilarCaseResult {
  case: HistoricalCase;
  score: number;
  matchReasons: string[];
}

export interface SimilarCasesResult {
  query: {
    drugName?: string;
    reactionTerm?: string;
    soc?: string;
  };
  results: SimilarCaseResult[];
  totalCases: number;
  timestamp: string;
}

export interface SignalSummaryResult {
  signalId: string;
  signalName: string;
  drugName: string;
  caseCount: number;
  assessment: string;
  recommendation: string;
  keyFindings: string[];
  timestamp: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseSafetyIntelligenceReturn {
  // MedDRA Coding
  meddraResult: MedDRACodingResult | null;
  suggestMedDRA: (verbatimTerm: string, context?: string) => Promise<void>;
  meddraStatus: Status;
  
  // Causality Assessment
  causalityResult: CausalityResult | null;
  assessCausality: (params: {
    drugName: string;
    reactionTerm: string;
    timeToOnset?: string;
    dechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
    rechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
    alternativeCauses?: string[];
    labFindings?: string;
    priorKnowledge?: boolean;
    doseResponse?: boolean;
  }) => Promise<void>;
  causalityStatus: Status;
  
  // Similar Cases
  similarCasesResult: SimilarCasesResult | null;
  findSimilarCases: (params: {
    drugName?: string;
    reactionTerm?: string;
    soc?: string;
    seriousness?: 'serious' | 'non-serious';
    topK?: number;
  }) => Promise<void>;
  similarCasesStatus: Status;
  
  // Signal Summary
  signalSummaryResult: SignalSummaryResult | null;
  analyzeSignal: (params: {
    signalId: string;
    signalName: string;
    drugName: string;
    caseCount: number;
    prr?: number;
    ror?: number;
    recentCases?: Array<{
      caseNumber: string;
      outcome: string;
      causality: string;
    }>;
  }) => Promise<void>;
  signalSummaryStatus: Status;
  
  // General
  error: string | null;
  reset: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSafetyIntelligence(): UseSafetyIntelligenceReturn {
  // MedDRA state
  const [meddraResult, setMeddraResult] = useState<MedDRACodingResult | null>(null);
  const [meddraStatus, setMeddraStatus] = useState<Status>('idle');
  
  // Causality state
  const [causalityResult, setCausalityResult] = useState<CausalityResult | null>(null);
  const [causalityStatus, setCausalityStatus] = useState<Status>('idle');
  
  // Similar cases state
  const [similarCasesResult, setSimilarCasesResult] = useState<SimilarCasesResult | null>(null);
  const [similarCasesStatus, setSimilarCasesStatus] = useState<Status>('idle');
  
  // Signal summary state
  const [signalSummaryResult, setSignalSummaryResult] = useState<SignalSummaryResult | null>(null);
  const [signalSummaryStatus, setSignalSummaryStatus] = useState<Status>('idle');
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // MedDRA coding
  const suggestMedDRA = useCallback(async (verbatimTerm: string, context?: string) => {
    setMeddraStatus('loading');
    setError(null);
    
    try {
      const response = await fetch('/api/ai/safety-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'meddra-coding',
          verbatimTerm,
          context,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setMeddraResult(result);
      setMeddraStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MedDRA coding failed');
      setMeddraStatus('error');
    }
  }, []);

  // Causality assessment
  const assessCausality = useCallback(async (params: {
    drugName: string;
    reactionTerm: string;
    timeToOnset?: string;
    dechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
    rechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown';
    alternativeCauses?: string[];
    labFindings?: string;
    priorKnowledge?: boolean;
    doseResponse?: boolean;
  }) => {
    setCausalityStatus('loading');
    setError(null);
    
    try {
      const response = await fetch('/api/ai/safety-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'causality-assessment',
          ...params,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setCausalityResult(result);
      setCausalityStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Causality assessment failed');
      setCausalityStatus('error');
    }
  }, []);

  // Similar cases
  const findSimilarCases = useCallback(async (params: {
    drugName?: string;
    reactionTerm?: string;
    soc?: string;
    seriousness?: 'serious' | 'non-serious';
    topK?: number;
  }) => {
    setSimilarCasesStatus('loading');
    setError(null);
    
    try {
      const response = await fetch('/api/ai/safety-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'similar-cases',
          ...params,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSimilarCasesResult(result);
      setSimilarCasesStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Similar cases search failed');
      setSimilarCasesStatus('error');
    }
  }, []);

  // Signal summary
  const analyzeSignal = useCallback(async (params: {
    signalId: string;
    signalName: string;
    drugName: string;
    caseCount: number;
    prr?: number;
    ror?: number;
    recentCases?: Array<{
      caseNumber: string;
      outcome: string;
      causality: string;
    }>;
  }) => {
    setSignalSummaryStatus('loading');
    setError(null);
    
    try {
      const response = await fetch('/api/ai/safety-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signal-summary',
          ...params,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSignalSummaryResult(result);
      setSignalSummaryStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signal analysis failed');
      setSignalSummaryStatus('error');
    }
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setMeddraResult(null);
    setMeddraStatus('idle');
    setCausalityResult(null);
    setCausalityStatus('idle');
    setSimilarCasesResult(null);
    setSimilarCasesStatus('idle');
    setSignalSummaryResult(null);
    setSignalSummaryStatus('idle');
    setError(null);
  }, []);

  return {
    // MedDRA
    meddraResult,
    suggestMedDRA,
    meddraStatus,
    
    // Causality
    causalityResult,
    assessCausality,
    causalityStatus,
    
    // Similar cases
    similarCasesResult,
    findSimilarCases,
    similarCasesStatus,
    
    // Signal summary
    signalSummaryResult,
    analyzeSignal,
    signalSummaryStatus,
    
    // General
    error,
    reset,
  };
}

export default useSafetyIntelligence;
