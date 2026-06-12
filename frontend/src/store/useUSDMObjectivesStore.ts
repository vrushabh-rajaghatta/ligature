

// ============================================================================
// USDM Objectives & Endpoints Store v0.9.9e - Objectives, Endpoints, Estimands
// Zustand store for managing study objectives, endpoints, and ICH E9(R1) estimands
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  USDMStudyObjective,
  USDMEndpoint,
  USDMEstimand,
  USDMIntercurrentEvent,
  USDMObjectivesState,
  USDMObjectivesActions,
  USDMObjectiveLevel,
  USDMEndpointPurpose,
  ObjectivesEndpointsView,
  ObjectiveView,
  EndpointView,
  ObjectivesEndpointsStatistics,
  createStudyObjective,
  createEndpoint,
  createEstimand,
  createIntercurrentEvent,
  getObjectivesByLevel,
  getEndpointsByPurpose,
  getEstimandsForEndpoint,
  countObjectivesByLevel,
  countEndpointsByPurpose,
} from './usdm-objectives-types';
import { generateUSDMId } from './usdm-core-types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMObjectivesState = {
  objectivesByStudyId: {},
  endpointsByStudyId: {},
  estimandsByStudyId: {},
  iceByEstimandId: {},
  selectedObjectiveId: null,
  selectedEndpointId: null,
  selectedEstimandId: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMObjectivesStore = create<USDMObjectivesState & USDMObjectivesActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // OBJECTIVES
  // ==========================================================================

  addObjective: (studyId, objectiveData) => {
    const existingObjectives = get().objectivesByStudyId[studyId] || [];
    const levelObjectives = existingObjectives.filter(
      o => o.level === (objectiveData.level || 'Primary')
    );
    const displayOrder = objectiveData.displayOrder ?? levelObjectives.length;
    
    const objective = createStudyObjective(
      studyId,
      objectiveData.name || 'New Objective',
      objectiveData.text || '',
      objectiveData.level || 'Primary',
      displayOrder,
      objectiveData
    );
    
    set((state) => ({
      objectivesByStudyId: {
        ...state.objectivesByStudyId,
        [studyId]: [...existingObjectives, objective],
      },
    }));
    
    return objective;
  },

  updateObjective: (objectiveId, updates) => {
    set((state) => {
      const newObjectivesByStudyId = { ...state.objectivesByStudyId };
      
      for (const studyId of Object.keys(newObjectivesByStudyId)) {
        const objectives = newObjectivesByStudyId[studyId];
        const index = objectives.findIndex((o) => o.id === objectiveId);
        
        if (index !== -1) {
          newObjectivesByStudyId[studyId] = [
            ...objectives.slice(0, index),
            { ...objectives[index], ...updates, updatedAt: new Date().toISOString() },
            ...objectives.slice(index + 1),
          ];
          break;
        }
      }
      
      return { objectivesByStudyId: newObjectivesByStudyId };
    });
  },

  removeObjective: (objectiveId) => {
    set((state) => {
      const newObjectivesByStudyId = { ...state.objectivesByStudyId };
      
      for (const studyId of Object.keys(newObjectivesByStudyId)) {
        const objectives = newObjectivesByStudyId[studyId];
        const index = objectives.findIndex((o) => o.id === objectiveId);
        
        if (index !== -1) {
          newObjectivesByStudyId[studyId] = objectives.filter((o) => o.id !== objectiveId);
          break;
        }
      }
      
      return { objectivesByStudyId: newObjectivesByStudyId };
    });
  },

  reorderObjectives: (studyId, level, objectiveIds) => {
    set((state) => {
      const objectives = state.objectivesByStudyId[studyId] || [];
      const otherLevelObjectives = objectives.filter(o => o.level !== level);
      const reorderedObjectives = objectiveIds
        .map((id, idx) => {
          const obj = objectives.find(o => o.id === id);
          return obj ? { ...obj, displayOrder: idx, updatedAt: new Date().toISOString() } : null;
        })
        .filter((o): o is USDMStudyObjective => o !== null);
      
      return {
        objectivesByStudyId: {
          ...state.objectivesByStudyId,
          [studyId]: [...otherLevelObjectives, ...reorderedObjectives],
        },
      };
    });
  },

  linkEndpointToObjective: (objectiveId, endpointId) => {
    set((state) => {
      const newObjectivesByStudyId = { ...state.objectivesByStudyId };
      
      for (const studyId of Object.keys(newObjectivesByStudyId)) {
        const objectives = newObjectivesByStudyId[studyId];
        const index = objectives.findIndex((o) => o.id === objectiveId);
        
        if (index !== -1) {
          const objective = objectives[index];
          if (!objective.endpointIds.includes(endpointId)) {
            newObjectivesByStudyId[studyId] = [
              ...objectives.slice(0, index),
              {
                ...objective,
                endpointIds: [...objective.endpointIds, endpointId],
                updatedAt: new Date().toISOString(),
              },
              ...objectives.slice(index + 1),
            ];
          }
          break;
        }
      }
      
      return { objectivesByStudyId: newObjectivesByStudyId };
    });
  },

  unlinkEndpointFromObjective: (objectiveId, endpointId) => {
    set((state) => {
      const newObjectivesByStudyId = { ...state.objectivesByStudyId };
      
      for (const studyId of Object.keys(newObjectivesByStudyId)) {
        const objectives = newObjectivesByStudyId[studyId];
        const index = objectives.findIndex((o) => o.id === objectiveId);
        
        if (index !== -1) {
          const objective = objectives[index];
          newObjectivesByStudyId[studyId] = [
            ...objectives.slice(0, index),
            {
              ...objective,
              endpointIds: objective.endpointIds.filter(id => id !== endpointId),
              updatedAt: new Date().toISOString(),
            },
            ...objectives.slice(index + 1),
          ];
          break;
        }
      }
      
      return { objectivesByStudyId: newObjectivesByStudyId };
    });
  },

  // ==========================================================================
  // ENDPOINTS
  // ==========================================================================

  addEndpoint: (studyId, endpointData) => {
    const existingEndpoints = get().endpointsByStudyId[studyId] || [];
    const purposeEndpoints = existingEndpoints.filter(
      e => e.purpose === (endpointData.purpose || 'Primary')
    );
    const displayOrder = endpointData.displayOrder ?? purposeEndpoints.length;
    
    const endpoint = createEndpoint(
      studyId,
      endpointData.name || 'New Endpoint',
      endpointData.text || '',
      endpointData.purpose || 'Primary',
      endpointData.outcomeMeasure || { name: '' },
      displayOrder,
      endpointData
    );
    
    set((state) => ({
      endpointsByStudyId: {
        ...state.endpointsByStudyId,
        [studyId]: [...existingEndpoints, endpoint],
      },
    }));
    
    return endpoint;
  },

  updateEndpoint: (endpointId, updates) => {
    set((state) => {
      const newEndpointsByStudyId = { ...state.endpointsByStudyId };
      
      for (const studyId of Object.keys(newEndpointsByStudyId)) {
        const endpoints = newEndpointsByStudyId[studyId];
        const index = endpoints.findIndex((e) => e.id === endpointId);
        
        if (index !== -1) {
          newEndpointsByStudyId[studyId] = [
            ...endpoints.slice(0, index),
            { ...endpoints[index], ...updates, updatedAt: new Date().toISOString() },
            ...endpoints.slice(index + 1),
          ];
          break;
        }
      }
      
      return { endpointsByStudyId: newEndpointsByStudyId };
    });
  },

  removeEndpoint: (endpointId) => {
    set((state) => {
      const newEndpointsByStudyId = { ...state.endpointsByStudyId };
      const newObjectivesByStudyId = { ...state.objectivesByStudyId };
      
      for (const studyId of Object.keys(newEndpointsByStudyId)) {
        const endpoints = newEndpointsByStudyId[studyId];
        const index = endpoints.findIndex((e) => e.id === endpointId);
        
        if (index !== -1) {
          // Remove endpoint
          newEndpointsByStudyId[studyId] = endpoints.filter((e) => e.id !== endpointId);
          
          // Also unlink from objectives
          if (newObjectivesByStudyId[studyId]) {
            newObjectivesByStudyId[studyId] = newObjectivesByStudyId[studyId].map(obj => ({
              ...obj,
              endpointIds: obj.endpointIds.filter(id => id !== endpointId),
              updatedAt: new Date().toISOString(),
            }));
          }
          break;
        }
      }
      
      return {
        endpointsByStudyId: newEndpointsByStudyId,
        objectivesByStudyId: newObjectivesByStudyId,
      };
    });
  },

  reorderEndpoints: (studyId, purpose, endpointIds) => {
    set((state) => {
      const endpoints = state.endpointsByStudyId[studyId] || [];
      const otherPurposeEndpoints = endpoints.filter(e => e.purpose !== purpose);
      const reorderedEndpoints = endpointIds
        .map((id, idx) => {
          const ep = endpoints.find(e => e.id === id);
          return ep ? { ...ep, displayOrder: idx, updatedAt: new Date().toISOString() } : null;
        })
        .filter((e): e is USDMEndpoint => e !== null);
      
      return {
        endpointsByStudyId: {
          ...state.endpointsByStudyId,
          [studyId]: [...otherPurposeEndpoints, ...reorderedEndpoints],
        },
      };
    });
  },

  linkEstimandToEndpoint: (endpointId, estimandId) => {
    set((state) => {
      const newEndpointsByStudyId = { ...state.endpointsByStudyId };
      
      for (const studyId of Object.keys(newEndpointsByStudyId)) {
        const endpoints = newEndpointsByStudyId[studyId];
        const index = endpoints.findIndex((e) => e.id === endpointId);
        
        if (index !== -1) {
          const endpoint = endpoints[index];
          if (!endpoint.estimandIds.includes(estimandId)) {
            newEndpointsByStudyId[studyId] = [
              ...endpoints.slice(0, index),
              {
                ...endpoint,
                estimandIds: [...endpoint.estimandIds, estimandId],
                updatedAt: new Date().toISOString(),
              },
              ...endpoints.slice(index + 1),
            ];
          }
          break;
        }
      }
      
      return { endpointsByStudyId: newEndpointsByStudyId };
    });
  },

  unlinkEstimandFromEndpoint: (endpointId, estimandId) => {
    set((state) => {
      const newEndpointsByStudyId = { ...state.endpointsByStudyId };
      
      for (const studyId of Object.keys(newEndpointsByStudyId)) {
        const endpoints = newEndpointsByStudyId[studyId];
        const index = endpoints.findIndex((e) => e.id === endpointId);
        
        if (index !== -1) {
          const endpoint = endpoints[index];
          newEndpointsByStudyId[studyId] = [
            ...endpoints.slice(0, index),
            {
              ...endpoint,
              estimandIds: endpoint.estimandIds.filter(id => id !== estimandId),
              updatedAt: new Date().toISOString(),
            },
            ...endpoints.slice(index + 1),
          ];
          break;
        }
      }
      
      return { endpointsByStudyId: newEndpointsByStudyId };
    });
  },

  // ==========================================================================
  // ESTIMANDS
  // ==========================================================================

  addEstimand: (studyId, estimandData) => {
    const existingEstimands = get().estimandsByStudyId[studyId] || [];
    const displayOrder = estimandData.displayOrder ?? existingEstimands.length;
    
    // Create default components if not provided
    const treatment = estimandData.treatment || {
      description: '',
    };
    const population = estimandData.population || {
      description: '',
      type: 'ITT' as const,
    };
    const variable = estimandData.variable || {
      description: '',
      type: 'Continuous' as const,
    };
    const summaryMeasure = estimandData.summaryMeasure || {
      description: '',
      type: 'Difference' as const,
    };
    
    const estimand = createEstimand(
      studyId,
      estimandData.endpointId || '',
      estimandData.label || 'New Estimand',
      treatment,
      population,
      variable,
      summaryMeasure,
      displayOrder,
      estimandData
    );
    
    set((state) => ({
      estimandsByStudyId: {
        ...state.estimandsByStudyId,
        [studyId]: [...existingEstimands, estimand],
      },
    }));
    
    // Auto-link to endpoint if endpointId is provided
    if (estimandData.endpointId) {
      get().linkEstimandToEndpoint(estimandData.endpointId, estimand.id);
    }
    
    return estimand;
  },

  updateEstimand: (estimandId, updates) => {
    set((state) => {
      const newEstimandsByStudyId = { ...state.estimandsByStudyId };
      
      for (const studyId of Object.keys(newEstimandsByStudyId)) {
        const estimands = newEstimandsByStudyId[studyId];
        const index = estimands.findIndex((e) => e.id === estimandId);
        
        if (index !== -1) {
          newEstimandsByStudyId[studyId] = [
            ...estimands.slice(0, index),
            { ...estimands[index], ...updates, updatedAt: new Date().toISOString() },
            ...estimands.slice(index + 1),
          ];
          break;
        }
      }
      
      return { estimandsByStudyId: newEstimandsByStudyId };
    });
  },

  removeEstimand: (estimandId) => {
    set((state) => {
      const newEstimandsByStudyId = { ...state.estimandsByStudyId };
      const newEndpointsByStudyId = { ...state.endpointsByStudyId };
      
      for (const studyId of Object.keys(newEstimandsByStudyId)) {
        const estimands = newEstimandsByStudyId[studyId];
        const index = estimands.findIndex((e) => e.id === estimandId);
        
        if (index !== -1) {
          // Remove estimand
          newEstimandsByStudyId[studyId] = estimands.filter((e) => e.id !== estimandId);
          
          // Also unlink from endpoints
          if (newEndpointsByStudyId[studyId]) {
            newEndpointsByStudyId[studyId] = newEndpointsByStudyId[studyId].map(ep => ({
              ...ep,
              estimandIds: ep.estimandIds.filter(id => id !== estimandId),
              updatedAt: new Date().toISOString(),
            }));
          }
          break;
        }
      }
      
      return {
        estimandsByStudyId: newEstimandsByStudyId,
        endpointsByStudyId: newEndpointsByStudyId,
      };
    });
  },

  addIntercurrentEvent: (estimandId, eventData) => {
    // Get existing events to determine display order
    const existingEvents = get().iceByEstimandId[estimandId] || [];
    const displayOrder = eventData.displayOrder ?? existingEvents.length;
    
    const event = createIntercurrentEvent(
      estimandId,
      eventData.name || 'New Intercurrent Event',
      eventData.description || '',
      eventData.strategy || 'TreatmentPolicy',
      displayOrder,
      eventData
    );
    
    set((state) => {
      const newEstimandsByStudyId = { ...state.estimandsByStudyId };
      
      for (const studyId of Object.keys(newEstimandsByStudyId)) {
        const estimands = newEstimandsByStudyId[studyId];
        const index = estimands.findIndex((e) => e.id === estimandId);
        
        if (index !== -1) {
          const estimand = estimands[index];
          newEstimandsByStudyId[studyId] = [
            ...estimands.slice(0, index),
            {
              ...estimand,
              intercurrentEvents: [...estimand.intercurrentEvents, event],
              updatedAt: new Date().toISOString(),
            },
            ...estimands.slice(index + 1),
          ];
          break;
        }
      }
      
      return { estimandsByStudyId: newEstimandsByStudyId };
    });
    
    return event;
  },

  updateIntercurrentEvent: (estimandId, eventId, updates) => {
    set((state) => {
      const newEstimandsByStudyId = { ...state.estimandsByStudyId };
      
      for (const studyId of Object.keys(newEstimandsByStudyId)) {
        const estimands = newEstimandsByStudyId[studyId];
        const estIndex = estimands.findIndex((e) => e.id === estimandId);
        
        if (estIndex !== -1) {
          const estimand = estimands[estIndex];
          const eventIndex = estimand.intercurrentEvents.findIndex(ice => ice.id === eventId);
          
          if (eventIndex !== -1) {
            const updatedEvents = [...estimand.intercurrentEvents];
            updatedEvents[eventIndex] = { ...updatedEvents[eventIndex], ...updates };
            
            newEstimandsByStudyId[studyId] = [
              ...estimands.slice(0, estIndex),
              {
                ...estimand,
                intercurrentEvents: updatedEvents,
                updatedAt: new Date().toISOString(),
              },
              ...estimands.slice(estIndex + 1),
            ];
          }
          break;
        }
      }
      
      return { estimandsByStudyId: newEstimandsByStudyId };
    });
  },

  removeIntercurrentEvent: (estimandId, eventId) => {
    set((state) => {
      const newEstimandsByStudyId = { ...state.estimandsByStudyId };
      
      for (const studyId of Object.keys(newEstimandsByStudyId)) {
        const estimands = newEstimandsByStudyId[studyId];
        const index = estimands.findIndex((e) => e.id === estimandId);
        
        if (index !== -1) {
          const estimand = estimands[index];
          newEstimandsByStudyId[studyId] = [
            ...estimands.slice(0, index),
            {
              ...estimand,
              intercurrentEvents: estimand.intercurrentEvents.filter(ice => ice.id !== eventId),
              updatedAt: new Date().toISOString(),
            },
            ...estimands.slice(index + 1),
          ];
          break;
        }
      }
      
      return { estimandsByStudyId: newEstimandsByStudyId };
    });
  },

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  copyObjectivesFromStudy: (sourceStudyId, targetStudyId) => {
    const state = get();
    const sourceObjectives = state.objectivesByStudyId[sourceStudyId] || [];
    const sourceEndpoints = state.endpointsByStudyId[sourceStudyId] || [];
    const sourceEstimands = state.estimandsByStudyId[sourceStudyId] || [];
    
    // Create ID mappings
    const objectiveIdMap: Record<string, string> = {};
    const endpointIdMap: Record<string, string> = {};
    const estimandIdMap: Record<string, string> = {};
    
    // Copy objectives with new IDs
    const newObjectives: USDMStudyObjective[] = sourceObjectives.map(obj => {
      const newId = generateUSDMId('obj');
      objectiveIdMap[obj.id] = newId;
      const now = new Date().toISOString();
      return {
        ...obj,
        id: newId,
        studyId: targetStudyId,
        endpointIds: [], // Will be mapped later
        createdAt: now,
        updatedAt: now,
      };
    });
    
    // Copy endpoints with new IDs
    const newEndpoints: USDMEndpoint[] = sourceEndpoints.map(ep => {
      const newId = generateUSDMId('ep');
      endpointIdMap[ep.id] = newId;
      const now = new Date().toISOString();
      return {
        ...ep,
        id: newId,
        studyId: targetStudyId,
        estimandIds: [], // Will be mapped later
        createdAt: now,
        updatedAt: now,
      };
    });
    
    // Copy estimands with new IDs
    const newEstimands: USDMEstimand[] = sourceEstimands.map(est => {
      const newId = generateUSDMId('est');
      estimandIdMap[est.id] = newId;
      const now = new Date().toISOString();
      return {
        ...est,
        id: newId,
        studyId: targetStudyId,
        endpointId: endpointIdMap[est.endpointId] || est.endpointId,
        intercurrentEvents: est.intercurrentEvents.map(ice => ({
          ...ice,
          id: generateUSDMId('ice'),
        })),
        createdAt: now,
        updatedAt: now,
      };
    });
    
    // Update objective->endpoint mappings
    for (let i = 0; i < newObjectives.length; i++) {
      const sourceObj = sourceObjectives[i];
      newObjectives[i].endpointIds = sourceObj.endpointIds
        .map(id => endpointIdMap[id])
        .filter(Boolean);
    }
    
    // Update endpoint->estimand mappings
    for (let i = 0; i < newEndpoints.length; i++) {
      const sourceEp = sourceEndpoints[i];
      newEndpoints[i].estimandIds = sourceEp.estimandIds
        .map(id => estimandIdMap[id])
        .filter(Boolean);
    }
    
    set((state) => ({
      objectivesByStudyId: {
        ...state.objectivesByStudyId,
        [targetStudyId]: [
          ...(state.objectivesByStudyId[targetStudyId] || []),
          ...newObjectives,
        ],
      },
      endpointsByStudyId: {
        ...state.endpointsByStudyId,
        [targetStudyId]: [
          ...(state.endpointsByStudyId[targetStudyId] || []),
          ...newEndpoints,
        ],
      },
      estimandsByStudyId: {
        ...state.estimandsByStudyId,
        [targetStudyId]: [
          ...(state.estimandsByStudyId[targetStudyId] || []),
          ...newEstimands,
        ],
      },
    }));
  },

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getObjectiveById: (objectiveId) => {
    const state = get();
    for (const objectives of Object.values(state.objectivesByStudyId)) {
      const objective = objectives.find(o => o.id === objectiveId);
      if (objective) return objective;
    }
    return undefined;
  },

  getEndpointById: (endpointId) => {
    const state = get();
    for (const endpoints of Object.values(state.endpointsByStudyId)) {
      const endpoint = endpoints.find(e => e.id === endpointId);
      if (endpoint) return endpoint;
    }
    return undefined;
  },

  getEstimandById: (estimandId) => {
    const state = get();
    for (const estimands of Object.values(state.estimandsByStudyId)) {
      const estimand = estimands.find(e => e.id === estimandId);
      if (estimand) return estimand;
    }
    return undefined;
  },

  getObjectivesEndpointsView: (studyId) => {
    const state = get();
    const objectives = state.objectivesByStudyId[studyId] || [];
    const endpoints = state.endpointsByStudyId[studyId] || [];
    const estimands = state.estimandsByStudyId[studyId] || [];
    
    const buildEndpointView = (ep: USDMEndpoint): EndpointView => ({
      endpoint: ep,
      estimands: getEstimandsForEndpoint(ep, estimands).map((e) => ({
        estimand: e,
        intercurrentEvents: e.intercurrentEvents,
      })),
    });
    
    const buildObjectiveView = (obj: USDMStudyObjective): ObjectiveView => ({
      objective: obj,
      endpoints: obj.endpointIds
        .map(epId => endpoints.find(ep => ep.id === epId))
        .filter((ep): ep is USDMEndpoint => ep !== undefined)
        .map(buildEndpointView),
    });
    
    const objectivesByLevelCount = countObjectivesByLevel(objectives);
    const endpointsByPurposeCount = countEndpointsByPurpose(endpoints);
    
    // Note: Estimands don't have a level property directly - they inherit level
    // from their associated objective via endpoint. Stubbed for now until UI needs this.
    const estimandsByLevel: Record<USDMObjectiveLevel, number> = {
      Primary: 0,
      Secondary: 0,
      Exploratory: 0,
    };
    
    const endpointsWithEstimands = endpoints.filter(ep => ep.estimandIds.length > 0).length;
    
    const statistics: ObjectivesEndpointsStatistics = {
      totalObjectives: objectives.length,
      objectivesByLevel: objectivesByLevelCount,
      totalEndpoints: endpoints.length,
      endpointsByPurpose: endpointsByPurposeCount,
      totalEstimands: estimands.length,
      estimandsByLevel,
      endpointsWithEstimands,
      endpointsWithoutEstimands: endpoints.length - endpointsWithEstimands,
    };
    
    return {
      studyId,
      primaryObjectives: getObjectivesByLevel(objectives, 'Primary').map(buildObjectiveView),
      secondaryObjectives: getObjectivesByLevel(objectives, 'Secondary').map(buildObjectiveView),
      exploratoryObjectives: getObjectivesByLevel(objectives, 'Exploratory').map(buildObjectiveView),
      statistics,
    };
  },

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  selectObjective: (objectiveId) => {
    set({ selectedObjectiveId: objectiveId });
  },

  selectEndpoint: (endpointId) => {
    set({ selectedEndpointId: endpointId });
  },

  selectEstimand: (estimandId) => {
    set({ selectedEstimandId: estimandId });
  },

  // ==========================================================================
  // RESET
  // ==========================================================================

  clearObjectivesStore: () => {
    set(initialState);
  },
}));

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Get all objectives for a study
 */
