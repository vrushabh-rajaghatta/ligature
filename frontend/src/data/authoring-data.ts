// Authoring Module Mock Data

import {
  AuthoringDocument,
  DocumentTemplate,
  ReviewWorkflow,
  ComponentLibraryItem,
  PendingReview,
  DocumentHistoryEntry,
  DocumentSection,
  Prerequisite,
  DocumentType,
  DocumentStatus,
  SectionStatus,
} from '@/types/authoring';

// Import comprehensive eCTD templates
import { ECTD_DOCUMENT_TEMPLATES } from './ectd-document-templates';

// ============================================================================
// REVIEW WORKFLOWS
// ============================================================================

export const reviewWorkflows: ReviewWorkflow[] = [
  {
    id: 'wf-default-4stage',
    name: 'Standard 4-Stage Review',
    description: 'Default workflow: Peer → Cross-Functional → QC → Final',
    documentTypes: ['protocol', 'ib', 'csr', 'module-25', 'module-27'],
    isDefault: true,
    stages: [
      {
        id: 'stage-peer',
        name: 'Peer Review',
        order: 1,
        requiredRoles: ['medical-writer', 'clinical-lead'],
        optionalRoles: [],
        durationDays: 3,
        requireAllApprovals: true,
        allowParallelReview: false,
        actions: ['approve', 'request-revision'],
      },
      {
        id: 'stage-cf',
        name: 'Cross-Functional Review',
        order: 2,
        requiredRoles: ['clinical-scientist', 'biostatistician', 'safety-physician'],
        optionalRoles: ['clin-pharm-md', 'cmc-lead', 'regulatory-lead'],
        durationDays: 7,
        requireAllApprovals: true,
        allowParallelReview: true,
        actions: ['approve', 'approve-with-comments', 'request-revision'],
      },
      {
        id: 'stage-qc',
        name: 'QC Review',
        order: 3,
        requiredRoles: ['qc-specialist'],
        optionalRoles: [],
        durationDays: 5,
        requireAllApprovals: true,
        allowParallelReview: false,
        actions: ['approve', 'request-revision'],
      },
      {
        id: 'stage-final',
        name: 'Final Approval',
        order: 4,
        requiredRoles: ['regulatory-lead', 'medical-director'],
        optionalRoles: [],
        durationDays: 3,
        requireAllApprovals: true,
        allowParallelReview: false,
        actions: ['approve', 'reject'],
      },
    ],
  },
  {
    id: 'wf-expedited',
    name: 'Expedited Review',
    description: 'Fast-track: Peer → Combined Review → Final',
    documentTypes: ['protocol', 'ib'],
    isDefault: false,
    stages: [
      {
        id: 'stage-peer-exp',
        name: 'Peer Review',
        order: 1,
        requiredRoles: ['medical-writer', 'clinical-lead'],
        optionalRoles: [],
        durationDays: 2,
        requireAllApprovals: true,
        allowParallelReview: false,
        actions: ['approve', 'request-revision'],
      },
      {
        id: 'stage-combined',
        name: 'Combined Review',
        order: 2,
        requiredRoles: ['clinical-scientist', 'qc-specialist'],
        optionalRoles: ['safety-physician', 'biostatistician'],
        durationDays: 5,
        requireAllApprovals: true,
        allowParallelReview: true,
        actions: ['approve', 'approve-with-comments', 'request-revision'],
      },
      {
        id: 'stage-final-exp',
        name: 'Final Approval',
        order: 3,
        requiredRoles: ['regulatory-lead'],
        optionalRoles: ['medical-director'],
        durationDays: 2,
        requireAllApprovals: false,
        allowParallelReview: false,
        actions: ['approve', 'reject'],
      },
    ],
  },
];

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'tmpl-protocol-v3',
    name: 'Clinical Study Protocol (ICH E6 R2)',
    description: 'Standard protocol template compliant with ICH E6 R2 guidelines',
    documentType: 'protocol',
    version: '3.0',
    sections: [
      { id: 'ts-1', number: '1', title: 'Title Page', level: 1, required: true, guidance: 'Include protocol title, protocol number, sponsor name, and version information' },
      { id: 'ts-2', number: '2', title: 'Synopsis', level: 1, required: true, guidance: 'Provide a concise summary of the protocol' },
      { id: 'ts-3', number: '3', title: 'Table of Contents', level: 1, required: true, guidance: 'Auto-generated' },
      { id: 'ts-4', number: '4', title: 'List of Abbreviations', level: 1, required: true, guidance: 'Define all abbreviations used in the protocol' },
      { id: 'ts-5', number: '5', title: 'Ethics', level: 1, required: true, guidance: 'IRB/IEC requirements, informed consent process' },
      { id: 'ts-6', number: '6', title: 'Introduction and Rationale', level: 1, required: true, guidance: 'Background on disease, unmet need, and rationale for study' },
      { id: 'ts-7', number: '7', title: 'Study Objectives', level: 1, required: true, guidance: 'Primary and secondary objectives clearly stated' },
      { id: 'ts-8', number: '8', title: 'Study Design', level: 1, required: true, guidance: 'Overall design, randomization, blinding, duration' },
      { id: 'ts-9', number: '9', title: 'Study Population', level: 1, required: true, guidance: 'Inclusion/exclusion criteria, withdrawal criteria' },
      { id: 'ts-10', number: '10', title: 'Study Treatment', level: 1, required: true, guidance: 'Investigational product, dosing, administration' },
      { id: 'ts-11', number: '11', title: 'Study Procedures', level: 1, required: true, guidance: 'Schedule of assessments, procedures by visit' },
      { id: 'ts-12', number: '12', title: 'Efficacy Assessments', level: 1, required: true, guidance: 'Primary and secondary endpoints, assessment methods' },
      { id: 'ts-13', number: '13', title: 'Safety Assessments', level: 1, required: true, guidance: 'AE reporting, safety monitoring, stopping rules' },
      { id: 'ts-14', number: '14', title: 'Statistics', level: 1, required: true, guidance: 'Sample size, analysis populations, statistical methods' },
      { id: 'ts-15', number: '15', title: 'Data Management', level: 1, required: true, guidance: 'Data collection, quality control, database' },
      { id: 'ts-16', number: '16', title: 'References', level: 1, required: true, guidance: 'Literature citations' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 120,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    applicableStudyPhases: ['Phase 1', 'Phase 2', 'Phase 3'],
    isDefault: true,
    usageCount: 45,
    createdAt: '2023-01-15',
    updatedAt: '2024-06-01',
  },
  {
    id: 'tmpl-ib-v2',
    name: "Investigator's Brochure (ICH E7)",
    description: 'Standard IB template per ICH E7 guidelines',
    documentType: 'ib',
    version: '2.0',
    sections: [
      { id: 'tib-1', number: '1', title: 'Title Page', level: 1, required: true, guidance: 'Product name, edition number, release date' },
      { id: 'tib-2', number: '2', title: 'Confidentiality Statement', level: 1, required: true, guidance: 'Standard confidentiality language' },
      { id: 'tib-3', number: '3', title: 'Table of Contents', level: 1, required: true, guidance: 'Auto-generated' },
      { id: 'tib-4', number: '4', title: 'Summary', level: 1, required: true, guidance: 'Brief overview of product and key data' },
      { id: 'tib-5', number: '5', title: 'Introduction', level: 1, required: true, guidance: 'Product background, therapeutic rationale' },
      { id: 'tib-6', number: '6', title: 'Physical, Chemical, Pharmaceutical Properties', level: 1, required: true, guidance: 'Drug substance and drug product information' },
      { id: 'tib-7', number: '7', title: 'Nonclinical Studies', level: 1, required: true, guidance: 'Pharmacology, PK, toxicology summaries' },
      { id: 'tib-8', number: '8', title: 'Effects in Humans', level: 1, required: true, guidance: 'Clinical pharmacology, efficacy, safety' },
      { id: 'tib-9', number: '9', title: 'Summary of Data and Guidance for Investigator', level: 1, required: true, guidance: 'Integrated summary and practical guidance' },
      { id: 'tib-10', number: '10', title: 'References', level: 1, required: true, guidance: 'Literature citations' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    isDefault: true,
    usageCount: 38,
    createdAt: '2023-03-20',
    updatedAt: '2024-04-15',
  },
  {
    id: 'tmpl-csr-e3',
    name: 'Clinical Study Report (ICH E3)',
    description: 'Complete CSR template per ICH E3 guidelines',
    documentType: 'csr',
    version: '1.0',
    sections: [
      { id: 'tcsr-1', number: '1', title: 'Title Page', level: 1, required: true, guidance: 'Study identification, sponsor, dates' },
      { id: 'tcsr-2', number: '2', title: 'Synopsis', level: 1, required: true, guidance: 'Structured summary of study and results' },
      { id: 'tcsr-3', number: '3', title: 'Table of Contents', level: 1, required: true, guidance: 'Auto-generated with hyperlinks' },
      { id: 'tcsr-4', number: '4', title: 'List of Abbreviations', level: 1, required: true, guidance: 'All abbreviations defined' },
      { id: 'tcsr-5', number: '5', title: 'Ethics', level: 1, required: true, guidance: 'IRB/IEC approvals, informed consent' },
      { id: 'tcsr-6', number: '6', title: 'Investigators and Study Administrative Structure', level: 1, required: true, guidance: 'Sites, investigators, organization' },
      { id: 'tcsr-7', number: '7', title: 'Introduction', level: 1, required: true, guidance: 'Background and rationale' },
      { id: 'tcsr-8', number: '8', title: 'Study Objectives', level: 1, required: true, guidance: 'Primary and secondary objectives' },
      { id: 'tcsr-9', number: '9', title: 'Investigational Plan', level: 1, required: true, guidance: 'Study design, selection of patients, treatments' },
      { id: 'tcsr-10', number: '10', title: 'Study Patients', level: 1, required: true, guidance: 'Disposition, protocol deviations, demographics' },
      { id: 'tcsr-11', number: '11', title: 'Efficacy Evaluation', level: 1, required: true, guidance: 'Analysis sets, efficacy results, subgroups' },
      { id: 'tcsr-12', number: '12', title: 'Safety Evaluation', level: 1, required: true, guidance: 'Exposure, AEs, deaths, labs, vital signs' },
      { id: 'tcsr-13', number: '13', title: 'Discussion and Conclusions', level: 1, required: true, guidance: 'Interpretation of results, benefit-risk' },
      { id: 'tcsr-14', number: '14', title: 'Tables and Figures', level: 1, required: true, guidance: 'All in-text tables and figures' },
      { id: 'tcsr-15', number: '15', title: 'References', level: 1, required: true, guidance: 'Literature citations' },
      { id: 'tcsr-16', number: '16', title: 'Appendices', level: 1, required: true, guidance: 'Protocol, CRFs, TFLs, datasets, narratives' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 200,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    applicableStudyPhases: ['Phase 1', 'Phase 2', 'Phase 3'],
    isDefault: true,
    usageCount: 28,
    createdAt: '2023-02-10',
    updatedAt: '2024-05-20',
  },
  // Module 2.4 Nonclinical Overview
  {
    id: 'tmpl-m24-v1',
    name: 'Module 2.4 Nonclinical Overview',
    description: 'CTD Module 2.4 nonclinical overview template',
    documentType: 'module-24',
    version: '1.0',
    sections: [
      { id: 'm24-1', number: '2.4.1', title: 'Overview of Nonclinical Testing Strategy', level: 1, required: true, guidance: 'Describe overall nonclinical development strategy and rationale' },
      { id: 'm24-2', number: '2.4.2', title: 'Pharmacology', level: 1, required: true, guidance: 'Summary of primary and secondary pharmacodynamics, safety pharmacology' },
      { id: 'm24-3', number: '2.4.3', title: 'Pharmacokinetics', level: 1, required: true, guidance: 'Summary of absorption, distribution, metabolism, excretion' },
      { id: 'm24-4', number: '2.4.4', title: 'Toxicology', level: 1, required: true, guidance: 'Summary of toxicology studies, NOAEL, target organs' },
      { id: 'm24-5', number: '2.4.5', title: 'Integrated Overview and Conclusions', level: 1, required: true, guidance: 'Integration of nonclinical findings, implications for clinical use' },
      { id: 'm24-6', number: '2.4.6', title: 'Literature References', level: 1, required: true, guidance: 'References to published literature' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 60,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    isDefault: true,
    usageCount: 12,
    createdAt: '2023-05-01',
    updatedAt: '2024-03-15',
  },
  // Module 2.6 Nonclinical Written & Tabulated Summaries
  {
    id: 'tmpl-m26-v1',
    name: 'Module 2.6 Nonclinical Summary',
    description: 'CTD Module 2.6 nonclinical written and tabulated summaries',
    documentType: 'module-26',
    version: '1.0',
    sections: [
      { id: 'm26-1', number: '2.6.1', title: 'Introduction', level: 1, required: true, guidance: 'Brief introduction to nonclinical development program' },
      { id: 'm26-2', number: '2.6.2', title: 'Pharmacology Written Summary', level: 1, required: true, guidance: 'Detailed pharmacology summary with tables' },
      { id: 'm26-3', number: '2.6.3', title: 'Pharmacology Tabulated Summary', level: 1, required: true, guidance: 'Tabulated pharmacology study data' },
      { id: 'm26-4', number: '2.6.4', title: 'Pharmacokinetics Written Summary', level: 1, required: true, guidance: 'Detailed PK summary with tables' },
      { id: 'm26-5', number: '2.6.5', title: 'Pharmacokinetics Tabulated Summary', level: 1, required: true, guidance: 'Tabulated PK study data' },
      { id: 'm26-6', number: '2.6.6', title: 'Toxicology Written Summary', level: 1, required: true, guidance: 'Detailed toxicology summary' },
      { id: 'm26-7', number: '2.6.7', title: 'Toxicology Tabulated Summary', level: 1, required: true, guidance: 'Tabulated toxicology study data' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 100,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    isDefault: true,
    usageCount: 10,
    createdAt: '2023-05-01',
    updatedAt: '2024-03-15',
  },
  // Module 3.2.S Drug Substance - Full ICH M4Q(R1) Granularity
  {
    id: 'tmpl-m32s-v1',
    name: 'Module 3.2.S Drug Substance',
    description: 'CTD Module 3.2.S drug substance quality documentation per ICH M4Q(R1)',
    documentType: 'module-32s',
    version: '2.0',
    sections: [
      { 
        id: 'm32s-1', 
        number: '3.2.S.1', 
        title: 'General Information', 
        level: 1, 
        required: true, 
        guidance: 'Nomenclature, structure, general properties',
        subsections: [
          { id: 'm32s-1-1', number: '3.2.S.1.1', title: 'Nomenclature', level: 2, required: true, guidance: 'INN (recommended/proposed), USAN, BAN, JAN, chemical name(s), company/laboratory code, CAS registry number' },
          { id: 'm32s-1-2', number: '3.2.S.1.2', title: 'Structure', level: 2, required: true, guidance: 'Structural formula including relative and absolute stereochemistry, molecular formula, molecular weight. For biotech: schematic amino acid sequence, glycoform' },
          { id: 'm32s-1-3', number: '3.2.S.1.3', title: 'General Properties', level: 2, required: true, guidance: 'Physical form, color, solubility profile, pH, pKa, partition coefficients, melting point, hygroscopicity, polymorphism. For biotech: biological activity, immunochemical properties' },
        ],
      },
      { 
        id: 'm32s-2', 
        number: '3.2.S.2', 
        title: 'Manufacture', 
        level: 1, 
        required: true, 
        guidance: 'Manufacturer, description of process, process controls, process validation',
        subsections: [
          { id: 'm32s-2-1', number: '3.2.S.2.1', title: 'Manufacturer(s)', level: 2, required: true, guidance: 'Name, address, responsibility of each manufacturer including contractors, site master file reference' },
          { id: 'm32s-2-2', number: '3.2.S.2.2', title: 'Description of Manufacturing Process and Process Controls', level: 2, required: true, guidance: 'Flow diagram, narrative description, starting material definition per ICH Q11, critical steps, IPCs, equipment' },
          { id: 'm32s-2-3', number: '3.2.S.2.3', title: 'Control of Materials', level: 2, required: true, guidance: 'Specifications for starting materials, reagents, solvents, catalysts. Source/quality of biological materials' },
          { id: 'm32s-2-4', number: '3.2.S.2.4', title: 'Controls of Critical Steps and Intermediates', level: 2, required: true, guidance: 'Critical step tests and acceptance criteria, isolated intermediate specifications' },
          { id: 'm32s-2-5', number: '3.2.S.2.5', title: 'Process Validation and/or Evaluation', level: 2, required: true, guidance: 'Process validation protocol/evaluation studies per ICH Q11' },
          { id: 'm32s-2-6', number: '3.2.S.2.6', title: 'Manufacturing Process Development', level: 2, required: true, guidance: 'Significant changes during development, QbD elements, design space per ICH Q8/Q11' },
        ],
      },
      { 
        id: 'm32s-3', 
        number: '3.2.S.3', 
        title: 'Characterisation', 
        level: 1, 
        required: true, 
        guidance: 'Elucidation of structure, impurities',
        subsections: [
          { id: 'm32s-3-1', number: '3.2.S.3.1', title: 'Elucidation of Structure and other Characteristics', level: 2, required: true, guidance: 'Structure confirmation via synthetic route and spectral analyses (IR, UV, NMR, MS). Isomerism, polymorphism. For biotech: amino acid sequence, higher-order structure' },
          { id: 'm32s-3-2', number: '3.2.S.3.2', title: 'Impurities', level: 2, required: true, guidance: 'Process-related and drug-related impurities per ICH Q3A. Residual solvents (Q3C), elemental impurities (Q3D), genotoxic impurities (M7). Include impurity table with structures' },
        ],
      },
      { 
        id: 'm32s-4', 
        number: '3.2.S.4', 
        title: 'Control of Drug Substance', 
        level: 1, 
        required: true, 
        guidance: 'Specification, analytical procedures, validation, batch analyses',
        subsections: [
          { id: 'm32s-4-1', number: '3.2.S.4.1', title: 'Specification', level: 2, required: true, guidance: 'Specification table with tests, procedures, acceptance criteria per ICH Q6A/Q6B' },
          { id: 'm32s-4-2', number: '3.2.S.4.2', title: 'Analytical Procedures', level: 2, required: true, guidance: 'Detailed description of analytical procedures, pharmacopoeial references' },
          { id: 'm32s-4-3', number: '3.2.S.4.3', title: 'Validation of Analytical Procedures', level: 2, required: true, guidance: 'Validation data per ICH Q2(R1): specificity, linearity, range, accuracy, precision, LOD, LOQ, robustness' },
          { id: 'm32s-4-4', number: '3.2.S.4.4', title: 'Batch Analyses', level: 2, required: true, guidance: 'Batch analysis data for clinical, stability, and commercial-scale batches' },
          { id: 'm32s-4-5', number: '3.2.S.4.5', title: 'Justification of Specification', level: 2, required: true, guidance: 'Justification for each test and acceptance criterion based on development and stability data' },
        ],
      },
      { id: 'm32s-5', number: '3.2.S.5', title: 'Reference Standards or Materials', level: 1, required: true, guidance: 'Source, characterisation, and qualification of primary and working reference standards' },
      { id: 'm32s-6', number: '3.2.S.6', title: 'Container Closure System', level: 1, required: true, guidance: 'Description of container closure system, specifications, suitability for storage/shipping' },
      { 
        id: 'm32s-7', 
        number: '3.2.S.7', 
        title: 'Stability', 
        level: 1, 
        required: true, 
        guidance: 'Stability summary, post-approval stability protocol, stability data',
        subsections: [
          { id: 'm32s-7-1', number: '3.2.S.7.1', title: 'Stability Summary and Conclusions', level: 2, required: true, guidance: 'Summary of stability studies per ICH Q1A-E, degradation pathways, proposed retest period/shelf life' },
          { id: 'm32s-7-2', number: '3.2.S.7.2', title: 'Post-approval Stability Protocol and Stability Commitment', level: 2, required: true, guidance: 'Commitment to place production batches on stability' },
          { id: 'm32s-7-3', number: '3.2.S.7.3', title: 'Stability Data', level: 2, required: true, guidance: 'Tabulated stability data and graphical presentations' },
        ],
      },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 120,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    isDefault: true,
    usageCount: 15,
    createdAt: '2023-04-01',
    updatedAt: '2026-01-26',
  },
  // Module 3.2.P Drug Product - Full ICH M4Q(R1) Granularity
  {
    id: 'tmpl-m32p-v1',
    name: 'Module 3.2.P Drug Product',
    description: 'CTD Module 3.2.P drug product quality documentation per ICH M4Q(R1)',
    documentType: 'module-32p',
    version: '2.0',
    sections: [
      { id: 'm32p-1', number: '3.2.P.1', title: 'Description and Composition of the Drug Product', level: 1, required: true, guidance: 'Description of dosage form, quantitative composition including overages, container closure type' },
      { 
        id: 'm32p-2', 
        number: '3.2.P.2', 
        title: 'Pharmaceutical Development', 
        level: 1, 
        required: true, 
        guidance: 'Development rationale for formulation and process design per ICH Q8(R2)',
        subsections: [
          { 
            id: 'm32p-2-1', 
            number: '3.2.P.2.1', 
            title: 'Components of the Drug Product', 
            level: 2, 
            required: true, 
            guidance: 'Compatibility and rationale for component selection',
            subsections: [
              { id: 'm32p-2-1-1', number: '3.2.P.2.1.1', title: 'Drug Substance', level: 3, required: true, guidance: 'Physicochemical properties relevant to drug product performance (polymorphism, solubility, particle size, etc.)' },
              { id: 'm32p-2-1-2', number: '3.2.P.2.1.2', title: 'Excipients', level: 3, required: true, guidance: 'Choice and function of excipients, compatibility studies, novel excipient information' },
            ],
          },
          { 
            id: 'm32p-2-2', 
            number: '3.2.P.2.2', 
            title: 'Drug Product', 
            level: 2, 
            required: true, 
            guidance: 'Formulation development studies',
            subsections: [
              { id: 'm32p-2-2-1', number: '3.2.P.2.2.1', title: 'Formulation Development', level: 3, required: true, guidance: 'Evolution of formulation, CQAs, design space per ICH Q8, final formulation rationale' },
              { id: 'm32p-2-2-2', number: '3.2.P.2.2.2', title: 'Overages', level: 3, required: false, guidance: 'Justification for any overage of drug substance or excipients' },
              { id: 'm32p-2-2-3', number: '3.2.P.2.2.3', title: 'Physicochemical and Biological Properties', level: 3, required: true, guidance: 'Properties relevant to performance (pH, dissolution, particle size, aggregation, etc.)' },
            ],
          },
          { id: 'm32p-2-3', number: '3.2.P.2.3', title: 'Manufacturing Process Development', level: 2, required: true, guidance: 'Selection and optimization of manufacturing process, CPPs, design space, control strategy' },
          { id: 'm32p-2-4', number: '3.2.P.2.4', title: 'Container Closure System', level: 2, required: true, guidance: 'Rationale for container closure selection, suitability studies' },
          { id: 'm32p-2-5', number: '3.2.P.2.5', title: 'Microbiological Attributes', level: 2, required: true, guidance: 'Microbiological quality: sterility/bioburden, preservative effectiveness' },
          { id: 'm32p-2-6', number: '3.2.P.2.6', title: 'Compatibility', level: 2, required: false, guidance: 'Compatibility with reconstitution diluents, dosage devices, or other products' },
        ],
      },
      { 
        id: 'm32p-3', 
        number: '3.2.P.3', 
        title: 'Manufacture', 
        level: 1, 
        required: true, 
        guidance: 'Manufacturer, batch formula, process description, process controls',
        subsections: [
          { id: 'm32p-3-1', number: '3.2.P.3.1', title: 'Manufacturer(s)', level: 2, required: true, guidance: 'Name, address, responsibility of each manufacturer, manufacturing authorisation numbers' },
          { id: 'm32p-3-2', number: '3.2.P.3.2', title: 'Batch Formula', level: 2, required: true, guidance: 'Batch formula for proposed commercial batch size' },
          { id: 'm32p-3-3', number: '3.2.P.3.3', title: 'Description of Manufacturing Process and Process Controls', level: 2, required: true, guidance: 'Flow diagram, narrative description, CPPs with ranges, IPCs, hold times, equipment' },
          { id: 'm32p-3-4', number: '3.2.P.3.4', title: 'Controls of Critical Steps and Intermediates', level: 2, required: true, guidance: 'Tests and acceptance criteria for critical steps and intermediates' },
          { id: 'm32p-3-5', number: '3.2.P.3.5', title: 'Process Validation and/or Evaluation', level: 2, required: true, guidance: 'Process validation protocol and/or data summary per FDA/ICH guidance' },
        ],
      },
      { 
        id: 'm32p-4', 
        number: '3.2.P.4', 
        title: 'Control of Excipients', 
        level: 1, 
        required: true, 
        guidance: 'Specifications, analytical procedures for excipients',
        subsections: [
          { id: 'm32p-4-1', number: '3.2.P.4.1', title: 'Specifications', level: 2, required: true, guidance: 'Specifications for all excipients, pharmacopoeial/in-house standards' },
          { id: 'm32p-4-2', number: '3.2.P.4.2', title: 'Analytical Procedures', level: 2, required: true, guidance: 'Analytical procedures for non-compendial excipient tests' },
          { id: 'm32p-4-3', number: '3.2.P.4.3', title: 'Validation of Analytical Procedures', level: 2, required: true, guidance: 'Validation of non-compendial excipient tests' },
          { id: 'm32p-4-4', number: '3.2.P.4.4', title: 'Justification of Specifications', level: 2, required: true, guidance: 'Justification for specifications differing from compendial' },
          { id: 'm32p-4-5', number: '3.2.P.4.5', title: 'Excipients of Human or Animal Origin', level: 2, required: false, guidance: 'TSE/BSE safety information for excipients of human/animal origin' },
          { id: 'm32p-4-6', number: '3.2.P.4.6', title: 'Novel Excipients', level: 2, required: false, guidance: 'Full details for any novel excipients per ICH M4Q' },
        ],
      },
      { 
        id: 'm32p-5', 
        number: '3.2.P.5', 
        title: 'Control of Drug Product', 
        level: 1, 
        required: true, 
        guidance: 'Specification, analytical procedures, batch analyses',
        subsections: [
          { id: 'm32p-5-1', number: '3.2.P.5.1', title: 'Specification(s)', level: 2, required: true, guidance: 'Drug product specification table per ICH Q6A/Q6B' },
          { id: 'm32p-5-2', number: '3.2.P.5.2', title: 'Analytical Procedures', level: 2, required: true, guidance: 'Detailed analytical procedures for drug product testing' },
          { id: 'm32p-5-3', number: '3.2.P.5.3', title: 'Validation of Analytical Procedures', level: 2, required: true, guidance: 'Validation per ICH Q2(R1)' },
          { id: 'm32p-5-4', number: '3.2.P.5.4', title: 'Batch Analyses', level: 2, required: true, guidance: 'Batch analysis data for clinical, stability, and commercial batches' },
          { id: 'm32p-5-5', number: '3.2.P.5.5', title: 'Characterisation of Impurities', level: 2, required: true, guidance: 'Degradation products and impurity profile per ICH Q3B' },
          { id: 'm32p-5-6', number: '3.2.P.5.6', title: 'Justification of Specification(s)', level: 2, required: true, guidance: 'Rationale for each test and acceptance criterion' },
        ],
      },
      { id: 'm32p-6', number: '3.2.P.6', title: 'Reference Standards or Materials', level: 1, required: true, guidance: 'Reference standards used in drug product testing' },
      { id: 'm32p-7', number: '3.2.P.7', title: 'Container Closure System', level: 1, required: true, guidance: 'Container closure description, specifications, suitability studies, extractables/leachables' },
      { 
        id: 'm32p-8', 
        number: '3.2.P.8', 
        title: 'Stability', 
        level: 1, 
        required: true, 
        guidance: 'Stability summary, post-approval stability protocol, stability data',
        subsections: [
          { id: 'm32p-8-1', number: '3.2.P.8.1', title: 'Stability Summary and Conclusion', level: 2, required: true, guidance: 'Summary of stability studies per ICH Q1A-E, Q5C, degradation pathways, proposed shelf life' },
          { id: 'm32p-8-2', number: '3.2.P.8.2', title: 'Post-approval Stability Protocol and Stability Commitment', level: 2, required: true, guidance: 'Commitment to place production batches on stability' },
          { id: 'm32p-8-3', number: '3.2.P.8.3', title: 'Stability Data', level: 2, required: true, guidance: 'Tabulated stability results and graphical presentations' },
        ],
      },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 160,
    applicableRegions: ['US', 'EU', 'Japan', 'Global'],
    isDefault: true,
    usageCount: 15,
    createdAt: '2023-04-01',
    updatedAt: '2026-01-26',
  },
  // US Prescribing Information (USPI)
  {
    id: 'tmpl-uspi-v1',
    name: 'US Prescribing Information (USPI)',
    description: 'FDA-compliant US Prescribing Information / Package Insert',
    documentType: 'uspi',
    version: '1.0',
    sections: [
      { id: 'uspi-hl', number: 'HL', title: 'Highlights of Prescribing Information', level: 1, required: true, guidance: 'Concise summary of key information' },
      { id: 'uspi-1', number: '1', title: 'Indications and Usage', level: 1, required: true, guidance: 'Approved indications' },
      { id: 'uspi-2', number: '2', title: 'Dosage and Administration', level: 1, required: true, guidance: 'Dosing recommendations, administration instructions' },
      { id: 'uspi-3', number: '3', title: 'Dosage Forms and Strengths', level: 1, required: true, guidance: 'Available formulations' },
      { id: 'uspi-4', number: '4', title: 'Contraindications', level: 1, required: true, guidance: 'Absolute contraindications' },
      { id: 'uspi-5', number: '5', title: 'Warnings and Precautions', level: 1, required: true, guidance: 'Important safety information' },
      { id: 'uspi-6', number: '6', title: 'Adverse Reactions', level: 1, required: true, guidance: 'Clinical trial and post-marketing AEs' },
      { id: 'uspi-7', number: '7', title: 'Drug Interactions', level: 1, required: true, guidance: 'Clinically significant interactions' },
      { id: 'uspi-8', number: '8', title: 'Use in Specific Populations', level: 1, required: true, guidance: 'Pregnancy, lactation, pediatric, geriatric, renal/hepatic impairment' },
      { id: 'uspi-10', number: '10', title: 'Overdosage', level: 1, required: true, guidance: 'Overdose information' },
      { id: 'uspi-11', number: '11', title: 'Description', level: 1, required: true, guidance: 'Drug description and formulation' },
      { id: 'uspi-12', number: '12', title: 'Clinical Pharmacology', level: 1, required: true, guidance: 'MOA, PD, PK' },
      { id: 'uspi-13', number: '13', title: 'Nonclinical Toxicology', level: 1, required: true, guidance: 'Carcinogenesis, mutagenesis, impairment of fertility' },
      { id: 'uspi-14', number: '14', title: 'Clinical Studies', level: 1, required: true, guidance: 'Summary of clinical efficacy' },
      { id: 'uspi-16', number: '16', title: 'How Supplied/Storage and Handling', level: 1, required: true, guidance: 'Packaging, storage conditions' },
      { id: 'uspi-17', number: '17', title: 'Patient Counseling Information', level: 1, required: true, guidance: 'Patient counseling guidance' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 60,
    applicableRegions: ['US'],
    isDefault: true,
    usageCount: 8,
    createdAt: '2023-06-15',
    updatedAt: '2024-01-10',
  },
  // Company Core Data Sheet (CCDS)
  {
    id: 'tmpl-ccds-v1',
    name: 'Company Core Data Sheet (CCDS)',
    description: 'Global core labeling document for harmonized safety information',
    documentType: 'ccds',
    version: '1.0',
    sections: [
      { id: 'ccds-1', number: '1', title: 'Name of the Medicinal Product', level: 1, required: true, guidance: 'Product name(s)' },
      { id: 'ccds-2', number: '2', title: 'Qualitative and Quantitative Composition', level: 1, required: true, guidance: 'Active substance and excipients' },
      { id: 'ccds-3', number: '3', title: 'Pharmaceutical Form', level: 1, required: true, guidance: 'Dosage form description' },
      { id: 'ccds-4', number: '4', title: 'Clinical Particulars', level: 1, required: true, guidance: 'Indications, dosage, contraindications, warnings, interactions, pregnancy/lactation, effects on driving, adverse reactions, overdose' },
      { id: 'ccds-5', number: '5', title: 'Pharmacological Properties', level: 1, required: true, guidance: 'Pharmacodynamics, pharmacokinetics, preclinical safety data' },
      { id: 'ccds-6', number: '6', title: 'Pharmaceutical Particulars', level: 1, required: true, guidance: 'Excipients, incompatibilities, shelf life, storage, container' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 40,
    applicableRegions: ['Global'],
    isDefault: true,
    usageCount: 5,
    createdAt: '2023-07-01',
    updatedAt: '2024-02-15',
  },
  // SmPC (EU)
  {
    id: 'tmpl-smpc-v1',
    name: 'Summary of Product Characteristics (SmPC)',
    description: 'EU Summary of Product Characteristics per QRD template',
    documentType: 'smpc',
    version: '1.0',
    sections: [
      { id: 'smpc-1', number: '1', title: 'Name of the Medicinal Product', level: 1, required: true, guidance: 'Invented name, strength, pharmaceutical form' },
      { id: 'smpc-2', number: '2', title: 'Qualitative and Quantitative Composition', level: 1, required: true, guidance: 'Active substance and excipients with known effect' },
      { id: 'smpc-3', number: '3', title: 'Pharmaceutical Form', level: 1, required: true, guidance: 'Form description' },
      { id: 'smpc-4', number: '4', title: 'Clinical Particulars', level: 1, required: true, guidance: '4.1-4.9: Indications through overdose' },
      { id: 'smpc-5', number: '5', title: 'Pharmacological Properties', level: 1, required: true, guidance: '5.1-5.3: PD, PK, preclinical' },
      { id: 'smpc-6', number: '6', title: 'Pharmaceutical Particulars', level: 1, required: true, guidance: '6.1-6.6: Excipients through disposal' },
      { id: 'smpc-7', number: '7', title: 'Marketing Authorisation Holder', level: 1, required: true, guidance: 'MAH details' },
      { id: 'smpc-8', number: '8', title: 'Marketing Authorisation Number(s)', level: 1, required: true, guidance: 'MA numbers' },
      { id: 'smpc-9', number: '9', title: 'Date of First Authorisation/Renewal', level: 1, required: true, guidance: 'Dates' },
      { id: 'smpc-10', number: '10', title: 'Date of Revision of the Text', level: 1, required: true, guidance: 'Revision date' },
    ],
    defaultWorkflowId: 'wf-default-4stage',
    estimatedHours: 50,
    applicableRegions: ['EU'],
    isDefault: true,
    usageCount: 6,
    createdAt: '2023-07-01',
    updatedAt: '2024-02-15',
  },
];

// ============================================================================
// SAMPLE DOCUMENTS
// ============================================================================

const createSections = (docType: DocumentType, status: DocumentStatus): DocumentSection[] => {
  if (docType === 'csr') {
    return [
      { id: 'sec-1', number: '1', title: 'Title Page', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 150, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-2', number: '2', title: 'Synopsis', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 1200, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-3', number: '3', title: 'Table of Contents', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 0, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-9', number: '9', title: 'Investigational Plan', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 3500, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-10', number: '10', title: 'Study Patients', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 2800, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-11', number: '11', title: 'Efficacy Evaluation', level: 1, status: 'in-review', progress: 85, content: '', contentBlocks: [], wordCount: 8500, comments: [{ id: 'c1', sectionId: 'sec-11', content: 'Please add subgroup analysis by age', type: 'suggestion', priority: 'medium', authorId: 'u-biostat', authorName: 'Maria Santos', authorRole: 'biostatistician', status: 'open', replies: [], createdAt: '2024-12-10', updatedAt: '2024-12-10' }], hasUnresolvedComments: true, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-12', number: '12', title: 'Safety Evaluation', level: 1, status: 'in-progress', progress: 60, content: '', contentBlocks: [], wordCount: 6200, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-13', number: '13', title: 'Discussion and Conclusions', level: 1, status: 'not-started', progress: 0, content: '', contentBlocks: [], wordCount: 0, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    ];
  }
  if (docType === 'ib') {
    return [
      { id: 'sec-ib-1', number: '1', title: 'Title Page', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 100, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-4', number: '4', title: 'Summary', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 800, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-5', number: '5', title: 'Introduction', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 1200, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-6', number: '6', title: 'Physical, Chemical, Pharmaceutical Properties', level: 1, status: 'in-review', progress: 90, content: '', contentBlocks: [], wordCount: 2500, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-7', number: '7', title: 'Nonclinical Studies', level: 1, status: 'in-review', progress: 95, content: '', contentBlocks: [], wordCount: 4500, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-8', number: '8', title: 'Effects in Humans', level: 1, status: 'in-progress', progress: 70, content: '', contentBlocks: [], wordCount: 6000, comments: [{ id: 'c2', sectionId: 'sec-ib-8', content: 'Need to update with LIG-301 final results', type: 'issue', priority: 'high', authorId: 'u-clin', authorName: 'Dr. Sarah Chen', authorRole: 'clinical-lead', status: 'open', replies: [], createdAt: '2024-12-08', updatedAt: '2024-12-08' }], hasUnresolvedComments: true, sourceLinks: [], tflLinks: [], required: true },
      { id: 'sec-ib-9', number: '9', title: 'Summary of Data and Guidance for Investigator', level: 1, status: 'not-started', progress: 0, content: '', contentBlocks: [], wordCount: 0, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    ];
  }
  // Default for protocol
  return [
    { id: 'sec-p-1', number: '1', title: 'Title Page', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 150, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    { id: 'sec-p-2', number: '2', title: 'Synopsis', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 1500, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    { id: 'sec-p-6', number: '6', title: 'Introduction and Rationale', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 2000, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    { id: 'sec-p-7', number: '7', title: 'Study Objectives', level: 1, status: 'approved', progress: 100, content: '', contentBlocks: [], wordCount: 800, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    { id: 'sec-p-8', number: '8', title: 'Study Design', level: 1, status: 'in-progress', progress: 50, content: '', contentBlocks: [], wordCount: 1200, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
    { id: 'sec-p-9', number: '9', title: 'Study Population', level: 1, status: 'not-started', progress: 0, content: '', contentBlocks: [], wordCount: 0, comments: [], hasUnresolvedComments: false, sourceLinks: [], tflLinks: [], required: true },
  ];
};

const createPrerequisites = (docType: DocumentType): Prerequisite[] => {
  if (docType === 'csr') {
    return [
      { id: 'prereq-1', name: 'Database Lock', description: 'Clinical database must be locked', type: 'milestone', status: 'available', availableDate: '2024-11-15', sourceModule: 'Development', dependentSections: ['sec-10', 'sec-11', 'sec-12'], blocking: true },
      { id: 'prereq-2', name: 'Statistical Analysis Plan', description: 'Final SAP required', type: 'document', status: 'available', availableDate: '2024-11-10', sourceModule: 'Authoring', sourceDocumentId: 'doc-sap-301', sourceDocumentTitle: 'SAP v2.0 - LIG-301', dependentSections: ['sec-11', 'sec-12'], blocking: true },
      { id: 'prereq-3', name: 'TFL Package', description: 'Tables, Figures, Listings from Biostatistics', type: 'data', status: 'available', availableDate: '2024-11-25', sourceModule: 'Development', dependentSections: ['sec-11', 'sec-12'], blocking: true },
      { id: 'prereq-4', name: 'Subject Narratives', description: 'All subject narratives must be complete', type: 'document', status: 'pending', eta: '2024-12-20', sourceModule: 'Safety', dependentSections: ['sec-12'], blocking: false },
    ];
  }
  if (docType === 'ib') {
    return [
      { id: 'prereq-ib-1', name: 'CMC Data Package', description: 'Drug substance and product specifications', type: 'data', status: 'available', availableDate: '2024-10-01', sourceModule: 'Quality', dependentSections: ['sec-ib-6'], blocking: true },
      { id: 'prereq-ib-2', name: 'Nonclinical Study Reports', description: 'All completed tox and pharm studies', type: 'document', status: 'available', availableDate: '2024-09-15', sourceModule: 'Research', dependentSections: ['sec-ib-7'], blocking: true },
      { id: 'prereq-ib-3', name: 'Clinical Study Reports', description: 'All completed clinical studies', type: 'document', status: 'pending', eta: '2024-12-25', sourceModule: 'Authoring', dependentSections: ['sec-ib-8'], blocking: false },
      { id: 'prereq-ib-4', name: 'Safety Database', description: 'Current safety database extract', type: 'data', status: 'available', availableDate: '2024-12-01', sourceModule: 'Safety', dependentSections: ['sec-ib-8'], blocking: true },
    ];
  }
  // Protocol
  return [
    { id: 'prereq-p-1', name: 'Study Synopsis', description: 'Approved study synopsis', type: 'document', status: 'available', availableDate: '2024-10-01', sourceModule: 'Development', sourceDocumentTitle: 'Study Synopsis LIG-303', dependentSections: ['sec-p-2', 'sec-p-6'], blocking: true },
    { id: 'prereq-p-2', name: 'Target Product Profile', description: 'Current TPP', type: 'document', status: 'available', availableDate: '2024-09-15', sourceModule: 'Strategy', sourceDocumentTitle: 'TPP v3.0 - LIG-2847', dependentSections: ['sec-p-6', 'sec-p-7'], blocking: true },
    { id: 'prereq-p-3', name: 'Current IB', description: 'Latest approved IB version', type: 'document', status: 'available', availableDate: '2024-08-01', sourceModule: 'Authoring', sourceDocumentId: 'doc-ib-v4', sourceDocumentTitle: 'IB v4.0 - LIG-2847', dependentSections: ['sec-p-6'], blocking: true },
    { id: 'prereq-p-4', name: 'SAP Draft', description: 'Draft statistical analysis plan', type: 'document', status: 'pending', eta: '2024-12-30', sourceModule: 'Biostatistics', dependentSections: ['sec-p-14'], blocking: false },
  ];
};

export const authoringDocuments: AuthoringDocument[] = [
  {
    id: 'doc-csr-301',
    documentType: 'csr',
    artifactType: 'archive' as const,
    archiveMetadata: {
      submissionId: 'seq-nda-001',
      applicationNumber: 'NDA 215847',
      sequenceNumber: 1,
      archivedAt: '2024-06-15T09:12:43Z',
      esigHash: 'a3f8c2e1d4b7f09a2c5e8d1b4f7a0c3e6d9b2e5a8c1d4f7a0b3e6c9d2f5a8b1',
      archivedBy: 'Jennifer Park',
      ectdPath: 'm5/53-clin-stud-rep/controlled/lrg-multisite/lig-2847/',
    },
    title: 'Clinical Study Report - Study LIG-301',
    shortTitle: 'CSR LIG-301',
    version: '0.5',
    versionDate: '2024-12-10',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    studyId: 'study-301',
    studyName: 'LIG-301: Phase 3 NSCLC',
    indication: 'Non-Small Cell Lung Cancer',
    templateId: 'tmpl-csr-e3',
    templateName: 'Clinical Study Report (ICH E3)',
    templateVersion: '1.0',
    status: 'cross-functional-review',
    workflowId: 'wf-default-4stage',
    currentReviewStage: {
      stageId: 'stage-cf',
      stageName: 'Cross-Functional Review',
      stageOrder: 2,
      status: 'in-progress',
      startedAt: '2024-12-08',
      dueDate: '2024-12-15',
      reviewers: [
        { userId: 'u-clin', userName: 'Dr. Sarah Chen', role: 'clinical-lead', assignedSections: ['all'], isRequired: true, status: 'completed', assignedAt: '2024-12-08', dueDate: '2024-12-15', completedAt: '2024-12-12', decision: 'approve-with-comments' },
        { userId: 'u-biostat', userName: 'Maria Santos', role: 'biostatistician', assignedSections: ['sec-11', 'sec-12'], isRequired: true, status: 'in-progress', assignedAt: '2024-12-08', dueDate: '2024-12-15' },
        { userId: 'u-safety', userName: 'Dr. Robert Kim', role: 'safety-physician', assignedSections: ['sec-12'], isRequired: true, status: 'pending', assignedAt: '2024-12-08', dueDate: '2024-12-15' },
      ],
    },
    createdAt: '2024-11-15',
    updatedAt: '2024-12-10',
    dueDate: '2024-12-20',
    targetDate: '2024-12-18',
    authorId: 'u-writer-1',
    authorName: 'Jennifer Park',
    ownerId: 'u-clin',
    ownerName: 'Dr. Sarah Chen',
    progress: 78,
    sectionsTotal: 16,
    sectionsComplete: 10,
    sections: createSections('csr', 'cross-functional-review'),
    prerequisites: createPrerequisites('csr'),
    prerequisitesMet: true,
    openComments: 3,
    totalComments: 12,
    history: [
      { id: 'h1', documentId: 'doc-csr-301', action: 'created', description: 'Document created from template', userId: 'u-writer-1', userName: 'Jennifer Park', timestamp: '2024-11-15T09:00:00Z' },
      { id: 'h2', documentId: 'doc-csr-301', action: 'sent-for-review', description: 'Sent for cross-functional review', userId: 'u-writer-1', userName: 'Jennifer Park', timestamp: '2024-12-08T14:30:00Z' },
    ],
    sourceDocuments: [
      { id: 'src-1', documentId: 'doc-protocol-301', documentTitle: 'Protocol LIG-301 v3.0', documentType: 'protocol', version: '3.0', linkType: 'reference', sourceStatus: 'current', lastChecked: '2024-12-10' },
      { id: 'src-2', documentId: 'doc-sap-301', documentTitle: 'SAP LIG-301 v2.0', documentType: 'SAP', version: '2.0', linkType: 'reference', sourceStatus: 'current', lastChecked: '2024-12-10' },
    ],
    linkedDocuments: ['doc-ib-v4'],
    tags: ['pivotal', 'phase-3', 'nsclc'],
    priority: 'critical',
    estimatedHours: 200,
    actualHours: 145,
  },
  {
    id: 'doc-ib-v5',
    documentType: 'ib',
    artifactType: 'master' as const,
    sharedAcrossApplications: [
      { applicationId: 'app-ind-us-lig2847', applicationNumber: 'IND 123456',         regionFlag: '🇺🇸' },
      { applicationId: 'app-cta-eu-lig2847', applicationNumber: 'CTA 2021-001234-38', regionFlag: '🇪🇺' },
      { applicationId: 'app-cta-jp-lig2847', applicationNumber: 'CTA-JP-2022-0341',   regionFlag: '🇯🇵' },
      { applicationId: 'app-cta-ca-lig2847', applicationNumber: 'CTA-CA-2022-0087',   regionFlag: '🇨🇦' },
    ],
    title: "Investigator's Brochure v5.0 - LIG-2847",
    shortTitle: 'IB v5.0',
    version: '5.0',
    versionDate: '2024-12-05',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'Non-Small Cell Lung Cancer',
    templateId: 'tmpl-ib-v2',
    templateName: "Investigator's Brochure (ICH E7)",
    templateVersion: '2.0',
    status: 'cross-functional-review',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-10-01',
    updatedAt: '2024-12-05',
    dueDate: '2024-12-15',
    authorId: 'u-writer-2',
    authorName: 'David Chen',
    ownerId: 'u-reg',
    ownerName: 'Amanda Foster',
    progress: 92,
    sectionsTotal: 10,
    sectionsComplete: 8,
    sections: createSections('ib', 'cross-functional-review'),
    prerequisites: createPrerequisites('ib'),
    prerequisitesMet: false,
    openComments: 1,
    totalComments: 8,
    history: [],
    sourceDocuments: [],
    linkedDocuments: [],
    tags: ['annual-update', 'ib'],
    priority: 'high',
    estimatedHours: 80,
    actualHours: 68,
  },
  {
    id: 'doc-protocol-303',
    documentType: 'protocol',
    title: 'Protocol LIG-303 - Phase 2 Combination Study',
    shortTitle: 'Protocol LIG-303',
    version: '0.3',
    versionDate: '2024-12-01',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    studyId: 'study-303',
    studyName: 'LIG-303: Phase 2 Combination',
    indication: 'Non-Small Cell Lung Cancer',
    templateId: 'tmpl-protocol-v3',
    templateName: 'Clinical Study Protocol (ICH E6 R2)',
    templateVersion: '3.0',
    status: 'drafting',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-11-01',
    updatedAt: '2024-12-01',
    dueDate: '2025-01-15',
    targetDate: '2025-01-10',
    authorId: 'u-writer-1',
    authorName: 'Jennifer Park',
    ownerId: 'u-clin-2',
    ownerName: 'Dr. Michael Torres',
    progress: 35,
    sectionsTotal: 16,
    sectionsComplete: 4,
    sections: createSections('protocol', 'drafting'),
    prerequisites: createPrerequisites('protocol'),
    prerequisitesMet: true,
    openComments: 0,
    totalComments: 2,
    history: [],
    sourceDocuments: [],
    linkedDocuments: [],
    tags: ['phase-2', 'combination', 'nsclc'],
    priority: 'medium',
    estimatedHours: 120,
    actualHours: 35,
  },
  {
    id: 'doc-m25-nda',
    documentType: 'module-25',
    title: 'Module 2.5 Clinical Overview - LIG-2847 NDA',
    shortTitle: 'Module 2.5',
    version: '0.1',
    versionDate: '2024-12-01',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'Non-Small Cell Lung Cancer',
    templateId: 'tmpl-m25',
    templateName: 'Module 2.5 Clinical Overview (ICH M4E)',
    templateVersion: '1.0',
    status: 'prerequisites-pending',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-01',
    dueDate: '2025-02-15',
    authorId: 'u-writer-3',
    authorName: 'Lisa Wong',
    ownerId: 'u-med-dir',
    ownerName: 'Dr. James Mitchell',
    progress: 0,
    sectionsTotal: 8,
    sectionsComplete: 0,
    sections: [],
    prerequisites: [
      { id: 'prereq-m25-1', name: 'CSR LIG-301', description: 'Pivotal study CSR must be approved', type: 'document', status: 'pending', eta: '2024-12-25', sourceModule: 'Authoring', sourceDocumentId: 'doc-csr-301', dependentSections: ['all'], blocking: true },
      { id: 'prereq-m25-2', name: 'ISE Complete', description: 'Integrated Summary of Efficacy', type: 'document', status: 'pending', eta: '2025-01-10', sourceModule: 'Authoring', dependentSections: ['2.5.4'], blocking: true },
      { id: 'prereq-m25-3', name: 'Module 2.7 Draft', description: 'Clinical Summary draft for cross-reference', type: 'document', status: 'pending', eta: '2025-01-15', sourceModule: 'Authoring', dependentSections: ['all'], blocking: false },
    ],
    prerequisitesMet: false,
    openComments: 0,
    totalComments: 0,
    history: [],
    sourceDocuments: [],
    linkedDocuments: [],
    tags: ['nda', 'module-2'],
    priority: 'high',
    estimatedHours: 100,
  },
  {
    id: 'doc-ccds-v21',
    documentType: 'ccds',
    artifactType: 'master' as const,
    sharedAcrossApplications: [
      { applicationId: 'app-nda-us-lig2847', applicationNumber: 'NDA 215847',           regionFlag: '🇺🇸' },
      { applicationId: 'app-maa-eu-lig2847', applicationNumber: 'EMEA/H/C/006123',      regionFlag: '🇪🇺' },
      { applicationId: 'app-jnda-jp-lig2847',applicationNumber: 'JNDA 30100123',        regionFlag: '🇯🇵' },
      { applicationId: 'app-nds-ca-lig2847', applicationNumber: 'NDS-CA-2024-0156',     regionFlag: '🇨🇦' },
      { applicationId: 'app-maa-gb-lig2847', applicationNumber: 'PLGB-2024-00891',      regionFlag: '🇬🇧' },
    ],
    title: 'Company Core Data Sheet v2.1 - LIG-2847',
    shortTitle: 'CCDS v2.1',
    version: '2.1',
    versionDate: '2024-12-14',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'KRAS G12C-mutated Non-Small Cell Lung Cancer',
    templateId: 'tmpl-ccds-v1',
    templateName: 'Company Core Data Sheet (CCDS)',
    templateVersion: '1.0',
    status: 'drafting',
    workflowId: 'wf-expedited',
    createdAt: '2024-12-10',
    updatedAt: '2024-12-14',
    dueDate: '2024-12-20',
    targetDate: '2024-12-18',
    authorId: 'u-labeling',
    authorName: 'Amanda Foster',
    ownerId: 'u-safety',
    ownerName: 'Dr. Robert Kim',
    progress: 65,
    sectionsTotal: 12,
    sectionsComplete: 8,
    sections: createSections('ccds', 'drafting'),
    prerequisites: [
      { id: 'prereq-ccds-1', name: 'Safety Signal Assessment', description: 'Confirmed hepatotoxicity signal assessment from Safety module', type: 'data', status: 'available', availableDate: '2024-12-10', sourceModule: 'Safety', dependentSections: ['ccds-4-4', 'ccds-4-8'], blocking: true },
      { id: 'prereq-ccds-2', name: 'Class Effect Analysis', description: 'Competitive intelligence on KRAS G12C class hepatotoxicity', type: 'data', status: 'available', availableDate: '2024-12-10', sourceModule: 'Research', dependentSections: ['ccds-4-4'], blocking: false },
    ],
    prerequisitesMet: true,
    openComments: 5,
    totalComments: 12,
    history: [
      { id: 'h-ccds-1', documentId: 'doc-ccds-v21', action: 'created', description: 'Document created for safety update - Hepatotoxicity warning enhancement', userId: 'u-labeling', userName: 'Amanda Foster', timestamp: '2024-12-10T10:00:00Z' },
      { id: 'h-ccds-2', documentId: 'doc-ccds-v21', action: 'section-edited', description: 'Section 4.4 updated with enhanced hepatotoxicity warning language', userId: 'u-safety', userName: 'Dr. Robert Kim', timestamp: '2024-12-14T09:30:00Z' },
    ],
    sourceDocuments: [
      { id: 'src-ccds-1', documentId: 'doc-ccds-v20', documentTitle: 'CCDS v2.0 (Current)', documentType: 'ccds', version: '2.0', linkType: 'reference', sourceStatus: 'current', lastChecked: '2024-12-10' },
    ],
    linkedDocuments: ['doc-uspi-v13'],
    tags: ['safety-update', 'hepatotoxicity', 'urgent', 'cbe-30'],
    priority: 'critical',
    estimatedHours: 40,
    actualHours: 26,
  },
  {
    id: 'doc-uspi-v13',
    documentType: 'uspi',
    title: 'US Prescribing Information v1.3 - LIG-2847',
    shortTitle: 'USPI v1.3',
    version: '1.3',
    versionDate: '2024-12-14',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'KRAS G12C-mutated Non-Small Cell Lung Cancer',
    templateId: 'tmpl-uspi-v1',
    templateName: 'US Prescribing Information (USPI)',
    templateVersion: '1.0',
    status: 'drafting',
    workflowId: 'wf-expedited',
    createdAt: '2024-12-12',
    updatedAt: '2024-12-14',
    dueDate: '2024-12-22',
    targetDate: '2024-12-20',
    authorId: 'u-labeling',
    authorName: 'Amanda Foster',
    ownerId: 'u-reg',
    ownerName: 'Michael Chang',
    progress: 45,
    sectionsTotal: 17,
    sectionsComplete: 8,
    sections: createSections('uspi', 'drafting'),
    prerequisites: [
      { id: 'prereq-uspi-1', name: 'CCDS v2.1', description: 'Updated CCDS must be approved before USPI finalization', type: 'document', status: 'pending', sourceModule: 'Authoring', sourceDocumentId: 'doc-ccds-v21', dependentSections: ['uspi-5', 'uspi-6'], blocking: true },
    ],
    prerequisitesMet: false,
    openComments: 7,
    totalComments: 15,
    history: [
      { id: 'h-uspi-1', documentId: 'doc-uspi-v13', action: 'created', description: 'Document created for CBE-30 safety labeling supplement', userId: 'u-labeling', userName: 'Amanda Foster', timestamp: '2024-12-12T11:00:00Z' },
    ],
    sourceDocuments: [
      { id: 'src-uspi-1', documentId: 'doc-uspi-v12', documentTitle: 'USPI v1.2 (Current)', documentType: 'uspi', version: '1.2', linkType: 'reference', sourceStatus: 'current', lastChecked: '2024-12-12' },
      { id: 'src-uspi-2', documentId: 'doc-ccds-v21', documentTitle: 'CCDS v2.1 (Draft)', documentType: 'ccds', version: '2.1', linkType: 'reference', sourceStatus: 'current', lastChecked: '2024-12-14' },
    ],
    linkedDocuments: ['doc-ccds-v21'],
    tags: ['safety-update', 'hepatotoxicity', 'cbe-30', 'labeling'],
    priority: 'critical',
    estimatedHours: 35,
    actualHours: 16,
  },
  // Approved documents for v38 finalization demo
  {
    id: 'doc-csr-301-final',
    documentType: 'csr',
    title: 'Clinical Study Report - Study LIG-2847-301 (Final)',
    shortTitle: 'CSR LIG-2847-301',
    version: '1.0',
    versionDate: '2024-11-15',
    // v38: Added CTD section mapping
    ctdSection: '5.3.5',
    ctdModule: 'm5',
    // v38: Added application context
    applicationId: 'app-002',
    applicationNumber: 'NDA 215847',
    programId: 'prog-001',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    studyId: 'study-2847-301',
    studyName: 'LIG-2847-301: Phase 3 NSCLC Pivotal',
    indication: 'KRAS G12C+ Non-Small Cell Lung Cancer',
    templateId: 'tmpl-csr-e3',
    templateName: 'Clinical Study Report (ICH E3)',
    templateVersion: '1.0',
    status: 'approved',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-06-01',
    updatedAt: '2024-11-15',
    approvedDate: '2024-11-15',
    authorId: 'u-writer-1',
    authorName: 'Jennifer Park',
    ownerId: 'u-clin',
    ownerName: 'Dr. Sarah Chen',
    progress: 100,
    sectionsTotal: 16,
    sectionsComplete: 16,
    sections: createSections('csr', 'approved'),
    prerequisites: createPrerequisites('csr'),
    prerequisitesMet: true,
    openComments: 0,
    totalComments: 45,
    history: [
      { id: 'h-final-1', documentId: 'doc-csr-301-final', action: 'approved', description: 'Document approved by Dr. Sarah Chen', userId: 'u-clin', userName: 'Dr. Sarah Chen', timestamp: '2024-11-15T14:30:00Z' },
    ],
    sourceDocuments: [],
    linkedDocuments: [],
    tags: ['pivotal', 'phase-3', 'nsclc', 'nda', 'final'],
    priority: 'critical',
    estimatedHours: 200,
    actualHours: 195,
  },
  {
    id: 'doc-m25-final',
    documentType: 'module-25',
    title: 'Module 2.5 Clinical Overview - LIG-2847',
    shortTitle: 'Clinical Overview 2.5',
    version: '1.0',
    versionDate: '2024-11-20',
    // v38: Added CTD section mapping
    ctdSection: '2.5',
    ctdModule: 'm2',
    // v38: Added application context
    applicationId: 'app-002',
    applicationNumber: 'NDA 215847',
    programId: 'prog-001',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'KRAS G12C+ Non-Small Cell Lung Cancer',
    templateId: 'tmpl-m25',
    templateName: 'Module 2.5 Clinical Overview (ICH M4E)',
    templateVersion: '1.0',
    status: 'approved',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-09-01',
    updatedAt: '2024-11-20',
    approvedDate: '2024-11-20',
    authorId: 'u-writer-3',
    authorName: 'Lisa Wong',
    ownerId: 'u-med-dir',
    ownerName: 'Dr. James Mitchell',
    progress: 100,
    sectionsTotal: 8,
    sectionsComplete: 8,
    sections: [],
    prerequisites: [],
    prerequisitesMet: true,
    openComments: 0,
    totalComments: 28,
    history: [
      { id: 'h-m25-1', documentId: 'doc-m25-final', action: 'approved', description: 'Document approved for NDA submission', userId: 'u-med-dir', userName: 'Dr. James Mitchell', timestamp: '2024-11-20T10:00:00Z' },
    ],
    sourceDocuments: [],
    linkedDocuments: ['doc-csr-301-final'],
    tags: ['nda', 'module-2', 'clinical-overview', 'final'],
    priority: 'critical',
    estimatedHours: 100,
    actualHours: 105,
  },
  {
    id: 'doc-m27-final',
    documentType: 'module-27',
    title: 'Module 2.7 Clinical Summary - LIG-2847',
    shortTitle: 'Clinical Summary 2.7',
    version: '1.0',
    versionDate: '2024-11-22',
    // v38: Added CTD section mapping
    ctdSection: '2.7',
    ctdModule: 'm2',
    // v38: Added application context
    applicationId: 'app-002',
    applicationNumber: 'NDA 215847',
    programId: 'prog-001',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'KRAS G12C+ Non-Small Cell Lung Cancer',
    templateId: 'tmpl-m27',
    templateName: 'Module 2.7 Clinical Summary (ICH M4E)',
    templateVersion: '1.0',
    status: 'submission-ready',
    workflowId: 'wf-default-4stage',
    createdAt: '2024-09-15',
    updatedAt: '2024-11-22',
    approvedDate: '2024-11-22',
    authorId: 'u-writer-1',
    authorName: 'Jennifer Park',
    ownerId: 'u-clin',
    ownerName: 'Dr. Sarah Chen',
    progress: 100,
    sectionsTotal: 12,
    sectionsComplete: 12,
    sections: [],
    prerequisites: [],
    prerequisitesMet: true,
    openComments: 0,
    totalComments: 52,
    history: [
      { id: 'h-m27-1', documentId: 'doc-m27-final', action: 'approved', description: 'Document approved and marked submission-ready', userId: 'u-clin', userName: 'Dr. Sarah Chen', timestamp: '2024-11-22T16:00:00Z' },
    ],
    sourceDocuments: [],
    linkedDocuments: ['doc-csr-301-final', 'doc-m25-final'],
    tags: ['nda', 'module-2', 'clinical-summary', 'final', 'submission-ready'],
    priority: 'critical',
    estimatedHours: 120,
    actualHours: 118,
  },
  {
    // v0.125.32: Derived document — EU SmPC derived from CCDS master
    id: 'doc-smpc-eu-v1',
    documentType: 'label' as DocumentType,
    title: 'Summary of Product Characteristics (SmPC) — LIG-2847 EU',
    shortTitle: 'SmPC EU v1.0 Draft',
    version: '1.0',
    versionDate: '2024-12-18',
    programId: 'prog-2847',
    programName: 'LIG-2847 Oncology Program',
    productId: 'prod-2847',
    productName: 'LIG-2847 (ligrastinib)',
    indication: 'KRAS G12C+ NSCLC',
    applicationId: 'app-maa-eu-lig2847',
    applicationNumber: 'EMEA/H/C/006123',
    templateId: 'tmpl-smpc-eu',
    templateName: 'SmPC Template (EMA QRD v10)',
    templateVersion: '10.0',
    status: 'internal-review' as DocumentStatus,
    workflowId: 'wf-default-4stage',
    createdAt: '2024-12-18',
    updatedAt: '2025-01-08',
    dueDate: '2025-03-01',
    authorId: 'u-labeling',
    authorName: 'Amanda Foster',
    ownerId: 'u-reg-dir',
    ownerName: 'Dr. Thomas Wells',
    progress: 68,
    sectionsTotal: 20,
    sectionsComplete: 14,
    sections: [],
    prerequisites: [],
    prerequisitesMet: true,
    openComments: 5,
    totalComments: 18,
    history: [
      { id: 'h-smpc-1', documentId: 'doc-smpc-eu-v1', action: 'created', description: 'SmPC created as derived document from CCDS v2.1', userId: 'u-labeling', userName: 'Amanda Foster', timestamp: '2024-12-18T10:00:00Z' },
      { id: 'h-smpc-2', documentId: 'doc-smpc-eu-v1', action: 'sent-for-review', description: 'Sent for internal review — EU regulatory team', userId: 'u-labeling', userName: 'Amanda Foster', timestamp: '2025-01-06T09:00:00Z' },
    ],
    sourceDocuments: [],
    linkedDocuments: ['doc-ccds-v21'],
    tags: ['maa', 'labeling', 'smpc', 'eu', 'derived'],
    priority: 'high',
    estimatedHours: 80,
    actualHours: 45,
    // Artifact model
    artifactType: 'derived' as const,
    masterDocumentId: 'doc-ccds-v21',
    masterDocumentTitle: 'Company Core Data Sheet v2.1 — LIG-2847',
    derivationDeltas: [
      {
        sectionNumber: '4.2',
        sectionTitle: 'Posology and Method of Administration',
        deltaType: 'local-requirement',
        description: 'EMA QRD requires separate sub-sections for adults vs special populations. CCDS has combined posology. EU SmPC splits into §4.2.1 Adults, §4.2.2 Elderly, §4.2.3 Hepatic impairment per EMA guidance.',
      },
      {
        sectionNumber: '4.4',
        sectionTitle: 'Special Warnings and Precautions',
        deltaType: 'content',
        description: 'EU SmPC adds hepatotoxicity monitoring frequency per EMA Day 80 question response. Monitoring interval changed from "periodic" to "every 2 weeks for first 3 months" based on EMA request.',
      },
      {
        sectionNumber: '4.8',
        sectionTitle: 'Undesirable Effects',
        deltaType: 'local-requirement',
        description: 'EMA QRD requires MedDRA frequency classification table format (Very common ≥1/10, Common ≥1/100 to <1/10, etc.) distinct from CCDS narrative format. Table reformatted accordingly.',
      },
      {
        sectionNumber: '10',
        sectionTitle: 'Date of First Authorisation / Renewal',
        deltaType: 'local-requirement',
        description: 'EU-specific section not present in CCDS. Will be populated on approval.',
      },
      {
        sectionNumber: '11',
        sectionTitle: 'Date of Revision of the Text',
        deltaType: 'local-requirement',
        description: 'EU-specific section not present in CCDS. Tracks SmPC revision history per EMA requirements.',
      },
    ],
  },
];

// ============================================================================
// COMPONENT LIBRARY
// ============================================================================

export const componentLibrary: ComponentLibraryItem[] = [
  {
    id: 'comp-moa-kras',
    title: 'KRAS G12C Mechanism of Action',
    category: 'mechanism-of-action',
    content: 'Ligrastinib is a potent, selective, and irreversible inhibitor of KRAS G12C, a mutant form of the KRAS protein found in approximately 13% of non-small cell lung cancers. The compound covalently binds to the mutant cysteine residue, locking KRAS in its inactive GDP-bound state and preventing downstream signaling through the MAPK pathway.',
    contentType: 'text',
    version: '2.0',
    versionHistory: [
      { version: '1.0', content: 'Initial MOA description', changedBy: 'Jennifer Park', changedAt: '2023-06-01', changeNotes: 'Initial version' },
      { version: '2.0', content: 'Updated with binding mechanism details', changedBy: 'Jennifer Park', changedAt: '2024-03-15', changeNotes: 'Added covalent binding details' },
    ],
    status: 'approved',
    approvedBy: 'Dr. Sarah Chen',
    approvedAt: '2024-03-20',
    usageCount: 8,
    usedInDocuments: ['doc-ib-v4', 'doc-ib-v5', 'doc-protocol-301', 'doc-csr-301'],
    applicableDocumentTypes: ['protocol', 'ib', 'csr', 'module-25', 'module-27'],
    applicableTherapeuticAreas: ['Oncology'],
    applicableIndications: ['NSCLC', 'Colorectal Cancer'],
    tags: ['kras', 'mechanism', 'oncology'],
    createdBy: 'Jennifer Park',
    createdAt: '2023-06-01',
    updatedAt: '2024-03-15',
  },
  {
    id: 'comp-safety-hepato',
    title: 'Hepatotoxicity Warning Statement',
    category: 'safety-statement',
    content: 'Hepatotoxicity, including cases of drug-induced liver injury, has been reported in patients receiving ligrastinib. Monitor liver function tests (ALT, AST, total bilirubin) prior to initiation, monthly for the first 3 months, then periodically thereafter. Dose modifications or discontinuation may be required based on severity.',
    contentType: 'text',
    version: '1.1',
    versionHistory: [],
    status: 'approved',
    approvedBy: 'Dr. Robert Kim',
    approvedAt: '2024-08-10',
    usageCount: 5,
    usedInDocuments: ['doc-ib-v4', 'doc-ib-v5', 'doc-protocol-301'],
    applicableDocumentTypes: ['protocol', 'ib', 'csr'],
    tags: ['safety', 'hepatotoxicity', 'warning'],
    createdBy: 'David Chen',
    createdAt: '2024-02-15',
    updatedAt: '2024-08-10',
  },
  {
    id: 'comp-stat-primary',
    title: 'Primary Endpoint Analysis Methods',
    category: 'statistical-methods',
    content: 'The primary efficacy analysis will be performed on the intention-to-treat (ITT) population using a stratified log-rank test. Overall survival will be analyzed using Kaplan-Meier methods, with hazard ratios and 95% confidence intervals estimated using a stratified Cox proportional hazards model. Stratification factors will include ECOG performance status (0 vs 1) and prior lines of therapy (1 vs ≥2).',
    contentType: 'text',
    version: '1.0',
    versionHistory: [],
    status: 'approved',
    approvedBy: 'Maria Santos',
    approvedAt: '2024-01-20',
    usageCount: 3,
    usedInDocuments: ['doc-protocol-301', 'doc-sap-301'],
    applicableDocumentTypes: ['protocol', 'sap', 'csr'],
    tags: ['statistics', 'primary-endpoint', 'survival'],
    createdBy: 'Maria Santos',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20',
  },
];

// ============================================================================
// DATE HELPERS - v0.38.4: Dynamic dates to avoid stale data
// ============================================================================

function getRelativeDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function getFutureDate(daysAhead: number): string {
  return getRelativeDate(daysAhead);
}

function getPastDate(daysAgo: number): string {
  return getRelativeDate(-daysAgo);
}

// ============================================================================
// PENDING REVIEWS (for dashboard)
// ============================================================================

export const pendingReviews: PendingReview[] = [
  {
    documentId: 'doc-csr-301',
    documentTitle: 'CSR LIG-301 - Section 12 Safety',
    documentType: 'csr',
    stageName: 'Cross-Functional Review',
    requestedBy: 'Jennifer Park',
    requestedAt: getPastDate(5),
    dueDate: getFutureDate(3),
    sectionsToReview: ['Section 12 - Safety Evaluation'],
    commentCount: 2,
    priority: 'critical',
  },
  {
    documentId: 'doc-ib-v5',
    documentTitle: 'IB v5.0 - Section 8 Clinical',
    documentType: 'ib',
    stageName: 'Cross-Functional Review',
    requestedBy: 'David Chen',
    requestedAt: getPastDate(8),
    dueDate: getFutureDate(5),
    sectionsToReview: ['Section 8 - Effects in Humans'],
    commentCount: 1,
    priority: 'high',
  },
];

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export const recentActivity: DocumentHistoryEntry[] = [
  { id: 'act-1', documentId: 'doc-csr-301', action: 'comment-added', description: 'Comment added on Section 11 by Maria Santos', userId: 'u-biostat', userName: 'Maria Santos', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), sectionId: 'sec-11', sectionNumber: '11' },
  { id: 'act-2', documentId: 'doc-ib-v5', action: 'section-completed', description: 'Section 7 marked complete', userId: 'u-writer-2', userName: 'David Chen', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), sectionId: 'sec-ib-7', sectionNumber: '7' },
  { id: 'act-3', documentId: 'doc-csr-301', action: 'review-completed', description: 'Dr. Sarah Chen completed cross-functional review', userId: 'u-clin', userName: 'Dr. Sarah Chen', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: 'act-4', documentId: 'doc-protocol-303', action: 'section-edited', description: 'Section 8 Study Design edited', userId: 'u-writer-1', userName: 'Jennifer Park', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), sectionId: 'sec-p-8', sectionNumber: '8' },
  { id: 'act-5', documentId: 'doc-ib-v5', action: 'comment-resolved', description: 'Comment resolved on Section 6', userId: 'u-writer-2', userName: 'David Chen', timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), sectionId: 'sec-ib-6', sectionNumber: '6' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDocumentById(id: string): AuthoringDocument | undefined {
  return authoringDocuments.find(d => d.id === id);
}

export function getDocumentsByStatus(status: DocumentStatus): AuthoringDocument[] {
  return authoringDocuments.filter(d => d.status === status);
}

export function getDocumentsByType(type: DocumentType): AuthoringDocument[] {
  return authoringDocuments.filter(d => d.documentType === type);
}

export function getDocumentsByProgram(programId: string): AuthoringDocument[] {
  return authoringDocuments.filter(d => d.programId === programId);
}

export function getOverdueDocuments(): AuthoringDocument[] {
  const today = new Date();
  return authoringDocuments.filter(d => {
    if (!d.dueDate) return false;
    const dueDate = new Date(d.dueDate);
    return dueDate < today && !['approved', 'submission-ready', 'superseded'].includes(d.status);
  });
}

export function getDocumentsDueThisWeek(): AuthoringDocument[] {
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return authoringDocuments.filter(d => {
    if (!d.dueDate) return false;
    const dueDate = new Date(d.dueDate);
    return dueDate >= today && dueDate <= weekFromNow && !['approved', 'submission-ready', 'superseded'].includes(d.status);
  });
}

export function getTemplateByType(type: DocumentType): DocumentTemplate | undefined {
  return documentTemplates.find(t => t.documentType === type && t.isDefault);
}

export function getWorkflowById(id: string): ReviewWorkflow | undefined {
  return reviewWorkflows.find(w => w.id === id);
}

export function getComponentsByCategory(category: string): ComponentLibraryItem[] {
  return componentLibrary.filter(c => c.category === category);
}

// Dashboard data aggregation
export function getWriterDashboardData(userId: string): {
  myDocuments: AuthoringDocument[];
  activeCount: number;
  overdueCount: number;
  inReviewCount: number;
  dueThisWeekCount: number;
  pendingReviews: PendingReview[];
  recentActivity: DocumentHistoryEntry[];
} {
  const myDocs = authoringDocuments.filter(d => d.authorId === userId);
  const overdueDocs = getOverdueDocuments().filter(d => d.authorId === userId);
  const dueThisWeek = getDocumentsDueThisWeek().filter(d => d.authorId === userId);
  const inReview = myDocs.filter(d => ['internal-review', 'cross-functional-review', 'qc-review', 'final-review'].includes(d.status));
  
  return {
    myDocuments: myDocs,
    activeCount: myDocs.filter(d => !['approved', 'submission-ready', 'superseded'].includes(d.status)).length,
    overdueCount: overdueDocs.length,
    inReviewCount: inReview.length,
    dueThisWeekCount: dueThisWeek.length,
    pendingReviews,
    recentActivity: recentActivity.slice(0, 5),
  };
}

// Document type display names
export const documentTypeNames: Record<DocumentType, string> = {
  'protocol': 'Protocol',
  'ib': "Investigator's Brochure",
  'csr': 'Clinical Study Report',
  'module-25': 'Module 2.5 Clinical Overview',
  'module-27': 'Module 2.7 Clinical Summary',
  // Module 2 Summaries
  'module-2-summary': 'Module 2 Summary',
  // Module 2 Nonclinical
  'module-24': 'Module 2.4 Nonclinical Overview',
  'module-26': 'Module 2.6 Nonclinical Summary',
  // Module 3 Quality/CMC
  'module-3-quality': 'Module 3 Quality Overview',
  'module-32s': 'Module 3.2.S Drug Substance',
  'module-32p': 'Module 3.2.P Drug Product',
  'module-32a': 'Module 3.2.A Appendices',
  'module-33': 'Module 3.3 Literature References',
  // Labeling
  'uspi': 'US Prescribing Information (USPI)',
  'ccds': 'Company Core Data Sheet (CCDS)',
  'smpc': 'Summary of Product Characteristics (SmPC)',
  'pil': 'Patient Information Leaflet (PIL)',
  // Other Clinical
  'ise': 'Integrated Summary of Efficacy',
  'iss': 'Integrated Summary of Safety',
  'sap': 'Statistical Analysis Plan',
  'icf': 'Informed Consent Form',
  'briefing-book': 'Briefing Book',
  'dsur': 'Development Safety Update Report',
  'pbrer': 'Periodic Benefit-Risk Report',
  'other': 'Other',
};

// Status display config
export const documentStatusConfig: Record<DocumentStatus, { label: string; color: string; bgColor: string }> = {
  'not-started': { label: 'Not Started', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'prerequisites-pending': { label: 'Prerequisites Pending', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'ready-to-start': { label: 'Ready to Start', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'drafting': { label: 'Drafting', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'internal-review': { label: 'Internal Review', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'cross-functional-review': { label: 'CF Review', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'qc-review': { label: 'QC Review', color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  'final-review': { label: 'Final Review', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'approved': { label: 'Approved', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'submission-ready': { label: 'Submission Ready', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'superseded': { label: 'Superseded', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

// =============================================================================
// COMPREHENSIVE TEMPLATE LIBRARY (v0.32.7)
// Merges clinical templates with full eCTD templates
// =============================================================================

// Helper to count all sections including nested subsections
export function countTotalSections(sections: Array<{ subsections?: unknown[] }>): number {
  let count = 0;
  for (const section of sections) {
    count += 1;
    if (section.subsections && Array.isArray(section.subsections)) {
      count += countTotalSections(section.subsections as Array<{ subsections?: unknown[] }>);
    }
  }
  return count;
}

// Merge: Keep clinical templates from this file, add all ECTD comprehensive templates
// Use Set to avoid duplicates by documentType (prefer ECTD version for matching types)
const clinicalOnlyTypes = new Set(['protocol']); // Types to keep from authoring-data only
const ectdTypes = new Set(ECTD_DOCUMENT_TEMPLATES.map(t => t.documentType));

export const allDocumentTemplates = [
  // Clinical templates not covered by ECTD templates
  ...documentTemplates.filter(t => clinicalOnlyTypes.has(t.documentType) || !ectdTypes.has(t.documentType)),
  // All comprehensive ECTD templates  
  ...ECTD_DOCUMENT_TEMPLATES,
] as const;

// Re-export for backwards compatibility (now includes comprehensive templates)
export { ECTD_DOCUMENT_TEMPLATES };
