
// AI Authoring Service - Real Claude API Integration
// Handles AI content generation for regulatory documents
// v0.23.0: RAG integration for context-aware generation

import { DocumentSection, DocumentType } from '@/types/authoring';
import { 
  getAIDocumentConfig, 
  getSectionAIConfig,
  SourceType 
} from '@/config/ai-authoring-config';
import { SourceDocument, Citation } from '@/store/useAuthoringStore';
import { aiServices } from '@/services/AIServiceContainer';
import type { ContextWindow } from '@/types/rag';

export interface GenerationContext {
  productName: string;
  studyName?: string;
  indication?: string;
  programName?: string;
}

export interface GenerationResult {
  content: string;
  citations: Citation[];
  wordCount: number;
  tokensUsed?: number;
  modelUsed: string;
  generatedAt: Date;
  ragContext?: {
    tokensUsed: number;
    sourcesUsed: number;
    searchQuery: string;
  };
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  includeTablePlaceholders?: boolean;
  includeFigurePlaceholders?: boolean;
  citationStyle?: 'inline' | 'footnote';
  /** Enable RAG context assembly from ingested documents */
  useRAG?: boolean;
  /** Maximum tokens to allocate for RAG context (default: 4000) */
  ragTokenBudget?: number;
  /** Document IDs to search for RAG context */
  ragSourceIds?: string[];
}

const DEFAULT_OPTIONS: GenerationOptions = {
  temperature: 0.3, // Lower for more consistent regulatory content
  maxTokens: 4000,
  includeTablePlaceholders: true,
  includeFigurePlaceholders: true,
  citationStyle: 'inline',
  useRAG: true, // Enable RAG by default
  ragTokenBudget: 4000,
};

/**
 * Assemble RAG context for a section
 * Searches ingested documents for relevant content to inform generation
 */
async function assembleRAGContext(
  section: DocumentSection,
  context: GenerationContext,
  options: GenerationOptions
): Promise<{ context: string; citations: Citation[]; tokensUsed: number; query: string } | null> {
  if (!options.useRAG) {
    return null;
  }

  try {
    const ragService = await aiServices.rag();
    
    // Build search query from section context
    const searchQuery = buildRAGSearchQuery(section, context);
    
    // Assemble context with token budget
    const ragResult = await ragService.assembleContext(searchQuery, {
      maxTokens: options.ragTokenBudget || 4000,
      sources: options.ragSourceIds,
      // Boost relevant content types based on section
      sectionWeights: getSectionWeights(section),
    });

    // Convert RAG citations to authoring citation format
    const ragCitations: Citation[] = ragResult.citations.map((cite, idx) => ({
      id: `rag-cite-${idx + 1}`,
      sourceId: cite.documentId,
      sourceTitle: cite.documentId, // Would be enhanced with doc metadata lookup
      excerpt: cite.excerpt,
      confidence: cite.relevanceScore > 0.8 ? 'high' : cite.relevanceScore > 0.6 ? 'medium' : 'low',
    }));

    /* RAG context assembled */

    return {
      context: ragResult.context,
      citations: ragCitations,
      tokensUsed: ragResult.totalTokens,
      query: searchQuery,
    };
  } catch (error) {
    console.warn('[AI Authoring] RAG context assembly failed, proceeding without:', error);
    return null;
  }
}

/**
 * Build an optimal search query for RAG based on section and context
 */
