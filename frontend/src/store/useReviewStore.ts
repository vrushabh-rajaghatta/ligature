

/**
 * Review Store - PleaseReview-Style Document Review System
 * 
 * Comprehensive review management with:
 * - Zone-based section permissions (view/comment/edit/hidden per reviewer)
 * - Blinded reviews (reviewers can't see each other's comments)
 * - Partial reveal options (see own functional area only)
 * - External reviewer support (email-based or SSO)
 * - In-context commenting with threading
 * - Reconciliation and audit reporting
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ReviewerRole } from '@/types/authoring';
import { useAuthoringStore } from './useAuthoringStore';

// ============================================================================
// TYPES
// ============================================================================

export type ZonePermission = 'hidden' | 'view' | 'comment' | 'edit';

export type ReviewType = 
  | 'standard'           // Everyone sees all comments
  | 'blinded'            // No one sees others' comments until consolidation
  | 'partially-blinded'; // See comments from own functional area only

export type ReviewStatus = 
  | 'draft'
  | 'pending'
  | 'in-progress'
  | 'consolidating'
  | 'completed'
  | 'cancelled';

export type CommentType = 
  | 'comment'
  | 'suggestion'
  | 'question'
  | 'issue'
  | 'approval';

export type CommentPriority = 'critical' | 'major' | 'minor' | 'editorial';

export type CommentStatus = 
  | 'open'
  | 'in-progress'
  | 'resolved'
  | 'rejected'
  | 'deferred';

export type ExternalAuthMethod = 'email' | 'sso';

export type FunctionalArea = 
  | 'medical-writing'
  | 'clinical'
  | 'biostatistics'
  | 'safety'
  | 'regulatory'
  | 'cmc'
  | 'nonclinical'
  | 'quality'
  | 'legal'
  | 'commercial'
  | 'external';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ReviewZone {
  id: string;
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  startOffset?: number;
  endOffset?: number;
  permissions: Record<string, ZonePermission>;
}

export interface ReviewParticipant {
  id: string;
  name: string;
  email: string;
  role: ReviewerRole;
  functionalArea: FunctionalArea;
  isExternal: boolean;
  authMethod?: ExternalAuthMethod;
  accessToken?: string;
  accessExpiry?: string;
  status: 'invited' | 'accepted' | 'declined' | 'completed';
  assignedZones: string[];
  dueDate: string;
  invitedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  lastActiveAt?: string;
  commentsCount: number;
  suggestionsCount: number;
}

export interface CommentHistoryEntry {
  action: 'created' | 'edited' | 'status-changed' | 'replied' | 'resolved' | 'reopened';
  userId: string;
  userName: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  sectionId: string;
  zoneId?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  type: CommentType;
  priority: CommentPriority;
  content: string;
  suggestedText?: string;
  authorId: string;
  authorName: string;
  authorRole: ReviewerRole;
  authorFunctionalArea: FunctionalArea;
  isExternal: boolean;
  status: CommentStatus;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  parentId?: string;
  replies: ReviewComment[];
  visibleTo: 'all' | 'owner' | 'functional-area' | string[];
  createdAt: string;
  updatedAt: string;
  history: CommentHistoryEntry[];
}

export interface Review {
  id: string;
  documentId: string;
  documentTitle: string;
  documentVersion: string;
  name: string;
  description?: string;
  type: ReviewType;
  status: ReviewStatus;
  blindingConfig: {
    allowSameFunctionalArea: boolean;
    allowOwnerOverride: boolean;
    revealOnConsolidation: boolean;
  };
  ownerId: string;
  ownerName: string;
  participants: ReviewParticipant[];
  zones: ReviewZone[];
  createdAt: string;
  startedAt?: string;
  dueDate: string;
  consolidationStartedAt?: string;
  completedAt?: string;
  totalComments: number;
  openComments: number;
  resolvedComments: number;
  allowExternalReviewers: boolean;
  externalAuthMethod: ExternalAuthMethod;
  externalAccessBaseUrl?: string;
}

export interface ExternalReviewerInvite {
  id: string;
  reviewId: string;
  email: string;
  name: string;
  role: ReviewerRole;
  functionalArea: FunctionalArea;
  accessToken: string;
  accessUrl: string;
  expiresAt: string;
  status: 'pending' | 'accessed' | 'expired' | 'revoked';
  assignedZoneIds: string[];
  invitedAt: string;
  firstAccessAt?: string;
  lastAccessAt?: string;
}

export interface ReconciliationReport {
  reviewId: string;
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalComments: number;
    byType: Record<CommentType, number>;
    byPriority: Record<CommentPriority, number>;
    byStatus: Record<CommentStatus, number>;
    byParticipant: { participantId: string; name: string; count: number }[];
    bySection: { sectionId: string; title: string; count: number }[];
  };
  comments: ReviewComment[];
  timeline: { event: string; timestamp: string; userId?: string; userName?: string }[];
}

// ============================================================================
// STORE
// ============================================================================

interface ReviewState {
  reviews: Review[];
  currentReviewId: string | null;
  comments: Record<string, ReviewComment[]>;
  externalInvites: ExternalReviewerInvite[];
  selectedCommentId: string | null;
  showResolvedComments: boolean;
  filterByParticipant: string | null;
  filterBySection: string | null;
  filterByType: CommentType | null;
  filterByPriority: CommentPriority | null;
  
  createReview: (review: Omit<Review, 'id' | 'createdAt' | 'totalComments' | 'openComments' | 'resolvedComments'>) => string;
  updateReview: (reviewId: string, updates: Partial<Review>) => void;
  deleteReview: (reviewId: string) => void;
  startReview: (reviewId: string) => void;
  startConsolidation: (reviewId: string) => void;
  completeReview: (reviewId: string) => void;
  
  addZone: (reviewId: string, zone: Omit<ReviewZone, 'id'>) => string;
  updateZonePermission: (reviewId: string, zoneId: string, userId: string, permission: ZonePermission) => void;
  
  addParticipant: (reviewId: string, participant: Omit<ReviewParticipant, 'id' | 'status' | 'invitedAt' | 'commentsCount' | 'suggestionsCount'>) => string;
  removeParticipant: (reviewId: string, participantId: string) => void;
  updateParticipantStatus: (reviewId: string, participantId: string, status: ReviewParticipant['status']) => void;
  assignZonesToParticipant: (reviewId: string, participantId: string, zoneIds: string[]) => void;
  
  inviteExternalReviewer: (reviewId: string, invite: Omit<ExternalReviewerInvite, 'id' | 'accessToken' | 'accessUrl' | 'invitedAt' | 'status'>) => ExternalReviewerInvite;
  revokeExternalAccess: (inviteId: string) => void;
  validateExternalToken: (token: string) => ExternalReviewerInvite | null;
  
  addComment: (reviewId: string, comment: Omit<ReviewComment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'history'>) => string;
  updateComment: (reviewId: string, commentId: string, updates: Partial<ReviewComment>) => void;
  deleteComment: (reviewId: string, commentId: string) => void;
  resolveComment: (reviewId: string, commentId: string, resolution: string, userId: string, userName: string) => void;
  reopenComment: (reviewId: string, commentId: string, userId: string, userName: string) => void;
  addReply: (reviewId: string, parentCommentId: string, reply: Omit<ReviewComment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'history' | 'parentId'>) => string;
  
  canSeeComment: (review: Review, comment: ReviewComment, viewerId: string) => boolean;
  revealComment: (reviewId: string, commentId: string) => void;
  revealAllComments: (reviewId: string) => void;
  
  generateReconciliationReport: (reviewId: string, userId: string, userName: string) => ReconciliationReport | null;
  
  getReviewById: (reviewId: string) => Review | undefined;
  getCommentsForReview: (reviewId: string, viewerId?: string) => ReviewComment[];
  getCommentsForSection: (reviewId: string, sectionId: string, viewerId?: string) => ReviewComment[];
  getParticipantPermissionForZone: (reviewId: string, zoneId: string, participantId: string) => ZonePermission;
  
  setCurrentReview: (reviewId: string | null) => void;
  setSelectedComment: (commentId: string | null) => void;
  setFilters: (filters: Partial<{ showResolvedComments: boolean; filterByParticipant: string | null; filterBySection: string | null; filterByType: CommentType | null; filterByPriority: CommentPriority | null }>) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateAccessToken = () => `ext-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set, get) => ({
      reviews: [],
      currentReviewId: null,
      comments: {},
      externalInvites: [],
      selectedCommentId: null,
      showResolvedComments: false,
      filterByParticipant: null,
      filterBySection: null,
      filterByType: null,
      filterByPriority: null,
      
      createReview: (reviewData) => {
        const id = generateId('rev');
        const review: Review = { ...reviewData, id, createdAt: new Date().toISOString(), totalComments: 0, openComments: 0, resolvedComments: 0 };
        set((state) => ({ reviews: [...state.reviews, review], comments: { ...state.comments, [id]: [] } }), false, 'createReview');
        
        // v0.21.7: Update document status in authoring store
        const { updateDocument } = useAuthoringStore.getState();
        updateDocument(reviewData.documentId, { 
          status: 'internal-review',
        });
        
        return id;
      },
      
      updateReview: (reviewId, updates) => set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, ...updates } : r) }), false, 'updateReview'),
      
      deleteReview: (reviewId) => set((state) => {
        const { [reviewId]: _, ...rest } = state.comments;
        return { reviews: state.reviews.filter(r => r.id !== reviewId), comments: rest, currentReviewId: state.currentReviewId === reviewId ? null : state.currentReviewId };
      }, false, 'deleteReview'),
      
      startReview: (reviewId) => set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, status: 'in-progress' as ReviewStatus, startedAt: new Date().toISOString() } : r) }), false, 'startReview'),
      
      startConsolidation: (reviewId) => {
        const review = get().reviews.find(r => r.id === reviewId);
        set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, status: 'consolidating' as ReviewStatus, consolidationStartedAt: new Date().toISOString() } : r) }), false, 'startConsolidation');
        if (review?.blindingConfig.revealOnConsolidation) get().revealAllComments(reviewId);
      },
      
      completeReview: (reviewId) => {
        // v0.21.7: Get review to find document ID
        const review = get().reviews.find(r => r.id === reviewId);
        set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, status: 'completed' as ReviewStatus, completedAt: new Date().toISOString() } : r) }), false, 'completeReview');
        
        // v0.21.7: Update document status when review completes
        if (review) {
          const { updateDocument } = useAuthoringStore.getState();
          updateDocument(review.documentId, { status: 'final-review' });
        }
      },
      
      addZone: (reviewId, zoneData) => {
        const id = generateId('zone');
        set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, zones: [...r.zones, { ...zoneData, id }] } : r) }), false, 'addZone');
        return id;
      },
      
      updateZonePermission: (reviewId, zoneId, userId, permission) => set((state) => ({
        reviews: state.reviews.map(r => r.id !== reviewId ? r : { ...r, zones: r.zones.map(z => z.id !== zoneId ? z : { ...z, permissions: { ...z.permissions, [userId]: permission } }) })
      }), false, 'updateZonePermission'),
      
      addParticipant: (reviewId, participantData) => {
        const id = generateId('part');
        const participant: ReviewParticipant = { ...participantData, id, status: 'invited', invitedAt: new Date().toISOString(), commentsCount: 0, suggestionsCount: 0 };
        set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, participants: [...r.participants, participant] } : r) }), false, 'addParticipant');
        return id;
      },
      
      removeParticipant: (reviewId, participantId) => set((state) => ({ reviews: state.reviews.map(r => r.id === reviewId ? { ...r, participants: r.participants.filter(p => p.id !== participantId) } : r) }), false, 'removeParticipant'),
      
      updateParticipantStatus: (reviewId, participantId, status) => {
        const now = new Date().toISOString();
        set((state) => ({ reviews: state.reviews.map(r => r.id !== reviewId ? r : { ...r, participants: r.participants.map(p => p.id !== participantId ? p : { ...p, status, ...(status === 'accepted' ? { acceptedAt: now } : {}), ...(status === 'completed' ? { completedAt: now } : {}) }) }) }), false, 'updateParticipantStatus');
      },
      
      assignZonesToParticipant: (reviewId, participantId, zoneIds) => set((state) => ({ reviews: state.reviews.map(r => r.id !== reviewId ? r : { ...r, participants: r.participants.map(p => p.id === participantId ? { ...p, assignedZones: zoneIds } : p) }) }), false, 'assignZonesToParticipant'),
      
      inviteExternalReviewer: (reviewId, inviteData) => {
        const id = generateId('inv');
        const token = generateAccessToken();
        const invite: ExternalReviewerInvite = { ...inviteData, id, reviewId, accessToken: token, accessUrl: `/review/external/${token}`, invitedAt: new Date().toISOString(), status: 'pending' };
        get().addParticipant(reviewId, { name: inviteData.name, email: inviteData.email, role: inviteData.role, functionalArea: inviteData.functionalArea, isExternal: true, authMethod: 'email', accessToken: token, accessExpiry: inviteData.expiresAt, assignedZones: inviteData.assignedZoneIds, dueDate: inviteData.expiresAt });
        set((state) => ({ externalInvites: [...state.externalInvites, invite] }), false, 'inviteExternalReviewer');
        return invite;
      },
      
      revokeExternalAccess: (inviteId) => set((state) => ({ externalInvites: state.externalInvites.map(i => i.id === inviteId ? { ...i, status: 'revoked' as const } : i) }), false, 'revokeExternalAccess'),
      
      validateExternalToken: (token) => {
        const invite = get().externalInvites.find(i => i.accessToken === token);
        if (!invite || invite.status === 'revoked' || invite.status === 'expired') return null;
        if (new Date(invite.expiresAt) < new Date()) {
          set((state) => ({ externalInvites: state.externalInvites.map(i => i.id === invite.id ? { ...i, status: 'expired' as const } : i) }));
          return null;
        }
        const now = new Date().toISOString();
        set((state) => ({ externalInvites: state.externalInvites.map(i => i.id === invite.id ? { ...i, status: 'accessed' as const, firstAccessAt: i.firstAccessAt || now, lastAccessAt: now } : i) }));
        return invite;
      },
      
      addComment: (reviewId, commentData) => {
        const id = generateId('cmt');
        const now = new Date().toISOString();
        const comment: ReviewComment = { ...commentData, id, reviewId, createdAt: now, updatedAt: now, replies: [], history: [{ action: 'created', userId: commentData.authorId, userName: commentData.authorName, timestamp: now }] };
        set((state) => ({
          comments: { ...state.comments, [reviewId]: [...(state.comments[reviewId] || []), comment] },
          reviews: state.reviews.map(r => r.id === reviewId ? { ...r, totalComments: r.totalComments + 1, openComments: comment.status === 'open' ? r.openComments + 1 : r.openComments } : r)
        }), false, 'addComment');
        return id;
      },
      
      updateComment: (reviewId, commentId, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => c.id === commentId ? { ...c, ...updates, updatedAt: now, history: [...c.history, { action: 'edited' as const, userId: updates.authorId || c.authorId, userName: updates.authorName || c.authorName, timestamp: now, previousValue: c.content, newValue: updates.content }] } : c) }
        }), false, 'updateComment');
      },
      
      deleteComment: (reviewId, commentId) => set((state) => {
        const comment = (state.comments[reviewId] || []).find(c => c.id === commentId);
        return {
          comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).filter(c => c.id !== commentId) },
          reviews: state.reviews.map(r => r.id === reviewId ? { ...r, totalComments: r.totalComments - 1, openComments: comment?.status === 'open' ? r.openComments - 1 : r.openComments, resolvedComments: comment?.status === 'resolved' ? r.resolvedComments - 1 : r.resolvedComments } : r)
        };
      }, false, 'deleteComment'),
      
      resolveComment: (reviewId, commentId, resolution, userId, userName) => {
        const now = new Date().toISOString();
        set((state) => {
          const comment = (state.comments[reviewId] || []).find(c => c.id === commentId);
          const wasOpen = comment?.status === 'open' || comment?.status === 'in-progress';
          return {
            comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => c.id === commentId ? { ...c, status: 'resolved' as CommentStatus, resolution, resolvedBy: userName, resolvedAt: now, updatedAt: now, history: [...c.history, { action: 'resolved' as const, userId, userName, timestamp: now, newValue: resolution }] } : c) },
            reviews: state.reviews.map(r => r.id === reviewId ? { ...r, openComments: wasOpen ? r.openComments - 1 : r.openComments, resolvedComments: r.resolvedComments + 1 } : r)
          };
        }, false, 'resolveComment');
      },
      
      reopenComment: (reviewId, commentId, userId, userName) => {
        const now = new Date().toISOString();
        set((state) => {
          const comment = (state.comments[reviewId] || []).find(c => c.id === commentId);
          return {
            comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => c.id === commentId ? { ...c, status: 'open' as CommentStatus, resolution: undefined, resolvedBy: undefined, resolvedAt: undefined, updatedAt: now, history: [...c.history, { action: 'reopened' as const, userId, userName, timestamp: now }] } : c) },
            reviews: state.reviews.map(r => r.id === reviewId ? { ...r, openComments: r.openComments + 1, resolvedComments: comment?.status === 'resolved' ? r.resolvedComments - 1 : r.resolvedComments } : r)
          };
        }, false, 'reopenComment');
      },
      
      addReply: (reviewId, parentCommentId, replyData) => {
        const id = generateId('rpl');
        const now = new Date().toISOString();
        const reply: ReviewComment = { ...replyData, id, reviewId, parentId: parentCommentId, createdAt: now, updatedAt: now, replies: [], history: [{ action: 'created', userId: replyData.authorId, userName: replyData.authorName, timestamp: now }] };
        set((state) => ({
          comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => c.id === parentCommentId ? { ...c, replies: [...c.replies, reply], history: [...c.history, { action: 'replied' as const, userId: replyData.authorId, userName: replyData.authorName, timestamp: now }] } : c) }
        }), false, 'addReply');
        return id;
      },
      
      canSeeComment: (review, comment, viewerId) => {
        if (review.ownerId === viewerId) return true;
        if (review.type === 'standard') return true;
        if (review.status === 'completed') return true;
        if (review.status === 'consolidating' && review.blindingConfig.revealOnConsolidation) return true;
        if (comment.visibleTo === 'all') return true;
        if (comment.visibleTo === 'owner') return review.ownerId === viewerId;
        if (Array.isArray(comment.visibleTo) && comment.visibleTo.includes(viewerId)) return true;
        if (comment.authorId === viewerId) return true;
        if (review.type === 'blinded') return comment.authorId === viewerId;
        if (review.type === 'partially-blinded') {
          if (!review.blindingConfig.allowSameFunctionalArea) return comment.authorId === viewerId;
          const viewer = review.participants.find(p => p.id === viewerId);
          if (!viewer) return false;
          return comment.authorFunctionalArea === viewer.functionalArea;
        }
        return true;
      },
      
      revealComment: (reviewId, commentId) => set((state) => ({
        comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => c.id === commentId ? { ...c, visibleTo: 'all' } : c) }
      }), false, 'revealComment'),
      
      revealAllComments: (reviewId) => set((state) => ({
        comments: { ...state.comments, [reviewId]: (state.comments[reviewId] || []).map(c => ({ ...c, visibleTo: 'all' })) }
      }), false, 'revealAllComments'),
      
      generateReconciliationReport: (reviewId, userId, userName) => {
        const review = get().reviews.find(r => r.id === reviewId);
        if (!review) return null;
        const allComments = get().comments[reviewId] || [];
        const now = new Date().toISOString();
        
        const byType: Record<CommentType, number> = { comment: 0, suggestion: 0, question: 0, issue: 0, approval: 0 };
        const byPriority: Record<CommentPriority, number> = { critical: 0, major: 0, minor: 0, editorial: 0 };
        const byStatus: Record<CommentStatus, number> = { open: 0, 'in-progress': 0, resolved: 0, rejected: 0, deferred: 0 };
        const participantCounts = new Map<string, { name: string; count: number }>();
        const sectionCounts = new Map<string, { title: string; count: number }>();
        
        allComments.forEach(c => {
          byType[c.type]++;
          byPriority[c.priority]++;
          byStatus[c.status]++;
          const pCount = participantCounts.get(c.authorId) || { name: c.authorName, count: 0 };
          pCount.count++;
          participantCounts.set(c.authorId, pCount);
          const zone = review.zones.find(z => z.sectionId === c.sectionId);
          const sCount = sectionCounts.get(c.sectionId) || { title: zone?.sectionTitle || c.sectionId, count: 0 };
          sCount.count++;
          sectionCounts.set(c.sectionId, sCount);
        });
        
        return {
          reviewId, generatedAt: now, generatedBy: userName,
          summary: {
            totalComments: allComments.length, byType, byPriority, byStatus,
            byParticipant: Array.from(participantCounts.entries()).map(([participantId, data]) => ({ participantId, ...data })),
            bySection: Array.from(sectionCounts.entries()).map(([sectionId, data]) => ({ sectionId, ...data }))
          },
          comments: allComments,
          timeline: [
            { event: 'Review created', timestamp: review.createdAt, userId: review.ownerId, userName: review.ownerName },
            ...(review.startedAt ? [{ event: 'Review started', timestamp: review.startedAt }] : []),
            ...(review.consolidationStartedAt ? [{ event: 'Consolidation started', timestamp: review.consolidationStartedAt }] : []),
            ...(review.completedAt ? [{ event: 'Review completed', timestamp: review.completedAt }] : []),
            { event: 'Report generated', timestamp: now, userId, userName }
          ]
        };
      },
      
      getReviewById: (reviewId) => get().reviews.find(r => r.id === reviewId),
      
      getCommentsForReview: (reviewId, viewerId) => {
        const review = get().reviews.find(r => r.id === reviewId);
        const comments = get().comments[reviewId] || [];
        if (!review || !viewerId) return comments;
        return comments.filter(c => get().canSeeComment(review, c, viewerId));
      },
      
      getCommentsForSection: (reviewId, sectionId, viewerId) => get().getCommentsForReview(reviewId, viewerId).filter(c => c.sectionId === sectionId),
      
      getParticipantPermissionForZone: (reviewId, zoneId, participantId) => {
        const review = get().reviews.find(r => r.id === reviewId);
        if (!review) return 'hidden';
        const zone = review.zones.find(z => z.id === zoneId);
        return zone?.permissions[participantId] || 'view';
      },
      
      setCurrentReview: (reviewId) => set({ currentReviewId: reviewId }, false, 'setCurrentReview'),
      setSelectedComment: (commentId) => set({ selectedCommentId: commentId }, false, 'setSelectedComment'),
      setFilters: (filters) => set((state) => ({ ...state, ...filters }), false, 'setFilters'),
    }),
    { name: 'ReviewStore' }
  )
);

// ============================================================================
// HOOKS - with stable references via useMemo
// ============================================================================

import { useMemo } from 'react';

export const useReviews = () => {
  const reviews = useReviewStore((s) => s.reviews);
  return reviews; // Array reference is stable from store
};

export const useReviewById = (reviewId: string) => {
  const reviews = useReviewStore((s) => s.reviews);
  return useMemo(
    () => reviews.find(r => r.id === reviewId),
    [reviews, reviewId]
  );
};

export const useCommentsForReview = (reviewId: string, viewerId?: string) => {
  const reviews = useReviewStore((s) => s.reviews);
  const comments = useReviewStore((s) => s.comments);
  const canSeeComment = useReviewStore((s) => s.canSeeComment);
  
  return useMemo(() => {
    const review = reviews.find(r => r.id === reviewId);
    const reviewComments = comments[reviewId] || [];
    if (!review || !viewerId) return reviewComments;
    return reviewComments.filter(c => canSeeComment(review, c, viewerId));
  }, [reviews, comments, reviewId, viewerId, canSeeComment]);
};

export const useCommentsForSection = (reviewId: string, sectionId: string, viewerId?: string) => {
  const reviews = useReviewStore((s) => s.reviews);
  const comments = useReviewStore((s) => s.comments);
  const canSeeComment = useReviewStore((s) => s.canSeeComment);
  
  return useMemo(() => {
    const review = reviews.find(r => r.id === reviewId);
    const reviewComments = comments[reviewId] || [];
    const sectionComments = reviewComments.filter(c => c.sectionId === sectionId);
    if (!review || !viewerId) return sectionComments;
    return sectionComments.filter(c => canSeeComment(review, c, viewerId));
  }, [reviews, comments, reviewId, sectionId, viewerId, canSeeComment]);
};

export const useReviewParticipants = (reviewId: string) => {
  const reviews = useReviewStore((s) => s.reviews);
  return useMemo(() => {
    const review = reviews.find(r => r.id === reviewId);
    return review?.participants || [];
  }, [reviews, reviewId]);
};

export const useExternalInvites = (reviewId?: string) => {
  const externalInvites = useReviewStore((s) => s.externalInvites);
  return useMemo(() => {
    if (!reviewId) return externalInvites;
    return externalInvites.filter(i => i.reviewId === reviewId);
  }, [externalInvites, reviewId]);
};

export const useReviewZones = (reviewId: string) => {
  const reviews = useReviewStore((s) => s.reviews);
  return useMemo(() => {
    const review = reviews.find(r => r.id === reviewId);
    return review?.zones || [];
  }, [reviews, reviewId]);
};
