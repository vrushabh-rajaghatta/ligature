

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type { 
  HAQDiscipline, 
  HAQSource,
  HAQuestion,
} from '@/types/haq'
import { useHAQStore } from './useHAQStore'
import { 
  useHAQAnalytics, 
  type ResponseElement, 
  type QuestionCluster,
  type ResponsePattern 
} from './useHAQAnalytics'

// ============================================================================
// TYPES
// ============================================================================

/** Template category for organization */
export type TemplateCategory = 
  | 'data-presentation'
  | 'scientific-justification'
  | 'regulatory-reference'
  | 'risk-assessment'
  | 'process-description'
  | 'statistical-analysis'
  | 'clinical-rationale'
  | 'comparability'
  | 'general'

/** Template scope - where can it be used */
export type TemplateScope = 'global' | 'discipline' | 'ctd-section' | 'question-type'

/** Template status */
export type TemplateStatus = 'draft' | 'active' | 'archived' | 'deprecated'

/** Variable types for template placeholders */
export type VariableType = 
  | 'text'
  | 'number'
  | 'date'
  | 'selection'
  | 'multi-selection'
  | 'table-reference'
  | 'figure-reference'
  | 'document-reference'
  | 'calculated'

/** A placeholder variable in a template */
export interface TemplateVariable {
  id: string
  name: string
  displayName: string
  type: VariableType
  description?: string
  required: boolean
  defaultValue?: string
  options?: string[] // For selection/multi-selection
  validation?: VariableValidation
  contextHint?: string // Help text for users
}

export interface VariableValidation {
  minLength?: number
  maxLength?: number
  pattern?: string // Regex pattern
  min?: number // For numbers
  max?: number // For numbers
  customValidator?: string // Expression
}

/** A reusable component within templates */
export interface TemplateComponent {
  id: string
  name: string
  description: string
  category: TemplateCategory
  
  // Content
  content: string // Rich text with {{variable}} placeholders
  variables: TemplateVariable[]
  
  // Metadata
  disciplines: HAQDiscipline[]
  ctdSections: string[]
  responseElements: ResponseElement[]
  tags: string[]
  
  // Usage tracking
  usageCount: number
  lastUsedAt?: string
  successRate?: number // Based on outcomes when used
  
  // Provenance
  createdBy: string
  createdAt: string
  updatedAt: string
  basedOnPatternId?: string // Link to ResponsePattern if derived
}

/** A complete response template */
export interface ResponseTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  scope: TemplateScope
  status: TemplateStatus
  
  // Structure
  sections: TemplateSection[]
  components: string[] // Component IDs used in this template
  
  // Applicability
  disciplines: HAQDiscipline[]
  ctdSections: string[]
  questionTypes: string[]
  agencies: HAQSource[]
  keywords: string[] // Trigger keywords for auto-suggest
  
  // Response elements this template addresses
  responseElements: ResponseElement[]
  
  // Estimated metrics
  estimatedLength: 'brief' | 'moderate' | 'comprehensive'
  estimatedTimeMinutes: number
  
  // Quality metrics
  usageCount: number
  successCount: number
  successRate: number
  avgRating: number
  ratings: TemplateRating[]
  
  // Provenance
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
  
  // Derivation
  basedOnClusterId?: string
  basedOnPatternIds?: string[]
  version: number
  previousVersionId?: string
}

export interface TemplateSection {
  id: string
  name: string
  order: number
  required: boolean
  content: string
  componentIds: string[] // Components that can be inserted here
  variables: TemplateVariable[]
  guidanceNotes?: string
}

export interface TemplateRating {
  id: string
  userId: string
  userName: string
  rating: number // 1-5
  feedback?: string
  questionId?: string // Which HAQ was this used for
  outcome?: 'accepted' | 'follow-up' | 'rejected'
  createdAt: string
}

/** Instantiated template with filled values */
export interface TemplateInstance {
  id: string
  templateId: string
  templateName: string
  questionId: string
  applicationId: string
  
  // Filled content
  variableValues: Record<string, string>
  renderedContent: string
  
  // Modifications
  modifications: InstanceModification[]
  