export function useObjectives(studyId: string): USDMStudyObjective[] {
  const objectivesByStudyId = useUSDMObjectivesStore((state) => state.objectivesByStudyId);
  return useMemo(
    () => (objectivesByStudyId[studyId] || []).sort((a, b) => a.displayOrder - b.displayOrder),
    [objectivesByStudyId, studyId]
  );
}

/**
 * Get primary objectives for a study
 */
export function usePrimaryObjectives(studyId: string): USDMStudyObjective[] {
  const objectives = useObjectives(studyId);
  return useMemo(
    () => getObjectivesByLevel(objectives, 'Primary'),
    [objectives]
  );
}

/**
 * Get secondary objectives for a study
 */
export function useSecondaryObjectives(studyId: string): USDMStudyObjective[] {
  const objectives = useObjectives(studyId);
  return useMemo(
    () => getObjectivesByLevel(objectives, 'Secondary'),
    [objectives]
  );
}

/**
 * Get exploratory objectives for a study
 */
export function useExploratoryObjectives(studyId: string): USDMStudyObjective[] {
  const objectives = useObjectives(studyId);
  return useMemo(
    () => getObjectivesByLevel(objectives, 'Exploratory'),
    [objectives]
  );
}

/**
 * Get all endpoints for a study
 */
export function useEndpoints(studyId: string): USDMEndpoint[] {
  const endpointsByStudyId = useUSDMObjectivesStore((state) => state.endpointsByStudyId);
  return useMemo(
    () => (endpointsByStudyId[studyId] || []).sort((a, b) => a.displayOrder - b.displayOrder),
    [endpointsByStudyId, studyId]
  );
}

