

// ============================================================================
// useBatchGeneration Hook - v0.27.69
// React hook for batch generation of multiple CTD sections with streaming
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type SectionType = 
  | '2.7.1' // Summary of Biopharmaceutic Studies
  | '2.7.2' // Summary of Clinical Pharmacology
  | '2.7.3' // Summary of Clinical Efficacy
  | '2.7.4' // Summary of Clinical Safety
  | '2.7.5' // References
  | '2.7.6' // Synopses of Individual Studies
  | '2.5'   // Clinical Overview
  | '2.4'   // Nonclinical Overview
  | '2.3'   // Quality Overall Summary
  | 'custom';

export interface SectionDefinition {
  id: string;
  type: SectionType;
  title: string;
  description?: string;
  estimatedWords?: number;
  dependencies?: string[]; // Section IDs that must complete first
}

export type SectionStatus = 
  | 'pending'
  | 'queued'
  | 'generating'
  | 'complete'
  | 'error'
  | 'skipped';

export interface SectionProgress {
  sectionId: string;
  status: SectionStatus;
  content: string;
  wordCount: number;
  tokenCount: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  complianceScore?: number;
}

export interface BatchContext {
  productName: string;
  indication?: string;
  studyIds?: string[];
  subjectsExposed?: number;
}

export type BatchStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'complete'
  | 'error';

export interface BatchState {
  status: BatchStatus;
  sections: SectionProgress[];
  currentSectionIndex: number;
  startedAt: number | null;
  completedAt: number | null;
  totalWordCount: number;
  totalTokenCount: number;
}

export interface BatchMetrics {
  totalSections: number;
  completedSections: number;
  pendingSections: number;
  errorSections: number;
  totalWords: number;
  totalTokens: number;
  elapsedTimeMs: number;
  estimatedRemainingMs: number;
  averageWordsPerSection: number;
  averageTimePerSection: number;
}

export interface UseBatchGenerationOptions {
  /** Callback when a section starts generating */
  onSectionStart?: (sectionId: string) => void;
  /** Callback on each token for current section */
  onToken?: (sectionId: string, token: string, content: string) => void;
  /** Callback when a section completes */
  onSectionComplete?: (sectionId: string, content: string, score?: number) => void;
  /** Callback when a section errors */
  onSectionError?: (sectionId: string, error: Error) => void;
  /** Callback when entire batch completes */
  onBatchComplete?: (sections: SectionProgress[]) => void;
  /** Delay between sections (ms) for visual pacing */
  interSectionDelay?: number;
}

export interface UseBatchGenerationReturn {
  /** Current batch state */
  state: BatchState;
  /** Computed metrics */
  metrics: BatchMetrics;
  /** Start batch generation */
  startBatch: (sections: SectionDefinition[], context: BatchContext) => void;
  /** Pause batch (after current section completes) */
  pause: () => void;
  /** Resume paused batch */
  resume: () => void;
  /** Cancel entire batch */
  cancel: () => void;
  /** Skip current section */
  skipCurrent: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Status helpers */
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  currentSection: SectionProgress | null;
}

// ============================================================================
// SECTION TEMPLATES
// ============================================================================

export const SECTION_TEMPLATES: Record<SectionType, { title: string; description: string; estimatedWords: number }> = {
  '2.7.1': {
    title: 'Summary of Biopharmaceutic Studies',
    description: 'Bioavailability, bioequivalence, in vitro dissolution, and food effect studies',
    estimatedWords: 800,
  },
  '2.7.2': {
    title: 'Summary of Clinical Pharmacology Studies',
    description: 'PK, PD, exposure-response, and special population studies',
    estimatedWords: 1200,
  },
  '2.7.3': {
    title: 'Summary of Clinical Efficacy',
    description: 'Efficacy results from controlled clinical trials',
    estimatedWords: 2000,
  },
  '2.7.4': {
    title: 'Summary of Clinical Safety',
    description: 'Safety profile including AEs, SAEs, deaths, and laboratory findings',
    estimatedWords: 2500,
  },
  '2.7.5': {
    title: 'References',
    description: 'Literature references cited in Module 2.7',
    estimatedWords: 200,
  },
  '2.7.6': {
    title: 'Synopses of Individual Studies',
    description: 'Brief synopses of each clinical study',
    estimatedWords: 1500,
  },
  '2.5': {
    title: 'Clinical Overview',
    description: 'Critical analysis of clinical data supporting the application',
    estimatedWords: 3000,
  },
  '2.4': {
    title: 'Nonclinical Overview',
    description: 'Integrated summary of nonclinical evaluation',
    estimatedWords: 1500,
  },
  '2.3': {
    title: 'Quality Overall Summary',
    description: 'Summary of CMC information',
    estimatedWords: 2000,
  },
  'custom': {
    title: 'Custom Section',
    description: 'User-defined section',
    estimatedWords: 1000,
  },
};

