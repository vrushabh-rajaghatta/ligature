// =============================================================================
// PHASE 3 FINAL TEMPLATES - v0.42.12
// Completing the 200 template milestone
// +19 templates: Pediatric, Orphan, Fast Track, PSMF, REMS, Comparability,
// Post-Approval Changes, Biosimilar Development
// =============================================================================

import { DocumentTemplate, TemplateSection } from './ectd-document-templates';

const AMA_REGULATORY_STYLE = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: '12pt',
  lineHeight: '1.5',
  margins: { top: '1in', bottom: '1in', left: '1.25in', right: '1in' },
};

// =============================================================================
// PEDIATRIC INVESTIGATION PLANS (PIP/PSP) - 3 templates
// =============================================================================

export const PEDIATRIC_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-pediatric-pip',
    name: 'Pediatric Investigation Plan (PIP)',
    description: 'EMA Pediatric Investigation Plan for pediatric development requirements',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'EMA Pediatric Regulation (EC) 1901/2006',
    estimatedHours: 60,
    applicableRegions: ['EU', 'GB'],
    defaultWorkflowId: 'wf-pediatric',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'pip-1',
        number: '1',
        title: 'Administrative Information',
        level: 1,
        required: true,
        guidance: 'Application type, applicant details, contact information',
        subsections: [
          { id: 'pip-1-1', number: '1.1', title: 'Applicant Information', level: 2, required: true, guidance: 'Company name, address, contact person' },
          { id: 'pip-1-2', number: '1.2', title: 'Product Information', level: 2, required: true, guidance: 'INN, formulation, strength' },
          { id: 'pip-1-3', number: '1.3', title: 'Application Type', level: 2, required: true, guidance: 'Initial PIP, modification, compliance check' },
        ]
      },
      {
        id: 'pip-2',
        number: '2',
        title: 'Disease and Target Population',
        level: 1,
        required: true,
        guidance: 'Description of disease/condition in pediatric population',
        aiPrompt: 'Describe the epidemiology and unmet medical need in pediatric populations for this condition',
        subsections: [
          { id: 'pip-2-1', number: '2.1', title: 'Epidemiology', level: 2, required: true, guidance: 'Prevalence and incidence in pediatrics' },
          { id: 'pip-2-2', number: '2.2', title: 'Current Treatment Options', level: 2, required: true, guidance: 'Available therapies and limitations' },
          { id: 'pip-2-3', number: '2.3', title: 'Unmet Medical Need', level: 2, required: true, guidance: 'Justification for pediatric development' },
        ]
      },
      {
        id: 'pip-3',
        number: '3',
        title: 'Proposed Pediatric Development',
        level: 1,
        required: true,
        guidance: 'Planned pediatric studies and formulations',
        subsections: [
          { id: 'pip-3-1', number: '3.1', title: 'Age Groups Covered', level: 2, required: true, guidance: 'Newborns, infants, children, adolescents' },
          { id: 'pip-3-2', number: '3.2', title: 'Nonclinical Studies', level: 2, required: true, guidance: 'Juvenile animal studies' },
          { id: 'pip-3-3', number: '3.3', title: 'Clinical Studies', level: 2, required: true, guidance: 'PK, efficacy, safety studies' },
          { id: 'pip-3-4', number: '3.4', title: 'Formulation Development', level: 2, required: true, guidance: 'Age-appropriate formulations' },
        ]
      },
      {
        id: 'pip-4',
        number: '4',
        title: 'Waivers and Deferrals',
        level: 1,
        required: false,
        guidance: 'Requests for waivers or deferrals with justification',
        subsections: [
          { id: 'pip-4-1', number: '4.1', title: 'Waiver Requests', level: 2, required: false, guidance: 'Full or partial waiver justification' },
          { id: 'pip-4-2', number: '4.2', title: 'Deferral Requests', level: 2, required: false, guidance: 'Timing deferrals with milestones' },
        ]
      },
      {
        id: 'pip-5',
        number: '5',
        title: 'Timeline and Milestones',
        level: 1,
        required: true,
        guidance: 'Development timeline with key milestones',
      },
    ]
  },
  {
    id: 'tpl-pediatric-psp',
    name: 'Pediatric Study Plan (PSP)',
    description: 'FDA Pediatric Study Plan under PREA requirements',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA PREA / Pediatric Research Equity Act',
    estimatedHours: 40,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-pediatric',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'psp-1', number: '1', title: 'Executive Summary', level: 1, required: true, guidance: 'Overview of pediatric development strategy' },
      { id: 'psp-2', number: '2', title: 'Product Information', level: 1, required: true, guidance: 'Drug description and proposed indication' },
      { id: 'psp-3', number: '3', title: 'Disease Background', level: 1, required: true, guidance: 'Pediatric disease burden and unmet need', aiPrompt: 'Summarize pediatric epidemiology and treatment landscape' },
      { id: 'psp-4', number: '4', title: 'Proposed Pediatric Studies', level: 1, required: true, guidance: 'Detailed study designs and endpoints',
        subsections: [
          { id: 'psp-4-1', number: '4.1', title: 'Age Groups', level: 2, required: true, guidance: 'Target pediatric subpopulations' },
          { id: 'psp-4-2', number: '4.2', title: 'Study Designs', level: 2, required: true, guidance: 'PK, efficacy, safety study protocols' },
          { id: 'psp-4-3', number: '4.3', title: 'Extrapolation Strategy', level: 2, required: false, guidance: 'Approach for extrapolating adult data' },
        ]
      },
      { id: 'psp-5', number: '5', title: 'Formulation Strategy', level: 1, required: true, guidance: 'Age-appropriate formulation development' },
      { id: 'psp-6', number: '6', title: 'Waiver/Deferral Requests', level: 1, required: false, guidance: 'Any waiver or deferral justifications' },
      { id: 'psp-7', number: '7', title: 'Timeline', level: 1, required: true, guidance: 'Proposed submission timeline' },
    ]
  },
  {
    id: 'tpl-pediatric-written-request',
    name: 'Pediatric Written Request Response',
    description: 'Response to FDA Written Request for pediatric studies under BPCA',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA BPCA / Best Pharmaceuticals for Children Act',
    estimatedHours: 30,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-pediatric',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'pwr-1', number: '1', title: 'Written Request Summary', level: 1, required: true, guidance: 'Summary of FDA Written Request requirements' },
      { id: 'pwr-2', number: '2', title: 'Proposed Studies', level: 1, required: true, guidance: 'Studies to address Written Request',
        subsections: [
          { id: 'pwr-2-1', number: '2.1', title: 'Study Objectives', level: 2, required: true, guidance: 'Primary and secondary objectives' },
          { id: 'pwr-2-2', number: '2.2', title: 'Study Design', level: 2, required: true, guidance: 'Detailed protocol synopsis' },
          { id: 'pwr-2-3', number: '2.3', title: 'Statistical Considerations', level: 2, required: true, guidance: 'Sample size and analysis plan' },
        ]
      },
      { id: 'pwr-3', number: '3', title: 'Formulation', level: 1, required: true, guidance: 'Pediatric formulation details' },
      { id: 'pwr-4', number: '4', title: 'Timeline and Exclusivity', level: 1, required: true, guidance: 'Study timeline and exclusivity eligibility' },
    ]
  },
];

