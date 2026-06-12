

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, FileText, MessageSquare, Send, Check, X, Clock, AlertCircle,
  ChevronDown, ChevronRight, Eye, EyeOff, Lock, LogOut, User, Building2,
  Plus, Edit3, CheckCircle, XCircle, Filter, Search, Calendar, Info,
  AlertTriangle, Sparkles, HelpCircle
} from 'lucide-react';
import { 
  useReviewStore, 
  Review, 
  ReviewComment, 
  ReviewZone, 
  ZonePermission,
  CommentType,
  CommentPriority,
  ReviewParticipant,
  ExternalReviewerInvite
} from '@/store/useReviewStore';
// v126: UI components for consistency
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton, ListSkeleton, DetailPanelSkeleton } from '@/components/ui/Skeleton';

interface ExternalReviewPortalProps {
  accessToken?: string;
  onLogout?: () => void;
}

type PortalView = 'document' | 'comments' | 'help';

interface CommentDraft {
  sectionId: string;
  zoneId?: string;
  anchorText?: string;
  type: CommentType;
  priority: CommentPriority;
  content: string;
}

/**
 * External Reviewer Portal
 * 
 * Secure, stripped-down interface for external reviewers:
 * - Token-based authentication
 * - Zone-based permissions (view/comment/edit/hidden)
 * - Blinding enforcement
 * - Simple commenting workflow
 */
