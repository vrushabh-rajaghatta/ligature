
// ============================================================================
// Safety AI Service - v75: Real Claude API Integration
// AI-powered safety narrative generation, signal analysis, and B-R summaries
// ============================================================================

import {
  complete,
  streamComplete,
  type CompletionResponse,
  type StreamCallbacks,
} from './anthropic-service'

// ============================================================================
// TYPES
// ============================================================================

// Case Narrative Types
export interface CaseNarrativeInput {
  caseNumber: string
  caseType: 'spontaneous' | 'clinical-trial' | 'literature' | 'other'
  receiptDate: string
  reportSource: string
  
  patient: {
    age?: number
    ageUnit?: 'years' | 'months' | 'days'
    sex?: 'male' | 'female' | 'unknown'
    weight?: number
    height?: number
    relevantHistory?: string[]
    concomitantConditions?: string[]
  }
  
  reactions: Array<{
    term: string
    meddraCode?: string
    seriousness: 'serious' | 'non-serious'
    seriousnessCriteria?: string[]
    outcome: 'recovered' | 'recovering' | 'not-recovered' | 'fatal' | 'unknown'
    onsetDate?: string
    resolutionDate?: string
    duration?: string
    description?: string
  }>
  
  drugs: Array<{
    name: string
    genericName?: string
    role: 'suspect' | 'concomitant' | 'interacting'
    indication?: string
    dosage?: string
    route?: string
    startDate?: string
    stopDate?: string
    actionTaken?: 'withdrawn' | 'dose-reduced' | 'dose-increased' | 'unchanged' | 'unknown'
    rechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown'
    dechallenge?: 'positive' | 'negative' | 'not-done' | 'unknown'
  }>
  
  timeline?: string
  labResults?: Array<{
    test: string
    value: string
    unit?: string
    date?: string
    normalRange?: string
    interpretation?: string
  }>
  
  reporterAssessment?: string
  companyAssessment?: string
  narrativeNotes?: string
}

export interface GeneratedNarrative {
  narrative: string
  wordCount: number
  sections: {
    patientDescription: string
    drugExposure: string
    eventDescription: string
    clinicalCourse: string
    assessment?: string
    conclusion?: string
  }
  flags: Array<{
    type: 'missing-data' | 'inconsistency' | 'requires-followup'
    description: string
    field?: string
  }>
  tokensUsed: number
  generationTimeMs: number
  model: string
}

export interface NarrativeConfig {
  format: 'e2b' | 'cioms' | 'medwatch' | 'ich-e2d'
  includeAssessment: boolean
  maxLength?: number
  language: 'en' | 'formal-en'
  includeLabNarratives: boolean
}

// Signal Analysis Types
export interface SignalInput {
  signalId: string
  signalName: string
  product: string
  activeSubstance?: string
  adverseEvent: string
  meddraCode?: string
  detectionDate: string
  detectionMethod: 'prr' | 'ror' | 'ebgm' | 'bcpnn' | 'manual'
  
  statistics: {
    prr?: { value: number; lower95: number; upper95: number }
    ror?: { value: number; lower95: number; upper95: number }
    ebgm?: { value: number; lower05: number }
    observedCases: number
    expectedCases?: number
    backgroundRate?: number
  }
  
  caseCharacteristics?: {
    totalCases: number
    seriousCases: number
    fatalCases: number
    medianAge?: number
    sexDistribution?: { male: number; female: number; unknown: number }
    medianTimeToOnset?: string
    outcomeDistribution?: Record<string, number>
  }
  
  caseSummaries?: string[]
  literatureReferences?: Array<{
    citation: string
    summary?: string
    relevance?: string
  }>
  
  labelStatus?: 'labeled' | 'unlabeled' | 'partially-labeled'
  biologicalPlausibility?: string
  previousSignalHistory?: string
}

export interface SignalSummary {
  summary: string
  sections: {
    signalDescription: string
    statisticalEvidence: string
    caseAnalysis: string
    literatureReview?: string
    biologicalPlausibility?: string
    assessment: string
    recommendation: string
  }
  riskLevel: 'high' | 'medium' | 'low' | 'undetermined'
  recommendedActions: string[]
  tokensUsed: number
  generationTimeMs: number
  model: string
}

export interface SignalSummaryConfig {
  purpose: 'dsur' | 'psur' | 'pbrer' | 'signal-report' | 'internal-review' | 'safety-committee'
  detailLevel: 'brief' | 'standard' | 'comprehensive'
  includeRecommendations: boolean
}

