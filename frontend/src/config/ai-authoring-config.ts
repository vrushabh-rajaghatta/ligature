
// AI Authoring Configuration
// Document-type-specific AI prompts, guidance, and source requirements

import { DocumentType } from '@/types/authoring';

export interface AIDocumentConfig {
  documentType: DocumentType;
  displayName: string;
  description: string;
  
  // AI generation settings
  aiEnabled: boolean;
  defaultModel: 'standard' | 'advanced';
  
  // Required source types for generation
  requiredSources: SourceType[];
  optionalSources: SourceType[];
  
  // Section-specific AI configs
  sections: AISectionConfig[];
  
  // Quality requirements
  citationRequired: boolean;
  minSourcesPerSection: number;
  
  // Regulatory context
  regulatoryGuidance: string[];
  ichGuidelines: string[];
}

export interface AISectionConfig {
  sectionPattern: string; // regex or section number pattern
  sectionTitle: string;
  
  // AI prompt template
  promptTemplate: string;
  
  // What sources this section needs
  requiredSourceTypes: SourceType[];
  
  // Generation options
  options: {
    includeTablesAutomatically: boolean;
    includeFiguresAutomatically: boolean;
    crossReferenceOtherSections: boolean;
    citationStyle: 'inline' | 'footnote' | 'endnote';
  };
  
  // Quality checks
  qualityChecks: QualityCheck[];
  
  // Example content (for few-shot prompting)
  exampleContent?: string;
}

export type SourceType = 
  | 'clinical-study-report'
  | 'statistical-analysis'
  | 'safety-database'
  | 'efficacy-data'
  | 'pk-data'
  | 'nonclinical-studies'
  | 'manufacturing-data'
  | 'stability-data'
  | 'literature'
  | 'regulatory-guidance'
  | 'previous-submission'
  | 'protocol'
  | 'investigator-brochure'
  | 'labeling';

export interface QualityCheck {
  id: string;
  name: string;
  description: string;
  type: 'required' | 'recommended';
  autoCheck: boolean;
}

// ============================================================================
// DOCUMENT TYPE CONFIGURATIONS
// ============================================================================

