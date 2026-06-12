// =============================================================================
// REGULATORY STRATEGY & AUDIT TEMPLATES - v0.42.11
// Templates for regulatory planning, audits, inspections, and compliance
// Phase 3 expansion: +20 templates
// =============================================================================

import { DocumentTemplate, TemplateSection } from './ectd-document-templates';

const AMA_REGULATORY_STYLE = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: '12pt',
  lineHeight: '1.5',
  margins: { top: '1in', bottom: '1in', left: '1.25in', right: '1in' },
};

// =============================================================================
// REGULATORY STRATEGY TEMPLATES
// =============================================================================

export const REGULATORY_STRATEGY_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-global-reg-strategy',
    name: 'Global Regulatory Strategy Document',
    description: 'Comprehensive regulatory strategy for global product development and submissions',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'ICH E8(R1) / ICH Q8-12',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'CH'],
    defaultWorkflowId: 'wf-reg-strategy',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'grs-1',
        number: '1',
        title: 'Executive Summary',
        level: 1,
        required: true,
        guidance: 'High-level summary of regulatory strategy, target indications, and timeline',
        aiPrompt: 'Summarize the global regulatory strategy including target markets, key milestones, and competitive positioning'
      },
      {
        id: 'grs-2',
        number: '2',
        title: 'Product Overview',
        level: 1,
        required: true,
        guidance: 'Description of the product, mechanism of action, and therapeutic area',
        subsections: [
          { id: 'grs-2-1', number: '2.1', title: 'Product Description', level: 2, required: true, guidance: 'Detailed product description' },
          { id: 'grs-2-2', number: '2.2', title: 'Mechanism of Action', level: 2, required: true, guidance: 'MOA and pharmacology' },
          { id: 'grs-2-3', number: '2.3', title: 'Target Indication(s)', level: 2, required: true, guidance: 'Proposed indications and patient populations' },
        ]
      },
      {
        id: 'grs-3',
        number: '3',
        title: 'Competitive Landscape',
        level: 1,
        required: true,
        guidance: 'Analysis of competitive products and market positioning',
        aiPrompt: 'Analyze the competitive landscape including approved products, pipeline competitors, and differentiation strategy'
      },
      {
        id: 'grs-4',
        number: '4',
        title: 'Regulatory Pathway Analysis',
        level: 1,
        required: true,
        guidance: 'Analysis of regulatory pathways by region',
        subsections: [
          { id: 'grs-4-1', number: '4.1', title: 'US FDA Strategy', level: 2, required: true, guidance: 'FDA regulatory pathway and expedited programs' },
          { id: 'grs-4-2', number: '4.2', title: 'EMA Strategy', level: 2, required: true, guidance: 'EU regulatory pathway and PRIME/accelerated assessment' },
          { id: 'grs-4-3', number: '4.3', title: 'Japan PMDA Strategy', level: 2, required: false, guidance: 'PMDA regulatory pathway and SAKIGAKE' },
          { id: 'grs-4-4', number: '4.4', title: 'China NMPA Strategy', level: 2, required: false, guidance: 'NMPA regulatory pathway' },
          { id: 'grs-4-5', number: '4.5', title: 'ROW Markets', level: 2, required: false, guidance: 'Strategy for other key markets' },
        ]
      },
      {
        id: 'grs-5',
        number: '5',
        title: 'Clinical Development Plan',
        level: 1,
        required: true,
        guidance: 'Overview of clinical program to support registration',
        subsections: [
          { id: 'grs-5-1', number: '5.1', title: 'Phase 1 Studies', level: 2, required: true, guidance: 'Early development studies' },
          { id: 'grs-5-2', number: '5.2', title: 'Phase 2 Studies', level: 2, required: true, guidance: 'Dose-finding and proof-of-concept' },
          { id: 'grs-5-3', number: '5.3', title: 'Phase 3 Studies', level: 2, required: true, guidance: 'Pivotal registration studies' },
          { id: 'grs-5-4', number: '5.4', title: 'Post-Marketing Commitments', level: 2, required: false, guidance: 'Anticipated PMC/PMR studies' },
        ]
      },
      {
        id: 'grs-6',
        number: '6',
        title: 'CMC Strategy',
        level: 1,
        required: true,
        guidance: 'Manufacturing and quality strategy',
      },
      {
        id: 'grs-7',
        number: '7',
        title: 'Labeling Strategy',
        level: 1,
        required: true,
        guidance: 'Global labeling and harmonization approach',
      },
      {
        id: 'grs-8',
        number: '8',
        title: 'Risk Assessment',
        level: 1,
        required: true,
        guidance: 'Regulatory risks and mitigation strategies',
        aiPrompt: 'Identify key regulatory risks and propose mitigation strategies'
      },
      {
        id: 'grs-9',
        number: '9',
        title: 'Timeline & Milestones',
        level: 1,
        required: true,
        guidance: 'Key regulatory milestones and timelines',
      },
    ]
  },
  {
    id: 'tpl-pre-ind-strategy',
    name: 'Pre-IND Meeting Strategy Document',
    description: 'Strategy and briefing document for FDA Pre-IND meeting request',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA Guidance on Formal Meetings',
    estimatedHours: 40,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-reg-strategy',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'pind-1', number: '1', title: 'Meeting Purpose and Objectives', level: 1, required: true, guidance: 'Clear statement of meeting goals' },
      { id: 'pind-2', number: '2', title: 'Product Overview', level: 1, required: true, guidance: 'Brief product description' },
      { id: 'pind-3', number: '3', title: 'Proposed Indication', level: 1, required: true, guidance: 'Target indication and patient population' },
      { id: 'pind-4', number: '4', title: 'Nonclinical Summary', level: 1, required: true, guidance: 'Summary of nonclinical program' },
      { id: 'pind-5', number: '5', title: 'CMC Summary', level: 1, required: true, guidance: 'Manufacturing and quality overview' },
      { id: 'pind-6', number: '6', title: 'Proposed Clinical Program', level: 1, required: true, guidance: 'FIH and development plan' },
      { id: 'pind-7', number: '7', title: 'Questions for FDA', level: 1, required: true, guidance: 'Specific questions requiring FDA input', aiPrompt: 'Draft focused questions for FDA feedback on the proposed development program' },
    ]
  },
  {
    id: 'tpl-end-phase2-strategy',
    name: 'End of Phase 2 Meeting Strategy',
    description: 'Strategy document for FDA End of Phase 2 meeting',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA Guidance on Formal Meetings',
    estimatedHours: 60,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-reg-strategy',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'eop2-1', number: '1', title: 'Meeting Purpose', level: 1, required: true, guidance: 'Objectives for EOP2 meeting' },
      { id: 'eop2-2', number: '2', title: 'Development Program Summary', level: 1, required: true, guidance: 'Summary of completed studies' },
      { id: 'eop2-3', number: '3', title: 'Phase 2 Results Summary', level: 1, required: true, guidance: 'Key efficacy and safety findings' },
      { id: 'eop2-4', number: '4', title: 'Proposed Phase 3 Program', level: 1, required: true, guidance: 'Pivotal trial design and endpoints' },
      { id: 'eop2-5', number: '5', title: 'Special Protocol Assessment Request', level: 1, required: false, guidance: 'SPA considerations' },
      { id: 'eop2-6', number: '6', title: 'Questions for FDA', level: 1, required: true, guidance: 'Specific questions on Phase 3 design' },
    ]
  },
  {
    id: 'tpl-pre-bla-strategy',
    name: 'Pre-BLA/NDA Meeting Strategy',
    description: 'Strategy document for pre-submission meeting with FDA',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA Guidance on Formal Meetings',
    estimatedHours: 50,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-reg-strategy',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'pbla-1', number: '1', title: 'Meeting Purpose', level: 1, required: true, guidance: 'Pre-submission meeting objectives' },
      { id: 'pbla-2', number: '2', title: 'Submission Plan', level: 1, required: true, guidance: 'Planned submission content and timing' },
      { id: 'pbla-3', number: '3', title: 'Clinical Data Summary', level: 1, required: true, guidance: 'Summary of efficacy and safety data' },
      { id: 'pbla-4', number: '4', title: 'CMC Readiness', level: 1, required: true, guidance: 'Manufacturing status and completeness' },
      { id: 'pbla-5', number: '5', title: 'Proposed Labeling', level: 1, required: true, guidance: 'Draft labeling overview' },
      { id: 'pbla-6', number: '6', title: 'Risk Management', level: 1, required: true, guidance: 'REMS considerations if applicable' },
      { id: 'pbla-7', number: '7', title: 'Questions for FDA', level: 1, required: true, guidance: 'Questions on submission readiness' },
    ]
  },
  {
    id: 'tpl-scientific-advice-ema',
    name: 'EMA Scientific Advice Briefing Document',
    description: 'Briefing document for EMA Scientific Advice procedure',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'EMA Scientific Advice Guidance',
    estimatedHours: 60,
    applicableRegions: ['EU'],
    defaultWorkflowId: 'wf-reg-strategy',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'ema-sa-1', number: '1', title: 'Administrative Information', level: 1, required: true, guidance: 'Sponsor details and procedure type' },
      { id: 'ema-sa-2', number: '2', title: 'Product Overview', level: 1, required: true, guidance: 'Product description and development status' },
      { id: 'ema-sa-3', number: '3', title: 'Quality Development', level: 1, required: false, guidance: 'CMC questions and strategy' },
      { id: 'ema-sa-4', number: '4', title: 'Non-clinical Development', level: 1, required: false, guidance: 'Nonclinical program and questions' },
      { id: 'ema-sa-5', number: '5', title: 'Clinical Development', level: 1, required: true, guidance: 'Clinical strategy and questions' },
      { id: 'ema-sa-6', number: '6', title: 'Questions for CHMP', level: 1, required: true, guidance: 'Specific scientific questions' },
    ]
  },
];

