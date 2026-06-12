

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import { haqQuestions } from '@/data/haq-data'
import type { HAQuestion, HAQStatus, HAQPriority, ResponseDraft, DraftComment } from '@/types/haq'
import { useCrossModuleStore } from './useCrossModuleStore'

// Stable empty arrays to prevent re-renders when data doesn't exist
const EMPTY_VERSIONS: ResponseDraft[] = [];
const EMPTY_REVIEWS: ReviewAssignment[] = [];
const EMPTY_HISTORY: HAQHistoryEvent[] = [];
const EMPTY_COMMENTS: DraftComment[] = [];

export interface HAQDraft {
  haqId: string
  content: string
  lastSaved: Date
  wordCount: number
}

// v113: Review workflow types
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

interface HAQState {
  // Data (initialized from mock, but mutable)
  haqs: HAQuestion[]
  drafts: Record<string, HAQDraft>
  
  // v113: Version history & review workflow
  versions: Record<string, ResponseDraft[]>  // haqId → version list
  reviews: Record<string, ReviewAssignment[]>  // haqId → review assignments
  history: Record<string, HAQHistoryEvent[]>  // haqId → event history
  
  // UI State
  selectedHAQId: string | null
  filterPriority: HAQPriority | 'all'
  filterStatus: HAQStatus | 'all'
  filterProduct: string | 'all'
  searchQuery: string
  sortBy: 'dueDate' | 'priority' | 'status' | 'receivedDate'
  sortDirection: 'asc' | 'desc'
  
  // Actions
  selectHAQ: (id: string | null) => void
  
  // Filter actions
  setFilterPriority: (priority: HAQPriority | 'all') => void
  setFilterStatus: (status: HAQStatus | 'all') => void
  setFilterProduct: (productId: string | 'all') => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: HAQState['sortBy']) => void
  toggleSortDirection: () => void
  clearFilters: () => void
  
  // HAQ mutations
  updateHAQStatus: (haqId: string, status: HAQStatus) => void
  updateHAQAssignee: (haqId: string, assigneeId: string, assigneeName: string) => void
  
  // Draft management
  saveDraft: (haqId: string, content: string) => void
  getDraft: (haqId: string) => HAQDraft | undefined
  clearDraft: (haqId: string) => void
  
  // v113: Version management
  createVersion: (haqId: string, content: string, aiGenerated?: boolean, versionName?: string) => ResponseDraft
  getVersions: (haqId: string) => ResponseDraft[]
  restoreVersion: (haqId: string, versionId: string) => void
  
  // v113: Comment management
  addComment: (haqId: string, versionId: string, comment: Omit<DraftComment, 'id' | 'createdAt' | 'resolved'>) => DraftComment
  resolveComment: (haqId: string, versionId: string, commentId: string) => void
  getComments: (haqId: string, versionId: string) => DraftComment[]
  
  // v113: Review workflow
  assignReviewer: (haqId: string, reviewerId: string, reviewerName: string, role: ReviewRole) => ReviewAssignment
  completeReview: (haqId: string, reviewerId: string, status: 'approved' | 'changes-requested', feedback?: string) => void
  getReviews: (haqId: string) => ReviewAssignment[]
  getReviewStatus: (haqId: string) => { sme: ReviewStatus; lead: ReviewStatus; qa: ReviewStatus }
  
  // v113: History
  addHistoryEvent: (haqId: string, event: Omit<HAQHistoryEvent, 'id' | 'timestamp'>) => void
  getHistory: (haqId: string) => HAQHistoryEvent[]
  
  // Computed
  getFilteredHAQs: () => HAQuestion[]
  getSelectedHAQ: () => HAQuestion | undefined
  getHAQsByStatus: (status: HAQStatus) => HAQuestion[]
  getOverdueHAQs: () => HAQuestion[]
}

