

// ============================================================================
// useSafetyNarrativeRAG Hook - v0.32.5
// React hook for RAG-powered Module 2.7.4 narrative generation with streaming
// Summary of Clinical Safety narrative for CTD submissions
// Now uses real AI API with demo fallback
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SimilarSignal {
  id: string;
  signalName: string;
  productName: string;
  soc: string; // System Organ Class
  ptTerm: string; // Preferred Term
  outcome: 'ongoing' | 'closed-confirmed' | 'closed-refuted';
  caseCount: number;
  score: number;
  matchedFactors: string[];
  narrativeExcerpt?: string;
}

export interface SimilarCase {
  id: string;
  caseNumber: string;
  productName: string;
  event: string;
  seriousness: 'serious' | 'non-serious';
  causality: 'certain' | 'probable' | 'possible' | 'unlikely' | 'unassessable';
  outcome: 'recovered' | 'recovering' | 'not-recovered' | 'fatal' | 'unknown';
  score: number;
  matchedTerms: string[];
}

export interface NarrativeRequest {
  /** Product name for the narrative */
  productName: string;
  /** Indication being studied */
  indication?: string;
  /** Specific safety signal to focus on (optional) */
  signalId?: string;
  signalName?: string;
  /** System Organ Class filter */
  soc?: string;
  /** Time period for safety data */
  periodStart?: string;
  periodEnd?: string;
  /** Total subjects exposed */
  subjectsExposed?: number;
  /** CTD section being generated */
  ctdSection?: string;
  /** Top K similar results to find */
  topK?: number;
}

export type NarrativeStatus = 
  | 'idle'
  | 'searching'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface NarrativeState {
  status: NarrativeStatus;
  similarSignals: SimilarSignal[];
  similarCases: SimilarCase[];
  generatedNarrative: string;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  isDemoMode?: boolean;
}

export interface NarrativeMetrics {
  searchTimeMs: number;
  streamTimeMs: number;
  totalTimeMs: number;
  tokenCount: number;
  wordCount: number;
  signalCount: number;
  caseCount: number;
}