// =============================================================================
// ORPHAN DRUG DESIGNATIONS - 2 templates
// =============================================================================

export const ORPHAN_DRUG_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-orphan-fda',
    name: 'FDA Orphan Drug Designation Request',
    description: 'Application for orphan drug designation from FDA Office of Orphan Products',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA Orphan Drug Act / 21 CFR 316',
    estimatedHours: 35,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-orphan',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'odd-1', number: '1', title: 'Administrative Information', level: 1, required: true, guidance: 'Sponsor information, generic/trade name' },
      { id: 'odd-2', number: '2', title: 'Disease/Condition Description', level: 1, required: true, guidance: 'Rare disease description and prevalence', aiPrompt: 'Describe the rare disease including epidemiology, pathophysiology, and current standard of care' },
      { id: 'odd-3', number: '3', title: 'Prevalence Documentation', level: 1, required: true, guidance: 'Evidence that condition affects <200,000 persons in US',
        subsections: [
          { id: 'odd-3-1', number: '3.1', title: 'US Prevalence Data', level: 2, required: true, guidance: 'Published literature, registry data' },
          { id: 'odd-3-2', number: '3.2', title: 'Calculation Methodology', level: 2, required: true, guidance: 'How prevalence was calculated' },
        ]
      },
      { id: 'odd-4', number: '4', title: 'Scientific Rationale', level: 1, required: true, guidance: 'Rationale for use in rare disease' },
      { id: 'odd-5', number: '5', title: 'Regulatory History', level: 1, required: true, guidance: 'Prior approvals, designations' },
      { id: 'odd-6', number: '6', title: 'Medically Plausible Basis', level: 1, required: true, guidance: 'Nonclinical and clinical evidence supporting use' },
    ]
  },
  {
    id: 'tpl-orphan-ema',
    name: 'EMA Orphan Medicinal Product Designation',
    description: 'Application for orphan designation to EMA Committee for Orphan Medicinal Products',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'EMA Regulation (EC) 141/2000',
    estimatedHours: 40,
    applicableRegions: ['EU', 'GB'],
    defaultWorkflowId: 'wf-orphan',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'omp-1', number: '1', title: 'Administrative Details', level: 1, required: true, guidance: 'Sponsor, contact, product details' },
      { id: 'omp-2', number: '2', title: 'Condition Description', level: 1, required: true, guidance: 'Orphan condition and proposed therapeutic indication' },
      { id: 'omp-3', number: '3', title: 'Prevalence in EU', level: 1, required: true, guidance: 'Evidence of prevalence <5 in 10,000 in EU', aiPrompt: 'Document EU prevalence data from epidemiological sources and registries' },
      { id: 'omp-4', number: '4', title: 'Life-Threatening/Debilitating', level: 1, required: true, guidance: 'Evidence condition is serious' },
      { id: 'omp-5', number: '5', title: 'Significant Benefit', level: 1, required: true, guidance: 'Benefit over existing treatments or no treatment exists',
        subsections: [
          { id: 'omp-5-1', number: '5.1', title: 'Existing Treatments', level: 2, required: true, guidance: 'Review of authorized therapies' },
          { id: 'omp-5-2', number: '5.2', title: 'Significant Benefit Justification', level: 2, required: true, guidance: 'Clinical advantage rationale' },
        ]
      },
      { id: 'omp-6', number: '6', title: 'Development Status', level: 1, required: true, guidance: 'Summary of development program' },
    ]
  },
];

