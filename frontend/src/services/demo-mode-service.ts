
// ============================================================================
// Demo Mode Service - v76: AI Service Wrapper with Demo Fallbacks
// Provides seamless demo mode that returns pre-generated golden outputs
// ============================================================================

import { useDemoStore } from '@/store/useDemoStore'
import {
  DEMO_HAQ_RESPONSES,
  DEMO_SAFETY_NARRATIVES,
  DEMO_DOCUMENT_SECTIONS,
  DEMO_SIGNAL_SUMMARIES,
  getDemoHAQResponse,
  getDemoHAQResponseByQuestion,
  getDemoSafetyNarrative,
  getDemoDocumentSection,
  getDemoSignalSummary,
  simulateStreaming,
  type DemoHAQResponse,
  type DemoSafetyNarrative,
  type DemoDocumentSection,
  type DemoSignalSummary,
  type StreamingConfig,
} from '@/data/demo-ai-outputs'

// ============================================================================
// DEMO MODE CHECK
// ============================================================================

export function isDemoMode(): boolean {
  return useDemoStore.getState().isDemoMode
}

// ============================================================================
// HAQ RESPONSE SERVICE WRAPPER
// ============================================================================

export interface HAQGenerationRequest {
  questionNumber: string
  questionText: string
  discipline: string
  agency: string
  productName: string
  applicationNumber?: string
  sources?: { id: string; title: string; type: string }[]
}

export interface HAQGenerationResult {
  content: string
  sections: { id: string; title: string; content: string }[]
  citations: { source: string; section: string }[]
  qualityScore: number
  wordCount: number
  generationTimeMs: number
  isDemo: boolean
}

export async function generateHAQResponseDemo(
  request: HAQGenerationRequest
): Promise<HAQGenerationResult> {
  // Find matching demo response or use best match
  let demoResponse = getDemoHAQResponseByQuestion(request.questionNumber)
  
  if (!demoResponse) {
    // Find by discipline if exact match not found
    demoResponse = DEMO_HAQ_RESPONSES.find(r => r.discipline === request.discipline)
  }
  
  if (!demoResponse) {
    // Fallback to first demo response
    demoResponse = DEMO_HAQ_RESPONSES[0]
  }
  
  // Simulate API latency
  await simulateLatency(demoResponse.generationTimeMs)
  
  return {
    content: demoResponse.generatedResponse,
    sections: parseResponseSections(demoResponse.generatedResponse),
    citations: demoResponse.citations,
    qualityScore: demoResponse.qualityScore,
    wordCount: demoResponse.wordCount,
    generationTimeMs: demoResponse.generationTimeMs,
    isDemo: true,
  }
}

export function streamHAQResponseDemo(
  request: HAQGenerationRequest,
  onToken: (token: string, position: number) => void,
  onComplete: (result: HAQGenerationResult) => void,
  config?: StreamingConfig
): () => void {
  let demoResponse = getDemoHAQResponseByQuestion(request.questionNumber)
  
  if (!demoResponse) {
    demoResponse = DEMO_HAQ_RESPONSES.find(r => r.discipline === request.discipline)
  }
  
  if (!demoResponse) {
    demoResponse = DEMO_HAQ_RESPONSES[0]
  }
  
  const content = demoResponse.generatedResponse
  
  return simulateStreaming(
    content,
    onToken,
    () => {
      onComplete({
        content,
        sections: parseResponseSections(content),
        citations: demoResponse!.citations,
        qualityScore: demoResponse!.qualityScore,
        wordCount: demoResponse!.wordCount,
        generationTimeMs: demoResponse!.generationTimeMs,
        isDemo: true,
      })
    },
    config
  )
}

// ============================================================================
// SAFETY NARRATIVE SERVICE WRAPPER
// ============================================================================

export interface SafetyNarrativeRequest {
  caseNumber: string
  event: string
  caseType: string
  patient: { age?: number; sex?: string }
  reactions: { term: string; seriousness: string; outcome: string }[]
  drugs: { name: string; role: string; dosage?: string }[]
  format?: 'E2B' | 'CIOMS' | 'MedWatch'
}

export interface SafetyNarrativeResult {
  narrative: string
  format: string
  flags: string[]
  wordCount: number
  generationTimeMs: number
  isDemo: boolean
}

