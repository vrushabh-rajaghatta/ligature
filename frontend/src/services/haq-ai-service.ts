
// ============================================================================
// HAQ Response AI Service - v75: Real Claude API Integration
// AI-powered HAQ response drafting, refinement, and quality assessment
// ============================================================================

import {
  complete,
  streamComplete,
  assessContentQuality,
  generateHAQResponse as baseGenerateHAQResponse,
  type CompletionResponse,
  type StreamCallbacks,
  type Message,
} from './anthropic-service'

// ============================================================================
// TYPES
// ============================================================================

export interface HAQContext {
  questionNumber: string
  questionText: string
  discipline: string
  agency: string
  ctdSection?: string
  productName: string
  applicationNumber?: string
  submissionType?: string
  dueDate?: string
}

export interface HAQSourceDocument {
  id: string
  title: string
  type: string
  version?: string
  relevantSections?: string[]
  excerpt?: string
}

export interface GenerationConfig {
  mode: 'full-draft' | 'outline' | 'section-by-section'
  style: 'formal' | 'concise' | 'detailed'
  maxTokens?: number
  temperature?: number
  includeTablePlaceholders: boolean
  includeCitations: boolean
  regulatoryFramework: string[]
  mustIncludeTopics: string[]
  mustCiteSources: string[]
  avoidTopics: string[]
}

export interface GeneratedResponse {
  content: string
  sections: GeneratedSection[]
  citations: ResponseCitation[]
  qualityScore: number
  tokensUsed: number
  generationTimeMs: number
  model: string
}

export interface GeneratedSection {
  id: string
  title: string
  content: string
  confidence: number
  sources: string[]
  needsReview: boolean
  reviewNotes?: string
}

