

/**
 * EDC (Electronic Data Capture) Store
 * Zustand store for form instance data management
 * @version 0.20.10.3
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  FormInstance,
  FormStatus,
  FieldValue,
  SDVStatus,
  DataQuery,
} from '@/types/clinical-form';

// ============================================================================
// Types
// ============================================================================

export interface EDCFormState {
  form: FormInstance;
  isDirty: boolean;
  lastSyncedAt: Date;
  validationErrors: ValidationError[];
}

export interface ValidationError {
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  ruleId?: string;
}

export interface EDCFilters {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  visitId?: string;
  status?: FormStatus[];
  sdvStatus?: SDVStatus[];
  hasOpenQueries?: boolean;
  definitionId?: string;
}

export interface EDCMetrics {
  totalForms: number;
  byStatus: Record<FormStatus, number>;
  bySDVStatus: Record<SDVStatus, number>;
  formsWithOpenQueries: number;
  completionRate: number;
  sdvRate: number;
}

export interface EditCheckResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Store State
// ============================================================================

export interface EDCStoreState {
  // Form collection
  forms: Map<string, EDCFormState>;
  
  // Selection
  selectedFormId: string | null;
  selectedFieldOID: string | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingForm: string | null;
  isSaving: boolean;
  
  // Error state
  error: string | null;
  
  // Filters
  filters: EDCFilters;
  
  // Metrics cache
  metricsCache: Map<string, EDCMetrics>; // Key by subjectId or visitId
}

// ============================================================================
// Store Actions
// ============================================================================

export interface EDCStoreActions {
  // Form lifecycle
  loadForms: (filters: EDCFilters) => Promise<void>;
  loadForm: (formId: string) => Promise<void>;
  createForm: (params: {
    definitionId: string;
    subjectId: string;
    visitId: string;
    studyId: string;
    siteId: string;
  }) => Promise<string>;
  
  // Data entry
  setFieldValue: (
    formId: string,
    fieldOID: string,
    value: string | number | boolean | null,
    sectionId: string,
    repeatKey?: string
  ) => Promise<EditCheckResult>;
  
  clearFieldValue: (
    formId: string,
    fieldOID: string,
    sectionId: string,
    reason: string,
    repeatKey?: string
  ) => Promise<void>;
  
  // Form status
  updateFormStatus: (formId: string, status: FormStatus, reason?: string) => Promise<void>;
  completeForm: (formId: string) => Promise<EditCheckResult>;
  freezeForm: (formId: string, reason?: string) => Promise<void>;
  lockForm: (formId: string) => Promise<void>;
  unfreezeForm: (formId: string, reason: string) => Promise<void>;
  
  // Edit checks
  runEditChecks: (formId: string) => Promise<EditCheckResult>;
  runFieldEditCheck: (
    formId: string,
    fieldOID: string,
    sectionId: string,
    repeatKey?: string
  ) => Promise<EditCheckResult>;
  
  // SDV
  markFieldSDV: (
    formId: string,
    fieldOID: string,
    sectionId: string,
    repeatKey?: string
  ) => Promise<void>;
  markFormSDV: (formId: string) => Promise<void>;
  
  // Selection
  selectForm: (formId: string | null) => void;
  selectField: (fieldOID: string | null) => void;
  
  // Filters
  setFilters: (filters: Partial<EDCFilters>) => void;
  clearFilters: () => void;
  
  // Metrics
  loadMetrics: (params: { subjectId?: string; visitId?: string }) => Promise<EDCMetrics>;
  
  // Error handling
  clearError: () => void;
  
  // Batch operations
  batchSetFieldValues: (
    formId: string,
    values: Array<{
      fieldOID: string;
      value: string | number | boolean | null;
      sectionId: string;
      repeatKey?: string;
    }>
  ) => Promise<EditCheckResult>;
}

export type EDCStore = EDCStoreState & EDCStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: EDCStoreState = {
  forms: new Map(),
  selectedFormId: null,
  selectedFieldOID: null,
  isLoading: false,
  isLoadingForm: null,
  isSaving: false,
  error: null,
  filters: {},
  metricsCache: new Map(),
};

// ============================================================================
// Mock API Functions
// ============================================================================

async function mockLoadForms(filters: EDCFilters): Promise<FormInstance[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  // Return empty array - will be populated by actual API
  return [];
}

async function mockLoadForm(formId: string): Promise<FormInstance | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return null;
}

async function mockCreateForm(params: {
  definitionId: string;
  subjectId: string;
  visitId: string;
  studyId: string;
  siteId: string;
}): Promise<FormInstance> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const now = new Date();
  return {
    id: `form-${Date.now()}`,
    definitionId: params.definitionId,
    definitionVersion: '1.0',
    subjectId: params.subjectId,
    subjectVisitId: params.visitId,
    studyId: params.studyId,
    siteId: params.siteId,
    tenantId: 'tenant-1',
    status: 'NOT_STARTED',
    data: {},
    queries: [],
    openQueryCount: 0,
    sdvStatus: 'NOT_REQUIRED',
    sdvProgress: 0,
    signatureStatus: 'NOT_REQUIRED',
    auditTrail: [],
    createdAt: now,
    createdBy: 'current-user',
    updatedAt: now,
    updatedBy: 'current-user',
  };
}

async function mockSaveFieldValue(
  formId: string,
  fieldOID: string,
  value: string | number | boolean | null,
  sectionId: string,
  repeatKey?: string
): Promise<FieldValue> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const now = new Date();
  return {
    fieldOID,
    sectionId,
    repeatKey,
    value,
    enteredAt: now,
    enteredBy: 'current-user',
    sdvRequired: false,
    sdvCompleted: false,
  };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useEDCStore = create<EDCStore>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Form Lifecycle
  // -------------------------------------------------------------------------

  loadForms: async (filters: EDCFilters) => {
    set({ isLoading: true, error: null, filters });
    
    try {
      const forms = await mockLoadForms(filters);
      const formsMap = new Map<string, EDCFormState>();
      
      forms.forEach(form => {
        formsMap.set(form.id, {
          form,
          isDirty: false,
          lastSyncedAt: new Date(),
          validationErrors: [],
        });
      });
      
      set({ forms: formsMap, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load forms',
      });
    }
  },

  loadForm: async (formId: string) => {
    set({ isLoadingForm: formId, error: null });
    
    try {
      const form = await mockLoadForm(formId);
      
      if (form) {
        set(state => {
          const newForms = new Map(state.forms);
          newForms.set(formId, {
            form,
            isDirty: false,
            lastSyncedAt: new Date(),
            validationErrors: [],
          });
          return { forms: newForms, isLoadingForm: null };
        });
      } else {
        set({
          isLoadingForm: null,
          error: `Form ${formId} not found`,
        });
      }
    } catch (error) {
      set({
        isLoadingForm: null,
        error: error instanceof Error ? error.message : 'Failed to load form',
      });
    }
  },

  createForm: async (params) => {
    set({ isLoading: true, error: null });
    
    try {
      const form = await mockCreateForm(params);
      
      set(state => {
        const newForms = new Map(state.forms);
        newForms.set(form.id, {
          form,
          isDirty: false,
          lastSyncedAt: new Date(),
          validationErrors: [],
        });
        return { forms: newForms, isLoading: false };
      });
      
      return form.id;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create form',
      });
      throw error;
    }
  },

  // -------------------------------------------------------------------------
  // Data Entry
  // -------------------------------------------------------------------------

  setFieldValue: async (formId, fieldOID, value, sectionId, repeatKey) => {
    const state = get();
    const formState = state.forms.get(formId);
    
    if (!formState) {
      return { passed: false, errors: [{ fieldOID, sectionId, repeatKey, message: 'Form not found', severity: 'ERROR' }], warnings: [] };
    }

    set({ isSaving: true });
    
    try {
      const fieldValue = await mockSaveFieldValue(formId, fieldOID, value, sectionId, repeatKey);
      
      // Update form with new field value
      set(state => {
        const newForms = new Map(state.forms);
        const currentFormState = newForms.get(formId);
        
        if (currentFormState) {
          const key = repeatKey ? `${fieldOID}:${repeatKey}` : fieldOID;
          const newData = { ...currentFormState.form.data, [key]: fieldValue };
          
          // Update status if transitioning from NOT_STARTED
          let newStatus = currentFormState.form.status;
          if (newStatus === 'NOT_STARTED') {
            newStatus = 'IN_PROGRESS';
          }
          
          newForms.set(formId, {
            ...currentFormState,
            form: {
              ...currentFormState.form,
              data: newData,
              status: newStatus,
              startedAt: currentFormState.form.startedAt || new Date(),
              updatedAt: new Date(),
            },
            isDirty: true,
          });
        }
        
        return { forms: newForms, isSaving: false };
      });
      
      // Run edit checks for this field
      return await get().runFieldEditCheck(formId, fieldOID, sectionId, repeatKey);
    } catch (error) {
      set({ isSaving: false, error: error instanceof Error ? error.message : 'Failed to save field value' });
      return { passed: false, errors: [{ fieldOID, sectionId, repeatKey, message: 'Save failed', severity: 'ERROR' }], warnings: [] };
    }
  },

  clearFieldValue: async (formId, fieldOID, sectionId, reason, repeatKey) => {
    await get().setFieldValue(formId, fieldOID, null, sectionId, repeatKey);
  },

  batchSetFieldValues: async (formId, values) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    for (const { fieldOID, value, sectionId, repeatKey } of values) {
      const result = await get().setFieldValue(formId, fieldOID, value, sectionId, repeatKey);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    
    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  },

  // -------------------------------------------------------------------------
  // Form Status
  // -------------------------------------------------------------------------

  updateFormStatus: async (formId, status, reason) => {
    set(state => {
      const newForms = new Map(state.forms);
      const formState = newForms.get(formId);
      
      if (formState) {
        const now = new Date();
        const updates: Partial<FormInstance> = {
          status,
          updatedAt: now,
        };
        
        // Set status-specific timestamps
        switch (status) {
          case 'IN_PROGRESS':
            if (!formState.form.startedAt) updates.startedAt = now;
            break;
          case 'COMPLETE':
            updates.completedAt = now;
            break;
          case 'FROZEN':
            updates.frozenAt = now;
            break;
          case 'LOCKED':
            updates.lockedAt = now;
            break;
        }
        
        newForms.set(formId, {
          ...formState,
          form: { ...formState.form, ...updates },
          isDirty: true,
        });
      }
      
      return { forms: newForms };
    });
  },

  completeForm: async (formId) => {
    // Run all edit checks first
    const result = await get().runEditChecks(formId);
    
    if (result.passed) {
      await get().updateFormStatus(formId, 'COMPLETE');
    }
    
    return result;
  },

  freezeForm: async (formId, reason) => {
    await get().updateFormStatus(formId, 'FROZEN', reason);
  },

  lockForm: async (formId) => {
    await get().updateFormStatus(formId, 'LOCKED');
  },

  unfreezeForm: async (formId, reason) => {
    await get().updateFormStatus(formId, 'COMPLETE', reason);
  },

  // -------------------------------------------------------------------------
  // Edit Checks
  // -------------------------------------------------------------------------

  runEditChecks: async (formId) => {
    const state = get();
    const formState = state.forms.get(formId);
    
    if (!formState) {
      return {
        passed: false,
        errors: [{ fieldOID: '', sectionId: '', message: 'Form not found', severity: 'ERROR' as const }],
        warnings: [],
      };
    }
    
    // Simulate edit check execution
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Check for required fields (simplified mock)
    // In real implementation, this would use the edit check compiler
    
    // Update form state with validation errors
    set(state => {
      const newForms = new Map(state.forms);
      const currentState = newForms.get(formId);
      
      if (currentState) {
        newForms.set(formId, {
          ...currentState,
          validationErrors: [...errors, ...warnings],
        });
      }
      
      return { forms: newForms };
    });
    
    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  },

  runFieldEditCheck: async (formId, fieldOID, sectionId, repeatKey) => {
    // Simplified field-level edit check
    await new Promise(resolve => setTimeout(resolve, 20));
    
    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  },

  // -------------------------------------------------------------------------
  // SDV
  // -------------------------------------------------------------------------

  markFieldSDV: async (formId, fieldOID, sectionId, repeatKey) => {
    set(state => {
      const newForms = new Map(state.forms);
      const formState = newForms.get(formId);
      
      if (formState) {
        const key = repeatKey ? `${fieldOID}:${repeatKey}` : fieldOID;
        const fieldValue = formState.form.data[key];
        
        if (fieldValue) {
          const newData = {
            ...formState.form.data,
            [key]: {
              ...fieldValue,
              sdvCompleted: true,
              sdvCompletedAt: new Date(),
              sdvCompletedBy: 'current-user',
            },
          };
          
          // Recalculate SDV progress
          const fields = Object.values(newData);
          const sdvRequiredFields = fields.filter(f => f.sdvRequired);
          const sdvCompletedFields = sdvRequiredFields.filter(f => f.sdvCompleted);
          const sdvProgress = sdvRequiredFields.length > 0
            ? (sdvCompletedFields.length / sdvRequiredFields.length) * 100
            : 100;
          
          const sdvStatus: SDVStatus = sdvProgress === 100 ? 'COMPLETE' 
            : sdvProgress > 0 ? 'PARTIAL' 
            : 'PENDING';
          
          newForms.set(formId, {
            ...formState,
            form: {
              ...formState.form,
              data: newData,
              sdvProgress,
              sdvStatus,
            },
            isDirty: true,
          });
        }
      }
      
      return { forms: newForms };
    });
  },

  markFormSDV: async (formId) => {
    const state = get();
    const formState = state.forms.get(formId);
    
    if (!formState) return;
    
    // Mark all SDV-required fields as complete
    for (const [key, fieldValue] of Object.entries(formState.form.data)) {
      if (fieldValue.sdvRequired && !fieldValue.sdvCompleted) {
        const [fieldOID, repeatKey] = key.split(':');
        await get().markFieldSDV(formId, fieldOID, fieldValue.sectionId, repeatKey);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  selectForm: (formId) => {
    set({ selectedFormId: formId, selectedFieldOID: null });
  },

  selectField: (fieldOID) => {
    set({ selectedFieldOID: fieldOID });
  },

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  loadMetrics: async (params) => {
    const state = get();
    const cacheKey = params.subjectId || params.visitId || 'all';
    
    // Check cache first
    const cached = state.metricsCache.get(cacheKey);
    if (cached) return cached;
    
    // Calculate metrics from current forms
    const forms = Array.from(state.forms.values())
      .filter(fs => {
        if (params.subjectId && fs.form.subjectId !== params.subjectId) return false;
        if (params.visitId && fs.form.subjectVisitId !== params.visitId) return false;
        return true;
      })
      .map(fs => fs.form);
    
    const byStatus: Record<FormStatus, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      FROZEN: 0,
      LOCKED: 0,
    };
    
    const bySDVStatus: Record<SDVStatus, number> = {
      NOT_REQUIRED: 0,
      PENDING: 0,
      PARTIAL: 0,
      COMPLETE: 0,
    };
    
    let formsWithOpenQueries = 0;
    
    forms.forEach(form => {
      byStatus[form.status]++;
      bySDVStatus[form.sdvStatus]++;
      if (form.openQueryCount > 0) formsWithOpenQueries++;
    });
    
    const completedOrLocked = byStatus.COMPLETE + byStatus.FROZEN + byStatus.LOCKED;
    const completionRate = forms.length > 0 ? (completedOrLocked / forms.length) * 100 : 0;
    
    const sdvRequired = bySDVStatus.PENDING + bySDVStatus.PARTIAL + bySDVStatus.COMPLETE;
    const sdvRate = sdvRequired > 0 ? (bySDVStatus.COMPLETE / sdvRequired) * 100 : 100;
    
    const metrics: EDCMetrics = {
      totalForms: forms.length,
      byStatus,
      bySDVStatus,
      formsWithOpenQueries,
      completionRate,
      sdvRate,
    };
    
    // Cache the result
    set(state => {
      const newCache = new Map(state.metricsCache);
      newCache.set(cacheKey, metrics);
      return { metricsCache: newCache };
    });
    
    return metrics;
  },

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  clearError: () => {
    set({ error: null });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectFormById = (state: EDCStoreState, formId: string): FormInstance | null => {
  return state.forms.get(formId)?.form ?? null;
};

export const selectFormState = (state: EDCStoreState, formId: string): EDCFormState | null => {
  return state.forms.get(formId) ?? null;
};

export const selectAllForms = (state: EDCStoreState): FormInstance[] => {
  return Array.from(state.forms.values()).map(fs => fs.form);
};

export const selectFormsBySubject = (state: EDCStoreState, subjectId: string): FormInstance[] => {
  return Array.from(state.forms.values())
    .filter(fs => fs.form.subjectId === subjectId)
    .map(fs => fs.form);
};

export const selectFormsByVisit = (state: EDCStoreState, visitId: string): FormInstance[] => {
  return Array.from(state.forms.values())
    .filter(fs => fs.form.subjectVisitId === visitId)
    .map(fs => fs.form);
};

export const selectFormsByStatus = (state: EDCStoreState, status: FormStatus): FormInstance[] => {
  return Array.from(state.forms.values())
    .filter(fs => fs.form.status === status)
    .map(fs => fs.form);
};

export const selectFormsWithOpenQueries = (state: EDCStoreState): FormInstance[] => {
  return Array.from(state.forms.values())
    .filter(fs => fs.form.openQueryCount > 0)
    .map(fs => fs.form);
};

export const selectFormValidationErrors = (state: EDCStoreState, formId: string): ValidationError[] => {
  return state.forms.get(formId)?.validationErrors ?? [];
};

export const selectSelectedForm = (state: EDCStoreState): FormInstance | null => {
  if (!state.selectedFormId) return null;
  return state.forms.get(state.selectedFormId)?.form ?? null;
};

export const selectFilteredForms = (state: EDCStoreState): FormInstance[] => {
  const { filters } = state;
  
  return Array.from(state.forms.values())
    .filter(fs => {
      const form = fs.form;
      
      if (filters.studyId && form.studyId !== filters.studyId) return false;
      if (filters.siteId && form.siteId !== filters.siteId) return false;
      if (filters.subjectId && form.subjectId !== filters.subjectId) return false;
      if (filters.visitId && form.subjectVisitId !== filters.visitId) return false;
      if (filters.status?.length && !filters.status.includes(form.status)) return false;
      if (filters.sdvStatus?.length && !filters.sdvStatus.includes(form.sdvStatus)) return false;
      if (filters.hasOpenQueries !== undefined) {
        if (filters.hasOpenQueries && form.openQueryCount === 0) return false;
        if (!filters.hasOpenQueries && form.openQueryCount > 0) return false;
      }
      if (filters.definitionId && form.definitionId !== filters.definitionId) return false;
      
      return true;
    })
    .map(fs => fs.form);
};

// ============================================================================
// Hooks
// ============================================================================

export const useFormById = (formId: string) => {
  return useEDCStore(useShallow(state => selectFormById(state, formId)));
};

export const useFormState = (formId: string) => {
  return useEDCStore(useShallow(state => selectFormState(state, formId)));
};

export const useAllForms = () => {
  return useEDCStore(useShallow(selectAllForms));
};

export const useFormsBySubject = (subjectId: string) => {
  return useEDCStore(useShallow(state => selectFormsBySubject(state, subjectId)));
};

export const useFormsByVisit = (visitId: string) => {
  return useEDCStore(useShallow(state => selectFormsByVisit(state, visitId)));
};

export const useFormsWithOpenQueries = () => {
  return useEDCStore(useShallow(selectFormsWithOpenQueries));
};

export const useSelectedForm = () => {
  return useEDCStore(useShallow(selectSelectedForm));
};

export const useFilteredForms = () => {
  return useEDCStore(useShallow(selectFilteredForms));
};

export const useEDCLoading = () => {
  return useEDCStore(useShallow(state => ({
    isLoading: state.isLoading,
    isLoadingForm: state.isLoadingForm,
    isSaving: state.isSaving,
  })));
};

export const useEDCError = () => {
  return useEDCStore(state => state.error);
};

export const useEDCFilters = () => {
  return useEDCStore(state => state.filters);
};

export const useFormValidationErrors = (formId: string) => {
  return useEDCStore(useShallow(state => selectFormValidationErrors(state, formId)));
};
