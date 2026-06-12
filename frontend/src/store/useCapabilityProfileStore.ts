/**
 * useCapabilityProfileStore — Organizational Capability Profile
 * v0.125.82
 *
 * Persists self-reported and platform-inferred capability scores across
 * the 5 dimensions: chemistry, biology, manufacturing, regulatory, clinical.
 *
 * The composite internalCapability score is consumed by CandidateTargetingPanel
 * to personalise the internalCapability dimension of every target ranking.
 *
 * Store is admin-gated at the UI layer — anyone can read scores (for
 * CandidateTargeting), but only admins can write them.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ── Dimension types ────────────────────────────────────────────────────────────

export type CapabilityDimensionId =
  | 'chemistry'
  | 'biology'
  | 'manufacturing'
  | 'regulatory'
  | 'clinical';

export interface CapabilityDimension {
  id:                CapabilityDimensionId;
  label:             string;
  description:       string;
  selfReported:      number;   // 0–100, admin-set
  platformInferred:  number;   // 0–100, computed from Ligature activity
  composite:         number;   // weighted average
  subScores: {
    label:   string;
    value:   number;           // 0–100
    source:  'self' | 'inferred';
    note:    string;
  }[];
  lastUpdated:       string;
  updatedBy:         string;
}

export interface CapabilityProfileState {
  dimensions:       Record<CapabilityDimensionId, CapabilityDimension>;
  overallScore:     number;    // 0–100 — weighted composite across all 5 dims
  profileVersion:   number;    // increments on every save
  lastSavedAt:      string;
  notes:            string;    // admin narrative / context
}

interface CapabilityProfileStore extends CapabilityProfileState {
  /** Update self-reported score for a dimension */
  setSelfReported: (id: CapabilityDimensionId, value: number) => void;
  /** Update a single sub-score */
  setSubScore: (dimId: CapabilityDimensionId, subLabel: string, value: number) => void;
  /** Admin save — recalculates composites and bumps version */
  saveProfile: (updatedBy: string, notes: string) => void;
  /** Recompute platform-inferred scores (called after module activity) */
  recomputeInferred: () => void;
  /** Get composite internalCapability score (0–100) for CandidateTargeting */
  getInternalCapabilityScore: () => number;
}

// ── Default profile ────────────────────────────────────────────────────────────