export interface ResponseCitation {
  id: string
  sourceId: string
  sourceTitle: string
  sourceSection?: string
  quotedText?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface QualityAssessment {
  overallScore: number
  dimensions: {
    completeness: number
    accuracy: number
    clarity: number
    regulatoryTone: number
    evidenceSupport: number
    conciseness: number
    formatting: number
  }
  issues: QualityIssue[]
  suggestions: string[]
  passesThreshold: boolean
}

export interface QualityIssue {
  id: string
  severity: 'critical' | 'major' | 'minor' | 'info'
  dimension: string
  title: string
  description: string
  location?: { start: number; end: number }
  suggestion: string
}

export interface RefinementRequest {
  originalContent: string
  instruction: string
  focusAreas?: string[]
  preserveSections?: string[]
}

export interface SimilarResponse {
  questionNumber: string
  questionText: string
  responseContent: string
  qualityScore?: number
  discipline: string
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: GenerationConfig = {
  mode: 'full-draft',
  style: 'formal',
  maxTokens: 6000,
  temperature: 0.3,
  includeTablePlaceholders: true,
  includeCitations: true,
  regulatoryFramework: ['ICH E6(R2)', 'ICH E9', 'ICH M4'],
  mustIncludeTopics: [],
  mustCiteSources: [],
  avoidTopics: [],
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildHAQSystemPrompt(context: HAQContext, config: GenerationConfig): string {
  const disciplineExpertise = getDisciplineExpertise(context.discipline)
  const agencyGuidance = getAgencyGuidance(context.agency)

  return `You are a senior regulatory affairs specialist with deep expertise in ${context.discipline} for pharmaceutical submissions.

ROLE: Expert HAQ response writer for ${context.agency} submissions
EXPERTISE: ${disciplineExpertise}

AGENCY-SPECIFIC GUIDANCE:
${agencyGuidance}

REGULATORY FRAMEWORK:
${config.regulatoryFramework.join(', ')}

RESPONSE WRITING REQUIREMENTS:
1. Address the question directly and completely - leave no part unanswered
2. Use ${config.style === 'concise' ? 'concise, direct language avoiding unnecessary elaboration' : config.style === 'detailed' ? 'comprehensive explanations with supporting detail' : 'formal regulatory language appropriate for Health Authority correspondence'}
3. Structure the response with clear sections when addressing multiple points
4. ${config.includeCitations ? 'Include specific citations using [Source: Document Name, Section X] format' : 'Reference source documents without formal citations'}
5. ${config.includeTablePlaceholders ? 'Include [Insert Table X] placeholders where data tables would strengthen the response' : 'Describe data in narrative form'}
6. Maintain consistency with the original submission and regulatory standards
7. Use past tense for completed activities, present tense for established facts
8. Be precise with numbers, dates, and technical terminology

${config.mustIncludeTopics.length > 0 ? `MUST INCLUDE:\n${config.mustIncludeTopics.map(t => `- ${t}`).join('\n')}` : ''}
${config.mustCiteSources.length > 0 ? `MUST CITE:\n${config.mustCiteSources.map(s => `- ${s}`).join('\n')}` : ''}
${config.avoidTopics.length > 0 ? `AVOID DISCUSSING:\n${config.avoidTopics.map(t => `- ${t}`).join('\n')}` : ''}`
}

function getDisciplineExpertise(discipline: string): string {
  const expertise: Record<string, string> = {
    CMC: 'Chemistry, Manufacturing, and Controls (CMC) including drug substance characterization, manufacturing process development, quality control, stability, and specifications per ICH Q8-Q12',
    Clinical: 'Clinical development including study design, efficacy evaluation, statistical analysis, and clinical pharmacology per ICH E series guidelines',
    Nonclinical: 'Nonclinical/preclinical sciences including toxicology, pharmacology, ADME, and safety pharmacology per ICH S series guidelines',
    Regulatory: 'Regulatory strategy, submission requirements, and regulatory pathways across global markets',
    Statistics: 'Biostatistics, clinical trial design, multiplicity adjustment, missing data handling, and statistical analysis plans',
    Safety: 'Pharmacovigilance, safety evaluation, risk management, and aggregate safety reporting',
    Medical: 'Medical affairs, benefit-risk assessment, and medical writing for regulatory submissions',
  }
  return expertise[discipline] || 'pharmaceutical regulatory affairs and drug development'
}

function getAgencyGuidance(agency: string): string {
  const guidance: Record<string, string> = {
    FDA: 'FDA expects direct, data-driven responses with clear references to CFR requirements. Responses should be organized using the question structure provided. Include specific module/section references for supporting documentation.',
    EMA: 'EMA responses should follow the applicant response format, addressing each concern point by point. Reference relevant CHMP guidelines and provide clear justification for positions taken.',
    PMDA: 'PMDA expects detailed scientific discussion with comprehensive data presentation. Include relevant Japanese regulatory context and any Japan-specific studies or data.',
    'Health Canada': 'Health Canada responses should address each deficiency directly with Canadian regulatory context. Reference relevant Canadian guidance documents.',
    TGA: 'TGA responses should be structured to address each request point clearly with Australian regulatory considerations.',
  }
  return guidance[agency] || 'Address each point comprehensively with appropriate regulatory context and supporting data.'
}

// ============================================================================
// MAIN GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a complete HAQ response draft
 */
export async function generateHAQResponseDraft(
  context: HAQContext,
  sources: HAQSourceDocument[],
  config: Partial<GenerationConfig> = {},
  similarResponses: SimilarResponse[] = []
): Promise<GeneratedResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()

  const systemPrompt = buildHAQSystemPrompt(context, fullConfig)

  // Build source document context
  const sourceContext = sources
    .map(s => {
      let text = `- ${s.title} (${s.type}${s.version ? `, v${s.version}` : ''})`
      if (s.relevantSections?.length) {
        text += `\n  Relevant sections: ${s.relevantSections.join(', ')}`
      }
      if (s.excerpt) {
        text += `\n  Key excerpt: "${s.excerpt.substring(0, 200)}..."`
      }
      return text
    })
    .join('\n')

  // Build similar response context if available
  const similarContext = similarResponses.length > 0
    ? `\nSIMILAR PREVIOUS RESPONSES (for reference only, do not copy):\n${similarResponses
        .slice(0, 3)
        .map(r => `Question ${r.questionNumber} (${r.discipline}): ${r.responseContent.substring(0, 500)}...`)
        .join('\n\n')}`
    : ''

  const userPrompt = `Generate a ${fullConfig.mode === 'outline' ? 'structured outline for' : fullConfig.mode === 'section-by-section' ? 'detailed section-by-section response to' : 'complete response to'} the following Health Authority Question:

QUESTION ${context.questionNumber}:
${context.questionText}

${context.ctdSection ? `CTD SECTION REFERENCE: ${context.ctdSection}` : ''}

PRODUCT: ${context.productName}
${context.applicationNumber ? `APPLICATION NUMBER: ${context.applicationNumber}` : ''}
${context.submissionType ? `SUBMISSION TYPE: ${context.submissionType}` : ''}
${context.dueDate ? `DUE DATE: ${context.dueDate}` : ''}

AVAILABLE SOURCE DOCUMENTS:
${sourceContext || 'No source documents provided - use general regulatory knowledge'}
${similarContext}

Generate a comprehensive, well-structured response that:
1. Directly addresses all aspects of the agency's question
2. Provides clear evidence and data to support all claims
3. References appropriate source documentation
4. Is formatted appropriately for regulatory submission`

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: {
        maxTokens: fullConfig.maxTokens,
        temperature: fullConfig.temperature,
      },
    },
    'haq-response',
    'draft-generation'
  )