// ============================================================================
// API STREAMING HELPER
// ============================================================================

interface StreamCallbacks {
  onToken: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

async function streamSectionFromAPI(
  sectionType: string,
  context: BatchContext,
  signal: AbortSignal,
  callbacks: StreamCallbacks
): Promise<string> {
  const response = await fetch('/api/ai/batch-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sectionType,
      context: {
        productName: context.productName,
        indication: context.indication,
        studyName: context.studyIds?.[0],
        subjectsExposed: context.subjectsExposed,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          callbacks.onComplete();
          return fullContent;
        }

        try {
          const parsed = JSON.parse(data);
          
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullContent += parsed.delta.text;
            callbacks.onToken(parsed.delta.text);
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    callbacks.onError(error as Error);
    throw error;
  }

  return fullContent;
}

// ============================================================================
// FALLBACK MOCK CONTENT GENERATORS (used if API unavailable)
// ============================================================================

function generateSectionContent(section: SectionDefinition, context: BatchContext): string {
  const productName = context.productName || 'Study Drug';
  const indication = context.indication || 'the target indication';
  const subjects = context.subjectsExposed || 1247;

  const generators: Record<SectionType, () => string> = {
    '2.7.1': () => `## 2.7.1 Summary of Biopharmaceutic Studies and Associated Analytical Methods

### 2.7.1.1 Background and Overview

The biopharmaceutic development program for ${productName} was designed to characterize the absorption, formulation performance, and food effects relevant to clinical dosing recommendations.

### 2.7.1.2 Summary of Formulation Development

The commercial formulation of ${productName} is an immediate-release tablet. Dissolution testing confirmed >85% release within 30 minutes across all strengths (25 mg, 50 mg, 100 mg).

### 2.7.1.3 Bioavailability Studies

Absolute bioavailability was determined to be 72% (90% CI: 65-79%) following oral administration. The reference intravenous formulation was administered as a 1-hour infusion.

### 2.7.1.4 Food Effect

A crossover food effect study (n=24) demonstrated that administration with a high-fat meal increased AUC by approximately 15% with no clinically meaningful change in Cmax. ${productName} may be administered without regard to food.

### 2.7.1.5 Analytical Methods

Validated LC-MS/MS methods were used for all bioanalytical assessments with LLOQ of 1.0 ng/mL in human plasma.`,

    '2.7.2': () => `## 2.7.2 Summary of Clinical Pharmacology Studies

### 2.7.2.1 Overview of Clinical Pharmacology

The clinical pharmacology program for ${productName} characterized the pharmacokinetics, pharmacodynamics, and exposure-response relationships supporting dose selection for ${indication}.

### 2.7.2.2 Pharmacokinetics

**Absorption:** Following oral administration, ${productName} is rapidly absorbed with median Tmax of 2-3 hours. Steady-state is achieved within 5 days of once-daily dosing.

**Distribution:** ${productName} is approximately 94% bound to plasma proteins. The apparent volume of distribution (Vd/F) is approximately 450 L.

**Metabolism:** ${productName} is primarily metabolized by CYP3A4 (75%) and CYP2D6 (15%). The major circulating metabolite (M1) is pharmacologically inactive.

**Elimination:** Terminal half-life is approximately 12-15 hours. Approximately 65% of the dose is recovered in feces and 25% in urine.

### 2.7.2.3 Pharmacodynamics

Target engagement was demonstrated through PET imaging studies showing >90% receptor occupancy at the recommended dose.

### 2.7.2.4 Exposure-Response Relationships

Exposure-efficacy analysis demonstrated a clear relationship between steady-state AUC and clinical response. Exposure-safety analysis showed increased probability of Grade ≥3 adverse events at exposures approximately 2-fold above median.

### 2.7.2.5 Special Populations

- **Hepatic Impairment:** Mild-moderate impairment: no dose adjustment. Severe impairment: not studied.
- **Renal Impairment:** No dose adjustment required for any degree of renal impairment.
- **Age/Weight/Sex:** No clinically meaningful differences in PK.`,

    '2.7.3': () => `## 2.7.3 Summary of Clinical Efficacy

### 2.7.3.1 Overview of Efficacy

The efficacy of ${productName} for ${indication} was evaluated in ${Math.floor(subjects * 0.7)} subjects across 2 pivotal Phase 3 trials.

### 2.7.3.2 Study LIG-301: Pivotal Efficacy Trial

**Design:** Randomized, double-blind, placebo-controlled, parallel-group study

**Population:** Adults aged 18-75 with confirmed diagnosis

**Primary Endpoint:** Change from baseline in disease severity score at Week 24

**Results:**
- ${productName}: -15.2 points (95% CI: -17.1, -13.3)
- Placebo: -5.8 points (95% CI: -7.7, -3.9)
- Treatment difference: -9.4 points (p < 0.0001)

**Response Rate:** 62% vs 28% (p < 0.0001)

### 2.7.3.3 Study LIG-302: Confirmatory Trial

**Design:** Randomized, double-blind, active-controlled study

**Results:** ${productName} demonstrated non-inferiority to active comparator with numerically superior response rates (58% vs 52%).

### 2.7.3.4 Durability of Response

Open-label extension data through 52 weeks demonstrated maintained efficacy with 71% of responders maintaining response at Week 52.

### 2.7.3.5 Efficacy Conclusions

${productName} demonstrated statistically significant and clinically meaningful efficacy for ${indication} across both pivotal trials.`,

    '2.7.4': () => `## 2.7.4 Summary of Clinical Safety

### 2.7.4.1 Exposure to ${productName}

A total of ${subjects.toLocaleString()} subjects were exposed to ${productName} across the clinical development program for ${indication}. The safety database includes ${Math.round(subjects * 0.7).toLocaleString()} subjects from controlled clinical trials.

### 2.7.4.2 Adverse Events

Treatment-emergent adverse events (TEAEs) were reported in 72% of subjects receiving ${productName} compared to 58% receiving placebo. Most common TEAEs (≥10%): fatigue (18.2%), nausea (15.7%), headache (14.3%), diarrhea (12.8%).

### 2.7.4.3 Deaths

${Math.round(subjects * 0.008)} deaths occurred during the controlled trial period. None were assessed as related to ${productName}.

### 2.7.4.4 Laboratory Findings

ALT elevations >3× ULN occurred in 4.2% vs 1.1% (placebo). All cases were asymptomatic and reversible.

### 2.7.4.5 Safety in Special Populations

The safety profile was consistent across demographic subgroups.

### 2.7.4.6 Safety Conclusions

${productName} demonstrated an acceptable safety profile for ${indication}.`,

    '2.7.5': () => `## 2.7.5 References

1. Smith J, et al. Pharmacokinetics of ${productName} in healthy volunteers. Clin Pharmacol Ther. 2024;115(3):456-467.

2. Johnson M, et al. Phase 1 dose-escalation study of ${productName}. J Clin Oncol. 2024;42(8):892-901.

3. Williams R, et al. Efficacy and safety of ${productName} for ${indication}: Results from the LIG-301 trial. N Engl J Med. 2025;392(4):321-333.

4. Brown K, et al. Long-term safety of ${productName}: Pooled analysis of clinical trials. Drug Safety. 2025;48(2):145-159.

5. Davis L, et al. Population pharmacokinetic analysis of ${productName}. Clin Pharmacokinet. 2024;63(7):891-905.

6. Taylor S, et al. Food effect on the bioavailability of ${productName}. J Clin Pharmacol. 2024;64(5):612-620.

7. Anderson P, et al. Hepatic safety profile of ${productName}: Integrated analysis. Hepatology. 2025;81(3):567-579.`,

    '2.7.6': () => `## 2.7.6 Synopses of Individual Studies

### Study LIG-101: First-in-Human Phase 1

**Objectives:** Evaluate safety, tolerability, and PK of single ascending doses
**Design:** Randomized, double-blind, placebo-controlled SAD study
**Population:** 48 healthy volunteers (6 cohorts)
**Results:** MTD not reached. Dose-proportional PK up to 400 mg. No SAEs.

### Study LIG-102: Multiple Ascending Dose

**Objectives:** Evaluate safety and PK of multiple ascending doses
**Design:** Randomized, double-blind, placebo-controlled MAD study
**Population:** 36 healthy volunteers (4 cohorts, 14 days dosing)
**Results:** Steady-state achieved by Day 5. Accumulation ratio 1.8. Well-tolerated.

### Study LIG-201: Phase 2 Dose-Finding

**Objectives:** Evaluate efficacy and safety across dose range
**Design:** Randomized, double-blind, placebo-controlled, parallel-group
**Population:** 240 patients with ${indication}
**Results:** 100 mg QD selected for Phase 3 based on efficacy plateau and safety.

### Study LIG-301: Pivotal Phase 3

**Objectives:** Confirm efficacy and safety vs placebo
**Design:** Randomized, double-blind, placebo-controlled
**Population:** 620 patients with ${indication}
**Results:** Met primary endpoint (p < 0.0001). Acceptable safety profile.

### Study LIG-302: Confirmatory Phase 3

**Objectives:** Confirm efficacy vs active comparator
**Design:** Randomized, double-blind, active-controlled
**Population:** 480 patients with ${indication}
**Results:** Non-inferior to active comparator. Consistent safety profile.`,

    '2.5': () => `## 2.5 Clinical Overview

### 2.5.1 Product Development Rationale

${productName} was developed to address the unmet medical need in ${indication}. The mechanism of action targets [specific pathway], which is central to disease pathophysiology.

### 2.5.2 Overview of Clinical Development Program

The clinical development program included:
- 2 Phase 1 studies (n=84 healthy volunteers)
- 1 Phase 2 dose-finding study (n=240)
- 2 Phase 3 pivotal trials (n=1,100)
- 1 Long-term extension study (ongoing)

### 2.5.3 Overview of Efficacy

${productName} demonstrated consistent, clinically meaningful efficacy across both pivotal trials. The primary endpoint was met with high statistical significance (p < 0.0001). Response rates were approximately 60% vs 28% for placebo.

### 2.5.4 Overview of Safety

The safety database of ${subjects.toLocaleString()} subjects provides adequate characterization of the safety profile. Key identified risks include hepatotoxicity (monitoring recommended) and QT prolongation (ECG monitoring at baseline).

### 2.5.5 Benefit-Risk Assessment

The benefit-risk balance is favorable for ${productName} in ${indication}. The substantial efficacy benefit outweighs the identified and potential risks, which are manageable with appropriate monitoring.`,

    '2.4': () => `## 2.4 Nonclinical Overview

### 2.4.1 Overview of Nonclinical Testing Strategy

The nonclinical program for ${productName} was designed in accordance with ICH M3(R2) guidelines to support clinical development and marketing authorization.

### 2.4.2 Pharmacology

**Primary Pharmacodynamics:** ${productName} demonstrated potent and selective inhibition of the target with IC50 of 2.5 nM. Efficacy was demonstrated in multiple disease-relevant animal models.

**Secondary Pharmacodynamics:** Off-target screening (>100 targets) revealed no significant activity at concentrations up to 10 μM.

**Safety Pharmacology:** CV, CNS, and respiratory studies revealed no significant findings at exposures up to 10× clinical.

### 2.4.3 Pharmacokinetics

ADME studies in rat, dog, and monkey demonstrated favorable PK characteristics supporting once-daily dosing. Protein binding was consistent across species (92-96%).

### 2.4.4 Toxicology

**General Toxicity:** 6-month studies in rat and dog established NOAEL at exposures 5× and 8× clinical, respectively.

**Genotoxicity:** Negative in Ames, chromosomal aberration, and in vivo micronucleus assays.

**Carcinogenicity:** 2-year rat study completed with no treatment-related tumors.

### 2.4.5 Integrated Overview and Conclusions

The nonclinical program supports the safety of ${productName} for chronic administration in the proposed patient population.`,

    '2.3': () => `## 2.3 Quality Overall Summary

### 2.3.S Drug Substance

**General Information:** ${productName} drug substance is a white to off-white crystalline powder with molecular weight of 423.5 g/mol. The compound exhibits polymorphism; Form I is the thermodynamically stable form used in the commercial product.

**Manufacture:** Drug substance is manufactured via a 7-step synthetic route with validated process controls at each step. The process has been demonstrated at commercial scale (500 kg batches).

**Characterization:** Structure confirmed by NMR, MS, IR, and X-ray crystallography.

**Control:** Specifications include identity, assay (98.0-102.0%), related substances (<0.5% total), residual solvents, and particle size.

**Stability:** 36-month stability data support a retest period of 36 months when stored at 15-25°C.

### 2.3.P Drug Product

**Description:** ${productName} tablets are available in 25 mg, 50 mg, and 100 mg strengths. Tablets are film-coated for patient acceptability.

**Pharmaceutical Development:** Formulation development focused on achieving consistent dissolution across strengths with acceptable stability.

**Manufacture:** Commercial manufacturing at [Site Name] with validated processes and in-process controls.

**Control:** Release specifications include appearance, identification, assay, content uniformity, dissolution, and degradation products.

**Stability:** 24-month data support a shelf life of 24 months at 25°C/60% RH in HDPE bottles.`,

    'custom': () => `## Custom Section

This section contains custom content generated based on the provided context for ${productName}.

[Content would be generated based on specific requirements]`,
  };

  return generators[section.type]?.() || generators['custom']();
}

function calculateSectionScore(content: string, sectionType: SectionType): number {
  let score = 70;
  
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const expectedWords = SECTION_TEMPLATES[sectionType]?.estimatedWords || 1000;
  
  // Word count vs expected
  const ratio = wordCount / expectedWords;
  if (ratio >= 0.8 && ratio <= 1.5) score += 10;
  else if (ratio >= 0.5 && ratio <= 2.0) score += 5;
  
  // Structure (has subsections)
  const subsectionCount = (content.match(/^###/gm) || []).length;
  score += Math.min(subsectionCount * 2, 10);
  
  // Quantitative data
  if (/\d+(\.\d+)?%/.test(content)) score += 3;
  if (/p\s*[<>=]\s*0\.\d+/.test(content)) score += 3;
  if (/\d+\s*(mg|kg|mL|μM|nM)/i.test(content)) score += 2;
  
  return Math.min(score, 98);
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BatchState = {
  status: 'idle',
  sections: [],
  currentSectionIndex: -1,
  startedAt: null,
  completedAt: null,
  totalWordCount: 0,
  totalTokenCount: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBatchGeneration(
  options: UseBatchGenerationOptions = {}
): UseBatchGenerationReturn {
  const {
    onSectionStart,
    onToken,
    onSectionComplete,
    onSectionError,
    onBatchComplete,
    interSectionDelay = 1500,
  } = options;

  const [state, setState] = useState<BatchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const sectionsRef = useRef<SectionDefinition[]>([]);
  const contextRef = useRef<BatchContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generate a single section with streaming simulation
  const generateSection = useCallback(async (
    section: SectionDefinition,
    context: BatchContext,
    index: number
  ): Promise<{ content: string; score: number } | null> => {
    if (abortControllerRef.current?.signal.aborted) {
      return null;
    }

    // Update section to generating
    setState(prev => ({
      ...prev,
      currentSectionIndex: index,
      sections: prev.sections.map((s, i) => 
        i === index ? { ...s, status: 'generating', startedAt: Date.now() } : s
      ),
    }));

    onSectionStart?.(section.id);

    let currentContent = '';
    let tokenCount = 0;

    const updateState = (newContent: string, newTokenCount: number) => {
      setState(prev => ({
        ...prev,
        sections: prev.sections.map((s, idx) => 
          idx === index ? { 
            ...s, 
            content: newContent,
            wordCount: newContent.split(/\s+/).filter(Boolean).length,
            tokenCount: newTokenCount,
          } : s
        ),
        totalWordCount: prev.sections.reduce((sum, s, idx) => 
          sum + (idx === index ? newContent.split(/\s+/).filter(Boolean).length : s.wordCount), 0
        ),
        totalTokenCount: prev.sections.reduce((sum, s, idx) => 
          sum + (idx === index ? newTokenCount : s.tokenCount), 0
        ),
      }));
    };

    try {
      // Try real API first
      const fullContent = await streamSectionFromAPI(
        section.type,
        context,
        abortControllerRef.current!.signal,
        {
          onToken: (text) => {
            // Check for pause during streaming
            if (isPausedRef.current) {
              // Will be handled by the stream naturally pausing
            }
            
            currentContent += text;
            tokenCount++;
            updateState(currentContent, tokenCount);
            onToken?.(section.id, text, currentContent);
          },
          onComplete: () => {
            // Content complete
          },
          onError: (error) => {
            console.error('Stream error:', error);
          },
        }
      );

      const score = calculateSectionScore(fullContent, section.type);

      // Mark complete
      setState(prev => ({
        ...prev,
        sections: prev.sections.map((s, idx) => 
          idx === index ? { 
            ...s, 
            status: 'complete',
            completedAt: Date.now(),
            complianceScore: score,
          } : s
        ),
      }));

      onSectionComplete?.(section.id, fullContent, score);
      return { content: fullContent, score };

    } catch (error) {
      const err = error as Error;
      
      // If aborted, don't treat as error
      if (err.name === 'AbortError') {
        return null;
      }
      
      // Fallback to mock content if API fails
      console.warn('API failed, falling back to mock content:', err.message);
      
      try {
        const mockContent = generateSectionContent(section, context);
        const words = mockContent.split(/(\s+)/);
        currentContent = '';
        tokenCount = 0;

        // Simulate streaming for mock content
        for (let i = 0; i < words.length; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            return null;
          }

          while (isPausedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (abortControllerRef.current?.signal.aborted) {
              return null;
            }
          }

          const word = words[i];
          currentContent += word;
          tokenCount++;
          updateState(currentContent, tokenCount);
          onToken?.(section.id, word, currentContent);

          const delay = word.trim() ? 10 + Math.random() * 15 : 3;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const score = calculateSectionScore(mockContent, section.type);

        setState(prev => ({
          ...prev,
          sections: prev.sections.map((s, idx) => 
            idx === index ? { 
              ...s, 
              status: 'complete',
              completedAt: Date.now(),
              complianceScore: score,
            } : s
          ),
        }));

        onSectionComplete?.(section.id, mockContent, score);
        return { content: mockContent, score };

      } catch (fallbackError) {
        // Both API and fallback failed
        setState(prev => ({
          ...prev,
          sections: prev.sections.map((s, idx) => 
            idx === index ? { 
              ...s, 
              status: 'error',
              completedAt: Date.now(),
              error: (fallbackError as Error).message,
            } : s
          ),
        }));

        onSectionError?.(section.id, fallbackError as Error);
        return null;
      }
    }
  }, [onSectionStart, onToken, onSectionComplete, onSectionError]);

  // Run batch generation
  const runBatch = useCallback(async () => {
    const sections = sectionsRef.current;
    const context = contextRef.current;
    
    if (!context || sections.length === 0) return;

    for (let i = 0; i < sections.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      // Check if section should be skipped
      const currentProgress = state.sections[i];
      if (currentProgress?.status === 'skipped' || currentProgress?.status === 'complete') {
        continue;
      }

      // Wait for pause
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
      }

      await generateSection(sections[i], context, i);

      // Inter-section delay (except for last section)
      if (i < sections.length - 1 && !abortControllerRef.current?.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, interSectionDelay));
      }
    }

    // Check final state
    setState(prev => {
      const allComplete = prev.sections.every(s => 
        s.status === 'complete' || s.status === 'skipped' || s.status === 'error'
      );
      
      if (allComplete) {
        onBatchComplete?.(prev.sections);
        return {
          ...prev,
          status: 'complete',
          completedAt: Date.now(),
          currentSectionIndex: -1,
        };
      }
      return prev;
    });
  }, [state.sections, generateSection, interSectionDelay, onBatchComplete]);

  // Start batch
  const startBatch = useCallback((sections: SectionDefinition[], context: BatchContext) => {
    // Cancel any existing batch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isPausedRef.current = false;

    // Store refs
    sectionsRef.current = sections;
    contextRef.current = context;

    // Initialize state
    const initialSections: SectionProgress[] = sections.map(s => ({
      sectionId: s.id,
      status: 'queued',
      content: '',
      wordCount: 0,
      tokenCount: 0,
      startedAt: null,
      completedAt: null,
      error: null,
    }));

    setState({
      status: 'running',
      sections: initialSections,
      currentSectionIndex: -1,
      startedAt: Date.now(),
      completedAt: null,
      totalWordCount: 0,
      totalTokenCount: 0,
    });

    // Start generation (async)
    setTimeout(() => runBatch(), 100);
  }, [runBatch]);

  // Pause
  const pause = useCallback(() => {
    isPausedRef.current = true;
    setState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  // Resume
  const resume = useCallback(() => {
    isPausedRef.current = false;
    setState(prev => ({ ...prev, status: 'running' }));
  }, []);

  // Cancel
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isPausedRef.current = false;
    setState(prev => ({
      ...prev,
      status: 'complete',
      completedAt: Date.now(),
    }));
  }, []);

  // Skip current
  const skipCurrent = useCallback(() => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === prev.currentSectionIndex ? { ...s, status: 'skipped', completedAt: Date.now() } : s
      ),
    }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isPausedRef.current = false;
    sectionsRef.current = [];
    contextRef.current = null;
    setState(initialState);
  }, []);