  // Status
  status: 'draft' | 'applied' | 'submitted'
  appliedAt?: string
  
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface InstanceModification {
  id: string
  sectionId?: string
  originalContent: string
  modifiedContent: string
  reason?: string
  modifiedBy: string
  modifiedAt: string
}

/** Template suggestion based on question analysis */
export interface TemplateSuggestion {
  templateId: string
  templateName: string
  matchScore: number // 0-100
  matchReasons: string[]
  relevantSections: string[]
  missingElements?: ResponseElement[]
  estimatedCompleteness: number // % of response this template covers
}

/** Library statistics */
export interface TemplateLibraryStats {
  totalTemplates: number
  activeTemplates: number
  totalComponents: number
  byCategory: Record<TemplateCategory, number>
  byDiscipline: Record<HAQDiscipline, number>
  topPerformers: { templateId: string; successRate: number }[]
  recentlyUsed: { templateId: string; usedAt: string }[]
  underperforming: { templateId: string; successRate: number; usageCount: number }[]
  averageSuccessRate: number
  totalUsage: number
}

// ============================================================================
// TEMPLATE GENERATION FROM PATTERNS
// ============================================================================

/** Generate a template from a successful response pattern */
function generateTemplateFromPattern(
  pattern: ResponsePattern,
  cluster: QuestionCluster,
  question: HAQuestion
): Partial<ResponseTemplate> {
  // Extract variables from the response text
  const responseText = question.responseText || ''
  const variables = extractVariablesFromText(responseText)
  
  // Create sections based on response structure
  const sections = analyzeResponseStructure(responseText, pattern.includedElements)
  
  return {
    name: `${cluster.name} Response Pattern`,
    description: `Auto-generated template based on successful response pattern for ${cluster.discipline} questions`,
    category: mapElementsToCategory(pattern.includedElements),
    scope: 'discipline',
    disciplines: [cluster.discipline],
    ctdSections: cluster.ctdSections,
    responseElements: pattern.includedElements,
    estimatedLength: pattern.responseLength,
    sections,
    keywords: cluster.keywords,
    basedOnClusterId: cluster.id,
    basedOnPatternIds: [pattern.id],
  }
}

/** Extract potential variables from response text */
function extractVariablesFromText(text: string): TemplateVariable[] {
  const variables: TemplateVariable[] = []
  
  // Look for common patterns that should be variables
  const patterns: { regex: RegExp; name: string; type: VariableType }[] = [
    { regex: /(\d+(?:\.\d+)?)\s*%/g, name: 'percentage', type: 'number' },
    { regex: /(\d+(?:\.\d+)?)\s*(mg|kg|mL|L|μg)/g, name: 'measurement', type: 'number' },
    { regex: /Study\s+([A-Z0-9-]+)/g, name: 'study_number', type: 'text' },
    { regex: /Table\s+(\d+)/g, name: 'table_reference', type: 'table-reference' },
    { regex: /Figure\s+(\d+)/g, name: 'figure_reference', type: 'figure-reference' },
    { regex: /ICH\s+([A-Z]\d+(?:\([A-Z]\d+\))?)/g, name: 'ich_reference', type: 'text' },
    { regex: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g, name: 'date', type: 'date' },
    { regex: /batch(?:es)?\s+([A-Z0-9-]+(?:,\s*[A-Z0-9-]+)*)/gi, name: 'batch_numbers', type: 'text' },
    { regex: /p\s*[<>=]\s*(0\.\d+)/g, name: 'p_value', type: 'number' },
    { regex: /95%\s*CI[:\s]+\[([\d.-]+),\s*([\d.-]+)\]/g, name: 'confidence_interval', type: 'text' },
  ]
  
  patterns.forEach(({ name, type }, index) => {
    variables.push({
      id: `var-${index}`,
      name: name.replace(/\s+/g, '_'),
      displayName: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      type,
      required: false,
      description: `Auto-detected ${name} placeholder`,
    })
  })
  
  return variables
}

/** Analyze response structure and create sections */
function analyzeResponseStructure(text: string, elements: ResponseElement[]): TemplateSection[] {
  const sections: TemplateSection[] = []
  let order = 0
  
  // Opening/context section
  sections.push({
    id: `section-${order++}`,
    name: 'Response Overview',
    order: order,
    required: true,
    content: '{{response_overview}}',
    componentIds: [],
    variables: [{
      id: 'var-overview',
      name: 'response_overview',
      displayName: 'Response Overview',
      type: 'text',
      required: true,
      description: 'Brief overview addressing the question directly',
    }],
    guidanceNotes: 'Begin with a direct response to the agency\'s question before providing supporting details.',
  })
  
  // Add sections based on response elements
  if (elements.includes('data-tables')) {
    sections.push({
      id: `section-${order++}`,
      name: 'Data Presentation',
      order: order,
      required: false,
      content: '{{data_summary}}\n\n[Insert Table: {{table_reference}}]\n\n{{data_interpretation}}',
      componentIds: ['comp-data-table', 'comp-data-summary'],
      variables: [
        { id: 'var-data-sum', name: 'data_summary', displayName: 'Data Summary', type: 'text', required: true },
        { id: 'var-table-ref', name: 'table_reference', displayName: 'Table Reference', type: 'table-reference', required: true },
        { id: 'var-data-interp', name: 'data_interpretation', displayName: 'Data Interpretation', type: 'text', required: false },
      ],
    })
  }
  
  if (elements.includes('statistical-analysis')) {
    sections.push({
      id: `section-${order++}`,
      name: 'Statistical Analysis',
      order: order,
      required: false,
      content: '{{statistical_methods}}\n\n{{statistical_results}}\n\nThe analysis demonstrates {{statistical_conclusion}}.',
      componentIds: ['comp-stat-methods', 'comp-stat-results'],
      variables: [
        { id: 'var-stat-meth', name: 'statistical_methods', displayName: 'Statistical Methods', type: 'text', required: true },
        { id: 'var-stat-res', name: 'statistical_results', displayName: 'Statistical Results', type: 'text', required: true },
        { id: 'var-stat-conc', name: 'statistical_conclusion', displayName: 'Statistical Conclusion', type: 'text', required: true },
      ],
    })
  }
  
  if (elements.includes('regulatory-precedent')) {
    sections.push({
      id: `section-${order++}`,
      name: 'Regulatory Context',
      order: order,
      required: false,
      content: 'This approach is consistent with {{regulatory_reference}} which states {{regulatory_context}}.',
      componentIds: ['comp-reg-reference'],
      variables: [
        { id: 'var-reg-ref', name: 'regulatory_reference', displayName: 'Regulatory Reference', type: 'text', required: true },
        { id: 'var-reg-ctx', name: 'regulatory_context', displayName: 'Regulatory Context', type: 'text', required: true },
      ],
    })
  }
  
  if (elements.includes('clinical-justification')) {
    sections.push({
      id: `section-${order++}`,
      name: 'Clinical Justification',
      order: order,
      required: false,
      content: '{{clinical_rationale}}\n\n{{clinical_evidence}}',
      componentIds: ['comp-clinical-rationale'],
      variables: [
        { id: 'var-clin-rat', name: 'clinical_rationale', displayName: 'Clinical Rationale', type: 'text', required: true },
        { id: 'var-clin-evid', name: 'clinical_evidence', displayName: 'Clinical Evidence', type: 'text', required: false },
      ],
    })
  }
  
  if (elements.includes('risk-assessment')) {
    sections.push({
      id: `section-${order++}`,
      name: 'Risk Assessment',
      order: order,
      required: false,
      content: '{{identified_risks}}\n\n{{risk_mitigation}}\n\nThe benefit-risk assessment concludes {{benefit_risk_conclusion}}.',
      componentIds: ['comp-risk-assessment'],
      variables: [
        { id: 'var-risks', name: 'identified_risks', displayName: 'Identified Risks', type: 'text', required: true },
        { id: 'var-mit', name: 'risk_mitigation', displayName: 'Risk Mitigation', type: 'text', required: true },
        { id: 'var-br-conc', name: 'benefit_risk_conclusion', displayName: 'Benefit-Risk Conclusion', type: 'text', required: true },
      ],
    })
  }
  
  // Conclusion section
  sections.push({
    id: `section-${order++}`,
    name: 'Conclusion',
    order: order,
    required: true,
    content: '{{conclusion}}',
    componentIds: [],
    variables: [{
      id: 'var-conclusion',
      name: 'conclusion',
      displayName: 'Conclusion',
      type: 'text',
      required: true,
      description: 'Summary conclusion addressing the agency\'s question',
    }],
    guidanceNotes: 'Restate the key finding or position clearly and concisely.',
  })
  
  return sections
}

/** Map response elements to a template category */
function mapElementsToCategory(elements: ResponseElement[]): TemplateCategory {
  if (elements.includes('statistical-analysis')) return 'statistical-analysis'
  if (elements.includes('risk-assessment')) return 'risk-assessment'
  if (elements.includes('clinical-justification')) return 'clinical-rationale'
  if (elements.includes('data-tables')) return 'data-presentation'
  if (elements.includes('regulatory-precedent')) return 'regulatory-reference'
  if (elements.includes('process-description')) return 'process-description'
  if (elements.includes('comparability-data')) return 'comparability'
  return 'scientific-justification'
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleComponents: TemplateComponent[] = [
  {
    id: 'comp-data-table',
    name: 'Data Table Introduction',
    description: 'Standard introduction for presenting tabular data',
    category: 'data-presentation',
    content: 'The following table summarizes {{data_description}} obtained from {{data_source}}. As shown in Table {{table_number}}, {{key_finding}}.',
    variables: [
      { id: 'v1', name: 'data_description', displayName: 'Data Description', type: 'text', required: true },
      { id: 'v2', name: 'data_source', displayName: 'Data Source', type: 'text', required: true },
      { id: 'v3', name: 'table_number', displayName: 'Table Number', type: 'table-reference', required: true },
      { id: 'v4', name: 'key_finding', displayName: 'Key Finding', type: 'text', required: true },
    ],
    disciplines: ['CMC', 'Clinical', 'Nonclinical', 'Biometrics'],
    ctdSections: [],
    responseElements: ['data-tables'],
    tags: ['data', 'table', 'summary'],
    usageCount: 47,
    lastUsedAt: '2025-01-08',
    successRate: 92,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-08',
  },
  {
    id: 'comp-stat-methods',
    name: 'Statistical Methods Description',
    description: 'Standard description of statistical methods used',
    category: 'statistical-analysis',
    content: 'Statistical analysis was performed using {{statistical_method}}. {{sample_description}}. A {{significance_level}} significance level was used for all statistical tests. {{additional_methods}}',
    variables: [
      { id: 'v1', name: 'statistical_method', displayName: 'Statistical Method', type: 'text', required: true },
      { id: 'v2', name: 'sample_description', displayName: 'Sample Description', type: 'text', required: true },
      { id: 'v3', name: 'significance_level', displayName: 'Significance Level', type: 'selection', required: true, options: ['α = 0.05', 'α = 0.01', 'α = 0.10'], defaultValue: 'α = 0.05' },
      { id: 'v4', name: 'additional_methods', displayName: 'Additional Methods', type: 'text', required: false },
    ],
    disciplines: ['Biometrics', 'Clinical'],
    ctdSections: ['5.3.5.1', '5.3.5.3'],
    responseElements: ['statistical-analysis'],
    tags: ['statistics', 'methods', 'analysis'],
    usageCount: 35,
    lastUsedAt: '2025-01-10',
    successRate: 88,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-10',
  },
  {
    id: 'comp-reg-reference',
    name: 'ICH Guideline Reference',
    description: 'Standard format for citing ICH guidelines',
    category: 'regulatory-reference',
    content: 'This approach is consistent with the principles outlined in {{ich_guideline}} ({{guideline_title}}), which recommends {{guideline_recommendation}}. The Sponsor has followed this guidance by {{compliance_description}}.',
    variables: [
      { id: 'v1', name: 'ich_guideline', displayName: 'ICH Guideline', type: 'selection', required: true, 
        options: ['ICH Q1A(R2)', 'ICH Q2(R1)', 'ICH Q3A(R2)', 'ICH Q3B(R2)', 'ICH Q3C(R6)', 'ICH Q6A', 'ICH Q6B', 'ICH Q8(R2)', 'ICH Q9', 'ICH Q10', 'ICH Q11', 'ICH Q12', 'ICH E6(R2)', 'ICH E9(R1)', 'ICH S1A', 'ICH S1B', 'ICH S2(R1)', 'ICH M3(R2)'] },
      { id: 'v2', name: 'guideline_title', displayName: 'Guideline Title', type: 'text', required: true },
      { id: 'v3', name: 'guideline_recommendation', displayName: 'Guideline Recommendation', type: 'text', required: true },
      { id: 'v4', name: 'compliance_description', displayName: 'Compliance Description', type: 'text', required: true },
    ],
    disciplines: ['CMC', 'Clinical', 'Nonclinical'],
    ctdSections: [],
    responseElements: ['regulatory-precedent'],
    tags: ['ICH', 'regulatory', 'guidance', 'compliance'],
    usageCount: 62,
    lastUsedAt: '2025-01-12',
    successRate: 95,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-12',
  },
  {
    id: 'comp-clinical-rationale',
    name: 'Clinical Relevance Justification',
    description: 'Standard format for clinical relevance arguments',
    category: 'clinical-rationale',
    content: 'The clinical relevance of {{parameter}} is supported by {{clinical_evidence_type}}. In the pivotal study {{study_reference}}, {{clinical_observation}}. This finding is clinically meaningful because {{clinical_significance}}.',
    variables: [
      { id: 'v1', name: 'parameter', displayName: 'Parameter', type: 'text', required: true },
      { id: 'v2', name: 'clinical_evidence_type', displayName: 'Evidence Type', type: 'selection', required: true,
        options: ['Phase 3 efficacy data', 'Phase 2 dose-response data', 'pooled safety analysis', 'pharmacokinetic data', 'biomarker correlation', 'patient-reported outcomes'] },
      { id: 'v3', name: 'study_reference', displayName: 'Study Reference', type: 'text', required: true },
      { id: 'v4', name: 'clinical_observation', displayName: 'Clinical Observation', type: 'text', required: true },
      { id: 'v5', name: 'clinical_significance', displayName: 'Clinical Significance', type: 'text', required: true },
    ],
    disciplines: ['Clinical'],
    ctdSections: ['2.5', '2.7.3', '5.3.5.1'],
    responseElements: ['clinical-justification'],
    tags: ['clinical', 'relevance', 'justification', 'efficacy'],
    usageCount: 28,
    lastUsedAt: '2025-01-09',
    successRate: 91,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-09',
  },
  {
    id: 'comp-risk-assessment',
    name: 'Benefit-Risk Assessment',
    description: 'Standard format for benefit-risk discussion',
    category: 'risk-assessment',
    content: 'The identified risk of {{risk_description}} has been evaluated in the context of the overall benefit-risk profile. The risk is characterized by {{risk_characterization}}. Mitigation measures include {{mitigation_measures}}. Given the therapeutic benefit of {{therapeutic_benefit}}, the benefit-risk balance remains {{benefit_risk_conclusion}}.',
    variables: [
      { id: 'v1', name: 'risk_description', displayName: 'Risk Description', type: 'text', required: true },
      { id: 'v2', name: 'risk_characterization', displayName: 'Risk Characterization', type: 'text', required: true },
      { id: 'v3', name: 'mitigation_measures', displayName: 'Mitigation Measures', type: 'text', required: true },
      { id: 'v4', name: 'therapeutic_benefit', displayName: 'Therapeutic Benefit', type: 'text', required: true },
      { id: 'v5', name: 'benefit_risk_conclusion', displayName: 'Conclusion', type: 'selection', required: true,
        options: ['favorable', 'positive', 'acceptable given the unmet medical need', 'favorable in the target population'] },
    ],
    disciplines: ['Clinical', 'Nonclinical', 'Safety'],
    ctdSections: ['2.5.6', '2.7.4'],
    responseElements: ['risk-assessment'],
    tags: ['risk', 'benefit', 'safety', 'assessment'],
    usageCount: 41,
    lastUsedAt: '2025-01-11',
    successRate: 87,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-11',
  },
  {
    id: 'comp-stability-data',
    name: 'Stability Data Summary',
    description: 'Standard format for presenting stability data',
    category: 'data-presentation',
    content: 'Stability studies were conducted under {{storage_conditions}} for {{study_duration}}. A total of {{batch_count}} batches were included in the stability program. The results, summarized in Table {{table_reference}}, demonstrate that {{stability_conclusion}}. Based on these data, a shelf life of {{proposed_shelf_life}} is supported.',
    variables: [
      { id: 'v1', name: 'storage_conditions', displayName: 'Storage Conditions', type: 'selection', required: true,
        options: ['25°C/60% RH (long-term)', '30°C/65% RH (intermediate)', '40°C/75% RH (accelerated)', '5°C ± 3°C (refrigerated)', '-20°C ± 5°C (frozen)'] },
      { id: 'v2', name: 'study_duration', displayName: 'Study Duration', type: 'text', required: true },
      { id: 'v3', name: 'batch_count', displayName: 'Number of Batches', type: 'number', required: true },
      { id: 'v4', name: 'table_reference', displayName: 'Table Reference', type: 'table-reference', required: true },
      { id: 'v5', name: 'stability_conclusion', displayName: 'Stability Conclusion', type: 'text', required: true },
      { id: 'v6', name: 'proposed_shelf_life', displayName: 'Proposed Shelf Life', type: 'text', required: true },
    ],
    disciplines: ['CMC'],
    ctdSections: ['3.2.S.7', '3.2.P.8'],
    responseElements: ['stability-data', 'data-tables'],
    tags: ['stability', 'shelf-life', 'storage', 'ICH Q1A'],
    usageCount: 56,
    lastUsedAt: '2025-01-12',
    successRate: 94,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-12',
  },
  {
    id: 'comp-process-validation',
    name: 'Process Validation Summary',
    description: 'Standard format for process validation responses',
    category: 'process-description',
    content: 'Process validation was conducted in accordance with {{regulatory_framework}}. A total of {{batch_count}} consecutive batches were manufactured at commercial scale at {{manufacturing_site}}. The validation demonstrated that {{validation_conclusion}}. All critical process parameters remained within {{specification_status}}.',
    variables: [
      { id: 'v1', name: 'regulatory_framework', displayName: 'Regulatory Framework', type: 'selection', required: true,
        options: ['ICH Q8/Q11 principles', 'FDA Process Validation Guidance (2011)', 'EMA Process Validation Guideline', 'ICH Q7 (API)'] },
      { id: 'v2', name: 'batch_count', displayName: 'Number of Batches', type: 'number', required: true },
      { id: 'v3', name: 'manufacturing_site', displayName: 'Manufacturing Site', type: 'text', required: true },
      { id: 'v4', name: 'validation_conclusion', displayName: 'Validation Conclusion', type: 'text', required: true },
      { id: 'v5', name: 'specification_status', displayName: 'Specification Status', type: 'selection', required: true,
        options: ['established limits', 'validated ranges', 'registered specifications'] },
    ],
    disciplines: ['CMC'],
    ctdSections: ['3.2.S.2.5', '3.2.P.3.5'],
    responseElements: ['validation-data', 'process-description'],
    tags: ['validation', 'process', 'manufacturing', 'GMP'],
    usageCount: 33,
    lastUsedAt: '2025-01-07',
    successRate: 90,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-07',
  },
  {
    id: 'comp-comparability',
    name: 'Comparability Assessment',
    description: 'Standard format for comparability studies',
    category: 'comparability',
    content: 'A comparability assessment was conducted to evaluate the impact of {{change_description}}. The study compared {{comparison_basis}} using {{analytical_methods}}. The results, presented in {{table_figure_reference}}, demonstrate {{comparability_conclusion}}. No differences that would impact {{impact_assessment}} were observed.',
    variables: [
      { id: 'v1', name: 'change_description', displayName: 'Change Description', type: 'text', required: true },
      { id: 'v2', name: 'comparison_basis', displayName: 'Comparison Basis', type: 'text', required: true },
      { id: 'v3', name: 'analytical_methods', displayName: 'Analytical Methods', type: 'text', required: true },
      { id: 'v4', name: 'table_figure_reference', displayName: 'Reference', type: 'text', required: true },
      { id: 'v5', name: 'comparability_conclusion', displayName: 'Conclusion', type: 'selection', required: true,
        options: ['comparability', 'high similarity', 'no meaningful differences', 'analytical similarity'] },
      { id: 'v6', name: 'impact_assessment', displayName: 'Impact Assessment Area', type: 'selection', required: true,
        options: ['safety', 'efficacy', 'quality', 'safety, efficacy, or quality'] },
    ],
    disciplines: ['CMC'],
    ctdSections: ['3.2.S.2.6', '3.2.P.2.6'],
    responseElements: ['comparability-data'],
    tags: ['comparability', 'change', 'analytical', 'bridging'],
    usageCount: 24,
    lastUsedAt: '2025-01-05',
    successRate: 88,
    createdBy: 'system',
    createdAt: '2024-06-01',
    updatedAt: '2025-01-05',
  },
]

const sampleTemplates: ResponseTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'CMC Process Parameter Justification',
    description: 'Template for responding to questions about critical process parameters and control strategy',
    category: 'process-description',
    scope: 'discipline',
    status: 'active',
    sections: [
      {
        id: 'sec-001-1',
        name: 'Overview',
        order: 1,
        required: true,
        content: 'The {{parameter_type}} for {{process_step}} have been established based on {{justification_basis}}.',
        componentIds: [],
        variables: [
          { id: 'v1', name: 'parameter_type', displayName: 'Parameter Type', type: 'selection', required: true,
            options: ['critical process parameters (CPPs)', 'key process parameters (KPPs)', 'process parameter ranges'] },
          { id: 'v2', name: 'process_step', displayName: 'Process Step', type: 'text', required: true },
          { id: 'v3', name: 'justification_basis', displayName: 'Justification Basis', type: 'selection', required: true,
            options: ['development studies', 'process characterization', 'risk assessment', 'manufacturing experience'] },
        ],
        guidanceNotes: 'Start with a direct statement addressing the CPP/KPP question.',
      },
      {
        id: 'sec-001-2',
        name: 'Development Studies',
        order: 2,
        required: false,
        content: '{{development_studies_summary}}',
        componentIds: ['comp-data-table'],
        variables: [
          { id: 'v4', name: 'development_studies_summary', displayName: 'Development Studies Summary', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-001-3',
        name: 'Regulatory Context',
        order: 3,
        required: false,
        content: '',
        componentIds: ['comp-reg-reference'],
        variables: [],
      },
      {
        id: 'sec-001-4',
        name: 'Control Strategy',
        order: 4,
        required: true,
        content: 'The control strategy ensures consistent product quality through {{control_elements}}.',
        componentIds: [],
        variables: [
          { id: 'v5', name: 'control_elements', displayName: 'Control Elements', type: 'text', required: true },
        ],
      },
    ],
    components: ['comp-data-table', 'comp-reg-reference'],
    disciplines: ['CMC'],
    ctdSections: ['3.2.S.2.2', '3.2.S.2.4', '3.2.P.3.3', '3.2.P.3.4'],
    questionTypes: ['Day-74', 'IR'],
    agencies: ['FDA', 'EMA'],
    keywords: ['CPP', 'critical process parameter', 'control strategy', 'design space', 'process parameter'],
    responseElements: ['process-description', 'data-tables', 'regulatory-precedent'],
    estimatedLength: 'comprehensive',
    estimatedTimeMinutes: 90,
    usageCount: 23,
    successCount: 21,
    successRate: 91,
    avgRating: 4.6,
    ratings: [],
    createdBy: 'system',
    createdByName: 'System',
    createdAt: '2024-06-15',
    updatedAt: '2025-01-10',
    version: 2,
  },
  {
    id: 'tmpl-002',
    name: 'Dissolution Specification Justification',
    description: 'Template for responding to dissolution specification questions',
    category: 'scientific-justification',
    scope: 'ctd-section',
    status: 'active',
    sections: [
      {
        id: 'sec-002-1',
        name: 'Specification Overview',
        order: 1,
        required: true,
        content: 'The proposed dissolution specification of {{specification}} was established based on {{specification_basis}}.',
        componentIds: [],
        variables: [
          { id: 'v1', name: 'specification', displayName: 'Proposed Specification', type: 'text', required: true },
          { id: 'v2', name: 'specification_basis', displayName: 'Specification Basis', type: 'selection', required: true,
            options: ['clinical relevance', 'batch data analysis', 'IVIVC', 'BCS classification', 'manufacturing capability'] },
        ],
      },
      {
        id: 'sec-002-2',
        name: 'Batch Data Analysis',
        order: 2,
        required: true,
        content: '',
        componentIds: ['comp-data-table', 'comp-stat-methods'],
        variables: [],
        guidanceNotes: 'Present batch release and stability dissolution data with statistical summary.',
      },
      {
        id: 'sec-002-3',
        name: 'Clinical Relevance',
        order: 3,
        required: false,
        content: '',
        componentIds: ['comp-clinical-rationale'],
        variables: [],
      },
      {
        id: 'sec-002-4',
        name: 'Conclusion',
        order: 4,
        required: true,
        content: 'Based on {{conclusion_basis}}, the proposed specification of {{final_specification}} is justified.',
        componentIds: [],
        variables: [
          { id: 'v3', name: 'conclusion_basis', displayName: 'Conclusion Basis', type: 'text', required: true },
          { id: 'v4', name: 'final_specification', displayName: 'Final Specification', type: 'text', required: true },
        ],
      },
    ],
    components: ['comp-data-table', 'comp-stat-methods', 'comp-clinical-rationale'],
    disciplines: ['CMC'],
    ctdSections: ['3.2.P.5.1'],
    questionTypes: ['Day-74', 'IR'],
    agencies: ['FDA', 'EMA', 'PMDA'],
    keywords: ['dissolution', 'specification', 'Q value', 'dissolution method'],
    responseElements: ['data-tables', 'statistical-analysis', 'clinical-justification'],
    estimatedLength: 'moderate',
    estimatedTimeMinutes: 60,
    usageCount: 18,
    successCount: 17,
    successRate: 94,
    avgRating: 4.8,
    ratings: [],
    createdBy: 'system',
    createdByName: 'System',
    createdAt: '2024-07-01',
    updatedAt: '2025-01-08',
    version: 1,
  },
  {
    id: 'tmpl-003',
    name: 'Missing Data Handling Justification',
    description: 'Template for responding to questions about missing data in clinical trials',
    category: 'statistical-analysis',
    scope: 'discipline',
    status: 'active',
    sections: [
      {
        id: 'sec-003-1',
        name: 'Missing Data Overview',
        order: 1,
        required: true,
        content: 'Missing data in {{study_identifier}} were handled using {{primary_method}}. The extent of missing data was {{missing_data_extent}} and was {{missing_pattern}} across treatment groups.',
        componentIds: [],
        variables: [
          { id: 'v1', name: 'study_identifier', displayName: 'Study Identifier', type: 'text', required: true },
          { id: 'v2', name: 'primary_method', displayName: 'Primary Method', type: 'selection', required: true,
            options: ['multiple imputation', 'MMRM', 'LOCF', 'reference-based imputation', 'tipping point analysis'] },
          { id: 'v3', name: 'missing_data_extent', displayName: 'Extent', type: 'text', required: true },
          { id: 'v4', name: 'missing_pattern', displayName: 'Pattern', type: 'selection', required: true,
            options: ['balanced', 'similar', 'comparable'] },
        ],
      },
      {
        id: 'sec-003-2',
        name: 'Methodology Details',
        order: 2,
        required: true,
        content: '',
        componentIds: ['comp-stat-methods'],
        variables: [],
        guidanceNotes: 'Describe the imputation model and underlying assumptions in detail.',
      },
      {
        id: 'sec-003-3',
        name: 'Sensitivity Analyses',
        order: 3,
        required: true,
        content: 'Sensitivity analyses were conducted to assess robustness to the missing data assumptions. These included {{sensitivity_methods}}. The results of the sensitivity analyses {{sensitivity_conclusion}}.',
        componentIds: [],
        variables: [
          { id: 'v5', name: 'sensitivity_methods', displayName: 'Sensitivity Methods', type: 'text', required: true },
          { id: 'v6', name: 'sensitivity_conclusion', displayName: 'Sensitivity Conclusion', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-003-4',
        name: 'Regulatory Alignment',
        order: 4,
        required: false,
        content: '',
        componentIds: ['comp-reg-reference'],
        variables: [],
      },
    ],
    components: ['comp-stat-methods', 'comp-reg-reference'],
    disciplines: ['Biometrics', 'Clinical'],
    ctdSections: ['5.3.5.1', '5.3.5.3'],
    questionTypes: ['Day-74', 'RSI'],
    agencies: ['FDA', 'EMA'],
    keywords: ['missing data', 'imputation', 'MAR', 'MNAR', 'sensitivity analysis', 'estimand'],
    responseElements: ['statistical-analysis', 'regulatory-precedent'],
    estimatedLength: 'comprehensive',
    estimatedTimeMinutes: 120,
    usageCount: 12,
    successCount: 11,
    successRate: 92,
    avgRating: 4.5,
    ratings: [],
    createdBy: 'system',
    createdByName: 'System',
    createdAt: '2024-08-15',
    updatedAt: '2025-01-05',
    version: 1,
  },
  {
    id: 'tmpl-004',
    name: 'Carcinogenicity Human Relevance Assessment',
    description: 'Template for responding to questions about carcinogenicity findings and human relevance',
    category: 'risk-assessment',
    scope: 'discipline',
    status: 'active',
    sections: [
      {
        id: 'sec-004-1',
        name: 'Finding Overview',
        order: 1,
        required: true,
        content: 'The {{finding_description}} observed in {{species}} at {{dose_level}} has been thoroughly evaluated for human relevance.',
        componentIds: [],
        variables: [
          { id: 'v1', name: 'finding_description', displayName: 'Finding Description', type: 'text', required: true },
          { id: 'v2', name: 'species', displayName: 'Species', type: 'selection', required: true,
            options: ['rats', 'mice', 'hamsters', 'male rats', 'female rats'] },
          { id: 'v3', name: 'dose_level', displayName: 'Dose Level', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-004-2',
        name: 'Mode of Action Analysis',
        order: 2,
        required: true,
        content: 'The proposed mode of action (MoA) for {{tumor_type}} involves {{moa_description}}. Key supporting evidence includes {{moa_evidence}}.',
        componentIds: [],
        variables: [
          { id: 'v4', name: 'tumor_type', displayName: 'Tumor Type', type: 'text', required: true },
          { id: 'v5', name: 'moa_description', displayName: 'MoA Description', type: 'text', required: true },
          { id: 'v6', name: 'moa_evidence', displayName: 'MoA Evidence', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-004-3',
        name: 'Human Relevance Framework',
        order: 3,
        required: true,
        content: 'Applying the IPCS Human Relevance Framework, {{framework_analysis}}.',
        componentIds: ['comp-risk-assessment'],
        variables: [
          { id: 'v7', name: 'framework_analysis', displayName: 'Framework Analysis', type: 'text', required: true },
        ],
        guidanceNotes: 'Address each key event in the MoA and its plausibility in humans.',
      },
      {
        id: 'sec-004-4',
        name: 'Exposure Margins',
        order: 4,
        required: true,
        content: 'The safety margin at the NOAEL of {{noael}} compared to the clinical exposure is {{safety_margin}}.',
        componentIds: ['comp-data-table'],
        variables: [
          { id: 'v8', name: 'noael', displayName: 'NOAEL', type: 'text', required: true },
          { id: 'v9', name: 'safety_margin', displayName: 'Safety Margin', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-004-5',
        name: 'Labeling Recommendation',
        order: 5,
        required: true,
        content: 'Based on the above assessment, {{labeling_recommendation}}.',
        componentIds: [],
        variables: [
          { id: 'v10', name: 'labeling_recommendation', displayName: 'Labeling Recommendation', type: 'text', required: true },
        ],
      },
    ],
    components: ['comp-risk-assessment', 'comp-data-table'],
    disciplines: ['Nonclinical'],
    ctdSections: ['2.6.6', '2.4'],
    questionTypes: ['Day-74', 'CRL'],
    agencies: ['FDA', 'EMA'],
    keywords: ['carcinogenicity', 'human relevance', 'tumor', 'mode of action', 'MoA', 'IPCS'],
    responseElements: ['risk-assessment', 'mechanism-explanation', 'data-tables'],
    estimatedLength: 'comprehensive',
    estimatedTimeMinutes: 180,
    usageCount: 8,
    successCount: 7,
    successRate: 88,
    avgRating: 4.4,
    ratings: [],
    createdBy: 'system',
    createdByName: 'System',
    createdAt: '2024-09-01',
    updatedAt: '2025-01-02',
    version: 1,
  },
  {
    id: 'tmpl-005',
    name: 'Stability Specification Justification',
    description: 'Template for responding to stability-related specification questions',
    category: 'data-presentation',
    scope: 'ctd-section',
    status: 'active',
    sections: [
      {
        id: 'sec-005-1',
        name: 'Stability Overview',
        order: 1,
        required: true,
        content: '',
        componentIds: ['comp-stability-data'],
        variables: [],
      },
      {
        id: 'sec-005-2',
        name: 'Specification Justification',
        order: 2,
        required: true,
        content: 'The {{attribute_name}} specification of {{specification_limit}} is supported by {{justification_basis}}. Trend analysis of the stability data {{trend_conclusion}}.',
        componentIds: [],
        variables: [
          { id: 'v1', name: 'attribute_name', displayName: 'Attribute Name', type: 'text', required: true },
          { id: 'v2', name: 'specification_limit', displayName: 'Specification Limit', type: 'text', required: true },
          { id: 'v3', name: 'justification_basis', displayName: 'Justification Basis', type: 'text', required: true },
          { id: 'v4', name: 'trend_conclusion', displayName: 'Trend Conclusion', type: 'text', required: true },
        ],
      },
      {
        id: 'sec-005-3',
        name: 'Regulatory Alignment',
        order: 3,
        required: false,
        content: '',
        componentIds: ['comp-reg-reference'],
        variables: [],
      },
    ],
    components: ['comp-stability-data', 'comp-reg-reference'],
    disciplines: ['CMC'],
    ctdSections: ['3.2.S.7', '3.2.P.8', '3.2.P.5.1'],
    questionTypes: ['Day-74', 'IR'],
    agencies: ['FDA', 'EMA', 'PMDA', 'Health Canada'],
    keywords: ['stability', 'shelf life', 'degradation', 'specification', 'expiry'],
    responseElements: ['stability-data', 'data-tables', 'regulatory-precedent'],
    estimatedLength: 'moderate',
    estimatedTimeMinutes: 75,
    usageCount: 31,
    successCount: 29,
    successRate: 94,
    avgRating: 4.7,
    ratings: [],
    createdBy: 'system',
    createdByName: 'System',
    createdAt: '2024-07-20',
    updatedAt: '2025-01-11',
    version: 2,
  },
]

// ============================================================================
// STORE STATE
// ============================================================================

interface ResponseTemplateState {
  // Data
  templates: ResponseTemplate[]
  components: TemplateComponent[]
  instances: TemplateInstance[]
  
  // UI state
  selectedTemplateId: string | null
  selectedComponentId: string | null
  searchQuery: string
  filterCategory: TemplateCategory | 'all'
  filterDiscipline: HAQDiscipline | 'all'
  filterStatus: TemplateStatus | 'all'
  
  // Template CRUD
  createTemplate: (template: Omit<ResponseTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'successCount' | 'successRate' | 'avgRating' | 'ratings' | 'version'>) => ResponseTemplate
  updateTemplate: (id: string, updates: Partial<ResponseTemplate>) => void
  archiveTemplate: (id: string) => void
  duplicateTemplate: (id: string) => ResponseTemplate
  deleteTemplate: (id: string) => void
  
  // Component CRUD
  createComponent: (component: Omit<TemplateComponent, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => TemplateComponent
  updateComponent: (id: string, updates: Partial<TemplateComponent>) => void
  deleteComponent: (id: string) => void
  
  // Instance management
  instantiateTemplate: (templateId: string, questionId: string, applicationId: string, userId: string) => TemplateInstance
  updateInstance: (id: string, updates: Partial<TemplateInstance>) => void
  applyInstanceToQuestion: (instanceId: string) => void
  deleteInstance: (id: string) => void
  
  // Template suggestions
  getSuggestionsForQuestion: (questionId: string) => TemplateSuggestion[]
  
  // Rating
  rateTemplate: (templateId: string, rating: Omit<TemplateRating, 'id' | 'createdAt'>) => void
  
  // Generation from patterns
  generateTemplateFromCluster: (clusterId: string) => ResponseTemplate | null
  
  // Statistics
  getLibraryStats: () => TemplateLibraryStats
  getComponentsByCategory: (category: TemplateCategory) => TemplateComponent[]
  getTemplatesForDiscipline: (discipline: HAQDiscipline) => ResponseTemplate[]
  getTemplatesForCTDSection: (section: string) => ResponseTemplate[]
  
  // Rendering
  renderTemplate: (templateId: string, variableValues: Record<string, string>) => string
  renderComponent: (componentId: string, variableValues: Record<string, string>) => string
  
  // Selection
  selectTemplate: (id: string | null) => void
  selectComponent: (id: string | null) => void
  
  // Filters
  setSearchQuery: (query: string) => void
  setFilterCategory: (category: TemplateCategory | 'all') => void
  setFilterDiscipline: (discipline: HAQDiscipline | 'all') => void
  setFilterStatus: (status: TemplateStatus | 'all') => void
  
  // Filtered results
  getFilteredTemplates: () => ResponseTemplate[]
  getFilteredComponents: () => TemplateComponent[]
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useResponseTemplates = create<ResponseTemplateState>()(
  devtools(
    (set, get) => ({
      // Initial state
      templates: sampleTemplates,
      components: sampleComponents,
      instances: [],
      selectedTemplateId: null,
      selectedComponentId: null,
      searchQuery: '',
      filterCategory: 'all',
      filterDiscipline: 'all',
      filterStatus: 'all',
      
      // ================================================================
      // TEMPLATE CRUD
      // ================================================================
      
      createTemplate: (template) => {
        const newTemplate: ResponseTemplate = {
          ...template,
          id: `tmpl-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
          successCount: 0,
          successRate: 0,
          avgRating: 0,
          ratings: [],
          version: 1,
        }
        
        set(
          state => ({ templates: [...state.templates, newTemplate] }),
          false,
          'createTemplate'
        )
        
        return newTemplate
      },
      
      updateTemplate: (id, updates) => {
        set(
          state => ({
            templates: state.templates.map(t => 
              t.id === id 
                ? { ...t, ...updates, updatedAt: new Date().toISOString() }
                : t
            )
          }),
          false,
          'updateTemplate'
        )
      },
      
      archiveTemplate: (id) => {
        get().updateTemplate(id, { status: 'archived' })
      },
      
      duplicateTemplate: (id) => {
        const template = get().templates.find(t => t.id === id)
        if (!template) throw new Error('Template not found')
        
        const duplicate = get().createTemplate({
          ...template,
          name: `${template.name} (Copy)`,
          status: 'draft',
          createdBy: template.createdBy,
          createdByName: template.createdByName,
        })
        
        return duplicate
      },
      
      deleteTemplate: (id) => {
        set(
          state => ({ templates: state.templates.filter(t => t.id !== id) }),
          false,
          'deleteTemplate'
        )
      },
      
      // ================================================================
      // COMPONENT CRUD
      // ================================================================
      
      createComponent: (component) => {
        const newComponent: TemplateComponent = {
          ...component,
          id: `comp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
        }
        
        set(
          state => ({ components: [...state.components, newComponent] }),
          false,
          'createComponent'
        )
        
        return newComponent
      },
      
      updateComponent: (id, updates) => {
        set(
          state => ({
            components: state.components.map(c =>
              c.id === id
                ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                : c
            )
          }),
          false,
          'updateComponent'
        )
      },
      
      deleteComponent: (id) => {
        set(
          state => ({ components: state.components.filter(c => c.id !== id) }),
          false,
          'deleteComponent'
        )
      },
      
      // ================================================================
      // INSTANCE MANAGEMENT
      // ================================================================
      
      instantiateTemplate: (templateId, questionId, applicationId, userId) => {
        const template = get().templates.find(t => t.id === templateId)
        if (!template) throw new Error('Template not found')
        
        const instance: TemplateInstance = {
          id: `inst-${Date.now()}`,
          templateId,
          templateName: template.name,
          questionId,
          applicationId,
          variableValues: {},
          renderedContent: '',
          modifications: [],
          status: 'draft',
          createdBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        set(
          state => ({ instances: [...state.instances, instance] }),
          false,
          'instantiateTemplate'
        )
        
        // Update template usage count
        get().updateTemplate(templateId, { usageCount: template.usageCount + 1 })
        
        return instance
      },
      
      updateInstance: (id, updates) => {
        set(
          state => ({
            instances: state.instances.map(i =>
              i.id === id
                ? { ...i, ...updates, updatedAt: new Date().toISOString() }
                : i
            )
          }),
          false,
          'updateInstance'
        )
      },
      
      applyInstanceToQuestion: (instanceId) => {
        const instance = get().instances.find(i => i.id === instanceId)
        if (!instance) return
        
        // Update the HAQ's response text by modifying the haqs array directly
        const haqStore = useHAQStore.getState()
        const haqs = haqStore.haqs
        const haqIndex = haqs.findIndex(h => h.id === instance.questionId)
        
        if (haqIndex !== -1) {
          // Update the HAQ with the rendered content
          useHAQStore.setState({
            haqs: haqs.map((h, i) => 
              i === haqIndex 
                ? { ...h, responseText: instance.renderedContent, updatedAt: new Date().toISOString() }
                : h
            )
          })
        }
        
        get().updateInstance(instanceId, {
          status: 'applied',
          appliedAt: new Date().toISOString(),
        })
      },
      
      deleteInstance: (id) => {
        set(
          state => ({ instances: state.instances.filter(i => i.id !== id) }),
          false,
          'deleteInstance'
        )
      },
      
      // ================================================================
      // TEMPLATE SUGGESTIONS
      // ================================================================
      
      getSuggestionsForQuestion: (questionId) => {
        const haqStore = useHAQStore.getState()
        const question = haqStore.haqs.find(h => h.id === questionId)
        if (!question) return []
        
        const templates = get().templates.filter(t => t.status === 'active')
        const suggestions: TemplateSuggestion[] = []
        
        templates.forEach(template => {
          let matchScore = 0
          const matchReasons: string[] = []
          const relevantSections: string[] = []
          
          // Discipline match (+30)
          if (template.disciplines.includes(question.discipline)) {
            matchScore += 30
            matchReasons.push(`Matches ${question.discipline} discipline`)
          }
          
          // CTD section match (+25)
          if (question.ctdSection && template.ctdSections.includes(question.ctdSection)) {
            matchScore += 25
            matchReasons.push(`Matches CTD section ${question.ctdSection}`)
          }
          
          // Question type match (+15)
          if (template.questionTypes.includes(question.type)) {
            matchScore += 15
            matchReasons.push(`Designed for ${question.type} questions`)
          }
          
          // Agency match (+10)
          if (template.agencies.includes(question.source)) {
            matchScore += 10
            matchReasons.push(`Optimized for ${question.source}`)
          }
          
          // Keyword match (+20 max)
          const questionText = question.questionText.toLowerCase()
          const matchedKeywords = template.keywords.filter(kw => 
            questionText.includes(kw.toLowerCase())
          )
          if (matchedKeywords.length > 0) {
            const keywordScore = Math.min(20, matchedKeywords.length * 5)
            matchScore += keywordScore
            matchReasons.push(`Keywords: ${matchedKeywords.slice(0, 3).join(', ')}`)
          }
          
          // Find relevant sections
          template.sections.forEach(section => {
            if (section.required) {
              relevantSections.push(section.name)
            } else {
              // Check if section's components match question needs
              section.componentIds.forEach(compId => {
                const comp = get().components.find(c => c.id === compId)
                if (comp && comp.disciplines.includes(question.discipline)) {
                  if (!relevantSections.includes(section.name)) {
                    relevantSections.push(section.name)
                  }
                }
              })
            }
          })
          
          // Calculate completeness
          const estimatedCompleteness = Math.min(100, Math.round(matchScore * 1.2))
          
          if (matchScore >= 30) {
            suggestions.push({
              templateId: template.id,
              templateName: template.name,
              matchScore: Math.min(100, matchScore),
              matchReasons,
              relevantSections,
              estimatedCompleteness,
            })
          }
        })
        
        return suggestions.sort((a, b) => b.matchScore - a.matchScore)
      },
      
      // ================================================================
      // RATING
      // ================================================================
      
      rateTemplate: (templateId, rating) => {
        const template = get().templates.find(t => t.id === templateId)
        if (!template) return
        
        const newRating: TemplateRating = {
          ...rating,
          id: `rating-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }
        
        const allRatings = [...template.ratings, newRating]
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        
        // Update success count if outcome provided
        let successCount = template.successCount
        if (rating.outcome === 'accepted') {
          successCount++
        }
        
        const successRate = template.usageCount > 0 
          ? Math.round((successCount / template.usageCount) * 100)
          : 0
        
        get().updateTemplate(templateId, {
          ratings: allRatings,
          avgRating: Math.round(avgRating * 10) / 10,
          successCount,
          successRate,
        })
      },
      
      // ================================================================
      // GENERATION FROM PATTERNS
      // ================================================================
      
      generateTemplateFromCluster: (clusterId) => {
        const analyticsStore = useHAQAnalytics.getState()
        const cluster = analyticsStore.getClusterById(clusterId)
        if (!cluster) return null
        
        const haqStore = useHAQStore.getState()
        const haqs = haqStore.haqs
        
        // Find a successful response pattern
        const patterns = analyticsStore.responsePatterns
        const successPattern = patterns.find(p => 
          p.clusterId === clusterId && p.outcome === 'accepted'
        )
        
        if (!successPattern) return null
        
        const question = haqs.find(h => h.id === successPattern.questionId)
        if (!question) return null
        
        const templateData = generateTemplateFromPattern(successPattern, cluster, question)
        
        return get().createTemplate({
          name: templateData.name || `${cluster.name} Template`,
          description: templateData.description || `Auto-generated from cluster ${cluster.name}`,
          category: templateData.category || 'general',
          scope: 'discipline',
          status: 'draft',
          sections: templateData.sections || [],
          components: [],
          disciplines: templateData.disciplines || [cluster.discipline],
          ctdSections: templateData.ctdSections || cluster.ctdSections,
          questionTypes: [],
          agencies: cluster.agencies,
          keywords: templateData.keywords || cluster.keywords,
          responseElements: templateData.responseElements || [],
          estimatedLength: templateData.estimatedLength || 'moderate',
          estimatedTimeMinutes: 60,
          createdBy: 'system',
          createdByName: 'AI Generator',
          basedOnClusterId: clusterId,
          basedOnPatternIds: [successPattern.id],
        })
      },
      
      // ================================================================
      // STATISTICS
      // ================================================================
      
      getLibraryStats: () => {
        const templates = get().templates
        const components = get().components
        
        const activeTemplates = templates.filter(t => t.status === 'active')
        
        const byCategory: Record<TemplateCategory, number> = {} as Record<TemplateCategory, number>
        const byDiscipline: Record<HAQDiscipline, number> = {} as Record<HAQDiscipline, number>
        
        templates.forEach(t => {
          byCategory[t.category] = (byCategory[t.category] || 0) + 1
          t.disciplines.forEach(d => {
            byDiscipline[d] = (byDiscipline[d] || 0) + 1
          })
        })
        
        const topPerformers = activeTemplates
          .filter(t => t.usageCount >= 5)
          .sort((a, b) => b.successRate - a.successRate)
          .slice(0, 5)
          .map(t => ({ templateId: t.id, successRate: t.successRate }))
        
        const underperforming = activeTemplates
          .filter(t => t.usageCount >= 5 && t.successRate < 70)
          .map(t => ({ templateId: t.id, successRate: t.successRate, usageCount: t.usageCount }))
        
        const recentlyUsed = get().instances
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(i => ({ templateId: i.templateId, usedAt: i.createdAt }))
        
        const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0)
        const totalSuccess = templates.reduce((sum, t) => sum + t.successCount, 0)
        const averageSuccessRate = totalUsage > 0 ? Math.round((totalSuccess / totalUsage) * 100) : 0
        
        return {
          totalTemplates: templates.length,
          activeTemplates: activeTemplates.length,
          totalComponents: components.length,
          byCategory,
          byDiscipline,
          topPerformers,
          recentlyUsed,
          underperforming,
          averageSuccessRate,
          totalUsage,
        }
      },
      
      getComponentsByCategory: (category) =>
        get().components.filter(c => c.category === category),
      
      getTemplatesForDiscipline: (discipline) =>
        get().templates.filter(t => 
          t.disciplines.includes(discipline) && t.status === 'active'
        ),
      
      getTemplatesForCTDSection: (section) =>
        get().templates.filter(t => 
          t.ctdSections.includes(section) && t.status === 'active'
        ),
      
      // ================================================================
      // RENDERING
      // ================================================================
      
      renderTemplate: (templateId, variableValues) => {
        const template = get().templates.find(t => t.id === templateId)
        if (!template) return ''
        
        let rendered = ''
        
        template.sections.forEach(section => {
          let sectionContent = section.content
          
          // Replace variables
          section.variables.forEach(variable => {
            const value = variableValues[variable.name] || variable.defaultValue || `[${variable.displayName}]`
            sectionContent = sectionContent.replace(
              new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'),
              value
            )
          })
          
          if (sectionContent.trim()) {
            rendered += `## ${section.name}\n\n${sectionContent}\n\n`
          }
        })
        
        return rendered.trim()
      },
      
      renderComponent: (componentId, variableValues) => {
        const component = get().components.find(c => c.id === componentId)
        if (!component) return ''
        
        let rendered = component.content
        
        component.variables.forEach(variable => {
          const value = variableValues[variable.name] || variable.defaultValue || `[${variable.displayName}]`
          rendered = rendered.replace(
            new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'),
            value
          )
        })
        
        return rendered
      },
      
      // ================================================================
      // SELECTION
      // ================================================================
      
      selectTemplate: (id) => set({ selectedTemplateId: id }, false, 'selectTemplate'),
      selectComponent: (id) => set({ selectedComponentId: id }, false, 'selectComponent'),
      
      // ================================================================
      // FILTERS
      // ================================================================
      
      setSearchQuery: (query) => set({ searchQuery: query }, false, 'setSearchQuery'),
      setFilterCategory: (category) => set({ filterCategory: category }, false, 'setFilterCategory'),
      setFilterDiscipline: (discipline) => set({ filterDiscipline: discipline }, false, 'setFilterDiscipline'),
      setFilterStatus: (status) => set({ filterStatus: status }, false, 'setFilterStatus'),
      
      getFilteredTemplates: () => {
        const { templates, searchQuery, filterCategory, filterDiscipline, filterStatus } = get()
        
        return templates.filter(t => {
          // Search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesSearch = 
              t.name.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.keywords.some(k => k.toLowerCase().includes(query))
            if (!matchesSearch) return false
          }
          
          // Category filter
          if (filterCategory !== 'all' && t.category !== filterCategory) return false
          
          // Discipline filter
          if (filterDiscipline !== 'all' && !t.disciplines.includes(filterDiscipline)) return false
          
          // Status filter
          if (filterStatus !== 'all' && t.status !== filterStatus) return false
          
          return true
        })
      },
      
      getFilteredComponents: () => {
        const { components, searchQuery, filterCategory, filterDiscipline } = get()
        
        return components.filter(c => {
          // Search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesSearch = 
              c.name.toLowerCase().includes(query) ||
              c.description.toLowerCase().includes(query) ||
              c.tags.some(t => t.toLowerCase().includes(query))
            if (!matchesSearch) return false
          }
          
          // Category filter
          if (filterCategory !== 'all' && c.category !== filterCategory) return false
          
          // Discipline filter
          if (filterDiscipline !== 'all' && !c.disciplines.includes(filterDiscipline)) return false
          
          return true
        })
      },
    }),
    { name: 'ResponseTemplates' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useTemplates = () => useResponseTemplates(state => state.templates)
export const useActiveTemplates = () => useResponseTemplates(state => 
  state.templates.filter(t => t.status === 'active')
)
export const useComponents = () => useResponseTemplates(state => state.components)
export const useSelectedTemplate = () => {
  const templates = useResponseTemplates(state => state.templates)
  const selectedId = useResponseTemplates(state => state.selectedTemplateId)
  return templates.find(t => t.id === selectedId)
}
export const useSelectedComponent = () => {
  const components = useResponseTemplates(state => state.components)
  const selectedId = useResponseTemplates(state => state.selectedComponentId)
  return components.find(c => c.id === selectedId)
}
export const useTemplateFilters = () => {
  const searchQuery = useResponseTemplates(state => state.searchQuery)
  const filterCategory = useResponseTemplates(state => state.filterCategory)
  const filterDiscipline = useResponseTemplates(state => state.filterDiscipline)
  const filterStatus = useResponseTemplates(state => state.filterStatus)
  return { searchQuery, filterCategory, filterDiscipline, filterStatus }
}

// Use useMemo pattern to compute stats without causing infinite re-renders
// The selector only returns primitive/stable references, computation happens in the hook
export const useLibraryStats = () => {
  const templates = useResponseTemplates(state => state.templates)
  const components = useResponseTemplates(state => state.components)
  const instances = useResponseTemplates(state => state.instances)
  
  // Compute stats using useMemo to avoid re-computing on every render
  return useMemo(() => {
    const activeTemplates = templates.filter(t => t.status === 'active')
    
    const byCategory: Record<TemplateCategory, number> = {} as Record<TemplateCategory, number>
    const byDiscipline: Record<HAQDiscipline, number> = {} as Record<HAQDiscipline, number>
    
    templates.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1
      t.disciplines.forEach(d => {
        byDiscipline[d] = (byDiscipline[d] || 0) + 1
      })
    })
    
    const topPerformers = activeTemplates
      .filter(t => t.usageCount >= 5)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
      .map(t => ({ templateId: t.id, successRate: t.successRate }))
    
    const underperforming = activeTemplates
      .filter(t => t.usageCount >= 5 && t.successRate < 70)
      .map(t => ({ templateId: t.id, successRate: t.successRate, usageCount: t.usageCount }))
    
    const recentlyUsed = [...instances]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(i => ({ templateId: i.templateId, usedAt: i.createdAt }))
    
    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0)
    const totalSuccess = templates.reduce((sum, t) => sum + t.successCount, 0)
    const averageSuccessRate = totalUsage > 0 ? Math.round((totalSuccess / totalUsage) * 100) : 0
    
    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      totalComponents: components.length,
      byCategory,
      byDiscipline,
      topPerformers,
      recentlyUsed,
      underperforming,
      averageSuccessRate,
      totalUsage,
    }
  }, [templates, components, instances])
}
