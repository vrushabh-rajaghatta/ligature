

import { useState, useRef } from 'react';
import {
  MessageSquare, Plus, Send, X, Check, ChevronDown, ChevronUp,
  MoreVertical, Edit2, Trash2, Reply, AlertTriangle, HelpCircle,
  Lightbulb, ThumbsUp, Clock, Eye, EyeOff, ExternalLink
} from 'lucide-react';
import { 
  useReviewStore, 
  ReviewComment, 
  CommentType, 
  CommentPriority, 
  CommentStatus,
  FunctionalArea 
} from '@/store/useReviewStore';

interface InContextCommentSystemProps {
  reviewId: string;
  sectionId: string;
  sectionContent: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  currentUserFunctionalArea: FunctionalArea;
  isExternal?: boolean;
  readOnly?: boolean;
}

interface TextSelection {
  text: string;
  start: number;
  end: number;
}

const commentTypeConfig: Record<CommentType, { icon: React.ReactNode; color: string; label: string }> = {
  comment: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-accent-blue', label: 'Comment' },
  suggestion: { icon: <Lightbulb className="w-4 h-4" />, color: 'text-accent-amber', label: 'Suggestion' },
  question: { icon: <HelpCircle className="w-4 h-4" />, color: 'text-accent-purple', label: 'Question' },
  issue: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-accent-red', label: 'Issue' },
  approval: { icon: <ThumbsUp className="w-4 h-4" />, color: 'text-accent-green', label: 'Approval' },
};

const priorityConfig: Record<CommentPriority, { color: string; label: string }> = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  major: { color: 'bg-orange-500', label: 'Major' },
  minor: { color: 'bg-yellow-500', label: 'Minor' },
  editorial: { color: 'bg-blue-500', label: 'Editorial' },
};

const statusConfig: Record<CommentStatus, { color: string; label: string }> = {
  open: { color: 'bg-accent-blue', label: 'Open' },
  'in-progress': { color: 'bg-accent-amber', label: 'In Progress' },
  resolved: { color: 'bg-accent-green', label: 'Resolved' },
  rejected: { color: 'bg-accent-red', label: 'Rejected' },
  deferred: { color: 'bg-text-muted', label: 'Deferred' },
};

