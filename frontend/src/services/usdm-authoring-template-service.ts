
// ============================================================================
// USDM → Authoring Template Service (v204c)
// Maps USDM objectives/endpoints to CSR section templates
// Creates lineage records for protocol-to-document traceability
// ============================================================================

import { USDMObjective, USDMEndpoint, USDMLineageAppearance } from '@/domains/usdm/contracts';

// ============================================================================
// TYPES
// ============================================================================

/**
 * CSR Section reference for ICH E3 structure
 */
export type CSRSection = 
  | '11.1'   // Primary Efficacy Evaluation
  | '11.2'   // Secondary Efficacy Evaluation
  | '11.3'   // Exploratory Efficacy Evaluation
  | '11.4'   // Subgroup Analyses
  | '12.1'   // Safety Overview
  | '12.2'   // Adverse Events
  | '12.3'   // Laboratory Evaluations;

/**
 * Endpoint level mapping
 */
export type EndpointLevel = 'primary' | 'secondary' | 'exploratory';

/**
 * Template section with generated content
 */
export interface CSRTemplateSection {
  id: string;
  csrSection: CSRSection;
  sectionNumber: string;
  sectionTitle: string;
  generatedContent: string;
  sourceObjectiveId: string;
  sourceEndpointIds: string[];
  generatedAt: string;
  status: 'draft' | 'reviewed' | 'approved';
  wordCount: number;
}

/**
 * Complete template result for a CSR
 */
export interface CSRTemplateResult {
  id: string;
  studyId: string;
  studyDesignId: string;
  csrTitle: string;
  sections: CSRTemplateSection[];
  generatedAt: string;
  totalWordCount: number;
  lineageRecords: LineageRecord[];
}

/**
 * Lineage record for template generation
 */
export interface LineageRecord {
  sourceEntityId: string;
  sourceEntityType: 'objective' | 'endpoint';
  targetEntityId: string;
  targetEntityType: 'csr-section';
  targetModule: 'authoring';
  csrSection: CSRSection;
  createdAt: string;
}

/**
 * Template generation options
 */