function buildDefaults(): Record<CapabilityDimensionId, CapabilityDimension> {
  const now = new Date().toISOString();
  return {
    chemistry: {
      id: 'chemistry',
      label: 'Chemistry & Medicinal Chemistry',
      description: 'Small molecule design, lead optimisation, ADMET profiling, synthetic chemistry capability',
      selfReported: 85,
      platformInferred: 88,
      composite: 87,
      subScores: [
        { label: 'Small molecule design',      value: 90, source: 'self',     note: 'Demonstrated via LIG-2847 KRAS G12C/G12D scaffold development' },
        { label: 'Lead optimisation',          value: 88, source: 'inferred', note: 'Inferred from 34 lead-opt records in Research module' },
        { label: 'ADMET profiling',            value: 82, source: 'inferred', note: 'Inferred from preclinical ADMET dataset (n=247 compounds)' },
        { label: 'Synthetic chemistry',        value: 85, source: 'self',     note: 'Medicinal chemistry team — 4 FTEs + CRO partnerships' },
        { label: 'Formulation development',    value: 78, source: 'self',     note: 'Oral solid dose capability; IV formulation via CMO' },
      ],
      lastUpdated: now, updatedBy: 'System',
    },
    biology: {
      id: 'biology',
      label: 'Biology & Translational Science',
      description: 'Target biology, in vitro/in vivo pharmacology, biomarker development, mechanistic understanding',
      selfReported: 80,
      platformInferred: 83,
      composite: 82,
      subScores: [
        { label: 'Target biology / mechanistic', value: 88, source: 'self',     note: 'KRAS, TYK2, PCSK9 expertise — internal publication record' },
        { label: 'In vitro pharmacology',        value: 85, source: 'inferred', note: 'Inferred from 89 in vitro study records in Research module' },
        { label: 'In vivo pharmacology (rodent)', value: 78, source: 'self',    note: 'Mouse/rat efficacy models — conducted via specialist CRO' },
        { label: 'Biomarker development',        value: 75, source: 'self',     note: 'CDx partnership for LIG-2847 (KRAS G12D allele burden)' },
        { label: 'Translational science',        value: 80, source: 'inferred', note: 'Inferred from IND package depth in Research Intelligence module' },
      ],
      lastUpdated: now, updatedBy: 'System',
    },
    manufacturing: {
      id: 'manufacturing',
      label: 'CMC & Manufacturing',
      description: 'Drug substance/product manufacturing, process chemistry, analytical methods, GMP capability',
      selfReported: 72,
      platformInferred: 74,
      composite: 73,
      subScores: [
        { label: 'Drug substance manufacturing',  value: 65, source: 'self',     note: 'Outsourced to CMO — Lonza Visp for DS. Scale-up proven to 100kg.' },
        { label: 'Drug product formulation',      value: 70, source: 'self',     note: 'Film-coated tablet. Catalent partnership for DP manufacture.' },
        { label: 'Analytical method development', value: 85, source: 'inferred', note: 'Inferred from 28 analytical method records in CMC module' },
        { label: 'Stability programs',            value: 78, source: 'inferred', note: 'Inferred from 3 active ICH stability studies in Stability module' },
        { label: 'GMP compliance',                value: 72, source: 'self',     note: 'Virtual manufacturing — CMO holds GMP certification' },
      ],
      lastUpdated: now, updatedBy: 'System',
    },
    regulatory: {
      id: 'regulatory',
      label: 'Regulatory Affairs',
      description: 'IND/CTA/NDA strategy, HA interactions, submission excellence, global regulatory intelligence',
      selfReported: 92,
      platformInferred: 94,
      composite: 93,
      subScores: [
        { label: 'IND/CTA authoring',          value: 95, source: 'inferred', note: 'Inferred from 19 IND/CTA modules in Submissions Hub' },
        { label: 'HA meeting strategy',        value: 90, source: 'self',     note: '3 Type B FDA meetings + 2 CHMP scientific advice — LIG-2847' },
        { label: 'Global dossier management',  value: 92, source: 'inferred', note: 'Inferred from 7 active submission sequences across 4 regions' },
        { label: 'CMC regulatory strategy',    value: 88, source: 'self',     note: 'ICH Q8/Q9/Q10 QbD expertise; prior approval supplement experience' },
        { label: 'HAQ management',             value: 96, source: 'inferred', note: 'Inferred from 41 HAQ records — 100% on-time response rate' },
      ],
      lastUpdated: now, updatedBy: 'System',
    },
    clinical: {
      id: 'clinical',
      label: 'Clinical Operations',
      description: 'Trial design, site management, CTMS execution, data management, ICH E6(R3) GCP compliance',
      selfReported: 76,
      platformInferred: 78,
      composite: 77,
      subScores: [
        { label: 'Phase 1 trial execution',    value: 82, source: 'self',     note: 'LIG-2847 Phase 1 — 6 sites, 94 patients. CRO: ICON.' },
        { label: 'Phase 2/3 site management',  value: 78, source: 'inferred', note: 'Inferred from CTMS — 14 active sites, RBM monitoring live' },
        { label: 'Data management & CDISC',    value: 80, source: 'inferred', note: 'Inferred from SDTM/ADaM datasets in Biostatistics module' },
        { label: 'Biostatistics',              value: 72, source: 'self',     note: 'BIOSTATS team: 2 FTEs + FSP. SAP expertise strong.' },
        { label: 'GCP / ICH E6(R3) compliance', value: 85, source: 'inferred', note: 'Inferred from 0 major GCP findings in last 3 inspections' },
      ],
      lastUpdated: now, updatedBy: 'System',
    },
  };
}