/**
 * Get primary endpoints for a study
 */
export function usePrimaryEndpoints(studyId: string): USDMEndpoint[] {
  const endpoints = useEndpoints(studyId);
  return useMemo(
    () => getEndpointsByPurpose(endpoints, 'Primary'),
    [endpoints]
  );
}

/**
 * Get secondary endpoints for a study
 */
export function useSecondaryEndpoints(studyId: string): USDMEndpoint[] {
  const endpoints = useEndpoints(studyId);
  return useMemo(
    () => getEndpointsByPurpose(endpoints, 'Secondary'),
    [endpoints]
  );
}

/**
 * Get safety endpoints for a study
 */
export function useSafetyEndpoints(studyId: string): USDMEndpoint[] {
  const endpoints = useEndpoints(studyId);
  return useMemo(
    () => getEndpointsByPurpose(endpoints, 'Safety'),
    [endpoints]
  );
}

/**
 * Get all estimands for a study
 */
export function useEstimands(studyId: string): USDMEstimand[] {
  const estimandsByStudyId = useUSDMObjectivesStore((state) => state.estimandsByStudyId);
  return useMemo(
    () => (estimandsByStudyId[studyId] || []).sort((a, b) => a.displayOrder - b.displayOrder),
    [estimandsByStudyId, studyId]
  );
}

