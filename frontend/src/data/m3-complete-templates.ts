// =============================================================================
// LIGATURE v0.42.14 - COMPLETE M3 eCTD TEMPLATE COVERAGE
// =============================================================================
// Fills all gaps in Module 3 (Quality) for full eCTD granularity
// Total new templates: 25
// =============================================================================

import { FileText, Beaker, FlaskConical, Package, Microscope, Shield, TestTube, Factory, Thermometer } from 'lucide-react';
import type { DocumentTemplate } from './ectd-document-templates';

// =============================================================================
// 3.2.S DRUG SUBSTANCE TEMPLATES (10 new)
// =============================================================================

export const M3_DRUG_SUBSTANCE_COMPLETE: DocumentTemplate[] = [
  // ---------------------------------------------------------------------------
  // 3.2.S.1 General Information
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s1-general-info',
    name: '3.2.S.1 General Information',
    description: 'Drug substance nomenclature, structure, and general properties per ICH M4Q(R1)',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.1',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s1-gen-info',
    estimatedHours: 24,
    guidance: ['ICH M4Q(R1)', 'ICH Q6A/Q6B'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's1-nomenclature',
        title: '1. Nomenclature',
        required: true,
        guidance: 'INN, USAN, CAS number, company code, chemical name',
        subsections: [
          { id: 's1-1-inn', title: '1.1 International Nonproprietary Name (INN)', required: true },
          { id: 's1-2-compendial', title: '1.2 Compendial Name(s)', required: false },
          { id: 's1-3-chemical', title: '1.3 Chemical Name(s)', required: true },
          { id: 's1-4-cas', title: '1.4 CAS Registry Number', required: true },
          { id: 's1-5-company', title: '1.5 Company/Laboratory Code', required: false },
          { id: 's1-6-other', title: '1.6 Other Names/Synonyms', required: false }
        ]
      },
      {
        id: 's1-structure',
        title: '2. Structure',
        required: true,
        guidance: 'Structural formula, molecular formula, molecular weight',
        subsections: [
          { id: 's1-2-1-structural', title: '2.1 Structural Formula', required: true },
          { id: 's1-2-2-molecular', title: '2.2 Molecular Formula', required: true },
          { id: 's1-2-3-mw', title: '2.3 Molecular Weight', required: true },
          { id: 's1-2-4-stereochem', title: '2.4 Stereochemistry', required: true }
        ]
      },
      {
        id: 's1-general-props',
        title: '3. General Properties',
        required: true,
        guidance: 'Physical form, solubility, polymorphism, pKa, partition coefficient',
        subsections: [
          { id: 's1-3-1-appearance', title: '3.1 Physical Description/Appearance', required: true },
          { id: 's1-3-2-solubility', title: '3.2 Solubility', required: true },
          { id: 's1-3-3-polymorphism', title: '3.3 Polymorphism', required: true },
          { id: 's1-3-4-pka', title: '3.4 pKa/Ionization Constants', required: false },
          { id: 's1-3-5-partition', title: '3.5 Partition Coefficient', required: false },
          { id: 's1-3-6-hygroscopicity', title: '3.6 Hygroscopicity', required: false }
        ]
      }
    ],
    aiFeatures: ['Structure rendering', 'Property calculation', 'Nomenclature validation'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.2.2 Description of Manufacturing Process
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s22-mfg-process-desc',
    name: '3.2.S.2.2 Description of Manufacturing Process',
    description: 'Complete drug substance manufacturing process description per ICH Q11',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.2.2',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s2-manuf/32s22-desc-manuf-proc',
    estimatedHours: 60,
    guidance: ['ICH Q11', 'ICH Q7', 'ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's22-process-overview',
        title: '1. Process Overview',
        required: true,
        guidance: 'High-level synthesis scheme with starting materials identified',
        subsections: [
          { id: 's22-1-1-scheme', title: '1.1 Overall Synthesis Scheme', required: true },
          { id: 's22-1-2-sm-justify', title: '1.2 Starting Material Justification', required: true },
          { id: 's22-1-3-route-selection', title: '1.3 Route Selection Rationale', required: false }
        ]
      },
      {
        id: 's22-detailed-process',
        title: '2. Detailed Manufacturing Process',
        required: true,
        guidance: 'Step-by-step process with parameters, equipment, and yields',
        subsections: [
          { id: 's22-2-1-batch-formula', title: '2.1 Batch Formula/Quantities', required: true },
          { id: 's22-2-2-process-steps', title: '2.2 Process Steps', required: true },
          { id: 's22-2-3-equipment', title: '2.3 Equipment Description', required: true },
          { id: 's22-2-4-ipcs', title: '2.4 In-Process Controls', required: true },
          { id: 's22-2-5-yields', title: '2.5 Expected Yields', required: true }
        ]
      },
      {
        id: 's22-reprocessing',
        title: '3. Reprocessing/Reworking',
        required: true,
        guidance: 'Conditions under which reprocessing may occur',
        subsections: [
          { id: 's22-3-1-reprocess-criteria', title: '3.1 Reprocessing Criteria', required: true },
          { id: 's22-3-2-reprocess-procedure', title: '3.2 Reprocessing Procedure', required: true }
        ]
      },
      {
        id: 's22-flow-diagram',
        title: '4. Process Flow Diagram',
        required: true,
        guidance: 'Visual representation of entire process with control points'
      }
    ],
    aiFeatures: ['Process flow generation', 'Yield calculation', 'ICH Q11 compliance check'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.2.4 Controls of Critical Steps and Intermediates
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s24-critical-controls',
    name: '3.2.S.2.4 Controls of Critical Steps and Intermediates',
    description: 'Critical process parameters and intermediate specifications per ICH Q11',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.2.4',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s2-manuf/32s24-contr-crit-steps',
    estimatedHours: 40,
    guidance: ['ICH Q11', 'ICH Q8(R2)', 'ICH Q9'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's24-critical-steps',
        title: '1. Critical Process Steps',
        required: true,
        guidance: 'Identification and justification of critical steps',
        subsections: [
          { id: 's24-1-1-identification', title: '1.1 Critical Step Identification', required: true },
          { id: 's24-1-2-justification', title: '1.2 Criticality Justification', required: true },
          { id: 's24-1-3-impact-assessment', title: '1.3 Quality Impact Assessment', required: true }
        ]
      },
      {
        id: 's24-cpps',
        title: '2. Critical Process Parameters (CPPs)',
        required: true,
        guidance: 'Parameters and their acceptable ranges',
        subsections: [
          { id: 's24-2-1-cpp-list', title: '2.1 CPP Identification', required: true },
          { id: 's24-2-2-ranges', title: '2.2 Acceptable Ranges/Limits', required: true },
          { id: 's24-2-3-monitoring', title: '2.3 Monitoring Strategy', required: true }
        ]
      },
      {
        id: 's24-intermediates',
        title: '3. Intermediate Specifications',
        required: true,
        guidance: 'Specifications for isolated intermediates',
        subsections: [
          { id: 's24-3-1-intermediate-specs', title: '3.1 Intermediate Quality Attributes', required: true },
          { id: 's24-3-2-test-methods', title: '3.2 Test Methods', required: true },
          { id: 's24-3-3-acceptance', title: '3.3 Acceptance Criteria', required: true },
          { id: 's24-3-4-hold-times', title: '3.4 Hold Times', required: false }
        ]
      },
      {
        id: 's24-control-strategy',
        title: '4. Overall Control Strategy',
        required: true,
        guidance: 'Integrated approach to process control'
      }
    ],
    aiFeatures: ['CPP identification', 'Risk assessment matrix', 'Control strategy mapping'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.2.5 Process Validation and/or Evaluation
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s25-ds-process-validation',
    name: '3.2.S.2.5 Process Validation/Evaluation',
    description: 'Drug substance process validation or evaluation per ICH Q11',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.2.5',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s2-manuf/32s25-proc-valid',
    estimatedHours: 80,
    guidance: ['ICH Q11', 'FDA Process Validation Guidance', 'ICH Q7'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's25-validation-approach',
        title: '1. Validation Approach',
        required: true,
        guidance: 'Traditional vs QbD approach, lifecycle validation',
        subsections: [
          { id: 's25-1-1-strategy', title: '1.1 Validation Strategy', required: true },
          { id: 's25-1-2-lifecycle', title: '1.2 Process Lifecycle Stage', required: true },
          { id: 's25-1-3-acceptance', title: '1.3 Acceptance Criteria', required: true }
        ]
      },
      {
        id: 's25-validation-studies',
        title: '2. Validation Studies',
        required: true,
        guidance: 'Description of validation batches and results',
        subsections: [
          { id: 's25-2-1-batches', title: '2.1 Validation Batch Information', required: true },
          { id: 's25-2-2-parameters', title: '2.2 Parameters Evaluated', required: true },
          { id: 's25-2-3-results', title: '2.3 Results Summary', required: true },
          { id: 's25-2-4-deviations', title: '2.4 Deviations and Resolutions', required: false }
        ]
      },
      {
        id: 's25-cpv',
        title: '3. Continued Process Verification',
        required: true,
        guidance: 'Ongoing monitoring and trending approach',
        subsections: [
          { id: 's25-3-1-cpv-plan', title: '3.1 CPV Plan', required: true },
          { id: 's25-3-2-trending', title: '3.2 Trending Methodology', required: true }
        ]
      }
    ],
    aiFeatures: ['Statistical analysis', 'Batch comparison', 'CPV trending'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.2.6 Manufacturing Process Development
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s26-ds-process-dev',
    name: '3.2.S.2.6 Manufacturing Process Development',
    description: 'Drug substance process development history per ICH Q11/Q8',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.2.6',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s2-manuf/32s26-manuf-proc-dev',
    estimatedHours: 80,
    guidance: ['ICH Q11', 'ICH Q8(R2)', 'ICH Q9', 'ICH Q10'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's26-development-history',
        title: '1. Development History',
        required: true,
        guidance: 'Evolution of manufacturing process through development',
        subsections: [
          { id: 's26-1-1-route-evolution', title: '1.1 Synthetic Route Evolution', required: true },
          { id: 's26-1-2-scale-up', title: '1.2 Scale-Up History', required: true },
          { id: 's26-1-3-changes', title: '1.3 Significant Process Changes', required: true }
        ]
      },
      {
        id: 's26-qbd-elements',
        title: '2. Quality by Design Elements',
        required: false,
        guidance: 'QTPP, CQAs, design space (if applicable)',
        subsections: [
          { id: 's26-2-1-qtpp', title: '2.1 Quality Target Product Profile', required: false },
          { id: 's26-2-2-cqas', title: '2.2 Critical Quality Attributes', required: false },
          { id: 's26-2-3-design-space', title: '2.3 Design Space', required: false },
          { id: 's26-2-4-risk-assessment', title: '2.4 Risk Assessment', required: false }
        ]
      },
      {
        id: 's26-starting-materials',
        title: '3. Starting Material Selection',
        required: true,
        guidance: 'Rationale for starting material designation per ICH Q11'
      },
      {
        id: 's26-comparability',
        title: '4. Process Comparability',
        required: true,
        guidance: 'Comparison of development vs commercial process'
      }
    ],
    aiFeatures: ['Risk assessment tools', 'Design space visualization', 'Comparability analysis'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.3.1 Elucidation of Structure and Other Characteristics
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s31-structure-elucidation',
    name: '3.2.S.3.1 Elucidation of Structure',
    description: 'Structural confirmation and characterization per ICH Q6A/Q6B',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.3.1',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s3-charac/32s31-eluc-struct',
    estimatedHours: 60,
    guidance: ['ICH Q6A', 'ICH Q6B', 'ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's31-primary-structure',
        title: '1. Primary Structure Confirmation',
        required: true,
        guidance: 'Techniques to confirm molecular structure',
        subsections: [
          { id: 's31-1-1-ms', title: '1.1 Mass Spectrometry', required: true },
          { id: 's31-1-2-nmr', title: '1.2 NMR Spectroscopy', required: true },
          { id: 's31-1-3-ir', title: '1.3 IR Spectroscopy', required: false },
          { id: 's31-1-4-uv', title: '1.4 UV/Vis Spectroscopy', required: false },
          { id: 's31-1-5-xray', title: '1.5 X-Ray Crystallography', required: false }
        ]
      },
      {
        id: 's31-stereochemistry',
        title: '2. Stereochemistry',
        required: true,
        guidance: 'Chiral centers, geometric isomers, optical rotation',
        subsections: [
          { id: 's31-2-1-chiral', title: '2.1 Chiral Center Configuration', required: true },
          { id: 's31-2-2-optical', title: '2.2 Optical Rotation', required: true },
          { id: 's31-2-3-cd', title: '2.3 Circular Dichroism', required: false }
        ]
      },
      {
        id: 's31-physicochemical',
        title: '3. Physicochemical Properties',
        required: true,
        guidance: 'Polymorphism, particle size, hygroscopicity',
        subsections: [
          { id: 's31-3-1-polymorphs', title: '3.1 Polymorphic Forms', required: true },
          { id: 's31-3-2-particle', title: '3.2 Particle Size Distribution', required: false },
          { id: 's31-3-3-thermal', title: '3.3 Thermal Analysis (DSC/TGA)', required: true }
        ]
      },
      {
        id: 's31-biologics',
        title: '4. Biological Characteristics (Biologics)',
        required: false,
        guidance: 'For biologics: glycosylation, disulfide bonds, aggregation',
        subsections: [
          { id: 's31-4-1-glycan', title: '4.1 Glycosylation Profile', required: false },
          { id: 's31-4-2-disulfide', title: '4.2 Disulfide Bond Mapping', required: false },
          { id: 's31-4-3-higher-order', title: '4.3 Higher Order Structure', required: false }
        ]
      }
    ],
    aiFeatures: ['Spectra interpretation', 'Structure validation', 'Biologics characterization'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.4.2 Analytical Procedures
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s42-ds-analytical-procedures',
    name: '3.2.S.4.2 Analytical Procedures (DS)',
    description: 'Drug substance analytical method descriptions per ICH M4Q',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.4.2',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s4-contr-drug-sub/32s42-analyt-proc',
    estimatedHours: 60,
    guidance: ['ICH M4Q(R1)', 'ICH Q2(R2)', 'ICH Q14'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's42-identity-methods',
        title: '1. Identity Test Methods',
        required: true,
        guidance: 'IR, specific tests for identification',
        subsections: [
          { id: 's42-1-1-ir', title: '1.1 IR Identification', required: true },
          { id: 's42-1-2-hplc-id', title: '1.2 HPLC Retention Time', required: false },
          { id: 's42-1-3-specific', title: '1.3 Specific Chemical Tests', required: false }
        ]
      },
      {
        id: 's42-assay-methods',
        title: '2. Assay Methods',
        required: true,
        guidance: 'Quantitative determination of drug substance',
        subsections: [
          { id: 's42-2-1-hplc-assay', title: '2.1 HPLC Assay Method', required: true },
          { id: 's42-2-2-titration', title: '2.2 Titration Method', required: false }
        ]
      },
      {
        id: 's42-impurity-methods',
        title: '3. Impurity Methods',
        required: true,
        guidance: 'Related substances, residual solvents, elemental impurities',
        subsections: [
          { id: 's42-3-1-related-sub', title: '3.1 Related Substances (HPLC)', required: true },
          { id: 's42-3-2-residual-solvent', title: '3.2 Residual Solvents (GC)', required: true },
          { id: 's42-3-3-elemental', title: '3.3 Elemental Impurities (ICP-MS)', required: true },
          { id: 's42-3-4-mutagenic', title: '3.4 Mutagenic Impurities', required: false }
        ]
      },
      {
        id: 's42-other-methods',
        title: '4. Other Test Methods',
        required: true,
        guidance: 'Physical tests, water content, etc.',
        subsections: [
          { id: 's42-4-1-water', title: '4.1 Water Content (KF)', required: true },
          { id: 's42-4-2-particle', title: '4.2 Particle Size', required: false },
          { id: 's42-4-3-polymorphic', title: '4.3 Polymorphic Form', required: false }
        ]
      }
    ],
    aiFeatures: ['Method description generator', 'ICH Q2 compliance check', 'Cross-reference management'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.4.5 Justification of Specification
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s45-ds-spec-justification',
    name: '3.2.S.4.5 Justification of Specification (DS)',
    description: 'Drug substance specification justification per ICH Q6A/Q6B',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.4.5',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s4-contr-drug-sub/32s45-just-spec',
    estimatedHours: 40,
    guidance: ['ICH Q6A', 'ICH Q6B', 'ICH Q3A(R2)', 'ICH Q3D'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's45-approach',
        title: '1. Specification Setting Approach',
        required: true,
        guidance: 'Regulatory, safety, and process considerations'
      },
      {
        id: 's45-test-justification',
        title: '2. Justification by Test',
        required: true,
        guidance: 'Test-by-test rationale for inclusion and limits',
        subsections: [
          { id: 's45-2-1-appearance', title: '2.1 Appearance', required: true },
          { id: 's45-2-2-identity', title: '2.2 Identity Tests', required: true },
          { id: 's45-2-3-assay', title: '2.3 Assay Limits', required: true },
          { id: 's45-2-4-impurities', title: '2.4 Impurity Limits', required: true },
          { id: 's45-2-5-physical', title: '2.5 Physical Properties', required: true }
        ]
      },
      {
        id: 's45-batch-data',
        title: '3. Supporting Batch Data',
        required: true,
        guidance: 'Batch history supporting specification limits'
      },
      {
        id: 's45-regulatory',
        title: '4. Regulatory Considerations',
        required: true,
        guidance: 'Compendial alignment, regional requirements'
      }
    ],
    aiFeatures: ['Specification comparison', 'Batch trending analysis', 'ICH limit calculator'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.6 Container Closure System
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s6-ds-container-closure',
    name: '3.2.S.6 Container Closure System (DS)',
    description: 'Drug substance container closure description and suitability',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.6',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s6-cont-clos-sys',
    estimatedHours: 24,
    guidance: ['ICH M4Q(R1)', 'FDA Container Closure Guidance'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's6-description',
        title: '1. Container Closure Description',
        required: true,
        guidance: 'Materials, specifications, drawings',
        subsections: [
          { id: 's6-1-1-primary', title: '1.1 Primary Container', required: true },
          { id: 's6-1-2-closure', title: '1.2 Closure System', required: true },
          { id: 's6-1-3-secondary', title: '1.3 Secondary Packaging', required: false }
        ]
      },
      {
        id: 's6-suitability',
        title: '2. Suitability',
        required: true,
        guidance: 'Protection, compatibility, safety',
        subsections: [
          { id: 's6-2-1-protection', title: '2.1 Protection from Environment', required: true },
          { id: 's6-2-2-compatibility', title: '2.2 Compatibility', required: true },
          { id: 's6-2-3-safety', title: '2.3 Safety (Extractables)', required: true }
        ]
      }
    ],
    aiFeatures: ['Material specification lookup', 'Compatibility guidance'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.S.7.3 Stability Data (DS) - More granular version
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-s73-ds-stability-data',
    name: '3.2.S.7.3 Stability Data (DS)',
    description: 'Drug substance stability data presentation per ICH Q1A',
    category: 'CMC - Drug Substance',
    moduleSection: '3.2.S.7.3',
    ectdLocation: 'm3/32-body-data/32s-drug-sub/32s7-stab/32s73-stab-data',
    estimatedHours: 40,
    guidance: ['ICH Q1A(R2)', 'ICH Q1B', 'ICH Q1E', 'ICH Q5C'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 's73-data-presentation',
        title: '1. Data Presentation',
        required: true,
        guidance: 'Tabular data for all stability conditions',
        subsections: [
          { id: 's73-1-1-long-term', title: '1.1 Long-Term Data', required: true },
          { id: 's73-1-2-intermediate', title: '1.2 Intermediate Data', required: false },
          { id: 's73-1-3-accelerated', title: '1.3 Accelerated Data', required: true },
          { id: 's73-1-4-stress', title: '1.4 Stress Testing Results', required: true }
        ]
      },
      {
        id: 's73-statistical',
        title: '2. Statistical Analysis',
        required: true,
        guidance: 'Shelf-life estimation per ICH Q1E'
      },
      {
        id: 's73-post-approval',
        title: '3. Stability Commitment',
        required: true,
        guidance: 'Post-approval stability protocol commitment'
      }
    ],
    aiFeatures: ['Shelf-life calculator', 'Trend analysis', 'Degradation pathway mapping'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  }
];

