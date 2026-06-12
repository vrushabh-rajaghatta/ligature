
/**
 * useScopeContext — v0.125.33
 *
 * Module-aware bridge between useActiveScopeStore and individual screens.
 * Returns the context values relevant to the calling module, derived from
 * the active scope.
 *
 * Usage:
 *   const { studyProtocolNumber, applicationNumber, regionCode } = useScopeContext('ctms');
 */

import { useActiveScopeStore } from '@/store/useActiveScopeStore';
import { getStudyById, getApplicationById } from '@/data/scopeData';
import type { ModuleId } from '@/types/core';

export interface ScopeContext {
  // Study-centric modules (CTMS, TMF, Biostats, Study Design)
  studyProtocolNumber: string | null;
  studyPhase: string | null;
  studyStatus: string | null;

  // Application-centric modules (Authoring, Submissions Hub, HAQ, Publishing)
  applicationNumber: string | null;
  applicationType: string | null;
  applicationFlag: string | null;
  portfolioType: 'development' | 'marketed' | null;

  // Region/country modules (Labeling, SPL, Reg Calendar)
  regionCode: string | null;
  regionFlag: string | null;
  countryCode: string | null;

  // Always available
  programId: string | null;
  programName: string | null;

  // Human-readable scope summary for display
  scopeSummary: string | null;
  scopeFlag: string | null;
}

// Modules that care about study context
const STUDY_MODULES = new Set([
  'study-design', 'ctms', 'tmf', 'biostats', 'study-intel',
  'study-startup', 'edc', 'sample-management', 'nonclinical',
]);

// Modules that care about application context
const APP_MODULES = new Set([
  'authoring', 'document-control', 'submissions-hub', 'submission-command',
  'publishing', 'continuous-submission', 'haq',
]);

// Modules that care about region/country
const REGION_MODULES = new Set([
  'labeling', 'spl', 'reg-calendar',
]);

export function useScopeContext(moduleId: ModuleId | string): ScopeContext {
  const state = useActiveScopeStore();

  const study = state.studyId ? getStudyById(state.studyId) : undefined;

  // For application: prefer marketingAuthId for marketed modules, devApplicationId for dev
  const appId = APP_MODULES.has(moduleId)
    ? (state.portfolioType === 'development' ? state.devApplicationId : state.marketingAuthId)
    : (state.marketingAuthId ?? state.devApplicationId);
  const app = appId ? getApplicationById(appId) : undefined;

  // Program name — derive from scope store active program
  const activeProgram = state.getActiveProgram?.();
  const programName = activeProgram
    ? `${activeProgram.name}${activeProgram.brandName ? ` / ${activeProgram.brandName}` : ''}`
    : null;

  // Scope summary — human-readable label
  let scopeSummary: string | null = null;
  let scopeFlag: string | null = null;

  if (STUDY_MODULES.has(moduleId) && study) {
    scopeSummary = `${study.protocolNumber} · ${study.phase}`;
    scopeFlag = '🔬';
  } else if (APP_MODULES.has(moduleId) && app) {
    scopeSummary = `${app.applicationNumber} · ${app.type}`;
    scopeFlag = app.regionFlag;
  } else if (REGION_MODULES.has(moduleId)) {
    if (state.countryCode) {
      scopeSummary = state.countryCode;
      scopeFlag = '📍';
    } else if (state.regionCode) {
      scopeSummary = state.regionCode;
      scopeFlag = app?.regionFlag ?? '🌐';
    }
  } else if (activeProgram) {
    scopeSummary = programName;
    scopeFlag = '💊';
  }

  return {
    // Study
    studyProtocolNumber: study?.protocolNumber ?? null,
    studyPhase: study?.phase ?? null,
    studyStatus: study?.status ?? null,

    // Application
    applicationNumber: app?.applicationNumber ?? null,
    applicationType: app?.type ?? null,
    applicationFlag: app?.regionFlag ?? null,
    portfolioType: state.portfolioType,

    // Region
    regionCode: state.regionCode,
    regionFlag: app?.regionFlag ?? null,
    countryCode: state.countryCode,

    // Program
    programId: state.programId,
    programName,

    // Summary
    scopeSummary,
    scopeFlag,
  };
}