// =============================================================================
// FAST TRACK / BREAKTHROUGH DESIGNATIONS - 3 templates
// =============================================================================

export const EXPEDITED_PROGRAM_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-fast-track',
    name: 'Fast Track Designation Request',
    description: 'Request for FDA Fast Track designation',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA Fast Track Guidance',
    estimatedHours: 25,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-expedited',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'ft-1', number: '1', title: 'Product and Indication', level: 1, required: true, guidance: 'Drug name, proposed indication' },
      { id: 'ft-2', number: '2', title: 'Serious Condition', level: 1, required: true, guidance: 'Evidence condition is serious or life-threatening', aiPrompt: 'Describe the serious/life-threatening nature of the condition with supporting evidence' },
      { id: 'ft-3', number: '3', title: 'Unmet Medical Need', level: 1, required: true, guidance: 'No approved therapy or advantage over existing therapies',
        subsections: [
          { id: 'ft-3-1', number: '3.1', title: 'Current Standard of Care', level: 2, required: true, guidance: 'Available treatment options' },
          { id: 'ft-3-2', number: '3.2', title: 'Unmet Need Justification', level: 2, required: true, guidance: 'How product addresses unmet need' },
        ]
      },
      { id: 'ft-4', number: '4', title: 'Nonclinical Evidence', level: 1, required: true, guidance: 'Summary of nonclinical data' },
      { id: 'ft-5', number: '5', title: 'Clinical Evidence', level: 1, required: false, guidance: 'Available clinical data' },
      { id: 'ft-6', number: '6', title: 'Development Plan', level: 1, required: true, guidance: 'Proposed clinical development program' },
    ]
  },
  {
    id: 'tpl-breakthrough-therapy',
    name: 'Breakthrough Therapy Designation Request',
    description: 'Request for FDA Breakthrough Therapy designation',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA Breakthrough Therapy Guidance',
    estimatedHours: 35,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-expedited',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'bt-1', number: '1', title: 'Product and Indication', level: 1, required: true, guidance: 'Drug name and proposed indication' },
      { id: 'bt-2', number: '2', title: 'Serious Condition', level: 1, required: true, guidance: 'Evidence condition is serious or life-threatening' },
      { id: 'bt-3', number: '3', title: 'Preliminary Clinical Evidence', level: 1, required: true, guidance: 'Clinical evidence of substantial improvement', aiPrompt: 'Summarize preliminary clinical evidence demonstrating substantial improvement over existing therapies',
        subsections: [
          { id: 'bt-3-1', number: '3.1', title: 'Study Design and Results', level: 2, required: true, guidance: 'Clinical study summary' },
          { id: 'bt-3-2', number: '3.2', title: 'Comparison to Existing Therapies', level: 2, required: true, guidance: 'Evidence of substantial improvement' },
        ]
      },
      { id: 'bt-4', number: '4', title: 'Mechanism of Action', level: 1, required: true, guidance: 'Scientific rationale for benefit' },
      { id: 'bt-5', number: '5', title: 'Development Strategy', level: 1, required: true, guidance: 'Proposed development program and timeline' },
    ]
  },
  {
    id: 'tpl-prime-ema',
    name: 'PRIME Designation Request',
    description: 'EMA PRIME (PRIority MEdicines) scheme eligibility request',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'EMA PRIME Guidance',
    estimatedHours: 35,
    applicableRegions: ['EU', 'GB'],
    defaultWorkflowId: 'wf-expedited',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'prime-1', number: '1', title: 'Administrative Information', level: 1, required: true, guidance: 'Applicant details, product information' },
      { id: 'prime-2', number: '2', title: 'Condition and Unmet Need', level: 1, required: true, guidance: 'Serious condition with unmet medical need',
        subsections: [
          { id: 'prime-2-1', number: '2.1', title: 'Disease Description', level: 2, required: true, guidance: 'Condition overview' },
          { id: 'prime-2-2', number: '2.2', title: 'Unmet Medical Need', level: 2, required: true, guidance: 'Gap in current treatment options' },
        ]
      },
      { id: 'prime-3', number: '3', title: 'Major Therapeutic Advantage', level: 1, required: true, guidance: 'Evidence of significant benefit', aiPrompt: 'Present evidence supporting major therapeutic advantage over existing treatments' },
      { id: 'prime-4', number: '4', title: 'Available Data Summary', level: 1, required: true, guidance: 'Nonclinical and clinical data supporting eligibility' },
      { id: 'prime-5', number: '5', title: 'Development Plan', level: 1, required: true, guidance: 'Regulatory strategy and scientific advice needs' },
    ]
  },
];

// =============================================================================
// PHARMACOVIGILANCE SYSTEM MASTER FILE (PSMF) - 1 template
// =============================================================================