// =============================================================================
// 3.2.P DRUG PRODUCT TEMPLATES (12 new)
// =============================================================================

export const M3_DRUG_PRODUCT_COMPLETE: DocumentTemplate[] = [
  // ---------------------------------------------------------------------------
  // 3.2.P.1 Description and Composition
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p1-description-composition',
    name: '3.2.P.1 Description and Composition',
    description: 'Drug product description and qualitative/quantitative composition',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.1',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p1-desc-comp',
    estimatedHours: 16,
    guidance: ['ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p1-description',
        title: '1. Product Description',
        required: true,
        guidance: 'Dosage form, route, strength, appearance',
        subsections: [
          { id: 'p1-1-1-dosage-form', title: '1.1 Dosage Form', required: true },
          { id: 'p1-1-2-route', title: '1.2 Route of Administration', required: true },
          { id: 'p1-1-3-strength', title: '1.3 Strength(s)', required: true },
          { id: 'p1-1-4-appearance', title: '1.4 Physical Description', required: true }
        ]
      },
      {
        id: 'p1-composition',
        title: '2. Composition',
        required: true,
        guidance: 'Complete formula with function of each component',
        subsections: [
          { id: 'p1-2-1-qualitative', title: '2.1 Qualitative Composition', required: true },
          { id: 'p1-2-2-quantitative', title: '2.2 Quantitative Composition', required: true },
          { id: 'p1-2-3-overage', title: '2.3 Overages', required: false },
          { id: 'p1-2-4-batch-formula', title: '2.4 Batch Formula', required: true }
        ]
      },
      {
        id: 'p1-accompanying',
        title: '3. Accompanying Reconstitution/Diluent',
        required: false,
        guidance: 'If applicable, description of diluent or reconstitution device'
      }
    ],
    aiFeatures: ['Formula calculator', 'Composition table generator'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.2.2 Drug Product Development
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p22-dp-development',
    name: '3.2.P.2.2 Drug Product Development',
    description: 'Pharmaceutical development studies per ICH Q8(R2)',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.2.2',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p2-pharm-dev/32p22-drug-prod',
    estimatedHours: 80,
    guidance: ['ICH Q8(R2)', 'ICH Q9', 'ICH Q10'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p22-qtpp',
        title: '1. Quality Target Product Profile (QTPP)',
        required: true,
        guidance: 'Target product quality characteristics'
      },
      {
        id: 'p22-cqas',
        title: '2. Critical Quality Attributes (CQAs)',
        required: true,
        guidance: 'Identification and justification of CQAs',
        subsections: [
          { id: 'p22-2-1-identification', title: '2.1 CQA Identification', required: true },
          { id: 'p22-2-2-justification', title: '2.2 Criticality Justification', required: true },
          { id: 'p22-2-3-risk-assessment', title: '2.3 Initial Risk Assessment', required: true }
        ]
      },
      {
        id: 'p22-formulation-dev',
        title: '3. Formulation Development',
        required: true,
        guidance: 'Evolution of formulation, excipient selection rationale',
        subsections: [
          { id: 'p22-3-1-excipient-selection', title: '3.1 Excipient Selection', required: true },
          { id: 'p22-3-2-compatibility', title: '3.2 Drug-Excipient Compatibility', required: true },
          { id: 'p22-3-3-formulation-optimization', title: '3.3 Formulation Optimization', required: true }
        ]
      },
      {
        id: 'p22-design-space',
        title: '4. Design Space',
        required: false,
        guidance: 'Multidimensional design space if QbD approach used'
      },
      {
        id: 'p22-control-strategy',
        title: '5. Control Strategy',
        required: true,
        guidance: 'Planned approach to ensure product quality'
      }
    ],
    aiFeatures: ['QTPP builder', 'Risk assessment matrix', 'Design space visualization'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.2.4 Container Closure Development
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p24-container-closure-dev',
    name: '3.2.P.2.4 Container Closure Development',
    description: 'Container closure system development and selection rationale',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.2.4',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p2-pharm-dev/32p24-cont-clos-sys',
    estimatedHours: 40,
    guidance: ['ICH Q8(R2)', 'FDA Container Closure Guidance'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p24-selection',
        title: '1. Selection Rationale',
        required: true,
        guidance: 'Justification for container closure choice',
        subsections: [
          { id: 'p24-1-1-dosage-form', title: '1.1 Dosage Form Considerations', required: true },
          { id: 'p24-1-2-stability', title: '1.2 Stability Requirements', required: true },
          { id: 'p24-1-3-patient', title: '1.3 Patient/User Needs', required: true }
        ]
      },
      {
        id: 'p24-studies',
        title: '2. Development Studies',
        required: true,
        guidance: 'Container closure development studies performed',
        subsections: [
          { id: 'p24-2-1-compatibility', title: '2.1 Compatibility Studies', required: true },
          { id: 'p24-2-2-functionality', title: '2.2 Functionality Testing', required: true },
          { id: 'p24-2-3-el', title: '2.3 E&L Studies Summary', required: true }
        ]
      }
    ],
    aiFeatures: ['E&L study design', 'Compatibility assessment'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.2.5 Microbiological Attributes
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p25-microbiological',
    name: '3.2.P.2.5 Microbiological Attributes',
    description: 'Microbiological attributes and preservative effectiveness',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.2.5',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p2-pharm-dev/32p25-micro-attr',
    estimatedHours: 32,
    guidance: ['ICH Q8(R2)', 'USP <51>', 'USP <61>', 'USP <62>'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p25-preservative',
        title: '1. Preservative Effectiveness',
        required: false,
        guidance: 'For multi-dose products with preservatives',
        subsections: [
          { id: 'p25-1-1-pet', title: '1.1 Preservative Effectiveness Testing', required: false },
          { id: 'p25-1-2-selection', title: '1.2 Preservative Selection', required: false }
        ]
      },
      {
        id: 'p25-sterility',
        title: '2. Sterility Assurance',
        required: false,
        guidance: 'For sterile products',
        subsections: [
          { id: 'p25-2-1-approach', title: '2.1 Sterilization Approach', required: false },
          { id: 'p25-2-2-validation', title: '2.2 Sterilization Validation Summary', required: false }
        ]
      },
      {
        id: 'p25-bioburden',
        title: '3. Bioburden/Microbial Limits',
        required: true,
        guidance: 'Microbial limit specifications and rationale'
      }
    ],
    aiFeatures: ['PET study design', 'Microbial limits calculator'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.2.6 Compatibility
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p26-compatibility',
    name: '3.2.P.2.6 Compatibility',
    description: 'Drug product compatibility with reconstitution/administration',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.2.6',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p2-pharm-dev/32p26-compat',
    estimatedHours: 40,
    guidance: ['ICH Q8(R2)', 'FDA Injection Guidance'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p26-reconstitution',
        title: '1. Reconstitution/Dilution Compatibility',
        required: false,
        guidance: 'If product requires reconstitution or dilution',
        subsections: [
          { id: 'p26-1-1-diluents', title: '1.1 Compatible Diluents', required: false },
          { id: 'p26-1-2-concentration', title: '1.2 Dilution Range', required: false },
          { id: 'p26-1-3-stability', title: '1.3 In-Use Stability', required: false }
        ]
      },
      {
        id: 'p26-administration',
        title: '2. Administration Device Compatibility',
        required: false,
        guidance: 'Compatibility with infusion sets, syringes, etc.',
        subsections: [
          { id: 'p26-2-1-devices', title: '2.1 Compatible Devices', required: false },
          { id: 'p26-2-2-materials', title: '2.2 Material Compatibility', required: false },
          { id: 'p26-2-3-adsorption', title: '2.3 Adsorption Studies', required: false }
        ]
      },
      {
        id: 'p26-admixture',
        title: '3. Admixture Compatibility',
        required: false,
        guidance: 'Compatibility with other drugs if co-administered'
      }
    ],
    aiFeatures: ['In-use stability calculator', 'Device compatibility matrix'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.3.1 Manufacturer(s)
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p31-dp-manufacturers',
    name: '3.2.P.3.1 Manufacturer(s) (DP)',
    description: 'Drug product manufacturing site information',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.3.1',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p3-manuf/32p31-manuf',
    estimatedHours: 8,
    guidance: ['ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p31-sites',
        title: '1. Manufacturing Sites',
        required: true,
        guidance: 'Name, address, responsibilities for each site',
        subsections: [
          { id: 'p31-1-1-primary', title: '1.1 Primary Manufacturing Site', required: true },
          { id: 'p31-1-2-packaging', title: '1.2 Packaging Site(s)', required: true },
          { id: 'p31-1-3-testing', title: '1.3 Testing Site(s)', required: true }
        ]
      },
      {
        id: 'p31-gmp',
        title: '2. GMP Status',
        required: true,
        guidance: 'GMP compliance statement'
      }
    ],
    aiFeatures: ['Site registration lookup', 'GMP compliance tracker'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.3.2 Batch Formula
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p32-batch-formula',
    name: '3.2.P.3.2 Batch Formula',
    description: 'Drug product batch formula with scale',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.3.2',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p3-manuf/32p32-batch-form',
    estimatedHours: 8,
    guidance: ['ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p32-formula',
        title: '1. Batch Formula',
        required: true,
        guidance: 'Complete batch formula including processing aids',
        subsections: [
          { id: 'p32-1-1-components', title: '1.1 All Components', required: true },
          { id: 'p32-1-2-quantities', title: '1.2 Quantities per Batch', required: true },
          { id: 'p32-1-3-overage', title: '1.3 Overage Justification', required: false }
        ]
      },
      {
        id: 'p32-batch-size',
        title: '2. Batch Size Range',
        required: true,
        guidance: 'Proposed commercial batch size(s)'
      }
    ],
    aiFeatures: ['Batch scaling calculator', 'Overage calculator'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.4 Control of Excipients
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p4-excipient-control',
    name: '3.2.P.4 Control of Excipients',
    description: 'Excipient specifications and quality control',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.4',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p4-contr-excip',
    estimatedHours: 40,
    guidance: ['ICH Q6A', 'ICH Q8(R2)', 'FDA Inactive Ingredient Database'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p4-specifications',
        title: '1. Excipient Specifications',
        required: true,
        guidance: 'Specifications for each excipient',
        subsections: [
          { id: 'p4-1-1-compendial', title: '1.1 Compendial Excipients', required: true },
          { id: 'p4-1-2-non-compendial', title: '1.2 Non-Compendial Excipients', required: false },
          { id: 'p4-1-3-novel', title: '1.3 Novel Excipients', required: false }
        ]
      },
      {
        id: 'p4-analytical',
        title: '2. Analytical Procedures',
        required: false,
        guidance: 'For non-compendial tests'
      },
      {
        id: 'p4-justification',
        title: '3. Justification of Specifications',
        required: false,
        guidance: 'For additional tests beyond compendial'
      },
      {
        id: 'p4-human-animal',
        title: '4. Excipients of Human/Animal Origin',
        required: false,
        guidance: 'TSE/BSE risk assessment for animal-derived excipients'
      }
    ],
    aiFeatures: ['IID database lookup', 'Compendial specification retrieval', 'TSE/BSE risk checker'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.5.4 Batch Analyses
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p54-dp-batch-analyses',
    name: '3.2.P.5.4 Batch Analyses (DP)',
    description: 'Drug product batch analysis data presentation',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.5.4',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p5-contr-drug-prod/32p54-batch-anal',
    estimatedHours: 24,
    guidance: ['ICH M4Q(R1)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p54-batch-info',
        title: '1. Batch Information',
        required: true,
        guidance: 'Batch numbers, manufacturing dates, batch sizes'
      },
      {
        id: 'p54-results',
        title: '2. Analytical Results',
        required: true,
        guidance: 'Complete release testing results',
        subsections: [
          { id: 'p54-2-1-clinical', title: '2.1 Clinical/Biobatch Results', required: true },
          { id: 'p54-2-2-stability', title: '2.2 Primary Stability Batches', required: true },
          { id: 'p54-2-3-ppq', title: '2.3 PPQ/Validation Batches', required: true }
        ]
      },
      {
        id: 'p54-analysis',
        title: '3. Data Analysis',
        required: true,
        guidance: 'Statistical summary and trending'
      }
    ],
    aiFeatures: ['Batch data visualization', 'Statistical summary generator', 'Trend analysis'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.5.5 Characterisation of Impurities
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p55-dp-impurity-characterisation',
    name: '3.2.P.5.5 Characterisation of Impurities (DP)',
    description: 'Drug product degradation product characterization',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.5.5',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p5-contr-drug-prod/32p55-char-imp',
    estimatedHours: 40,
    guidance: ['ICH Q3B(R2)', 'ICH M7(R2)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p55-degradation',
        title: '1. Degradation Products',
        required: true,
        guidance: 'Identification and characterization of degradants',
        subsections: [
          { id: 'p55-1-1-identification', title: '1.1 Identification', required: true },
          { id: 'p55-1-2-structure', title: '1.2 Structure Elucidation', required: true },
          { id: 'p55-1-3-formation', title: '1.3 Formation Pathway', required: true }
        ]
      },
      {
        id: 'p55-qualification',
        title: '2. Qualification',
        required: true,
        guidance: 'Safety qualification of degradation products'
      },
      {
        id: 'p55-leachables',
        title: '3. Leachables',
        required: false,
        guidance: 'Characterization of container closure leachables'
      }
    ],
    aiFeatures: ['ICH Q3B threshold calculator', 'Degradation pathway mapper'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.5.6 Justification of Specification
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p56-dp-spec-justification',
    name: '3.2.P.5.6 Justification of Specification (DP)',
    description: 'Drug product specification justification per ICH Q6A',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.5.6',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p5-contr-drug-prod/32p56-just-spec',
    estimatedHours: 40,
    guidance: ['ICH Q6A', 'ICH Q6B', 'ICH Q3B(R2)'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p56-approach',
        title: '1. Specification Setting Approach',
        required: true,
        guidance: 'Philosophy and regulatory basis'
      },
      {
        id: 'p56-test-justification',
        title: '2. Justification by Test',
        required: true,
        guidance: 'Test-by-test rationale',
        subsections: [
          { id: 'p56-2-1-appearance', title: '2.1 Appearance', required: true },
          { id: 'p56-2-2-identity', title: '2.2 Identity', required: true },
          { id: 'p56-2-3-assay', title: '2.3 Assay', required: true },
          { id: 'p56-2-4-degradation', title: '2.4 Degradation Products', required: true },
          { id: 'p56-2-5-dosage-form', title: '2.5 Dosage Form-Specific Tests', required: true }
        ]
      },
      {
        id: 'p56-shelf-life',
        title: '3. Shelf-Life Specification',
        required: true,
        guidance: 'End-of-shelf-life vs release specification comparison'
      }
    ],
    aiFeatures: ['Specification comparison tool', 'ICH limit calculator'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.6 Reference Standards
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p6-dp-reference-standards',
    name: '3.2.P.6 Reference Standards (DP)',
    description: 'Drug product reference standards and materials',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.6',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p6-ref-stand',
    estimatedHours: 16,
    guidance: ['ICH M4Q(R1)', 'ICH Q6A'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p6-primary',
        title: '1. Primary Reference Standards',
        required: true,
        guidance: 'Source, characterization, handling',
        subsections: [
          { id: 'p6-1-1-source', title: '1.1 Source', required: true },
          { id: 'p6-1-2-characterization', title: '1.2 Characterization', required: true },
          { id: 'p6-1-3-coa', title: '1.3 Certificate of Analysis', required: true }
        ]
      },
      {
        id: 'p6-secondary',
        title: '2. Secondary/Working Standards',
        required: false,
        guidance: 'Qualification against primary'
      },
      {
        id: 'p6-impurity',
        title: '3. Impurity Reference Standards',
        required: false,
        guidance: 'For characterized impurities/degradants'
      }
    ],
    aiFeatures: ['Reference standard tracking', 'CoA management'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  }
];

