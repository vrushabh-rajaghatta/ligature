

// ============================================================================
// USDM Store - Unified Study Definitions Model State Management (v202)
// TransCelerate/CDISC DDF Compliant with Ligature Lineage Tracking
// ============================================================================

import { create } from 'zustand';
import {
  USDMStudy,
  USDMStudyDesign,
  USDMObjective,
  USDMEndpoint,
  USDMStudyPopulation,
  USDMEligibilityCriteria,
  USDMStudyArm,
  USDMStudyEpoch,
  USDMStudyCell,
  USDMActivity,
  USDMEncounter,
  USDMScheduleTimeline,
  USDMScheduledActivityInstance,
  USDMBiomedicalConcept,
  USDMStudyIntervention,
  USDMDataLineage,
  USDMLineageAppearance,
  USDMState,
  USDMActions,
  USDMView,
  USDMCode,
} from './usdmTypes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => `usdm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createCode = (code: string, codeSystem: string, decode: string): USDMCode => ({
  code,
  codeSystem,
  decode,
});

const createInitialLineage = (sourceEntityId: string, sourceEntityType: USDMDataLineage['sourceEntityType']): USDMDataLineage => ({
  sourceEntityId,
  sourceEntityType,
  appearances: [],
  lastUpdated: new Date().toISOString(),
  versionHash: generateId(),
});

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMState = {
  studies: {},
  studyDesigns: {},
  objectives: {},
  endpoints: {},
  populations: {},
  eligibilityCriteria: {},
  studyArms: {},
  studyEpochs: {},
  studyCells: {},
  activities: {},
  encounters: {},
  timelines: {},
  scheduledInstances: {},
  biomedicalConcepts: {},
  interventions: {},
  
  studyByProductId: {},
  studyByCTMSId: {},
  objectivesByStudyDesignId: {},
  endpointsByObjectiveId: {},
  lineageIndex: {},
  
  selectedStudyId: null,
  selectedStudyDesignId: null,
  selectedObjectiveId: null,
  activeView: 'dashboard',
  isLoading: false,
  error: null,
  lastExportedAt: null,
  exportFormat: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMStore = create<USDMState & USDMActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // STUDY CRUD
  // ==========================================================================

  createStudy: (data) => {
    const id = data.id || generateId();
    const now = new Date().toISOString();
    
    const study: USDMStudy = {
      id,
      instanceType: 'Study',
      studyTitle: data.studyTitle || 'New Study',
      studyShortTitle: data.studyShortTitle || 'New Study',
      studyRationale: data.studyRationale || '',
      studyAcronym: data.studyAcronym,
      studyProtocolVersions: data.studyProtocolVersions || [],
      studyIdentifiers: data.studyIdentifiers || [],
      studyType: data.studyType || createCode('C98388', 'C66830', 'INTERVENTIONAL'),
      studyPhase: data.studyPhase || createCode('C49686', 'C66737', 'Phase 3'),
      businessTherapeuticAreas: data.businessTherapeuticAreas || [],
      studyDesigns: [],
      linkedProductId: data.linkedProductId,
      linkedCTMSStudyId: data.linkedCTMSStudyId,
      linkedSubmissionIds: data.linkedSubmissionIds || [],
      createdAt: now,
      createdBy: data.createdBy || 'system',
      updatedAt: now,
      version: 1,
    };
    
    set((state) => ({
      studies: { ...state.studies, [id]: study },
      studyByProductId: data.linkedProductId 
        ? {
            ...state.studyByProductId,
            [data.linkedProductId]: [...(state.studyByProductId[data.linkedProductId] || []), id],
          }
        : state.studyByProductId,
      studyByCTMSId: data.linkedCTMSStudyId
        ? {
            ...state.studyByCTMSId,
            [data.linkedCTMSStudyId]: id,
          }
        : state.studyByCTMSId,
    }));
    
    return study;
  },

  updateStudy: (id, updates) => {
    set((state) => {
      const study = state.studies[id];
      if (!study) return state;
      
      return {
        studies: {
          ...state.studies,
          [id]: {
            ...study,
            ...updates,
            updatedAt: new Date().toISOString(),
            version: study.version + 1,
          },
        },
      };
    });
  },

  deleteStudy: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.studies;
      return { studies: rest };
    });
  },

  // ==========================================================================
  // STUDY DESIGN
  // ==========================================================================

  createStudyDesign: (studyId, data) => {
    const id = data.id || generateId();
    
    const design: USDMStudyDesign = {
      id,
      instanceType: 'StudyDesign',
      studyDesignName: data.studyDesignName || 'Study Design 1',
      studyDesignDescription: data.studyDesignDescription,
      therapeuticAreas: data.therapeuticAreas || [],
      studyIndications: data.studyIndications || [],
      studyInterventions: data.studyInterventions || [],
      trialIntentTypes: data.trialIntentTypes || [],
      trialTypes: data.trialTypes || [],
      interventionModel: data.interventionModel || createCode('C82639', 'C66785', 'PARALLEL'),
      objectives: [],
      studyPopulations: data.studyPopulations || [],
      studyArms: [],
      studyEpochs: [],
      studyCells: [],
      activities: [],
      encounters: [],
      timelines: [],
      biomedicalConcepts: [],
      bcCategories: [],
      bcSurrogates: [],
      studyWorkflows: [],
      maskingRoles: data.maskingRoles || [],
      studyEstimands: [],
    };
    
    set((state) => ({
      studyDesigns: { ...state.studyDesigns, [id]: design },
      studies: {
        ...state.studies,
        [studyId]: {
          ...state.studies[studyId],
          studyDesigns: [...(state.studies[studyId]?.studyDesigns || []), design],
        },
      },
    }));
    
    return design;
  },

  updateStudyDesign: (id, updates) => {
    set((state) => ({
      studyDesigns: {
        ...state.studyDesigns,
        [id]: { ...state.studyDesigns[id], ...updates },
      },
    }));
  },

  // ==========================================================================
  // OBJECTIVES & ENDPOINTS
  // ==========================================================================

  addObjective: (studyDesignId, data) => {
    const id = data.id || generateId();
    
    const objective: USDMObjective = {
      id,
      instanceType: 'Objective',
      objectiveDescription: data.objectiveDescription || '',
      objectiveLevel: data.objectiveLevel || createCode('C98772', 'C66787', 'PRIMARY'),
      objectiveEndpoints: [],
      lineage: createInitialLineage(id, 'objective'),
    };
    
    set((state) => ({
      objectives: { ...state.objectives, [id]: objective },
      objectivesByStudyDesignId: {
        ...state.objectivesByStudyDesignId,
        [studyDesignId]: [...(state.objectivesByStudyDesignId[studyDesignId] || []), id],
      },
      lineageIndex: {
        ...state.lineageIndex,
        [id]: objective.lineage,
      },
    }));
    
    return objective;
  },

  updateObjective: (id, updates) => {
    set((state) => {
      const objective = state.objectives[id];
      if (!objective) return state;
      
      const updatedLineage = {
        ...objective.lineage,
        lastUpdated: new Date().toISOString(),
        versionHash: generateId(),
      };
      
      return {
        objectives: {
          ...state.objectives,
          [id]: { ...objective, ...updates, lineage: updatedLineage },
        },
        lineageIndex: {
          ...state.lineageIndex,
          [id]: updatedLineage,
        },
      };
    });
  },

  removeObjective: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.objectives;
      const { [id]: removedLineage, ...restLineage } = state.lineageIndex;
      return { 
        objectives: rest,
        lineageIndex: restLineage,
      };
    });
  },

  addEndpoint: (objectiveId, data) => {
    const id = data.id || generateId();
    
    const endpoint: USDMEndpoint = {
      id,
      instanceType: 'Endpoint',
      endpointDescription: data.endpointDescription || '',
      endpointPurposeDescription: data.endpointPurposeDescription,
      endpointLevel: data.endpointLevel || createCode('C98772', 'C66787', 'PRIMARY'),
      outcomeLevel: data.outcomeLevel,
      lineage: createInitialLineage(id, 'endpoint'),
    };
    
    set((state) => ({
      endpoints: { ...state.endpoints, [id]: endpoint },
      endpointsByObjectiveId: {
        ...state.endpointsByObjectiveId,
        [objectiveId]: [...(state.endpointsByObjectiveId[objectiveId] || []), id],
      },
      objectives: {
        ...state.objectives,
        [objectiveId]: {
          ...state.objectives[objectiveId],
          objectiveEndpoints: [...state.objectives[objectiveId].objectiveEndpoints, endpoint],
        },
      },
      lineageIndex: {
        ...state.lineageIndex,
        [id]: endpoint.lineage,
      },
    }));
    
    return endpoint;
  },

  updateEndpoint: (id, updates) => {
    set((state) => {
      const endpoint = state.endpoints[id];
      if (!endpoint) return state;
      
      const updatedLineage = {
        ...endpoint.lineage,
        lastUpdated: new Date().toISOString(),
        versionHash: generateId(),
      };
      
      return {
        endpoints: {
          ...state.endpoints,
          [id]: { ...endpoint, ...updates, lineage: updatedLineage },
        },
        lineageIndex: {
          ...state.lineageIndex,
          [id]: updatedLineage,
        },
      };
    });
  },

  removeEndpoint: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.endpoints;
      const { [id]: removedLineage, ...restLineage } = state.lineageIndex;
      return { 
        endpoints: rest,
        lineageIndex: restLineage,
      };
    });
  },

  // ==========================================================================
  // STUDY STRUCTURE (Arms, Epochs)
  // ==========================================================================

  addStudyArm: (studyDesignId, data) => {
    const id = data.id || generateId();
    
    const arm: USDMStudyArm = {
      id,
      instanceType: 'StudyArm',
      studyArmName: data.studyArmName || 'Treatment Arm',
      studyArmDescription: data.studyArmDescription,
      studyArmType: data.studyArmType || createCode('C174266', 'C66768', 'EXPERIMENTAL'),
      studyArmDataOriginDescription: data.studyArmDataOriginDescription,
      studyArmDataOriginType: data.studyArmDataOriginType,
      notes: data.notes,
    };
    
    set((state) => ({
      studyArms: { ...state.studyArms, [id]: arm },
    }));
    
    return arm;
  },

  updateStudyArm: (id, updates) => {
    set((state) => ({
      studyArms: {
        ...state.studyArms,
        [id]: { ...state.studyArms[id], ...updates },
      },
    }));
  },

  removeStudyArm: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.studyArms;
      return { studyArms: rest };
    });
  },

  addStudyEpoch: (studyDesignId, data) => {
    const id = data.id || generateId();
    
    const epoch: USDMStudyEpoch = {
      id,
      instanceType: 'StudyEpoch',
      studyEpochName: data.studyEpochName || 'Epoch',
      studyEpochDescription: data.studyEpochDescription,
      studyEpochType: data.studyEpochType || createCode('C98779', 'C66781', 'TREATMENT'),
      previousStudyEpochId: data.previousStudyEpochId,
      nextStudyEpochId: data.nextStudyEpochId,
      notes: data.notes,
    };
    
    set((state) => ({
      studyEpochs: { ...state.studyEpochs, [id]: epoch },
    }));
    
    return epoch;
  },

  updateStudyEpoch: (id, updates) => {
    set((state) => ({
      studyEpochs: {
        ...state.studyEpochs,
        [id]: { ...state.studyEpochs[id], ...updates },
      },
    }));
  },

  removeStudyEpoch: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.studyEpochs;
      return { studyEpochs: rest };
    });
  },

  // ==========================================================================
  // SCHEDULE OF ACTIVITIES
  // ==========================================================================

  addActivity: (studyDesignId, data) => {
    const id = data.id || generateId();
    
    const activity: USDMActivity = {
      id,
      instanceType: 'Activity',
      activityName: data.activityName || 'Activity',
      activityDescription: data.activityDescription,
      definedProcedures: data.definedProcedures || [],
      biomedicalConceptIds: data.biomedicalConceptIds || [],
      previousActivityId: data.previousActivityId,
      nextActivityId: data.nextActivityId,
      activityTimelineId: data.activityTimelineId,
      notes: data.notes,
    };
    
    set((state) => ({
      activities: { ...state.activities, [id]: activity },
    }));
    
    return activity;
  },

  updateActivity: (id, updates) => {
    set((state) => ({
      activities: {
        ...state.activities,
        [id]: { ...state.activities[id], ...updates },
      },
    }));
  },

  removeActivity: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.activities;
      return { activities: rest };
    });
  },

  addEncounter: (studyDesignId, data) => {
    const id = data.id || generateId();
    
    const encounter: USDMEncounter = {
      id,
      instanceType: 'Encounter',
      encounterName: data.encounterName || 'Visit',
      encounterDescription: data.encounterDescription,
      encounterLabel: data.encounterLabel,
      encounterType: data.encounterType || createCode('C99158', 'C66742', 'SCHEDULED'),
      encounterEnvironmentalSetting: data.encounterEnvironmentalSetting,
      encounterContactModes: data.encounterContactModes || [],
      transitionStartRule: data.transitionStartRule,
      transitionEndRule: data.transitionEndRule,
      scheduledAtTimingId: data.scheduledAtTimingId,
      previousEncounterId: data.previousEncounterId,
      nextEncounterId: data.nextEncounterId,
      notes: data.notes,
    };
    
    set((state) => ({
      encounters: { ...state.encounters, [id]: encounter },
    }));
    
    return encounter;
  },

  updateEncounter: (id, updates) => {
    set((state) => ({
      encounters: {
        ...state.encounters,
        [id]: { ...state.encounters[id], ...updates },
      },
    }));
  },

  removeEncounter: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.encounters;
      return { encounters: rest };
    });
  },

  scheduleActivity: (activityId, encounterId, timingId) => {
    const id = generateId();
    
    const instance: USDMScheduledActivityInstance = {
      id,
      instanceType: 'ScheduledActivityInstance',
      activityId,
      encounterId,
      timingId,
    };
    
    set((state) => ({
      scheduledInstances: { ...state.scheduledInstances, [id]: instance },
    }));
    
    return instance;
  },

  unscheduleActivity: (instanceId) => {
    set((state) => {
      const { [instanceId]: removed, ...rest } = state.scheduledInstances;
      return { scheduledInstances: rest };
    });
  },

  // ==========================================================================
  // ELIGIBILITY
  // ==========================================================================

  addEligibilityCriterion: (populationId, data) => {
    const id = data.id || generateId();
    
    const criterion: USDMEligibilityCriteria = {
      id,
      instanceType: 'EligibilityCriteria',
      name: data.name,
      label: data.label,
      description: data.description,
      text: data.text || '',
      category: data.category || createCode('C25532', 'C66728', 'INCLUSION'),
      identifier: data.identifier,
      contextIds: data.contextIds,
      dictionaryId: data.dictionaryId,
      lineage: data.lineage,
    };
    
    set((state) => ({
      eligibilityCriteria: { ...state.eligibilityCriteria, [id]: criterion },
    }));
    
    return criterion;
  },

  updateEligibilityCriterion: (id, updates) => {
    set((state) => ({
      eligibilityCriteria: {
        ...state.eligibilityCriteria,
        [id]: { ...state.eligibilityCriteria[id], ...updates },
      },
    }));
  },

  removeEligibilityCriterion: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.eligibilityCriteria;
      return { eligibilityCriteria: rest };
    });
  },

  // ==========================================================================
  // LINEAGE MANAGEMENT (Key Differentiator)
  // ==========================================================================

  trackLineage: (entityId, entityType) => {
    const lineage = createInitialLineage(entityId, entityType);
    set((state) => ({
      lineageIndex: { ...state.lineageIndex, [entityId]: lineage },
    }));
  },

  recordLineageAppearance: (entityId, appearance) => {
    set((state) => {
      const lineage = state.lineageIndex[entityId];
      if (!lineage) return state;
      
      const existingIndex = lineage.appearances.findIndex(
        (a) => a.module === appearance.module && a.entityId === appearance.entityId
      );
      
      const updatedAppearances = existingIndex >= 0
        ? [
            ...lineage.appearances.slice(0, existingIndex),
            appearance,
            ...lineage.appearances.slice(existingIndex + 1),
          ]
        : [...lineage.appearances, appearance];
      
      const updatedLineage = {
        ...lineage,
        appearances: updatedAppearances,
        lastUpdated: new Date().toISOString(),
      };
      
      // Also update the entity's lineage if it's an objective or endpoint
      let updatedObjectives = state.objectives;
      let updatedEndpoints = state.endpoints;
      
      if (state.objectives[entityId]) {
        updatedObjectives = {
          ...state.objectives,
          [entityId]: {
            ...state.objectives[entityId],
            lineage: updatedLineage,
          },
        };
      }
      
      if (state.endpoints[entityId]) {
        updatedEndpoints = {
          ...state.endpoints,
          [entityId]: {
            ...state.endpoints[entityId],
            lineage: updatedLineage,
          },
        };
      }
      
      return {
        objectives: updatedObjectives,
        endpoints: updatedEndpoints,
        lineageIndex: {
          ...state.lineageIndex,
          [entityId]: updatedLineage,
        },
      };
    });
  },

  syncLineage: async (entityId) => {
    // This would sync with other Ligature modules
    // For now, mark as synced
    const state = get();
    const lineage = state.lineageIndex[entityId];
    if (!lineage) return;
    
    const updatedAppearances = lineage.appearances.map((a) => ({
      ...a,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'current' as const,
    }));
    
    set((state) => ({
      lineageIndex: {
        ...state.lineageIndex,
        [entityId]: {
          ...lineage,
          appearances: updatedAppearances,
          lastUpdated: new Date().toISOString(),
        },
      },
    }));
  },

  getLineageForEntity: (entityId) => {
    return get().lineageIndex[entityId] || null;
  },

  findOutdatedLineage: () => {
    const state = get();
    const results: { entityId: string; lineage: USDMDataLineage }[] = [];
    
    Object.entries(state.lineageIndex).forEach(([entityId, lineage]) => {
      const hasOutdated = lineage.appearances.some((a) => a.syncStatus === 'outdated');
      if (hasOutdated) {
        results.push({ entityId, lineage });
      }
    });
    
    return results;
  },

  // ==========================================================================
  // CROSS-MODULE LINKING
  // ==========================================================================

  linkToCTMSStudy: (usdmStudyId, ctmsStudyId) => {
    set((state) => ({
      studies: {
        ...state.studies,
        [usdmStudyId]: {
          ...state.studies[usdmStudyId],
          linkedCTMSStudyId: ctmsStudyId,
        },
      },
      studyByCTMSId: {
        ...state.studyByCTMSId,
        [ctmsStudyId]: usdmStudyId,
      },
    }));
  },

  linkToProduct: (usdmStudyId, productId) => {
    set((state) => ({
      studies: {
        ...state.studies,
        [usdmStudyId]: {
          ...state.studies[usdmStudyId],
          linkedProductId: productId,
        },
      },
      studyByProductId: {
        ...state.studyByProductId,
        [productId]: [...(state.studyByProductId[productId] || []), usdmStudyId],
      },
    }));
  },

  linkToSubmission: (usdmStudyId, submissionId) => {
    set((state) => ({
      studies: {
        ...state.studies,
        [usdmStudyId]: {
          ...state.studies[usdmStudyId],
          linkedSubmissionIds: [
            ...state.studies[usdmStudyId].linkedSubmissionIds,
            submissionId,
          ],
        },
      },
    }));
  },

  // ==========================================================================
  // EXPORT / IMPORT
  // ==========================================================================

  exportToUSDMJson: (studyId) => {
    const state = get();
    const study = state.studies[studyId];
    if (!study) return {};
    
    // Build full USDM JSON structure
    const objectiveIds = Object.values(state.objectivesByStudyDesignId).flat();
    const objectives = objectiveIds.map((id) => state.objectives[id]).filter(Boolean);
    
    return {
      study: {
        ...study,
        studyDesigns: study.studyDesigns.map((design) => ({
          ...design,
          objectives: objectives.filter((o) => 
            state.objectivesByStudyDesignId[design.id]?.includes(o.id)
          ),
          studyArms: Object.values(state.studyArms),
          studyEpochs: Object.values(state.studyEpochs),
          activities: Object.values(state.activities),
          encounters: Object.values(state.encounters),
        })),
      },
    };
  },

  exportToProtocolPDF: async (studyId) => {
    // Would generate PDF - placeholder for now
    return new Blob(['Protocol PDF'], { type: 'application/pdf' });
  },

  importFromUSDMJson: (json) => {
    // Parse USDM JSON and create study
    const data = json as any;
    return get().createStudy(data.study);
  },

  // ==========================================================================
  // UI ACTIONS
  // ==========================================================================

  setSelectedStudy: (id) => set({ selectedStudyId: id }),
  setSelectedStudyDesign: (id) => set({ selectedStudyDesignId: id }),
  setSelectedObjective: (id) => set({ selectedObjectiveId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ==========================================================================
  // MOCK DATA (Demo)
  // ==========================================================================

  loadMockData: () => {
    const store = get();
    
    // Create LIG-2847 study (linked to Golden Path product)
    const study = store.createStudy({
      studyTitle: 'A Randomized, Double-Blind, Placebo-Controlled Phase 3 Study of Ligrastinib (LIG-2847) in Patients with Previously Treated Advanced Non-Small Cell Lung Cancer with EGFR Mutations',
      studyShortTitle: 'LUMINATE-3',
      studyAcronym: 'LUMINATE-3',
      studyRationale: 'To evaluate the efficacy and safety of ligrastinib in patients with EGFR-mutant NSCLC who have progressed on prior TKI therapy.',
      studyType: createCode('C98388', 'C66830', 'INTERVENTIONAL'),
      studyPhase: createCode('C49686', 'C66737', 'Phase 3'),
      businessTherapeuticAreas: [createCode('C178786', 'MedDRA', 'Oncology')],
      linkedProductId: 'product-1', // LIG-2847
      linkedCTMSStudyId: 'ctms-study-1',
      studyIdentifiers: [
        {
          id: 'ident-1',
          instanceType: 'StudyIdentifier',
          studyIdentifier: 'LIG-2847-003',
          studyIdentifierScope: {
            id: 'org-sponsor',
            instanceType: 'Organization',
            organizationName: 'Ligature Therapeutics',
            organizationType: createCode('C70793', 'C66733', 'Sponsor'),
          },
        },
        {
          id: 'ident-2',
          instanceType: 'StudyIdentifier',
          studyIdentifier: 'NCT05847293',
          studyIdentifierScope: {
            id: 'org-ct-gov',
            instanceType: 'Organization',
            organizationName: 'ClinicalTrials.gov',
            organizationType: createCode('C93453', 'C66733', 'Registry'),
          },
        },
      ],
      studyProtocolVersions: [
        {
          id: 'pv-1',
          instanceType: 'StudyProtocolVersion',
          briefTitle: 'LUMINATE-3: Ligrastinib in EGFR+ NSCLC',
          officialTitle: 'A Randomized, Double-Blind, Placebo-Controlled Phase 3 Study of Ligrastinib (LIG-2847) in Patients with Previously Treated Advanced Non-Small Cell Lung Cancer with EGFR Mutations',
          protocolVersion: '3.0',
          protocolEffectiveDate: '2024-06-15',
          protocolStatus: createCode('C48660', 'C66789', 'Final'),
        },
      ],
      createdBy: 'sean.mcniff@ligature.ai',
    });
    
    // Create Study Design
    const design = store.createStudyDesign(study.id, {
      studyDesignName: 'LUMINATE-3 Design v1',
      studyDesignDescription: 'Randomized 2:1 (ligrastinib:placebo) double-blind design',
      therapeuticAreas: [createCode('C178786', 'MedDRA', 'Oncology - Thoracic')],
      interventionModel: createCode('C82639', 'C66785', 'PARALLEL'),
      maskingRoles: [
        createCode('C28231', 'C66769', 'Subject'),
        createCode('C25936', 'C66769', 'Investigator'),
        createCode('C66795', 'C66769', 'Outcomes Assessor'),
      ],
      studyIndications: [
        {
          id: 'ind-1',
          instanceType: 'Indication',
          indicationDescription: 'Non-Small Cell Lung Cancer with EGFR mutation, previously treated',
          codes: [createCode('C3512', 'NCI', 'Non-Small Cell Lung Carcinoma')],
        },
      ],
      studyInterventions: [
        {
          id: 'int-1',
          instanceType: 'StudyIntervention',
          interventionDescription: 'Ligrastinib 150mg tablets',
          codes: [createCode('LIG-2847', 'SPONSOR', 'Ligrastinib')],
          administrations: [
            {
              id: 'admin-1',
              instanceType: 'Administration',
              administrationName: 'Ligrastinib 150mg QD',
              administrationDescription: 'Ligrastinib 150mg orally once daily',
              route: createCode('C38288', 'C66729', 'ORAL'),
              dose: { value: 150, unit: 'mg' },
              frequency: createCode('C64496', 'C71113', 'QD'),
            },
          ],
        },
      ],
    });
    
    // Add Primary Objective with lineage appearances
    const primaryObjective = store.addObjective(design.id, {
      objectiveDescription: 'To evaluate the efficacy of ligrastinib compared with placebo in patients with previously treated EGFR-mutant advanced NSCLC as measured by progression-free survival (PFS)',
      objectiveLevel: createCode('C98772', 'C66787', 'PRIMARY'),
    });
    
    // Add Primary Endpoint
    const primaryEndpoint = store.addEndpoint(primaryObjective.id, {
      endpointDescription: 'Progression-free survival (PFS) defined as time from randomization to first documented disease progression per RECIST 1.1 or death from any cause, whichever occurs first',
      endpointLevel: createCode('C98772', 'C66787', 'PRIMARY'),
    });
    
    // Record lineage appearances for demo
    store.recordLineageAppearance(primaryEndpoint.id, {
      module: 'ctms',
      entityType: 'efficacy-assessment',
      entityId: 'eff-assess-1',
      sectionReference: 'Efficacy Assessments',
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'current',
    });
    
    store.recordLineageAppearance(primaryEndpoint.id, {
      module: 'authoring',
      entityType: 'csr-section',
      entityId: 'csr-11-1',
      sectionReference: 'CSR Section 11.1 - Primary Efficacy Endpoint',
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'current',
    });
    
    store.recordLineageAppearance(primaryEndpoint.id, {
      module: 'submissions',
      entityType: 'module-5-section',
      entityId: 'mod5-3-5-1',
      sectionReference: 'Module 5.3.5.1 - Clinical Study Reports',
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'current',
    });
    
    // Add Secondary Objectives
    const orrObjective = store.addObjective(design.id, {
      objectiveDescription: 'To evaluate the overall response rate (ORR) of ligrastinib compared with placebo',
      objectiveLevel: createCode('C98773', 'C66787', 'SECONDARY'),
    });
    
    store.addEndpoint(orrObjective.id, {
      endpointDescription: 'Objective Response Rate (ORR) defined as the proportion of patients with confirmed complete response (CR) or partial response (PR) per RECIST 1.1',
      endpointLevel: createCode('C98773', 'C66787', 'SECONDARY'),
    });
    
    const osObjective = store.addObjective(design.id, {
      objectiveDescription: 'To evaluate overall survival (OS) of ligrastinib compared with placebo',
      objectiveLevel: createCode('C98773', 'C66787', 'SECONDARY'),
    });
    
    store.addEndpoint(osObjective.id, {
      endpointDescription: 'Overall Survival (OS) defined as time from randomization to death from any cause',
      endpointLevel: createCode('C98773', 'C66787', 'SECONDARY'),
    });
    
    // Add Study Arms
    store.addStudyArm(design.id, {
      studyArmName: 'Ligrastinib 150mg',
      studyArmDescription: 'Ligrastinib 150mg orally once daily plus best supportive care',
      studyArmType: createCode('C174266', 'C66768', 'EXPERIMENTAL'),
    });
    
    store.addStudyArm(design.id, {
      studyArmName: 'Placebo',
      studyArmDescription: 'Matching placebo orally once daily plus best supportive care',
      studyArmType: createCode('C174269', 'C66768', 'PLACEBO_COMPARATOR'),
    });
    
    // Add Study Epochs
    store.addStudyEpoch(design.id, {
      studyEpochName: 'Screening',
      studyEpochDescription: '28-day screening period',
      studyEpochType: createCode('C98775', 'C66781', 'SCREENING'),
    });
    
    store.addStudyEpoch(design.id, {
      studyEpochName: 'Treatment',
      studyEpochDescription: 'Treatment period until disease progression or unacceptable toxicity',
      studyEpochType: createCode('C98779', 'C66781', 'TREATMENT'),
    });
    
    store.addStudyEpoch(design.id, {
      studyEpochName: 'Follow-up',
      studyEpochDescription: 'Post-treatment safety and survival follow-up',
      studyEpochType: createCode('C98777', 'C66781', 'FOLLOW_UP'),
    });
    
    // Add Activities
    store.addActivity(design.id, {
      activityName: 'Informed Consent',
      activityDescription: 'Obtain written informed consent',
    });
    
    store.addActivity(design.id, {
      activityName: 'Medical History',
      activityDescription: 'Complete medical history and prior treatments',
    });
    
    store.addActivity(design.id, {
      activityName: 'Physical Examination',
      activityDescription: 'Complete physical examination',
    });
    
    store.addActivity(design.id, {
      activityName: 'Vital Signs',
      activityDescription: 'Blood pressure, heart rate, temperature, respiratory rate',
    });
    
    store.addActivity(design.id, {
      activityName: 'CT/MRI Tumor Assessment',
      activityDescription: 'Tumor imaging per RECIST 1.1',
    });
    
    store.addActivity(design.id, {
      activityName: 'Laboratory Assessments',
      activityDescription: 'Hematology, chemistry, urinalysis',
    });
    
    store.addActivity(design.id, {
      activityName: 'ECG',
      activityDescription: '12-lead electrocardiogram',
    });
    
    store.addActivity(design.id, {
      activityName: 'QoL Assessment',
      activityDescription: 'EORTC QLQ-C30 and QLQ-LC13',
    });
    
    // Add Encounters (Visits)
    store.addEncounter(design.id, {
      encounterName: 'Screening Visit',
      encounterLabel: 'SCR',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    store.addEncounter(design.id, {
      encounterName: 'Day 1 / Randomization',
      encounterLabel: 'D1',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    store.addEncounter(design.id, {
      encounterName: 'Week 3',
      encounterLabel: 'W3',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    store.addEncounter(design.id, {
      encounterName: 'Week 6',
      encounterLabel: 'W6',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    store.addEncounter(design.id, {
      encounterName: 'Week 9',
      encounterLabel: 'W9',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    store.addEncounter(design.id, {
      encounterName: 'Every 6 Weeks (Tumor Assessment)',
      encounterLabel: 'Q6W',
      encounterType: createCode('C99158', 'C66742', 'SCHEDULED'),
    });
    
    // Set selected study for UI
    set({ selectedStudyId: study.id, selectedStudyDesignId: design.id });
  },

  clearAll: () => {
    set(initialState);
  },
}));

// ============================================================================
// SELECTORS (for convenience) - wrapped with useMemo for stable references
// ============================================================================

import { useMemo } from 'react';

// Hook-based selectors with stable references
export const useStudies = () => {
  const studies = useUSDMStore((s) => s.studies);
  return useMemo(() => Object.values(studies), [studies]);
};

export const useStudyById = (id: string) => {
  return useUSDMStore((s) => s.studies[id]);
};

export const useObjectives = () => {
  const objectives = useUSDMStore((s) => s.objectives);
  return useMemo(() => Object.values(objectives), [objectives]);
};

export const useEndpoints = () => {
  const endpoints = useUSDMStore((s) => s.endpoints);
  return useMemo(() => Object.values(endpoints), [endpoints]);
};

export const useStudyArms = () => {
  const studyArms = useUSDMStore((s) => s.studyArms);
  return useMemo(() => Object.values(studyArms), [studyArms]);
};

export const useStudyEpochs = () => {
  const studyEpochs = useUSDMStore((s) => s.studyEpochs);
  return useMemo(() => Object.values(studyEpochs), [studyEpochs]);
};

export const useActivities = () => {
  const activities = useUSDMStore((s) => s.activities);
  return useMemo(() => Object.values(activities), [activities]);
};

export const useEncounters = () => {
  const encounters = useUSDMStore((s) => s.encounters);
  return useMemo(() => Object.values(encounters), [encounters]);
};

export const useObjectivesForStudyDesign = (studyDesignId: string) => {
  const objectiveIds = useUSDMStore((s) => s.objectivesByStudyDesignId[studyDesignId] || []);
  const objectives = useUSDMStore((s) => s.objectives);
  return useMemo(
    () => objectiveIds.map((id) => objectives[id]).filter(Boolean),
    [objectiveIds, objectives]
  );
};

export const useEndpointsForObjective = (objectiveId: string) => {
  const endpointIds = useUSDMStore((s) => s.endpointsByObjectiveId[objectiveId] || []);
  const endpoints = useUSDMStore((s) => s.endpoints);
  return useMemo(
    () => endpointIds.map((id) => endpoints[id]).filter(Boolean),
    [endpointIds, endpoints]
  );
};

export const useLineageForEntity = (entityId: string) => {
  return useUSDMStore((s) => s.lineageIndex[entityId]);
};

// Legacy selectors (kept for backward compatibility - prefer hooks above)
export const selectStudies = (state: USDMState) => Object.values(state.studies);
export const selectStudyById = (state: USDMState, id: string) => state.studies[id];
export const selectObjectives = (state: USDMState) => Object.values(state.objectives);
export const selectEndpoints = (state: USDMState) => Object.values(state.endpoints);
export const selectStudyArms = (state: USDMState) => Object.values(state.studyArms);
export const selectStudyEpochs = (state: USDMState) => Object.values(state.studyEpochs);
export const selectActivities = (state: USDMState) => Object.values(state.activities);
export const selectEncounters = (state: USDMState) => Object.values(state.encounters);

export const selectObjectivesForStudyDesign = (state: USDMState, studyDesignId: string) => {
  const objectiveIds = state.objectivesByStudyDesignId[studyDesignId] || [];
  return objectiveIds.map((id) => state.objectives[id]).filter(Boolean);
};

export const selectEndpointsForObjective = (state: USDMState, objectiveId: string) => {
  const endpointIds = state.endpointsByObjectiveId[objectiveId] || [];
  return endpointIds.map((id) => state.endpoints[id]).filter(Boolean);
};

export const selectLineageForEntity = (state: USDMState, entityId: string) => {
  return state.lineageIndex[entityId];
};