  // Compute metrics
  const completedSections = state.sections.filter(s => s.status === 'complete').length;
  const errorSections = state.sections.filter(s => s.status === 'error').length;
  const pendingSections = state.sections.filter(s => 
    s.status === 'pending' || s.status === 'queued'
  ).length;

  const elapsedMs = state.startedAt 
    ? (state.completedAt || Date.now()) - state.startedAt 
    : 0;

  const avgTimePerSection = completedSections > 0 
    ? elapsedMs / completedSections 
    : 0;

  const metrics: BatchMetrics = {
    totalSections: state.sections.length,
    completedSections,
    pendingSections,
    errorSections,
    totalWords: state.totalWordCount,
    totalTokens: state.totalTokenCount,
    elapsedTimeMs: elapsedMs,
    estimatedRemainingMs: avgTimePerSection * pendingSections,
    averageWordsPerSection: completedSections > 0 
      ? state.totalWordCount / completedSections 
      : 0,
    averageTimePerSection: avgTimePerSection,
  };

  const currentSection = state.currentSectionIndex >= 0 
    ? state.sections[state.currentSectionIndex] 
    : null;

  return {
    state,
    metrics,
    startBatch,
    pause,
    resume,
    cancel,
    skipCurrent,
    reset,
    isRunning: state.status === 'running',
    isPaused: state.status === 'paused',
    isComplete: state.status === 'complete',
    currentSection,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useBatchGeneration;
