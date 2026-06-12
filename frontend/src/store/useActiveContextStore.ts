
/**
 * useActiveContextStore — v0.125.27
 *
 * Single source of truth for "what am I working on right now?"
 * Persisted across navigation. Cascading: changing product resets study;
 * changing study resets application.
 *
 * Consumed by ContextBar (display/switch) and any screen that needs
 * to know the current product/study/application context.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { products, studies, applications } from '@/data/mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveContext {
  productId: string;
  studyId: string | null;
  applicationId: string | null;
}

export interface ActiveContextActions {
  setProduct: (productId: string) => void;
  setStudy: (studyId: string | null) => void;
  setApplication: (applicationId: string | null) => void;
  resetContext: () => void;

  // Derived getters
  getStudiesForProduct: (productId: string) => typeof studies;
  getApplicationsForProduct: (productId: string) => typeof applications;
  getActiveProduct: () => typeof products[0] | undefined;
  getActiveStudy: () => typeof studies[0] | undefined;
  getActiveApplication: () => typeof applications[0] | undefined;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PRODUCT_ID = 'lig-2847';
const DEFAULT_STUDY_ID = 'study-003';    // LIG-2847-301 Phase 3
const DEFAULT_APPLICATION_ID = 'app-002'; // NDA 215847 FDA

const defaultContext: ActiveContext = {
  productId: DEFAULT_PRODUCT_ID,
  studyId: DEFAULT_STUDY_ID,
  applicationId: DEFAULT_APPLICATION_ID,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useActiveContextStore = create<ActiveContext & ActiveContextActions>()(
  persist(
    (set, get) => ({
      ...defaultContext,

      setProduct: (productId) => {
        const firstStudy = studies.find(s => s.productId === productId);
        const firstApp = applications.find(a => a.productId === productId);
        set({
          productId,
          studyId: firstStudy?.id ?? null,
          applicationId: firstApp?.id ?? null,
        });
      },

      setStudy: (studyId) => {
        set({ studyId, applicationId: null });
      },

      setApplication: (applicationId) => {
        set({ applicationId });
      },

      resetContext: () => {
        set(defaultContext);
      },

      getStudiesForProduct: (productId) =>
        studies.filter(s => s.productId === productId),

      getApplicationsForProduct: (productId) =>
        applications.filter(a => a.productId === productId),

      getActiveProduct: () => {
        const { productId } = get();
        return products.find(p => p.id === productId);
      },

      getActiveStudy: () => {
        const { studyId } = get();
        if (!studyId) return undefined;
        return studies.find(s => s.id === studyId);
      },

      getActiveApplication: () => {
        const { applicationId } = get();
        if (!applicationId) return undefined;
        return applications.find(a => a.id === applicationId);
      },
    }),
    {
      name: 'ligature-active-context',
      partialize: (state) => ({
        productId: state.productId,
        studyId: state.studyId,
        applicationId: state.applicationId,
      }),
    }
  )
);

// ─── Selector hooks ───────────────────────────────────────────────────────────

export const useActiveProductId = () => useActiveContextStore(s => s.productId);
export const useActiveStudyId = () => useActiveContextStore(s => s.studyId);
export const useActiveApplicationId = () => useActiveContextStore(s => s.applicationId);
