// =============================================================================
// PHASE 3 MILESTONE TEMPLATES - v0.42.13
// Completing the 200 template milestone
// +13 templates: Device/Combination Products, Advanced Therapies, 
// Real-World Evidence, Digital Health, Vaccines/Biologics
// =============================================================================

import { DocumentTemplate, TemplateSection } from './ectd-document-templates';

const AMA_REGULATORY_STYLE = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: '12pt',
  lineHeight: '1.5',
  margins: { top: '1in', bottom: '1in', left: '1.25in', right: '1in' },
};

// =============================================================================
// DEVICE / COMBINATION PRODUCTS - 3 templates
// =============================================================================

export const DEVICE_COMBINATION_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-510k-premarket',
    name: '510(k) Premarket Notification',
    description: 'FDA 510(k) submission for medical devices demonstrating substantial equivalence',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 807 Subpart E',
    estimatedHours: 120,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-device',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: '510k-1',
        number: '1',
        title: 'Administrative Information',
        level: 1,
        required: true,
        guidance: 'Cover letter, 510(k) summary or statement, truthful and accuracy statement',
        subsections: [
          { id: '510k-1-1', number: '1.1', title: 'Cover Letter', level: 2, required: true, guidance: 'Submission type, contact info' },
          { id: '510k-1-2', number: '1.2', title: '510(k) Summary', level: 2, required: true, guidance: 'Summary for public disclosure' },
          { id: '510k-1-3', number: '1.3', title: 'Truthful and Accuracy Statement', level: 2, required: true, guidance: 'Signed certification' },
        ]
      },
      {
        id: '510k-2',
        number: '2',
        title: 'Device Description',
        level: 1,
        required: true,
        guidance: 'Complete device description including principles of operation',
        aiPrompt: 'Describe the medical device including intended use, technological characteristics, and principles of operation',
        subsections: [
          { id: '510k-2-1', number: '2.1', title: 'Indications for Use', level: 2, required: true, guidance: 'Intended use statement' },
          { id: '510k-2-2', number: '2.2', title: 'Device Description', level: 2, required: true, guidance: 'Physical characteristics, materials, design' },
          { id: '510k-2-3', number: '2.3', title: 'Principles of Operation', level: 2, required: true, guidance: 'How device works' },
        ]
      },
      {
        id: '510k-3',
        number: '3',
        title: 'Substantial Equivalence Comparison',
        level: 1,
        required: true,
        guidance: 'Comparison to predicate device(s)',
        subsections: [
          { id: '510k-3-1', number: '3.1', title: 'Predicate Device Identification', level: 2, required: true, guidance: 'Predicate 510(k) number, device name' },
          { id: '510k-3-2', number: '3.2', title: 'Comparison Table', level: 2, required: true, guidance: 'Side-by-side comparison of features' },
          { id: '510k-3-3', number: '3.3', title: 'Substantial Equivalence Discussion', level: 2, required: true, guidance: 'Analysis of similarities and differences' },
        ]
      },
      {
        id: '510k-4',
        number: '4',
        title: 'Performance Testing',
        level: 1,
        required: true,
        guidance: 'Bench testing, biocompatibility, software verification',
        subsections: [
          { id: '510k-4-1', number: '4.1', title: 'Bench Testing', level: 2, required: true, guidance: 'Performance specifications testing' },
          { id: '510k-4-2', number: '4.2', title: 'Biocompatibility', level: 2, required: false, guidance: 'ISO 10993 testing if applicable' },
          { id: '510k-4-3', number: '4.3', title: 'Electrical Safety/EMC', level: 2, required: false, guidance: 'IEC 60601 testing if applicable' },
          { id: '510k-4-4', number: '4.4', title: 'Software Documentation', level: 2, required: false, guidance: 'Software level of concern, verification' },
        ]
      },
      { id: '510k-5', number: '5', title: 'Sterilization', level: 1, required: false, guidance: 'Sterilization validation if applicable' },
      { id: '510k-6', number: '6', title: 'Labeling', level: 1, required: true, guidance: 'Device labeling, IFU, package labeling' },
      { id: '510k-7', number: '7', title: 'Clinical Data', level: 1, required: false, guidance: 'Clinical studies if needed to support SE' },
    ]
  },
  {
    id: 'tpl-pma-supplement',
    name: 'PMA Supplement',
    description: 'Supplement to approved Premarket Approval for device modifications',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 814.39',
    estimatedHours: 80,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-device',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'pmas-1', number: '1', title: 'Administrative Information', level: 1, required: true, guidance: 'Cover letter, supplement type, PMA number' },
      { id: 'pmas-2', number: '2', title: 'Change Description', level: 1, required: true, guidance: 'Detailed description of proposed change',
        subsections: [
          { id: 'pmas-2-1', number: '2.1', title: 'Current Approved Device', level: 2, required: true, guidance: 'Description of approved configuration' },
          { id: 'pmas-2-2', number: '2.2', title: 'Proposed Modification', level: 2, required: true, guidance: 'Detailed change description' },
          { id: 'pmas-2-3', number: '2.3', title: 'Rationale for Change', level: 2, required: true, guidance: 'Justification for modification' },
        ]
      },
      { id: 'pmas-3', number: '3', title: 'Risk Analysis', level: 1, required: true, guidance: 'Risk assessment for the change', aiPrompt: 'Conduct risk analysis for the proposed device modification using ISO 14971 methodology' },
      { id: 'pmas-4', number: '4', title: 'Verification and Validation', level: 1, required: true, guidance: 'Testing to support the change',
        subsections: [
          { id: 'pmas-4-1', number: '4.1', title: 'Verification Testing', level: 2, required: true, guidance: 'Design verification' },
          { id: 'pmas-4-2', number: '4.2', title: 'Validation Testing', level: 2, required: false, guidance: 'Clinical validation if needed' },
        ]
      },
      { id: 'pmas-5', number: '5', title: 'Labeling Updates', level: 1, required: false, guidance: 'Updated labeling if applicable' },
      { id: 'pmas-6', number: '6', title: 'Manufacturing Changes', level: 1, required: false, guidance: 'Manufacturing process updates' },
    ]
  },
  {
    id: 'tpl-combination-product',
    name: 'Combination Product Submission Strategy',
    description: 'Strategy document for drug-device or biologic-device combination products',
    documentType: 'strategy',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR Part 3 / Combination Product Guidance',
    estimatedHours: 60,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-combination',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'cp-1', number: '1', title: 'Product Description', level: 1, required: true, guidance: 'Description of combination product constituents',
        subsections: [
          { id: 'cp-1-1', number: '1.1', title: 'Drug/Biologic Constituent', level: 2, required: true, guidance: 'Drug or biologic component' },
          { id: 'cp-1-2', number: '1.2', title: 'Device Constituent', level: 2, required: true, guidance: 'Device component' },
          { id: 'cp-1-3', number: '1.3', title: 'Mode of Action Analysis', level: 2, required: true, guidance: 'Primary mode of action determination' },
        ]
      },
      { id: 'cp-2', number: '2', title: 'Regulatory Pathway', level: 1, required: true, guidance: 'Lead center and regulatory pathway',
        aiPrompt: 'Analyze the primary mode of action and recommend the appropriate lead FDA center (CDER, CBER, or CDRH)',
        subsections: [
          { id: 'cp-2-1', number: '2.1', title: 'PMOA Determination', level: 2, required: true, guidance: 'Primary mode of action analysis' },
          { id: 'cp-2-2', number: '2.2', title: 'Lead Center Assignment', level: 2, required: true, guidance: 'CDER, CBER, or CDRH' },
          { id: 'cp-2-3', number: '2.3', title: 'RFD Strategy', level: 2, required: false, guidance: 'Request for Designation if needed' },
        ]
      },
      { id: 'cp-3', number: '3', title: 'Development Strategy', level: 1, required: true, guidance: 'Integrated development plan' },
      { id: 'cp-4', number: '4', title: 'CMC Strategy', level: 1, required: true, guidance: 'Manufacturing approach for both constituents' },
      { id: 'cp-5', number: '5', title: 'Clinical Strategy', level: 1, required: true, guidance: 'Clinical development plan' },
      { id: 'cp-6', number: '6', title: 'Labeling Strategy', level: 1, required: true, guidance: 'Unified labeling approach' },
    ]
  },
];

