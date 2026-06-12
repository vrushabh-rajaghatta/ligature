
/**
 * Demo Data Loader Service
 * 
 * Pre-loads sample CSR data into the RAG system for investor demos.
 * Supports both mock and production modes.
 * 
 * @version 0.23.4
 */

import { aiServices } from '@/services/AIServiceContainer';
import { logger } from '@/lib/logger';
import { 
  DEMO_STUDY_METADATA, 
  DEMO_CSR_SECTIONS,
  DEMO_CSR_FULL_TEXT 
} from '@/data/demo-csr-data';

// =============================================================================
// Types
// =============================================================================

export interface DemoLoadResult {
  success: boolean;
  documentsLoaded: number;
  chunksCreated: number;
  processingTimeMs: number;
  errors: string[];
  mode: 'mock' | 'production';
}

export interface DemoDataStatus {
  loaded: boolean;
  documentCount: number;
  lastLoadedAt?: Date;
  studyId?: string;
}

// =============================================================================
// State
// =============================================================================

let _demoDataStatus: DemoDataStatus = {
  loaded: false,
  documentCount: 0,
};

// =============================================================================
// Demo Data Loader
// =============================================================================

/**
 * Load demo CSR data into RAG system
 * Call this at app startup or before demo
 */
export async function loadDemoData(): Promise<DemoLoadResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let chunksCreated = 0;
  let documentsLoaded = 0;

  try {
    const ragService = await aiServices.rag();
    const mode = aiServices.getProvider();

    logger.debug('DemoLoader', ` Loading demo data in ${mode} mode...`);

    // Load each CSR section as a separate document
    for (const section of DEMO_CSR_SECTIONS) {
      try {
        const documentId = `demo-csr-section-${section.number}`;
        
        const metadata = {
          documentType: 'csr',
          productName: DEMO_STUDY_METADATA.productName,
          productId: 'nexagen-001',
          studyId: DEMO_STUDY_METADATA.studyId,
          studyName: DEMO_STUDY_METADATA.studyTitle,
          sectionNumber: section.number,
          sectionTitle: section.title,
          keywords: section.keywords,
          isDemo: true,
        };

        // Check if service has ingestDocument or ingestText method
        let result: { status: string; chunksCreated?: number; chunkCount?: number; error?: string };
        
        if ('ingestText' in ragService && typeof ragService.ingestText === 'function') {
          // Mock service uses ingestText
          result = await (ragService as { ingestText: (id: string, content: string, meta?: Record<string, unknown>) => Promise<{ status: string; chunksCreated: number; error?: string }> }).ingestText(
            documentId,
            section.content,
            metadata
          );
        } else if ('ingestDocument' in ragService && typeof ragService.ingestDocument === 'function') {
          // Production service uses ingestDocument(id, content, metadata)
          result = await ragService.ingestDocument(
            documentId,
            section.content,
            metadata
          );
        } else {
          throw new Error('RAG service does not support document ingestion');
        }

        if (result.status === 'completed' || result.status === 'success') {
          documentsLoaded++;
          chunksCreated += result.chunksCreated || result.chunkCount || 0;
          logger.debug('DemoLoader', ` Loaded section ${section.number}: ${result.chunksCreated || result.chunkCount || 0} chunks`);
        } else {
          errors.push(`Section ${section.number}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        const msg = `Section ${section.number}: ${(error as Error).message}`;
        errors.push(msg);
        logger.error('DemoLoader', ` Error loading section ${section.number}:`, error);
      }
    }

    // Update status
    _demoDataStatus = {
      loaded: documentsLoaded > 0,
      documentCount: documentsLoaded,
      lastLoadedAt: new Date(),
      studyId: DEMO_STUDY_METADATA.studyId,
    };

    const result: DemoLoadResult = {
      success: errors.length === 0,
      documentsLoaded,
      chunksCreated,
      processingTimeMs: Date.now() - startTime,
      errors,
      mode,
    };

    logger.debug('DemoLoader', ` Complete: ${documentsLoaded} docs, ${chunksCreated} chunks in ${result.processingTimeMs}ms`);
    
    return result;
  } catch (error) {
    logger.error('DemoLoader', 'Fatal error', error);
    return {
      success: false,
      documentsLoaded: 0,
      chunksCreated: 0,
      processingTimeMs: Date.now() - startTime,
      errors: [(error as Error).message],
      mode: aiServices.getProvider(),
    };
  }
}

/**
 * Check if demo data is already loaded
 */
export function getDemoDataStatus(): DemoDataStatus {
  return { ..._demoDataStatus };
}

/**
 * Clear demo data from RAG system
 */
export async function clearDemoData(): Promise<{ success: boolean; error?: string }> {
  try {
    const ragService = await aiServices.rag();

    for (const section of DEMO_CSR_SECTIONS) {
      const documentId = `demo-csr-section-${section.number}`;
      await ragService.deleteDocument(documentId);
    }

    _demoDataStatus = {
      loaded: false,
      documentCount: 0,
    };

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

/**
 * Search demo data with a query
 * Convenience wrapper for testing RAG during demos
 */
export async function searchDemoData(query: string, options?: {
  topK?: number;
  sectionNumbers?: string[];
}): Promise<{
  results: Array<{
    content: string;
    section: string;
    score: number;
  }>;
  searchTimeMs: number;
}> {
  const startTime = Date.now();
  const ragService = await aiServices.rag();

  const searchResponse = await ragService.search(query, {
    topK: options?.topK ?? 5,
    filter: {
      documentIds: options?.sectionNumbers?.map(n => `demo-csr-section-${n}`),
    },
  });

  // Results are directly returned as array from search
  const results = searchResponse || [];

  return {
    results: results.map((r: { content: string; relevanceScore?: number; score?: number; documentId?: string }) => ({
      content: r.content,
      section: (r.documentId || '').replace('demo-csr-section-', '') || 'unknown',
      score: r.relevanceScore || r.score || 0,
    })),
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * Get context for AI authoring from demo data
 */
export async function getDemoContext(
  sectionNumber: string,
  query: string,
  maxTokens: number = 4000
): Promise<{
  context: string;
  sources: Array<{ section: string; excerpt: string }>;
  tokenCount: number;
}> {
  const ragService = await aiServices.rag();

  // Use search to find relevant chunks
  const searchResponse = await ragService.search(query, {
    topK: 10,
    filter: {
      documentIds: DEMO_CSR_SECTIONS.map(s => `demo-csr-section-${s.number}`),
    },
  });

  // Results are directly returned as array from search
  const results = searchResponse || [];

  // Build context from search results
  let context = '';
  let tokenCount = 0;
  const sources: Array<{ section: string; excerpt: string }> = [];
  
  for (const result of results) {
    const content = result.content || '';
    const estimatedTokens = Math.ceil(content.length / 4);
    
    if (tokenCount + estimatedTokens > maxTokens) break;
    
    context += content + '\n\n';
    tokenCount += estimatedTokens;
    
    const sectionNum = (result.documentId || '').replace('demo-csr-section-', '') || 'unknown';
    sources.push({
      section: sectionNum,
      excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    });
  }

  return {
    context: context.trim(),
    sources,
    tokenCount,
  };
}

// =============================================================================
// Demo Scenarios
// =============================================================================

/**
 * Pre-defined demo scenarios for investor presentations
 */
export const DEMO_SCENARIOS = {
  efficacySection: {
    name: 'Generate Efficacy Section',
    description: 'AI generates Section 11 (Efficacy Results) from source CSR data',
    targetSection: '11',
    prompt: 'Generate Section 11 - Efficacy Results including overall survival, progression-free survival, and objective response rate data.',
    expectedHighlights: [
      'Median OS: 14.8 months vs 10.4 months',
      'Hazard ratio: 0.69 (95% CI: 0.57, 0.84)',
      'p-value: <0.0001',
      'ORR: 24.6% vs 5.1%',
    ],
  },
  
  safetySection: {
    name: 'Generate Safety Section',
    description: 'AI generates Section 12 (Safety Results) with adverse event tables',
    targetSection: '12',
    prompt: 'Generate Section 12 - Safety Results including adverse event overview, common AEs, and events of special interest.',
    expectedHighlights: [
      'Grade 3-4 TEAEs: 62.2% vs 39.0%',
      'Hand-foot skin reaction: 58.2%',
      'Hypertension: 48.6%',
      'Treatment discontinuation due to AE: 4.8%',
    ],
  },
  
  executiveSummary: {
    name: 'Generate Executive Summary',
    description: 'AI synthesizes key findings into a one-page executive summary',
    targetSection: 'executive',
    prompt: 'Create a one-page executive summary of the NEXAGEN Phase 3 study including primary endpoint results, key secondary endpoints, and safety highlights.',
    expectedHighlights: [
      '31% reduction in risk of death',
      '4.4-month improvement in median OS',
      'Consistent benefit across subgroups',
      'Manageable safety profile',
    ],
  },
  
  regulatoryResponse: {
    name: 'Draft HAQ Response',
    description: 'AI drafts response to hypothetical Health Authority question about efficacy',
    targetSection: 'haq',
    prompt: 'Draft a response to the following Health Authority question: "Please provide additional analysis of overall survival in patients with AFP ≥400 ng/mL and discuss the clinical significance of the observed treatment effect in this subgroup."',
    expectedHighlights: [
      'AFP ≥400 ng/mL subgroup analysis',
      'HR=0.62 (95% CI: 0.47, 0.81)',
      'Consistent with ITT population',
      'Clinical significance explanation',
    ],
  },
};

export type DemoScenarioKey = keyof typeof DEMO_SCENARIOS;

/**
 * Run a demo scenario
 */
export async function runDemoScenario(scenarioKey: DemoScenarioKey): Promise<{
  scenario: typeof DEMO_SCENARIOS[DemoScenarioKey];
  context: string;
  sources: Array<{ section: string; excerpt: string }>;
  ready: boolean;
}> {
  const scenario = DEMO_SCENARIOS[scenarioKey];
  
  // Get relevant context for this scenario
  const contextResult = await getDemoContext(
    scenario.targetSection,
    scenario.prompt,
    6000
  );

  return {
    scenario,
    context: contextResult.context,
    sources: contextResult.sources,
    ready: contextResult.context.length > 0,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default {
  loadDemoData,
  getDemoDataStatus,
  clearDemoData,
  searchDemoData,
  getDemoContext,
  runDemoScenario,
  DEMO_SCENARIOS,
};