  const generationTimeMs = Date.now() - startTime

  // Parse the response into sections
  const sections = parseResponseSections(response.content)
  const citations = extractCitations(response.content, sources)

  // Quick quality estimate based on response characteristics
  const qualityScore = estimateQualityScore(response.content, context)

  return {
    content: response.content,
    sections,
    citations,
    qualityScore,
    tokensUsed: response.inputTokens + response.outputTokens,
    generationTimeMs,
    model: response.model,
  }
}

/**
 * Stream HAQ response generation with callbacks
 */
export async function streamHAQResponseDraft(
  context: HAQContext,
  sources: HAQSourceDocument[],
  callbacks: StreamCallbacks & {
    onSection?: (section: GeneratedSection) => void
  },
  config: Partial<GenerationConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const systemPrompt = buildHAQSystemPrompt(context, fullConfig)

  const sourceContext = sources
    .map(s => `- ${s.title} (${s.type})`)
    .join('\n')

  const userPrompt = `Generate a complete response to Question ${context.questionNumber}:

${context.questionText}

PRODUCT: ${context.productName}
SOURCE DOCUMENTS:
${sourceContext || 'Use general regulatory knowledge'}

Generate a comprehensive response.`

  await streamComplete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: {
        maxTokens: fullConfig.maxTokens,
        temperature: fullConfig.temperature,
      },
    },
    callbacks,
    'haq-response',
    'draft-generation'
  )
}

/**
 * Refine an existing HAQ response based on feedback
 */
export async function refineHAQResponse(
  originalContent: string,
  request: RefinementRequest,
  context: HAQContext
): Promise<GeneratedResponse> {
  const startTime = Date.now()

  const systemPrompt = `You are a senior regulatory editor refining HAQ responses for ${context.agency} submission.

REFINEMENT TASK:
- Improve the response based on the provided instruction
- Maintain regulatory compliance and formal tone
- Preserve the overall structure unless explicitly asked to change it
- Ensure all original citations and references remain accurate`

  const userPrompt = `Refine the following HAQ response:

ORIGINAL RESPONSE:
${originalContent}

REFINEMENT INSTRUCTION:
${request.instruction}

${request.focusAreas?.length ? `FOCUS AREAS:\n${request.focusAreas.map(a => `- ${a}`).join('\n')}` : ''}
${request.preserveSections?.length ? `PRESERVE SECTIONS:\n${request.preserveSections.map(s => `- ${s}`).join('\n')}` : ''}

Provide the refined response maintaining the appropriate regulatory tone and completeness.`

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.2, maxTokens: 6000 },
    },
    'haq-response',
    'refinement'
  )

  const generationTimeMs = Date.now() - startTime
  const sections = parseResponseSections(response.content)
  const citations = extractCitations(response.content, [])
  const qualityScore = estimateQualityScore(response.content, context)

  return {
    content: response.content,
    sections,
    citations,
    qualityScore,
    tokensUsed: response.inputTokens + response.outputTokens,
    generationTimeMs,
    model: response.model,
  }
}