// =============================================================================
// ADVANCED THERAPIES (ATMP/CGT) - 3 templates
// =============================================================================

export const ADVANCED_THERAPY_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-cell-therapy-ind',
    name: 'Cell Therapy IND Module',
    description: 'IND module for cell therapy products including CAR-T and stem cells',
    documentType: 'cmc',
    ctdModule: '3',
    version: '1.0',
    ichGuideline: 'FDA Guidance on CGT / ICH Q5A-E',
    estimatedHours: 100,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-atmp',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'ct-1',
        number: '1',
        title: 'Cell Source and Characterization',
        level: 1,
        required: true,
        guidance: 'Starting material characterization',
        aiPrompt: 'Describe the cell source, donor eligibility criteria, and cell characterization strategy',
        subsections: [
          { id: 'ct-1-1', number: '1.1', title: 'Cell Source', level: 2, required: true, guidance: 'Autologous vs allogeneic, tissue source' },
          { id: 'ct-1-2', number: '1.2', title: 'Donor Eligibility', level: 2, required: true, guidance: 'Donor screening and testing per 21 CFR 1271' },
          { id: 'ct-1-3', number: '1.3', title: 'Cell Characterization', level: 2, required: true, guidance: 'Identity, viability, phenotype markers' },
        ]
      },
      {
        id: 'ct-2',
        number: '2',
        title: 'Manufacturing Process',
        level: 1,
        required: true,
        guidance: 'Cell processing and manufacturing',
        subsections: [
          { id: 'ct-2-1', number: '2.1', title: 'Process Description', level: 2, required: true, guidance: 'Step-by-step manufacturing' },
          { id: 'ct-2-2', number: '2.2', title: 'Critical Process Parameters', level: 2, required: true, guidance: 'CPPs and controls' },
          { id: 'ct-2-3', number: '2.3', title: 'In-Process Testing', level: 2, required: true, guidance: 'IPC and hold times' },
          { id: 'ct-2-4', number: '2.4', title: 'Genetic Modification', level: 2, required: false, guidance: 'For CAR-T: vector, transduction' },
        ]
      },
      {
        id: 'ct-3',
        number: '3',
        title: 'Product Characterization',
        level: 1,
        required: true,
        guidance: 'Final product testing and specifications',
        subsections: [
          { id: 'ct-3-1', number: '3.1', title: 'Identity', level: 2, required: true, guidance: 'Cell identity assays' },
          { id: 'ct-3-2', number: '3.2', title: 'Purity', level: 2, required: true, guidance: 'Unwanted cell populations, residual materials' },
          { id: 'ct-3-3', number: '3.3', title: 'Potency', level: 2, required: true, guidance: 'Functional assays' },
          { id: 'ct-3-4', number: '3.4', title: 'Safety Testing', level: 2, required: true, guidance: 'Sterility, mycoplasma, adventitious agents' },
        ]
      },
      { id: 'ct-4', number: '4', title: 'Stability', level: 1, required: true, guidance: 'Shelf-life and storage conditions' },
      { id: 'ct-5', number: '5', title: 'Container Closure', level: 1, required: true, guidance: 'Packaging and delivery system' },
    ]
  },
  {
    id: 'tpl-gene-therapy-cmc',
    name: 'Gene Therapy CMC Summary',
    description: 'CMC summary for gene therapy products including viral vectors',
    documentType: 'cmc',
    ctdModule: '3',
    version: '1.0',
    ichGuideline: 'FDA Guidance on Gene Therapy / ICH Q5A-E',
    estimatedHours: 120,
    applicableRegions: ['US', 'EU'],
    defaultWorkflowId: 'wf-atmp',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      {
        id: 'gt-1',
        number: '1',
        title: 'Vector Design',
        level: 1,
        required: true,
        guidance: 'Viral vector or delivery system design',
        subsections: [
          { id: 'gt-1-1', number: '1.1', title: 'Vector Type', level: 2, required: true, guidance: 'AAV, lentivirus, adenovirus, etc.' },
          { id: 'gt-1-2', number: '1.2', title: 'Transgene Construct', level: 2, required: true, guidance: 'Gene of interest, promoter, regulatory elements' },
          { id: 'gt-1-3', number: '1.3', title: 'Vector Map', level: 2, required: true, guidance: 'Complete genetic map with annotations' },
        ]
      },
      {
        id: 'gt-2',
        number: '2',
        title: 'Manufacturing Process',
        level: 1,
        required: true,
        guidance: 'Vector production and purification',
        aiPrompt: 'Describe the vector manufacturing process including cell culture, transfection, harvest, and purification steps',
        subsections: [
          { id: 'gt-2-1', number: '2.1', title: 'Cell Substrate', level: 2, required: true, guidance: 'Producer cell line characterization' },
          { id: 'gt-2-2', number: '2.2', title: 'Upstream Process', level: 2, required: true, guidance: 'Cell culture, transfection/infection' },
          { id: 'gt-2-3', number: '2.3', title: 'Downstream Process', level: 2, required: true, guidance: 'Harvest, purification, formulation' },
          { id: 'gt-2-4', number: '2.4', title: 'Process Controls', level: 2, required: true, guidance: 'CPPs, IPCs, batch records' },
        ]
      },
      {
        id: 'gt-3',
        number: '3',
        title: 'Analytical Methods',
        level: 1,
        required: true,
        guidance: 'Methods for vector characterization',
        subsections: [
          { id: 'gt-3-1', number: '3.1', title: 'Identity', level: 2, required: true, guidance: 'Transgene identity, serotype' },
          { id: 'gt-3-2', number: '3.2', title: 'Titer', level: 2, required: true, guidance: 'Genome copies, infectious titer' },
          { id: 'gt-3-3', number: '3.3', title: 'Purity', level: 2, required: true, guidance: 'Empty capsids, HCP, DNA impurities' },
          { id: 'gt-3-4', number: '3.4', title: 'Potency', level: 2, required: true, guidance: 'Transduction efficiency, gene expression' },
          { id: 'gt-3-5', number: '3.5', title: 'Safety', level: 2, required: true, guidance: 'RCL/RCR, sterility, endotoxin' },
        ]
      },
      { id: 'gt-4', number: '4', title: 'Specifications', level: 1, required: true, guidance: 'Release and shelf-life specifications' },
      { id: 'gt-5', number: '5', title: 'Stability', level: 1, required: true, guidance: 'Stability program and data' },
    ]
  },
  {
    id: 'tpl-atmp-hospital-exemption',
    name: 'ATMP Hospital Exemption Application',
    description: 'EMA hospital exemption application for ATMPs prepared on non-routine basis',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'EMA Regulation (EC) 1394/2007 Article 28',
    estimatedHours: 60,
    applicableRegions: ['EU', 'GB'],
    defaultWorkflowId: 'wf-atmp',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'he-1', number: '1', title: 'Administrative Information', level: 1, required: true, guidance: 'Applicant, hospital, qualified person' },
      { id: 'he-2', number: '2', title: 'Product Description', level: 1, required: true, guidance: 'ATMP classification and description',
        subsections: [
          { id: 'he-2-1', number: '2.1', title: 'ATMP Classification', level: 2, required: true, guidance: 'Gene therapy, somatic cell, tissue engineered' },
          { id: 'he-2-2', number: '2.2', title: 'Product Characteristics', level: 2, required: true, guidance: 'Composition, formulation' },
        ]
      },
      { id: 'he-3', number: '3', title: 'Non-Routine Basis Justification', level: 1, required: true, guidance: 'Why product cannot follow standard MA route', aiPrompt: 'Justify why the ATMP must be prepared on a non-routine basis under hospital exemption' },
      { id: 'he-4', number: '4', title: 'Quality Documentation', level: 1, required: true, guidance: 'GMP compliance, manufacturing, testing' },
      { id: 'he-5', number: '5', title: 'Traceability System', level: 1, required: true, guidance: 'Patient and product traceability' },
      { id: 'he-6', number: '6', title: 'Pharmacovigilance', level: 1, required: true, guidance: 'Adverse event reporting system' },
    ]
  },
];