export async function generateSafetyNarrativeDemo(
  request: SafetyNarrativeRequest
): Promise<SafetyNarrativeResult> {
  // Find matching demo narrative
  let demoNarrative = getDemoSafetyNarrative(request.caseNumber)
  
  if (!demoNarrative) {
    // Find by event type
    demoNarrative = DEMO_SAFETY_NARRATIVES.find(
      n => n.event.toLowerCase().includes(request.event.toLowerCase())
    )
  }
  
  if (!demoNarrative) {
    demoNarrative = DEMO_SAFETY_NARRATIVES[0]
  }
  
  await simulateLatency(demoNarrative.generationTimeMs)
  
  return {
    narrative: demoNarrative.narrative,
    format: demoNarrative.format,
    flags: demoNarrative.flags,
    wordCount: demoNarrative.wordCount,
    generationTimeMs: demoNarrative.generationTimeMs,
    isDemo: true,
  }
}

export function streamSafetyNarrativeDemo(
  request: SafetyNarrativeRequest,
  onToken: (token: string, position: number) => void,
  onComplete: (result: SafetyNarrativeResult) => void,
  config?: StreamingConfig
): () => void {
  let demoNarrative = getDemoSafetyNarrative(request.caseNumber)
  
  if (!demoNarrative) {
    demoNarrative = DEMO_SAFETY_NARRATIVES.find(
      n => n.event.toLowerCase().includes(request.event.toLowerCase())
    )
  }
  
  if (!demoNarrative) {
    demoNarrative = DEMO_SAFETY_NARRATIVES[0]
  }
  
  const narrative = demoNarrative.narrative
  
  return simulateStreaming(
    narrative,
    onToken,
    () => {
      onComplete({
        narrative,
        format: demoNarrative!.format,
        flags: demoNarrative!.flags,
        wordCount: demoNarrative!.wordCount,
        generationTimeMs: demoNarrative!.generationTimeMs,
        isDemo: true,
      })
    },
    config
  )
}

// ============================================================================
// DOCUMENT AUTHORING SERVICE WRAPPER
// ============================================================================

export interface DocumentSectionRequest {
  documentType: string
  sectionNumber: string
  sectionTitle: string
  productName: string
  studyName?: string
  indication?: string
  sources?: { id: string; title: string; type: string }[]
}

export interface DocumentSectionResult {
  content: string
  placeholders: { id: string; description: string }[]
  citations: { source: string; section: string }[]
  wordCount: number
  generationTimeMs: number
  isDemo: boolean
}

export async function generateDocumentSectionDemo(
  request: DocumentSectionRequest
): Promise<DocumentSectionResult> {
  // Find matching demo section
  let demoSection = getDemoDocumentSection(request.documentType, request.sectionNumber)
  
  if (!demoSection) {
    // Find by document type
    demoSection = DEMO_DOCUMENT_SECTIONS.find(s => s.documentType === request.documentType)
  }
  
  if (!demoSection) {
    demoSection = DEMO_DOCUMENT_SECTIONS[0]
  }
  
  await simulateLatency(demoSection.generationTimeMs)
  
  return {
    content: demoSection.content,
    placeholders: demoSection.placeholders,
    citations: demoSection.citations,
    wordCount: demoSection.wordCount,
    generationTimeMs: demoSection.generationTimeMs,
    isDemo: true,
  }
}

export function streamDocumentSectionDemo(
  request: DocumentSectionRequest,
  onToken: (token: string, position: number) => void,
  onComplete: (result: DocumentSectionResult) => void,
  config?: StreamingConfig
): () => void {
  let demoSection = getDemoDocumentSection(request.documentType, request.sectionNumber)
  
  if (!demoSection) {
    demoSection = DEMO_DOCUMENT_SECTIONS.find(s => s.documentType === request.documentType)
  }
  
  if (!demoSection) {
    demoSection = DEMO_DOCUMENT_SECTIONS[0]
  }
  
  const content = demoSection.content
  
  return simulateStreaming(
    content,
    onToken,
    () => {
      onComplete({
        content,
        placeholders: demoSection!.placeholders,
        citations: demoSection!.citations,
        wordCount: demoSection!.wordCount,
        generationTimeMs: demoSection!.generationTimeMs,
        isDemo: true,
      })
    },
    config
  )
}

// ============================================================================
// SIGNAL SUMMARY SERVICE WRAPPER
// ============================================================================

export interface SignalSummaryRequest {
  signalId: string
  signalName: string
  product: string
  adverseEvent: string
  statistics?: {
    prr?: { value: number; lower95: number; upper95: number }
    ror?: { value: number; lower95: number; upper95: number }
    observedCases?: number
  }
  purpose?: 'dsur' | 'psur' | 'signal-report' | 'internal'
}