// =============================================================================
// AUDIT & INSPECTION TEMPLATES
// =============================================================================

export const AUDIT_INSPECTION_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-gcp-audit-report',
    name: 'GCP Audit Report',
    description: 'Clinical site GCP compliance audit report template',
    documentType: 'audit',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH E6(R2)',
    estimatedHours: 24,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-audit',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'gcp-1', number: '1', title: 'Audit Information', level: 1, required: true, guidance: 'Site, dates, auditors, scope' },
      { id: 'gcp-2', number: '2', title: 'Executive Summary', level: 1, required: true, guidance: 'Overall audit conclusion and key findings', aiPrompt: 'Summarize audit findings with overall compliance assessment' },
      { id: 'gcp-3', number: '3', title: 'Site Overview', level: 1, required: true, guidance: 'Site description and study participation' },
      { id: 'gcp-4', number: '4', title: 'Audit Findings', level: 1, required: true, guidance: 'Detailed findings categorized by severity',
        subsections: [
          { id: 'gcp-4-1', number: '4.1', title: 'Critical Findings', level: 2, required: true, guidance: 'Critical deviations affecting data integrity or safety' },
          { id: 'gcp-4-2', number: '4.2', title: 'Major Findings', level: 2, required: true, guidance: 'Major protocol or GCP deviations' },
          { id: 'gcp-4-3', number: '4.3', title: 'Minor Findings', level: 2, required: true, guidance: 'Minor deviations and observations' },
        ]
      },
      { id: 'gcp-5', number: '5', title: 'CAPA Requirements', level: 1, required: true, guidance: 'Required corrective and preventive actions' },
      { id: 'gcp-6', number: '6', title: 'Appendices', level: 1, required: false, guidance: 'Supporting documentation' },
    ]
  },
  {
    id: 'tpl-gmp-audit-report',
    name: 'GMP Audit Report',
    description: 'Manufacturing site GMP compliance audit report',
    documentType: 'audit',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q7 / 21 CFR Part 211',
    estimatedHours: 32,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-audit',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'gmp-1', number: '1', title: 'Audit Information', level: 1, required: true, guidance: 'Facility, dates, auditors, scope' },
      { id: 'gmp-2', number: '2', title: 'Executive Summary', level: 1, required: true, guidance: 'Overall compliance assessment' },
      { id: 'gmp-3', number: '3', title: 'Facility Overview', level: 1, required: true, guidance: 'Facility description and capabilities' },
      { id: 'gmp-4', number: '4', title: 'Quality System Review', level: 1, required: true, guidance: 'QA/QC system assessment' },
      { id: 'gmp-5', number: '5', title: 'Production Review', level: 1, required: true, guidance: 'Manufacturing process compliance' },
      { id: 'gmp-6', number: '6', title: 'Laboratory Review', level: 1, required: true, guidance: 'Testing and analytical compliance' },
      { id: 'gmp-7', number: '7', title: 'Findings & Classifications', level: 1, required: true, guidance: 'Detailed audit findings' },
      { id: 'gmp-8', number: '8', title: 'CAPA Requirements', level: 1, required: true, guidance: 'Required corrective actions' },
    ]
  },
  {
    id: 'tpl-glp-audit-report',
    name: 'GLP Audit Report',
    description: 'Nonclinical study GLP compliance audit report',
    documentType: 'audit',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: '21 CFR Part 58 / OECD GLP',
    estimatedHours: 24,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-audit',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'glp-1', number: '1', title: 'Audit Information', level: 1, required: true, guidance: 'Facility/study, dates, scope' },
      { id: 'glp-2', number: '2', title: 'Executive Summary', level: 1, required: true, guidance: 'Overall GLP compliance assessment' },
      { id: 'glp-3', number: '3', title: 'Study/Facility Overview', level: 1, required: true, guidance: 'Study details or facility description' },
      { id: 'glp-4', number: '4', title: 'Personnel & Training', level: 1, required: true, guidance: 'Staff qualifications and training' },
      { id: 'glp-5', number: '5', title: 'Study Documentation', level: 1, required: true, guidance: 'Protocol, amendments, raw data' },
      { id: 'glp-6', number: '6', title: 'Equipment & Facilities', level: 1, required: true, guidance: 'Equipment calibration and facilities' },
      { id: 'glp-7', number: '7', title: 'Findings', level: 1, required: true, guidance: 'Detailed audit findings' },
      { id: 'glp-8', number: '8', title: 'CAPA Requirements', level: 1, required: true, guidance: 'Corrective actions required' },
    ]
  },
  {
    id: 'tpl-vendor-qualification',
    name: 'Vendor Qualification Report',
    description: 'Assessment and qualification of vendors and suppliers',
    documentType: 'audit',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q10',
    estimatedHours: 16,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-audit',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'vq-1', number: '1', title: 'Vendor Information', level: 1, required: true, guidance: 'Vendor details and services' },
      { id: 'vq-2', number: '2', title: 'Qualification Scope', level: 1, required: true, guidance: 'Services/products being qualified' },
      { id: 'vq-3', number: '3', title: 'Assessment Methodology', level: 1, required: true, guidance: 'How qualification was performed' },
      { id: 'vq-4', number: '4', title: 'Quality System Assessment', level: 1, required: true, guidance: 'Vendor quality system review' },
      { id: 'vq-5', number: '5', title: 'Risk Assessment', level: 1, required: true, guidance: 'Vendor risk evaluation' },
      { id: 'vq-6', number: '6', title: 'Qualification Decision', level: 1, required: true, guidance: 'Approved/Conditional/Rejected' },
      { id: 'vq-7', number: '7', title: 'Conditions & Oversight', level: 1, required: false, guidance: 'Any conditions or ongoing oversight' },
    ]
  },
  {
    id: 'tpl-inspection-readiness',
    name: 'Regulatory Inspection Readiness Plan',
    description: 'Preparation plan for regulatory authority inspections',
    documentType: 'audit',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH E6(R2) / ICH Q10',
    estimatedHours: 40,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-audit',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'irp-1', number: '1', title: 'Inspection Overview', level: 1, required: true, guidance: 'Expected inspection type and scope' },
      { id: 'irp-2', number: '2', title: 'Key Personnel & Roles', level: 1, required: true, guidance: 'Inspection team assignments' },
      { id: 'irp-3', number: '3', title: 'Documentation Readiness', level: 1, required: true, guidance: 'Document availability and organization',
        subsections: [
          { id: 'irp-3-1', number: '3.1', title: 'Essential Documents', level: 2, required: true, guidance: 'Key documents for inspection' },
          { id: 'irp-3-2', number: '3.2', title: 'Gap Analysis', level: 2, required: true, guidance: 'Documentation gaps identified' },
        ]
      },
      { id: 'irp-4', number: '4', title: 'Mock Inspection Plan', level: 1, required: false, guidance: 'Pre-inspection rehearsal plan' },
      { id: 'irp-5', number: '5', title: 'Back Room Operations', level: 1, required: true, guidance: 'Support during inspection' },
      { id: 'irp-6', number: '6', title: 'Communication Plan', level: 1, required: true, guidance: 'Internal and external communications' },
      { id: 'irp-7', number: '7', title: 'Response Procedures', level: 1, required: true, guidance: 'How to handle findings during inspection' },
    ]
  },
];