// =============================================================================
// REAL-WORLD EVIDENCE - 3 templates
// =============================================================================

export const RWE_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-rwe-protocol',
    name: 'Real-World Evidence Study Protocol',
    description: 'Protocol for observational studies using real-world data sources',
    documentType: 'clinical',
    version: '1.0',
    ichGuideline: 'FDA RWE Framework / ICH E6(R2) / ISPE GPP',
    estimatedHours: 60,
    applicableRegions: ['US', 'EU', 'GLOBAL'],
    defaultWorkflowId: 'wf-rwe',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'rwe-1', number: '1', title: 'Background and Rationale', level: 1, required: true, guidance: 'Scientific background and study rationale' },
      { id: 'rwe-2', number: '2', title: 'Objectives and Hypotheses', level: 1, required: true, guidance: 'Primary and secondary objectives',
        subsections: [
          { id: 'rwe-2-1', number: '2.1', title: 'Primary Objective', level: 2, required: true, guidance: 'Main study question' },
          { id: 'rwe-2-2', number: '2.2', title: 'Secondary Objectives', level: 2, required: false, guidance: 'Additional endpoints' },
        ]
      },
      { id: 'rwe-3', number: '3', title: 'Study Design', level: 1, required: true, guidance: 'Observational design type',
        aiPrompt: 'Describe the observational study design (cohort, case-control, cross-sectional) and justify the approach',
        subsections: [
          { id: 'rwe-3-1', number: '3.1', title: 'Design Type', level: 2, required: true, guidance: 'Cohort, case-control, etc.' },
          { id: 'rwe-3-2', number: '3.2', title: 'Study Period', level: 2, required: true, guidance: 'Index date, follow-up' },
          { id: 'rwe-3-3', number: '3.3', title: 'Target Population', level: 2, required: true, guidance: 'Inclusion/exclusion criteria' },
        ]
      },
      { id: 'rwe-4', number: '4', title: 'Data Source', level: 1, required: true, guidance: 'RWD source description',
        subsections: [
          { id: 'rwe-4-1', number: '4.1', title: 'Data Source Description', level: 2, required: true, guidance: 'EHR, claims, registry' },
          { id: 'rwe-4-2', number: '4.2', title: 'Data Quality Assessment', level: 2, required: true, guidance: 'Completeness, validity' },
          { id: 'rwe-4-3', number: '4.3', title: 'Data Linkage', level: 2, required: false, guidance: 'If multiple sources linked' },
        ]
      },
      { id: 'rwe-5', number: '5', title: 'Variables and Outcomes', level: 1, required: true, guidance: 'Exposure, outcome, covariate definitions' },
      { id: 'rwe-6', number: '6', title: 'Statistical Analysis', level: 1, required: true, guidance: 'Analysis plan including bias mitigation',
        subsections: [
          { id: 'rwe-6-1', number: '6.1', title: 'Primary Analysis', level: 2, required: true, guidance: 'Main statistical approach' },
          { id: 'rwe-6-2', number: '6.2', title: 'Confounding Control', level: 2, required: true, guidance: 'PS matching, IPTW, etc.' },
          { id: 'rwe-6-3', number: '6.3', title: 'Sensitivity Analyses', level: 2, required: true, guidance: 'Robustness assessments' },
        ]
      },
      { id: 'rwe-7', number: '7', title: 'Limitations', level: 1, required: true, guidance: 'Known limitations and biases' },
    ]
  },
  {
    id: 'tpl-registry-study-report',
    name: 'Registry Study Report',
    description: 'Final study report for patient registry-based research',
    documentType: 'clinical',
    version: '1.0',
    ichGuideline: 'AHRQ Registry Guide / FDA Registry Guidance',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'GLOBAL'],
    defaultWorkflowId: 'wf-rwe',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'reg-1', number: '1', title: 'Synopsis', level: 1, required: true, guidance: 'Structured study summary' },
      { id: 'reg-2', number: '2', title: 'Introduction', level: 1, required: true, guidance: 'Background and objectives' },
      { id: 'reg-3', number: '3', title: 'Registry Description', level: 1, required: true, guidance: 'Registry characteristics and governance',
        subsections: [
          { id: 'reg-3-1', number: '3.1', title: 'Registry Purpose', level: 2, required: true, guidance: 'Original registry objectives' },
          { id: 'reg-3-2', number: '3.2', title: 'Data Collection', level: 2, required: true, guidance: 'How data was collected' },
          { id: 'reg-3-3', number: '3.3', title: 'Quality Assurance', level: 2, required: true, guidance: 'Data quality measures' },
        ]
      },
      { id: 'reg-4', number: '4', title: 'Methods', level: 1, required: true, guidance: 'Study methodology' },
      { id: 'reg-5', number: '5', title: 'Results', level: 1, required: true, guidance: 'Study findings',
        subsections: [
          { id: 'reg-5-1', number: '5.1', title: 'Patient Disposition', level: 2, required: true, guidance: 'Flow diagram, demographics' },
          { id: 'reg-5-2', number: '5.2', title: 'Primary Outcome', level: 2, required: true, guidance: 'Main results' },
          { id: 'reg-5-3', number: '5.3', title: 'Secondary Outcomes', level: 2, required: false, guidance: 'Additional findings' },
          { id: 'reg-5-4', number: '5.4', title: 'Subgroup Analyses', level: 2, required: false, guidance: 'Pre-specified subgroups' },
        ]
      },
      { id: 'reg-6', number: '6', title: 'Discussion', level: 1, required: true, guidance: 'Interpretation and context', aiPrompt: 'Discuss study findings in context of existing evidence, strengths, limitations, and implications' },
      { id: 'reg-7', number: '7', title: 'Conclusions', level: 1, required: true, guidance: 'Key conclusions' },
    ]
  },
  {
    id: 'tpl-claims-analysis-plan',
    name: 'Claims Database Analysis Plan',
    description: 'Statistical analysis plan for healthcare claims data studies',
    documentType: 'clinical',
    version: '1.0',
    ichGuideline: 'ISPE GPP / FDA Sentinel System',
    estimatedHours: 40,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-rwe',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'cap-1', number: '1', title: 'Study Objectives', level: 1, required: true, guidance: 'Research questions and hypotheses' },
      { id: 'cap-2', number: '2', title: 'Data Source', level: 1, required: true, guidance: 'Claims database description',
        subsections: [
          { id: 'cap-2-1', number: '2.1', title: 'Database Description', level: 2, required: true, guidance: 'Commercial, Medicare, Medicaid' },
          { id: 'cap-2-2', number: '2.2', title: 'Study Period', level: 2, required: true, guidance: 'Data extraction timeframe' },
          { id: 'cap-2-3', number: '2.3', title: 'Data Elements', level: 2, required: true, guidance: 'Available claims fields' },
        ]
      },
      { id: 'cap-3', number: '3', title: 'Study Population', level: 1, required: true, guidance: 'Cohort definition',
        subsections: [
          { id: 'cap-3-1', number: '3.1', title: 'Inclusion Criteria', level: 2, required: true, guidance: 'Eligibility requirements' },
          { id: 'cap-3-2', number: '3.2', title: 'Exclusion Criteria', level: 2, required: true, guidance: 'Exclusions' },
          { id: 'cap-3-3', number: '3.3', title: 'Index Date Definition', level: 2, required: true, guidance: 'Cohort entry' },
        ]
      },
      { id: 'cap-4', number: '4', title: 'Variable Definitions', level: 1, required: true, guidance: 'Operational definitions using codes',
        aiPrompt: 'Define exposure, outcome, and covariate variables using ICD-10, CPT, NDC, and HCPCS codes',
        subsections: [
          { id: 'cap-4-1', number: '4.1', title: 'Exposure Definition', level: 2, required: true, guidance: 'Treatment identification codes' },
          { id: 'cap-4-2', number: '4.2', title: 'Outcome Definition', level: 2, required: true, guidance: 'Endpoint algorithms' },
          { id: 'cap-4-3', number: '4.3', title: 'Covariates', level: 2, required: true, guidance: 'Baseline characteristics, comorbidities' },
        ]
      },
      { id: 'cap-5', number: '5', title: 'Statistical Methods', level: 1, required: true, guidance: 'Analysis approach' },
      { id: 'cap-6', number: '6', title: 'Sample Size', level: 1, required: true, guidance: 'Power calculation or feasibility' },
    ]
  },
];