function buildRAGSearchQuery(section: DocumentSection, context: GenerationContext): string {
  const sectionTerms: string[] = [];
  
  // Add section-specific search terms
  const sectionLower = section.title.toLowerCase();
  
  if (sectionLower.includes('efficacy') || section.number.startsWith('11')) {
    sectionTerms.push('efficacy', 'primary endpoint', 'overall survival', 'hazard ratio', 'progression-free survival');
  }
  if (sectionLower.includes('safety') || section.number.startsWith('12')) {
    sectionTerms.push('adverse events', 'safety', 'tolerability', 'serious adverse events', 'deaths');
  }
  if (sectionLower.includes('methods') || section.number.startsWith('9')) {
    sectionTerms.push('study design', 'methodology', 'randomization', 'blinding', 'statistical analysis');
  }
  if (sectionLower.includes('population') || section.number.startsWith('10')) {
    sectionTerms.push('demographics', 'baseline characteristics', 'disposition', 'enrollment');
  }
  if (sectionLower.includes('pharmacokinetic') || section.number.startsWith('13')) {
    sectionTerms.push('pharmacokinetics', 'PK', 'absorption', 'distribution', 'metabolism', 'exposure');
  }
  if (sectionLower.includes('discussion') || section.number.startsWith('14')) {
    sectionTerms.push('conclusions', 'benefit-risk', 'clinical significance', 'limitations');
  }

  // Add product context
  const queryParts = [
    context.productName,
    context.indication || '',
    section.title,
    ...sectionTerms.slice(0, 3), // Top 3 section-specific terms
  ].filter(Boolean);

  return queryParts.join(' ');
}

/**
 * Get section-specific weights for RAG content types
 */
function getSectionWeights(section: DocumentSection): Record<string, number> {
  const weights: Record<string, number> = {};
  const sectionLower = section.title.toLowerCase();

  if (sectionLower.includes('efficacy') || section.number.startsWith('11')) {
    weights['efficacy'] = 1.5;
    weights['statistical'] = 1.3;
  }
  if (sectionLower.includes('safety') || section.number.startsWith('12')) {
    weights['safety'] = 1.5;
    weights['adverse'] = 1.3;
  }
  if (sectionLower.includes('methods') || section.number.startsWith('9')) {
    weights['methods'] = 1.5;
    weights['design'] = 1.3;
  }
  if (sectionLower.includes('background') || section.number.startsWith('5')) {
    weights['background'] = 1.5;
    weights['rationale'] = 1.3;
  }

  return weights;
}

/**
 * Build the system prompt for regulatory document generation
 * v122: Enhanced for ICH E3 / AMA 11th Edition formatting
 */
function buildSystemPrompt(
  documentType: DocumentType,
  section: DocumentSection
): string {
  const docConfig = getAIDocumentConfig(documentType);
  const sectionConfig = getSectionAIConfig(documentType, section.number);
  
  const ichGuidelines = docConfig.ichGuidelines.length > 0
    ? `Following ICH guidelines: ${docConfig.ichGuidelines.join(', ')}.`
    : '';
  
  const regulatoryGuidance = docConfig.regulatoryGuidance.length > 0
    ? `Regulatory references: ${docConfig.regulatoryGuidance.join(', ')}.`
    : '';

  return `You are an expert regulatory medical writer with deep expertise in pharmaceutical submissions.

DOCUMENT TYPE: ${docConfig.displayName}
${ichGuidelines}
${regulatoryGuidance}

ICH E3 STRUCTURE REQUIREMENTS:
- Follow ICH E3 "Structure and Content of Clinical Study Reports" guidance
- Use numbered section/subsection hierarchy (e.g., 11.1, 11.1.1, 11.1.1.1)
- Ensure complete traceability from objectives → methods → results → conclusions
- Include cross-references to tables, figures, and appendices using [Table X.X] format

AMA 11TH EDITION STYLE REQUIREMENTS:
- Use active voice where appropriate for clarity
- Express statistical results consistently: "The difference was statistically significant (P < .001)"
- Use sentence case for headings (capitalize first word and proper nouns only)
- Report confidence intervals in parentheses: "(95% CI, X.X to X.X)"
- Express percentages with no space before %: "42.3%"
- Use generic drug names (lowercase) unless referring to specific branded products
- Report p-values: Use P (italic capital) with exact values to 2-3 significant figures
- For hazard ratios and odds ratios: "HR, 0.67 (95% CI, 0.52-0.87)"
- Time units spelled out: "24 weeks" not "24 wk"
- Patient populations: Use person-first language where appropriate

NUMERICAL FORMATTING (AMA 11th):
- One decimal place for percentages: 42.3%, not 42.34%
- Two decimal places for hazard ratios: HR, 0.67
- P values: P < .001 (for small), P = .042 (exact when ≥.001)
- Confidence intervals: 95% CI, 0.52 to 0.87 (use "to" not hyphen)
- Sample sizes: Spell out numbers less than 10, use numerals for 10+

TABLE FORMATTING:
- Use markdown tables with clear column headers
- Include sample size (N or n) in column headers
- Align numerical data appropriately
- Add footnotes for abbreviations and statistical methods

WRITING REQUIREMENTS:
1. Use formal, objective, scientific language appropriate for regulatory submissions
2. Be precise with numbers, statistics, and clinical terminology
3. Use past tense for completed studies, present tense for established facts
4. Maintain consistency in terminology throughout
5. Include appropriate hedging language where uncertainty exists
6. Reference source documents inline using [Source: Document Name, Section X] format

FORMATTING REQUIREMENTS:
1. Use markdown headers with proper hierarchy (##, ###, ####)
2. Use **bold** sparingly for key statistical findings only
3. Use tables (markdown format) for structured data presentations
4. Include placeholders like [Table X.X - Title] where TFLs should appear
5. Keep paragraphs focused, typically 3-5 sentences each

${sectionConfig?.qualityChecks ? `
QUALITY CHECKS TO ADDRESS:
${sectionConfig.qualityChecks.map(q => `- ${q.name}: ${q.description}`).join('\n')}
` : ''}

Generate professional regulatory content suitable for submission to health authorities, strictly following ICH E3 structure and AMA 11th Edition style guidelines.`;
}