export const PSMF_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-psmf',
    name: 'Pharmacovigilance System Master File (PSMF)',
    description: 'Comprehensive description of pharmacovigilance system per EU GVP Module II',
    documentType: 'safety',
    version: '1.0',
    ichGuideline: 'EU GVP Module II / Directive 2010/84/EU',
    estimatedHours: 80,
    applicableRegions: ['EU', 'GB'],
    defaultWorkflowId: 'wf-pv',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'psmf-1',
        number: '1',
        title: 'Qualified Person for Pharmacovigilance (QPPV)',
        level: 1,
        required: true,
        guidance: 'QPPV details and contact information',
        subsections: [
          { id: 'psmf-1-1', number: '1.1', title: 'QPPV Identification', level: 2, required: true, guidance: 'Name, contact details, CV' },
          { id: 'psmf-1-2', number: '1.2', title: 'QPPV Responsibilities', level: 2, required: true, guidance: 'Role description and delegation' },
          { id: 'psmf-1-3', number: '1.3', title: 'Back-up Arrangements', level: 2, required: true, guidance: 'Deputy QPPV arrangements' },
        ]
      },
      {
        id: 'psmf-2',
        number: '2',
        title: 'Organizational Structure',
        level: 1,
        required: true,
        guidance: 'PV organization and resources',
        subsections: [
          { id: 'psmf-2-1', number: '2.1', title: 'PV Organization Chart', level: 2, required: true, guidance: 'Organizational structure' },
          { id: 'psmf-2-2', number: '2.2', title: 'Staffing and Training', level: 2, required: true, guidance: 'Personnel qualifications and training' },
          { id: 'psmf-2-3', number: '2.3', title: 'Contracted Activities', level: 2, required: false, guidance: 'Outsourced PV activities' },
        ]
      },
      {
        id: 'psmf-3',
        number: '3',
        title: 'Sources of Safety Data',
        level: 1,
        required: true,
        guidance: 'Safety data sources and collection methods',
        aiPrompt: 'Describe all sources of safety data including spontaneous reports, clinical trials, literature, and other sources'
      },
      {
        id: 'psmf-4',
        number: '4',
        title: 'Computerized Systems and Databases',
        level: 1,
        required: true,
        guidance: 'Safety database and systems description',
        subsections: [
          { id: 'psmf-4-1', number: '4.1', title: 'Safety Database', level: 2, required: true, guidance: 'ICSR database system' },
          { id: 'psmf-4-2', number: '4.2', title: 'Signal Detection Tools', level: 2, required: true, guidance: 'Signal detection and management' },
          { id: 'psmf-4-3', number: '4.3', title: 'Validation Status', level: 2, required: true, guidance: 'Computer system validation' },
        ]
      },
      {
        id: 'psmf-5',
        number: '5',
        title: 'Processes',
        level: 1,
        required: true,
        guidance: 'Key PV processes and procedures',
        subsections: [
          { id: 'psmf-5-1', number: '5.1', title: 'ICSR Collection and Processing', level: 2, required: true, guidance: 'Case management process' },
          { id: 'psmf-5-2', number: '5.2', title: 'Signal Management', level: 2, required: true, guidance: 'Signal detection and evaluation' },
          { id: 'psmf-5-3', number: '5.3', title: 'Risk Management', level: 2, required: true, guidance: 'Risk minimization activities' },
          { id: 'psmf-5-4', number: '5.4', title: 'PSUR/PBRER Preparation', level: 2, required: true, guidance: 'Periodic safety reports' },
        ]
      },
      {
        id: 'psmf-6',
        number: '6',
        title: 'Quality System',
        level: 1,
        required: true,
        guidance: 'PV quality management system',
        subsections: [
          { id: 'psmf-6-1', number: '6.1', title: 'Standard Operating Procedures', level: 2, required: true, guidance: 'SOP list and review' },
          { id: 'psmf-6-2', number: '6.2', title: 'Auditing', level: 2, required: true, guidance: 'Internal audit program' },
          { id: 'psmf-6-3', number: '6.3', title: 'Performance Metrics', level: 2, required: true, guidance: 'KPIs and compliance metrics' },
        ]
      },
      { id: 'psmf-7', number: '7', title: 'Annexes', level: 1, required: true, guidance: 'Product list, CVs, SOP list, agreements' },
    ]
  },
];

// =============================================================================
// REMS COMPONENTS - 3 templates
// =============================================================================

