
// =============================================================================
// eCTD SEQUENCE TEMPLATE TYPES - v0.9.17a
// =============================================================================
// Type definitions for reusable sequence templates that pre-populate submission
// structures. Includes built-in templates for common US and EU submissions.
// =============================================================================

import type { CTDModule, ECTDFileType, LifecycleOperation, SequenceType, RegionalSubmissionType } from './ectd-publishing-types';
import type { RegulatoryRegion } from './ectd-regional-types';

// -----------------------------------------------------------------------------
// TEMPLATE TYPES
// -----------------------------------------------------------------------------

/** Document placeholder within a template section */
export interface DocumentPlaceholder {
  id: string;
  title: string;
  suggestedFileName: string;
  fileType: ECTDFileType;
  isRequired: boolean;
  defaultOperation: LifecycleOperation;
  description?: string;
}

/** Section within a template module */
export interface TemplateSection {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  isRequired: boolean;
  documentPlaceholders: DocumentPlaceholder[];
  subsections?: TemplateSection[];
}

/** Module within a template */
export interface TemplateModule {
  id: string;
  moduleId: CTDModule;
  included: boolean;
  sections: TemplateSection[];
}

/** Sequence template - reusable submission structure */
export interface SequenceTemplate {
  id: string;
  name: string;
  description: string;
  region: RegulatoryRegion;
  sequenceType: SequenceType;
  submissionTypes: RegionalSubmissionType[];
  modules: TemplateModule[];
  isBuiltIn: boolean;
  isDefault?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// -----------------------------------------------------------------------------
// ID GENERATORS
// -----------------------------------------------------------------------------

export const generateTemplateId = {
  template: () => `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  module: () => `tmod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  section: () => `tsec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  placeholder: () => `tph_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function createPlaceholder(
  title: string,
  fileName: string,
  isRequired: boolean = true,
  operation: LifecycleOperation = 'new'
): DocumentPlaceholder {
  return {
    id: generateTemplateId.placeholder(),
    title,
    suggestedFileName: fileName,
    fileType: 'pdf',
    isRequired,
    defaultOperation: operation,
  };
}

function createSection(
  number: string,
  title: string,
  isRequired: boolean,
  placeholders: DocumentPlaceholder[] = [],
  subsections?: TemplateSection[]
): TemplateSection {
  return {
    id: generateTemplateId.section(),
    sectionNumber: number,
    sectionTitle: title,
    isRequired,
    documentPlaceholders: placeholders,
    subsections,
  };
}

function createModule(moduleId: CTDModule, sections: TemplateSection[], included: boolean = true): TemplateModule {
  return {
    id: generateTemplateId.module(),
    moduleId,
    included,
    sections,
  };
}

// -----------------------------------------------------------------------------
// BUILT-IN TEMPLATES
// -----------------------------------------------------------------------------

/** US NDA Original Submission - Full CTD structure */
export const US_NDA_ORIGINAL_TEMPLATE: SequenceTemplate = {
  id: 'tmpl_builtin_us_nda_original',
  name: 'US NDA Original Submission',
  description: 'Complete CTD structure for initial NDA submission to FDA. Includes all five modules with standard document placeholders.',
  region: 'US',
  sequenceType: 'original',
  submissionTypes: ['nda', 'bla'],
  isBuiltIn: true,
  isDefault: true,
  tags: ['fda', 'original', 'complete'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [
    createModule('m1', [
      createSection('1.1', 'Forms', true, [
        createPlaceholder('Form FDA 356h', '356h.pdf'),
        createPlaceholder('Form FDA 1571', '1571.pdf', false),
      ]),
      createSection('1.2', 'Cover Letter', true, [
        createPlaceholder('Cover Letter', 'cover-letter.pdf'),
      ]),
      createSection('1.3', 'Administrative Information', true, [
        createPlaceholder('Contact Information', 'contact-info.pdf'),
        createPlaceholder('Debarment Certification', 'debarment-cert.pdf'),
        createPlaceholder('Financial Certification', 'financial-cert.pdf'),
      ]),
      createSection('1.14', 'Labeling', true, [
        createPlaceholder('Draft Package Insert', 'package-insert.pdf'),
        createPlaceholder('Patient Labeling', 'patient-labeling.pdf', false),
      ]),
    ]),
    createModule('m2', [
      createSection('2.2', 'CTD Introduction', true, [
        createPlaceholder('Introduction', 'introduction.pdf'),
      ]),
      createSection('2.3', 'Quality Overall Summary', true, [
        createPlaceholder('Quality Overall Summary', 'qos.pdf'),
      ]),
      createSection('2.4', 'Nonclinical Overview', true, [
        createPlaceholder('Nonclinical Overview', 'nonclinical-overview.pdf'),
      ]),
      createSection('2.5', 'Clinical Overview', true, [
        createPlaceholder('Clinical Overview', 'clinical-overview.pdf'),
      ]),
      createSection('2.7', 'Clinical Summary', true, [
        createPlaceholder('Summary of Clinical Efficacy', 'clinical-efficacy-summary.pdf'),
        createPlaceholder('Summary of Clinical Safety', 'clinical-safety-summary.pdf'),
      ]),
    ]),
    createModule('m3', [
      createSection('3.2.S', 'Drug Substance', true, [
        createPlaceholder('Drug Substance Information', 'drug-substance.pdf'),
      ]),
      createSection('3.2.P', 'Drug Product', true, [
        createPlaceholder('Drug Product Information', 'drug-product.pdf'),
      ]),
    ]),
    createModule('m4', [
      createSection('4.2.1', 'Pharmacology', true, [
        createPlaceholder('Pharmacology Studies', 'pharmacology.pdf'),
      ]),
      createSection('4.2.3', 'Toxicology', true, [
        createPlaceholder('Toxicology Studies', 'toxicology.pdf'),
      ]),
    ]),
    createModule('m5', [
      createSection('5.3.5', 'Efficacy and Safety Studies', true, [
        createPlaceholder('Pivotal Study Report', 'pivotal-study.pdf'),
      ]),
    ]),
  ],
};

/** US NDA Amendment - Focused structure for supplements */
export const US_NDA_AMENDMENT_TEMPLATE: SequenceTemplate = {
  id: 'tmpl_builtin_us_nda_amendment',
  name: 'US NDA Amendment/Supplement',
  description: 'Streamlined structure for NDA supplements and amendments. Pre-configured for changes affecting specific modules.',
  region: 'US',
  sequenceType: 'amendment',
  submissionTypes: ['nda-supplement', 'bla-supplement', 'ind-amendment'],
  isBuiltIn: true,
  tags: ['fda', 'amendment', 'supplement'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [
    createModule('m1', [
      createSection('1.1', 'Forms', true, [
        createPlaceholder('Form FDA 356h', '356h.pdf'),
      ]),
      createSection('1.2', 'Cover Letter', true, [
        createPlaceholder('Cover Letter', 'cover-letter.pdf'),
      ]),
    ]),
    createModule('m2', [
      createSection('2.3', 'Quality Overall Summary', false, [
        createPlaceholder('Updated QOS', 'qos-updated.pdf', false, 'replace'),
      ]),
    ], false),
    createModule('m3', [], false),
    createModule('m4', [], false),
    createModule('m5', [], false),
  ],
};

/** EU MAA Original - Full structure with EU M1 specifics */
export const EU_MAA_ORIGINAL_TEMPLATE: SequenceTemplate = {
  id: 'tmpl_builtin_eu_maa_original',
  name: 'EU MAA Original Application',
  description: 'Complete CTD structure for initial MAA submission to EMA. Includes EU-specific Module 1 requirements.',
  region: 'EU',
  sequenceType: 'original',
  submissionTypes: ['maa'],
  isBuiltIn: true,
  isDefault: true,
  tags: ['ema', 'original', 'complete'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [
    createModule('m1', [
      createSection('1.0', 'Cover Letter', true, [
        createPlaceholder('Cover Letter', 'cover-letter.pdf'),
      ]),
      createSection('1.2', 'Application Form', true, [
        createPlaceholder('EU Application Form', 'eu-application-form.pdf'),
      ]),
      createSection('1.3', 'Product Information', true, [
        createPlaceholder('SmPC', 'smpc.pdf'),
        createPlaceholder('Package Leaflet', 'package-leaflet.pdf'),
        createPlaceholder('Labelling Text', 'labelling.pdf'),
      ]),
      createSection('1.4', 'Expert Reports', true, [
        createPlaceholder('Quality Expert Report', 'quality-expert.pdf', false),
        createPlaceholder('Nonclinical Expert Report', 'nonclinical-expert.pdf', false),
        createPlaceholder('Clinical Expert Report', 'clinical-expert.pdf', false),
      ]),
    ]),
    createModule('m2', [
      createSection('2.2', 'CTD Introduction', true, [
        createPlaceholder('Introduction', 'introduction.pdf'),
      ]),
      createSection('2.3', 'Quality Overall Summary', true, [
        createPlaceholder('Quality Overall Summary', 'qos.pdf'),
      ]),
      createSection('2.5', 'Clinical Overview', true, [
        createPlaceholder('Clinical Overview', 'clinical-overview.pdf'),
      ]),
    ]),
    createModule('m3', [
      createSection('3.2.S', 'Drug Substance', true, []),
      createSection('3.2.P', 'Drug Product', true, []),
    ]),
    createModule('m4', [
      createSection('4.2', 'Study Reports', true, []),
    ]),
    createModule('m5', [
      createSection('5.3', 'Clinical Study Reports', true, []),
    ]),
  ],
};

/** Response to HAQ - Minimal structure for agency responses */
export const RESPONSE_TO_HAQ_TEMPLATE: SequenceTemplate = {
  id: 'tmpl_builtin_haq_response',
  name: 'Response to Agency Questions (HAQ/IR)',
  description: 'Minimal structure for responding to Health Authority Questions or Information Requests. Focus on cover letter and affected sections.',
  region: 'US',
  sequenceType: 'response',
  submissionTypes: ['nda', 'bla', 'anda', 'ind', 'maa'],
  isBuiltIn: true,
  tags: ['haq', 'response', 'ir', 'questions'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [
    createModule('m1', [
      createSection('1.2', 'Cover Letter', true, [
        createPlaceholder('Response Cover Letter', 'response-cover-letter.pdf'),
      ]),
      createSection('1.5', 'Application Status', false, [
        createPlaceholder('Response Document', 'haq-response.pdf'),
      ]),
    ]),
    createModule('m2', [], false),
    createModule('m3', [], false),
    createModule('m4', [], false),
    createModule('m5', [], false),
  ],
};

/** All built-in templates */
export const BUILT_IN_TEMPLATES: SequenceTemplate[] = [
  US_NDA_ORIGINAL_TEMPLATE,
  US_NDA_AMENDMENT_TEMPLATE,
  EU_MAA_ORIGINAL_TEMPLATE,
  RESPONSE_TO_HAQ_TEMPLATE,
];

/** Get default template for a region */
export function getDefaultTemplateForRegion(region: RegulatoryRegion): SequenceTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.region === region && t.isDefault);
}

/** Get templates matching submission type */
export function getTemplatesForSubmissionType(submissionType: RegionalSubmissionType): SequenceTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.submissionTypes.includes(submissionType));
}