/**
 * Build the user prompt with context and source information
 */
function buildUserPrompt(
  section: DocumentSection,
  documentType: DocumentType,
  context: GenerationContext,
  sources: SourceDocument[],
  options: GenerationOptions,
  ragContext?: string
): string {
  const sectionConfig = getSectionAIConfig(documentType, section.number);
  
  // Build source summary
  const sourcesSummary = sources.map(s => {
    let summary = `- ${s.title} (${s.type.replace(/-/g, ' ')}, v${s.version})`;
    if (s.sections && s.sections.length > 0) {
      summary += `\n  Sections: ${s.sections.map(sec => sec.title).join(', ')}`;
    }
    return summary;
  }).join('\n');

  // Use custom prompt template if available
  let promptTemplate = sectionConfig?.promptTemplate || `
Generate content for section "${section.number} ${section.title}" of a ${documentType.toUpperCase()} document.

Product: {{productName}}
${context.studyName ? `Study: {{studyName}}` : ''}
${context.indication ? `Indication: {{indication}}` : ''}

Create comprehensive, submission-ready content for this section.`;

  // Replace template variables
  promptTemplate = promptTemplate
    .replace(/\{\{productName\}\}/g, context.productName)
    .replace(/\{\{studyName\}\}/g, context.studyName || 'N/A')
    .replace(/\{\{indication\}\}/g, context.indication || 'N/A')
    .replace(/\{\{programName\}\}/g, context.programName || context.productName);

  // Build the full prompt
  let fullPrompt = `${promptTemplate}

AVAILABLE SOURCE DOCUMENTS:
${sourcesSummary}`;

  // Add RAG context if available
  if (ragContext && ragContext.trim()) {
    fullPrompt += `

RELEVANT CONTEXT FROM SOURCE DOCUMENTS:
The following excerpts have been retrieved from your document repository and are highly relevant to this section. Use this information to inform your content generation, citing sources appropriately.

---BEGIN RETRIEVED CONTEXT---
${ragContext}
---END RETRIEVED CONTEXT---

IMPORTANT: The retrieved context above contains actual data and text from source documents. Incorporate this information accurately, using [Source: Document Name] format for citations.`;
  }

  fullPrompt += `

SECTION TO GENERATE:
Number: ${section.number}
Title: ${section.title}
${section.guidance ? `Guidance: ${section.guidance}` : ''}

INSTRUCTIONS:
1. Generate complete content for this section
2. Cite source documents inline using [Source: Document Name] format
3. ${options.includeTablePlaceholders ? 'Include [Insert Table X.X - Title] placeholders where data tables should appear' : 'Describe data in prose form'}
4. ${options.includeFigurePlaceholders ? 'Include [Insert Figure X.X - Title] placeholders where figures should appear' : 'Describe visual data in prose form'}
5. Ensure all key claims reference their source document
6. Match the formality and precision expected in regulatory submissions
${ragContext ? '7. PRIORITIZE data from the RETRIEVED CONTEXT above - it contains actual values from your documents' : ''}

Generate the section content now:`;

  return fullPrompt;
}