export const useHAQStore = create<HAQState>()(
  devtools(
    (set, get) => ({
      // Initial state
      haqs: [...haqQuestions], // Clone to allow mutations
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
      
      // HAQ mutations
      updateHAQStatus: (haqId, status) => {
        const state = get()
        const haq = state.haqs.find(h => h.id === haqId)
        const previousStatus = haq?.status
        
        set(
          {
            haqs: state.haqs.map((h) =>
              h.id === haqId
                ? { ...h, status, updatedAt: new Date().toISOString().split('T')[0] }
                : h
            ),
          },
          false,
          'updateHAQStatus'
        )
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: 'status-changed',
          actor: 'current-user',
          actorName: 'Current User',
          details: { newStatus: status },
        })
        
        // Emit cross-module event
        if (haq) {
          useCrossModuleStore.getState().emitEvent({
            eventType: 'entity-status-changed',
            sourceModule: 'haq',
            targetModules: ['regulatory', 'authoring', 'submissions'],
            entityType: 'haq',
            entityId: haqId,
            description: `HAQ ${haq.questionNumber}: ${previousStatus} → ${status}`,
            payload: { 
              questionNumber: haq.questionNumber, 
              previousStatus, 
              newStatus: status,
              product: haq.productName,
            },
          })
        }
      },
        
      updateHAQAssignee: (haqId, assigneeId, assigneeName) =>
        set(
          (state) => ({
            haqs: state.haqs.map((haq) =>
              haq.id === haqId
                ? { 
                    ...haq, 
                    assignedTo: assigneeId, 
                    assignedToName: assigneeName,
                    updatedAt: new Date().toISOString().split('T')[0]
                  }
                : haq
            ),
          }),
          false,
          'updateHAQAssignee'
        ),
      
      // Draft management (autosave - Office 365 style)
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
      
      // v113: Version management (explicit "Save Version" - Office 365 style)
      createVersion: (haqId, content, aiGenerated = false, _versionName) => {
        const state = get()
        const existingVersions = state.versions[haqId] || []
        const haq = state.haqs.find(h => h.id === haqId)
        const newVersion: ResponseDraft = {
          id: `version-${Date.now()}`,
          version: existingVersions.length + 1,
          content,
          author: 'current-user',
          authorName: 'Current User',
          createdAt: new Date().toISOString(),
          aiGenerated,
          comments: [],
        }
        
        set(
          {
            versions: {
              ...state.versions,
              [haqId]: [...existingVersions, newVersion],
            },
          },
          false,
          'createVersion'
        )
        
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: aiGenerated ? 'ai-generated' : 'version-created',
          actor: 'current-user',
          actorName: 'Current User',
          details: { versionId: newVersion.id, version: newVersion.version },
        })
        
        // Emit cross-module event
        if (haq) {
          useCrossModuleStore.getState().emitEvent({
            eventType: 'entity-created',
            sourceModule: 'haq',
            targetModules: ['regulatory', 'authoring'],
            entityType: 'response-draft',
            entityId: newVersion.id,
            description: `HAQ ${haq.questionNumber} response v${newVersion.version} ${aiGenerated ? '(AI-generated)' : 'created'}`,
            payload: { 
              questionNumber: haq.questionNumber, 
              version: newVersion.version,
              aiGenerated,
              wordCount: content.split(/\s+/).length,
            },
          })
        }
        
        return newVersion
      },
      
      getVersions: (haqId) => get().versions[haqId] ?? EMPTY_VERSIONS,
      
      restoreVersion: (haqId, versionId) => {
        const state = get()
        const versions = state.versions[haqId] || []
        const version = versions.find(v => v.id === versionId)
        if (version) {
          // Save as current draft
          get().saveDraft(haqId, version.content)
          
          // Add history event
          get().addHistoryEvent(haqId, {
            haqId,
            type: 'version-created',
            actor: 'current-user',
            actorName: 'Current User',
            details: { restoredFrom: versionId, version: version.version },
          })
        }
      },
      
      // v113: Comment management
      addComment: (haqId, versionId, commentData) => {
        const state = get()
        const versions = state.versions[haqId] || []
        const newComment: DraftComment = {
          id: `comment-${Date.now()}`,
          ...commentData,
          createdAt: new Date().toISOString(),
          resolved: false,
        }
        
        set(
          {
            versions: {
              ...state.versions,
              [haqId]: versions.map(v => 
                v.id === versionId
                  ? { ...v, comments: [...(v.comments || []), newComment] }
                  : v
              ),
            },
          },
          false,
          'addComment'
        )
        
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: 'comment-added',
          actor: commentData.author,
          actorName: commentData.authorName,
          details: { commentId: newComment.id, versionId },
        })
        
        return newComment
      },
      
      resolveComment: (haqId, versionId, commentId) => {
        const state = get()
        const versions = state.versions[haqId] || []
        
        set(
          {
            versions: {
              ...state.versions,
              [haqId]: versions.map(v =>
                v.id === versionId
                  ? {
                      ...v,
                      comments: (v.comments || []).map(c =>
                        c.id === commentId ? { ...c, resolved: true } : c
                      ),
                    }
                  : v
              ),
            },
          },
          false,
          'resolveComment'
        )
        
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: 'comment-resolved',
          actor: 'current-user',
          actorName: 'Current User',
          details: { commentId, versionId },
        })
      },
      
      getComments: (haqId, versionId) => {
        const versions = get().versions[haqId] ?? EMPTY_VERSIONS
        const version = versions.find(v => v.id === versionId)
        return version?.comments ?? EMPTY_COMMENTS
      },
      
      // v113: Review workflow (role-based: SME → Lead → QA)
      assignReviewer: (haqId, reviewerId, reviewerName, role) => {
        const state = get()
        const existingReviews = state.reviews[haqId] || []
        
        // Remove existing assignment for this role
        const filteredReviews = existingReviews.filter(r => r.role !== role)
        
        const newAssignment: ReviewAssignment = {
          id: `review-${Date.now()}`,
          haqId,
          reviewerId,
          reviewerName,
          role,
          status: 'pending',
          assignedAt: new Date().toISOString(),
        }
        
        set(
          {
            reviews: {
              ...state.reviews,
              [haqId]: [...filteredReviews, newAssignment],
            },
          },
          false,
          'assignReviewer'
        )
        
        // Add history event
        get().addHistoryEvent(haqId, {
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
        
        set(
          {
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
          },
          false,
          'completeReview'
        )
        
        // Add history event
        get().addHistoryEvent(haqId, {
          haqId,
          type: 'review-completed',
          actor: reviewerId,
          actorName: reviews.find(r => r.reviewerId === reviewerId)?.reviewerName || 'Reviewer',
          details: { status, feedback },
        })
        
        // Check if all reviews are approved → advance HAQ status
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
      
      // v113: History tracking
      addHistoryEvent: (haqId, eventData) => {
        const state = get()
        const existingHistory = state.history[haqId] || []
        const newEvent: HAQHistoryEvent = {
          id: `event-${Date.now()}`,
          ...eventData,
          timestamp: new Date().toISOString(),
        }
        
        set(
          {
            history: {
              ...state.history,
              [haqId]: [...existingHistory, newEvent],
            },
          },
          false,
          'addHistoryEvent'
        )
      },
      
      getHistory: (haqId) => get().history[haqId] ?? EMPTY_HISTORY,
      
      // Computed
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

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const useSelectedHAQ = () => {
  const haqs = useHAQStore((state) => state.haqs)
  const selectedHAQId = useHAQStore((state) => state.selectedHAQId)
  return useMemo(
    () => haqs.find((h) => h.id === selectedHAQId),
    [haqs, selectedHAQId]
  )
}

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
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
    
    // Apply filters
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
    
    // Apply sort
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

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
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