export const REMS_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-rems-full',
    name: 'REMS with ETASU',
    description: 'Full REMS program with Elements to Assure Safe Use',
    documentType: 'safety',
    version: '1.0',
    ichGuideline: 'FDA REMS Guidance / FDAAA 2007',
    estimatedHours: 100,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-rems',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'rems-1',
        number: '1',
        title: 'REMS Goals',
        level: 1,
        required: true,
        guidance: 'Specific, measurable safety goals',
        aiPrompt: 'Define specific, measurable REMS goals aligned with the identified safety risks'
      },
      {
        id: 'rems-2',
        number: '2',
        title: 'REMS Elements',
        level: 1,
        required: true,
        guidance: 'Required elements of the REMS',
        subsections: [
          { id: 'rems-2-1', number: '2.1', title: 'Medication Guide', level: 2, required: false, guidance: 'Patient medication guide requirements' },
          { id: 'rems-2-2', number: '2.2', title: 'Communication Plan', level: 2, required: false, guidance: 'HCP communication strategy' },
          { id: 'rems-2-3', number: '2.3', title: 'Elements to Assure Safe Use (ETASU)', level: 2, required: true, guidance: 'Prescriber certification, pharmacy requirements, patient enrollment',
            subsections: [
              { id: 'rems-2-3-1', number: '2.3.1', title: 'Healthcare Provider Requirements', level: 3, required: true, guidance: 'Prescriber certification/training' },
              { id: 'rems-2-3-2', number: '2.3.2', title: 'Pharmacy Requirements', level: 3, required: true, guidance: 'Pharmacy certification' },
              { id: 'rems-2-3-3', number: '2.3.3', title: 'Patient Enrollment', level: 3, required: true, guidance: 'Patient registration/monitoring' },
              { id: 'rems-2-3-4', number: '2.3.4', title: 'Monitoring Requirements', level: 3, required: false, guidance: 'Required tests/assessments' },
            ]
          },
          { id: 'rems-2-4', number: '2.4', title: 'Implementation System', level: 2, required: true, guidance: 'System to implement ETASU' },
        ]
      },
      { id: 'rems-3', number: '3', title: 'REMS Assessment Plan', level: 1, required: true, guidance: 'How REMS effectiveness will be assessed' },
      { id: 'rems-4', number: '4', title: 'Timetable for Submission', level: 1, required: true, guidance: 'REMS assessment submission schedule' },
      { id: 'rems-5', number: '5', title: 'Supporting Documents', level: 1, required: true, guidance: 'REMS materials and forms' },
    ]
  },
  {
    id: 'tpl-rems-assessment',
    name: 'REMS Assessment Report',
    description: 'Periodic assessment of REMS effectiveness',
    documentType: 'safety',
    version: '1.0',
    ichGuideline: 'FDA REMS Guidance',
    estimatedHours: 60,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-rems',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'rems-a-1', number: '1', title: 'Executive Summary', level: 1, required: true, guidance: 'Summary of REMS assessment findings' },
      { id: 'rems-a-2', number: '2', title: 'Background', level: 1, required: true, guidance: 'REMS program description and goals' },
      { id: 'rems-a-3', number: '3', title: 'Assessment Methods', level: 1, required: true, guidance: 'Data sources and analytical methods' },
      { id: 'rems-a-4', number: '4', title: 'Assessment Results', level: 1, required: true, guidance: 'Data on goal achievement',
        subsections: [
          { id: 'rems-a-4-1', number: '4.1', title: 'Goal Achievement Metrics', level: 2, required: true, guidance: 'Quantitative goal assessment' },
          { id: 'rems-a-4-2', number: '4.2', title: 'Safety Outcomes', level: 2, required: true, guidance: 'Serious adverse event data' },
          { id: 'rems-a-4-3', number: '4.3', title: 'Implementation Data', level: 2, required: true, guidance: 'Enrollment, certification metrics' },
        ]
      },
      { id: 'rems-a-5', number: '5', title: 'Conclusions', level: 1, required: true, guidance: 'Overall assessment conclusion', aiPrompt: 'Summarize whether REMS goals are being met and recommend any modifications' },
      { id: 'rems-a-6', number: '6', title: 'Proposed REMS Modifications', level: 1, required: false, guidance: 'Any proposed changes to REMS' },
    ]
  },
  {
    id: 'tpl-medication-guide',
    name: 'Medication Guide',
    description: 'FDA-required Medication Guide for patients',
    documentType: 'labeling',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 208',
    estimatedHours: 20,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-labeling',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'mg-1', number: '1', title: 'Header Section', level: 1, required: true, guidance: 'Brand name, generic name, important warning' },
      { id: 'mg-2', number: '2', title: 'What is the most important information?', level: 1, required: true, guidance: 'Serious risks and warnings', aiPrompt: 'Write patient-friendly language about the most serious risks' },
      { id: 'mg-3', number: '3', title: 'What is [drug name]?', level: 1, required: true, guidance: 'What the medicine is and its use' },
      { id: 'mg-4', number: '4', title: 'Who should not take [drug name]?', level: 1, required: true, guidance: 'Contraindications in lay language' },
      { id: 'mg-5', number: '5', title: 'What should I tell my healthcare provider?', level: 1, required: true, guidance: 'Information to share with HCP' },
      { id: 'mg-6', number: '6', title: 'How should I take [drug name]?', level: 1, required: true, guidance: 'Dosing instructions' },
      { id: 'mg-7', number: '7', title: 'What should I avoid?', level: 1, required: true, guidance: 'Interactions and precautions' },
      { id: 'mg-8', number: '8', title: 'What are possible side effects?', level: 1, required: true, guidance: 'Common and serious side effects' },
      { id: 'mg-9', number: '9', title: 'How should I store [drug name]?', level: 1, required: true, guidance: 'Storage conditions' },
      { id: 'mg-10', number: '10', title: 'General information', level: 1, required: true, guidance: 'Additional information, contact' },
    ]
  },
];

// =============================================================================
// COMPARABILITY PROTOCOLS - 2 templates
// =============================================================================