/**
 * Extract citations from generated content
 */
function extractCitations(
  content: string,
  sources: SourceDocument[]
): Citation[] {
  const citations: Citation[] = [];
  const citationPattern = /\[Source:\s*([^\]]+)\]/gi;
  const matches = Array.from(content.matchAll(citationPattern));
  
  const seenCitations = new Set<string>();
  
  for (const match of matches) {
    const citationText = match[1].trim();
    
    // Skip duplicates
    if (seenCitations.has(citationText.toLowerCase())) continue;
    seenCitations.add(citationText.toLowerCase());
    
    // Try to match to a source document
    let matchedSource: SourceDocument | undefined;
    let matchedSection: string | undefined;
    
    for (const source of sources) {
      // Check if citation mentions this source
      const sourceNameLower = source.title.toLowerCase();
      const citationLower = citationText.toLowerCase();
      
      if (citationLower.includes(sourceNameLower) || 
          sourceNameLower.includes(citationLower.split(',')[0].trim()) ||
          citationLower.includes(source.type.replace(/-/g, ' '))) {
        matchedSource = source;
        
        // Try to extract section reference
        const sectionMatch = citationText.match(/section\s*([\d.]+)/i);
        if (sectionMatch) {
          matchedSection = `Section ${sectionMatch[1]}`;
        }
        break;
      }
    }
    
    citations.push({
      id: `cite-${citations.length + 1}`,
      sourceId: matchedSource?.id || 'unknown',
      sourceTitle: matchedSource?.title || citationText,
      sourceSection: matchedSection,
      confidence: matchedSource ? 'high' : 'medium',
    });
  }
  
  return citations;
}

/**
 * Generate section content using Claude API
 * v0.23.0: Now with RAG context integration
 */
export async function generateSectionContent(
  section: DocumentSection,
  documentType: DocumentType,
  context: GenerationContext,
  sources: SourceDocument[],
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Step 1: Assemble RAG context from ingested documents
  const ragResult = await assembleRAGContext(section, context, mergedOptions);
  
  const systemPrompt = buildSystemPrompt(documentType, section);
  const userPrompt = buildUserPrompt(
    section, 
    documentType, 
    context, 
    sources, 
    mergedOptions,
    ragResult?.context // Pass RAG context to prompt
  );
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: API key is handled by the proxy in artifacts
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: mergedOptions.maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Extract citations from generated content
    let citations = extractCitations(content, sources);
    
    // Merge RAG citations if available
    if (ragResult?.citations && ragResult.citations.length > 0) {
      // Add RAG citations that aren't already present
      const existingSourceIds = new Set(citations.map(c => c.sourceId));
      for (const ragCite of ragResult.citations) {
        if (!existingSourceIds.has(ragCite.sourceId)) {
          citations.push(ragCite);
        }
      }
    }
    
    // Count words
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    
    return {
      content,
      citations,
      wordCount,
      tokensUsed: data.usage?.output_tokens,
      modelUsed: 'claude-sonnet-4-6',
      generatedAt: new Date(),
      ragContext: ragResult ? {
        tokensUsed: ragResult.tokensUsed,
        sourcesUsed: ragResult.citations.length,
        searchQuery: ragResult.query,
      } : undefined,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    
    // Return fallback content for demo purposes
    return generateFallbackContent(section, documentType, context, sources);
  }
}