export function ExternalReviewPortal({ accessToken, onLogout }: ExternalReviewPortalProps) {
  const validateExternalToken = useReviewStore(s => s.validateExternalToken);
  const getReviewById = useReviewStore(s => s.getReviewById);
  const getCommentsForReview = useReviewStore(s => s.getCommentsForReview);
  const getParticipantPermissionForZone = useReviewStore(s => s.getParticipantPermissionForZone);
  const addComment = useReviewStore(s => s.addComment);
  const canSeeComment = useReviewStore(s => s.canSeeComment);

  const [view, setView] = useState<PortalView>('document');
  const [validatedInvite, setValidatedInvite] = useState<ExternalReviewerInvite | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedZone, setSelectedZone] = useState<ReviewZone | null>(null);
  const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<CommentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!accessToken) {
      setError('No access token provided. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }

    const invite = validateExternalToken(accessToken);
    if (!invite) {
      setError('Invalid or expired access token. Please request a new invitation.');
      setLoading(false);
      return;
    }

    // Check expiration
    if (new Date(invite.expiresAt) < new Date()) {
      setError('Your access has expired. Please request a new invitation from the document owner.');
      setLoading(false);
      return;
    }

    const reviewData = getReviewById(invite.reviewId);
    if (!reviewData) {
      setError('Review not found. It may have been cancelled or deleted.');
      setLoading(false);
      return;
    }

    setValidatedInvite(invite);
    setReview(reviewData);
    setLoading(false);
  }, [accessToken, validateExternalToken, getReviewById]);

  // Get participant info
  const participant = useMemo(() => {
    if (!review || !validatedInvite) return null;
    // Find participant by email since that's the unique identifier for external reviewers
    return review.participants.find(p => p.email === validatedInvite.email);
  }, [review, validatedInvite]);

  // Filter visible zones based on permissions
  const visibleZones = useMemo(() => {
    if (!review || !participant) return [];
    return review.zones.filter(zone => {
      const permission = zone.permissions[participant.id];
      return permission && permission !== 'hidden';
    });
  }, [review, participant]);

  // Get comments visible to this reviewer
  const visibleComments = useMemo(() => {
    if (!review || !participant) return [];
    const allComments = getCommentsForReview(review.id, participant.id);
    
    return allComments.filter(comment => {
      // Filter by comment type
      if (filterType !== 'all' && comment.type !== filterType) return false;
      
      // Filter by search query
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesContent = comment.content.toLowerCase().includes(searchLower);
        const matchesAuthor = comment.authorName.toLowerCase().includes(searchLower);
        if (!matchesContent && !matchesAuthor) return false;
      }
      
      // Check blinding
      return canSeeComment(review, comment, participant.id);
    });
  }, [review, participant, getCommentsForReview, canSeeComment, filterType, searchQuery]);

  // Get zone permission for current participant
  const getZonePermission = (zone: ReviewZone): ZonePermission => {
    if (!participant) return 'hidden';
    return zone.permissions[participant.id] || 'hidden';
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setExpandedSections(next);
  };

  // Start new comment
  const startComment = (zone: ReviewZone) => {
    const permission = getZonePermission(zone);
    if (permission !== 'comment' && permission !== 'edit') return;
    
    setCommentDraft({
      sectionId: zone.sectionId,
      zoneId: zone.id,
      type: 'comment',
      priority: 'minor',
      content: '',
    });
    setSelectedZone(zone);
  };

  // Submit comment
  const submitComment = async () => {
    if (!review || !participant || !commentDraft || !commentDraft.content.trim()) return;
    
    setSubmitting(true);
    try {
      addComment(review.id, {
        reviewId: review.id,
        sectionId: commentDraft.sectionId,
        zoneId: commentDraft.zoneId,
        anchorText: commentDraft.anchorText,
        type: commentDraft.type,
        priority: commentDraft.priority,
        content: commentDraft.content.trim(),
        authorId: participant.id,
        authorName: participant.name,
        authorRole: participant.role,
        authorFunctionalArea: participant.functionalArea,
        isExternal: participant.isExternal,
        status: 'open',
        visibleTo: 'all',
      });
      
      setCommentDraft(null);
      setSelectedZone(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel comment
  const cancelComment = () => {
    setCommentDraft(null);
    setSelectedZone(null);
  };

  // Loading state - v138: Improved loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-52 bg-surface-card rounded animate-pulse" />
            <div className="h-9 w-28 bg-surface-card rounded animate-pulse" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-4 w-20 bg-surface rounded mb-2" />
                <div className="h-8 w-16 bg-surface rounded" />
              </div>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="col-span-1 lg:col-span-7">
              <CardSkeleton showHeader contentLines={8} />
            </div>
            <div className="col-span-1 lg:col-span-5">
              <ListSkeleton items={5} showIcon />
            </div>
          </div>
          <p className="text-text-muted text-center text-sm">Validating access...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-elevated rounded-xl p-8 border border-border text-center">
          <div className="w-16 h-16 bg-accent-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-accent-red" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!review || !participant || !validatedInvite) return null;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-surface-elevated border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">External Review Portal</h1>
              <p className="text-sm text-text-muted">{review.documentTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Reviewer Info */}
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-card rounded-lg">
              <div className="w-8 h-8 bg-accent-purple/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-accent-purple" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-text-primary">{participant.name}</div>
                <div className="text-xs text-text-muted capitalize">{participant.functionalArea.replace('-', ' ')}</div>
              </div>
            </div>

            {/* Review Due Date */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-card rounded-lg">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">
                Due: {new Date(participant.dueDate).toLocaleDateString()}
              </span>
            </div>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Blinding Notice */}
      {review.type !== 'standard' && (
        <div className="bg-accent-amber/10 border-b border-accent-amber/20 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <EyeOff className="w-5 h-5 text-accent-amber" />
            <span className="text-sm text-accent-amber">
              {review.type === 'blinded' 
                ? 'This is a blinded review. You cannot see comments from other reviewers until consolidation.'
                : 'This is a partially-blinded review. You can only see comments from your functional area.'
              }
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-surface-elevated border-b border-border px-6">
        <div className="max-w-6xl mx-auto flex gap-1">
          {[
            { id: 'document', label: 'Document', icon: FileText },
            { id: 'comments', label: 'Comments', icon: MessageSquare, count: visibleComments.length },
            { id: 'help', label: 'Help', icon: HelpCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as PortalView)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-surface-card">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Document View */}
          {view === 'document' && (
            <div className="space-y-4">
              {/* Section Permission Legend */}
              <div className="flex items-center gap-6 p-4 bg-surface-elevated rounded-lg border border-border">
                <span className="text-sm font-medium text-text-primary">Your Permissions:</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-green" />
                    <span className="text-sm text-text-secondary">Can Edit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-blue" />
                    <span className="text-sm text-text-secondary">Can Comment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-sm text-text-secondary">View Only</span>
                  </div>
                </div>
              </div>

              {/* Document Sections */}
              {visibleZones.length === 0 ? (
                <div className="text-center py-12 bg-surface-elevated rounded-lg border border-border">
                  <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No Sections Available</h3>
                  <p className="text-text-secondary">
                    You haven't been assigned any sections to review yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleZones.map(zone => {
                    const permission = getZonePermission(zone);
                    const isExpanded = expandedSections.has(zone.sectionId);
                    const zoneComments = visibleComments.filter(c => c.zoneId === zone.id);
                    
                    return (
                      <div
                        key={zone.id}
                        className={`bg-surface-elevated rounded-lg border transition-colors ${
                          selectedZone?.id === zone.id 
                            ? 'border-accent-blue' 
                            : 'border-border hover:border-border/80'
                        }`}
                      >
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(zone.sectionId)}
                          className="w-full flex items-center gap-3 p-4"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-text-muted" />
                          )}
                          
                          {/* Permission Indicator */}
                          <div className={`w-3 h-3 rounded-full ${
                            permission === 'edit' ? 'bg-accent-green' :
                            permission === 'comment' ? 'bg-accent-blue' :
                            'bg-slate-400'
                          }`} />
                          
                          <div className="flex-1 text-left">
                            <div className="font-medium text-text-primary">
                              {zone.sectionNumber} {zone.sectionTitle}
                            </div>
                          </div>
                          
                          {/* Comment Count */}
                          {zoneComments.length > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-surface-card rounded">
                              <MessageSquare className="w-3 h-3 text-text-muted" />
                              <span className="text-xs text-text-secondary">{zoneComments.length}</span>
                            </div>
                          )}
                          
                          {/* Permission Badge */}
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            permission === 'edit' ? 'bg-accent-green/20 text-accent-green' :
                            permission === 'comment' ? 'bg-accent-blue/20 text-accent-blue' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {permission}
                          </span>
                        </button>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border">
                            {/* Placeholder for document content */}
                            <div className="py-4 text-sm text-text-secondary italic">
                              [Document section content would be rendered here]
                            </div>
                            
                            {/* Section Comments */}
                            {zoneComments.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <h4 className="text-sm font-medium text-text-primary">Comments</h4>
                                {zoneComments.map(comment => (
                                  <div key={comment.id} className="p-3 bg-surface-card rounded-lg">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-text-primary">
                                          {comment.authorName}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                                          comment.type === 'issue' ? 'bg-accent-red/20 text-accent-red' :
                                          comment.type === 'suggestion' ? 'bg-accent-amber/20 text-accent-amber' :
                                          comment.type === 'question' ? 'bg-accent-purple/20 text-accent-purple' :
                                          'bg-surface-elevated text-text-muted'
                                        }`}>
                                          {comment.type}
                                        </span>
                                      </div>
                                      <span className="text-xs text-text-muted">
                                        {new Date(comment.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-text-secondary">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add Comment Button */}
                            {(permission === 'comment' || permission === 'edit') && (
                              <button
                                onClick={() => startComment(zone)}
                                className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                Add Comment
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Comments View */}
          {view === 'comments' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-border">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as CommentType | 'all')}
                  className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                >
                  <option value="all">All Types</option>
                  <option value="comment">Comments</option>
                  <option value="suggestion">Suggestions</option>
                  <option value="question">Questions</option>
                  <option value="issue">Issues</option>
                </select>
              </div>

              {/* Comment List */}
              {visibleComments.length === 0 ? (
                <div className="text-center py-12 bg-surface-elevated rounded-lg border border-border">
                  <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No Comments Yet</h3>
                  <p className="text-text-secondary">
                    {review.type === 'blinded' 
                      ? 'Comments from other reviewers are hidden until consolidation.'
                      : 'Be the first to add a comment!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleComments.map(comment => {
                    const zone = review.zones.find(z => z.id === comment.zoneId);
                    const isOwn = comment.authorId === participant.id;
                    
                    return (
                      <div
                        key={comment.id}
                        className={`p-4 bg-surface-elevated rounded-lg border ${
                          isOwn ? 'border-accent-blue/30' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-text-primary">{comment.authorName}</span>
                              {isOwn && (
                                <span className="text-xs px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue rounded">
                                  You
                                </span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                                comment.type === 'issue' ? 'bg-accent-red/20 text-accent-red' :
                                comment.type === 'suggestion' ? 'bg-accent-amber/20 text-accent-amber' :
                                comment.type === 'question' ? 'bg-accent-purple/20 text-accent-purple' :
                                'bg-surface-card text-text-muted'
                              }`}>
                                {comment.type}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                                comment.priority === 'critical' ? 'bg-accent-red/20 text-accent-red' :
                                comment.priority === 'major' ? 'bg-accent-amber/20 text-accent-amber' :
                                'bg-surface-card text-text-muted'
                              }`}>
                                {comment.priority}
                              </span>
                            </div>
                            {zone && (
                              <div className="text-xs text-text-muted">
                                {zone.sectionNumber} {zone.sectionTitle}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-text-secondary">{comment.content}</p>
                        
                        {/* Comment Status */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            comment.status === 'resolved' ? 'bg-accent-green/20 text-accent-green' :
                            comment.status === 'in-progress' ? 'bg-accent-blue/20 text-accent-blue' :
                            'bg-surface-card text-text-muted'
                          }`}>
                            {comment.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Help View */}
          {view === 'help' && (
            <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
              <div className="bg-surface-elevated rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Review Guidelines</h2>
                <div className="space-y-4 text-sm text-text-secondary">
                  <p>
                    Welcome to the external review portal. You've been invited to review specific sections of this document.
                  </p>
                  
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">Your Permissions</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Edit:</strong> You can modify the document content directly</li>
                      <li><strong>Comment:</strong> You can add comments and suggestions</li>
                      <li><strong>View:</strong> You can read the section but not comment</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">Comment Types</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Comment:</strong> General feedback or observation</li>
                      <li><strong>Suggestion:</strong> Proposed change or improvement</li>
                      <li><strong>Question:</strong> Clarification needed</li>
                      <li><strong>Issue:</strong> Problem that needs to be addressed</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">Priority Levels</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Critical:</strong> Must be resolved before approval</li>
                      <li><strong>Major:</strong> Significant issue requiring attention</li>
                      <li><strong>Minor:</strong> Small issue or nice-to-have</li>
                      <li><strong>Editorial:</strong> Grammar, formatting, style</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-surface-elevated rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Need Help?</h2>
                <p className="text-sm text-text-secondary mb-4">
                  If you're experiencing issues or have questions about the review process, 
                  please contact the document owner.
                </p>
                <div className="p-4 bg-surface-card rounded-lg">
                  <div className="text-sm text-text-muted mb-1">Document Owner</div>
                  <div className="text-text-primary font-medium">{review.ownerId}</div>
                </div>
              </div>
            </div>
          )}

          {/* Complete Review Section */}
          {participant.status !== 'completed' && (
            <div className="mt-8 p-6 bg-surface-elevated rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Ready to Submit?</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    You've added {visibleComments.filter(c => c.authorId === participant.id).length} comment(s). 
                    When you're finished reviewing, mark your review as complete.
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Update participant status
                    const { updateParticipantStatus } = useReviewStore.getState();
                    updateParticipantStatus(review.id, participant.id, 'completed');
                    
                    // Trigger notification for the review owner
                    import('@/services/notification-integration').then(({ notifyReviewCompleted }) => {
                      notifyReviewCompleted(
                        review.id,
                        review.name,
                        participant.name,
                        visibleComments.filter(c => c.authorId === participant.id).length
                      );
                    });
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-green text-white rounded-lg font-medium hover:bg-accent-green/90 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete My Review
                </button>
              </div>
            </div>
          )}

          {/* Review Already Completed */}
          {participant.status === 'completed' && (
            <div className="mt-8 p-6 bg-accent-green/10 rounded-xl border border-accent-green/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-accent-green" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Review Completed</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Thank you for completing your review! The document owner has been notified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Comment Draft Modal */}
      {commentDraft && selectedZone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-xl border border-border w-full max-w-lg">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Add Comment</h3>
              <p className="text-sm text-text-muted">
                {selectedZone.sectionNumber} {selectedZone.sectionTitle}
              </p>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              {/* Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
                  <select
                    value={commentDraft.type}
                    onChange={(e) => setCommentDraft({ ...commentDraft, type: e.target.value as CommentType })}
                    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option value="comment">Comment</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="question">Question</option>
                    <option value="issue">Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Priority</label>
                  <select
                    value={commentDraft.priority}
                    onChange={(e) => setCommentDraft({ ...commentDraft, priority: e.target.value as CommentPriority })}
                    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option value="editorial">Editorial</option>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Comment</label>
                <textarea
                  value={commentDraft.content}
                  onChange={(e) => setCommentDraft({ ...commentDraft, content: e.target.value })}
                  placeholder="Enter your comment..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={cancelComment}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={!commentDraft.content.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Comment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Token Entry Screen
 * Shown when no token is provided - allows manual entry
 */
export function ExternalReviewLogin({ onTokenSubmit }: { onTokenSubmit: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter your access token');
      return;
    }
    onTokenSubmit(token.trim());
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-elevated rounded-xl border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent-blue/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-accent-blue" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">External Review Portal</h1>
            <p className="text-text-secondary">
              Enter the access token from your invitation email to access the review.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Access Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(''); }}
                placeholder="ext-xxxx-xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
              {error && (
                <p className="mt-2 text-sm text-accent-red">{error}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 transition-colors"
            >
              Access Review
            </button>
          </form>
          
          <div className="mt-6 p-4 bg-surface-card rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-text-muted mt-0.5" />
              <div className="text-sm text-text-secondary">
                <p>Your access token was sent to your email when you were invited to this review.</p>
                <p className="mt-2">If you can't find your token, please contact the document owner to request a new invitation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