// =============================================================================
// DIGITAL HEALTH - 2 templates
// =============================================================================

export const DIGITAL_HEALTH_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-samd-submission',
    name: 'Software as Medical Device (SaMD) Submission',
    description: 'Regulatory submission for standalone software medical devices',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA SaMD Guidance / IMDRF SaMD Framework / IEC 62304',
    estimatedHours: 80,
    applicableRegions: ['US', 'EU', 'GLOBAL'],
    defaultWorkflowId: 'wf-digital',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'samd-1', number: '1', title: 'Device Description', level: 1, required: true, guidance: 'Software description and intended use',
        aiPrompt: 'Describe the SaMD including its intended use, user interface, and healthcare decision support functionality',
        subsections: [
          { id: 'samd-1-1', number: '1.1', title: 'Intended Use', level: 2, required: true, guidance: 'Clinical purpose and users' },
          { id: 'samd-1-2', number: '1.2', title: 'Software Description', level: 2, required: true, guidance: 'Functionality, algorithms, outputs' },
          { id: 'samd-1-3', number: '1.3', title: 'SaMD Definition Statement', level: 2, required: true, guidance: 'IMDRF SaMD categorization' },
        ]
      },
      { id: 'samd-2', number: '2', title: 'Risk Classification', level: 1, required: true, guidance: 'Risk categorization per IMDRF',
        subsections: [
          { id: 'samd-2-1', number: '2.1', title: 'IMDRF Risk Category', level: 2, required: true, guidance: 'State of healthcare situation × Significance' },
          { id: 'samd-2-2', number: '2.2', title: 'FDA Classification', level: 2, required: true, guidance: 'Class I/II/III determination' },
        ]
      },
      { id: 'samd-3', number: '3', title: 'Software Development', level: 1, required: true, guidance: 'IEC 62304 compliance',
        subsections: [
          { id: 'samd-3-1', number: '3.1', title: 'Software Safety Class', level: 2, required: true, guidance: 'Class A/B/C per IEC 62304' },
          { id: 'samd-3-2', number: '3.2', title: 'Software Requirements', level: 2, required: true, guidance: 'Functional and performance requirements' },
          { id: 'samd-3-3', number: '3.3', title: 'Architecture Design', level: 2, required: true, guidance: 'Software architecture documentation' },
          { id: 'samd-3-4', number: '3.4', title: 'Verification & Validation', level: 2, required: true, guidance: 'Testing documentation' },
        ]
      },
      { id: 'samd-4', number: '4', title: 'Clinical Evidence', level: 1, required: true, guidance: 'Clinical validation approach',
        subsections: [
          { id: 'samd-4-1', number: '4.1', title: 'Analytical Validation', level: 2, required: true, guidance: 'Algorithm accuracy' },
          { id: 'samd-4-2', number: '4.2', title: 'Clinical Validation', level: 2, required: true, guidance: 'Clinical performance' },
        ]
      },
      { id: 'samd-5', number: '5', title: 'Cybersecurity', level: 1, required: true, guidance: 'Cybersecurity documentation' },
      { id: 'samd-6', number: '6', title: 'Labeling', level: 1, required: true, guidance: 'SaMD labeling and IFU' },
    ]
  },
  {
    id: 'tpl-digital-pre-sub',
    name: 'Digital Health Pre-Submission',
    description: 'Pre-submission meeting request for digital health products',
    documentType: 'regulatory',
    version: '1.0',
    ichGuideline: 'FDA Digital Health Guidance / Pre-Sub Guidance',
    estimatedHours: 30,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-digital',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'dps-1', number: '1', title: 'Meeting Purpose', level: 1, required: true, guidance: 'Purpose and objectives of meeting' },
      { id: 'dps-2', number: '2', title: 'Product Description', level: 1, required: true, guidance: 'Digital health product overview',
        subsections: [
          { id: 'dps-2-1', number: '2.1', title: 'Product Overview', level: 2, required: true, guidance: 'Brief description' },
          { id: 'dps-2-2', number: '2.2', title: 'Intended Use', level: 2, required: true, guidance: 'Clinical purpose' },
          { id: 'dps-2-3', number: '2.3', title: 'Technology Description', level: 2, required: true, guidance: 'AI/ML, mobile, cloud aspects' },
        ]
      },
      { id: 'dps-3', number: '3', title: 'Regulatory Pathway', level: 1, required: true, guidance: 'Proposed submission type',
        subsections: [
          { id: 'dps-3-1', number: '3.1', title: 'Proposed Classification', level: 2, required: true, guidance: 'Device class and pathway' },
          { id: 'dps-3-2', number: '3.2', title: 'Predicate Devices', level: 2, required: false, guidance: 'For 510(k) pathway' },
        ]
      },
      { id: 'dps-4', number: '4', title: 'Development Status', level: 1, required: true, guidance: 'Current stage of development' },
      { id: 'dps-5', number: '5', title: 'Questions for FDA', level: 1, required: true, guidance: 'Specific questions requiring FDA feedback', aiPrompt: 'Draft focused questions for FDA feedback on regulatory pathway, testing requirements, and clinical evidence needs' },
    ]
  },
];

