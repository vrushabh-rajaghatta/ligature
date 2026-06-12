

/**
 * Compound Store
 * Zustand store for compound registration and management
 * @version 0.21.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Compound,
  CompoundStatus,
  CompoundFilter,
  SolubilityData,
  HazardClass,
} from '@/types/lab-discovery';
import type {
  CompoundStoreState,
  CompoundStoreActions,
  CompoundState,
  CompoundRegistrationConfig,
  CompoundStructureUpdate,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: CompoundStoreState = {
  compounds: new Map(),
  isLoading: false,
  isLoadingCompound: null,
  error: null,
  filters: {},
  selectedCompoundIds: new Set(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useCompoundStore = create<CompoundStoreState & CompoundStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // CRUD Operations
      // ========================================================================

      loadCompounds: async (filters?: CompoundFilter) => {
        set({ isLoading: true, error: null, filters: filters || {} }, false, 'loadCompounds/start');
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadCompounds/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load compounds',
          }, false, 'loadCompounds/error');
        }
      },

      loadCompound: async (compoundId: string) => {
        set({ isLoadingCompound: compoundId, error: null }, false, 'loadCompound/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const existingState = get().compounds.get(compoundId);
          if (existingState) {
            const updatedState: CompoundState = {
              ...existingState,
              lastSyncedAt: new Date(),
            };
            
            set(state => {
              const newCompounds = new Map(state.compounds);
              newCompounds.set(compoundId, updatedState);
              return { compounds: newCompounds, isLoadingCompound: null };
            }, false, 'loadCompound/success');
          } else {
            set({ isLoadingCompound: null }, false, 'loadCompound/notFound');
          }
        } catch (error) {
          set({
            isLoadingCompound: null,
            error: error instanceof Error ? error.message : 'Failed to load compound',
          }, false, 'loadCompound/error');
        }
      },

      registerCompound: async (config: CompoundRegistrationConfig) => {
        set({ isLoading: true, error: null }, false, 'registerCompound/start');
        
        try {
          const id = crypto.randomUUID();
          const now = new Date();
          
          const compound: Compound = {
            id,
            compoundId: config.compoundId,
            name: config.name,
            synonyms: config.synonyms || [],
            status: 'VIRTUAL',
            molecularFormula: config.molecularFormula,
            molecularWeight: config.molecularWeight,
            smiles: config.smiles,
            therapeuticArea: config.therapeuticArea,
            targetClass: config.targetClass,
            hazardClasses: config.hazardClasses || [],
            projectIds: config.projectIds || [],
            tags: config.tags || [],
            createdAt: now,
            updatedAt: now,
            createdBy: 'current-user', // Would come from auth context
          };
          
          const compoundState: CompoundState = {
            compound,
            lastSyncedAt: now,
            isDirty: false,
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(id, compoundState);
            return { compounds: newCompounds, isLoading: false };
          }, false, 'registerCompound/success');
          
          return id;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to register compound',
          }, false, 'registerCompound/error');
          throw error;
        }
      },

      updateCompound: async (compoundId: string, updates: Partial<Compound>) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'updateCompound/notFound');
          return;
        }
        
        set({ isLoadingCompound: compoundId, error: null }, false, 'updateCompound/start');
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            ...updates,
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
            isDirty: false,
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds, isLoadingCompound: null };
          }, false, 'updateCompound/success');
        } catch (error) {
          set({
            isLoadingCompound: null,
            error: error instanceof Error ? error.message : 'Failed to update compound',
          }, false, 'updateCompound/error');
        }
      },

      deleteCompound: async (compoundId: string) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'deleteCompound/notFound');
          return;
        }
        
        set({ isLoadingCompound: compoundId, error: null }, false, 'deleteCompound/start');
        
        try {
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.delete(compoundId);
            const newSelected = new Set(state.selectedCompoundIds);
            newSelected.delete(compoundId);
            return { compounds: newCompounds, selectedCompoundIds: newSelected, isLoadingCompound: null };
          }, false, 'deleteCompound/success');
        } catch (error) {
          set({
            isLoadingCompound: null,
            error: error instanceof Error ? error.message : 'Failed to delete compound',
          }, false, 'deleteCompound/error');
        }
      },

      // ========================================================================
      // Status Management
      // ========================================================================

      updateCompoundStatus: async (compoundId: string, status: CompoundStatus, reason?: string) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'updateCompoundStatus/notFound');
          return;
        }
        
        // Validate status transition
        if (!isValidCompoundStatusTransition(existingState.compound.status, status)) {
          set({
            error: `Invalid status transition from ${existingState.compound.status} to ${status}`,
          }, false, 'updateCompoundStatus/invalidTransition');
          return;
        }
        
        set({ isLoadingCompound: compoundId, error: null }, false, 'updateCompoundStatus/start');
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            status,
            updatedAt: new Date(),
          };
          
          // Set milestone dates based on status
          if (status === 'SYNTHESIZED' && !updatedCompound.discoveryDate) {
            updatedCompound.discoveryDate = new Date();
          }
          if (status === 'CHARACTERIZED') {
            updatedCompound.leadOptimizationDate = new Date();
          }
          if (status === 'ACTIVE') {
            updatedCompound.candidateSelectionDate = new Date();
          }
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds, isLoadingCompound: null };
          }, false, 'updateCompoundStatus/success');
        } catch (error) {
          set({
            isLoadingCompound: null,
            error: error instanceof Error ? error.message : 'Failed to update compound status',
          }, false, 'updateCompoundStatus/error');
        }
      },

      // ========================================================================
      // Structure & Properties
      // ========================================================================

      updateStructure: async (compoundId: string, structure: CompoundStructureUpdate) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'updateStructure/notFound');
          return;
        }
        
        set({ isLoadingCompound: compoundId, error: null }, false, 'updateStructure/start');
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            ...structure,
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds, isLoadingCompound: null };
          }, false, 'updateStructure/success');
        } catch (error) {
          set({
            isLoadingCompound: null,
            error: error instanceof Error ? error.message : 'Failed to update structure',
          }, false, 'updateStructure/error');
        }
      },

      addSolubilityData: async (compoundId: string, data: SolubilityData) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'addSolubilityData/notFound');
          return;
        }
        
        try {
          const existingSolubility = existingState.compound.solubility || [];
          const updatedCompound: Compound = {
            ...existingState.compound,
            solubility: [...existingSolubility, data],
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds };
          }, false, 'addSolubilityData/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add solubility data',
          }, false, 'addSolubilityData/error');
        }
      },

      updateHazards: async (compoundId: string, hazards: HazardClass[]) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'updateHazards/notFound');
          return;
        }
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            hazardClasses: hazards,
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds };
          }, false, 'updateHazards/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update hazards',
          }, false, 'updateHazards/error');
        }
      },

      // ========================================================================
      // Project Linkage
      // ========================================================================

      linkToProject: async (compoundId: string, projectId: string) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'linkToProject/notFound');
          return;
        }
        
        if (existingState.compound.projectIds.includes(projectId)) {
          return; // Already linked
        }
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            projectIds: [...existingState.compound.projectIds, projectId],
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds };
          }, false, 'linkToProject/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to link to project',
          }, false, 'linkToProject/error');
        }
      },

      unlinkFromProject: async (compoundId: string, projectId: string) => {
        const existingState = get().compounds.get(compoundId);
        if (!existingState) {
          set({ error: `Compound ${compoundId} not found` }, false, 'unlinkFromProject/notFound');
          return;
        }
        
        try {
          const updatedCompound: Compound = {
            ...existingState.compound,
            projectIds: existingState.compound.projectIds.filter(id => id !== projectId),
            updatedAt: new Date(),
          };
          
          const updatedState: CompoundState = {
            ...existingState,
            compound: updatedCompound,
            lastSyncedAt: new Date(),
          };
          
          set(state => {
            const newCompounds = new Map(state.compounds);
            newCompounds.set(compoundId, updatedState);
            return { compounds: newCompounds };
          }, false, 'unlinkFromProject/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to unlink from project',
          }, false, 'unlinkFromProject/error');
        }
      },

      // ========================================================================
      // Selection
      // ========================================================================

      selectCompound: (compoundId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedCompoundIds);
          newSelected.add(compoundId);
          return { selectedCompoundIds: newSelected };
        }, false, 'selectCompound');
      },

      deselectCompound: (compoundId: string) => {
        set(state => {
          const newSelected = new Set(state.selectedCompoundIds);
          newSelected.delete(compoundId);
          return { selectedCompoundIds: newSelected };
        }, false, 'deselectCompound');
      },

      selectAllCompounds: () => {
        set(state => {
          const allIds = new Set(state.compounds.keys());
          return { selectedCompoundIds: allIds };
        }, false, 'selectAllCompounds');
      },

      clearSelection: () => {
        set({ selectedCompoundIds: new Set() }, false, 'clearSelection');
      },

      // ========================================================================
      // Filtering
      // ========================================================================

      setFilters: (filters: CompoundFilter) => {
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
    { name: 'compound-store' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function isValidCompoundStatusTransition(from: CompoundStatus, to: CompoundStatus): boolean {
  const validTransitions: Record<CompoundStatus, CompoundStatus[]> = {
    VIRTUAL: ['SYNTHESIZED', 'DISCONTINUED'],
    SYNTHESIZED: ['CHARACTERIZED', 'INACTIVE', 'DISCONTINUED'],
    CHARACTERIZED: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    ACTIVE: ['INACTIVE', 'DISCONTINUED'],
    INACTIVE: ['ACTIVE', 'DISCONTINUED'],
    DISCONTINUED: [], // Terminal state
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectAllCompounds = (state: CompoundStoreState): CompoundState[] => {
  return Array.from(state.compounds.values());
};

export const selectCompoundById = (state: CompoundStoreState, compoundId: string): CompoundState | null => {
  return state.compounds.get(compoundId) || null;
};

export const selectCompoundsByStatus = (state: CompoundStoreState, status: CompoundStatus): CompoundState[] => {
  return Array.from(state.compounds.values()).filter(cs => cs.compound.status === status);
};

export const selectCompoundsByTherapeuticArea = (state: CompoundStoreState, area: string): CompoundState[] => {
  return Array.from(state.compounds.values()).filter(cs => cs.compound.therapeuticArea === area);
};

export const selectCompoundsWithStructure = (state: CompoundStoreState): CompoundState[] => {
  return Array.from(state.compounds.values()).filter(cs => cs.compound.smiles || cs.compound.molecularFormula);
};

export const selectCompoundsByProject = (state: CompoundStoreState, projectId: string): CompoundState[] => {
  return Array.from(state.compounds.values()).filter(cs => cs.compound.projectIds.includes(projectId));
};

export const selectFilteredCompounds = (state: CompoundStoreState): CompoundState[] => {
  const compounds = Array.from(state.compounds.values());
  const { filters } = state;
  
  return compounds.filter(cs => {
    const compound = cs.compound;
    
    if (filters.status?.length && !filters.status.includes(compound.status)) {
      return false;
    }
    
    if (filters.therapeuticArea?.length && compound.therapeuticArea &&
        !filters.therapeuticArea.includes(compound.therapeuticArea)) {
      return false;
    }
    
    if (filters.targetClass?.length && compound.targetClass &&
        !filters.targetClass.includes(compound.targetClass)) {
      return false;
    }
    
    if (filters.projectIds?.length &&
        !compound.projectIds.some(id => filters.projectIds!.includes(id))) {
      return false;
    }
    
    if (filters.programId && compound.programId !== filters.programId) {
      return false;
    }
    
    if (filters.hasStructure !== undefined) {
      const hasStructure = !!(compound.smiles || compound.molecularFormula);
      if (filters.hasStructure !== hasStructure) {
        return false;
      }
    }
    
    if (filters.createdAfter && compound.createdAt < filters.createdAfter) {
      return false;
    }
    
    if (filters.createdBefore && compound.createdAt > filters.createdBefore) {
      return false;
    }
    
    if (filters.tags?.length && !compound.tags.some(tag => filters.tags!.includes(tag))) {
      return false;
    }
    
    if (filters.searchText) {
      const term = filters.searchText.toLowerCase();
      const searchable = [
        compound.compoundId,
        compound.name,
        ...compound.synonyms,
        compound.casNumber,
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchable.includes(term)) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectSelectedCompounds = (state: CompoundStoreState): CompoundState[] => {
  return Array.from(state.compounds.values()).filter(cs => 
    state.selectedCompoundIds.has(cs.compound.id)
  );
};

export const selectCompoundMetrics = (state: CompoundStoreState) => {
  const compounds = Array.from(state.compounds.values());
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return {
    total: compounds.length,
    byStatus: compounds.reduce((acc, cs) => {
      acc[cs.compound.status] = (acc[cs.compound.status] || 0) + 1;
      return acc;
    }, {} as Record<CompoundStatus, number>),
    recentlyRegistered: compounds.filter(cs => cs.compound.createdAt >= thirtyDaysAgo).length,
    withStructure: compounds.filter(cs => cs.compound.smiles || cs.compound.molecularFormula).length,
    byTherapeuticArea: compounds.reduce((acc, cs) => {
      const area = cs.compound.therapeuticArea || 'Unassigned';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useAllCompounds = () =>
  useCompoundStore(state => selectAllCompounds(state));

export const useCompoundById = (compoundId: string) =>
  useCompoundStore(state => selectCompoundById(state, compoundId));

export const useCompoundsByStatus = (status: CompoundStatus) =>
  useCompoundStore(state => selectCompoundsByStatus(state, status));

export const useCompoundsByTherapeuticArea = (area: string) =>
  useCompoundStore(state => selectCompoundsByTherapeuticArea(state, area));

export const useCompoundsWithStructure = () =>
  useCompoundStore(state => selectCompoundsWithStructure(state));

export const useCompoundsByProject = (projectId: string) =>
  useCompoundStore(state => selectCompoundsByProject(state, projectId));

export const useFilteredCompounds = () =>
  useCompoundStore(state => selectFilteredCompounds(state));

export const useSelectedCompounds = () =>
  useCompoundStore(state => selectSelectedCompounds(state));

export const useCompoundMetrics = () =>
  useCompoundStore(state => selectCompoundMetrics(state));

export const useCompoundLoading = () =>
  useCompoundStore(state => ({ isLoading: state.isLoading, isLoadingCompound: state.isLoadingCompound }));

export const useCompoundError = () =>
  useCompoundStore(state => state.error);

export const useCompoundFilters = () =>
  useCompoundStore(state => state.filters);
