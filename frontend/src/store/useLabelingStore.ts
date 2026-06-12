

import { create } from 'zustand';

// ============================================================================
// LABELING STORE - Pharmaceutical Product Labeling Management
// ============================================================================
// Manages the full labeling lifecycle: USPI/SmPC/PIL authoring, version control,
// labeling negotiations with health authorities, cross-region harmonization,
// and integration with SPL generation and regulatory submissions.
// ============================================================================

export type LabelingView = 'dashboard' | 'documents' | 'sections' | 'negotiations' | 'harmonization' | 'history';

export type LabelRegion = 'US' | 'EU' | 'JP' | 'CN' | 'CA' | 'AU' | 'BR' | 'KR' | 'Global';
export type LabelType = 'USPI' | 'SmPC' | 'PIL' | 'CCDS' | 'Core-Data-Sheet' | 'Package-Insert' | 'Medication-Guide';
export type LabelStatus = 'draft' | 'internal-review' | 'ha-negotiation' | 'approved' | 'effective' | 'superseded' | 'withdrawn';
export type SectionStatus = 'unchanged' | 'modified' | 'new' | 'deleted' | 'under-review' | 'ha-requested';
export type NegotiationStatus = 'open' | 'proposed' | 'counter-proposed' | 'agreed' | 'rejected' | 'withdrawn';

export interface LabelDocument {
  id: string;
  productId: string;
  productName: string;
  type: LabelType;
  region: LabelRegion;
  version: string;
  status: LabelStatus;
  effectiveDate: string | null;
  sections: LabelSection[];
  linkedSPLId: string | null;
  linkedSubmissionId: string | null;
  parentCCDSId: string | null;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
}

export interface LabelSection {
  id: string;
  sectionNumber: string;
  title: string;
  content: string;
  status: SectionStatus;
  ccdsSectionId: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: string;
  changeJustification: string | null;
  annotations: LabelAnnotation[];
}

export interface LabelAnnotation {
  id: string;
  type: 'comment' | 'ha-request' | 'safety-update' | 'consistency-flag';
  content: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface LabelNegotiation {
  id: string;
  labelId: string;
  sectionId: string;
  healthAuthority: string;
  region: LabelRegion;
  status: NegotiationStatus;
  currentProposal: string;
  haPosition: string | null;
  sponsorPosition: string;
  rounds: NegotiationRound[];
  deadline: string | null;
  createdAt: string;
}

export interface NegotiationRound {
  id: string;
  roundNumber: number;
  proposedBy: 'sponsor' | 'ha';
  proposedText: string;
  rationale: string;
  date: string;
}

export interface HarmonizationMapping {
  id: string;
  ccdsId: string;
  ccdsSectionId: string;
  localLabelId: string;
  localSectionId: string;
  region: LabelRegion;
  syncStatus: 'in-sync' | 'out-of-sync' | 'local-deviation' | 'pending-review';
  lastSyncedAt: string;
  deviationReason: string | null;
}

interface LabelingState {
  activeView: LabelingView;
  selectedLabelId: string | null;
  labels: Record<string, LabelDocument>;
  negotiations: Record<string, LabelNegotiation>;
  harmonizationMappings: Record<string, HarmonizationMapping>;
  isLoading: boolean;
  error: string | null;
}

interface LabelingActions {
  setActiveView: (view: LabelingView) => void;
  setSelectedLabel: (id: string | null) => void;

  // Label CRUD
  createLabel: (data: Partial<LabelDocument>) => LabelDocument;
  updateLabel: (id: string, updates: Partial<LabelDocument>) => void;
  deleteLabel: (id: string) => void;
  approveLabel: (id: string, approvedBy: string) => void;
  createNewVersion: (id: string) => LabelDocument;

  // Section management
  addSection: (labelId: string, section: Partial<LabelSection>) => void;
  updateSection: (labelId: string, sectionId: string, updates: Partial<LabelSection>) => void;
  removeSection: (labelId: string, sectionId: string) => void;
  addAnnotation: (labelId: string, sectionId: string, annotation: Partial<LabelAnnotation>) => void;
  resolveAnnotation: (labelId: string, sectionId: string, annotationId: string) => void;

