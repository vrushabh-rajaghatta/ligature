

// ============================================================================
// eCTD Building Store - v70: Submission Building Depth
// ============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import {
  SequenceBuild,
  SequenceBuildStatus,
  ModuleBuild,
  SectionBuild,
  CTDLeaf,
  BackboneDocument,
  DocumentOperation,
  LeafStatus,
  ValidationSummary,
  ValidationCategoryResult,
  ValidationCategory,
  ValidationIssue,
  ValidationLevel,
  BackboneConfig,
  BackboneGenerationResult,
  GeneratedBackbone,
  PublishingPackage,
  SequenceTemplate,
  SequenceComparison,
  ApplicationMetadata,
  SubmissionMetadata,
  CreateBuildConfig,
  ECTDBuildingState,
  ECTDBuildingView,
  ECTDBuildingFilters,
  ECTDBuildingActions,
  PublishingChannel,
  CTDSectionDefinition,
  BuildPhase,
  ECTDFormatVersion,
} from './ectdBuildingTypes';

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: Record<string, SequenceTemplate> = {
  'tpl-original-nda': {
    id: 'tpl-original-nda',
    name: 'Original NDA Submission',
    description: 'Complete NDA submission with all required modules',
    submissionType: 'original',
    ectdVersion: '4.0',
    targetRegion: 'us',
    requiredSections: ['m1-2', 'm1-3-1', 'm1-14', 'm2-2', 'm2-3', 'm2-4', 'm2-5', 'm2-6', 'm2-7', 'm3-2-s', 'm3-2-p', 'm4-2-1', 'm4-2-2', 'm4-2-3', 'm5-3-5-1'],
    suggestedSections: ['m1-12', 'm2-1', 'm5-3-5-3', 'm5-3-6'],
    documentMappings: [
      { sectionId: 'm1-2', documentTypes: ['cover-letter'], required: true, guidance: 'Required for all sequences' },
      { sectionId: 'm2-5', documentTypes: ['clinical-overview'], required: true, guidance: 'Per ICH E3' },
    ],
    defaultMetadata: { submissionType: 'original', reviewPriority: 'standard' },
    usageCount: 47,
    lastUsed: '2025-01-10',
    createdBy: 'system',
    createdAt: '2024-01-01'
  },
  'tpl-ir-response': {
    id: 'tpl-ir-response',
    name: 'Information Request Response',
    description: 'Response to FDA Information Request',
    submissionType: 'ir-response',
    ectdVersion: '4.0',
    targetRegion: 'us',
    requiredSections: ['m1-2', 'm1-12-1'],
    suggestedSections: ['m1-12-2'],
    documentMappings: [
      { sectionId: 'm1-2', documentTypes: ['cover-letter'], required: true, guidance: 'Reference the original IR' },
    ],
    defaultMetadata: { submissionType: 'ir-response' },
    usageCount: 23,
    createdBy: 'system',
    createdAt: '2024-01-01'
  },
  'tpl-annual-report': {
    id: 'tpl-annual-report',
    name: 'Annual Report',
    description: 'Annual status report for approved applications',
    submissionType: 'annual-report',
    ectdVersion: '4.0',
    targetRegion: 'us',
    requiredSections: ['m1-2', 'm1-3-1'],
    suggestedSections: ['m5-3-6'],
    documentMappings: [],
    defaultMetadata: { submissionType: 'annual-report' },
    usageCount: 12,
    createdBy: 'system',
    createdAt: '2024-01-01'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateChecksum(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function createSection(id: string, number: string, title: string, required: boolean, children: SectionBuild[] = []): SectionBuild {
  return { id, sectionNumber: number, sectionTitle: title, path: id.replace(/-/g, '/'), leaves: [], children, required, status: 'empty' };
}

function getDefaultSectionsForModule(moduleNumber: string): SectionBuild[] {
  switch (moduleNumber) {
    case '1':
      return [
        createSection('m1-1', '1.1', 'Forms', true),
        createSection('m1-2', '1.2', 'Cover Letter', true),
        createSection('m1-3', '1.3', 'Administrative Information', true, [
          createSection('m1-3-1', '1.3.1', 'Contact Information', true),
          createSection('m1-3-2', '1.3.2', 'Field Copy Certification', false),
          createSection('m1-3-3', '1.3.3', 'Debarment Certification', true),
          createSection('m1-3-4', '1.3.4', 'Financial Certification', true),
        ]),
        createSection('m1-12', '1.12', 'Correspondence', false, [
          createSection('m1-12-1', '1.12.1', 'Response to Questions', false),
          createSection('m1-12-2', '1.12.2', 'Supporting Documents', false),
        ]),
        createSection('m1-14', '1.14', 'Labeling', false, [
          createSection('m1-14-1', '1.14.1', 'Draft Labeling', true),
          createSection('m1-14-2', '1.14.2', 'Patient Labeling', false),
        ]),
      ];
    case '2':
      return [
        createSection('m2-2', '2.2', 'CTD Introduction', true),
        createSection('m2-3', '2.3', 'Quality Overall Summary', true),
        createSection('m2-4', '2.4', 'Nonclinical Overview', true),
        createSection('m2-5', '2.5', 'Clinical Overview', true),
        createSection('m2-6', '2.6', 'Nonclinical Written and Tabulated Summaries', true, [
          createSection('m2-6-2', '2.6.2', 'Pharmacology Written Summary', true),
          createSection('m2-6-4', '2.6.4', 'Pharmacokinetics Written Summary', true),
          createSection('m2-6-6', '2.6.6', 'Toxicology Written Summary', true),
        ]),
        createSection('m2-7', '2.7', 'Clinical Summary', true, [
          createSection('m2-7-2', '2.7.2', 'Summary of Clinical Pharmacology', true),
          createSection('m2-7-3', '2.7.3', 'Summary of Clinical Efficacy', true),
          createSection('m2-7-4', '2.7.4', 'Summary of Clinical Safety', true),
        ]),
      ];
    case '3':
      return [
        createSection('m3-2', '3.2', 'Body of Data', true, [
          createSection('m3-2-s', '3.2.S', 'Drug Substance', true, [
            createSection('m3-2-s-1', '3.2.S.1', 'General Information', true),
            createSection('m3-2-s-2', '3.2.S.2', 'Manufacture', true),
            createSection('m3-2-s-4', '3.2.S.4', 'Control of Drug Substance', true),
            createSection('m3-2-s-7', '3.2.S.7', 'Stability', true),
          ]),
          createSection('m3-2-p', '3.2.P', 'Drug Product', true, [
            createSection('m3-2-p-1', '3.2.P.1', 'Description and Composition', true),
            createSection('m3-2-p-2', '3.2.P.2', 'Pharmaceutical Development', true),
            createSection('m3-2-p-3', '3.2.P.3', 'Manufacture', true),
            createSection('m3-2-p-5', '3.2.P.5', 'Control of Drug Product', true),
            createSection('m3-2-p-8', '3.2.P.8', 'Stability', true),
          ]),
        ]),
      ];
    case '4':
      return [
        createSection('m4-2', '4.2', 'Study Reports', true, [
          createSection('m4-2-1', '4.2.1', 'Pharmacology', true),
          createSection('m4-2-2', '4.2.2', 'Pharmacokinetics', true),
          createSection('m4-2-3', '4.2.3', 'Toxicology', true, [
            createSection('m4-2-3-1', '4.2.3.1', 'Single-Dose Toxicity', true),
            createSection('m4-2-3-2', '4.2.3.2', 'Repeat-Dose Toxicity', true),
            createSection('m4-2-3-3', '4.2.3.3', 'Genotoxicity', true),
          ]),
        ]),
      ];
    case '5':
      return [
        createSection('m5-2', '5.2', 'Tabular Listing of All Clinical Studies', true),
        createSection('m5-3', '5.3', 'Clinical Study Reports', true, [
          createSection('m5-3-1', '5.3.1', 'Reports of Biopharmaceutic Studies', false),
          createSection('m5-3-3', '5.3.3', 'Reports of Human PK Studies', false),
          createSection('m5-3-5', '5.3.5', 'Reports of Efficacy and Safety Studies', true, [
            createSection('m5-3-5-1', '5.3.5.1', 'Controlled Clinical Studies', true),
            createSection('m5-3-5-3', '5.3.5.3', 'Data Analyses', true),
          ]),
          createSection('m5-3-6', '5.3.6', 'Reports of Postmarketing Experience', false),
        ]),
      ];
    default:
      return [];
  }
}

function createModule(number: string, name: string): ModuleBuild {
  const sections = getDefaultSectionsForModule(number);
  return { moduleNumber: number, moduleName: name, sections, leafCount: 0, assignedCount: 0, validatedCount: 0, hasErrors: false, hasWarnings: false };
}

function createDefaultModules(): ModuleBuild[] {
  return [
    createModule('1', 'Regional Administrative Information'),
    createModule('2', 'Common Technical Document Summaries'),
    createModule('3', 'Quality'),
    createModule('4', 'Nonclinical Study Reports'),
    createModule('5', 'Clinical Study Reports'),
  ];
}

function runValidationChecks(build: SequenceBuild): ValidationSummary {
  const issues: ValidationIssue[] = [];
  
  // Check for cover letter
  const m12Section = build.modules.find(m => m.moduleNumber === '1')?.sections.find(s => s.sectionNumber === '1.2');
  const hasCoverLetter = m12Section?.leaves.some(l => l.document !== null);
  
  if (!hasCoverLetter) {
    issues.push({
      id: generateId('issue'),
      category: 'business-rules',
      level: 'error',
      code: 'BUS-001',
      title: 'Missing Cover Letter',
      message: 'Every submission sequence must include a cover letter in section 1.2',
      location: { module: '1', section: '1.2', sectionTitle: 'Cover Letter' },
      rule: { ruleId: 'BUS-001', ruleName: 'Cover Letter', specification: 'FDA eCTD TCG', section: '3.1' },
      autoFixable: false,
      acknowledged: false
    });
  }
  
  const errorCount = issues.filter(i => i.level === 'error').length;
  const warningCount = issues.filter(i => i.level === 'warning').length;
  
  return {
    lastValidated: new Date().toISOString(),
    validatedBy: 'system',
    totalChecks: 10,
    passedChecks: 10 - errorCount,
    failedChecks: errorCount,
    errors: errorCount,
    warnings: warningCount,
    info: 0,
    categories: [
      { category: 'business-rules', name: 'Business Rules', total: 2, passed: hasCoverLetter ? 2 : 1, failed: hasCoverLetter ? 0 : 1, errors: hasCoverLetter ? 0 : 1, warnings: 0 },
      { category: 'structure', name: 'Structure', total: 5, passed: 5, failed: 0, errors: 0, warnings: 0 },
      { category: 'pdf-compliance', name: 'PDF Compliance', total: 3, passed: 3, failed: 0, errors: 0, warnings: 0 },
    ],
    criticalIssues: issues.filter(i => i.level === 'error'),
    canSubmit: errorCount === 0,
    blockers: issues.filter(i => i.level === 'error').map(i => i.message)
  };
}

function generateBackboneXML(build: SequenceBuild, config: BackboneConfig): string {
  const indent = (level: number) => ' '.repeat(config.indentation * level);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE ectd:ectd SYSTEM "ich-ectd-3-2.dtd">\n';
  xml += '<ectd:ectd xmlns:ectd="http://www.ich.org/ectd" xmlns:xlink="http://www.w3.org/1999/xlink">\n';
  
  build.modules.forEach(module => {
    const moduleTag = `m${module.moduleNumber}-${getModuleXmlName(module.moduleNumber)}`;
    xml += `${indent(1)}<${moduleTag}>\n`;
    
    const addSections = (sections: SectionBuild[], level: number) => {
      sections.forEach(section => {
        if (section.leaves.length > 0 || config.includeEmptySections) {
          xml += `${indent(level)}<${section.id}>\n`;
          section.leaves.forEach(leaf => {
            if (leaf.document) {
              xml += `${indent(level + 1)}<leaf ID="${leaf.id}" operation="${leaf.document.operation}" `;
              xml += `checksum="${leaf.document.checksum}" checksum-type="${leaf.document.checksumType}" `;
              xml += `xlink:href="${leaf.document.fileName}">\n`;
              xml += `${indent(level + 2)}<title>${leaf.document.title}</title>\n`;
              xml += `${indent(level + 1)}</leaf>\n`;
            }
          });
          addSections(section.children, level + 1);
          xml += `${indent(level)}</${section.id}>\n`;
        }
      });
    };
    
    addSections(module.sections, 2);
    xml += `${indent(1)}</${moduleTag}>\n`;
  });
  
  xml += '</ectd:ectd>';
  return xml;
}

function getModuleXmlName(num: string): string {
  const names: Record<string, string> = { '1': 'regional', '2': 'summaries', '3': 'quality', '4': 'nonclin-study-rep', '5': 'clin-study-rep' };
  return names[num] || 'unknown';
}

// ============================================================================
// STORE DEFINITION
// ============================================================================

interface ECTDBuildingStore extends ECTDBuildingState, ECTDBuildingActions {}

export const useECTDBuildingStore = create<ECTDBuildingStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      builds: {},
      selectedBuildId: null,
      templates: DEFAULT_TEMPLATES,
      validationRules: {},
      activeComparison: null,
      view: 'builder',
      filters: { status: 'all', module: 'all', hasDocument: null, hasErrors: null, searchQuery: '' },
      expandedSections: new Set(['m1', 'm2', 'm3', 'm4', 'm5']),
      selectedLeafId: null,
      isValidating: false,
      isGeneratingBackbone: false,
      isPublishing: false,
      error: null,
      
      // Build Management
      createBuild: (config: CreateBuildConfig) => {
        const id = generateId('build');
        const now = new Date().toISOString();
        const modules = createDefaultModules();
        
        const build: SequenceBuild = {
          id,
          applicationId: config.applicationId,
          applicationNumber: config.applicationNumber,
          sequenceNumber: config.sequenceNumber,
          submissionType: config.submissionType,
          submissionSubType: config.submissionSubType,
          submissionDescription: config.submissionDescription,
          targetAgency: config.targetAgency,
          ectdVersion: config.ectdVersion,
          regionalVariant: config.targetAgency === 'us-fda' ? 'us' : config.targetAgency === 'eu-ema' ? 'eu' : 'ich',
          createdAt: now,
          createdBy: 'current-user',
          modifiedAt: now,
          modifiedBy: 'current-user',
          targetSubmissionDate: config.targetSubmissionDate,
          modules,
          totalLeaves: 0,
          assignedLeaves: 0,
          validatedLeaves: 0,
          applicationMetadata: config.applicationMetadata,
          submissionMetadata: { submissionId: id, submissionType: config.submissionType, submissionSubType: config.submissionSubType, submissionUnit: 'main', submissionDate: config.targetSubmissionDate },
          status: 'draft',
          buildProgress: { phase: 'planning', percentComplete: 0, currentStep: 'Build created', steps: [
            { id: 'create', name: 'Create Build', status: 'complete', completedAt: now },
            { id: 'assign', name: 'Document Assignment', status: 'pending' },
            { id: 'validate', name: 'Validation', status: 'pending' },
            { id: 'backbone', name: 'Backbone Generation', status: 'pending' },
            { id: 'package', name: 'Packaging', status: 'pending' }
          ]},
          validationSummary: { lastValidated: '', validatedBy: '', totalChecks: 0, passedChecks: 0, failedChecks: 0, errors: 0, warnings: 0, info: 0, categories: [], criticalIssues: [], canSubmit: false, blockers: [] }
        };
        
        set(state => ({ builds: { ...state.builds, [id]: build }, selectedBuildId: id }));
        return build;
      },
      
      deleteBuild: (buildId: string) => {
        set(state => {
          const { [buildId]: _, ...remaining } = state.builds;
          return { builds: remaining, selectedBuildId: state.selectedBuildId === buildId ? null : state.selectedBuildId };
        });
      },
      
      duplicateBuild: (buildId: string, newSequenceNumber: string) => {
        const original = get().builds[buildId];
        if (!original) throw new Error('Build not found');
        return get().createBuild({
          applicationId: original.applicationId,
          applicationNumber: original.applicationNumber,
          sequenceNumber: newSequenceNumber,
          submissionType: original.submissionType,
          submissionSubType: original.submissionSubType,
          submissionDescription: original.submissionDescription,
          targetAgency: original.targetAgency,
          ectdVersion: original.ectdVersion,
          targetSubmissionDate: original.targetSubmissionDate,
          applicationMetadata: { ...original.applicationMetadata }
        });
      },
      
      selectBuild: (buildId: string | null) => set({ selectedBuildId: buildId }),
      
      // Document Assignment
      assignDocument: (buildId: string, leafId: string, document: BackboneDocument) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          
          const updateLeafInSections = (sections: SectionBuild[]): SectionBuild[] => {
            return sections.map(section => ({
              ...section,
              leaves: section.leaves.map(leaf => leaf.id === leafId ? { ...leaf, document, status: 'assigned' as LeafStatus } : leaf),
              children: updateLeafInSections(section.children)
            }));
          };
          
          return { builds: { ...state.builds, [buildId]: { ...build, modules: build.modules.map(m => ({ ...m, sections: updateLeafInSections(m.sections) })), assignedLeaves: build.assignedLeaves + 1, modifiedAt: new Date().toISOString() } } };
        });
      },
      
      removeDocument: (buildId: string, leafId: string) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          
          const updateLeafInSections = (sections: SectionBuild[]): SectionBuild[] => {
            return sections.map(section => ({
              ...section,
              leaves: section.leaves.map(leaf => leaf.id === leafId ? { ...leaf, document: null, status: 'pending' as LeafStatus } : leaf),
              children: updateLeafInSections(section.children)
            }));
          };
          
          return { builds: { ...state.builds, [buildId]: { ...build, modules: build.modules.map(m => ({ ...m, sections: updateLeafInSections(m.sections) })), assignedLeaves: Math.max(0, build.assignedLeaves - 1) } } };
        });
      },
      
      updateLeafOperation: (buildId: string, leafId: string, operation: DocumentOperation) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          
          const updateLeafInSections = (sections: SectionBuild[]): SectionBuild[] => {
            return sections.map(section => ({
              ...section,
              leaves: section.leaves.map(leaf => leaf.id === leafId && leaf.document ? { ...leaf, document: { ...leaf.document, operation } } : leaf),
              children: updateLeafInSections(section.children)
            }));
          };
          
          return { builds: { ...state.builds, [buildId]: { ...build, modules: build.modules.map(m => ({ ...m, sections: updateLeafInSections(m.sections) })) } } };
        });
      },
      
      // Section Management
      addSection: () => {},
      removeSection: () => {},
      
      addLeaf: (buildId: string, sectionId: string, document?: BackboneDocument) => {
        const build = get().builds[buildId];
        if (!build) throw new Error('Build not found');
        
        const newLeaf: CTDLeaf = {
          id: generateId('leaf'),
          sectionId,
          sectionPath: sectionId.split('-'),
          sectionTitle: '',
          document: document || null,
          status: document ? 'assigned' : 'pending',
          sequence: 1,
          required: false,
          validationResults: []
        };
        
        set(state => {
          const currentBuild = state.builds[buildId];
          if (!currentBuild) return state;
          
          const addLeafToSection = (sections: SectionBuild[]): SectionBuild[] => {
            return sections.map(section => section.id === sectionId 
              ? { ...section, leaves: [...section.leaves, newLeaf] }
              : { ...section, children: addLeafToSection(section.children) });
          };
          
          return { builds: { ...state.builds, [buildId]: { ...currentBuild, modules: currentBuild.modules.map(m => ({ ...m, sections: addLeafToSection(m.sections), leafCount: m.leafCount + 1 })), totalLeaves: currentBuild.totalLeaves + 1 } } };
        });
        
        return newLeaf;
      },
      
      removeLeaf: (buildId: string, leafId: string) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          
          const removeLeafFromSections = (sections: SectionBuild[]): SectionBuild[] => {
            return sections.map(section => ({ ...section, leaves: section.leaves.filter(l => l.id !== leafId), children: removeLeafFromSections(section.children) }));
          };
          
          return { builds: { ...state.builds, [buildId]: { ...build, modules: build.modules.map(m => ({ ...m, sections: removeLeafFromSections(m.sections) })), totalLeaves: build.totalLeaves - 1 } } };
        });
      },
      
      // Validation
      runValidation: async (buildId: string) => {
        const build = get().builds[buildId];
        if (!build) throw new Error('Build not found');
        
        set({ isValidating: true });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const summary = runValidationChecks(build);
        
        set(state => ({
          isValidating: false,
          builds: { ...state.builds, [buildId]: { ...state.builds[buildId], validationSummary: summary, status: summary.errors > 0 ? 'error' : 'ready-for-review', buildProgress: { ...state.builds[buildId].buildProgress, phase: 'validation' as BuildPhase, percentComplete: 60 } } }
        }));
        
        return summary;
      },
      
      acknowledgeIssue: (buildId: string, issueId: string, justification: string) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          
          return { builds: { ...state.builds, [buildId]: { ...build, validationSummary: { ...build.validationSummary, criticalIssues: build.validationSummary.criticalIssues.map(i => i.id === issueId ? { ...i, acknowledged: true, justification } : i) } } } };
        });
      },
      
      autoFixIssues: async () => { await new Promise(r => setTimeout(r, 1000)); return 0; },
      
      // Backbone Generation
      generateBackbone: async (buildId: string, config?: BackboneConfig) => {
        const build = get().builds[buildId];
        if (!build) throw new Error('Build not found');
        
        set({ isGeneratingBackbone: true });
        await new Promise(r => setTimeout(r, 2000));
        
        const defaultConfig: BackboneConfig = { outputFormat: 'xml', includeOptionalElements: true, includeEmptySections: false, validateOnGenerate: true, generateChecksums: true, checksumAlgorithm: 'sha256', prettyPrint: true, indentation: 2 };
        const finalConfig = { ...defaultConfig, ...config };
        
        const xml = generateBackboneXML(build, finalConfig);
        const backbone: GeneratedBackbone = { xml, fileName: 'index.xml', fileSize: xml.length, checksum: generateChecksum(), checksumType: finalConfig.checksumAlgorithm, generatedAt: new Date().toISOString(), leafCount: build.assignedLeaves, structure: { totalModules: 5, totalSections: 20, totalLeaves: build.assignedLeaves, documentsByType: { pdf: build.assignedLeaves }, operationsByType: { new: build.assignedLeaves, replace: 0, append: 0, delete: 0 } } };
        
        set(state => ({ isGeneratingBackbone: false, builds: { ...state.builds, [buildId]: { ...state.builds[buildId], buildProgress: { ...state.builds[buildId].buildProgress, phase: 'backbone-generation' as BuildPhase, percentComplete: 80 } } } }));
        
        return { success: true, backbone, errors: [], warnings: [], generationTime: 2000 };
      },
      
      previewBackbone: (buildId: string) => {
        const build = get().builds[buildId];
        if (!build) return '';
        return generateBackboneXML(build, { outputFormat: 'xml', includeOptionalElements: true, includeEmptySections: false, validateOnGenerate: false, generateChecksums: false, checksumAlgorithm: 'sha256', prettyPrint: true, indentation: 2 });
      },
      
      // Publishing
      createPackage: async (buildId: string, channel: PublishingChannel) => {
        const build = get().builds[buildId];
        if (!build) throw new Error('Build not found');
        
        set({ isPublishing: true });
        await new Promise(r => setTimeout(r, 2000));
        
        const pkg: PublishingPackage = { id: generateId('pkg'), sequenceBuildId: buildId, packageName: `${build.applicationNumber}_${build.sequenceNumber}.zip`, files: [], totalSize: 0, fileCount: build.assignedLeaves + 1, format: 'zip', compressed: true, encrypted: false, status: 'ready', createdAt: new Date().toISOString(), createdBy: 'current-user', submissionChannel: channel, gatewayRegion: build.targetAgency };
        
        set({ isPublishing: false });
        return pkg;
      },
      
      exportPackage: async () => { await new Promise(r => setTimeout(r, 1000)); return new Blob([''], { type: 'application/zip' }); },
      
      // Templates
      saveAsTemplate: (buildId: string, name: string, description: string) => {
        const build = get().builds[buildId];
        if (!build) throw new Error('Build not found');
        
        const template: SequenceTemplate = { id: generateId('tpl'), name, description, submissionType: build.submissionType, submissionSubType: build.submissionSubType, ectdVersion: build.ectdVersion, targetRegion: build.regionalVariant, requiredSections: [], suggestedSections: [], documentMappings: [], defaultMetadata: {}, usageCount: 0, createdBy: 'current-user', createdAt: new Date().toISOString() };
        
        set(state => ({ templates: { ...state.templates, [template.id]: template } }));
        return template;
      },
      
      applyTemplate: (buildId: string, templateId: string) => {
        const template = get().templates[templateId];
        if (!template) throw new Error('Template not found');
        set(state => ({ templates: { ...state.templates, [templateId]: { ...template, usageCount: template.usageCount + 1, lastUsed: new Date().toISOString() } } }));
      },
      
      // Comparison
      compareSequences: (baseBuildId: string, compareBuildId: string) => {
        const comparison: SequenceComparison = { baseSequence: baseBuildId, compareSequence: compareBuildId, addedLeaves: [], removedLeaves: [], modifiedLeaves: [], unchangedLeaves: [], addedSections: [], removedSections: [], modifiedSections: [], documentDiffs: [] };
        set({ activeComparison: comparison });
        return comparison;
      },
      
      clearComparison: () => set({ activeComparison: null }),
      
      // Metadata
      updateApplicationMetadata: (buildId: string, metadata: Partial<ApplicationMetadata>) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          return { builds: { ...state.builds, [buildId]: { ...build, applicationMetadata: { ...build.applicationMetadata, ...metadata } } } };
        });
      },
      
      updateSubmissionMetadata: (buildId: string, metadata: Partial<SubmissionMetadata>) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          return { builds: { ...state.builds, [buildId]: { ...build, submissionMetadata: { ...build.submissionMetadata, ...metadata } } } };
        });
      },
      
      updateBuildStatus: (buildId: string, status: SequenceBuildStatus) => {
        set(state => {
          const build = state.builds[buildId];
          if (!build) return state;
          return { builds: { ...state.builds, [buildId]: { ...build, status } } };
        });
      },
      
      // UI
      setView: (view: ECTDBuildingView) => set({ view }),
      setFilters: (filters: Partial<ECTDBuildingFilters>) => set(state => ({ filters: { ...state.filters, ...filters } })),
      toggleSection: (sectionId: string) => set(state => { const newExpanded = new Set(state.expandedSections); newExpanded.has(sectionId) ? newExpanded.delete(sectionId) : newExpanded.add(sectionId); return { expandedSections: newExpanded }; }),
      selectLeaf: (leafId: string | null) => set({ selectedLeafId: leafId })
    })),
    { name: 'ectd-building-store' }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useSelectedBuild = () => {
  const selectedId = useECTDBuildingStore(s => s.selectedBuildId);
  const builds = useECTDBuildingStore(s => s.builds);
  return selectedId ? builds[selectedId] : null;
};

export const useBuildList = () => {
  const builds = useECTDBuildingStore(s => s.builds);
  return useMemo(() => Object.values(builds), [builds]);
};

export const useTemplateList = () => {
  const templates = useECTDBuildingStore(s => s.templates);
  return useMemo(() => Object.values(templates), [templates]);
};

export const useBuildValidation = (buildId: string) => {
  const builds = useECTDBuildingStore(s => s.builds);
  return builds[buildId]?.validationSummary || null;
};

export const useBuildProgress = (buildId: string) => {
  const builds = useECTDBuildingStore(s => s.builds);
  return builds[buildId]?.buildProgress || null;
};

export const useExpandedSections = () => useECTDBuildingStore(s => s.expandedSections);
export const useBuildingFilters = () => useECTDBuildingStore(s => s.filters);
export const useBuildingView = () => useECTDBuildingStore(s => s.view);
export const useIsValidating = () => useECTDBuildingStore(s => s.isValidating);
export const useIsGeneratingBackbone = () => useECTDBuildingStore(s => s.isGeneratingBackbone);
