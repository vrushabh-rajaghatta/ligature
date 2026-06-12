
// =============================================================================
// COLLABORATIVE EDITOR COMPONENT
// =============================================================================
// Text editor with integrated real-time collaboration features
// Part of v0.18.9 - Collaboration UI Components
// =============================================================================


import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { type CollaborativeSession, type SessionParticipant, type ContentEdit } from '@/services/collaboration/session-manager';
import { type RemoteCursor } from '@/services/collaboration/cursor-sync';
import { RemoteCursors, CursorSummary } from './RemoteCursors';
import { PresenceAvatars } from './PresenceAvatars';
import { SessionIndicator, SessionBadge } from './SessionIndicator';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CollaborativeEditorProps {
  session: CollaborativeSession | null;
  content: string;
  localUserId: string;
  localUserName: string;
  cursors: RemoteCursor[];
  isConnected: boolean;
  isConnecting?: boolean;
  error?: string | null;
  readOnly?: boolean;
  placeholder?: string;
  showToolbar?: boolean;
  showSessionIndicator?: boolean;
  showPresenceAvatars?: boolean;
  showRemoteCursors?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  onChange?: (content: string, edit: ContentEdit) => void;
  onCursorChange?: (position: number, line: number, column: number) => void;
  onSelectionChange?: (anchor: number, head: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onLeaveSession?: () => void;
  className?: string;
}

export interface CollaborativeEditorRef {
  focus: () => void;
  blur: () => void;
  getContent: () => string;
  setContent: (content: string) => void;
  getCursorPosition: () => number;
  setCursorPosition: (position: number) => void;
  getSelection: () => { anchor: number; head: number } | null;
  setSelection: (anchor: number, head: number) => void;
  insertText: (text: string) => void;
  deleteText: (length: number) => void;
}

export interface EditorToolbarProps {
  isConnected: boolean;
  session: CollaborativeSession | null;
  participants: SessionParticipant[];
  localUserId: string;
  onLeaveSession?: () => void;
}

// -----------------------------------------------------------------------------
// Editor Toolbar Component
// -----------------------------------------------------------------------------

export function EditorToolbar({
  isConnected,
  session,
  participants,
  localUserId,
  onLeaveSession,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
      <div className="flex items-center gap-4">
        {/* Session status */}
        <SessionBadge
          isActive={isConnected && session?.status === 'active'}
          participantCount={participants.length}
        />

        {/* Cursor activity */}
        {session && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Editing:</span>
            <CursorSummary
              cursors={participants
                .filter(p => p.cursor)
                .map(p => p.cursor!)
              }
              localUserId={localUserId}
              maxDisplay={3}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Presence avatars */}
        {session && (
          <PresenceAvatars
            participants={participants}
            localUserId={localUserId}
            maxVisible={4}
            size="xs"
            showStatus
            showTooltip
          />
        )}

        {/* Leave button */}
        {session && onLeaveSession && (
          <button
            onClick={onLeaveSession}
            className="px-2 py-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            Leave
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Editor Status Bar Component
// -----------------------------------------------------------------------------

interface EditorStatusBarProps {
  cursorPosition: number;
  line: number;
  column: number;
  contentLength: number;
  isConnected: boolean;
}

function EditorStatusBar({
  cursorPosition,
  line,
  column,
  contentLength,
  isConnected,
}: EditorStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/30 border-t border-slate-700 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span>Ln {line}, Col {column}</span>
        <span>{contentLength} characters</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-slate-500'
          }`}
        />
        <span>{isConnected ? 'Connected' : 'Offline'}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Collaborative Editor Component
// -----------------------------------------------------------------------------

export const CollaborativeEditor = forwardRef<CollaborativeEditorRef, CollaborativeEditorProps>(
  function CollaborativeEditor({
    session,
    content,
    localUserId,
    localUserName,
    cursors,
    isConnected,
    isConnecting,
    error,
    readOnly = false,
    placeholder = 'Start typing...',
    showToolbar = true,
    showSessionIndicator = false,
    showPresenceAvatars = true,
    showRemoteCursors = true,
    toolbarPosition = 'top',
    onChange,
    onCursorChange,
    onSelectionChange,
    onFocus,
    onBlur,
    onLeaveSession,
    className = '',
  }, ref) {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [localContent, setLocalContent] = useState(content);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selection, setSelection] = useState<{ anchor: number; head: number } | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Calculate line and column from cursor position
    const { line, column } = useMemo(() => {
      const lines = localContent.substring(0, cursorPosition).split('\n');
      return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
      };
    }, [localContent, cursorPosition]);

    // Sync content from props
    useEffect(() => {
      setLocalContent(content);
    }, [content]);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
      getContent: () => localContent,
      setContent: (newContent: string) => setLocalContent(newContent),
      getCursorPosition: () => cursorPosition,
      setCursorPosition: (pos: number) => {
        setCursorPosition(pos);
        if (editorRef.current) {
          editorRef.current.selectionStart = pos;
          editorRef.current.selectionEnd = pos;
        }
      },
      getSelection: () => selection,
      setSelection: (anchor: number, head: number) => {
        setSelection({ anchor, head });
        if (editorRef.current) {
          editorRef.current.selectionStart = Math.min(anchor, head);
          editorRef.current.selectionEnd = Math.max(anchor, head);
        }
      },
      insertText: (text: string) => {
        if (editorRef.current) {
          const pos = editorRef.current.selectionStart;
          const newContent = 
            localContent.substring(0, pos) + 
            text + 
            localContent.substring(editorRef.current.selectionEnd);
          setLocalContent(newContent);
          
          const edit: ContentEdit = {
            userId: localUserId,
            sessionId: session?.id || '',
            operation: 'insert',
            position: pos,
            content: text,
          };
          onChange?.(newContent, edit);
        }
      },
      deleteText: (length: number) => {
        if (editorRef.current) {
          const pos = editorRef.current.selectionStart;
          const deleteStart = Math.max(0, pos - length);
          const newContent = 
            localContent.substring(0, deleteStart) + 
            localContent.substring(pos);
          setLocalContent(newContent);
          
          const edit: ContentEdit = {
            userId: localUserId,
            sessionId: session?.id || '',
            operation: 'delete',
            position: deleteStart,
            length,
          };
          onChange?.(newContent, edit);
        }
      },
    }), [localContent, cursorPosition, selection, localUserId, session?.id, onChange]);

    // Handle content changes
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;

      const newContent = e.target.value;
      const oldContent = localContent;
      const newPos = e.target.selectionStart;

      // Determine the edit operation
      let edit: ContentEdit;
      
      if (newContent.length > oldContent.length) {
        // Insert operation
        const insertLength = newContent.length - oldContent.length;
        const insertPos = newPos - insertLength;
        const insertedText = newContent.substring(insertPos, newPos);
        
        edit = {
          userId: localUserId,
          sessionId: session?.id || '',
          operation: 'insert',
          position: insertPos,
          content: insertedText,
        };
      } else if (newContent.length < oldContent.length) {
        // Delete operation
        const deleteLength = oldContent.length - newContent.length;
        
        edit = {
          userId: localUserId,
          sessionId: session?.id || '',
          operation: 'delete',
          position: newPos,
          length: deleteLength,
        };
      } else {
        // Replace operation (same length)
        edit = {
          userId: localUserId,
          sessionId: session?.id || '',
          operation: 'replace',
          position: newPos - 1,
          content: newContent[newPos - 1] || '',
          length: 1,
        };
      }

      setLocalContent(newContent);
      setCursorPosition(newPos);
      onChange?.(newContent, edit);
    }, [localContent, localUserId, session?.id, onChange, readOnly]);

    // Handle cursor movement
    const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      const newPos = target.selectionStart;
      const newEnd = target.selectionEnd;

      setCursorPosition(newPos);

      // Calculate line and column
      const lines = localContent.substring(0, newPos).split('\n');
      const currentLine = lines.length;
      const currentColumn = lines[lines.length - 1].length + 1;
      
      onCursorChange?.(newPos, currentLine, currentColumn);

      // Handle selection
      if (newPos !== newEnd) {
        const newSelection = { anchor: newPos, head: newEnd };
        setSelection(newSelection);
        onSelectionChange?.(newPos, newEnd);
      } else {
        setSelection(null);
      }
    }, [localContent, onCursorChange, onSelectionChange]);

    // Handle focus
    const handleFocus = useCallback(() => {
      setIsFocused(true);
      onFocus?.();
    }, [onFocus]);

    // Handle blur
    const handleBlur = useCallback(() => {
      setIsFocused(false);
      onBlur?.();
    }, [onBlur]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      // Cmd/Ctrl + S - Save (prevent default)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
      }
    }, []);

    // Filter cursors for current document
    const documentCursors = useMemo(() => {
      if (!session) return [];
      return cursors.filter(c => c.position.documentId === session.documentId);
    }, [cursors, session?.documentId]);

    const toolbar = showToolbar && session && (
      <EditorToolbar
        isConnected={isConnected}
        session={session}
        participants={session.participants}
        localUserId={localUserId}
        onLeaveSession={onLeaveSession}
      />
    );

    return (
      <div 
        className={`flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden ${className}`}
      >
        {/* Session indicator (optional) */}
        {showSessionIndicator && (
          <div className="px-3 py-2 border-b border-slate-800">
            <SessionIndicator
              session={session}
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={error}
              variant="default"
              onLeave={onLeaveSession}
            />
          </div>
        )}

        {/* Top toolbar */}
        {toolbarPosition === 'top' && toolbar}

        {/* Editor area */}
        <div ref={containerRef} className="relative flex-1">
          {/* Remote cursors overlay */}
          {showRemoteCursors && documentCursors.length > 0 && (
            <RemoteCursors
              cursors={documentCursors}
              containerRef={containerRef}
              documentId={session?.documentId || ''}
              localUserId={localUserId}
              showLabels
              labelPosition="auto"
              cursorStyle="line"
            />
          )}

          {/* Text editor */}
          <textarea
            ref={editorRef}
            value={localContent}
            onChange={handleChange}
            onSelect={handleSelect}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`
              w-full h-full min-h-[300px] p-4
              bg-transparent text-white text-sm
              font-mono leading-relaxed
              resize-none outline-none
              placeholder:text-slate-500
              ${readOnly ? 'cursor-not-allowed opacity-75' : ''}
            `}
            style={{
              caretColor: session ? 'transparent' : 'white', // Hide caret when showing custom cursors
            }}
            aria-label="Collaborative text editor"
            aria-readonly={readOnly}
          />

          {/* Local cursor (custom rendering when in session) */}
          {session && isFocused && (
            <div
              className="absolute w-0.5 h-5 bg-white animate-pulse pointer-events-none"
              style={{
                left: `calc(${column - 1} * 0.6em + 1rem)`,
                top: `calc(${line - 1} * 1.5em + 1rem)`,
              }}
            />
          )}

          {/* Connection overlay */}
          {!isConnected && session && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
              <div className="text-center">
                {isConnecting ? (
                  <>
                    <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Reconnecting...</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728" 
                      />
                    </svg>
                    <p className="text-sm text-slate-400">Connection lost</p>
                    {error && (
                      <p className="text-xs text-red-400 mt-1">{error}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom toolbar */}
        {toolbarPosition === 'bottom' && toolbar}

        {/* Status bar */}
        <EditorStatusBar
          cursorPosition={cursorPosition}
          line={line}
          column={column}
          contentLength={localContent.length}
          isConnected={isConnected}
        />
      </div>
    );
  }
);

// -----------------------------------------------------------------------------
// Simple Collaborative Text Area
// -----------------------------------------------------------------------------

export interface CollaborativeTextAreaProps {
  value: string;
  cursors: RemoteCursor[];
  localUserId: string;
  documentId: string;
  onChange?: (value: string) => void;
  onCursorChange?: (position: number) => void;
  readOnly?: boolean;
  className?: string;
}

export function CollaborativeTextArea({
  value,
  cursors,
  localUserId,
  documentId,
  onChange,
  onCursorChange,
  readOnly,
  className = '',
}: CollaborativeTextAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  }, [onChange]);

  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      onCursorChange?.(textareaRef.current.selectionStart);
    }
  }, [onCursorChange]);

  const documentCursors = useMemo(() => {
    return cursors.filter(c => c.position.documentId === documentId);
  }, [cursors, documentId]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <RemoteCursors
        cursors={documentCursors}
        containerRef={containerRef}
        documentId={documentId}
        localUserId={localUserId}
        showLabels
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        readOnly={readOnly}
        className="w-full h-full p-3 bg-slate-800 text-white text-sm font-mono rounded-lg resize-none outline-none focus:ring-1 focus:ring-accent-blue"
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default CollaborativeEditor;