export interface SignalSummaryResult {
  summary: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  recommendedActions: string[]
  wordCount: number
  generationTimeMs: number
  isDemo: boolean
}

export async function generateSignalSummaryDemo(
  request: SignalSummaryRequest
): Promise<SignalSummaryResult> {
  let demoSignal = getDemoSignalSummary(request.signalId)
  
  if (!demoSignal) {
    demoSignal = DEMO_SIGNAL_SUMMARIES[0]
  }
  
  await simulateLatency(demoSignal.generationTimeMs)
  
  return {
    summary: demoSignal.summary,
    riskLevel: demoSignal.riskLevel,
    recommendedActions: demoSignal.recommendedActions,
    wordCount: demoSignal.wordCount,
    generationTimeMs: demoSignal.generationTimeMs,
    isDemo: true,
  }
}

// ============================================================================
// UNIFIED API - AUTO-SELECTS DEMO OR REAL
// ============================================================================

import * as haqAiService from '@/services/haq-ai-service'
import * as safetyAiService from '@/services/safety-ai-service'
import * as documentAiService from '@/services/document-authoring-ai-service'

export async function generateHAQResponse(
  request: HAQGenerationRequest
): Promise<HAQGenerationResult> {
  if (isDemoMode()) {
    return generateHAQResponseDemo(request)
  }
  
  // Call real API service
  const result = await haqAiService.generateHAQResponseDraft(
    {
      questionNumber: request.questionNumber,
      questionText: request.questionText,
      discipline: request.discipline,
      agency: request.agency,
      productName: request.productName,
      applicationNumber: request.applicationNumber,
    },
    request.sources || [],
    {
      mode: 'full-draft',
      style: 'formal',
      maxTokens: 4000,
      temperature: 0.3,
      includeTablePlaceholders: true,
      includeCitations: true,
      regulatoryFramework: [],
      mustIncludeTopics: [],
      mustCiteSources: [],
      avoidTopics: [],
    }
  )
  
  return {
    content: result.content,
    sections: result.sections,
    citations: result.citations.map(c => ({ source: c.sourceTitle, section: c.sourceSection || '' })),
    qualityScore: result.qualityScore,
    wordCount: result.content.split(/\s+/).length,
    generationTimeMs: result.generationTimeMs,
    isDemo: false,
  }
}

export function streamHAQResponse(
  request: HAQGenerationRequest,
  onToken: (token: string, position: number) => void,
  onComplete: (result: HAQGenerationResult) => void,
  config?: StreamingConfig
): () => void {
  if (isDemoMode()) {
    return streamHAQResponseDemo(request, onToken, onComplete, config)
  }
  
  // For real API, we need to implement streaming wrapper
  // For now, fall back to demo mode for streaming
  return streamHAQResponseDemo(request, onToken, onComplete, config)
}

export async function generateSafetyNarrative(
  request: SafetyNarrativeRequest
): Promise<SafetyNarrativeResult> {
  if (isDemoMode()) {
    return generateSafetyNarrativeDemo(request)
  }
  
  // Call real API service
  const result = await safetyAiService.generateCaseNarrative(
    {
      caseNumber: request.caseNumber,
      caseType: (request.caseType === 'solicited' ? 'other' : request.caseType) as 'spontaneous' | 'clinical-trial' | 'literature' | 'other',
      receiptDate: new Date().toISOString().split('T')[0],
      reportSource: 'Healthcare Professional',
      patient: {
        age: request.patient.age,
        sex: request.patient.sex as 'male' | 'female' | 'unknown' | undefined,
      },
      reactions: request.reactions.map(r => ({
        term: r.term,
        seriousness: r.seriousness as 'serious' | 'non-serious',
        outcome: r.outcome as 'recovered' | 'recovering' | 'not-recovered' | 'fatal' | 'unknown',
      })),
      drugs: request.drugs.map(d => ({
        name: d.name,
        role: d.role as 'suspect' | 'concomitant' | 'interacting',
        dosage: d.dosage,
      })),
    },
    {
      format: (request.format?.toLowerCase() || 'e2b') as 'e2b' | 'cioms' | 'medwatch' | 'ich-e2d',
      includeAssessment: true,
      language: 'en',
    }
  )
  
  return {
    narrative: result.narrative,
    format: request.format || 'E2B',
    flags: result.flags.map(f => f.description),
    wordCount: result.wordCount,
    generationTimeMs: result.generationTimeMs,
    isDemo: false,
  }
}

