
/**
 * useResearchStore
 *
 * Persistent Zustand store for the entire Research module.
 *
 * Slices:
 *   targets            — TargetProgram[]           (v0.44.15)
 *   studies            — PreclinicalStudy[]         (v0.44.15)
 *   leadSeries         — LeadSeries[]               (v0.90.0)
 *   translationalStudies — TranslationalStudy[]     (v0.90.0)
 *   biomarkerPanels    — BiomarkerPanel[]           (v0.90.0)
 *   safetyTranslations — SafetyTranslation[]        (v0.90.0)
 *
 * @version 0.90.0
 */

import { create } from 'zustand';
import type { TargetProgram, PreclinicalStudy } from '@/data/research-data';
import type { LeadSeries, CandidateSelectionSummary } from '@/data/lead-optimization-data';
import type { TranslationalStudy, BiomarkerPanel, SafetyTranslation } from '@/data/translational-data';

// ─── State ────────────────────────────────────────────────────────────────────

export interface NominationAuditEntry {
  id: string;
  seriesId: string;
  seriesNumber: string;
  nominatingScientist: string;
  nominationDate: string;
  tppAlignment: Record<string, boolean>;
  rationale: string;
  admetSummary: string;
  pinHash: string;
  role: string;
  timestamp: string;
}

interface ResearchState {
  targets: TargetProgram[];
  studies: PreclinicalStudy[];
  _seeded: boolean;
  leadSeries: LeadSeries[];
  candidateSelectionSummary: CandidateSelectionSummary | null;
  translationalStudies: TranslationalStudy[];
  biomarkerPanels: BiomarkerPanel[];
  safetyTranslations: SafetyTranslation[];
  nominationAuditLog: NominationAuditEntry[];
  _leadOptSeeded: boolean;
  _translationalSeeded: boolean;
}

interface ResearchActions {
  // v0.44.15 seed
  loadSeedData: (targets: TargetProgram[], studies: PreclinicalStudy[]) => void;
  // Targets
  addTarget: (target: TargetProgram) => void;
  updateTarget: (id: string, updates: Partial<TargetProgram>) => void;
  removeTarget: (id: string) => void;
  // Preclinical studies
  addStudy: (study: PreclinicalStudy) => void;
  updateStudy: (id: string, updates: Partial<PreclinicalStudy>) => void;
  removeStudy: (id: string) => void;
  // v0.90.0 Lead Opt seed
  loadLeadOptData: (series: LeadSeries[], summary: CandidateSelectionSummary | null) => void;
  // Lead Series
  addLeadSeries: (series: LeadSeries) => void;
  updateLeadSeries: (id: string, updates: Partial<LeadSeries>) => void;
  removeLeadSeries: (id: string) => void;
  setSeriesStatus: (id: string, status: LeadSeries['status'], reason?: string, rationale?: string) => void;
  updateCandidateSelectionSummary: (updates: Partial<CandidateSelectionSummary>) => void;
  // v0.90.0 Translational seed
  loadTranslationalData: (studies: TranslationalStudy[], panels: BiomarkerPanel[], translations: SafetyTranslation[]) => void;
  // Translational Studies
  addTranslationalStudy: (study: TranslationalStudy) => void;
  updateTranslationalStudy: (id: string, updates: Partial<TranslationalStudy>) => void;
  removeTranslationalStudy: (id: string) => void;
  // Biomarker Panels
  addBiomarkerPanel: (panel: BiomarkerPanel) => void;
  updateBiomarkerPanel: (id: string, updates: Partial<BiomarkerPanel>) => void;
  removeBiomarkerPanel: (id: string) => void;
  // Safety Translations
  updateSafetyTranslation: (id: string, updates: Partial<SafetyTranslation>) => void;
  // Nomination audit log (v0.125.58)
  addNominationAuditEntry: (entry: NominationAuditEntry) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useResearchStore = create<ResearchState & ResearchActions>((set, get) => ({
  targets: [], studies: [], _seeded: false,
  leadSeries: [], candidateSelectionSummary: null,
  translationalStudies: [], biomarkerPanels: [], safetyTranslations: [],
  nominationAuditLog: [],
  _leadOptSeeded: false, _translationalSeeded: false,

  loadSeedData: (targets, studies) => { if (get()._seeded) return; set({ targets, studies, _seeded: true }); },
  addTarget: (target) => set((s) => ({ targets: [target, ...s.targets] })),
  updateTarget: (id, updates) => set((s) => ({ targets: s.targets.map((t) => t.id === id ? { ...t, ...updates } : t) })),
  removeTarget: (id) => set((s) => ({ targets: s.targets.filter((t) => t.id !== id) })),

  addStudy: (study) => set((s) => ({ studies: [study, ...s.studies] })),
  updateStudy: (id, updates) => set((s) => ({ studies: s.studies.map((st) => st.id === id ? { ...st, ...updates } : st) })),
  removeStudy: (id) => set((s) => ({ studies: s.studies.filter((st) => st.id !== id) })),

  loadLeadOptData: (series, summary) => {
    if (get()._leadOptSeeded) return;
    set({ leadSeries: series, candidateSelectionSummary: summary, _leadOptSeeded: true });
  },
  addLeadSeries: (series) => set((s) => ({ leadSeries: [series, ...s.leadSeries] })),
  updateLeadSeries: (id, updates) => set((s) => ({ leadSeries: s.leadSeries.map((ls) => ls.id === id ? { ...ls, ...updates } : ls) })),
  removeLeadSeries: (id) => set((s) => ({ leadSeries: s.leadSeries.filter((ls) => ls.id !== id) })),
  setSeriesStatus: (id, status, reason, rationale) => set((s) => ({
    leadSeries: s.leadSeries.map((ls) => {
      if (ls.id !== id) return ls;
      return { ...ls, status, ...(reason !== undefined ? { deprioritizationReason: reason } : {}), ...(rationale !== undefined ? { selectionRationale: rationale } : {}) };
    }),
  })),
  updateCandidateSelectionSummary: (updates) => set((s) => ({
    candidateSelectionSummary: s.candidateSelectionSummary ? { ...s.candidateSelectionSummary, ...updates } : null,
  })),

  loadTranslationalData: (studies, panels, translations) => {
    if (get()._translationalSeeded) return;
    set({ translationalStudies: studies, biomarkerPanels: panels, safetyTranslations: translations, _translationalSeeded: true });
  },
  addTranslationalStudy: (study) => set((s) => ({ translationalStudies: [study, ...s.translationalStudies] })),
  updateTranslationalStudy: (id, updates) => set((s) => ({ translationalStudies: s.translationalStudies.map((ts) => ts.id === id ? { ...ts, ...updates } : ts) })),
  removeTranslationalStudy: (id) => set((s) => ({ translationalStudies: s.translationalStudies.filter((ts) => ts.id !== id) })),

  addBiomarkerPanel: (panel) => set((s) => ({ biomarkerPanels: [panel, ...s.biomarkerPanels] })),
  updateBiomarkerPanel: (id, updates) => set((s) => ({ biomarkerPanels: s.biomarkerPanels.map((bp) => bp.id === id ? { ...bp, ...updates } : bp) })),
  removeBiomarkerPanel: (id) => set((s) => ({ biomarkerPanels: s.biomarkerPanels.filter((bp) => bp.id !== id) })),

  updateSafetyTranslation: (id, updates) => set((s) => ({ safetyTranslations: s.safetyTranslations.map((st) => st.id === id ? { ...st, ...updates } : st) })),
  addNominationAuditEntry: (entry) => set((s) => ({ nominationAuditLog: [entry, ...s.nominationAuditLog] })),
}));