// =============================================================================
// 3.2.A APPENDICES TEMPLATES (3 new)
// =============================================================================

export const M3_APPENDICES_COMPLETE: DocumentTemplate[] = [
  // ---------------------------------------------------------------------------
  // 3.2.A.1 Facilities and Equipment
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-a1-facilities-equipment',
    name: '3.2.A.1 Facilities and Equipment',
    description: 'Manufacturing facilities and equipment description',
    category: 'CMC - Appendices',
    moduleSection: '3.2.A.1',
    ectdLocation: 'm3/32-body-data/32a-app/32a1-fac-equip',
    estimatedHours: 40,
    guidance: ['ICH M4Q(R1)', 'ICH Q7', '21 CFR 211'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'a1-facilities',
        title: '1. Facility Description',
        required: true,
        guidance: 'Site layout, environmental controls, utilities',
        subsections: [
          { id: 'a1-1-1-layout', title: '1.1 Site Layout', required: true },
          { id: 'a1-1-2-hvac', title: '1.2 HVAC Systems', required: true },
          { id: 'a1-1-3-water', title: '1.3 Water Systems', required: true },
          { id: 'a1-1-4-environmental', title: '1.4 Environmental Monitoring', required: true }
        ]
      },
      {
        id: 'a1-equipment',
        title: '2. Major Equipment',
        required: true,
        guidance: 'Process equipment list with qualifications',
        subsections: [
          { id: 'a1-2-1-list', title: '2.1 Equipment List', required: true },
          { id: 'a1-2-2-qualification', title: '2.2 Qualification Status', required: true },
          { id: 'a1-2-3-cleaning', title: '2.3 Cleaning Procedures', required: true }
        ]
      }
    ],
    aiFeatures: ['Equipment qualification tracker', 'Site comparison'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.A.3 Excipients (Novel Excipients)
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-a3-novel-excipients',
    name: '3.2.A.3 Novel Excipients',
    description: 'Full quality documentation for novel excipients',
    category: 'CMC - Appendices',
    moduleSection: '3.2.A.3',
    ectdLocation: 'm3/32-body-data/32a-app/32a3-excip',
    estimatedHours: 120,
    guidance: ['ICH M4Q(R1)', 'ICH Q6A', 'FDA Novel Excipient Guidance'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'a3-general',
        title: '1. General Information',
        required: true,
        guidance: 'Nomenclature, structure, properties'
      },
      {
        id: 'a3-manufacture',
        title: '2. Manufacture',
        required: true,
        guidance: 'Manufacturing process and controls',
        subsections: [
          { id: 'a3-2-1-manufacturer', title: '2.1 Manufacturer', required: true },
          { id: 'a3-2-2-process', title: '2.2 Manufacturing Process', required: true },
          { id: 'a3-2-3-controls', title: '2.3 Process Controls', required: true }
        ]
      },
      {
        id: 'a3-characterisation',
        title: '3. Characterisation',
        required: true,
        guidance: 'Structure elucidation, impurities'
      },
      {
        id: 'a3-control',
        title: '4. Control of Excipient',
        required: true,
        guidance: 'Specification, analytical procedures, validation'
      },
      {
        id: 'a3-stability',
        title: '5. Stability',
        required: true,
        guidance: 'Excipient stability data'
      },
      {
        id: 'a3-safety',
        title: '6. Safety Data',
        required: true,
        guidance: 'Toxicology, safety qualification'
      }
    ],
    aiFeatures: ['Novel excipient package builder', 'Safety data compiler'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  },

  // ---------------------------------------------------------------------------
  // 3.2.P.8.2 Post-Approval Stability Protocol
  // ---------------------------------------------------------------------------
  {
    id: 'tpl-m3-p82-post-approval-stability',
    name: '3.2.P.8.2 Post-Approval Stability Protocol',
    description: 'Post-approval stability commitment and protocol',
    category: 'CMC - Drug Product',
    moduleSection: '3.2.P.8.2',
    ectdLocation: 'm3/32-body-data/32p-drug-prod/32p8-stab/32p82-post-appr',
    estimatedHours: 16,
    guidance: ['ICH Q1A(R2)', 'ICH Q1E', 'FDA Post-Approval Changes Guidance'],
    applicableRegions: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA'],
    documentType: 'Technical',
    sections: [
      {
        id: 'p82-commitment',
        title: '1. Stability Commitment',
        required: true,
        guidance: 'Number of batches, conditions, frequency'
      },
      {
        id: 'p82-protocol',
        title: '2. Protocol',
        required: true,
        guidance: 'Testing schedule and parameters',
        subsections: [
          { id: 'p82-2-1-conditions', title: '2.1 Storage Conditions', required: true },
          { id: 'p82-2-2-testing', title: '2.2 Testing Schedule', required: true },
          { id: 'p82-2-3-attributes', title: '2.3 Stability-Indicating Tests', required: true }
        ]
      },
      {
        id: 'p82-reporting',
        title: '3. Reporting Commitment',
        required: true,
        guidance: 'Annual reporting and OOS handling'
      }
    ],
    aiFeatures: ['Stability schedule generator', 'Commitment tracker'],
    version: '1.0',
    lastUpdated: '2026-01-31'
  }
];