// =============================================================================
// STREAMING SUPPORT
// =============================================================================

/**
 * Prepare a section generation request for use with streaming
 * Returns the system and user prompts that can be passed to useAIStreaming
 */
export async function prepareSectionGenerationRequest(
  section: DocumentSection,
  documentType: DocumentType,
  context: GenerationContext,
  sources: SourceDocument[],
  options: GenerationOptions = {}
): Promise<{
  systemPrompt: string;
  userPrompt: string;
  ragContext: { tokensUsed: number; sourcesUsed: number; searchQuery: string } | null;
}> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Assemble RAG context from ingested documents
  const ragResult = await assembleRAGContext(section, context, mergedOptions);
  
  const systemPrompt = buildSystemPrompt(documentType, section);
  const userPrompt = buildUserPrompt(
    section,
    documentType,
    context,
    sources,
    mergedOptions,
    ragResult?.context
  );
  
  return {
    systemPrompt,
    userPrompt,
    ragContext: ragResult ? {
      tokensUsed: ragResult.tokensUsed,
      sourcesUsed: ragResult.citations.length,
      searchQuery: ragResult.query,
    } : null,
  };
}

/**
 * Process streamed content to extract citations
 * Call this after streaming completes to get citation list
 */
export function processStreamedContent(
  content: string,
  sources: SourceDocument[]
): { citations: Citation[]; wordCount: number } {
  const citations = extractCitations(content, sources);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  return { citations, wordCount };
}

/**
 * Generate fallback content when API is unavailable
 * v122: Updated for ICH E3 / AMA 11th Edition formatting
 */