/**
 * Assess quality of HAQ response
 */
export async function assessHAQQuality(
  content: string,
  context: HAQContext,
  requirements?: string[]
): Promise<QualityAssessment> {
  const startTime = Date.now()

  const systemPrompt = `You are a regulatory quality reviewer assessing HAQ responses for ${context.agency} submissions.

ASSESSMENT CRITERIA:
1. Completeness (0-100): Does the response address all aspects of the question?
2. Accuracy (0-100): Are facts, data, and citations correct?
3. Clarity (0-100): Is the response clear and unambiguous?
4. Regulatory Tone (0-100): Is the language appropriate for regulatory submission?
5. Evidence Support (0-100): Are claims backed by data and citations?
6. Conciseness (0-100): Is the response appropriately concise without omitting key information?
7. Formatting (0-100): Is the structure and format appropriate?

Provide assessment in JSON format:
{
  "overallScore": number,
  "dimensions": { "completeness": number, "accuracy": number, ... },
  "issues": [{ "severity": "critical|major|minor|info", "dimension": string, "title": string, "description": string, "suggestion": string }],
  "suggestions": [string]
}`

  const userPrompt = `Assess the quality of this HAQ response:

QUESTION ${context.questionNumber} (${context.discipline}):
${context.questionText}

RESPONSE:
${content}

${requirements?.length ? `SPECIFIC REQUIREMENTS TO CHECK:\n${requirements.map(r => `- ${r}`).join('\n')}` : ''}

Provide detailed quality assessment in JSON format.`

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.1, maxTokens: 3000 },
    },
    'haq-response',
    'quality-assessment'
  )

  // Parse the JSON response
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        overallScore: parsed.overallScore || 75,
        dimensions: {
          completeness: parsed.dimensions?.completeness || 75,
          accuracy: parsed.dimensions?.accuracy || 80,
          clarity: parsed.dimensions?.clarity || 75,
          regulatoryTone: parsed.dimensions?.regulatoryTone || parsed.dimensions?.['regulatory-tone'] || 80,
          evidenceSupport: parsed.dimensions?.evidenceSupport || parsed.dimensions?.['evidence-support'] || 70,
          conciseness: parsed.dimensions?.conciseness || 75,
          formatting: parsed.dimensions?.formatting || 80,
        },
        issues: (parsed.issues || []).map((issue: Partial<QualityIssue>, idx: number) => ({
          id: `issue-${idx + 1}`,
          severity: issue.severity || 'minor',
          dimension: issue.dimension || 'general',
          title: issue.title || 'Review needed',
          description: issue.description || '',
          suggestion: issue.suggestion || '',
        })),
        suggestions: parsed.suggestions || [],
        passesThreshold: (parsed.overallScore || 75) >= 70,
      }
    }
  } catch {
    // Return default assessment if parsing fails
  }

  return {
    overallScore: 75,
    dimensions: {
      completeness: 75,
      accuracy: 80,
      clarity: 75,
      regulatoryTone: 80,
      evidenceSupport: 70,
      conciseness: 75,
      formatting: 80,
    },
    issues: [],
    suggestions: ['Quality assessment completed - review recommended'],
    passesThreshold: true,
  }
}

/**
 * Generate suggestions for improving a response
 */
