

/**
 * Experiment Store
 * Zustand store for experiment lifecycle management
 * @version 0.21.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Experiment,
  ExperimentStatus,
  ExperimentType,
  ExperimentFilter,
  ExperimentTeamMember,
  ExperimentParameter,
  ExperimentResult,
} from '@/types/lab-discovery';
import type {
  ExperimentStoreState,
  ExperimentStoreActions,
  ExperimentState,
  ExperimentCreationConfig,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: ExperimentStoreState = {
  experiments: new Map(),
  experimentsByLab: new Map(),
  experimentsByProject: new Map(),
  isLoading: false,
  isLoadingExperiment: null,
  error: null,
  filters: {},
  selectedExperimentIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useExperimentStore = create<ExperimentStoreState & ExperimentStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // CRUD Operations
      // ========================================================================

      loadExperiments: async (filters?: ExperimentFilter) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadExperiments/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadExperiments/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load experiments',
          }, false, 'loadExperiments/error');
        }
      },

      loadExperiment: async (experimentId: string) => {
        set({ isLoadingExperiment: experimentId, error: null }, false, 'loadExperiment/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const existingState = get().experiments.get(experimentId);
          if (existingState) {
            const updatedState: ExperimentState = {
              ...existingState,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newExperiments = new Map(state.experiments);
              newExperiments.set(experimentId, updatedState);
              return { experiments: newExperiments, isLoadingExperiment: null };
            }, false, 'loadExperiment/success');
          } else {
            set({ isLoadingExperiment: null }, false, 'loadExperiment/notFound');
          }
        } catch (error) {
          set({
            isLoadingExperiment: null,
            error: error instanceof Error ? error.message : 'Failed to load experiment',
          }, false, 'loadExperiment/error');
        }
      },

      createExperiment: async (config: ExperimentCreationConfig) => {
        set({ isLoading: true, error: null }, false, 'createExperiment/start');
        
        try {
          const id = crypto.randomUUID();
          const experimentId = generateExperimentNumber(config.type);
          const now = new Date();
          
          // Create initial team member (principal investigator)
          const piMember: ExperimentTeamMember = {
            userId: config.principalInvestigatorId,
            name: config.principalInvestigatorName,
            role: 'PI',
            joinedAt: now,
          };
          
          const experiment: Experiment = {
            id,
            experimentId,
            title: config.title,
            type: config.type,
            status: 'DRAFT',
            laboratoryId: config.laboratoryId,
            projectId: config.projectId,
            protocolId: config.protocolId,
            principalInvestigatorId: config.principalInvestigatorId,
            principalInvestigatorName: config.principalInvestigatorName,
            description: config.description,
            objectives: config.objective ? [config.objective] : [],
            plannedStartDate: config.plannedStartDate,
            plannedEndDate: config.plannedEndDate,
            teamMembers: [piMember],
            parameters: [],
            results: [],
            compoundIds: [],
            sampleIds: [],
            batchIds: [],
            reagentIds: [],
            equipmentIds: [],
            dataFileIds: [],
            notebookEntryIds: [],
            linkedExperimentIds: [],
            glpCompliant: config.glpCompliant || false,
            tags: config.tags || [],
            createdAt: now,
            updatedAt: now,
            createdBy: config.createdBy,
          };
          
          const experimentState: ExperimentState = {
            experiment,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(id, experimentState);
            
            // Update lab index
            const newByLab = new Map(state.experimentsByLab);
            const labExperiments = new Set(newByLab.get(config.laboratoryId) || []);
            labExperiments.add(id);
            newByLab.set(config.laboratoryId, labExperiments);
            
            // Update project index
            const newByProject = new Map(state.experimentsByProject);
            if (config.projectId) {
              const projectExperiments = new Set(newByProject.get(config.projectId) || []);
              projectExperiments.add(id);
              newByProject.set(config.projectId, projectExperiments);
            }
            
            return {
              experiments: newExperiments,
              experimentsByLab: newByLab,
              experimentsByProject: newByProject,
              isLoading: false,
            };
          }, false, 'createExperiment/success');
          
          return id;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create experiment',
          }, false, 'createExperiment/error');
          throw error;
        }
      },

      updateExperiment: async (experimentId: string, updates: Partial<Experiment>) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'updateExperiment/notFound');
          return;
        }
        
        set({ isLoadingExperiment: experimentId, error: null }, false, 'updateExperiment/start');
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments, isLoadingExperiment: null };
          }, false, 'updateExperiment/success');
        } catch (error) {
          set({
            isLoadingExperiment: null,
            error: error instanceof Error ? error.message : 'Failed to update experiment',
          }, false, 'updateExperiment/error');
        }
      },

      deleteExperiment: async (experimentId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'deleteExperiment/notFound');
          return;
        }
        
        // Only allow deletion of draft experiments
        if (existingState.experiment.status !== 'DRAFT') {
          set({ error: 'Can only delete experiments in DRAFT status' }, false, 'deleteExperiment/invalidStatus');
          return;
        }
        
        set({ isLoadingExperiment: experimentId, error: null }, false, 'deleteExperiment/start');
        
        try {
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.delete(experimentId);
            
            // Remove from indices
            const newByLab = new Map(state.experimentsByLab);
            const labId = existingState.experiment.laboratoryId;
            const labExperiments = new Set(newByLab.get(labId) || []);
            labExperiments.delete(experimentId);
            if (labExperiments.size === 0) {
              newByLab.delete(labId);
            } else {
              newByLab.set(labId, labExperiments);
            }
            
            const newByProject = new Map(state.experimentsByProject);
            const projectId = existingState.experiment.projectId;
            if (projectId) {
              const projectExperiments = new Set(newByProject.get(projectId) || []);
              projectExperiments.delete(experimentId);
              if (projectExperiments.size === 0) {
                newByProject.delete(projectId);
              } else {
                newByProject.set(projectId, projectExperiments);
              }
            }
            
            const newSelected = new Set(state.selectedExperimentIds);
            newSelected.delete(experimentId);
            
            return {
              experiments: newExperiments,
              experimentsByLab: newByLab,
              experimentsByProject: newByProject,
              selectedExperimentIds: newSelected,
              isLoadingExperiment: null,
            };
          }, false, 'deleteExperiment/success');
        } catch (error) {
          set({
            isLoadingExperiment: null,
            error: error instanceof Error ? error.message : 'Failed to delete experiment',
          }, false, 'deleteExperiment/error');
        }
      },

      // ========================================================================
      // Lifecycle Management
      // ========================================================================

      startExperiment: async (experimentId: string, startedBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'startExperiment/notFound');
          return;
        }
        
        if (!['DRAFT', 'PLANNED'].includes(existingState.experiment.status)) {
          set({ error: 'Can only start experiments in DRAFT or PLANNED status' }, false, 'startExperiment/invalidStatus');
          return;
        }
        
        try {
          const now = new Date();
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'IN_PROGRESS',
            actualStartDate: now,
            updatedAt: now,
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'startExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start experiment',
          }, false, 'startExperiment/error');
        }
      },

      pauseExperiment: async (experimentId: string, reason: string, pausedBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'pauseExperiment/notFound');
          return;
        }
        
        if (existingState.experiment.status !== 'IN_PROGRESS') {
          set({ error: 'Can only pause experiments that are IN_PROGRESS' }, false, 'pauseExperiment/invalidStatus');
          return;
        }
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'ON_HOLD',
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'pauseExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to pause experiment',
          }, false, 'pauseExperiment/error');
        }
      },

      resumeExperiment: async (experimentId: string, resumedBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'resumeExperiment/notFound');
          return;
        }
        
        if (existingState.experiment.status !== 'ON_HOLD') {
          set({ error: 'Can only resume experiments that are ON_HOLD' }, false, 'resumeExperiment/invalidStatus');
          return;
        }
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'IN_PROGRESS',
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'resumeExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resume experiment',
          }, false, 'resumeExperiment/error');
        }
      },

      completeExperiment: async (experimentId: string, completedBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'completeExperiment/notFound');
          return;
        }
        
        if (existingState.experiment.status !== 'IN_PROGRESS') {
          set({ error: 'Can only complete experiments that are IN_PROGRESS' }, false, 'completeExperiment/invalidStatus');
          return;
        }
        
        try {
          const now = new Date();
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'COMPLETED',
            actualEndDate: now,
            updatedAt: now,
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'completeExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to complete experiment',
          }, false, 'completeExperiment/error');
        }
      },

      failExperiment: async (experimentId: string, reason: string, failedBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'failExperiment/notFound');
          return;
        }
        
        if (existingState.experiment.status !== 'IN_PROGRESS') {
          set({ error: 'Can only fail experiments that are IN_PROGRESS' }, false, 'failExperiment/invalidStatus');
          return;
        }
        
        try {
          const now = new Date();
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'FAILED',
            actualEndDate: now,
            updatedAt: now,
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'failExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to mark experiment as failed',
          }, false, 'failExperiment/error');
        }
      },

      cancelExperiment: async (experimentId: string, reason: string, cancelledBy: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'cancelExperiment/notFound');
          return;
        }
        
        if (['COMPLETED', 'FAILED', 'CANCELLED', 'ARCHIVED'].includes(existingState.experiment.status)) {
          set({ error: 'Cannot cancel experiment in terminal status' }, false, 'cancelExperiment/invalidStatus');
          return;
        }
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            status: 'CANCELLED',
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'cancelExperiment/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to cancel experiment',
          }, false, 'cancelExperiment/error');
        }
      },

      // ========================================================================
      // Team Management
      // ========================================================================

      addTeamMember: async (experimentId: string, member: Omit<ExperimentTeamMember, 'joinedAt'>) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'addTeamMember/notFound');
          return;
        }
        
        try {
          const newMember: ExperimentTeamMember = {
            ...member,
            joinedAt: new Date(),
          };
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            teamMembers: [...existingState.experiment.teamMembers, newMember],
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'addTeamMember/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add team member',
          }, false, 'addTeamMember/error');
        }
      },

      removeTeamMember: async (experimentId: string, userId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'removeTeamMember/notFound');
          return;
        }
        
        // Don't allow removing PI
        const member = existingState.experiment.teamMembers.find(m => m.userId === userId);
        if (member?.role === 'PI') {
          set({ error: 'Cannot remove principal investigator' }, false, 'removeTeamMember/cannotRemovePI');
          return;
        }
        
        try {
          const now = new Date();
          const updatedMembers = existingState.experiment.teamMembers.map(m => 
            m.userId === userId ? { ...m, leftAt: now } : m
          );
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            teamMembers: updatedMembers,
            updatedAt: now,
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: now,
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'removeTeamMember/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove team member',
          }, false, 'removeTeamMember/error');
        }
      },

      // ========================================================================
      // Parameters & Results
      // ========================================================================

      addParameter: async (experimentId: string, param: Omit<ExperimentParameter, 'id'>) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'addParameter/notFound');
          return;
        }
        
        try {
          const newParam: ExperimentParameter = {
            ...param,
            id: crypto.randomUUID(),
          };
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            parameters: [...existingState.experiment.parameters, newParam],
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'addParameter/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add parameter',
          }, false, 'addParameter/error');
        }
      },

      updateParameter: async (experimentId: string, paramId: string, value: string | number | boolean) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'updateParameter/notFound');
          return;
        }
        
        try {
          const updatedParams = existingState.experiment.parameters.map(p =>
            p.id === paramId ? { ...p, value } : p
          );
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            parameters: updatedParams,
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'updateParameter/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update parameter',
          }, false, 'updateParameter/error');
        }
      },

      addResult: async (experimentId: string, result: Omit<ExperimentResult, 'id'>) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'addResult/notFound');
          return;
        }
        
        try {
          const newResult: ExperimentResult = {
            ...result,
            id: crypto.randomUUID(),
          };
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            results: [...existingState.experiment.results, newResult],
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'addResult/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add result',
          }, false, 'addResult/error');
        }
      },

      updateResult: async (experimentId: string, resultId: string, updates: Partial<ExperimentResult>) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'updateResult/notFound');
          return;
        }
        
        try {
          const updatedResults = existingState.experiment.results.map(r =>
            r.id === resultId ? { ...r, ...updates } : r
          );
          
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            results: updatedResults,
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'updateResult/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update result',
          }, false, 'updateResult/error');
        }
      },

      // ========================================================================
      // Sample & Compound Linkage
      // ========================================================================

      linkSample: async (experimentId: string, sampleId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'linkSample/notFound');
          return;
        }
        
        if (existingState.experiment.sampleIds.includes(sampleId)) return;
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            sampleIds: [...existingState.experiment.sampleIds, sampleId],
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'linkSample/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to link sample' }, false, 'linkSample/error');
        }
      },

      unlinkSample: async (experimentId: string, sampleId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'unlinkSample/notFound');
          return;
        }
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            sampleIds: existingState.experiment.sampleIds.filter(id => id !== sampleId),
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'unlinkSample/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to unlink sample' }, false, 'unlinkSample/error');
        }
      },

      linkCompound: async (experimentId: string, compoundId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'linkCompound/notFound');
          return;
        }
        
        if (existingState.experiment.compoundIds.includes(compoundId)) return;
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            compoundIds: [...existingState.experiment.compoundIds, compoundId],
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'linkCompound/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to link compound' }, false, 'linkCompound/error');
        }
      },

      unlinkCompound: async (experimentId: string, compoundId: string) => {
        const existingState = get().experiments.get(experimentId);
        if (!existingState) {
          set({ error: `Experiment ${experimentId} not found` }, false, 'unlinkCompound/notFound');
          return;
        }
        
        try {
          const updatedExperiment: Experiment = {
            ...existingState.experiment,
            compoundIds: existingState.experiment.compoundIds.filter(id => id !== compoundId),
            updatedAt: new Date(),
          };
          
          const updatedState: ExperimentState = {
            ...existingState,
            experiment: updatedExperiment,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newExperiments = new Map(state.experiments);
            newExperiments.set(experimentId, updatedState);
            return { experiments: newExperiments };
          }, false, 'unlinkCompound/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to unlink compound' }, false, 'unlinkCompound/error');
        }
      },

      // ========================================================================
      // Selection
      // ========================================================================

      selectExperiment: (experimentId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedExperimentIds);
          newSelected.add(experimentId);
          return { selectedExperimentIds: newSelected };
        }, false, 'selectExperiment');
      },

      deselectExperiment: (experimentId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedExperimentIds);
          newSelected.delete(experimentId);
          return { selectedExperimentIds: newSelected };
        }, false, 'deselectExperiment');
      },

      clearSelection: () => {
        set({ selectedExperimentIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filtering
      // ========================================================================

      setFilters: (filters: ExperimentFilter) => {
        set({ filters }, false, 'setFilters');
      },

      clearFilters: () => {
        set({ filters: {} }, false, 'clearFilters');
      },

      // ========================================================================
      // Utilities
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'experiment-store' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function generateExperimentNumber(type: ExperimentType): string {
  const prefix = type.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `EXP-${prefix}-${timestamp}`;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectAllExperiments = (state: ExperimentStoreState): ExperimentState[] => {
  return Array.from(state.experiments.values());
};

export const selectExperimentById = (state: ExperimentStoreState, experimentId: string): ExperimentState | null => {
  return state.experiments.get(experimentId) || null;
};

export const selectExperimentsByLab = (state: ExperimentStoreState, labId: string): ExperimentState[] => {
  const ids = state.experimentsByLab.get(labId);
  if (!ids) return [];
  return Array.from(ids).map(id => state.experiments.get(id)).filter(Boolean) as ExperimentState[];
};

export const selectExperimentsByProject = (state: ExperimentStoreState, projectId: string): ExperimentState[] => {
  const ids = state.experimentsByProject.get(projectId);
  if (!ids) return [];
  return Array.from(ids).map(id => state.experiments.get(id)).filter(Boolean) as ExperimentState[];
};

export const selectExperimentsByStatus = (state: ExperimentStoreState, status: ExperimentStatus): ExperimentState[] => {
  return Array.from(state.experiments.values()).filter(es => es.experiment.status === status);
};

export const selectActiveExperiments = (state: ExperimentStoreState): ExperimentState[] => {
  return Array.from(state.experiments.values()).filter(
    es => es.experiment.status === 'IN_PROGRESS' || es.experiment.status === 'ON_HOLD'
  );
};

export const selectFilteredExperiments = (state: ExperimentStoreState): ExperimentState[] => {
  const experiments = Array.from(state.experiments.values());
  const { filters } = state;
  
  return experiments.filter(es => {
    const exp = es.experiment;
    
    if (filters.status?.length && !filters.status.includes(exp.status)) return false;
    if (filters.type?.length && !filters.type.includes(exp.type)) return false;
    if (filters.laboratoryId && exp.laboratoryId !== filters.laboratoryId) return false;
    if (filters.projectId && exp.projectId !== filters.projectId) return false;
    if (filters.principalInvestigatorId && exp.principalInvestigatorId !== filters.principalInvestigatorId) return false;
    if (filters.compoundIds?.length && !exp.compoundIds.some(c => filters.compoundIds!.includes(c))) return false;
    if (filters.startDateAfter && exp.actualStartDate && exp.actualStartDate < filters.startDateAfter) return false;
    if (filters.startDateBefore && exp.actualStartDate && exp.actualStartDate > filters.startDateBefore) return false;
    if (filters.glpCompliant !== undefined && exp.glpCompliant !== filters.glpCompliant) return false;
    if (filters.tags?.length && !exp.tags.some(t => filters.tags!.includes(t))) return false;
    
    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      const searchable = [exp.experimentId, exp.title, exp.description].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(term)) return false;
    }
    
    return true;
  });
};

export const selectExperimentMetrics = (state: ExperimentStoreState) => {
  const experiments = Array.from(state.experiments.values());
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    total: experiments.length,
    byStatus: experiments.reduce((acc, es) => {
      acc[es.experiment.status] = (acc[es.experiment.status] || 0) + 1;
      return acc;
    }, {} as Record<ExperimentStatus, number>),
    byType: experiments.reduce((acc, es) => {
      acc[es.experiment.type] = (acc[es.experiment.type] || 0) + 1;
      return acc;
    }, {} as Record<ExperimentType, number>),
    active: experiments.filter(es => es.experiment.status === 'IN_PROGRESS').length,
    completedThisMonth: experiments.filter(es =>
      es.experiment.status === 'COMPLETED' &&
      es.experiment.actualEndDate &&
      es.experiment.actualEndDate >= thisMonth
    ).length,
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useAllExperiments = () => useExperimentStore(state => selectAllExperiments(state));
export const useExperimentById = (experimentId: string) => useExperimentStore(state => selectExperimentById(state, experimentId));
export const useExperimentsByLab = (labId: string) => useExperimentStore(state => selectExperimentsByLab(state, labId));
export const useExperimentsByProject = (projectId: string) => useExperimentStore(state => selectExperimentsByProject(state, projectId));
export const useExperimentsByStatus = (status: ExperimentStatus) => useExperimentStore(state => selectExperimentsByStatus(state, status));
export const useActiveExperiments = () => useExperimentStore(state => selectActiveExperiments(state));
export const useFilteredExperiments = () => useExperimentStore(state => selectFilteredExperiments(state));
export const useExperimentMetrics = () => useExperimentStore(state => selectExperimentMetrics(state));
export const useExperimentLoading = () => useExperimentStore(state => ({ isLoading: state.isLoading, isLoadingExperiment: state.isLoadingExperiment }));
export const useExperimentError = () => useExperimentStore(state => state.error);
export const useExperimentFilters = () => useExperimentStore(state => state.filters);
