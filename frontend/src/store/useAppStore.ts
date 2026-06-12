

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Filter state that applies globally across all modules
export interface FilterState {
  product: string      // 'all' or product ID
  therapeuticArea: string  // 'all' or TA slug
  modality: string     // 'all' or modality slug
  region: string       // 'all' or region code
  stage: string        // 'all' or stage slug
}

// Selection state for current context
export interface SelectionState {
  activeModule: string
  selectedProductId: string | null
  selectedHAQId: string | null
  selectedDocumentId: string | null
  selectedSignalId: string | null
  selectedSubmissionId: string | null
  selectedStudyId: string | null
}

// UI state
export interface UIState {
  sidebarCollapsed: boolean
  filterBarVisible: boolean
  aiAssistantOpen: boolean
}

interface AppState {
  // State
  filters: FilterState
  selection: SelectionState
  ui: UIState
  moduleHistory: string[]   // back-stack of module IDs, max 20
  
  // Filter actions
  setFilter: (key: keyof FilterState, value: string) => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  
  // Selection actions
  setActiveModule: (module: string, skipHistory?: boolean) => void
  /** Pop the top of moduleHistory and return it (without navigating — caller handles navigation) */
  popModuleHistory: () => string | null
  /** Peek at the previous module without mutating state */
  getPreviousModule: () => string | null
  selectProduct: (productId: string | null) => void
  selectHAQ: (haqId: string | null) => void
  selectDocument: (documentId: string | null) => void
  selectSignal: (signalId: string | null) => void
  selectSubmission: (submissionId: string | null) => void
  selectStudy: (studyId: string | null) => void
  clearSelections: () => void
  
  // UI actions
  toggleSidebar: () => void
  toggleFilterBar: () => void
  toggleAIAssistant: () => void
}

const defaultFilters: FilterState = {
  product: 'all',
  therapeuticArea: 'all',
  modality: 'all',
  region: 'all',
  stage: 'all',
}

const defaultSelection: SelectionState = {
  activeModule: 'home',
  selectedProductId: null,
  selectedHAQId: null,
  selectedDocumentId: null,
  selectedSignalId: null,
  selectedSubmissionId: null,
  selectedStudyId: null,
}

const defaultUI: UIState = {
  sidebarCollapsed: false,
  filterBarVisible: true,
  aiAssistantOpen: false,
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        filters: defaultFilters,
        selection: defaultSelection,
        ui: defaultUI,
        moduleHistory: [],
        
        // Filter actions
        setFilter: (key, value) =>
          set(
            (state) => ({
              filters: { ...state.filters, [key]: value },
            }),
            false,
            'setFilter'
          ),
          
        setFilters: (filters) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...filters },
            }),
            false,
            'setFilters'
          ),
          
        clearFilters: () =>
          set({ filters: defaultFilters }, false, 'clearFilters'),
        
        // Selection actions
        setActiveModule: (module, skipHistory = false) =>
          set(
            (state) => {
              const current = state.selection.activeModule;
              // Same module — no-op. Return {} so Zustand skips subscriber notification.
              if (current === module) return {};
              // Back navigation: don't push current module onto history again
              const history = skipHistory
                ? (state.moduleHistory ?? [])
                : [...(state.moduleHistory ?? []), current].slice(-20);
              return {
                selection: { ...state.selection, activeModule: module },
                moduleHistory: history,
              };
            },
            false,
            'setActiveModule'
          ),

        popModuleHistory: () => {
          let popped: string | null = null;
          set(
            (state) => {
              const hist = state.moduleHistory ?? [];
              if (hist.length === 0) return {};
              const next = [...hist];
              popped = next.pop()!;
              return { moduleHistory: next };
            },
            false,
            'popModuleHistory'
          );
          return popped;
        },

        getPreviousModule: () => {
          const hist = get().moduleHistory ?? [];
          return hist.length > 0 ? hist[hist.length - 1] : null;
        },
          
        selectProduct: (productId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedProductId: productId },
              // Also set the product filter when selecting
              filters: productId 
                ? { ...state.filters, product: productId }
                : state.filters,
            }),
            false,
            'selectProduct'
          ),
          
        selectHAQ: (haqId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedHAQId: haqId },
            }),
            false,
            'selectHAQ'
          ),
          
        selectDocument: (documentId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedDocumentId: documentId },
            }),
            false,
            'selectDocument'
          ),
          
        selectSignal: (signalId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedSignalId: signalId },
            }),
            false,
            'selectSignal'
          ),
          
        selectSubmission: (submissionId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedSubmissionId: submissionId },
            }),
            false,
            'selectSubmission'
          ),
          
        selectStudy: (studyId) =>
          set(
            (state) => ({
              selection: { ...state.selection, selectedStudyId: studyId },
            }),
            false,
            'selectStudy'
          ),
          
        clearSelections: () =>
          set(
            (state) => ({
              selection: { ...defaultSelection, activeModule: state.selection.activeModule },
            }),
            false,
            'clearSelections'
          ),
        
        // UI actions
        toggleSidebar: () =>
          set(
            (state) => ({
              ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
            }),
            false,
            'toggleSidebar'
          ),
          
        toggleFilterBar: () =>
          set(
            (state) => ({
              ui: { ...state.ui, filterBarVisible: !state.ui.filterBarVisible },
            }),
            false,
            'toggleFilterBar'
          ),
          
        toggleAIAssistant: () =>
          set(
            (state) => ({
              ui: { ...state.ui, aiAssistantOpen: !state.ui.aiAssistantOpen },
            }),
            false,
            'toggleAIAssistant'
          ),
      }),
      {
        name: 'ligature-app-storage',
        partialize: (state) => ({
          // Only persist UI preferences, not selections
          ui: state.ui,
        }),
      }
    ),
    { name: 'LigatureApp' }
  )
)

// Selector hooks for common patterns
// v204d-b4 fix: Use shallow comparison to prevent infinite loops when returning objects
import { useShallow } from 'zustand/react/shallow'

export const useFilters = () => useAppStore(useShallow((state) => state.filters))
export const useSelection = () => useAppStore(useShallow((state) => state.selection))
export const useUI = () => useAppStore(useShallow((state) => state.ui))

// Computed selectors
export const useHasActiveFilters = () =>
  useAppStore((state) => 
    state.filters.product !== 'all' ||
    state.filters.therapeuticArea !== 'all' ||
    state.filters.modality !== 'all' ||
    state.filters.region !== 'all' ||
    state.filters.stage !== 'all'
  )

export const useActiveFilterCount = () =>
  useAppStore((state) => {
    let count = 0
    if (state.filters.product !== 'all') count++
    if (state.filters.therapeuticArea !== 'all') count++
    if (state.filters.modality !== 'all') count++
    if (state.filters.region !== 'all') count++
    if (state.filters.stage !== 'all') count++
    return count
  })
