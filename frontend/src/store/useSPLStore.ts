

import { create } from 'zustand';
import {
  SPLDocument,
  SPLDocumentType,
  SPLDocumentStatus,
  SPLComponent,
  SPLSubject,
  SPLIngredient,
  SPLAuthor,
  SPLValidationResult,
  SPLValidationError,
  SPLValidationWarning,
  SPLRenderOptions,
  SPLRenderedOutput,
  SPLView,
  SPLState,
  SPLActions,
  DailyMedSearchResult,
  SPL_SECTION_TEMPLATES,
} from './splTypes';

// ============================================================================
// SPL STORE - FDA Structured Product Labeling Management
// ============================================================================
// Manages SPL document lifecycle: creation, editing, validation, rendering,
// and DailyMed integration for pharmaceutical labeling compliance.
// ============================================================================

type SPLStore = SPLState & SPLActions;

const generateId = () => `spl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createDefaultDocument = (data: Partial<SPLDocument>): SPLDocument => ({
  id: generateId(),
  setId: data.setId || `set-${Date.now()}`,
  versionNumber: data.versionNumber || 1,
  documentType: data.documentType || 'prescription-drug-label',
  title: data.title || 'Untitled SPL Document',
  effectiveTime: data.effectiveTime || new Date().toISOString(),
  author: data.author || {
    id: 'author-1',
    name: 'Ligature Pharma',
    dunsNumber: '000000000',
    addr: { streetAddressLine: [], city: '', postalCode: '', country: 'US', countryCode: 'US' },
  } as SPLAuthor,
  subjects: data.subjects || [],
  components: data.components || [],
  languageCode: data.languageCode || 'en',
  realmCode: data.realmCode || 'US',
  status: data.status || 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: data.createdBy || 'system',
  ...data,
});

export const useSPLStore = create<SPLStore>((set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  documents: {},
  documentsBySetId: {},
  documentsByProductId: {},
  documentsByLabeler: {},
  validationResults: {},
  renderedOutputs: {},
  selectedDocumentId: null,
  activeView: 'documents',
  isLoading: false,
  error: null,
  lastDailyMedSync: null,
  syncStatus: 'idle',

  // ==========================================================================
  // DOCUMENT CRUD
  // ==========================================================================
  createDocument: (data) => {
    const doc = createDefaultDocument(data);
    set((state) => {
      const documents = { ...state.documents, [doc.id]: doc };
      const documentsBySetId = { ...state.documentsBySetId };
      documentsBySetId[doc.setId] = [...(documentsBySetId[doc.setId] || []), doc.id];
      return { documents, documentsBySetId };
    });
    return doc;
  },

  updateDocument: (id, updates) => {
    set((state) => {
      const doc = state.documents[id];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [id]: { ...doc, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  deleteDocument: (id) => {
    set((state) => {
      const { [id]: removed, ...documents } = state.documents;
      if (!removed) return state;
      const documentsBySetId = { ...state.documentsBySetId };
      if (documentsBySetId[removed.setId]) {
        documentsBySetId[removed.setId] = documentsBySetId[removed.setId].filter((did) => did !== id);
      }
      return {
        documents,
        documentsBySetId,
        selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
      };
    });
  },

  // ==========================================================================
  // VERSION MANAGEMENT
  // ==========================================================================
  createNewVersion: (setId) => {
    const state = get();
    const existingIds = state.documentsBySetId[setId] || [];
    const existingDocs = existingIds.map((id) => state.documents[id]).filter(Boolean);
    const maxVersion = existingDocs.reduce((max, d) => Math.max(max, d.versionNumber), 0);
    const latestDoc = existingDocs.find((d) => d.versionNumber === maxVersion);

    const newDoc = createDefaultDocument({
      ...(latestDoc || {}),
      id: undefined as unknown as string,
      setId,
      versionNumber: maxVersion + 1,
      status: 'draft',
    });

    set((state) => {
      const documents = { ...state.documents, [newDoc.id]: newDoc };
      const documentsBySetId = { ...state.documentsBySetId };
      documentsBySetId[setId] = [...(documentsBySetId[setId] || []), newDoc.id];
      return { documents, documentsBySetId };
    });

    return newDoc;
  },

  getVersionHistory: (setId) => {
    const state = get();
    const ids = state.documentsBySetId[setId] || [];
    return ids
      .map((id) => state.documents[id])
      .filter(Boolean)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  },

  // ==========================================================================
  // SECTION MANAGEMENT
  // ==========================================================================
  addSection: (documentId, section) => {
    const newSection: SPLComponent = {
      id: generateId(),
      sectionCode: section.sectionCode || 'DESCRIPTION',
      title: section.title || 'New Section',
      text: section.text || { content: '' },
      effectiveTime: { low: new Date().toISOString() },
      components: section.components || [],
      displayOrder: 0,
    };

    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            components: [...doc.components, newSection],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });

    return newSection;
  },

  updateSection: (documentId, sectionId, updates) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            components: doc.components.map((s) =>
              s.id === sectionId ? { ...s, ...updates } : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeSection: (documentId, sectionId) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            components: doc.components.filter((s) => s.id !== sectionId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  reorderSections: (documentId, sectionIds) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      const sectionMap = new Map(doc.components.map((s) => [s.id, s]));
      const reordered = sectionIds.map((id) => sectionMap.get(id)).filter(Boolean) as SPLComponent[];
      return {
        documents: {
          ...state.documents,
          [documentId]: { ...doc, components: reordered, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  // ==========================================================================
  // SUBJECT / PRODUCT MANAGEMENT
  // ==========================================================================
  addSubject: (documentId, subject) => {
    const newSubject: SPLSubject = {
      id: generateId(),
      manufacturedProduct: subject.manufacturedProduct || {
        id: generateId(),
        name: 'New Product',
        manufacturedProductCode: { code: '', codeSystem: '2.16.840.1.113883.6.69', displayName: '', codeSystemName: 'NDC' },
        labelerName: '',
        labelerDunsNumber: '',
        formCode: { code: '', codeSystem: '2.16.840.1.113883.3.26.1.1', displayName: '', codeSystemName: 'NCI Thesaurus' },
        routeCode: [],
      },
      ingredients: subject.ingredients || [],
      ...(subject as SPLSubject),
    };

    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: [...doc.subjects, newSubject],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });

    return newSubject;
  },

  updateSubject: (documentId, subjectId, updates) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: doc.subjects.map((s) =>
              s.id === subjectId ? { ...s, ...updates } : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeSubject: (documentId, subjectId) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: doc.subjects.filter((s) => s.id !== subjectId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // ==========================================================================
  // INGREDIENT MANAGEMENT
  // ==========================================================================
  addIngredient: (documentId, subjectId, ingredient) => {
    const newIngredient: SPLIngredient = {
      id: generateId(),
      classCode: ingredient.classCode || 'ACTIB',
      substanceName: (ingredient as any).name || ingredient.substanceName || 'New Ingredient',
      substanceCode: (ingredient as any).code || ingredient.substanceCode || { code: '', codeSystem: '2.16.840.1.113883.4.9', displayName: '', codeSystemName: 'UNII' },
      quantity: ingredient.quantity || {
        numerator: { value: 0, unit: 'mg' },
        denominator: { value: 1, unit: '1' },
      },
      activeMoiety: ingredient.activeMoiety,
      ...(ingredient as SPLIngredient),
    };

    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: doc.subjects.map((s) =>
              s.id === subjectId
                ? { ...s, ingredients: [...s.ingredients, newIngredient] }
                : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });

    return newIngredient;
  },

  updateIngredient: (documentId, subjectId, ingredientId, updates) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: doc.subjects.map((s) =>
              s.id === subjectId
                ? {
                    ...s,
                    ingredients: s.ingredients.map((i) =>
                      i.id === ingredientId ? { ...i, ...updates } : i
                    ),
                  }
                : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeIngredient: (documentId, subjectId, ingredientId) => {
    set((state) => {
      const doc = state.documents[documentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [documentId]: {
            ...doc,
            subjects: doc.subjects.map((s) =>
              s.id === subjectId
                ? { ...s, ingredients: s.ingredients.filter((i) => i.id !== ingredientId) }
                : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  validateDocument: (documentId) => {
    const state = get();
    const doc = state.documents[documentId];
    const errors: SPLValidationError[] = [];
    const warnings: SPLValidationWarning[] = [];

    if (!doc) {
      const result: SPLValidationResult = {
        documentId,
        isValid: false,
        schemaErrors: [{ code: 'DOC_NOT_FOUND', message: 'Document not found', severity: 'error', path: '' }],
        businessRuleErrors: [],
        warnings: [],
        validatedAt: new Date().toISOString(),
      };
      set((state) => ({
        validationResults: { ...state.validationResults, [documentId]: result },
      }));
      return result;
    }

    // Required field checks
    if (!doc.title) errors.push({ code: 'MISSING_TITLE', message: 'Document title is required', severity: 'error', path: 'title' });
    if (!doc.author?.name) errors.push({ code: 'MISSING_AUTHOR', message: 'Author name is required', severity: 'error', path: 'author.name' });
    if (doc.subjects.length === 0) warnings.push({ code: 'NO_SUBJECTS', message: 'Document has no product subjects', severity: 'warning', path: 'subjects' });
    if (doc.components.length === 0) warnings.push({ code: 'NO_SECTIONS', message: 'Document has no content sections', severity: 'warning', path: 'components' });

    // Check required sections based on document type
    if (doc.documentType === 'prescription-drug-label') {
      const requiredSections = ['description', 'clinical-pharmacology', 'indications-usage', 'dosage-administration'];
      const existingCodes = doc.components.map((c) => c.sectionCode);
      for (const code of requiredSections) {
        if (!existingCodes.includes(code as any)) {
          warnings.push({
            code: 'MISSING_REQUIRED_SECTION',
            message: `Required section "${code}" is missing`,
            severity: 'warning',
            path: `components.${code}`,
          });
        }
      }
    }

    const result: SPLValidationResult = {
      documentId,
      isValid: errors.length === 0,
      schemaErrors: errors,
      businessRuleErrors: [],
      warnings,
      validatedAt: new Date().toISOString(),
    };

    set((state) => ({
      validationResults: { ...state.validationResults, [documentId]: result },
    }));

    return result;
  },

  validateAgainstDailyMed: async (documentId) => {
    set({ isLoading: true });
    // Simulated async validation
    const result = get().validateDocument(documentId);
    set({ isLoading: false });
    return result;
  },

  // ==========================================================================
  // RENDERING
  // ==========================================================================
  renderDocument: async (documentId, options) => {
    set({ isLoading: true });
    const doc = get().documents[documentId];
    const output: SPLRenderedOutput = {
      documentId,
      format: options.format || 'xml',
      content: doc ? `<!-- SPL XML for ${doc.title} -->` : '',
      generatedAt: new Date().toISOString(),
      fileSize: 0,
    };
    output.fileSize = new Blob([output.content]).size;

    set((state) => ({
      renderedOutputs: { ...state.renderedOutputs, [documentId]: output },
      isLoading: false,
    }));

    return output;
  },

  exportToXML: (documentId) => {
    const doc = get().documents[documentId];
    if (!doc) return '';
    return `<?xml version="1.0" encoding="UTF-8"?>\n<document xmlns="urn:hl7-org:v3">\n  <id root="${doc.setId}"/>\n  <title>${doc.title}</title>\n</document>`;
  },

  generatePreview: (documentId) => {
    const doc = get().documents[documentId];
    if (!doc) return '';
    return `<html><body><h1>${doc.title}</h1></body></html>`;
  },

  // ==========================================================================
  // IMPORT
  // ==========================================================================
  importFromXML: (xml) => {
    const doc = createDefaultDocument({ title: 'Imported SPL Document' });
    set((state) => ({
      documents: { ...state.documents, [doc.id]: doc },
    }));
    return doc;
  },

  importFromDailyMed: async (setId) => {
    set({ isLoading: true, syncStatus: 'syncing' });
    const doc = createDefaultDocument({ setId, title: `DailyMed Import: ${setId}` });
    set((state) => ({
      documents: { ...state.documents, [doc.id]: doc },
      isLoading: false,
      syncStatus: 'idle',
      lastDailyMedSync: new Date().toISOString(),
    }));
    return doc;
  },

  // ==========================================================================
  // CROSS-MODULE INTEGRATION — v0.42.45
  // ==========================================================================
  linkToLabeling: (splDocumentId, labelingId) => {
    set((state) => {
      const doc = state.documents[splDocumentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [splDocumentId]: { ...doc, linkedLabelingId: labelingId, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  linkToMedicinalProduct: (splDocumentId, mpId) => {
    set((state) => {
      const doc = state.documents[splDocumentId];
      if (!doc) return state;
      return {
        documents: {
          ...state.documents,
          [splDocumentId]: { ...doc, linkedMedicinalProductId: mpId, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  syncFromLabeling: (labelingId) => {
    const doc = createDefaultDocument({
      title: `Synced from Labeling: ${labelingId}`,
      linkedLabelingId: labelingId,
    });
    set((state) => ({
      documents: { ...state.documents, [doc.id]: doc },
    }));
    return doc;
  },

  getLinkedLabelingSummary: (splDocumentId) => {
    const doc = get().documents[splDocumentId];
    if (!doc?.linkedLabelingId) return null;
    return {
      splDocumentId,
      linkedLabelingId: doc.linkedLabelingId,
      linkedAt: doc.updatedAt,
      splSectionCount: doc.components?.length || 0,
    };
  },

  // ==========================================================================
  // DAILYMED INTEGRATION
  // ==========================================================================
  searchDailyMed: async (query) => {
    // Simulated search results
    return [
      {
        setId: `dailymed-${Date.now()}`,
        title: `Search result for "${query}"`,
        labelerName: 'Sample Labeler',
        productNames: [query],
        ndc: [],
        publishedDate: new Date().toISOString(),
      },
    ];
  },

  fetchFromDailyMed: async (setId) => {
    return get().importFromDailyMed(setId);
  },

  // ==========================================================================
  // UI ACTIONS
  // ==========================================================================
  setSelectedDocument: (id) => set({ selectedDocumentId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ==========================================================================
  // DATA MANAGEMENT
  // ==========================================================================
  loadMockData: () => {
    const mockDoc = createDefaultDocument({
      title: 'NEXAVANT™ (nexavantinib) Tablets – Prescribing Information',
      documentType: 'prescription-drug-label',
      applicationNumber: 'NDA-214523',
      status: 'approved',
      components: [
        {
          id: 'sec-1',
          sectionCode: 'DESCRIPTION' as const,
          title: 'DESCRIPTION',
          text: { content: 'NEXAVANT contains nexavantinib, a kinase inhibitor.' },
          effectiveTime: { low: new Date().toISOString() },
          displayOrder: 1,
        },
        {
          id: 'sec-2',
          sectionCode: 'INDICATIONS_USAGE' as const,
          title: 'INDICATIONS AND USAGE',
          text: { content: 'NEXAVANT is indicated for the treatment of...' },
          effectiveTime: { low: new Date().toISOString() },
          displayOrder: 2,
        },
      ],
    });

    set({
      documents: { [mockDoc.id]: mockDoc },
      documentsBySetId: { [mockDoc.setId]: [mockDoc.id] },
    });
  },

  clearAll: () => set({
    documents: {},
    documentsBySetId: {},
    documentsByProductId: {},
    documentsByLabeler: {},
    validationResults: {},
    renderedOutputs: {},
    selectedDocumentId: null,
    activeView: 'documents',
    isLoading: false,
    error: null,
    lastDailyMedSync: null,
    syncStatus: 'idle',
  }),
}));
