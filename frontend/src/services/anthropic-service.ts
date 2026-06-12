
// ============================================================================
// Anthropic API Service - v75: Real Claude API Integration
// Core service for all AI-powered features across Ligature
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface AnthropicConfig {
  apiKey?: string
  model: AnthropicModel
  maxTokens: number
  temperature: number
  topP?: number
  stopSequences?: string[]
}

export type AnthropicModel = 
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface CompletionRequest {
  system?: string
  messages: Message[]
  config?: Partial<AnthropicConfig>
}

export interface CompletionResponse {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  latencyMs: number
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (response: CompletionResponse) => void
  onError?: (error: Error) => void
}

export interface UsageMetrics {
  requestId: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  latencyMs: number
  timestamp: string
  module: AIModule
  taskType: AITaskType
}

export type AIModule = 
  | 'haq-response'
  | 'document-authoring'
  | 'safety-narratives'
  | 'regulatory-intelligence'
  | 'signal-analysis'
  | 'general'

export type AITaskType =
  | 'draft-generation'
  | 'quality-assessment'
  | 'narrative-generation'
  | 'section-authoring'
  | 'signal-summary'
  | 'benefit-risk'
  | 'refinement'
  | 'review'

// ============================================================================
// COST CALCULATION
// ============================================================================

// Pricing per 1M tokens (as of late 2024)
const MODEL_PRICING: Record<AnthropicModel, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
}

export function calculateCost(
  model: AnthropicModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 10000) / 10000 // Round to 4 decimals
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: AnthropicConfig = {
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,
  temperature: 0.3, // Lower for regulatory precision
  topP: 0.9,
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

const usageHistory: UsageMetrics[] = []
let totalTokensUsed = 0
let totalCost = 0

export function getUsageHistory(): UsageMetrics[] {
  return [...usageHistory]
}

export function getUsageSummary(): {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCost: number
  averageLatency: number
  byModule: Record<AIModule, { requests: number; tokens: number; cost: number }>
  byTaskType: Record<AITaskType, { requests: number; tokens: number; cost: number }>
} {
  const byModule = {} as Record<AIModule, { requests: number; tokens: number; cost: number }>
  const byTaskType = {} as Record<AITaskType, { requests: number; tokens: number; cost: number }>
  
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalLatency = 0

  for (const usage of usageHistory) {
    totalInputTokens += usage.inputTokens
    totalOutputTokens += usage.outputTokens
    totalLatency += usage.latencyMs

    // By module
    if (!byModule[usage.module]) {
      byModule[usage.module] = { requests: 0, tokens: 0, cost: 0 }
    }
    byModule[usage.module].requests++
    byModule[usage.module].tokens += usage.totalTokens
    byModule[usage.module].cost += usage.estimatedCost

    // By task type
    if (!byTaskType[usage.taskType]) {
      byTaskType[usage.taskType] = { requests: 0, tokens: 0, cost: 0 }
    }
    byTaskType[usage.taskType].requests++
    byTaskType[usage.taskType].tokens += usage.totalTokens
    byTaskType[usage.taskType].cost += usage.estimatedCost
  }

  return {
    totalRequests: usageHistory.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost,
    averageLatency: usageHistory.length > 0 ? totalLatency / usageHistory.length : 0,
    byModule,
    byTaskType,
  }
}

export function clearUsageHistory(): void {
  usageHistory.length = 0
  totalTokensUsed = 0
  totalCost = 0
}

// ============================================================================
// API ERROR HANDLING
// ============================================================================

export class AnthropicAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public retryable: boolean
  ) {
    super(message)
    this.name = 'AnthropicAPIError'
  }
}

function parseAPIError(response: Response, data: unknown): AnthropicAPIError {
  const error = data as { error?: { type?: string; message?: string } }
  const errorType = error?.error?.type || 'unknown_error'
  const message = error?.error?.message || `API request failed with status ${response.status}`
  
  // Determine if retryable
  const retryable = response.status === 429 || response.status >= 500

  return new AnthropicAPIError(message, response.status, errorType, retryable)
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry non-retryable errors
      if (error instanceof AnthropicAPIError && !error.retryable) {
        throw error
      }

      // Don't retry if we've exhausted attempts
      if (attempt === config.maxRetries) {
        break
      }

      // Calculate backoff delay
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      )
      
      /* Retry attempt */
      await sleep(delay)
    }
  }

  throw lastError
}

// ============================================================================
// CORE API METHODS
// ============================================================================

/**
 * Make a completion request to the Anthropic API
 */