export const COMPARABILITY_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-comparability-protocol',
    name: 'Comparability Protocol',
    description: 'FDA Comparability Protocol for post-approval manufacturing changes',
    documentType: 'cmc',
    ctdModule: '3',
    version: '1.0',
    ichGuideline: 'FDA Comparability Protocol Guidance / ICH Q5E',
    estimatedHours: 60,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-cmc',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'cp-1',
        number: '1',
        title: 'Protocol Overview',
        level: 1,
        required: true,
        guidance: 'Scope and objectives of comparability protocol',
        subsections: [
          { id: 'cp-1-1', number: '1.1', title: 'Proposed Change Description', level: 2, required: true, guidance: 'Detailed change description' },
          { id: 'cp-1-2', number: '1.2', title: 'Rationale for Change', level: 2, required: true, guidance: 'Business/scientific rationale' },
          { id: 'cp-1-3', number: '1.3', title: 'Products Covered', level: 2, required: true, guidance: 'NDAs/BLAs affected' },
        ]
      },
      {
        id: 'cp-2',
        number: '2',
        title: 'Comparability Testing Plan',
        level: 1,
        required: true,
        guidance: 'Tests to demonstrate comparability',
        aiPrompt: 'Design a comprehensive comparability testing strategy covering analytical, stability, and biological characterization',
        subsections: [
          { id: 'cp-2-1', number: '2.1', title: 'Analytical Testing', level: 2, required: true, guidance: 'Release and characterization testing' },
          { id: 'cp-2-2', number: '2.2', title: 'Stability Studies', level: 2, required: true, guidance: 'Stability comparison plan' },
          { id: 'cp-2-3', number: '2.3', title: 'Biological Assays', level: 2, required: false, guidance: 'For biologics: potency, structure' },
        ]
      },
      {
        id: 'cp-3',
        number: '3',
        title: 'Acceptance Criteria',
        level: 1,
        required: true,
        guidance: 'Pre-defined acceptance criteria',
        subsections: [
          { id: 'cp-3-1', number: '3.1', title: 'Analytical Acceptance Criteria', level: 2, required: true, guidance: 'Quantitative acceptance limits' },
          { id: 'cp-3-2', number: '3.2', title: 'Statistical Approach', level: 2, required: true, guidance: 'Statistical methods for comparison' },
        ]
      },
      { id: 'cp-4', number: '4', title: 'Reporting Requirements', level: 1, required: true, guidance: 'Post-change reporting to FDA' },
      { id: 'cp-5', number: '5', title: 'Protocol Validation', level: 1, required: true, guidance: 'Protocol validation and execution plan' },
    ]
  },
  {
    id: 'tpl-biosimilar-comparability',
    name: 'Biosimilar Analytical Similarity Assessment',
    description: 'Analytical similarity assessment for biosimilar development',
    documentType: 'cmc',
    ctdModule: '3',
    version: '1.0',
    ichGuideline: 'FDA Biosimilar Guidance / ICH Q5E / WHO SBP',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'JP', 'GLOBAL'],
    defaultWorkflowId: 'wf-cmc',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'bsa-1', number: '1', title: 'Executive Summary', level: 1, required: true, guidance: 'Summary of analytical similarity' },
      { id: 'bsa-2', number: '2', title: 'Reference Product Analysis', level: 1, required: true, guidance: 'Characterization of reference product',
        subsections: [
          { id: 'bsa-2-1', number: '2.1', title: 'Reference Product Sourcing', level: 2, required: true, guidance: 'Lots analyzed, sourcing strategy' },
          { id: 'bsa-2-2', number: '2.2', title: 'Reference Product Characterization', level: 2, required: true, guidance: 'Full analytical characterization' },
        ]
      },
      { id: 'bsa-3', number: '3', title: 'Analytical Similarity Assessment', level: 1, required: true, guidance: 'Head-to-head comparison',
        subsections: [
          { id: 'bsa-3-1', number: '3.1', title: 'Primary Structure', level: 2, required: true, guidance: 'Amino acid sequence, mass spec' },
          { id: 'bsa-3-2', number: '3.2', title: 'Higher Order Structure', level: 2, required: true, guidance: 'Secondary/tertiary structure' },
          { id: 'bsa-3-3', number: '3.3', title: 'Post-Translational Modifications', level: 2, required: true, guidance: 'Glycosylation, other PTMs' },
          { id: 'bsa-3-4', number: '3.4', title: 'Purity and Impurities', level: 2, required: true, guidance: 'Aggregates, fragments, variants' },
          { id: 'bsa-3-5', number: '3.5', title: 'Biological Activity', level: 2, required: true, guidance: 'Potency, receptor binding' },
        ]
      },
      { id: 'bsa-4', number: '4', title: 'Statistical Analysis', level: 1, required: true, guidance: 'Statistical evaluation of similarity', aiPrompt: 'Describe statistical approach for demonstrating analytical similarity within quality ranges' },
      { id: 'bsa-5', number: '5', title: 'Similarity Conclusions', level: 1, required: true, guidance: 'Overall similarity assessment' },
    ]
  },
];

// =============================================================================
// POST-APPROVAL CHANGES - 3 templates
// =============================================================================