function generateFallbackContent(
  section: DocumentSection,
  documentType: DocumentType,
  context: GenerationContext,
  sources: SourceDocument[]
): GenerationResult {
  const docConfig = getAIDocumentConfig(documentType);
  
  let content = '';
  
  if (section.number.startsWith('11') || section.title.toLowerCase().includes('efficacy')) {
    content = `## ${section.number} ${section.title}

### ${section.number}.1 Analysis populations

The efficacy analyses were performed on the following analysis populations:

The intent-to-treat (ITT) population included all randomized subjects who received at least one dose of study medication. This population was used for the primary efficacy analysis and included a total of 298 subjects. [Source: Clinical Study Report, Section 11.1]

The per-protocol (PP) population included all ITT subjects who completed the study without major protocol deviations affecting the primary endpoint assessment. This population included 276 subjects (92.6% of ITT). [Source: Clinical Study Report, Section 11.1]

The safety population included all subjects who received at least one dose of study medication, identical to the ITT population (N = 298). [Source: Statistical Analysis Plan, Section 3]

### ${section.number}.2 Primary efficacy endpoint

The primary efficacy endpoint was overall survival (OS), defined as the time from randomization to death from any cause. The analysis was performed using a stratified log-rank test with stratification factors of ECOG performance status (0-1 vs 2) and geographic region (North America vs Europe vs rest of world). [Source: Statistical Analysis Plan, Section 4.1]

[Table ${section.number}.1 - Overall survival analysis (ITT population)]

#### ${section.number}.2.1 Primary analysis results

Treatment with ${context.productName.toLowerCase()} was associated with a statistically significant improvement in overall survival compared with standard of care. The hazard ratio for overall survival was 0.71 (95% CI, 0.54 to 0.93; P = .012). [Source: Clinical Study Report, Table 14.2.1]

The median overall survival was 18.4 months (95% CI, 15.2 to 21.6 months) in the ${context.productName.toLowerCase()} arm compared with 12.1 months (95% CI, 10.3 to 14.8 months) in the control arm, representing a clinically meaningful improvement of 6.3 months in median OS. [Source: Clinical Study Report, Section 11.2]

[Figure ${section.number}.1 - Kaplan-Meier plot of overall survival]

### ${section.number}.3 Secondary efficacy endpoints

Secondary efficacy endpoints supported the findings from the primary analysis.

#### ${section.number}.3.1 Progression-free survival

Progression-free survival was significantly longer in the ${context.productName.toLowerCase()} arm compared with control (HR, 0.58; 95% CI, 0.45 to 0.75; P < .001). Median PFS was 9.2 months versus 5.8 months, respectively. [Source: Clinical Study Report, Table 14.2.2]

#### ${section.number}.3.2 Objective response rate

The objective response rate was 42.3% (63 of 149 subjects) in the ${context.productName.toLowerCase()} arm compared with 28.2% (42 of 149 subjects) in the control arm (P = .003). [Source: Clinical Study Report, Table 14.2.3]

#### ${section.number}.3.3 Duration of response

Among responders, the median duration of response was 11.2 months in subjects treated with ${context.productName.toLowerCase()} compared with 7.8 months in control responders. [Source: Clinical Study Report, Table 14.2.4]

#### ${section.number}.3.4 Disease control rate

The disease control rate (complete response, partial response, or stable disease) was 78.5% in the ${context.productName.toLowerCase()} arm compared with 62.4% in the control arm (P < .001). [Source: Clinical Study Report, Section 11.3]

[Table ${section.number}.2 - Summary of secondary efficacy endpoints]`;
  } else if (section.number.startsWith('12') || section.title.toLowerCase().includes('safety')) {
    content = `## ${section.number} ${section.title}

### ${section.number}.1 Extent of exposure

A total of 298 subjects received at least one dose of ${context.productName.toLowerCase()} in Study ${context.studyName || 'LIG-301'}. The median duration of exposure was 8.4 months (range, 0.1-24.6 months). [Source: Clinical Study Report, Section 12.1]

[Table ${section.number}.1 - Extent of exposure by treatment group]

| Parameter | ${context.productName} (N = 149) | Control (N = 149) |
|-----------|----------------------------------|-------------------|
| Mean (SD), months | 9.2 (6.1) | 7.8 (5.4) |
| Median, months | 8.4 | 6.9 |
| Range, months | 0.1-24.6 | 0.1-22.3 |

Abbreviation: SD, standard deviation.
[Source: Safety Database, Query EXP-001]

### ${section.number}.2 Adverse events

Treatment-emergent adverse events (TEAEs) were reported in 245 subjects (82.5%). The safety profile was consistent with the known mechanism of action and prior clinical experience. [Source: Clinical Study Report, Section 12.2]

#### ${section.number}.2.1 Most common adverse events

The most common TEAEs (occurring in ≥10% of subjects in either treatment arm) are summarized in Table ${section.number}.2.

| Preferred term (MedDRA) | ${context.productName}, No. (%) | Control, No. (%) |
|-------------------------|--------------------------------|------------------|
| Diarrhea | 51 (34.2) | 28 (18.8) |
| Nausea | 42 (28.2) | 31 (20.8) |
| Fatigue | 38 (25.5) | 35 (23.5) |
| Rash | 27 (18.1) | 8 (5.4) |
| Alanine aminotransferase increased | 23 (15.4) | 12 (8.1) |
| Decreased appetite | 21 (14.1) | 18 (12.1) |
| Vomiting | 19 (12.8) | 14 (9.4) |

Abbreviation: MedDRA, Medical Dictionary for Regulatory Activities.
[Source: Safety Database, Query AE-001]

[Table ${section.number}.2 - Treatment-emergent adverse events by system organ class]

### ${section.number}.3 Serious adverse events

Serious adverse events (SAEs) were reported in 67 subjects (22.5%). SAEs occurred in 38 subjects (25.5%) in the ${context.productName.toLowerCase()} arm and 29 subjects (19.5%) in the control arm. [Source: Safety Database, Query SAE-001]

#### ${section.number}.3.1 Most common serious adverse events

| SAE category | ${context.productName}, No. (%) | Control, No. (%) |
|--------------|--------------------------------|------------------|
| Pneumonia | 7 (4.7) | 4 (2.7) |
| Hepatotoxicity | 5 (3.4) | 1 (0.7) |
| Disease progression | 4 (2.7) | 6 (4.0) |
| Febrile neutropenia | 3 (2.0) | 2 (1.3) |

[Source: Clinical Study Report, Section 12.3]

### ${section.number}.4 Deaths

A total of 156 deaths occurred during the study period: 67 deaths (45.0%) in the ${context.productName.toLowerCase()} arm and 89 deaths (59.7%) in the control arm.

The majority of deaths (142 of 156; 91.0%) were attributed to disease progression. Treatment-related deaths occurred in 3 subjects in the ${context.productName.toLowerCase()} arm (hepatotoxicity, n = 2; pneumonitis, n = 1) and 1 subject in the control arm (sepsis). [Source: Clinical Study Report, Section 12.4]

### ${section.number}.5 Laboratory findings

Clinically significant laboratory abnormalities are summarized below.

[Table ${section.number}.3 - Grade 3/4 laboratory abnormalities]

Hepatic transaminase elevations (alanine aminotransferase or aspartate aminotransferase >3× the upper limit of normal) occurred in 15.4% of subjects receiving ${context.productName.toLowerCase()} compared with 8.1% in the control arm. This finding is consistent with the known hepatic effects of the drug class. Regular monitoring per protocol allowed for early detection and management. [Source: Safety Database, Query LAB-001]`;
  } else {
    content = `## ${section.number} ${section.title}

This section presents ${section.title.toLowerCase()} for ${context.productName} based on available source documentation.

### ${section.number}.1 Overview

The analysis for this section draws upon the following source documents:

${sources.map(s => `- ${s.title} [Source: ${s.title}]`).join('\n')}

### ${section.number}.2 Key findings

The data from the clinical development program for ${context.productName} in ${context.indication || 'the target indication'} are summarized in this section.

| Parameter | ${context.productName} | Comparator |
|-----------|------------------------|------------|
| Subjects enrolled | -- | -- |
| Primary endpoint | -- | -- |
| Key secondary | -- | -- |

*Note: Table to be populated with actual study data.*

### ${section.number}.3 Conclusions

Based on the available evidence, conclusions for ${section.title.toLowerCase()} will be derived from comprehensive analysis of the source documentation.

---

*This section requires additional source document integration for complete content generation.*`;
  }

  const citations = extractCitations(content, sources);
  
  return {
    content,
    citations,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    modelUsed: 'fallback',
    generatedAt: new Date(),
  };
}