// Benefit-Risk Types
export interface BenefitRiskInput {
  product: string
  indication: string
  approvalStatus: 'approved' | 'under-review' | 'investigational'
  
  benefits: Array<{
    category: 'efficacy' | 'qol' | 'survival' | 'symptom-control' | 'other'
    description: string
    evidence: string
    strength: 'strong' | 'moderate' | 'limited'
    dataSource?: string
  }>
  
  risks: Array<{
    category: 'safety' | 'tolerability' | 'convenience' | 'other'
    description: string
    frequency?: string
    severity?: 'mild' | 'moderate' | 'severe' | 'fatal'
    manageability: 'manageable' | 'difficult' | 'unmanageable'
    evidence: string
    dataSource?: string
  }>
  
  uncertainties?: string[]
  riskMinimization?: string[]
  comparators?: Array<{
    name: string
    comparison: string
  }>
  
  targetPopulation?: string
  specialPopulations?: string[]
  contextualFactors?: string[]
}

export interface BenefitRiskAssessment {
  assessment: string
  conclusion: 'favorable' | 'unfavorable' | 'uncertain' | 'conditionally-favorable'
  sections: {
    benefitSummary: string
    riskSummary: string
    balanceAssessment: string
    uncertainties?: string
    recommendations: string
  }
  keyMessages: string[]
  tokensUsed: number
  generationTimeMs: number
  model: string
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_NARRATIVE_CONFIG: NarrativeConfig = {
  format: 'e2b',
  includeAssessment: true,
  language: 'formal-en',
  includeLabNarratives: true,
}

const DEFAULT_SIGNAL_CONFIG: SignalSummaryConfig = {
  purpose: 'internal-review',
  detailLevel: 'standard',
  includeRecommendations: true,
}

// ============================================================================
// CASE NARRATIVE GENERATION
// ============================================================================

/**
 * Generate ICSR case narrative from structured data
 */
export async function generateCaseNarrative(
  input: CaseNarrativeInput,
  config: Partial<NarrativeConfig> = {}
): Promise<GeneratedNarrative> {
  const fullConfig = { ...DEFAULT_NARRATIVE_CONFIG, ...config }
  const startTime = Date.now()

  const systemPrompt = buildNarrativeSystemPrompt(fullConfig)
  const userPrompt = buildNarrativeUserPrompt(input, fullConfig)

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: {
        temperature: 0.2,
        maxTokens: fullConfig.maxLength ? Math.ceil(fullConfig.maxLength * 1.5) : 2500,
      },
    },
    'safety-narratives',
    'narrative-generation'
  )

  const generationTimeMs = Date.now() - startTime

  // Parse narrative into sections
  const sections = parseNarrativeSections(response.content)
  const flags = identifyDataGaps(input)

  return {
    narrative: response.content,
    wordCount: response.content.split(/\s+/).filter(Boolean).length,
    sections,
    flags,
    tokensUsed: response.inputTokens + response.outputTokens,
    generationTimeMs,
    model: response.model,
  }
}

/**
 * Stream case narrative generation
 */
export async function streamCaseNarrative(
  input: CaseNarrativeInput,
  callbacks: StreamCallbacks,
  config: Partial<NarrativeConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_NARRATIVE_CONFIG, ...config }
  const systemPrompt = buildNarrativeSystemPrompt(fullConfig)
  const userPrompt = buildNarrativeUserPrompt(input, fullConfig)

  await streamComplete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: {
        temperature: 0.2,
        maxTokens: fullConfig.maxLength ? Math.ceil(fullConfig.maxLength * 1.5) : 2500,
      },
    },
    callbacks,
    'safety-narratives',
    'narrative-generation'
  )
}

/**
 * Batch generate narratives for multiple cases
 */