// =============================================================================
// COMBINED EXPORT - ALL M3 COMPLETE TEMPLATES
// =============================================================================

export const M3_COMPLETE_TEMPLATES: DocumentTemplate[] = [
  ...M3_DRUG_SUBSTANCE_COMPLETE,
  ...M3_DRUG_PRODUCT_COMPLETE,
  ...M3_APPENDICES_COMPLETE
];

// =============================================================================
// TEMPLATE COUNTS
// =============================================================================

export const M3_COMPLETE_COUNTS = {
  drugSubstance: M3_DRUG_SUBSTANCE_COMPLETE.length,  // 10
  drugProduct: M3_DRUG_PRODUCT_COMPLETE.length,      // 12
  appendices: M3_APPENDICES_COMPLETE.length,         // 3
  total: M3_COMPLETE_TEMPLATES.length                // 25
};

// =============================================================================
// M3 eCTD COVERAGE MATRIX - FOR REFERENCE
// =============================================================================

export const M3_ECTD_COVERAGE = {
  '3.2.S': {
    '3.2.S.1': { name: 'General Information', status: 'NEW', templateId: 'tpl-m3-s1-general-info' },
    '3.2.S.2.1': { name: 'Manufacturer(s)', status: 'EXISTS' },
    '3.2.S.2.2': { name: 'Description of Mfg Process', status: 'NEW', templateId: 'tpl-m3-s22-mfg-process-desc' },
    '3.2.S.2.3': { name: 'Control of Materials', status: 'EXISTS' },
    '3.2.S.2.4': { name: 'Controls of Critical Steps', status: 'NEW', templateId: 'tpl-m3-s24-critical-controls' },
    '3.2.S.2.5': { name: 'Process Validation', status: 'NEW', templateId: 'tpl-m3-s25-ds-process-validation' },
    '3.2.S.2.6': { name: 'Mfg Process Development', status: 'NEW', templateId: 'tpl-m3-s26-ds-process-dev' },
    '3.2.S.3.1': { name: 'Elucidation of Structure', status: 'NEW', templateId: 'tpl-m3-s31-structure-elucidation' },
    '3.2.S.3.2': { name: 'Impurities', status: 'EXISTS' },
    '3.2.S.4.1': { name: 'Specification', status: 'EXISTS' },
    '3.2.S.4.2': { name: 'Analytical Procedures', status: 'NEW', templateId: 'tpl-m3-s42-ds-analytical-procedures' },
    '3.2.S.4.3': { name: 'Validation of Analytical', status: 'EXISTS' },
    '3.2.S.4.4': { name: 'Batch Analyses', status: 'EXISTS' },
    '3.2.S.4.5': { name: 'Justification of Spec', status: 'NEW', templateId: 'tpl-m3-s45-ds-spec-justification' },
    '3.2.S.5': { name: 'Reference Standards', status: 'EXISTS' },
    '3.2.S.6': { name: 'Container Closure (DS)', status: 'NEW', templateId: 'tpl-m3-s6-ds-container-closure' },
    '3.2.S.7': { name: 'Stability', status: 'EXISTS' },
    '3.2.S.7.3': { name: 'Stability Data', status: 'NEW', templateId: 'tpl-m3-s73-ds-stability-data' }
  },
  '3.2.P': {
    '3.2.P.1': { name: 'Description & Composition', status: 'NEW', templateId: 'tpl-m3-p1-description-composition' },
    '3.2.P.2.1': { name: 'Components', status: 'EXISTS' },
    '3.2.P.2.2': { name: 'Drug Product Development', status: 'NEW', templateId: 'tpl-m3-p22-dp-development' },
    '3.2.P.2.3': { name: 'Mfg Process Development', status: 'EXISTS' },
    '3.2.P.2.4': { name: 'Container Closure Dev', status: 'NEW', templateId: 'tpl-m3-p24-container-closure-dev' },
    '3.2.P.2.5': { name: 'Microbiological Attributes', status: 'NEW', templateId: 'tpl-m3-p25-microbiological' },
    '3.2.P.2.6': { name: 'Compatibility', status: 'NEW', templateId: 'tpl-m3-p26-compatibility' },
    '3.2.P.3.1': { name: 'Manufacturer(s)', status: 'NEW', templateId: 'tpl-m3-p31-dp-manufacturers' },
    '3.2.P.3.2': { name: 'Batch Formula', status: 'NEW', templateId: 'tpl-m3-p32-batch-formula' },
    '3.2.P.3.3': { name: 'Description of Mfg Process', status: 'EXISTS' },
    '3.2.P.3.4': { name: 'Controls of Critical Steps', status: 'EXISTS' },
    '3.2.P.3.5': { name: 'Process Validation', status: 'EXISTS' },
    '3.2.P.4': { name: 'Control of Excipients', status: 'NEW', templateId: 'tpl-m3-p4-excipient-control' },
    '3.2.P.5.1': { name: 'Specification (DP)', status: 'EXISTS' },
    '3.2.P.5.2': { name: 'Analytical Procedures', status: 'EXISTS' },
    '3.2.P.5.3': { name: 'Validation of Analytical', status: 'EXISTS' },
    '3.2.P.5.4': { name: 'Batch Analyses', status: 'NEW', templateId: 'tpl-m3-p54-dp-batch-analyses' },
    '3.2.P.5.5': { name: 'Characterisation of Impurities', status: 'NEW', templateId: 'tpl-m3-p55-dp-impurity-characterisation' },
    '3.2.P.5.6': { name: 'Justification of Spec', status: 'NEW', templateId: 'tpl-m3-p56-dp-spec-justification' },
    '3.2.P.6': { name: 'Reference Standards', status: 'NEW', templateId: 'tpl-m3-p6-dp-reference-standards' },
    '3.2.P.7': { name: 'Container Closure System', status: 'EXISTS' },
    '3.2.P.8.1': { name: 'Stability Summary', status: 'EXISTS' },
    '3.2.P.8.2': { name: 'Post-approval Stability', status: 'NEW', templateId: 'tpl-m3-p82-post-approval-stability' },
    '3.2.P.8.3': { name: 'Stability Data', status: 'EXISTS' }
  },
  '3.2.A': {
    '3.2.A.1': { name: 'Facilities & Equipment', status: 'NEW', templateId: 'tpl-m3-a1-facilities-equipment' },
    '3.2.A.2': { name: 'Adventitious Agents', status: 'EXISTS' },
    '3.2.A.3': { name: 'Excipients', status: 'NEW', templateId: 'tpl-m3-a3-novel-excipients' }
  }
};

export default M3_COMPLETE_TEMPLATES;