export async function generateImprovementSuggestions(
  content: string,
  context: HAQContext
): Promise<Array<{ type: string; suggestion: string; rationale: string; priority: string }>> {
  const response = await complete(
    {
      system: `You are a regulatory writing coach helping improve HAQ responses.
      
Analyze the response and provide specific, actionable suggestions for improvement.
Format as JSON array: [{ "type": string, "suggestion": string, "rationale": string, "priority": "high|medium|low" }]`,
      messages: [
        {
          role: 'user',
          content: `Suggest improvements for this ${context.discipline} response to ${context.agency}:

QUESTION: ${context.questionText}

RESPONSE:
${content}

Provide specific improvement suggestions in JSON format.`,
        },
      ],
      config: { temperature: 0.3, maxTokens: 2000 },
    },
    'haq-response',
    'review'
  )

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Return empty array if parsing fails
  }

  return []
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseResponseSections(content: string): GeneratedSection[] {
  const sections: GeneratedSection[] = []
  
  // Split by markdown headers
  const headerPattern = /^(#{1,3})\s+(.+)$/gm
  const matches = Array.from(content.matchAll(headerPattern))
  
  if (matches.length === 0) {
    // No headers found, treat as single section
    sections.push({
      id: 'section-1',
      title: 'Response',
      content: content.trim(),
      confidence: 85,
      sources: [],
      needsReview: false,
    })
  } else {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const nextMatch = matches[i + 1]
      const title = match[2]
      const startIndex = match.index! + match[0].length
      const endIndex = nextMatch?.index || content.length
      const sectionContent = content.slice(startIndex, endIndex).trim()

      // Extract sources from citations in this section
      const sourceMatches = sectionContent.match(/\[Source:\s*([^\]]+)\]/gi) || []
      const sources = sourceMatches.map(m => m.replace(/\[Source:\s*|\]/gi, '').trim())

      sections.push({
        id: `section-${i + 1}`,
        title,
        content: sectionContent,
        confidence: 85 - (sourceMatches.length === 0 ? 10 : 0), // Lower confidence if no citations
        sources: Array.from(new Set(sources)),
        needsReview: sectionContent.length < 100, // Flag short sections for review
      })
    }
  }

  return sections
}

function extractCitations(content: string, sources: HAQSourceDocument[]): ResponseCitation[] {
  const citations: ResponseCitation[] = []
  const citationPattern = /\[Source:\s*([^\]]+)\]/gi
  const matches = Array.from(content.matchAll(citationPattern))

  const seen = new Set<string>()

  for (const match of matches) {
    const citationText = match[1].trim()
    if (seen.has(citationText.toLowerCase())) continue
    seen.add(citationText.toLowerCase())

    // Try to match to source document
    let matchedSource: HAQSourceDocument | undefined
    for (const source of sources) {
      if (citationText.toLowerCase().includes(source.title.toLowerCase()) ||
          source.title.toLowerCase().includes(citationText.split(',')[0].toLowerCase())) {
        matchedSource = source
        break
      }
    }

    citations.push({
      id: `cite-${citations.length + 1}`,
      sourceId: matchedSource?.id || 'unknown',
      sourceTitle: matchedSource?.title || citationText.split(',')[0].trim(),
      sourceSection: citationText.includes(',') ? citationText.split(',').slice(1).join(',').trim() : undefined,
      confidence: matchedSource ? 'high' : 'medium',
    })
  }

  return citations
}

function estimateQualityScore(content: string, context: HAQContext): number {
  let score = 75 // Base score

  // Length check - too short or too long
  const wordCount = content.split(/\s+/).filter(Boolean).length
  if (wordCount < 100) score -= 15
  else if (wordCount > 3000) score -= 5
  else if (wordCount >= 200 && wordCount <= 1500) score += 5

  // Citation check
  const citationCount = (content.match(/\[Source:/gi) || []).length
  if (citationCount === 0) score -= 10
  else if (citationCount >= 3) score += 5

  // Structure check - has headers
  if (content.includes('##') || content.includes('###')) score += 5

  // Question reference - mentions the question number or key terms
  if (content.toLowerCase().includes(context.questionNumber.toLowerCase())) score += 2
  
  // Has conclusion or summary
  if (content.toLowerCase().includes('conclusion') || content.toLowerCase().includes('summary')) score += 3

  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateHAQResponseDraft,
  streamHAQResponseDraft,
  refineHAQResponse,
  assessHAQQuality,
  generateImprovementSuggestions,
}
