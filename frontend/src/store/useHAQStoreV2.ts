

/**
 * HAQ Store v2 - Database-backed with mock fallback
 * 
 * This store:
 * - Fetches data from database via API when available
 * - Falls back to mock data in demo mode
 * - Keeps UI state (filters, sorting) client-side only
 * - Provides loading/error states for async operations
 * 
 * Version: 0.12.8
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo, useEffect } from 'react'
import { haqQuestions } from '@/data/haq-data'
import { haqApi } from '@/lib/haq-api'
import { logger } from '@/lib/logger'
import type { HAQuestion, HAQStatus, HAQPriority, ResponseDraft, DraftComment } from '@/types/haq'

// Stable empty arrays to prevent re-renders
const EMPTY_VERSIONS: ResponseDraft[] = [];
const EMPTY_REVIEWS: ReviewAssignment[] = [];
const EMPTY_HISTORY: HAQHistoryEvent[] = [];
const EMPTY_COMMENTS: DraftComment[] = [];

// =============================================================================
// TYPES
// =============================================================================

export interface HAQDraft {
  haqId: string
  content: string
  lastSaved: Date
  wordCount: number
}

export type ReviewRole = 'sme' | 'lead' | 'qa';
export type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'changes-requested';

export interface ReviewAssignment {
  id: string;
  haqId: string;
  reviewerId: string;
  reviewerName: string;
  role: ReviewRole;
  status: ReviewStatus;
  assignedAt: string;
  completedAt?: string;
  feedback?: string;
}

export interface HAQHistoryEvent {
  id: string;
  haqId: string;
  type: 'created' | 'draft-saved' | 'version-created' | 'status-changed' | 'reviewer-assigned' | 
        'review-completed' | 'comment-added' | 'comment-resolved' | 'ai-generated' | 'submitted';
  actor: string;
  actorName: string;
  timestamp: string;
  details?: Record<string, unknown>;
  source?: string;
}

type DataSource = 'database' | 'mock' | 'unknown';

interface HAQState {
  // Connection status
  dataSource: DataSource
  isLoading: boolean
  error: string | null
  lastFetched: Date | null
  
  // Data
  haqs: HAQuestion[]
  drafts: Record<string, HAQDraft>
  versions: Record<string, ResponseDraft[]>
  reviews: Record<string, ReviewAssignment[]>
  history: Record<string, HAQHistoryEvent[]>
  
  // UI State
  selectedHAQId: string | null
  filterPriority: HAQPriority | 'all'
  filterStatus: HAQStatus | 'all'
  filterProduct: string | 'all'
  searchQuery: string
  sortBy: 'dueDate' | 'priority' | 'status' | 'receivedDate'
  sortDirection: 'asc' | 'desc'
  
  // Init & Refresh
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  
  // Selection
  selectHAQ: (id: string | null) => void
  
  // Filter actions
  setFilterPriority: (priority: HAQPriority | 'all') => void
  setFilterStatus: (status: HAQStatus | 'all') => void
  setFilterProduct: (productId: string | 'all') => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: HAQState['sortBy']) => void
  toggleSortDirection: () => void
  clearFilters: () => void
  
  // HAQ mutations (async with database, sync fallback)
  updateHAQStatus: (haqId: string, status: HAQStatus) => Promise<void>
  updateHAQAssignee: (haqId: string, assigneeId: string, assigneeName: string) => Promise<void>
  
  // Draft management (local + persist to DB)
  saveDraft: (haqId: string, content: string) => void
  getDraft: (haqId: string) => HAQDraft | undefined
  clearDraft: (haqId: string) => void
  
  // Version management
  createVersion: (haqId: string, content: string, aiGenerated?: boolean, versionName?: string) => Promise<ResponseDraft>
  getVersions: (haqId: string) => ResponseDraft[]
  loadVersions: (haqId: string) => Promise<void>
  restoreVersion: (haqId: string, versionId: string) => void
  
  // Comment management (local for now)
  addComment: (haqId: string, versionId: string, comment: Omit<DraftComment, 'id' | 'createdAt' | 'resolved'>) => DraftComment
  resolveComment: (haqId: string, versionId: string, commentId: string) => void
  getComments: (haqId: string, versionId: string) => DraftComment[]
  
  // Review workflow (local for now)
  assignReviewer: (haqId: string, reviewerId: string, reviewerName: string, role: ReviewRole) => ReviewAssignment
  completeReview: (haqId: string, reviewerId: string, status: 'approved' | 'changes-requested', feedback?: string) => void
  getReviews: (haqId: string) => ReviewAssignment[]
  getReviewStatus: (haqId: string) => { sme: ReviewStatus; lead: ReviewStatus; qa: ReviewStatus }
  
  // History
  addHistoryEvent: (haqId: string, event: Omit<HAQHistoryEvent, 'id' | 'timestamp'>) => void
  getHistory: (haqId: string) => HAQHistoryEvent[]
  
  // Computed
  getFilteredHAQs: () => HAQuestion[]
  getSelectedHAQ: () => HAQuestion | undefined
  getHAQsByStatus: (status: HAQStatus) => HAQuestion[]
  getOverdueHAQs: () => HAQuestion[]
}

// =============================================================================
// STORE
// =============================================================================

export const useHAQStore = create<HAQState>()(
  devtools(
    (set, get) => ({
      // Initial state
      dataSource: 'unknown',
      isLoading: false,
      error: null,
      lastFetched: null,
      
      haqs: [],
      drafts: {},
      versions: {},
      reviews: {},
      history: {},
      selectedHAQId: null,
      filterPriority: 'all',
      filterStatus: 'all',
      filterProduct: 'all',
      searchQuery: '',
      sortBy: 'dueDate',
      sortDirection: 'asc',
      
      // =======================================================================
      // INITIALIZE - Try database, fall back to mock
      // =======================================================================
      initialize: async () => {
        const state = get();
        if (state.isLoading) return;
        if (state.haqs.length > 0 && state.dataSource !== 'unknown') return;
        
        set({ isLoading: true, error: null }, false, 'initialize/start');
        
        try {
          // Try to fetch from database
          const response = await haqApi.list({
            sortBy: state.sortBy,
            sortDir: state.sortDirection,
          });
          
          set({
            haqs: response.data,
            dataSource: 'database',
            isLoading: false,
            lastFetched: new Date(),
          }, false, 'initialize/database');
          
          logger.debug('HAQ Store', 'Connected to database');
          
        } catch (error) {
          // Fall back to mock data
          logger.debug('HAQ Store', 'Using mock data (database unavailable)');
          
          set({
            haqs: [...haqQuestions],
            dataSource: 'mock',
            isLoading: false,
            lastFetched: new Date(),
            error: null, // Clear error - mock mode is valid
          }, false, 'initialize/mock');
        }
      },
      
      // =======================================================================
      // REFRESH - Force reload from current source
      // =======================================================================
      refresh: async () => {
        const state = get();
        
        set({ isLoading: true, error: null }, false, 'refresh/start');
        
        if (state.dataSource === 'database') {
          try {
            const response = await haqApi.list({
              sortBy: state.sortBy,
              sortDir: state.sortDirection,
            });
            
            set({
              haqs: response.data,
              isLoading: false,
              lastFetched: new Date(),
            }, false, 'refresh/complete');
            
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to refresh data',
            }, false, 'refresh/error');
          }
        } else {
          // Mock mode - just reset to initial data
          set({
            haqs: [...haqQuestions],
            isLoading: false,
            lastFetched: new Date(),
          }, false, 'refresh/mock');
        }
      },
      
      // Selection
      selectHAQ: (id) =>
        set({ selectedHAQId: id }, false, 'selectHAQ'),
      
      // Filter actions
      setFilterPriority: (priority) =>
        set({ filterPriority: priority }, false, 'setFilterPriority'),
        
      setFilterStatus: (status) =>
        set({ filterStatus: status }, false, 'setFilterStatus'),
        
      setFilterProduct: (productId) =>
        set({ filterProduct: productId }, false, 'setFilterProduct'),
        
      setSearchQuery: (query) =>
        set({ searchQuery: query }, false, 'setSearchQuery'),
        
      setSortBy: (sortBy) =>
        set({ sortBy }, false, 'setSortBy'),
        
      toggleSortDirection: () =>
        set(
          (state) => ({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' }),
          false,
          'toggleSortDirection'
        ),
        
      clearFilters: () =>
        set({
          filterPriority: 'all',
          filterStatus: 'all',
          filterProduct: 'all',
          searchQuery: '',
        }, false, 'clearFilters'),
      
      // =======================================================================
      // HAQ MUTATIONS
      // =======================================================================
      
      updateHAQStatus: async (haqId, status) => {
        const state = get();
        const haq = state.haqs.find(h => h.id === haqId);
        const prevStatus: HAQStatus = haq?.status || 'new'; // Default to 'new' if not found
        
        // Optimistic update
        set({
          haqs: state.haqs.map((h) =>
            h.id === haqId
              ? { ...h, status, updatedAt: new Date().toISOString() }
              : h
          ),
        }, false, 'updateHAQStatus/optimistic');
        
        // Persist to database if connected
        if (state.dataSource === 'database') {
          try {
            await haqApi.update(haqId, { status });
          } catch (error) {
            // Revert on error
            set({
              haqs: state.haqs.map((h) =>
                h.id === haqId
                  ? { ...h, status: prevStatus }
                  : h
              ),
              error: 'Failed to update status',
            }, false, 'updateHAQStatus/revert');
            throw error;
          }
        }
        
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: 'status-changed',
          actor: 'current-user',
          actorName: 'Current User',
          details: { newStatus: status, prevStatus },
        });
      },
        
      updateHAQAssignee: async (haqId, assigneeId, assigneeName) => {
        const state = get();
        
        // Optimistic update
        set({
          haqs: state.haqs.map((haq) =>
            haq.id === haqId
              ? { 
                  ...haq, 
                  assignedTo: assigneeId, 
                  assignedToName: assigneeName,
                  updatedAt: new Date().toISOString()
                }
              : haq
          ),
        }, false, 'updateHAQAssignee/optimistic');
        
        // Persist to database if connected
        if (state.dataSource === 'database') {
          try {
            await haqApi.update(haqId, { assignedTo: assigneeId });
          } catch (error) {
            logger.error('HAQ Store', 'Failed to update assignee', error);
            // Could revert here
          }
        }
      },
      
      // =======================================================================
      // DRAFT MANAGEMENT (Local autosave)
      // =======================================================================
      
      saveDraft: (haqId, content) =>
        set(
          (state) => ({
            drafts: {
              ...state.drafts,
              [haqId]: {
                haqId,
                content,
                lastSaved: new Date(),
                wordCount: content.split(/\s+/).filter(Boolean).length,
              },
            },
          }),
          false,
          'saveDraft'
        ),
        
      getDraft: (haqId) => get().drafts[haqId],
      
      clearDraft: (haqId) =>
        set(
          (state) => {
            const { [haqId]: _, ...rest } = state.drafts
            return { drafts: rest }
          },
          false,
          'clearDraft'
        ),
      
      // =======================================================================
      // VERSION MANAGEMENT
      // =======================================================================
      
      createVersion: async (haqId, content, aiGenerated = false, _versionName) => {
        const state = get()
        const existingVersions = state.versions[haqId] || []
        const nextVersion = existingVersions.length + 1
        
        const newDraft: ResponseDraft = {
          id: `draft-${haqId}-${nextVersion}-${Date.now()}`,
          version: nextVersion,
          content,
          author: 'current-user',
          authorName: 'Current User',
          createdAt: new Date().toISOString(),
          aiGenerated,
        }
        
        // Local update
        set({
          versions: {
            ...state.versions,
            [haqId]: [newDraft, ...existingVersions],
          },
        }, false, 'createVersion/local');
        
        // Persist to database if connected
        if (state.dataSource === 'database') {
          try {
            const response = await haqApi.createDraft(haqId, {
              content,
              aiGenerated,
              author: 'current-user',
            });
            
            // Update with server response
            set({
              versions: {
                ...get().versions,
                [haqId]: [response.data, ...existingVersions],
              },
            }, false, 'createVersion/synced');
            
            return response.data;
          } catch (error) {
            logger.error('HAQ Store', 'Failed to persist version', error);
            // Keep local version
          }
        }
        
        // Add history
        get().addHistoryEvent(haqId, {
          haqId,
          type: aiGenerated ? 'ai-generated' : 'version-created',
          actor: 'current-user',
          actorName: 'Current User',
          details: { version: nextVersion, wordCount: content.split(/\s+/).length },
        });
        
        return newDraft;
      },
      
      getVersions: (haqId) => get().versions[haqId] ?? EMPTY_VERSIONS,
      
      loadVersions: async (haqId) => {
        const state = get();
        if (state.dataSource !== 'database') return;
        
        try {
          const response = await haqApi.listDrafts(haqId);
          set({
            versions: {
              ...state.versions,
              [haqId]: response.data,
            },
          }, false, 'loadVersions');
        } catch (error) {
          logger.error('HAQ Store', 'Failed to load versions', error);
        }
      },
      
      restoreVersion: (haqId, versionId) => {
        const state = get()
        const versions = state.versions[haqId] || []
        const version = versions.find(v => v.id === versionId)
        
        if (version) {
          state.saveDraft(haqId, version.content)
          
          state.addHistoryEvent(haqId, {
            haqId,
            type: 'version-created',
            actor: 'current-user',
            actorName: 'Current User',
            details: { restoredFrom: version.version },
          })
        }
      },
      
      // =======================================================================
      // COMMENT MANAGEMENT (Local for now)
      // =======================================================================
      
      addComment: (haqId, versionId, commentData) => {
        const state = get()
        const versions = state.versions[haqId] || []
        
        const newComment: DraftComment = {
          id: `comment-${Date.now()}`,
          ...commentData,
          createdAt: new Date().toISOString(),
          resolved: false,
        }
        
        const updatedVersions = versions.map(v => {
          if (v.id === versionId) {
            return {
              ...v,
              comments: [...(v.comments || []), newComment],
            }
          }
          return v
        })
        
        set({
          versions: {
            ...state.versions,
            [haqId]: updatedVersions,
          },
        }, false, 'addComment')
        
        state.addHistoryEvent(haqId, {
          haqId,
          type: 'comment-added',
          actor: commentData.author,
          actorName: commentData.authorName,
          details: { versionId },
        })
        
        return newComment
      },
      
      resolveComment: (haqId, versionId, commentId) => {
        const state = get()
        const versions = state.versions[haqId] || []
        
        const updatedVersions = versions.map(v => {
          if (v.id === versionId && v.comments) {
            return {
              ...v,
              comments: v.comments.map(c =>
                c.id === commentId ? { ...c, resolved: true } : c
              ),
            }
          }
          return v
        })
        
        set({
          versions: {
            ...state.versions,
            [haqId]: updatedVersions,
          },
        }, false, 'resolveComment')
        
        state.addHistoryEvent(haqId, {
          haqId,
          type: 'comment-resolved',
          actor: 'current-user',
          actorName: 'Current User',
          details: { versionId, commentId },
        })
      },
      
      getComments: (haqId, versionId) => {
        const versions = get().versions[haqId] || []
        const version = versions.find(v => v.id === versionId)
        return version?.comments ?? EMPTY_COMMENTS
      },
      
      // =======================================================================
      // REVIEW WORKFLOW (Local for now)
      // =======================================================================
      
      assignReviewer: (haqId, reviewerId, reviewerName, role) => {
        const state = get()
        const reviews = state.reviews[haqId] || []
        
        // Check if already assigned
        const existing = reviews.find(r => r.reviewerId === reviewerId && r.role === role)
        if (existing) return existing
        
        const newAssignment: ReviewAssignment = {
          id: `review-${Date.now()}`,
          haqId,
          reviewerId,
          reviewerName,
          role,
          status: 'pending',
          assignedAt: new Date().toISOString(),
        }
        
        set({
          reviews: {
            ...state.reviews,
            [haqId]: [...reviews, newAssignment],
          },
        }, false, 'assignReviewer')
        
        state.addHistoryEvent(haqId, {
          haqId,
          type: 'reviewer-assigned',
          actor: 'current-user',
          actorName: 'Current User',
          details: { reviewerId, reviewerName, role },
        })
        
        return newAssignment
      },
      
      completeReview: (haqId, reviewerId, status, feedback) => {
        const state = get()
        const reviews = state.reviews[haqId] || []
        
        set({
          reviews: {
            ...state.reviews,
            [haqId]: reviews.map(r =>
              r.reviewerId === reviewerId
                ? {
                    ...r,
                    status,
                    completedAt: new Date().toISOString(),
                    feedback,
                  }
                : r
            ),
          },
        }, false, 'completeReview')
        
        state.addHistoryEvent(haqId, {
          haqId,
          type: 'review-completed',
          actor: reviewerId,
          actorName: reviews.find(r => r.reviewerId === reviewerId)?.reviewerName || 'Reviewer',
          details: { status, feedback },
        })
        
        // Check if all reviews approved
        const updatedReviews = get().reviews[haqId] || []
        const allApproved = updatedReviews.length >= 3 && 
          updatedReviews.every(r => r.status === 'approved')
        
        if (allApproved) {
          get().updateHAQStatus(haqId, 'draft-ready')
        }
      },
      
      getReviews: (haqId) => get().reviews[haqId] ?? EMPTY_REVIEWS,
      
      getReviewStatus: (haqId) => {
        const reviews = get().reviews[haqId] || []
        const getStatus = (role: ReviewRole): ReviewStatus => {
          const review = reviews.find(r => r.role === role)
          return review?.status || 'pending'
        }
        return {
          sme: getStatus('sme'),
          lead: getStatus('lead'),
          qa: getStatus('qa'),
        }
      },
      
      // =======================================================================
      // HISTORY
      // =======================================================================
      
      addHistoryEvent: (haqId, eventData) => {
        const state = get()
        const existingHistory = state.history[haqId] || []
        const newEvent: HAQHistoryEvent = {
          id: `event-${Date.now()}`,
          ...eventData,
          timestamp: new Date().toISOString(),
        }
        
        set({
          history: {
            ...state.history,
            [haqId]: [...existingHistory, newEvent],
          },
        }, false, 'addHistoryEvent')
      },
      
      getHistory: (haqId) => get().history[haqId] ?? EMPTY_HISTORY,
      
      // =======================================================================
      // COMPUTED
      // =======================================================================
      
      getFilteredHAQs: () => {
        const state = get()
        let filtered = [...state.haqs]
        
        // Apply filters
        if (state.filterPriority !== 'all') {
          filtered = filtered.filter((h) => h.priority === state.filterPriority)
        }
        if (state.filterStatus !== 'all') {
          filtered = filtered.filter((h) => h.status === state.filterStatus)
        }
        if (state.filterProduct !== 'all') {
          filtered = filtered.filter((h) => h.productId === state.filterProduct)
        }
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          filtered = filtered.filter(
            (h) =>
              h.questionText.toLowerCase().includes(query) ||
              h.questionNumber.toLowerCase().includes(query) ||
              h.discipline.toLowerCase().includes(query) ||
              h.tags?.some((t) => t.toLowerCase().includes(query))
          )
        }
        
        // Apply sort
        filtered.sort((a, b) => {
          let comparison = 0
          switch (state.sortBy) {
            case 'dueDate':
              comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              break
            case 'priority': {
              const priorityOrder = { critical: 0, major: 1, minor: 2, clarification: 3 }
              comparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
              break
            }
            case 'status': {
              const statusOrder = { new: 0, 'in-progress': 1, 'draft-ready': 2, 'under-review': 3, submitted: 4, closed: 5 }
              comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - (statusOrder[b.status as keyof typeof statusOrder] ?? 99)
              break
            }
            case 'receivedDate':
              comparison = new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
              break
          }
          return state.sortDirection === 'asc' ? comparison : -comparison
        })
        
        return filtered
      },
      
      getSelectedHAQ: () => {
        const state = get()
        return state.haqs.find((h) => h.id === state.selectedHAQId)
      },
      
      getHAQsByStatus: (status) => {
        return get().haqs.filter((h) => h.status === status)
      },
      
      getOverdueHAQs: () => {
        const today = new Date()
        return get().haqs.filter((h) => {
          if (h.status === 'closed' || h.status === 'submitted') return false
          return new Date(h.dueDate) < today
        })
      },
    }),
    { name: 'HAQStore' }
  )
)

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Initialize HAQ store on mount
 * Use this in a top-level component or layout
 */
