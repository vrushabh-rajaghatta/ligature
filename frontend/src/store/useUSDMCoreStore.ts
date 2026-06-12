

// ============================================================================
// USDM Core Store v0.9.9a - Study Identity & Versioning Store
// Extends useUSDMStore with StudyTitle, StudyVersion, and enhanced identifiers
// ============================================================================

import { create } from 'zustand';
import {
  USDMStudyTitle,
  USDMStudyTitleType,
  USDMStudyVersion,
  USDMStudyVersionStatus,
  USDMStudyIdentifierV2,
  USDMStudyIdentifierType,
  USDMCoreState,
  USDMCoreActions,
  generateUSDMId,
  createStudyTitle,
  createStudyVersion,
  createStudyIdentifierV2,
  REGISTRY_ORGANIZATIONS,
} from './usdm-core-types';
import { USDMOrganization } from './usdmTypes';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialCoreState: USDMCoreState = {
  studyTitles: {},
  studyVersions: {},
  studyIdentifiersV2: {},
  currentVersionByStudyId: {},
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMCoreStore = create<USDMCoreState & USDMCoreActions>((set, get) => ({
  ...initialCoreState,

  // ==========================================================================
  // STUDY TITLES
  // ==========================================================================

  addStudyTitle: (studyId, titleData) => {
    const title = createStudyTitle(
      titleData.text || '',
      titleData.type || 'Brief',
      titleData
    );
    
    set((state) => {
      const existingTitles = state.studyTitles[studyId] || [];
      
      // If this is primary, unset other primaries of same type
      let updatedTitles = existingTitles;
      if (title.isPrimary) {
        updatedTitles = existingTitles.map((t) =>
          t.type === title.type && t.isPrimary
            ? { ...t, isPrimary: false, updatedAt: new Date().toISOString() }
            : t
        );
      }
      
      return {
        studyTitles: {
          ...state.studyTitles,
          [studyId]: [...updatedTitles, title],
        },
      };
    });
    
    return title;
  },

  updateStudyTitle: (titleId, updates) => {
    set((state) => {
      const newStudyTitles = { ...state.studyTitles };
      
      for (const studyId of Object.keys(newStudyTitles)) {
        const titles = newStudyTitles[studyId];
        const index = titles.findIndex((t) => t.id === titleId);
        
        if (index !== -1) {
          const updatedTitle = {
            ...titles[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          
          // Handle primary flag changes
          let updatedTitles = [...titles];
          if (updates.isPrimary && !titles[index].isPrimary) {
            // Unset other primaries of same type
            updatedTitles = updatedTitles.map((t, i) =>
              i !== index && t.type === updatedTitle.type && t.isPrimary
                ? { ...t, isPrimary: false, updatedAt: new Date().toISOString() }
                : t
            );
          }
          
          updatedTitles[index] = updatedTitle;
          newStudyTitles[studyId] = updatedTitles;
          break;
        }
      }
      
      return { studyTitles: newStudyTitles };
    });
  },

  removeStudyTitle: (titleId) => {
    set((state) => {
      const newStudyTitles = { ...state.studyTitles };
      
      for (const studyId of Object.keys(newStudyTitles)) {
        newStudyTitles[studyId] = newStudyTitles[studyId].filter(
          (t) => t.id !== titleId
        );
      }
      
      return { studyTitles: newStudyTitles };
    });
  },

  getStudyTitles: (studyId) => {
    return get().studyTitles[studyId] || [];
  },

  getPrimaryTitle: (studyId, type) => {
    const titles = get().studyTitles[studyId] || [];
    return titles.find((t) => t.type === type && t.isPrimary);
  },

  // ==========================================================================
  // STUDY VERSIONS
  // ==========================================================================

  createStudyVersion: (studyId, versionData) => {
    const existingVersions = get().studyVersions[studyId] || [];
    const latestVersion = existingVersions[existingVersions.length - 1];
    
    const version = createStudyVersion(
      studyId,
      versionData.versionIdentifier || '1.0',
      {
        ...versionData,
        previousVersionId: versionData.previousVersionId || latestVersion?.id,
      }
    );
    
    set((state) => ({
      studyVersions: {
        ...state.studyVersions,
        [studyId]: [...(state.studyVersions[studyId] || []), version],
      },
      // Auto-set as current if it's the first or if status is Approved
      currentVersionByStudyId:
        !state.currentVersionByStudyId[studyId] || version.status === 'Approved'
          ? { ...state.currentVersionByStudyId, [studyId]: version.id }
          : state.currentVersionByStudyId,
    }));
    
    return version;
  },

  updateStudyVersion: (versionId, updates) => {
    set((state) => {
      const newStudyVersions = { ...state.studyVersions };
      
      for (const studyId of Object.keys(newStudyVersions)) {
        const versions = newStudyVersions[studyId];
        const index = versions.findIndex((v) => v.id === versionId);
        
        if (index !== -1) {
          newStudyVersions[studyId] = [
            ...versions.slice(0, index),
            { ...versions[index], ...updates, updatedAt: new Date().toISOString() },
            ...versions.slice(index + 1),
          ];
          break;
        }
      }
      
      return { studyVersions: newStudyVersions };
    });
  },

  approveStudyVersion: (versionId, approvedBy) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const newStudyVersions = { ...state.studyVersions };
      const newCurrentVersion = { ...state.currentVersionByStudyId };
      
      for (const studyId of Object.keys(newStudyVersions)) {
        const versions = newStudyVersions[studyId];
        const index = versions.findIndex((v) => v.id === versionId);
        
        if (index !== -1) {
          // Supersede all previous approved versions
          newStudyVersions[studyId] = versions.map((v, i) => {
            if (i === index) {
              return {
                ...v,
                status: 'Approved' as USDMStudyVersionStatus,
                approvedBy,
                approvedAt: now,
                updatedAt: now,
              };
            }
            if (v.status === 'Approved') {
              return {
                ...v,
                status: 'Superseded' as USDMStudyVersionStatus,
                updatedAt: now,
              };
            }
            return v;
          });
          
          // Set as current version
          newCurrentVersion[studyId] = versionId;
          break;
        }
      }
      
      return {
        studyVersions: newStudyVersions,
        currentVersionByStudyId: newCurrentVersion,
      };
    });
  },

  supersededStudyVersion: (versionId) => {
    get().updateStudyVersion(versionId, {
      status: 'Superseded',
    });
  },

  getStudyVersions: (studyId) => {
    return get().studyVersions[studyId] || [];
  },

  getCurrentVersion: (studyId) => {
    const currentId = get().currentVersionByStudyId[studyId];
    if (!currentId) return undefined;
    
    const versions = get().studyVersions[studyId] || [];
    return versions.find((v) => v.id === currentId);
  },

  getVersionHistory: (studyId) => {
    const versions = get().studyVersions[studyId] || [];
    // Return in chronological order
    return [...versions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  // ==========================================================================
  // ENHANCED IDENTIFIERS
  // ==========================================================================

  addStudyIdentifierV2: (studyId, identifierData) => {
    const identifier = createStudyIdentifierV2(
      identifierData.studyIdentifier || '',
      identifierData.identifierType || 'SponsorId',
      identifierData.studyIdentifierScope || ({
        id: generateUSDMId('org'),
        instanceType: 'Organization',
        organizationName: 'Unknown',
        organizationType: {
          code: 'C99999',
          codeSystem: 'http://www.cdisc.org',
          decode: 'Unknown',
        },
      } as USDMOrganization),
      identifierData
    );
    
    set((state) => {
      const existingIds = state.studyIdentifiersV2[studyId] || [];
      
      // If this is primary, unset other primaries of same type
      let updatedIds = existingIds;
      if (identifier.isPrimary) {
        updatedIds = existingIds.map((id) =>
          id.identifierType === identifier.identifierType && id.isPrimary
            ? { ...id, isPrimary: false, updatedAt: new Date().toISOString() }
            : id
        );
      }
      
      return {
        studyIdentifiersV2: {
          ...state.studyIdentifiersV2,
          [studyId]: [...updatedIds, identifier],
        },
      };
    });
    
    return identifier;
  },

  updateStudyIdentifierV2: (identifierId, updates) => {
    set((state) => {
      const newIdentifiers = { ...state.studyIdentifiersV2 };
      
      for (const studyId of Object.keys(newIdentifiers)) {
        const identifiers = newIdentifiers[studyId];
        const index = identifiers.findIndex((i) => i.id === identifierId);
        
        if (index !== -1) {
          newIdentifiers[studyId] = [
            ...identifiers.slice(0, index),
            { ...identifiers[index], ...updates, updatedAt: new Date().toISOString() },
            ...identifiers.slice(index + 1),
          ];
          break;
        }
      }
      
      return { studyIdentifiersV2: newIdentifiers };
    });
  },

  removeStudyIdentifierV2: (identifierId) => {
    set((state) => {
      const newIdentifiers = { ...state.studyIdentifiersV2 };
      
      for (const studyId of Object.keys(newIdentifiers)) {
        newIdentifiers[studyId] = newIdentifiers[studyId].filter(
          (i) => i.id !== identifierId
        );
      }
      
      return { studyIdentifiersV2: newIdentifiers };
    });
  },

  getStudyIdentifiersV2: (studyId) => {
    return get().studyIdentifiersV2[studyId] || [];
  },

  getIdentifierByType: (studyId, type) => {
    const identifiers = get().studyIdentifiersV2[studyId] || [];
    return identifiers.find((i) => i.identifierType === type && i.isPrimary);
  },
}));

// ============================================================================
// MOCK DATA LOADER (LIG-2847 Golden Path)
// ============================================================================

export const loadUSDMCoreMockData = (studyId: string): void => {
  const store = useUSDMCoreStore.getState();
  const now = new Date().toISOString();
  
  // Add Study Titles
  store.addStudyTitle(studyId, {
    text: 'LIG-2847 Phase 3 NSCLC',
    type: 'Brief',
    isPrimary: true,
  });
  
  store.addStudyTitle(studyId, {
    text: 'A Randomized, Double-Blind, Placebo-Controlled, Phase 3 Study of Ligrastinib (LIG-2847) in Patients with Previously Treated EGFR-Mutant Non-Small Cell Lung Cancer',
    type: 'Official',
    isPrimary: true,
  });
  
  store.addStudyTitle(studyId, {
    text: 'Phase 3 Study of Ligrastinib vs Placebo in EGFR+ NSCLC',
    type: 'Scientific',
    isPrimary: true,
  });
  
  store.addStudyTitle(studyId, {
    text: 'Study of a New Medicine for Advanced Lung Cancer',
    type: 'Public',
    isPrimary: true,
  });
  
  store.addStudyTitle(studyId, {
    text: 'LIGATURE-301',
    type: 'Acronym',
    isPrimary: true,
  });
  
  // Add Study Versions
  const v1 = store.createStudyVersion(studyId, {
    versionIdentifier: '1.0',
    status: 'Superseded',
    rationale: 'Initial protocol version',
    effectiveDate: '2024-01-15',
    createdBy: 'dr.chen',
  });
  
  const v2 = store.createStudyVersion(studyId, {
    versionIdentifier: '2.0',
    status: 'Approved',
    rationale: 'Amendment 1 - Updated eligibility criteria',
    effectiveDate: '2024-06-01',
    amendmentNumber: '1',
    amendmentScope: 'Global',
    changeSummary: 'Modified inclusion criterion #4 to allow patients with stable brain metastases. Updated PK sampling schedule.',
    previousVersionId: v1.id,
    createdBy: 'dr.chen',
    approvedBy: 'dr.wilson',
    approvedAt: '2024-05-28',
  });
  
  store.createStudyVersion(studyId, {
    versionIdentifier: '3.0',
    status: 'Draft',
    rationale: 'Amendment 2 - Japan-specific modifications',
    amendmentNumber: '2',
    amendmentScope: 'Country',
    changeSummary: 'Added Japan-specific inclusion/exclusion criteria per PMDA requirements. Modified pharmacogenomics sampling requirements.',
    previousVersionId: v2.id,
    createdBy: 'dr.chen',
  });
  
  // Add Study Identifiers
  store.addStudyIdentifierV2(studyId, {
    studyIdentifier: 'LIG-2847-301',
    identifierType: 'SponsorId',
    studyIdentifierScope: {
      id: 'org-ligature',
      instanceType: 'Organization',
      organizationName: 'Ligature Therapeutics',
      organizationType: {
        code: 'C70793',
        codeSystem: 'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl',
        decode: 'Pharmaceutical/Biotech Company',
      },
    } as USDMOrganization,
    isPrimary: true,
  });
  
  store.addStudyIdentifierV2(studyId, {
    studyIdentifier: 'NCT05847291',
    identifierType: 'RegistryId',
    studyIdentifierScope: REGISTRY_ORGANIZATIONS.ClinicalTrialsGov as USDMOrganization,
    isPrimary: true,
    registryLink: 'https://clinicaltrials.gov/study/NCT05847291',
  });
  
  store.addStudyIdentifierV2(studyId, {
    studyIdentifier: '2024-001847-29',
    identifierType: 'RegistryId',
    studyIdentifierScope: REGISTRY_ORGANIZATIONS.EudraCT as USDMOrganization,
    isPrimary: false,
    registryLink: 'https://www.clinicaltrialsregister.eu/ctr-search/trial/2024-001847-29',
  });
  
  store.addStudyIdentifierV2(studyId, {
    studyIdentifier: 'IND-129847',
    identifierType: 'RegulatoryId',
    studyIdentifierScope: REGISTRY_ORGANIZATIONS.FDA as USDMOrganization,
    isPrimary: true,
  });
  
  store.addStudyIdentifierV2(studyId, {
    studyIdentifier: 'EMEA/H/C/005847',
    identifierType: 'RegulatoryId',
    studyIdentifierScope: REGISTRY_ORGANIZATIONS.EMA as USDMOrganization,
    isPrimary: false,
  });
};

// ============================================================================
// SELECTORS
// ============================================================================

import { useMemo } from 'react';

export const useStudyTitles = (studyId: string) => {
  const titles = useUSDMCoreStore((s) => s.studyTitles[studyId] || []);
  return useMemo(() => titles, [titles]);
};

export const usePrimaryTitle = (studyId: string, type: USDMStudyTitleType) => {
  const titles = useUSDMCoreStore((s) => s.studyTitles[studyId] || []);
  return useMemo(
    () => titles.find((t) => t.type === type && t.isPrimary),
    [titles, type]
  );
};

export const useStudyVersions = (studyId: string) => {
  const versions = useUSDMCoreStore((s) => s.studyVersions[studyId] || []);
  return useMemo(() => versions, [versions]);
};

export const useCurrentStudyVersion = (studyId: string) => {
  const currentId = useUSDMCoreStore((s) => s.currentVersionByStudyId[studyId]);
  const versions = useUSDMCoreStore((s) => s.studyVersions[studyId] || []);
  return useMemo(
    () => versions.find((v) => v.id === currentId),
    [versions, currentId]
  );
};

export const useStudyIdentifiersV2 = (studyId: string) => {
  const identifiers = useUSDMCoreStore((s) => s.studyIdentifiersV2[studyId] || []);
  return useMemo(() => identifiers, [identifiers]);
};

export const useStudyIdentifierByType = (studyId: string, type: USDMStudyIdentifierType) => {
  const identifiers = useUSDMCoreStore((s) => s.studyIdentifiersV2[studyId] || []);
  return useMemo(
    () => identifiers.find((i) => i.identifierType === type && i.isPrimary),
    [identifiers, type]
  );
};

// ============================================================================
// CLEAR / RESET
// ============================================================================

export const clearUSDMCoreStore = (): void => {
  useUSDMCoreStore.setState(initialCoreState);
};