export const aiDocumentConfigs: Record<DocumentType, AIDocumentConfig> = {
  // Clinical Study Report
  'csr': {
    documentType: 'csr',
    displayName: 'Clinical Study Report',
    description: 'ICH E3-compliant clinical study report',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'statistical-analysis', 'protocol'],
    optionalSources: ['safety-database', 'pk-data', 'literature'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E3', '21 CFR 312.33'],
    ichGuidelines: ['E3', 'E6', 'E9'],
    sections: [
      {
        sectionPattern: '11',
        sectionTitle: 'Efficacy Evaluation',
        promptTemplate: `Generate the Efficacy Evaluation section for a Clinical Study Report following ICH E3 guidelines.

CONTEXT:
- Study: {{studyName}}
- Indication: {{indication}}
- Primary endpoint: {{primaryEndpoint}}
- Analysis populations: {{analysisSets}}

REQUIREMENTS:
1. Describe all analysis populations (ITT, PP, Safety)
2. Present primary efficacy results with statistical tests
3. Include hazard ratios and confidence intervals
4. Reference all tables and figures
5. Maintain objective, scientific tone

SOURCE DATA:
{{sourceData}}

Generate comprehensive efficacy evaluation with proper citations to source data.`,
        requiredSourceTypes: ['statistical-analysis', 'efficacy-data'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: true,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-primary-endpoint', name: 'Primary Endpoint Addressed', description: 'Primary endpoint results clearly stated', type: 'required', autoCheck: true },
          { id: 'qc-stats', name: 'Statistical Methods', description: 'Statistical methods properly described', type: 'required', autoCheck: true },
          { id: 'qc-ci', name: 'Confidence Intervals', description: 'CIs provided for key estimates', type: 'required', autoCheck: true },
        ],
      },
      {
        sectionPattern: '12',
        sectionTitle: 'Safety Evaluation',
        promptTemplate: `Generate the Safety Evaluation section for a Clinical Study Report following ICH E3 guidelines.

CONTEXT:
- Study: {{studyName}}
- Treatment duration: {{treatmentDuration}}
- Safety population: {{safetyPopulation}}

REQUIREMENTS:
1. Summarize extent of exposure
2. Present adverse events by system organ class
3. Detail serious adverse events
4. Describe deaths and discontinuations
5. Include laboratory findings
6. Reference safety tables

SOURCE DATA:
{{sourceData}}

Generate comprehensive safety evaluation with proper MedDRA coding references.`,
        requiredSourceTypes: ['safety-database', 'clinical-study-report'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: false,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-exposure', name: 'Exposure Summary', description: 'Extent of exposure clearly stated', type: 'required', autoCheck: true },
          { id: 'qc-sae', name: 'SAE Details', description: 'All SAEs properly described', type: 'required', autoCheck: true },
          { id: 'qc-medra', name: 'MedDRA Coding', description: 'AEs coded to MedDRA', type: 'required', autoCheck: true },
        ],
      },
    ],
  },

  // Investigator's Brochure
  'ib': {
    documentType: 'ib',
    displayName: "Investigator's Brochure",
    description: 'ICH E6-compliant investigator brochure',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['nonclinical-studies', 'clinical-study-report', 'manufacturing-data'],
    optionalSources: ['literature', 'pk-data', 'safety-database'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E6(R2)', '21 CFR 312.23'],
    ichGuidelines: ['E6', 'E2F'],
    sections: [
      {
        sectionPattern: '4',
        sectionTitle: 'Nonclinical Studies',
        promptTemplate: `Generate the Nonclinical Studies section for an Investigator's Brochure.

CONTEXT:
- Product: {{productName}}
- Mechanism: {{mechanismOfAction}}
- Species studied: {{speciesStudied}}

REQUIREMENTS:
1. Summarize pharmacology studies
2. Present toxicology findings
3. Include NOAEL/NOEL values
4. Describe safety margins
5. Reference ICH M3(R2) compliance

SOURCE DATA:
{{sourceData}}

Generate nonclinical summary suitable for investigators.`,
        requiredSourceTypes: ['nonclinical-studies'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: false,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-noael', name: 'NOAEL Stated', description: 'NOAEL values clearly provided', type: 'required', autoCheck: true },
          { id: 'qc-margin', name: 'Safety Margins', description: 'Safety margins calculated', type: 'required', autoCheck: true },
        ],
      },
      {
        sectionPattern: '5',
        sectionTitle: 'Effects in Humans',
        promptTemplate: `Generate the Effects in Humans section for an Investigator's Brochure.

CONTEXT:
- Product: {{productName}}
- Clinical experience: {{clinicalExperience}}
- Approved indications: {{approvedIndications}}

REQUIREMENTS:
1. Summarize PK in humans
2. Present safety and efficacy data
3. Include dosing information
4. Describe known adverse reactions
5. Note any special populations data

SOURCE DATA:
{{sourceData}}

Generate human experience summary for investigators.`,
        requiredSourceTypes: ['clinical-study-report', 'pk-data'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: true,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-pk', name: 'PK Parameters', description: 'Key PK parameters included', type: 'required', autoCheck: true },
          { id: 'qc-dosing', name: 'Dosing Info', description: 'Dosing recommendations clear', type: 'required', autoCheck: true },
        ],
      },
    ],
  },

  // Module 2.5 - Clinical Overview
  'module-25': {
    documentType: 'module-25',
    displayName: 'Clinical Overview (M2.5)',
    description: 'CTD Module 2.5 - Clinical Overview',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'statistical-analysis', 'safety-database'],
    optionalSources: ['literature', 'regulatory-guidance'],
    citationRequired: true,
    minSourcesPerSection: 2,
    regulatoryGuidance: ['ICH M4E(R2)', 'ICH E1'],
    ichGuidelines: ['M4E', 'E1', 'E9'],
    sections: [
      {
        sectionPattern: '2.5.1',
        sectionTitle: 'Product Development Rationale',
        promptTemplate: `Generate the Product Development Rationale section for CTD Module 2.5.

CONTEXT:
- Product: {{productName}}
- Indication: {{indication}}
- Mechanism: {{mechanismOfAction}}
- Unmet medical need: {{unmetNeed}}

REQUIREMENTS:
1. Describe the disease and unmet need
2. Explain the scientific rationale
3. Summarize the development program
4. Position vs. existing therapies
5. Reference key regulatory guidance

SOURCE DATA:
{{sourceData}}

Generate compelling development rationale with scientific justification.`,
        requiredSourceTypes: ['literature', 'regulatory-guidance'],
        options: {
          includeTablesAutomatically: false,
          includeFiguresAutomatically: false,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-unmet-need', name: 'Unmet Need', description: 'Unmet medical need clearly stated', type: 'required', autoCheck: true },
          { id: 'qc-rationale', name: 'Scientific Rationale', description: 'MOA and rationale explained', type: 'required', autoCheck: true },
        ],
      },
      {
        sectionPattern: '2.5.4',
        sectionTitle: 'Overview of Efficacy',
        promptTemplate: `Generate the Overview of Efficacy section for CTD Module 2.5.

CONTEXT:
- Product: {{productName}}
- Indication: {{indication}}
- Key studies: {{keyStudies}}
- Primary endpoints: {{primaryEndpoints}}

REQUIREMENTS:
1. Integrate efficacy across studies
2. Present key efficacy findings
3. Discuss clinical relevance
4. Address regulatory endpoints
5. Compare to standard of care

SOURCE DATA:
{{sourceData}}

Generate integrated efficacy overview suitable for regulatory submission.`,
        requiredSourceTypes: ['clinical-study-report', 'statistical-analysis'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: true,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-integration', name: 'Data Integration', description: 'Data integrated across studies', type: 'required', autoCheck: true },
          { id: 'qc-endpoints', name: 'Endpoints Addressed', description: 'All primary endpoints addressed', type: 'required', autoCheck: true },
        ],
      },
      {
        sectionPattern: '2.5.5',
        sectionTitle: 'Overview of Safety',
        promptTemplate: `Generate the Overview of Safety section for CTD Module 2.5.

CONTEXT:
- Product: {{productName}}
- Total exposure: {{totalExposure}}
- Key safety findings: {{keySafetyFindings}}

REQUIREMENTS:
1. Integrate safety across studies
2. Present overall safety profile
3. Discuss important identified risks
4. Address potential risks
5. Summarize risk management

SOURCE DATA:
{{sourceData}}

Generate integrated safety overview following ICH E1 requirements.`,
        requiredSourceTypes: ['safety-database', 'clinical-study-report'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: false,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-ich-e1', name: 'ICH E1 Compliance', description: 'Meets ICH E1 exposure requirements', type: 'required', autoCheck: true },
          { id: 'qc-risks', name: 'Risk Summary', description: 'Key risks identified and discussed', type: 'required', autoCheck: true },
        ],
      },
    ],
  },

  // Module 2.7 - Clinical Summary
  'module-27': {
    documentType: 'module-27',
    displayName: 'Clinical Summary (M2.7)',
    description: 'CTD Module 2.7 - Clinical Summary',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'statistical-analysis', 'pk-data', 'safety-database'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 2,
    regulatoryGuidance: ['ICH M4E(R2)'],
    ichGuidelines: ['M4E', 'E3'],
    sections: [
      {
        sectionPattern: '2.7.1',
        sectionTitle: 'Summary of Biopharmaceutic Studies',
        promptTemplate: `Generate the Summary of Biopharmaceutic Studies section for CTD Module 2.7.

CONTEXT:
- Product: {{productName}}
- Formulation: {{formulation}}
- BA/BE studies: {{babeStudies}}

REQUIREMENTS:
1. Summarize bioavailability studies
2. Present bioequivalence data if applicable
3. Describe food effect studies
4. Include dissolution data
5. Reference analytical methods

SOURCE DATA:
{{sourceData}}

Generate biopharmaceutic summary with appropriate detail.`,
        requiredSourceTypes: ['pk-data', 'clinical-study-report'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: true,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-ba', name: 'BA Summary', description: 'Bioavailability properly characterized', type: 'required', autoCheck: true },
        ],
      },
      {
        sectionPattern: '2.7.2',
        sectionTitle: 'Summary of Clinical Pharmacology Studies',
        promptTemplate: `Generate the Summary of Clinical Pharmacology Studies section for CTD Module 2.7.

CONTEXT:
- Product: {{productName}}
- PK characteristics: {{pkCharacteristics}}
- DDI potential: {{ddiPotential}}

REQUIREMENTS:
1. Summarize PK studies
2. Present PD findings
3. Describe drug-drug interactions
4. Include special population PK
5. Discuss exposure-response

SOURCE DATA:
{{sourceData}}

Generate clinical pharmacology summary following ICH guidance.`,
        requiredSourceTypes: ['pk-data', 'clinical-study-report'],
        options: {
          includeTablesAutomatically: true,
          includeFiguresAutomatically: true,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-pk-summary', name: 'PK Summary', description: 'PK parameters fully characterized', type: 'required', autoCheck: true },
          { id: 'qc-ddi', name: 'DDI Assessment', description: 'Drug interactions assessed', type: 'required', autoCheck: true },
        ],
      },
    ],
  },

  // Protocol
  'protocol': {
    documentType: 'protocol',
    displayName: 'Clinical Protocol',
    description: 'ICH E6-compliant clinical study protocol',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['investigator-brochure', 'literature'],
    optionalSources: ['regulatory-guidance', 'previous-submission'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E6(R2)', 'ICH E8'],
    ichGuidelines: ['E6', 'E8', 'E9'],
    sections: [
      {
        sectionPattern: '3',
        sectionTitle: 'Background and Rationale',
        promptTemplate: `Generate the Background and Rationale section for a clinical protocol.

CONTEXT:
- Product: {{productName}}
- Indication: {{indication}}
- Phase: {{phase}}
- Mechanism: {{mechanismOfAction}}

REQUIREMENTS:
1. Describe the disease background
2. Summarize nonclinical data
3. Present prior clinical experience
4. Justify the proposed study
5. Reference the IB

SOURCE DATA:
{{sourceData}}

Generate compelling scientific background and rationale.`,
        requiredSourceTypes: ['investigator-brochure', 'literature'],
        options: {
          includeTablesAutomatically: false,
          includeFiguresAutomatically: false,
          crossReferenceOtherSections: true,
          citationStyle: 'inline',
        },
        qualityChecks: [
          { id: 'qc-ib-ref', name: 'IB Referenced', description: 'Investigator Brochure properly referenced', type: 'required', autoCheck: true },
        ],
      },
    ],
  },

  // Nonclinical Overview (Module 2.4)
  'module-24': {
    documentType: 'module-24',
    displayName: 'Nonclinical Overview (M2.4)',
    description: 'CTD Module 2.4 - Nonclinical Overview',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['nonclinical-studies'],
    optionalSources: ['literature', 'regulatory-guidance'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH M4S(R2)', 'ICH M3(R2)'],
    ichGuidelines: ['M4S', 'M3', 'S6', 'S7A', 'S7B', 'S9'],
    sections: [],
  },

  // Nonclinical Summary (Module 2.6)
  'module-26': {
    documentType: 'module-26',
    displayName: 'Nonclinical Summary (M2.6)',
    description: 'CTD Module 2.6 - Nonclinical Written and Tabulated Summaries',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['nonclinical-studies'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH M4S(R2)'],
    ichGuidelines: ['M4S', 'S2', 'S3A', 'S3B'],
    sections: [],
  },

  // Quality modules - less AI intensive
  'module-32s': {
    documentType: 'module-32s',
    displayName: 'Drug Substance (M3.2.S)',
    description: 'CTD Module 3.2.S - Drug Substance',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: ['manufacturing-data'],
    optionalSources: ['stability-data'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH Q1-Q12'],
    ichGuidelines: ['Q1A', 'Q2', 'Q3A', 'Q6A', 'Q8', 'Q11'],
    sections: [],
  },

  'module-32p': {
    documentType: 'module-32p',
    displayName: 'Drug Product (M3.2.P)',
    description: 'CTD Module 3.2.P - Drug Product',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: ['manufacturing-data', 'stability-data'],
    optionalSources: [],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH Q1-Q12'],
    ichGuidelines: ['Q1A', 'Q2', 'Q3B', 'Q6A', 'Q8', 'Q9'],
    sections: [],
  },

  'module-32a': {
    documentType: 'module-32a',
    displayName: 'Appendices (M3.2.A)',
    description: 'CTD Module 3.2.A - Appendices',
    aiEnabled: false,
    defaultModel: 'standard',
    requiredSources: ['manufacturing-data'],
    optionalSources: [],
    citationRequired: false,
    minSourcesPerSection: 0,
    regulatoryGuidance: [],
    ichGuidelines: [],
    sections: [],
  },

  'module-33': {
    documentType: 'module-33',
    displayName: 'Literature References (M3.3)',
    description: 'CTD Module 3.3 - Literature References',
    aiEnabled: false,
    defaultModel: 'standard',
    requiredSources: ['literature'],
    optionalSources: [],
    citationRequired: true,
    minSourcesPerSection: 0,
    regulatoryGuidance: [],
    ichGuidelines: [],
    sections: [],
  },

  // Labeling documents
  'uspi': {
    documentType: 'uspi',
    displayName: 'US Prescribing Information',
    description: 'FDA-compliant US Prescribing Information',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'safety-database', 'labeling'],
    optionalSources: ['literature'],
    citationRequired: false,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['21 CFR 201.56', '21 CFR 201.57'],
    ichGuidelines: [],
    sections: [],
  },

  'ccds': {
    documentType: 'ccds',
    displayName: 'Company Core Data Sheet',
    description: 'Global core labeling document',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'safety-database'],
    optionalSources: ['literature', 'labeling'],
    citationRequired: false,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['CIOMS'],
    ichGuidelines: [],
    sections: [],
  },

  'smpc': {
    documentType: 'smpc',
    displayName: 'SmPC (EU)',
    description: 'Summary of Product Characteristics',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'safety-database', 'labeling'],
    optionalSources: ['literature'],
    citationRequired: false,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['EMA SmPC Guideline'],
    ichGuidelines: [],
    sections: [],
  },

  'pil': {
    documentType: 'pil',
    displayName: 'Patient Information Leaflet',
    description: 'Patient-facing labeling document',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: ['labeling'],
    optionalSources: [],
    citationRequired: false,
    minSourcesPerSection: 0,
    regulatoryGuidance: [],
    ichGuidelines: [],
    sections: [],
  },

  // Safety reports
  'dsur': {
    documentType: 'dsur',
    displayName: 'DSUR',
    description: 'Development Safety Update Report',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['safety-database', 'clinical-study-report'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E2F'],
    ichGuidelines: ['E2F'],
    sections: [],
  },

  'pbrer': {
    documentType: 'pbrer',
    displayName: 'PBRER',
    description: 'Periodic Benefit-Risk Evaluation Report',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['safety-database', 'clinical-study-report'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E2C(R2)'],
    ichGuidelines: ['E2C'],
    sections: [],
  },

  // Other document types
  'ise': {
    documentType: 'ise',
    displayName: 'Integrated Summary of Efficacy',
    description: 'Integrated efficacy analysis across studies',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'statistical-analysis'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 2,
    regulatoryGuidance: ['ICH E9'],
    ichGuidelines: ['E9'],
    sections: [],
  },

  'iss': {
    documentType: 'iss',
    displayName: 'Integrated Summary of Safety',
    description: 'Integrated safety analysis across studies',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['safety-database', 'clinical-study-report'],
    optionalSources: ['literature'],
    citationRequired: true,
    minSourcesPerSection: 2,
    regulatoryGuidance: ['ICH E1'],
    ichGuidelines: ['E1'],
    sections: [],
  },

  'sap': {
    documentType: 'sap',
    displayName: 'Statistical Analysis Plan',
    description: 'Pre-specified statistical methodology',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: ['protocol'],
    optionalSources: ['statistical-analysis', 'regulatory-guidance'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH E9'],
    ichGuidelines: ['E9'],
    sections: [],
  },

  'icf': {
    documentType: 'icf',
    displayName: 'Informed Consent Form',
    description: 'Patient informed consent document',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: ['protocol', 'investigator-brochure'],
    optionalSources: [],
    citationRequired: false,
    minSourcesPerSection: 0,
    regulatoryGuidance: ['21 CFR 50', 'ICH E6'],
    ichGuidelines: ['E6'],
    sections: [],
  },

  'briefing-book': {
    documentType: 'briefing-book',
    displayName: 'Briefing Book',
    description: 'Meeting briefing document for health authorities',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'regulatory-guidance'],
    optionalSources: ['literature', 'previous-submission'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: [],
    ichGuidelines: [],
    sections: [],
  },

  'module-2-summary': {
    documentType: 'module-2-summary',
    displayName: 'Module 2 Summary',
    description: 'Overall summary of Module 2 clinical and nonclinical data',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: ['clinical-study-report', 'investigator-brochure', 'protocol'],
    optionalSources: ['statistical-analysis'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH M4E', 'ICH E3'],
    ichGuidelines: ['E3', 'M4E'],
    sections: [],
  },

  'module-3-quality': {
    documentType: 'module-3-quality',
    displayName: 'Module 3 Quality',
    description: 'Quality (CMC) documentation overview',
    aiEnabled: true,
    defaultModel: 'advanced',
    requiredSources: [],
    optionalSources: ['manufacturing-data', 'stability-data'],
    citationRequired: true,
    minSourcesPerSection: 1,
    regulatoryGuidance: ['ICH M4Q', 'ICH Q8', 'ICH Q9', 'ICH Q10'],
    ichGuidelines: ['Q8', 'Q9', 'Q10', 'M4Q'],
    sections: [],
  },

  'other': {
    documentType: 'other',
    displayName: 'Other Document',
    description: 'Custom document type',
    aiEnabled: true,
    defaultModel: 'standard',
    requiredSources: [],
    optionalSources: [],
    citationRequired: false,
    minSourcesPerSection: 0,
    regulatoryGuidance: [],
    ichGuidelines: [],
    sections: [],
  },
};

// Helper to get config for a document type
export function getAIDocumentConfig(docType: DocumentType): AIDocumentConfig {
  return aiDocumentConfigs[docType] || aiDocumentConfigs['other'];
}

// Get section-specific AI config
export function getSectionAIConfig(docType: DocumentType, sectionNumber: string): AISectionConfig | null {
  const docConfig = getAIDocumentConfig(docType);
  return docConfig.sections.find(s => sectionNumber.startsWith(s.sectionPattern)) || null;
}