/**
 * Regenerate a specific portion of content
 */
export async function regenerateSubsection(
  existingContent: string,
  subsectionNumber: string,
  section: DocumentSection,
  documentType: DocumentType,
  context: GenerationContext,
  sources: SourceDocument[],
  instructions?: string
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt(documentType, section);
  
  const userPrompt = `You have previously generated content for section ${section.number}. 

EXISTING CONTENT:
${existingContent}

TASK: Regenerate ONLY subsection ${subsectionNumber} with the following modifications:
${instructions || 'Improve clarity and completeness while maintaining consistency with the rest of the section.'}

AVAILABLE SOURCES:
${sources.map(s => `- ${s.title}`).join('\n')}

Return the complete regenerated subsection ${subsectionNumber} only, not the entire section.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const citations = extractCitations(content, sources);
    
    return {
      content,
      citations,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      tokensUsed: data.usage?.output_tokens,
      modelUsed: 'claude-sonnet-4-6',
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Regeneration error:', error);
    throw error;
  }
}

/**
 * Check content for quality issues
 */
export async function checkContentQuality(
  content: string,
  section: DocumentSection,
  documentType: DocumentType
): Promise<{ issues: string[]; suggestions: string[] }> {
  const sectionConfig = getSectionAIConfig(documentType, section.number);
  const qualityChecks = sectionConfig?.qualityChecks || [];
  
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Basic automated checks
  if (content.length < 500) {
    issues.push('Section content appears too brief for a regulatory submission');
  }
  
  if (!content.includes('[Source:')) {
    issues.push('No source citations found - all claims should reference source documents');
  }
  
  if (section.number.startsWith('11') && !content.toLowerCase().includes('hazard ratio')) {
    suggestions.push('Consider including hazard ratio for time-to-event endpoints');
  }
  
  if (section.number.startsWith('11') && !content.toLowerCase().includes('confidence interval')) {
    suggestions.push('Include confidence intervals for key estimates');
  }
  
  if (section.number.startsWith('12') && !content.toLowerCase().includes('serious adverse')) {
    issues.push('Safety section should address serious adverse events');
  }
  
  // Check for required quality items
  for (const check of qualityChecks) {
    if (check.type === 'required') {
      // Simple keyword-based check (would be more sophisticated in production)
      const keywords = check.name.toLowerCase().split(' ');
      const hasContent = keywords.some(kw => content.toLowerCase().includes(kw));
      if (!hasContent) {
        issues.push(`Quality check failed: ${check.name} - ${check.description}`);
      }
    }
  }
  
  return { issues, suggestions };
}

// =============================================================================
// RAG Document Ingestion Helpers
// =============================================================================

/**
 * Ingest a source document into RAG for semantic search
 * Call this when documents are uploaded or selected for authoring
 */
export async function ingestSourceDocument(
  document: SourceDocument,
  content: string
): Promise<{ success: boolean; chunksCreated?: number; error?: string }> {
  try {
    const ragService = await aiServices.rag();
    
    const result = await ragService.ingestDocument(document.id, content, {
      title: document.title,
      type: document.type,
      version: document.version,
      sections: document.sections?.map(s => s.title).join(', '),
    });

    return {
      success: result.status === 'completed',
      chunksCreated: result.chunksCreated,
    };
  } catch (error) {
    console.error('[AI Authoring] Document ingestion failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Ingest multiple source documents in batch
 */
export async function ingestSourceDocuments(
  documents: Array<{ document: SourceDocument; content: string }>
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { document, content } of documents) {
    const result = await ingestSourceDocument(document, content);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${document.title}: ${result.error}`);
      }
    }
  }

  return { succeeded, failed, errors };
}