// =============================================================================
// VACCINES / BIOLOGICS - 2 templates
// =============================================================================

export const VACCINE_BIOLOGIC_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-vaccine-lot-release',
    name: 'Vaccine Lot Release Protocol',
    description: 'Protocol for official lot release testing of vaccines',
    documentType: 'cmc',
    ctdModule: '3',
    version: '1.0',
    ichGuideline: 'WHO TRS 978 / FDA 21 CFR 610',
    estimatedHours: 40,
    applicableRegions: ['US', 'EU', 'GLOBAL'],
    defaultWorkflowId: 'wf-vaccine',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'vlr-1', number: '1', title: 'Lot Information', level: 1, required: true, guidance: 'Lot identification and manufacturing summary',
        subsections: [
          { id: 'vlr-1-1', number: '1.1', title: 'Lot Number', level: 2, required: true, guidance: 'Lot/batch identification' },
          { id: 'vlr-1-2', number: '1.2', title: 'Manufacturing Summary', level: 2, required: true, guidance: 'Production overview' },
          { id: 'vlr-1-3', number: '1.3', title: 'Lot Size', level: 2, required: true, guidance: 'Number of doses' },
        ]
      },
      { id: 'vlr-2', number: '2', title: 'Testing Summary', level: 1, required: true, guidance: 'Summary of all release tests',
        aiPrompt: 'Summarize lot release testing results including identity, potency, purity, safety, and sterility',
        subsections: [
          { id: 'vlr-2-1', number: '2.1', title: 'Identity Tests', level: 2, required: true, guidance: 'Antigen identity confirmation' },
          { id: 'vlr-2-2', number: '2.2', title: 'Potency Tests', level: 2, required: true, guidance: 'Immunogenicity/potency assays' },
          { id: 'vlr-2-3', number: '2.3', title: 'Purity Tests', level: 2, required: true, guidance: 'Residual impurities' },
          { id: 'vlr-2-4', number: '2.4', title: 'Safety Tests', level: 2, required: true, guidance: 'General safety, abnormal toxicity' },
          { id: 'vlr-2-5', number: '2.5', title: 'Sterility', level: 2, required: true, guidance: 'Sterility testing results' },
        ]
      },
      { id: 'vlr-3', number: '3', title: 'Specifications Compliance', level: 1, required: true, guidance: 'Comparison to approved specifications' },
      { id: 'vlr-4', number: '4', title: 'Deviations', level: 1, required: false, guidance: 'Any manufacturing deviations' },
      { id: 'vlr-5', number: '5', title: 'Release Recommendation', level: 1, required: true, guidance: 'QP release decision' },
    ]
  },
  {
    id: 'tpl-bpdr',
    name: 'Biological Product Deviation Report (BPDR)',
    description: 'FDA reportable deviation for licensed biological products',
    documentType: 'compliance',
    version: '1.0',
    ichGuideline: 'FDA 21 CFR 600.14 / 606.171',
    estimatedHours: 16,
    applicableRegions: ['US'],
    defaultWorkflowId: 'wf-compliance',
    createdAt: '2026-01-31',
    updatedAt: '2026-01-31',
    styleConfig: AMA_REGULATORY_STYLE,
    sections: [
      { id: 'bpdr-1', number: '1', title: 'Report Information', level: 1, required: true, guidance: 'Report type, date, facility',
        subsections: [
          { id: 'bpdr-1-1', number: '1.1', title: 'Report Type', level: 2, required: true, guidance: 'Initial, followup, correction' },
          { id: 'bpdr-1-2', number: '1.2', title: 'Facility Information', level: 2, required: true, guidance: 'FEI number, facility name' },
          { id: 'bpdr-1-3', number: '1.3', title: 'Discovery Date', level: 2, required: true, guidance: 'When deviation discovered' },
        ]
      },
      { id: 'bpdr-2', number: '2', title: 'Product Information', level: 1, required: true, guidance: 'Affected product details',
        subsections: [
          { id: 'bpdr-2-1', number: '2.1', title: 'Product Name', level: 2, required: true, guidance: 'Licensed product name' },
          { id: 'bpdr-2-2', number: '2.2', title: 'Lot Numbers', level: 2, required: true, guidance: 'Affected lots' },
          { id: 'bpdr-2-3', number: '2.3', title: 'Distribution Status', level: 2, required: true, guidance: 'Distributed, quarantined, destroyed' },
        ]
      },
      { id: 'bpdr-3', number: '3', title: 'Deviation Description', level: 1, required: true, guidance: 'What happened',
        aiPrompt: 'Describe the deviation including what happened, when, where, and who was involved',
        subsections: [
          { id: 'bpdr-3-1', number: '3.1', title: 'Deviation Event', level: 2, required: true, guidance: 'Description of what occurred' },
          { id: 'bpdr-3-2', number: '3.2', title: 'Deviation Category', level: 2, required: true, guidance: 'Manufacturing, testing, labeling, etc.' },
        ]
      },
      { id: 'bpdr-4', number: '4', title: 'Investigation', level: 1, required: true, guidance: 'Root cause and investigation findings' },
      { id: 'bpdr-5', number: '5', title: 'Corrective Actions', level: 1, required: true, guidance: 'Actions taken or planned' },
      { id: 'bpdr-6', number: '6', title: 'Risk to Product/Patient', level: 1, required: true, guidance: 'Assessment of risk' },
    ]
  },
];

// =============================================================================
// EXPORT ALL PHASE 3 MILESTONE TEMPLATES
// =============================================================================

export const PHASE3_MILESTONE_TEMPLATES: DocumentTemplate[] = [
  ...DEVICE_COMBINATION_TEMPLATES,
  ...ADVANCED_THERAPY_TEMPLATES,
  ...RWE_TEMPLATES,
  ...DIGITAL_HEALTH_TEMPLATES,
  ...VACCINE_BIOLOGIC_TEMPLATES,
];

export default PHASE3_MILESTONE_TEMPLATES;