export async function generateDocumentSection(
  request: DocumentSectionRequest
): Promise<DocumentSectionResult> {
  if (isDemoMode()) {
    return generateDocumentSectionDemo(request)
  }
  
  // Call real API service
  const result = await documentAiService.generateSectionContent(
    {
      id: `sec-${request.sectionNumber}`,
      number: request.sectionNumber,
      title: request.sectionTitle,
      requiredElements: [],
    },
    request.documentType.toLowerCase() as any,
    {
      productName: request.productName,
      genericName: 'ligrastinib',
      studyName: request.studyName,
      indication: request.indication,
    },
    request.sources || [],
    {
      includeTablePlaceholders: true,
      includeFigurePlaceholders: true,
      enforceAMAStyle: true,
      targetWordCount: 500,
    }
  )
  
  return {
    content: result.content,
    placeholders: result.placeholders.map(p => ({ id: p.id, description: p.description || '' })),
    citations: result.citations.map(c => ({ source: c.sourceTitle, section: c.sourceSection || '' })),
    wordCount: result.wordCount,
    generationTimeMs: result.generationTimeMs,
    isDemo: false,
  }
}

export async function generateSignalSummary(
  request: SignalSummaryRequest
): Promise<SignalSummaryResult> {
  if (isDemoMode()) {
    return generateSignalSummaryDemo(request)
  }
  
  // Call real API service
  const result = await safetyAiService.generateSignalSummary(
    {
      signalId: request.signalId,
      signalName: request.signalName,
      product: request.product,
      adverseEvent: request.adverseEvent,
      detectionDate: new Date().toISOString().split('T')[0],
      detectionMethod: 'prr',
      statistics: {
        observedCases: request.statistics?.observedCases || 0,
        prr: request.statistics?.prr,
        ror: request.statistics?.ror,
      },
      labelStatus: 'unlabeled',
    },
    {
      purpose: (request.purpose || 'internal') as any,
      detailLevel: 'comprehensive',
    }
  )
  
  return {
    summary: result.summary,
    riskLevel: (result.riskLevel === 'undetermined' ? 'medium' : result.riskLevel) as 'critical' | 'high' | 'medium' | 'low',
    recommendedActions: result.recommendedActions,
    wordCount: result.summary.split(/\s+/).length,
    generationTimeMs: result.generationTimeMs,
    isDemo: false,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function simulateLatency(targetMs: number): Promise<void> {
  // In demo mode, use much shorter latency for snappy demos
  const demoLatency = Math.min(500, targetMs * 0.15)
  return new Promise(resolve => setTimeout(resolve, demoLatency))
}

function parseResponseSections(content: string): { id: string; title: string; content: string }[] {
  const sections: { id: string; title: string; content: string }[] = []
  const lines = content.split('\n')
  let currentSection: { id: string; title: string; content: string } | null = null
  let sectionIndex = 0
  
  for (const line of lines) {
    // Check for bold headers like **Critical Quality Attributes**
    const headerMatch = line.match(/^\*\*([^*]+)\*\*$/)
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection)
      }
      sectionIndex++
      currentSection = {
        id: `section-${sectionIndex}`,
        title: headerMatch[1].trim(),
        content: '',
      }
    } else if (currentSection) {
      currentSection.content += line + '\n'
    }
  }
  
  if (currentSection) {
    sections.push(currentSection)
  }
  
  // If no sections found, create a single section with all content
  if (sections.length === 0) {
    sections.push({
      id: 'section-1',
      title: 'Response',
      content: content,
    })
  }
  
  return sections.map(s => ({
    ...s,
    content: s.content.trim(),
  }))
}

// ============================================================================
// DEMO CONTENT LISTS (for UI selection)
// ============================================================================

export function getAvailableDemoHAQs(): { id: string; questionNumber: string; discipline: string }[] {
  return DEMO_HAQ_RESPONSES.map(r => ({
    id: r.id,
    questionNumber: r.questionNumber,
    discipline: r.discipline,
  }))
}

export function getAvailableDemoNarratives(): { id: string; caseNumber: string; event: string }[] {
  return DEMO_SAFETY_NARRATIVES.map(n => ({
    id: n.id,
    caseNumber: n.caseNumber,
    event: n.event,
  }))
}

export function getAvailableDemoSections(): { id: string; documentType: string; sectionNumber: string }[] {
  return DEMO_DOCUMENT_SECTIONS.map(s => ({
    id: s.id,
    documentType: s.documentType,
    sectionNumber: s.sectionNumber,
  }))
}