export interface UseSafetyNarrativeRAGOptions {
  /** Callback when similar signals/cases are found */
  onSimilarFound?: (signals: SimilarSignal[], cases: SimilarCase[]) => void;
  /** Callback on each token received */
  onToken?: (token: string, fullContent: string) => void;
  /** Callback when generation completes */
  onComplete?: (narrative: string, signals: SimilarSignal[], cases: SimilarCase[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseSafetyNarrativeRAGReturn {
  /** Current RAG state */
  state: NarrativeState;
  /** Computed metrics */
  metrics: NarrativeMetrics;
  /** Find similar signals/cases only (no generation) */
  findSimilar: (request: NarrativeRequest) => Promise<{ signals: SimilarSignal[]; cases: SimilarCase[] }>;
  /** Find similar and generate narrative with streaming */
  generateNarrative: (request: NarrativeRequest) => Promise<void>;
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

const initialState: NarrativeState = {
  status: 'idle',
  similarSignals: [],
  similarCases: [],
  generatedNarrative: '',
  error: null,
  startedAt: null,
  completedAt: null,
  isDemoMode: false,
};

// ============================================================================
// DEMO MODE CONTENT
// ============================================================================

function generateDemoNarrative(request: NarrativeRequest): string {
  const productName = request.productName || 'Study Drug';
  const indication = request.indication || 'the target indication';
  const subjects = request.subjectsExposed || 1247;
  
  return `## 2.7.4 Summary of Clinical Safety

### 2.7.4.1 Exposure to ${productName}

A total of ${subjects.toLocaleString()} subjects were exposed to ${productName} across the clinical development program for ${indication}. The safety database includes ${Math.round(subjects * 0.7).toLocaleString()} subjects from controlled clinical trials and ${Math.round(subjects * 0.3).toLocaleString()} subjects from open-label extension studies.

The extent of exposure was adequate to characterize the safety profile of ${productName}:
- Median duration of exposure: 24.3 weeks (range: 1 day to 156 weeks)
- ${Math.round(subjects * 0.45).toLocaleString()} subjects (${((subjects * 0.45 / subjects) * 100).toFixed(1)}%) exposed for ≥6 months
- ${Math.round(subjects * 0.28).toLocaleString()} subjects (${((subjects * 0.28 / subjects) * 100).toFixed(1)}%) exposed for ≥12 months

### 2.7.4.2 Adverse Events

**Overall Adverse Event Profile**

Treatment-emergent adverse events (TEAEs) were reported in ${((subjects * 0.72 / subjects) * 100).toFixed(1)}% of subjects receiving ${productName} compared to ${((subjects * 0.58 / subjects) * 100).toFixed(1)}% of subjects receiving placebo. The most frequently reported TEAEs (≥10% incidence) in the ${productName} group were:

1. Fatigue (18.2% vs 12.1% placebo)
2. Nausea (15.7% vs 8.3% placebo)
3. Headache (14.3% vs 11.9% placebo)
4. Diarrhea (12.8% vs 6.4% placebo)

The majority of TEAEs were mild to moderate in severity and did not require treatment discontinuation.

**Serious Adverse Events**

Serious adverse events (SAEs) were reported in ${((subjects * 0.089 / subjects) * 100).toFixed(1)}% of subjects receiving ${productName} compared to ${((subjects * 0.067 / subjects) * 100).toFixed(1)}% of subjects receiving placebo. No single SAE occurred at an incidence ≥2% in either treatment group. The most common SAEs in the ${productName} group were pneumonia (0.8%), acute kidney injury (0.5%), and cardiac arrhythmia (0.4%).

### 2.7.4.3 Deaths

A total of ${Math.round(subjects * 0.008)} deaths occurred during the controlled clinical trial period, with ${Math.round(subjects * 0.005)} deaths in the ${productName} group and ${Math.round(subjects * 0.003)} deaths in the placebo group. The causes of death in the ${productName} group included disease progression (n=${Math.round(subjects * 0.003)}), cardiac events (n=${Math.round(subjects * 0.001)}), and other causes (n=${Math.round(subjects * 0.001)}). None of the deaths in the ${productName} group were assessed by the investigator as related to study treatment.

### 2.7.4.4 Laboratory Findings

**Hepatic Safety**

Elevations in alanine aminotransferase (ALT) >3× ULN occurred in 4.2% of subjects receiving ${productName} compared to 1.1% receiving placebo. Grade 3 ALT elevations (>5× ULN) were observed in 1.8% vs 0.3%, respectively. All cases were asymptomatic and reversible upon dose modification or treatment discontinuation. The median time to onset of ALT elevation was 8 weeks (range: 2-24 weeks).

No cases met Hy's Law criteria (ALT >3× ULN with bilirubin >2× ULN without alternative etiology). Hepatic monitoring recommendations have been incorporated into the proposed labeling.

**Hematologic Parameters**

Decreases in neutrophil count <1.0 × 10⁹/L occurred in 2.1% of subjects receiving ${productName} compared to 0.4% receiving placebo. Grade 4 neutropenia (<0.5 × 10⁹/L) was rare (0.3% vs 0%). Neutropenia was generally transient and manageable with dose modifications.

### 2.7.4.5 Safety in Special Populations

**Age**
The safety profile of ${productName} was generally consistent across age subgroups (<65 years, 65-74 years, ≥75 years). Elderly subjects (≥75 years) showed slightly higher rates of fatigue and dizziness but no increase in serious adverse events.

**Hepatic Impairment**
Subjects with mild-to-moderate hepatic impairment (Child-Pugh A/B) showed similar safety profiles to subjects with normal hepatic function. ${productName} has not been studied in subjects with severe hepatic impairment (Child-Pugh C).

**Renal Impairment**
No dose adjustment is required for subjects with mild-to-moderate renal impairment (eGFR 30-89 mL/min/1.73m²). Limited data are available in subjects with severe renal impairment.

### 2.7.4.6 Post-Marketing Safety (if applicable)

Based on post-marketing surveillance data, the safety profile of ${productName} remains consistent with observations from clinical trials. No new safety signals have been identified.

### 2.7.4.7 Safety Conclusions

${productName} demonstrated an acceptable safety profile for the treatment of ${indication}. The identified risks include:
- Hepatotoxicity (requires monitoring)
- Neutropenia (requires monitoring)
- Gastrointestinal events (manageable)

These risks are manageable with appropriate monitoring and dose modifications as outlined in the proposed labeling. The benefit-risk assessment supports approval for the proposed indication.`;
}

function generateDemoSimilarSignals(request: NarrativeRequest): SimilarSignal[] {
  return [
    {
      id: 'sig-001',
      signalName: 'Hepatotoxicity Signal',
      productName: 'Sotorasib (Same Class)',
      soc: 'Hepatobiliary disorders',
      ptTerm: 'Drug-induced liver injury',
      outcome: 'closed-confirmed',
      caseCount: 47,
      score: 92,
      matchedFactors: ['Same drug class', 'Same SOC', 'Similar mechanism'],
      narrativeExcerpt: 'A cumulative review of hepatic events identified 47 cases of DILI...',
    },
    {
      id: 'sig-002',
      signalName: 'ILD/Pneumonitis',
      productName: 'Adagrasib (Same Class)',
      soc: 'Respiratory disorders',
      ptTerm: 'Interstitial lung disease',
      outcome: 'ongoing',
      caseCount: 23,
      score: 85,
      matchedFactors: ['Same drug class', 'Known class effect'],
    },
    {
      id: 'sig-003',
      signalName: 'QT Prolongation',
      productName: request.productName,
      soc: 'Cardiac disorders',
      ptTerm: 'Electrocardiogram QT prolonged',
      outcome: 'closed-refuted',
      caseCount: 8,
      score: 78,
      matchedFactors: ['Same product', 'Evaluated in Phase 3'],
    },
  ];
}

function generateDemoSimilarCases(request: NarrativeRequest): SimilarCase[] {
  return [
    {
      id: 'case-001',
      caseNumber: 'US-LIG-2025-04821',
      productName: request.productName,
      event: 'Drug-induced liver injury',
      seriousness: 'serious',
      causality: 'probable',
      outcome: 'recovered',
      score: 94,
      matchedTerms: ['hepatotoxicity', 'ALT increased', 'same product'],
    },
    {
      id: 'case-002',
      caseNumber: 'EU-LIG-2025-02847',
      productName: request.productName,
      event: 'Interstitial lung disease',
      seriousness: 'serious',
      causality: 'possible',
      outcome: 'recovering',
      score: 87,
      matchedTerms: ['pneumonitis', 'dyspnea', 'same product'],
    },
    {
      id: 'case-003',
      caseNumber: 'US-LIG-2025-03192',
      productName: 'Sotorasib',
      event: 'Hepatic enzyme increased',
      seriousness: 'non-serious',
      causality: 'probable',
      outcome: 'recovered',
      score: 82,
      matchedTerms: ['ALT increased', 'same drug class'],
    },
  ];
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSafetyNarrativeRAG(
  options: UseSafetyNarrativeRAGOptions = {}
): UseSafetyNarrativeRAGReturn {
  const {
    onSimilarFound,
    onToken,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<NarrativeState>(initialState);
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

  // Find similar signals/cases only (no generation)
  const findSimilar = useCallback(async (
    request: NarrativeRequest
  ): Promise<{ signals: SimilarSignal[]; cases: SimilarCase[] }> => {
    setState(prev => ({ ...prev, status: 'searching', startedAt: Date.now() }));
    
    try {
      // Try real API first
      const response = await fetch('/api/ai/safety-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, searchOnly: true }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.similarSignals && data.similarCases) {
          const signals = data.similarSignals;
          const cases = data.similarCases;
          setState(prev => ({
            ...prev,
            status: 'complete',
            similarSignals: signals,
            similarCases: cases,
            completedAt: Date.now(),
          }));
          return { signals, cases };
        }
      }

      // Fallback to demo data
      const signals = generateDemoSimilarSignals(request);
      const cases = generateDemoSimilarCases(request);
      
      setState(prev => ({
        ...prev,
        status: 'complete',
        similarSignals: signals,
        similarCases: cases,
        completedAt: Date.now(),
        isDemoMode: true,
      }));
      
      return { signals, cases };
    } catch (err) {
      const error = err as Error;
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
        completedAt: Date.now(),
      }));
      onError?.(error);
      throw err;
    }
  }, [onError]);

  // Stream demo content character by character
  const streamDemoContent = useCallback(async (
    content: string,
    signals: SimilarSignal[],
    cases: SimilarCase[]
  ): Promise<void> => {
    const chars = content.split('');
    let accumulated = '';
    
    for (let i = 0; i < chars.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        setState(prev => ({ ...prev, status: 'cancelled', completedAt: Date.now() }));
        return;
      }
      
      accumulated += chars[i];
      tokenCountRef.current++;
      
      if (i % 3 === 0 || i === chars.length - 1) {
        fullContentRef.current = accumulated;
        setState(prev => ({ ...prev, generatedNarrative: accumulated }));
        onToken?.(chars[i], accumulated);
        await new Promise(resolve => setTimeout(resolve, 2));
      }
    }
    
    setState(prev => ({
      ...prev,
      status: 'complete',
      completedAt: Date.now(),
    }));
    
    onComplete?.(accumulated, signals, cases);
  }, [onToken, onComplete]);

  // Generate narrative with streaming
  const generateNarrative = useCallback(async (request: NarrativeRequest): Promise<void> => {
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

    try {
      const response = await fetch('/api/ai/safety-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      // Check for demo mode response
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          if (errorData.demo) {
            // Use demo mode with mock signals/cases
            const signals = errorData.similarSignals || generateDemoSimilarSignals(request);
            const cases = errorData.similarCases || generateDemoSimilarCases(request);
            
            setSearchEndTime(Date.now());
            setState(prev => ({
              ...prev,
              status: 'streaming',
              similarSignals: signals,
              similarCases: cases,
              isDemoMode: true,
            }));
            
            onSimilarFound?.(signals, cases);
            
            // Stream demo content
            const demoNarrative = generateDemoNarrative(request);
            await streamDemoContent(demoNarrative, signals, cases);
            return;
          }
          throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
        }
        throw new Error(`API error: ${response.status}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to demo
        const signals = generateDemoSimilarSignals(request);
        const cases = generateDemoSimilarCases(request);
        setSearchEndTime(Date.now());
        setState(prev => ({
          ...prev,
          status: 'streaming',
          similarSignals: signals,
          similarCases: cases,
          isDemoMode: true,
        }));
        onSimilarFound?.(signals, cases);
        await streamDemoContent(generateDemoNarrative(request), signals, cases);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let signals: SimilarSignal[] = [];
      let cases: SimilarCase[] = [];
      let hasStartedStreaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
              onComplete?.(fullContentRef.current, signals, cases);
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle metadata (similar signals/cases)
              if (parsed.type === 'metadata' && parsed.similarSignals) {
                signals = parsed.similarSignals;
                cases = parsed.similarCases || [];
                const now = Date.now();
                setSearchEndTime(now);
                
                setState(prev => ({
                  ...prev,
                  status: 'streaming',
                  similarSignals: signals,
                  similarCases: cases,
                }));
                
                onSimilarFound?.(signals, cases);
                continue;
              }

              // Handle Anthropic streaming format
              // content_block_delta: { type: "content_block_delta", delta: { type: "text_delta", text: "..." } }
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                if (!hasStartedStreaming) {
                  hasStartedStreaming = true;
                  setState(prev => ({ ...prev, status: 'streaming' }));
                }

                const text = parsed.delta.text;
                fullContentRef.current += text;
                tokenCountRef.current++;

                setState(prev => ({
                  ...prev,
                  generatedNarrative: fullContentRef.current,
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
                onComplete?.(fullContentRef.current, signals, cases);
              }
            } catch {
              // Non-JSON line, skip
            }
          }
        }
      }

      // Final state update if not already complete
      if (state.status !== 'complete') {
        setState(prev => ({
          ...prev,
          status: 'complete',
          completedAt: Date.now(),
        }));
        onComplete?.(fullContentRef.current, signals, cases);
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
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      }));
      
      onError?.(err);
    }
  }, [onSimilarFound, onToken, onComplete, onError, streamDemoContent]);

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

  // Reset to initial state
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
  const metrics: NarrativeMetrics = {
    searchTimeMs: searchEndTime && state.startedAt 
      ? searchEndTime - state.startedAt 
      : 0,
    streamTimeMs: searchEndTime && state.completedAt 
      ? state.completedAt - searchEndTime 
      : 0,
    totalTimeMs: state.startedAt && state.completedAt 
      ? state.completedAt - state.startedAt 
      : 0,
    tokenCount: tokenCountRef.current,
    wordCount: state.generatedNarrative.split(/\s+/).filter(Boolean).length,
    signalCount: state.similarSignals.length,
    caseCount: state.similarCases.length,
  };

  return {
    state,
    metrics,
    findSimilar,
    generateNarrative,
    cancel,
    reset,
    isSearching: state.status === 'searching',
    isStreaming: state.status === 'streaming',
    isComplete: state.status === 'complete',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
  };
} 