export interface TemplateGenerationOptions {
  includeMethodology: boolean;
  includeStatisticalApproach: boolean;
  includePlaceholders: boolean;
  studyTitle?: string;
  sponsorName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENDPOINT_LEVEL_TO_CSR_SECTION: Record<EndpointLevel, CSRSection> = {
  'primary': '11.1',
  'secondary': '11.2',
  'exploratory': '11.3',
};

const CSR_SECTION_TITLES: Record<CSRSection, string> = {
  '11.1': 'Primary Efficacy Evaluation',
  '11.2': 'Secondary Efficacy Evaluation',
  '11.3': 'Exploratory Efficacy Evaluation',
  '11.4': 'Subgroup Analyses',
  '12.1': 'Safety Overview',
  '12.2': 'Adverse Events',
  '12.3': 'Laboratory Evaluations',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => `csr-tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Extract endpoint level from USDM endpoint
 */
export function extractEndpointLevel(endpoint: USDMEndpoint): EndpointLevel {
  const levelCode = endpoint.endpointLevel?.code?.toLowerCase() || '';
  const levelDecode = endpoint.endpointLevel?.decode?.toLowerCase() || '';
  
  if (levelCode.includes('primary') || levelDecode.includes('primary')) {
    return 'primary';
  }
  if (levelCode.includes('secondary') || levelDecode.includes('secondary')) {
    return 'secondary';
  }
  return 'exploratory';
}

/**
 * Get CSR section for endpoint
 */
export function getCSRSectionForEndpoint(endpoint: USDMEndpoint): CSRSection {
  const level = extractEndpointLevel(endpoint);
  return ENDPOINT_LEVEL_TO_CSR_SECTION[level];
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Group endpoints by their CSR section
 */
export function groupEndpointsBySection(
  endpoints: USDMEndpoint[]
): Record<CSRSection, USDMEndpoint[]> {
  const grouped: Record<CSRSection, USDMEndpoint[]> = {
    '11.1': [],
    '11.2': [],
    '11.3': [],
    '11.4': [],
    '12.1': [],
    '12.2': [],
    '12.3': [],
  };
  
  for (const endpoint of endpoints) {
    const section = getCSRSectionForEndpoint(endpoint);
    grouped[section].push(endpoint);
  }
  
  return grouped;
}

// ============================================================================
// TEMPLATE GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate Section 11.1 (Primary Efficacy) from primary endpoints
 */
export function generateSection11_1(
  objective: USDMObjective,
  endpoints: USDMEndpoint[],
  options: TemplateGenerationOptions
): string {
  const primaryEndpoints = endpoints.filter(e => extractEndpointLevel(e) === 'primary');
  
  if (primaryEndpoints.length === 0) {
    return options.includePlaceholders 
      ? '[No primary endpoints defined in protocol. Please add primary endpoints to generate this section.]'
      : '';
  }
  
  const lines: string[] = [];
  
  // Opening paragraph
  lines.push('The primary efficacy evaluation was designed to assess the primary objective of this study.');
  lines.push('');
  
  // Objective statement
  if (objective.objectiveDescription) {
    lines.push(`**Primary Objective:** ${objective.objectiveDescription}`);
    lines.push('');
  }
  
  // Primary endpoints
  lines.push('**Primary Endpoint(s):**');
  lines.push('');
  
  for (let i = 0; i < primaryEndpoints.length; i++) {
    const ep = primaryEndpoints[i];
    lines.push(`${i + 1}. ${ep.endpointDescription}`);
    
    if (ep.endpointPurposeDescription && options.includeMethodology) {
      lines.push(`   - Purpose: ${ep.endpointPurposeDescription}`);
    }
  }
  
  lines.push('');
  
  // Methodology placeholder
  if (options.includeMethodology) {
    lines.push('**Assessment Methodology:**');
    lines.push('');
    if (options.includePlaceholders) {
      lines.push('[Describe the methodology used to assess the primary endpoint(s), including timing of assessments, evaluation criteria (e.g., RECIST 1.1), and any central review processes.]');
    }
    lines.push('');
  }
  
  // Statistical approach placeholder
  if (options.includeStatisticalApproach) {
    lines.push('**Statistical Approach:**');
    lines.push('');
    if (options.includePlaceholders) {
      lines.push('[Reference the Statistical Analysis Plan. Describe the primary analysis population, statistical methods, handling of missing data, and multiplicity adjustments if applicable.]');
    }
    lines.push('');
  }
  
  // Results placeholder
  lines.push('**Results:**');
  lines.push('');
  if (options.includePlaceholders) {
    lines.push('[Insert primary efficacy results including point estimates, confidence intervals, and p-values. Reference relevant tables and figures.]');
  }
  
  return lines.join('\n');
}

/**
 * Generate Section 11.2 (Secondary Efficacy) from secondary endpoints
 */
export function generateSection11_2(
  objective: USDMObjective,
  endpoints: USDMEndpoint[],
  options: TemplateGenerationOptions
): string {
  const secondaryEndpoints = endpoints.filter(e => extractEndpointLevel(e) === 'secondary');
  
  if (secondaryEndpoints.length === 0) {
    return options.includePlaceholders 
      ? '[No secondary endpoints defined in protocol.]'
      : '';
  }
  
  const lines: string[] = [];
  
  lines.push('The secondary efficacy evaluation assessed additional measures to support the primary findings.');
  lines.push('');
  
  // Objective statement if secondary
  if (objective.objectiveLevel?.code?.toLowerCase().includes('secondary') && objective.objectiveDescription) {
    lines.push(`**Secondary Objective:** ${objective.objectiveDescription}`);
    lines.push('');
  }
  
  lines.push('**Secondary Endpoint(s):**');
  lines.push('');
  
  for (let i = 0; i < secondaryEndpoints.length; i++) {
    const ep = secondaryEndpoints[i];
    lines.push(`${i + 1}. ${ep.endpointDescription}`);
    
    if (ep.endpointPurposeDescription && options.includeMethodology) {
      lines.push(`   - Purpose: ${ep.endpointPurposeDescription}`);
    }
  }
  
  lines.push('');
  
  // Results placeholder
  lines.push('**Results:**');
  lines.push('');
  if (options.includePlaceholders) {
    lines.push('[Insert secondary efficacy results. Reference relevant tables and figures.]');
  }
  
  return lines.join('\n');
}

/**
 * Generate Section 11.3 (Exploratory Efficacy) from exploratory endpoints
 */
export function generateSection11_3(
  endpoints: USDMEndpoint[],
  options: TemplateGenerationOptions
): string {
  const exploratoryEndpoints = endpoints.filter(e => extractEndpointLevel(e) === 'exploratory');
  
  if (exploratoryEndpoints.length === 0) {
    return options.includePlaceholders 
      ? '[No exploratory endpoints defined in protocol.]'
      : '';
  }
  
  const lines: string[] = [];
  
  lines.push('Exploratory analyses were conducted to generate hypotheses for future investigation.');
  lines.push('');
  
  lines.push('**Exploratory Endpoint(s):**');
  lines.push('');
  
  for (let i = 0; i < exploratoryEndpoints.length; i++) {
    const ep = exploratoryEndpoints[i];
    lines.push(`${i + 1}. ${ep.endpointDescription}`);
  }
  
  lines.push('');
  
  lines.push('**Results:**');
  lines.push('');
  if (options.includePlaceholders) {
    lines.push('[Insert exploratory efficacy results. Note that these analyses were not powered for statistical inference.]');
  }
  
  return lines.join('\n');
}

// ============================================================================
// LINEAGE RECORD CREATION
// ============================================================================

/**
 * Create lineage record for template generation
 */
export function createLineageRecord(
  sourceEntityId: string,
  sourceEntityType: 'objective' | 'endpoint',
  targetSectionId: string,
  csrSection: CSRSection
): LineageRecord {
  return {
    sourceEntityId,
    sourceEntityType,
    targetEntityId: targetSectionId,
    targetEntityType: 'csr-section',
    targetModule: 'authoring',
    csrSection,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create USDM lineage appearance for authoring module
 */
export function createAuthoringLineageAppearance(
  csrSectionId: string,
  csrSection: CSRSection
): USDMLineageAppearance {
  return {
    module: 'authoring',
    entityType: 'csr-section',
    entityId: csrSectionId,
    sectionReference: csrSection,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: 'current',
  };
}

// ============================================================================
// MAIN GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a single CSR template section from endpoints
 */
export function generateTemplateSection(
  sectionNumber: CSRSection,
  objective: USDMObjective | null,
  endpoints: USDMEndpoint[],
  options: TemplateGenerationOptions
): CSRTemplateSection | null {
  let content = '';
  
  switch (sectionNumber) {
    case '11.1':
      if (!objective) return null;
      content = generateSection11_1(objective, endpoints, options);
      break;
    case '11.2':
      if (!objective) return null;
      content = generateSection11_2(objective, endpoints, options);
      break;
    case '11.3':
      content = generateSection11_3(endpoints, options);
      break;
    default:
      return null;
  }
  
  if (!content && !options.includePlaceholders) {
    return null;
  }
  
  const id = generateId();
  
  return {
    id,
    csrSection: sectionNumber,
    sectionNumber,
    sectionTitle: CSR_SECTION_TITLES[sectionNumber],
    generatedContent: content,
    sourceObjectiveId: objective?.id || '',
    sourceEndpointIds: endpoints.map(e => e.id),
    generatedAt: new Date().toISOString(),
    status: 'draft',
    wordCount: countWords(content),
  };
}

/**
 * Generate complete CSR efficacy sections from USDM objectives/endpoints
 */
export function generateEfficacySections(
  studyId: string,
  studyDesignId: string,
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[],
  options: TemplateGenerationOptions
): CSRTemplateResult {
  const sections: CSRTemplateSection[] = [];
  const lineageRecords: LineageRecord[] = [];
  
  // Group endpoints by section
  const groupedEndpoints = groupEndpointsBySection(endpoints);
  
  // Find primary objective
  const primaryObjective = objectives.find(obj => 
    obj.objectiveLevel?.code?.toLowerCase().includes('primary') ||
    obj.objectiveLevel?.decode?.toLowerCase().includes('primary')
  ) || objectives[0];
  
  // Find secondary objective
  const secondaryObjective = objectives.find(obj => 
    obj.objectiveLevel?.code?.toLowerCase().includes('secondary') ||
    obj.objectiveLevel?.decode?.toLowerCase().includes('secondary')
  );
  
  // Generate Section 11.1 (Primary)
  if (groupedEndpoints['11.1'].length > 0 || options.includePlaceholders) {
    const section = generateTemplateSection(
      '11.1',
      primaryObjective || null,
      groupedEndpoints['11.1'],
      options
    );
    if (section) {
      sections.push(section);
      
      // Create lineage records
      if (primaryObjective) {
        lineageRecords.push(createLineageRecord(
          primaryObjective.id,
          'objective',
          section.id,
          '11.1'
        ));
      }
      
      for (const ep of groupedEndpoints['11.1']) {
        lineageRecords.push(createLineageRecord(
          ep.id,
          'endpoint',
          section.id,
          '11.1'
        ));
      }
    }
  }
  
  // Generate Section 11.2 (Secondary)
  if (groupedEndpoints['11.2'].length > 0 || options.includePlaceholders) {
    const section = generateTemplateSection(
      '11.2',
      secondaryObjective || primaryObjective || null,
      groupedEndpoints['11.2'],
      options
    );
    if (section) {
      sections.push(section);
      
      if (secondaryObjective) {
        lineageRecords.push(createLineageRecord(
          secondaryObjective.id,
          'objective',
          section.id,
          '11.2'
        ));
      }
      
      for (const ep of groupedEndpoints['11.2']) {
        lineageRecords.push(createLineageRecord(
          ep.id,
          'endpoint',
          section.id,
          '11.2'
        ));
      }
    }
  }
  
  // Generate Section 11.3 (Exploratory)
  if (groupedEndpoints['11.3'].length > 0) {
    const section = generateTemplateSection(
      '11.3',
      null,
      groupedEndpoints['11.3'],
      options
    );
    if (section) {
      sections.push(section);
      
      for (const ep of groupedEndpoints['11.3']) {
        lineageRecords.push(createLineageRecord(
          ep.id,
          'endpoint',
          section.id,
          '11.3'
        ));
      }
    }
  }
  
  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  
  return {
    id: generateId(),
    studyId,
    studyDesignId,
    csrTitle: options.studyTitle ? `Clinical Study Report: ${options.studyTitle}` : 'Clinical Study Report',
    sections,
    generatedAt: new Date().toISOString(),
    totalWordCount,
    lineageRecords,
  };
}

/**
 * Get template preview (summary without full content)
 */
export function getTemplatePreview(
  objectives: USDMObjective[],
  endpoints: USDMEndpoint[]
): {
  sectionCount: number;
  endpointsBySection: Record<CSRSection, number>;
  hasObjective: boolean;
  estimatedWordCount: number;
} {
  const grouped = groupEndpointsBySection(endpoints);
  
  const endpointsBySection: Record<CSRSection, number> = {
    '11.1': grouped['11.1'].length,
    '11.2': grouped['11.2'].length,
    '11.3': grouped['11.3'].length,
    '11.4': 0,
    '12.1': 0,
    '12.2': 0,
    '12.3': 0,
  };
  
  const sectionCount = Object.values(endpointsBySection).filter(n => n > 0).length;
  
  // Rough estimate: ~200 words per endpoint + 100 base per section
  const estimatedWordCount = endpoints.length * 200 + sectionCount * 100;
  
  return {
    sectionCount,
    endpointsBySection,
    hasObjective: objectives.length > 0,
    estimatedWordCount,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that endpoints are suitable for template generation
 */
export function validateEndpointsForTemplate(
  endpoints: USDMEndpoint[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (endpoints.length === 0) {
    errors.push('No endpoints provided for template generation');
    return { isValid: false, errors, warnings };
  }
  
  const grouped = groupEndpointsBySection(endpoints);
  
  // Check for primary endpoints
  if (grouped['11.1'].length === 0) {
    warnings.push('No primary endpoints defined - Section 11.1 will have placeholder content');
  }
  
  // Check for endpoint descriptions
  for (const ep of endpoints) {
    if (!ep.endpointDescription || ep.endpointDescription.trim().length < 10) {
      warnings.push(`Endpoint ${ep.id} has insufficient description`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if an objective has associated endpoints
 */
export function objectiveHasEndpoints(
  objective: USDMObjective,
  endpoints: USDMEndpoint[]
): boolean {
  // This would typically check objectiveEndpoints relationship
  // For now, check if any endpoints reference this objective
  return endpoints.length > 0;
}
