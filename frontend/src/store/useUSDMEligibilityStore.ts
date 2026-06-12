

// ============================================================================
// USDM Eligibility Store v0.9.9d - Inclusion/Exclusion Criteria Management
// Zustand store for managing Eligibility Criteria, Groups, and individual Criteria
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  USDMEligibilityCriteria,
  USDMEligibilityCriterionGroup,
  USDMEligibilityCriterion,
  USDMEligibilityState,
  USDMEligibilityActions,
  USDMCriterionType,
  USDMCriterionCategory,
  EligibilityView,
  EligibilityGroupView,
  EligibilityStatistics,
  createEligibilityCriteria,
  createEligibilityCriterionGroup,
  createEligibilityCriterion,
  getCriteriaByGroup,
  countCriteriaByType,
} from './usdm-eligibility-types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMEligibilityState = {
  criteriaByStudyId: {},
  groupsByStudyId: {},
  criterionsByStudyId: {},
  selectedCriteriaId: null,
  selectedGroupId: null,
  selectedCriterionId: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMEligibilityStore = create<USDMEligibilityState & USDMEligibilityActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // ELIGIBILITY CRITERIA (Container)
  // ==========================================================================

  setEligibilityCriteria: (studyId, data) => {
    const existing = get().criteriaByStudyId[studyId];
    const criteria = existing
      ? { ...existing, ...data, updatedAt: new Date().toISOString() }
      : createEligibilityCriteria(studyId, data);
    
    set((state) => ({
      criteriaByStudyId: {
        ...state.criteriaByStudyId,
        [studyId]: criteria,
      },
    }));
    
    return criteria;
  },

  updateEligibilityCriteria: (studyId, updates) => {
    set((state) => {
      const existing = state.criteriaByStudyId[studyId];
      if (!existing) return state;
      
      return {
        criteriaByStudyId: {
          ...state.criteriaByStudyId,
          [studyId]: {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // ==========================================================================
  // CRITERION GROUPS
  // ==========================================================================

  addGroup: (studyId, groupData) => {
    const criteria = get().criteriaByStudyId[studyId];
    if (!criteria) {
      // Auto-create eligibility criteria if it doesn't exist
      get().setEligibilityCriteria(studyId, {});
    }
    
    const existingGroups = get().groupsByStudyId[studyId] || [];
    const displayOrder = groupData.displayOrder ?? existingGroups.length;
    
    const group = createEligibilityCriterionGroup(
      get().criteriaByStudyId[studyId]?.id || studyId,
      groupData.name || 'New Group',
      groupData.criterionType || 'Inclusion',
      displayOrder,
      groupData
    );
    
    set((state) => ({
      groupsByStudyId: {
        ...state.groupsByStudyId,
        [studyId]: [...existingGroups, group],
      },
    }));
    
    return group;
  },

  updateGroup: (groupId, updates) => {
    set((state) => {
      const newGroupsByStudyId = { ...state.groupsByStudyId };
      
      for (const studyId of Object.keys(newGroupsByStudyId)) {
        const groups = newGroupsByStudyId[studyId];
        const index = groups.findIndex((g) => g.id === groupId);
        
        if (index !== -1) {
          newGroupsByStudyId[studyId] = [
            ...groups.slice(0, index),
            { ...groups[index], ...updates, updatedAt: new Date().toISOString() },
            ...groups.slice(index + 1),
          ];
          break;
        }
      }
      
      return { groupsByStudyId: newGroupsByStudyId };
    });
  },

  removeGroup: (groupId) => {
    set((state) => {
      const newGroupsByStudyId = { ...state.groupsByStudyId };
      const newCriterionsByStudyId = { ...state.criterionsByStudyId };
      
      for (const studyId of Object.keys(newGroupsByStudyId)) {
        const groups = newGroupsByStudyId[studyId];
        const index = groups.findIndex((g) => g.id === groupId);
        
        if (index !== -1) {
          // Remove the group
          newGroupsByStudyId[studyId] = groups.filter((g) => g.id !== groupId);
          
          // Remove all criteria in this group
          newCriterionsByStudyId[studyId] = (newCriterionsByStudyId[studyId] || [])
            .filter((c) => c.groupId !== groupId);
          
          break;
        }
      }
      
      return {
        groupsByStudyId: newGroupsByStudyId,
        criterionsByStudyId: newCriterionsByStudyId,
      };
    });
  },

  reorderGroups: (studyId, groupIds) => {
    set((state) => {
      const groups = state.groupsByStudyId[studyId] || [];
      const reorderedGroups = groupIds
        .map((id, idx) => {
          const group = groups.find((g) => g.id === id);
          return group ? { ...group, displayOrder: idx, updatedAt: new Date().toISOString() } : null;
        })
        .filter((g): g is USDMEligibilityCriterionGroup => g !== null);
      
      return {
        groupsByStudyId: {
          ...state.groupsByStudyId,
          [studyId]: reorderedGroups,
        },
      };
    });
  },

  // ==========================================================================
  // INDIVIDUAL CRITERIA
  // ==========================================================================

  addCriterion: (studyId, criterionData) => {
    // Find the group to determine criterion type
    const groups = get().groupsByStudyId[studyId] || [];
    const group = groups.find((g) => g.id === criterionData.groupId);
    
    const existingCriteria = get().criterionsByStudyId[studyId] || [];
    const groupCriteria = existingCriteria.filter((c) => c.groupId === criterionData.groupId);
    const displayOrder = criterionData.displayOrder ?? groupCriteria.length;
    
    // Generate identifier if not provided
    const criterionType = criterionData.criterionType || group?.criterionType || 'Inclusion';
    const typePrefix = criterionType === 'Inclusion' ? 'I' : 'E';
    const typeCriteria = existingCriteria.filter((c) => c.criterionType === criterionType);
    const identifier = criterionData.identifier || `${typePrefix}${typeCriteria.length + 1}`;
    
    const criterion = createEligibilityCriterion(
      criterionData.groupId || '',
      identifier,
      criterionData.name || 'New Criterion',
      criterionData.text || '',
      criterionType,
      criterionData.category || 'Other',
      displayOrder,
      criterionData
    );
    
    set((state) => ({
      criterionsByStudyId: {
        ...state.criterionsByStudyId,
        [studyId]: [...existingCriteria, criterion],
      },
    }));
    
    return criterion;
  },

  updateCriterion: (criterionId, updates) => {
    set((state) => {
      const newCriterionsByStudyId = { ...state.criterionsByStudyId };
      
      for (const studyId of Object.keys(newCriterionsByStudyId)) {
        const criteria = newCriterionsByStudyId[studyId];
        const index = criteria.findIndex((c) => c.id === criterionId);
        
        if (index !== -1) {
          newCriterionsByStudyId[studyId] = [
            ...criteria.slice(0, index),
            { ...criteria[index], ...updates, updatedAt: new Date().toISOString() },
            ...criteria.slice(index + 1),
          ];
          break;
        }
      }
      
      return { criterionsByStudyId: newCriterionsByStudyId };
    });
  },

  removeCriterion: (criterionId) => {
    set((state) => {
      const newCriterionsByStudyId = { ...state.criterionsByStudyId };
      
      for (const studyId of Object.keys(newCriterionsByStudyId)) {
        const criteria = newCriterionsByStudyId[studyId];
        if (criteria.some((c) => c.id === criterionId)) {
          newCriterionsByStudyId[studyId] = criteria.filter((c) => c.id !== criterionId);
          break;
        }
      }
      
      return { criterionsByStudyId: newCriterionsByStudyId };
    });
  },

  moveCriterion: (criterionId, newGroupId, newDisplayOrder) => {
    set((state) => {
      const newCriterionsByStudyId = { ...state.criterionsByStudyId };
      
      for (const studyId of Object.keys(newCriterionsByStudyId)) {
        const criteria = newCriterionsByStudyId[studyId];
        const index = criteria.findIndex((c) => c.id === criterionId);
        
        if (index !== -1) {
          // Get the new group to update criterion type
          const groups = state.groupsByStudyId[studyId] || [];
          const newGroup = groups.find((g) => g.id === newGroupId);
          
          newCriterionsByStudyId[studyId] = [
            ...criteria.slice(0, index),
            {
              ...criteria[index],
              groupId: newGroupId,
              displayOrder: newDisplayOrder,
              criterionType: newGroup?.criterionType || criteria[index].criterionType,
              updatedAt: new Date().toISOString(),
            },
            ...criteria.slice(index + 1),
          ];
          break;
        }
      }
      
      return { criterionsByStudyId: newCriterionsByStudyId };
    });
  },

  reorderCriteria: (groupId, criterionIds) => {
    set((state) => {
      const newCriterionsByStudyId = { ...state.criterionsByStudyId };
      
      for (const studyId of Object.keys(newCriterionsByStudyId)) {
        const criteria = newCriterionsByStudyId[studyId];
        const groupCriteria = criteria.filter((c) => c.groupId === groupId);
        
        if (groupCriteria.length > 0) {
          const reorderedCriteria = criteria.map((c) => {
            if (c.groupId !== groupId) return c;
            const newOrder = criterionIds.indexOf(c.id);
            if (newOrder === -1) return c;
            return { ...c, displayOrder: newOrder, updatedAt: new Date().toISOString() };
          });
          
          newCriterionsByStudyId[studyId] = reorderedCriteria;
          break;
        }
      }
      
      return { criterionsByStudyId: newCriterionsByStudyId };
    });
  },

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  bulkAddCriteria: (studyId, criteriaData) => {
    const addedCriteria: USDMEligibilityCriterion[] = [];
    
    for (const data of criteriaData) {
      const criterion = get().addCriterion(studyId, data);
      addedCriteria.push(criterion);
    }
    
    return addedCriteria;
  },

  copyCriteriaFromStudy: (sourceStudyId, targetStudyId) => {
    const sourceCriteria = get().criteriaByStudyId[sourceStudyId];
    const sourceGroups = get().groupsByStudyId[sourceStudyId] || [];
    const sourceCriterions = get().criterionsByStudyId[sourceStudyId] || [];
    
    if (!sourceCriteria) return;
    
    // Copy eligibility criteria
    get().setEligibilityCriteria(targetStudyId, {
      description: sourceCriteria.description,
      targetPopulation: sourceCriteria.targetPopulation,
      minimumAge: sourceCriteria.minimumAge,
      maximumAge: sourceCriteria.maximumAge,
      sex: sourceCriteria.sex,
      healthyVolunteers: sourceCriteria.healthyVolunteers,
    });
    
    // Map old group IDs to new group IDs
    const groupIdMap = new Map<string, string>();
    
    // Copy groups
    for (const sourceGroup of sourceGroups) {
      const newGroup = get().addGroup(targetStudyId, {
        name: sourceGroup.name,
        description: sourceGroup.description,
        criterionType: sourceGroup.criterionType,
        displayOrder: sourceGroup.displayOrder,
      });
      groupIdMap.set(sourceGroup.id, newGroup.id);
    }
    
    // Copy individual criteria
    for (const sourceCriterion of sourceCriterions) {
      const newGroupId = groupIdMap.get(sourceCriterion.groupId);
      if (!newGroupId) continue;
      
      get().addCriterion(targetStudyId, {
        groupId: newGroupId,
        identifier: sourceCriterion.identifier,
        name: sourceCriterion.name,
        text: sourceCriterion.text,
        category: sourceCriterion.category,
        criterionType: sourceCriterion.criterionType,
        isRequired: sourceCriterion.isRequired,
        applicabilityCondition: sourceCriterion.applicabilityCondition,
        dictionaryReference: sourceCriterion.dictionaryReference,
        contextDescription: sourceCriterion.contextDescription,
        assessmentMethod: sourceCriterion.assessmentMethod,
        displayOrder: sourceCriterion.displayOrder,
      });
    }
  },

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getGroupById: (groupId) => {
    const state = get();
    for (const groups of Object.values(state.groupsByStudyId)) {
      const group = groups.find((g) => g.id === groupId);
      if (group) return group;
    }
    return undefined;
  },

  getCriterionById: (criterionId) => {
    const state = get();
    for (const criteria of Object.values(state.criterionsByStudyId)) {
      const criterion = criteria.find((c) => c.id === criterionId);
      if (criterion) return criterion;
    }
    return undefined;
  },

  getEligibilityView: (studyId) => {
    const state = get();
    const criteria = state.criteriaByStudyId[studyId];
    if (!criteria) return undefined;
    
    const groups = state.groupsByStudyId[studyId] || [];
    const allCriteria = state.criterionsByStudyId[studyId] || [];
    
    // Build group views
    const inclusionGroups: EligibilityGroupView[] = groups
      .filter((g) => g.criterionType === 'Inclusion')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((group) => ({
        group,
        criteria: getCriteriaByGroup(allCriteria, group.id),
      }));
    
    const exclusionGroups: EligibilityGroupView[] = groups
      .filter((g) => g.criterionType === 'Exclusion')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((group) => ({
        group,
        criteria: getCriteriaByGroup(allCriteria, group.id),
      }));
    
    // Calculate statistics
    const counts = countCriteriaByType(allCriteria);
    const categoryCounts = {} as Record<USDMCriterionCategory, number>;
    for (const criterion of allCriteria) {
      categoryCounts[criterion.category] = (categoryCounts[criterion.category] || 0) + 1;
    }
    
    const statistics: EligibilityStatistics = {
      totalGroups: groups.length,
      inclusionGroups: inclusionGroups.length,
      exclusionGroups: exclusionGroups.length,
      totalCriteria: counts.total,
      inclusionCriteria: counts.inclusion,
      exclusionCriteria: counts.exclusion,
      requiredCriteria: allCriteria.filter((c) => c.isRequired).length,
      waivableCriteria: allCriteria.filter((c) => !c.isRequired).length,
      categoryCounts,
    };
    
    return {
      studyId,
      criteria,
      inclusionGroups,
      exclusionGroups,
      statistics,
    };
  },

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  selectCriteria: (criteriaId) => set({ selectedCriteriaId: criteriaId }),
  selectGroup: (groupId) => set({ selectedGroupId: groupId }),
  selectCriterion: (criterionId) => set({ selectedCriterionId: criterionId }),

  // ==========================================================================
  // RESET
  // ==========================================================================

  clearEligibilityStore: () => set(initialState),
}));

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Get eligibility criteria for a study
 */
export function useEligibilityCriteria(studyId: string): USDMEligibilityCriteria | undefined {
  return useUSDMEligibilityStore((state) => state.criteriaByStudyId[studyId]);
}

/**
 * Get criterion groups for a study, sorted by display order
 */
export function useEligibilityGroups(studyId: string): USDMEligibilityCriterionGroup[] {
  const groups = useUSDMEligibilityStore((state) => state.groupsByStudyId[studyId] || []);
  return useMemo(
    () => [...groups].sort((a, b) => a.displayOrder - b.displayOrder),
    [groups]
  );
}

/**
 * Get inclusion groups for a study
 */
export function useInclusionGroups(studyId: string): USDMEligibilityCriterionGroup[] {
  const groups = useEligibilityGroups(studyId);
  return useMemo(
    () => groups.filter((g) => g.criterionType === 'Inclusion'),
    [groups]
  );
}

/**
 * Get exclusion groups for a study
 */
export function useExclusionGroups(studyId: string): USDMEligibilityCriterionGroup[] {
  const groups = useEligibilityGroups(studyId);
  return useMemo(
    () => groups.filter((g) => g.criterionType === 'Exclusion'),
    [groups]
  );
}

/**
 * Get all criteria for a study
 */
export function useEligibilityCriterionList(studyId: string): USDMEligibilityCriterion[] {
  const criteria = useUSDMEligibilityStore((state) => state.criterionsByStudyId[studyId] || []);
  return useMemo(
    () => [...criteria].sort((a, b) => a.displayOrder - b.displayOrder),
    [criteria]
  );
}

/**
 * Get inclusion criteria for a study
 */
export function useInclusionCriteria(studyId: string): USDMEligibilityCriterion[] {
  const criteria = useEligibilityCriterionList(studyId);
  return useMemo(
    () => criteria.filter((c) => c.criterionType === 'Inclusion'),
    [criteria]
  );
}

/**
 * Get exclusion criteria for a study
 */
export function useExclusionCriteria(studyId: string): USDMEligibilityCriterion[] {
  const criteria = useEligibilityCriterionList(studyId);
  return useMemo(
    () => criteria.filter((c) => c.criterionType === 'Exclusion'),
    [criteria]
  );
}

/**
 * Get complete eligibility view for a study
 */
export function useEligibilityView(studyId: string): EligibilityView | undefined {
  return useUSDMEligibilityStore((state) => state.getEligibilityView(studyId));
}

/**
 * Get currently selected group
 */
export function useSelectedGroup(): USDMEligibilityCriterionGroup | undefined {
  return useUSDMEligibilityStore((state) => {
    const groupId = state.selectedGroupId;
    if (!groupId) return undefined;
    return state.getGroupById(groupId);
  });
}

/**
 * Get currently selected criterion
 */
export function useSelectedCriterion(): USDMEligibilityCriterion | undefined {
  return useUSDMEligibilityStore((state) => {
    const criterionId = state.selectedCriterionId;
    if (!criterionId) return undefined;
    return state.getCriterionById(criterionId);
  });
}

// ============================================================================
// MOCK DATA LOADER
// ============================================================================

/**
 * Load mock eligibility data for LIG-2847 Phase 3 NSCLC study
 */
export function loadEligibilityMockData(studyId: string): void {
  const store = useUSDMEligibilityStore.getState();
  
  // Create eligibility criteria container
  store.setEligibilityCriteria(studyId, {
    description: 'Eligibility criteria for Phase 3 study of LIG-2847 in advanced NSCLC',
    targetPopulation: 'Adult patients with histologically confirmed advanced or metastatic NSCLC with documented EGFR mutations',
    minimumAge: { value: 18, unit: 'Years' },
    maximumAge: { value: 99, unit: 'Years' },
    sex: 'All',
    healthyVolunteers: false,
  });
  
  // Create inclusion criteria group
  const inclusionGroup = store.addGroup(studyId, {
    name: 'Inclusion Criteria',
    description: 'Criteria that must be met for study participation',
    criterionType: 'Inclusion',
    displayOrder: 0,
  });
  
  // Create exclusion criteria group  
  const exclusionGroup = store.addGroup(studyId, {
    name: 'Exclusion Criteria',
    description: 'Criteria that preclude study participation',
    criterionType: 'Exclusion',
    displayOrder: 1,
  });
  
  // Add inclusion criteria
  const inclusionCriteria: Partial<USDMEligibilityCriterion>[] = [
    {
      groupId: inclusionGroup.id,
      identifier: 'I1',
      name: 'Age',
      text: 'Age ≥18 years at the time of informed consent',
      category: 'Demographics',
      isRequired: true,
      assessmentMethod: 'Date of birth verification',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I2',
      name: 'NSCLC Diagnosis',
      text: 'Histologically or cytologically confirmed diagnosis of advanced or metastatic non-small cell lung cancer (Stage IIIB/IIIC not amenable to curative therapy or Stage IV)',
      category: 'Diagnosis',
      isRequired: true,
      assessmentMethod: 'Pathology report review',
      dictionaryReference: { dictionary: 'MedDRA', code: '10029514', text: 'Non-small cell lung cancer' },
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I3',
      name: 'EGFR Mutation',
      text: 'Documented EGFR mutation (exon 19 deletion or L858R mutation in exon 21) determined by validated test',
      category: 'Diagnosis',
      isRequired: true,
      assessmentMethod: 'Central laboratory or validated local testing',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I4',
      name: 'Measurable Disease',
      text: 'At least one measurable lesion per RECIST v1.1 criteria',
      category: 'Diagnosis',
      isRequired: true,
      assessmentMethod: 'CT or MRI within 28 days of enrollment',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I5',
      name: 'ECOG Performance Status',
      text: 'ECOG performance status of 0 or 1',
      category: 'Performance',
      isRequired: true,
      assessmentMethod: 'Investigator assessment at screening',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I6',
      name: 'Adequate Organ Function',
      text: 'Adequate hematologic, hepatic, and renal function as defined by laboratory parameters',
      category: 'Laboratory',
      isRequired: true,
      assessmentMethod: 'Central laboratory results within 14 days of enrollment',
      contextDescription: 'ANC ≥1500/µL, Platelets ≥100,000/µL, Hgb ≥9 g/dL, Total bilirubin ≤1.5× ULN, AST/ALT ≤2.5× ULN, Creatinine clearance ≥50 mL/min',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I7',
      name: 'Informed Consent',
      text: 'Ability to understand and willingness to sign a written informed consent document',
      category: 'Consent',
      isRequired: true,
      assessmentMethod: 'Signed ICF on file',
    },
    {
      groupId: inclusionGroup.id,
      identifier: 'I8',
      name: 'Contraception',
      text: 'Women of childbearing potential must agree to use adequate contraception from screening through 6 months after last dose of study drug',
      category: 'Contraception',
      isRequired: true,
      applicabilityCondition: 'Women of childbearing potential only',
      assessmentMethod: 'Documented agreement in medical record',
    },
  ];
  
  // Add exclusion criteria
  const exclusionCriteria: Partial<USDMEligibilityCriterion>[] = [
    {
      groupId: exclusionGroup.id,
      identifier: 'E1',
      name: 'Prior EGFR TKI',
      text: 'Prior treatment with any EGFR tyrosine kinase inhibitor',
      category: 'Medications',
      isRequired: true,
      assessmentMethod: 'Medical history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E2',
      name: 'Brain Metastases',
      text: 'Symptomatic or untreated CNS metastases. Patients with treated brain metastases are eligible if clinically stable for at least 2 weeks and not requiring steroids',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'Brain MRI within 28 days of enrollment',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E3',
      name: 'Other Malignancy',
      text: 'History of another primary malignancy within 3 years prior to enrollment, except adequately treated non-melanoma skin cancer or cervical carcinoma in situ',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'Medical history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E4',
      name: 'Cardiac Disease',
      text: 'Clinically significant cardiovascular disease including uncontrolled hypertension, unstable angina, myocardial infarction within 6 months, or QTcF >470 ms',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'ECG and cardiac history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E5',
      name: 'Interstitial Lung Disease',
      text: 'History of interstitial lung disease or radiation pneumonitis requiring treatment with steroids',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'Medical history and imaging review',
      dictionaryReference: { dictionary: 'MedDRA', code: '10022611', text: 'Interstitial lung disease' },
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E6',
      name: 'GI Disorders',
      text: 'Any condition that impairs ability to swallow or absorb oral medications',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'Medical history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E7',
      name: 'Pregnancy/Lactation',
      text: 'Pregnant or breastfeeding women',
      category: 'Demographics',
      isRequired: true,
      assessmentMethod: 'Serum pregnancy test at screening',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E8',
      name: 'Known Hypersensitivity',
      text: 'Known hypersensitivity to LIG-2847 or any of its excipients',
      category: 'Medical History',
      isRequired: true,
      assessmentMethod: 'Medical history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E9',
      name: 'Concurrent Anticancer Therapy',
      text: 'Concurrent use of any anticancer therapy or investigational agent',
      category: 'Medications',
      isRequired: true,
      assessmentMethod: 'Medication history review',
    },
    {
      groupId: exclusionGroup.id,
      identifier: 'E10',
      name: 'Strong CYP3A4 Inhibitors',
      text: 'Current use of strong CYP3A4 inhibitors or inducers',
      category: 'Medications',
      isRequired: true,
      assessmentMethod: 'Medication history review',
      contextDescription: 'Washout period of at least 14 days required before first dose',
    },
  ];
  
  store.bulkAddCriteria(studyId, inclusionCriteria);
  store.bulkAddCriteria(studyId, exclusionCriteria);
}

/**
 * Clear eligibility store (for testing)
 */
export function clearEligibilityStore(): void {
  useUSDMEligibilityStore.getState().clearEligibilityStore();
}