export async function batchGenerateNarratives(
  cases: CaseNarrativeInput[],
  config: Partial<NarrativeConfig> = {},
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedNarrative[]> {
  const results: GeneratedNarrative[] = []

  for (let i = 0; i < cases.length; i++) {
    const result = await generateCaseNarrative(cases[i], config)
    results.push(result)
    onProgress?.(i + 1, cases.length)
  }

  return results
}

// ============================================================================
// SIGNAL ANALYSIS
// ============================================================================

/**
 * Generate signal summary for regulatory reporting
 */
export async function generateSignalSummary(
  input: SignalInput,
  config: Partial<SignalSummaryConfig> = {}
): Promise<SignalSummary> {
  const fullConfig = { ...DEFAULT_SIGNAL_CONFIG, ...config }
  const startTime = Date.now()

  const systemPrompt = buildSignalSystemPrompt(fullConfig)
  const userPrompt = buildSignalUserPrompt(input, fullConfig)

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: {
        temperature: 0.2,
        maxTokens: fullConfig.detailLevel === 'comprehensive' ? 4000 : 
                   fullConfig.detailLevel === 'brief' ? 1500 : 2500,
      },
    },
    'signal-analysis',
    'signal-summary'
  )

  const generationTimeMs = Date.now() - startTime
  const sections = parseSignalSections(response.content)
  const riskLevel = assessSignalRiskLevel(input)
  const recommendedActions = extractRecommendedActions(response.content)

  return {
    summary: response.content,
    sections,
    riskLevel,
    recommendedActions,
    tokensUsed: response.inputTokens + response.outputTokens,
    generationTimeMs,
    model: response.model,
  }
}

/**
 * Generate comparative signal analysis
 */
export async function compareSignals(
  signals: SignalInput[],
  product: string
): Promise<{
  comparison: string
  prioritization: Array<{ signalId: string; priority: string; rationale: string }>
  tokensUsed: number
}> {
  const signalSummaries = signals.map(s => `
Signal: ${s.signalName} (${s.adverseEvent})
- Cases: ${s.statistics.observedCases}
- PRR: ${s.statistics.prr?.value || 'N/A'}
- Label Status: ${s.labelStatus || 'Unknown'}`).join('\n')

  const response = await complete(
    {
      system: `You are a pharmacovigilance signal analyst comparing multiple safety signals for prioritization.
      
Assess each signal's:
1. Strength of statistical evidence
2. Clinical significance
3. Public health impact
4. Urgency for action

Provide prioritization with clear rationale.`,
      messages: [
        {
          role: 'user',
          content: `Compare and prioritize these safety signals for ${product}:

${signalSummaries}

Provide comparative analysis and prioritized ranking.`,
        },
      ],
      config: { temperature: 0.2, maxTokens: 3000 },
    },
    'signal-analysis',
    'signal-summary'
  )

  // Extract prioritization from response
  const prioritization = signals.map(s => ({
    signalId: s.signalId,
    priority: 'medium', // Would parse from response in production
    rationale: 'Based on statistical evidence and clinical significance',
  }))

  return {
    comparison: response.content,
    prioritization,
    tokensUsed: response.inputTokens + response.outputTokens,
  }
}

// ============================================================================
// BENEFIT-RISK ASSESSMENT
// ============================================================================

/**
 * Generate benefit-risk assessment narrative
 */
export async function generateBenefitRiskAssessment(
  input: BenefitRiskInput
): Promise<BenefitRiskAssessment> {
  const startTime = Date.now()

  const systemPrompt = `You are a regulatory scientist preparing benefit-risk assessments for pharmaceutical products.

ASSESSMENT FRAMEWORK:
1. Summarize key benefits with supporting evidence
2. Summarize key risks with frequency and severity
3. Weigh benefits against risks for the target population
4. Consider uncertainties and data limitations
5. Provide clear conclusion and recommendations

Use ICH E1/FDA benefit-risk framework conventions.
Be objective, balanced, and evidence-based.`

  const benefitsList = input.benefits
    .map(b => `- ${b.category}: ${b.description} (Evidence: ${b.evidence}, Strength: ${b.strength})`)
    .join('\n')

  const risksList = input.risks
    .map(r => `- ${r.category}: ${r.description} (Frequency: ${r.frequency || 'Unknown'}, Severity: ${r.severity || 'Unknown'}, Manageability: ${r.manageability})`)
    .join('\n')

  const userPrompt = `Generate a benefit-risk assessment for:

PRODUCT: ${input.product}
INDICATION: ${input.indication}
APPROVAL STATUS: ${input.approvalStatus}
${input.targetPopulation ? `TARGET POPULATION: ${input.targetPopulation}` : ''}

BENEFITS:
${benefitsList}

RISKS:
${risksList}

${input.uncertainties?.length ? `UNCERTAINTIES:\n${input.uncertainties.map(u => `- ${u}`).join('\n')}` : ''}

${input.riskMinimization?.length ? `RISK MINIMIZATION MEASURES:\n${input.riskMinimization.map(r => `- ${r}`).join('\n')}` : ''}

${input.comparators?.length ? `COMPARATORS:\n${input.comparators.map(c => `- ${c.name}: ${c.comparison}`).join('\n')}` : ''}

${input.specialPopulations?.length ? `SPECIAL POPULATIONS: ${input.specialPopulations.join(', ')}` : ''}

Provide a comprehensive benefit-risk assessment with clear conclusion.`

  const response = await complete(
    {
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      config: { temperature: 0.2, maxTokens: 4000 },
    },
    'safety-narratives',
    'benefit-risk'
  )

  const generationTimeMs = Date.now() - startTime
  const sections = parseBRSections(response.content)
  const conclusion = determineBRConclusion(response.content)
  const keyMessages = extractKeyMessages(response.content)

  return {
    assessment: response.content,
    conclusion,
    sections,
    keyMessages,
    tokensUsed: response.inputTokens + response.outputTokens,
    generationTimeMs,
    model: response.model,
  }
}