export const POST_APPROVAL_CHANGE_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-cbe-supplement',
    name: 'CBE/CBE-30 Supplement',
    description: 'Changes Being Effected supplement for post-approval manufacturing changes',
    documentType: 'regulatory',
    ctdModule: '1',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 314.70',
    estimatedHours: 40,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-supplement',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'cbe-1', number: '1', title: 'Cover Letter', level: 1, required: true, guidance: 'Supplement type, change description' },
      { id: 'cbe-2', number: '2', title: 'Change Description', level: 1, required: true, guidance: 'Detailed description of proposed change',
        subsections: [
          { id: 'cbe-2-1', number: '2.1', title: 'Current Approved Conditions', level: 2, required: true, guidance: 'Before state' },
          { id: 'cbe-2-2', number: '2.2', title: 'Proposed Change', level: 2, required: true, guidance: 'After state' },
          { id: 'cbe-2-3', number: '2.3', title: 'Rationale', level: 2, required: true, guidance: 'Reason for change' },
        ]
      },
      { id: 'cbe-3', number: '3', title: 'Regulatory Classification', level: 1, required: true, guidance: 'CBE-0 or CBE-30 justification' },
      { id: 'cbe-4', number: '4', title: 'Supporting Data', level: 1, required: true, guidance: 'Analytical, stability, validation data' },
      { id: 'cbe-5', number: '5', title: 'Updated CTD Sections', level: 1, required: true, guidance: 'Module 3 updates' },
      { id: 'cbe-6', number: '6', title: 'Environmental Assessment', level: 1, required: false, guidance: 'If applicable' },
    ]
  },
  {
    id: 'tpl-pas-supplement',
    name: 'Prior Approval Supplement (PAS)',
    description: 'Prior Approval Supplement for major manufacturing changes',
    documentType: 'regulatory',
    ctdModule: '1',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 314.70',
    estimatedHours: 80,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-supplement',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'pas-1', number: '1', title: 'Cover Letter', level: 1, required: true, guidance: 'PAS submission summary' },
      { id: 'pas-2', number: '2', title: 'Change Description', level: 1, required: true, guidance: 'Comprehensive change description',
        subsections: [
          { id: 'pas-2-1', number: '2.1', title: 'Current State', level: 2, required: true, guidance: 'Approved conditions' },
          { id: 'pas-2-2', number: '2.2', title: 'Proposed State', level: 2, required: true, guidance: 'Proposed new conditions' },
          { id: 'pas-2-3', number: '2.3', title: 'Change Rationale', level: 2, required: true, guidance: 'Justification for change' },
        ]
      },
      { id: 'pas-3', number: '3', title: 'Risk Assessment', level: 1, required: true, guidance: 'Quality risk assessment for change', aiPrompt: 'Conduct quality risk assessment for the proposed manufacturing change' },
      { id: 'pas-4', number: '4', title: 'Comparability/Equivalence', level: 1, required: true, guidance: 'Demonstration of product equivalence',
        subsections: [
          { id: 'pas-4-1', number: '4.1', title: 'Analytical Comparison', level: 2, required: true, guidance: 'Release and characterization' },
          { id: 'pas-4-2', number: '4.2', title: 'Process Comparison', level: 2, required: true, guidance: 'Process parameters and controls' },
          { id: 'pas-4-3', number: '4.3', title: 'Stability Data', level: 2, required: true, guidance: 'Comparative stability' },
        ]
      },
      { id: 'pas-5', number: '5', title: 'Validation Summary', level: 1, required: true, guidance: 'Process validation for new conditions' },
      { id: 'pas-6', number: '6', title: 'Updated CTD Sections', level: 1, required: true, guidance: 'All affected Module 3 sections' },
      { id: 'pas-7', number: '7', title: 'Labeling Updates', level: 1, required: false, guidance: 'If labeling affected' },
    ]
  },
  {
    id: 'tpl-annual-report',
    name: 'Annual Report (NDA/BLA)',
    description: 'Annual report to FDA for approved NDA/BLA',
    documentType: 'regulatory',
    ctdModule: '1',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 314.81(b)(2)',
    estimatedHours: 30,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-annual',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'ar-1', number: '1', title: 'Summary of Significant Changes', level: 1, required: true, guidance: 'Changes not requiring supplements' },
      { id: 'ar-2', number: '2', title: 'Distribution Data', level: 1, required: true, guidance: 'Number of dosage units distributed' },
      { id: 'ar-3', number: '3', title: 'Labeling', level: 1, required: true, guidance: 'Current labeling specimens' },
      { id: 'ar-4', number: '4', title: 'Chemistry, Manufacturing, Controls', level: 1, required: true, guidance: 'CMC changes made during period',
        subsections: [
          { id: 'ar-4-1', number: '4.1', title: 'Drug Substance', level: 2, required: true, guidance: 'DS manufacturing changes' },
          { id: 'ar-4-2', number: '4.2', title: 'Drug Product', level: 2, required: true, guidance: 'DP manufacturing changes' },
          { id: 'ar-4-3', number: '4.3', title: 'Stability Update', level: 2, required: true, guidance: 'Stability data from period' },
        ]
      },
      { id: 'ar-5', number: '5', title: 'Nonclinical Studies', level: 1, required: false, guidance: 'Any new nonclinical data' },
      { id: 'ar-6', number: '6', title: 'Clinical Studies', level: 1, required: false, guidance: 'New clinical data, Phase 4 status' },
      { id: 'ar-7', number: '7', title: 'Status of Postmarketing Commitments', level: 1, required: true, guidance: 'PMC/PMR status update' },
    ]
  },
];

// =============================================================================
// BIOSIMILAR DEVELOPMENT PLANS - 2 templates
// =============================================================================