export async function complete(
  request: CompletionRequest,
  module: AIModule = 'general',
  taskType: AITaskType = 'draft-generation'
): Promise<CompletionResponse> {
  const config = { ...DEFAULT_CONFIG, ...request.config }
  const startTime = Date.now()

  const response = await withRetry(async () => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stop_sequences: config.stopSequences,
        system: request.system,
        messages: request.messages,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw parseAPIError(res, errorData)
    }

    return res
  })

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  // Extract response content
  const content = data.content
    ?.filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('') || ''

  const inputTokens = data.usage?.input_tokens || 0
  const outputTokens = data.usage?.output_tokens || 0

  // Track usage
  const usage: UsageMetrics = {
    requestId: data.id || `req-${Date.now()}`,
    model: config.model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: calculateCost(config.model, inputTokens, outputTokens),
    latencyMs,
    timestamp: new Date().toISOString(),
    module,
    taskType,
  }
  usageHistory.push(usage)
  totalTokensUsed += usage.totalTokens
  totalCost += usage.estimatedCost

  return {
    content,
    model: data.model,
    inputTokens,
    outputTokens,
    stopReason: data.stop_reason || 'end_turn',
    latencyMs,
  }
}

/**
 * Stream a completion response
 */
export async function streamComplete(
  request: CompletionRequest,
  callbacks: StreamCallbacks,
  module: AIModule = 'general',
  taskType: AITaskType = 'draft-generation'
): Promise<void> {
  const config = { ...DEFAULT_CONFIG, ...request.config }
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stop_sequences: config.stopSequences,
        system: request.system,
        messages: request.messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw parseAPIError(response, errorData)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0
    let stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' = 'end_turn'

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            // Handle different event types
            if (event.type === 'content_block_delta') {
              const text = event.delta?.text || ''
              fullContent += text
              callbacks.onToken?.(text)
            } else if (event.type === 'message_start') {
              inputTokens = event.message?.usage?.input_tokens || 0
            } else if (event.type === 'message_delta') {
              outputTokens = event.usage?.output_tokens || 0
              stopReason = event.delta?.stop_reason || stopReason
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime

    // Track usage
    const usage: UsageMetrics = {
      requestId: `req-${Date.now()}`,
      model: config.model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: calculateCost(config.model, inputTokens, outputTokens),
      latencyMs,
      timestamp: new Date().toISOString(),
      module,
      taskType,
    }
    usageHistory.push(usage)
    totalTokensUsed += usage.totalTokens
    totalCost += usage.estimatedCost

    callbacks.onComplete?.({
      content: fullContent,
      model: config.model,
      inputTokens,
      outputTokens,
      stopReason,
      latencyMs,
    })
  } catch (error) {
    callbacks.onError?.(error as Error)
    throw error
  }
}

// ============================================================================
// HELPER METHODS
// ============================================================================

/**
 * Simple single-message completion
 */
export async function ask(
  prompt: string,
  systemPrompt?: string,
  config?: Partial<AnthropicConfig>
): Promise<string> {
  const response = await complete({
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    config,
  })
  return response.content
}

/**
 * Continue a conversation
 */
export async function chat(
  messages: Message[],
  systemPrompt?: string,
  config?: Partial<AnthropicConfig>
): Promise<CompletionResponse> {
  return complete({
    system: systemPrompt,
    messages,
    config,
  })
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}

/**
 * Check if content fits within context window
 */
export function fitsInContext(
  systemPrompt: string,
  messages: Message[],
  maxContextTokens: number = 200000
): boolean {
  let totalTokens = estimateTokens(systemPrompt)
  for (const msg of messages) {
    totalTokens += estimateTokens(msg.content)
  }
  return totalTokens < maxContextTokens
}

// ============================================================================
// SPECIALIZED GENERATION METHODS FOR LIGATURE
// ============================================================================

/**
 * Generate regulatory document content
 */
export async function generateRegulatoryContent(
  sectionTitle: string,
  sectionNumber: string,
  context: {
    documentType: string
    productName: string
    studyName?: string
    indication?: string
    sourceDocuments?: string[]
    guidelines?: string[]
  },
  additionalInstructions?: string
): Promise<CompletionResponse> {
  const systemPrompt = `You are an expert regulatory medical writer with deep expertise in pharmaceutical submissions to FDA, EMA, PMDA, and other health authorities.

WRITING REQUIREMENTS:
1. Use formal, objective, scientific language appropriate for regulatory submissions
2. Be precise with numbers, statistics, and clinical terminology
3. Use past tense for completed studies, present tense for established facts
4. Maintain consistency in terminology throughout
5. Include appropriate hedging language where uncertainty exists
6. Follow ICH guidelines: ${context.guidelines?.join(', ') || 'E6(R2), E8, E9, M4'}

FORMATTING:
- Use markdown headers (##, ###) for structure
- Use **bold** for key findings
- Include [Insert Table X.X] placeholders where data tables belong
- Reference source documents with [Source: Document Name]`

  const userPrompt = `Generate content for "${sectionNumber} ${sectionTitle}" in a ${context.documentType} document.

CONTEXT:
- Product: ${context.productName}
${context.studyName ? `- Study: ${context.studyName}` : ''}
${context.indication ? `- Indication: ${context.indication}` : ''}

${context.sourceDocuments?.length ? `SOURCE DOCUMENTS:\n${context.sourceDocuments.map(d => `- ${d}`).join('\n')}` : ''}

${additionalInstructions ? `ADDITIONAL INSTRUCTIONS:\n${additionalInstructions}` : ''}

Generate comprehensive, submission-ready content for this section.`

  return complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.3 },
    },
    'document-authoring',
    'section-authoring'
  )
}