  // Negotiation management
  createNegotiation: (data: Partial<LabelNegotiation>) => LabelNegotiation;
  addNegotiationRound: (negId: string, round: Partial<NegotiationRound>) => void;
  resolveNegotiation: (negId: string, status: 'agreed' | 'rejected' | 'withdrawn') => void;

  // Harmonization
  createMapping: (data: Partial<HarmonizationMapping>) => HarmonizationMapping;
  syncFromCCDS: (mappingId: string) => void;
  flagDeviation: (mappingId: string, reason: string) => void;
  getOutOfSyncMappings: () => HarmonizationMapping[];

  // Queries
  getLabelsByProduct: (productId: string) => LabelDocument[];
  getLabelsByRegion: (region: LabelRegion) => LabelDocument[];
  getNegotiationsByLabel: (labelId: string) => LabelNegotiation[];
  getOpenNegotiations: () => LabelNegotiation[];
  getSectionDiff: (labelId: string) => { modified: number; new_: number; deleted: number; unchanged: number };

  // Cross-module
  linkToSPL: (labelId: string, splId: string) => void;
  linkToSubmission: (labelId: string, submissionId: string) => void;
  syncFromSPL: (labelId: string, splId: string) => void;
  getLinkedSPLSummary: (labelId: string) => { labelId: string; linkedSPLId: string; linkedAt: string; sectionCount: number } | null;

