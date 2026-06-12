

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { useDocumentStore } from '@/stores/document-store';
import { useSafetyStore } from '@/stores/safety-store';
import { type LigatureDataExport, exportAllData, validateDataIntegrity } from '@/stores/store-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  dataVersion: string;
  recordCounts: {
    programs: number;
    applications: number;
    sequences: number;
    milestones: number;
    documents: number;
    cases: number;
    signals: number;
    reports: number;
  };
  data: LigatureDataExport;
}

export interface DemoPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'investor' | 'training' | 'testing' | 'custom';
  snapshot: Snapshot;
}

export interface ImportResult {
  success: boolean;
  message: string;
  recordsImported?: {
    programs: number;
    applications: number;
    sequences: number;
    milestones: number;
    documents: number;
    cases: number;
    signals: number;
    reports: number;
  };
  warnings?: string[];
  errors?: string[];
}

export interface SnapshotState {
  // State
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  lastRestoreAt: string | null;
  autoSaveEnabled: boolean;
  
  // Actions
  createSnapshot: (name: string, description?: string) => string;
  deleteSnapshot: (id: string) => void;
  restoreSnapshot: (id: string) => boolean;
  renameSnapshot: (id: string, name: string, description?: string) => void;
  
  // Import/Export
  importData: (data: LigatureDataExport, mode: 'replace' | 'merge') => ImportResult;
  importFromFile: (file: File) => Promise<ImportResult>;
  exportSnapshot: (id: string) => LigatureDataExport | null;
  
  // Presets
  loadPreset: (presetId: string) => boolean;
  
  // Settings
  setAutoSave: (enabled: boolean) => void;
  