/**
 * Generate HAQ response draft
 */
export async function generateHAQResponse(
  question: {
    number: string
    text: string
    discipline: string
    agency: string
    section?: string
  },
  context: {
    productName: string
    applicationNumber?: string
    submissionType?: string
    relevantDocuments?: string[]
    previousResponses?: string[]
    guidelines?: string[]
  },
  style: 'formal' | 'concise' | 'detailed' = 'formal'
): Promise<CompletionResponse> {
  const systemPrompt = `You are a senior regulatory affairs specialist responding to Health Authority Questions (HAQs).

AGENCY: ${question.agency}
DISCIPLINE: ${question.discipline}

RESPONSE REQUIREMENTS:
1. Address the question directly and completely
2. Reference relevant source documentation with citations
3. Use ${style === 'concise' ? 'concise, direct language' : style === 'detailed' ? 'comprehensive, detailed explanations' : 'formal regulatory language'}
4. Structure response with clear sections when multiple points are addressed
5. Include specific data, tables, or cross-references as appropriate
6. Maintain consistency with previous submissions

${context.guidelines?.length ? `RELEVANT GUIDELINES:\n${context.guidelines.join(', ')}` : ''}`

  const userPrompt = `Generate a response to the following Health Authority Question:

QUESTION ${question.number}:
${question?.text ?? ''}

${question.section ? `CTD SECTION REFERENCE: ${question.section}` : ''}

PRODUCT: ${context.productName}
${context.applicationNumber ? `APPLICATION: ${context.applicationNumber}` : ''}
${context.submissionType ? `SUBMISSION TYPE: ${context.submissionType}` : ''}

${context.relevantDocuments?.length ? `RELEVANT DOCUMENTS:\n${context.relevantDocuments.map(d => `- ${d}`).join('\n')}` : ''}

${context.previousResponses?.length ? `RELATED PREVIOUS RESPONSES:\n${context.previousResponses.join('\n---\n')}` : ''}

Generate a comprehensive, well-structured response that directly addresses the agency's question.`

  return complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.3, maxTokens: 6000 },
    },
    'haq-response',
    'draft-generation'
  )
}

/**
 * Generate safety case narrative
 */
export async function generateSafetyNarrative(
  caseData: {
    caseNumber: string
    patientAge?: number
    patientSex?: string
    reactions: Array<{ term: string; seriousness: string; outcome?: string }>
    drugs: Array<{ name: string; role: string; dosage?: string }>
    timeline?: string
    relevantHistory?: string
    labResults?: string
  },
  options: {
    format: 'e2b' | 'cioms' | 'medwatch'
    includeAssessment: boolean
    maxLength?: number
  } = { format: 'e2b', includeAssessment: true }
): Promise<CompletionResponse> {
  const systemPrompt = `You are a pharmacovigilance medical writer creating case narratives for regulatory safety reporting.

FORMAT: ${options.format.toUpperCase()}

NARRATIVE REQUIREMENTS:
1. Present case information in chronological order
2. Use past tense throughout
3. Include all relevant medical terms (MedDRA preferred terms)
4. State causality assessment if data supports it
5. Be objective and factual - avoid speculation
6. Follow E2B(R3) narrative conventions
7. ${options.maxLength ? `Keep narrative under ${options.maxLength} words` : 'Provide complete but concise narrative'}`

  const reactionsList = caseData.reactions
    .map(r => `- ${r.term} (${r.seriousness}${r.outcome ? `, ${r.outcome}` : ''})`)
    .join('\n')
  
  const drugsList = caseData.drugs
    .map(d => `- ${d.name} (${d.role}${d.dosage ? `, ${d.dosage}` : ''})`)
    .join('\n')

  const userPrompt = `Generate a safety case narrative for:

CASE: ${caseData.caseNumber}

PATIENT:
- Age: ${caseData.patientAge || 'Unknown'}
- Sex: ${caseData.patientSex || 'Unknown'}

REACTIONS:
${reactionsList}

DRUGS:
${drugsList}

${caseData.timeline ? `TIMELINE:\n${caseData.timeline}` : ''}

${caseData.relevantHistory ? `RELEVANT HISTORY:\n${caseData.relevantHistory}` : ''}

${caseData.labResults ? `LABORATORY RESULTS:\n${caseData.labResults}` : ''}

Generate a complete narrative ${options.includeAssessment ? 'with causality assessment' : 'without causality assessment'}.`

  return complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.2, maxTokens: 2000 },
    },
    'safety-narratives',
    'narrative-generation'
  )
}