  // Data management
  loadMockData: () => void;
  clearAll: () => void;
}

type LabelingStore = LabelingState & LabelingActions;

const generateId = () => `lbl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useLabelingStore = create<LabelingStore>((set, get) => ({
  // State
  activeView: 'dashboard',
  selectedLabelId: null,
  labels: {},
  negotiations: {},
  harmonizationMappings: {},
  isLoading: false,
  error: null,

  // View
  setActiveView: (view) => set({ activeView: view }),
  setSelectedLabel: (id) => set({ selectedLabelId: id }),

  // Label CRUD
  createLabel: (data) => {
    const label: LabelDocument = {
      id: generateId(),
      productId: data.productId || '',
      productName: data.productName || 'Unnamed Product',
      type: data.type || 'USPI',
      region: data.region || 'US',
      version: data.version || '1.0',
      status: 'draft',
      effectiveDate: null,
      sections: data.sections || [],
      linkedSPLId: data.linkedSPLId || null,
      linkedSubmissionId: data.linkedSubmissionId || null,
      parentCCDSId: data.parentCCDSId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: null,
    };
    set((state) => ({ labels: { ...state.labels, [label.id]: label } }));
    return label;
  },

  updateLabel: (id, updates) => {
    set((state) => {
      const label = state.labels[id];
      if (!label) return state;
      return { labels: { ...state.labels, [id]: { ...label, ...updates, updatedAt: new Date().toISOString() } } };
    });
  },

  deleteLabel: (id) => {
    set((state) => {
      const { [id]: _, ...labels } = state.labels;
      return { labels, selectedLabelId: state.selectedLabelId === id ? null : state.selectedLabelId };
    });
  },

  approveLabel: (id, approvedBy) => {
    set((state) => {
      const label = state.labels[id];
      if (!label) return state;
      return {
        labels: { ...state.labels, [id]: { ...label, status: 'approved', approvedBy, updatedAt: new Date().toISOString() } },
      };
    });
  },

  createNewVersion: (id) => {
    const original = get().labels[id];
    const newLabel: LabelDocument = {
      ...(original || {
        id: '', productId: '', productName: '', type: 'USPI' as LabelType, region: 'US' as LabelRegion,
        sections: [], linkedSPLId: null, linkedSubmissionId: null, parentCCDSId: null, approvedBy: null,
        effectiveDate: null,
      }),
      id: generateId(),
      version: original ? `${(parseFloat(original.version) + 1).toFixed(0)}.0` : '2.0',
      status: 'draft' as LabelStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: null,
    };
    set((state) => ({ labels: { ...state.labels, [newLabel.id]: newLabel } }));
    return newLabel;
  },

  // Section management
  addSection: (labelId, section) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      const newSection: LabelSection = {
        id: generateId(),
        sectionNumber: section.sectionNumber || '1',
        title: section.title || 'New Section',
        content: section.content || '',
        status: 'new',
        ccdsSectionId: section.ccdsSectionId || null,
        lastModifiedBy: null,
        lastModifiedAt: new Date().toISOString(),
        changeJustification: null,
        annotations: [],
      };
      return {
        labels: { ...state.labels, [labelId]: { ...label, sections: [...label.sections, newSection], updatedAt: new Date().toISOString() } },
      };
    });
  },

  updateSection: (labelId, sectionId, updates) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return {
        labels: {
          ...state.labels,
          [labelId]: {
            ...label,
            sections: label.sections.map((s) =>
              s.id === sectionId ? { ...s, ...updates, status: 'modified' as SectionStatus, lastModifiedAt: new Date().toISOString() } : s
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeSection: (labelId, sectionId) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return {
        labels: {
          ...state.labels,
          [labelId]: { ...label, sections: label.sections.filter((s) => s.id !== sectionId), updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  addAnnotation: (labelId, sectionId, annotation) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      const newAnnotation: LabelAnnotation = {
        id: generateId(),
        type: annotation.type || 'comment',
        content: annotation.content || '',
        author: annotation.author || 'system',
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      return {
        labels: {
          ...state.labels,
          [labelId]: {
            ...label,
            sections: label.sections.map((s) =>
              s.id === sectionId ? { ...s, annotations: [...s.annotations, newAnnotation] } : s
            ),
          },
        },
      };
    });
  },

  resolveAnnotation: (labelId, sectionId, annotationId) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return {
        labels: {
          ...state.labels,
          [labelId]: {
            ...label,
            sections: label.sections.map((s) =>
              s.id === sectionId
                ? { ...s, annotations: s.annotations.map((a) => a.id === annotationId ? { ...a, resolved: true } : a) }
                : s
            ),
          },
        },
      };
    });
  },

  // Negotiations
  createNegotiation: (data) => {
    const neg: LabelNegotiation = {
      id: generateId(),
      labelId: data.labelId || '',
      sectionId: data.sectionId || '',
      healthAuthority: data.healthAuthority || 'FDA',
      region: data.region || 'US',
      status: 'open',
      currentProposal: data.currentProposal || '',
      haPosition: data.haPosition || null,
      sponsorPosition: data.sponsorPosition || '',
      rounds: [],
      deadline: data.deadline || null,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ negotiations: { ...state.negotiations, [neg.id]: neg } }));
    return neg;
  },

  addNegotiationRound: (negId, round) => {
    set((state) => {
      const neg = state.negotiations[negId];
      if (!neg) return state;
      const newRound: NegotiationRound = {
        id: generateId(),
        roundNumber: neg.rounds.length + 1,
        proposedBy: round.proposedBy || 'sponsor',
        proposedText: round.proposedText || '',
        rationale: round.rationale || '',
        date: new Date().toISOString(),
      };
      return {
        negotiations: {
          ...state.negotiations,
          [negId]: {
            ...neg,
            rounds: [...neg.rounds, newRound],
            currentProposal: newRound.proposedText,
            status: newRound.proposedBy === 'ha' ? 'counter-proposed' : 'proposed',
          },
        },
      };
    });
  },

  resolveNegotiation: (negId, status) => {
    set((state) => {
      const neg = state.negotiations[negId];
      if (!neg) return state;
      return { negotiations: { ...state.negotiations, [negId]: { ...neg, status } } };
    });
  },

  // Harmonization
  createMapping: (data) => {
    const mapping: HarmonizationMapping = {
      id: generateId(),
      ccdsId: data.ccdsId || '',
      ccdsSectionId: data.ccdsSectionId || '',
      localLabelId: data.localLabelId || '',
      localSectionId: data.localSectionId || '',
      region: data.region || 'US',
      syncStatus: 'pending-review',
      lastSyncedAt: new Date().toISOString(),
      deviationReason: null,
    };
    set((state) => ({ harmonizationMappings: { ...state.harmonizationMappings, [mapping.id]: mapping } }));
    return mapping;
  },

  syncFromCCDS: (mappingId) => {
    set((state) => {
      const mapping = state.harmonizationMappings[mappingId];
      if (!mapping) return state;
      return {
        harmonizationMappings: {
          ...state.harmonizationMappings,
          [mappingId]: { ...mapping, syncStatus: 'in-sync', lastSyncedAt: new Date().toISOString(), deviationReason: null },
        },
      };
    });
  },

  flagDeviation: (mappingId, reason) => {
    set((state) => {
      const mapping = state.harmonizationMappings[mappingId];
      if (!mapping) return state;
      return {
        harmonizationMappings: {
          ...state.harmonizationMappings,
          [mappingId]: { ...mapping, syncStatus: 'local-deviation', deviationReason: reason },
        },
      };
    });
  },

  getOutOfSyncMappings: () => {
    return Object.values(get().harmonizationMappings).filter((m) => m.syncStatus === 'out-of-sync');
  },

  // Queries
  getLabelsByProduct: (productId) => Object.values(get().labels).filter((l) => l.productId === productId),
  getLabelsByRegion: (region) => Object.values(get().labels).filter((l) => l.region === region),
  getNegotiationsByLabel: (labelId) => Object.values(get().negotiations).filter((n) => n.labelId === labelId),
  getOpenNegotiations: () => Object.values(get().negotiations).filter((n) => n.status === 'open' || n.status === 'proposed' || n.status === 'counter-proposed'),

  getSectionDiff: (labelId) => {
    const label = get().labels[labelId];
    if (!label) return { modified: 0, new_: 0, deleted: 0, unchanged: 0 };
    const sections = label.sections;
    return {
      modified: sections.filter((s) => s.status === 'modified').length,
      new_: sections.filter((s) => s.status === 'new').length,
      deleted: sections.filter((s) => s.status === 'deleted').length,
      unchanged: sections.filter((s) => s.status === 'unchanged').length,
    };
  },

  // Cross-module — v0.42.45: Enhanced with bidirectional sync
  linkToSPL: (labelId, splId) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return { labels: { ...state.labels, [labelId]: { ...label, linkedSPLId: splId, updatedAt: new Date().toISOString() } } };
    });
  },

  linkToSubmission: (labelId, submissionId) => {
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return { labels: { ...state.labels, [labelId]: { ...label, linkedSubmissionId: submissionId, updatedAt: new Date().toISOString() } } };
    });
  },

  syncFromSPL: (labelId, splId) => {
    // Mark the label as linked; actual section mapping handled by bridge
    set((state) => {
      const label = state.labels[labelId];
      if (!label) return state;
      return {
        labels: {
          ...state.labels,
          [labelId]: {
            ...label,
            linkedSPLId: splId,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  getLinkedSPLSummary: (labelId) => {
    const label = get().labels[labelId];
    if (!label?.linkedSPLId) return null;
    return {
      labelId,
      linkedSPLId: label.linkedSPLId,
      linkedAt: label.updatedAt,
      sectionCount: label.sections.length,
    };
  },

  // Data management
  loadMockData: () => {
    const uspi = get().createLabel({
      productId: 'PROD-NXV',
      productName: 'NEXAVANT™ (nexavantinib)',
      type: 'USPI',
      region: 'US',
      sections: [
        { id: 'sec-1', sectionNumber: '1', title: 'INDICATIONS AND USAGE', content: 'NEXAVANT is indicated for...', status: 'unchanged' as SectionStatus, ccdsSectionId: 'ccds-1', lastModifiedBy: null, lastModifiedAt: new Date().toISOString(), changeJustification: null, annotations: [] },
        { id: 'sec-2', sectionNumber: '2', title: 'DOSAGE AND ADMINISTRATION', content: 'The recommended dose is...', status: 'modified' as SectionStatus, ccdsSectionId: 'ccds-2', lastModifiedBy: 'Dr. Smith', lastModifiedAt: new Date().toISOString(), changeJustification: 'Updated per Phase III results', annotations: [] },
      ],
    });
    get().createLabel({ productId: 'PROD-NXV', productName: 'NEXAVANT™', type: 'SmPC', region: 'EU', parentCCDSId: 'ccds-main' });
    get().createNegotiation({ labelId: uspi.id, sectionId: 'sec-2', healthAuthority: 'FDA', region: 'US', sponsorPosition: 'Recommend 200mg BID', currentProposal: 'Recommend 200mg BID' });
  },

  clearAll: () => set({
    activeView: 'dashboard',
    selectedLabelId: null,
    labels: {},
    negotiations: {},
    harmonizationMappings: {},
    isLoading: false,
    error: null,
  }),
}));

// ============================================================================
// LABELING SCREEN ARTWORK / SKU / TRANSLATION STORE
// ============================================================================
// Separate lightweight store for the artwork, SKU, and translation data
// managed by LabelingScreen. This keeps that data persistent across navigation.
// v0.44.15
// ============================================================================

export type ArtworkStatus =
  | 'draft' | 'design-review' | 'regulatory-review' | 'approved' | 'print-ready' | 'archived';

export interface LabelingArtworkItem {
  id: string; name: string; type: 'carton' | 'label' | 'insert' | 'blister' | 'bottle';
  product: string; productId: string; market: string; marketFlag: string;
  labelVersion: string; artworkVersion: string; status: ArtworkStatus;
  lastUpdated: string; designer: string; dimensions?: string; languages: string[];
}

export interface LabelingSKUItem {
  id: string; ndc: string; gtin: string; product: string; productId: string;
  description: string; strength: string; packSize: string; packType: string;
  market: string; marketFlag: string; labelVersion: string; artworkVersion: string;
  status: 'active' | 'pending' | 'discontinued'; launchDate?: string; components: string[];
}

export interface LabelingTranslation {
  language: string; languageCode: string; flag: string;
  status: 'complete' | 'in-progress' | 'pending' | 'not-started';
  progress: number; translator?: string;
}

interface LabelingScreenState {
  artworks: LabelingArtworkItem[];
  skus: LabelingSKUItem[];
  translations: LabelingTranslation[];
  _screenSeeded: boolean;
}

interface LabelingScreenActions {
  loadScreenSeedData: (
    artworks: LabelingArtworkItem[],
    skus: LabelingSKUItem[],
    translations: LabelingTranslation[]
  ) => void;
  addArtwork: (a: LabelingArtworkItem) => void;
  updateArtwork: (id: string, updates: Partial<LabelingArtworkItem>) => void;
  removeArtwork: (id: string) => void;
  addSKU: (s: LabelingSKUItem) => void;
  updateSKU: (id: string, updates: Partial<LabelingSKUItem>) => void;
  removeSKU: (id: string) => void;
  addTranslation: (t: LabelingTranslation) => void;
  updateTranslation: (languageCode: string, updates: Partial<LabelingTranslation>) => void;
}

export const useLabelingScreenStore = create<LabelingScreenState & LabelingScreenActions>((set, get) => ({
  artworks: [],
  skus: [],
  translations: [],
  _screenSeeded: false,

  loadScreenSeedData: (artworks, skus, translations) => {
    if (get()._screenSeeded) return;
    set({ artworks, skus, translations, _screenSeeded: true });
  },

  addArtwork: (a) => set((s) => ({ artworks: [...s.artworks, a] })),
  updateArtwork: (id, updates) =>
    set((s) => ({
      artworks: s.artworks.map((a) =>
        a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : a
      ),
    })),
  removeArtwork: (id) => set((s) => ({ artworks: s.artworks.filter((a) => a.id !== id) })),

  addSKU: (sk) => set((s) => ({ skus: [...s.skus, sk] })),
  updateSKU: (id, updates) =>
    set((s) => ({ skus: s.skus.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk)) })),
  removeSKU: (id) => set((s) => ({ skus: s.skus.filter((sk) => sk.id !== id) })),

  addTranslation: (t) => set((s) => ({ translations: [...s.translations, t] })),
  updateTranslation: (languageCode, updates) =>
    set((s) => ({
      translations: s.translations.map((t) =>
        t.languageCode === languageCode ? { ...t, ...updates } : t
      ),
    })),
}));

