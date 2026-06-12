
// ReviewCommentsThread Component - Phase 2.3e.3
// Displays approval comments with threading, mentions highlighting, and status indicators


import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  MessageSquare, Reply, Check, CheckCheck, AlertCircle,
  Clock, User, AtSign, Paperclip, ChevronDown, ChevronRight,
  Send, X, Filter, Search, MoreHorizontal, Flag, 
  MessageCircle, ArrowRight, CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ApprovalComment } from '@/types/approval';
import {
  mockMentionableUsers,
  searchMentionableUsers,
  formatCommentTime,
  getCommentTypeBadgeColor,
  getStatusBadgeColor,
  parseMentions,
  type MentionableUser,
} from '@/data/mockApprovalComments';

// ============================================================================
// TYPES
// ============================================================================

interface ReviewCommentsThreadProps {
  comments: ApprovalComment[];
  approvalRequestId: string;
  currentUserId?: string;
  onAddComment?: (content: string, parentId?: string, commentType?: ApprovalComment['commentType']) => void;
  onResolveComment?: (commentId: string) => void;
  onAddressComment?: (commentId: string, response: string) => void;
  onCloseComment?: (commentId: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

type FilterOption = 'all' | 'open' | 'addressed' | 'closed' | 'mine' | 'mentions';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface CommentTypeIconProps {
  type: ApprovalComment['commentType'];
  className?: string;
}

function CommentTypeIcon({ type, className = 'w-4 h-4' }: CommentTypeIconProps) {
  switch (type) {
    case 'question':
      return <MessageCircle className={`${className} text-blue-600`} />;
    case 'response':
      return <Reply className={`${className} text-gray-600`} />;
    case 'note':
      return <MessageSquare className={`${className} text-purple-600`} />;
    case 'revision-request':
      return <AlertCircle className={`${className} text-amber-600`} />;
    case 'resolution':
      return <CheckCircle className={`${className} text-green-600`} />;
    default:
      return <MessageSquare className={`${className} text-gray-600`} />;
  }
}

interface StatusIndicatorProps {
  status: ApprovalComment['status'];
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  switch (status) {
    case 'open':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          Open
        </span>
      );
    case 'addressed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
          <Check className="w-3 h-3" />
          Addressed
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <CheckCheck className="w-3 h-3" />
          Closed
        </span>
      );
    default:
      return null;
  }
}

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  // Generate consistent color from name
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return (
    <div 
      className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium shrink-0`}
    >
      {initials}
    </div>
  );
}

// ============================================================================
// MENTION AUTOCOMPLETE
// ============================================================================

interface MentionAutocompleteProps {
  query: string;
  onSelect: (user: MentionableUser) => void;
  position: { top: number; left: number };
}

function MentionAutocomplete({ query, onSelect, position }: MentionAutocompleteProps) {
  const users = useMemo(() => searchMentionableUsers(query), [query]);
  
  if (users.length === 0) return null;
  
  return (
    <div 
      className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-64"
      style={{ top: position.top, left: position.left }}
    >
      {users.slice(0, 5).map(user => (
        <button
          key={user.id}
          type="button"
          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
          onClick={() => onSelect(user)}
        >
          <Avatar name={user.userName} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{user.userName}</div>
            <div className="text-xs text-slate-500 truncate">{user.role}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// COMMENT COMPOSER
// ============================================================================

interface CommentComposerProps {
  onSubmit: (content: string, type: ApprovalComment['commentType']) => void;
  onCancel?: () => void;
  placeholder?: string;
  isReply?: boolean;
  defaultType?: ApprovalComment['commentType'];
}

function CommentComposer({ 
  onSubmit, 
  onCancel, 
  placeholder = 'Add a comment...', 
  isReply = false,
  defaultType = 'note',
}: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [commentType, setCommentType] = useState<ApprovalComment['commentType']>(defaultType);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    
    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show autocomplete if we're actively typing after @
      if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        // Position the autocomplete
        setMentionPosition({ top: 40, left: 0 });
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);
  
  const handleMentionSelect = useCallback((user: MentionableUser) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.substring(cursorPos);
    
    // Build mention text (email prefix format)
    const emailPrefix = user.email.split('@')[0];
    const newContent = content.substring(0, lastAtIndex) + `@${emailPrefix}` + textAfterCursor;
    
    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [content]);
  
  const handleSubmit = useCallback(() => {
    if (!content.trim()) return;
    onSubmit(content.trim(), commentType);
    setContent('');
    setCommentType(defaultType);
  }, [content, commentType, defaultType, onSubmit]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  }, [handleSubmit, onCancel]);
  
  return (
    <div className={`relative ${isReply ? 'ml-10' : ''}`}>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={isReply ? 2 : 3}
          className="w-full px-3 py-2 text-sm resize-none focus:outline-none"
        />
        
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {!isReply && (
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value as ApprovalComment['commentType'])}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
              >
                <option value="note">Note</option>
                <option value="question">Question</option>
                <option value="revision-request">Revision Request</option>
                <option value="resolution">Resolution</option>
              </select>
            )}
            
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Mention someone (@)"
              onClick={() => {
                setContent(prev => prev + '@');
                textareaRef.current?.focus();
              }}
            >
              <AtSign className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim()}
            >
              <Send className="w-3 h-3 mr-1" />
              {isReply ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mention Autocomplete */}
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}
      
      <p className="text-xs text-slate-400 mt-1">
        Press ⌘+Enter to submit • Use @ to mention
      </p>
    </div>
  );
}

// ============================================================================
// SINGLE COMMENT DISPLAY
// ============================================================================

interface CommentItemProps {
  comment: ApprovalComment;
  currentUserId?: string;
  onReply?: () => void;
  onResolve?: () => void;
  onAddress?: () => void;
  onClose?: () => void;
  isNested?: boolean;
  readOnly?: boolean;
}

function CommentItem({ 
  comment, 
  currentUserId, 
  onReply, 
  onResolve, 
  onAddress,
  onClose,
  isNested = false, 
  readOnly = false,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  
  // Parse and highlight mentions in content
  const formattedContent = useMemo(() => {
    return comment.content.replace(
      /@([a-zA-Z]+\.[a-zA-Z]+)/g,
      '<span class="text-blue-600 font-medium cursor-pointer hover:underline">@$1</span>'
    );
  }, [comment.content]);
  
  const isAuthor = comment.authorId === currentUserId;
  const showStatusActions = !readOnly && comment.status !== 'closed' && !isNested;
  
  return (
    <div 
      className={`group ${isNested ? 'ml-10 mt-3' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex gap-3 ${isNested ? '' : 'p-3 rounded-lg hover:bg-slate-50'}`}>
        <Avatar name={comment.authorName} size={isNested ? 'sm' : 'md'} />
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 text-sm">
              {comment.authorName}
            </span>
            <span className="text-xs text-slate-500">{comment.authorRole}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-400">{formatCommentTime(comment.createdAt)}</span>
            
            {/* Type badge */}
            {!isNested && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getCommentTypeBadgeColor(comment.commentType)}`}
              >
                <CommentTypeIcon type={comment.commentType} className="w-3 h-3 mr-1" />
                {comment.commentType.replace('-', ' ')}
              </Badge>
            )}
            
            {/* Status */}
            {!isNested && <StatusIndicator status={comment.status} />}
          </div>
          
          {/* Content */}
          <div 
            className="mt-1 text-sm text-slate-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
          
          {/* Attachments */}
          {comment.attachmentIds && comment.attachmentIds.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {comment.attachmentIds.map(attId => (
                <button
                  key={attId}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                >
                  <Paperclip className="w-3 h-3" />
                  Attachment
                </button>
              ))}
            </div>
          )}
          
          {/* Addressed info */}
          {comment.status === 'addressed' && comment.addressedBy && (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Addressed by {comment.addressedBy} • {formatCommentTime(comment.addressedAt!)}
            </div>
          )}
          
          {/* Actions */}
          {showActions && !readOnly && (
            <div className="mt-2 flex items-center gap-2">
              {onReply && (
                <button
                  onClick={onReply}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}
              
              {showStatusActions && comment.status === 'open' && (
                <button
                  onClick={onAddress}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Mark Addressed
                </button>
              )}
              
              {showStatusActions && comment.status === 'addressed' && (
                <button
                  onClick={onClose}
                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Close
                </button>
              )}
              
              {showStatusActions && comment.status === 'open' && (
                <button
                  onClick={onResolve}
                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Resolve
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMMENT THREAD (with replies)
// ============================================================================

interface CommentThreadProps {
  comment: ApprovalComment;
  currentUserId?: string;
  onAddReply: (content: string, parentId: string) => void;
  onResolve: (commentId: string) => void;
  onAddress: (commentId: string) => void;
  onClose: (commentId: string) => void;
  readOnly?: boolean;
}

function CommentThread({ 
  comment, 
  currentUserId, 
  onAddReply, 
  onResolve, 
  onAddress,
  onClose,
  readOnly = false,
}: CommentThreadProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasReplies = comment.replies && comment.replies.length > 0;
  
  const handleReplySubmit = useCallback((content: string) => {
    onAddReply(content, comment.id);
    setShowReplyComposer(false);
  }, [comment.id, onAddReply]);
  
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      {/* Main Comment */}
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onReply={() => setShowReplyComposer(true)}
        onResolve={() => onResolve(comment.id)}
        onAddress={() => onAddress(comment.id)}
        onClose={() => onClose(comment.id)}
        readOnly={readOnly}
      />
      
      {/* Replies Toggle */}
      {hasReplies && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-11 mb-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
        </button>
      )}
      
      {/* Replies */}
      {hasReplies && isExpanded && (
        <div className="mb-3">
          {comment.replies!.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isNested
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      
      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="ml-11 mb-3">
          <CommentComposer
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyComposer(false)}
            placeholder="Write a reply..."
            isReply
            defaultType="response"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReviewCommentsThread({
  comments,
  approvalRequestId,
  currentUserId,
  onAddComment,
  onResolveComment,
  onAddressComment,
  onCloseComment,
  readOnly = false,
  compact = false,
}: ReviewCommentsThreadProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  
  // Filter comments
  const filteredComments = useMemo(() => {
    let filtered = comments;
    
    // Apply filter
    switch (filter) {
      case 'open':
        filtered = filtered.filter(c => c.status === 'open');
        break;
      case 'addressed':
        filtered = filtered.filter(c => c.status === 'addressed');
        break;
      case 'closed':
        filtered = filtered.filter(c => c.status === 'closed');
        break;
      case 'mine':
        filtered = filtered.filter(c => c.authorId === currentUserId);
        break;
      case 'mentions':
        filtered = filtered.filter(c => {
          const mentions = parseMentions(c.content);
          return mentions.includes(currentUserId || '');
        });
        break;
    }
    
    // Apply search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.content.toLowerCase().includes(lowerQuery) ||
        c.authorName.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [comments, filter, searchQuery, currentUserId]);
  
  // Statistics
  const stats = useMemo(() => {
    return {
      total: comments.length,
      open: comments.filter(c => c.status === 'open').length,
      addressed: comments.filter(c => c.status === 'addressed').length,
      closed: comments.filter(c => c.status === 'closed').length,
    };
  }, [comments]);
  
  const handleAddComment = useCallback((content: string, type: ApprovalComment['commentType']) => {
    onAddComment?.(content, undefined, type);
    setShowComposer(false);
  }, [onAddComment]);
  
  const handleAddReply = useCallback((content: string, parentId: string) => {
    onAddComment?.(content, parentId, 'response');
  }, [onAddComment]);
  
  const handleResolve = useCallback((commentId: string) => {
    onResolveComment?.(commentId);
  }, [onResolveComment]);
  
  const handleAddress = useCallback((commentId: string) => {
    onAddressComment?.(commentId, '');
  }, [onAddressComment]);
  
  const handleClose = useCallback((commentId: string) => {
    onCloseComment?.(commentId);
  }, [onCloseComment]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Review Comments</h3>
            <Badge variant="outline">{stats.total}</Badge>
          </div>
          
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowComposer(true)}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              New Comment
            </Button>
          )}
        </div>
        
        {/* Status summary */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-3 h-3" />
            {stats.open} open
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <Check className="w-3 h-3" />
            {stats.addressed} addressed
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCheck className="w-3 h-3" />
            {stats.closed} closed
          </span>
        </div>
        
        {/* Filters */}
        {!compact && (
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search comments..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="all">All comments</option>
              <option value="open">Open only</option>
              <option value="addressed">Addressed</option>
              <option value="closed">Closed</option>
              <option value="mine">My comments</option>
              <option value="mentions">Mentions me</option>
            </select>
          </div>
        )}
      </div>
      
      {/* New Comment Composer */}
      {showComposer && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <CommentComposer
            onSubmit={handleAddComment}
            onCancel={() => setShowComposer(false)}
            placeholder="Add a comment..."
          />
        </div>
      )}
      
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {searchQuery || filter !== 'all' 
                ? 'No comments match your filters'
                : 'No comments yet'}
            </p>
            {!readOnly && !showComposer && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowComposer(true)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Add the first comment
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredComments.map(comment => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onAddReply={handleAddReply}
                onResolve={handleResolve}
                onAddress={handleAddress}
                onClose={handleClose}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
