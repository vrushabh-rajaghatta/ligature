

// ============================================================================
// USDM Activities & Encounters Store v0.9.9c - Schedule of Activities Management
// Zustand store for managing Activities, Procedures, Encounters, and SoA
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  USDMActivity,
  USDMActivityType,
  USDMProcedure,
  USDMProcedureType,
  USDMEncounter,
  USDMEncounterType,
  USDMScheduledActivityInstance,
  USDMSoAFootnote,
  USDMActivitiesState,
  USDMActivitiesActions,
  ScheduleOfActivitiesView,
  SoACell,
  createActivity,
  createProcedure,
  createEncounter,
  createScheduledActivityInstance,
  createSoAFootnote,
  getSoACellSymbol,
} from './usdm-activities-types';
import { generateUSDMId } from './usdm-core-types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMActivitiesState = {
  activitiesByStudyId: {},
  proceduresByStudyId: {},
  encountersByStudyId: {},
  scheduledInstancesByStudyId: {},
  footnotesByStudyId: {},
  selectedActivityId: null,
  selectedEncounterId: null,
  selectedInstanceId: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMActivitiesStore = create<USDMActivitiesState & USDMActivitiesActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // ACTIVITIES
  // ==========================================================================

  addActivity: (studyId, activityData) => {
    const existingActivities = get().activitiesByStudyId[studyId] || [];
    const displayOrder = activityData.displayOrder ?? existingActivities.length;
    
    const activity = createActivity(
      activityData.activityName || 'New Activity',
      activityData.activityType || 'Assessment',
      displayOrder,
      activityData
    );
    
    set((state) => ({
      activitiesByStudyId: {
        ...state.activitiesByStudyId,
        [studyId]: [...existingActivities, activity],
      },
    }));
    
    return activity;
  },

  updateActivity: (activityId, updates) => {
    set((state) => {
      const newActivitiesByStudyId = { ...state.activitiesByStudyId };
      
      for (const studyId of Object.keys(newActivitiesByStudyId)) {
        const activities = newActivitiesByStudyId[studyId];
        const index = activities.findIndex((a) => a.id === activityId);
        
        if (index !== -1) {
          newActivitiesByStudyId[studyId] = [
            ...activities.slice(0, index),
            { ...activities[index], ...updates, updatedAt: new Date().toISOString() },
            ...activities.slice(index + 1),
          ];
          break;
        }
      }
      
      return { activitiesByStudyId: newActivitiesByStudyId };
    });
  },

  removeActivity: (activityId) => {
    set((state) => {
      const newActivitiesByStudyId = { ...state.activitiesByStudyId };
      const newScheduledInstancesByStudyId = { ...state.scheduledInstancesByStudyId };
      
      for (const studyId of Object.keys(newActivitiesByStudyId)) {
        const activities = newActivitiesByStudyId[studyId];
        const activityIndex = activities.findIndex((a) => a.id === activityId);
        
        if (activityIndex !== -1) {
          // Remove activity
          newActivitiesByStudyId[studyId] = activities.filter((a) => a.id !== activityId);
          
          // Reorder remaining activities
          newActivitiesByStudyId[studyId] = newActivitiesByStudyId[studyId].map((activity, idx) => ({
            ...activity,
            displayOrder: idx,
          }));
          
          // Remove associated scheduled instances
          if (newScheduledInstancesByStudyId[studyId]) {
            newScheduledInstancesByStudyId[studyId] = newScheduledInstancesByStudyId[studyId].filter(
              (inst) => inst.activityId !== activityId
            );
          }
          
          break;
        }
      }
      
      return {
        activitiesByStudyId: newActivitiesByStudyId,
        scheduledInstancesByStudyId: newScheduledInstancesByStudyId,
        selectedActivityId: state.selectedActivityId === activityId ? null : state.selectedActivityId,
      };
    });
  },

  reorderActivities: (studyId, activityIds) => {
    set((state) => {
      const activities = state.activitiesByStudyId[studyId] || [];
      const reorderedActivities = activityIds
        .map((id, idx) => {
          const activity = activities.find((a) => a.id === id);
          return activity ? { ...activity, displayOrder: idx, updatedAt: new Date().toISOString() } : null;
        })
        .filter(Boolean) as USDMActivity[];
      
      return {
        activitiesByStudyId: {
          ...state.activitiesByStudyId,
          [studyId]: reorderedActivities,
        },
      };
    });
  },

  getActivities: (studyId) => {
    const activities = get().activitiesByStudyId[studyId] || [];
    return [...activities].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  getActivityById: (activityId) => {
    const activitiesByStudyId = get().activitiesByStudyId;
    for (const activities of Object.values(activitiesByStudyId)) {
      const found = activities.find((a) => a.id === activityId);
      if (found) return found;
    }
    return undefined;
  },

  // ==========================================================================
  // PROCEDURES
  // ==========================================================================

  addProcedure: (studyId, procedureData) => {
    const existingProcedures = get().proceduresByStudyId[studyId] || [];
    
    const procedure = createProcedure(
      procedureData.procedureName || 'New Procedure',
      procedureData.procedureType || 'Other',
      procedureData
    );
    
    set((state) => ({
      proceduresByStudyId: {
        ...state.proceduresByStudyId,
        [studyId]: [...existingProcedures, procedure],
      },
    }));
    
    return procedure;
  },

  updateProcedure: (procedureId, updates) => {
    set((state) => {
      const newProceduresByStudyId = { ...state.proceduresByStudyId };
      
      for (const studyId of Object.keys(newProceduresByStudyId)) {
        const procedures = newProceduresByStudyId[studyId];
        const index = procedures.findIndex((p) => p.id === procedureId);
        
        if (index !== -1) {
          newProceduresByStudyId[studyId] = [
            ...procedures.slice(0, index),
            { ...procedures[index], ...updates, updatedAt: new Date().toISOString() },
            ...procedures.slice(index + 1),
          ];
          break;
        }
      }
      
      return { proceduresByStudyId: newProceduresByStudyId };
    });
  },

  removeProcedure: (procedureId) => {
    set((state) => {
      const newProceduresByStudyId = { ...state.proceduresByStudyId };
      const newActivitiesByStudyId = { ...state.activitiesByStudyId };
      
      for (const studyId of Object.keys(newProceduresByStudyId)) {
        const procedures = newProceduresByStudyId[studyId];
        const procedureIndex = procedures.findIndex((p) => p.id === procedureId);
        
        if (procedureIndex !== -1) {
          // Remove procedure
          newProceduresByStudyId[studyId] = procedures.filter((p) => p.id !== procedureId);
          
          // Remove procedure references from activities
          if (newActivitiesByStudyId[studyId]) {
            newActivitiesByStudyId[studyId] = newActivitiesByStudyId[studyId].map((activity) => ({
              ...activity,
              procedureIds: activity.procedureIds.filter((id) => id !== procedureId),
            }));
          }
          
          break;
        }
      }
      
      return {
        proceduresByStudyId: newProceduresByStudyId,
        activitiesByStudyId: newActivitiesByStudyId,
      };
    });
  },

  getProcedures: (studyId) => {
    return get().proceduresByStudyId[studyId] || [];
  },

  getProcedureById: (procedureId) => {
    const proceduresByStudyId = get().proceduresByStudyId;
    for (const procedures of Object.values(proceduresByStudyId)) {
      const found = procedures.find((p) => p.id === procedureId);
      if (found) return found;
    }
    return undefined;
  },

  // ==========================================================================
  // ENCOUNTERS
  // ==========================================================================

  addEncounter: (studyId, encounterData) => {
    const existingEncounters = get().encountersByStudyId[studyId] || [];
    const sequence = encounterData.encounterSequence ?? existingEncounters.length;
    
    // Get the last encounter to link
    const sortedEncounters = [...existingEncounters].sort((a, b) => a.encounterSequence - b.encounterSequence);
    const lastEncounter = sortedEncounters[sortedEncounters.length - 1];
    
    const encounter = createEncounter(
      encounterData.encounterName || 'New Visit',
      encounterData.encounterType || 'ScheduledVisit',
      encounterData.epochId || '',
      sequence,
      {
        ...encounterData,
        previousEncounterId: encounterData.previousEncounterId || lastEncounter?.id,
      }
    );
    
    // Do all updates in a single set call
    set((state) => {
      let updatedEncounters = [...(state.encountersByStudyId[studyId] || [])];
      
      // Update the previous encounter's next pointer if needed
      if (lastEncounter && !encounterData.previousEncounterId) {
        updatedEncounters = updatedEncounters.map((e) =>
          e.id === lastEncounter.id
            ? { ...e, nextEncounterId: encounter.id, updatedAt: new Date().toISOString() }
            : e
        );
      }
      
      // Add the new encounter
      updatedEncounters.push(encounter);
      
      return {
        encountersByStudyId: {
          ...state.encountersByStudyId,
          [studyId]: updatedEncounters,
        },
      };
    });
    
    return encounter;
  },

  updateEncounter: (encounterId, updates) => {
    set((state) => {
      const newEncountersByStudyId = { ...state.encountersByStudyId };
      
      for (const studyId of Object.keys(newEncountersByStudyId)) {
        const encounters = newEncountersByStudyId[studyId];
        const index = encounters.findIndex((e) => e.id === encounterId);
        
        if (index !== -1) {
          newEncountersByStudyId[studyId] = [
            ...encounters.slice(0, index),
            { ...encounters[index], ...updates, updatedAt: new Date().toISOString() },
            ...encounters.slice(index + 1),
          ];
          break;
        }
      }
      
      return { encountersByStudyId: newEncountersByStudyId };
    });
  },

  removeEncounter: (encounterId) => {
    set((state) => {
      const newEncountersByStudyId = { ...state.encountersByStudyId };
      const newScheduledInstancesByStudyId = { ...state.scheduledInstancesByStudyId };
      
      for (const studyId of Object.keys(newEncountersByStudyId)) {
        const encounters = newEncountersByStudyId[studyId];
        const encounterIndex = encounters.findIndex((e) => e.id === encounterId);
        
        if (encounterIndex !== -1) {
          const removedEncounter = encounters[encounterIndex];
          
          // Update adjacent encounters' links
          const updatedEncounters = encounters
            .filter((e) => e.id !== encounterId)
            .map((e) => {
              let updated = { ...e };
              if (e.previousEncounterId === encounterId) {
                updated.previousEncounterId = removedEncounter.previousEncounterId;
              }
              if (e.nextEncounterId === encounterId) {
                updated.nextEncounterId = removedEncounter.nextEncounterId;
              }
              return updated;
            });
          
          // Resequence
          const sorted = [...updatedEncounters].sort((a, b) => a.encounterSequence - b.encounterSequence);
          newEncountersByStudyId[studyId] = sorted.map((enc, idx) => ({
            ...enc,
            encounterSequence: idx,
          }));
          
          // Remove associated scheduled instances
          if (newScheduledInstancesByStudyId[studyId]) {
            newScheduledInstancesByStudyId[studyId] = newScheduledInstancesByStudyId[studyId].filter(
              (inst) => inst.encounterId !== encounterId
            );
          }
          
          break;
        }
      }
      
      return {
        encountersByStudyId: newEncountersByStudyId,
        scheduledInstancesByStudyId: newScheduledInstancesByStudyId,
        selectedEncounterId: state.selectedEncounterId === encounterId ? null : state.selectedEncounterId,
      };
    });
  },

  reorderEncounters: (studyId, encounterIds) => {
    set((state) => {
      const encounters = state.encountersByStudyId[studyId] || [];
      const reorderedEncounters = encounterIds
        .map((id, idx) => {
          const encounter = encounters.find((e) => e.id === id);
          if (!encounter) return null;
          
          // Update sequence and links
          const prevId = idx > 0 ? encounterIds[idx - 1] : undefined;
          const nextId = idx < encounterIds.length - 1 ? encounterIds[idx + 1] : undefined;
          
          return {
            ...encounter,
            encounterSequence: idx,
            previousEncounterId: prevId,
            nextEncounterId: nextId,
            updatedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean) as USDMEncounter[];
      
      return {
        encountersByStudyId: {
          ...state.encountersByStudyId,
          [studyId]: reorderedEncounters,
        },
      };
    });
  },

  getEncounters: (studyId) => {
    const encounters = get().encountersByStudyId[studyId] || [];
    return [...encounters].sort((a, b) => a.encounterSequence - b.encounterSequence);
  },

  getEncounterById: (encounterId) => {
    const encountersByStudyId = get().encountersByStudyId;
    for (const encounters of Object.values(encountersByStudyId)) {
      const found = encounters.find((e) => e.id === encounterId);
      if (found) return found;
    }
    return undefined;
  },

  getEncountersByEpoch: (studyId, epochId) => {
    const encounters = get().encountersByStudyId[studyId] || [];
    return encounters
      .filter((e) => e.epochId === epochId)
      .sort((a, b) => a.encounterSequence - b.encounterSequence);
  },

  // ==========================================================================
  // SCHEDULED INSTANCES
  // ==========================================================================

  scheduleActivity: (studyId, activityId, encounterId, options = {}) => {
    // Check if already scheduled
    const existing = get().getInstanceByActivityAndEncounter(studyId, activityId, encounterId);
    if (existing) {
      // Update existing instead of creating duplicate
      get().updateScheduledInstance(existing.id, options);
      return existing;
    }
    
    const instance = createScheduledActivityInstance(activityId, encounterId, options);
    
    set((state) => ({
      scheduledInstancesByStudyId: {
        ...state.scheduledInstancesByStudyId,
        [studyId]: [...(state.scheduledInstancesByStudyId[studyId] || []), instance],
      },
    }));
    
    return instance;
  },

  updateScheduledInstance: (instanceId, updates) => {
    set((state) => {
      const newScheduledInstancesByStudyId = { ...state.scheduledInstancesByStudyId };
      
      for (const studyId of Object.keys(newScheduledInstancesByStudyId)) {
        const instances = newScheduledInstancesByStudyId[studyId];
        const index = instances.findIndex((i) => i.id === instanceId);
        
        if (index !== -1) {
          newScheduledInstancesByStudyId[studyId] = [
            ...instances.slice(0, index),
            { ...instances[index], ...updates, updatedAt: new Date().toISOString() },
            ...instances.slice(index + 1),
          ];
          break;
        }
      }
      
      return { scheduledInstancesByStudyId: newScheduledInstancesByStudyId };
    });
  },

  unscheduleActivity: (instanceId) => {
    set((state) => {
      const newScheduledInstancesByStudyId = { ...state.scheduledInstancesByStudyId };
      
      for (const studyId of Object.keys(newScheduledInstancesByStudyId)) {
        const instances = newScheduledInstancesByStudyId[studyId];
        if (instances.some((i) => i.id === instanceId)) {
          newScheduledInstancesByStudyId[studyId] = instances.filter((i) => i.id !== instanceId);
          break;
        }
      }
      
      return {
        scheduledInstancesByStudyId: newScheduledInstancesByStudyId,
        selectedInstanceId: state.selectedInstanceId === instanceId ? null : state.selectedInstanceId,
      };
    });
  },

  getScheduledInstances: (studyId) => {
    return get().scheduledInstancesByStudyId[studyId] || [];
  },

  getInstanceByActivityAndEncounter: (studyId, activityId, encounterId) => {
    const instances = get().scheduledInstancesByStudyId[studyId] || [];
    return instances.find((i) => i.activityId === activityId && i.encounterId === encounterId);
  },

  getInstancesByActivity: (studyId, activityId) => {
    const instances = get().scheduledInstancesByStudyId[studyId] || [];
    return instances.filter((i) => i.activityId === activityId);
  },

  getInstancesByEncounter: (studyId, encounterId) => {
    const instances = get().scheduledInstancesByStudyId[studyId] || [];
    return instances.filter((i) => i.encounterId === encounterId);
  },

  // ==========================================================================
  // FOOTNOTES
  // ==========================================================================

  addFootnote: (studyId, footnoteData) => {
    const existingFootnotes = get().footnotesByStudyId[studyId] || [];
    const displayOrder = footnoteData.displayOrder ?? existingFootnotes.length;
    const symbol = footnoteData.symbol || String(existingFootnotes.length + 1);
    
    const footnote = createSoAFootnote(
      symbol,
      footnoteData.text || '',
      displayOrder,
      footnoteData
    );
    
    set((state) => ({
      footnotesByStudyId: {
        ...state.footnotesByStudyId,
        [studyId]: [...existingFootnotes, footnote],
      },
    }));
    
    return footnote;
  },

  updateFootnote: (footnoteId, updates) => {
    set((state) => {
      const newFootnotesByStudyId = { ...state.footnotesByStudyId };
      
      for (const studyId of Object.keys(newFootnotesByStudyId)) {
        const footnotes = newFootnotesByStudyId[studyId];
        const index = footnotes.findIndex((f) => f.id === footnoteId);
        
        if (index !== -1) {
          newFootnotesByStudyId[studyId] = [
            ...footnotes.slice(0, index),
            { ...footnotes[index], ...updates, updatedAt: new Date().toISOString() },
            ...footnotes.slice(index + 1),
          ];
          break;
        }
      }
      
      return { footnotesByStudyId: newFootnotesByStudyId };
    });
  },

  removeFootnote: (footnoteId) => {
    set((state) => {
      const newFootnotesByStudyId = { ...state.footnotesByStudyId };
      const newScheduledInstancesByStudyId = { ...state.scheduledInstancesByStudyId };
      
      for (const studyId of Object.keys(newFootnotesByStudyId)) {
        const footnotes = newFootnotesByStudyId[studyId];
        if (footnotes.some((f) => f.id === footnoteId)) {
          newFootnotesByStudyId[studyId] = footnotes.filter((f) => f.id !== footnoteId);
          
          // Remove footnote references from instances
          if (newScheduledInstancesByStudyId[studyId]) {
            newScheduledInstancesByStudyId[studyId] = newScheduledInstancesByStudyId[studyId].map((inst) => ({
              ...inst,
              footnoteIds: inst.footnoteIds.filter((id) => id !== footnoteId),
            }));
          }
          
          break;
        }
      }
      
      return {
        footnotesByStudyId: newFootnotesByStudyId,
        scheduledInstancesByStudyId: newScheduledInstancesByStudyId,
      };
    });
  },

  getFootnotes: (studyId) => {
    const footnotes = get().footnotesByStudyId[studyId] || [];
    return [...footnotes].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  // ==========================================================================
  // SCHEDULE OF ACTIVITIES MATRIX VIEW
  // ==========================================================================

  getScheduleOfActivities: (studyId) => {
    const activities = get().getActivities(studyId);
    const encounters = get().getEncounters(studyId);
    const instances = get().getScheduledInstances(studyId);
    const footnotes = get().getFootnotes(studyId);
    
    // Build matrix
    const matrix: SoACell[][] = activities.map((activity, activityIndex) =>
      encounters.map((encounter, encounterIndex) => {
        const instance = instances.find(
          (i) => i.activityId === activity.id && i.encounterId === encounter.id
        );
        
        return {
          instance: instance || null,
          activityId: activity.id,
          encounterId: encounter.id,
          activityIndex,
          encounterIndex,
          isScheduled: !!instance,
          isRequired: instance?.isRequired ?? false,
          isConditional: instance?.isConditional ?? false,
          displaySymbol: getSoACellSymbol(instance || null),
        };
      })
    );
    
    // Calculate statistics
    const requiredInstances = instances.filter((i) => i.isRequired);
    const conditionalInstances = instances.filter((i) => i.isConditional);
    
    return {
      studyId,
      activities,
      encounters,
      matrix,
      footnotes,
      totalActivities: activities.length,
      totalEncounters: encounters.length,
      totalScheduledInstances: instances.length,
      requiredInstanceCount: requiredInstances.length,
      conditionalInstanceCount: conditionalInstances.length,
    };
  },

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  selectActivity: (activityId) => {
    set({ selectedActivityId: activityId });
  },

  selectEncounter: (encounterId) => {
    set({ selectedEncounterId: encounterId });
  },

  selectInstance: (instanceId) => {
    set({ selectedInstanceId: instanceId });
  },

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  bulkScheduleActivity: (studyId, activityId, encounterIds, options = {}) => {
    const results: USDMScheduledActivityInstance[] = [];
    
    encounterIds.forEach((encounterId) => {
      const instance = get().scheduleActivity(studyId, activityId, encounterId, options);
      results.push(instance);
    });
    
    return results;
  },

  bulkUnscheduleActivity: (studyId, activityId) => {
    set((state) => {
      const instances = state.scheduledInstancesByStudyId[studyId] || [];
      const filtered = instances.filter((i) => i.activityId !== activityId);
      
      return {
        scheduledInstancesByStudyId: {
          ...state.scheduledInstancesByStudyId,
          [studyId]: filtered,
        },
      };
    });
  },

  copyEncounterSchedule: (studyId, sourceEncounterId, targetEncounterId) => {
    const sourceInstances = get().getInstancesByEncounter(studyId, sourceEncounterId);
    
    sourceInstances.forEach((inst) => {
      get().scheduleActivity(studyId, inst.activityId, targetEncounterId, {
        isRequired: inst.isRequired,
        isConditional: inst.isConditional,
        condition: inst.condition,
        applicableArmIds: [...inst.applicableArmIds],
      });
    });
  },
}));

// ============================================================================
// MOCK DATA LOADER - LIG-2847 Phase 3 NSCLC
// ============================================================================

export const loadActivitiesMockData = (studyId: string = 'study-lig-2847'): void => {
  const store = useUSDMActivitiesStore.getState();
  
  // Clear existing data for this study
  useUSDMActivitiesStore.setState((state) => ({
    activitiesByStudyId: { ...state.activitiesByStudyId, [studyId]: [] },
    proceduresByStudyId: { ...state.proceduresByStudyId, [studyId]: [] },
    encountersByStudyId: { ...state.encountersByStudyId, [studyId]: [] },
    scheduledInstancesByStudyId: { ...state.scheduledInstancesByStudyId, [studyId]: [] },
    footnotesByStudyId: { ...state.footnotesByStudyId, [studyId]: [] },
  }));
  
  // ==========================================================================
  // PROCEDURES
  // ==========================================================================
  
  const procBloodDraw = store.addProcedure(studyId, {
    procedureName: 'Blood Draw',
    procedureType: 'BloodDraw',
    procedureDescription: 'Venous blood collection for laboratory analysis',
    isInvasive: true,
    typicalDuration: { value: 10, unit: 'minutes' },
    specimenType: 'Whole Blood',
    specimenQuantity: { value: 20, unit: 'mL' },
  });
  
  const procVitals = store.addProcedure(studyId, {
    procedureName: 'Vital Signs',
    procedureType: 'VitalSigns',
    procedureDescription: 'BP, HR, RR, Temp, SpO2 measurement',
    isInvasive: false,
    typicalDuration: { value: 10, unit: 'minutes' },
  });
  
  const procECG = store.addProcedure(studyId, {
    procedureName: '12-Lead ECG',
    procedureType: 'ECG',
    procedureDescription: 'Standard 12-lead electrocardiogram',
    isInvasive: false,
    typicalDuration: { value: 15, unit: 'minutes' },
  });
  
  const procCT = store.addProcedure(studyId, {
    procedureName: 'CT Scan (Chest/Abdomen/Pelvis)',
    procedureType: 'Imaging',
    procedureDescription: 'CT imaging for tumor assessment per RECIST 1.1',
    isInvasive: false,
    typicalDuration: { value: 45, unit: 'minutes' },
  });
  
  const procPhysExam = store.addProcedure(studyId, {
    procedureName: 'Physical Examination',
    procedureType: 'PhysicalExam',
    procedureDescription: 'Comprehensive physical examination',
    isInvasive: false,
    typicalDuration: { value: 20, unit: 'minutes' },
  });
  
  // ==========================================================================
  // ACTIVITIES
  // ==========================================================================
  
  const actConsent = store.addActivity(studyId, {
    activityName: 'Informed Consent',
    activityType: 'Consent',
    activityDescription: 'Obtain written informed consent',
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actDemographics = store.addActivity(studyId, {
    activityName: 'Demographics',
    activityType: 'DataCollection',
    activityDescription: 'Collect demographic information',
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actMedHistory = store.addActivity(studyId, {
    activityName: 'Medical History',
    activityType: 'DataCollection',
    activityDescription: 'Document complete medical history',
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actPhysExam = store.addActivity(studyId, {
    activityName: 'Physical Examination',
    activityType: 'PhysicalExam',
    activityDescription: 'Complete physical examination',
    procedureIds: [procPhysExam.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actVitals = store.addActivity(studyId, {
    activityName: 'Vital Signs',
    activityType: 'Safety',
    activityDescription: 'Measure vital signs',
    procedureIds: [procVitals.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actECG = store.addActivity(studyId, {
    activityName: '12-Lead ECG',
    activityType: 'Safety',
    activityDescription: 'Perform 12-lead ECG',
    procedureIds: [procECG.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actHematology = store.addActivity(studyId, {
    activityName: 'Hematology',
    activityType: 'Laboratory',
    activityDescription: 'CBC with differential',
    procedureIds: [procBloodDraw.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actChemistry = store.addActivity(studyId, {
    activityName: 'Chemistry Panel',
    activityType: 'Laboratory',
    activityDescription: 'Comprehensive metabolic panel',
    procedureIds: [procBloodDraw.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actTumorAssess = store.addActivity(studyId, {
    activityName: 'Tumor Assessment',
    activityType: 'Imaging',
    activityDescription: 'CT-based tumor assessment per RECIST 1.1',
    procedureIds: [procCT.id],
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actStudyDrug = store.addActivity(studyId, {
    activityName: 'Study Drug Administration',
    activityType: 'Administration',
    activityDescription: 'Dispense study drug (Ligrastinib/Placebo)',
    activityIsConditional: false,
    canBePerformedRemotely: false,
  });
  
  const actAE = store.addActivity(studyId, {
    activityName: 'Adverse Event Assessment',
    activityType: 'Safety',
    activityDescription: 'Document and assess adverse events',
    activityIsConditional: false,
    canBePerformedRemotely: true,
  });
  
  const actConMeds = store.addActivity(studyId, {
    activityName: 'Concomitant Medications',
    activityType: 'DataCollection',
    activityDescription: 'Review and document concomitant medications',
    activityIsConditional: false,
    canBePerformedRemotely: true,
  });
  
  const actQoL = store.addActivity(studyId, {
    activityName: 'Quality of Life (EORTC QLQ-C30)',
    activityType: 'Questionnaire',
    activityDescription: 'Patient-reported quality of life assessment',
    activityIsConditional: false,
    canBePerformedRemotely: true,
  });
  
  const actSurvival = store.addActivity(studyId, {
    activityName: 'Survival Status',
    activityType: 'DataCollection',
    activityDescription: 'Document survival status',
    activityIsConditional: false,
    canBePerformedRemotely: true,
  });
  
  // ==========================================================================
  // ENCOUNTERS (Visits)
  // ==========================================================================
  
  // Screening Period
  const encScreening = store.addEncounter(studyId, {
    encounterName: 'Screening',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-screening', // Links to Design Matrix
    encounterDescription: 'Screening visit to assess eligibility',
    scheduledTiming: { referencePoint: 'Informed Consent', value: 0, unit: 'days', referenceType: 'StudyStart' },
    windowBefore: { value: 0, unit: 'days' },
    windowAfter: { value: 28, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  // Treatment Period
  const encBaseline = store.addEncounter(studyId, {
    encounterName: 'Baseline / Day 1',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-treatment',
    encounterDescription: 'Baseline assessments and first dose',
    scheduledTiming: { referencePoint: 'Randomization', value: 0, unit: 'days', referenceType: 'Randomization' },
    windowBefore: { value: 0, unit: 'days' },
    windowAfter: { value: 0, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encWeek2 = store.addEncounter(studyId, {
    encounterName: 'Week 2',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-treatment',
    encounterDescription: 'Safety assessment',
    scheduledTiming: { referencePoint: 'Day 1', value: 14, unit: 'days', referenceType: 'FirstDose' },
    windowBefore: { value: 3, unit: 'days' },
    windowAfter: { value: 3, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encWeek4 = store.addEncounter(studyId, {
    encounterName: 'Week 4',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-treatment',
    encounterDescription: 'Safety and drug resupply',
    scheduledTiming: { referencePoint: 'Day 1', value: 28, unit: 'days', referenceType: 'FirstDose' },
    windowBefore: { value: 3, unit: 'days' },
    windowAfter: { value: 3, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encWeek8 = store.addEncounter(studyId, {
    encounterName: 'Week 8',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-treatment',
    encounterDescription: 'First tumor assessment',
    scheduledTiming: { referencePoint: 'Day 1', value: 56, unit: 'days', referenceType: 'FirstDose' },
    windowBefore: { value: 7, unit: 'days' },
    windowAfter: { value: 7, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encWeek12 = store.addEncounter(studyId, {
    encounterName: 'Week 12',
    encounterType: 'ScheduledVisit',
    epochId: 'epoch-treatment',
    encounterDescription: 'Safety and drug resupply',
    scheduledTiming: { referencePoint: 'Day 1', value: 84, unit: 'days', referenceType: 'FirstDose' },
    windowBefore: { value: 7, unit: 'days' },
    windowAfter: { value: 7, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encEOT = store.addEncounter(studyId, {
    encounterName: 'End of Treatment',
    encounterType: 'EarlyTermination',
    epochId: 'epoch-treatment',
    encounterDescription: 'End of treatment visit (within 7 days of last dose)',
    scheduledTiming: { referencePoint: 'Last Dose', value: 7, unit: 'days', referenceType: 'LastDose' },
    windowBefore: { value: 0, unit: 'days' },
    windowAfter: { value: 7, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  // Follow-up Period
  const encFU30 = store.addEncounter(studyId, {
    encounterName: 'Safety Follow-up (30 days)',
    encounterType: 'FollowUp',
    epochId: 'epoch-followup',
    encounterDescription: 'Safety follow-up 30 days after last dose',
    scheduledTiming: { referencePoint: 'Last Dose', value: 30, unit: 'days', referenceType: 'LastDose' },
    windowBefore: { value: 7, unit: 'days' },
    windowAfter: { value: 7, unit: 'days' },
    isRequired: true,
    contactMode: 'InPerson',
    environmentType: 'Clinic',
  });
  
  const encSurvivalFU = store.addEncounter(studyId, {
    encounterName: 'Survival Follow-up (Q12W)',
    encounterType: 'FollowUp',
    epochId: 'epoch-followup',
    encounterDescription: 'Survival status every 12 weeks',
    scheduledTiming: { referencePoint: 'Safety Follow-up', value: 12, unit: 'weeks', referenceType: 'PreviousEncounter' },
    windowBefore: { value: 14, unit: 'days' },
    windowAfter: { value: 14, unit: 'days' },
    isRequired: true,
    contactMode: 'Phone',
    environmentType: 'Remote',
  });
  
  // ==========================================================================
  // SCHEDULE ACTIVITIES TO ENCOUNTERS
  // ==========================================================================
  
  // Screening Visit
  store.scheduleActivity(studyId, actConsent.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actDemographics.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actMedHistory.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actPhysExam.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actVitals.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actECG.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actTumorAssess.id, encScreening.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encScreening.id, { isRequired: true });
  
  // Baseline / Day 1
  store.scheduleActivity(studyId, actPhysExam.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actVitals.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actECG.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actStudyDrug.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encBaseline.id, { isRequired: true });
  store.scheduleActivity(studyId, actQoL.id, encBaseline.id, { isRequired: true });
  
  // Week 2
  store.scheduleActivity(studyId, actVitals.id, encWeek2.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encWeek2.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encWeek2.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encWeek2.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encWeek2.id, { isRequired: true });
  
  // Week 4
  store.scheduleActivity(studyId, actVitals.id, encWeek4.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encWeek4.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encWeek4.id, { isRequired: true });
  store.scheduleActivity(studyId, actStudyDrug.id, encWeek4.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encWeek4.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encWeek4.id, { isRequired: true });
  
  // Week 8 (Tumor Assessment)
  store.scheduleActivity(studyId, actPhysExam.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actVitals.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actTumorAssess.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actStudyDrug.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encWeek8.id, { isRequired: true });
  store.scheduleActivity(studyId, actQoL.id, encWeek8.id, { isRequired: true });
  
  // Week 12
  store.scheduleActivity(studyId, actVitals.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actECG.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actStudyDrug.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encWeek12.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encWeek12.id, { isRequired: true });
  
  // End of Treatment
  store.scheduleActivity(studyId, actPhysExam.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actVitals.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actECG.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actHematology.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actChemistry.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actTumorAssess.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encEOT.id, { isRequired: true });
  store.scheduleActivity(studyId, actQoL.id, encEOT.id, { isRequired: true });
  
  // Safety Follow-up 30 days
  store.scheduleActivity(studyId, actVitals.id, encFU30.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encFU30.id, { isRequired: true });
  store.scheduleActivity(studyId, actConMeds.id, encFU30.id, { isRequired: true });
  
  // Survival Follow-up
  store.scheduleActivity(studyId, actSurvival.id, encSurvivalFU.id, { isRequired: true });
  store.scheduleActivity(studyId, actAE.id, encSurvivalFU.id, { isConditional: true, condition: 'If ongoing AEs' });
  
  // ==========================================================================
  // FOOTNOTES
  // ==========================================================================
  
  store.addFootnote(studyId, {
    symbol: '1',
    text: 'Screening assessments may be performed over multiple visits within the 28-day screening window.',
  });
  
  store.addFootnote(studyId, {
    symbol: '2',
    text: 'Tumor assessments per RECIST 1.1 criteria. CT scan of chest, abdomen, and pelvis required.',
  });
  
  store.addFootnote(studyId, {
    symbol: '3',
    text: 'ECG to be performed pre-dose at visits where applicable.',
  });
  
  store.addFootnote(studyId, {
    symbol: '4',
    text: 'Survival follow-up continues every 12 weeks until death, loss to follow-up, or study closure.',
  });
};

// ============================================================================
// SELECTORS (React Hooks)
// ============================================================================

export const useActivities = (studyId: string) => {
  const activities = useUSDMActivitiesStore((s) => s.activitiesByStudyId[studyId] || []);
  return useMemo(() => [...activities].sort((a, b) => a.displayOrder - b.displayOrder), [activities]);
};

export const useEncounters = (studyId: string) => {
  const encounters = useUSDMActivitiesStore((s) => s.encountersByStudyId[studyId] || []);
  return useMemo(() => [...encounters].sort((a, b) => a.encounterSequence - b.encounterSequence), [encounters]);
};

export const useProcedures = (studyId: string) => {
  const procedures = useUSDMActivitiesStore((s) => s.proceduresByStudyId[studyId] || []);
  return useMemo(() => procedures, [procedures]);
};

export const useScheduledInstances = (studyId: string) => {
  const instances = useUSDMActivitiesStore((s) => s.scheduledInstancesByStudyId[studyId] || []);
  return useMemo(() => instances, [instances]);
};

export const useScheduleOfActivities = (studyId: string): ScheduleOfActivitiesView => {
  const activities = useActivities(studyId);
  const encounters = useEncounters(studyId);
  const instances = useScheduledInstances(studyId);
  const footnotes = useUSDMActivitiesStore((s) => s.footnotesByStudyId[studyId] || []);
  
  return useMemo(() => {
    const matrix: SoACell[][] = activities.map((activity, activityIndex) =>
      encounters.map((encounter, encounterIndex) => {
        const instance = instances.find(
          (i) => i.activityId === activity.id && i.encounterId === encounter.id
        );
        
        return {
          instance: instance || null,
          activityId: activity.id,
          encounterId: encounter.id,
          activityIndex,
          encounterIndex,
          isScheduled: !!instance,
          isRequired: instance?.isRequired ?? false,
          isConditional: instance?.isConditional ?? false,
          displaySymbol: getSoACellSymbol(instance || null),
        };
      })
    );
    
    const requiredInstances = instances.filter((i) => i.isRequired);
    const conditionalInstances = instances.filter((i) => i.isConditional);
    
    return {
      studyId,
      activities,
      encounters,
      matrix,
      footnotes: [...footnotes].sort((a, b) => a.displayOrder - b.displayOrder),
      totalActivities: activities.length,
      totalEncounters: encounters.length,
      totalScheduledInstances: instances.length,
      requiredInstanceCount: requiredInstances.length,
      conditionalInstanceCount: conditionalInstances.length,
    };
  }, [studyId, activities, encounters, instances, footnotes]);
};

export const useSelectedActivity = () => {
  const selectedActivityId = useUSDMActivitiesStore((s) => s.selectedActivityId);
  const activitiesByStudyId = useUSDMActivitiesStore((s) => s.activitiesByStudyId);
  
  return useMemo(() => {
    if (!selectedActivityId) return null;
    for (const activities of Object.values(activitiesByStudyId)) {
      const found = activities.find((a) => a.id === selectedActivityId);
      if (found) return found;
    }
    return null;
  }, [selectedActivityId, activitiesByStudyId]);
};

export const useSelectedEncounter = () => {
  const selectedEncounterId = useUSDMActivitiesStore((s) => s.selectedEncounterId);
  const encountersByStudyId = useUSDMActivitiesStore((s) => s.encountersByStudyId);
  
  return useMemo(() => {
    if (!selectedEncounterId) return null;
    for (const encounters of Object.values(encountersByStudyId)) {
      const found = encounters.find((e) => e.id === selectedEncounterId);
      if (found) return found;
    }
    return null;
  }, [selectedEncounterId, encountersByStudyId]);
};

// ============================================================================
// CLEAR / RESET
// ============================================================================

export const clearActivitiesStore = (): void => {
  useUSDMActivitiesStore.setState(initialState);
};