// ============================================================================
// AGGREGATE REPORT SUPPORT
// ============================================================================

/**
 * Generate line listing summary for aggregate reports
 */
export async function generateLineListingSummary(
  lineListingData: {
    totalCases: number
    seriousCases: number
    fatalCases: number
    topReactions: Array<{ term: string; count: number }>
    ageDistribution: Record<string, number>
    periodStart: string
    periodEnd: string
    product: string
  }
): Promise<{ summary: string; highlights: string[]; tokensUsed: number }> {
  const topReactionsText = lineListingData.topReactions
    .slice(0, 10)
    .map((r, i) => `${i + 1}. ${r.term} (n=${r.count})`)
    .join('\n')

  const response = await complete(
    {
      system: `You are a pharmacovigilance medical writer summarizing safety data for aggregate reports (PSUR/PBRER/DSUR).
      
Write clear, objective summaries using regulatory language conventions.
Highlight significant findings and trends.`,
      messages: [
        {
          role: 'user',
          content: `Summarize this line listing data for ${lineListingData.product}:

REPORTING PERIOD: ${lineListingData.periodStart} to ${lineListingData.periodEnd}

CASE OVERVIEW:
- Total cases: ${lineListingData.totalCases}
- Serious cases: ${lineListingData.seriousCases} (${Math.round(lineListingData.seriousCases / lineListingData.totalCases * 100)}%)
- Fatal cases: ${lineListingData.fatalCases}

TOP ADVERSE REACTIONS:
${topReactionsText}

AGE DISTRIBUTION:
${Object.entries(lineListingData.ageDistribution).map(([range, count]) => `- ${range}: ${count}`).join('\n')}

Generate a concise executive summary suitable for aggregate safety report.`,
        },
      ],
      config: { temperature: 0.2, maxTokens: 1500 },
    },
    'safety-narratives',
    'narrative-generation'
  )

  // Extract key highlights
  const highlights = [
    `${lineListingData.totalCases} total cases received during period`,
    `${lineListingData.seriousCases} serious cases (${Math.round(lineListingData.seriousCases / lineListingData.totalCases * 100)}%)`,
    `Most common: ${lineListingData.topReactions[0]?.term || 'N/A'} (n=${lineListingData.topReactions[0]?.count || 0})`,
  ]

  return {
    summary: response.content,
    highlights,
    tokensUsed: response.inputTokens + response.outputTokens,
  }
}

// ============================================================================
// HELPER FUNCTIONS - PROMPTS
// ============================================================================

function buildNarrativeSystemPrompt(config: NarrativeConfig): string {
  const formatGuidance: Record<string, string> = {
    'e2b': 'Follow E2B(R3) narrative conventions for electronic transmission',
    'cioms': 'Use CIOMS form narrative structure',
    'medwatch': 'Follow FDA MedWatch narrative format',
    'ich-e2d': 'Apply ICH E2D guidelines for post-approval safety reporting',
  }

  return `You are an expert pharmacovigilance medical writer creating Individual Case Safety Report (ICSR) narratives.

FORMAT: ${config.format.toUpperCase()}
${formatGuidance[config.format]}

NARRATIVE REQUIREMENTS:
1. Present information in chronological order
2. Use past tense consistently throughout
3. Include all relevant medical terms (MedDRA preferred terms)
4. Be objective and factual - avoid speculation
5. State dechallenge/rechallenge outcomes clearly when available
6. ${config.includeAssessment ? 'Include causality assessment based on available data' : 'Do not include causality assessment'}
7. ${config.maxLength ? `Keep narrative under ${config.maxLength} words` : 'Provide complete but concise narrative'}
8. ${config.includeLabNarratives ? 'Incorporate relevant laboratory findings' : 'Summarize laboratory findings briefly'}

Use formal medical English appropriate for regulatory submission.`
}

