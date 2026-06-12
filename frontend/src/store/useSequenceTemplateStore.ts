

// =============================================================================
// SEQUENCE TEMPLATE STORE - v0.9.17a
// =============================================================================
// Zustand store for managing sequence templates. Supports built-in templates,
// custom user templates, and applying templates to create new sequences.
// =============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  SequenceTemplate,
  TemplateModule,
  TemplateSection,
  DocumentPlaceholder,
} from './ectd-sequence-template-types';
import {
  BUILT_IN_TEMPLATES,
  generateTemplateId,
} from './ectd-sequence-template-types';
import type { RegulatoryRegion } from './ectd-regional-types';
import type { RegionalSubmissionType, SequenceType, ECTDSequence, ECTDModuleContent, ECTDSection, ECTDLeafDocument, ValidationIssue } from './ectd-publishing-types';
import { generateECTDId, CTD_MODULE_CONFIG } from './ectd-publishing-types';

// =============================================================================
// STATE INTERFACE
// =============================================================================

interface SequenceTemplateState {
  templates: Record<string, SequenceTemplate>;
  templateIndex: string[];
  selectedTemplateId: string | null;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// ACTIONS INTERFACE
// =============================================================================

interface SequenceTemplateActions {
  // Query
  getTemplate: (id: string) => SequenceTemplate | null;
  getTemplatesForRegion: (region: RegulatoryRegion) => SequenceTemplate[];
  getTemplatesForSubmissionType: (type: RegionalSubmissionType) => SequenceTemplate[];
  getTemplatesForSequenceType: (type: SequenceType) => SequenceTemplate[];
  getDefaultTemplate: (region: RegulatoryRegion) => SequenceTemplate | null;
  
  // Selection
  selectTemplate: (id: string | null) => void;
  
  // Custom template CRUD
  createCustomTemplate: (data: Partial<SequenceTemplate>) => SequenceTemplate;
  updateCustomTemplate: (id: string, updates: Partial<SequenceTemplate>) => void;
  deleteCustomTemplate: (id: string) => boolean;
  duplicateTemplate: (id: string, newName: string) => SequenceTemplate | null;
  
  // Template application
  applyTemplateToSequence: (templateId: string, sequenceId: string, applicationId: string) => {
    modules: ECTDModuleContent[];
    documents: ECTDLeafDocument[];
  } | null;
  
  // Create template from existing sequence
  createTemplateFromSequence: (
    sequence: ECTDSequence,
    name: string,
    description: string
  ) => SequenceTemplate;
  