export const useHAQStoreInit = () => {
  const initialize = useHAQStore((state) => state.initialize)
  const dataSource = useHAQStore((state) => state.dataSource)
  
  useEffect(() => {
    initialize()
  }, [initialize])
  
  return { dataSource }
}

/**
 * Get currently selected HAQ with memoization
 */
export const useSelectedHAQ = () => {
  const haqs = useHAQStore((state) => state.haqs)
  const selectedHAQId = useHAQStore((state) => state.selectedHAQId)
  return useMemo(
    () => haqs.find((h) => h.id === selectedHAQId),
    [haqs, selectedHAQId]
  )
}

/**
 * Get filtered HAQs with memoization
 */
export const useFilteredHAQs = () => {
  const haqs = useHAQStore((state) => state.haqs)
  const filterPriority = useHAQStore((state) => state.filterPriority)
  const filterStatus = useHAQStore((state) => state.filterStatus)
  const filterProduct = useHAQStore((state) => state.filterProduct)
  const searchQuery = useHAQStore((state) => state.searchQuery)
  const sortBy = useHAQStore((state) => state.sortBy)
  const sortDirection = useHAQStore((state) => state.sortDirection)
  
  return useMemo(() => {
    let filtered = [...haqs]
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter((h) => h.priority === filterPriority)
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((h) => h.status === filterStatus)
    }
    if (filterProduct !== 'all') {
      filtered = filtered.filter((h) => h.productId === filterProduct)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (h) =>
          h.questionText.toLowerCase().includes(query) ||
          h.questionNumber.toLowerCase().includes(query) ||
          h.discipline.toLowerCase().includes(query) ||
          h.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }
    
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case 'priority': {
          const priorityOrder = { critical: 0, major: 1, minor: 2, clarification: 3 }
          comparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
          break
        }
        case 'status': {
          const statusOrder = { new: 0, 'in-progress': 1, 'draft-ready': 2, 'under-review': 3, submitted: 4, closed: 5 }
          comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - (statusOrder[b.status as keyof typeof statusOrder] ?? 99)
          break
        }
        case 'receivedDate':
          comparison = new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [haqs, filterPriority, filterStatus, filterProduct, searchQuery, sortBy, sortDirection])
}

/**
 * Get overdue HAQs with memoization
 */
export const useOverdueHAQs = () => {
  const haqs = useHAQStore((state) => state.haqs)
  return useMemo(() => {
    const today = new Date()
    return haqs.filter((h) => {
      if (h.status === 'closed' || h.status === 'submitted') return false
      return new Date(h.dueDate) < today
    })
  }, [haqs])
}

/**
 * Get data source indicator for UI
 */
export const useDataSourceIndicator = () => {
  const dataSource = useHAQStore((state) => state.dataSource)
  const isLoading = useHAQStore((state) => state.isLoading)
  const error = useHAQStore((state) => state.error)
  
  return {
    dataSource,
    isLoading,
    error,
    isDatabase: dataSource === 'database',
    isMock: dataSource === 'mock',
    label: dataSource === 'database' ? '● Live' : dataSource === 'mock' ? '○ Demo' : '...',
  }
}