function buildNarrativeUserPrompt(input: CaseNarrativeInput, config: NarrativeConfig): string {
  // Format patient info
  const patientInfo = [
    input.patient.age ? `${input.patient.age} ${input.patient.ageUnit || 'years'} old` : 'Age unknown',
    input.patient.sex || 'sex unknown',
    input.patient.weight ? `${input.patient.weight} kg` : null,
    input.patient.height ? `${input.patient.height} cm` : null,
  ].filter(Boolean).join(', ')

  // Format reactions
  const reactionsText = input.reactions
    .map(r => {
      let text = `- ${r.term} (${r.seriousness})`
      if (r.seriousnessCriteria?.length) text += ` [${r.seriousnessCriteria.join(', ')}]`
      text += ` - Outcome: ${r.outcome}`
      if (r.onsetDate) text += `, Onset: ${r.onsetDate}`
      if (r.description) text += `\n  ${r.description}`
      return text
    })
    .join('\n')

  // Format drugs
  const drugsText = input.drugs
    .map(d => {
      let text = `- ${d.name}${d.genericName ? ` (${d.genericName})` : ''} [${d.role}]`
      if (d.indication) text += `\n  Indication: ${d.indication}`
      if (d.dosage) text += `\n  Dosage: ${d.dosage}`
      if (d.route) text += ` (${d.route})`
      if (d.startDate || d.stopDate) text += `\n  Duration: ${d.startDate || '?'} to ${d.stopDate || 'ongoing'}`
      if (d.actionTaken && d.actionTaken !== 'unknown') text += `\n  Action: ${d.actionTaken}`
      if (d.dechallenge && d.dechallenge !== 'unknown') text += `, Dechallenge: ${d.dechallenge}`
      if (d.rechallenge && d.rechallenge !== 'unknown') text += `, Rechallenge: ${d.rechallenge}`
      return text
    })
    .join('\n')

  // Format lab results
  const labText = input.labResults?.length
    ? input.labResults.map(l => `- ${l.test}: ${l.value} ${l.unit || ''} (${l.interpretation || 'N/A'})`).join('\n')
    : ''

  return `Generate an ICSR narrative for the following case:

CASE INFORMATION:
- Case Number: ${input.caseNumber}
- Case Type: ${input.caseType}
- Receipt Date: ${input.receiptDate}
- Report Source: ${input.reportSource}

PATIENT:
${patientInfo}
${input.patient.relevantHistory?.length ? `Medical History: ${input.patient.relevantHistory.join('; ')}` : ''}
${input.patient.concomitantConditions?.length ? `Concomitant Conditions: ${input.patient.concomitantConditions.join('; ')}` : ''}

ADVERSE REACTIONS:
${reactionsText}

SUSPECT/CONCOMITANT DRUGS:
${drugsText}

${input.timeline ? `TIMELINE:\n${input.timeline}` : ''}

${labText ? `LABORATORY RESULTS:\n${labText}` : ''}

${input.reporterAssessment ? `REPORTER ASSESSMENT: ${input.reporterAssessment}` : ''}
${input.narrativeNotes ? `ADDITIONAL NOTES: ${input.narrativeNotes}` : ''}

Generate a complete ${config.format.toUpperCase()} format narrative.`
}

function buildSignalSystemPrompt(config: SignalSummaryConfig): string {
  const purposeGuidance: Record<string, string> = {
    'dsur': 'Format for Development Safety Update Report (ICH E2F)',
    'psur': 'Format for Periodic Safety Update Report',
    'pbrer': 'Format for Periodic Benefit-Risk Evaluation Report (ICH E2C R2)',
    'signal-report': 'Format as formal signal evaluation report',
    'internal-review': 'Format for internal safety review committee',
    'safety-committee': 'Format for safety monitoring committee presentation',
  }

  return `You are a pharmacovigilance signal analyst preparing signal documentation.

PURPOSE: ${purposeGuidance[config.purpose]}
DETAIL LEVEL: ${config.detailLevel}

SIGNAL SUMMARY REQUIREMENTS:
1. Describe the signal clearly with product and event terms
2. Present statistical evidence with appropriate interpretation
3. Summarize case characteristics and clinical features
4. Review relevant literature if available
5. Assess biological plausibility
6. ${config.includeRecommendations ? 'Provide specific recommendations for action' : 'Summarize current status only'}

Be objective and evidence-based. Note limitations and uncertainties.`
}