function computeComposite(dim: CapabilityDimension): number {
  // 60% self-reported, 40% platform-inferred — rounded
  return Math.round(dim.selfReported * 0.6 + dim.platformInferred * 0.4);
}

function computeOverall(dims: Record<CapabilityDimensionId, CapabilityDimension>): number {
  // Weighted: regulatory 25%, chemistry 22%, biology 20%, clinical 18%, manufacturing 15%
  const weights: Record<CapabilityDimensionId, number> = {
    regulatory:    0.25,
    chemistry:     0.22,
    biology:       0.20,
    clinical:      0.18,
    manufacturing: 0.15,
  };
  return Math.round(
    (Object.entries(dims) as [CapabilityDimensionId, CapabilityDimension][])
      .reduce((sum, [id, dim]) => sum + dim.composite * weights[id], 0)
  );
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useCapabilityProfileStore = create<CapabilityProfileStore>()(
  persist(
    immer((set, get) => {
      const defaultDims = buildDefaults();
      return {
        dimensions:     defaultDims,
        overallScore:   computeOverall(defaultDims),
        profileVersion: 1,
        lastSavedAt:    new Date().toISOString(),
        notes:          'Initial capability profile — platform-inferred from Ligature activity as of onboarding. Admin review recommended before first Candidate Targeting run.',

        setSelfReported: (id, value) => set(state => {
          state.dimensions[id].selfReported = Math.max(0, Math.min(100, value));
          state.dimensions[id].composite    = computeComposite(state.dimensions[id]);
          state.overallScore = computeOverall(state.dimensions);
        }),

        setSubScore: (dimId, subLabel, value) => set(state => {
          const sub = state.dimensions[dimId].subScores.find(s => s.label === subLabel);
          if (sub) {
            sub.value = Math.max(0, Math.min(100, value));
            // Re-derive selfReported as mean of self-sourced sub-scores
            const selfSubs = state.dimensions[dimId].subScores.filter(s => s.source === 'self');
            if (selfSubs.length > 0) {
              state.dimensions[dimId].selfReported = Math.round(
                selfSubs.reduce((s, ss) => s + ss.value, 0) / selfSubs.length
              );
            }
            state.dimensions[dimId].composite = computeComposite(state.dimensions[dimId]);
            state.overallScore = computeOverall(state.dimensions);
          }
        }),

        saveProfile: (updatedBy, notes) => set(state => {
          const now = new Date().toISOString();
          (Object.keys(state.dimensions) as CapabilityDimensionId[]).forEach(id => {
            state.dimensions[id].composite   = computeComposite(state.dimensions[id]);
            state.dimensions[id].lastUpdated = now;
            state.dimensions[id].updatedBy   = updatedBy;
          });
          state.overallScore    = computeOverall(state.dimensions);
          state.profileVersion += 1;
          state.lastSavedAt     = now;
          state.notes           = notes;
        }),

        recomputeInferred: () => set(state => {
          // In production this would call the platform activity API.
          // Here we add small jitter to simulate live re-computation.
          (Object.keys(state.dimensions) as CapabilityDimensionId[]).forEach(id => {
            const jitter = (Math.random() - 0.5) * 4;
            state.dimensions[id].platformInferred = Math.max(0, Math.min(100,
              Math.round(state.dimensions[id].platformInferred + jitter)
            ));
            state.dimensions[id].composite = computeComposite(state.dimensions[id]);
          });
          state.overallScore = computeOverall(state.dimensions);
        }),

        getInternalCapabilityScore: () => get().overallScore,
      };
    }),
    {
      name:    'ligature-capability-profile',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return sessionStorage;
        return localStorage;
      }),
    }
  )
);