  // Utilities
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: SequenceTemplateState = {
  templates: Object.fromEntries(BUILT_IN_TEMPLATES.map(t => [t.id, t])),
  templateIndex: BUILT_IN_TEMPLATES.map(t => t.id),
  selectedTemplateId: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useSequenceTemplateStore = create<SequenceTemplateState & SequenceTemplateActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // QUERY METHODS
      // =========================================================================

      getTemplate: (id) => {
        return get().templates[id] || null;
      },

      getTemplatesForRegion: (region) => {
        const { templates, templateIndex } = get();
        return templateIndex
          .map(id => templates[id])
          .filter(t => t && t.region === region);
      },

      getTemplatesForSubmissionType: (type) => {
        const { templates, templateIndex } = get();
        return templateIndex
          .map(id => templates[id])
          .filter(t => t && t.submissionTypes.includes(type));
      },

      getTemplatesForSequenceType: (type) => {
        const { templates, templateIndex } = get();
        return templateIndex
          .map(id => templates[id])
          .filter(t => t && t.sequenceType === type);
      },

      getDefaultTemplate: (region) => {
        const { templates, templateIndex } = get();
        return templateIndex
          .map(id => templates[id])
          .find(t => t && t.region === region && t.isDefault) || null;
      },

      // =========================================================================
      // SELECTION
      // =========================================================================

      selectTemplate: (id) => {
        set({ selectedTemplateId: id });
      },

      // =========================================================================
      // CUSTOM TEMPLATE CRUD
      // =========================================================================

      createCustomTemplate: (data) => {
        const id = generateTemplateId.template();
        const now = new Date().toISOString();

        const template: SequenceTemplate = {
          id,
          name: data.name || 'New Template',
          description: data.description || '',
          region: data.region || 'US',
          sequenceType: data.sequenceType || 'original',
          submissionTypes: data.submissionTypes || [],
          modules: data.modules || [],
          isBuiltIn: false,
          tags: data.tags || [],
          createdAt: now,
          updatedAt: now,
          ...data,
        };

        set(state => ({
          templates: { ...state.templates, [id]: template },
          templateIndex: [...state.templateIndex, id],
        }));

        return template;
      },

      updateCustomTemplate: (id, updates) => {
        const template = get().templates[id];
        if (!template || template.isBuiltIn) return;

        set(state => ({
          templates: {
            ...state.templates,
            [id]: {
              ...template,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      deleteCustomTemplate: (id) => {
        const template = get().templates[id];
        if (!template || template.isBuiltIn) return false;

        set(state => {
          const { [id]: _, ...remaining } = state.templates;
          return {
            templates: remaining,
            templateIndex: state.templateIndex.filter(tid => tid !== id),
            selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
          };
        });

        return true;
      },

      duplicateTemplate: (id, newName) => {
        const original = get().templates[id];
        if (!original) return null;

        const newId = generateTemplateId.template();
        const now = new Date().toISOString();

        // Deep clone modules with new IDs
        const clonedModules: TemplateModule[] = original.modules.map(mod => ({
          ...mod,
          id: generateTemplateId.module(),
          sections: mod.sections.map(sec => cloneSection(sec)),
        }));

        const duplicate: SequenceTemplate = {
          ...original,
          id: newId,
          name: newName,
          isBuiltIn: false,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
          modules: clonedModules,
        };

        set(state => ({
          templates: { ...state.templates, [newId]: duplicate },
          templateIndex: [...state.templateIndex, newId],
        }));

        return duplicate;
      },

      // =========================================================================
      // TEMPLATE APPLICATION
      // =========================================================================

      applyTemplateToSequence: (templateId, sequenceId, applicationId) => {
        const template = get().templates[templateId];
        if (!template) return null;

        const modules: ECTDModuleContent[] = [];
        const documents: ECTDLeafDocument[] = [];
        const now = new Date().toISOString();

        for (const tMod of template.modules) {
          if (!tMod.included) continue;

          const moduleContentId = generateECTDId.module();
          const sections: ECTDSection[] = [];

          for (const tSec of tMod.sections) {
            const { section, sectionDocs } = convertTemplateSection(
              tSec,
              moduleContentId,
              sequenceId,
              tMod.moduleId,
              now
            );
            sections.push(section);
            documents.push(...sectionDocs);
          }

          modules.push({
            id: moduleContentId,
            sequenceId,
            moduleId: tMod.moduleId,
            title: CTD_MODULE_CONFIG[tMod.moduleId].title,
            sections,
            documentCount: documents.filter(d => 
              sections.some(s => s.id === d.sectionId)
            ).length,
            totalSizeBytes: 0,
            lastModified: now,
          });
        }

        return { modules, documents };
      },

      // =========================================================================
      // CREATE FROM SEQUENCE
      // =========================================================================

      createTemplateFromSequence: (sequence, name, description) => {
        const id = generateTemplateId.template();
        const now = new Date().toISOString();

        // Convert sequence modules to template modules
        const templateModules: TemplateModule[] = sequence.modules.map(mod => ({
          id: generateTemplateId.module(),
          moduleId: mod.moduleId,
          included: true,
          sections: mod.sections.map(sec => convertSectionToTemplate(sec)),
        }));

        const template: SequenceTemplate = {
          id,
          name,
          description,
          region: 'US', // Would need to derive from application
          sequenceType: sequence.sequenceType,
          submissionTypes: [],
          modules: templateModules,
          isBuiltIn: false,
          tags: ['custom', 'from-sequence'],
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          templates: { ...state.templates, [id]: template },
          templateIndex: [...state.templateIndex, id],
        }));

        return template;
      },

      // =========================================================================
      // UTILITIES
      // =========================================================================

      reset: () => set(initialState),
    }),
    { name: 'sequence-template-store' }
  )
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function cloneSection(section: TemplateSection): TemplateSection {
  return {
    ...section,
    id: generateTemplateId.section(),
    documentPlaceholders: section.documentPlaceholders.map(p => ({
      ...p,
      id: generateTemplateId.placeholder(),
    })),
    subsections: section.subsections?.map(cloneSection),
  };
}

function convertTemplateSection(
  tSec: TemplateSection,
  moduleContentId: string,
  sequenceId: string,
  moduleId: string,
  timestamp: string
): { section: ECTDSection; sectionDocs: ECTDLeafDocument[] } {
  const sectionId = generateECTDId.section();
  const sectionDocs: ECTDLeafDocument[] = [];

  // Create placeholder documents
  for (const placeholder of tSec.documentPlaceholders) {
    const doc: ECTDLeafDocument = {
      id: generateECTDId.document(),
      sectionId,
      title: placeholder.title,
      fileName: placeholder.suggestedFileName,
      filePath: `${moduleId}/${tSec.sectionNumber}/${placeholder.suggestedFileName}`,
      fileType: placeholder.fileType,
      fileSizeBytes: 0,
      checksum: '',
      checksumAlgorithm: 'sha256',
      checksumVerified: false,
      operation: placeholder.defaultOperation,
      languageCode: 'en',
      createdAt: timestamp,
      modifiedAt: timestamp,
      validationStatus: {
        isValid: false,
        lastChecked: timestamp,
        errors: 1,
        warnings: 0,
        issues: [{ 
          id: 'pending',
          ruleId: 'file-missing',
          ruleName: 'File Missing',
          severity: 'error',
          category: 'structure',
          message: 'Document file not yet uploaded',
          documentId: '',
          documentPath: placeholder.suggestedFileName,
          isResolved: false,
          isWaived: false,
        }],
      },
    };
    sectionDocs.push(doc);
  }

  const section: ECTDSection = {
    id: sectionId,
    moduleContentId,
    sectionNumber: tSec.sectionNumber,
    sectionTitle: tSec.sectionTitle,
    documents: sectionDocs,
    displayOrder: parseInt(tSec.sectionNumber.replace(/\D/g, '')) || 0,
    isRequired: tSec.isRequired,
  };

  return { section, sectionDocs };
}

function convertSectionToTemplate(section: ECTDSection): TemplateSection {
  return {
    id: generateTemplateId.section(),
    sectionNumber: section.sectionNumber,
    sectionTitle: section.sectionTitle,
    isRequired: section.isRequired,
    documentPlaceholders: section.documents.map(doc => ({
      id: generateTemplateId.placeholder(),
      title: doc.title,
      suggestedFileName: doc.fileName,
      fileType: doc.fileType,
      isRequired: true,
      defaultOperation: doc.operation,
    })),
    subsections: section.subsections?.map(convertSectionToTemplate),
  };
}

// =============================================================================
// SELECTORS
// =============================================================================

export const useSelectedTemplate = () => {
  const selectedId = useSequenceTemplateStore(s => s.selectedTemplateId);
  const templates = useSequenceTemplateStore(s => s.templates);
  return selectedId ? templates[selectedId] : null;
};

export const useTemplateList = () => {
  const templates = useSequenceTemplateStore(s => s.templates);
  const index = useSequenceTemplateStore(s => s.templateIndex);
  return useMemo(() => index.map(id => templates[id]).filter(Boolean), [templates, index]);
};

export const useBuiltInTemplates = () => {
  const templates = useSequenceTemplateStore(s => s.templates);
  const index = useSequenceTemplateStore(s => s.templateIndex);
  return useMemo(
    () => index.map(id => templates[id]).filter(t => t?.isBuiltIn),
    [templates, index]
  );
};

export const useCustomTemplates = () => {
  const templates = useSequenceTemplateStore(s => s.templates);
  const index = useSequenceTemplateStore(s => s.templateIndex);
  return useMemo(
    () => index.map(id => templates[id]).filter(t => t && !t.isBuiltIn),
    [templates, index]
  );
};

export const useTemplatesForRegion = (region: RegulatoryRegion) => {
  const templates = useSequenceTemplateStore(s => s.templates);
  const index = useSequenceTemplateStore(s => s.templateIndex);
  return useMemo(
    () => index.map(id => templates[id]).filter(t => t?.region === region),
    [templates, index, region]
  );
};