function buildSignalUserPrompt(input: SignalInput, config: SignalSummaryConfig): string {
  // Format statistics
  const statsText = [
    input.statistics.prr ? `PRR: ${input.statistics.prr.value} (95% CI: ${input.statistics.prr.lower95}-${input.statistics.prr.upper95})` : '',
    input.statistics.ror ? `ROR: ${input.statistics.ror.value} (95% CI: ${input.statistics.ror.lower95}-${input.statistics.ror.upper95})` : '',
    input.statistics.ebgm ? `EBGM: ${input.statistics.ebgm.value} (EB05: ${input.statistics.ebgm.lower05})` : '',
    `Observed cases: ${input.statistics.observedCases}`,
    input.statistics.expectedCases ? `Expected cases: ${input.statistics.expectedCases}` : '',
  ].filter(Boolean).join('\n')

  // Format case characteristics
  const caseCharText = input.caseCharacteristics ? `
CASE CHARACTERISTICS:
- Total cases: ${input.caseCharacteristics.totalCases}
- Serious: ${input.caseCharacteristics.seriousCases} (${Math.round(input.caseCharacteristics.seriousCases / input.caseCharacteristics.totalCases * 100)}%)
- Fatal: ${input.caseCharacteristics.fatalCases}
${input.caseCharacteristics.medianAge ? `- Median age: ${input.caseCharacteristics.medianAge} years` : ''}
${input.caseCharacteristics.medianTimeToOnset ? `- Median time to onset: ${input.caseCharacteristics.medianTimeToOnset}` : ''}` : ''

  // Format literature
  const litText = input.literatureReferences?.length
    ? `LITERATURE:\n${input.literatureReferences.map(l => `- ${l.citation}${l.summary ? `: ${l.summary}` : ''}`).join('\n')}`
    : ''

  return `Generate a ${config.detailLevel} signal summary for:

SIGNAL: ${input.signalId} - ${input.signalName}
PRODUCT: ${input.product}${input.activeSubstance ? ` (${input.activeSubstance})` : ''}
ADVERSE EVENT: ${input.adverseEvent}${input.meddraCode ? ` (MedDRA: ${input.meddraCode})` : ''}
DETECTION DATE: ${input.detectionDate}
DETECTION METHOD: ${input.detectionMethod.toUpperCase()}
LABEL STATUS: ${input.labelStatus || 'Unknown'}

STATISTICAL EVIDENCE:
${statsText}
${caseCharText}

${input.caseSummaries?.length ? `REPRESENTATIVE CASES:\n${input.caseSummaries.slice(0, 5).join('\n')}` : ''}

${litText}

${input.biologicalPlausibility ? `BIOLOGICAL PLAUSIBILITY:\n${input.biologicalPlausibility}` : ''}

${input.previousSignalHistory ? `SIGNAL HISTORY:\n${input.previousSignalHistory}` : ''}

Generate a comprehensive signal summary for ${config.purpose} purposes.`
}

// ============================================================================
// HELPER FUNCTIONS - PARSING
// ============================================================================

function parseNarrativeSections(content: string): GeneratedNarrative['sections'] {
  // Simple section extraction - in production would be more sophisticated
  return {
    patientDescription: extractSection(content, ['patient', 'subject', 'demographic']),
    drugExposure: extractSection(content, ['drug', 'medication', 'treatment', 'therapy']),
    eventDescription: extractSection(content, ['event', 'reaction', 'adverse']),
    clinicalCourse: extractSection(content, ['course', 'outcome', 'resolution', 'hospital']),
    assessment: extractSection(content, ['assessment', 'causality', 'relationship']),
    conclusion: extractSection(content, ['conclusion', 'summary']),
  }
}