  // Utilities
  getSnapshot: (id: string) => Snapshot | undefined;
  getRecordCounts: () => Snapshot['recordCounts'];
}

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () => `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const timestamp = () => new Date().toISOString();

const getRecordCounts = (): Snapshot['recordCounts'] => {
  const portfolioState = usePortfolioStore.getState();
  const documentState = useDocumentStore.getState();
  const safetyState = useSafetyStore.getState();
  
  return {
    programs: portfolioState.programs.length,
    applications: portfolioState.applications.length,
    sequences: portfolioState.sequences.length,
    milestones: portfolioState.milestones.length,
    documents: documentState.documents.length,
    cases: safetyState.cases.length,
    signals: safetyState.signals.length,
    reports: safetyState.reports.length,
  };
};

// ============================================================================
// DEMO PRESETS
// ============================================================================

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'preset-investor-demo',
    name: 'Investor Demo',
    description: 'Clean demo data optimized for investor presentations. Shows 3 programs across development stages with active submissions.',
    icon: '💼',
    category: 'investor',
    snapshot: {
      id: 'preset-investor-demo-snap',
      name: 'Investor Demo Baseline',
      description: 'Default investor presentation data',
      createdAt: '2024-12-26T00:00:00Z',
      dataVersion: '1.0',
      recordCounts: { programs: 3, applications: 6, sequences: 12, milestones: 8, documents: 15, cases: 5, signals: 2, reports: 3 },
      data: {
        version: '1.0',
        exportedAt: '2024-12-26T00:00:00Z',
        portfolio: { programs: [], applications: [], sequences: [], milestones: [] },
        documents: [],
        safety: { cases: [], signals: [], reports: [] },
      },
    },
  },
  {
    id: 'preset-full-demo',
    name: 'Full Platform Demo',
    description: 'Comprehensive demo showing all platform capabilities across Research, Clinical, Safety, and Commercial modules.',
    icon: '🏢',
    category: 'investor',
    snapshot: {
      id: 'preset-full-demo-snap',
      name: 'Full Platform Baseline',
      description: 'Complete platform demonstration data',
      createdAt: '2024-12-26T00:00:00Z',
      dataVersion: '1.0',
      recordCounts: { programs: 5, applications: 12, sequences: 24, milestones: 15, documents: 40, cases: 12, signals: 4, reports: 6 },
      data: {
        version: '1.0',
        exportedAt: '2024-12-26T00:00:00Z',
        portfolio: { programs: [], applications: [], sequences: [], milestones: [] },
        documents: [],
        safety: { cases: [], signals: [], reports: [] },
      },
    },
  },
  {
    id: 'preset-training',
    name: 'Training Sandbox',
    description: 'Simplified dataset for user training. Contains example workflows with clear documentation.',
    icon: '📚',
    category: 'training',
    snapshot: {
      id: 'preset-training-snap',
      name: 'Training Baseline',
      description: 'Training environment data',
      createdAt: '2024-12-26T00:00:00Z',
      dataVersion: '1.0',
      recordCounts: { programs: 2, applications: 4, sequences: 8, milestones: 6, documents: 10, cases: 3, signals: 1, reports: 2 },
      data: {
        version: '1.0',
        exportedAt: '2024-12-26T00:00:00Z',
        portfolio: { programs: [], applications: [], sequences: [], milestones: [] },
        documents: [],
        safety: { cases: [], signals: [], reports: [] },
      },
    },
  },
  {
    id: 'preset-empty',
    name: 'Fresh Start',
    description: 'Empty database. Start from scratch to build your own demo scenario.',
    icon: '✨',
    category: 'testing',
    snapshot: {
      id: 'preset-empty-snap',
      name: 'Empty Database',
      description: 'Clean slate',
      createdAt: '2024-12-26T00:00:00Z',
      dataVersion: '1.0',
      recordCounts: { programs: 0, applications: 0, sequences: 0, milestones: 0, documents: 0, cases: 0, signals: 0, reports: 0 },
      data: {
        version: '1.0',
        exportedAt: '2024-12-26T00:00:00Z',
        portfolio: { programs: [], applications: [], sequences: [], milestones: [] },
        documents: [],
        safety: { cases: [], signals: [], reports: [] },
      },
    },
  },
];

// ============================================================================
// STORE
// ============================================================================

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      // Initial state
      snapshots: [],
      activeSnapshotId: null,
      lastRestoreAt: null,
      autoSaveEnabled: false,

      // Create a snapshot of current data
      createSnapshot: (name, description) => {
        const id = generateId();
        const now = timestamp();
        const data = exportAllData();
        const counts = getRecordCounts();

        const snapshot: Snapshot = {
          id,
          name,
          description,
          createdAt: now,
          dataVersion: data.version,
          recordCounts: counts,
          data,
        };

        set((state) => ({
          snapshots: [...state.snapshots, snapshot],
          activeSnapshotId: id,
        }));

        return id;
      },

      // Delete a snapshot
      deleteSnapshot: (id) => {
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
          activeSnapshotId: state.activeSnapshotId === id ? null : state.activeSnapshotId,
        }));
      },

      // Restore from a snapshot
      restoreSnapshot: (id) => {
        const snapshot = get().snapshots.find((s) => s.id === id);
        if (!snapshot) return false;

        try {
          const data = snapshot.data as any;
          
          // Restore portfolio data
          usePortfolioStore.setState({
            programs: data.portfolio.programs,
            applications: data.portfolio.applications,
            sequences: data.portfolio.sequences,
            milestones: data.portfolio.milestones,
            selectedProgramId: null,
            selectedApplicationId: null,
          });

          // Restore documents
          useDocumentStore.setState({
            documents: data.documents,
            selectedDocumentId: null,
          });

          // Restore safety data
          useSafetyStore.setState({
            cases: data.safety.cases,
            signals: data.safety.signals,
            reports: data.safety.reports,
            selectedCaseId: null,
            selectedSignalId: null,
          });

          set({
            activeSnapshotId: id,
            lastRestoreAt: timestamp(),
          });

          return true;
        } catch (error) {
          console.error('Failed to restore snapshot:', error);
          return false;
        }
      },

      // Rename a snapshot
      renameSnapshot: (id, name, description) => {
        set((state) => ({
          snapshots: state.snapshots.map((s) =>
            s.id === id ? { ...s, name, description: description ?? s.description } : s
          ),
        }));
      },

      // Import data from LigatureDataExport
      importData: (exportData, mode) => {
        const data = exportData as any;
        const result: ImportResult = {
          success: false,
          message: '',
          recordsImported: { programs: 0, applications: 0, sequences: 0, milestones: 0, documents: 0, cases: 0, signals: 0, reports: 0 },
          warnings: [],
          errors: [],
        };

        try {
          // Validate structure
          if (!data.version || !data.portfolio || !data.documents || !data.safety) {
            result.errors?.push('Invalid data structure: missing required fields');
            result.message = 'Import failed: invalid data structure';
            return result;
          }

          if (mode === 'replace') {
            // Full replacement
            usePortfolioStore.setState({
              programs: data.portfolio.programs || [],
              applications: data.portfolio.applications || [],
              sequences: data.portfolio.sequences || [],
              milestones: data.portfolio.milestones || [],
              selectedProgramId: null,
              selectedApplicationId: null,
            });

            useDocumentStore.setState({
              documents: data.documents || [],
              selectedDocumentId: null,
            });

            useSafetyStore.setState({
              cases: data.safety.cases || [],
              signals: data.safety.signals || [],
              reports: data.safety.reports || [],
              selectedCaseId: null,
              selectedSignalId: null,
            });

            result.recordsImported = {
              programs: data.portfolio.programs?.length || 0,
              applications: data.portfolio.applications?.length || 0,
              sequences: data.portfolio.sequences?.length || 0,
              milestones: data.portfolio.milestones?.length || 0,
              documents: data.documents?.length || 0,
              cases: data.safety.cases?.length || 0,
              signals: data.safety.signals?.length || 0,
              reports: data.safety.reports?.length || 0,
            };
          } else {
            // Merge mode - add to existing
            const portfolioState = usePortfolioStore.getState();
            const documentState = useDocumentStore.getState();
            const safetyState = useSafetyStore.getState();

            // Get existing IDs to avoid duplicates
            const existingProgramIds = new Set(portfolioState.programs.map((p) => p.id));
            const existingAppIds = new Set(portfolioState.applications.map((a) => a.id));
            const existingSeqIds = new Set(portfolioState.sequences.map((s) => s.id));
            const existingMilestoneIds = new Set(portfolioState.milestones.map((m) => m.id));
            const existingDocIds = new Set(documentState.documents.map((d) => d.id));
            const existingCaseIds = new Set(safetyState.cases.map((c) => c.id));
            const existingSignalIds = new Set(safetyState.signals.map((s) => s.id));
            const existingReportIds = new Set(safetyState.reports.map((r) => r.id));

            // Filter new items
            const newPrograms = (data.portfolio.programs || []).filter((p) => !existingProgramIds.has(p.id));
            const newApps = (data.portfolio.applications || []).filter((a) => !existingAppIds.has(a.id));
            const newSeqs = (data.portfolio.sequences || []).filter((s) => !existingSeqIds.has(s.id));
            const newMilestones = (data.portfolio.milestones || []).filter((m) => !existingMilestoneIds.has(m.id));
            const newDocs = (data.documents || []).filter((d) => !existingDocIds.has(d.id));
            const newCases = (data.safety.cases || []).filter((c) => !existingCaseIds.has(c.id));
            const newSignals = (data.safety.signals || []).filter((s) => !existingSignalIds.has(s.id));
            const newReports = (data.safety.reports || []).filter((r) => !existingReportIds.has(r.id));

            // Track skipped duplicates
            const skippedCount = 
              (data.portfolio.programs?.length || 0) - newPrograms.length +
              (data.portfolio.applications?.length || 0) - newApps.length +
              (data.portfolio.sequences?.length || 0) - newSeqs.length +
              (data.portfolio.milestones?.length || 0) - newMilestones.length +
              (data.documents?.length || 0) - newDocs.length +
              (data.safety.cases?.length || 0) - newCases.length +
              (data.safety.signals?.length || 0) - newSignals.length +
              (data.safety.reports?.length || 0) - newReports.length;

            if (skippedCount > 0) {
              result.warnings?.push(`${skippedCount} duplicate records skipped`);
            }

            // Merge data
            usePortfolioStore.setState({
              programs: [...portfolioState.programs, ...newPrograms],
              applications: [...portfolioState.applications, ...newApps],
              sequences: [...portfolioState.sequences, ...newSeqs],
              milestones: [...portfolioState.milestones, ...newMilestones],
            });

            useDocumentStore.setState({
              documents: [...documentState.documents, ...newDocs],
            });

            useSafetyStore.setState({
              cases: [...safetyState.cases, ...newCases],
              signals: [...safetyState.signals, ...newSignals],
              reports: [...safetyState.reports, ...newReports],
            });

            result.recordsImported = {
              programs: newPrograms.length,
              applications: newApps.length,
              sequences: newSeqs.length,
              milestones: newMilestones.length,
              documents: newDocs.length,
              cases: newCases.length,
              signals: newSignals.length,
              reports: newReports.length,
            };
          }

          // Validate after import
          const validation = validateDataIntegrity();
          if (!validation.valid) {
            result.warnings = [...(result.warnings || []), ...validation.issues];
          }

          result.success = true;
          const totalImported = Object.values(result.recordsImported!).reduce((a, b) => a + b, 0);
          result.message = `Successfully imported ${totalImported} records`;

          set({ lastRestoreAt: timestamp() });

          return result;
        } catch (error) {
          result.errors?.push(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.message = 'Import failed due to an error';
          return result;
        }
      },

      // Import from file
      importFromFile: async (file) => {
        const result: ImportResult = {
          success: false,
          message: '',
          errors: [],
        };

        try {
          const text = await file.text();
          const data = JSON.parse(text) as LigatureDataExport;
          return get().importData(data, 'replace');
        } catch (error) {
          result.errors?.push(`File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.message = 'Failed to parse import file';
          return result;
        }
      },

      // Export a specific snapshot
      exportSnapshot: (id) => {
        const snapshot = get().snapshots.find((s) => s.id === id);
        return snapshot?.data ?? null;
      },

      // Load a demo preset
      loadPreset: (presetId) => {
        const preset = DEMO_PRESETS.find((p) => p.id === presetId);
        if (!preset) return false;

        // For presets with empty data, use the preset's snapshot
        // For presets pointing to "default", use resetToDefaults
        if (presetId === 'preset-empty') {
          usePortfolioStore.getState().clearAll();
          useDocumentStore.getState().clearAll();
          useSafetyStore.getState().clearAll();
          set({ lastRestoreAt: timestamp() });
          return true;
        }

        if (presetId === 'preset-investor-demo' || presetId === 'preset-full-demo' || presetId === 'preset-training') {
          // These use the default data
          usePortfolioStore.getState().resetToDefaults();
          useDocumentStore.getState().clearAll();
          useSafetyStore.getState().clearAll();
          set({ lastRestoreAt: timestamp() });
          return true;
        }

        return false;
      },

      // Settings
      setAutoSave: (enabled) => {
        set({ autoSaveEnabled: enabled });
      },

      // Utilities
      getSnapshot: (id) => get().snapshots.find((s) => s.id === id),
      getRecordCounts,
    }),
    {
      name: 'ligature-snapshots',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        snapshots: state.snapshots,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

export const useSnapshots = () => useSnapshotStore((s) => s.snapshots);
export const useActiveSnapshot = () => useSnapshotStore((s) => {
  const { snapshots, activeSnapshotId } = s;
  return snapshots.find((snap) => snap.id === activeSnapshotId) ?? null;
});
export const useLastRestore = () => useSnapshotStore((s) => s.lastRestoreAt);
