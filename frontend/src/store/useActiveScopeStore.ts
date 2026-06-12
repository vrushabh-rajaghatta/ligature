
/**
 * useActiveScopeStore — v0.125.30
 *
 * Single source of truth for the user's current working scope.
 * Replaces useActiveContextStore.
 *
 * Hierarchy:
 *   TherapeuticArea → Program → PortfolioType (dev/marketed)
 *     → Study | DevApplication | MarketingAuthorisation → Country
 *
 * Cascading resets: narrowing the scope resets deeper selections.
 * scopeLevel controls what the Header ScopeSelector pill displays.
 *
 * Module-to-scope mapping defines what context each module naturally works at.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScopeLevel, PortfolioType } from '@/data/scopeData';
import {
  PROGRAMS,
  CLINICAL_STUDIES,
  REGULATORY_APPLICATIONS,
  getStudiesForProgram,
  getApplicationsForProgram,
  getApplicationById,
  getStudyById,
  getProgram,
  getProgramsByTA,
} from '@/data/scopeData';
import { THERAPEUTIC_AREAS } from '@/data/referenceData';
import type { ModuleId } from '@/types/core';

// ─── State shape ───────────────────────────────────────────────────────────────

export interface ActiveScopeState {
  // Hierarchy selections
  therapeuticAreaId: string | null;
  programId: string | null;
  portfolioType: PortfolioType | null;

  // Development branch
  studyId: string | null;
  devApplicationId: string | null;

  // Marketed branch
  marketingAuthId: string | null;   // NDA / MAA / JNDA application id
  regionCode: string | null;        // 'US' | 'EU' | 'JP' ...
  countryCode: string | null;       // 'DE' | 'FR' | 'GB' ...

  // What level the user has explicitly "pinned"
  scopeLevel: ScopeLevel;
}

export interface ActiveScopeActions {
  // Setters — all cascade-reset downward
  setTherapeuticArea: (taId: string | null) => void;
  setProgram: (programId: string | null) => void;
  setPortfolioType: (type: PortfolioType | null) => void;
  setStudy: (studyId: string | null) => void;
  setDevApplication: (appId: string | null) => void;
  setMarketingAuth: (appId: string | null) => void;
  setRegion: (regionCode: string | null) => void;
  setCountry: (countryCode: string | null) => void;
  setScopeLevel: (level: ScopeLevel) => void;

  // Convenience — set program and resolve TA automatically
  selectProgram: (programId: string) => void;

  // Convenience — set study and resolve program + TA automatically
  selectStudy: (studyId: string) => void;

  // Convenience — set application and resolve program + TA + portfolioType
  selectApplication: (appId: string) => void;

  // Convenience — set country under a marketing auth
  selectCountry: (appId: string, countryCode: string) => void;

  // Reset entire scope
  resetScope: () => void;

  // Derived getters
  getActiveTA: () => typeof THERAPEUTIC_AREAS[0] | undefined;
  getActiveProgram: () => typeof PROGRAMS[0] | undefined;
  getActiveStudy: () => typeof CLINICAL_STUDIES[0] | undefined;
  getActiveDevApplication: () => typeof REGULATORY_APPLICATIONS[0] | undefined;
  getActiveMarketingAuth: () => typeof REGULATORY_APPLICATIONS[0] | undefined;

  // What studies/apps are available given current program + portfolio selection
  getAvailableStudies: () => typeof CLINICAL_STUDIES;
  getAvailableDevApplications: () => typeof REGULATORY_APPLICATIONS;
  getAvailableMarketingAuths: () => typeof REGULATORY_APPLICATIONS;

  // Scope label for the pill in the Header
  getScopePillLabel: () => string;
  getScopePillFlag: () => string;
}

// ─── Module → natural scope level mapping ─────────────────────────────────────

export const MODULE_SCOPE_LEVEL: Partial<Record<ModuleId, ScopeLevel>> = {
  // TA level
  'portfolio':            'ta',
  'analytics':            'ta',
  'portfolio-strategy':   'ta',

  // Program level
  'strategy':             'program',
  'psmf':                 'program',
  'safety':               'program',
  'signal-detection':     'program',
  'cmc':                  'program',
  'stability':            'program',
  'batch-records':        'program',
  'qms':                  'program',

  // Development — study-centric
  'study-design':         'study',
  'ctms':                 'study',
  'tmf':                  'study',
  'biostats':             'study',
  'study-intel':          'study',
  'study-startup':        'study',
  'edc':                  'study',
  'sample-management':    'study',
  'nonclinical':          'study',

  // Development — investigational application
  'haq':                  'auth',   // can be dev or marketed depending on context

  // Marketed — authorisation-centric
  'authoring':            'auth',
  'document-control':     'auth',
  'submissions-hub':      'auth',
  'submission-command':   'auth',
  'publishing':           'auth',
  'continuous-submission':'auth',

  // Region-sensitive
  'labeling':             'region',
  'spl':                  'region',
  'reg-calendar':         'region',

  // Home / global — no scope shown
  'home':                 'ta',
  'agent-hub':            'ta',
  'rd-connected':         'ta',
};

// ─── Default scope ─────────────────────────────────────────────────────────────

const DEFAULT: ActiveScopeState = {
  therapeuticAreaId: 'oncology',
  programId: 'lig-2847',
  portfolioType: 'development',
  studyId: 'study-lig2847-301',
  devApplicationId: 'app-ind-us-lig2847',
  marketingAuthId: 'app-nda-us-lig2847',
  regionCode: 'US',
  countryCode: null,
  scopeLevel: 'study',
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useActiveScopeStore = create<ActiveScopeState & ActiveScopeActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT,

      // ── Setters ──────────────────────────────────────────────────────────────

      setTherapeuticArea: (taId) => {
        const firstProgram = PROGRAMS.find(p => p.therapeuticAreaId === taId);
        const firstStudy = firstProgram
          ? getStudiesForProgram(firstProgram.id, 'development')[0]
          : undefined;
        const firstDevApp = firstProgram
          ? getApplicationsForProgram(firstProgram.id, 'development')[0]
          : undefined;
        set({
          therapeuticAreaId: taId,
          programId: firstProgram?.id ?? null,
          portfolioType: 'development',
          studyId: firstStudy?.id ?? null,
          devApplicationId: firstDevApp?.id ?? null,
          marketingAuthId: null,
          regionCode: firstDevApp?.regionCode ?? null,
          countryCode: null,
          scopeLevel: 'ta',
        });
      },

      setProgram: (programId) => {
        const prog = programId ? getProgram(programId) : undefined;
        const firstStudy = programId
          ? getStudiesForProgram(programId, 'development')[0]
          : undefined;
        const firstDevApp = programId
          ? getApplicationsForProgram(programId, 'development')[0]
          : undefined;
        set({
          therapeuticAreaId: prog?.therapeuticAreaId ?? get().therapeuticAreaId,
          programId,
          portfolioType: 'development',
          studyId: firstStudy?.id ?? null,
          devApplicationId: firstDevApp?.id ?? null,
          marketingAuthId: null,
          regionCode: firstDevApp?.regionCode ?? null,
          countryCode: null,
          scopeLevel: 'program',
        });
      },

      setPortfolioType: (type) => {
        const { programId } = get();
        if (!programId) return set({ portfolioType: type });

        if (type === 'development') {
          const firstStudy = getStudiesForProgram(programId, 'development')[0];
          const firstDevApp = getApplicationsForProgram(programId, 'development')[0];
          set({
            portfolioType: type,
            studyId: firstStudy?.id ?? null,
            devApplicationId: firstDevApp?.id ?? null,
            marketingAuthId: null,
            regionCode: firstDevApp?.regionCode ?? null,
            countryCode: null,
            scopeLevel: 'development',
          });
        } else {
          const firstAuth = getApplicationsForProgram(programId, 'marketed')[0];
          set({
            portfolioType: type,
            studyId: null,
            devApplicationId: null,
            marketingAuthId: firstAuth?.id ?? null,
            regionCode: firstAuth?.regionCode ?? null,
            countryCode: null,
            scopeLevel: 'marketed',
          });
        }
      },

      setStudy: (studyId) => {
        set({ studyId, scopeLevel: 'study' });
      },

      setDevApplication: (appId) => {
        const app = appId ? getApplicationById(appId) : undefined;
        set({
          devApplicationId: appId,
          regionCode: app?.regionCode ?? get().regionCode,
          countryCode: null,
          scopeLevel: 'dev-app',
        });
      },

      setMarketingAuth: (appId) => {
        const app = appId ? getApplicationById(appId) : undefined;
        set({
          marketingAuthId: appId,
          regionCode: app?.regionCode ?? get().regionCode,
          countryCode: null,
          scopeLevel: 'auth',
        });
      },

      setRegion: (regionCode) => {
        set({ regionCode, countryCode: null, scopeLevel: 'region' });
      },

      setCountry: (countryCode) => {
        set({ countryCode, scopeLevel: 'country' });
      },

      setScopeLevel: (scopeLevel) => {
        set({ scopeLevel });
      },

      // ── Convenience selectors ─────────────────────────────────────────────

      selectProgram: (programId) => {
        get().setProgram(programId);
      },

      selectStudy: (studyId) => {
        const study = getStudyById(studyId);
        if (!study) return;
        const prog = getProgram(study.programId);
        const devApp = getApplicationsForProgram(study.programId, 'development')[0];
        set({
          therapeuticAreaId: prog?.therapeuticAreaId ?? get().therapeuticAreaId,
          programId: study.programId,
          portfolioType: study.portfolioType,
          studyId,
          devApplicationId: devApp?.id ?? null,
          marketingAuthId: null,
          regionCode: devApp?.regionCode ?? null,
          countryCode: null,
          scopeLevel: 'study',
        });
      },

      selectApplication: (appId) => {
        const app = getApplicationById(appId);
        if (!app) return;
        const prog = getProgram(app.programId);

        if (app.portfolioType === 'development') {
          const firstStudy = app.studyIds?.[0]
            ? getStudyById(app.studyIds[0])
            : undefined;
          set({
            therapeuticAreaId: prog?.therapeuticAreaId ?? get().therapeuticAreaId,
            programId: app.programId,
            portfolioType: 'development',
            studyId: firstStudy?.id ?? null,
            devApplicationId: appId,
            marketingAuthId: null,
            regionCode: app.regionCode,
            countryCode: null,
            scopeLevel: 'dev-app',
          });
        } else {
          set({
            therapeuticAreaId: prog?.therapeuticAreaId ?? get().therapeuticAreaId,
            programId: app.programId,
            portfolioType: 'marketed',
            studyId: null,
            devApplicationId: null,
            marketingAuthId: appId,
            regionCode: app.regionCode,
            countryCode: null,
            scopeLevel: 'auth',
          });
        }
      },

      selectCountry: (appId, countryCode) => {
        set({
          marketingAuthId: appId,
          countryCode,
          scopeLevel: 'country',
        });
      },

      resetScope: () => set(DEFAULT),

      // ── Derived getters ───────────────────────────────────────────────────

      getActiveTA: () => {
        const { therapeuticAreaId } = get();
        return THERAPEUTIC_AREAS.find(ta => ta.id === therapeuticAreaId);
      },

      getActiveProgram: () => {
        const { programId } = get();
        return programId ? getProgram(programId) : undefined;
      },

      getActiveStudy: () => {
        const { studyId } = get();
        return studyId ? getStudyById(studyId) : undefined;
      },

      getActiveDevApplication: () => {
        const { devApplicationId } = get();
        return devApplicationId ? getApplicationById(devApplicationId) : undefined;
      },

      getActiveMarketingAuth: () => {
        const { marketingAuthId } = get();
        return marketingAuthId ? getApplicationById(marketingAuthId) : undefined;
      },

      getAvailableStudies: () => {
        const { programId, portfolioType } = get();
        if (!programId) return [];
        return getStudiesForProgram(programId, portfolioType ?? undefined);
      },

      getAvailableDevApplications: () => {
        const { programId } = get();
        if (!programId) return [];
        return getApplicationsForProgram(programId, 'development');
      },

      getAvailableMarketingAuths: () => {
        const { programId } = get();
        if (!programId) return [];
        return getApplicationsForProgram(programId, 'marketed');
      },

      getScopePillLabel: () => {
        const state = get();
        switch (state.scopeLevel) {
          case 'ta': {
            const ta = THERAPEUTIC_AREAS.find(t => t.id === state.therapeuticAreaId);
            return ta?.name ?? 'All Areas';
          }
          case 'program': {
            const prog = state.programId ? getProgram(state.programId) : undefined;
            return prog ? `${prog.name}${prog.brandName ? ` · ${prog.brandName}` : ''}` : '—';
          }
          case 'development':
            return 'Development Portfolio';
          case 'marketed':
            return 'Marketed Portfolio';
          case 'study': {
            const study = state.studyId ? getStudyById(state.studyId) : undefined;
            return study ? `${study.protocolNumber} · ${study.phase}` : '—';
          }
          case 'dev-app': {
            const app = state.devApplicationId ? getApplicationById(state.devApplicationId) : undefined;
            return app ? `${app.applicationNumber} · ${app.type}` : '—';
          }
          case 'auth': {
            const app = state.marketingAuthId ? getApplicationById(state.marketingAuthId) : undefined;
            return app ? `${app.applicationNumber} · ${app.type}` : '—';
          }
          case 'region': {
            const app = state.marketingAuthId ? getApplicationById(state.marketingAuthId) : undefined;
            return app ? `${app.regionFlag} ${app.applicationNumber}` : state.regionCode ?? '—';
          }
          case 'country': {
            const auth = state.marketingAuthId ? getApplicationById(state.marketingAuthId) : undefined;
            const ma = auth?.marketAuthorisations?.find(m => m.countryCode === state.countryCode);
            return ma ? `${ma.flag} ${ma.countryName}` : state.countryCode ?? '—';
          }
          default:
            return '—';
        }
      },

      getScopePillFlag: () => {
        const state = get();
        switch (state.scopeLevel) {
          case 'ta': {
            const ta = THERAPEUTIC_AREAS.find(t => t.id === state.therapeuticAreaId);
            return ta?.icon ?? '🔬';
          }
          case 'program':
          case 'development':
          case 'marketed':
            return '💊';
          case 'study':
            return '🔬';
          case 'dev-app':
          case 'auth': {
            const appId = state.scopeLevel === 'dev-app' ? state.devApplicationId : state.marketingAuthId;
            const app = appId ? getApplicationById(appId) : undefined;
            return app?.regionFlag ?? '📄';
          }
          case 'region': {
            const app = state.marketingAuthId ? getApplicationById(state.marketingAuthId) : undefined;
            return app?.regionFlag ?? '🌐';
          }
          case 'country': {
            const auth = state.marketingAuthId ? getApplicationById(state.marketingAuthId) : undefined;
            const ma = auth?.marketAuthorisations?.find(m => m.countryCode === state.countryCode);
            return ma?.flag ?? '🌍';
          }
          default:
            return '🔬';
        }
      },
    }),
    {
      name: 'ligature-active-scope',
      partialize: (state) => ({
        therapeuticAreaId: state.therapeuticAreaId,
        programId: state.programId,
        portfolioType: state.portfolioType,
        studyId: state.studyId,
        devApplicationId: state.devApplicationId,
        marketingAuthId: state.marketingAuthId,
        regionCode: state.regionCode,
        countryCode: state.countryCode,
        scopeLevel: state.scopeLevel,
      }),
    }
  )
);

// ─── Selector hooks ────────────────────────────────────────────────────────────

export const useActiveTA           = () => useActiveScopeStore(s => s.therapeuticAreaId);
export const useActiveProgramId    = () => useActiveScopeStore(s => s.programId);
export const useActivePortfolioType = () => useActiveScopeStore(s => s.portfolioType);
export const useActiveStudyId      = () => useActiveScopeStore(s => s.studyId);
export const useActiveDevAppId     = () => useActiveScopeStore(s => s.devApplicationId);
export const useActiveAuthId       = () => useActiveScopeStore(s => s.marketingAuthId);
export const useActiveRegionCode   = () => useActiveScopeStore(s => s.regionCode);
export const useActiveCountryCode  = () => useActiveScopeStore(s => s.countryCode);
export const useActiveScopeLevel   = () => useActiveScopeStore(s => s.scopeLevel);