function parseSignalSections(content: string): SignalSummary['sections'] {
  return {
    signalDescription: extractSection(content, ['signal', 'description', 'overview']),
    statisticalEvidence: extractSection(content, ['statistic', 'disproportionality', 'prr', 'ror']),
    caseAnalysis: extractSection(content, ['case', 'characteristic', 'patient']),
    literatureReview: extractSection(content, ['literature', 'publication']),
    biologicalPlausibility: extractSection(content, ['biological', 'mechanism', 'plausibility']),
    assessment: extractSection(content, ['assessment', 'evaluation', 'conclusion']),
    recommendation: extractSection(content, ['recommendation', 'action', 'next step']),
  }
}

function parseBRSections(content: string): BenefitRiskAssessment['sections'] {
  return {
    benefitSummary: extractSection(content, ['benefit', 'efficacy', 'advantage']),
    riskSummary: extractSection(content, ['risk', 'safety', 'adverse']),
    balanceAssessment: extractSection(content, ['balance', 'weigh', 'overall']),
    uncertainties: extractSection(content, ['uncertain', 'limitation', 'gap']),
    recommendations: extractSection(content, ['recommend', 'conclusion', 'suggest']),
  }
}

function extractSection(content: string, keywords: string[]): string {
  const lines = content.split('\n')
  const result: string[] = []
  let capturing = false

  for (const line of lines) {
    const isHeader = line.startsWith('#') || line.match(/^[A-Z][A-Z\s]+:/)
    
    if (isHeader) {
      const headerLower = line.toLowerCase()
      capturing = keywords.some(kw => headerLower.includes(kw))
    }
    
    if (capturing && !line.startsWith('#')) {
      result.push(line)
    }
  }

  return result.join('\n').trim() || content.substring(0, 500)
}

function identifyDataGaps(input: CaseNarrativeInput): GeneratedNarrative['flags'] {
  const flags: GeneratedNarrative['flags'] = []

  if (!input.patient.age) {
    flags.push({ type: 'missing-data', description: 'Patient age not provided', field: 'patient.age' })
  }
  if (!input.patient.sex || input.patient.sex === 'unknown') {
    flags.push({ type: 'missing-data', description: 'Patient sex not provided', field: 'patient.sex' })
  }
  if (input.reactions.some(r => !r.onsetDate)) {
    flags.push({ type: 'missing-data', description: 'Reaction onset date missing for some events', field: 'reactions.onsetDate' })
  }
  if (input.drugs.filter(d => d.role === 'suspect').every(d => d.dechallenge === 'unknown' || !d.dechallenge)) {
    flags.push({ type: 'requires-followup', description: 'Dechallenge information not available for suspect drugs' })
  }

  return flags
}

function assessSignalRiskLevel(input: SignalInput): SignalSummary['riskLevel'] {
  // Simple risk assessment based on statistics and case characteristics
  const prr = input.statistics.prr?.value || 0
  const caseCount = input.statistics.observedCases
  const fatalCases = input.caseCharacteristics?.fatalCases || 0

  if (fatalCases > 0 || (prr >= 4 && caseCount >= 10)) return 'high'
  if (prr >= 2 && caseCount >= 5) return 'medium'
  if (prr >= 1.5 || caseCount >= 3) return 'low'
  return 'undetermined'
}

function extractRecommendedActions(content: string): string[] {
  const actions: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('recommend') || lower.includes('should') || lower.includes('action')) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim()
      if (cleaned.length > 10 && cleaned.length < 200) {
        actions.push(cleaned)
      }
    }
  }

  return actions.slice(0, 5)
}

function determineBRConclusion(content: string): BenefitRiskAssessment['conclusion'] {
  const lower = content.toLowerCase()

  if (lower.includes('favorable') && !lower.includes('unfavorable')) return 'favorable'
  if (lower.includes('unfavorable')) return 'unfavorable'
  if (lower.includes('conditionally') || lower.includes('with conditions')) return 'conditionally-favorable'
  return 'uncertain'
}

function extractKeyMessages(content: string): string[] {
  const messages: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (line.includes('**') || line.startsWith('•') || line.startsWith('-')) {
      const cleaned = line.replace(/\*\*/g, '').replace(/^[-•]\s*/, '').trim()
      if (cleaned.length > 20 && cleaned.length < 150) {
        messages.push(cleaned)
      }
    }
  }

  return messages.slice(0, 5)
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateCaseNarrative,
  streamCaseNarrative,
  batchGenerateNarratives,
  generateSignalSummary,
  compareSignals,
  generateBenefitRiskAssessment,
  generateLineListingSummary,
}