/**
 * Get the complete objectives & endpoints view
 */
export function useObjectivesEndpointsView(studyId: string): ObjectivesEndpointsView | undefined {
  const getView = useUSDMObjectivesStore((state) => state.getObjectivesEndpointsView);
  return useMemo(() => getView(studyId), [getView, studyId]);
}

/**
 * Get selected objective
 */
export function useSelectedObjective(): USDMStudyObjective | undefined {
  const selectedId = useUSDMObjectivesStore((state) => state.selectedObjectiveId);
  const getById = useUSDMObjectivesStore((state) => state.getObjectiveById);
  return useMemo(
    () => (selectedId ? getById(selectedId) : undefined),
    [selectedId, getById]
  );
}

/**
 * Get selected endpoint
 */
export function useSelectedEndpoint(): USDMEndpoint | undefined {
  const selectedId = useUSDMObjectivesStore((state) => state.selectedEndpointId);
  const getById = useUSDMObjectivesStore((state) => state.getEndpointById);
  return useMemo(
    () => (selectedId ? getById(selectedId) : undefined),
    [selectedId, getById]
  );
}

/**
 * Get selected estimand
 */
export function useSelectedEstimand(): USDMEstimand | undefined {
  const selectedId = useUSDMObjectivesStore((state) => state.selectedEstimandId);
  const getById = useUSDMObjectivesStore((state) => state.getEstimandById);
  return useMemo(
    () => (selectedId ? getById(selectedId) : undefined),
    [selectedId, getById]
  );
}


/**
 * Clear objectives store
 */
export function clearObjectivesStore(): void {
  useUSDMObjectivesStore.getState().clearObjectivesStore();
}