// =============================================================================
// COMPLIANCE & SOP TEMPLATES  
// =============================================================================

export const COMPLIANCE_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-deviation-report',
    name: 'Deviation Report',
    description: 'Standard deviation documentation and investigation report',
    documentType: 'compliance',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q10',
    estimatedHours: 8,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'dev-1', number: '1', title: 'Deviation Description', level: 1, required: true, guidance: 'What, when, where, who discovered' },
      { id: 'dev-2', number: '2', title: 'Immediate Actions', level: 1, required: true, guidance: 'Actions taken to contain' },
      { id: 'dev-3', number: '3', title: 'Impact Assessment', level: 1, required: true, guidance: 'Product/patient/data impact' },
      { id: 'dev-4', number: '4', title: 'Root Cause Analysis', level: 1, required: true, guidance: 'Investigation findings', aiPrompt: 'Conduct root cause analysis using 5-why or fishbone methodology' },
      { id: 'dev-5', number: '5', title: 'CAPA', level: 1, required: true, guidance: 'Corrective and preventive actions' },
      { id: 'dev-6', number: '6', title: 'Effectiveness Check', level: 1, required: true, guidance: 'How CAPA effectiveness will be verified' },
    ]
  },
  {
    id: 'tpl-capa-report',
    name: 'CAPA Report',
    description: 'Corrective and Preventive Action documentation',
    documentType: 'compliance',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q10 / 21 CFR 820.100',
    estimatedHours: 12,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'capa-1', number: '1', title: 'CAPA Information', level: 1, required: true, guidance: 'CAPA ID, initiator, date' },
      { id: 'capa-2', number: '2', title: 'Problem Description', level: 1, required: true, guidance: 'Detailed problem statement' },
      { id: 'capa-3', number: '3', title: 'Root Cause Analysis', level: 1, required: true, guidance: 'Investigation methodology and findings' },
      { id: 'capa-4', number: '4', title: 'Corrective Actions', level: 1, required: true, guidance: 'Actions to correct the issue' },
      { id: 'capa-5', number: '5', title: 'Preventive Actions', level: 1, required: true, guidance: 'Actions to prevent recurrence' },
      { id: 'capa-6', number: '6', title: 'Implementation Plan', level: 1, required: true, guidance: 'Timeline and responsibilities' },
      { id: 'capa-7', number: '7', title: 'Effectiveness Verification', level: 1, required: true, guidance: 'How effectiveness will be measured' },
    ]
  },
  {
    id: 'tpl-change-control',
    name: 'Change Control Request',
    description: 'Documentation for proposed changes requiring formal control',
    documentType: 'compliance',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q10 / ICH Q12',
    estimatedHours: 16,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'cc-1', number: '1', title: 'Change Request Information', level: 1, required: true, guidance: 'Request ID, initiator, category' },
      { id: 'cc-2', number: '2', title: 'Current State', level: 1, required: true, guidance: 'Description of current process/product' },
      { id: 'cc-3', number: '3', title: 'Proposed Change', level: 1, required: true, guidance: 'Detailed change description' },
      { id: 'cc-4', number: '4', title: 'Justification', level: 1, required: true, guidance: 'Reason for the change' },
      { id: 'cc-5', number: '5', title: 'Impact Assessment', level: 1, required: true, guidance: 'Quality, regulatory, safety impacts',
        subsections: [
          { id: 'cc-5-1', number: '5.1', title: 'Quality Impact', level: 2, required: true, guidance: 'Impact on product quality' },
          { id: 'cc-5-2', number: '5.2', title: 'Regulatory Impact', level: 2, required: true, guidance: 'Filing requirements' },
          { id: 'cc-5-3', number: '5.3', title: 'Safety Impact', level: 2, required: true, guidance: 'Patient safety considerations' },
        ]
      },
      { id: 'cc-6', number: '6', title: 'Implementation Plan', level: 1, required: true, guidance: 'Steps to implement change' },
      { id: 'cc-7', number: '7', title: 'Approvals', level: 1, required: true, guidance: 'Required approvals' },
    ]
  },
  {
    id: 'tpl-quality-agreement',
    name: 'Quality Agreement',
    description: 'Quality agreement between sponsor and service provider',
    documentType: 'compliance',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: 'ICH Q10 / EU GMP Annex 16',
    estimatedHours: 24,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'qa-1', number: '1', title: 'Parties and Scope', level: 1, required: true, guidance: 'Contract parties and services covered' },
      { id: 'qa-2', number: '2', title: 'Responsibilities', level: 1, required: true, guidance: 'Detailed responsibility matrix' },
      { id: 'qa-3', number: '3', title: 'Quality Requirements', level: 1, required: true, guidance: 'Quality standards and specifications' },
      { id: 'qa-4', number: '4', title: 'Change Control', level: 1, required: true, guidance: 'Change notification requirements' },
      { id: 'qa-5', number: '5', title: 'Deviations & CAPA', level: 1, required: true, guidance: 'Deviation handling procedures' },
      { id: 'qa-6', number: '6', title: 'Audit Rights', level: 1, required: true, guidance: 'Audit access and frequency' },
      { id: 'qa-7', number: '7', title: 'Communication', level: 1, required: true, guidance: 'Contacts and escalation' },
      { id: 'qa-8', number: '8', title: 'Term and Termination', level: 1, required: true, guidance: 'Agreement duration and exit' },
    ]
  },
  {
    id: 'tpl-annual-product-review',
    name: 'Annual Product Review (APR)',
    description: 'Annual quality review of commercial product',
    documentType: 'compliance',
    ctdModule: 'N/A',
    version: '1.0',
    ichGuideline: '21 CFR 211.180(e) / ICH Q10',
    estimatedHours: 40,
    applicableRegions: ['US', 'EU', 'JP', 'CN', 'CA', 'AU', 'GB', 'GLOBAL'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'apr-1', number: '1', title: 'Product Information', level: 1, required: true, guidance: 'Product details and review period' },
      { id: 'apr-2', number: '2', title: 'Batch Summary', level: 1, required: true, guidance: 'All batches manufactured in period' },
      { id: 'apr-3', number: '3', title: 'Quality Data Trending', level: 1, required: true, guidance: 'In-process and release testing trends' },
      { id: 'apr-4', number: '4', title: 'Stability Summary', level: 1, required: true, guidance: 'Stability data review' },
      { id: 'apr-5', number: '5', title: 'Complaints & Recalls', level: 1, required: true, guidance: 'Customer complaints and any recalls' },
      { id: 'apr-6', number: '6', title: 'Deviations & CAPA', level: 1, required: true, guidance: 'Deviations and CAPA summary' },
      { id: 'apr-7', number: '7', title: 'Changes', level: 1, required: true, guidance: 'Changes implemented in period' },
      { id: 'apr-8', number: '8', title: 'Conclusions & Recommendations', level: 1, required: true, guidance: 'Overall assessment and actions', aiPrompt: 'Summarize annual product performance and recommend quality improvements' },
    ]
  },
];

// =============================================================================
// EXPORT ALL TEMPLATES
// =============================================================================

export const PHASE3_EXPANSION_TEMPLATES: DocumentTemplate[] = [
  ...REGULATORY_STRATEGY_TEMPLATES,
  ...AUDIT_INSPECTION_TEMPLATES,
  ...COMPLIANCE_TEMPLATES,
];

export default PHASE3_EXPANSION_TEMPLATES;