export function InContextCommentSystem({
  reviewId, sectionId, sectionContent, currentUserId, currentUserName,
  currentUserRole, currentUserFunctionalArea, isExternal = false, readOnly = false,
}: InContextCommentSystemProps) {
  const getCommentsForSection = useReviewStore(s => s.getCommentsForSection);
  const addComment = useReviewStore(s => s.addComment);
  const updateComment = useReviewStore(s => s.updateComment);
  const resolveComment = useReviewStore(s => s.resolveComment);
  const reopenComment = useReviewStore(s => s.reopenComment);
  const addReply = useReviewStore(s => s.addReply);
  const deleteComment = useReviewStore(s => s.deleteComment);
  const selectedCommentId = useReviewStore(s => s.selectedCommentId);
  const setSelectedComment = useReviewStore(s => s.setSelectedComment);
  const showResolvedComments = useReviewStore(s => s.showResolvedComments);
  const setFilters = useReviewStore(s => s.setFilters);

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [showNewCommentForm, setShowNewCommentForm] = useState(false);
  const [newCommentType, setNewCommentType] = useState<CommentType>('comment');
  const [newCommentPriority, setNewCommentPriority] = useState<CommentPriority>('minor');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newSuggestedText, setNewSuggestedText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [filterByType, setFilterByType] = useState<CommentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  const contentRef = useRef<HTMLDivElement>(null);
  const comments = getCommentsForSection(reviewId, sectionId, currentUserId);

  const filteredComments = comments
    .filter(c => {
      if (!showResolvedComments && c.status === 'resolved') return false;
      if (filterByType !== 'all' && c.type !== filterByType) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority':
          const order = { critical: 0, major: 1, minor: 2, editorial: 3 };
          return order[a.priority] - order[b.priority];
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || readOnly) return;
    const text = sel.toString().trim();
    if (!text) return;
    const range = sel.getRangeAt(0);
    const container = contentRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    setSelection({ text, start, end: start + text.length });
    setShowNewCommentForm(true);
  };

  const handleAddComment = () => {
    if (!newCommentContent.trim()) return;
    addComment(reviewId, {
      reviewId, sectionId, anchorText: selection?.text, anchorStart: selection?.start,
      anchorEnd: selection?.end, type: newCommentType, priority: newCommentPriority,
      content: newCommentContent, suggestedText: newCommentType === 'suggestion' ? newSuggestedText : undefined,
      authorId: currentUserId, authorName: currentUserName, authorRole: currentUserRole as any,
      authorFunctionalArea: currentUserFunctionalArea, isExternal, status: 'open', visibleTo: 'all',
    });
    setNewCommentContent(''); setNewSuggestedText(''); setSelection(null);
    setShowNewCommentForm(false); setNewCommentType('comment'); setNewCommentPriority('minor');
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    const parent = comments.find(c => c.id === parentId);
    if (!parent) return;
    addReply(reviewId, parentId, {
      reviewId, sectionId, type: 'comment', priority: parent.priority, content: replyContent,
      authorId: currentUserId, authorName: currentUserName, authorRole: currentUserRole as any,
      authorFunctionalArea: currentUserFunctionalArea, isExternal, status: 'open', visibleTo: 'all',
    });
    setReplyingTo(null); setReplyContent('');
  };

  const renderContentWithHighlights = () => {
    if (!sectionContent) return null;
    const anchors = comments
      .filter(c => c.anchorStart !== undefined && c.anchorEnd !== undefined)
      .map(c => ({ id: c.id, start: c.anchorStart!, end: c.anchorEnd!, type: c.type, isSelected: c.id === selectedCommentId }))
      .sort((a, b) => a.start - b.start);
    if (anchors.length === 0) return <span>{sectionContent}</span>;
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    anchors.forEach((anchor, index) => {
      if (anchor.start > lastEnd) parts.push(<span key={`text-${index}`}>{sectionContent.slice(lastEnd, anchor.start)}</span>);
      parts.push(
        <mark key={`anchor-${anchor.id}`} className={`cursor-pointer transition-all rounded px-0.5 ${anchor.isSelected ? 'bg-accent-amber/40 ring-2 ring-accent-amber' : 'bg-accent-amber/20 hover:bg-accent-amber/30'}`}
              onClick={() => setSelectedComment(anchor.id)} title="Click to view comment">{sectionContent.slice(anchor.start, anchor.end)}</mark>
      );
      lastEnd = anchor.end;
    });
    if (lastEnd < sectionContent.length) parts.push(<span key="text-end">{sectionContent.slice(lastEnd)}</span>);
    return parts;
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div ref={contentRef} className="prose prose-invert max-w-none text-text-primary leading-relaxed" onMouseUp={handleTextSelection}>
          {renderContentWithHighlights()}
        </div>
        {selection && showNewCommentForm && (
          <div className="fixed z-50 bg-surface-elevated border border-border rounded-xl shadow-2xl p-4 w-96" style={{ top: '200px', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-text-primary">Add Comment</h4>
              <button onClick={() => { setShowNewCommentForm(false); setSelection(null); }} className="p-1 hover:bg-surface-card rounded"><X className="w-4 h-4 text-text-muted" /></button>
            </div>
            <div className="mb-3 p-2 bg-surface-card rounded-lg border border-border">
              <div className="text-xs text-text-muted mb-1">Selected text:</div>
              <div className="text-sm text-text-primary italic truncate">"{selection.text}"</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-2">Type</div>
              <div className="flex gap-1 flex-wrap">
                {(Object.keys(commentTypeConfig) as CommentType[]).map((type) => (
                  <button key={type} onClick={() => setNewCommentType(type)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${newCommentType === type ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}>
                    {commentTypeConfig[type]?.icon}{commentTypeConfig[type]?.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-2">Priority</div>
              <div className="flex gap-1">
                {(Object.keys(priorityConfig) as CommentPriority[]).map((priority) => (
                  <button key={priority} onClick={() => setNewCommentPriority(priority)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${newCommentPriority === priority ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}>
                    <div className={`w-2 h-2 rounded-full ${priorityConfig[priority]?.color}`} />{priorityConfig[priority]?.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={newCommentContent} onChange={(e) => setNewCommentContent(e.target.value)} placeholder="Enter your comment..." rows={3} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary text-sm resize-none focus:outline-none focus:border-accent-blue mb-3" />
            {newCommentType === 'suggestion' && (
              <div className="mb-3">
                <div className="text-xs text-text-muted mb-1">Suggested replacement:</div>
                <textarea value={newSuggestedText} onChange={(e) => setNewSuggestedText(e.target.value)} placeholder="Enter suggested text..." rows={2} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary text-sm resize-none focus:outline-none focus:border-accent-blue" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowNewCommentForm(false); setSelection(null); }} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={handleAddComment} disabled={!newCommentContent.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 disabled:opacity-50"><Send className="w-3 h-3" />Add Comment</button>
            </div>
          </div>
        )}
      </div>
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary flex items-center gap-2"><MessageSquare className="w-4 h-4" />Comments ({filteredComments.length})</h3>
            {!readOnly && <button onClick={() => setShowNewCommentForm(true)} className="p-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 rounded-lg"><Plus className="w-4 h-4 text-accent-blue" /></button>}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <select value={filterByType} onChange={(e) => setFilterByType(e.target.value as CommentType | 'all')} className="flex-1 px-2 py-1 bg-surface-card border border-border rounded text-xs text-text-primary">
              <option value="all">All Types</option>
              {(Object.keys(commentTypeConfig) as CommentType[]).map((type) => <option key={type} value={type}>{commentTypeConfig[type]?.label}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-2 py-1 bg-surface-card border border-border rounded text-xs text-text-primary">
              <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="priority">Priority</option>
            </select>
            <button onClick={() => setFilters({ showResolvedComments: !showResolvedComments })} className={`p-1 rounded ${showResolvedComments ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-muted hover:text-text-primary'}`} title={showResolvedComments ? 'Hide resolved' : 'Show resolved'}>
              {showResolvedComments ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-auto pr-2">
            {filteredComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} isSelected={selectedCommentId === comment.id} onSelect={() => setSelectedComment(comment.id)}
                onReply={() => setReplyingTo(comment.id)} onResolve={(res) => resolveComment(reviewId, comment.id, res, currentUserId, currentUserName)}
                onReopen={() => reopenComment(reviewId, comment.id, currentUserId, currentUserName)} onDelete={() => deleteComment(reviewId, comment.id)}
                isOwner={comment.authorId === currentUserId} readOnly={readOnly} replyingTo={replyingTo === comment.id} replyContent={replyContent}
                onReplyContentChange={setReplyContent} onSubmitReply={() => handleReply(comment.id)} onCancelReply={() => { setReplyingTo(null); setReplyContent(''); }} />
            ))}
            {filteredComments.length === 0 && (
              <div className="text-center py-8"><MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" /><p className="text-sm text-text-muted">No comments yet</p>{!readOnly && <p className="text-xs text-text-muted mt-1">Select text to add a comment</p>}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentCard({ comment, isSelected, onSelect, onReply, onResolve, onReopen, onDelete, isOwner, readOnly, replyingTo, replyContent, onReplyContentChange, onSubmitReply, onCancelReply }: {
  comment: ReviewComment; isSelected: boolean; onSelect: () => void; onReply: () => void; onResolve: (resolution: string) => void; onReopen: () => void; onDelete: () => void;
  isOwner: boolean; readOnly: boolean; replyingTo: boolean; replyContent: string; onReplyContentChange: (v: string) => void; onSubmitReply: () => void; onCancelReply: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [resolveContent, setResolveContent] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const typeConfig = commentTypeConfig[comment.type];
  const priorityConf = priorityConfig[comment.priority];
  const statusConf = statusConfig[comment.status];

  return (
    <div className={`p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'border-accent-blue bg-accent-blue/10' : 'border-border bg-surface-card hover:border-text-muted'}`} onClick={onSelect}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={typeConfig.color}>{typeConfig.icon}</div>
          <div>
            <div className="text-sm font-medium text-text-primary flex items-center gap-1">{comment.authorName}{comment.isExternal && <ExternalLink className="w-3 h-3 text-text-muted" />}</div>
            <div className="text-xs text-text-muted">{new Date(comment.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${priorityConf?.color ?? ''}`} title={priorityConf.label} />
          <span className={`text-xs px-1.5 py-0.5 rounded ${comment.status === 'resolved' ? 'bg-accent-green/20 text-accent-green' : comment.status === 'rejected' ? 'bg-accent-red/20 text-accent-red' : 'bg-surface text-text-muted'}`}>{statusConf.label}</span>
          {!readOnly && (
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 hover:bg-surface rounded"><MoreVertical className="w-3 h-3 text-text-muted" /></button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-6 bg-surface-elevated border border-border rounded-lg shadow-xl z-20 py-1 min-w-[100px]">
                    {comment.status !== 'resolved' && <button onClick={(e) => { e.stopPropagation(); setShowResolveForm(true); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-hover flex items-center gap-2"><Check className="w-3 h-3" />Resolve</button>}
                    {comment.status === 'resolved' && <button onClick={(e) => { e.stopPropagation(); onReopen(); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-hover flex items-center gap-2"><Clock className="w-3 h-3" />Reopen</button>}
                    {isOwner && <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3 h-3" />Delete</button>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {comment.anchorText && <div className="mb-2 p-2 bg-surface rounded border-l-2 border-accent-amber"><div className="text-xs text-text-muted italic">"{comment.anchorText}"</div></div>}
      <p className="text-sm text-text-primary mb-2">{comment.content}</p>
      {comment.suggestedText && <div className="mb-2 p-2 bg-accent-green/10 rounded border border-accent-green/30"><div className="text-xs text-accent-green mb-1">Suggested:</div><div className="text-sm text-text-primary">{comment.suggestedText}</div></div>}
      {comment.status === 'resolved' && comment.resolution && <div className="mb-2 p-2 bg-accent-green/10 rounded"><div className="text-xs text-accent-green mb-1">Resolution:</div><div className="text-xs text-text-primary">{comment.resolution}</div></div>}
      {showResolveForm && (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea value={resolveContent} onChange={(e) => setResolveContent(e.target.value)} placeholder="Resolution notes..." rows={2} className="w-full px-2 py-1 bg-surface border border-border rounded text-sm text-text-primary resize-none" />
          <div className="flex justify-end gap-2"><button onClick={() => setShowResolveForm(false)} className="text-xs text-text-muted">Cancel</button><button onClick={() => { onResolve(resolveContent); setShowResolveForm(false); setResolveContent(''); }} className="text-xs text-accent-green">Resolve</button></div>
        </div>
      )}
      {comment.replies.length > 0 && (
        <div className="mt-2">
          <button onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary">
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && <div className="mt-2 pl-3 border-l border-border space-y-2">{comment.replies.map((reply) => (
            <div key={reply.id} className="p-2 bg-surface rounded"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-text-primary">{reply.authorName}</span><span className="text-xs text-text-muted">{new Date(reply.createdAt).toLocaleDateString()}</span></div><p className="text-xs text-text-primary">{reply.content}</p></div>
          ))}</div>}
        </div>
      )}
      {replyingTo ? (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea value={replyContent} onChange={(e) => onReplyContentChange(e.target.value)} placeholder="Write a reply..." rows={2} className="w-full px-2 py-1 bg-surface border border-border rounded text-sm text-text-primary resize-none" />
          <div className="flex justify-end gap-2"><button onClick={onCancelReply} className="text-xs text-text-muted">Cancel</button><button onClick={onSubmitReply} className="text-xs text-accent-blue">Reply</button></div>
        </div>
      ) : !readOnly && comment.status !== 'resolved' && (
        <button onClick={(e) => { e.stopPropagation(); onReply(); }} className="mt-2 flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue"><Reply className="w-3 h-3" />Reply</button>
      )}
    </div>
  );
}

export default InContextCommentSystem;