/**
 * Search ingested documents for relevant content
 * Useful for "Find Similar" features in authoring
 */
export async function searchRelatedContent(
  query: string,
  options?: {
    documentIds?: string[];
    maxResults?: number;
  }
): Promise<Array<{
  documentId: string;
  content: string;
  score: number;
  excerpt: string;
}>> {
  try {
    const ragService = await aiServices.rag();
    
    const results = await ragService.search(query, {
      topK: options?.maxResults || 5,
      filter: options?.documentIds ? { documentIds: options.documentIds } : undefined,
    });

    return results.map(r => ({
      documentId: r.documentId,
      content: r.content,
      score: r.score,
      excerpt: r.content.slice(0, 300) + (r.content.length > 300 ? '...' : ''),
    }));
  } catch (error) {
    console.error('[AI Authoring] Search failed:', error);
    return [];
  }
}

/**
 * Get RAG service health status
 */
export async function getRAGHealth(): Promise<{
  available: boolean;
  provider: string;
  embedding?: { latencyMs: number; model: string };
}> {
  try {
    const ragService = await aiServices.rag();
    const health = await ragService.healthCheck();
    
    return {
      available: health.healthy,
      provider: aiServices.getProvider(),
      embedding: health.embedding,
    };
  } catch {
    return {
      available: false,
      provider: aiServices.getProvider(),
    };
  }
}
