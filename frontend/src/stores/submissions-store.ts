
/**
 * Submissions Store
 * Manages regulatory submissions with API sync
 * 
 * @version 0.33.14
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export type SubmissionType = 'NDA' | 'BLA' | 'MAA' | 'J-NDA' | 'IND' | 'CTA' | 'sNDA' | 'sBLA' | 'Type II Variation';
export type SubmissionStatus = 'Draft' | 'In Progress' | 'QC Review' | 'Ready' | 'Submitted' | 'Under Review' | 'Approved' | 'CRL';
export type Region = 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'Australia' | 'Brazil' | 'UK';
export type QCStatus = 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
export type ECTDStatus = 'Pending' | 'Valid' | 'Invalid';

export interface Submission {
  id: string;
  productId: string;
  productName?: string;
  applicationId?: string;
  applicationNumber?: string;
  sequenceNumber: string;
  type: SubmissionType;
  region: Region;
  agency: string;
  status: SubmissionStatus;
  targetDate: string;
  daysUntilTarget?: number;
  modulesComplete?: number;
  modulesTotal?: number;
  moduleProgress?: Record<string, number>;
  qcStatus: QCStatus;
  ectdStatus: ECTDStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionFilters {
  productId?: string;
  type?: SubmissionType;
  status?: SubmissionStatus;
  region?: Region;
}

interface SubmissionsState {
  submissions: Submission[];
  selectedSubmissionId: string | null;
  selectedMilestoneId: string | null; // For highlighting specific milestone from My Tasks
  isLoading: boolean;
  lastSynced: string | null;
  syncError: string | null;
  dataSource: 'local' | 'api' | 'unknown';

  // Async API actions
  fetchSubmissions: (filters?: SubmissionFilters) => Promise<void>;
  createSubmissionAsync: (submission: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubmissionAsync: (id: string, updates: Partial<Submission>) => Promise<void>;
  deleteSubmissionAsync: (id: string) => Promise<void>;
  updateSubmissionStatus: (id: string, status: SubmissionStatus) => Promise<void>;

  // Local actions
  getSubmission: (id: string) => Submission | undefined;
  selectSubmission: (id: string | null, milestoneId?: string | null) => void;
  getSubmissionsByProduct: (productId: string) => Submission[];
  getSubmissionsByStatus: (status: SubmissionStatus) => Submission[];
  getSubmissionsByRegion: (region: Region) => Submission[];
  getUpcomingSubmissions: (days: number) => Submission[];
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockSubmissions: Submission[] = [
  {
    id: 'sub-001',
    productId: 'lig-2847',
    productName: 'Nexavant',
    applicationNumber: 'NDA 215847',
    sequenceNumber: '0003',
    type: 'NDA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    targetDate: '2025-02-15',
    daysUntilTarget: 18,
    modulesComplete: 5,
    modulesTotal: 5,
    qcStatus: 'Passed',
    ectdStatus: 'Valid',
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  {
    id: 'sub-002',
    productId: 'lig-2847',
    productName: 'Nexavant',
    applicationNumber: 'EMEA/H/C/006123',
    sequenceNumber: '0002',
    type: 'MAA',
    region: 'EU',
    agency: 'EMA',
    status: 'Under Review',
    targetDate: '2025-04-01',
    daysUntilTarget: 63,
    modulesComplete: 4,
    modulesTotal: 5,
    qcStatus: 'Passed',
    ectdStatus: 'Valid',
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },
  {
    id: 'sub-003',
    productId: 'lig-1182',
    productName: 'Oncorix',
    applicationNumber: 'BLA 761234',
    sequenceNumber: '0002',
    type: 'BLA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    targetDate: '2025-04-15',
    daysUntilTarget: 77,
    modulesComplete: 5,
    modulesTotal: 5,
    qcStatus: 'Passed',
    ectdStatus: 'Valid',
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2024-12-12T00:00:00Z',
  },
  {
    id: 'sub-004',
    productId: 'lig-5500',
    productName: 'Spinagen',
    applicationNumber: 'BLA 761567',
    sequenceNumber: '0002',
    type: 'BLA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    targetDate: '2025-03-15',
    daysUntilTarget: 46,
    modulesComplete: 5,
    modulesTotal: 5,
    qcStatus: 'Passed',
    ectdStatus: 'Valid',
    createdAt: '2024-07-15T00:00:00Z',
    updatedAt: '2024-12-08T00:00:00Z',
  },
  {
    id: 'sub-005',
    productId: 'lig-4602',
    productName: 'Migrela',
    applicationNumber: 'NDA 216100',
    sequenceNumber: '0001',
    type: 'NDA',
    region: 'US',
    agency: 'FDA',
    status: 'QC Review',
    targetDate: '2025-06-01',
    daysUntilTarget: 124,
    modulesComplete: 3,
    modulesTotal: 5,
    qcStatus: 'In Progress',
    ectdStatus: 'Pending',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-12-14T00:00:00Z',
  },
];

// =============================================================================
// API RESPONSE MAPPERS
// =============================================================================

const mapApiToSubmission = (api: Record<string, unknown>): Submission => ({
  id: api.id as string,
  productId: api.productId as string,
  productName: api.productName as string | undefined,
  applicationId: api.applicationId as string | undefined,
  applicationNumber: api.applicationNumber as string | undefined,
  sequenceNumber: api.sequenceNumber as string || '0001',
  type: api.type as SubmissionType || 'NDA',
  region: api.region as Region || 'US',
  agency: api.agency as string || 'FDA',
  status: api.status as SubmissionStatus || 'Draft',
  targetDate: api.targetDate as string || new Date().toISOString(),
  daysUntilTarget: api.daysUntilTarget as number | undefined,
  modulesComplete: api.modulesComplete as number | undefined,
  modulesTotal: api.modulesTotal as number | undefined,
  moduleProgress: api.moduleProgress as Record<string, number> | undefined,
  qcStatus: api.qcStatus as QCStatus || 'Not Started',
  ectdStatus: api.ectdStatus as ECTDStatus || 'Pending',
  description: api.description as string | undefined,
  createdAt: api.createdAt as string || new Date().toISOString(),
  updatedAt: api.updatedAt as string || new Date().toISOString(),
});

// =============================================================================
// STORE
// =============================================================================

export const useSubmissionsStore = create<SubmissionsState>()(
  persist(
    (set, get) => ({
      submissions: mockSubmissions,
      selectedSubmissionId: null,
      selectedMilestoneId: null,
      isLoading: false,
      lastSynced: null,
      syncError: null,
      dataSource: 'local',

      // =========================================================================
      // ASYNC API ACTIONS
      // =========================================================================

      fetchSubmissions: async (filters) => {
        set({ isLoading: true, syncError: null });
        try {
          const params = new URLSearchParams();
          if (filters?.productId) params.set('productId', filters.productId);
          if (filters?.type) params.set('type', filters.type);
          if (filters?.status) params.set('status', filters.status);
          if (filters?.region) params.set('region', filters.region);

          const response = await fetch(`/api/submissions?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch submissions');

          const result = await response.json();

          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            const apiSubmissions = result.data.map(mapApiToSubmission);
            set({
              submissions: apiSubmissions,
              dataSource: 'api',
              lastSynced: new Date().toISOString(),
              isLoading: false,
            });
          } else {
            // Keep mock data if API returns empty
            set({
              dataSource: 'local',
              lastSynced: new Date().toISOString(),
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('[SubmissionsStore] Fetch error:', error);
          set({
            syncError: (error as Error).message,
            isLoading: false,
            dataSource: 'local',
          });
        }
      },

      createSubmissionAsync: async (submissionData) => {
        const localId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        // Optimistic update
        const newSubmission: Submission = {
          ...submissionData,
          id: localId,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ submissions: [...s.submissions, newSubmission] }));

        try {
          const response = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
          });

          if (!response.ok) throw new Error('Failed to create submission');

          const result = await response.json();

          if (result.data?.id && result.data.id !== localId) {
            set((s) => ({
              submissions: s.submissions.map((sub) =>
                sub.id === localId ? { ...sub, id: result.data.id } : sub
              ),
            }));
            return result.data.id;
          }

          set({ lastSynced: new Date().toISOString() });
          return localId;
        } catch (error) {
          console.error('[SubmissionsStore] Create error:', error);
          set({ syncError: (error as Error).message });
          return localId;
        }
      },

      updateSubmissionAsync: async (id, updates) => {
        // Optimistic update
        set((s) => ({
          submissions: s.submissions.map((sub) =>
            sub.id === id ? { ...sub, ...updates, updatedAt: new Date().toISOString() } : sub
          ),
        }));

        try {
          const response = await fetch(`/api/submissions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) throw new Error('Failed to update submission');
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[SubmissionsStore] Update error:', error);
          set({ syncError: (error as Error).message });
        }
      },

      deleteSubmissionAsync: async (id) => {
        const removed = get().submissions.find((s) => s.id === id);
        
        // Optimistic update
        set((s) => ({
          submissions: s.submissions.filter((sub) => sub.id !== id),
          selectedSubmissionId: s.selectedSubmissionId === id ? null : s.selectedSubmissionId,
        }));

        try {
          const response = await fetch(`/api/submissions/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            // Rollback
            if (removed) {
              set((s) => ({ submissions: [...s.submissions, removed] }));
            }
            throw new Error('Failed to delete submission');
          }
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[SubmissionsStore] Delete error:', error);
          set({ syncError: (error as Error).message });
        }
      },

      updateSubmissionStatus: async (id, status) => {
        await get().updateSubmissionAsync(id, { status });
      },

      // =========================================================================
      // LOCAL ACTIONS
      // =========================================================================

      getSubmission: (id) => get().submissions.find((s) => s.id === id),

      selectSubmission: (id, milestoneId = null) => set({ 
        selectedSubmissionId: id,
        selectedMilestoneId: milestoneId 
      }),

      getSubmissionsByProduct: (productId) =>
        get().submissions.filter((s) => s.productId === productId),

      getSubmissionsByStatus: (status) =>
        get().submissions.filter((s) => s.status === status),

      getSubmissionsByRegion: (region) =>
        get().submissions.filter((s) => s.region === region),

      getUpcomingSubmissions: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        return get().submissions.filter((s) => {
          const targetDate = new Date(s.targetDate);
          return targetDate <= cutoff && s.status !== 'Approved' && s.status !== 'CRL';
        }).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
      },
    }),
    {
      name: 'ligature-submissions',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// =============================================================================
// HOOKS
// =============================================================================

export const useSubmissions = () => useSubmissionsStore((s) => s.submissions);

export const useSelectedSubmission = () => {
  const submissions = useSubmissionsStore((s) => s.submissions);
  const selectedId = useSubmissionsStore((s) => s.selectedSubmissionId);
  return submissions.find((s) => s.id === selectedId) ?? null;
};

export const useSubmissionSyncState = () => useSubmissionsStore((s) => ({
  isLoading: s.isLoading,
  lastSynced: s.lastSynced,
  syncError: s.syncError,
  dataSource: s.dataSource,
}));

export const useSubmissionActions = () => useSubmissionsStore((s) => ({
  fetchSubmissions: s.fetchSubmissions,
  createSubmissionAsync: s.createSubmissionAsync,
  updateSubmissionAsync: s.updateSubmissionAsync,
  deleteSubmissionAsync: s.deleteSubmissionAsync,
  updateSubmissionStatus: s.updateSubmissionStatus,
  selectSubmission: s.selectSubmission,
}));

// Stats hook
export const useSubmissionStats = () => {
  const submissions = useSubmissionsStore((s) => s.submissions);
  return {
    total: submissions.length,
    byStatus: {
      draft: submissions.filter((s) => s.status === 'Draft').length,
      inProgress: submissions.filter((s) => s.status === 'In Progress').length,
      qcReview: submissions.filter((s) => s.status === 'QC Review').length,
      ready: submissions.filter((s) => s.status === 'Ready').length,
      submitted: submissions.filter((s) => s.status === 'Submitted').length,
      underReview: submissions.filter((s) => s.status === 'Under Review').length,
      approved: submissions.filter((s) => s.status === 'Approved').length,
    },
    byRegion: {
      us: submissions.filter((s) => s.region === 'US').length,
      eu: submissions.filter((s) => s.region === 'EU').length,
      japan: submissions.filter((s) => s.region === 'Japan').length,
    },
  };
};