/**
 * Generate signal summary
 */
export async function generateSignalSummary(
  signal: {
    signalId: string
    term: string
    product: string
    detectionMethod: string
    statistics: {
      prr?: number
      ror?: number
      ebgm?: number
      caseCount: number
    }
    caseSummaries?: string[]
    literature?: string[]
  },
  purpose: 'dsur' | 'psur' | 'internal-review' | 'signal-report' = 'internal-review'
): Promise<CompletionResponse> {
  const systemPrompt = `You are a pharmacovigilance signal analyst preparing signal documentation for ${purpose === 'dsur' ? 'Development Safety Update Report (DSUR)' : purpose === 'psur' ? 'Periodic Safety Update Report (PSUR/PBRER)' : purpose === 'signal-report' ? 'formal signal report' : 'internal safety review'}.

REQUIREMENTS:
1. Present signal findings objectively
2. Include disproportionality statistics with interpretation
3. Summarize case characteristics
4. Consider biological plausibility
5. Reference relevant literature if available
6. State current signal status and recommended actions`

  const statsText = [
    signal.statistics.prr !== undefined ? `PRR: ${signal.statistics.prr}` : '',
    signal.statistics.ror !== undefined ? `ROR: ${signal.statistics.ror}` : '',
    signal.statistics.ebgm !== undefined ? `EBGM: ${signal.statistics.ebgm}` : '',
    `Case count: ${signal.statistics.caseCount}`,
  ].filter(Boolean).join(', ')

  const userPrompt = `Generate a signal summary for:

SIGNAL: ${signal.signalId}
PRODUCT: ${signal.product}
ADVERSE EVENT TERM: ${signal.term}
DETECTION METHOD: ${signal.detectionMethod}

STATISTICS:
${statsText}

${signal.caseSummaries?.length ? `CASE SUMMARIES:\n${signal.caseSummaries.join('\n')}` : ''}

${signal.literature?.length ? `RELEVANT LITERATURE:\n${signal.literature.join('\n')}` : ''}

Generate a comprehensive signal summary for ${purpose} purposes.`

  return complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.2, maxTokens: 3000 },
    },
    'signal-analysis',
    'signal-summary'
  )
}

/**
 * Quality assessment for generated content
 */
export async function assessContentQuality(
  content: string,
  context: {
    documentType: string
    sectionType: string
    requirements?: string[]
  }
): Promise<{
  overallScore: number
  dimensions: Record<string, number>
  issues: Array<{ severity: string; description: string; suggestion: string }>
  suggestions: string[]
}> {
  const response = await complete(
    {
      system: `You are a regulatory document quality reviewer. Assess content for regulatory submission quality.

ASSESSMENT DIMENSIONS:
1. Completeness (0-100): All required elements present
2. Accuracy (0-100): Factual correctness, proper citations
3. Clarity (0-100): Clear, unambiguous language
4. Regulatory Tone (0-100): Appropriate formal language
5. Evidence Support (0-100): Claims backed by data/citations
6. Formatting (0-100): Proper structure and format

Respond in JSON format with: overallScore, dimensions, issues[], suggestions[]`,
      messages: [
        {
          role: 'user',
          content: `Assess this ${context.documentType} content (${context.sectionType}):

${content}

${context.requirements?.length ? `REQUIREMENTS TO CHECK:\n${context.requirements.join('\n')}` : ''}

Provide quality assessment in JSON format.`,
        },
      ],
      config: { temperature: 0.1, maxTokens: 2000 },
    },
    'general',
    'quality-assessment'
  )

  // Parse JSON response
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Return default if parsing fails
  }

  return {
    overallScore: 75,
    dimensions: {
      completeness: 75,
      accuracy: 80,
      clarity: 75,
      'regulatory-tone': 80,
      'evidence-support': 70,
      formatting: 80,
    },
    issues: [],
    suggestions: ['Unable to parse detailed assessment'],
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  complete,
  streamComplete,
  ask,
  chat,
  estimateTokens,
  fitsInContext,
  generateRegulatoryContent,
  generateHAQResponse,
  generateSafetyNarrative,
  generateSignalSummary,
  assessContentQuality,
  getUsageHistory,
  getUsageSummary,
  clearUsageHistory,
  calculateCost,
}