export const BIOSIMILAR_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-biosimilar-development-plan',
    name: 'Biosimilar Development Plan',
    description: 'Comprehensive development plan for biosimilar product',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA Biosimilar Guidance / EMA Biosimilar Guidelines',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'JP', 'GLOBAL'],
    defaultWorkflowId: 'wf-biosimilar',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'bdp-1',
        number: '1',
        title: 'Executive Summary',
        level: 1,
        required: true,
        guidance: 'Overview of biosimilar development strategy',
        aiPrompt: 'Summarize the stepwise approach to demonstrating biosimilarity'
      },
      {
        id: 'bdp-2',
        number: '2',
        title: 'Reference Product Information',
        level: 1,
        required: true,
        guidance: 'Target reference product details',
        subsections: [
          { id: 'bdp-2-1', number: '2.1', title: 'Reference Product Selection', level: 2, required: true, guidance: 'US/EU reference product' },
          { id: 'bdp-2-2', number: '2.2', title: 'IP Landscape', level: 2, required: true, guidance: 'Patent and exclusivity analysis' },
          { id: 'bdp-2-3', number: '2.3', title: 'Reference Product Characterization', level: 2, required: true, guidance: 'Known critical quality attributes' },
        ]
      },
      {
        id: 'bdp-3',
        number: '3',
        title: 'Analytical Similarity Strategy',
        level: 1,
        required: true,
        guidance: 'Comprehensive analytical characterization plan',
        subsections: [
          { id: 'bdp-3-1', number: '3.1', title: 'Fingerprint-like Analysis', level: 2, required: true, guidance: 'State-of-art analytical methods' },
          { id: 'bdp-3-2', number: '3.2', title: 'Functional Assays', level: 2, required: true, guidance: 'Mechanism-relevant biological assays' },
          { id: 'bdp-3-3', number: '3.3', title: 'Similarity Assessment Approach', level: 2, required: true, guidance: 'Statistical approach for similarity' },
        ]
      },
      {
        id: 'bdp-4',
        number: '4',
        title: 'Clinical Pharmacology Studies',
        level: 1,
        required: true,
        guidance: 'PK similarity strategy',
        subsections: [
          { id: 'bdp-4-1', number: '4.1', title: 'PK Study Design', level: 2, required: true, guidance: 'Comparative PK study' },
          { id: 'bdp-4-2', number: '4.2', title: 'Immunogenicity Assessment', level: 2, required: true, guidance: 'ADA strategy' },
        ]
      },
      {
        id: 'bdp-5',
        number: '5',
        title: 'Clinical Efficacy/Safety Studies',
        level: 1,
        required: true,
        guidance: 'Clinical study requirements',
        subsections: [
          { id: 'bdp-5-1', number: '5.1', title: 'Sensitive Population Selection', level: 2, required: true, guidance: 'Study population rationale' },
          { id: 'bdp-5-2', number: '5.2', title: 'Study Design', level: 2, required: true, guidance: 'Equivalence or non-inferiority' },
          { id: 'bdp-5-3', number: '5.3', title: 'Extrapolation Strategy', level: 2, required: false, guidance: 'Extrapolation to other indications' },
        ]
      },
      { id: 'bdp-6', number: '6', title: 'Regulatory Strategy', level: 1, required: true, guidance: 'Filing strategy by region' },
      { id: 'bdp-7', number: '7', title: 'Timeline and Milestones', level: 1, required: true, guidance: 'Development timeline' },
    ]
  },
  {
    id: 'tpl-biosimilar-351k',
    name: '351(k) Biosimilar Application Strategy',
    description: 'FDA 351(k) biosimilar BLA submission strategy',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA 351(k) / BPCIA',
    estimatedHours: 50,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-biosimilar',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: '351k-1', number: '1', title: 'Submission Overview', level: 1, required: true, guidance: '351(k) pathway overview' },
      { id: '351k-2', number: '2', title: 'Reference Product', level: 1, required: true, guidance: 'US-licensed reference product',
        subsections: [
          { id: '351k-2-1', number: '2.1', title: 'Reference Product Selection', level: 2, required: true, guidance: 'BLA number, licensed indications' },
          { id: '351k-2-2', number: '2.2', title: 'Bridging to Non-US Reference', level: 2, required: false, guidance: 'If applicable, bridging strategy' },
        ]
      },
      { id: '351k-3', number: '3', title: 'Biosimilarity Assessment', level: 1, required: true, guidance: 'Totality of evidence approach', aiPrompt: 'Describe the stepwise approach to demonstrating biosimilarity under 351(k)' },
      { id: '351k-4', number: '4', title: 'Interchangeability Considerations', level: 1, required: false, guidance: 'If seeking interchangeable designation',
        subsections: [
          { id: '351k-4-1', number: '4.1', title: 'Switching Study Design', level: 2, required: false, guidance: 'Multiple switch study requirements' },
          { id: '351k-4-2', number: '4.2', title: 'Interchangeability Criteria', level: 2, required: false, guidance: 'No diminished safety/efficacy' },
        ]
      },
      { id: '351k-5', number: '5', title: 'Proposed Labeling', level: 1, required: true, guidance: 'Biosimilar labeling requirements' },
      { id: '351k-6', number: '6', title: 'Patent Dance Strategy', level: 1, required: true, guidance: 'BPCIA patent notification process' },
    ]
  },
];

// =============================================================================
// EXPORT ALL PHASE 3 FINAL TEMPLATES
// =============================================================================

export const PHASE3_FINAL_TEMPLATES: DocumentTemplate[] = [
  ...PEDIATRIC_TEMPLATES,
  ...ORPHAN_DRUG_TEMPLATES,
  ...EXPEDITED_PROGRAM_TEMPLATES,
  ...PSMF_TEMPLATES,
  ...REMS_TEMPLATES,
  ...COMPARABILITY_TEMPLATES,
  ...POST_APPROVAL_CHANGE_TEMPLATES,
  ...BIOSIMILAR_TEMPLATES,
];

export default PHASE3_FINAL_TEMPLATES;
